/* Out & Scout: one 3D phone that the page scrolls through.
   01 the viewfinder at your lens, 02 the real sun going round it, 03 turned upright for the Shot List, 04 the PDF fanned out. */
(function () {
"use strict";
var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
function $(s) { return document.querySelector(s); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function mix(a, b, t) { return a + (b - a) * t; }
function sm(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function ease(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
var OS = window.OS, SUN = window.OS_SUN, stick = $("#stick"), cv = $("#cv"), story = $("#story");
if (!OS || !SUN || !stick) return;
var SANS = "'Geist',system-ui,sans-serif", MONO = "'Geist Mono',ui-monospace,monospace";
var TX = "#ECEBE6", MU = "rgba(236,235,230,.55)", RU = "#2A2926", SUNC = "#FF5A1F", BG = "#121211";

var photo = new Image(), photoOK = false; photo.onload = function () { photoOK = true; dirty = true; pagesDirty = true; }; photo.src = "img/hero-glacier.jpg";
var dirty = true, pagesDirty = true;
OS.on(function (w) { dirty = true; if (w !== "time" && w !== "chapter") pagesDirty = true; });

var started = false;
function start() { if (started) return; started = true; var s = document.createElement("script"); s.src = "three.min.js"; s.onload = function () { try { build(); } catch (e) { fail(e); } }; s.onerror = fail; document.head.appendChild(s); }
function fail(e) { stick.classList.add("no3d"); if (e && window.console) console.warn(e); }
if ("IntersectionObserver" in window) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: "900px" }); io.observe(story); } else start();

/* ---------- drawing helpers ---------- */
function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
/* the photo as a lens sees it: 18 mm shows the whole width */
function crop(mm, cx, cy, aspect) {
  var iw = photo.naturalWidth || 2048, ih = photo.naturalHeight || 1152, sw = iw * Math.min(1, 18 / mm), sh = sw / aspect;
  if (sh > ih) { sh = ih; sw = sh * aspect; }
  var sx = clamp(cx * iw - sw / 2, 0, iw - sw), sy = clamp(cy * ih - sh / 2, 0, ih - sh);
  return [sx, sy, sw, sh];
}
function photoAt(x, mm, cx, cy, dx, dy, dw, dh) {
  if (!photoOK) { x.fillStyle = "#1c1d20"; x.fillRect(dx, dy, dw, dh); return; }
  var c = crop(mm, cx, cy, dw / dh); x.drawImage(photo, c[0], c[1], c[2], c[3], dx, dy, dw, dh);
}
/* grade the picture for the time of day */
function grade(x, el, dx, dy, dw, dh) {
  x.save();
  if (el < -6) { x.globalCompositeOperation = "multiply"; x.fillStyle = "rgb(30,38,70)"; x.fillRect(dx, dy, dw, dh); }
  else if (el < -4) { x.globalCompositeOperation = "multiply"; x.fillStyle = "rgb(80,105,170)"; x.fillRect(dx, dy, dw, dh); }
  else if (el < 6) { x.globalCompositeOperation = "multiply"; x.fillStyle = "rgb(255,190,140)"; x.fillRect(dx, dy, dw, dh); x.globalCompositeOperation = "screen"; x.fillStyle = "rgba(255,110,40,.18)"; x.fillRect(dx, dy, dw, dh); }
  else if (el < 15) { x.globalCompositeOperation = "multiply"; x.fillStyle = "rgb(255,236,215)"; x.fillRect(dx, dy, dw, dh); }
  x.restore();
}
function goldNow(m) { var g = SUN.golden(); return g && m >= g[0] && m <= g[1]; }

/* ---------- the viewfinder screen, 844 x 390 points ---------- */
function drawFinder(x, wL) {
  var w = 844, h = 390, tm = OS.tm, s = SUN.sunAt(tm);
  x.fillStyle = "#000"; x.fillRect(0, 0, w, h);
  photoAt(x, OS.mm, .53, .5, 0, 0, w, h);
  grade(x, s.el, 0, 0, w, h);
  /* the sun and its path over the picture, as the lens sees it */
  var fov = 2 * Math.atan(36 / (2 * OS.mm)) / Math.PI * 180, hf = fov / 2;
  function px(az, el) { var r = SUN.rel(az, OS.heading); return [w / 2 + r / hf * w / 2, h * .58 - el / (hf / 2.16) * h / 2]; }
  if (wL > .01) {
    x.save(); x.globalAlpha = wL;
    x.strokeStyle = "rgba(236,235,230,.55)"; x.lineWidth = 1.2; x.setLineDash([3, 5]); x.beginPath(); var first = true;
    for (var m = SUN.RISE; m <= SUN.SET; m += 4) { var p = SUN.sunAt(m), q = px(p.az, p.el); if (q[0] < -40 || q[0] > w + 40) { first = true; continue; } if (first) { x.moveTo(q[0], q[1]); first = false; } else x.lineTo(q[0], q[1]); }
    x.stroke(); x.setLineDash([]);
    var g = SUN.golden(); if (g) { x.strokeStyle = SUNC; x.lineWidth = 3; x.beginPath(); first = true; for (var m2 = g[0]; m2 <= g[1]; m2 += 2) { var p2 = SUN.sunAt(m2), q2 = px(p2.az, p2.el); if (q2[0] < -40 || q2[0] > w + 40) { first = true; continue; } if (first) { x.moveTo(q2[0], q2[1]); first = false; } else x.lineTo(q2[0], q2[1]); } x.stroke(); }
    /* hour ticks */
    x.fillStyle = "rgba(236,235,230,.7)"; x.font = "400 9px " + MONO; x.textAlign = "center";
    for (var hr = Math.ceil(SUN.RISE / 60) * 60; hr <= SUN.SET; hr += 60) { var p3 = SUN.sunAt(hr), q3 = px(p3.az, p3.el); if (q3[0] > 20 && q3[0] < w - 20 && q3[1] > 10 && q3[1] < h - 10) { x.beginPath(); x.arc(q3[0], q3[1], 2, 0, 7); x.fill(); x.fillText(SUN.hm(hr).slice(0, 2), q3[0], q3[1] - 8); } }
    x.textAlign = "left"; x.restore();
  }
  var q0 = px(s.az, s.el);
  if (s.el > -3 && q0[0] > -60 && q0[0] < w + 60) {
    var gl = x.createRadialGradient(q0[0], q0[1], 0, q0[0], q0[1], 160); gl.addColorStop(0, "rgba(255,225,190,.6)"); gl.addColorStop(1, "rgba(255,200,150,0)"); x.fillStyle = gl; x.fillRect(0, 0, w, h);
    x.fillStyle = SUNC; x.beginPath(); x.arc(q0[0], q0[1], 8, 0, 7); x.fill();
  }
  /* frame lines */
  var r = OS.ratio, fw, fh; if (r > w / h) { fw = w - 120; fh = fw / r; } else { fh = h - 24; fw = fh * r; }
  var fx = (w - fw) / 2, fy = (h - fh) / 2;
  x.fillStyle = "rgba(0,0,0,.5)"; x.fillRect(0, 0, w, fy); x.fillRect(0, fy + fh, w, h - fy - fh); x.fillRect(0, fy, fx, fh); x.fillRect(fx + fw, fy, w - fx - fw, fh);
  x.strokeStyle = "rgba(236,235,230,.75)"; x.lineWidth = 1; x.strokeRect(fx + .5, fy + .5, fw - 1, fh - 1);
  x.strokeStyle = "rgba(236,235,230,.5)"; x.beginPath(); x.moveTo(w / 2 - 9, h / 2); x.lineTo(w / 2 + 9, h / 2); x.moveTo(w / 2, h / 2 - 9); x.lineTo(w / 2, h / 2 + 9); x.stroke();
  /* HUD */
  x.textBaseline = "top"; x.font = "400 11px " + MONO; x.fillStyle = TX;
  x.fillText("GLACIER · " + SUN.hm(tm), fx + 12, fy + 10);
  x.textAlign = "right"; x.fillText((r === 1.78 ? "16:9" : r.toFixed(2)) + " · " + OS.mm + " MM", fx + fw - 12, fy + 10);
  x.textBaseline = "bottom"; x.textAlign = "left"; x.fillStyle = "rgba(236,235,230,.85)"; x.fillText(SUN.lightWord(tm, OS.heading).toUpperCase(), fx + 12, fy + fh - 10);
  var ph = SUN.phase(s.el, tm); x.textAlign = "right"; x.fillStyle = ph === "Golden hour" ? SUNC : "rgba(236,235,230,.85)"; x.fillText(ph.toUpperCase(), fx + fw - 12, fy + fh - 10);
  x.textAlign = "left"; x.textBaseline = "alphabetic";
  /* the right rail: lens and shutter */
  x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(w - 78, 0, 78, h);
  x.fillStyle = TX; x.font = "400 26px " + SANS; x.textAlign = "center"; x.fillText(String(OS.mm), w - 39, h / 2 - 44); x.font = "400 9px " + MONO; x.fillText("MM", w - 39, h / 2 - 30);
  x.strokeStyle = TX; x.lineWidth = 2.5; x.beginPath(); x.arc(w - 39, h / 2 + 34, 20, 0, 7); x.stroke(); x.fillStyle = "#D9D8D3"; x.beginPath(); x.arc(w - 39, h / 2 + 34, 15.5, 0, 7); x.fill();
  x.fillStyle = MU; x.font = "400 9px " + MONO; x.fillText(String(OS.shots.length), w - 39, h - 24); x.textAlign = "left";
  /* a shot was just taken */
  var since = (performance.now() - OS.fresh) / 1000;
  if (OS.fresh && since < .5) { x.fillStyle = "rgba(255,255,255," + (1 - since / .5) * .9 + ")"; x.fillRect(0, 0, w, h); }
}

/* ---------- the Shot List, 390 x 844 points ---------- */
function shotList() { var a = OS.shots.slice(); if (OS.sorted) a.sort(function (p, q) { return p.tm - q.tm; }); return a; }
function drawList(x) {
  var w = 390;
  x.fillStyle = BG; x.fillRect(0, 0, w, 844);
  x.fillStyle = TX; x.font = "500 15px " + SANS; x.fillText(SUN.hm(SUN.nowMin()), 34, 32);
  x.fillStyle = MU; x.font = "400 10px " + MONO; x.fillText("GLACIER RECCE · " + OS.shots.length + " SHOTS", 20, 82);
  x.fillStyle = TX; x.font = "400 28px " + SANS; x.fillText("Shot List", 20, 116);
  /* chips */
  [["EDIT", false], [OS.sorted ? "BY LIGHT" : "BY NUMBER", true], ["EXPORT", false]].forEach(function (c, i) {
    var bx = 20 + i * 104; x.strokeStyle = "rgba(236,235,230,.42)"; x.lineWidth = 1; rr(x, bx + .5, 134.5, 96, 28, 14);
    if (c[1]) { x.fillStyle = TX; x.fill(); } x.stroke();
    x.fillStyle = c[1] ? BG : TX; x.font = "400 10px " + MONO; x.textAlign = "center"; x.fillText(c[0], bx + 48, 152); x.textAlign = "left";
  });
  var rows = shotList(), y = 182, since = (performance.now() - OS.fresh) / 1000;
  rows.slice(0, 8).forEach(function (s) {
    var fresh = s === OS.shots[OS.shots.length - 1] && s.mine && since < 6;
    if (fresh) { x.fillStyle = "rgba(255,90,31,.12)"; x.fillRect(0, y - 6, w, 80); x.fillStyle = SUNC; x.fillRect(0, y - 6, 3, 80); }
    var tw = 112, th = Math.round(tw / Math.max(1.5, s.ratio));
    x.save(); rr(x, 20, y + (68 - th) / 2, tw, th, 4); x.clip(); photoAt(x, s.mm, s.cx, s.cy, 20, y + (68 - th) / 2, tw, th); grade(x, SUN.sunAt(s.tm).el, 20, y, tw, 68); x.restore();
    x.fillStyle = MU; x.font = "400 10px " + MONO; x.fillText(s.n, 146, y + 14);
    x.fillStyle = TX; x.font = "400 15px " + SANS; x.fillText(s.cap, 146, y + 34);
    x.fillStyle = MU; x.font = "400 10px " + MONO; x.fillText(s.mm + " MM · " + SUN.hm(s.tm) + " · " + s.word.split(",")[0].toUpperCase(), 146, y + 54);
    if (goldNow(s.tm)) { x.fillStyle = SUNC; x.beginPath(); x.arc(360, y + 10, 4, 0, 7); x.fill(); }
    x.fillStyle = RU; x.fillRect(20, y + 74, w - 40, 1);
    y += 80;
  });
  if (rows.length > 8) { x.fillStyle = MU; x.font = "400 10px " + MONO; x.fillText("+ " + (rows.length - 8) + " MORE", 20, y + 18); }
  x.fillStyle = "rgba(236,235,230,.35)"; rr(x, 140, 826, 110, 5, 3); x.fill();
}

/* ---------- PDF pages, A4 at 600 x 848 ---------- */
var PW = 600, PH = 848, INKP = "#121211", GRP = "rgba(18,18,17,.5)", RUP = "rgba(18,18,17,.14)";
function pageHead(x, title, n, of) {
  x.fillStyle = "#F7F6F2"; x.fillRect(0, 0, PW, PH);
  x.fillStyle = INKP; x.font = "400 15px " + SANS; x.fillText("Out & Sc", 40, 52); var ww = x.measureText("Out & Sc").width; x.fillStyle = SUNC; x.beginPath(); x.arc(40 + ww + 4, 44, 2.6, 0, 7); x.fill(); x.fillStyle = INKP; x.fillText("out", 40 + ww + 10, 52);
  x.fillStyle = GRP; x.font = "400 10px " + MONO; x.textAlign = "right"; x.fillText(n + " / " + of, PW - 40, 52); x.textAlign = "left";
  x.fillStyle = INKP; x.font = "400 30px " + SANS; x.fillText(title, 40, 104);
  x.fillStyle = RUP; x.fillRect(40, 122, PW - 80, 1);
}
function dayStrip(x, y) {
  var a = SUN.RISE - 60, b = SUN.SET + 60, L = 40, W = PW - 80; function X(m) { return L + (m - a) / (b - a) * W; }
  x.fillStyle = "rgba(18,18,17,.08)"; x.fillRect(L, y, W, 14);
  var g = SUN.golden(); if (g) { x.fillStyle = SUNC; x.fillRect(X(g[0]), y, X(Math.min(g[1], b)) - X(g[0]), 14); }
  x.fillStyle = GRP; x.font = "400 9px " + MONO; for (var m = Math.ceil(a / 120) * 120; m <= b; m += 120) { x.fillText(SUN.hm(m), X(m) - 12, y + 30); }
  return X;
}
function drawPage(x, k, n) {
  var rows = OS.shots.slice().sort(function (p, q) { return p.tm - q.tm; });
  if (OS.tier === "photos") {
    pageHead(x, "Frames", k + 1, n);
    rows.slice(k * 6, k * 6 + 6).forEach(function (s, i) { var cx = 40 + (i % 2) * 270, cy = 150 + Math.floor(i / 2) * 220, tw = 250, th = tw / s.ratio; photoAt(x, s.mm, s.cx, s.cy, cx, cy, tw, th); x.fillStyle = INKP; x.font = "400 11px " + MONO; x.fillText(s.n + "  " + s.cap, cx, cy + th + 18); });
    return;
  }
  if (k === 0) {
    pageHead(x, OS.tier === "summary" ? "Summary" : "Plan for the day", 1, n);
    x.fillStyle = GRP; x.font = "400 11px " + MONO; x.fillText("GLACIER RECCE · " + rows.length + " SHOTS · IN THE ORDER THE LIGHT COMES ROUND", 40, 150);
    var X = dayStrip(x, 172);
    rows.forEach(function (s) { x.fillStyle = INKP; x.beginPath(); x.arc(X(s.tm), 179, 3, 0, 7); x.fill(); });
    var y = 236; rows.slice(0, 14).forEach(function (s) {
      x.fillStyle = goldNow(s.tm) ? SUNC : INKP; x.font = "400 12px " + MONO; x.fillText(SUN.hm(s.tm), 40, y);
      x.fillStyle = INKP; x.fillText(s.n, 104, y); x.font = "400 14px " + SANS; x.fillText(s.cap, 146, y);
      x.fillStyle = GRP; x.font = "400 11px " + MONO; x.textAlign = "right"; x.fillText(s.mm + " MM · " + s.word.split(",")[0].toUpperCase(), PW - 40, y); x.textAlign = "left";
      x.fillStyle = RUP; x.fillRect(40, y + 14, PW - 80, 1); y += 38;
    });
    return;
  }
  if (OS.tier === "summary") { pageHead(x, "Notes", k + 1, n); for (var l = 0; l < 16; l++) { x.fillStyle = RUP; x.fillRect(40, 170 + l * 38, PW - 80, 1); } return; }
  if (k === 1) {
    pageHead(x, "Scene 1 · Glacier", 2, n);
    /* a map: contours, the camera and its view, the sun's arc */
    var mx = 40, my = 150, mw = PW - 80, mh = 360; x.save(); rr(x, mx, my, mw, mh, 6); x.clip(); x.fillStyle = "#EFEDE6"; x.fillRect(mx, my, mw, mh);
    x.strokeStyle = "rgba(18,18,17,.18)"; x.lineWidth = 1; for (var c = 0; c < 9; c++) { x.beginPath(); for (var t = 0; t <= 40; t++) { var px = mx + t / 40 * mw, py = my + 30 + c * 40 + Math.sin(t * .35 + c) * 14 + Math.sin(t * .9 + c * 2) * 5; t ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); }
    var cx = mx + mw * .5, cy = my + mh * .62, hd = (OS.heading - 90) * Math.PI / 180;
    x.fillStyle = "rgba(18,18,17,.1)"; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, 170, hd - .3, hd + .3); x.closePath(); x.fill();
    x.fillStyle = INKP; x.beginPath(); x.arc(cx, cy, 5, 0, 7); x.fill();
    x.strokeStyle = "rgba(18,18,17,.4)"; x.setLineDash([3, 4]); x.beginPath(); var f2 = true;
    for (var m = SUN.RISE; m <= SUN.SET; m += 10) { var p = SUN.sunAt(m), a = (p.az - 90) * Math.PI / 180, rr2 = 150 - Math.max(0, p.el) * 2.2, qx = cx + Math.cos(a) * rr2, qy = cy + Math.sin(a) * rr2; f2 ? x.moveTo(qx, qy) : x.lineTo(qx, qy); f2 = false; }
    x.stroke(); x.setLineDash([]);
    var sn = SUN.sunAt(OS.tm), sa = (sn.az - 90) * Math.PI / 180, sr = 150 - Math.max(0, sn.el) * 2.2; x.fillStyle = SUNC; x.beginPath(); x.arc(cx + Math.cos(sa) * sr, cy + Math.sin(sa) * sr, 6, 0, 7); x.fill();
    x.restore();
    x.fillStyle = GRP; x.font = "400 11px " + MONO; x.fillText("FACING WNW · 300° · SUNRISE " + SUN.hm(SUN.RISE) + " · SUNSET " + SUN.hm(SUN.SET), 40, 538);
    dayStrip(x, 566);
    return;
  }
  var s = rows[k - 2]; if (!s) { pageHead(x, "", k + 1, n); return; }
  pageHead(x, s.n + " · " + s.cap, k + 1, n);
  var tw = PW - 80, th = tw / s.ratio; photoAt(x, s.mm, s.cx, s.cy, 40, 146, tw, th); grade(x, SUN.sunAt(s.tm).el, 40, 146, tw, th);
  var y2 = 146 + th + 40;
  [["LENS", s.mm + " mm · " + (s.ratio === 1.78 ? "16:9" : s.ratio.toFixed(2))], ["TIME", SUN.hm(s.tm) + (goldNow(s.tm) ? " · golden hour" : "")], ["LIGHT", s.word], ["BE THERE", (function () { var g = SUN.golden(); return g ? SUN.hm(g[0]) + "–" + SUN.hm(g[1]) : "–"; })()]].forEach(function (r) {
    x.fillStyle = GRP; x.font = "400 10px " + MONO; x.fillText(r[0], 40, y2); x.fillStyle = INKP; x.font = "400 15px " + SANS; x.fillText(r[1], 160, y2); x.fillStyle = RUP; x.fillRect(40, y2 + 14, PW - 80, 1); y2 += 40;
  });
  x.fillStyle = GRP; x.font = "400 10px " + MONO; x.fillText("NOTES", 40, y2 + 10); for (var l2 = 0; l2 < 4; l2++) { x.fillStyle = RUP; x.fillRect(40, y2 + 44 + l2 * 32, PW - 80, 1); }
}

function rshape(T, w, h, r) { var s = new T.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
function planeUV(geo, w, h) { var p = geo.attributes.position, uv = geo.attributes.uv; for (var i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5); uv.needsUpdate = true; }

function build() {
  var T = window.THREE;
  var renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: "high-performance" });
  if (!renderer.getContext()) throw new Error("no webgl");
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  var scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, 8, 500); cam.position.set(0, 0, 60);
  var world = new T.Group(); scene.add(world);

  /* ---- the phone, landscape: 147 x 71.5 x 8.3 mm, a unit is 5 mm ---- */
  var Wd = 29.4, Hd = 14.3, R = 2.2, D = 1.2, bev = .24;
  var phone = new T.Group(), dev = new T.Group(); phone.add(dev); world.add(phone);
  var frameMat = new T.MeshPhysicalMaterial({ color: 0x8a8984, metalness: 1, roughness: .26, clearcoat: .3 });
  var body = new T.Mesh(new T.ExtrudeGeometry(rshape(T, Wd - bev * 2, Hd - bev * 2, R - bev), { depth: D, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 6, curveSegments: 24 }), frameMat); body.position.z = -D / 2; dev.add(body);
  var glass = new T.MeshPhysicalMaterial({ color: 0x020202, metalness: 0, roughness: .05, clearcoat: 1, clearcoatRoughness: .02 });
  var front = new T.Mesh(new T.ShapeGeometry(rshape(T, Wd - .15, Hd - .15, R - .1), 24), glass); front.position.z = D / 2 + bev + .03; dev.add(front);
  var sc = document.createElement("canvas"); sc.width = 1688; sc.height = 780;
  var tex = new T.CanvasTexture(sc); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  var sw = Wd - .9, sh = Hd - .9, sg = new T.ShapeGeometry(rshape(T, sw, sh, R - .45), 24); planeUV(sg, sw, sh);
  var screen = new T.Mesh(sg, new T.MeshBasicMaterial({ map: tex, toneMapped: false })); screen.position.z = D / 2 + bev + .08; screen.renderOrder = 1; dev.add(screen);
  var shine = new T.Mesh(new T.ShapeGeometry(rshape(T, Wd - .15, Hd - .15, R - .1), 24), new T.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: .12, roughness: .04, metalness: 0, clearcoat: 1, depthWrite: false })); shine.position.z = D / 2 + bev + .14; shine.renderOrder = 2; dev.add(shine);
  var bk = new T.Mesh(new T.ShapeGeometry(rshape(T, Wd - .15, Hd - .15, R - .1), 24), new T.MeshPhysicalMaterial({ color: 0x1d1d1b, metalness: .2, roughness: .55, clearcoat: .4, clearcoatRoughness: .4 })); bk.position.z = -D / 2 - bev - .03; bk.rotation.y = Math.PI; dev.add(bk);
  var isl = new T.Mesh(new T.ShapeGeometry(rshape(T, .7, 2.5, .35), 16), new T.MeshBasicMaterial({ color: 0x000000 })); isl.position.set(-Wd / 2 + 1.7, 0, D / 2 + bev + .1); isl.renderOrder = 3; dev.add(isl);
  var plat = new T.Mesh(new T.ExtrudeGeometry(rshape(T, 6.4, 6.4, 1.5), { depth: .16, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 3, curveSegments: 16 }), new T.MeshPhysicalMaterial({ color: 0x2b2a27, metalness: .3, roughness: .25, clearcoat: .8 }));
  plat.rotation.y = Math.PI; plat.position.set(-Wd / 2 + 4.0, Hd / 2 - 4.0, -D / 2 - bev); dev.add(plat);
  var ringM = new T.MeshPhysicalMaterial({ color: 0x4a4945, metalness: 1, roughness: .25 }), lensM = new T.MeshPhysicalMaterial({ color: 0x050608, metalness: .2, roughness: .02, clearcoat: 1 });
  [[-1.45, 1.45], [-1.45, -1.45], [1.5, 0]].forEach(function (o) { var ring = new T.Mesh(new T.CylinderGeometry(1.25, 1.25, .5, 40), ringM); ring.rotation.x = Math.PI / 2; ring.position.set(plat.position.x + o[0], plat.position.y + o[1], -D / 2 - bev - .38); dev.add(ring); var gl = new T.Mesh(new T.CircleGeometry(.95, 40), lensM); gl.rotation.y = Math.PI; gl.position.set(ring.position.x, ring.position.y, -D / 2 - bev - .64); dev.add(gl); });
  [[1, 7.4, 2.2], [1, 4.6, 2.2], [1, 9.6, .9], [-1, 6, 3.6]].forEach(function (b) { var m = new T.Mesh(new T.BoxGeometry(b[2], .3, .7), frameMat); m.position.set(b[1] - Wd / 2 + 4, b[0] * (Hd / 2 + .08), 0); dev.add(m); });

  /* ---- light: the real sun, a sky, and a soft key so the phone always reads ---- */
  var sunLight = new T.DirectionalLight(0xffffff, 3); world.add(sunLight); world.add(sunLight.target);
  var sky = new T.HemisphereLight(0x8fb4ff, 0x1a140c, .6); scene.add(sky);
  var key = new T.DirectionalLight(0xffffff, .9); key.position.set(-10, 12, 30); scene.add(key);
  var sunBall = new T.Mesh(new T.SphereGeometry(.9, 32, 32), new T.MeshBasicMaterial({ color: 0xFF5A1F, toneMapped: false, transparent: true })); world.add(sunBall);
  var halo = new T.Sprite(new T.SpriteMaterial({ map: (function () { var c = document.createElement("canvas"); c.width = c.height = 128; var x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,140,60,.9)"); g.addColorStop(.3, "rgba(255,120,40,.35)"); g.addColorStop(1, "rgba(255,90,31,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })(), transparent: true, depthWrite: false, blending: T.AdditiveBlending })); halo.scale.set(6, 6, 1); world.add(halo);
  function sunVec(m) { var s = SUN.sunAt(m), az = (s.az - OS.heading) * Math.PI / 180, el = Math.max(s.el, -8) * Math.PI / 180, Rr = 15; return new T.Vector3(Math.sin(az) * Math.cos(el) * Rr, Math.sin(el) * Rr * .8 + 1, Math.cos(az) * Math.cos(el) * Rr * .45 + 6); }
  var arcPts = []; for (var m = SUN.RISE; m <= SUN.SET; m += 8) arcPts.push(sunVec(m));
  var arc = new T.Line(new T.BufferGeometry().setFromPoints(arcPts), new T.LineDashedMaterial({ color: 0xECEBE6, transparent: true, opacity: 0, dashSize: .5, gapSize: .5 })); arc.computeLineDistances(); world.add(arc);
  var gd = SUN.golden(), goldArc = null; if (gd) { var gp = []; for (var m2 = gd[0]; m2 <= gd[1]; m2 += 4) gp.push(sunVec(m2)); goldArc = new T.Line(new T.BufferGeometry().setFromPoints(gp), new T.LineBasicMaterial({ color: 0xFF5A1F, transparent: true, opacity: 0 })); world.add(goldArc); }
  /* hour beads on the arc */
  var beads = []; for (var hr = Math.ceil(SUN.RISE / 60) * 60; hr <= SUN.SET; hr += 60) { var bd = new T.Mesh(new T.SphereGeometry(.14, 12, 12), new T.MeshBasicMaterial({ color: 0xECEBE6, transparent: true, opacity: 0 })); bd.position.copy(sunVec(hr)); world.add(bd); beads.push(bd); }
  var grid = new T.GridHelper(120, 40, 0x3a3833, 0x24221e); grid.position.y = -13; grid.material.transparent = true; grid.material.opacity = .4; world.add(grid);

  var pm = new T.PMREMGenerator(renderer), envRT = null, lastEnv = "";
  function skyCol(el) { if (el < -6) return { top: 0x0a0c14, ground: 0x0a0b0e, sun: 0x224466, light: 0x5a7aaa, int: .5 }; if (el < -4) return { top: 0x0e1a33, ground: 0x141a2a, sun: 0x4f6fb0, light: 0x7fa0ff, int: .9 }; if (el < 6) return { top: 0x3a3450, ground: 0x3a2a1e, sun: 0xff8c3a, light: 0xffa050, int: 2.8 }; if (el < 15) return { top: 0x5f7fb5, ground: 0x6a5f4e, sun: 0xffd9a8, light: 0xffe4c0, int: 3.2 }; return { top: 0x7f9fd0, ground: 0x8a8070, sun: 0xffffff, light: 0xffffff, int: 3.4 }; }
  function makeEnv() {
    var s = SUN.sunAt(OS.tm), k = Math.round(s.el / 3) + "|" + Math.round(s.az / 15); if (k === lastEnv) return; lastEnv = k;
    var es = new T.Scene(), col = skyCol(s.el); es.background = new T.Color(col.top);
    var ground = new T.Mesh(new T.PlaneGeometry(60, 60), new T.MeshBasicMaterial({ color: new T.Color(col.ground), side: T.DoubleSide })); ground.rotation.x = -Math.PI / 2; ground.position.y = -5; es.add(ground);
    var soft = new T.Mesh(new T.PlaneGeometry(14, 6), new T.MeshBasicMaterial({ color: new T.Color(0xffffff).multiplyScalar(.7), side: T.DoubleSide })); soft.position.set(-6, 9, 10); soft.lookAt(0, 0, 0); es.add(soft);
    if (s.el > -6) { var v = sunVec(OS.tm), b = new T.Mesh(new T.PlaneGeometry(8, 8), new T.MeshBasicMaterial({ color: new T.Color(col.sun).multiplyScalar(s.el < 6 ? 4 : 6), side: T.DoubleSide })); b.position.copy(v).multiplyScalar(.6); b.lookAt(0, 0, 0); es.add(b); }
    if (envRT) envRT.dispose(); envRT = pm.fromScene(es, .02); scene.environment = envRT.texture;
  }
  function applySun() {
    var s = SUN.sunAt(OS.tm), c = skyCol(s.el), v = sunVec(OS.tm);
    sunLight.position.copy(v); sunLight.color.set(c.light); sunLight.intensity = c.int;
    sky.color.set(c.top).multiplyScalar(2); sky.intensity = s.el < -6 ? .35 : s.el < 6 ? .7 : 1;
    sunBall.position.copy(v); halo.position.copy(v); halo.material.opacity = s.el < 6 ? .9 : .5;
    makeEnv();
  }
  applySun(); OS.on(function (w) { if (w === "time") applySun(); });

  /* ---- 01: the lens ring under the phone ---- */
  var LENS = [18, 24, 35, 50, 85], lensMesh = [];
  LENS.forEach(function (mm, i) {
    var c = document.createElement("canvas"); c.width = 256; c.height = 160; var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    var mesh = new T.Mesh(new T.PlaneGeometry(4.2, 2.6), new T.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false, opacity: 0 }));
    world.add(mesh); lensMesh.push({ mm: mm, mesh: mesh, c: c, t: t, i: i, on: -1, k: 0 });
  });
  function drawLens(L, on) {
    var x = L.c.getContext("2d"); x.clearRect(0, 0, 256, 160);
    x.strokeStyle = on ? "#ECEBE6" : "rgba(236,235,230,.35)"; x.lineWidth = 3; rr(x, 6, 6, 244, 148, 74); if (on) { x.fillStyle = "#ECEBE6"; x.fill(); } x.stroke();
    x.fillStyle = on ? "#121211" : "#ECEBE6"; x.textAlign = "center"; x.font = "400 64px " + SANS; x.fillText(String(L.mm), 128, 98); x.font = "400 20px " + MONO; x.fillText("MM", 128, 130);
    L.t.needsUpdate = true; L.on = on;
  }
  /* the field of view, drawn out of the back of the phone as a wedge of light */
  var fovGeo = new T.BufferGeometry(); fovGeo.setAttribute("position", new T.Float32BufferAttribute(new Array(8 * 3).fill(0), 3));
  var fovLine = new T.LineSegments(fovGeo, new T.LineBasicMaterial({ color: 0xECEBE6, transparent: true, opacity: 0 })); phone.add(fovLine);

  /* ---- pop-out cards for the light ---- */
  function cardTex(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return { c: c, t: t }; }
  function lbl(x, a, b, dot) { var W = x.canvas.width, H = x.canvas.height; x.clearRect(0, 0, W, H); x.fillStyle = "rgba(18,18,17,.92)"; rr(x, 2, 2, W - 4, H - 4, 24); x.fill(); x.strokeStyle = "rgba(236,235,230,.3)"; x.lineWidth = 2; x.stroke(); if (dot) { x.fillStyle = SUNC; x.beginPath(); x.arc(44, H / 2, 10, 0, 7); x.fill(); } x.fillStyle = "rgba(236,235,230,.55)"; x.font = "400 24px " + MONO; x.fillText(a, dot ? 72 : 40, H * .42); x.fillStyle = TX; x.font = "400 44px " + SANS; x.fillText(b, dot ? 72 : 40, H * .42 + 54); }
  var cards = [
    { x: -6.5, y: 10.6, z: 3, w: 11, h: 3.4, draw: function (x) { lbl(x, "LIGHT READ · " + SUN.hm(OS.tm), SUN.lightWord(OS.tm, OS.heading).split(",")[0], false); } },
    { x: 6.5, y: -10.6, z: 3, w: 10.6, h: 3.4, draw: function (x) { var g = SUN.golden(); lbl(x, "GOLDEN HOUR", g ? SUN.hm(g[0]) + " – " + SUN.hm(g[1]) : "–", true); } }
  ];
  cards.forEach(function (c) { var ct = cardTex(Math.round(c.w * 60), Math.round(c.h * 60)); c.cv = ct.c; c.tex = ct.t; c.mesh = new T.Mesh(new T.PlaneGeometry(c.w, c.h), new T.MeshBasicMaterial({ map: ct.t, transparent: true, toneMapped: false, depthWrite: false, opacity: 0 })); world.add(c.mesh); });
  function redrawCards() { cards.forEach(function (c) { c.draw(c.cv.getContext("2d")); c.tex.needsUpdate = true; }); }
  redrawCards(); OS.on(function (w) { if (w === "time") redrawCards(); });

  /* ---- 04: the PDF pages ---- */
  var pages = [];
  for (var pi = 0; pi < 6; pi++) {
    var pc = document.createElement("canvas"); pc.width = PW; pc.height = PH; var pt = new T.CanvasTexture(pc); pt.colorSpace = T.SRGBColorSpace; pt.anisotropy = 4;
    var pmesh = new T.Mesh(new T.PlaneGeometry(8, 8 * PH / PW), new T.MeshBasicMaterial({ map: pt, transparent: true, toneMapped: false, side: T.DoubleSide, opacity: 0 }));
    world.add(pmesh); pages.push({ c: pc, t: pt, mesh: pmesh });
  }
  function drawPages() { var n = OS.pageCount ? OS.pageCount() : 5; pages.forEach(function (p, k) { if (k < n) { var x = p.c.getContext("2d"); x.setTransform(1, 0, 0, 1, 0, 0); drawPage(x, k, n); p.t.needsUpdate = true; } p.mesh.visible = k < n; }); pagesDirty = false; }

  /* ---- states: where everything sits in each chapter ---- */
  /* pos, rot, turn (0 landscape, 1 upright), fit size (w, h), centre */
  var ST = [
    { px: 0, py: 1.2, pz: 0, rx: .1, ry: -.28, rz: 0, turn: 0, fw: 32, fh: 25, cx: 0, cy: -2.4 },
    { px: 0, py: 0, pz: 0, rx: .2, ry: -.42, rz: 0, turn: 0, fw: 34, fh: 29, cx: 0, cy: .8 },
    { px: 0, py: 0, pz: 0, rx: .06, ry: .32, rz: 0, turn: 1, fw: 17, fh: 32, cx: 0, cy: 0 },
    { px: -11, py: 0, pz: -3, rx: .08, ry: .5, rz: 0, turn: 1, fw: 44, fh: 30, cx: 4, cy: 0 }
  ];
  function at(S) { var i = clamp(Math.floor(S), 0, 2), f = sm(S - i), a = ST[i], b = ST[i + 1], o = {}; for (var k in a) o[k] = mix(a[k], b[k], f); return o; }
  /* weights: how much of each chapter is showing */
  function wOf(S, k) { return clamp(1 - Math.abs(S - k), 0, 1); }

  /* ---- fit the scene into the part of the screen the card leaves free ---- */
  var W = 1, H = 1, zCur = 60, oxCur = 0, oyCur = 0, first = true;
  function size() { var r = stick.getBoundingClientRect(); W = r.width || innerWidth; H = r.height || innerHeight; renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); }
  size(); addEventListener("resize", size); if (window.ResizeObserver) new ResizeObserver(size).observe(stick);
  var stepCards = Array.prototype.map.call(document.querySelectorAll(".step .card"), function (c) { return c; });
  function area() {
    var k = clamp(Math.floor(OS.c + .15), 0, 3), card = stepCards[k], cr = card ? card.getBoundingClientRect() : null, a;
    if (W < 900) {
      var top = 70, bot = H - 96; if (cr && cr.top < H && cr.bottom > 0) bot = clamp(cr.top - 10, H * .42, H - 96);
      a = { cx: .5, cy: (top + bot) / 2 / H, fw: .9, fh: (bot - top) / H };
    } else {
      var l = cr ? Math.max(cr.right + 30, W * .38) : W * .4, r = W - 50;
      a = { cx: (l + r) / 2 / W, cy: .48, fw: (r - l) / W, fh: .72 };
    }
    return a;
  }

  /* ---- drag to turn ---- */
  var yaw = 0, pitch = 0, vy = 0, drag = null;
  cv.addEventListener("pointerdown", function (e) { drag = { x: e.clientX, y: e.clientY, yaw: yaw, pitch: pitch }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", function (e) { if (!drag) return; var nx = drag.yaw + (e.clientX - drag.x) * .01; vy = (nx - yaw) * .6; yaw = nx; pitch = clamp(drag.pitch + (e.clientY - drag.y) * .005, -.45, .45); });
  function up() { drag = null; }
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") { vy -= .06; e.preventDefault(); } if (e.key === "ArrowRight") { vy += .06; e.preventDefault(); } });

  /* ---- the loop ---- */
  var visible = true; if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) loop(); }, { rootMargin: "60px" }).observe(stick);
  var t0 = performance.now(), looping = false, lastT = 0, portrait = -1, lastLens = -1, frameN = 0;
  function loop() { if (looping) return; looping = true; requestAnimationFrame(step); }
  function step(now) {
    if (!visible) { looping = false; return; }
    var t = (now - t0) / 1000, dt = Math.min(.05, t - lastT); lastT = t;
    /* where we are: c runs -1..4 through the story; S holds on each chapter and moves between them */
    var c = OS.c, i = Math.floor(c), f = c - i, S = clamp(i + sm((f - .7) / .3), 0, 3);
    if (RM) S = clamp(Math.floor(c + .15), 0, 3);
    var land = clamp(-c, 0, 1); /* coming up from the photograph */
    var s = at(S);
    if (!drag) { yaw += vy; vy *= .93; if (Math.abs(vy) < .0005) yaw += (Math.sin(t * .3) * .12 - yaw) * .015; pitch *= .97; }
    phone.position.set(s.px, s.py - 18 * land * land + (RM ? 0 : Math.sin(t * .9) * .18), s.pz - 10 * land);
    phone.rotation.set(s.rx + pitch + .5 * land, s.ry + yaw - 1.6 * land, s.rz);
    dev.rotation.z = -s.turn * Math.PI / 2;
    var wF = wOf(S, 0), wL = wOf(S, 1), wP = clamp(S - 2, 0, 1);
    /* screen: viewfinder until the phone is half turned, then the Shot List */
    var nowPortrait = s.turn > .5 ? 1 : 0;
    if (nowPortrait !== portrait) { portrait = nowPortrait; dirty = true; }
    if (OS.fresh && now - OS.fresh < 600) dirty = true;
    if (OS.playing) dirty = true;
    if (frameN++ % 2 === 0 && (dirty || (wL > .02 && wL < .98))) {
      var x = sc.getContext("2d"), sx = sc.width / 844;
      if (portrait) { x.setTransform(0, -sx, sx, 0, 0, sc.height); drawList(x); }
      else { x.setTransform(sx, 0, 0, sx, 0, 0); drawFinder(x, wL); }
      tex.needsUpdate = true; dirty = false;
    }
    /* sun, arc and cards come in for the light */
    var sv = SUN.sunAt(OS.tm).el > -8 ? 1 : 0;
    sunBall.material.opacity = wL * sv; halo.material.opacity = wL * sv * .9; sunBall.visible = halo.visible = wL > .01;
    arc.material.opacity = .35 * wL; if (goldArc) goldArc.material.opacity = .95 * wL; beads.forEach(function (b) { b.material.opacity = .6 * wL; });
    cards.forEach(function (cd, j) { var k = ease(clamp(wL * 1.6 - j * .2, 0, 1)); cd.mesh.material.opacity = k; cd.mesh.position.set(cd.x * (.5 + .5 * k), cd.y * (.5 + .5 * k) + Math.sin(t * 1.1 + j) * .12, cd.z * k); });
    /* lens ring and the field of view for the frame */
    var sel = LENS.indexOf(OS.mm);
    lensMesh.forEach(function (L, j) {
      var on = j === sel ? 1 : 0; if (L.on !== on) drawLens(L, on);
      L.k += ((on ? 1 : 0) - L.k) * .15;
      var off = (j - sel), ax = off * 5.2, az = 3 - off * off * .55;
      L.mesh.position.set(ax, -Hd / 2 - 4.2 + phone.position.y + (L.k * .5), az);
      L.mesh.rotation.y = -off * .12; L.mesh.scale.setScalar(.85 + .25 * L.k);
      L.mesh.material.opacity = wF * (on ? 1 : .55) * (1 - land);
    });
    /* the wedge: how wide this lens sees, out of the back camera */
    var half = Math.atan(18 / OS.mm), len = 26, bx = plat.position.x - 1.45, by = plat.position.y, bz = -D / 2 - bev - .7;
    var ex = Math.tan(half) * len, ey = ex / OS.ratio, p = fovGeo.attributes.position, pts = [[-ex, ey], [ex, ey], [ex, -ey], [-ex, -ey]];
    if (portrait) { /* never shown upright */ }
    for (var q = 0; q < 4; q++) { p.setXYZ(q * 2, bx, by, bz); p.setXYZ(q * 2 + 1, bx + pts[q][0] * .5, by + pts[q][1] * .5, bz - len); }
    p.needsUpdate = true; fovLine.material.opacity = .22 * wF * (1 - land); fovLine.rotation.z = dev.rotation.z;
    /* pages: stacked inside the phone, then fanned out; sent, they fly off */
    if (wP > .01 && pagesDirty) drawPages();
    var n = OS.pageCount ? Math.min(6, OS.pageCount()) : 5, sendT = OS.send ? (now - OS.send) / 1000 : -1;
    pages.forEach(function (pg, k) {
      if (k >= n) { pg.mesh.visible = false; return; } pg.mesh.visible = wP > .01;
      var e = ease(clamp(wP * 1.5 - k * .08, 0, 1)), off = k - (n - 1) / 2;
      var fx = 9 + off * 3.4, fy = -off * .5 + Math.sin(t * .8 + k) * .15, fz = 1 - Math.abs(off) * .6 + k * .05;
      var x0 = s.px, y0 = s.py, z0 = s.pz;
      pg.mesh.position.set(mix(x0, fx, e), mix(y0, fy, e), mix(z0, fz, e));
      pg.mesh.rotation.set(0, mix(.5, -.35 + off * .08, e), mix(0, -off * .05, e));
      pg.mesh.scale.setScalar(mix(.3, 1, e));
      var op = e;
      if (sendT >= 0) { var g = ease(clamp(sendT / .9 - k * .06, 0, 1)); pg.mesh.position.x += g * 40; pg.mesh.position.y += g * 14; pg.mesh.rotation.z -= g * .6; op *= 1 - g; if (sendT > 1.6) { var back = ease(clamp((sendT - 1.6) / .5, 0, 1)); op = e * back; pg.mesh.position.x -= g * 40 * back; pg.mesh.position.y -= g * 14 * back; } }
      pg.mesh.material.opacity = op;
    });
    /* fit */
    var a = area(), tn = Math.tan(cam.fov * Math.PI / 360);
    var z = Math.max(s.fw * 1.08 / (2 * tn * cam.aspect * a.fw), s.fh * 1.08 / (2 * tn * a.fh));
    var ox = (.5 - a.cx) * W, oy = (.5 - a.cy) * H;
    var k2 = first || RM ? 1 : .12; first = false;
    zCur += (z - zCur) * k2; oxCur += (ox - oxCur) * k2; oyCur += (oy - oyCur) * k2;
    world.position.set(-s.cx, -s.cy, 0);
    cam.position.z = zCur; cam.setViewOffset(W, H, oxCur, oyCur, W, H); cam.updateProjectionMatrix();
    renderer.render(scene, cam);
    requestAnimationFrame(step);
  }
  stick.classList.add("ready");
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { dirty = true; pagesDirty = true; redrawCards(); lensMesh.forEach(function (L) { L.on = -1; }); });
  loop();
}
})();
