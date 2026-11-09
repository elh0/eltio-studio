#!/usr/bin/env python3
"""Builds the Helical Sound site for Cargo from the approved round 2 page.

Source: preview/leo-marcus/directions/r2/split/index.html (red on white, film centred)
Output, served from GitHub Pages and loaded by Cargo's site custom HTML:
  helical.css      every style from the round 2 page, plus the Cargo wrapper
  helical-app.js   the round 2 scripts, reading films from Cargo instead of a fixed list
  helical-body.html the page markup the loader drops into Cargo
Run: python3 leo-marcus/site/build.py
"""
import json, os, re, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DIR = os.path.join(ROOT, 'preview/leo-marcus/directions')
src = open(os.path.join(DIR, 'r2/split/index.html')).read()

def rep(s, a, b):
    assert s.count(a) == 1, a
    return s.replace(a, b)

# styles, in page order
styles = re.findall(r'<style>(.*?)</style>', src, re.S)
work_js = open(os.path.join(DIR, 'r2/work.js')).read()
work_css = re.search(r"'beforeend', '<style>(.*?)</style>'", work_js).group(1)
css = ['/* built by leo-marcus/site/build.py from the round 2 page; edit the source, not this file */',
       open(os.path.join(DIR, 'shared.css')).read()] + styles + [work_css, open(os.path.join(HERE, 'cargo.css')).read()]
open(os.path.join(HERE, 'helical.css'), 'w').write('\n'.join(css))

# markup: everything between <body> and the first script
body = re.search(r'<body[^>]*>(.*?)<script src=', src, re.S).group(1).strip()
open(os.path.join(HERE, 'helical-body.html'), 'w').write(body + '\n')

# scripts: shared + work bits + player + swap + the page's own scripts
shared = open(os.path.join(DIR, 'shared.js')).read()
shared = re.sub(r'var WORK = \[.*?\];\n', '', shared, flags=re.S)
inline = re.findall(r'<script>(.*?)</script>', src, re.S)
# the page's link script: film links become Cargo page addresses
li = [i for i, t in enumerate(inline) if 'function slug(x) {' in t][0]
last = inline[li]
last = rep(last, "function slug(x) {", "function slug(x) { if (x.purl) return x.purl;")
last = rep(last, "function setHash(x) { try { history.replaceState(null, '', location.pathname + location.search + (x ? '#' + slug(x) : '')); } catch (e) {} }",
  "function setHash(x) { try { if (HS.cargo) history.replaceState(history.state, '', '/' + (x ? slug(x) : '')); else history.replaceState(null, '', location.pathname + location.search + (x ? '#' + slug(x) : '')); } catch (e) {} }")
last = rep(last, "var h = decodeURIComponent(location.hash.slice(1)); if (!h) return;",
  "var h = decodeURIComponent(location.hash.slice(1) || (HS.cargo ? location.pathname.replace(/^\\/+|\\/+$/g, '') : '')); if (!h) return;")
inline[li] = last
# always centred, as Leo picked
inline = [s.replace("var AL = (location.search.match(/al=(\\w)/) || [])[1] || 'l';", "var AL = 'c';") for s in inline]
assert any("var AL = 'c';" in s for s in inline)
parts = ['/* built by leo-marcus/site/build.py from the round 2 page; edit the source, not this file */',
         shared, open(os.path.join(HERE, 'cargo-data.js')).read(),
         open(os.path.join(DIR, 'r2/vimeo.js')).read(), open(os.path.join(DIR, 'r2/swap.js')).read()] + inline
open(os.path.join(HERE, 'helical-app.js'), 'w').write('\n;\n'.join(parts))

# test fixtures: the round 2 films shaped like Cargo's API answers
films = json.loads(subprocess.check_output(['node', '-e', "var document={documentElement:{setAttribute(){},classList:{add(){}}},head:{insertAdjacentHTML(){}},querySelectorAll(){return[]},addEventListener(){}};var localStorage={getItem(){},setItem(){}};var location={search:\"\"};" + open(os.path.join(DIR, 'shared.js')).read() + open(os.path.join(DIR, 'r2/work.js')).read() + ";console.log(JSON.stringify(WORK))"]))
names = {'comp': 'Composition', 'sd': 'Sound design', 'mix': 'Mix'}
def purl(x): 
    import unicodedata
    s = unicodedata.normalize('NFD', x['c'] + ' ' + x['p']); s = ''.join(ch for ch in s if not unicodedata.combining(ch)).lower().replace('&', ' ')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
pages = []
for i, x in enumerate(films):
    lines = [x['p'], 'https://vimeo.com/' + x['v']]
    if x.get('dir'): lines.append('Director: ' + x['dir'])
    if x.get('ag'): lines.append('Creative direction: ' + x['ag'])
    pages.append({'id': 'P%d' % i, 'set_id': 'S1', 'title': x['c'], 'purl': purl(x), 'page_type': 'page', 'display': True, 'sort': i,
                  'content': '<br>'.join(lines), 'tags': [{'tag': names[t]} for t in x['t']],
                  'thumbnail': {'hash': 'x', 'name': 'x.jpg', 'is_placeholder': True}})
fx = {'scaffolding': [{'id': 'S1', 'title': 'Work', 'purl': 'work', 'page_type': 'set'}, {'id': 'P99', 'title': 'Info', 'purl': 'info', 'page_type': 'page'}],
      'pages': pages,
      'info': {'id': 'P99', 'title': 'Info', 'purl': 'info', 'page_type': 'page', 'content': 'A London-based music and sound studio creating bespoke music and sound design for fashion and advertising.<br><br>Contact: Leo Marcus<br>Email: hello@helical-sound.com<br>Instagram: https://instagram.com/helicalsound'}}
open(os.path.join(HERE, 'test/fixtures.js'), 'w').write('var HS_FIXTURES = ' + json.dumps(fx, ensure_ascii=False) + ';\n')
print('built', len(films), 'test films')
