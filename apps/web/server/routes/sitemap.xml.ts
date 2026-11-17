import { defineEventHandler, setResponseHeader } from 'h3';
import { useRuntimeConfig } from '#imports';
import { buildSitemapXml } from '../../utils/seo-routes';

export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8');
  setResponseHeader(event, 'cache-control', 'public, max-age=3600');
  return buildSitemapXml(String(useRuntimeConfig(event).public.siteUrl));
});
