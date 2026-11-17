<script setup lang="ts">
import { useRuntimeConfig } from '#imports';
import { usePageSeo } from '~/composables/usePageSeo';
import { terms } from '~/content/legal/terms';
import { resolveZaloJoinUrl } from '~/utils/system-status';

usePageSeo({
  title: 'Điều khoản dịch vụ — flowvis',
  description:
    'Điều khoản dịch vụ chính thức của nền tảng tạo ảnh và video AI flowvis: điều kiện độ tuổi 18+, quyền sử dụng hình ảnh, cơ chế credit, thanh toán VietQR, hoàn tiền và miễn trừ trách nhiệm.',
});

const publicConfig = useRuntimeConfig().public;
const contactEmail = String(publicConfig.reportEmail || '').trim();
const zaloUrl = resolveZaloJoinUrl(publicConfig.zaloUrl);
</script>

<template>
  <LegalDocumentView
    :doc="terms"
    testid="page-terms"
    contact-testid="terms-contact-email"
    :contact-email="contactEmail"
    :zalo-url="zaloUrl"
    companion-to="/privacy"
    companion-label="Đọc Chính sách quyền riêng tư"
  />
</template>
