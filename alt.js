// Behaviour for the alternate designs (alt-reel, alt-index, alt-iris). ASCII only.
(function () {
  var root = document.querySelector('.eltio.alt');
  if (!root) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
  function arr(n) { return Array.prototype.slice.call(n); }
  function narrow() { return innerWidth <= 760; }

  // ---------- pieces drawn at a design width and scaled to fit their box ----------
  function maxH(fit) {
    if (narrow()) return Infinity;
    var stage = fit.closest('.r-stage, .i-stage');
    if (!stage) return Infinity;
    if (stage.classList.contains('r-stage')) return stage.parentNode.clientHeight - 148;
    return stage.clientHeight;
  }
  function fitOne(fit) {
    var inn = fit.firstElementChild, cw = fit.clientWidth || fit.parentNode.clientWidth;
    if (!cw) return;
    var dw = cw < 700 ? Math.max(340, cw) : 1100;
    inn.style.setProperty('--dw', dw + 'px');
    var h = inn.offsetHeight || 1;
    var s = Math.min(cw / dw, maxH(fit) / h, 1.25);
    inn.style.setProperty('--s', s.toFixed(4));
    fit.style.height = Math.ceil(h * s) + 'px';
  }
  var fits = arr(root.querySelectorAll('.fit'));
  function fitAll() { fits.forEach(fitOne); }
  if (window.ResizeObserver) { var ro = new ResizeObserver(function () { fitAll(); }); fits.forEach(function (f) { ro.observe(f.firstElementChild); }); }
  addEventListener('resize', fitAll); addEventListener('load', fitAll); fitAll();

  // letters decode from noise
  var GLY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_-+';
  function decode(el) {
    if (reduce) return;
    var txt = el.getAttribute('data-txt') || el.textContent; el.setAttribute('data-txt', txt);
    var t0 = performance.now(), dur = 380 + txt.length * 30;
    (function step(now) {
      var k = cl((now - t0) / dur, 0, 1), n = Math.floor(k * txt.length), s = txt.slice(0, n);
      for (var i = n; i < txt.length; i++) s += txt[i] === ' ' ? ' ' : GLY[(Math.random() * GLY.length) | 0];
      el.textContent = s;
      if (k < 1) requestAnimationFrame(step); else el.textContent = txt;
    })(t0);
  }

  // ---------- A. Reel ----------
  if (root.classList.contains('alt-reel')) {
    var wrap = root.querySelector('.r-track-wrap'), track = root.querySelector('.r-track');
    var panels = arr(root.querySelectorAll('.r-panel')), clips = arr(root.querySelectorAll('.r-clip'));
    var head = root.querySelector('.r-head'), line = root.querySelector('.r-clips'), tc = root.querySelector('.r-tc');
    var eye = root.querySelector('.r-eye'), slate = root.querySelector('.r-slate');
    var cur = -1, ready = false;
    function size() { wrap.style.height = narrow() ? '' : (track.scrollWidth - innerWidth + innerHeight) + 'px'; }
    addEventListener('resize', size); addEventListener('load', size); size();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function frame() {
      var vw = innerWidth, vh = innerHeight, x, p, i;
      if (narrow()) {
        var dh = document.documentElement.scrollHeight - vh;
        p = dh > 0 ? cl(scrollY / dh, 0, 1) : 0;
        i = 0; panels.forEach(function (pn, j) { if (pn.getBoundingClientRect().top < vh * .5) i = j; });
        x = p * (panels.length - 1) * vw;
      } else {
        var r = wrap.getBoundingClientRect(), span = wrap.offsetHeight - vh;
        p = span > 0 ? cl(-r.top / span, 0, 1) : 0;
        x = p * (track.scrollWidth - vw);
        track.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,0,0)';
        i = Math.round(x / vw);
        // the drawing in each panel drifts against the scroll, like a slower plane
        panels.forEach(function (pn, j) {
          var st = pn.querySelector('.r-stage'); if (!st) return;
          var off = (j * vw - x) / vw;
          st.style.transform = Math.abs(off) < 1.2 ? 'translate3d(' + (off * -90).toFixed(1) + 'px,0,0)' : '';
        });
      }
      var secs = x / vw * 12, f = Math.floor((secs % 1) * 25);
      tc.textContent = '00:' + pad(Math.floor(secs / 60)) + ':' + pad(Math.floor(secs % 60)) + ':' + pad(f);
      var lr = line.getBoundingClientRect();
      head.style.transform = 'translate3d(' + (p * (lr.width - 1)).toFixed(1) + 'px,0,0)';
      if (eye) eye.style.transform = 'rotate(' + (x * .06).toFixed(2) + 'deg) scale(' + (1 + Math.min(x / vw, 1) * .5).toFixed(3) + ')';
      if (i !== cur) {
        cur = i;
        clips.forEach(function (c, j) { c.classList.toggle('on', j === i); });
        if (ready && !reduce && !narrow() && i > 0) {
          slate.querySelector('.r-slate-n').textContent = 'Scene 0' + i;
          slate.querySelector('.r-slate-t').textContent = panels[i].getAttribute('data-name');
          slate.classList.remove('go'); void slate.offsetWidth; slate.classList.add('go');
        }
      }
      ready = true;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    clips.forEach(function (c) {
      c.addEventListener('click', function () {
        var i = +c.getAttribute('data-i');
        var y = narrow() ? panels[i].getBoundingClientRect().top + scrollY - 48 : wrap.offsetTop + i * innerWidth;
        scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  }

  // ---------- B. Index ----------
  if (root.classList.contains('alt-index')) {
    var rows = arr(root.querySelectorAll('.x-row')), sheets = arr(root.querySelectorAll('.x-sheet'));
    var peek = root.querySelector('.x-peek'), peeks = arr(root.querySelectorAll('.x-peek-i'));
    var label = document.createElement('div'); label.className = 'x-cur'; label.textContent = 'Open'; label.setAttribute('aria-hidden', 'true'); root.appendChild(label);
    var tx = -999, ty = -999, px = -999, py = -999, lx = -999, ly = -999;
    addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function loop() {
      px += (tx - px) * .12; py += (ty - py) * .12; lx += (tx - lx) * .35; ly += (ty - ly) * .35;
      peek.style.transform = 'translate(' + (px + 40).toFixed(1) + 'px,' + (py - 120).toFixed(1) + 'px)';
      label.style.transform = 'translate(' + (lx + 12).toFixed(1) + 'px,' + (ly + 12).toFixed(1) + 'px)';
      requestAnimationFrame(loop);
    })();
    rows.forEach(function (r, i) {
      r.addEventListener('pointerenter', function () {
        peeks.forEach(function (p, j) { p.classList.toggle('on', j === i); });
        peek.classList.add('on'); label.classList.add('on');
        decode(r.querySelector('.x-name'));
      });
      r.addEventListener('pointerleave', function () { peek.classList.remove('on'); label.classList.remove('on'); });
      r.querySelector('.x-open').addEventListener('click', function (e) { open(i, e.clientX, e.clientY); });
    });
    var openI = -1, lastBtn = null;
    function open(i, x, y) {
      if (openI >= 0) shut(true);
      var s = sheets[i]; openI = i; lastBtn = rows[i].querySelector('.x-open');
      s.style.setProperty('--ox', (x == null ? innerWidth / 2 : x) + 'px');
      s.style.setProperty('--oy', (y == null ? innerHeight / 2 : y) + 'px');
      s.hidden = false; s.scrollTop = 0; document.documentElement.style.overflow = 'hidden';
      arr(s.querySelectorAll('.fit')).forEach(fitOne);
      requestAnimationFrame(function () { requestAnimationFrame(function () { s.classList.add('open'); }); });
      s.querySelector('.x-close').focus({ preventScroll: true });
      peek.classList.remove('on'); label.classList.remove('on');
    }
    function shut(now) {
      if (openI < 0) return;
      var s = sheets[openI]; openI = -1;
      s.classList.remove('open');
      document.documentElement.style.overflow = '';
      if (now || reduce) s.hidden = true; else setTimeout(function () { if (!s.classList.contains('open')) s.hidden = true; }, 800);
      if (!now && lastBtn) lastBtn.focus({ preventScroll: true });
    }
    sheets.forEach(function (s, i) {
      s.querySelector('.x-close').addEventListener('click', function () { shut(); });
      s.querySelector('.x-next').addEventListener('click', function () { open((i + 1) % sheets.length); });
      s.querySelector('.x-prev').addEventListener('click', function () { open((i + sheets.length - 1) % sheets.length); });
    });
    addEventListener('keydown', function (e) {
      if (openI < 0) return;
      if (e.key === 'Escape') shut();
      if (e.key === 'ArrowRight') open((openI + 1) % sheets.length);
      if (e.key === 'ArrowLeft') open((openI + sheets.length - 1) % sheets.length);
    });
  }

  // ---------- C. Iris ----------
  if (root.classList.contains('alt-iris')) {
    var op = root.querySelector('.i-open'), shutEl = root.querySelector('.i-shut'), ieye = root.querySelector('.i-eye');
    var setT = function () {
      // preview only: alt-iris.html#t-b picks a type layout; with no hash the page keeps the class it was built with
      var m = /t-[a-d]|t-0/.exec(location.hash), o = /o-[0-5]/.exec(location.hash);
      if (m) ['t-a', 't-b', 't-c', 't-d'].forEach(function (k) { root.classList.toggle(k, m[0] === k); });
      // preview only: #o-1..3 swaps the opening (o-0 or none = the iris)
      if (o) { ['o-1', 'o-2', 'o-3'].forEach(function (k) { root.classList.toggle(k, o[0] === k || ((o[0] === 'o-4' || o[0] === 'o-5') && k === 'o-2')); }); root.classList.toggle('pk', o[0] === 'o-4' || o[0] === 'o-5'); root.classList.toggle('cf', o[0] === 'o-5'); t0 = Date.now(); }
      // the live opening is D: the focus pull playing by itself with the first card peeking. Set here too so the page
      // already pasted into Cargo (built as o-2) picks it up without re-pasting
      else { if (!/\bo-[0-3]\b/.test(root.className)) root.classList.add('o-2'); if (root.classList.contains('o-2')) root.classList.add('pk'); }
      fitAll();
    };
    setT(); addEventListener('hashchange', setT);
    var intro = root.querySelector('.i-intro'), read = root.querySelector('.i-read');
    if (!read) { read = document.createElement('span'); read.className = 'm i-read'; read.setAttribute('aria-hidden', 'true'); root.querySelector('.i-open-sticky').appendChild(read); }
    var t0 = Date.now(), cfDone = false, stackEl = root.querySelector('.i-stack'), down = root.querySelector('.i-down'), pct = root.querySelector('.i-pct'), cards = arr(root.querySelectorAll('.i-card'));
    (function loop() {
      var vh = innerHeight, vw = innerWidth, r = op.getBoundingClientRect();
      // the aperture follows the scroll even with Reduce Motion on (only the eye's spin is dropped), so phones with it set still see it open
      var q = cl(-r.top / Math.max(1, op.offsetHeight - vh), 0, 1);
      // peek mode: the opening plays by itself on load instead of waiting for a scroll, and the first card sits peeking at the bottom
      if (root.classList.contains('pk')) {
        var since = (Date.now() - t0) / 1000;
        if (root.classList.contains('cf')) {
          // card first: the first project fills the screen, then drops away to reveal the intro and waits at the bottom
          if (scrollY > 4) cfDone = true;
          var dp = cfDone || reduce ? 1 : cl((since - 1.5) / 1.5, 0, 1); dp = 1 - Math.pow(1 - dp, 3);
          stackEl.style.translate = dp < 1 ? '0 ' + (-(1 - dp) * (op.offsetHeight - 56)).toFixed(1) + 'px' : '';
          var qa = cfDone ? 1 : cl((since - 1.7) / 1.8, 0, 1);
        } else var qa = cl((since - .6) / 2.6, 0, 1);
        q = reduce ? 1 : qa * qa * (3 - 2 * qa);
      } else stackEl.style.translate = '';
      root.classList.toggle('at-top', scrollY < 24);
      var e = q * q * (3 - 2 * q);
      // the mask is written out in full each frame: Safari doesn't repaint a mask when only a CSS variable inside it changes
      var mode = root.classList.contains('o-1') ? 1 : root.classList.contains('o-2') ? 2 : root.classList.contains('o-3') ? 3 : 0, g = 'none';
      shutEl.style.background = ''; intro.style.filter = ''; intro.style.transform = ''; read.style.opacity = '0';
      if (mode === 0) {
        var hole = e * Math.hypot(vw, vh) * .55, g = 'radial-gradient(circle at 50% 50%, transparent ' + hole.toFixed(1) + 'px, #000 ' + (hole + 1).toFixed(1) + 'px)';
        shutEl.style.webkitMaskImage = g; shutEl.style.maskImage = g;
        shutEl.style.visibility = q >= 1 ? 'hidden' : '';
        if (!reduce) ieye.style.transform = 'rotate(' + (e * 120).toFixed(1) + 'deg) scale(' + (1 + e * 5).toFixed(3) + ')';
        ieye.style.opacity = (1 - e * 1.6).toFixed(3);
      } else if (mode === 1) {
        // Letterbox: a slit of picture opens to a 2.39 frame, holds, then the bars run off to full screen
        var full = vh, scope = narrow() ? vh * .5 : Math.min(vh * .8, vw / 2.39), f1 = cl(q / .45, 0, 1), f2 = cl((q - .6) / .4, 0, 1);
        f1 = f1 * f1 * (3 - 2 * f1); f2 = f2 * f2 * (3 - 2 * f2);
        var h = f1 * scope + f2 * (full - scope), top = (vh - h) / 2;
        g = 'linear-gradient(#000 ' + top.toFixed(1) + 'px, transparent ' + top.toFixed(1) + 'px, transparent ' + (top + h).toFixed(1) + 'px, #000 ' + (top + h).toFixed(1) + 'px)';
        shutEl.style.webkitMaskImage = g; shutEl.style.maskImage = g;
        shutEl.style.visibility = q >= 1 ? 'hidden' : '';
        ieye.style.transform = ''; ieye.style.opacity = (1 - f1 * 1.4).toFixed(3);
        var ratio = h < 2 ? '' : f2 > .98 ? 'full frame' : (vw / h).toFixed(2) + ':1';
        read.textContent = ratio ? '(' + ratio + ')' : '';
        read.style.top = Math.min(vh - 40, top + h + 12).toFixed(1) + 'px';
        read.style.opacity = q > .01 && f2 < .98 && !narrow() ? '1' : '0';
      } else if (mode === 2) {
        // Focus pull: the black falls away like a lens finding focus; the eye drifts soft as the words come sharp
        var f = cl(q / .8, 0, 1); f = f * f * (3 - 2 * f);
        shutEl.style.webkitMaskImage = ''; shutEl.style.maskImage = '';
        var fd = cl((q - .3) / .35, 0, 1);
        shutEl.style.background = 'rgba(11,11,10,' + (1 - fd * fd * (3 - 2 * fd)).toFixed(3) + ')';
        shutEl.style.visibility = f >= 1 ? 'hidden' : '';
        ieye.style.transform = 'scale(' + (1 + f * 1.5).toFixed(3) + ')';
        ieye.style.filter = 'blur(' + (f * 18).toFixed(1) + 'px)'; ieye.style.opacity = (1 - f).toFixed(3);
        intro.style.filter = f < 1 ? 'blur(' + ((1 - f) * 22).toFixed(1) + 'px)' : '';
        intro.style.transform = 'scale(' + (1 + (1 - f) * .04).toFixed(4) + ')';
        var dist = f >= .995 ? '1.2m' : f < .01 ? '\u221e' : (1.2 / Math.max(.02, f)).toFixed(1) + 'm';
        read.textContent = '(focus ' + dist + ')'; read.style.top = '64px';
        read.style.opacity = q > .005 && q < .95 ? '1' : '0';
      } else {
        // Blink: two lids part into an almond, the eye takes a quick blink before you scroll
        var t = (Date.now() - t0) / 1000, peek = q < .01 ? Math.max(0, Math.sin(Math.min(1, Math.max(0, t - .8) / .9) * Math.PI)) * .06 : 0;
        var o2 = Math.max(q, peek), eo = o2 * o2 * (3 - 2 * o2);
        var rx = vw * (.42 + eo * 1.4), ry = Math.max(.5, eo * vh * 1.25);
        g = 'radial-gradient(ellipse ' + rx.toFixed(1) + 'px ' + ry.toFixed(1) + 'px at 50% 50%, transparent 99%, #000 100%)';
        shutEl.style.webkitMaskImage = g; shutEl.style.maskImage = g;
        shutEl.style.visibility = q >= 1 ? 'hidden' : '';
        ieye.style.transform = 'scale(' + (1 + eo * .6).toFixed(3) + ')'; ieye.style.opacity = (1 - eo * 2.2).toFixed(3);
      }
      if (mode !== 2) ieye.style.filter = '';
      down.style.opacity = q > .02 ? Math.max(0, .7 - q * 4).toFixed(3) : '';
      var total = document.documentElement.scrollHeight - vh;
      pct.textContent = '(' + ('00' + Math.round(cl(scrollY / Math.max(1, total), 0, 1) * 100)).slice(-3) + ')';
      cards.forEach(function (c, i) {
        // phones: cards are taller than the screen, so each one sticks by its bottom edge once it has scrolled fully into view
        c.style.top = narrow() ? Math.min(52 + i * 22, vh - c.offsetHeight - 12) + 'px' : '';
        var n = cards[i + 1];
        if (!n || narrow()) { c.style.transform = ''; return; }
        var d = cl((vh - n.getBoundingClientRect().top) / (vh * .85), 0, 1);
        c.style.transform = 'scale(' + (1 - d * .05).toFixed(4) + ')';
        c.style.filter = d > 0 ? 'brightness(' + (1 - d * .12).toFixed(3) + ')' : '';
      });
      requestAnimationFrame(loop);
    })();
    cards.forEach(function (c) {
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { c.classList.add('in'); io.unobserve(c); } }); }, { threshold: .5 });
        io.observe(c);
      } else c.classList.add('in');
    });
    down.addEventListener('click', function () {
      scrollTo({ top: op.offsetTop + op.offsetHeight - innerHeight, behavior: reduce ? 'auto' : 'smooth' });
    });
    // the page pasted into Cargo before 7 Oct 19:50 still has the old copy button and its label: turn it into the plain mail link
    var oldLab = root.querySelector('.i-copied'); if (oldLab) oldLab.remove();
    var oldBtn = root.querySelector('button.i-copy');
    if (oldBtn) { var a = document.createElement('a'); a.className = oldBtn.className; a.href = 'mailto:hello@eltio.studio'; a.innerHTML = oldBtn.innerHTML; oldBtn.replaceWith(a); }
    // On Cargo, take the big font from Cargo's own text style (set Bodycopy to Diatype Mono) so it matches exactly.
    var host = root.parentElement, hs = host && getComputedStyle(host);
    if (hs && /diatype/i.test(hs.fontFamily)) {
      root.style.setProperty('--big', hs.fontFamily);
      var v = hs.fontVariationSettings;
      if (v && v !== 'normal') root.style.setProperty('--bigv', /wght/.test(v) ? v.replace(/"wght"\s+[\d.]+/, '"wght" 300') : v + ', "wght" 300');
    }
  }
})();
