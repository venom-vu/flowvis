import { defineEventHandler, setResponseHeader } from 'h3';
import { useRuntimeConfig } from '#imports';
import { buildRobotsTxt } from '../../utils/seo-routes';

export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8');
  setResponseHeader(event, 'cache-control', 'public, max-age=3600');
  return buildRobotsTxt(String(useRuntimeConfig(event).public.siteUrl));
});
