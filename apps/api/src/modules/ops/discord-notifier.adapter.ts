import { Logger } from '@nestjs/common';
import type { NotifierEvent, NotifierPort } from '../../ports/index.js';
import { LogNotifierAdapter } from './log-notifier.adapter.js';

const MAX_DESCRIPTION = 2000;
const MAX_FIELD_VALUE = 1000;
const MAX_FIELDS = 25;
const TIMEOUT_MS = 5000;

const COLORS = { info: 0x5865f2, warn: 0xfee75c, error: 0xed4245 } as const;
const SEVERITY_LABEL = { info: 'Thông tin', warn: 'Cảnh báo', error: 'Lỗi' } as const;

/** Tiêu đề tiếng Việt cho các loại sự kiện đã biết; loại lạ dùng nguyên `kind`. */
const KIND_TITLES: Record<string, string> = {
  'ops.rh_budget_exhausted': 'RunningHub hết ngân sách',
  'ops.rh_balance_low': 'Số dư RunningHub thấp',
  'ops.rh_balance_unreadable': 'Không đọc được số dư RunningHub',
  'ops.breaker_triggered': 'Ngắt mạch đã kích hoạt',
  'ops.backup_failed': 'Sao lưu PostgreSQL thất bại',
  'ops.backup_stale': 'Sao lưu PostgreSQL quá cũ',
  'ops.backup_retention_failed': 'Dọn bản sao lưu cũ thất bại',
  'task.free_wait_expired': 'Task FREE quá hạn chờ',
  TOPUP_PENDING: 'Đơn nạp chờ duyệt',
  TOPUP_OVERDUE: 'Đơn nạp quá hạn duyệt',
  LEDGER_MISMATCH: 'Sổ cái lệch số dư',
  RECONCILE_FAILED: 'Đối soát thất bại',
};

/** Nhãn tiếng Việt cho các khóa `data` đã biết; khóa lạ giữ nguyên tên. */
const FIELD_LABELS: Record<string, string> = {
  rule: 'Quy tắc',
  eligibleTasks: 'Task xét',
  systemFailures: 'Lỗi hệ thống',
  errorRate: 'Tỉ lệ lỗi',
  consecutiveFailures: 'Lỗi liên tiếp',
  taskId: 'Task',
  userId: 'Người dùng',
  usd: 'Số dư (USD)',
  threshold: 'Ngưỡng (USD)',
  step: 'Bước',
  lastSuccessAt: 'Lần thành công gần nhất',
  balance: 'Số dư ví',
  expectedBalance: 'Số dư đúng',
  held: 'Đang giữ',
  expectedHeld: 'Đang giữ đúng',
};

function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length <= max ? text : chars.slice(0, max - 1).join('') + '…';
}

function formatValue(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return truncate(text === undefined || text === '' ? '-' : text, MAX_FIELD_VALUE);
}

/** Dựng embed Discord: màu theo mức độ, mỗi khóa của `data` là một trường riêng. */
export function buildDiscordEmbed(event: NotifierEvent): Record<string, unknown> {
  const severity = event.severity ?? 'info';
  const fields = Object.entries(event.data ?? {})
    .slice(0, MAX_FIELDS)
    .map(([name, value]) => ({ name: truncate(FIELD_LABELS[name] ?? name, 256), value: formatValue(value), inline: true }));
  return {
    title: truncate(`${SEVERITY_LABEL[severity]}: ${KIND_TITLES[event.kind] ?? event.kind}`, 256),
    description: truncate(event.message, MAX_DESCRIPTION),
    color: COLORS[severity],
    ...(fields.length > 0 ? { fields } : {}),
    footer: { text: `flowxis · ${event.kind}` },
    timestamp: new Date().toISOString(),
  };
}

/** Gửi thông báo qua Discord webhook. Ném lỗi khi mạng lỗi, timeout hoặc HTTP không phải 2xx. */
export class DiscordNotifierAdapter implements NotifierPort {
  readonly portName = 'NotifierPort' as const;

  constructor(
    private readonly webhookUrl: string,
    private readonly timeoutMs: number = TIMEOUT_MS,
  ) {}

  async notify(event: NotifierEvent): Promise<void> {
    let res: Response;
    try {
      res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [buildDiscordEmbed(event)], allowed_mentions: { parse: [] } }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      // Không đính kèm err gốc: thông điệp của fetch có thể chứa URL webhook.
      throw new Error(`Gửi Discord thất bại: ${(err as Error).name}`);
    }
    if (!res.ok) throw new Error(`Gửi Discord thất bại: HTTP ${res.status}`);
    await res.arrayBuffer().catch(() => undefined);
  }
}

export function createNotifierPort(): NotifierPort {
  const url = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!url) return new LogNotifierAdapter();
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('protocol');
  } catch {
    // URL sai định dạng: dùng adapter log thay vì để mọi lần gửi đều lỗi (không in URL ra log).
    new Logger('Notifier').error('DISCORD_WEBHOOK_URL không hợp lệ, dùng adapter log.');
    return new LogNotifierAdapter();
  }
  return new DiscordNotifierAdapter(url);
}
