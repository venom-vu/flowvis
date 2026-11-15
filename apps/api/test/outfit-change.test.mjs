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
    assert.equal(cfg.defaultRunMode, 'ai-app');
    assert.equal(cfg.workflowEnvVar, 'RUNNINGHUB_WORKFLOW_OUTFIT_CHANGE');
    assert.equal(cfg.requiredAtStartup, undefined);
    assert.equal(cfg.referenceInputKey, 'modelKey');
  });

  it('giá 100 credit mỗi lượt', () => {
    assert.equal(PRICING_CONFIG.pipelines.outfitChangeCredits, 100);
  });
});
