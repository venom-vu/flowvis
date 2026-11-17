<script setup lang="ts">
import { computed } from 'vue';
import { useRuntimeConfig } from '#imports';
import { buildReportMailto, resolveZaloJoinUrl } from '~/utils/system-status';

const config = useRuntimeConfig();
const reportHref = computed(() =>
  buildReportMailto(String(config.public.reportEmail || '')),
);
const hasZaloButton = computed(() =>
  Boolean(resolveZaloJoinUrl(config.public.zaloUrl)),
);
const linkClass =
  'touch-target inline-flex min-h-[48px] items-center px-2 text-xs text-cyber-muted transition hover:text-cyber-cyan';
</script>

<template>
  <footer
    data-testid="app-footer"
    class="border-t border-cyber-border bg-cyber-bg pt-2"
    :class="hasZaloButton ? 'pb-32 lg:pb-4' : 'pb-20 lg:pb-4'"
  >
    <nav
      aria-label="Chân trang"
      class="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-x-2 px-4 sm:justify-between sm:px-6 lg:px-8"
      :class="hasZaloButton ? 'lg:pr-48' : ''"
    >
      <span class="text-xs text-cyber-muted">© 2026 flowvis. All rights reserved.</span>
      <div class="flex flex-wrap items-center justify-center">
        <NuxtLink to="/terms" :class="linkClass">Điều khoản dịch vụ</NuxtLink>
        <NuxtLink to="/privacy" :class="linkClass">Chính sách quyền riêng tư</NuxtLink>
        <a :href="reportHref" data-testid="footer-report-link" :class="linkClass">Báo cáo vi phạm</a>
      </div>
    </nav>
  </footer>
</template>
