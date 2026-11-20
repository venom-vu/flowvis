import { computed, ref, watch } from 'vue';
import {
  VEO3_RESOLUTIONS,
  type Task,
  type Veo3AspectRatio,
  type Veo3CreateRequest,
  type Veo3Mode,
  type Veo3Resolution,
} from '@flowxis/contracts';
import { useApiClient } from '~/composables/useApiClient';
import { usePricingConfig } from '~/composables/usePricingConfig';
import { useSystemStatus } from '~/composables/useSystemStatus';
import {
  VEO3_PROMPT_MAX_LENGTH,
  VEO3_PROMPT_MIN_LENGTH,
  resolveApiErrorMessageVi,
  veo3Price,
} from '~/utils/api-client';
import { isPausedError } from '~/utils/system-status';

/**
 * Luồng tạo Task Veo 3 dùng chung cho trang `/veo-3` và `FeatureWorkspaceDialog`:
 * 3 chế độ (text, image, frames) đổi ô nhập; giá theo độ phân giải; chống bấm đôi.
 */
export function useVeo3() {
  const { me, refreshAll } = usePricingConfig();
  const { client } = useApiClient();
  const { intakePaused, markPaused } = useSystemStatus();

  const mode = ref<Veo3Mode>('text_to_video');
  const prompt = ref<string>('');
  const aspectRatio = ref<Veo3AspectRatio>('16:9');
  const resolution = ref<Veo3Resolution>('720p');
  const imageKey = ref<string | null>(null);
  const firstFrameKey = ref<string | null>(null);
  const lastFrameKey = ref<string | null>(null);
  const activeTask = ref<Task | null>(null);
  const isSubmitting = ref<boolean>(false);
  const submitErrorVi = ref<string | null>(null);

  const isAuthenticated = computed<boolean>(() => Boolean(me.value));
  const price = computed<number>(() => veo3Price(resolution.value));
  const balance = computed<number>(() => me.value?.balance ?? 0);
  const hasEnoughBalance = computed<boolean>(() =>
    typeof me.value?.balance === 'number' ? me.value.balance >= price.value : true,
  );
  const insufficientNoteVi = computed<string | null>(() =>
    !isAuthenticated.value || hasEnoughBalance.value
      ? null
      : `Bạn đang có ${balance.value} credit (cần ${price.value} cr để tạo video). Hãy nạp thêm credit để tiếp tục.`,
  );

  const promptTrimmed = computed<string>(() => prompt.value.trim());
  const promptValid = computed<boolean>(
    () =>
      promptTrimmed.value.length >= VEO3_PROMPT_MIN_LENGTH &&
      promptTrimmed.value.length <= VEO3_PROMPT_MAX_LENGTH,
  );
  const inputsReady = computed<boolean>(() => {
    if (mode.value === 'image_to_video') return Boolean(imageKey.value);
    if (mode.value === 'frames_to_video') return Boolean(firstFrameKey.value);
    return true;
  });

  const canSubmit = computed<boolean>(
    () =>
      !intakePaused.value &&
      isAuthenticated.value &&
      promptValid.value &&
      inputsReady.value &&
      hasEnoughBalance.value &&
      !isSubmitting.value,
  );

  watch(
    [mode, prompt, aspectRatio, resolution, imageKey, firstFrameKey, lastFrameKey],
    () => {
      submitErrorVi.value = null;
    },
    { flush: 'sync' },
  );

  function buildRequest(): Veo3CreateRequest {
    const base = {
      prompt: promptTrimmed.value,
      aspectRatio: aspectRatio.value,
      resolution: resolution.value,
    };
    if (mode.value === 'image_to_video') {
      return { ...base, mode: 'image_to_video', imageKey: imageKey.value! };
    }
    if (mode.value === 'frames_to_video') {
      return {
        ...base,
        mode: 'frames_to_video',
        firstFrameKey: firstFrameKey.value!,
        ...(lastFrameKey.value ? { lastFrameKey: lastFrameKey.value } : {}),
      };
    }
    return { ...base, mode: 'text_to_video' };
  }

  async function submit(): Promise<Task | null> {
    // Chống bấm đôi: cờ đặt đồng bộ trước mọi await.
    if (isSubmitting.value || !canSubmit.value) return null;
    isSubmitting.value = true;
    submitErrorVi.value = null;
    try {
      const task = await client.createVeo3Task(buildRequest());
      activeTask.value = task;
      refreshAll().catch(() => {});
      return task;
    } catch (error: unknown) {
      if (isPausedError(error)) markPaused();
      submitErrorVi.value = resolveApiErrorMessageVi(error);
      return null;
    } finally {
      isSubmitting.value = false;
    }
  }

  /** Xóa mọi trạng thái nhập/lỗi (không tải lại ví). */
  function clearState(): void {
    activeTask.value = null;
    submitErrorVi.value = null;
    mode.value = 'text_to_video';
    prompt.value = '';
    aspectRatio.value = '16:9';
    resolution.value = '720p';
    imageKey.value = null;
    firstFrameKey.value = null;
    lastFrameKey.value = null;
  }

  function reset(): void {
    clearState();
    refreshAll().catch(() => {});
  }

  return {
    me,
    refreshAll,
    isAuthenticated,
    intakePaused,
    mode,
    prompt,
    aspectRatio,
    resolution,
    imageKey,
    firstFrameKey,
    lastFrameKey,
    activeTask,
    isSubmitting,
    submitErrorVi,
    price,
    balance,
    hasEnoughBalance,
    insufficientNoteVi,
    promptValid,
    canSubmit,
    submit,
    reset,
    clearState,
    resolutions: VEO3_RESOLUTIONS,
  };
}
