import { useCookie } from '#imports';

/**
 * Gợi ý "trình duyệt này đã đăng nhập" (không chứa dữ liệu nhạy cảm, không thay cho xác thực).
 * Cookie đọc được cả ở SSR nên header dựng khung chờ ngay từ HTML đầu tiên,
 * thay vì nháy UI khách trong lúc đổi refresh token lấy access token.
 */
export function useSessionHint() {
  const hint = useCookie<boolean>('flowxis-session-hint', {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    path: '/',
    default: () => false,
  });

  return { hint };
}
