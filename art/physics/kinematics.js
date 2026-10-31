// Cookie Chase kinematics: a body on a skateboard along a 1-D track.
// x right +, SI units, fixed step. Models:
//   A ideal push: F_ext while held, nothing else (a = F/m_total; released → a = 0)
//   B pad brake: constant F_pad against v, stops exactly at v = 0 (never reverses)
//   C foot brake: F = μk(shoe, surface)·q·m_char·g against v, only while the foot touches
//   D given a: a prescribed acceleration, independent of mass (pure kinematics)
const Kin = (() => {
  const G = 9.81, DT = 1 / 120, M_BOARD = 0.6, F_PUSH = 8, F_PAD = 6, Q_FOOT = 0.5;
  const body = (mChar, o = {}) => ({ mChar, mBoard: o.mBoard ?? M_BOARD, extra: o.extra ?? 0, muk: o.muk ?? 0.35, g: o.g ?? G });
  const mTotal = (b) => b.mChar + b.mBoard + b.extra;
  // controls: { push: bool, pad: bool, foot: bool, given: number|null, F: number }
  function accelOf(st, b, c) {
    if (c.given != null) return c.given;
    let F = c.push ? (c.F ?? F_PUSH) : 0, brake = 0;
    if (c.pad) brake += c.Fpad ?? F_PAD;
    if (c.foot) brake += b.muk * (c.q ?? Q_FOOT) * b.mChar * b.g;
    return { F, brake };
  }
  // exact constant-acceleration step; a brake ends the step at v = 0 instead of reversing
  function step(st, b, c, dt = DT) {
    const m = mTotal(b), r = accelOf(st, b, c);
    if (typeof r === "number") return adv(st, r, dt);
    const { F, brake } = r;
    if (brake > 0 && Math.abs(st.v) < 1e-12 && Math.abs(F) <= brake) return { ...st, v: 0, t: st.t + dt, a: 0 };   // brake holds it still
    const dir = Math.abs(st.v) > 1e-12 ? Math.sign(st.v) : Math.sign(F);
    const a = (F - dir * brake) / m;
    if (brake > 0 && Math.abs(st.v) > 1e-12 && Math.sign(a) === -Math.sign(st.v)) {
      const tStop = -st.v / a;
      if (tStop <= dt + 1e-12) {                                  // stops inside this step: land exactly on v = 0
        const x = st.x + st.v * tStop + 0.5 * a * tStop * tStop;
        const rest = { x, v: 0, t: st.t + tStop, a: 0, dist: st.dist + Math.abs(x - st.x) };
        return step(rest, b, c, dt - tStop);
      }
    }
    return adv(st, a, dt);
  }
  function adv(st, a, dt) {
    const v = st.v + a * dt;
    // distance counts a turnaround inside the step correctly
    let dist;
    if (st.v * v < 0) { const tz = -st.v / a, xz = st.x + st.v * tz + 0.5 * a * tz * tz; const x = st.x + st.v * dt + 0.5 * a * dt * dt; dist = st.dist + Math.abs(xz - st.x) + Math.abs(x - xz); return { x, v, t: st.t + dt, a, dist }; }
    const x = st.x + st.v * dt + 0.5 * a * dt * dt;
    return { x, v, t: st.t + dt, a, dist: st.dist + Math.abs(x - st.x) };
  }
  const start = (x0 = 0, v0 = 0) => ({ x: x0, v: v0, t: 0, a: 0, dist: 0 });
  // stopping distance/time at a constant deceleration d (> 0)
  const stopping = (v0, d) => ({ t: Math.abs(v0) / d, d: v0 * v0 / (2 * d) });
  // the cookie: constant velocity
  const cookieAt = (ck, t) => ck.x0 + ck.v * t;
  // first time inside [t0, t1] when the gap closes to the catch radius, by linear interpolation of the gap
  function catchTime(prev, next, ck, radius) {
    const g0 = cookieAt(ck, prev.t) - prev.x, g1 = cookieAt(ck, next.t) - next.x;
    if (g0 > radius && g1 <= radius) return prev.t + (g0 - radius) / (g0 - g1) * (next.t - prev.t);
    return null;
  }
  // paint drops every Δt of physical time (not per frame)
  function dropsBetween(prev, next, every = 0.5) {
    const out = [];
    for (let k = Math.ceil(prev.t / every - 1e-9); k * every <= next.t + 1e-9; k++) {
      const tk = k * every; if (tk < prev.t - 1e-9) continue;
      const f = next.t > prev.t ? (tk - prev.t) / (next.t - prev.t) : 0;
      out.push({ t: tk, x: prev.x + (next.x - prev.x) * f, v: prev.v + (next.v - prev.v) * f });
    }
    return out;
  }
  return { G, DT, M_BOARD, F_PUSH, F_PAD, Q_FOOT, body, mTotal, step, start, stopping, cookieAt, catchTime, dropsBetween };
})();
if (typeof module !== "undefined") module.exports = Kin;
