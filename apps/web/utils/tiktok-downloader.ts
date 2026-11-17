// Tải video TikTok hoàn toàn ở trình duyệt qua API công khai của tikwm.com (không qua backend flowvis).
export const TIKWM_API_URL = 'https://www.tikwm.com/api/';

// Ngưỡng dung lượng để tránh tràn RAM khi gom Blob (đặc biệt trên điện thoại).
export const TIKTOK_MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;

export interface TikTokVideoInfo {
  id: string;
  title: string;
  author: string;
  durationSeconds: number;
  coverUrl: string;
  /** Link MP4 không watermark; ưu tiên bản HD nếu có. */
  videoUrl: string;
  sizeBytes: number | null;
  isHd: boolean;
}

export type TikTokDownloadErrorCode =
  | 'INVALID_LINK'
  | 'RATE_LIMITED'
  | 'RESOLVE_FAILED'
  | 'NETWORK'
  | 'TOO_LARGE'
  | 'DOWNLOAD_FAILED'
  | 'ABORTED';

export class TikTokDownloadError extends Error {
  readonly code: TikTokDownloadErrorCode;
  readonly messageVi: string;

  constructor(code: TikTokDownloadErrorCode, messageVi: string) {
    super(messageVi);
    this.name = 'TikTokDownloadError';
    this.code = code;
    this.messageVi = messageVi;
  }
}

// Người dùng thường dán cả đoạn chia sẻ ("caption ... https://vt.tiktok.com/xxx/"), nên tách link ra trước.
export function extractTikTokUrl(raw: string): string | null {
  const matches = raw.match(/https?:\/\/[^\s]+/gi) ?? [];
  for (const candidate of matches) {
    const cleaned = candidate.replace(/[)\]}>.,;!?'"]+$/, '');
    if (isTikTokUrl(cleaned)) {
      return cleaned;
    }
  }
  return null;
}

export function isTikTokUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  return host === 'tiktok.com' || host.endsWith('.tiktok.com');
}

export function formatBytesVi(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

interface TikwmPayload {
  code?: number;
  msg?: string;
  data?: {
    id?: string;
    title?: string;
    duration?: number;
    cover?: string;
    play?: string;
    hdplay?: string;
    size?: number;
    hd_size?: number;
    author?: { unique_id?: string };
  };
}

export function parseTikwmResponse(payload: TikwmPayload): TikTokVideoInfo {
  if (payload.code !== 0 || !payload.data) {
    const msg = payload.msg ?? '';
    if (/limit/i.test(msg)) {
      throw new TikTokDownloadError(
        'RATE_LIMITED',
        'Dịch vụ đang giới hạn tần suất, vui lòng thử lại sau vài giây.',
      );
    }
    throw new TikTokDownloadError(
      'RESOLVE_FAILED',
      'Không lấy được video từ liên kết này. Video có thể ở chế độ riêng tư, đã bị xóa hoặc liên kết sai.',
    );
  }
  const d = payload.data;
  const videoUrl = d.hdplay || d.play;
  if (!d.id || !videoUrl) {
    throw new TikTokDownloadError(
      'RESOLVE_FAILED',
      'Liên kết này không chứa video có thể tải (có thể là bài đăng dạng ảnh).',
    );
  }
  const isHd = Boolean(d.hdplay);
  const size = isHd ? d.hd_size : d.size;
  return {
    id: d.id,
    title: d.title ?? '',
    author: d.author?.unique_id ?? '',
    durationSeconds: d.duration ?? 0,
    coverUrl: d.cover ?? '',
    videoUrl,
    sizeBytes: typeof size === 'number' && size > 0 ? size : null,
    isHd,
  };
}

export async function resolveTikTokVideo(
  link: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<TikTokVideoInfo> {
  const url = extractTikTokUrl(link);
  if (!url) {
    throw new TikTokDownloadError(
      'INVALID_LINK',
      'Vui lòng dán liên kết video TikTok hợp lệ (tiktok.com, vt.tiktok.com, vm.tiktok.com).',
    );
  }
  let response: Response;
  try {
    response = await fetchImpl(`${TIKWM_API_URL}?url=${encodeURIComponent(url)}&hd=1`, { signal });
  } catch {
    if (signal?.aborted) {
      throw new TikTokDownloadError('ABORTED', 'Đã hủy.');
    }
    throw new TikTokDownloadError('NETWORK', 'Không kết nối được dịch vụ lấy video. Kiểm tra mạng rồi thử lại.');
  }
  let payload: TikwmPayload;
  try {
    payload = (await response.json()) as TikwmPayload;
  } catch {
    throw new TikTokDownloadError('RESOLVE_FAILED', 'Dịch vụ lấy video trả về dữ liệu không hợp lệ. Vui lòng thử lại sau.');
  }
  return parseTikwmResponse(payload);
}

/**
 * Tải video thành Blob, báo tiến trình 0..1 (null nếu không biết tổng dung lượng).
 * Link CDN có hạn nên phải gọi ngay sau khi resolve.
 */
export async function downloadTikTokBlob(
  info: TikTokVideoInfo,
  onProgress?: (ratio: number | null) => void,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<Blob> {
  if (info.sizeBytes !== null && info.sizeBytes > TIKTOK_MAX_DOWNLOAD_BYTES) {
    throw new TikTokDownloadError('TOO_LARGE', `Video lớn hơn ${formatBytesVi(TIKTOK_MAX_DOWNLOAD_BYTES)}, không thể tải trên trình duyệt.`);
  }
  let response: Response;
  try {
    response = await fetchImpl(info.videoUrl, { signal, referrerPolicy: 'no-referrer' });
  } catch {
    if (signal?.aborted) {
      throw new TikTokDownloadError('ABORTED', 'Đã hủy.');
    }
    throw new TikTokDownloadError('DOWNLOAD_FAILED', 'Không tải được file video. Liên kết có thể đã hết hạn, hãy thử lại.');
  }
  if (!response.ok) {
    throw new TikTokDownloadError('DOWNLOAD_FAILED', 'Không tải được file video. Liên kết có thể đã hết hạn, hãy thử lại.');
  }
  const headerLength = Number(response.headers.get('content-length'));
  const total = headerLength > 0 ? headerLength : info.sizeBytes;
  if (total !== null && total > TIKTOK_MAX_DOWNLOAD_BYTES) {
    throw new TikTokDownloadError('TOO_LARGE', `Video lớn hơn ${formatBytesVi(TIKTOK_MAX_DOWNLOAD_BYTES)}, không thể tải trên trình duyệt.`);
  }
  if (!response.body) {
    const blob = await response.blob();
    onProgress?.(1);
    return blob;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
      received += value.byteLength;
      if (received > TIKTOK_MAX_DOWNLOAD_BYTES) {
        await reader.cancel();
        throw new TikTokDownloadError('TOO_LARGE', `Video lớn hơn ${formatBytesVi(TIKTOK_MAX_DOWNLOAD_BYTES)}, không thể tải trên trình duyệt.`);
      }
      onProgress?.(total ? Math.min(1, received / total) : null);
    }
  } catch (error: unknown) {
    if (error instanceof TikTokDownloadError) {
      throw error;
    }
    if (signal?.aborted) {
      throw new TikTokDownloadError('ABORTED', 'Đã hủy.');
    }
    throw new TikTokDownloadError('DOWNLOAD_FAILED', 'Quá trình tải bị gián đoạn. Vui lòng thử lại.');
  }
  onProgress?.(1);
  return new Blob(chunks as BlobPart[], { type: 'video/mp4' });
}

export function buildTikTokFileName(info: Pick<TikTokVideoInfo, 'id' | 'author'>): string {
  const author = info.author.replace(/[^\w.-]/g, '');
  return author ? `tiktok-${author}-${info.id}.mp4` : `tiktok-${info.id}.mp4`;
}

export function saveBlobAsFile(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}
