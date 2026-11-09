/* Helical Sound on Cargo: the loader. Paste into Cargo's site custom HTML:
     <link rel="stylesheet" href="https://elh0.github.io/eltio-studio/leo-marcus/site/helical.css">
     <script src="https://elh0.github.io/eltio-studio/leo-marcus/site/helical.js"></script>
   It reads Leo's film pages from Cargo (the set called Work, one page per film) and his Info
   page, then draws the round 2 site over Cargo's own page. Leo only edits pages in Cargo. */
(function () {
  if (window.__hs) return; window.__hs = 1;
  /* leave Cargo alone inside its editor (the site runs in a frame there) or with ?cargo in the address */
  var framed = false; try { framed = window.self !== window.top; } catch (e) { framed = true; }
  if ((framed && !window.HS_TEST) || /[?&]cargo\b/.test(location.search)) return;
  var me = document.currentScript && document.currentScript.src;
  var BASE = me ? me.replace(/[^\/]*(\?.*)?$/, '') : 'https://elh0.github.io/eltio-studio/leo-marcus/site/';
  var API = window.HS_API || 'https://cargo.site/_api/v1-p/pages/';
  var root = document.documentElement; root.classList.add('hs-on');
  if (!document.querySelector('link[href*="helical.css"]')) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = BASE + 'helical.css'; document.head.appendChild(l); }
  var TAGKEY = { 'composition': 'comp', 'sound design': 'sd', 'mix': 'mix' };

  function siteId() {
    var s = null;
    try { s = window.store && window.store.getState().site; } catch (e) {}
    s = s || (window.__PRELOADED_STATE__ || {}).site;
    return s && s.id;
  }
  function wait(fn, ms) { return new Promise(function (ok, no) { var t0 = Date.now(); (function go() { var v = fn(); if (v) ok(v); else if (Date.now() - t0 > ms) no(new Error('no site id')); else setTimeout(go, 50); })(); }); }
  function get(u) { return fetch(API + u).then(function (r) { if (!r.ok) throw new Error(r.status + ' ' + u); return r.json(); }); }
  /* Cargo's answers vary in shape, so walk them and keep every page-like object */
  function walk(o, out) {
    if (!o || typeof o !== 'object') return out;
    if (Array.isArray(o)) { o.forEach(function (v) { walk(v, out); }); return out; }
    if (o.id != null && o.title != null && (o.page_type || o.purl != null)) out.push(o);
    Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === 'object') walk(o[k], out); });
    return out;
  }
  function lines(html) {
    html = String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h\d|li)>/gi, '\n');
    var t = new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
    return t.split('\n').map(function (s) { return s.replace(/ /g, ' ').trim(); }).filter(Boolean);
  }
  function label(ls, re) { for (var i = 0; i < ls.length; i++) { var m = ls[i].match(re); if (m) return m[1].trim(); } return ''; }
  var LAB = /^(director|directed by|creative direction|agency|helical sound|vimeo|link)\s*[:\-–]/i;
  function film(p) {
    var html = p.content || '', ls = lines(html);
    var v = (html.match(/vimeo\.com\/(?:video\/)?(\d+)/) || [])[1]; if (!v) return null;
    var proj = ''; for (var i = 0; i < ls.length; i++) { if (!/^https?:|vimeo\.com/i.test(ls[i]) && !LAB.test(ls[i])) { proj = ls[i]; break; } }
    var t = (p.tags || []).map(function (g) { var n = String(g.tag || g.name || g).trim(); return TAGKEY[n.toLowerCase()] || n.toLowerCase().replace(/[^a-z0-9]+/g, '-'); });
    var th = p.thumbnail && !p.thumbnail.is_placeholder && p.thumbnail.hash ? 'https://freight.cargo.site/w/1600/i/' + p.thumbnail.hash + '/' + p.thumbnail.name : '';
    return { c: p.title, p: proj, v: v, t: t, purl: p.purl, th: th, d: '00:30',
      dir: label(ls, /^(?:director|directed by)\s*[:\-–]\s*(.+)/i), ag: label(ls, /^(?:creative direction|agency)\s*[:\-–]\s*(.+)/i),
      hs: label(ls, /^helical sound\s*[:\-–]\s*(.+)/i) };
  }
  function info(p) {
    if (!p) return null;
    var ls = lines(p.content);
    return { bio: ls.filter(function (s) { return !/:/.test(s.slice(0, 20)) && !/^https?:/.test(s); })[0] || '',
      name: label(ls, /^contact\s*[:\-–]\s*(.+)/i), email: label(ls, /^email\s*[:\-–]\s*(.+)/i),
      ig: label(ls, /^instagram\s*[:\-–]\s*(.+)/i) };
  }
  function boot(HS) {
    window.HS = HS;
    return fetch(BASE + 'helical-body.html').then(function (r) { return r.text(); }).then(function (body) {
      var d = document.createElement('div'); d.id = 'hs'; d.innerHTML = body; document.body.appendChild(d);
      var s = document.createElement('script'); s.src = BASE + 'helical-app.js'; document.body.appendChild(s);
    });
  }
  var id;
  /* the Work set: by its address (url/work); scaffolding is a fallback, it can miss new sets */
  wait(siteId, 8000).then(function (v) {
    id = v;
    return get(id + '/url/work').then(function (w) { var s = walk(w, []).filter(function (p) { return p.page_type === 'set'; }); if (!s.length) throw 0; return s; })
      .catch(function () { return get(id + '/scaffolding').then(function (sc) { return walk(sc, []); }); });
  }).then(function (all) {
    var set = all.filter(function (p) { return p.page_type === 'set' && /^work$/i.test(String(p.title).trim()); })[0] || all.filter(function (p) { return p.page_type === 'set'; })[0];
    if (!set) throw new Error('no Work set');
    var idx = []; for (var i = 0; i < 400; i++) idx.push(i);
    /* Cargo's set filter can come back short, so also read the film tags and merge (every film has at least one tag) */
    var films = Promise.all([get(id + '/filter/?indexBySet=' + encodeURIComponent(JSON.stringify([{ set_id: String(set.id), index: idx }])))]
      .concat(['composition', 'sound-design', 'mix'].map(function (t) { return get(id + '/tag/' + t); }))
      .map(function (q) { return q.catch(function () { return []; }); }));
    var inf = get(id + '/url/info').catch(function () { return null; });
    return Promise.all([films, inf]).then(function (a) {
      var seen = {}, pages = walk(a[0], []).filter(function (p) {
        if (seen[p.id] || p.page_type === 'set' || String(p.set_id) !== String(set.id) || p.display === false) return false;
        return (seen[p.id] = 1);
      }).sort(function (x, y) { return (x.sort || 0) - (y.sort || 0); });
      return boot({ cargo: !!(window.store || window.__PRELOADED_STATE__) && !window.HS_TEST, films: pages.map(film).filter(Boolean), info: info(walk(a[1], [])[0]) });
    });
  }).catch(function (e) { root.classList.remove('hs-on'); console.error('Helical Sound:', e); });
})();
