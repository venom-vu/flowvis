<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { definePageMeta } from '#imports';
import { ApiErrorCode, type AdminTopup } from '@flowvis/contracts';
import { useAdminAccess } from '~/composables/useAdminAccess';
import { useCursorPager } from '~/composables/useCursorPager';
import {
  useAdminTopups,
  type AdminTopupFilterStatus,
} from '~/composables/useAdminTopups';
import AdminTopupActionModal, {
  type AdminTopupActionType,
} from '~/components/AdminTopupActionModal.vue';
import {
  formatTopupTimestampVi,
  getTopupStatusLabelVi,
  isOverdue,
} from '~/utils/topup';
import { formatNumberVi, formatVndVi } from '~/utils/catalog';
import { MotionApiClientError, resolveApiErrorMessageVi } from '~/utils/api-client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

definePageMeta({
  layout: 'admin',
});

const { isMePending, isAdmin } = useAdminAccess();

const {
  statusFilter,
  topups,
  isLoading,
  isLoadingMore,
  isActionLoading,
  errorVi,
  loadMoreErrorVi,
  hasMore,
  total,
  fetchTopups,
  loadMore,
  setStatusFilter,
  approveTopup,
  approveExpiredTopup,
  rejectTopup,
  markNeedsReview,
  returnToPending,
} = useAdminTopups();

const pager = useCursorPager(topups, hasMore, loadMore, undefined, total);

function onFilterChange(value: string | number): void {
  void changeFilter(String(value) as AdminTopupFilterStatus);
}

async function changeFilter(status: AdminTopupFilterStatus): Promise<void> {
  pager.reset();
  await setStatusFilter(status);
}

async function reloadTopups(): Promise<void> {
  pager.reset();
  await fetchTopups(true);
}

// Modal state
const isModalOpen = ref<boolean>(false);
const activeTopup = ref<AdminTopup | null>(null);
const currentActionType = ref<AdminTopupActionType | null>(null);
const modalErrorVi = ref<string | null>(null);
const pageNotificationVi = ref<string | null>(null);

const filterTabs: Array<{ id: AdminTopupFilterStatus; labelVi: string }> = [
  { id: 'pending', labelVi: 'Chờ duyệt' },
  { id: 'needs_review', labelVi: 'Cần xem xét' },
  { id: 'expired', labelVi: 'Đã hết hạn' },
  { id: 'approved', labelVi: 'Đã duyệt' },
  { id: 'rejected', labelVi: 'Bị từ chối' },
  { id: 'all', labelVi: 'Tất cả' },
];

// Thống kê nhanh
const stats = computed(() => {
  const pendingCount = topups.value.filter((t) => t.status === 'pending').length;
  const overdueCount = topups.value.filter(
    (t) => t.status === 'pending' && (t.isOverdue || isOverdue(t)),
  ).length;
  const reviewCount = topups.value.filter((t) => t.status === 'needs_review').length;
  const resolvedCount = topups.value.filter(
    (t) => t.status === 'approved' || t.status === 'rejected',
  ).length;
  return {
    pending: pendingCount,
    overdue: overdueCount,
    needsReview: reviewCount,
    resolved: resolvedCount,
  };
});

function openActionModal(order: AdminTopup, actionType: AdminTopupActionType): void {
  activeTopup.value = order;
  currentActionType.value = actionType;
  modalErrorVi.value = null;
  isModalOpen.value = true;
}

function closeModal(): void {
  if (isActionLoading.value) {
    return;
  }
  isModalOpen.value = false;
  activeTopup.value = null;
  currentActionType.value = null;
  modalErrorVi.value = null;
}

async function handleModalConfirm(payload: {
  actionType: AdminTopupActionType;
  topupId: string;
  bankRef?: string;
  rejectReason?: string;
  note?: string;
}): Promise<void> {
  modalErrorVi.value = null;
  pageNotificationVi.value = null;

  try {
    if (payload.actionType === 'approve') {
      const bankRef = payload.bankRef?.trim();
      if (!bankRef) {
        modalErrorVi.value = 'Vui lòng nhập mã giao dịch ngân hàng (bank_ref).';
        return;
      }
      await approveTopup(payload.topupId, bankRef);
      pageNotificationVi.value = 'Duyệt đơn nạp thành công! Đã cộng credit cho người dùng.';
    } else if (payload.actionType === 'approve-expired') {
      const bankRef = payload.bankRef?.trim();
      if (!bankRef) {
        modalErrorVi.value = 'Vui lòng nhập mã giao dịch ngân hàng (bank_ref).';
        return;
      }
      await approveExpiredTopup(payload.topupId, bankRef);
      pageNotificationVi.value = 'Duyệt đơn quá hạn thành công! Đã cộng credit cho người dùng.';
    } else if (payload.actionType === 'reject') {
      const rejectReason = payload.rejectReason?.trim();
      if (!rejectReason) {
        modalErrorVi.value = 'Vui lòng nhập lý do từ chối.';
        return;
      }
      await rejectTopup(payload.topupId, rejectReason);
      pageNotificationVi.value = 'Đã từ chối đơn nạp.';
    } else if (payload.actionType === 'needs-review') {
      const note = payload.note?.trim();
      if (!note) {
        modalErrorVi.value = 'Vui lòng nhập ghi chú.';
        return;
      }
      await markNeedsReview(payload.topupId, note);
      pageNotificationVi.value = 'Đã chuyển đơn sang trạng thái Cần xem xét.';
    } else {
      modalErrorVi.value = 'Thao tác không hợp lệ.';
      return;
    }
    closeModal();
  } catch (err: unknown) {
    const isStateInvalid =
      (err instanceof MotionApiClientError &&
        err.code === ApiErrorCode.TOPUP_STATE_INVALID) ||
      (err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: unknown }).code === 'TOPUP_STATE_INVALID');

    if (isStateInvalid) {
      // Đóng modal và hiển thị thông báo làm mới
      closeModal();
      pageNotificationVi.value =
        'Đơn nạp không ở trạng thái phù hợp để thực hiện thao tác này. Danh sách đã được tự động làm mới.';
    } else {
      modalErrorVi.value = resolveApiErrorMessageVi(err);
    }
  }
}

async function handleReturnToPending(order: AdminTopup): Promise<void> {
  if (isActionLoading.value) {
    return;
  }
  pageNotificationVi.value = null;

  try {
    await returnToPending(order.id);
    pageNotificationVi.value = 'Đã đưa đơn nạp về trạng thái Chờ duyệt.';
  } catch (err: unknown) {
    const isStateInvalid =
      (err instanceof MotionApiClientError &&
        err.code === ApiErrorCode.TOPUP_STATE_INVALID) ||
      (err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: unknown }).code === 'TOPUP_STATE_INVALID');

    if (isStateInvalid) {
      pageNotificationVi.value =
        'Đơn nạp không ở trạng thái phù hợp để thực hiện thao tác này. Danh sách đã được tự động làm mới.';
    } else {
      pageNotificationVi.value = resolveApiErrorMessageVi(err);
    }
  }
}

// Khởi chạy tải dữ liệu khi là admin
onMounted(() => {
  if (isAdmin.value) {
    void fetchTopups(true);
  }
});

watch(isAdmin, (admin) => {
  if (admin && topups.value.length === 0) {
    void fetchTopups(true);
  }
});
</script>

<template>
  <div data-testid="page-admin-topups" class="space-y-8">
    <AdminAccessGate :pending="isMePending" :admin="isAdmin">
      <header class="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <nav aria-label="Breadcrumb" class="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <NuxtLink to="/admin" class="hover:text-foreground">Admin</NuxtLink>
            <span>/</span>
            <span class="text-foreground">Duyệt đơn VietQR</span>
          </nav>
          <h1 class="text-3xl font-semibold tracking-tight">Danh sách đơn nạp VietQR</h1>
          <p class="mt-2 text-base leading-relaxed text-muted-foreground">Khung SLA 08:00 – 23:00, mỗi đơn cần duyệt trong 15 phút.</p>
        </div>
        <Button
          variant="outline"
          type="button"
          data-testid="admin-refresh-button"
          :disabled="isLoading"
         
          @click="reloadTopups"
        >
          <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          <span>Làm mới</span>
        </Button>
      </header>

      <Alert v-if="pageNotificationVi" role="status" aria-live="polite" data-testid="admin-page-notification" class="flex items-center justify-between gap-2 pr-2">
        <AlertDescription>{{ pageNotificationVi }}</AlertDescription>
        <Button type="button" variant="ghost" size="icon" aria-label="Đóng thông báo" @click="pageNotificationVi = null">
          <Icon name="lucide:x" class="h-4 w-4" />
        </Button>
      </Alert>

      <!-- Số liệu chỉ đếm các đơn đã tải theo bộ lọc, không phải tổng toàn hệ thống -->
      <Card
        aria-label="Thống kê nhanh trong danh sách đơn nạp đang tải"
        class="overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chờ duyệt</TableHead>
              <TableHead>Quá hạn SLA</TableHead>
              <TableHead>Cần xem xét</TableHead>
              <TableHead>Đã giải quyết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow class="text-2xl font-semibold">
              <TableCell>{{ stats.pending }}</TableCell>
              <TableCell :class="[stats.overdue > 0 ? 'text-destructive' : '']">{{ stats.overdue }}</TableCell>
              <TableCell>{{ stats.needsReview }}</TableCell>
              <TableCell>{{ stats.resolved }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      <Tabs :model-value="statusFilter" aria-label="Bộ lọc trạng thái đơn nạp" class="overflow-x-auto" @update:model-value="onFilterChange">
        <TabsList class="h-auto">
          <TabsTrigger v-for="tab in filterTabs" :key="tab.id" :value="tab.id" :data-testid="`filter-tab-${tab.id}`">
            {{ tab.labelVi }}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div
        v-if="isLoading"
        data-testid="admin-topups-loading-state"
        class="flex min-h-[240px] items-center justify-center gap-3 text-sm text-muted-foreground"
      >
        <Icon name="lucide:loader-2" class="h-5 w-5 animate-spin" />
        <span>Đang tải danh sách đơn nạp...</span>
      </div>

      <div
        v-else-if="errorVi"
        role="alert"
        aria-live="polite"
        data-testid="admin-topups-error-state"
        class="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center"
      >
        <p class="text-sm text-destructive text-base">{{ errorVi }}</p>
        <Button variant="outline" type="button" @click="reloadTopups">
          <Icon name="lucide:rotate-cw" class="h-4 w-4" />
          <span>Thử lại</span>
        </Button>
      </div>

      <div
        v-else-if="topups.length === 0"
        data-testid="admin-topups-empty-state"
        class="flex min-h-[200px] flex-col items-center justify-center gap-1 text-center"
      >
        <p class="text-base font-medium text-foreground">Không có đơn nạp nào phù hợp</p>
        <p class="text-sm text-muted-foreground">Hiện tại không có đơn nạp nào ở trạng thái này.</p>
      </div>

      <div v-else class="space-y-4">
        <Card class="overflow-hidden">
          <Table class="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Mã đơn</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Hạn duyệt SLA</TableHead>
                <TableHead>Tham chiếu / Ghi chú</TableHead>
                <TableHead class="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="order in pager.pageItems.value"
                :key="order.id"
                data-testid="admin-topup-row"
                class="hover:bg-muted/50"
              >
                <TableCell>
                  <div class="font-geist-mono font-medium">NAP {{ order.code }}</div>
                  <div class="text-sm text-muted-foreground">{{ formatTopupTimestampVi(order.createdAt) }}</div>
                </TableCell>
                <TableCell>
                  <div>{{ getTopupStatusLabelVi(order.status) }}</div>
                  <div
                    v-if="isOverdue(order)"
                    data-testid="overdue-badge"
                    class="mt-1 text-sm font-semibold text-destructive"
                  >
                    QUÁ HẠN
                  </div>
                </TableCell>
                <TableCell>
                  <div class="font-medium">{{ formatVndVi(order.amountVnd) }}</div>
                  <div class="text-sm text-muted-foreground">Gói {{ order.pack }}, +{{ formatNumberVi(order.credits) }} CR</div>
                </TableCell>
                <TableCell class="whitespace-nowrap">
                  <span v-if="order.approveBy" :class="isOverdue(order) ? 'text-destructive' : ''">
                    {{ formatTopupTimestampVi(order.approveBy) }}
                  </span>
                  <span v-else class="text-muted-foreground">-</span>
                </TableCell>
                <TableCell class="max-w-xs break-words">
                  <span v-if="order.bankRef" class="font-geist-mono">{{ order.bankRef }}</span>
                  <span v-else-if="order.note">Ghi chú: {{ order.note }}</span>
                  <span v-else-if="order.rejectReason">Từ chối: {{ order.rejectReason }}</span>
                  <span v-else class="text-muted-foreground">-</span>
                </TableCell>
                <TableCell>
                  <div v-if="order.status === 'pending'" class="flex justify-end gap-2">
                    <Button
                      type="button"
                      data-testid="action-approve-button"
                      :disabled="isActionLoading"
                     
                      @click="openActionModal(order, 'approve')"
                    >
                      Duyệt
                    </Button>
                    <Button
                      variant="outline" class="text-destructive hover:text-destructive"
                      type="button"
                      data-testid="action-reject-button"
                      :disabled="isActionLoading"
                     
                      @click="openActionModal(order, 'reject')"
                    >
                      Từ chối
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      data-testid="action-needs-review-button"
                      :disabled="isActionLoading"
                     
                      @click="openActionModal(order, 'needs-review')"
                    >
                      Xem xét
                    </Button>
                  </div>
                  <div v-else-if="order.status === 'needs_review'" class="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      type="button"
                      data-testid="action-return-pending-button"
                      :disabled="isActionLoading"
                     
                      @click="handleReturnToPending(order)"
                    >
                      Đưa về chờ duyệt
                    </Button>
                    <Button
                      variant="outline" class="text-destructive hover:text-destructive"
                      type="button"
                      data-testid="action-reject-button"
                      :disabled="isActionLoading"
                     
                      @click="openActionModal(order, 'reject')"
                    >
                      Từ chối
                    </Button>
                  </div>
                  <div v-else-if="order.status === 'expired'" class="flex justify-end">
                    <Button
                      variant="outline"
                      type="button"
                      data-testid="action-approve-expired-button"
                      :disabled="isActionLoading"
                     
                      @click="openActionModal(order, 'approve-expired')"
                    >
                      Duyệt đơn quá hạn
                    </Button>
                  </div>
                  <div v-else-if="order.status === 'awaiting_transfer'" class="text-right text-sm text-muted-foreground">
                    Chờ chuyển khoản
                  </div>
                  <div v-else class="text-right text-sm text-muted-foreground">Đã hoàn tất</div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>

        <p
          v-if="loadMoreErrorVi"
          role="alert"
          aria-live="polite"
          data-testid="load-more-error-banner"
          class="text-sm text-destructive"
        >
          {{ loadMoreErrorVi }} Bấm "Sau" để thử tải lại.
        </p>
        <AdminPager
          data-testid="load-more-admin-topups-button"
          :page="pager.page.value"
          :page-count="pager.pageCount.value"
          :has-more="hasMore"
          :can-prev="pager.canPrev.value"
          :can-next="pager.canNext.value"
          :loading="isLoadingMore || pager.isPaging.value"
          @prev="pager.prev"
          @next="pager.next"
          @goto="pager.goTo"
        />
      </div>
    </AdminAccessGate>

    <AdminTopupActionModal
      :open="isModalOpen"
      :topup="activeTopup"
      :action-type="currentActionType"
      :is-submitting="isActionLoading"
      :error-message-vi="modalErrorVi"
      @close="closeModal"
      @confirm="handleModalConfirm"
    />
  </div>
</template>
