import { ApiErrorCode } from '@flowxis/contracts';

export const MAINTENANCE_MESSAGE_VI =
  'Hệ thống đang bảo trì, tạm dừng nhận tác vụ mới';

export const REPORT_MAILTO_SUBJECT = 'Báo cáo vi phạm flowxis';
export const REPORT_MAILTO_BODY =
  'Vui lòng nêu mã tác vụ hoặc liên kết chia sẻ và mô tả vi phạm.';

/** mailto cố định: chỉ tiêu đề và hướng dẫn, không chèn dữ liệu người dùng. */
export function buildReportMailto(email: string): string {
  const to = email.trim();
  if (!to) return '#';
  return `mailto:${to}?subject=${encodeURIComponent(
    REPORT_MAILTO_SUBJECT,
  )}&body=${encodeURIComponent(REPORT_MAILTO_BODY)}`;
}

/** Chuẩn hóa URL nhóm/OA Zalo công khai; chỉ chấp nhận http(s), rỗng hoặc không hợp lệ trả về null. */
export function resolveZaloJoinUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

export function isPausedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { status?: unknown; code?: unknown };
  return e.status === 503 && e.code === ApiErrorCode.PAUSED;
}

/** Lỗi mạng giữ trạng thái trước; không ném lỗi. */
export async function resolveIntakePaused(
  fetchStatus: () => Promise<{ intakePaused: boolean }>,
  previous: boolean,
): Promise<boolean> {
  try {
    const res = await fetchStatus();
    return res.intakePaused === true;
  } catch {
    return previous;
  }
}
