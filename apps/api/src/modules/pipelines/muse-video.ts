import {
  MUSE_VIDEO_ASPECT_RATIOS,
  MUSE_VIDEO_DURATION_SECONDS,
  MUSE_VIDEO_MAX_IMAGES,
  MUSE_VIDEO_RESOLUTION,
} from '@flowvis/contracts';

/** Model RunningHub mặc định của Muse Video; ghi đè bằng RUNNINGHUB_MUSE_VIDEO_MODEL. */
export const MUSE_VIDEO_DEFAULT_MODEL = 'meta/muse-video/economy';

/** Khóa input của ảnh tham chiếu thứ `i` (0-based) trong tasks.input_keys. */
export function museVideoImageKey(i: number): string {
  return `imageKey${i}`;
}

const ALL_IMAGE_KEYS: readonly string[] = Array.from({ length: MUSE_VIDEO_MAX_IMAGES }, (_, i) => museVideoImageKey(i));

/** Khóa input cần tải từ R2 (`imageKey0..8` có mặt trong inputKeys), theo đúng thứ tự số. */
export function museVideoInputKeys(_params: Record<string, unknown>, inputKeys: Record<string, string>): string[] {
  return ALL_IMAGE_KEYS.filter((k) => typeof inputKeys[k] === 'string' && inputKeys[k]);
}

/**
 * Dựng đường dẫn và JSON phẳng cho API model; trả null khi tasks.params không hợp lệ hoặc thiếu URL ảnh.
 * `params.imageCount` (ghi lúc tạo Task) quyết định số ảnh phải có: thiếu bất kỳ URL nào thì không gửi.
 */
export function buildMuseVideoRequest(
  model: string,
  params: Record<string, unknown>,
  imageUrls: Record<string, string>,
): { path: string; payload: Record<string, unknown> } | null {
  const { prompt, aspectRatio, imageCount } = params;
  if (typeof prompt !== 'string' || prompt.trim().length === 0) return null;
  if (aspectRatio !== undefined && !(MUSE_VIDEO_ASPECT_RATIOS as readonly unknown[]).includes(aspectRatio)) return null;
  const count =
    typeof imageCount === 'number' && Number.isInteger(imageCount)
      ? imageCount
      : ALL_IMAGE_KEYS.filter((k) => imageUrls[k]).length;
  if (count < 1 || count > MUSE_VIDEO_MAX_IMAGES) return null;
  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    const url = imageUrls[museVideoImageKey(i)];
    if (typeof url !== 'string' || !url) return null;
    urls.push(url);
  }
  const payload: Record<string, unknown> = {
    prompt,
    imageUrls: urls,
    ...(typeof aspectRatio === 'string' ? { aspectRatio } : {}),
    duration: String(MUSE_VIDEO_DURATION_SECONDS),
    resolution: MUSE_VIDEO_RESOLUTION,
    nsfwCheck: false,
  };
  // Tên model có dấu `/` (vd. meta/muse-video/economy): giữ nguyên dấu `/`, chỉ encode từng đoạn.
  const path = `/openapi/v2/${model.split('/').filter(Boolean).map(encodeURIComponent).join('/')}`;
  return { path, payload };
}
