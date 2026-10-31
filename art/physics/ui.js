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
  const UNITS = [
    { id: "springs.hooke", he: "חוק הוק", insight: "ככל שמותחים יותר, הקפיץ מושך חזרה חזק יותר, באותו יחס.", eq: "F = −k·s" },
    { id: "springs.energy", he: "אנרגיה אלסטית", insight: "מתיחה גדולה פי 2 אוגרת פי 4 אנרגיה, כי האנרגיה תלויה בריבוע המתיחה.", eq: "E = ½·k·s²" },
    { id: "springs.oscillation", he: "תנודות", insight: "קפיץ קשיח יותר מחזיר מהר יותר, ולכן התנודה מהירה יותר.", eq: "T = 2π·√(m/k)" },
    { id: "springs.shm", he: "תנועה הרמונית פשוטה", insight: "דמות כבדה יותר מתנודדת לאט יותר, וגודל המשיכה לא משנה את זמן המחזור.", eq: "T = 2π·√(m/k)" }
  ];
  const TOTAL_UNITS = TOPICS.reduce((n, t) => n + t.subtopics_he.length, 0);
  const done = () => P.data.physics.completed_subtopic_ids;
  const familyCoverage = (id) => id === "springs" ? UNITS.filter((u) => done().includes(u.id)).length / UNITS.length : 0;
  const overallCoverage = () => UNITS.filter((u) => done().includes(u.id)).length / TOTAL_UNITS;
  const pct = (x) => Math.round(x * 100) + "%";

  const QUESTIONS = [
    { id: "q.hooke.double", unit: "springs.hooke", q: "מותחים את הקפיץ פי 2 יותר. הכוח שהקפיץ מפעיל…", a: ["גדל פי 2", "גדל פי 4", "לא משתנה"], right: 0, why: "לפי חוק הוק הכוח יחסי למתיחה: F = k·s." },
    { id: "q.energy.double", unit: "springs.energy", q: "מותחים פי 2 יותר. האנרגיה האלסטית בקפיץ…", a: ["גדלה פי 2", "גדלה פי 4", "גדלה פי 8"], right: 1, why: "E = ½·k·s², ולכן מתיחה כפולה נותנת אנרגיה פי 4." },
    { id: "q.mass.four", unit: "springs.shm", q: "מחליפים לדמות כבדה פי 4, אותו קפיץ. זמן המחזור…", a: ["גדל פי 2", "גדל פי 4", "לא משתנה"], right: 0, why: "T = 2π·√(m/k): מסה פי 4 נותנת שורש של 4, כלומר פי 2." },
    { id: "q.amplitude", unit: "springs.shm", q: "מושכים את הדמות רחוק יותר לפני השחרור. זמן המחזור…", a: ["גדל", "קטן", "לא משתנה"], right: 2, why: "בקפיץ אידאלי זמן המחזור לא תלוי במשרעת, רק ב-m וב-k." },
    { id: "q.k.equilibrium", unit: "springs.hooke", q: "מגדילים את k פי 2. נקודת שיווי המשקל…", a: ["עולה: הקפיץ נמתח חצי", "יורדת: הקפיץ נמתח פי 2", "לא זזה"], right: 0, why: "בשיווי משקל k·s = m·g, ולכן s = mg/k קטן פי 2." },
    { id: "q.moon", unit: "springs.oscillation", q: "על הירח g קטן פי 6. זמן המחזור של הדמות על הקפיץ…", a: ["לא משתנה", "גדל", "קטן"], right: 0, why: "g משנה רק את נקודת שיווי המשקל. T = 2π·√(m/k) לא תלוי ב-g." }
  ];

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
    const tab = { mode: "physics", lever: "physics", card: "physics", lab: "physics", creatures: "creatures", creature: "creatures", map: "map" }[name];
    for (const b of document.querySelectorAll(".tabs button")) { if (b.dataset.tab === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); }
    SCREENS[name](args);
    paintCoins();
  }
  function back() {
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
          <div class="meter-label"><span>התקדמות כללית בפיזיקה</span><span class="ltr">${UNITS.filter((u) => done().includes(u.id)).length}/${TOTAL_UNITS}</span></div>
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

  SCREENS.card = ({ topic = "springs", ordered = false }) => {
    const t = TOPICS.find((x) => x.id === topic);
    setTitle("קפיצים ואלסטיות", ordered ? "לפי הסדר" : "");
    const sp = activeSpecies(), cov = familyCoverage(topic), n = UNITS.filter((u) => done().includes(u.id)).length;
    screenEl.innerHTML = `
      <div class="stack intro">
        <div class="scene">
          <div class="bubble">תמשוך אותי בעדינות… או שלא!</div>
          <svg viewBox="0 0 90 210"><path d="M10 6h70" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M45 6v14l-22 7 44 9-44 9 44 9-44 9 44 9-44 9 44 9-22 7v14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="45" cy="138" r="5" fill="none" stroke="#F49A35" stroke-width="2.6"/></svg>
          ${creatureImg(sp)}
        </div>
        <h2>${esc(t ? t.title_he : "קפיץ־קפוץ")}!</h2>
        ${ordered ? `<p class="path-line">המסלול: מכניקה ‹ ${esc(t.title_he)} ‹ שלב ${Math.min(n + 1, UNITS.length)} מתוך ${UNITS.length}</p>` : ""}
        <div class="card" style="text-align:right">
          <div class="meter-label"><span>ההתקדמות שלך בנושא</span><span class="ltr">${n}/${UNITS.length}</span></div>
          <div class="meter-row"><span class="meter violet"><i style="width:${Math.max(2, cov * 100)}%"></i></span><span class="pct">${pct(cov)}</span></div>
        </div>
        <button class="btn primary block" id="go" type="button">בוא ננסה</button>
      </div>`;
    $("#go").addEventListener("click", () => { G.sfx.pop(); show("lab", { topic }); });
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
          ${owned.length ? `<button class="btn secondary block" id="compare" type="button">השווה בניסוי הקפיץ</button>` : ""}
          ${isAct ? `<button class="btn secondary block" id="trade" type="button">החלף עם חבר</button>
             <p class="fine">החלפה ישירה עם טלפון קרוב: הדמות עוברת, המטבעות וההתקדמות נשארים אצלך.</p>` : ""}
          ${!owned.length ? `<p class="fine">הדמות הזאת עוד לא שלך. היא יכולה לצאת מביצה או להגיע בהחלפה עם חבר.</p>` : ""}
        </div>
      </div>`;
    const choose = () => { P.setActive(owned[0].instance_id); G.setCreature(sp); G.sfx.sparkle(3); };
    $("#choose")?.addEventListener("click", () => { choose(); show("creature", { sp }, false); });
    $("#compare")?.addEventListener("click", () => { if (!isAct) choose(); show("lab", { topic: "springs" }); });
    $("#trade")?.addEventListener("click", () => { closeUI(); setTimeout(() => G.openTrade(), 250); });
  };

  SCREENS.map = () => {
    setTitle("המפה", "כמה מהחומר כבר פגשת");
    const worlds = [];
    for (const t of TOPICS) { let w = worlds.find((x) => x.name === t.world_he); if (!w) worlds.push(w = { name: t.world_he, list: [] }); w.list.push(t); }
    const mast = P.data.physics.mastery, attempts = Object.values(mast).reduce((n, m) => n + m.attempts, 0), correct = Object.values(mast).reduce((n, m) => n + m.correct, 0);
    screenEl.innerHTML = `
      <div class="card">
        <div class="meter-label"><span>כיסוי לימודי בפיזיקה</span><span class="ltr">${UNITS.filter((u) => done().includes(u.id)).length}/${TOTAL_UNITS}</span></div>
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
  //  THE SPRING LAB
  // ======================================================================
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const L0 = 0.30;                      // natural length of the spring (m)
  const U_MAX = 0.25;                   // how far below equilibrium it can be pulled (m)
  const lab = { k: 120, massOverride: null, b: 0, lastU0: 0.12 };

  SCREENS.lab = () => {
    setTitle("קפיץ־קפוץ", "ניסוי: חוק הוק");
    let sp = activeSpecies();
    const m0 = () => phys(sp).mass_kg;
    const mass = () => lab.massOverride ?? m0();
    screenEl.innerHTML = `
      <div class="lab-screen">
        <div class="lab" id="lab">
          <canvas id="labCanvas"></canvas>
          <div class="bubble say" id="say" hidden></div>
          <div class="lab-tools">
            <button class="chip" id="charChip" type="button"></button>
            <button class="chip" id="formulaBtn" type="button">הצג נוסחה</button>
          </div>
        </div>
        <div class="readouts">
          <div class="readout"><small>התארכות</small><b id="rS">–</b></div>
          <div class="readout"><small>כוח קפיץ</small><b id="rF">–</b></div>
          <div class="readout"><small>אנרגיה</small><b id="rE">–</b></div>
          <div class="readout"><small>זמן מחזור</small><b id="rT">–</b></div>
        </div>
        <div class="card controls">
          <div class="slider-row"><label for="kIn"><span>קשיחות הקפיץ k</span><span class="val" id="kVal"></span></label>
            <input id="kIn" type="range" min="30" max="400" step="5"></div>
          <div class="slider-row"><label for="mIn"><span>מסה m <span class="note" id="mNote"></span></span><span class="val" id="mVal"></span></label>
            <input id="mIn" class="mass" type="range" min="0.5" max="4" step="0.1">
            <button class="linkish" id="mReset" type="button" hidden>חזרה למסת הדמות</button></div>
          <details class="adv" id="adv"><summary>מתקדם: בלימה b</summary>
            <div class="slider-row"><label for="bIn"><span>מקדם בלימה b</span><span class="val" id="bVal"></span></label>
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
    let trial = null, questionCooldown = 1, sheetOpen = false;

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
    mIn.addEventListener("input", () => { lab.massOverride = Math.abs(+mIn.value - m0()) < 0.05 ? null : +mIn.value; reconfigure(); });
    mIn.addEventListener("change", () => reconfigure("המסה השתנתה."));
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

    // ---- switching creature: same k, same pull below equilibrium, a fair comparison ----
    $("#charChip").addEventListener("click", () => {
      const owned = P.owned();
      const back = document.createElement("div");
      back.className = "sheet-back";
      back.innerHTML = `<div class="sheet" role="dialog" aria-label="החלפת דמות"><h3>להחליף דמות בניסוי</h3>
        <p>אותו קפיץ, אותה משיכה. רק המסה משתנה.</p>
        <div class="pick-list">${owned.map((c) => `<button type="button" data-id="${c.instance_id}" aria-pressed="${c.species === sp}">${creatureImg(c.species)}<span>${esc(nameOf(c.species))}</span><small>${fmt(phys(c.species).mass_kg, 1)} kg</small></button>`).join("")}</div>
        ${owned.length < 2 ? `<p class="fine" style="margin-top:12px">יש לך דמות אחת. דמות נוספת מגיעה מהחלפה עם חבר, ואז ההבדל בפיזיקה מתגלה כאן.</p>` : ""}
        <div class="actions"><button class="btn quiet" type="button" data-close>סגור</button></div></div>`;
      document.body.appendChild(back);
      back.addEventListener("click", (e) => { if (e.target === back || e.target.closest("[data-close]")) back.remove(); });
      for (const b of back.querySelectorAll("[data-id]")) b.addEventListener("click", () => {
        const c = owned.find((x) => x.instance_id === b.dataset.id); back.remove();
        if (!c || c.species === sp) return;
        const oldName = nameOf(sp), oldT = SP.period(sim.p);
        P.setActive(c.instance_id); G.setCreature(c.species);
        sp = c.species; lab.massOverride = null; mIn.value = m0(); loadImg();
        const u0 = Math.max(0.05, lab.lastU0);
        sim.reset(params(), u0); sim.release();
        trial = startRelease(u0);
        paintControls(); paintFormula();
        say(`עם ${nameOf(sp)} המסה אחרת, אז זמן המחזור משתנה: ${fmt(oldT)} ← ${fmt(SP.period(sim.p))} שנ׳ (${oldName} ← ${nameOf(sp)}).`, 5);
        G.sfx.whoosh();
      });
    });

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
    function creatureRect(s) {
      const h = phys(sp).height_m * scale, w = img.naturalWidth ? h * img.naturalWidth / img.naturalHeight : h;
      const cx = W * 0.58, y = hookY(s);
      return { x: cx - w / 2, y, w, h, cx };
    }

    // ---- dragging: hold the creature below equilibrium, let go to release ----
    function pointerPos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener("pointerdown", (e) => {
      if (sheetOpen) return;
      const p = pointerPos(e), r = creatureRect(sim.st.s);
      if (p.x < r.x - 30 || p.x > r.x + r.w + 30 || p.y < r.y - 40 || p.y > r.y + r.h + 30) return;
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
      trial.seen = true; releases.push(trial);
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
      const unit = UNITS.find((u) => u.id === ids[0]);
      const r = creatureRect(sim.st.s), cr = cv.getBoundingClientRect();
      ids.forEach((id, i) => setTimeout(() => reward("sub:" + id, 10, { x: cr.left + r.cx, y: cr.top + r.y + r.h / 2 }), i * 500));
      G.sfx.harp(); G.buzz(40);
      const fam = familyCoverage("springs"), all = overallCoverage();
      sheet(`
        <div class="gain"><span class="coin"></span> +${10 * ids.length}</div>
        <h3>גילית: ${esc(ids.map((id) => UNITS.find((u) => u.id === id).he).join(", "))}</h3>
        <p class="insight">${esc(unit.insight)}</p>
        <details><summary class="linkish">הצג נוסחה</summary><p class="m" style="font:600 20px 'Cambria Math','Times New Roman',serif;margin:8px 0">${esc(unit.eq)}</p></details>
        <div style="display:grid;gap:12px;margin-top:10px">
          <div><div class="meter-label"><span>קפיצים ואלסטיות</span><span class="ltr">${pct(fam)}</span></div><span class="meter violet"><i data-w="${fam}"></i></span></div>
          <div><div class="meter-label"><span>התקדמות כללית בפיזיקה</span><span class="ltr">${pct(all)}</span></div><span class="meter teal"><i data-w="${all}"></i></span></div>
        </div>
        <div class="actions"><button class="btn primary" type="button" data-close>להמשיך לשחק</button></div>`);
    }

    function maybeAsk() {
      if (questionCooldown > 0) { questionCooldown--; return; }
      const cov = familyCoverage("springs");
      const chance = cov < 0.25 ? 0.10 : cov < 0.5 ? 0.20 : cov < 0.75 ? 0.30 : 0.45;
      if (Math.random() > chance) return;
      questionCooldown = 3;
      const inv = document.createElement("div");
      inv.className = "card invite";
      inv.innerHTML = `<span>אתה כבר חוקר ותיק. בא לך שאלה קטנה?</span><span><button class="btn primary" style="min-height:40px;padding:0 14px;font-size:15px" type="button" data-yes>כן</button> <button class="btn quiet" type="button" data-no>לא עכשיו</button></span>`;
      box.appendChild(inv);
      const t = setTimeout(() => inv.remove(), 9000);
      inv.querySelector("[data-no]").addEventListener("click", () => { clearTimeout(t); inv.remove(); });
      inv.querySelector("[data-yes]").addEventListener("click", () => { clearTimeout(t); inv.remove(); askQuestion(); });
    }
    function askQuestion() {
      const hist = P.data.physics.question_history;
      const solved = new Set(hist.filter((h) => h.correct).map((h) => h.id));
      const pool = QUESTIONS.filter((q) => !solved.has(q.id) && (done().includes(q.unit) || q.unit === "springs.hooke"));
      const q = (pool.length ? pool : QUESTIONS)[Math.floor(Math.random() * (pool.length || QUESTIONS.length))];
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
        el.querySelector("[data-close]").textContent = "להמשיך";
        if (ok) { const r = b.getBoundingClientRect(); reward("q:" + q.id, 5, { x: r.left + r.width / 2, y: r.top }); G.sfx.sparkle(3); }
        else G.sfx.hmph(0.4);
      });
    }
    function sheet(html) {
      const back = document.createElement("div");
      back.className = "sheet-back";
      back.innerHTML = `<div class="sheet" role="dialog">${html}</div>`;
      document.body.appendChild(back);
      sheetOpen = true;
      const close = () => { back.remove(); sheetOpen = false; };
      back.addEventListener("click", (e) => { if (e.target === back || e.target.closest("[data-close]")) close(); });
      new MutationObserver((_, o) => { if (!back.isConnected) { sheetOpen = false; o.disconnect(); } }).observe(document.body, { childList: true });
      requestAnimationFrame(() => requestAnimationFrame(() => { for (const i of back.querySelectorAll("[data-w]")) i.style.width = Math.max(2, +i.dataset.w * 100) + "%"; }));
      return back.querySelector(".sheet");
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
      // the spring: always attached, coils stretch with s
      const coils = 12, top = TOP, bot = hookY(s) - 4, lead = 10, amp = 15;
      ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + lead);
      const span = Math.max(8, bot - top - 2 * lead);
      for (let i = 0; i <= coils * 2; i++) { const yy = top + lead + span * i / (coils * 2); ctx.lineTo(x + (i === 0 || i === coils * 2 ? 0 : (i % 2 ? amp : -amp)), yy); }
      ctx.lineTo(x, bot); ctx.stroke();
      ctx.globalAlpha = 0.3; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + 1, top);
      for (let i = 0; i <= coils * 2; i++) { const yy = top + lead + span * i / (coils * 2); ctx.lineTo(x + 1.2 + (i === 0 || i === coils * 2 ? 0 : (i % 2 ? amp : -amp)), yy + 1); }
      ctx.stroke(); ctx.globalAlpha = 1;
      // hook
      ctx.strokeStyle = "#F49A35"; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(x, bot + 4, 5, 0, Math.PI * 2); ctx.stroke();
      // current s on the ruler
      const yS = hookY(s);
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
        ctx.save(); ctx.translate(x, yS + 4); ctx.scale(2 - sq, sq);
        ctx.drawImage(img, -r.w / 2, 0, r.w, r.h); ctx.restore();
      }
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
      if (!sheetOpen) sim.advance(dt);
      const target = targetScale();
      scale += (target - scale) * Math.min(1, dt * 5);
      draw();
      if ((fpaint++ & 3) === 0) { paintReadouts(); if (formulaOpen) paintFormula(); }
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) $("#say").hidden = true; }
      observe();
      raf = requestAnimationFrame(frame);
    }
    scale = targetScale() || 300;
    raf = requestAnimationFrame(frame);
    say(nameOf(sp) + " תלוי על הקפיץ. גררו אותו למטה ושחררו.", 3.2);
    cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); document.querySelector(".sheet-back")?.remove(); };
  };

  // start
  paintSound();
  paintCoins();
  syncHud();
  window.eggPhysics = { open: openUI, reward, units: UNITS };
})();
