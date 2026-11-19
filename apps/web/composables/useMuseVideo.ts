import { computed, ref, watch } from 'vue';
import {
  type MuseVideoAspectRatio,
  type MuseVideoCreateRequest,
  type Task,
} from '@flowvis/contracts';
import { useApiClient } from '~/composables/useApiClient';
import { usePricingConfig } from '~/composables/usePricingConfig';
import { useSystemStatus } from '~/composables/useSystemStatus';
import {
  MUSE_VIDEO_MAX_IMAGES,
  MUSE_VIDEO_MAX_TOTAL_BYTES,
  MUSE_VIDEO_PRICE,
  MUSE_VIDEO_PROMPT_MAX_LENGTH,
  MUSE_VIDEO_PROMPT_MIN_LENGTH,
  resolveApiErrorMessageVi,
} from '~/utils/api-client';
import { isPausedError } from '~/utils/system-status';

/**
 * Luồng tạo Task Muse Video dùng chung cho trang `/muse-video` và `FeatureWorkspaceDialog`:
 * 1-9 ảnh tham chiếu (giữ thứ tự chọn), prompt, tỉ lệ khung (mặc định theo ảnh); giá cố định; chống bấm đôi.
 */
export function useMuseVideo() {
  const { me, refreshAll } = usePricingConfig();
  const { client } = useApiClient();
  const { intakePaused, markPaused } = useSystemStatus();

  const prompt = ref<string>('');
  /** null = "Theo ảnh" (không gửi aspectRatio). */
  const aspectRatio = ref<MuseVideoAspectRatio | null>(null);
  /** Một ô cho mỗi ảnh; ô null là ô trống (đang tải hoặc chưa chọn). */
  const imageKeys = ref<Array<string | null>>([null]);
  /** Tổng dung lượng ảnh đã xác nhận (form cập nhật); server vẫn kiểm tra lại trước khi HOLD. */
  const totalBytes = ref<number>(0);
  /** true khi form còn ô đang kiểm tra/tải ảnh. */
  const pending = ref<boolean>(false);
  const activeTask = ref<Task | null>(null);
  const isSubmitting = ref<boolean>(false);
  const submitErrorVi = ref<string | null>(null);

  const isAuthenticated = computed<boolean>(() => Boolean(me.value));
  const price = computed<number>(() => MUSE_VIDEO_PRICE);
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
      promptTrimmed.value.length >= MUSE_VIDEO_PROMPT_MIN_LENGTH &&
      promptTrimmed.value.length <= MUSE_VIDEO_PROMPT_MAX_LENGTH,
  );
  /** Khóa đã xác nhận theo thứ tự ô, bỏ ô trống. */
  const selectedKeys = computed<string[]>(() =>
    imageKeys.value.filter((k): k is string => typeof k === 'string' && k.length > 0),
  );
  const imagesValid = computed<boolean>(() => {
    const keys = selectedKeys.value;
    return keys.length >= 1 && keys.length <= MUSE_VIDEO_MAX_IMAGES && new Set(keys).size === keys.length;
  });

  /** Ô trống nằm giữa (không phải ô cuối) nghĩa là ảnh đang tải lại/lỗi: chưa gửi để không lệch thứ tự. */
  const hasHole = computed<boolean>(() => imageKeys.value.slice(0, -1).some((k) => !k));
  const overSizeLimit = computed<boolean>(() => totalBytes.value > MUSE_VIDEO_MAX_TOTAL_BYTES);

  const canSubmit = computed<boolean>(
    () =>
      !intakePaused.value &&
      isAuthenticated.value &&
      promptValid.value &&
      imagesValid.value &&
      !overSizeLimit.value &&
      !pending.value &&
      !hasHole.value &&
      hasEnoughBalance.value &&
      !isSubmitting.value,
  );

  watch(
    [prompt, aspectRatio, imageKeys],
    () => {
      submitErrorVi.value = null;
    },
    { flush: 'sync', deep: true },
  );

  function buildRequest(): MuseVideoCreateRequest {
    return {
      prompt: promptTrimmed.value,
      imageKeys: selectedKeys.value,
      ...(aspectRatio.value ? { aspectRatio: aspectRatio.value } : {}),
    };
  }

  async function submit(): Promise<Task | null> {
    // Chống bấm đôi: cờ đặt đồng bộ trước mọi await.
    if (isSubmitting.value || !canSubmit.value) return null;
    isSubmitting.value = true;
    submitErrorVi.value = null;
    try {
      const task = await client.createMuseVideoTask(buildRequest());
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
    prompt.value = '';
    aspectRatio.value = null;
    imageKeys.value = [null];
    totalBytes.value = 0;
    pending.value = false;
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
    prompt,
    aspectRatio,
    imageKeys,
    selectedKeys,
    totalBytes,
    overSizeLimit,
    pending,
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
  };
}
