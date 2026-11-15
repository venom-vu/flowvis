<script setup lang="ts">
import type { BulletLegendItemInterface } from "@unovis/ts"
import { BulletLegend } from "@unovis/ts"
import { VisBulletLegend } from "@unovis/vue"
import { nextTick, onMounted, ref } from "vue"
import { buttonVariants } from '@/components/ui/button'

const props = withDefaults(defineProps<{ items: BulletLegendItemInterface[] }>(), {
  items: () => [],
})

const emits = defineEmits<{
  "legendItemClick": [d: BulletLegendItemInterface, i: number]
  "update:items": [payload: BulletLegendItemInterface[]]
}>()

const elRef = ref<HTMLElement>()

function keepStyling() {
  const selector = `.${BulletLegend.selectors.item}`
  nextTick(() => {
    const elements = elRef.value?.querySelectorAll(selector)
    const classes = buttonVariants({ variant: "ghost", size: "xs" }).split(" ")

    elements?.forEach(el => el.classList.add(...classes, "!inline-flex", "!mr-2", "!max-w-full"))
  })
}

onMounted(() => {
  keepStyling()
})

function onLegendItemClick(d: BulletLegendItemInterface, i: number) {
  emits("legendItemClick", d, i)
  const isBulletActive = !props.items[i]?.inactive
  const isFilterApplied = props.items.some(i => i.inactive)
  if (isFilterApplied && isBulletActive) {
    // reset filter
    emits("update:items", props.items.map(item => ({ ...item, inactive: false })))
  }
  else {
    // apply selection, set other item as inactive
    emits("update:items", props.items.map(item => item.name === d.name ? ({ ...d, inactive: false }) : { ...item, inactive: true }))
  }
  keepStyling()
}
</script>

<template>
  <div
    ref="elRef"
    class="w-fit max-w-full shrink-0 [&_[data-vis-bullet-legend]]:flex [&_[data-vis-bullet-legend]]:flex-wrap [&_[data-vis-bullet-legend]]:justify-end [&_[data-vis-bullet-legend]]:gap-y-1"
    :style="{
      '--vis-legend-bullet-size': '16px',
    }"
  >
    <VisBulletLegend
      :items="items"
      :on-legend-item-click="onLegendItemClick"
    />
  </div>
</template>
