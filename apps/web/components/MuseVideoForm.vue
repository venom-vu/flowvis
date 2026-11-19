<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import {
  MUSE_VIDEO_ASPECT_RATIOS,
  MUSE_VIDEO_DURATION_SECONDS,
  MUSE_VIDEO_MAX_IMAGES,
  MUSE_VIDEO_MAX_TOTAL_BYTES,
  MUSE_VIDEO_PROMPT_MAX_LENGTH,
  type ImageMeta,
  type MuseVideoAspectRatio,
} from '@flowvis/contracts';
import { useApiClient } from '~/composables/useApiClient';
import { useUploadFlow } from '~/composables/useUploadFlow';
import { formatFileSizeVi, validateImageFile } from '~/utils/image-upload';

/**
 * Các ô nhập của Muse Video:
 * - Lưới 1-9 ảnh tham chiếu chuẩn Storyboard 3x3 (hỗ trợ chọn một hoặc nhiều ảnh cùng lúc,
 *   kéo thả, đổi từng ảnh, xóa từng ảnh mà không bao giờ vỡ layout).
 * - Tỉ lệ khung (mặc định "Theo ảnh") và mô tả có đếm ký tự.
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

type SlotStatus = 'validating' | 'uploading' | 'ready' | 'error';

interface ReferenceImageSlot {
  id: number;
  status: SlotStatus;
  key: string | null;
  file: File | null;
  meta: ImageMeta | null;
  sizeBytes: number;
  previewUrl: string | null;
  progress: number;
  errorMessageVi: string | null;
  cancelUpload: () => void;
}

const { client } = useApiClient();

let nextSlotId = 1;
const slots = ref<ReferenceImageSlot[]>([]);
const isDraggingOver = ref<boolean>(false);
const addInputRef = ref<HTMLInputElement | null>(null);
const replaceInputRef = ref<HTMLInputElement | null>(null);
const replacingSlotId = ref<number | null>(null);
/** Danh sách khóa form vừa phát ra; watcher bỏ qua khi giá trị từ cha trùng với nó. */
let lastEmittedKeys: Array<string | null> | null = null;

function sameKeys(a: Array<string | null>, b: Array<string | null>): boolean {
  return a.length === b.length && a.every((k, i) => k === b[i]);
}

function revokePreview(url: string | null): void {
  if (url && url.startsWith('blob:') && typeof URL !== 'undefined') {
    URL.revokeObjectURL(url);
  }
}

function syncExternalModels(): void {
  totalBytes.value = slots.value.reduce(
    (sum, s) => sum + (s.status === 'ready' && s.key ? s.sizeBytes : 0),
    0,
  );
  pending.value = slots.value.some(
    (s) => s.status === 'validating' || s.status === 'uploading',
  );

  const keys = slots.value.map((s) => (s.status === 'ready' ? s.key : null));
  let nextKeys: Array<string | null>;
  if (keys.length === 0) {
    nextKeys = [null];
  } else if (keys.some((k) => !k) || keys.length < MUSE_VIDEO_MAX_IMAGES) {
    nextKeys = [...keys, null];
  } else {
    nextKeys = keys;
  }

  lastEmittedKeys = nextKeys;
  imageKeys.value = nextKeys;
}

// Đồng bộ khi bên ngoài đặt lại danh sách (vd. clearState() đặt imageKeys về [null]).
// Watcher chạy bất đồng bộ (flush 'pre') sau khi cha cập nhật v-model, nên không dùng cờ đồng bộ được:
// so với giá trị form vừa phát ra để không xóa nhầm các ô đang tải (lúc đó mọi khóa đều là null).
watch(
  () => imageKeys.value,
  (extKeys) => {
    if (lastEmittedKeys && sameKeys(extKeys, lastEmittedKeys)) return;
    const confirmedExt = extKeys.filter(
      (k): k is string => typeof k === 'string' && k.length > 0,
    );
    if (confirmedExt.length === 0 && slots.value.length > 0) {
      for (const s of slots.value) {
        s.cancelUpload();
        revokePreview(s.previewUrl);
      }
      slots.value = [];
      totalBytes.value = 0;
      pending.value = false;
    } else if (
      confirmedExt.length > 0 &&
      slots.value.length === 0
    ) {
      slots.value = confirmedExt.slice(0, MUSE_VIDEO_MAX_IMAGES).map((k) =>
        reactive<ReferenceImageSlot>({
          id: nextSlotId++,
          status: 'ready',
          key: k,
          file: null,
          meta: null,
          sizeBytes: 0,
          previewUrl: null,
          progress: 100,
          errorMessageVi: null,
          cancelUpload: () => {},
        }),
      );
      syncExternalModels();
    }
  },
  { immediate: true },
);

async function runSlotUpload(slot: ReferenceImageSlot, file: File): Promise<void> {
  slot.cancelUpload();
  revokePreview(slot.previewUrl);

  const flow = useUploadFlow(client);
  const stopProgressWatch = watch(
    flow.progress,
    (p) => {
      slot.progress = p;
    },
    { flush: 'sync' },
  );

  slot.cancelUpload = () => {
    stopProgressWatch();
    flow.cancel();
  };

  slot.file = file;
  slot.key = null;
  slot.meta = null;
  slot.sizeBytes = 0;
  slot.progress = 0;
  slot.errorMessageVi = null;
  slot.status = 'validating';
  slot.previewUrl =
    typeof URL !== 'undefined' ? URL.createObjectURL(file) : null;
  syncExternalModels();

  const validation = await validateImageFile(file);
  if (!slots.value.some((s) => s.id === slot.id) || slot.file !== file) {
    stopProgressWatch();
    return;
  }

  if (!validation.valid) {
    stopProgressWatch();
    // Bỏ file để "Chọn lại" mở hộp chọn ảnh mới thay vì kiểm tra lại đúng file hỏng.
    slot.file = null;
    slot.status = 'error';
    slot.errorMessageVi = validation.errorVi;
    syncExternalModels();
    return;
  }

  slot.meta = validation.meta;
  slot.status = 'uploading';
  syncExternalModels();

  const result = await flow.start({
    file,
    declaration: {
      mimeType: validation.meta.mimeType,
      sizeBytes: validation.meta.sizeBytes,
    },
    confirm: (key, opts) => client.confirmUpload(key, undefined, opts),
  });
  stopProgressWatch();

  if (!slots.value.some((s) => s.id === slot.id) || slot.file !== file) {
    return;
  }

  if (result.status === 'aborted') {
    return;
  }

  if (result.status === 'error') {
    slot.status = 'error';
    slot.errorMessageVi = result.messageVi;
    syncExternalModels();
    return;
  }

  slot.key = result.data.key;
  slot.meta = result.data.image;
  slot.sizeBytes = result.data.image.sizeBytes;
  slot.progress = 100;
  slot.status = 'ready';
  syncExternalModels();
}

function addFiles(fileList: FileList | File[]): void {
  if (props.maintenanceNote) return;
  const remaining = MUSE_VIDEO_MAX_IMAGES - slots.value.length;
  if (remaining <= 0) return;

  const files = Array.from(fileList).slice(0, remaining);
  for (const file of files) {
    const slot = reactive<ReferenceImageSlot>({
      id: nextSlotId++,
      status: 'validating',
      key: null,
      file,
      meta: null,
      sizeBytes: 0,
      previewUrl: null,
      progress: 0,
      errorMessageVi: null,
      cancelUpload: () => {},
    });
    slots.value.push(slot);
    void runSlotUpload(slot, file);
  }
}

function openAddDialog(): void {
  if (props.maintenanceNote || slots.value.length >= MUSE_VIDEO_MAX_IMAGES) return;
  addInputRef.value?.click();
}

function openReplaceDialog(slotId: number): void {
  if (props.maintenanceNote) return;
  replacingSlotId.value = slotId;
  replaceInputRef.value?.click();
}

function onAddInputChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    addFiles(input.files);
  }
  input.value = '';
}

function onReplaceInputChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const targetId = replacingSlotId.value;
  replacingSlotId.value = null;
  if (targetId != null && input.files && input.files[0]) {
    const slot = slots.value.find((s) => s.id === targetId);
    if (slot) {
      void runSlotUpload(slot, input.files[0]);
    }
  }
  input.value = '';
}

function retrySlot(slotId: number): void {
  const slot = slots.value.find((s) => s.id === slotId);
  if (slot && slot.file) {
    void runSlotUpload(slot, slot.file);
  } else if (slot) {
    openReplaceDialog(slot.id);
  }
}

function removeSlot(index: number): void {
  const slot = slots.value[index];
  if (!slot) return;
  slot.cancelUpload();
  revokePreview(slot.previewUrl);
  slots.value.splice(index, 1);
  syncExternalModels();
}

function clearAllSlots(): void {
  for (const s of slots.value) {
    s.cancelUpload();
    revokePreview(s.previewUrl);
  }
  slots.value = [];
  syncExternalModels();
}

function onDropFiles(event: DragEvent): void {
  isDraggingOver.value = false;
  if (props.maintenanceNote) return;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    addFiles(files);
  }
}

onBeforeUnmount(() => {
  for (const s of slots.value) {
    s.cancelUpload();
    revokePreview(s.previewUrl);
  }
});

const filledCount = computed<number>(
  () => slots.value.filter((s) => s.status === 'ready' && Boolean(s.key)).length,
);
const canAddMore = computed<boolean>(
  () => slots.value.length < MUSE_VIDEO_MAX_IMAGES,
);
const remainingSlots = computed<number>(
  () => Math.max(0, MUSE_VIDEO_MAX_IMAGES - slots.value.length),
);
const overLimit = computed<boolean>(() => totalBytes.value > MUSE_VIDEO_MAX_TOTAL_BYTES);
const maxTotalMb = MUSE_VIDEO_MAX_TOTAL_BYTES / (1024 * 1024);
const sizeUsagePercent = computed<number>(() =>
  Math.min(100, Math.round((totalBytes.value / MUSE_VIDEO_MAX_TOTAL_BYTES) * 100)),
);

const pid = (suffix: string): string => `${props.idPrefix ?? 'muse-video'}-${suffix}`;
</script>

<template>
  <div class="space-y-3.5" data-testid="muse-video-form">
    <!-- Input ẩn: thêm nhiều ảnh cùng lúc & đổi riêng 1 ảnh theo vị trí -->
    <input
      :id="pid('add-images-input')"
      ref="addInputRef"
      type="file"
      multiple
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      :disabled="maintenanceNote || !canAddMore"
      @change="onAddInputChange"
    />
    <input
      :id="pid('replace-image-input')"
      ref="replaceInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      :disabled="maintenanceNote"
      @change="onReplaceInputChange"
    />

    <!-- Khối Ảnh tham chiếu (0/9) dạng lưới Storyboard 3x3 chuyên nghiệp -->
    <div
      class="space-y-3 rounded-xl border border-cyber-border bg-cyber-bg/60 p-3 sm:p-3.5"
      data-testid="muse-video-images"
      @dragenter.prevent="isDraggingOver = true"
      @dragover.prevent="isDraggingOver = true"
      @dragleave.prevent="isDraggingOver = false"
      @drop.prevent="onDropFiles"
    >
      <!-- Header: Tiêu đề + Bộ đếm (0/9) + Dung lượng + Thao tác nhanh -->
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-cyber-cyan/40 bg-cyber-cyan/15 text-cyber-cyan"
          >
            <Icon name="lucide:images" class="h-3.5 w-3.5" />
          </span>
          <p class="text-xs font-semibold text-cyber-text sm:text-sm">
            Ảnh tham chiếu ({{ filledCount }}/{{ MUSE_VIDEO_MAX_IMAGES }})
          </p>
        </div>

        <div class="flex items-center gap-2">
          <p
            class="rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold"
            :class="
              overLimit
                ? 'border-cyber-danger/50 bg-cyber-danger/15 text-cyber-danger'
                : 'border-cyber-border bg-cyber-surface/80 text-cyber-muted'
            "
            data-testid="muse-video-total-size"
          >
            {{ formatFileSizeVi(totalBytes) }} / {{ maxTotalMb }} MB
          </p>

          <button
            v-if="slots.length > 1"
            type="button"
            data-testid="muse-video-clear-all"
            class="touch-target inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-cyber-border bg-cyber-surface px-2 py-1 text-[11px] font-semibold text-cyber-muted transition hover:border-cyber-danger/50 hover:text-cyber-danger"
            @click="clearAllSlots"
          >
            <Icon name="lucide:trash-2" class="h-3 w-3" />
            <span>Xóa hết</span>
          </button>
        </div>
      </div>

      <!-- Thanh đo dung lượng trực quan + Hướng dẫn -->
      <div class="space-y-1.5">
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-cyber-surface">
          <div
            class="h-full rounded-full transition-all duration-200"
            :class="
              overLimit
                ? 'bg-cyber-danger'
                : 'bg-gradient-to-r from-cyber-violet to-cyber-cyan'
            "
            :style="{ width: `${sizeUsagePercent}%` }"
          />
        </div>
        <p class="text-[11px] leading-relaxed text-cyber-muted">
          Tải từ 1 đến {{ MUSE_VIDEO_MAX_IMAGES }} ảnh (JPG/PNG/WebP ≤ 10 MB/ảnh, tổng ≤ {{ maxTotalMb }} MB).
          Ảnh được AI kết hợp theo đúng thứ tự đánh số <span class="font-mono text-cyber-cyan">#1 → #{{ MUSE_VIDEO_MAX_IMAGES }}</span>.
        </p>
      </div>

      <!-- Trạng thái 0 ảnh: Dropzone chọn một hoặc nhiều ảnh cùng lúc -->
      <div
        v-if="slots.length === 0"
        data-testid="muse-video-image-slot-0"
        class="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition"
        :class="
          isDraggingOver
            ? 'border-cyber-cyan bg-cyber-cyan/10'
            : 'border-cyber-border bg-cyber-surface/40 hover:border-cyber-violet/70 hover:bg-cyber-surface/70'
        "
      >
        <div
          class="flex h-11 w-11 items-center justify-center rounded-xl border border-cyber-violet/40 bg-cyber-violet/15 text-cyber-violet shadow-sm transition group-hover:scale-105"
        >
          <Icon name="lucide:upload-cloud" class="h-5 w-5" />
        </div>

        <p class="mt-2.5 text-xs font-semibold text-cyber-text sm:text-sm">
          Chọn hoặc kéo thả ảnh tham chiếu vào đây
        </p>
        <p class="mt-0.5 text-[11px] text-cyber-muted">
          Có thể chọn nhiều ảnh cùng lúc (tối đa {{ MUSE_VIDEO_MAX_IMAGES }} ảnh)
        </p>

        <button
          type="button"
          data-testid="muse-video-add-button"
          :disabled="maintenanceNote"
          class="touch-target mt-3 inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-xl border border-cyber-violet/50 bg-cyber-violet/15 px-4 py-2 text-xs font-semibold text-cyber-text transition hover:bg-cyber-violet/25 disabled:cursor-not-allowed disabled:opacity-50"
          @click="openAddDialog"
        >
          <Icon name="lucide:image-plus" class="h-4 w-4 text-cyber-cyan" />
          <span>Chọn ảnh từ thiết bị</span>
        </button>

        <!-- Dải chỉ báo 9 slot trực quan -->
        <div class="mt-3.5 flex items-center gap-1">
          <span
            v-for="n in MUSE_VIDEO_MAX_IMAGES"
            :key="n"
            class="flex h-5 w-5 items-center justify-center rounded border border-cyber-border/70 bg-cyber-bg/70 font-mono text-[10px] text-cyber-muted"
          >
            {{ n }}
          </span>
        </div>
      </div>

      <!-- Trạng thái có ảnh (1..9): Lưới Storyboard 3 cột đồng nhất, không vỡ layout -->
      <div
        v-else
        class="grid grid-cols-3 gap-2 sm:gap-2.5"
        data-testid="muse-video-grid"
      >
        <div
          v-for="(slot, index) in slots"
          :key="slot.id"
          :data-testid="`muse-video-image-slot-${index}`"
          class="group relative aspect-square overflow-hidden rounded-xl border transition"
          :class="[
            slot.status === 'ready'
              ? 'border-cyber-emerald/50 bg-cyber-surface hover:border-cyber-cyan'
              : slot.status === 'error'
                ? 'border-cyber-danger/60 bg-cyber-danger/10'
                : 'border-cyber-cyan/50 bg-cyber-surface/90',
          ]"
        >
          <!-- Ảnh xem trước nền -->
          <img
            v-if="slot.previewUrl"
            :src="slot.previewUrl"
            :alt="`Ảnh tham chiếu ${index + 1}`"
            class="h-full w-full object-cover"
            :class="{
              'opacity-30 blur-[1px]':
                slot.status === 'validating' || slot.status === 'uploading',
              'opacity-20': slot.status === 'error',
            }"
          />
          <div
            v-else
            class="flex h-full w-full items-center justify-center bg-cyber-surface/80 text-cyber-emerald"
          >
            <Icon name="lucide:image" class="h-6 w-6 opacity-60" />
          </div>

          <!-- Badge số thứ tự #1..#9 cố định ở góc trên trái -->
          <span
            class="pointer-events-none absolute left-1.5 top-1.5 z-10 inline-flex h-6 min-w-[26px] items-center justify-center rounded-md border px-1.5 font-mono text-[11px] font-bold shadow-sm"
            :class="
              slot.status === 'error'
                ? 'border-cyber-danger/60 bg-cyber-bg/95 text-cyber-danger'
                : 'border-cyber-cyan/50 bg-cyber-bg/90 text-cyber-cyan'
            "
          >
            #{{ index + 1 }}
          </span>

          <!-- Nút xóa ô ảnh ở góc trên phải (vùng chạm chuẩn 48x48px) -->
          <button
            type="button"
            :aria-label="`Xóa ảnh ${index + 1}`"
            :data-testid="`muse-video-remove-${index}`"
            class="touch-target absolute -right-1.5 -top-1.5 z-10 inline-flex min-h-[48px] min-w-[48px] items-center justify-center"
            @click.stop="removeSlot(index)"
          >
            <span
              class="flex h-7 w-7 items-center justify-center rounded-lg border border-cyber-border/90 bg-cyber-bg/90 text-cyber-muted shadow transition hover:border-cyber-danger hover:bg-cyber-danger/20 hover:text-cyber-danger"
            >
              <Icon name="lucide:x" class="h-3.5 w-3.5" />
            </span>
          </button>

          <!-- Nội dung trạng thái 1: Đang kiểm tra / Đang tải lên -->
          <div
            v-if="slot.status === 'validating' || slot.status === 'uploading'"
            class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-cyber-bg/65 p-2 text-center"
          >
            <Icon name="lucide:loader-2" class="h-5 w-5 animate-spin text-cyber-cyan" />
            <span class="font-mono text-[11px] font-bold text-cyber-cyan">
              {{ slot.status === 'validating' ? 'Kiểm tra...' : `${slot.progress}%` }}
            </span>
            <div class="h-1 w-4/5 overflow-hidden rounded-full bg-cyber-surface">
              <div
                class="h-full bg-gradient-to-r from-cyber-violet to-cyber-cyan transition-all duration-150"
                :style="{ width: `${slot.progress}%` }"
              />
            </div>
          </div>

          <!-- Nội dung trạng thái 2: Lỗi tải ảnh -->
          <div
            v-else-if="slot.status === 'error'"
            class="absolute inset-x-0 bottom-0 top-7 flex flex-col items-center justify-between bg-cyber-bg/85 p-2 text-center"
          >
            <div class="flex flex-1 flex-col items-center justify-center gap-1">
              <Icon name="lucide:alert-triangle" class="h-4 w-4 shrink-0 text-cyber-danger" />
              <p
                class="line-clamp-2 text-[10px] font-medium leading-tight text-cyber-danger"
                :title="slot.errorMessageVi ?? 'Lỗi tải ảnh'"
              >
                {{ slot.errorMessageVi || 'Ảnh không hợp lệ' }}
              </p>
            </div>
            <button
              type="button"
              class="touch-target inline-flex min-h-[28px] w-full items-center justify-center gap-1 rounded-md border border-cyber-border bg-cyber-surface px-2 py-1 text-[10px] font-semibold text-cyber-text transition hover:border-cyber-cyan"
              @click.stop="retrySlot(slot.id)"
            >
              <Icon name="lucide:refresh-cw" class="h-3 w-3 text-cyber-cyan" />
              <span>Chọn lại</span>
            </button>
          </div>

          <!-- Nội dung trạng thái 3: Đã sẵn sàng (Thanh đáy hiển thị dung lượng + nút Đổi ảnh) -->
          <div
            v-else
            class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/90 via-black/65 to-transparent px-2 pb-1.5 pt-5"
          >
            <span class="truncate font-mono text-[10px] font-medium text-cyber-text/90">
              {{ slot.sizeBytes > 0 ? formatFileSizeVi(slot.sizeBytes) : 'Sẵn sàng' }}
            </span>
            <button
              type="button"
              :aria-label="`Đổi ảnh ${index + 1}`"
              :data-testid="`muse-video-replace-${index}`"
              class="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/15 bg-cyber-bg/85 px-1.5 py-0.5 text-[10px] font-semibold text-cyber-cyan transition hover:border-cyber-cyan hover:bg-cyber-bg"
              @click.stop="openReplaceDialog(slot.id)"
            >
              <Icon name="lucide:refresh-cw" class="h-2.5 w-2.5" />
              <span>Đổi</span>
            </button>
          </div>
        </div>

        <!-- Ô "+ Thêm ảnh" nằm ngay trong lưới 3x3 khi chưa đủ 9 ảnh -->
        <button
          v-if="canAddMore"
          type="button"
          :data-testid="`muse-video-image-slot-${slots.length}`"
          :disabled="maintenanceNote"
          class="touch-target group relative flex aspect-square min-h-[48px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-2 text-center transition disabled:cursor-not-allowed disabled:opacity-50"
          :class="
            isDraggingOver
              ? 'border-cyber-cyan bg-cyber-cyan/10 text-cyber-cyan'
              : 'border-cyber-border bg-cyber-surface/35 text-cyber-muted hover:border-cyber-cyan/60 hover:bg-cyber-cyan/5 hover:text-cyber-text'
          "
          @click="openAddDialog"
        >
          <span
            class="pointer-events-none absolute left-1.5 top-1.5 inline-flex h-5 min-w-[22px] items-center justify-center rounded border border-cyber-border bg-cyber-bg/80 px-1 font-mono text-[10px] font-semibold text-cyber-muted"
          >
            #{{ slots.length + 1 }}
          </span>
          <span
            class="flex h-8 w-8 items-center justify-center rounded-lg border border-cyber-border bg-cyber-surface text-cyber-cyan transition group-hover:border-cyber-cyan/50 group-hover:scale-105"
          >
            <Icon name="lucide:plus" class="h-4 w-4" />
          </span>
          <span class="text-[11px] font-semibold text-cyber-text">Thêm ảnh</span>
          <span class="font-mono text-[10px] text-cyber-muted">
            Còn {{ remainingSlots }} ô
          </span>
        </button>
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
