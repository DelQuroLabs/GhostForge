import { useEffect, useRef, useState } from 'react';
import { useRefetchOnFocus } from '../lib/useRefetchOnFocus.js';
import { KeyRound, FlaskConical, Cpu, ShieldCheck, Download, Upload } from 'lucide-react';
import { api, errMsg, type AiCfg } from '../lib/api.js';
import { Button, Card, Field, Badge, Spinner } from '../components/ui.js';
import TtsSettings from '../components/TtsSettings.js';


const MODEL_IDEAS = [
  'gpt-oss:20b', 'llama3.1', 'qwen2.5:14b', 'mistral',
  'openai/gpt-4o-mini', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet',
  'google/gemini-flash-1.5', 'meta-llama/llama-3.1-70b-instruct', 'gpt-4o-mini', 'gpt-4o',
];

export default function Settings() {
  const [cfg, setCfg] = useState<AiCfg | null>(null);
  const [provider, setProvider] = useState('openrouter');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [key, setKey] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState('');
  const backupRef = useRef<HTMLInputElement>(null);

  function loadAi() {
    api.ai.get().then((c) => {
      setCfg(c);
      setProvider(c.provider);
      setBaseUrl(c.baseUrl);
      setModel(c.model);
    }).catch((e) => setErr(errMsg(e)));
  }
  // Re-checks on mount, tab focus, and tab visible — a failed fetch while
  // the server naps can never strand the badge on "no key" again.
  useRefetchOnFocus(loadAi);

  function pickProvider(p: string) {
    setProvider(p);
    if (p === 'openrouter') setBaseUrl('https://openrouter.ai/api/v1');
    else if (p === 'openai') setBaseUrl('https://api.openai.com/v1');
    else if (p === 'ollama') {
      setBaseUrl('http://localhost:11434/v1');
      setModel((m) => m || 'gpt-oss:20b');
    }
  }

  if (!cfg) return <Spinner label="Loading settings…" />;

  async function save() {
    setErr('');
    setOk('');
    setBusy('save');
    try {
      const c = await api.ai.save({ provider, baseUrl, model, key: key || undefined });
      setCfg(c);
      setKey('');
      setOk('AI settings saved. Key stays on this server — it is never sent to the browser again.');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }
  async function test() {
    setErr('');
    setOk('');
    setBusy('test');
    try {
      const r = await api.ai.test();
      setOk(`Key works. Model “${r.model}” replied: “${r.sample}”`);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }
  async function clearKey() {
    if (!confirm('Remove the stored AI key?')) return;
    setErr('');
    setOk('');
    setBusy('clearkey');
    try {
      const c = await api.ai.save({ clearKey: true });
      setCfg(c);
      setOk('Key removed. Offline engine still works fully.');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }
  function noteBackup() {
    setErr('');
    setOk('Backup requested — check your downloads folder, and keep the file somewhere safe.');
  }
  async function restoreBackup(f: File | undefined) {
    if (!f) return;
    setErr('');
    setOk('');
    try {
      const dump = JSON.parse(await f.text()) as { books?: unknown[] };
      if (!dump || !Array.isArray(dump.books) || !dump.books.length) {
        setErr('That file is not a Ghostforge backup (no books found).');
        return;
      }
      if (!confirm(`Restore ${dump.books.length} book(s) from backup? They will be ADDED to your shelf.`)) return;
      setBusy('restore');
      const r = await api.backup.restore(dump as unknown as Record<string, unknown>);
      setOk(`Restored ${r.restoredBooks} book(s) with ${r.restoredChapters} chapter(s), ${r.restoredReviews} editor review(s), and ${r.restoredEditor ?? 0} editor-in-chief report(s). Check your shelf.`);
    } catch (e) {
      setErr(e instanceof SyntaxError ? 'That file is not valid JSON.' : errMsg(e));
    } finally {
      setBusy('');
      if (backupRef.current) backupRef.current.value = '';
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Settings & AI</h1>
          <p>Bring your own key to upgrade chapters to frontier-model prose — or run the offline Story Engine forever, free.</p>
        </div>
      </div>
      {err ? <div className="alert error">{err}</div> : null}
      {ok ? <div className="alert ok">{ok}</div> : null}
      <div className="two-col">
        <Card>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}><KeyRound size={18} /> AI enhancement key</h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Badge tone={cfg?.hasKey ? 'green' : 'dim'}>{!cfg ? 'checking…' : cfg.hasKey ? `key set ${cfg.last4}` : 'no key'}</Badge>
              <Button small variant="ghost" onClick={loadAi} title="Re-check the key status with the server">↻</Button>
            </div>
          </div>
          <Field label="Provider">
            <div className="seg">
              <button className={provider === 'openrouter' ? 'selected' : ''} onClick={() => pickProvider('openrouter')}>OpenRouter</button>
              <button className={provider === 'openai' ? 'selected' : ''} onClick={() => pickProvider('openai')}>OpenAI</button>
              <button className={provider === 'ollama' ? 'selected' : ''} onClick={() => pickProvider('ollama')}>Ollama (local)</button>
              <button className={provider === 'custom' ? 'selected' : ''} onClick={() => pickProvider('custom')}>Custom</button>
            </div>
          </Field>
          <Field label="API base URL (OpenAI-compatible)">
            <input className="input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </Field>
          <Field label="Model id" hint="OpenRouter: provider/model · OpenAI: gpt-4o-mini · Ollama: model tag, e.g. gpt-oss:20b.">
            <input className="input" value={model} onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. openai/gpt-4o-mini" list="models" />
            <datalist id="models">
              {MODEL_IDEAS.map((m) => <option key={m} value={m} />)}
            </datalist>
          </Field>
          <Field label={provider === 'ollama' ? 'API key (not needed)' : cfg.hasKey ? 'New key (leave blank to keep current)' : 'API key'} hint={provider === 'ollama' ? 'Ollama ignores keys — leave blank.' : 'Stored server-side only. Never leaves this machine except to call your provider.'}>
            <input className="input" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-…" autoComplete="off" />
          </Field>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button small onClick={save} disabled={busy === 'save'}>{busy === 'save' ? 'Saving…' : 'Save'}</Button>
            <Button small variant="soft" onClick={test} disabled={busy === 'test'}><FlaskConical size={14} /> {busy === 'test' ? 'Testing…' : 'Test key'}</Button>
            {cfg.hasKey ? <Button small variant="danger" onClick={clearKey} disabled={busy === 'clearkey'}>{busy === 'clearkey' ? 'Removing…' : 'Remove key'}</Button> : null}
          </div>
        </Card>
        <TtsSettings />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <h3 style={{ margin: '0 0 8px', display: 'flex', gap: 8, alignItems: 'center' }}><Cpu size={18} /> Offline Story Engine</h3>
            <p className="dim" style={{ fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
              Every book forges instantly on this machine: premise → title → outline → cast →
              full chapters → KDP kit → cover. No key, no cost, no rate limits, unlimited books.
              Fiction follows a 7-beat arc (setup → climax); nonfiction follows a promise → framework → 30-day plan spine.
              Add a key above and any chapter can be rewritten by a frontier model with one click.
            </p>
          </Card>
          <Card>
            <h3 style={{ margin: '0 0 8px', display: 'flex', gap: 8, alignItems: 'center' }}><Cpu size={18} /> Local AI with Ollama</h3>
            <p className="dim" style={{ fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
              Run AI enhancement free on your own machine: 1. install Ollama from ollama.com, 2. run <code>ollama pull gpt-oss:20b</code>, 3. pick
              Ollama (local) above and hit Test. No key, no cloud, no cost — your words never leave home.
            </p>
          </Card>
          <Card>
            <h3 style={{ margin: '0 0 8px', display: 'flex', gap: 8, alignItems: 'center' }}><ShieldCheck size={18} /> Key safety</h3>
            <p className="dim" style={{ fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
              Your key lives in your Supabase Postgres database (outside this workspace, so machine wipes
              can't touch it), is only ever used in server-side calls to your chosen provider, and the API
              only ever reveals whether a key exists plus its last 4 characters. Chapter MP3s live in a
              private Supabase Storage bucket for the same reason.
            </p>
          </Card>
        </div>
      </div>
      <Card>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Library backup</h3>
          <a className="btn soft btn-sm" href={api.backup.url} download={`ghostforge-backup-${new Date().toISOString().slice(0, 10)}.json`} onClick={noteBackup} title="Downloads the backup — or right-click → “Save link as…”"><Download size={14} /> Download backup</a>
        </div>
        <p className="dim" style={{ fontSize: 13.5, lineHeight: 1.65 }}>
          Downloads every book, chapter, character, pen name, and series as one file — keep it somewhere safe
          (your computer, a cloud drive). Backups never include your API key. To bring a backup back, choose the file:
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={backupRef} type="file" accept=".json,application/json" style={{ display: 'none' }}
            onChange={(e) => restoreBackup(e.target.files?.[0])} />
          <Button small variant="soft" onClick={() => backupRef.current?.click()} disabled={busy === 'restore'}>
            <Upload size={14} /> {busy === 'restore' ? 'Restoring…' : 'Restore from file…'}
          </Button>
          <span className="dim" style={{ fontSize: 12.5 }}>Restore adds books to your shelf — it never deletes anything.</span>
        </div>
      </Card>
    </div>
  );
}
