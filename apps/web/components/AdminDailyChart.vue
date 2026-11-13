<script setup lang="ts">
import { computed } from 'vue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from '@/components/ui/chart-bar';

/** Biểu đồ cột theo ngày (một series) dựng từ BarChart của shadcn-vue. */
const props = withDefaults(
  defineProps<{
    title: string;
    points: Array<{ date: string; count: number }>;
    color?: string;
    unitVi?: string;
  }>(),
  { color: 'hsl(var(--chart-1))', unitVi: 'Số lượng' },
);

const category = computed(() => props.unitVi || 'Số lượng');
const total = computed(() => props.points.reduce((sum, p) => sum + p.count, 0));
const data = computed(() =>
  props.points.map((p) => {
    const [, m, d] = p.date.split('-');
    return { date: `${Number(d)}/${Number(m)}`, [category.value]: p.count };
  }),
);
// Nhãn trục X thưa: khoảng 6 nhãn, luôn có ngày cuối.
const xFormatter = (v: number | Date): string => {
  const i = Number(v);
  const n = props.points.length;
  const every = Math.max(1, Math.ceil(n / 6));
  return (n - 1 - i) % every === 0 ? (data.value[i]?.date ?? '') : '';
};
</script>

<template>
  <Card class="p-5">
    <CardHeader class="flex flex-row items-baseline justify-between gap-2 p-0 pb-4">
      <CardTitle class="text-base">{{ title }}</CardTitle>
      <span class="text-sm text-muted-foreground">Tổng {{ total }} {{ unitVi }}</span>
    </CardHeader>
    <CardContent class="p-0">
      <BarChart
        class="h-[220px]"
        :data="data"
        index="date"
        :categories="[category]"
        :colors="[color]"
        :x-formatter="xFormatter"
        :show-legend="false"
        :rounded-corners="2"
      />
    </CardContent>
  </Card>
</template>
