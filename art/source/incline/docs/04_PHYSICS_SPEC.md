# Physics contract — incline with character as body

## Scope and assumptions
Rigid body simplified to particle translating along straight rigid incline; no tumbling/rolling; constant g=9.81 m/s² by default (teacher mode 10 optional, label it); air resistance ignored at low speeds; normal contact maintained while on ramp; no applied external force apart from gravity, normal and friction. Angle θ measured above **horizontal**, range 0..55°. Positive axis **down the ramp**. Surface coefficients refer to the specific creature-foot/surface pair.

### Real forces (do not double count components)
- Weight vector `W=(0,-mg)` in world Y-up; on screen Y-down arrow remains vertically down.
- Normal perpendicular OUT from ramp `N=mg*cosθ` for this model (no vertical extraneous forces).
- Static friction if body rests and `mg*sinθ <= mu_s*N` (with tolerance) => `f_s=mg*sinθ` acting UP ramp, acceleration 0. Key: static friction is NOT always at its maximum!
- If rest becomes unstable (`mg*sinθ > mu_s*N`) or already sliding downhill, kinetic `f_k = mu_k*N` UP ramp and acceleration down slope `a = g*(sinθ - mu_k*cosθ)`.
- For moving *up* the slope (optional later), friction points down slope; a_down=g*(sinθ+mu_k*cosθ). Avoid energy injection through naive velocity clamping and recapture static equilibrium after stopping.

### Mathematical decomposition (alternate display, not new forces)
`W_parallel = mg*sinθ` downhill along tangent; `W_perpendicular = mg*cosθ` inward normal. In world coords (x-right, y-up), uphill unit t=(cosθ,sinθ), outward normal n=(-sinθ,cosθ), so W= (-mg sinθ)*t + (-mg cosθ)*n. If screen Y-down, invert y for drawing. Sum two components reproduces full W.

### Newton's 2nd law and kinematics
At rest on incline: ΣF_parallel=mg sinθ - f_s=0; ΣF_normal=N-mg cosθ=0.
Sliding downhill: ΣF_parallel=mg sinθ - mu_k mg cosθ=m*a; ΣF_normal=0.
Velocity/distance for constant θ, constant surface, sliding stage: v(t)=v0+a t; s(t)=s0+v0 t+0.5*a*t²; include bottom boundary clamp/safe mat. Fixed timestep integrator 1/120 sec, dt accumulation cap, and energy stability checks. Prefer analytic update if same a stage; do not use physics from pixels.

### Thresholds and numeric examples
Angle onset θcrit=atan(mu_s) for rest if no other forces. At θcrit equality, static can still hold; sliding only when tanθ>mu_s (within tolerance).
Example A: m=2.0kg, θ=30°, g=10, mu_s=0.60, mu_k=0.40, `mg sinθ=10N`, `N=17.32N`, `mu_s*N=10.39N` => REST, f_s=10N, acceleration 0. Do NOT mistakenly report 3.27 m/s² just because kinetic coefficient exists; kinetic doesn't act if not sliding.
Example B: m=2.0kg, θ=40°, g=10, mu_s=0.60, mu_k=0.40 => `mg sinθ≈12.86N`, `N≈15.32N`, `mu_s*N≈9.19N`; starts sliding, `f_k≈6.13N`, a≈3.36m/s² (down ramp).
Example C: m=1kg vs m=4kg with identical µ on same slope: gravitational components and friction magnitudes scale with mass but acceleration and threshold **do not**; two creatures with different µ can move differently regardless of relative masses.
Example D: θ=0°, object stationary, fs=0, N=mg, a=0. θ=45°, µs=1.0 => can remain resting at equality, if µk < µs it does NOT automatically start sliding.

### Character physical parameters
Keep `mass_kg`, `height_m`, contact properties read-only and immutable per character instance/version. Weight computed from environment g; NEVER equate mass kg with weight N. Friction pair varies by material (`data/character_surface_physics.json`). Restitution and drag exist for other games, but in this ramp model do not randomly change static friction or cause bounces. Fictional bodies/µ values are game parameters, not measurements of real organisms.

### Contact, collisions, and animation
When ramp angle changes while body at rest, reevaluate contact and friction threshold at that moment; if sliding and ramp angle changes, recompute acceleration; don't teleport through surface. Bottom contact hits foam pad; cartoon squash visual only, physics sim stops at boundary, no 'spring launch' unless explicitly physical. Body visual rotates to ramp; vector orientations remain world-correct.

### Rigorous teaching details
- Normal is NOT Newton's third-law reaction to weight: weight's reaction is gravitational pull of creature on Earth. Normal is contact force from the surface; its third-law counterpart is creature pressing on surface.
- Physics diagrams at stages 1–5 include *only* external forces as solid arrows; 'components view' is alternate basis representation.
- Static friction resists tendency to slide, kinetic resists relative motion; if user changes θ after movement stopped, solve static equilibrium again.
- A steeper ramp does not increase gravity g, weight mg, or body mass; it increases along-slope component and decreases normal (for fixed m,g).
- Avoid treating `mu` as independently adjustable body property. The only editable physical environment here is θ and optionally surface.
