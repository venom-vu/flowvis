<script setup lang="ts">
import { usePageSeo } from '~/composables/usePageSeo';
import { useSystemStatus } from '~/composables/useSystemStatus';
import { isPausedError } from '~/utils/system-status';
import { computed, ref } from 'vue';
import type { Task } from '@flowvis/contracts';
import { usePricingConfig } from '~/composables/usePricingConfig';
import { useApiClient } from '~/composables/useApiClient';
import { useAuthDialog } from '~/composables/useAuthDialog';
import { resolveApiErrorMessageVi } from '~/utils/api-client';

usePageSeo({
  title: 'Tạo Sản Phẩm Đa Góc AI — flowvis',
  description:
    'Tải 3 ảnh sản phẩm, AI dựng ảnh sản phẩm nhìn từ nhiều góc khác nhau. Phù hợp ảnh bán hàng và giới thiệu sản phẩm.',
});

const { pricing, me, refreshAll } = usePricingConfig();
const { client } = useApiClient();
const { open: openAuthDialog } = useAuthDialog();

const isAuthenticated = computed<boolean>(() => Boolean(me.value));

// Ba ảnh sản phẩm: productKey1/2/3 tương ứng node 27/28/7 của AI App.
const productKey1 = ref<string | null>(null);
const productKey2 = ref<string | null>(null);
const productKey3 = ref<string | null>(null);

const slots = [
  { index: 1, model: productKey1, idPrefix: 'multi-angle-product-1' },
  { index: 2, model: productKey2, idPrefix: 'multi-angle-product-2' },
  { index: 3, model: productKey3, idPrefix: 'multi-angle-product-3' },
] as const;

const activeTask = ref<Task | null>(null);
const { intakePaused, markPaused } = useSystemStatus();
const isSubmitting = ref<boolean>(false);
const submitErrorVi = ref<string | null>(null);

// Giá lấy từ GET /config/pricing (fallback 200); server vẫn là nơi quyết định giá.
const creditCost = computed<number>(
  () => pricing.value?.pipelines.multiAngleProductCredits ?? 200,
);

const userBalance = computed<number>(() => me.value?.balance ?? 0);
const hasEnoughBalance = computed<boolean>(() => {
  if (typeof me.value?.balance !== 'number') return true;
  return me.value.balance >= creditCost.value;
});

const hasAllImages = computed<boolean>(() =>
  Boolean(productKey1.value && productKey2.value && productKey3.value),
);

const canSubmit = computed<boolean>(() =>
  Boolean(
    !intakePaused.value &&
      isAuthenticated.value &&
      hasAllImages.value &&
      hasEnoughBalance.value &&
      !isSubmitting.value,
  ),
);

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value || isSubmitting.value) return;
  isSubmitting.value = true;
  submitErrorVi.value = null;
  try {
    const task = await client.createMultiAngleProductTask({
      productKey1: productKey1.value!,
      productKey2: productKey2.value!,
      productKey3: productKey3.value!,
    });
    activeTask.value = task;
    void refreshAll();
  } catch (error: unknown) {
    if (isPausedError(error)) markPaused();
    submitErrorVi.value = resolveApiErrorMessageVi(error);
  } finally {
    isSubmitting.value = false;
  }
}

function handleReset(): void {
  activeTask.value = null;
  submitErrorVi.value = null;
  void refreshAll();
}
</script>

<template>
  <div
    class="mx-auto max-w-4xl space-y-6 py-2 sm:py-4"
    data-testid="page-multi-angle-product"
  >
    <MaintenanceBanner />
    <div class="flex items-center justify-between">
      <NuxtLink
        to="/"
        class="touch-target inline-flex min-h-[48px] items-center gap-2 text-xs font-semibold text-cyber-muted transition hover:text-cyber-cyan"
      >
        <Icon name="lucide:arrow-left" class="h-4 w-4" />
        <span>Quay lại Kho Công Cụ AI</span>
      </NuxtLink>

      <span
        class="inline-flex items-center gap-1.5 rounded-full border border-cyber-violet/40 bg-cyber-violet/15 px-3 py-1 font-mono text-xs font-semibold text-cyber-violet"
      >
        <Icon name="lucide:coins" class="h-3.5 w-3.5 text-cyber-cyan" />
        <span>Chi phí: {{ creditCost }} Credit</span>
      </span>
    </div>

    <section
      class="rounded-2xl border border-cyber-border bg-gradient-to-br from-cyber-surface via-slate-900 to-cyber-bg p-5 sm:p-6"
    >
      <div class="flex items-start gap-4">
        <span
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyber-violet/50 bg-cyber-violet/20 text-cyber-violet"
        >
          <Icon name="lucide:box" class="h-6 w-6" />
        </span>
        <div class="space-y-1">
          <h1 class="font-display text-lg font-bold sm:text-2xl">
            Tạo Sản Phẩm Đa Góc AI
          </h1>
          <p class="text-xs text-cyber-muted sm:text-sm">
            Tải 3 ảnh sản phẩm, AI dựng ảnh sản phẩm nhìn từ nhiều góc khác nhau.
          </p>
        </div>
      </div>
    </section>

    <section v-if="activeTask" class="space-y-4">
      <TaskResultViewer
        :task="activeTask"
        @update:task="activeTask = $event"
        @retry="handleReset"
        @settled="void refreshAll()"
      />
    </section>

    <section v-else class="space-y-6">
      <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div
          v-for="slot in slots"
          :key="slot.index"
          class="space-y-3 rounded-2xl border border-cyber-border bg-cyber-surface/60 p-4 sm:p-5"
          :data-testid="`product-image-section-${slot.index}`"
        >
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-7 w-7 items-center justify-center rounded-lg border border-cyber-cyan/40 bg-cyber-cyan/15 font-mono text-xs font-bold text-cyber-cyan"
            >
              {{ slot.index }}
            </span>
            <h2 class="text-sm font-bold text-cyber-text">
              Ảnh sản phẩm {{ slot.index }}
            </h2>
          </div>

          <ImageUploader
            v-model="slot.model.value"
            :maintenance-note="intakePaused"
            :id-prefix="slot.idPrefix"
            :label-vi="`Chọn ảnh sản phẩm ${slot.index}`"
            description-vi="Ảnh sản phẩm rõ nét, JPG/PNG/WebP ≤ 10 MB"
          />
        </div>
      </div>

      <div
        v-if="submitErrorVi"
        data-testid="submit-error-banner"
        class="rounded-xl border border-cyber-danger/40 bg-cyber-danger/10 p-4 text-xs text-cyber-danger"
      >
        <div class="flex items-center gap-2">
          <Icon name="lucide:alert-circle" class="h-4 w-4 shrink-0" />
          <span>{{ submitErrorVi }}</span>
        </div>
      </div>

      <div
        v-if="!isAuthenticated"
        data-testid="guest-login-notice"
        class="flex flex-col gap-3 rounded-xl border border-cyber-cyan/40 bg-cyber-cyan/10 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-3">
          <Icon name="lucide:log-in" class="h-5 w-5 shrink-0 text-cyber-cyan" />
          <p class="text-xs text-cyber-cyan sm:text-sm">
            Vui lòng đăng nhập để bắt đầu tạo ảnh sản phẩm đa góc và lưu lịch sử.
          </p>
        </div>
        <button
          type="button"
          data-testid="multi-angle-product-login-button"
          class="touch-target inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-cyber-cyan px-4 py-2 text-xs font-bold text-black transition hover:bg-cyber-cyan/90"
          @click="openAuthDialog('login')"
        >
          <Icon name="lucide:log-in" class="h-4 w-4" />
          <span>Đăng nhập ngay</span>
        </button>
      </div>

      <div
        class="flex flex-col gap-4 rounded-2xl border border-cyber-border bg-cyber-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs text-cyber-muted">Số dư khả dụng:</span>
            <span
              class="font-mono text-sm font-bold"
              :class="[hasEnoughBalance ? 'text-cyber-cyan' : 'text-cyber-warning']"
            >
              {{ userBalance }} Credit
            </span>
          </div>
          <p
            v-if="!hasEnoughBalance"
            data-testid="insufficient-credit-note"
            class="text-xs font-semibold text-cyber-warning"
          >
            Số dư không đủ {{ creditCost }} credit để thực hiện tác vụ.
          </p>
        </div>

        <div class="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
          <NuxtLink
            v-if="!hasEnoughBalance"
            to="/pricing"
            data-testid="topup-credit-button"
            class="touch-target inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-xl border border-cyber-warning/50 bg-cyber-warning/15 px-4 py-2.5 text-xs font-semibold text-cyber-warning transition hover:bg-cyber-warning/25"
          >
            <Icon name="lucide:plus-circle" class="h-4 w-4" />
            <span>Nạp thêm Credit</span>
          </NuxtLink>

          <button
            type="button"
            data-testid="create-multi-angle-product-button"
            :disabled="!canSubmit || intakePaused"
            class="touch-target inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-xl bg-cyber-violet px-6 py-3 text-sm font-semibold text-cyber-text transition hover:bg-cyber-violet/90 disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleSubmit"
          >
            <Icon v-if="isSubmitting" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
            <Icon v-else name="lucide:play" class="h-4 w-4" />
            <span>
              {{ isSubmitting ? 'Đang tạo tác vụ...' : `Tạo Ảnh Đa Góc (${creditCost} CR)` }}
            </span>
          </button>
        </div>
      </div>
    </section>

    <ToolSeoSection tool="multi-angle-product" />
  </div>
</template>
