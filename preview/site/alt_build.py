# Builds three alternate designs of the studio site from the same content as src/body.html:
#   alt-reel.html   A. Reel: the page scrolls sideways like an edit timeline, with timecode, a playhead and slates
#   alt-index.html  B. Index: a big credits list, a preview that follows the pointer, projects open in a sheet
#   alt-iris.html   C. Iris: an aperture opens onto the site, then projects stack up as cards
#   alt-plx.html    E. Parallax: a dead simple page with Webflow-style scroll motion (#p-1..#p-4)
#   alt-ring.html   D. Carousel: projects as cards on a carousel (#c-1 ring, #c-2 scroll turns it, #c-3 flat strip)
# Each page loads site.css + alt.css, and site.js + wf.js + alt.js. Run from build.py.
import pathlib, re, html
root = pathlib.Path(__file__).parent
body = (root / "src/body.html").read_text()

# ---------- pull the content out of the current page ----------
intro = re.findall(r'<p>(Eltio Studio was started.*?)</p>.*?<p>(.*?)</p>.*?<p>(If you want .*?)</p>', body, re.S)[0]
# 14 Oct Elliot: the studio is design-only and anonymous (no name, no filmmaker line, no elliot.onl)
intro = ('Eltio Studio makes websites and apps.', 'Designed and built in-house, start to finish, and kept simple.', intro[2])
SHOW_EL = False
idx = {m[0]: m[1].split('<br>') for m in re.findall(r'<p data-k="(\d)"><a [^>]*>(.*?)</a></p>', body)}
P = []
for sec in re.findall(r'(<section id="[^"]+".*?</section>)', body, re.S):
    sid = re.search(r'id="([^"]+)"', sec).group(1)
    k = re.search(r'data-k="(\d)"', sec).group(1)
    inner = re.sub(r'^<section[^>]*>|</section>$', '', sec.strip()).strip()
    cs = re.search(r'<div class="colset">.*?</div>\s*</div>\s*$', inner, re.S)
    colset = cs.group(0)
    br = re.search(r'<div class="brandrow.*?</figure>\s*</div>', inner, re.S).group(0)
    piece = inner[:inner.index(br)].strip()
    def part(c):
        m = re.search(r'<div class="%s">(.*?)</div>' % c, colset, re.S); return m.group(1).strip()
    P.append(dict(id=sid, k=k, name=idx[k][0], kind=idx[k][1], status=idx[k][2], year=idx[k][3],
                  piece=piece, brand=br, t=part('cs-t'), d=part('cs-d'), s=part('cs-s')))

if not SHOW_EL: P = [p for p in P if p['id'] != 'folio']

HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Eltio Studio</title>
<link rel="icon" href="eye.svg">
<link rel="stylesheet" href="site.css">
<link rel="stylesheet" href="alt.css">
<style>html,body{margin:0;background:#fffff8}</style>
</head>
<body>
'''
TAIL = '<script src="site.js"></script>\n<script src="wf.js"></script>\n<script src="alt.js"></script>\n</body>\n</html>\n'
CONTACT = '<a href="mailto:hello@eltio.studio">hello@eltio.studio</a> (<a href="https://instagram.com/eltio.studio">Instagram</a>)'

def notes(p):
    return ('<div class="a-notes"><div class="a-num"><span>%s.</span><span>%s</span></div>'
            '<div>%s</div><div>%s</div><div>%s</div></div>') % (p['k'], p['name'], p['t'], p['d'], p['s'])

# ---------- A. Reel ----------
clips = ''.join('<button type="button" class="r-clip" data-i="%d"><span>%s</span></button>' % (i + 1, html.escape(html.unescape(p['name']))) for i, p in enumerate(P))
panels = ''.join('''
  <section class="r-panel" data-i="%d" data-name="%s">
    <div class="r-side">
      %s
      %s
    </div>
    <div class="r-stage"><div class="fit"><div class="fit-in">%s</div></div></div>
  </section>''' % (i + 1, html.escape(html.unescape(p['name'])), notes(p), p['brand'], p['piece']) for i, p in enumerate(P))
reel = HEAD + '''<div class="eltio alt alt-reel">
  <header class="a-bar"><span class="caps">Eltio Studio</span><span class="m r-tc" aria-hidden="true">00:00:00:00</span><a href="mailto:hello@eltio.studio">hello@eltio.studio</a></header>
  <div class="r-track-wrap"><div class="r-sticky"><div class="r-track">
  <section class="r-panel r-intro" data-i="0" data-name="Eltio Studio">
    <div class="r-side">
      <p class="caps">Eltio Studio (2026)</p><div class="br"></div>
      <p>''' + intro[0] + '''</p><div class="br"></div>
      <p>''' + intro[1] + '''</p><div class="br"></div>
      <p>''' + intro[2] + '''</p><div class="br"></div>
      <p class="m">Scroll, the page runs sideways like a timeline &rarr;</p>
    </div>
    <div class="r-stage r-eyewrap"><span class="eye r-eye" aria-hidden="true"></span></div>
  </section>''' + panels + '''
  </div></div></div>
  <div class="r-slate" aria-hidden="true"><span class="r-slate-n"></span><span class="r-slate-t"></span></div>
  <footer class="r-line"><div class="r-clips"><button type="button" class="r-clip r-clip0" data-i="0"><span>Intro</span></button>''' + clips + '''</div><i class="r-head" aria-hidden="true"></i></footer>
</div>
''' + TAIL

# ---------- B. Index ----------
rows = ''.join('''
    <li class="x-row" data-i="%d"><button type="button" class="x-open" aria-haspopup="dialog">
      <span class="x-k m">%s</span><span class="x-name" data-txt="%s">%s</span><span class="x-kind m">%s</span><span class="x-st m">%s</span><span class="x-y m">%s</span>
    </button></li>''' % (i, '0' + p['k'], html.escape(html.unescape(p['name'])), p['name'], p['kind'], p['status'], p['year']) for i, p in enumerate(P))
peeks = ''.join('<div class="x-peek-i" data-i="%d">%s</div>' % (i, re.search(r'<figure>.*?</figure>', p['brand'], re.S).group(0)) for i, p in enumerate(P))
sheets = ''.join('''
  <section class="x-sheet" data-i="%d" role="dialog" aria-modal="true" aria-label="%s" hidden>
    <div class="x-sheet-bar"><span class="caps">%s. %s</span><span class="x-nav"><button type="button" class="x-prev">Prev</button><button type="button" class="x-next">Next</button><button type="button" class="x-close">Close (esc)</button></span></div>
    <div class="x-sheet-body">
      <div class="fit"><div class="fit-in">%s</div></div>
      %s
      %s
    </div>
  </section>''' % (i, html.escape(html.unescape(p['name'])), p['k'], p['name'], p['piece'], p['brand'], notes(p)) for i, p in enumerate(P))
index = HEAD + '''<div class="eltio alt alt-index">
  <header class="a-bar"><span class="caps">Eltio Studio</span><span class="m">(London, 2026)</span><span>''' + CONTACT + '''</span></header>
  <div class="x-intro"><p>''' + intro[0] + '''</p><p>''' + intro[1] + '''</p><p>''' + intro[2] + '''</p></div>
  <div class="x-head m"><span>No.</span><span>Project</span><span>Kind</span><span>Status</span><span>Year</span></div>
  <ol class="x-list">''' + rows + '''
  </ol>
  <div class="x-peek" aria-hidden="true">''' + peeks + '''</div>
  <footer class="a-foot m"><span>&copy; Eltio Studio (2026)</span><span class="eye" style="width:20px;background:var(--s4)" aria-hidden="true"></span></footer>
  ''' + sheets + '''
</div>
''' + TAIL

# ---------- C. Iris ----------
def lines(txt, at, keep_left):
    # split a sentence into two lines so each type layout can choose where the break goes
    i = txt.find(at)
    if i < 0: return '<span class="ln">%s</span>' % txt
    cut = i + (len(at.rstrip()) if keep_left else 0)
    out = '<span class="ln">%s</span> <span class="ln">%s</span>' % (txt[:cut].strip(), txt[cut:].strip())
    return out.replace('in-house', '<span class="nw">in-house</span>')

cards = ''.join('''
    <section class="i-card" data-i="%d" style="--i:%d">
      <div class="i-tab"><span class="caps">%s. %s</span><span class="m">%s, %s</span></div>
      <div class="i-body">
        <div class="i-stage"><div class="fit"><div class="fit-in">%s</div></div></div>
        <div class="i-side">%s%s</div>
      </div>
    </section>''' % (i, i, p['k'], p['name'], p['kind'], p['status'].lower(), p['piece'], notes(p), p['brand']) for i, p in enumerate(P))
iris = HEAD + '''<div class="eltio alt alt-iris">
  <header class="a-bar i-bar"><span class="caps">Eltio Studio</span><span class="m i-pct">(000)</span><a href="mailto:hello@eltio.studio">hello@eltio.studio</a></header>
  <div class="i-open"><div class="i-open-sticky">
    <div class="i-intro">
      <p class="caps i-lab">Eltio Studio <span class="m">(2026)</span></p>
      <p class="i-l1">''' + lines(intro[0], ' by ', keep_left=False) + '''</p>
      <p class="i-l2">''' + lines(intro[1], '. ', keep_left=True) + '''</p>
    </div>
    <div class="i-shut"><span class="eye i-eye" aria-hidden="true"></span><button type="button" class="i-down" aria-label="Scroll down"><svg viewBox="0 0 14 22" width="14" height="22" aria-hidden="true"><path d="M7 1v19M1 14l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1"/></svg></button></div><span class="m i-read" aria-hidden="true"></span>
  </div></div>
  <div class="i-stack">''' + cards + '''
    <section class="i-card i-end" data-i="%d" style="--i:%d">
      <div class="i-tab"><span class="caps">Contact</span><span class="m">(%02d)</span></div>
      <div class="i-end-body">
        <span class="eye i-end-mark" aria-hidden="true"></span>
        <a class="i-copy i-big" href="mailto:hello@eltio.studio"><span class="i-mask"><span class="i-rise">hello@eltio.studio</span></span></a>
        <div class="i-end-foot m"><span>(<a href="https://instagram.com/eltio.studio">Instagram</a>)</span><span>&copy; Eltio Studio (2026)</span><span class="eye i-end-eye" aria-hidden="true"></span></div>
      </div>
    </section>''' % (len(P), len(P), len(P) + 1) + '''
  </div>
</div>
''' + TAIL

for name, page in (('alt-reel.html', reel), ('alt-index.html', index), ('alt-iris.html', iris)):
    (root / name).write_text(page)

# Aglo has no mark: the name, outlined from Instrument Sans, and today's sky as the icon
AG_WM = (root / 'live/ag/aglo-wordmark.svg').read_text().strip().replace('<svg xmlns="http://www.w3.org/2000/svg" ', '<svg class="ag-wm" aria-hidden="true" ')
SY_WM = (root / 'live/sy/systems-wordmark.svg').read_text().strip().replace('<svg xmlns="http://www.w3.org/2000/svg" ', '<svg class="sy-wm" aria-hidden="true" ')
SY_SEGS = ''  # 19 Oct: the new identity (Sy ste ms, Familjen Grotesk) has no colour bar
_OLD_SY_SEGS = '<span class="sy-segs" aria-hidden="true">' + ''.join('<i style="background:%s"></i>' % c for c in ('#DCE8D6', '#F4E7B8', '#D6E4F1', '#F3D8CE', '#E4DDF0', '#E6E3DC')) + '</span>'
AG_IC = '<span class="ag-ic"><svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#121211"/><path d="M27 66A23 23 0 0 1 73 66Z" fill="#fffff8"/></svg></span>'  # 16 Oct Elliot picked L4: filled half sun, paper on ink

# ---------- D. Carousel (alt-ring.html; #c-1 ring, #c-2 scroll turns the ring, #c-3 flat strip) ----------
def icon(p):
    # each card carries its project as a small cover in the project's own brand, not the studio's
    figs = re.findall(r'<figure>(.*?)<figcaption', p['brand'], re.S)
    if p['id'] == 'folio':
        inner = '<img src="img/folio.jpg" alt="" loading="lazy">'
    elif p['id'] == 'out-and-scout':
        inner = '<i class="k-sun"></i><span class="lock">Out &amp; Sc<i class="sd"></i>out</span>'
    elif p['id'] == 'lampwerk':
        inner = '<i class="k-gel"></i><svg class="k-lwm" data-lwm viewBox="40 40 568 880" aria-hidden="true"></svg><svg class="k-lww" data-lww viewBox="0 -1510 9020 1770" aria-hidden="true"></svg>'
    elif p['id'] == 'spoolends':
        bands = re.search(r'<div class="tile se-bands">(.*?)</div>', figs[2], re.S).group(1)
        inner = '<span class="k-bands">%s</span><span class="wm">Spoolends<i></i></span>' % bands
    elif p['id'] == 'aglo':
        inner = '<span class="k2-ag">%s%s</span>' % (AG_IC, AG_WM)
    elif p['id'] == 'systems':
        inner = '<span class="k2-sy">%s%s</span>' % (SY_WM, SY_SEGS)
    elif p['id'] == 'grip':
        crimp = re.search(r'<path fill="none"[^>]*/>', figs[0]).group(0)
        wm = re.search(r'<svg[^>]*gp-wm2.*?</svg>', figs[1], re.S).group(0)
        inner = '<svg class="k-crimp" viewBox="0 0 100 100" aria-hidden="true"><g transform="translate(50 50) scale(.72) translate(-50 -53)">%s</g></svg>%s' % (crimp, wm)
    else:
        inner = figs[0]
    return '<span class="k-ic k-cov k-%s">%s</span>' % (p['id'], inner)
kcards = ''.join('''
      <button type="button" class="k-card" data-i="%d" data-name="%s" data-meta="%s, %s" aria-label="Open %s">
        <span class="k-top"><span class="caps">%s</span><span class="m">0%s</span></span>
        %s
        <span class="k-bot m">%s</span>
      </button>''' % (i, p['name'], p['kind'], p['status'].lower(), html.escape(html.unescape(p['name'])), p['name'], p['k'], icon(p), p['kind'].split(',')[0]) for i, p in enumerate(P))
kcards += '''
      <a class="k-card k-mail" data-i="%d" data-name="Contact" data-meta="hello@eltio.studio" href="mailto:hello@eltio.studio">
        <span class="k-top"><span class="caps">Contact</span><span class="m">0%d</span></span>
        <span class="k-ic k-eye"><span class="eye" aria-hidden="true"></span></span>
        <span class="k-bot m">hello@eltio.studio</span>
      </a>''' % (len(P), len(P) + 1)
ksheets = ''.join('''
  <section class="k-sheet" data-i="%d" role="dialog" aria-modal="true" aria-label="%s" hidden>
    <div class="k-sheet-bar"><span class="caps">%s. %s</span><span class="k-nav"><button type="button" class="k-prev">Prev</button><button type="button" class="k-next">Next</button><button type="button" class="k-close">Close</button></span></div>
    <div class="k-sheet-body">
      <div class="fit"><div class="fit-in">%s</div></div>
      %s
      %s
    </div>
  </section>''' % (i, html.escape(html.unescape(p['name'])), p['k'], p['name'], p['piece'], notes(p), p['brand']) for i, p in enumerate(P))
ring = HEAD.replace('<link rel="stylesheet" href="alt.css">', '<link rel="stylesheet" href="alt.css">\n<link rel="stylesheet" href="ring.css">') + '''<div class="eltio alt alt-ring c-1">
  <header class="a-bar"><span class="caps">Eltio Studio</span><span class="m k-count">(01/0%d)</span><a href="mailto:hello@eltio.studio">hello@eltio.studio</a></header>
  <div class="k-wrap"><div class="k-sticky">
    <div class="k-intro"><p class="k-l1">''' % (len(P) + 1) + lines(intro[0], ' by ', keep_left=False) + '''</p><p class="k-l2">''' + lines(intro[1], '. ', keep_left=True) + '''</p></div>
    <div class="k-stage"><div class="k-rot">''' + kcards + '''
    </div></div>
    <div class="k-cap"><span class="caps k-name"></span><span class="m k-meta"></span><span class="m k-hint"></span></div>
  </div></div>
  <div class="k-shut" aria-hidden="true"><span class="eye k-eye"></span></div><span class="m k-read" aria-hidden="true"></span>
  <footer class="k-foot m"><span>(<a href="https://instagram.com/eltio.studio">Instagram</a>)</span><span>&copy; Eltio Studio (2026)</span></footer>
''' + ksheets + '''
</div>
''' + TAIL.replace('<script src="alt.js"></script>', '<script src="alt.js"></script>\n<script src="ring.js"></script>')
(root / 'alt-ring.html').write_text(ring)

# ---------- cards v2 (8 Oct): black logo on paper at rest, a line wireframe of the product draws in on hover ----------
def _wf(items):
    # items: (svg element without closing, kind[, colour or text]); kinds: w ink line, a accent line, f accent fill (fades in),
    # t small mono text in ink, ta text in the accent (both fade in), x raw svg (animations etc.) shown as is
    out = []
    for n, it in enumerate(items):
        el, kind = it[0], it[1]
        d = n * 0.03
        if kind in ('t', 'ta'):
            out.append('%s class="%s" style="--d:%.2fs">%s</text>' % (el, kind, d, it[2]))
        elif kind == 'x':
            out.append(el)
        else:
            col = ';--acc:%s' % it[2] if len(it) > 2 else ''
            out.append('%s class="%s" pathLength="1" style="--d:%.2fs%s"/>' % (el, kind, d, col))
    return '<svg class="k2-wf" viewBox="0 0 400 500" aria-hidden="true">%s</svg>' % ''.join(out)
def _phone():
    return [('<rect x="112" y="34" width="176" height="432" rx="30"', 'w'), ('<line x1="176" y1="50" x2="224" y2="50"', 'w')]
def _browser(top=70, h=300):
    return [('<rect x="28" y="%d" width="344" height="%d" rx="4"' % (top, h), 'w'), ('<line x1="28" y1="%d" x2="372" y2="%d"' % (top + 20, top + 20), 'w'),
            ('<circle cx="42" cy="%d" r="3"' % (top + 10), 'w'), ('<circle cx="54" cy="%d" r="3"' % (top + 10), 'w'), ('<circle cx="66" cy="%d" r="3"' % (top + 10), 'w')]
def _t(x, y, size=9, anchor='start'):
    return '<text x="%s" y="%s" font-size="%s" text-anchor="%s"' % (x, y, size, anchor)
OS_ARC = 'M116 206 Q210 58 304 206'
WF = {
  # Out & Scout as the app is: the phone on its side, the scene full screen, a framed viewfinder window, the scenes
  # list on the left, lens and exposure on the right, the sun path with the sun moving along it; below, a shot card
  'out-and-scout': _wf([
      ('<rect x="16" y="58" width="368" height="196" rx="24"', 'w'), ('<line x1="30" y1="136" x2="30" y2="176"', 'w'),
      (_t(46, 84, 8), 't', 'Out &amp; Scout'), (_t(354, 84, 8, 'end'), 't', 'Projects'),
      (_t(46, 106, 7), 't', 'SCENES'), (_t(46, 122, 8), 't', '06'), (_t(46, 136, 8), 't', '07'), (_t(46, 150, 8), 'ta', '08'), (_t(46, 172, 8), 't', '+ Scene'),
      ('<rect x="104" y="94" width="210" height="140"', 'w'),
      ('<path d="M104 108 V94 H118 M300 94 H314 V108 M314 220 V234 H300 M118 234 H104 V220"', 'w'),
      ('<line x1="104" y1="206" x2="314" y2="206"', 'w'),
      ('<path d="%s"' % OS_ARC, 'a'),
      ('<circle id="os-sun" r="7"', 'f'),
      ('<animateMotion href="#os-sun" dur="7s" repeatCount="indefinite" path="%s"/>' % OS_ARC, 'x'),
      (_t(354, 116, 8, 'end'), 't', '35mm'), (_t(354, 130, 8, 'end'), 't', 'f/2.8'), (_t(354, 144, 8, 'end'), 't', '1/50'),
      ('<circle cx="344" cy="200" r="13"', 'w'), ('<circle cx="344" cy="200" r="8"', 'w'),
      ('<rect x="16" y="282" width="368" height="178" rx="6"', 'w'),
      (_t(32, 306, 9), 't', '08A'), (_t(32, 330, 13), 'ta', 'Backlit'), (_t(32, 348, 9), 't', 'Best 18:42, golden hour'),
      ('<circle cx="330" cy="326" r="26"', 'w'), ('<line x1="330" y1="326" x2="348" y2="308"', 'w'), ('<circle cx="318" cy="342" r="4"', 'f'),
      ('<rect x="32" y="378" width="336" height="12"', 'w'), ('<rect x="262" y="378" width="56" height="12"', 'f'), ('<line x1="300" y1="372" x2="300" y2="396"', 'w'),
      (_t(32, 414, 8), 't', '06:00'), (_t(200, 414, 8, 'middle'), 't', '12:00'), (_t(368, 414, 8, 'end'), 't', '20:00'),
      (_t(32, 440, 8), 't', 'Camberwell, 100m walk'), (_t(368, 440, 8, 'end'), 't', 'PDF  Link')]),
  # Lampwerk as the app is: the set from above with the heads and their beams, the light level, the load, the lamp list
  'lampwerk': _wf(_phone() + [
      (_t(130, 80, 9), 't', 'Lampwerk'), (_t(270, 80, 8, 'end'), 't', 'Set 1'),
      ('<rect x="128" y="94" width="144" height="150"', 'w')] +
      sum([[('<circle cx="%d" cy="%d" r="7"' % (x, y), 'w'), ('<path d="M%d %d L188 172 M%d %d L212 172"' % (x, y, x, y), 'a')]
           for x, y in ((146, 114), (254, 114), (146, 226), (254, 226))], []) +
      [('<circle cx="200" cy="170" r="9"', 'w'), ('<circle cx="200" cy="170" r="30"', 'a'),
       (_t(130, 282, 22), 't', '1,854'), (_t(212, 282, 10), 't', 'lx'), (_t(130, 298, 8), 't', 'f/4 at ISO 800'),
       ('<rect x="130" y="312" width="140" height="8"', 'w'), ('<rect x="130" y="312" width="88" height="8"', 'f'), (_t(130, 336, 8), 't', 'Load 63%  (13A)'),
       ('<line x1="130" y1="352" x2="270" y2="352"', 'w'), (_t(130, 368, 8), 't', '1  Aputure 600d'), (_t(270, 368, 8, 'end'), 'ta', 'on'),
       ('<line x1="130" y1="376" x2="270" y2="376"', 'w'), (_t(130, 392, 8), 't', '2  Aputure 300x'), (_t(270, 392, 8, 'end'), 'ta', 'on'),
       ('<line x1="130" y1="400" x2="270" y2="400"', 'w'), (_t(130, 416, 8), 't', '3  Tube 4ft'), (_t(270, 416, 8, 'end'), 't', 'off'),
       ('<line x1="130" y1="436" x2="270" y2="436"', 'w'), (_t(200, 452, 8, 'middle'), 't', 'Gaffer sheet')]),
  # Spoolends as the shop is: letterboxed hero with burnt-in timecode and the cue dot, then the packs with their colour bands
  'spoolends': _wf(_browser(40, 420) + [
      (_t(44, 82, 12), 't', 'Spoolends'), (_t(356, 82, 8, 'end'), 't', 'Packs  Free  Cart 0'),
      ('<rect x="44" y="94" width="312" height="132"', 'w'), ('<rect x="44" y="94" width="312" height="16"', 'f', '#0B0B0A'), ('<rect x="44" y="210" width="312" height="16"', 'f', '#0B0B0A'),
      ('<circle cx="342" cy="124" r="4"', 'f', '#0B0B0A'),
      (_t(52, 202, 8), 't', '00:01:12:08'), (_t(348, 202, 8, 'end'), 't', 'Light leaks'),
      ('<line x1="44" y1="236" x2="356" y2="236"', 'w'), ('<line id="se-ph" x1="44" y1="232" x2="44" y2="240"', 'a', '#0B0B0A'),
      ('<animate href="#se-ph" attributeName="x1" values="44;356" dur="6s" repeatCount="indefinite"/><animate href="#se-ph" attributeName="x2" values="44;356" dur="6s" repeatCount="indefinite"/>', 'x')] +
      sum([[('<rect x="%d" y="256" width="96" height="112"' % x, 'w'), ('<rect x="%d" y="352" width="96" height="16"' % x, 'f', c),
            (_t(x, 386, 8), 't', n), (_t(x, 400, 8), 't', pr), (_t(x + 96, 400, 10, 'end'), 't', '+')]
           for x, c, n, pr in ((44, '#D9772F', 'Light leaks', '&#163;12'), (152, '#6F7C80', '35mm grain', '&#163;12'), (260, '#3F5A49', 'Halation', '&#163;12'))], []) +
      [(_t(44, 440, 8), 't', 'Real film texture for your edits.')]),
  # elliot.onl as the site is: name, filter, a film playing in place with its playhead, the list
  'folio': _wf(_browser(44, 412) + [
      (_t(44, 86, 9), 't', 'Elliot Holbrow'), (_t(356, 86, 9, 'end'), 't', 'Work  Contact'),
      (_t(44, 104, 7), 't', 'All 19  Fashion 8  Commercial 4  Music 5  Short 2'),
      ('<rect x="44" y="114" width="312" height="176"', 'w'), ('<path d="M186 184 L186 220 L216 202 Z"', 'w'),
      ('<line x1="44" y1="300" x2="356" y2="300"', 'w'), ('<line id="el-ph" x1="44" y1="300" x2="44" y2="300"', 'a', '#0B0B0A'),
      ('<animate href="#el-ph" attributeName="x2" values="44;356" dur="9s" repeatCount="indefinite"/>', 'x'),
      (_t(44, 314, 7), 't', '01 Pol&#232;ne SS24'), (_t(356, 314, 7, 'end'), 't', '0:58')] +
      sum([[('<line x1="44" y1="%d" x2="356" y2="%d"' % (330 + k * 20, 330 + k * 20), 'w'), (_t(44, 344 + k * 20, 8), 't', '%02d  %s' % (k + 2, n)), (_t(356, 344 + k * 20, 8, 'end'), 't', t)]
           for k, (n, t) in enumerate((('Adidas', '0:55'), ('Papercuts', '3:12'), ('T Magazine', '0:43'), ('Pl&#233;i', '0:54'), ('Helinox', '0:39')))], [])),
  # Aglo as the app is: the time and the weather, the quote, the few apps you chose, the time given back, the sun moving behind
  'aglo': _wf(_phone() + [
      ('<circle id="ag-sun" cx="214" cy="220" r="26"', 'a'),
      ('<animate href="#ag-sun" attributeName="cy" values="270;170;270" dur="10s" repeatCount="indefinite"/>', 'x'),
      (_t(128, 104, 30), 't', '13:27'), (_t(272, 98, 9, 'end'), 't', '16&#176;'),
      (_t(128, 120, 6), 't', 'RISE 07:24   SET 18:07'),
      (_t(128, 146, 8), 't', '&#8220;Nature does not hurry, yet'), (_t(128, 158, 8), 't', 'everything is accomplished.&#8221;'),
      (_t(128, 330, 18), 't', 'Notes'), (_t(128, 354, 18), 't', 'Chrome'), (_t(128, 378, 18), 't', 'WhatsApp'), (_t(128, 402, 18), 't', 'Messages'),
      ('<line x1="128" y1="420" x2="272" y2="420"', 'w'),
      (_t(128, 436, 6), 't', '02:40:00:00'), (_t(272, 436, 6, 'end'), 'ta', 'GIVEN BACK')]),
  # Systems as the app is: the morning brief, four numbers, the things waiting on a person, the tab bar
  'systems': _wf(_phone() + [
      (_t(128, 80, 7), 't', 'Your company'), (_t(272, 80, 7, 'end'), 't', 'Mon 13 Oct'),
      (_t(128, 104, 15), 't', 'Good morning.'),
      ('<rect x="128" y="118" width="68" height="40" rx="5"', 'w'), ('<rect x="204" y="118" width="68" height="40" rx="5"', 'w'),
      ('<rect x="128" y="164" width="68" height="40" rx="5"', 'w'), ('<rect x="204" y="164" width="68" height="40" rx="5"', 'w'),
      (_t(134, 136, 10), 't', '&#163;42,180'), (_t(210, 136, 10), 't', '4.6 mo'), (_t(134, 182, 10), 't', '&#163;11,240'), (_t(210, 182, 10), 'ta', '&#163;38,350'),
      (_t(134, 148, 6), 't', 'In the bank'), (_t(210, 148, 6), 't', 'Runway'), (_t(134, 194, 6), 't', 'Tax set aside'), (_t(210, 194, 6), 't', 'Owed to you')] +
      sum([[('<rect x="128" y="%d" width="144" height="36" rx="5"' % y, 'w'), (_t(134, y + 14, 7), 't', a), (_t(134, y + 26, 6), 't', b), (_t(266, y + 14, 7, 'end'), 't', '&#8250;')]
           for y, a, b in ((222, 'Chase for Agency A', '47 days. Firmer draft in your inbox.'), (264, 'Chase for Label B', '33 days. Polite draft in your inbox.'),
                           (306, '2 receipts missing on J-121', 'Van hire day 2, art department float.'), (348, 'Permit notice due Friday', 'Five working days. The form is filled.'))], []) +
      [('<circle cx="262" cy="232" r="3"', 'f'), ('<line x1="112" y1="420" x2="288" y2="420"', 'w'),
       (_t(140, 440, 6), 'ta', 'Home'), (_t(180, 440, 6), 't', 'Services'), (_t(222, 440, 6), 't', 'For you'), (_t(258, 440, 6), 't', 'Account')]),
  'grip': _wf(_phone() + [('<line x1="%d" y1="70" x2="%d" y2="440"' % (x, x), 'w') for x in (148, 184, 220, 256)] +
      [('<path d="M%d %d l8 -4 l6 6 l-6 6 l-9 -2 Z"' % (x, y), 'w') for x, y in ((150, 110), (232, 96), (196, 168), (246, 210), (158, 250), (236, 318), (170, 360))] +
      [('<circle cx="200" cy="150" r="13"', 'a'), ('<path d="M200 163 L200 250 M200 182 L236 150 L236 104 M200 182 L168 214 L156 252 M200 250 L234 290 L236 318 M200 250 L178 300 L170 356"', 'a')] +
      [('<circle cx="%d" cy="%d" r="4"' % xy, 'f') for xy in ((236, 104), (156, 252), (236, 318), (170, 356), (200, 250))]),
}
FILMS = [('01', 'Pol&egrave;ne SS24', '0:58'), ('02', 'Adidas &lsquo;Return of the 15&rsquo;', '0:55'), ('03', 'Joe James, Papercuts', '3:12'), ('04', 'T Magazine', '0:43'),
         ('05', 'Pl&eacute;i', '0:54'), ('06', 'Helinox &lsquo;Zero&rsquo; S/S26', '0:39'), ('07', 'Playing House', '0:44'), ('08', 'Bladee, Blondie', '3:31'),
         ('09', 'Art of Movement', '2:06'), ('10', 'Oasis x Spotify', '1:11'), ('11', 'Corteiz &lsquo;Lundun&rsquo;', '0:10'), ('12', 'Xiaoqiao, Lethe', '0:25'),
         ('13', 'Adidas &lsquo;Tug of War&rsquo;', '0:47'), ('14', 'CP x Barbour', '0:29'), ('15', 'The North Face', '1:06'), ('16', 'Raf Simons', '0:41'),
         ('17', 'Swank Mami, MC69', '2:33'), ('18', 'Unflirt, Seasong', '3:41'), ('19', 'Rotator', '3:51')]
def card2(p):
    figs = re.findall(r'<figure>(.*?)<figcaption', p['brand'], re.S)
    if p['id'] == 'folio':
        # the films roll up like end credits under his name
        rows = ''.join('<span><i>%s</i>%s<i>%s</i></span>' % f for f in FILMS)
        rest = ('<span class="k2-el"><span class="k2-eln">Elliot Holbrow<br><i>Cinematographer, London</i></span>'
                '<span class="k2-roll"><span class="k2-ell">%s%s</span></span><span class="k2-elf"><i>(19) films</i><i>elliot.onl</i></span></span>' % (rows, rows))
    elif p['id'] == 'out-and-scout':
        rest = '<span class="lock">Out &amp; Sc<i class="sd"></i>out</span>'
    elif p['id'] == 'lampwerk':
        rest = '<span class="k2-lw"><svg class="k2-lwm" data-lwm viewBox="40 40 568 880" aria-hidden="true"></svg></span>'
    elif p['id'] == 'spoolends':
        # outlined from Syne ExtraBold so it is exactly the wordmark at any width (img/logos/spoolends-wordmark.svgfrag)
        rest = (root / 'img/logos/spoolends-wordmark.svgfrag').read_text().strip()
    elif p['id'] == 'grip':
        rest = re.search(r'<svg[^>]*gp-wm2.*?</svg>', figs[1], re.S).group(0)
    elif p['id'] == 'aglo':
        rest = '<span class="k2-ag">%s%s</span>' % (AG_IC, AG_WM)
    elif p['id'] == 'systems':
        rest = '<span class="k2-sy">%s%s</span>' % (SY_WM, SY_SEGS)
    else:
        rest = figs[0]
    sig = re.search(r'--sig:([^";]*)', p['brand']).group(1)
    acc = {'spoolends': '#D9772F', 'folio': '#0B0B0A'}.get(p['id'], sig)
    return '<span class="k2 k2-%s" style="--acc:%s"><span class="k2-rest">%s</span>%s<span class="k2-tag m">(hover)</span></span>' % (p['id'], acc, rest, WF.get(p['id'], ''))

# ---------- E. Parallax (alt-plx.html): a dead simple page that moves like a Webflow build ----------
# #p-1 depth (covers drift at their own speeds), #p-2 zoom (each cover grows to fill the screen),
# #p-3 index (a sticky list of names, covers reveal beside it), #p-4 drift (huge names slide sideways)
# longer copy for each project's sheet, blocked out into a scroll: the idea, how it works, what the studio made
CASE = {
    'out-and-scout': dict(
        idea='Camera, sun app and notes, in one viewfinder.',
        how=['Pick your camera and lens.', 'See where the sun will be.', 'Send the crew a shot list.'],
        made='Identity, app design, build and website.'),
    'grip': dict(
        idea='Your footage, turned into a coach.',
        how=['Prop your phone up and climb.', 'Three notes come back, each on its second.', 'Follow your gyms for new sets.'],
        made='Identity, app design, build and website.'),
    'lampwerk': dict(
        idea='Plan the lighting before you get there.',
        how=['Drop in your lamps.', 'See the light and the amps.', 'Print one gaffer sheet.'],
        made='Identity and app design.'),
    'aglo': dict(
        idea='A quiet home screen.',
        how=['Pick the few apps you need.', 'The rest ask for something first.', 'See the time you got back.'],
        made='Identity, app design and build.'),
    'systems': dict(
        idea='Less admin. Same tools.',
        how=['Say who it&rsquo;s for.', 'Pick what we run.', 'One brief every morning.'],
        made='Service design, app design and build.'),
    'spoolends': dict(
        idea='Film texture, shot on actual film.',
        how=['Grain, leaks, burns, grades.', 'All shot on real film.', 'One pack, or the whole spool.'],
        made='Identity and shop design.'),
    'folio': dict(
        idea='A film site that gets out of the way.',
        how=['Nineteen films, one list.', 'Tap a title and it plays.', 'Filter by kind of work.'],
        made='Website design and build.'),
}

# tighter one-liners for the project list (the full text stays in each project's sheet)
SHORT = {
    'out-and-scout': 'Scout a location on your phone. See where the sun will be, frame the shot, send the crew a shot list.',
    'grip': 'Film a climb. Grip sends back the three things to fix, each pinned to the second it happened, and tells you when your wall resets.',
    'lampwerk': 'Plan the lighting before you get there. Light levels and amps as you go, out as one gaffer sheet.',
    'aglo': 'A quiet home screen for iPhone. One page lit by the real sun, only the apps you chose, and the rest ask for something first.',
    'systems': 'The admin round a shoot, run on the tools you already use. Invoices chased, holds kept, one brief every morning.',
    'spoolends': 'Film texture for your edits, all shot on real stock. Grain, leaks, burns and grades.',
    'folio': 'Elliot&rsquo;s own site. Nineteen films in one list, each plays right where you tap it.',
}
ORDER = ['out-and-scout', 'grip', 'lampwerk', 'aglo', 'systems', 'spoolends', 'folio']
if not SHOW_EL: ORDER = ORDER[:-1]
PP = sorted(P, key=lambda p: ORDER.index(p['id']) if p['id'] in ORDER else 99)
xps = ''.join('''
    <article class="x-p" data-i="%d" style="--i:%d">
      <div class="x-pin">
        <div class="x-txt">
          <p class="x-n m">(0%s)</p>
          <h2 class="x-name caps">%s</h2>
          <p class="x-kind m">%s, %s</p>
          <p class="x-d x-long">%s</p>
          <p class="x-d x-short">%s</p>
          <button type="button" class="x-go" data-i="%d">Open &rarr;</button>
        </div>
        <div class="x-media"><button type="button" class="x-frame" data-i="%d" aria-label="Open %s">%s</button></div>
        <div class="x-run" aria-hidden="true"><span>%s</span><span>%s</span><span>%s</span></div>
      </div>
      <button type="button" class="x-gap m" data-to="%d"><span class="x-gl">Scroll</span> <span>%s</span><i aria-hidden="true"></i></button>
    </article>''' % (i, i, i + 1, p['name'], p['kind'], p['status'].lower(), p['d'], SHORT.get(p['id'], p['d']), i, i, html.escape(html.unescape(p['name'])), card2(p), p['name'], p['name'], p['name'],
                       i + 1, '(0%d) %s' % (i + 2, PP[i + 1]['name']) if i + 1 < len(PP) else 'Say hello') for i, p in enumerate(PP))
xidx = ''.join('<li><button type="button" data-i="%d"><span class="m">0%d</span> %s</button></li>' % (i, i + 1, p['name']) for i, p in enumerate(PP))
def _kcopy(q, sfx):
    c = card2(q)
    for k in ('os-sun', 'se-ph', 'el-ph', 'ag-sun'): c = c.replace('"%s"' % k, '"%s-%s"' % (k, sfx)).replace('#%s"' % k, '#%s-%s"' % (k, sfx))
    return c
# ---------- the identity, shown the way the products are used: a real-feeling app icon, a splash screen,
# the colour on actual controls, the type in a notification ----------
CRIMP = '<g transform="translate(50 50) scale(.72) translate(-50 -53)"><path fill="none" stroke="#4A74FF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="M10 68H90M17 68V54a7 7 0 0 1 14 0V68M35 68V46a7 7 0 0 1 14 0V68M53 68V46a7 7 0 0 1 14 0V68M71 68V54a7 7 0 0 1 14 0V68"/></g>'
IDN = {
    'out-and-scout': dict(app=True, label='Out &amp; Scout', bg='#0B0B0A', acc='#FF5A1F', accn='Sun orange', font='"Geist Mono", ui-monospace, monospace',
        icon='<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#0B0B0A"/><circle cx="64" cy="36" r="9" fill="#FF5A1F"/></svg>',
        note=('Out &amp; Scout', '08A, backlit, sun on the left.', 'Best light at 18:42, golden hour.'),
        cap=('(Icon) the sun on its own, high and off centre', '(Splash) the name, the sun rising inside it', '(Colour) orange only ever means the sun', '(Type) Geist Mono, everything in the app')),
    'grip': dict(app=True, label='Grip', bg='#000', acc='#4A74FF', accn='Mat blue', font='"Host Grotesk", "Hanken Grotesk", system-ui, sans-serif',
        icon='<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#000"/>' + CRIMP + '</svg>',
        note=('Grip', 'Right arm', 'Stay straight through the reach.'),
        cap=('(Icon) the crimp, four fingertips on an edge', '(Splash) the wordmark, kept small', '(Colour) mat blue, the logo and the tracked body', '(Type) Host Grotesk, DM Mono for labels')),
    'lampwerk': dict(app=True, label='Lampwerk', bg='#0E0E0D', acc='#FFC21A', accn='Medium Yellow gel', font='"IBM Plex Sans", system-ui, sans-serif',
        icon='<span class="x-ic-lw"><svg data-lwm viewBox="40 40 568 880"></svg></span>',
        note=('Lampwerk', 'Set 1, 1,854 lx at f/4', 'Load 63%, 13 amps.'),
        cap=('(Icon) the mark, paper on ink', '(Splash) the mark alone', '(Colour) one gel, because it only ever means light', '(Type) IBM Plex Sans and Mono')),
    'aglo': dict(app=True, label='Aglo', bg='#C9D6E4', acc='#E8956A', accn='Today&rsquo;s sky', font='"Instrument Sans", system-ui, sans-serif',
        icon='<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#121211"/><path d="M27 66A23 23 0 0 1 73 66Z" fill="#fffff8"/></svg>',
        note=('Aglo', 'Instagram is behind Aglo.', 'Ten press-ups first.'),
        cap=('(Icon) a flat half sun, paper on ink', '(Splash) the icon and the name, on ink', '(Colour) the sky is the only colour', '(Type) Instrument Sans, Geist Mono for numbers')),
    'systems': dict(app=True, label='Systems', bg='#F3F3F0', acc='#E2412B', accn='Tally red', font='"Familjen Grotesk", "Schibsted Grotesk", system-ui, sans-serif',
        icon='<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/></svg>',
        note=('Systems', 'Chase for Agency A', 'Firmer draft in your inbox.'),
        cap=('', '', '(Colour) one soft colour for each part', '(Type) Inter Tight and Geist Mono')),
    'spoolends': dict(app=False, label='spoolends.com', bg='#000', acc='#D9772F', accn='No colour of its own', font='"Hanken Grotesk", system-ui, sans-serif',
        icon='<span class="x-fav-se">S<i></i></span>', bands=['#D9772F', '#A89676', '#6F7C80', '#B8412F', '#C4B79C', '#3F5A49'],
        note=('Spoolends', 'Added to your cart', 'Light leaks, &pound;12.'),
        cap=('(Favicon) the S and the cue dot', '(Header) the wordmark, black and white', '(Colour) none, each pack brings its own footage', '(Type) Hanken Grotesk, Syne for big lines')),
    'folio': dict(app=False, label='elliot.onl', bg='#fffff8', acc='#0B0B0A', accn='Ink on paper', font='"Geist Mono", ui-monospace, monospace',
        icon='<span class="x-fav-el">e</span>',
        note=('elliot.onl', 'Now playing', 'Pol&egrave;ne SS24, 0:58.'),
        cap=('(Favicon) a lowercase e', '(Header) his name, set as text', '(Colour) none, the films bring it', '(Type) Geist Mono, one size')),
}
def idn(p, i):
    d = IDN.get(p['id'])
    if not d: return p['brand']
    if d['app']:
        t1 = '<div class="x-id-t x-id-home"><span class="x-ic">%s</span></div>' % d['icon']
        t2 = '<div class="x-id-t x-id-phone"><span class="x-ph"><span class="x-ph-isl"></span><span class="x-ph-in">%s</span></span></div>' % _kcopy(p, 'd%d' % i)
        t3 = '<div class="x-id-t x-id-phone x-id-app"><span class="x-ph"><span class="x-ph-isl"></span><span class="x-ph-in x-ph-wf">%s</span></span></div>' % _kcopy(p, 'e%d' % i)
        caps = (d['cap'][0], d['cap'][1], '(Screen) the app, in lines', d['cap'][2])
    else:
        t1 = '<div class="x-id-t x-id-tab"><span class="x-tab"><span class="x-fav">%s</span><span>%s</span><i>&times;</i></span><span class="x-tab-url">%s</span></div>' % (d['icon'], d['label'], d['label'])
        t2 = '<div class="x-id-t x-id-win"><span class="x-win"><span class="x-win-bar"><i></i><i></i><i></i></span><span class="x-win-in">%s</span></span></div>' % _kcopy(p, 'd%d' % i)
        t3 = '<div class="x-id-t x-id-win x-id-app"><span class="x-win"><span class="x-win-bar"><i></i><i></i><i></i></span><span class="x-win-in x-ph-wf">%s</span></span></div>' % _kcopy(p, 'e%d' % i)
        caps = (d['cap'][0], d['cap'][1], '(Page) the site, in lines', d['cap'][2])
    if d.get('bands'):
        t4 = '<div class="x-id-t x-id-ui"><span class="x-chips">%s</span></div>' % ''.join('<i style="background:%s"></i>' % c for c in d['bands'])
    else:
        t4 = ('<div class="x-id-t x-id-ui" style="--a:%s"><span class="x-ui-row"><span class="x-tog"><i></i></span><span class="x-ui-btn">Continue</span></span>'
              '<span class="x-sld"><i></i><b></b></span><span class="x-ui-hex"><i></i>%s %s</span></div>') % (d['acc'], d['accn'], d['acc'].upper())
    figs = ''.join('<figure>%s<figcaption class="m">%s</figcaption></figure>' % (t, c) for t, c in zip((t1, t2, t3, t4), caps))
    return '<div class="x-idn" style="--bgc:%s;--acc:%s">%s</div>' % (d['bg'], d['acc'], figs)
# ---------- Spoolends, rebuilt for the project page: a black shop where the only colour is the footage ----------
_sewm = re.sub(r'<metadata>.*?</metadata>', '', (root / 'img/logos/spoolends-wordmark.svgfrag').read_text().strip(), flags=re.S).replace('class="k2-se"', 'class="x-se-wm"').replace('<circle class="k2-cue"', '<circle class="x-se-cue"')
SE_PACKS = [('Light leaks', '#D9772F', 12), ('35mm grain', '#A89676', 12), ('Gate weave', '#6F7C80', 9), ('Reel end burns', '#B8412F', 14), ('Halation', '#C4B79C', 9), ('Dust &amp; scratches', '#3F5A49', 9)]
SE_PIECE = ('<div class="x-se x-se3"><div class="x-se-top">' + _sewm + '<span class="x-se-nav"><span>Packs</span><span>Free</span><span class="x-se-cart">Cart (<b>0</b>)</span></span></div>'
    '<div class="x-se-hero" style="--pc:#D9772F"><i class="x-se-g2"></i><i class="x-se-leak"></i><i class="x-se-gr"></i>'
    '<span class="x-se-sp x-se-sp1"></span><span class="x-se-sp x-se-sp2"></span>'
    '<span class="x-se-edge">SPOOLENDS 5219 &#9656; 23 &nbsp; &nbsp; 35MM &nbsp; &nbsp; SHOT ON REAL STOCK &nbsp; &nbsp; &#9656; 24</span>'
    '<p class="x-se-h">Real film texture<br>for your edits.</p><span class="x-se-tc">00:01:12:08</span><span class="x-se-dot"></span></div>'
    '<div class="x-se-strip"><div class="x-se-run">' + ''.join('<div class="x-se-pk" style="--pc:%s"><div class="x-se-fr"><i class="x-se-leak"></i><i class="x-se-gr"></i><span class="x-se-n">%02d</span><span class="x-se-pn">%s</span><span class="x-se-pp">&pound;%d</span></div></div>' % (c, j % len(SE_PACKS) + 1, n, pr) for j, (n, c, pr) in enumerate(SE_PACKS * 2)) + '</div></div>'
    '<div class="x-se-foot"><span>The whole spool, every pack</span><span>&pound;99</span></div></div>')
# v4: a plain black shop where the covers do the shouting. Each pack is a strip of 35mm, three frames tall
def _sestrip(j, n, c, pr):
    fr = ''.join('<span class="x-s4-f" style="--d:%d;grid-row:%d"><i class="x-se-leak"></i><i class="x-se-gr"></i></span>' % (k, k + 1) for k in range(3))
    return ('<div class="x-s4-pk" style="--pc:%s"><div class="x-s4-film"><span class="x-s4-sp x-s4-l"></span>%s<span class="x-s4-sp x-s4-r"></span>'
            '<span class="x-s4-ec">SPOOLENDS 52%02d &#9656; %d</span></div><div class="x-s4-pr"><span>%s</span><span>&pound;%d</span></div></div>') % (c, fr, 10 + j * 3, j + 14, n, pr)
SE_PIECE = ('<div class="x-se x-se4"><div class="x-s4-top"><span class="x-se-nav"><span>Packs</span><span>Free</span></span>' + _sewm +
    '<span class="x-se-nav"><span>Info</span><span class="x-se-cart">Cart (<b>0</b>)</span></span></div>'
    '<div class="x-s4-grid">' + ''.join(_sestrip(j, n, c, pr) for j, (n, c, pr) in enumerate(SE_PACKS)) + '</div>'
    '<div class="x-s4-foot"><span>Real film texture for your edits.</span><span>The whole spool, every pack &pound;99</span></div></div>')
PIECE = {'spoolends': SE_PIECE}
# photographs, only where the brand already has them (Out & Scout: the two picked for its website)
PHOTOS = {'out-and-scout': [('blue-hour', 'Out on a recce at blue hour, one of them framing up on a phone', '(On the recce)', '', '42% 50%'),
                            ('hero-glacier', 'Four people crossing a glacier in low sun', '(Every recce, a different light)', '', '50% 55%')]}
def photo(p, k):
    ph = PHOTOS.get(p['id'], [])
    if k >= len(ph): return ''
    f, alt, cap, line, pos = ph[k]
    return ('<figure class="x-blk x-b-img"><span class="x-img"><img src="img/os/%s.jpg" srcset="img/os/%s-s.jpg 1024w, img/os/%s.jpg 2048w" sizes="100vw" alt="%s" loading="lazy" style="object-position:%s">%s</span>'
            '</figure>') % (f, f, f, alt, pos, ('<span class="x-img-line">%s</span>' % line) if line else '')
def nextblk(i, n):
    if i == len(PP) - 1:
        return """<button type="button" class="x-sh-next x-sh-out" data-to="end">
      <span class="x-shn-top m"><span>Back to Eltio Studio</span><span class="x-shn-bar"><i></i></span><span class="x-shn-hint">keep scrolling</span></span>
    </button>"""
    return """<button type="button" class="x-sh-next" data-to="%d">
      <span class="x-shn-top m"><span>Next (0%d)</span><span class="x-shn-bar"><i></i></span><span class="x-shn-hint">keep scrolling</span></span>
      <span class="x-shn-card">%s</span>
      <span class="x-shn-line">%s</span>
    </button>""" % (i + 1, i + 2, _kcopy(n, 'n%d' % i), SHORT.get(n['id'], ''))
# the identity, said in plain words, one item at a time
IDSAY = {
    'out-and-scout': ['The sun, high and off centre.', 'The name, with the sun inside.', 'The app, in lines.', 'Orange only means the sun.'],
    'grip': ['The crimp. Four fingertips on an edge.', 'The wordmark, kept small.', 'The app, in lines.', 'Blue for the body. Nothing else.'],
    'lampwerk': ['The mark, paper on ink.', 'The mark, alone.', 'The app, in lines.', 'One gel. It only means light.'],
    'aglo': ['A flat half sun, paper on ink.', 'The o is the same half sun.', 'The app, in lines.', 'The sky is the only colour.'],
    'systems': ['', '', 'The app, in lines.', 'One soft colour for each part.'],
    'spoolends': ['The S and the cue dot.', 'Black and white.', 'The shop, in lines.', 'The footage brings the colour.'],
    'folio': ['A lowercase e.', 'His name, as text.', 'The site, in lines.', 'The films bring the colour.'],
}
def idsections(p, i):
    d = IDN.get(p['id'])
    if not d: return '<div class="x-blk">%s</div>' % p['brand']
    m = re.findall(r'<figure>(.*?)<figcaption', idn(p, i), re.S)
    return ''.join('<div class="x-blk x-b-id" style="--bgc:%s;--acc:%s"><div class="x-id-one">%s</div></div>' % (d['bg'], d['acc'], el) for el in m)

# Out & Scout: the build spread out, feature by feature, using the locked prototype (live/os/proto.html) and the drawn cards
def _proto(h, label):
    return '<span class="x-dev"><iframe src="live/os/proto.html#%s" title="%s" loading="lazy" tabindex="-1"></iframe></span>' % (h, label)
def _oscard(kind, label):
    return '<div class="bp os x-oscard"><figure class="fig card"><div class="wfs" data-wf="%s" role="img" aria-label="%s"></div></figure></div>' % (kind, label)
FEATURES = {'out-and-scout': [
    ('Your recces.', _proto('s=start', 'Out & Scout start screen')),
    ('The frame you&rsquo;ll get.', _proto('s=cam&r=4:3&mm=35&y=-54&x=80', 'Out & Scout viewfinder')),
    ('The sun, any hour.', _oscard('sun', 'The sun’s path from sunrise to sunset, golden hour marked at each end.')),
    ('A new scene every 100 metres.', _oscard('scenes', 'A walk of 100 metres on a map, then the app asks whether to start a new scene.')),
    ('Every shot, with its light.', _proto('s=list', 'Out & Scout shot list')),
    ('Sent to the crew.', _proto('s=list&sheet=export', 'Out & Scout export')),
]}
def build(p):
    f = FEATURES.get(p['id'])
    if not f:
        return '<div class="x-blk x-b-build"><div class="fit"><div class="fit-in">%s</div></div></div>' % PIECE.get(p['id'], p['piece'])
    return ''.join('<div class="x-blk x-b-feat"><div class="x-feat-m">%s</div></div>' % m for t, m in f)

def _len(t): return len(html.unescape(re.sub('<[^>]+>', '', t)))
def xsheet(i, p):
    n = PP[(i + 1) % len(PP)]
    c = CASE.get(p['id'], dict(idea='', how=[], made=''))
    how = ''.join('<div class="x-blk x-b-line x-b-step"><span class="x-stn m">(0%d)</span><p class="x-big x-one" style="--ch:%d">%s</p></div>' % (j + 1, _len(t), t) for j, t in enumerate(c['how']))
    return """
  <section class="x-sheet" data-i="%d" role="dialog" aria-modal="true" aria-label="%s" hidden>
    <div class="x-sheet-bar"><span class="caps">%d. %s</span><span class="x-nav"><button type="button" class="x-prev">Prev</button><button type="button" class="x-next">Next</button><button type="button" class="x-close">Close</button></span></div>
    <div class="x-sh-head"><p class="m">(0%d)</p><p class="m x-sh-kind">%s, %s</p></div>
    <div class="x-blk x-b-logo"><span class="x-bcard">%s</span></div>
    %s
    <div class="x-blk x-b-line x-b-idea"><p class="x-big x-one" style="--ch:%d">%s</p></div>
    <div class="x-blk x-b-wf"><span class="x-bcard x-bwf">%s</span></div>
    %s
    %s
    %s
    %s
    <div class="x-blk x-b-made"><p class="x-big x-one" style="--ch:%d">%s</p></div>
%s
    <button type="button" class="x-sh-x m" aria-label="Close project">Close</button>
  </section>""" % (i, html.escape(html.unescape(p['name'])), i + 1, p['name'], i + 1, p['kind'], p['status'].lower(),
                   _kcopy(p, 'l%d' % i), photo(p, 0), _len(c['idea']), c['idea'], _kcopy(p, 'w%d' % i), how, photo(p, 1), build(p), idsections(p, i),
                   _len(c['made']), c['made'], nextblk(i, n))
xsheets = ''.join(xsheet(i, p) for i, p in enumerate(PP))
plx = HEAD.replace('<link rel="stylesheet" href="alt.css">', '<link rel="stylesheet" href="alt.css">\n<link rel="stylesheet" href="ring.css">\n<link rel="stylesheet" href="plx.css">') + '''<div class="eltio alt alt-plx p-1">
  <header class="a-bar"><span class="caps">Eltio Studio</span><span class="m x-pct">(000)</span><a href="mailto:hello@eltio.studio">hello@eltio.studio</a></header>
  <section class="x-hero">
    <p class="x-l1">''' + lines(intro[0], ' by ', keep_left=False) + '''</p>
    <p class="x-l2">''' + lines(intro[1], '. ', keep_left=True) + '''</p>
    <div class="x-cue m"><span>(5) projects, ''' + ', '.join(re.sub('<[^>]+>', '', p['name']) for p in PP) + '''</span><button type="button" class="x-down">Scroll <i aria-hidden="true"></i></button></div>
    <div class="x-ink" aria-hidden="true"><svg width="100%" height="100%"><defs><filter id="x-goo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="12"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11"/></filter></defs><g filter="url(#x-goo)"><circle r="0" fill="#fff"/><circle r="0" fill="#fff"/><circle r="0" fill="#fff"/><circle r="0" fill="#fff"/><circle r="0" fill="#fff"/><circle r="0" fill="#fff"/><circle r="0" fill="#fff"/><circle r="0" fill="#fff"/><circle r="0" fill="#fff"/></g></svg></div>
  </section>
  <nav class="x-idx" aria-label="Projects"><ol>''' + xidx + '''</ol></nav>
  <div class="x-list">''' + xps + '''
  </div>
  <button type="button" class="x-nx m" aria-hidden="true" tabindex="-1"><span class="x-nxl">Next</span> <span class="x-nxt"></span> <i aria-hidden="true"></i></button>
  <section class="x-own">
    <p class="x-own-l m"><span>(04)</span> <span>Yours</span></p>
    <p class="x-own-t"><span class="x-own-1">You own everything.</span> <span class="x-own-2">The code lives in your own GitHub from day one. Your domain, your content, your accounts.</span></p>
  </section>
  <section class="x-end">
    <p class="x-n m">(05)</p>
    <a class="x-start m" href="https://eltio.studio/before-we-talk" target="_top">Start a project <i aria-hidden="true">&rarr;</i></a>
    <p class="x-ask">Got something in mind? Just give us a shout.</p>
    <a class="x-mail" href="mailto:hello@eltio.studio">hello@eltio.studio</a>
    <p class="x-foot m"><span>(<a href="https://instagram.com/eltio.studio">Instagram</a>)</span><span>&copy; Eltio Studio (2026)</span></p>
  </section>
''' + xsheets + '''
</div>
''' + TAIL.replace('<script src="alt.js"></script>', '<script src="alt.js"></script>\n<script src="plx.js"></script>\n<script src="motion.js"></script>')
(root / 'alt-plx.html').write_text(plx)

# ---------- live: D. Carousel, the ring (Iris t-b o-2 pk was live before 7 Oct 21:00) ----------
BASE = "https://elh0.github.io/eltio-studio/"
DESC = "Eltio Studio makes websites and apps. Designed and built in-house, start to finish. London."
live = ring
meta = ('<meta name="description" content="%s">\n<meta property="og:title" content="Eltio Studio">\n'
        '<meta property="og:description" content="%s">\n<meta property="og:image" content="%sshare.png">\n'
        '<meta name="twitter:card" content="summary_large_image">\n') % (DESC, DESC, BASE)
(root / 'index.html').write_text(live.replace('<link rel="icon"', meta + '<link rel="icon"'))
inner = live[live.index('<div class="eltio'):live.index('<script src="site.js">')]
inner = inner.replace('src="img/', 'src="%simg/' % BASE).replace('src="live/', 'src="%slive/' % BASE)
(root / 'cargo').mkdir(exist_ok=True)
(root / 'cargo/page.html').write_text(
    '<link rel="stylesheet" href="%ssite.css">\n<link rel="stylesheet" href="%salt.css">\n<link rel="stylesheet" href="%sring.css">\n' % (BASE, BASE, BASE) + inner
    + '<script src="%ssite.js"></script>\n<script src="%swf.js"></script>\n<script src="%salt.js"></script>\n<script src="%sring.js"></script>\n' % (BASE, BASE, BASE, BASE))
print('alts built')

# ---------- one project, rendered on its own in the homepage's language (one-os.html, layouts A-F via #a..#f) ----------
# two text styles only (11px grey label, 15px line); the same rows are laid out six ways by op.css
def op_page(p, i):
    idfigs = re.findall(r'<figure>(.*?)<figcaption', idn(p, i + 50), re.S)
    nx = PP[(i + 1) % len(PP)]
    c = CASE[p['id']]
    rows = []
    # one piece per screen, no big text: the index along the foot names each one (15:35)
    def row(media, part, cls=''):
        rows.append((('(%s)' % part, part), '<section class="op-row op-solo %s" style="--mc:1 / -1;--tc:1 / -1"><div class="op-m" data-s="0">%s</div><div class="op-t"><p class="op-l">(%s)</p></div></section>' % (cls, media, part)))
    frame = lambda q: '<span class="x-frame">%s</span>' % card2(q)
    portrait = lambda h, label: _proto(h, label).replace('class="x-dev"', 'class="x-dev x-dev-p"', 1)
    row(frame(p), 'Cover', 'op-head')
    row(_proto('s=start', 'Library'), 'Library', 'op-dev')
    row(_proto('s=cam&r=4:3&mm=35&y=-54&x=80', 'Viewfinder'), 'Viewfinder', 'op-dev')
    row(portrait('s=cam&o=p', 'Portrait viewfinder'), 'Portrait', 'op-dev op-tall')
    row(_proto('s=cam&sheet=kit', 'Your kit'), 'Kit', 'op-dev')
    row(_oscard('sun', 'The sun path'), 'Sun path', 'op-card')
    row(_oscard('scenes', 'A new scene every 100 metres'), 'Scenes', 'op-card')
    row(_proto('s=list', 'Shot list'), 'Shot list', 'op-dev')
    row(_proto('s=list&sheet=export', 'Export'), 'Export', 'op-dev')
    for k, (f, nm) in enumerate(zip(idfigs, ('Icon', 'Splash', 'Screen', 'Buttons'))):
        row('<div class="op-id op-id%d x-blk"><div class="x-id-one">%s</div></div>' % (k + 1, f), nm, 'op-ids1 op-idk%d' % (k + 1))
    tot = len(rows) + 1
    nm = html.unescape(re.sub('<[^>]+>', '', p['name']))
    PARTS = [t[1] for t, _ in rows]
    def extras(k, t):
        lab = t[0] if t else ''
        return ('<div class="op-meta"><span>%s</span><span>%s</span><span>%s</span><span>%02d / %02d</span></div>'
                '<span class="op-cn">%02d</span><span class="op-ct">%02d</span>'
                '<span class="op-mast">Out &amp; Sc<i></i>out</span>'
                '<p class="op-foot">%s, %s, %s. %s Eltio Studio (2026).</p>') % (p['name'], lab, p['kind'].split(',')[0], k + 1, tot, k + 1, tot, p['name'], p['kind'].lower(), p['status'].lower(), c['made']) + (
                '<div class="op-tab"><span>No.</span><span>Project</span><span>Part</span><span>Kind</span><span>Year</span><span>Studio</span>'
                '<span>%02d / %02d</span><span>%s</span><span>%s</span><span>%s</span><span>2026</span><span>Eltio Studio</span></div>') % (k + 1, tot, p['name'], PARTS[k] if k < len(PARTS) else '', p['kind'].split(',')[0])
    def fix(k, t, r):
        r = r.replace('<section class="op-row', '<section data-n="%02d / %02d" class="op-row' % (k + 1, tot), 1)
        if t and t[1]:
            line = re.sub(r'<span class="op-g">.*?</span>', '', t[1])
            r = r.replace('<p class="op-d">', '<p class="op-d" style="--ch:%d">' % len(html.unescape(re.sub('<[^>]+>', '', line))), 1)
        if k == 0:
            r = r.replace('<p class="op-l">', '<p class="op-big" style="--ch:%d">%s</p><p class="op-l">' % (len(nm), p['name']), 1)
        return r[:-len('</section>')] + extras(k, t) + '</section>'
    body = ''.join(fix(k, t, r) for k, (t, r) in enumerate(rows))
    ix = ''.join('<li data-r="%d"><span class="op-l">%s</span><span class="op-d">%s</span></li>' % (k, t[0], re.sub(r'<span class="op-g">.*?</span>', '', t[1])) for k, (t, _) in enumerate(rows) if t)
    nxt = ('<section data-n="%02d / %02d" class="op-row op-next" style="--mc:6 / span 4;--tc:2 / span 3"><div class="op-gap m"><span class="x-gl">Scroll</span> <span>(0%d) %s</span><i></i></div>'
           '<div class="op-m" data-s="0">%s</div><div class="op-t"><p class="op-l">(0%d)</p><p class="op-d">%s</p></div></section>') % (tot, tot, i + 2, nx['name'], frame(nx), i + 2, SHORT[nx['id']])
    sw = ''.join('<a href="#%s">%s</a>' % (x, x.upper()) for x in 'ab')
    sw += '<button type="button" class="op-th" aria-label="Grey or white"><i></i></button>'
    return HEAD.replace('<link rel="stylesheet" href="alt.css">', '<link rel="stylesheet" href="alt.css">\n<link rel="stylesheet" href="ring.css">\n<link rel="stylesheet" href="plx.css">\n<link rel="stylesheet" href="op.css">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Inter+Tight:wght@300..700&family=UnifrakturMaguntia&display=swap">') + (
        '<div class="eltio alt alt-plx p-1 s-6 op cb lay-d t-f f-a dt-a v-a">\n  <header class="a-bar"><span class="caps">%s</span><span class="op-tl" aria-hidden="true"><i></i></span><span class="m op-n">(0%d)</span><a href="#" class="op-x">Close</a></header>\n'
        '  <ol class="op-ix">%s</ol>\n  <div class="op-wrap"><div class="op-stick"><div class="op-track">%s</div></div></div>\n%s\n  <nav class="op-sw m" aria-label="Layouts">%s</nav>\n</div>\n'
        % (p['name'], i + 1, ix, body, nxt, sw)) + TAIL.replace('<script src="alt.js"></script>', '<script src="alt.js"></script>\n<script src="op.js"></script>')
(root / 'one-os.html').write_text(op_page(PP[0], 0).replace('<title>Eltio Studio</title>', '<title>Out &amp; Scout page</title>', 1))

# pages of the projects built in the locked design so far; the rest come one by one
NEXT_HREF = {'out-and-scout': 'one-os.html', 'grip': 'one-grip.html', 'lampwerk': 'one-lampwerk.html'}

# ---- 15:45 Cargo grid project page (after Elliot's Cargo template recording): fixed corner frame, one centred column,
# same-size tiles with corner marks, a two-column caption under each, small Diatype throughout ----
# a live panel from one of the project's own pages, shown alone (solo.js) at its own drawing size and scaled to the tile
def _emb(d, f, h, w, ht, label):
    return '<span class="cg-emb" data-w="%d" data-h="%d" style="--ar:%d / %d"><iframe src="live/%s/%s.html%s" title="%s" loading="lazy" tabindex="-1" style="width:%dpx;height:%dpx"></iframe></span>' % (w, ht, w, ht, d, f, ('#' + h) if h else '', label, w, ht)

# 16 Oct Elliot: each app's own website as a loop, desktop recording on desktop, the phone-layout recording on phones (cg.js swaps)
def _wv(f, label, ar='16 / 10', mar='390 / 844'):
    return ('<span class="cg-emb cg-wv" style="--ar:%s" data-mar="%s"><video class="cg-m" muted loop playsinline autoplay preload="metadata" poster="video/w/%s-d.jpg" data-m="video/w/%s-m" aria-label="%s">'
            '<source src="video/w/%s-d.mp4" type="video/mp4"><source src="video/w/%s-d.webm" type="video/webm"></video></span>') % (ar, mar, f, f, label, f, f)
# real app screens in plain phones, side by side
def _phs(files, label, cls=''):
    src = lambda f: 'img/%s.webp' % (f if '/' in f else 'ag/' + f)
    return '<span class="cg-phs %s" style="--n:%d" role="img" aria-label="%s">%s</span>' % (cls, len(files), label, ''.join('<span class="cg-ph"><img src="%s" alt="" loading="lazy" decoding="async"></span>' % src(f) for f in files))
# 16:11 Elliot: show it's on a phone. Out & Scout is a landscape app, so its screens sit in sideways phones, c across by r down
def _phl(files, label, c, r):
    return '<span class="cg-phs cg-side" style="--c:%d;--r:%d" role="img" aria-label="%s">%s</span>' % (c, r, label, ''.join('<span class="cg-ph cg-phl"><img src="img/os/%s.webp" alt="" loading="lazy" decoding="async"></span>' % f for f in files))

# a phone recording in one phone frame, same on desktop and phones
def _phv(f, label):
    return ('<span class="cg-phs" style="--n:1" role="img" aria-label="%s"><span class="cg-ph"><video muted loop playsinline autoplay preload="metadata" poster="video/w/%s-m.jpg">'
            '<source src="video/w/%s-m.mp4" type="video/mp4"><source src="video/w/%s-m.webm" type="video/webm"></video></span></span>') % (label, f, f, f)


# 19 Oct Elliot: no hover wireframes on the covers. Each cover is the locked wordmark at the size it has on the last
# tile, and one soft thing moves (round 1 with bouncing letters, traced strokes and gradients was too much). His picks
# 16:34: Out & Scout the sun rises slowly; Grip the fingertip crimps on loop; Lampwerk flickers on like a lamp; Aglo keeps
# its sky as the background with a small sun rising behind the word; Systems starts as one word and breaks into Sy ste ms.
def _svg_paths(f):
    return re.findall(r'<path[^>]*>', (root / f).read_text())
def cover(p):
    k = p['id']
    if k == 'out-and-scout':
        return '<span class="cv cv-os"><span class="lock">Out &amp; Sc<i class="sd"></i>out</span></span>'
    if k == 'grip':
        figs = re.findall(r'<figure>(.*?)<figcaption', p['brand'], re.S)
        svg = re.search(r'<svg[^>]*gp-wm2.*?</svg>', figs[1], re.S).group(0)
        glyph, tip = re.findall(r'<path[^>]*>', svg)
        return '<span class="cv cv-gr"><svg viewBox="32 -787 1660 1019" aria-hidden="true">%s%s</svg></span>' % (glyph.replace('<path ', '<path class="g" ', 1), tip.replace('<path ', '<path class="tip" ', 1))
    if k == 'lampwerk':
        ps = ''.join(_svg_paths('live/lw/lampwerk-wordmark-ink.svg'))
        return '<span class="cv cv-lw"><svg viewBox="0 -1510 9020 1770" aria-hidden="true"><g class="w" transform="scale(1 -1)">%s</g></svg></span>' % ps
    if k == 'aglo':
        return '<span class="cv cv-ag"><span class="ag-sky"><i class="sun"></i></span>%s</span>' % AG_WM
    if k == 'systems':
        d = re.search(r' d="([^"]+)"', _svg_paths('live/sy/systems-wordmark.svg')[0]).group(1)
        subs = [x for x in re.split(r'(?=M)', d) if x.strip()]
        xmin = lambda sp: min(float(v) for v in re.findall(r'[MLQCHT]\s*(-?\d+\.?\d*)', sp))
        subs.sort(key=xmin)
        groups = [''.join(subs[:2]), ''.join(subs[2:6]), ''.join(subs[6:])]   # Sy / ste (the e has a hole) / ms
        ps = ''.join('<path class="s s%d" d="%s"/>' % (i, g) for i, g in enumerate(groups))
        return '<span class="cv cv-sy"><svg viewBox="40 -795 5318 995" aria-hidden="true">%s</svg></span>' % ps
    return None

# 17:21 Elliot: every project in the same order, Out & Scout's: the cover, the product itself, then the same five identity
# tiles (icon, splash or header, the drawing, buttons, colour). Short plain lines, no brand-book panels.
CG_COLOUR = {
    'out-and-scout': ('#0B0B0A', [('Sun orange', '#FF5A1F', '#0B0B0A'), ('Ink', '#0B0B0A', '#F3F3F0'), ('Paper', '#F3F3F0', '#0B0B0A')], 'Orange only ever means the sun.'),
    'grip': ('#0D0E0D', [('Mat blue', '#4A74FF', '#000'), ('Black', '#000', '#F3F3F0'), ('White', '#F3F3F0', '#000')], 'Blue is the body.'),
    'lampwerk': ('#151514', [('Medium Yellow', '#FFC21A', '#0E0E0D'), ('Console', '#0E0E0D', '#EDEDEA'), ('Text', '#EDEDEA', '#0E0E0D')], 'One gel. It only means light.'),
    'aglo': ('#C9D6E4', [('Sky', '#9BB7D9', '#121211'), ('Ink', '#121211', '#F7F5F0'), ('Paper', '#F7F5F0', '#121211')], 'The sky is the only colour.'),
    'systems': ('#F3F3F0', [('Money', '#DCE8D6', '#4F7348'), ('Work', '#F4E7B8', '#85691A'), ('Services', '#D6E4F1', '#3C6286')], 'One soft colour for each part.'),
    'spoolends': ('#111110', [('Ink', '#000000', '#F6F4EF'), ('White', '#F6F4EF', '#000'), ('Paper', '#EFECE6', '#000')], 'None of its own. The footage brings it.'),
    'folio': ('#EDEDE6', [('Ink', '#0B0B0A', '#fffff8'), ('Paper', '#fffff8', '#0B0B0A'), ('Grey', '#8A8A83', '#0B0B0A')], 'Ink on paper. The films bring the colour.'),
}
def _colour(p):
    bg, sw, line = CG_COLOUR[p['id']]
    cells = ''.join('<div style="background:%s;color:%s">%s<span>%s</span></div>' % (c, t, n, c.upper()) for n, c, t in sw)
    return '<div class="cg-sw" style="--bgc:%s"><div class="cg-sws">%s</div></div>' % (bg, cells), line
IDLINES = {
    'out-and-scout': ['The sun, high and off centre.', 'The name, with the sun inside.', 'The app, drawn in line.', 'One colour, sun orange.'],
    'grip': ['The crimp, four fingertips on an edge.', 'The wordmark, kept small.', 'The app, drawn in line.', 'Blue for anything you press.'],
    'lampwerk': ['The mark, white on ink.', 'The mark, alone.', 'The app, drawn in line.', 'Gel for anything that&rsquo;s on.'],
    'aglo': ['A flat half sun. Paper on ink.', 'The o is the same half sun.', 'The app, drawn in line.', 'The sky is the only colour.'],
    'systems': ['', '', 'The app, drawn in line.', 'One soft colour for each part.'],
    'spoolends': ['The S and the cue dot.', 'The wordmark, black and white.', 'The shop, drawn in line.', 'Each pack brings its own colour.'],
    'folio': ['A lowercase e.', 'His name, set as text.', 'The site, drawn in line.', 'Ink on paper.'],
}
def ink_wm(p):
    if p['id'] == 'lampwerk': return '<img class="cg-lw-wm" src="live/lw/lampwerk-wordmark-white.svg" alt="Lampwerk">'
    if p['id'] == 'aglo': return '<span class="cg-ag-cov">%s</span>' % AG_WM
    if p['id'] == 'systems': return '<span class="cg-sy-cov">%s</span>' % SY_WM
    return '<span class="x-frame">%s</span>' % card2(p)
def cg_items(p, i):
    idfigs = re.findall(r'<figure>(.*?)<figcaption', idn(p, i + 50), re.S)
    d = IDN[p['id']]
    frame = lambda q: '<span class="x-frame">%s</span>' % card2(q)
    portrait = lambda h, label: _proto(h, label).replace('class="x-dev"', 'class="x-dev x-dev-p"', 1)
    ids = ['<div class="op-id x-blk" style="--bgc:%s;--acc:%s"><div class="x-id-one">%s</div></div>' % (d['bg'], d['acc'], f) for f in idfigs]
    web = not d['app']
    L = IDLINES[p['id']]
    # 17:39 Elliot: just the good stuff. No colour codes, no buttons: the icon, the splash and the drawing
    # 16:12 Elliot: end like Aglo, the icon and then the wordmark on black. No splash, no drawing
    identity = [
        (ids[0], 'cg-id cg-id1', 'Icon', L[0]),
        (ink_wm(p), 'cg-logo cg-ink', 'Wordmark', 'On black.'),
    ]
    if p['id'] == 'folio':
        identity = [(ids[1], 'cg-id cg-id2', 'Header', L[1])]
    if p['id'] == 'systems':
        identity = identity[1:]   # Eltio's own service: no icon of its own
    if p['id'] == 'grip':
        # 19 Oct Elliot: bring Grip up to date with the build and g-r-i-p.com v8. Climbing only (BJJ parked), real screens,
        # same shape as the others: cover, the site, groups of phones, a few features from the site
        gr = lambda fs: ['gr/' + f for f in fs]
        product = [
            (cover(p), 'cg-logo cg-cvt', p['name'], 'Film a climb. Get three notes.'),
            (_wv('gr-site', 'g-r-i-p.com'), 'cg-card cg-web', 'Website', 'g-r-i-p.com, one phone, six steps.'),
            (_phs(gr(['film', 'review', 'notes']), 'Film a climb, the review, three notes'), 'cg-card cg-phs3', 'Three notes', 'Prop it up and climb. Three notes come back, each on the second it happened.'),
            (_wv('gr-eye', 'Backup for you and your coach'), 'cg-card cg-web', 'Backup', 'Nobody catches everything live. Grip keeps the tape and measures it.'),
            (_phs(gr(['sets', 'gyms', 'climbs']), 'New sets, your gyms, your climbs'), 'cg-card cg-phs3', 'New sets', 'Follow your gyms. Know when a wall resets.'),
            (_phs(gr(['gym', 'first', 'post']), 'A gym, an empty gym, posting a set'), 'cg-card cg-phs3', 'Post a set', 'Every gym in London. Be the first to post a set.'),
            (_wv('gr-film', 'Prop it. Press record.'), 'cg-card cg-web', 'Prop it', 'Lean it on your bag at 0.5&times;. Grip checks the angle before you film.'),
            (_wv('gr-train', 'Your training plan'), 'cg-card cg-web', 'Train', 'Your notes turn into a day&rsquo;s plan.'),
            (_wv('gr-coach', 'For coaches'), 'cg-card cg-web', 'Coaches', 'Your climbers film between sessions. You review from anywhere.'),
        ]
    elif p['id'] == 'lampwerk':
        # 16 Oct 16:47 Elliot: the app as lampwerk.com shows it, which matches the build. Its AR phone, frame by frame
        lw = lambda fs: ['lw/' + f for f in fs]
        product = [
            (cover(p), 'cg-logo cg-cvt', p['name'], 'Lighting plots for iPhone.'),
            (_wv('lw-site', 'lampwerk.com'), 'cg-card cg-web', 'Website', 'lampwerk.com, the plot first, then the AR.'),
            (_phv('lw-ar', 'Tag the set in AR'), 'cg-card', 'AR', 'Tag the set in AR.'),
            (_phs(lw(['s-camera', 's-head', 's-three']), 'Talent and camera, a head, three lamps'), 'cg-card cg-phs3', 'Tag the set', 'Talent, camera, then every head.'),
            (_phs(lw(['s-plan', 's-lamp', 's-send']), 'The plan, a lamp, Send'), 'cg-card cg-phs3', 'The plot', 'The tags become the plan. Send it on.'),
            (_wv('lw-sheet', 'The gaffer sheet'), 'cg-card cg-web', 'Gaffer sheet', 'One page for the spark.'),
        ]
    elif p['id'] == 'aglo':
        # 16 Oct Elliot: Aglo onto the site. 14:40 the real app screens (from the app build) and a-glo.com replace the early prototype
        # screens; the prototype stays only for search and the press-ups, which the screens don't show
        emb = lambda f, h, w, ht, label: _emb('ag', f, h, w, ht, label)
        find = '[data-go=search]|%23sq~Insta'
        product = [
            (cover(p), 'cg-logo cg-cvt', p['name'], 'A quiet home screen for iPhone.'),
            (_wv('ag-site', 'a-glo.com'), 'cg-card cg-web', 'Website', 'a-glo.com, one phone, a whole day.'),
            (_phs(['home-fullStack-day', 'home-fullStack-dusk', 'home-fullStack-night'], 'The home screen at day, dusk and night'), 'cg-card cg-phs3', 'Day to night', 'The sky over your city, right now.'),
            (_phs(['home-fullStack-day', 'home-thumbStack-day', 'home-timeAtFoot-day', 'home-appsCorner-day', 'home-smallsApps-day', 'home-appsOnly-day'], 'Six home screen layouts', 'cg-six'), 'cg-card cg-phs6', 'Six layouts', 'Pick one. The sky lines up across every widget.'),
            (emb('app', 'q=%23scr&click=' + find, 390, 844, 'Search'), 'cg-card cg-app', 'Search', 'The rest are still there if you type them.'),
            (emb('app', 'q=%23scr&click=' + find + '|[data-app=%229%22]', 390, 844, 'Behind Aglo'), 'cg-card cg-app', 'Behind Aglo', 'Some apps ask for something first.'),
            (emb('app', 'q=%23scr&click=' + find + '|[data-app=%229%22]|[data-unlock]|.cam|.cam|.cam', 390, 844, 'Press-ups'), 'cg-card cg-app', 'Press-ups', 'Ten before Instagram opens. Nothing is recorded.'),
            (_phs(['breathe-inhale', 'breathe-hold', 'breathe-dusk'], 'Three slow breaths'), 'cg-card cg-phs3', 'Breathe', 'Or three slow breaths. The sky rises with you.'),
        ]
    elif p['id'] == 'systems':
        # 16 Oct 16:11 Elliot: single phones in single cards looked silly. Screens in threes, like Aglo
        sy = lambda fs: ['sy/' + f for f in fs]
        product = [
            (cover(p), 'cg-logo cg-cvt', p['name'], 'A back office for production companies.'),
            (_phs(sy(['welcome', 'who', 'hurts']), 'Set up: welcome, who it is for, a layout'), 'cg-card cg-phs3', 'Set up', 'Just you, or a company of fifty.'),
            (_phs(sy(['home', 'waiting', 'jobs']), 'Every morning: the brief, what needs a person, the jobs'), 'cg-card cg-phs3', 'Every morning', 'What&rsquo;s owed, what&rsquo;s due, what needs a person.'),
            (_phs(sy(['onset', 'services', 'files']), 'On set, services, files'), 'cg-card cg-phs3', 'On set', 'Hours and overtime, live from the floor.'),
            (_phs(sy(['setup', 'account', 'rules']), 'Connections'), 'cg-card cg-phs3', 'Connections', 'On the tools you already use. Nothing sends without a person.'),
        ]
    elif p['id'] == 'spoolends':
        # footage pictures are Happy Editing placeholders, so the copies hide every picture and show the shop's own frames
        emb = lambda f, h, w, ht, label: _emb('se', f, h, w, ht, label)
        product = [
            (frame(p), 'cg-logo', p['name'], 'Real film texture for your edits.'),
            (emb('site', 'q=.hero', 1440, 843, 'Shop'), 'cg-card', 'Shop', 'A letterboxed frame, burnt-in timecode.'),
            ('<div class="fit"><div class="fit-in">%s</div></div>' % SE_PIECE, 'cg-card cg-se', 'Packs', 'The covers do the shouting.'),
            (emb('site', 'q=%23free', 1440, 624, 'Free'), 'cg-card', 'Free', 'A short end of grain, for your email.'),
            (emb('brand', 'q=.motion', 1056, 337, 'Motion'), 'cg-card', 'Motion', 'The cue flashes twice, like a projector.'),
        ]
    elif p['id'] == 'folio':
        # 17:57 Elliot's pick: Polene SS24, Lethe, CP x Barbour, Rotator, Helinox, Papercuts, each playing in the site's window.
        # Clips are cut from his phone recording (first 45s only); the others wait on clips from him and show a still meanwhile.
        def win(media, title, who, t):
            return ('<div class="x-id-t x-id-win cg-elw"><span class="x-win"><span class="x-win-bar"><i></i><i></i><i></i><b>elliot.onl</b></span>'
                    '<span class="x-win-in"><span class="el-top"><span>Elliot Holbrow</span><span>Work &nbsp; Contact</span></span>%s'
                    '<span class="el-bar"><i></i></span><span class="el-cap"><span>%s</span><span>%s</span><span>%s</span></span></span></span></div>') % (media, title, who, t)
        vid = lambda f, label: '<video poster="video/el/%s.jpg" muted loop playsinline autoplay aria-label="%s"><source src="video/el/%s.webm" type="video/webm"><source src="video/el/%s.mp4" type="video/mp4"></video>' % (f, label, f, f)
        still = lambda f, label: '<img src="img/el/%s" alt="%s" loading="lazy">' % (f, label)
        product = [
            (frame(p), 'cg-logo', p['name'], 'Elliot&rsquo;s own site.'),
            (win(vid('polene', 'Pol\u00e8ne SS24 playing'), 'Pol&egrave;ne SS24', 'Fashion', '0:58'), 'cg-card cg-elt', 'Pol&egrave;ne', 'Tap a title and it plays.'),
            (win(vid('lethe', 'Xiaoqiao, Lethe playing'), 'Xiaoqiao &ndash; Lethe', 'Erika Kamano', '0:25'), 'cg-card cg-elt', 'Lethe', 'Full width, nothing in the way.'),
            (win(vid('barbour', 'CP x Barbour playing'), 'CP x Barbour', 'Fashion', '1:00'), 'cg-card cg-elt', 'CP x Barbour', 'The film is the page.'),
            (win(vid('rotator', 'Rotator playing'), 'Rotator', 'Short', '3:51'), 'cg-card cg-elt', 'Rotator', 'Plays right where you tap.'),
            (win(vid('helinox', 'Helinox Zero playing'), 'Helinox &lsquo;Zero&rsquo; S/S26', 'Tom Silvester', '0:39'), 'cg-card cg-elt', 'Helinox', 'Title, who and how long.'),
            (win(vid('papercuts', 'Joe James, Papercuts playing'), 'Joe James &ndash; Papercuts', 'Music', '3:12'), 'cg-card cg-elt', 'Papercuts', 'Then back to the list.'),
        ]
    else:
        # 16 Oct 16:47 Elliot: the app screens as drawn on outandscout.com, which match the build
        product = [
            (cover(p), 'cg-logo cg-cvt', p['name'], 'An iPhone app for location scouts.'),
            (_wv('os-site', 'outandscout.com'), 'cg-card cg-web', 'Website', 'outandscout.com, out before first light.'),
            (_phl(['s-start', 's-cam', 's-portrait', 's-list'], 'Projects, the viewfinder, its menu, the shot list', 2, 2), 'cg-card', 'The app', 'Projects, camera, shots.'),
            (_wv('os-sun', 'The sun path'), 'cg-card cg-web', 'Sun path', 'Move the sun through the day.'),
            (_wv('os-light', 'Backlit'), 'cg-card cg-web', 'Backlit', 'Know when it&rsquo;ll be backlit.'),
            (_wv('os-pdf', 'The PDF'), 'cg-card cg-web', 'The PDF', 'The shot list, page by page.'),
        ]
    return product + identity

# 16 Oct Elliot: each app's domain on its project. Only link a domain once its site loads (True); the rest show as plain text
SITE = {'out-and-scout': ('outandscout.com', True), 'grip': ('g-r-i-p.com', False), 'lampwerk': ('lampwerk.com', True), 'aglo': ('a-glo.com', True)}
def site_row(p):
    if p['id'] not in SITE: return ''
    d, up = SITE[p['id']]
    v = '<a href="https://%s" target="_blank" rel="noopener">%s &nearr;</a>' % (d, d) if up else d
    return '<b>Site</b><span>%s</span>' % v
def cg_page(p, i):
    items = cg_items(p, i)
    nx = PP[(i + 1) % len(PP)]
    c = CASE[p['id']]
    frame = lambda q: '<span class="x-frame">%s</span>' % card2(q)
    n = len(items)
    N = n + 1  # the info block counts as the last numbered stop, so the counter never sits still on it
    body = ''.join(
        '<section class="cg-item" data-t="%s"><div class="cg-tile %s"><i class="cg-pl"></i><div class="cg-in">%s</div></div>'
        '<div class="cg-cap"><p>%s<br>%02d / %02d</p><p><b>%s</b><span>%s</span></p></div></section>' % (t, cls, m, p['name'], k + 1, N, t, d)
        for k, (m, cls, t, d) in enumerate(items))
    info = ('<section class="cg-item cg-info" data-t="Info"><div class="cg-cap"><p>%s<br>%s<br>%s</p>'
            '<p><b>Made</b><span>%s</span><b>Year</b><span>2026</span><b>Studio</b><span>Eltio Studio</span>%s</p></div></section>') % (p['name'], p['kind'], p['status'], c['made'], site_row(p))
    # 16:55 Elliot: no dark mode, all white. Email moves to the top centre; bottom left goes back a project (or to all projects on the first)
    sw = '<a class="cg-top" href="mailto:hello@eltio.studio">Email</a>'
    pv = PP[i - 1] if i > 0 else None
    back = ('<a class="cg-bl cg-prev" href="%s">(0%d) %s &uarr;</a>' % (NEXT_HREF.get(pv['id'], '#'), i, pv['name'])) if pv else '<a class="cg-bl cg-prev" href="#">All projects</a>'
    nxi = cg_items(nx, i + 1)
    # the end of one project leads straight into the next; the last one hands back to the landing page and its email
    nxt = ('<section class="cg-item cg-next" data-t="%s"><a class="cg-tile cg-logo cg-nextlink" href="%s"><i class="cg-pl"></i><div class="cg-in">%s</div></a>'
           '<div class="cg-cap"><p>%s<br>01 / %02d</p><p><b>%s</b><span>%s</span></p></div></section>') % (
        nx['name'], NEXT_HREF.get(nx['id'], '#'), frame(nx), nx['name'], len(nxi) + 1, nx['name'], nxi[0][3])
    head = HEAD.replace('<link rel="stylesheet" href="alt.css">', '<link rel="stylesheet" href="alt.css">\n<link rel="stylesheet" href="ring.css">\n<link rel="stylesheet" href="plx.css">\n<link rel="stylesheet" href="cg.css">\n<link rel="stylesheet" href="cv.css">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400..600&display=swap">')
    return head + (
        '<div class="eltio alt alt-plx p-1 s-6 cg v-snap">\n'
        '  <nav class="cg-fr" aria-label="Site"><a class="cg-tl" href="#">Eltio Studio</a><a class="cg-tr" href="#">Close</a>'
        '<a class="cg-ml cg-go" href="#"><span class="cg-g">Scroll</span><span class="cg-nx">(02) Library</span><i></i></a>'
        '<span class="cg-mr cg-ticks">%s</span>'
        '%s<span class="cg-bm" aria-live="polite"><span class="cg-n"><span class="cg-roll">%s</span></span> / %02d</span><a class="cg-br" href="#">(0%d) %s &darr;</a></nav>\n'
        '  <main class="cg-col" id="top">%s%s%s</main>\n  %s\n</div>\n') % (''.join('<a href="#" data-k="%d" aria-label="%s"></a>' % (k, it[2]) for k, it in enumerate(items + [(0, 0, 'Info', 0)])), back, ''.join('<i>%02d</i>' % (k + 1) for k in range(N)), N, i + 2, nx['name'], body, info, nxt, sw) + TAIL.replace('<script src="alt.js"></script>', '<script src="alt.js"></script>\n<script src="cg.js"></script>\n<script src="motion.js"></script>')
(root / 'one-os-op.html').write_text(op_page(PP[0], 0).replace('<title>Eltio Studio</title>', '<title>Out &amp; Scout page (screens)</title>', 1))
(root / 'one-os.html').write_text(cg_page(PP[0], 0).replace('<title>Eltio Studio</title>', '<title>Out &amp; Scout page</title>', 1))
(root / 'one-grip.html').write_text(cg_page(PP[1], 1).replace('<title>Eltio Studio</title>', '<title>Grip page</title>', 1))
(root / 'one-lampwerk.html').write_text(cg_page(PP[2], 2).replace('<title>Eltio Studio</title>', '<title>Lampwerk page</title>', 1))

# ---- 17:15 Elliot: every project on ONE page, so going from one project into the next is just another tile (no page load, no jump).
# The frame follows whichever project you're in: its own counter and ticks, the one before bottom left, the one after bottom right.
CG_BUILT = ['out-and-scout', 'grip', 'lampwerk', 'aglo', 'systems', 'folio']  # Spoolends dropped 17:39 (needs too much work)
def cg_all():
    projs = [(i, p) for i, p in enumerate(PP) if p['id'] in CG_BUILT]
    secs, ticks, counts, names = [], [], [], []
    for j, (i, p) in enumerate(projs):
        items = cg_items(p, i); c = CASE[p['id']]; N = len(items) + 1
        body = ''.join(
            '<section class="cg-item" data-t="%s"><div class="cg-tile %s"><i class="cg-pl"></i><div class="cg-in">%s</div></div>'
            '<div class="cg-cap"><p>%s<br>%02d / %02d</p><p><b>%s</b><span>%s</span></p></div></section>' % (t, cls, m, p['name'], k + 1, N, t, d)
            for k, (m, cls, t, d) in enumerate(items))
        info = ('<section class="cg-item cg-info" data-t="Info"><div class="cg-cap"><p>%s<br>%s<br>%s</p>'
                '<p><b>Made</b><span>%s</span><b>Year</b><span>2026</span><b>Studio</b><span>Eltio Studio</span>%s</p></div></section>') % (p['name'], p['kind'], p['status'], c['made'], site_row(p))
        secs.append('<div class="cg-proj" data-p="%d">%s%s</div>' % (j, body, info))
        ticks.append('<span class="cg-mr cg-ticks" data-p="%d">%s</span>' % (j, ''.join('<a href="#" data-k="%d" aria-label="%s"></a>' % (k, it[2]) for k, it in enumerate(items + [(0, 0, 'Info', 0)]))))
        counts.append('<span class="cg-bm" data-p="%d" aria-live="polite"><span class="cg-n"><span class="cg-roll">%s</span></span> / %02d</span>' % (j, ''.join('<i>%02d</i>' % (k + 1) for k in range(N)), N))
        names.append(html.unescape(re.sub('<[^>]+>', '', p['name'])))
    # 17:39: past the last project the page scrolls out into the landing page itself (loaded behind, then swapped in)
    # 20:22 Elliot: the projects should end, not roll on into the landing page
    end = '<section class="cg-end"><p>That&rsquo;s all five.</p><a class="cg-end-back" href="landing.html">Back to Eltio Studio</a></section>'
    lib = ''.join('<a href="#" data-p="%d"><span>(%02d)</span> %s</a>' % (j, j + 1, html.escape(nm)) for j, nm in enumerate(names))
    head = HEAD.replace('<link rel="stylesheet" href="alt.css">', '<link rel="stylesheet" href="alt.css">\n<link rel="stylesheet" href="ring.css">\n<link rel="stylesheet" href="plx.css">\n<link rel="stylesheet" href="cg.css">\n<link rel="stylesheet" href="cv.css">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400..600&display=swap">')
    return head + (
        '<div class="eltio alt alt-plx p-1 s-6 cg cg-all" data-names="%s">\n'
        '  <nav class="cg-fr" aria-label="Site"><a class="cg-tl" href="landing.html">Eltio Studio</a><a class="cg-tr" href="landing.html">Close</a>'
        '<span class="cg-ml cg-lib mo-skip" aria-label="Projects">%s</span>%s'
        '<a class="cg-bl cg-prev" href="landing.html">All projects</a>%s<a class="cg-br" href="#"></a></nav>\n'
        '  <main class="cg-col" id="top">%s%s</main>\n  <a class="cg-top" href="mailto:hello@eltio.studio">Email</a>\n</div>\n') % (
        html.escape('|'.join(names)), lib, ''.join(ticks), ''.join(counts), ''.join(secs), end) + TAIL.replace('<script src="alt.js"></script>', '<script src="alt.js"></script>\n<script src="cg.js"></script>\n<script src="motion.js"></script>')
(root / 'one-os.html').write_text(cg_all().replace('<title>Eltio Studio</title>', '<title>Projects</title>', 1))
# the landing page the project pages scroll back out into: the Parallax A list, with land.js sending each project to its place on one-os.html
_lp = (root / 'alt-plx.html').read_text()
assert '<script src="plx.js"></script>' in _lp
# 19 Oct 16:50: each phone on the landing opens on its app's own wordmark motion (cv.css), and opening a project plays it big
_lp = _lp.replace('<link rel="stylesheet" href="plx.css">', '<link rel="stylesheet" href="plx.css">\n<link rel="stylesheet" href="cv.css">', 1)
_lp = re.sub(r'(<button type="button" class="x-frame" data-i="(\d)"[^>]*>)', lambda m: m.group(1) + ('<span class="cv-tpl" hidden>%s</span>' % cover(PP[int(m.group(2))]) if cover(PP[int(m.group(2))]) else ''), _lp)
(root / 'landing.html').write_text(_lp.replace('<script src="plx.js"></script>', '<script src="land.js"></script>\n<script src="plx.js"></script>\n<script src="mi.js"></script>\n<script src="lv.js"></script>', 1).replace('<title>Eltio Studio</title>', '<title>Eltio Studio</title>', 1))

# 18:45 the artifact viewer keeps old scripts/styles cached, so the two whole-site pages ask for this build's copies
import re as _re, time as _time
_v = str(int(_time.time()))
for _f in ('one-os.html', 'landing.html'):
    _p = root / _f
    _p.write_text(_re.sub(r'((?:src|href)="(?!https?:|#|mailto:)[^"?#]+\.(?:js|css))"', r'\1?v=' + _v + '"', _p.read_text()))
