/* Round 1: pages sit one folder deeper, and Helix thumbnails can be their own crop at their
   own shape (th = file in r1/thumbs, r = width / height). BMW is recropped past the dark
   foreground so it doesn't read as a black bar. */
var THUMBS = { 'bmw-ix3': 1.5 };
function still(w) { return '../../stills/' + w.s + '.jpg'; }
function thumb(w) { return THUMBS[w.s] ? '../thumbs/' + w.s + '.jpg' : still(w); }
function ratio(w) { return THUMBS[w.s] || 2.42; }
