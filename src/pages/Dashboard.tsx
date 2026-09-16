import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, Flame } from 'lucide-react';
import { api, fmtWords, errMsg, type Book } from '../lib/api.js';
import { Button, Stat, EmptyState, Spinner, Badge } from '../components/ui.js';
import Cover from '../components/Cover.js';

export default function Dashboard() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [pens, setPens] = useState(0);
  const [series, setSeries] = useState(0);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [b, p, s] = await Promise.all([api.books.list(), api.pens.list(), api.series.list()]);
        setBooks(b);
        setPens(p.length);
        setSeries(s.length);
      } catch (e) {
        setErr(errMsg(e));
      }
    })();
  }, []);

  if (err) return <div className="alert error">{err}</div>;
  if (!books) return <Spinner label="Loading your shelf…" />;

  const totalWords = books.reduce((a, b) => a + (b.words ?? 0), 0);
  const complete = books.filter((b) => b.status === 'complete' || b.status === 'published').length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>The Shelf</h1>
          <p>Your faceless catalog. Every book here was forged whole — outline, characters, full chapters, publish kit.</p>
        </div>
        <Button to="/new"><Plus size={16} /> Forge a Book</Button>
      </div>
      <div className="stats-row">
        <Stat label="Books forged" value={String(books.length)} sub={`${complete} complete`} />
        <Stat label="Total words" value={fmtWords(totalWords)} sub="across the catalog" />
        <Stat label="Pen names" value={String(pens)} sub="faceless brands" />
        <Stat label="Series" value={String(series)} sub="in progress" />
      </div>
      {books.length === 0 ? (
        <EmptyState
          title="No books yet — the forge is cold."
          body="Forge your first epic in under a minute. The offline Story Engine needs no API key."
          action={<Button to="/new"><Flame size={16} /> Forge your first book</Button>}
        />
      ) : (
        <div className="shelf">
          {books.map((b) => (
            <Link key={b.id} to={`/books/${b.id}`} className="book-card">
              <Cover title={b.title} author={b.pen_name ?? 'Ghostforge'} cover={b.cover_cfg}
                seriesLine={b.series_title ? `${b.series_title}${b.series_number ? ` #${b.series_number}` : ''}` : undefined} />
              <div>
                <h3>{b.title}</h3>
                <div className="meta">
                  {b.pen_name ?? 'No pen name'} · {b.genre}<br />
                  {typeof b.chapters === 'number' ? b.chapters : (b.chapters ?? []).length} chapters
                  {b.series_title ? <> · {b.series_title} #{b.series_number}</> : null}
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  <Badge tone={b.status === 'complete' || b.status === 'published' ? 'green' : 'gold'}>{b.status}</Badge>
                  <Badge>{b.kind}</Badge>
                </div>
                <div className="words"><BookOpen size={12} style={{ verticalAlign: -1 }} /> {fmtWords(b.words ?? 0)} words</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
