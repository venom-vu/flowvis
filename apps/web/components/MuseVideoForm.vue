<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  MUSE_VIDEO_ASPECT_RATIOS,
  MUSE_VIDEO_DURATION_SECONDS,
  MUSE_VIDEO_MAX_IMAGES,
  MUSE_VIDEO_MAX_TOTAL_BYTES,
  MUSE_VIDEO_PROMPT_MAX_LENGTH,
  type ImageMeta,
  type MuseVideoAspectRatio,
} from '@flowvis/contracts';
import ImageUploader from '~/components/ImageUploader.vue';
import { formatFileSizeVi } from '~/utils/image-upload';

/**
 * Các ô nhập của Muse Video: 1-9 ảnh tham chiếu (thêm ô kế tiếp khi ô trước đã có ảnh, xóa được từng ảnh),
 * tỉ lệ khung (mặc định "Theo ảnh") và mô tả có đếm ký tự.
 */
const props = defineProps<{ idPrefix?: string; maintenanceNote?: boolean }>();

const prompt = defineModel<string>('prompt', { required: true });
/** null = "Theo ảnh". */
const aspectRatio = defineModel<MuseVideoAspectRatio | null>('aspectRatio', { default: null });
/** Một phần tử cho mỗi ô ảnh, theo thứ tự hiển thị; null = ô trống. */
const imageKeys = defineModel<Array<string | null>>('imageKeys', { required: true });
/** Tổng dung lượng các ảnh đã xác nhận (byte). */
const totalBytes = defineModel<number>('totalBytes', { default: 0 });
/** true khi có ô đang kiểm tra/tải ảnh. */
const pending = defineModel<boolean>('pending', { default: false });

const ASPECT_OPTIONS: ReadonlyArray<{ id: MuseVideoAspectRatio | null; labelVi: string }> = [
  { id: null, labelVi: 'Theo ảnh' },
  ...MUSE_VIDEO_ASPECT_RATIOS.map((ar) => ({ id: ar, labelVi: ar })),
];

let nextSlotId = 0;
const slotIds = ref<number[]>([]);
const slotBytes = ref<number[]>([]);
const slotBusy = ref<boolean[]>([]);

function syncSlots(): void {
  // Đồng bộ khi bên ngoài đặt lại danh sách (vd. clearState về [null]).
  if (slotIds.value.length !== imageKeys.value.length) {
    slotIds.value = imageKeys.value.map(() => nextSlotId++);
    slotBytes.value = imageKeys.value.map(() => 0);
    slotBusy.value = imageKeys.value.map(() => false);
    recomputeTotal();
    recomputePending();
  }
}

function recomputePending(): void {
  pending.value = slotBusy.value.some(Boolean);
}

function handleBusy(index: number, isBusy: boolean): void {
  slotBusy.value[index] = isBusy;
  recomputePending();
}

function recomputeTotal(): void {
  totalBytes.value = slotBytes.value.reduce(
    (sum, b, i) => sum + (imageKeys.value[i] ? b : 0),
    0,
  );
}

watch(() => imageKeys.value.length, syncSlots, { immediate: true });

function ensureTrailingEmptySlot(keys: Array<string | null>): Array<string | null> {
  const out = [...keys];
  if (out.length === 0) out.push(null);
  else if (out[out.length - 1] && out.length < MUSE_VIDEO_MAX_IMAGES) out.push(null);
  return out;
}

function handleChange(index: number, payload: { key: string | null; meta: ImageMeta | null }): void {
  const keys = [...imageKeys.value];
  keys[index] = payload.key;
  slotBytes.value[index] = payload.key ? (payload.meta?.sizeBytes ?? 0) : 0;
  const next = ensureTrailingEmptySlot(keys);
  if (next.length > keys.length) {
    slotIds.value.push(nextSlotId++);
    slotBytes.value.push(0);
    slotBusy.value.push(false);
  }
  imageKeys.value = next;
  recomputeTotal();
}

function removeSlot(index: number): void {
  const keys = [...imageKeys.value];
  keys.splice(index, 1);
  slotIds.value.splice(index, 1);
  slotBytes.value.splice(index, 1);
  slotBusy.value.splice(index, 1);
  const next = ensureTrailingEmptySlot(keys);
  while (slotIds.value.length < next.length) {
    slotIds.value.push(nextSlotId++);
    slotBytes.value.push(0);
    slotBusy.value.push(false);
  }
  imageKeys.value = next;
  recomputeTotal();
  recomputePending();
}

const filledCount = computed<number>(() => imageKeys.value.filter((k) => Boolean(k)).length);
const overLimit = computed<boolean>(() => totalBytes.value > MUSE_VIDEO_MAX_TOTAL_BYTES);
const maxTotalMb = MUSE_VIDEO_MAX_TOTAL_BYTES / (1024 * 1024);

const pid = (suffix: string): string => `${props.idPrefix ?? 'muse-video'}-${suffix}`;
</script>

<template>
  <div class="space-y-3.5" data-testid="muse-video-form">
    <div
      class="space-y-2.5 rounded-xl border border-cyber-border bg-cyber-bg/60 p-3 sm:p-3.5"
      data-testid="muse-video-images"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs font-semibold text-cyber-text sm:text-sm">
          Ảnh tham chiếu ({{ filledCount }}/{{ MUSE_VIDEO_MAX_IMAGES }})
        </p>
        <p
          class="font-mono text-[11px]"
          :class="overLimit ? 'text-cyber-danger' : 'text-cyber-muted'"
          data-testid="muse-video-total-size"
        >
          {{ formatFileSizeVi(totalBytes) }} / {{ maxTotalMb }} MB
        </p>
      </div>
      <p class="text-[11px] text-cyber-muted">
        Cần ít nhất 1 ảnh, tối đa {{ MUSE_VIDEO_MAX_IMAGES }} ảnh, tổng dung lượng không quá {{ maxTotalMb }} MB.
        Ảnh được gửi theo đúng thứ tự bên dưới.
      </p>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          v-for="(slotId, index) in slotIds"
          :key="slotId"
          class="relative space-y-1.5"
          :data-testid="`muse-video-image-slot-${index}`"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-semibold text-cyber-muted">Ảnh {{ index + 1 }}</span>
            <button
              v-if="imageKeys[index] || index < slotIds.length - 1"
              type="button"
              :aria-label="`Xóa ảnh ${index + 1}`"
              :data-testid="`muse-video-remove-${index}`"
              class="touch-target inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-cyber-muted transition hover:text-cyber-danger"
              @click="removeSlot(index)"
            >
              <Icon name="lucide:trash-2" class="h-4 w-4" />
            </button>
          </div>
          <ImageUploader
            :model-value="imageKeys[index] ?? null"
            :maintenance-note="maintenanceNote"
            :id-prefix="pid(`image-${slotId}`)"
            label-vi="Chọn ảnh tham chiếu"
            description-vi="JPG/PNG/WebP ≤ 10 MB"
            @change="handleChange(index, $event)"
            @busy="handleBusy(index, $event)"
          />
        </div>
      </div>

      <p
        v-if="overLimit"
        role="alert"
        data-testid="muse-video-size-error"
        class="text-xs font-semibold text-cyber-danger"
      >
        Tổng dung lượng ảnh vượt quá {{ maxTotalMb }} MB. Vui lòng bỏ bớt ảnh hoặc dùng ảnh nhẹ hơn.
      </p>
    </div>

    <div class="space-y-2 rounded-xl border border-cyber-border bg-cyber-bg/60 p-3 sm:p-3.5">
      <label :for="pid('prompt')" class="text-xs font-semibold text-cyber-text sm:text-sm">
        Mô tả video
      </label>
      <textarea
        :id="pid('prompt')"
        v-model="prompt"
        data-testid="muse-video-prompt"
        rows="5"
        :maxlength="MUSE_VIDEO_PROMPT_MAX_LENGTH"
        placeholder="Mô tả chủ thể, hành động và chuyển động camera bạn muốn..."
        class="w-full resize-y rounded-lg border border-cyber-border bg-cyber-surface p-3 text-sm text-cyber-text placeholder:text-cyber-muted focus:border-cyber-cyan focus:outline-none"
      />
      <p class="text-right font-mono text-[11px] text-cyber-muted">
        {{ prompt.length }}/{{ MUSE_VIDEO_PROMPT_MAX_LENGTH }}
      </p>
    </div>

    <fieldset class="space-y-2 rounded-xl border border-cyber-border bg-cyber-bg/60 p-3">
      <legend class="px-1 text-xs font-semibold text-cyber-text">Tỉ lệ khung</legend>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="opt in ASPECT_OPTIONS"
          :key="opt.id ?? 'auto'"
          type="button"
          :data-testid="`muse-video-aspect-${opt.id ? opt.id.replace(':', '-') : 'auto'}`"
          :aria-pressed="aspectRatio === opt.id"
          class="touch-target min-h-[48px] rounded-lg border px-1 text-xs font-semibold transition"
          :class="
            aspectRatio === opt.id
              ? 'border-cyber-cyan/60 bg-cyber-cyan/15 text-cyber-cyan'
              : 'border-cyber-border text-cyber-muted hover:border-cyber-cyan/40'
          "
          @click="aspectRatio = opt.id"
        >
          {{ opt.labelVi }}
        </button>
      </div>
    </fieldset>
    <p class="text-[11px] text-cyber-muted">
      Video dài khoảng {{ MUSE_VIDEO_DURATION_SECONDS }} giây, 720p, có âm thanh. Giá cố định mỗi video.
    </p>
  </div>
</template>
