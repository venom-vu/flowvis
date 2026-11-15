import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { PIPELINE_CONFIGS } from '../dist/modules/pipelines/pipeline-config.js';
import { PipelinesService } from '../dist/modules/pipelines/pipelines.service.js';
import { estimateCostUsd, INSTANCE_USD_PER_HOUR } from '../dist/modules/tasks/instance-pricing.js';

const VARS = Object.values(PIPELINE_CONFIGS).map((c) => c.instanceEnvVar);
const saved = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
afterEach(() => {
  for (const k of VARS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('Giá máy RunningHub và ước tính chi phí', () => {
  it('bảng giá giờ: default 0.88, plus 1.18, ultra 2.35 USD', () => {
    assert.deepEqual({ ...INSTANCE_USD_PER_HOUR }, { default: 0.88, plus: 1.18, ultra: 2.35 });
  });

  it('estimateCostUsd: 63 giây máy default xấp xỉ 0.0154 USD (RunningHub báo 0.016)', () => {
    const v = estimateCostUsd('default', 63);
    assert.ok(Math.abs(v - (63 * 0.88) / 3600) < 1e-12);
    assert.ok(Math.abs(v - 0.016) < 0.001);
    assert.ok(Math.abs(estimateCostUsd('ultra', 3600) - 2.35) < 1e-12);
  });

  it('estimateCostUsd: loại máy lạ hoặc số giây không hợp lệ thì không ước tính', () => {
    assert.equal(estimateCostUsd('lite', 10), undefined);
    assert.equal(estimateCostUsd(null, 10), undefined);
    assert.equal(estimateCostUsd('default', 0), undefined);
    assert.equal(estimateCostUsd('default', -3), undefined);
    assert.equal(estimateCostUsd('default', undefined), undefined);
  });

  it('getInstanceType: mặc định default, đọc biến riêng từng pipeline, giá trị lạ ném lỗi nêu tên biến', () => {
    const svc = new PipelinesService();
    for (const k of VARS) delete process.env[k];
    for (const c of Object.values(PIPELINE_CONFIGS)) assert.equal(svc.getInstanceType(c), 'default');
    assert.deepEqual(
      Object.values(PIPELINE_CONFIGS).map((c) => c.instanceEnvVar).sort(),
      [
        'RUNNINGHUB_INSTANCE_BODY_RETOUCH',
        'RUNNINGHUB_INSTANCE_FACE_SWAP',
        'RUNNINGHUB_INSTANCE_MOTION_CONTROL',
        'RUNNINGHUB_INSTANCE_OUTFIT_CHANGE',
        'RUNNINGHUB_INSTANCE_PERSON_REPLACE',
      ],
    );
    process.env.RUNNINGHUB_INSTANCE_MOTION_CONTROL = ' Plus ';
    assert.equal(svc.getInstanceType(PIPELINE_CONFIGS.motion_control), 'plus');
    assert.equal(svc.getInstanceType(PIPELINE_CONFIGS.face_swap), 'default');
    process.env.RUNNINGHUB_INSTANCE_FACE_SWAP = 'lite';
    assert.throws(() => svc.getInstanceType(PIPELINE_CONFIGS.face_swap), /RUNNINGHUB_INSTANCE_FACE_SWAP/);
  });
});
