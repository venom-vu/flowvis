import { z } from 'zod';

/** Ngày dạng YYYY-MM-DD hợp lệ theo lịch (giờ Việt Nam khi dùng làm bộ lọc). */
export const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải có dạng YYYY-MM-DD.')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
  }, 'Ngày không hợp lệ.');

export function refineDateRange(
  q: { from?: string; to?: string },
  ctx: z.RefinementCtx,
): void {
  if (q.from && q.to && q.from > q.to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['to'],
      message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.',
    });
  }
}

const VN_OFFSET = '+07:00';

/** Khoảng [gte, lt) theo giờ Việt Nam cho cặp ngày từ/đến (gồm cả ngày `to`). */
export function vnDateRange(from?: string, to?: string): { gte?: Date; lt?: Date } {
  const range: { gte?: Date; lt?: Date } = {};
  if (from) range.gte = new Date(`${from}T00:00:00${VN_OFFSET}`);
  if (to) range.lt = new Date(new Date(`${to}T00:00:00${VN_OFFSET}`).getTime() + 86_400_000);
  return range;
}
