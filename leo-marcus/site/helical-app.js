/* built by leo-marcus/site/build.py from the round 2 page; edit the source, not this file */
;
/* Helical Sound directions: shared data and the colourway switch.
   Work list and credits copied from helical-sound.com (23 Oct 2026); stills are frames from those films. */
var TAGS = { comp: 'Composition', sd: 'Sound design', mix: 'Mix' };
var TAG_ORDER = ['comp', 'sd', 'mix'];
function still(w) { return '../stills/' + w.s + '.jpg'; }
function credits(w) {
  var s = w.t.map(function (k) { return TAGS[k]; }).join(', ');
  return s.charAt(0) + s.slice(1).toLowerCase();
}
function count(tag) { return tag === 'all' ? WORK.length : WORK.filter(function (w) { return w.t.indexOf(tag) > -1; }).length; }
function secs(d) { var p = d.split(':'); return +p[0] * 60 + +p[1]; }
function clock(s) { s = Math.max(0, Math.floor(s)); return (s < 600 ? '0' : '') + Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + s % 60; }

/* colourways: paper/ink, paper/red, ink/paper. Remembered per viewer. */
var WAYS = ['ink', 'red', 'dark'];
function setWay(w) {
  document.documentElement.setAttribute('data-way', w);
  document.querySelectorAll('[data-way-btn]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-way-btn') === w); });
  try { localStorage.setItem('hs-way', w); } catch (e) {}
}
(function () {
  var w = 'ink';
  try { w = localStorage.getItem('hs-way') || 'ink'; } catch (e) {}
  if (WAYS.indexOf(w) < 0) w = 'ink';
  document.documentElement.setAttribute('data-way', w);
  document.addEventListener('DOMContentLoaded', function () {
    setWay(w);
    document.querySelectorAll('[data-way-btn]').forEach(function (b) {
      b.addEventListener('click', function () { setWay(b.getAttribute('data-way-btn')); });
    });
  });
})();

;
/* Cargo data: the films come from Leo's Work set (see helical.js), not a fixed list */
var WORK = (window.HS && HS.films) || [];
/* Cargo titles the tab after the page it opened on; start from the site name so film titles read "Film · Site" */
try { if (HS.cargo) { var _st = window.store ? window.store.getState().site : (window.__PRELOADED_STATE__ || {}).site; if (_st && _st.website_title) document.title = _st.website_title; } } catch (e) {}
(function () {
  var known = { comp: 'Composition', sd: 'Sound design', mix: 'Mix' };
  WORK.forEach(function (x) { x.t.forEach(function (k) { if (!TAGS[k]) { TAGS[k] = k.replace(/-/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); TAG_ORDER.push(k); } }); });
  TAG_ORDER = TAG_ORDER.filter(function (k) { return WORK.some(function (x) { return x.t.indexOf(k) > -1; }); });
})();
function still(w) { return w.th || 'https://vumbnail.com/' + w.v + '.jpg'; }
function thumb(w) { return still(w); }
function ratio() { return 2.42; }
var _credits = credits; credits = function (w) { return w.hs || _credits(w); };
setWay = function () { document.documentElement.setAttribute('data-way', 'red'); };
setWay(); document.documentElement.classList.add('white');
/* Leo's Info page fills the footer and the phone info page */
(function (i) {
  if (!i) return;
  var esc = function (s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
  var ig = i.ig ? (/^https?:/.test(i.ig) ? i.ig : 'https://instagram.com/' + i.ig.replace(/^@/, '')) : '';
  if (i.bio) { document.querySelector('.bar2 .bio').textContent = i.bio; document.querySelector('#info > p').textContent = 'Helical Sound is ' + i.bio.replace(/^an?\s+/i, function (m) { return m.toLowerCase(); }); }
  var b = document.querySelector('#seg .sg-b'), p = document.querySelectorAll('#info p')[1];
  if (i.name) b.querySelector('span').textContent = i.name;
  if (i.email) { var a = b.querySelector('a[href^="mailto"]'); a.href = 'mailto:' + i.email; a.textContent = i.email; }
  if (ig) document.querySelectorAll('#hs a[href*="instagram.com"]').forEach(function (a) { a.href = ig; });
  if (p) p.innerHTML = '<span class="q2">Contact</span><br>' + esc(i.name || '') + '<br><a href="mailto:' + esc(i.email || '') + '">' + esc(i.email || '') + '</a><br><a href="' + esc(ig) + '" target="_blank" rel="noopener">Instagram</a>';
})(window.HS && HS.info);

;
/* Real playback for round 1 (30 Oct). Leo is on Vimeo Plus, which has no direct video files, so
   each page's own player drives his Vimeo video in a hidden-controls embed: when a page marks its
   .film as playing, the matching video loads behind the still and plays; the page's clock, bar and
   timecode follow the video's real time, and the real length replaces the placeholder. */
(function () {
  var players = new WeakMap(), sdk = null;
  function api() {
    if (sdk) return sdk;
    sdk = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'https://player.vimeo.com/api/player.js'; s.onload = function () { ok(window.Vimeo); }; s.onerror = no; document.head.appendChild(s); });
    return sdk;
  }
  api().catch(function () {}); /* load Vimeo's player script straight away, not on the first play */
  /* real lengths up front, from Vimeo's public oEmbed */
  WORK.forEach(function (x) {
    fetch('https://vimeo.com/api/oembed.json?url=' + encodeURIComponent('https://vimeo.com/' + x.v))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.duration) x.d = clock(j.duration);
        if (j.width && j.height && !x.vrTrue) x.vr = j.width / j.height;
        if (j.thumbnail_url && !x.s) sharpen(x, j.thumbnail_url.replace(/-d_\d+(x\d+)?/, '-d_640'));
        if (j.thumbnail_url && !x.fr) bars(x, j.thumbnail_url.replace(/-d_\d+(x\d+)?/, '-d_640'));
      })
      .catch(function () {});
  });
  /* 30 Oct, Elliot: the covers looked blurry. Swap the small stand-in covers for Vimeo's own
     frame (640 wide: sharp at card size, and light enough that the helix scrolls smoothly) wherever they're already on the page, and use it for anything drawn later. */
  function sharpen(x, hi) {
    var lo = 'vumbnail.com/' + x.v + '.jpg', im = new Image();
    im.onload = function () {
      x.th = hi;
      document.querySelectorAll('img[src*="' + lo + '"]').forEach(function (n) { n.src = hi; });
      document.querySelectorAll('[style*="' + lo + '"]').forEach(function (n) { n.setAttribute('style', n.getAttribute('style').split('https://' + lo).join(hi)); });
    };
    im.src = hi;
  }
  /* 30 Oct, Elliot: "kill the black bars". Some files have bars baked in (Canada Goose is a 3:2
     picture inside a 16:9 file). Read Vimeo's cover frame, find any pure black edges, and give the
     player the picture's real shape so the bars sit outside the frame. Works for films Leo adds
     later too; fr in work-r1.js still wins where it's set by hand. */
  function bars(x, u) {
    var im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = function () {
      try {
        var W = im.naturalWidth, H = im.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H;
        var g = c.getContext('2d'); g.drawImage(im, 0, 0); var d = g.getImageData(0, 0, W, H).data;
        var dark = function (x0, y0, dx, dy, n) { for (var k = 0; k < n; k += 2) { var i = ((y0 + dy * k) * W + x0 + dx * k) * 4; if (d[i] > 20 || d[i + 1] > 20 || d[i + 2] > 20) return false; } return true; };
        var l = 0, r = 0, t = 0, b = 0;
        while (l < W / 3 && dark(l, 0, 0, 1, H)) l++;
        while (r < W / 3 && dark(W - 1 - r, 0, 0, 1, H)) r++;
        while (t < H / 3 && dark(0, t, 1, 0, W)) t++;
        while (b < H / 3 && dark(0, H - 1 - b, 1, 0, W)) b++;
        /* only even bars on both sides count, so a dark shot isn't mistaken for them */
        var side = l > W * .015 && Math.abs(l - r) <= W * .01, flat = t > H * .015 && Math.abs(t - b) <= H * .01;
        if (!side && !flat) return;
        var cw = W - (side ? l + r + 4 : 0), ch = H - (flat ? t + b + 4 : 0);
        x.fr = cw / ch;
        var cx = item(); if (cx === x) document.querySelectorAll('.film').forEach(function (f) { var rr = players.get(f); if (rr && rr.v === x.v) fit(f, rr.ifr, x.vr || W / H, x); });
      } catch (e) {}
    };
    im.src = u;
  }
  function item() {
    if (typeof w !== 'undefined' && w && w.v) return w;
    if (typeof list !== 'undefined' && typeof cur !== 'undefined') return list[cur];
    return null;
  }
  /* 30 Oct, Elliot: no crop and no bars. The player takes the film's own shape and eases to it
     each time the film changes; very tall films are capped and centred. */
  var lastH = 0;
  function fit(film, ifr, vr, x) {
    /* fr: the picture's real shape when a video has bars baked into the file; the player takes
       that shape and the video is scaled up behind it so the bars sit outside the frame */
    var fr = x && x.fr || vr;
    var par = film.parentElement, cs = par && getComputedStyle(par);
    var W = par ? par.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) : film.offsetWidth;
    var cap = innerHeight * (innerWidth < 900 ? .5 : .62);
    /* a page can ask for a smaller film so everything under it still fits (round 2: the credits) */
    if (window.fitCap) { var c = fitCap(film); if (c) cap = Math.min(cap, c); }
    var h = Math.min(W / fr, cap), ww = h * fr;
    if (!film.style.height) { film.style.height = (lastH || film.offsetHeight) + 'px'; film.offsetHeight; }
    film.style.transition = 'height .8s cubic-bezier(.16,1,.3,1), width .8s cubic-bezier(.16,1,.3,1)';
    film.style.aspectRatio = 'auto'; film.style.height = h + 'px'; film.style.width = ww + 'px';
    film.style.marginLeft = film.style.marginRight = ww < W - 1 && !window.filmLeft ? 'auto' : '';
    lastH = h;
    /* round 2 (2 Nov, Elliot): the page can line its bar, credits and footer up with the film */
    if (window.onFit) onFit(film, ww, W);
    /* Helix (30 Oct, Elliot): the bar, controls and credits take the film's width too */
    if (film.id === 'pf') document.documentElement.style.setProperty('--pw', ww + 'px');
    var lab = film.querySelector('.hud.br'); if (lab) lab.textContent = fr.toFixed(2) + ' : 1';
    if (ifr) {
      /* a hair of bleed so no sub-pixel edge of the embed ever shows */
      var iw = (fr < vr ? h * vr : ww) + 2, ih = (fr < vr ? h : ww / vr) + 2;
      ifr.style.width = iw + 'px'; ifr.style.height = ih + 'px';
      ifr.style.left = (ww - iw) / 2 + 'px'; ifr.style.top = (h - ih) / 2 + 'px';
      ifr.style.transition = 'width .8s cubic-bezier(.16,1,.3,1), height .8s cubic-bezier(.16,1,.3,1), left .8s cubic-bezier(.16,1,.3,1), top .8s cubic-bezier(.16,1,.3,1), opacity .6s ease';
    }
  }
  /* sound (30 Oct, Elliot: "no sound on mobile"). Phones only let a video play with sound when the
     play comes straight from a tap, so the first try is with sound and, if the phone refuses, it
     plays muted until the next tap anywhere on the page, which turns the sound on right there in
     the tap. On Helix the same player is kept from film to film, so once the sound is on it stays on. */
  function go(rec) {
    var f = rec.ifr.parentNode;
    rec.p.play().then(function () { return rec.p.getMuted(); }).then(function (m) { rec.muted = !!m; f && f.classList.toggle('mute', !!m); }).catch(function () { rec.muted = true; f && f.classList.add('mute'); rec.p.setMuted(true); rec.p.play(); });
  }
  function meta(rec, film, x) {
    var p = rec.p;
    Promise.all([p.getVideoWidth(), p.getVideoHeight()]).then(function (a) { if (a[0] && a[1]) { x.vr = a[0] / a[1]; x.vrTrue = 1; fit(film, rec.ifr, x.vr, x); } });
    p.getDuration().then(function (d) { if (d) x.d = clock(d); });
  }
  /* 3 Nov, Elliot: films took a moment to show. Split rebuilds its film box for every film, which
     used to boot a fresh Vimeo player each time. Now one player lives in a layer that follows
     whichever film box is showing, and each new film loads into it, so a switch is just a video
     load, and once the sound is on it stays on. */
  var host = null, one = null;
  function follow(film) {
    if (!host) {
      host = document.createElement('div'); host.className = 'vmhost'; document.body.appendChild(host);
      (function sync() {
        var f = host._f, box = f && f.isConnected && f.closest('.in, #sheetIn, .sheet');
        if (f && f.isConnected) {
          var r = f.getBoundingClientRect(), c = box ? box.getBoundingClientRect() : { top: -1e4, bottom: 1e4, left: -1e4, right: 1e4 };
          var t = Math.max(0, c.top - r.top), b = Math.max(0, r.bottom - c.bottom), l = Math.max(0, c.left - r.left), rr = Math.max(0, r.right - c.right);
          host.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;clip-path:inset(' + t + 'px ' + rr + 'px ' + b + 'px ' + l + 'px);opacity:' + getComputedStyle(f).opacity;
        } else host.style.cssText = 'visibility:hidden';
        requestAnimationFrame(sync);
      })();
    }
    host._f = film; return host;
  }
  function start(film) {
    var x = item(); if (!x || !x.v) return;
    var cur0 = players.get(film) || one;
    if (cur0 === one && one) { players.set(film, one); follow(film); }
    if (cur0 && cur0.v === x.v) { if (x.vr) fit(film, cur0.ifr, x.vr, x); if (cur0.p) go(cur0); return; }
    if (cur0 && cur0.p) {
      /* same picture, next film: load it into the player already there */
      cur0.v = x.v; cur0.ifr.classList.remove('on');
      fit(film, cur0.ifr, x.vr || 16 / 9, x);
      cur0.p.loadVideo(+x.v).then(function () { if (cur0.v !== x.v) return; meta(cur0, film, x); if (film.classList.contains('on')) go(cur0); }).catch(function () {});
      return;
    }
    if (cur0) { cur0.ifr.remove(); players.delete(film); }
    var ifr = document.createElement('iframe');
    ifr.className = 'vm';
    ifr.allow = 'autoplay; fullscreen; picture-in-picture';
    ifr.src = 'https://player.vimeo.com/video/' + x.v + '?controls=0&autoplay=1&playsinline=1&dnt=1&title=0&byline=0&portrait=0';
    follow(film).appendChild(ifr);
    fit(film, ifr, x.vr || 16 / 9, x);
    var rec = one = { v: x.v, ifr: ifr, p: null, muted: false };
    players.set(film, rec);
    api().then(function (V) {
      var p = rec.p = new V.Player(ifr);
      meta(rec, film, x);
      p.on('playing', function () { ifr.classList.add('on'); });
      p.on('timeupdate', function (e) {
        window.pos = e.seconds; window.t0 = performance.now() - e.seconds * 1000;
      });
      if (!film.classList.contains('on')) p.pause();
      else go(rec);
    }).catch(function () {});
  }
  function stop(film) { var r = players.get(film); if (r && r.p && (!host || host._f === film)) r.p.pause(); }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      var f = m.target;
      if (!f.classList || !f.classList.contains('film')) return;
      if (f.classList.contains('on')) start(f); else stop(f);
    });
  }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });
  /* Helix keeps the same picture element from film to film and it stays "playing", so the class
     never changes: catch the film itself changing underneath it */
  setInterval(function () {
    var x = item(); if (!x) return;
    document.querySelectorAll('.film.on').forEach(function (f) { var r = players.get(f); if (r && r.v !== x.v) start(f); });
  }, 120);
  /* any tap turns the sound on, inside the tap itself; tapping the picture while muted only turns
     the sound on, it doesn't pause */
  function unmute(e) {
    document.querySelectorAll('.film.on').forEach(function (f) {
      var r = players.get(f); if (!r || !r.p || !r.muted) return;
      r.muted = false; f.classList.remove('mute'); r.p.setMuted(false); r.p.setVolume(1); r.p.play();
      if (e.type === 'click' && e.target.closest && e.target.closest('.film') === f) e.stopImmediatePropagation();
    });
  }
  document.addEventListener('touchend', unmute, true);
  document.addEventListener('click', unmute, true);
  addEventListener('resize', function () { document.querySelectorAll('.film').forEach(function (f) { var r = players.get(f); if (r) { f.style.height = ''; fit(f, r.ifr, item() && item().vr || 16 / 9, item()); } }); });
  /* 4 Nov: a page can size a film box to its film without playing it */
  window.vmFit = function (film) { var x = item(); if (film && x && film.isConnected && film.offsetParent) fit(film, (players.get(film) || {}).ifr, x.vr || 16 / 9, x); };
  var st = document.createElement('style');
  st.textContent = '.film{position:relative;overflow:hidden}.vmhost{position:fixed;overflow:hidden;pointer-events:none;z-index:31}.vmhost iframe.vm{position:absolute;border:0;pointer-events:none;opacity:0;transition:opacity .4s ease}.vmhost iframe.vm.on{opacity:1}'
    + '#pf~.pt,#pf~.bar,#pf~.ctl,#pf~.cr,.player>.bar,.player>.ctl{width:var(--pw,100%);max-width:100%;margin-inline:auto;transition:width .8s cubic-bezier(.16,1,.3,1)}'
    + '.hero>.ttl{justify-self:center;width:min(100%,var(--pw,100%));transition:width .8s cubic-bezier(.16,1,.3,1)}'
    + '@media(max-width:899px){.hero>.ttl{width:min(100%,calc(var(--pw,100%) + 8vw))}}';
  document.head.appendChild(st);
})();

;
/* Switching films inside the player (30 Oct, Elliot: "the next project slides in first, then the
   text, like a VR headset UI"). The old film recedes into the distance, the next one glides in
   from the side in depth, then the title and credits settle in one after another. */
function spatialSwap(o) {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !o.film.animate) { o.fill(); return; }
  var dir = o.dir || 1, f = o.film;
  var ease = 'cubic-bezier(.16, 1, .3, 1)';
  /* Split (30 Oct, Elliot: "no blur thing, it should all just adjust as you change frames and the
     text goes with it"): no copy of the old film and no depth. The frame stays put and eases to
     the next film's shape, the picture rises in the way the list moves, and the words travel
     with it. */
  if (o.axis === 'y') {
    o.fill();
    if (o.getFilm) f = o.getFilm() || f;
    f.animate([{ transform: 'translate3d(0,' + (dir * 22) + 'px,0)', opacity: .35 }, { transform: 'none', opacity: 1 }], { duration: 650, easing: ease });
    (typeof o.text === 'function' ? o.text() : o.text || []).forEach(function (el, k) {
      if (!el) return;
      el.animate([{ transform: 'translate3d(0,' + (dir * 16) + 'px,0)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, delay: k * 40, easing: ease, fill: 'backwards' });
    });
    return;
  }
  var r = f.getBoundingClientRect();
  /* the old film: a copy left where it was, which drifts back and away */
  var ghost = f.cloneNode(true);
  ghost.removeAttribute('id');
  [].forEach.call(ghost.querySelectorAll('iframe'), function (n) { n.remove(); });
  [].forEach.call(ghost.querySelectorAll('img'), function (n) { n.style.visibility = 'visible'; });
  ghost.style.cssText = 'position:fixed;margin:0;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;z-index:80;pointer-events:none;transform-origin:50% 50%';
  document.body.appendChild(ghost);
  o.fill();
  if (o.getFilm) f = o.getFilm() || f;
  ghost.animate([
    { transform: 'perspective(1400px) translate3d(0,0,0) rotateY(0)', opacity: 1, filter: 'blur(0)' },
    { transform: 'perspective(1400px) translate3d(' + (-dir * 38) + '%,0,-520px) rotateY(' + (dir * 22) + 'deg)', opacity: 0, filter: 'blur(6px)' }
  ], { duration: 760, easing: ease, fill: 'forwards' }).onfinish = function () { ghost.remove(); };
  /* the new film: in from the far side, turning to face you */
  f.animate([
    { transform: 'perspective(1400px) translate3d(' + (dir * 46) + '%,0,-620px) rotateY(' + (-dir * 26) + 'deg)', opacity: 0, filter: 'blur(8px)' },
    { transform: 'perspective(1400px) translate3d(0,0,0) rotateY(0)', opacity: 1, filter: 'blur(0)' }
  ], { duration: 1050, delay: 90, easing: ease, fill: 'backwards' });
  /* then the words, one line at a time */
  (typeof o.text === 'function' ? o.text() : o.text || []).forEach(function (el, k) {
    if (!el) return;
    el.animate([
      { transform: 'translate3d(' + (dir * 24) + 'px,10px,0)', opacity: 0, filter: 'blur(6px)' },
      { transform: 'none', opacity: 1, filter: 'blur(0)' }
    ], { duration: 700, delay: 480 + k * 80, easing: ease, fill: 'backwards' });
  });
}

;

var tag = 'all', list = WORK.slice(), w = null, playing = false, t0 = 0, pos = 0;
var phone = function () { return innerWidth < 900; };
function build() {
  document.getElementById('tg').innerHTML = ['all'].concat(TAG_ORDER).map(function (k) {
    return '<button type="button" data-tag="' + k + '" aria-pressed="' + (k === tag) + '">' + (k === 'all' ? 'All' : TAGS[k]) + ' ' + count(k) + '</button>';
  }).join('');
  list = tag === 'all' ? WORK.slice() : WORK.filter(function (x) { return x.t.indexOf(tag) > -1; });
  document.getElementById('names').innerHTML = list.map(function (x, i) {
    return '<button type="button" data-i="' + i + '" aria-current="' + (x === w) + '"><span class="c">' + x.c + '</span><span class="pm">' + x.p + '</span></button>';
  }).join('');
  document.getElementById('names').classList.toggle('has', !!w && list.indexOf(w) > -1);
}
/* only the credits that exist: no empty Director or Creative direction lines */
function creds(x) {
  var h = '';
  if (x.dir) h += '<dt>Director</dt><dd>' + x.dir + '</dd>';
  if (x.ag) h += '<dt>Creative direction</dt><dd>' + x.ag + '</dd>';
  return h + '<dt>Helical Sound</dt><dd>' + credits(x) + '</dd>';
}
function panel() {
  if (!w) return '<p class="empty" style="margin:0">Choose a client to play the film.</p>';
  return '<div class="ttl"><span><b style="font-weight:500">' + w.c + '</b></span>' + ('<button type="button" data-k="close" class="x" aria-label="Close"><svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true"><path d="M3 3l16 16M19 3L3 19" stroke="currentColor" stroke-width="1.6" fill="none"/></svg></button>') + '</div>' +
    '<div class="pm">' + w.p + '</div>' +
    '<div class="film"><img alt="" src="' + still(w) + '"></div><div class="bar"><i></i></div>' +
    '<div class="ctl"><button type="button" data-k="prev">Prev</button><button type="button" data-k="play">Play</button><span class="tm">00:00 / ' + w.d + '</span><button type="button" data-k="next">Next</button></div>' +
    '<dl class="cr">' + creds(w) + '</dl>';
}
function root() { return document.getElementById(phone() ? 'sheetIn' : 'pane'); }
function load(x, auto) {
  w = x; pos = 0; playing = false;
  document.getElementById('pane').innerHTML = panel(); document.getElementById('sheetIn').innerHTML = panel();
  document.getElementById('sheet').classList.toggle('open', phone());
  build(); setPlay(!!auto);
}
function setPlay(p) {
  playing = p; t0 = performance.now() - pos * 1000;
  var r = root(); if (!r.querySelector('.film')) return;
  r.querySelector('.film').classList.toggle('on', p); r.querySelector('[data-k=play]').textContent = p ? 'Pause' : 'Play';
  if (p) tick();
}
function tick() {
  if (!playing || !w) return;
  var r = root(), len = secs(w.d); pos = (performance.now() - t0) / 1000;
  if (pos >= len) { step(1); return; }
  r.querySelector('.bar i').style.width = pos / len * 100 + '%'; r.querySelector('.tm').textContent = clock(pos) + ' / ' + w.d;
  requestAnimationFrame(tick);
}
function step(d) { var i = list.indexOf(w); load(list[((i < 0 ? 0 : i + d) + list.length) % list.length], true); }
function ctl(e) {
  var k = e.target.closest('[data-k]');
  if (!k) { if (e.target.closest('.film')) setPlay(!playing); return; }
  var a = k.getAttribute('data-k');
  if (a === 'play') setPlay(!playing); if (a === 'next') step(1); if (a === 'prev') step(-1);
  if (a === 'close') closeFilm();
}
document.getElementById('pane').addEventListener('click', ctl);
document.getElementById('sheetIn').addEventListener('click', ctl);
document.getElementById('names').addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) load(list[+b.getAttribute('data-i')], true); });
document.getElementById('tg').addEventListener('click', function (e) { var b = e.target.closest('[data-tag]'); if (!b) return; tag = b.getAttribute('data-tag'); build(); });
document.getElementById('home').onclick = function (e) { e.preventDefault(); document.getElementById('sheet').classList.remove('open'); document.getElementById('scroll').scrollTo({ top: 0, behavior: 'smooth' }); };
function fit() { var h = document.getElementById('bar2').offsetHeight + 'px'; document.documentElement.style.setProperty('--bot', h); }
addEventListener('resize', fit); document.fonts && document.fonts.ready.then(fit);
/* 4 Nov, Leo: nothing plays until a name is clicked, so the first play is a real click (with
   sound) and the list has the full width; the X closes the player back to the list */
function closeFilm() {
  setPlay(false); w = null; pos = 0;
  document.getElementById('sheet').classList.remove('open');
  document.getElementById('pane').innerHTML = panel(); document.getElementById('sheetIn').innerHTML = panel();
  document.documentElement.classList.add('closed');
  build();
}
document.documentElement.classList.add('closed');
build(); fit(); document.getElementById('pane').innerHTML = panel();

;

/* detail pass (30 Oct): tab title follows the film, progress under the playing name,
   keys (arrows next/prev, space play, Esc close) and swipe down to close on phone */
(function () {
  var base = document.title, _load = load, _tick = tick;
  load = function (x, a) { _load(x, a); document.title = x.c + ' \u00b7 ' + base; };
  tick = function () {
    _tick();
    var b = document.querySelector('#names [aria-current="true"]');
    if (b && w) b.style.setProperty('--p', Math.min(100, pos / secs(w.d) * 100) + '%');
  };
  addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === ' ' && w) { e.preventDefault(); setPlay(!playing); }
    else if (e.key === 'Escape' && w) closeFilm();
  });
  var sh = document.getElementById('sheet'), y0 = null;
  sh.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
  sh.addEventListener('touchend', function (e) {
    if (y0 !== null && e.changedTouches[0].clientY - y0 > 70) closeFilm();
    y0 = null;
  });
})();

;

/* smooth pass (30 Oct) */
(function () {
  var names = document.getElementById('names'), sc = document.getElementById('scroll'), lastTag = null, first = true;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* the list is only rebuilt when the filter changes; otherwise just the playing name moves */
  var _build = build;
  build = function () {
    if (lastTag === tag && names.children.length) {
      [].forEach.call(names.children, function (b) { b.setAttribute('aria-current', list[+b.getAttribute('data-i')] === w); });
      names.classList.toggle('has', !!w && list.indexOf(w) > -1);
      [].forEach.call(document.querySelectorAll('#tg [data-tag]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tag') === tag); });
      return;
    }
    var swap = lastTag !== null && !reduce;
    lastTag = tag;
    function go() {
      _build();
      [].forEach.call(names.children, function (b, k) { b.style.setProperty('--k', Math.min(k, 14)); });
      names.classList.remove('out', 'in-go'); names.offsetWidth;
      if (!reduce) names.classList.add('in-go');
      setTimeout(function () { names.classList.remove('in-go'); }, 1600);
    }
    if (swap) { names.classList.add('out'); setTimeout(go, 220); } else go();
  };
  /* the film and its credits cross-fade in, the still only shows once it has loaded */
  function settle(r, quiet) {
    var im = r.querySelector('.film img'); if (!im) return;
    var show = function () { im.classList.add('ok'); };
    if (im.complete) requestAnimationFrame(show); else im.addEventListener('load', show);
    if (!reduce && !first && !quiet) { r.classList.remove('swap'); r.offsetWidth; r.classList.add('swap'); }
  }
  var _load = load;
  load = function (x, a) {
    /* 30 Oct: when a film is already showing, the next one glides in in depth, then its words */
    var r = root(), old = r.querySelector('.film'), from = list.indexOf(w), to = list.indexOf(x);
    /* back to the top of the player column for the next film */
    var pin = document.querySelector('.pane .in'); if (pin && pin.scrollTop && x !== w) pin.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    if (old && w && x !== w && !reduce && r.getBoundingClientRect().height) {
      spatialSwap({
        film: old, dir: to < from ? -1 : 1, axis: 'y',
        fill: function () { _load(x, a); settle(document.getElementById(r.id === 'pane' ? 'sheetIn' : 'pane'), true); },
        getFilm: function () { var f = r.querySelector('.film'), im = f && f.querySelector('img'); if (im) im.classList.add('ok'); return f; },
        text: function () { return [r.querySelector('.ttl'), r.querySelector('.in > .pm'), r.querySelector('.ctl'), r.querySelector('.cr')]; }
      });
      first = false; return;
    }
    _load(x, a);
    settle(document.getElementById('pane')); settle(document.getElementById('sheetIn'));
    first = false;
  };
  lastTag = null; build();
  if (w) { settle(document.getElementById('pane')); first = false; }
  else first = false;
  /* gliding scroll for a mouse or trackpad; touch keeps the phone's own scroll */
  if (!matchMedia('(pointer: fine)').matches || reduce) return;
  var y = sc.scrollTop, ty = y, run = false;
  sc.addEventListener('wheel', function (e) {
    if (e.ctrlKey) return;
    var pn = e.target.closest && e.target.closest('.pane .in');
    if (pn && pn.scrollHeight > pn.clientHeight + 1) return;
    e.preventDefault();
    ty = Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, ty + e.deltaY));
    if (!run) { run = true; requestAnimationFrame(glide); }
  }, { passive: false });
  sc.addEventListener('scroll', function () { if (!run) y = ty = sc.scrollTop; });
  function glide() {
    y += (ty - y) * .18;
    if (Math.abs(ty - y) < .5) { y = ty; run = false; }
    sc.scrollTop = y;
    if (run) requestAnimationFrame(glide);
  }
})();

;

(function () {
  function n2(v) { return ('0' + v).slice(-2); }
  function tc(s) { var f = Math.floor((s % 1) * 25); s = Math.floor(s); return n2(Math.floor(s / 3600)) + ':' + n2(Math.floor(s / 60) % 60) + ':' + n2(s % 60) + ':' + n2(f); }
  panel = function () {
    if (!w) return '<p class="empty" style="margin:0">Choose a client to play the film.</p>';
    var i = list.indexOf(w), n = i < 0 ? '' : n2(i + 1);
    return '<div class="ttl"><span><b style="font-weight:500">' + w.c + '</b></span>' +
      ('<button type="button" data-k="close" class="x" aria-label="Close"><svg width="16" height="16" viewBox="0 0 22 22" aria-hidden="true"><path d="M3 3l16 16M19 3L3 19" stroke="currentColor" stroke-width="1.6" fill="none"/></svg></button>') + '</div>' +
      '<div class="pm">' + w.p + '</div>' +
      '<div class="fw"><div class="film"><img alt="" src="' + still(w) + '"></div></div><div class="bar"><i></i></div>' +
      '<div class="ctl"><button type="button" data-k="prev">Prev</button><button type="button" data-k="play">Play</button><span class="tm">00:00 / ' + w.d + '</span><button type="button" data-k="next">Next</button></div>' +
      '<dl class="cr">' + creds(w) + '</dl>';
  };
  var _tick = tick;
  tick = function () { _tick(); var e = root().querySelector('.tc'); if (e && w) e.textContent = tc(pos); };
  if (w) {
    ['pane', 'sheetIn'].forEach(function (id) { var r = document.getElementById(id); r.innerHTML = panel(); var im = r.querySelector('.film img'); if (im) im.classList.add('ok'); });
    setPlay(playing);
  }
})();

;

/* the film never pushes the credits off a laptop screen */
var AL = 'c';
document.documentElement.classList.add('al-' + AL);
window.filmLeft = AL !== 'c';
function onFit(film, ww, W) {
  if (!film.closest('.pane') || innerWidth < 900) return;
  var r = document.documentElement.style;
  r.setProperty('--fw', ww + 'px'); r.setProperty('--fx', Math.max(0, (W - ww) / 2) + 'px');
  if (AL === 'f') {
    var pane = document.querySelector('.pane'), b = document.getElementById('bar2');
    var c4 = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--c4')) || 150;
    var left = pane.getBoundingClientRect().left - parseFloat(getComputedStyle(b).paddingLeft), pad = parseFloat(getComputedStyle(pane).paddingLeft);
    var c2 = Math.max(300, ww + pad * 2);
    b.style.gridTemplateColumns = left + 'px ' + c2 + 'px minmax(0, 1fr) ' + c4 + 'px';
  }
}
addEventListener('resize', function () { if (AL === 'f' && innerWidth < 900) document.getElementById('bar2').style.gridTemplateColumns = ''; });
function fitCap(film) {
  var inn = film.closest('.pane .in'); if (!inn || innerWidth < 900) return 0;
  /* the room the column can grow to, not the height it has now, so a bigger window gives a bigger film */
  var mh = parseFloat(getComputedStyle(inn).maxHeight) || inn.clientHeight;
  return Math.max(220, mh - (inn.scrollHeight - film.offsetHeight));
}
(function () {
  var info = document.getElementById('info');
  function show(on) { info.classList.toggle('open', on); info.setAttribute('aria-hidden', !on); }
  document.getElementById('infob').onclick = function () { show(true); };
  document.getElementById('infox').onclick = function () { show(false); };
})();

;

(function () {
  /* the footer's Contact swap */
  var seg = document.getElementById('seg'), ctb = document.getElementById('ctb');
  function ct(on) { seg.classList.toggle('on', on); ctb.setAttribute('aria-expanded', on); seg.querySelector('.sg-b').setAttribute('aria-hidden', !on); }
  ctb.onclick = function () { ct(true); };
  document.getElementById('ctx').onclick = function () { ct(false); };

  /* a link per film (#emporio-armani-ss26-campaign) so one film can be sent on Slack or WhatsApp */
  function slug(x) { if (x.purl) return x.purl; return (x.c + ' ' + x.p).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function setHash(x) { try { if (HS.cargo) history.replaceState(history.state, '', '/' + (x ? slug(x) : '')); else history.replaceState(null, '', location.pathname + location.search + (x ? '#' + slug(x) : '')); } catch (e) {} }
  var base = document.title, _load = load, _close = closeFilm;
  load = function (x, a) {
    var was = document.documentElement.classList.contains('closed');
    document.documentElement.classList.remove('closed');
    _load(x, a); setHash(x);
    if (!a && window.vmFit) requestAnimationFrame(function () { vmFit(root().querySelector('.film')); });
  };
  closeFilm = function () { _close(); setHash(null); document.title = base; };
  function fromHash() {
    var h = decodeURIComponent(location.hash.slice(1) || (HS.cargo ? location.pathname.replace(/^\/+|\/+$/g, '') : '')); if (!h) return;
    var x = WORK.filter(function (y) { return slug(y) === h; })[0];
    if (x && x !== w) load(x, false);
  }
  addEventListener('hashchange', fromHash);
  fromHash();

  /* going from phone width back to desktop (or the other way): redraw the player for the side
     that is showing, so it takes that side's width, and carry on playing if it was */
  var wasPhone = phone();
  addEventListener('resize', function () {
    var now = phone(); if (now === wasPhone) return; wasPhone = now;
    document.getElementById('sheet').classList.toggle('open', now && !!w);
    if (!w) return;
    var p = playing, at = pos;
    ['pane', 'sheetIn'].forEach(function (id) { var r = document.getElementById(id); r.innerHTML = panel(); var im = r.querySelector('.film img'); if (im) im.classList.add('ok'); });
    pos = at; setPlay(p);
    if (!p && window.vmFit) requestAnimationFrame(function () { vmFit(root().querySelector('.film')); });
    var b = root().querySelector('.bar i'); if (b) b.style.width = Math.min(100, at / secs(w.d) * 100) + '%';
  });
})();
