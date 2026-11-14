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

const props = defineProps<{
  page: number;
  pageCount: number;
  hasMore: boolean;
  canPrev: boolean;
  canNext: boolean;
  loading?: boolean;
}>();
const emit = defineEmits<{ prev: []; next: []; goto: [page: number] }>();

const safePageCount = computed(() => Math.max(1, props.pageCount));
const safePage = computed(() => Math.min(Math.max(1, props.page), safePageCount.value));
</script>

<template>
  <nav aria-label="Phân trang" data-testid="admin-pager" class="flex flex-wrap items-center justify-between gap-3">
    <span class="text-sm text-muted-foreground" data-testid="admin-pager-label">
      Trang {{ safePage }} / {{ safePageCount }}<template v-if="hasMore">+</template>
    </span>

    <Pagination
      as="div"
      show-edges
      class="mx-0 w-auto"
      :page="safePage"
      :total="safePageCount"
      :items-per-page="1"
      :sibling-count="1"
      :disabled="Boolean(loading)"
    >
      <PaginationContent v-slot="{ items }" class="flex flex-wrap items-center gap-1">
        <li>
          <PaginationPrevious
            data-testid="admin-pager-prev"
            aria-label="Trang trước"
            :disabled="Boolean(!canPrev || loading)"
            @click="!loading && canPrev && emit('prev')"
          >
            <Icon name="lucide:chevron-left" class="h-4 w-4" />
            <span class="hidden sm:inline">Trước</span>
          </PaginationPrevious>
        </li>

        <template
          v-for="(item, index) in items"
          :key="item.type === 'page' ? `page-${item.value}` : `ellipsis-${index}`"
        >
          <li v-if="item.type === 'page'">
            <PaginationItem
              :value="item.value"
              :is-active="item.value === safePage"
              :data-testid="`admin-pager-page-${item.value}`"
              :aria-label="`Trang ${item.value}`"
              :aria-current="item.value === safePage ? 'page' : undefined"
              :disabled="Boolean(loading)"
              class="font-mono"
              @click="!loading && item.value !== safePage && emit('goto', item.value)"
            >
              {{ item.value }}
            </PaginationItem>
          </li>
          <li v-else>
            <PaginationEllipsis data-testid="admin-pager-ellipsis" />
          </li>
        </template>

        <li>
          <PaginationNext
            data-testid="admin-pager-next"
            aria-label="Trang sau"
            :disabled="Boolean(!canNext || loading)"
            @click="!loading && canNext && emit('next')"
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
