<script setup lang="ts">
import { useRuntimeConfig } from '#imports';
import { usePageSeo } from '~/composables/usePageSeo';
import { privacy } from '~/content/legal/privacy';
import { resolveZaloJoinUrl } from '~/utils/system-status';

usePageSeo({
  title: 'Chính sách quyền riêng tư — flowxis',
  description:
    'Chính sách quyền riêng tư chính thức của flowxis: dữ liệu thu thập, mục đích sử dụng, thời gian lưu trữ tự động xóa và quyền xóa dữ liệu cá nhân.',
});

const publicConfig = useRuntimeConfig().public;
const contactEmail = String(publicConfig.reportEmail || '').trim();
const zaloUrl = resolveZaloJoinUrl(publicConfig.zaloUrl);
</script>

<template>
  <LegalDocumentView
    :doc="privacy"
    testid="page-privacy"
    contact-testid="privacy-contact-email"
    :contact-email="contactEmail"
    :zalo-url="zaloUrl"
    companion-to="/terms"
    companion-label="Đọc Điều khoản dịch vụ"
  />
</template>
