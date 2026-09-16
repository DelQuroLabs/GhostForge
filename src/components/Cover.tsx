import { useId } from 'react';
import type { CoverCfg } from '../lib/api.js';

function wrapTitle(title: string, max = 12): string[] {
  const words = title.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      lines.push(cur.trim());
      cur = w;
    } else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.slice(0, 4);
}

function Motif({ kind, color }: { kind: string; color: string }) {
  const s = { fill: 'none', stroke: color, strokeWidth: 6, opacity: 0.9 } as const;
  switch (kind) {
    case 'crown': return (<g {...s} strokeLinejoin="round"><path d="M110 190 L90 120 L140 155 L200 100 L260 155 L310 120 L290 190 Z" /><line x1="110" y1="210" x2="290" y2="210" /></g>);
    case 'flame': return (<g {...s} strokeLinejoin="round"><path d="M200 100 C 240 140 260 165 260 205 A 60 60 0 0 1 140 205 C 140 165 170 145 180 110 C 195 130 200 140 200 100 Z" /></g>);
    case 'orbit': return (<g {...s}><circle cx="200" cy="165" r="34" /><ellipse cx="200" cy="165" rx="95" ry="34" transform="rotate(-18 200 165)" /><circle cx="285" cy="140" r="8" fill={color} stroke="none" /></g>);
    case 'key': return (<g {...s}><circle cx="175" cy="150" r="32" /><line x1="205" y1="172" x2="270" y2="230" /><line x1="240" y1="200" x2="262" y2="184" /><line x1="254" y1="216" x2="276" y2="200" /></g>);
    case 'eye': return (<g {...s}><path d="M100 165 Q 200 100 300 165 Q 200 230 100 165 Z" /><circle cx="200" cy="165" r="26" /></g>);
    case 'target': return (<g {...s}><circle cx="200" cy="165" r="70" /><circle cx="200" cy="165" r="38" /><circle cx="200" cy="165" r="8" fill={color} stroke="none" /></g>);
    case 'mountain': case 'summit': return (<g {...s} strokeLinejoin="round"><path d="M90 230 L165 110 L210 175 L245 130 L310 230 Z" /><circle cx="265" cy="95" r="18" /></g>);
    case 'wave': case 'tide': return (<g {...s}><path d="M95 150 Q 140 120 185 150 T 275 150" /><path d="M95 190 Q 140 160 185 190 T 275 190" /><path d="M95 230 Q 140 200 185 230 T 275 230" /></g>);
    case 'compass': return (<g {...s}><circle cx="200" cy="165" r="70" /><path d="M200 115 L218 165 L200 215 L182 165 Z" fill={color} opacity="0.35" /></g>);
    case 'moon': return (<g {...s}><path d="M235 110 A 62 62 0 1 0 235 220 A 48 48 0 1 1 235 110 Z" fill={color} opacity="0.3" /><circle cx="285" cy="110" r="6" fill={color} stroke="none" /></g>);
    case 'sword': return (<g {...s}><line x1="200" y1="90" x2="200" y2="210" /><line x1="160" y1="200" x2="240" y2="200" /><circle cx="200" cy="225" r="10" /></g>);
    case 'bloom': return (<g {...s}><circle cx="200" cy="165" r="16" />{[0, 60, 120, 180, 240, 300].map((a) => (<ellipse key={a} cx="200" cy="115" rx="18" ry="34" transform={`rotate(${a} 200 165)`} />))}</g>);
    case 'lantern': return (<g {...s}><rect x="170" y="120" width="60" height="80" rx="10" /><line x1="200" y1="95" x2="200" y2="120" /><circle cx="200" cy="160" r="12" fill={color} stroke="none" /></g>);
    case 'bolt': return (<g {...s} strokeLinejoin="round"><path d="M225 95 L155 175 L195 175 L180 235 L245 150 L205 150 Z" /></g>);
    case 'ship': return (<g {...s}><path d="M110 200 L290 200 L255 235 L145 235 Z" /><line x1="200" y1="200" x2="200" y2="105" /><path d="M200 105 L260 175 L200 175 Z" /></g>);
    case 'bird': return (<g {...s}><path d="M110 165 Q 155 125 200 165 Q 245 125 290 165" /><path d="M140 195 Q 170 175 200 195 Q 230 175 260 195" /></g>);
    case 'sun': return (<g {...s}><circle cx="200" cy="165" r="30" />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (<line key={a} x1="200" y1="105" x2="200" y2="122" transform={`rotate(${a} 200 165)`} />))}</g>);
    case 'path': return (<g {...s}><path d="M120 235 C 170 200 150 175 200 160 C 250 145 230 120 280 95" /><circle cx="120" cy="235" r="8" fill={color} stroke="none" /><circle cx="280" cy="95" r="8" fill={color} stroke="none" /></g>);
    case 'door': return (<g {...s}><rect x="145" y="100" width="110" height="135" rx="4" /><circle cx="235" cy="170" r="6" fill={color} stroke="none" /></g>);
    case 'seal': return (<g {...s}><circle cx="200" cy="165" r="62" /><circle cx="200" cy="165" r="40" /><path d="M200 130 L200 200 M165 165 L235 165" /></g>);
    case 'tower': return (<g {...s}><path d="M165 235 L170 110 L230 110 L235 235 Z" /><path d="M170 110 L165 130 M185 110 L183 130 M200 110 L200 130 M215 110 L217 130 M230 110 L235 130" /></g>);
    case 'dragon': return (<g {...s}><path d="M120 210 C 150 150 190 220 215 150 C 230 180 250 170 280 130" /><circle cx="275" cy="125" r="7" fill={color} stroke="none" /></g>);
    case 'letter': return (<g {...s}><rect x="130" y="115" width="140" height="100" rx="6" /><path d="M130 120 L200 175 L270 120" /></g>);
    case 'grid': return (<g {...s}><path d="M120 120 L280 120 L280 210 L120 210 Z M120 150 L280 150 M120 180 L280 180 M170 120 L170 210 M225 120 L225 210" /></g>);
    case 'signal': return (<g {...s}><circle cx="200" cy="200" r="10" fill={color} stroke="none" /><path d="M160 165 A 55 55 0 0 1 240 165" /><path d="M135 140 A 90 90 0 0 1 265 140" /></g>);
    case 'helm': return (<g {...s}><circle cx="200" cy="165" r="60" /><circle cx="200" cy="165" r="16" /><path d="M200 105 L200 230 M140 165 L260 165" /></g>);
    case 'wire': return (<g {...s}><path d="M110 200 C 160 200 150 130 200 130 C 250 130 240 200 290 200" /><circle cx="200" cy="130" r="8" fill={color} stroke="none" /></g>);
    case 'slash': return (<g {...s}><path d="M130 220 L270 110" /><path d="M150 235 L290 125" opacity="0.4" /><path d="M110 205 L250 95" opacity="0.4" /></g>);
    case 'maze': return (<g {...s}><path d="M130 120 L270 120 L270 210 L170 210 L170 155 L235 155" /></g>);
    case 'thorn': return (<g {...s}><path d="M130 210 C 180 170 200 190 270 120" /><path d="M180 175 L165 155 M210 170 L215 148 M235 150 L245 132" /></g>);
    default: return (<g {...s}><circle cx="200" cy="165" r="60" /><path d="M200 130 L200 200 M165 165 L235 165" /></g>);
  }
}

export function CoverSvg({ title, author, cover, seriesLine, id }: {
  title: string; author: string; cover: CoverCfg; seriesLine?: string; id: string;
}) {
  const lines = wrapTitle(title);
  const gid = `g${id}`;
  return (
    <svg viewBox="0 0 400 600" role="img" aria-label={`Cover: ${title}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cover.bg2} />
          <stop offset="1" stopColor={cover.bg} />
        </linearGradient>
      </defs>
      <rect width="400" height="600" fill={`url(#${gid})`} />
      <rect x="14" y="14" width="372" height="572" fill="none" stroke={cover.accent} strokeWidth="2" opacity="0.65" />
      <rect x="22" y="22" width="356" height="556" fill="none" stroke={cover.accent} strokeWidth="1" opacity="0.3" />
      <text x="200" y="86" textAnchor="middle" fill={cover.accent} fontSize="17" letterSpacing="4" fontFamily="Georgia,serif">
        {(seriesLine ?? cover.tagline ?? '').slice(0, 34).toUpperCase()}
      </text>
      <g transform="translate(0,120)"><Motif kind={cover.motif} color={cover.accent} /></g>
      <line x1="120" y1="392" x2="280" y2="392" stroke={cover.accent} strokeWidth="2" opacity="0.8" />
      {lines.map((l, i) => (
        <text key={i} x="200" y={430 + i * 44} textAnchor="middle" fill={cover.ink}
          fontSize={lines.length > 2 ? 34 : 40} fontWeight="bold" fontFamily="Georgia,serif">{l}</text>
      ))}
      <text x="200" y="560" textAnchor="middle" fill={cover.ink} fontSize="21" fontStyle="italic" fontFamily="Georgia,serif">{author}</text>
    </svg>
  );
}

export default function Cover({ title, author, cover, seriesLine, className = '' }: {
  title: string; author: string; cover: CoverCfg; seriesLine?: string; className?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <div className={`cover ${className}`}>
      <CoverSvg title={title} author={author} cover={cover} seriesLine={seriesLine} id={id} />
    </div>
  );
}

export function coverSvgString(): string | null {
  const live = document.getElementById('publish-cover')?.querySelector('svg');
  if (!live) return null;
  const clone = live.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '400');
  clone.setAttribute('height', '600');
  clone.removeAttribute('style');
  return new XMLSerializer().serializeToString(clone);
}

function triggerBlobDownload(url: string, fname: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  document.body.appendChild(a); // Firefox ignores clicks on detached anchors
  a.click();
  a.remove();
}

export function downloadCoverSVG(title: string, author: string, cover: CoverCfg, seriesLine?: string) {
  const fname = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50) || 'cover'}-cover.svg`;
  const live = coverSvgString();
  if (live) {
    const url = URL.createObjectURL(new Blob([live], { type: 'image/svg+xml' }));
    triggerBlobDownload(url, fname);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }
  const lines = wrapTitle(title);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cover.bg2}"/><stop offset="1" stop-color="${cover.bg}"/></linearGradient></defs><rect width="400" height="600" fill="url(#g)"/><rect x="14" y="14" width="372" height="572" fill="none" stroke="${cover.accent}" stroke-width="2" opacity="0.65"/><text x="200" y="86" text-anchor="middle" fill="${cover.accent}" font-size="17" letter-spacing="4" font-family="Georgia,serif">${((seriesLine ?? cover.tagline ?? '').slice(0, 34)).toUpperCase()}</text><line x1="120" y1="392" x2="280" y2="392" stroke="${cover.accent}" stroke-width="2" opacity="0.8"/>${lines.map((l, i) => `<text x="200" y="${430 + i * 44}" text-anchor="middle" fill="${cover.ink}" font-size="${lines.length > 2 ? 34 : 40}" font-weight="bold" font-family="Georgia,serif">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`).join('')}<text x="200" y="560" text-anchor="middle" fill="${cover.ink}" font-size="21" font-style="italic" font-family="Georgia,serif">${author.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  triggerBlobDownload(url, fname);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
