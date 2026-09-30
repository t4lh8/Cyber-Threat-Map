const test = require("node:test");
const assert = require("node:assert");

const { ATTACK_TYPES, LOCATIONS } = require("../js/data.js");
const { weightedPick, fakeIp, createAttack, topEntries, DOC_RANGES } = require("../js/simulator.js");

// Small deterministic random generator so tests always behave the same.
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

test("weightedPick respects weights", () => {
  const items = [{ name: "rare", w: 1 }, { name: "common", w: 99 }];
  const rng = seeded(42);
  let common = 0;
  for (let i = 0; i < 1000; i++) if (weightedPick(items, "w", rng).name === "common") common++;
  assert.ok(common > 950, `expected ~990 common picks, got ${common}`);
});

test("weightedPick never picks zero-weight items", () => {
  const items = [{ name: "never", w: 0 }, { name: "always", w: 5 }];
  const rng = seeded(7);
  for (let i = 0; i < 200; i++) assert.strictEqual(weightedPick(items, "w", rng).name, "always");
});

test("fakeIp only uses RFC 5737 documentation ranges", () => {
  const rng = seeded(1);
  for (let i = 0; i < 500; i++) {
    const ip = fakeIp(rng);
    const prefix = ip.split(".").slice(0, 3).join(".");
    const last = Number(ip.split(".")[3]);
    assert.ok(DOC_RANGES.includes(prefix), `unexpected range in ${ip}`);
    assert.ok(last >= 1 && last <= 254, `unexpected host part in ${ip}`);
  }
});

test("createAttack crosses a border and uses a valid port", () => {
  const rng = seeded(123);
  for (let i = 0; i < 500; i++) {
    const attack = createAttack(ATTACK_TYPES, LOCATIONS, i, rng);
    assert.notStrictEqual(attack.src.country, attack.dst.country);
    assert.ok(attack.type.ports.includes(attack.port));
    assert.strictEqual(attack.id, i);
  }
});

test("topEntries sorts by count and limits results", () => {
  const top = topEntries({ a: 3, b: 10, c: 1, d: 7 }, 2);
  assert.deepStrictEqual(top, [["b", 10], ["d", 7]]);
});

test("every location has valid coordinates", () => {
  for (const loc of LOCATIONS) {
    assert.ok(loc.lat >= -90 && loc.lat <= 90, loc.city);
    assert.ok(loc.lon >= -180 && loc.lon <= 180, loc.city);
  }
});
