import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { compileScript, compileTemplate, parse, registerTS } from '@vue/compiler-sfc';
import { createSSRApp, defineComponent, ref } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { buildPageTokens } from '../utils/pagination.ts';
import {
  BADGE_TONE_CLASS,
  getTaskStatusBadge,
  getTopupPackBadge,
  getTopupStatusBadge,
} from '../utils/status-badge.ts';
import { useCursorPager } from '../composables/useCursorPager.ts';

registerTS(() => ts);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const sfcFs = {
  fileExists: fs.existsSync,
  readFile: (p) => fs.readFileSync(p, 'utf8'),
  realpath: fs.realpathSync,
};

/** Biên dịch SFC thực kèm alias @/ và ~/ để SSR test chạy trực tiếp với reka-ui thật. */
async function compileRealSfc(relFile, aliasMap) {
  const filename = path.join(webRoot, relFile);
  let source = fs.readFileSync(filename, 'utf8');
  for (const [specifier, target] of Object.entries(aliasMap)) {
    source = source
      .replaceAll(`'${specifier}'`, JSON.stringify(target))
      .replaceAll(`"${specifier}"`, JSON.stringify(target));
  }
  const { descriptor } = parse(source, { filename });
  const id = `real-${path.basename(relFile)}-${Math.random().toString(36).slice(2)}`;
  const script = compileScript(descriptor, { id, inlineTemplate: false, fs: sfcFs });
  const template = compileTemplate({
    id,
    filename,
    source: descriptor.template.content,
    ssr: true,
    compilerOptions: { bindingMetadata: script.bindings },
  });
  if (template.errors.length) throw new Error(`${relFile}: ${template.errors.join('; ')}`);

  const tmpScript = path.join(webRoot, 'test', `.tmp-real-script-${process.pid}-${Math.random().toString(36).slice(2)}.ts`);
  const tmpTpl = path.join(webRoot, 'test', `.tmp-real-tpl-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpScript, script.content, 'utf8');
  fs.writeFileSync(tmpTpl, template.code, 'utf8');
  try {
    const comp = (await import(pathToFileURL(tmpScript).href)).default;
    const { ssrRender } = await import(pathToFileURL(tmpTpl).href);
    return defineComponent({ ...comp, ssrRender });
  } finally {
    fs.rmSync(tmpScript, { force: true });
    fs.rmSync(tmpTpl, { force: true });
  }
}

describe('buildPageTokens: số trang kèm dấu "…"', () => {
  it('ít trang: hiện đủ, không có "…"', () => {
    assert.deepEqual(buildPageTokens(1, 1), [1]);
    assert.deepEqual(buildPageTokens(2, 5), [1, 2, 3, 4, 5]);
  });
  it('nhiều trang: giữ trang đầu, cuối và trang kề trang hiện tại', () => {
    assert.deepEqual(buildPageTokens(1, 12), [1, 2, 'ellipsis', 12]);
    assert.deepEqual(buildPageTokens(6, 12), [1, 'ellipsis', 5, 6, 7, 'ellipsis', 12]);
    assert.deepEqual(buildPageTokens(12, 12), [1, 'ellipsis', 11, 12]);
  });
  it('khoảng trống chỉ 1 trang thì hiện số thay vì "…"', () => {
    assert.deepEqual(buildPageTokens(4, 7), [1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('useCursorPager.goTo', () => {
  it('nhảy tới trang đã tải, kẹp trong [1, pageCount]', () => {
    const items = ref(Array.from({ length: 35 }, (_, i) => i));
    const p = useCursorPager(items, ref(false), async () => {}, 10);
    p.goTo(3);
    assert.equal(p.page.value, 3);
    assert.deepEqual(p.pageItems.value, [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
    p.goTo(99);
    assert.equal(p.page.value, 4);
    p.goTo(0);
    assert.equal(p.page.value, 1);
  });
});

describe('Badge trạng thái: nhãn ngắn, màu khác nhau trong cùng cột', () => {
  const distinctTones = (specs) => new Set(specs.map((b) => b.tone)).size === specs.length;

  it('trạng thái Task không kèm "hoàn credit" và mỗi trạng thái một màu', () => {
    const specs = ['queued', 'running', 'succeeded', 'failed', 'timed_out', 'cancelled'].map((status) =>
      getTaskStatusBadge({ status, queuePosition: null }),
    );
    assert.ok(distinctTones(specs));
    for (const b of specs) {
      assert.doesNotMatch(b.label, /credit/i);
      assert.ok(b.label.length <= 12, b.label);
    }
    assert.equal(getTaskStatusBadge({ status: 'queued', queuePosition: 3 }).label, 'Đang chờ #3');
  });

  it('trạng thái đơn nạp và gói nạp mỗi giá trị một màu', () => {
    const statuses = ['awaiting_transfer', 'pending', 'approved', 'rejected', 'needs_review', 'expired'];
    assert.ok(distinctTones(statuses.map(getTopupStatusBadge)));
    assert.ok(distinctTones(['starter', 'pro', 'creator'].map(getTopupPackBadge)));
    for (const tone of Object.keys(BADGE_TONE_CLASS)) {
      assert.match(BADGE_TONE_CLASS[tone], /^border-\S+ bg-\S+ text-\S+$/);
    }
  });
});

describe('AdminPager + ui/pagination (SSR với reka-ui thật)', () => {
  it('PaginationContent render thẻ ul với list-none và AdminPager không lồng thẻ nav', async () => {
    const tmpDir = path.join(webRoot, 'test');
    const tmpBtn = path.join(tmpDir, `.tmp-btn-${process.pid}.ts`);
    const tmpPaginationIdx = path.join(tmpDir, `.tmp-pagination-idx-${process.pid}.mjs`);
    const buttonRaw = fs.readFileSync(path.join(webRoot, 'components/ui/button/index.ts'), 'utf8')
      .replace(/^export \{ default as Button \} from "\.\/Button\.vue"\r?\n/m, '');
    fs.writeFileSync(tmpBtn, buttonRaw, 'utf8');

    const cnPath = path.join(webRoot, 'lib/utils.ts');
    const paginationPath = path.join(webRoot, 'utils/pagination.ts');
    const baseAliases = {
      '@/lib/utils': cnPath,
      '@/components/ui/button': tmpBtn,
    };

    const uiFiles = {};
    try {
      for (const name of [
        'Pagination',
        'PaginationContent',
        'PaginationEllipsis',
        'PaginationItem',
        'PaginationNext',
        'PaginationPrevious',
      ]) {
        uiFiles[name] = await compileRealSfc(`components/ui/pagination/${name}.vue`, baseAliases);
      }
      // Dùng global registry tạm để index.mjs xuất đúng các component vừa biên dịch.
      globalThis.__realPaginationMods = uiFiles;
      fs.writeFileSync(
        tmpPaginationIdx,
        `export const { ${Object.keys(uiFiles).join(', ')} } = globalThis.__realPaginationMods;\n`,
        'utf8',
      );
      const AdminPager = await compileRealSfc('components/AdminPager.vue', {
        '@/components/ui/pagination': tmpPaginationIdx,
        '~/utils/pagination': paginationPath,
      });

      const app = createSSRApp(AdminPager, {
        page: 1,
        pageCount: 1,
        hasMore: false,
        canPrev: false,
        canNext: false,
        loading: false,
      });
      app.component('Icon', {
        props: ['name'],
        ssrRender(ctx, push) {
          push(`<span data-icon="${ctx.name}"></span>`);
        },
      });
      const html = await renderToString(app);

      // Chỉ có đúng 1 thẻ <nav> ở ngoài cùng, không lồng <nav> bên trong <nav>.
      assert.equal(html.match(/<nav\b/g)?.length ?? 0, 1);
      // PaginationContent phải là <ul> có list-none để <li> không hiện dấu chấm tròn (bullet).
      assert.match(html, /<ul[^>]*data-slot="pagination-content"[^>]*class="[^"]*\blist-none\b[^"]*"[^>]*>.*<li/s);
      assert.doesNotMatch(html, /<div[^>]*data-slot="pagination-content"/);
      assert.match(html, /<button[^>]*aria-current="page"[^>]*data-testid="admin-pager-page-1"/);
    } finally {
      delete globalThis.__realPaginationMods;
      fs.rmSync(tmpBtn, { force: true });
      fs.rmSync(tmpPaginationIdx, { force: true });
    }
  });
});
