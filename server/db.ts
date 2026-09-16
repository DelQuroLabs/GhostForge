// Ghostforge persistence: Supabase via the publishable key (PostgREST + RPC).
//
// Zero secrets on this machine: the server holds only SUPABASE_URL and
// SUPABASE_PUBLISHABLE_KEY (public by design — it can only touch the tables
// opened to it by SUPABASE_SETUP.sql, which the project owner runs once in
// the Supabase SQL editor). No service key, no database password, no db file.
//
// Multi-step writes stay atomic through RPC functions (also created by the
// setup script): rpc_forge_create, rpc_chapter_delete, rpc_plan_draft,
// rpc_import, rpc_restore. Everything else is direct table access.
import ws from 'ws';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// supabase-js initializes its realtime client at construction, which needs a
// WebSocket implementation (Node 20 has none built in). We never use realtime,
// but the constructor requires this to exist.
(globalThis as { WebSocket?: unknown }).WebSocket ??= ws;

export const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const url = process.env.SUPABASE_URL;
const pub = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !pub) {
  throw new Error(
    'SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY are not set. Both live on your Supabase dashboard (Settings → API Keys) — copy .env.example to .env and fill them in.',
  );
}

export const sb: SupabaseClient = createClient(url, pub, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Called at boot so a missing setup shows up in the logs immediately.
// (A real GET, not HEAD: error bodies are what carry the PGRST205 signal.)
export async function ready(): Promise<void> {
  const { error } = await sb.from('books').select('id').limit(1);
  if (error) {
    if (error.code === 'PGRST205') {
      throw new Error(
        'Supabase tables not found — run SUPABASE_SETUP.sql in your Supabase SQL editor (steps in SUPABASE.md), then restart.',
      );
    }
    throw new Error(`Supabase problem: ${error.message}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRes = { data: any; error: { message: string } | null };

// Unwrap a PostgREST response, throwing on error so routes fail exactly like
// SQL errors used to (→ 500 envelope via the error middleware).
export async function q<T>(p: PromiseLike<AnyRes>, what: string): Promise<T> {
  const r = await p;
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await q<{ value: string } | null>(
    sb.from('settings').select('value').eq('key', key).maybeSingle(),
    'getSetting',
  );
  return row?.value ?? null;
}
export async function setSetting(key: string, value: string): Promise<void> {
  await q(sb.from('settings').upsert({ key, value }, { onConflict: 'key' }), 'setSetting');
}
export async function delSetting(key: string): Promise<void> {
  await q(sb.from('settings').delete().eq('key', key), 'delSetting');
}
