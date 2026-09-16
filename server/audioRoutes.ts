import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import JSZip from 'jszip';
import { sb, q } from './db.js';
import { HError } from './routes.js';
import { slug } from './exporters.js';
import { getTrack } from './storage.js';
import {
  getTtsSettings, saveTtsSettings, synthesizeChapter, trackStatus,
  fullAudiobook, testTts,
} from './audio.js';

export const audioRouter = Router();
const ah = (fn: (req: Request, res: Response, next: NextFunction) => unknown) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);
const send = (res: Response, data: unknown, status = 200) => res.status(status).json({ data });

audioRouter.get('/audio/status/:bookId', ah(async (req, res) => {
  const b = await q<{ id: number; title: string } | null>(
    sb.from('books').select('id,title').eq('id', Number(req.params.bookId)).maybeSingle(),
    'audio book',
  );
  if (!b) throw new HError(404, 'NOT_FOUND', 'Book not found');
  send(res, { book: b, tracks: await trackStatus(Number(req.params.bookId)) });
}));

audioRouter.post('/audio/chapter/:chapterId/forge', ah(async (req, res) => {
  try {
    send(res, await synthesizeChapter(Number(req.params.chapterId)));
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'NO_KEY') throw new HError(409, 'NO_KEY', (e as Error).message);
    if (code === 'NOT_FOUND') throw new HError(404, 'NOT_FOUND', 'Chapter not found');
    throw new HError(502, 'TTS_FAILED', (e as Error).message);
  }
}));

audioRouter.get('/audio/file/:bookId/:idx', ah(async (req, res) => {
  const buf = await getTrack(Number(req.params.bookId), Number(req.params.idx));
  if (!buf) throw new HError(404, 'NOT_FOUND', 'No MP3 for this chapter yet — forge it first.');
  res.setHeader('Content-Type', 'audio/mpeg');
  // Inline for in-app playback; attachment when the user explicitly downloads
  // (?download=1) so the file saves instead of navigating the tab away.
  const dl = req.query.download === '1';
  res.setHeader('Content-Disposition', `${dl ? 'attachment' : 'inline'}; filename="chapter-${req.params.idx}.mp3"`);
  return void res.send(buf);
}));

audioRouter.get('/audio/full/:bookId', ah(async (req, res) => {
  const b = await q<{ id: number; title: string } | null>(
    sb.from('books').select('id,title').eq('id', Number(req.params.bookId)).maybeSingle(),
    'audio book',
  );
  if (!b) throw new HError(404, 'NOT_FOUND', 'Book not found');
  try {
    const buf = await fullAudiobook(b.id);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${slug(b.title)}-audiobook.mp3"`);
    return void res.send(buf);
  } catch (e) {
    throw new HError(400, 'NO_AUDIO', (e as Error).message);
  }
}));

audioRouter.get('/audio/zip/:bookId', ah(async (req, res) => {
  const b = await q<{ id: number; title: string } | null>(
    sb.from('books').select('id,title').eq('id', Number(req.params.bookId)).maybeSingle(),
    'audio book',
  );
  if (!b) throw new HError(404, 'NOT_FOUND', 'Book not found');
  const tracks = (await trackStatus(b.id)).filter((t) => t.hasMp3);
  if (!tracks.length) throw new HError(400, 'NO_AUDIO', 'No chapter MP3s yet — forge them first.');
  const s = slug(b.title);
  const zip = new JSZip();
  for (const t of tracks) {
    const buf = await getTrack(b.id, t.idx);
    if (buf) zip.file(`${s}-ch${String(t.idx + 1).padStart(2, '0')}.mp3`, buf);
  }
  zip.file(`${s}.m3u`, ['#EXTM3U', ...tracks.map((t) => `#EXTINF:-1,Chapter ${t.idx + 1} - ${t.title}\n${s}-ch${String(t.idx + 1).padStart(2, '0')}.mp3`)].join('\n'));
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${s}-audiobook.zip"`);
  return void res.send(buf);
}));

audioRouter.get('/audio/settings', ah(async (_req, res) => {
  send(res, await getTtsSettings());
}));
audioRouter.put('/audio/settings', ah(async (req, res) => {
  const v = z.object({
    model: z.string().max(120).optional(),
    voice: z.string().max(60).optional(),
    instructions: z.string().max(2000).optional(),
    speed: z.number().min(0.25).max(4).optional(),
  }).parse(req.body);
  send(res, await saveTtsSettings(v));
}));

audioRouter.post('/audio/test', ah(async (_req, res) => {
  try {
    const buf = await testTts();
    res.setHeader('Content-Type', 'audio/mpeg');
    return void res.send(buf);
  } catch (e) {
    if ((e as { code?: string }).code === 'NO_KEY') throw new HError(409, 'NO_KEY', (e as Error).message);
    throw new HError(502, 'TTS_FAILED', (e as Error).message);
  }
}));

