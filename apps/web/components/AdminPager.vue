<script setup lang="ts">
import { computed } from 'vue';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { buildPageTokens } from '~/utils/pagination';

const props = defineProps<{
  page: number;
  pageCount: number;
  hasMore: boolean;
  canPrev: boolean;
  canNext: boolean;
  loading?: boolean;
}>();
const emit = defineEmits<{ prev: []; next: []; goto: [page: number] }>();

// Máy chủ còn dữ liệu: thêm "…" sau trang cuối đã tải để báo còn trang sau.
const tokens = computed(() => {
  const list = buildPageTokens(props.page, props.pageCount);
  return props.hasMore ? [...list, 'more' as const] : list;
});
</script>

<template>
  <nav aria-label="Phân trang" data-testid="admin-pager" class="flex flex-wrap items-center justify-between gap-3">
    <span class="text-sm text-muted-foreground" data-testid="admin-pager-label">
      Trang {{ page }} / {{ pageCount }}<template v-if="hasMore">+</template>
    </span>

    <Pagination as="div" :page="page" :total="pageCount" :items-per-page="1" :sibling-count="1" class="mx-0 w-auto">
      <PaginationContent class="flex flex-wrap items-center gap-1">
        <li>
          <PaginationPrevious
            data-testid="admin-pager-prev"
            aria-label="Trang trước"
            :disabled="!canPrev || loading"
            @click="emit('prev')"
          >
            <Icon name="lucide:chevron-left" class="h-4 w-4" />
            <span class="hidden sm:inline">Trước</span>
          </PaginationPrevious>
        </li>

        <template v-for="(token, idx) in tokens" :key="`${token}-${idx}`">
          <li v-if="token === 'ellipsis' || token === 'more'">
            <PaginationEllipsis data-testid="admin-pager-ellipsis" />
          </li>
          <li v-else>
            <PaginationItem
              :value="token"
              :is-active="token === page"
              :data-testid="`admin-pager-page-${token}`"
              :aria-label="`Trang ${token}`"
              :aria-current="token === page ? 'page' : undefined"
              :disabled="loading"
              class="font-mono"
              @click="token !== page && emit('goto', token)"
            >
              {{ token }}
            </PaginationItem>
          </li>
        </template>

        <li>
          <PaginationNext
            data-testid="admin-pager-next"
            aria-label="Trang sau"
            :disabled="!canNext || loading"
            @click="emit('next')"
          >
            <span class="hidden sm:inline">Sau</span>
            <Icon
              :name="loading ? 'lucide:loader-2' : 'lucide:chevron-right'"
              class="h-4 w-4"
              :class="{ 'animate-spin': loading }"
            />
          </PaginationNext>
        </li>
      </PaginationContent>
    </Pagination>
  </nav>
</template>
