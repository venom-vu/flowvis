import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { DiscordNotifierAdapter } from '../dist/modules/ops/discord-notifier.adapter.js';

describe('DiscordNotifierAdapter: cắt nội dung và timeout', () => {
  let server;
  let url;
  let mode = 'ok';
  const received = [];
  const hangingSockets = new Set();

  before(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        if (mode === 'hang') {
          hangingSockets.add(res);
          return;
        }
        received.push(JSON.parse(body));
        res.statusCode = 204;
        res.end();
      });
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${server.address().port}/api/webhooks/123/SECRET_TOKEN`;
  });

  after(async () => {
    for (const r of hangingSockets) r.destroy();
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  });

  it('nội dung dài hơn 2000 ký tự bị cắt còn đúng 2000, kết thúc bằng "…", không tách cặp thay thế', async () => {
    mode = 'ok';
    received.length = 0;
    // Biểu tượng ngoài BMP chiếm 2 đơn vị UTF-16: cắt theo đơn vị sẽ tạo surrogate lẻ.
    const message = '😀'.repeat(2500);
    await new DiscordNotifierAdapter(url).notify({ kind: 'LEDGER_MISMATCH', severity: 'error', message });
    assert.equal(received.length, 1);
    const content = received[0].embeds[0].description;
    assert.ok(Array.from(content).length <= 2000, `độ dài ${Array.from(content).length}`);
    assert.ok(content.endsWith('…'));
    assert.doesNotMatch(content, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
  });

  it('nội dung ngắn được giữ nguyên, không bị cắt', async () => {
    mode = 'ok';
    received.length = 0;
    await new DiscordNotifierAdapter(url).notify({ kind: 'X', message: 'ngắn' });
    const embed = received[0].embeds[0];
    assert.equal(embed.description, 'ngắn');
    assert.equal(embed.title, 'Thông tin: X');
    assert.equal(embed.color, 0x5865f2);
    assert.equal(embed.fields, undefined);
    assert.deepEqual(received[0].allowed_mentions, { parse: [] });
  });

  it('mức độ quyết định màu, kind đã biết có tiêu đề tiếng Việt, mỗi khóa data là một trường', async () => {
    mode = 'ok';
    received.length = 0;
    await new DiscordNotifierAdapter(url).notify({
      kind: 'ops.breaker_triggered',
      severity: 'error',
      message: 'm',
      data: { rule: 'R', errorRate: 0.5, nested: { a: 1 } },
    });
    const embed = received[0].embeds[0];
    assert.equal(embed.title, 'Lỗi: Ngắt mạch đã kích hoạt');
    assert.equal(embed.color, 0xed4245);
    assert.deepEqual(
      embed.fields.map((f) => [f.name, f.value]),
      [['Quy tắc', 'R'], ['Tỉ lệ lỗi', '0.5'], ['nested', '{"a":1}']],
    );
    assert.equal(embed.footer.text, 'flowvis · ops.breaker_triggered');
  });

  it('máy chủ nhận kết nối nhưng không trả lời: notify bị từ chối nhanh, lỗi không lộ URL webhook', { timeout: 6000 }, async () => {
    mode = 'hang';
    const started = Date.now();
    await assert.rejects(
      new DiscordNotifierAdapter(url, 200).notify({ kind: 'X', message: 'treo' }),
      (err) => {
        assert.ok(!String(err.message).includes('SECRET_TOKEN'));
        assert.ok(!String(err.message).includes('127.0.0.1'));
        return true;
      },
    );
    assert.ok(Date.now() - started < 3000, 'phải hết hạn trong vài trăm ms, không treo');
  });
});
