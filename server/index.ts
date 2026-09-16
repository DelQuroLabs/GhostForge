import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { router, HError } from './routes.js';
import { audioRouter } from './audioRoutes.js';
import { ready as dbReady } from './db.js';
import { ensureBucket } from './storage.js';

const app = express();
app.use(express.json({ limit: '12mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api', router);
app.use('/api', audioRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown API route' } }));

// error formatter: HError + Zod + AI codes → envelope
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof HError) return void res.status(err.status).json({ error: { code: err.code, message: err.message } });
  const e = err as { name?: string; issues?: Array<{ path: Array<string | number>; message: string }>; code?: string; message?: string };
  if (e?.name === 'ZodError') {
    const fields: Record<string, string> = {};
    for (const i of e.issues ?? []) fields[i.path.join('.') || '(root)'] = i.message;
    return void res.status(400).json({ error: { code: 'VALIDATION', message: 'Invalid input', fields } });
  }
  if (e?.code === 'NO_KEY') return void res.status(409).json({ error: { code: 'NO_KEY', message: e.message ?? 'No AI key' } });
  console.error('[api-error]', e?.message ?? err);
  return void res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
});

const PORT = Number(process.env.PORT || 3000);

async function main() {
  try {
    await dbReady();
    console.log('[ghostforge] Supabase connected (publishable key - zero secrets on this machine)');
  } catch (e) {
    console.error('[ghostforge] DATABASE PROBLEM:', (e as Error).message);
  }
  try {
    const { loadNovelPack } = await import('./novelEngine.js');
    loadNovelPack();
    console.log('[ghostforge] novel engine pack OK');
  } catch (e) {
    console.error('[ghostforge] NOVEL PACK PROBLEM:', (e as Error).message);
  }
  try {
    await ensureBucket();
    console.log('[ghostforge] audio bucket OK');
  } catch (e) {
    console.error('[ghostforge] STORAGE PROBLEM:', (e as Error).message);
  }
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' });
    app.use(vite.middlewares);
    console.log('[ghostforge] dev mode: vite middleware attached');
  } else {
    const dist = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(path.join(dist, 'index.html'))) {
      console.error('[ghostforge] dist/ missing — run npm run build first');
      process.exit(1);
    }
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
    console.log('[ghostforge] prod mode: serving dist/');
  }
  app.listen(PORT, '0.0.0.0', () => {
    const sb = process.env.E2B_SANDBOX_ID;
    console.log(`[ghostforge] listening on 0.0.0.0:${PORT}` + (sb ? ` → https://${PORT}-${sb}.e2b.app` : ''));
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
