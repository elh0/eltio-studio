/* Round 1: pages sit one folder deeper, and Helix thumbnails can be their own crop at their
   own shape (th = file in r1/thumbs, r = width / height). BMW is recropped past the dark
   foreground so it doesn't read as a black bar. */
var THUMBS = { 'bmw-ix3': 1.5 };
function still(w) { return '../../stills/' + w.s + '.jpg'; }
function thumb(w) { return THUMBS[w.s] ? '../thumbs/' + w.s + '.jpg' : still(w); }
function ratio(w) { return THUMBS[w.s] || 2.42; }

/* 30 Oct: Leo's own list (his sheet, 20 films) replaces the 14 copied from his old site. v is the
   Vimeo id; s is one of our stills where we have a frame, otherwise Vimeo's own cover is used until
   Leo sends thumbnails. d is a placeholder until vimeo-r1.js reads the real length. */
WORK = [
  { c: 'Emporio Armani', p: 'SS26 Campaign', dir: 'Beltran Gonzalez', t: ['comp'], v: '1164506255' },
  { c: 'Dyson Beauty', p: 'Ceramic Apricot and Topaz', dir: 'Optical Arts', t: ['comp', 'sd', 'mix'], s: 'dyson-ceramic', v: '1209481642' },
  { c: 'Frederic Malle', p: 'Contre-Jour', dir: 'Jack Davison', ag: 'Veronica Ditting', t: ['comp', 'sd', 'mix'], s: 'malle-contrejour', v: '1180852363' },
  { c: 'Polène', p: 'Winter 26 Campaign', dir: 'Théo Vincent', t: ['comp'], v: '1237555872' },
  { c: 'Polène', p: 'Winter 25 Campaign', dir: 'Guillaume Lebel', t: ['comp', 'sd', 'mix'], s: 'polene-winter25', v: '1164646469' },
  { c: 'BMW', p: 'The New iX3', dir: 'Joshua Vii', t: ['comp', 'sd', 'mix'], s: 'bmw-ix3', v: '1164617765' },
  { c: 'Canada Goose', p: 'Sea Mantra', dir: 'Alexis Zabé', ag: 'BeGOOD Studios', t: ['comp', 'sd', 'mix'], v: '1080249781', fr: 1.49 },
  { c: 'Loro Piana', p: 'Resort 25 Campaign', dir: 'Beltran Gonzalez', ag: 'Thomas Persson', t: ['comp'], s: 'loropiana-resort25', v: '1095040150' },
  { c: 'Moncler', p: 'An Invitation to Dream', dir: 'Jack Davison', ag: 'Dazed Studio', t: ['comp', 'mix'], s: 'moncler-dream', v: '938171024' },
  { c: 'Tiffany & Co.', p: 'Icon Campaign', dir: 'Oldie', ag: 'Any Other Name', t: ['comp', 'sd', 'mix'], s: 'tiffany-icon', v: '943982351' },
  { c: 'Polène', p: 'Champs-Élysées', dir: 'Guillaume Lebel', t: ['comp', 'sd', 'mix'], v: '1071689624' },
  { c: 'Margaret Howell', p: 'SS25 Campaign', dir: 'Joel Kerr', ag: 'Lane & Associates', t: ['sd', 'mix'], s: 'howell-ss25', v: '1059696419' },
  { c: 'Jo Malone', p: 'Myrrh & Tonka', dir: 'Jack Davison', t: ['comp', 'sd', 'mix'], v: '901066303' },
  { c: 'Nike', p: 'Mercurial', dir: 'Jack Davison', t: ['comp'], v: '1005064360' },
  { c: 'Versace', p: 'FW23 Campaign', t: ['comp'], s: 'versace-fw23', v: '864367878' },
  { c: 'Jo Malone', p: 'Wood Sage & Sea Salt', dir: 'Jack Davison', t: ['comp', 'sd', 'mix'], v: '954321936' },
  { c: 'Lanvin', p: 'Sneakers Campaign', t: ['comp'], v: '842428157' },
  { c: 'Roberto Cavalli', p: 'SS23 Campaign', dir: 'Johnny Dufort', ag: 'Marc Ascoli', t: ['comp'], s: 'cavalli-ss23', v: '799054612' },
  { c: 'Liu Jo', p: 'FW22 Campaign', dir: 'Alvaro Colom', ag: 'Studio Mooks', t: ['comp', 'sd', 'mix'], s: 'liujo-fw22', v: '753913915' },
  { c: 'Ferragamo', p: 'PS23 Bags', dir: 'Antoine Asseraf', ag: 'Edward Quarmby', t: ['comp', 'sd', 'mix'], s: 'ferragamo-ps23', v: '799082801' }
];
WORK.forEach(function (w) { w.d = '00:30'; });
function still(w) { return w.s ? '../../stills/' + w.s + '.jpg' : w.th || 'https://vumbnail.com/' + w.v + '.jpg'; }
function thumb(w) { return w.s && THUMBS[w.s] ? '../thumbs/' + w.s + '.jpg' : still(w); }
function ratio(w) { return (w.s && THUMBS[w.s]) || 2.42; }
