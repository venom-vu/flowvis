/** Bỏ các điều kiện rỗng để không gửi lên máy chủ (không phụ thuộc alias để test nạp được). */
export function compactFilters(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ''));
}
