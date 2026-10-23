/* Helical Sound directions: shared data and the colourway switch.
   Work list and credits copied from helical-sound.com (23 Oct 2026); stills are frames from those films. */
var TAGS = { comp: 'Composition', sd: 'Sound design', mix: 'Mix' };
var TAG_ORDER = ['comp', 'sd', 'mix'];
var WORK = [
  { c: 'Frederic Malle', p: 'Contre-Jour', t: ['comp', 'sd', 'mix'], s: 'malle-contrejour', d: '00:15' },
  { c: 'Dyson Beauty', p: 'Ceramic Apricot and Topaz', t: ['comp', 'sd', 'mix'], s: 'dyson-ceramic', d: '00:30' },
  { c: 'Polène', p: 'Winter 25 Campaign', t: ['comp', 'sd', 'mix'], s: 'polene-winter25', d: '00:30' },
  { c: 'BMW', p: 'The New iX3', t: ['comp', 'sd', 'mix'], s: 'bmw-ix3', d: '01:15' },
  { c: 'Polène', p: 'Summer 25 Campaign', t: ['comp', 'sd', 'mix'], s: 'polene-summer25', d: '00:15' },
  { c: 'Loro Piana', p: 'Resort 25 Campaign', t: ['comp'], s: 'loropiana-resort25', d: '00:52' },
  { c: 'Moncler', p: 'An Invitation to Dream', t: ['comp', 'mix'], s: 'moncler-dream', d: '01:03' },
  { c: 'Tiffany & Co.', p: 'Icon Campaign', t: ['comp', 'sd', 'mix'], s: 'tiffany-icon', d: '00:36' },
  { c: 'Margaret Howell', p: 'SS25 Campaign', t: ['sd', 'mix'], s: 'howell-ss25', d: '00:36' },
  { c: 'Versace', p: 'FW23 Campaign', t: ['comp'], s: 'versace-fw23', d: '00:09' },
  { c: 'Liu Jo', p: 'FW22 Campaign', t: ['comp', 'sd', 'mix'], s: 'liujo-fw22', d: '00:30' },
  { c: 'Roberto Cavalli', p: 'SS23 Campaign', t: ['comp'], s: 'cavalli-ss23', d: '00:30' },
  { c: 'Versace', p: 'Watches', t: ['comp'], s: 'versace-watches', d: '00:11' },
  { c: 'Ferragamo', p: 'PS23 Bags', t: ['comp', 'sd'], s: 'ferragamo-ps23', d: '00:15' }
];
function still(w) { return '../stills/' + w.s + '.jpg'; }
function credits(w) {
  var s = w.t.map(function (k) { return TAGS[k]; }).join(', ');
  return s.charAt(0) + s.slice(1).toLowerCase();
}
function count(tag) { return tag === 'all' ? WORK.length : WORK.filter(function (w) { return w.t.indexOf(tag) > -1; }).length; }
function secs(d) { var p = d.split(':'); return +p[0] * 60 + +p[1]; }
function clock(s) { s = Math.max(0, Math.floor(s)); return (s < 600 ? '0' : '') + Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + s % 60; }

/* colourways: paper/ink, paper/red, ink/paper. Remembered per viewer. */
var WAYS = ['ink', 'red', 'dark'];
function setWay(w) {
  document.documentElement.setAttribute('data-way', w);
  document.querySelectorAll('[data-way-btn]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-way-btn') === w); });
  try { localStorage.setItem('hs-way', w); } catch (e) {}
}
(function () {
  var w = 'ink';
  try { w = localStorage.getItem('hs-way') || 'ink'; } catch (e) {}
  if (WAYS.indexOf(w) < 0) w = 'ink';
  document.documentElement.setAttribute('data-way', w);
  document.addEventListener('DOMContentLoaded', function () {
    setWay(w);
    document.querySelectorAll('[data-way-btn]').forEach(function (b) {
      b.addEventListener('click', function () { setWay(b.getAttribute('data-way-btn')); });
    });
  });
})();
