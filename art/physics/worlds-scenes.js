// ======================================================================
//  "עולמות המכניקה": what is checked in each of the 84 situations.
//  Content (titles, stories, objectives, start values) comes from the pack
//  (WORLDS_DATA). The pack's four missions per situation are templates; here
//  each one gets a real check:
//   M1 תחזית  – chosen and locked BEFORE the run, decided by the run
//   M2 ניסוי  – a goal of this situation, reached by changing values and running
//   M3 הסבר   – a reasoning question, open after at least one run
//   M4 העברה  – a new condition: compute, then the run with it confirms
//  Every right answer is computed at run time by WorldPhys. Pure logic, no DOM.
// ======================================================================
const WorldScenes = (() => {
  "use strict";
  const W = (typeof WorldPhys !== "undefined") ? WorldPhys : require("./worlds-engine.js");
  const D = (typeof WORLDS_DATA !== "undefined") ? WORLDS_DATA : require("./worlds-data.js");
  const { evaluate } = W;
  const rad = (d) => d * Math.PI / 180, sgn = (x, e = 1e-9) => (x > e ? 1 : x < -e ? -1 : 0);
  const f2 = (x, d = 2) => (Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x).toFixed(d);
  const inR = (x, lo, hi) => x !== null && x !== undefined && x >= lo - 1e-9 && x <= hi + 1e-9;

  // which existing physics topic each family feeds (the topic meters of the game)
  const TOPIC_OF = { units: "motion", vectors: "motion", uniform: "motion", meeting: "motion", acceleration: "motion", vertical: "projectiles", projectile: "projectiles",
    incline: "newton", pulley: "newton", spring: "springs", oscillator: "springs", energy: "energy", capstone: "energy", circle: "circular", bank: "circular", loop: "circular",
    impulse: "momentum", collision: "momentum", recoil: "momentum", gravity: "gravitation" };
  const ICON_OF_FAMILY = { units: "ruler", vectors: "arrows", uniform: "belt", meeting: "meet", acceleration: "brake", vertical: "drop", projectile: "arc", incline: "ramp", pulley: "pulley", spring: "spring",
    energy: "energy", circle: "carousel", bank: "bank", loop: "loop", impulse: "cushion", collision: "carts", recoil: "recoil", gravity: "orbit", oscillator: "wave", capstone: "slide" };

  // extra knobs some machines need to be playable (the pack's calculators have no speed for them)
  const EXTRA_KNOBS = {
    bank: { v: ["מהירות הרכב (מ׳/ש׳)", 1, 40, 0.5] },
    gravity: { vf: ["מהירות שיגור ÷ מהירות מסלול", 0.4, 1.6, 0.01] }
  };
  const EXTRA_DEFAULTS = { bank: { v: 12 }, gravity: { vf: 1 } };

  // ---------------- per-situation setup: start values, machine options, the M2 goal ----------------
  // goal kinds:  win(key, lo, hi, also)  one run whose result lies in a window
  //              cond(fn)                one run that satisfies fn(run)
  //              pair(keys, fn)          two runs that differ ONLY in these knobs, fn(a, b)
  const win = (key, lo, hi, also, text) => ({ kind: "one", text, check: (r) => inR(r.ev[key], lo, hi) && (!also || also(r)) });
  const cond = (fn, text) => ({ kind: "one", text, check: fn });
  const pair = (keys, fn, text) => ({ kind: "pair", keys, text, check: fn });
  const ev = (r, k) => r.ev[k];
  const has = (r, type) => r.events.includes(type);

  const SETUP = {
    // W01 סדנת המדידה
    "W01-S01": { start: { factor: 1 }, gap: 2.6, unitText: "אורך הגשר", unitSI: "m", goal: win("baseSI", 2.6 * 0.99, 2.6 * 1.01, null, "קרש באורך 2.6 m בדיוק (±1%)") },
    "W01-S02": { goal: cond((r) => Math.abs(((ev(r, "angle") - 135 + 540) % 360) - 180) <= 5 && ev(r, "magnitude") >= 2, "השקול מצביע אל שולחן העבודה: 135° (±5°), באורך 2 לפחות") },
    "W01-S03": { start: { factor: 1 }, gap: 0.43, unitText: "הזמן עד שהדלת נסגרת", unitSI: "s", goal: win("baseSI", 0.43 * 0.99, 0.43 * 1.01, null, "זמן של 0.43 s בדיוק (±1%)") },
    "W01-S04": { goal: cond((r) => ev(r, "x") < 0 && ev(r, "displacement") > 0, "מסיימים במיקום שלילי, אבל עם העתק חיובי") },
    "W01-S05": { goal: win("magnitude", 0, 0.3, null, "שקול כמעט אפס: |R| ≤ 0.3") },
    "W01-S06": { start: { factor: 1 }, gap: 0.48, unitText: "גובה הפלטפורמה", unitSI: "m", goal: win("baseSI", 0.48 * 0.99, 0.48 * 1.01, null, "גובה 0.48 m בדיוק (±1%)") },
    "W01-S07": { goal: cond((r) => Math.abs(ev(r, "Rx") - 1) <= 0.01 && Math.abs(ev(r, "Ry") + 1) <= 0.01, "שקול עם רכיבים Rx = 1, Ry = −1 בדיוק") },
    // W02 יער החצים
    "W02-S01": { goal: cond((r) => Math.abs(ev(r, "Ry")) <= 0.25 && ev(r, "Rx") >= 3, "העלה טס ישר: |Ry| ≤ 0.25 ו-Rx ≥ 3") },
    "W02-S02": { goal: cond((r) => Math.abs(ev(r, "Rx")) <= 0.25 && ev(r, "Ry") >= 4, "בלי סחף לצד (|Rx| ≤ 0.25) ועדיין עולה (Ry ≥ 4)") },
    "W02-S03": { goal: cond((r) => Math.abs(r.P.angle - 45) <= 0.5 && r.P.h === 0, "מהירות אופקית ואנכית שוות בהתחלה, מהקרקע") },
    "W02-S04": { goal: cond((r) => r.end.mode === "static" && Math.abs(r.P.F - r.P.m * r.P.g * Math.sin(rad(r.P.angle))) <= 0.6, "הגוף במנוחה עם חיכוך אפס: F שווה לרכיב המשקל במורד") },
    "W02-S05": { goal: pair(null, (a, b) => oneKnob(a, b) && Math.abs(ev(a, "magnitude") - ev(b, "magnitude")) > 0.5, "שתי הרצות שנבדלות ברכיב אחד בלבד, ושקול שונה") },
    "W02-S06": { goal: cond((r) => r.P.v < 0 && ev(r, "distance") >= 6, "מהירות שלילית שעוברת דרך של 6 m לפחות") },
    "W02-S07": { goal: win("magnitude", 0, 0.5, null, "|R| ≤ 0.5") },
    // W03 עיר הזמנים
    "W03-S01": { goal: cond((r) => inR(ev(r, "xMeeting"), 10, 14), "המפגש בתחנה: בין 10 ל-14 m") },
    "W03-S02": { target: 4, goal: cond((r) => Math.abs(ev(r, "x") - 4) <= 0.25, "היצור עוצר על הסמן: x = 4 m (±0.25)") },
    "W03-S03": { goal: cond((r) => r.P.v2 > 0 && r.P.v1 > r.P.v2 && inR(ev(r, "tMeeting"), 0, 6), "המהיר משיג את האיטי (שניהם קדימה) תוך 6 s") },
    "W03-S04": { goal: cond((r) => Math.abs(ev(r, "displacement") - 6) <= 0.1, "העתק של 6 m בדיוק") },
    "W03-S05": { goal: cond((r) => inR(ev(r, "xMeeting"), 14, 16), "נפגשים על הפס האדום: 14–16 m") },
    "W03-S06": { goal: cond((r) => r.P.v !== 0 && Math.abs(r.P.t - (-r.P.x0 / r.P.v)) <= 0.25 && has(r, "zero"), "קבע את t לרגע חציית האפס (±0.25 s)") },
    "W03-S07": { start: { v1: 3 }, goal: cond((r) => ev(r, "tMeeting") === null && r.P.v1 >= 1 && r.P.v2 > 0, "בלי מפגש, ושניהם עדיין נוסעים קדימה") },
    // W04 פארק התאוצה
    "W04-S01": { brake: true, goal: cond((r) => Math.abs(r.P.t - stopT(r.P)) <= 0.15 && r.end.v === 0, "קבע את t לזמן העצירה בדיוק (±0.15 s)") },
    "W04-S02": { goal: cond((r) => r.P.h > 0 && Math.abs(r.P.t - ev(r, "tLand")) <= 0.1, "קבע את t לרגע הנחיתה (±0.1 s)") },
    "W04-S03": { goal: cond((r) => r.P.v0 >= 10 && Math.abs(r.P.t - ev(r, "tPeak")) <= 0.1, "v₀ ≥ 10, ו-t ברגע השיא (±0.1 s)") },
    "W04-S04": { target: [18, 19], goal: win("range", 18, 19, null, "פגיעה בקשת: טווח 18–19 m") },
    "W04-S05": { goal: cond((r) => r.P.v0 < 0 && r.P.a < 0, "מהירות שלילית ותאוצה שלילית: מאיצה, לא מאטה") },
    "W04-S06": { goal: pair(["h"], (a, b) => a.P.angle === 0 && Math.max(a.P.h, b.P.h) >= 2 * Math.min(a.P.h, b.P.h) && Math.min(a.P.h, b.P.h) > 0, "שיגור אופקי משני גבהים (פי 2 לפחות), כל השאר זהה") },
    "W04-S07": { goal: cond((r) => Math.abs(r.P.angle - 45) <= 0.5 && r.P.h === 0, "הטווח המרבי בלי רוח: 45° מהקרקע") },
    // W05 מצוקי החיכוך (the full chapter is "הרפתקאות על המדרון")
    "W05-S01": { goal: cond((r) => r.moved && r.P.F === 0 && r.P.v0 === 0 && r.P.angle <= Math.atan(r.P.muS) * 180 / Math.PI + 1.5, "החלקה ראשונה: זווית עד 1.5° מעל הסף") },
    "W05-S02": { goal: cond((r) => r.P.v0 > 0 && has(r, "v_zero"), "שיגור במעלה עד עצירה: התאוצה במורד כל הזמן") },
    "W05-S03": { goal: pair(["muK", "muS"], (a, b) => a.moved && b.moved && Math.abs(a.P.muK - b.P.muK) >= 0.1, "שתי החלקות שנבדלות רק בחיכוך (הפרש μk ≥ 0.1)") },
    "W05-S04": { goal: cond((r) => r.moved && r.dir > 0 && r.P.mB <= upMin(r.P) + 0.5, "המסה הקטנה ביותר (עד 0.5 kg מעל הסף) שמעלה את הדמות") },
    "W05-S05": { goal: cond((r) => !r.moved && r.P.v0 === 0 && r.P.F >= Fmax(r.P) - 0.6, "כוח שעוד מחזיק, עד 0.6 N מתחת לסף") },
    "W05-S06": { goal: cond((r) => r.P.v0 < 0 && r.a0 > 0, "יורד (v < 0) ומאט: תאוצה חיובית") },
    "W05-S07": { goal: cond((r) => !r.moved && r.P.mB >= 1.5, "מערכת במנוחה עם חבל מתוח ושק של 1.5 kg לפחות") },
    // W06 מערת הקפיצים (the full spring lab is "קפיץ־קפוץ")
    "W06-S01": { goal: pair(["x"], (a, b) => sgn(a.P.x) * sgn(b.P.x) < 0, "שחרור פעם ממתיחה ופעם מדחיסה") },
    "W06-S02": { goal: cond((r) => Math.abs(ev(r, "F")) <= 15 && Math.abs(r.P.x) >= 0.3, "|F| ≤ 15 N גם במתיחה של 0.3 m לפחות") },
    "W06-S03": { goal: cond((r) => Math.abs(Math.abs(ev(r, "F")) - 12) <= 0.3 && Math.abs(r.P.x) >= 0.2, "כוח של 12 N בדיוק, במתיחה של 0.2 m לפחות") },
    "W06-S04": { goal: win("compression", 0.30, 0.33, null, "כיווץ של 30–33 cm") },
    "W06-S05": { goal: cond((r) => Math.abs(Math.abs(ev(r, "F")) - r.P.m * 10) <= 0.3, "kx שווה ל-mg (±0.3 N)") },
    "W06-S06": { goal: pair(["x"], (a, b) => Math.abs(Math.abs(b.P.x) - 2 * Math.abs(a.P.x)) <= 0.021 || Math.abs(Math.abs(a.P.x) - 2 * Math.abs(b.P.x)) <= 0.021, "שתי מתיחות, אחת כפולה מהשנייה") },
    "W06-S07": { goal: pair(["m"], (a, b) => Math.max(a.P.m, b.P.m) >= 4 * Math.min(a.P.m, b.P.m) - 1e-9, "מסה פי 4, אותו קפיץ") },
    // W07 בנק האנרגיה
    "W07-S01": { goal: cond((r) => r.P.mu === 0 && Math.abs(ev(r, "endV") - 8) <= 0.15, "בלי חיכוך: מהירות סופית 8 m/s בדיוק") },
    "W07-S02": { goal: cond((r) => inR(ev(r, "endV"), 0.01, 2), "עובר את הרצועה בקושי: מהירות סופית עד 2 m/s") },
    "W07-S03": { goal: cond((r) => r.P.v0 > 0 && Math.abs(ev(r, "v") - 2 * r.P.v0) <= 0.1, "מהירות סופית כפולה מההתחלתית") },
    "W07-S04": { goal: pair(["d"], (a, b) => (ev(a, "compression") - ev(b, "compression")) * (a.P.d - b.P.d) > 0, "מדרון ארוך יותר, כל השאר זהה") },
    "W07-S05": { goal: cond((r) => ev(r, "endV") === 0 && r.P.d - ev(r, "stopDistance") <= 0.5, "עוצר על הרצועה, ברצועה הקצרה ביותר (עד 0.5 m עודף)") },
    "W07-S06": { goal: cond((r) => ev(r, "endV") > 0 && inR(ev(r, "heat") / ev(r, "initialE"), 0.3, 0.6), "עובר, ובדרך 30%–60% מהאנרגיה הופכים לחום") },
    "W07-S07": { goal: cond((r) => Math.abs(ev(r, "E") / (0.5 * r.P.k * 0.09) - 4) <= 0.12 && r.P.k === 95, "אנרגיה פי 4 מזו של x = 0.3 m, באותו קפיץ") },
    // W08 קרקס המעגלים
    "W08-S01": { goal: cond((r) => !has(r, "slip") && r.P.v >= 0.9 * ev(r, "safeSpeed"), "מהירות של 90% לפחות מהסף, ועדיין על המעגל") },
    "W08-S02": { goal: cond((r) => !has(r, "slip") && r.P.v >= 0.95 * ev(r, "safeSpeed"), "95% לפחות מהמהירות המרבית, בלי להחליק") },
    "W08-S03": { goal: cond((r) => Math.abs(r.P.v / ev(r, "idealV") - 1) <= 0.03, "המהירות האידיאלית (±3%)") },
    "W08-S04": { goal: cond((r) => has(r, "full_loop") && r.P.vTop <= 1.1 * ev(r, "minV"), "הקפה שלמה עם vTop עד 10% מעל המינימום") },
    "W08-S05": { goal: pair(["v"], (a, b) => !has(a, "slip") && !has(b, "slip") && Math.abs(Math.max(a.P.v, b.P.v) / Math.min(a.P.v, b.P.v) - 2) <= 0.03, "מהירות כפולה, אותו רדיוס, שתיהן על המעגל") },
    "W08-S06": { start: { v: 12 }, goal: cond((r) => Math.abs(ev(r, "idealV") / r.P.v - 1) <= 0.03 && r.P.v === 12, "זווית שמתאימה ל-12 m/s (±3%)") },
    "W08-S07": { goal: pair(["r"], (a, b) => !has(a, "slip") && !has(b, "slip"), "אותה מהירות, שני רדיוסים, שתיהן על המעגל") },
    // W09 זירת ההתנגשויות
    "W09-S01": { goal: cond((r) => r.P.v0 === 8 && r.P.v1 === 0 && r.P.m === 1.5 && Math.abs(ev(r, "Favg")) <= 12, "אותו שינוי תנע, כוח ממוצע עד 12 N") },
    "W09-S02": { goal: pair(["e"], (a, b) => (a.P.e === 1 && b.P.e <= 0.5) || (b.P.e === 1 && a.P.e <= 0.5), "התנגשות אלסטית (e = 1) ואחת עם e ≤ 0.5") },
    "W09-S03": { goal: cond((r) => r.P.e === 0 && r.P.u1 !== r.P.u2, "התנגשות פלסטית: e = 0") },
    "W09-S04": { goal: cond((r) => Math.abs(Math.abs(ev(r, "v2") / r.P.v1) - 0.25) <= 0.01, "יחס מהירויות 1:4") },
    "W09-S05": { goal: cond((r) => sgn(r.P.v1) === -sgn(r.P.v0) && Math.abs(ev(r, "J")) >= 1.5 * Math.abs(r.P.m * r.P.v0), "קפיצה חזרה: |J| ≥ 1.5·m|v₀|") },
    "W09-S06": { goal: cond((r) => Math.abs(ev(r, "v1")) <= 0.15 && r.P.u1 > r.P.u2, "כוון e כך שהעגלה הראשונה נעצרת (|v₁| ≤ 0.15)") },
    "W09-S07": { goal: cond((r) => inR(Math.abs(ev(r, "v2")), 0.9, 1.1), "מהירות רתע 0.9–1.1 m/s") },
    // W10 פלנטריום הכבידה
    "W10-S01": { goal: pair(["r"], (a, b) => Math.abs(Math.max(a.P.r, b.P.r) / Math.min(a.P.r, b.P.r) - 2) <= 0.03, "שני מרחקים, אחד כפול מהשני") },
    "W10-S02": { goal: pair(["vf"], (a, b) => (has(a, "escape") && Math.abs(b.P.vf - 1) <= 0.01) || (has(b, "escape") && Math.abs(a.P.vf - 1) <= 0.01), "מסלול מעגלי (vf = 1) ובריחה") },
    "W10-S03": { goal: pair(["g"], (a, b) => Math.max(a.P.g, b.P.g) >= 2 * Math.min(a.P.g, b.P.g), "אותו שיגור, g שונה פי 2 לפחות") },
    "W10-S04": { goal: pair(["r"], (a, b) => Math.abs(a.P.r - b.P.r) >= 2e6, "רק המרחק משתנה (2000 km לפחות)") },
    "W10-S05": { goal: cond((r) => r.P.r >= 25e6 && Math.abs(r.P.vf - 1) <= 0.01 && !has(r, "crash") && !has(r, "escape"), "מסלול מעגלי רחוק (r ≥ 25,000 km)") },
    "W10-S06": { goal: pair(["m"], () => true, "שתי מסות, אותו מקום") },
    "W10-S07": { goal: cond((r) => has(r, "escape") && r.P.vf <= 1.5 && r.P.r >= 15e6, "בריחה מ-15,000 km ומעלה, עם vf ≤ 1.5") },
    // W11 גן התנודות (העשרה)
    "W11-S01": { goal: pair(["m"], (a, b) => Math.max(a.P.m, b.P.m) >= 2 * Math.min(a.P.m, b.P.m), "מסה כפולה לפחות, אותו קפיץ") },
    "W11-S02": { goal: pair(["A"], (a, b) => Math.max(a.P.A, b.P.A) >= 2 * Math.min(a.P.A, b.P.A), "משרעת כפולה לפחות, כל השאר זהה") },
    "W11-S03": { goal: cond((r) => Math.abs(ev(r, "x")) <= 0.05 * r.P.A, "קבע t לרגע שבו x ≈ 0 (המהירות מרבית)") },
    "W11-S04": { goal: pair(["k"], (a, b) => Math.max(a.P.k, b.P.k) >= 4 * Math.min(a.P.k, b.P.k) - 1e-9, "k פי 4, אותה מסה") },
    "W11-S05": { goal: cond((r) => r.P.m === 1.5 && r.P.A * r.P.k / r.P.m >= 2 * 0.45 * 100 / 1.5, "תאוצה מרבית כפולה, בלי לשנות מסה") },
    "W11-S06": { goal: pair(["t"], (a, b) => Math.abs(a.P.t - b.P.t) >= 0.5, "רק t משתנה") },
    "W11-S07": { goal: pair(["phase"], (a, b) => Math.abs(a.P.phase - b.P.phase) >= 1, "רק הפאזה משתנה") },
    // W12 מגדל הניסויים
    "W12-S01": { brake: true, goal: cond((r) => inR(r.P.v0 * r.P.v0 / (2 * Math.abs(r.P.a)), 10, 12) && r.P.a < 0 && r.P.v0 > 0 && r.end.v === 0, "נעצר בין 10 ל-12 m") },
    "W12-S02": { goal: win("compression", 0.40, 0.45, null, "כיווץ של 40–45 cm") },
    "W12-S03": { goal: pair(["e"], (a, b) => Math.abs(a.P.e - b.P.e) >= 0.3, "אותם גופים, שני סוגי התנגשות (הפרש e ≥ 0.3)") },
    "W12-S04": { goal: cond((r) => r.moved && inR(Math.abs(r.a0), 0.5, 1.5), "תנועה עם תאוצה של 0.5–1.5 m/s²") },
    "W12-S05": { goal: cond((r) => !has(r, "slip") && r.P.v * r.P.v / r.P.r >= 0.9 * r.P.mu * 10, "v²/r בין 90% ל-100% מ-μg") },
    "W12-S06": { goal: win("range", 25, 26, (r) => r.P.h === 4, "מגובה 4 m: פגיעה ב-25–26 m") },
    "W12-S07": { goal: cond((r) => inR(ev(r, "maxY"), 20, 22), "גובה שיא 20–22 m") }
  };
  function oneKnob(a, b) { return Object.keys(a.P).filter((k) => a.P[k] !== b.P[k]).length === 1; }
  const stopT = (P) => (P.v0 * P.a < 0 ? -P.v0 / P.a : Infinity);
  const upMin = (P) => P.mA * Math.sin(rad(P.angle)) + P.muS * P.mA * Math.cos(rad(P.angle));            // kg of B for A to start up
  const Fmax = (P) => P.m * P.g * (Math.sin(rad(P.angle)) + P.muS * Math.cos(rad(P.angle)));

  // ---------------- family templates: prediction, explanation, transfer ----------------
  const pct = (x) => Math.round(x * 100) + "%";
  const FAM = {
    units: {
      pred: (P, s) => ({ q: `קריאה של ${P.value} כשכל יחידה = ${P.factor} m. ${s.setup.unitText} יצא…`, opts: ["קצר מהנדרש", "בדיוק", "ארוך מהנדרש"],
        truth: (r) => { const L = r.ev.baseSI, g = s.setup.gap; return Math.abs(L - g) <= 0.01 * g ? 1 : L < g ? 0 : 2; } }),
      why: { q: "למה צריך לכפול את הקריאה במקדם היחידה?", opts: ["כי המספר לבד לא אומר כמה: הוא תלוי ביחידה", "כי כך המספר גדל", "כי SI תמיד במילימטרים"], right: 0 },
      xfer: (P) => ({ text: "אותו אורך נמדד עכשיו בסרגל שבו כל יחידה = 0.1 (דצימטרים). מה הקריאה?", change: { value: evaluate("units", P).baseSI / 0.1, factor: 0.1 }, field: { he: "קריאה", unit: "", value: (Q) => Q.value } })
    },
    vectors: {
      pred: () => ({ q: "לאיזה רביע יצביע השקול?", opts: ["ימינה ולמעלה", "שמאלה ולמעלה", "שמאלה ולמטה", "ימינה ולמטה"],
        truth: (r) => { const x = r.ev.Rx, y = r.ev.Ry; return x >= 0 && y >= 0 ? 0 : x < 0 && y >= 0 ? 1 : x < 0 ? 2 : 3; } }),
      why: { q: "איך מקבלים את השקול?", opts: ["מחברים את הרכיבים: Rx = Ax + Bx ו-Ry = Ay + By", "מחברים את האורכים |A| + |B|", "לוקחים את הארוך מבין השניים"], right: 0 },
      xfer: (P) => { const k = Math.max(Math.abs(P.bx), Math.abs(P.by)) * 2 <= 10 ? 2 : 0.5; return { text: `מכפילים את B ב-${k === 2 ? "2" : "½"} (שני הרכיבים). מה גודל השקול?`, change: { bx: k * P.bx, by: k * P.by }, field: { he: "|R|", unit: "", value: (Q) => evaluate("vectors", Q).magnitude } }; }
    },
    uniform: {
      pred: () => ({ q: "בסוף הזמן, איפה היצור?", opts: ["מימין לאפס (x > 0)", "משמאל לאפס (x < 0)", "בדיוק באפס"], truth: (r) => (Math.abs(r.ev.x) < 1e-9 ? 2 : r.ev.x > 0 ? 0 : 1) }),
      why: { q: "מה ההבדל בין העתק לדרך?", opts: ["העתק הוא x סופי פחות x התחלתי ויש לו סימן; דרך היא כמה הלכת, תמיד חיובית", "אין הבדל", "דרך יכולה להיות שלילית"], right: 0 },
      xfer: (P) => ({ text: "אותה התחלה ואותו זמן, אבל המהירות בכיוון ההפוך. מה המיקום הסופי?", change: { v: -P.v }, field: { he: "x", unit: "m", value: (Q) => evaluate("uniform", Q).x } })
    },
    meeting: {
      pred: (P) => ({ q: `ייפגשו? (אמצע הדרך: x = ${f2((P.x1 + P.x2) / 2, 1)} m)`, opts: ["כן, לפני האמצע", "כן, אחרי האמצע", "לא ייפגשו"],
        truth: (r) => (r.ev.tMeeting === null ? 2 : r.ev.xMeeting < (r.P.x1 + r.P.x2) / 2 ? 0 : 1) }),
      why: { q: "מה קובע את זמן המפגש?", opts: ["המרחק ההתחלתי חלקי מהירות ההתקרבות (v₁ − v₂)", "רק המהירות של המהיר", "סכום המיקומים"], right: 0 },
      xfer: (P) => { const v1 = Math.max(P.v1, P.v2) + 2; return { text: `הראשון יוצא עכשיו במהירות ${f2(v1, 1)} m/s. מתי ייפגשו?`, change: { v1 }, field: { he: "t מפגש", unit: "s", value: (Q) => evaluate("meeting", Q).tMeeting } }; }
    },
    acceleration: {
      pred: (P, s) => ({ q: s.setup.brake ? "בסוף הזמן הנבחר, הקרונית…" : "בסוף הזמן, גודל המהירות לעומת ההתחלה…", opts: s.setup.brake ? ["עדיין נוסעת", "עומדת"] : ["גדול יותר", "קטן יותר"],
        truth: (r) => (s.setup.brake ? (r.end.v === 0 ? 1 : 0) : (Math.abs(r.end.v) > Math.abs(r.P.v0) ? 0 : 1)) }),
      why: { q: "תאוצה שלילית תמיד מאטה?", opts: ["לא: היא מאטה רק כשהמהירות חיובית. עם מהירות שלילית היא מאיצה", "כן, תמיד", "רק אם a גדולה"], right: 0 },
      xfer: (P, s) => ({ text: "אותה התחלה, חצי מהזמן. מה ההעתק?", change: { t: P.t / 2 }, field: { he: "Δx", unit: "m", value: (Q) => accDx(Q, s.setup.brake) } })
    },
    vertical: {
      pred: (P) => ({ q: `ברגע t = ${f2(P.t, 2)} s הגוף…`, opts: ["עולה", "יורד", "כבר נחת"], truth: (r) => { const e = evaluate("vertical", r.P); return e.status === "נחת" ? 2 : e.v > 0 ? 0 : 1; } }),
      why: { q: "בשיא הגובה…", opts: ["v = 0 אבל התאוצה עדיין g כלפי מטה", "גם v וגם a שווים לאפס", "התאוצה מתהפכת למעלה"], right: 0 },
      xfer: (P) => ({ text: "אותו שיגור על כוכב שבו g קטן פי 2. מה גובה השיא?", change: { g: P.g / 2 }, field: { he: "גובה שיא", unit: "m", value: (Q) => evaluate("vertical", Q).maxY } })
    },
    projectile: {
      pred: (P) => ({ q: "לעומת אותו שיגור ב-45°, הטווח כאן…", opts: ["ארוך יותר", "קצר יותר", "בערך אותו דבר"],
        truth: (r) => { const a = r.ev.range, b = evaluate("projectile", { ...r.P, angle: 45 }).range; return Math.abs(a - b) <= 0.01 * b ? 2 : a > b ? 0 : 1; } }),
      why: { q: "בלי גרר, מה קורה למהירות האופקית במעוף?", opts: ["קבועה: אין כוח אופקי", "קטנה כל הזמן", "גדלה כשהגוף נופל"], right: 0 },
      xfer: (P) => ({ text: "מעלים את המשגר ב-5 m, כל השאר זהה. מה זמן המעוף?", change: { h: P.h + 5 }, field: { he: "זמן מעוף", unit: "s", value: (Q) => evaluate("projectile", Q).tLand } })
    },
    incline: {
      pred: (P) => (P.v0 === 0 ? { q: "אחרי השחרור הגוף…", opts: ["עולה", "יורד", "נשאר במקום"], truth: (r) => (!r.moved ? 2 : r.dir > 0 ? 0 : 1) }
        : { q: "אחרי שהוא ייעצר רגע…", opts: ["יישאר במקום", "יחליק חזרה", "לא ייעצר על המדרון"], truth: (r) => (!has(r, "v_zero") ? 2 : r.end.mode === "static" ? 0 : 1) }),
      why: { q: "לאן מצביע חיכוך קינטי?", opts: ["נגד כיוון המהירות, גם אם התאוצה בכיוון אחר", "נגד כיוון התאוצה", "תמיד במעלה המדרון"], right: 0 },
      xfer: (P) => ({ text: P.m * 2 <= 10 ? "אותו מדרון, מסה כפולה (הכוח F לא משתנה). מה התאוצה ברגע השחרור? (+ = במעלה)" : "אותו מדרון, חצי מסה (הכוח F לא משתנה). מה התאוצה ברגע השחרור? (+ = במעלה)", change: { m: P.m * 2 <= 10 ? P.m * 2 : P.m / 2 }, field: { he: "a", unit: "m/s²", value: (Q) => evaluate("incline", Q).a } })
    },
    pulley: {
      pred: () => ({ q: "אחרי השחרור הדמות…", opts: ["עולה", "יורדת", "נשארת במנוחה"], truth: (r) => (!r.moved ? 2 : r.dir > 0 ? 0 : 1) }),
      why: { q: "כשהשק יורד ומאיץ, המתיחות בחבל…", opts: ["קטנה מ-mB·g", "שווה ל-mB·g", "גדולה מ-mB·g"], right: 0 },
      xfer: (P) => ({ text: "מוסיפים לשק 1 kg. מה התאוצה? (+ = הדמות עולה, 0 אם במנוחה)", change: { mB: P.mB + 1 }, field: { he: "a", unit: "m/s²", value: (Q) => evaluate("pulley", Q).a || 0 } })
    },
    spring: {
      pred: () => ({ q: "ברגע השחרור, כוח הקפיץ על הגוף מצביע…", opts: ["ימינה (+)", "שמאלה (−)", "אין כוח"], truth: (r) => (Math.abs(r.ev.F) < 1e-9 ? 2 : r.ev.F > 0 ? 0 : 1) }),
      why: { q: "מותחים פי 2. מה קורה?", opts: ["הכוח פי 2 והאנרגיה פי 4", "שניהם פי 2", "שניהם פי 4"], right: 0 },
      xfer: (P) => { const k = P.k * 2 <= 250 ? 2 : 0.5; return { text: `קפיץ ${k === 2 ? "קשיח פי 2" : "רך פי 2"}, אותה מתיחה. מה הכוח? (+ = ימינה)`, change: { k: P.k * k }, field: { he: "F", unit: "N", value: (Q) => evaluate("spring", Q).F } }; }
    },
    energy: {
      pred: () => ({ q: "הגוף יעבור את כל הרצועה המחוספסת?", opts: ["כן", "לא, ייעצר עליה"], truth: (r) => (r.ev.endV > 0 ? 0 : 1) }),
      why: { q: "כמה אנרגיה החיכוך לוקח על הרצועה?", opts: ["μ·m·g·d, ולא יותר ממה שיש לגוף", "תמיד את כל האנרגיה", "תלוי רק בגובה"], right: 0 },
      xfer: (P) => ({ text: "מחליקים את הרצועה: μ קטן פי 2. מה המהירות בסופה?", change: { mu: P.mu / 2 }, field: { he: "v בסוף", unit: "m/s", value: (Q) => evaluate("energy", Q).endV } })
    },
    circle: {
      pred: () => ({ q: "במהירות הזו הגוף…", opts: ["נשאר על המעגל", "מחליק החוצה"], truth: (r) => (has(r, "slip") ? 1 : 0) }),
      why: { q: "מה מחזיק את הגוף על המעגל במשטח אופקי?", opts: ["החיכוך הסטטי, שפונה למרכז", "כוח צנטריפוגלי החוצה", "הנורמל"], right: 0 },
      xfer: (P) => ({ text: P.r * 2 <= 9 ? "אותה מהירות, רדיוס כפול. מה הכוח הדרוש למרכז?" : "אותה מהירות, חצי רדיוס. מה הכוח הדרוש למרכז?", change: { r: P.r * 2 <= 9 ? P.r * 2 : P.r / 2 }, field: { he: "F למרכז", unit: "N", value: (Q) => evaluate("circle", Q).Fc } })
    },
    bank: {
      pred: () => ({ q: "בלי חיכוך, הרכב במהירות הזו…", opts: ["נשאר באותו גובה", "נסחף כלפי מעלה בעיקול", "מחליק כלפי מטה"], truth: (r) => (Math.abs(r.P.v / r.ev.idealV - 1) <= 0.03 ? 0 : r.P.v > r.ev.idealV ? 1 : 2) }),
      why: { q: "מה מספק את הכוח למרכז בעיקול מוטה בלי חיכוך?", opts: ["הרכיב האופקי של הנורמל", "המשקל", "המנוע"], right: 0 },
      xfer: (P) => { const a = Math.min(55, P.angle + 10); return { text: `מגדילים את ההטיה ל-${a}°. מה המהירות האידיאלית?`, change: { angle: a }, field: { he: "v אידיאלית", unit: "m/s", value: (Q) => evaluate("bank", Q).idealV } }; }
    },
    loop: {
      pred: () => ({ q: "הכדור יקיף את כל הלולאה?", opts: ["כן", "לא, ינתק לפני הפסגה"], truth: (r) => (has(r, "full_loop") ? 0 : 1) }),
      why: { q: "בפסגה, מה התנאי לשמירה על מגע?", opts: ["mv²/r ≥ mg, כי N לא יכול להיות שלילי", "v > 0 מספיק", "N = mg"], right: 0 },
      xfer: (P) => ({ text: "לולאה ברדיוס כפול. מה המהירות המינימלית בפסגה?", change: { r: P.r * 2 }, field: { he: "v מינימלי", unit: "m/s", value: (Q) => evaluate("loop", Q).minV } })
    },
    impulse: {
      pred: () => ({ q: "הכוח הממוצע של הכרית מצביע…", opts: ["בכיוון התנועה ההתחלתית", "נגד התנועה ההתחלתית", "אין כוח"], truth: (r) => (Math.abs(r.ev.Favg) < 1e-9 ? 2 : sgn(r.ev.Favg) === sgn(r.P.v0) ? 0 : 1) }),
      why: { q: "כרית רכה מאריכה את זמן המגע. אז…", opts: ["אותו שינוי תנע, כוח ממוצע קטן יותר", "שינוי תנע קטן יותר", "כוח גדול יותר"], right: 0 },
      xfer: (P) => ({ text: "זמן מגע כפול, אותן מהירויות. מה הכוח הממוצע?", change: { dt: P.dt * 2 }, field: { he: "F ממוצע", unit: "N", value: (Q) => evaluate("impulse", Q).Favg } })
    },
    collision: {
      pred: () => ({ q: "אחרי ההתנגשות העגלה הראשונה…", opts: ["ממשיכה קדימה", "נעצרת", "חוזרת אחורה"], truth: (r) => (Math.abs(r.ev.v1) <= 0.05 ? 1 : r.ev.v1 > 0 ? 0 : 2) }),
      why: { q: "מה נשמר תמיד בהתנגשות בין שתי העגלות?", opts: ["התנע הכולל. האנרגיה הקינטית רק אם e = 1", "האנרגיה הקינטית תמיד", "המהירות של כל עגלה"], right: 0 },
      xfer: (P) => { const e = P.e < 1 ? 1 : 0; return { text: `אותן עגלות, עכשיו e = ${e}. מה מהירות העגלה השנייה אחרי?`, change: { e }, field: { he: "v₂", unit: "m/s", value: (Q) => evaluate("collision", Q).v2 } }; }
    },
    recoil: {
      pred: (P) => ({ q: "אחרי הדחיפה, מי מהיר יותר?", opts: ["הקלה", "הכבדה", "שתיהן באותה מהירות"], truth: (r) => (r.P.m1 === r.P.m2 ? 2 : (r.P.m1 < r.P.m2) ? 0 : 1) }),
      why: { q: "למה התנע הכולל נשאר אפס?", opts: ["התחילו במנוחה ואין כוח חיצוני אופקי", "כי המהירויות שוות", "כי הדחיפה קצרה"], right: 0 },
      xfer: (P) => { const k = P.m2 * 2 <= 8 ? 2 : 0.5; return { text: `המסה השנייה ${k === 2 ? "כפולה" : "חצי"}. מה המהירות שלה?`, change: { m2: P.m2 * k }, field: { he: "v₂", unit: "m/s", value: (Q) => evaluate("recoil", Q).v2 } }; }
    },
    gravity: {
      pred: (P) => ({ q: `שיגור במהירות ${f2(P.vf, 2)} × v מסלול: הלוויין…`, opts: ["מקיף במעגל", "מקיף באליפסה", "נופל לכוכב", "בורח"],
        truth: (r) => (has(r, "crash") ? 2 : has(r, "escape") ? 3 : Math.abs(r.P.vf - 1) <= 0.01 ? 0 : 1) }),
      why: { q: "במרחק כפול ממרכז הכוכב, g…", opts: ["קטן פי 4", "קטן פי 2", "לא משתנה"], right: 0 },
      xfer: (P) => { const k = P.r * 2 <= 32e6 ? 2 : 0.5; return { text: `מרחק ${k === 2 ? "כפול" : "חצי"} ממרכז הכוכב. מה g שם?`, change: { r: P.r * k }, field: { he: "g", unit: "m/s²", value: (Q) => evaluate("gravity", Q).g } }; }
    },
    oscillator: {
      pred: (P) => ({ q: `ברגע t = ${f2(P.t, 1)} s, המיקום x…`, opts: ["חיובי", "שלילי", "בערך 0"], truth: (r) => { const x = evaluate("oscillator", r.P).x; return Math.abs(x) <= 0.05 * r.P.A ? 2 : x > 0 ? 0 : 1; } }),
      why: { q: "מה קובע את זמן המחזור?", opts: ["רק m ו-k: T = 2π√(m/k)", "גם המשרעת", "רק הפאזה"], right: 0 },
      xfer: (P) => { const k = P.m * 4 <= 8 ? 4 : 0.25; return { text: `מסה ${k === 4 ? "פי 4" : "רבע"}, אותו קפיץ. מה זמן המחזור?`, change: { m: P.m * k }, field: { he: "T", unit: "s", value: (Q) => evaluate("oscillator", Q).period } }; }
    },
    capstone: {
      pred: () => ({ q: "הגוף יגיע לקפיץ בתחתית?", opts: ["כן", "לא, ייעצר על המדרון"], truth: (r) => (has(r, "contact") ? 0 : 1) }),
      why: { q: "איזו אנרגיה הקפיץ מקבל?", opts: ["מה שנשאר בתחתית: אנרגיית גובה ותנועה פחות החום במדרון", "כל אנרגיית הגובה", "רק האנרגיה הקינטית ההתחלתית"], right: 0 },
      xfer: (P) => ({ text: "מאריכים את המדרון ב-2 m. מה הכיווץ המרבי?", change: { d: P.d + 2 }, field: { he: "כיווץ", unit: "m", value: (Q) => evaluate("capstone", Q).compression } })
    }
  };
  function accDx(P, brake) { const tS = stopT(P); if (brake && P.t > tS) return P.v0 * tS + 0.5 * P.a * tS * tS; return P.v0 * P.t + 0.5 * P.a * P.t * P.t; }
  // a few situations ask a sharper reasoning question than their family's
  const WHY = {
    "W01-S04": { q: "מיקום סופי שלילי אומר שההעתק שלילי?", opts: ["לא: ההעתק תלוי בשינוי, לא במיקום הסופי", "כן, תמיד", "רק אם המהירות שלילית"], right: 0 },
    "W03-S07": { q: "מתי לא יהיה מפגש עתידי?", opts: ["כשהאחורי לא מהיר מהקדמי (v₁ ≤ v₂ כשהוא מאחור)", "כשהמרחק גדול", "אף פעם"], right: 0 },
    "W04-S01": { q: "למה אסור להמשיך את v = v₀ + at אחרי העצירה?", opts: ["בלם לא דוחף אחורה: אחרי v = 0 החיכוך הסטטי מחזיק", "כי הזמן נגמר", "כי a הופכת לחיובית"], right: 0 },
    "W04-S07": { q: "מה המודל לא יודע?", opts: ["אין בו גרר או רוח: צריך להוסיף כוח אופקי שתלוי במהירות", "אין בו כובד", "הוא לא יודע זוויות"], right: 0 },
    "W06-S05": { q: "בשיווי משקל של משקולת תלויה…", opts: ["kx = mg, ולכן x = mg/k", "kx = 0", "x = k/mg"], right: 0 },
    "W07-S03": { q: "המהירות פי 2. האנרגיה הקינטית…", opts: ["פי 4", "פי 2", "לא משתנה"], right: 0 },
    "W08-S05": { q: "מהירות כפולה באותו מעגל: זמן המחזור…", opts: ["חצי", "כפול", "לא משתנה"], right: 0 },
    "W09-S02": { q: "בהתנגשות עם e = 1…", opts: ["גם התנע וגם האנרגיה הקינטית נשמרים", "רק האנרגיה נשמרת", "שום דבר לא נשמר"], right: 0 },
    "W10-S06": { q: "מה משתנה כשמחליפים מסה של הגוף?", opts: ["המשקל F = mg משתנה, g לא", "g משתנה", "שום דבר"], right: 0 },
    "W11-S02": { q: "משרעת גדולה יותר: זמן המחזור…", opts: ["לא משתנה; המהירות המרבית גדלה", "גדל", "קטן"], right: 0 },
    "W11-S06": { q: "מה נשאר קבוע כשמשנים רק את t?", opts: ["האנרגיה הכוללת ½kA² וזמן המחזור", "x", "v"], right: 0 }
  };

  // ---------------- the 84 situations ----------------
  const SCENES = D.scenes.map((sc) => {
    const setup = SETUP[sc.id] || {};
    const model = D.models[sc.family];
    const knobs = { ...model.knobs, ...(EXTRA_KNOBS[sc.family] || {}) };
    const start = { ...sc.params, ...(EXTRA_DEFAULTS[sc.family] || {}), ...(setup.start || {}) };
    const s = { ...sc, setup, knobs, start, topic: TOPIC_OF[sc.family], icon: ICON_OF_FAMILY[sc.family], readouts: model.readouts, label: model.label };
    const pr = (P) => FAM[sc.family].pred(P, s);
    s.missions = [
      { id: sc.id + "-M1", kind: "predict", type: "predict", text: "תחזית לפני הניסוי", pred: pr, weight: 0.1, coins: 3 },
      { id: sc.id + "-M2", kind: "goal", type: "manipulate", text: sc.objective, goal: setup.goal, weight: 0.35, coins: 5 },
      { id: sc.id + "-M3", kind: "choice", type: "explain", text: "הסבר", ...(WHY[sc.id] || FAM[sc.family].why), weight: 0.25, coins: 5 },
      { id: sc.id + "-M4", kind: "transfer", type: "transfer", text: "העברה: תנאי חדש", xfer: (P) => FAM[sc.family].xfer(P, s), weight: 0.3, coins: 5 }
    ];
    return s;
  });
  const ALL = SCENES.flatMap((s) => s.missions);
  const byId = (id) => SCENES.find((s) => s.id === id);

  // ======================================================================
  //  a lab: one situation's live state (shared by the screen and the tests)
  // ======================================================================
  function newLab(scene, saved = {}) {
    return { scene, P: { ...scene.start, ...(saved.P || {}) }, runs: [], cur: null, sim: null, nextId: 0, pred: {}, since: {}, xfer: {}, running: false };
  }
  const simOpts = (sc, P) => ({ brake: !!sc.setup.brake, gap: sc.setup.gap, v: P.v, vf: P.vf });
  function evalP(sc, P) { try { return evaluate(sc.family, P); } catch (e) { return { invalid: e.message }; } }
  function clampP(sc, P) {
    for (const k in sc.knobs) { const [, lo, hi] = sc.knobs[k]; if (typeof P[k] === "number") P[k] = Math.min(hi, Math.max(lo, P[k])); }
    if (P.muK !== undefined && P.muS !== undefined && P.muK > P.muS) P.muK = P.muS;
    if (sc.family === "bank" && P.angle <= 0) P.angle = 1;
    return P;
  }
  function idle(L) { finishRun(L); L.sim = null; L.running = false; }
  function startRun(L) {
    finishRun(L);
    const sc = L.scene, P = { ...L.P }, e = evalP(sc, P);
    if (e.invalid) return null;
    L.sim = W.makeSim(sc.family, P, simOpts(sc, P));
    L.cur = { id: ++L.nextId, P, ev: e, events: [], end: {}, moved: false, dir: 0, a0: null, changed: changedCount(sc, P) };
    L.running = true;
    return L.cur;
  }
  function stepRun(L, dt) {
    if (!L.running || !L.sim) return;
    L.sim.step(dt);
    const r = L.cur, s = L.sim;
    for (const e of s.events.slice(r.events.length)) r.events.push(e.type);
    r.end = { ...s.st };
    if (s.tr) { const R = s.tr.resolve(); if (r.a0 === null && R.mode === "kinetic") r.a0 = R.a; if (!r.moved && Math.abs(s.tr.s - (s.tr.def.s0 || 0)) > 1e-4) { r.moved = true; r.dir = Math.sign(s.tr.s - (s.tr.def.s0 || 0)); } }
    if (s.done) { finishRun(L); L.running = false; }
  }
  function finishRun(L) { if (!L.cur) return; L.cur.done = true; L.runs.push(L.cur); if (L.runs.length > 40) L.runs.shift(); L.cur = null; }
  const runsOf = (L) => (L.cur ? L.runs.concat([L.cur]) : L.runs);
  function setParam(L, k, v) { L.P[k] = v; clampP(L.scene, L.P); idle(L); }
  function changedCount(sc, P) { return Object.keys(sc.knobs).filter((k) => Math.abs((P[k] || 0) - (sc.start[k] || 0)) > 1e-9).length; }
  // the run must come from the player's own change (a goal that keeps other values fixed may need only one)
  const needChanges = () => 1;
  function activate(L, m) { if (L.since[m.id] === undefined) L.since[m.id] = L.nextId + 1; }
  const since = (L, m) => runsOf(L).filter((r) => r.done && r.id >= (L.since[m.id] || 1));

  // M2: the situation's goal
  function goalReached(L, m) {
    const g = m.goal, rs = since(L, m);
    if (!g) return false;
    if (g.kind === "one") return rs.some((r) => r.changed >= needChanges(L.scene) && g.check(r));
    const only = (a, b) => { const diff = Object.keys(L.scene.knobs).filter((k) => Math.abs((a.P[k] || 0) - (b.P[k] || 0)) > 1e-9); return g.keys ? diff.length > 0 && diff.every((k) => g.keys.includes(k)) : diff.length === 1; };
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (only(rs[i], rs[j]) && g.check(rs[i], rs[j])) return true;
    return false;
  }
  // M1: the question is asked about the values on screen; the run with those values decides
  function predQuestion(L, m) { return m.pred(L.P); }
  function lockPrediction(L, m, pick) { L.pred[m.id] = { pick, P: { ...L.P }, at: L.nextId + 1, q: m.pred(L.P) }; }
  function predictionResult(L, m) {
    const pr = L.pred[m.id]; if (!pr) return null;
    const r = runsOf(L).find((x) => x.done && x.id >= pr.at && Object.keys(L.scene.knobs).every((k) => Math.abs((x.P[k] || 0) - (pr.P[k] || 0)) < 1e-9));
    if (!r) return { ready: false, changed: Object.keys(L.scene.knobs).some((k) => Math.abs((L.P[k] || 0) - (pr.P[k] || 0)) > 1e-9) };
    const t = pr.q.truth(r);
    return { ready: true, ok: t === pr.pick, truth: t };
  }
  // M3: open after at least one run
  const explainOpen = (L) => runsOf(L).some((r) => r.done);
  // M4: compute for the new condition, then the run with it confirms
  function transferTask(L, m) { const x = m.xfer(L.P); const Q = clampP(L.scene, { ...L.P, ...x.change }); return { text: x.text, field: x.field, Q, truth: x.field.value(Q) }; }
  function checkTransfer(L, m, value, task) {
    const t = task.truth, tol = Math.max(0.02, 0.02 * Math.abs(t));
    return { ok: Number.isFinite(value) && Number.isFinite(t) && Math.abs(value - t) <= tol, truth: t };
  }
  function armTransfer(L, m, task) { L.xfer[m.id] = { Q: task.Q, at: L.nextId + 1 }; L.P = { ...task.Q }; idle(L); }
  function transferConfirmed(L, m) {
    const x = L.xfer[m.id]; if (!x) return false;
    return runsOf(L).some((r) => r.done && r.id >= x.at && Object.keys(L.scene.knobs).every((k) => Math.abs((r.P[k] || 0) - (x.Q[k] || 0)) < 1e-9));
  }

  // ---------------- progress: evidence per topic, weighted by mission type ----------------
  // a situation's four missions weigh 0.1 / 0.35 / 0.25 / 0.3: one lucky prediction is never mastery
  function topicEvidence(done) {
    const out = {};
    for (const sc of SCENES) {
      const o = out[sc.topic] || (out[sc.topic] = { have: 0, total: 0 });
      for (const m of sc.missions) { o.total += m.weight; if (done.includes(m.id)) o.have += m.weight; }
    }
    for (const k in out) out[k].frac = out[k].have / out[k].total;
    return out;
  }
  const worldDone = (w, done) => { const ids = SCENES.filter((s) => s.w === w).flatMap((s) => s.missions.map((m) => m.id)); return ids.filter((id) => done.includes(id)).length / ids.length; };

  return { DATA: D, SCENES, ALL, byId, TOPIC_OF, newLab, startRun, stepRun, finishRun, idle, setParam, clampP, evalP, runsOf, activate, goalReached, predQuestion, lockPrediction, predictionResult,
    explainOpen, transferTask, checkTransfer, armTransfer, transferConfirmed, topicEvidence, worldDone, needChanges, changedCount };
})();
if (typeof module !== "undefined") module.exports = WorldScenes;
