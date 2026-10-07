// Scroll motion for the studio site. Three levels, set by a class on the .eltio root:
//   mo-1 (low):    staggered reveals, scroll progress line under the index bar
//   mo-2 (medium): + parallax on the pieces, pieces scale in, the intro drifts away
//   mo-3 (high):   + pieces wipe open, sections recede as they leave, velocity skew, titles decode,
//                  tiles tilt toward the pointer, a trailing cursor ring
// No class, no motion. Off entirely for prefers-reduced-motion. ASCII only.
(function () {
  if (!window.requestAnimationFrame || !document.querySelector) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
  function arr(n) { return Array.prototype.slice.call(n); }
  function lvl(r) { return r.classList.contains('mo-3') ? 3 : r.classList.contains('mo-2') ? 2 : r.classList.contains('mo-1') ? 1 : 0; }
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  // titles decode from random characters when they arrive (high)
  var GLY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_-+';
  function decode(el) {
    var txt = el.getAttribute('data-txt'); if (!txt) { txt = el.textContent; el.setAttribute('data-txt', txt); }
    var t0 = performance.now(), dur = 520 + txt.length * 28;
    (function step(now) {
      var k = cl((now - t0) / dur, 0, 1), n = Math.floor(k * txt.length), s = txt.slice(0, n);
      for (var i = n; i < txt.length; i++) s += txt[i] === ' ' ? ' ' : GLY[(Math.random() * GLY.length) | 0];
      el.textContent = s;
      if (k < 1) requestAnimationFrame(step); else el.textContent = txt;
    })(t0);
  }

  var R = arr(document.querySelectorAll('.eltio')).map(function (root) {
    var o = { root: root, lv: -1 };
    var idx = root.querySelector('.idx');
    o.prog = document.createElement('i'); o.prog.className = 'mo-prog'; o.prog.setAttribute('aria-hidden', 'true');
    if (idx) idx.appendChild(o.prog);
    o.main = root.querySelector('main');
    o.intro = root.querySelector('.site > .side');
    // each section's children go in one wrapper so the section itself stays still and can be measured
    o.secs = arr(root.querySelectorAll('.work')).map(function (s) {
      var w = document.createElement('div'); w.className = 'mo-w';
      while (s.firstChild) w.appendChild(s.firstChild);
      s.appendChild(w);
      return { el: s, w: w, piece: w.querySelector('.el-stack, .bp'), figs: arr(w.querySelectorAll('.brandrow figure')),
               cap: w.querySelector('.colset'), title: w.querySelector('.num span:last-child') };
    });
    // reveal targets, staggered within their parent
    o.rev = arr(root.querySelectorAll('.brandrow figure, .colset > *, .notes, .site > .side:first-child > :not(.head):not(hr)'));
    o.rev.forEach(function (el) {
      el.classList.add('mo-r');
      var i = arr(el.parentNode.children).indexOf(el);
      el.style.transitionDelay = (Math.min(i, 8) * 70) + 'ms';
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('mo-in');
          if (e.target.hasAttribute('data-dec') && lvl(root) === 3) decode(e.target);
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      o.rev.forEach(function (el) { io.observe(el); });
      o.secs.forEach(function (s) { if (s.title) { s.title.setAttribute('data-dec', ''); io.observe(s.title); } });
    } else o.rev.forEach(function (el) { el.classList.add('mo-in'); });
    // tiles lean toward the pointer (high)
    if (fine) o.secs.forEach(function (s) {
      s.figs.forEach(function (f) {
        var t = f.querySelector('.tile'); if (!t) return;
        f.addEventListener('pointermove', function (e) {
          if (lvl(root) < 3) return;
          var b = t.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
          t.style.transform = 'perspective(600px) rotateY(' + (x * 10).toFixed(2) + 'deg) rotateX(' + (-y * 10).toFixed(2) + 'deg) scale(1.02)';
        });
        f.addEventListener('pointerleave', function () { t.style.transform = ''; });
      });
    });
    return o;
  });
  if (!R.length) return;

  // trailing cursor ring (high, mouse only)
  var cur = null, cx = -99, cy = -99, tx = -99, ty = -99, big = 0, bigT = 0;
  if (fine) {
    cur = document.createElement('div'); cur.className = 'mo-cur'; cur.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cur);
    addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      var t = e.target, r = t && t.closest ? t.closest('.eltio') : null;
      cur.style.display = r && lvl(r) === 3 ? 'block' : 'none';
      bigT = t && t.closest && t.closest('a, button') ? -1 : t && t.closest && t.closest('.bp, .el-stack, .brandrow figure') ? 1 : 0;
    }, { passive: true });
  }

  function clear(o) {
    o.secs.forEach(function (s) {
      s.w.style.transform = s.w.style.opacity = '';
      if (s.piece) s.piece.style.transform = s.piece.style.clipPath = '';
      if (s.cap) s.cap.style.transform = '';
      s.figs.forEach(function (f) { f.style.transform = ''; });
    });
    if (o.intro) o.intro.style.transform = o.intro.style.opacity = '';
    o.prog.style.transform = 'scaleX(0)';
    // the old one-shot reveal from site.js is replaced while motion is on
    if (o.lv > 0) arr(o.root.querySelectorAll('.rv.pre')).forEach(function (e) { e.classList.remove('pre'); });
  }

  var lastY = scrollY, vel = 0;
  function frame() {
    var y = scrollY, vh = innerHeight;
    vel += ((y - lastY) - vel) * .18; lastY = y;
    R.forEach(function (o) {
      var lv = lvl(o.root);
      if (lv !== o.lv) { o.lv = lv; clear(o); }
      if (!lv || !o.main) return;
      if (o.root.offsetParent === null && getComputedStyle(o.root).position !== 'fixed') return; // hidden copy
      // read
      var mr = o.main.getBoundingClientRect();
      var rects = o.secs.map(function (s) { return s.el.getBoundingClientRect(); });
      var ir = lv >= 2 && o.intro ? o.intro.getBoundingClientRect() : null;
      // write
      o.prog.style.transform = 'scaleX(' + cl((vh * .5 - mr.top) / Math.max(1, mr.height), 0, 1).toFixed(4) + ')';
      if (lv < 2) return;
      if (ir) {
        var t = cl(-ir.top / Math.max(1, ir.height), 0, 1);
        o.intro.style.transform = 'translateY(' + (t * ir.height * .35).toFixed(1) + 'px)';
        o.intro.style.opacity = (1 - t * .9).toFixed(3);
      }
      var skew = lv === 3 ? cl(vel * .05, -2.2, 2.2) : 0;
      o.secs.forEach(function (s, i) {
        var r = rects[i];
        if (r.bottom < -vh || r.top > vh * 2) return;
        var c = (r.top + Math.min(r.height, vh) * .5 - vh * .5) / vh;          // -1 above .. 0 centred .. +1 below
        var E = cl((vh - r.top) / (vh * .55), 0, 1);                            // arriving
        var L = lv === 3 ? cl((vh * .85 - r.bottom) / (vh * .7), 0, 1) : 0;     // leaving
        // the whole section moves as one block, and neighbours drift apart rather than together, so nothing overlaps
        var dy = (c * 30 + (1 - E) * 40).toFixed(1);
        s.w.style.transform = 'translateY(' + dy + 'px)' + (lv === 3 ? ' scale(' + (1 - L * .07).toFixed(4) + ') skewY(' + skew.toFixed(3) + 'deg)' : '');
        s.w.style.opacity = lv === 3 ? (1 - L * .65).toFixed(3) : '';
        if (s.piece) {
          s.piece.style.transform = 'scale(' + (.95 + .05 * E).toFixed(4) + ')';
          s.piece.style.clipPath = lv === 3 ? 'inset(' + ((1 - E) * 14).toFixed(2) + '% ' + ((1 - E) * 10).toFixed(2) + '% round 10px)' : '';
        }
      });
    });
    if (cur) {
      cx += (tx - cx) * .2; cy += (ty - cy) * .2; big += (bigT - big) * .15;
      var d = 14 + big * (big > 0 ? 50 : 8);
      cur.style.transform = 'translate(' + (cx - d / 2).toFixed(1) + 'px,' + (cy - d / 2).toFixed(1) + 'px)';
      cur.style.width = cur.style.height = d.toFixed(1) + 'px';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
