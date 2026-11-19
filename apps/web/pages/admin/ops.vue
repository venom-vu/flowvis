<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { definePageMeta } from '#imports';
import { useAdminAccess } from '~/composables/useAdminAccess';
import { BACKUP_STALE_MS, RH_BALANCE_STALE_MS, isStaleAt, useAdminOps } from '~/composables/useAdminOps';
import { formatNumberVi } from '~/utils/catalog';
import { formatTopupTimestampVi } from '~/utils/topup';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

definePageMeta({ layout: 'admin' });

const { isMePending, isAdmin } = useAdminAccess();
const ops = useAdminOps();
const { status, statusErrorVi, isStatusLoading, isResuming, resumeErrorVi } = ops;

/* Đồng hồ để nhãn "cũ" tự cập nhật. */
const nowMs = ref<number>(Date.now());
let clockTimer: ReturnType<typeof setInterval> | null = null;

const canResume = computed<boolean>(
  () => Boolean(status.value && (status.value.intakePaused || status.value.rhBudgetExhausted)),
);
const balanceStale = computed<boolean>(() =>
  isStaleAt(status.value?.rhBalance?.readAt, RH_BALANCE_STALE_MS, nowMs.value),
);
const backupStale = computed<boolean>(() =>
  isStaleAt(status.value?.lastBackup?.at, BACKUP_STALE_MS, nowMs.value),
);

const confirmOpen = ref<boolean>(false);
const confirmErrorVi = ref<string | null>(null);
const notificationVi = ref<string | null>(null);

function openConfirm(): void {
  confirmErrorVi.value = null;
  confirmOpen.value = true;
}

function closeConfirm(): void {
  if (isResuming.value) return;
  confirmOpen.value = false;
}

async function runConfirm(): Promise<void> {
  if (isResuming.value) return;
  confirmErrorVi.value = null;
  const ok = await ops.resumeIntake();
  if (!ok) {
    confirmErrorVi.value = resumeErrorVi.value;
    return;
  }
  notificationVi.value = 'Đã mở lại nhận Task mới.';
  confirmOpen.value = false;
}

function start(): void {
  void ops.refreshStatus();
  ops.startStatusPolling();
  if (!clockTimer) clockTimer = setInterval(() => (nowMs.value = Date.now()), 30_000);
}

onMounted(() => {
  if (isAdmin.value) start();
});
watch(isAdmin, (admin) => {
  if (admin && !status.value) start();
});
onBeforeUnmount(() => {
  ops.stopStatusPolling();
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = null;
});
</script>

<template>
  <div data-testid="page-admin-ops" class="space-y-8">
    <AdminAccessGate :pending="isMePending" :admin="isAdmin">
      <header class="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight">Trạng thái hệ thống</h1>
          <p class="mt-2 text-base leading-relaxed text-muted-foreground">Nhận Task, ngân sách GPU và sao lưu. Tự làm mới mỗi 30 giây.</p>
        </div>
        <Button variant="outline" type="button" data-testid="ops-status-refresh" :disabled="isStatusLoading" @click="() => ops.refreshStatus()">
          <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': isStatusLoading }" />
          <span>Làm mới</span>
        </Button>
      </header>

      <Alert v-if="notificationVi" data-testid="ops-notification" role="status"><AlertDescription>{{ notificationVi }}</AlertDescription></Alert>

      <section data-testid="ops-status-section" class="space-y-4">
        <p v-if="statusErrorVi" data-testid="ops-status-error" role="alert" class="text-sm text-destructive">{{ statusErrorVi }}</p>
        <p v-if="!status && !statusErrorVi" class="text-sm text-muted-foreground">Đang tải trạng thái...</p>

        <Card v-if="status" class="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-56">Hạng mục</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow data-testid="ops-card-intake">
                <TableCell class="font-medium">Nhận Task mới</TableCell>
                <TableCell>
                  <Badge :variant="status.intakePaused ? 'warning' : 'success'">{{ status.intakePaused ? 'Đang tạm dừng' : 'Đang mở' }}</Badge>
                </TableCell>
                <TableCell>
                  <span v-if="status.lastBreakerTrigger" class="break-words">
                    Ngắt mạch lúc {{ formatTopupTimestampVi(status.lastBreakerTrigger.at) }}: {{ status.lastBreakerTrigger.rule }}
                  </span>
                  <span v-else class="text-muted-foreground">-</span>
                </TableCell>
              </TableRow>
              <TableRow data-testid="ops-card-budget">
                <TableCell class="font-medium">Ngân sách GPU</TableCell>
                <TableCell>
                  <Badge :variant="status.rhBudgetExhausted ? 'destructive' : 'success'">{{ status.rhBudgetExhausted ? 'Đã hết ngân sách' : 'Còn ngân sách' }}</Badge>
                </TableCell>
                <TableCell>
                  <span v-if="status.rhBalance">
                    Số dư {{ status.rhBalance.usd.toFixed(2) }} USD, đọc lúc {{ formatTopupTimestampVi(status.rhBalance.readAt) }}
                  </span>
                  <span v-else>Chưa đọc được số dư.</span>
                  <span v-if="balanceStale" data-testid="ops-balance-stale" class="mt-1 block font-medium text-amber-400">
                    Dữ liệu số dư đã cũ, có thể không còn đúng.
                  </span>
                </TableCell>
              </TableRow>
              <TableRow data-testid="ops-card-backup">
                <TableCell class="font-medium">Sao lưu gần nhất</TableCell>
                <TableCell>
                  <Badge v-if="status.lastBackup" :variant="status.lastBackup.result === 'success' ? 'success' : 'destructive'">
                    {{ status.lastBackup.result === 'success' ? 'Thành công' : 'Thất bại' }}
                  </Badge>
                  <Badge v-else variant="warning">Chưa có bản sao lưu</Badge>
                </TableCell>
                <TableCell>
                  <span v-if="status.lastBackup">
                    {{ formatTopupTimestampVi(status.lastBackup.at) }}<span v-if="status.lastBackup.sizeBytes != null">, {{ formatNumberVi(status.lastBackup.sizeBytes) }} byte</span>
                  </span>
                  <span v-else class="text-muted-foreground">-</span>
                  <span v-if="backupStale" data-testid="ops-backup-stale" class="mt-1 block font-medium text-amber-400">Bản sao lưu đã cũ.</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>

        <Card v-if="status" class="p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-base font-medium text-foreground">Mở lại nhận Task</p>
            <p class="text-sm text-muted-foreground">
              {{ canResume ? 'Hệ thống đang dừng nhận Task mới.' : 'Hệ thống đang nhận Task bình thường.' }}
            </p>
          </div>
          <Button type="button" data-testid="ops-resume-button" :disabled="!canResume || isResuming" @click="openConfirm">
            <Icon name="lucide:play" class="h-4 w-4" />
            <span>Mở lại nhận Task</span>
          </Button>
        </Card>
      </section>

      <AdminConfirmDialog
        :open="confirmOpen"
        title="Mở lại nhận Task mới?"
        :busy="isResuming"
        :error-vi="confirmErrorVi"
        @cancel="closeConfirm"
        @confirm="runConfirm"
      >
        <p class="text-muted-foreground">
          Nếu nguyên nhân chưa được xử lý (ví dụ hết ngân sách GPU), Task mới có thể thất bại nhanh.
        </p>
        <p data-testid="ops-confirm-balance">
          Số dư GPU lần đọc cuối:
          {{ status?.rhBalance ? `${status.rhBalance.usd.toFixed(2)} USD (${formatTopupTimestampVi(status.rhBalance.readAt)})` : 'chưa đọc được' }}
        </p>
      </AdminConfirmDialog>
    </AdminAccessGate>
  </div>
</template>
