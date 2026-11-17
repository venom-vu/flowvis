<script setup lang="ts">
import { computed } from 'vue';
import { useRuntimeConfig } from '#imports';
import { resolveZaloJoinUrl } from '~/utils/system-status';

const config = useRuntimeConfig();
const zaloHref = computed<string | null>(() =>
  resolveZaloJoinUrl(config.public.zaloUrl),
);
</script>

<template>
  <!-- Nút pill nổi góc phải dưới ở trang user; z-30 luôn nằm dưới AppBottomNav/Header (z-40) và mọi Dialog/Modal (z-50, z-[60]) -->
  <a
    v-if="zaloHref"
    :href="zaloHref"
    target="_blank"
    rel="noopener noreferrer"
    data-testid="zalo-join-button"
    aria-label="Tham gia nhóm hỗ trợ Zalo"
    class="zalo-glow-pill touch-target group fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex min-h-[48px] items-center gap-2.5 rounded-full border border-cyber-cyan/60 bg-gradient-to-r from-cyber-surface via-[#172642] to-cyber-surface py-1.5 pl-2 pr-3.5 text-xs font-semibold text-cyber-text backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:border-cyber-cyan sm:right-6 sm:pr-4 sm:text-sm lg:bottom-6 lg:right-6"
  >
    <!-- Lớp ánh sáng lướt nhẹ định kỳ để thu hút chú ý (nằm gọn trong viền bo tròn) -->
    <span
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
    >
      <span class="zalo-shimmer-beam" />
    </span>

    <!-- Badge icon Zalo chuẩn kèm vòng lan tỏa và chấm trạng thái hoạt động -->
    <span aria-hidden="true" class="relative flex h-9 w-9 shrink-0 items-center justify-center">
      <span class="zalo-ping-ring pointer-events-none absolute inset-0.5 rounded-xl bg-[#0068FF]/65" />
      <span class="zalo-icon-wiggle relative flex h-9 w-9 items-center justify-center">
        <img
          src="/zalo-icon.png"
          alt=""
          width="36"
          height="36"
          decoding="async"
          class="h-9 w-9 scale-[1.14] object-contain drop-shadow-sm"
        />
      </span>
      <span
        class="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-cyber-surface bg-cyber-success"
      />
    </span>

    <span class="relative whitespace-nowrap tracking-tight">Nhóm hỗ trợ</span>
    <Icon
      name="lucide:arrow-up-right"
      class="relative h-3.5 w-3.5 shrink-0 text-cyber-cyan transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
    />
  </a>
</template>

<style scoped>
.zalo-glow-pill {
  animation: zaloGlowPulse 2.8s ease-in-out infinite;
}

.zalo-ping-ring {
  animation: zaloRingPulse 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.zalo-icon-wiggle {
  transform-origin: center;
  animation: zaloIconWiggle 2.2s linear infinite;
}

.zalo-shimmer-beam {
  position: absolute;
  inset: -40% auto -40% -55%;
  width: 45%;
  background: linear-gradient(
    105deg,
    transparent 0%,
    rgba(255, 255, 255, 0.22) 50%,
    transparent 100%
  );
  transform: translateX(-100%) skewX(-18deg);
  animation: zaloShimmerSweep 4.2s ease-in-out infinite;
}

@keyframes zaloGlowPulse {
  0%,
  100% {
    box-shadow:
      0 10px 26px -8px rgba(0, 104, 255, 0.45),
      0 0 0 1px rgba(6, 182, 212, 0.22);
  }
  50% {
    box-shadow:
      0 14px 34px -6px rgba(6, 182, 212, 0.65),
      0 0 18px rgba(0, 104, 255, 0.45),
      0 0 0 1px rgba(6, 182, 212, 0.5);
  }
}

@keyframes zaloRingPulse {
  0% {
    transform: scale(0.96);
    opacity: 0.72;
  }
  75%,
  100% {
    transform: scale(1.42);
    opacity: 0;
  }
}

@keyframes zaloShimmerSweep {
  0%,
  55% {
    transform: translateX(-140%) skewX(-18deg);
  }
  85%,
  100% {
    transform: translateX(380%) skewX(-18deg);
  }
}

@keyframes zaloIconWiggle {
  0%,
  55%,
  100% {
    transform: rotate(0deg);
  }
  60% {
    transform: rotate(-12deg);
  }
  65% {
    transform: rotate(12deg);
  }
  70% {
    transform: rotate(-10deg);
  }
  75% {
    transform: rotate(10deg);
  }
  80% {
    transform: rotate(-6deg);
  }
  85% {
    transform: rotate(5deg);
  }
  90% {
    transform: rotate(0deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .zalo-glow-pill,
  .zalo-ping-ring,
  .zalo-icon-wiggle,
  .zalo-shimmer-beam {
    animation: none;
  }
}
</style>
