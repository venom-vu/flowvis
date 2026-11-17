<script setup lang="ts">
import { computed, watch } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { usePricingConfig } from '~/composables/usePricingConfig';
import { useSessionHint } from '~/composables/useSessionHint';

const { me } = usePricingConfig();
const { sessionChecked } = useAuth();
const { hint } = useSessionHint();

// Đồng bộ gợi ý: có hồ sơ thì ghi nhớ, kiểm tra phiên xong mà không có thì xóa.
watch(
  [() => me.value?.email, sessionChecked],
  ([email, checked]) => {
    if (email) {
      hint.value = true;
    } else if (checked) {
      hint.value = false;
    }
  },
  { immediate: true },
);

// Chưa biết trạng thái: từng đăng nhập, phiên chưa kiểm tra xong, chưa có hồ sơ.
const authPending = computed<boolean>(
  () => hint.value && !sessionChecked.value && !me.value?.email,
);
</script>

<template>
  <div
    data-testid="layout-default"
    class="flex min-h-dvh w-full max-w-[100vw] flex-col overflow-x-hidden bg-cyber-bg pt-[68px] text-cyber-text"
  >
    <AppTopHeader
      :balance="me?.balance ?? null"
      :held="me?.held ?? null"
      :tier="me?.tier ?? 'FREE'"
      :email="me?.email ?? null"
      :role="me?.role ?? null"
      :auth-pending="authPending"
    />

    <main
      class="mx-auto w-full max-w-7xl flex-1 px-4 pb-6 pt-5 sm:px-6 lg:px-8 lg:pb-8"
    >
      <slot />
    </main>

    <AppFooter />

    <ZaloFloatingButton />

    <AppBottomNav />
    <AuthDialog />
  </div>
</template>
