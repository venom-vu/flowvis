<script setup lang="ts">
import { usePageSeo } from '~/composables/usePageSeo';
import { terms } from '~/content/legal/terms';

usePageSeo({ title: 'Điều khoản dịch vụ - flowvis', description: 'Điều khoản sử dụng dịch vụ tạo ảnh và video AI flowvis: tài khoản, credit, nội dung và trách nhiệm của người dùng.' });
</script>

<template>
  <LegalDocumentView :doc="terms" testid="page-terms" />
</template>
