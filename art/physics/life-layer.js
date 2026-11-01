// ======================================================================
//  The LIFE LAYER (living-worlds pack): every world scene becomes a place.
//  Three depths: a painted background (washed so the machine stays
//  readable) with one quiet motion; the machine (drawn by the scene);
//  and a companion in the margin that reacts to what the MODEL decided:
//  run start, goal reached, a miss, a hard impact. Decoration only: it
//  never writes mass, forces, time, results, coins or progress.
//  Data per scene (background, companion, reaction line) from LIFE_DATA,
//  keyed by domain + scene id ("mechanics:W03-S05", "electricity:W03-S05").
// ======================================================================
const LifeLayer = (() => {
  "use strict";
  const D = (typeof LIFE_DATA !== "undefined") ? LIFE_DATA : require("./life-data.js");
  const keyOf = (id) => (id[0] === "E" ? "electricity:" + id.slice(1) : "mechanics:" + id);
  const info = (id) => D.scenes[keyOf(id)] || null;
  // the floor line of each painting (fraction of its height), so the scene's ground can sit on it
  const FLOOR = { circus: 0.74, city: 0.8, factory: 0.72, lagoon: 0.62, mine: 0.78, snow: 0.72 };
  const WASH = { circus: 0.5, city: 0.36, factory: 0.48, lagoon: 0.42, mine: 0.4, snow: 0.38 };
  const GAG_GAP = 15000, LINE_GAP = 30000;   // a full gag at most every 15 s, a text line every 30 s

  const cache = {};
  function im(name) {
    if (typeof Image === "undefined") return null;
    if (!cache[name]) { const i = new Image(); i.src = "art/life/" + name + ".webp"; cache[name] = i; }
    const i = cache[name]; return i.complete && i.naturalWidth ? i : null;
  }
  function sprite(ctx, name, x, y, h, flip = false, rot = 0, alpha = 1) {
    const i = im(name); if (!i) return false;
    const w = h * i.naturalWidth / i.naturalHeight; ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1); if (alpha < 1) ctx.globalAlpha *= alpha;
    ctx.drawImage(i, -w / 2, -h, w, h); ctx.restore(); return true;
  }
  // companions that travel along the margin instead of sitting in the corner
  const MOVERS = { shark_happy: 1, crab: 1, robot_snail: 1, cart: 1 };

  function create(opts) {
    const I = opts.place || info(opts.id); if (!I) return null;   // place = { bg, companion, reaction } for screens outside the worlds
    const reduce = !!opts.reduceMotion;
    let t = 0, react = null, lastGag = -1e9, lastLine = -1e9, lastLineText = "", moverX = 0.15, moverDir = 1;
    const motes = [];
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < 26; i++) motes.push({ x: Math.random(), y: Math.random(), s: rnd(0.4, 1), p: Math.random() * 6 });

    function back(ctx, W, H, groundY, dt) {
      t += reduce ? 0 : dt;
      const bg = im("bg_" + I.bg);
      if (bg) {
        const bw = bg.naturalWidth, bh = bg.naturalHeight, s = Math.max(W / bw, H / bh) * 1.04;
        let oy = groundY - FLOOR[I.bg] * bh * s; oy = Math.min(0, Math.max(H - bh * s, oy));
        const ox = (W - bw * s) / 2 + (reduce ? 0 : Math.sin(t * 0.07) * W * 0.012);
        ctx.drawImage(bg, ox, oy, bw * s, bh * s);
        ctx.fillStyle = `rgba(255,253,248,${WASH[I.bg]})`; ctx.fillRect(0, 0, W, H);
      }
      if (reduce) return;
      // one quiet motion per place
      ctx.save();
      if (I.bg === "snow") { ctx.fillStyle = "rgba(255,255,255,0.9)"; for (const m of motes) { m.y += dt * 0.05 * (0.6 + m.s); if (m.y > 1) { m.y = 0; m.x = Math.random(); } ctx.beginPath(); ctx.arc((m.x + Math.sin(t + m.p) * 0.01) * W, m.y * H, 1.2 + m.s * 1.6, 0, Math.PI * 2); ctx.fill(); } }
      else if (I.bg === "lagoon") { ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.4; for (let i = 0; i < 9; i++) { const m = motes[i], y = groundY + 10 + m.y * Math.max(10, H - groundY - 14), x = ((m.x + t * 0.01 * m.s) % 1) * W; ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + m.p); ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.quadraticCurveTo(x, y - 3, x + 8, y); ctx.stroke(); } }
      else if (I.bg === "circus") { for (let i = 0; i < 12; i++) { const x = (i + 0.5) / 12 * W, y = H * 0.1 + Math.sin(i * 0.9) * H * 0.025; ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 3 + i * 1.7); ctx.fillStyle = "#FFD27A"; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill(); } }
      else if (I.bg === "factory") { const gx = W - 26, gy = 30; ctx.translate(gx, gy); ctx.rotate(t * 0.6); ctx.strokeStyle = "rgba(120,90,60,0.45)"; ctx.lineWidth = 4; ctx.beginPath(); for (let k = 0; k < 16; k++) { const r = k % 2 ? 14 : 18, a = k * Math.PI / 8; k ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.stroke(); }
      else if (I.bg === "mine") { for (const m of motes) { m.y -= dt * 0.015 * m.s; if (m.y < 0) { m.y = 1; m.x = Math.random(); } ctx.globalAlpha = 0.3 + 0.4 * Math.sin(t * 2 + m.p); ctx.fillStyle = m.p > 3 ? "#F6B94A" : "#B98CF5"; ctx.beginPath(); ctx.arc(m.x * W, m.y * H, 1.4 * m.s + 0.6, 0, Math.PI * 2); ctx.fill(); } }
      else if (I.bg === "city") { for (const m of motes) { if (m.y > 0.45) continue; ctx.globalAlpha = Math.max(0, Math.sin(t * 1.5 + m.p * 3)) * 0.9; ctx.fillStyle = "#FFF6C8"; ctx.beginPath(); ctx.arc(m.x * W, m.y * H, 1.2 + m.s, 0, Math.PI * 2); ctx.fill(); } }
      ctx.restore();
    }

    // the companion: corner perch, or a mover along the bottom margin
    function front(ctx, W, H, groundY) {
      const c = I.companion, now = performance.now();
      const r = react && now - react.t0 < react.dur ? react : null, q = r ? (now - r.t0) / r.dur : 0;
      const hop = r && r.kind === "success" ? -Math.abs(Math.sin(q * Math.PI * 3)) * 22 * (1 - q) : 0;
      const shake = r && r.kind === "miss" ? Math.sin(q * Math.PI * 6) * 0.22 * (1 - q) : 0;
      const jolt = r && (r.kind === "start" || r.kind === "impact") ? Math.sin(q * Math.PI) : 0;
      const breathe = reduce ? 0 : Math.sin(t * 2.2) * 1.5;
      const room = H - groundY;
      if (MOVERS[c] && room > 34) {
        if (!reduce) { moverX += moverDir * 0.012 * (r && r.kind === "impact" ? 6 : 1) * (1 / 60); if (moverX > 0.9) moverDir = -1; if (moverX < 0.1) moverDir = 1; }
        const h = Math.min(44, room - 4), y = Math.min(H - 2, groundY + h + 2);
        let name = c; if (c === "shark_happy" && r && r.kind === "impact") name = "shark_startled";
        sprite(ctx, name, moverX * W, y + hop * 0.5, h, moverDir < 0, shake);
        if (c === "shark_happy" && r && r.kind === "success") sprite(ctx, "life_ring", moverX * W, y - h * 0.7 + hop, h * 0.55);
        return;
      }
      // perch: top-left margin, under the info line
      const h = Math.min(58, Math.max(40, H * 0.13)), x = 14 + h * 0.45, y = 34 + h + breathe + hop;
      let name = c, rot = shake;
      if (c === "seagull_sleep" && (jolt > 0.05 || (r && r.kind !== "miss"))) name = "seagull_startled";
      if (MOVERS[c]) name = c;                       // no room below: the mover rests in the corner
      if (c === "wind_cloud" && !reduce) { ctx.save(); ctx.globalAlpha = 0.85; sprite(ctx, name, x + Math.sin(t * 0.3) * 10, y, h); ctx.restore(); }
      else if (c === "ghost" && !reduce) sprite(ctx, name, x, y + Math.sin(t * 1.6) * 5, h, false, rot, 0.92);
      else if (c === "glove" && jolt) sprite(ctx, name, x + jolt * 14, y, h, false, rot);
      else sprite(ctx, name, x, y, h, false, rot);
      if (c === "bulb") { const glow = r && r.kind === "success" ? 1 - q : 0.15 + 0.1 * Math.sin(t * 2); ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(x, y - h * 0.62, 2, x, y - h * 0.62, h * 0.9); g.addColorStop(0, `rgba(255,214,102,${0.65 * glow})`); g.addColorStop(1, "rgba(255,214,102,0)"); ctx.fillStyle = g; ctx.fillRect(x - h, y - h * 1.6, h * 2, h * 2); ctx.restore(); }
      if (c === "chest" && r && r.kind === "success") { ctx.save(); ctx.fillStyle = "#F2C94C"; ctx.strokeStyle = "#B8741A"; for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.4, d = q * h * 0.9; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y - h * 0.6 + Math.sin(a) * d, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } ctx.restore(); }
      if (c === "seagull_sleep" && !r && !reduce) { ctx.save(); ctx.font = "700 11px Rubik, system-ui"; ctx.fillStyle = "rgba(96,102,113,0.8)"; const z = (t * 0.5) % 1; ctx.globalAlpha = 1 - z; ctx.fillText("z", x + h * 0.35 + z * 8, y - h * 0.9 - z * 14); ctx.restore(); }
    }

    // events come only from the model: "start", "success", "miss", "impact"
    function event(kind) {
      const now = performance.now();
      if (kind === "success" || kind === "miss") { if (now - lastGag < GAG_GAP && kind === "miss") return; lastGag = now; }
      react = { kind, t0: now, dur: kind === "success" ? 1600 : kind === "miss" ? 1100 : 900 };
      if (kind === "miss" && I.reaction && I.reaction !== lastLineText && now - lastLine > LINE_GAP && opts.onSay) { lastLine = now; lastLineText = I.reaction; opts.onSay(I.reaction); }
    }
    return { info: I, back, front, event, sprite: (ctx, n, x, y, h, f, r, a) => sprite(ctx, n, x, y, h, f, r, a) };
  }
  // the incline chapter (18 situations) and the spring lab, from the pack's look plans
  const INCLINE_LOOK = (n) => [{ bg: "snow", companion: "seagull_sleep", reaction: "הרגליים ממשיכות צעד אחד אחרי העצירה" }, { bg: "lagoon", companion: "wind_cloud", reaction: "הדמות נמתחת כמסטיק" }, { bg: "lagoon", companion: "crab", reaction: "הדמות שולפת כרית קטנה" }][(n - 1) % 3];
  const SPRING_LOOK = { lab: "ghost", wall: "glove", launch: "cushion", graph: "seagull_sleep", pair: "crab", osc: "seagull_sleep", ramp: "glove" };
  const springPlace = (screen) => ({ bg: "circus", companion: SPRING_LOOK[screen] || "glove", reaction: "מבט ארוך אל השחקן: ״זה היה בכוונה?״" });
  return { create, info, keyOf, FLOOR, INCLINE_LOOK, springPlace };
})();
if (typeof module !== "undefined") module.exports = LifeLayer;
