<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { getFormFieldClasses, useUiVariant, type UiVariant } from '~/utils/form-ui';

const props = withDefaults(
  defineProps<{
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    variant?: UiVariant;
  }>(),
  { label: undefined, placeholder: 'Chọn khoảng ngày', disabled: false, variant: undefined },
);

/** Ngày dạng YYYY-MM-DD (giờ Việt Nam); rỗng nghĩa là chưa chọn. */
const from = defineModel<string>('from', { default: '' });
const to = defineModel<string>('to', { default: '' });

const generatedId = useId();
const triggerId = `daterange-${generatedId}`;
const resolvedVariant = useUiVariant(() => props.variant);

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_FMT = (y: number, m: number): string => `Tháng ${m + 1}/${y}`;

const pad = (n: number): string => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number): string => `${y}-${pad(m + 1)}-${pad(d)}`;
const parseIso = (iso: string): { y: number; m: number; d: number } => {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
};
const addDays = (iso: string, n: number): string => {
  const { y, m, d } = parseIso(iso);
  const dt = new Date(Date.UTC(y, m, d + n));
  return toIso(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
};
const formatVi = (iso: string): string => {
  const { y, m, d } = parseIso(iso);
  return `${pad(d)}/${pad(m + 1)}/${y}`;
};

const todayVn = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

const isOpen = ref(false);
const rootEl = ref<HTMLElement | null>(null);
const viewYear = ref(0);
const viewMonth = ref(0);
/** Đã bấm ngày đầu, đang chờ ngày cuối. */
const pendingStart = ref<string | null>(null);
const hoverDate = ref<string | null>(null);

function syncView(): void {
  const base = parseIso(from.value || todayVn());
  viewYear.value = base.y;
  viewMonth.value = base.m;
}

const displayText = computed<string>(() => {
  if (from.value && to.value) {
    return from.value === to.value ? formatVi(from.value) : `${formatVi(from.value)} – ${formatVi(to.value)}`;
  }
  if (from.value) return `Từ ${formatVi(from.value)}`;
  if (to.value) return `Đến ${formatVi(to.value)}`;
  return '';
});

const fieldClass = computed(() =>
  getFormFieldClasses(resolvedVariant.value, { open: isOpen.value, hasLeftIcon: true, hasRightIcon: Boolean(displayText.value) }),
);

interface Cell {
  iso: string;
  day: number;
  inMonth: boolean;
}

const cells = computed<Cell[]>(() => {
  const first = new Date(Date.UTC(viewYear.value, viewMonth.value, 1));
  const offset = (first.getUTCDay() + 6) % 7; // thứ Hai là cột đầu
  const start = addDays(toIso(viewYear.value, viewMonth.value, 1), -offset);
  return Array.from({ length: 42 }, (_, i) => {
    const iso = addDays(start, i);
    const p = parseIso(iso);
    return { iso, day: p.d, inMonth: p.m === viewMonth.value };
  });
});

/** Khoảng đang hiển thị: đang chọn dở thì theo ô hover, ngược lại theo giá trị đã chọn. */
const activeRange = computed<{ a: string; b: string } | null>(() => {
  if (pendingStart.value) {
    const other = hoverDate.value ?? pendingStart.value;
    return pendingStart.value <= other
      ? { a: pendingStart.value, b: other }
      : { a: other, b: pendingStart.value };
  }
  if (from.value && to.value) return { a: from.value, b: to.value };
  if (from.value) return { a: from.value, b: from.value };
  return null;
});

function cellClass(c: Cell): string {
  const r = activeRange.value;
  const isStart = r?.a === c.iso;
  const isEnd = r?.b === c.iso;
  const inRange = r ? c.iso > r.a && c.iso < r.b : false;
  const base =
    'relative flex h-10 w-full items-center justify-center text-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyber-violet';
  if (isStart || isEnd) {
    return `${base} bg-cyber-violet font-semibold text-white ${isStart ? 'rounded-l-lg' : ''} ${isEnd ? 'rounded-r-lg' : ''}`;
  }
  if (inRange) return `${base} bg-cyber-violet/20 text-cyber-text`;
  const today = c.iso === todayVn() ? 'font-semibold text-cyber-cyan' : '';
  return `${base} rounded-lg hover:bg-cyber-bg ${c.inMonth ? 'text-cyber-text' : 'text-cyber-muted/50'} ${today}`;
}

function shiftMonth(delta: number): void {
  const dt = new Date(Date.UTC(viewYear.value, viewMonth.value + delta, 1));
  viewYear.value = dt.getUTCFullYear();
  viewMonth.value = dt.getUTCMonth();
}

function pick(c: Cell): void {
  if (!c.inMonth) {
    const p = parseIso(c.iso);
    viewYear.value = p.y;
    viewMonth.value = p.m;
  }
  if (!pendingStart.value) {
    pendingStart.value = c.iso;
    hoverDate.value = null;
    return;
  }
  const a = pendingStart.value;
  const [lo, hi] = a <= c.iso ? [a, c.iso] : [c.iso, a];
  from.value = lo;
  to.value = hi;
  pendingStart.value = null;
  hoverDate.value = null;
  close();
}

function applyPreset(days: number | 'month'): void {
  const today = todayVn();
  if (days === 'month') {
    const p = parseIso(today);
    from.value = toIso(p.y, p.m, 1);
  } else {
    from.value = addDays(today, -(days - 1));
  }
  to.value = today;
  pendingStart.value = null;
  syncView();
  close();
}

function clearRange(): void {
  from.value = '';
  to.value = '';
  pendingStart.value = null;
  hoverDate.value = null;
}

function open(): void {
  if (props.disabled) return;
  syncView();
  pendingStart.value = null;
  isOpen.value = true;
}

function close(): void {
  isOpen.value = false;
  pendingStart.value = null;
  hoverDate.value = null;
}

function toggle(): void {
  if (isOpen.value) close();
  else open();
}

function handleOutside(e: PointerEvent): void {
  if (isOpen.value && rootEl.value && !rootEl.value.contains(e.target as Node)) close();
}

function handleKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isOpen.value) {
    close();
    document.getElementById(triggerId)?.focus();
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutside);
  document.addEventListener('keydown', handleKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutside);
  document.removeEventListener('keydown', handleKey);
});
watch(
  () => props.disabled,
  (d) => {
    if (d) close();
  },
);

const PRESETS: ReadonlyArray<{ label: string; days: number | 'month' }> = [
  { label: 'Hôm nay', days: 1 },
  { label: '7 ngày', days: 7 },
  { label: '30 ngày', days: 30 },
  { label: 'Tháng này', days: 'month' },
];
</script>

<template>
  <div ref="rootEl" class="relative w-full min-w-0" :class="label ? 'space-y-1.5' : ''">
    <label v-if="label" :for="triggerId" class="block text-sm font-semibold text-cyber-text">
      {{ label }}
    </label>
    <div class="relative">
      <Icon
        name="lucide:calendar-range"
        class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyber-muted"
      />
      <button
        :id="triggerId"
        type="button"
        :disabled="disabled"
        aria-haspopup="dialog"
        :aria-expanded="isOpen"
        class="touch-target w-full truncate text-left"
        :class="[fieldClass, displayText ? 'text-cyber-text' : 'text-cyber-muted']"
        @click="toggle"
      >
        {{ displayText || placeholder }}
      </button>
      <button
        v-if="displayText && !disabled"
        type="button"
        aria-label="Xóa khoảng ngày"
        class="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-cyber-muted transition-colors hover:text-cyber-text"
        @click.stop="clearRange"
      >
        <Icon name="lucide:x" class="h-4 w-4" />
      </button>
    </div>

    <div
      v-if="isOpen"
      role="dialog"
      aria-label="Chọn khoảng ngày"
      class="absolute left-0 top-full z-50 mt-1.5 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-cyber-border bg-cyber-surface p-3 shadow-xl shadow-black/50"
    >
      <div class="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Tháng trước"
          class="touch-target flex h-10 w-10 items-center justify-center rounded-lg text-cyber-muted transition hover:bg-cyber-bg hover:text-cyber-text"
          @click="shiftMonth(-1)"
        >
          <Icon name="lucide:chevron-left" class="h-4 w-4" />
        </button>
        <span class="font-display text-sm font-semibold text-cyber-text">
          {{ MONTH_FMT(viewYear, viewMonth) }}
        </span>
        <button
          type="button"
          aria-label="Tháng sau"
          class="touch-target flex h-10 w-10 items-center justify-center rounded-lg text-cyber-muted transition hover:bg-cyber-bg hover:text-cyber-text"
          @click="shiftMonth(1)"
        >
          <Icon name="lucide:chevron-right" class="h-4 w-4" />
        </button>
      </div>

      <div class="grid grid-cols-7 text-center font-mono text-[11px] font-semibold uppercase text-cyber-muted">
        <span v-for="w in WEEKDAYS" :key="w" class="py-1.5">{{ w }}</span>
      </div>
      <div class="grid grid-cols-7" @pointerleave="hoverDate = null">
        <button
          v-for="c in cells"
          :key="c.iso"
          type="button"
          :class="cellClass(c)"
          :aria-label="formatVi(c.iso)"
          @pointerenter="hoverDate = c.iso"
          @click="pick(c)"
        >
          {{ c.day }}
        </button>
      </div>

      <p v-if="pendingStart" class="mt-2 text-center text-xs text-cyber-muted">
        Chọn ngày kết thúc
      </p>

      <div class="mt-3 flex flex-wrap gap-1.5 border-t border-cyber-border pt-3">
        <button
          v-for="p in PRESETS"
          :key="p.label"
          type="button"
          class="touch-target min-h-[40px] rounded-lg border border-cyber-border bg-cyber-bg px-3 text-xs font-semibold text-cyber-muted transition hover:border-cyber-violet/50 hover:text-cyber-text"
          @click="applyPreset(p.days)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>
  </div>
</template>
