import { computed, ref, watch, type Ref } from 'vue';

export const ADMIN_PAGE_SIZE = 20;

/**
 * Phân trang theo số trang trên danh sách tải theo cursor: các trang đã tải được giữ lại,
 * bấm "Sau" ở trang cuối đã tải mới gọi loadMore() lấy thêm từ máy chủ.
 * Khi máy chủ trả `total`, số trang tính theo tổng (hiện đủ 1 2 … N ngay từ đầu) và goTo()
 * tự tải tiếp các lô còn thiếu cho tới khi có trang được chọn.
 */
export function useCursorPager<T>(
  items: Ref<T[]>,
  hasMore: Ref<boolean>,
  loadMore: () => Promise<unknown>,
  pageSize: number = ADMIN_PAGE_SIZE,
  total?: Ref<number | null | undefined>,
) {
  const page = ref(1);
  const isPaging = ref(false);
  const loadedPageCount = computed(() => Math.max(1, Math.ceil(items.value.length / pageSize)));
  const pageCount = computed(() => {
    const known = total?.value;
    if (typeof known !== 'number' || !Number.isFinite(known)) return loadedPageCount.value;
    return Math.max(loadedPageCount.value, Math.ceil(Math.max(0, known) / pageSize), 1);
  });
  const pageItems = computed(() =>
    items.value.slice((page.value - 1) * pageSize, page.value * pageSize),
  );
  const canPrev = computed(() => page.value > 1);
  const canNext = computed(() => page.value < pageCount.value || hasMore.value);

  // Danh sách bị tải lại ngắn hơn thì kéo trang hiện tại về trang cuối còn dữ liệu.
  watch(pageCount, (n) => {
    if (page.value > n) page.value = n;
  });

  /** Tải thêm lô cho tới khi có đủ `target` trang; dừng nếu lô mới không thêm được dòng nào. */
  async function loadUntil(target: number): Promise<void> {
    isPaging.value = true;
    try {
      while (loadedPageCount.value < target && hasMore.value) {
        const before = items.value.length;
        await loadMore();
        if (items.value.length <= before) break;
      }
    } finally {
      isPaging.value = false;
    }
  }

  async function next(): Promise<void> {
    if (isPaging.value || !canNext.value) return;
    const target = page.value + 1;
    if (target > loadedPageCount.value) await loadUntil(target);
    if (target <= loadedPageCount.value) page.value = target;
  }

  function prev(): void {
    if (canPrev.value && !isPaging.value) page.value -= 1;
  }

  /** Nhảy tới một trang; trang chưa tải thì tải thêm từ máy chủ. */
  async function goTo(target: number): Promise<void> {
    if (isPaging.value) return;
    const want = Math.min(Math.max(1, Math.trunc(target)), pageCount.value);
    if (want > loadedPageCount.value) await loadUntil(want);
    page.value = Math.min(want, loadedPageCount.value);
  }

  function reset(): void {
    page.value = 1;
  }

  return { page, pageCount, pageItems, canPrev, canNext, isPaging, next, prev, goTo, reset };
}
