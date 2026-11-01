// ======================================================================
//  PHYSICS  (casual physics with the player's own creature)
//  Screens: choose a way -> topic machine -> spring intro -> spring lab,
//  plus creatures and the map. Learning and coins live in EggProfile and
//  belong to the player; the creature only brings its physical properties.
// ======================================================================
(() => {
  "use strict";
  const G = window.__egg, P = EggProfile, SP = SpringPhys;
  const $ = (s, el = document) => el.querySelector(s);
  const ui = $("#ui"), screenEl = $("#screen"), hud = $("#hud");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (x, d = 2) => (Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x).toFixed(d);
  const FONT = (getComputedStyle(document.documentElement).getPropertyValue("--ui-font") || "Rubik, Arial, sans-serif").trim();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------------- content ----------------
  const TOPICS = SPR.topics.slice().sort((a, b) => a.order - b.order);
  const SPRING_UNITS = [
    { id: "springs.hooke", he: "חוק הוק", insight: "ככל שמותחים יותר, הקפיץ מושך חזרה חזק יותר, באותו יחס.", eq: "F = −k·s" },
    { id: "springs.energy", he: "אנרגיה אלסטית", insight: "מתיחה גדולה פי 2 אוגרת פי 4 אנרגיה, כי האנרגיה תלויה בריבוע המתיחה.", eq: "E = ½·k·s²" },
    { id: "springs.oscillation", he: "תנודות", insight: "קפיץ קשיח יותר מחזיר מהר יותר, ולכן התנודה מהירה יותר.", eq: "T = 2π·√(m/k)" },
    { id: "springs.shm", he: "תנועה הרמונית פשוטה", insight: "דמות כבדה יותר מתנודדת לאט יותר, וגודל המשיכה לא משנה את זמן המחזור.", eq: "T = 2π·√(m/k)" },
    { id: "springs.wall", he: "קפיץ על רצפה עם חיכוך", insight: "על רצפה עם חיכוך כל תנודה קטנה יותר, והדמות נעצרת איפה שהקפיץ כבר לא מנצח את החיכוך הסטטי.", eq: "נעצר כש-k·|x| ≤ μs·m·g" },
    { id: "springs.launch", he: "קפיץ משגר: אנרגיה לגובה", insight: "האנרגיה שנאגרה בדחיסה, ½kx², הופכת לגובה. הגוף עף רק אם דוחסים יותר מ-2mg/k, והקפיץ מפסיק לדחוף ברגע שהוא חוזר לאורך הטבעי.", eq: "½·k·x² = m·g·h" },
    { id: "springs.series", he: "קפיצים בטור", insight: "בטור שני הקפיצים מושכים באותו כוח, וההתארכויות מתחברות. הקפיץ השקול רך יותר מכל אחד מהם.", eq: "1/k_eq = 1/k1 + 1/k2" },
    { id: "springs.parallel", he: "קפיצים במקביל", insight: "במקביל שני הקפיצים נמתחים אותו מרחק, והכוחות מתחברים. הקפיץ השקול קשיח יותר מכל אחד מהם.", eq: "k_eq = k1 + k2" },
    { id: "springs.graphs", he: "גרפים של תנודה", insight: "x, v ו-a הם גלים באותו קצב אבל מוזזים: כש-x בקצה, v = 0 ו-a הכי גדולה ובכיוון ההפוך. האנרגיה עוברת בין תנועה לקפיץ, והסכום קבוע.", eq: "a = −ω²·x" },
    { id: "springs.ramp", he: "מסילת אנרגיה", insight: "האנרגיה לא נעלמת: היא עוברת מהקפיץ לתנועה ולגובה, והחיכוך הופך חלק ממנה לחום. הסכום תמיד שווה למה שהיה בקפיץ.", eq: "½·k·x² = ½·m·v² + m·g·h + Q" },
    { id: "springs.incline", he: "קפיץ על מדרון", insight: "על מדרון הקפיץ צריך להחזיק רק את mg·sinθ, ולכן נמתח פחות. הזווית מזיזה את שיווי המשקל אבל לא משנה את זמן המחזור.", eq: "k·x = m·g·sinθ" },
    { id: "springs.momentum", he: "קפיץ בין שני גופים: תנע", insight: "מתחילים במנוחה, ולכן התנע הכולל נשאר אפס: הגופים עפים לכיוונים מנוגדים, והקל מהיר יותר.", eq: "m1·v1 + m2·v2 = 0" },
    { id: "springs.pulley", he: "קפיץ וגלגלת", insight: "גלגלת אידיאלית רק משנה את כיוון החוט. המתיחות זהה לכל אורכו, ולכן הקפיץ מחזיק את אותו משקל וזמן המחזור לא משתנה.", eq: "T = k·x = m·g" },
    { id: "springs.graph", he: "גרף כוח מול התארכות", insight: "הנקודות יושבות על קו ישר שעובר בראשית, והשיפוע שלו הוא k. השטח מתחת לקו הוא האנרגיה האלסטית.", eq: "k = ΔF / Δx" }
  ];
  const UNITS = SPRING_UNITS;
  const INCLINE_EQ = { 1: "ΣF = N − mg = 0", 2: "mg תמיד למטה · N ⟂ למשטח", 3: "mg·sinθ  ,  mg·cosθ", 4: "f_s ≤ μs·N", 5: "a = g·(sinθ − μk·cosθ)", 6: "a לא תלויה ב-m כש-μ זהה", 7: "ΣF = m·a" };
  const INCLINE_UNITS = SPR.inclineStages.map((st) => ({ id: "newton.s" + st.stage, stage: st.stage, he: st.title_he, insight: st.takeaway_he, eq: INCLINE_EQ[st.stage], coins: st.unique_reward_coins, task: st.interaction_he }));
  const MOTION_UNITS = KIN_DATA.units.map((u) => ({ id: u.id, level: u.level, he: u.he, concept: u.concept, insight: u.insight, eq: u.eq, coins: u.level === 8 ? 25 : 10 }));
  const FAMILY_UNITS = { springs: SPRING_UNITS, newton: INCLINE_UNITS, motion: MOTION_UNITS };
  const FAMILY_TITLE = { springs: "קפיצים ואלסטיות", newton: "מישור משופע וחיכוך", motion: "העוגייה בורחת!" };
  // the inclined plane is now 18 situations measured by 12 skills (RampScenes.coverage); it weighs 12 units
  // in the overall meter. The seven original stages still count, once, inside that skill meter.
  const FAMILY_WEIGHT = { newton: 12 };
  const weightOf = (id, t) => FAMILY_WEIGHT[id] || (FAMILY_UNITS[id] ? FAMILY_UNITS[id].length : t ? t.subtopics_he.length : 0);
  const TOTAL_UNITS = TOPICS.reduce((n, t) => n + weightOf(t.id, t), 0);
  const done = () => P.data.physics.completed_subtopic_ids;
  const rampState = () => {
    const ph = P.data.physics;
    if (!ph.ramp) { ph.ramp = { v: 1, completed: [], params: {}, seed: P.data.player_id, legacy_mapped: [] }; P.save(); }
    // the old stages that match a new mission count as done there (no coins a second time)
    let changed = false;
    for (const id in RampScenes.LEGACY) { const l = RampScenes.LEGACY[id]; if (l.mission && done().includes(id) && !ph.ramp.completed.includes(l.mission)) { ph.ramp.completed.push(l.mission); ph.ramp.legacy_mapped.push(l.mission); changed = true; } }
    if (changed) P.save();
    return ph.ramp;
  };
  // "עולמות המכניקה": 84 situations that feed the existing topics. Topics that had no game yet are measured by
  // them alone; the three that already had a game keep it as 60% of their meter (40% from the worlds).
  const worldsState = () => { const ph = P.data.physics; if (!ph.worlds) { ph.worlds = { v: 1, done: [], params: {} }; P.save(); } return ph.worlds; };
  // "עולמות החשמל": its own save (ids EWxx, coins "elec:"), feeding the electricity topics of the same map
  const elecState = () => { const ph = P.data.physics; if (!ph.elec) { ph.elec = { v: 1, done: [], params: {} }; P.save(); } return ph.elec; };
  const WORLD_EVIDENCE = () => ({ ...WorldScenes.topicEvidence(worldsState().done), ...(typeof ElecScenes !== "undefined" ? ElecScenes.topicEvidence(elecState().done) : {}) });
  const ELEC_TOPICS = ["charges", "potential", "circuits", "batteries", "magnetism", "induction"];
  const elecCoverage = () => { const ts = TOPICS.filter((t) => ELEC_TOPICS.includes(t.id)); const w = ts.reduce((n, t) => n + weightOf(t.id, t), 0); return ts.reduce((n, t) => n + familyCoverage(t.id) * weightOf(t.id, t), 0) / w; };
  const ownCoverage = (id) => id === "newton" ? RampScenes.coverage(rampState().completed, done()).total
    : FAMILY_UNITS[id] ? FAMILY_UNITS[id].filter((u) => done().includes(u.id)).length / FAMILY_UNITS[id].length : null;
  const familyCoverage = (id) => {
    const own = ownCoverage(id), w = WORLD_EVIDENCE()[id];
    if (!w) return own || 0;
    return own === null ? w.frac : 0.6 * own + 0.4 * w.frac;
  };
  const doneUnits = () => TOPICS.reduce((n, t) => n + familyCoverage(t.id) * weightOf(t.id, t), 0);
  for (const t of TOPICS) if (["projectiles", "circular", "gravitation", "momentum", "energy", ...ELEC_TOPICS].includes(t.id)) t.ready = true;
  const overallCoverage = () => doneUnits() / TOTAL_UNITS;
  const pct = (x) => Math.round(x * 100) + "%";

  const QUESTIONS = [
    { id: "q.launch.double", unit: "springs.launch", q: "דוחסים את הקפיץ המשגר פי 2 יותר (ובשני המקרים הדמות עפה). הגובה שהיא מגיעה אליו מנקודת ההתחלה…", a: ["גדל פי 2", "גדל פי 4", "לא משתנה"], right: 1, why: "h = k·x² / (2mg): הגובה תלוי בריבוע הדחיסה." },
    { id: "q.launch.detach", unit: "springs.launch", q: "איפה הדמות מתנתקת מהקפיץ המשגר?", a: ["בנקודה הכי נמוכה", "כשהקפיץ חוזר לאורכו הטבעי", "בשיא הגובה"], right: 1, why: "הקפיץ דוחף רק כשהוא דחוס. באורך הטבעי הכוח שלו אפס, והדמות ממשיכה לבד, רק עם הכובד." },
    { id: "q.launch.heavy", unit: "springs.launch", q: "אותו קפיץ ואותה דחיסה, דמות כבדה פי 2. הגובה מנקודת ההתחלה…", a: ["קטן פי 2", "גדל פי 2", "לא משתנה"], right: 0, why: "אותה אנרגיה ½kx² צריכה להרים מסה כפולה: mgh קבוע, ולכן h קטן פי 2." },
    { id: "q.series.same", unit: "springs.series", q: "שני קפיצים שונים מחוברים בטור ודמות תלויה עליהם. מה נכון?", a: ["הכוח בשניהם שווה", "ההתארכות בשניהם שווה", "הקפיץ הקשיח מושך חזק יותר"], right: 0, why: "בטור כל קפיץ מחזיק את מה שמתחתיו: אותו כוח עובר דרך שניהם. ההתארכויות שונות (x = F/k)." },
    { id: "q.series.equal", unit: "springs.series", q: "שני קפיצים זהים, כל אחד k = 100 N/m, בטור. מה k השקול?", a: ["200 N/m", "100 N/m", "50 N/m"], right: 2, why: "1/k = 1/100 + 1/100 = 2/100, ולכן k = 50 N/m. בטור מקבלים קפיץ רך יותר." },
    { id: "q.parallel.equal", unit: "springs.parallel", q: "אותם שני קפיצים (k = 100 N/m כל אחד), עכשיו במקביל. k השקול…", a: ["50 N/m", "200 N/m", "100 N/m"], right: 1, why: "במקביל k_eq = k1 + k2 = 200 N/m: אותה התארכות, והכוחות מתחברים." },
    { id: "q.parallel.share", unit: "springs.parallel", q: "במקביל, k1 = 100 ו-k2 = 300 N/m. איזה קפיץ מחזיק יותר מהמשקל?", a: ["קפיץ 1", "קפיץ 2, פי 3", "חצי-חצי"], right: 1, why: "אותה התארכות x, ולכן F = k·x: הקשיח מחזיק פי 3 יותר." },
    { id: "q.osc.edge", unit: "springs.graphs", q: "בתנודה, ברגע שהגוף בקצה (x = A), המהירות שלו…", a: ["מקסימלית", "אפס", "שווה ל-ω·A"], right: 1, why: "בקצה הגוף עוצר ומסתובב: v = 0, ושם התאוצה הכי גדולה, a = −ω²·A." },
    { id: "q.osc.center", unit: "springs.graphs", q: "איפה המהירות הכי גדולה?", a: ["בקצוות", "בנקודת שיווי המשקל", "בכל מקום אותה מהירות"], right: 1, why: "ב-x = 0 כל האנרגיה היא קינטית: v_max = ω·A." },
    { id: "q.osc.acc", unit: "springs.graphs", q: "גרף a(t) לעומת גרף x(t):", a: ["זהים", "הפוכים בסימן", "אין קשר"], right: 1, why: "a = −ω²·x: כש-x חיובי התאוצה שלילית. הגרפים הם תמונת ראי." },
    { id: "q.osc.energy", unit: "springs.graphs", q: "בלי בלימה, האנרגיה הכוללת בזמן התנודה…", a: ["קבועה", "גדלה", "יורדת לאפס בכל קצה"], right: 0, why: "E_k ו-E_p מתחלפות, אבל E = ½kA² נשאר קבוע. עם בלימה הוא יורד." },
    { id: "q.ramp.top", unit: "springs.ramp", q: "קפיץ k = 400 N/m דחוס 10 cm. דמות של 1 kg, בלי חיכוך (g = 10). לאיזה גובה מקסימלי תגיע?", a: ["20 cm", "2 cm", "40 cm"], right: 0, why: "½·400·0.1² = 2 J. mgh = 2 → h = 2 / (1·10) = 0.2 m = 20 cm." },
    { id: "q.ramp.heat", unit: "springs.ramp", q: "על מסילה עם חיכוך הדמות מגיעה נמוך יותר. לאן הלכה האנרגיה החסרה?", a: ["נעלמה", "הפכה לחום", "חזרה לקפיץ"], right: 1, why: "החיכוך עושה עבודה שלילית: האנרגיה הופכת לחום, Q = μk·N·d. הסכום הכולל נשמר." },
    { id: "q.ramp.speed", unit: "springs.ramp", q: "בלי חיכוך, באיזה רגע המהירות הכי גדולה?", a: ["בשיא הגובה", "כשהדמות עוזבת את הקפיץ ועדיין על הרצפה", "בתחילת הדחיסה"], right: 1, why: "כשהקפיץ מסיים לדחוף, כל האנרגיה שלו הפכה לתנועה, ועוד לא התחילה לעלות." },
    { id: "q.incline.eq", unit: "springs.incline", q: "דמות קשורה לקפיץ על מדרון חלק. מגדילים את הזווית. ההתארכות בשיווי משקל…", a: ["גדלה", "קטנה", "לא משתנה"], right: 0, why: "k·x = m·g·sinθ: כשהזווית גדלה, sinθ גדל, והקפיץ צריך להחזיק יותר." },
    { id: "q.incline.T", unit: "springs.incline", q: "ומה עם זמן המחזור כשהזווית גדלה (בלי חיכוך)?", a: ["גדל", "קטן", "לא משתנה"], right: 2, why: "T = 2π√(m/k). הכובד רק מזיז את נקודת שיווי המשקל." },
    { id: "q.mom.ratio", unit: "springs.momentum", q: "קפיץ דחוס בין גוף של 1 kg לגוף של 3 kg, במנוחה. אחרי השחרור הגוף הקל נע ב-3 m/s. הכבד…", a: ["1 m/s לכיוון ההפוך", "3 m/s לכיוון ההפוך", "9 m/s"], right: 0, why: "1·3 + 3·v = 0 → v = −1 m/s." },
    { id: "q.mom.zero", unit: "springs.momentum", q: "התנע הכולל של שני הגופים אחרי השחרור הוא…", a: ["אפס", "½kx²", "תלוי ב-k"], right: 0, why: "לפני השחרור הכול במנוחה, ואין כוח חיצוני לאורך המסילה: התנע נשמר, ונשאר אפס." },
    { id: "q.pulley.T", unit: "springs.pulley", q: "דמות של 2 kg תלויה במנוחה על חוט שעובר מעל גלגלת לקפיץ (g = 10). מה המתיחות בחוט?", a: ["20 N", "10 N", "40 N"], right: 0, why: "בשיווי משקל T = m·g = 20 N, ואותה מתיחות בכל החוט, גם ליד הקפיץ." },
    { id: "q.pulley.dir", unit: "springs.pulley", q: "מה הגלגלת האידיאלית עושה לכוח?", a: ["מגדילה אותו", "משנה רק את הכיוון", "מקטינה אותו בחצי"], right: 1, why: "גלגלת אחת קבועה, בלי מסה ובלי חיכוך, רק מסובבת את החוט." },
    { id: "q.graph.slope", unit: "springs.graph", q: "בגרף של כוח (N) מול התארכות (m) של קפיץ, השיפוע הוא…", a: ["k", "המסה", "האנרגיה"], right: 0, why: "F = k·x: קו ישר דרך הראשית, ושיפועו k ביחידות N/m." },
    { id: "q.graph.area", unit: "springs.graph", q: "מה מייצג השטח שמתחת לקו בגרף F מול x?", a: ["את k", "את האנרגיה האלסטית ½kx²", "את זמן המחזור"], right: 1, why: "השטח הוא משולש: ½·x·(kx) = ½kx², העבודה שהושקעה במתיחה." },
    { id: "q.graph.units", unit: "springs.graph", q: "תלו 200 g והקפיץ התארך ב-4 cm (g = 10). מה k?", a: ["5 N/m", "50 N/m", "500 N/m"], right: 1, why: "F = 0.2·10 = 2 N, x = 0.04 m, ולכן k = 2 / 0.04 = 50 N/m. קודם להמיר לגרם→ק״ג וס״מ→מטר!" },
    { id: "q.hooke.double", unit: "springs.hooke", q: "מותחים את הקפיץ פי 2 יותר. הכוח שהקפיץ מפעיל…", a: ["גדל פי 2", "גדל פי 4", "לא משתנה"], right: 0, why: "לפי חוק הוק הכוח יחסי למתיחה: F = k·s." },
    { id: "q.energy.double", unit: "springs.energy", q: "מותחים פי 2 יותר. האנרגיה האלסטית בקפיץ…", a: ["גדלה פי 2", "גדלה פי 4", "גדלה פי 8"], right: 1, why: "E = ½·k·s², ולכן מתיחה כפולה נותנת אנרגיה פי 4." },
    { id: "q.mass.four", unit: "springs.shm", q: "מחליפים לדמות כבדה פי 4, אותו קפיץ. זמן המחזור…", a: ["גדל פי 2", "גדל פי 4", "לא משתנה"], right: 0, why: "T = 2π·√(m/k): מסה פי 4 נותנת שורש של 4, כלומר פי 2." },
    { id: "q.amplitude", unit: "springs.shm", q: "מושכים את הדמות רחוק יותר לפני השחרור. זמן המחזור…", a: ["גדל", "קטן", "לא משתנה"], right: 2, why: "בקפיץ אידאלי זמן המחזור לא תלוי במשרעת, רק ב-m וב-k." },
    { id: "q.k.equilibrium", unit: "springs.hooke", q: "מגדילים את k פי 2. נקודת שיווי המשקל…", a: ["עולה: הקפיץ נמתח חצי", "יורדת: הקפיץ נמתח פי 2", "לא זזה"], right: 0, why: "בשיווי משקל k·s = m·g, ולכן s = mg/k קטן פי 2." },
    { id: "q.wall.stop", unit: "springs.wall", q: "קפיץ אופקי מהקיר, רצפה עם חיכוך. האם הדמות תחזור בדיוק לנקודה שבה הקפיץ רפוי?", a: ["תמיד", "לא בהכרח: היא נעצרת כש-k·|x| ≤ μs·m·g", "רק אם הקפיץ קשיח"], right: 1, why: "כשהקפיץ כבר חלש מהחיכוך הסטטי המרבי, הדמות נשארת תקועה." },
    { id: "q.wall.loss", unit: "springs.wall", q: "בכל חצי תנודה על רצפה עם חיכוך, המשרעת קטנה ב…", a: ["2·μk·m·g / k", "אותו אחוז בכל פעם", "לא קטנה בכלל"], right: 0, why: "החיכוך הקינטי קבוע, ולכן הוא מוריד בכל חצי תנודה אותו מרחק: 2μk·mg/k." },
    { id: "q.moon", unit: "springs.oscillation", q: "על הירח g קטן פי 6. זמן המחזור של הדמות על הקפיץ…", a: ["לא משתנה", "גדל", "קטן"], right: 0, why: "g משנה רק את נקודת שיווי המשקל. T = 2π·√(m/k) לא תלוי ב-g." }
  ];

  const INCLINE_QUESTIONS = SPR.inclineQuestions.map((q) => ({ id: "i." + q.id, unit: "newton.s" + q.stage, stage: q.stage, q: q.question_he, a: q.choices_he, right: q.correct_index, why: q.explanation_he }))
    .concat([{ id: "i.steeper_g", unit: "newton.s2", stage: 2, q: "המדרון נעשה תלול יותר. מה קורה לנורמל N?", a: ["גדל", "קטן, כי N = mg·cosθ", "לא משתנה"], right: 1, why: "cosθ קטן כשהזווית גדלה, ולכן הנורמל קטן." },
             { id: "i.mass_three", unit: "newton.s6", stage: 6, q: "מסה פי 3 ואותו µ על אותו מדרון. התאוצה בהחלקה…", a: ["פי 3", "שליש", "אותה תאוצה"], right: 2, why: "a = g(sinθ − μk·cosθ): המסה מצטמצמת." }]);

  // creatures: species id -> art and physical profile
  const DEFAULT_PHYS = { mass_kg: 1.5, height_m: 0.5, e: 0.5, mu_s: 0.5, mu_k: 0.35, Cd: 1.0, A: 0.03 };
  const meta = (sp) => G.meta(sp) || null;
  const phys = (sp) => (meta(sp) && meta(sp).phys) || DEFAULT_PHYS;
  const nameOf = (sp) => { const m = meta(sp); return m ? (m.name_he || m.id) : sp; };
  const artOf = (sp) => "art/creatures/" + sp + ".webp";
  const RARITY_HE = { common: "רגיל", uncommon: "לא שכיח", rare: "נדיר", epic: "אפי", legendary: "אגדי" };
  const activeSpecies = () => { const a = P.active(); return a ? a.species : G.species(); };

  // ---------------- icons (pencil line, one accent) ----------------
  const ICON_OF = { motion: "arrow", projectiles: "arc", newton: "push", circular: "orbit", gravitation: "planet", momentum: "balls", energy: "coaster", springs: "spring",
    charges: "spark", potential: "lift", circuits: "bulb", batteries: "battery", magnetism: "magnet", induction: "bolt", optics: "prism", waves: "wave", photons: "sun", atoms: "atom", nuclear: "nucleus", lab: "flask" };
  function icon(name, accent = "#8A60E8") {
    const s = `fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`;
    const a = `fill="none" stroke="${accent}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
    const P_ = {
      spring: `<path ${s} d="M16 6h20M16 46h20"/><path ${a} d="M26 6v4l-9 3 18 4-18 4 18 4-18 4 18 4-9 3v6"/>`,
      arrow: `<path ${s} d="M6 36h30"/><circle ${s} cx="14" cy="36" r="5"/><circle ${s} cx="32" cy="36" r="5"/><path ${s} d="M10 31l4-9h14l6 9"/><path ${a} d="M38 16h8M42 12l4 4-4 4"/>`,
      arc: `<path ${s} d="M6 44h40"/><path ${a} stroke-dasharray="3 4" d="M10 40q14-34 32 0"/><circle ${s} cx="42" cy="40" r="3"/>`,
      push: `<rect ${s} x="22" y="22" width="18" height="18" rx="2"/><path ${s} d="M6 44h40"/><path ${a} d="M6 31h12M14 27l4 4-4 4"/>`,
      orbit: `<circle ${s} cx="26" cy="26" r="16"/><circle ${s} cx="26" cy="26" r="3"/><circle ${a} cx="42" cy="26" r="4"/><path ${a} d="M38 14l4 4-4 4" transform="rotate(-50 40 18)"/>`,
      planet: `<circle ${s} cx="26" cy="26" r="11"/><ellipse ${a} cx="26" cy="26" rx="20" ry="6" transform="rotate(-20 26 26)"/>`,
      balls: `<circle ${s} cx="15" cy="28" r="9"/><circle ${s} cx="37" cy="28" r="9"/><path ${a} d="M24 18l2-6M28 18l-2-6M26 13v-3"/>`,
      coaster: `<path ${s} d="M4 44h44"/><path ${a} d="M4 36q10-26 20-8t24-14"/><path ${s} d="M12 44v-14M24 44v-14M36 44v-24"/>`,
      spark: `<path ${s} d="M14 40q-4-14 4-22M38 40q4-14-4-22"/><path ${a} d="M26 8l-4 12h7l-4 12"/>`,
      lift: `<rect ${s} x="12" y="8" width="28" height="36" rx="3"/><path ${a} d="M26 34V18M20 24l6-6 6 6"/>`,
      bulb: `<path ${s} d="M18 30a12 12 0 1 1 16 0c-2 2-3 4-3 7H21c0-3-1-5-3-7z"/><path ${s} d="M21 42h10M22 46h8"/><path ${a} d="M24 30l2-6 2 6"/>`,
      battery: `<rect ${s} x="8" y="16" width="32" height="20" rx="3"/><path ${s} d="M40 22h4v8h-4"/><path ${a} d="M14 26h6M17 23v6M28 26h6"/>`,
      magnet: `<path ${s} d="M12 8v18a14 14 0 0 0 28 0V8h-8v18a6 6 0 0 1-12 0V8z"/><path ${a} d="M12 14h8M32 14h8"/>`,
      bolt: `<path ${a} d="M30 4L14 28h11l-4 20 17-26H27z"/>`,
      prism: `<path ${s} d="M26 10l14 26H12z"/><path ${s} d="M2 26l17-3"/><path ${a} d="M33 26l15-6M33 28l15 0M33 30l15 6"/>`,
      wave: `<path ${a} d="M2 26q6-14 12 0t12 0 12 0 12 0"/><path ${s} d="M2 40h48"/>`,
      sun: `<circle ${a} cx="26" cy="26" r="8"/><path ${s} d="M26 6v6M26 40v6M6 26h6M40 26h6M12 12l4 4M36 36l4 4M40 12l-4 4M16 36l-4 4"/>`,
      atom: `<ellipse ${s} cx="26" cy="26" rx="20" ry="8"/><ellipse ${s} cx="26" cy="26" rx="20" ry="8" transform="rotate(60 26 26)"/><ellipse ${s} cx="26" cy="26" rx="20" ry="8" transform="rotate(-60 26 26)"/><circle cx="26" cy="26" r="3.5" fill="${accent}"/>`,
      nucleus: `<circle ${s} cx="22" cy="22" r="6"/><circle ${a} cx="30" cy="24" r="6"/><circle ${s} cx="25" cy="31" r="6"/><path ${s} d="M40 10l4-4M44 16h4M8 42l-4 4"/>`,
      flask: `<path ${s} d="M20 6h12M22 6v14L10 42a3 3 0 0 0 3 4h26a3 3 0 0 0 3-4L30 20V6"/><path ${a} d="M14 36h24"/>`,
      dice: `<rect ${s} x="8" y="14" width="22" height="22" rx="4" transform="rotate(-12 19 25)"/><rect ${s} x="26" y="18" width="20" height="20" rx="4" transform="rotate(14 36 28)"/><circle cx="15" cy="21" r="1.8" fill="currentColor"/><circle cx="21" cy="27" r="1.8" fill="currentColor"/><circle cx="32" cy="24" r="1.8" fill="currentColor"/><circle cx="40" cy="31" r="1.8" fill="currentColor"/>`,
      compass: `<circle ${s} cx="26" cy="26" r="18"/><path ${a} d="M26 12l5 14-5 14-5-14z"/>`
    };
    return `<svg viewBox="0 0 52 52" aria-hidden="true">${P_[name] || P_.atom}</svg>`;
  }
  const soundIcon = (on) => `<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/>${on ? '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>'}</g></svg>`;

  // ---------------- coins ----------------
  let shownGold = P.gold;
  function paintCoins() { for (const n of document.querySelectorAll(".coins .num")) n.textContent = shownGold; }
  function coinTarget() { const el = !ui.hidden ? $("#uiCoins") : $("#hudCoins"); return el.querySelector(".coin").getBoundingClientRect(); }
  // pays once per eventId; the coins fly only after the reward is saved
  function reward(eventId, amount, from) {
    const bal = P.award(eventId, amount);
    if (bal === null) return false;
    const t = coinTarget(), tx = t.left + t.width / 2, ty = t.top + t.height / 2;
    const fx = from ? from.x : innerWidth / 2, fy = from ? from.y : innerHeight / 2;
    const finish = () => {
      const step = Math.max(1, Math.round(amount / 8)), tick = () => {
        shownGold = Math.min(bal, shownGold + step); paintCoins();
        if (shownGold < bal) setTimeout(tick, 45);
      };
      tick();
      for (const c of document.querySelectorAll(".coins")) { c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }
      G.sfx.sparkle(2);
    };
    const plus = document.createElement("div");
    plus.className = "plus"; plus.textContent = "+" + amount;
    plus.style.left = (reduceMotion ? tx + 18 : fx - 14) + "px"; plus.style.top = (reduceMotion ? ty - 8 : fy - 40) + "px";
    $("#coinLayer").appendChild(plus);
    plus.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none", offset: 0.2 }, { opacity: 0, transform: "translateY(-26px)" }], { duration: 1300, easing: "ease-out" }).onfinish = () => plus.remove();
    if (reduceMotion) { finish(); return true; }
    const n = 10; let landed = 0;
    for (let i = 0; i < n; i++) {
      const c = document.createElement("div");
      c.className = "fly-coin";
      $("#coinLayer").appendChild(c);
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5, r = 40 + Math.random() * 40;
      const sx = fx + Math.cos(a) * r - 11, sy = fy + Math.sin(a) * r * 0.7 - 11;
      const dur = 650 + i * 45;
      c.animate([
        { transform: `translate(${fx - 11}px, ${fy - 11}px) scale(0.4)`, opacity: 0 },
        { transform: `translate(${sx}px, ${sy}px) scale(1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${tx - 11}px, ${ty - 11}px) scale(0.55)`, opacity: 0.95 }
      ], { duration: dur, easing: "cubic-bezier(.3,.1,.3,1)", delay: i * 25 }).onfinish = () => {
        c.remove();
        if (++landed === n) finish();
      };
    }
    return true;
  }

  // ---------------- the spring circus behind the spring lab screens (living-worlds pack) ----------------
  // painted circus, one quiet motion and a companion behind the machine; decoration only
  const lifeStage = (() => { let cur = null, name = null, last = 0;
    return (ctx, W, H, screen) => { if (typeof LifeLayer === "undefined") return;
      if (name !== screen) { name = screen; cur = LifeLayer.create({ place: LifeLayer.springPlace(screen), reduceMotion }); }
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      ctx.save(); cur.back(ctx, W, H, H * 0.86, dt); cur.front(ctx, W, H, H * 0.86); ctx.restore(); }; })();

  // ---------------- navigation ----------------
  const stack = [];
  let current = null, cleanup = null;
  function setTitle(t, sub = "") { $("#uiTitle").textContent = t; $("#uiSub").textContent = sub; }
  function show(name, args = {}, push = true) {
    if (cleanup) { cleanup(); cleanup = null; }
    if (push && current) stack.push(current);
    current = { name, args };
    ui.hidden = false; G.covered = true;
    screenEl.className = ""; void screenEl.offsetWidth; screenEl.className = "screen-in";
    screenEl.scrollTop = 0;
    const tab = { mode: "physics", lever: "physics", card: "physics", lab: "physics", wall: "physics", incline: "physics", ramps: "physics", rscene: "physics", worlds: "physics", world: "physics", wscene: "physics", eworlds: "physics", eworld: "physics", escene: "physics", creatures: "creatures", creature: "creatures", map: "map" }[name];
    for (const b of document.querySelectorAll(".tabs button")) { if (b.dataset.tab === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); }
    SCREENS[name](args);
    paintCoins();
    QS.refresh();
  }

  // ---------------- quick scroll: drag the thumb on the left edge; jump buttons on game screens ----------------
  const QS = (() => {
    const rail = $("#qs"), thumb = rail.querySelector(".qs-thumb"), jump = $("#qjump");
    let fadeT = 0, dragging = false, grabDy = 0;
    const max = () => Math.max(0, screenEl.scrollHeight - screenEl.clientHeight);
    function place() {
      const r = screenEl.getBoundingClientRect(), u = ui.getBoundingClientRect(), m = max();
      const scrollable = m > 40 && !ui.hidden;
      rail.hidden = !scrollable;
      const lab = screenEl.querySelector(":scope > .lab-screen");
      jump.hidden = !(scrollable && lab);
      if (!scrollable) return;
      const top = r.top - u.top, h = r.height;
      rail.style.top = top + "px"; rail.style.height = h + "px";
      const th = Math.max(56, Math.min(110, h * h / screenEl.scrollHeight));
      thumb.style.height = th + "px";
      thumb.style.top = (6 + (h - th - 12) * (m ? screenEl.scrollTop / m : 0)) + "px";
      if (!jump.hidden) {
        jump.style.top = (top + h - 54) + "px";
        // which part is on screen now
        const vis = (el) => { if (!el) return -1; const b = el.getBoundingClientRect(); return Math.max(0, Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top)) / Math.max(1, Math.min(b.height, h)); };
        const parts = { task: lab.querySelector(".mission, .task"), lab: lab.querySelector(".lab"), controls: lab.querySelector(".controls, #controls") };
        let best = "task", bv = -1; for (const k in parts) { const v = vis(parts[k]); if (v > bv) { bv = v; best = k; } }
        for (const b of jump.querySelectorAll("[data-j]")) { b.hidden = !parts[b.dataset.j]; b.setAttribute("aria-current", b.dataset.j === best); }
      }
    }
    // the jump buttons show only while scrolling (and a little after), so they never sit on top of the content
    function wake() { rail.classList.add("live"); jump.classList.remove("away"); clearTimeout(fadeT); fadeT = setTimeout(() => { if (!dragging && !jump.matches(":hover, :focus-within")) { rail.classList.remove("live"); jump.classList.add("away"); } }, 2200); }
    let lastTop = 0;
    screenEl.addEventListener("scroll", () => { place(); if (Math.abs(screenEl.scrollTop - lastTop) > 4) wake(); lastTop = screenEl.scrollTop; }, { passive: true });
    new ResizeObserver(place).observe(screenEl);
    new MutationObserver(() => requestAnimationFrame(place)).observe(screenEl, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "open"] });
    const toY = (clientY) => {
      const r = screenEl.getBoundingClientRect(), th = thumb.offsetHeight, f = (clientY - grabDy - r.top - 6) / Math.max(1, r.height - th - 12);
      screenEl.scrollTop = clamp(f, 0, 1) * max();
    };
    // only the thumb takes touches, so buttons near the left edge keep working
    thumb.addEventListener("pointerdown", (e) => {
      e.preventDefault(); dragging = true; rail.classList.add("drag"); thumb.setPointerCapture(e.pointerId);
      grabDy = e.clientY - thumb.getBoundingClientRect().top; wake();
    });
    thumb.addEventListener("pointermove", (e) => { if (dragging) toY(e.clientY); });
    const end = () => { dragging = false; rail.classList.remove("drag"); wake(); };
    thumb.addEventListener("pointerup", end); thumb.addEventListener("pointercancel", end);
    for (const b of jump.querySelectorAll("[data-j]")) b.addEventListener("click", () => {
      const lab = screenEl.querySelector(":scope > .lab-screen"); if (!lab) return;
      const el = b.dataset.j === "task" ? lab.querySelector(".mission, .task") : b.dataset.j === "lab" ? lab.querySelector(".lab") : lab.querySelector(".controls, #controls");
      if (!el) return;
      const top = b.dataset.j === "task" ? 0 : el.getBoundingClientRect().top - screenEl.getBoundingClientRect().top + screenEl.scrollTop - 6;
      screenEl.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
      el.classList.remove("qs-flash"); void el.offsetWidth; el.classList.add("qs-flash");
      G.sfx.tick && G.sfx.tick();
    });
    jump.classList.add("away");
    // a new screen shows the thumb for a moment (so it is found), the jump bar waits for a real scroll
    return { refresh: () => requestAnimationFrame(() => { place(); jump.classList.add("away"); if (!rail.hidden) { rail.classList.add("live"); clearTimeout(fadeT); fadeT = setTimeout(() => rail.classList.remove("live"), 1600); } }) };
  })();
  function back() {
    if (document.querySelector(".symtip")) { closeSym(); return; }
    if (EX.back()) return;
    if (document.querySelector(".cloud")) { closeInfo(); return; }
    const sheet = document.querySelector(".sheet-back");
    if (sheet) { sheet.remove(); return; }
    if (stack.length) { const s = stack.pop(); show(s.name, s.args, false); }
    else closeUI();
  }
  function closeUI() {
    if (cleanup) { cleanup(); cleanup = null; }
    EX.closeAll();
    ui.hidden = true; G.covered = false; stack.length = 0; current = null;
    syncHud(); QS.refresh();
  }
  function openUI(name, args) { stack.length = 0; current = null; show(name, args, false); }
  $("#uiBack").addEventListener("click", back);
  for (const b of document.querySelectorAll(".tabs button")) b.addEventListener("click", () => {
    const t = b.dataset.tab;
    if (t === "home") return closeUI();
    stack.length = 0; current = null;
    show(t === "physics" ? "mode" : t, {}, false);
  });
  // Android back button
  window.eggBack = () => {
    if (!ui.hidden) { back(); return true; }
    return G.closeBubble();
  };
  // sound on / off (kept with the player's settings)
  function paintSound() { const on = P.data.settings.sound_on !== false; $("#uiSound").innerHTML = soundIcon(on); $("#uiSound").setAttribute("aria-label", on ? "השתקה" : "הפעלת צליל"); G.audio.mute(!on); }
  $("#uiSound").addEventListener("click", () => { P.data.settings.sound_on = P.data.settings.sound_on === false; P.save(); paintSound(); });
  // calculator (always in the top bar, next to the sound button)
  $("#uiCalc").addEventListener("click", () => { closeInfo(); EX.openCalc(); });

  // ---------------- readouts: bolder labels plus the usual English name used in physics ----------------
  const EN = { "התארכות": "Extension", "התארכות x": "Extension", "מתיחה x": "Extension", "דחיסה x": "Compression", "כוח קפיץ": "Spring force", "כוח F": "Force",
    "אנרגיה": "Energy", "אנרגיה כוללת": "Total energy", "זמן מחזור": "Period", "משרעת A": "Amplitude", "ω": "Angular frequency", "מהירות": "Velocity",
    "תאוצה a": "Acceleration", "גובה": "Height", "גובה מרבי": "Max height", "חום": "Heat", "חיכוך": "Friction", "נורמל N": "Normal force",
    "זווית θ": "Angle", "משקולות": "Load", "k מהגרף": "Spring constant", "k שקול": "Equivalent k", "F1 · F2": "Forces", "x1 · x2": "Extensions", "מיקום": "Position", "דרך": "Distance", "זמן": "Time" };
  function englishReadouts(root) {
    for (const sm of root.querySelectorAll(".readout small")) {
      if (sm.querySelector(".en")) continue;
      const he = [...sm.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join("").trim();
      const en = EN[he]; if (!en) continue;
      const tag = document.createElement("span"); tag.className = "en"; tag.lang = "en"; tag.dir = "ltr"; tag.textContent = en; sm.appendChild(tag);
    }
  }
  new MutationObserver(() => englishReadouts(screenEl)).observe(screenEl, { childList: true, subtree: true });

  // ---------------- the home overlay ----------------
  function syncHud() {
    const show = G.hatched() && ui.hidden;
    hud.hidden = !show;
    if (show) { $("#hudMeter").style.width = Math.max(3, overallCoverage() * 100) + "%"; paintCoins(); }
  }
  setInterval(syncHud, 400);
  window.addEventListener("egg:creature", syncHud);
  $("#hudPhysics").addEventListener("click", () => { G.audio.unlock(); G.sfx.pop(); openUI("mode"); });

  // ---------------- screens ----------------
  const SCREENS = {};
  const creatureImg = (sp, cls = "") => `<img class="${cls}" src="${artOf(sp)}" alt="${esc(nameOf(sp))}" draggable="false">`;

  SCREENS.mode = () => {
    setTitle("פיזיקה", "מגלים את החוקים שמסבירים את העולם");
    const sp = activeSpecies();
    const lines = ["בא לך לגלות משהו קטן?", "יש לי הרגשה שהיום נלמד משהו מוזר.", "אני מוכן! בערך."];
    screenEl.innerHTML = `
      <div class="stack">
        <div class="hello">${creatureImg(sp)}<div class="bubble">${lines[Math.floor(Math.random() * lines.length)]}</div></div>
        <h2 style="margin:0;font-size:22px;font-weight:800">איך בא לך לגלות פיזיקה היום?</h2>
        <button class="card mode-card surprise" data-path="surprise" type="button">
          <span class="art">${icon("dice", "#258EF6")}</span>
          <h2>תפתיע אותי</h2>
          <p>ניסוי קטן ומפתיע, בלי להתחייב לשיעור</p>
          <span class="btn primary">למכונת הנושאים</span>
        </button>
        <button class="card mode-card" data-path="ordered" type="button">
          <span class="art">${icon("compass", "#F49A35")}</span>
          <h2>לפי הסדר</h2>
          <p>מסע בנושאים, צעד אחרי צעד</p>
          <span class="btn secondary">להמשיך במסלול</span>
        </button>
        <button class="card mode-card" id="toWorlds" type="button">
          <span class="art">${icon("planet", "#8A60E8")}</span>
          <h2>עולמות המכניקה</h2>
          <p>12 עולמות, 84 מכונות ניסוי. בוחרים עולם ומשחקים.</p>
          <span class="btn secondary">למפת העולמות</span>
        </button>
        <button class="card mode-card" id="toElec" type="button">
          <span class="art">${icon("bolt", "#8A60E8")}</span>
          <h2>עולמות החשמל</h2>
          <p>מטענים, שדות, מעגלים, מגנטיות והשראה: 84 מכונות.</p>
          <span class="btn secondary">למפת החשמל</span>
        </button>
        <div class="card">
          <div class="meter-label"><span>התקדמות כללית בפיזיקה</span><span class="ltr">${Math.round(doneUnits())}/${TOTAL_UNITS}</span></div>
          <div class="meter-row"><span class="meter teal"><i style="width:0"></i></span><span class="pct">${pct(overallCoverage())}</span></div>
        </div>
      </div>`;
    requestAnimationFrame(() => { const i = screenEl.querySelector(".meter i"); if (i) i.style.width = Math.max(2, overallCoverage() * 100) + "%"; });
    $("#toWorlds").addEventListener("click", () => { G.sfx.pop(); show("worlds"); });
    $("#toElec").addEventListener("click", () => { G.sfx.pop(); show("eworlds"); });
    for (const b of screenEl.querySelectorAll(".mode-card[data-path]")) b.addEventListener("click", () => {
      P.data.physics.path = b.dataset.path; P.save(); G.sfx.pop();
      show("lever");
    });
  };
  // the next topic that can actually be played, in the curriculum's order
  const nextOrdered = () => (TOPICS.find((t) => t.ready && familyCoverage(t.id) < 1) || TOPICS.find((t) => t.ready)).id;

  // ======================================================================
  //  THE PHYSICS MACHINE (V3 art): three reels, a lever with three poses, bulbs
  //  Surprise → a random topic that really exists; in order → the next one on the path.
  //  Spinning gives no coins: coins come from discoveries inside the games.
  // ======================================================================
  const REEL_OF = { motion: "motion", projectiles: "force", newton: "ramp", circular: "circle", gravitation: "orbit", momentum: "collision", energy: "energy", springs: "spring",
    charges: "charge", potential: "voltage", circuits: "circuit", batteries: "battery", magnetism: "magnet", induction: "induction", optics: "optics", waves: "waves",
    photons: "photon", atoms: "atom", nuclear: "nucleus", lab: "lab" };
  const M3 = "art/machine/v3_";
  const reelSrc = (id) => `${M3}reel_${REEL_OF[id] || "lab"}.webp`;
  SCREENS.lever = () => {
    const ordered = P.data.physics.path === "ordered";
    setTitle("מכונת הפיזיקה", ordered ? "משיכה אחת: השלב הבא במסלול" : "משיכה אחת: רעיון חדש לגלות");
    const strip = (k) => { const out = []; for (let r = 0; r < 3; r++) for (let n = 0; n < TOPICS.length; n++) out.push(TOPICS[(n + k * 7) % TOPICS.length]); return out; };
    const last = TOPICS.find((t) => t.id === P.data.physics.lastTopic) || TOPICS.find((t) => t.id === nextOrdered());
    screenEl.innerHTML = `
      <div class="m3">
        <div class="m3-stage" id="m3stage">
          <div class="m3-machine" id="m3machine">
            <img class="m3-layer" src="${M3}machine_back.webp" alt="">
            ${[0, 1, 2].map((k) => `<div class="m3-reel" style="left:${[23.1, 41.6, 60.1][k]}%"><div class="m3-strip" id="strip${k}">${strip(k).map((t) => `<img src="${reelSrc(t.id)}" alt="" draggable="false">`).join("")}</div></div>`).join("")}
            <img class="m3-layer" src="${M3}machine_bezel.webp" alt="">
            <img class="m3-layer m3-glints" src="${M3}glass_glints.webp" alt="">
            <div class="m3-label">משוך וגלה!</div>
            <div class="m3-bulbs" id="m3bulbs">${Array.from({ length: 8 }, (_, k) => `<img src="${M3}bulb_${k % 2 ? "off" : "on"}.webp" alt="" style="left:${15.5 + k * 9.6}%">`).join("")}</div>
          </div>
          <div class="m3-lever" id="m3lever" role="button" tabindex="0" aria-label="למשוך את הידית">
            <img id="m3leverImg" src="${M3}lever_up.webp" alt="" draggable="false">
            <svg class="m3-hint" viewBox="0 0 24 60" aria-hidden="true"><path d="M12 4v46M5 42l7 9 7-9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="m3-status" id="m3status" role="status" aria-live="polite" hidden></div>
        </div>
        <button class="btn primary block m3-pull" id="m3pull" type="button">משוך בידית</button>
        <div id="result"></div>
        <div class="card m3-progress">
          <div class="meter-label"><span>התקדמות כללית בפיזיקה</span><span class="ltr">${pct(overallCoverage())}</span></div>
          <span class="meter teal"><i data-w="${overallCoverage()}"></i></span>
          <div class="meter-label" style="margin-top:10px"><span>הנושא הנוכחי: ${esc(last.title_he)}</span><span class="ltr">${pct(familyCoverage(last.id))}</span></div>
          <span class="meter violet"><i data-w="${familyCoverage(last.id)}"></i></span>
        </div>
      </div>`;
    requestAnimationFrame(() => screenEl.querySelectorAll(".m3-progress .meter i").forEach((i) => (i.style.width = Math.max(2, +i.dataset.w * 100) + "%")));
    const strips = [0, 1, 2].map((k) => $("#strip" + k)), machine = $("#m3machine"), leverImg = $("#m3leverImg"), lever = $("#m3lever"), status = $("#m3status");
    const ITEMS = TOPICS.length * 3;
    const pos = [0, 0, 0];
    // reels are percent-positioned: one icon = 100% of the reel's height
    const place = (k, i, dur) => { const el = strips[k]; el.style.transition = dur ? `transform ${dur}s cubic-bezier(.15,.7,.2,1)` : "none"; el.style.transform = `translateY(${-(i / ITEMS) * 100}%)`; pos[k] = i; };
    strips.forEach((_, k) => place(k, TOPICS.length + Math.floor(Math.random() * TOPICS.length), 0));
    const setLever = (v) => { leverImg.src = `${M3}lever_${v > 0.7 ? "down" : v > 0.3 ? "half" : "up"}.webp`; };
    const bulbs = (on) => [...$("#m3bulbs").children].forEach((b, k) => (b.src = `${M3}bulb_${on || k % 2 === 0 ? "on" : "off"}.webp`));
    let spinning = false, blink = 0;
    function spin() {
      if (spinning) return;
      spinning = true; G.audio.unlock();
      $("#result").innerHTML = ""; $("#m3pull").disabled = true;
      // the choice is made first, from topics that really have a game; the reels only show it
      const ready = TOPICS.filter((t) => t.ready);
      const pick = ordered ? TOPICS.find((t) => t.id === nextOrdered()) : ready[Math.floor(Math.random() * ready.length)];
      P.data.physics.lastTopic = pick.id; P.save();
      machine.classList.add("spinning"); setLever(1); bulbs(true);
      status.hidden = false; status.textContent = "מגרילים את הנושא…";
      if (!reduceMotion) { let k = 0; blink = setInterval(() => bulbs(++k % 2 === 0), 140); }
      const durs = reduceMotion ? [0.01, 0.01, 0.01] : [0.95, 1.35, 1.8];
      strips.forEach((el, k) => {
        place(k, pos[k] % TOPICS.length, 0); void el.offsetWidth;
        // land on the picked topic, which sits at (n + 7k) in reel k's order, two laps down
        const n = (TOPICS.indexOf(pick) - k * 7 + TOPICS.length * 3) % TOPICS.length;
        place(k, n + TOPICS.length * 2, durs[k]);
        setTimeout(() => { G.sfx.tick(); G.buzz(12); }, durs[k] * 1000);
      });
      G.sfx.whoosh();
      setTimeout(() => setLever(0.5), 260); setTimeout(() => setLever(0), 520);
      setTimeout(() => {
        clearInterval(blink); bulbs(false); machine.classList.remove("spinning"); spinning = false; $("#m3pull").disabled = false;
        status.textContent = "יצא: " + pick.title_he; G.sfx.boing(0.5); G.buzz(25);
        $("#result").innerHTML = `<div class="result show card m3-result"><img src="${reelSrc(pick.id)}" alt="">
          <h2>${esc(pick.title_he)}</h2><p>${esc(pick.world_he)} · ${pick.subtopics_he.map(esc).join(" · ")}</p>
          <button class="btn primary block" id="play" type="button">בוא נשחק</button></div>`;
        $("#play").addEventListener("click", () => show("card", { topic: pick.id, ordered }));
        $("#result").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
      }, durs[2] * 1000 + 120);
    }
    // the lever: drag down past ~40% of its travel and let go; Enter/Space and the button do the same
    let drag = null, pulled = 0;
    lever.addEventListener("pointerdown", (e) => { if (spinning) return; drag = { y: e.clientY, h: lever.getBoundingClientRect().height * 0.35 }; pulled = 0; lever.setPointerCapture(e.pointerId); G.audio.unlock(); });
    lever.addEventListener("pointermove", (e) => { if (!drag) return; pulled = clamp((e.clientY - drag.y) / drag.h, 0, 1); setLever(pulled); });
    const up = () => { if (!drag) return; drag = null; if (pulled > 0.4) spin(); else setLever(0); };
    lever.addEventListener("pointerup", up); lever.addEventListener("pointercancel", () => { drag = null; setLever(0); });
    lever.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); spin(); } });
    $("#m3pull").addEventListener("click", spin);
    cleanup = () => clearInterval(blink);
  };

  const GAMES = {
    motion: { title: "קינמטיקה: העוגייה בורחת!", name: "העוגייה בורחת!", bubble: "מי הזיז את העוגייה?!", screen: "cookie",
      art: `<svg viewBox="0 0 90 210"><path d="M4 196h82" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><rect x="14" y="176" width="44" height="7" rx="3.5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="22" cy="190" r="5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="50" cy="190" r="5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="74" cy="182" r="9" fill="#E3B26A" stroke="currentColor" stroke-width="2"/><path d="M8 150h40" stroke="#2785C7" stroke-width="3" stroke-linecap="round"/><path d="M42 144l8 6-8 6" fill="none" stroke="#2785C7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
    springs: { title: "קפיצים ואלסטיות", name: "קפיץ־קפוץ", bubble: "תמשוך אותי בעדינות… או שלא!", screen: "lab",
      art: `<svg viewBox="0 0 90 210"><path d="M10 6h70" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M45 6v14l-22 7 44 9-44 9 44 9-44 9 44 9-44 9 44 9-22 7v14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="45" cy="138" r="5" fill="none" stroke="#F49A35" stroke-width="2.6"/></svg>` },
    newton: { title: "מישור משופע, כוחות וחיכוך", name: "הרפתקאות על המדרון", bubble: "18 מדרונות. אחד מהם בטח מחליק.", screen: "ramps",
      art: `<svg viewBox="0 0 90 210"><path d="M4 200h82" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M8 196L84 120v76z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M28 196a20 20 0 0 0-4-12" fill="none" stroke="#F49A35" stroke-width="2.4"/><circle cx="84" cy="120" r="6" fill="#F49A35" stroke="currentColor" stroke-width="2"/></svg>` }
  };
  const worldGame = (id, title, name, bubble, art) => ({ title, name, bubble, screen: id[0] === "E" ? "eworld" : "world", args: { id }, art: `<svg viewBox="0 0 90 210">${art}</svg>` });
  Object.assign(GAMES, {
    projectiles: worldGame("W04", "נפילה וזריקה", "פארק התאוצה", "מי זרק אותי לאוויר?!", `<path d="M4 200h82" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M10 196q34-150 72 0" fill="none" stroke="#F49A35" stroke-width="2.6" stroke-dasharray="5 6"/>`),
    circular: worldGame("W08", "תנועה מעגלית", "קרקס המעגלים", "סחרחורת זה חלק מהניסוי.", `<circle cx="45" cy="120" r="36" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="81" cy="120" r="6" fill="#F49A35"/><path d="M45 120h36" stroke="#8969C6" stroke-width="2.4"/>`),
    gravitation: worldGame("W10", "כבידה", "פלנטריום הכבידה", "למה אני לא נופל מהכוכב?", `<circle cx="45" cy="120" r="18" fill="none" stroke="currentColor" stroke-width="2.6"/><ellipse cx="45" cy="120" rx="40" ry="28" fill="none" stroke="#F49A35" stroke-width="2.2" stroke-dasharray="4 5"/>`),
    momentum: worldGame("W09", "מתקף ותנע", "זירת ההתנגשויות", "בום! ומה נשמר?", `<path d="M4 200h82" fill="none" stroke="currentColor" stroke-width="3"/><rect x="8" y="170" width="30" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="52" y="170" width="30" height="22" rx="4" fill="none" stroke="#F49A35" stroke-width="2.4"/>`),
    charges: worldGame("EW01", "מטענים ושדות", "אקדמיית המטענים", "למה הבלון בורח ממני?", `<circle cx="28" cy="110" r="16" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="64" cy="110" r="16" fill="none" stroke="#F49A35" stroke-width="2.6"/><path d="M22 110h12M58 110h12M64 104v12" stroke="currentColor" stroke-width="2.4"/>`),
    potential: worldGame("EW03", "פוטנציאל וקבלים", "הר הפוטנציאל", "גובה שאינו גובה. מוזר.", `<path d="M6 200q40-160 80 0" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="46" cy="70" r="7" fill="#F49A35"/>`),
    circuits: worldGame("EW05", "מעגלים חשמליים", "עיר האורות", "תדליק לי את האור!", `<rect x="10" y="80" width="70" height="80" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="45" cy="80" r="12" fill="#FFE082" stroke="currentColor" stroke-width="2.4"/>`),
    batteries: worldGame("EW05", "סוללות ומקורות", "סוללה עייפה", "למה הסוללה עייפה?", `<rect x="16" y="100" width="56" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M72 110h6v14h-6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M26 117h12M32 111v12" stroke="#F49A35" stroke-width="2.6"/>`),
    magnetism: worldGame("EW09", "מגנטיות", "לונה פארק לורנץ", "סיבוב בלי שמישהו נגע בי!", `<path d="M10 180q40 0 50-50t20-40" fill="none" stroke="#F49A35" stroke-width="2.6"/><text x="20" y="80" font-size="22" fill="currentColor">⊙ ⊙</text>`),
    induction: worldGame("EW11", "השראה אלקטרומגנטית", "ממלכת הזרם שנולד מתנועה", "הזזתי מגנט ונהיה זרם?!", `<rect x="16" y="90" width="58" height="58" fill="none" stroke="#F49A35" stroke-width="3"/><path d="M45 40v40" stroke="currentColor" stroke-width="3"/>`),
    energy: worldGame("W07", "עבודה ואנרגיה", "בנק האנרגיה", "לאן הלכה האנרגיה שלי?", `<path d="M4 200h82" fill="none" stroke="currentColor" stroke-width="3"/><path d="M6 110q30 0 40 90" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M50 196h34" stroke="#F49A35" stroke-width="6"/>`)
  });
  SCREENS.card = ({ topic = "springs", ordered = false }) => {
    const t = TOPICS.find((x) => x.id === topic), g = GAMES[topic] || GAMES.springs, units = FAMILY_UNITS[topic] || SPRING_UNITS;
    setTitle(g.title, ordered ? "לפי הסדר" : t ? t.world_he : "");
    const sp = activeSpecies(), cov = familyCoverage(topic);
    const isRamp = topic === "newton", isWorld = !FAMILY_UNITS[topic];
    const worldIds = isWorld ? WorldScenes.ALL.concat(typeof ElecScenes !== "undefined" ? ElecScenes.ALL : []).filter((m) => (WorldScenes.byId(m.scene) || ElecScenes.byId(m.scene)).topic === topic).map((m) => m.id) : [];
    const n = isRamp ? rampState().completed.length : isWorld ? worldIds.filter((id) => worldsState().done.includes(id) || elecState().done.includes(id)).length : units.filter((u) => done().includes(u.id)).length;
    const of = isRamp ? RampScenes.ALL.length : isWorld ? worldIds.length : units.length;
    screenEl.innerHTML = `
      <div class="stack intro">
        <div class="scene">
          <div class="bubble">${esc(g.bubble)}</div>
          ${g.art}
          ${creatureImg(sp)}
        </div>
        <h2>${esc(g.name)}${g.name.endsWith("!") ? "" : "!"}</h2>
        ${ordered ? `<p class="path-line">המסלול: ${esc(t.world_he)} ‹ ${esc(t.title_he)} ‹ ${isRamp ? "משימה" : "שלב"} ${Math.min(n + 1, of)} מתוך ${of}</p>` : ""}
        <div class="card" style="text-align:right">
          <div class="meter-label"><span>ההתקדמות שלך בנושא</span><span class="ltr">${n}/${of}</span></div>
          <div class="meter-row"><span class="meter violet"><i style="width:${Math.max(2, cov * 100)}%"></i></span><span class="pct">${pct(cov)}</span></div>
        </div>
        <button class="btn primary block" id="go" type="button">בוא ננסה</button>
      </div>`;
    $("#go").addEventListener("click", () => { G.sfx.pop(); show(g.screen, { topic, ...(g.args || {}) }); });
  };

  SCREENS.creatures = () => {
    setTitle("הדמויות", "כל דמות עם גוף משלה: מסה, גובה, חיכוך");
    const owned = P.owned();
    const ownedSpecies = new Set(owned.map((c) => c.species));
    const act = P.active();
    const list = SPR.creatures.map((c) => c.id);
    for (const c of owned) if (!list.includes(c.species)) list.push(c.species);
    screenEl.innerHTML = `
      <div class="grid2">
        ${list.map((sp) => {
          const m = meta(sp) || {}, mine = ownedSpecies.has(sp), isAct = act && act.species === sp;
          return `<button class="card ctile ${mine ? "" : "locked"} ${isAct ? "active" : ""}" data-sp="${esc(sp)}" type="button">
            <span class="corner">${isAct ? '<span class="tag open">פעילה</span>' : mine ? '<span class="tag">שלך</span>' : ""}</span>
            ${creatureImg(sp)}<b>${esc(nameOf(sp))}</b>
            <span class="tag ${esc(m.rarity || "common")}">${RARITY_HE[m.rarity] || "רגיל"}</span>
          </button>`;
        }).join("")}
      </div>
      <p class="fine" style="margin-top:14px">דמות מגיעה מביצה או מהחלפה עם חבר. המטבעות וההתקדמות שלך לא עוברים עם הדמות.</p>`;
    for (const b of screenEl.querySelectorAll(".ctile")) b.addEventListener("click", () => show("creature", { sp: b.dataset.sp }));
  };

  SCREENS.creature = ({ sp }) => {
    const m = meta(sp) || {}, ph = phys(sp);
    const owned = P.owned().filter((c) => c.species === sp), act = P.active(), isAct = act && act.species === sp;
    setTitle(nameOf(sp), m.theme_he ? "סוג: " + m.theme_he : "");
    screenEl.innerHTML = `
      <div class="stack cdetail">
        <div>${creatureImg(sp, "big")}<h2>${esc(nameOf(sp))}</h2><span class="tag ${esc(m.rarity || "common")}">${RARITY_HE[m.rarity] || "רגיל"}</span></div>
        <div class="card props">
          <div><span>מסה</span><b>m = ${ph.mass_kg} kg</b></div>
          <div><span>משקל על כדור הארץ</span><b>W = mg = ${fmt(ph.mass_kg * 9.81, 1)} N</b></div>
          <div><span>גובה</span><b>${Math.round(ph.height_m * 100)} cm</b></div>
          <div><span>חיכוך עם עץ יבש</span><b>μs ${fmt(ph.mu_s)} · μk ${fmt(ph.mu_k)}</b></div>
          <div><span>אלסטיות בהתנגשות</span><b>e = ${fmt(ph.e)}</b></div>
          <div><span>התנגדות אוויר</span><b>Cd·A = ${fmt(ph.Cd * ph.A, 4)} m²</b></div>
        </div>
        <div class="stack">
          ${owned.length && !isAct ? `<button class="btn primary block" id="choose" type="button">בחר דמות</button>` : ""}
          ${owned.length ? `<button class="btn secondary block" id="compare" type="button">לנסות על המדרון</button>` : ""}
          ${isAct ? `<button class="btn secondary block" id="trade" type="button">החלף עם חבר</button>
             <p class="fine">החלפה ישירה עם טלפון קרוב: הדמות עוברת, המטבעות וההתקדמות נשארים אצלך.</p>` : ""}
          ${!owned.length ? `<p class="fine">הדמות הזאת עוד לא שלך. היא יכולה לצאת מביצה או להגיע בהחלפה עם חבר.</p>` : ""}
        </div>
      </div>`;
    const choose = () => { P.setActive(owned[0].instance_id); G.setCreature(sp); G.sfx.sparkle(3); };
    $("#choose")?.addEventListener("click", () => { choose(); show("creature", { sp }, false); });
    $("#compare")?.addEventListener("click", () => { if (!isAct) choose(); show("incline", { topic: "newton" }); });
    $("#trade")?.addEventListener("click", () => { closeUI(); setTimeout(() => G.openTrade(), 250); });
  };

  SCREENS.map = () => {
    setTitle("המפה", "כמה מהחומר כבר פגשת");
    const worlds = [];
    for (const t of TOPICS) { let w = worlds.find((x) => x.name === t.world_he); if (!w) worlds.push(w = { name: t.world_he, list: [] }); w.list.push(t); }
    const mast = P.data.physics.mastery, attempts = Object.values(mast).reduce((n, m) => n + m.attempts, 0), correct = Object.values(mast).reduce((n, m) => n + m.correct, 0);
    screenEl.innerHTML = `
      <div class="card">
        <div class="meter-label"><span>כיסוי לימודי בפיזיקה</span><span class="ltr">${Math.round(doneUnits())}/${TOTAL_UNITS}</span></div>
        <div class="meter-row"><span class="meter teal"><i style="width:${Math.max(2, overallCoverage() * 100)}%"></i></span><span class="pct">${pct(overallCoverage())}</span></div>
        <p class="fine" style="margin:10px 0 0">זה מד של חומר שפגשת, לא ציון בגרות. ${attempts >= 3 ? `שאלות קטנות: ${correct} נכונות מתוך ${attempts}.` : ""}</p>
      </div>
      ${worlds.map((w) => `<section class="world"><h3>${esc(w.name)}</h3>
        ${w.list.map((t) => {
          const cov = familyCoverage(t.id);
          return `<div class="card fam ${t.ready ? "playable" : ""}" data-topic="${t.id}" ${t.ready ? 'role="button" tabindex="0"' : ""}>
            ${icon(ICON_OF[t.id], t.ready ? "#8A60E8" : "#B9BCC2")}
            <div><b>${esc(t.title_he)}</b><small>${t.subtopics_he.map(esc).join(" · ")}</small>
              ${t.ready ? `<span class="meter thin violet"><i style="width:${Math.max(2, cov * 100)}%"></i></span>` : ""}</div>
            ${t.ready ? `<span class="tag open">${pct(cov)}</span>` : `<span class="tag">בפיתוח</span>`}
          </div>`;
        }).join("")}</section>`).join("")}
      <p class="fine" style="margin-top:16px">המפה היא טיוטה של 20 משפחות נושאים. היא עוד לא אומתה סעיף-סעיף מול תוכנית הלימודים של משרד החינוך.</p>
      <div class="devtools"><h4>כלי פיתוח (לבדיקות בלבד)</h4>
        <button class="btn secondary" id="devAll" type="button">לקבל את כל הדמויות</button>
        <button class="btn secondary" id="devEgg" type="button">ביצה חדשה (המטבעות וההתקדמות נשמרים)</button>
      </div>`;
    for (const f of screenEl.querySelectorAll(".fam.playable")) {
      const go = () => show("card", { topic: f.dataset.topic });
      f.addEventListener("click", go); f.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    }
    $("#devAll").addEventListener("click", () => { P.devOwnAll(SPR.creatures.map((c) => c.id)); G.sfx.sparkle(4); show("creatures", {}, false); });
    $("#devEgg").addEventListener("click", () => { closeUI(); G.newEgg(); });
  };

  // ======================================================================
  //  SHARED: sheets, discoveries, short questions, choosing a creature
  // ======================================================================
  const isSheetOpen = () => !!document.querySelector(".sheet-back");
  function sheet(html, onClose) {
    document.querySelector(".sheet-back")?.remove();
    const back = document.createElement("div");
    back.className = "sheet-back";
    back.innerHTML = `<div class="sheet" role="dialog">${html}</div>`;
    document.body.appendChild(back);
    back.addEventListener("click", (e) => { if (e.target === back || e.target.closest("[data-close]")) { back.remove(); onClose && onClose(); } });
    requestAnimationFrame(() => requestAnimationFrame(() => { for (const i of back.querySelectorAll("[data-w]")) i.style.width = Math.max(2, +i.dataset.w * 100) + "%"; }));
    return back.querySelector(".sheet");
  }
  // a discovery: coins once per unit (only after it is saved), one sentence, the formula on request, both meters
  function celebrateUnits(family, ids, from) {
    const units = FAMILY_UNITS[family], first = units.find((u) => u.id === ids[0]);
    let total = 0;
    ids.forEach((id, i) => { const c = units.find((u) => u.id === id).coins || 10; total += c; setTimeout(() => reward("sub:" + id, c, from), i * 500); });
    G.sfx.harp(); G.buzz(40);
    const fam = familyCoverage(family), all = overallCoverage();
    sheet(`
      <div class="gain"><span class="coin"></span> +${total}</div>
      <h3>גילית: ${esc(ids.map((id) => units.find((u) => u.id === id).he).join(", "))}</h3>
      <p class="insight">${esc(first.insight)}</p>
      <details><summary class="linkish">הצג נוסחה</summary><p class="m" style="font:600 20px 'Cambria Math','Times New Roman',serif;margin:8px 0">${esc(first.eq)}</p></details>
      <div style="display:grid;gap:12px;margin-top:10px">
        <div><div class="meter-label"><span>${esc(FAMILY_TITLE[family])}</span><span class="ltr">${pct(fam)}</span></div><span class="meter violet"><i data-w="${fam}"></i></span></div>
        <div><div class="meter-label"><span>התקדמות כללית בפיזיקה</span><span class="ltr">${pct(all)}</span></div><span class="meter teal"><i data-w="${all}"></i></span></div>
      </div>
      <div class="actions"><button class="btn primary" type="button" data-close>להמשיך לשחק</button></div>`);
    document.querySelectorAll(".sheet .m").forEach(symbolize);
  }
  // one question: +5 the first time it is answered right; a wrong answer costs nothing
  function askQuestion(pool, onAnswer) {
    const solved = new Set(P.data.physics.question_history.filter((h) => h.correct).map((h) => h.id));
    const fresh = pool.filter((q) => !solved.has(q.id));
    const from = fresh.length ? fresh : pool;
    const q = from[Math.floor(Math.random() * from.length)];
    const el = sheet(`<h3>שאלה קטנה</h3><p class="insight">${esc(q.q)}</p>
      <div class="options">${q.a.map((a, i) => `<button type="button" data-i="${i}">${esc(a)}</button>`).join("")}</div>
      <p id="why" hidden></p><div class="actions"><button class="btn quiet" type="button" data-close>דלג</button></div>`);
    for (const b of el.querySelectorAll("[data-i]")) b.addEventListener("click", () => {
      if (el.dataset.answered) return; el.dataset.answered = "1";
      const ok = +b.dataset.i === q.right;
      b.classList.add(ok ? "right" : "wrong");
      if (!ok) el.querySelector(`[data-i="${q.right}"]`).classList.add("right");
      P.recordAnswer(q.id, q.unit, ok);
      const why = el.querySelector("#why"); why.hidden = false; why.textContent = (ok ? "נכון! " : "כמעט. ") + q.why;
      el.querySelector("[data-close]").textContent = "בדוק בניסוי";
      if (ok) { const r = b.getBoundingClientRect(); reward("q:" + q.id, 5, { x: r.left + r.width / 2, y: r.top }); G.sfx.sparkle(3); }
      else G.sfx.hmph(0.4);
      onAnswer && onAnswer(q, ok);
    });
  }
  // more questions as the player covers more of the topic (10% → 45% of sessions), always optional
  function inviteQuestion(box, family, pool, onAnswer) {
    const cov = familyCoverage(family);
    const chance = cov < 0.25 ? 0.10 : cov < 0.5 ? 0.20 : cov < 0.75 ? 0.30 : 0.45;
    if (Math.random() > chance || !pool.length) return false;
    const inv = document.createElement("div");
    inv.className = "card invite";
    inv.innerHTML = `<span>אתה כבר חוקר ותיק. בא לך שאלה קטנה?</span><span><button class="btn primary" style="min-height:40px;padding:0 14px;font-size:15px" type="button" data-yes>כן</button> <button class="btn quiet" type="button" data-no>לא עכשיו</button></span>`;
    box.appendChild(inv);
    const t = setTimeout(() => inv.remove(), 9000);
    inv.querySelector("[data-no]").addEventListener("click", () => { clearTimeout(t); inv.remove(); });
    inv.querySelector("[data-yes]").addEventListener("click", () => { clearTimeout(t); inv.remove(); askQuestion(pool, onAnswer); });
    return true;
  }
  // choose another creature you own (no editing a body: each creature brings its own)
  function pickOwned(sp, title, onPick, extra = "") {
    const owned = P.owned();
    const el = sheet(`<h3>${esc(title)}</h3><p>אותם תנאים. רק הגוף משתנה.</p>
      <div class="pick-list">${owned.map((c) => `<button type="button" data-id="${c.instance_id}" aria-pressed="${c.species === sp}">${creatureImg(c.species)}<span>${esc(nameOf(c.species))}</span><small>${fmt(phys(c.species).mass_kg, 1)} kg</small></button>`).join("")}</div>
      ${owned.length < 2 ? `<p class="fine" style="margin-top:12px">יש לך דמות אחת. דמות נוספת מגיעה מהחלפה עם חבר, ואז ההבדל בפיזיקה מתגלה כאן.</p>` : ""}
      ${extra}<div class="actions"><button class="btn quiet" type="button" data-close>סגור</button></div>`);
    for (const b of el.querySelectorAll("[data-id]")) b.addEventListener("click", () => {
      const c = owned.find((x) => x.instance_id === b.dataset.id);
      el.closest(".sheet-back").remove();
      if (c && c.species !== sp) { P.setActive(c.instance_id); G.setCreature(c.species); onPick(c.species); }
    });
    return el;
  }
  const SCENES = [["hang", "תלוי", "lab"], ["wall", "מהקיר", "wall"], ["launch", "משגר", "launch"], ["pair", "שניים", "pair"], ["ramp", "מסילה", "ramp"], ["graph", "מדידה", "graph"], ["osc", "גרפים", "osc"], ["islope", "מדרון", "islope"], ["two", "תנע", "two"], ["pulley", "גלגלת", "pulley"]];
  const modeSeg = (m) => `<div class="seg seg4" role="group" aria-label="סצנת הקפיץ">${SCENES.map(([id, he]) => `<button type="button" data-m="${id}" aria-pressed="${m === id}">${he}</button>`).join("")}</div>`;
  function bindModeSeg(args) {
    const on = screenEl.querySelector('.seg4 [aria-pressed="true"]'); if (on) on.scrollIntoView({ inline: "center", block: "nearest" });
    for (const b of screenEl.querySelectorAll(".seg [data-m]")) b.addEventListener("click", () => {
      if (b.getAttribute("aria-pressed") === "true") return;
      lab.mode = b.dataset.m; G.sfx.pop();
      show((SCENES.find((x) => x[0] === lab.mode) || SCENES[0])[2], args, false);
    });
  }

  // ======================================================================
  //  EXPLANATION CLOUDS: tap any quantity, slider or part of the drawing
  // ======================================================================
  let infoLive = () => ({});                    // the screen on show provides its current numbers
  const f2 = (x, d = 2) => fmt(x, d);
  const INFO = {
    k: { t: "קשיחות הקפיץ k", p: "כמה ניוטון צריך כדי למתוח את הקפיץ במטר אחד. קפיץ קשיח (k גדול) עשוי מתיל עבה יותר: הוא נמתח פחות תחת אותו משקל, מחזיר חזק יותר ומתנודד מהר יותר. היחידות: N/m.",
      eq: ["F = −k·s", "s_eq = m·g / k", "T = 2π·√(m/k)"], live: (c) => c.k && `עכשיו k = ${c.k} N/m: מתיחה של 10 ס״מ נותנת ${f2(c.k * 0.1, 1)} N.${c.m ? ` ${c.name} נמתח ${f2(c.m * 9.81 / c.k * 100, 1)} ס״מ ומתנודד ב-${f2(2 * Math.PI * Math.sqrt(c.m / c.k))} שנ׳.` : ""}` },
    m: { t: "מסה m", p: "כמות החומר בגוף, בקילוגרמים. היא לא משקל: משקל הוא כוח, W = m·g, בניוטון. מסה גדולה פירושה התמדה גדולה: קשה יותר להאיץ אותה, ולכן התנודה איטית יותר. על הירח המשקל קטן, אבל המסה אותה מסה.",
      eq: ["W = m·g", "T = 2π·√(m/k)", "a = ΣF / m"], live: (c) => c.m && `עכשיו m = ${f2(c.m, 1)} kg, ולכן W = ${f2(c.m * 9.81, 1)} N.${c.m0 && Math.abs(c.m - c.m0) > 0.05 ? ` המסה האמיתית של ${c.name} היא ${f2(c.m0, 1)} kg, והוא רוצה אותה בחזרה.` : ""}` },
    b: { t: "בלימה b", p: "כוח שמתנגד למהירות, כמו תנועה בתוך מים או דבש. בלימה קטנה: התנודה דועכת לאט. כש-b גדול מ-2√(km) כבר אין תנודה בכלל, הגוף פשוט זוחל חזרה (ריסון יתר).",
      eq: ["F_b = −b·v", "b_c = 2·√(k·m)"], live: (c) => c.k && c.m && `כאן ריסון קריטי הוא b = ${f2(2 * Math.sqrt(c.k * c.m), 1)} N·s/m.` },
    s: { t: "התארכות s", p: "כמה הקפיץ ארוך יותר מאורכו הטבעי (כשאף אחד לא מושך אותו). את הכוח ואת האנרגיה מחשבים מ-s, לא מנקודת שיווי המשקל. u היא ההסטה מנקודת שיווי המשקל.",
      eq: ["s = L − L₀", "u = s − s_eq"], live: (c) => c.s !== undefined && `עכשיו s = ${f2(c.s * 100, 1)} ס״מ. שיווי המשקל ב-${f2(c.eq * 100, 1)} ס״מ.` },
    F: { t: "כוח הקפיץ", p: "הקפיץ תמיד מושך או דוחף חזרה לאורכו הטבעי, ולכן יש מינוס בנוסחה. בשיווי משקל הוא מאזן בדיוק את המשקל. ככל שמותחים יותר, הוא חזק יותר באותו יחס (חוק הוק).",
      eq: ["F = −k·s", "k·s_eq = m·g"], live: (c) => c.k && c.s !== undefined && `עכשיו |F| = ${f2(Math.abs(c.k * c.s), 1)} N${c.m ? `, והמשקל ${f2(c.m * 9.81, 1)} N` : ""}.` },
    E: { t: "אנרגיה אלסטית", p: "אנרגיה שאגורה בקפיץ המתוח. היא תלויה בריבוע ההתארכות: פי 2 מתיחה, פי 4 אנרגיה. בתנודה בלי בלימה האנרגיה עוברת בין אלסטית, תנועה (קינטית) וגובה (כובד), והסכום נשמר.",
      eq: ["E = ½·k·s²", "E_k = ½·m·v²", "E_g = m·g·h"], live: (c) => c.k && c.s !== undefined && `עכשיו E = ${f2(0.5 * c.k * c.s * c.s, 2)} J.` },
    T: { t: "זמן מחזור T", p: "הזמן של תנודה שלמה: למטה, למעלה וחזרה. הוא לא תלוי בכמה חזק משכתם (המשרעת) ולא ב-g: רק במסה ובקשיחות. מסה פי 4 נותנת זמן מחזור פי 2.",
      eq: ["T = 2π·√(m/k)", "f = 1/T", "ω = √(k/m)"], live: (c) => c.k && c.m && `עכשיו T = ${f2(2 * Math.PI * Math.sqrt(c.m / c.k))} שנ׳, כלומר ${f2(1 / (2 * Math.PI * Math.sqrt(c.m / c.k)), 2)} תנודות בשנייה.` },
    eq: { t: "שיווי משקל", p: "הנקודה שבה כוח הקפיץ כלפי מעלה שווה בדיוק למשקל. אם משאירים את הדמות שם בלי מהירות, היא לא זזה. אם מזיזים אותה, היא מתנודדת סביב הנקודה הזאת.",
      eq: ["k·s_eq = m·g", "s_eq = m·g / k"], live: (c) => c.eq !== undefined && `עכשיו s_eq = ${f2(c.eq * 100, 1)} ס״מ.` },
    x: { t: "מתיחה x", p: "כמה הקפיץ ארוך או קצר מהאורך הרפוי שלו. x חיובי: הדמות רחוקה מהקיר והקפיץ מושך אותה פנימה. x שלילי: הקפיץ דחוס ודוחף החוצה.",
      eq: ["F = −k·x"], live: (c) => c.x !== undefined && `עכשיו x = ${f2(c.x * 100, 1)} ס״מ.` },
    friction: { t: "חיכוך", p: "כוח בין הרגליים לרצפה, לאורך הרצפה. סטטי: כשהדמות עומדת, הוא בדיוק בגודל שצריך כדי שלא תזוז, עד גבול μs·N. קינטי: כשהיא מחליקה, הוא קבוע, μk·N, ונגד כיוון התנועה. על רצפה אופקית N = m·g.",
      eq: ["f_s ≤ μs·N", "f_k = μk·N", "N = m·g"], live: (c) => c.mus !== undefined && `עכשיו μs = ${f2(c.mus)}, μk = ${f2(c.muk)}. החיכוך הסטטי המרבי: ${f2(c.mus * c.m * 9.81, 1)} N.` },
    surface: { t: "המשטח ומקדמי החיכוך", p: "μ שייך לזוג: הרגליים של הדמות והמשטח. אותה דמות על קרח ועל גומי מקבלת מספרים שונים מאוד. μs (סטטי) בדרך כלל גדול מ-μk (קינטי): קשה יותר להתחיל לזוז מאשר להמשיך.",
      eq: ["f_s ≤ μs·N", "f_k = μk·N"], live: (c) => c.mus !== undefined && `${c.name} על ${c.surface}: μs = ${f2(c.mus)}, μk = ${f2(c.muk)}.` },
    stick: { t: "איפה החיכוך מנצח", p: "אם הקפיץ חלש מהחיכוך הסטטי המרבי, הדמות נשארת תקועה, גם אם היא לא בנקודה הרפויה. לכן היא נעצרת בתוך האזור הזה. בכל חצי תנודה המשרעת קטנה באותו מרחק קבוע.",
      eq: ["|x| ≤ μs·m·g / k", "Δx = 2·μk·m·g / k"], live: (c) => c.zone !== undefined && `כאן: אזור של ±${f2(c.zone * 100, 1)} ס״מ, וכל חצי תנודה מאבדת ${f2(c.loss * 100, 1)} ס״מ.` },
    compress: { t: "דחיסה x", p: "בכמה הקפיץ קצר מהאורך הטבעי שלו. כשהדמות סתם עומדת עליו הוא כבר דחוס ב-mg/k. ככל שדוחסים יותר, נאגרת יותר אנרגיה, בריבוע.",
      eq: ["E = ½·k·x²", "x_rest = m·g / k"], live: (c) => c.c !== undefined && `עכשיו x = ${f2(c.c * 100, 1)} ס״מ, E = ${f2(0.5 * c.k * c.c * c.c, 2)} J. במנוחה: ${f2(c.m * 9.81 / c.k * 100, 1)} ס״מ.` },
    detach: { t: "רגע הניתוק", p: "הקפיץ לא קשור לדמות, הוא רק דוחף. הוא דוחף כל עוד הוא דחוס, ובאורך הטבעי הכוח שלו אפס: שם הדמות עוזבת. כדי להגיע לשם צריך שהאנרגיה האלסטית תספיק להרים את הדמות כל הדרך עד האורך הטבעי: ½kx² > mgx, כלומר x > 2mg/k.",
      eq: ["x > 2·m·g / k", "v² = k·x²/m − 2·g·x"], live: (c) => c.k && `כאן הסף הוא ${f2(2 * c.m * 9.81 / c.k * 100, 1)} ס״מ.` },
    height: { t: "הגובה המרבי", p: "בשיא הגובה המהירות אפס, וכל האנרגיה של הקפיץ הפכה לאנרגיית גובה (בלי חיכוך אוויר). לכן מודדים את הגובה מנקודת ההתחלה הדחוסה.",
      eq: ["½·k·x² = m·g·h", "h = k·x² / (2·m·g)"], live: (c) => c.h !== undefined && `בניסוי האחרון: h = ${f2(c.h * 100, 1)} ס״מ מעל נקודת ההתחלה.` },
    slope: { t: "השיפוע של הגרף", p: "בגרף כוח מול התארכות, כל נקודה היא מדידה אחת. הן יושבות (בערך) על קו ישר דרך הראשית. השיפוע, כמה ניוטון נוספים לכל מטר, הוא k. הנקודות לא בדיוק על הקו כי לכל מדידה יש שגיאה קטנה בקריאת הסרגל.",
      eq: ["k = ΔF / Δx", "F = k·x"], live: (c) => c.fit && `מהנקודות: k ≈ ${f2(c.fit, 0)} N/m. הקפיץ האמיתי: ${c.k} N/m.` },
    area: { t: "השטח מתחת לקו", p: "השטח מתחת לגרף כוח מול התארכות הוא העבודה שעשינו כדי למתוח, והיא נאגרת בקפיץ. זה משולש: חצי בסיס כפול גובה.",
      eq: ["E = ½·x·F", "E = ½·k·x²"], live: (c) => c.xmax && `עד ${f2(c.xmax * 100, 1)} ס״מ: E = ${f2(0.5 * c.k * c.xmax * c.xmax, 3)} J.` },
    series: { t: "קפיצים בטור", p: "אחד מתחת לשני. אותו כוח עובר דרך שניהם, כי כל קפיץ מחזיק את מה שתלוי מתחתיו. כל אחד נמתח x = F/k, ולכן הרך נמתח יותר. ההתארכות הכוללת היא הסכום, ולכן הזוג רך יותר מכל אחד לבד.",
      eq: ["F1 = F2 = F", "x = x1 + x2", "1/k_eq = 1/k1 + 1/k2"], live: (c) => c.keq && `כאן: 1/k_eq = 1/${c.k1} + 1/${c.k2}, ולכן k_eq = ${f2(c.keq, 1)} N/m.` },
    parallel: { t: "קפיצים במקביל", p: "זה לצד זה, מחוברים לאותו מוט קשיח. לכן שניהם נמתחים בדיוק אותו מרחק. כל אחד מושך F = k·x, והכוחות מתחברים: הזוג קשיח יותר מכל אחד לבד, והקשיח מחזיק יותר מהמשקל.",
      eq: ["x1 = x2 = x", "F = F1 + F2", "k_eq = k1 + k2"], live: (c) => c.keq && `כאן: k_eq = ${c.k1} + ${c.k2} = ${f2(c.keq, 0)} N/m.` },
    keq: { t: "קבוע הקפיץ השקול k_eq", p: "קפיץ יחיד שהיה מתנהג בדיוק כמו הזוג: אותה התארכות תחת אותו משקל, ואותו זמן מחזור. בטור הוא קטן מהקטן מביניהם, ובמקביל גדול מהגדול.",
      eq: ["בטור: 1/k_eq = 1/k1 + 1/k2", "במקביל: k_eq = k1 + k2", "T = 2π·√(m/k_eq)"], live: (c) => c.keq && `עכשיו (${c.how === "series" ? "בטור" : "במקביל"}): k_eq = ${f2(c.keq, 1)} N/m.` },
    pairF: { t: "הכוח בכל קפיץ", p: "בטור: אותו כוח בשניהם, ושווה לכוח שהזוג מפעיל על הדמות. במקביל: כל קפיץ מושך חלק, F_i = k_i·x, והסכום שווה לכוח על הדמות.",
      eq: ["בטור: F1 = F2", "במקביל: F1 + F2 = F"], live: (c) => c.F1 !== undefined && `עכשיו F1 = ${f2(c.F1, 1)} N, F2 = ${f2(c.F2, 1)} N.` },
    pairX: { t: "ההתארכות של כל קפיץ", p: "בטור: כל קפיץ נמתח לפי הקשיחות שלו, x_i = F/k_i, ומחברים. במקביל: המוט הקשיח מכריח את שניהם להימתח אותו דבר.",
      eq: ["בטור: x = x1 + x2", "במקביל: x1 = x2"], live: (c) => c.x1 !== undefined && `עכשיו x1 = ${f2(c.x1 * 100, 1)} ס״מ, x2 = ${f2(c.x2 * 100, 1)} ס״מ.` },
    xt: { t: "גרף מיקום x(t)", p: "איפה הדמות בכל רגע, ביחס לנקודת שיווי המשקל. זה גל קוסינוס: מתחיל בקצה (A), עובר באפס, מגיע ל-−A וחוזר. הזמן בין שני שיאים הוא T.",
      eq: ["x = A·cos(ω·t)", "T = 2π/ω"], live: (c) => c.A !== undefined && `עכשיו x = ${f2(c.x * 100, 1)} ס״מ, A = ${f2(c.A * 100, 1)} ס״מ.` },
    vt: { t: "גרף מהירות v(t)", p: "השיפוע של גרף x. כש-x בשיא (קצה), השיפוע אפס: v = 0. כש-x עובר באפס, הוא הכי תלול: v מקסימלית. לכן הגרף מוזז ברבע מחזור מ-x.",
      eq: ["v = −A·ω·sin(ω·t)", "v_max = ω·A"], live: (c) => c.A !== undefined && `v_max = ${f2(c.w * c.A, 2)} m/s. עכשיו v = ${f2(c.v, 2)} m/s.` },
    at: { t: "גרף תאוצה a(t)", p: "תמונת ראי של x: הקפיץ תמיד מושך חזרה לאמצע, ולכן התאוצה הפוכה למיקום. בקצוות היא הכי גדולה, באמצע היא אפס.",
      eq: ["a = −ω²·x", "a_max = ω²·A", "ΣF = m·a = −k·x"], live: (c) => c.A !== undefined && `a_max = ${f2(c.w * c.w * c.A, 2)} m/s².` },
    Et: { t: "גרף אנרגיה E(t)", p: "כתום: אנרגיה קינטית (תנועה). ירוק: אנרגיה בקפיץ. סגול: הסכום. הן מתחלפות פעמיים בכל מחזור. בלי בלימה הסגול ישר ושטוח. עם בלימה הוא יורד: האנרגיה הופכת לחום.",
      eq: ["E_k = ½·m·v²", "E_p = ½·k·x²", "E = ½·k·A²"], live: (c) => c.E !== undefined && `עכשיו E = ${f2(c.E, 2)} J.` },
    omega: { t: "תדירות זוויתית ω", p: "כמה מהר התנודה 'מסתובבת', ברדיאנים לשנייה. סיבוב שלם הוא 2π, ולכן ω = 2π/T. היא תלויה רק ב-k וב-m.",
      eq: ["ω = √(k/m)", "ω = 2π/T", "f = ω / 2π"], live: (c) => c.w && `עכשיו ω = ${f2(c.w, 2)} rad/s, T = ${f2(2 * Math.PI / c.w)} שנ׳.` },
    amp: { t: "משרעת A", p: "המרחק הכי גדול מנקודת שיווי המשקל, איפה ששחררתם. היא לא משנה את זמן המחזור! היא קובעת את המהירות המרבית, התאוצה המרבית והאנרגיה.",
      eq: ["E = ½·k·A²", "v_max = ω·A", "a_max = ω²·A"], live: (c) => c.A !== undefined && `עכשיו A = ${f2(c.A * 100, 1)} ס״מ.` },
    heat: { t: "חום מחיכוך Q", p: "החיכוך הקינטי פועל נגד התנועה לאורך כל הדרך. העבודה שלו הופכת אנרגיה לחום. כל מטר על רצפה מוסיף μk·m·g ג׳אול, ועל המדרון פחות, כי שם N = mg·cosθ.",
      eq: ["Q = f_k·d", "f_k = μk·N"], live: (c) => c.Q !== undefined && `עד עכשיו: Q = ${f2(c.Q, 2)} J. μk = ${f2(c.muk)}.` },
    energyBars: { t: "לאן הלכה האנרגיה?", p: "כל עמודה היא סוג אנרגיה. הסגולה מימין היא הסכום שלהן, והקו הסגול הוא מה שהיה בקפיץ בהתחלה. מה שיורד מעמודה אחת עולה באחרת: האנרגיה נשמרת.",
      eq: ["E_el = ½·k·x²", "E_k = ½·m·v²", "E_g = m·g·h", "Q = μk·N·d"], live: () => "" },
    momentum: { t: "תנע p", p: "מסה כפול מהירות, כולל כיוון. כשאין כוחות חיצוניים, התנע הכולל של המערכת לא משתנה. הקפיץ הוא כוח פנימי: דוחף את שניהם באותו כוח לכיוונים מנוגדים.",
      eq: ["p = m·v", "m1·v1 + m2·v2 = 0", "v1 / v2 = −m2 / m1"], live: (c) => c.m1 && `עכשיו: p1 + p2 = ${f2(c.p, 2)} kg·m/s.` },
    tension: { t: "מתיחות בחוט T", p: "הכוח שהחוט מושך בו בכל קצה. בחוט בלי מסה המתיחות זהה לכל אורכו, גם אחרי שהוא מתעקם על גלגלת. כאן היא שווה בדיוק לכוח הקפיץ.",
      eq: ["T = k·x", "m·a = m·g − T"], live: (c) => c.T !== undefined && `עכשיו T = ${f2(c.T, 1)} N, והמשקל ${f2(c.m * 9.81, 1)} N.` },
    pulley: { t: "גלגלת אידיאלית", p: "גלגל קטן שהחוט עובר מעליו. אידיאלית: בלי מסה ובלי חיכוך. היא לא מגדילה ולא מקטינה את הכוח, רק משנה את הכיוון שלו: הדמות מושכת למטה, והקפיץ מרגיש משיכה הצידה.",
      eq: ["T₁ = T₂ = T"], live: () => "" },
    kin_x: { t: "מיקום x", p: "איפה הדמות על המסילה, ביחס לנקודת האפס. יכול להיות שלילי (משמאל לאפס). העתק הוא ההפרש בין מיקומים, Δx = x − x0, ודרך היא כמה באמת נסעת, בלי סימנים.",
      eq: ["Δx = x − x0", "דרך = Σ|Δx|"], live: (c) => c.x !== undefined && `עכשיו x = ${f2(c.x, 2)} m, ודרך ${f2(c.d, 2)} m.` },
    kin_v: { t: "מהירות v", p: "בכמה מטר המיקום משתנה בכל שנייה, כולל כיוון: חיובית ימינה, שלילית שמאלה. בלי כוח שקול (בלי דחיפה ובלי חיכוך) היא לא משתנה.",
      eq: ["v = Δx / Δt", "x = x0 + v·t"], live: (c) => c.v !== undefined && `עכשיו v = ${f2(c.v, 2)} m/s.` },
    kin_a: { t: "תאוצה a", p: "בכמה המהירות משתנה בכל שנייה. כוח קבוע נותן תאוצה קבועה: a = F/m. זהירות: a שלילית לא תמיד אומרת 'מאט'. אם גם v שלילית, הגוף דווקא מאיץ שמאלה.",
      eq: ["a = Δv / Δt", "v = v0 + a·t", "a = ΣF / m"], live: (c) => c.m && `עכשיו a = ${f2(c.a, 2)} m/s². המסה הכוללת (דמות + סקייטבורד): ${f2(c.m, 1)} kg.` },
    kin_d: { t: "דרך מול העתק", p: "דרך היא כל המטרים שנסעת, תמיד חיובית. העתק הוא רק מאיפה לאן. אם נוסעים 5 ימינה ו-3 שמאלה: דרך 8, העתק +2.",
      eq: ["v̄ = Δx / Δt", "גודל מהירות ממוצעת = דרך / Δt"], live: (c) => c.d !== undefined && `עכשיו: דרך ${f2(c.d, 2)} m.` },
    kin_rel: { t: "תנועה יחסית", p: "כדי לדעת אם תשיג את העוגייה, מסתכלים על הפער. הוא משתנה בקצב של ההפרש בין המהירויות. אם אתה מהיר יותר, הפער נסגר. אם שווים, הוא נשאר.",
      eq: ["v_rel = v_cookie − v_creature", "t = פער / (v_creature − v_cookie)"], live: (c) => c.gap !== undefined && `עכשיו הפער ${f2(c.gap, 2)} m.` },
    kin_xt: { t: "גרף מקום-זמן", p: "השיפוע בכל נקודה הוא המהירות. קו ישר = מהירות קבועה. קו שמתעקם כלפי מעלה = מאיץ. שיפוע שלילי = נוסע שמאלה.",
      eq: ["v = Δx / Δt (שיפוע)"], live: () => "" },
    kin_vt: { t: "גרף מהירות-זמן", p: "השיפוע הוא התאוצה. השטח בין הקו לציר הזמן הוא ההעתק: מעל הציר נחשב פלוס (כחול), מתחת מינוס (אדום). כדי לקבל דרך מחברים את השטחים בערך מוחלט.",
      eq: ["a = Δv / Δt (שיפוע)", "Δx = שטח חתום"], live: (c) => c.x !== undefined && `בנסיעה הזאת: Δx = ${f2(c.x, 2)} m.` },
    kin_at: { t: "גרף תאוצה-זמן", p: "השטח בין הקו לציר הוא שינוי המהירות Δv, לא העתק. דחיפה = מלבן מעל הציר, בלימה = מלבן מתחת.",
      eq: ["Δv = שטח חתום", "Δv = a·Δt"], live: () => "" },
    weights: { t: "משקולות כיול", p: "ציוד מעבדה עם מסה ידועה. כל משקולת של 100 g מוסיפה משקל של 0.981 N. הן לא משנות את הדמות: הדמות רק מחזיקה את הסרגל ורושמת.",
      eq: ["W = m·g", "100 g = 0.1 kg"], live: (c) => c.n !== undefined && `עכשיו תלויות ${c.n} משקולות: ${f2(c.n * 0.1, 1)} kg, ${f2(c.n * 0.981, 2)} N.` },
    theta: { t: "זווית המדרון θ", p: "הזווית בין המדרון לאופק. כשהיא גדלה, הרכיב של הכובד במורד (mg·sinθ) גדל והנורמל (mg·cosθ) קטן. הכובד עצמו לא משתנה. הגוף מתחיל להחליק כש-tanθ עובר את μs.",
      eq: ["mg·sinθ", "N = mg·cosθ", "tanθ_c = μs"], live: (c) => c.deg !== undefined && `עכשיו θ = ${c.deg}°, tanθ = ${f2(Math.tan(c.deg * Math.PI / 180))}. הסף של ${c.name}: ${f2(c.crit, 1)}°.` },
    N: { t: "כוח נורמל N", p: "המשטח דוחף את הגוף בניצב אליו, כדי שלא ייכנס לתוכו. במדרון בלי כוחות נוספים N = mg·cosθ. הוא לא 'התגובה' לכובד: שניהם פועלים על אותו גוף. התגובה לנורמל היא הלחץ של הדמות על המשטח.",
      eq: ["N = mg·cosθ", "ΣF⊥ = N − mg·cosθ = 0"], live: (c) => c.N !== undefined && `עכשיו N = ${f2(c.N, 1)} N מתוך משקל של ${f2(c.W, 1)} N.` },
    finc: { t: "חיכוך על המדרון", p: "בזמן מנוחה החיכוך הסטטי שווה בדיוק לרכיב במורד, mg·sinθ, ולא תמיד ל-μs·N: זה רק הגבול. כשהרכיב עובר את הגבול, הגוף מחליק והחיכוך הופך לקינטי, μk·N, כלפי מעלה במדרון.",
      eq: ["f_s = mg·sinθ ≤ μs·N", "f_k = μk·N"], live: (c) => c.fsMax !== undefined && (c.holds ? `עכשיו f_s = ${f2(c.f, 1)} N מתוך מקסימום ${f2(c.fsMax, 1)} N.` : `עכשיו הוא מחליק: f_k = ${f2(c.fk, 1)} N.`) },
    a: { t: "תאוצה a", p: "החוק השני של ניוטון לאורך המדרון: הכוח השקול מחולק במסה. בהחלקה המסה מצטמצמת מהמשוואה, ולכן שתי דמויות עם אותו μ מאיצות באותה מידה, גם אם אחת כבדה פי 4.",
      eq: ["ΣF = m·a", "a = g·(sinθ − μk·cosθ)", "v = a·t ,  d = ½·a·t²"], live: (c) => c.deg !== undefined && (c.holds ? "עכשיו הוא במנוחה: a = 0." : `עכשיו a = ${f2(c.a, 2)} m/s².`) },
    forces: { t: "הכוחות על הדמות", p: "רק שלושה כוחות אמיתיים: הכובד mg (תמיד אנכי למטה), הנורמל N (בניצב למשטח) והחיכוך f (לאורך המשטח). בתצוגת 'רכיבי mg' רואים את הכובד מפורק לשני חלקים, אבל זה אותו כוח, לא כוחות נוספים.",
      eq: ["mg ↓", "N ⟂ משטח", "f ∥ משטח", "mg = mg·sinθ + mg·cosθ (וקטורית)"], live: (c) => c.W !== undefined && `mg = ${f2(c.W, 1)} N · N = ${f2(c.N, 1)} N · f = ${f2(c.f, 1)} N` }
  };
  // ======================================================================
  //  EVERY LETTER IN A FORMULA IS TAPPABLE: what it stands for, and its unit
  // ======================================================================
  const SYM = {
    F:   { n: "כוח (Force)", d: "דחיפה או משיכה. יש לו גודל וכיוון (וקטור). בנוסחאות של קפיץ זה הכוח שהקפיץ מפעיל.", u: "N", un: "ניוטון", si: "kg·m/s²" },
    k:   { n: "קבוע הקפיץ / קשיחות", d: "כמה ניוטון צריך כדי למתוח את הקפיץ במטר אחד. מאפיין את הקפיץ, לא את הגוף.", u: "N/m", un: "ניוטון למטר", si: "kg/s²" },
    s:   { n: "התארכות הקפיץ", d: "בכמה הקפיץ ארוך מהאורך הטבעי שלו. בספרים מסמנים גם Δx או Δl.", u: "m", un: "מטר", si: "m" },
    x:   { n: "מיקום / מתיחה", d: "המרחק מהנקודה שבה הקפיץ רפוי. חיובי = מתוח, שלילי = דחוס.", u: "m", un: "מטר", si: "m" },
    "Δx": { n: "שינוי במיקום", d: "Δ (דלתא) פירושה 'שינוי ב-'. Δx = מיקום סופי פחות מיקום התחלתי.", u: "m", un: "מטר", si: "m" },
    m:   { n: "מסה (mass)", d: "כמות החומר בגוף. לא תלויה במקום: על הירח אותה מסה. היא קובעת את ההתמדה.", u: "kg", un: "קילוגרם", si: "kg" },
    g:   { n: "תאוצת הכובד", d: "כמה מהר המהירות של גוף נופל גדלה בכל שנייה. ליד כדור הארץ g ≈ 9.81, ובבגרות לרוב 10.", u: "m/s²", un: "מטר לשנייה בריבוע", si: "m/s²" },
    W:   { n: "משקל (Weight)", d: "הכוח שכדור הארץ מושך בו את הגוף, W = m·g. זה כוח, לא מסה.", u: "N", un: "ניוטון", si: "kg·m/s²" },
    N:   { n: "כוח נורמל", d: "הכוח שהמשטח דוחף בו את הגוף, ניצב (90°) למשטח. בתוך יחידה, N היא גם קיצור של ניוטון.", u: "N", un: "ניוטון", si: "kg·m/s²" },
    E:   { n: "אנרגיה", d: "היכולת לבצע עבודה. בקפיץ: אנרגיה אלסטית שאגורה במתיחה.", u: "J", un: "ג׳אול", si: "kg·m²/s²" },
    E_k: { n: "אנרגיה קינטית", d: "אנרגיה של תנועה, ½·m·v². גדלה פי 4 כשהמהירות גדלה פי 2.", u: "J", un: "ג׳אול", si: "kg·m²/s²" },
    E_g: { n: "אנרגיה פוטנציאלית כובדית", d: "אנרגיה של גובה, m·g·h, מדודה מגובה שבוחרים כאפס.", u: "J", un: "ג׳אול", si: "kg·m²/s²" },
    h:   { n: "גובה", d: "הגובה מעל רמת הייחוס שבחרנו כאפס.", u: "m", un: "מטר", si: "m" },
    v:   { n: "מהירות (velocity)", d: "כמה מטר עוברים בשנייה, וגם לאיזה כיוון.", u: "m/s", un: "מטר לשנייה", si: "m/s" },
    a:   { n: "תאוצה (acceleration)", d: "בכמה המהירות משתנה בכל שנייה. a = ΣF / m.", u: "m/s²", un: "מטר לשנייה בריבוע", si: "m/s²" },
    t:   { n: "זמן", d: "הזמן שעבר מההתחלה.", u: "s", un: "שנייה", si: "s" },
    d:   { n: "מרחק (displacement)", d: "כמה הגוף התקדם לאורך המסלול.", u: "m", un: "מטר", si: "m" },
    T:   { n: "זמן מחזור (Period)", d: "הזמן של תנודה שלמה אחת: הלוך, חזור ובחזרה לאותה נקודה.", u: "s", un: "שנייה", si: "s" },
    f:   { n: "f: חיכוך, או תדירות", d: "ליד μ ו-N, f הוא כוח החיכוך (ניוטון). ב-f = 1/T, f היא תדירות: כמה תנודות בשנייה (הרץ).", u: "N  או  Hz", un: "ניוטון / הרץ", si: "kg·m/s²  או  1/s" },
    f_s: { n: "חיכוך סטטי", d: "החיכוך כשהגוף לא זז. גודלו בדיוק מה שצריך כדי לעצור תזוזה, עד מקסימום μs·N.", u: "N", un: "ניוטון", si: "kg·m/s²" },
    f_k: { n: "חיכוך קינטי", d: "החיכוך כשהגוף מחליק. קבוע: μk·N, ומכוון נגד התנועה.", u: "N", un: "ניוטון", si: "kg·m/s²" },
    "μs": { n: "מקדם חיכוך סטטי", d: "מספר בלי יחידות שמתאר את הזוג: הרגליים והמשטח. גדול יותר = קשה יותר להתחיל לזוז.", u: "—", un: "חסר יחידות", si: "—" },
    "μk": { n: "מקדם חיכוך קינטי", d: "מספר בלי יחידות. בדרך כלל קטן מ-μs: קל יותר להמשיך להחליק מאשר להתחיל.", u: "—", un: "חסר יחידות", si: "—" },
    "θ": { n: "θ (תטא): זווית", d: "זווית המדרון ביחס לאופק. במחשבון: לוודא שהוא במצב מעלות (DEG).", u: "°", un: "מעלות (או רדיאנים)", si: "rad" },
    "θ_c": { n: "זווית הסף", d: "הזווית שבה הגוף בדיוק מתחיל להחליק: tanθ_c = μs.", u: "°", un: "מעלות", si: "rad" },
    sin: { n: "סינוס", d: "במשולש ישר זווית: הניצב שמול הזווית חלקי היתר. כאן הוא נותן את חלק הכובד שבמורד המדרון.", u: "—", un: "מספר בין −1 ל-1", si: "—" },
    cos: { n: "קוסינוס", d: "הניצב שליד הזווית חלקי היתר. כאן הוא נותן את חלק הכובד שלוחץ אל המשטח.", u: "—", un: "מספר בין −1 ל-1", si: "—" },
    tan: { n: "טנגנס", d: "sin חלקי cos: הניצב שמול הזווית חלקי הניצב שלידה.", u: "—", un: "מספר", si: "—" },
    s_eq: { n: "התארכות בשיווי משקל", d: "כמה הקפיץ נמתח כשהגוף תלוי עליו במנוחה: k·s_eq = m·g.", u: "m", un: "מטר", si: "m" },
    b:   { n: "מקדם בלימה", d: "כמה חזק החומר שמסביב מאט את הגוף. כוח הבלימה −b·v.", u: "N·s/m", un: "ניוטון־שנייה למטר", si: "kg/s" },
    b_c: { n: "בלימה קריטית", d: "הבלימה שבה בדיוק אין יותר תנודה: 2√(k·m).", u: "N·s/m", un: "ניוטון־שנייה למטר", si: "kg/s" },
    F_b: { n: "כוח בלימה", d: "כוח שמתנגד למהירות, כמו תנועה בתוך מים.", u: "N", un: "ניוטון", si: "kg·m/s²" },
    "ω": { n: "ω (אומגה): תדירות זוויתית", d: "כמה רדיאנים 'מסתובבת' התנודה בשנייה. ω = 2π/T = √(k/m).", u: "rad/s", un: "רדיאן לשנייה", si: "1/s" },
    "π": { n: "π (פאי)", d: "קבוע, בערך 3.14: היחס בין היקף מעגל לקוטר שלו. מופיע כי תנודה היא כמו תנועה במעגל.", u: "—", un: "מספר קבוע", si: "—" },
    "ΣF": { n: "הכוח השקול", d: "Σ (סיגמה) = 'סכום של'. מחברים את כל הכוחות כווקטורים.", u: "N", un: "ניוטון", si: "kg·m/s²" },
    "ΣF⊥": { n: "סכום הכוחות בניצב למשטח", d: "רק החלקים של הכוחות שניצבים למדרון. כשהגוף לא קופץ ולא שוקע, הסכום הזה הוא אפס.", u: "N", un: "ניוטון", si: "kg·m/s²" },
    L:   { n: "אורך הקפיץ", d: "האורך הנוכחי של הקפיץ.", u: "m", un: "מטר", si: "m" },
    "L₀": { n: "אורך טבעי", d: "האורך של הקפיץ כשאף כוח לא פועל עליו.", u: "m", un: "מטר", si: "m" },
    x0:  { n: "מיקום התחלתי", d: "איפה הגוף היה ב-t = 0.", u: "m", un: "מטר", si: "m" },
    v0:  { n: "מהירות התחלתית", d: "המהירות ב-t = 0, עם סימן.", u: "m/s", un: "מטר לשנייה", si: "m/s" },
    v_avg: { n: "מהירות ממוצעת", d: "העתק חלקי זמן. עם כיוון.", u: "m/s", un: "מטר לשנייה", si: "m/s" },
    speed_avg: { n: "גודל מהירות ממוצעת", d: "דרך כוללת חלקי זמן. תמיד חיובי.", u: "m/s", un: "מטר לשנייה", si: "m/s" },
    a_avg: { n: "תאוצה ממוצעת", d: "שינוי המהירות חלקי הזמן.", u: "m/s²", un: "מטר לשנייה בריבוע", si: "m/s²" },
    "Δv": { n: "שינוי במהירות", d: "מהירות סופית פחות התחלתית.", u: "m/s", un: "מטר לשנייה", si: "m/s" },
    "Δt": { n: "משך זמן", d: "זמן סיום פחות זמן התחלה.", u: "s", un: "שנייה", si: "s" },
    t_stop: { n: "זמן עצירה", d: "כמה זמן לוקח לעצור בתאוטה קבועה: |v0/a|.", u: "s", un: "שנייה", si: "s" },
    d_stop: { n: "מרחק עצירה", d: "כמה מטר עוברים עד שעוצרים: v0²/(2|a|). פי 2 מהירות, פי 4 מרחק.", u: "m", un: "מטר", si: "m" },
    v_rel: { n: "מהירות יחסית", d: "המהירות של אחד כפי שהשני רואה אותה: ההפרש ביניהן.", u: "m/s", un: "מטר לשנייה", si: "m/s" },
    v_relative: { n: "מהירות יחסית", d: "המהירות של העוגייה כפי שהדמות רואה אותה.", u: "m/s", un: "מטר לשנייה", si: "m/s" },
    v_cookie: { n: "מהירות העוגייה", d: "קבועה בשלב הזה: 1.2 m/s ימינה.", u: "m/s", un: "מטר לשנייה", si: "m/s" },
    v_creature: { n: "מהירות הדמות", d: "המהירות שלך על הסקייטבורד.", u: "m/s", un: "מטר לשנייה", si: "m/s" },
    total_distance: { n: "דרך כוללת", d: "כל המטרים שעברת, בלי סימנים.", u: "m", un: "מטר", si: "m" },
    m1:  { n: "מסת הגוף הראשון", d: "הדמות שלך.", u: "kg", un: "קילוגרם", si: "kg" },
    m2:  { n: "מסת הגוף השני", d: "העגלה, או דמות נוספת משלך.", u: "kg", un: "קילוגרם", si: "kg" },
    v1:  { n: "מהירות הגוף הראשון", d: "שלילית = שמאלה.", u: "m/s", un: "מטר לשנייה", si: "m/s" },
    v2:  { n: "מהירות הגוף השני", d: "חיובית = ימינה.", u: "m/s", un: "מטר לשנייה", si: "m/s" },
    p:   { n: "תנע (momentum)", d: "מסה כפול מהירות, עם כיוון.", u: "kg·m/s", un: "קילוגרם-מטר לשנייה", si: "kg·m/s" },
    Q:   { n: "חום (אנרגיה תרמית)", d: "האנרגיה שהחיכוך הפך לחום. היא לא נעלמה, רק כבר לא מכנית.", u: "J", un: "ג׳אול", si: "kg·m²/s²" },
    E_el: { n: "אנרגיה אלסטית", d: "האנרגיה שבקפיץ הדחוס או המתוח: ½·k·x².", u: "J", un: "ג׳אול", si: "kg·m²/s²" },
    A:   { n: "משרעת (Amplitude)", d: "המרחק המרבי מנקודת שיווי המשקל.", u: "m", un: "מטר", si: "m" },
    v_max: { n: "מהירות מרבית", d: "המהירות במעבר דרך x = 0: ω·A.", u: "m/s", un: "מטר לשנייה", si: "m/s" },
    a_max: { n: "תאוצה מרבית", d: "התאוצה בקצוות: ω²·A.", u: "m/s²", un: "מטר לשנייה בריבוע", si: "m/s²" },
    E_p: { n: "אנרגיה פוטנציאלית אלסטית", d: "האנרגיה שבקפיץ: ½·k·x².", u: "J", un: "ג׳אול", si: "kg·m²/s²" },
    k1:  { n: "קבוע הקפיץ הראשון", d: "הקשיחות של קפיץ 1 לבד.", u: "N/m", un: "ניוטון למטר", si: "kg/s²" },
    k2:  { n: "קבוע הקפיץ השני", d: "הקשיחות של קפיץ 2 לבד.", u: "N/m", un: "ניוטון למטר", si: "kg/s²" },
    k_eq: { n: "קבוע הקפיץ השקול", d: "הקשיחות של קפיץ אחד שמחליף את הזוג ומתנהג בדיוק כמוהו.", u: "N/m", un: "ניוטון למטר", si: "kg/s²" },
    x1:  { n: "ההתארכות של קפיץ 1", d: "בכמה קפיץ 1 ארוך מהאורך הטבעי שלו.", u: "m", un: "מטר", si: "m" },
    x2:  { n: "ההתארכות של קפיץ 2", d: "בכמה קפיץ 2 ארוך מהאורך הטבעי שלו.", u: "m", un: "מטר", si: "m" },
    F1:  { n: "הכוח בקפיץ 1", d: "כמה חזק קפיץ 1 מושך.", u: "N", un: "ניוטון", si: "kg·m/s²" },
    F2:  { n: "הכוח בקפיץ 2", d: "כמה חזק קפיץ 2 מושך.", u: "N", un: "ניוטון", si: "kg·m/s²" },
    x_rest: { n: "דחיסה במנוחה", d: "כמה הקפיץ דחוס כשהדמות סתם עומדת עליו: k·x = m·g.", u: "m", un: "מטר", si: "m" },
    u:   { n: "הסטה משיווי המשקל", d: "המרחק מנקודת שיווי המשקל (לא מהאורך הטבעי).", u: "m", un: "מטר", si: "m" },
    mg:  { n: "המשקל, m כפול g", d: "כוח הכובד על הגוף. תמיד אנכי כלפי מטה, גם על מדרון.", u: "N", un: "ניוטון", si: "kg·m/s²" }
  };
  const SYM_RE = /(speed_avg|total_distance|v_relative|v_creature|v_cookie|v_avg|a_avg|t_stop|d_stop|v_rel|x0|v0|Δv|Δt|m1|m2|v1|v2|E_el|v_max|a_max|E_p|k_eq|k1|k2|x1|x2|F1|F2|x_rest|s_eq|θ_c|f_s|f_k|E_k|E_g|b_c|F_b|ΣF⊥|ΣF|μs|μk|Δx|L₀|sin|cos|tan|[A-Za-zθπω])/g;
  // turn the text of a formula into tappable symbols (numbers and units in <em> stay as they are)
  function symbolize(root) {
    if (!root) return;
    root.innerHTML = root.innerHTML.replace(/([A-Za-z])<sub>(\w+)<\/sub>/g, (all, a, b) => SYM[a + "_" + b] ? `<button type="button" class="sym" data-sym="${a}_${b}">${a}<sub>${b}</sub></button>` : all);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) { const n = walker.currentNode; if (!n.parentElement.closest("em, sub, .sym, small")) nodes.push(n); }
    for (const n of nodes) {
      const t = n.nodeValue; SYM_RE.lastIndex = 0; if (!SYM_RE.test(t)) continue;
      const frag = document.createDocumentFragment(); let last = 0; SYM_RE.lastIndex = 0; let mm;
      while ((mm = SYM_RE.exec(t))) {
        if (!SYM[mm[0]]) continue;
        frag.append(t.slice(last, mm.index));
        const b = document.createElement("button"); b.type = "button"; b.className = "sym"; b.dataset.sym = mm[0];
        b.innerHTML = esc(mm[0]).replace(/_(\w+)$/, "<sub>$1</sub>"); frag.append(b); last = mm.index + mm[0].length;
      }
      frag.append(t.slice(last)); n.replaceWith(frag);
    }
  }
  // formula cards repaint many times a second: rebuild them only when the formulas change, otherwise just the numbers
  function setFormula(el, html) {
    const sig = html.replace(/<em>[\s\S]*?<\/em>/g, "<em></em>");
    if (el.dataset.sig !== sig) { el.innerHTML = html; el.dataset.sig = sig; el.querySelectorAll(".m").forEach(symbolize); EX.decorate(el); return; }
    const tmp = document.createElement("div"); tmp.innerHTML = html;
    const now = el.querySelectorAll("em"), next = tmp.querySelectorAll("em");
    next.forEach((e, i) => { if (now[i] && now[i].innerHTML !== e.innerHTML) now[i].innerHTML = e.innerHTML; });
  }
  function closeSym() { document.querySelector(".symtip")?.remove(); }
  function openSym(key, anchor) {
    const S = SYM[key]; if (!S) return;
    closeSym();
    const el = document.createElement("div"); el.className = "symtip"; el.dir = "rtl";
    el.innerHTML = `<div class="sym-head"><b class="sym-big" dir="ltr">${esc(key).replace(/_(\w+)$/, "<sub>$1</sub>")}</b><span>${esc(S.n)}</span></div><p>${esc(S.d)}</p>
      <div class="units"><div><small>יחידה</small><b dir="ltr">${esc(S.u)}</b><span>${esc(S.un)}</span></div><div><small>ביחידות יסוד SI</small><b dir="ltr">${esc(S.si)}</b></div></div>`;
    EX.linkify(el.querySelector("p"));
    document.body.appendChild(el);
    const r = anchor.getBoundingClientRect(), cw = el.offsetWidth, ch = el.offsetHeight;
    el.style.left = clamp(r.left + r.width / 2 - cw / 2, 10, innerWidth - cw - 10) + "px";
    el.style.top = (r.top - ch - 10 > 8 ? r.top - ch - 10 : Math.min(r.bottom + 10, innerHeight - ch - 8)) + "px";
    document.querySelectorAll(".sym.on").forEach((b) => b.classList.remove("on")); anchor.classList.add("on");
    G.sfx.pop();
  }

  // calculator, formula movies, laws and scientists (explain.js)
  const EX = EggExplain.create({ SYM, SYM_RE, symbolize, esc, laws: LAWS_DATA, sfx: () => G.sfx.pop(), live: () => infoLive(), closeInfo: () => closeInfo(), reduceMotion });
  const infoBtn = (key) => `<button class="info" type="button" data-info="${key}" aria-label="מה זה?">?</button>`;
  let infoOpenedAt = 0;
  function closeInfo() { document.querySelector(".cloud")?.remove(); closeSym(); }
  function openInfo(key, anchor) {
    const I = INFO[key]; if (!I) return;
    closeInfo();
    let live = ""; try { live = I.live ? I.live(infoLive()) || "" : ""; } catch (e) {}
    const el = document.createElement("div");
    el.className = "cloud"; el.setAttribute("role", "dialog"); el.dir = "rtl";
    el.innerHTML = `<button class="x" type="button" aria-label="סגור">×</button><h4>${esc(I.t)}</h4><p>${esc(I.p)}</p>
      <div class="eqs">${I.eq.map((e) => `<div>${esc(e)}</div>`).join("")}</div>${live ? `<div class="live">${esc(live)}</div>` : ""}`;
    el.querySelectorAll(".eqs div").forEach(symbolize);
    EX.linkify(el.querySelector("p"));
    el.insertAdjacentHTML("beforeend", `<div class="sym-hint">לחצו על כל אות בנוסחה</div>`);
    document.body.appendChild(el);
    const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x - 20, right: anchor.x + 20, top: anchor.y - 20, bottom: anchor.y + 20, width: 40, height: 40 };
    const cw = el.offsetWidth, ch = el.offsetHeight, below = r.bottom + 14 + ch < innerHeight - 12 || r.top < ch + 26;
    el.style.left = clamp(r.left + r.width / 2 - cw / 2, 12, innerWidth - cw - 12) + "px";
    el.style.top = clamp(below ? r.bottom + 14 : r.top - ch - 14, 12, innerHeight - ch - 12) + "px";
    el.classList.add(below ? "below" : "above");
    el.style.setProperty("--tx", clamp(r.left + r.width / 2 - parseFloat(el.style.left), 24, cw - 24) + "px");
    el.querySelector(".x").addEventListener("click", closeInfo);
    infoOpenedAt = performance.now();
    G.sfx.pop();
  }
  document.addEventListener("click", (e) => {
    const sb = e.target.closest("[data-sym]");
    if (sb) { e.preventDefault(); e.stopPropagation(); openSym(sb.dataset.sym, sb); return; }
    if (!e.target.closest(".symtip")) { closeSym(); document.querySelectorAll(".sym.on").forEach((x) => x.classList.remove("on")); }
    if (EX.handleClick(e)) return;
    const b = e.target.closest("[data-info]");
    if (b) { e.preventDefault(); e.stopPropagation(); openInfo(b.dataset.info, b); return; }
    if (!e.target.closest(".cloud") && performance.now() - infoOpenedAt > 400) closeInfo();
  }, true);

  // ======================================================================
  //  SPRINGS THAT LOOK THEIR STIFFNESS, AND BODIES THAT HANG ON PROPERLY
  // ======================================================================
  // stiffer = thicker, darker wire with fewer, tighter coils
  function springLook(k) {
    const t = clamp((k - 30) / 370, 0, 1), mix = (a, b) => Math.round(a + (b - a) * t);
    return { t, coils: Math.round(15 - 6 * t), amp: 17 - 5 * t, w: 1.5 + 3.8 * t, col: `rgb(${mix(150, 30)},${mix(156, 33)},${mix(168, 38)})` };
  }
  function drawSpring(ctx, x0, y0, x1, y1, k, label) {
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux, look = springLook(k);
    const lead = Math.min(12, L * 0.12), span = Math.max(6, L - 2 * lead), n = look.coils * 2;
    const pts = [[x0, y0], [x0 + ux * lead, y0 + uy * lead]];
    for (let i = 1; i < n; i++) { const d = lead + span * i / n, o = (i % 2 ? 1 : -1) * look.amp; pts.push([x0 + ux * d + nx * o, y0 + uy * d + ny * o]); }
    pts.push([x1 - ux * lead, y1 - uy * lead], [x1, y1]);
    const path = (dx = 0, dy = 0) => { ctx.beginPath(); ctx.moveTo(pts[0][0] + dx, pts[0][1] + dy); for (const p of pts.slice(1)) ctx.lineTo(p[0] + dx, p[1] + dy); };
    ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = look.col; ctx.lineWidth = look.w; path(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = Math.max(0.6, look.w * 0.3); path(-look.w * 0.25 * ny, look.w * 0.25 * nx); ctx.stroke();
    if (label) {
      // a big, easy to read k in a little white tag next to the coils
      const txt = "k = " + k, sm = " N/m";
      ctx.direction = "ltr"; ctx.textBaseline = "middle";
      ctx.font = "800 19px " + FONT; const tw = ctx.measureText(txt).width;
      ctx.font = "600 12px " + FONT; const sw = ctx.measureText(sm).width;
      const bw = tw + sw + 16, bh = 28, horiz = Math.abs(ux) > 0.5;
      let bx = horiz ? x0 + ux * (lead + span * 0.5) - bw / 2 : x0 + look.amp + 12, by = horiz ? y0 - look.amp - 10 - bh / 2 : y0 + uy * (lead + span * 0.55);
      const cw = ctx.canvas.width / (ctx.getTransform().a || 1); if (bx + bw > cw - 4) bx = cw - 4 - bw; if (bx < 4) bx = 4;   // stay on screen
      ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 1.3;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by - bh / 2, bw, bh, 9); else ctx.rect(bx, by - bh / 2, bw, bh); ctx.fill(); ctx.stroke();
      ctx.textAlign = "left"; ctx.fillStyle = "#20232A"; ctx.font = "800 19px " + FONT; ctx.fillText(txt, bx + 8, by + 1);
      ctx.fillStyle = "#606671"; ctx.font = "600 12px " + FONT; ctx.fillText(sm, bx + 8 + tw, by + 2);
    }
    ctx.restore();
  }
  // where a drawing really starts: the top of the head (centre) and the body's edge at any height
  const probes = {};
  function probe(im) {
    if (!im.complete || !im.naturalWidth) return null;
    if (probes[im.src]) return probes[im.src];
    const w = 120, h = Math.max(1, Math.round(w * im.naturalHeight / im.naturalWidth));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.drawImage(im, 0, 0, w, h);
    let d; try { d = g.getImageData(0, 0, w, h).data; } catch (e) { return (probes[im.src] = { top: 0.04, right: () => 0.92 }); }
    let top = 0;
    outer: for (let y = 0; y < h; y++) for (let x = Math.round(w * 0.4); x < w * 0.6; x++) if (d[(y * w + x) * 4 + 3] > 110) { top = y / h; break outer; }
    const rights = [];
    for (let y = 0; y < h; y++) { let r = -1; for (let x = w - 1; x >= 0; x--) if (d[(y * w + x) * 4 + 3] > 110) { r = x / w; break; } rights.push(r); }
    return (probes[im.src] = { top, right: (fy) => { const y = clamp(Math.round(fy * (h - 1)), 0, h - 1); for (let k = 0; k < 8; k++) { if (rights[y - k] > 0) return rights[y - k]; if (rights[y + k] > 0) return rights[y + k]; } return 0.9; } });
  }
  // a body looks heavier when the experiment mass is higher (drawing only)
  const fatness = (m, m0) => clamp(Math.pow(m / m0, 0.4), 0.74, 1.42);
  const FEEL = (r) => r > 1.3 ? "אוי… אני כבד מאוד. מה שמתם לי באוכל?" : r > 1.1 ? "אממ, אני מרגיש קצת כבד." : r < 0.7 ? "אני קליל מדי… זה מפחיד." : r < 0.9 ? "קצת קל לי. מוזר." : "זה כמעט אני.";
  // the creature does not like a borrowed mass: after a try (or a while) it goes back to its own
  function massKeeper(ui_) {
    let lastInput = 0, seenAt = 0, from = null, t0 = 0;
    return {
      touched() { lastInput = performance.now(); seenAt = 0; from = null; },
      seen() { if (lab.massOverride !== null && !seenAt) seenAt = performance.now(); },
      tick(idle) {
        if (lab.massOverride === null) { from = null; return; }
        const now = performance.now();
        if (from === null) {
          if ((seenAt && now - seenAt > 2500) || (idle && lastInput && now - lastInput > 8000)) { from = lab.massOverride; t0 = now; ui_.say("אוף. תחזירו לי את הגוף שלי…", 1.8); G.sfx.phew && G.sfx.phew(); }
          return;
        }
        const k = Math.min(1, (now - t0) / 1600), e = 1 - Math.pow(1 - k, 3), m = from + (ui_.m0() - from) * e;
        if (k >= 1) { lab.massOverride = null; from = null; seenAt = 0; lastInput = 0; ui_.apply(ui_.m0()); ui_.say("פפפ… חזרתי לעצמי. אל תעשו לי את זה שוב!", 2.6); G.sfx.boing(0.4); }
        else { lab.massOverride = m; ui_.apply(m); }
      }
    };
  }

  // ======================================================================
  //  FORCE ARROWS: bold, haloed, with the name and the size in a coloured tag
  // ======================================================================
  // forces drawn from a point next to the body (a free-body diagram), so they do not cover the drawing
  function fbdAnchor(ctx, bx, by, ox, oy) {
    ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = "rgba(58,58,64,0.45)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ox, oy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(58,58,64,0.55)"; ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function forceArrow(ctx, x0, y0, vx, vy, color, label, opts = {}) {
    let len = Math.hypot(vx, vy); if (len < 1.5) return;
    const ux = vx / len, uy = vy / len;
    len = Math.max(len, 30);                              // a small force is still visible
    const x1 = x0 + ux * len, y1 = y0 + uy * len, head = opts.thin ? 13 : 19, half = opts.thin ? 7 : 10.5, lw = opts.thin ? 3 : 6;
    ctx.save(); ctx.globalAlpha = opts.alpha ?? 1; ctx.lineCap = "round"; ctx.lineJoin = "round";
    const shaft = () => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * head * 0.8, y1 - uy * head * 0.8); };
    const tip = () => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * head - uy * half, y1 - uy * head + ux * half); ctx.lineTo(x1 - ux * head + uy * half, y1 - uy * head - ux * half); ctx.closePath(); };
    if (opts.dash) ctx.setLineDash([9, 7]);
    ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = lw + 5; shaft(); ctx.stroke();   // halo so it reads over the drawing
    ctx.setLineDash([]); ctx.lineWidth = 5; tip(); ctx.stroke();
    if (opts.dash) ctx.setLineDash([9, 7]);
    ctx.strokeStyle = color; ctx.lineWidth = lw; shaft(); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = color; tip(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x0, y0, opts.thin ? 3 : 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x0, y0, opts.thin ? 2 : 3.2, 0, Math.PI * 2); ctx.fill();
    if (label) {
      const text = opts.value !== undefined ? `${label}  ${fmt(opts.value, 1)} N` : label;
      ctx.font = "700 13px " + FONT; ctx.direction = "ltr"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const tw = ctx.measureText(text).width + 14, th = 22, side = opts.side || 0;
      let lx = x1 + ux * (tw / 2 + 8) + side * uy * 16 + (opts.dx || 0), ly = y1 + uy * (th / 2 + 8) - side * ux * 16 + (opts.dy || 0);
      const cw = ctx.canvas.width / (ctx.getTransform().a || 1), chh = ctx.canvas.height / (ctx.getTransform().d || 1);
      lx = clamp(lx, tw / 2 + 4, cw - tw / 2 - 4); ly = clamp(ly, th / 2 + 4, chh - th / 2 - 4);
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx - tw / 2, ly - th / 2, tw, th, 11) : ctx.rect(lx - tw / 2, ly - th / 2, tw, th); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.fillText(text, lx, ly + 0.5);
    }
    ctx.restore();
  }

  // ======================================================================
  //  THE SPRING LAB
  // ======================================================================
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const L0 = 0.30;                      // natural length of the spring (m)
  const U_MAX = 0.25;                   // how far below equilibrium it can be pulled (m)
  const lab = { k: 120, massOverride: null, b: 0, lastU0: 0.12, mode: "hang", surface: "dry_wood" };

  // ======================================================================
  //  THE MEDIUM AROUND THE HANGING SPRING: a wave sweeps the screen left to right when it
  //  changes, then only a thin wobbling surface line and a tint that fades downwards stay in
  //  the lab, plus a few bubbles while the creature moves. Display only: the physics is b.
  // ======================================================================
  function makeFluid(box) {
    let md = SP.MEDIA[0], tint = 0, color = md.rgb, t = 0, sweep = null, overlay = null, octx = null;
    const bubbles = [];
    function killOverlay() { if (overlay) overlay.remove(); overlay = null; octx = null; sweep = null; }
    function to(next, animate) {
      md = next; if (next.id !== "air") color = next.rgb;
      bubbles.length = 0;
      killOverlay();                                            // a quick second change starts cleanly
      if (!animate || reduceMotion) { tint = next.id === "air" ? 0 : 1; return; }
      overlay = document.createElement("canvas"); overlay.className = "fluid-sweep"; overlay.setAttribute("aria-hidden", "true");
      document.body.appendChild(overlay);
      const d = Math.min(devicePixelRatio || 1, 2); overlay.width = innerWidth * d; overlay.height = innerHeight * d;
      octx = overlay.getContext("2d"); octx.setTransform(d, 0, 0, d, 0, 0);
      sweep = { start: performance.now(), rgb: next.id === "air" ? color : next.rgb, dir: next.id === "air" ? -1 : 1 };
      if (next.id !== "air") G.sfx.whoosh && G.sfx.whoosh();
    }
    function drawSweep(now) {
      if (!sweep) return;
      const age = (now - sweep.start) / 1000, W = innerWidth, H = innerHeight;
      if (age > 1.9) { killOverlay(); return; }
      const f = Math.min(1, age / 0.98), e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      const px = sweep.dir > 0 ? -W * 0.14 + W * 1.3 * e : W * 1.14 - W * 1.3 * e;
      const fade = age < 1.05 ? 1 : Math.max(0, 1 - (age - 1.05) / 0.75), [r, g, b] = sweep.rgb;
      const front = (y) => px + Math.sin(y * 0.025 + age * 11) * 14 + Math.sin(y * 0.061 - age * 9) * 6;
      octx.clearRect(0, 0, W, H);
      octx.beginPath(); octx.moveTo(sweep.dir > 0 ? 0 : W, 0);
      for (let y = 0; y <= H + 6; y += 6) octx.lineTo(front(y), y);
      octx.lineTo(sweep.dir > 0 ? 0 : W, H); octx.closePath();
      octx.fillStyle = `rgba(${r},${g},${b},${0.29 * fade})`; octx.fill();
      octx.beginPath(); for (let y = 0; y <= H + 5; y += 5) { const x = front(y); if (y) octx.lineTo(x, y); else octx.moveTo(x, y); }
      octx.lineWidth = 7; octx.strokeStyle = `rgba(255,255,255,${0.77 * fade})`; octx.stroke();
      octx.lineWidth = 3; octx.strokeStyle = `rgba(${r},${g},${b},${0.65 * fade})`; octx.stroke();
      if (sweep.dir > 0) for (let i = 0; i < 15; i++) {           // a few droplets at the front
        const y = (i * 137 + 43) % H, x = front(y) - 24 - (i % 4) * 13;
        octx.globalAlpha = fade * (0.25 + (i % 4) * 0.12); octx.fillStyle = "#fff"; octx.beginPath(); octx.ellipse(x, y, 4 + (i % 3) * 2, 2, 0, 0, Math.PI * 2); octx.fill();
      }
      octx.globalAlpha = 1;
    }
    function tick(dt, now) {
      t += dt;
      const want = md.id === "air" ? 0 : 1;
      tint += (want - tint) * Math.min(1, dt * 2.4); if (reduceMotion) tint = want;
      for (let i = bubbles.length - 1; i >= 0; i--) { const q = bubbles[i]; q.life += dt; q.y -= (14 + 3 * q.r) * dt; q.x += q.dx; q.a = Math.max(0, 1 - q.life / q.ttl); if (q.a <= 0) bubbles.splice(i, 1); }
      drawSweep(now);
    }
    function drawBack(ctx, W, H, top) {
      if (tint < 0.005) return;
      const [r, g, b] = color, y = top + 8;
      const gr = ctx.createLinearGradient(0, y, 0, H);
      gr.addColorStop(0, `rgba(${r},${g},${b},${0.23 * tint})`); gr.addColorStop(0.22, `rgba(${r},${g},${b},${0.12 * tint})`);
      gr.addColorStop(0.6, `rgba(${r},${g},${b},${0.045 * tint})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.save(); ctx.fillStyle = gr; ctx.fillRect(0, y, W, H - y);
      const wave = (dy, a, w, s1, s2) => { ctx.beginPath(); for (let x = 0; x <= W + 4; x += 3) { const yy = y + dy + Math.sin(x * s1 + t * 1.65) * a + Math.sin(x * s2 - t * 1.14) * 0.9; if (x) ctx.lineTo(x, yy); else ctx.moveTo(x, yy); } ctx.lineWidth = w; ctx.stroke(); };
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.62 * tint})`; wave(0, 2, 2.8, 0.032, 0.074);
      ctx.strokeStyle = `rgba(255,255,255,${0.65 * tint})`; wave(5, 2, 1.25, 0.025, 0.05);
      ctx.restore();
    }
    function drawFront(ctx, cx, cy, w, v) {
      if (md.id !== "air" && tint > 0.3 && Math.abs(v) > 0.1 && Math.random() < 0.3 && bubbles.length < 45 && !reduceMotion)
        bubbles.push({ x: cx + (Math.random() - 0.5) * w * 0.9, y: cy + (Math.random() - 0.5) * 40, r: 1.8 + Math.random() * 4, a: 1, life: 0, ttl: 0.75 + Math.random() * 0.8, dx: (Math.random() - 0.5) * 0.3 });
      const [r, g, b] = color;
      ctx.save();
      if (md.id !== "air" && Math.abs(v) > 0.12 && tint > 0.1) {     // small ripples beside the body while it moves
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.6 * tint})`; ctx.lineWidth = 1.8;
        for (let i = 0; i < 4; i++) { const side = i % 2 ? 1 : -1, x = cx + side * (w * 0.55 + i * 6), y = cy - 19 + (i * 13) % 48; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + side * 13, y + 6, x + side * 3, y + 11); ctx.stroke(); }
      }
      for (const q of bubbles) { ctx.globalAlpha = q.a * 0.63; ctx.strokeStyle = md.id === "water" ? "#70bedc" : "#d5a65b"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
    function destroy() { killOverlay(); bubbles.length = 0; }
    return { to, tick, drawBack, drawFront, destroy, get medium() { return md; }, get tint() { return tint; } };
  }

  SCREENS.lab = (args = {}) => {
    if (lab.mode === "wall") return SCREENS.wall(args);
    if (lab.mode === "launch") return SCREENS.launch(args);
    if (lab.mode === "graph") return SCREENS.graph(args);
    if (lab.mode === "pair") return SCREENS.pair(args);
    if (lab.mode === "osc") return SCREENS.osc(args);
    if (lab.mode === "ramp") return SCREENS.ramp(args);
    if (lab.mode === "islope") return SCREENS.islope(args);
    if (lab.mode === "two") return SCREENS.two(args);
    if (lab.mode === "pulley") return SCREENS.pulley(args);
    lab.mode = "hang";
    setTitle("קפיץ־קפוץ", "קפיץ תלוי מהתקרה");
    let sp = activeSpecies();
    const m0 = () => phys(sp).mass_kg;
    const mass = () => lab.massOverride ?? m0();
    screenEl.innerHTML = `
      <div class="lab-screen">
        ${modeSeg("hang")}
        <div class="lab" id="lab">
          <canvas id="labCanvas"></canvas>
          <div class="bubble say" id="say" hidden></div>
          <div class="lab-tools">
            <button class="chip" id="charChip" type="button"></button>
            <button class="chip" id="formulaBtn" type="button">הצג נוסחה</button>
          </div>
        </div>
        <div class="readouts">
          <button type="button" class="readout" data-info="s"><small>התארכות <i class="qi">?</i></small><b id="rS">–</b></button>
          <button type="button" class="readout" data-info="F"><small>כוח קפיץ <i class="qi">?</i></small><b id="rF">–</b></button>
          <button type="button" class="readout" data-info="E"><small>אנרגיה <i class="qi">?</i></small><b id="rE">–</b></button>
          <button type="button" class="readout" data-info="T"><small>זמן מחזור <i class="qi">?</i></small><b id="rT">–</b></button>
        </div>
        <div class="card controls">
          <div class="slider-row"><label for="kIn"><span>קשיחות הקפיץ k ${infoBtn("k")}</span><span class="val" id="kVal"></span></label>
            <input id="kIn" type="range" min="30" max="400" step="5"></div>
          <div class="slider-row"><label for="mIn"><span>מסה m ${infoBtn("m")} <span class="note" id="mNote"></span></span><span class="val" id="mVal"></span></label>
            <input id="mIn" class="mass" type="range" min="0.5" max="4" step="0.1">
            <button class="linkish" id="mReset" type="button" hidden>חזרה למסת הדמות</button></div>
          <button class="adv-toggle" id="advBtn" type="button" aria-expanded="false" aria-controls="adv"><span class="adv-ic" aria-hidden="true">🌊</span><span class="adv-t"><b>בלימה: באיזה חומר הקפיץ?</b><small id="advNow">אוויר</small></span><span class="adv-chev" aria-hidden="true">⌄</span></button>
          <div class="adv" id="adv" hidden>
            <div class="media" role="radiogroup" aria-label="חומר הסביבה">${SP.MEDIA.map((md) => `<button type="button" role="radio" class="medium" data-medium="${md.id}"><span aria-hidden="true">${md.emoji}</span>${md.he}</button>`).join("")}</div>
            <div class="slider-row"><label for="bIn"><span>מקדם בלימה b ${infoBtn("b")}</span><span class="val" id="bVal"></span></label>
              <input id="bIn" class="damp" type="range" min="0" max="3" step="0.5"></div>
            <p class="fine" id="mediumDesc"></p>
          </div>
        </div>
        <div class="card formula" id="formula" hidden></div>
      </div>`;

    const cv = $("#labCanvas"), ctx = cv.getContext("2d"), box = $("#lab");
    let W = 0, H = 0, DPR = 1;
    const resize = () => { const r = box.getBoundingClientRect(); DPR = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(box);

    const img = new Image(); let imgSp = null;
    const loadImg = () => { if (imgSp !== sp) { imgSp = sp; img.src = artOf(sp); } };
    loadImg();

    const params = () => SP.params(mass(), lab.k, lab.b);
    const sim = new SP.Sim(params(), 0);
    let scale = 300, formulaOpen = false, dragging = null, everDragged = false, sayT = 0, raf = 0, lastT = performance.now();
    const releases = [];                                     // what the player has tried this visit
    let trial = null, questionCooldown = 1;

    // ---- controls ----
    const kIn = $("#kIn"), mIn = $("#mIn"), bIn = $("#bIn");
    kIn.value = lab.k; mIn.value = mass(); bIn.value = lab.b;
    function paintControls() {
      $("#kVal").textContent = lab.k + " N/m";
      $("#mVal").textContent = fmt(mass(), 1) + " kg";
      $("#bVal").textContent = fmt(lab.b, 1) + " N·s/m";
      const own = lab.massOverride === null;
      $("#mNote").textContent = own ? "(מסת " + nameOf(sp) + ")" : "(מסה בניסוי)";
      $("#mReset").hidden = own;
      $("#charChip").innerHTML = `<img src="${artOf(sp)}" alt=""><span>${esc(nameOf(sp))} · <span class="ltr">${fmt(m0(), 1)} kg</span></span><span aria-hidden="true">⇄</span>`;
    }
    // any change: start again at rest at the NEW equilibrium, and say what moved
    function reconfigure(why) {
      if (lab.medium) { const md = SP.MEDIA.find((x) => x.id === lab.medium); lab.b = +SP.dampingFor(md.zeta, lab.k, mass()).toFixed(1); }   // a chosen medium keeps its ζ when k or m change
      const before = { eq: SP.equilibrium(sim.p), T: SP.period(sim.p) };
      sim.reset(params(), 0);
      trial = null;
      const after = { eq: SP.equilibrium(sim.p), T: SP.period(sim.p) };
      if (why) say(`${why} שיווי המשקל: ${fmt(before.eq * 100, 1)} ← ${fmt(after.eq * 100, 1)} ס״מ. T: ${fmt(before.T)} ← ${fmt(after.T)} שנ׳.`, 4);
      paintControls(); paintFormula(); paintMedium(true);
    }
    kIn.addEventListener("input", () => { lab.k = +kIn.value; reconfigure(); });
    kIn.addEventListener("change", () => reconfigure("הקפיץ הוחלף."));
    mIn.addEventListener("input", () => { keeper.touched(); lab.massOverride = Math.abs(+mIn.value - m0()) < 0.05 ? null : +mIn.value; reconfigure(); });
    mIn.addEventListener("change", () => {
      reconfigure();
      if (lab.massOverride !== null) say(`${FEEL(mass() / m0())} שיווי המשקל עכשיו ${fmt(SP.equilibrium(sim.p) * 100, 1)} ס״מ, T = ${fmt(SP.period(sim.p))} שנ׳. מהר, נסו לפני שאני חוזר לעצמי!`, 4);
    });
    // ---- the medium around the spring (air, water, oil, honey): it names the b slider and animates the change ----
    const fluid = makeFluid(box);
    let shownMedium = null;                                    // the first paint sets the lab's look without a wave
    function paintMedium(animate) {
      const md = SP.mediumOf(lab.b, lab.k, mass());
      bIn.max = Math.max(3, Math.ceil(SP.dampingFor(1.8, lab.k, mass()))); bIn.value = lab.b;
      $("#advNow").textContent = `${md.emoji} ${md.he}${lab.b > 0 ? " · b = " + fmt(lab.b, 1) : ""}`;
      for (const c of screenEl.querySelectorAll("[data-medium]")) c.setAttribute("aria-checked", c.dataset.medium === md.id ? "true" : "false");
      $("#mediumDesc").textContent = md.desc + (lab.b > 0 ? ". עם בלימה זמן המחזור כבר לא בדיוק 2π√(m/k)." : ".");
      if (md.id !== shownMedium) { shownMedium = md.id; fluid.to(md, animate); }
    }
    $("#advBtn").addEventListener("click", () => {
      const open = $("#adv").hidden; $("#adv").hidden = !open; $("#advBtn").setAttribute("aria-expanded", open ? "true" : "false");
      if (open) $("#adv").scrollIntoView({ behavior: "smooth", block: "nearest" });
      G.sfx.pop();
    });
    for (const c of screenEl.querySelectorAll("[data-medium]")) c.addEventListener("click", () => {
      const md = SP.MEDIA.find((x) => x.id === c.dataset.medium);
      lab.medium = md.id; reconfigure(); say(`${md.emoji} ${md.he}: ${md.desc}.`, 3.4);
    });
    bIn.addEventListener("input", () => { lab.b = +bIn.value; lab.medium = null; reconfigure(); });
    $("#mReset").addEventListener("click", () => { lab.massOverride = null; mIn.value = m0(); reconfigure("חזרה למסת הדמות."); });
    $("#formulaBtn").addEventListener("click", () => {
      formulaOpen = !$("#formula").hidden ? false : true;
      $("#formula").hidden = !formulaOpen;
      $("#formulaBtn").textContent = formulaOpen ? "הסתר נוסחה" : "הצג נוסחה";
      if (formulaOpen) { P.data.physics.formulaSeen = true; P.save(); paintFormula(); $("#formula").scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    });
    function paintFormula() {
      if ($("#formula").hidden) return;
      const p = sim.p, s = sim.st.s, eq = SP.equilibrium(p);
      setFormula($("#formula"), `
        <div class="eq"><span>כוח הקפיץ (חוק הוק)</span><span class="m">F = −k·s<em>${fmt(-p.k * s, 1)} N</em></span></div>
        <div class="eq"><span>אנרגיה אלסטית</span><span class="m">E = ½·k·s²<em>${fmt(SP.elasticEnergy(s, p.k), 2)} J</em></span></div>
        <div class="eq"><span>שיווי משקל</span><span class="m">s<sub>eq</sub> = m·g / k<em>${fmt(eq * 100, 1)} cm</em></span></div>
        <div class="eq"><span>זמן מחזור (בלי בלימה)</span><span class="m">T = 2π·√(m/k)<em>${fmt(SP.period(p))} s</em></span></div>
        <p class="fine">s היא ההתארכות מהאורך הטבעי של הקפיץ. כוח חיובי פירושו כלפי מטה, ולכן כשהקפיץ מתוח F שלילי: הוא מושך למעלה.</p>`);
    }
    paintControls(); paintMedium(false);
    const keeper = massKeeper({ say: (t, d) => say(t, d), m0, apply: (m) => { mIn.value = m; sim.reset(params(), 0); trial = null; paintControls(); } });
    infoLive = () => ({ k: lab.k, m: mass(), m0: m0(), name: nameOf(sp), s: sim.st.s, eq: SP.equilibrium(sim.p) });

    // ---- switching creature: same k, same pull below equilibrium, a fair comparison ----
    $("#charChip").addEventListener("click", () => pickOwned(sp, "להחליף דמות בניסוי", (newSp) => {
      const oldName = nameOf(sp), oldT = SP.period(sim.p);
      sp = newSp; lab.massOverride = null; mIn.value = m0(); loadImg();
      const u0 = Math.max(0.05, lab.lastU0);
      sim.reset(params(), u0); sim.release();
      trial = startRelease(u0);
      paintControls(); paintFormula();
      say(`עם ${nameOf(sp)} המסה אחרת, אז זמן המחזור משתנה: ${fmt(oldT)} ← ${fmt(SP.period(sim.p))} שנ׳ (${oldName} ← ${nameOf(sp)}).`, 5);
      G.sfx.whoosh();
    }));

    // ---- speech ----
    function say(text, secs = 2.6) { const el = $("#say"); el.textContent = text; el.hidden = false; sayT = secs; }
    const DRAG_LINES = ["תפסיק למשוך, אני לא גומייה!", "עוד קצת ואתה מודד לי את האישיות בניוטון.", "אוי, זה מותח."];
    const RELEASE_LINES = ["אני לא קופץ, אני מתנודד!", "וואו. שוב!", "למעלה, למטה, למעלה…"];

    // ---- geometry: metres to pixels, everything in one coordinate system ----
    const TOP = 22;
    const hookY = (s) => TOP + (L0 + s) * scale;
    function targetScale() {
      const ph = phys(sp), eq = SP.equilibrium(sim.p);
      return clamp((H - TOP - 30) / (L0 + eq + U_MAX + ph.height_m * 1.02), 60, 900);
    }
    // the top of the head sits right on the hook, and a heavier experiment mass makes a rounder body
    function creatureRect(s) {
      const fat = fatness(mass(), m0()), pr = probe(img) || { top: 0 };
      const h = phys(sp).height_m * scale * (1 + (fat - 1) * 0.12), w = (img.naturalWidth ? h * img.naturalWidth / img.naturalHeight : h) * fat;
      const cx = W * 0.58, y = hookY(s) - pr.top * h;
      return { x: cx - w / 2, y, w, h, cx, fat, top: pr.top };
    }

    // ---- dragging: hold the creature below equilibrium, let go to release ----
    function pointerPos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener("pointerdown", (e) => {
      if (isSheetOpen()) return;
      const p = pointerPos(e), r = creatureRect(sim.st.s), yS = hookY(sim.st.s), yEq = hookY(SP.equilibrium(sim.p));
      const onBody = !(p.x < r.x - 30 || p.x > r.x + r.w + 30 || p.y < yS - 10 || p.y > r.y + r.h + 30);
      if (!onBody) {
        const at = { x: e.clientX, y: e.clientY };
        if (Math.abs(p.x - r.cx) < 30 && p.y > TOP && p.y < yS - 6) openInfo("k", at);
        else if (Math.abs(p.y - yEq) < 14) openInfo("eq", at);
        else if (p.x < 70) openInfo("s", at);
        return;
      }
      G.audio.unlock();
      dragging = { dy: p.y - hookY(sim.st.s), u: Math.max(0, sim.u) };
      cv.setPointerCapture(e.pointerId);
      sim.pull(dragging.u);                                  // the finger pulls through a "grip": thick media make it lag
      trial = null;
      if (!everDragged) { everDragged = true; if (P.achieve("first_drag")) reward("ach:first_drag", 3, { x: e.clientX, y: e.clientY }); }
      say(DRAG_LINES[Math.floor(Math.random() * DRAG_LINES.length)], 2);
    });
    cv.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const p = pointerPos(e);
      const eqY = hookY(SP.equilibrium(sim.p));
      const u = clamp((p.y - dragging.dy - eqY) / scale, 0, U_MAX);
      dragging.u = u; sim.pull(u);
    });
    const letGo = () => {
      if (!dragging) return;
      dragging = null;
      const u0 = sim.u;
      if (u0 < 0.02 && Math.abs(sim.st.v) < 0.05) { sim.reset(sim.p, 0); return; }        // too small: it just settles
      lab.lastU0 = u0;
      sim.release();
      trial = startRelease(u0);
      G.sfx.boing(0.6); G.buzz(15);
      say(RELEASE_LINES[Math.floor(Math.random() * RELEASE_LINES.length)], 1.8);
    };
    cv.addEventListener("pointerup", letGo); cv.addEventListener("pointercancel", letGo);

    // ---- what counts as learning: watching real swings, and comparing ----
    function startRelease(u0) { return { k: lab.k, m: mass(), b: lab.b, u0, seen: false }; }
    const same = (a, b) => Math.abs(a - b) / Math.max(a, b) < 0.03;
    function observe() {
      if (!trial || trial.seen || sim.held) return;
      if (sim.periods() < 2 && sim.t < SP.period(sim.p) * 1.2) return;   // at least one full swing
      trial.seen = true; releases.push(trial); keeper.seen();
      const r = releases, c = trial;
      const got = [];
      if (c.u0 >= 0.03) got.push("springs.hooke");
      if ((formulaOpen || P.data.physics.formulaSeen) && c.u0 >= 0.10) got.push("springs.energy");
      if (r.some((x) => x !== c && same(x.m, c.m) && Math.max(x.k, c.k) / Math.min(x.k, c.k) >= 1.5)) got.push("springs.oscillation");
      if (r.some((x) => x !== c && same(x.k, c.k) && Math.max(x.m, c.m) / Math.min(x.m, c.m) >= 1.5)) got.push("springs.shm");
      const fresh = got.filter((id) => P.completeSubtopic(id));
      if (fresh.length) { celebrate(fresh); questionCooldown = 2; return; }
      if (!P.data.physics.formulaSeen && c.u0 >= 0.10 && done().includes("springs.hooke")) say("רוצה לראות כמה אנרגיה נאגרה? לחצו על 'הצג נוסחה'.", 3.5);
      else if (!done().includes("springs.oscillation") && releases.length >= 2) say("נסו קפיץ קשיח יותר ותראו מה קורה לקצב.", 3);
      else if (!done().includes("springs.shm") && done().includes("springs.oscillation")) say("ומה אם הדמות כבדה יותר? הזיזו את המסה או החליפו דמות.", 3.5);
      maybeAsk();
    }

    function celebrate(ids) {
      const r = creatureRect(sim.st.s), cr = cv.getBoundingClientRect();
      celebrateUnits("springs", ids, { x: cr.left + r.cx, y: cr.top + r.y + r.h / 2 });
    }
    const pool = () => QUESTIONS.filter((q) => !["springs.wall", "springs.launch", "springs.graph"].includes(q.unit) && (done().includes(q.unit) || q.unit === "springs.hooke"));
    function maybeAsk() {
      if (questionCooldown > 0) { questionCooldown--; return; }
      if (inviteQuestion(box, "springs", pool())) questionCooldown = 3;
    }

    // ---- drawing ----
    function pencilLine(x0, y0, x1, y1, w = 2, color = "#3a3a40") {
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.globalAlpha *= 0.35; ctx.lineWidth = w * 0.6; ctx.beginPath(); ctx.moveTo(x0 + 0.8, y0 + 0.6); ctx.lineTo(x1 + 0.8, y1 + 0.6); ctx.stroke(); ctx.globalAlpha /= 0.35;
    }
    function draw() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H); lifeStage(ctx, W, H, "lab");
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.direction = "ltr";                                 // numbers and units read left to right
      const p = sim.p, s = sim.st.s, eq = SP.equilibrium(p);
      const r = creatureRect(s), x = r.cx;
      // ceiling, hatched
      ctx.fillStyle = "#F4F4F2"; ctx.fillRect(x - 70, 0, 140, TOP);
      pencilLine(x - 74, TOP, x + 74, TOP, 2.4);
      ctx.save(); ctx.beginPath(); ctx.rect(x - 70, 0, 140, TOP); ctx.clip();
      ctx.strokeStyle = "rgba(58,58,64,0.35)"; ctx.lineWidth = 1.2;
      for (let i = -10; i < 160; i += 10) { ctx.beginPath(); ctx.moveTo(x - 70 + i, TOP); ctx.lineTo(x - 70 + i + 14, 0); ctx.stroke(); }
      ctx.restore();
      fluid.drawBack(ctx, W, H, TOP);
      // ruler: s from the natural length, in metres
      const rx = 40, y0 = hookY(0), yEnd = hookY(eq + U_MAX + 0.02);
      pencilLine(rx, TOP, rx, yEnd, 1.6, "#6B6B70");
      ctx.font = "600 11px " + FONT; ctx.fillStyle = "#606671"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      const stepM = scale > 400 ? 0.05 : scale > 180 ? 0.1 : 0.2;
      for (let m = 0; L0 + m <= (yEnd - TOP) / scale + 1e-6; m = +(m + stepM / 2).toFixed(4)) {
        const y = hookY(m), major = Math.abs((m / stepM) - Math.round(m / stepM)) < 1e-6;
        ctx.strokeStyle = "#6B6B70"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx + (major ? 12 : 6), y); ctx.stroke();
        if (major) ctx.fillText(fmt(m, stepM < 0.1 ? 2 : 1), rx - 6, y);
      }
      ctx.save(); ctx.translate(rx - 26, (TOP + y0) / 2 + 10); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("s (m)", 0, 0); ctx.restore();
      // equilibrium line
      const yEq = hookY(eq);
      ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = "rgba(138,96,232,0.75)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(rx, yEq); ctx.lineTo(W - 12, yEq); ctx.stroke(); ctx.restore();
      ctx.fillStyle = "#6E48C9"; ctx.font = "600 12px " + FONT;
      ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.fillText("שיווי משקל", W - 12, yEq - 10); ctx.direction = "ltr";
      // the spring: its look follows k, and it ends exactly at the hook
      const yS = hookY(s);
      drawSpring(ctx, x, TOP, x, yS - 7, lab.k, true);
      ctx.fillStyle = "#E2574C"; ctx.beginPath(); ctx.moveTo(rx + 2, yS); ctx.lineTo(rx + 12, yS - 6); ctx.lineTo(rx + 12, yS + 6); ctx.fill();
      ctx.font = "700 12px " + FONT;
      const tag = fmt(s, 2) + " m", tw = ctx.measureText(tag).width + 12;
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#E2574C"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(rx + 14, yS - 11, tw, 22, 6) : ctx.rect(rx + 14, yS - 11, tw, 22); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#C2392F"; ctx.textAlign = "left"; ctx.fillText(tag, rx + 20, yS);
      // the creature, hanging from the hook (a little squash from the motion is visual only)
      if (img.complete && img.naturalWidth) {
        const a = SP.accel(s, sim.st.v, p);
        const sq = reduceMotion ? 1 : 1 + clamp(-a / 120, -0.06, 0.06);
        ctx.save(); ctx.translate(x, yS); ctx.scale(2 - sq, sq);
        ctx.drawImage(img, -r.w / 2, -r.top * r.h, r.w, r.h); ctx.restore();
      }
      // the hook goes into the top of the head, drawn over it so they are one piece
      ctx.strokeStyle = "#F49A35"; ctx.lineWidth = 2.8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, yS - 8); ctx.lineTo(x, yS - 2); ctx.arc(x + 4, yS - 2, 4, Math.PI, Math.PI * 1.9, true); ctx.stroke();
      ctx.fillStyle = "#F49A35"; ctx.beginPath(); ctx.ellipse(x, yS + 1, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      // the two forces on the creature: weight down, spring up (same scale, so they can be compared)
      {
        const Wt = p.m * p.g, Fs = p.k * s, kpx = 78 / Math.max(Wt, Fs * 0.6, 1), cy = r.y + r.h * 0.55, ox = r.w * 0.5 + 22;
        forceArrow(ctx, x + Math.min(ox, W - x - 70), cy, 0, Wt * kpx, "#2785C7", "mg", { value: Wt });
        if (Math.abs(Fs) > 0.05) forceArrow(ctx, x + Math.min(ox, W - x - 70), cy, 0, -Fs * kpx, "#25A06F", "kΔx", { value: Math.abs(Fs) });
      }
      fluid.drawFront(ctx, x, yS + r.h * 0.45, r.w, sim.st.v);
      // where the finger is, when the body lags behind it (thick media)
      if (dragging && Math.abs(dragging.u - sim.u) * scale > 6) {
        const ty = hookY(SP.equilibrium(p) + dragging.u);
        ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = "rgba(150,120,70,0.75)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - r.w * 0.6, ty); ctx.lineTo(x + r.w * 0.6, ty); ctx.stroke(); ctx.restore();
        ctx.fillStyle = "#7f6c4c"; ctx.font = "600 12px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.fillText("האצבע", x - r.w * 0.6 - 6, ty + 4); ctx.direction = "ltr";
      }
      // first time: show where to pull (big, and to the side of the creature so it does not cover it)
      if (!everDragged && !reduceMotion) {
        const k = (performance.now() / 900) % 1;
        const ax = Math.max(rx + 50, x - r.w / 2 - 38), ay = yS + r.h * 0.25 + k * 34;
        ctx.globalAlpha = Math.sin(k * Math.PI); ctx.strokeStyle = "#258EF6"; ctx.lineWidth = 4.5;
        ctx.beginPath(); ctx.moveTo(ax, ay - 32); ctx.lineTo(ax, ay); ctx.moveTo(ax - 11, ay - 12); ctx.lineTo(ax, ay); ctx.lineTo(ax + 11, ay - 12); ctx.stroke();
        ctx.globalAlpha = 1; ctx.font = "800 18px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "center";
        const ty = yS + r.h * 0.25 + 62;
        ctx.lineWidth = 5; ctx.strokeStyle = "rgba(255,254,252,0.95)"; ctx.fillStyle = "#1A74D0";
        ["גררו", "למטה"].forEach((w, i) => { ctx.strokeText(w, ax, ty + i * 21); ctx.fillText(w, ax, ty + i * 21); });   // two short lines: fits beside the creature
        ctx.direction = "ltr";
      }
    }
    function paintReadouts() {
      const p = sim.p, s = sim.st.s;
      $("#rS").textContent = fmt(s * 100, 1) + " cm";
      const F = -p.k * s;
      $("#rF").textContent = fmt(Math.abs(F), 1) + " N " + (F < 0 ? "↑" : F > 0 ? "↓" : "");
      $("#rE").textContent = fmt(SP.elasticEnergy(s, p.k), 2) + " J";
      const Tm = sim.measuredPeriod();
      const rT = $("#rT");
      if (p.b > 0 && !SP.underdamped(p)) { rT.textContent = "אין תנודה"; rT.className = "dim"; }
      else if (Tm && !sim.held && p.b === 0) { rT.textContent = fmt(Tm) + " s"; rT.className = ""; rT.title = "נמדד מהתנועה; לפי הנוסחה " + fmt(SP.period(p)) + " s"; }
      else { rT.textContent = (p.b > 0 ? "≈" : "") + fmt(SP.period(p)) + " s"; rT.className = "dim"; }
    }
    let fpaint = 0;
    function frame(now) {
      const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (!isSheetOpen()) sim.advance(dt);
      fluid.tick(dt, now);
      const target = targetScale();
      scale += (target - scale) * Math.min(1, dt * 5);
      draw();
      if ((fpaint++ & 3) === 0) { paintReadouts(); if (formulaOpen) paintFormula(); }
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) $("#say").hidden = true; }
      observe();
      keeper.tick(!dragging && (!trial || trial.seen));
      raf = requestAnimationFrame(frame);
    }
    scale = targetScale() || 300;
    raf = requestAnimationFrame(frame);
    say(nameOf(sp) + " תלוי על הקפיץ. גררו אותו למטה ושחררו.", 3.2);
    cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); closeInfo(); infoLive = () => ({}); fluid.destroy(); document.querySelector(".sheet-back")?.remove(); };
    bindModeSeg(args);
  };

  // ======================================================================
  //  SPRING FROM THE WALL: the creature on a floor with friction
  // ======================================================================
  SCREENS.wall = (args = {}) => {
    lab.mode = "wall";
    setTitle("קפיץ־קפוץ", "קפיץ מהקיר, רצפה עם חיכוך");
    let sp = activeSpecies();
    const m0 = () => phys(sp).mass_kg, mass = () => lab.massOverride ?? m0();
    const mu = () => (phys(sp).surfaces || {})[lab.surface] || { mu_s: phys(sp).mu_s, mu_k: phys(sp).mu_k };
    const hp = () => SP.hparams(mass(), lab.k, mu().mu_s, mu().mu_k);
    screenEl.innerHTML = `
      <div class="lab-screen">
        ${modeSeg("wall")}
        <div class="lab" id="lab">
          <canvas id="labCanvas"></canvas>
          <div class="bubble say" id="say" hidden></div>
          <div class="lab-tools">
            <button class="chip" id="charChip" type="button"></button>
            <button class="chip" id="formulaBtn" type="button">הצג נוסחה</button>
          </div>
        </div>
        <div class="readouts">
          <button type="button" class="readout" data-info="x"><small>מתיחה x <i class="qi">?</i></small><b id="rS">–</b></button>
          <button type="button" class="readout" data-info="F"><small>כוח קפיץ <i class="qi">?</i></small><b id="rF">–</b></button>
          <button type="button" class="readout" data-info="friction"><small>חיכוך <i class="qi">?</i></small><b id="rE">–</b></button>
          <button type="button" class="readout" data-info="T"><small>זמן מחזור <i class="qi">?</i></small><b id="rT">–</b></button>
        </div>
        <div class="card controls">
          <div><div class="meter-label"><span>הרצפה ${infoBtn("surface")}</span><span class="ltr" id="muVal"></span></div>
            <div class="surfaces">${Object.entries(SPR.surfaces).map(([k, v]) => `<button type="button" data-s="${k}" aria-pressed="${k === lab.surface}">${esc(v)}</button>`).join("")}</div></div>
          <div class="slider-row"><label for="kIn"><span>קשיחות הקפיץ k ${infoBtn("k")}</span><span class="val" id="kVal"></span></label>
            <input id="kIn" type="range" min="30" max="400" step="5"></div>
          <div class="slider-row"><label for="mIn"><span>מסה m ${infoBtn("m")} <span class="note" id="mNote"></span></span><span class="val" id="mVal"></span></label>
            <input id="mIn" class="mass" type="range" min="0.5" max="4" step="0.1">
            <button class="linkish" id="mReset" type="button" hidden>חזרה למסת הדמות</button></div>
        </div>
        <div class="card formula" id="formula" hidden></div>
      </div>`;
    const cv = $("#labCanvas"), ctx = cv.getContext("2d"), box = $("#lab");
    let W = 0, H = 0, DPR = 1;
    const resize = () => { const r = box.getBoundingClientRect(); DPR = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(box);
    const img = new Image(); let imgSp = null;
    const loadImg = () => { if (imgSp !== sp) { imgSp = sp; img.src = artOf(sp); } };
    loadImg();
    const sim = new SP.HSim(hp(), 0);
    const L0W = 0.40, XMIN = -0.15, XMAX = 0.30;
    let scale = 240, dragging = null, trial = null, everDragged = false, sayT = 0, raf = 0, lastT = performance.now(), formulaOpen = false, questionCooldown = 1, fpaint = 0;
    const kIn = $("#kIn"), mIn = $("#mIn");
    kIn.value = lab.k; mIn.value = mass();
    function say(text, secs = 2.6) { const el = $("#say"); el.textContent = text; el.hidden = false; sayT = secs; }
    function paintControls() {
      $("#kVal").textContent = lab.k + " N/m";
      $("#mVal").textContent = fmt(mass(), 1) + " kg";
      const own = lab.massOverride === null;
      $("#mNote").textContent = own ? "(מסת " + nameOf(sp) + ")" : "(מסה בניסוי)";
      $("#mReset").hidden = own;
      $("#muVal").textContent = `μs ${fmt(mu().mu_s, 2)} · μk ${fmt(mu().mu_k, 2)}`;
      $("#charChip").innerHTML = `<img src="${artOf(sp)}" alt=""><span>${esc(nameOf(sp))} · <span class="ltr">${fmt(m0(), 1)} kg</span></span><span aria-hidden="true">⇄</span>`;
      for (const b of screenEl.querySelectorAll(".surfaces [data-s]")) b.setAttribute("aria-pressed", b.dataset.s === lab.surface);
    }
    function reconfigure(why) {
      sim.reset(hp(), 0); trial = null;
      if (why) say(why, 3);
      paintControls(); paintFormula();
    }
    kIn.addEventListener("input", () => { lab.k = +kIn.value; reconfigure(); });
    mIn.addEventListener("input", () => { keeper.touched(); lab.massOverride = Math.abs(+mIn.value - m0()) < 0.05 ? null : +mIn.value; reconfigure(); });
    mIn.addEventListener("change", () => { if (lab.massOverride !== null) say(`${FEEL(mass() / m0())} החיכוך המרבי עכשיו ${fmt(mu().mu_s * mass() * 9.81, 1)} N.`, 3.6); });
    $("#mReset").addEventListener("click", () => { lab.massOverride = null; mIn.value = m0(); reconfigure(); });
    for (const b of screenEl.querySelectorAll(".surfaces [data-s]")) b.addEventListener("click", () => {
      lab.surface = b.dataset.s; G.sfx.pop();
      reconfigure(`על ${SPR.surfaces[lab.surface]} ל${nameOf(sp)} יש μs = ${fmt(mu().mu_s, 2)}. החיכוך שייך לזוג: הרגליים והרצפה.`);
    });
    $("#formulaBtn").addEventListener("click", () => {
      formulaOpen = $("#formula").hidden; $("#formula").hidden = !formulaOpen;
      $("#formulaBtn").textContent = formulaOpen ? "הסתר נוסחה" : "הצג נוסחה";
      if (formulaOpen) { paintFormula(); $("#formula").scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    });
    function paintFormula() {
      if ($("#formula").hidden) return;
      const p = sim.p, x = sim.st.x;
      setFormula($("#formula"), `
        <div class="eq"><span>כוח הקפיץ</span><span class="m">F = −k·x<em>${fmt(-p.k * x, 1)} N</em></span></div>
        <div class="eq"><span>חיכוך קינטי (בזמן תנועה)</span><span class="m">f<sub>k</sub> = μk·m·g<em>${fmt(p.muk * p.m * p.g, 2)} N</em></span></div>
        <div class="eq"><span>נשאר תקוע אם</span><span class="m">|x| ≤ μs·m·g / k<em>${fmt(SP.stickZone(p) * 100, 1)} cm</em></span></div>
        <div class="eq"><span>כל חצי תנודה מאבדת</span><span class="m">Δx = 2·μk·m·g / k<em>${fmt(SP.halfSwingLoss(p) * 100, 1)} cm</em></span></div>
        <div class="eq"><span>זמן מחזור</span><span class="m">T = 2π·√(m/k)<em>${fmt(2 * Math.PI * Math.sqrt(p.m / p.k))} s</em></span></div>
        <p class="fine">החיכוך לא משנה את קצב התנודה, רק מקטין אותה בכל חצי תנודה עד שהיא נעצרת.</p>`);
    }
    paintControls();
    const keeper = massKeeper({ say: (t, d) => say(t, d), m0, apply: (m) => { mIn.value = m; sim.reset(hp(), 0); trial = null; paintControls(); } });
    infoLive = () => ({ k: lab.k, m: mass(), m0: m0(), name: nameOf(sp), x: sim.st.x, mus: mu().mu_s, muk: mu().mu_k, surface: SPR.surfaces[lab.surface], zone: SP.stickZone(sim.p), loss: SP.halfSwingLoss(sim.p) });
    $("#charChip").addEventListener("click", () => pickOwned(sp, "להחליף דמות בניסוי", (newSp) => {
      sp = newSp; lab.massOverride = null; mIn.value = m0(); loadImg();
      reconfigure(`${nameOf(sp)} על אותה רצפה: μs = ${fmt(mu().mu_s, 2)}, ${fmt(m0(), 1)} kg.`);
    }));

    // geometry: wall on the right, the creature on the floor to its left
    const geo = () => {
      const h = phys(sp).height_m, asp = img.naturalWidth ? img.naturalWidth / img.naturalHeight : 0.9;
      const floorY = H * 0.68, wallX = W - 24;
      const target = Math.min((wallX - 36) / (L0W + XMAX + h * asp), (floorY - 34) / h);
      return { floorY, wallX, h, asp, target, X0: wallX - L0W * scale };
    };
    const creatureX = (g, x) => g.X0 - x * scale;           // where the spring meets the body
    // the drawing is placed so its body edge (not the empty margin of the picture) touches the spring
    function bodyBox(g, x) {
      const fat = fatness(mass(), m0()), hh = g.h * scale * (1 + (fat - 1) * 0.12), ww = g.h * scale * g.asp * fat;
      const sy = g.floorY - g.h * scale * 0.42, pr = probe(img), edge = pr ? pr.right(1 - (g.floorY - sy) / hh) : 1;
      const xr = creatureX(g, x), right = xr + ww * (1 - edge);
      return { xr, sy, left: right - ww, right, w: ww, h: hh, top: g.floorY - hh, mid: right - ww / 2 };
    }
    function pos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener("pointerdown", (e) => {
      if (isSheetOpen()) return;
      const g = geo(), p = pos(e), b = bodyBox(g, sim.st.x), xr = b.xr;
      if (p.x < b.left - 30 || p.x > b.right + 20 || p.y < b.top - 30 || p.y > g.floorY + 30) {
        const at = { x: e.clientX, y: e.clientY };
        if (p.x > xr && p.x < g.wallX && Math.abs(p.y - b.sy) < 28) openInfo("k", at);
        else if (Math.abs(p.y - g.floorY) < 16 || (p.y > g.floorY + 56 && p.y < g.floorY + 84)) openInfo("stick", at);
        else if (p.y > g.floorY + 16 && p.y < g.floorY + 44) openInfo("x", at);
        return;
      }
      G.audio.unlock();
      dragging = { off: xr - p.x };
      cv.setPointerCapture(e.pointerId);
      sim.hold(sim.st.x); trial = null;
      if (!everDragged) { everDragged = true; if (P.achieve("first_drag")) reward("ach:first_drag", 3, { x: e.clientX, y: e.clientY }); }
    });
    cv.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const g = geo(), p = pos(e);
      sim.hold(clamp((g.X0 - (p.x + dragging.off)) / scale, XMIN, XMAX));
    });
    const letGo = () => {
      if (!dragging) return;
      dragging = null;
      const x0 = sim.st.x;
      if (Math.abs(x0) < 0.02) { sim.reset(sim.p, 0); return; }
      sim.release();
      trial = { x0, seen: false };
      if (sim.p.k * Math.abs(x0) <= sim.p.mus * sim.p.m * sim.p.g) { say("החיכוך הסטטי מחזיק אותי! צריך למתוח יותר.", 3); G.sfx.hmph(0.4); }
      else { G.sfx.boing(0.6); G.buzz(15); say(x0 > 0 ? "וואו, אני נגרר לקיר!" : "פיו, הקפיץ דוחף!", 1.6); }
    };
    cv.addEventListener("pointerup", letGo); cv.addEventListener("pointercancel", letGo);

    function observe() {
      if (!trial || trial.seen || dragging) return;
      if (!(sim.turns.length >= 1 && sim.stuck)) return;
      trial.seen = true; keeper.seen();
      G.sfx.tick();
      const zone = SP.stickZone(sim.p), stoppedShort = Math.abs(sim.st.x) > 0.002;
      say(stoppedShort ? `נעצרתי ${fmt(Math.abs(sim.st.x) * 100, 1)} ס״מ לפני הנקודה הרפויה. החיכוך החזיק אותי!` : "נעצרתי. הקפיץ כבר לא חזק מספיק.", 3.5);
      if (P.completeSubtopic("springs.wall")) {
        const g = geo(), cr = cv.getBoundingClientRect();
        setTimeout(() => celebrateUnits("springs", ["springs.wall"], { x: cr.left + creatureX(g, sim.st.x) - 40, y: cr.top + g.floorY - 60 }), 900);
        questionCooldown = 2; return;
      }
      if (questionCooldown > 0) questionCooldown--;
      else if (inviteQuestion(box, "springs", QUESTIONS.filter((q) => q.unit === "springs.wall" || done().includes(q.unit)))) questionCooldown = 3;
    }

    function arrow(x0, y0, dx, dy, color, label, below, value) { forceArrow(ctx, x0, y0, dx, dy, color, label, { value, dy: below ? 22 : 0 }); }
    function draw() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); lifeStage(ctx, W, H, "wall");
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.direction = "ltr";
      const g = geo(), p = sim.p, x = sim.st.x;
      // floor: tinted by surface
      const tint = { dry_wood: "#C9A87A", smooth_ice: "#9CCFE6", rubber_mat: "#5B5D63" }[lab.surface] || "#999";
      ctx.fillStyle = tint + "33"; ctx.fillRect(0, g.floorY, W, 14);
      ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, g.floorY); ctx.lineTo(W, g.floorY); ctx.stroke();
      ctx.strokeStyle = "rgba(58,58,64,0.25)"; ctx.lineWidth = 1;
      for (let i = 0; i < W; i += 12) { ctx.beginPath(); ctx.moveTo(i, g.floorY + 14); ctx.lineTo(i + 10, g.floorY + 2); ctx.stroke(); }
      // wall
      ctx.fillStyle = "#F4F4F2"; ctx.fillRect(g.wallX, 0, W - g.wallX, g.floorY);
      ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(g.wallX, 10); ctx.lineTo(g.wallX, g.floorY); ctx.stroke();
      ctx.strokeStyle = "rgba(58,58,64,0.35)"; ctx.lineWidth = 1.2;
      for (let y = 14; y < g.floorY; y += 12) { ctx.beginPath(); ctx.moveTo(g.wallX + 2, y + 10); ctx.lineTo(W, y); ctx.stroke(); }
      // where static friction wins: |x| ≤ μs m g / k
      const zone = SP.stickZone(p), zl = clamp(g.X0 - zone * scale, 0, W), zr = clamp(g.X0 + zone * scale, 0, g.wallX);
      ctx.fillStyle = "rgba(204,87,148,0.16)"; ctx.fillRect(zl, g.floorY - 6, zr - zl, 12);
      ctx.fillStyle = "#B03F7A"; ctx.font = "600 12px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "center";
      ctx.fillText("כאן החיכוך מנצח", clamp((zl + zr) / 2, 60, W - 70), g.floorY + 70); ctx.direction = "ltr";
      // ruler: x from the relaxed spring, + away from the wall
      const ry = g.floorY + 30;
      ctx.strokeStyle = "#6B6B70"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(g.X0 - XMAX * scale - 6, ry); ctx.lineTo(g.X0 - XMIN * scale + 6, ry); ctx.stroke();
      ctx.fillStyle = "#606671"; ctx.font = "600 11px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let m = XMIN; m <= XMAX + 1e-9; m += 0.05) {
        const px = g.X0 - m * scale, major = Math.abs(m * 10 - Math.round(m * 10)) < 1e-6;
        ctx.beginPath(); ctx.moveTo(px, ry); ctx.lineTo(px, ry + (major ? 9 : 5)); ctx.stroke();
        if (major) ctx.fillText(fmt(m, 1), px, ry + 11);
      }
      ctx.fillText("x (m)", g.X0 - XMAX * scale - 22, ry - 4);
      // spring from the wall to the creature
      const b = bodyBox(g, x), xr = b.xr, sy = b.sy, w = b.w;
      drawSpring(ctx, g.wallX, sy, xr + 3, sy, lab.k, true);
      // the creature, standing on the floor, its side touching the spring
      if (img.complete && img.naturalWidth) ctx.drawImage(img, b.left, b.top, b.w, b.h);
      ctx.fillStyle = "#F49A35"; ctx.beginPath(); ctx.ellipse(xr + 1, sy, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
      // forces: spring (blue) at the body, friction (magenta) at the feet
      // the forces on the creature, drawn as a diagram above it (not over the drawing)
      const L = clamp((b.top - 44) / 2, 26, 60);                 // mg must end (with its label) above the head
      const F = -p.k * x, Wt = p.m * p.g, kpx = L / Wt;
      const cy = Math.max(L + 8, b.top - 34 - L), ox = clamp(b.mid, 90, W - 90);
      fbdAnchor(ctx, b.mid, b.top + b.h * 0.45, ox, cy);
      forceArrow(ctx, ox, cy, 0, Wt * kpx, "#2785C7", "mg", { value: Wt });
      forceArrow(ctx, ox, cy, 0, -Wt * kpx, "#8969C6", "N", { value: Wt });
      if (Math.abs(F) > 0.05) arrow(ox, cy, clamp(-F * kpx, -150, 150), 0, "#25A06F", "kΔx", false, Math.abs(F));   // + x is away from the wall = left on screen
      let f = 0;
      if (sim.st.moving) f = -Math.sign(sim.st.v) * p.muk * p.m * p.g;           // + means away from the wall
      else if (!sim.held && Math.abs(F) > 0.01) f = -F;                          // static: exactly what is needed
      if (Math.abs(f) > 0.05) arrow(ox, cy + 3, clamp(-f * kpx, -150, 150), 0, "#CC5794", sim.st.moving ? "f_k" : "f_s", true, Math.abs(f));
      // first time: show where to pull
      if (!everDragged && !reduceMotion) {
        const k = (performance.now() / 900) % 1;
        ctx.globalAlpha = Math.sin(k * Math.PI); ctx.strokeStyle = "#258EF6"; ctx.lineWidth = 3;
        const ax = b.left - 14 - k * 24, ay = g.floorY - g.h * scale * 0.6;
        ctx.beginPath(); ctx.moveTo(ax + 22, ay); ctx.lineTo(ax, ay); ctx.moveTo(ax + 8, ay - 7); ctx.lineTo(ax, ay); ctx.lineTo(ax + 8, ay + 7); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = "#1A74D0"; ctx.font = "800 16px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const hx = Math.max(44, b.left - 50);                    // beside the creature, under the arrow, clear of the force diagram above
        ["גררו", "הצידה"].forEach((w, i) => { ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,254,252,0.95)"; ctx.strokeText(w, hx, ay + 26 + i * 19); ctx.fillText(w, hx, ay + 26 + i * 19); });
        ctx.direction = "ltr";
      }
    }
    function paintReadouts() {
      const p = sim.p, x = sim.st.x, F = -p.k * x;
      $("#rS").textContent = fmt(x * 100, 1) + " cm";
      $("#rF").textContent = fmt(Math.abs(F), 1) + " N";
      const rE = $("#rE");
      if (sim.st.moving) { rE.textContent = "f_k " + fmt(p.muk * p.m * p.g, 1) + " N"; rE.className = ""; }
      else if (Math.abs(F) > 0.01 && !sim.held) { rE.textContent = "f_s " + fmt(Math.abs(F), 1) + " N"; rE.className = ""; }
      else { rE.textContent = "0 N"; rE.className = "dim"; }
      $("#rT").textContent = fmt(2 * Math.PI * Math.sqrt(p.m / p.k)) + " s"; $("#rT").className = "dim";
    }
    function frame(now) {
      const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (!isSheetOpen()) sim.advance(dt);
      const g = geo(); scale += (g.target - scale) * Math.min(1, dt * 5);
      draw();
      if ((fpaint++ & 3) === 0) { paintReadouts(); if (formulaOpen) paintFormula(); }
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) $("#say").hidden = true; }
      observe();
      keeper.tick(!dragging && (!trial || trial.seen));
      raf = requestAnimationFrame(frame);
    }
    scale = geo().target || 240;
    raf = requestAnimationFrame(frame);
    say(`${nameOf(sp)} על ${SPR.surfaces[lab.surface]}, קשור לקפיץ. משכו אותו מהקיר ושחררו.`, 3.4);
    cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); closeInfo(); infoLive = () => ({}); document.querySelector(".sheet-back")?.remove(); };
    bindModeSeg(args);
  };

  // ======================================================================
  //  FLOOR LAUNCHER: "לא הזמנתי טיסה!" — compress, let go, the spring pushes only while compressed
  // ======================================================================
  SCREENS.launch = (args = {}) => {
    lab.mode = "launch";
    setTitle("קפיץ־קפוץ", "קפיץ משגר מהרצפה");
    let sp = activeSpecies();
    const m0 = () => phys(sp).mass_kg, mass = () => lab.massOverride ?? m0();
    lab.lk = lab.lk || 300;
    const lp = () => SP.lparams(mass(), lab.lk);
    screenEl.innerHTML = `
      <div class="lab-screen">
        ${modeSeg("launch")}
        <div class="lab tall" id="lab">
          <canvas id="labCanvas"></canvas>
          <div class="bubble say" id="say" hidden></div>
          <div class="lab-tools">
            <button class="chip" id="charChip" type="button"></button>
            <button class="chip" id="formulaBtn" type="button">הצג נוסחה</button>
          </div>
        </div>
        <div class="readouts">
          <button type="button" class="readout" data-info="compress"><small>דחיסה x <i class="qi">?</i></small><b id="rC">–</b></button>
          <button type="button" class="readout" data-info="E"><small>אנרגיה <i class="qi">?</i></small><b id="rE">–</b></button>
          <button type="button" class="readout" data-info="detach"><small>מהירות <i class="qi">?</i></small><b id="rV">–</b></button>
          <button type="button" class="readout" data-info="height"><small>גובה מרבי <i class="qi">?</i></small><b id="rH">–</b></button>
        </div>
        <div class="card controls">
          <div class="slider-row"><label for="kIn"><span>קשיחות הקפיץ k ${infoBtn("k")}</span><span class="val" id="kVal"></span></label>
            <input id="kIn" type="range" min="60" max="400" step="5"></div>
          <div class="slider-row"><label for="mIn"><span>מסה m ${infoBtn("m")} <span class="note" id="mNote"></span></span><span class="val" id="mVal"></span></label>
            <input id="mIn" class="mass" type="range" min="0.5" max="4" step="0.1">
            <button class="linkish" id="mReset" type="button" hidden>חזרה למסת הדמות</button></div>
        </div>
        <div class="card formula" id="formula" hidden></div>
      </div>`;
    const cv = $("#labCanvas"), ctx = cv.getContext("2d"), box = $("#lab");
    let W = 0, H = 0, DPR = 1;
    const resize = () => { const r = box.getBoundingClientRect(); DPR = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(box);
    const img = new Image(); let imgSp = null;
    const loadImg = () => { if (imgSp !== sp) { imgSp = sp; img.src = artOf(sp); } };
    loadImg();
    const L0S = 0.32, CMAX = 0.26;                      // natural length of the launcher spring, deepest push
    const sim = new SP.LSim(lp());
    let scale = 300, dragging = null, everDragged = false, sayT = 0, raf = 0, lastT = performance.now(), formulaOpen = false, fpaint = 0, questionCooldown = 1;
    let trial = null, last = null, peakShown = null;    // last = { c, h (rise from start), apex } of the previous flight
    const kIn = $("#kIn"), mIn = $("#mIn");
    kIn.value = lab.lk; mIn.value = mass();
    function say(text, secs = 2.6) { const el = $("#say"); el.textContent = text; el.hidden = false; sayT = secs; }
    function paintControls() {
      $("#kVal").textContent = lab.lk + " N/m";
      $("#mVal").textContent = fmt(mass(), 1) + " kg";
      const own = lab.massOverride === null;
      $("#mNote").textContent = own ? "(מסת " + nameOf(sp) + ")" : "(מסה בניסוי)";
      $("#mReset").hidden = own;
      $("#charChip").innerHTML = `<img src="${artOf(sp)}" alt=""><span>${esc(nameOf(sp))} · <span class="ltr">${fmt(m0(), 1)} kg</span></span><span aria-hidden="true">⇄</span>`;
    }
    function reconfigure(why) { sim.reset(lp()); trial = null; peakShown = null; if (why) say(why, 3.4); paintControls(); paintFormula(); }
    kIn.addEventListener("input", () => { lab.lk = +kIn.value; reconfigure(); });
    kIn.addEventListener("change", () => reconfigure(`קפיץ חדש. כדי לעוף צריך לדחוס יותר מ-${fmt(SP.detachCompression(sim.p) * 100, 1)} ס״מ.`));
    mIn.addEventListener("input", () => { keeper.touched(); lab.massOverride = Math.abs(+mIn.value - m0()) < 0.05 ? null : +mIn.value; reconfigure(); });
    mIn.addEventListener("change", () => { if (lab.massOverride !== null) say(`${FEEL(mass() / m0())} עכשיו הסף לעוף: ${fmt(SP.detachCompression(sim.p) * 100, 1)} ס״מ.`, 3.6); });
    $("#mReset").addEventListener("click", () => { lab.massOverride = null; mIn.value = m0(); reconfigure(); });
    $("#formulaBtn").addEventListener("click", () => {
      formulaOpen = $("#formula").hidden; $("#formula").hidden = !formulaOpen;
      $("#formulaBtn").textContent = formulaOpen ? "הסתר נוסחה" : "הצג נוסחה";
      if (formulaOpen) { P.data.physics.formulaSeen = true; P.save(); paintFormula(); $("#formula").scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    });
    const curC = () => Math.max(0, -sim.st.y);
    function paintFormula() {
      if ($("#formula").hidden) return;
      const p = sim.p, c = sim.held ? curC() : (sim.c0 ?? curC());
      setFormula($("#formula"), `
        <div class="eq"><span>אנרגיה בקפיץ הדחוס</span><span class="m">E = ½·k·x²<em>${fmt(0.5 * p.k * c * c, 2)} J</em></span></div>
        <div class="eq"><span>דחיסה במנוחה</span><span class="m">x_rest = m·g / k<em>${fmt(SP.restCompression(p) * 100, 1)} cm</em></span></div>
        <div class="eq"><span>הסף לעוף</span><span class="m">x > 2·m·g / k<em>${fmt(SP.detachCompression(p) * 100, 1)} cm</em></span></div>
        <div class="eq"><span>גובה מנקודת ההתחלה</span><span class="m">h = k·x² / (2·m·g)<em>${fmt(SP.riseFromStart(p, c) * 100, 1)} cm</em></span></div>
        <p class="fine">בלי חיכוך אוויר. הקפיץ חסר מסה ולא קשור לדמות: הוא דוחף רק כשהוא דחוס.</p>`);
    }
    paintControls();
    const keeper = massKeeper({ say: (t, d) => say(t, d), m0, apply: (m) => { mIn.value = m; sim.reset(lp()); trial = null; paintControls(); } });
    infoLive = () => ({ k: lab.lk, m: mass(), m0: m0(), name: nameOf(sp), c: sim.held ? curC() : (sim.c0 ?? curC()), h: last ? last.h : undefined });
    $("#charChip").addEventListener("click", () => pickOwned(sp, "להחליף דמות בניסוי", (newSp) => { sp = newSp; lab.massOverride = null; mIn.value = m0(); loadImg(); reconfigure(`${nameOf(sp)} על אותו קפיץ.`); }));

    // ---- geometry: floor at the bottom, the camera follows the flight upward ----
    let camY = 0;                                        // metres of world above the floor that are scrolled off the bottom
    const floorY = () => H - 66 + camY * scale;
    const plateY = (y) => floorY() - (L0S + Math.min(0, y)) * scale;       // the spring top stays at the natural length after leaving
    const bodyY = (y) => floorY() - (L0S + y) * scale;                     // base of the creature
    function targetScale() {
      const h = phys(sp).height_m, apex = Math.max(0.25, last ? last.apex + 0.05 : 0.25, sim.held ? SP.launchApex(sim.p, curC()) : 0);
      return clamp((H - 110) / (L0S + Math.min(apex, 1.4) + h * 1.1), 70, 700);
    }
    function bodyRect() {
      const fat = fatness(mass(), m0()), h = phys(sp).height_m * scale * (1 + (fat - 1) * 0.12), w = (img.naturalWidth ? h * img.naturalWidth / img.naturalHeight : h) * fat;
      const cx = W * 0.5, base = bodyY(sim.st.y);
      return { x: cx - w / 2, y: base - h, w, h, cx, base };
    }
    function pos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener("pointerdown", (e) => {
      if (isSheetOpen() || sim.flying) return;
      const p = pos(e), r = bodyRect();
      if (p.x < r.x - 30 || p.x > r.x + r.w + 30 || p.y < r.y - 30 || p.y > r.base + 40) {
        const at = { x: e.clientX, y: e.clientY };
        if (Math.abs(p.x - r.cx) < 40 && p.y > r.base && p.y < floorY()) openInfo("k", at);
        else if (Math.abs(p.y - (floorY() - (L0S - SP.detachCompression(sim.p)) * scale)) < 14) openInfo("detach", at);
        return;
      }
      G.audio.unlock();
      dragging = { y0: p.y, c0: curC() };
      cv.setPointerCapture(e.pointerId);
      sim.hold(curC()); trial = null;
      if (!everDragged) { everDragged = true; if (P.achieve("first_drag")) reward("ach:first_drag", 3, { x: e.clientX, y: e.clientY }); }
      say("אממ… למה אתם דוחפים אותי למטה?", 1.8);
    });
    cv.addEventListener("pointermove", (e) => { if (!dragging) return; const p = pos(e); sim.hold(clamp(dragging.c0 + (p.y - dragging.y0) / scale, SP.restCompression(sim.p), Math.min(CMAX, L0S * 0.85))); });
    const letGo = () => {
      if (!dragging) return;
      dragging = null;
      const c = curC();
      if (c - SP.restCompression(sim.p) < 0.01) { sim.reset(sim.p); return; }
      sim.release();
      const willFly = c > SP.detachCompression(sim.p);
      trial = { c, willFly, seen: false, t0: performance.now() };
      G.sfx.boing(0.8); G.buzz(20);
      say(willFly ? "לא הזמנתי טיסההה!" : "בוינג… בוינג…", 1.6);
    };
    cv.addEventListener("pointerup", letGo); cv.addEventListener("pointercancel", letGo);

    // ---- what counts: a real flight, landed, compared with the prediction ----
    function observe() {
      if (!trial || trial.seen || dragging) return;
      if (trial.willFly) {
        if (sim.apex === null || !sim.landed) return;
        trial.seen = true; keeper.seen();
        const rise = sim.apex + trial.c;
        last = { c: trial.c, h: rise, apex: sim.apex };
        peakShown = { y: sim.apex, until: performance.now() + 6000 };
        say(`עפתי ${fmt(rise * 100, 0)} ס״מ מעל נקודת ההתחלה! ${fmt(0.5 * sim.p.k * trial.c * trial.c, 2)} J של קפיץ הפכו לגובה.`, 4);
        if (P.completeSubtopic("springs.launch")) {
          const cr = cv.getBoundingClientRect(), r = bodyRect();
          setTimeout(() => celebrateUnits("springs", ["springs.launch"], { x: cr.left + r.cx, y: cr.top + r.y }), 1200);
          questionCooldown = 2; return;
        }
      } else {
        if (performance.now() - trial.t0 < 2500) return;
        trial.seen = true; keeper.seen();
        say(`לא עפתי. צריך לדחוס יותר מ-2mg/k = ${fmt(SP.detachCompression(sim.p) * 100, 1)} ס״מ, אחרת הקפיץ לא מספיק להרים אותי עד האורך הטבעי.`, 4.4);
        sim.reset(sim.p);
      }
      if (questionCooldown > 0) questionCooldown--;
      else if (inviteQuestion(box, "springs", QUESTIONS.filter((q) => q.unit === "springs.launch"))) questionCooldown = 3;
    }

    function draw() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); lifeStage(ctx, W, H, "launch");
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.direction = "ltr";
      const p = sim.p, y = sim.st.y, fy = floorY(), cx = W * 0.5;
      // floor
      ctx.fillStyle = "#F4F4F2"; ctx.fillRect(0, fy, W, H - fy);
      ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();
      ctx.strokeStyle = "rgba(58,58,64,0.25)"; ctx.lineWidth = 1;
      for (let i = 0; i < W; i += 12) { ctx.beginPath(); ctx.moveTo(i, fy + 12); ctx.lineTo(i + 10, fy + 2); ctx.stroke(); }
      // height ruler from the floor, metres
      const rx = 46;
      ctx.strokeStyle = "#6B6B70"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(rx, fy); ctx.lineTo(rx, 8); ctx.stroke();
      ctx.font = "600 11px " + FONT; ctx.fillStyle = "#606671"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      const stepM = scale > 300 ? 0.1 : 0.2;
      for (let m = 0; fy - m * scale > 6; m = +(m + stepM).toFixed(2)) { const yy = fy - m * scale; ctx.beginPath(); ctx.moveTo(rx, yy); ctx.lineTo(rx + 8, yy); ctx.stroke(); ctx.fillText(fmt(m, 1), rx - 4, yy); }
      ctx.save(); ctx.translate(13, fy - 0.5 * scale); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("גובה (m)", 0, 0); ctx.restore();
      // natural length and the take-off threshold
      const yNat = fy - L0S * scale, yDet = fy - (L0S - SP.detachCompression(p)) * scale;
      ctx.save(); ctx.setLineDash([5, 6]); ctx.lineWidth = 1.4;
      ctx.strokeStyle = "rgba(138,96,232,0.7)"; ctx.beginPath(); ctx.moveTo(rx + 10, yNat); ctx.lineTo(W - 10, yNat); ctx.stroke();
      if (SP.detachCompression(p) < Math.min(CMAX, L0S * 0.85)) { ctx.strokeStyle = "rgba(204,87,148,0.75)"; ctx.beginPath(); ctx.moveTo(rx + 10, yDet); ctx.lineTo(W - 10, yDet); ctx.stroke(); }
      ctx.restore();
      ctx.font = "600 12px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "right";
      ctx.fillStyle = "#6E48C9"; ctx.fillText("אורך טבעי", W - 12, yNat - 9);
      if (SP.detachCompression(p) < Math.min(CMAX, L0S * 0.85)) { ctx.fillStyle = "#B03F7A"; ctx.fillText("מתחת לקו: עפים", W - 12, yDet + 14); }
      ctx.direction = "ltr";
      // the spring under the plate (it stops at the natural length once the creature has left)
      const py = plateY(y);
      drawSpring(ctx, cx, fy, cx, py + 4, lab.lk, true);
      ctx.fillStyle = "#3a3a40"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - 34, py - 3, 68, 7, 3) : ctx.rect(cx - 34, py - 3, 68, 7); ctx.fill();
      // the apex of the last flight
      if (peakShown && performance.now() < peakShown.until) {
        const ay = bodyY(peakShown.y);
        ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = "#E39B28"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(rx + 10, ay); ctx.lineTo(W - 10, ay); ctx.stroke(); ctx.restore();
        ctx.fillStyle = "#B8741A"; ctx.font = "700 12px " + FONT; ctx.textAlign = "right"; ctx.fillText(`h = ${fmt(last.h * 100, 0)} cm`, W - 12, ay - 9);
      }
      // the creature
      const r = bodyRect();
      if (img.complete && img.naturalWidth) {
        const sq = sim.st.touching && !reduceMotion ? 1 - clamp(-y - SP.restCompression(p), 0, 0.2) * 0.5 : 1 + (sim.flying && !reduceMotion ? clamp(Math.abs(sim.st.v) / 40, 0, 0.06) : 0);
        ctx.save(); ctx.translate(r.cx, r.base); ctx.scale(2 - sq, sq); ctx.drawImage(img, -r.w / 2, -r.h, r.w, r.h); ctx.restore();
      }
      // the real forces: weight always; the spring only while touching
      const Wt = p.m * p.g, Fs = sim.st.touching ? p.k * Math.max(0, -y) : 0, kpx = 70 / Math.max(Wt, Fs * 0.55, 1), ay = r.base - r.h * 0.5, ax = r.cx + r.w * 0.5 + 18;
      forceArrow(ctx, Math.min(ax, W - 70), ay, 0, Wt * kpx, "#2785C7", "mg", { value: Wt });
      if (Fs > 0.05) forceArrow(ctx, Math.min(ax, W - 70), ay, 0, -Fs * kpx, "#25A06F", "kΔx", { value: Fs });
      else if (sim.flying) { ctx.fillStyle = "#606671"; ctx.font = "600 12px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "left"; ctx.fillText("באוויר: רק כובד", Math.min(ax, W - 70) - 40, ay - 16); ctx.direction = "ltr"; }
      if (!everDragged && !reduceMotion) {
        const k = (performance.now() / 900) % 1;
        ctx.globalAlpha = Math.sin(k * Math.PI); ctx.strokeStyle = "#258EF6"; ctx.lineWidth = 3;
        const bx = r.x - 18, by = r.y + r.h * 0.3 + k * 24;
        ctx.beginPath(); ctx.moveTo(bx, by - 22); ctx.lineTo(bx, by); ctx.moveTo(bx - 7, by - 8); ctx.lineTo(bx, by); ctx.lineTo(bx + 7, by - 8); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = "#1A74D0"; ctx.font = "600 13px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.fillText("לחצו למטה ושחררו", bx, r.y - 12); ctx.direction = "ltr";
      }
    }
    function paintReadouts() {
      const p = sim.p, c = curC();
      $("#rC").textContent = fmt(c * 100, 1) + " cm";
      $("#rE").textContent = fmt(0.5 * p.k * c * c, 2) + " J";
      $("#rV").textContent = fmt(Math.abs(sim.st.v), 2) + " m/s";
      const rH = $("#rH");
      if (sim.held) { const fly = c > SP.detachCompression(p); rH.textContent = fly ? "≈" + fmt(SP.riseFromStart(p, c) * 100, 0) + " cm" : "לא עף"; rH.className = "dim"; }
      else if (last) { rH.textContent = fmt(last.h * 100, 0) + " cm"; rH.className = ""; }
      else { rH.textContent = "–"; rH.className = "dim"; }
    }
    function frame(now) {
      const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (!isSheetOpen()) sim.advance(dt);
      scale += (targetScale() - scale) * Math.min(1, dt * 4);
      // follow the creature up when it leaves the screen
      const need = Math.max(0, (L0S + sim.st.y + phys(sp).height_m * 1.2) - (H - 80) / scale);
      camY += (need - camY) * Math.min(1, dt * 6);
      draw();
      if ((fpaint++ & 3) === 0) { paintReadouts(); if (formulaOpen) paintFormula(); }
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) $("#say").hidden = true; }
      observe();
      keeper.tick(!dragging && !sim.flying && (!trial || trial.seen));
      raf = requestAnimationFrame(frame);
    }
    scale = targetScale() || 300;
    raf = requestAnimationFrame(frame);
    say(`${nameOf(sp)} עומד על קפיץ. לחצו אותו למטה ושחררו.`, 3.2);
    cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); closeInfo(); infoLive = () => ({}); document.querySelector(".sheet-back")?.remove(); };
    bindModeSeg(args);
  };

  // ======================================================================
  //  MEASURING THE SPRING: calibration weights, a ruler, and an F–x graph
  //  The weights are lab equipment: the creature only reads the ruler.
  // ======================================================================
  SCREENS.graph = (args = {}) => {
    lab.mode = "graph";
    setTitle("קפיץ־קפוץ", "מדידה: גרף כוח מול התארכות");
    const sp = activeSpecies(), WKG = 0.1, NMAX = 6;
    screenEl.innerHTML = `
      <div class="lab-screen">
        ${modeSeg("graph")}
        <div class="lab tall" id="lab">
          <canvas id="labCanvas"></canvas>
          <div class="bubble say" id="say" hidden></div>
        </div>
        <div class="weights-row">
          <button class="btn quiet" id="wMinus" type="button" aria-label="להוריד משקולת">− משקולת</button>
          <button class="btn primary" id="measure" type="button">למדוד ולרשום</button>
          <button class="btn quiet" id="wPlus" type="button" aria-label="להוסיף משקולת">+ משקולת</button>
        </div>
        <div class="readouts">
          <button type="button" class="readout" data-info="weights"><small>משקולות <i class="qi">?</i></small><b id="rN">–</b></button>
          <button type="button" class="readout" data-info="F"><small>כוח F <i class="qi">?</i></small><b id="rF">–</b></button>
          <button type="button" class="readout" data-info="x"><small>התארכות x <i class="qi">?</i></small><b id="rX">–</b></button>
          <button type="button" class="readout" data-info="slope"><small>k מהגרף <i class="qi">?</i></small><b id="rK">–</b></button>
        </div>
        <div class="card controls">
          <div class="slider-row"><label for="kIn"><span>קשיחות הקפיץ שבמעבדה k ${infoBtn("k")}</span><span class="val" id="kVal"></span></label>
            <input id="kIn" type="range" min="10" max="120" step="5"></div>
          <p class="fine" style="margin:6px 0 0">החלפת קפיץ מוחקת את המדידות. כל משקולת: 100 g.</p>
        </div>
        <div class="card formula" id="formula"></div>
      </div>`;
    const cv = $("#labCanvas"), ctx = cv.getContext("2d"), box = $("#lab");
    let W = 0, H = 0, DPR = 1;
    const resize = () => { const r = box.getBoundingClientRect(); DPR = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(box);
    const img = new Image(); img.src = artOf(sp);
    lab.gk = lab.gk || 40;
    let n = 0, sayT = 0, raf = 0, lastT = performance.now(), fpaint = 0, points = [], flash = 0, questionCooldown = 1;
    // the hanger alone is light; the spring settles quickly (lab springs are damped)
    const hp = () => SP.params(Math.max(0.02, n * WKG), lab.gk, 2 * Math.sqrt(lab.gk * Math.max(0.02, n * WKG)) * 0.3);
    const sim = new SP.Sim(hp(), 0);
    sim.st.s = 0; sim.st.v = 0;
    function retarget() { const s0 = sim.st.s, v0 = sim.st.v; sim.p = hp(); sim.st = { s: s0, v: v0 }; sim.held = false; }
    const kIn = $("#kIn"); kIn.value = lab.gk;
    function say(text, secs = 2.6) { const el = $("#say"); el.textContent = text; el.hidden = false; sayT = secs; }
    const fit = () => { if (points.length < 2) return null; let a = 0, b = 0; for (const q of points) { a += q.F * q.x; b += q.x * q.x; } return b > 0 ? a / b : null; };
    const settled = () => Math.abs(sim.st.v) < 0.004 && Math.abs(sim.st.s - n * WKG * 9.81 / lab.gk) < 0.002;
    function paint() {
      $("#kVal").textContent = lab.gk + " N/m";
      $("#wMinus").disabled = n <= 0; $("#wPlus").disabled = n >= NMAX;
      const k = fit();
      setFormula($("#formula"), `
        <div class="eq"><span>משקל המשקולות</span><span class="m">F = m·g<em>${fmt(n * WKG * 9.81, 2)} N</em></span></div>
        <div class="eq"><span>חוק הוק</span><span class="m">F = k·x<em>${points.length} נקודות</em></span></div>
        <div class="eq"><span>השיפוע של הגרף</span><span class="m">k = ΔF / Δx<em>${k ? fmt(k, 0) + " N/m" : "צריך 2 נקודות"}</em></span></div>
        <div class="eq"><span>השטח מתחת לקו</span><span class="m">E = ½·k·x²<em>${points.length ? fmt(0.5 * lab.gk * Math.max(...points.map((q) => q.x)) ** 2, 3) + " J" : "–"}</em></span></div>`);
    }
    kIn.addEventListener("input", () => { lab.gk = +kIn.value; points = []; retarget(); paint(); });
    kIn.addEventListener("change", () => say("קפיץ חדש! המדידות נמחקו. בואו נמדוד מההתחלה.", 2.6));
    $("#wPlus").addEventListener("click", () => { if (n >= NMAX) return; n++; retarget(); G.sfx.tick(); G.buzz(10); paint(); if (n === 1) say("עכשיו חכו שהקפיץ יירגע, ולחצו 'למדוד ולרשום'.", 3); });
    $("#wMinus").addEventListener("click", () => { if (n <= 0) return; n--; retarget(); G.sfx.tick(); paint(); });
    $("#measure").addEventListener("click", () => {
      G.audio.unlock();
      if (!settled()) { say("רגע, הקפיץ עוד זז. מודדים רק כשהוא עומד.", 2.2); return; }
      if (n === 0) { say("בלי משקולות אין כוח ואין התארכות. נקודה (0,0) כבר על הגרף.", 2.8); return; }
      // the reading is honest: ±1 mm reading error on the ruler
      const x = Math.max(0, sim.st.s + (Math.random() * 2 - 1) * 0.001), F = n * WKG * 9.81;
      const old = points.findIndex((q) => q.n === n); if (old >= 0) points.splice(old, 1);
      points.push({ n, x, F }); points.sort((a, b) => a.x - b.x); flash = 1;
      G.sfx.pop(); paint();
      const k = fit();
      if (points.length === 1) say(`רשמתי: ${fmt(F, 2)} N, ${fmt(x * 100, 1)} ס״מ. עוד משקולת ועוד מדידה!`, 3);
      else say(`השיפוע של הקו: k ≈ ${fmt(k, 0)} N/m. ${points.length >= 3 ? "הנקודות על קו ישר!" : "עוד נקודה אחת וזה כבר קו."}`, 3);
      if (points.length >= 3) {
        if (P.completeSubtopic("springs.graph")) {
          const r = $("#measure").getBoundingClientRect();
          setTimeout(() => celebrateUnits("springs", ["springs.graph"], { x: r.left + r.width / 2, y: r.top }), 900); questionCooldown = 2;
        } else if (questionCooldown > 0) questionCooldown--;
        else if (inviteQuestion(box, "springs", QUESTIONS.filter((q) => q.unit === "springs.graph"))) questionCooldown = 3;
      }
    });
    infoLive = () => ({ k: lab.gk, n, x: sim.st.s, fit: fit(), xmax: points.length ? Math.max(...points.map((q) => q.x)) : 0, s: sim.st.s, eq: n * WKG * 9.81 / lab.gk });
    paint();

    // graph area (right) and spring area (left), shared pixel helpers
    const nice = (v) => { const e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; };
    const extMax = () => NMAX * WKG * 9.81 / lab.gk;                                     // deepest stretch with every weight on
    const G0 = () => { const gx = Math.max(140, W * 0.42), gw = W - gx - 14, gy = 18, gh = H - 66, xMax = nice(extMax() * 1.1); return { gx, gw, gy, gh, xMax, xStep: xMax / 5, FMax: NMAX * WKG * 9.81 * 1.05 }; };
    cv.addEventListener("pointerdown", (e) => {
      const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, g = G0(), at = { x: e.clientX, y: e.clientY };
      if (px > g.gx && py > g.gy && py < g.gy + g.gh) openInfo(points.length >= 2 && py > g.gy + g.gh * 0.55 ? "area" : "slope", at);
      else if (px < g.gx - 10 && py > H * 0.55) openInfo("weights", at);
      else if (px < g.gx - 10) openInfo("k", at);
    });

    function draw() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); lifeStage(ctx, W, H, "graph");
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.direction = "ltr";
      const g = G0(), sx = Math.min(70, g.gx * 0.5), top = 16, L0g = 0.12, span = Math.max(0.1, extMax() * 1.08), mpx = (H - 170) / (L0g + span);   // metres → px for the spring drawing
      // stand
      ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(sx - 40, top); ctx.lineTo(sx + 30, top); ctx.stroke();
      const end = top + (L0g + sim.st.s) * mpx;
      drawSpring(ctx, sx, top, sx, end, lab.gk, false);
      // hanger and weights
      ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, end); ctx.lineTo(sx, end + 10); ctx.stroke();
      for (let i = 0; i < n; i++) {
        const wy = end + 10 + i * 9;
        ctx.fillStyle = i % 2 ? "#8B8F98" : "#A4A8B0"; ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sx - 15, wy, 30, 8, 2) : ctx.rect(sx - 15, wy, 30, 8); ctx.fill(); ctx.stroke();
      }
      if (n) { ctx.fillStyle = "#3a3a40"; ctx.font = "600 11px " + FONT; ctx.textAlign = "left"; ctx.fillText(`${n * 100} g`, sx + 20, end + 14 + n * 4.5); }
      // ruler: x from the unloaded end
      const rx = sx - 30, y0 = top + L0g * mpx;
      ctx.strokeStyle = "#6B6B70"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(rx, y0); ctx.lineTo(rx, y0 + span * mpx); ctx.stroke();
      ctx.fillStyle = "#606671"; ctx.font = "600 10px " + FONT; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      const major = nice(span * 100 / 5), minor = major / 2;
      for (let c = 0; c <= span * 100 + 1e-6; c = +(c + minor).toFixed(3)) { const yy = y0 + c / 100 * mpx, big = Math.abs(c / major - Math.round(c / major)) < 1e-6; ctx.beginPath(); ctx.moveTo(rx, yy); ctx.lineTo(rx + (big ? 8 : 4), yy); ctx.stroke(); if (big) ctx.fillText(c, rx - 3, yy); }
      ctx.fillText("cm", rx - 3, y0 - 10);
      ctx.strokeStyle = "#E2574C"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, end); ctx.lineTo(sx - 4, end); ctx.stroke();
      // the creature holds the ruler and takes notes (it is not on the spring)
      if (img.complete && img.naturalWidth) { const h = Math.min(110, H * 0.28), w = h * img.naturalWidth / img.naturalHeight; ctx.drawImage(img, Math.max(2, rx - w * 0.55), H - h - 6, w, h); }
      // graph
      const X = (x) => g.gx + x / g.xMax * g.gw, Y = (F) => g.gy + g.gh - F / g.FMax * g.gh;
      ctx.fillStyle = "#fff"; ctx.fillRect(g.gx, g.gy, g.gw, g.gh);
      ctx.strokeStyle = "#EEF0F3"; ctx.lineWidth = 1;
      for (let x = g.xStep; x < g.xMax - 1e-9; x += g.xStep) { ctx.beginPath(); ctx.moveTo(X(x), g.gy); ctx.lineTo(X(x), g.gy + g.gh); ctx.stroke(); }
      for (let F = 1; F < g.FMax; F += 1) { ctx.beginPath(); ctx.moveTo(g.gx, Y(F)); ctx.lineTo(g.gx + g.gw, Y(F)); ctx.stroke(); }
      ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(g.gx, g.gy); ctx.lineTo(g.gx, g.gy + g.gh); ctx.lineTo(g.gx + g.gw, g.gy + g.gh); ctx.stroke();
      ctx.fillStyle = "#606671"; ctx.font = "600 10px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let k5 = 0; k5 <= 5; k5++) ctx.fillText(fmt(k5 * g.xStep, g.xStep < 0.01 ? 3 : 2), X(k5 * g.xStep), g.gy + g.gh + 4);
      ctx.fillText("x (m)", g.gx + g.gw / 2, g.gy + g.gh + 18);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let F = 0; F <= g.FMax; F += 2) ctx.fillText(F, g.gx - 4, Y(F));
      ctx.save(); ctx.translate(g.gx - 22, g.gy + g.gh / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("F (N)", 0, 0); ctx.restore();
      const k = fit();
      if (k) {
        const xe = Math.min(g.xMax, g.FMax / k);
        // area under the line up to the last point (the stored energy)
        const xm = Math.max(...points.map((q) => q.x));
        ctx.fillStyle = "rgba(138,96,232,0.12)"; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(xm), Y(k * xm)); ctx.lineTo(X(xm), Y(0)); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#8A60E8"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(xe), Y(k * xe)); ctx.stroke();
        // slope triangle
        if (points.length >= 2) {
          const a = points[0], b = points[points.length - 1], xa = a.x, xb = b.x;
          ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = "#E39B28"; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(X(xa), Y(k * xa)); ctx.lineTo(X(xb), Y(k * xa)); ctx.lineTo(X(xb), Y(k * xb)); ctx.stroke(); ctx.restore();
          ctx.fillStyle = "#B8741A"; ctx.font = "700 11px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText("Δx", (X(xa) + X(xb)) / 2, Y(k * xa) + 3);
          ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("ΔF", X(xb) + 4, (Y(k * xa) + Y(k * xb)) / 2);
        }
        ctx.fillStyle = "#6E48C9"; ctx.font = "700 13px " + FONT; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`k ≈ ${fmt(k, 0)} N/m`, g.gx + 8, g.gy + 6);
      }
      ctx.fillStyle = "#2785C7"; ctx.beginPath(); ctx.arc(X(0), Y(0), 3.5, 0, Math.PI * 2); ctx.fill();
      points.forEach((q) => {
        ctx.fillStyle = "#2785C7"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(X(q.x), Y(q.F), 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      if (flash > 0 && points.length) { const q = points[points.length - 1]; ctx.strokeStyle = `rgba(37,142,246,${flash})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(q.x), Y(q.F), 6 + (1 - flash) * 16, 0, Math.PI * 2); ctx.stroke(); }
      // the current (not yet recorded) state as a hollow dot
      if (n) { ctx.strokeStyle = settled() ? "#25A06F" : "#B9BCC2"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(Math.max(0, sim.st.s)), Y(n * WKG * 9.81), 7, 0, Math.PI * 2); ctx.stroke(); }
    }
    function paintReadouts() {
      $("#rN").textContent = `${n} · ${fmt(n * WKG, 1)} kg`;
      $("#rF").textContent = fmt(n * WKG * 9.81, 2) + " N";
      $("#rX").textContent = fmt(sim.st.s * 100, 1) + " cm"; $("#rX").className = settled() ? "" : "dim";
      const k = fit(); $("#rK").textContent = k ? fmt(k, 0) + " N/m" : "–"; $("#rK").className = k ? "" : "dim";
    }
    function frame(now) {
      const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      sim.advance(dt); flash = Math.max(0, flash - dt * 1.5);
      draw();
      if ((fpaint++ & 3) === 0) paintReadouts();
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) $("#say").hidden = true; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    say(`${nameOf(sp)} מחזיק את הסרגל. תלו משקולות, חכו שהקפיץ יירגע, ורשמו נקודה בגרף.`, 4);
    cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); closeInfo(); infoLive = () => ({}); document.querySelector(".sheet-back")?.remove(); };
    bindModeSeg(args);
  };

  // ======================================================================
  //  TWO SPRINGS: in series (same force, stretches add) or in parallel (same stretch, forces add)
  //  Massless springs: the pair behaves like one spring with k_eq, so the motion is the hanging spring's.
  // ======================================================================
  const keqOf = (how, k1, k2) => how === "series" ? k1 * k2 / (k1 + k2) : k1 + k2;
  SCREENS.pair = (args = {}) => {
    lab.mode = "pair";
    lab.pair = lab.pair || { how: "series", k1: 80, k2: 160 };
    const cfg = lab.pair;
    setTitle("קפיץ־קפוץ", "שני קפיצים: בטור ובמקביל");
    let sp = activeSpecies();
    const m0 = () => phys(sp).mass_kg, mass = () => lab.massOverride ?? m0();
    const keq = () => keqOf(cfg.how, cfg.k1, cfg.k2);
    const params = () => SP.params(mass(), keq(), 0);
    screenEl.innerHTML = `
      <div class="lab-screen">
        ${modeSeg("pair")}
        <div class="seg seg-sub" role="group" aria-label="איך מחברים"><button type="button" data-how="series">בטור (אחד מתחת לשני)</button><button type="button" data-how="parallel">במקביל (זה לצד זה)</button></div>
        <div class="lab say-low" id="lab">
          <canvas id="labCanvas"></canvas>
          <div class="bubble say" id="say" hidden></div>
          <div class="lab-tools">
            <button class="chip" id="charChip" type="button"></button>
            <button class="chip" id="formulaBtn" type="button">הצג נוסחה</button>
          </div>
        </div>
        <div class="readouts">
          <button type="button" class="readout" data-info="keq"><small>k שקול <i class="qi">?</i></small><b id="rK">–</b></button>
          <button type="button" class="readout" data-info="pairF"><small>F1 · F2 <i class="qi">?</i></small><b id="rF">–</b></button>
          <button type="button" class="readout" data-info="pairX"><small>x1 · x2 <i class="qi">?</i></small><b id="rX">–</b></button>
          <button type="button" class="readout" data-info="T"><small>זמן מחזור <i class="qi">?</i></small><b id="rT">–</b></button>
        </div>
        <div class="card controls">
          <div class="slider-row"><label for="k1In"><span>קפיץ 1: k1 ${infoBtn("k")}</span><span class="val" id="k1Val"></span></label>
            <input id="k1In" type="range" min="30" max="300" step="5"></div>
          <div class="slider-row"><label for="k2In"><span>קפיץ 2: k2</span><span class="val" id="k2Val"></span></label>
            <input id="k2In" class="k2" type="range" min="30" max="300" step="5"></div>
          <div class="slider-row"><label for="mIn"><span>מסה m ${infoBtn("m")} <span class="note" id="mNote"></span></span><span class="val" id="mVal"></span></label>
            <input id="mIn" class="mass" type="range" min="0.5" max="4" step="0.1">
            <button class="linkish" id="mReset" type="button" hidden>חזרה למסת הדמות</button></div>
        </div>
        <div class="card formula" id="formula" hidden></div>
      </div>`;
    const cv = $("#labCanvas"), ctx = cv.getContext("2d"), box = $("#lab");
    let W = 0, H = 0, DPR = 1;
    const resize = () => { const r = box.getBoundingClientRect(); DPR = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(box);
    const img = new Image(); let imgSp = null;
    const loadImg = () => { if (imgSp !== sp) { imgSp = sp; img.src = artOf(sp); } };
    loadImg();
    const L1 = 0.17, U_MAXP = 0.2;                         // natural length of each spring; deepest pull below equilibrium
    const sim = new SP.Sim(params(), 0);
    let scale = 300, dragging = null, everDragged = false, sayT = 0, raf = 0, lastT = performance.now(), formulaOpen = false, fpaint = 0, trial = null, questionCooldown = 1;
    const k1In = $("#k1In"), k2In = $("#k2In"), mIn = $("#mIn");
    k1In.value = cfg.k1; k2In.value = cfg.k2; mIn.value = mass();
    function say(text, secs = 2.6) { const el = $("#say"); el.textContent = text; el.hidden = false; sayT = secs; }
    // how the load splits: series → same F, x_i = F/k_i ; parallel → same x, F_i = k_i·x
    function split(s) {
      if (cfg.how === "series") { const F = keq() * s; return { F1: F, F2: F, x1: F / cfg.k1, x2: F / cfg.k2 }; }
      return { F1: cfg.k1 * s, F2: cfg.k2 * s, x1: s, x2: s };
    }
    function paintControls() {
      $("#k1Val").textContent = cfg.k1 + " N/m"; $("#k2Val").textContent = cfg.k2 + " N/m";
      $("#mVal").textContent = fmt(mass(), 1) + " kg";
      const own = lab.massOverride === null;
      $("#mNote").textContent = own ? "(מסת " + nameOf(sp) + ")" : "(מסה בניסוי)";
      $("#mReset").hidden = own;
      $("#charChip").innerHTML = `<img src="${artOf(sp)}" alt=""><span>${esc(nameOf(sp))} · <span class="ltr">${fmt(m0(), 1)} kg</span></span><span aria-hidden="true">⇄</span>`;
      for (const b of screenEl.querySelectorAll("[data-how]")) b.setAttribute("aria-pressed", b.dataset.how === cfg.how);
    }
    function paintFormula() {
      if ($("#formula").hidden) return;
      const s = sim.st.s, d = split(s);
      setFormula($("#formula"), cfg.how === "series" ? `
        <div class="eq"><span>אותו כוח בשני הקפיצים</span><span class="m">F1 = F2 = F<em>${fmt(d.F1, 1)} N</em></span></div>
        <div class="eq"><span>ההתארכויות מתחברות</span><span class="m">x = x1 + x2<em>${fmt(d.x1 * 100, 1)} + ${fmt(d.x2 * 100, 1)} cm</em></span></div>
        <div class="eq"><span>הקבוע השקול</span><span class="m">1/k_eq = 1/k1 + 1/k2<em>${fmt(keq(), 1)} N/m</em></span></div>
        <div class="eq"><span>זמן מחזור</span><span class="m">T = 2π·√(m/k_eq)<em>${fmt(SP.period(sim.p))} s</em></span></div>
        <p class="fine">בטור הקפיץ השקול רך יותר מכל אחד מהשניים. הקפיץ הרך (k קטן) הוא זה שנמתח יותר.</p>` : `
        <div class="eq"><span>אותה התארכות לשניהם</span><span class="m">x1 = x2 = x<em>${fmt(d.x1 * 100, 1)} cm</em></span></div>
        <div class="eq"><span>הכוחות מתחברים</span><span class="m">F = F1 + F2<em>${fmt(d.F1, 1)} + ${fmt(d.F2, 1)} N</em></span></div>
        <div class="eq"><span>הקבוע השקול</span><span class="m">k_eq = k1 + k2<em>${fmt(keq(), 0)} N/m</em></span></div>
        <div class="eq"><span>זמן מחזור</span><span class="m">T = 2π·√(m/k_eq)<em>${fmt(SP.period(sim.p))} s</em></span></div>
        <p class="fine">במקביל הקפיץ השקול קשיח יותר מכל אחד. הקפיץ הקשיח (k גדול) הוא זה שמחזיק יותר מהמשקל.</p>`);
    }
    function reconfigure(why) { sim.reset(params(), 0); trial = null; if (why) say(why, 4); paintControls(); paintFormula(); }
    const explain = () => {
      const d = split(SP.equilibrium(sim.p));
      return cfg.how === "series"
        ? `בטור: k שקול = ${fmt(keq(), 1)} N/m, רך יותר מכל אחד. שניהם מושכים ${fmt(d.F1, 1)} N, אבל קפיץ ${cfg.k1 < cfg.k2 ? "1" : "2"} (הרך) נמתח יותר.`
        : `במקביל: k שקול = ${fmt(keq(), 0)} N/m, קשיח יותר. שניהם נמתחים ${fmt(d.x1 * 100, 1)} ס״מ, וקפיץ ${cfg.k1 > cfg.k2 ? "1" : "2"} (הקשיח) מחזיק יותר.`;
    };
    k1In.addEventListener("input", () => { cfg.k1 = +k1In.value; reconfigure(); });
    k2In.addEventListener("input", () => { cfg.k2 = +k2In.value; reconfigure(); });
    k1In.addEventListener("change", () => say(explain(), 4)); k2In.addEventListener("change", () => say(explain(), 4));
    mIn.addEventListener("input", () => { keeper.touched(); lab.massOverride = Math.abs(+mIn.value - m0()) < 0.05 ? null : +mIn.value; reconfigure(); });
    mIn.addEventListener("change", () => { if (lab.massOverride !== null) say(FEEL(mass() / m0()), 2.6); });
    $("#mReset").addEventListener("click", () => { lab.massOverride = null; mIn.value = m0(); reconfigure(); });
    for (const b of screenEl.querySelectorAll("[data-how]")) b.addEventListener("click", () => { if (cfg.how === b.dataset.how) return; cfg.how = b.dataset.how; G.sfx.pop(); reconfigure(); say(explain(), 4); });
    $("#formulaBtn").addEventListener("click", () => {
      formulaOpen = $("#formula").hidden; $("#formula").hidden = !formulaOpen;
      $("#formulaBtn").textContent = formulaOpen ? "הסתר נוסחה" : "הצג נוסחה";
      if (formulaOpen) { P.data.physics.formulaSeen = true; P.save(); paintFormula(); $("#formula").scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    });
    paintControls();
    const keeper = massKeeper({ say: (t, d) => say(t, d), m0, apply: (m) => { mIn.value = m; sim.reset(params(), 0); trial = null; paintControls(); } });
    infoLive = () => { const d = split(sim.st.s); return { how: cfg.how, k1: cfg.k1, k2: cfg.k2, keq: keq(), k: Math.round(keq()), m: mass(), m0: m0(), name: nameOf(sp), ...d, s: sim.st.s, eq: SP.equilibrium(sim.p) }; };
    $("#charChip").addEventListener("click", () => pickOwned(sp, "להחליף דמות בניסוי", (newSp) => { sp = newSp; lab.massOverride = null; mIn.value = m0(); loadImg(); reconfigure(`${nameOf(sp)} על אותם קפיצים.`); }));

    // ---- geometry ----
    const TOP = 22;
    const total0 = () => cfg.how === "series" ? 2 * L1 : L1 + 0.06;      // parallel: springs + a short hook under the bar
    const hookY = (s) => TOP + (total0() + s) * scale;
    function targetScale() { return clamp((H - TOP - 30) / (total0() + SP.equilibrium(sim.p) + U_MAXP + phys(sp).height_m * 1.02), 60, 900); }
    function creatureRect(s) {
      const fat = fatness(mass(), m0()), pr = probe(img) || { top: 0 };
      const h = phys(sp).height_m * scale * (1 + (fat - 1) * 0.12), w = (img.naturalWidth ? h * img.naturalWidth / img.naturalHeight : h) * fat;
      const cx = W * 0.6, y = hookY(s) - pr.top * h;
      return { x: cx - w / 2, y, w, h, cx, top: pr.top };
    }
    function pos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener("pointerdown", (e) => {
      if (isSheetOpen()) return;
      const p = pos(e), r = creatureRect(sim.st.s), yS = hookY(sim.st.s);
      if (p.x < r.x - 30 || p.x > r.x + r.w + 30 || p.y < yS - 10 || p.y > r.y + r.h + 30) {
        if (p.y < yS - 6) openInfo(cfg.how === "series" ? "series" : "parallel", { x: e.clientX, y: e.clientY });
        return;
      }
      G.audio.unlock();
      dragging = { dy: p.y - yS };
      cv.setPointerCapture(e.pointerId);
      sim.hold(sim.u); trial = null;
      if (!everDragged) { everDragged = true; if (P.achieve("first_drag")) reward("ach:first_drag", 3, { x: e.clientX, y: e.clientY }); }
    });
    cv.addEventListener("pointermove", (e) => { if (!dragging) return; const p = pos(e); sim.hold(clamp((p.y - dragging.dy - hookY(SP.equilibrium(sim.p))) / scale, 0, U_MAXP)); });
    const letGo = () => {
      if (!dragging) return;
      dragging = null;
      const u0 = sim.u;
      if (u0 < 0.02) { sim.reset(sim.p, 0); return; }
      sim.release(); trial = { how: cfg.how, seen: false };
      G.sfx.boing(0.6); G.buzz(15);
      say(cfg.how === "series" ? "שני קפיצים ואני באמצע…" : "שניים מחזיקים אותי, יותר בטוח!", 1.8);
    };
    cv.addEventListener("pointerup", letGo); cv.addEventListener("pointercancel", letGo);

    function observe() {
      if (!trial || trial.seen || sim.held) return;
      if (sim.periods() < 2 && sim.t < SP.period(sim.p) * 1.2) return;
      trial.seen = true; keeper.seen();
      const id = cfg.how === "series" ? "springs.series" : "springs.parallel";
      say(explain(), 4);
      if (P.completeSubtopic(id)) {
        const r = creatureRect(sim.st.s), cr = cv.getBoundingClientRect();
        setTimeout(() => celebrateUnits("springs", [id], { x: cr.left + r.cx, y: cr.top + r.y + r.h / 2 }), 1500);
        questionCooldown = 2; return;
      }
      if (questionCooldown > 0) questionCooldown--;
      else if (inviteQuestion(box, "springs", QUESTIONS.filter((q) => q.unit === "springs.series" || q.unit === "springs.parallel"))) questionCooldown = 3;
    }

    function tag(x, y, lines, color, align = "left") {
      ctx.font = "700 11px " + FONT; ctx.textBaseline = "middle"; ctx.direction = "ltr";
      const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 12, h = lines.length * 14 + 6, x0 = align === "left" ? x : x - w;
      ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.strokeStyle = color; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y - h / 2, w, h, 7) : ctx.rect(x0, y - h / 2, w, h); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color; ctx.textAlign = "left"; lines.forEach((l, i) => ctx.fillText(l, x0 + 6, y - h / 2 + 10 + i * 14));
    }
    function draw() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); lifeStage(ctx, W, H, "pair");
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.direction = "ltr";
      const p = sim.p, s = sim.st.s, d = split(s), r = creatureRect(s), x = r.cx, yS = hookY(s);
      // ceiling
      ctx.fillStyle = "#F4F4F2"; ctx.fillRect(x - 80, 0, 160, TOP);
      ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 84, TOP); ctx.lineTo(x + 84, TOP); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.rect(x - 80, 0, 160, TOP); ctx.clip(); ctx.strokeStyle = "rgba(58,58,64,0.35)"; ctx.lineWidth = 1.2;
      for (let i = -10; i < 180; i += 10) { ctx.beginPath(); ctx.moveTo(x - 80 + i, TOP); ctx.lineTo(x - 80 + i + 14, 0); ctx.stroke(); } ctx.restore();
      // equilibrium line
      const yEq = hookY(SP.equilibrium(p));
      ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = "rgba(138,96,232,0.6)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(12, yEq); ctx.lineTo(W - 12, yEq); ctx.stroke(); ctx.restore();
      if (cfg.how === "series") {
        const yJ = TOP + (L1 + d.x1) * scale;              // the joint between the two springs
        drawSpring(ctx, x, TOP, x, yJ - 4, cfg.k1, false);
        drawSpring(ctx, x, yJ + 4, x, yS - 7, cfg.k2, false);
        ctx.fillStyle = "#F49A35"; ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, yJ, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        tag(x - 40, (TOP + yJ) / 2, ["k1 = " + cfg.k1, "x1 = " + fmt(d.x1 * 100, 1) + " cm", "F1 = " + fmt(d.F1, 1) + " N"], "#1A74D0", "right");
        tag(x - 40, (yJ + yS) / 2, ["k2 = " + cfg.k2, "x2 = " + fmt(d.x2 * 100, 1) + " cm", "F2 = " + fmt(d.F2, 1) + " N"], "#2B8A64", "right");
      } else {
        const dx = 30, yB = TOP + (L1 + s) * scale;          // the rigid bar: both springs end on it, same stretch
        drawSpring(ctx, x - dx, TOP, x - dx, yB - 3, cfg.k1, false);
        drawSpring(ctx, x + dx, TOP, x + dx, yB - 3, cfg.k2, false);
        ctx.fillStyle = "#3a3a40"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - dx - 12, yB - 3, 2 * dx + 24, 6, 3) : ctx.rect(x - dx - 12, yB - 3, 2 * dx + 24, 6); ctx.fill();
        ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, yB + 3); ctx.lineTo(x, yS - 7); ctx.stroke();
        tag(x - dx - 22, (TOP + yB) / 2, ["k1 = " + cfg.k1, "F1 = " + fmt(d.F1, 1) + " N"], "#1A74D0", "right");
        tag(x + dx + 22, (TOP + yB) / 2, ["k2 = " + cfg.k2, "F2 = " + fmt(d.F2, 1) + " N"], "#2B8A64", "left");
        tag(x + dx + 22, (TOP + yB) / 2 + 40, ["x1 = x2 = " + fmt(s * 100, 1) + " cm"], "#6E48C9", "left");
      }
      // creature hanging from the hook
      if (img.complete && img.naturalWidth) {
        const a = SP.accel(s, sim.st.v, p), sq = reduceMotion ? 1 : 1 + clamp(-a / 120, -0.06, 0.06);
        ctx.save(); ctx.translate(x, yS); ctx.scale(2 - sq, sq); ctx.drawImage(img, -r.w / 2, -r.top * r.h, r.w, r.h); ctx.restore();
      }
      ctx.strokeStyle = "#F49A35"; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(x, yS - 8); ctx.lineTo(x, yS - 2); ctx.arc(x + 4, yS - 2, 4, Math.PI, Math.PI * 1.9, true); ctx.stroke();
      ctx.fillStyle = "#F49A35"; ctx.beginPath(); ctx.ellipse(x, yS + 1, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      // forces on the creature: weight, and the pull of the pair (k_eq·x)
      const Wt = p.m * p.g, Fs = keq() * s, kpx = 74 / Math.max(Wt, Fs * 0.6, 1), cy = r.y + r.h * 0.55, ax = x + Math.min(r.w * 0.5 + 22, W - x - 70);
      forceArrow(ctx, ax, cy, 0, Wt * kpx, "#2785C7", "mg", { value: Wt });
      if (Fs > 0.05) forceArrow(ctx, ax, cy, 0, -Fs * kpx, "#25A06F", "kΔx", { value: Fs });
      if (!everDragged && !reduceMotion) {
        const k = (performance.now() / 900) % 1;
        ctx.globalAlpha = Math.sin(k * Math.PI); ctx.strokeStyle = "#258EF6"; ctx.lineWidth = 3;
        const bx = r.x - 16, by = yS + r.h * 0.35 + k * 24;
        ctx.beginPath(); ctx.moveTo(bx, by - 22); ctx.lineTo(bx, by); ctx.moveTo(bx - 7, by - 8); ctx.lineTo(bx, by); ctx.lineTo(bx + 7, by - 8); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    function paintReadouts() {
      const d = split(sim.st.s);
      $("#rK").textContent = fmt(keq(), cfg.how === "series" ? 1 : 0) + " N/m";
      $("#rF").textContent = cfg.how === "series" ? fmt(d.F1, 1) + " = " + fmt(d.F2, 1) : fmt(d.F1, 1) + " · " + fmt(d.F2, 1);
      $("#rX").textContent = cfg.how === "series" ? fmt(d.x1 * 100, 1) + " · " + fmt(d.x2 * 100, 1) : fmt(d.x1 * 100, 1) + " = " + fmt(d.x2 * 100, 1);
      const Tm = sim.measuredPeriod(); $("#rT").textContent = fmt(Tm && !sim.held ? Tm : SP.period(sim.p)) + " s"; $("#rT").className = Tm && !sim.held ? "" : "dim";
    }
    function frame(now) {
      const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (!isSheetOpen()) sim.advance(dt);
      scale += (targetScale() - scale) * Math.min(1, dt * 5);
      draw();
      if ((fpaint++ & 3) === 0) { paintReadouts(); if (formulaOpen) paintFormula(); }
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) $("#say").hidden = true; }
      observe();
      keeper.tick(!dragging && (!trial || trial.seen));
      raf = requestAnimationFrame(frame);
    }
    scale = targetScale() || 300;
    raf = requestAnimationFrame(frame);
    say(explain(), 4);
    cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); closeInfo(); infoLive = () => ({}); document.querySelector(".sheet-back")?.remove(); };
    bindModeSeg(args);
  };

  // ======================================================================
  //  OSCILLATION LAB: the creature on a frictionless track, and live graphs of x, v, a and energy
  //  x is measured from equilibrium; m·a = −k·x − b·v
  // ======================================================================
  SCREENS.osc = (args = {}) => {
    let hitSpring = null;                                   // where the spring was drawn, for tapping it
    lab.mode = "osc";
    setTitle("קפיץ־קפוץ", "מעבדת תנודות וגרפים");
    let sp = activeSpecies();
    const m0 = () => phys(sp).mass_kg, mass = () => lab.massOverride ?? m0();
    lab.ob = lab.ob ?? 0;
    const params = () => SP.params(mass(), lab.k, lab.ob);
    screenEl.innerHTML = `
      <div class="lab-screen">
        ${modeSeg("osc")}
        <div class="lab tall osc" id="lab">
          <canvas id="labCanvas"></canvas>
          <div class="bubble say" id="say" hidden></div>
        </div>
        <div class="readouts">
          <button type="button" class="readout" data-info="T"><small>זמן מחזור <i class="qi">?</i></small><b id="rT">–</b></button>
          <button type="button" class="readout" data-info="omega"><small>ω <i class="qi">?</i></small><b id="rW">–</b></button>
          <button type="button" class="readout" data-info="amp"><small>משרעת A <i class="qi">?</i></small><b id="rA">–</b></button>
          <button type="button" class="readout" data-info="Et"><small>אנרגיה <i class="qi">?</i></small><b id="rE">–</b></button>
        </div>
        <div class="card controls">
          <div class="slider-row"><label for="kIn"><span>קשיחות הקפיץ k ${infoBtn("k")}</span><span class="val" id="kVal"></span></label>
            <input id="kIn" type="range" min="30" max="400" step="5"></div>
          <div class="slider-row"><label for="mIn"><span>מסה m ${infoBtn("m")} <span class="note" id="mNote"></span></span><span class="val" id="mVal"></span></label>
            <input id="mIn" class="mass" type="range" min="0.5" max="4" step="0.1">
            <button class="linkish" id="mReset" type="button" hidden>חזרה למסת הדמות</button></div>
          <div class="slider-row"><label for="bIn"><span>בלימה מהסביבה b ${infoBtn("b")}</span><span class="val" id="bVal"></span></label>
            <input id="bIn" class="damp" type="range" min="0" max="3" step="0.1"></div>
        </div>
        <div class="card formula" id="formula"></div>
      </div>`;
    const cv = $("#labCanvas"), ctx = cv.getContext("2d"), box = $("#lab");
    let W = 0, H = 0, DPR = 1;
    const resize = () => { const r = box.getBoundingClientRect(); DPR = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(box);
    const img = new Image(); let imgSp = null;
    const loadImg = () => { if (imgSp !== sp) { imgSp = sp; img.src = artOf(sp); } };
    loadImg();
    const UMAX = 0.2, WIN = 6;                          // furthest pull (m), seconds of history on the graphs
    const sim = new SP.Sim(params(), 0);
    // the graphs use the exact solution, so the energy line is truly flat without damping
    // x(t) = u0·e^(−γt)·(cos ω_d t + (γ/ω_d)·sin ω_d t), released from rest at u0
    let rel = null;
    const exact = (t) => {
      const p = sim.p, g = p.b / (2 * p.m), wd = Math.sqrt(Math.max(1e-9, p.k / p.m - g * g)), e = Math.exp(-g * t), c = Math.cos(wd * t), sn = Math.sin(wd * t);
      return { x: rel.u0 * e * (c + g / wd * sn), v: -rel.u0 * e * (p.k / p.m) / wd * sn };
    };
    const Td = () => { const p = sim.p, g = p.b / (2 * p.m); return 2 * Math.PI / Math.sqrt(Math.max(1e-9, p.k / p.m - g * g)); };
    let hist = [], tNow = 0, A0 = 0.12, dragging = null, everDragged = false, sayT = 0, raf = 0, lastT = performance.now(), fpaint = 0, trial = null, questionCooldown = 1, hint = 0;
    const kIn = $("#kIn"), mIn = $("#mIn"), bIn = $("#bIn");
    kIn.value = lab.k; mIn.value = mass(); bIn.value = lab.ob;
    function say(text, secs = 2.6) { const el = $("#say"); el.textContent = text; el.hidden = false; sayT = secs; }
    const om = () => Math.sqrt(sim.p.k / sim.p.m);
    function paintControls() {
      $("#kVal").textContent = lab.k + " N/m"; $("#bVal").textContent = fmt(lab.ob, 1) + " N·s/m";
      $("#mVal").textContent = fmt(mass(), 1) + " kg";
      const own = lab.massOverride === null;
      $("#mNote").textContent = own ? "(מסת " + nameOf(sp) + ")" : "(מסה בניסוי)";
      $("#mReset").hidden = own;
    }
    function paintFormula() {
      const p = sim.p, w = om();
      setFormula($("#formula"), `
        <div class="eq"><span>מיקום</span><span class="m">x = A·cos(ω·t)<em>A = ${fmt(A0 * 100, 1)} cm</em></span></div>
        <div class="eq"><span>מהירות</span><span class="m">v = −A·ω·sin(ω·t)<em>v_max = ${fmt(A0 * w, 2)} m/s</em></span></div>
        <div class="eq"><span>תאוצה</span><span class="m">a = −ω²·x<em>a_max = ${fmt(A0 * w * w, 2)} m/s²</em></span></div>
        <div class="eq"><span>תדירות זוויתית</span><span class="m">ω = √(k/m) = 2π/T<em>${fmt(w, 2)} rad/s</em></span></div>
        <div class="eq"><span>אנרגיה (בלי בלימה)</span><span class="m">E = ½·k·A² = ½·m·v_max²<em>${fmt(0.5 * p.k * A0 * A0, 2)} J</em></span></div>
        <p class="fine">x נמדד מנקודת שיווי המשקל. הנוסחאות עם cos מתאימות לשחרור ממנוחה בקצה, בלי בלימה.</p>`);
    }
    function reconfigure(why) { sim.reset(params(), 0); rel = null; hist = []; trial = null; if (why) say(why, 3); paintControls(); paintFormula(); }
    kIn.addEventListener("input", () => { lab.k = +kIn.value; reconfigure(); });
    bIn.addEventListener("input", () => { lab.ob = +bIn.value; reconfigure(); });
    bIn.addEventListener("change", () => say(lab.ob > 0 ? "עם בלימה המשרעת קטנה, והאנרגיה הכוללת יורדת. רואים את זה בגרף הסגול." : "בלי בלימה: האנרגיה הכוללת קבועה.", 3.4));
    mIn.addEventListener("input", () => { keeper.touched(); lab.massOverride = Math.abs(+mIn.value - m0()) < 0.05 ? null : +mIn.value; reconfigure(); });
    mIn.addEventListener("change", () => { if (lab.massOverride !== null) say(FEEL(mass() / m0()), 2.6); });
    $("#mReset").addEventListener("click", () => { lab.massOverride = null; mIn.value = m0(); reconfigure(); });
    paintControls(); paintFormula();
    const keeper = massKeeper({ say: (t, d) => say(t, d), m0, apply: (m) => { mIn.value = m; sim.reset(params(), 0); rel = null; hist = []; trial = null; paintControls(); } });
    infoLive = () => ({ k: lab.k, m: mass(), m0: m0(), name: nameOf(sp), A: A0, w: om(), x: sim.u, v: sim.st.v, E: 0.5 * sim.p.k * sim.u ** 2 + 0.5 * sim.p.m * sim.st.v ** 2 });

    // ---- layout: the track on top, four graph strips under it ----
    const L = () => {
      const trackH = Math.max(96, H * 0.24), pad = 8, gh = (H - trackH - pad * 5) / 4;
      const strips = ["x", "v", "a", "E"].map((id, i) => ({ id, y: trackH + pad + i * (gh + pad), h: gh }));
      return { trackH, strips, gx: 44, gw: W - 52, cx: W * 0.56, upx: Math.min(W * 0.32, 150) / UMAX };
    };
    function pos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener("pointerdown", (e) => {
      if (isSheetOpen()) return;
      const p = pos(e), l = L(), at = { x: e.clientX, y: e.clientY };
      if (p.y > l.trackH) { const s = l.strips.find((q) => p.y >= q.y && p.y <= q.y + q.h); if (s) openInfo({ x: "xt", v: "vt", a: "at", E: "Et" }[s.id], at); return; }
      const bx = l.cx + sim.u * l.upx;
      if (Math.abs(p.x - bx) > 60) { if (hitSpring && p.x > hitSpring.x0 - 6 && p.x < hitSpring.x1 + 6 && Math.abs(p.y - hitSpring.y) < 26) openInfo("k", at); return; }
      G.audio.unlock();
      dragging = { off: p.x - bx }; cv.setPointerCapture(e.pointerId);
      sim.hold(sim.u); trial = null; rel = null;
      if (!everDragged) { everDragged = true; if (P.achieve("first_drag")) reward("ach:first_drag", 3, { x: e.clientX, y: e.clientY }); }
    });
    cv.addEventListener("pointermove", (e) => { if (!dragging) return; const p = pos(e), l = L(); sim.hold(clamp((p.x - dragging.off - l.cx) / l.upx, -UMAX, UMAX)); });
    const letGo = () => {
      if (!dragging) return;
      dragging = null;
      const u0 = sim.u;
      if (Math.abs(u0) < 0.02) { sim.reset(sim.p, 0); return; }
      A0 = Math.abs(u0); hist = []; tNow = 0;
      sim.release(); rel = { u0, t: 0 }; trial = { seen: false }; hint = 0;
      G.sfx.boing(0.6); G.buzz(15);
      say("עכשיו תסתכלו על הגרפים, לא עליי!", 2.2);
    };
    cv.addEventListener("pointerup", letGo); cv.addEventListener("pointercancel", letGo);

    function observe() {
      if (!trial || sim.held) return;
      // point out the phase relations once each, at the moments they happen
      const x = sim.u, v = sim.st.v, w = om();
      if (hint === 0 && tNow > 0.3 && Math.abs(x) < A0 * 0.06) { hint = 1; say("עכשיו x = 0: המהירות הכי גדולה, והתאוצה אפס.", 2.8); }
      else if (hint === 1 && Math.abs(v) < A0 * w * 0.06 && Math.abs(x) > A0 * 0.5) { hint = 2; say("בקצה: v = 0, והתאוצה הכי גדולה, הפוכה ל-x.", 2.8); }
      if (trial.seen || !rel || rel.t < Td() * 2) return;
      trial.seen = true; keeper.seen();
      if (P.completeSubtopic("springs.graphs")) {
        const r = cv.getBoundingClientRect();
        setTimeout(() => celebrateUnits("springs", ["springs.graphs"], { x: r.left + W / 2, y: r.top + L().trackH }), 600);
        questionCooldown = 2; return;
      }
      if (questionCooldown > 0) questionCooldown--;
      else if (inviteQuestion(box, "springs", QUESTIONS.filter((q) => q.unit === "springs.graphs" || q.unit === "springs.shm"))) questionCooldown = 3;
    }

    const COL = { x: "#2785C7", v: "#E39B28", a: "#CC5794", Ek: "#E39B28", Ep: "#25A06F", E: "#8A60E8" };
    function draw() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); lifeStage(ctx, W, H, "osc");
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.direction = "ltr";
      const l = L(), p = sim.p, x = sim.u, w = om();
      // ---- the track ----
      const fy = l.trackH - 14, wallX = 14, bx = l.cx + x * l.upx;
      ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();
      ctx.fillStyle = "#F4F4F2"; ctx.fillRect(0, 6, wallX, fy - 6);
      ctx.beginPath(); ctx.moveTo(wallX, 6); ctx.lineTo(wallX, fy); ctx.stroke();
      ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = "rgba(138,96,232,0.7)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(l.cx, 8); ctx.lineTo(l.cx, fy); ctx.stroke(); ctx.restore();
      ctx.fillStyle = "#6E48C9"; ctx.font = "600 10px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText("x = 0", l.cx, fy + 2);
      // ±A marks
      ctx.fillStyle = "#606671"; for (const sgn of [-1, 1]) { const ax = l.cx + sgn * A0 * l.upx; ctx.fillRect(ax - 0.5, fy - 5, 1, 10); ctx.fillText(sgn < 0 ? "−A" : "+A", ax, fy + 2); }
      const h = Math.min(fy - 12, phys(sp).height_m * 140), iw = img.naturalWidth ? h * img.naturalWidth / img.naturalHeight * fatness(mass(), m0()) : h;
      const pr = probe(img), edge = pr ? pr.right(0.55) : 1;   // the spring meets the body's left edge
      const left = bx - iw / 2, sy = fy - h * 0.45;
      drawSpring(ctx, wallX, sy, left + iw * (1 - edge) + 3, sy, lab.k, false);     // the drawing is mirrored: its right edge faces the wall
      hitSpring = { x0: wallX, x1: left + iw * (1 - edge) + 3, y: sy };
      if (img.complete && img.naturalWidth) { ctx.save(); ctx.translate(bx, fy); ctx.scale(-1, 1); ctx.drawImage(img, -iw / 2, -h, iw, h); ctx.restore(); }
      // forces on the track: the spring only (weight and normal cancel)
      const F = -p.k * x - p.b * sim.st.v;
      if (Math.abs(F) > 0.1) forceArrow(ctx, bx, fy - h * 0.55, clamp(F * 2.2, -110, 110), 0, "#25A06F", "ΣF", { value: Math.abs(F), dy: -16 });
      // ---- graphs ----
      const t1 = Math.max(WIN, tNow), t0 = t1 - WIN, X = (t) => l.gx + (t - t0) / WIN * l.gw;
      const scaleOf = { x: A0 * 1.15, v: A0 * w * 1.15, a: A0 * w * w * 1.15, E: 0.5 * p.k * A0 * A0 * 1.1 };
      const unit = { x: "x (m)", v: "v (m/s)", a: "a (m/s²)", E: "E (J)" };
      for (const s of l.strips) {
        ctx.fillStyle = "#FBFBFC"; ctx.fillRect(l.gx, s.y, l.gw, s.h);
        const zeroY = s.id === "E" ? s.y + s.h - 4 : s.y + s.h / 2, k = (s.id === "E" ? s.h - 8 : s.h / 2 - 4) / scaleOf[s.id];
        ctx.strokeStyle = "#D5D8DD"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l.gx, zeroY); ctx.lineTo(l.gx + l.gw, zeroY); ctx.stroke();
        ctx.fillStyle = s.id === "E" ? COL.E : COL[s.id]; ctx.font = "700 11px " + FONT; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.save(); ctx.translate(l.gx - 30, s.y + s.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText(unit[s.id], 0, 0); ctx.restore();
        const line = (fn, color, wdt = 2.2) => {
          ctx.strokeStyle = color; ctx.lineWidth = wdt; ctx.beginPath(); let first = true;
          for (const q of hist) { if (q.t < t0) continue; const yy = zeroY - fn(q) * k; if (first) { ctx.moveTo(X(q.t), yy); first = false; } else ctx.lineTo(X(q.t), yy); }
          ctx.stroke();
          const q = hist[hist.length - 1]; if (q) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(X(q.t), zeroY - fn(q) * k, 4, 0, Math.PI * 2); ctx.fill(); }
        };
        ctx.save(); ctx.beginPath(); ctx.rect(l.gx, s.y, l.gw, s.h); ctx.clip();
        if (s.id === "x") line((q) => q.x, COL.x);
        if (s.id === "v") line((q) => q.v, COL.v);
        if (s.id === "a") line((q) => q.a, COL.a);
        if (s.id === "E") { line((q) => q.Ek, COL.Ek, 1.8); line((q) => q.Ep, COL.Ep, 1.8); line((q) => q.Ek + q.Ep, COL.E, 2.4); }
        ctx.restore();
        // the creature's face rides the x graph
        if (s.id === "x" && hist.length && img.complete && img.naturalWidth) { const q = hist[hist.length - 1], fs = Math.min(26, s.h * 0.6); ctx.drawImage(img, X(q.t) - fs / 2, zeroY - q.x * k - fs / 2, fs, fs * img.naturalHeight / img.naturalWidth); }
        if (s.id === "E") {
          ctx.font = "700 10px " + FONT; ctx.textAlign = "right"; ctx.textBaseline = "top";
          [["E_k", COL.Ek], ["E_p", COL.Ep], ["E", COL.E]].forEach(([n, c], i) => { ctx.fillStyle = c; ctx.fillText(n, l.gx + l.gw - 4 - i * 30, s.y + 3); });
        }
      }
      // shared time cursor
      if (hist.length) { const xx = X(hist[hist.length - 1].t); ctx.strokeStyle = "rgba(32,35,42,0.25)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx, l.trackH + 4); ctx.lineTo(xx, H - 4); ctx.stroke(); }
      if (!everDragged && !reduceMotion) {
        const kk = (performance.now() / 900) % 1;
        ctx.globalAlpha = Math.sin(kk * Math.PI); ctx.strokeStyle = "#258EF6"; ctx.lineWidth = 3;
        const ax = bx + 40 + kk * 24, ay = fy - h * 0.5;
        ctx.beginPath(); ctx.moveTo(ax - 22, ay); ctx.lineTo(ax, ay); ctx.moveTo(ax - 8, ay - 7); ctx.lineTo(ax, ay); ctx.lineTo(ax - 8, ay + 7); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    function paintReadouts() {
      const p = sim.p, w = om();
      $("#rT").textContent = fmt(Td()) + " s"; $("#rT").className = rel ? "" : "dim";
      $("#rW").textContent = fmt(w, 2) + " rad/s";
      $("#rA").textContent = fmt(A0 * 100, 1) + " cm";
      $("#rE").textContent = fmt(0.5 * p.k * sim.u ** 2 + 0.5 * p.m * sim.st.v ** 2, 2) + " J";
    }
    function frame(now) {
      const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (!isSheetOpen() && !sim.held && rel) {
        rel.t += dt; tNow += dt;
        const q = exact(rel.t); sim.st = { s: SP.equilibrium(sim.p) + q.x, v: q.v };
        const x = sim.u, v = sim.st.v, p = sim.p;
        hist.push({ t: tNow, x, v, a: (-p.k * x - p.b * v) / p.m, Ek: 0.5 * p.m * v * v, Ep: 0.5 * p.k * x * x });
        if (hist.length > 900) hist.splice(0, hist.length - 900);
      }
      draw();
      if ((fpaint++ & 3) === 0) paintReadouts();
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) $("#say").hidden = true; }
      observe();
      keeper.tick(!dragging && (!trial || trial.seen));
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    say(`משכו את ${nameOf(sp)} הצידה ושחררו, ותראו איך x, v ו-a זזים יחד.`, 3.6);
    cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); closeInfo(); infoLive = () => ({}); document.querySelector(".sheet-back")?.remove(); };
    bindModeSeg(args);
  };

  // ======================================================================
  //  ENERGY TRACK: "אני לא מטפס, אני מומר!" — a spring pushes the creature along a track and up a ramp.
  //  Every joule is accounted for: spring → motion → height, and friction turns some into heat.
  // ======================================================================
  SCREENS.ramp = (args = {}) => {
    let hitSpring = null;                                   // where the spring was drawn, for tapping it
    lab.mode = "ramp";
    setTitle("קפיץ־קפוץ", "מסילת אנרגיה");
    let sp = activeSpecies();
    const m0 = () => phys(sp).mass_kg, mass = () => lab.massOverride ?? m0();
    lab.rk = lab.rk || 300; lab.rsurf = lab.rsurf || "smooth_ice";
    const mu = () => (phys(sp).surfaces || {})[lab.rsurf] || { mu_s: phys(sp).mu_s, mu_k: phys(sp).mu_k };
    const rp = () => SP.rparams(mass(), lab.rk, mu().mu_s, mu().mu_k);
    const T = SP.track(), CMAX = 0.25, TOPH = T.rampLen * Math.sin(T.deg * Math.PI / 180);
    screenEl.innerHTML = `
      <div class="lab-screen">
        ${modeSeg("ramp")}
        <div class="lab" id="lab">
          <canvas id="labCanvas"></canvas>
          <div class="bubble say" id="say" hidden></div>
          <div class="lab-tools"><button class="chip" id="charChip" type="button"></button><button class="chip" id="formulaBtn" type="button">הצג נוסחה</button></div>
        </div>
        <div class="readouts">
          <button type="button" class="readout" data-info="compress"><small>דחיסה x <i class="qi">?</i></small><b id="rC">–</b></button>
          <button type="button" class="readout" data-info="E"><small>אנרגיה כוללת <i class="qi">?</i></small><b id="rE">–</b></button>
          <button type="button" class="readout" data-info="height"><small>גובה <i class="qi">?</i></small><b id="rH">–</b></button>
          <button type="button" class="readout" data-info="heat"><small>חום <i class="qi">?</i></small><b id="rQ">–</b></button>
        </div>
        <div class="card controls">
          <div><div class="meter-label"><span>המסילה ${infoBtn("surface")}</span><span class="ltr" id="muVal"></span></div>
            <div class="surfaces">${Object.entries(SPR.surfaces).map(([k, v]) => `<button type="button" data-s="${k}">${esc(v)}</button>`).join("")}</div></div>
          <div class="slider-row"><label for="kIn"><span>קשיחות הקפיץ k ${infoBtn("k")}</span><span class="val" id="kVal"></span></label>
            <input id="kIn" type="range" min="60" max="500" step="10"></div>
          <div class="slider-row"><label for="mIn"><span>מסה m ${infoBtn("m")} <span class="note" id="mNote"></span></span><span class="val" id="mVal"></span></label>
            <input id="mIn" class="mass" type="range" min="0.5" max="4" step="0.1">
            <button class="linkish" id="mReset" type="button" hidden>חזרה למסת הדמות</button></div>
        </div>
        <div class="card formula" id="formula" hidden></div>
      </div>`;
    const cv = $("#labCanvas"), ctx = cv.getContext("2d"), box = $("#lab");
    let W = 0, H = 0, DPR = 1;
    const resize = () => { const r = box.getBoundingClientRect(); DPR = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(box);
    const img = new Image(); let imgSp = null;
    const loadImg = () => { if (imgSp !== sp) { imgSp = sp; img.src = artOf(sp); } };
    loadImg();
    let p = rp(), st = { s: 0, v: 0, moving: false }, heat = 0, E0 = 0, held = false, acc = 0, maxY = 0, run = null;
    let dragging = null, everDragged = false, sayT = 0, raf = 0, lastT = performance.now(), formulaOpen = false, fpaint = 0, questionCooldown = 1;
    const kIn = $("#kIn"), mIn = $("#mIn");
    kIn.value = lab.rk; mIn.value = mass();
    function say(text, secs = 2.6) { const el = $("#say"); el.textContent = text; el.hidden = false; sayT = secs; }
    function paintControls() {
      $("#kVal").textContent = lab.rk + " N/m"; $("#mVal").textContent = fmt(mass(), 1) + " kg";
      const own = lab.massOverride === null; $("#mNote").textContent = own ? "(מסת " + nameOf(sp) + ")" : "(מסה בניסוי)"; $("#mReset").hidden = own;
      $("#muVal").textContent = `μs ${fmt(mu().mu_s, 2)} · μk ${fmt(mu().mu_k, 2)}`;
      for (const b of screenEl.querySelectorAll(".surfaces [data-s]")) b.setAttribute("aria-pressed", b.dataset.s === lab.rsurf);
      $("#charChip").innerHTML = `<img src="${artOf(sp)}" alt=""><span>${esc(nameOf(sp))} · <span class="ltr">${fmt(m0(), 1)} kg</span></span><span aria-hidden="true">⇄</span>`;
    }
    const cNow = () => Math.max(0, -st.s);
    function paintFormula() {
      if ($("#formula").hidden) return;
      const c = run ? run.c : cNow(), Ein = 0.5 * p.k * c * c, e = SP.rEnergy(st, p, T);
      setFormula($("#formula"), `
        <div class="eq"><span>האנרגיה בהתחלה</span><span class="m">E = ½·k·x²<em>${fmt(Ein, 2)} J</em></span></div>
        <div class="eq"><span>החשבון בכל רגע</span><span class="m">½·k·x² = ½·m·v² + m·g·h + Q<em>${fmt(e.k, 2)} + ${fmt(e.g, 2)} + ${fmt(heat, 2)}</em></span></div>
        <div class="eq"><span>הגובה בלי חיכוך</span><span class="m">h = k·x² / (2·m·g)<em>${fmt(Ein / (p.m * p.g) * 100, 1)} cm</em></span></div>
        <div class="eq"><span>גובה הבמה</span><span class="m">h<em>${fmt(TOPH * 100, 1)} cm</em></span></div>
        <div class="eq"><span>חום מחיכוך (על הרצפה)</span><span class="m">Q = μk·m·g·d<em>${fmt(p.muk * p.m * p.g, 2)} J/m</em></span></div>
        <p class="fine">Q היא האנרגיה שהחיכוך הופך לחום. על המדרון N = mg·cosθ, ולכן שם החום לכל מטר קטן יותר.</p>`);
    }
    function reconfigure(why) { p = rp(); st = { s: 0, v: 0, moving: false }; heat = 0; run = null; held = false; maxY = 0; if (why) say(why, 3.4); paintControls(); paintFormula(); }
    kIn.addEventListener("input", () => { lab.rk = +kIn.value; reconfigure(); });
    mIn.addEventListener("input", () => { keeper.touched(); lab.massOverride = Math.abs(+mIn.value - m0()) < 0.05 ? null : +mIn.value; reconfigure(); });
    mIn.addEventListener("change", () => { if (lab.massOverride !== null) say(FEEL(mass() / m0()), 2.6); });
    $("#mReset").addEventListener("click", () => { lab.massOverride = null; mIn.value = m0(); reconfigure(); });
    for (const b of screenEl.querySelectorAll(".surfaces [data-s]")) b.addEventListener("click", () => { lab.rsurf = b.dataset.s; G.sfx.pop(); reconfigure(`על ${SPR.surfaces[lab.rsurf]}: μk = ${fmt(mu().mu_k, 2)}. ${mu().mu_k < 0.08 ? "כמעט בלי חיכוך!" : "חלק מהאנרגיה ילך לחום."}`); });
    $("#formulaBtn").addEventListener("click", () => {
      formulaOpen = $("#formula").hidden; $("#formula").hidden = !formulaOpen;
      $("#formulaBtn").textContent = formulaOpen ? "הסתר נוסחה" : "הצג נוסחה";
      if (formulaOpen) { P.data.physics.formulaSeen = true; P.save(); paintFormula(); $("#formula").scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    });
    paintControls();
    const keeper = massKeeper({ say: (t, d) => say(t, d), m0, apply: (m) => { mIn.value = m; p = rp(); st = { s: 0, v: 0, moving: false }; heat = 0; run = null; paintControls(); } });
    infoLive = () => ({ k: lab.rk, m: mass(), m0: m0(), name: nameOf(sp), c: run ? run.c : cNow(), h: run && run.done ? maxY : undefined, mus: mu().mu_s, muk: mu().mu_k, surface: SPR.surfaces[lab.rsurf], Q: heat });
    $("#charChip").addEventListener("click", () => pickOwned(sp, "להחליף דמות בניסוי", (newSp) => { sp = newSp; lab.massOverride = null; mIn.value = m0(); loadImg(); reconfigure(`${nameOf(sp)} על אותה מסילה: μk = ${fmt(mu().mu_k, 2)}.`); }));

    // ---- view: the whole track fits the width; the creature is drawn 1.6× its size so it can be seen ----
    const VIS = 1.6, X0 = -0.36;
    const view = () => { const span = SP.trackEnd(T) - T.rampLen + T.rampLen * Math.cos(T.deg * Math.PI / 180) - X0 + 0.04, S = (W - 16) / span; return { S, ox: 8 - X0 * S, fy: H * 0.66 }; };
    const P2 = (v, s) => { const a = SP.trackAt(T, s); return { x: v.ox + a.x * v.S, y: v.fy - a.y * v.S, th: a.th }; };
    const bodyM = () => phys(sp).height_m * VIS * fatness(mass(), m0());          // body width on screen, metres along the track
    function pos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener("pointerdown", (e) => {
      if (isSheetOpen() || (run && !run.done && st.moving)) return;
      const q = pos(e), v = view(), c = P2(v, st.s + bodyM() * 0.45), at = { x: e.clientX, y: e.clientY };
      if (q.y < H * 0.3) { openInfo("energyBars", at); return; }
      if (Math.hypot(q.x - c.x, q.y - (c.y - 30)) > 70) { if (hitSpring && q.x > hitSpring.x0 - 6 && q.x < hitSpring.x1 + 10 && Math.abs(q.y - hitSpring.y) < 26) openInfo("k", at); return; }
      G.audio.unlock();
      if (st.s > 0.02) { reconfigure(); }                                       // put it back at the start
      dragging = { x0: q.x, s0: Math.min(0, st.s) }; cv.setPointerCapture(e.pointerId); held = true; run = null; heat = 0; maxY = 0;
      if (!everDragged) { everDragged = true; if (P.achieve("first_drag")) reward("ach:first_drag", 3, { x: e.clientX, y: e.clientY }); }
    });
    cv.addEventListener("pointermove", (e) => { if (!dragging) return; const q = pos(e), v = view(); st = { s: clamp(dragging.s0 + (q.x - dragging.x0) / v.S, -CMAX, 0), v: 0, moving: false }; });
    const letGo = () => {
      if (!dragging) return;
      dragging = null; held = false;
      const c = cNow();
      if (c < 0.02) { reconfigure(); return; }
      E0 = 0.5 * p.k * c * c; run = { c, t: 0, done: false, top: false }; acc = 0;
      if (p.k * c <= p.mus * p.m * p.g) { say("החיכוך הסטטי חזק מהקפיץ. לא זזתי!", 2.6); run.done = true; return; }
      G.sfx.boing(0.7); G.buzz(15); say("אני לא מטפס, אני מומר!", 1.8);
    };
    cv.addEventListener("pointerup", letGo); cv.addEventListener("pointercancel", letGo);

    function finish() {
      run.done = true; keeper.seen();
      const e = SP.rEnergy(st, p, T);
      say(run.top ? `הגעתי לבמה! מתוך ${fmt(E0, 2)} J: ${fmt(e.g, 2)} J גובה ו-${fmt(heat, 2)} J חום.` : `לא הגעתי למעלה. מתוך ${fmt(E0, 2)} J: ${fmt(heat, 2)} J הפכו לחום. ${E0 < p.m * p.g * TOPH ? `גם בלי חיכוך היה חסר: צריך לפחות ${fmt(p.m * p.g * TOPH, 2)} J.` : ""}`, 4.6);
      if (P.completeSubtopic("springs.ramp")) {
        const r = cv.getBoundingClientRect();
        setTimeout(() => celebrateUnits("springs", ["springs.ramp"], { x: r.left + W / 2, y: r.top + H * 0.5 }), 1400); questionCooldown = 2; return;
      }
      if (questionCooldown > 0) questionCooldown--;
      else if (inviteQuestion(box, "springs", QUESTIONS.filter((q) => q.unit === "springs.ramp"))) questionCooldown = 3;
    }

    function draw() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); lifeStage(ctx, W, H, "ramp");
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.direction = "ltr";
      const v = view(), S = v.S;
      // the track, tinted by its surface
      const tint = { dry_wood: "#B58A55", smooth_ice: "#7FC1DE", rubber_mat: "#4F5157" }[lab.rsurf] || "#999";
      const pts = [[X0 - 0.02, 0], [T.flat, 0]], top = SP.trackAt(T, T.flat + T.rampLen), end = SP.trackAt(T, SP.trackEnd(T));
      pts.push([top.x, top.y], [end.x, end.y]);
      ctx.fillStyle = "rgba(107,107,112,0.07)"; ctx.beginPath(); ctx.moveTo(v.ox + pts[0][0] * S, v.fy); for (const [x, y] of pts) ctx.lineTo(v.ox + x * S, v.fy - y * S); ctx.lineTo(v.ox + end.x * S, v.fy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = tint; ctx.lineWidth = 6; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, v.ox + x * S, v.fy - y * S)); ctx.stroke();
      ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 1.6; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, v.ox + x * S, v.fy - y * S)); ctx.stroke();
      // end wall and spring wall
      ctx.fillStyle = "#3a3a40"; ctx.fillRect(v.ox + end.x * S - 3, v.fy - end.y * S - 40, 5, 40);
      const wx = v.ox + X0 * S; ctx.fillStyle = "#F4F4F2"; ctx.fillRect(wx - 8, v.fy - 56, 8, 56); ctx.fillStyle = "#3a3a40"; ctx.fillRect(wx - 1, v.fy - 56, 3, 56);
      // the height of the platform, and (while aiming) how high it would go without friction
      ctx.save(); ctx.setLineDash([4, 5]); ctx.lineWidth = 1.3; ctx.strokeStyle = "rgba(39,133,199,0.6)";
      const yTop = v.fy - TOPH * S; ctx.beginPath(); ctx.moveTo(v.ox + T.flat * S, yTop); ctx.lineTo(v.ox + top.x * S, yTop); ctx.stroke();
      if (held && cNow() > 0.02) { const hh = 0.5 * p.k * cNow() ** 2 / (p.m * p.g); ctx.strokeStyle = "rgba(230,155,40,0.85)"; const yy = v.fy - Math.min(hh, 3) * S; ctx.beginPath(); ctx.moveTo(v.ox + T.flat * S, yy); ctx.lineTo(W - 8, yy); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = "#B8741A"; ctx.font = "700 11px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.fillText(`בלי חיכוך: עד ${fmt(hh * 100, 0)} ס״מ`, W - 10, Math.max(12, yy - 8)); ctx.direction = "ltr"; }
      ctx.restore();
      ctx.fillStyle = "#1A74D0"; ctx.font = "600 11px " + FONT; ctx.textAlign = "left"; ctx.fillText(`h = ${fmt(TOPH * 100, 0)} cm`, v.ox + top.x * S + 6, yTop - 8);
      // spring: from the wall to the creature while touching, otherwise to its natural end
      const sEnd = Math.min(0, st.s), sy = v.fy - 0.08 * S;
      drawSpring(ctx, wx + 2, sy, v.ox + sEnd * S, sy, lab.rk, false);
      hitSpring = { x0: wx, x1: v.ox + sEnd * S, y: sy };
      ctx.fillStyle = "#3a3a40"; ctx.fillRect(v.ox + sEnd * S - 2, sy - 12, 4, 24);
      // creature: its left side at s, standing on the track
      const bw = bodyM(), c = P2(v, st.s + bw * 0.5);
      if (img.complete && img.naturalWidth) {
        const hpx = phys(sp).height_m * VIS * S * (1 + (fatness(mass(), m0()) - 1) * 0.12), wpx = bw * S;
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(-c.th); ctx.drawImage(img, -wpx / 2, -hpx, wpx, hpx); ctx.restore();
      }
      // energy bars: where every joule is right now
      const e = SP.rEnergy(st, p, T), Etot = run ? E0 : 0.5 * p.k * cNow() ** 2, bars = [["קפיץ", e.el, "#25A06F"], ["תנועה", e.k, "#E39B28"], ["גובה", e.g, "#2785C7"], ["חום", heat, "#CC5794"]];
      const bx0 = 12, bw0 = Math.min(44, (W - 40) / 6), bh = H * 0.24, by = 14 + bh, sc = bh / Math.max(0.5, Etot, E0);
      ctx.font = "600 10px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "top";
      bars.forEach(([n, val, col], i) => {
        const x = bx0 + i * (bw0 + 8); ctx.fillStyle = "#F1F2F4"; ctx.fillRect(x, by - bh, bw0, bh);
        ctx.fillStyle = col; ctx.fillRect(x, by - val * sc, bw0, val * sc);
        ctx.direction = "rtl"; ctx.fillStyle = "#3a3a40"; ctx.fillText(n, x + bw0 / 2, by + 3); ctx.direction = "ltr";
        ctx.fillStyle = col; ctx.fillText(fmt(val, 2), x + bw0 / 2, by + 15);
      });
      const tx = bx0 + 4 * (bw0 + 8); ctx.fillStyle = "#EFE8FC"; ctx.fillRect(tx, by - bh, bw0, bh);
      let yy = by; for (const [, val, col] of bars) { ctx.fillStyle = col; ctx.fillRect(tx, yy - val * sc, bw0, val * sc); yy -= val * sc; }
      ctx.strokeStyle = "#8A60E8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx - 4, by - Etot * sc); ctx.lineTo(tx + bw0 + 4, by - Etot * sc); ctx.stroke();
      ctx.direction = "rtl"; ctx.fillStyle = "#6E48C9"; ctx.fillText("סה״כ", tx + bw0 / 2, by + 3); ctx.direction = "ltr"; ctx.fillText(fmt(Etot, 2) + " J", tx + bw0 / 2, by + 15);
      if (!everDragged && !reduceMotion) {
        const kk = (performance.now() / 900) % 1;
        ctx.globalAlpha = Math.sin(kk * Math.PI); ctx.strokeStyle = "#258EF6"; ctx.lineWidth = 3;
        const ax = c.x + 10 - kk * 26, ay = c.y - 70;
        ctx.beginPath(); ctx.moveTo(ax + 22, ay); ctx.lineTo(ax, ay); ctx.moveTo(ax + 8, ay - 7); ctx.lineTo(ax, ay); ctx.lineTo(ax + 8, ay + 7); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = "#1A74D0"; ctx.font = "600 12px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.fillText("דחפו אל הקפיץ ושחררו", c.x + 20, ay - 14); ctx.direction = "ltr";
      }
    }
    function paintReadouts() {
      const e = SP.rEnergy(st, p, T);
      $("#rC").textContent = fmt(cNow() * 100, 1) + " cm";
      $("#rE").textContent = fmt(run ? E0 : 0.5 * p.k * cNow() ** 2, 2) + " J";
      $("#rH").textContent = fmt(SP.trackAt(T, st.s).y * 100, 1) + " cm";
      $("#rQ").textContent = fmt(heat, 2) + " J"; $("#rQ").className = heat > 0.005 ? "" : "dim";
    }
    function frame(now) {
      const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (!isSheetOpen() && run && !run.done && !held) {
        acc += Math.min(dt, 0.25);
        while (acc >= SP.DT) { const r = SP.rstep(st, p, T, SP.DT); st = r.st; heat += r.heat; acc -= SP.DT; run.t += SP.DT; maxY = Math.max(maxY, SP.trackAt(T, st.s).y); if (st.s >= T.flat + T.rampLen) run.top = true; }
        if ((!st.moving && run.t > 0.3) || run.t > 14) finish();
      }
      draw();
      if ((fpaint++ & 3) === 0) { paintReadouts(); if (formulaOpen) paintFormula(); }
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) $("#say").hidden = true; }
      keeper.tick(!dragging && (!run || run.done));
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    say(`דחפו את ${nameOf(sp)} אל הקפיץ ושחררו. יגיע לבמה?`, 3.4);
    cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); closeInfo(); infoLive = () => ({}); document.querySelector(".sheet-back")?.remove(); };
    bindModeSeg(args);
  };

  // shared frame for the last scenes: canvas, image, resize, speech, cleanup
  function sceneShell(mode, html) {
    screenEl.innerHTML = `<div class="lab-screen">${modeSeg(mode)}${html}</div>`;
    const cv = $("#labCanvas"), ctx = cv.getContext("2d"), box = $("#lab"), d = { W: 0, H: 0, DPR: 1 };
    const resize = () => { const r = box.getBoundingClientRect(); d.DPR = Math.min(devicePixelRatio || 1, 2); d.W = r.width; d.H = r.height; cv.width = Math.round(d.W * d.DPR); cv.height = Math.round(d.H * d.DPR); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(box);
    let sayT = 0;
    const say = (text, secs = 2.6) => { const el = $("#say"); el.textContent = text; el.hidden = false; sayT = secs; };
    const tickSay = (dt) => { if (sayT > 0) { sayT -= dt; if (sayT <= 0) $("#say").hidden = true; } };
    const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const begin = () => { ctx.setTransform(d.DPR, 0, 0, d.DPR, 0, 0); ctx.clearRect(0, 0, d.W, d.H); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.direction = "ltr"; };
    const done = (raf, extra) => () => { cancelAnimationFrame(raf()); ro.disconnect(); closeInfo(); infoLive = () => ({}); document.querySelector(".sheet-back")?.remove(); if (extra) extra(); };
    return { cv, ctx, box, d, say, tickSay, pos, begin, done };
  }
  const readout = (info, label, id) => `<button type="button" class="readout" data-info="${info}"><small>${label} <i class="qi">?</i></small><b id="${id}">–</b></button>`;
  const firstDrag = (e, flag) => { if (!flag.v) { flag.v = true; if (P.achieve("first_drag")) reward("ach:first_drag", 3, { x: e.clientX, y: e.clientY }); } };

  // ======================================================================
  //  SPRING ON AN INCLINE: "איפה הרצפה שלי?!" — the spring holds the creature on a slope
  // ======================================================================
  SCREENS.islope = (args = {}) => {
    lab.mode = "islope";
    setTitle("קפיץ־קפוץ", "קפיץ על מישור משופע");
    let sp = activeSpecies();
    lab.ideg = lab.ideg ?? 30; lab.isurf = lab.isurf || "dry_wood";
    const m = () => phys(sp).mass_kg, mu = () => (phys(sp).surfaces || {})[lab.isurf] || { mu_s: phys(sp).mu_s, mu_k: phys(sp).mu_k };
    const ip = () => SP.iparams(m(), lab.k, mu().mu_s, mu().mu_k, lab.ideg);
    const S0 = sceneShell("islope", `
        <div class="lab" id="lab"><canvas id="labCanvas"></canvas><div class="bubble say" id="say" hidden></div></div>
        <div class="readouts">${readout("theta", "זווית θ", "rTh")}${readout("x", "מתיחה x", "rX")}${readout("F", "כוח קפיץ", "rF")}${readout("finc", "חיכוך", "rf")}</div>
        <div class="card controls">
          <div class="slider-row"><label for="thIn"><span>זווית המדרון ${infoBtn("theta")}</span><span class="val" id="thVal"></span></label><input id="thIn" type="range" min="0" max="60" step="1"></div>
          <div class="slider-row"><label for="kIn"><span>קשיחות הקפיץ k ${infoBtn("k")}</span><span class="val" id="kVal"></span></label><input id="kIn" type="range" min="30" max="400" step="5"></div>
          <div><div class="meter-label"><span>המשטח ${infoBtn("surface")}</span><span class="ltr" id="muVal"></span></div>
            <div class="surfaces">${Object.entries(SPR.surfaces).map(([k, v]) => `<button type="button" data-s="${k}">${esc(v)}</button>`).join("")}</div></div>
          <p class="fine" style="margin:4px 0 0">המסה והרגליים של ${esc(nameOf(sp))} קבועות. משנים רק את המדרון, הקפיץ והמשטח.</p>
        </div>
        <div class="card formula" id="formula"></div>`);
    const { cv, ctx, box, d, say, tickSay, pos, begin } = S0;
    const img = new Image(); img.src = artOf(sp);
    let sim = new SP.HSim(ip(), 0), dragging = null, trial = null, raf = 0, lastT = performance.now(), fpaint = 0, questionCooldown = 1;
    const drag1 = { v: false }, L0 = 0.32, UM = 0.22;
    const thIn = $("#thIn"), kIn = $("#kIn"); thIn.value = lab.ideg; kIn.value = lab.k;
    const xeq = () => SP.inclineEq(sim.p), th = () => lab.ideg * Math.PI / 180;
    const forces = () => {
      const p = sim.p, x = sim.st.x + xeq(), W = p.m * p.gTrue, par = W * Math.sin(th()), N = W * Math.cos(th()), Fs = p.k * x;
      let f = 0;                                                    // + = up the slope
      if (sim.st.moving) f = Math.sign(sim.st.v) * p.muk * N;      // v + is down the slope, friction opposes
      else if (!sim.held) f = clamp(par - Fs, -p.mus * N, p.mus * N);
      return { x, W, par, N, Fs, f };
    };
    function paint() {
      $("#thVal").textContent = lab.ideg + "°"; $("#kVal").textContent = lab.k + " N/m";
      $("#muVal").textContent = `μs ${fmt(mu().mu_s, 2)} · μk ${fmt(mu().mu_k, 2)}`;
      for (const b of screenEl.querySelectorAll(".surfaces [data-s]")) b.setAttribute("aria-pressed", b.dataset.s === lab.isurf);
      const p = sim.p;
      setFormula($("#formula"), `
        <div class="eq"><span>לאורך המדרון</span><span class="m">m·a = m·g·sinθ − k·x − f<em>${fmt(forces().par, 1)} − ${fmt(forces().Fs, 1)} − ${fmt(forces().f, 1)} N</em></span></div>
        <div class="eq"><span>שיווי משקל בלי חיכוך</span><span class="m">x = m·g·sinθ / k<em>${fmt(xeq() * 100, 1)} cm</em></span></div>
        <div class="eq"><span>נורמל</span><span class="m">N = m·g·cosθ<em>${fmt(forces().N, 1)} N</em></span></div>
        <div class="eq"><span>זמן מחזור</span><span class="m">T = 2π·√(m/k)<em>${fmt(2 * Math.PI * Math.sqrt(p.m / p.k))} s</em></span></div>
        <p class="fine">x היא ההתארכות של הקפיץ לאורך המדרון. הזווית מזיזה את נקודת שיווי המשקל, אבל לא משנה את זמן המחזור.</p>`);
    }
    function reset(why) { sim = new SP.HSim(ip(), 0); trial = null; if (why) say(why, 3.6); paint(); }
    thIn.addEventListener("input", () => { lab.ideg = +thIn.value; reset(); });
    thIn.addEventListener("change", () => say(lab.ideg === 0 ? "זה כבר לא מדרון: הקפיץ לא נמתח בכלל במנוחה." : `בזווית ${lab.ideg}° הקפיץ נמתח ${fmt(xeq() * 100, 1)} ס״מ כדי להחזיק את mg·sinθ = ${fmt(forces().par, 1)} N.`, 3.6));
    kIn.addEventListener("input", () => { lab.k = +kIn.value; reset(); });
    for (const b of screenEl.querySelectorAll(".surfaces [data-s]")) b.addEventListener("click", () => { lab.isurf = b.dataset.s; G.sfx.pop(); reset(`על ${SPR.surfaces[lab.isurf]}: μs = ${fmt(mu().mu_s, 2)}. החיכוך כאן תלוי ב-N = mg·cosθ.`); });
    paint();
    infoLive = () => { const f = forces(); return { deg: lab.ideg, name: nameOf(sp), crit: Math.atan(mu().mu_s) / Math.PI * 180, k: lab.k, m: m(), x: f.x, W: f.W, N: f.N, f: Math.abs(f.f), fk: mu().mu_k * f.N, fsMax: mu().mu_s * f.N, holds: !sim.st.moving, a: 0, s: f.x, mus: mu().mu_s, muk: mu().mu_k, surface: SPR.surfaces[lab.isurf] }; };

    // screen frame: the slope rises to the right; the spring hangs from its top end, down the slope
    const view = () => { const LS = 1.25, c = Math.cos(th()), s = Math.sin(th()), S = Math.min((d.W - 40) / Math.max(0.6, LS * c + 0.1), (d.H - 50) / (LS * s + 0.45)); const p0 = { x: 20, y: d.H - 22 }; return { S, c, s, p0, top: { x: p0.x + LS * c * S, y: p0.y - LS * s * S }, LS }; };
    // a point at distance dd down the slope from the top, raised hh above the surface
    const at = (v, dd, hh = 0) => ({ x: v.top.x - dd * v.c * v.S - hh * v.s * v.S, y: v.top.y + dd * v.s * v.S - hh * v.c * v.S });
    const bodyLen = () => phys(sp).height_m * 1.4 * (img.naturalWidth ? img.naturalWidth / img.naturalHeight : 0.9);
    cv.addEventListener("pointerdown", (e) => {
      if (isSheetOpen()) return;
      const q = pos(e), v = view(), c = at(v, L0 + forces().x + bodyLen() * 0.45, phys(sp).height_m * 0.7);
      if (Math.hypot(q.x - c.x, q.y - c.y) > 80) { const s0 = at(v, (L0 + forces().x) / 2, 0.1); if (Math.hypot(q.x - s0.x, q.y - s0.y) < 50) openInfo("k", { x: e.clientX, y: e.clientY }); return; }
      G.audio.unlock(); dragging = { q, u0: sim.st.x }; cv.setPointerCapture(e.pointerId); sim.hold(sim.st.x); trial = null; firstDrag(e, drag1);
    });
    cv.addEventListener("pointermove", (e) => { if (!dragging) return; const q = pos(e), v = view(); const along = ((q.x - dragging.q.x) * -v.c + (q.y - dragging.q.y) * v.s) / v.S; sim.hold(clamp(dragging.u0 + along, -Math.min(UM, xeq() + L0 * 0.6), UM)); });
    const letGo = () => { if (!dragging) return; dragging = null; if (Math.abs(sim.st.x) < 0.015) { reset(); return; } sim.release(); trial = { seen: false, t0: performance.now() }; G.sfx.boing(0.6); say("איפה הרצפה שלי?!", 1.6); };
    cv.addEventListener("pointerup", letGo); cv.addEventListener("pointercancel", letGo);
    function observe() {
      if (!trial || trial.seen || dragging) return;
      const T = 2 * Math.PI * Math.sqrt(sim.p.m / sim.p.k), settled = sim.turns.length >= 1 && sim.stuck;
      if (!settled && performance.now() - trial.t0 < T * 2500) return;
      trial.seen = true;
      say(settled && Math.abs(sim.st.x) > 0.003 ? `נעצרתי ${fmt(Math.abs(sim.st.x) * 100, 1)} ס״מ מנקודת שיווי המשקל: החיכוך הסטטי עוזר לקפיץ להחזיק אותי.` : `מתנודד סביב x = ${fmt(xeq() * 100, 1)} ס״מ, באותו זמן מחזור כמו בלי מדרון.`, 4);
      if (lab.ideg >= 10 && P.completeSubtopic("springs.incline")) { const r = cv.getBoundingClientRect(); setTimeout(() => celebrateUnits("springs", ["springs.incline"], { x: r.left + d.W / 2, y: r.top + d.H / 2 }), 1300); questionCooldown = 2; return; }
      if (questionCooldown > 0) questionCooldown--; else if (inviteQuestion(box, "springs", QUESTIONS.filter((q) => q.unit === "springs.incline"))) questionCooldown = 3;
    }
    function draw() {
      begin();
      const v = view(), f = forces(), S = v.S;
      const tint = { dry_wood: "#B58A55", smooth_ice: "#7FC1DE", rubber_mat: "#4F5157" }[lab.isurf];
      ctx.fillStyle = "rgba(107,107,112,0.07)"; ctx.beginPath(); ctx.moveTo(v.p0.x, v.p0.y); ctx.lineTo(v.top.x, v.top.y); ctx.lineTo(v.top.x, v.p0.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = tint; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(v.p0.x, v.p0.y); ctx.lineTo(v.top.x, v.top.y); ctx.stroke();
      ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(v.p0.x, v.p0.y); ctx.lineTo(v.top.x, v.top.y); ctx.lineTo(v.top.x, v.p0.y); ctx.lineTo(0, v.p0.y); ctx.stroke();
      if (lab.ideg > 0) { ctx.strokeStyle = "#E39B28"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(v.p0.x, v.p0.y, 36, -th(), 0); ctx.stroke(); ctx.fillStyle = "#B8741A"; ctx.font = "700 13px " + FONT; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(`θ = ${lab.ideg}°`, v.p0.x + 42, v.p0.y - 12); }
      // anchor post at the top end
      const a0 = at(v, 0, 0.11); ctx.fillStyle = "#3a3a40"; ctx.save(); ctx.translate(v.top.x, v.top.y); ctx.rotate(-th()); ctx.fillRect(-6, -0.2 * S, 6, 0.2 * S); ctx.restore();
      // equilibrium mark (frictionless) on the slope
      const qe = at(v, L0 + xeq()); ctx.fillStyle = "#6E48C9"; ctx.beginPath(); ctx.arc(qe.x, qe.y, 4, 0, Math.PI * 2); ctx.fill();
      // spring along the slope, then the creature
      const dd = L0 + f.x, sEnd = at(v, dd, 0.11);
      drawSpring(ctx, a0.x, a0.y, sEnd.x, sEnd.y, lab.k, false);
      const bl = bodyLen(), hpx = phys(sp).height_m * 1.4 * S, base = at(v, dd, 0), pr = probe(img), edge = pr ? pr.right(1 - 0.11 / (phys(sp).height_m * 1.4)) : 1;
      // in the turned frame +x points up the slope, so the picture's right edge meets the spring
      if (img.complete && img.naturalWidth) { ctx.save(); ctx.translate(base.x, base.y); ctx.rotate(-th()); ctx.drawImage(img, -bl * S * edge, -hpx, bl * S, hpx); ctx.restore(); }
      // forces from the centre: mg down, N out of the surface, spring up the slope, friction along the slope
      const c0 = at(v, dd + (edge - 0.5) * bl, phys(sp).height_m * 0.7), k = 58 / Math.max(f.W, 1), up = { x: v.c, y: -v.s }, out = { x: -v.s, y: -v.c };
      // the forces on the creature, drawn as a diagram out from the slope, clear of the drawing
      const off = hpx * 0.45 + 92, c = { x: clamp(c0.x + out.x * off, 70, d.W - 70), y: clamp(c0.y + out.y * off, 70, d.H - 70) };
      fbdAnchor(ctx, c0.x, c0.y, c.x, c.y);
      forceArrow(ctx, c.x, c.y, 0, f.W * k, "#2785C7", "mg", { value: f.W });
      if (f.N > 0.05) forceArrow(ctx, c.x, c.y, out.x * f.N * k, out.y * f.N * k, "#8969C6", "N", { value: f.N });
      if (f.Fs > 0.05) forceArrow(ctx, c.x, c.y, up.x * f.Fs * k, up.y * f.Fs * k, "#25A06F", "kx", { value: f.Fs, side: 1 });
      if (Math.abs(f.f) > 0.05) forceArrow(ctx, c.x, c.y + 2, up.x * f.f * k, up.y * f.f * k, "#CC5794", sim.st.moving ? "f_k" : "f_s", { value: Math.abs(f.f), side: -1 });
    }
    function readouts() {
      const f = forces();
      $("#rTh").textContent = lab.ideg + "°"; $("#rX").textContent = fmt(f.x * 100, 1) + " cm"; $("#rF").textContent = fmt(f.Fs, 1) + " N";
      $("#rf").textContent = Math.abs(f.f) > 0.01 ? (sim.st.moving ? "f_k " : "f_s ") + fmt(Math.abs(f.f), 1) + " N" : "0 N"; $("#rf").className = Math.abs(f.f) > 0.01 ? "" : "dim";
    }
    function frame(now) {
      const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (!isSheetOpen()) sim.advance(dt);
      draw(); if ((fpaint++ & 3) === 0) { readouts(); paint(); }
      tickSay(dt); observe();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    say(`${nameOf(sp)} קשור לקפיץ על מדרון. הזיזו את הזווית, או משכו אותו במורד ושחררו.`, 3.6);
    cleanup = S0.done(() => raf);
    bindModeSeg(args);
  };

  // ======================================================================
  //  TWO BODIES AND A SPRING: push them together, let go, momentum stays zero
  //  Body 1 is the active creature (its own mass). Body 2 is a lab cart, or another creature the player owns.
  // ======================================================================
  SCREENS.two = (args = {}) => {
    lab.mode = "two";
    setTitle("קפיץ־קפוץ", "שני גופים וקפיץ: תנע");
    const sp = activeSpecies();
    lab.tm2 = lab.tm2 || 2.8; lab.tk = lab.tk || 400;
    let other = null;                                           // species id of a second owned creature, or null = cart
    const m1 = () => phys(sp).mass_kg, m2 = () => other ? phys(other).mass_kg : lab.tm2;
    const S0 = sceneShell("two", `
        <div class="lab" id="lab"><canvas id="labCanvas"></canvas><div class="bubble say" id="say" hidden></div>
          <div class="lab-tools"><button class="chip" id="otherChip" type="button"></button></div></div>
        <div class="readouts">${readout("v", "v1", "rV1")}${readout("v", "v2", "rV2")}${readout("momentum", "p1 + p2", "rP")}${readout("E", "אנרגיה", "rE")}</div>
        <div class="card controls">
          <div class="slider-row" id="m2Row"><label for="m2In"><span>מסת העגלה m2 ${infoBtn("m")}</span><span class="val" id="m2Val"></span></label><input id="m2In" type="range" min="0.5" max="4" step="0.1"></div>
          <div class="slider-row"><label for="kIn"><span>קשיחות הקפיץ k ${infoBtn("k")}</span><span class="val" id="kVal"></span></label><input id="kIn" type="range" min="100" max="800" step="20"></div>
          <p class="fine" style="margin:4px 0 0">העגלה היא ציוד מעבדה. ${esc(nameOf(sp))} נשאר עם המסה שלו.</p>
        </div>
        <div class="card formula" id="formula"></div>`);
    const { cv, ctx, box, d, say, tickSay, pos, begin } = S0;
    const img1 = new Image(); img1.src = artOf(sp); const img2 = new Image();
    const L0 = 0.22, CM = 0.12;
    const prm = () => ({ k: lab.tk, L0, m1: m1(), m2: m2() });
    let st = null, held = false, dragging = null, run = null, raf = 0, lastT = performance.now(), fpaint = 0, questionCooldown = 1;
    const drag1 = { v: false };
    const restSt = (c = 0) => ({ x1: -0.02 - (L0 - c) / 2, x2: (L0 - c) / 2 - 0.02 + 0.04, v1: 0, v2: 0, touching: c > 0 });
    st = restSt();
    const m2In = $("#m2In"), kIn = $("#kIn"); m2In.value = lab.tm2; kIn.value = lab.tk;
    function paint() {
      $("#m2Val").textContent = fmt(m2(), 1) + " kg"; $("#kVal").textContent = lab.tk + " N/m";
      $("#m2Row").hidden = !!other;
      $("#otherChip").innerHTML = other ? `<img src="${artOf(other)}" alt=""><span>${esc(nameOf(other))} · <span class="ltr">${fmt(m2(), 1)} kg</span></span><span aria-hidden="true">⇄</span>` : `<span>עגלה · <span class="ltr">${fmt(m2(), 1)} kg</span></span><span aria-hidden="true">⇄</span>`;
      const c = run ? run.c : 0, id = SP.twoSpeeds(prm(), c || 0.1);
      setFormula($("#formula"), `
        <div class="eq"><span>שימור תנע (מתחילים במנוחה)</span><span class="m">m1·v1 + m2·v2 = 0<em>${fmt(m1() * st.v1 + m2() * st.v2, 2)} kg·m/s</em></span></div>
        <div class="eq"><span>שימור אנרגיה</span><span class="m">½·k·x² = ½·m1·v1² + ½·m2·v2²<em>${fmt(0.5 * lab.tk * c * c, 2)} J</em></span></div>
        <div class="eq"><span>יחס המהירויות</span><span class="m">v1 / v2 = −m2 / m1<em>${fmt(-m2() / m1(), 2)}</em></span></div>
        <p class="fine">בלי חיכוך ובלי כוחות חיצוניים לאורך המסילה. הקפיץ חסר מסה ולא מחובר: הוא רק דוחף כשהוא דחוס.</p>`);
    }
    const reset = (why) => { st = restSt(); run = null; held = false; if (why) say(why, 3.4); paint(); };
    m2In.addEventListener("input", () => { lab.tm2 = +m2In.value; reset(); });
    kIn.addEventListener("input", () => { lab.tk = +kIn.value; reset(); });
    $("#otherChip").addEventListener("click", () => {
      const owned = P.owned().filter((c) => c.species !== sp);
      if (!owned.length) { say("כדי ששתי דמויות ייפרדו צריך עוד דמות משלך (מהחלפה עם חבר). עד אז: עגלה.", 3.6); return; }
      const ids = [null, ...new Set(owned.map((c) => c.species))], i = ids.indexOf(other);
      other = ids[(i + 1) % ids.length]; if (other) img2.src = artOf(other); G.sfx.pop(); reset(other ? `עכשיו ${nameOf(sp)} ו-${nameOf(other)}.` : "חזרה לעגלה.");
    });
    paint();
    infoLive = () => ({ m: m1(), name: nameOf(sp), k: lab.tk, v1: st.v1, v2: st.v2, p: m1() * st.v1 + m2() * st.v2, m1: m1(), m2: m2() });
    const view = () => ({ S: (d.W - 20) / 2.6, cx: d.W / 2, fy: d.H * 0.62 });
    const bodyW1 = () => phys(sp).height_m * 1.3 * (img1.naturalWidth ? img1.naturalWidth / img1.naturalHeight : 0.9);
    cv.addEventListener("pointerdown", (e) => {
      if (isSheetOpen() || (run && !run.done)) return;
      const q = pos(e), v = view(); if (run && run.done) reset();
      const x2px = v.cx + st.x2 * v.S;
      if (Math.abs(q.x - (x2px + 30)) > 70 || Math.abs(q.y - (v.fy - 30)) > 70) { if (q.y > v.fy + 30 && q.y < v.fy + 74) openInfo("momentum", { x: e.clientX, y: e.clientY }); return; }   // the p1/p2 bars
      G.audio.unlock(); dragging = { x0: q.x }; held = true; cv.setPointerCapture(e.pointerId); firstDrag(e, drag1);
    });
    cv.addEventListener("pointermove", (e) => { if (!dragging) return; const q = pos(e), v = view(); const c = clamp((dragging.x0 - q.x) / v.S, 0, CM); st = restSt(c); });
    const letGo = () => {
      if (!dragging) return; dragging = null; held = false;
      const c = Math.max(0, L0 - (st.x2 - st.x1)); if (c < 0.01) { reset(); return; }
      run = { c, t: 0, done: false }; G.sfx.boing(0.8); G.buzz(20); say("ביי!", 1);
    };
    cv.addEventListener("pointerup", letGo); cv.addEventListener("pointercancel", letGo);
    function finish() {
      run.done = true;
      const r = m2() / m1();
      say(`${nameOf(sp)}: ${fmt(Math.abs(st.v1), 2)} m/s, ${other ? nameOf(other) : "העגלה"}: ${fmt(Math.abs(st.v2), 2)} m/s. ${r > 1.05 ? "הקל מבינינו עף מהר יותר" : r < 0.95 ? "העגלה הקלה עפה מהר יותר" : "אותה מסה, אותה מהירות"}, והתנע הכולל נשאר אפס.`, 5);
      if (P.completeSubtopic("springs.momentum")) { const b = cv.getBoundingClientRect(); setTimeout(() => celebrateUnits("springs", ["springs.momentum"], { x: b.left + d.W / 2, y: b.top + d.H / 2 }), 1400); questionCooldown = 2; return; }
      if (questionCooldown > 0) questionCooldown--; else if (inviteQuestion(box, "springs", QUESTIONS.filter((q) => q.unit === "springs.momentum"))) questionCooldown = 3;
    }
    function draw() {
      begin();
      const v = view(), S = v.S, x1 = v.cx + st.x1 * S, x2 = v.cx + st.x2 * S;
      ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, v.fy); ctx.lineTo(d.W, v.fy); ctx.stroke();
      ctx.strokeStyle = "rgba(58,58,64,0.2)"; ctx.lineWidth = 1; for (let i = 0; i < d.W; i += 12) { ctx.beginPath(); ctx.moveTo(i, v.fy + 10); ctx.lineTo(i + 8, v.fy + 2); ctx.stroke(); }
      ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = "rgba(138,96,232,0.5)"; ctx.beginPath(); ctx.moveTo(v.cx, 10); ctx.lineTo(v.cx, v.fy); ctx.stroke(); ctx.restore();
      // spring between them (it stays with whichever side it is on once they separate: here it rides on body 1)
      const sy = v.fy - 0.07 * S, gap = Math.min(L0, st.x2 - st.x1);
      drawSpring(ctx, x1, sy, x1 + gap * S, sy, lab.tk, false);
      // body 1: the creature, facing left
      const w1 = bodyW1() * S, h1 = phys(sp).height_m * 1.3 * S;
      if (img1.complete && img1.naturalWidth) { ctx.save(); ctx.translate(x1 - w1 / 2, v.fy); ctx.scale(-1, 1); ctx.drawImage(img1, -w1 / 2, -h1, w1, h1); ctx.restore(); }
      // body 2: a creature, or the lab cart (size grows with its mass)
      let w2, h2;
      if (other && img2.complete && img2.naturalWidth) { h2 = phys(other).height_m * 1.3 * S; w2 = h2 * img2.naturalWidth / img2.naturalHeight; ctx.drawImage(img2, x2, v.fy - h2, w2, h2); }
      else {
        w2 = (0.16 + 0.05 * Math.sqrt(m2())) * S; h2 = (0.08 + 0.035 * Math.sqrt(m2())) * S;
        ctx.fillStyle = "#E7E9EE"; ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x2, v.fy - h2 - 8, w2, h2, 6) : ctx.rect(x2, v.fy - h2 - 8, w2, h2); ctx.fill(); ctx.stroke();
        for (const wx of [x2 + w2 * 0.22, x2 + w2 * 0.78]) { ctx.fillStyle = "#3a3a40"; ctx.beginPath(); ctx.arc(wx, v.fy - 5, 5, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = "#3a3a40"; ctx.font = "700 11px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(fmt(m2(), 1) + " kg", x2 + w2 / 2, v.fy - h2 / 2 - 8);
      }
      // velocity arrows (orange) and momentum bars: equal and opposite
      const vk = 40;
      if (Math.abs(st.v1) > 0.02) forceArrow(ctx, x1 - w1 / 2, v.fy - h1 - 14, st.v1 * vk, 0, "#E39B28", "v1", { thin: true });
      if (Math.abs(st.v2) > 0.02) forceArrow(ctx, x2 + w2 / 2, v.fy - h2 - 22, st.v2 * vk, 0, "#E39B28", "v2", { thin: true });
      const p1 = m1() * st.v1, p2 = m2() * st.v2, pk = 26, by = v.fy + 44;
      ctx.font = "700 11px " + FONT; ctx.textBaseline = "middle"; ctx.direction = "ltr";
      ctx.fillStyle = "#2785C7"; ctx.fillRect(v.cx, by - 7, p1 * pk, 14); ctx.fillStyle = "#25A06F"; ctx.fillRect(v.cx, by + 11, p2 * pk, 14);
      ctx.fillStyle = "#3a3a40"; ctx.textAlign = p1 < 0 ? "right" : "left"; ctx.fillText(`p1 = ${fmt(p1, 2)}`, v.cx + p1 * pk + (p1 < 0 ? -6 : 6), by);
      ctx.textAlign = p2 < 0 ? "right" : "left"; ctx.fillText(`p2 = ${fmt(p2, 2)}`, v.cx + p2 * pk + (p2 < 0 ? -6 : 6), by + 18);
      ctx.textAlign = "center"; ctx.fillStyle = "#6E48C9"; ctx.fillText(`p1 + p2 = ${fmt(p1 + p2, 2)} kg·m/s`, v.cx, by + 40);
      if (!drag1.v && !reduceMotion) {
        const kk = (performance.now() / 900) % 1; ctx.globalAlpha = Math.sin(kk * Math.PI); ctx.strokeStyle = "#258EF6"; ctx.lineWidth = 3;
        const ax = x2 + w2 + 20 - kk * 24, ay = v.fy - h2 - 34; ctx.beginPath(); ctx.moveTo(ax + 22, ay); ctx.lineTo(ax, ay); ctx.moveTo(ax + 8, ay - 7); ctx.lineTo(ax, ay); ctx.lineTo(ax + 8, ay + 7); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    function readouts() {
      $("#rV1").textContent = fmt(st.v1, 2) + " m/s"; $("#rV2").textContent = fmt(st.v2, 2) + " m/s";
      $("#rP").textContent = fmt(m1() * st.v1 + m2() * st.v2, 2); $("#rE").textContent = fmt(0.5 * m1() * st.v1 ** 2 + 0.5 * m2() * st.v2 ** 2 + 0.5 * lab.tk * Math.max(0, L0 - (st.x2 - st.x1)) ** 2, 2) + " J";
    }
    function frame(now) {
      const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (!isSheetOpen() && run && !run.done) {
        st = SP.twoStep(st, prm(), dt); run.t += dt;
        const v = view(); if (run.t > 0.4 && (v.cx + st.x1 * v.S < 30 || v.cx + st.x2 * v.S > d.W - 50 || run.t > 3)) finish();
      }
      draw(); if ((fpaint++ & 3) === 0) { readouts(); paint(); }
      tickSay(dt); raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    say("דחפו את העגלה אל הקפיץ ושחררו. מי יעוף מהר יותר?", 3.4);
    cleanup = S0.done(() => raf);
    bindModeSeg(args);
  };

  // ======================================================================
  //  PULLEY: the creature hangs from a rope that runs over a pulley to a spring on the wall.
  //  The rope is massless and does not stretch, so the spring stretches exactly as far as the creature drops.
  // ======================================================================
  SCREENS.pulley = (args = {}) => {
    lab.mode = "pulley";
    setTitle("קפיץ־קפוץ", "קפיץ וגלגלת");
    const sp = activeSpecies(), m = () => phys(sp).mass_kg;
    const S0 = sceneShell("pulley", `
        <div class="lab say-low" id="lab"><canvas id="labCanvas"></canvas><div class="bubble say" id="say" hidden></div></div>
        <div class="readouts">${readout("tension", "מתיחות T", "rT2")}${readout("s", "התארכות", "rS")}${readout("m", "משקל", "rW")}${readout("T", "זמן מחזור", "rP")}</div>
        <div class="card controls"><div class="slider-row"><label for="kIn"><span>קשיחות הקפיץ k ${infoBtn("k")}</span><span class="val" id="kVal"></span></label><input id="kIn" type="range" min="30" max="400" step="5"></div></div>
        <div class="card formula" id="formula"></div>`);
    const { cv, ctx, box, d, say, tickSay, pos, begin } = S0;
    const img = new Image(); img.src = artOf(sp);
    let sim = new SP.Sim(SP.params(m(), lab.k, 0), 0), dragging = null, trial = null, raf = 0, lastT = performance.now(), fpaint = 0, questionCooldown = 1;
    const drag1 = { v: false }, kIn = $("#kIn"); kIn.value = lab.k;
    const paint = () => {
      $("#kVal").textContent = lab.k + " N/m";
      const s = sim.st.s;
      setFormula($("#formula"), `
        <div class="eq"><span>המתיחות בחוט = כוח הקפיץ</span><span class="m">T = k·x<em>${fmt(lab.k * s, 1)} N</em></span></div>
        <div class="eq"><span>על הדמות</span><span class="m">m·a = m·g − T<em>${fmt(m() * 9.81 - lab.k * s, 1)} N</em></span></div>
        <div class="eq"><span>שיווי משקל</span><span class="m">k·x = m·g<em>${fmt(m() * 9.81 / lab.k * 100, 1)} cm</em></span></div>
        <div class="eq"><span>זמן מחזור</span><span class="m">T = 2π·√(m/k)<em>${fmt(SP.period(sim.p))} s</em></span></div>
        <p class="fine">חוט יכול רק למשוך, לא לדחוף, ולכן אפשר למשוך את הדמות למטה רק עד s_eq: אחרת החוט היה מתרופף בדרך למעלה. גלגלת אידיאלית (בלי מסה ובלי חיכוך) רק משנה את כיוון החוט. המתיחות זהה בכל החוט, ולכן הקפיץ מרגיש בדיוק את מה שהדמות מרגישה.</p>`);
    };
    kIn.addEventListener("input", () => { lab.k = +kIn.value; sim.reset(SP.params(m(), lab.k, 0), 0); trial = null; paint(); });
    paint();
    infoLive = () => ({ k: lab.k, m: m(), name: nameOf(sp), s: sim.st.s, eq: SP.equilibrium(sim.p), T: lab.k * sim.st.s });
    const G0 = () => { const S = Math.min(300, (d.H - 90) / (SP.equilibrium(sim.p) * 2 + 0.22 + phys(sp).height_m * 1.1)); return { S, px: d.W * 0.68, py: 60, r: 16, wallX: 14, ry: 30 }; };
    const hookY = (g, s) => g.py + (0.22 + s) * g.S;
    cv.addEventListener("pointerdown", (e) => {
      if (isSheetOpen()) return;
      const q = pos(e), g = G0(), y = hookY(g, sim.st.s);
      if (Math.abs(q.x - (g.px + g.r)) > 70 || q.y < y - 20) {
        // info only on the thing itself: the wheel, the rope (down to the creature, or across to the spring), the spring
        const rx = g.px + g.r, sxEnd = Math.min(g.wallX + 6 + (0.32 + sim.st.s) * g.S * 0.9, g.px - 30), at = { x: e.clientX, y: e.clientY };
        if (Math.hypot(q.x - g.px, q.y - g.py) < g.r + 12) openInfo("pulley", at);
        else if ((Math.abs(q.x - rx) < 16 && q.y > g.py && q.y < y - 4) || (Math.abs(q.y - (g.py - g.r)) < 14 && q.x > sxEnd && q.x < g.px)) openInfo("tension", at);
        else if (Math.abs(q.y - (g.py - g.r)) < 24 && q.x > g.wallX && q.x <= sxEnd) openInfo("k", at);
        return;
      }
      G.audio.unlock(); dragging = { dy: q.y - y }; cv.setPointerCapture(e.pointerId); sim.hold(sim.u); trial = null; firstDrag(e, drag1);
    });
    cv.addEventListener("pointermove", (e) => { if (!dragging) return; const q = pos(e), g = G0(); sim.hold(clamp((q.y - dragging.dy - hookY(g, SP.equilibrium(sim.p))) / g.S, 0, Math.min(0.2, SP.equilibrium(sim.p) * 0.95))); });   // beyond s_eq the rope would go slack on the way up
    const letGo = () => { if (!dragging) return; dragging = null; if (sim.u < 0.02) { sim.reset(sim.p, 0); return; } sim.release(); trial = { seen: false }; G.sfx.boing(0.6); say("מי משך לי בכיוון הזה?!", 1.8); };
    cv.addEventListener("pointerup", letGo); cv.addEventListener("pointercancel", letGo);
    function observe() {
      if (!trial || trial.seen || sim.held || sim.periods() < 2) return;
      trial.seen = true;
      say(`הקפיץ שוכב על הצד, אבל זמן המחזור אותו דבר: ${fmt(SP.period(sim.p))} שנ׳. הגלגלת רק מסובבת את הכוח.`, 4);
      if (P.completeSubtopic("springs.pulley")) { const b = cv.getBoundingClientRect(); setTimeout(() => celebrateUnits("springs", ["springs.pulley"], { x: b.left + d.W / 2, y: b.top + d.H / 2 }), 1300); questionCooldown = 2; return; }
      if (questionCooldown > 0) questionCooldown--; else if (inviteQuestion(box, "springs", QUESTIONS.filter((q) => q.unit === "springs.pulley"))) questionCooldown = 3;
    }
    function draw() {
      begin();
      const g = G0(), s = sim.st.s, Tn = lab.k * s, y = hookY(g, s), x = g.px + g.r;
      // wall, spring along the top, rope over the pulley, down to the creature
      ctx.fillStyle = "#F4F4F2"; ctx.fillRect(0, 0, g.wallX, d.H); ctx.fillStyle = "#3a3a40"; ctx.fillRect(g.wallX - 2, 0, 3, d.H);
      const sx = g.wallX + 6 + (0.32 + s) * g.S * 0.9;
      drawSpring(ctx, g.wallX + 2, g.py - g.r, Math.min(sx, g.px - 30), g.py - g.r, lab.k, true);
      ctx.strokeStyle = "#7A5A2E"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(Math.min(sx, g.px - 30), g.py - g.r); ctx.lineTo(g.px, g.py - g.r); ctx.arc(g.px, g.py, g.r, -Math.PI / 2, 0); ctx.lineTo(x, y - 6); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(g.px, g.py, g.r - 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#3a3a40"; ctx.beginPath(); ctx.arc(g.px, g.py, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(g.px, g.py); ctx.lineTo(g.px + 26, 0); ctx.stroke();
      // the creature on the rope
      const pr = probe(img) || { top: 0 }, h = phys(sp).height_m * g.S, w = img.naturalWidth ? h * img.naturalWidth / img.naturalHeight : h;
      if (img.complete && img.naturalWidth) ctx.drawImage(img, x - w / 2, y - pr.top * h, w, h);
      ctx.fillStyle = "#F49A35"; ctx.beginPath(); ctx.ellipse(x, y + 1, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      // forces: on the creature mg and T; at the spring the same T, pointing along the rope
      const W = m() * 9.81, k = 70 / Math.max(W, Tn * 0.6, 1), cy = y + h * 0.5, ax = Math.min(x + w / 2 + 20, d.W - 70);
      forceArrow(ctx, ax, cy, 0, W * k, "#2785C7", "mg", { value: W });
      if (Tn > 0.05) { forceArrow(ctx, ax, cy, 0, -Tn * k, "#A0662A", "T", { value: Tn }); forceArrow(ctx, Math.min(sx, g.px - 30) + 4, g.py - g.r + 30, Tn * k * 0.8, 0, "#A0662A", "T", { value: Tn, dy: 4 }); }
    }
    function readouts() {
      $("#rT2").textContent = fmt(lab.k * sim.st.s, 1) + " N"; $("#rS").textContent = fmt(sim.st.s * 100, 1) + " cm";
      $("#rW").textContent = fmt(m() * 9.81, 1) + " N"; const Tm = sim.measuredPeriod(); $("#rP").textContent = fmt(Tm && !sim.held ? Tm : SP.period(sim.p)) + " s";
    }
    function frame(now) {
      const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (!isSheetOpen()) sim.advance(dt);
      draw(); if ((fpaint++ & 3) === 0) { readouts(); paint(); }
      tickSay(dt); observe(); raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    say(`${nameOf(sp)} תלוי על חוט שעובר מעל גלגלת לקפיץ שבקיר. משכו אותו למטה ושחררו.`, 3.6);
    cleanup = S0.done(() => raf);
    bindModeSeg(args);
  };

  // ======================================================================
  //  "העוגייה בורחת!" — kinematics on a skateboard, 8 levels
  //  Physics in Kin (fixed step, exact stops); this is drawing, camera and the lessons around it.
  //  The creature's mass and shoe friction come from its own profile; nothing here edits a body.
  // ======================================================================
  const KD = KIN_DATA, KF = (id) => KD.formulas.find((f) => f.id === id);
  const kinSound = (name) => { if (P.data.settings.sound_on === false) return; try { const a = new Audio(`sound/cookie/${name}.wav`); a.volume = 0.6; a.play().catch(() => {}); } catch (e) {} };
  // read a formula card aloud only when the player asks (off by default)
  function speakHe(text) {
    try { if (window.EggNative && EggNative.speak) { EggNative.speak(text, 1, 1); return true; } } catch (e) {}
    try { if (window.speechSynthesis) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "he-IL"; speechSynthesis.speak(u); return true; } } catch (e) {}
    return false;
  }
  function formulaSheet(level) {
    const ids = KD.levelFormulas[level] || [], all = KD.formulas.filter((f) => !ids.includes(f.id));
    const card = (f) => `<div class="kcard"><div class="khead"><b>${esc(f.t)}</b><button class="kspeak" type="button" data-say="${esc(f.id)}" aria-label="הקראה">🔊</button></div>
      <div class="m kf">${esc(f.f)}</div><p><b>סמלים:</b> ${esc(f.sym)}</p><p><b>יחידה:</b> <span class="ltr">${esc(f.u)}</span></p><p class="pit"><b>זהירות:</b> ${esc(f.pit)}</p><p class="ex"><b>דוגמה:</b> ${esc(f.ex)}</p></div>`;
    const el = sheet(`<h3>נוסחאות לשלב הזה</h3><p class="fine">לחצו על כל אות בנוסחה. 🔊 מקריא בעברית (רק כשלוחצים).</p>
      ${ids.map((id) => card(KF(id))).join("")}
      <details><summary class="linkish">כל 16 הנוסחאות של הנושא</summary>${all.map(card).join("")}</details>
      <div class="actions"><button class="btn primary" type="button" data-close>חזרה למסילה</button></div>`);
    el.querySelectorAll(".kf").forEach(symbolize);
    EX.decorate(el);
    for (const b of el.querySelectorAll("[data-say]")) b.addEventListener("click", () => { const f = KF(b.dataset.say); if (!speakHe(`${f.t}. ${f.sym}. ${f.ex}`)) b.textContent = "—"; });
    return el;
  }

  SCREENS.cookie = (args = {}) => {
    const MP = (P.data.physics.motion = P.data.physics.motion || { level: 1, quiz: 0 });
    let level = clamp(args.level || MP.level || 1, 1, 8);
    let sp = activeSpecies();
    const prof = () => phys(sp);
    lab.kExtra = lab.kExtra || 0;
    const muFoot = () => ((prof().surfaces || {}).dry_wood || { mu_k: prof().mu_k }).mu_k;
    const body = () => Kin.body(prof().mass_kg, { extra: level === 4 ? lab.kExtra : 0, muk: muFoot() });
    const U = (n) => KD.units[n - 1];
    setTitle("העוגייה בורחת!", "קינמטיקה על סקייטבורד");
    screenEl.innerHTML = `
      <div class="lab-screen kin">
        <div class="stagebar kbar" id="kbar">${KD.units.map((u) => `<button type="button" data-l="${u.level}" aria-label="שלב ${u.level}: ${esc(u.he)}">${u.level}</button>`).join("")}</div>
        <div class="card task" id="ktask"></div>
        <div class="lab" id="lab"><canvas id="labCanvas"></canvas><div class="bubble say" id="say" hidden></div>
          <div class="lab-tools"><button class="chip" id="charChip" type="button"></button><button class="chip" id="formBtn" type="button">נוסחאות</button></div></div>
        <div class="kgraph" id="kgraph" hidden><div class="seg ktabs"><button type="button" data-g="x">x–t</button><button type="button" data-g="v">v–t</button><button type="button" data-g="a">a–t</button></div><canvas id="kgCanvas"></canvas></div>
        <div class="kin-controls" id="kctl"></div>
        <div class="readouts">${readout("kin_x", "מיקום x", "rX")}${readout("kin_v", "מהירות v", "rV")}${readout("kin_a", "תאוצה a", "rA")}${readout("kin_d", "דרך", "rD")}</div>
      </div>`;
    const cv = $("#labCanvas"), ctx = cv.getContext("2d"), box = $("#lab");
    let W = 0, H = 0, DPR = 1;
    const resize = () => { const r = box.getBoundingClientRect(); DPR = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); gResize(); };
    const gcv = $("#kgCanvas"), gctx = gcv.getContext("2d"); let GW = 0, GH = 0;
    function gResize() { const r = gcv.getBoundingClientRect(); GW = r.width; GH = r.height; gcv.width = Math.round(GW * DPR); gcv.height = Math.round(GH * DPR); }
    const ro = new ResizeObserver(resize); ro.observe(box); ro.observe(gcv);
    const img = new Image(); let imgSp = null; const loadImg = () => { if (imgSp !== sp) { imgSp = sp; img.src = artOf(sp); } }; loadImg();
    const art = (n) => { const i = new Image(); i.src = `art/cookie/k1_${n}.webp`; return i; };
    const IM = { board: art("skateboard"), roll: art("cookie_roll"), lines: art("speed_lines"), sign: art("road_sign") };
    let sayT = 0; const say = (t, s = 2.8) => { const el = $("#say"); el.textContent = t; el.hidden = false; sayT = s; };

    // ---------------- state ----------------
    let st, ctl, hist, drops, cookie, camX, zoom, introT, acc, raf = 0, lastT = performance.now(), fpaint = 0, running, flags, l1, l4rows = MP.l4rows || [], phase, gTab = "v", finished, holdPush = 0;
    const WALL = 14, END = 60, CATCH = 0.25;
    function resetRun(o = {}) {
      st = Kin.start(o.x0 ?? 0, o.v0 ?? 0); ctl = { push: false, pad: false, foot: false, given: null };
      hist = [{ t: 0, x: st.x, v: st.v, a: 0 }]; drops = Kin.dropsBetween(st, st); acc = 0; running = true; finished = false; holdPush = 0;
      phase = { push: 0, coast: 0, brake: 0 };
      cookie = level === 6 ? { x0: 4, v: 1.2, caught: false } : { x0: 2.3, v: 0, caught: false, decor: true };
    }
    function enterLevel(n, intro = true) {
      level = n; MP.level = n; P.save();
      camX = 3; zoom = intro && !reduceMotion ? 1.5 : 1; introT = intro && !reduceMotion ? 0 : 3;
      l1 = { phase: "idle", t: 0 }; flags = { s: { x: 6.9, set: false }, e: { x: 6.3, set: false }, revealed: false };      // waiting at the right edge, to be dragged
      resetRun(level === 5 ? { v0: 0 } : {});
      paintBar(); paintTask(); paintControls();
      $("#kgraph").hidden = level !== 7 && !MP.graphs;
      if (intro) say(level === 6 ? KD.say.launch : n === 1 ? "רגע, איפה אני בכלל? בואו נמדוד." : "מי הזיז את העוגייה?!", 2.4);
      requestAnimationFrame(resize);
    }
    // ---------------- top: level bar and the task line ----------------
    function paintBar() {
      for (const b of screenEl.querySelectorAll("#kbar [data-l]")) {
        const n = +b.dataset.l; b.classList.toggle("done", done().includes(U(n).id));
        b.toggleAttribute("aria-current", n === level); b.disabled = false;
      }
    }
    const TASK = {
      1: "לחצו 'סע!'. אחר כך גררו את הדגל הירוק לאיפה שהתחיל ואת האדום לאיפה שנגמר.",
      2: "החזיקו 'דחוף' רגע ושחררו. מה קורה כשאף אחד לא דוחף? (מסילה בלי חיכוך)",
      3: "החזיקו 'דחוף' לפחות שנייה וחצי. תסתכלו על הנקודות שנשארות מאחור.",
      4: "'דחיפה של שנייה' באותו כוח (8 N). אחר כך הוסיפו תיק משקולות או החליפו לדמות אחרת שלכם, ונסו שוב.",
      5: "בחרו מהירות התחלתית ובלמו לפני הקיר. רפידה = כוח קבוע. רגל = חיכוך הנעל של הדמות עם המסילה.",
      6: "העוגייה בורחת ב-1.2 m/s ויש לה ראש של 4 m. דחפו ותפסו אותה!",
      7: "נסיעה מלאה: דחפו, שחררו, ובלמו. לחצו על הגרף כדי לשמוע מה השיפוע והשטח אומרים.",
      8: "שאלות בסגנון בגרות, עם פתרון אחרי שעונים. שלוש תשובות נכונות ונגמר השלב."
    };
    function paintTask() { $("#ktask").innerHTML = `<div><small>שלב ${level}: ${esc(U(level).he)} · ${esc(U(level).concept)}</small><p>${esc(TASK[level])}</p></div>`; }
    // ---------------- controls under the canvas ----------------
    const hold = (el, on, off) => {
      const down = (e) => { e.preventDefault(); G.audio.unlock(); el.setPointerCapture?.(e.pointerId); el.classList.add("on"); on(); };
      const up = () => { el.classList.remove("on"); off(); };
      el.addEventListener("pointerdown", down); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("lostpointercapture", up);
      el.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!el.classList.contains("on")) { el.classList.add("on"); on(); } } });
      el.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") up(); });
    };
    function paintControls() {
      const c = $("#kctl");
      $("#charChip").innerHTML = `<img src="${artOf(sp)}" alt=""><span>${esc(nameOf(sp))} · <span class="ltr">${fmt(prof().mass_kg, 1)} kg</span></span><span aria-hidden="true">⇄</span>`;
      if (level === 1) { c.innerHTML = `<button class="btn primary kbig" id="kGo" type="button">סע!</button><button class="btn quiet" id="kRe" type="button">מההתחלה</button>`; $("#kGo").addEventListener("click", () => { flags.revealed = false; flags.s.set = flags.e.set = false; flags.s.x = 6.9; flags.e.x = 6.3; resetRun({ x0: 1 }); l1 = { phase: "go", t: 0 }; kinSound("button_push"); say("קדימה!", 1); }); $("#kRe").addEventListener("click", () => enterLevel(1, false)); return; }
      if (level === 8) { c.innerHTML = `<button class="btn primary kbig" id="kQ" type="button">שאלה</button><span class="kquiz" id="kQn"></span>`; $("#kQ").addEventListener("click", ask8); paintQuiz(); return; }
      const brakeKind = level === 5 ? `<div class="seg kbrake"><button type="button" data-b="pad" aria-pressed="${!lab.kFoot}">רפידה</button><button type="button" data-b="foot" aria-pressed="${!!lab.kFoot}">רגל</button></div>` : "";
      const extra4 = level === 4 ? `<button class="btn secondary" id="k1s" type="button">דחיפה של שנייה</button><button class="btn quiet" id="kBag" type="button" aria-pressed="${lab.kExtra > 0}">${lab.kExtra > 0 ? "להוריד את התיק (1 kg)" : "+ תיק משקולות 1 kg"}</button>` : "";
      const start5 = level === 5 ? `<div class="kv0"><button class="btn quiet" data-v0="3" type="button">יציאה ב-3 m/s</button><button class="btn quiet" data-v0="6" type="button">יציאה ב-6 m/s</button></div>` : "";
      c.innerHTML = `${start5}${brakeKind}<div class="kpads">
        ${level === 5 ? "" : `<button class="btn kpush" id="kPush" type="button">דחוף</button>`}
        ${level >= 5 || level === 7 ? `<button class="btn kbrk" id="kBrk" type="button">בלום</button>` : ""}
        <button class="btn quiet kre" id="kRe" type="button" aria-label="מההתחלה">⟲</button></div>${extra4}
        ${level === 7 ? "" : `<button class="linkish" id="kG" type="button">${MP.graphs ? "להסתיר גרף" : "להראות גרף"}</button>`}`;
      const P1 = $("#kPush"), B1 = $("#kBrk");
      if (P1) hold(P1, () => { if (!running || finished) resetRun(); ctl.push = true; kinSound("button_push"); if (st.v < 0.05) say(KD.say.push, 1.8); }, () => { if (ctl.push) { ctl.push = false; if (st.v > 0.3 && level <= 3) say(KD.say.release, 2.6); } });
      if (B1) hold(B1, () => { ctl.pad = !lab.kFoot; ctl.foot = !!lab.kFoot; if (st.v > 0.3) { kinSound("brake_soft"); say(KD.say.brake, 1.6); } }, () => { ctl.pad = ctl.foot = false; });
      $("#kRe").addEventListener("click", () => { resetRun(level === 5 ? { v0: 0 } : {}); G.sfx.pop(); });
      $("#kG")?.addEventListener("click", () => { MP.graphs = $("#kgraph").hidden; P.save(); $("#kgraph").hidden = !MP.graphs && level !== 7; paintControls(); requestAnimationFrame(resize); });
      for (const b of c.querySelectorAll("[data-b]")) b.addEventListener("click", () => { lab.kFoot = b.dataset.b === "foot"; paintControls(); say(lab.kFoot ? `בלימת רגל: μk = ${fmt(muFoot(), 2)} של הנעל של ${nameOf(sp)} עם המסילה. a = μk·(½mg)/m_total ≈ ${fmt(muFoot() * Kin.Q_FOOT * prof().mass_kg * 9.81 / Kin.mTotal(body()), 2)} m/s².` : `רפידה: כוח קבוע 6 N. a = 6/${fmt(Kin.mTotal(body()), 1)} ≈ ${fmt(6 / Kin.mTotal(body()), 2)} m/s².`, 4); });
      for (const b of c.querySelectorAll("[data-v0]")) b.addEventListener("click", () => { resetRun({ x0: 0, v0: +b.dataset.v0 }); G.sfx.whoosh(); say(`יוצא ב-${b.dataset.v0} m/s! הקיר ב-${WALL} m.`, 2); });
      if (level === 4) {
        $("#k1s").addEventListener("click", () => { resetRun(); ctl.push = true; holdPush = 1; kinSound("button_push"); });
        $("#kBag").addEventListener("click", () => { lab.kExtra = lab.kExtra > 0 ? 0 : 1; resetRun(); paintControls(); say(lab.kExtra ? "תיק של 1 kg על הסקייטבורד. זה ציוד, לא אני!" : "בלי התיק.", 2.4); });
      }
    }
    $("#charChip").addEventListener("click", () => pickOwned(sp, "לנסות עם דמות אחרת שלך", (n) => { sp = n; loadImg(); resetRun(); paintControls(); say(KD.say.friend_swap, 3); }));
    $("#formBtn").addEventListener("click", () => formulaSheet(level));
    for (const b of screenEl.querySelectorAll("#kbar [data-l]")) b.addEventListener("click", () => { G.sfx.pop(); enterLevel(+b.dataset.l); });
    for (const b of screenEl.querySelectorAll(".ktabs [data-g]")) b.addEventListener("click", () => { gTab = b.dataset.g; paintTabs(); });
    const paintTabs = () => { for (const b of screenEl.querySelectorAll(".ktabs [data-g]")) b.setAttribute("aria-pressed", b.dataset.g === gTab); };
    paintTabs();

    // ---------------- finishing a level (once; the profile keeps it idempotent) ----------------
    function complete(n, from) {
      const id = U(n).id;
      if (!P.completeSubtopic(id)) return false;
      const r = cv.getBoundingClientRect();
      setTimeout(() => celebrateUnits("motion", [id], from || { x: r.left + W / 2, y: r.top + H * 0.4 }), 900);
      setTimeout(paintBar, 1200); return true;
    }
    function quizPool(n) { return KD.questions.filter((q) => n === 8 ? true : q.level === n); }
    function maybeAsk() { if (!inviteQuestion(box, "motion", quizPool(level))) return; }
    function paintQuiz() { const el = $("#kQn"); if (el) el.textContent = `${Math.min(3, MP.quiz || 0)}/3 נכונות`; }
    function ask8() { askQuestion(quizPool(8).filter((q) => q.level >= 5 || Math.random() < 0.4), (q, okk) => { if (okk) { MP.quiz = (MP.quiz || 0) + 1; P.save(); paintQuiz(); if (MP.quiz >= 3) complete(8); } else say(KD.say.wrong, 2.6); }); }

    // ---------------- the lessons, checked every frame ----------------
    function lessons(dt) {
      const p = st;
      if (level === 2) { if (!ctl.push && !ctl.pad && p.v > 0.5) { phase.coast += dt; if (phase.coast > 1.5 && !phase.said) { phase.said = true; say("הנקודות במרחקים שווים: אותה מהירות כל הזמן.", 3); if (!complete(2)) maybeAsk(); } } else phase.coast = 0; }
      if (level === 3) { if (ctl.push) { phase.push += dt; if (phase.push > 0.7 && !phase.mid) { phase.mid = true; say(KD.say.accelerating, 2.6); } if (phase.push >= 1.5 && !phase.said) { phase.said = true; if (!complete(3)) maybeAsk(); } } else phase.push = 0; }
      if (level === 7) { if (ctl.push) phase.push += dt; else if (ctl.pad || ctl.foot) { if (p.v > 0.05) phase.brake += dt; } else if (p.v > 0.3) phase.coast += dt;
        if (phase.push > 0.5 && phase.coast > 0.5 && phase.brake > 0.3 && p.v === 0 && !phase.said) { phase.said = true; say("שלושה חלקים בגרף: עולה, שטוח, יורד. השטח מתחת ל-v–t הוא כל הדרך שעברתי.", 4); if (!complete(7)) maybeAsk(); } }
    }
    function step(dt) {
      if (!running) return;
      // level 1: a scripted walk with given velocities (pure kinematics, model D)
      if (level === 1 && l1.phase !== "idle") {
        l1.t += dt; const seg = l1.t < 2 ? 2.5 : l1.t < 2.4 ? 0 : l1.t < 3.9 ? -2 : null;
        if (seg === null) { if (l1.phase === "go") { l1.phase = "done"; say("עכשיו סמנו: גררו את הדגל הירוק להתחלה ואת האדום לסוף.", 3.6); } return; }
        const n = { x: st.x + seg * dt, v: seg, t: st.t + dt, a: 0, dist: st.dist + Math.abs(seg * dt) };
        drops.push(...Kin.dropsBetween(st, n)); st = n; hist.push({ t: st.t, x: st.x, v: st.v, a: 0 }); return;
      }
      if (level === 1) return;
      acc += Math.min(dt, 0.25);
      while (acc >= Kin.DT) {
        if (holdPush > 0) { holdPush -= Kin.DT; if (holdPush <= 0) { ctl.push = false; l4done(); } }
        const prev = st; st = Kin.step(st, body(), ctl); acc -= Kin.DT;
        drops.push(...Kin.dropsBetween(prev, st).filter((d) => !drops.length || d.t > drops[drops.length - 1].t + 1e-6));
        if (level === 6 && !cookie.caught) {
          const tc = Kin.catchTime(prev, st, cookie, CATCH);
          if (tc !== null) { cookie.caught = true; finished = true; ctl.push = false; st = { ...st, v: 0, a: 0 }; kinSound("cookie_caught"); G.buzz(40); say(KD.say.cookie_caught, 3); const r = cv.getBoundingClientRect(); if (!complete(6, { x: r.left + W * 0.5, y: r.top + H * 0.5 })) maybeAsk(); break; }
          if (Kin.cookieAt(cookie, st.t) > END - 2) { finished = true; running = false; say(`העוגייה הגיעה לסוף המסילה. הפער נסגר רק אם v שלי גדולה מ-1.2 m/s. נסו לדחוף יותר זמן!`, 4); break; }
        }
        if (level === 5 && st.x >= WALL - 0.45) { st = { ...st, x: WALL - 0.45, v: 0, a: 0 }; running = false; finished = true; kinSound("brake_soft"); say("פוף! כרית. במהירות כפולה מרחק העצירה פי 4. נסו לבלום מוקדם יותר.", 3.6); break; }
        if (level === 5 && hist.length > 10 && st.v === 0 && prev.v > 0) { const left = WALL - st.x; say(`עצרתי ${fmt(left, 1)} m לפני הקיר!`, 2.4); if (!complete(5)) maybeAsk(); }
        if (st.x > END - 1) { st = { ...st, x: END - 1, v: 0 }; running = false; finished = true; say("סוף המסילה. כרית רכה. ⟲ כדי להתחיל שוב.", 2.4); }
      }
      if (!hist.length || st.t - hist[hist.length - 1].t >= 1 / 30) { hist.push({ t: st.t, x: st.x, v: st.v, a: st.a, push: ctl.push, brake: ctl.pad || ctl.foot }); if (hist.length > 1800) hist.shift(); }
      lessons(dt);
    }
    function l4done() {
      const m = Kin.mTotal(body()), a = st.v / 1;
      const row = { name: nameOf(sp) + (lab.kExtra ? " + תיק" : ""), m, a };
      l4rows = l4rows.filter((r) => Math.abs(r.m - m) > 0.01).concat([row]).slice(-4); MP.l4rows = l4rows; P.save();
      say(`F = 8 N, m = ${fmt(m, 1)} kg → a = ${fmt(a, 2)} m/s².${l4rows.length > 1 ? " מסה גדולה יותר, תאוצה קטנה יותר." : " עכשיו נסו עם מסה אחרת."}`, 3.6);
      if (l4rows.length > 1) { if (!complete(4)) maybeAsk(); }
    }

    // ---------------- drawing ----------------
    const S0 = () => (W / 8) * zoom;                    // 8 m across at zoom 1
    const VIS = 2.4;                                     // the creature is drawn 2.4× its size, so a 30 cm body can be seen on an 8 m track
    const gy = () => H * 0.66;
    const SX = (x) => W * 0.42 + (x - camX) * S0();
    function draw(now) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.direction = "ltr";
      const S = S0(), y0 = gy();
      // far pencil layer (parallax 0.1)
      ctx.strokeStyle = "rgba(58,58,64,0.08)"; ctx.lineWidth = 1;
      for (let i = -2; i < 12; i++) { const px = ((i * 120 - camX * S * 0.1) % (W + 240)) - 120; ctx.beginPath(); ctx.moveTo(px, y0 - 80); ctx.lineTo(px + 40, y0 - 120); ctx.lineTo(px + 80, y0 - 80); ctx.stroke(); }
      // track and metre marks
      ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
      ctx.font = "600 11px " + FONT; ctx.fillStyle = "#606671"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      const x0 = Math.floor(camX - W / S), x1 = Math.ceil(camX + W / S);
      for (let m = x0; m <= x1; m++) { const px = SX(m); ctx.strokeStyle = "#8A8E96"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y0 + (m % 5 ? 6 : 12)); ctx.stroke(); if (m % (S < 40 ? 5 : 1) === 0) ctx.fillText(m + " m", px, y0 + 14); }
      // origin marker
      ctx.fillStyle = "#6E48C9"; ctx.fillRect(SX(0) - 1, y0 - 24, 2, 24); ctx.fillText("x = 0", SX(0), y0 - 38);
      if (level === 5) { const wx = SX(WALL); ctx.fillStyle = "#F4F4F2"; ctx.fillRect(wx, y0 - 120, 30, 120); ctx.fillStyle = "#3a3a40"; ctx.fillRect(wx, y0 - 120, 4, 120); ctx.fillStyle = "#EFE8FC"; ctx.strokeStyle = "#8969C6"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(wx - 16, y0 - 60, 16, 60, 6) : ctx.rect(wx - 16, y0 - 60, 16, 60); ctx.fill(); ctx.stroke();
        if (st.v > 0.05) { const a = (ctl.pad ? 6 : ctl.foot ? muFoot() * Kin.Q_FOOT * prof().mass_kg * 9.81 : 6) / Kin.mTotal(body()), xs = st.x + Kin.stopping(st.v, a).d, px = SX(xs);
          ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = xs < WALL - 0.45 ? "#25A06F" : "#CC5794"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, y0 - 70); ctx.lineTo(px, y0); ctx.stroke(); ctx.restore();
          ctx.fillStyle = xs < WALL - 0.45 ? "#1E7E57" : "#B03F7A"; ctx.font = "700 11px " + FONT; ctx.fillText(`${ctl.pad || ctl.foot ? "" : "אם אבלום עכשיו: "}${fmt(Kin.stopping(st.v, a).d, 1)} m`, px, y0 - 84); } }
      if (IM.sign.complete && level !== 5) ctx.drawImage(IM.sign, SX(END - 2), y0 - 70, 42, 68);
      // paint drops every 0.5 s, numbered
      ctx.textBaseline = "bottom"; ctx.font = "600 9px " + FONT;
      drops.forEach((d, i) => { const px = SX(d.x); if (px < -10 || px > W + 10) return; ctx.fillStyle = "#2785C7"; ctx.beginPath(); ctx.arc(px, y0 + 36, 4.5, 0, Math.PI * 2); ctx.fill(); if (i % 2 === 0) { ctx.fillStyle = "#8A8E96"; ctx.textBaseline = "top"; ctx.fillText(fmt(d.t, 1) + "s", px, y0 + 42); } });
      // level 1 flags, the distance walked and the displacement arrow
      if (level === 1) {
        for (const [k, col, lab1] of [["s", "#25A06F", "התחלה"], ["e", "#E2574C", "סוף"]]) { const f = flags[k], px = SX(f.x); ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y0 - 64); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(px, y0 - 64); ctx.lineTo(px + 26, y0 - 56); ctx.lineTo(px, y0 - 48); ctx.fill(); ctx.fillStyle = "#3a3a40"; ctx.font = "700 11px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.fillText(lab1, px + 8, y0 - 70); ctx.direction = "ltr"; }
        if (flags.revealed) { forceArrow(ctx, SX(1), y0 - 100, (3 - 1) * S, 0, "#8A60E8", "Δx = +2 m", { thin: true }); ctx.fillStyle = "#B8741A"; ctx.font = "700 13px " + FONT; ctx.textAlign = "center"; ctx.direction = "rtl"; ctx.fillText(`דרך: 5 + 3 = 8 m`, SX(3.5), y0 - 128); ctx.direction = "ltr"; }
      }
      // the cookie (rolls with its real speed: angle = x / r)
      const ckx = cookie.decor ? cookie.x0 + (introT < 0.65 ? 0 : Math.min(1.5, (introT - 0.65) * 3)) + (introT > 2.4 ? (introT - 2.4) * 3 : 0) : cookie.caught ? st.x + 0.35 : Kin.cookieAt(cookie, st.t);
      if (!(cookie.decor && SX(ckx) > W + 40) && IM.roll.complete) { const r = 0.16 * S * 1.6, fr = Math.floor(((ckx / 0.16) / (Math.PI * 2) * 8) % 8 + 8) % 8; ctx.drawImage(IM.roll, fr * 128, 0, 128, 128, SX(ckx) - r, y0 - 2 * r, 2 * r, 2 * r); }
      // the creature on its skateboard: lean with acceleration (pose only, the body point is st.x)
      const h = prof().height_m * VIS * S, w = img.naturalWidth ? h * img.naturalWidth / img.naturalHeight : h, bx = SX(st.x), bw = Math.max(w * 0.9, 0.5 * S * 1.2);
      const braking = ctl.pad || ctl.foot, lean = clamp((braking ? -st.a : st.a) * 0.035 * (braking ? -1 : 1), -0.21, 0.21) + (ctl.push ? 0.12 : 0) - (braking && st.v > 0.05 ? -0.12 : 0);
      const tNow = now / 1000, breathe = 1 + Math.sin(tNow * 2.2) * 0.012, bob = Math.abs(st.v) > 0.2 ? Math.sin(tNow * 9) * 1.2 : 0, squash = 1 - clamp(Math.abs(st.a) * 0.006, 0, 0.03);
      if (IM.board.complete) ctx.drawImage(IM.board, bx - bw / 2, y0 - bw * 0.33, bw, bw * 0.33);
      if (ctl.push && IM.lines.complete) { ctx.globalAlpha = 0.7; ctx.drawImage(IM.lines, bx - w * 1.1, y0 - h * 0.7, w * 0.7, w * 0.3); ctx.globalAlpha = 1; }
      if (img.complete && img.naturalWidth) { ctx.save(); ctx.translate(bx, y0 - bw * 0.26 + bob); ctx.rotate(lean); ctx.scale(breathe / squash * squash, breathe * squash); ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore(); }
      if (ctl.foot && st.v > 0.05) { ctx.strokeStyle = "#CC5794"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx - w * 0.2, y0 - 6); ctx.lineTo(bx - w * 0.2 - 18, y0); ctx.stroke(); }
      // velocity (blue) and acceleration (orange) arrows
      const vy = y0 - h - bw * 0.3 - 26;
      if (Math.abs(st.v) > 0.02) forceArrow(ctx, bx, vy, clamp(st.v * 16, -170, 170), 0, "#2785C7", "v", { thin: true, dy: -14 });
      if (Math.abs(st.a) > 0.02) forceArrow(ctx, bx, vy - 30, clamp(st.a * 22, -150, 150), 0, "#E39B28", "a", { thin: true, dy: -14 });
      // relative motion in the chase
      if (level === 6 && !cookie.caught) { const gap = Kin.cookieAt(cookie, st.t) - st.x; ctx.fillStyle = "#3a3a40"; ctx.font = "700 12px " + FONT; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(`פער ${fmt(gap, 2)} m · v_rel = ${fmt(1.2 - st.v, 2)} m/s`, 10, y0 + 56); }
      // numbers corner
      ctx.font = "600 11px " + FONT; ctx.fillStyle = "#606671"; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText(`t = ${fmt(st.t, 1)} s`, W - 10, y0 + 56);
      if (level === 4 && l4rows.length) { ctx.textAlign = "left"; ctx.font = "600 11px " + FONT; l4rows.forEach((r, i) => { ctx.fillStyle = "#3a3a40"; ctx.fillText(`m = ${fmt(r.m, 1)} kg → a = ${fmt(r.a, 2)} m/s²`, 10, y0 + 74 + i * 15); }); }
      // intro title
      if (introT < 2.2) { ctx.globalAlpha = Math.min(1, (2.2 - introT) * 2); ctx.fillStyle = "#20232A"; ctx.font = "800 20px " + FONT; ctx.textAlign = "center"; ctx.direction = "rtl"; ctx.fillText(level === 6 ? "העוגייה בורחת!" : "מי הזיז את העוגייה?!", W / 2, H * 0.18); ctx.direction = "ltr"; ctx.globalAlpha = 1; }
    }
    // the graphs: from the real run; slope and signed area are tappable
    function drawGraph() {
      if ($("#kgraph").hidden || !GW) return;
      const c = gctx; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, GW, GH); c.direction = "ltr";
      const L = 38, R = GW - 8, T = 8, B = GH - 20, key = gTab, col = { x: "#2785C7", v: "#2785C7", a: "#E39B28" }[key];
      const tMax = Math.max(4, st.t), vals = hist.map((p) => p[key]), lo = Math.min(0, ...vals), hi = Math.max(0.5, ...vals), span = hi - lo || 1;
      const X = (t) => L + t / tMax * (R - L), Y = (v) => B - (v - lo) / span * (B - T);
      c.fillStyle = "#FBFBFC"; c.fillRect(L, T, R - L, B - T);
      c.strokeStyle = "#C9CDD3"; c.lineWidth = 1; c.beginPath(); c.moveTo(L, Y(0)); c.lineTo(R, Y(0)); c.stroke(); c.beginPath(); c.moveTo(L, T); c.lineTo(L, B); c.stroke();
      if (key === "v" && hist.length > 1) { // signed area: above the axis counts +, below counts −
        for (const [sign, fill] of [[1, "rgba(39,133,199,0.15)"], [-1, "rgba(226,87,76,0.15)"]]) { c.fillStyle = fill; c.beginPath(); c.moveTo(X(hist[0].t), Y(0)); for (const p of hist) c.lineTo(X(p.t), Y(sign > 0 ? Math.max(0, p.v) : Math.min(0, p.v))); c.lineTo(X(hist[hist.length - 1].t), Y(0)); c.closePath(); c.fill(); }
      }
      c.strokeStyle = col; c.lineWidth = 2.2; c.beginPath(); hist.forEach((p, i) => (i ? c.lineTo : c.moveTo).call(c, X(p.t), Y(p[key]))); c.stroke();
      c.fillStyle = "#606671"; c.font = "600 10px " + FONT; c.textAlign = "right"; c.textBaseline = "middle"; c.fillText(fmt(hi, 1), L - 4, Y(hi)); c.fillText("0", L - 4, Y(0)); if (lo < 0) c.fillText(fmt(lo, 1), L - 4, Y(lo));
      c.textAlign = "center"; c.textBaseline = "top"; c.fillText("t (s)", (L + R) / 2, B + 4); c.fillText(fmt(tMax, 0), R - 6, B + 4);
      c.save(); c.translate(10, (T + B) / 2); c.rotate(-Math.PI / 2); c.fillStyle = col; c.fillText({ x: "x (m)", v: "v (m/s)", a: "a (m/s²)" }[key], 0, 0); c.restore();
      if (key === "v") { c.fillStyle = "#3a3a40"; c.textAlign = "right"; c.textBaseline = "top"; c.fillText(`שטח = Δx = ${fmt(st.x - (hist[0] ? hist[0].x : 0), 2)} m`, R - 4, T + 3); }
    }
    gcv.addEventListener("pointerdown", (e) => openInfo({ x: "kin_xt", v: "kin_vt", a: "kin_at" }[gTab], { x: e.clientX, y: e.clientY }));
    // level 1: drag the flags
    let flagDrag = null;
    cv.addEventListener("pointerdown", (e) => {
      if (isSheetOpen()) return;
      const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      if (level === 1 && l1.phase === "done" && !flags.revealed) {
        for (const k of ["s", "e"]) if (Math.abs(px - SX(flags[k].x)) < 34 && py > gy() - 90 && py < gy() + 10) { flagDrag = k; cv.setPointerCapture(e.pointerId); return; }
      }
      openInfo(level === 6 ? "kin_rel" : "kin_v", { x: e.clientX, y: e.clientY });
    });
    cv.addEventListener("pointermove", (e) => { if (!flagDrag) return; const r = cv.getBoundingClientRect(); flags[flagDrag].x = camX + (e.clientX - r.left - W * 0.42) / S0(); });
    cv.addEventListener("pointerup", () => {
      if (!flagDrag) return; const k = flagDrag; flagDrag = null; const target = k === "s" ? 1 : 3;
      if (Math.abs(flags[k].x - target) < 0.4) { flags[k].x = target; flags[k].set = true; G.sfx.tick(); } else say(k === "s" ? "לא שם התחלתי. איפה הייתי ב-t = 0?" : "לא שם נגמר. איפה עצרתי בסוף?", 2.4);
      if (flags.s.set && flags.e.set && !flags.revealed) { flags.revealed = true; say("הלכתי 8 מטר, אבל ההעתק רק +2 מטר! העתק = סוף פחות התחלה.", 4); if (!complete(1)) maybeAsk(); }
    });

    function readouts() {
      $("#rX").textContent = fmt(st.x, 2) + " m"; $("#rV").textContent = fmt(st.v, 2) + " m/s"; $("#rA").textContent = fmt(st.a, 2) + " m/s²"; $("#rD").textContent = fmt(st.dist, 2) + " m";
    }
    infoLive = () => ({ x: st.x, v: st.v, a: st.a, d: st.dist, t: st.t, m: Kin.mTotal(body()), gap: level === 6 ? Kin.cookieAt(cookie, st.t) - st.x : undefined });
    function frame(now) {
      const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (!isSheetOpen() && !document.hidden) { introT += dt; step(dt); }
      // camera: close-up → dolly back (0.7–1.8 s), then a soft follow that keeps the cookie or the wall in view
      if (introT < 2.2) zoom = 1.5 - 0.5 * clamp((introT - 0.7) / 1.1, 0, 1) ** 2 * (3 - 2 * clamp((introT - 0.7) / 1.1, 0, 1)) / 1; else zoom = 1;
      let target = level === 1 ? 2.5 : st.x + 1.6;
      if (level === 6 && !cookie.caught) { const ck = Kin.cookieAt(cookie, st.t); if (ck - st.x < 6) target = (st.x + ck) / 2 + 0.4; }
      if (level === 5 && WALL - st.x < 7) target = Math.max(target, WALL - 3.6);
      camX += (target - camX) * Math.min(1, dt / 0.18);
      draw(now); drawGraph();
      if ((fpaint++ & 3) === 0) readouts();
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) $("#say").hidden = true; }
      raf = requestAnimationFrame(frame);
    }
    window.__kin = () => ({ level, phase, st, ctl: { ...ctl } });          // for tests
    enterLevel(level);
    raf = requestAnimationFrame(frame);
    cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); closeInfo(); infoLive = () => ({}); document.querySelector(".sheet-back")?.remove(); try { speechSynthesis && speechSynthesis.cancel(); } catch (e) {} };
  };

  // ======================================================================
  //  "מי מושך אותי?!": the inclined plane, seven stages
  //  The creature is the body: mass and friction are its own and cannot be
  //  edited. The player changes only the angle and the surface.
  // ======================================================================
  const INC = { L: 1.6, d0: 0.35, mat: 0.14, vis: 1.8, kpx: 5.5 };
  const COLORS = { g: "#2785C7", N: "#8969C6", f: "#CC5794", par: "#E39B28", perp: "#42A47A" };
  SCREENS.incline = () => {
    setTitle("מי מושך אותי?!", "מישור משופע, כוחות וחיכוך");
    const IP = InclinePhys;
    const st = P.data.physics.incline || (P.data.physics.incline = { stage: 1, reached: 1, deg: 0, surface: "dry_wood", revealed: false, forces: false });
    const saveSt = () => P.save();
    let sp = activeSpecies();
    const prof = () => phys(sp);
    const mu = () => (prof().surfaces || {})[st.surface] || { mu_s: prof().mu_s, mu_k: prof().mu_k };
    const prm = () => ({ m: prof().mass_kg, deg: st.deg, mus: mu().mu_s, muk: mu().mu_k });
    screenEl.innerHTML = `
      <div class="lab-screen">
        <div class="stagebar" id="stagebar">${INCLINE_UNITS.map((u) => `<button type="button" data-st="${u.stage}" aria-label="שלב ${u.stage}: ${esc(u.he)}">${u.stage}</button>`).join("")}</div>
        <div class="card task" id="task"></div>
        <div class="lab" id="lab">
          <canvas id="labCanvas"></canvas>
          <div class="bubble say" id="say" hidden></div>
          <div class="lab-tools">
            <button class="chip" id="charChip" type="button"></button>
            <button class="chip" id="viewBtn" type="button" hidden>רכיבי mg</button>
          </div>
        </div>
        <div class="readouts">
          <button type="button" class="readout" data-info="theta"><small>זווית θ <i class="qi">?</i></small><b id="rTh">–</b></button>
          <button type="button" class="readout" data-info="N"><small>נורמל N <i class="qi">?</i></small><b id="rN">–</b></button>
          <button type="button" class="readout" data-info="finc"><small>חיכוך <i class="qi">?</i></small><b id="rF">–</b></button>
          <button type="button" class="readout" data-info="a"><small>תאוצה a <i class="qi">?</i></small><b id="rA">–</b></button>
        </div>
        <div class="card controls">
          <div class="angle-row">
            <button class="step" id="angMinus" type="button" aria-label="להקטין זווית">−</button>
            <div class="ang slider-row"><label for="thIn"><span>זווית המדרון ${infoBtn("theta")}</span><span class="val" id="thVal"></span></label>
              <input id="thIn" type="range" min="0" max="55" step="1"></div>
            <button class="step" id="angPlus" type="button" aria-label="להגדיל זווית">+</button>
          </div>
          <div><div class="meter-label"><span>המשטח</span><span class="ltr" id="muVal"></span></div>
            <div class="surfaces">${Object.entries(SPR.surfaces).map(([k, v]) => `<button type="button" data-s="${k}">${esc(v)}</button>`).join("")}</div></div>
          <div style="display:flex;gap:10px"><button class="btn secondary" id="again" type="button" style="flex:1">שוב!</button><button class="btn quiet" id="formulaBtn" type="button">הצג נוסחה</button></div>
        </div>
        <div class="card formula" id="formula" hidden></div>
      </div>`;
    const cv = $("#labCanvas"), ctx = cv.getContext("2d"), box = $("#lab");
    let W = 0, H = 0, DPR = 1;
    const resize = () => { const r = box.getBoundingClientRect(); DPR = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(box);
    const img = new Image(); let imgSp = null;
    const loadImg = () => { if (imgSp !== sp) { imgSp = sp; img.src = artOf(sp); } };
    loadImg();
    const bg = new Image(); bg.src = "art/lab_bg.webp";

    let body = { d: INC.d0, v: 0, bottom: false }, fr = IP.forces(prm());
    infoLive = () => $("#rN").textContent.trim() === "?" ? { deg: st.deg, name: nameOf(sp), crit: fr.criticalDeg } : ({ deg: st.deg, name: nameOf(sp), crit: fr.criticalDeg, W: fr.W, N: fr.N, f: Math.abs(fr.f), fk: fr.fk, fsMax: fr.fsMax, holds: fr.holds, a: fr.a });
    let view = "real", freeze = 0, holdT = 0, sayT = 0, raf = 0, lastT = performance.now(), acc = 0, fpaint = 0, formulaOpen = false, slides = 0, questionCooldown = 1;
    let camT = st.revealed ? 1 : 0, revealT = st.revealed ? 1 : 0, revealing = false, dragAng = null, wasSliding = false;
    const showForces = () => st.forces || st.stage > 1;

    // ---------- stages ----------
    const TASKS = {
      1: { text: "היצור עומד על רצפה ישרה ולא זז. פועלים עליו כוחות?", btn: "לגלות את הכוחות" },
      2: { text: "תרימו את הקצה הימני של המשטח: גררו את העיגול הכתום, או לחצו +.", btn: () => (st.revealed ? null : "המשך") },
      3: { text: "פרקו את כוח הכובד לשני רכיבים: לחצו על 'רכיבי mg'.", btn: null },
      4: { text: "הגדילו את הזווית לאט. עד מתי הרגליים מחזיקות?", btn: null },
      5: { text: "עברו את זווית הסף ותנו לו להחליק עד המזרן.", btn: null },
      6: { text: "של מי הרגליים האלה? השוו לדמות אחרת באותו מדרון בדיוק.", btn: "להשוות" },
      7: { text: "עכשיו אתה הפיזיקאי: שלוש תשובות נכונות על מה שגילית.", btn: "לשאלות" }
    };
    function paintStages() {
      for (const b of screenEl.querySelectorAll("#stagebar [data-st]")) {
        const n = +b.dataset.st;
        b.disabled = n > st.reached;
        if (n === st.stage) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
        b.classList.toggle("done", done().includes("newton.s" + n));
      }
      const t = TASKS[st.stage], u = INCLINE_UNITS[st.stage - 1];
      const label = typeof t.btn === "function" ? t.btn() : t.btn;
      $("#task").innerHTML = `<div><small>שלב ${st.stage}: ${esc(u.he)}</small><p>${esc(t.text)}</p></div>${label ? `<button class="btn primary" id="taskBtn" type="button">${esc(label)}</button>` : ""}`;
      $("#taskBtn")?.addEventListener("click", taskAction);
      $("#viewBtn").hidden = st.stage < 3 && !done().includes("newton.s3");
      const locked = !st.revealed;
      for (const id of ["#thIn", "#angMinus", "#angPlus"]) $(id).disabled = locked;
    }
    function taskAction() {
      G.audio.unlock();
      if (st.stage === 1) { st.forces = true; saveSt(); say("מה? למה יש לי חצים?", 2.6); G.sfx.pop(); setTimeout(() => completeStage(1), 1600); }
      else if (st.stage === 2) startReveal();
      else if (st.stage === 6) compare();
      else if (st.stage === 7) quiz();
    }
    for (const b of screenEl.querySelectorAll("#stagebar [data-st]")) b.addEventListener("click", () => { st.stage = +b.dataset.st; saveSt(); paintStages(); G.sfx.pop(); });
    function completeStage(n) {
      const id = "newton.s" + n;
      const fresh = P.completeSubtopic(id);
      if (st.stage === n && n < 7) { st.stage = n + 1; st.reached = Math.max(st.reached, n + 1); }
      saveSt(); paintStages();
      if (fresh) {
        const c = comPoint(), cr = cv.getBoundingClientRect();
        celebrateUnits("newton", [id], { x: cr.left + c.x, y: cr.top + c.y });
        questionCooldown = 1;
      }
    }

    // ---------- reveal: the flat floor was a plank all along ----------
    function startReveal() {
      if (st.revealed || revealing) return;
      revealing = true; G.sfx.whoosh();
      say("רגע, זה לא שולחן ישר?!", 2.4);
    }

    // ---------- controls ----------
    const thIn = $("#thIn");
    function setAngle(deg, quiet) {
      const nd = clamp(Math.round(deg), 0, 55);
      if (nd === st.deg) return;
      st.deg = nd; thIn.value = nd;
      if (!quiet && nd % 5 === 0) G.sfx.tick();
    }
    thIn.value = st.deg;
    thIn.addEventListener("input", () => setAngle(+thIn.value, true));
    thIn.addEventListener("change", saveSt);
    $("#angMinus").addEventListener("click", () => { setAngle(st.deg - 1); saveSt(); });
    $("#angPlus").addEventListener("click", () => { if (!st.revealed) startReveal(); else { setAngle(st.deg + 1); saveSt(); } });
    for (const b of screenEl.querySelectorAll(".surfaces [data-s]")) b.addEventListener("click", () => {
      st.surface = b.dataset.s; saveSt(); G.sfx.pop(); paintProfile();
      say(`על ${SPR.surfaces[st.surface]}: μs = ${fmt(mu().mu_s, 2)}, μk = ${fmt(mu().mu_k, 2)}. אלה המספרים של הרגליים שלי עם המשטח הזה.`, 3.6);
    });
    $("#again").addEventListener("click", () => { body = { d: INC.d0, v: 0, bottom: false }; G.sfx.pop(); say("עוד פעם מההתחלה!", 1.4); });
    $("#viewBtn").addEventListener("click", () => {
      view = view === "real" ? "comp" : "real";
      $("#viewBtn").textContent = view === "real" ? "רכיבי mg" : "כוחות אמיתיים";
      G.sfx.pop();
      if (view === "comp") { freeze = 1.4; say("רכיבי הכבידה. הם לא כוחות נוספים!", 2.6); if (st.stage === 3 && st.deg >= 10) setTimeout(() => completeStage(3), 1200); }
    });
    $("#formulaBtn").addEventListener("click", () => {
      formulaOpen = $("#formula").hidden; $("#formula").hidden = !formulaOpen;
      $("#formulaBtn").textContent = formulaOpen ? "הסתר נוסחה" : "הצג נוסחה";
      if (formulaOpen) { paintFormula(); $("#formula").scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    });
    function paintProfile() {
      const p = prof();
      $("#charChip").innerHTML = `<img src="${artOf(sp)}" alt=""><span>${esc(nameOf(sp))} · <span class="ltr">${fmt(p.mass_kg, 1)} kg · μs ${fmt(mu().mu_s, 2)}</span></span>`;
      $("#muVal").textContent = `μs ${fmt(mu().mu_s, 2)} · μk ${fmt(mu().mu_k, 2)}`;
      for (const b of screenEl.querySelectorAll(".surfaces [data-s]")) b.setAttribute("aria-pressed", b.dataset.s === st.surface);
    }
    $("#charChip").addEventListener("click", profileSheet);
    function profileSheet() {
      const p = prof();
      const el = sheet(`<div style="text-align:center">${creatureImg(sp).replace("<img", '<img style="width:110px;height:110px;object-fit:contain"')}</div>
        <h3>הגוף של ${esc(nameOf(sp))}</h3><p>התכונות קבועות. כדי לנסות גוף אחר מחליפים דמות עם חבר.</p>
        <div class="props">
          <div><span>מסה</span><b>m = ${p.mass_kg} kg</b></div>
          <div><span>משקל כאן</span><b>W = mg = ${fmt(p.mass_kg * 9.81, 1)} N</b></div>
          <div><span>גובה</span><b>${Math.round(p.height_m * 100)} cm</b></div>
          ${Object.entries(SPR.surfaces).map(([k, v]) => { const m = (p.surfaces || {})[k]; return m ? `<div><span>חיכוך עם ${esc(v)}</span><b>μs ${fmt(m.mu_s, 2)} · μk ${fmt(m.mu_k, 2)}</b></div>` : ""; }).join("")}
        </div>
        <div class="actions"><button class="btn primary" type="button" id="cmpBtn">להשוות</button><button class="btn secondary" type="button" id="tradeBtn">החלף עם חבר</button></div>
        <p class="fine">החלפה ישירה עם טלפון קרוב: הדמות עוברת, המטבעות וההתקדמות נשארים אצלך.</p>`);
      el.querySelector("#cmpBtn").addEventListener("click", () => { el.closest(".sheet-back").remove(); compare(); });
      el.querySelector("#tradeBtn").addEventListener("click", () => { closeUI(); setTimeout(() => G.openTrade(), 250); });
    }

    // ---------- stage 6: same ramp, another body ----------
    function stats(species) {
      const p = phys(species), m = (p.surfaces || {})[st.surface] || { mu_s: p.mu_s, mu_k: p.mu_k };
      const f = IP.forces({ m: p.mass_kg, deg: st.deg, mus: m.mu_s, muk: m.mu_k });
      const L = INC.L - INC.mat - INC.d0;
      return { species, m: p.mass_kg, mus: m.mu_s, muk: m.mu_k, crit: f.criticalDeg, holds: f.holds, a: f.a, W: f.W, t: f.holds || f.a <= 0 ? null : Math.sqrt(2 * L / f.a) };
    }
    function compare() {
      const owned = P.owned().filter((c) => c.species !== sp), others = SPR.creatures.map((c) => c.id).filter((id) => id !== sp && !owned.some((c) => c.species === id));
      const el = sheet(`<h3>להשוות באותו מדרון</h3><p>זווית ${st.deg}°, ${esc(SPR.surfaces[st.surface])}. אותם תנאים, גוף אחר.</p>
        ${owned.length ? `<p style="margin:0 0 6px;font-weight:700;color:var(--ink)">הדמויות שלך</p><div class="pick-list">${owned.map((c) => `<button type="button" data-own="${c.instance_id}">${creatureImg(c.species)}<span>${esc(nameOf(c.species))}</span><small>${fmt(phys(c.species).mass_kg, 1)} kg</small></button>`).join("")}</div>` : ""}
        <p style="margin:14px 0 6px;font-weight:700;color:var(--ink)">דוגמאות להשוואה בלבד</p>
        <p class="fine" style="margin:0 0 8px">רק תוצאות. הדמות שלך לא משתנה. כדי לשחק בגוף אחר צריך החלפה עם חבר.</p>
        <div class="pick-list">${others.map((id) => `<button type="button" data-ex="${id}">${creatureImg(id)}<span>${esc(nameOf(id))}</span><small>${fmt(phys(id).mass_kg, 1)} kg</small></button>`).join("")}</div>
        <div class="actions"><button class="btn quiet" type="button" data-close>סגור</button></div>`);
      const pick = (other, own) => {
        el.closest(".sheet-back").remove();
        const a = stats(sp), b = stats(other);
        if (own) { const c = P.owned().find((x) => x.instance_id === own); P.setActive(c.instance_id); G.setCreature(c.species); sp = c.species; loadImg(); paintProfile(); body = { d: INC.d0, v: 0, bottom: false }; }
        showCompare(a, b, !!own);
        if (st.stage === 6) setTimeout(() => completeStage(6), 300);
        else P.completeSubtopic("newton.s6") && paintStages();
      };
      for (const bt of el.querySelectorAll("[data-own]")) bt.addEventListener("click", () => pick(P.owned().find((x) => x.instance_id === bt.dataset.own).species, bt.dataset.own));
      for (const bt of el.querySelectorAll("[data-ex]")) bt.addEventListener("click", () => pick(bt.dataset.ex, null));
    }
    function showCompare(a, b, switched) {
      const col = (s) => `<td>${creatureImg(s.species).replace("<img", '<img style="width:56px;height:56px;object-fit:contain"')}<b>${esc(nameOf(s.species))}</b></td>`;
      const row = (label, fa) => `<tr><th>${label}</th><td class="ltr">${fa(a)}</td><td class="ltr">${fa(b)}</td></tr>`;
      const sameMu = Math.abs(a.mus - b.mus) < 0.02 && Math.abs(a.muk - b.muk) < 0.02;
      const insight = sameMu ? "אותו חיכוך, אותה תאוצה, גם כשהמסה שונה: המסה מצטמצמת." : (a.holds !== b.holds ? "אחת נשארת ואחת מחליקה. ההבדל בא מהחיכוך של הרגליים, לא מהמסה." : "ההבדל בתאוצה בא מ-μ של הרגליים, לא מהמסה: a = g(sinθ − μk·cosθ).");
      const el = sheet(`<h3>אותו מדרון, שני גופים</h3>
        <table class="cmp"><tr><th></th>${col(a)}${col(b)}</tr>
          ${row("מסה", (s) => fmt(s.m, 1) + " kg")}
          ${row("משקל mg", (s) => fmt(s.W, 1) + " N")}
          ${row("μs · μk", (s) => fmt(s.mus, 2) + " · " + fmt(s.muk, 2))}
          ${row("זווית סף", (s) => fmt(s.crit, 1) + "°")}
          ${row("ב-" + st.deg + "°", (s) => s.holds ? "נשאר" : "מחליק")}
          ${row("תאוצה", (s) => s.holds ? "0" : fmt(s.a, 2) + " m/s²")}
          ${row("עד המזרן", (s) => s.t ? fmt(s.t, 2) + " s" : "–")}
        </table>
        <p class="insight" style="margin-top:12px">${esc(insight)}</p>
        ${switched ? `<p class="fine">עכשיו ${esc(nameOf(sp))} על המדרון. לחצו "שוב!" כדי לראות.</p>` : ""}
        <div class="actions"><button class="btn primary" type="button" data-close>לנסות</button></div>`);
    }

    // ---------- stage 7: questions ----------
    function quiz() {
      const pool = INCLINE_QUESTIONS.filter((q) => q.stage <= Math.max(st.reached, 6));
      askQuestion(pool, () => {
        const correct = new Set(P.data.physics.question_history.filter((h) => h.correct && h.id.startsWith("i.")).map((h) => h.id));
        if (correct.size >= 3 && !done().includes("newton.s7")) setTimeout(() => { document.querySelector(".sheet-back")?.remove(); completeStage(7); }, 1600);
      });
    }

    // ---------- geometry and camera ----------
    // world in metres: pivot at (0,0), the plank rises to the right; y up
    const geo = () => {
      const th = st.deg * IP.DEG, c = Math.cos(th), s = Math.sin(th);
      const top = { x: INC.L * c, y: INC.L * s };
      const cp = { x: top.x - body.d * c, y: top.y - body.d * s };            // feet on the plank
      return { th, c, s, top, cp };
    };
    function camera() {
      const xs = [-0.5, INC.L + 0.3], ys = [-0.35, INC.L * Math.sin(55 * IP.DEG) + 0.95];
      const S = Math.min(W / (xs[1] - xs[0]), (H - 8) / (ys[1] - ys[0]));
      const side = { S, ox: W / 2 - S * (xs[0] + xs[1]) / 2, oy: H / 2 + S * (ys[0] + ys[1]) / 2 };
      const g = geo(), hv = prof().height_m * INC.vis;
      const Sc = S * 1.75, fx = g.cp.x, fy = g.cp.y + hv * 0.45;
      const close = { S: Sc, ox: W / 2 - Sc * fx, oy: H * 0.57 + Sc * fy };
      const e = 1 - Math.pow(1 - camT, 3);
      return { S: close.S + (side.S - close.S) * e, ox: close.ox + (side.ox - close.ox) * e, oy: close.oy + (side.oy - close.oy) * e, side };
    }
    let cam = null;
    const sx = (x) => cam.ox + x * cam.S, sy = (y) => cam.oy - y * cam.S;
    function comPoint() {
      if (!cam) return { x: W / 2, y: H / 2 };
      const g = geo(), hv = prof().height_m * INC.vis * 0.5;
      return { x: sx(g.cp.x - g.s * hv), y: sy(g.cp.y + g.c * hv) };
    }

    // drag the orange grip at the top end to set the angle
    cv.addEventListener("pointerdown", (e) => {
      if (isSheetOpen() || !cam) return;
      const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, g = geo();
      const gx = sx(g.top.x), gy = sy(g.top.y);
      if (Math.hypot(px - gx, py - gy) > 40) {
        const c = comPoint();
        if (st.revealed && Math.hypot(px - c.x, py - c.y) < 60) openInfo("forces", { x: e.clientX, y: e.clientY });
        return;
      }
      G.audio.unlock();
      if (!st.revealed) { if (st.stage >= 2) startReveal(); return; }
      dragAng = true; cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener("pointermove", (e) => {
      if (!dragAng) return;
      const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      setAngle(Math.atan2(sy(0) - py, px - sx(0)) / IP.DEG);
    });
    const up = () => { if (dragAng) { dragAng = null; saveSt(); } };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

    // ---------- drawing ----------
    function arrow(x0, y0, vx, vy, color, label, opts = {}) { forceArrow(ctx, x0, y0, vx, vy, color, label, opts); }
    function draw() {
      cam = camera();
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.direction = "ltr";
      if (bg.complete && bg.naturalWidth) { ctx.globalAlpha = showForces() ? 0.07 : 0.14; const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight); ctx.drawImage(bg, (W - bg.naturalWidth * s) / 2, (H - bg.naturalHeight * s) / 2, bg.naturalWidth * s, bg.naturalHeight * s); ctx.globalAlpha = 1; }
      const g = geo(), S = cam.S;
      // ground
      ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, sy(0)); ctx.lineTo(W, sy(0)); ctx.stroke();
      // the triangle appears like a pencil line once the floor turns out to be a ramp
      if (revealT > 0 && g.s > 0.001) {
        const pts = [[0, 0], [g.top.x, 0], [g.top.x, g.top.y]];
        ctx.save(); ctx.globalAlpha = Math.min(1, revealT * 1.4);
        ctx.fillStyle = "rgba(107,107,112,0.07)"; ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); for (const [x, y] of pts) ctx.lineTo(sx(x), sy(y)); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 2; ctx.setLineDash([2000 * revealT, 2000]);
        ctx.beginPath(); ctx.moveTo(sx(g.top.x), sy(0)); ctx.lineTo(sx(g.top.x), sy(g.top.y)); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(58,58,64,0.18)"; ctx.lineWidth = 1;
        ctx.save(); ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); for (const [x, y] of pts) ctx.lineTo(sx(x), sy(y)); ctx.closePath(); ctx.clip();
        for (let i = -400; i < 800; i += 11) { ctx.beginPath(); ctx.moveTo(sx(0) + i, sy(0)); ctx.lineTo(sx(0) + i + 300, sy(0) - 300); ctx.stroke(); }
        ctx.restore(); ctx.restore();
        // θ at the pivot
        ctx.strokeStyle = "#E39B28"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx(0), sy(0), 42, -g.th, 0); ctx.stroke();
        ctx.fillStyle = "#B8741A"; ctx.font = "700 14px " + FONT; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText("θ = " + st.deg + "°", sx(0) + 50, sy(0) - 14);
      }
      // the plank (the surface the creature stands on), tinted by material
      const tint = { dry_wood: "#B58A55", smooth_ice: "#7FC1DE", rubber_mat: "#4F5157" }[st.surface];
      const p0 = { x: sx(0), y: sy(0) }, p1 = { x: sx(g.top.x), y: sy(g.top.y) };
      if (revealT <= 0) { p0.x = sx(-0.6); p0.y = sy(0); p1.x = sx(INC.L + 0.6); p1.y = sy(0); }
      ctx.strokeStyle = tint; ctx.lineWidth = Math.max(5, S * 0.035); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      // soft mat at the bottom
      if (revealT > 0) {
        const mx = sx(-0.34), mw = 0.34 * S, mh = Math.max(10, 0.08 * S);
        ctx.fillStyle = "#EFE8FC"; ctx.strokeStyle = "#8969C6"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(mx, sy(0) - mh, mw, mh, 6) : ctx.rect(mx, sy(0) - mh, mw, mh); ctx.fill(); ctx.stroke();
      }
      // grip at the top end
      if (st.stage >= 2 || st.revealed) {
        ctx.fillStyle = "#F49A35"; ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p1.x, p1.y, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (st.stage === 2 && st.deg === 0 && !reduceMotion) {
          const k = (performance.now() / 1000) % 1;
          ctx.strokeStyle = "#258EF6"; ctx.lineWidth = 3; ctx.globalAlpha = Math.sin(k * Math.PI);
          ctx.beginPath(); ctx.moveTo(p1.x + 22, p1.y - 6 - k * 26); ctx.lineTo(p1.x + 22, p1.y - 34 - k * 26); ctx.moveTo(p1.x + 15, p1.y - 26 - k * 26); ctx.lineTo(p1.x + 22, p1.y - 34 - k * 26); ctx.lineTo(p1.x + 29, p1.y - 26 - k * 26); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      // the creature: feet on the plank, body turned with the surface (vectors stay world-true)
      const hv = prof().height_m * INC.vis * S;
      if (img.complete && img.naturalWidth) {
        const w = hv * img.naturalWidth / img.naturalHeight;
        const squash = body.bottom && body.squash > 0 ? 1 - Math.sin(body.squash * Math.PI) * 0.12 : 1;
        ctx.save(); ctx.translate(sx(g.cp.x), sy(g.cp.y)); ctx.rotate(-g.th * (revealT > 0 ? 1 : 0)); ctx.scale(2 - squash, squash);
        ctx.drawImage(img, -w / 2, -hv, w, hv); ctx.restore();
      }
      // forces from the centre of mass
      if (showForces()) {
        const c = comPoint(), f = fr, k = Math.min(INC.kpx, 150 / f.W) * (S / cam.side.S);   // one scale per scene: arrows compare with each other
        const real = view === "real";
        arrow(c.x, c.y, 0, f.W * k, COLORS.g, "mg", { dash: !real, thin: !real, value: real ? f.W : undefined });
        arrow(c.x, c.y, -g.s * f.N * k, -g.c * f.N * k, COLORS.N, "N", { alpha: real ? 1 : 0.3, side: -1, value: real ? f.N : undefined });
        if (f.f > 0.01) arrow(c.x, c.y, g.c * f.f * k, -g.s * f.f * k, COLORS.f, f.holds ? "f_s" : "f_k", { alpha: real ? 1 : 0.3, side: 1, value: real ? Math.abs(f.f) : undefined });
        if (!real) {
          arrow(c.x, c.y, -g.c * f.par * k, g.s * f.par * k, COLORS.par, "mg sinθ", { side: 1, value: f.par });
          arrow(c.x, c.y, g.s * f.perp * k, g.c * f.perp * k, COLORS.perp, "mg cosθ", { side: -1, value: f.perp });
          ctx.fillStyle = "#606671"; ctx.font = "600 12px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.textBaseline = "top";
          ctx.fillText("רכיבי הכבידה: לא כוחות נוספים", W - 10, 10); ctx.direction = "ltr";
        }
        // static friction gauge: how much of the maximum is used
        if (st.stage >= 4 && f.holds && st.deg > 0) {
          const ratio = f.fsMax > 0 ? Math.min(1, f.f / f.fsMax) : 1, gx = 12, gy = 12, gw = 120;
          ctx.fillStyle = "#606671"; ctx.font = "600 12px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "left"; ctx.textBaseline = "top";
          ctx.fillText("חיכוך סטטי מתוך המרבי", gx, gy); ctx.direction = "ltr";
          ctx.fillStyle = "#ECEEF1"; ctx.fillRect(gx, gy + 18, gw, 8);
          ctx.fillStyle = ratio > 0.85 ? "#E2574C" : COLORS.f; ctx.fillRect(gx, gy + 18, gw * ratio, 8);
          ctx.fillStyle = "#20232A"; ctx.font = "700 12px " + FONT; ctx.fillText(fmt(f.f, 1) + " / " + fmt(f.fsMax, 1) + " N", gx, gy + 30);
        }
      }
      if (!fr.holds && body.v > 0) {
        const c = comPoint();
        ctx.fillStyle = "#20232A"; ctx.font = "700 13px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText("v = " + fmt(body.v, 2) + " m/s", c.x, c.y - hv * 0.65);
      }
    }
    function paintReadouts() {
      const f = fr;
      $("#rTh").textContent = st.deg + "°";
      $("#rN").textContent = showForces() ? fmt(f.N, 1) + " N" : "?";
      $("#rF").textContent = showForces() ? (f.f > 0.01 ? (f.holds ? "f_s " : "f_k ") + fmt(f.f, 1) + " N" : "0 N") : "?";
      $("#rA").textContent = fmt(f.holds ? 0 : f.a, 2) + " m/s²";
      $("#thVal").textContent = st.deg + "°";
    }
    function paintFormula() {
      if ($("#formula").hidden) return;
      const f = fr, p = prm();
      setFormula($("#formula"), `
        <div class="eq"><span>כוח הכובד (תמיד אנכי)</span><span class="m">W = m·g<em>${fmt(f.W, 1)} N</em></span></div>
        <div class="eq"><span>נורמל</span><span class="m">N = mg·cosθ<em>${fmt(f.N, 1)} N</em></span></div>
        <div class="eq"><span>רכיב במורד המדרון</span><span class="m">mg·sinθ<em>${fmt(f.par, 1)} N</em></span></div>
        <div class="eq"><span>חיכוך סטטי (עד מקסימום)</span><span class="m">f<sub>s</sub> ≤ μs·N<em>${fmt(f.fsMax, 1)} N</em></span></div>
        <div class="eq"><span>חיכוך קינטי</span><span class="m">f<sub>k</sub> = μk·N<em>${fmt(f.fk, 1)} N</em></span></div>
        <div class="eq"><span>תאוצה בהחלקה</span><span class="m">a = g(sinθ − μk·cosθ)<em>${fmt(9.81 * (Math.sin(f.thetaRad) - p.muk * Math.cos(f.thetaRad)), 2)} m/s²</em></span></div>
        <div class="eq"><span>זווית הסף</span><span class="m">tanθ = μs<em>${fmt(f.criticalDeg, 1)}°</em></span></div>
        <p class="fine">הנורמל אינו "תגובה" לכוח הכובד: שניהם פועלים על אותו גוף. בתמונת הרכיבים אין כוחות חדשים, רק פירוק של mg.</p>`);
    }

    // ---------- loop ----------
    function say(text, secs = 2.6) { const el = $("#say"); el.textContent = text; el.hidden = false; sayT = secs; }
    let lineHold = 0, lineNear = 0;
    function frame(now) {
      const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (revealing) {
        camT = Math.min(1, camT + dt / 1.6); revealT = Math.min(1, revealT + dt / 1.1);
        if (camT >= 1) { revealing = false; st.revealed = true; saveSt(); paintStages(); say("נו, תרימו כבר.", 2); }
      }
      freeze = Math.max(0, freeze - dt);
      if (!isSheetOpen() && freeze <= 0) {
        acc += Math.min(dt, 0.25);
        while (acc >= IP.DT) {
          const r = IP.step(body, prm(), IP.DT, INC.L - INC.mat);
          if (r.bottom && !body.bottom) { body.squash = 0.0001; G.sfx.thudSoft(); G.buzz(40); say("בום. נחתתי על המזרן. שוב?", 2.4); onBottom(); }
          body = { d: r.d, v: r.v, bottom: r.bottom || body.bottom, squash: body.squash };
          acc -= IP.DT;
        }
      }
      if (body.squash > 0) body.squash = body.squash >= 1 ? 0 : Math.min(1, body.squash + dt / 0.35);
      fr = IP.forces({ ...prm(), v: body.v });
      // lines and stage checks
      if (!fr.holds && body.v > 0.05 && !wasSliding) { wasSliding = true; say("שמרו לי מקום למטההה!", 2); G.sfx.whoosh(); }
      if (fr.holds) wasSliding = false;
      const ratio = fr.fsMax > 0 ? fr.f / fr.fsMax : 0;
      if (fr.holds && st.deg > 0 && !body.bottom) {
        if (ratio > 0.85 && (lineNear -= dt) <= 0) { say("הרגליים שלי מנהלות משא ומתן עם הרצפה!", 2.4); lineNear = 8; }
        else if (ratio > 0.55 && (lineHold -= dt) <= 0) { say("אני מחזיק! אני מחזיק!", 1.8); lineHold = 10; }
      }
      if (st.stage === 2 && st.revealed && st.deg >= 10) completeStage(2);
      if (st.stage === 4) {
        if (fr.holds && st.deg >= 5 && ratio >= 0.6 && !body.bottom) { holdT += dt; if (holdT > 0.8) { holdT = 0; completeStage(4); } } else holdT = 0;
      }
      draw();
      if ((fpaint++ & 3) === 0) { paintReadouts(); if (formulaOpen) paintFormula(); }
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) $("#say").hidden = true; }
      raf = requestAnimationFrame(frame);
    }
    function onBottom() {
      slides++;
      if (st.stage === 5) setTimeout(() => completeStage(5), 900);
      else if (questionCooldown > 0) questionCooldown--;
      else if (inviteQuestion(box, "newton", INCLINE_QUESTIONS.filter((q) => q.stage <= st.reached))) questionCooldown = 3;
    }
    paintProfile(); paintStages();
    raf = requestAnimationFrame(frame);
    if (st.stage === 1 && !st.forces) setTimeout(() => say("אני לא זז. כנראה שסיימתי את הפיזיקה.", 2.6), 500);
    cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); closeInfo(); infoLive = () => ({}); document.querySelector(".sheet-back")?.remove(); saveSt(); };
  };

  // start
  paintSound();
  paintCoins();
  syncHud();
  window.eggPhysics = { open: openUI, reward, units: UNITS };
  // the inclined-plane situations (ramp-ui.js) build on the same shell, coins, meters and drawing helpers
  window.eggPhysics.kit = {
    G, P, SCREENS, $, esc, fmt, FONT, reduceMotion, clamp, show, back, setTitle, sheet, isSheetOpen, reward, forceArrow, paintCoins,
    activeSpecies, phys, nameOf, artOf, creatureImg, familyCoverage, overallCoverage, pct, rampState, done,
    onCleanup: (fn) => { cleanup = fn; }, closeInfo, icon, worldsState, elecState, elecCoverage
  };
})();
