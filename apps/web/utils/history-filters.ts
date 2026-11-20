import {
  LEDGER_ENTRY_LABELS_VI,
  LEDGER_ENTRY_TYPES,
  TASK_PIPELINES,
  TASK_STATUSES,
  TOPUP_PACK_IDS,
  TOPUP_STATUSES,
} from '@flowxis/contracts';
export { compactFilters } from '~/utils/compact-filters';
import type { HistoryFilterField } from '~/components/HistoryFilterBar.vue';
import { getPipelineLabelVi } from '~/utils/task-format';
import { getTaskStatusBadge, getTopupPackBadge, getTopupStatusBadge } from '~/utils/status-badge';

export const TOPUP_FILTER_FIELDS: ReadonlyArray<HistoryFilterField> = [
  { key: 'from', toKey: 'to', kind: 'daterange', label: 'Khoảng ngày' },
  { key: 'code', kind: 'text', label: 'Mã đơn', placeholder: 'Nhập mã đơn' },
  {
    key: 'pack',
    kind: 'select',
    label: 'Gói',
    options: [...TOPUP_PACK_IDS.map((p) => ({ value: p, label: getTopupPackBadge(p).label }))],
  },
  {
    key: 'status',
    kind: 'select',
    label: 'Trạng thái',
    options: [...TOPUP_STATUSES.map((s) => ({ value: s, label: getTopupStatusBadge(s).label }))],
  },
];

export const LEDGER_FILTER_FIELDS: ReadonlyArray<HistoryFilterField> = [
  { key: 'from', toKey: 'to', kind: 'daterange', label: 'Khoảng ngày' },
  {
    key: 'type',
    kind: 'select',
    label: 'Loại tác vụ',
    options: [...LEDGER_ENTRY_TYPES.map((t) => ({ value: t, label: LEDGER_ENTRY_LABELS_VI[t] }))],
  },
];

export const TASK_FILTER_FIELDS: ReadonlyArray<HistoryFilterField> = [
  { key: 'from', toKey: 'to', kind: 'daterange', label: 'Khoảng ngày' },
  { key: 'code', kind: 'text', label: 'Mã tác vụ', placeholder: 'Nhập mã tác vụ', maxLength: 36 },
  {
    key: 'pipeline',
    kind: 'select',
    label: 'Chức năng',
    options: [...TASK_PIPELINES.map((p) => ({ value: p, label: getPipelineLabelVi(p) }))],
  },
  {
    key: 'status',
    kind: 'select',
    label: 'Trạng thái',
    options: [...TASK_STATUSES.map((s) => ({ value: s, label: getTaskStatusBadge({ status: s, queuePosition: null }).label }))],
  },
];

export function emptyFilters(fields: ReadonlyArray<HistoryFilterField>): Record<string, string> {
  return Object.fromEntries(fields.flatMap((f) => (f.toKey ? [f.key, f.toKey] : [f.key])).map((k) => [k, '']));
}
