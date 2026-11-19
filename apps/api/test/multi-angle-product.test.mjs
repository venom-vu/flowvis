import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MULTI_ANGLE_PRODUCT_PRICE,
  MultiAngleProductCreateRequestSchema,
  TASK_PIPELINES,
} from '@flowvis/contracts';
import { PIPELINE_CONFIGS } from '../dist/modules/pipelines/pipeline-config.js';
import { PipelinesService } from '../dist/modules/pipelines/pipelines.service.js';
import { PRICING_CONFIG } from '../dist/modules/wallet/tier.js';
import { TasksService } from '../dist/modules/tasks/tasks.service.js';

const key = (n) => `in/11111111-1111-4111-8111-111111111111/${String(n).padStart(8, '0')}-2222-4222-8222-222222222222`;
const [K1, K2, K3] = [key(1), key(2), key(3)];
const ok = { productKey1: K1, productKey2: K2, productKey3: K3 };

describe('Tạo sản phẩm đa góc: giá và hợp đồng', () => {
  it('giá cố định 200 credit, khớp cấu hình server', () => {
    assert.equal(MULTI_ANGLE_PRODUCT_PRICE, 200);
    assert.equal(PRICING_CONFIG.pipelines.multiAngleProductCredits, 200);
    assert.ok(TASK_PIPELINES.includes('multi_angle_product'));
  });

  it('schema: nhận đủ 3 khóa khác nhau', () => {
    assert.ok(MultiAngleProductCreateRequestSchema.safeParse(ok).success);
  });

  it('schema: từ chối thiếu ảnh, khóa trùng, khóa sai định dạng và trường thừa', () => {
    assert.ok(!MultiAngleProductCreateRequestSchema.safeParse({ productKey1: K1, productKey2: K2 }).success);
    assert.ok(!MultiAngleProductCreateRequestSchema.safeParse({}).success);
    assert.ok(!MultiAngleProductCreateRequestSchema.safeParse({ ...ok, productKey3: K1 }).success);
    assert.ok(!MultiAngleProductCreateRequestSchema.safeParse({ ...ok, productKey2: K1, productKey3: K1 }).success);
    assert.ok(!MultiAngleProductCreateRequestSchema.safeParse({ ...ok, productKey1: 'tmp/x' }).success);
    assert.ok(!MultiAngleProductCreateRequestSchema.safeParse({ ...ok, price: 1 }).success);
  });
});

describe('Tạo sản phẩm đa góc: cấu hình pipeline RunningHub', () => {
  const cfg = PIPELINE_CONFIGS.multi_angle_product;

  it('ánh xạ ảnh 1/2/3 vào node 27/28/7 theo đúng thứ tự, field image', () => {
    assert.deepEqual(cfg.inputs, [
      { inputKey: 'productKey1', nodeId: '27', fieldName: 'image' },
      { inputKey: 'productKey2', nodeId: '28', fieldName: 'image' },
      { inputKey: 'productKey3', nodeId: '7', fieldName: 'image' },
    ]);
    assert.equal(cfg.params, undefined);
    assert.equal(cfg.fixedNodes, undefined);
  });

  it('ai-app, không bắt buộc lúc khởi động, không có referenceInputKey, biến môi trường riêng', () => {
    assert.equal(cfg.runMode, 'ai-app');
    assert.equal(cfg.requiredAtStartup, undefined);
    assert.equal(cfg.referenceInputKey, undefined);
    assert.equal(cfg.model, undefined);
    assert.equal(cfg.workflowEnvVar, 'RUNNINGHUB_WORKFLOW_MULTI_ANGLE_PRODUCT');
    assert.equal(cfg.instanceEnvVar, 'RUNNINGHUB_INSTANCE_MULTI_ANGLE_PRODUCT');
  });

  it('workflow mặc định 2030848699949125633 khi biến môi trường trống', () => {
    const saved = process.env.RUNNINGHUB_WORKFLOW_MULTI_ANGLE_PRODUCT;
    try {
      delete process.env.RUNNINGHUB_WORKFLOW_MULTI_ANGLE_PRODUCT;
      const svc = new PipelinesService();
      assert.equal(svc.getWorkflowId(cfg), '2030848699949125633');
      process.env.RUNNINGHUB_WORKFLOW_MULTI_ANGLE_PRODUCT = '123';
      assert.equal(svc.getWorkflowId(cfg), '123');
    } finally {
      if (saved === undefined) delete process.env.RUNNINGHUB_WORKFLOW_MULTI_ANGLE_PRODUCT;
      else process.env.RUNNINGHUB_WORKFLOW_MULTI_ANGLE_PRODUCT = saved;
    }
  });
});

describe('Tạo sản phẩm đa góc: TasksService.createMultiAngleProduct', () => {
  function makeService() {
    const specs = [];
    const svc = Object.create(TasksService.prototype);
    svc.createPipelineTask = async (_userId, spec) => {
      specs.push(spec);
      return { id: 't', pipeline: spec.pipeline, creditCost: spec.amount };
    };
    return { svc, specs };
  }

  it('hợp lệ: giá 200 do server quyết định, giữ khóa productKey1..3, kiểm tra sở hữu trước HOLD', async () => {
    const { svc, specs } = makeService();
    const res = await svc.createMultiAngleProduct('u1', ok);
    assert.equal(res.creditCost, 200);
    assert.equal(specs.length, 1);
    assert.equal(specs[0].pipeline, 'multi_angle_product');
    assert.equal(specs[0].amount, 200);
    assert.deepEqual(specs[0].inputKeys, { productKey1: K1, productKey2: K2, productKey3: K3 });
    // Không đánh dấu keysVerified: createPipelineTask kiểm tra sở hữu/confirm trước khi HOLD.
    assert.ok(!specs[0].keysVerified);
  });

  it('khóa trùng: VALIDATION_FAILED, không HOLD', async () => {
    const { svc, specs } = makeService();
    await assert.rejects(
      () => svc.createMultiAngleProduct('u1', { ...ok, productKey3: K2 }),
      (e) => e.getResponse().code === 'VALIDATION_FAILED',
    );
    assert.equal(specs.length, 0);
  });
});
