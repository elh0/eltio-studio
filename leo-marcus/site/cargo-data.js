/* Cargo data: the films come from Leo's Work set (see helical.js), not a fixed list */
var WORK = (window.HS && HS.films) || [];
(function () {
  var known = { comp: 'Composition', sd: 'Sound design', mix: 'Mix' };
  WORK.forEach(function (x) { x.t.forEach(function (k) { if (!TAGS[k]) { TAGS[k] = k.replace(/-/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); TAG_ORDER.push(k); } }); });
  TAG_ORDER = TAG_ORDER.filter(function (k) { return WORK.some(function (x) { return x.t.indexOf(k) > -1; }); });
})();
function still(w) { return w.th || 'https://vumbnail.com/' + w.v + '.jpg'; }
function thumb(w) { return still(w); }
function ratio() { return 2.42; }
var _credits = credits; credits = function (w) { return w.hs || _credits(w); };
setWay = function () { document.documentElement.setAttribute('data-way', 'red'); };
setWay(); document.documentElement.classList.add('white');
/* Leo's Info page fills the footer and the phone info page */
(function (i) {
  if (!i) return;
  var esc = function (s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
  var ig = i.ig ? (/^https?:/.test(i.ig) ? i.ig : 'https://instagram.com/' + i.ig.replace(/^@/, '')) : '';
  if (i.bio) { document.querySelector('.bar2 .bio').textContent = i.bio; document.querySelector('#info > p').textContent = 'Helical Sound is ' + i.bio.replace(/^an?\s+/i, function (m) { return m.toLowerCase(); }); }
  var b = document.querySelector('#seg .sg-b'), p = document.querySelectorAll('#info p')[1];
  if (i.name) b.querySelector('span').textContent = i.name;
  if (i.email) { var a = b.querySelector('a[href^="mailto"]'); a.href = 'mailto:' + i.email; a.textContent = i.email; }
  if (ig) document.querySelectorAll('#hs a[href*="instagram.com"]').forEach(function (a) { a.href = ig; });
  if (p) p.innerHTML = '<span class="q2">Contact</span><br>' + esc(i.name || '') + '<br><a href="mailto:' + esc(i.email || '') + '">' + esc(i.email || '') + '</a><br><a href="' + esc(ig) + '" target="_blank" rel="noopener">Instagram</a>';
})(window.HS && HS.info);
