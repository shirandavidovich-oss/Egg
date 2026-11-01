// Every world scene (84 mechanics + 84 electricity) finds its place in the living-worlds data,
// with a background and a companion that exist as art files. Decoration only.
const fs = require("fs"), path = require("path"), assert = require("assert");
const LL = require("../art/physics/life-layer.js"), LD = require("../art/physics/life-data.js");
const W = require("../art/physics/worlds-data.js"), E = require("../art/physics/elec-data.js");
const art = (n) => fs.existsSync(path.join(__dirname, "../app/src/main/assets/art/life", n + ".webp"));
let n = 0;
for (const sc of [...W.scenes, ...E.scenes]) {
  const I = LL.info(sc.id); assert(I, "no place for " + sc.id);
  assert(LL.FLOOR[I.bg] !== undefined && art("bg_" + I.bg), "background " + I.bg);
  assert(art(I.companion), "companion " + I.companion); n++;
}
assert.strictEqual(n, 168);
assert.strictEqual(LL.keyOf("EW03-S05"), "electricity:W03-S05");
assert.strictEqual(LL.keyOf("W03-S05"), "mechanics:W03-S05");
for (let i = 1; i <= 18; i++) { const p = LL.INCLINE_LOOK(i); assert(art("bg_" + p.bg) && art(p.companion)); }
for (const s of ["lab", "wall", "launch", "graph", "pair", "osc", "ramp"]) assert(art(LL.springPlace(s).companion));
console.log("life-layer: ok,", n, "scenes");
