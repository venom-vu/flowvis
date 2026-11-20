// Tên và logo tạm; đổi tại đây khi chốt thương hiệu/pháp nhân.
export const BRAND_NAME = 'flowvis';
export const BRAND_LOGO_PATH = '/favicon.svg';

const trim = (origin: string) => origin.replace(/\/$/, '');

export function buildOrganizationJsonLd(origin: string) {
  const base = trim(origin);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${base}/#organization`,
    name: BRAND_NAME,
    url: `${base}/`,
    logo: `${base}${BRAND_LOGO_PATH}`,
  };
}

export function buildWebSiteJsonLd(origin: string) {
  const base = trim(origin);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    name: BRAND_NAME,
    url: `${base}/`,
    inLanguage: 'vi',
    publisher: { '@id': `${base}/#organization` },
  };
}

// Không khai báo offers/aggregateRating: giá tính theo credit và chưa có đánh giá thật.
export function buildSoftwareApplicationJsonLd(origin: string) {
  const base = trim(origin);
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: BRAND_NAME,
    url: `${base}/`,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    inLanguage: 'vi',
    description:
      'Nền tảng tạo ảnh và video AI: hoán đổi khuôn mặt, đổi trang phục, nâng ngực và điều khiển chuyển động.',
    publisher: { '@id': `${base}/#organization` },
  };
}

// Escape "<" để chuỗi JSON không đóng sớm thẻ <script>.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
