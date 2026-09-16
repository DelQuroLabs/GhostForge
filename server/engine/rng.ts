// Seeded RNG — deterministic books per premise+seed, variation via seed.
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(r: Rng, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)] as T;
}

export function pickN<T>(r: Rng, arr: readonly T[], n: number): T[] {
  const c = [...arr];
  const out: T[] = [];
  while (out.length < n && c.length) {
    out.push(c.splice(Math.floor(r() * c.length), 1)[0] as T);
  }
  return out;
}

export function chance(r: Rng, p: number): boolean {
  return r() < p;
}

export function int(r: Rng, min: number, max: number): number {
  return min + Math.floor(r() * (max - min + 1));
}

export function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}
