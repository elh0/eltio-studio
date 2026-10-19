// 19 Oct: four takes on the phone project list, to make it land harder without making it busy. Picked with
// ?lv=1..4 (views.html links them). Phones only; the cards keep their covers and still open the project on a tap.
(function () {
  var m = /[?&]lv=(\d)/.exec(location.search), V = m ? +m[1] : 0;
  if (!V || innerWidth > 760) return;
  try { if (window.frameElement && window.frameElement.hasAttribute('data-ghost')) return; } catch (e) {}
  var html = document.documentElement; html.classList.add('lv', 'lv' + V);

  // what each project shows: a phone-shaped loop (or a wide one for Grip) and three screens to fan out
  var A = [
    { loop: 'video/w/os-site-m', shots: ['video/w/os-app-m.jpg', 'video/w/os-site-m.jpg', 'video/w/os-sun-m.jpg'] },
    { loop: 'video/m/1-climb', wide: true, shots: ['video/m/1-compare.jpg', 'video/m/1-climb.jpg', 'video/m/1-lidar-scan.jpg'] },
    { loop: 'video/w/lw-site-m', shots: ['img/lw/s-camera.webp', 'img/lw/s-plan.webp', 'img/lw/s-send.webp'] },
    { loop: 'video/w/ag-site-m', shots: ['img/ag/home-fullStack-dusk.webp', 'img/ag/home-fullStack-day.webp', 'img/ag/home-fullStack-night.webp'] },
    { still: 'video/m/4-morning-brief.jpg', shots: ['video/m/4-jobs.jpg', 'video/m/4-morning-brief.jpg', 'video/m/4-on-set.jpg'] }
  ];
  var ACC = ['#FF5A1F', '#4A74FF', '#FFC21A', '#E8956A', '#4F7348'];

  var css = document.createElement('style');
  css.textContent = [
    // shared: a taller tile so there is room for the work, and phones drawn like the project pages
    'html.lv .eltio.alt-plx.lp .x-frame{aspect-ratio:4/5!important;overflow:hidden}',
    'html.lv .lv-ph{position:absolute;aspect-ratio:600/1298;border-radius:13%/6%;overflow:hidden;background:#0E0E0D;box-shadow:0 24px 40px -22px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.06)}',
    'html.lv .lv-ph.w{aspect-ratio:698/350;border-radius:7%/14%}',
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
    'html.cg-open .lv-big,html.cg-open .lv-bg{display:none}'
  ].join('\n');
  document.head.appendChild(css);

  function ph(src, wide, cls) {
    var d = document.createElement('span'); d.className = 'lv-ph' + (wide ? ' w' : '') + (cls ? ' ' + cls : '');
    if (/\.(jpg|webp)$/.test(src)) { var i = new Image(); i.src = src; i.alt = ''; i.loading = 'lazy'; d.appendChild(i); }
    else {
      var v = document.createElement('video'); v.muted = true; v.loop = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'none';
      v.poster = src + '.jpg';
      ['webm', 'mp4'].forEach(function (x) { var s = document.createElement('source'); s.src = src + '.' + x; s.type = 'video/' + x; v.appendChild(s); });
      d.appendChild(v);
    }
    return d;
  }

  function go() {
    var cards = [].slice.call(document.querySelectorAll('.eltio.lp .x-list .x-p'));
    if (!cards.length) return;
    cards.forEach(function (c) {
      var i = +c.getAttribute('data-i'), a = A[i], f = c.querySelector('.x-frame'); if (!a || !f) return;
      if (V === 3) a.shots.forEach(function (s, k) { var p = ph(s, a.wide, 'f' + k); p.style.zIndex = k === 1 ? 1 : 0; f.appendChild(p); });
      else f.appendChild(ph(a.loop || a.still, a.wide));
    });

    // play a loop only while its card is on screen
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var c = e.target, v = c.querySelector('video');
        c.classList.toggle('lv-on', e.intersectionRatio > .55);
        if (v) { if (e.intersectionRatio > .3) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); }
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
