<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

const props = defineProps<{ open: boolean; title: string; busy: boolean; errorVi?: string | null }>();
const emit = defineEmits<{ cancel: []; confirm: [] }>();

function onOpenChange(next: boolean): void {
  if (!next && !props.busy) emit('cancel');
}
</script>

<template>
  <AlertDialog :open="open" @update:open="onOpenChange">
    <AlertDialogContent data-testid="ops-confirm-dialog" class="max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription as-child>
          <div class="space-y-2 text-base leading-relaxed">
            <slot />
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <p v-if="errorVi" data-testid="ops-confirm-error" role="alert" class="text-sm text-destructive">{{ errorVi }}</p>
      <AlertDialogFooter>
        <Button type="button" variant="outline" data-testid="ops-confirm-cancel" :disabled="busy" @click="emit('cancel')">Hủy</Button>
        <Button type="button" data-testid="ops-confirm-ok" :disabled="busy" @click="emit('confirm')">
          <Icon v-if="busy" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
          <span>Xác nhận</span>
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
