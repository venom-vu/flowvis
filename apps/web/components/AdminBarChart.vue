<script setup lang="ts">
import { computed } from 'vue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from '@/components/ui/chart-bar';

/**
 * Biểu đồ cột dựng từ BarChart của shadcn-vue (Unovis). Mỗi dòng dữ liệu là một cột nhóm,
 * mỗi series là một cột trong nhóm; tooltip và legend là của shadcn chart.
 */
export interface BarSeries {
  key: string;
  labelVi: string;
  /** Màu theo thứ tự cố định của bảng màu chart, không theo thứ hạng. */
  color: string;
}
export interface BarRow {
  labelVi: string;
  /** Một giá trị cho mỗi series; null = không có dữ liệu. */
  values: Array<number | null>;
}

const props = withDefaults(
  defineProps<{
    title: string;
    series: BarSeries[];
    rows: BarRow[];
    format?: (v: number) => string;
  }>(),
  { format: (v: number) => String(v) },
);

const index = 'labelVi';
const categories = computed(() => props.series.map((s) => s.labelVi));
const colors = computed(() => props.series.map((s) => s.color));
const data = computed(() =>
  props.rows.map((r) => {
    const row: Record<string, string | number> = { [index]: r.labelVi };
    props.series.forEach((s, i) => {
      row[s.labelVi] = r.values[i] ?? 0;
    });
    return row;
  }),
);
const yFormatter = (v: number | Date): string => props.format(Number(v));
</script>

<template>
  <Card class="p-5">
    <CardHeader class="p-0 pb-4">
      <CardTitle class="text-base">{{ title }}</CardTitle>
    </CardHeader>
    <CardContent class="p-0">
      <p v-if="rows.length === 0" class="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
      <BarChart
        v-else
        class="h-[260px]"
        :data="data"
        :index="index"
        :categories="categories"
        :colors="colors"
        :y-formatter="yFormatter"
        :show-legend="series.length >= 2"
        :rounded-corners="2"
      />
    </CardContent>
  </Card>
</template>
