// Run: node tests/explain.test.js   (calculator math, formula parsing, law and scientist data)
const X = require("../art/physics/explain.js");
const D = require("../art/physics/laws-data.js");
let n = 0, fails = 0;
const ok = (name, c) => { n++; if (c) console.log("PASS", name); else { fails++; console.log("FAIL", name); } };
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const calc = (s, env = {}) => X.evaluate(X.tokenize(s, /(ans|π|g)/), (k) => ({ π: Math.PI, g: 9.81, ...env })[k]);
const SYM_RE = /(s_eq|μs|μk|k1|k2|[A-Za-zθπω])/;

ok("order of operations", calc("2+3×4") === 14 && calc("(2+3)×4") === 20);
ok("minus and division", near(calc("10÷4-1"), 1.5) && calc("-3²") === -9 && calc("2^3") === 8);
ok("square root and square", calc("√(16)") === 4 && calc("3²") === 9 && calc("√(9)+1") === 4);
ok("trig in degrees", near(calc("sin(30)"), 0.5) && near(calc("cos(60)"), 0.5) && near(calc("tan(45)"), 1));
ok("pi, g and implicit multiplication", near(calc("2π"), 2 * Math.PI) && near(calc("2g"), 19.62));
ok("a missing ')' at the end is forgiven", calc("√(25") === 5 && calc("sin(90") === 1);
let bad = 0; for (const s of ["", "2+", "(", "1/0", "√(-4)", "3)"]) { try { calc(s); } catch (e) { bad++; } }
ok("broken input is an error, never a number", bad === 6);

const env = (k) => ({ k: 120, s: 0.03, m: 2, g: 9.81, π: Math.PI, θ: 30 })[k];
const f = (s) => { const t = X.tokenize(s, SYM_RE); const r = t.findIndex((q) => q.t === "rel"); return X.evaluate(t.slice(r + 1), env); };
ok("Hooke: F = −k·s", near(f("F = −k·s"), -3.6));
ok("energy: E = ½·k·s²", near(f("E = ½·k·s²"), 0.054));
ok("equilibrium: s_eq = m·g / k", near(f("s_eq = m·g / k"), 2 * 9.81 / 120));
ok("period: T = 2π·√(m/k)", near(f("T = 2π·√(m/k)"), 2 * Math.PI * Math.sqrt(2 / 120)));
ok("incline: F = m·g·sinθ", near(f("F = m·g·sinθ"), 2 * 9.81 * 0.5));
ok("subscripts stay with their letter", X.tokenize("F₁·d₁", /([A-Za-z])/).filter((t) => t.t === "sym").map((t) => t.k).join() === "F₁,d₁");
ok("number format", X.fmtNum(-3.6) === "−3.6" && X.fmtNum(0.0343) === "0.034" && X.fmtNum(120) === "120.0".replace(".0", "") && X.fmtNum(2.5) === "2.5");

const ids = Object.keys(D.scientists);
ok("every discovery names a known scientist", D.laws.every((l) => l.events.every((e) => ids.includes(e.sci))));
ok("every law has the story fields", D.laws.every((l) => l.name && l.short && l.formula && l.simple && l.need && l.how && l.yearText && l.aliases.length));
ok("every scientist has dates, role and a story", ids.every((i) => { const s = D.scientists[i]; return s.name && s.full && s.role && s.bio && s.fun && s.born < s.died; }));
ok("discoveries happen in the scientist's lifetime", D.laws.every((l) => l.events.every((e) => { const s = D.scientists[e.sci]; return e.year >= s.born + 10 && e.year <= s.died; })));
ok("law ids are unique", new Set(D.laws.map((l) => l.id)).size === D.laws.length);
const sx = X.timeScale([-250, 1600, 1800], 0, 500);
ok("timeline moves forward in time", sx(-250) < sx(1500) && sx(1500) < sx(1700) && sx(1700) < sx(1900));

console.log(`${n - fails}/${n} passed`);
if (fails) process.exit(1);
