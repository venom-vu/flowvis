import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileTemplate, parse } from '@vue/compiler-sfc';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { MOCK_PRICING_CONFIG_RESPONSE } from '@flowvis/contracts';
import { resolveZaloJoinUrl } from '../utils/system-status.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const workerEntry = path.join(webRoot, '.output/public/_worker.js/index.js');

describe('Nút nổi tham gia Zalo ở trang người dùng', () => {
  it('resolveZaloJoinUrl chỉ chấp nhận http(s) hợp lệ và cắt khoảng trắng', () => {
    assert.equal(
      resolveZaloJoinUrl('  https://zalo.me/g/flowvis123  '),
      'https://zalo.me/g/flowvis123',
    );
    assert.equal(resolveZaloJoinUrl('http://zalo.me/flowvis'), 'http://zalo.me/flowvis');

    for (const invalid of [
      undefined,
      null,
      123,
      '',
      '   ',
      'zalo.me/g/flowvis',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
    ]) {
      assert.equal(resolveZaloJoinUrl(invalid), null);
    }
  });

  it('ZaloFloatingButton.vue là pill gọn có chữ, nằm dưới mọi dialog và chỉ gắn ở layout user', () => {
    const buttonRaw = fs.readFileSync(
      path.join(webRoot, 'components/ZaloFloatingButton.vue'),
      'utf8',
    );
    const defaultLayoutRaw = fs.readFileSync(
      path.join(webRoot, 'layouts/default.vue'),
      'utf8',
    );
    const adminLayoutRaw = fs.readFileSync(
      path.join(webRoot, 'layouts/admin.vue'),
      'utf8',
    );

    assert.match(defaultLayoutRaw, /<ZaloFloatingButton\s*\/>/);
    assert.doesNotMatch(adminLayoutRaw, /ZaloFloatingButton/);

    assert.equal(
      fs.existsSync(path.join(webRoot, 'public/zalo-icon.png')),
      true,
      'Thiếu file ảnh icon Zalo tại apps/web/public/zalo-icon.png',
    );
    assert.match(buttonRaw, /data-testid="zalo-join-button"/);
    assert.match(buttonRaw, /src="\/zalo-icon\.png"/);
    assert.match(buttonRaw, /Nhóm hỗ trợ/);
    assert.match(buttonRaw, /#0068FF/);
    assert.match(buttonRaw, /zalo-ping-ring/);
    assert.match(buttonRaw, /zalo-shimmer-beam/);
    assert.match(buttonRaw, /rounded-full/);
    assert.match(buttonRaw, /min-h-\[48px\]/);
    assert.match(buttonRaw, /target="_blank"/);
    assert.match(buttonRaw, /rel="noopener noreferrer"/);
    assert.match(buttonRaw, /\bz-30\b/);

    for (const [dialogRel, zRegex] of [
      ['components/FeatureWorkspaceDialog.vue', /\bz-50\b/],
      ['components/AuthDialog.vue', /\bz-50\b/],
      ['components/VietQRModal.vue', /\bz-50\b/],
      ['components/ImageUploader.vue', /\bz-\[60\]/],
    ]) {
      const dialogRaw = fs.readFileSync(path.join(webRoot, dialogRel), 'utf8');
      assert.match(dialogRaw, zRegex, `${dialogRel} phải giữ tầng hiển thị cao hơn z-30`);
    }
  });

  it('biên dịch và render SSR ZaloFloatingButton khi có và khi thiếu URL', async () => {
    const source = fs.readFileSync(
      path.join(webRoot, 'components/ZaloFloatingButton.vue'),
      'utf8',
    );
    const { descriptor } = parse(source);
    const compiled = compileTemplate({
      id: 'test-zalo-floating-button',
      filename: 'ZaloFloatingButton.vue',
      source: descriptor.template.content,
      ssr: true,
      ssrCssVars: [],
    });
    assert.equal(compiled.errors.length, 0);

    const tmpFile = path.join(webRoot, 'test', `.tmp-zalo-${process.pid}.mjs`);
    fs.writeFileSync(tmpFile, compiled.code, 'utf8');
    try {
      const { ssrRender } = await import(pathToFileURL(tmpFile).href);
      const renderWithHref = async (zaloHref) => {
        const app = createSSRApp({
          ssrRender,
          setup() {
            return { zaloHref };
          },
        });
        app.component('Icon', {
          props: ['name'],
          ssrRender(_ctx, _push) {
            _push('<span class="icon-mock"></span>');
          },
        });
        return renderToString(app);
      };

      const activeHtml = await renderWithHref('https://zalo.me/g/demo123');
      assert.match(activeHtml, /data-testid="zalo-join-button"/);
      assert.match(activeHtml, /href="https:\/\/zalo\.me\/g\/demo123"/);
      assert.match(activeHtml, /src="\/zalo-icon\.png"/);
      assert.match(activeHtml, /Nhóm hỗ trợ/);
      assert.match(activeHtml, /\bz-30\b/);

      const emptyHtml = await renderWithHref(null);
      assert.doesNotMatch(emptyHtml, /zalo-join-button/);
    } finally {
      fs.rmSync(tmpFile, { force: true });
    }
  });
});

describe('SSR worker bundle - nút Zalo theo NUXT_PUBLIC_ZALO_URL và phạm vi layout', {
  skip: fs.existsSync(workerEntry) ? false : 'Chưa có .output (chạy pnpm --filter @flowvis/web run build)',
}, () => {
  const makeEnv = (zaloUrl) => ({
    NUXT_PUBLIC_ZALO_URL: zaloUrl,
    ASSETS: {
      fetch: async () => new Response('Not found', { status: 404 }),
    },
  });
  const ctx = { waitUntil() {}, passThroughOnException() {} };

  async function renderRoute(routePath, zaloUrl) {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const { pathname } = new URL(String(input));
      if (pathname === '/config/pricing') {
        return new Response(JSON.stringify(MOCK_PRICING_CONFIG_RESPONSE), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    try {
      const { default: worker } = await import(pathToFileURL(workerEntry).href);
      const res = await worker.fetch(
        new Request(`https://flowvis.test${routePath}`),
        makeEnv(zaloUrl),
        ctx,
      );
      assert.equal(res.status, 200);
      return await res.text();
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  it('hiển thị nút Zalo ở trang người dùng khi có NUXT_PUBLIC_ZALO_URL hợp lệ', async () => {
    for (const page of ['/', '/pricing', '/history']) {
      const html = await renderRoute(page, 'https://zalo.me/g/flowvis-community');
      assert.match(html, /data-testid="zalo-join-button"/, `${page} thiếu nút Zalo`);
      assert.match(
        html,
        /href="https:\/\/zalo\.me\/g\/flowvis-community"/,
        `${page} sai href Zalo`,
      );
      assert.match(html, /Nhóm hỗ trợ/, `${page} thiếu nhãn Nhóm hỗ trợ`);
    }
  });

  it('ẩn nút Zalo khi NUXT_PUBLIC_ZALO_URL rỗng hoặc không hợp lệ', async () => {
    for (const invalid of ['', 'javascript:alert(1)']) {
      const html = await renderRoute('/', invalid);
      assert.doesNotMatch(html, /data-testid="zalo-join-button"/);
    }
  });

  it('không hiển thị nút Zalo ở trang quản trị /admin/topups', async () => {
    const html = await renderRoute('/admin/topups', 'https://zalo.me/g/flowvis-community');
    assert.doesNotMatch(html, /data-testid="zalo-join-button"/);
  });
});

