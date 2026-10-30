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
    film.style.marginLeft = film.style.marginRight = ww < W - 1 ? 'auto' : '';
    lastH = h;
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
  function start(film) {
    var x = item(); if (!x || !x.v) return;
    var cur0 = players.get(film);
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
    film.appendChild(ifr);
    fit(film, ifr, x.vr || 16 / 9, x);
    var rec = { v: x.v, ifr: ifr, p: null, muted: false };
    players.set(film, rec);
    api().then(function (V) {
      var p = rec.p = new V.Player(ifr);
      meta(rec, film, x);
      p.on('playing', function () { ifr.classList.add('on'); });
      p.on('timeupdate', function (e) {
        if (players.get(film) !== rec) return;
        window.pos = e.seconds; window.t0 = performance.now() - e.seconds * 1000;
      });
      if (!film.classList.contains('on')) p.pause();
      else go(rec);
    }).catch(function () {});
  }
  function stop(film) { var r = players.get(film); if (r && r.p) r.p.pause(); }
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
  var st = document.createElement('style');
  st.textContent = '.film{position:relative;overflow:hidden}.film iframe.vm{position:absolute;border:0;pointer-events:none;opacity:0;transition:opacity .6s ease}.film iframe.vm.on{opacity:1}#pf>img,.in .film>img{visibility:hidden}'
    + '#pf~.pt,#pf~.bar,#pf~.ctl,#pf~.cr,.player>.bar,.player>.ctl{width:var(--pw,100%);max-width:100%;margin-inline:auto;transition:width .8s cubic-bezier(.16,1,.3,1)}'
    + '.hero>.ttl{justify-self:center;width:min(100%,var(--pw,100%));transition:width .8s cubic-bezier(.16,1,.3,1)}'
    + '@media(max-width:899px){.hero>.ttl{width:min(100%,calc(var(--pw,100%) + 8vw))}}';
  document.head.appendChild(st);
})();
