// 19 Oct: four takes on the phone project list, to make it land harder without making it busy. Picked with
// ?lv=1..4 (views.html links them). Phones only; the cards keep their covers and still open the project on a tap.
(function () {
  var m = /[?&]lv=(\d)/.exec(location.search), V = m ? +m[1] : 6; // 06 Float was picked (19 Oct); ?lv=0 turns it off
  if (!V || innerWidth > 760) return;
  try { if (window.frameElement && window.frameElement.hasAttribute('data-ghost')) return; } catch (e) {}
  var html = document.documentElement; html.classList.add('lv', 'lv' + V);

  var A = [
    // 19 Oct: real app screens, clicked through one after another, each with a line saying what it is
    { ar: '1588/727', wide: true, seq: [
      ['img/os/s-start.webp', 'Projects and recces, each with its next good light'],
      ['img/os/s-cam.webp', 'The sun path drawn over the live camera'],
      ['img/os/s-portrait.webp', 'Grid, level, portrait'],
      ['img/os/s-list.webp', 'A shot list, with the time each shot is lit']] },
    { seq: [
      ['img/gr/film.webp', 'Film a climb from behind, hips in frame'],
      ['img/gr/review.webp', 'Three notes on your technique, timed to the clip'],
      ['img/gr/notes.webp', 'Say what helped and what did not'],
      ['img/gr/sets.webp', 'Fresh sets at the gyms you follow'],
      ['img/gr/gyms.webp', '33 London gyms to start with']] },
    { seq: [
      ['video/w/lw-ar-real-m', 'The AR: point at the floor, tap, and a lamp is tagged'],
      ['img/lw/s-camera.webp', 'Camera first, then each lamp from where it stands'],
      ['img/lw/s-three.webp', 'Three lamps, aimed'],
      ['img/lw/s-plan.webp', 'The plan draws itself from the scan'],
      ['img/lw/s-send.webp', 'Out as a gaffer sheet, a plan or a text list']] },
    { seq: [
      ['img/ag/home-fullStack-day.webp', 'A home screen with four apps and the weather'],
      ['img/ag/home-fullStack-dusk.webp', 'The sky follows the time of day'],
      ['img/ag/home-fullStack-night.webp', 'Night'],
      ['img/ag/breathe-inhale.webp', 'Three breaths to open the apps that pull at you']] },
    { seq: [
      ['img/sy/home.webp', 'Money first: what is in, what is owed, what needs you'],
      ['img/sy/jobs.webp', 'Every job, bid to wrap'],
      ['img/sy/onset.webp', 'On set, the clock runs and crew see their hours'],
      ['img/sy/files.webp', 'Sheets built in your own Drive']] }
  ];
  var ACC = ['#FF5A1F', '#4A74FF', '#FFC21A', '#E8956A', '#4F7348'];

  var css = document.createElement('style');
  css.textContent = [
    // shared: a taller tile so there is room for the work, and phones drawn like the project pages
    'html.lv .eltio.alt-plx.lp .x-frame{aspect-ratio:4/5!important;overflow:hidden}',
    'html.lv .lv-ph{position:absolute;aspect-ratio:600/1298;border-radius:13%/6%;overflow:hidden;background:#0E0E0D;box-shadow:0 24px 40px -22px rgba(0,0,0,.55);isolation:isolate;-webkit-mask-image:-webkit-radial-gradient(#fff,#000);transform:translateZ(0)}',
    'html.lv .lv-ph.w{aspect-ratio:698/350;border-radius:7%/14%}',
    'html.lv .lv-ph img,html.lv .lv-ph video{position:absolute;inset:0}',
    'html.lv .lv-ph .lv-s{position:absolute;inset:0;opacity:0;transition:opacity .7s ease}html.lv .lv-ph .lv-s.on{opacity:1}',
    'html.lv .lv-ph video{opacity:0;transition:opacity .4s}html.lv .lv-ph .lv-vid video{opacity:1}',
    'html.lv .lv-cap{position:absolute;left:8%;right:8%;bottom:4.5%;text-align:center;font:400 11px/1.35 ui-monospace,"Geist Mono",monospace;letter-spacing:.01em;color:rgba(20,20,18,.55);opacity:0;transform:translateY(4px);transition:opacity .5s ease .2s,transform .5s ease .2s}',
    'html.lv .x-p.lv-play .lv-cap{opacity:1;transform:none}',
    'html.lv .lv-ph img,html.lv .lv-ph video{display:block;width:100%;height:100%;object-fit:cover}',
    'html.lv .x-frame .k2{z-index:2;transition:transform .9s cubic-bezier(.2,.8,.2,1)}',

    // 1 Stack: each card pins under the bar and the next slides over it; the one underneath sinks back
    'html.lv1 .eltio.alt-plx.lp .x-list{gap:0!important;padding-bottom:30vh!important}',
    'html.lv1 .eltio.alt-plx.lp .x-p{position:sticky!important;top:64px;padding-bottom:28px!important;background:var(--paper,#fffff8)}',
    'html.lv1 .eltio.alt-plx.lp .x-p .x-pin{transform-origin:50% 0;will-change:transform,filter}',
    'html.lv1 .lv-ph{left:50%;bottom:-14%;width:44%;translate:-50% 0}',
    'html.lv1 .x-frame .k2{transform:translateY(-30%) scale(.8)}',
    'html.lv1 .lv-ph.w{width:78%;bottom:8%}',

    // 2 Live: the wordmark lifts, and the project itself rises into the tile and plays
    'html.lv2 .lv-ph{left:50%;top:100%;width:46%;translate:-50% 0;transition:top 1.1s cubic-bezier(.2,.8,.2,1)}',
    'html.lv2 .lv-ph.w{width:82%}',
    'html.lv2 .x-p.lv-on .lv-ph{top:30%}',
    'html.lv2 .x-p.lv-on .lv-ph.w{top:44%}',
    'html.lv2 .x-p.lv-on .x-frame .k2{transform:translateY(-34%) scale(.72)}',

    // 3 Fan: three screens open out from behind the wordmark as the card crosses the screen
    'html.lv3 .lv-ph{left:50%;top:38%;width:36%;transform-origin:50% 120%;will-change:transform}',
    'html.lv3 .lv-ph.w{width:64%;top:52%;transform-origin:50% 160%}',
    'html.lv3 .x-frame .k2{transform:translateY(-30%) scale(.8)}',

    // 4 Reel: one project per screen, the page taking on each project\'s colour, a big counter that keeps count
    'html.lv4{scroll-snap-type:y proximity}',
    'html.lv4 .eltio.alt-plx.lp .x-list{gap:0!important;padding:0!important}',
    'html.lv4 .eltio.alt-plx.lp .x-p{min-height:100svh;scroll-snap-align:start;display:flex!important;flex-direction:column;justify-content:center;padding:72px 16px 40px!important;box-sizing:border-box}',
    'html.lv4 .eltio.alt-plx.lp .x-frame{aspect-ratio:auto!important;height:62svh;background:transparent!important}',
    'html.lv4 .lv-ph{left:50%;bottom:0;width:38%;translate:-50% 0}',
    'html.lv4 .lv-ph.w{width:74%;bottom:6%}',
    'html.lv4 .x-frame .k2{transform:translateY(-26%)}',
    'html.lv4 .lv-bg{position:fixed;inset:0;z-index:-1;pointer-events:none;transition:background-color .6s}',
    'html.lv4 .eltio.alt-plx.lp{background:transparent!important}',
    'html.lv4 body{background:transparent!important}',
    'html.lv4 .lv-big{position:fixed;right:16px;top:58px;z-index:5;text-align:right;font:400 56px/0.9 ui-monospace,"Geist Mono",monospace;letter-spacing:-.04em;color:rgba(20,20,18,.9);pointer-events:none;opacity:0;transition:opacity .4s}',
    'html.lv4 .lv-big small{display:block;font-size:11px;letter-spacing:0;margin-top:8px;text-transform:uppercase}',
    'html.lv4.lv-in .lv-big{opacity:1}',
    'html.cg-open .lv-big,html.cg-open .lv-bg{display:none}',
    // 5 Stack, refined (19 Oct: less bulky, the logo lands ON the phone, the whole phone in view, floating)
    // 6 Float: the same cards without pinning, drifting at their own pace
    'html.lv5 .eltio.alt-plx.lp .x-list,html.lv6 .eltio.alt-plx.lp .x-list{gap:0!important;padding-bottom:24vh!important}',
    'html.lv5 .eltio.alt-plx.lp .x-p{position:sticky!important;top:calc(60px + var(--k) * 9px);padding-bottom:22px!important}',
    'html.lv6 .eltio.alt-plx.lp .x-p{padding-bottom:56px!important}',
    'html.lv5 .eltio.alt-plx.lp .x-pin,html.lv6 .eltio.alt-plx.lp .x-pin{transform-origin:50% 0;will-change:transform,opacity;background:#fffff8;border-radius:22px}',
    'html.lv5 .eltio.alt-plx.lp .x-frame,html.lv6 .eltio.alt-plx.lp .x-frame{border-radius:22px;background:#F1F1EC!important;box-shadow:0 1px 0 rgba(0,0,0,.03),0 30px 60px -40px rgba(0,0,0,.35)}',
    'html.lv5 .eltio.alt-plx.lp .x-txt,html.lv6 .eltio.alt-plx.lp .x-txt{padding:14px 4px 0!important}',
    'html.lv5 .x-frame .k2,html.lv6 .x-frame .k2{transition:opacity .55s ease,transform .8s cubic-bezier(.3,.7,.2,1)}',
    'html.lv5 .x-p.lv-on .x-frame>.k2,html.lv6 .x-p.lv-on .x-frame>.k2{opacity:0;transform:scale(.42)}',
    'html.lv5 .lv-ph,html.lv6 .lv-ph{left:50%;top:46%;height:76%;width:auto;translate:-50% -50%;opacity:0;scale:.9;transition:opacity .6s ease,scale 1s cubic-bezier(.3,.7,.2,1)}',
    'html.lv5 .lv-ph.w,html.lv6 .lv-ph.w{height:auto;width:86%;top:44%}',
    'html.lv5 .x-p.lv-on .lv-ph,html.lv6 .x-p.lv-on .lv-ph{opacity:1;scale:1;animation:lvFloat 5.5s ease-in-out infinite}',
    '@keyframes lvFloat{0%,100%{translate:-50% -50%}50%{translate:-50% calc(-50% - 7px)}}',
    'html.lv .lv-sp{position:absolute;inset:0;z-index:3;background:#fffff8;border-radius:inherit;overflow:hidden;transition:opacity .6s ease}',
    'html.lv .lv-sp .k2{position:absolute;inset:0;border:0!important;background:none!important;opacity:1!important;transform:none!important}',
    'html.lv .lv-sp .k2-rest{transform:scale(1.55)!important;opacity:1!important;filter:none!important}',
    'html.lv .lv-ph.w .lv-sp .k2-rest{transform:scale(1.05)!important}',
    'html.lv .lv-sp .k2-wf,html.lv .lv-sp .k2-tag{display:none!important}',
    'html.lv .x-p.lv-play .lv-sp{opacity:0}',
    // each app's own opening screen, the way the app shows it (not the cover on white)
    'html.lv .lv-sp.s0{background:#0B0B0A}html.lv .lv-sp.s0 .lock{color:#F3F3F0!important;white-space:nowrap}html.lv .lv-sp.s0 .k2-rest{transform:scale(.95)!important}',
    'html.lv .lv-sp.s1{background:#000}html.lv .lv-sp.s1 .k2-rest{transform:scale(.7)!important}',
    'html.lv .lv-sp.s2{background:#0E0E0D}html.lv .lv-sp.s2 svg{filter:invert(1)}html.lv .lv-sp.s2 .k2-rest{transform:scale(1.25)!important}',
    'html.lv .lv-sp.s3{background:#121211}html.lv .lv-sp.s3 .ag-wm{filter:invert(1)}',
    'html.lv .lv-sp.s4{background:#F3F3F0}'
  ].join('\n');
  document.head.appendChild(css);

  function vid(src, w) {
    var v = document.createElement('video'); v.muted = true; v.loop = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'none';
    ['webm', 'mp4'].forEach(function (x) { var s = document.createElement('source'); s.src = src + '.' + x; s.type = 'video/' + x; v.appendChild(s); });
    v.addEventListener('playing', function () { w.classList.add('lv-vid'); });
    return v;
  }
  function ph(a, cls) {
    var d = document.createElement('span'); d.className = 'lv-ph' + (a.wide ? ' w' : '') + (cls ? ' ' + cls : '');
    if (a.ar) d.style.aspectRatio = a.ar;
    function im(src, c) { var i = new Image(); i.src = src; i.alt = ''; i.decoding = 'async'; if (c) i.className = c; d.appendChild(i); return i; }
    if (a.seq) {
      a.seq.forEach(function (x, k) {
        var w = document.createElement('span'); w.className = 'lv-s' + (k ? '' : ' on'); d.appendChild(w);
        var i = new Image(); i.src = /\.(jpg|webp)$/.test(x[0]) ? x[0] : x[0] + '.jpg'; i.alt = ''; i.decoding = 'async'; w.appendChild(i);
        if (!/\.(jpg|webp)$/.test(x[0])) w.appendChild(vid(x[0], w));
      });
      d._seq = a.seq;
    }
    else if (a.still) im(a.still);
    else {
      im(a.loop + '.jpg'); d.appendChild(vid(a.loop, d));
    }
    return d;
  }

  function play(v) { if (v.preload === 'none') { v.preload = 'auto'; v.load(); } var p = v.play(); if (p && p.catch) p.catch(function () {}); }

  function go() {
    var cards = [].slice.call(document.querySelectorAll('.eltio.lp .x-list .x-p'));
    if (!cards.length) return;
    cards.forEach(function (c) {
      var i = +c.getAttribute('data-i'), a = A[i], f = c.querySelector('.x-frame'); if (!a || !f) return;
      var p = ph(a); f.appendChild(p);
      var cap = document.createElement('span'); cap.className = 'lv-cap'; cap.textContent = a.seq ? a.seq[0][1] : (a.cap || ''); f.appendChild(cap); c._lvCap = cap;
      if (V >= 5) {
        // the cover's own wordmark, again, as the phone's opening screen: the big one shrinks away as this arrives
        var sp = document.createElement('span'); sp.className = 'lv-sp s' + i; var k2 = f.querySelector('.k2');
        if (k2) sp.appendChild(k2.cloneNode(true)); p.appendChild(sp);
        c.style.setProperty('--k', cards.indexOf(c));
      }
    });

    // click through a sequence while its card plays
    function step(c) {
      var p = c.querySelector('.lv-ph'); if (!p || !p._seq) return;
      var ims = p.querySelectorAll('.lv-s'), n = (p._k || 0) + 1; if (n >= ims.length) n = 0; p._k = n;
      ims.forEach(function (i, k) { i.classList.toggle('on', k === n); var v = i.querySelector('video'); if (v) { if (k === n) play(v); else v.pause(); } });
      c._lvCap.textContent = p._seq[n][1];
      c._lvHold = p.querySelector('.lv-s.on video') ? 2 : 0; // the AR take gets a few beats
    }

    // play a loop only while its card is on screen
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var c = e.target, v = c.querySelector('.lv-s.on video, .lv-ph>video');
        var on = e.intersectionRatio > .55;
        if (on !== c.classList.contains('lv-on')) {
          c.classList.toggle('lv-on', on); clearTimeout(c._lvT);
          clearInterval(c._lvI);
          if (on) c._lvT = setTimeout(function () { c.classList.add('lv-play'); c._lvI = setInterval(function () { if (c._lvHold) c._lvHold--; else step(c); }, 2600); }, 1500); else c.classList.remove('lv-play');
        }
        if (v) { if (e.intersectionRatio > .3) play(v); else v.pause(); }
      });
    }, { threshold: [0, .3, .55, .8] });
    cards.forEach(function (c) { io.observe(c); });

    var bg, big;
    if (V === 4) {
      bg = document.createElement('div'); bg.className = 'lv-bg'; document.body.appendChild(bg);
      big = document.createElement('div'); big.className = 'lv-big'; document.body.appendChild(big);
    }
    function mix(hex, k) { // the project's colour, washed into paper
      var n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, p = [255, 255, 248];
      return 'rgb(' + [r, g, b].map(function (v, j) { return Math.round(p[j] + (v - p[j]) * k); }).join(',') + ')';
    }
    var lastI = -2;
    function frame() {
      var vh = innerHeight;
      cards.forEach(function (c, k) {
        var r = c.getBoundingClientRect();
        if (V === 1) {
          // how far the next card has come over this one
          var nx = cards[k + 1], over = nx ? Math.min(1, Math.max(0, 1 - (nx.getBoundingClientRect().top - 64) / (r.height || vh))) : 0;
          var pin = c.querySelector('.x-pin'); pin.style.transform = 'scale(' + (1 - .08 * over).toFixed(4) + ')'; pin.style.filter = 'brightness(' + (1 - .35 * over).toFixed(3) + ')';
        }
        if (V === 5) {
          var nx5 = cards[k + 1], o5 = nx5 ? Math.min(1, Math.max(0, 1 - (nx5.getBoundingClientRect().top - 60 - (k + 1) * 9) / ((r.height || vh) * .9))) : 0;
          var e5 = o5 * o5 * (3 - 2 * o5), pin5 = c.querySelector('.x-pin');
          pin5.style.transform = 'translateY(' + (-10 * e5).toFixed(1) + 'px) scale(' + (1 - .07 * e5).toFixed(4) + ')';
          pin5.style.opacity = (1 - .55 * e5).toFixed(3);
        }
        if (V === 6) {
          // each card drifts a little against the scroll, so the list feels like it is floating
          var mid6 = (r.top + r.height / 2 - vh / 2) / vh, pin6 = c.querySelector('.x-pin');
          pin6.style.transform = 'translateY(' + (mid6 * -36).toFixed(1) + 'px) rotate(' + (mid6 * (k % 2 ? 1.2 : -1.2)).toFixed(2) + 'deg)';
        }
        if (V === 3) {
          // 0 as the card comes up from the bottom, 1 once it is in the middle of the screen
          var t = Math.min(1, Math.max(0, (vh - r.top) / (vh * .75))), e = 1 - Math.pow(1 - t, 3);
          var fs = c.querySelectorAll('.lv-ph');
          [-1, 0, 1].forEach(function (s, j) {
            if (!fs[j]) return;
            fs[j].style.transform = 'translateX(-50%) translateY(' + ((1 - e) * 40).toFixed(1) + '%) rotate(' + (s * 14 * e).toFixed(2) + 'deg) translateX(' + (s * 18 * e).toFixed(1) + '%)';
          });
        }
      });
      if (V === 4) {
        var mid = -1;
        cards.forEach(function (c, k) { var r = c.getBoundingClientRect(); if (r.top < vh * .5 && r.bottom > vh * .5) mid = k; });
        html.classList.toggle('lv-in', mid >= 0);
        if (mid !== lastI) {
          lastI = mid;
          bg.style.backgroundColor = mid >= 0 ? mix(ACC[+cards[mid].getAttribute('data-i')], .16) : '#fffff8';
          if (mid >= 0) big.innerHTML = '0' + (mid + 1) + '<small>' + cards[mid].querySelector('.x-name').textContent + ' &middot; of 0' + cards.length + '</small>';
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  // after load, so the covers drawn by script (the Lampwerk mark) are there to copy
  if (document.readyState !== 'complete') addEventListener('load', go); else go();
})();
