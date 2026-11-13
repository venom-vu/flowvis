<script setup lang="ts">
import { computed, ref } from 'vue';
import { definePageMeta } from '#imports';
import { useAdminAccess } from '~/composables/useAdminAccess';
import { isTaskFinished, useAdminOps } from '~/composables/useAdminOps';
import { formatTopupTimestampVi } from '~/utils/topup';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Card } from '@/components/ui/card';

definePageMeta({ layout: 'admin' });

const { isMePending, isAdmin } = useAdminAccess();
const ops = useAdminOps();
const { task, taskErrorVi, isTaskLoading, isTakedownLoading, takedownErrorVi } = ops;

const lookupInput = ref<string>('');
const takedownReason = ref<string>('');
const takedownReasonErrorVi = ref<string | null>(null);
const confirmOpen = ref<boolean>(false);
const confirmErrorVi = ref<string | null>(null);
const notificationVi = ref<string | null>(null);

const taskFinished = computed<boolean>(() => (task.value ? isTaskFinished(task.value.status) : false));
const canTakedown = computed<boolean>(
  () => Boolean(task.value) && taskFinished.value && !task.value?.filesRemovedAt,
);

function requestTakedown(): void {
  if (!canTakedown.value) return;
  if (!takedownReason.value.trim()) {
    takedownReasonErrorVi.value = 'Vui lòng nhập lý do.';
    return;
  }
  takedownReasonErrorVi.value = null;
  confirmErrorVi.value = null;
  confirmOpen.value = true;
}

function closeConfirm(): void {
  if (isTakedownLoading.value) return;
  confirmOpen.value = false;
}

async function runConfirm(): Promise<void> {
  if (isTakedownLoading.value) return;
  confirmErrorVi.value = null;
  const ok = await ops.takedown(takedownReason.value);
  if (!ok) {
    confirmErrorVi.value = takedownErrorVi.value;
    return;
  }
  notificationVi.value = 'Đã gỡ nội dung của Task.';
  takedownReason.value = '';
  confirmOpen.value = false;
}
</script>

<template>
  <div data-testid="page-admin-takedown" class="space-y-8">
    <AdminAccessGate :pending="isMePending" :admin="isAdmin">
      <header class="border-b border-border pb-6">
        <h1 class="text-3xl font-semibold tracking-tight">Gỡ nội dung vi phạm</h1>
        <p class="mt-2 text-base leading-relaxed text-muted-foreground">Tra cứu Task theo mã hoặc liên kết chia sẻ, rồi xóa tệp kết quả và thu hồi liên kết.</p>
      </header>

      <Alert v-if="notificationVi" data-testid="ops-notification" role="status"><AlertDescription>{{ notificationVi }}</AlertDescription></Alert>

      <section data-testid="ops-takedown-section" class="space-y-6">
        <form class="flex flex-col gap-3 sm:flex-row sm:items-stretch" @submit.prevent="() => ops.lookupTask(lookupInput)">
          <Input
            v-model="lookupInput"
           
            class="flex-1"
            data-testid="ops-task-input"
            placeholder="Mã Task hoặc liên kết chia sẻ"
            aria-label="Mã Task hoặc liên kết chia sẻ"
          />
          <Button type="submit" data-testid="ops-task-lookup" :disabled="isTaskLoading">
            <Icon name="lucide:search" class="h-4 w-4 shrink-0" /><span>Tra cứu</span>
          </Button>
        </form>
        <p v-if="taskErrorVi" data-testid="ops-task-error" role="alert" class="text-sm text-destructive">{{ taskErrorVi }}</p>

        <template v-if="task">
          <Card data-testid="ops-task-detail" class="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Task</TableHead><TableHead>Pipeline</TableHead><TableHead>Trạng thái</TableHead><TableHead>Chủ Task</TableHead><TableHead>Đã gỡ lúc</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell class="break-all font-geist-mono">{{ task.id }}</TableCell>
                  <TableCell>{{ task.pipeline }}</TableCell>
                  <TableCell>{{ task.status }}</TableCell>
                  <TableCell class="break-all">{{ task.userEmail }}</TableCell>
                  <TableCell data-testid="ops-task-removed">{{ task.filesRemovedAt ? formatTopupTimestampVi(task.filesRemovedAt) : 'Chưa gỡ' }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>

          <Card class="p-5 space-y-4">
            <p v-if="!task.filesRemovedAt" class="text-sm text-muted-foreground">Token chia sẻ sẽ bị thu hồi khi gỡ.</p>
            <Label class="flex flex-col gap-1.5">
              <span>Lý do gỡ</span>
              <Input v-model="takedownReason" maxlength="500" data-testid="ops-takedown-reason" />
            </Label>
            <p v-if="takedownReasonErrorVi" data-testid="ops-takedown-reason-error" role="alert" class="text-sm text-destructive">{{ takedownReasonErrorVi }}</p>
            <Button variant="outline" class="text-destructive hover:text-destructive" type="button" data-testid="ops-takedown-button" :disabled="!canTakedown || isTakedownLoading" @click="requestTakedown">
              <Icon name="lucide:trash-2" class="h-4 w-4" /><span>Gỡ bỏ ngay</span>
            </Button>
            <p v-if="!taskFinished" data-testid="ops-takedown-unfinished" class="text-amber-400 text-sm">
              Task chưa kết thúc (đang chờ hoặc đang chạy) nên chưa thể gỡ nội dung.
            </p>
            <p v-else-if="task.filesRemovedAt" class="text-sm text-muted-foreground">Nội dung của Task này đã được gỡ.</p>
          </Card>
        </template>
      </section>

      <AdminConfirmDialog
        :open="confirmOpen"
        title="Gỡ bỏ nội dung của Task?"
        :busy="isTakedownLoading"
        :error-vi="confirmErrorVi"
        @cancel="closeConfirm"
        @confirm="runConfirm"
      >
        <p class="text-muted-foreground">Tệp trên R2 sẽ bị xóa và token chia sẻ bị thu hồi. Không thể hoàn tác.</p>
        <p class="break-words">Lý do: {{ takedownReason }}</p>
      </AdminConfirmDialog>
    </AdminAccessGate>
  </div>
</template>
