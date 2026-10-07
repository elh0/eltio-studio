// London clock in the profile column.
(function () {
  var els = document.querySelectorAll('.clock');
  if (!els.length) return;
  function tick() {
    var t;
    try {
      t = new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour12: false });
    } catch (e) {
      t = new Date().toTimeString().slice(0, 8);
    }
    for (var i = 0; i < els.length; i++) els[i].textContent = t;
  }
  tick();
  setInterval(tick, 1000);
})();

// Scroll: reveal work as it arrives, play loops only while visible, mark the current piece in the index.
(function () {
  if (!('IntersectionObserver' in window)) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduce) {
    var rv = document.querySelectorAll('.eltio .rv');
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('pre'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    rv.forEach(function (el) {
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('pre'); ro.observe(el); }
    });
  }

  var vo = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting && !reduce) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
    });
  }, { threshold: .15 });
  document.querySelectorAll('.eltio video.loop').forEach(function (v) { if (reduce) v.removeAttribute('autoplay'); vo.observe(v); });

  document.querySelectorAll('.eltio').forEach(function (root) {
    var items = root.querySelectorAll('.work[data-k]');
    var marks = root.querySelectorAll('.list p[data-k]');
    var now = root.querySelector('.mbar .now');
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var k = e.target.dataset.k;
        marks.forEach(function (m) { m.classList.toggle('on', m.dataset.k === k); });
        if (now) now.textContent = '(0' + k + ') ' + e.target.dataset.label;
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    items.forEach(function (it) { so.observe(it); });
  });
})();

// Index links glide to their piece.
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('.eltio a[href^="#"]');
  if (!a) return;
  var t = document.getElementById(a.getAttribute('href').slice(1));
  if (!t) return;
  e.preventDefault();
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
});

// (Try it): swap a loop for the working prototype, and back.
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('.eltio button.try');
  if (!b) return;
  var fig = b.closest('.live'), stage = fig.querySelector('.stage'), cap = fig.querySelector('.cap .m');
  var f = stage.querySelector('iframe');
  if (fig.classList.contains('on')) {
    fig.classList.remove('on'); b.textContent = '(Try it)'; cap.textContent = cap.dataset.was;
    setTimeout(function () { if (f && !fig.classList.contains('on')) f.remove(); }, 600);
    return;
  }
  if (!f) {
    f = document.createElement('iframe');
    f.src = b.dataset.src; f.title = 'Out & Scout, working prototype'; f.loading = 'eager';
    f.onload = function () { fig.classList.add('on'); };
    stage.appendChild(f);
    var fitF = function () { if (stage.clientWidth) f.style.setProperty('--ifs', (stage.clientWidth / 844).toFixed(4)); };
    fitF(); addEventListener('resize', fitF);
    if (window.ResizeObserver) new ResizeObserver(fitF).observe(stage);
  } else fig.classList.add('on');
  cap.dataset.was = cap.dataset.was || cap.textContent;
  cap.textContent = 'Working prototype. Tap anything, drag the time'; b.textContent = '(Close)';
});
