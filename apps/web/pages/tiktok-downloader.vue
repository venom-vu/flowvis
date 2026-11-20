<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { usePageSeo } from "~/composables/usePageSeo";
import {
  TikTokDownloadError,
  buildTikTokFileName,
  downloadTikTokBlob,
  extractTikTokUrl,
  formatBytesVi,
  resolveTikTokVideo,
  saveBlobAsFile,
  type TikTokVideoInfo,
} from "~/utils/tiktok-downloader";

usePageSeo({
  title: "Tải Video TikTok Không Logo — flowxis",
  description:
    "Dán liên kết video TikTok để tải về máy bản MP4 không watermark, chất lượng HD. Miễn phí, xử lý ngay trên trình duyệt, không lưu video của bạn.",
});

const link = ref<string>("");
const info = ref<TikTokVideoInfo | null>(null);
const errorVi = ref<string | null>(null);
const pasteNoticeVi = ref<string | null>(null);
const isResolving = ref<boolean>(false);
const isDownloading = ref<boolean>(false);
const progress = ref<number | null>(null);
const doneVi = ref<string | null>(null);
const coverFailed = ref<boolean>(false);
const isPlaying = ref<boolean>(false);
const linkInputRef = ref<{ focus: () => void } | null>(null);
const canPasteClipboard = ref<boolean>(false);
let controller: AbortController | null = null;

const hasValidLink = computed<boolean>(
  () => extractTikTokUrl(link.value) !== null,
);
const progressPercent = computed<number | null>(() =>
  progress.value === null ? null : Math.round(progress.value * 100),
);

watch(
  link,
  () => {
    errorVi.value = null;
  },
  { flush: "sync" },
);

watch(
  link,
  () => {
    errorVi.value = null;
    pasteNoticeVi.value = null;
  },
  { flush: "sync" },
);

onMounted(() => {
  canPasteClipboard.value =
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.readText === "function";
});

function reportError(error: unknown): void {
  if (error instanceof TikTokDownloadError) {
    if (error.code !== "ABORTED") {
      errorVi.value = error.messageVi;
    }
    return;
  }
  errorVi.value = "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
}

async function handleResolve(): Promise<void> {
  if (!hasValidLink.value || isResolving.value || isDownloading.value) {
    return;
  }
  errorVi.value = null;
  pasteNoticeVi.value = null;
  doneVi.value = null;
  info.value = null;
  coverFailed.value = false;
  isPlaying.value = false;
  isResolving.value = true;
  controller = new AbortController();
  try {
    info.value = await resolveTikTokVideo(link.value, fetch, controller.signal);
  } catch (error: unknown) {
    reportError(error);
  } finally {
    isResolving.value = false;
  }
}

async function handleDownload(): Promise<void> {
  const current = info.value;
  if (!current || isDownloading.value) {
    return;
  }
  errorVi.value = null;
  doneVi.value = null;
  progress.value = 0;
  isDownloading.value = true;
  controller = new AbortController();
  try {
    const blob = await downloadTikTokBlob(
      current,
      (ratio) => {
        progress.value = ratio;
      },
      controller.signal,
    );
    saveBlobAsFile(blob, buildTikTokFileName(current));
    doneVi.value =
      "Đã tải xong. Kiểm tra thư mục Tải xuống trên thiết bị của bạn.";
  } catch (error: unknown) {
    reportError(error);
  } finally {
    isDownloading.value = false;
    progress.value = null;
  }
}

function handleCancel(): void {
  controller?.abort();
}

function handleReset(): void {
  controller?.abort();
  link.value = "";
  info.value = null;
  errorVi.value = null;
  pasteNoticeVi.value = null;
  doneVi.value = null;
  coverFailed.value = false;
  isPlaying.value = false;
  linkInputRef.value?.focus();
}

// Link CDN có hạn hoặc bị chặn phát: quay về ảnh bìa và báo lỗi, nút tải vẫn dùng được.
function handlePreviewError(): void {
  isPlaying.value = false;
  errorVi.value =
    "Không phát được bản xem trước (liên kết có thể đã hết hạn). Bạn vẫn có thể thử bấm tải về.";
}

onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <div
    class="mx-auto max-w-4xl space-y-6 py-2 sm:py-4"
    data-testid="page-tiktok-downloader"
  >
    <!-- Header giới thiệu công cụ -->
    <section
      class="rounded-2xl border border-cyber-border bg-gradient-to-br from-cyber-surface via-slate-900 to-cyber-bg p-5 sm:p-6"
    >
      <div
        class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"
      >
        <div class="flex items-start gap-4">
          <span
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyber-cyan/50 bg-cyber-cyan/20 text-cyber-cyan"
          >
            <Icon name="lucide:download" class="h-6 w-6" />
          </span>
          <div class="space-y-1">
            <h1
              class="font-display text-lg font-bold text-cyber-text sm:text-2xl"
            >
              Tải Video TikTok Không Logo
            </h1>
            <p
              class="max-w-xl text-xs leading-relaxed text-cyber-muted sm:text-sm"
            >
              Dán liên kết video TikTok để tải về máy bản MP4 không watermark,
              chất lượng HD. Xử lý trực tiếp trên trình duyệt, không lưu video
              của bạn.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Khung dán liên kết TikTok -->
    <section
      class="space-y-4 rounded-2xl border border-cyber-border bg-cyber-surface/60 p-4 sm:p-6"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-bold text-cyber-text">
            Liên kết video TikTok
          </h2>
          <p class="text-[11px] text-cyber-muted">
            Hỗ trợ tiktok.com, vt.tiktok.com, vm.tiktok.com hoặc đoạn chia sẻ
            kèm liên kết
          </p>
        </div>
      </div>

      <form
        class="flex flex-col gap-3 sm:flex-row sm:items-start"
        @submit.prevent="handleResolve"
      >
        <label for="tiktok-link-input" class="sr-only"
          >Liên kết video TikTok</label
        >
        <BaseInput
          id="tiktok-link-input"
          ref="linkInputRef"
          v-model="link"
          class="flex-1"
          variant="cyber"
          focus-accent="cyan"
          type="text"
          inputmode="url"
          left-icon="lucide:link"
          placeholder="https://vt.tiktok.com/..."
          autocomplete="off"
          :disabled="isResolving || isDownloading"
          data-testid="tiktok-link-input"
        />
        <button
          type="submit"
          data-testid="tiktok-resolve-button"
          :disabled="!hasValidLink || isResolving || isDownloading"
          class="touch-target inline-flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-cyber-violet px-6 py-3 text-sm font-semibold text-cyber-text transition hover:bg-cyber-violet/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon
            v-if="isResolving"
            name="lucide:loader-2"
            class="h-4 w-4 animate-spin"
          />
          <Icon v-else name="lucide:search" class="h-4 w-4" />
          <span>{{ isResolving ? "Đang lấy video..." : "Lấy video" }}</span>
        </button>
      </form>

      <p
        v-if="link.trim() && !hasValidLink"
        role="alert"
        class="flex items-center gap-1.5 text-xs text-cyber-warning"
      >
        <Icon name="lucide:info" class="h-3.5 w-3.5 shrink-0" />
        <span
          >Chưa nhận ra liên kết TikTok. Hỗ trợ tiktok.com, vt.tiktok.com và
          vm.tiktok.com.</span
        >
      </p>

      <p v-if="pasteNoticeVi" class="text-xs text-cyber-muted">
        {{ pasteNoticeVi }}
      </p>

      <div
        v-if="errorVi"
        role="alert"
        data-testid="tiktok-error"
        class="flex items-start gap-2.5 rounded-xl border border-cyber-danger/40 bg-cyber-danger/10 p-4 text-xs text-cyber-danger sm:text-sm"
      >
        <Icon name="lucide:alert-circle" class="mt-0.5 h-4 w-4 shrink-0" />
        <span>{{ errorVi }}</span>
      </div>
    </section>

    <!-- Trạng thái đang phân tích liên kết -->
    <section
      v-if="isResolving"
      data-testid="tiktok-resolving"
      role="status"
      aria-live="polite"
      class="overflow-hidden rounded-2xl border border-cyber-border bg-cyber-surface shadow-xl"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-cyber-border px-4 py-3.5 sm:px-6"
      >
        <div class="flex items-center gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyber-violet/50 bg-cyber-violet/15 text-cyber-violet"
          >
            <Icon name="lucide:loader-2" class="h-5 w-5 animate-spin" />
          </span>
          <div>
            <h2
              class="font-display text-sm font-bold text-cyber-text sm:text-base"
            >
              Đang lấy thông tin video...
            </h2>
            <p class="text-xs text-cyber-muted">
              Đang tìm liên kết MP4 chất lượng cao không watermark
            </p>
          </div>
        </div>

        <button
          type="button"
          class="touch-target inline-flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-cyber-border bg-cyber-bg px-4 py-2 text-xs font-semibold text-cyber-muted transition hover:border-cyber-danger/50 hover:text-cyber-danger"
          @click="handleCancel"
        >
          <Icon name="lucide:x" class="h-4 w-4" />
          <span>Hủy</span>
        </button>
      </div>

      <div class="flex animate-pulse flex-col gap-5 p-4 sm:flex-row sm:p-6">
        <div
          class="mx-auto aspect-[9/16] w-40 shrink-0 rounded-xl border border-cyber-border bg-cyber-bg/80 sm:mx-0 sm:w-44"
        />
        <div class="flex flex-1 flex-col justify-between gap-4">
          <div class="space-y-3">
            <div class="h-6 w-28 rounded-lg bg-cyber-border/50" />
            <div class="h-4 w-full rounded bg-cyber-border/40" />
            <div class="h-4 w-4/5 rounded bg-cyber-border/40" />
            <div class="grid grid-cols-2 gap-2.5 pt-2 sm:grid-cols-3">
              <div
                class="h-14 rounded-xl border border-cyber-border/60 bg-cyber-bg/70"
              />
              <div
                class="h-14 rounded-xl border border-cyber-border/60 bg-cyber-bg/70"
              />
              <div
                class="h-14 rounded-xl border border-cyber-border/60 bg-cyber-bg/70"
              />
            </div>
          </div>
          <div class="flex gap-2.5">
            <div class="h-12 w-44 rounded-xl bg-cyber-border/50" />
            <div class="h-12 w-36 rounded-xl bg-cyber-border/40" />
          </div>
        </div>
      </div>
    </section>

    <!-- Kết quả thông tin video & tải về -->
    <section
      v-else-if="info"
      data-testid="tiktok-result"
      class="overflow-hidden rounded-2xl border border-cyber-border bg-cyber-surface shadow-xl"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-cyber-border px-4 py-3.5 sm:px-6"
      >
        <div class="flex items-center gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
            :class="
              doneVi
                ? 'border-cyber-success/50 bg-cyber-success/15 text-cyber-success'
                : 'border-cyber-cyan/40 bg-cyber-cyan/15 text-cyber-cyan'
            "
          >
            <Icon
              :name="
                doneVi
                  ? 'lucide:check-circle-2'
                  : isDownloading
                    ? 'lucide:loader-2'
                    : 'lucide:film'
              "
              class="h-5 w-5"
              :class="{ 'animate-spin': isDownloading && !doneVi }"
            />
          </span>
          <div>
            <h2
              class="font-display text-sm font-bold text-cyber-text sm:text-base"
            >
              {{
                doneVi
                  ? "Tải video hoàn tất"
                  : isDownloading
                    ? "Đang tải video về máy..."
                    : "Video đã sẵn sàng"
              }}
            </h2>
            <p class="text-xs text-cyber-muted">
              {{
                doneVi
                  ? "File MP4 không watermark đã được lưu về thiết bị"
                  : isDownloading
                    ? "Vui lòng giữ tab mở đến khi quá trình tải kết thúc"
                    : "Bản MP4 không watermark, sẵn sàng tải xuống"
              }}
            </p>
          </div>
        </div>

        <span
          class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-semibold"
          :class="
            doneVi
              ? 'border-cyber-success/50 bg-cyber-success/15 text-cyber-success'
              : 'border-cyber-cyan/40 bg-cyber-cyan/15 text-cyber-cyan'
          "
        >
          <Icon v-if="doneVi" name="lucide:check" class="h-3.5 w-3.5" />
          <Icon
            v-else-if="isDownloading"
            name="lucide:download"
            class="h-3.5 w-3.5"
          />
          <span>
            {{
              doneVi
                ? "Đã tải xong"
                : isDownloading
                  ? progressPercent === null
                    ? "Đang tải..."
                    : `${progressPercent}%`
                  : info.isHd
                    ? "HD · Không logo"
                    : "SD · Không logo"
            }}
          </span>
        </span>
      </div>

      <div class="flex flex-col gap-5 p-4 sm:flex-row sm:p-6">
        <!-- Ảnh bìa video -->
        <div
          class="relative mx-auto aspect-[9/16] w-40 shrink-0 overflow-hidden rounded-xl border border-cyber-border bg-black sm:mx-0 sm:w-44"
        >
          <video
            v-if="isPlaying"
            :src="info.videoUrl"
            :poster="coverFailed ? undefined : info.coverUrl"
            data-testid="tiktok-preview-video"
            class="h-full w-full object-contain"
            controls
            autoplay
            playsinline
            preload="metadata"
            @error="handlePreviewError"
          />
          <template v-else>
            <img
              v-if="info.coverUrl && !coverFailed"
              :src="info.coverUrl"
              alt="Ảnh bìa video TikTok"
              referrerpolicy="no-referrer"
              class="h-full w-full object-cover"
              @error="coverFailed = true"
            />
            <div
              v-else
              class="flex h-full w-full flex-col items-center justify-center gap-2 bg-cyber-bg/80 text-cyber-muted"
            >
              <Icon name="lucide:video" class="h-8 w-8" />
              <span class="font-mono text-[11px]">MP4</span>
            </div>

            <button
              type="button"
              data-testid="tiktok-preview-button"
              aria-label="Xem trước video"
              class="absolute inset-0 flex items-center justify-center bg-black/25 transition hover:bg-black/40"
              @click="isPlaying = true"
            >
              <span
                class="flex h-14 w-14 items-center justify-center rounded-full border border-cyber-text/40 bg-cyber-bg/80 text-cyber-text"
              >
                <Icon name="lucide:play" class="h-6 w-6" />
              </span>
            </button>
          </template>

          <div
            v-if="!isPlaying"
            class="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2.5 pb-2 pt-6 font-mono text-[11px]"
          >
            <span class="font-bold text-cyber-cyan">{{
              info.isHd ? "HD" : "SD"
            }}</span>
            <span v-if="info.durationSeconds" class="text-cyber-text"
              >{{ info.durationSeconds }}s</span
            >
          </div>
        </div>

        <!-- Thông tin chi tiết & nút tải -->
        <div class="flex min-w-0 flex-1 flex-col justify-between gap-4">
          <div class="space-y-3">
            <div v-if="info.author" class="flex items-center">
              <span
                class="inline-flex max-w-full items-center gap-1.5 truncate rounded-lg border border-cyber-violet/40 bg-cyber-violet/15 px-2.5 py-1 font-mono text-xs font-semibold text-cyber-violet"
              >
                <Icon name="lucide:at-sign" class="h-3.5 w-3.5 shrink-0" />
                <span class="truncate">{{ info.author }}</span>
              </span>
            </div>

            <p
              class="line-clamp-3 text-sm font-medium leading-relaxed text-cyber-text sm:text-base"
            >
              {{ info.title || "Video TikTok" }}
            </p>

            <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <div
                class="rounded-xl border border-cyber-border bg-cyber-bg/70 px-3 py-2"
              >
                <span class="block text-[11px] text-cyber-muted"
                  >Thời lượng</span
                >
                <span
                  class="mt-0.5 block font-mono text-xs font-bold text-cyber-text"
                >
                  {{
                    info.durationSeconds ? `${info.durationSeconds} giây` : "—"
                  }}
                </span>
              </div>
              <div
                class="rounded-xl border border-cyber-border bg-cyber-bg/70 px-3 py-2"
              >
                <span class="block text-[11px] text-cyber-muted"
                  >Chất lượng</span
                >
                <span
                  class="mt-0.5 block font-mono text-xs font-bold text-cyber-cyan"
                >
                  {{ info.isHd ? "HD · Không logo" : "SD · Không logo" }}
                </span>
              </div>
              <div
                class="col-span-2 rounded-xl border border-cyber-border bg-cyber-bg/70 px-3 py-2 sm:col-span-1"
              >
                <span class="block text-[11px] text-cyber-muted"
                  >Dung lượng</span
                >
                <span
                  class="mt-0.5 block font-mono text-xs font-bold text-cyber-text"
                >
                  {{
                    info.sizeBytes ? formatBytesVi(info.sizeBytes) : "Chưa rõ"
                  }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="isDownloading"
            class="space-y-1.5 rounded-xl border border-cyber-cyan/40 bg-cyber-bg/80 p-3"
            aria-live="polite"
          >
            <div
              class="flex items-center justify-between font-mono text-xs text-cyber-muted"
            >
              <span>Đang tải file MP4...</span>
              <span class="font-bold text-cyber-cyan">
                {{ progressPercent === null ? "..." : `${progressPercent}%` }}
              </span>
            </div>
            <div
              class="h-2 w-full overflow-hidden rounded-full border border-cyber-border bg-cyber-surface"
            >
              <div
                role="progressbar"
                aria-label="Tiến độ tải video TikTok"
                :aria-valuenow="progressPercent ?? undefined"
                aria-valuemin="0"
                aria-valuemax="100"
                class="h-full rounded-full bg-gradient-to-r from-cyber-violet to-cyber-cyan transition-all duration-200"
                :class="progressPercent === null ? 'w-1/2 animate-pulse' : ''"
                :style="
                  progressPercent === null
                    ? undefined
                    : { width: `${progressPercent}%` }
                "
              />
            </div>
          </div>

          <div
            v-if="doneVi"
            data-testid="tiktok-done"
            role="status"
            class="flex flex-col gap-2 rounded-xl border border-cyber-success/40 bg-cyber-success/10 p-3 text-xs text-cyber-success sm:flex-row sm:items-center sm:justify-between sm:text-sm"
          >
            <div class="flex items-start gap-2">
              <Icon
                name="lucide:check-circle-2"
                class="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>{{ doneVi }}</span>
            </div>
            <NuxtLink
              to="/motion-control"
              class="touch-target inline-flex min-h-[48px] shrink-0 items-center gap-1 whitespace-nowrap font-semibold text-cyber-cyan underline-offset-4 hover:underline"
            >
              <span>Dùng cho Motion Control</span>
              <Icon name="lucide:arrow-right" class="h-3.5 w-3.5" />
            </NuxtLink>
          </div>

          <div
            class="flex flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <button
              v-if="!isDownloading"
              type="button"
              data-testid="tiktok-download-button"
              class="touch-target inline-flex min-h-[48px] min-w-[48px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-cyber-violet px-5 py-3 text-sm font-semibold text-cyber-text transition hover:bg-cyber-violet/90 sm:flex-initial"
              @click="handleDownload"
            >
              <Icon name="lucide:download" class="h-4 w-4" />
              <span>{{ doneVi ? "Tải lại video" : "Tải video về máy" }}</span>
            </button>
            <button
              v-else
              type="button"
              class="touch-target inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-cyber-danger/50 bg-cyber-danger/15 px-5 py-3 text-sm font-semibold text-cyber-danger transition hover:bg-cyber-danger/25"
              @click="handleCancel"
            >
              <Icon name="lucide:x" class="h-4 w-4" />
              <span>Hủy tải</span>
            </button>

            <button
              type="button"
              :disabled="isDownloading"
              class="touch-target inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-cyber-border bg-cyber-bg px-4 py-3 text-sm font-semibold text-cyber-text transition hover:border-cyber-violet disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleReset"
            >
              <Icon name="lucide:rotate-ccw" class="h-4 w-4" />
              <span>Tải video khác</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
