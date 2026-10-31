// ======================================================================
//  Inclined plane: the creature is the body. Real forces are mg (always
//  straight down), N (perpendicular to the ramp) and friction (along it).
//  θ from the horizontal, 0–55°. Positive along-slope direction is DOWN.
//  (spec: art/source/incline/docs/04_PHYSICS_SPEC.md)
// ======================================================================
const InclinePhys = (() => {
  "use strict";
  const DEG = Math.PI / 180, G_EARTH = 9.81, DT = 1 / 120, TOL = 1e-9;
  function check(m, deg, mus, muk, g) {
    if (![m, deg, mus, muk, g].every(Number.isFinite) || m <= 0 || mus < 0 || muk < 0 || g <= 0 || deg < 0 || deg > 90) throw new Error("invalid incline parameters");
  }
  // forces for a body that is at rest (v = 0) or sliding down (v > 0)
  function forces({ m, deg, mus, muk, g = G_EARTH, v = 0 }) {
    check(m, deg, mus, muk, g);
    const th = deg * DEG, W = m * g, par = W * Math.sin(th), N = W * Math.cos(th);
    const fsMax = mus * N, fk = muk * N;
    const atRest = Math.abs(v) < 1e-7;
    const holds = atRest && par <= fsMax + TOL;
    // static friction is only as big as it needs to be; kinetic is μk N
    const f = holds ? par : fk;
    const a = holds ? 0 : (par - f) / m;                        // = g (sinθ − μk cosθ)
    return { W, N, par, perp: N, fsMax, fk, f, holds, sliding: !holds, a, thetaRad: th, criticalDeg: Math.atan(mus) / DEG };
  }
  // the two components of mg in screen coords (x right, y down), slope rising to the right
  function components(W, th) {
    const p = W * Math.sin(th), q = W * Math.cos(th);
    return { par: { x: -p * Math.cos(th), y: p * Math.sin(th) }, perp: { x: q * Math.sin(th), y: q * Math.cos(th) }, g: { x: 0, y: W } };
  }
  // one fixed step: d = distance travelled down the ramp, v ≥ 0 (downhill)
  function step(st, prm, dt = DT, length = Infinity) {
    let { d, v } = st;
    const fr = forces({ ...prm, v });
    if (fr.holds) v = 0;
    else {
      const vn = v + fr.a * dt;
      if (v > 0 && vn <= 0) v = 0;                               // slowed to a stop: static friction gets a say next step
      else { v = Math.max(0, vn); d += v * dt; }
    }
    let bottom = false;
    if (d >= length) { d = length; v = 0; bottom = true; }
    return { d, v, bottom, fr };
  }
  return { DEG, G_EARTH, DT, forces, components, step };
})();
if (typeof module !== "undefined") module.exports = InclinePhys;
