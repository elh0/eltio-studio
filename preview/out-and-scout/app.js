/* Out & Scout site: the app drawn in line, working. Layouts, words and behaviour follow the
   iPhone app (outline look, round 4). One shared state, so a shot taken in the viewfinder
   shows up in the Shot List and the PDF. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rad = Math.PI / 180, LAT = 51.269, LON = 0.205; // Knole Park, Sevenoaks
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function wrap(d) { return ((d % 360) + 540) % 360 - 180; }
  function n360(d) { return ((d % 360) + 360) % 360; }
  function f1(v) { return (Math.round(v * 10) / 10).toString(); }
  function hm(m) { m = Math.round(m); m = ((m % 1440) + 1440) % 1440; return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); }
  function U(n) { return 'calc(' + n + ' * var(--p))'; }
  function cap1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------------- the sun, for Knole Park, today ---------------- */
  function sunPos(t) {
    var d = t / 864e5 - 0.5 + 2440588 - 2451545, M = rad * (357.5291 + 0.98560028 * d);
    var L = M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI, e = rad * 23.4397;
    var dec = Math.asin(Math.sin(e) * Math.sin(L)), ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
    var H = rad * (280.16 + 360.9856235 * d) + rad * LON - ra, phi = rad * LAT;
    var alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
    var az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
    return { az: n360(az / rad + 180), el: alt / rad };
  }
  var LF = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function lparts(d) { var o = {}; LF.formatToParts(d).forEach(function (p) { o[p.type] = p.value; }); return o; }
  var LP = lparts(new Date()), G = Date.UTC(+LP.year, +LP.month - 1, +LP.day), GP = lparts(new Date(G));
  var MID = G - ((+GP.hour) * 60 + (+GP.minute)) * 6e4;
  function nowMin() { var p = lparts(new Date()); return (+p.hour) * 60 + (+p.minute); }
  var SAMP = []; for (var m0 = 0; m0 <= 1440; m0 += 2) SAMP.push(sunPos(MID + m0 * 6e4));
  function sunAt(m) {
    m = clamp(m, 0, 1440); var i = m / 2, a = Math.floor(i), b = Math.min(SAMP.length - 1, a + 1), f = i - a, A = SAMP[a], B = SAMP[b];
    return { az: n360(A.az + wrap(B.az - A.az) * f), el: A.el + (B.el - A.el) * f };
  }
  var RISE = null, SET = null;
  for (var i0 = 1; i0 < SAMP.length; i0++) {
    var e0 = SAMP[i0 - 1].el, e1 = SAMP[i0].el;
    if (e0 < -0.833 && e1 >= -0.833 && RISE === null) RISE = (i0 - 1) * 2 + 2 * (-0.833 - e0) / (e1 - e0);
    if (e0 >= -0.833 && e1 < -0.833) SET = (i0 - 1) * 2 + 2 * (e0 + 0.833) / (e0 - e1);
  }
  if (RISE === null || SET === null) { RISE = 420; SET = 1140; }
  function bands(lo, hi) { var out = [], s = null; for (var i = 0; i < SAMP.length; i++) { var e = SAMP[i].el, inb = e >= lo && e < hi; if (inb && s === null) s = i * 2; if (!inb && s !== null) { out.push([s, i * 2]); s = null; } } if (s !== null) out.push([s, 1440]); return out; }
  var GOLD = bands(-4, 6), BLUE = bands(-6, -4);
  function isGold(m) { var e = sunAt(m).el; return e >= -4 && e < 6; }
  var DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric' });
  function dateStr(daysAgo) { return DATE.format(new Date(Date.now() - (daysAgo || 0) * 864e5)); }

  /* ---------------- the light read (LightRead.swift) ---------------- */
  var KT = ['Backlit', '¾ backlit', 'Side lit', '¾ front lit', 'Front lit'];
  var KN = ['Backlit', 'Three-quarter back', 'Side lit', 'Three-quarter front', 'Front lit'];
  var KS = ['backlit', '¾ back', 'side lit', '¾ front', 'front lit'];
  var KL = ['B', '¾B', 'S', '¾F', 'F'];
  function cls(r) { var a = Math.abs(r); return a <= 30 ? 0 : a <= 75 ? 1 : a <= 105 ? 2 : a <= 150 ? 3 : 4; }
  function rel(az, h) { return wrap(az - h); }
  function readShort(r) { var k = cls(r), a = Math.abs(r); return a <= 8 || a >= 172 ? KT[k] : KT[k] + ' · ' + (r > 0 ? 'right' : 'left'); }
  function readLong(r) { var k = cls(r), a = Math.abs(r); return a <= 8 || a >= 172 ? KT[k] : KT[k] + ', sun on the ' + (r > 0 ? 'right' : 'left'); }
  function offAxis(r) { var a = Math.abs(r); return 'Sun ' + Math.round(a) + '° off the lens axis' + (a < 8 || a > 172 ? '' : r > 0 ? ' · sun camera right' : ' · sun camera left'); }
  function windows(h) { var out = []; for (var m = Math.ceil(RISE / 2) * 2; m <= SET; m += 2) { var k = cls(rel(sunAt(m).az, h)), L = out[out.length - 1]; if (L && L.k === k) L.b = m; else out.push({ a: m, b: m, k: k }); } return out; }
  function golden() { return GOLD.length ? GOLD[GOLD.length - 1] : null; }
  function best(h) {
    var g = golden(), gl = g ? cls(rel(sunAt((g[0] + g[1]) / 2).az, h)) : null;
    if (g && gl <= 2) return { a: g[0], b: g[1], k: gl, why: 'golden hour, ' + KS[gl] };
    var all = windows(h);
    for (var kk = 0; kk < 2; kk++) for (var j = 0; j < all.length; j++) {
      var w = all[j]; if (w.k !== kk || w.b - w.a < 20) continue;
      var s = w.a; while (s < w.b && sunAt(s).el < 6) s += 2;
      if (w.b - s < 20) continue;
      return { a: s, b: Math.min(w.b, s + 60), k: kk, why: KS[kk] + ', sun ' + Math.round(sunAt(s).el) + '° up' };
    }
    if (g) return { a: g[0], b: g[1], k: gl, why: 'golden hour, ' + KS[gl] };
    return null;
  }
  function spans(k, h) { var w = windows(h).filter(function (x) { return x.k === k && x.b - x.a >= 10; }); return w.length ? w.map(function (x) { return hm(x.a) + '–' + hm(x.b); }).join(', ') : null; }
  function facing(h) { return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(n360(h) / 45) % 8]; }
  function bearing(h) { var d = n360(h); return Math.round(d) % 360 + '° ' + ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(d / 45) % 8]; }
  function phase(el, m) { if (el < -6) return m < 720 ? 'before sunrise' : 'after dark'; if (el < -4) return 'blue hour'; if (el < 6) return 'golden hour'; if (m < 660) return 'morning'; if (m < 900) return 'midday'; return 'afternoon'; }
  function readAt(m, h) { var s = sunAt(m); return s.el <= -1 ? 'Sun down' : readShort(rel(s.az, h)); }

  /* ---------------- kit: ALEXA 35, 4.6K 3:2 Open Gate (28mm), Canon K35 ---------------- */
  var FOC = [18, 24, 35, 55, 85], SW = 28, SH = 28 / 1.5;
  var ARS = { '2.39': 2.39, '1.85': 1.85, '16:9': 16 / 9, '9:16': 9 / 16, '4:5': 0.8, '1:1': 1, '4:3': 4 / 3, '1.66': 1.66, '2:1': 2, '2.76': 2.76 };
  function arVal(a) { if (a === 'full') return null; if (ARS[a]) return ARS[a]; var p = String(a).split(':'); return p.length === 2 ? +p[0] / +p[1] : +a; }
  function fov(mm, ar, upright) {
    var W = SW, H = SH, r = arVal(ar); if (upright && (r === null || r < 1)) { W = SH; H = SW; }
    var sh = W / H, rr = r === null ? sh : r, fw = rr >= sh ? W : H * rr;
    return { hf: 2 * Math.atan(fw / (2 * mm)) / rad, r: rr };
  }
  function hfLens(mm) { return 2 * Math.atan(SW / (2 * mm)) / rad; }
  function phoneZoom(mm) { var z = Math.tan(34.7 * rad) / Math.tan(hfLens(mm) / 2 * rad); z = Math.round(z * 10) / 10; return (z === Math.round(z) ? String(z) : z.toFixed(1)) + '×'; }
  function shotSize(mm) { return mm < 36 ? 'wide' : mm < 76 ? 'mid' : 'long lens'; }

  /* ---------------- shared state ---------------- */
  var t5 = function (m) { return Math.round(m / 5) * 5; };
  var uid = 0; function nid() { return 'x' + (++uid); }
  function mk(n, cap, mm, ar, t, h, notes) { return { id: nid(), n: n, cap: cap, mm: mm, ar: ar, t: t, h: h, notes: notes || '' }; }
  var S = {
    projects: [
      { id: 'p1', name: 'First Recce', ago: 4, scenes: [
        { id: 's1', name: 'Knole Park', place: 'Knole Park, Sevenoaks', lat: 51.269, lon: 0.205, shots: [
          mk('1A', 'Wide · lone tree on the ridge', 32, '16:9', t5(SET - 150), 250, 'Deer about. Keep to the path.'),
          mk('1B', 'Long lens · two people on the ridge', 85, '2.39', t5(SET - 110), 261),
          mk('2A', 'Wide · the tree, golden hour', 18, '2.39', t5(SET - 30), 255, 'Be set up 40 minutes before sunset.')
        ] },
        { id: 's2', name: 'Fawke Common Road', place: 'Fawke Common Road, Sevenoaks', lat: 51.262, lon: 0.228, shots: [
          mk('1A', 'Mid · fence along the lane', 55, '16:9', t5(Math.max(RISE + 150, 660)), 75)
        ] }
      ] },
      { id: 'p2', name: 'Night Shift', ago: 6, scenes: [{ id: 's3', name: 'Scene 1', shots: [] }] }
    ],
    pid: 'p1', sid: 's1', lens: 35, ar: '2.39', landAr: null, custom: [], ov: { sun: true, grid: false, level: false },
    planned: null, heading: 258, justSaved: null, toast: null,
    tier: 'detailed', all: true, frames: true, sunT: true, notes: true, exported: null
  };
  (function () { var s = sunAt(nowMin()); if (s.el <= 2) S.planned = t5(SET - 35); })();
  var subs = [];
  function on(f) { subs.push(f); }
  var queued = false;
  function emit() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; subs.forEach(function (f) { f(); }); }); }
  function proj() { return S.projects.filter(function (p) { return p.id === S.pid; })[0] || S.projects[0]; }
  function scene(id) { var p = proj(); return p.scenes.filter(function (s) { return s.id === (id || S.sid); })[0] || p.scenes[0]; }
  function allShots(p) { return (p || proj()).scenes.reduce(function (a, s) { return a.concat(s.shots.map(function (x) { x.sc = s; return x; })); }, []); }
  function findShot(id) { var r = null; S.projects.forEach(function (p) { p.scenes.forEach(function (s) { s.shots.forEach(function (x) { if (x.id === id) { r = x; x.sc = s; } }); }); }); return r; }
  function planned() { return S.planned === null ? nowMin() : S.planned; }
  function nextNum(sc) { var mx = 0; sc.shots.forEach(function (x) { mx = Math.max(mx, parseInt(x.n, 10) || 0); }); return (mx + 1) + 'A'; }
  function stepLens(d) { var i = FOC.indexOf(S.lens); if (i < 0) i = 2; S.lens = FOC[clamp(i + d, 0, FOC.length - 1)]; }
  function toast(t) { S.toast = t; emit(); clearTimeout(toast.t); toast.t = setTimeout(function () { S.toast = null; emit(); }, 1800); }

  /* What the still would show, for the caption (the app asks Vision; here we know the drawing). */
  function captionFor(mm, h, m, hf) {
    var vis = function (a, pad) { return Math.abs(wrap(a - h)) < hf / 2 + (pad || 0); };
    var subj = vis(260.5) ? (vis(250) ? 'three people by the tree' : 'three people on the ridge') : vis(250) ? 'lone tree' : vis(330) ? 'house' : (vis(52) || vis(74) || vis(96)) ? 'telegraph pole' : Math.abs(wrap(75 - h)) < 42 ? 'fence' : Math.abs(wrap(178 - h)) < 42 ? 'tree line' : 'field';
    var s = sunAt(m), ph = phase(s.el, m), sunIn = s.el > -2 && vis(s.az), tb = '';
    if (ph === 'after dark' || ph === 'before sunrise') tb = ', night'; else if (ph === 'blue hour') tb = ', blue hour'; else if (ph === 'golden hour') tb = sunIn ? ', into the sun' : ', golden hour'; else if (sunIn) tb = ', into the sun';
    return cap1(shotSize(mm)) + ' · ' + subj + tb;
  }

  /* ---------------- the picture: a ridge in Knole Park, drawn in line all the way round ---------------- */
  function sky(a) {
    a = n360(a); var e = 0.9 + 0.35 * Math.sin(a * rad * 4) + 0.22 * Math.sin(a * rad * 11 + 1);
    var d = wrap(a - 262); e += 2.1 * Math.exp(-Math.pow(d / 13, 2));
    var dw = wrap(a - 178); if (Math.abs(dw) < 40) e += Math.pow(Math.cos(dw / 40 * Math.PI / 2), 0.6) * (1.5 + 0.55 * Math.abs(Math.sin(a * rad * 40)));
    return e;
  }
  function picture(o) {
    var w = o.w, h = o.h, H = o.heading, hf = o.hf, k = w / hf, ce = o.camEl == null ? 2.5 : o.camEl;
    function X(a) { return w / 2 + wrap(a - H) * k; } function Y(e) { return h / 2 - (e - ce) * k; }
    function vis(a, pad) { return Math.abs(wrap(a - H)) < hf / 2 + (pad || 0); }
    function P(a, e) { return f1(X(a)) + ' ' + f1(Y(e)); }
    var a0 = H - hf / 2 - 1, a1 = H + hf / 2 + 1, st = hf / 150, out = '';
    function line(fn, c, cond) { var d = '', pen = false; for (var a = a0; a <= a1 + 1e-9; a += st) { if (cond && !cond(a)) { pen = false; continue; } d += (pen ? 'L' : 'M') + f1(w / 2 + (a - H) * k) + ' ' + f1(Y(fn(a))); pen = true; } return d ? '<path class="' + c + '" d="' + d + '"/>' : ''; }
    var far = function (a) { return sky(a) * 0.5 + 1.7 + 0.3 * Math.sin(a * rad * 7); };
    out += line(far, 'zf', function (a) { return far(a) > sky(a) + 0.12; });
    out += line(sky, 'zw');
    out += line(function (a) { return -1.5 + 0.25 * Math.sin(a * rad * 6); }, 'zf');
    out += line(function (a) { return -5 + 0.6 * Math.sin(a * rad * 3 + 2); }, 'zf');
    // the track up to the ridge
    if (vis(266, 30)) {
      var b1 = sky(262.3) - 0.1, b2 = sky(263.1) - 0.1;
      out += '<path class="zw" d="M' + P(268, -16) + ' Q' + P(264, -4) + ' ' + P(262.3, b1) + ' M' + P(281, -16) + ' Q' + P(266, -4) + ' ' + P(263.1, b2) + '"/>';
    }
    // the lone oak
    if (vis(250, 6)) {
      var b = sky(250), x = X(250), cy = Y(b + 2.5), d = '';
      for (var i = 0; i <= 40; i++) { var t = i / 40 * 2 * Math.PI, r = 1 + 0.13 * Math.sin(9 * t) + 0.05 * Math.sin(4 * t); d += (i ? 'L' : 'M') + f1(x + Math.cos(t) * 1.6 * k * r) + ' ' + f1(cy + Math.sin(t) * 1.05 * k * r); }
      out += '<path class="zw" d="' + d + 'Z"/><path class="zw" d="M' + P(250, b) + ' L' + P(250, b + 1.6) + ' M' + P(250, b + 1.05) + ' L' + P(249.4, b + 1.75) + ' M' + P(250, b + 1.25) + ' L' + P(250.7, b + 1.9) + '"/>';
    }
    // three people on the ridge
    [259.6, 260.5, 261.4].forEach(function (a, i) {
      if (!vis(a, 2)) return; var b = sky(a) - 0.04, hh = 0.62 + (i === 1 ? 0.06 : 0), x = X(a);
      out += '<path class="zw" d="M' + P(a, b + 0.3) + ' L' + P(a, b + hh - 0.1) + ' M' + P(a, b + 0.3) + ' L' + P(a - 0.09, b) + ' M' + P(a, b + 0.3) + ' L' + P(a + 0.09, b) + ' M' + P(a - 0.13, b + hh - 0.27) + ' L' + P(a + 0.13, b + hh - 0.27) + '"/><circle class="zw" cx="' + f1(x) + '" cy="' + f1(Y(b + hh + 0.03)) + '" r="' + f1(Math.max(0.7, 0.085 * k)) + '"/>';
    });
    // telegraph poles and the fence along the lane
    var poles = [30, 52, 74, 96, 118];
    if (vis(74, 60)) {
      var pd = '', wd = '';
      poles.forEach(function (a, i) { pd += 'M' + P(a, -0.9) + ' L' + P(a, 3.6) + ' M' + P(a - 0.45, 3.2) + ' L' + P(a + 0.45, 3.2); if (i) { var p0 = poles[i - 1]; [-0.4, 0.4].forEach(function (o2) { wd += 'M' + P(p0 + o2, 3.2) + ' Q' + P((p0 + a) / 2 + o2, 2.5) + ' ' + P(a + o2, 3.2); }); } });
      out += '<path class="zw" d="' + pd + '"/><path class="zf" d="' + wd + '"/>';
      var fd = 'M' + P(36, -1.75) + ' L' + P(114, -1.75) + ' M' + P(36, -2.15) + ' L' + P(114, -2.15);
      for (var fa = 36; fa <= 114; fa += 2.2) fd += ' M' + P(fa, -2.45) + ' L' + P(fa, -1.55);
      out += '<path class="zf" d="' + fd + '"/>';
    }
    // the house on the far side
    if (vis(330, 6)) {
      var hb = sky(330) - 0.05;
      out += '<path class="zw" d="M' + P(328.2, hb) + ' L' + P(328.2, hb + 1) + ' L' + P(331.8, hb + 1) + ' L' + P(331.8, hb) + ' M' + P(327.9, hb + 1) + ' L' + P(330, hb + 1.8) + ' L' + P(332.1, hb + 1) + ' M' + P(330.9, hb + 1.4) + ' L' + P(330.9, hb + 1.95) + ' L' + P(331.2, hb + 1.95) + ' L' + P(331.2, hb + 1.28) + '"/>';
      out += '<path class="zf" d="M' + P(328.8, hb + 0.35) + ' h' + f1(0.5 * k) + ' v' + f1(-0.3 * k) + ' h' + f1(-0.5 * k) + 'Z M' + P(329.75, hb + 0.35) + ' h' + f1(0.5 * k) + ' v' + f1(-0.3 * k) + ' h' + f1(-0.5 * k) + 'Z M' + P(330.7, hb + 0.35) + ' h' + f1(0.5 * k) + ' v' + f1(-0.3 * k) + ' h' + f1(-0.5 * k) + 'Z"/>';
    }
    // the sun itself, as the camera would see it
    var s = sunAt(o.m);
    if (s.el > -1 && vis(s.az, 2)) out += '<circle class="zs" cx="' + f1(X(s.az)) + '" cy="' + f1(Y(s.el)) + '" r="' + f1(Math.max(o.thumb ? 1.6 : 3, 0.5 * k)) + '"/>';
    return out;
  }
  /* The sun path over the picture (SunPathOverlay): the day's line, golden hour in orange, a dot
     and label on each hour, the sun at the chosen time with Az/El, an edge arrow when it's off frame. */
  function sunPath(o) {
    var w = o.w, h = o.h, H = o.heading, hf = o.hf, k = w / hf, ce = o.camEl == null ? 2.5 : o.camEl;
    function X(a) { return w / 2 + wrap(a - H) * k; } function Y(e) { return h / 2 - (e - ce) * k; }
    var arc = '', gold = '', pen = false, gpen = false, dots = '', lim = Math.min(170, hf / 2 + 60);
    for (var m = 0; m <= 1440; m += 4) {
      var s = sunAt(m), r = wrap(s.az - H);
      if (s.el <= -8 || Math.abs(r) > lim) { pen = gpen = false; continue; }
      var x = X(s.az), y = Y(s.el), pt = f1(x) + ' ' + f1(y);
      arc += (pen ? 'L' : 'M') + pt; pen = true;
      if (s.el >= -4 && s.el < 6) { gold += (gpen ? 'L' : 'M') + pt; gpen = true; } else gpen = false;
      if (m % 60 === 0 && s.el > -4 && x >= 0 && x <= w && y >= 0 && y <= h) dots += '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="2" fill="rgba(243,243,240,.8)"/><text x="' + f1(x) + '" y="' + f1(y + 18) + '" class="zt" text-anchor="middle">' + ('0' + m / 60).slice(-2) + '</text>';
    }
    var out = '<path d="M0 ' + f1(Y(0)) + ' H' + w + '" stroke="rgba(243,243,240,.2)" stroke-width=".5" fill="none" vector-effect="non-scaling-stroke"/>';
    out += '<path d="' + arc + '" fill="none" stroke="rgba(243,243,240,.55)" stroke-width="1" vector-effect="non-scaling-stroke"/><path d="' + gold + '" fill="none" stroke="rgba(255,90,31,.85)" stroke-width="2" stroke-linecap="round"/>' + dots;
    var pm = o.m, s2 = sunAt(pm);
    if (o.nowRing && S.planned !== null) { var sn = sunAt(nowMin()), nx = X(sn.az), ny = Y(sn.el); if (nx > 0 && nx < w && ny > 0 && ny < h) out += '<circle cx="' + f1(nx) + '" cy="' + f1(ny) + '" r="7" fill="none" stroke="#FF5A1F" stroke-width="1.5"/>'; }
    if (s2.el < -1) {
      out += '<text x="' + w / 2 + '" y="20" class="zt" text-anchor="middle">Sun down at ' + hm(pm) + '</text>';
    } else {
      var sx = X(s2.az), sy = Y(s2.el);
      if (sx > -8 && sx < w + 8 && sy > -8 && sy < h + 8) {
        var label = 'Az ' + Math.round(s2.az) + '° · El ' + Math.round(s2.el) + '°', right = sx + 12 + label.length * 6.2 < w - 6, ly = clamp(sy, 12, h - 12);
        out += '<circle cx="' + f1(sx) + '" cy="' + f1(sy) + '" r="7" fill="#FF5A1F"/><text x="' + f1(right ? sx + 12 : sx - 12) + '" y="' + f1(ly + 3.5) + '" class="zr" text-anchor="' + (right ? 'start' : 'end') + '">' + label + '</text>';
      } else {
        var left = wrap(s2.az - H) < 0, ax = left ? 14 : w - 14, ay = h / 2;
        out += '<path fill="#FF5A1F" d="' + (left ? 'M' + (ax - 6) + ' ' + ay + ' L' + (ax + 4) + ' ' + (ay - 6) + ' L' + (ax + 4) + ' ' + (ay + 6) : 'M' + (ax + 6) + ' ' + ay + ' L' + (ax - 4) + ' ' + (ay - 6) + ' L' + (ax - 4) + ' ' + (ay + 6)) + 'Z"/><text x="' + (left ? ax + 10 : ax - 10) + '" y="' + (ay + 20) + '" class="zt" text-anchor="' + (left ? 'start' : 'end') + '">Sun ' + Math.round(s2.az) + '°</text>';
      }
    }
    return out;
  }
  function frameSVG(w, h, o) {
    o.w = w; o.h = h;
    var g = '';
    if (o.grid) g += '<path d="M' + f1(w / 3) + ' 0V' + h + 'M' + f1(2 * w / 3) + ' 0V' + h + 'M0 ' + f1(h / 3) + 'H' + w + 'M0 ' + f1(2 * h / 3) + 'H' + w + '" stroke="rgba(243,243,240,.35)" stroke-width=".5" fill="none" vector-effect="non-scaling-stroke"/>';
    if (o.level) g += '<path d="M' + f1(w / 2 - 80) + ' ' + f1(h / 2) + 'h160" stroke="rgba(243,243,240,.9)" stroke-width="1" vector-effect="non-scaling-stroke"/><path d="M' + f1(w / 2 - 20) + ' ' + f1(h / 2) + 'h40" stroke="rgba(243,243,240,.35)" stroke-width="1"/>';
    return '<svg viewBox="0 0 ' + f1(w) + ' ' + f1(h) + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="' + f1(w) + '" height="' + f1(h) + '" fill="#161614"/>' + picture(o) + g + (o.path ? sunPath(o) : '') + '</svg>';
  }
  /* A shot's still in a box, cropped to its frame lines like ShotThumb. */
  function still(x, bw, bh) {
    var f = fov(x.mm, x.ar, false), br = bw / bh, hf = br >= f.r ? f.hf : f.hf * br / f.r;
    return frameSVG(bw, bh, { heading: x.h, hf: hf, m: x.t, thumb: true });
  }

  /* ---------------- a small DOM patcher, so transitions and inputs survive a re-render ---------------- */
  function patch(par, html) { var t = document.createElement('template'); t.innerHTML = html; sync(par, t.content); }
  function sync(a, b) {
    var an = Array.prototype.slice.call(a.childNodes), bn = Array.prototype.slice.call(b.childNodes);
    for (var i = 0; i < bn.length; i++) {
      var x = an[i], y = bn[i];
      if (!x) { a.appendChild(y); continue; }
      if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName || (x.nodeType === 1 && x.getAttribute('data-k') !== y.getAttribute('data-k'))) { a.replaceChild(y, x); continue; }
      if (x.nodeType !== 1) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
      var xa = x.attributes, j;
      for (j = xa.length - 1; j >= 0; j--) if (!y.hasAttribute(xa[j].name)) x.removeAttribute(xa[j].name);
      for (j = 0; j < y.attributes.length; j++) { var at = y.attributes[j]; if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value); }
      if (x.tagName === 'INPUT') continue;
      sync(x, y);
    }
    for (var k = an.length - 1; k >= bn.length; k--) a.removeChild(an[k]);
  }
  function scaleOn(el, base) { var ro = new ResizeObserver(function () { el.style.setProperty('--p', (el.clientWidth / base) + 'px'); }); ro.observe(el); el.style.setProperty('--p', (el.clientWidth / base || 1) + 'px'); }
  // the two widgets draw at 360 wide on a phone, 640 otherwise, so their type stays readable
  function narrowOf(el) { return el.clientWidth > 0 && el.clientWidth < 560; }
  function onNarrow(el, fn) { var was = narrowOf(el); new ResizeObserver(function () { var n = narrowOf(el); if (n !== was) { was = n; fn(); } }).observe(el); }
  function seen(el, fn) { new IntersectionObserver(function (es) { es.forEach(function (e) { fn(e.isIntersecting); }); }, { rootMargin: '120px 0px' }).observe(el); }
  function busyTyping(host) { var a = document.activeElement; return a && a.tagName === 'INPUT' && host.contains(a); }

  /* ---------------- common bits ---------------- */
  function pill(label, o) { o = o || {}; return '<button type="button" class="op ' + (o.size || '') + (o.on ? ' on' : '') + (o.caps ? ' c' : '') + '"' + (o.a ? ' data-a="' + o.a + '"' : '') + (o.v != null ? ' data-v="' + esc(o.v) + '"' : '') + (o.style ? ' style="' + o.style + '"' : '') + (o.label ? ' aria-label="' + esc(o.label) + '"' : '') + '>' + esc(label) + '</button>'; }
  var WM = 'Out &amp; Sc<i class="sd"></i>out';
  function thumbBox(x, w, h, r, extra) { return '<span class="thumb" style="width:' + U(w) + ';height:' + U(h) + ';border-radius:' + U(r) + ';' + (extra || '') + '">' + (x ? still(x, w, h) : '') + '</span>'; }
  /* The day's line (SunTimeline): golden hour in orange, sunrise and sunset ticked, a white NOW mark,
     the orange sun you drag. Compact for the folded bar. */
  function timeline(compact, inline) {
    var lo = Math.max(0, RISE - 60), hi = Math.min(1440, SET + 60), sp = hi - lo, X = function (m) { return clamp((m - lo) / sp, 0, 1) * 100; };
    var ly = compact ? 12 : 16, nw = nowMin(), at = planned(), moved = S.planned !== null, o = '<span class="ln" style="top:' + U(ly) + '"></span>';
    GOLD.forEach(function (g) { var a = X(g[0]), b = X(g[1]); if (b > a) o += '<span class="gd" style="left:' + a + '%;width:' + (b - a) + '%;top:' + U(ly - 1) + '"></span>'; });
    [RISE, SET].forEach(function (m) { o += '<span class="tk" style="left:' + X(m) + '%;top:' + U(ly - 4) + '"></span>'; if (!compact && Math.abs(X(m) - X(nw)) > 12) o += '<span class="lb f8 mu" style="left:' + clamp(X(m), 4, 96) + '%;top:' + U(25) + '">' + hm(m) + '</span>'; });
    if (nw >= lo && nw <= hi) { o += '<span class="nw" style="left:' + X(nw) + '%;top:' + U(ly - 8) + '"></span>'; if (!compact) o += '<span class="lb f8" style="left:' + clamp(X(nw), 9, 91) + '%;top:' + U(25) + ';letter-spacing:.05em">NOW ' + hm(nw) + '</span>'; }
    o += '<span class="kn" style="left:' + clamp(X(at), 1.2, 98.8) + '%;top:' + U(ly) + '"></span>';
    if (moved && !compact) o += '<span class="lb f9 sunc" style="left:' + clamp(X(at), 5, 95) + '%;top:' + U(-6) + '">' + hm(at) + '</span>';
    return '<div class="tl" data-d="tl" role="slider" aria-label="time of day" aria-valuetext="' + hm(at) + '" tabindex="0" style="height:' + U(compact ? 24 : 38) + (inline ? '' : ';flex:none;width:100%') + '">' + o + '</div>';
  }
  function tlDrag(e, el) { var b = el.getBoundingClientRect(), lo = Math.max(0, RISE - 60), hi = Math.min(1440, SET + 60); S.planned = t5(lo + clamp((e.clientX - b.left) / b.width, 0, 1) * (hi - lo)); }
  function lightNow() {
    var at = planned(), moved = S.planned !== null, g = isGold(at);
    return '<span class="f10 cap' + (g ? ' sunc' : '') + '" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (moved ? 'At ' + hm(at) : 'Now') + ' · ' + esc(readAt(at, S.heading)) + '</span>' + (moved ? '<button class="f10 cap mu ul" data-a="now" style="white-space:nowrap">↺ Now</button>' : '');
  }
  var GRIP = '<svg viewBox="0 0 13 10"><path d="M0 1h13M0 5h13M0 9h13" stroke="#8C8A83" stroke-width="1.4"/></svg>';
  function keyAct(host, fn) { host.addEventListener('keydown', function (e) { var t = e.target.closest && e.target.closest('[data-d="tl"]'); if (!t) return; if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { S.planned = t5(planned() + (e.key === 'ArrowRight' ? 15 : -15)); emit(); e.preventDefault(); } }); }

  /* ======================= the viewfinder (and the start screen) ======================= */
  function Viewfinder(host, cfg) {
    var st = { L: cfg.portrait ? 'P' : 'L', scr: cfg.start ? 'launch' : 'cam', pre: true, pop: null, hidden: false, picked: null, naming: false, cap: false, shutDown: false, blink: 0, turning: false, area: null, vis: false, dirty: true, side: null, nameScene: null };
    var ph = document.createElement('div'); ph.className = 'ph ' + st.L; host.appendChild(ph);
    // opened upright (the phone layout of the page): a wide ratio becomes 9:16, as when the app goes to portrait
    if (cfg.portrait) { var r0 = arVal(S.ar); if (S.ar !== 'full' && r0 > 1.01) { S.landAr = S.ar; S.ar = '9:16'; } }
    var timers = [];
    function later(ms, f) { timers.push(setTimeout(f, ms)); }
    function upright() { return st.L === 'P'; }
    function guessArea() { return upright() ? { w: 350, h: 388 } : st.hidden ? { w: 638, h: 361 } : { w: 574, h: 281 }; }
    function frameRect(a, r) { var fw, fh; if (r >= a.w / a.h) { fw = a.w; fh = a.w / r; } else { fh = a.h; fw = a.h * r; } return { x: (a.w - fw) / 2, y: (a.h - fh) / 2, w: fw, h: fh }; }
    function frameHTML() {
      var a = st.area || guessArea(), f = fov(S.lens, S.ar, upright()), fr = frameRect(a, f.r), m = planned();
      var svg = frameSVG(fr.w, fr.h, { heading: S.heading, hf: f.hf, m: m, path: S.ov.sun, grid: S.ov.grid, level: S.ov.level, nowRing: true });
      var chip = '';
      if (upright()) { var s = sunAt(m); chip = '<span class="chipl f9 cap" style="left:' + U(8) + ';bottom:' + U(8) + '">' + esc(s.el <= -1 ? 'Sun down' : readLong(rel(s.az, S.heading))) + '</span>'; }
      return '<div class="fr" data-d="look" style="left:' + U(fr.x) + ';top:' + U(fr.y) + ';width:' + U(fr.w) + ';height:' + U(fr.h) + ';outline:1px solid #ECEBE6;outline-offset:-1px">' + svg + chip + '<span class="blink' + (st.blink ? ' on' : '') + '" data-k="b' + st.blink + '"></span></div>';
    }
    function crumb(withProject) { var s = (withProject ? short(proj().name, 18) + ' / ' : '') + scene().name + ' · facing ' + facing(S.heading); return esc(s.toUpperCase()); }
    function short(n, mx) { return n.length > mx ? n.slice(0, mx - 1) + '…' : n; }
    function count() { return allShots().length; }
    function last() { var sc = scene(); return sc.shots[sc.shots.length - 1] || allShots()[allShots().length - 1]; }
    function ratios() { return upright() ? ['9:16', '4:5', '1:1', '16:9'] : ['2.39', '1.85', '16:9', '9:16'].concat(S.custom); }
    function ratioPills(sz) { return ratios().map(function (r) { return pill(r, { on: S.ar === r, a: 'ar', v: r, size: sz }); }).join('') + pill('+', { a: 'custom', size: sz, label: 'more frame shapes' }); }
    function savedChip(top) {
      var x = S.justSaved ? findShot(S.justSaved) : null;
      return '<div class="chip-top' + (x ? '' : ' gone') + '" style="top:' + U(top) + '">' + (x ? '<button class="saved f11" data-a="editcap"><span class="dot"></span><b>' + esc(x.n + ' · ' + (x.cap || 'Captioning…')) + '</b><span class="ed">Edit</span></button>' : '') + '</div>';
    }
    function nameBar(top) {
      if (st.cap && S.justSavedEdit) { var x = findShot(S.justSavedEdit); if (x) return '<div class="namebar" style="top:' + U(top) + '"><div class="hd f10"><span>Caption ' + esc(x.n) + '</span><button class="f11" data-a="capcancel">Cancel</button></div><div class="row"><input class="f12" data-in="cap" value="' + esc(x.cap) + '" enterkeyhint="done" aria-label="Caption"><button class="chp f11" data-a="capdone">Done</button></div></div>'; }
      if (st.nameScene) { var sc = scene(st.nameScene); return '<div class="namebar" style="top:' + U(top) + '"><div class="hd f10"><span>Name This Scene</span><span style="display:flex;gap:' + U(12) + '"><button class="f11" data-a="nscancel">Cancel</button><button class="f11" data-a="nskeep" style="color:#F3F3F0">Keep "' + esc(sc.name) + '"</button></span></div><div class="row"><input class="f12" data-in="scene" placeholder="Name this scene" enterkeyhint="done" aria-label="Scene name">' + ['Duchess Walk', 'studio', 'interior', 'field'].map(function (n) { return '<button class="chp f11 sans" data-a="nspick" data-v="' + n + '">' + n + '</button>'; }).join('') + '</div></div>'; }
      return '';
    }
    function customCard() {
      if (st.pop !== 'custom') return '';
      return '<div class="sheetc"><span class="f10" style="color:#66665F">Custom aspect · saved to your kit</span><div class="chs f12">' + ['4:3', '1.66', '2:1', '1:1', '2.76'].map(function (r) { return '<button data-a="addar" data-v="' + r + '">' + r + '</button>'; }).join('') + '</div><div style="display:flex;gap:' + U(8) + '"><input data-in="ar" placeholder="Aspect ratio, e.g. 2.2 or 4:3" aria-label="Aspect ratio"><button class="pb f12" data-a="addtyped">Add</button><button class="pb f12" data-a="pop" data-v="">Close</button></div></div>';
    }
    function sidePanel() {
      var p = proj(), o = '';
      if (st.side === 'projects') {
        o = '<span class="wm" style="font-size:' + U(17) + ';margin-bottom:' + U(14) + '">' + WM + '</span><div class="sc f10 cap mu"><span>Projects</span><button class="ul" data-a="side" data-v="">Done</button></div>';
        S.projects.forEach(function (q) { var n = allShots(q).length; o += '<button class="sc" data-a="pickp" data-v="' + q.id + '" style="border-top:1px solid #2A2926;min-height:' + U(40) + '"><span class="f12">' + esc(q.name) + (q.id === S.pid ? ' <span class="sunc">●</span>' : '') + '</span><span class="f10 mu">' + q.scenes.length + ' sc · ' + n + '</span></button>'; if (q.id === S.pid) q.scenes.forEach(function (s) { o += '<button class="sc f11' + (s.id === S.sid ? '' : ' mu') + '" data-a="picks" data-v="' + s.id + '" style="padding-left:' + U(14) + '"><span>' + esc(s.name) + '</span><span class="f11 mu">' + s.shots.length + '</span></button>'; }); });
        o += '<button class="sc f11 mu" data-a="restart" style="border-top:1px solid #2A2926;min-height:' + U(40) + '">+ New project</button>';
      } else if (st.side === 'scenes') {
        o = '<div class="sc"><span class="sans" style="font-size:' + U(15) + '">' + esc(p.name) + '</span><button class="f11 ul" data-a="side" data-v="">Done</button></div><span class="f10 cap mu" style="margin-top:' + U(6) + '">Scenes</span>';
        p.scenes.forEach(function (s) { o += '<button class="sc f10' + (s.id === S.sid ? '' : ' mu') + '" data-a="picks" data-v="' + s.id + '"><span>' + esc(s.name) + '</span><span class="f9 mu">' + s.shots.length + '</span></button>'; });
        o += '<button class="sc f10 mu" data-a="newscene" style="min-height:' + U(32) + '">+ Scene</button>';
      }
      return '<div class="side' + (st.side ? '' : ' off') + '">' + o + '</div>';
    }
    function camL() {
      var hid = st.hidden, x = last(), lad = '';
      if (st.pop === 'lens') lad = '<div class="pop lad" style="right:' + U(82) + ';top:' + U(4) + '"><span class="f8 cap mu" style="text-align:center;padding-bottom:' + U(4) + '">Phone ' + phoneZoom(S.lens) + '</span>' + FOC.map(function (f) { return '<button class="f11' + (f === S.lens ? ' on' : ' mu') + '" data-a="lens" data-v="' + f + '"><i></i>' + f + '</button>'; }).join('') + '</div>';
      var rp = st.pop === 'ratio' ? '<div class="pop" style="left:' + U(88) + ';bottom:' + U(42) + ';display:flex;gap:' + U(7) + ';padding:' + U(8) + ' ' + U(12) + '">' + ratioPills('') + '</div>' : '';
      var tg = st.pop === 'tog' ? '<div class="pop" style="left:' + U(82) + ';bottom:' + U(4) + '">' + togs() + '<button class="tgl f10" data-a="turn" style="color:#8A8A83">↻ Portrait</button></div>' : '';
      return '<div class="sa vf-l">' +
        '<div class="rail" style="left:' + U(12) + ';' + (hid ? 'opacity:0;pointer-events:none' : '') + '"><div class="row">' + pill(sceneNo(), { size: 's', a: 'side', v: 'scenes', label: 'scenes, on ' + scene().name }) + '</div><div class="row">' + pill('···', { size: 's', a: 'pop', v: 'tog', label: 'sun path, grid and level' }) + '</div></div>' +
        '<div class="mid" style="' + (hid ? 'left:' + U(24) + ';gap:0' : '') + '">' +
          '<div class="bar f10 cap" style="position:relative;' + (hid ? 'height:0;opacity:0;overflow:hidden' : '') + '"><button data-a="side" data-v="projects">Projects</button><span class="mu" style="position:absolute;left:' + U(110) + ';right:' + U(110) + ';text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none">' + crumb(true) + '</span><span style="flex:1"></span><span class="mu">ALEXA 35</span><span class="mu">' + hm(nowMin()) + '</span></div>' +
          '<div class="area" data-area="1">' + frameHTML() + '</div>' +
          (hid ? '' : '<div class="bar">' + pill((S.ar === 'full' ? 'Full' : S.ar) + ' ▾', { size: 's', a: 'pop', v: 'ratio', label: 'frame shape' }) + '<span style="display:flex;gap:' + U(10) + ';align-items:center;min-width:0;flex:none;max-width:' + U(220) + '">' + lightNow() + '</span>' + timeline(true, true) + pill('Hide', { size: 's', caps: true, a: 'hide' }) + '</div>') +
        '</div>' +
        '<div class="rail" style="right:' + U(12) + '"><div class="row">' + (hid ? '' : '<span class="lchip" data-d="lens" data-a="pop" data-v="lens" role="button" tabindex="0" aria-label="lens ' + S.lens + ' millimetres"><b>' + S.lens + '</b><span class="f8 mu">' + (st.pop === 'lens' ? 'MM▴' : 'MM▾') + '</span></span>') + '</div>' +
          '<button class="shut' + (st.shutDown ? ' down' : '') + '" data-a="shut" aria-label="take shot ' + nextNum(scene()) + '"><i></i></button>' +
          '<div class="row">' + (hid ? pill('Show', { size: 's', caps: true, a: 'hide' }) : '<button class="stack-wrap" data-a="shots" aria-label="shot list, ' + count() + ' shots"><span class="badge f8">' + count() + '</span>' + thumbBox(x, 32, 32, 7, 'border:1px solid rgba(236,235,230,.42)') + '</button>') + '</div></div>' +
        lad + rp + tg + savedChip(52) + nameBar(8) + customCard() + '</div>' + sidePanel();
    }
    function togs() { return [['sun', 'Sun Path'], ['grid', 'Grid'], ['level', 'Level']].map(function (t) { return '<button class="tgl f10' + (S.ov[t[0]] ? '' : ' mu') + '" data-a="ov" data-v="' + t[0] + '"><span class="tick' + (S.ov[t[0]] ? ' on' : '') + '"></span>' + t[1] + '</button>'; }).join(''); }
    function sceneNo() { var p = proj(), i = 0; p.scenes.forEach(function (s, j) { if (s.id === S.sid) i = j; }); return ('0' + (i + 1)).slice(-2); }
    function camP() {
      var p = proj(), x = last(), moved = S.planned !== null, at = planned(), g = isGold(at);
      return '<div class="sa vf-p"><div class="col">' +
        '<div class="r" style="height:' + U(40) + '"><button class="f11" data-a="side" data-v="projects">Projects</button><button class="f11' + (moved ? ' sunc' : ' mu') + '" data-a="now">' + (moved ? '→ ' + hm(at) : hm(nowMin())) + '</button></div>' +
        '<div class="r" style="height:' + U(30) + '"><span class="f10 cap mu" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + crumb(false) + '</span><button class="f10 mu" data-a="turn" style="white-space:nowrap">↻ Landscape</button></div>' +
        '<div class="r" style="height:' + U(40) + ';justify-content:flex-start"><span class="pills">' + p.scenes.map(function (s) { return pill(s.name, { size: 's', on: s.id === S.sid, a: 'picks', v: s.id }); }).join('') + pill('+', { size: 's', a: 'newscene', label: 'new scene here' }) + '</span></div>' +
        '<div class="area" data-area="1" style="margin-top:' + U(6) + '">' + frameHTML() + '</div>' +
        '<div class="r" style="height:' + U(44) + ';margin-top:' + U(4) + ';justify-content:flex-start"><span class="pills">' + ratioPills('') + '</span></div>' +
        '<div style="display:grid;gap:' + U(4) + ';flex:none"><div class="r"><span class="f10 cap' + (g ? ' sunc' : ' mu') + '">' + hm(at) + ' · ' + esc(readAt(at, S.heading)) + '</span><span style="display:flex">' + [['sun', 'Sun'], ['grid', 'Grid'], ['level', 'Level']].map(function (t) { return '<button class="f10 cap' + (S.ov[t[0]] ? '' : ' mu') + '" data-a="ov" data-v="' + t[0] + '" style="padding-left:' + U(12) + ';min-height:' + U(28) + '">' + t[1] + '</button>'; }).join('') + '</span></div>' + timeline(false) + '</div>' +
        '<div style="display:grid;gap:' + U(6) + ';flex:none;margin-top:' + U(2) + '"><div class="biglens" data-d="blens" data-a="lensup" role="button" tabindex="0" aria-label="lens ' + S.lens + ' millimetres"><b>' + S.lens + '</b><span class="f9 mu">' + phoneZoom(S.lens) + '</span><span class="f12 cap mu">mm</span></div>' +
          '<div style="display:flex;justify-content:center;gap:' + U(6) + '">' + FOC.map(function (f) { return pill(String(f), { size: 's', on: f === S.lens, a: 'lens', v: f }); }).join('') + '</div>' +
          '<div style="position:relative;display:flex;justify-content:space-between;align-items:center;height:' + U(60) + ';margin-top:' + U(6) + '"><button data-a="shots" style="display:flex;align-items:center;gap:' + U(10) + '">' + thumbBox(x, 42, 28, 6, 'border:1px solid rgba(236,235,230,.42)') + '<span class="f10 cap ul">Shots · ' + count() + '</span></button><span class="f10 cap mu">ALEXA 35</span><button class="shut' + (st.shutDown ? ' down' : '') + '" data-a="shut" style="position:absolute;left:50%;top:0;margin-left:' + U(-30) + '" aria-label="take shot ' + nextNum(scene()) + '"><i></i></button></div></div>' +
        '</div>' + savedChip(92) + nameBar(8) + customCard() + '</div>' + sidePanel();
    }
    function startHTML() {
      var ps = S.projects.slice().sort(function (a, b) { return a.ago - b.ago; }), sel = S.projects.filter(function (p) { return p.id === (st.picked || S.pid); })[0] || ps[0];
      var list = '<div class="plist"><button class="newp" data-a="newp"><i class="f12">+</i><span class="f10 cap" style="letter-spacing:.06em">New project</span></button>' +
        (st.naming ? '<div class="nfield"><input data-in="proj" placeholder="Name this recce" enterkeyhint="go" aria-label="Name this recce">' + pill('Start', { size: 's', on: true, caps: true, a: 'create' }) + '</div>' : '') +
        ps.map(function (p) { var sh = allShots(p); return '<button class="pr' + (p.id === sel.id ? ' on' : '') + '" data-a="pick" data-v="' + p.id + '">' + thumbBox(sh[sh.length - 1], 48, 27, 4) + '<span style="flex:1;min-width:0;display:grid;gap:' + U(2) + '"><span class="sans f13" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.name) + '</span><span class="f8 cap mu">' + dateStr(p.ago) + '</span></span><span class="f9 mu">' + sh.length + '</span></button>'; }).join('') + '</div>';
      var sh = allShots(sel), lastS = sh[sh.length - 1], compact = upright();
      var nl = (function () { var s = sh.slice().reverse().filter(function (x) { return x.h != null; })[0]; if (s) { var b = best(s.h); if (b) return s.n + ' · ' + hm(b.a) + '–' + hm(b.b) + ', ' + b.why; } var g = golden(); return g ? 'Golden hour ' + hm(g[0]) + '–' + hm(g[1]) : 'Check the sun path in the camera'; })();
      var details = '<div style="display:grid;min-width:0"><span class="f8 cap mu" style="margin-top:' + U(12) + '">Scenes</span><span style="display:flex;flex-wrap:wrap;gap:' + U(5) + ';overflow:hidden;max-height:' + U(49) + ';margin-top:' + U(4) + '">' + sel.scenes.map(function (s) { return pill(s.name, { size: 's', a: 'open', v: s.id }); }).join('') + '</span><span class="f8 cap mu" style="margin-top:' + U(8) + '">Next good light</span><span class="sans f12" style="margin-top:' + U(3) + ';display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(nl) + '</span></div>';
      var stW = compact ? 140 : 250;
      var pv = '<div class="pvc"><div style="display:flex;gap:' + U(16) + ';align-items:flex-start">' + '<span class="thumb" style="width:' + U(stW) + ';height:' + U(stW * 9 / 16) + ';border-radius:' + U(10) + ';flex:none;background:#1F1F1D">' + (lastS ? still(lastS, stW, stW * 9 / 16) : '') + '</span><div style="min-width:0;display:grid;align-content:start"><span class="sans" style="font-size:calc(' + (compact ? 17 : 20) + ' * var(--p) * var(--fz))">' + esc(sel.name) + '</span><span class="f9 cap mu" style="margin-top:' + U(4) + '">' + dateStr(sel.ago) + '</span>' + (compact ? '' : details) + '</div></div>' + (compact ? details : '') +
        '<div style="flex:1;min-height:' + U(12) + '"></div><div style="display:flex;align-items:flex-end;justify-content:space-between;gap:' + U(6) + '">' + (compact || !lastS ? '<span></span>' : thumbBox(lastS, 79, 44, 5)) + '<span style="display:flex;gap:' + U(6) + '">' + pill('Open camera', { on: true, caps: true, a: 'open' }) + pill('Shots · ' + sh.length, { caps: true, a: 'openshots' }) + (sh.length ? pill('Export', { caps: true, a: 'openexport' }) : '') + '</span></div></div>';
      if (compact) return '<div class="sa st-p"><div class="pcol"><span class="wm" style="font-size:' + U(20) + '">' + WM + '</span>' + pv + list + '</div></div>';
      return '<div class="sa st-l"><div class="lcol"><span class="wm" style="font-size:' + U(20) + ';padding-top:' + U(6) + '">' + WM + '</span>' + list + '</div><div class="pv">' + pv + '</div></div>';
    }
    function html() {
      var isl = '<span class="isl"></span>';
      var launch = cfg.start ? '<div class="scr launch' + (st.pre ? ' pre' : '') + (st.scr === 'launch' ? '' : ' off') + '"><span class="wm">' + WM + '</span></div>' : '';
      var start = cfg.start ? '<div class="scr start' + (st.scr === 'start' || st.scr === 'launch' ? '' : ' off') + '">' + startHTML() + '</div>' : '';
      var tst = S.toast && st.scr === 'cam' ? '<div class="chip-top" style="top:' + U(upright() ? 146 : 52) + '"><span class="saved f11" style="background:#F3F3F0;color:#111;padding:0 ' + U(14) + '"><span class="dot"></span>' + esc(S.toast) + '</span></div>' : '';
      return '<div class="s">' + isl + '<div class="scr cam">' + (upright() ? camP() : camL()) + '</div>' + start + launch + tst + '<span class="tapr"></span></div>';
    }
    function render() {
      if (!st.vis) { st.dirty = true; return; }
      if (busyTyping(ph)) { st.dirty = true; return; }
      st.dirty = false;
      ph.className = 'ph ' + st.L + (st.turning ? ' turn' : '');
      patch(ph, html());
      var ar = ph.querySelector('[data-area]');
      if (ar) { var p = ph.clientWidth / (upright() ? 390 : 844), a = { w: ar.clientWidth / p, h: ar.clientHeight / p }; if (a.w > 10 && (!st.area || Math.abs(a.w - st.area.w) > 1 || Math.abs(a.h - st.area.h) > 1)) { st.area = a; patch(ph, html()); } }
    }
    scaleOn(ph, 844);
    function rescale() { ph.style.setProperty('--p', (ph.clientWidth / (upright() ? 390 : 844)) + 'px'); }
    new ResizeObserver(function () { rescale(); st.area = null; render(); }).observe(ph);
    on(render);
    seen(host, function (v) { st.vis = v; if (v && st.dirty) render(); if (cfg.onSeen) cfg.onSeen(v); });

    function setLayout(P, anim) {
      if ((st.L === 'P') === P) return;
      // Upright, a wide ratio becomes 9:16; back on its side, the ratio you had returns.
      if (P) { var r = arVal(S.ar); if (S.ar !== 'full' && r > 1.01) { S.landAr = S.ar; S.ar = '9:16'; } }
      else if (S.landAr) { if (['9:16', '4:5', '1:1'].indexOf(S.ar) >= 0) S.ar = S.landAr; S.landAr = null; }
      st.pop = null; st.side = null;
      function swap() { st.L = P ? 'P' : 'L'; st.area = null; rescale(); render(); emit(); }
      if (cfg.rotate && anim && !reduce) {
        st.turning = true; ph.classList.add('turn'); ph.style.transform = 'rotate(' + (P ? -90 : 90) + 'deg)';
        later(500, function () { ph.style.transition = 'none'; ph.style.transform = ''; swap(); void ph.offsetWidth; ph.style.transition = ''; later(60, function () { st.turning = false; render(); }); });
      } else {
        st.turning = true; swap(); later(350, function () { st.turning = false; render(); });
      }
      if (cfg.onLayout) cfg.onLayout(P);
    }
    function pin() {
      if (st.shutDown) return;
      var sc = scene(), m = planned(), f = fov(S.lens, S.ar, upright());
      var x = mk(nextNum(sc), '', S.lens, S.ar === 'full' ? 'full' : S.ar, m, S.heading);
      x.uprightShot = upright();
      sc.shots.push(x); S.justSaved = x.id; st.shutDown = true; st.blink++;
      emit();
      later(130, function () { st.shutDown = false; render(); });
      later(reduce ? 0 : 900, function () { if (!x.cap) x.cap = captionFor(x.mm, x.h, x.t, f.hf); emit(); });
      clearTimeout(pin.t); pin.t = setTimeout(function () { if (S.justSaved === x.id && !st.cap) { S.justSaved = null; emit(); } }, 4200);
    }
    function act(a, v, el) {
      switch (a) {
        case 'pick': st.picked = v; break;
        case 'newp': st.naming = !st.naming; render(); if (st.naming) { var i = ph.querySelector('[data-in="proj"]'); if (i) i.focus(); } return;
        case 'create': var inp = ph.querySelector('[data-in="proj"]'), nm = inp && inp.value.trim(); if (!nm) nm = 'Untitled ' + (S.projects.filter(function (p) { return /^Untitled/.test(p.name); }).length + 1); var np = { id: nid(), name: nm, ago: -0.001, scenes: [{ id: nid(), name: 'Scene 1', shots: [] }] }; S.projects.push(np); S.pid = np.id; S.sid = np.scenes[0].id; st.naming = false; if (inp) inp.blur(); st.scr = 'cam'; break;
        case 'open': var p = S.projects.filter(function (q) { return q.id === (st.picked || S.pid); })[0]; S.pid = p.id; S.sid = v || p.scenes[0].id; st.scr = 'cam'; break;
        case 'openshots': act('open'); goList(false); return;
        case 'openexport': act('open'); goList(true); return;
        case 'restart': st.side = null; st.scr = 'start'; st.naming = true; break;
        case 'shut': pin(); return;
        case 'lens': S.lens = +v; st.pop = null; break;
        case 'lensup': if (st.dragged) return; S.lens = S.lens >= FOC[FOC.length - 1] ? FOC[0] : (stepLens(1), S.lens); break;
        case 'pop': if (st.dragged) return; st.pop = st.pop === v ? null : (v || null); break;
        case 'ar': S.ar = S.ar === v ? 'full' : v; if (!upright()) st.pop = null; break;
        case 'custom': st.pop = 'custom'; break;
        case 'addar': S.custom.indexOf(v) < 0 && ['2.39', '1.85', '16:9', '9:16'].indexOf(v) < 0 && S.custom.push(v); S.ar = v; st.pop = null; break;
        case 'addtyped': var t = (ph.querySelector('[data-in="ar"]') || {}).value || '', pr = t.trim().split(':'), val = pr.length === 2 ? pr[0] / pr[1] : +pr[0]; if (val >= 0.3 && val <= 4) { var lab = pr.length === 2 ? t.replace(/\s/g, '') : val.toFixed(2); ARS[lab] = val; act('addar', lab); return; } return;
        case 'ov': S.ov[v] = !S.ov[v]; break;
        case 'hide': st.hidden = !st.hidden; st.pop = null; st.area = null; break;
        case 'now': S.planned = null; break;
        case 'turn': setLayout(!upright(), true); return;
        case 'side': st.side = v || null; st.pop = null; break;
        case 'pickp': S.pid = v; S.sid = proj().scenes[0].id; st.side = null; break;
        case 'picks': S.sid = v; st.side = null; break;
        case 'newscene': var pj = proj(), ns = { id: nid(), name: 'Scene ' + (pj.scenes.length + 1), shots: [] }; pj.scenes.push(ns); S.sid = ns.id; st.side = null; st.nameScene = ns.id; break;
        case 'nspick': scene(st.nameScene).name = v; st.nameScene = null; break;
        case 'nskeep': st.nameScene = null; break;
        case 'nscancel': var pj2 = proj(), sc2 = scene(st.nameScene); if (!sc2.shots.length && pj2.scenes.length > 1) { pj2.scenes = pj2.scenes.filter(function (s) { return s !== sc2; }); S.sid = pj2.scenes[pj2.scenes.length - 1].id; } st.nameScene = null; break;
        case 'editcap': S.justSavedEdit = S.justSaved; S.justSaved = null; st.cap = true; render(); var ci = ph.querySelector('[data-in="cap"]'); if (ci) ci.focus(); return;
        case 'capdone': var c = ph.querySelector('[data-in="cap"]'), xs = findShot(S.justSavedEdit); if (xs && c) xs.cap = c.value.trim(); if (c) c.blur(); st.cap = false; S.justSavedEdit = null; break;
        case 'capcancel': st.cap = false; S.justSavedEdit = null; break;
        case 'shots': goList(false); return;
      }
      emit();
    }
    function goList(exp) { var sl = document.getElementById('list'); if (sl) sl.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); if (window.OS_SL) window.OS_SL.show(exp); }
    ph.addEventListener('click', function (e) {
      var t = e.target.closest('[data-a]'); if (!t || !ph.contains(t)) { if (st.pop && !e.target.closest('.pop,.sheetc')) { st.pop = null; render(); } return; }
      if (cfg.onTouch) cfg.onTouch();
      act(t.getAttribute('data-a'), t.getAttribute('data-v'), t);
    });
    ph.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return; var i = e.target.getAttribute && e.target.getAttribute('data-in');
      if (i === 'proj') act('create'); else if (i === 'cap') act('capdone'); else if (i === 'scene') { var v = e.target.value.trim(); if (v) { scene(st.nameScene).name = v; } st.nameScene = null; e.target.blur(); emit(); } else if (i === 'ar') act('addtyped');
      else if (e.target.getAttribute('role') === 'button') { var t = e.target.closest('[data-a]'); if (t) act(t.getAttribute('data-a'), t.getAttribute('data-v')); }
    });
    keyAct(ph);
    // drags: the day's line, the lens, looking round
    var drag = null;
    ph.addEventListener('pointerdown', function (e) {
      var t = e.target.closest('[data-d]'); if (!t) return;
      if (cfg.onTouch) cfg.onTouch();
      var kind = t.getAttribute('data-d'), p = ph.clientWidth / (upright() ? 390 : 844);
      drag = { kind: kind, el: t, x: e.clientX, y: e.clientY, h0: S.heading, n: 0, p: p, id: e.pointerId, moved: false, fw: t.clientWidth / p };
      st.dragged = false;
      if (kind === 'tl') { try { ph.setPointerCapture(e.pointerId); } catch (x) {} tlDrag(e, t); emit(); e.preventDefault(); }
    });
    ph.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = (e.clientX - drag.x) / drag.p, dy = (e.clientY - drag.y) / drag.p;
      if (drag.kind === 'tl') { tlDrag(e, drag.el); emit(); return; }
      if (drag.kind === 'lens' || drag.kind === 'blens') {
        var d = drag.kind === 'lens' ? -dy : -dx; if (drag.kind === 'blens' && Math.abs(dy) > Math.abs(dx) && !drag.moved) return;
        if (Math.abs(d) > 6) { drag.moved = st.dragged = true; if (!drag.cap) { drag.cap = true; try { ph.setPointerCapture(e.pointerId); } catch (x) {} } }
        var n = Math.trunc(d / 22); if (n !== drag.n) { stepLens(n - drag.n); drag.n = n; emit(); }
        return;
      }
      if (drag.kind === 'look') {
        if (!drag.moved && Math.abs(dx) < 6) return;
        if (!drag.moved && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        if (!drag.moved) { drag.moved = true; try { ph.setPointerCapture(e.pointerId); } catch (x) {} }
        var hf = fov(S.lens, S.ar, upright()).hf; S.heading = n360(drag.h0 - dx * hf / drag.fw); emit();
      }
    });
    function end(e) { if (drag && e.pointerId === drag.id) { if (drag.moved) setTimeout(function () { st.dragged = false; }, 0); drag = null; } }
    ph.addEventListener('pointerup', end); ph.addEventListener('pointercancel', end);
    ph.addEventListener('dblclick', function (e) { if (e.target.closest('[data-d="tl"]')) { S.planned = null; emit(); } });
    ph.addEventListener('wheel', function (e) { if (!e.ctrlKey || !e.target.closest('.fr')) return; e.preventDefault(); stepLens(e.deltaY < 0 ? 1 : -1); emit(); }, { passive: false });
    ph.addEventListener('input', function (e) { if (e.target.getAttribute('data-in') === 'cap') { var xs = findShot(S.justSavedEdit); if (xs) xs.cap = e.target.value; } });
    ph.addEventListener('focusout', function () { setTimeout(function () { if (st.dirty && !busyTyping(ph)) render(); }, 0); });

    function boot() {
      timers.forEach(clearTimeout); timers = [];
      st.side = null; st.pop = null; st.naming = false;
      if (!cfg.start) { st.scr = 'cam'; render(); return; }
      if (reduce) { st.scr = 'start'; st.pre = false; render(); return; }
      st.scr = 'launch'; st.pre = true; render();
      later(150, function () { st.pre = false; render(); });
      later(2600, function () { if (st.scr === 'launch') { st.scr = 'start'; render(); } });
    }
    var api = {
      ph: ph, st: st, act: act, setLayout: setLayout, render: render, boot: boot,
      tap: function (sel, then) { // a finger for the self-playing demo
        var el = typeof sel === 'string' ? ph.querySelector(sel) : sel, ring = ph.querySelector('.tapr'); if (!el || !ring) return;
        var a = el.getBoundingClientRect(), b = ph.getBoundingClientRect(), s = ph.getBoundingClientRect().width / ph.offsetWidth;
        ring.style.left = (a.left - b.left + a.width / 2) / s + 'px'; ring.style.top = (a.top - b.top + a.height / 2) / s + 'px'; ring.classList.add('show');
        later(650, function () { ring.classList.add('down'); later(160, function () { ring.classList.remove('down'); then && then(el); }); });
      },
      untap: function () { var r = ph.querySelector('.tapr'); if (r) r.classList.remove('show'); },
      clear: function () { timers.forEach(clearTimeout); timers = []; },
      later: later
    };
    boot();
    return api;
  }

  /* ======================= the Shot List and the Export sheet ======================= */
  function ShotList(host) {
    var st = { L: 'L', filter: 's1', openId: null, sheet: null, exp: false, made: false, busy: false, zoom: 'Fit', confirm: null, viewer: null, vis: false, dirty: true, wx: false, also: '' };
    var ph = document.createElement('div'); host.appendChild(ph);
    function upright() { return st.L === 'P'; }
    function pick() { st.L = innerWidth < 700 ? 'P' : 'L'; }
    pick(); ph.className = 'ph ' + st.L;
    function sceneList() { var p = proj(); return st.filter ? p.scenes.filter(function (s) { return s.id === st.filter; }) : p.scenes; }
    function visible() { return sceneList().reduce(function (a, s) { return a.concat(s.shots.map(function (x) { x.sc = s; return x; })); }, []); }
    function arc(w) {
      var sh = visible(), h = 44, pad = 40, base = h - 8, top = Math.max(10, SAMP.reduce(function (m, s) { return Math.max(m, s.el); }, 0));
      var X = function (m) { return pad + clamp((m - RISE) / (SET - RISE), 0, 1) * (w - pad * 2); }, Y = function (e) { return base - Math.max(e, 0) / top * (base - 12); };
      var d = '', g = '';
      for (var m = Math.ceil(RISE); m <= SET; m += 4) d += (d ? 'L' : 'M') + f1(X(m)) + ' ' + f1(Y(sunAt(m).el));
      GOLD.forEach(function (gw) { var gd = ''; for (var m = Math.max(gw[0], RISE); m <= Math.min(gw[1], SET); m += 2) gd += (gd ? 'L' : 'M') + f1(X(m)) + ' ' + f1(Y(sunAt(m).el)); g += gd; });
      var o = '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:' + U(44) + ';overflow:visible" data-a="arcpick"><path d="M' + pad + ' ' + base + 'H' + (w - pad) + '" stroke="rgba(236,235,230,.2)"/><path d="' + d + '" fill="none" stroke="rgba(236,235,230,.4)" stroke-dasharray="2 3"/><path d="' + g + '" fill="none" stroke="#FF5A1F" stroke-width="2" stroke-linecap="round"/>';
      o += '<text x="' + (pad / 2 - 2) + '" y="' + (base + 3) + '" text-anchor="middle" class="zt8">' + hm(RISE) + '</text><text x="' + (w - pad / 2 + 2) + '" y="' + (base + 3) + '" text-anchor="middle" class="zt8">' + hm(SET) + '</text>';
      var sel = null;
      sh.forEach(function (x) { var px = X(x.t), py = Y(sunAt(x.t).el); if (x.id === st.openId) sel = [x, px, py]; else o += '<circle cx="' + f1(px) + '" cy="' + f1(py) + '" r="2.75" fill="rgba(236,235,230,.85)" data-a="open" data-v="' + x.id + '"/>'; o += '<circle cx="' + f1(px) + '" cy="' + f1(py) + '" r="12" fill="transparent" data-a="open" data-v="' + x.id + '"/>'; });
      if (sel) o += '<circle cx="' + f1(sel[1]) + '" cy="' + f1(sel[2]) + '" r="5" fill="#FF5A1F"/><text x="' + f1(clamp(sel[1], 30, w - 30)) + '" y="' + f1(Math.max(sel[2] - 9, 8)) + '" text-anchor="middle" class="zt8" style="fill:#ECEBE6">' + esc(sel[0].n + ' · ' + hm(sel[0].t)) + '</text>';
      return o + '</svg>';
    }
    function readS(x) { var s = sunAt(x.t); return s.el <= -1 ? 'Sun down' : readShort(rel(s.az, x.h)); }
    function readL(x) { var s = sunAt(x.t); return s.el <= -1 ? 'Sun down at ' + hm(x.t) : readLong(rel(s.az, x.h)); }
    function row(x, wide) {
      var open = st.openId === x.id, g = isGold(x.t), b = best(x.h);
      var det = open ? '<div class="det"><span style="display:grid;gap:' + U(3) + '"><span class="sans f13">' + esc(readL(x)) + '</span>' + (b ? '<span class="f9 cap">Best time · ' + esc(hm(b.a) + '–' + hm(b.b) + ', ' + b.why) + '</span>' : '') + '</span>' +
        '<label class="notes" style="display:flex;gap:' + U(6) + ';align-items:baseline" onclick="event.stopPropagation()"><span class="sans f12 mu" style="flex:none">Notes</span><input class="f12" data-in="notes" data-v="' + x.id + '" value="' + esc(x.notes) + '" placeholder="Access, power, parking" enterkeyhint="done"></label>' +
        '<span class="pills">' + ['full', '2.39', '1.85', '16:9', '9:16'].map(function (a) { return pill(a === 'full' ? 'Full' : a, { size: 's', on: x.ar === a, a: 'shotar', v: x.id + '|' + a }); }).join('') + '</span>' +
        '<button class="del f10" data-a="del" data-v="' + x.id + '"><svg viewBox="0 0 10 11" style="width:' + U(10) + ';height:' + U(11) + '"><path d="M1 2.5h8M3.5 2.5V1h3v1.5M2 2.5l.6 7.5h4.8L8 2.5" fill="none" stroke="#E5534B"/></svg>Delete shot</button></div>' : '';
      return '<div class="srow' + (open ? ' open' : '') + '" data-a="toggle" data-v="' + x.id + '" data-k="' + x.id + '">' +
        '<span class="thumb" data-a="' + (open ? 'view' : 'toggle') + '" data-v="' + x.id + '">' + still(x, open ? 128 : 52, open ? 72 : 30) + '</span>' +
        '<span class="num f11">' + esc(x.n) + '</span>' +
        '<span class="mid2"><span class="sans f13">' + esc(x.cap || 'Untitled') + '</span><span class="f9 cap mu">' + esc(x.sc.name + ' · ' + x.mm + 'mm') + '</span>' + (wide ? '' : '<span class="f9 cap' + (g ? ' sunc' : ' mu') + '">' + hm(x.t) + ' · ' + esc(readS(x)) + '</span>') + det + '</span>' +
        (wide ? '<span class="f10' + (g ? ' sunc' : open ? '' : ' mu') + '" style="width:' + U(42) + ';flex:none;padding-top:' + U(3) + '">' + hm(x.t) + '</span><span class="f10 cap" style="width:' + U(124) + ';flex:none;padding-top:' + U(3) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(readS(x)) + '</span>' : '') +
        '<span class="f13 mu" style="width:' + U(14) + ';flex:none">' + (open ? '–' : '+') + '</span></div>';
    }
    function rows(wide) { var v = visible(); return '<div class="rows">' + (v.length ? '' : '<span class="f10 cap mu" style="display:block;padding:' + U(14) + ' 0">No shots yet. Press the shutter on the camera.</span>') + v.map(function (x) { return row(x, wide); }).join('') + '</div>'; }
    function filterPills() { var p = proj(); return pill('All · ' + allShots().length, { size: 's', on: !st.filter, a: 'filter', v: '' }) + p.scenes.map(function (s) { return pill(s.name + ' · ' + s.shots.length, { size: 's', on: st.filter === s.id, a: 'filter', v: s.id }); }).join(''); }
    function listL() {
      var p = proj(), v = visible();
      return '<div class="sa sl-l"><div class="top2"><button class="f11" data-a="camera">Projects</button><span style="position:absolute;left:' + U(190) + ';right:' + U(190) + ';text-align:center;white-space:nowrap;overflow:hidden" class="f11"><span>' + esc(p.name.toUpperCase()) + '</span> <span class="mu cap">/ Shot List</span></span><span style="flex:1"></span>' + pill('Weather', { caps: true, a: 'sheet', v: 'weather' }) + pill('Export', { caps: true, on: true, a: 'export' }) + '</div>' +
        '<div class="body"><div class="scol"><span class="f10 cap mu" style="padding-bottom:' + U(4) + '">Scenes</span>' +
        '<button class="f10' + (st.filter ? ' mu' : '') + '" data-a="filter" data-v="">All · ' + allShots().length + '</button>' + p.scenes.map(function (s) { return '<button class="f10' + (st.filter === s.id ? '' : ' mu') + '" data-a="filter" data-v="' + s.id + '">' + esc(s.name) + ' · ' + s.shots.length + '</button>'; }).join('') +
        '<button class="f10 mu ul" data-a="sheet" data-v="edit" style="min-height:' + U(32) + '">Edit</button><span style="flex:1"></span><button class="f11 ul" data-a="camera">← Camera</button></div>' +
        '<div class="sl-main">' + arc(590) + '<div class="f9 cap mu" style="display:flex;justify-content:space-between"><span>' + v.length + ' shot' + (v.length === 1 ? '' : 's') + '</span><span>Tap a shot to open · again to close</span></div>' + rows(true) + '</div></div></div>';
    }
    function listP() {
      var p = proj();
      return '<div class="sa sl-p"><div class="colp"><div style="display:flex;gap:' + U(8) + ';align-items:center;min-height:' + U(44) + '"><button class="f11" data-a="camera">← Camera</button><span style="flex:1"></span>' + pill('Edit', { caps: true, a: 'sheet', v: 'edit' }) + pill('Weather', { caps: true, a: 'sheet', v: 'weather' }) + pill('Export', { caps: true, on: true, a: 'export' }) + '</div>' +
        '<span class="sans" style="font-size:calc(22 * var(--p) * var(--fz))">' + esc(p.name) + '</span><span class="pills" style="display:flex;gap:' + U(6) + ';overflow:hidden;flex:none">' + filterPills() + '</span>' + arc(350) + rows(false) + '</div></div>';
    }
    function sheet() {
      var o = '', p = proj(), shown = st.filter ? scene(st.filter) : scene();
      if (st.sheet === 'edit') {
        o = '<div style="display:flex;justify-content:space-between;align-items:baseline"><span style="display:grid;gap:' + U(4) + '"><span class="f10 cap" style="letter-spacing:.12em">Edit Scenes</span><span class="f11 mu">Tap a name to rename, drag to reorder. Exports follow this order.</span></span><button class="f12" data-a="sheet" data-v="">Done</button></div>' +
          '<div style="display:grid;gap:' + U(6) + ';margin-top:' + U(20) + '"><span class="f10 mu">Project</span><span class="f12" style="height:' + U(40) + ';display:flex;align-items:center;border-bottom:1px solid #2A2926">' + esc(p.name) + ' ✎</span></div>';
        if (p.scenes.length > 1) o += olist('Scene order', 'scenes', p.scenes.map(function (s, i) { return { id: s.id, n: ('0' + (i + 1)).slice(-2), name: s.name, d: s.shots.length + ' shot' + (s.shots.length === 1 ? '' : 's') }; }));
        if (shown.shots.length) o += olist('Shots in ' + shown.name, 'shots:' + shown.id, shown.shots.map(function (x) { return { id: x.id, n: x.n, name: x.cap || 'Untitled', d: x.mm + 'mm' }; }));
      } else if (st.sheet === 'weather') {
        o = '<div style="display:flex;justify-content:space-between;align-items:baseline"><span style="display:grid;gap:' + U(4) + '"><span class="f10 cap" style="letter-spacing:.12em">Weather · ' + esc(shown.name) + '</span><span class="f11 mu">' + esc(shown.place || 'Next 14 days at this spot') + '</span></span><button class="f12" data-a="sheet" data-v="">Done</button></div>' +
          '<p class="f12" style="margin:' + U(16) + ' 0 ' + U(8) + '">See the next 14 days here: cloud, rain, sun hours and wind, and the cloud at each shot\'s time.</p><p class="f11 mu" style="margin:0 0 ' + U(12) + '">This sends the scene\'s rough location (to about 1 km) to a weather service. Nothing else: no name, account or phone id.</p>' +
          (st.wx ? '<p class="f11 mu" style="margin:0">On the phone, this asks Open-Meteo for the forecast. This page sends nothing.</p>' : '<button class="op b" data-a="wx" style="border-color:#8C8A83">Turn on weather forecasts</button>');
      }
      return '<div class="dim" style="' + (st.sheet ? '' : 'opacity:0;pointer-events:none;') + 'transition:opacity .3s" data-a="sheet" data-v=""></div><div class="sheet' + (st.sheet ? '' : ' off') + '">' + o + '</div>';
    }
    function olist(head, key, items) {
      return '<div style="display:grid;gap:' + U(6) + ';margin-top:' + U(20) + '"><span class="f10 mu" style="display:flex;justify-content:space-between"><span>' + esc(head) + '</span><span>Drag to reorder</span></span><div class="olist" data-list="' + key + '" style="border-top:1px solid #2A2926">' +
        items.map(function (r) { return '<div class="orow" data-k="' + r.id + '" data-id="' + r.id + '"><span class="f10 mu" style="width:' + U(22) + ';flex:none">' + esc(r.n) + '</span><span class="f12" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.name) + ' <span class="mu">✎</span></span><span class="f10 mu" style="white-space:nowrap">' + esc(r.d) + '</span><span class="grip" data-d="grip" aria-label="drag to reorder ' + esc(r.name) + '">' + GRIP + '</span></div>'; }).join('') + '</div></div>';
    }
    function fileName() { var sc = S.all ? null : (st.filter ? scene(st.filter) : scene()); return 'shot-list_' + slug(proj().name) + '_' + (sc ? slug(sc.name) : 'all-scenes'); }
    function expCfg() { return { tier: S.tier, scenes: S.all ? proj().scenes : [st.filter ? scene(st.filter) : scene()], project: proj(), frames: S.frames, sun: S.sunT, notes: S.notes }; }
    function expSheet() {
      var cfg = expCfg(), pages = pdfPages(cfg), n = pages.length, shotsN = cfg.scenes.reduce(function (a, s) { return a + s.shots.length; }, 0);
      var tiers = [['detailed', 'Detailed', 'Shot cards: light, sun, best time'], ['summary', 'Summary', 'One line per shot'], ['photos', 'Photos only', 'Just the frames']];
      var opts = '<div class="ocol"><span class="sans" style="font-size:calc(18 * var(--p) * var(--fz))">Export</span><span style="display:flex;gap:' + U(6) + ';margin:' + U(12) + ' 0 ' + U(14) + '">' + pill('This scene', { size: 's', on: !S.all, a: 'scope', v: '0' }) + pill('All scenes', { size: 's', on: S.all, a: 'scope', v: '1' }) + '</span>' +
        '<span style="display:grid;gap:' + U(6) + '">' + tiers.map(function (t) { return '<button class="tier' + (S.tier === t[0] ? ' on' : '') + '" data-a="tier" data-v="' + t[0] + '"><span><span class="sans f13">' + t[1] + '</span><span class="f9 mu">' + t[2] + '</span></span><span class="tick r' + (S.tier === t[0] ? ' on' : '') + '"></span></button>'; }).join('') + '</span>' +
        '<span style="display:flex;gap:' + U(12) + ';margin-top:' + U(6) + '">' + [['frames', 'Frames'], ['sunT', 'Sun'], ['notes', 'Notes']].map(function (t) { return '<button data-a="inc" data-v="' + t[0] + '" class="f9 cap' + (S[t[0]] ? '' : ' mu') + '" style="display:flex;gap:' + U(6) + ';align-items:center;min-height:' + U(36) + '"><span class="tick' + (S[t[0]] ? ' on' : '') + '"></span>' + t[1] + '</button>'; }).join('') + '</span>' +
        '<span class="f8 cap" style="display:flex;gap:' + U(4) + ';min-height:' + U(32) + ';align-items:center"><span class="mu">Also:</span><button class="ul" data-a="csv">Spreadsheet</button><span class="mu">·</span><button class="ul" data-a="photos">Photos app</button></span>' + (st.also ? '<span class="f9 mu">' + esc(st.also) + '</span>' : '') + '</div>';
      var well = '<div class="well z' + st.zoom.replace('%', '') + '">' + pages.map(function (pg) { return pg.svg; }).join('') + (st.busy ? '<span class="making f8 cap mu">Making…</span>' : '') + '</div>';
      var file = '<div style="display:grid;gap:' + U(4) + '"><span class="f8 cap mu">File</span><span class="f10" style="word-break:break-all">' + esc(fileName()) + '<span class="mu">.pdf</span></span></div>';
      var zoom = '<div style="display:grid;gap:' + U(4) + '"><span class="f8 cap mu">' + n + ' page' + (n === 1 ? '' : 's') + ' · zoom</span><span style="display:flex;gap:' + U(6) + '">' + ['Fit', '50%', '75%'].map(function (z) { return pill(z, { size: 's', on: st.zoom === z, a: 'zoom', v: z }); }).join('') + '</span></div>';
      var done = '<div style="display:flex;flex-direction:column;gap:' + U(12) + ';padding:' + (upright() ? U(18) : U(24) + ' 0') + ';flex:1"><span class="f9 cap mu">Ready</span><span class="sans" style="font-size:calc(20 * var(--p) * var(--fz));word-break:break-all">' + esc(fileName()) + '.pdf</span><span class="f9 cap mu">' + n + ' page' + (n === 1 ? '' : 's') + ' · ' + shotsN + ' shot' + (shotsN === 1 ? '' : 's') + ' · ' + (S.tier === 'photos' ? 'Photos only' : cap1(S.tier)) + '</span><span style="margin-top:' + U(10) + '">' + pill('Send · AirDrop, Mail, Files', { size: 'b', on: true, a: 'send' }) + '</span><span style="flex:1"></span><span style="display:flex;gap:' + U(8) + '">' + pill('Edit again', { caps: true, a: 'again' }) + pill('Done', { caps: true, on: true, a: 'close' }) + '</span></div>';
      var body;
      if (upright()) body = st.made ? done : '<div style="flex:1;min-height:0;overflow-y:auto;scrollbar-width:none;padding:' + U(18) + ';display:flex;flex-direction:column;gap:' + U(14) + '">' + opts + '<div style="height:' + U(380) + ';display:flex;flex:none">' + well + '</div>' + file + zoom + '</div><div class="rule"></div><div style="display:flex;justify-content:space-between;padding:' + U(10) + ' ' + U(18) + '">' + pill('Cancel', { size: 'b', caps: true, a: 'close' }) + pill(st.busy ? 'Making…' : 'Export PDF', { size: 'b', caps: true, on: true, a: 'make' }) + '</div>';
      else body = opts.replace('class="ocol"', 'class="ocol"') + '<div style="width:1px;background:rgba(236,235,230,.42);flex:none"></div>' + (st.made ? done : '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:' + U(6) + ';padding:' + U(16) + ' 0"><span class="f8 cap mu">Tap Export to send these pages</span>' + well + '</div><div style="width:' + U(132) + ';flex:none;display:flex;flex-direction:column;gap:' + U(6) + ';padding:' + U(16) + ' 0">' + file + '<span style="margin-top:' + U(10) + '">' + zoom + '</span><span style="flex:1"></span>' + pill('Cancel', { size: 'b', caps: true, a: 'close' }) + pill(st.busy ? 'Making…' : 'Export PDF', { size: 'b', caps: true, on: true, a: 'make' }) + '</div>');
      return '<div class="dim" style="' + (st.exp ? '' : 'opacity:0;pointer-events:none;') + 'transition:opacity .3s;background:rgba(0,0,0,.55)" data-a="close"></div><div class="exp' + (st.exp ? '' : ' off') + '">' + (st.exp ? body : '') + '</div>';
    }
    function extras() {
      var o = '';
      if (st.confirm) { var x = findShot(st.confirm); if (x) o += '<div class="dim" data-a="cancel"></div><div class="confirm f12"><div class="cb"><span class="f10 mu">Delete shot ' + esc(x.n) + '?<br>Its still goes too. This can\'t be undone.</span><button data-a="dodel" data-v="' + x.id + '" style="color:#E5534B">Delete ' + esc(x.n) + '</button></div><div class="cb"><button data-a="cancel">Cancel</button></div></div>'; }
      if (st.viewer) { var y = findShot(st.viewer); if (y) { var r = arVal(y.ar) || 1.5, vw = upright() ? 390 : 844 - 94, vh = upright() ? 760 : 369 - 16, bw = Math.min(vw, vh * r), bh = bw / r; o += '<div class="viewer" data-a="unview"><span class="thumb" style="width:' + U(bw) + ';height:' + U(bh) + '">' + still(y, bw, bh) + '</span><span class="f11" style="position:absolute;bottom:' + U(upright() ? 64 : 34) + ';left:50%;transform:translateX(-50%);background:rgba(17,17,17,.72);padding:' + U(5) + ' ' + U(8) + ';border-radius:' + U(6) + ';white-space:nowrap">' + esc(y.n + ' · ' + (y.cap || 'Untitled') + ' · ' + y.mm + 'mm · ' + (y.ar === 'full' ? 'Full' : y.ar)) + '</span><span class="f12" style="position:absolute;top:' + U(upright() ? 64 : 12) + ';right:' + U(upright() ? 12 : 59) + ';width:' + U(36) + ';height:' + U(36) + ';border-radius:50%;background:rgba(17,17,17,.72);display:grid;place-items:center">✕</span><button class="f11" data-a="save" data-v="' + y.id + '" style="position:absolute;bottom:' + U(upright() ? 34 : 26) + ';right:' + U(upright() ? 12 : 59) + ';background:rgba(17,17,17,.72);height:' + U(36) + ';padding:0 ' + U(12) + ';border-radius:999px;display:flex;align-items:center">↓ Save to Photos</button></div>'; } }
      if (S.toast) o += '<div class="chip-top" style="top:' + U(upright() ? 146 : 52) + ';z-index:40"><span class="saved f11" style="background:#F3F3F0;color:#111;padding:0 ' + U(14) + '"><span class="dot"></span>' + esc(S.toast) + '</span></div>';
      return o;
    }
    function html() { return '<div class="s"><span class="isl"></span>' + (upright() ? listP() : listL()) + sheet() + '<div class="sa" style="pointer-events:none"><div style="position:absolute;inset:0;pointer-events:none" class="expw"></div></div>' + expWrap() + extras() + '</div>'; }
    function expWrap() { return '<div class="sa ' + (upright() ? 'sl-p' : 'sl-l') + '" style="z-index:24;pointer-events:none"><div style="pointer-events:auto">' + expSheet() + '</div></div>'; }
    function render() {
      if (!st.vis) { st.dirty = true; return; }
      if (busyTyping(ph)) { st.dirty = true; return; }
      st.dirty = false; ph.className = 'ph ' + st.L;
      if (st.filter && !proj().scenes.some(function (s) { return s.id === st.filter; })) st.filter = null;
      patch(ph, html());
      // as in the app, an opened shot scrolls to the top of the list
      if (st.scrollTo) { var id = st.scrollTo, rw = ph.querySelector('.srow[data-k="' + id + '"]'), rs = rw && rw.closest('.rows'); st.scrollTo = null; if (rs) { var top = rs.scrollTop + rw.getBoundingClientRect().top - rs.getBoundingClientRect().top; rs.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' }); } }
    }
    function rescale() { ph.style.setProperty('--p', (ph.clientWidth / (upright() ? 390 : 844)) + 'px'); }
    new ResizeObserver(function () { var was = st.L; pick(); if (was !== st.L) render(); rescale(); }).observe(ph);
    rescale(); on(render);
    seen(host, function (v) { st.vis = v; if (v && st.dirty) render(); });
    function act(a, v) {
      switch (a) {
        case 'toggle': st.openId = st.openId === v ? null : v; st.scrollTo = st.openId; break;
        case 'open': st.openId = v; break;
        case 'view': st.viewer = v; break;
        case 'unview': st.viewer = null; break;
        case 'save': toast('Saved ' + findShot(v).n + ' to Photos'); return;
        case 'filter': st.filter = v || null; if (v) S.sid = v; break;
        case 'shotar': var pr = v.split('|'), x = findShot(pr[0]); if (x) x.ar = pr[1]; break;
        case 'del': st.confirm = v; break;
        case 'cancel': st.confirm = null; break;
        case 'dodel': proj().scenes.forEach(function (s) { s.shots = s.shots.filter(function (y) { return y.id !== v; }); }); st.confirm = null; if (st.openId === v) st.openId = null; break;
        case 'sheet': st.sheet = v || null; st.wx = false; break;
        case 'wx': st.wx = true; break;
        case 'export': if (!visible().length && !allShots().length) return; st.exp = true; st.made = false; st.also = ''; break;
        case 'close': st.exp = false; st.made = false; break;
        case 'scope': S.all = v === '1'; break;
        case 'tier': S.tier = v; break;
        case 'inc': S[v] = !S[v]; break;
        case 'zoom': st.zoom = v; break;
        case 'csv': st.also = 'Spreadsheet: ' + fileName() + '.csv, one row per shot'; break;
        case 'photos': var n = expCfg().scenes.reduce(function (a2, s) { return a2 + s.shots.length; }, 0); if (!n) { st.also = 'No stills to save yet.'; break; } toast('Saved ' + (n === 1 ? '1 still' : n + ' stills') + ' to Photos'); return;
        case 'make': if (st.busy) return; st.busy = true; render(); setTimeout(function () { st.busy = false; st.made = true; emit(); }, reduce ? 0 : 900); return;
        case 'again': st.made = false; break;
        case 'send': S.exported = expCfg(); S.exported.name = fileName(); st.exp = false; st.made = false; emit(); var pd = document.getElementById('pdf'); if (pd) pd.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); if (window.OS_FILM) window.OS_FILM.restart(); return;
        case 'camera': var vf = document.getElementById('app'); if (vf) vf.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return;
        default: return;
      }
      emit();
    }
    ph.addEventListener('click', function (e) { var t = e.target.closest('[data-a]'); if (!t || !ph.contains(t)) return; if (st.justDragged) return; e.stopPropagation(); act(t.getAttribute('data-a'), t.getAttribute('data-v')); });
    ph.addEventListener('input', function (e) { if (e.target.getAttribute('data-in') === 'notes') { var x = findShot(e.target.getAttribute('data-v')); if (x) x.notes = e.target.value; } });
    ph.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur(); });
    ph.addEventListener('focusout', function () { setTimeout(function () { if (!busyTyping(ph)) { emit(); } }, 0); });
    // drag a grip to reorder: rows move as you pass each neighbour
    var drag = null;
    ph.addEventListener('pointerdown', function (e) {
      var g = e.target.closest('[data-d="grip"]'); if (!g) return;
      var rowEl = g.closest('.orow'), list = rowEl.parentNode; e.preventDefault();
      drag = { row: rowEl, list: list, key: list.getAttribute('data-list'), y: e.clientY, id: e.pointerId, pitch: rowEl.offsetHeight, idx: Array.prototype.indexOf.call(list.children, rowEl) };
      try { ph.setPointerCapture(e.pointerId); } catch (x) {} rowEl.classList.add('drag');
    });
    ph.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dy = e.clientY - drag.y, kids = Array.prototype.slice.call(drag.list.children), n = kids.length;
      var to = clamp(drag.idx + Math.round(dy / drag.pitch), 0, n - 1);
      drag.row.style.transform = 'translateY(' + dy + 'px)';
      kids.forEach(function (k, i) { if (k === drag.row) return; var sh = 0; if (drag.idx < to && i > drag.idx && i <= to) sh = -drag.pitch; if (drag.idx > to && i < drag.idx && i >= to) sh = drag.pitch; k.style.transform = sh ? 'translateY(' + sh + 'px)' : ''; });
      drag.to = to;
    });
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null; st.justDragged = true; setTimeout(function () { st.justDragged = false; }, 50);
      Array.prototype.forEach.call(d.list.children, function (k) { k.style.transform = ''; k.classList.remove('drag'); });
      if (d.to == null || d.to === d.idx) return;
      var arr = d.key === 'scenes' ? proj().scenes : scene(d.key.split(':')[1]).shots, it = arr.splice(d.idx, 1)[0]; arr.splice(d.to, 0, it);
      var s = document.createElement('div'); emit();
    }
    ph.addEventListener('pointerup', end); ph.addEventListener('pointercancel', end);
    return { show: function (exp) { st.filter = S.sid; st.openId = null; st.exp = !!exp; st.made = false; emit(); } };
  }
  function slug(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  /* ======================= the PDF pages (Exporter.swift, ShotCards.swift, ShootDay.swift) ======================= */
  var INK = '#111', GR = '#8C8A83', HA = '#D6D5CF', RU = '#D9D9D3', SU = '#FF5A1F', DK = '#33332F';
  function T(x, y, s, size, col, o) { o = o || {}; return '<text x="' + f1(x) + '" y="' + f1(y + size * 0.8) + '" font-size="' + size + '" fill="' + (col || INK) + '"' + (o.a ? ' text-anchor="' + o.a + '"' : '') + (o.ls ? ' letter-spacing="' + o.ls + '"' : '') + (o.u ? ' text-decoration="underline"' : '') + '>' + esc(s) + '</text>'; }
  function C(x, y, s, size, col, a) { size = size || 6.75; return T(x, y, String(s).toUpperCase(), size, col || GR, { ls: f1(size * 0.12), a: a }); }
  function R(x, y, w, h, fill) { return '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '" fill="' + fill + '"/>'; }
  function Hl(y, col, wgt, x0, w) { return R(x0 == null ? 42 : x0, y, w == null ? 511 : w, wgt || 0.75, col || RU); }
  function WMk(x, y, size) { return '<text x="' + f1(x) + '" y="' + f1(y + size * 0.8) + '" font-size="' + size + '" fill="' + INK + '" font-family="Geist, sans-serif" letter-spacing="-.02em">Out &amp; Sc<tspan fill="' + SU + '" font-size="' + f1(size * 0.32) + '" dx="' + f1(size * 0.08) + '" dy="' + f1(-size * 0.52) + '">●</tspan><tspan font-size="' + size + '" dx="' + f1(size * 0.1) + '" dy="' + f1(size * 0.52) + '">out</tspan></text>'; }
  function photo(x, s, X0, Y0, w, h) { return '<svg x="' + f1(X0) + '" y="' + f1(Y0) + '" width="' + f1(w) + '" height="' + f1(h) + '" viewBox="0 0 ' + f1(w) + ' ' + f1(h) + '" preserveAspectRatio="none"><g class="pz">' + still(x, w, h).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') + '</g></svg>'; }
  function sunTimes() { var g = golden(), b = BLUE.length ? BLUE[BLUE.length - 1] : null; return { rise: hm(RISE), set: hm(SET), golden: g ? hm(g[0]) + ' – ' + hm(g[1]) : '–', blue: b ? hm(b[0]) + ' – ' + hm(b[1]) : '–' }; }
  function grid4(cells, y) { var o = R(42, y, 511, 0.75, INK), cw = 511 / cells.length; cells.forEach(function (c, i) { var x = 42 + i * cw; o += T(x, y + 9, c[0], 8.5, GR); var vx = x; if (c[2]) { o += '<circle cx="' + f1(x + 2.5) + '" cy="' + f1(y + 29.5) + '" r="2.5" fill="' + SU + '"/>'; vx += 10; } o += T(vx, y + 22, c[1], 11); }); return o + R(42, y + 46, 511, 0.75, RU); }
  function coords(sc) { return (sc.lat || LAT).toFixed(4) + '°N ' + Math.abs(sc.lon || LON).toFixed(4) + '°' + ((sc.lon || LON) >= 0 ? 'E' : 'W'); }
  function footer(left, n, total) { return T(42, 842 - 51, left, 8.5, GR) + T(553, 842 - 51, 'Page ' + n + ' of ' + total, 8.5, GR, { a: 'end' }); }
  function stamp() { return DATE.format(new Date()) + ', ' + hm(nowMin()); }
  function miniMap(x0, y0, w, h, heading, seed) {
    var o = '<rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '" fill="#F1F0EC" stroke="' + HA + '" stroke-width=".75"/>', cx = x0 + w * 0.5, cy = y0 + h * 0.56;
    o += '<path d="M' + x0 + ' ' + f1(y0 + h * (0.3 + seed * 0.2)) + ' C' + f1(x0 + w * 0.4) + ' ' + f1(y0 + h * 0.2) + ' ' + f1(x0 + w * 0.6) + ' ' + f1(y0 + h * 0.8) + ' ' + (x0 + w) + ' ' + f1(y0 + h * 0.62) + ' M' + f1(x0 + w * (0.25 + seed * 0.3)) + ' ' + y0 + ' L' + f1(x0 + w * 0.42) + ' ' + (y0 + h) + '" stroke="#D2D1CB" stroke-width="2.4" fill="none"/>';
    var a = (heading - 90) * rad, a0 = a - 0.38, a1 = a + 0.38, r = Math.min(w, h) * 0.42;
    o += '<path d="M' + f1(cx) + ' ' + f1(cy) + ' L' + f1(cx + Math.cos(a0) * r) + ' ' + f1(cy + Math.sin(a0) * r) + ' A' + f1(r) + ' ' + f1(r) + ' 0 0 1 ' + f1(cx + Math.cos(a1) * r) + ' ' + f1(cy + Math.sin(a1) * r) + 'Z" fill="rgba(17,17,17,.07)" stroke="rgba(17,17,17,.3)" stroke-width=".5"/><circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="2.4" fill="' + INK + '"/>';
    return o + T(x0 + w - 8, y0 + 4, 'N', 6, GR, { a: 'middle' });
  }
  function plan(r, hf, bx, by, bw) {
    var cx = bx + bw / 2, cy = by + bw / 2 + 2, R0 = bw * 0.38, f = hf / 2 * rad, a = r * rad;
    var o = '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(R0) + '" fill="none" stroke="' + HA + '" stroke-width=".75"/>';
    o += '<path d="M' + f1(cx) + ' ' + f1(cy) + ' L' + f1(cx + R0 * Math.sin(-f)) + ' ' + f1(cy - R0 * Math.cos(f)) + ' A' + f1(R0) + ' ' + f1(R0) + ' 0 0 1 ' + f1(cx + R0 * Math.sin(f)) + ' ' + f1(cy - R0 * Math.cos(f)) + 'Z" fill="rgba(17,17,17,.08)" stroke="rgba(17,17,17,.5)" stroke-width=".5"/>';
    o += R(cx - 3.5, cy - 2, 7, 5, INK) + '<path d="M' + f1(cx - 2) + ' ' + f1(cy - 2) + 'L' + f1(cx) + ' ' + f1(cy - 5.5) + 'L' + f1(cx + 2) + ' ' + f1(cy - 2) + 'Z" fill="' + INK + '"/>';
    var sx = cx + R0 * Math.sin(a), sy = cy - R0 * Math.cos(a);
    o += '<path d="M' + f1(cx) + ' ' + f1(cy) + 'L' + f1(2 * cx - sx) + ' ' + f1(2 * cy - sy) + '" stroke="rgba(17,17,17,.35)" stroke-width=".75" stroke-dasharray="1.5 1.5"/><circle cx="' + f1(sx) + '" cy="' + f1(sy) + '" r="3.5" fill="' + SU + '"/>';
    return o + T(cx, by, 'LENS', 5, GR, { a: 'middle' });
  }
  function strip(h, shotT, b, x0, y0, w) {
    var o = '', X = function (m) { return x0 + w * clamp((m - RISE) / (SET - RISE), 0, 1); }, shades = [0.82, 0.55, 0.32, 0.16, 0.06];
    windows(h).forEach(function (wd) { var rx = X(wd.a), rw = Math.max(0.75, X(wd.b) - rx); o += '<rect x="' + f1(rx) + '" y="' + f1(y0 + 6) + '" width="' + f1(rw) + '" height="10.5" fill="rgba(17,17,17,' + shades[wd.k] + ')"/>'; if (rw > 20) o += T(rx + 3, y0 + 8.5, KL[wd.k], 5.6, wd.k < 2 ? '#F2F2F2' : INK); });
    var g = golden(); if (g) o += R(X(g[0]), y0 + 3, Math.max(1, X(Math.min(g[1], SET)) - X(g[0])), 1.5, SU);
    o += R(X(shotT) - 0.5, y0 + 1.5, 1, 18, SU);
    if (b) o += R(X(b.a), y0 + 18, Math.max(1.5, X(b.b) - X(b.a)), 1.5, INK);
    var labels = [[RISE, hm(RISE), 'start']]; [540, 720, 900].forEach(function (m) { if (m > RISE && m < SET) labels.push([m, ('0' + m / 60).slice(-2), 'middle']); }); labels.push([SET, hm(SET), 'end']);
    labels.forEach(function (l) { o += T(X(l[0]), y0 + 21, l[1], 5.6, GR, { a: l[2] }); });
    return o;
  }
  function qr(x, y, s) { var o = R(x, y, s, s, '#fff'), n = 21, c = s / n; for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) { var fin = (i < 7 && j < 7) || (i < 7 && j > 13) || (i > 13 && j < 7); var on2 = fin ? (i % 6 === 0 || j % 6 === 0 || (i % 7 > 1 && i % 7 < 5 && j % 7 > 1 && j % 7 < 5) || (i > 13 && ((i - 14) % 6 === 0 || (i > 15 && i < 19 && j > 1 && j < 5)))) : ((i * 7 + j * 13 + i * j) % 5 < 2); if (on2) o += R(x + j * c, y + i * c, c + 0.05, c + 0.05, INK); } return o; }
  function hfOf(x) { return 2 * Math.atan(SW / (2 * x.mm)) / rad; }
  function plainLight(x) { var s = sunAt(x.t); if (s.el <= -1) return 'after sunset'; var r = rel(s.az, x.h), k = cls(r), side = r > 0 ? 'right' : 'left', wh = ['sun facing the camera', 'sun ahead, to the ' + side, 'sun on the ' + side, 'sun behind, to the ' + side, 'sun behind the camera'][k]; var ht = isGold(x.t) ? 'golden hour' : s.el < 15 ? 'low sun' : s.el > 45 ? 'high sun' : null; return (ht ? ht + ', ' : '') + wh; }
  function sunSide(x) { var s = sunAt(x.t); if (s.el <= -1) return null; var d = rel(s.az, x.h), a = Math.abs(d); return a < 30 ? 'Backlit' : a < 150 ? (d > 0 ? 'Sun right' : 'Sun left') : 'Sun behind'; }
  function lightWord(x) { var p = phase(sunAt(x.t).el, x.t); return p === 'golden hour' ? 'Golden' : cap1(p); }
  function stops(scenes) {
    var out = scenes.filter(function (s) { return s.shots.length; }).map(function (s, i) { var b = best(s.shots[0].h) || { a: RISE, b: RISE + 60, why: '' }; return { sc: s, n: i + 1, a: b.a, b: b.b, why: b.why }; });
    out.sort(function (a, b) { return a.a - b.a; });
    // ShootDay.driveMinutes: straight line, a third longer by road, 30 km/h, up to the next 5 minutes, never under 5
    function km(a, b) { var la1 = (a.lat || LAT) * rad, la2 = (b.lat || LAT) * rad, dl = ((b.lon || LON) - (a.lon || LON)) * rad, dp = la2 - la1, h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(la1) * Math.cos(la2) * Math.sin(dl / 2) * Math.sin(dl / 2); return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)); }
    out.forEach(function (s, i) { var nx = out[i + 1]; s.drive = nx ? Math.max(5, Math.ceil(km(s.sc, nx.sc) * 1.3 / 30 * 60 / 5) * 5) : null; });
    return out;
  }
  function pdfPages(cfg) {
    var pages = [], scenes = cfg.scenes, p = cfg.project, filled = scenes.filter(function (s) { return s.shots.length; }), allN = scenes.reduce(function (a, s) { return a + s.shots.length; }, 0);
    function page(inner) { return '<svg viewBox="0 0 595 842" font-family="Geist Mono, ui-monospace, monospace" aria-hidden="true">' + R(0, 0, 595, 842, '#FBFBF8') + inner + '</svg>'; }
    var total;
    if (cfg.tier === 'photos') {
      var sh = []; scenes.forEach(function (s) { s.shots.forEach(function (x) { sh.push([x, s]); }); });
      var per = 8, np = Math.max(1, Math.ceil(sh.length / per));
      for (var pg = 0; pg < np; pg++) {
        var o = WMk(36, 36, 10) + C(559, 37, p.name, 6.75, GR, 'end'), cw = (595 - 72 - 12) / 2;
        sh.slice(pg * per, pg * per + per).forEach(function (it, i) { var x = 36 + (i % 2) * (cw + 12), y = 66 + Math.floor(i / 2) * 186; o += photo(it[0], null, x, y, cw, 147) + T(x, y + 152, it[0].n, 8.25) + T(x + cw, y + 152, it[1].name, 8.25, GR, { a: 'end' }); });
        if (!sh.length) o += T(36, 66, 'No shots yet.', 9, GR);
        o += T(36, 842 - 44, sh.length === 1 ? '1 shot' : sh.length + ' shots', 6.75, GR) + T(559, 842 - 44, (pg + 1) + ' / ' + np, 6.75, GR, { a: 'end' });
        pages.push({ svg: page(o) });
      }
      return pages;
    }
    var perPage = Math.max(1, Math.floor((842 - 84 - 168 - (cfg.sun ? 140 : 0) - 20) / (cfg.frames ? 84 : 40)));
    if (cfg.tier === 'detailed') { total = 1; filled.forEach(function (s) { total += 1 + Math.ceil(s.shots.length / 2); }); total = Math.max(2, total); }
    else { total = 1; scenes.forEach(function (s) { total += Math.max(1, Math.ceil(s.shots.length / perPage)); }); }
    // the cover
    var o = WMk(42, 42, 12) + T(553, 44, 'Shot List · ' + (scenes.length === 1 ? scenes[0].name : 'All scenes'), 8.5, GR, { a: 'end' });
    var y = 92; o += T(42, y, 'recce ' + dateStr(p.ago), 9, GR); y += 16;
    o += T(42, y, p.name, 58, INK, { ls: '-2.6' }); y += 74;
    o += T(42, y, scenes.length + ' scene' + (scenes.length === 1 ? '' : 's') + ' · ' + (allN === 1 ? '1 shot' : allN + ' shots') + (allN ? ' · Camera ALEXA 35 · Lenses K35' : ''), 12, DK); y += 46;
    if (cfg.sun) { var t = sunTimes(); o += grid4([['Sunrise', t.rise], ['Golden hour', t.golden, 1], ['Sunset', t.set], ['Blue hour', t.blue]], y); y += 62; }
    var firstPage = {}, nxt = 2;
    if (cfg.tier === 'detailed') filled.forEach(function (s) { firstPage[s.id] = nxt; nxt += 1 + Math.ceil(s.shots.length / 2); });
    else scenes.forEach(function (s) { firstPage[s.id] = nxt; nxt += Math.max(1, Math.ceil(s.shots.length / perPage)); });
    if (cfg.tier === 'detailed' && filled.length) {
      y += 18; o += C(42, y, 'Plan for the day · in the order the light comes round', 7.5); y += 14;
      stops(scenes).forEach(function (s, i) {
        o += Hl(y, HA) + miniMap(42, y + 6, 112, 66, s.sc.shots[0].h, i * 0.6 % 1);
        var g = /^golden/.test(s.why), L = 166, ty = y + 7;
        o += T(L, ty, hm(s.a) + '–' + hm(s.b), 9.75, g ? SU : INK) + T(L + 82, ty - 1, s.sc.name, 11) + T(L + 82, ty + 14, 'Scene ' + ('0' + s.n).slice(-2) + ' · page ' + firstPage[s.sc.id], 7.5, GR);
        o += T(L + 82 + 120, ty + 1, (function (ns) { var t = ns.length <= 6 ? ns.join(' ') : ns[0] + '–' + ns[ns.length - 1] + ' (' + ns.length + ')'; return t.length > 10 ? t.slice(0, 9) + '…' : t; })(s.sc.shots.map(function (x) { return x.n; })), 8.25) + T(L + 82 + 182, ty + 1, s.why, 8.25, GR) + (s.drive ? T(L + 82 + 182, ty + 12, s.drive + ' min drive next', 8.25, GR) : '');
        y += 78;
      });
      o += Hl(y, HA);
    } else {
      var cols = [42, 84, 293, 451, 515];
      ['#', 'Scene', 'Location', 'Light', 'Shots'].forEach(function (hd, i) { o += T(cols[i], y, hd, 8.5, GR); }); y += 15; o += Hl(y);
      scenes.forEach(function (s, i) { var top = y + 10, gl = s.shots.some(function (x) { return isGold(x.t); }); o += T(cols[0], top + 2, ('0' + (i + 1)).slice(-2), 10) + T(cols[1], top, s.name, 13) + T(cols[1], top + 17, s.shots.length ? 'Page ' + firstPage[s.id] : 'No shots yet', 8.5, GR) + T(cols[2], top + 2, s.place || '', 8.5) + T(cols[2], top + 14, coords(s), 8.5, GR); if (s.shots.length) { if (gl) o += '<circle cx="' + (cols[3] + 2.5) + '" cy="' + (top + 7.5) + '" r="2.5" fill="' + SU + '"/>'; o += T(cols[3] + (gl ? 9 : 0), top + 2, gl ? 'Golden' : lightWord(s.shots[0]), 8.5, gl ? INK : GR); } o += T(cols[4], top + 2, String(s.shots.length), 10); y = top + 34; o += Hl(y); });
    }
    o += footer('Exported from Out & Scout · ' + stamp(), 1, total);
    pages.push({ svg: page(o) });
    var pn = 2;
    if (cfg.tier === 'detailed') {
      filled.forEach(function (s) {
        var si = scenes.indexOf(s) + 1, o2 = WMk(42, 42, 10) + C(553, 43, p.name + ' · scene ' + ('0' + si).slice(-2), 6.75, GR, 'end'), y2 = 82;
        o2 += T(42, y2, s.name, 21, INK, { ls: '-.4' }); y2 += 30;
        o2 += T(42, y2, dateStr(0).replace(/ \d{4}$/, '') + ' · ' + (s.place || s.name) + ' · ' + coords(s) + ' · ' + (s.shots.length === 1 ? '1 shot' : s.shots.length + ' shots'), 8.25, GR); y2 += 14;
        o2 += T(42, y2, 'Open in Maps ↗', 8.25, INK, { u: 1 }); y2 += 22;
        var t2 = sunTimes(); o2 += grid4([['Sunrise', t2.rise], ['Golden hour', t2.golden, 1], ['Sunset', t2.set], ['Blue hour', t2.blue]], y2); y2 += 60;
        // the scene's map, every shot facing its way
        o2 += '<rect x="42" y="' + y2 + '" width="511" height="176" fill="#F1F0EC" stroke="' + HA + '" stroke-width=".75"/><path d="M42 ' + (y2 + 120) + ' C220 ' + (y2 + 90) + ' 330 ' + (y2 + 150) + ' 553 ' + (y2 + 70) + ' M260 ' + y2 + ' C250 ' + (y2 + 60) + ' 300 ' + (y2 + 120) + ' 290 ' + (y2 + 176) + ' M42 ' + (y2 + 30) + ' L180 ' + (y2 + 60) + '" stroke="#D2D1CB" stroke-width="3" fill="none"/><path d="M380 ' + (y2 + 20) + ' q30 -8 60 6 q26 12 48 -2" stroke="#D9E2D0" stroke-width="10" fill="none" stroke-linecap="round"/>';
        s.shots.forEach(function (x, i) { var px = 200 + i * 56, py = y2 + 100 - (i % 2) * 26, half = hfOf(x) / 2, a0 = (x.h - half - 90) * rad, a1 = (x.h + half - 90) * rad; o2 += '<path d="M' + px + ' ' + py + ' L' + f1(px + Math.cos(a0) * 24) + ' ' + f1(py + Math.sin(a0) * 24) + ' A24 24 0 0 1 ' + f1(px + Math.cos(a1) * 24) + ' ' + f1(py + Math.sin(a1) * 24) + 'Z" fill="rgba(17,17,17,.07)" stroke="rgba(17,17,17,.3)" stroke-width=".5"/><circle cx="' + px + '" cy="' + py + '" r="2.6" fill="' + INK + '"/>' + T(px + 5, py + 2, x.n, 7); });
        o2 += T(536, y2 + 6, 'N ↑', 7, GR, { a: 'middle' }); y2 += 192;
        // the day
        o2 += C(42, y2, 'The day') + T(42, y2 + 10, 'The sun across the day at this scene\'s spot: the higher the line, the higher the sun.', 7.5, GR);
        var py0 = y2 + 40, ph0 = 84, from = RISE - 60, to = SET + 60, mx = Math.max(10, SAMP.reduce(function (a, q) { return Math.max(a, q.el); }, 0)), X = function (m) { return 42 + 511 * clamp((m - from) / (to - from), 0, 1); }, Y = function (e) { return py0 + ph0 - ph0 * (Math.max(e, -10) + 10) / (mx + 10); };
        o2 += R(X(from), py0, X(BLUE.length ? BLUE[0][0] : RISE) - X(from), ph0, 'rgba(17,17,17,.07)') + R(X(BLUE.length ? BLUE[BLUE.length - 1][1] : SET), py0, X(to) - X(BLUE.length ? BLUE[BLUE.length - 1][1] : SET), ph0, 'rgba(17,17,17,.07)');
        BLUE.forEach(function (b) { if (b[1] > from && b[0] < to) o2 += R(X(b[0]), py0, X(b[1]) - X(b[0]), ph0, 'rgba(89,115,191,.14)'); });
        GOLD.forEach(function (g) { if (g[1] > from && g[0] < to) o2 += R(X(Math.max(g[0], from)), py0, X(Math.min(g[1], to)) - X(Math.max(g[0], from)), ph0, 'rgba(255,90,31,.12)'); });
        o2 += R(42, Y(0), 511, 0.75, RU); var cd = ''; for (var m = from; m <= to; m += 10) cd += (cd ? 'L' : 'M') + f1(X(m)) + ' ' + f1(Y(sunAt(m).el)); o2 += '<path d="' + cd + '" fill="none" stroke="rgba(17,17,17,.7)" stroke-width="1.1"/>';
        for (var hh = Math.ceil(from / 60) * 60; hh < to; hh += 60) if ((hh / 60) % 2 === 0) o2 += T(X(hh), py0 + ph0 + 4, ('0' + hh / 60).slice(-2) + ':00', 6.75, GR, { a: 'middle' });
        s.shots.forEach(function (x) { o2 += '<circle cx="' + f1(X(x.t)) + '" cy="' + f1(Y(sunAt(x.t).el)) + '" r="2.4" fill="' + (isGold(x.t) ? SU : INK) + '"/>' + T(X(x.t), Y(sunAt(x.t).el) - 12, x.n, 7, INK, { a: 'middle' }); });
        y2 = py0 + ph0 + 30;
        var cl = [42, 76, 118, 317, 527];
        ['Shot', 'Time', 'Caption', 'The light', 'Page'].forEach(function (hd, i) { o2 += C(cl[i], y2, hd); }); y2 += 12;
        s.shots.forEach(function (x, n) { if (y2 + 18 > 842 - 60) return; o2 += R(42, y2, 511, 0.5, HA) + T(cl[0], y2 + 4, x.n, 8.25) + T(cl[1], y2 + 4, hm(x.t), 8.25, isGold(x.t) ? SU : INK) + T(cl[2], y2 + 4, (x.cap || 'Untitled').slice(0, 34), 8.25) + T(cl[3], y2 + 4, plainLight(x).slice(0, 34), 8.25) + T(cl[4], y2 + 4, String(firstPage[s.id] + 1 + Math.floor(n / 2)), 8.25, GR); y2 += 18; });
        o2 += T(559, 842 - 44, pn + ' / ' + total, 6.75, GR, { a: 'end' });
        pages.push({ svg: page(o2) }); pn++;
        for (var cp = 0; cp < Math.ceil(s.shots.length / 2); cp++) {
          var o3 = WMk(36, 36, 10) + C(559, 37, p.name + ' · ' + s.name, 6.75, GR, 'end'), cardH = (842 - 72 - 48) / 2;
          s.shots.slice(cp * 2, cp * 2 + 2).forEach(function (x, j) { o3 += card(x, s, si, 36, 60 + j * cardH, 523, cfg.notes); });
          o3 += T(36, 842 - 44, 'B backlit · ¾B · S side · ¾F · F front lit · orange: golden hour and shot time · black: best time', 6.75, GR) + T(559, 842 - 44, pn + ' / ' + total, 6.75, GR, { a: 'end' });
          pages.push({ svg: page(o3) }); pn++;
        }
      });
      if (!filled.length) pages.push({ svg: page(WMk(36, 36, 10) + T(36, 76, 'No shots yet.', 9, GR)) });
      return pages;
    }
    // Summary: a page per scene with the sun path and a ruled line per shot
    scenes.forEach(function (s, si) {
      var chunks = Math.max(1, Math.ceil(s.shots.length / perPage));
      for (var c = 0; c < chunks; c++) {
        var o4 = T(42, 42, p.name + ' · Scene ' + ('0' + (si + 1)).slice(-2), 8.5, GR) + WMk(495, 42, 10), y4 = 56;
        o4 += T(42, y4, s.name, 26, INK, { ls: '-.8' }); y4 += 34; o4 += T(42, y4, dateStr(0).replace(/ \d{4}$/, '') + ' · ' + (s.place || s.name) + ' · ' + coords(s), 9, GR); y4 += 22;
        if (cfg.sun) {
          var t4 = sunTimes(); o4 += grid4([['Sunrise', t4.rise], ['Golden hour', t4.golden], ['Sunset', t4.set], ['Location', coords(s)]], y4); y4 += 60;
          if (!c) {
            o4 += T(42, y4, 'Sun path', 8.5, GR); var top = y4 + 14, ph4 = 96, mx4 = Math.max(10, SAMP.reduce(function (a, q) { return Math.max(a, q.el); }, 0)) + 4, PX = function (az) { return 42 + 511 * az / 360; }, PY = function (e) { return top + ph4 - ph4 * (e + 14) / (mx4 + 14); };
            o4 += R(42, PY(0), 511, 0.75, RU); [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W'], [360, 'N']].forEach(function (q) { o4 += R(PX(q[0]) - 0.375, top, 0.75, ph4, RU) + T(clamp(PX(q[0]), 46, 549), top + ph4 + 3, q[1], 8, GR, { a: 'middle' }); });
            var pd = '', gd = '', lastAz = null, gp = false;
            for (var m4 = 0; m4 <= 1440; m4 += 6) { var q = sunAt(m4); if (q.el <= -6) { lastAz = null; gp = false; continue; } var wr = lastAz === null || Math.abs(lastAz - q.az) > 180, pt = f1(PX(q.az)) + ' ' + f1(PY(q.el)); pd += (wr ? 'M' : 'L') + pt; var ig = q.el >= -4 && q.el < 6; gd += ig ? ((gp && !wr) ? 'L' : 'M') + pt : ''; gp = ig; lastAz = q.az; if (m4 % 120 === 0 && q.el > 0) o4 += '<circle cx="' + f1(PX(q.az)) + '" cy="' + f1(PY(q.el)) + '" r="1.5" fill="' + INK + '"/>' + T(PX(q.az), PY(q.el) - 11, ('0' + m4 / 60).slice(-2), 7, GR, { a: 'middle' }); }
            o4 += '<path d="' + pd + '" fill="none" stroke="' + GR + '"/><path d="' + gd + '" fill="none" stroke="' + SU + '" stroke-width="2" stroke-linecap="round"/>';
            s.shots.forEach(function (x, i) { o4 += R(PX(x.h) - 0.5, PY(0) - 6, 1, 12, INK) + T(PX(x.h), PY(0) + 7 + (i % 2) * 9, x.n, 7, INK, { a: 'middle' }); });
            y4 = top + ph4 + 30;
          }
        }
        var fw = cfg.frames ? 99 : 0, cF = 90, cD = cfg.frames ? cF + fw + 12 : cF, cLt = 471, cT = cLt - 60, cLn = cT - 60;
        [[42, 'Shot'], [cF, cfg.frames ? 'Frame' : ''], [cD, 'Description'], [cLn, 'Lens'], [cT, 'Time'], [cLt, 'Light']].forEach(function (hd) { if (hd[1]) o4 += T(hd[0], y4, hd[1], 8.5, GR); }); y4 += 14; o4 += Hl(y4);
        if (!s.shots.length) o4 += T(42, y4 + 12, 'No shots in this scene yet.', 11, GR);
        var rh = cfg.frames ? 84 : 40;
        s.shots.slice(c * perPage, c * perPage + perPage).forEach(function (x) {
          var tp = y4 + 9, g = isGold(x.t);
          o4 += T(42, tp - 2, x.n, 13.5);
          if (cfg.frames) { var r = arVal(x.ar) || 1.5, bh = rh - 18, bw = Math.min(fw, bh * r); o4 += photo(x, null, cF, tp, bw, Math.min(bh, bw / r)); }
          o4 += T(cD, tp, (x.cap || 'Untitled').slice(0, 30), 10.5);
          if (cfg.frames) o4 += T(cD, tp + 29, s.place || s.name, 8, GR) + T(cD, tp + 40, 'facing ' + bearing(x.h), 8, GR) + T(cD, tp + 52, 'Open in Maps ↗', 8);
          else o4 += T(cD, tp + 14, s.place || s.name, 8, GR);
          o4 += T(cLn, tp + 1, x.mm + 'mm', 9) + T(cT, tp + 1, hm(x.t), 9);
          if (g) o4 += '<circle cx="' + (cLt + 2.5) + '" cy="' + (tp + 6.5) + '" r="2.5" fill="' + SU + '"/>';
          o4 += T(cLt + (g ? 9 : 0), tp + 1, lightWord(x), 9, g ? INK : GR); var sd = sunSide(x); if (sd) o4 += T(cLt + (g ? 9 : 0), tp + 12, sd, 9, g ? INK : GR);
          y4 += rh; o4 += Hl(y4);
        });
        o4 += footer('Exported from Out & Scout', pn, total);
        pages.push({ svg: page(o4) }); pn++;
      }
    });
    return pages;
  }
  function card(x, s, si, x0, y0, w, notes) {
    var o = R(x0, y0, w, 0.75, INK), y = y0 + 9, sun = sunAt(x.t), r = rel(sun.az, x.h), b = best(x.h);
    o += T(x0, y, x.n, 18, INK, { ls: '-.36' }) + T(x0 + w, y + 7, 'Open in Maps ↗', 8.25, INK, { a: 'end', u: 1 }) + T(x0 + w - 78, y + 7, ('0' + si).slice(-2) + ' · ' + s.name, 8.25, GR, { a: 'end' }) + T(x0 + x.n.length * 10.8 + 10, y + 6, (x.cap || 'Untitled').slice(0, 40), 9);
    y += 30;
    o += photo(x, null, x0, y, 315, 177);
    var cx = x0 + 330, cw = x0 + w - cx;
    o += C(cx, y, 'Light now');
    if (sun.el > -1) o += T(cx, y + 10, KN[cls(r)], 11.25) + T(cx, y + 26, offAxis(r).replace(' · sun', ''), 7.5, GR) + plan(r, hfOf(x), x0 + w - 63, y - 2, 63);
    else o += T(cx, y + 10, 'Sun down', 11.25) + T(cx, y + 26, 'No direct sun at this time.', 7.5, GR);
    var wy = y + 66; o += C(cx, wy, 'When to be there'); wy += 11;
    function rw(label, v, hgt, strong, sub) { var q = R(cx, wy, cw, 0.5, HA) + T(cx, wy + 3, label, 7.5, strong ? INK : GR) + T(cx + 42, wy + 3, v, strong ? 9.75 : 7.5, v === 'not from here today' ? GR : INK) + (sub ? T(cx + 42, wy + 15, sub, 7.5, GR) : ''); wy += (hgt || 13) + 4; return q; }
    if (b) o += rw('Best', hm(b.a) + '–' + hm(b.b), 24, true, b.why);
    o += rw('Recce', hm(x.t) + ' · ' + KS[cls(r)]);
    o += rw('Backlit', spans(0, x.h) || 'not from here today') + rw('Side lit', spans(2, x.h) || 'not from here today');
    var g = golden(); if (g) o += rw('Golden', hm(g[0]) + '–' + hm(g[1]) + ' · ' + KS[cls(rel(sunAt((g[0] + g[1]) / 2).az, x.h))]);
    y += 186;
    var spec = [['Camera', 'ALEXA 35'], ['Mode', '4.6K 3:2 Open Gate'], ['Sensor', '28.00 × 18.67mm'], ['Resolution', '4.6K'], ['Lens', x.mm + 'mm · K35'], ['H. field', Math.round(hfOf(x)) + '°'], ['Frame lines', (x.ar === 'full' ? 'full' : x.ar) + ' in 3:2'], ['Heading', bearing(x.h)], ['Sun', Math.round(sun.az) + '° · ' + Math.round(sun.el) + '° up'], ['Shadows', sun.el > 0 ? (1 / Math.tan(sun.el * rad)).toFixed(1) + '× height' : 'none']];
    var colW = (w + 9) / 5; spec.forEach(function (f, i) { var fx = x0 + (i % 5) * colW, fy = y + Math.floor(i / 5) * 24; o += C(fx, fy, f[0]) + T(fx, fy + 9, f[1], 7.5); });
    y += 54; o += C(x0, y, 'Through the day from here') + strip(x.h, x.t, b, x0, y + 9, w); y += 44;
    if (notes) { o += C(x0, y, 'Notes'); o += x.notes ? T(x0, y + 10, x.notes.slice(0, 80), 7.5) : R(x0, y + 20, w - 90, 0.5, HA) + R(x0, y + 33, w - 90, 0.5, HA); }
    o += qr(x0 + w - 38, y - 2, 38) + C(x0 + w - 44, y + 30, 'Directions', 5.5, GR, 'end');
    return o;
  }

  /* ======================= Sun path, close up ======================= */
  function SunWidget(host) {
    var vis = false, dirty = true, s = document.createElement('div'); s.className = 's'; host.appendChild(s);
    scaleOn(host, 640);
    function html() {
      var at = planned(), hf = fov(18, '16:9', false).hf;
      return '<div class="frw" data-d="look">' + frameSVG(narrowOf(host) ? 360 : 640, narrowOf(host) ? 202.5 : 360, { heading: S.heading, hf: hf, m: at, path: true, nowRing: true }) + '<span class="chipl f10 cap" style="left:' + U(12) + ';top:' + U(12) + '">18mm · facing ' + facing(S.heading) + '</span></div>' +
        '<div class="rd">' + lightNow() + '</div>' + timeline(false);
    }
    function render() { if (!vis) { dirty = true; return; } dirty = false; patch(s, html()); }
    on(render); seen(host, function (v) { vis = v; if (v && dirty) render(); }); onNarrow(host, render); patch(s, html());
    $('#srise').textContent = 'Sunrise ' + hm(RISE); $('#sset').textContent = 'Sunset ' + hm(SET);
    var drag = null;
    host.addEventListener('pointerdown', function (e) { var t = e.target.closest('[data-d]'); if (!t) return; drag = { k: t.getAttribute('data-d'), el: t, x: e.clientX, y: e.clientY, h0: S.heading, id: e.pointerId, moved: false }; if (drag.k === 'tl') { try { host.setPointerCapture(e.pointerId); } catch (x) {} tlDrag(e, t); emit(); } });
    host.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.k === 'tl') { tlDrag(e, drag.el); emit(); return; }
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved) { if (Math.abs(dx) < 6) return; if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; } drag.moved = true; try { host.setPointerCapture(e.pointerId); } catch (x) {} }
      S.heading = n360(drag.h0 - dx * fov(18, '16:9', false).hf / drag.el.clientWidth); emit();
    });
    function end(e) { if (drag && e.pointerId === drag.id) drag = null; }
    host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);
    host.addEventListener('click', function (e) { if (e.target.closest('[data-a="now"]')) { S.planned = null; emit(); } });
    host.addEventListener('dblclick', function (e) { if (e.target.closest('[data-d="tl"]')) { S.planned = null; emit(); } });
    keyAct(host);
  }

  /* ======================= Light read: the plan and the day strip from a Detailed card ======================= */
  function LightWidget(host) {
    var vis = false, dirty = true, s = document.createElement('div'); s.className = 's'; host.appendChild(s);
    scaleOn(host, 640);
    function html() {
      var at = planned(), sun = sunAt(at), r = rel(sun.az, S.heading), k = cls(r), down = sun.el <= -1, hf = hfLens(S.lens), f = hf / 2 * rad, R0 = 118, a = r * rad, b = best(S.heading), g = golden();
      var ticks = ''; for (var d = 0; d < 360; d += 15) { var aa = (d - S.heading) * rad, l = d % 90 ? 5 : 10; ticks += '<path d="M' + f1(Math.sin(aa) * 132) + ' ' + f1(-Math.cos(aa) * 132) + 'L' + f1(Math.sin(aa) * (132 - l)) + ' ' + f1(-Math.cos(aa) * (132 - l)) + '" stroke="rgba(236,235,230,.3)"/>'; }
      var na = -S.heading * rad;
      var dial = '<svg viewBox="-150 -150 300 300" role="img" aria-label="The camera seen from above, facing up, with the sun ' + Math.round(Math.abs(r)) + ' degrees off the lens."><circle r="132" fill="none" stroke="rgba(236,235,230,.16)"/>' + ticks + '<text x="' + f1(Math.sin(na) * 144) + '" y="' + f1(-Math.cos(na) * 144 + 4) + '" class="zt" text-anchor="middle">N</text>' +
        '<circle r="' + R0 + '" fill="none" stroke="rgba(236,235,230,.42)" stroke-width="1"/>' +
        '<path d="M0 0 L' + f1(R0 * Math.sin(-f)) + ' ' + f1(-R0 * Math.cos(f)) + ' A' + R0 + ' ' + R0 + ' 0 0 1 ' + f1(R0 * Math.sin(f)) + ' ' + f1(-R0 * Math.cos(f)) + 'Z" fill="rgba(236,235,230,.08)" stroke="rgba(236,235,230,.5)" stroke-width=".8"/>' +
        '<text y="' + (-R0 - 8) + '" class="zt" text-anchor="middle">LENS</text><rect x="-8" y="-5" width="16" height="11" rx="1.5" fill="#ECEBE6"/><path d="M-4.5 -5 L0 -12 L4.5 -5Z" fill="#ECEBE6"/>' +
        (down ? '' : '<path d="M0 0 L' + f1(-R0 * Math.sin(a)) + ' ' + f1(R0 * Math.cos(a)) + '" stroke="rgba(236,235,230,.4)" stroke-width="1.5" stroke-dasharray="3 3"/><circle cx="' + f1(R0 * Math.sin(a)) + '" cy="' + f1(-R0 * Math.cos(a)) + '" r="9" fill="#FF5A1F"/><circle cx="' + f1(R0 * Math.sin(a)) + '" cy="' + f1(-R0 * Math.cos(a)) + '" r="22" fill="transparent" data-grab="1"/>') + '</svg>';
      var rows = (b ? '<div><span class="f10 cap">Best</span><span><span class="f13">' + hm(b.a) + '–' + hm(b.b) + '</span><br><span class="f10 mu">' + esc(b.why) + '</span></span></div>' : '') +
        '<div><span class="f10 cap mu">Backlit</span><span class="f11' + (spans(0, S.heading) ? '' : ' mu') + '">' + (spans(0, S.heading) || 'not from here today') + '</span></div>' +
        '<div><span class="f10 cap mu">Side lit</span><span class="f11' + (spans(2, S.heading) ? '' : ' mu') + '">' + (spans(2, S.heading) || 'not from here today') + '</span></div>' +
        (g ? '<div><span class="f10 cap mu">Golden</span><span class="f11">' + hm(g[0]) + '–' + hm(g[1]) + ' <span class="mu">· ' + KS[cls(rel(sunAt((g[0] + g[1]) / 2).az, S.heading))] + '</span></span></div>' : '');
      var side = '<div style="display:grid;gap:' + U(8) + '"><span class="f10 cap mu">Light now · ' + hm(at) + '</span><span class="kname">' + (down ? 'Sun down' : KN[k]) + '</span><span class="f11 mu">' + (down ? 'No direct sun at this time.' : esc(offAxis(r)) + ' · ' + Math.round(sun.el) + '° up') + '</span><span class="f10 cap mu">Facing ' + facing(S.heading) + ' · ' + bearing(S.heading) + ' · ' + S.lens + 'mm</span><span class="f10 cap mu" style="margin-top:' + U(14) + '">When to be there</span><div class="wrows">' + rows + '</div></div>';
      // the day strip, on dark: darkest backlit to lightest front lit
      var W = narrowOf(host) ? 360 : 640, X = function (m) { return W * clamp((m - RISE) / (SET - RISE), 0, 1); }, shades = [0.82, 0.55, 0.32, 0.16, 0.06], sv = '';
      windows(S.heading).forEach(function (w) { var rx = X(w.a), rw = Math.max(1, X(w.b) - rx); sv += '<rect x="' + f1(rx) + '" y="10" width="' + f1(rw) + '" height="22" fill="rgba(236,235,230,' + (0.9 - shades[w.k]) + ')"/>'; if (rw > 26) sv += '<text x="' + f1(rx + 6) + '" y="25" class="zs10" style="fill:' + (w.k < 2 ? '#ECEBE6' : '#121211') + '">' + KL[w.k] + '</text>'; });
      if (g) sv += '<rect x="' + f1(X(g[0])) + '" y="4" width="' + f1(Math.max(1, X(Math.min(g[1], SET)) - X(g[0]))) + '" height="3" fill="#FF5A1F"/>';
      if (b) sv += '<rect x="' + f1(X(b.a)) + '" y="36" width="' + f1(Math.max(2, X(b.b) - X(b.a))) + '" height="3" fill="#ECEBE6"/>';
      sv += '<rect x="' + f1(X(at) - 1) + '" y="0" width="2" height="42" fill="#FF5A1F"/>';
      var labs = [[RISE, hm(RISE), 'start']]; [540, 720, 900].forEach(function (m) { if (m > RISE + 40 && m < SET - 40) labs.push([m, ('0' + m / 60).slice(-2), 'middle']); }); labs.push([SET, hm(SET), 'end']);
      labs.forEach(function (l) { sv += '<text x="' + f1(X(l[0])) + '" y="56" class="zt" text-anchor="' + l[2] + '">' + l[1] + '</text>'; });
      return '<div class="grid2"><div class="dial" data-d="dial">' + dial + '</div>' + side + '</div><div class="strip" data-d="strip"><span class="f10 cap mu" style="display:block;margin-bottom:' + U(6) + '">Through the day from here</span><svg viewBox="0 0 ' + W + ' 60">' + sv + '</svg><span class="f9 mu" style="display:block;margin-top:' + U(6) + '">B backlit · ¾B · S side · ¾F · F front lit · orange: golden hour and the time · white: best time</span></div>';
    }
    function render() { if (!vis) { dirty = true; return; } dirty = false; patch(s, html()); }
    on(render); seen(host, function (v) { vis = v; if (v && dirty) render(); }); onNarrow(host, render); patch(s, html());
    var drag = null;
    function dialSet(e, el) { var svg = el.querySelector('svg').getBoundingClientRect(), cx = svg.left + svg.width / 2, cy = svg.top + svg.height / 2, th = Math.atan2(e.clientX - cx, -(e.clientY - cy)) / rad; S.heading = n360(Math.round(sunAt(planned()).az - th)); emit(); }
    function stripSet(e, el) { var sv = el.querySelector('svg').getBoundingClientRect(); S.planned = t5(RISE + clamp((e.clientX - sv.left) / sv.width, 0, 1) * (SET - RISE)); emit(); }
    host.addEventListener('pointerdown', function (e) {
      var t = e.target.closest('[data-d]'); if (!t) return; var k = t.getAttribute('data-d');
      if (k === 'dial') { var svg = t.querySelector('svg').getBoundingClientRect(), dx = e.clientX - (svg.left + svg.width / 2), dy = e.clientY - (svg.top + svg.height / 2), rr = Math.hypot(dx, dy) / (svg.width / 300); if (rr < 60 || rr > 160) return; }
      drag = { k: k, el: t, id: e.pointerId }; try { host.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault();
      k === 'dial' ? dialSet(e, t) : stripSet(e, t);
    });
    host.addEventListener('pointermove', function (e) { if (!drag || e.pointerId !== drag.id) return; drag.k === 'dial' ? dialSet(e, drag.el) : stripSet(e, drag.el); });
    function end(e) { if (drag && e.pointerId === drag.id) drag = null; }
    host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);
  }

  /* ======================= the PDF film ======================= */
  function Film(el) {
    var cur = 0, els = [], tier = null, auto = null, vis = false, key = '', held = 0;
    var tierBar = $('#ftier'), pageEl = $('#fpage');
    function cfg() { var e = S.exported || { tier: 'detailed', scenes: proj().scenes, project: proj(), frames: true, sun: true, notes: true, name: 'shot-list_' + slug(proj().name) + '_all-scenes' }; var c = {}; for (var k in e) c[k] = e[k]; if (tier) c.tier = tier; return c; }
    function build() {
      var c = cfg(), pages = pdfPages(c), k2 = c.tier + '|' + pages.map(function (p) { return p.svg.length; }).join(',');
      tierBar.innerHTML = [['detailed', 'Detailed'], ['summary', 'Summary'], ['photos', 'Photos only']].map(function (t) { return '<button type="button" class="' + (c.tier === t[0] ? 'on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('');
      if (k2 === key) { show(); return; } key = k2;
      el.innerHTML = ''; els = pages.map(function (p) { var d = document.createElement('div'); d.className = 'pp notr'; d.innerHTML = p.svg; el.appendChild(d); return d; });
      cur = clamp(cur, 0, els.length - 1); show(); void el.offsetWidth; els.forEach(function (d) { d.classList.remove('notr'); });
    }
    function show() {
      els.forEach(function (e, i) { var o = i - cur; e.style.setProperty('--o', o); e.style.setProperty('--a', Math.min(1, Math.abs(o))); e.style.zIndex = 10 - Math.abs(o); });
      var c = cfg(); pageEl.textContent = (c.name || 'shot-list') + '.pdf · ' + ('0' + (cur + 1)).slice(-2) + ' / ' + ('0' + els.length).slice(-2);
    }
    function go(d) { cur = (cur + d + els.length) % els.length; show(); }
    function tick() { clearTimeout(auto); if (!vis || reduce) return; auto = setTimeout(function () { if (performance.now() > held) go(1); tick(); }, 2800); }
    tierBar.addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (!b) return; tier = b.getAttribute('data-t'); cur = 0; held = performance.now() + 5000; build(); });
    $('#fprev').addEventListener('click', function () { held = performance.now() + 6000; go(-1); });
    $('#fnext').addEventListener('click', function () { held = performance.now() + 6000; go(1); });
    var sx = null;
    el.addEventListener('pointerdown', function (e) { sx = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
    el.addEventListener('pointerup', function (e) { if (!sx) return; var dx = e.clientX - sx.x; if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(e.clientY - sx.y)) { held = performance.now() + 6000; go(dx < 0 ? 1 : -1); } else if (Math.abs(dx) < 6) { held = performance.now() + 6000; var b = el.getBoundingClientRect(); go(e.clientX > b.left + b.width / 2 ? 1 : -1); } sx = null; });
    on(function () { if (vis) build(); });
    seen(el, function (v) { vis = v; if (v) { build(); tick(); } else clearTimeout(auto); });
    build();
    return { restart: function () { tier = null; cur = 0; key = ''; build(); held = performance.now() + 1500; tick(); } };
  }

  /* ======================= set it all going ======================= */
  var vf1 = Viewfinder($('#vf1'), { start: true, portrait: innerWidth < 700 });
  $('#vf1replay').addEventListener('click', function () { vf1.boot(); });
  // the portrait turn: plays by itself while on screen, until someone takes over
  (function () {
    var host = $('#pst'), cap = $('#pcap'), idle = 0, running = false, vis = false;
    var vf = Viewfinder(host, { start: false, portrait: false, rotate: true, onTouch: function () { idle = performance.now() + 9000; vf.untap(); snap = null; }, onLayout: function (P) { cap.textContent = P ? 'Portrait' : 'Landscape'; } });
    function step() {
      if (!vis || reduce) { running = false; return; }
      if (performance.now() < idle) { vf.later(1500, step); return; }
      running = true;
      var P = vf.st.L === 'P';
      if (!P) {
        vf.later(900, function () { vf.tap('[data-v="tog"]', function () { vf.act('pop', 'tog'); vf.later(500, function () { vf.tap('[data-a="turn"]', function () { vf.untap(); vf.setLayout(true, true); vf.later(2000, function () { vf.tap('[data-a="ar"][data-v="4:5"]', function () { vf.act('ar', '4:5'); vf.later(900, function () { vf.tap('.biglens', function () { vf.act('lensup'); vf.untap(); vf.later(1600, step); }); }); }); }); }); }); }); });
      } else {
        vf.later(900, function () { vf.tap('[data-a="turn"]', function () { vf.untap(); vf.setLayout(false, true); vf.later(2600, step); }); });
      }
    }
    // the demo borrows the lens and frame lines while it plays, then gives back the ones the visitor picked
    var snap = null;
    seen(host, function (v) {
      vis = v;
      if (v && !running && !reduce) { snap = { lens: S.lens, ar: S.ar, landAr: S.landAr }; vf.clear(); step(); }
      if (!v) { vf.clear(); running = false; vf.untap(); if (snap) { S.lens = snap.lens; S.ar = snap.ar; S.landAr = snap.landAr; snap = null; emit(); } }
    });
  })();
  window.OS_SL = ShotList($('#sl1'));
  SunWidget($('#sunw'));
  LightWidget($('#lw'));
  window.OS_FILM = Film($('#film'));

  // reveal on scroll, the glacier's slow push in
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .12 });
  document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
  // the sun at Knole Park right now
  function nowLine() { var m = nowMin(), s = sunAt(m), ph = phase(s.el, m), name = s.el < -6 ? 'night' : ph === 'blue hour' || ph === 'golden hour' ? ph : 'sun ' + Math.round(s.el) + '° up'; $('#now').textContent = 'Knole Park now · ' + hm(m) + ' · ' + name; }
  nowLine(); setInterval(function () { nowLine(); emit(); }, 30000);
})();
