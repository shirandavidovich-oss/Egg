// ======================================================================
//  "עולמות החשמל": what is checked in each of the 84 electricity situations.
//  Same four-mission scheme as the mechanics worlds (WorldsCore):
//   M1 תחזית  – locked before the run, decided by the run
//   M2 ניסוי  – this situation's own goal, reached by changing values and running
//   M3 הסבר   – a reasoning question, open after a run
//   M4 העברה  – a new condition: compute, then the run with it confirms
//  Every right answer is computed at run time by ElecPhys.
// ======================================================================
const ElecScenes = (() => {
  "use strict";
  const EP = (typeof ElecPhys !== "undefined") ? ElecPhys : require("./elec-engine.js");
  const D = (typeof ELEC_DATA !== "undefined") ? ELEC_DATA : require("./elec-data.js");
  const Core = (typeof WorldsCore !== "undefined") ? WorldsCore : require("./worlds-core.js");
  const { evaluate } = EP;
  const sgn = (x, e = 1e-12) => (x > e ? 1 : x < -e ? -1 : 0);
  const inR = (x, lo, hi) => x !== null && x !== undefined && x >= lo - 1e-12 && x <= hi + 1e-12;
  const f2 = (x, d = 2) => (Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x).toFixed(d);

  // which existing physics topic each family feeds
  const TOPIC_OF = { coulomb: "charges", forcePair2D: "charges", field2D: "charges", plate: "charges", potential: "potential", workElectric: "potential", capacitor: "potential", capacitorPair: "potential", capacitorShare: "potential",
    ohm: "circuits", resistivity: "circuits", network: "circuits", divider: "circuits", kirchhoff: "circuits", rcCharge: "circuits", rcDischarge: "circuits", battery: "batteries",
    lorentz: "magnetism", gyroradius: "magnetism", selector: "magnetism", wireForce: "magnetism", wireField: "magnetism", solenoid: "magnetism", parallelWires: "magnetism", faraday: "induction", motionalEMF: "induction" };
  const ICON_OF_FAMILY = { coulomb: "balloons", forcePair2D: "probe", field2D: "compass", plate: "plates", potential: "hill", workElectric: "lift", capacitor: "cap", capacitorPair: "caps", capacitorShare: "caps",
    ohm: "bulb", resistivity: "wire", network: "branch", divider: "stairs", kirchhoff: "loops", battery: "battery", rcCharge: "clock", rcDischarge: "clock", lorentz: "curve", gyroradius: "ring", selector: "sieve",
    wireForce: "wireB", wireField: "halo", solenoid: "coil", parallelWires: "twins", faraday: "flux", motionalEMF: "rod" };

  // ---------------- per-situation goals (M2) ----------------
  const win = (key, lo, hi, also, text) => ({ kind: "one", text, check: (r) => inR(r.ev[key], lo, hi) && (!also || also(r)) });
  const cond = (fn, text) => ({ kind: "one", text, check: fn });
  const pair = (keys, fn, text) => ({ kind: "pair", keys, text, check: fn });
  const has = (r, t) => r.events.includes(t);
  const ratio2 = (k) => (a, b) => Math.abs(Math.max(Math.abs(a.P[k]), Math.abs(b.P[k])) / Math.min(Math.abs(a.P[k]), Math.abs(b.P[k])) - 2) <= 0.03;
  const SETUP = {
    // W01 אקדמיית המטענים
    "EW01-S01": { goal: cond((r) => r.ev.signedForce > 0 && has(r, "apart") && r.P.r >= 0.8, "דחייה שמעיפה את הבלון, כשהכפפות במרחק 0.8 m לפחות") },
    "EW01-S02": { goal: cond((r) => r.ev.signedForce > 0 && (sgn(r.P.q1) !== sgn(-4)) !== (sgn(r.P.q2) !== sgn(3)), "הפוך סימן של מטען אחד בלבד: מהמשיכה נהיית דחייה") },
    "EW01-S03": { goal: pair(["r"], ratio2("r"), "שתי הרצות: אותם מטענים, מרחק כפול") },
    "EW01-S04": { goal: cond((r) => r.ev.F > 0 && Math.abs(Math.atan2(r.ev.Fy, r.ev.Fx)) <= 10 * Math.PI / 180, "הכוח על מטען הבדיקה מצביע אל השער: ימינה (±10°)") },
    "EW01-S05": { goal: cond((r) => r.P.q1 > 0 && r.P.q2 > 0, "שני המטענים הפוכים (חיוביים): עדיין דחייה?") },
    "EW01-S06": { goal: cond((r) => Math.abs(r.ev.Fx) >= 0.3 * r.ev.F && Math.abs(r.ev.Fy) >= 0.3 * r.ev.F, "כוח אלכסוני: כל רכיב לפחות 30% מגודל הכוח") },
    "EW01-S07": { goal: cond((r) => r.ev.forceN <= 0.3 && r.P.q1 === 8 && r.P.q2 === -7, "כוח של 0.3 N לכל היותר, בלי לגעת במטענים") },
    // W02 יער החצים הבלתי נראים
    "EW02-S01": { goal: cond((r) => r.P.q1 < 0 && r.P.x === 0 && r.P.y === 0.2, "הפוך את כיוון השדה בחיישן בלי להזיז אותו") },
    "EW02-S02": { goal: cond((r) => (r.P.x !== 0 || r.P.y !== 0) && r.ev.E > 0 && Math.abs(r.ev.Ex) <= 0.2 * Math.abs(r.ev.Ey), "חיישן מחוץ למרכז, שבו הרכיבים האופקיים כמעט מתבטלים") },
    "EW02-S03": { goal: pair(["q1"], (a, b) => sgn(a.P.q1) === -sgn(b.P.q1), "אותו חיישן, מטען המקור בסימן הפוך") },
    "EW02-S04": { goal: pair(["x", "y"], (a, b) => a.P.x !== b.P.x && a.P.y !== b.P.y, "שתי מדידות שבהן גם X וגם Y של החיישן שונים") },
    "EW02-S05": { goal: pair(["V"], (a, b) => sgn(a.ev.a) === -sgn(b.ev.a), "שני מתחים שנותנים תאוצות בסימנים הפוכים") },
    "EW02-S06": { goal: pair(["m"], ratio2("m"), "אותו מטען ומתח, מסה כפולה") },
    "EW02-S07": { goal: cond((r) => r.ev.Fx > 0 && r.ev.Fy > 0 && r.P.q1 === -4 && r.P.q2 === 6, "שני רכיבי הכוח חיוביים, מקורות כמו שהם") },
    // W03 הר הפוטנציאל
    "EW03-S01": { goal: pair(["r"], ratio2("r"), "פוטנציאל בשני מרחקים, אחד כפול מהשני") },
    "EW03-S02": { goal: pair(["qTest"], (a, b) => sgn(a.P.qTest) === -sgn(b.P.qTest), "אותו מקום, מטען בדיקה בסימן הפוך") },
    "EW03-S03": { goal: cond((r) => r.ev.workFieldJ > 0 && r.P.q < 0, "עבודה חיובית של השדה על מטען שלילי") },
    "EW03-S04": { goal: cond((r) => r.ev.deltaU < 0, "אנרגיית הפוטנציאל יורדת") },
    "EW03-S05": { goal: pair(["r"], ratio2("r"), "פוטנציאל בשני מרחקים: r ו-2r") },
    "EW03-S06": { goal: cond((r) => r.P.V > 0 && r.P.q === 5, "שדה הלוחות הפוך, אותו מטען (+5 μC)") },
    "EW03-S07": { goal: cond((r) => r.P.q === 6 && Math.abs(r.ev.deltaU + 3e-4) <= 1.5e-5, "ΔU = −0.30 mJ בדיוק (±5%), אותו מטען") },
    // W04 מפעל כיסי החשמל
    "EW04-S01": { goal: pair(["dmm"], ratio2("dmm"), "מרווח כפול, כל השאר זהה") },
    "EW04-S02": { goal: pair(["kappa"], (a, b) => Math.max(a.P.kappa, b.P.kappa) >= 2 * Math.min(a.P.kappa, b.P.kappa), "מקדם דיאלקטרי כפול לפחות") },
    "EW04-S03": { goal: pair(["parallel"], () => true, "אותם קבלים: במקביל ובטור") },
    "EW04-S04": { goal: cond((r) => r.P.parallel === 0 && r.ev.V2 > r.ev.V1, "בטור: המתח הגדול על הקבל השני") },
    "EW04-S05": { goal: cond((r) => r.ev.lostJ >= 2e-3, "לפחות 2 mJ הופכים לחום בחיבור") },
    "EW04-S06": { goal: cond((r) => Math.abs(r.ev.Vfinal) <= 0.05 && (r.P.V1 !== 22 || r.P.C1 !== 6), "מתח סופי אפס בתנאים חדשים") },
    "EW04-S07": { goal: pair(["V"], ratio2("V"), "מתח כפול, אותו קבל") },
    // W05 עיר האורות והמוליכים
    "EW05-S01": { goal: cond((r) => Math.abs(r.ev.I - 1.5) <= 0.03 && Math.abs(r.ev.P - 36) <= 0.7, "נורה עם 1.5 A ו-36 W") },
    "EW05-S02": { goal: pair(["length"], ratio2("length"), "חוט באורך כפול") },
    "EW05-S03": { goal: pair(["areaMM2"], ratio2("areaMM2"), "שטח חתך כפול") },
    "EW05-S04": { goal: pair(["R"], (a, b) => Math.max(a.P.R, b.P.R) >= 2 * Math.min(a.P.R, b.P.R), "עומס גדול פי 2 לפחות") },
    "EW05-S05": { goal: pair(["R"], ratio2("R"), "התנגדות כפולה, אותו מתח") },
    "EW05-S06": { goal: cond((r) => r.P.r === 5 && r.ev.Pload >= 2 * r.ev.Ploss, "הספק לעומס פי 2 לפחות מהאיבוד הפנימי") },
    "EW05-S07": { goal: cond((r) => r.ev.I <= 5 && r.P.V === 36 && r.P.rhoNano === 100, "זרם של 5 A לכל היותר, אותו מתח ואותו חומר") },
    // W06 עיר המסלולים המתפצלים
    "EW06-S01": { goal: cond((r) => r.ev.I3 > r.ev.I2, "ענף ב׳ נושא יותר זרם מענף א׳") },
    "EW06-S02": { goal: pair(["R1"], () => true, "רק הנגד המשותף משתנה") },
    "EW06-S03": { goal: cond((r) => Math.abs(r.ev.Vout - 12) <= 0.1, "מתח יציאה 12 V") },
    "EW06-S04": { goal: pair(["R2"], (a, b) => Math.abs(a.ev.I3 - b.ev.I3) > 1e-6, "שינוי בענף א׳ ששינה את הזרם בענף ב׳") },
    "EW06-S05": { goal: pair(["E"], () => true, "שני כא״מים, אותה סוללה ועומס") },
    "EW06-S06": { goal: pair(["R2"], () => true, "רק R₂ משתנה") },
    "EW06-S07": { goal: cond((r) => r.P.Rbottom === r.P.Rtop && r.P.Rtop === 7, "ההספק על הנגד התחתון מרבי: Rbottom = Rtop") },
    // W07 מבוך קירכהוף
    "EW07-S01": { goal: pair(["E2"], (a, b) => sgn(a.ev.Ishared) === -sgn(b.ev.Ishared), "שני ערכי E₂ שהופכים את כיוון זרם הגשר") },
    "EW07-S02": { goal: cond((r) => r.ev.Iloop1 > 0 && r.ev.Iloop2 > 0 && r.ev.Ishared > 0, "שלושת הזרמים חיוביים") },
    "EW07-S03": { goal: cond((r) => Math.abs(r.ev.Ishared) <= 0.02 && r.P.E1 !== r.P.E2, "זרם גשר ≈ 0 עם מקורות שונים") },
    "EW07-S04": { goal: pair(["Rshared"], () => true, "רק התנגדות הגשר משתנה") },
    "EW07-S05": { goal: cond((r) => r.P.R2 === r.P.R3 && r.P.R2 !== 5, "שני ענפים שווים: הזרם מתחלק חצי-חצי") },
    "EW07-S06": { goal: pair(["E1"], (a, b) => sgn(a.ev.Iloop1) === -sgn(b.ev.Iloop1), "זרם הלולאה הראשונה מתהפך") },
    "EW07-S07": { goal: cond((r) => r.P.E1 > 0 && r.P.E2 === 22, "מקור א׳ הפוך לחיובי, מקור ב׳ כמו שהוא") },
    // W08 שעוני הטעינה
    "EW08-S01": { goal: cond((r) => Math.abs(r.P.tms - r.ev.tauMs) <= 100 && has(r, "mark"), "מדידה ב-t = τ (±100 ms)") },
    "EW08-S02": { goal: cond((r) => Math.abs(r.P.tms - 2 * r.ev.tauMs) <= 150 && has(r, "mark"), "מדידה ב-t = 2τ (±150 ms)") },
    "EW08-S03": { goal: pair(["R"], (a, b) => Math.max(a.P.R, b.P.R) >= 2 * Math.min(a.P.R, b.P.R), "R כפול לפחות, אותו C") },
    "EW08-S04": { goal: cond((r) => inR(r.ev.fraction, 0.4, 0.5) && has(r, "mark"), "זמן שבו נשאר 40%–50%") },
    "EW08-S05": { goal: pair(["tms"], (a, b) => Math.min(a.P.tms, b.P.tms) === 0 && Math.max(a.P.tms, b.P.tms) >= 5 * a.ev.tauMs, "מדידה ב-t = 0 ומדידה אחרי 5τ") },
    "EW08-S06": { goal: cond((r) => inR(r.ev.fraction, 0.09, 0.11) && has(r, "mark"), "נשארה עשירית: 9%–11%") },
    "EW08-S07": { goal: pair(["CmicroF"], (a, b) => a.P.tms > 0, "שני קיבולים באותו זמן מדידה") },
    // W09 לונה פארק לורנץ
    "EW09-S01": { goal: pair(["v"], (a, b) => a.P.v > 0 && b.P.v > 0, "שתי מהירויות, אותו מטען ושדה") },
    "EW09-S02": { goal: pair(["q"], (a, b) => sgn(a.P.q) === -sgn(b.P.q), "אותו שדה ומהירות, מטען בסימן הפוך") },
    "EW09-S03": { goal: cond((r) => r.P.angle === 90 && r.P.q === 4 && r.P.v === 9 && r.P.B === 0.8, "מ-0° ל-90°: הכוח המרבי, כל השאר זהה") },
    "EW09-S04": { goal: pair(["B"], (a, b) => Math.max(a.P.B, b.P.B) >= 2 * Math.min(a.P.B, b.P.B), "B כפול לפחות") },
    "EW09-S05": { goal: pair(["mNanoKg"], (a, b) => Math.max(a.P.mNanoKg, b.P.mNanoKg) >= 2 * Math.min(a.P.mNanoKg, b.P.mNanoKg), "מסה כפולה לפחות") },
    "EW09-S06": { goal: cond((r) => Math.abs(r.ev.netFy) <= 1e-12 && r.P.v !== 5 && r.P.E === 18 && r.P.B === 2, "מהירות שבה החלקיק עובר ישר (אותם E ו-B)") },
    "EW09-S07": { goal: pair(["B"], (a, b) => a.P.angle === 90, "שני שדות, ובשניהם |v| לא משתנה") },
    // W10 מועדון החוטים והמגנטים
    "EW10-S01": { goal: pair(["angle"], (a, b) => Math.abs(a.ev.forceN - b.ev.forceN) > 1e-6, "שתי זוויות, כוחות שונים") },
    "EW10-S02": { goal: pair(["rCm"], ratio2("rCm"), "חיישן במרחק r ו-2r") },
    "EW10-S03": { goal: pair(["I"], (a, b) => sgn(a.P.I) === -sgn(b.P.I), "זרם בכיוון הפוך") },
    "EW10-S04": { goal: pair(["I1", "I2"], (a, b) => a.ev.interaction !== b.ev.interaction && a.ev.forceN > 0 && b.ev.forceN > 0, "פעם משיכה ופעם דחייה") },
    "EW10-S05": { goal: pair(["N"], (a, b) => Math.max(a.P.N, b.P.N) >= 2 * Math.min(a.P.N, b.P.N), "מספר ליפופים כפול לפחות") },
    "EW10-S06": { goal: cond((r) => Math.abs(r.ev.forceN - 7.2) <= 0.15 && r.P.L === 1.2 && r.P.B === 1.2, "כוח של 7.2 N בשינוי הזרם בלבד") },
    "EW10-S07": { goal: pair(["dCm"], ratio2("dCm"), "מרחק כפול בין התילים") },
    // W11 ממלכת הזרם שנולד מתנועה
    "EW11-S01": { goal: pair(["dt"], (a, b) => Math.max(a.P.dt, b.P.dt) >= 2 * Math.min(a.P.dt, b.P.dt), "Δt כפול לפחות, אותו שינוי שדה") },
    "EW11-S02": { goal: pair(["Bstart", "Bend"], (a, b) => sgn(a.ev.emf) === -sgn(b.ev.emf), "שינוי שטף הפוך: כא״מ בסימן הפוך") },
    "EW11-S03": { goal: cond((r) => Math.abs(r.ev.emf) >= 12, "כא״מ של 12 V לפחות") },
    "EW11-S04": { goal: pair(["Bstart", "Bend"], (a, b) => (a.ev.emf === 0) !== (b.ev.emf === 0), "שטף קבוע (אין כא״מ) מול שטף משתנה") },
    "EW11-S05": { goal: pair(["angle"], (a, b) => (a.P.angle === 90 && a.ev.emf === 0 && b.ev.emf !== 0) || (b.P.angle === 90 && b.ev.emf === 0 && a.ev.emf !== 0), "ב-90° אין שטף, בזווית אחרת יש") },
    "EW11-S06": { goal: pair(["v"], (a, b) => a.P.v !== 0 && b.P.v !== 0, "שתי מהירויות: הכוח × המהירות = ההספק") },
    "EW11-S07": { goal: cond((r) => r.P.v === 4 && r.P.B === 1.5 && r.P.L === 0.3 && r.P.R === 5, "אותה מהירות לכיוון השני (v = +4)") },
    // W12 המעבדה הסודית של היצור
    "EW12-S01": { goal: cond((r) => r.ev.Vc >= 18 && r.P.tms === 2500 && r.P.E === 24 && has(r, "mark"), "18 V לפחות על הקבל אחרי 2500 ms") },
    "EW12-S02": { goal: cond((r) => Math.abs(r.ev.Btesla - 0.01) <= 2e-4 && r.P.I === 3 && r.P.L === 0.2, "B = 10 mT בדיוק (±2%) בלי לשנות זרם") },
    "EW12-S03": { goal: cond((r) => Math.abs(r.ev.netFy) <= 1e-12 && r.P.v === 4, "החלקיק עובר ישר במהירות 4 m/s") },
    "EW12-S04": { goal: pair(["v"], (a, b) => a.P.v !== 0 && b.P.v !== 0, "שתי מהירויות, השווה F·v להספק") },
    "EW12-S05": { goal: cond((r) => Math.abs(r.ev.Ishared) <= 0.02 && r.P.E2 < 0, "זרם גשר ≈ 0, עם מקור ב׳ הפוך") },
    "EW12-S06": { goal: cond((r) => r.ev.lostJ <= 1e-3, "פחות מ-1 mJ הופך לחום") },
    "EW12-S07": { goal: cond((r) => inR(Math.abs(r.ev.emf), 0.5, 3), "כא״מ בין 0.5 ל-3 V: השער לא נשרף") }
  };

  // ---------------- family templates ----------------
  const pick = (r, k) => r.ev[k];
  const dbl = (P, k, lo, hi) => (P[k] * 2 <= hi && P[k] * 2 >= lo ? [P[k] * 2, "פי 2"] : [P[k] / 2, "חצי"]);
  const q4 = (x, y) => (x >= 0 && y >= 0 ? 0 : x < 0 && y >= 0 ? 1 : x < 0 ? 2 : 3), QUAD = ["ימינה ולמעלה", "שמאלה ולמעלה", "שמאלה ולמטה", "ימינה ולמטה"];
  const FAM = {
    coulomb: { pred: () => ({ q: "אחרי השחרור הבלונים…", opts: ["מתרחקים", "מתקרבים עד שנוגעים", "לא זזים"], truth: (r) => (has(r, "apart") ? 0 : has(r, "touch") ? 1 : 2) }),
      why: { q: "מרחק כפול: מה קורה לכוח?", opts: ["קטן פי 4, כי F ∝ 1/r². הסימנים קובעים רק משיכה או דחייה", "קטן פי 2", "לא משתנה"], right: 0 },
      xfer: (P) => { const [r, t] = dbl(P, "r", 0.1, 2); return { text: `מרחק ${t}, אותם מטענים. מה גודל הכוח?`, change: { r }, field: { he: "|F|", unit: "N", value: (Q) => evaluate("coulomb", Q).forceN } }; } },
    forcePair2D: { pred: () => ({ q: "הכוח על מטען הבדיקה מצביע…", opts: QUAD, truth: (r) => q4(r.ev.Fx, r.ev.Fy) }),
      why: { q: "איך מוצאים את הכוח על מטען הבדיקה?", opts: ["מחברים את הכוחות משני המקורות כווקטורים: Fₓ ו-Fᵧ בנפרד", "מחברים את הגדלים", "לוקחים רק את המקור הקרוב"], right: 0 },
      xfer: (P) => { const [q, t] = dbl(P, "qProbe", -5, 5); return { text: `מטען בדיקה ${t}, אותו מקום. מה גודל הכוח?`, change: { qProbe: q }, field: { he: "|F|", unit: "N", value: (Q) => evaluate("forcePair2D", Q).F } }; } },
    field2D: { pred: () => ({ q: "השדה בחיישן מצביע…", opts: QUAD, truth: (r) => q4(r.ev.Ex, r.ev.Ey) }),
      why: { q: "מה ההבדל בין שדה לכוח?", opts: ["השדה לא תלוי במטען הבדיקה; כוח = q·E, ולמטען שלילי הוא הפוך לשדה", "אין הבדל", "השדה תלוי במטען הבדיקה"], right: 0 },
      xfer: (P) => ({ text: "שני מטעני המקור גדלים פי 2, החיישן במקומו. מה עוצמת השדה?", change: P.q1 * 2 <= 7 && P.q1 * 2 >= -7 && P.q2 * 2 <= 7 && P.q2 * 2 >= -7 ? { q1: P.q1 * 2, q2: P.q2 * 2 } : { q1: P.q1 / 2, q2: P.q2 / 2 }, field: { he: "|E|", unit: "N/C", value: (Q) => evaluate("field2D", Q).E } }) },
    plate: { pred: () => ({ q: "הגופיף ששוחרר באמצע ינוע אל…", opts: ["הלוח העליון", "הלוח התחתון", "יישאר במקום"], truth: (r) => (has(r, "hit_top") ? 0 : has(r, "hit_bottom") ? 1 : 2) }),
      why: { q: "בין לוחות אידאליים, השדה…", opts: ["אחיד: E = V/d, ולכן התאוצה קבועה", "חזק יותר ליד הלוח החיובי", "תלוי במסה"], right: 0 },
      xfer: (P) => { const [d, t] = dbl(P, "d", 0.03, 0.35); return { text: `מרחק ${t} בין הלוחות, אותו מתח. מה התאוצה? (+ = למעלה)`, change: { d }, field: { he: "a", unit: "m/s²", value: (Q) => evaluate("plate", Q).a } }; } },
    potential: { pred: () => ({ q: "מטען הבדיקה ששוחרר…", opts: ["נמשך אל המקור", "נדחף הרחק"], truth: (r) => (has(r, "hit_source") ? 0 : 1) }),
      why: { q: "פוטנציאל לעומת אנרגיה פוטנציאלית:", opts: ["V = kQ/r שייך למקום; U = qV תלוי גם במטען הבדיקה ובסימן שלו", "אותו דבר", "V תלוי במטען הבדיקה"], right: 0 },
      xfer: (P) => { const [r, t] = dbl(P, "r", 0.1, 2); return { text: `מרחק ${t} מהמקור. מה הפוטנציאל שם?`, change: { r }, field: { he: "V", unit: "V", value: (Q) => evaluate("potential", Q).potentialV } }; } },
    workElectric: { pred: () => ({ q: "העבודה שהשדה עושה בדרך…", opts: ["חיובית", "שלילית", "אפס"], truth: (r) => (Math.abs(r.ev.workFieldJ) < 1e-15 ? 2 : r.ev.workFieldJ > 0 ? 0 : 1) }),
      why: { q: "עבודת השדה שווה ל…", opts: ["−ΔU = −q·ΔV: אותו ΔV, מטען הפוך, סימן הפוך", "q·ΔV", "תמיד חיובית"], right: 0 },
      xfer: (P) => { const [q, t] = dbl(P, "q", -8, 8); return { text: `מטען ${t}, אותה דרך. מה עבודת השדה?`, change: { q }, field: { he: "W", unit: "J", value: (Q) => evaluate("workElectric", Q).workFieldJ } }; } },
    capacitor: { pred: (P) => ({ q: `אם נכפיל את המרווח (המתח נשאר ${P.V} V), המטען…`, opts: ["יגדל פי 2", "יקטן פי 2", "לא ישתנה"], truth: (r) => { const b = evaluate("capacitor", { ...r.P, dmm: r.P.dmm * 2 }); return Math.abs(b.QmicroC - r.ev.QmicroC / 2) < 1e-9 ? 1 : 2; } }),
      why: { q: "קבל מחובר לסוללה לעומת קבל מנותק:", opts: ["מחובר: V קבוע ו-Q משתנה; מנותק: Q קבוע ו-V משתנה", "בשניהם Q קבוע", "בשניהם V קבוע"], right: 0 },
      xfer: (P) => { const [k, t] = P.kappa * 2 <= 8 ? [P.kappa * 2, "פי 2"] : [P.kappa / 2, "חצי"]; return { text: `מקדם דיאלקטרי ${t}. מה הקיבול?`, change: { kappa: k }, field: { he: "C", unit: "μF", value: (Q) => evaluate("capacitor", Q).CuF } }; } },
    capacitorPair: { pred: () => ({ q: "למי יותר מטען?", opts: ["לקבל א׳", "לקבל ב׳", "שווה"], truth: (r) => (Math.abs(r.ev.Q1 - r.ev.Q2) < 1e-9 ? 2 : r.ev.Q1 > r.ev.Q2 ? 0 : 1) }),
      why: { q: "בחיבור טורי…", opts: ["המטען זהה, והמתח הגדול נופל על הקיבול הקטן", "המתח זהה", "המטען על הגדול גדול יותר"], right: 0 },
      xfer: (P) => ({ text: `מחליפים ל${P.parallel ? "טור" : "מקביל"}. מה הקיבול השקול?`, change: { parallel: P.parallel ? 0 : 1 }, field: { he: "C שקול", unit: "μF", value: (Q) => evaluate("capacitorPair", Q).Ceq } }) },
    capacitorShare: { pred: () => ({ q: "אחרי החיבור, המתח המשותף…", opts: ["חיובי", "שלילי", "אפס"], truth: (r) => (Math.abs(r.ev.Vfinal) < 1e-9 ? 2 : r.ev.Vfinal > 0 ? 0 : 1) }),
      why: { q: "לאן הולכת האנרגיה שחסרה אחרי החיבור?", opts: ["לחום בהתנגדות החוטים (ולקרינה): המטען נשמר, האנרגיה בקבלים לא", "נעלמת", "נשארת בקבלים"], right: 0 },
      xfer: () => ({ text: "קבל ב׳ מתחיל ריק (V₂ = 0). מה המתח המשותף?", change: { V2: 0 }, field: { he: "V סופי", unit: "V", value: (Q) => evaluate("capacitorShare", Q).Vfinal } }) },
    ohm: { pred: () => ({ q: "הזרם בנורה יהיה…", opts: ["יותר מ-1 A", "עד 1 A"], truth: (r) => (r.ev.I > 1 ? 0 : 1) }),
      why: { q: "במתח קבוע, R כפול:", opts: ["הזרם וההספק קטנים פי 2", "ההספק גדל פי 2", "הזרם לא משתנה"], right: 0 },
      xfer: (P) => { const [R, t] = dbl(P, "R", 1, 60); return { text: `התנגדות ${t}, אותו מתח. מה ההספק?`, change: { R }, field: { he: "P", unit: "W", value: (Q) => evaluate("ohm", Q).P } }; } },
    resistivity: { pred: () => ({ q: "התנגדות החוט…", opts: ["יותר מ-1 Ω", "עד 1 Ω"], truth: (r) => (r.ev.R > 1 ? 0 : 1) }),
      why: { q: "למה חוט עבה מתנגד פחות?", opts: ["R = ρL/A: שטח חתך גדול יותר, התנגדות קטנה יותר", "כי הוא כבד", "R לא תלוי בשטח"], right: 0 },
      xfer: (P) => { const [L, t] = dbl(P, "length", 0.5, 20); return { text: `חוט באורך ${t}. מה ההתנגדות?`, change: { length: L }, field: { he: "R", unit: "Ω", value: (Q) => evaluate("resistivity", Q).R } }; } },
    network: { pred: () => ({ q: "איזה ענף נושא יותר זרם?", opts: ["ענף א׳ (R₂)", "ענף ב׳ (R₃)", "שווה"], truth: (r) => (Math.abs(r.ev.I2 - r.ev.I3) < 1e-9 ? 2 : r.ev.I2 > r.ev.I3 ? 0 : 1) }),
      why: { q: "בענפים מקבילים…", opts: ["המתח זהה, והזרם גדול יותר בענף עם התנגדות קטנה; סכום הזרמים = הזרם הכולל", "הזרם זהה", "הזרם הגדול בהתנגדות הגדולה"], right: 0 },
      xfer: (P) => ({ text: `הנגד המשותף גדל ב-5 Ω. מה הזרם הכולל?`, change: { R1: Math.min(30, P.R1 + 5) }, field: { he: "I כולל", unit: "A", value: (Q) => evaluate("network", Q).Itotal } }) },
    divider: { pred: () => ({ q: "מתח היציאה…", opts: ["יותר מחצי ממתח המקור", "פחות מחצי", "בדיוק חצי"], truth: (r) => (Math.abs(r.ev.Vout - r.P.V / 2) < 1e-9 ? 2 : r.ev.Vout > r.P.V / 2 ? 0 : 1) }),
      why: { q: "מחלק מתח בלי עומס:", opts: ["V_out = V·R_bottom/(R_top + R_bottom)", "V_out = V·R_top/R_bottom", "V_out תמיד חצי"], right: 0 },
      xfer: (P) => { const [Rb, t] = dbl(P, "Rbottom", 1, 40); return { text: `נגד תחתון ${t}. מה מתח היציאה?`, change: { Rbottom: Rb }, field: { he: "V_out", unit: "V", value: (Q) => evaluate("divider", Q).Vout } }; } },
    kirchhoff: { pred: () => ({ q: "זרם הגשר…", opts: ["בכיוון החץ (+)", "נגד החץ (−)", "אפס"], truth: (r) => (Math.abs(r.ev.Ishared) < 1e-9 ? 2 : r.ev.Ishared > 0 ? 0 : 1) }),
      why: { q: "זרם שיוצא שלילי בפתרון…", opts: ["זורם הפוך לחץ שבחרנו; המודל תקין", "הוא טעות בחישוב", "אומר שאין זרם"], right: 0 },
      xfer: (P) => ({ text: "הופכים את מקור ב׳ (E₂ → −E₂). מה זרם הגשר?", change: { E2: -P.E2 }, field: { he: "I גשר", unit: "A", value: (Q) => evaluate("kirchhoff", Q).Ishared } }) },
    battery: { pred: () => ({ q: "מתח ההדקים לעומת הכא״מ:", opts: ["שווה", "קטן יותר", "גדול יותר"], truth: (r) => (Math.abs(r.ev.Vterminal - r.P.E) < 1e-9 ? 0 : r.ev.Vterminal < r.P.E ? 1 : 2) }),
      why: { q: "למה מתח ההדקים קטן מהכא״מ?", opts: ["חלק מהמתח נופל על ההתנגדות הפנימית: V = E − I·r", "כי הסוללה מתרוקנת", "הוא לא קטן"], right: 0 },
      xfer: (P) => ({ text: "עומס כפול (R פי 2). מה מתח ההדקים?", change: { R: P.R * 2 <= 50 ? P.R * 2 : P.R / 2 }, field: { he: "V הדקים", unit: "V", value: (Q) => evaluate("battery", Q).Vterminal } }) },
    rcCharge: { pred: (P) => ({ q: `ברגע ${P.tms} ms, מתח הקבל…`, opts: ["פחות מ-63% מהמקור", "יותר מ-63%"], truth: (r) => (r.ev.fraction < 1 - Math.exp(-1) ? 0 : 1) }),
      why: { q: "ברגע הסגירה (t = 0) הקבל הריק…", opts: ["מתנהג כמו חוט: הזרם מרבי E/R, ואחרי זמן רב הזרם → 0", "לא מוליך", "כבר טעון"], right: 0 },
      xfer: (P) => ({ text: "מדידה בדיוק ב-t = τ. מה מתח הקבל?", change: { tms: Math.min(15000, Math.round(P.R * P.CmicroF / 100) * 100) }, field: { he: "Vc", unit: "V", value: (Q) => evaluate("rcCharge", Q).Vc } }) },
    rcDischarge: { pred: (P) => ({ q: `ברגע ${P.tms} ms נשאר…`, opts: ["יותר מחצי", "פחות מחצי"], truth: (r) => (r.ev.fraction > 0.5 ? 0 : 1) }),
      why: { q: "בכל τ של פריקה…", opts: ["נשאר 37% (e⁻¹) ממה שהיה", "נעלם חצי", "נגמר הכול"], right: 0 },
      xfer: (P) => ({ text: "מתח התחלה כפול, אותו זמן. מה מתח הקבל?", change: { V0: P.V0 * 2 <= 40 ? P.V0 * 2 : P.V0 / 2 }, field: { he: "Vc", unit: "V", value: (Q) => evaluate("rcDischarge", Q).Vc } }) },
    lorentz: { pred: () => ({ q: "המסלול יתעקם…", opts: ["למעלה", "למטה", "לא יתעקם"], truth: (r) => (Math.abs(r.end.y) < 1e-9 ? 2 : r.end.y > 0 ? 0 : 1) }),
      why: { q: "למה הכוח המגנטי לא משנה את גודל המהירות?", opts: ["הוא תמיד ניצב למהירות, ולכן לא עושה עבודה", "כי הוא חלש", "הוא כן משנה"], right: 0 },
      xfer: (P) => ({ text: "מהירות כפולה. מה גודל הכוח המגנטי?", change: { v: P.v * 2 <= 20 ? P.v * 2 : P.v / 2 }, field: { he: "|F|", unit: "N", value: (Q) => evaluate("lorentz", Q).forceN } }) },
    gyroradius: { pred: () => ({ q: "החלקיק מקיף…", opts: ["עם כיוון השעון", "נגד כיוון השעון"], truth: (r) => (r.firstY < 0 ? 0 : 1) }),
      why: { q: "r = mv/(|q|B). מהירות כפולה:", opts: ["רדיוס כפול, זמן ההקפה לא משתנה", "גם זמן ההקפה כפול", "רדיוס חצי"], right: 0 },
      xfer: (P) => ({ text: "מהירות כפולה. מה רדיוס המסלול?", change: { v: P.v * 2 <= 30 ? P.v * 2 : P.v / 2 }, field: { he: "r", unit: "m", value: (Q) => evaluate("gyroradius", Q).radiusM } }) },
    selector: { pred: () => ({ q: "החלקיק במסננת…", opts: ["עובר ישר", "סוטה למעלה", "סוטה למטה"], truth: (r) => (Math.abs(r.end.y) < 1e-9 ? 0 : r.end.y > 0 ? 1 : 2) }),
      why: { q: "למה v = E/B לא תלוי במטען?", opts: ["שני הכוחות פרופורציוניים ל-q ומתהפכים יחד", "כי q קטן", "הוא כן תלוי"], right: 0 },
      xfer: (P) => ({ text: "מכפילים את B. באיזו מהירות יעבור ישר?", change: { B: P.B * 2 <= 5 && P.B * 2 >= -5 ? P.B * 2 : P.B / 2 }, field: { he: "v ישר", unit: "m/s", value: (Q) => evaluate("selector", Q).vStraight } }) },
    wireForce: { pred: () => ({ q: "הכוח על התיל…", opts: ["חיובי (+)", "שלילי (−)", "אפס"], truth: (r) => { const a = r.P.I * r.P.L * r.P.B * Math.sin(r.P.angle * Math.PI / 180); return Math.abs(a) < 1e-9 ? 2 : a > 0 ? 0 : 1; } }),
      why: { q: "מתי הכוח על התיל מרבי?", opts: ["כשהתיל ניצב לשדה: F = ILB·sinθ", "כשהוא מקביל לשדה", "תמיד אותו כוח"], right: 0 },
      xfer: (P) => ({ text: "תיל באורך כפול. מה גודל הכוח?", change: { L: P.L * 2 <= 3 ? P.L * 2 : P.L / 2 }, field: { he: "|F|", unit: "N", value: (Q) => evaluate("wireForce", Q).forceN } }) },
    wireField: { pred: () => ({ q: "בצד ימין של התיל, השדה…", opts: ["אל תוך המסך", "החוצה מהמסך"], truth: (r) => (r.ev.signedBz < 0 ? 0 : 1) }),
      why: { q: "שדה תיל ארוך:", opts: ["B = μ₀I/(2πr), במעגלים סביב התיל (יד ימין)", "B אחיד", "B ∝ 1/r²"], right: 0 },
      xfer: (P) => ({ text: "מרחק כפול מהתיל. מה השדה (μT)?", change: { rCm: P.rCm * 2 <= 30 ? P.rCm * 2 : P.rCm / 2 }, field: { he: "B", unit: "μT", value: (Q) => evaluate("wireField", Q).BmicroT } }) },
    solenoid: { pred: () => ({ q: "השדה בתוך הסליל…", opts: ["יותר מ-10 mT", "עד 10 mT"], truth: (r) => (Math.abs(r.ev.Btesla) > 0.01 ? 0 : 1) }),
      why: { q: "מה קובע את השדה בתוך סליל ארוך?", opts: ["ליפופים למטר וזרם: B = μ₀(N/L)I", "רק N", "רק האורך"], right: 0 },
      xfer: (P) => ({ text: "מכפילים גם את הליפופים וגם את האורך. מה B?", change: P.N * 2 <= 1500 && P.L * 2 <= 1.5 ? { N: P.N * 2, L: P.L * 2 } : { N: P.N / 2, L: P.L / 2 }, field: { he: "B", unit: "T", value: (Q) => evaluate("solenoid", Q).Btesla } }) },
    parallelWires: { pred: () => ({ q: "שני החוטים…", opts: ["נמשכים", "נדחים", "בלי כוח"], truth: (r) => (r.ev.interaction === "משיכה" ? 0 : r.ev.interaction === "דחייה" ? 1 : 2) }),
      why: { q: "זרמים באותו כיוון…", opts: ["מושכים; זרמים הפוכים דוחים", "דוחים", "לא משפיעים"], right: 0 },
      xfer: (P) => ({ text: "מרחק כפול בין החוטים. מה גודל הכוח?", change: { dCm: P.dCm * 2 <= 25 ? P.dCm * 2 : P.dCm / 2 }, field: { he: "|F|", unit: "N", value: (Q) => evaluate("parallelWires", Q).forceN } }) },
    faraday: { pred: () => ({ q: "בזמן השינוי, הכא״מ…", opts: ["חיובי", "שלילי", "אפס"], truth: (r) => (r.ev.emf === 0 ? 2 : r.ev.emf > 0 ? 0 : 1) }),
      why: { q: "חוק לנץ אומר שהזרם המושרה…", opts: ["מתנגד לשינוי בשטף, לא בהכרח לשדה עצמו", "תמיד מחזק את השדה", "תמיד מבטל את השדה"], right: 0 },
      xfer: (P) => ({ text: "אותו שינוי בזמן כפול. מה הכא״מ?", change: { dt: P.dt * 2 <= 5 ? P.dt * 2 : P.dt / 2 }, field: { he: "כא״מ", unit: "V", value: (Q) => evaluate("faraday", Q).emf } }) },
    motionalEMF: { pred: () => ({ q: "הכוח המגנטי על המוט…", opts: ["בולם את התנועה", "דוחף קדימה", "אין כוח"], truth: (r) => (r.ev.I === 0 ? 2 : 0) }),
      why: { q: "למה צריך יד כדי לשמור על מהירות קבועה?", opts: ["הזרם המושרה יוצר כוח בולם (לנץ); העבודה של היד הופכת לחום I²R", "בגלל חיכוך", "לא צריך"], right: 0 },
      xfer: (P) => ({ text: "המוט נוסע לכיוון השני באותה מהירות. מה הכא״מ?", change: { v: -P.v }, field: { he: "כא״מ", unit: "V", value: (Q) => evaluate("motionalEMF", Q).emf } }) }
  };
  const WHY = {
    "EW01-S05": { q: "שני מטענים שליליים…", opts: ["דוחים זה את זה, בדיוק כמו שני חיוביים", "מושכים", "בלי כוח"], right: 0 },
    "EW02-S02": { q: "בדיוק באמצע בין שני מטענים זהים…", opts: ["השדה אפס, אבל הפוטנציאל לא", "גם הפוטנציאל אפס", "השדה מרבי"], right: 0 },
    "EW03-S05": { q: "מרחק כפול מהמקור:", opts: ["הפוטנציאל חצי (1/r), השדה רבע (1/r²)", "שניהם חצי", "שניהם רבע"], right: 0 },
    "EW08-S05": { q: "זמן רב אחרי הסגירה…", opts: ["הזרם → 0 והקבל טעון ל-E", "הזרם מרבי", "הקבל מתרוקן"], right: 0 },
    "EW09-S03": { q: "כשהמהירות מקבילה לשדה…", opts: ["אין כוח מגנטי: sin 0° = 0", "הכוח מרבי", "הכוח חצי"], right: 0 },
    "EW09-S07": { q: "מה הכוח המגנטי משנה בתנועה?", opts: ["רק את הכיוון, לא את גודל המהירות או האנרגיה", "את האנרגיה", "את המסה"], right: 0 },
    "EW11-S04": { q: "שטף קבוע…", opts: ["לא יוצר כא״מ, גם בשדה חזק", "יוצר כא״מ קבוע", "יוצר זרם קבוע"], right: 0 },
    "EW12-S07": { q: "כשהשינוי בשדה נעצר…", opts: ["הכא״מ והזרם המושרה נעלמים, גם אם השדה נשאר חזק", "הזרם נשאר", "הזרם מתהפך"], right: 0 }
  };

  const core = Core.make({ D, evaluate, makeSim: (f, p) => EP.makeSim(f, p), SETUP, FAM, WHY, TOPIC_OF, ICON_OF_FAMILY, simOpts: () => ({}) });
  // the gyroradius prediction needs the first turn's direction
  const baseStep = core.stepRun;
  core.stepRun = (L, dt) => { const r = L.cur; baseStep(L, dt); if (r && r.firstY === undefined && Math.abs(r.end.y || 0) > 1e-12) r.firstY = r.end.y; };
  return core;
})();
if (typeof module !== "undefined") module.exports = ElecScenes;
