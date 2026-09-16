import { pick, type Rng } from './rng.js';

export type Family =
  | 'fantasy' | 'scifi' | 'romance' | 'thriller'
  | 'mystery' | 'horror' | 'historical' | 'modern';

export function classify(genre: string): Family {
  const g = genre.toLowerCase();
  if (/litrpg|gamelit|fantas|magic|dragon|elf|fae|myth|legend|quest|paranormal/.test(g)) return 'fantasy';
  if (/sci-?fi|science fiction|space|cyber|dystop|robot|alien|future|star|galax|android/.test(g)) return 'scifi';
  if (/roman|love|wedding|duke|bride/.test(g)) return 'romance';
  if (/thrill|spy|assassin|crime|heist|action|suspense|terror|agent/.test(g)) return 'thriller';
  if (/myster|detect|cozy|murder|noir/.test(g)) return 'mystery';
  if (/horror|ghost|haunt|zombie|vampire|occult/.test(g)) return 'horror';
  if (/histor|western|war\b|regency|victorian|medieval|pirate|viking/.test(g)) return 'historical';
  return 'modern';
}

const MODERN_F = ['Elena', 'Maya', 'Sarah', 'Priya', 'Nora', 'Claire', 'Jess', 'Amara', 'Liv', 'Dana', 'Ruth', 'Tessa', 'Wren', 'Iris', 'Noor'];
const MODERN_M = ['Jonah', 'Marcus', 'Dev', 'Sam', 'Elias', 'Cole', 'Nathan', 'Reyes', 'Tom', 'Gabriel', 'Silas', 'Omar', 'Kane', 'Theo', 'Miles'];
const MODERN_LAST = ['Carter', 'Hayes', 'Okafor', 'Marsh', 'Delacroix', 'Vance', 'Quinn', 'Rooker', 'Almeida', 'Frost', 'Halloway', 'Mercer', 'Ashford', 'Calloway', 'Drummond', 'Ellery'];
const FAN_F = ['Aeliana', 'Seraphine', 'Lyra', 'Morwen', 'Elowen', 'Kaelis', 'Isolde', 'Sylvi', 'Rowan', 'Thalia'];
const FAN_M = ['Kael', 'Dorian', 'Theron', 'Aldric', 'Rhys', 'Corvin', 'Emrys', 'Leander', 'Osric', 'Finnick'];
const FAN_LAST = ['Stormborn', 'Nightwhisper', 'Ironwood', 'Thornvale', 'Blackmoor', 'Silvercrest', 'Oakenshield', 'Ravensworth', 'Grimshaw', 'Winterbourne'];
const SCI_F = ['Nova', 'Vera', 'Juno', 'Sable', 'Ilsa', 'Nyx', 'Cora', 'Vesper', 'Lux', 'Ada'];
const SCI_M = ['Dax', 'Rook', 'Corvus', 'Jett', 'Sol', 'Kade', 'Zero', 'Talon', 'Reyes', 'Hale'];
const SCI_LAST = ['Voss', 'Kael', 'Draak', 'Solano', 'Meridian', 'Cross', 'Vega', 'Starkiller', 'Onyx', 'Quasar'];

const PLACES: Record<Family, string[]> = {
  fantasy: ['Emberhold', 'the Whispering Vale', 'Thornwall Keep', 'the Shattered Coast', 'Gloamwood Forest', 'the Sunken Citadel', 'Ravenspire', 'the Ashen Moors', 'Eldermere', 'the Howling Pass'],
  scifi: ['Station Meridian', 'the Kepler Drift', 'New Arcadia', 'Sector Nine', 'the Helios Array', 'Rust Harbor', 'the Andromeda Relay', 'Cinder Colony', 'the Void Docks', 'Terminus Prime'],
  romance: ['Seabrook Cove', 'the Rosewater Inn', 'Willow Creek', 'Bell Harbor', 'the Lavender Farm', 'Maple Street', 'Cedar Falls', 'the Old Lighthouse', 'Hartfield Manor', 'Sunset Pier'],
  thriller: ['the warehouse district', 'the safe house on Mercer Street', 'the underground garage', 'the decommissioned airfield', 'the safehouse in Prague', 'the marina at midnight', 'the glass tower downtown', 'the border crossing', 'the abandoned metro station', 'the penthouse'],
  mystery: ['Blackwood Manor', 'the village of Thornhill', 'the old rectory', 'Hollow Lane', 'the boarding house', 'the coastal town of Greyport', 'the antique shop', 'the train station café', 'the library archives', 'the fog-bound pier'],
  horror: ['the Blackwood house', 'the abandoned sanatorium', 'Gallows Hill', 'theROT'.replace('ROT', 'root cellar'), 'the cornfield', 'the empty motel', 'the flooded basement', 'the chapel ruins', 'the mirror room', 'the service tunnels'],
  historical: ['the Port of Lisbon', 'the winter camp', 'the grand estate', 'the cobbled market square', 'the frontier fort', 'the river crossing', 'the old cathedral', 'the railway station', 'the officers\u2019 mess', 'the harbor town'],
  modern: ['the rooftop garden', 'the corner bookstore', 'the night train', 'the lake house', 'the downtown loft', 'the coastal highway', 'the old theater', 'the mountain cabin', 'the city park at dawn', 'the ferry terminal'],
};

const OBJECTS: Record<Family, string[]> = {
  fantasy: ['the Ember Crown', 'a shard of the fallen star', 'the last dragon egg', 'the Whispering Blade', 'the sealed prophecy', 'the Moonwell chalice', 'an ancient grimoire', 'the broken sigil'],
  scifi: ['the quantum core', 'a corrupted memory chip', 'the last transmission', 'the terraforming key', 'the rogue AI core', 'a star-chart to nowhere', 'the cryo-pod manifest', 'the signal cipher'],
  romance: ['an unsent letter', 'the deed to the inn', 'a vintage ring', 'a box of old photographs', 'the recipe book', 'a one-way ticket', 'the spare key', 'a wedding invitation'],
  thriller: ['the encrypted drive', 'a burner phone', 'the manifest', 'a forged passport', 'the dead-drop coordinates', 'a silenced pistol', 'the briefcase', 'the kill order'],
  mystery: ['a torn photograph', 'the missing will', 'a coded diary', 'the brass key', 'an anonymous note', 'the stopped watch', 'a muddy footprint cast', 'the second autopsy report'],
  horror: ['the tape recorder', 'a child\u2019s drawing', 'the boarded door', 'a jar of teeth', 'the flickering flashlight', 'the nursery rhyme book', 'a cracked mirror', 'the basement tapes'],
  historical: ['a sealed letter from the front', 'the officer\u2019s saber', 'a pocket watch', 'the land deed', 'a smuggled map', 'the regimental colors', 'a locket', 'the pardon order'],
  modern: ['an old mixtape', 'the eviction notice', 'a postcard with no signature', 'the spare apartment key', 'a winning lottery ticket', 'the manuscript', 'a hospital bracelet', 'the last voicemail'],
};

const GOALS: Record<Family, string[]> = {
  fantasy: ['reclaim the throne before the eclipse', 'destroy the cursed relic', 'unite the fractured clans', 'close the rift between worlds'],
  scifi: ['stop the station from falling out of orbit', 'expose the corporation\u2019s lie', 'find the lost colony ship', 'prevent the AI from going silent forever'],
  romance: ['save the family business', 'win back the one who got away', 'survive one summer as neighbors', 'prove that second chances exist'],
  thriller: ['disappear before they find the truth', 'protect the witness at any cost', 'uncover the mole inside the agency', 'stop the exchange before midnight'],
  mystery: ['name the killer before the next full moon', 'clear an innocent name', 'find the missing heir', 'decode the final message'],
  horror: ['survive until sunrise', 'burn the house down before it wakes', 'escape the town that isn\u2019t on any map', 'end what was started forty years ago'],
  historical: ['bring the regiment home alive', 'defend the crossing through winter', 'deliver the message across enemy lines', 'keep the estate from ruin'],
  modern: ['start over with nothing but a name', 'make peace with the past', 'hold the family together', 'find out who to become next'],
};

export type CastSeed = { hero: string; heroFemale: boolean; ally: string; villain: string; mentor: string };

export function makeCast(r: Rng, fam: Family): CastSeed {
  const female = r() < 0.5;
  const F = fam === 'fantasy' ? FAN_F : fam === 'scifi' ? SCI_F : MODERN_F;
  const M = fam === 'fantasy' ? FAN_M : fam === 'scifi' ? SCI_M : MODERN_M;
  const L = fam === 'fantasy' ? FAN_LAST : fam === 'scifi' ? SCI_LAST : MODERN_LAST;
  const full = (f: string) => `${f} ${pick(r, L)}`;
  return {
    hero: full(pick(r, female ? F : M)),
    heroFemale: female,
    ally: full(pick(r, r() < 0.5 ? F : M)),
    villain: full(pick(r, M)),
    mentor: full(pick(r, r() < 0.5 ? F : M)),
  };
}

export function place(r: Rng, fam: Family): string {
  return pick(r, PLACES[fam]);
}
export function objectOf(r: Rng, fam: Family): string {
  return pick(r, OBJECTS[fam]);
}
export function goalOf(r: Rng, fam: Family): string {
  return pick(r, GOALS[fam]);
}

const STOP = new Set(('a,an,the,and,or,but,of,to,in,on,for,with,from,at,by,about,into,through,after,before,between,under,over,who,what,when,where,why,how,is,are,was,were,be,been,being,have,has,had,do,does,did,will,would,can,could,should,must,their,there,they,them,his,her,its,our,your,this,that,these,those,as,not,no,yes,if,then,than,so,such,only,just,more,most,very,also,because,while,during,each,other,some,any,all,her,him,she,he,it,we,you,i,my,me,book,novel,story').split(','));

export function extractTerms(premise: string, n = 6): string[] {
  const words = premise.replace(/[^A-Za-z0-9'’\s-]/g, ' ').split(/\s+/).filter(Boolean);
  const scored = new Map<string, number>();
  for (const w of words) {
    const low = w.toLowerCase();
    if (STOP.has(low) || low.length < 4) continue;
    let s = low.length;
    if (/^[A-Z]/.test(w)) s += 6;
    scored.set(low, (scored.get(low) ?? 0) + s);
  }
  return [...scored.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}

export function titleTerms(terms: string[]): string[] {
  return terms.filter((t) => t.length <= 4 || !/(ed|ing|ly|ous|able|ible|ive)$/.test(t));
}

export function shortPremise(premise: string, len = 160): string {
  const p = premise.replace(/\s+/g, ' ').trim();
  if (p.length <= len) return p;
  const cut = p.slice(0, len);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)) + '…';
}
