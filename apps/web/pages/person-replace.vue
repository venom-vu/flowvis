<script setup lang="ts">
// Tạm ẩn: chuyển về trang chủ (bật lại bằng cách xóa dòng này và id khỏi HIDDEN_FEATURE_IDS).
definePageMeta({ middleware: () => navigateTo('/', { replace: true }) });
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
  title: 'Đổi Người Trong Ảnh AI — flowvis',
  description:
    'Thay nhân vật trong ảnh bằng người khác chỉ bằng một lần bấm. Giữ nguyên bối cảnh và bố cục của ảnh gốc.',
});

const { pricing, me, refreshAll } = usePricingConfig();
const { client } = useApiClient();
const { open: openAuthDialog } = useAuthDialog();

// Trạng thái đăng nhập
const isAuthenticated = computed<boolean>(() => Boolean(me.value));

// Hai ảnh đầu vào: Ảnh gốc (sceneKey) và Ảnh nhân vật mới (personKey)
const sceneKey = ref<string | null>(null);
const personKey = ref<string | null>(null);

// Trạng thái tác vụ
const activeTask = ref<Task | null>(null);
const { intakePaused, markPaused } = useSystemStatus();
const isSubmitting = ref<boolean>(false);
const submitErrorVi = ref<string | null>(null);

// Giá Đổi Người: 100 credit lấy từ GET /config/pricing (fallback 100)
const personReplaceCreditCost = computed<number>(
  () => pricing.value?.pipelines.personReplaceCredits ?? 100,
);

const userBalance = computed<number>(() => me.value?.balance ?? 0);
const hasEnoughBalance = computed<boolean>(() => {
  if (typeof me.value?.balance !== 'number') return true;
  return me.value.balance >= personReplaceCreditCost.value;
});

// Điều kiện kích hoạt nút "Tạo Đổi Người":
// 1. Đã đăng nhập
// 2. Đủ cả hai ảnh (sceneKey && personKey)
// 3. Số dư credit >= 100
// 4. Không trong trạng thái đang gửi (isSubmitting)
const canSubmit = computed<boolean>(() => {
  return Boolean(
    !intakePaused.value &&
          isAuthenticated.value &&
      sceneKey.value &&
      personKey.value &&
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
    const task = await client.createPersonReplaceTask({
      sceneKey: sceneKey.value!,
      personKey: personKey.value!,
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
    data-testid="page-person-replace"
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
        <span>Chi phí: {{ personReplaceCreditCost }} Credit</span>
      </span>
    </div>

    <!-- Header giới thiệu tính năng Đổi Người -->
    <section
      class="rounded-2xl border border-cyber-border bg-gradient-to-br from-cyber-surface via-slate-900 to-cyber-bg p-5 sm:p-6"
    >
      <div class="flex items-start gap-4">
        <span
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyber-violet/50 bg-cyber-violet/20 text-cyber-violet"
        >
          <Icon name="lucide:user-round-cog" class="h-6 w-6" />
        </span>
        <div class="space-y-1">
          <h1 class="font-display text-lg font-bold sm:text-2xl">
            Đổi Người Trong Ảnh AI
          </h1>
          <p class="text-xs text-cyber-muted sm:text-sm">
            Thay nhân vật trong ảnh bằng người khác chỉ bằng một lần bấm. Giữ nguyên
            bối cảnh và bố cục của ảnh gốc.
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
      <!-- Hai cột tải ảnh: Ảnh gốc & Nhân vật mới (Responsive 1 cột mobile 360px, 2 cột tablet/desktop) -->
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
        <!-- Ô tải 1: Ảnh gốc -->
        <div
          class="space-y-3 rounded-2xl border border-cyber-border bg-cyber-surface/60 p-4 sm:p-5"
          data-testid="scene-image-section"
        >
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-7 w-7 items-center justify-center rounded-lg border border-cyber-cyan/40 bg-cyber-cyan/15 font-mono text-xs font-bold text-cyber-cyan"
            >
              1
            </span>
            <div>
              <h2 class="text-sm font-bold text-cyber-text">
                Ảnh gốc
              </h2>
              <p class="text-[11px] text-cyber-muted">
                Ảnh có người cần được thay
              </p>
            </div>
          </div>

          <ImageUploader
            v-model="sceneKey"
            :maintenance-note="intakePaused"
            id-prefix="person-scene"
            label-vi="Chọn ảnh gốc"
            description-vi="Ảnh giữ nguyên bối cảnh, JPG/PNG/WebP ≤ 10 MB"
          />
        </div>

        <!-- Ô tải 2: Ảnh nhân vật mới -->
        <div
          class="space-y-3 rounded-2xl border border-cyber-border bg-cyber-surface/60 p-4 sm:p-5"
          data-testid="person-image-section"
        >
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-7 w-7 items-center justify-center rounded-lg border border-cyber-violet/40 bg-cyber-violet/15 font-mono text-xs font-bold text-cyber-violet"
            >
              2
            </span>
            <div>
              <h2 class="text-sm font-bold text-cyber-text">
                Ảnh nhân vật mới
              </h2>
              <p class="text-[11px] text-cyber-muted">
                Nhân vật sẽ thay vào ảnh gốc
              </p>
            </div>
          </div>

          <ImageUploader
            v-model="personKey"
            :maintenance-note="intakePaused"
            id-prefix="person-new"
            label-vi="Chọn ảnh nhân vật mới"
            description-vi="Ảnh nhân vật rõ nét, JPG/PNG/WebP ≤ 10 MB"
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
            Vui lòng đăng nhập để bắt đầu tạo tác vụ Đổi người trong ảnh và lưu lịch sử.
          </p>
        </div>
        <button
          type="button"
          data-testid="person-replace-login-button"
          class="touch-target inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-cyber-cyan px-4 py-2 text-xs font-bold text-black transition hover:bg-cyber-cyan/90"
          @click="openAuthDialog('login')"
        >
          <Icon name="lucide:log-in" class="h-4 w-4" />
          <span>Đăng nhập ngay</span>
        </button>
      </div>

      <!-- Vùng hành động: Số dư credit + Nút Nạp + Nút Tạo Đổi Người -->
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
            Số dư không đủ {{ personReplaceCreditCost }} credit để thực hiện tác vụ.
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

          <!-- Nút Tạo Đổi Người: min-h 48px, Slate Cyber, disabled nếu chưa đủ ảnh / ToS / credit -->
          <button
            type="button"
            data-testid="create-person-replace-button"
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
                  : `Tạo Đổi Người (${personReplaceCreditCost} CR)`
              }}
            </span>
          </button>
        </div>
      </div>
    </section>

    <ToolSeoSection tool="person-replace" />
  </div>
</template>
