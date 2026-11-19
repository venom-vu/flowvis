import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import {
  Veo3CreateRequestSchema,
  VEO3_PRICING,
  veo3Price,
} from '@flowvis/contracts';
import { PIPELINE_CONFIGS } from '../dist/modules/pipelines/pipeline-config.js';
import { buildVeo3Request, veo3InputKeys } from '../dist/modules/pipelines/veo3.js';
import { RunningHubOpenApiAdapter } from '../dist/modules/tasks/runninghub-openapi.adapter.js';
import { PRICING_CONFIG } from '../dist/modules/wallet/tier.js';

const KEY = 'in/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222';
const KEY2 = 'in/11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333';
const PNG = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(16)]);
const signal = () => new AbortController().signal;

describe('Veo 3: giá và hợp đồng', () => {
  it('giá server khớp hợp đồng theo độ phân giải', () => {
    assert.deepEqual({ ...VEO3_PRICING }, { '720p': 500, '1080p': 700, '4k': 950 });
    assert.equal(veo3Price('1080p'), 700);
    const p = PRICING_CONFIG.pipelines;
    assert.deepEqual([p.veo3Credits720p, p.veo3Credits1080p, p.veo3Credits4k], [500, 700, 950]);
  });

  it('request đổi trường theo chế độ và từ chối trường thừa', () => {
    const base = { prompt: 'Một lâu đài bay trên mây', aspectRatio: '16:9', resolution: '720p' };
    assert.ok(Veo3CreateRequestSchema.safeParse({ ...base, mode: 'text_to_video' }).success);
    assert.ok(!Veo3CreateRequestSchema.safeParse({ ...base, mode: 'text_to_video', imageKey: KEY }).success);
    assert.ok(!Veo3CreateRequestSchema.safeParse({ ...base, mode: 'image_to_video' }).success);
    assert.ok(Veo3CreateRequestSchema.safeParse({ ...base, mode: 'image_to_video', imageKey: KEY }).success);
    assert.ok(!Veo3CreateRequestSchema.safeParse({ ...base, mode: 'frames_to_video', lastFrameKey: KEY }).success);
    assert.ok(Veo3CreateRequestSchema.safeParse({ ...base, mode: 'frames_to_video', firstFrameKey: KEY }).success);
    assert.ok(Veo3CreateRequestSchema.safeParse({ ...base, mode: 'frames_to_video', firstFrameKey: KEY, lastFrameKey: KEY2 }).success);
    // Khung đầu và cuối trùng nhau được phép (video loop).
    assert.ok(Veo3CreateRequestSchema.safeParse({ ...base, mode: 'frames_to_video', firstFrameKey: KEY, lastFrameKey: KEY }).success);
  });

  it('từ chối prompt quá ngắn, tỉ lệ và độ phân giải lạ', () => {
    const ok = { mode: 'text_to_video', prompt: 'mô tả hợp lệ', aspectRatio: '9:16', resolution: '4k' };
    assert.ok(Veo3CreateRequestSchema.safeParse(ok).success);
    assert.ok(!Veo3CreateRequestSchema.safeParse({ ...ok, prompt: 'abc' }).success);
    assert.ok(!Veo3CreateRequestSchema.safeParse({ ...ok, aspectRatio: '1:1' }).success);
    assert.ok(!Veo3CreateRequestSchema.safeParse({ ...ok, resolution: '8k' }).success);
  });
});

describe('Veo 3: dựng request RunningHub', () => {
  const common = { prompt: 'p'.repeat(10), aspectRatio: '9:16', resolution: '1080p' };

  it('cấu hình pipeline dùng chế độ model và không cần node', () => {
    const c = PIPELINE_CONFIGS.veo3;
    assert.equal(c.runMode, 'model');
    assert.deepEqual(c.inputs, []);
    assert.equal(c.defaultWorkflowId, 'rhart-video-v3.1-pro');
  });

  it('text-to-video không có ảnh', () => {
    const params = { ...common, mode: 'text_to_video' };
    assert.deepEqual(veo3InputKeys(params, {}), []);
    const r = buildVeo3Request('rhart-video-v3.1-pro', params, {});
    assert.equal(r.path, '/openapi/v2/rhart-video-v3.1-pro/text-to-video');
    assert.deepEqual(r.payload, { ...common, duration: '8' });
  });

  it('image-to-video dùng imageUrl', () => {
    const params = { ...common, mode: 'image_to_video' };
    assert.deepEqual(veo3InputKeys(params, { imageKey: KEY }), ['imageKey']);
    const r = buildVeo3Request('m', params, { imageKey: 'https://x/a.png' });
    assert.equal(r.path, '/openapi/v2/m/image-to-video');
    assert.equal(r.payload.imageUrl, 'https://x/a.png');
    assert.equal(buildVeo3Request('m', params, {}), null);
  });

  it('frames-to-video dùng start-end-to-video, ảnh cuối tùy chọn', () => {
    const params = { ...common, mode: 'frames_to_video' };
    assert.deepEqual(veo3InputKeys(params, { firstFrameKey: KEY }), ['firstFrameKey']);
    assert.deepEqual(veo3InputKeys(params, { firstFrameKey: KEY, lastFrameKey: KEY2 }), ['firstFrameKey', 'lastFrameKey']);
    const only = buildVeo3Request('m', params, { firstFrameKey: 'https://x/1.png' });
    assert.equal(only.path, '/openapi/v2/m/start-end-to-video');
    assert.equal(only.payload.firstFrameUrl, 'https://x/1.png');
    assert.ok(!('lastFrameUrl' in only.payload));
    const both = buildVeo3Request('m', params, { firstFrameKey: 'https://x/1.png', lastFrameKey: 'https://x/2.png' });
    assert.equal(both.payload.lastFrameUrl, 'https://x/2.png');
    assert.equal(buildVeo3Request('m', params, { lastFrameKey: 'https://x/2.png' }), null);
  });

  it('trả null khi tham số hỏng', () => {
    assert.equal(buildVeo3Request('m', { mode: 'nope', ...common }, {}), null);
    assert.equal(buildVeo3Request('m', { mode: 'text_to_video', prompt: 1 }, {}), null);
  });
});

describe('Veo 3: adapter OpenAPI', () => {
  let server;
  let base;
  let next;
  const seen = [];
  before(async () => {
    server = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        seen.push({ url: req.url, headers: req.headers, body: Buffer.concat(chunks) });
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(next));
      });
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => new Promise((r) => server.close(r)));

  it('uploadMedia gọi media/upload/binary và trả download_url', async () => {
    seen.length = 0;
    next = { code: 0, message: 'success', data: { download_url: 'https://rh/x.png', fileName: 'openapi/x.png' } };
    const url = await new RunningHubOpenApiAdapter('k', base).uploadMedia(PNG, 'a', signal());
    assert.equal(url, 'https://rh/x.png');
    assert.equal(seen[0].url, '/openapi/v2/media/upload/binary');
    assert.equal(seen[0].headers.authorization, 'Bearer k');
  });

  it('uploadMedia ném RunningHubError khi bị từ chối', async () => {
    next = { code: 1, message: 'no' };
    await assert.rejects(() => new RunningHubAdapterFor().uploadMedia(PNG, 'a', signal()), /từ chối upload/);
  });

  it('submitModel gửi JSON phẳng tới đường dẫn model và trả taskId dạng chuỗi', async () => {
    seen.length = 0;
    next = { taskId: '2013508786110730241', status: 'RUNNING', errorCode: '', errorMessage: '' };
    const id = await new RunningHubOpenApiAdapter('k', base).submitModel(
      '/openapi/v2/rhart-video-v3.1-pro/text-to-video',
      { prompt: 'hello world', aspectRatio: '16:9', resolution: '720p', duration: '8' },
      signal(),
    );
    assert.equal(id, '2013508786110730241');
    assert.equal(seen[0].url, '/openapi/v2/rhart-video-v3.1-pro/text-to-video');
    const body = JSON.parse(seen[0].body.toString());
    assert.deepEqual(body, { prompt: 'hello world', aspectRatio: '16:9', resolution: '720p', duration: '8' });
    assert.ok(!('nodeInfoList' in body));
  });

  it('submitModel ném lỗi khi RunningHub trả errorCode', async () => {
    next = { taskId: '', status: 'FAILED', errorCode: '999', errorMessage: 'bad' };
    await assert.rejects(() => new RunningHubOpenApiAdapter('k', base).submitModel('/x', {}, signal()), /từ chối task/);
  });

  function RunningHubAdapterFor() {
    return new RunningHubOpenApiAdapter('k', base);
  }
});

describe('Veo 3: cấu hình model do pipeline mang theo', () => {
  it('veo3 khai báo bộ dựng request; các pipeline node-based thì không', () => {
    const c = PIPELINE_CONFIGS.veo3;
    assert.equal(typeof c.model.inputKeys, 'function');
    assert.equal(typeof c.model.buildRequest, 'function');
    for (const [name, cfg] of Object.entries(PIPELINE_CONFIGS)) {
      if (name !== 'veo3') assert.equal(cfg.model, undefined, `${name} không được có model builder`);
    }
  });

  it('bộ dựng của cấu hình cho cùng kết quả với buildVeo3Request', () => {
    const params = { mode: 'image_to_video', prompt: 'một cảnh quay đẹp', aspectRatio: '16:9', resolution: '4k' };
    const urls = { imageKey: 'https://x/a.png' };
    assert.deepEqual(
      PIPELINE_CONFIGS.veo3.model.buildRequest('m', params, urls),
      buildVeo3Request('m', params, urls),
    );
  });
});
