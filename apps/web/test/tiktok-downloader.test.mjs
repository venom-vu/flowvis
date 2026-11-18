import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileTemplate, parse } from '@vue/compiler-sfc';
import { createSSRApp } from 'vue';
import { renderToString, ssrRenderSlot } from '@vue/server-renderer';
import {
  TIKTOK_MAX_DOWNLOAD_BYTES,
  TikTokDownloadError,
  buildTikTokFileName,
  downloadTikTokBlob,
  extractTikTokUrl,
  formatBytesVi,
  isTikTokUrl,
  parseTikwmResponse,
  resolveTikTokVideo,
} from '../utils/tiktok-downloader.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');

const OK_PAYLOAD = {
  code: 0,
  msg: 'success',
  data: {
    id: '123',
    title: 'caption',
    duration: 28,
    cover: 'https://cdn/c.jpg',
    play: 'https://cdn/play.mp4',
    hdplay: 'https://cdn/hd.mp4',
    size: 100,
    hd_size: 200,
    author: { unique_id: 'user.a' },
  },
};

describe('tiktok downloader', () => {
  it('chỉ nhận domain TikTok', () => {
    assert.equal(isTikTokUrl('https://vt.tiktok.com/ZSptxGjGK/'), true);
    assert.equal(isTikTokUrl('https://www.tiktok.com/@a/video/1'), true);
    assert.equal(isTikTokUrl('https://tiktok.com.evil.com/x'), false);
    assert.equal(isTikTokUrl('https://evil.com/?u=tiktok.com'), false);
    assert.equal(isTikTokUrl('javascript:alert(1)'), false);
  });

  it('tách link từ đoạn chia sẻ', () => {
    assert.equal(
      extractTikTokUrl('Xem video này nè https://vt.tiktok.com/ZSptxGjGK/ hay lắm'),
      'https://vt.tiktok.com/ZSptxGjGK/',
    );
    assert.equal(extractTikTokUrl('https://example.com/x'), null);
    assert.equal(extractTikTokUrl('không có link'), null);
  });

  it('parse phản hồi thành công, ưu tiên HD', () => {
    const info = parseTikwmResponse(OK_PAYLOAD);
    assert.equal(info.videoUrl, 'https://cdn/hd.mp4');
    assert.equal(info.isHd, true);
    assert.equal(info.sizeBytes, 200);
    assert.equal(info.author, 'user.a');
  });

  it('rơi về bản thường khi không có HD', () => {
    const info = parseTikwmResponse({ code: 0, data: { ...OK_PAYLOAD.data, hdplay: '' } });
    assert.equal(info.videoUrl, 'https://cdn/play.mp4');
    assert.equal(info.isHd, false);
    assert.equal(info.sizeBytes, 100);
  });

  it('báo lỗi tiếng Việt khi API thất bại hoặc bị giới hạn', () => {
    assert.throws(() => parseTikwmResponse({ code: -1, msg: 'Free Api Limit: 1 request/second.' }), (e) => e.code === 'RATE_LIMITED');
    assert.throws(() => parseTikwmResponse({ code: -1, msg: 'Url parsing is failed' }), (e) => e.code === 'RESOLVE_FAILED');
    assert.throws(() => parseTikwmResponse({ code: 0, data: { id: '1' } }), (e) => e.code === 'RESOLVE_FAILED');
  });

  it('resolve từ chối link không phải TikTok mà không gọi mạng', async () => {
    let called = false;
    await assert.rejects(
      resolveTikTokVideo('https://evil.com/a', async () => {
        called = true;
        return new Response('{}');
      }),
      (e) => e instanceof TikTokDownloadError && e.code === 'INVALID_LINK',
    );
    assert.equal(called, false);
  });

  it('resolve gọi tikwm với link đã mã hóa và hd=1', async () => {
    let requested = '';
    const info = await resolveTikTokVideo('https://vt.tiktok.com/ZSptxGjGK/', async (url) => {
      requested = String(url);
      return new Response(JSON.stringify(OK_PAYLOAD));
    });
    assert.equal(requested, 'https://www.tikwm.com/api/?url=https%3A%2F%2Fvt.tiktok.com%2FZSptxGjGK%2F&hd=1');
    assert.equal(info.id, '123');
  });

  it('tải blob và báo tiến trình', async () => {
    const info = parseTikwmResponse(OK_PAYLOAD);
    const body = new Uint8Array(200);
    const ratios = [];
    const blob = await downloadTikTokBlob(
      info,
      (r) => ratios.push(r),
      undefined,
      async () => new Response(body, { headers: { 'content-length': '200' } }),
    );
    assert.equal(blob.size, 200);
    assert.equal(blob.type, 'video/mp4');
    assert.equal(ratios.at(-1), 1);
  });

  it('chặn video quá lớn và lỗi HTTP', async () => {
    const big = { ...parseTikwmResponse(OK_PAYLOAD), sizeBytes: TIKTOK_MAX_DOWNLOAD_BYTES + 1 };
    await assert.rejects(downloadTikTokBlob(big), (e) => e.code === 'TOO_LARGE');
    const info = parseTikwmResponse(OK_PAYLOAD);
    await assert.rejects(
      downloadTikTokBlob(info, undefined, undefined, async () => new Response('', { status: 403 })),
      (e) => e.code === 'DOWNLOAD_FAILED',
    );
  });

  it('đặt tên file an toàn', () => {
    assert.equal(buildTikTokFileName({ id: '1', author: 'a/b c' }), 'tiktok-abc-1.mp4');
    assert.equal(buildTikTokFileName({ id: '1', author: '' }), 'tiktok-1.mp4');
  });

  it('pages/tiktok-downloader.vue: bỏ Lưu ý khi sử dụng, đồng bộ Slate Cyber và render SSR các trạng thái', async () => {
    const raw = fs.readFileSync(path.join(webRoot, 'pages/tiktok-downloader.vue'), 'utf8');
    assert.equal(raw.includes('Lưu ý khi sử dụng'), false);
    assert.equal(/\p{Extended_Pictographic}/u.test(raw), false);
    assert.match(raw, /max-w-4xl/);
    assert.match(raw, /Tải Video TikTok Không Logo/);
    assert.match(raw, /min-h-\[48px\]/);

    const { descriptor } = parse(raw, { filename: 'pages/tiktok-downloader.vue' });
    const compiled = compileTemplate({
      id: 'test-tiktok-downloader-page',
      filename: 'pages/tiktok-downloader.vue',
      source: descriptor.template.content,
      ssr: true,
      ssrCssVars: [],
    });
    assert.equal(compiled.errors.length, 0, compiled.errors.join('; '));

    const tmpFile = path.join(webRoot, 'test', `.tmp-tiktok-page-${process.pid}.mjs`);
    fs.writeFileSync(tmpFile, compiled.code, 'utf8');
    try {
      const { ssrRender } = await import(pathToFileURL(tmpFile).href);
      async function render(state) {
        const app = createSSRApp({
          ssrRender,
          setup() {
            return {
              link: '',
              info: null,
              errorVi: null,
              pasteNoticeVi: null,
              isResolving: false,
              isDownloading: false,
              progress: null,
              doneVi: null,
              coverFailed: false,
              canPasteClipboard: false,
              linkInputRef: null,
              hasValidLink: false,
              progressPercent: null,
              formatBytesVi,
              handlePaste: () => {},
              handleClearLink: () => {},
              handleResolve: () => {},
              handleDownload: () => {},
              handleCancel: () => {},
              handleReset: () => {},
              ...state,
            };
          },
        });
        app.component('Icon', {
          props: ['name'],
          ssrRender(ctx, push) {
            push(`<span data-icon="${ctx.name}"></span>`);
          },
        });
        app.component('NuxtLink', {
          props: ['to'],
          ssrRender(ctx, push, parent, _a, _s, slots) {
            push(`<a href="${ctx.to}">`);
            ssrRenderSlot(slots, 'default', {}, null, push, parent);
            push('</a>');
          },
        });
        app.component('BaseInput', {
          props: ['id', 'modelValue', 'placeholder'],
          ssrRender(ctx, push) {
            push(`<input id="${ctx.id ?? ''}" value="${ctx.modelValue ?? ''}" placeholder="${ctx.placeholder ?? ''}" />`);
          },
        });
        return renderToString(app);
      }

      const idleHtml = await render({});
      assert.match(idleHtml, /data-testid="page-tiktok-downloader"/);
      assert.match(idleHtml, /Dán liên kết video TikTok/);
      assert.match(idleHtml, /Tải Video TikTok Không Logo/);
      assert.equal(idleHtml.includes('Lưu ý khi sử dụng'), false);

      const resolvingHtml = await render({ isResolving: true });
      assert.match(resolvingHtml, /data-testid="tiktok-resolving"/);
      assert.match(resolvingHtml, /Đang lấy thông tin video/);

      const resultHtml = await render({
        info: parseTikwmResponse(OK_PAYLOAD),
        doneVi: 'Đã tải xong.',
      });
      assert.match(resultHtml, /data-testid="tiktok-result"/);
      assert.match(resultHtml, /@?user\.a/);
      assert.match(resultHtml, /data-testid="tiktok-done"/);
      assert.match(resultHtml, /<a href="\/motion-control">/);
    } finally {
      fs.rmSync(tmpFile, { force: true });
    }
  });
});
