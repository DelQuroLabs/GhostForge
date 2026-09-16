import type { Review } from '../lib/api.js';
import { Badge, Card } from './ui.js';

export const scoreTone = (s: number): 'green' | 'gold' | 'red' => (s >= 85 ? 'green' : s >= 70 ? 'gold' : 'red');
const sevTone = (s: string): 'red' | 'gold' | 'blue' => (s === 'error' ? 'red' : s === 'warning' ? 'gold' : 'blue');
const sevLabel = (s: string) => (s === 'error' ? 'Must fix' : s === 'warning' ? 'Should fix' : 'Polish');
const catLabel = (c: string) => (c === 'accuracy' ? 'Accuracy' : c === 'syntax' ? 'Syntax' : 'Cadence');

type Props = { reviews: Review[]; selId: number | null; onPick: (id: number) => void };

export default function ReviewPanel({ reviews, selId, onPick }: Props) {
  const review = reviews.find((r) => r.id === selId) ?? reviews[0];
  if (!review) return null;
  const errs = review.findings.filter((f) => f.severity === 'error').length;
  const warns = review.findings.filter((f) => f.severity === 'warning').length;
  const sugs = review.findings.filter((f) => f.severity === 'suggestion').length;
  return (
    <Card className="mt" id="editor-review">
      <div className="row-between">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>Editor review</strong>
          <Badge tone={scoreTone(review.score)}>✎ {review.score}</Badge>
          <span className="dim" style={{ fontSize: 12.5 }}>
            {review.model} · {review.created_at.slice(0, 16).replace('T', ' ')}
            {errs || warns || sugs ? ` · ${errs} must-fix · ${warns} should-fix · ${sugs} polish` : ' · clean pass'}
          </span>
        </div>
        {reviews.length > 1 ? (
          <select className="input" style={{ width: 'auto', fontSize: 12.5 }} value={review.id}
            onChange={(e) => onPick(Number(e.target.value))} title="Past reviews">
            {reviews.map((r) => (
              <option key={r.id} value={r.id}>
                {r.created_at.slice(0, 16).replace('T', ' ')} · {r.score} · {r.findings.length} notes
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {review.summary ? <p style={{ lineHeight: 1.65, marginBottom: review.findings.length ? 12 : 0 }}>{review.summary}</p> : null}
      {review.findings.length === 0 ? (
        <p className="dim" style={{ margin: 0 }}>No issues found — this chapter reads clean.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {review.findings.map((f, i) => (
            <div key={i} style={{ borderLeft: '3px solid rgba(255,255,255,.14)', paddingLeft: 12 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                <Badge tone={sevTone(f.severity)}>{sevLabel(f.severity)}</Badge>
                <span className="dim" style={{ fontSize: 12.5 }}>{catLabel(f.category)}{f.source === 'offline' ? ' · quick check' : ''}</span>
              </div>
              {f.quote ? <div style={{ fontStyle: 'italic', fontSize: 13.5, opacity: 0.85, marginBottom: 3 }}>“{f.quote}”</div> : null}
              <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>{f.issue}</div>
              {f.suggestion ? <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 2 }}><span style={{ color: 'var(--green, #4ade80)' }}>Try: </span>{f.suggestion}</div> : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
