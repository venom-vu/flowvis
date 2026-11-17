import { computed, useHead, useRequestURL, useRoute, useRuntimeConfig, useSeoMeta } from '#imports';

interface PageSeoOptions {
  title: string;
  description: string;
  /** Trang không nên được index (tài khoản, quản trị...). */
  noindex?: boolean;
}

// Đặt title, description, canonical và Open Graph cho một trang.
export function usePageSeo({ title, description, noindex = false }: PageSeoOptions) {
  const route = useRoute();
  const config = useRuntimeConfig();
  const origin = (config.public.siteUrl as string) || useRequestURL().origin;
  const url = computed(() => `${origin.replace(/\/$/, '')}${route.path}`);

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogType: 'website',
    ogSiteName: 'flowvis',
    ogLocale: 'vi_VN',
    ogUrl: url,
    ogImage: `${origin.replace(/\/$/, '')}/og-image.png`,
    twitterCard: 'summary_large_image',
    robots: noindex ? 'noindex, nofollow' : undefined,
  });
  useHead({ link: [{ rel: 'canonical', href: url }] });
}
