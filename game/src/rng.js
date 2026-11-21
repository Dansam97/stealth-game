// A tiny deterministic random generator (mulberry32) so level dressing
// and ambient details are identical on every run and every machine.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick a stable value from a list by index, wrapping around.
export function pickCyclic(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}
