import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  MOCK_ME_RESPONSE,
  MOCK_MOTION_CREATE_REQUEST,
  MOCK_MOTION_TASK_QUEUED,
  MOCK_PRICING_CONFIG_RESPONSE,
  motionPrice,
} from '@flowvis/contracts';
import { createMotionApiClient } from '../utils/api-client.ts';
import { buildAiFeatureCatalog } from '../utils/catalog.ts';
import { reactive, ref } from 'vue';
import { compileScript, parse } from '@vue/compiler-sfc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(webRoot, rel), 'utf8');
const apiClientUrl = pathToFileURL(path.join(webRoot, 'utils/api-client.ts')).href;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'char-replace-'));
globalThis.__sysStatus = ref(false);

const QUEUED = { ...MOCK_MOTION_TASK_QUEUED, pipeline: 'character_replace' };
const PROMPT = 'nhân vật vẫy tay';

async function loadComposable() {
  let code = read('composables/useCharacterReplace.ts');
  const stubs = {
    '~/composables/useApiClient': `export const useApiClient = () => ({ client: globalThis.__cr.client });`,
    '~/composables/usePricingConfig': `export const usePricingConfig = () => globalThis.__cr.pricing;`,
    '~/composables/useSystemStatus': `const intakePaused = globalThis.__sysStatus; export const useSystemStatus = () => ({ intakePaused, markPaused: () => { intakePaused.value = true; }, refresh: async () => {} });`,
    '~/composables/useMotionControl': `export {};`,
    '~/utils/system-status': `export * from ${JSON.stringify(pathToFileURL(path.join(webRoot, 'utils/system-status.ts')).href)};`,
    '~/utils/api-client': `export * from ${JSON.stringify(apiClientUrl)};`,
  };
  for (const [spec, source] of Object.entries(stubs)) {
    const file = path.join(tmpDir, `${spec.replace(/[^a-z0-9]/gi, '_')}.mjs`);
    fs.writeFileSync(file, source, 'utf8');
    code = code.split(`'${spec}'`).join(JSON.stringify(pathToFileURL(file).href));
  }
  const tmp = path.join(webRoot, 'test', `.tmp-char-replace-${process.pid}-${Date.now()}.ts`);
  fs.writeFileSync(tmp, code, 'utf8');
  try {
    return await import(pathToFileURL(tmp).href);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function setup({ cap = 10 } = {}) {
  globalThis.__sysStatus.value = false;
  const calls = { create: [] };
  globalThis.__cr = {
    client: { createCharacterReplaceTask: async (req) => { calls.create.push(req); return QUEUED; } },
    pricing: {
      me: ref(MOCK_ME_RESPONSE),
      currentTier: ref('PRO'),
      currentTierCapSeconds: ref(cap),
      refreshAll: async () => {},
    },
  };
  return calls;
}

function fill(cr, { start = 0, end = 5, prompt = PROMPT } = {}) {
  cr.characterKey.value = MOCK_MOTION_CREATE_REQUEST.characterKey;
  cr.prompt.value = prompt;
  cr.onTrimChange({ videoKey: MOCK_MOTION_CREATE_REQUEST.videoKey, trimStart: start, trimEnd: end, durationSeconds: 12 });
}

describe('@flowvis/web — Thay Nhân Vật Video', () => {
  let mod;
  before(async () => { mod = await loadComposable(); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); delete globalThis.__cr; });

  it('catalog có card character-replace, per_second, theo giá cấu hình', () => {
    const card = buildAiFeatureCatalog(MOCK_PRICING_CONFIG_RESPONSE, 'PRO').find((f) => f.id === 'character-replace');
    assert.ok(card);
    assert.equal(card.billingMode, 'per_second');
    assert.equal(card.category, 'video');
    assert.equal(card.unitCredits, MOCK_PRICING_CONFIG_RESPONSE.pipelines.characterReplaceCreditsPerSecond);
  });

  it('api-client gửi POST /tasks/character-replace đúng body, từ chối prompt rỗng trước khi gọi mạng', async () => {
    const seen = [];
    const client = createMotionApiClient({
      baseUrl: 'http://api.test',
      fetchImpl: async (url, init) => {
        seen.push({ url, init });
        return new Response(JSON.stringify(QUEUED), { status: 201, headers: { 'Content-Type': 'application/json' } });
      },
    });
    const req = { characterKey: MOCK_MOTION_CREATE_REQUEST.characterKey, videoKey: MOCK_MOTION_CREATE_REQUEST.videoKey, trimStart: 0, trimEnd: 5, prompt: PROMPT };
    const task = await client.createCharacterReplaceTask(req);
    assert.equal(seen[0].url, 'http://api.test/tasks/character-replace');
    assert.deepEqual(JSON.parse(seen[0].init.body), req);
    assert.equal(task.pipeline, 'character_replace');
    await assert.rejects(() => client.createCharacterReplaceTask({ ...req, prompt: '  ' }));
    await assert.rejects(() => client.createCharacterReplaceTask({ ...req, prompt: 'x'.repeat(301) }));
    assert.equal(seen.length, 1);
  });

  it('giá thời gian thực = 50 x số giây; nút Tạo cần prompt', async () => {
    const calls = setup();
    const cr = mod.useCharacterReplace();
    fill(cr, { start: 3, end: 8 });
    assert.equal(cr.price.value, motionPrice(5));
    assert.equal(cr.price.value, 250);
    assert.equal(cr.canSubmit.value, true);
    cr.prompt.value = '   ';
    assert.equal(cr.canSubmit.value, false);
    cr.prompt.value = PROMPT;
    await Promise.all([cr.submit(), cr.submit()]);
    assert.equal(calls.create.length, 1);
    assert.deepEqual(calls.create[0], {
      characterKey: MOCK_MOTION_CREATE_REQUEST.characterKey,
      videoKey: MOCK_MOTION_CREATE_REQUEST.videoKey,
      trimStart: 3,
      trimEnd: 8,
      prompt: PROMPT,
    });
  });

  it('vượt Cap Tier thì không gửi', () => {
    setup({ cap: 5 });
    const cr = mod.useCharacterReplace();
    fill(cr, { start: 0, end: 8 });
    assert.equal(cr.canSubmit.value, false);
  });

  it('dialog có nhánh character-replace: tải video, trim, ảnh, prompt', () => {
    const vue = read('components/FeatureWorkspaceDialog.vue');
    for (const s of ["feature.id === 'character-replace'", 'workspace-replace-prompt', 'workspace-replace-video', 'workspace-replace-character']) {
      assert.ok(vue.includes(s), s);
    }
  });

  it('dialog character-replace (script logic): giá = 50 x số giây và submit gọi createCharacterReplaceTask', async () => {
    const calls = setup();
    const dir = fs.mkdtempSync(path.join(webRoot, 'test', '.tmp-cr-dialog-'));
    try {
      const { descriptor } = parse(read('components/FeatureWorkspaceDialog.vue'));
      let code = compileScript(descriptor, { id: 'test-cr-dialog' }).content;
      const href = (rel) => JSON.stringify(pathToFileURL(path.join(webRoot, rel)).href);
      const stubs = {
        '~/components/ImageUploader.vue': 'export default {};',
        '~/components/TaskProgressCard.vue': 'export default {};',
        '~/composables/useApiClient': 'export const useApiClient = () => ({ client: {} });',
        '~/composables/useAuthDialog': 'export const useAuthDialog = () => ({ open: () => {} });',
        '~/composables/usePricingConfig': 'export const usePricingConfig = () => ({ refreshAll: async () => {} });',
        '~/composables/useMotionControl': `import { ref } from 'vue'; export const useMotionControl = () => ({ isAuthenticated: ref(true), isSubmitting: ref(false), clearState: () => {}, characterKey: ref(null), capSeconds: ref(null), seconds: ref(0), price: ref(null), hasEnoughBalance: ref(true), canSubmit: ref(false), insufficientNoteVi: ref(null), submitErrorVi: ref(null), aspectRatio: ref('9:16'), prompt: ref(''), onTrimChange: () => {}, submit: async () => null });`,
        '~/composables/useCharacterReplace': 'export const useCharacterReplace = () => globalThis.__crDlgMod.useCharacterReplace();',
        '~/utils/api-client': `export * from ${href('utils/api-client.ts')};`,
        '~/utils/catalog': `export * from ${href('utils/catalog.ts')};`,
      };
      for (const [spec, source] of Object.entries(stubs)) {
        const file = path.join(dir, `${spec.replace(/[^a-z0-9]/gi, '_')}.mjs`);
        fs.writeFileSync(file, source, 'utf8');
        const next = code.split(`'${spec}'`).join(JSON.stringify(pathToFileURL(file).href));
        assert.notEqual(next, code, spec);
        code = next;
      }
      const tmp = path.join(webRoot, 'test', `.tmp-cr-dialog-${process.pid}-${Date.now()}.ts`);
      fs.writeFileSync(tmp, code, 'utf8');
      let comp;
      try {
        comp = (await import(pathToFileURL(tmp).href)).default;
      } finally {
        fs.rmSync(tmp, { force: true });
      }
      globalThis.__crDlgMod = mod;
      const feature = buildAiFeatureCatalog(MOCK_PRICING_CONFIG_RESPONSE, 'PRO').find((f) => f.id === 'character-replace');
      const props = reactive({ open: true, feature, userTier: 'PRO', userBalance: 5000 });
      const emitted = [];
      const s = comp.setup(props, { emit: (e, p) => emitted.push([e, p]), expose() {} });
      assert.equal(s.canSubmit.value, false);
      s.replaceCharacterKey.value = MOCK_MOTION_CREATE_REQUEST.characterKey;
      s.replacePrompt.value = PROMPT;
      s.onReplaceTrimChange({ videoKey: MOCK_MOTION_CREATE_REQUEST.videoKey, trimStart: 2, trimEnd: 7, durationSeconds: 12 });
      assert.equal(s.estimatedCredits.value, 50 * 5);
      assert.equal(s.canSubmit.value, true);
      await s.handleSubmit();
      assert.equal(calls.create.length, 1);
      assert.deepEqual(calls.create[0], {
        characterKey: MOCK_MOTION_CREATE_REQUEST.characterKey,
        videoKey: MOCK_MOTION_CREATE_REQUEST.videoKey,
        trimStart: 2,
        trimEnd: 7,
        prompt: PROMPT,
      });
      assert.equal(emitted[0][0], 'submit');
      assert.equal(emitted[0][1].estimatedCredits, 250);
    } finally {
      delete globalThis.__crDlgMod;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
