import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PIPELINE_CONFIGS } from '../dist/modules/pipelines/pipeline-config.js';
import { PRICING_CONFIG } from '../dist/modules/wallet/tier.js';

describe('outfit_change: cấu hình pipeline RunningHub', () => {
  const cfg = PIPELINE_CONFIGS.outfit_change;

  it('ánh xạ đúng node ảnh người mẫu (107), ảnh trang phục (285) và prompt cố định (223)', () => {
    assert.deepEqual(cfg.inputs, [
      { inputKey: 'modelKey', nodeId: '107', fieldName: 'image' },
      { inputKey: 'clothingKey', nodeId: '285', fieldName: 'image' },
    ]);
    assert.deepEqual(cfg.fixedNodes, [
      { nodeId: '223', fieldName: 'value', fieldValue: '让图一的人物穿上图二的衣服' },
    ]);
  });

  it('dùng ai-app, không bắt buộc cấu hình khi khởi động, ảnh kết quả theo kích thước ảnh người mẫu', () => {
    assert.equal(cfg.runMode, 'ai-app');
    assert.equal(cfg.workflowEnvVar, 'RUNNINGHUB_WORKFLOW_OUTFIT_CHANGE');
    assert.equal(cfg.requiredAtStartup, undefined);
    assert.equal(cfg.referenceInputKey, 'modelKey');
  });

  it('giá 100 credit mỗi lượt', () => {
    assert.equal(PRICING_CONFIG.pipelines.outfitChangeCredits, 100);
  });
});

describe('motion_control_v2: cấu hình pipeline RunningHub', () => {
  const cfg = PIPELINE_CONFIGS.motion_control_v2;

  it('ánh xạ node ảnh nhân vật (299), video (275) và các node cố định theo curl mẫu', () => {
    assert.deepEqual(cfg.inputs, [
      { inputKey: 'characterKey', nodeId: '299', fieldName: 'image' },
      { inputKey: 'videoKey', nodeId: '275', fieldName: 'video' },
    ]);
    assert.equal(cfg.params, undefined);
    assert.deepEqual(
      cfg.fixedNodes.map((n) => [n.nodeId, n.fieldName, n.fieldValue.slice(0, 20)]),
      [
        ['264', 'value', '30'],
        ['300', 'value', '1200'],
        ['316', 'value', '576'],
        ['317', 'value', '1024'],
        ['293', 'select', '1'],
        ['265', 'value', '1.0000000000000002'],
        ['266', 'value', '0.3500000000000001'],
        ['271', 'value', 'false'],
        ['356', 'text', '完整的手指，手指清晰，最佳质量, photoreal'.slice(0, 20)],
        ['357', 'text', '提示词优化说明：\nanimate迁移光脚做踮脚'.slice(0, 20)],
      ],
    );
    assert.equal(cfg.workflowEnvVar, 'RUNNINGHUB_WORKFLOW_MOTION_V2');
    assert.equal(typeof cfg.prepare, 'function');
  });
});
