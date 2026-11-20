<script setup lang="ts">
import { usePageSeo } from '~/composables/usePageSeo';
import { useSystemStatus } from '~/composables/useSystemStatus';
import { isPausedError } from '~/utils/system-status';
import { computed, ref } from 'vue';
import type { Task } from '@flowxis/contracts';
import { usePricingConfig } from '~/composables/usePricingConfig';
import { useApiClient } from '~/composables/useApiClient';
import { useAuthDialog } from '~/composables/useAuthDialog';
import { resolveApiErrorMessageVi } from '~/utils/api-client';

usePageSeo({
  title: 'Đổi Trang Phục AI — flowxis',
  description:
    'Cho người mẫu mặc trang phục bất kỳ chỉ bằng một lần bấm. Giữ nguyên dáng người, khuôn mặt và bối cảnh.',
});

const { pricing, me, refreshAll } = usePricingConfig();
const { client } = useApiClient();
const { open: openAuthDialog } = useAuthDialog();

// Trạng thái đăng nhập
const isAuthenticated = computed<boolean>(() => Boolean(me.value));

// Hai ảnh đầu vào: Ảnh người mẫu (modelKey) và Ảnh trang phục (clothingKey)
const modelKey = ref<string | null>(null);
const clothingKey = ref<string | null>(null);

// Trạng thái tác vụ
const activeTask = ref<Task | null>(null);
const { intakePaused, markPaused } = useSystemStatus();
const isSubmitting = ref<boolean>(false);
const submitErrorVi = ref<string | null>(null);

// Giá Đổi Trang Phục: 100 credit lấy từ GET /config/pricing (fallback 100)
const outfitChangeCreditCost = computed<number>(
  () => pricing.value?.pipelines.outfitChangeCredits ?? 100,
);

const userBalance = computed<number>(() => me.value?.balance ?? 0);
const hasEnoughBalance = computed<boolean>(() => {
  if (typeof me.value?.balance !== 'number') return true;
  return me.value.balance >= outfitChangeCreditCost.value;
});

// Điều kiện kích hoạt nút "Tạo Đổi Trang Phục":
// 1. Đã đăng nhập
// 2. Đủ cả hai ảnh (modelKey && clothingKey)
// 3. Số dư credit >= 100
// 4. Không trong trạng thái đang gửi (isSubmitting)
const canSubmit = computed<boolean>(() => {
  return Boolean(
    !intakePaused.value &&
          isAuthenticated.value &&
      modelKey.value &&
      clothingKey.value &&
        hasEnoughBalance.value &&
      !isSubmitting.value,
  );
});

async function handleSubmit(): Promise<void> {
  // Chống bấm hai lần liên tiếp (double click protection)
  if (!canSubmit.value || isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;
  submitErrorVi.value = null;

  try {
    const task = await client.createOutfitChangeTask({
      modelKey: modelKey.value!,
      clothingKey: clothingKey.value!,
    });

    activeTask.value = task;
    // Cập nhật lại số dư ví sau khi tạo task
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
    data-testid="page-outfit-change"
  >
    <MaintenanceBanner />
    <!-- Thanh điều hướng phụ quay về Kho công cụ AI -->
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
        <span>Chi phí: {{ outfitChangeCreditCost }} Credit</span>
      </span>
    </div>

    <!-- Header giới thiệu tính năng Đổi Trang Phục -->
    <section
      class="rounded-2xl border border-cyber-border bg-gradient-to-br from-cyber-surface via-slate-900 to-cyber-bg p-5 sm:p-6"
    >
      <div class="flex items-start gap-4">
        <span
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyber-violet/50 bg-cyber-violet/20 text-cyber-violet"
        >
          <Icon name="lucide:shirt" class="h-6 w-6" />
        </span>
        <div class="space-y-1">
          <h1 class="font-display text-lg font-bold sm:text-2xl">
            Đổi Trang Phục AI
          </h1>
          <p class="text-xs text-cyber-muted sm:text-sm">
            Cho người mẫu mặc trang phục bất kỳ chỉ bằng một lần bấm. Giữ nguyên
            dáng người, khuôn mặt và bối cảnh.
          </p>
        </div>
      </div>
    </section>

    <!-- Màn hình theo dõi tiến trình xử lý khi đã có Task -->
    <section v-if="activeTask" class="space-y-4">
      <TaskResultViewer
        :task="activeTask"
        @update:task="activeTask = $event"
        @retry="handleReset"
        @settled="void refreshAll()"
      />
    </section>

    <!-- Form tải ảnh & gửi yêu cầu tạo Task khi chưa có Task đang active -->
    <section v-else class="space-y-6">
      <!-- Hai cột tải ảnh: Người mẫu & Trang phục (Responsive 1 cột mobile 360px, 2 cột tablet/desktop) -->
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
        <!-- Ô tải 1: Ảnh người mẫu -->
        <div
          class="space-y-3 rounded-2xl border border-cyber-border bg-cyber-surface/60 p-4 sm:p-5"
          data-testid="model-image-section"
        >
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-7 w-7 items-center justify-center rounded-lg border border-cyber-cyan/40 bg-cyber-cyan/15 font-mono text-xs font-bold text-cyber-cyan"
            >
              1
            </span>
            <div>
              <h2 class="text-sm font-bold text-cyber-text">
                Ảnh người mẫu
              </h2>
              <p class="text-[11px] text-cyber-muted">
                Ảnh người sẽ được thay trang phục
              </p>
            </div>
          </div>

          <ImageUploader
            v-model="modelKey"
            :maintenance-note="intakePaused"
            id-prefix="outfit-model"
            label-vi="Chọn ảnh người mẫu"
            description-vi="Ảnh người rõ dáng, JPG/PNG/WebP ≤ 10 MB"
          />
        </div>

        <!-- Ô tải 2: Ảnh trang phục -->
        <div
          class="space-y-3 rounded-2xl border border-cyber-border bg-cyber-surface/60 p-4 sm:p-5"
          data-testid="clothing-image-section"
        >
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-7 w-7 items-center justify-center rounded-lg border border-cyber-violet/40 bg-cyber-violet/15 font-mono text-xs font-bold text-cyber-violet"
            >
              2
            </span>
            <div>
              <h2 class="text-sm font-bold text-cyber-text">
                Ảnh trang phục
              </h2>
              <p class="text-[11px] text-cyber-muted">
                Ảnh quần áo bạn muốn người mẫu mặc
              </p>
            </div>
          </div>

          <ImageUploader
            v-model="clothingKey"
            :maintenance-note="intakePaused"
            id-prefix="outfit-clothing"
            label-vi="Chọn ảnh trang phục"
            description-vi="Ảnh quần áo rõ nét, JPG/PNG/WebP ≤ 10 MB"
          />
        </div>
      </div>

      <!-- Banner thông báo lỗi nếu có khi tạo Task -->
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

      <!-- Banner nhắc đăng nhập nếu chưa đăng nhập -->
      <div
        v-if="!isAuthenticated"
        data-testid="guest-login-notice"
        class="flex flex-col gap-3 rounded-xl border border-cyber-cyan/40 bg-cyber-cyan/10 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-3">
          <Icon name="lucide:log-in" class="h-5 w-5 shrink-0 text-cyber-cyan" />
          <p class="text-xs text-cyber-cyan sm:text-sm">
            Vui lòng đăng nhập để bắt đầu tạo tác vụ Đổi trang phục và lưu lịch sử.
          </p>
        </div>
        <button
          type="button"
          data-testid="outfit-change-login-button"
          class="touch-target inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-cyber-cyan px-4 py-2 text-xs font-bold text-black transition hover:bg-cyber-cyan/90"
          @click="openAuthDialog('login')"
        >
          <Icon name="lucide:log-in" class="h-4 w-4" />
          <span>Đăng nhập ngay</span>
        </button>
      </div>

      <!-- Vùng hành động: Số dư credit + Nút Nạp + Nút Tạo Đổi Trang Phục -->
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
            Số dư không đủ {{ outfitChangeCreditCost }} credit để thực hiện tác vụ.
          </p>
        </div>

        <div class="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
          <!-- Nút Nạp Thêm Credit khi số dư không đủ -->
          <NuxtLink
            v-if="!hasEnoughBalance"
            to="/pricing"
            data-testid="topup-credit-button"
            class="touch-target inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-xl border border-cyber-warning/50 bg-cyber-warning/15 px-4 py-2.5 text-xs font-semibold text-cyber-warning transition hover:bg-cyber-warning/25"
          >
            <Icon name="lucide:plus-circle" class="h-4 w-4" />
            <span>Nạp thêm Credit</span>
          </NuxtLink>

          <!-- Nút Tạo Đổi Trang Phục: min-h 48px, Slate Cyber, disabled nếu chưa đủ ảnh / ToS / credit -->
          <button
            type="button"
            data-testid="create-outfit-change-button"
            :disabled="!canSubmit || intakePaused"
            class="touch-target inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-xl bg-cyber-violet px-6 py-3 text-sm font-semibold text-cyber-text transition hover:bg-cyber-violet/90 disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleSubmit"
          >
            <Icon
              v-if="isSubmitting"
              name="lucide:loader-2"
              class="h-4 w-4 animate-spin"
            />
            <Icon v-else name="lucide:play" class="h-4 w-4" />
            <span>
              {{
                isSubmitting
                  ? 'Đang tạo tác vụ...'
                  : `Tạo Đổi Trang Phục (${outfitChangeCreditCost} CR)`
              }}
            </span>
          </button>
        </div>
      </div>
    </section>

    <ToolSeoSection tool="outfit-change" />
  </div>
</template>
