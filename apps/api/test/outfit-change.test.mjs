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

describe('person_replace: cấu hình pipeline RunningHub', () => {
  const cfg = PIPELINE_CONFIGS.person_replace;

  it('ánh xạ node ảnh gốc (22), nhân vật mới (35) và độ phân giải tối đa 1280 (49)', () => {
    assert.deepEqual(cfg.inputs, [
      { inputKey: 'sceneKey', nodeId: '22', fieldName: 'image' },
      { inputKey: 'personKey', nodeId: '35', fieldName: 'image' },
    ]);
    assert.deepEqual(cfg.fixedNodes, [{ nodeId: '49', fieldName: 'value', fieldValue: '1280' }]);
    assert.equal(cfg.workflowEnvVar, 'RUNNINGHUB_WORKFLOW_PERSON_REPLACE');
    assert.equal(PRICING_CONFIG.pipelines.personReplaceCredits, 100);
  });
});
