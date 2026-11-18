<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { definePageMeta } from '#imports';
import { useAdminAccess } from '~/composables/useAdminAccess';
import { useAdminOps } from '~/composables/useAdminOps';
import { useCursorPager } from '~/composables/useCursorPager';
import { formatTopupTimestampVi } from '~/utils/topup';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Card } from '@/components/ui/card';

definePageMeta({ layout: 'admin' });

const { isMePending, isAdmin } = useAdminAccess();
const ops = useAdminOps();
const { auditItems, auditAction, auditTarget, auditHasMore, auditTotal, isAuditLoading, isAuditLoadingMore, auditErrorVi } = ops;
const pager = useCursorPager(auditItems, auditHasMore, () => ops.fetchAudit(false), undefined, auditTotal);

async function applyFilter(): Promise<void> {
  pager.reset();
  await ops.fetchAudit(true);
}

onMounted(() => {
  if (isAdmin.value) void applyFilter();
});
watch(isAdmin, (admin) => {
  if (admin && auditItems.value.length === 0) void applyFilter();
});
</script>

<template>
  <div data-testid="page-admin-audit" class="space-y-8">
    <AdminAccessGate :pending="isMePending" :admin="isAdmin">
      <header class="border-b border-border pb-6">
        <h1 class="text-3xl font-semibold tracking-tight">Nhật ký Admin</h1>
        <p class="mt-2 text-base leading-relaxed text-muted-foreground">Mọi thao tác của quản trị viên: duyệt đơn, điều chỉnh credit, khóa tài khoản, gỡ nội dung.</p>
      </header>

      <section data-testid="ops-audit-section" class="space-y-4">
        <form class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]" @submit.prevent="applyFilter">
          <Input v-model="auditAction" data-testid="ops-audit-action" placeholder="Lọc theo action (ví dụ ADJUST)" aria-label="Lọc theo action" />
          <Input v-model="auditTarget" data-testid="ops-audit-target" placeholder="Lọc theo target" aria-label="Lọc theo target" />
          <Button type="submit" data-testid="ops-audit-filter" :disabled="isAuditLoading">
            <Icon name="lucide:filter" class="h-4 w-4 shrink-0" /><span>Lọc</span>
          </Button>
        </form>

        <p v-if="auditErrorVi" data-testid="ops-audit-error" role="alert" class="text-sm text-destructive">{{ auditErrorVi }}</p>
        <p v-if="isAuditLoading" class="text-sm text-muted-foreground">Đang tải nhật ký...</p>
        <p v-else-if="auditItems.length === 0 && !auditErrorVi" class="text-sm text-muted-foreground">Chưa có bản ghi.</p>

        <template v-if="auditItems.length > 0">
          <Card class="overflow-hidden">
            <Table data-testid="ops-audit-list">
              <TableHeader>
                <TableRow><TableHead>Thời gian</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Lý do</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="a in pager.pageItems.value" :key="a.id">
                  <TableCell class="whitespace-nowrap">{{ formatTopupTimestampVi(a.createdAt) }}</TableCell>
                  <TableCell class="font-medium">{{ a.action }}</TableCell>
                  <TableCell class="break-all font-geist-mono">{{ a.target }}</TableCell>
                  <TableCell class="break-words">{{ a.reason || '-' }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
          <AdminPager
            :page="pager.page.value"
            :page-count="pager.pageCount.value"
            :has-more="auditHasMore"
            :can-prev="pager.canPrev.value"
            :can-next="pager.canNext.value"
            :loading="isAuditLoadingMore || pager.isPaging.value"
            @prev="pager.prev"
            @next="pager.next"
            @goto="pager.goTo"
          />
        </template>
      </section>
    </AdminAccessGate>
  </div>
</template>
