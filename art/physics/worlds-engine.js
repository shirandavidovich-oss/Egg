// ======================================================================
//  "עולמות המכניקה": 20 physics models (evaluate, ported 1:1 from the pack's
//  engine/physics.mjs) and a time simulator for each, so what moves on the
//  screen is computed, not animated. SI units, g from the scene (default 10).
//  Each simulator: { t, tEnd, step(dt), st (state for drawing/graphs),
//  events [{type, t, ...}], done }. Exact events where it matters: stops,
//  landings, meetings, collisions, loss of contact, slipping.
//  (spec: art/source/worlds/docs/PHYSICS_CONSTRAINTS_HE.md)
// ======================================================================
const WorldPhys = (() => {
  "use strict";
  const RP = (typeof RampPhys !== "undefined") ? RampPhys : require("./ramp-engine.js");
  const G = 6.67430e-11, rad = (d) => d * Math.PI / 180;
  const invalid = (why) => { throw new RangeError("Invalid physics input: " + why); };
  const finite = (...v) => { if (v.some((x) => !Number.isFinite(x))) invalid("nonfinite value"); };
  const positive = (...v) => { finite(...v); if (v.some((x) => x <= 0)) invalid("nonpositive parameter"); };
  const nonneg = (...v) => { finite(...v); if (v.some((x) => x < 0)) invalid("negative parameter"); };
  const nearZero = (x) => Math.abs(x) < 1e-10;

  // ---------------- the reference calculator (same results as the pack) ----------------
  function evaluate(kind, p) {
    finite(...Object.values(p).filter((x) => typeof x === "number"));
    switch (kind) {
      case "units": positive(p.factor); return { baseSI: p.value * p.factor };
      case "vectors": { const Rx = p.ax + p.bx, Ry = p.ay + p.by; return { Rx, Ry, magnitude: Math.hypot(Rx, Ry), angle: Math.atan2(Ry, Rx) * 180 / Math.PI }; }
      case "uniform": nonneg(p.t); return { x: p.x0 + p.v * p.t, displacement: p.v * p.t, distance: Math.abs(p.v * p.t) };
      case "meeting": {
        const dv = p.v1 - p.v2;
        const t = nearZero(dv) ? (nearZero(p.x2 - p.x1) ? 0 : null) : (p.x2 - p.x1) / dv;
        if (t === null || t < 0) return { tMeeting: null, xMeeting: null, status: "אין מפגש עתידי במודל" };
        return { tMeeting: t, xMeeting: p.x1 + p.v1 * t, status: "מפגש" };
      }
      case "acceleration": {
        nonneg(p.t);
        const v = p.v0 + p.a * p.t, dx = p.v0 * p.t + 0.5 * p.a * p.t * p.t, tStop = (p.v0 * p.a < 0) ? -p.v0 / p.a : null;
        return { v, dx, stoppingTime: tStop };
      }
      case "vertical": {
        positive(p.g); nonneg(p.h, p.t);
        const y = p.h + p.v0 * p.t - 0.5 * p.g * p.t * p.t, tPeak = Math.max(0, p.v0 / p.g), maxY = p.h + (p.v0 > 0 ? p.v0 * p.v0 / (2 * p.g) : 0);
        const tLand = (p.v0 + Math.sqrt(p.v0 * p.v0 + 2 * p.g * p.h)) / p.g;
        return { y: p.t > tLand ? 0 : Math.max(0, y), v: p.t > tLand ? 0 : p.v0 - p.g * p.t, tPeak, maxY, tLand, status: p.t > tLand ? "נחת" : "באוויר" };
      }
      case "projectile": {
        positive(p.g); nonneg(p.h, p.t); if (p.v0 < 0 || p.angle < 0 || p.angle > 90) invalid("launch");
        const vx = p.v0 * Math.cos(rad(p.angle)), vy = p.v0 * Math.sin(rad(p.angle)), tLand = (vy + Math.sqrt(vy * vy + 2 * p.g * p.h)) / p.g, t = Math.min(tLand, p.t);
        return { x: vx * t, y: Math.max(0, p.h + vy * t - 0.5 * p.g * t * t), range: vx * tLand, tLand, maxY: p.h + vy * vy / (2 * p.g), vx, vy: vy - p.g * t };
      }
      case "incline": {
        positive(p.m, p.g); nonneg(p.muS, p.muK); if (p.angle < 0 || p.angle >= 90 || p.muK > p.muS + 1e-10) invalid("incline limits");
        const N = p.m * p.g * Math.cos(rad(p.angle)), drive = p.F - p.m * p.g * Math.sin(rad(p.angle)), staticLimit = p.muS * N;
        if (nearZero(p.v0) && Math.abs(drive) <= staticLimit + 1e-10) return { N, friction: -drive, a: 0, mode: "סטטי", staticLimit, drive };
        const direction = nearZero(p.v0) ? Math.sign(drive) : Math.sign(p.v0), friction = -direction * p.muK * N;
        return { N, friction, a: (drive + friction) / p.m, mode: "קינטי", staticLimit, drive };
      }
      case "pulley": {
        positive(p.mA, p.mB, p.g); nonneg(p.muS, p.muK); if (p.angle < 0 || p.angle >= 90 || p.muK > p.muS) invalid("pulley");
        const N = p.mA * p.g * Math.cos(rad(p.angle)), drive = p.mB * p.g - p.mA * p.g * Math.sin(rad(p.angle)), maxStatic = p.muS * N;
        if (Math.abs(drive) <= maxStatic + 1e-9) return { a: 0, T: p.mB * p.g, N, mode: "סטטי" };
        const friction = -Math.sign(drive) * p.muK * N, a = (drive + friction) / (p.mA + p.mB), T = p.mB * (p.g - a);
        if (T < 0) return { a: null, T: null, N, mode: "חבל רפוי — נדרש מודל אחר" };
        return { a, T, N, mode: "נע" };
      }
      case "spring": positive(p.k, p.m); return { F: -p.k * p.x, E: 0.5 * p.k * p.x * p.x, a: -p.k * p.x / p.m };
      case "energy": {
        positive(p.m, p.g); nonneg(p.h, p.mu, p.d); if (p.v0 < 0) invalid("starting speed");
        const initialE = 0.5 * p.m * p.v0 * p.v0 + p.m * p.g * p.h, heat = p.mu * p.m * p.g * p.d, remainingE = initialE - heat;
        return { initialE, heat, endV: remainingE >= 0 ? Math.sqrt(2 * remainingE / p.m) : 0, remainingE: Math.max(0, remainingE), status: remainingE < 0 ? "נעצר לפני קצה הרצועה" : "עבר את הרצועה", stopDistance: p.mu === 0 ? null : initialE / (p.mu * p.m * p.g) };
      }
      case "circle": positive(p.m, p.r, p.g); nonneg(p.v, p.mu);
        return { aC: p.v * p.v / p.r, Fc: p.m * p.v * p.v / p.r, period: p.v > 0 ? 2 * Math.PI * p.r / p.v : null, safeSpeed: Math.sqrt(p.mu * p.g * p.r), status: p.v * p.v / p.r <= p.mu * p.g ? "חיכוך מספיק" : "החלקה (במודל משטח אופקי)" };
      case "bank": { positive(p.r, p.g); if (p.angle <= 0 || p.angle >= 90) invalid("bank angle"); const idealV = Math.sqrt(p.r * p.g * Math.tan(rad(p.angle))); return { idealV, idealKmh: 3.6 * idealV }; }
      case "loop": { positive(p.m, p.r, p.g); nonneg(p.vTop); const rawN = p.m * (p.vTop * p.vTop / p.r - p.g); return { contact: rawN >= 0 ? "מגע מתקיים" : "אין מגע בפסגה", minV: Math.sqrt(p.g * p.r), NTop: Math.max(0, rawN) }; }
      case "impulse": { positive(p.m, p.dt); const J = p.m * (p.v1 - p.v0); return { J, Favg: J / p.dt, deltaP: J }; }
      case "collision": {
        positive(p.m1, p.m2); if (p.e < 0 || p.e > 1) invalid("coefficient of restitution");
        const { m1, m2, u1, u2, e } = p;
        const v1 = (m1 * u1 + m2 * u2 - m2 * e * (u1 - u2)) / (m1 + m2), v2 = (m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / (m1 + m2);
        const before = 0.5 * m1 * u1 * u1 + 0.5 * m2 * u2 * u2, after = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
        return { v1, v2, pBefore: m1 * u1 + m2 * u2, pAfter: m1 * v1 + m2 * v2, lostK: Math.max(0, before - after) };
      }
      case "recoil": { positive(p.m1, p.m2); const v2 = -p.m1 * p.v1 / p.m2; return { v2, pTotal: p.m1 * p.v1 + p.m2 * v2 }; }
      case "gravity": { positive(p.M, p.r, p.m); const g = G * p.M / (p.r * p.r), vOrbit = Math.sqrt(G * p.M / p.r); return { g, F: p.m * g, vOrbit, vEscape: Math.SQRT2 * vOrbit, period: 2 * Math.PI * p.r / vOrbit }; }
      case "oscillator": {
        positive(p.m, p.k); nonneg(p.A, p.t);
        const omega = Math.sqrt(p.k / p.m), phi = omega * p.t + p.phase, x = p.A * Math.cos(phi);
        return { period: 2 * Math.PI / omega, x, v: -p.A * omega * Math.sin(phi), a: -omega * omega * x, E: 0.5 * p.k * p.A * p.A };
      }
      case "capstone": {
        positive(p.m, p.k, p.g, p.d); nonneg(p.mu, p.v0); if (p.angle <= 0 || p.angle >= 90) invalid("capstone angle");
        const energyAtBottom = 0.5 * p.m * p.v0 * p.v0 + p.m * p.g * p.d * (Math.sin(rad(p.angle)) - p.mu * Math.cos(rad(p.angle)));
        return { energyAtBottom, endV: energyAtBottom > 0 ? Math.sqrt(2 * energyAtBottom / p.m) : 0, compression: energyAtBottom > 0 ? Math.sqrt(2 * energyAtBottom / p.k) : 0, status: energyAtBottom < 0 ? "לא מגיע לתחתית (עצירה במדרון)" : "מגיע לתחתית" };
      }
      default: throw new Error("Unknown model: " + kind);
    }
  }
  const modelNames = ["units", "vectors", "uniform", "meeting", "acceleration", "vertical", "projectile", "incline", "pulley", "spring", "energy", "circle", "bank", "loop", "impulse", "collision", "recoil", "gravity", "oscillator", "capstone"];

  // ======================================================================
  //  time simulators
  // ======================================================================
  const sim = (o) => Object.assign({ t: 0, done: false, events: [], log(type, x = {}) { this.events.push({ type, t: this.t, ...x }); } }, o);
  const firstRoot = (a, b, c) => {            // smallest t>0 with a t² + b t + c = 0
    if (Math.abs(a) < 1e-14) { if (Math.abs(b) < 1e-14) return null; const t = -c / b; return t > 1e-12 ? t : null; }
    const D = b * b - 4 * a * c; if (D < 0) return null;
    const r = Math.sqrt(D), ts = [(-b - r) / (2 * a), (-b + r) / (2 * a)].filter((t) => t > 1e-12).sort((x, y) => x - y);
    return ts.length ? ts[0] : null;
  };

  const SIMS = {
    // the plank is cut to value×factor metres; walking across shows whether it spans the gap
    units(p, o) { const L = p.value * p.factor, gap = o.gap; return sim({ tEnd: 2.4, step(dt) { this.t = Math.min(this.tEnd, this.t + dt); const walk = Math.min(1, this.t / 2) * Math.max(gap, L) ; this.st = { L, gap, x: walk, fell: L + 1e-9 < gap && walk > L }; if (this.t >= this.tEnd) this.done = true; }, st: { L, gap, x: 0, fell: false } }); },
    // the creature (or leaf) moves along the resultant for two seconds
    vectors(p) { const R = evaluate("vectors", p); return sim({ tEnd: 2, step(dt) { this.t = Math.min(this.tEnd, this.t + dt); this.st = { x: R.Rx * this.t / 2, y: R.Ry * this.t / 2, R }; if (this.t >= this.tEnd) this.done = true; }, st: { x: 0, y: 0, R } }); },
    uniform(p) { return sim({ tEnd: Math.max(0.5, p.t), st: { x: p.x0, v: p.v, path: 0 }, step(dt) {
      const t1 = Math.min(this.tEnd, this.t + dt), x0 = p.x0 + p.v * this.t, x1 = p.x0 + p.v * t1;
      if ((x0 < 0 && x1 >= 0) || (x0 > 0 && x1 <= 0)) { const tz = -p.x0 / p.v; this.t = tz; this.log("zero", { x: 0 }); }
      this.t = t1; this.st = { x: x1, v: p.v, path: Math.abs(p.v * t1) }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    meeting(p) { const R = evaluate("meeting", p), tEnd = R.tMeeting !== null ? Math.min(14, R.tMeeting + 1.2) : 10;
      return sim({ tEnd, met: null, st: { x1: p.x1, x2: p.x2 }, step(dt) {
        const t1 = Math.min(this.tEnd, this.t + dt);
        if (this.met === null && R.tMeeting !== null && R.tMeeting <= t1 + 1e-12) { this.met = { t: R.tMeeting, x: R.xMeeting }; this.t = R.tMeeting; this.log("meet", { x: R.xMeeting }); }
        this.t = t1; this.st = { x1: p.x1 + p.v1 * t1, x2: p.x2 + p.v2 * t1, gap: (p.x2 + p.v2 * t1) - (p.x1 + p.v1 * t1) }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    // a brake stops and stays stopped; a constant force may turn the motion around
    acceleration(p, o) { const brake = !!o.brake; return sim({ tEnd: Math.max(0.5, p.t), st: { x: 0, v: p.v0, a: p.a }, stopped: false, step(dt) {
      let t1 = Math.min(this.tEnd, this.t + dt);
      const tStop = p.v0 * p.a < 0 ? -p.v0 / p.a : null;
      if (tStop !== null && this.t < tStop && t1 >= tStop) this.log("v_zero", { x: p.v0 * tStop + 0.5 * p.a * tStop * tStop });
      let x, v, a = p.a;
      if (brake && tStop !== null && t1 >= tStop) { x = p.v0 * tStop + 0.5 * p.a * tStop * tStop; v = 0; a = 0; this.stopped = true; }
      else { x = p.v0 * t1 + 0.5 * p.a * t1 * t1; v = p.v0 + p.a * t1; }
      this.t = t1; this.st = { x, v, a }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    vertical(p) { const R = evaluate("vertical", { ...p, t: 0 }); return sim({ tEnd: R.tLand, st: { y: p.h, v: p.v0 }, step(dt) {
      const t1 = Math.min(this.tEnd, this.t + dt);
      if (this.t < R.tPeak && t1 >= R.tPeak && p.v0 > 0) this.log("peak", { y: R.maxY });
      this.t = t1; const land = t1 >= R.tLand - 1e-12;
      this.st = land ? { y: 0, v: p.v0 - p.g * R.tLand, landed: true } : { y: p.h + p.v0 * t1 - 0.5 * p.g * t1 * t1, v: p.v0 - p.g * t1 };
      if (land) { this.log("land", { v: this.st.v }); this.done = true; } } }); },
    projectile(p) { const R = evaluate("projectile", { ...p, t: 0 }), vy0 = p.v0 * Math.sin(rad(p.angle)), tp = vy0 / p.g;
      return sim({ tEnd: R.tLand, st: { x: 0, y: p.h, vx: R.vx, vy: vy0 }, step(dt) {
        const t1 = Math.min(this.tEnd, this.t + dt);
        if (this.t < tp && t1 >= tp && vy0 > 0) this.log("peak", { y: R.maxY, x: R.vx * tp });
        this.t = t1; const land = t1 >= R.tLand - 1e-12;
        this.st = land ? { x: R.range, y: 0, vx: R.vx, vy: vy0 - p.g * R.tLand, landed: true } : { x: R.vx * t1, y: p.h + vy0 * t1 - 0.5 * p.g * t1 * t1, vx: R.vx, vy: vy0 - p.g * t1 };
        if (land) { this.log("land", { x: R.range }); this.done = true; } } }); },
    // a ramp track (exact stops and static re-check from the ramp engine); + is UP the slope
    incline(p) { const tr = RP.makeSingle({ m: p.m, angleDeg: p.angle, muS: p.muS, muK: Math.min(p.muK, p.muS), g: p.g, F: p.F, L: 6, s0: 3, v0: p.v0 });
      return wrapTrack(tr, 6); },
    pulley(p) { const tr = RP.makeHanging({ mA: p.mA, mB: p.mB, angleDeg: p.angle, muS: p.muS, muK: Math.min(p.muK, p.muS), g: p.g, sMin: -1.3, sMax: 1.1 });
      return wrapTrack(tr, 5); },
    // horizontal spring on a smooth floor, released from x
    spring(p) { const w = Math.sqrt(p.k / p.m), T = 2 * Math.PI / w; return sim({ tEnd: 2 * T, st: { x: p.x, v: 0, F: -p.k * p.x }, step(dt) {
      this.t = Math.min(this.tEnd, this.t + dt); const x = p.x * Math.cos(w * this.t), v = -p.x * w * Math.sin(w * this.t);
      this.st = { x, v, F: -p.k * x, a: -p.k * x / p.m, E: 0.5 * p.k * x * x, K: 0.5 * p.m * v * v }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    // a smooth slope down h, then a rough strip d, then a smooth run-out
    energy(p) { const segs = []; if (p.h > 0) segs.push({ length: p.h / Math.sin(rad(30)), angleDeg: 30, muS: 0, muK: 0 });
      segs.push({ length: Math.max(0.01, p.d), angleDeg: 0, muS: p.mu, muK: p.mu }, { length: 3, angleDeg: 0, muS: 0, muK: 0 });
      const tr = RP.makePiecewise({ m: p.m, g: p.g, segments: segs, v0: Math.max(p.v0, 1e-6) });
      const s = wrapTrack(tr, 30); s.stripStart = p.h > 0 ? segs[0].length : 0; s.stripEnd = s.stripStart + p.d; s.segs = segs;
      const base = s.step.bind(s); s.step = (dt) => { base(dt); if (tr.s >= s.stripEnd - 1e-9 && !s.passed) { s.passed = true; s.log("strip_end", { v: tr.v }); s.done = true; } }; return s; },
    // a flat turntable: friction provides v²/r up to μg; beyond that it slides off along the tangent
    circle(p) { const need = p.v * p.v / p.r, slip = need > p.mu * p.g + 1e-12, plate = p.r * 1.6;
      return sim({ tEnd: slip ? 3 : Math.min(12, 2 * (p.v > 0 ? 2 * Math.PI * p.r / p.v : 4)), st: { x: p.r, y: 0, on: true }, step(dt) {
        this.t = Math.min(this.tEnd, this.t + dt);
        if (!slip) { const ph = p.v * this.t / p.r; this.st = { x: p.r * Math.cos(ph), y: p.r * Math.sin(ph), on: true, phase: ph }; }
        else { if (!this.events.length) this.log("slip"); const d = p.v * this.t; this.st = { x: p.r, y: d, on: Math.hypot(p.r, d) < plate }; if (!this.st.on && !this.off) { this.off = true; this.log("off_plate"); } }
        if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    // a frictionless banked curve: at v ≠ ideal the car drifts up (too fast) or down (too slow)
    bank(p, o) { const R = evaluate("bank", p), v = o.v === undefined ? R.idealV : o.v, th = rad(p.angle);
      // net along the bank (up-slope +) without friction: m(v²/r)cosθ − mg sinθ
      const drift = (v * v / p.r) * Math.cos(th) - p.g * Math.sin(th);
      return sim({ tEnd: 4, st: { phase: 0, up: 0, drift }, step(dt) { this.t = Math.min(this.tEnd, this.t + dt); this.st = { phase: v * this.t / p.r, up: Math.max(-1, Math.min(1, 0.5 * drift * this.t * this.t)), drift, v }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    // a vertical loop entered at the bottom with the speed that would give vTop at the top;
    // when N would turn negative the ball leaves the track and flies freely
    loop(p) { const vb = Math.sqrt(p.vTop * p.vTop + 4 * p.g * p.r);
      const s = sim({ tEnd: 6, st: { th: 0, x: 0, y: 0, v: vb, onTrack: true, N: p.m * (vb * vb / p.r + p.g) }, th: 0, om: vb / p.r, free: null, step(dt) {
        this.t = Math.min(this.tEnd, this.t + dt);
        if (!this.free) {
          const h = 1 / 2000; let rem = dt;
          while (rem > 1e-12 && !this.free) { const k = Math.min(h, rem); rem -= k;
            // energy: v² = vb² − 2 g r (1 − cos th); th from the bottom, counter-clockwise
            const v2 = vb * vb - 2 * p.g * p.r * (1 - Math.cos(this.th));
            const Nn = p.m * v2 / p.r + p.m * p.g * Math.cos(this.th);           // normal toward the centre
            if (Nn < 0 || v2 <= 0) { const v = Math.sqrt(Math.max(0, v2)); this.free = { t0: this.t - rem, x: p.r * Math.sin(this.th), y: p.r - p.r * Math.cos(this.th), vx: v * Math.cos(this.th), vy: v * Math.sin(this.th) }; this.log("lost_contact", { th: this.th }); break; }
            this.th += Math.sqrt(v2) / p.r * k;
            if (this.th >= 2 * Math.PI) { this.th -= 2 * Math.PI; if (!this.events.some((e) => e.type === "full_loop")) this.log("full_loop"); }
            if (this.th > Math.PI && !this.events.some((e) => e.type === "top")) this.log("top", { v: Math.sqrt(v2), N: Nn });
          }
          if (!this.free) { const v2 = vb * vb - 2 * p.g * p.r * (1 - Math.cos(this.th)); this.st = { th: this.th, x: p.r * Math.sin(this.th), y: p.r - p.r * Math.cos(this.th), v: Math.sqrt(Math.max(0, v2)), onTrack: true, N: p.m * v2 / p.r + p.m * p.g * Math.cos(this.th) }; }
        }
        if (this.free) { const f = this.free, tt = this.t - f.t0; let y = f.y + f.vy * tt - 0.5 * p.g * tt * tt; if (y < 0) { y = 0; if (!this.events.some((e) => e.type === "land")) this.log("land"); this.done = true; } this.st = { x: f.x + f.vx * tt, y, onTrack: false, N: 0, v: Math.hypot(f.vx, f.vy - p.g * tt) }; }
        if (this.events.some((e) => e.type === "full_loop") && this.t > 0.2 + this.events.find((e) => e.type === "full_loop").t) this.done = true;
        if (this.t >= this.tEnd - 1e-12) this.done = true; } });
      return s; },
    // a cart meets a cushion: during dt a constant average force changes v0 into v1
    impulse(p) { const J = p.m * (p.v1 - p.v0), F = J / p.dt, t0 = 1.0, x0 = -p.v0 * t0;
      return sim({ tEnd: t0 + p.dt + 1.2, st: { x: x0, v: p.v0, F: 0 }, step(dt) {
        this.t = Math.min(this.tEnd, this.t + dt); const t = this.t;
        let x, v, f = 0;
        if (t < t0) { x = x0 + p.v0 * t; v = p.v0; }
        else if (t < t0 + p.dt) { const u = t - t0; x = p.v0 * u + 0.5 * (F / p.m) * u * u; v = p.v0 + (F / p.m) * u; f = F; if (!this.events.length) this.log("contact"); }
        else { const xe = p.v0 * p.dt + 0.5 * (F / p.m) * p.dt * p.dt; x = xe + p.v1 * (t - t0 - p.dt); v = p.v1; if (this.events.length === 1) this.log("release"); }
        this.st = { x, v, F: f, p: p.m * v }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    // two carts on a smooth track; they collide at the exact contact time
    collision(p) { const R = evaluate("collision", p), gap0 = 2.4, w = 0.4, x1 = -gap0 / 2 - w / 2, x2 = gap0 / 2 + w / 2;
      const closing = p.u1 - p.u2, tc = closing > 1e-9 ? gap0 / closing : null;
      return sim({ tEnd: tc !== null ? tc + 2 : 3, st: { x1, x2, v1: p.u1, v2: p.u2 }, step(dt) {
        this.t = Math.min(this.tEnd, this.t + dt); const t = this.t;
        if (tc === null || t < tc) this.st = { x1: x1 + p.u1 * t, x2: x2 + p.u2 * t, v1: p.u1, v2: p.u2, p: p.m1 * p.u1 + p.m2 * p.u2, K: 0.5 * p.m1 * p.u1 ** 2 + 0.5 * p.m2 * p.u2 ** 2 };
        else { if (!this.events.length) this.log("hit", { x: x1 + p.u1 * tc + w / 2 }); const c1 = x1 + p.u1 * tc, c2 = x2 + p.u2 * tc, u = t - tc;
          this.st = { x1: c1 + R.v1 * u, x2: c2 + R.v2 * u, v1: R.v1, v2: R.v2, p: R.pAfter, K: 0.5 * p.m1 * R.v1 ** 2 + 0.5 * p.m2 * R.v2 ** 2 }; }
        if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    recoil(p) { const R = evaluate("recoil", p), t0 = 0.6;
      return sim({ tEnd: t0 + 2, st: { x1: -0.25, x2: 0.25, v1: 0, v2: 0 }, step(dt) { this.t = Math.min(this.tEnd, this.t + dt); const u = Math.max(0, this.t - t0);
        if (u > 0 && !this.events.length) this.log("push");
        // body 1 is pushed with v1; the other gets v2 = −m1 v1 / m2
        this.st = { x1: -0.25 + p.v1 * u, x2: 0.25 + R.v2 * u, v1: u > 0 ? p.v1 : 0, v2: u > 0 ? R.v2 : 0, p: u > 0 ? R.pTotal : 0 };
        if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    // a satellite around a point mass, launched sideways at vf × v_orbit (RK4, time compressed for the screen)
    gravity(p, o) { const R = evaluate("gravity", p), vf = o.vf === undefined ? 1 : o.vf, Rp = o.Rp || 6.0e6, GM = G * p.M;
      let s = [p.r, 0, 0, vf * R.vOrbit];
      const acc = (x, y) => { const r3 = Math.pow(x * x + y * y, 1.5); return [-GM * x / r3, -GM * y / r3]; };
      const f = (q) => { const a = acc(q[0], q[1]); return [q[2], q[3], a[0], a[1]]; };
      const scale = R.period / 6;                   // one circular orbit ≈ 6 s on screen
      return sim({ tEnd: 9, scale, st: { x: s[0], y: s[1], r: p.r, v: vf * R.vOrbit, g: R.g }, step(dt) {
        if (this.done) return; let T = dt * scale; const n = Math.max(4, Math.ceil(T / (R.period / 2000)));
        const h = T / n;
        for (let i = 0; i < n; i++) {
          const k1 = f(s), k2 = f(s.map((v, j) => v + h / 2 * k1[j])), k3 = f(s.map((v, j) => v + h / 2 * k2[j])), k4 = f(s.map((v, j) => v + h * k3[j]));
          s = s.map((v, j) => v + h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
          const r = Math.hypot(s[0], s[1]);
          if (r <= Rp) { this.log("crash"); this.done = true; break; }
          if (r > 6 * p.r) { this.log("escape"); this.done = true; break; }
        }
        this.t = Math.min(this.tEnd, this.t + dt); const r = Math.hypot(s[0], s[1]);
        this.st = { x: s[0], y: s[1], r, v: Math.hypot(s[2], s[3]), g: GM / (r * r), E: 0.5 * (s[2] ** 2 + s[3] ** 2) - GM / r };
        if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    oscillator(p) { const w = Math.sqrt(p.k / p.m), T = 2 * Math.PI / w; return sim({ tEnd: Math.max(3 * T, 3), st: {}, step(dt) {
      this.t = Math.min(this.tEnd, this.t + dt); const ph = w * this.t + p.phase, x = p.A * Math.cos(ph), v = -p.A * w * Math.sin(ph);
      this.st = { x, v, a: -w * w * x, K: 0.5 * p.m * v * v, U: 0.5 * p.k * x * x }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    // down a rough ramp of length d, then a smooth floor into a spring (friction only on the ramp)
    capstone(p) { const th = rad(p.angle), aRamp = p.g * (Math.sin(th) - p.mu * Math.cos(th)), gapToSpring = 0.6, w = Math.sqrt(p.k / p.m);
      const stuck = p.v0 <= 1e-9 && Math.tan(th) <= p.mu;    // μ also as the static limit: it never starts
      const s = sim({ tEnd: 8, phase: "ramp", s: 0, v: p.v0, xMax: 0, heat: 0, st: { phase: "ramp", s: 0, v: p.v0, x: 0 }, step(dt) {
        let rem = dt;
        while (rem > 1e-12 && !this.done) {
          if (stuck) { this.done = true; this.log("stays"); break; }
          if (this.phase === "ramp") {
            // constant a on the ramp; stop if it slows to zero (then static: μ ≥ tanθ means it stays)
            const left = p.d - this.s, tStop = aRamp < 0 ? -this.v / aRamp : Infinity, tEnd = firstRoot(0.5 * aRamp, this.v, -left);
            const k = Math.min(rem, tStop, tEnd === null ? Infinity : tEnd);
            const ds = this.v * k + 0.5 * aRamp * k * k; this.s += ds; this.v += aRamp * k; this.heat += p.mu * p.m * p.g * Math.cos(th) * ds; this.t += k; rem -= k;
            if (k === tStop) { this.v = 0; this.log("stopped_on_ramp", { s: this.s }); this.done = true; }
            else if (tEnd !== null && k === tEnd) { this.s = p.d; this.phase = "flat"; this.u = 0; this.log("bottom", { v: this.v }); }
          } else if (this.phase === "flat") {
            const k = Math.min(rem, (gapToSpring - this.u) / this.v); this.u += this.v * k; this.t += k; rem -= k;
            if (this.u >= gapToSpring - 1e-12) { this.phase = "spring"; this.ts = this.t; this.vin = this.v; this.log("contact"); }
          } else if (this.phase === "spring") {
            const half = Math.PI / w, quarter = half / 2, u0 = this.t - this.ts;
            const k = Math.min(rem, half - u0, u0 < quarter - 1e-12 ? quarter - u0 : Infinity);
            this.t += k; rem -= k; const u = this.t - this.ts; this.x = (this.vin / w) * Math.sin(w * u); this.v = this.vin * Math.cos(w * u);
            this.xMax = Math.max(this.xMax, this.x);
            if (Math.abs(u - quarter) < 1e-9 && !this.events.some((e) => e.type === "max")) this.log("max", { x: this.xMax });
            if (u >= half - 1e-9) { this.phase = "back"; this.x = 0; this.v = -this.vin; this.log("leaves_spring"); this.done = true; }
          }
        }
        this.st = { phase: this.phase, s: this.s, v: this.v, x: this.phase === "spring" ? this.x : 0, xMax: this.xMax, heat: this.heat };
        if (this.t >= this.tEnd) this.done = true; } });
      return s; }
  };
  function wrapTrack(tr, tMax) {
    const s = sim({ tEnd: tMax, tr, st: {}, step(dt) {
      tr.advance(dt); this.t = tr.t; const R = tr.resolve();
      this.st = { s: tr.s, v: tr.v, a: R.a, f: R.f, N: R.N, mode: R.mode, T: tr.tension ? tr.tension() : null };
      for (const e of tr.events.slice(this.events.length)) this.events.push(e);
      if (R.mode !== "kinetic") { this.rest = (this.rest || 0) + dt; if (this.rest > 0.6) this.done = true; } else this.rest = 0;
      if (this.t >= this.tEnd) this.done = true; } });
    s.step(1e-9); return s;
  }
  function makeSim(family, p, opts = {}) { const s = SIMS[family](p, opts); if (!s.st || s.st.x === undefined && family !== "incline") s.step(0); return s; }
  // run a simulator to its end (for tests and for answers that come from a run)
  function runToEnd(s, dt = 1 / 120) { let guard = 0; while (!s.done && guard++ < 20000) s.step(dt); return s; }

  return { G, evaluate, modelNames, makeSim, runToEnd, rad };
})();
if (typeof module !== "undefined") module.exports = WorldPhys;
