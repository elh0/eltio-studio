(function () {
  var root = document.querySelector('.eltio.cg'); if (!root) return;
  var arr = function (l) { return Array.prototype.slice.call(l); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 17:15: every project on one page, so moving from one project into the next is just another tile.
  // Each tile knows its project (pk) and its place in that project (lk); the frame follows the project you're in.
  var its = arr(root.querySelectorAll('.cg-item')), n = its.length;
  var projs = arr(root.querySelectorAll('.cg-proj'));
  var names = (root.getAttribute('data-names') || '').split('|');
  var pk = its.map(function (el) { return +el.closest('.cg-proj').getAttribute('data-p'); });
  var lk = its.map(function (el) { return arr(el.closest('.cg-proj').querySelectorAll('.cg-item')).indexOf(el); });
  var first = projs.map(function (pr) { return its.indexOf(pr.querySelector('.cg-item')); });
  var tickSets = arr(root.querySelectorAll('.cg-ticks')), counts = arr(root.querySelectorAll('.cg-bm'));
  var next = root.querySelector('.cg-br'), prev = root.querySelector('.cg-prev'), libs = arr(root.querySelectorAll('.cg-lib a'));
  // 19:44 people kept getting lost scrolling. Each project now starts with its own marker line in the flow, and on
  // phones a 'you are here' button (project + tile) opens the list of projects to jump between.
  projs.forEach(function (pr, j) {
    var m = document.createElement('div'); m.className = 'cg-mark';
    m.innerHTML = '<span>' + ('(' + ('0' + (j + 1)).slice(-2) + ') ') + names[j] + '</span><span>' + pr.querySelectorAll('.cg-item').length + ' pieces</span>';
    pr.insertBefore(m, pr.firstChild);
  });
  var fr = root.querySelector('.cg-fr'), land = root.querySelector('.cg-land'), lf = land && land.querySelector('iframe');
  var num = function (j) { return '(' + ('0' + (j + 1)).slice(-2) + ') '; };
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  function centre(k) { var r = its[k].getBoundingClientRect(); return Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, scrollY + r.top + r.height / 2 - innerHeight / 2)); }
  var cur = -1, tgt = 0, born = performance.now();
  // 18 Oct: a link of its own for every project (#out-and-scout, #grip ...) to send to people
  var slugs = names.map(function (nm) { return nm.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); });
  var routeP = -1;
  function route(p) {
    if (p === routeP) return; routeP = p;
    if (inFrame) window.parent.postMessage({ cgRoute: slugs[p] }, '*');
    else try { history.replaceState(null, '', location.pathname + location.search + '#' + slugs[p]); } catch (e) {}
  }

  // a quick eased glide to a tile (faster than the browser's own smooth scroll)
  var anim = 0, gliding = false;
  function go(k, done) {
    k = Math.max(0, Math.min(n - 1, k)); tgt = k;
    var to = centre(k), from = scrollY;
    cancelAnimationFrame(anim);
    if (reduce) { scrollTo(0, to); gliding = false; tick(); if (done) done(); return; }
    var s0 = performance.now(), dur = 380; gliding = true;
    document.documentElement.style.scrollSnapType = 'none';
    (function f(ts) {
      var p = Math.min(1, (ts - s0) / dur), e = 1 - Math.pow(1 - p, 3);
      scrollTo(0, from + (to - from) * e);
      if (p < 1) anim = requestAnimationFrame(f);
      else { document.documentElement.style.scrollSnapType = ''; gliding = false; tick(); if (done) done(); }
    })(s0);
  }
  function tick() {
    var vh = innerHeight, best = 0, bd = 1e9;
    its.forEach(function (el, k) { var r = el.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - vh / 2); if (d < bd) { bd = d; best = k; } });
    // while gliding, the tile we're heading for is the one that counts (no flicker back, no double steps)
    if (gliding) best = tgt; else tgt = best;
    warm(best);
    if (best === cur) return;
    cur = best;
    var p = pk[best], l = lk[best], last = projs.length - 1;
    route(p);
    tickSets.forEach(function (t) { var on = +t.getAttribute('data-p') === p; t.classList.toggle('on', on); arr(t.children).forEach(function (a, k) { a.classList.toggle('on', on && k === l); }); });
    counts.forEach(function (c) { var on = +c.getAttribute('data-p') === p; c.classList.toggle('on', on); if (on) c.querySelector('.cg-roll').style.setProperty('--k', l); });
    its.forEach(function (el, k) { el.classList.toggle('on', k === best); });
    libs.forEach(function (a, k) { a.classList.toggle('on', k === p); });
    var wbb = root.querySelector('.cg-wb');
    if (wbb) { wbb.firstChild.textContent = num(p) + names[p]; wbb.lastChild.textContent = ('0' + (l + 1)).slice(-2) + ' / ' + ('0' + projs[p].querySelectorAll('.cg-item').length).slice(-2); arr(root.querySelectorAll('.cg-wl a[data-p]')).forEach(function (a, k) { a.classList.toggle('on', k === p); }); }
    prev.textContent = p > 0 ? num(p - 1) + names[p - 1] + ' ↑' : 'All projects';
    next.textContent = p < last ? num(p + 1) + names[p + 1] + ' ↓' : 'Back to Eltio Studio';
    if (best >= n - 3 && lf && !lf.src) lf.src = lf.getAttribute('data-src');
  }
  // past the last project the page scrolls out into the landing page: the frame fades as it comes up, and once it
  // fills the screen the landing page (already loaded behind it, at its top) takes over
  var inFrame = /[?&]in=1/.test(location.search) && window.parent !== window;
  function home(top) { if (inFrame) window.parent.postMessage({ cgClose: 1, top: !!top }, '*'); else location.href = 'landing.html'; }
  var leaving = false;
  function out() {
    if (!land) return;
    var t = land.getBoundingClientRect().top, k = Math.max(0, Math.min(1, 1 - t / innerHeight));
    fr.style.opacity = (1 - k * 1.6).toFixed(3); fr.style.pointerEvents = k > .5 ? 'none' : '';
    if (t <= 1 && !leaving && lf && lf.src) { leaving = true; home(true); }
  }
  addEventListener('scroll', out, { passive: true });
  addEventListener('scroll', function () { requestAnimationFrame(tick); }, { passive: true });
  addEventListener('wheel', function () { if (gliding) { cancelAnimationFrame(anim); gliding = false; lock = false; document.documentElement.style.scrollSnapType = ''; } }, { passive: true });
  addEventListener('resize', function () { if (!gliding) scrollTo(0, centre(cur < 0 ? 0 : cur)); });

  // live panels load a few tiles ahead, so each one is already playing when it arrives (then the rest, quietly)
  var frames = its.map(function (el) { return arr(el.querySelectorAll('iframe')); });
  function warm(k) { for (var j = k - 1; j <= k + 3; j++) (frames[j] || []).forEach(function (f) { if (f.loading !== 'eager') f.loading = 'eager'; }); }
  addEventListener('load', function () { var j = 0; (function more() { if (j >= n) return; warm(j); j += 4; setTimeout(more, 1200); })(); });

  // 17:21 free scrolling (tile-by-tile felt slow to get through). The frame links still glide to a tile.
  var lock = false;
  function step(d) { if (!lock) jump(Math.max(0, Math.min(n - 1, (cur < 0 ? 0 : cur) + d))); }
  function jump(k) { if (!lock) { lock = true; go(k, function () { lock = false; }); } }
  // 19:38 a way out you can always see on phones (the preview's own bar covers the top corners there)
  var cx = document.createElement('a'); cx.className = 'cg-x'; cx.href = 'landing.html'; cx.textContent = 'Close'; fr.appendChild(cx);
  var wh = document.createElement('div'); wh.className = 'cg-where';
  wh.innerHTML = '<button type="button" class="cg-wb" aria-expanded="false"><b></b><span></span></button><div class="cg-wl">' +
    names.map(function (nm, j) { return '<a href="#" data-p="' + j + '">' + num(j) + nm + '</a>'; }).join('') + '<a href="landing.html" class="cg-wh">Eltio Studio</a></div>';
  fr.appendChild(wh);
  var wb = wh.querySelector('.cg-wb'), wls = arr(wh.querySelectorAll('.cg-wl a[data-p]'));
  function where(open) { wh.classList.toggle('open', open); wb.setAttribute('aria-expanded', open); }
  wb.addEventListener('click', function () { where(!wh.classList.contains('open')); });
  wls.forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); where(false); jump(first[+a.getAttribute('data-p')]); }); });
  wh.querySelector('.cg-wh').addEventListener('click', function (e) { e.preventDefault(); where(false); home(true); });
  addEventListener('scroll', function () { if (wh.classList.contains('open') && !gliding) where(false); }, { passive: true });
  [root.querySelector('.cg-tl'), root.querySelector('.cg-tr'), cx, root.querySelector('.cg-end-back')].forEach(function (a) { if (a) a.addEventListener('click', function (e) { e.preventDefault(); home(false); }); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && inFrame) home(false); });
  // 16 Oct: on phones every live panel is a recording at the panel's own shape (moving ones play, the rest are stills);
  // the three in-page drawings of Out & Scout keep their whole-tile clips
  var CLIPS = { 0: ['Drawing'] }, MEDIA = {"0-library":"i","0-viewfinder":"i","0-portrait":"i","0-kit":"i","0-shot-list":"i","0-export":"i","1-climb":"v","1-roll":"v","1-analysis":"v","1-compare":"v","1-on-the-bar":"v","1-set-up":"i","1-lidar-scan":"v","1-your-body":"v","1-cue-cards":"i","1-coaches":"i","2-plots":"i","2-plan":"i","2-on-a-laptop":"i","2-light-at-subject":"i","2-power":"i","2-library":"v","2-gaffer-sheet":"i","2-ar-tag":"i","3-welcome":"i","3-home":"i","3-a-day":"v","3-search":"i","3-behind-aglo":"i","3-press-ups":"i","3-guarded-apps":"i","3-stack":"i","3-two-smalls":"i","4-welcome":"i","4-who-it-s-for":"i","4-where-it-hurts":"i","4-what-we-set-up":"i","4-your-rules":"i","4-morning-brief":"i","4-for-you":"i","4-services":"i","4-connections":"i","4-jobs":"i","4-on-set":"i","4-files":"i","2-from-the-scan":"i","2-send":"i","2-live-link":"i","2-new-set":"i"};
  var slug = function (t) { return t.toLowerCase().replace(/[^a-z]+/g, '-'); };
  if (matchMedia('(max-width: 760px), (hover: none)').matches) its.forEach(function (el) {
    var pj = el.closest('.cg-proj'), pi = pj ? +pj.getAttribute('data-p') : -1, t = el.getAttribute('data-t') || '', tile = el.querySelector('.cg-tile');
    if (!tile) return;
    // website loops: the phone-layout recording, at the phone's shape
    arr(tile.querySelectorAll('video[data-m]')).forEach(function (v) {
      var f = v.getAttribute('data-m'), w = v.parentNode, mar = w.getAttribute('data-mar');
      v.poster = f + '.jpg'; v.innerHTML = '<source src="' + f + '.mp4" type="video/mp4"><source src="' + f + '.webm" type="video/webm">'; v.load();
      if (mar) w.style.setProperty('--ar', mar);
      tile.classList.add('cg-app');
    });
    arr(tile.querySelectorAll('iframe')).forEach(function (fr, j) {
      var k = pi + '-' + slug(t) + (j ? '-' + j : ''), kind = MEDIA[k], f = 'video/m/' + k, m;
      if (!kind) return;
      fr.removeAttribute('src'); fr.removeAttribute('data-src');
      if (kind === 'v') {
        m = document.createElement('video'); m.muted = true; m.loop = true; m.playsInline = true;
        m.setAttribute('muted', ''); m.setAttribute('playsinline', ''); m.setAttribute('preload', 'metadata'); m.poster = f + '.jpg';
        m.innerHTML = '<source src="' + f + '.mp4" type="video/mp4"><source src="' + f + '.webm" type="video/webm">';
      } else { m = document.createElement('img'); m.src = f + '.jpg'; m.loading = 'lazy'; m.decoding = 'async'; }
      m.className = 'cg-m'; m.setAttribute('aria-label', t); fr.parentNode.replaceChild(m, fr);
    });
    if (!CLIPS[pi] || CLIPS[pi].indexOf(t) < 0) return;
    var f = 'video/m/' + pi + '-' + slug(t);
    tile.classList.add('cg-clip');
    tile.insertAdjacentHTML('beforeend', '<video class="cg-vid" poster="' + f + '.jpg" muted loop playsinline preload="metadata" aria-label="' + t + '"><source src="' + f + '.mp4" type="video/mp4"><source src="' + f + '.webm" type="video/webm"></video>');
  });
  // 20 Oct: nothing in a project plays until you land on it. A piece counts as landed once it reaches the middle of the
  // screen; then its loops start from the beginning and its wordmark motion starts from the top. Leaving pauses it.
  function vplay(v, fresh) { if (fresh) { try { v.currentTime = 0; } catch (e) {} } var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
  function cvRun(el, fresh) { arr(el.querySelectorAll('.cv *')).forEach(function (n) { if (n.getAnimations) n.getAnimations().forEach(function (a) { if (fresh) a.currentTime = 0; }); }); }
  var lander = new IntersectionObserver(function (es) { es.forEach(function (e) {
    var el = e.target, vs = arr(el.querySelectorAll('video'));
    if (e.isIntersecting) { if (!el.classList.contains('cg-here')) { cvRun(el, true); el.classList.add('cg-here'); vs.forEach(function (v) { vplay(v, true); }); arr(el.querySelectorAll('.x-blk')).forEach(function (b) { b.classList.add('vis'); }); } }
    else { el.classList.remove('cg-here'); vs.forEach(function (v) { v.pause(); }); }
  }); }, { rootMargin: '-35% 0px -35% 0px' });
  arr(root.querySelectorAll('video')).forEach(function (v) { v.muted = true; v.autoplay = false; v.removeAttribute('autoplay'); v.pause(); });
  its.forEach(function (el) { lander.observe(el); });
  // 15 Oct: phones had three Close buttons. One Home on the left, one Menu on the right (home, every project, start a project, email)
  var mn = document.createElement('div'); mn.className = 'cg-menu';
  mn.innerHTML = '<button type="button" class="cg-mb" aria-expanded="false">Menu</button><div class="cg-mp">' +
    '<a href="landing.html" class="cg-mh">Home</a>' +
    names.map(function (nm, j) { return '<a href="#" data-p="' + j + '">' + num(j) + nm + '</a>'; }).join('') +
    '<a href="https://eltio.studio/before-we-talk" target="_top" class="cg-ms">Start a project</a><a href="mailto:hello@eltio.studio" class="cg-me">hello@eltio.studio</a></div>';
  fr.appendChild(mn);
  var mb = mn.querySelector('.cg-mb');
  function menu(open) { mn.classList.toggle('open', open); mb.setAttribute('aria-expanded', open); mb.textContent = open ? 'Close' : 'Menu'; }
  mb.addEventListener('click', function () { menu(!mn.classList.contains('open')); });
  arr(mn.querySelectorAll('.cg-mp a[data-p]')).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); menu(false); jump(first[+a.getAttribute('data-p')]); }); });
  mn.querySelector('.cg-mh').addEventListener('click', function (e) { e.preventDefault(); menu(false); home(false); });
  addEventListener('scroll', function () { if (mn.classList.contains('open') && !gliding && !lock) menu(false); }, { passive: true });
  var tl = root.querySelector('.cg-tl'); if (tl) tl.innerHTML = '<span class="cg-tl-d">' + tl.textContent + '</span><span class="cg-tl-p">\u2190\u00a0Home</span>';
  // the landing opens another project in this same frame
  addEventListener('message', function (e) {
    if (!inFrame || e.source !== window.parent || !e.data || e.data.cgGo == null) return;
    var k = first[+e.data.cgGo]; if (!(k >= 0)) return;
    if (+e.data.cgGo === lastGo && userAt > goAt) return; // a repeat, and they've already moved on
    lastGo = +e.data.cgGo; goAt = performance.now();
    leaving = false; cancelAnimationFrame(anim); gliding = false; lock = false;
    holdAt(k); scrollTo(0, centre(k)); out(); tick(); dbg('message ' + e.data.cgGo);
    if (e.data.want) { var c = its[k].querySelector('.k2') || its[k].querySelector('.cg-in > *') || its[k], q = c.getBoundingClientRect(); window.parent.postMessage({ cgAt: { x: q.left, y: q.top, w: q.width, h: q.height } }, '*'); }
  });
  next.addEventListener('click', function (e) { e.preventDefault(); var p = pk[cur < 0 ? 0 : cur]; if (p + 1 < projs.length) jump(first[p + 1]); else home(true); });
  prev.addEventListener('click', function (e) { e.preventDefault(); var p = pk[cur < 0 ? 0 : cur]; if (p > 0) jump(first[p - 1]); else home(false); });
  // the project list on the left: every project, one click away
  libs.forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); jump(first[+a.getAttribute('data-p')]); }); });
  tickSets.forEach(function (t) { var p = +t.getAttribute('data-p'); arr(t.children).forEach(function (a, k) { a.addEventListener('click', function (e) { e.preventDefault(); jump(first[p] + k); }); }); });


  // identity drawings draw in once their tile arrives
  // (identity drawings draw in when their tile lands, see land above)
  arr(root.querySelectorAll('.k2')).forEach(function (k) { k.addEventListener('mouseenter', function () { k.classList.add('on'); }); k.addEventListener('mouseleave', function () { k.classList.remove('on'); }); });
  // embedded panels keep their own drawing size and are scaled down to the tile
  var embs = arr(root.querySelectorAll('.cg-emb'));
  function fit() { embs.forEach(function (b) { var f = b.firstElementChild; if (f.tagName !== 'IFRAME') return; f.style.transform = 'scale(' + (b.clientWidth / +b.getAttribute('data-w')) + ')'; }); }
  addEventListener('resize', fit); fit();
  // arriving from the landing page's list (#p=N) opens straight on that project
  // (the artifact viewer can drop the #, so the project also rides in ?p= and sessionStorage)
  function dbg() {} // (the 18:46 debug readout, off now the hand-off works)
  var hold = null, holdUntil = 0, userAt = 0, lastGo = null, goAt = 0;
  function holdAt(k) {
    var was = hold; hold = k; holdUntil = performance.now() + 3500; if (was != null) return;
    (function f() {
      if (hold == null || performance.now() > holdUntil) { hold = null; return; }
      var y = centre(hold); if (Math.abs(scrollY - y) > 2) scrollTo(0, y); tick(); requestAnimationFrame(f);
    })();
  }
  ['touchstart', 'wheel', 'keydown', 'pointerdown'].forEach(function (t) { addEventListener(t, function () { hold = null; userAt = performance.now(); }, { passive: true }); });
  var hp = /[#?&]p=(\d+)/.exec(location.hash + '&' + location.search);
  if (!hp) { var sj = slugs.indexOf(location.hash.slice(1)); if (sj >= 0) hp = [0, sj]; }
  if (!hp) { try { var sp = sessionStorage.getItem('cg-p'); if (sp != null) hp = [0, sp]; } catch (e) {} }
  if (!hp) { var wn = /^cg-p=(\d+)$/.exec(window.name || ''); if (wn) hp = wn; }
  window.name = '';
  try { sessionStorage.removeItem('cg-p'); } catch (e) {}
  if (hp && first[+hp[1]] >= 0) { history.replaceState(null, '', location.pathname + location.search); holdAt(first[+hp[1]]); } else scrollTo(0, 0);
  tick(); dbg(hp ? 'opened at ' + hp[1] : 'no project given');
  // 18:31: tap any phone, loop or window to see it big. The piece itself grows from where it sits to fill the
  // screen (one transform, so it is one smooth move on phones and desktop), and shrinks back on tap or Escape.
  // 20 Oct: swipe (or the arrows, or the arrow keys) to the next piece in the same card; past the last one it closes
  // itself, back to the page, so you keep scrolling and open the next card the same way.
  var ZSEL = '.cg-ph, .cg-in > .cg-emb, .cg-elw .x-win, .cg-vid';
  var zo = document.createElement('div'); zo.className = 'cg-zoom';
  zo.innerHTML = '<div class="cg-zb"></div><button type="button" class="cg-zx" aria-label="Close">Close</button>' +
    '<button type="button" class="cg-zp" aria-label="Previous"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></button><button type="button" class="cg-zn" aria-label="Next"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></button><div class="cg-zd"></div>';
  root.appendChild(zo);
  var zd = zo.querySelector('.cg-zd'), zopen = null, zcur = null, zt = null, zgrp = [], zgi = 0, zsw = 0;
  function zgroup(el) {
    var it = el.closest('.cg-item') || el.parentNode;
    var all = arr(it.querySelectorAll(ZSEL)).filter(function (x) { var q = x.getBoundingClientRect(); return q.width > 4 && q.height > 4; });
    all = all.filter(function (x) { return !all.some(function (y) { return y !== x && y.contains(x); }); });
    return all.indexOf(el) < 0 ? [el] : all;
  }
  // drawn at its full size (so it stays sharp); anything phone-shaped sits in a whole phone, never a bare crop
  function zmake(el) {
    var r = el.getBoundingClientRect();
    var c = el.cloneNode(true); c.classList.add('cg-zc'); c.removeAttribute('loading'); c.style.visibility = '';
    var ov = arr(el.querySelectorAll('video')).concat(el.tagName === 'VIDEO' ? [el] : []), cv = arr(c.querySelectorAll('video')).concat(c.tagName === 'VIDEO' ? [c] : []);
    cv.forEach(function (v, k) { v.muted = true; v.loop = true; v.setAttribute('playsinline', ''); v.autoplay = true; try { v.currentTime = ov[k] ? ov[k].currentTime : 0; } catch (e) {} var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); });
    arr(c.querySelectorAll('img')).forEach(function (i) { i.loading = 'eager'; });
    var a = r.width / r.height, phone = a < .75, mob = innerWidth < 760, px = mob ? 18 : 84, py = mob ? 52 : 56;
    var W = innerWidth - 2 * px, H = innerHeight - 2 * py, k = phone ? .04 : 0;
    var sw = Math.min(W / (1 + 2 * k), H / (1 / a + 2 * k)), sh = sw / a, b = sw * k, fw = sw + 2 * b, fh = sh + 2 * b;
    var box = document.createElement('div'); box.className = 'cg-zi' + (phone ? ' ph' : ''); box.appendChild(c);
    box.style.padding = b + 'px'; box.style.borderRadius = phone ? (sw * .15 + b) + 'px' : '';
    c.style.borderRadius = phone ? (sw * .15) + 'px' : '';
    var fx = (innerWidth - fw) / 2, fy = (innerHeight - fh) / 2;
    box.style.width = fw + 'px'; box.style.height = fh + 'px'; box.style.left = fx + 'px'; box.style.top = fy + 'px';
    zo.insertBefore(box, zo.querySelector('.cg-zx'));
    return { el: el, box: box, from: function (q) { var s = q.width / sw; return 'translate(' + (q.left - b * s - fx).toFixed(1) + 'px,' + (q.top - b * s - fy).toFixed(1) + 'px) scale(' + s.toFixed(4) + ')'; } };
  }
  function zdots() { var m = zgrp.length; zo.classList.toggle('many', m > 1); zd.textContent = m > 1 ? (zgi + 1) + ' / ' + m : ''; }
  function zoomIn(el) {
    if (zopen) return; var r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return;
    zgrp = zgroup(el); zgi = zgrp.indexOf(el); zcur = zmake(el);
    zcur.box.style.transition = 'none'; zcur.box.style.transform = zcur.from(r);
    zo.classList.add('on'); zopen = el; el.style.visibility = 'hidden'; hold = null; zdots();
    requestAnimationFrame(function () { requestAnimationFrame(function () { zcur.box.style.transition = ''; zcur.box.style.transform = 'none'; zo.classList.add('in'); }); });
  }
  function zgo(d) {
    if (!zopen) return; var j = zgi + d;
    if (j >= zgrp.length) { zoomOut(); return; }
    if (j < 0) { zcur.box.style.transition = ''; zcur.box.style.transform = 'none'; return; }
    var old = zcur, nx = zmake(zgrp[j]), w = innerWidth;
    nx.box.style.transition = 'none'; nx.box.style.transform = 'translateX(' + (d * w) + 'px)';
    old.el.style.visibility = ''; zgrp[j].style.visibility = 'hidden'; zcur = nx; zgi = j; zopen = zgrp[j]; zdots();
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      nx.box.style.transition = ''; nx.box.style.transform = 'none';
      old.box.style.transition = ''; old.box.style.transform = 'translateX(' + (-d * w) + 'px)';
      setTimeout(function () { if (old.box.parentNode) old.box.parentNode.removeChild(old.box); }, reduce ? 0 : 650);
    }); });
  }
  function zoomOut() {
    if (!zopen) return; var el = zopen, c = zcur; zopen = null;
    zo.classList.remove('in'); c.box.style.transition = ''; c.box.style.transform = c.from(el.getBoundingClientRect());
    var done = function () { zo.classList.remove('on', 'many'); arr(zo.querySelectorAll('.cg-zi')).forEach(function (x) { x.parentNode.removeChild(x); }); el.style.visibility = ''; c.box.removeEventListener('transitionend', done); clearTimeout(zt); };
    c.box.addEventListener('transitionend', done); zt = setTimeout(done, reduce ? 0 : 700);
  }
  // follow the finger sideways; a short flick moves on, a small one springs back, a tap closes
  var zx0 = 0, zy0 = 0, zdx = 0, zdrag = false;
  zo.addEventListener('touchstart', function (e) { if (!zopen || e.touches.length > 1) return; zx0 = e.touches[0].clientX; zy0 = e.touches[0].clientY; zdx = 0; zdrag = false; }, { passive: true });
  zo.addEventListener('touchmove', function (e) {
    if (!zopen) return; var dx = e.touches[0].clientX - zx0, dy = e.touches[0].clientY - zy0;
    if (!zdrag && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { zdrag = true; zcur.box.style.transition = 'none'; }
    if (!zdrag) return; e.preventDefault(); zdx = dx;
    var edge = (dx > 0 && zgi === 0); zcur.box.style.transform = 'translateX(' + (edge ? dx * .35 : dx).toFixed(1) + 'px)';
  }, { passive: false });
  zo.addEventListener('touchend', function () {
    if (!zdrag) return; zdrag = false; zsw = Date.now(); zcur.box.style.transition = '';
    if (zdx < -50) zgo(1); else if (zdx > 50 && zgi > 0) zgo(-1); else zcur.box.style.transform = 'none';
  });
  root.addEventListener('click', function (e) {
    if (zopen) {
      e.preventDefault(); if (Date.now() - zsw < 450) return;
      if (e.target.closest('.cg-zn')) { zgo(1); return; } if (e.target.closest('.cg-zp')) { zgo(-1); return; }
      zoomOut(); return;
    }
    if (e.target.closest('a, button')) return;
    var el = e.target.closest(ZSEL); if (!el) return;
    e.preventDefault(); zoomIn(el);
  });
  addEventListener('keydown', function (e) {
    if (!zopen) return;
    if (e.key === 'Escape') zoomOut(); else if (e.key === 'ArrowRight') { e.preventDefault(); zgo(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); zgo(-1); }
  });
  addEventListener('resize', function () { if (zopen) zoomOut(); });
})();
