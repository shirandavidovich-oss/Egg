// The egg in falls: which gag a landing gets (drawing only, never the numbers)
const A = require("../art/physics/egg-actor.js");
const assert = require("assert");
assert.strictEqual(A.severity(4, 10), "soft");
assert.strictEqual(A.severity(15.49, 10), "squash");          // W04-S02 start values: 12 m drop
assert.strictEqual(A.severity(18, 10), "squash");             // W04-S03 fountain: still not a crash
assert.strictEqual(A.severity(-32, 15), "crash");             // the extreme corner of the knobs
assert.strictEqual(A.severity(8, 14), "fold");                // heavy gravity folds, does not crash
assert.strictEqual(A.severity(25, 14), "crash");
assert.strictEqual(A.severityStop(12 / 2), "soft");
assert.strictEqual(A.severityStop(12 / 0.3), "squash");
assert.strictEqual(A.severityStop(12 / 0.1), "crash");        // 120 m/s² ≈ 12g into the cushion
// one impact per run, a new run resets it
let hits = []; const e = A.create({ onImpact: (s) => hits.push(s) }); const run1 = {}, run2 = {};
e.update(0, { runId: run1 }); e.update(10, { runId: run1, impact: true, vImpact: 30 }); e.update(20, { runId: run1, impact: true, vImpact: 30 });
assert.deepStrictEqual(hits, ["crash"]);
e.update(30, { runId: run2 }); e.update(40, { runId: run2, impact: true, vImpact: 2 });
assert.deepStrictEqual(hits, ["crash", "soft"]);
console.log("egg-actor: ok");
