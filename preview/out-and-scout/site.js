/* Out & Scout: the sun for Knole Park today, the HUD, the lens ring, the shutter and the chapters.
   The 3D phone (scene.js) reads window.OS and redraws when it changes. */
(function () {
"use strict";
var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
function $(s) { return document.querySelector(s); }
function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function wrap(d) { return ((d % 360) + 540) % 360 - 180; }
function n360(d) { return ((d % 360) + 360) % 360; }

/* ---------- the sun, for Knole Park, today ---------- */
var rad = Math.PI / 180, LAT = 51.269, LON = 0.205;
function sunPos(t, lat, lon) {
  lat = lat == null ? LAT : lat; lon = lon == null ? LON : lon;
  var d = t / 864e5 - .5 + 2440588 - 2451545, M = rad * (357.5291 + .98560028 * d);
  var L = M + rad * (1.9148 * Math.sin(M) + .02 * Math.sin(2 * M) + .0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI, e = rad * 23.4397;
  var dec = Math.asin(Math.sin(e) * Math.sin(L)), ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  var H = rad * (280.16 + 360.9856235 * d) + rad * lon - ra, phi = rad * lat;
  var alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  var az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  return { az: n360(az / rad + 180), el: alt / rad };
}
var LF = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
function parts(d) { var o = {}; LF.formatToParts(d).forEach(function (p) { o[p.type] = p.value; }); return o; }
var P = parts(new Date()), G = Date.UTC(+P.year, +P.month - 1, +P.day), GP = parts(new Date(G));
var MID = G - ((+GP.hour) * 60 + (+GP.minute)) * 6e4;
function nowMin() { var p = parts(new Date()); return (+p.hour) * 60 + (+p.minute); }
var SAMP = []; for (var m0 = 0; m0 <= 1440; m0 += 2) SAMP.push(sunPos(MID + m0 * 6e4));
function sunAt(m) { m = clamp(m, 0, 1440); var i = m / 2, a = Math.floor(i), b = Math.min(SAMP.length - 1, a + 1), f = i - a, A = SAMP[a], B = SAMP[b]; return { az: n360(A.az + wrap(B.az - A.az) * f), el: A.el + (B.el - A.el) * f }; }
var RISE = null, SET = null;
for (var i0 = 1; i0 < SAMP.length; i0++) { var e0 = SAMP[i0 - 1].el, e1 = SAMP[i0].el; if (e0 < -.833 && e1 >= -.833 && RISE === null) RISE = (i0 - 1) * 2 + 2 * (-.833 - e0) / (e1 - e0); if (e0 >= -.833 && e1 < -.833) SET = (i0 - 1) * 2 + 2 * (e0 + .833) / (e0 - e1); }
if (RISE === null || SET === null) { RISE = 420; SET = 1140; }
var GOLD = []; (function () { var s = null; for (var i = 0; i < SAMP.length; i++) { var e = SAMP[i].el, inb = e >= -4 && e < 6; if (inb && s === null) s = i * 2; if (!inb && s !== null) { GOLD.push([s, i * 2]); s = null; } } })();
function golden() { return GOLD.length ? GOLD[GOLD.length - 1] : null; }
function hm(m) { m = Math.round(m); m = ((m % 1440) + 1440) % 1440; return ("0" + Math.floor(m / 60)).slice(-2) + ":" + ("0" + m % 60).slice(-2); }
var KT = ["Backlit", "¾ backlit", "Side lit", "¾ front lit", "Front lit"];
function cls(r) { var a = Math.abs(r); return a <= 30 ? 0 : a <= 75 ? 1 : a <= 105 ? 2 : a <= 150 ? 3 : 4; }
function rel(az, h) { return wrap(az - h); }
function phase(el, m) { if (el < -6) return m < 720 ? "Before sunrise" : "After dark"; if (el < -4) return "Blue hour"; if (el < 6) return "Golden hour"; return Math.round(el) + "° up"; }
function lightWord(m, heading) {
  var s = sunAt(m); if (s.el <= -1) return s.el < -6 ? "After dark" : s.el < -4 ? "Blue hour" : "Sun on the horizon";
  var r = rel(s.az, heading), k = cls(r); return KT[k] + (Math.abs(r) <= 8 || Math.abs(r) >= 172 ? "" : ", sun " + (r > 0 ? "right" : "left"));
}
var SUN = window.OS_SUN = { sunAt: sunAt, sunPos: sunPos, RISE: RISE, SET: SET, golden: golden, nowMin: nowMin, hm: hm, phase: phase, cls: cls, rel: rel, KT: KT, lightWord: lightWord };

/* ---------- one shared state ---------- */
var HEAD = 300; /* the camera faces WNW, across the glacier */
var g = golden();
var OS = window.OS = {
  mm: 35, ratio: 2.39, tm: clamp(nowMin(), RISE - 80, SET + 80), playing: false, heading: HEAD,
  shots: [
    { n: "1A", cap: "Crossing the glacier", mm: 35, ratio: 2.39, tm: g ? g[0] + 12 : RISE + 30, cx: .53, cy: .53 },
    { n: "1B", cap: "Four on the snow line", mm: 85, ratio: 2.39, tm: g ? g[0] + 30 : RISE + 60, cx: .5, cy: .53 },
    { n: "2A", cap: "The col, wide", mm: 18, ratio: 1.85, tm: RISE + 50, cx: .3, cy: .3 }
  ],
  sorted: false, tier: "detailed", chapter: -1, c: 0, fresh: 0, send: 0,
  fns: [], on: function (f) { this.fns.push(f); }, emit: function (what) { this.fns.forEach(function (f) { f(what); }); }
};
OS.shots.forEach(function (s) { s.word = lightWord(s.tm, HEAD); });

/* ---------- HUD ---------- */
var hudNow = $("#hud-now"), hudGold = $("#hud-gold");
function hud() {
  var m = nowMin(), s = sunAt(m), ph = phase(s.el, m);
  hudNow.textContent = hm(m) + " · " + (s.el < -6 ? "Sun down" : ph);
  hudGold.textContent = g ? "Golden " + hm(g[0]) + "–" + hm(g[1]) : "";
}
function fmtIn(d) { d = Math.round(d); return d < 60 ? d + " min" : Math.floor(d / 60) + " h " + ("0" + d % 60).slice(-2); }
hud(); setInterval(hud, 30000);

/* ---------- chapters: which one is on, and how far through ---------- */
var steps = $$(".step"), navs = $$(".dock nav a"), chapN = $("#chap-n"), chapW = $("#chap-w"), story = $("#story");
var NAMES = ["Frame", "Light", "List", "Send"];
var tops = [];
function measure() { var sy = scrollY; tops = steps.map(function (s) { var r = s.getBoundingClientRect(); return { t: r.top + sy, h: r.height }; }); }
function onScroll() {
  if (!tops.length) measure();
  var pos = scrollY + innerHeight * .55, c = -1;
  for (var i = 0; i < tops.length; i++) if (pos >= tops[i].t) c = i + clamp((pos - tops[i].t) / tops[i].h, 0, .999);
  OS.c = c < 0 ? (pos - tops[0].t) / innerHeight : c;
  var k = c < 0 ? -1 : Math.min(3, Math.floor(c + .15)), sr = story.getBoundingClientRect();
  if (sr.bottom < innerHeight * .5) k = 4;
  if (k !== OS.chapter) {
    OS.chapter = k;
    navs.forEach(function (a, j) { a.setAttribute("aria-current", j === k ? "true" : "false"); });
    steps.forEach(function (st, j) { st.classList.toggle("on", j === k); });
    if (k >= 0 && k < 4) { chapN.textContent = "0" + (k + 1); chapW.textContent = NAMES[k]; }
    OS.emit("chapter");
  }
}
var sraf = 0;
addEventListener("scroll", function () { if (!sraf) sraf = requestAnimationFrame(function () { sraf = 0; onScroll(); }); }, { passive: true });
addEventListener("resize", function () { measure(); onScroll(); });
addEventListener("load", function () { measure(); onScroll(); });
if (window.ResizeObserver) new ResizeObserver(function () { measure(); onScroll(); }).observe(document.body);
measure(); onScroll();

/* ---------- 01 frame: lens and frame lines ---------- */
function group(sel, attr, set) {
  var bs = $$(sel + " .chip");
  bs.forEach(function (b) { b.addEventListener("click", function () { bs.forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); }); set(b.dataset[attr]); }); });
}
group("#lenses", "mm", function (v) { OS.mm = +v; OS.emit("lens"); });
group("#ratios", "r", function (v) { OS.ratio = +v; OS.emit("lens"); });

/* ---------- the shutter ---------- */
var shutter = $("#shutter"), count = $("#shots"), flash = $("#flash"), iris = $("#iris"), taken = 0;
function fire(el) { el.classList.remove("go"); void el.offsetWidth; el.classList.add("go"); }
function take() {
  if (!RM) { fire(flash); fire(iris); }
  shutter.classList.add("press"); setTimeout(function () { shutter.classList.remove("press"); }, 140);
  taken++;
  var scene = 1, letter = 0, last = OS.shots[OS.shots.length - 1];
  if (last) { scene = +last.n.charAt(0); letter = last.n.charCodeAt(1) - 64; }
  if (letter >= 6) { scene++; letter = 0; }
  var shot = { n: scene + String.fromCharCode(65 + letter), cap: "Shot " + taken + ", " + OS.mm + " mm", mm: OS.mm, ratio: OS.ratio, tm: OS.tm, cx: .5 + (Math.random() - .5) * .3, cy: .5 + (Math.random() - .5) * .1, mine: true };
  shot.word = lightWord(shot.tm, HEAD);
  OS.shots.push(shot); if (OS.shots.length > 12) OS.shots.splice(3, 1);
  OS.fresh = performance.now();
  count.textContent = taken; count.classList.add("on"); count.classList.remove("bump"); void count.offsetWidth; count.classList.add("bump");
  slCount();
  OS.emit("shot");
  /* from the photograph, a shot takes you into the viewfinder */
  if (OS.chapter < 0) setTimeout(goFrame, RM ? 0 : 380);
}
function frameTop() { return $("#frame").getBoundingClientRect().top + scrollY; }
function goFrame() {
  var y = frameTop(); scrollTo({ top: y, behavior: RM ? "auto" : "smooth" });
  /* if a smooth scroll gets cut short, finish the move */
  var moved = false, mark = function () { moved = true; };
  addEventListener("touchstart", mark, { passive: true, once: true }); addEventListener("wheel", mark, { passive: true, once: true });
  setTimeout(function () { removeEventListener("touchstart", mark); removeEventListener("wheel", mark); if (!moved && scrollY < frameTop() - innerHeight * .3) scrollTo({ top: frameTop(), behavior: "instant" }); }, 1400);
}
shutter.addEventListener("click", take);
addEventListener("keydown", function (e) { if ((e.key === " " || e.key === "Enter") && e.target === document.body) { e.preventDefault(); take(); } });

/* ---------- 02 light: the day ---------- */
var range = $("#lt-time"), read = $("#lt-read"), log = $("#lt-log"), play = $("#lt-play");
range.min = Math.floor(RISE - 90); range.max = Math.ceil(SET + 90); range.value = OS.tm;
if (g) { var span = range.max - range.min; range.style.setProperty("--g0", ((g[0] - range.min) / span * 100).toFixed(1) + "%"); range.style.setProperty("--g1", ((Math.min(g[1], +range.max) - range.min) / span * 100).toFixed(1) + "%"); }
function lightText() {
  var s = sunAt(OS.tm), ph = phase(s.el, OS.tm), w = lightWord(OS.tm, HEAD);
  read.innerHTML = hm(OS.tm) + " · " + (ph === "Golden hour" ? "<em>Golden hour</em>" : ph) + (s.el > -1 ? "<br>" + w : "");
  log.textContent = "Rise " + hm(RISE) + " · set " + hm(SET);
}
function setTime(v) { OS.tm = clamp(+v, +range.min, +range.max); range.value = OS.tm; lightText(); OS.emit("time"); }
range.addEventListener("input", function () { stopPlay(); setTime(range.value); });
function stopPlay() { OS.playing = false; play.setAttribute("aria-pressed", "false"); play.textContent = "Play the day"; }
play.addEventListener("click", function () {
  if (OS.playing) { stopPlay(); return; }
  OS.playing = true; play.setAttribute("aria-pressed", "true"); play.textContent = "Pause";
  if (OS.tm >= +range.max - 2) setTime(range.min);
  var last = performance.now();
  (function tick(now) { if (!OS.playing) return; var dt = Math.min(.05, (now - last) / 1000); last = now; var nt = OS.tm + dt * 48; if (nt >= +range.max) { setTime(range.max); stopPlay(); return; } setTime(nt); requestAnimationFrame(tick); })(last);
});
lightText();

/* ---------- 03 list ---------- */
var slc = $("#sl-count"), sortB = $("#sl-sort");
function slCount() { slc.textContent = OS.shots.length + " shots" + (taken ? " · " + taken + " yours" : ""); }
sortB.addEventListener("click", function () { OS.sorted = !OS.sorted; sortB.setAttribute("aria-pressed", OS.sorted ? "true" : "false"); OS.emit("list"); });
slCount();

/* ---------- 04 send ---------- */
var pagesEl = $("#pages"), sendB = $("#send-it"), sentUntil = 0;
function pageCount() { var n = OS.shots.length; return OS.tier === "detailed" ? 2 + n : OS.tier === "summary" ? 1 + Math.ceil(n / 12) : Math.ceil(n / 6); }
OS.pageCount = pageCount;
function pagesText() { if (performance.now() < sentUntil) return; var n = pageCount(); pagesEl.classList.remove("sent"); pagesEl.textContent = n + " page" + (n === 1 ? "" : "s"); }
group("#tiers", "t", function (v) { OS.tier = v; pagesText(); OS.emit("pdf"); });
OS.on(function (w) { if (w === "shot") pagesText(); });
pagesText();
sendB.addEventListener("click", function () {
  if (OS.send) return;
  OS.send = performance.now(); sendB.disabled = true; OS.emit("send");
  setTimeout(function () {
    sentUntil = performance.now() + 4200;
    pagesEl.textContent = "Sent to the director and the 1st AD"; pagesEl.classList.add("sent");
  }, RM ? 0 : 900);
  setTimeout(function () { OS.send = 0; sendB.disabled = false; OS.emit("pdf"); }, RM ? 400 : 2200);
  setTimeout(function () { sentUntil = 0; pagesText(); }, RM ? 4400 : 5200);
});

/* ---------- today's sun at ten places ---------- */
var strip = $("#places");
if (strip) {
  var PL = [["Knole Park", 51.269, .205], ["Seven Sisters", 50.75, .15], ["Dungeness", 50.914, .969], ["Dartmoor", 50.57, -3.92], ["Brecon Beacons", 51.884, -3.436], ["Snowdon", 53.068, -4.076], ["Peak District", 53.35, -1.8], ["Lake District", 54.46, -3.09], ["Glencoe", 56.68, -5.1], ["Isle of Skye", 57.27, -6.2]];
  var now = nowMin();
  var html = PL.map(function (pl) {
    var rise = null, set = null, gs = null, ge = null, prev = sunPos(MID, pl[1], pl[2]);
    for (var m = 2; m <= 1440; m += 2) { var e = sunPos(MID + m * 6e4, pl[1], pl[2]); if (prev.el < -.833 && e.el >= -.833 && rise === null) rise = m; if (prev.el >= -.833 && e.el < -.833) set = m; if (m >= 720 && e.el < 6 && prev.el >= 6 && gs === null) gs = m; if (m >= 720 && e.el < -4 && prev.el >= -4 && ge === null) ge = m; prev = e; }
    var up = sunPos(MID + now * 6e4, pl[1], pl[2]).el > -.833;
    return '<span><i' + (up ? ' class="lit"' : '') + '></i><b>' + pl[0] + '</b> ↑ ' + (rise ? hm(rise) : "–") + ' · golden ' + (gs ? hm(gs) : "–") + '–' + (ge ? hm(ge) : "–") + ' · ↓ ' + (set ? hm(set) : "–") + '</span>';
  }).join("");
  strip.querySelector(".pl-track").innerHTML = html + html;
}

/* ---------- price: Free / Pro flips the sample page and the selected card ---------- */
var sheet = $("#sheet");
if (sheet) {
  var CAP = { free: "Free · sent with the mark", pro: "Pro · clean, £29.99 once", founding: "Founding · clean, £14.99 once" };
  var setP = function (p) {
    sheet.classList.toggle("pro", p !== "free");
    $$("#pv-t .chip").forEach(function (b) { b.setAttribute("aria-pressed", (b.dataset.p === "free") === (p === "free") ? "true" : "false"); });
    $$(".tier").forEach(function (t) { t.classList.toggle("sel", t.dataset.p === p); });
    $("#pv-cap").textContent = CAP[p];
  };
  $$("#pv-t .chip").forEach(function (b) { b.addEventListener("click", function () { setP(b.dataset.p); }); });
  $$(".tier").forEach(function (t) { t.addEventListener("click", function (e) { if (!e.target.closest("a")) setP(t.dataset.p); }); });
}
})();
