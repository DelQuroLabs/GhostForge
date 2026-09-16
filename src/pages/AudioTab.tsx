import { useCallback, useEffect, useRef, useState } from 'react';
import { Headphones, Download, FileArchive, ListMusic, Play, Pause, RefreshCw, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, fmtWords, errMsg, type AudioTrack, type ApiError } from '../lib/api.js';
import { Button, Card, Badge, Progress, Spinner } from '../components/ui.js';
import { copyText } from '../lib/clipboard.js';
import CopyFallback from '../components/CopyFallback.js';

const mb = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

export default function AudioTab({ bookId, bookTitle }: { bookId: string; bookTitle: string }) {
  const [tracks, setTracks] = useState<AudioTrack[] | null>(null);
  const [err, setErr] = useState('');
  const [prog, setProg] = useState<{ i: number; n: number } | null>(null);
  const [busyOne, setBusyOne] = useState<number | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [note, setNote] = useState('');
  const [copiedM3u, setCopiedM3u] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await api.audio.status(bookId);
      setTracks(s.tracks);
    } catch (e) {
      setErr(errMsg(e));
    }
  }, [bookId]);
  useEffect(() => {
    load();
  }, [load]);

  if (!tracks) return <Spinner label="Loading audiobook…" />;
  const done = tracks.filter((t) => t.hasMp3).length;
  const totalBytes = tracks.reduce((a, t) => a + t.bytes, 0);
  const slug = bookTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'book';

  async function forgeOne(t: AudioTrack) {
    setBusyOne(t.chapterId);
    setErr('');
    try {
      await api.audio.forgeChapter(String(t.chapterId));
      await load();
    } catch (e) {
      setErr((e as ApiError)?.code === 'NO_KEY'
        ? 'No AI key configured — add one in Settings → AI to forge MP3s. Meanwhile, free Listen mode works in every chapter.'
        : errMsg(e));
    } finally {
      setBusyOne(null);
    }
  }
  function copyM3u() {
    copyText(m3uText()).then((ok) => {
      if (!ok) {
        setFallbackText(m3uText());
        return;
      }
      setCopiedM3u(true);
      setNote('Playlist copied — paste it into a text file named ending in .m3u, next to your chapter MP3s.');
      setTimeout(() => setCopiedM3u(false), 1600);
    });
  }
  async function forgeAll() {
    const list = tracks;
    if (!list) return;
    const pending = list.filter((t) => !t.hasMp3).length;
    const ok = window.confirm(pending
      ? `Narrate ${pending} chapter(s) with your TTS voice? Billed by your provider per character. Nothing is generated until you confirm.`
      : 'Re-narrate ALL chapters? This replaces every existing MP3 and bills again.');
    if (!ok) return;
    setErr('');
    setProg({ i: 0, n: list.length });
    try {
      for (let i = 0; i < list.length; i++) {
        setProg({ i, n: list.length });
        await api.audio.forgeChapter(String(list[i]!.chapterId));
      }
      await load();
    } catch (e) {
      setErr((e as ApiError)?.code === 'NO_KEY'
        ? 'No AI key configured — add one in Settings → AI to forge MP3s. Meanwhile, free Listen mode works in every chapter.'
        : errMsg(e));
      await load();
    } finally {
      setProg(null);
    }
  }
  function play(idx: number) {
    const a = audioRef.current;
    if (!a) return;
    if (playing === idx) {
      if (a.paused) void a.play();
      else a.pause();
      return;
    }
    a.src = api.audio.fileUrl(bookId, idx);
    void a.play();
    setPlaying(idx);
  }
  function onEnded() {
    const list = tracks;
    if (playing === null || !list) return;
    const next = list.find((t) => t.idx > playing && t.hasMp3);
    if (next) play(next.idx);
    else setPlaying(null);
  }
  function m3uText(): string {
    const list = tracks ?? [];
    return ['#EXTM3U', ...list.filter((t) => t.hasMp3)
      .map((t) => `#EXTINF:-1,Chapter ${t.idx + 1} - ${t.title}\n${slug}-ch${String(t.idx + 1).padStart(2, '0')}.mp3`)].join('\n');
  }

  return (
    <div>
      <Card>
        <div className="row-between">
          <strong style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Headphones size={18} /> Audiobook — {done}/{tracks.length} chapters
            {totalBytes > 0 ? <span className="dim" style={{ fontWeight: 400 }}>· {mb(totalBytes)}</span> : null}
          </strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button small onClick={forgeAll} disabled={!!prog || !!busyOne}>
              {prog ? `Forging ${prog.i + 1}/${prog.n}…` : done > 0 ? 'Re-forge all MP3s' : 'Forge all MP3s'}
            </Button>
            {done > 0 ? (
              <>
                <a className="btn soft btn-sm" href={api.audio.fullUrl(bookId)} download={`${slug}-audiobook.mp3`} onClick={() => setNote('Full audiobook requested — check your downloads folder.')}><Download size={14} /> Full MP3</a>
                <a className="btn soft btn-sm" href={api.audio.zipUrl(bookId)} download={`${slug}-chapters.zip`} onClick={() => setNote('Chapters ZIP requested — check your downloads folder.')}><FileArchive size={14} /> Chapters ZIP</a>
                <Button small variant="ghost" onClick={copyM3u} title="Copies the playlist text — paste into a .m3u file next to your MP3s"><ListMusic size={14} /> {copiedM3u ? 'Copied' : 'Copy M3U'}</Button>
              </>
            ) : null}
          </div>
        </div>
        {prog ? <div style={{ marginTop: 12 }}><Progress pct={(prog.i / prog.n) * 100} /></div> : null}
        <p className="dim" style={{ fontSize: 13, marginBottom: 0 }}>
          MP3s are narrated by your TTS voice (<Link to="/settings" style={{ color: 'var(--gold)' }}><Settings2 size={12} /> Settings → narrator</Link>)
          and billed by your provider per character. No key? Use free Listen mode inside any chapter.
        </p>
      </Card>
      {err ? <div className="alert error" style={{ marginTop: 12 }}>{err}</div> : null}
      {note ? <div className="alert info" style={{ marginTop: 12 }}>{note}</div> : null}
      {fallbackText !== null ? <CopyFallback text={fallbackText} onClose={() => setFallbackText(null)} /> : null}
      <div style={{ marginTop: 12 }}>
        {tracks.map((t) => (
          <div key={t.chapterId} className="ch-row">
            <div className="ch-num">{t.idx + 1}</div>
            <div style={{ flex: 1 }}>
              <h4>{t.title}</h4>
              <p>{fmtWords(t.words)} words {t.hasMp3 ? <>· {mb(t.bytes)} · voice {t.voice || '—'}</> : '· no audio yet'}</p>
            </div>
            <div className="ch-side" style={{ flexDirection: 'row', alignItems: 'center' }}>
              {t.hasMp3 ? <Badge tone="green">mp3</Badge> : <Badge>no audio</Badge>}
              {t.hasMp3 ? (
                <>
                  <Button small variant="soft" onClick={() => play(t.idx)}>
                    {playing === t.idx && !isPaused ? <Pause size={14} /> : <Play size={14} />}
                  </Button>
                  <a className="btn ghost btn-sm" href={api.audio.fileDl(bookId, t.idx)} download={`${slug}-ch${String(t.idx + 1).padStart(2, '0')}.mp3`} title="Download this chapter's MP3" onClick={() => setNote(`Chapter ${t.idx + 1} MP3 requested — check your downloads folder.`)}><Download size={14} /></a>
                </>
              ) : null}
              <Button small variant="ghost" onClick={() => forgeOne(t)} disabled={busyOne !== null || !!prog}>
                <RefreshCw size={14} /> {busyOne === t.chapterId ? '…' : t.hasMp3 ? 'Redo' : 'Forge'}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <audio
        ref={audioRef}
        style={{ display: 'none' }}
        onEnded={onEnded}
        onPause={() => setIsPaused(true)}
        onPlay={() => setIsPaused(false)}
      />
    </div>
  );
}
