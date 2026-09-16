import { sb, q, getSetting, setSetting, now } from './db.js';
import { putTrack, getTrack, listTracks, trackKey } from './storage.js';
import { humanizeProviderError } from './ai.js';

export type TtsCfg = { baseUrl: string; model: string; voice: string; instructions: string; speed: number };

const clampSpeed = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? Math.min(4, Math.max(0.25, n)) : 1;
};

export async function getTtsSettings(): Promise<TtsCfg> {
  const provider = (await getSetting('ai_provider')) || 'openrouter';
  return {
    baseUrl: (await getSetting('ai_base_url')) || 'https://openrouter.ai/api/v1',
    model: (await getSetting('ai_tts_model')) || (provider === 'openai' ? 'tts-1' : 'openai/tts-1'),
    voice: (await getSetting('ai_tts_voice')) || 'onyx',
    instructions: (await getSetting('ai_tts_instructions')) || '',
    speed: clampSpeed(await getSetting('ai_tts_speed')),
  };
}
export async function saveTtsSettings(v: { model?: string; voice?: string; instructions?: string; speed?: number }): Promise<TtsCfg> {
  if (v.model !== undefined) await setSetting('ai_tts_model', v.model);
  if (v.voice !== undefined) await setSetting('ai_tts_voice', v.voice);
  if (v.instructions !== undefined) await setSetting('ai_tts_instructions', v.instructions.slice(0, 2000));
  if (v.speed !== undefined) await setSetting('ai_tts_speed', String(clampSpeed(v.speed)));
  return getTtsSettings();
}

async function ttsCreds(): Promise<{ baseUrl: string; apiKey: string; model: string; voice: string; instructions: string; speed: number }> {
  const apiKey = (await getSetting('ai_api_key')) || process.env.AI_API_KEY || '';
  if (!apiKey) {
    const e = new Error('No AI key configured. Add one in Settings → AI to forge MP3 audiobooks.');
    (e as Error & { code: string }).code = 'NO_KEY';
    throw e;
  }
  const t = await getTtsSettings();
  if (/localhost|127\.0\.0\.1/.test(t.baseUrl)) {
    throw new Error('Local AI (Ollama) cannot do text-to-speech. Point Settings \u2192 AI at OpenAI or OpenRouter with a key to forge MP3s — or use free Listen mode inside any chapter.');
  }
  if (!t.model) {
    const e = new Error('No TTS model configured. Set one in Settings (e.g. openai/tts-1).');
    (e as Error & { code: string }).code = 'NO_TTS_MODEL';
    throw e;
  }
  return { baseUrl: t.baseUrl.replace(/\/$/, ''), apiKey, model: t.model, voice: t.voice, instructions: t.instructions, speed: t.speed };
}

// Split long chapters into TTS-sized chunks at sentence boundaries.
export function splitForTts(text: string, max = 3900): string[] {
  const paras = text.split(/\n{2,}|\r\n\r\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const chunks: string[] = [];
  let cur = '';
  const push = (s: string) => {
    if ((cur + ' ' + s).trim().length > max && cur) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur = cur ? cur + ' ' + s : s;
    }
  };
  for (const p of paras) {
    const sentences = p.match(/[^.!?]+[.!?]+["”']?|\S[^.!?]*$/g) ?? [p];
    for (const s of sentences) push(s.trim());
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

async function ttsRequest(input: string, timeoutMs = 180000): Promise<Buffer> {
  const { baseUrl, apiKey, model, voice, instructions, speed } = await ttsCreds();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // `instructions` (voice direction) exists only on steerable models such as
    // gpt-4o-mini-tts — sending it to tts-1/tts-1-hd would 400, so gate it.
    const steerable = /gpt-4o-mini-tts|gpt-4o-tts/.test(model);
    const payload: Record<string, unknown> = { model, voice, input, response_format: 'mp3', speed };
    if (steerable && instructions.trim()) payload.instructions = instructions.trim().slice(0, 2000);
    const res = await fetch(`${baseUrl}/audio/speech`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ghostforge.local',
        'X-Title': 'Ghostforge',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(humanizeProviderError(res.status, txt, model).replace(/^AI provider error/, 'TTS provider error'));
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(t);
  }
}

export async function synthesizeChapter(chapterId: number): Promise<{
  chapterId: number; idx: number; bytes: number; parts: number; voice: string; model: string;
}> {
  const c = await q<{ id: number; book_id: number; idx: number; title: string; body: string } | null>(
    sb.from('chapters').select('*').eq('id', chapterId).maybeSingle(),
    'synthesize chapter',
  );
  if (!c) {
    const e = new Error('Chapter not found');
    (e as Error & { code: string }).code = 'NOT_FOUND';
    throw e;
  }
  if (!c.body) throw new Error('Chapter has no text yet — forge the draft first.');
  const script = `Chapter ${c.idx + 1}. ${c.title}. ${c.body.replace(/\s+/g, ' ').trim()}`;
  const parts = splitForTts(script);
  const bufs: Buffer[] = [];
  for (const p of parts) bufs.push(await ttsRequest(p));
  const out = Buffer.concat(bufs);
  await putTrack(c.book_id, c.idx, out);
  const tts = await getTtsSettings();
  await q(sb.from('audio_tracks').upsert({
    chapter_id: chapterId, book_id: c.book_id, idx: c.idx, file: trackKey(c.book_id, c.idx),
    bytes: out.length, voice: tts.voice, model: tts.model, created_at: now(),
  }, { onConflict: 'chapter_id' }), 'track upsert');
  return { chapterId, idx: c.idx, bytes: out.length, parts: parts.length, voice: tts.voice, model: tts.model };
}

export type TrackStatus = {
  chapterId: number; idx: number; title: string; words: number;
  hasMp3: boolean; bytes: number; voice: string; model: string; created: string | null;
};

export async function trackStatus(bookId: number): Promise<TrackStatus[]> {
  const chs = await q<Array<{ id: number; idx: number; title: string; words: number }>>(
    sb.from('chapters').select('id,idx,title,words').eq('book_id', bookId).order('idx'),
    'trackStatus chapters',
  );
  const tracks = await q<Array<{ chapter_id: number; file: string; voice: string; model: string; created_at: string }>>(
    sb.from('audio_tracks').select('*').eq('book_id', bookId),
    'trackStatus tracks',
  );
  const byId = new Map(tracks.map((t) => [t.chapter_id, t]));
  const stored = await listTracks(bookId);
  return chs.map((c) => {
    const t = byId.get(c.id);
    const size = stored.get(c.idx);
    return {
      chapterId: c.id, idx: c.idx, title: c.title, words: c.words,
      hasMp3: !!t && size !== undefined, bytes: size ?? 0,
      voice: t?.voice ?? '', model: t?.model ?? '', created: t?.created_at ?? null,
    };
  });
}

// Same-codec MP3 concat (plays in all major players) for the single-file audiobook.
export async function fullAudiobook(bookId: number): Promise<Buffer> {
  const chs = await q<Array<{ idx: number }>>(
    sb.from('chapters').select('idx').eq('book_id', bookId).order('idx'),
    'fullAudiobook chapters',
  );
  const bufs: Buffer[] = [];
  for (const c of chs) {
    const b = await getTrack(bookId, c.idx);
    if (b) bufs.push(b);
  }
  if (!bufs.length) throw new Error('No chapter MP3s yet — forge them first.');
  return Buffer.concat(bufs);
}

export async function testTts(): Promise<Buffer> {
  return ttsRequest('Welcome to Ghostforge. Your audiobook voice is ready, and your epic is about to speak.');
}
