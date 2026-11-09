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
    rec.p.play().then(function () { setTimeout(around, 300); return rec.p.getMuted(); }).then(function (m) { rec.muted = !!m; f && f.classList.toggle('mute', !!m); }).catch(function () { rec.muted = true; f && f.classList.add('mute'); rec.p.setMuted(true); rec.p.play(); });
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
        } else host.style.cssText = 'left:0;top:0;width:640px;height:360px;opacity:0';
        requestAnimationFrame(sync);
      })();
    }
    if (film) host._f = film; return host;
  }
  /* 9 Nov, Elliot: films sat on the cover for a few seconds before playing. Vimeo takes about
     3 seconds to buffer a film once it's asked to play, but well under a tenth of a second if the
     film has already been started once, quietly, and paused. So the films people are likely to
     open next (the next and previous film, the first film, a name the mouse rests on) are warmed
     up in hidden players stacked in the same layer, and opening one just swaps it in. */
  /* 9 Nov, Elliot: the hidden players felt buggy (one showed through and ran ahead). Off for now:
     one player only, with a thin loading line while Vimeo buffers. Turn back on with WARM = true. */
  var WARM = false;
  var phone = innerWidth < 900, POOL = phone ? 3 : 8, LANES = phone ? 1 : 2;
  var pool = [], queue = [], busy = 0, tick = 0;
  function mine(rec) { return rec === one; }
  function hook(rec) {
    rec.p.on('playing', function () { if (mine(rec)) { rec.ifr.classList.add('on'); if (host) host.classList.remove('ld'); } });
    rec.p.on('timeupdate', function (e) { if (!mine(rec)) return; window.pos = e.seconds; window.t0 = performance.now() - e.seconds * 1000; });
  }
  function has(v) { return (one && one.v === v) || pool.some(function (r) { return r.v === v; }); }
  function evict() {
    while (pool.length >= POOL) {
      var o = pool.filter(function (r) { return !mine(r); }).sort(function (p1, p2) { return p1.t - p2.t; })[0];
      if (!o) return; pool.splice(pool.indexOf(o), 1); o.ifr.remove();
    }
  }
  function warm(x, done) {
    evict();
    var ifr = document.createElement('iframe');
    ifr.className = 'vm'; ifr.allow = 'autoplay; fullscreen; picture-in-picture';
    ifr.src = 'https://player.vimeo.com/video/' + x.v + '?controls=0&autoplay=0&muted=1&playsinline=1&dnt=1&title=0&byline=0&portrait=0';
    ifr.style.width = '640px'; ifr.style.height = '360px';
    follow(null).appendChild(ifr);
    var rec = { v: x.v, ifr: ifr, p: null, muted: true, warm: false, t: ++tick };
    pool.push(rec);
    var fin = function () { if (done) { var d = done; done = null; d(); } };
    setTimeout(fin, 6000);
    api().then(function (V) {
      var p = rec.p = new V.Player(ifr); hook(rec);
      var once = function () { p.off('playing', once); rec.warm = true; if (!mine(rec)) { p.pause(); p.setCurrentTime(0); } fin(); };
      p.on('playing', once);
      p.setMuted(true); p.play().catch(fin);
    }).catch(fin);
  }
  /* films wait in a queue and warm one or two at a time; asking again moves a film to the front */
  function pump() {
    while (busy < LANES && queue.length) {
      var x = queue.shift(); if (!x || !x.v || has(x.v)) continue;
      busy++; warm(x, function () { busy--; pump(); });
    }
  }
  function want(xs, front) {
    if (!WARM) return;
    xs.forEach(function (x) {
      if (!x || !x.v) return;
      pool.forEach(function (r) { if (r.v === x.v) r.t = ++tick; });
      var i = queue.indexOf(x); if (i > -1) queue.splice(i, 1);
      if (!has(x.v)) front ? queue.unshift(x) : queue.push(x);
    });
    pump();
  }
  window.vmWarm = function (x, later) { want([].concat(x), !later); };
  function around() {
    var l = typeof list !== 'undefined' && list && list.length ? list : WORK, x = item(), i = l.indexOf(x);
    if (i < 0) return;
    want([l[(i - 1 + l.length) % l.length], l[(i + 1) % l.length]], true);
  }
  function swap(film, rec, x) {
    if (one && one !== rec) { one.ifr.classList.remove('on'); if (one.p) { one.p.pause(); one.p.setMuted(true); one.p.setCurrentTime(0); } one.t = ++tick; pool.push(one); }
    pool = pool.filter(function (r) { return r !== rec; });
    one = rec; players.set(film, rec); follow(film);
    fit(film, rec.ifr, x.vr || 16 / 9, x);
    if (rec.p) { meta(rec, film, x); if (film.classList.contains('on')) { rec.p.setVolume(1); rec.p.setMuted(false); go(rec); } }
  }
  function start(film) {
    var x = item(); if (!x || !x.v) return;
    var cur0 = players.get(film) || one;
    if (cur0 === one && one) { players.set(film, one); follow(film); }
    if (cur0 && cur0.v === x.v) { if (x.vr) fit(film, cur0.ifr, x.vr, x); if (cur0.p) go(cur0); return; }
    if (host) host.classList.add('ld'); else follow(film).classList.add('ld');
    var hot = pool.filter(function (r) { return r.v === x.v && r.p; })[0];
    if (hot) { swap(film, hot, x); return; }
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
      meta(rec, film, x); hook(rec);
      if (!film.classList.contains('on')) p.pause();
      else go(rec);
    }).catch(function () {});
  }
  function stop(film) { var r = players.get(film); if (host && host._f === film) host.classList.remove('ld'); if (r && r.p && (!host || host._f === film)) r.p.pause(); }
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
  st.textContent = '.film{position:relative;overflow:hidden}.vmhost{position:fixed;overflow:hidden;pointer-events:none;z-index:31}.vmhost iframe.vm{position:absolute;border:0;pointer-events:none;opacity:0;transition:opacity .15s ease}.vmhost iframe.vm.on{opacity:1}'
    + '.vmhost.ld::after{content:"";position:absolute;left:0;bottom:0;height:2px;width:30%;background:var(--fg,#e0001b);animation:vmld 1.1s cubic-bezier(.6,0,.4,1) infinite}@keyframes vmld{from{transform:translateX(-100%)}to{transform:translateX(340%)}}'
    + '#pf~.pt,#pf~.bar,#pf~.ctl,#pf~.cr,.player>.bar,.player>.ctl{width:var(--pw,100%);max-width:100%;margin-inline:auto;transition:width .8s cubic-bezier(.16,1,.3,1)}'
    + '.hero>.ttl{justify-self:center;width:min(100%,var(--pw,100%));transition:width .8s cubic-bezier(.16,1,.3,1)}'
    + '@media(max-width:899px){.hero>.ttl{width:min(100%,calc(var(--pw,100%) + 8vw))}}';
  document.head.appendChild(st);
})();
