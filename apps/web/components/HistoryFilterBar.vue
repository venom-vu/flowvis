<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { BaseSelectOption } from '~/components/BaseSelect.vue';

export interface HistoryFilterField {
  key: string;
  kind: 'daterange' | 'text' | 'select';
  /** Với 'daterange': `key` là ngày bắt đầu, `toKey` là ngày kết thúc. */
  toKey?: string;
  label: string;
  placeholder?: string;
  options?: ReadonlyArray<BaseSelectOption>;
  maxLength?: number;
}

const props = defineProps<{
  fields: ReadonlyArray<HistoryFilterField>;
  modelValue: Record<string, string>;
  disabled?: boolean;
  testidPrefix: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, string>): void;
}>();

const draft = ref<Record<string, string>>({ ...props.modelValue });

watch(
  () => props.modelValue,
  (v) => {
    draft.value = { ...v };
  },
);

const fieldKeys = (f: HistoryFilterField): string[] => (f.toKey ? [f.key, f.toKey] : [f.key]);
const allKeys = computed(() => props.fields.flatMap(fieldKeys));

const activeCount = computed(
  () => Object.values(props.modelValue).filter((v) => v !== '').length,
);
const isDirty = computed(() =>
  allKeys.value.some((k) => (draft.value[k] ?? '') !== (props.modelValue[k] ?? '')),
);

function apply(): void {
  const next: Record<string, string> = {};
  for (const k of allKeys.value) {
    next[k] = (draft.value[k] ?? '').trim();
  }
  emit('update:modelValue', next);
}

function clear(): void {
  const next: Record<string, string> = {};
  for (const k of allKeys.value) next[k] = '';
  draft.value = next;
  emit('update:modelValue', next);
}
</script>

<template>
  <form
    :data-testid="`${testidPrefix}-filter`"
    class="relative z-20 space-y-4 rounded-t-2xl border-b border-cyber-border bg-cyber-bg/40 p-4 sm:px-6"
    @submit.prevent="apply"
  >
    <div class="flex flex-wrap items-end gap-3">
      <template v-for="f in fields" :key="f.key">
        <DateRangePicker
          v-if="f.kind === 'daterange'"
          :from="draft[f.key] ?? ''"
          :to="draft[f.toKey ?? ''] ?? ''"
          :label="f.label"
          :disabled="disabled"
          class="min-w-[240px] flex-1 basis-[240px]"
          :data-testid="`${testidPrefix}-filter-range`"
          @update:from="draft[f.key] = $event"
          @update:to="draft[f.toKey ?? ''] = $event"
        />
        <BaseInput
          v-else-if="f.kind === 'text'"
          v-model="draft[f.key]"
          type="text"
          autocomplete="off"
          left-icon="lucide:search"
          :label="f.label"
          :placeholder="f.placeholder"
          :maxlength="f.maxLength ?? 64"
          :disabled="disabled"
          class="min-w-[240px] flex-1 basis-[240px]"
          :data-testid="`${testidPrefix}-filter-${f.key}`"
        />
        <BaseSelect
          v-else
          :model-value="draft[f.key] ?? ''"
          :label="f.label"
          :placeholder="f.placeholder ?? `Chọn ${f.label.toLowerCase()}`"
          clearable
          :options="f.options ?? []"
          :disabled="disabled"
          class="min-w-[240px] flex-1 basis-[240px]"
          :data-testid="`${testidPrefix}-filter-${f.key}`"
          @update:model-value="draft[f.key] = $event"
        />
      </template>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="font-mono text-xs text-cyber-muted">
        <template v-if="activeCount > 0">Đang lọc theo {{ activeCount }} điều kiện</template>
      </p>
      <div class="flex flex-wrap items-center justify-end gap-2">
      <button
        type="submit"
        :data-testid="`${testidPrefix}-filter-apply`"
        :disabled="disabled || !isDirty"
        class="touch-target inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-cyber-violet/50 bg-cyber-violet/15 px-4 py-2 text-xs font-semibold text-cyber-text transition hover:bg-cyber-violet/25 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="lucide:filter" class="h-4 w-4" />
        <span>Áp dụng</span>
      </button>
      <button
        v-if="activeCount > 0 || isDirty"
        type="button"
        :data-testid="`${testidPrefix}-filter-clear`"
        :disabled="disabled"
        class="touch-target inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-cyber-border bg-cyber-bg px-4 py-2 text-xs font-semibold text-cyber-muted transition hover:border-cyber-violet/50 hover:text-cyber-text disabled:cursor-not-allowed disabled:opacity-50"
        @click="clear"
      >
        <Icon name="lucide:x" class="h-4 w-4" />
        <span>Xóa lọc</span>
      </button>
    </div>
    </div>
  </form>
</template>
