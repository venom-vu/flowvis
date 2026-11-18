<script setup lang="ts">
import { computed } from 'vue';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

const navBtnClass =
  'touch-target min-h-[48px] min-w-[48px] gap-1.5 rounded-xl border border-cyber-border bg-cyber-bg px-3 text-xs font-semibold text-cyber-text transition hover:border-cyber-violet hover:bg-cyber-bg hover:text-cyber-text disabled:cursor-not-allowed disabled:opacity-40 sm:pr-3';
const numBtnClass =
  'touch-target min-h-[48px] min-w-[48px] rounded-xl border font-mono text-sm font-semibold transition disabled:cursor-not-allowed';
</script>

<template>
  <nav
    aria-label="Phân trang"
    data-testid="user-pager"
    class="flex flex-wrap items-center justify-between gap-3"
  >
    <span data-testid="user-pager-label" class="font-mono text-xs text-cyber-muted">
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
      <PaginationContent v-slot="{ items }" class="flex flex-wrap items-center gap-1.5">
        <li>
          <button
            type="button"
            data-testid="user-pager-prev"
            :class="cn(buttonVariants({ variant: 'ghost' }), 'gap-1 px-2.5', navBtnClass)"
            aria-label="Trang trước"
            :disabled="Boolean(!canPrev || loading)"
            @click="!loading && canPrev && emit('prev')"
          >
            <Icon name="lucide:chevron-left" class="h-4 w-4" />
            <span class="hidden sm:inline">Trước</span>
          </button>
        </li>

        <template
          v-for="(item, index) in items"
          :key="item.type === 'page' ? `page-${item.value}` : `ellipsis-${index}`"
        >
          <li v-if="item.type === 'page'">
            <PaginationItem
              :value="item.value"
              :is-active="item.value === safePage"
              :data-testid="`user-pager-page-${item.value}`"
              :aria-label="`Trang ${item.value}`"
              :aria-current="item.value === safePage ? 'page' : undefined"
              :disabled="Boolean(loading)"
              :class="[
                numBtnClass,
                item.value === safePage
                  ? 'border-cyber-violet bg-cyber-violet/20 text-cyber-text hover:bg-cyber-violet/25 hover:text-cyber-text'
                  : 'border-cyber-border bg-cyber-bg text-cyber-muted hover:border-cyber-violet hover:bg-cyber-bg hover:text-cyber-text',
              ]"
              @click="!loading && item.value !== safePage && emit('goto', item.value)"
            >
              {{ item.value }}
            </PaginationItem>
          </li>
          <li v-else>
            <PaginationEllipsis
              data-testid="user-pager-ellipsis"
              class="text-cyber-muted"
            />
          </li>
        </template>

        <li>
          <button
            type="button"
            data-testid="user-pager-next"
            :class="cn(buttonVariants({ variant: 'ghost' }), 'gap-1 px-2.5', navBtnClass)"
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
          </button>
        </li>
      </PaginationContent>
    </Pagination>
  </nav>
</template>
