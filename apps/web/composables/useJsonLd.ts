import { useHead, useRequestURL, useRuntimeConfig } from '#imports';
import { serializeJsonLd } from '~/utils/seo-jsonld';

export function useSiteOrigin(): string {
  return (useRuntimeConfig().public.siteUrl as string) || useRequestURL().origin;
}

// Gắn một hoặc nhiều khối JSON-LD vào <head>.
export function useJsonLd(build: (origin: string) => object | object[]) {
  const data = build(useSiteOrigin());
  const items = Array.isArray(data) ? data : [data];
  useHead({
    script: items.map((item) => ({ type: 'application/ld+json', innerHTML: serializeJsonLd(item) })),
  });
}
