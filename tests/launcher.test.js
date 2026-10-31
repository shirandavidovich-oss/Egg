// floor launcher: contact-only spring, detachment at the natural length, energy to height
const SP = require("../art/physics/spring.js");
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) pass++; else { fail++; console.log("FAIL", name, extra); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const p = SP.lparams(1.4, 200);
ok("rests compressed by mg/k", near(SP.restCompression(p), 1.4 * 9.81 / 200, 1e-12));
ok("detaches only beyond 2mg/k", near(SP.detachCompression(p), 2 * 1.4 * 9.81 / 200, 1e-12));

// resting state stays put
{ const s = new SP.LSim(p); for (let i = 0; i < 360; i++) s.advance(SP.DT); ok("rest is quiet", near(s.st.y, -SP.restCompression(p), 1e-6) && Math.abs(s.st.v) < 1e-6); }

// compressed enough: leaves the spring and reaches the energy height
{
  const c = 0.2, s = new SP.LSim(p); s.hold(c); s.release();
  let v0 = null, prevTouch = true;
  for (let i = 0; i < 2400 && s.apex === null; i++) { s.advance(SP.DT); if (prevTouch && !s.st.touching && v0 === null) v0 = s.st.v; prevTouch = s.st.touching; }
  ok("flew once", s.flights === 1);
  ok("speed at the natural length", near(v0, SP.launchSpeed(p, c), 0.03), `${v0} vs ${SP.launchSpeed(p, c)}`);
  ok("apex from energy", near(s.apex, SP.launchApex(p, c), 0.004), `${s.apex} vs ${SP.launchApex(p, c)}`);
  ok("rise from the start = kc²/2mg", near(s.apex + c, SP.riseFromStart(p, c), 0.004));
}
// not enough compression: never leaves, oscillates on the spring
{
  const c = SP.detachCompression(p) * 0.8, s = new SP.LSim(p); s.hold(c); s.release();
  let maxY = -1; for (let i = 0; i < 2400; i++) { s.advance(SP.DT); maxY = Math.max(maxY, s.st.y); }
  ok("stays in contact", s.flights === 0 && maxY <= 1e-3, `maxY ${maxY}`);
}
// after landing it settles back to rest
{
  const s = new SP.LSim(p); s.hold(0.2); s.release(); for (let i = 0; i < 2400; i++) s.advance(SP.DT);
  ok("settles after the catch", near(s.st.y, -SP.restCompression(p), 2e-3) && Math.abs(s.st.v) < 0.01, `${s.st.y}`);
}
// heavier body, same spring and compression: lower
{
  const a = SP.launchApex(SP.lparams(1, 300), 0.2), b = SP.launchApex(SP.lparams(2, 300), 0.2);
  ok("heavier goes lower", a > b);
}
console.log(`${pass}/${pass + fail} passed`); if (fail) process.exit(1);
