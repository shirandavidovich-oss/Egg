/**
 * Physics reference only, do not assume the user's game uses TypeScript.
 * Vertical spring; positive coordinate is DOWN. Supports damping.
 * Accurate concepts described in docs/06_SPRING_PHYSICS.md.
 */
export type SpringState = {
  extensionFromNatural_m: number;
  velocity_m_s: number;
};
export type SpringParams = {
  mass_kg: number;
  k_N_per_m: number;
  damping_Ns_per_m: number;
  g_m_s2: number;
};
function positive(name: string, x: number): number {
  if (!(Number.isFinite(x) && x > 0)) throw new Error(`${name} must be finite and > 0`);
  return x;
}
export function equilibriumExtension(p: SpringParams): number {
  return positive('mass',p.mass_kg)*p.g_m_s2/positive('k',p.k_N_per_m);
}
export function idealPeriodSeconds(p: SpringParams): number {
  return 2*Math.PI*Math.sqrt(positive('mass',p.mass_kg)/positive('k',p.k_N_per_m));
}
export function springForceDownwardN(s_m: number, k_N_m: number): number {
  return -positive('k',k_N_m)*s_m;
}
export function elasticEnergyJ(s_m: number, k_N_m: number): number {
  return 0.5*positive('k',k_N_m)*s_m*s_m;
}
export function accelerationDownward(s: SpringState, p: SpringParams): number {
  positive('m',p.mass_kg);
  positive('k',p.k_N_per_m);
  if (p.damping_Ns_per_m < 0) throw new Error('damping cannot be negative');
  return p.g_m_s2 - (p.k_N_per_m*s.extensionFromNatural_m + p.damping_Ns_per_m*s.velocity_m_s)/p.mass_kg;
}
/** Semi implicit Euler. Integrate using fixed 1/120s or smaller, never unrestricted frame dt. */
export function stepSpring(s: SpringState, p: SpringParams, dt_s=1/120): SpringState {
  positive('dt',dt_s);
  const v = s.velocity_m_s + accelerationDownward(s,p)*dt_s;
  return { extensionFromNatural_m: s.extensionFromNatural_m + v*dt_s, velocity_m_s:v };
}
/** Stable start after selecting a different character. Keep k and offset u for fair comparison. */
export function initialStateFromEquilibrium(p: SpringParams, displacementDownward_m: number): SpringState {
  return { extensionFromNatural_m: equilibriumExtension(p)+displacementDownward_m, velocity_m_s:0 };
}
