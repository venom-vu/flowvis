<script setup lang="ts">
import { computed } from 'vue';
import { TOOL_SEO_CONTENT, type ToolSeoId } from '~/content/seo-tools';

const props = defineProps<{ tool: ToolSeoId }>();
const content = computed(() => TOOL_SEO_CONTENT[props.tool]);
</script>

<template>
  <section
    class="space-y-5 rounded-2xl border border-cyber-border bg-cyber-surface/40 p-5 sm:p-6"
    :data-testid="`seo-section-${tool}`"
  >
    <div class="space-y-2">
      <h2 class="font-display text-base font-bold text-cyber-text sm:text-lg">
        {{ content.heading }}
      </h2>
      <p class="text-sm leading-relaxed text-cyber-muted">{{ content.intro }}</p>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-semibold text-cyber-text">Cách sử dụng</h3>
      <ol class="list-decimal space-y-1 pl-5 text-sm text-cyber-muted">
        <li v-for="step in content.steps" :key="step">{{ step }}</li>
      </ol>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-semibold text-cyber-text">Mẹo để có kết quả tốt</h3>
      <ul class="list-disc space-y-1 pl-5 text-sm text-cyber-muted">
        <li v-for="tip in content.tips" :key="tip">{{ tip }}</li>
      </ul>
    </div>
  </section>
</template>
