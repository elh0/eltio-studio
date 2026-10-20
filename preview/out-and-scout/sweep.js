/* Sky Sweep: follow the sun's path for ten seconds, the phone traces the skyline,
   and the times when the sun is behind a roof or clear of it fall out of that line. */
(function () {
  var root = document.getElementById("sweep"); if (!root) return;
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var svg = document.getElementById("sw-v"), plan = document.getElementById("sw-plan"), cap = document.getElementById("sw-cap");
  var bGo = document.getElementById("sw-go"), bFix = document.getElementById("sw-fix"), bReset = document.getElementById("sw-reset");
  var W = 600, H = 400;
  // an example afternoon: 14:00 to sunset at 17:56, the sun low in the south-west
  var T0 = 14 * 60, T1 = 17 * 60 + 56;
  function sunAt(m) { var f = (m - T0) / (T1 - T0); return { az: 215 + 35 * f, alt: 22 * (1 - f) * (1 + .15 * f) }; }
  function hm(m) { m = Math.round(m); var h = Math.floor(m / 60), n = m % 60; return h + ":" + (n < 10 ? "0" : "") + n; }
  // the skyline as (azimuth, altitude): terrace roofs, chimneys, a tall block, a tree
  var BASE = [[200,3.2],[205,3.4],[206,5.2],[206.6,5.2],[207,3.4],[214,3.1],[218,3.6],[221,3.6],[221.2,4.6],[221.8,4.6],[222,3.6],
    [226.5,3.4],[226.6,12.4],[235.6,12.4],[235.7,3.2],[239.6,3.2],[240.2,5.2],[241.3,6.4],[242.6,6.1],[243.4,4.4],[243.8,3.0],
    [248,3.0],[251,2.6],[251.1,4.2],[251.8,4.2],[252,2.6],[260,2.8],[268,3.0]];
  var sky = BASE.map(function (p) { return p.slice(); });
  function skyAt(az) { for (var i = 1; i < sky.length; i++) if (az <= sky[i][0]) { var a = sky[i - 1], b = sky[i], t = (az - a[0]) / ((b[0] - a[0]) || 1); return a[1] + (b[1] - a[1]) * t; } return sky[sky.length - 1][1]; }
  function vis(m) { var s = sunAt(m); return s.alt > skyAt(s.az); }
  function read() {
    var L = [], prev = null, golden = null;
    for (var m = T0; m <= T1; m += .5) { var s = sunAt(m), v = s.alt > skyAt(s.az); if (golden === null && s.alt < 6) golden = m; if (prev !== null && v !== prev) L.push({ m: m, v: v }); prev = v; }
    var behind = null, clears = null, gone = null;
    L.forEach(function (e) { if (!e.v && behind === null && clears === null) behind = e.m; if (e.v && behind !== null && clears === null) clears = e.m; });
    for (var j = L.length - 1; j >= 0; j--) if (!L[j].v) { gone = L[j].m; break; }
    if (gone !== null && clears !== null && gone <= clears) gone = null;
    return { L: L, golden: golden, behind: behind, clears: clears, gone: gone };
  }
  var WIDE = { az: 234, alt: 9, k: 8.6 };
  // phones get a tighter window on the same sky, so the labels stay readable
  function size() { var n = matchMedia("(max-width: 599px)").matches; W = n ? 400 : 600; H = n ? 340 : 400; WIDE.az = n ? 236.5 : 234; svg.setAttribute("viewBox", "0 0 " + W + " " + H); }
  size();
  function P(v) { return function (az, alt) { return [(az - v.az) * v.k + W / 2, H * .62 - (alt - v.alt) * v.k]; }; }
  function line(p, from, to) { var d = ""; for (var m = from; m <= to; m += 2) { var s = sunAt(m), q = p(s.az, s.alt); d += (d ? " L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1); } return d; }
  function roof(p, upto) { var d = "M" + p(sky[0][0], sky[0][1]).join(" "); for (var i = 1; i < sky.length; i++) { if (upto !== undefined && sky[i][0] > upto) { d += " L" + p(upto, skyAt(upto)).join(" "); break; } d += " L" + p(sky[i][0], sky[i][1]).join(" "); } return d; }
  function ground(p) { var a = p(150, sky[0][1]), z = p(330, sky[sky.length - 1][1]), lo = p(330, -60), lo2 = p(150, -60); return "M" + a.join(" ") + " L" + roof(p).slice(1) + " L" + z.join(" ") + " L" + lo.join(" ") + " L" + lo2.join(" ") + " Z"; }
  function base(p, sunM) {
    var s = '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#sw-sky)"/>';
    if (sunM !== undefined) { var u = sunAt(sunM), q = p(u.az, u.alt); s += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + (p(4, 0)[0] - p(0, 0)[0]).toFixed(1) + '" fill="url(#sw-glow)"/>'; }
    s += '<path d="' + ground(p) + '" fill="#0B0A09"/>';
    // a few lit windows on the tall block
    var a = p(227.6, 11), b = p(234.6, 4.6), dx = (b[0] - a[0]) / 6, dy = (b[1] - a[1]) / 5;
    for (var i = 0; i < 6; i++) for (var j = 0; j < 5; j++) if ((i * 7 + j * 3) % 5) s += '<rect x="' + (a[0] + i * dx).toFixed(1) + '" y="' + (a[1] + j * dy).toFixed(1) + '" width="' + (dx * .4).toFixed(1) + '" height="' + (dy * .45).toFixed(1) + '" fill="rgba(239,237,230,.06)"/>';
    return s;
  }
  var DEFS = '<defs><linearGradient id="sw-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#11141a"/><stop offset=".6" stop-color="#2a2a2b"/><stop offset="1" stop-color="#4a3c31"/></linearGradient>' +
    '<radialGradient id="sw-glow"><stop offset="0" stop-color="#FF5A1F"/><stop offset=".22" stop-color="rgba(255,90,31,.55)"/><stop offset="1" stop-color="rgba(255,90,31,0)"/></radialGradient></defs>';
  function tag(p, m, txt, up, right) {
    var s = sunAt(m), q = p(s.az, s.alt), w = txt.length * 6.6 + 18, x = right ? q[0] + 8 : q[0] - w - 8, y = q[1] - up;
    return '<line x1="' + q[0].toFixed(1) + '" y1="' + q[1].toFixed(1) + '" x2="' + (right ? x : x + w).toFixed(1) + '" y2="' + (y + 10).toFixed(1) + '" stroke="rgba(239,237,230,.5)"/>' +
      '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="20" rx="10" fill="rgba(11,10,9,.82)" stroke="rgba(239,237,230,.2)"/>' +
      '<text x="' + (x + 9).toFixed(1) + '" y="' + (y + 13.6).toFixed(1) + '" class="sw-t">' + txt + '</text>';
  }
  var mode = "read", raf = 0, drag = null, run = null;
  function result() {
    var p = P(WIDE), R = read(), s = DEFS + base(p, R.clears || R.golden);
    s += '<path d="' + roof(p) + '" fill="none" stroke="#EFEDE6" stroke-width="1.4" vector-effect="non-scaling-stroke"/>';
    var m0 = T0, v = vis(T0);
    R.L.map(function (e) { return e.m; }).concat([T1]).forEach(function (c) {
      s += '<path d="' + line(p, m0, c) + '" fill="none" stroke="' + (v ? "#FF5A1F" : "rgba(239,237,230,.5)") + '" stroke-width="' + (v ? 2.4 : 1.2) + '"' + (v ? "" : ' stroke-dasharray="3 5"') + ' stroke-linecap="round"/>';
      m0 = c; v = !v;
    });
    if (R.behind !== null) s += tag(p, R.behind, "Behind " + hm(R.behind), 44, false);
    if (R.clears !== null) s += tag(p, R.clears, "Clears " + hm(R.clears), 46, true);
    if (R.gone !== null) s += tag(p, R.gone, "Gone " + hm(R.gone), 40, true);
    if (mode === "fix") sky.forEach(function (pt, i) {
      if (!i || i === sky.length - 1) return; var q = p(pt[0], pt[1]);
      s += '<circle class="sw-h" data-i="' + i + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="13" fill="transparent"/><circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3.6" fill="#0B0A09" stroke="#EFEDE6" stroke-width="1.3" pointer-events="none"/>';
    });
    svg.innerHTML = s;
    var bits = [];
    if (R.clears !== null) bits.push(["Be here", hm(R.clears - 6), ""], ["Sun clears", hm(R.clears), "o"]);
    bits.push(["Golden from", hm(R.golden), "o"]);
    if (R.gone !== null) bits.push(["Sun gone", hm(R.gone), ""]);
    bits.push(["Sunset", hm(T1), ""]);
    plan.innerHTML = bits.map(function (b) { return '<span><small class="mono q">' + b[0] + '</small><b class="' + b[2] + '">' + b[1] + "</b></span>"; }).join("");
    cap.textContent = R.clears !== null ? "“Be here at " + hm(R.clears - 6) + ", the sun clears the roof at " + hm(R.clears) + ".”" : "The sun stays clear of the roofs all afternoon.";
    svg.style.touchAction = mode === "fix" ? "none" : "pan-y";
  }
  function sweep() {
    cancelAnimationFrame(raf); mode = "sweep"; bFix.setAttribute("aria-pressed", "false"); bGo.setAttribute("aria-pressed", "true");
    plan.innerHTML = ""; cap.textContent = "Keep the sun's path in the ring.";
    if (RM) { mode = "read"; bGo.setAttribute("aria-pressed", "false"); result(); return; }
    var t0 = null, dur = 10000;
    function f(ts) {
      if (t0 === null) t0 = ts; var k = Math.min(1, (ts - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      var m = T0 + (T1 - T0) * e, s = sunAt(m), wob = Math.sin(ts / 260) * .35, v = { az: s.az + wob, alt: s.alt * .45 + Math.cos(ts / 330) * .25, k: 24 }, p = P(v);
      var o = DEFS + base(p, T0);
      o += '<path d="' + line(p, T0, T1) + '" fill="none" stroke="#FF5A1F" stroke-width="1.6" stroke-dasharray="2 6" stroke-linecap="round" opacity=".85"/>';
      o += '<path d="' + line(p, T0, m) + '" fill="none" stroke="#FF5A1F" stroke-width="2.4" stroke-linecap="round"/>';
      o += '<path d="' + roof(p, s.az + wob) + '" fill="none" stroke="#EFEDE6" stroke-width="1.8"/>';
      var c = p(s.az, s.alt);
      o += '<circle cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" r="30" fill="none" stroke="#EFEDE6" stroke-width="1.2"/><circle cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" r="2" fill="#EFEDE6"/>';
      o += '<text x="' + (W - 24) + '" y="74" text-anchor="end" class="sw-n">' + ("0" + Math.ceil(10 - 10 * k)).slice(-2) + ' s</text>';
      o += '<rect x="24" y="' + (H - 18) + '" width="' + (W - 48) + '" height="2" fill="rgba(239,237,230,.18)"/><rect x="24" y="' + (H - 18) + '" width="' + ((W - 48) * k).toFixed(1) + '" height="2" fill="#EFEDE6"/>';
      svg.innerHTML = o;
      if (k < 1 && mode === "sweep") raf = requestAnimationFrame(f);
      else if (mode === "sweep") { mode = "read"; bGo.setAttribute("aria-pressed", "false"); result(); }
    }
    raf = requestAnimationFrame(f);
  }
  bGo.addEventListener("click", sweep);
  bFix.addEventListener("click", function () { cancelAnimationFrame(raf); mode = mode === "fix" ? "read" : "fix"; bFix.setAttribute("aria-pressed", mode === "fix"); bGo.setAttribute("aria-pressed", "false"); result(); });
  bReset.addEventListener("click", function () { cancelAnimationFrame(raf); sky = BASE.map(function (p) { return p.slice(); }); if (mode === "sweep") mode = "read"; bGo.setAttribute("aria-pressed", "false"); result(); });
  function y(e) { var r = svg.getBoundingClientRect(); return (e.clientY - r.top) / r.height * H; }
  svg.addEventListener("pointerdown", function (e) {
    var h = e.target.closest && e.target.closest(".sw-h"); if (!h || mode !== "fix") return;
    drag = +h.dataset.i; run = [drag];
    // a flat roof moves as one piece
    for (var k = drag - 1; k > 0 && Math.abs(sky[k][1] - sky[drag][1]) < .05; k--) run.push(k);
    for (k = drag + 1; k < sky.length - 1 && Math.abs(sky[k][1] - sky[drag][1]) < .05; k++) run.push(k);
    try { svg.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault();
  });
  svg.addEventListener("pointermove", function (e) {
    if (drag === null) return; var alt = Math.max(0, Math.min(24, WIDE.alt - (y(e) - H * .62) / WIDE.k));
    run.forEach(function (k) { sky[k][1] = alt; }); result();
  });
  ["pointerup", "pointercancel"].forEach(function (t) { svg.addEventListener(t, function () { drag = null; }); });
  matchMedia("(max-width: 599px)").addEventListener("change", function () { size(); if (mode !== "sweep") result(); });
  result();
  // play the sweep once, the first time it comes into view
  var seen = false;
  new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !seen) { seen = true; sweep(); } }); }, { threshold: .5 }).observe(svg);
})();
