import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc';
import { createSSRApp, defineComponent } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { shadcnStubs } from './shadcn-stubs.mjs';

export { shadcnStubs };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const webRoot = path.resolve(__dirname, '..');

const { ui } = await import(pathToFileURL(path.join(webRoot, 'utils/admin-ui.ts')).href);
export { ui };

/** Biên dịch template SFC thành hàm ssrRender (file tạm nằm trong test/ để 'vue' phân giải đúng). */
export async function compileSsr(relFile) {
  const { descriptor } = parse(fs.readFileSync(path.join(webRoot, relFile), 'utf8'));
  const compiled = compileTemplate({
    id: `t-${path.basename(relFile)}-${Math.random().toString(36).slice(2)}`,
    filename: relFile,
    source: descriptor.template.content,
    ssr: true,
  });
  if (compiled.errors.length) throw new Error(`${relFile}: ${compiled.errors.join('; ')}`);
  const tmp = path.join(webRoot, 'test', `.tmp-sfc-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmp, compiled.code, 'utf8');
  try {
    return (await import(pathToFileURL(tmp).href)).ssrRender;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

const formUiUrl = pathToFileURL(path.join(webRoot, 'utils/form-ui.ts')).href;

/** Biên dịch đầy đủ một SFC nhỏ (có script setup + template) để dùng trong test SSR. */
export async function compileFullSfc(relFile) {
  const { descriptor } = parse(fs.readFileSync(path.join(webRoot, relFile), 'utf8'));
  const id = `sfc-${path.basename(relFile)}-${Math.random().toString(36).slice(2)}`;
  const script = compileScript(descriptor, { id, inlineTemplate: false });
  const template = compileTemplate({
    id,
    filename: relFile,
    source: descriptor.template.content,
    ssr: true,
    compilerOptions: { bindingMetadata: script.bindings },
  });
  if (template.errors.length) throw new Error(`${relFile}: ${template.errors.join('; ')}`);
  const paginationUrl = pathToFileURL(path.join(webRoot, 'utils/pagination.ts')).href;
  const scriptCode = script.content
    .replaceAll("'~/utils/form-ui'", JSON.stringify(formUiUrl))
    .replaceAll("'~/utils/pagination'", JSON.stringify(paginationUrl))
    .replace(/^import\s*\{\s*cn\s*\}\s*from\s*'@\/lib\/utils';?[ \t]*$/gm, 'const cn = (...a) => a.flat().filter(Boolean).join(" ");')
    .replace(/^import\s*\{\s*buttonVariants\s*\}\s*from\s*'@\/components\/ui\/button';?[ \t]*$/gm, 'const buttonVariants = () => "";')
    // Component shadcn được thay bằng stub (bản thật cần reka-ui và alias '@/').
    .replace(/^import\s*\{([^}]*)\}\s*from\s*'@\/components\/ui\/[^'\n]*';?[ \t]*$/gm, (_m, names) => {
      const list = names.split(',').map((n) => n.trim()).filter(Boolean).map((n) => n.split(' as ').pop().trim());
      return `const { ${list.join(', ')} } = __shadcnStubs();`;
    });
  const stubsUrl = pathToFileURL(path.join(webRoot, 'test/shadcn-stubs.mjs')).href;
  const scriptWithStubs = `import { shadcnStubs as __shadcnStubs } from ${JSON.stringify(stubsUrl)};\n${scriptCode}`;
  const tmpScript = path.join(webRoot, 'test', `.tmp-script-${process.pid}-${Math.random().toString(36).slice(2)}.ts`);
  const tmpTpl = path.join(webRoot, 'test', `.tmp-tpl-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpScript, scriptWithStubs, 'utf8');
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

const shared = {
  gate: await compileSsr('components/AdminAccessGate.vue'),
  pager: await compileFullSfc('components/AdminPager.vue'),
  confirm: await compileFullSfc('components/AdminConfirmDialog.vue'),
  bar: await compileFullSfc('components/AdminBarChart.vue'),
  daily: await compileFullSfc('components/AdminDailyChart.vue'),
  baseInput: await compileFullSfc('components/BaseInput.vue'),
  baseTextarea: await compileFullSfc('components/BaseTextarea.vue'),
  baseSelect: await compileFullSfc('components/BaseSelect.vue'),
};

/** Một trang có số trang cố định để dựng setup cho test SSR. */
export function staticPager(items, { page = 1, pageSize = 20, hasMore = false } = {}) {
  const ref = (value) => ({ value });
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  return {
    page: ref(page),
    pageCount: ref(pageCount),
    pageItems: ref(items.slice((page - 1) * pageSize, page * pageSize)),
    canPrev: ref(page > 1),
    canNext: ref(page < pageCount || hasMore),
    isPaging: ref(false),
    next() {},
    prev() {},
    reset() {},
  };
}

/** Render trang admin với các component admin dùng chung thật; Icon/NuxtLink là stub. */
export async function renderAdminPage(ssrRender, setupData, extraComponents = {}) {
  const app = createSSRApp({ ssrRender, setup: () => ({ ui, ...setupData }) });
  const withUi = (render, props, emits = []) => ({ props, emits, ssrRender: render, setup: () => ({ ui, openAuthDialog() {}, emit() {} }) });
  app.component('AdminAccessGate', withUi(shared.gate, ['pending', 'admin']));
  app.component('AdminPager', shared.pager);
  app.component('AdminConfirmDialog', shared.confirm);
  app.component('AdminBarChart', shared.bar);
  app.component('AdminDailyChart', shared.daily);
  app.component('BaseInput', shared.baseInput);
  app.component('BaseTextarea', shared.baseTextarea);
  app.component('BaseSelect', shared.baseSelect);
  for (const [n, d] of Object.entries(shadcnStubs())) app.component(n, d);
  app.component('Icon', { props: ['name'], ssrRender(_c, push) { push('<span class="mock-lucide-icon"></span>'); } });
  app.component('NuxtLink', {
    props: ['to'],
    ssrRender(c, push, _p, _a, _s, slots) {
      push(`<a href="${c.to}">`);
      slots.default?.();
      push('</a>');
    },
  });
  for (const [name, def] of Object.entries(extraComponents)) app.component(name, def);
  return renderToString(app);
}
