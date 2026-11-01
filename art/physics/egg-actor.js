// ======================================================================
//  The EGG as the body in falls, drops and crashes (worlds machines).
//  The creature stays in the other machines; where something falls, lands
//  or hits hard, the egg takes its place. The gag is a drawing layer only:
//  position, time and every number still come from the simulator.
//
//  How hard the landing was decides the gag (cartoon, never hurt for good):
//    soft   (impact < 9 m/s)         a small squash and a wince
//    squash (9 … 19 m/s)             pancake, lying dizzy with stars, back up
//    fold   (heavy g ≥ 13, not crash) accordion folds, offended look
//    crash  (≥ 19 m/s, or a crash event) the shell bursts into pieces,
//            "קְרַאש!", the pieces fly back, a band-aid, and it stands again
//  Pure logic (severity) is testable in node; drawing needs a canvas.
// ======================================================================
const EggActor = (() => {
  "use strict";
  const T_SOFT = 9, T_CRASH = 19, G_HEAVY = 13;
  // the sizes of a hard stop (cushion, wall): deceleration in m/s²
  const A_SOFT = 25, A_CRASH = 60;
  function severity(vImpact, g = 10) {
    const v = Math.abs(vImpact || 0);
    if (v >= T_CRASH) return "crash";
    if (g >= G_HEAVY && v >= 3) return "fold";
    if (v >= T_SOFT) return "squash";
    return "soft";
  }
  const severityStop = (decel) => (Math.abs(decel) >= A_CRASH ? "crash" : Math.abs(decel) >= A_SOFT ? "squash" : "soft");
  const DUR = { soft: 0.9, squash: 2.1, fold: 1.8, crash: 3.4 };
  const LINES = {
    soft: ["אוף. בקושי הרגשתי.", "נחיתה רכה. כמעט.", "זה היה מתוכנן."],
    squash: ["אני בסדר. בערך גאומטרי.", "הכול בשליטה. רק הצורה השתנתה.", "אפשר בבקשה ניסוי עם כרית?", "פה אני מכיר את הרצפה."],
    fold: ["הכבידה לקחה את זה אישית.", "אני אקורדיון עכשיו. תנגנו בי.", "קצת כבד פה, לא?"],
    crash: ["רגע… יש אפשרות להתחרט?", "מבקש צל. וגם עורך דין.", "סתם! אני שלם. כמעט.", "זה היה צריך להיות ניסוי מחשבתי."]
  };

  // ---------------- drawing ----------------
  const POSES = ["oh", "scream", "flail1", "flail2", "flail3", "flail4", "wince", "lying", "crack1", "crack3", "crack5", "worry1", "nervous"];
  let img = null;
  function images() {
    if (img || typeof Image === "undefined") return img;
    img = {};
    for (const k of POSES) { const i = new Image(); i.src = "art/pose_" + k + ".webp"; img[k] = i; }
    return img;
  }
  const meta = (k) => (typeof SPR !== "undefined" && SPR.poses && SPR.poses[k]) || null;
  // feet of the pose at (0,0), body height hpx (the pose's own drawn height)
  function pose(ctx, k, hpx) {
    const im = images()[k], m = meta(k);
    if (!(im && im.complete && im.naturalWidth)) { ctx.fillStyle = "#FBF8F1"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -hpx * 0.5, hpx * 0.36, hpx * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); return; }
    const hgt = m ? (m.hgt || m.h * 0.8) : im.naturalHeight, s = hpx / hgt, ax = m ? m.ax : im.naturalWidth / 2, ay = m ? m.ay : im.naturalHeight;
    ctx.drawImage(im, -ax * s, -ay * s, im.naturalWidth * s, im.naturalHeight * s);
  }
  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

  function create(opts = {}) {
    const reduce = !!opts.reduceMotion;
    let mode = "idle", t0 = 0, sev = "soft", run = null, shards = null, lastLine = -1e9, lineI = 0, airT = 0;
    const A = {
      get mode() { return mode; },
      get severity() { return sev; },
      reset() { mode = "idle"; run = null; shards = null; },
      busy(now) { return mode === "impact" && (now - t0) / 1000 < DUR[sev]; },
      // call every frame: runId changes on every new run; landed/impact when the sim says so
      update(now, info) {
        if (info.runId !== run) { run = info.runId; mode = info.runId ? "air" : "idle"; shards = null; airT = now; }
        if (mode === "air" && info.impact) {
          sev = info.sev || severity(info.vImpact, info.g); mode = "impact"; t0 = now;
          if (sev === "crash") shards = makeShards();
          let line = null; if (now - lastLine > 7000) { const L = LINES[sev]; line = L[lineI++ % L.length]; lastLine = now; }
          opts.onImpact && opts.onImpact(sev, line);
        }
      },
      // feet at (px, py); hpx the body height; air = {vy (m/s, up +), g}; rot for tracks
      draw(ctx, px, py, hpx, now, air = {}, rot = 0) {
        ctx.save(); ctx.translate(px, py); if (rot) ctx.rotate(rot);
        if (mode === "impact") drawImpact(ctx, hpx, (now - t0) / 1000);
        else if (mode === "air") {
          const vy = air.vy || 0, g = air.g || 10, t = (now - airT) / 1000;
          let k = vy < -T_CRASH * 0.8 ? "scream" : vy < -4 ? "nervous" : vy > 3 ? "oh" : "flail" + (1 + (Math.floor(t * 9) % 4));
          if (g <= 3 && Math.abs(vy) < 6) k = "flail" + (1 + (Math.floor(t * 5) % 4)); // low gravity: swimming in the air
          if (air.standing) k = "worry1";
          const wob = reduce ? 0 : Math.sin(t * 14) * (Math.abs(vy) > 8 ? 0.08 : 0.03);
          ctx.rotate(wob); pose(ctx, k, hpx);
        } else pose(ctx, air.nervous ? "nervous" : "crack1", hpx);
        ctx.restore();
      }
    };

    function makeShards() {
      const out = [];
      for (let i = 0; i < 11; i++) {
        const a = -Math.PI * (0.08 + 0.84 * (i / 10)) + (Math.random() - 0.5) * 0.3, sp = 120 + Math.random() * 170;
        const pts = []; const n = 3 + (i % 3); for (let j = 0; j < n; j++) { const b = j / n * Math.PI * 2 + Math.random() * 0.6; pts.push([Math.cos(b) * (0.5 + Math.random() * 0.5), Math.sin(b) * (0.5 + Math.random() * 0.5)]); }
        out.push({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * 6, w: (Math.random() - 0.5) * 14, size: 0.12 + Math.random() * 0.1, pts, oy: -0.2 - Math.random() * 0.6 });
      }
      return out;
    }
    function shardDraw(ctx, sh, hpx, x, y, rot) {
      const r = sh.size * hpx; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
      sh.pts.forEach(([a, b], i) => (i ? ctx.lineTo(a * r, b * r) : ctx.moveTo(a * r, b * r))); ctx.closePath();
      ctx.fillStyle = "#FBF8F1"; ctx.fill(); ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = "rgba(46,46,51,0.35)"; ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.1, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    function stars(ctx, hpx, t, n = 3) {
      ctx.save(); ctx.fillStyle = "#E39B28"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 1.2;
      for (let i = 0; i < n; i++) { const a = t * 4 + i * Math.PI * 2 / n, x = Math.cos(a) * hpx * 0.42, y = -hpx * 0.62 + Math.sin(a) * hpx * 0.1;
        ctx.beginPath(); for (let j = 0; j < 10; j++) { const rr = j % 2 ? 3 : 7, b = j * Math.PI / 5 - Math.PI / 2; j ? ctx.lineTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr) : ctx.moveTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
    function word(ctx, text, hpx, t, color = "#E2574C") {
      const s = reduce ? 1 : Math.min(1, t * 6) * (1 + 0.15 * Math.sin(t * 20) * Math.max(0, 1 - t * 2));
      ctx.save(); ctx.translate(0, -hpx * 1.35); ctx.scale(s, s); ctx.rotate(-0.08); ctx.font = "900 " + Math.round(Math.max(20, hpx * 0.42)) + "px Rubik, system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.direction = "rtl"; ctx.lineJoin = "round"; ctx.lineWidth = 5; ctx.strokeStyle = "#fff"; ctx.strokeText(text, 0, 0); ctx.fillStyle = color; ctx.fillText(text, 0, 0); ctx.restore();
    }
    function bandAid(ctx, hpx) {
      ctx.save(); ctx.translate(hpx * 0.1, -hpx * 0.78); ctx.rotate(-0.5); const w = hpx * 0.34, h = hpx * 0.1;
      ctx.fillStyle = "#F3D2A8"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -h / 2, w, h, h / 2) : ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#E8BC8A"; ctx.fillRect(-w * 0.14, -h / 2, w * 0.28, h); ctx.restore();
    }
    function drawImpact(ctx, hpx, t) {
      const p = t / DUR[sev];
      if (reduce) { // same information, no squash, no flying pieces
        const k = sev === "crash" ? (p < 0.5 ? "crack5" : "crack3") : sev === "soft" ? "wince" : p < 0.6 ? "lying" : "crack1";
        pose(ctx, k, hpx); if (sev === "crash" && p < 0.5) word(ctx, "קְרַאש!", hpx, 1); if (sev === "crash" && p >= 0.5) bandAid(ctx, hpx); return;
      }
      if (sev === "soft") {
        const sy = 1 - 0.28 * Math.exp(-6 * t) * Math.cos(t * 16); ctx.scale(1 / Math.sqrt(sy), sy); pose(ctx, t < 0.55 ? "wince" : "crack1", hpx); return;
      }
      if (sev === "squash") {
        if (t < 0.12) { const q = t / 0.12, sy = 1 - 0.82 * q; ctx.scale(Math.min(2.6, 1 / Math.sqrt(sy)), sy); pose(ctx, "wince", hpx); return; }
        if (t < 0.5) { const sy = 0.18, sx = 2.4; ctx.scale(sx, sy); pose(ctx, "wince", hpx); return; }   // pancake
        if (t < 1.55) { pose(ctx, "lying", hpx * 0.86); stars(ctx, hpx * 0.86, t); return; }               // dizzy on the floor
        const q = (t - 1.55) / 0.55, sy = 1 + 0.22 * Math.sin(q * Math.PI * 2) * (1 - q); ctx.scale(1 / Math.sqrt(sy), sy); pose(ctx, "worry1", hpx); return; // back up, a small boing
      }
      if (sev === "fold") {
        const q = Math.min(1, t / 1.6), sy = 0.45 + 0.55 * ease(q) + Math.sin(q * 22) * 0.1 * (1 - q); ctx.scale(1.15 - 0.15 * q, sy); pose(ctx, "wince", hpx);
        ctx.strokeStyle = "rgba(46,46,51,0.7)"; ctx.lineWidth = 2 / sy; for (let i = 0; i < 4 * (1 - q); i++) { const y = -hpx * (0.25 + i * 0.17); ctx.beginPath(); ctx.moveTo(-hpx * 0.3, y); ctx.quadraticCurveTo(0, y - hpx * 0.08, hpx * 0.3, y); ctx.stroke(); }
        return;
      }
      // crash
      if (t < 0.1) { const q = t / 0.1; ctx.scale(1 + q, 1 - 0.7 * q); pose(ctx, "crack5", hpx); return; }
      const fly = Math.min(t - 0.1, 1.1), back = t > 1.9 ? ease((t - 1.9) / 0.6) : 0;
      // puff of dust
      if (t < 1.2) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t / 1.2) * 0.8; ctx.fillStyle = "#EDEBE6"; ctx.strokeStyle = "rgba(46,46,51,0.4)"; ctx.lineWidth = 1.4;
        for (let i = 0; i < 6; i++) { const a = Math.PI + i * Math.PI / 5, r = hpx * (0.18 + 0.4 * ease(t / 0.8)); ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * 0.45 - 6, hpx * 0.14, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } ctx.restore(); }
      if (t < 2.5) {
        for (const sh of shards) { const x = sh.vx * fly, y = sh.oy * hpx + sh.vy * fly + 260 * fly * fly; const yy = Math.min(-4, y); shardDraw(ctx, sh, hpx, x * (1 - back), (yy) * (1 - back) + sh.oy * hpx * back, sh.rot + sh.w * fly * (1 - back)); }
        if (t < 1.6) word(ctx, "קְרַאש!", hpx, t - 0.1);
        else if (t < 2.5) word(ctx, "סתם!", hpx, t - 1.6, "#8A60E8");
        if (t > 2.2) { ctx.save(); ctx.globalAlpha = Math.min(1, (t - 2.2) / 0.3); pose(ctx, "crack5", hpx); ctx.restore(); }
        return;
      }
      const q = (t - 2.5) / 0.9, sy = 1 + 0.25 * Math.sin(q * Math.PI * 2.5) * (1 - q); ctx.scale(1 / Math.sqrt(sy), sy); pose(ctx, q < 0.55 ? "crack5" : "crack3", hpx); bandAid(ctx, hpx);
    }
    return A;
  }
  return { create, severity, severityStop, T_SOFT, T_CRASH, G_HEAVY, A_SOFT, A_CRASH, DUR, LINES };
})();
if (typeof module !== "undefined") module.exports = EggActor;
