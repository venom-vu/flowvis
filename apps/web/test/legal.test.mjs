import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileTemplate, parse } from '@vue/compiler-sfc';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { TOS_VERSION } from '@flowvis/contracts';
import { terms } from '../content/legal/terms.ts';
import { privacy } from '../content/legal/privacy.ts';
import {
  REPORT_MAILTO_BODY,
  REPORT_MAILTO_SUBJECT,
  buildReportMailto,
} from '../utils/system-status.ts';
import { assertReportEmail } from '../scripts/assert-report-email.mjs';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('Story 6.9 - văn bản pháp lý', () => {
  it('TOS_VERSION trùng terms.version và privacy.version', () => {
    assert.equal(terms.version, TOS_VERSION);
    assert.equal(privacy.version, TOS_VERSION);
  });

  it('terms và privacy đều ở trạng thái final và có nội dung bắt buộc', () => {
    assert.equal(terms.status, 'final');
    assert.equal(privacy.status, 'final');

    const t = JSON.stringify(terms);
    for (const k of [
      '18 tuổi',
      'đồng ý',
      'khiêu dâm',
      'bôi nhọ',
      'Miễn trừ',
      'VietQR',
      'thương mại',
      'không được hoàn lại',
      'không có thời hạn sử dụng',
    ]) {
      assert.ok(t.includes(k), k);
    }

    const p = JSON.stringify(privacy);
    for (const k of ['RunningHub', 'Cloudflare', 'R2', 'HMAC', 'tikwm', 'Redis', 'PostgreSQL']) {
      assert.ok(!p.includes(k) && !t.includes(k), `không lộ hạ tầng: ${k}`);
    }
    for (const k of [
      'mã hóa một chiều',
      '1 ngày',
      '7 ngày',
      '30 ngày',
      '7 ngày làm việc',
      'email',
    ]) {
      assert.ok(p.includes(k), k);
    }
  });

  it('script kiểm phát hành thoát 0 khi văn bản đã final', () => {
    const r = spawnSync(
      process.execPath,
      [path.join(webRoot, 'scripts/check-legal-release.mjs')],
      { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /final/);
  });

  it('SSR LegalDocumentView hiển thị văn bản chính thức và ẩn biểu ngữ draft', async () => {
    const raw = fs.readFileSync(
      path.join(webRoot, 'components/LegalDocumentView.vue'),
      'utf8',
    );
    const { descriptor } = parse(raw);
    const compiled = compileTemplate({
      id: 'test-legal-doc-view',
      filename: 'LegalDocumentView.vue',
      source: descriptor.template.content,
      ssr: true,
      ssrCssVars: [],
    });
    assert.equal(compiled.errors.length, 0);

    const tmpFile = path.join(webRoot, 'test', `.tmp-legal-${Date.now()}.mjs`);
    fs.writeFileSync(tmpFile, compiled.code, 'utf8');

    try {
      const { ssrRender } = await import(pathToFileURL(tmpFile).href);
      for (const [doc, testid, contactTestid] of [
        [terms, 'page-terms', 'terms-contact-email'],
        [privacy, 'page-privacy', 'privacy-contact-email'],
      ]) {
        const app = createSSRApp({
          ssrRender,
          setup() {
            return {
              doc,
              testid,
              contactEmail: 'legal@example.test',
              zaloUrl: 'https://zalo.me/g/test',
              companionTo: testid === 'page-terms' ? '/privacy' : '/terms',
              companionLabel: 'Liên kết đối chiếu',
              contactTestid,
            };
          },
        });
        app.component('Icon', {
          props: ['name'],
          ssrRender(_ctx, push) {
            push('<span class="icon-mock"></span>');
          },
        });
        app.component('NuxtLink', {
          props: ['to'],
          ssrRender(ctx, push, parent, attrs) {
            push(`<a href="${ctx.to}"${attrs?.class ? ` class="${attrs.class}"` : ''}>`);
            if (ctx.$slots.default) {
              for (const v of ctx.$slots.default()) {
                if (typeof v.children === 'string') push(v.children);
              }
            }
            push('</a>');
          },
        });
        app.component('LegalDraftBanner', {
          ssrRender(_ctx, push) {
            push('<div data-testid="legal-draft-banner">Văn bản tạm, chưa có hiệu lực pháp lý</div>');
          },
        });

        const html = await renderToString(app);
        assert.match(html, new RegExp(`data-testid="${testid}"`));
        assert.match(html, /data-testid="legal-final-badge"/);
        assert.doesNotMatch(html, /data-testid="legal-draft-banner"/);
        assert.doesNotMatch(html, /Văn bản tạm, chưa có hiệu lực pháp lý/);
        assert.match(html, new RegExp(`data-testid="${contactTestid}"`));
        assert.match(html, /mailto:legal@example\.test/);
      }
    } finally {
      fs.rmSync(tmpFile, { force: true });
    }
  });

  it('mailto cố định: đúng tiêu đề và hướng dẫn, không chứa dữ liệu người dùng', () => {
    assert.equal(REPORT_MAILTO_SUBJECT, 'Báo cáo vi phạm flowvis');
    assert.equal(
      REPORT_MAILTO_BODY,
      'Vui lòng nêu mã tác vụ hoặc liên kết chia sẻ và mô tả vi phạm.',
    );
    assert.equal(
      buildReportMailto('abuse@example.com'),
      'mailto:abuse@example.com?subject=' +
        encodeURIComponent('Báo cáo vi phạm flowvis') +
        '&body=' +
        encodeURIComponent('Vui lòng nêu mã tác vụ hoặc liên kết chia sẻ và mô tả vi phạm.'),
    );
  });

  it('mailto rỗng hoặc chỉ khoảng trắng trả về "#"', () => {
    assert.equal(buildReportMailto(''), '#');
    assert.equal(buildReportMailto('   '), '#');
  });

  it('assertReportEmail: production throw khi thiếu/rỗng/khoảng trắng, qua khi có địa chỉ', () => {
    for (const v of [undefined, '', ' ']) {
      assert.throws(() => assertReportEmail(v, 'production'), /NUXT_PUBLIC_REPORT_EMAIL/);
    }
    assert.doesNotThrow(() => assertReportEmail('abuse@example.com', 'production'));
    assert.doesNotThrow(() => assertReportEmail(undefined, 'development'));
  });

  it('nuxt.config gọi assertReportEmail ở hook nitro:build:before', () => {
    const cfg = fs.readFileSync(path.join(webRoot, 'nuxt.config.ts'), 'utf8');
    assert.match(cfg, /nitro:build:before[\s\S]*assertReportEmail/);
    assert.match(cfg, /reportEmail/);
  });

  it('layout có AppFooter với 3 liên kết', () => {
    assert.match(fs.readFileSync(path.join(webRoot, 'layouts/default.vue'), 'utf8'), /<AppFooter/);
    const f = fs.readFileSync(path.join(webRoot, 'components/AppFooter.vue'), 'utf8');
    for (const k of ['/terms', '/privacy', 'Điều khoản dịch vụ', 'Chính sách quyền riêng tư', 'Báo cáo vi phạm']) assert.ok(f.includes(k));
  });
});
