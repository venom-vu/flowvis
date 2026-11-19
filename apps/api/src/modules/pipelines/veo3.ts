import { VEO3_DURATION_SECONDS } from '@flowvis/contracts';

/** Model RunningHub mặc định của Veo 3; ghi đè bằng RUNNINGHUB_VEO3_MODEL. */
export const VEO3_DEFAULT_MODEL = 'rhart-video-v3.1-pro';

const ENDPOINTS: Readonly<Record<string, string>> = {
  text_to_video: 'text-to-video',
  image_to_video: 'image-to-video',
  frames_to_video: 'start-end-to-video',
};

/** Khóa input (tasks.input_keys) -> tên trường URL ảnh của API model, theo từng chế độ. */
const IMAGE_FIELDS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  text_to_video: {},
  image_to_video: { imageKey: 'imageUrl' },
  frames_to_video: { firstFrameKey: 'firstFrameUrl', lastFrameKey: 'lastFrameUrl' },
};

/** Danh sách khóa input cần tải từ R2 cho một Task Veo 3 (chỉ những khóa có mặt trong inputKeys). */
export function veo3InputKeys(params: Record<string, unknown>, inputKeys: Record<string, string>): string[] {
  const fields = IMAGE_FIELDS[String(params.mode)] ?? {};
  return Object.keys(fields).filter((k) => typeof inputKeys[k] === 'string' && inputKeys[k]);
}

/** Dựng đường dẫn và JSON phẳng cho API model; trả null khi tasks.params không hợp lệ. */
export function buildVeo3Request(
  model: string,
  params: Record<string, unknown>,
  imageUrls: Record<string, string>,
): { path: string; payload: Record<string, unknown> } | null {
  const mode = String(params.mode);
  const endpoint = ENDPOINTS[mode];
  const { prompt, aspectRatio, resolution } = params;
  if (!endpoint || typeof prompt !== 'string' || typeof aspectRatio !== 'string' || typeof resolution !== 'string') {
    return null;
  }
  const fields = IMAGE_FIELDS[mode];
  const payload: Record<string, unknown> = {
    prompt,
    aspectRatio,
    resolution,
    duration: String(VEO3_DURATION_SECONDS),
  };
  for (const [inputKey, field] of Object.entries(fields)) {
    const url = imageUrls[inputKey];
    if (url) payload[field] = url;
  }
  // Chế độ cần ảnh bắt buộc (ảnh đầu / ảnh duy nhất) mà thiếu URL thì không gửi.
  if (mode === 'image_to_video' && !payload.imageUrl) return null;
  if (mode === 'frames_to_video' && !payload.firstFrameUrl) return null;
  return { path: `/openapi/v2/${encodeURIComponent(model)}/${endpoint}`, payload };
}
