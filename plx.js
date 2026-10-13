// E. Parallax (alt-plx.html): a dead simple page that moves with the scroll like a Webflow build.
// #p-1 depth, #p-2 zoom, #p-3 index, #p-4 drift. ASCII only.
(function () {
  var root = document.querySelector('.eltio.alt-plx');
  if (!root) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function arr(n) { return Array.prototype.slice.call(n); }
  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ss(a, b, v) { v = cl((v - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); }
  var arts = arr(root.querySelectorAll('.x-p')), list = root.querySelector('.x-list');
  var lns = arr(root.querySelectorAll('.x-hero .ln')), cue = root.querySelector('.x-cue'), pct = root.querySelector('.x-pct');
  var idx = arr(root.querySelectorAll('.x-idx button')), sheets = arr(root.querySelectorAll('.x-sheet'));
  var P = arts.map(function (a) { return { a: a, pin: a.querySelector('.x-pin'), txt: a.querySelector('.x-txt'), fr: a.querySelector('.x-frame'), cov: a.querySelector('.k-cov, .k2-wf'), k2: a.querySelector('.k2'), run: a.querySelector('.x-run'), base: null }; });
  var SPEED = [.34, -.18, .42, -.12, .28];
  var mode = 1;

  // on Cargo, take the big font from Cargo's own text style (set Bodycopy to Diatype Mono)
  var host = root.parentElement, hs = host && getComputedStyle(host);
  if (hs && /diatype/i.test(hs.fontFamily)) {
    root.style.setProperty('--big', hs.fontFamily);
    var fv = hs.fontVariationSettings;
    if (fv && fv !== 'normal') root.style.setProperty('--bigv', /wght/.test(fv) ? fv.replace(/"wght"\s+[\d.]+/, '"wght" 300') : fv + ', "wght" 300');
  }

  function clear() {
    P.forEach(function (p) {
      p.fr.style.transform = ''; p.fr.style.clipPath = ''; p.cov.style.transform = ''; p.txt.style.transform = ''; p.txt.style.opacity = ''; p.run.style.transform = '';
    });
    lns.forEach(function (l) { l.style.transform = ''; l.style.opacity = ''; });
  }
  // zoom mode needs each cover's resting box inside its pinned screen
  function measure() {
    if (mode !== 2) return;
    P.forEach(function (p) {
      p.fr.style.transform = '';
      var r = p.fr.getBoundingClientRect(), pr = p.pin.getBoundingClientRect();
      p.base = { x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height };
    });
  }
  function setMode() {
    var m = /p-([1-4])/.exec(location.hash);
    mode = m ? +m[1] : (/\bp-([1-4])\b/.exec(root.className) || [0, 1])[1] * 1;
    root.classList.remove('p-1', 'p-2', 'p-3', 'p-4'); root.classList.add('p-' + mode);
    var sv = /s-([0-6])/.exec(location.hash), sz = sv ? +sv[1] : (/\bs-([0-6])\b/.exec(root.className) || [0, 0])[1] * 1;
    root.classList.remove('s-0', 's-1', 's-2', 's-3', 's-4', 's-5', 's-6'); root.classList.add('s-' + sz);
    var wv = /w-([1-4])/.exec(location.hash), wz = wv ? +wv[1] : 1;
    root.classList.remove('w-1', 'w-2', 'w-3', 'w-4'); root.classList.add('w-' + wz);
    clear(); measure();
  }
  setMode(); addEventListener('hashchange', setMode);
  addEventListener('resize', function () { clear(); measure(); });
  addEventListener('load', measure);


  // the ink: a chain of drops that follow the pointer and melt together (an SVG goo filter) on a layer set to
  // difference, so the intro turns paper on ink where it passes; with no pointer it wanders on its own.
  // Scrolling past the intro shrinks it into a round cursor that keeps inverting whatever it passes over
  // (a negative cursor, also over the cards). Phones have no cursor, so there it melts away.
  var noHover = window.matchMedia && matchMedia('(hover: none)').matches;
  var hero = root.querySelector('.x-hero'), inkEl = root.querySelector('.x-ink'), goo = root.querySelector('.x-ink g'), drops = arr(root.querySelectorAll('.x-ink circle'));
  var tx = -1, ty = -1, lastMove = -1e9, over = 'dot', cr = 0, D = drops.map(function () { return { x: innerWidth * .6, y: innerHeight * .6 }; });
  if (!noHover) root.classList.add('cur');
  function aim(cx, cy) { tx = cx; ty = cy; lastMove = performance.now(); }
  addEventListener('pointermove', function (e) { aim(e.clientX, e.clientY); }, { passive: true });
  addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) aim(t.clientX, t.clientY); }, { passive: true });
  addEventListener('touchstart', function (e) { var t = e.touches[0]; if (t) aim(t.clientX, t.clientY); }, { passive: true });
  addEventListener('pointerover', function (e) {
    var el = e.target;
    over = el.closest && el.closest('.x-frame') ? 'ring' : el.closest && el.closest('a, button') ? 'big' : 'dot';
  }, { passive: true });
  document.addEventListener('pointerleave', function () { over = 'gone'; });
  document.addEventListener('pointerenter', function () { over = 'dot'; });
  function ink(vw, vh, y) {
    var now = performance.now(), s = vw < 760 ? .62 : 1, hh = hero.offsetHeight, hx, hy;
    var k = ss(.12, .62, y / hh); // 0 in the intro, 1 once it has scrolled away
    if (noHover && k >= 1) { inkEl.style.visibility = 'hidden'; return; }
    // 18:41 Elliot: past the intro the pointer is the same magnify-and-invert disc as the project pages (motion.js), not the ink
    var hand = !noHover && k > .98 && document.querySelector('.mo-cur');
    inkEl.style.visibility = hand ? 'hidden' : '';
    document.documentElement.classList.toggle('plx-ink', !noHover && !hand);
    if (hand) return;
    if (now - lastMove > 1800 || tx < 0) {
      // wander inside the intro; once it is a cursor on a phone there is nothing to follow
      var t = now / 1000; hx = vw * (.55 + .28 * Math.sin(t * .37)); hy = hh * (.55 + .22 * Math.sin(t * .53 + 1)) - y;
      if (!noHover && k >= 1 && tx >= 0) { hx = tx; hy = ty; }
    } else { hx = tx; hy = ty; }
    var cursor = !noHover && k > .98;
    if (cursor) goo.removeAttribute('filter'); else goo.setAttribute('filter', 'url(#x-goo)');
    var want = over === 'gone' ? 0 : over === 'ring' ? 26 : over === 'big' ? 30 : 11;
    cr += (want - cr) * .2;
    // the layer may be fixed to the page rather than the screen (containers on Cargo), so draw relative to where it really is
    var lr = inkEl.getBoundingClientRect(); hx -= lr.left; hy -= lr.top;
    D.forEach(function (d, i) {
      var lead = i ? D[i - 1] : { x: hx, y: hy }, f = cursor ? (i ? .5 : .35) : (i ? .32 : .16);
      d.x += (lead.x - d.x) * f; d.y += (lead.y - d.y) * f;
      var c = drops[i], w = now / 1000, wob = (1 - k) * i * 3.2 * s;
      c.setAttribute('cx', (d.x + Math.sin(w * 1.3 + i * 1.7) * wob).toFixed(1)); c.setAttribute('cy', (d.y + Math.cos(w * 1.1 + i * 2.3) * wob).toFixed(1));
      var big = (86 - i * 8) * s, small = noHover ? 0 : i ? 0 : cr;
      c.setAttribute('r', Math.max(0, big + (small - big) * k).toFixed(1));
    });
  }

  function frame() {
    var vh = innerHeight, vw = innerWidth, y = scrollY;
    var total = document.documentElement.scrollHeight - vh;
    pct.textContent = '(' + ('00' + Math.round(cl(y / Math.max(1, total), 0, 1) * 100)).slice(-3) + ')';
    if (reduce) { requestAnimationFrame(frame); return; }
    // the intro: each line leaves at its own speed, like layers
    ink(vw, vh, y);
    cue.style.opacity = (1 - cl(y / 120, 0, 1)).toFixed(3);
    var cur = -1;
    P.forEach(function (p, i) {
      var r = p.a.getBoundingClientRect(), rp = p.pin.getBoundingClientRect();
      var c = (rp.top + rp.height / 2 - vh / 2) / vh; // 0 when the project sits in the middle of the screen
      if (r.top < vh * .5) cur = i;
      if (p.k2 && p.k2.classList.contains('k2-out-and-scout')) p.k2.style.setProperty('--sun', ((cl(c, -1, 1) - 1) * .55).toFixed(3) + 'em');
      if (noHover && p.k2) p.k2.classList.toggle('on', Math.abs(c) < .16);
      if (r.top < vh * .78) p.a.classList.add('in');
      p.a.classList.toggle('here', Math.abs(c) < .24);
      if (mode === 1) {
        p.fr.style.transform = 'translate3d(0,' + (c * SPEED[i] * vh).toFixed(1) + 'px,0) scale(' + (1 - Math.min(Math.abs(c), 1) * .08).toFixed(4) + ')';
        p.cov.style.transform = 'translate3d(0,' + (c * -5).toFixed(2) + '%,0)';
        p.txt.style.transform = 'translate3d(0,' + (c * (root.classList.contains('s-6') ? SPEED[i] * .85 : -.08) * vh).toFixed(1) + 'px,0)';
      } else if (mode === 2 && p.base) {
        var q = cl(-r.top / Math.max(1, r.height - vh), 0, 1), e = ss(.08, .72, q), b = p.base;
        var s = Math.max(vw / b.w, vh / b.h), dx = vw / 2 - (b.x + b.w / 2), dy = vh / 2 - (b.y + b.h / 2);
        p.fr.style.transform = 'translate3d(' + (dx * e).toFixed(1) + 'px,' + (dy * e).toFixed(1) + 'px,0) scale(' + (1 + (s - 1) * e).toFixed(4) + ')';
        p.txt.style.opacity = (1 - ss(.02, .3, q)).toFixed(3);
        p.txt.style.transform = 'translate3d(0,' + (-ss(.02, .3, q) * 40).toFixed(1) + 'px,0)';
        // a little entry rise before it pins
        var rise = r.top > 0 ? cl(r.top / vh, 0, 1) : 0;
        p.pin.style.opacity = '';
        if (rise) p.fr.style.transform = 'translate3d(0,' + (rise * vh * .25).toFixed(1) + 'px,0)';
      } else if (mode === 3) {
        var inn = ss(0, .55, (vh - r.top) / vh);
        p.fr.style.clipPath = 'inset(' + ((1 - inn) * 100).toFixed(2) + '% 0 0 0)';
        p.cov.style.transform = 'translate3d(0,' + (c * -6).toFixed(2) + '%,0)';
        p.txt.style.opacity = ss(.3, .7, (vh - r.top) / vh).toFixed(3);
      } else if (mode === 4) {
        var dir = i % 2 ? 1 : -1, off = (vh - r.top);
        p.run.style.transform = 'translate3d(' + (dir * off * .55 + (dir < 0 ? 0 : -vw * .9)).toFixed(1) + 'px,0,0)';
        p.fr.style.transform = 'translate3d(0,' + (c * -.22 * vh).toFixed(1) + 'px,0) rotate(' + (c * -5).toFixed(2) + 'deg)';
      }
    });
    if (mode === 3) {
      idx.forEach(function (b, i) { b.classList.toggle('on', i === Math.max(0, cur)); });
      var lr = list.getBoundingClientRect();
      root.classList.toggle('in-list', lr.top < vh * .6 && lr.bottom > vh * .4);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // sheets
  var openI = -1, lastFocus = null;
  function open(i, flow) {
    var old = null;
    if (openI >= 0) {
      old = sheets[openI];
      if (flow && !reduce) {
        // the next project slides up over this one, then this one quietly goes
        setTimeout(function () { old.classList.remove('open'); old.hidden = true; old.style.transform = ''; sheets[i].classList.remove('flow'); }, 750);
        sheets[i].classList.add('flow');
      } else { old.classList.remove('open'); old.hidden = true; }
    }
    if (flow || old) sheets[i].classList.remove('grow');
    var s = sheets[i]; openI = i; if (!flow) lastFocus = document.activeElement; armed = false; setTimeout(function () { armed = true; }, 900);
    s.hidden = false; s.scrollTop = 0; document.documentElement.style.overflow = 'hidden'; root.classList.add('sheet-open');
    dispatchEvent(new Event('resize'));
    requestAnimationFrame(function () { requestAnimationFrame(function () { s.classList.add('open'); if (s._reveal) setTimeout(s._reveal, 350); }); });
    s.querySelector('.x-close').focus({ preventScroll: true });
  }
  function shut() {
    if (openI < 0) return;
    var s = sheets[openI]; openI = -1;
    s.classList.remove('open'); document.documentElement.style.overflow = ''; root.classList.remove('sheet-open');
    setTimeout(function () { if (!s.classList.contains('open')) { s.hidden = true; s.classList.remove('grow'); } }, reduce ? 0 : 800);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  var dn = root.querySelector('.x-down'), lst = root.querySelector('.x-list');
  if (dn && lst) dn.addEventListener('click', function () { window.scrollTo({ top: lst.getBoundingClientRect().top + window.scrollY - 40, behavior: 'smooth' }); });
  // from the list, the project grows out of the point you clicked
  arr(root.querySelectorAll('.x-go, .x-frame')).forEach(function (b) { b.addEventListener('click', function (e) {
    var i = +b.getAttribute('data-i'), sh = sheets[i], r = b.getBoundingClientRect();
    var x = e.clientX || r.left + r.width / 2, y = e.clientY || r.top + r.height / 2;
    if (!reduce && openI < 0) { sh.style.setProperty('--gx', x + 'px'); sh.style.setProperty('--gy', y + 'px'); sh.classList.add('grow'); }
    open(i);
  }); });
  idx.forEach(function (b, i) {
    b.addEventListener('click', function () {
      var r = arts[i].getBoundingClientRect();
      scrollTo({ top: scrollY + r.top - innerHeight * .2, behavior: reduce ? 'auto' : 'smooth' });
    });
  });
  // inside a project: scroll past the end into the next one (its logo grows and draws in as you go),
  // a Close pill on phones, and pulling down from the top closes it too
  var armed = true;
  sheets.forEach(function (s) {
    var nb = s.querySelector('.x-sh-next'), k = nb && nb.querySelector('.k2');
    if (!nb) return;
    function onward() {
      var to = nb.getAttribute('data-to');
      if (to === 'end') {
        // the page underneath is already at its own ending when the project lifts away upward, so you scroll straight on into it
        document.documentElement.style.overflow = ''; window.scrollTo(0, document.documentElement.scrollHeight);
        s.classList.add('leave-up'); openI = -1; root.classList.remove('sheet-open');
        setTimeout(function () { s.classList.remove('open', 'leave-up'); s.hidden = true; }, reduce ? 0 : 820);
      }
      else open(+to, true);
    }
    nb.addEventListener('click', onward);
    s.querySelector('.x-sh-x').addEventListener('click', shut);
    var blks = arr(s.querySelectorAll('.x-blk')), wk = s.querySelector('.x-bwf .k2');
    function reveal() {
      var vh = s.clientHeight;
      blks.forEach(function (b) { if (b.getBoundingClientRect().top < vh * .86) b.classList.add('vis'); });
      if (wk) { var wr = wk.getBoundingClientRect(); wk.classList.toggle('on', wr.top < vh * .7 && wr.bottom > vh * .25); }
    }
    s._reveal = reveal;
    s.addEventListener('scroll', reveal, { passive: true });
    s.addEventListener('scroll', function () {
      var r = nb.getBoundingClientRect(), vh = s.clientHeight, q = cl((vh - r.top) / Math.min(r.height, vh), 0, 1);
      nb.style.setProperty('--np', q.toFixed(3));
      if (k) k.classList.toggle('on', q > .55);
      if (armed && openI >= 0 && sheets[openI] === s && s.scrollTop + vh >= s.scrollHeight - 4) { armed = false; onward(); }
    }, { passive: true });
    var y0 = -1, dy = 0;
    s.addEventListener('touchstart', function (e) { y0 = s.scrollTop <= 0 ? e.touches[0].clientY : -1; dy = 0; }, { passive: true });
    s.addEventListener('touchmove', function (e) {
      if (y0 < 0) return; dy = e.touches[0].clientY - y0;
      if (dy > 0 && s.scrollTop <= 0) { s.style.transition = 'none'; s.style.transform = 'translateY(' + (dy * .45).toFixed(1) + 'px)'; }
    }, { passive: true });
    s.addEventListener('touchend', function () {
      if (y0 < 0) return; s.style.transition = ''; s.style.transform = '';
      if (dy > 120) shut(); y0 = -1;
    });
  });
  // app icons tilt toward the pointer (and rock gently with the scroll on phones), like a real icon picked up
  arr(root.querySelectorAll('[data-tilt]')).forEach(function (t) {
    var box = t.parentElement;
    box.addEventListener('pointermove', function (e) {
      var r = box.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      t.style.setProperty('--ry', (x * 34).toFixed(1) + 'deg'); t.style.setProperty('--rx', (-y * 30).toFixed(1) + 'deg');
    });
    box.addEventListener('pointerleave', function () { t.style.removeProperty('--ry'); t.style.removeProperty('--rx'); });
  });
  sheets.forEach(function (s) {
    var ts = arr(s.querySelectorAll('[data-tilt]'));
    if (noHover && ts.length) s.addEventListener('scroll', function () {
      ts.forEach(function (t) { var r = t.getBoundingClientRect(), c = (r.top + r.height / 2) / s.clientHeight - .5; t.style.setProperty('--rx', (c * 40).toFixed(1) + 'deg'); t.style.setProperty('--ry', (-12 + c * 16).toFixed(1) + 'deg'); });
    }, { passive: true });
  });
  // the Spoolends shop works: + adds to the cart, the timecode runs
  arr(root.querySelectorAll('.x-se')).forEach(function (se) {
    var hero = se.querySelector('.x-se-hero');
    arr(se.querySelectorAll('.x-se-pk')).forEach(function (pk) {
      pk.addEventListener('pointerenter', function () { hero.style.setProperty('--pc', getComputedStyle(pk).getPropertyValue('--pc').trim()); });
    });
  });
  arr(root.querySelectorAll('.x-se')).forEach(function (se) {
    var n = 0, b = se.querySelector('.x-se-cart b'), tc = se.querySelector('.x-se-tc'), f = 72 * 24 + 8;
    arr(se.querySelectorAll('.x-se-add')).forEach(function (a) { a.addEventListener('click', function (e) { e.stopPropagation(); a.classList.toggle('in'); n += a.classList.contains('in') ? 1 : -1; b.textContent = n; a.textContent = a.classList.contains('in') ? '\u2713' : '+'; }); });
    if (tc) setInterval(function () { f++; var fr = f % 24, sec = Math.floor(f / 24) % 60, mn = Math.floor(f / 1440) % 60; tc.textContent = '00:' + ('0' + mn).slice(-2) + ':' + ('0' + sec).slice(-2) + ':' + ('0' + fr).slice(-2); }, 1000 / 24);
  });
  sheets.forEach(function (s, i) {
    s.querySelector('.x-close').addEventListener('click', shut);
    s.querySelector('.x-next').addEventListener('click', function () { open((i + 1) % sheets.length); });
    s.querySelector('.x-prev').addEventListener('click', function () { open((i + sheets.length - 1) % sheets.length); });
  });
  // keep people moving: the intro glides itself down to the first project if nobody scrolls, and once you
  // have sat on a project (hovered, looked) without opening it, a quiet "Next" appears bottom right; its line
  // fills, and if you are still idle it carries you on to the next one. Any touch, wheel or key hands control back.
  var nx = root.querySelector('.x-nx'), nxt = nx && nx.querySelector('.x-nxt'), end = root.querySelector('.x-end');
  var idle = performance.now(), glideId = 0, moved = {}, here = -1, sinceHere = 0, WAIT = 3800, RUN = 5000;
  function poke() { idle = performance.now(); glideId++; if (nx) nx.classList.remove('run'); }
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { addEventListener(t, poke, { passive: true }); });
  addEventListener('pointermove', function () { idle = performance.now(); if (nx) nx.classList.remove('run'); }, { passive: true });
  function glide(to) {
    var from = scrollY, t0 = performance.now(), dur = cl(Math.abs(to - from) * .9, 900, 1800), id = ++glideId;
    if (reduce) { scrollTo(0, to); return; }
    (function step(now) {
      if (id !== glideId) return;
      var e = cl((now - t0) / dur, 0, 1); e = e < .5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
      scrollTo(0, from + (to - from) * e);
      if (e < 1) requestAnimationFrame(step); else idle = performance.now();
    })(t0);
  }
  function centreOf(i) {
    if (i >= arts.length) return scrollY + end.getBoundingClientRect().bottom - innerHeight;
    var f = P[i].pin.getBoundingClientRect(); return scrollY + f.top + f.height / 2 - innerHeight / 2;
  }
  function label(i) { return i >= arts.length ? 'say hello' : '(0' + (i + 1) + ') ' + P[i].a.querySelector('.x-name').textContent; }
  if (nx) nx.addEventListener('click', function () { poke(); glide(centreOf(+nx.getAttribute('data-to'))); });
  arr(root.querySelectorAll('.x-gap')).forEach(function (g) { g.addEventListener('click', function () { poke(); glide(centreOf(+g.getAttribute('data-to'))); }); });
  setInterval(function () {
    if (openI >= 0) { idle = performance.now(); return; }
    if (root.classList.contains('lp') && innerWidth <= 760) { idle = performance.now(); return; } // simple phone landing: no auto-glide
    var now = performance.now(), quiet = now - idle, vh = innerHeight, at = -1;
    P.forEach(function (p, i) { var r = p.pin.getBoundingClientRect(); if (Math.abs(r.top + r.height / 2 - vh / 2) < vh * .22) at = i; });
    if (at !== here) { here = at; sinceHere = now; if (nx) nx.classList.remove('run'); }
    // the intro: nobody has scrolled yet, so take them to the first project
    if (scrollY < 40 && quiet > WAIT + 600 && !moved.intro) { moved.intro = 1; glide(centreOf(0)); return; }
    if (!nx) return;
    // the Next line stays with you the whole way down the list: it names whichever project is coming up
    var hb = hero.getBoundingClientRect().bottom, et = end.getBoundingClientRect().top, inList = hb < vh * .55 && et > vh * .7, to = arts.length;
    for (var j = 0; j < arts.length; j++) { var rr = P[j].pin.getBoundingClientRect(); if (rr.top + rr.height / 2 > vh / 2 + 24) { to = j; break; } }
    nx.setAttribute('data-to', to);
    if (inList && quiet > 500) { nxt.textContent = label(to); nx.classList.add('show'); } else if (!inList) nx.classList.remove('show', 'run');
    return; // no auto-advance between projects: the in-page Scroll prompts do that job
    if (here < 0 || reduce || moved[here]) return;
    if (quiet > WAIT && now - sinceHere > WAIT) {
      if (!nx.classList.contains('run')) { nx.style.setProperty('--nxt', RUN + 'ms'); nx.classList.add('run'); }
      if (quiet > WAIT + RUN) { moved[here] = 1; nx.classList.remove('run'); glide(centreOf(here + 1)); }
    }
  }, 200);
  // the email rises from behind the last project as you come to it
  var mail = root.querySelector('.x-mail');
  (function lift() {
    if (mail && !reduce) { var r = end.getBoundingClientRect(), q = cl((innerHeight - r.top) / Math.max(1, r.height), 0, 1); mail.style.transform = 'translate3d(0,' + ((1 - ss(.1, 1, q)) * 30).toFixed(1) + 'vh,0)'; }
    requestAnimationFrame(lift);
  })();
  addEventListener('keydown', function (e) {
    if (openI < 0) return;
    if (e.key === 'Escape') shut();
    if (e.key === 'ArrowRight') open((openI + 1) % sheets.length);
    if (e.key === 'ArrowLeft') open((openI + sheets.length - 1) % sheets.length);
  });
})();
