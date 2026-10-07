// D. Carousel (alt-ring.html). The projects sit as cards on a carousel; the hash picks the version:
// #c-1 a ring you drag or flick, #c-2 the page scroll turns the ring, #c-3 a flat strip you swipe. ASCII only.
(function () {
  var root = document.querySelector('.eltio.alt-ring');
  if (!root) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function arr(n) { return Array.prototype.slice.call(n); }
  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ss(a, b, v) { v = cl((v - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); }
  var wrap = root.querySelector('.k-wrap'), stage = root.querySelector('.k-stage'), rot = root.querySelector('.k-rot');
  var cards = arr(root.querySelectorAll('.k-card')), N = cards.length, STEP = 360 / N;
  var cap = root.querySelector('.k-cap'), cName = root.querySelector('.k-name'), cMeta = root.querySelector('.k-meta'), cHint = root.querySelector('.k-hint');
  var count = root.querySelector('.k-count'), sheets = arr(root.querySelectorAll('.k-sheet'));
  var shut = root.querySelector('.k-shut'), keye = root.querySelector('.k-eye'), intro = root.querySelector('.k-intro'), read = root.querySelector('.k-read');
  var t0 = performance.now();
  // on Cargo, take the big font from Cargo's own text style (set Bodycopy to Diatype Mono) so it matches the rest
  var host = root.parentElement, hs = host && getComputedStyle(host);
  if (hs && /diatype/i.test(hs.fontFamily)) {
    root.style.setProperty('--big', hs.fontFamily);
    var fv = hs.fontVariationSettings;
    if (fv && fv !== 'normal') root.style.setProperty('--bigv', /wght/.test(fv) ? fv.replace(/"wght"\s+[\d.]+/, '"wght" 300') : fv + ', "wght" 300');
  }
  var mode = 1, pos = 0, target = 0, auto = true, lastAuto = 0, front = -1, openI = -1;
  var HINT = { 1: '(drag to spin, tap to open)', 2: '(scroll to turn, tap to open)', 3: '(swipe, tap to open)' };

  function setMode() {
    var m = /c-([1-3])/.exec(location.hash);
    if (m) mode = +m[1]; else mode = /\bc-([1-3])\b/.test(root.className) ? +/\bc-([1-3])\b/.exec(root.className)[1] : 1;
    root.classList.remove('c-1', 'c-2', 'c-3'); root.classList.add('c-' + mode);
    cards.forEach(function (c) { c.style.zIndex = ''; });
    cHint.textContent = HINT[mode];
    auto = mode !== 2 && !reduce; lastAuto = performance.now();
    pos = mode === 1 && !reduce ? -1.6 : 0; target = 0; front = -1; t0 = performance.now();
    if (mode === 2) scrollTo(0, 0);
  }
  setMode(); addEventListener('hashchange', setMode);

  function kw() { return rot.offsetWidth || 220; }
  function mod(i) { return ((i % N) + N) % N; }
  function stop() { auto = false; }

  function caption(i) {
    if (i === front) return;
    var first = front < 0; front = i;
    count.textContent = '(0' + (i + 1) + '/0' + N + ')';
    function put() { cName.innerHTML = cards[i].getAttribute('data-name'); cMeta.textContent = cards[i].getAttribute('data-meta'); cap.classList.remove('sw'); }
    if (first || reduce) put(); else { cap.classList.add('sw'); setTimeout(put, 180); }
  }

  function render() {
    var w = kw();
    if (mode === 3) {
      rot.style.transform = '';
      cards.forEach(function (c, i) {
        var d = i - pos, a = Math.abs(d), s = 1 - Math.min(a, 2) * .14;
        c.style.transform = 'translate3d(' + (d * w * .92).toFixed(1) + 'px,0,0) scale(' + s.toFixed(3) + ')';
        c.style.opacity = cl(1 - a * .34, 0, 1).toFixed(3);
        c.style.zIndex = String(10 - Math.round(a));
        c.style.pointerEvents = a > 2.6 ? 'none' : '';
      });
    } else {
      var R = w * .5 / Math.tan(Math.PI / N) + w * .16;
      rot.style.transform = 'translateZ(' + (-R).toFixed(1) + 'px) rotateX(-7deg) rotateY(' + (-pos * STEP).toFixed(2) + 'deg)';
      cards.forEach(function (c, i) {
        var f = Math.cos((i - pos) * STEP * Math.PI / 180), k = (f + 1) / 2;
        c.style.transform = 'rotateY(' + (i * STEP) + 'deg) translateZ(' + R.toFixed(1) + 'px)';
        c.style.opacity = (.18 + .82 * k * k).toFixed(3);
        c.style.pointerEvents = f < .2 ? 'none' : '';
      });
    }
    caption(mod(Math.round(pos)));
  }

  // dragging and flicking (c-1, c-3)
  var drag = false, moved = 0, lx = 0, lt = 0, vel = 0, pid = null;
  function perCard() { return mode === 3 ? kw() * .92 : kw() * 1.1; }
  stage.addEventListener('pointerdown', function (e) {
    if (mode === 2 || e.button > 0) return;
    drag = true; moved = 0; lx = e.clientX; lt = performance.now(); vel = 0; pid = e.pointerId; stop();
  });
  addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== pid) return;
    var dx = e.clientX - lx, now = performance.now();
    moved += Math.abs(dx);
    if (moved > 6) { stage.classList.add('drag'); try { stage.setPointerCapture(pid); } catch (er) {} }
    var dp = -dx / perCard(); pos += dp; target = pos;
    if (mode === 3) { pos = cl(pos, -.35, N - .65); target = pos; }
    vel = dp / Math.max(8, now - lt) * 16; lx = e.clientX; lt = now;
  });
  function release() {
    if (!drag) return;
    drag = false; stage.classList.remove('drag');
    if (moved > 6) { target = Math.round(pos + vel * 9); if (mode === 3) target = cl(target, 0, N - 1); }
  }
  addEventListener('pointerup', release); addEventListener('pointercancel', release);
  // a trackpad's sideways swipe moves it too
  var wheelT = 0;
  stage.addEventListener('wheel', function (e) {
    if (mode === 2 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); stop();
    pos += e.deltaX / perCard(); if (mode === 3) pos = cl(pos, -.3, N - .7); target = pos;
    clearTimeout(wheelT); wheelT = setTimeout(function () { target = Math.round(pos); if (mode === 3) target = cl(target, 0, N - 1); }, 120);
  }, { passive: false });

  // tapping a card: the front one opens, any other turns to the front
  function goTo(i) {
    stop();
    if (mode === 2) {
      var span = wrap.offsetHeight - innerHeight, top = wrap.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + span * i / (N - 1), behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    if (mode === 3) { target = i; return; }
    var base = Math.round(pos), d = mod(i - mod(base)); if (d > N / 2) d -= N; target = base + d;
  }
  cards.forEach(function (c, i) {
    c.addEventListener('click', function (e) {
      if (moved > 6) { e.preventDefault(); moved = 0; return; }
      if (i !== front || Math.abs(pos - Math.round(pos)) > .2) { e.preventDefault(); goTo(i); return; }
      if (c.classList.contains('k-mail')) return;
      e.preventDefault(); open(i);
    });
  });
  addEventListener('keydown', function (e) {
    if (openI >= 0) {
      if (e.key === 'Escape') shut();
      if (e.key === 'ArrowRight') open((openI + 1) % sheets.length);
      if (e.key === 'ArrowLeft') open((openI + sheets.length - 1) % sheets.length);
      return;
    }
    if (mode === 2) return;
    if (e.key === 'ArrowRight') { goTo(mod(front + 1)); }
    if (e.key === 'ArrowLeft') { goTo(mod(front - 1)); }
  });

  // project sheets
  var lastFocus = null;
  function open(i) {
    if (openI >= 0) { sheets[openI].classList.remove('open'); sheets[openI].hidden = true; }
    var s = sheets[i]; openI = i; lastFocus = cards[i];
    s.hidden = false; s.scrollTop = 0; document.documentElement.style.overflow = 'hidden';
    dispatchEvent(new Event('resize'));
    requestAnimationFrame(function () { requestAnimationFrame(function () { s.classList.add('open'); }); });
    s.querySelector('.k-close').focus({ preventScroll: true });
    if (mode !== 2) goTo(i);
  }
  function shut() {
    if (openI < 0) return;
    var s = sheets[openI], i = openI; openI = -1;
    s.classList.remove('open'); document.documentElement.style.overflow = '';
    setTimeout(function () { if (!s.classList.contains('open')) s.hidden = true; }, reduce ? 0 : 700);
    if (mode === 2) goTo(i);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  sheets.forEach(function (s, i) {
    s.querySelector('.k-close').addEventListener('click', shut);
    s.querySelector('.k-next').addEventListener('click', function () { open((i + 1) % sheets.length); });
    s.querySelector('.k-prev').addEventListener('click', function () { open((i + sheets.length - 1) % sheets.length); });
  });

  // the focus pull plays by itself on load, then the ring turns in
  function focus(now) {
    var q = reduce ? 1 : cl((now - t0) / 1000 - .5, 0, 2.4) / 2.4, f = ss(0, 1, q);
    if (f >= 1) { if (shut.style.visibility !== 'hidden') { shut.style.visibility = 'hidden'; intro.style.filter = ''; intro.style.transform = ''; read.style.opacity = '0'; } return 1; }
    shut.style.visibility = '';
    var fd = ss(.3, .65, q);
    shut.style.background = 'rgba(11,11,10,' + (1 - fd).toFixed(3) + ')';
    keye.style.transform = 'scale(' + (1 + f * 1.5).toFixed(3) + ')';
    keye.style.filter = 'blur(' + (f * 18).toFixed(1) + 'px)'; keye.style.opacity = (1 - f).toFixed(3);
    intro.style.filter = 'blur(' + ((1 - f) * 22).toFixed(1) + 'px)';
    intro.style.transform = 'scale(' + (1 + (1 - f) * .04).toFixed(4) + ')';
    read.textContent = '(focus ' + (f >= .995 ? '1.2m' : f < .01 ? '\u221e' : (1.2 / Math.max(.02, f)).toFixed(1) + 'm') + ')';
    read.style.opacity = q > .02 && q < .95 ? '1' : '0';
    read.style.color = fd > .5 ? 'var(--s4)' : 'rgba(243,243,240,.7)';
    return f;
  }
  (function loop(now) {
    var fp = focus(now);
    if (mode === 2) {
      var span = wrap.offsetHeight - innerHeight, p = span > 0 ? cl(-wrap.getBoundingClientRect().top / span, 0, 1) : 0;
      var x = p * (N - 1), k = Math.floor(x), f = x - k;
      target = k + ss(.2, .8, f);
    } else if (auto && !drag && now - lastAuto > 3400) {
      lastAuto = now; target = mode === 3 ? (Math.round(target) + 1) % N : Math.round(target) + 1;
    }
    if (fp < .7 && mode !== 2) { lastAuto = now; render(); requestAnimationFrame(loop); return; }
    if (!drag) pos += (target - pos) * (reduce ? 1 : mode === 2 ? .14 : .09);
    render();
    requestAnimationFrame(loop);
  })(performance.now());
})();
