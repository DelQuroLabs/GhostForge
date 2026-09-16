// Chapter MP3s live on local disk (self-hosted: no cloud storage), keyed
// <bookId>/chNN.mp3 under <dataDir>/audio — same key layout as before, so the
// audio_tracks rows and trackKey() callers work unchanged.
import { mkdirSync } from 'node:fs';
import { readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { dataDir } from './db.js';

export const trackKey = (bookId: number, idx: number): string =>
  `${bookId}/ch${String(idx + 1).padStart(2, '0')}.mp3`;

const audioDir = join(dataDir, 'audio');
const fileFor = (key: string): string => join(audioDir, key);

export async function putTrack(bookId: number, idx: number, bytes: Buffer): Promise<void> {
  const f = fileFor(trackKey(bookId, idx));
  mkdirSync(dirname(f), { recursive: true });
  await writeFile(f, bytes);
}

export async function getTrack(bookId: number, idx: number): Promise<Buffer | null> {
  try {
    return await readFile(fileFor(trackKey(bookId, idx)));
  } catch {
    return null;
  }
}

// idx → byte size for every MP3 stored for a book (empty when none).
export async function listTracks(bookId: number): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  let names: string[];
  try {
    names = await readdir(join(audioDir, String(bookId)));
  } catch {
    return out;
  }
  for (const name of names) {
    const m = /^ch(\d+)\.mp3$/.exec(name);
    if (!m) continue;
    let size = 0;
    try {
      size = (await stat(join(audioDir, String(bookId), name))).size;
    } catch {
      /* vanished mid-list — report 0 */
    }
    out.set(parseInt(m[1]!, 10) - 1, size);
  }
  return out;
}

export async function delTrack(bookId: number, idx: number): Promise<void> {
  try {
    await rm(fileFor(trackKey(bookId, idx)), { force: true });
  } catch {
    /* MP3 cleanup is best-effort */
  }
}

export async function delBookAudio(bookId: number): Promise<void> {
  try {
    await rm(join(audioDir, String(bookId)), { recursive: true, force: true });
  } catch {
    /* MP3 cleanup is best-effort */
  }
}

// Called at boot: makes sure the audio directory exists and is writable.
export async function ensureBucket(): Promise<void> {
  mkdirSync(audioDir, { recursive: true });
}
