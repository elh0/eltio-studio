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
      .then(function (j) { if (j.duration) x.d = clock(j.duration); if (j.width && j.height && !x.vrTrue) x.vr = j.width / j.height; })
      .catch(function () {});
  });
  function item() {
    if (typeof w !== 'undefined' && w && w.v) return w;
    if (typeof list !== 'undefined' && typeof cur !== 'undefined') return list[cur];
    return null;
  }
  /* 30 Oct, Elliot: no crop and no bars. The player takes the film's own shape and eases to it
     each time the film changes; very tall films are capped and centred. */
  var lastH = 0;
  function fit(film, ifr, vr) {
    var par = film.parentElement, W = par ? par.clientWidth : film.offsetWidth;
    var cap = innerHeight * (innerWidth < 900 ? .5 : .62), h = Math.min(W / vr, cap), ww = h * vr;
    if (!film.style.height) { film.style.height = (lastH || film.offsetHeight) + 'px'; film.offsetHeight; }
    film.style.transition = 'height .8s cubic-bezier(.16,1,.3,1), width .8s cubic-bezier(.16,1,.3,1)';
    film.style.aspectRatio = 'auto'; film.style.height = h + 'px'; film.style.width = ww + 'px';
    film.style.marginLeft = film.style.marginRight = ww < W - 1 ? 'auto' : '';
    lastH = h;
    var lab = film.querySelector('.hud.br'); if (lab) lab.textContent = vr.toFixed(2) + ' : 1';
    if (ifr) { ifr.style.width = '100%'; ifr.style.height = '100%'; ifr.style.left = ifr.style.top = '0'; }
  }
  function start(film) {
    var x = item(); if (!x || !x.v) return;
    var cur0 = players.get(film);
    if (cur0 && cur0.v === x.v) { if (x.vr) fit(film, cur0.ifr, x.vr); cur0.p.play().catch(function () { cur0.p.setMuted(true); cur0.p.play(); }); return; }
    if (cur0) { cur0.ifr.remove(); players.delete(film); }
    var ifr = document.createElement('iframe');
    ifr.className = 'vm';
    ifr.allow = 'autoplay; fullscreen; picture-in-picture';
    ifr.src = 'https://player.vimeo.com/video/' + x.v + '?controls=0&autoplay=1&playsinline=1&dnt=1&title=0&byline=0&portrait=0';
    film.appendChild(ifr);
    fit(film, ifr, x.vr || 16 / 9);
    var rec = { v: x.v, ifr: ifr, p: null };
    players.set(film, rec);
    api().then(function (V) {
      var p = rec.p = new V.Player(ifr);
      Promise.all([p.getVideoWidth(), p.getVideoHeight()]).then(function (a) { if (a[0] && a[1]) { x.vr = a[0] / a[1]; x.vrTrue = 1; fit(film, ifr, x.vr); } });
      p.getDuration().then(function (d) { if (d) x.d = clock(d); });
      p.on('play', function () { ifr.classList.add('on'); });
      p.on('timeupdate', function (e) {
        if (players.get(film) !== rec) return;
        window.pos = e.seconds; window.t0 = performance.now() - e.seconds * 1000;
      });
      if (!film.classList.contains('on')) p.pause();
      else p.play().catch(function () { p.setMuted(true); p.play(); });
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
  /* tapping the picture while muted turns the sound on rather than pausing */
  document.addEventListener('click', function (e) {
    var f = e.target.closest && e.target.closest('.film'), r = f && players.get(f);
    if (!r || !r.p) return;
    r.p.getMuted().then(function (m) { if (m) { r.p.setMuted(false); e.stopImmediatePropagation(); } });
  }, true);
  addEventListener('resize', function () { document.querySelectorAll('.film').forEach(function (f) { var r = players.get(f); if (r) { f.style.height = ''; fit(f, r.ifr, item() && item().vr || 16 / 9); } }); });
  var st = document.createElement('style');
  st.textContent = '.film{position:relative;overflow:hidden}.film iframe.vm{position:absolute;border:0;pointer-events:none;opacity:0;transition:opacity .6s ease}.film iframe.vm.on{opacity:1}';
  document.head.appendChild(st);
})();
