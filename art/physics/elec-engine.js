// ======================================================================
//  "עולמות החשמל": 26 models (evaluate, ported 1:1 from the pack's
//  engine/physics.mjs) and a time simulator for each machine, so what moves
//  on screen is computed: charges pushed by Coulomb forces each step (RK4),
//  a particle in plates, RC clocks, real Lorentz paths (RK4 with q(E + v×B)),
//  a loop in a ramping field, a rod on rails. Conventional current is a
//  marker of the current's size, never the speed of electrons.
//  (spec: art/source/elec/docs/PHYSICS_MODELS_HE.md)
// ======================================================================
const ElecPhys = (() => {
  "use strict";
  const K = 8.9875517923e9, EPS0 = 8.8541878128e-12, MU0 = 4 * Math.PI * 1e-7;
  const uC = (x) => x * 1e-6, rad = (d) => d * Math.PI / 180;
  const roundAngle = (a) => (Math.abs(a - 90) < 1e-9 ? 0 : Math.cos(a * Math.PI / 180));
  function nearSource(dx, dy) { if (dx * dx + dy * dy < 1e-7) throw new RangeError("חיישן חופף למטען נקודתי: השדה במודל אינו מוגדר בדיוק במקור. הזז את החיישן."); }
  function vectorFrom(q, dx, dy) { nearSource(dx, dy); const rsq = dx * dx + dy * dy, C = K * uC(q) / (rsq * Math.sqrt(rsq)); return [C * dx, C * dy]; }

  // ---------------- the reference calculator (same results as the pack) ----------------
  function evaluate(family, p) {
    const v = { ...p };
    try {
      let r;
      switch (family) {
        case "coulomb": { const { q1, q2, r: dist } = v; if (dist <= 0) throw new RangeError("המרחק חייב להיות חיובי"); const signed = K * uC(q1) * uC(q2) / (dist ** 2);
          r = { forceN: Math.abs(signed), interaction: signed > 0 ? "דחייה" : signed < 0 ? "משיכה" : "אין כוח", energyJ: K * uC(q1) * uC(q2) / dist, signedForce: signed }; break; }
        case "forcePair2D": case "field2D": {
          const xp = family === "field2D" ? v.x : v.xProbe, yp = family === "field2D" ? v.y : v.yProbe;
          const [f1x, f1y] = vectorFrom(v.q1, xp - v.x1, yp - v.y1), [f2x, f2y] = vectorFrom(v.q2, xp - v.x2, yp - v.y2), Ex = f1x + f2x, Ey = f1y + f2y;
          if (family === "field2D") r = { Ex, Ey, E: Math.hypot(Ex, Ey), directionDeg: Math.atan2(Ey, Ex) * 180 / Math.PI };
          else { const Fx = uC(v.qProbe) * Ex, Fy = uC(v.qProbe) * Ey; r = { Fx, Fy, F: Math.hypot(Fx, Fy), Ex, Ey }; }
          break; }
        case "plate": { if (v.d <= 0 || v.m <= 0) throw new RangeError("המרחק והמסה חייבים להיות חיוביים"); const E = v.V / v.d, forceN = uC(v.q) * E; r = { E, forceN, a: forceN / v.m }; break; }
        case "potential": { if (v.r <= 0) throw new RangeError("המרחק חייב להיות חיובי"); const potentialV = K * uC(v.qSource) / v.r; r = { potentialV, energyJ: uC(v.qTest) * potentialV }; break; }
        case "workElectric": { const deltaV = v.Vend - v.Vstart, deltaU = uC(v.q) * deltaV; r = { deltaV, deltaU, workFieldJ: -deltaU }; break; }
        case "capacitor": { if (v.dmm <= 0 || v.kappa < 1 || v.A <= 0) throw new RangeError("פרמטרי קבל לא תקינים"); const C = EPS0 * v.kappa * v.A / (v.dmm * 1e-3); r = { CuF: C * 1e6, QmicroC: C * v.V * 1e6, Uj: 0.5 * C * v.V ** 2 }; break; }
        case "capacitorPair": { if (v.C1 <= 0 || v.C2 <= 0) throw new RangeError("קיבולים חיוביים בלבד"); let Ceq, Q1, Q2, V1, V2;
          if (v.parallel >= 0.5) { Ceq = v.C1 + v.C2; V1 = v.V; V2 = v.V; Q1 = v.C1 * v.V; Q2 = v.C2 * v.V; } else { Ceq = v.C1 * v.C2 / (v.C1 + v.C2); Q1 = Q2 = Ceq * v.V; V1 = Q1 / v.C1; V2 = Q2 / v.C2; }
          r = { Ceq, Q1, Q2, V1, V2 }; break; }
        case "capacitorShare": { const { C1, C2, V1, V2 } = v; if (C1 <= 0 || C2 <= 0) throw new RangeError("קיבול חייב להיות חיובי"); const Qtotal = C1 * V1 + C2 * V2, Vfinal = Qtotal / (C1 + C2);
          const before = 0.5 * (C1 * V1 ** 2 + C2 * V2 ** 2) * 1e-6, after = 0.5 * (C1 + C2) * Vfinal ** 2 * 1e-6; r = { Vfinal, Qtotal, lostJ: Math.max(0, before - after), energyBeforeJ: before, energyAfterJ: after }; break; }
        case "ohm": { if (v.R <= 0) throw new RangeError("נגד חייב להיות חיובי"); const I = v.V / v.R, P = v.V * I; r = { I, P, E10s: P * 10 }; break; }
        case "resistivity": { const R = (v.rhoNano * 1e-9) * v.length / (v.areaMM2 * 1e-6); if (R <= 0) throw new RangeError("חוט עם התנגדות לא חיובית"); const I = v.V / R; r = { R, I, P: v.V * I }; break; }
        case "network": { const par = v.R2 * v.R3 / (v.R2 + v.R3), Req = v.R1 + par, Itotal = v.V / Req, Vparallel = Itotal * par; r = { Req, Itotal, Vparallel, I2: Vparallel / v.R2, I3: Vparallel / v.R3 }; break; }
        case "divider": { const I = v.V / (v.Rtop + v.Rbottom); r = { I, Vout: I * v.Rbottom, Pbottom: I * I * v.Rbottom }; break; }
        case "kirchhoff": { const a = v.R1 + v.Rshared, b = -v.Rshared, c = -v.Rshared, d = v.R2 + v.Rshared, det = a * d - b * c; if (det <= 0) throw new RangeError("מערכת לא יציבה");
          const Iloop1 = (v.E1 * d - b * v.E2) / det, Iloop2 = (a * v.E2 - c * v.E1) / det, Ishared = Iloop1 - Iloop2;
          r = { Iloop1, Iloop2, Ishared, Pshared: Ishared ** 2 * v.Rshared, kvl1: (v.R1 + v.Rshared) * Iloop1 - v.Rshared * Iloop2 - v.E1, kvl2: (v.R2 + v.Rshared) * Iloop2 - v.Rshared * Iloop1 - v.E2 }; break; }
        case "battery": { const I = v.E / (v.R + v.r), Vterminal = I * v.R; r = { I, Vterminal, Pload: I * Vterminal, Ploss: I * I * v.r }; break; }
        case "rcCharge": case "rcDischarge": { if (v.R <= 0 || v.CmicroF <= 0 || v.tms < 0) throw new RangeError("RC דורש התנגדות, קיבול וזמן חוקיים");
          const tauMs = v.R * v.CmicroF, decay = Math.exp(-v.tms / tauMs);
          r = family === "rcCharge" ? { tauMs, Vc: v.E * (1 - decay), Ima: v.E / v.R * decay, fraction: 1 - decay } : { tauMs, Vc: v.V0 * decay, Ima: v.V0 / v.R * decay, fraction: decay }; break; }
        case "lorentz": { const s = Math.abs(Math.sin(v.angle * Math.PI / 180)), forceN = Math.abs(uC(v.q) * v.v * v.B) * s; r = { forceN, signedFy: Math.abs(v.angle - 90) < 1e-9 ? -uC(v.q) * v.v * v.B : null, workJ: 0 }; break; }
        case "gyroradius": { if (v.qMicroC === 0 || v.B <= 0 || v.v <= 0) throw new RangeError("אין מסלול מעגלי כשמטען/שדה/מהירות מתאימים לאפס"); const m = v.mNanoKg * 1e-9, q = Math.abs(uC(v.qMicroC));
          r = { radiusM: m * v.v / (q * v.B), periodSec: 2 * Math.PI * m / (q * v.B), forceN: q * v.v * v.B }; break; }
        case "selector": { const netFy = uC(v.q) * (v.E - v.v * v.B); r = { netFy, vStraight: v.B !== 0 ? v.E / v.B : null, balanced: Math.abs(v.E - v.v * v.B) < 1e-7 ? "כן" : "לא" }; break; }
        case "wireForce": { const amp = v.I * v.L * v.B * Math.sin(v.angle * Math.PI / 180); r = { forceN: Math.abs(amp), signedForce: Math.abs(v.angle - 90) < 1e-9 ? amp : null }; break; }
        case "wireField": { if (v.rCm <= 0) throw new RangeError("חיישן לא יכול לחפוף לתיל"); const Bt = MU0 * Math.abs(v.I) / (2 * Math.PI * v.rCm * 1e-2), signedBz = -MU0 * v.I / (2 * Math.PI * v.rCm * 1e-2); r = { Btesla: Bt, BmicroT: Bt * 1e6, signedBz }; break; }
        case "solenoid": { if (v.L <= 0 || v.N <= 0) throw new RangeError("אורך וליפופים צריכים להיות חיוביים"); r = { Btesla: MU0 * (v.N / v.L) * v.I, turnsPerM: v.N / v.L }; break; }
        case "parallelWires": { if (v.dCm <= 0) throw new RangeError("המרחק צריך להיות חיובי"); const f = MU0 * Math.abs(v.I1 * v.I2) * v.L / (2 * Math.PI * v.dCm * 1e-2); r = { forceN: f, interaction: v.I1 * v.I2 > 0 ? "משיכה" : v.I1 * v.I2 < 0 ? "דחייה" : "אין כוח" }; break; }
        case "faraday": { if (v.dt <= 0 || v.R <= 0) throw new RangeError("זמן ונגד צריכים להיות חיוביים"); const cos = roundAngle(v.angle), fluxDelta = v.A * (v.Bend - v.Bstart) * cos, emf = -v.N * fluxDelta / v.dt, I = emf / v.R;
          r = { fluxDelta, emf, I, comment: fluxDelta > 0 ? "מתנגד לעליית השטף החתום" : fluxDelta < 0 ? "מתנגד לירידת השטף החתום" : "אין שינוי שטף" }; break; }
        case "motionalEMF": { const emf = v.B * v.L * v.v, I = emf / v.R; r = { emf, I, P: emf * I, dragN: Math.abs(I * v.B * v.L) }; break; }
        default: throw new Error("מודל לא מוכר: " + family);
      }
      for (const [key, val] of Object.entries(r)) if (typeof val === "number" && !Number.isFinite(val)) throw new Error("תוצאה לא סופית: " + key);
      return { valid: true, ...r };
    } catch (err) { return { valid: false, error: err.message }; }
  }
  const modelNames = ["coulomb", "forcePair2D", "field2D", "plate", "potential", "workElectric", "capacitor", "capacitorPair", "capacitorShare", "ohm", "resistivity", "network", "divider", "kirchhoff", "battery", "rcCharge", "rcDischarge", "lorentz", "gyroradius", "selector", "wireForce", "wireField", "solenoid", "parallelWires", "faraday", "motionalEMF"];

  // ======================================================================
  //  time simulators
  // ======================================================================
  const sim = (o) => Object.assign({ t: 0, done: false, events: [], log(type, x = {}) { this.events.push({ type, t: this.t, ...x }); } }, o);
  const rk4 = (y, f, h) => { const k1 = f(y), k2 = f(y.map((v, i) => v + h / 2 * k1[i])), k3 = f(y.map((v, i) => v + h / 2 * k2[i])), k4 = f(y.map((v, i) => v + h * k3[i])); return y.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); };
  const BALLOON_M = 0.005, PROBE_M = 0.002, LAB_M = 2e-7;       // model masses (kg), shown on screen

  // a steady DC circuit: the switch closes at t = 0.3 s; energy delivered grows as P·t
  const dc = (p, fam, keyP) => { const e = evaluate(fam, p); return sim({ tEnd: 3.3, st: { on: false, E: 0 }, step(dt) {
    this.t = Math.min(this.tEnd, this.t + dt); const on = this.t >= 0.3; if (on && !this.events.length) this.log("switch_on");
    this.st = { on, E: on ? (e[keyP] || 0) * (this.t - 0.3) : 0, flow: on ? this.t - 0.3 : 0 }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); };

  const SIMS = {
    // two charged balloons on a smooth floor, released at distance r (forces on both, every step)
    coulomb(p) { const m = BALLOON_M, kq = K * uC(p.q1) * uC(p.q2); let y = [-p.r / 2, p.r / 2, 0, 0]; const Rmin = 0.08, Rmax = 2.4;
      const f = (s) => { const d = s[1] - s[0], F = kq / (d * d); return [s[2], s[3], -F / m, F / m]; };
      return sim({ tEnd: 4, st: { x1: y[0], x2: y[1], d: p.r, v: 0, F: kq / (p.r * p.r) }, step(dt) {
        if (this.done) return; const n = Math.ceil(dt / 2e-4), h = dt / n;
        for (let i = 0; i < n; i++) { y = rk4(y, f, h); const d = y[1] - y[0];
          if (d <= Rmin) { y[2] = y[3] = 0; this.log("touch"); this.done = true; break; }
          if (d >= Rmax) { this.log("apart"); this.done = true; break; } }
        this.t = Math.min(this.tEnd, this.t + dt); const d = y[1] - y[0];
        this.st = { x1: y[0], x2: y[1], d, v: y[3] - y[2], F: kq / (d * d), U: kq / d, K: 0.5 * m * (y[2] ** 2 + y[3] ** 2) };
        if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    // the probe charge is let go among two fixed sources (RK4 in 2-D) until it hits a source or leaves the map
    forcePair2D(p) { const m = PROBE_M; let y = [p.xProbe, p.yProbe, 0, 0];
      const acc = (x, yy) => { const [a, b] = vectorFrom(p.q1, x - p.x1, yy - p.y1), [c, d] = vectorFrom(p.q2, x - p.x2, yy - p.y2); return [uC(p.qProbe) * (a + c) / m, uC(p.qProbe) * (b + d) / m]; };
      const f = (s) => { const a = acc(s[0], s[1]); return [s[2], s[3], a[0], a[1]]; };
      return sim({ tEnd: 3, st: { x: y[0], y: y[1] }, step(dt) {
        if (this.done) return; const n = Math.ceil(dt / 2e-4), h = dt / n;
        for (let i = 0; i < n; i++) { y = rk4(y, f, h);
          if (Math.hypot(y[0] - p.x1, y[1] - p.y1) < 0.06 || Math.hypot(y[0] - p.x2, y[1] - p.y2) < 0.06) { this.log("hit_source"); this.done = true; break; }
          if (Math.abs(y[0]) > 1.4 || Math.abs(y[1]) > 1.2) { this.log("left_map"); this.done = true; break; } }
        this.t = Math.min(this.tEnd, this.t + dt); this.st = { x: y[0], y: y[1], v: Math.hypot(y[2], y[3]) }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    // the sensor only reads; the run "listens" for a second (the needle swings to the computed field)
    field2D(p) { const e = evaluate("field2D", p); return sim({ tEnd: 1.2, st: { needle: 0 }, step(dt) { this.t = Math.min(this.tEnd, this.t + dt); this.st = { needle: Math.min(1, this.t / 0.8), E: e.E }; if (this.t >= this.tEnd - 1e-12) { this.log("measured", { E: e.E }); this.done = true; } } }); },
    // a speck released at rest midway between the plates moves to one plate (gravity left out: horizontal plates)
    plate(p) { const e = evaluate("plate", p), a = e.a, half = p.d / 2, tHit = a === 0 ? Infinity : Math.sqrt(2 * half / Math.abs(a));
      return sim({ tEnd: Math.min(3, tHit), st: { y: 0, v: 0 }, step(dt) { this.t = Math.min(this.tEnd, this.t + dt); const y = 0.5 * a * this.t * this.t;
        this.st = { y: Math.max(-half, Math.min(half, y)), v: a * this.t, a }; if (this.t >= tHit - 1e-12) { this.log(a > 0 ? "hit_top" : "hit_bottom"); this.done = true; } else if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    // a test charge let go at r from a fixed source, moving along the line (energy kept: K + U constant)
    potential(p) { const m = PROBE_M, kq = K * uC(p.qSource) * uC(p.qTest); let y = [p.r, 0];
      const f = (s) => [s[1], kq / (s[0] * s[0]) / m];
      return sim({ tEnd: 3, st: { r: p.r, v: 0 }, step(dt) {
        if (this.done) return; const n = Math.ceil(dt / 2e-4), h = dt / n;
        for (let i = 0; i < n; i++) { y = rk4(y, f, h); if (y[0] <= 0.06) { this.log("hit_source"); this.done = true; break; } if (y[0] >= 2.4) { this.log("far"); this.done = true; break; } }
        this.t = Math.min(this.tEnd, this.t + dt); this.st = { r: y[0], v: y[1], V: K * uC(p.qSource) / y[0], U: kq / y[0], K: 0.5 * m * y[1] * y[1] }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    // the lift carries the charge from Vstart to Vend at a steady pace; the meter adds up the field's work
    workElectric(p) { return sim({ tEnd: 2.4, st: { f: 0, W: 0 }, step(dt) { this.t = Math.min(this.tEnd, this.t + dt); const f = Math.min(1, this.t / 2);
      const V = p.Vstart + (p.Vend - p.Vstart) * f; this.st = { f, V, W: -uC(p.q) * (V - p.Vstart), U: uC(p.q) * V }; if (this.t >= this.tEnd - 1e-12) { this.log("arrived"); this.done = true; } } }); },
    // connected to the battery through a resistor (τ = 0.4 s on screen): Q climbs to C·V
    capacitor(p) { const e = evaluate("capacitor", p), tau = 0.4; return sim({ tEnd: 2.4, st: { Q: 0 }, step(dt) { this.t = Math.min(this.tEnd, this.t + dt); const k = 1 - Math.exp(-this.t / tau);
      this.st = { Q: e.QmicroC * k, Vc: p.V * k, U: e.Uj * k * k }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    capacitorPair(p) { const e = evaluate("capacitorPair", p), tau = 0.4; return sim({ tEnd: 2.4, st: {}, step(dt) { this.t = Math.min(this.tEnd, this.t + dt); const k = 1 - Math.exp(-this.t / tau);
      this.st = { Q1: e.Q1 * k, Q2: e.Q2 * k, V1: e.V1 * k, V2: e.V2 * k }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    // two charged, isolated capacitors joined through a wire with resistance: charge flows until the voltages match;
    // the missing energy is the heat in that resistance (∫I²R dt), never "lost in an ideal wire"
    capacitorShare(p) { const e = evaluate("capacitorShare", p), Ceq = p.C1 * p.C2 / (p.C1 + p.C2), tau = 0.3, t0 = 0.4;
      return sim({ tEnd: t0 + 3, st: { V1: p.V1, V2: p.V2, heat: 0 }, step(dt) { this.t = Math.min(this.tEnd, this.t + dt); const u = Math.max(0, this.t - t0); if (u > 0 && !this.events.length) this.log("switch_on");
        const k = Math.exp(-u / tau), V1 = e.Vfinal + (p.V1 - e.Vfinal) * k, V2 = e.Vfinal + (p.V2 - e.Vfinal) * k;
        const heat = 0.5 * Ceq * (p.V1 - p.V2) ** 2 * (1 - k * k) * 1e-6;          // = lost energy as u → ∞
        this.st = { V1, V2, heat, I: u > 0 ? (p.V1 - p.V2) * k : 0 }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    ohm(p) { return dc(p, "ohm", "P"); }, resistivity(p) { return dc(p, "resistivity", "P"); }, network(p) { const e = evaluate("network", p); const s = dc(p, "network", "x"); const b = s.step.bind(s); s.step = (dt) => { b(dt); s.st.E = s.st.on ? p.V * e.Itotal * (s.t - 0.3) : 0; }; return s; },
    divider(p) { const e = evaluate("divider", p); const s = dc(p, "divider", "x"); const b = s.step.bind(s); s.step = (dt) => { b(dt); s.st.E = s.st.on ? p.V * e.I * (s.t - 0.3) : 0; }; return s; },
    kirchhoff(p) { const e = evaluate("kirchhoff", p); const s = dc(p, "kirchhoff", "x"); const b = s.step.bind(s); s.step = (dt) => { b(dt); s.st.E = s.st.on ? (p.E1 * e.Iloop1 + p.E2 * e.Iloop2) * (s.t - 0.3) : 0; }; return s; },
    battery(p) { return dc(p, "battery", "Pload"); },
    // a real clock in ms (shown slowed down so 5τ takes about 5 s)
    rcCharge(p) { return rc(p, true); }, rcDischarge(p) { return rc(p, false); },
    // the particle moves in the screen plane, B along z; only v's component across B bends the path
    lorentz(p) { const vPerp = p.v * Math.sin(rad(p.angle)), vPar = p.v * Math.cos(rad(p.angle));
      return lorentzPath(uC(p.q), LAB_M, vPerp, 0, p.B, 0, 3, vPar); },
    gyroradius(p) { const m = p.mNanoKg * 1e-9, q = uC(p.qMicroC), T = 2 * Math.PI * m / (Math.abs(q) * p.B);
      const s = lorentzPath(q, m, p.v, 0, p.B, 0, 6, 0, T / 3); return s; },
    // a velocity selector: E along +y, B along z, particle enters along +x with v
    selector(p) { return lorentzPath(uC(p.q), 1e-6, p.v, 0, p.B, p.E, 1.6, 0, null, 1.0); },
    // a hanging wire segment swings to its equilibrium tanφ = F/(mg) (wire mass 0.05 kg per metre)
    wireForce(p) { const e = evaluate("wireForce", p), m = 0.05 * p.L, F = p.I * p.L * p.B * Math.sin(rad(p.angle)), phiEq = Math.atan2(F, m * 9.8);
      return sim({ tEnd: 2.5, st: { phi: 0 }, step(dt) { this.t = Math.min(this.tEnd, this.t + dt); const k = 1 - Math.exp(-this.t / 0.35) * Math.cos(this.t * 9);
        this.st = { phi: phiEq * k, F }; if (this.t >= this.tEnd - 1e-12) { this.log("settled", { phi: phiEq }); this.done = true; } } }); },
    wireField(p) { const e = evaluate("wireField", p); return sim({ tEnd: 1.2, st: { needle: 0 }, step(dt) { this.t = Math.min(this.tEnd, this.t + dt); this.st = { needle: Math.min(1, this.t / 0.8), B: e.BmicroT }; if (this.t >= this.tEnd - 1e-12) { this.log("measured"); this.done = true; } } }); },
    solenoid(p) { const e = evaluate("solenoid", p); return sim({ tEnd: 1.2, st: { needle: 0 }, step(dt) { this.t = Math.min(this.tEnd, this.t + dt); this.st = { needle: Math.min(1, this.t / 0.8), B: e.Btesla }; if (this.t >= this.tEnd - 1e-12) { this.log("measured"); this.done = true; } } }); },
    // two wires held at their ends: they bow toward (attraction) or away (repulsion) in proportion to the force
    parallelWires(p) { const e = evaluate("parallelWires", p), sgn = p.I1 * p.I2 > 0 ? -1 : p.I1 * p.I2 < 0 ? 1 : 0;
      return sim({ tEnd: 2, st: { bow: 0 }, step(dt) { this.t = Math.min(this.tEnd, this.t + dt); const k = 1 - Math.exp(-this.t / 0.3); this.st = { bow: sgn * Math.min(1, e.forceN / 2e-4) * k, F: e.forceN }; if (this.t >= this.tEnd - 1e-12) { this.log("settled"); this.done = true; } } }); },
    // B ramps linearly from Bstart to Bend during dt (after a short wait); emf only while it changes
    faraday(p) { const e = evaluate("faraday", p), t0 = 0.5, cos = roundAngle(p.angle);
      return sim({ tEnd: t0 + p.dt + 1, st: { B: p.Bstart, flux: p.N * p.A * p.Bstart * cos, emf: 0, I: 0 }, step(dt) {
        this.t = Math.min(this.tEnd, this.t + dt); const u = this.t - t0, ramping = u >= 0 && u < p.dt;
        if (u >= 0 && !this.events.some((q) => q.type === "ramp_start")) this.log("ramp_start"); if (u >= p.dt && !this.events.some((q) => q.type === "ramp_end")) this.log("ramp_end");
        const B = u < 0 ? p.Bstart : u >= p.dt ? p.Bend : p.Bstart + (p.Bend - p.Bstart) * u / p.dt;
        this.st = { B, flux: p.A * B * cos, emf: ramping ? e.emf : 0, I: ramping ? e.I : 0 }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); },
    // a hand keeps the rod moving at v along the rails; the work the hand does each second equals I²R
    motionalEMF(p) { const e = evaluate("motionalEMF", p); return sim({ tEnd: 2.5, st: { x: 0 }, step(dt) {
      this.t = Math.min(this.tEnd, this.t + dt); this.st = { x: p.v * this.t, emf: e.emf, I: e.I, heat: e.P * this.t, handWork: e.dragN * Math.abs(p.v) * this.t }; if (this.t >= this.tEnd - 1e-12) this.done = true; } }); }
  };
  function rc(p, charge) { const e = evaluate(charge ? "rcCharge" : "rcDischarge", p), tau = e.tauMs, tEndMs = Math.max(5 * tau, p.tms * 1.15 + 1), slow = tEndMs / 6;
    return sim({ tEnd: 6, scale: slow, st: { tms: 0 }, step(dt) {
      this.t = Math.min(this.tEnd, this.t + dt); const tms = this.t * slow, d = Math.exp(-tms / tau);
      for (const [n, tt] of [["tau", tau], ["mark", p.tms]]) if (tms >= tt && !this.events.some((q) => q.type === n)) this.log(n, { tms: tt });
      this.st = charge ? { tms, Vc: p.E * (1 - d), Ima: p.E / p.R * d } : { tms, Vc: p.V0 * d, Ima: p.V0 / p.R * d };
      if (this.t >= this.tEnd - 1e-12) this.done = true; } }); }
  // q(E + v×B) in the plane, B = Bz ẑ, E = Ey ŷ; tEnd in seconds of screen time; tScale maps one screen second to sim seconds
  function lorentzPath(q, m, vx, vy, Bz, Ey, tEnd, vPar = 0, tScaleOne = null, xExit = null) {
    let y = [0, 0, vx, vy]; const f = (s) => [s[2], s[3], q * (s[3] * Bz) / m, q * (Ey - s[2] * Bz) / m];
    const w = Math.abs(q * Bz / m), T = w ? 2 * Math.PI / w : Infinity, scale = tScaleOne || (Number.isFinite(T) ? T / 2.5 : 1);
    const K0 = 0.5 * m * (vx * vx + vy * vy);
    return sim({ tEnd, scale, st: { x: 0, y: 0, vx, vy, K: K0, z: 0 }, step(dt) {
      if (this.done) return; const H = dt * scale, n = Math.max(8, Math.ceil(H / (Math.min(T, 1e9) / 400 || H))), h = H / n;
      for (let i = 0; i < n; i++) { y = rk4(y, f, h); if (xExit !== null && y[0] >= xExit) { this.log("exit", { y: y[1] }); this.done = true; break; } }
      this.t = Math.min(this.tEnd, this.t + dt);
      this.st = { x: y[0], y: y[1], vx: y[2], vy: y[3], K: 0.5 * m * (y[2] ** 2 + y[3] ** 2), z: vPar * this.t * scale, Fy: q * (Ey - y[2] * Bz) };
      if (this.t >= this.tEnd - 1e-12) this.done = true; } });
  }
  function makeSim(family, p) { const s = SIMS[family](p); s.step(0); return s; }
  function runToEnd(s, dt = 1 / 120) { let g = 0; while (!s.done && g++ < 20000) s.step(dt); return s; }
  return { K, EPS0, MU0, evaluate, modelNames, makeSim, runToEnd, BALLOON_M, PROBE_M, LAB_M };
})();
if (typeof module !== "undefined") module.exports = ElecPhys;
