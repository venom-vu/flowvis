<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{
  title?: string
  data: {
    name: string
    color: string
    value: any
  }[]
}>()
</script>

<template>
  <Card
    data-testid="chart-tooltip"
    class="border-border bg-popover text-popover-foreground text-sm shadow-xl"
  >
    <CardHeader v-if="title" class="border-b border-border px-3 py-2">
      <CardTitle class="text-xs font-medium text-popover-foreground">
        {{ title }}
      </CardTitle>
    </CardHeader>
    <CardContent class="flex min-w-[180px] flex-col gap-1.5 px-3 py-2.5">
      <div v-for="(item, key) in data" :key="key" class="flex items-center justify-between gap-4">
        <div class="flex items-center">
          <span class="mr-2 h-2.5 w-2.5 shrink-0">
            <svg width="100%" height="100%" viewBox="0 0 30 30">
              <path
                d=" M 15 15 m -14, 0 a 14,14 0 1,1 28,0 a 14,14 0 1,1 -28,0"
                :stroke="item.color"
                :fill="item.color"
                stroke-width="1"
              />
            </svg>
          </span>
          <span class="text-muted-foreground">{{ item.name }}</span>
        </div>
        <span class="font-mono font-semibold tabular-nums text-popover-foreground">{{ item.value }}</span>
      </div>
    </CardContent>
  </Card>
</template>
