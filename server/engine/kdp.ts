import { pickN, type Rng } from './rng.js';
import { classify, extractTerms } from './names.js';

const CATS: Record<string, string[]> = {
  fantasy: ['Fantasy > Epic', 'Fantasy > Paranormal & Urban', 'Teen & Young Adult > Fantasy > Epic'],
  scifi: ['Science Fiction > Space Opera', 'Science Fiction > Dystopian', 'Science Fiction > Cyberpunk'],
  romance: ['Romance > Contemporary', 'Romance > Second Chances', 'Literature & Fiction > Small Town'],
  thriller: ['Thriller & Suspense > Crime', 'Thriller & Suspense > Espionage', 'Mystery > Hard-Boiled'],
  mystery: ['Mystery, Thriller & Suspense > Cozy', 'Mystery > Women Sleuths', 'Literature & Fiction > Crime'],
  horror: ['Horror > Supernatural', 'Literature & Fiction > Ghosts', 'Teen & Young Adult > Horror'],
  historical: ['Literature & Fiction > Historical', 'Historical Fiction > Sagas', 'Romance > Historical'],
  modern: ['Literature & Fiction > Coming of Age', 'Literature & Fiction > Family Life', 'Contemporary Fiction'],
  selfhelp: ['Self-Help > Personal Growth', 'Self-Help > Success', 'Business & Money > Motivational'],
  business: ['Business & Money > Entrepreneurship', 'Business & Money > Management', 'Self-Help > Success'],
  memoir: ['Biographies & Memoirs > Personal Memoirs', 'Biographies & Memoirs > Women', 'Self-Help > Personal Growth'],
};

const NF_CATS = ['selfhelp', 'business', 'memoir'];

export function nfFamily(genre: string): string {
  const g = genre.toLowerCase();
  if (/memoir|biograph|life story/.test(g)) return 'memoir';
  if (/business|startup|money|financ|market|leader|entrepren/.test(g)) return 'business';
  return 'selfhelp';
}

const KEYWORD_POOL: Record<string, string[]> = {
  fantasy: ['epic fantasy novel', 'magic and dragons', 'chosen one quest', 'dark lord saga', 'enemies to allies fantasy', 'kingdom at war', 'prophecy adventure', 'swords and sorcery'],
  scifi: ['space opera adventure', 'dystopian thriller', 'first contact novel', 'AI science fiction', 'generation ship mystery', 'cyberpunk noir', 'galactic war saga', 'time travel paradox'],
  romance: ['second chance romance', 'small town love story', 'enemies to lovers', 'single parent romance', 'beach read romance', 'forced proximity', 'grumpy sunshine', 'clean contemporary romance'],
  thriller: ['crime thriller series', 'spy conspiracy novel', 'page turner suspense', 'vigilante justice thriller', 'heist thriller', 'psychological cat and mouse', 'assassin thriller', 'political conspiracy'],
  mystery: ['cozy mystery series', 'amateur sleuth', 'small town murder mystery', 'whodunit puzzle', 'detective series starter', 'locked room mystery', 'village secrets', 'cold case mystery'],
  horror: ['supernatural horror novel', 'haunted house story', 'folk horror', 'ghost story collection feel', 'creepy small town', 'survival horror', 'paranormal suspense', 'dark ritual horror'],
  historical: ['historical saga', 'wartime novel', 'frontier adventure', 'regency era story', 'epic historical fiction', 'family saga generations', 'based on true era events', 'coming of age historical'],
  modern: ['literary fiction bestseller feel', 'book club fiction', 'emotional family drama', 'contemporary coming of age', 'uplifting life fiction', 'small town secrets', 'second chances novel', 'heartwarming story'],
  selfhelp: ['habits and mindset', 'personal growth book', 'productivity system', 'self discipline guide', 'confidence building', 'morning routine success', 'goal setting planner style', 'overcome procrastination'],
  business: ['startup playbook', 'entrepreneur mindset', 'online business guide', 'leadership skills', 'marketing strategy book', 'passive income ideas', 'small business growth', 'money management'],
  memoir: ['inspiring true story', 'overcoming adversity memoir', 'family memoir', 'survival story', 'redemption journey', 'grief and healing', 'rags to resilience', 'unforgettable life story'],
};

export function buildKdp(r: Rng, kind: 'fiction' | 'nonfiction', genre: string, premise: string, title: string) {
  const fam = kind === 'fiction' ? classify(genre) : nfFamily(genre);
  const cats = (CATS[fam] ?? CATS.modern).slice(0, 2);
  const terms = extractTerms(premise, 4);
  const pool = KEYWORD_POOL[fam] ?? KEYWORD_POOL.modern;
  const keywords = [...terms.map((t) => `${t} ${kind === 'fiction' ? 'novel' : 'book'}`), ...pickN(r, pool, 7)].slice(0, 7);
  return { categories: cats, keywords, fam };
}

export function nfKindLabel(genre: string): string {
  return nfFamily(genre);
}
export { NF_CATS };
