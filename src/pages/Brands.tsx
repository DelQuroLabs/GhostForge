import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { api, errMsg, type Pen, type Series, type Book } from '../lib/api.js';
import { Button, Card, Field, Badge, Spinner, EmptyState, Modal } from '../components/ui.js';

export default function Brands() {
  const [pens, setPens] = useState<Pen[] | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [err, setErr] = useState('');
  const [modal, setModal] = useState<'pen' | 'series' | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [genres, setGenres] = useState('');
  const [seriesPen, setSeriesPen] = useState('');
  const [desc, setDesc] = useState('');

  async function load() {
    try {
      const [p, s, b] = await Promise.all([api.pens.list(), api.series.list(), api.books.list()]);
      setPens(p);
      setSeries(s);
      setBooks(b);
    } catch (e) {
      setErr(errMsg(e));
    }
  }
  useEffect(() => {
    load();
  }, []);

  if (!pens) return <Spinner label="Loading brands…" />;

  async function create() {
    setErr('');
    try {
      if (modal === 'pen') await api.pens.create({ name: name.trim(), bio: bio.trim(), genres: genres.trim() });
      else await api.series.create({ title: name.trim(), penNameId: seriesPen ? Number(seriesPen) : null, description: desc.trim() });
      setModal(null);
      setName('');
      setBio('');
      setGenres('');
      setDesc('');
      await load();
    } catch (e) {
      setErr(errMsg(e));
    }
  }
  async function delPen(id: number) {
    if (!confirm('Delete this pen name? Books stay, but lose the attribution.')) return;
    setErr('');
    try {
      await api.pens.remove(id);
      await load();
    } catch (e) {
      setErr(errMsg(e));
    }
  }
  async function delSeries(id: number) {
    if (!confirm('Delete this series? Books stay, but lose the series link.')) return;
    setErr('');
    try {
      await api.series.remove(id);
      await load();
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Pen Names & Series</h1>
          <p>Your faceless portfolio. Each pen name is a brand; each series is a compounding asset. Attach books at forge time.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button small variant="soft" onClick={() => setModal('pen')}><Plus size={14} /> Pen name</Button>
          <Button small variant="soft" onClick={() => setModal('series')}><Plus size={14} /> Series</Button>
        </div>
      </div>
      {err ? <div className="alert error">{err}</div> : null}
      <h3 className="field-label" style={{ marginBottom: 10 }}>Pen names ({pens.length})</h3>
      {pens.length === 0 ? <EmptyState title="No pen names" body="Create one — every faceless empire starts with a name that isn't yours." /> : null}
      <div className="char-grid" style={{ marginBottom: 26 }}>
        {pens.map((p) => (
          <Card key={p.id} className="char-card">
            <div className="row-between">
              <h4>{p.name}</h4>
              <button className="btn danger btn-sm" onClick={() => delPen(p.id)} aria-label={`Delete ${p.name}`}><Trash2 size={13} /></button>
            </div>
            <div className="char-role">{p.genres || 'No genres set'}</div>
            <p>{p.bio || 'No bio yet.'}</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <Badge tone="blue">{p.books ?? 0} books</Badge>
              <Badge>{p.series ?? 0} series</Badge>
            </div>
            {books.filter((b) => b.pen_name_id === p.id).map((b) => (
              <div key={b.id} style={{ fontSize: 13 }}>
                <Link to={`/books/${b.id}`} style={{ color: 'var(--gold)' }}><BookOpen size={12} /> {b.title}</Link>
              </div>
            ))}
          </Card>
        ))}
      </div>
      <h3 className="field-label" style={{ marginBottom: 10 }}>Series ({series.length})</h3>
      {series.length === 0 ? <EmptyState title="No series" body="Series are where faceless publishing compounds — readers of book 1 buy book 2." /> : null}
      <div className="char-grid">
        {series.map((s) => (
          <Card key={s.id} className="char-card">
            <div className="row-between">
              <h4>{s.title}</h4>
              <button className="btn danger btn-sm" onClick={() => delSeries(s.id)} aria-label={`Delete ${s.title}`}><Trash2 size={13} /></button>
            </div>
            <div className="char-role">{s.pen_name ?? 'No pen name'} · next: #{(s.latest ?? 0) + 1}</div>
            <p>{s.description || 'No description yet.'}</p>
            <div style={{ marginBottom: 8 }}><Badge tone="blue">{s.books ?? 0} books</Badge></div>
            {books.filter((b) => b.series_id === s.id).sort((a, b2) => (a.series_number ?? 0) - (b2.series_number ?? 0)).map((b) => (
              <div key={b.id} style={{ fontSize: 13 }}>
                <Link to={`/books/${b.id}`} style={{ color: 'var(--gold)' }}>#{b.series_number} — {b.title}</Link>
              </div>
            ))}
          </Card>
        ))}
      </div>
      {modal ? (
        <Modal title={modal === 'pen' ? 'New pen name' : 'New series'} onClose={() => setModal(null)}>
          <Field label={modal === 'pen' ? 'Pen name' : 'Series title'}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={modal === 'pen' ? 'e.g. Elena Cross' : 'e.g. Emberfall Saga'} />
          </Field>
          {modal === 'pen' ? (
            <>
              <Field label="Genres"><input className="input" value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="e.g. Fantasy, Adventure" /></Field>
              <Field label="Author bio"><textarea className="input" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short, mysterious, on-brand." /></Field>
            </>
          ) : (
            <>
              <Field label="Pen name">
                <select className="input" value={seriesPen} onChange={(e) => setSeriesPen(e.target.value)}>
                  <option value="">— none —</option>
                  {pens.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Description"><textarea className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is this series about?" /></Field>
            </>
          )}
          <div className="row-between mt">
            <span />
            <Button onClick={create} disabled={!name.trim()}>Create</Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
