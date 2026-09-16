import { useEffect, useState } from 'react';
import { Play, Pause, Square, Volume2 } from 'lucide-react';
import { Button, Progress } from './ui.js';

// Free in-browser narration via the Web Speech API. No key, no cost, works offline
// with system voices. Chunked per paragraph for reliability.
export default function ListenBar({ chapterNo, title, text }: { chapterNo: number; title: string; text: string }) {
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState('');
  const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const vs = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
      setVoices(vs);
      setVoiceURI((cur) => {
        if (cur || !vs.length) return cur;
        const pref = vs.find((v) => /neural|natural|samantha|daniel|google uk english female/i.test(v.name)) ?? vs[0];
        return pref ? pref.voiceURI : cur;
      });
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => window.speechSynthesis.cancel();
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
    setProgress(0);
  }, [text, supported]);

  if (!supported) {
    return <div className="alert info">🔇 This browser has no speech engine, so free Listen mode is unavailable here. MP3 audiobooks (Audiobook tab) still work.</div>;
  }

  function stop() {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
    setProgress(0);
  }
  function togglePause() {
    if (!playing) return;
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }
  function play() {
    const synth = window.speechSynthesis;
    if (paused) {
      synth.resume();
      setPaused(false);
      return;
    }
    synth.cancel();
    const paras = [`Chapter ${chapterNo}. ${title}.`, ...text.split(/\n{2,}|\r\n\r\n/)]
      .map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const total = paras.length || 1;
    let done = 0;
    setProgress(0);
    const v = voices.find((x) => x.voiceURI === voiceURI) ?? null;
    paras.forEach((p) => {
      const u = new SpeechSynthesisUtterance(p);
      if (v) u.voice = v;
      u.rate = rate;
      const tick = () => {
        done++;
        setProgress(done / total);
        if (done >= total) {
          setPlaying(false);
          setPaused(false);
        }
      };
      u.onend = tick;
      u.onerror = tick;
      synth.speak(u);
    });
    setPlaying(true);
    setPaused(false);
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <strong style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Volume2 size={17} /> Listen — free instant narration</strong>
        <div style={{ display: 'flex', gap: 6 }}>
          {!playing ? (
            <Button small onClick={play}><Play size={14} /> Play chapter</Button>
          ) : (
            <>
              <Button small variant="soft" onClick={togglePause}>{paused ? <Play size={14} /> : <Pause size={14} />} {paused ? 'Resume' : 'Pause'}</Button>
              <Button small variant="ghost" onClick={stop}><Square size={14} /> Stop</Button>
            </>
          )}
        </div>
      </div>
      <div className="form-grid" style={{ marginBottom: playing ? 10 : 0 }}>
        <label className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Narrator voice (this device)</span>
          <select className="input" value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)}>
            {voices.length === 0 ? <option value="">Default system voice</option> : null}
            {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
          </select>
        </label>
        <label className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Speed: {rate.toFixed(2)}×</span>
          <input type="range" min={0.7} max={1.5} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} style={{ width: '100%' }} aria-label="Narration speed" />
        </label>
      </div>
      {playing ? <Progress pct={progress * 100} /> : null}
      <div className="dim" style={{ fontSize: 12, marginTop: 8 }}>
        Applies on next play. Keep this tab focused — browsers throttle background speech. For a downloadable MP3 audiobook, use the Audiobook tab.
      </div>
    </div>
  );
}
