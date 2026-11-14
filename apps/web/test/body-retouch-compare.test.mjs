import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc';
import { createSSRApp, h, nextTick, ref } from 'vue';
import { renderToString } from '@vue/server-renderer';
import {
  MOCK_BODY_RETOUCH_RESULT_RESPONSE,
  MOCK_BODY_RETOUCH_TASK_QUEUED,
  MOCK_BODY_RETOUCH_TASK_RUNNING,
  MOCK_BODY_RETOUCH_TASK_SUCCEEDED,
} from '@flowvis/contracts';
import {
  formatTaskTimestampVi,
  getPipelineLabelVi,
  getTaskStatusLabelVi,
} from '../utils/task-format.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(webRoot, rel), 'utf8');

/**
 * Biên dịch <script setup> của một SFC, thay thế các import alias bằng module stub,
 * rồi import trực tiếp để kiểm thử hành vi reactive và hàm xử lý.
 */
async function loadSetup(rel, stubs = {}, dir = null) {
  const { descriptor } = parse(read(rel));
  let code = compileScript(descriptor, { id: `test-${rel}` }).content;
  if (dir && Object.keys(stubs).length > 0) {
    for (const [spec, source] of Object.entries(stubs)) {
      const file = path.join(dir, `${spec.replace(/[^a-z0-9]/gi, '_')}.mjs`);
      fs.writeFileSync(file, source, 'utf8');
      const next = code
        .split(`'${spec}'`)
        .join(JSON.stringify(pathToFileURL(file).href));
      assert.notEqual(
        next,
        code,
        `import ${spec} trong ${rel} phải được thay thế bằng stub`,
      );
      code = next;
    }
  }
  const tmp = path.join(
    webRoot,
    'test',
    `.tmp-${path.basename(rel)}-${process.pid}-${Date.now()}.ts`,
  );
  fs.writeFileSync(tmp, code, 'utf8');
  try {
    return (await import(pathToFileURL(tmp).href)).default;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

describe('@flowvis/web — Story 4.5: [FE] So sánh trước/sau (BeforeAfterSplitSlider & tasks/[id].vue)', () => {
  describe('1. Component BeforeAfterSplitSlider — Script setup reactive & sự kiện bàn phím/pointer', () => {
    let sliderComp;

    before(async () => {
      sliderComp = await loadSetup('components/BeforeAfterSplitSlider.vue');
    });

    it('khởi tạo vị trí thanh trượt từ initialPosition (mặc định 50%, kẹp 0..100) và tính hasSource đúng', () => {
      const emitted = [];
      const emit = (event, payload) => emitted.push({ event, payload });

      // 1. Trường hợp có sourceUrl
      const props1 = {
        sourceUrl: 'https://cdn.example.test/in/source.png',
        resultUrl: 'https://cdn.example.test/out/result.png',
        initialPosition: 50,
        disabled: false,
      };
      const setup1 = sliderComp.setup(props1, { emit, expose() {} });
      assert.equal(setup1.sliderPosition.value, 50);
      assert.equal(setup1.hasSource.value, true);
      assert.equal(setup1.sourceLoadFailed.value, false);

      // 2. Trường hợp không có sourceUrl (null, rỗng hoặc chuỗi trắng)
      for (const emptySource of [null, undefined, '', '   ']) {
        const setupEmpty = sliderComp.setup(
          { sourceUrl: emptySource, resultUrl: 'https://cdn.example.test/out/result.png', initialPosition: 50 },
          { emit, expose() {} },
        );
        assert.equal(setupEmpty.hasSource.value, false);
      }

      // 3. Kẹp giá trị initialPosition ngoài khoảng 0..100
      const setupOver = sliderComp.setup(
        { sourceUrl: 'https://cdn.example.test/in/source.png', resultUrl: 'https://cdn.example.test/out/result.png', initialPosition: 140 },
        { emit, expose() {} },
      );
      assert.equal(setupOver.sliderPosition.value, 100);

      const setupUnder = sliderComp.setup(
        { sourceUrl: 'https://cdn.example.test/in/source.png', resultUrl: 'https://cdn.example.test/out/result.png', initialPosition: -25 },
        { emit, expose() {} },
      );
      assert.equal(setupUnder.sliderPosition.value, 0);
    });

    it('điều hướng thanh trượt bằng bàn phím (ArrowLeft/Down -5%, ArrowRight/Up +5%, Home 0%, End 100%) và chặn default', () => {
      const emitted = [];
      const emit = (event, payload) => emitted.push({ event, payload });
      const props = {
        sourceUrl: 'https://cdn.example.test/in/source.png',
        resultUrl: 'https://cdn.example.test/out/result.png',
        initialPosition: 50,
        disabled: false,
      };
      const setup = sliderComp.setup(props, { emit, expose() {} });

      const makeKeyEvent = (key) => {
        let prevented = false;
        return {
          key,
          preventDefault: () => {
            prevented = true;
          },
          get prevented() {
            return prevented;
          },
        };
      };

      // ArrowLeft: 50 -> 45
      const evLeft = makeKeyEvent('ArrowLeft');
      setup.handleKeydown(evLeft);
      assert.equal(setup.sliderPosition.value, 45);
      assert.equal(evLeft.prevented, true);
      assert.deepEqual(emitted[emitted.length - 1], { event: 'positionChange', payload: 45 });

      // ArrowDown: 45 -> 40
      const evDown = makeKeyEvent('ArrowDown');
      setup.handleKeydown(evDown);
      assert.equal(setup.sliderPosition.value, 40);
      assert.equal(evDown.prevented, true);

      // ArrowRight: 40 -> 45
      const evRight = makeKeyEvent('ArrowRight');
      setup.handleKeydown(evRight);
      assert.equal(setup.sliderPosition.value, 45);
      assert.equal(evRight.prevented, true);

      // ArrowUp: 45 -> 50
      const evUp = makeKeyEvent('ArrowUp');
      setup.handleKeydown(evUp);
      assert.equal(setup.sliderPosition.value, 50);
      assert.equal(evUp.prevented, true);

      // Home: 50 -> 0
      const evHome = makeKeyEvent('Home');
      setup.handleKeydown(evHome);
      assert.equal(setup.sliderPosition.value, 0);
      assert.equal(evHome.prevented, true);

      // ArrowLeft ở biên 0 không bị âm
      setup.handleKeydown(makeKeyEvent('ArrowLeft'));
      assert.equal(setup.sliderPosition.value, 0);

      // End: 0 -> 100
      const evEnd = makeKeyEvent('End');
      setup.handleKeydown(evEnd);
      assert.equal(setup.sliderPosition.value, 100);
      assert.equal(evEnd.prevented, true);

      // ArrowRight ở biên 100 không vượt quá 100
      setup.handleKeydown(makeKeyEvent('ArrowRight'));
      assert.equal(setup.sliderPosition.value, 100);

      // Phím không liên quan (Tab, Enter) không thay đổi vị trí và không preventDefault
      const evTab = makeKeyEvent('Tab');
      setup.handleKeydown(evTab);
      assert.equal(setup.sliderPosition.value, 100);
      assert.equal(evTab.prevented, false);
    });

    it('không cho phép thao tác phím khi disabled hoặc không có hasSource', () => {
      const emitted = [];
      const emit = (event, payload) => emitted.push({ event, payload });

      // 1. Khi disabled = true
      const propsDisabled = {
        sourceUrl: 'https://cdn.example.test/in/source.png',
        resultUrl: 'https://cdn.example.test/out/result.png',
        initialPosition: 50,
        disabled: true,
      };
      const setupDisabled = sliderComp.setup(propsDisabled, { emit, expose() {} });
      let prevented = false;
      setupDisabled.handleKeydown({ key: 'ArrowLeft', preventDefault: () => { prevented = true; } });
      assert.equal(setupDisabled.sliderPosition.value, 50);
      assert.equal(prevented, false);

      // 2. Khi hasSource = false (sourceUrl null)
      const propsNoSrc = {
        sourceUrl: null,
        resultUrl: 'https://cdn.example.test/out/result.png',
        initialPosition: 50,
        disabled: false,
      };
      const setupNoSrc = sliderComp.setup(propsNoSrc, { emit, expose() {} });
      prevented = false;
      setupNoSrc.handleKeydown({ key: 'ArrowLeft', preventDefault: () => { prevented = true; } });
      assert.equal(setupNoSrc.sliderPosition.value, 50);
      assert.equal(prevented, false);
    });

    it('xử lý lỗi tải ảnh onSourceError và onResultError: set sourceLoadFailed và emit imageError', () => {
      const emitted = [];
      const emit = (event, payload) => emitted.push({ event, payload });
      const props = {
        sourceUrl: 'https://cdn.example.test/in/source.png',
        resultUrl: 'https://cdn.example.test/out/result.png',
        initialPosition: 50,
        disabled: false,
      };
      const setup = sliderComp.setup(props, { emit, expose() {} });

      const mockEvent = { type: 'error' };

      // Lỗi ảnh gốc
      setup.onSourceError(mockEvent);
      assert.equal(setup.sourceLoadFailed.value, true);
      assert.equal(setup.hasSource.value, false);
      assert.deepEqual(emitted[0], {
        event: 'imageError',
        payload: { type: 'source', error: mockEvent },
      });

      // Lỗi ảnh kết quả
      setup.onResultError(mockEvent);
      assert.deepEqual(emitted[1], {
        event: 'imageError',
        payload: { type: 'result', error: mockEvent },
      });
    });

    it('watcher trên props.sourceUrl tự động reset sourceLoadFailed về false khi nhận URL mới', async () => {
      const emitted = [];
      const emit = (event, payload) => emitted.push({ event, payload });

      const reactiveProps = ref({
        sourceUrl: 'https://cdn.example.test/in/expired-source.png',
        resultUrl: 'https://cdn.example.test/out/result.png',
        initialPosition: 50,
        disabled: false,
      });

      // Tạo reactive proxy như Vue runtime
      const setup = sliderComp.setup(reactiveProps.value, { emit, expose() {} });

      // Ban đầu hasSource là true
      assert.equal(setup.hasSource.value, true);
      assert.equal(setup.sourceLoadFailed.value, false);

      // Ảnh gốc lỗi
      setup.onSourceError({ type: 'error' });
      assert.equal(setup.sourceLoadFailed.value, true);
      assert.equal(setup.hasSource.value, false);

      // Đổi sourceUrl sang link ký mới
      reactiveProps.value.sourceUrl = 'https://cdn.example.test/in/refreshed-source.png';
      await nextTick();

      // Watcher kích hoạt reset sourceLoadFailed
      assert.equal(setup.sourceLoadFailed.value, false);
      assert.equal(setup.hasSource.value, true);
    });

    it('xử lý thao tác kéo pointer (handlePointerDown, move, up): tính vị trí từ clientX và emit positionChange', () => {
      const emitted = [];
      const emit = (event, payload) => emitted.push({ event, payload });
      const props = {
        sourceUrl: 'https://cdn.example.test/in/source.png',
        resultUrl: 'https://cdn.example.test/out/result.png',
        initialPosition: 50,
        disabled: false,
      };
      const setup = sliderComp.setup(props, { emit, expose() {} });

      // Giả lập DOM container
      setup.containerRef.value = {
        getBoundingClientRect: () => ({
          left: 100,
          width: 500,
          right: 600,
          top: 50,
          bottom: 450,
          height: 400,
        }),
      };

      let pointerCaptured = null;
      let pointerReleased = null;
      const target = {
        setPointerCapture: (id) => { pointerCaptured = id; },
        releasePointerCapture: (id) => { pointerReleased = id; },
      };

      // Pointer down ở vị trí clientX = 350 (tương ứng 50% trong container left=100 width=500: (350-100)/500 = 50%)
      setup.handlePointerDown({
        button: 0,
        clientX: 350,
        pointerId: 42,
        currentTarget: target,
      });
      assert.equal(setup.isDragging.value, true);
      assert.equal(pointerCaptured, 42);
      assert.equal(setup.sliderPosition.value, 50);

      // Pointer move sang clientX = 225 (tương ứng (225-100)/500 = 25%)
      setup.handlePointerMove({
        clientX: 225,
        pointerType: 'mouse',
        buttons: 1,
      });
      assert.equal(setup.sliderPosition.value, 25);
      assert.deepEqual(emitted[emitted.length - 1], {
        event: 'positionChange',
        payload: 25,
      });

      // Pointer up kết thúc kéo
      setup.handlePointerUp({
        pointerId: 42,
        currentTarget: target,
      });
      assert.equal(setup.isDragging.value, false);
      assert.equal(pointerReleased, 42);
      // Vị trí vẫn giữ nguyên ở 25% sau khi thả tay
      assert.equal(setup.sliderPosition.value, 25);
    });
  });

  describe('2. Component BeforeAfterSplitSlider — SSR template render', () => {
    let ssrRender;

    before(async () => {
      const sfcCode = read('components/BeforeAfterSplitSlider.vue');
      const { descriptor } = parse(sfcCode, { filename: 'BeforeAfterSplitSlider.vue' });
      const compiled = compileTemplate({
        id: 'test-before-after-slider-ssr',
        filename: 'components/BeforeAfterSplitSlider.vue',
        source: descriptor.template.content,
        ssr: true,
        ssrCssVars: [],
      });
      assert.equal(compiled.errors.length, 0);

      const tmpFile = path.join(
        webRoot,
        'test',
        `.tmp-slider-ssr-${Date.now()}.mjs`,
      );
      fs.writeFileSync(tmpFile, compiled.code, 'utf8');
      try {
        const mod = await import(pathToFileURL(tmpFile).href);
        ssrRender = mod.ssrRender;
      } finally {
        fs.rmSync(tmpFile, { force: true });
      }
    });

    const createSliderApp = (opts = {}) => {
      const app = createSSRApp({
        ssrRender,
        setup() {
          const hasSource = Boolean(opts.sourceUrl);
          const sliderPos = opts.sliderPosition ?? 50;
          return {
            sourceUrl: opts.sourceUrl ?? null,
            resultUrl: opts.resultUrl ?? 'https://cdn.example.test/out/result.png',
            alt: opts.alt ?? 'Kết quả Chỉnh sửa vóc dáng',
            disabled: opts.disabled ?? false,
            surface: opts.surface ?? 'card',
            sliderPosition: sliderPos,
            hasSource,
            handlePointerDown: () => {},
            handlePointerMove: () => {},
            handlePointerUp: () => {},
            handleKeydown: () => {},
            onSourceError: () => {},
            onResultError: () => {},
          };
        },
      });
      app.component('Icon', {
        props: ['name'],
        ssrRender(ctx, push) {
          push(`<span class="icon-${ctx.name?.replace(/[:/]/g, '-')}"></span>`);
        },
      });
      return app;
    };

    it('chế độ 2 ảnh (có sourceUrl): hiển thị đầy đủ before-layer, after-layer, núm kéo 36px, aria-valuetext, clipPath và chỉ dẫn trượt', async () => {
      const html = await renderToString(
        createSliderApp({
          sourceUrl: MOCK_BODY_RETOUCH_RESULT_RESPONSE.sourceUrl,
          resultUrl: MOCK_BODY_RETOUCH_RESULT_RESPONSE.resultUrl,
          sliderPosition: 50,
        }),
      );

      // Khung chứa và cấu hình touch-action
      assert.match(html, /data-testid="before-after-split-slider"/);
      assert.match(html, /bg-cyber-surface\/90/);
      assert.match(html, /data-testid="split-slider-canvas"/);
      assert.match(html, /touch-action:\s*pan-y/i);

      const recessedHtml = await renderToString(
        createSliderApp({
          sourceUrl: MOCK_BODY_RETOUCH_RESULT_RESPONSE.sourceUrl,
          resultUrl: MOCK_BODY_RETOUCH_RESULT_RESPONSE.resultUrl,
          surface: 'recessed',
        }),
      );
      assert.match(recessedHtml, /bg-cyber-bg\/70/);

      // Lớp Before (ảnh gốc)
      assert.match(html, /data-testid="before-layer"/);
      assert.match(html, /data-testid="source-image"/);
      assert.match(html, /object-contain/);
      assert.match(html, /data-testid="tag-before"/);
      assert.match(html, /Ảnh Gốc/);

      // Lớp After (kết quả AI) với clip-path đúng tỉ lệ
      assert.match(html, /data-testid="after-layer"/);
      assert.match(html, /data-testid="result-image"/);
      assert.match(html, /clip-path:\s*inset\(0\s+0\s+0\s+50%\)/i);
      assert.match(html, /data-testid="tag-after"/);
      assert.match(html, /Kết Quả AI/);

      // Đường phân cách và núm trượt 36px
      assert.match(html, /data-testid="slider-divider"/);
      assert.match(html, /data-testid="slider-knob"/);
      assert.match(html, /role="slider"/);
      assert.match(html, /aria-orientation="horizontal"/);
      assert.match(html, /aria-label="Thanh trượt so sánh trước sau"/);
      assert.match(html, /aria-valuemin="0"/);
      assert.match(html, /aria-valuemax="100"/);
      assert.match(html, /aria-valuenow="50"/);
      assert.match(html, /aria-valuetext="50% ảnh kết quả, 50% ảnh gốc"/);
      assert.match(html, /h-9 w-9/); // Núm 36px
      assert.match(html, /icon-lucide-arrow-left-right/);

      // Kiểm thử vị trí lệch tâm (asymmetric 25%): 75% kết quả, 25% gốc
      const html25 = await renderToString(
        createSliderApp({
          sourceUrl: MOCK_BODY_RETOUCH_RESULT_RESPONSE.sourceUrl,
          resultUrl: MOCK_BODY_RETOUCH_RESULT_RESPONSE.resultUrl,
          sliderPosition: 25,
        }),
      );
      assert.match(html25, /aria-valuenow="25"/);
      assert.match(html25, /aria-valuetext="75% ảnh kết quả, 25% ảnh gốc"/);

      // Thanh gợi ý trượt ngang
      assert.match(html, /data-testid="slider-hint-bar"/);
      assert.match(html, /Trượt thanh ngang để so sánh Before\/After trực tiếp/);

      // Không hiển thị nhãn hết hạn
      assert.doesNotMatch(html, /data-testid="source-expired-note"/);
      assert.doesNotMatch(html, /data-testid="single-result-image"/);
    });

    it('chế độ 1 ảnh (sourceUrl null / quá 7 ngày): chỉ hiển thị ảnh kết quả và nhãn "Ảnh gốc đã hết hạn lưu", không hiển thị thanh kéo hỏng', async () => {
      const html = await renderToString(
        createSliderApp({
          sourceUrl: null,
          resultUrl: MOCK_BODY_RETOUCH_RESULT_RESPONSE.resultUrl,
        }),
      );

      // Chỉ hiển thị single-result-image
      assert.match(html, /data-testid="single-result-image"/);
      assert.match(html, /object-contain/);
      assert.match(html, /data-testid="single-result-tag"/);
      assert.match(html, /Kết Quả AI/);

      // Nhãn thông báo chuẩn xác không chứa số ngày thừa
      assert.match(html, /data-testid="source-expired-note"/);
      assert.match(html, /Ảnh gốc đã hết hạn lưu/);

      // Tuyệt đối không hiển thị thanh trượt hoặc lớp ảnh gốc
      assert.doesNotMatch(html, /data-testid="slider-knob"/);
      assert.doesNotMatch(html, /data-testid="slider-divider"/);
      assert.doesNotMatch(html, /data-testid="before-layer"/);
      assert.doesNotMatch(html, /data-testid="after-layer"/);
      assert.doesNotMatch(html, /data-testid="slider-hint-bar"/);
    });
  });


  describe('3. Trang pages/tasks/[id].vue — SSR template render (đầu vào + kết quả)', () => {
    let ssrRender;

    before(async () => {
      const { descriptor } = parse(read('pages/tasks/[id].vue'), { filename: 'tasks-[id].vue' });
      const compiled = compileTemplate({
        id: 'test-tasks-id-page-ssr',
        filename: 'pages/tasks/[id].vue',
        source: descriptor.template.content,
        ssr: true,
        ssrCssVars: [],
      });
      assert.equal(compiled.errors.length, 0);
      const tmpFile = path.join(webRoot, 'test', `.tmp-tasks-id-ssr-${Date.now()}.mjs`);
      fs.writeFileSync(tmpFile, compiled.code, 'utf8');
      try {
        ssrRender = (await import(pathToFileURL(tmpFile).href)).ssrRender;
      } finally {
        fs.rmSync(tmpFile, { force: true });
      }
    });

    const BODY_INPUTS = [
      { role: 'imageKey', mediaType: 'image', url: 'https://cdn.example.test/in.jpg' },
    ];

    const createApp = ({
      task = MOCK_BODY_RETOUCH_TASK_SUCCEEDED,
      inputs = BODY_INPUTS,
      params = { intensity: 7 },
      isUnauthenticated = false,
      taskErrorVi = null,
      pending = false,
    } = {}) => {
      const paramRows = params?.intensity != null ? [{ label: 'Mức điều chỉnh', value: `${params.intensity}/10` }] : [];
      const app = createSSRApp({
        ssrRender,
        setup() {
          return {
            taskAsync: { pending: { value: pending }, refresh: () => {} },
            currentTask: task,
            result: { inputs, params },
            inputs,
            params,
            paramRows,
            isUnauthenticated,
            taskErrorVi,
            isVideoPipeline: task.pipeline === 'motion_control' || task.pipeline === 'character_replace',
            statusTone: 'tone',
            idCopied: false,
            inputLabelVi: (role) => role,
            getPipelineLabelVi,
            getTaskStatusLabelVi,
            formatTaskTimestampVi,
            getPipelineRoute: (pl) => (pl === 'body_retouch' ? '/body-retouch' : pl === 'motion_control' ? '/motion-control' : '/face-swap'),
            copyTaskId: () => {},
            handleGoBack: () => {},
            handleCreateNewTask: () => {},
            openAuthDialog: () => {},
          };
        },
      });
      app.component('Icon', { props: ['name'], ssrRender: (_c, push) => push('<i></i>') });
      app.component('NuxtLink', {
        props: ['to'],
        setup(props, { slots, attrs }) {
          return () => h('a', { href: props.to || '#', 'data-testid': attrs['data-testid'] }, slots.default ? slots.default() : '');
        },
      });
      app.component('TaskResultViewer', {
        props: ['task'],
        ssrRender: (ctx, push) =>
          push(`<div data-testid="mock-task-result-viewer" data-status="${ctx.task?.status}"></div>`),
      });
      return app;
    };

    it('hiển thị khối đầu vào, thông tin tác vụ và TaskResultViewer (không còn UI loading riêng)', async () => {
      const html = await renderToString(createApp());
      assert.match(html, /data-testid="result-success-view"/);
      assert.match(html, /data-testid="task-inputs-card"/);
      assert.match(html, /data-testid="task-input-imageKey"/);
      assert.match(html, /src="https:\/\/cdn\.example\.test\/in\.jpg"/);
      assert.match(html, /data-testid="task-info-card"/);
      assert.match(html, /7\/10/);
      assert.match(html, /data-testid="mock-task-result-viewer" data-status="succeeded"/);
      assert.doesNotMatch(html, /task-in-progress-view/);
    });

    it('task đang queued/running vẫn render viewer (loading nằm trong viewer)', async () => {
      for (const [task, status] of [
        [MOCK_BODY_RETOUCH_TASK_QUEUED, 'queued'],
        [MOCK_BODY_RETOUCH_TASK_RUNNING, 'running'],
      ]) {
        const html = await renderToString(createApp({ task, inputs: [] }));
        assert.match(html, new RegExp(`data-status="${status}"`));
        assert.match(html, /Đầu vào sẽ hiển thị sau khi tác vụ hoàn tất/);
      }
    });

    it('succeeded nhưng không còn tệp đầu vào: báo hết hạn lưu', async () => {
      const html = await renderToString(createApp({ inputs: [] }));
      assert.match(html, /data-testid="task-inputs-empty"/);
    });

    it('video: render <video> cho đầu vào video và prompt khi có', async () => {
      const task = { ...MOCK_BODY_RETOUCH_TASK_SUCCEEDED, pipeline: 'motion_control' };
      const html = await renderToString(
        createApp({
          task,
          inputs: [
            { role: 'characterKey', mediaType: 'image', url: 'https://cdn.example.test/c.jpg' },
            { role: 'videoKey', mediaType: 'video', url: 'https://cdn.example.test/v.mp4' },
          ],
          params: { prompt: 'nhảy múa' },
        }),
      );
      assert.match(html, /<video[^>]*src="https:\/\/cdn\.example\.test\/v\.mp4"/);
      assert.match(html, /data-testid="task-prompt"/);
      assert.match(html, /nhảy múa/);
      assert.match(html, /href="\/motion-control"/);
    });

    it('nút tạo tác vụ khác dẫn tới đúng công cụ', async () => {
      const html = await renderToString(createApp());
      assert.match(html, /data-testid="create-similar-link"/);
      assert.match(html, /href="\/body-retouch"/);
    });

    it('chưa đăng nhập và lỗi tải Task', async () => {
      const unauth = await renderToString(createApp({ isUnauthenticated: true }));
      assert.match(unauth, /data-testid="result-unauthenticated"/);
      const err = await renderToString(createApp({ taskErrorVi: 'Lỗi thử nghiệm' }));
      assert.match(err, /data-testid="task-error-state"/);
      assert.match(err, /Lỗi thử nghiệm/);
    });
  });

  describe('4. Component TaskResultViewer — logic làm mới link ký, chia sẻ', () => {
    let viewer;
    let stubDir;

    before(async () => {
      stubDir = fs.mkdtempSync(path.join(webRoot, 'test', '.tmp-viewer-setup-'));
      const stubs = {
        '~/components/BeforeAfterSplitSlider.vue': 'export default {};',
        '~/composables/useApiClient': 'export const useApiClient = () => ({ client: globalThis.__viewerTest.client });',
        '~/utils/api-client': `export { resolveApiErrorMessageVi, getReasonCodeMessageVi } from ${JSON.stringify(pathToFileURL(path.join(webRoot, 'utils/api-client.ts')).href)};`,
        '~/utils/task-format': `export { getPipelineLabelVi, isTaskRetentionExpired } from ${JSON.stringify(pathToFileURL(path.join(webRoot, 'utils/task-format.ts')).href)};`,
      };
      viewer = await loadSetup('components/TaskResultViewer.vue', stubs, stubDir);
    });

    after(() => {
      if (stubDir) fs.rmSync(stubDir, { recursive: true, force: true });
      delete globalThis.__viewerTest;
    });

    function init(task = MOCK_BODY_RETOUCH_TASK_SUCCEEDED) {
      let resultCalls = 0;
      const emitted = [];
      globalThis.__viewerTest = {
        client: {
          getTaskResult: async () => {
            resultCalls += 1;
            return { ...MOCK_BODY_RETOUCH_RESULT_RESPONSE, resultUrl: `https://cdn.example.test/out_${resultCalls}.png` };
          },
          shareTask: async () => ({
            token: 'share_abc123',
            shareUrl: 'https://flowvis.ai/share/share_abc123',
            expiresAt: '2026-11-16T12:00:00.000Z',
          }),
          revokeTaskShare: async () => ({ revoked: true }),
        },
      };
      const props = { task, submitting: false, polling: false, pollIntervalMs: 2500, beforeLabelVi: '', afterLabelVi: '', outputFormatVi: '', showRetry: true };
      const instance = viewer.setup(props, { emit: (...a) => emitted.push(a), expose() {} });
      return { instance, emitted, getResultCalls: () => resultCalls };
    }

    it('tự tải kết quả khi task succeeded và phát sự kiện result', async () => {
      const { instance, emitted, getResultCalls } = init();
      await new Promise((r) => setTimeout(r, 10));
      assert.equal(getResultCalls(), 1);
      assert.match(instance.result.value.resultUrl, /out_1\.png$/);
      assert.ok(emitted.some(([name]) => name === 'result'));
    });

    it('handleMediaError lấy link mới tối đa 1 lần rồi mới báo lỗi', async () => {
      const { instance, getResultCalls } = init();
      await new Promise((r) => setTimeout(r, 10));
      instance.handleMediaError();
      await new Promise((r) => setTimeout(r, 10));
      assert.equal(getResultCalls(), 2);
      assert.equal(instance.mediaFailed.value, false);
      instance.handleMediaError();
      await new Promise((r) => setTimeout(r, 10));
      assert.equal(getResultCalls(), 2);
      assert.equal(instance.mediaFailed.value, true);
    });

    it('handleCopyLink tạo liên kết chia sẻ công khai, không lộ sourceUrl', async () => {
      const { instance } = init();
      await instance.handleCopyLink();
      assert.ok(instance.shareData.value);
      assert.equal('sourceUrl' in instance.shareData.value, false);
      assert.match(instance.shareData.value.shareUrl, /\/share\/share_abc123$/);
      await instance.handleRevokeShare();
      assert.equal(instance.shareData.value, null);
    });

    it('mã nguồn: tải về đặt tên flowvis-<pipeline>-<id>, MP4 cho video', () => {
      const raw = read('components/TaskResultViewer.vue');
      assert.match(raw, /flowvis-\$\{localTask\.value\.pipeline\}-\$\{localTask\.value\.id\.slice\(0, 8\)\}\$\{ext\}/);
      assert.match(raw, /'\.mp4'/);
    });

    it('SSR: chế độ embedded bỏ card ở giữa, truyền surface="recessed" và giữ tiêu đề đơn + badge trạng thái', async () => {
      const { descriptor } = parse(read('components/TaskResultViewer.vue'), { filename: 'TaskResultViewer.vue' });
      const compiled = compileTemplate({
        id: 'test-task-result-viewer-ssr',
        filename: 'components/TaskResultViewer.vue',
        source: descriptor.template.content,
        ssr: true,
        ssrCssVars: [],
      });
      assert.equal(compiled.errors.length, 0);

      const tmpFile = path.join(webRoot, 'test', `.tmp-viewer-ssr-${Date.now()}.mjs`);
      fs.writeFileSync(tmpFile, compiled.code, 'utf8');
      let viewerRender;
      try {
        viewerRender = (await import(pathToFileURL(tmpFile).href)).ssrRender;
      } finally {
        fs.rmSync(tmpFile, { force: true });
      }

      const renderViewer = async ({ embedded = false, withSlot = false } = {}) => {
        const wrapper = createSSRApp({
          setup() {
            return {};
          },
          render() {
            const ViewerShell = {
              ssrRender: viewerRender,
              setup() {
                return {
                  embedded,
                  isWorking: false,
                  isSucceeded: true,
                  isFailed: false,
                  isQueued: false,
                  isVideo: false,
                  isExpired: false,
                  mediaFailed: false,
                  resultErrorVi: null,
                  isLoadingResult: false,
                  submitting: false,
                  localTask: MOCK_BODY_RETOUCH_TASK_SUCCEEDED,
                  result: MOCK_BODY_RETOUCH_RESULT_RESPONSE,
                  pipelineLabelVi: 'Chỉnh sửa vóc dáng',
                  failureMessageVi: '',
                  showRetry: true,
                  sliderPercent: 50,
                  isDownloading: false,
                  isSharing: false,
                  isRevoking: false,
                  shareData: null,
                  actionErrorVi: null,
                  downloadErrorVi: null,
                  shareErrorVi: null,
                  toastVi: null,
                  beforeLabelVi: '',
                  afterLabelVi: '',
                  outputFormatVi: '',
                  isCancelling: false,
                  handleCancel: () => {},
                  handleRefreshResult: () => {},
                  handleMediaError: () => {},
                  handleDownload: () => {},
                  handleCopyLink: () => {},
                  handleRevokeShare: () => {},
                  emit: () => {},
                };
              },
            };
            return h(
              ViewerShell,
              null,
              withSlot ? { 'header-title': () => h('h2', { 'data-testid': 'custom-result-heading' }, 'Kết quả') } : {},
            );
          },
        });
        wrapper.component('Icon', { props: ['name'], ssrRender: (_c, push) => push('<i></i>') });
        wrapper.component('NuxtLink', { props: ['to'], ssrRender: (_c, push) => push('<a></a>') });
        wrapper.component('BeforeAfterSplitSlider', {
          props: ['resultUrl', 'sourceUrl', 'alt', 'surface'],
          ssrRender: (ctx, push) =>
            push(`<div data-testid="mock-slider" data-surface="${ctx.surface || ''}"></div>`),
        });
        return renderToString(wrapper);
      };

      const standaloneHtml = await renderViewer({ embedded: false });
      assert.match(standaloneHtml, /<div class="rounded-xl border border-cyber-border bg-cyber-bg\/70 p-4" data-testid="task-result-viewer"/);
      assert.match(standaloneHtml, /So sánh Trước \/ Sau AI/);
      assert.match(standaloneHtml, /data-surface="card"/);

      const embeddedHtml = await renderViewer({ embedded: true, withSlot: true });
      assert.match(embeddedHtml, /<div class="" data-testid="task-result-viewer"/);
      assert.doesNotMatch(embeddedHtml, /So sánh Trước \/ Sau AI/);
      assert.match(embeddedHtml, /data-testid="custom-result-heading"/);
      assert.match(embeddedHtml, /data-testid="succeeded-status-badge"/);
      assert.match(embeddedHtml, /data-surface="recessed"/);
    });
  });

  describe('5. Ranh giới thiết kế Slate Cyber, vùng chạm >= 48px và không emoji UTF-8', () => {
    it('BeforeAfterSplitSlider, TaskResultViewer và pages/tasks/[id].vue tuân thủ thiết kế', () => {
      const sliderRaw = read('components/BeforeAfterSplitSlider.vue');
      const viewerRaw = read('components/TaskResultViewer.vue');
      const pageRaw = read('pages/tasks/[id].vue');

      for (const src of [sliderRaw, viewerRaw, pageRaw]) {
        assert.match(src, /bg-cyber-/);
        assert.match(src, /border-cyber-/);
        assert.match(src, /text-cyber-/);
        assert.match(src, /touch-target/);
      }
      assert.match(viewerRaw, /min-h-\[48px\]/);
      assert.match(pageRaw, /min-h-\[48px\]/);
      assert.match(pageRaw, /<TaskResultViewer[\s\S]*embedded/);
      assert.match(sliderRaw, /surface === 'recessed' \? 'bg-cyber-bg\/70' : 'bg-cyber-surface\/90'/);

      assert.match(sliderRaw, /h-9 w-9/);
      assert.match(sliderRaw, /lucide:arrow-left-right/);

      const emojiRegex =
        /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
      for (const [name, src] of [
        ['BeforeAfterSplitSlider.vue', sliderRaw],
        ['TaskResultViewer.vue', viewerRaw],
        ['pages/tasks/[id].vue', pageRaw],
      ]) {
        assert.equal(emojiRegex.test(src), false, `${name} không được chứa emoji UTF-8`);
      }
    });
  });
});
