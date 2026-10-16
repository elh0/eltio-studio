// Site-wide pointer motion (8 Oct 2026):
// 1. the pointer is a disc that turns whatever is under it to negative, and swells over anything pressable
// 2. buttons lean toward the pointer before you reach them, their label leans a little further, then they spring back
// Mouse and trackpad only; touch and reduced motion keep the normal pointer.
(function () {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var st = document.createElement('style');
  st.textContent =
    'html.mo-on, html.mo-on * { cursor: none !important; }' +
    'html.mo-on .mo-cur { display: block; border: 0; position: fixed; left: 0; top: 0; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%; background: #fff; mix-blend-mode: difference; pointer-events: none; z-index: 2147483646; opacity: 0;' +
    ' transition: width .35s cubic-bezier(.2,.8,.2,1), height .35s cubic-bezier(.2,.8,.2,1), margin .35s cubic-bezier(.2,.8,.2,1), opacity .2s; will-change: transform; }' +
    'html.mo-on .mo-cur.on { opacity: 1; } html.mo-on .mo-cur.big { width: 64px; height: 64px; margin: -32px 0 0 -32px; } html.mo-on .mo-cur.down { width: 12px; height: 12px; margin: -6px 0 0 -6px; } html.mo-on .mo-cur.big.down { width: 52px; height: 52px; margin: -26px 0 0 -26px; }' +
    '.mo-mag { transition: transform .6s cubic-bezier(.25,1,.5,1); } .mo-mag.mo-near { transition: transform .18s ease-out; }' +
    '.mo-lab { display: inline-block; transition: transform .6s cubic-bezier(.25,1,.5,1); } .mo-near .mo-lab { transition: transform .18s ease-out; }';
  document.head.appendChild(st);
  var cur = document.createElement('div'); cur.className = 'mo-cur'; cur.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cur); document.documentElement.classList.add('mo-on');
  var PRESS = 'a, button, [role=button], label, summary, .x-go, .x-frame, .cg-tile[href], [data-mag]';
  var MAG = window.MO_MAG || 'button, [data-mag], .a-bar a, .cg-fr a, .cg-top, .cg-go, .op-x, .x-go';
  var x = -100, y = -100, cx = -100, cy = -100;
  addEventListener('mousemove', function (e) {
    x = e.clientX; y = e.clientY; cur.classList.add('on');
    var t = e.target.closest && e.target.closest(PRESS);
    // small text links in the frame keep the small disc, so you can read what you're about to click
    if (t && t.closest('.cg-fr, .cg-top, .mo-small')) t = null;
    cur.classList.toggle('big', !!t);
    magnet();
  }, { passive: true });
  document.addEventListener('mouseleave', function () { cur.classList.remove('on'); });
  addEventListener('mousedown', function () { cur.classList.add('down'); });
  addEventListener('mouseup', function () { cur.classList.remove('down'); });
  (function loop() { cx += (x - cx) * .35; cy += (y - cy) * .35; cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)'; requestAnimationFrame(loop); })();
  // magnetic buttons: a pull zone around each, the button follows a little, its label a little more
  var mags = [];
  function collect() {
    mags = Array.prototype.slice.call(document.querySelectorAll(MAG)).filter(function (el) { return !el.closest('.mo-skip'); });
    mags.forEach(function (el) {
      if (el.__mo) return; el.__mo = 1; el.classList.add('mo-mag');
      // wrap a bare text label so it can lean on its own
      if (el.children.length === 0 && el.textContent.trim()) { var s = document.createElement('span'); s.className = 'mo-lab'; s.textContent = el.textContent; el.textContent = ''; el.appendChild(s); }
    });
  }
  collect(); setTimeout(collect, 1500);
  function magnet() {
    mags.forEach(function (el) {
      var r = el.getBoundingClientRect(); if (!r.width) return;
      var mx = r.left + r.width / 2, my = r.top + r.height / 2, dx = x - mx, dy = y - my;
      var pad = 24, near = Math.abs(dx) < r.width / 2 + pad && Math.abs(dy) < r.height / 2 + pad;
      var lab = el.querySelector(':scope > .mo-lab, :scope > span:only-child, :scope > i:only-child');
      if (near) {
        el.classList.add('mo-near');
        var cl = function (v, m) { return Math.max(-m, Math.min(m, v)).toFixed(1); };
        el.style.transform = 'translate(' + cl(dx * .1, 4) + 'px,' + cl(dy * .1, 3) + 'px)';
        if (lab) { lab.classList.add('mo-lab'); lab.style.transform = 'translate(' + cl(dx * .05, 2) + 'px,' + cl(dy * .05, 1.5) + 'px)'; }
      } else if (el.classList.contains('mo-near')) {
        el.classList.remove('mo-near'); el.style.transform = ''; if (lab) lab.style.transform = '';
      }
    });
  }
  addEventListener('scroll', function () { magnet(); }, { passive: true });
})();
