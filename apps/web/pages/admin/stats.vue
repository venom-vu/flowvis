<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { definePageMeta } from '#imports';
import { useAdminAccess } from '~/composables/useAdminAccess';
import { useAdminOps } from '~/composables/useAdminOps';
import { formatNumberVi, formatVndVi } from '~/utils/catalog';
import { getPipelineLabelVi } from '~/utils/task-format';
import type { BarRow, BarSeries } from '~/components/AdminBarChart.vue';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

definePageMeta({ layout: 'admin' });

const { isMePending, isAdmin } = useAdminAccess();
const ops = useAdminOps();
const { stats, isStatsLoading, statsErrorVi } = ops;

/* Màu chart lấy từ biến --chart-N của shadcn, gán theo thứ tự cố định. */
const SERIES_1 = 'hsl(var(--chart-1))';
const SERIES_2 = 'hsl(var(--chart-2))';

const successSeries: BarSeries[] = [{ key: 'rate', labelVi: 'Tỷ lệ thành công', color: SERIES_1 }];
const successRows = computed<BarRow[]>(() =>
  (stats.value?.pipelines ?? []).map((p) => ({ labelVi: getPipelineLabelVi(p.pipeline), values: [p.successRate === null ? null : p.successRate * 100] })),
);

const timeSeries: BarSeries[] = [
  { key: 'avg', labelVi: 'Trung bình', color: SERIES_1 },
  { key: 'p95', labelVi: 'p95', color: SERIES_2 },
];
const timeRows = computed<BarRow[]>(() =>
  (stats.value?.pipelines ?? []).map((p) => ({ labelVi: getPipelineLabelVi(p.pipeline), values: [p.avgProcessingSeconds, p.p95ProcessingSeconds] })),
);

const costSeries: BarSeries[] = [{ key: 'avgUsd', labelVi: 'Chi phí GPU (VNĐ)', color: SERIES_1 }];
const costRows = computed<BarRow[]>(() =>
  (stats.value?.pipelines ?? []).map((p) => ({
    labelVi: getPipelineLabelVi(p.pipeline),
    values: [p.avgCostVnd],
  })),
);

const taskTotalSeries: BarSeries[] = [
  { key: 'succeeded', labelVi: 'Thành công', color: SERIES_1 },
  { key: 'failed', labelVi: 'Lỗi / hết giờ / hủy', color: SERIES_2 },
];
const taskTotalRows = computed<BarRow[]>(() =>
  (stats.value?.pipelines ?? []).map((p) => {
    const c = p.taskCounts;
    return { labelVi: getPipelineLabelVi(p.pipeline), values: [c.succeeded, c.failed + c.timed_out + c.cancelled] };
  }),
);

const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtSecs = (v: number) => `${v.toFixed(1)}s`;
const fmtVnd = (v: number) => formatVndVi(Math.round(v));
const fmtCount = (v: number) => formatNumberVi(v);

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const statsFrom = ref<string>(toLocalInput(new Date(Date.now() - 7 * 24 * 3600 * 1000)));
const statsTo = ref<string>(toLocalInput(new Date()));
const statsScope = ref<'real' | 'benchmark'>('real');
const scopeOptions = [
  { value: 'real', label: 'Thực tế (real)' },
  { value: 'benchmark', label: 'Đo thử (benchmark)' },
] as const;
const trialMotionPrice = ref<string>('');
const trialImagePrice = ref<string>('');
const statsFormErrorVi = ref<string | null>(null);

function parseTrial(raw: string, label: string): number | undefined | null {
  const v = raw.trim();
  if (v === '') return undefined;
  if (!/^\d+$/.test(v) || Number(v) <= 0) {
    statsFormErrorVi.value = `${label} phải là số nguyên dương.`;
    return null;
  }
  return Number(v);
}

async function submitStats(): Promise<void> {
  statsFormErrorVi.value = null;
  const from = new Date(statsFrom.value);
  const to = new Date(statsTo.value);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    statsFormErrorVi.value = 'Vui lòng chọn khoảng thời gian hợp lệ.';
    return;
  }
  if (to.getTime() < from.getTime()) {
    statsFormErrorVi.value = 'Thời điểm kết thúc không được sớm hơn thời điểm bắt đầu.';
    return;
  }
  const motion = parseTrial(trialMotionPrice.value, 'Giá thử mỗi giây Motion');
  const image = parseTrial(trialImagePrice.value, 'Giá thử mỗi ảnh');
  if (motion === null || image === null) return;
  await ops.fetchStats({
    from: from.toISOString(),
    to: to.toISOString(),
    scope: statsScope.value,
    motionPricePerSecond: motion,
    imagePrice: image,
  });
}

function pct(v: number | null | undefined): string {
  return v == null ? '-' : `${(v * 100).toFixed(1)}%`;
}
function secs(v: number | null | undefined): string {
  return v == null ? '-' : `${v.toFixed(1)}s`;
}

onMounted(() => {
  if (isAdmin.value) void submitStats();
});
watch(isAdmin, (admin) => {
  if (admin && !stats.value) void submitStats();
});
</script>

<template>
  <div data-testid="page-admin-stats" class="space-y-8">
    <AdminAccessGate :pending="isMePending" :admin="isAdmin">
      <header class="border-b border-border pb-6">
        <h1 class="text-3xl font-semibold tracking-tight">Thống kê</h1>
        <p class="mt-2 text-base leading-relaxed text-muted-foreground">Hiệu quả từng tính năng AI, chi phí GPU và biên gộp theo khoảng thời gian.</p>
      </header>

      <section class="space-y-5">
        <form data-testid="ops-stats-section" class="grid rounded-lg border bg-card p-5 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" @submit.prevent="submitStats">
          <Label class="flex flex-col gap-1.5">
            <span>Từ</span>
            <Input v-model="statsFrom" type="datetime-local" data-testid="ops-stats-from" />
          </Label>
          <Label class="flex flex-col gap-1.5">
            <span>Đến</span>
            <Input v-model="statsTo" type="datetime-local" data-testid="ops-stats-to" />
          </Label>
          <div class="flex flex-col gap-1.5">
            <Label for="ops-stats-scope-select">Phạm vi</Label>
            <Select v-model="statsScope">
              <SelectTrigger id="ops-stats-scope-select" role="combobox" data-testid="ops-stats-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="o in scopeOptions" :key="o.value" :value="o.value">{{ o.label }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Label class="flex flex-col gap-1.5">
            <span>Giá thử mỗi giây Motion (credit)</span>
            <Input v-model="trialMotionPrice" inputmode="numeric" data-testid="ops-stats-motion-price" placeholder="Để trống = giá thật" />
          </Label>
          <Label class="flex flex-col gap-1.5">
            <span>Giá thử mỗi ảnh (credit)</span>
            <Input v-model="trialImagePrice" inputmode="numeric" data-testid="ops-stats-image-price" placeholder="Để trống = giá thật" />
          </Label>
          <div class="flex items-end">
            <Button type="submit" data-testid="ops-stats-submit" :disabled="isStatsLoading" class="w-full">
              Xem thống kê
            </Button>
          </div>
          <p class="sm:col-span-2 xl:col-span-3 text-sm text-muted-foreground">Giá thử chỉ dùng để tính lại thống kê, không thay đổi giá thật.</p>
        </form>

        <p v-if="statsFormErrorVi" data-testid="ops-stats-form-error" role="alert" class="text-sm text-destructive">{{ statsFormErrorVi }}</p>
        <p v-if="statsErrorVi" data-testid="ops-stats-error" role="alert" class="text-sm text-destructive">{{ statsErrorVi }}</p>

        <template v-if="stats">
          <div class="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <Card>
              <CardHeader class="p-5 pb-1"><CardDescription>Đơn nạp đã duyệt</CardDescription></CardHeader>
              <CardContent class="p-5 pt-0"><CardTitle class="text-3xl">{{ formatNumberVi(stats.successMetrics.approvedTopups) }}</CardTitle></CardContent>
            </Card>
            <Card>
              <CardHeader class="p-5 pb-1"><CardDescription>Tỷ lệ chuyển đổi 30 ngày</CardDescription></CardHeader>
              <CardContent class="p-5 pt-0"><CardTitle class="text-3xl">{{ pct(stats.successMetrics.conversionRate) }}</CardTitle></CardContent>
            </Card>
            <Card class="col-span-2  xl:col-span-1">
              <CardHeader class="p-5 pb-1"><CardDescription>Chi phí GPU</CardDescription></CardHeader>
              <CardContent class="p-5 pt-0"><CardTitle class="text-3xl">{{ stats.successMetrics.gpuCostUsd.toFixed(2) }} USD</CardTitle></CardContent>
            </Card>
          </div>

          <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <AdminBarChart data-testid="stats-chart-tasks" title="Số Task theo tính năng" :series="taskTotalSeries" :rows="taskTotalRows" :format="fmtCount" />
            <AdminBarChart data-testid="stats-chart-success" title="Tỷ lệ thành công" :series="successSeries" :rows="successRows" :format="fmtPct" />
            <AdminBarChart data-testid="stats-chart-time" title="Thời gian xử lý (giây)" :series="timeSeries" :rows="timeRows" :format="fmtSecs" />
            <AdminBarChart data-testid="stats-chart-cost" title="Chi phí GPU trung bình mỗi Task" :series="costSeries" :rows="costRows" :format="fmtVnd" />
          </div>

          <h3 class="pt-2 text-lg font-semibold text-foreground">Bảng số liệu theo tính năng</h3>
          <Card class="overflow-hidden">
            <Table data-testid="ops-stats-pipelines">
              <TableHeader>
                <TableRow>
                  <TableHead>Tính năng</TableHead><TableHead>Thành công</TableHead><TableHead>TB</TableHead><TableHead>p95</TableHead><TableHead>Phí GPU TB (USD)</TableHead><TableHead>Phí GPU TB (VNĐ)</TableHead><TableHead>Phí lãng phí (USD)</TableHead><TableHead>Theo loại máy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="p in stats.pipelines" :key="p.pipeline">
                  <TableCell>{{ getPipelineLabelVi(p.pipeline) }}</TableCell>
                  <TableCell>{{ pct(p.successRate) }}</TableCell>
                  <TableCell>{{ secs(p.avgProcessingSeconds) }}</TableCell>
                  <TableCell>{{ secs(p.p95ProcessingSeconds) }}</TableCell>
                  <TableCell>{{ p.avgCostUsd === null ? '-' : `${p.avgCostUsd.toFixed(4)} USD` }}</TableCell>
                  <TableCell>{{ p.avgCostVnd === null ? '-' : formatVndVi(Math.round(p.avgCostVnd)) }}</TableCell>
                  <TableCell>{{ p.wastedCostUsd.toFixed(4) }} USD</TableCell>
                  <TableCell>{{ p.costByInstanceType.length ? p.costByInstanceType.map((i) => `${i.instanceType}: ${i.tasks} Task, ${i.costUsd.toFixed(4)} USD`).join('; ') : '-' }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>

          <h3 class="pt-2 text-lg font-semibold text-foreground">Biên gộp</h3>
          <Card class="overflow-hidden">
            <Table data-testid="ops-stats-margins">
              <TableHeader>
                <TableRow><TableHead>Tính năng</TableHead><TableHead>Gói</TableHead><TableHead>Doanh thu</TableHead><TableHead>Chi phí</TableHead><TableHead>Biên gộp</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(m, i) in stats.margins" :key="i">
                  <TableCell>{{ getPipelineLabelVi(m.pipeline) }}</TableCell>
                  <TableCell>{{ m.pack }}</TableCell>
                  <TableCell>{{ formatVndVi(Math.round(m.revenueVnd)) }}</TableCell>
                  <TableCell>{{ formatVndVi(Math.round(m.costVnd)) }}</TableCell>
                  <TableCell :class="[m.marginVnd < 0 ? 'text-destructive' : '']">{{ formatNumberVi(Math.round(m.marginVnd)) }}đ ({{ pct(m.marginRate) }})</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </template>
      </section>
    </AdminAccessGate>
  </div>
</template>
