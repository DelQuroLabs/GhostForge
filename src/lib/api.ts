export type ApiError = { code: string; message: string; fields?: Record<string, string> };

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let err: ApiError = { code: 'HTTP_' + res.status, message: res.statusText };
    try {
      const j = (await res.json()) as { error?: ApiError };
      if (j.error) err = j.error;
    } catch { /* keep generic */ }
    throw err;
  }
  const j = (await res.json()) as { data: T };
  return j.data;
}

export type CoverCfg = { bg: string; bg2: string; accent: string; ink: string; motif: string; tagline: string };
export type Chapter = { id: number; book_id: number; idx: number; title: string; summary: string; kind: string; step: string; body: string; words: number; ai_enhanced: number; written_by: string; review_score: number | null; reviewed_at: string | null };
export type CharRow = { id: number; name: string; role: string; description: string; arc: string };
export type NovelAnchors = { subgenre: string; comps: string; protagonist: string; antagonist: string; stakes: string; theme: string; ending: string; seeds: string };
export type PlanState = {
  beats: string[]; thesis: string; claims: string[]; approved: boolean; approvedAt: string | null; source: string | null;
  pipeline?: string; anchors?: NovelAnchors;
  design?: { dramaticQuestion: string; promise: string; theme: string; synopsis: string; seedList: string[]; locked: string[]; open: string[] };
  designMd?: string;
  beatmap?: { architecture: { primary: string; secondary: string }; math: { targetWords: number; chapterLength: number; chapterCount: number }; chapters: Array<{ n: number; title: string; job: string }> };
  beatmapMd?: string;
  styleCondensed?: string;
};
export type ReviewFinding = { severity: 'error' | 'warning' | 'suggestion'; category: 'accuracy' | 'syntax' | 'cadence'; quote: string; issue: string; suggestion: string; source: 'ai' | 'offline' };
export type Review = { id: number; chapter_id: number; book_id: number; created_at: string; model: string; score: number; summary: string; findings: ReviewFinding[] };
export type JobEvent = { t: string; stage: string; msg: string };
export type Job = {
  id: string; kind: 'create' | 'gates' | 'revise'; label: string;
  bookId: number | null; chapterId: number | null;
  status: 'running' | 'done' | 'failed'; stage: string;
  events: JobEvent[]; facts: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: { code: string; message: string } | null;
  startedAt: string; finishedAt: string | null;
};
export type Book = {
  id: number; title: string; subtitle: string; premise: string; mode: string; kind: 'fiction' | 'nonfiction';
  genre: string; audience: string; tone: string; style: string; pov: string; tense: string; target_words: number;
  status: string; pen_name_id: number | null; series_id: number | null; series_number: number | null;
  logline: string; blurb: string; categories: string[]; keywords: string[];
  cover_cfg: CoverCfg; stage: string; stages_approved: string[];
  ledger: string | null; bible: string | null; editor_ledger: string | null;
  created_at: string; updated_at: string; pen_name?: string | null; series_title?: string | null;
  chapters?: Chapter[] | number; words?: number; characters?: CharRow[]; plan?: PlanState | null;
};
export type EditorReportListItem = {
  id: number; pass: string; title: string; model: string; created_at: string;
  chapter_idx: number | null; chapter_title: string | null; preview: string;
};
export type EditorReport = {
  id: number; book_id: number; chapter_id: number | null; pass: string;
  title: string; body: string; model: string; created_at: string;
};
export type EditorState = {
  aiModel: string; aiProvider: string; hasKey: boolean; ledger: string;
  paramsBlock: string; voiceOnFile: boolean; reports: EditorReportListItem[];
};
export type GateMode = 'brief' | 'cards' | 'write' | 'fast';
export type EngineGatesResult = {
  chapter: Chapter; mode: GateMode; words: number; model: string;
  brief: string; cards: string; verdict: string; nextSetup: string; drift: string; ledgerUpdated: boolean;
};
export type Pen = { id: number; name: string; bio: string; genres: string; books?: number; series?: number };
export type Series = { id: number; pen_name_id: number | null; title: string; description: string; pen_name?: string | null; books?: number; latest?: number };
export type AiCfg = { provider: string; baseUrl: string; model: string; hasKey: boolean; last4: string };
export type AudioTrack = { chapterId: number; idx: number; title: string; words: number; hasMp3: boolean; bytes: number; voice: string; model: string; created: string | null };
export type TtsCfg = { baseUrl: string; model: string; voice: string; instructions: string; speed: number };

export const api = {
  books: {
    list: () => req<Book[]>('/api/books'),
    create: (b: Record<string, unknown>) => req<Book & { chapters: Chapter[]; characters: CharRow[] }>('/api/books', { method: 'POST', body: JSON.stringify(b) }),
    get: (id: string) => req<Book & { chapters: Chapter[]; characters: CharRow[] }>(`/api/books/${id}`),
    update: (id: string, b: Record<string, unknown>) => req<Book>(`/api/books/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
    remove: (id: string) => req<{ deleted: number }>(`/api/books/${id}`, { method: 'DELETE' }),
    advance: (id: string, stage: string) => req<Book & { chapters: Chapter[]; characters: CharRow[] }>(`/api/books/${id}/advance`, { method: 'POST', body: JSON.stringify({ stage }) }),
    forgeDraft: (id: string, force = false) => req<Book & { chapters: Chapter[]; characters: CharRow[] }>(`/api/books/${id}/forge-draft`, { method: 'POST', body: JSON.stringify({ force }) }),
    exportUrl: (id: string, fmt: string) => `/api/books/${id}/export?format=${fmt}`,
    addChapter: (id: string, b: Record<string, unknown>) => req<Chapter>(`/api/books/${id}/chapters`, { method: 'POST', body: JSON.stringify(b) }),
    agentPack: (id: string, build: 'serial' | 'full' = 'serial') => req<{ bookId: number; title: string; filename: string; text: string }>(`/api/books/${id}/agent-pack?build=${build}`),
    importChapters: (id: string, b: Record<string, unknown>) => req<Book & { chapters: Chapter[] }>(`/api/books/${id}/import`, { method: 'POST', body: JSON.stringify(b) }),
    planDraft: (id: string, b: Record<string, unknown>) => req<Book & { chapters: Chapter[]; characters: CharRow[] }>(`/api/books/${id}/plan-draft`, { method: 'POST', body: JSON.stringify(b) }),
    planSave: (id: string, b: Record<string, unknown>) => req<Book & { chapters: Chapter[]; characters: CharRow[] }>(`/api/books/${id}/plan`, { method: 'PUT', body: JSON.stringify(b) }),
    planApprove: (id: string) => req<Book & { chapters: Chapter[]; characters: CharRow[] }>(`/api/books/${id}/plan/approve`, { method: 'POST' }),
  },
  chapters: {
    remove: (id: string) => req<{ deleted: number }>(`/api/chapters/${id}`, { method: 'DELETE' }),
    get: (id: string) => req<{ chapter: Chapter; book: Book; prevId: number | null; nextId: number | null }>(`/api/chapters/${id}`),
    update: (id: string, b: Record<string, unknown>) => req<Chapter>(`/api/chapters/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
    regenerate: (id: string) => req<Chapter>(`/api/chapters/${id}/regenerate`, { method: 'POST' }),
    enhance: (id: string) => req<Chapter>(`/api/chapters/${id}/enhance`, { method: 'POST' }),
  },
  reviews: {
    run: (chapterId: string) => req<Review>(`/api/chapters/${chapterId}/review`, { method: 'POST' }),
    list: (chapterId: string) => req<Review[]>(`/api/chapters/${chapterId}/reviews`),
  },
  chars: {
    add: (bookId: string, b: Record<string, unknown>) => req<CharRow>(`/api/books/${bookId}/characters`, { method: 'POST', body: JSON.stringify(b) }),
    update: (cid: number, b: Record<string, unknown>) => req<CharRow>(`/api/characters/${cid}`, { method: 'PUT', body: JSON.stringify(b) }),
    remove: (cid: number) => req<{ deleted: number }>(`/api/characters/${cid}`, { method: 'DELETE' }),
  },
  pens: {
    list: () => req<Pen[]>('/api/pen-names'),
    create: (b: Record<string, unknown>) => req<Pen>('/api/pen-names', { method: 'POST', body: JSON.stringify(b) }),
    update: (id: number, b: Record<string, unknown>) => req<Pen>(`/api/pen-names/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
    remove: (id: number) => req<{ deleted: number }>(`/api/pen-names/${id}`, { method: 'DELETE' }),
  },
  series: {
    list: () => req<Series[]>('/api/series'),
    create: (b: Record<string, unknown>) => req<Series>('/api/series', { method: 'POST', body: JSON.stringify(b) }),
    update: (id: number, b: Record<string, unknown>) => req<Series>(`/api/series/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
    remove: (id: number) => req<{ deleted: number }>(`/api/series/${id}`, { method: 'DELETE' }),
  },
  ai: {
    get: () => req<AiCfg>('/api/settings/ai'),
    save: (b: Record<string, unknown>) => req<AiCfg>('/api/settings/ai', { method: 'PUT', body: JSON.stringify(b) }),
    test: () => req<{ ok: boolean; model: string; sample: string }>('/api/ai/test', { method: 'POST' }),
    chat: (b: Record<string, unknown>) => req<{ text: string; model: string }>('/api/ai/chat', { method: 'POST', body: JSON.stringify(b) }),
    draft: (b: Record<string, unknown>) => req<{ text: string; model: string; words: number }>('/api/ai/draft', { method: 'POST', body: JSON.stringify(b) }),
  },
  backup: {
    url: '/api/backup',
    restore: (b: Record<string, unknown>) => req<{ restoredBooks: number; restoredChapters: number; restoredReviews: number; restoredEditor: number }>('/api/restore', { method: 'POST', body: JSON.stringify(b) }),
  },
  engine: {
    gates: (bookId: string, chapterId: number, mode: GateMode, opts?: { note?: string; force?: boolean }) => req<EngineGatesResult>(`/api/books/${bookId}/engine/gates`, { method: 'POST', body: JSON.stringify({ chapterId, mode, note: opts?.note ?? undefined, force: opts?.force ?? undefined }) }),
    jobs: {
      // Long runs (Stages, chapter gates, revisions) decoupled from the request:
      // start returns a job id at once; the caller's useJob hook polls for results.
      startCreate: (book: unknown) => req<{ jobId: string }>('/api/engine/jobs', { method: 'POST', body: JSON.stringify({ kind: 'create', book }) }),
      startGates: (bookId: string, chapterIds: number[], mode: 'write' | 'fast', force?: boolean) => req<{ jobId: string }>('/api/engine/jobs', { method: 'POST', body: JSON.stringify({ kind: 'gates', bookId: Number(bookId), chapterIds, mode, force: force ?? undefined }) }),
      startRevise: (chapterId: number, fixes: Array<{ quote: string; issue: string; suggestion: string }>, notes: string) => req<{ jobId: string }>('/api/engine/jobs', { method: 'POST', body: JSON.stringify({ kind: 'revise', chapterId, fixes, notes }) }),
      status: (jobId: string) => req<Job>(`/api/engine/jobs/${jobId}`),
      list: (bookId?: string) => req<Job[]>(`/api/engine/jobs${bookId ? `?bookId=${bookId}` : ''}`),
    },
  },
  editor: {
    get: (bookId: string) => req<EditorState>(`/api/books/${bookId}/editor`),
    report: (id: number) => req<EditorReport>(`/api/editor-reports/${id}`),
    remove: (id: number) => req<{ deleted: number }>(`/api/editor-reports/${id}`, { method: 'DELETE' }),
    setup: (bookId: string) => req<{ ledger: string; started: boolean }>(`/api/books/${bookId}/editor/setup`, { method: 'POST' }),
    run: (bookId: string, pass: string, chapterId: number | null) => req<{ reportId: number; title: string; model: string; ledgerUpdated: boolean; voiceUsed: boolean }>(`/api/books/${bookId}/editor/run`, { method: 'POST', body: JSON.stringify({ pass, chapterId }) }),
    fullReport: (bookId: string) => req<{ reportId: number; title: string; model: string; chaptersCovered: number }>(`/api/books/${bookId}/editor/report`, { method: 'POST' }),
  },
  audio: {
    status: (bookId: string) => req<{ book: { id: number; title: string }; tracks: AudioTrack[] }>(`/api/audio/status/${bookId}`),
    forgeChapter: (chapterId: string) => req<{ chapterId: number; idx: number; bytes: number; parts: number; voice: string; model: string }>(`/api/audio/chapter/${chapterId}/forge`, { method: 'POST' }),
    fileUrl: (bookId: string, idx: number) => `/api/audio/file/${bookId}/${idx}`,
    fileDl: (bookId: string, idx: number) => `/api/audio/file/${bookId}/${idx}?download=1`,
    fullUrl: (bookId: string) => `/api/audio/full/${bookId}`,
    zipUrl: (bookId: string) => `/api/audio/zip/${bookId}`,
    settings: () => req<TtsCfg>('/api/audio/settings'),
    saveSettings: (b: Record<string, unknown>) => req<TtsCfg>('/api/audio/settings', { method: 'PUT', body: JSON.stringify(b) }),
  },
};

export const fmtWords = (n: number) => n.toLocaleString('en-US');
export const errMsg = (e: unknown): string => {
  const ae = e as ApiError | undefined;
  const base = ae?.message ?? 'Something went wrong';
  if (ae?.fields && typeof ae.fields === 'object') {
    const bits = Object.entries(ae.fields).map(([k, v]) => `${k}: ${v}`);
    if (bits.length) return `${base} — ${bits.join('; ')}`;
  }
  return base;
};
