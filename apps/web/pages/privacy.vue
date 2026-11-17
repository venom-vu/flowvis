<script setup lang="ts">
import { usePageSeo } from '~/composables/usePageSeo';
import { useRuntimeConfig } from '#imports';
import { privacy } from '~/content/legal/privacy';

usePageSeo({ title: 'Chính sách quyền riêng tư - flowvis', description: 'Cách flowvis thu thập, lưu trữ và bảo vệ dữ liệu cá nhân, ảnh và video bạn tải lên.' });
const contactEmail = String(useRuntimeConfig().public.reportEmail || '');
</script>

<template>
  <div>
    <LegalDocumentView :doc="privacy" testid="page-privacy" />
    <p
      v-if="contactEmail"
      class="mx-auto max-w-3xl pb-4 text-sm text-cyber-muted"
      data-testid="privacy-contact-email"
    >
      Email liên hệ:
      <a :href="`mailto:${contactEmail}`" class="text-cyber-cyan underline">{{ contactEmail }}</a>
    </p>
  </div>
</template>
