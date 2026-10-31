// Run: node tests/profile.test.js   (coins are paid once per event; switching or trading a creature never touches coins or learning)
const store = {};
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
store["egg.creature"] = "p_mossy";                       // an old v1 save
const fresh = () => { delete require.cache[require.resolve("../art/physics/profile.js")]; return require("../art/physics/profile.js"); };
let P = fresh(), n = 0, fails = 0;
const ok = (name, c) => { n++; if (c) console.log("PASS", name); else { fails++; console.log("FAIL", name); } };

ok("migration keeps the old hatched creature", P.active() && P.active().species === "p_mossy");
ok("first reward pays", P.award("sub:springs.hooke", 10) === 10);
ok("the same event never pays twice", P.award("sub:springs.hooke", 10) === null && P.gold === 10);
P.completeSubtopic("springs.hooke"); P.recordAnswer("q.amplitude", "springs.shm", true);
const snapshot = JSON.stringify({ w: P.data.wallet, ph: P.data.physics });
P.devOwnAll(["p_sparkit", "p_tumble", "p_bloop"]);
for (let i = 0; i < 10; i++) { const o = P.owned(); P.setActive(o[i % o.length].instance_id); }
ok("switching the active creature 10 times changes no coins or progress", JSON.stringify({ w: P.data.wallet, ph: P.data.physics }) === snapshot);
const before = P.owned().length, gone = P.active().species;
P.tradeActive("p_aster");
ok("a trade swaps only the creature", P.active().species === "p_aster" && !P.owned().some((c) => c.species === gone) && P.owned().length === before && JSON.stringify({ w: P.data.wallet, ph: P.data.physics }) === snapshot);
P = fresh();
ok("everything survives closing and reopening", P.gold === 10 && P.data.physics.completed_subtopic_ids.includes("springs.hooke") && P.active().species === "p_aster");
ok("after reopening the old event still cannot pay again", P.award("sub:springs.hooke", 10) === null && P.gold === 10);
P.devNewEgg();
ok("a new egg keeps coins and learning", P.gold === 10 && P.data.physics.completed_subtopic_ids.length === 1 && P.active() === null);
console.log(`\n${n - fails}/${n} passed`);
process.exit(fails ? 1 : 0);
