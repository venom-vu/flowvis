import type { ReasonCode } from '@flowvis/contracts';
import type { RunningHubRunMode } from '../../ports/index.js';
import { VEO3_DEFAULT_MODEL, buildVeo3Request, veo3InputKeys } from './veo3.js';
import { MUSE_VIDEO_DEFAULT_MODEL, buildMuseVideoRequest, museVideoInputKeys } from './muse-video.js';
import { videoTrim, type PrepareContext } from '../tasks/video-trim.service.js';

export interface PipelineInputMapping {
  /** Khóa trong tasks.input_keys. */
  readonly inputKey: string;
  readonly nodeId: string;
  readonly fieldName: string;
}

export interface PipelineParamMapping {
  /** Khóa trong tasks.params. */
  readonly paramKey: string;
  readonly nodeId: string;
  readonly fieldName: string;
  /** Hệ số nhân cho giá trị số trước khi gửi (vd. intensity 1-10 -> strength LoRA). */
  readonly scale?: number;
  /** Giá trị dùng khi tasks.params thiếu khóa (Task tạo trước khi có tham số này). */
  readonly fallback?: string;
}

export interface ModelRequestBuilder {
  /** Khóa input (tasks.input_keys) cần tải từ R2 và upload lên RunningHub. */
  readonly inputKeys: (params: Record<string, unknown>, inputKeys: Record<string, string>) => string[];
  /** `imageUrls` ánh xạ khóa input -> URL RunningHub; trả null khi tasks.params không hợp lệ. */
  readonly buildRequest: (
    model: string,
    params: Record<string, unknown>,
    imageUrls: Record<string, string>,
  ) => { path: string; payload: Record<string, unknown> } | null;
}

export interface PipelineConfig {
  readonly pipeline: string;
  /** Tên biến môi trường chứa workflow ID RunningHub. */
  readonly workflowEnvVar: string;
  /** Tên biến môi trường chọn loại máy RunningHub (`default`/`plus`/`ultra`); trống = default. */
  readonly instanceEnvVar: string;
  /** Cách gọi RunningHub: `ai-app` hoặc `workflow` (cố định theo chức năng). */
  readonly runMode: RunningHubRunMode;
  readonly inputs: readonly PipelineInputMapping[];
  /** Tham số từ tasks.params truyền cho workflow (giá trị dạng chuỗi). */
  readonly params?: readonly PipelineParamMapping[];
  /** Node có giá trị cố định, luôn gửi kèm (vd. tắt lưu bản trung gian, tốc độ khung hình). */
  readonly fixedNodes?: readonly { readonly nodeId: string; readonly fieldName: string; readonly fieldValue: string }[];
  /** true: thiếu biến môi trường workflow thì api/worker không khởi động. */
  readonly requiredAtStartup?: boolean;
  /** Khóa trong tasks.input_keys của ảnh tham chiếu: ảnh kết quả phải cùng kích thước (sau xoay EXIF) với ảnh này. */
  readonly referenceInputKey?: string;
  /** Bước chuẩn bị tùy chọn (vd. cắt video); tự lấy input, trả bytes theo inputKey. Chạy trước cổng RunningHub, trong hạn prep_deadline_at. */
  readonly prepare?: (ctx: PrepareContext) => Promise<Record<string, Buffer>>;
  /** Chỉ dùng với `runMode: 'model'`: chọn ảnh cần tải và dựng request JSON phẳng của API model. */
  readonly model?: ModelRequestBuilder;
  /** ID dùng khi biến môi trường workflow trống (vd. tên model của API model chuẩn). */
  readonly defaultWorkflowId?: string;
  /** Hạn xử lý RunningHub (ms) tính từ lúc qua cổng; mặc định 180000. */
  readonly deadlineMs?: number;
}

export const PIPELINE_CONFIGS: Readonly<Record<string, PipelineConfig>> = {
  face_swap: {
    pipeline: 'face_swap',
    workflowEnvVar: 'RUNNINGHUB_WORKFLOW_FACESWAP',
    instanceEnvVar: 'RUNNINGHUB_INSTANCE_FACE_SWAP',
    runMode: 'ai-app',
    // [ASSUMPTION] AI App Face Swap có hai node ảnh, curl mẫu không ghi mô tả: giả định node 470 = ảnh đích (giữ bố cục, kích thước), node 475 = ảnh nguồn (khuôn mặt). Nếu kết quả bị ngược thì hoán đổi hai nodeId.
    inputs: [
      { inputKey: 'targetKey', nodeId: '470', fieldName: 'image' },
      { inputKey: 'sourceKey', nodeId: '475', fieldName: 'image' },
    ],
    referenceInputKey: 'targetKey',
  },
  outfit_change: {
    pipeline: 'outfit_change',
    workflowEnvVar: 'RUNNINGHUB_WORKFLOW_OUTFIT_CHANGE',
    instanceEnvVar: 'RUNNINGHUB_INSTANCE_OUTFIT_CHANGE',
    runMode: 'ai-app',
    // Không requiredAtStartup: môi trường chưa cấu hình vẫn khởi động; adapter unconfigured ném GPU_ERROR.
    // AI App Đổi trang phục (2012848202482978818): 107 = ảnh người mẫu, 285 = ảnh trang phục, 223 = prompt cố định.
    inputs: [
      { inputKey: 'modelKey', nodeId: '107', fieldName: 'image' },
      { inputKey: 'clothingKey', nodeId: '285', fieldName: 'image' },
    ],
    // Prompt gốc (tiếng Trung): "Cho nhân vật ở ảnh 1 mặc quần áo ở ảnh 2".
    fixedNodes: [{ nodeId: '223', fieldName: 'value', fieldValue: '让图一的人物穿上图二的衣服' }],
    referenceInputKey: 'modelKey',
  },
  person_replace: {
    pipeline: 'person_replace',
    workflowEnvVar: 'RUNNINGHUB_WORKFLOW_PERSON_REPLACE',
    instanceEnvVar: 'RUNNINGHUB_INSTANCE_PERSON_REPLACE',
    runMode: 'ai-app',
    // Không requiredAtStartup: môi trường chưa cấu hình vẫn khởi động; adapter unconfigured ném GPU_ERROR.
    // AI App Đổi người trong ảnh (1977229030422388737): 22 = ảnh gốc, 35 = nhân vật mới thay vào ảnh gốc, 49 = độ phân giải tối đa.
    // Không đặt referenceInputKey: workflow giới hạn cạnh dài 1280 nên kích thước kết quả có thể khác ảnh gốc.
    inputs: [
      { inputKey: 'sceneKey', nodeId: '22', fieldName: 'image' },
      { inputKey: 'personKey', nodeId: '35', fieldName: 'image' },
    ],
    fixedNodes: [{ nodeId: '49', fieldName: 'value', fieldValue: '1280' }],
  },
  multi_angle_product: {
    pipeline: 'multi_angle_product',
    workflowEnvVar: 'RUNNINGHUB_WORKFLOW_MULTI_ANGLE_PRODUCT',
    instanceEnvVar: 'RUNNINGHUB_INSTANCE_MULTI_ANGLE_PRODUCT',
    runMode: 'ai-app',
    // AI App Tạo sản phẩm đa góc (2030848699949125633): 27 = ảnh sản phẩm 1, 28 = ảnh sản phẩm 2, 7 = ảnh sản phẩm 3.
    // Không đặt referenceInputKey: ảnh kết quả là bố cục mới, kích thước không theo ảnh đầu vào nào.
    inputs: [
      { inputKey: 'productKey1', nodeId: '27', fieldName: 'image' },
      { inputKey: 'productKey2', nodeId: '28', fieldName: 'image' },
      { inputKey: 'productKey3', nodeId: '7', fieldName: 'image' },
    ],
    defaultWorkflowId: '2030848699949125633',
  },
  body_retouch: {
    pipeline: 'body_retouch',
    workflowEnvVar: 'RUNNINGHUB_WORKFLOW_BODY_RESHAPE',
    instanceEnvVar: 'RUNNINGHUB_INSTANCE_BODY_RETOUCH',
    runMode: 'ai-app',
    requiredAtStartup: true,
    // AI App nâng ngực (2095511080751996930): node 4 = LoadImage (ảnh), node 56 = strength_model của LoRA (intensity 1-10 x 0.1 -> 0.1-1.0; mặc định 5 -> 0.5).
    inputs: [{ inputKey: 'imageKey', nodeId: '4', fieldName: 'image' }],
    params: [{ paramKey: 'intensity', nodeId: '56', fieldName: 'strength_model', scale: 0.1 }],
    referenceInputKey: 'imageKey',
  },
  motion_control: {
    pipeline: 'motion_control',
    workflowEnvVar: 'RUNNINGHUB_WORKFLOW_MOTION',
    instanceEnvVar: 'RUNNINGHUB_INSTANCE_MOTION_CONTROL',
    runMode: 'ai-app',
    requiredAtStartup: true,
    // AI App Motion Control (2122377113419743233): node 30 = ảnh nhân vật, node 33 = video chuyển động. Không có tham số/node cố định.
    inputs: [
      { inputKey: 'characterKey', nodeId: '30', fieldName: 'image' },
      { inputKey: 'videoKey', nodeId: '33', fieldName: 'video' },
    ],
    deadlineMs: 360_000,
    prepare: (ctx) => videoTrim.prepare(ctx),
  },
  motion_control_v2: {
    pipeline: 'motion_control_v2',
    workflowEnvVar: 'RUNNINGHUB_WORKFLOW_MOTION_V2',
    instanceEnvVar: 'RUNNINGHUB_INSTANCE_MOTION_CONTROL_V2',
    runMode: 'ai-app',
    // Không requiredAtStartup: môi trường chưa cấu hình vẫn khởi động; adapter unconfigured ném GPU_ERROR.
    // AI App Motion Control v2 (2083697864529678338): 299 = ảnh nhân vật, 275 = video chuyển động (đã cắt).
    inputs: [
      { inputKey: 'characterKey', nodeId: '299', fieldName: 'image' },
      { inputKey: 'videoKey', nodeId: '275', fieldName: 'video' },
    ],
    // Node cố định theo curl mẫu: 264 = 30, 300 = 1200, 316/317 = rộng/cao 576x1024, 293 = select 1,
    // 265 = 1.0000000000000002, 266 = 0.3500000000000001, 271 = false, 356 = prompt chất lượng, 357 = ghi chú mặc định của workflow.
    fixedNodes: [
      { nodeId: '264', fieldName: 'value', fieldValue: '30' },
      { nodeId: '300', fieldName: 'value', fieldValue: '1200' },
      { nodeId: '316', fieldName: 'value', fieldValue: '576' },
      { nodeId: '317', fieldName: 'value', fieldValue: '1024' },
      { nodeId: '293', fieldName: 'select', fieldValue: '1' },
      { nodeId: '265', fieldName: 'value', fieldValue: '1.0000000000000002' },
      { nodeId: '266', fieldName: 'value', fieldValue: '0.3500000000000001' },
      { nodeId: '271', fieldName: 'value', fieldValue: 'false' },
      {
        nodeId: '356',
        fieldName: 'text',
        fieldValue:
          '完整的手指，手指清晰，最佳质量, photorealistic, 8k, ultra realistic skin, soft smooth delicate flawless skin, natural human skin texture, visible subtle skin pores, realistic subsurface',
      },
      {
        nodeId: '357',
        fieldName: 'text',
        fieldValue:
          '提示词优化说明：\nanimate迁移光脚做踮脚动作容易出现生成鞋跟，可以通过增加提示词”女人光着脚跳舞“来进行限制。\n参考视频中人物有美甲时容易导致生成视频的人物手指过长，可以通过增加提示词”戴着美甲的女人跳舞“来进行调整。\n防止裸舞时转身时出现红屁股：光屁股的裸体女人跳舞。\n更多提示词示范：女人拿着扇子跳舞/女人坐在凳子上跳舞等等（前提是参考图有对应物品，不然AI自动想象）\n\nQQ：160783994\n\n视频超分（视频分辨率放大两倍大概需要消耗20至35币）\nhttps://www.runninghub.ai/zh-cn/ai-detail/2089116231571095554\n动作迁移非会员版\nhttps://www.runninghub.ai/zh-cn/ai-detail/2111854957347942402',
      },
    ],
    deadlineMs: 360_000,
    prepare: (ctx) => videoTrim.prepare(ctx),
  },
  veo3: {
    pipeline: 'veo3',
    workflowEnvVar: 'RUNNINGHUB_VEO3_MODEL',
    instanceEnvVar: 'RUNNINGHUB_INSTANCE_VEO3',
    // API model chuẩn: JSON phẳng, ảnh truyền bằng URL (xem veo3.ts); danh sách input phụ thuộc chế độ nên để trống.
    runMode: 'model',
    inputs: [],
    defaultWorkflowId: VEO3_DEFAULT_MODEL,
    model: { inputKeys: veo3InputKeys, buildRequest: buildVeo3Request },
    deadlineMs: 600_000,
  },
  muse_video: {
    pipeline: 'muse_video',
    workflowEnvVar: 'RUNNINGHUB_MUSE_VIDEO_MODEL',
    instanceEnvVar: 'RUNNINGHUB_INSTANCE_MUSE_VIDEO',
    // API model chuẩn: JSON phẳng, 1-9 ảnh tham chiếu truyền bằng URL theo thứ tự imageKey0..8 (xem muse-video.ts).
    runMode: 'model',
    inputs: [],
    defaultWorkflowId: MUSE_VIDEO_DEFAULT_MODEL,
    model: { inputKeys: museVideoInputKeys, buildRequest: buildMuseVideoRequest },
    deadlineMs: 600_000,
  },
  motion_background: {
    pipeline: 'motion_background',
    workflowEnvVar: 'RUNNINGHUB_WORKFLOW_MOTION_BACKGROUND',
    instanceEnvVar: 'RUNNINGHUB_INSTANCE_MOTION_BACKGROUND',
    runMode: 'ai-app',
    // Không requiredAtStartup: môi trường chưa cấu hình vẫn khởi động; adapter unconfigured ném GPU_ERROR.
    // AI App Motion control nền video (2097276664149921793): 286 = ảnh, 274 = video (đã cắt). Không có tham số/node cố định.
    inputs: [
      { inputKey: 'characterKey', nodeId: '286', fieldName: 'image' },
      { inputKey: 'videoKey', nodeId: '274', fieldName: 'video' },
    ],
    deadlineMs: 360_000,
    prepare: (ctx) => videoTrim.prepare(ctx),
  },
};

/** Ánh xạ lỗi FAILED của RunningHub theo tiền tố (không phân biệt hoa thường). */
export const RH_FAILURE_PREFIX_MAP: ReadonlyArray<{ prefix: string; reason: ReasonCode }> = [
  { prefix: 'NO_FACE', reason: 'NO_FACE' },
  { prefix: 'NO_POSE', reason: 'NO_POSE' },
];

/** Từ khóa (chữ thường) cho lỗi hết tiền RunningHub. */
export const GPU_BUDGET_KEYWORDS: readonly string[] = [
  'insufficient',
  'not enough',
  'out of coins',
  'balance',
  'hết tiền',
];

/** Điền chuỗi lỗi thật ở Epic 6. */
export const RH_CONTENT_BLOCKED_PREFIXES: readonly string[] = [];

export function mapRunningHubFailure(errorMessage: string | undefined): ReasonCode {
  const msg = (errorMessage ?? '').trim();
  const upper = msg.toUpperCase();
  for (const { prefix, reason } of RH_FAILURE_PREFIX_MAP) {
    if (upper.startsWith(prefix)) return reason;
  }
  for (const p of RH_CONTENT_BLOCKED_PREFIXES) {
    if (upper.startsWith(p.toUpperCase())) return 'CONTENT_BLOCKED';
  }
  const lower = msg.toLowerCase();
  // Hết VRAM GPU ("insufficient VRAM") là lỗi workflow, không phải hết tiền tài khoản RunningHub.
  if (lower.includes('vram')) return 'GPU_ERROR';
  if (GPU_BUDGET_KEYWORDS.some((k) => lower.includes(k))) return 'GPU_BUDGET';
  return 'GPU_ERROR';
}
