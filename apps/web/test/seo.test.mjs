import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AI_SEARCH_BOTS,
  AI_TRAINING_BOTS,
  ROBOTS_DISALLOW,
  SITEMAP_PATHS,
  buildRobotsTxt,
  buildSitemapXml,
} from '../utils/seo-routes.ts';

describe('seo routes', () => {
  it('sitemap chỉ chứa trang công khai và dùng đúng origin', () => {
    const xml = buildSitemapXml('https://example.test/');
    assert.match(xml, /<loc>https:\/\/example\.test\/<\/loc>/);
    assert.match(xml, /<loc>https:\/\/example\.test\/face-swap<\/loc>/);
    for (const p of ['/admin', '/history', '/tasks']) {
      assert.ok(!xml.includes(`example.test${p}<`));
    }
    assert.equal((xml.match(/<url>/g) ?? []).length, SITEMAP_PATHS.length);
  });

  it('robots chặn trang riêng tư và khai báo sitemap', () => {
    const txt = buildRobotsTxt('https://example.test');
    for (const p of ROBOTS_DISALLOW) assert.match(txt, new RegExp(`Disallow: ${p}\\n`));
    assert.match(txt, /Sitemap: https:\/\/example\.test\/sitemap\.xml/);
  });

  it('robots chặn bot huấn luyện AI nhưng cho phép bot tìm kiếm AI', () => {
    const txt = buildRobotsTxt('https://example.test');
    const groups = txt.split('\n\n').map((g) => g.split('\n'));
    const find = (agent) => groups.find((g) => g.includes(`User-agent: ${agent}`));
    for (const b of AI_TRAINING_BOTS) assert.ok(find(b).includes('Disallow: /'), b);
    for (const b of AI_SEARCH_BOTS) {
      const g = find(b);
      assert.ok(g.includes('Allow: /'), b);
      assert.ok(!g.includes('Disallow: /'), b);
      assert.ok(g.includes('Disallow: /admin'), b);
    }
  });
});

import {
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
  serializeJsonLd,
} from '../utils/seo-jsonld.ts';

describe('seo json-ld', () => {
  it('Organization và WebSite dùng đúng origin và liên kết bằng @id', () => {
    const org = buildOrganizationJsonLd('https://example.test/');
    const site = buildWebSiteJsonLd('https://example.test/');
    assert.equal(org['@type'], 'Organization');
    assert.equal(org.url, 'https://example.test/');
    assert.equal(site.publisher['@id'], org['@id']);
  });

  it('SoftwareApplication không bịa giá hay đánh giá', () => {
    const app = buildSoftwareApplicationJsonLd('https://example.test');
    assert.equal(app['@type'], 'SoftwareApplication');
    assert.ok(!('offers' in app));
    assert.ok(!('aggregateRating' in app));
  });

  it('serialize escape "<" để không đóng sớm thẻ script', () => {
    assert.ok(!serializeJsonLd({ a: '</script><b>' }).includes('<'));
  });
});
