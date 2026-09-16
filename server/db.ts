// Ghostforge data layer — self-hosted SQLite (better-sqlite3, file at ./data/app.db).
//
// Same shape the routes were written against: `sb.from(table).select/eq/order/…`
// builders, `sb.rpc(…)`, the `q()` unwrap helper, settings helpers, `ready()`,
// `now()`. Only the query-API subset the app actually uses is implemented —
// anything else throws a loud "unsupported" error instead of silently
// misbehaving. Multi-step writes (the old rpc_* functions) run as real
// SQLite transactions below.
import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const now = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

// ---------- database file ----------
const here = dirname(fileURLToPath(import.meta.url)); // server/ in dev, dist-server/ in prod
export const dataDir = process.env.GHOSTFORGE_DATA || join(process.cwd(), 'data');
mkdirSync(dataDir, { recursive: true });
export const dbFile = process.env.GHOSTFORGE_DB || join(dataDir, 'app.db');
export const sqlite = new Database(dbFile);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('foreign_keys = ON');

function loadSchema(): string {
  const candidates = [join(here, 'schema.sql'), join(process.cwd(), 'server', 'schema.sql')];
  for (const c of candidates) {
    try {
      return readFileSync(c, 'utf8');
    } catch {
      /* try next */
    }
  }
  throw new Error('schema.sql not found (looked next to db.js and in ./server/) — reinstall the app files.');
}
sqlite.exec(loadSchema());

// ---------- result shapes ----------
export type DbError = { message: string; code?: string };
export type DbResult<T> = { data: T; error: DbError | null; count?: number };

export async function q<T>(p: PromiseLike<DbResult<T>>, what: string): Promise<T> {
  const r = await p;
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
}

// ---------- query builder ----------
type Row = Record<string, any>;
type Filter = { col: string; op: 'eq' | 'neq'; val: unknown } | { col: string; op: 'notnull' };
type Order = { col: string; asc: boolean; nulls: 'first' | 'last' };
type Embed = { table: string; col: string };

const ident = (s: string) => `"${s.replace(/"/g, '""')}"`;
const bind = (v: unknown) => (v === undefined ? null : v);

function splitCols(spec: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of spec) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

class QB implements PromiseLike<DbResult<any>> {
  private kind: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private cols = '*';
  private countExact = false;
  private headOnly = false;
  private payload: Row | Row[] | null = null;
  private onConflict: string | null = null;
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitN: number | null = null;
  private singleMode: 'single' | 'maybeSingle' | null = null;

  constructor(private table: string) {}

  select(cols = '*', opts?: { count?: 'exact'; head?: boolean }): this {
    this.kind = 'select';
    this.cols = cols;
    if (opts?.count === 'exact') this.countExact = true;
    if (opts?.head) this.headOnly = true;
    return this;
  }
  insert(payload: Row | Row[]): this {
    this.kind = 'insert';
    this.payload = payload;
    return this;
  }
  update(payload: Row): this {
    this.kind = 'update';
    this.payload = payload;
    return this;
  }
  delete(): this {
    this.kind = 'delete';
    return this;
  }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }): this {
    this.kind = 'upsert';
    this.payload = payload;
    this.onConflict = opts?.onConflict ?? null;
    return this;
  }
  eq(col: string, val: unknown): this {
    this.filters.push({ col, op: 'eq', val });
    return this;
  }
  neq(col: string, val: unknown): this {
    this.filters.push({ col, op: 'neq', val });
    return this;
  }
  not(col: string, op: string, val: unknown): this {
    if (op === 'is' && val === null) {
      this.filters.push({ col, op: 'notnull' });
      return this;
    }
    throw new Error(`unsupported .not(${col}, ${op}) — extend server/db.ts`);
  }
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this {
    const asc = opts?.ascending !== false;
    const nf = opts?.nullsFirst;
    this.orders.push({ col, asc, nulls: nf === undefined ? (asc ? 'last' : 'first') : nf ? 'first' : 'last' });
    return this;
  }
  limit(n: number): this {
    this.limitN = Math.max(0, Math.floor(n));
    return this;
  }
  single(): this {
    this.singleMode = 'single';
    return this;
  }
  maybeSingle(): this {
    this.singleMode = 'maybeSingle';
    return this;
  }

  then<TResult1 = DbResult<any>, TResult2 = never>(
    onfulfilled?: ((v: DbResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((e: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private async run(): Promise<DbResult<any>> {
    try {
      switch (this.kind) {
        case 'select':
          return this.runSelect();
        case 'insert':
        case 'upsert':
          return this.runInsert(this.kind === 'upsert');
        case 'update':
          return this.runUpdate();
        case 'delete':
          return this.runDelete();
      }
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
    }
  }

  private buildWhere(): { where: string; params: unknown[] } {
    if (!this.filters.length) return { where: '', params: [] };
    const params: unknown[] = [];
    const parts = this.filters.map((f) => {
      if (f.op === 'notnull') return `${ident(f.col)} IS NOT NULL`;
      if (f.val == null) return f.op === 'eq' ? `${ident(f.col)} IS NULL` : `${ident(f.col)} IS NOT NULL`;
      params.push(bind(f.val));
      return `${ident(f.col)} ${f.op === 'eq' ? '=' : '!='} ?`;
    });
    return { where: ` WHERE ${parts.join(' AND ')}`, params };
  }

  private buildOrder(): string {
    if (!this.orders.length) return '';
    return ` ORDER BY ${this.orders
      .map((o) => `${ident(o.col)} ${o.asc ? 'ASC' : 'DESC'} NULLS ${o.nulls === 'first' ? 'FIRST' : 'LAST'}`)
      .join(', ')}`;
  }

  private runSelect(): DbResult<any> {
    const { where, params } = this.buildWhere();
    if (this.countExact && this.headOnly) {
      const row = sqlite.prepare(`SELECT COUNT(*) AS n FROM ${ident(this.table)}${where}`).get(...params) as { n: number };
      return { data: null, error: null, count: row.n };
    }
    const embeds: Embed[] = [];
    const base = splitCols(this.cols).filter((p) => {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)\(([A-Za-z_][A-Za-z0-9_]*)\)$/.exec(p);
      if (m) {
        embeds.push({ table: m[1]!, col: m[2]! });
        return false;
      }
      return true;
    });
    const colSql = base.length === 1 && base[0] === '*' ? `${ident(this.table)}.*` : base.map(ident).join(', ');
    const sql = `SELECT ${colSql} FROM ${ident(this.table)}${where}${this.buildOrder()}${this.limitN != null ? ` LIMIT ${this.limitN}` : ''}`;
    let rows = sqlite.prepare(sql).all(...params) as Row[];
    if (embeds.length) rows = rows.map((r) => ({ ...r, ...this.resolveEmbeds(r, embeds) }));
    if (this.singleMode === 'single') {
      if (rows.length !== 1) {
        return {
          data: null,
          error: { message: rows.length === 0 ? 'No rows returned (single)' : 'Multiple rows returned (single)', code: 'PGRST116' },
        };
      }
      return { data: rows[0], error: null };
    }
    if (this.singleMode === 'maybeSingle') {
      if (rows.length > 1) return { data: null, error: { message: 'Multiple rows returned (maybeSingle)', code: 'PGRST116' } };
      return { data: rows.length === 0 ? null : rows[0], error: null };
    }
    return { data: rows, error: null };
  }

  // The one embedded-resource pattern the app uses: books + pen name + series
  // title. Resolved with indexed lookups (single-user scale: trivially fast).
  private resolveEmbeds(row: Row, embeds: Embed[]): Row {
    const out: Row = {};
    for (const e of embeds) {
      if (this.table === 'books' && e.table === 'pen_names' && e.col === 'name') {
        const fk = row.pen_name_id as number | null;
        const hit = fk == null ? undefined : (sqlite.prepare('SELECT name FROM pen_names WHERE id = ?').get(fk) as { name: string } | undefined);
        out.pen_names = hit ? { name: hit.name } : null;
      } else if (this.table === 'books' && e.table === 'series' && e.col === 'title') {
        const fk = row.series_id as number | null;
        const hit = fk == null ? undefined : (sqlite.prepare('SELECT title FROM series WHERE id = ?').get(fk) as { title: string } | undefined);
        out.series = hit ? { title: hit.title } : null;
      } else {
        throw new Error(`unsupported embed ${e.table}(${e.col}) on ${this.table} — extend server/db.ts`);
      }
    }
    return out;
  }

  private runInsert(upsert: boolean): DbResult<any> {
    const list = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
    for (const obj of list) {
      const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
      if (!entries.length) throw new Error(`${upsert ? 'upsert' : 'insert'} called with an empty payload`);
      const cols = entries.map(([k]) => ident(k));
      const placeholders = entries.map(() => '?').join(', ');
      const vals = entries.map(([, v]) => bind(v));
      if (!upsert) {
        sqlite.prepare(`INSERT INTO ${ident(this.table)} (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals);
      } else {
        if (!this.onConflict) throw new Error('upsert requires { onConflict }');
        const nonKey = entries.map(([k]) => k).filter((k) => k !== this.onConflict);
        const setSql = nonKey.length ? ` DO UPDATE SET ${nonKey.map((k) => `${ident(k)} = excluded.${ident(k)}`).join(', ')}` : ' DO NOTHING';
        sqlite
          .prepare(`INSERT INTO ${ident(this.table)} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT(${ident(this.onConflict)})${setSql}`)
          .run(...vals);
      }
    }
    return { data: null, error: null };
  }

  private runUpdate(): DbResult<any> {
    const obj = (this.payload ?? {}) as Row;
    const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
    if (!entries.length) return { data: null, error: null };
    const { where, params } = this.buildWhere();
    const setSql = entries.map(([k]) => `${ident(k)} = ?`).join(', ');
    sqlite
      .prepare(`UPDATE ${ident(this.table)} SET ${setSql}${where}`)
      .run(...entries.map(([, v]) => bind(v)), ...params);
    return { data: null, error: null };
  }

  private runDelete(): DbResult<any> {
    const { where, params } = this.buildWhere();
    sqlite.prepare(`DELETE FROM ${ident(this.table)}${where}`).run(...params);
    return { data: null, error: null };
  }
}

// ---------- atomic multi-step operations (ex rpc_*) ----------
type RpcParams = Record<string, any>;
const run = (sql: string, ...params: unknown[]) => sqlite.prepare(sql).run(...params.map(bind));
const get = <T>(sql: string, ...params: unknown[]) => sqlite.prepare(sql).get(...params.map(bind)) as T | undefined;
const all = <T>(sql: string, ...params: unknown[]) => sqlite.prepare(sql).all(...params.map(bind)) as T[];
// Postgres `->>'key'` yields NULL for a missing key: undefined must become NULL,
// never the literal string "undefined" and never a binding error.
const nul = (v: unknown) => (v === undefined ? null : v);
const toInt = (v: unknown) => (v === undefined || v === null || v === '' ? null : Number(v));
const js = (v: unknown) => JSON.stringify(v ?? null);

function doForgeCreate(p: RpcParams): number {
  const b = (p.p_book ?? {}) as Row;
  const chapters = (p.p_chapters ?? []) as Row[];
  const characters = (p.p_characters ?? []) as Row[];
  return sqlite.transaction((): number => {
    const info = run(
      `INSERT INTO books (title, subtitle, premise, mode, kind, genre, audience, tone, style, pov, tense,
        target_words, status, pen_name_id, series_id, series_number, logline, blurb, categories, keywords,
        cover_cfg, stage, stages_approved, engine_ctx, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      nul(b.title), nul(b.subtitle), nul(b.premise), nul(b.mode), nul(b.kind), nul(b.genre),
      nul(b.audience), nul(b.tone), nul(b.style), nul(b.pov), nul(b.tense),
      toInt(b.target_words), nul(b.status),
      toInt(b.pen_name_id), toInt(b.series_id), toInt(b.series_number),
      nul(b.logline), nul(b.blurb), nul(b.categories), nul(b.keywords), nul(b.cover_cfg),
      nul(b.stage), nul(b.stages_approved), nul(b.engine_ctx), nul(b.updated_at), nul(b.created_at),
    );
    const bid = Number(info.lastInsertRowid);
    const insCh = sqlite.prepare(
      'INSERT INTO chapters (book_id, idx, title, summary, kind, step, body, words, written_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    chapters.forEach((c, i) => {
      insCh.run(bid, i, nul(c.title), nul(c.summary), nul(c.kind), nul(c.step), nul(c.body),
        toInt(c.words), ((c.body as string) ?? '') !== '' ? 'story-engine' : '', nul(b.created_at));
    });
    const insChr = sqlite.prepare('INSERT INTO characters (book_id, name, role, description, arc) VALUES (?, ?, ?, ?, ?)');
    for (const c of characters) insChr.run(bid, nul(c.name), nul(c.role), nul(c.description), nul(c.arc));
    return bid;
  })();
}

function doChapterDelete(p: RpcParams): void {
  sqlite.transaction(() => {
    run('DELETE FROM chapter_reviews WHERE chapter_id = ?', p.p_chapter_id);
    run('DELETE FROM audio_tracks WHERE chapter_id = ?', p.p_chapter_id);
    run('DELETE FROM chapters WHERE id = ?', p.p_chapter_id);
    const sibs = all<{ id: number }>('SELECT id FROM chapters WHERE book_id = ? ORDER BY idx', p.p_book_id);
    const upd = sqlite.prepare('UPDATE chapters SET idx = ? WHERE id = ?');
    sibs.forEach((s, i) => upd.run(i, s.id));
    run('UPDATE books SET updated_at = ? WHERE id = ?', p.p_ts, p.p_book_id);
  })();
}

function doPlanDraft(p: RpcParams): void {
  const chapters = (p.p_chapters ?? []) as Row[];
  const characters = (p.p_characters ?? []) as Row[];
  sqlite.transaction(() => {
    run('DELETE FROM chapters WHERE book_id = ?', p.p_book_id);
    run('DELETE FROM characters WHERE book_id = ?', p.p_book_id);
    const insCh = sqlite.prepare('INSERT INTO chapters (book_id, idx, title, summary, created_at) VALUES (?, ?, ?, ?, ?)');
    chapters.forEach((c, i) => insCh.run(p.p_book_id, i, nul(c.title), nul(c.summary), p.p_ts));
    const insChr = sqlite.prepare('INSERT INTO characters (book_id, name, role, description, arc) VALUES (?, ?, ?, ?, ?)');
    for (const c of characters) insChr.run(p.p_book_id, nul(c.name), nul(c.role), nul(c.description), nul(c.arc));
    run('UPDATE books SET logline = ?, plan = ?, updated_at = ? WHERE id = ?', p.p_logline, p.p_plan, p.p_ts, p.p_book_id);
  })();
}

function doImport(p: RpcParams): void {
  const docs = (p.p_docs ?? []) as Row[];
  const CHAPTER_COLS = 'INSERT INTO chapters (book_id, idx, title, summary, body, words, ai_enhanced, written_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  sqlite.transaction(() => {
    if (p.p_mode === 'replace') {
      run('DELETE FROM chapters WHERE book_id = ?', p.p_book_id);
      const ins = sqlite.prepare(CHAPTER_COLS);
      docs.forEach((c, i) => ins.run(p.p_book_id, i, nul(c.title), '', nul(c.body), toInt(c.words), 1, 'import', p.p_ts));
    } else if (p.p_mode === 'append') {
      const row = get<{ m: number | null }>('SELECT MAX(idx) AS m FROM chapters WHERE book_id = ?', p.p_book_id);
      const start = (row?.m ?? -1) + 1;
      const ins = sqlite.prepare(CHAPTER_COLS);
      docs.forEach((c, i) => ins.run(p.p_book_id, start + i, nul(c.title), '', nul(c.body), toInt(c.words), 1, 'import', p.p_ts));
    } else {
      // fill: overwrite bodies in idx order, insert overflow after MAX(idx)
      const ids = all<{ id: number }>('SELECT id FROM chapters WHERE book_id = ? ORDER BY idx', p.p_book_id).map((r) => r.id);
      const n = ids.length;
      const row = get<{ m: number | null }>('SELECT MAX(idx) AS m FROM chapters WHERE book_id = ?', p.p_book_id);
      const maxIdx = row?.m ?? -1;
      docs.forEach((d, k) => {
        const i = k + 1;
        if (i <= n) {
          run('UPDATE chapters SET body = ?, words = ?, ai_enhanced = 1, written_by = ? WHERE id = ?',
            nul(d.body), toInt(d.words), 'import', ids[i - 1]);
        } else {
          run(CHAPTER_COLS, p.p_book_id, maxIdx + i - n, nul(d.title), '', nul(d.body), toInt(d.words), 1, 'import', p.p_ts);
        }
      });
    }
    run('UPDATE books SET updated_at = ? WHERE id = ?', p.p_ts, p.p_book_id);
  })();
}

function penIdByName(name: string, ts: string): number {
  const hit = get<{ id: number }>('SELECT id FROM pen_names WHERE name = ?', name);
  if (hit) return hit.id;
  return Number(run('INSERT INTO pen_names (name, bio, genres, created_at) VALUES (?, ?, ?, ?)', name, '', '', ts).lastInsertRowid);
}

function doRestore(p: RpcParams): { chapters: number; reviews: number; editor: number } {
  const payload = (p.p_payload ?? {}) as { pens?: Row[]; series?: Row[]; books?: Row[] };
  const ts = p.p_ts as string;
  return sqlite.transaction(() => {
    let nCh = 0;
    let nRv = 0;
    let nEd = 0;
    for (const pn of payload.pens ?? []) {
      run(`INSERT INTO pen_names (name, bio, genres, created_at)
           SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM pen_names WHERE name = ?)`,
        nul(pn.name), nul(pn.bio), nul(pn.genres), ts, nul(pn.name));
    }
    for (const sr of payload.series ?? []) {
      const srPen = sr.pen_name as string | null;
      const penId = srPen != null ? penIdByName(srPen, ts) : null;
      run(`INSERT INTO series (pen_name_id, title, description, created_at)
           SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM series WHERE title = ?)`,
        penId, nul(sr.title), nul(sr.description), ts, nul(sr.title));
    }
    for (const b of payload.books ?? []) {
      const bPen = b.pen_name as string | null;
      const penId = bPen != null ? penIdByName(bPen, ts) : null;
      let serId: number | null = null;
      const bSer = b.series_title as string | null;
      if (bSer != null) {
        const hit = get<{ id: number }>('SELECT id FROM series WHERE title = ?', bSer);
        serId = hit ? hit.id : Number(run('INSERT INTO series (pen_name_id, title, description, created_at) VALUES (?, ?, ?, ?)',
          penId, bSer, '', ts).lastInsertRowid);
      }
      const bid = Number(run(
        `INSERT INTO books (title, subtitle, premise, mode, kind, genre, audience, tone, style, pov, tense,
          target_words, status, pen_name_id, series_id, series_number, logline, blurb, categories, keywords,
          cover_cfg, stage, stages_approved, engine_ctx, plan, ledger, bible, editor_ledger, updated_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        nul(b.title), nul(b.subtitle), nul(b.premise), nul(b.mode), nul(b.kind), nul(b.genre),
        nul(b.audience), nul(b.tone), nul(b.style), nul(b.pov), nul(b.tense),
        toInt(b.target_words), nul(b.status), penId, serId, toInt(b.series_number),
        nul(b.logline), nul(b.blurb), js(b.categories), js(b.keywords), js(b.cover_cfg),
        nul(b.stage), js(b.stages_approved), nul(b.engine_ctx), nul(b.plan),
        nul(b.ledger), nul(b.bible), nul(b.editor_ledger), ts, ts,
      ).lastInsertRowid);
      const chIds = new Map<number, number>();
      const insCh = sqlite.prepare(
        'INSERT INTO chapters (book_id, idx, title, summary, kind, step, body, words, ai_enhanced, written_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      );
      for (const c of (b.chapters ?? []) as Row[]) {
        const id = Number(insCh.run(bid, toInt(c.idx), nul(c.title), nul(c.summary), nul(c.kind), nul(c.step),
          nul(c.body), toInt(c.words), toInt(c.ai_enhanced), (c.written_by as string) ?? '', ts).lastInsertRowid);
        chIds.set(Number(c.idx), id);
        nCh++;
      }
      const insChr = sqlite.prepare('INSERT INTO characters (book_id, name, role, description, arc) VALUES (?, ?, ?, ?, ?)');
      for (const c of (b.characters ?? []) as Row[]) insChr.run(bid, nul(c.name), nul(c.role), nul(c.description), nul(c.arc));
      const insRev = sqlite.prepare(
        'INSERT INTO chapter_reviews (chapter_id, book_id, created_at, model, score, summary, findings) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );
      for (const r of (b.reviews ?? []) as Row[]) {
        const chId = chIds.get(Number(r.chapter_idx));
        if (chId === undefined) continue; // inner-join semantics: unmatched reviews are skipped
        const created = ((r.created_at as string) ?? '') !== '' ? r.created_at : ts;
        insRev.run(chId, bid, created, nul(r.model), toInt(r.score), nul(r.summary), js(r.findings));
        nRv++;
      }
      const insEd = sqlite.prepare(
        'INSERT INTO editor_reports (book_id, chapter_id, pass, title, body, model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );
      for (const e of (b.editor ?? []) as Row[]) {
        const chIdx = e.chapter_idx as number | null;
        const chId = chIdx == null ? null : (chIds.get(Number(chIdx)) ?? null);
        const created = ((e.created_at as string) ?? '') !== '' ? e.created_at : ts;
        insEd.run(bid, chId, nul(e.pass), (e.title as string) ?? '', (e.body as string) ?? '', (e.model as string) ?? '', created);
        nEd++;
      }
    }
    return { chapters: nCh, reviews: nRv, editor: nEd };
  })();
}

async function rpcImpl(name: string, params: RpcParams): Promise<DbResult<any>> {
  try {
    switch (name) {
      case 'rpc_forge_create':
        return { data: doForgeCreate(params), error: null };
      case 'rpc_chapter_delete':
        doChapterDelete(params);
        return { data: null, error: null };
      case 'rpc_plan_draft':
        doPlanDraft(params);
        return { data: null, error: null };
      case 'rpc_import':
        doImport(params);
        return { data: null, error: null };
      case 'rpc_restore':
        return { data: doRestore(params), error: null };
      default:
        return { data: null, error: { message: `unknown rpc ${name}` } };
    }
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
  }
}

export const sb = {
  from: (table: string) => new QB(table),
  rpc: (name: string, params: RpcParams = {}) => rpcImpl(name, params),
};

// ---------- settings ----------
export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await sb.from('settings').select('value').eq('key', key).maybeSingle();
  if (error || !data) return null;
  return (data as { value: string }).value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await q(sb.from('settings').upsert({ key, value }, { onConflict: 'key' }), 'setSetting');
}

export async function delSetting(key: string): Promise<void> {
  await q(sb.from('settings').delete().eq('key', key), 'delSetting');
}

// ---------- boot check ----------
export async function ready(): Promise<boolean> {
  try {
    const { error } = await sb.from('books').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
