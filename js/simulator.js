// Pure functions that generate fake attack events. Kept free of DOM code so they can be unit tested.

function weightedPick(items, key, rng = Math.random) {
  const total = items.reduce((sum, item) => sum + item[key], 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item[key];
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

// Fake source IPs come only from the RFC 5737 documentation ranges, so no real address is ever shown.
const DOC_RANGES = ["192.0.2", "198.51.100", "203.0.113"];

function fakeIp(rng = Math.random) {
  const range = DOC_RANGES[Math.floor(rng() * DOC_RANGES.length)];
  return `${range}.${1 + Math.floor(rng() * 254)}`;
}

function createAttack(types, locations, id, rng = Math.random) {
  const type = weightedPick(types, "weight", rng);
  const src = weightedPick(locations, "src", rng);
  let dst = weightedPick(locations, "dst", rng);
  // Attacks always cross a border. Give up after a few tries rather than looping forever.
  for (let i = 0; i < 20 && dst.country === src.country; i++) {
    dst = weightedPick(locations, "dst", rng);
  }
  return {
    id,
    type,
    src,
    dst,
    port: type.ports[Math.floor(rng() * type.ports.length)],
    ip: fakeIp(rng),
  };
}

// Returns the `limit` highest counts as [name, count] pairs, highest first.
function topEntries(counts, limit = 5) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

if (typeof module !== "undefined") module.exports = { weightedPick, fakeIp, createAttack, topEntries, DOC_RANGES };
