<script setup lang="ts">
import {
  MOTION_ASPECT_RATIOS,
  MOTION_PROMPT_MAX_LENGTH,
  type MotionAspectRatio,
} from '@flowvis/contracts';

defineProps<{ idPrefix?: string; disabled?: boolean }>();
const aspectRatio = defineModel<MotionAspectRatio>('aspectRatio', { required: true });
const prompt = defineModel<string>('prompt', { required: true });
</script>

<template>
  <div class="min-w-0 space-y-3" data-testid="motion-options">
    <AspectRatioSelect
      v-model="aspectRatio"
      :options="MOTION_ASPECT_RATIOS"
      :id-prefix="idPrefix ?? 'motion'"
      :disabled="disabled"
    />

    <div class="space-y-1.5">
      <label
        :for="`${idPrefix ?? 'motion'}-prompt`"
        class="flex items-center gap-2 text-xs font-semibold text-cyber-text sm:text-sm"
      >
        <Icon name="lucide:message-square-text" class="h-4 w-4 text-cyber-violet" />
        <span>Prompt (tùy chọn)</span>
      </label>
      <BaseTextarea
        :id="`${idPrefix ?? 'motion'}-prompt`"
        v-model="prompt"
        variant="cyber"
        focus-accent="cyan"
        :maxlength="MOTION_PROMPT_MAX_LENGTH"
        :disabled="disabled"
        rows="3"
        placeholder="Mô tả bối cảnh hoặc hành động, ví dụ: cô gái nhảy trong phòng tập, ánh sáng ấm"
        :data-testid="`${idPrefix ?? 'motion'}-prompt`"
      />
      <p class="text-right font-mono text-[11px] text-cyber-muted">
        {{ prompt.length }}/{{ MOTION_PROMPT_MAX_LENGTH }}
      </p>
    </div>
  </div>
</template>
