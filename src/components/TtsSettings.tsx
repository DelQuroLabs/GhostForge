import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { api, errMsg } from '../lib/api.js';
import { Button, Field } from './ui.js';

const TTS_MODELS = ['gpt-4o-mini-tts', 'openai/gpt-4o-mini-tts', 'tts-1-hd', 'openai/tts-1-hd', 'tts-1', 'openai/tts-1'];
const TTS_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'];

export default function TtsSettings() {
  const [model, setModel] = useState('');
  const [voice, setVoice] = useState('');
  const [instructions, setInstructions] = useState('');
  const [speed, setSpeed] = useState(1);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    api.audio.settings().then((s) => {
      setModel(s.model);
      setVoice(s.voice);
      setInstructions(s.instructions ?? '');
      setSpeed(s.speed ?? 1);
    }).catch(() => {});
  }, []);

  async function save() {
    setBusy('save');
    setErr('');
    setMsg('');
    try {
      await api.audio.saveSettings({ model, voice, instructions, speed });
      setMsg('Narrator saved — chapter MP3s will use this voice, style, and pace.');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }
  async function test() {
    setBusy('test');
    setErr('');
    setMsg('');
    try {
      // The test line renders from saved settings — save the form first so
      // what you hear is the voice, style, and pace on screen.
      await api.audio.saveSettings({ model, voice, instructions, speed });
      const res = await fetch('/api/audio/test', { method: 'POST' });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(j?.error?.message ?? 'TTS test failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        void audioRef.current.play().catch(() => setErr('Audio received, but this browser blocked autoplay — press play below.'));
      }
      setMsg('Test line received — playing now.');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="card">
      <h3 style={{ margin: '0 0 4px', display: 'flex', gap: 8, alignItems: 'center' }}><Mic size={18} /> Audiobook narrator (MP3 export)</h3>
      <p className="dim" style={{ fontSize: 13, marginTop: 0 }}>Uses your AI key above. Billed by your provider per character.</p>
      {err ? <div className="alert error">{err}</div> : null}
      {msg ? <div className="alert ok">{msg}</div> : null}
      <Field label="TTS model" hint="Recommended: gpt-4o-mini-tts — most expressive, follows your style direction, cheapest. OpenRouter: prefix with openai/.">
        <input className="input" value={model} onChange={(e) => setModel(e.target.value)} list="tts-models" placeholder="gpt-4o-mini-tts" />
        <datalist id="tts-models">
          {TTS_MODELS.map((m) => <option key={m} value={m} />)}
        </datalist>
      </Field>
      <Field label="Narrator voice" hint="Deep & grave: onyx · Warm storytellers: nova, sage · Bright: shimmer, ballad · Press “Hear test line” to audition.">
        <select className="input" value={voice} onChange={(e) => setVoice(e.target.value)}>
          {TTS_VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </Field>
      <Field label="Narration style (gpt-4o-mini-tts only)" hint="Direct the narrator — pacing, mood, energy. Ignored by tts-1/tts-1-hd. Example: Epic dark-fantasy narrator. Slow and grave; whisper conspiracies, roar battles.">
        <textarea className="input" value={instructions} onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. Warm audiobook narrator for an epic adventure. Measured pace, dry humor, distinct energy for dialogue." style={{ minHeight: 70 }} />
      </Field>
      <Field label={`Narrator speed — ${speed.toFixed(2)}×`} hint="Pace baked into every MP3. Below 1.0 = weightier epic feel; above 1.0 = brisker.">
        <input type="range" min={0.75} max={1.25} step={0.05} value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))} style={{ width: '100%' }} />
      </Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button small onClick={save} disabled={busy === 'save'}>{busy === 'save' ? 'Saving…' : 'Save narrator'}</Button>
        <Button small variant="soft" onClick={test} disabled={busy === 'test'}>{busy === 'test' ? 'Synthesizing…' : 'Hear test line'}</Button>
      </div>
      <audio ref={audioRef} controls style={{ width: '100%', marginTop: 12 }} />
    </div>
  );
}
