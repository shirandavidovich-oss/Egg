// ======================================================================
//  EXPLAIN: calculator, "how did we get this?" formula movies, laws and
//  scientists (cards + a timeline chart). Pure math at the top (tested in
//  node); the screens are built by EggExplain.create(...) inside ui.js.
// ======================================================================
const EggExplain = (() => {
  "use strict";
  // ---------------- math: tokens and a small safe parser (no eval) ----------------
  const OPS = { "·": "mul", "×": "mul", "*": "mul", "/": "div", "÷": "div", "+": "add", "−": "sub", "-": "sub", "^": "pow", "²": "sq", "³": "cube", "√": "sqrt" };
  const RELS = "=≤≥<>≈∝";
  const SUBS = "₀₁₂₃₄₅₆₇₈₉";
  function tokenize(src, symRe, isSym = () => true) {
    const out = [], re = symRe ? new RegExp(symRe.source, "y") : null;
    let i = 0;
    while (i < src.length) {
      const c = src[i], rest = src.slice(i);
      if (/\s/.test(c)) { i++; continue; }
      let m;
      if ((m = /^\d*\.?\d+/.exec(rest)) || (m = /^\d+\.?/.exec(rest))) { out.push({ t: "num", v: parseFloat(m[0]), s: m[0] }); i += m[0].length; continue; }
      if (c === "½") { out.push({ t: "num", v: 0.5, s: "½" }); i++; continue; }
      if (RELS.includes(c)) { out.push({ t: "rel", v: c }); i++; continue; }
      if (c in OPS) { out.push({ t: "op", v: OPS[c], s: c }); i++; continue; }
      if (c === "(") { out.push({ t: "lp" }); i++; continue; }
      if (c === ")") { out.push({ t: "rp" }); i++; continue; }
      if (SUBS.includes(c) && out.length && out[out.length - 1].t === "sym") { out[out.length - 1].k += c; i++; continue; }
      if ((m = /^const/.exec(rest))) { out.push({ t: "word", v: "const" }); i += 5; continue; }
      if ((m = /^(sin|cos|tan)/.exec(rest))) { out.push({ t: "fn", v: m[1] }); i += 3; continue; }
      if (re) { re.lastIndex = i; m = re.exec(src); if (m && m[0] && isSym(m[0])) { out.push({ t: "sym", k: m[0] }); i += m[0].length; continue; } }
      if (/[A-Za-zα-ωΑ-ΩΣΔ]/.test(c)) { out.push({ t: "sym", k: c }); i++; continue; }
      i++;                                                   // anything else (a stray mark) is skipped
    }
    return out;
  }
  // value of a token list; env(name) gives a symbol's number. Trig works in degrees, like a school calculator.
  function evaluate(tokens, env) {
    let p = 0;
    const peek = () => tokens[p], next = () => tokens[p++];
    const isOp = (t, ...v) => t && t.t === "op" && v.includes(t.v);
    const starts = (t) => t && (t.t === "num" || t.t === "sym" || t.t === "fn" || t.t === "lp" || isOp(t, "sqrt"));
    const fail = () => { throw new Error("bad"); };
    function expr() { let v = term(); while (isOp(peek(), "add", "sub")) { const o = next().v, r = term(); v = o === "add" ? v + r : v - r; } return v; }
    function term() {
      let v = unary();
      for (;;) {
        const t = peek();
        if (isOp(t, "mul", "div")) { next(); const r = unary(); v = t.v === "mul" ? v * r : v / r; }
        else if (starts(t)) v *= unary();                    // 2π, 2(3+1)
        else return v;
      }
    }
    function unary() { const t = peek(); if (isOp(t, "sub", "add")) { next(); const v = unary(); return t.v === "sub" ? -v : v; } return power(); }
    function power() { const v = postfix(); if (isOp(peek(), "pow")) { next(); return Math.pow(v, unary()); } return v; }
    function postfix() { let v = primary(); while (isOp(peek(), "sq", "cube")) v = Math.pow(v, next().v === "sq" ? 2 : 3); return v; }
    function primary() {
      const t = next(); if (!t) fail();
      if (t.t === "num") return t.v;
      if (t.t === "sym") { const v = env(t.k); if (typeof v !== "number" || !isFinite(v)) fail(); return v; }
      if (t.t === "lp") { const v = expr(); if (peek() && peek().t === "rp") next(); else if (peek()) fail(); return v; }   // a missing ")" at the very end is forgiven
      if (isOp(t, "sqrt")) { const v = postfix(); if (v < 0) fail(); return Math.sqrt(v); }
      if (t.t === "fn") { const a = postfix() * Math.PI / 180; const r = Math[t.v](a); return Math.abs(r) < 1e-12 ? 0 : r; }
      fail();
    }
    if (!tokens.length) fail();
    const v = expr();
    if (p < tokens.length) fail();
    if (!isFinite(v)) fail();
    return v;
  }
  const fmtNum = (v) => {
    if (typeof v !== "number" || !isFinite(v)) return "?";
    const a = Math.abs(v);
    let s = a === 0 ? "0" : a >= 1000 ? v.toFixed(0) : a >= 100 ? v.toFixed(1) : a >= 1 ? v.toFixed(2) : v.toPrecision(2);
    if (s.includes(".") && !/e/.test(s)) s = s.replace(/0+$/, "").replace(/\.$/, "");
    return s.replace("-", "−");
  };
  // timeline x position: ancient years are squeezed into a short stretch before a break
  function timeScale(years, x0, x1) {
    const ancient = years.some((y) => y < 1400), A = ancient ? 54 : 0;
    const lo = 1450, hi = 1900;
    return (y) => y < 1400 ? x0 + A * 0.45 : x0 + A + (x1 - x0 - A) * (Math.max(lo, Math.min(hi, y)) - lo) / (hi - lo);
  }
  const yearsText = (b, d) => b < 0 ? `${-b}–${-d} לפנה״ס` : `${b}–${d}`;

  // ======================================================================
  function create(o) {
    const { SYM, SYM_RE, symbolize, esc, laws, sfx = () => {}, live = () => ({}), closeInfo = () => {}, reduceMotion = false } = o;
    const DATA = laws, LAWS = DATA.laws, SCI = DATA.scientists;
    const lawById = (id) => LAWS.find((l) => l.id === id);
    const isSym = (k) => !!SYM[k];
    const symHtml = (k) => esc(k).replace(/_(\w+)$/, "<sub>$1</sub>");
    const shortName = (k) => { const n = (SYM[k] && SYM[k].n) || ""; return n.includes(":") ? n.split(":").pop().trim() : n; };

    // ---------------- panels stacked over everything (but under the symbol tips) ----------------
    const stack = [];
    let layer = null;
    let stopMovie = () => {};
    function render() {
      stopMovie(); stopMovie = () => {};
      const top = stack[stack.length - 1];
      if (!top) { if (layer) layer.remove(); layer = null; return; }
      if (!layer || !layer.isConnected) {
        layer = document.createElement("div"); layer.className = "ex-back"; layer.dir = "rtl";
        document.body.appendChild(layer);
        layer.addEventListener("click", (e) => { if (e.target === layer) closeAll(); });
      }
      layer.innerHTML = `<div class="ex-panel ${top.cls || ""}" role="dialog"><div class="ex-bar">
        ${stack.length > 1 ? `<button class="ex-nav" type="button" data-ex="back"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>חזרה</span></button>` : ""}
        <span class="ex-title"></span><button class="ex-x" type="button" data-ex="close" aria-label="סגור">×</button></div><div class="ex-body"></div></div>`;
      layer.querySelector(".ex-title").textContent = top.title || "";
      top.build(layer.querySelector(".ex-body"));
    }
    function push(p) { stack.push(p); render(); sfx(); }
    function back() { if (!stack.length) return false; stack.pop(); render(); return true; }
    function closeAll() { stack.length = 0; render(); }

    // ---------------- making names of laws and scientists tappable ----------------
    const SCI_WORDS = { archimedes: ["ארכימדס"], davinci: ["דה וינצ׳י", "לאונרדו"], stevin: ["סטווין"], galileo: ["גלילאו"], descartes: ["דקארט"], huygens: ["הויגנס"], leibniz: ["לייבניץ"], amontons: ["אמונטון"], coriolis: ["קוריוליס"], mayer: ["מאייר"], helmholtz: ["הלמהולץ"] };
    // (ניוטון, ג׳אול, קולון, אוהם are also names of units, so alone they stay plain text; inside a law's name they link)
    const LINKS = [];
    for (const l of LAWS) for (const a of l.aliases) LINKS.push({ a, kind: "law", id: l.id });
    for (const id in SCI_WORDS) for (const a of SCI_WORDS[id]) LINKS.push({ a, kind: "sci", id });
    LINKS.sort((x, y) => y.a.length - x.a.length);
    const LINK_RE = new RegExp(`(^|[^\\u05D0-\\u05EA׳'])([הובלשמ]?)(${LINKS.map((l) => l.a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?=$|[^\\u05D0-\\u05EA])`, "g");
    function linkify(root) {
      if (!root) return;
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
      while (w.nextNode()) { const n = w.currentNode; if (!n.parentElement.closest("button, a, em, sub, .sym, .lawlink")) nodes.push(n); }
      for (const n of nodes) {
        const t = n.nodeValue; LINK_RE.lastIndex = 0; if (!LINK_RE.test(t)) continue;
        const frag = document.createDocumentFragment(); let last = 0, m; LINK_RE.lastIndex = 0;
        while ((m = LINK_RE.exec(t))) {
          const start = m.index + m[1].length + m[2].length, L = LINKS.find((x) => x.a === m[3]);
          frag.append(t.slice(last, start));
          const b = document.createElement("button"); b.type = "button"; b.className = "lawlink " + L.kind;
          b.dataset[L.kind] = L.id; b.textContent = m[3]; frag.append(b);
          last = start + m[3].length;
        }
        frag.append(t.slice(last)); n.replaceWith(frag);
      }
    }
    // formula rows: a ▶ to play the explanation, law names become links
    function decorate(root) {
      if (!root) return;
      for (const eq of root.querySelectorAll(".eq")) {
        const lab = eq.querySelector("span:first-child"); if (lab && !lab.classList.contains("m")) linkify(lab);
        if (eq.querySelector(".m") && !eq.querySelector(".mv-play")) eq.insertAdjacentHTML("beforeend", `<button class="mv-play" type="button" data-movie aria-label="איך מגיעים לתוצאה?">▶</button>`);
      }
      for (const kf of root.querySelectorAll(".kf")) if (!kf.nextElementSibling || !kf.nextElementSibling.classList.contains("mv-play")) kf.insertAdjacentHTML("afterend", `<button class="mv-play wide" type="button" data-movie>▶ איך זה עובד?</button>`);
    }
    // the formula text of an element (subscripts as _x), and the number shown next to it
    function readFormula(el) {
      const c = el.cloneNode(true);
      c.querySelectorAll("em, .mv-play").forEach((x) => x.remove());
      c.querySelectorAll("sub").forEach((s) => s.replaceWith("_" + s.textContent));
      const em = el.querySelector("em");
      return { f: c.textContent.replace(/\s+/g, " ").trim(), result: em ? em.textContent.trim() : "" };
    }

    // ---------------- the formula movie ----------------
    const LIVE_KEY = { "μs": "mus", "μk": "muk", "θ": "deg", "ω": "w", k_eq: "keq", s_eq: "eq", f_k: "fk", v_avg: "vavg" };
    function valueOf(k, L) {
      if (k === "g") return 9.81;
      if (k === "π") return Math.PI;
      if (k === "mg") return typeof L.m === "number" ? L.m * 9.81 : undefined;
      const v = L[LIVE_KEY[k] || k];
      return typeof v === "number" && isFinite(v) ? v : undefined;
    }
    const OP_WORD = { mul: "כפול", div: "חלקי", add: "ועוד", sub: "פחות", pow: "בחזקת", sq: "בריבוע", cube: "בשלישית", sqrt: "שורש" };
    const OP_SHOW = { mul: "×", div: "÷", add: "+", sub: "−", pow: "^", sq: "²", cube: "³", sqrt: "√" };
    const FN_WORD = { sin: "סינוס", cos: "קוסינוס", tan: "טנגנס" };
    const REL_WORD = { "=": "שווה", "≤": "קטן או שווה ל-", "≥": "גדול או שווה ל-", "<": "קטן מ-", ">": "גדול מ-", "≈": "בערך", "∝": "יחסי ל-" };

    function openMovie(src) {
      closeInfo();
      const L = (() => { try { return live() || {}; } catch (e) { return {}; } })();
      push({ title: "איך מגיעים לתוצאה?", cls: "mv-panel", build: (body) => buildMovie(body, src, L) });
    }
    function buildMovie(body, src, L) {
      const toks = tokenize(src.f, SYM_RE, isSym);
      const ri = toks.findIndex((t) => t.t === "rel");
      const lhs = ri > 0 ? toks.slice(0, ri) : [], rel = ri > 0 ? toks[ri].v : "=", rhs = ri > 0 ? toks.slice(ri + 1) : toks;
      const ri2 = rhs.findIndex((t) => t.t === "rel"), calc = ri2 >= 0 ? rhs.slice(0, ri2) : rhs;
      const lhsKey = lhs.length === 1 && lhs[0].t === "sym" ? lhs[0].k : null;
      const lhsText = lhsKey ? symHtml(lhsKey) : esc(lhs.map(tokText).join(" ")) || "?";
      const lhsName = lhsKey ? shortName(lhsKey) : (src.label || "");
      let computed; try { computed = evaluate(calc, (k) => valueOf(k, L)); } catch (e) {}
      const unit = lhsKey && SYM[lhsKey] && SYM[lhsKey].u && SYM[lhsKey].u !== "—" ? " " + SYM[lhsKey].u : "";
      const result = src.result || (computed !== undefined ? fmtNum(computed) + unit : "");
      // numbers in place of the letters, when the screen knows them
      const subParts = []; let allKnown = true;
      calc.forEach((t, i) => {
        const pv = calc[i - 1];
        if (pv && ["num", "sym", "rp"].includes(pv.t) && (["num", "sym", "fn", "lp"].includes(t.t) || (t.t === "op" && t.v === "sqrt"))) subParts.push("×");   // 2π means 2 × π
        if (t.t === "sym") { const v = valueOf(t.k, L); if (v === undefined) { allKnown = false; subParts.push(t.k); } else subParts.push(t.k === "π" ? "3.14" : v < 0 ? `(${fmtNum(v)})` : fmtNum(v)); }
        else subParts.push(tokText(t, true));
      });
      const subLine = allKnown && calc.length ? subParts.join(" ").replace(/\( /g, "(").replace(/ \)/g, ")").replace(/√ /g, "√").replace(/ ([²³])/g, "$1").replace(/^− /, "−").replace(/\(− /g, "(−") : "";

      body.innerHTML = `
        <div class="mv" dir="ltr">
          <div class="mv-top"><div class="mv-card mv-lhs"><b class="mv-letter">${lhsText}</b><small dir="rtl">${esc(lhsName)}</small><span class="mv-val">?</span></div><span class="mv-rel">${esc(rel)}</span></div>
          <div class="mv-rhs">${rhs.map((t, i) => tokHtml(t, i, rhs, L)).join("")}</div>
          <div class="mv-sum" hidden></div>
          <svg class="mv-arrow" aria-hidden="true"><defs><marker id="mvHead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#8A60E8"/></marker></defs><path class="mv-line" d=""/></svg>
          <div class="mv-fly" hidden></div>
        </div>
        <div class="mv-cap" aria-live="polite"></div>
        <div class="mv-formula" dir="ltr">${esc(src.f).replace(/_(\w+)/g, "<sub>$1</sub>")}</div>
        <div class="mv-ctl" dir="ltr">
          <button class="mv-pp" type="button" aria-label="עצירה">❚❚</button>
          <div class="mv-track"><div class="mv-hold" hidden></div><input class="mv-seek" type="range" min="0" max="1000" step="1" value="0" aria-label="איפה בסרטון"></div>
          <button class="mv-speed" type="button" aria-label="מהירות"><span>1×</span></button>
        </div>
        <div class="ex-actions"><button class="btn secondary" type="button" data-ex="close">הבנתי</button></div>`;
      const cap = body.querySelector(".mv-cap"), mvEl = body.querySelector(".mv");
      const toksEl = [...body.querySelectorAll(".mv-tok")], lhsEl = body.querySelector(".mv-lhs"), lhsVal = lhsEl.querySelector(".mv-val");
      const sumEl = body.querySelector(".mv-sum"), line = body.querySelector(".mv-line"), fly = body.querySelector(".mv-fly");
      // the script: one beat per piece, then all together, then the arrow carries the answer over
      const beats = [];
      beats.push({ cap: lhsKey ? `רוצים לדעת כמה זה ${B(lhsKey.replace(/_/g, ""))}: ${lhsName}. בואו נראה מאיפה זה מגיע.` : "בואו נראה מאיפה זה מגיע.", do: () => lhsEl.classList.add("lit") });
      rhs.forEach((t, i) => {
        if (t.t === "lp" || t.t === "rp") return;
        const els = toksEl.filter((e) => +e.dataset.i === i);
        beats.push({ cap: tokCaption(t, i, rhs, L), do: () => { els.forEach((e) => e.classList.add("in")); toksEl.filter((e) => (e.dataset.paren !== undefined) && +e.dataset.open < i && +e.dataset.close > i).forEach((e) => e.classList.add("in")); } });
      });
      beats.push({ cap: subLine ? "עכשיו שמים מספרים במקום האותיות ומחשבים:" : "עכשיו מחשבים את הכול יחד:", do: () => {
        toksEl.forEach((e) => e.classList.add("in", "glow"));
        sumEl.hidden = false; sumEl.innerHTML = subLine ? `${esc(subLine)}${result ? ` <b>= ${esc(result)}</b>` : ""}` : (result ? `<b>= ${esc(result)}</b>` : "✓");
      }, long: true });
      beats.push({ cap: rel === "=" ? `החץ לוקח את התוצאה אל ${lhsKey ? B(lhsKey.replace(/_/g, "")) : "הצד השני"}${result ? `: ${B(result)}` : ""}. זהו!` : `ולכן ${lhsKey ? B(lhsKey.replace(/_/g, "")) : "הצד השמאלי"} ${REL_WORD[rel] || ""} מה שחישבנו.`, do: () => {}, long: true, arrow: true });

      // ---- a little video: a clock, a seek bar, pause, and quarter speeds ----
      const BEAT = 1650, LEAD = 250, FLY = 1100;
      let t0 = LEAD; beats.forEach((bt) => { bt.start = t0; t0 += bt.long ? BEAT * 1.5 : BEAT; });
      const total = t0;
      let t = 0, playing = !reduceMotion, speed = 1, applied = 0, geo = null, last = 0, resumeAt = 0, raf = 0, landed = false;
      const seek = body.querySelector(".mv-seek"), pp = body.querySelector(".mv-pp"), sp = body.querySelector(".mv-speed"), hold = body.querySelector(".mv-hold");
      function reset() {
        toksEl.forEach((e) => e.classList.remove("in", "glow")); lhsEl.classList.remove("lit", "got");
        lhsVal.textContent = "?"; sumEl.hidden = true; line.setAttribute("d", ""); fly.hidden = true; geo = null; landed = false; applied = 0;
      }
      function measure() {            // where the arrow starts and ends (after the sum line has appeared)
        const R = mvEl.getBoundingClientRect(), a = (sumEl.hidden ? body.querySelector(".mv-rhs") : sumEl).getBoundingClientRect(), b = lhsEl.getBoundingClientRect();
        const x1 = a.left + a.width / 2 - R.left, y1 = a.top - R.top + 2, x2 = b.left + b.width / 2 - R.left, y2 = b.bottom - R.top + 4;
        const cx = (x1 + x2) / 2 + (x2 < x1 ? -40 : 40), cy = Math.min(y1, y2) + (y1 - y2) * 0.15 - 10;
        const svg = body.querySelector(".mv-arrow"); svg.setAttribute("viewBox", `0 0 ${R.width} ${R.height}`);
        line.setAttribute("d", `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`); line.setAttribute("marker-end", "url(#mvHead)");
        const len = line.getTotalLength ? line.getTotalLength() : 200; line.style.strokeDasharray = len;
        fly.textContent = result; fly.hidden = false;
        return { x1, y1, x2, y2, cx, cy, len, fw: fly.offsetWidth, fh: fly.offsetHeight };
      }
      function paint() {
        let k = 0; while (k < beats.length && beats[k].start <= t) k++;
        if (k < applied) reset();
        for (; applied < k; applied++) beats[applied].do();
        cap.innerHTML = k ? esc(beats[k - 1].cap) : "&nbsp;";
        const lastB = beats[beats.length - 1];
        if (k === beats.length) {                                 // the arrow and the flying answer follow the clock, so they can be scrubbed too
          if (!geo) geo = measure();
          const p = Math.min(1, (t - lastB.start) / FLY), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          line.style.strokeDashoffset = geo.len * (1 - Math.min(1, e * 1.25));
          if (result && p < 1) { const q = e, x = (1 - q) * (1 - q) * geo.x1 + 2 * (1 - q) * q * geo.cx + q * q * geo.x2, y = (1 - q) * (1 - q) * geo.y1 + 2 * (1 - q) * q * geo.cy + q * q * geo.y2; fly.hidden = false; fly.style.transform = `translate(${x - geo.fw / 2}px, ${y - geo.fh / 2}px) scale(${1 + Math.sin(q * Math.PI) * 0.25})`; }
          else fly.hidden = true;
          if (p >= 1 && !landed) { landed = true; lhsVal.textContent = result || "✓"; lhsEl.classList.add("got"); if (playing) sfx(); }
          if (p < 1 && landed) { landed = false; lhsVal.textContent = "?"; lhsEl.classList.remove("got"); }
        }
        seek.value = Math.round(t / total * 1000);
        seek.style.setProperty("--p", (t / total * 100) + "%");
        pp.textContent = playing ? "❚❚" : "▶"; pp.setAttribute("aria-label", playing ? "עצירה" : "המשך");
      }
      function loop(now) {
        const dt = Math.min(100, now - (last || now)); last = now;
        if (resumeAt && now >= resumeAt) { resumeAt = 0; hold.hidden = true; if (t < total) playing = true; }
        else if (resumeAt) { hold.hidden = false; hold.textContent = `⏸ עצרנו לחשוב · ממשיך בעוד ${Math.ceil((resumeAt - now) / 1000)}`; }
        if (playing) { t = Math.min(total, t + dt * speed); if (t >= total) playing = false; }
        paint();
        raf = requestAnimationFrame(loop);
      }
      // the seek bar: dragging stops the video; letting go, it carries on by itself after a few seconds
      const grab = () => { playing = false; resumeAt = 0; hold.hidden = true; mvEl.classList.add("scrub"); };
      const drag = () => { grab(); t = +seek.value / 1000 * total; paint(); };
      const letGo = () => { mvEl.classList.remove("scrub"); if (t < total) resumeAt = performance.now() + 3000; };
      seek.addEventListener("pointerdown", grab); seek.addEventListener("touchstart", grab, { passive: true });
      seek.addEventListener("input", drag);
      seek.addEventListener("change", letGo); seek.addEventListener("pointerup", letGo); seek.addEventListener("touchend", letGo);
      pp.addEventListener("click", () => {
        resumeAt = 0; hold.hidden = true;
        if (playing) playing = false; else { if (t >= total) { t = 0; reset(); } playing = true; }
        paint();
      });
      // the round speed button, under the right thumb: 1 → ¾ → ½ → ¼ → 1
      const SPEEDS = [[1, "1×"], [0.75, "3/4"], [0.5, "2/4"], [0.25, "1/4"]];
      sp.addEventListener("click", () => {
        const i = (SPEEDS.findIndex((x) => x[0] === speed) + 1) % SPEEDS.length; speed = SPEEDS[i][0];
        sp.querySelector("span").textContent = SPEEDS[i][1]; sp.style.setProperty("--f", speed * 100 + "%");
        sp.classList.toggle("slow", speed < 1); sfx();
      });
      sp.style.setProperty("--f", "100%");
      if (reduceMotion) t = total;
      stopMovie = () => { cancelAnimationFrame(raf); };
      raf = requestAnimationFrame((now) => { last = now; loop(now); });
    }
    function tokText(t, numeric) {
      if (t.t === "num") return t.s;
      if (t.t === "sym") return t.k;
      if (t.t === "op") return numeric ? OP_SHOW[t.v] : t.s;
      if (t.t === "fn") return t.v;
      if (t.t === "lp") return "(";
      if (t.t === "rp") return ")";
      if (t.t === "rel") return t.v;
      return "const";
    }
    const leadingMinus = (t, i, arr) => t.t === "op" && t.v === "sub" && (i === 0 || ["op", "lp", "rel"].includes(arr[i - 1].t));
    function tokHtml(t, i, arr, L) {
      if (t.t === "lp" || t.t === "rp") {
        // find the partner so the brackets appear with what is inside them
        let depth = 0, j = i;
        if (t.t === "lp") { for (j = i; j < arr.length; j++) { if (arr[j].t === "lp") depth++; if (arr[j].t === "rp" && --depth === 0) break; } return `<span class="mv-tok mv-par" data-paren data-open="${i}" data-close="${j}">(</span>`; }
        for (j = i; j >= 0; j--) { if (arr[j].t === "rp") depth++; if (arr[j].t === "lp" && --depth === 0) break; }
        return `<span class="mv-tok mv-par" data-paren data-open="${j}" data-close="${i}">)</span>`;
      }
      if (t.t === "sym") {
        const v = valueOf(t.k, L), u = SYM[t.k] && SYM[t.k].u && SYM[t.k].u !== "—" ? SYM[t.k].u : "";
        return `<span class="mv-tok mv-card${t.k === "m" || t.k === "m1" || t.k === "m2" ? " mv-mass" : ""}" data-i="${i}"><b class="mv-letter">${symHtml(t.k)}</b><small dir="rtl">${esc(shortName(t.k) || t.k)}</small>${v !== undefined ? `<span class="mv-val">${esc(t.k === "π" ? "3.14" : fmtNum(v))}${u ? ` <i class="unit${/^c?m$/.test(u) ? " metre" : ""}">${esc(u)}</i>` : ""}</span>` : ""}</span>`;
      }
      if (t.t === "num") return `<span class="mv-tok mv-card mv-num" data-i="${i}"><b class="mv-letter">${esc(t.s)}</b><small dir="rtl">${t.s === "½" ? "חצי" : "מספר"}</small></span>`;
      if (t.t === "fn") return `<span class="mv-tok mv-card mv-fn" data-i="${i}"><b class="mv-letter">${t.v}</b><small dir="rtl">${FN_WORD[t.v]}</small></span>`;
      if (t.t === "op") return `<span class="mv-tok mv-op" data-i="${i}"><b>${OP_SHOW[t.v]}</b><small dir="rtl">${leadingMinus(t, i, arr) ? "מינוס" : OP_WORD[t.v]}</small></span>`;
      if (t.t === "rel") return `<span class="mv-tok mv-op" data-i="${i}"><b>${esc(t.v)}</b><small dir="rtl">${esc(REL_WORD[t.v] || "")}</small></span>`;
      return `<span class="mv-tok mv-op" data-i="${i}"><b>קבוע</b><small dir="rtl">לא משתנה</small></span>`;
    }
    const B = (x) => "\u2066" + x + "\u2069";              // keeps numbers, units and letters left-to-right inside Hebrew
    function tokCaption(t, i, arr, L) {
      const prev = arr[i - 1], nxt = arr[i + 1];
      const vs = (x) => { if (!x || x.t !== "sym") return x && x.t === "num" ? B(x.s) : ""; const v = valueOf(x.k, L); return B(v === undefined ? x.k : fmtNum(v)); };
      if (t.t === "sym") {
        if (t.k === "π") return "π (פאי) הוא מספר קבוע, בערך 3.14. הוא מופיע כשיש משהו שחוזר כמו סיבוב.";
        if (t.k === "g") return "g היא תאוצת הכובד: כדור הארץ מושך, וזה 9.81 בכל שנייה.";
        const v = valueOf(t.k, L), u = SYM[t.k] && SYM[t.k].u !== "—" ? SYM[t.k].u : "";
        return `${B(t.k.replace(/_/g, ""))} זה ${shortName(t.k) || "גודל"}${v !== undefined ? `. עכשיו: ${B(fmtNum(v) + " " + u)}` : ""}.`;
      }
      if (t.t === "num") return t.s === "½" ? "½ זה חצי: בסוף מחלקים ב-2." : `המספר ${t.s}.`;
      if (t.t === "fn") return `${FN_WORD[t.v]}: בודק איזה חלק מהכוח הולך בכיוון שלנו, לפי הזווית.`;
      if (t.t === "rel") return `${REL_WORD[t.v] || t.v}: זה גבול, לא תמיד שוויון.`;
      if (t.t === "word") return "קבוע: המספר הזה לא משתנה, מה שלא יקרה.";
      if (leadingMinus(t, i, arr)) return "המינוס אומר: הכיוון הפוך. הקפיץ מושך הפוך מהכיוון שמתחנו.";
      const chain = i >= 2 && arr[i - 2].t === "op" && ["mul", "div"].includes(arr[i - 2].v);
      const a = chain ? "מה שיצא עד עכשיו" : vs(prev), b = vs(nxt);
      switch (t.v) {
        case "mul": return a && b ? (chain ? `כפול: מכפילים את מה שיצא עד עכשיו ב-${b}.` : `כפול: לוקחים את ${a}, ${b} פעמים (${B(a + " × " + b)}).`) : "כפול: מגדילים פי כמה שכתוב.";
        case "div": return a && b ? `חלקי: מחלקים את ${a} ל-${b} חלקים שווים.` : "חלקי: מחלקים לחלקים שווים.";
        case "add": return "ועוד: מחברים יחד.";
        case "sub": return "פחות: מורידים.";
        case "sq": return a ? `בריבוע: כופלים את ${a} בעצמו (${B(a + " × " + a)}).` : "בריבוע: כופלים את המספר בעצמו.";
        case "cube": return "בשלישית: כופלים את המספר בעצמו שלוש פעמים.";
        case "pow": return "בחזקה: כופלים את המספר בעצמו כמה פעמים.";
        case "sqrt": return "שורש: מחפשים איזה מספר, כפול עצמו, נותן את מה שבפנים.";
      }
      return "";
    }

    // ---------------- law and scientist cards ----------------
    function lawFormulaHtml(l) {
      const t = tokenize(l.formula, SYM_RE, isSym), ri = t.findIndex((x) => x.t === "rel");
      const playable = ri === 1 && t[0].t === "sym" && t[ri].v === "=";
      return `<div class="law-f"><span class="m" dir="ltr">${esc(l.formula)}</span>${playable ? `<button class="mv-play wide" type="button" data-movie="${esc(l.formula)}">▶ איך זה עובד?</button>` : ""}</div>`;
    }
    function openLaw(id) {
      const l = lawById(id); if (!l) return;
      closeInfo();
      push({ title: "חוק בפיזיקה", cls: "law-panel", build: (body) => {
        body.innerHTML = `<h3 class="law-name">${esc(l.name)}</h3>
          <div class="law-when"><span class="tag">מתי?</span> ${esc(l.yearText)}</div>
          ${lawFormulaHtml(l)}
          <p class="law-simple">${esc(l.simple)}</p>
          <h4>למה היה צריך את זה?</h4><p>${esc(l.need)}</p>
          <h4>איך גילו?</h4><p>${esc(l.how)}</p>
          <h4>מי גילה?</h4>
          <ul class="law-events">${l.events.map((e) => `<li><b class="yr">${e.year < 0 ? -e.year + " לפנה״ס" : e.year}</b><button class="sci-chip" type="button" data-sci="${e.sci}">${esc(SCI[e.sci].full)}</button><span>${esc(e.what)}</span></li>`).join("")}</ul>
          <div class="ex-actions"><button class="btn secondary" type="button" data-ex="timeline">📈 ציר הזמן של כל החוקים</button></div>`;
        symbolize && body.querySelectorAll(".law-f .m").forEach(symbolize);
      } });
    }
    function openSci(id) {
      const s = SCI[id]; if (!s) return;
      closeInfo();
      const mine = LAWS.filter((l) => l.events.some((e) => e.sci === id));
      push({ title: "מי זה?", cls: "sci-panel", build: (body) => {
        body.innerHTML = `<div class="sci-head"><div class="sci-face" aria-hidden="true">${esc(s.name.replace(/[׳']/g, "").slice(0, 1))}</div>
            <div><h3>${esc(s.full)}</h3><div class="sci-years" dir="rtl">${esc(yearsText(s.born, s.died))} · ${esc(s.place)}</div></div></div>
          <div class="sci-role">${s.role.split(/,| ו/).map((r) => r.trim()).filter(Boolean).map((r) => `<span class="tag">${esc(r)}</span>`).join("")}</div>
          <p>${esc(s.bio)}</p>
          <div class="sci-fun"><b>הידעת?</b> ${esc(s.fun)}</div>
          <h4>מה גילה (מהחוקים שלנו)</h4>
          <div class="sci-laws">${mine.map((l) => `<button class="law-chip" type="button" data-law="${l.id}">${esc(l.name)} <small>${l.events.filter((e) => e.sci === id).map((e) => e.year < 0 ? -e.year + " לפנה״ס" : e.year).join(", ")}</small></button>`).join("")}</div>
          <div class="ex-actions"><button class="btn secondary" type="button" data-ex="timeline">📈 ציר הזמן</button></div>`;
      } });
    }

    // ---------------- the timeline: when (across) x who (down, א-ב) ----------------
    const COLORS = ["#258EF6", "#E2574C", "#25B58B", "#8A60E8", "#F49A35", "#D99A1C", "#1A9DB0", "#C2418F", "#5B6BD6", "#7A8B2A", "#B8741A", "#3F8F5A", "#9C4FD0", "#D0612F"];
    function openTimeline() {
      push({ title: "ציר הזמן של החוקים", cls: "tl-panel", build: (body) => {
        const evs = [];
        LAWS.forEach((l, li) => l.events.forEach((e) => evs.push({ ...e, law: l, color: COLORS[li % COLORS.length] })));
        const ids = [...new Set(evs.map((e) => e.sci))].sort((a, b) => SCI[a].name.localeCompare(SCI[b].name, "he"));
        const ROW = 44, TOPP = 26, AX = 30, H = TOPP + ids.length * ROW + AX;
        const PW = Math.max(760, (body.clientWidth || 360) - 100), X0 = 16, X1 = PW - 18;
        const X = timeScale(evs.map((e) => e.year), X0, X1), Y = (id) => TOPP + ids.indexOf(id) * ROW + ROW / 2;
        let svg = "";
        ids.forEach((id, i) => { if (i % 2 === 0) svg += `<rect x="0" y="${TOPP + i * ROW}" width="${PW}" height="${ROW}" fill="#F6F7F9"/>`; });
        for (const y of [1500, 1600, 1700, 1800, 1900]) svg += `<line x1="${X(y)}" x2="${X(y)}" y1="${TOPP}" y2="${H - AX}" stroke="#DFE1E4" stroke-dasharray="3 4"/><text x="${X(y)}" y="${H - AX + 18}" class="tl-year">${y}</text><text x="${X(y)}" y="16" class="tl-year">${y}</text>`;
        if (evs.some((e) => e.year < 1400)) { const xb = X0 + 44; svg += `<path d="M${xb - 4} ${H - AX - 6}l4 -8M${xb + 2} ${H - AX - 6}l4 -8" stroke="#9AA0A8" stroke-width="1.5"/><text x="${X(-250)}" y="${H - AX + 18}" class="tl-year">עת עתיקה</text>`; }
        svg += `<line x1="${X0}" x2="${X1}" y1="${H - AX}" y2="${H - AX}" stroke="#9AA0A8" stroke-width="1.3"/>`;
        // points: one per person and year (several laws in the same year share a point)
        const groups = {};
        evs.forEach((e) => { const g = e.sci + "|" + e.year; (groups[g] = groups[g] || []).push(e); });
        const placed = {};
        Object.values(groups).sort((a, b) => a[0].year - b[0].year).forEach((g) => {
          const e = g[0], x = X(e.year), y = Y(e.sci), row = (placed[e.sci] = placed[e.sci] || []);
          const near = row.filter((px) => Math.abs(px - x) < 46).length; row.push(x);
          const ly = near % 2 ? y + 19 : y - 11;
          const multi = [...new Set(g.map((q) => q.law.id))];
          const label = multi.length > 1 ? `${multi.length} חוקים` : e.law.short;
          const attr = multi.length > 1 ? `data-ex="pick" data-laws="${multi.join(",")}"` : `data-law="${e.law.id}"`;
          svg += `<g class="tl-pt" ${attr} role="button" tabindex="0"><circle cx="${x}" cy="${y}" r="13" fill="transparent"/><circle cx="${x}" cy="${y}" r="7" fill="${multi.length > 1 ? "#fff" : e.color}" stroke="${e.color}" stroke-width="2.5"/><text x="${x}" y="${ly}" class="tl-lab">${esc(label)}</text></g>`;
        });
        body.innerHTML = `<p class="fine">לרוחב: מתי גילו. לגובה: מי גילה (לפי א״ב). לחצו על נקודה כדי לקרוא על החוק, ועל שם כדי להכיר את המדען.</p>
          <div class="tl" dir="ltr">
            <div class="tl-scroll"><svg width="${PW}" height="${H}" viewBox="0 0 ${PW} ${H}">${svg}</svg></div>
            <div class="tl-names" style="padding-top:${TOPP}px;padding-bottom:${AX}px">${ids.map((id) => `<button type="button" class="tl-name" data-sci="${id}" style="height:${ROW}px" dir="rtl">${esc(SCI[id].name)}</button>`).join("")}</div>
          </div>
          <div class="tl-legend">${LAWS.map((l, li) => `<button type="button" class="law-chip" data-law="${l.id}"><i style="background:${COLORS[li % COLORS.length]}"></i>${esc(l.name)}</button>`).join("")}</div>`;
        const sc = body.querySelector(".tl-scroll");
        requestAnimationFrame(() => { sc.scrollLeft = Math.max(0, X(1560) - 10); });
      } });
    }
    function openPick(ids) {
      push({ title: "באותה שנה", build: (body) => {
        body.innerHTML = `<div class="sci-laws">${ids.map((id) => { const l = lawById(id); return `<button class="law-chip big" type="button" data-law="${id}">${esc(l.name)}</button>`; }).join("")}</div>`;
      } });
    }

    // ---------------- calculator ----------------
    const CALC_RE = /(ans|π|g)/;
    const calc = { expr: "", ans: 0, hist: [] };
    const KEYS = [["C", "⌫", "(", ")", "÷"], ["sin", "cos", "tan", "√", "×"], ["7", "8", "9", "x²", "−"], ["4", "5", "6", "^", "+"], ["1", "2", "3", "π", "g"], ["0", ".", "ans", "="]];
    const calcEval = (s) => evaluate(tokenize(s, CALC_RE), (k) => ({ ans: calc.ans, π: Math.PI, g: 9.81 })[k]);
    function openCalc() {
      if (stack.length && stack[stack.length - 1].cls === "calc-panel") return;
      push({ title: "מחשבון", cls: "calc-panel", build: (body) => {
        body.innerHTML = `<div class="calc-screen" dir="ltr"><div class="calc-hist"></div><div class="calc-expr"></div><div class="calc-prev"></div></div>
          <div class="calc-keys" dir="ltr">${KEYS.flat().map((k) => `<button type="button" class="ck ${/^\d|\.$/.test(k) ? "num" : k === "=" ? "eq" : k === "C" || k === "⌫" ? "clr" : "fn"}" data-k="${k}">${k === "x²" ? "x<sup>2</sup>" : k}</button>`).join("")}</div>
          <p class="fine calc-note">זוויות במעלות · <bdi dir="ltr">g = 9.81</bdi> · <bdi dir="ltr">ans</bdi> היא התוצאה הקודמת</p>`;
        const paint = () => {
          body.querySelector(".calc-expr").textContent = calc.expr || "0";
          let pv = ""; if (calc.expr) { try { const v = calcEval(calc.expr); if (String(fmtNum(v)) !== calc.expr) pv = "= " + fmtNum(v); } catch (e) {} }
          body.querySelector(".calc-prev").textContent = pv;
          body.querySelector(".calc-hist").innerHTML = calc.hist.slice(0, 3).map((h) => `<button type="button" data-h="${esc(h.v)}">${esc(h.e)} = <b>${esc(h.v)}</b></button>`).join("");
        };
        body.addEventListener("click", (e) => {
          const h = e.target.closest("[data-h]"); if (h) { calc.expr += h.dataset.h.replace("−", "-") ; paint(); return; }
          const b = e.target.closest("[data-k]"); if (!b) return;
          const k = b.dataset.k;
          if (k === "C") calc.expr = "";
          else if (k === "⌫") calc.expr = calc.expr.replace(/(sin\(|cos\(|tan\(|ans|√\(|.)$/, "");
          else if (k === "=") {
            try { const v = calcEval(calc.expr), s = fmtNum(v); calc.hist.unshift({ e: calc.expr, v: s }); calc.ans = v; calc.expr = s.replace("−", "-"); sfx(); }
            catch (err) { const ex = body.querySelector(".calc-expr"); ex.classList.remove("err"); void ex.offsetWidth; ex.classList.add("err"); return; }
          }
          else if (k === "sin" || k === "cos" || k === "tan") calc.expr += k + "(";
          else if (k === "√") calc.expr += "√(";
          else if (k === "x²") calc.expr += "²";
          else if (k === "−") calc.expr += "-";
          else calc.expr += k;
          paint();
        });
        paint();
      } });
    }

    // ---------------- clicks (called from ui.js's one capture listener) ----------------
    function handleClick(e) {
      const t = e.target;
      const ex = t.closest("[data-ex]");
      if (ex && layer && layer.contains(ex)) {
        e.preventDefault(); e.stopPropagation();
        const a = ex.dataset.ex;
        if (a === "close") closeAll(); else if (a === "back") back(); else if (a === "timeline") openTimeline();
        else if (a === "pick") openPick(ex.dataset.laws.split(","));
        return true;
      }
      const law = t.closest("[data-law]"); if (law) { e.preventDefault(); e.stopPropagation(); openLaw(law.dataset.law); return true; }
      const sci = t.closest("[data-sci]"); if (sci) { e.preventDefault(); e.stopPropagation(); openSci(sci.dataset.sci); return true; }
      const play = t.closest("[data-movie]");
      if (play && play.dataset.movie) { e.preventDefault(); e.stopPropagation(); openMovie({ f: play.dataset.movie, result: "" }); return true; }
      const host = play ? (play.closest(".eq") || play.parentElement) : null;
      const fEl = host ? (host.querySelector(".m, .kf") || host.parentElement.querySelector(".kf")) : t.closest(".formula .eq .m, .cloud .eqs div, .kcard .kf, .law-f .m");
      if (fEl) {
        e.preventDefault(); e.stopPropagation();
        const r = readFormula(fEl), eq = fEl.closest(".eq");
        r.label = eq && eq.querySelector("span:first-child") ? eq.querySelector("span:first-child").textContent.trim() : "";
        openMovie(r); return true;
      }
      return false;
    }

    return { handleClick, back, closeAll, decorate, linkify, openCalc, openLaw, openSci, openTimeline, isOpen: () => stack.length > 0 };
  }

  return { tokenize, evaluate, fmtNum, timeScale, create };
})();
if (typeof module !== "undefined") module.exports = EggExplain;
