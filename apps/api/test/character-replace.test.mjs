import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import pg from 'pg';
import { Queue } from 'bullmq';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { bootstrapApi } from '../dist/main.js';
import { PipelinesModule, PIPELINE_CONFIGS } from '../dist/modules/pipelines/index.js';
import { ApiErrorCode, CharacterReplaceCreateResponseSchema, ValidationDetailsSchema, motionPrice } from '@flowvis/contracts';
import { WalletService } from '../dist/modules/wallet/index.js';
import { TaskWorkerService, TasksService } from '../dist/modules/tasks/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(apiRoot, '../..');
const composePath = path.join(repoRoot, 'deploy', 'compose.yml');
const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://motion_user:change_me_local_password@localhost:5432/flowvis?schema=public';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function tcp(host, port) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    const done = (ok) => { s.destroy(); resolve(ok); };
    s.setTimeout(1000);
    s.once('connect', () => done(true));
    s.once('timeout', () => done(false));
    s.once('error', () => done(false));
    s.connect(port, host);
  });
}

async function ensureInfra() {
  const u = new URL(DB_URL);
  const r = new URL(REDIS_URL);
  const services = [];
  if (!(await tcp(u.hostname || 'localhost', Number(u.port || 5432)))) services.push('postgres-16');
  if (!(await tcp(r.hostname || 'localhost', Number(r.port || 6379)))) services.push('redis-7');
  if (services.length) {
    execFileSync('docker', ['compose', '-f', composePath, 'up', '-d', '--wait', ...services], {
      cwd: repoRoot, stdio: 'inherit',
    });
  }
  execFileSync('pnpm', ['run', 'prisma:migrate:deploy'], {
    cwd: apiRoot, env: { ...process.env, DATABASE_URL: DB_URL }, stdio: 'inherit',
  });
}




const queueCalls = [];
Queue.prototype.add = async function (name, data, opts) { queueCalls.push({ name, data, opts }); return { id: opts?.jobId }; };
Queue.prototype.getJob = async function () { return null; };

process.env.RUNNINGHUB_WORKFLOW_BODY_RESHAPE ??= 'wf-body';
process.env.RUNNINGHUB_WORKFLOW_MOTION ??= 'wf-motion';
process.env.RUNNINGHUB_WORKFLOW_CHARACTER_REPLACE ??= 'wf-replace';
// Không bao giờ gọi RunningHub thật: worker.rh bị thay bằng bản giả bên dưới.
delete process.env.RUNNINGHUB_API_KEY;

describe('Thay Nhân Vật Video: tạo Task, worker, giá', () => {
  let app, baseUrl, pool, prisma, jwt, worker, tasksSvc;
  const runId = crypto.randomBytes(4).toString('hex');
  const users = [];

  async function newUser({ balance = 5000, locked = false, tierPack = null } = {}) {
    const n = users.length;
    const u = await prisma.user.create({ data: { googleId: `mc-${runId}-${n}`, email: `mc-${runId}-${n}@flowvis.vn`, tosVersion: 'tos-v7', lockedAt: locked ? new Date() : null, tierPack } });
    users.push(u.id);
    if (balance > 0) await prisma.$transaction((t) => new WalletService().grant(t, u.id, balance));
    return { id: u.id, token: jwt.sign({ sub: u.id, email: u.email, role: 'user' }) };
  }
  async function img(user) {
    const uuid = crypto.randomUUID();
    await prisma.upload.create({ data: { userId: user.id, key: `in-raw/${user.id}/${uuid}`, kind: 'image', mimeType: 'image/jpeg', declaredBytes: 10, status: 'confirmed', confirmedKey: `in/${user.id}/${uuid}` } });
    return `in/${user.id}/${uuid}`;
  }
  async function vid(user, durationSeconds = 20, extra = {}) {
    const uuid = crypto.randomUUID();
    await prisma.upload.create({ data: { userId: user.id, key: `in-raw/${user.id}/${uuid}`, kind: 'video', mimeType: 'video/mp4', declaredBytes: 10, status: 'confirmed', confirmedKey: `in/${user.id}/${uuid}`, durationSeconds, confirmedAt: new Date(), ...extra } });
    return `in/${user.id}/${uuid}`;
  }
  const P = 'hành động nhảy múa';
  const raw = (user, body) => fetch(`${baseUrl}/tasks/character-replace`, { method: 'POST', headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const post = (user, body0) => raw(user, { prompt: P, ...body0 });
  const row = (id) => pool.query('SELECT * FROM tasks WHERE id=$1', [id]).then((r) => r.rows[0]);
  const countFor = async (u) => ({
    tasks: (await pool.query('SELECT count(*)::int n FROM tasks WHERE user_id=$1', [u.id])).rows[0].n,
    ledger: (await pool.query('SELECT count(*)::int n FROM ledger_entries WHERE user_id=$1', [u.id])).rows[0].n,
  });
  async function expectReason(res, reason, cap) {
    assert.equal(res.status, 400);
    const j = await res.json();
    assert.equal(j.code, ApiErrorCode.VALIDATION_FAILED);
    const d = ValidationDetailsSchema.parse(j.details);
    assert.equal(d.reason, reason);
    if (cap !== undefined) assert.equal(d.cap, cap);
  }

  before(async () => {
    process.env.DATABASE_URL = DB_URL;
    process.env.REDIS_URL = REDIS_URL;
    process.env.PORT = '0';
    process.env.JWT_SECRET = 'super-secret-test-jwt-key-with-at-least-32-chars-ok';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.RUNNINGHUB_WORKFLOW_FACESWAP = 'wf-1';
    await ensureInfra();
    pool = new pg.Pool({ connectionString: DB_URL });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    app = await bootstrapApi();
    baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}`;
    jwt = app.get(JwtService);
    worker = app.get(TaskWorkerService);
    tasksSvc = app.get(TasksService);
  });
  after(async () => {
    if (prisma) {
      await pool.query('DELETE FROM ledger_entries WHERE user_id = ANY($1::uuid[])', [users]);
      await pool.query('DELETE FROM tasks WHERE user_id = ANY($1::uuid[])', [users]);
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
    await pool?.end().catch(() => {});
    await app?.close();
  });

  it('HAPPY_PATH: trim 5s => price 250, HOLD 250, params và jobId đúng', async () => {
    const u = await newUser({ balance: 1000 });
    const v = await vid(u, 20); const c = await img(u);
    queueCalls.length = 0;
    const res = await post(u, { characterKey: c, videoKey: v, trimStart: 1, trimEnd: 6 });
    assert.equal(res.status, 201);
    const t = CharacterReplaceCreateResponseSchema.parse(await res.json());
    assert.equal(t.pipeline, 'character_replace');
    assert.equal(t.price, motionPrice(5));
    assert.equal(t.price, 250);
    const r = await row(t.id);
    assert.deepEqual(r.params, { trimStart: 1, trimEnd: 6, seconds: 5, price: 250, prompt: P });
    assert.equal(r.status, 'queued');
    assert.equal(r.pipeline, 'character_replace');
    assert.deepEqual(r.input_keys, { characterKey: c, videoKey: v });
    const holds = await prisma.ledgerEntry.findMany({ where: { taskId: t.id, type: 'HOLD' } });
    assert.equal(Number(holds[0].amount), -250);
    assert.equal(queueCalls[0].opts.jobId, t.id);
  });

  it('TRIM_SHORT / OVER_CAP / trim ngoài video: không HOLD', async () => {
    const u = await newUser({ balance: 5000 });
    const v = await vid(u, 20); const c = await img(u);
    await expectReason(await post(u, { characterKey: c, videoKey: v, trimStart: 0, trimEnd: 2 }), 'TRIM_TOO_SHORT');
    await expectReason(await post(u, { characterKey: c, videoKey: v, trimStart: 0, trimEnd: 6 }), 'TRIM_EXCEEDS_CAP', 5);
    await expectReason(await post(u, { characterKey: c, videoKey: v, trimStart: 15, trimEnd: 25 }), 'TRIM_OUT_OF_VIDEO');
    await expectReason(await post(u, { characterKey: c, videoKey: v, trimStart: 0, trimEnd: 4.5 }), 'TRIM_NOT_WHOLE_SECOND');
    assert.deepEqual(await countFor(u), { tasks: 0, ledger: 1 });
  });

  it('PROMPT_INVALID: rỗng, chỉ khoảng trắng, thiếu, quá 300 ký tự', async () => {
    const u = await newUser({ balance: 5000 });
    const v = await vid(u, 20); const c = await img(u);
    const base = { characterKey: c, videoKey: v, trimStart: 0, trimEnd: 4 };
    for (const body of [{ ...base, prompt: '' }, { ...base, prompt: '   ' }, { ...base }, { ...base, prompt: 'x'.repeat(301) }]) {
      const res = await raw(u, body);
      assert.equal(res.status, 400);
      assert.equal((await res.json()).code, ApiErrorCode.VALIDATION_FAILED);
    }
    const ok = await raw(u, { ...base, prompt: 'x'.repeat(300) });
    assert.equal(ok.status, 201);
    assert.equal((await pool.query(`SELECT count(*)::int n FROM ledger_entries WHERE user_id=$1 AND type='HOLD'`, [u.id])).rows[0].n, 1);
  });

  it('KEY_FOREIGN: khóa người khác hoặc trùng nhau', async () => {
    const a = await newUser(); const b = await newUser();
    const c = await img(a); const v = await vid(a, 10);
    const ok = { trimStart: 0, trimEnd: 4 };
    for (const body of [
      { characterKey: c, videoKey: await vid(b, 10) },
      { characterKey: await img(b), videoKey: v },
      { characterKey: v, videoKey: v },
      { characterKey: c, videoKey: await img(a) },
    ]) {
      const res = await post(a, { ...ok, ...body });
      assert.equal(res.status, 400);
      assert.equal((await res.json()).code, ApiErrorCode.VALIDATION_FAILED);
    }
    assert.deepEqual(await countFor(a), { tasks: 0, ledger: 1 });
  });

  it('NO_CREDIT: 402 INSUFFICIENT_CREDIT, không tạo Task', async () => {
    const poor = await newUser({ balance: 199 });
    const res = await post(poor, { characterKey: await img(poor), videoKey: await vid(poor), trimStart: 0, trimEnd: 4 });
    assert.equal(res.status, 402);
    assert.equal((await res.json()).code, ApiErrorCode.INSUFFICIENT_CREDIT);
    assert.equal((await pool.query(`SELECT count(*)::int n FROM tasks WHERE user_id=$1`, [poor.id])).rows[0].n, 0);
  });

  describe('worker (RunningHub giả, không mạng)', () => {
    let calls, outputsQueue, ingestCalls, saved;
    const envKeys = ['RH_POLL_INTERVAL_MS', 'RH_GATE_RETRY_MS', 'RH_MAX_CONCURRENT'];
    const cfg = () => PIPELINE_CONFIGS.character_replace;
    let origPrepare;
    const ledger = (id, type) => prisma.ledgerEntry.findMany({ where: { taskId: id, type } });
    async function clearGate() {
      await pool.query(`UPDATE tasks SET status='failed', reason_code='RH_ERROR', finished_at=now(), rh_orphan_until=NULL WHERE user_id = ANY($1::uuid[]) AND status IN ('queued','running')`, [users]);
      process.env.RH_MAX_CONCURRENT = String((await tasksSvc.countGateOccupied()) + 2);
    }
    async function mkTask() {
      const u = await newUser({ tierPack: 'starter' });
      const res = await post(u, { characterKey: await img(u), videoKey: await vid(u), trimStart: 0, trimEnd: 5 });
      assert.equal(res.status, 201);
      return (await res.json()).id;
    }
    function reset() {
      calls = { upload: 0, submit: 0 };
      outputsQueue = [{ status: 'SUCCESS', fileUrl: 'http://x/y.mp4', consumeMoney: 3 }];
      ingestCalls = [];
    }

    before(() => {
      saved = Object.fromEntries(envKeys.map((k) => [k, process.env[k]]));
      process.env.RH_POLL_INTERVAL_MS = '20';
      process.env.RH_GATE_RETRY_MS = '30';
      worker.rh = {
        uploadFile: async () => `f${++calls.upload}`,
        submit: async (...a) => { calls.submit++; calls.nodes = a; return 'rh-cr1'; },
        outputs: async () => { const n = outputsQueue.length > 1 ? outputsQueue.shift() : outputsQueue[0]; return n; },
      };
      worker.ingestor = { ingest: async (t, url, money) => { ingestCalls.push({ t, url, money }); await tasksSvc.transition(t.id, 'running', 'failed', 'OUTPUT_UPLOAD_ERROR'); } };
      origPrepare = cfg().prepare;
      Object.defineProperty(cfg(), 'prepare', {
        configurable: true, writable: true,
        value: async () => ({ characterKey: Buffer.from('C'), videoKey: Buffer.from('V') }),
      });
    });
    after(() => {
      Object.defineProperty(cfg(), 'prepare', { configurable: true, writable: true, value: origPrepare });
      for (const k of envKeys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
    });

    it('gửi đúng 5 node: 352 video, 318 image, 284 text, 339 = "5", 341 = "0"', async () => {
      reset(); await clearGate();
      const id = await mkTask();
      await worker.processTask(id);
      assert.equal(calls.upload, 2);
      assert.equal(calls.submit, 1);
      assert.deepEqual(calls.nodes[1], [
        { nodeId: '352', fieldName: 'video', fieldValue: 'f1' },
        { nodeId: '318', fieldName: 'image', fieldValue: 'f2' },
        { nodeId: '284', fieldName: 'text', fieldValue: P },
        { nodeId: '339', fieldName: 'int', fieldValue: '5' },
        { nodeId: '341', fieldName: 'int', fieldValue: '0' },
      ]);
      assert.equal(ingestCalls.length, 1, 'kết quả đi vào nhánh nhập video');
    });

    it('adapter unconfigured: RH_ERROR, failed, RELEASED 100%', async () => {
      reset(); await clearGate();
      const { UnconfiguredRunningHubAdapter } = await import('../dist/modules/tasks/runninghub-unconfigured.adapter.js');
      const prevRh = worker.rh;
      worker.rh = new UnconfiguredRunningHubAdapter();
      try {
        const id = await mkTask();
        await worker.processTask(id);
        const r = await row(id);
        assert.equal(r.status, 'failed');
        assert.equal(r.reason_code, 'RH_ERROR');
        const rel = await ledger(id, 'RELEASED');
        assert.equal(rel.length, 1);
        assert.equal(Number(rel[0].amount), 250);
      } finally { worker.rh = prevRh; }
    });

    it('RH_FAIL: FAILED => failed, RELEASED 100%', async () => {
      reset(); await clearGate();
      outputsQueue = [{ status: 'FAILED', errorMessage: 'NO_POSE: x', consumeMoney: 2 }];
      const id = await mkTask();
      await worker.processTask(id);
      const r = await row(id);
      assert.equal(r.status, 'failed');
      assert.equal(r.reason_code, 'NO_POSE');
      const rel = await ledger(id, 'RELEASED');
      assert.equal(rel.length, 1);
      assert.equal(Number(rel[0].amount), 250);
      assert.equal((await ledger(id, 'CAPTURED')).length, 0);
    });
  });

  it('migration: CHECK pipeline nhận character_replace; cấu hình không bắt buộc lúc khởi động', async () => {
    const chk = await pool.query(`SELECT pg_get_constraintdef(oid) def FROM pg_constraint WHERE conname='tasks_pipeline_valid_chk'`);
    assert.match(chk.rows[0].def, /character_replace/);
    assert.notEqual(PIPELINE_CONFIGS.character_replace.requiredAtStartup, true);
    const saved = process.env.RUNNINGHUB_WORKFLOW_CHARACTER_REPLACE;
    delete process.env.RUNNINGHUB_WORKFLOW_CHARACTER_REPLACE;
    try {
      const ctx = await NestFactory.createApplicationContext(PipelinesModule, { logger: false, abortOnError: false });
      await ctx.close();
    } finally {
      if (saved !== undefined) process.env.RUNNINGHUB_WORKFLOW_CHARACTER_REPLACE = saved;
    }
  });
});
