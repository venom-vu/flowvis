<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  options: ReadonlyArray<{ id: string; labelVi: string }>;
  idPrefix?: string;
  disabled?: boolean;
}>();
const modelValue = defineModel<string>({ required: true });

const selectOptions = computed(() => props.options.map((o) => ({ value: o.id, label: o.labelVi })));
</script>

<template>
  <div class="space-y-2">
    <label
      :for="`${idPrefix ?? 'aspect'}-ratio`"
      class="flex items-center gap-2 text-xs font-semibold text-cyber-text sm:text-sm"
    >
      <Icon name="lucide:crop" class="h-4 w-4 text-cyber-cyan" />
      <span>Khung hình</span>
    </label>
    <BaseSelect
      :id="`${idPrefix ?? 'aspect'}-ratio`"
      v-model="modelValue"
      :options="selectOptions"
      :disabled="disabled"
      variant="cyber"
      focus-accent="cyan"
      :data-testid="`${idPrefix ?? 'aspect'}-ratio`"
    />
  </div>
</template>
