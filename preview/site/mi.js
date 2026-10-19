// 19 Oct Elliot: the phone landing needs its own opening moment, in the world of the desktop ink (a white goo layer
// set to difference, so wherever the ink is the page turns paper on ink). Four options to try on the test site,
// picked with ?intro=1..4 (intros.html links them). Phones only; the desktop keeps its pointer ink.
(function () {
  var m = /[?&]intro=(\d)/.exec(location.search), V = m ? +m[1] : 0;
  if (!V || innerWidth > 760) return;
  var NS = 'http://www.w3.org/2000/svg', W = innerWidth, H = innerHeight, t0 = 0, done = false, raf;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var css = document.createElement('style');
  css.textContent = '.mi-ink{position:fixed;inset:0;z-index:2147483000;pointer-events:none;mix-blend-mode:difference;transition:opacity .35s}' +
    '.mi-ink svg{display:block;width:100%;height:100%}.mi-ink.out{opacity:0}html.mi-hold,html.mi-hold body{overflow:hidden;touch-action:none}' +
    '.eltio.lp .x-ink{display:none!important}';
  document.head.appendChild(css);
  var lay = document.createElement('div'); lay.className = 'mi-ink'; lay.setAttribute('aria-hidden', 'true');
  var blur = V === 4 ? 14 : 10;
  lay.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '"><defs><filter id="mi-goo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceGraphic" stdDeviation="' + blur + '"/>' +
    '<feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"/></filter></defs><g filter="url(#mi-goo)" fill="#fff"></g></svg>';
  var g = lay.querySelector('g');
  function dot() { var c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 0); g.appendChild(c); return c; }
  function put(c, x, y, r) { c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', Math.max(0, r).toFixed(1)); }
  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(t, a, b) { return cl((t - a) / (b - a), 0, 1); }
  var eo = function (k) { return 1 - Math.pow(1 - k, 3); }, ei = function (k) { return k * k * k; };
  var eio = function (k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  var R = Math.hypot(W, H);

  // where the full stop of the first line sits, for the drop to come to rest on
  function stop() {
    var ln = document.querySelector('.x-hero .x-l1 .ln'), tn = ln && ln.firstChild;
    if (!tn || tn.nodeType !== 3) return { x: W * .5, y: H * .3 };
    var rg = document.createRange(), n = tn.textContent.length; rg.setStart(tn, n - 1); rg.setEnd(tn, n);
    var b = rg.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.bottom - b.height * .22 };
  }

  // the intros that cover the page hold it still until they clear; a touch or a scroll skips to the end
  var hold = V !== 3;
  function finish() {
    if (done) return; done = true;
    document.documentElement.classList.remove('mi-hold');
    if (V !== 3) { lay.classList.add('out'); setTimeout(function () { cancelAnimationFrame(raf); lay.remove(); }, 400); }
  }
  if (hold) {
    document.documentElement.classList.add('mi-hold');
    ['touchstart', 'wheel', 'keydown'].forEach(function (ev) { addEventListener(ev, function () { if (t0 && performance.now() - t0 > 350) finish(); }, { passive: true, once: false }); });
  }

  // 1 Drop: one drop falls from the header rule, splashes into a flood that turns the page to ink, then draws back
  // into a single dot that settles as the full stop after "apps."
  function drop() {
    var main = dot(), tail = [dot(), dot(), dot()], spl = [], P = null, x0 = W * .5, yHit = H * .46;
    for (var i = 0; i < 9; i++) spl.push({ c: dot(), a: (i / 9) * Math.PI * 2 + .3, v: 70 + (i * 37) % 60, r: 5 + (i * 7) % 8 });
    return function (t) {
      P = P || stop();
      var f = seg(t, 0, .62), y = 70 + (yHit - 70) * f * f;
      if (t < .62) {
        put(main, x0, y, 11 + 3 * f);
        tail.forEach(function (c, i) { put(c, x0, y - (i + 1) * (6 + 16 * f), (8 - i * 2.2) * (.4 + f)); });
        return;
      }
      tail.forEach(function (c) { put(c, 0, 0, 0); });
      var s = eo(seg(t, .62, 1.45)), back = eio(seg(t, 1.9, 2.75));
      spl.forEach(function (d) {
        var k = seg(t, .62, 1.05), dist = d.v * eo(k) * 1.6 + s * R * .2;
        put(d.c, x0 + Math.cos(d.a) * dist, yHit + Math.sin(d.a) * dist, d.r * (1 - seg(t, 1.1, 1.4)));
      });
      var r = 14 + (R - 14) * s, cx = x0 + (P.x - x0) * back, cy = yHit + (P.y - yHit) * back;
      r += (3.2 - r) * back;
      put(main, cx, cy, r);
      if (back > .85) g.removeAttribute('filter'); else g.setAttribute('filter', 'url(#mi-goo)');
      if (t > 2.75) { put(main, P.x, P.y, 3.2 * (1 - seg(t, 3.1, 3.4))); }
      if (t > 3.45) return true;
    };
  }

  // 2 Blot: a mirrored ink blot opens from a seam down the middle, breathes once, and breaks into drops that fall away
  function blot() {
    var B = [], cx = W / 2;
    for (var i = 0; i < 9; i++) {
      var y = H * (.12 + .5 * Math.random()), dx = 6 + Math.random() * W * .26, r = 18 + Math.random() * W * .17;
      B.push({ l: dot(), r: dot(), y: y, dx: dx, rr: r, d: Math.random() * .45, v: 120 + Math.random() * 260 });
    }
    var spine = [dot(), dot(), dot(), dot()];
    return function (t) {
      var seam = eo(seg(t, 0, .5)), out = seg(t, 2.05, 2.9);
      spine.forEach(function (c, i) { put(c, cx, H * (.18 + i * .21), 16 * seam * (1 - seg(t, 1.8, 2.2))); });
      B.forEach(function (b) {
        var k = eo(seg(t, .25 + b.d, 1.15 + b.d)), br = 1 + .07 * Math.sin((t - .9) * 5) * seg(t, 1, 1.4) * (1 - out);
        var r = b.rr * k * br * (1 - .75 * out), dx = b.dx * (.3 + .7 * k) + out * 30, fy = b.y + b.v * out * out;
        put(b.l, cx - dx, fy, r); put(b.r, cx + dx, fy, r);
      });
      if (t > 2.9) return true;
    };
  }

  // 3 Touch: the desktop ink, made for a thumb. A small pool waits at the foot of the screen, lifts and wanders over the
  // words on its own, and follows your finger; once you scroll on, it runs off the bottom
  function touch() {
    var N = 7, D = [], tx = -1, ty = -1, last = -1e9;
    for (var i = 0; i < N; i++) D.push({ c: dot(), x: W * .5, y: H + 40 });
    function aim(e) { var p = e.touches ? e.touches[0] : e; if (p) { tx = p.clientX; ty = p.clientY; last = performance.now(); } }
    addEventListener('touchstart', aim, { passive: true }); addEventListener('touchmove', aim, { passive: true });
    return function (t) {
      var hero = document.querySelector('.x-hero'), hh = hero ? hero.offsetHeight : H * .6, sy = scrollY;
      var gone = cl(sy / (hh * .8), 0, 1), rise = eo(seg(t, .1, 1.1)), hx, hy;
      if (performance.now() - last < 1600) { hx = tx; hy = ty; }
      else if (t < 1.6) { hx = W * .5; hy = H - 40 - (H * .45) * rise; }
      else { var w = t - 1.6; hx = W * (.5 + .3 * Math.sin(w * .8)); hy = H * (.32 + .12 * Math.sin(w * 1.3 + 1)); }
      hy += gone * gone * H * 1.2;
      D.forEach(function (d, i) {
        var lead = i ? D[i - 1] : { x: hx, y: hy }, f = i ? .3 : .14;
        d.x += (lead.x - d.x) * f; d.y += (lead.y - d.y) * f;
        var wob = i * 2.4, s = t * 1.2;
        put(d.c, d.x + Math.sin(s * 1.3 + i * 1.7) * wob, d.y + Math.cos(s * 1.1 + i * 2.3) * wob, (58 - i * 6) * (.35 + .65 * rise));
      });
    };
  }

  // 4 Drain: the page opens as ink with the words in paper, then the ink drains down the screen in drips,
  // uncovering the page from the top; the last drips run off the bottom
  function drain() {
    var rect = document.createElementNS(NS, 'rect'); g.appendChild(rect);
    var E = [], n = Math.ceil(W / 34) + 1, drips = [];
    for (var i = 0; i < n; i++) E.push({ c: dot(), x: i * W / (n - 1), p: Math.random() * 6 });
    for (var j = 0; j < 8; j++) drips.push({ c: [dot(), dot(), dot()], x: W * (.06 + .88 * Math.random()), len: 90 + Math.random() * 150, d: Math.random() * .6, r: 11 + Math.random() * 7 });
    return function (t) {
      var k = eio(seg(t, .55, 2.6)), top = -60 + (H + 160) * k;
      rect.setAttribute('x', -40); rect.setAttribute('width', W + 80); rect.setAttribute('y', top); rect.setAttribute('height', H + 200);
      E.forEach(function (e) { put(e.c, e.x, top + Math.sin(t * 4 + e.p) * 7, 22); });
      // strands left clinging above the surface as it drops, stretching then letting go
      drips.forEach(function (d) {
        var q = seg(t, .6 + d.d, 1.9 + d.d), hang = d.len * Math.sin(Math.PI * q);
        d.c.forEach(function (c, i) { put(c, d.x, top - hang * (i + 1) / 3, q > 0 && q < 1 ? d.r * (1 - i * .18) : 0); });
      });
      if (t > 3.2) return true;
    };
  }

  var ft = /[?&]mit=([\d.]+)/.exec(location.search), FT = ft ? +ft[1] : -1; // a still at a set time, for checking frames
  var step = [null, drop, blot, touch, drain][V];
  if (!step) return;
  function go() {
    document.body.appendChild(lay);
    var f = step(); t0 = performance.now();
    (function loop() {
      var t = FT >= 0 ? FT : (performance.now() - t0) / 1000;
      if (done && V !== 3) return;
      if (f(t)) return finish();
      raf = requestAnimationFrame(loop);
    })();
    if (V === 3) document.documentElement.classList.remove('mi-hold');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
