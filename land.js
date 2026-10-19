// Landing page inside the project-pages artifact: the list stays exactly as designed, but opening a project
// goes to its place on the one long projects page (one-os.html#p=N) instead of the old pop-up sheet. Spoolends is off for now.
(function () {
  var arr = function (l) { return Array.prototype.slice.call(l); };
  var ghosted = false; try { ghosted = !!(window.frameElement && window.frameElement.hasAttribute('data-ghost')); } catch (e) {}
  // loaded quietly behind the end of the projects page: hold still at the top (the intro would otherwise glide on by itself)
  if (ghosted) setInterval(function () { dispatchEvent(new Event('pointermove')); }, 700);
  var DROP = '5';                       // Spoolends, in the list's own numbering
  var MAP = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4 }; // list number -> project on one-os.html
  var se = document.querySelector('.x-p[data-i="' + DROP + '"]');
  if (se) {
    se.parentNode.removeChild(se);
    arr(document.querySelectorAll('.x-idx button[data-i="' + DROP + '"]')).forEach(function (b) { var li = b.closest('li'); li.parentNode.removeChild(li); });
    arr(document.querySelectorAll('.x-sheet[data-i="' + DROP + '"]')).forEach(function (s) { s.parentNode.removeChild(s); });
    // renumber what comes after it
    arr(document.querySelectorAll('.x-p')).forEach(function (a, k) {
      var n = a.querySelector('.x-n'); if (n) n.textContent = '(0' + (k + 1) + ')';
      var g = a.querySelector('.x-gap');
      if (g) {
        g.setAttribute('data-to', k + 1);
        var nxt = document.querySelectorAll('.x-p')[k + 1], sp = g.querySelectorAll('span')[1];
        if (sp) sp.textContent = nxt ? '(0' + (k + 2) + ') ' + nxt.querySelector('.x-name').textContent : 'Say hello';
      }
    });
    arr(document.querySelectorAll('.x-idx button')).forEach(function (b, k) { var m = b.querySelector('.m'); if (m) m.textContent = '0' + (k + 1); });
  }
  // 19:48 the simpler phone landing (plx.css .lp) and the right count now Spoolends is off
  var lroot = document.querySelector('.eltio.alt-plx'); if (lroot) lroot.classList.add('lp');
  var cueT = document.querySelector('.x-cue span'); if (cueT) cueT.textContent = '(5) projects, Out & Scout, Grip, Lampwerk, Aglo, Systems';
  if (ghosted) return;
  // 18 Oct: every project gets a link of its own to send people (eltio.studio/#grip). The address follows the
  // project you're in, and a link with a project in it opens straight onto that project. Inside Cargo the page above
  // us keeps its own address in step from our messages.
  var SL = ['out-and-scout', 'grip', 'lampwerk', 'aglo', 'systems'];
  function setRoute(s) {
    try { history.replaceState(history.state, '', location.pathname + location.search + (s ? '#' + s : '')); } catch (e) {}
    if (window.parent !== window) window.parent.postMessage({ eltioRoute: s }, '*');
  }
  var deep = SL.indexOf((location.hash.slice(1) || (/[?&]p=([a-z-]+)/.exec(location.search) || [])[1] || '').toLowerCase());
  if (deep >= 0) { var dst = document.createElement('style'); dst.textContent = 'html.cg-deep .eltio{visibility:hidden}'; document.head.appendChild(dst); document.documentElement.classList.add('cg-deep'); }
  // 18:46 the preview loses the project on a page change, so projects open over the landing page in one frame we
  // address ourselves (one-os.html#p=N, then messages); Close or scrolling out of the end brings the landing back.
  // 19:31 make that move feel smooth. The projects page loads quietly in the background, then one of four
  // moves (picked at the bottom of the preview while he compares them):
  //   grow   - the logo you pressed grows into that project's cover tile while the page settles in around it
  //   circle - the project opens as a circle from where you tapped
  //   slide  - the project slides up over the landing like a sheet (and back down on Close)
  //   fade   - a quick fade, already loaded
  var V = ((document.currentScript && document.currentScript.src) || '').split('?')[1] || '';
  var html = document.documentElement, ov = null, of = null;
  var mode = 'fade'; // 19:44 picked Fade (the others stay below in case he wants to compare again)
  html.setAttribute('data-tr', mode);
  var E = 'cubic-bezier(.22,1,.36,1)'; // 19:38 way softer (a long gentle ease-out everywhere)
  var st = document.createElement('style');
  st.textContent =
    'html{-webkit-tap-highlight-color:transparent}.cg-ov{position:fixed;inset:0;z-index:2147483600;background:#fff;opacity:0;visibility:hidden;transition:opacity .6s ' + E + ',visibility 0s .6s}' +
    '.cg-ov iframe{display:block;width:100%;height:100%;border:0}' +
    'html.cg-open,html.cg-open body{overflow:hidden!important}html.cg-open .mo-cur{display:none!important}' +
    // grow: white comes up behind the flying logo, then the page fades in under it
    'html[data-tr=grow].cg-open .cg-ov{opacity:1;visibility:visible;transition:opacity .6s ' + E + '}' +
    'html[data-tr=grow] .cg-ov iframe{opacity:0;transition:opacity .6s ' + E + '}html[data-tr=grow].cg-in .cg-ov iframe{opacity:1}' +
    '.cg-fly{position:fixed!important;left:0;top:0;margin:0!important;z-index:2147483601;pointer-events:none;transform-origin:0 0;background:none!important;border:0!important;box-shadow:none!important;transition:transform .9s ' + E + ',opacity .5s ' + E + ' .55s}' +
    '.cg-fly .k2-wf,.cg-fly .k2-tag{display:none!important}' +
    // circle
    'html[data-tr=circle] .cg-ov{opacity:1;clip-path:circle(0px at var(--ox,50%) var(--oy,50%));transition:clip-path .8s ' + E + ',visibility 0s .8s}' +
    'html[data-tr=circle].cg-go .cg-ov{visibility:visible;clip-path:circle(150vmax at var(--ox,50%) var(--oy,50%));transition:clip-path 1.1s ' + E + '}' +
    // slide
    'html[data-tr=slide] .cg-ov{opacity:1;transform:translateY(100%);transition:transform .8s ' + E + ',visibility 0s .8s}' +
    'html[data-tr=slide].cg-go .cg-ov{visibility:visible;transform:none;transition:transform 1s ' + E + '}' +
    // fade
    'html[data-tr=fade] .cg-ov{transition:opacity .6s ' + E + ',visibility 0s .6s}html[data-tr=fade].cg-go .cg-ov{opacity:1;visibility:visible;transition:opacity .8s ' + E + '}' +
    'html[data-tr=fade] .cg-ov iframe{transform:translateY(16px);transition:transform 1s ' + E + '}html[data-tr=fade].cg-go .cg-ov iframe{transform:none}' +
    // the picker (preview only)
    '.cg-pick{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:99;display:flex;gap:4px;font:11px/1 ui-monospace,monospace;background:rgba(255,255,248,.92);padding:4px;border:1px solid rgba(11,11,10,.12);border-radius:999px}' +
    '.cg-pick button{all:unset;cursor:pointer;padding:6px 10px;border-radius:999px;color:#8A8A83}.cg-pick button.on{background:#0B0B0A;color:#fff}' +
    'html.cg-open .cg-pick{display:none}';
  document.head.appendChild(st);

  var last = 0, wantAt = null, busy = false;
  function ensure() {
    if (ov) return;
    ov = document.createElement('div'); ov.className = 'cg-ov';
    of = document.createElement('iframe'); of.title = 'Projects'; of.setAttribute('allow', 'autoplay');
    of.src = 'one-os.html?' + (V ? V + '&' : '') + 'in=1#p=' + last;
    ov.appendChild(of); document.body.appendChild(ov);
    // say it again once it has loaded, in case the address lost it on the way
    of.addEventListener('load', function () { of.ready = true; [0, 400, 1200].forEach(function (d) { setTimeout(function () { if (!busy) of.contentWindow.postMessage({ cgGo: last }, '*'); }, d); }); });
  }
  addEventListener('load', function () { setTimeout(ensure, 1200); });
  if (deep >= 0) { last = MAP[deep]; setTimeout(function () { openP(last, null); }, 0); }
  function settle() { busy = false; setTimeout(function () { try { of.focus(); } catch (e) {} }, 50); }
  function openP(to, from) {
    last = to; busy = true; ensure();
    html.classList.remove('cg-in', 'cg-go');
    var src = from && from.querySelector('.k2'), r = src && src.getBoundingClientRect();
    if (r) { html.style.setProperty('--ox', (r.left + r.width / 2) + 'px'); html.style.setProperty('--oy', (r.top + r.height / 2) + 'px'); }
    html.classList.add('cg-open');
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, fly = null, fired = false;
    function go(d) {
      if (fired) return; fired = true; wantAt = null;
      if (fly && d) {
        var k = d.w / r.width, ty = d.y + d.h / 2 - r.height * k / 2;
        fly.style.transform = 'translate(' + d.x + 'px,' + ty + 'px) scale(' + k + ')';
        setTimeout(function () { html.classList.add('cg-in'); fly.style.opacity = '0'; settle(); }, 620);
        setTimeout(function () { if (fly.parentNode) fly.parentNode.removeChild(fly); }, 1300);
      } else {
        if (fly && fly.parentNode) fly.parentNode.removeChild(fly);
        html.classList.add('cg-in', 'cg-go'); settle();
      }
    }
    if (mode === 'grow' && src && of.ready && !reduce) {
      fly = src.cloneNode(true); fly.classList.remove('on'); fly.classList.add('cg-fly');
      fly.style.width = r.width + 'px'; fly.style.height = r.height + 'px'; fly.style.transform = 'translate(' + r.left + 'px,' + r.top + 'px)';
      document.querySelector('.eltio').appendChild(fly);
    }
    wantAt = go;
    if (of.ready) { of.contentWindow.postMessage({ cgGo: to, want: 1 }, '*'); setTimeout(function () { go(null); }, 700); }
    else of.addEventListener('load', function () { setTimeout(function () { go(null); }, 250); }, { once: true });
  }
  addEventListener('message', function (e) {
    if (!of || e.source !== of.contentWindow || !e.data) return;
    if (e.data.cgAt && wantAt) wantAt(e.data.cgAt);
    if (e.data.cgRoute != null && html.classList.contains('cg-open')) setRoute(e.data.cgRoute);
    if (!e.data.cgClose) return;
    if (e.data.top) scrollTo(0, 0);
    html.classList.remove('cg-open', 'cg-in', 'cg-go', 'cg-deep');
    setRoute('');
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.x-go, .x-frame');
    // on the simple phone landing the whole card opens its project
    if (!b && innerWidth <= 760 && e.target.closest) { var art = e.target.closest('.x-p'); if (art) { b = art; b.setAttribute('data-i', art.getAttribute('data-i')); } }
    if (!b) return;
    var to = MAP[b.getAttribute('data-i')]; if (to === undefined) return;
    e.preventDefault(); e.stopImmediatePropagation();
    openP(to, b.closest('.x-p'));
  }, true);
})();
