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
    { id: "springs.wall", he: "קפיץ על רצפה עם חיכוך", insight: "על רצפה עם חיכוך כל תנודה קטנה יותר, והדמות נעצרת איפה שהקפיץ כבר לא מנצח את החיכוך הסטטי.", eq: "נעצר כש-k·|x| ≤ μs·m·g" }
  ];
  const UNITS = SPRING_UNITS;
  const INCLINE_EQ = { 1: "ΣF = N − mg = 0", 2: "mg תמיד למטה · N ⟂ למשטח", 3: "mg·sinθ  ,  mg·cosθ", 4: "f_s ≤ μs·N", 5: "a = g·(sinθ − μk·cosθ)", 6: "a לא תלויה ב-m כש-μ זהה", 7: "ΣF = m·a" };
  const INCLINE_UNITS = SPR.inclineStages.map((st) => ({ id: "newton.s" + st.stage, stage: st.stage, he: st.title_he, insight: st.takeaway_he, eq: INCLINE_EQ[st.stage], coins: st.unique_reward_coins, task: st.interaction_he }));
  const FAMILY_UNITS = { springs: SPRING_UNITS, newton: INCLINE_UNITS };
  const FAMILY_TITLE = { springs: "קפיצים ואלסטיות", newton: "מי מושך אותי?!" };
  const TOTAL_UNITS = TOPICS.reduce((n, t) => n + (FAMILY_UNITS[t.id] ? FAMILY_UNITS[t.id].length : t.subtopics_he.length), 0);
  const done = () => P.data.physics.completed_subtopic_ids;
  const ALL_UNITS = Object.values(FAMILY_UNITS).flat();
  const doneUnits = () => ALL_UNITS.filter((u) => done().includes(u.id)).length;
  const familyCoverage = (id) => FAMILY_UNITS[id] ? FAMILY_UNITS[id].filter((u) => done().includes(u.id)).length / FAMILY_UNITS[id].length : 0;
  const overallCoverage = () => doneUnits() / TOTAL_UNITS;
  const pct = (x) => Math.round(x * 100) + "%";

  const QUESTIONS = [
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
    const tab = { mode: "physics", lever: "physics", card: "physics", lab: "physics", wall: "physics", incline: "physics", creatures: "creatures", creature: "creatures", map: "map" }[name];
    for (const b of document.querySelectorAll(".tabs button")) { if (b.dataset.tab === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); }
    SCREENS[name](args);
    paintCoins();
  }
  function back() {
    if (document.querySelector(".cloud")) { closeInfo(); return; }
    const sheet = document.querySelector(".sheet-back");
    if (sheet) { sheet.remove(); return; }
    if (stack.length) { const s = stack.pop(); show(s.name, s.args, false); }
    else closeUI();
  }
  function closeUI() {
    if (cleanup) { cleanup(); cleanup = null; }
    ui.hidden = true; G.covered = false; stack.length = 0; current = null;
    syncHud();
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
        <div class="card">
          <div class="meter-label"><span>התקדמות כללית בפיזיקה</span><span class="ltr">${doneUnits()}/${TOTAL_UNITS}</span></div>
          <div class="meter-row"><span class="meter teal"><i style="width:0"></i></span><span class="pct">${pct(overallCoverage())}</span></div>
        </div>
      </div>`;
    requestAnimationFrame(() => { const i = screenEl.querySelector(".meter i"); if (i) i.style.width = Math.max(2, overallCoverage() * 100) + "%"; });
    for (const b of screenEl.querySelectorAll(".mode-card")) b.addEventListener("click", () => {
      P.data.physics.path = b.dataset.path; P.save(); G.sfx.pop();
      if (b.dataset.path === "surprise") show("lever");
      else show("card", { topic: nextOrdered(), ordered: true });
    });
  };
  // the next topic that can actually be played, in the curriculum's order
  const nextOrdered = () => (TOPICS.find((t) => t.ready && familyCoverage(t.id) < 1) || TOPICS.find((t) => t.ready)).id;

  SCREENS.lever = () => {
    setTitle("מכונת הנושאים", "מושכים את הידית ומגלים נושא");
    const items = [];
    for (let r = 0; r < 4; r++) for (const t of TOPICS) items.push(t);
    const ITEM = 84;
    screenEl.innerHTML = `
      <div class="machine-wrap">
        <div class="machine">
          <div class="bolts"><span style="top:0;left:0"></span><span style="top:0;right:0"></span><span style="bottom:0;left:0"></span><span style="bottom:0;right:0"></span></div>
          <div class="reel-window"><div class="reel-mark"></div><div class="reel" id="reel">
            ${items.map((t) => `<div class="reel-item">${icon(ICON_OF[t.id], t.ready ? "#F49A35" : "#B9BCC2")}<div><b>${esc(t.title_he)}</b><small>${esc(t.world_he)}${t.ready ? "" : " · בפיתוח"}</small></div></div>`).join("")}
          </div></div>
        </div>
        <div class="lever" id="lever" aria-label="ידית: משכו למטה">
          <div class="track"></div>
          <svg class="hint" viewBox="0 0 24 60"><path d="M12 4v46M5 42l7 9 7-9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <div class="knob" id="knob" role="button" tabindex="0" aria-label="למשוך את הידית"></div>
        </div>
      </div>
      <div style="text-align:center;margin-top:14px"><button class="btn quiet" id="giveMe" type="button">תן לי משהו</button></div>
      <div id="result"></div>`;
    const reel = $("#reel"), knob = $("#knob");
    let pos = TOPICS.length * 1 + Math.floor(Math.random() * TOPICS.length), spinning = false, drag = null, pulled = 0;
    const place = (i, anim) => { reel.style.transition = anim ? `transform ${anim}s cubic-bezier(.12,.67,.18,1)` : "none"; reel.style.transform = `translateY(${-(i * ITEM) + ITEM}px)`; };
    place(pos, 0);
    function spin() {
      if (spinning) return;
      spinning = true;
      $("#result").innerHTML = "";
      // only topics that really exist can come out; the choice is made first, the reel just shows it
      const ready = TOPICS.filter((t) => t.ready);
      const pick = ready[Math.floor(Math.random() * ready.length)];
      const idx = TOPICS.indexOf(pick) + TOPICS.length * 3;
      place((pos % TOPICS.length) + TOPICS.length, 0);
      void reel.offsetWidth;
      pos = idx;
      const dur = reduceMotion ? 0.01 : 1.35;
      place(pos, dur);
      G.sfx.whoosh();
      let ticks = 0;
      const ticker = reduceMotion ? null : setInterval(() => { if (++ticks < 9) G.sfx.tick(); }, 120);
      setTimeout(() => {
        clearInterval(ticker); spinning = false;
        G.sfx.boing(0.5); G.buzz(25);
        $("#result").innerHTML = `<div class="result show card">${icon(ICON_OF[pick.id], "#F49A35").replace("<svg", '<svg style="width:64px;height:64px;color:#3a3a40"')}
          <h2>${esc(pick.title_he)}</h2><p>${esc(pick.world_he)} · ${pick.subtopics_he.map(esc).join(" · ")}</p>
          <button class="btn primary block" id="play" type="button">בוא נשחק</button></div>`;
        $("#play").addEventListener("click", () => show("card", { topic: pick.id }));
        $("#result").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
      }, dur * 1000 + 80);
    }
    // the lever: drag it down at least 70 px (of 110) and let go
    const setKnob = (d, anim) => { knob.style.transition = anim ? "transform 0.45s cubic-bezier(.3,1.6,.5,1)" : "none"; knob.style.transform = `translateY(${d}px)`; };
    knob.addEventListener("pointerdown", (e) => { if (spinning) return; drag = { y: e.clientY }; pulled = 0; knob.setPointerCapture(e.pointerId); G.audio.unlock(); });
    knob.addEventListener("pointermove", (e) => { if (!drag) return; pulled = clamp(e.clientY - drag.y, 0, 110); setKnob(pulled); });
    const up = () => { if (!drag) return; drag = null; const go = pulled >= 70; setKnob(0, true); if (go) spin(); };
    knob.addEventListener("pointerup", up); knob.addEventListener("pointercancel", up);
    knob.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setKnob(90); setTimeout(() => { setKnob(0, true); spin(); }, 150); } });
    $("#giveMe").addEventListener("click", () => { G.audio.unlock(); setKnob(90); setTimeout(() => { setKnob(0, true); spin(); }, 120); });
  };

  const GAMES = {
    springs: { title: "קפיצים ואלסטיות", name: "קפיץ־קפוץ", bubble: "תמשוך אותי בעדינות… או שלא!", screen: "lab",
      art: `<svg viewBox="0 0 90 210"><path d="M10 6h70" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M45 6v14l-22 7 44 9-44 9 44 9-44 9 44 9-44 9 44 9-22 7v14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="45" cy="138" r="5" fill="none" stroke="#F49A35" stroke-width="2.6"/></svg>` },
    newton: { title: "מישור משופע, כוחות וחיכוך", name: "מי מושך אותי?!", bubble: "אני רק יושב פה. מה כבר יכול לקרות?", screen: "incline",
      art: `<svg viewBox="0 0 90 210"><path d="M4 200h82" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M8 196L84 120v76z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M28 196a20 20 0 0 0-4-12" fill="none" stroke="#F49A35" stroke-width="2.4"/><circle cx="84" cy="120" r="6" fill="#F49A35" stroke="currentColor" stroke-width="2"/></svg>` }
  };
  SCREENS.card = ({ topic = "springs", ordered = false }) => {
    const t = TOPICS.find((x) => x.id === topic), g = GAMES[topic] || GAMES.springs, units = FAMILY_UNITS[topic] || SPRING_UNITS;
    setTitle(g.title, ordered ? "לפי הסדר" : t ? t.world_he : "");
    const sp = activeSpecies(), cov = familyCoverage(topic), n = units.filter((u) => done().includes(u.id)).length;
    screenEl.innerHTML = `
      <div class="stack intro">
        <div class="scene">
          <div class="bubble">${esc(g.bubble)}</div>
          ${g.art}
          ${creatureImg(sp)}
        </div>
        <h2>${esc(g.name)}${g.name.endsWith("!") ? "" : "!"}</h2>
        ${ordered ? `<p class="path-line">המסלול: ${esc(t.world_he)} ‹ ${esc(t.title_he)} ‹ שלב ${Math.min(n + 1, units.length)} מתוך ${units.length}</p>` : ""}
        <div class="card" style="text-align:right">
          <div class="meter-label"><span>ההתקדמות שלך בנושא</span><span class="ltr">${n}/${units.length}</span></div>
          <div class="meter-row"><span class="meter violet"><i style="width:${Math.max(2, cov * 100)}%"></i></span><span class="pct">${pct(cov)}</span></div>
        </div>
        <button class="btn primary block" id="go" type="button">בוא ננסה</button>
      </div>`;
    $("#go").addEventListener("click", () => { G.sfx.pop(); show(g.screen, { topic }); });
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
        <div class="meter-label"><span>כיסוי לימודי בפיזיקה</span><span class="ltr">${doneUnits()}/${TOTAL_UNITS}</span></div>
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
  const modeSeg = (m) => `<div class="seg" role="group" aria-label="סוג הקפיץ"><button type="button" data-m="hang" aria-pressed="${m === "hang"}">קפיץ תלוי</button><button type="button" data-m="wall" aria-pressed="${m === "wall"}">קפיץ מהקיר</button></div>`;
  function bindModeSeg(args) {
    for (const b of screenEl.querySelectorAll(".seg [data-m]")) b.addEventListener("click", () => {
      if (b.getAttribute("aria-pressed") === "true") return;
      lab.mode = b.dataset.m; G.sfx.pop();
      show(lab.mode === "wall" ? "wall" : "lab", args, false);
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
  const infoBtn = (key) => `<button class="info" type="button" data-info="${key}" aria-label="מה זה?">?</button>`;
  let infoOpenedAt = 0;
  function closeInfo() { document.querySelector(".cloud")?.remove(); }
  function openInfo(key, anchor) {
    const I = INFO[key]; if (!I) return;
    closeInfo();
    let live = ""; try { live = I.live ? I.live(infoLive()) || "" : ""; } catch (e) {}
    const el = document.createElement("div");
    el.className = "cloud"; el.setAttribute("role", "dialog"); el.dir = "rtl";
    el.innerHTML = `<button class="x" type="button" aria-label="סגור">×</button><h4>${esc(I.t)}</h4><p>${esc(I.p)}</p>
      <div class="eqs">${I.eq.map((e) => `<div>${esc(e)}</div>`).join("")}</div>${live ? `<div class="live">${esc(live)}</div>` : ""}`;
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
      ctx.fillStyle = "#606671"; ctx.font = "600 11px " + FONT; ctx.direction = "ltr"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText("k = " + k, Math.abs(ux) > 0.5 ? x0 + ux * (lead + span * 0.5) - 20 : x0 + look.amp + 10, Math.abs(ux) > 0.5 ? y0 - look.amp - 10 : y0 + lead + span * 0.18);
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
  //  THE SPRING LAB
  // ======================================================================
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const L0 = 0.30;                      // natural length of the spring (m)
  const U_MAX = 0.25;                   // how far below equilibrium it can be pulled (m)
  const lab = { k: 120, massOverride: null, b: 0, lastU0: 0.12, mode: "hang", surface: "dry_wood" };

  SCREENS.lab = (args = {}) => {
    if (lab.mode === "wall") return SCREENS.wall(args);
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
          <details class="adv" id="adv"><summary>מתקדם: בלימה b</summary>
            <div class="slider-row"><label for="bIn"><span>מקדם בלימה b ${infoBtn("b")}</span><span class="val" id="bVal"></span></label>
              <input id="bIn" class="damp" type="range" min="0" max="3" step="0.1"></div>
            <p class="fine">עם בלימה התנודה דועכת, וזמן המחזור כבר לא בדיוק 2π√(m/k).</p>
          </details>
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
      const before = { eq: SP.equilibrium(sim.p), T: SP.period(sim.p) };
      sim.reset(params(), 0);
      trial = null;
      const after = { eq: SP.equilibrium(sim.p), T: SP.period(sim.p) };
      if (why) say(`${why} שיווי המשקל: ${fmt(before.eq * 100, 1)} ← ${fmt(after.eq * 100, 1)} ס״מ. T: ${fmt(before.T)} ← ${fmt(after.T)} שנ׳.`, 4);
      paintControls(); paintFormula();
    }
    kIn.addEventListener("input", () => { lab.k = +kIn.value; reconfigure(); });
    kIn.addEventListener("change", () => reconfigure("הקפיץ הוחלף."));
    mIn.addEventListener("input", () => { keeper.touched(); lab.massOverride = Math.abs(+mIn.value - m0()) < 0.05 ? null : +mIn.value; reconfigure(); });
    mIn.addEventListener("change", () => {
      reconfigure();
      if (lab.massOverride !== null) say(`${FEEL(mass() / m0())} שיווי המשקל עכשיו ${fmt(SP.equilibrium(sim.p) * 100, 1)} ס״מ, T = ${fmt(SP.period(sim.p))} שנ׳. מהר, נסו לפני שאני חוזר לעצמי!`, 4);
    });
    bIn.addEventListener("input", () => { lab.b = +bIn.value; reconfigure(); });
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
      $("#formula").innerHTML = `
        <div class="eq"><span>כוח הקפיץ (חוק הוק)</span><span class="m">F = −k·s<em>${fmt(-p.k * s, 1)} N</em></span></div>
        <div class="eq"><span>אנרגיה אלסטית</span><span class="m">E = ½·k·s²<em>${fmt(SP.elasticEnergy(s, p.k), 2)} J</em></span></div>
        <div class="eq"><span>שיווי משקל</span><span class="m">s<sub>eq</sub> = m·g / k<em>${fmt(eq * 100, 1)} cm</em></span></div>
        <div class="eq"><span>זמן מחזור (בלי בלימה)</span><span class="m">T = 2π·√(m/k)<em>${fmt(SP.period(p))} s</em></span></div>
        <p class="fine">s היא ההתארכות מהאורך הטבעי של הקפיץ. כוח חיובי פירושו כלפי מטה, ולכן כשהקפיץ מתוח F שלילי: הוא מושך למעלה.</p>`;
    }
    paintControls();
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
      dragging = { dy: p.y - hookY(sim.st.s) };
      cv.setPointerCapture(e.pointerId);
      sim.hold(sim.u);
      trial = null;
      if (!everDragged) { everDragged = true; if (P.achieve("first_drag")) reward("ach:first_drag", 3, { x: e.clientX, y: e.clientY }); }
      say(DRAG_LINES[Math.floor(Math.random() * DRAG_LINES.length)], 2);
    });
    cv.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const p = pointerPos(e);
      const eqY = hookY(SP.equilibrium(sim.p));
      const u = clamp((p.y - dragging.dy - eqY) / scale, 0, U_MAX);
      sim.hold(u);
    });
    const letGo = () => {
      if (!dragging) return;
      dragging = null;
      const u0 = sim.u;
      if (u0 < 0.02) { sim.reset(sim.p, 0); return; }        // too small: it just settles
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
    const pool = () => QUESTIONS.filter((q) => q.unit !== "springs.wall" && (done().includes(q.unit) || q.unit === "springs.hooke"));
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
      ctx.clearRect(0, 0, W, H);
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
      // first time: show where to pull
      if (!everDragged && !reduceMotion) {
        const k = (performance.now() / 900) % 1;
        ctx.globalAlpha = Math.sin(k * Math.PI); ctx.strokeStyle = "#258EF6"; ctx.lineWidth = 3;
        const ax = x - r.w / 2 - 18, ay = yS + r.h * 0.35 + k * 26;
        ctx.beginPath(); ctx.moveTo(ax, ay - 22); ctx.lineTo(ax, ay); ctx.moveTo(ax - 7, ay - 8); ctx.lineTo(ax, ay); ctx.lineTo(ax + 7, ay - 8); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = "#1A74D0"; ctx.font = "600 13px " + FONT;
        ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.fillText("גררו למטה", ax, yS + r.h * 0.35 + 50); ctx.direction = "ltr";
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
    cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); closeInfo(); infoLive = () => ({}); document.querySelector(".sheet-back")?.remove(); };
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
      $("#formula").innerHTML = `
        <div class="eq"><span>כוח הקפיץ</span><span class="m">F = −k·x<em>${fmt(-p.k * x, 1)} N</em></span></div>
        <div class="eq"><span>חיכוך קינטי (בזמן תנועה)</span><span class="m">f<sub>k</sub> = μk·m·g<em>${fmt(p.muk * p.m * p.g, 2)} N</em></span></div>
        <div class="eq"><span>נשאר תקוע אם</span><span class="m">|x| ≤ μs·m·g / k<em>${fmt(SP.stickZone(p) * 100, 1)} cm</em></span></div>
        <div class="eq"><span>כל חצי תנודה מאבדת</span><span class="m">Δx = 2·μk·m·g / k<em>${fmt(SP.halfSwingLoss(p) * 100, 1)} cm</em></span></div>
        <div class="eq"><span>זמן מחזור</span><span class="m">T = 2π·√(m/k)<em>${fmt(2 * Math.PI * Math.sqrt(p.m / p.k))} s</em></span></div>
        <p class="fine">החיכוך לא משנה את קצב התנודה, רק מקטין אותה בכל חצי תנודה עד שהיא נעצרת.</p>`;
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

    function arrow(x0, y0, dx, dy, color, label, below) {
      const len = Math.hypot(dx, dy); if (len < 3) return;
      const ux = dx / len, uy = dy / len, x1 = x0 + dx, y1 = y0 + dy;
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * 8, y1 - uy * 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * 12 - uy * 6, y1 - uy * 12 + ux * 6); ctx.lineTo(x1 - ux * 12 + uy * 6, y1 - uy * 12 - ux * 6); ctx.closePath(); ctx.fill();
      ctx.font = "700 13px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, x1 + ux * 16, y1 + (below ? 14 : -12));
    }
    function draw() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
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
      const F = -p.k * x, kpx = 2.4;
      if (Math.abs(F) > 0.05) arrow(b.mid, sy, clamp(-F * kpx, -150, 150), 0, "#2785C7", "F");   // + x is away from the wall = left on screen
      let f = 0;
      if (sim.st.moving) f = -Math.sign(sim.st.v) * p.muk * p.m * p.g;           // + means away from the wall
      else if (!sim.held && Math.abs(F) > 0.01) f = -F;                          // static: exactly what is needed
      if (Math.abs(f) > 0.05) arrow(b.mid, g.floorY - 6, clamp(-f * kpx, -150, 150), 0, "#CC5794", sim.st.moving ? "f_k" : "f_s", true);
      // first time: show where to pull
      if (!everDragged && !reduceMotion) {
        const k = (performance.now() / 900) % 1;
        ctx.globalAlpha = Math.sin(k * Math.PI); ctx.strokeStyle = "#258EF6"; ctx.lineWidth = 3;
        const ax = b.left - 14 - k * 24, ay = g.floorY - g.h * scale * 0.6;
        ctx.beginPath(); ctx.moveTo(ax + 22, ay); ctx.lineTo(ax, ay); ctx.moveTo(ax + 8, ay - 7); ctx.lineTo(ax, ay); ctx.lineTo(ax + 8, ay + 7); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = "#1A74D0"; ctx.font = "600 13px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("גררו הצידה", b.mid, b.top - 16); ctx.direction = "ltr";
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
    function arrow(x0, y0, vx, vy, color, label, opts = {}) {
      const len = Math.hypot(vx, vy); if (len < 2) return;
      const ux = vx / len, uy = vy / len, x1 = x0 + vx, y1 = y0 + vy;
      ctx.save();
      ctx.globalAlpha = opts.alpha ?? 1;
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = opts.thin ? 2 : 3.4;
      if (opts.dash) ctx.setLineDash([7, 6]);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * 9, y1 - uy * 9); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * 13 - uy * 6.5, y1 - uy * 13 + ux * 6.5); ctx.lineTo(x1 - ux * 13 + uy * 6.5, y1 - uy * 13 - ux * 6.5); ctx.closePath(); ctx.fill();
      if (label) {
        ctx.font = "700 14px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.direction = "ltr";
        const lx = x1 + ux * 18 + (opts.side || 0) * uy * 14, ly = y1 + uy * 18 - (opts.side || 0) * ux * 14;
        ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.strokeText(label, lx, ly); ctx.fillText(label, lx, ly);
      }
      ctx.restore();
    }
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
        arrow(c.x, c.y, 0, f.W * k, COLORS.g, "mg", { dash: !real, thin: !real });
        arrow(c.x, c.y, -g.s * f.N * k, -g.c * f.N * k, COLORS.N, "N", { alpha: real ? 1 : 0.3, side: -1 });
        if (f.f > 0.01) arrow(c.x, c.y, g.c * f.f * k, -g.s * f.f * k, COLORS.f, f.holds ? "f_s" : "f_k", { alpha: real ? 1 : 0.3, side: 1 });
        if (!real) {
          arrow(c.x, c.y, -g.c * f.par * k, g.s * f.par * k, COLORS.par, "mg sinθ", { side: 1 });
          arrow(c.x, c.y, g.s * f.perp * k, g.c * f.perp * k, COLORS.perp, "mg cosθ", { side: -1 });
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
      $("#formula").innerHTML = `
        <div class="eq"><span>כוח הכובד (תמיד אנכי)</span><span class="m">W = m·g<em>${fmt(f.W, 1)} N</em></span></div>
        <div class="eq"><span>נורמל</span><span class="m">N = mg·cosθ<em>${fmt(f.N, 1)} N</em></span></div>
        <div class="eq"><span>רכיב במורד המדרון</span><span class="m">mg·sinθ<em>${fmt(f.par, 1)} N</em></span></div>
        <div class="eq"><span>חיכוך סטטי (עד מקסימום)</span><span class="m">f<sub>s</sub> ≤ μs·N<em>${fmt(f.fsMax, 1)} N</em></span></div>
        <div class="eq"><span>חיכוך קינטי</span><span class="m">f<sub>k</sub> = μk·N<em>${fmt(f.fk, 1)} N</em></span></div>
        <div class="eq"><span>תאוצה בהחלקה</span><span class="m">a = g(sinθ − μk·cosθ)<em>${fmt(9.81 * (Math.sin(f.thetaRad) - p.muk * Math.cos(f.thetaRad)), 2)} m/s²</em></span></div>
        <div class="eq"><span>זווית הסף</span><span class="m">tanθ = μs<em>${fmt(f.criticalDeg, 1)}°</em></span></div>
        <p class="fine">הנורמל אינו "תגובה" לכוח הכובד: שניהם פועלים על אותו גוף. בתמונת הרכיבים אין כוחות חדשים, רק פירוק של mg.</p>`;
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
})();
