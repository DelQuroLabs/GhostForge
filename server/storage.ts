// Chapter MP3s live in the private Supabase Storage bucket "audiobooks"
// (created by SUPABASE_SETUP.sql), keyed <bookId>/chNN.mp3. Same publishable
// key as the database — no secrets anywhere.
import { sb } from './db.js';

const BUCKET = process.env.SUPABASE_AUDIO_BUCKET || 'audiobooks';

export const trackKey = (bookId: number, idx: number): string =>
  `${bookId}/ch${String(idx + 1).padStart(2, '0')}.mp3`;

export async function putTrack(bookId: number, idx: number, bytes: Buffer): Promise<void> {
  const { error } = await sb.storage.from(BUCKET).upload(trackKey(bookId, idx), bytes, {
    upsert: true,
    contentType: 'audio/mpeg',
  });
  if (error) throw new Error(`putTrack: ${error.message}`);
}

export async function getTrack(bookId: number, idx: number): Promise<Buffer | null> {
  const { data, error } = await sb.storage.from(BUCKET).download(trackKey(bookId, idx));
  if (error) {
    if (/not found|does not exist/i.test(error.message)) return null;
    throw new Error(`getTrack: ${error.message}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

// idx → byte size for every MP3 stored for a book (empty when none).
export async function listTracks(bookId: number): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  const { data, error } = await sb.storage.from(BUCKET).list(String(bookId), { limit: 500 });
  if (error) {
    if (/not found|does not exist/i.test(error.message)) return out;
    throw new Error(`listTracks: ${error.message}`);
  }
  for (const f of data ?? []) {
    const m = /^ch(\d+)\.mp3$/.exec(f.name);
    if (m) out.set(parseInt(m[1]!, 10) - 1, (f.metadata as { size?: number } | null)?.size ?? 0);
  }
  return out;
}

export async function delTrack(bookId: number, idx: number): Promise<void> {
  try {
    await sb.storage.from(BUCKET).remove([trackKey(bookId, idx)]);
  } catch {
    /* MP3 cleanup is best-effort */
  }
}

export async function delBookAudio(bookId: number): Promise<void> {
  try {
    const { data } = await sb.storage.from(BUCKET).list(String(bookId), { limit: 500 });
    const files = (data ?? []).map((f) => `${bookId}/${f.name}`);
    if (files.length) await sb.storage.from(BUCKET).remove(files);
  } catch {
    /* MP3 cleanup is best-effort */
  }
}

// Called at boot: confirms the bucket exists (i.e. the setup SQL was run).
// (getBucket, not list: list() returns [] with no error for a missing bucket.)
export async function ensureBucket(): Promise<void> {
  const { error } = await sb.storage.getBucket(BUCKET);
  if (error) {
    if (/not found/i.test(error.message)) {
      throw new Error(
        `Storage bucket "${BUCKET}" does not exist — run SUPABASE_SETUP.sql in your Supabase SQL editor, then restart.`,
      );
    }
    console.warn(`[ghostforge] bucket check inconclusive (${error.message}) — continuing anyway`);
  }
}
