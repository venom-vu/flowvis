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
  it('nhảy tới trang đã tải, kẹp trong [1, pageCount]', async () => {
    const items = ref(Array.from({ length: 35 }, (_, i) => i));
    const p = useCursorPager(items, ref(false), async () => {}, 10);
    await p.goTo(3);
    assert.equal(p.page.value, 3);
    assert.deepEqual(p.pageItems.value, [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
    await p.goTo(99);
    assert.equal(p.page.value, 4);
    await p.goTo(0);
    assert.equal(p.page.value, 1);
  });
});

describe('useCursorPager với total từ máy chủ', () => {
  /** Máy chủ giả: tổng `all` dòng, mỗi lô `batch` dòng. */
  function fakeServer(all, batch) {
    const items = ref(Array.from({ length: batch }, (_, i) => i));
    const hasMore = ref(all > batch);
    const calls = { n: 0 };
    const loadMore = async () => {
      calls.n += 1;
      const from = items.value.length;
      const to = Math.min(all, from + batch);
      items.value = [...items.value, ...Array.from({ length: to - from }, (_, i) => from + i)];
      hasMore.value = to < all;
    };
    return { items, hasMore, loadMore, calls };
  }

  it('hiện đủ số trang theo total ngay từ lô đầu (40 dòng, lô 20, trang 10 dòng → 4 trang)', () => {
    const s = fakeServer(40, 20);
    const p = useCursorPager(s.items, s.hasMore, s.loadMore, 10, ref(40));
    assert.equal(p.pageCount.value, 4);
    assert.equal(p.canNext.value, true);
  });

  it('không có total thì số trang theo phần đã tải (giữ hành vi cũ)', () => {
    const s = fakeServer(40, 20);
    const p = useCursorPager(s.items, s.hasMore, s.loadMore, 10);
    assert.equal(p.pageCount.value, 2);
  });

  it('goTo trang chưa tải sẽ tải thêm lô cho tới khi đủ rồi mới chuyển trang', async () => {
    const s = fakeServer(40, 20);
    const p = useCursorPager(s.items, s.hasMore, s.loadMore, 10, ref(40));
    await p.goTo(4);
    assert.equal(p.page.value, 4);
    assert.equal(s.calls.n, 1);
    assert.deepEqual(p.pageItems.value, Array.from({ length: 10 }, (_, i) => 30 + i));
  });

  it('next() ở trang cuối đã tải gọi loadMore rồi sang trang kế', async () => {
    const s = fakeServer(40, 20);
    const p = useCursorPager(s.items, s.hasMore, s.loadMore, 10, ref(40));
    await p.goTo(2);
    await p.next();
    assert.equal(p.page.value, 3);
    assert.equal(s.calls.n, 1);
  });

  it('lô tải về rỗng thì dừng, không lặp vô hạn và giữ nguyên trang', async () => {
    const items = ref(Array.from({ length: 10 }, (_, i) => i));
    const hasMore = ref(true);
    let n = 0;
    const p = useCursorPager(items, hasMore, async () => { n += 1; }, 10, ref(50));
    await p.goTo(5);
    assert.equal(n, 1);
    assert.equal(p.page.value, 1);
    assert.equal(p.isPaging.value, false);
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
        '@/components/ui/button': tmpBtn,
        '@/lib/utils': cnPath,
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
