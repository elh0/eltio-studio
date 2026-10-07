// Wireframes for the work: hairline drawings that draw themselves in, then run on their own.
// elliot.onl is a working copy of the site (filter, list or grid, films open in place).
// Out & Scout is drawn from the app: the viewfinder, the sun path and scene detection.
// Each one plays a short demo until someone touches it, then it is theirs.
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ACC = '#FF5A1F';

  // ---------- elliot.onl ----------
  var FILMS = [
    ['01', 'Pol\u00e8ne SS24', 'Guillaume Lebel', 'Digital, LF, 35mm Print', 'Fashion', '0:58'],
    ['02', 'Adidas \u2018Return of the 15\u2019', 'Hannan Hussain', 'S35, Digital', 'Commercial', '0:55'],
    ['03', 'Joe James \u2013 Papercuts', 'Uncanny', 'S35, Digital', 'Music', '3:12'],
    ['04', 'T Magazine', 'Jess Madavo', 'Standard 16', 'Fashion', '0:43'],
    ['05', 'Pl\u00e9i', 'Guillaume Lebel', 'LF, Digital, 35mm Print', 'Fashion', '0:54'],
    ['06', 'Helinox \u2018Zero\u2019 S/S26', 'Tom Silvester', 'S35, Digital', 'Fashion', '0:39'],
    ['07', 'Playing House', 'Lydia Garnett', 'Standard 16 to 16:9', 'Fashion', '0:44'],
    ['08', 'Bladee \u2013 Blondie', 'Joe Ward', 'Anamorphic, S35, Digital', 'Music', '3:31'],
    ['09', 'Art of Movement', 'Tayler Prince-Fraser', 'S35, LF, Digital', 'Short', '2:06'],
    ['10', 'Oasis x Spotify', 'Uncanny', 'Standard 16, S16', 'Commercial', '1:11'],
    ['11', 'Corteiz \u2018Lundun\u2019', 'Uncanny', 'Standard 16', 'Commercial', '0:10'],
    ['12', 'Xiaoqiao \u2013 Lethe', 'Erika Kamano', 'S35, Digital', 'Music', '0:25'],
    ['13', 'Adidas \u2018Tug of War\u2019', 'Dominic Chew', 'S35, Digital', 'Commercial', '0:47'],
    ['14', 'CP x Barbour', 'Theo Cottle', 'S16', 'Fashion', '0:29'],
    ['15', 'The North Face', 'Tayler Prince-Fraser', 'Standard 16', 'Fashion', '1:06'],
    ['16', 'Raf Simons', 'Elliot Holbrow', 'S35, Digital', 'Fashion', '0:41'],
    ['17', 'Swank Mami \u2013 MC69', 'Claryn Chong', 'S35, Digital', 'Music', '2:33'],
    ['18', 'Unflirt \u2013 Seasong', 'Claryn Chong', 'DV, Beta, Digital', 'Music', '3:41'],
    ['19', 'Rotator', 'Uncanny', 'Digital, Standard 16', 'Short', '3:51']
  ];
  var TYPES = ['All', 'Fashion', 'Commercial', 'Music', 'Short'];
  function count(t) { return t === 'All' ? FILMS.length : FILMS.filter(function (f) { return f[4] === t; }).length; }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  var X = '<svg class="x" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x=".5" y=".5" width="99" height="99"/><line x1="0" y1="0" x2="100" y2="100"/><line x1="100" y1="0" x2="0" y2="100"/></svg>';

  function El(root) {
    var st = { f: 'All', v: 'list', open: null, t0: 0 };
    root.innerHTML =
      '<div class="wf-guides" aria-hidden="true"></div>' +
      '<div class="wf-in">' +
        '<div class="wf-top"><span>Elliot Holbrow</span><span class="wf-q wf-sub">Cinematographer, London</span><span class="wf-nav"><span class="u">Work</span> <span class="wf-q">Contact</span></span></div>' +
        '<div class="wf-bar"><span class="wf-f">' + TYPES.map(function (t) {
          return '<button type="button" data-f="' + t + '">' + t + '<sup>' + count(t) + '</sup></button>';
        }).join('') + '<i class="tag">(1)</i></span>' +
        '<span class="wf-v"><button type="button" data-v="list">List</button><button type="button" data-v="grid">Grid</button><i class="tag">(2)</i></span></div>' +
        '<div class="wf-list"></div>' +
        '<div class="wf-foot wf-q"><span>Represented by <span class="ink">Polly Hartley, UTA</span></span><span>\u00a9 2026 Elliot Holbrow</span></div>' +
      '</div>' +
      '<span class="wf-cur" aria-hidden="true"></span>';
    var inner = root.querySelector('.wf-in'), list = root.querySelector('.wf-list'), cur = root.querySelector('.wf-cur');

    function rowHTML(f, i) {
      var c = function (txt, cls, lead) { return '<span class="c ' + cls + '"><span>' + esc(txt) + '</span>' + (lead ? '<span class="ld"></span>' : '') + '</span>'; };
      return '<button type="button" class="wf-row' + (st.open === f[0] ? ' sel' : '') + '" data-k="' + f[0] + '" style="--i:' + i + '">' +
        c(f[0], 'no') + c(f[1], 'ti', 1) + c(f[2], 'di', 1) + c(f[3], 'fo', 1) + c(f[4], 'ty', 1) + c(f[5], 'tm') + '</button>' +
        (st.open === f[0] ? player(f) : '');
    }
    function player(f) {
      return '<div class="wf-pl"><div class="fr">' + X + '<span class="play"></span><i class="tag">(3)</i></div>' +
        '<div class="ct"><span class="tc">0:00</span><span class="pr"><i></i></span><span class="ic"><b></b><b></b><b></b></span></div>' +
        '<div class="wf-q">Director: <span class="ink">' + esc(f[2]) + '</span><br>Format: <span class="ink">' + esc(f[3]) + '</span></div></div>';
    }
    function render() {
      var fs = FILMS.filter(function (f) { return st.f === 'All' || f[4] === st.f; });
      root.querySelectorAll('[data-f]').forEach(function (b) { b.classList.toggle('on', b.dataset.f === st.f); });
      root.querySelectorAll('[data-v]').forEach(function (b) { b.classList.toggle('on', b.dataset.v === st.v); });
      if (st.v === 'list') {
        list.className = 'wf-list';
        list.innerHTML = '<div class="wf-head wf-q"><span class="c no">No.</span><span class="c ti">Title</span><span class="c di">Director</span><span class="c fo">Format</span><span class="c ty">Type</span><span class="c tm">Time</span></div>' +
          fs.map(rowHTML).join('');
      } else {
        list.className = 'wf-list wf-grid';
        list.innerHTML = fs.map(function (f, i) {
          return '<button type="button" class="wf-card" data-k="' + f[0] + '" style="--i:' + i + '"><span class="fr">' + X + '</span><span class="wf-q">' + f[0] + '&nbsp;&nbsp;<span class="ink">' + esc(f[1]) + '</span></span></button>';
        }).join('');
      }
      if (root.classList.contains('drawn')) bloom();
      st.t0 = performance.now();
    }
    function bloom() {
      var els = list.querySelectorAll('.wf-row, .wf-card, .wf-head, .wf-pl');
      requestAnimationFrame(function () { requestAnimationFrame(function () { els.forEach(function (e) { e.classList.add('in'); }); }); });
    }
    function scrollTo(el, top) {
      var y = el ? el.offsetTop - inner.clientHeight * (top ? .08 : .35) : 0;
      inner.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
    }
    var act = {
      f: function (t) { st.f = t; st.open = null; render(); scrollTo(null); },
      v: function (v) { st.v = v; st.open = null; render(); scrollTo(null); },
      k: function (k) {
        if (st.v === 'grid') { st.v = 'list'; }
        st.open = st.open === k ? null : k; render();
        var r = list.querySelector('.wf-row[data-k="' + k + '"]');
        if (st.open) scrollTo(r, true);
      }
    };
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !root.contains(b)) return;
      if (b.dataset.f) act.f(b.dataset.f); else if (b.dataset.v) act.v(b.dataset.v); else if (b.dataset.k) act.k(b.dataset.k);
    });

    // the player's clock runs while a film is open
    this.tick = function () {
      var tc = list.querySelector('.wf-pl .tc'); if (!tc) return;
      var f = FILMS.filter(function (x) { return x[0] === st.open; })[0];
      var p = f[5].split(':'), len = +p[0] * 60 + +p[1], s = Math.min(len, Math.floor((performance.now() - st.t0) / 1000));
      tc.textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
    };

    // demo: a cursor works the page until a real hand arrives
    var steps = [
      [1400, '[data-f="Fashion"]'], [1500, '[data-k="05"]'], [4200, '[data-k="05"]'],
      [1300, '[data-v="grid"]'], [2600, '[data-v="list"]'], [1300, '[data-f="Music"]'],
      [1500, '[data-k="08"]'], [4200, '[data-k="08"]'], [1300, '[data-f="All"]'], [2600, null]
    ];
    if (root.dataset.wf === 'phone') steps = [[1800, '[data-f="Fashion"]'], [1500, '[data-k="05"]'], [4800, '[data-k="05"]'], [1300, '[data-f="All"]'], [1500, '[data-k="10"]'], [4800, '[data-k="10"]'], [2000, null]];
    var si = 0, timer = null, live = false, stopped = reduce;
    function pos(el) {
      var R = root.getBoundingClientRect(), s = R.width / root.offsetWidth || 1, r = el.getBoundingClientRect();
      var tx = el.matches('.wf-row') ? Math.min(r.width * .22, 140) : r.width / 2;
      return [(r.left - R.left + tx) / s, (r.top - R.top + r.height / 2) / s];
    }
    function step() {
      if (stopped || !live) return;
      var s = steps[si % steps.length]; si++;
      timer = setTimeout(function () {
        if (stopped || !live) return;
        var el = s[1] && root.querySelector(s[1]);
        if (!el) { step(); return; }
        var p = pos(el);
        cur.style.transform = 'translate(' + p[0] + 'px,' + p[1] + 'px)'; cur.classList.add('on');
        timer = setTimeout(function () {
          if (stopped || !live) return;
          cur.classList.add('dn');
          setTimeout(function () { cur.classList.remove('dn'); }, 180);
          var t = root.querySelector(s[1]); if (t) t.click();
          step();
        }, 650);
      }, s[0]);
    }
    root.addEventListener('pointerdown', function (e) {
      if (!e.isTrusted || stopped) return;
      stopped = true; clearTimeout(timer); cur.classList.remove('on');
    });
    this.setLive = function (v) {
      if (v === live) return; live = v; clearTimeout(timer);
      if (v) step(); else cur.classList.remove('on');
    };
    this.draw = function () { root.classList.add('drawn'); bloom(); };
    render();
  }

  // ---------- Out & Scout ----------
  function svg(w, h, body) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' + body + '</svg>'; }
  var n = 0;
  function d(tag, a, cls) { // a drawable shape: draws in along its length
    return '<' + tag + ' class="d ' + (cls || '') + '" pathLength="1" style="--i:' + (n++) + '" ' + a + '/>';
  }
  function tx(x, y, s, cls, anchor) {
    return '<text class="t ' + (cls || '') + '" x="' + x + '" y="' + y + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + ' style="--i:' + (n++) + '">' + s + '</text>';
  }
  function hhmm(h) { var m = Math.round(h * 60); return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); }

  function Hero(root) {
    n = 0;
    var b = '';
    // status row
    b += tx(24, 31, 'night shift /', 'q') + tx(118, 31, 'brick lane \u2304');
    b += d('rect', 'x="214" y="14" width="74" height="26" rx="13"') + tx(251, 31, '+ scene', '', 'middle');
    for (var i = 0; i <= 16; i++) b += d('line', 'x1="' + (342 + i * 10) + '" y1="16" x2="' + (342 + i * 10) + '" y2="' + (i % 4 ? 20 : 24) + '"', 'q');
    b += '<line class="acc-s" x1="422" y1="12" x2="422" y2="26"/>' + tx(422, 42, '252\u00b0 w \u00b13\u00b0 true n', 'q', 'middle');
    b += d('rect', 'x="552" y="13" width="150" height="28" rx="14"') + '<text class="t" x="566" y="31" style="--i:' + (n++) + '">16:40 \u2192 <tspan class="acc">19:32</tspan> <tspan class="q">+2h52</tspan></text>';
    b += d('rect', 'x="710" y="13" width="118" height="28" rx="14"') + tx(769, 31, 'alexa 35 \u00b7 k35', '', 'middle');
    // viewfinder and a scene drawn in line
    b += d('rect', 'x="82" y="56" width="632" height="265"');
    b += d('line', 'x1="292.7" y1="56" x2="292.7" y2="321"', 'f') + d('line', 'x1="503.3" y1="56" x2="503.3" y2="321"', 'f');
    b += d('line', 'x1="82" y1="144.3" x2="714" y2="144.3"', 'f') + d('line', 'x1="82" y1="232.7" x2="714" y2="232.7"', 'f');
    b += d('path', 'd="M82 220 H714"', 'q');
    b += d('path', 'd="M112 220 V98 H360 V220 M140 220 V126 H200 V220 M236 126 H332 M236 160 H332 M236 194 H332"', 'q');
    b += d('path', 'd="M480 220 V64 H590 V220 M534 64 V220 M600 220 V40"', 'q');
    b += d('path', 'd="M82 300 L250 260 H560 L714 300"', 'q');
    b += '<rect class="flash" x="82" y="56" width="632" height="265"/>';
    b += tx(92, 312, '2.39 \u00b7 35mm', 'q');
    b += '<g class="sun"><circle class="ring" r="13"/><circle class="dot" r="5"/></g>';
    b += '<g class="lab"><rect class="bgf acc-s" x="0" y="-13" width="152" height="20" rx="4"/><text class="acc" x="8" y="1">sun 63\u00b0 right \u00b7 el 4\u00b0</text></g>';
    // left tools
    [['sun path', 122], ['grid', 182], ['level', 242]].forEach(function (t, k) {
      b += d('circle', 'cx="36" cy="' + t[1] + '" r="20"', k ? '' : 'fill-on') + tx(36, t[1] + 34, t[0], 'q', 'middle');
    });
    b += d('path', 'd="M27 127 A9 9 0 0 1 45 127 M36 112 V108 M26 117 L23 114 M46 117 L49 114"', 'inv');
    b += d('path', 'd="M31 174 V190 M41 174 V190 M28 179 H44 M28 185 H44"') + d('path', 'd="M24 242 H48"') + d('circle', 'cx="36" cy="242" r="3"');
    // lens and shutter
    b += d('path', 'd="M770 74 L776 68 L782 74"') + tx(776, 96, '55', 'q', 'middle') + '<text class="t lens big" x="776" y="118" text-anchor="middle" style="--i:' + (n++) + '">35</text>' + tx(776, 132, 'mm', 'q', 'middle') + tx(776, 150, '24', 'q', 'middle');
    b += d('path', 'd="M770 162 L776 168 L782 162"');
    b += d('circle', 'cx="776" cy="222" r="30"') + '<circle class="shut" cx="776" cy="222" r="24"/>';
    b += '<text class="t nxt" x="776" y="270" text-anchor="middle" style="--i:' + (n++) + '">next 6A</text>';
    b += d('rect', 'x="758" y="290" width="30" height="22" rx="4"') + d('rect', 'x="763" y="285" width="30" height="22" rx="4"', 'bgf');
    b += '<circle class="bgf ink-s" cx="792" cy="309" r="9"/><text class="cnt" x="792" y="313" text-anchor="middle">5</text>';
    // bottom: aspect, time, slider
    b += '<rect class="ink-f" x="72" y="345" width="44" height="28" rx="14"/><text class="paper" x="94" y="363" text-anchor="middle">2.39</text>';
    [['1.85', 124], ['16:9', 176], ['9:16', 228]].forEach(function (a) { b += d('rect', 'x="' + a[1] + '" y="345" width="44" height="28" rx="14"') + tx(a[1] + 22, 363, a[0], '', 'middle'); });
    b += d('circle', 'cx="290" cy="359" r="14"') + tx(290, 363, '+', '', 'middle');
    b += '<text class="t clk" x="318" y="356" style="--i:' + (n++) + '">19:32</text><text class="t q up" x="362" y="356" style="--i:' + (n++) + '">4\u00b0 up</text>';
    b += '<circle class="acc-f" cx="321" cy="372" r="3"/><text class="t gh" x="330" y="376" style="--i:' + (n++) + '">golden hour</text>';
    b += d('line', 'x1="438" y1="356" x2="708" y2="356"', 'q');
    ['06', '09', '12', '15', '18', '21'].forEach(function (h, k) { b += tx(438 + k * 54, 380, h, 'q', 'middle'); });
    b += '<line class="acc-s thick trail" x1="438" y1="356" x2="438" y2="356"/><circle class="thumb" cx="438" cy="356" r="8"/>';
    b += '<circle class="tap" r="20"/>';
    root.innerHTML = svg(844, 390, b);
    var q = function (s) { return root.querySelector(s); };
    var sun = q('.sun'), lab = q('.lab'), labt = q('.lab text'), thumb = q('.thumb'), trail = q('.trail'), clk = q('.clk'), up = q('.up'), gh = q('.gh');
    var flash = q('.flash'), shut = q('.shut'), nxt = q('.nxt'), cnt = q('.cnt'), tap = q('.tap');
    var T = 0, shots = 5;
    function set(h) {
      var p = (h - 6) / 15, el = Math.max(-6, 46 * Math.sin(Math.PI * (h - 6.4) / 13.2));
      var x = 122 + p * 552, y = 214 - el * 3.1;
      sun.setAttribute('transform', 'translate(' + x + ',' + y + ')');
      var lx = Math.min(Math.max(x + 18, 92), 552), ly = Math.max(y - 18, 76);
      lab.setAttribute('transform', 'translate(' + lx + ',' + ly + ')');
      var az = Math.round(p * 150 - 75);
      labt.textContent = 'sun ' + Math.abs(az) + '\u00b0 ' + (az < 0 ? 'left' : 'right') + ' \u00b7 el ' + Math.round(el) + '\u00b0';
      thumb.setAttribute('cx', 438 + p * 270); trail.setAttribute('x2', 438 + p * 270);
      clk.textContent = hhmm(h); up.textContent = Math.round(el) + '\u00b0 ' + (el >= 0 ? 'up' : 'down');
      gh.textContent = el < 0 ? 'blue hour' : el < 12 ? 'golden hour' : 'daylight';
    }
    this.update = function (dt) {
      T = (T + dt) % 9.5;
      var h = T < 6.5 ? 6 + 15 * ease(T / 6.5) * .9 : 19.5; set(h);
      var s = T - 7; // the shutter
      tap.style.opacity = s > 0 && s < .5 ? 1 - s * 2 : 0;
      tap.setAttribute('cx', 776); tap.setAttribute('cy', 222); tap.setAttribute('r', 20 + Math.max(0, s) * 40);
      shut.setAttribute('r', s > 0 && s < .2 ? 19 : 24);
      flash.style.opacity = s > 0 && s < .4 ? .5 * (1 - s / .4) : 0;
      var k = s > .1 ? 6 : 5;
      if (k !== shots) { shots = k; cnt.textContent = k; nxt.textContent = 'next 6' + (k === 6 ? 'B' : 'A'); }
    };
    this.update(5.6);
  }
  function ease(x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  function SunPath(root) {
    n = 0;
    var b = '', cx = 300, by = 236, rx = 240, ry = 182;
    function P(h) { var th = Math.PI * (1 - (h - 6.9) / 12.8); return [cx + rx * Math.cos(th), by - ry * Math.sin(th)]; }
    function arc(a, c) { var s = '', k; for (k = 0; k <= 40; k++) { var p = P(a + (c - a) * k / 40); s += (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); } return s; }
    b += d('line', 'x1="24" y1="' + by + '" x2="576" y2="' + by + '"');
    for (var x = 24; x <= 576; x += 23) b += d('line', 'x1="' + x + '" y1="' + by + '" x2="' + x + '" y2="' + (by + 4) + '"', 'q');
    b += d('path', 'd="' + arc(6.9, 19.7) + '"', 'q');
    b += d('path', 'd="' + arc(6.9, 8.1) + '"', 'acc-d thick') + d('path', 'd="' + arc(18.5, 19.7) + '"', 'acc-d thick');
    for (var h = 8; h <= 18; h++) { var p = P(h); b += '<circle class="hd t" cx="' + p[0] + '" cy="' + p[1] + '" r="2.5" style="--i:' + (n++) + '"/>'; if (h % 4 === 0) b += tx(p[0], p[1] - 12, ('0' + h).slice(-2) + ':00', 'q', 'middle'); }
    b += '<line class="drop q" x1="0" y1="0" x2="0" y2="0"/>';
    b += '<g class="sun"><circle class="ring" r="14"/><circle class="dot" r="6"/></g>';
    b += tx(24, 260, 'sunrise 06:58', 'q') + tx(576, 260, 'sunset 19:41', 'q', 'end');
    b += tx(64, by - 14, 'golden hour', 'acc') + tx(536, by - 14, 'golden hour', 'acc', 'end');
    b += '<text class="t rd" x="24" y="28" style="--i:' + (n++) + '">13:20</text><text class="t q rd2" x="24" y="44" style="--i:' + (n++) + '">el 38\u00b0 \u00b7 az 192\u00b0</text>';
    root.innerHTML = svg(600, 276, b);
    var sun = root.querySelector('.sun'), drop = root.querySelector('.drop'), rd = root.querySelector('.rd'), rd2 = root.querySelector('.rd2');
    var T = 0;
    this.update = function (dt) {
      T = (T + dt) % 8;
      var h = 6.9 + 12.8 * ease(Math.min(1, T / 7)), p = P(h);
      sun.setAttribute('transform', 'translate(' + p[0] + ',' + p[1] + ')');
      drop.setAttribute('x1', p[0]); drop.setAttribute('x2', p[0]); drop.setAttribute('y1', p[1] + 14); drop.setAttribute('y2', by);
      var el = Math.round(46 * Math.sin(Math.PI * (h - 6.9) / 12.8));
      rd.textContent = hhmm(h); rd2.textContent = 'el ' + el + '\u00b0 \u00b7 az ' + Math.round(70 + (h - 6.9) / 12.8 * 220) + '\u00b0';
    };
    this.update(3.4);
  }

  function Scenes(root) {
    n = 0;
    var b = '';
    for (var r = 0; r < 3; r++) for (var c = 0; c < 5; c++) {
      var x = 24 + c * 116, y = 14 + r * 84;
      b += d('rect', 'x="' + x + '" y="' + y + '" width="96" height="64"', r === 0 && c === 3 ? 'q park' : 'q');
    }
    b += tx(420, 50, 'park', 'q', 'middle');
    var path = 'M130 262 V182 H362 V98';
    b += '<path class="route-g" d="' + path + '"/><path class="route" pathLength="1" d="' + path + '"/>';
    b += '<circle class="acc-f" cx="130" cy="262" r="5"/>' + tx(142, 266, 'scene 1', 'acc');
    b += '<circle class="walker" r="5"/><circle class="walker-r" r="11"/>';
    b += '<g class="s2"><circle class="acc-f" cx="362" cy="98" r="5"/><text class="acc" x="374" y="102">scene 2</text></g>';
    b += '<g class="panel"><rect class="bgf ink-s" x="404" y="212" width="172" height="44"/><text class="q" x="414" y="229">from scene 1</text><text class="dist" x="414" y="245">0 m</text><line class="q-s" x1="470" y1="241" x2="566" y2="241"/><line class="bar acc-s thick" x1="470" y1="241" x2="470" y2="241"/></g>';
    b += '<g class="ask"><rect class="bgf ink-s" x="186" y="90" width="228" height="92"/><text x="200" y="112">moved 100 m</text><text class="q" x="200" y="128">new scene here?</text>' +
      '<rect class="ink-s nf" x="200" y="144" width="90" height="26" rx="13"/><text x="245" y="161" text-anchor="middle">keep</text>' +
      '<rect class="acc-f" x="298" y="144" width="102" height="26" rx="13"/><text class="paper" x="349" y="161" text-anchor="middle">new scene</text><circle class="tap" cx="349" cy="157" r="14"/></g>';
    root.innerHTML = svg(600, 276, b);
    var q = function (s) { return root.querySelector(s); };
    var route = q('.route'), walker = q('.walker'), wr = q('.walker-r'), dist = q('.dist'), bar = q('.bar'), ask = q('.ask'), s2 = q('.s2'), tap = q('.tap'), rt = q('.route-g');
    var L = rt.getTotalLength ? rt.getTotalLength() : 380, T = 0;
    this.update = function (dt) {
      T = (T + dt) % 9;
      var w = Math.min(1, T / 4.5), e = ease(w);
      route.style.strokeDashoffset = 1 - e;
      var p = rt.getPointAtLength ? rt.getPointAtLength(e * L) : { x: 130, y: 262 };
      walker.setAttribute('cx', p.x); walker.setAttribute('cy', p.y); wr.setAttribute('cx', p.x); wr.setAttribute('cy', p.y);
      dist.textContent = Math.round(e * 100) + ' m'; bar.setAttribute('x2', 470 + e * 96);
      var a = T > 4.8 && T < 7.2; ask.style.opacity = a ? 1 : 0; ask.style.transform = a ? 'none' : 'translateY(6px)';
      var tp = T - 6.6; tap.style.opacity = tp > 0 && tp < .5 ? 1 - tp * 2 : 0; tap.setAttribute('r', 14 + Math.max(0, tp) * 30);
      s2.style.opacity = T > 7 ? 1 : 0;
    };
    this.update(5.6);
  }


  // ---------- Lampwerk: the console (brand v2) ----------
  // Dark panels, Plex Sans for words and Plex Mono for numbers, one gel (Medium Yellow) for light only.
  // Fixtures are top-down heads in thin off-white line: on is a gel dot and beam, off an outline, selected a gel ring.
  // A demo walks three setups until someone presses a chip, a key or a lamp.
  var LW_MARK = 'M157.9 913.0C147.8 910.0 135.2 900.2 128.6 890.4C126.3 886.9 122.3 882.4 119.7 880.5C113.3 875.6 111.5 872.0 111.6 864.0C111.6 858.9 112.3 856.2 114.5 851.7C118.3 844.1 126.7 834.1 135.3 827.1C142.2 821.4 146.3 816.3 153.7 804.3C159.5 794.8 159.7 793.2 156.4 786.3C153.7 780.7 153.6 779.9 153.2 761.5L152.9 742.5L156.1 736.5C158.6 731.9 159.5 728.3 160.6 720.0C161.7 711.7 162.7 708.0 165.5 702.5C167.4 698.6 170.1 692.4 171.4 688.5C172.8 684.6 174.6 679.5 175.5 677.0C176.9 673.3 177.1 669.5 176.8 655.0C176.4 638.5 176.2 637.1 173.5 630.5C170.7 623.6 170.6 623.2 170.0 597.0C169.6 577.5 169.1 569.8 168.1 568.0C164.8 561.9 160.7 559.5 155.8 560.5C152.9 561.2 136.1 573.1 128.7 579.7C120.4 587.1 113.5 590.6 102.0 593.5C80.4 598.9 69.6 595.5 55.7 579.2C49.4 571.8 46.0 565.1 46.0 560.1C46.0 557.6 47.4 553.5 50.0 548.2C55.5 537.3 63.1 530.2 72.1 527.5C77.8 525.8 79.4 524.8 86.3 517.7C94.6 509.3 99.5 501.1 102.5 490.4C104.2 484.7 112.7 468.0 119.4 457.6C123.2 451.6 132.3 440.8 143.0 429.5C150.9 421.1 157.7 410.6 161.5 401.1C162.7 398.0 166.1 391.8 169.1 387.3C181.1 369.0 183.3 364.9 183.8 359.8C184.2 355.7 183.9 354.5 181.9 352.4C179.0 349.3 173.5 347.8 169.0 348.9C148.3 354.0 136.5 358.2 127.3 363.6C124.9 364.9 120.4 366.5 117.3 367.1C114.1 367.7 107.3 369.5 102.2 371.1C97.1 372.7 91.4 374.0 89.5 374.0C84.9 374.0 79.4 371.7 78.1 369.2C76.4 366.0 76.8 359.0 79.0 354.2C82.1 347.4 103.3 328.2 121.6 315.5C139.9 302.9 156.1 289.7 158.7 285.3C161.7 280.1 162.1 274.4 160.4 256.0C159.4 245.6 159.0 244.0 155.9 239.0C154.0 236.0 151.7 231.9 150.7 229.9C149.7 227.9 136.8 214.1 122.0 199.1C100.1 177.0 94.6 170.8 92.1 165.8C88.4 158.5 88.2 154.5 91.3 149.9C94.6 145.0 99.2 143.8 113.0 144.2C122.6 144.5 125.5 145.0 130.5 147.2C133.8 148.6 138.5 150.0 141.0 150.4C143.5 150.7 148.9 152.1 153.0 153.5C157.1 154.8 163.7 156.6 167.5 157.4C171.3 158.2 177.2 159.6 180.5 160.4C183.8 161.2 191.7 162.6 198.0 163.5C219.8 166.5 229.9 162.1 238.0 146.1C241.3 139.5 245.1 125.2 247.4 111.0C248.2 105.8 250.0 98.8 251.3 95.5C252.7 92.2 254.3 86.6 255.0 83.0C255.7 79.2 258.3 72.2 261.3 66.1C267.4 53.9 271.3 50.1 278.5 49.3C282.9 48.8 283.3 48.9 287.5 53.3C292.1 58.2 296.0 67.8 296.0 74.4C296.0 78.9 299.8 99.2 301.6 104.3C302.4 106.6 303.5 113.4 304.0 119.3C304.8 128.6 305.3 130.8 308.0 135.5C310.4 139.7 311.3 142.8 311.9 148.9C313.1 160.3 314.7 162.6 325.6 168.0C330.5 170.5 338.2 174.7 342.6 177.5C349.9 182.1 351.0 182.5 356.5 182.4C363.2 182.3 374.8 178.2 389.9 170.5C408.5 160.9 425.3 156.1 439.7 156.0C452.8 156.0 459.1 162.2 454.6 170.8C451.5 176.7 418.5 207.1 406.8 214.9C399.0 220.1 391.5 227.4 390.0 231.6C388.3 236.0 388.9 242.2 391.9 250.5C402.7 281.1 419.4 305.1 436.0 313.9C440.0 316.1 446.3 321.0 452.5 326.9C465.2 339.1 474.5 346.1 489.0 354.5C502.6 362.4 504.1 363.7 513.4 375.8C524.9 391.0 526.0 392.7 530.0 401.9C537.0 417.9 539.2 428.3 540.0 447.6C540.5 461.9 541.0 465.2 542.6 468.0C545.5 473.0 548.8 474.9 556.9 476.0C566.0 477.3 572.7 480.7 578.4 487.1C584.1 493.4 586.6 500.4 590.9 521.9C591.5 524.9 593.7 530.0 595.8 533.4C598.9 538.6 599.5 540.5 599.8 546.7C600.0 550.6 599.7 555.4 599.0 557.4C596.7 564.3 586.9 570.0 579.5 568.6C576.0 567.9 571.0 564.8 562.4 558.0C557.0 553.8 556.3 553.5 549.5 553.2C543.2 552.8 541.4 553.2 535.2 555.9C523.1 561.2 512.7 559.8 499.8 551.0C495.8 548.2 491.7 546.0 490.8 546.0C487.5 546.0 486.7 549.6 488.0 557.9C488.8 563.0 489.1 574.9 488.8 594.5C488.4 627.0 489.1 622.7 478.7 652.6C476.2 659.8 473.7 668.9 473.2 672.9C472.5 677.5 471.0 682.4 468.7 686.8C466.9 690.5 463.8 697.2 462.0 701.7L458.7 709.9L460.3 716.0C461.2 719.3 462.0 722.9 462.0 724.1C462.0 729.5 454.9 739.0 446.6 744.5C436.2 751.5 427.6 757.9 423.6 761.8C419.2 766.0 415.9 768.0 409.5 770.0C403.5 771.9 388.0 781.4 384.0 785.5C382.1 787.6 376.7 792.4 372.0 796.3C367.3 800.2 359.9 806.8 355.5 811.1C348.6 817.7 346.6 819.1 341.5 820.5C326.9 824.5 315.9 830.3 309.3 837.3C302.2 844.8 301.1 850.0 306.2 851.9C310.9 853.6 325.3 846.8 335.2 838.1C342.0 832.1 353.4 827.4 378.7 820.0C387.2 817.6 400.1 809.3 422.4 792.1C427.1 788.4 429.1 787.6 433.4 787.2C437.9 786.8 439.0 787.1 441.7 789.4C447.5 794.3 448.2 801.7 443.8 810.5C441.6 814.6 423.2 833.3 410.0 844.7C401.8 851.8 389.4 859.5 379.8 863.6C376.5 865.0 370.5 868.3 366.6 871.0C362.7 873.6 357.5 876.8 355.0 878.0C352.5 879.2 348.0 881.7 345.0 883.5C342.0 885.4 336.8 887.4 333.5 888.0C330.2 888.7 325.0 890.5 322.0 892.1C309.9 898.4 298.8 902.4 285.0 905.7C264.2 910.6 258.5 909.9 247.4 901.5C242.1 897.4 236.1 895.6 231.1 896.5C229.1 896.9 223.4 899.0 218.5 901.2C213.6 903.4 203.7 906.7 196.5 908.6C189.3 910.4 181.9 912.4 180.0 912.9C176.0 914.2 161.8 914.2 157.9 913.0Z';
  var LW_WORD = '<g transform="scale(1 -1)"><path transform="translate(0 0)" d="M120 0V1490H345V193H1020V0Z"/><path transform="translate(997 0)" d="M428 -24Q322 -24 236.0 15.5Q150 55 100.0 131.0Q50 207 50 316Q50 411 86.5 471.5Q123 532 185.0 568.0Q247 604 323.0 622.0Q399 640 479 650Q580 661 642.0 669.0Q704 677 732.5 694.5Q761 712 761 751V756Q761 851 707.5 903.0Q654 955 549 955Q440 955 376.5 907.5Q313 860 289 800L84 847Q121 949 191.5 1011.5Q262 1074 353.5 1103.0Q445 1132 545 1132Q612 1132 687.0 1116.5Q762 1101 828.5 1059.5Q895 1018 937.0 941.0Q979 864 979 742V0H766V153H758Q738 112 695.5 71.0Q653 30 587.0 3.0Q521 -24 428 -24ZM475 150Q566 150 630.0 185.5Q694 221 728.0 279.0Q762 337 762 402V547Q750 536 717.0 526.0Q684 516 642.0 509.0Q600 502 560.0 496.5Q520 491 493 488Q430 479 378.0 460.5Q326 442 294.5 406.5Q263 371 263 313Q263 232 323.0 191.0Q383 150 475 150Z"/><path transform="translate(2009 0)" d="M104 0V1118H311V934H326Q361 1027 440.5 1079.5Q520 1132 630 1132Q742 1132 817.5 1079.5Q893 1027 930 934H942Q982 1025 1069.0 1078.5Q1156 1132 1276 1132Q1428 1132 1525.0 1036.5Q1622 941 1622 749V0H1404V729Q1404 843 1342.0 893.5Q1280 944 1194 944Q1088 944 1029.5 878.5Q971 813 971 713V0H753V743Q753 834 697.0 889.0Q641 944 550 944Q488 944 435.5 911.5Q383 879 351.5 821.5Q320 764 320 689V0Z"/><path transform="translate(3663 0)" d="M104 -418V1118H314V936H332Q352 971 387.5 1017.0Q423 1063 487.0 1097.5Q551 1132 654 1132Q789 1132 894.5 1064.0Q1000 996 1061.0 867.0Q1122 738 1122 556Q1122 376 1062.0 246.5Q1002 117 896.5 47.5Q791 -22 655 -22Q554 -22 489.5 12.5Q425 47 388.5 93.0Q352 139 332 174H320V-418ZM608 163Q705 163 770.0 215.0Q835 267 868.5 356.5Q902 446 902 558Q902 669 869.0 757.0Q836 845 771.0 896.0Q706 947 608 947Q513 947 448.0 898.5Q383 850 349.5 762.5Q316 675 316 558Q316 441 350.0 352.0Q384 263 449.5 213.0Q515 163 608 163Z"/><path transform="translate(4766 0)" d="M345 0 17 1118H241L460 297H472L691 1118H916L1133 300H1144L1362 1118H1586L1258 0H1037L809 806H794L566 0Z"/><path transform="translate(6298 0)" d="M585 -23Q421 -23 301.0 48.0Q181 119 116.5 248.5Q52 378 52 551Q52 723 115.5 854.0Q179 985 294.5 1058.5Q410 1132 566 1132Q661 1132 750.0 1101.0Q839 1070 910.0 1003.0Q981 936 1022.5 829.0Q1064 722 1064 571V493H175V656H952L851 602Q851 705 819.0 784.0Q787 863 723.5 907.5Q660 952 566 952Q472 952 405.5 907.0Q339 862 304.0 788.0Q269 714 269 626V515Q269 400 309.0 320.0Q349 240 420.5 198.0Q492 156 587 156Q649 156 699.5 174.0Q750 192 787.0 228.0Q824 264 843 317L1049 278Q1024 188 961.0 120.0Q898 52 802.5 14.5Q707 -23 585 -23Z"/><path transform="translate(7338 0)" d="M104 0V1118H313V939H325Q356 1029 433.5 1081.5Q511 1134 609 1134Q629 1134 656.5 1132.5Q684 1131 701 1129V921Q688 925 654.5 929.0Q621 933 587 933Q510 933 449.5 900.5Q389 868 354.5 811.5Q320 755 320 681V0Z"/><path transform="translate(7967 0)" d="M304 379 301 644H340L785 1118H1045L538 578H502ZM104 0V1490H320V0ZM808 0 408 530 558 683 1076 0Z"/></g>';
  document.querySelectorAll('.eltio svg[data-lwm]').forEach(function (s) { s.innerHTML = '<path fill-rule="evenodd" d="' + LW_MARK + '"/>'; });
  document.querySelectorAll('.eltio svg[data-lww]').forEach(function (s) { s.innerHTML = LW_WORD; });

  var LF = [ // number, role, name, note, amps, circuit, output (lx at 1 m, approx), HMI
    ['01', 'KEY', 'Arri M18', 'Key \u00b7 8x8 full grid', 8.6, 'A', 58000, 1],
    ['02', 'BACK', 'SkyPanel S360-C', 'Back \u00b7 \u00bd grid', 6.5, 'A', 9000, 0],
    ['03', 'FILL', 'Arri Orbiter', 'Fill \u00b7 Dome M \u00b7 \u00bc CTO', 2.6, 'B', 7900, 0],
    ['04', 'KICKER', 'Arri 650 Plus', 'Kicker', 2.8, 'B', 3200, 0]
  ];
  var LS = [ // per setup: camera [x, y], then each lamp [x, y, on]
    { cam: [210, 256], l: [[60, 50, 1], [318, 52, 0], [300, 196, 1], [316, 108, 0]] },
    { cam: [210, 222], l: [[112, 86, 1], [318, 52, 0], [292, 204, 1], [312, 96, 1]] },
    { cam: [210, 48], l: [[322, 222, 1], [136, 244, 1], [96, 120, 1], [316, 108, 0]] }
  ];
  var TAL = [210, 150], PXM = 32;
  function fmt(v) { return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function LampC(root) {
    n = 0;
    var bp = root.closest('.bp'), b = '', i;
    // the room: faint 1 m grid, walls, a ruled scale on two walls
    for (i = 1; i < 12; i++) b += '<line class="lg" x1="' + (30 + i * PXM) + '" y1="24" x2="' + (30 + i * PXM) + '" y2="280"/>';
    for (i = 1; i < 8; i++) b += '<line class="lg" x1="30" y1="' + (24 + i * PXM) + '" x2="390" y2="' + (24 + i * PXM) + '"/>';
    b += d('rect', 'x="30" y="24" width="360" height="256"');
    for (i = 0; i <= 11; i++) { b += d('line', 'x1="' + (30 + i * PXM) + '" y1="24" x2="' + (30 + i * PXM) + '" y2="' + (i % 2 ? 20 : 17) + '"', 'q'); if (!(i % 2)) b += tx(30 + i * PXM, 12, i, 'q', 'middle'); }
    for (i = 0; i <= 8; i++) { b += d('line', 'x1="30" y1="' + (24 + i * PXM) + '" x2="' + (i % 2 ? 26 : 23) + '" y2="' + (24 + i * PXM) + '"', 'q'); if (!(i % 2) && i) b += tx(18, 27 + i * PXM, i, 'q', 'end'); }
    b += tx(390, 12, 'M', 'q', 'end');
    // beams sit under everything
    LF.forEach(function (f, k) { b += '<path class="beam b' + k + '"/>'; });
    b += '<line class="dist"/><text class="dl t"></text>';
    // talent and camera
    b += '<g class="fx tal" transform="translate(' + TAL + ')"><circle r="8"/><line x1="0" y1="8" x2="0" y2="13"/></g>' + tx(222, 140, 'TALENT', 'q');
    b += '<g class="fx cam"><rect x="-9" y="-6" width="14" height="12"/><path d="M5 -3 L12 -7 V7 L5 3"/></g><text class="t cl q">CAM A</text>';
    // the heads
    LF.forEach(function (f, k) {
      b += '<g class="fx lh h' + k + '" data-l="' + k + '"><circle class="hit" r="16"/><circle class="ring" r="15"/><rect x="-10" y="-8.4" width="16" height="16.8"/>' +
        '<line x1="6" y1="-8.4" x2="10.4" y2="-12.4"/><line x1="6" y1="8.4" x2="10.4" y2="12.4"/><circle class="dot" cx="-2" r="3.2"/></g>' +
        '<text class="t ll l' + k + '">' + f[0] + ' ' + f[1] + '</text>';
    });
    root.innerHTML = svg(400, 290, b);
    var sv = root.querySelector('svg');
    var heads = LF.map(function (f, k) { return sv.querySelector('.h' + k); }), beams = LF.map(function (f, k) { return sv.querySelector('.b' + k); });
    var labels = LF.map(function (f, k) { return sv.querySelector('.l' + k); });
    var cam = sv.querySelector('.cam'), cl = sv.querySelector('.cl'), dist = sv.querySelector('.dist'), dl = sv.querySelector('.dl');
    var chips = bp.querySelectorAll('.chip'), rows = bp.querySelectorAll('.li'), log = bp.querySelector('.lc-log');
    var q = function (s) { return bp.querySelector(s); };

    var st = { s: 0, sel: 0, on: LS[0].l.map(function (l) { return !!l[2]; }), demo: true, T: 0 };
    var pos = LS[0].l.map(function (l) { return [l[0], l[1]]; }), cp = LS[0].cam.slice(), strike = [0, 0, 0, 0];
    var typed = '', target = '', tc = 0;

    function lux(k) { var p = pos[k], dm = Math.hypot(p[0] - TAL[0], p[1] - TAL[1]) / PXM; return { d: dm, lx: LF[k][6] / (dm * dm) }; }
    function say() {
      var f = LF[st.sel], r = lux(st.sel);
      target = f[0] + ' ' + f[2] + ' \u00b7 ' + (st.on[st.sel] ? r.d.toFixed(1) + ' m \u00b7 ' + fmt(r.lx) + ' lx \u00b7 ' + f[4].toFixed(1) + ' A' : 'off');
      tc = 0;
    }
    var pend = 0;
    function later() { pend = 1.5; }
    function panel() {
      chips.forEach(function (c, k) { c.classList.toggle('on', k === st.s); c.setAttribute('aria-pressed', k === st.s); });
      var key = st.on[0] ? lux(0).lx : 0, fill = st.on[2] ? lux(2).lx : 0;
      q('.lc-key').textContent = key ? fmt(key) : '\u2013';
      q('.lc-fill').textContent = fill ? fmt(fill) + ' lx' : 'off';
      q('.lc-ratio').textContent = key && fill ? (key / fill).toFixed(1) + ':1' : '\u2013';
      ['A', 'B'].forEach(function (c) {
        var a = 0, h = 0;
        LF.forEach(function (f, k) { if (f[5] === c && st.on[k]) { a += f[4]; h++; } });
        q('.lc-c' + c).textContent = c + ' \u00b7 ' + h + (h === 1 ? ' head' : ' heads');
        q('.lc-a' + c).textContent = a.toFixed(1) + ' / 16 A';
        var m = q('.lc-m' + c); m.classList.toggle('hot', a / 16 > .9); m.firstChild.style.width = Math.min(100, a / 16 * 100) + '%';
      });
      q('.lc-n').textContent = st.on.filter(Boolean).length + '/' + LF.length;
      rows.forEach(function (r, k) { r.classList.toggle('sel', k === st.sel); var t = r.querySelector('.tog'); t.classList.toggle('on', st.on[k]); t.setAttribute('aria-pressed', st.on[k]); });
    }
    function setup(s) {
      var was = st.on.slice();
      st.s = s; st.on = LS[s].l.map(function (l) { return !!l[2]; });
      st.on.forEach(function (o, k) { if (o && !was[k] && LF[k][7]) strike[k] = .5; });
      if (!st.on[st.sel]) st.sel = st.on.indexOf(true);
    }
    function take() { st.demo = false; }
    chips.forEach(function (c, k) { c.addEventListener('click', function () { take(); setup(k); later(); }); });
    rows.forEach(function (r, k) {
      r.querySelector('.li-n').addEventListener('click', function () { take(); st.sel = k; say(); });
      r.querySelector('.tog').addEventListener('click', function () { take(); st.on[k] = !st.on[k]; if (st.on[k] && LF[k][7]) strike[k] = .5; st.sel = k; say(); });
    });
    heads.forEach(function (h, k) { h.addEventListener('click', function () { take(); if (st.sel === k) { st.on[k] = !st.on[k]; if (st.on[k] && LF[k][7]) strike[k] = .5; } st.sel = k; say(); }); });
    var self = this;
    // Try on iPhone: the working prototype takes the console's place, in a phone-sized frame
    var tryb = bp.querySelector('.lc-tryb'), tryw = bp.querySelector('.lc-try'), body = bp.querySelector('.lc-body');
    tryb.addEventListener('click', function () {
      take();
      var on = !bp.classList.contains('trying');
      bp.classList.toggle('trying', on); body.hidden = on; tryw.hidden = !on;
      tryb.textContent = on ? 'Back to the plan' : 'Try on iPhone';
      if (on && !tryw.firstChild) { var f = document.createElement('iframe'); f.src = tryb.dataset.src; f.title = 'Lampwerk, working prototype'; tryw.appendChild(f); }
      if (!on) tryw.innerHTML = '';
    });
    document.addEventListener('keydown', function (e) {
      if (!self.vis || e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
      var k = '123'.indexOf(e.key); if (k < 0) return;
      take(); setup(k); later();
    });

    this.update = function (dt) {
      if (st.demo) {
        st.T += dt;
        if (st.T > 4.2) { st.T = 0; var nx = (st.s + 1) % 3; setup(nx); st.sel = [0, 3, 1][nx]; later(); }
      }
      var ease = Math.min(1, dt * 4.5), sp = LS[st.s];
      pos.forEach(function (p, k) { p[0] += (sp.l[k][0] - p[0]) * ease; p[1] += (sp.l[k][1] - p[1]) * ease; });
      cp[0] += (sp.cam[0] - cp[0]) * ease; cp[1] += (sp.cam[1] - cp[1]) * ease;
      var ca = Math.atan2(TAL[1] - cp[1], TAL[0] - cp[0]) * 180 / Math.PI;
      cam.setAttribute('transform', 'translate(' + cp[0].toFixed(1) + ' ' + cp[1].toFixed(1) + ') rotate(' + ca.toFixed(1) + ')');
      cl.setAttribute('x', (cp[0] + 16).toFixed(1)); cl.setAttribute('y', (cp[1] + 3).toFixed(1));
      pos.forEach(function (p, k) {
        var dx = TAL[0] - p[0], dy = TAL[1] - p[1], L = Math.hypot(dx, dy), a = Math.atan2(dy, dx), A = a * 180 / Math.PI;
        heads[k].setAttribute('transform', 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ') rotate(' + A.toFixed(1) + ')');
        heads[k].classList.toggle('on', st.on[k]); heads[k].classList.toggle('sel', k === st.sel);
        var R = L + 30, w = .27, x1 = p[0] + R * Math.cos(a - w), y1 = p[1] + R * Math.sin(a - w), x2 = p[0] + R * Math.cos(a + w), y2 = p[1] + R * Math.sin(a + w);
        beams[k].setAttribute('d', 'M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + 'L' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'A' + R.toFixed(1) + ' ' + R.toFixed(1) + ' 0 0 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + 'Z');
        var o = st.on[k] ? 1 : 0;
        if (strike[k] > 0) { strike[k] -= dt; o = Math.random() < .5 ? .15 : 1; }
        beams[k].style.opacity = o; heads[k].querySelector('.dot').style.opacity = st.on[k] ? Math.max(o, .4) : 1;
        labels[k].setAttribute('x', (p[0] - dx / L * 22).toFixed(1)); labels[k].setAttribute('y', (p[1] - dy / L * 22 + 4).toFixed(1));
        labels[k].setAttribute('text-anchor', dx > 12 ? 'end' : dx < -12 ? 'start' : 'middle');
      });
      var s = pos[st.sel], r = lux(st.sel);
      dist.setAttribute('x1', s[0].toFixed(1)); dist.setAttribute('y1', s[1].toFixed(1)); dist.setAttribute('x2', TAL[0]); dist.setAttribute('y2', TAL[1]);
      dl.setAttribute('x', ((s[0] + TAL[0]) / 2 + 6).toFixed(1)); dl.setAttribute('y', ((s[1] + TAL[1]) / 2 - 6).toFixed(1));
      dl.textContent = r.d.toFixed(1) + ' m';
      if (pend > 0 && (pend -= dt) <= 0) say();
      panel();
      if (typed !== target) { tc += dt * 70; typed = target.slice(0, Math.floor(tc)); log.textContent = typed; }
    };
    say();
    this.update(.016);
  }

  // ---------- Spoolends: the letterboxed hero, burnt-in timecode and the cue dot ----------
  function Spool(root) {
    n = 0;
    var b = '', y0 = 0, H = 251;
    b += '<rect class="sebg" x="0" y="0" width="600" height="' + H + '"/>';
    // a figure in profile against a bright window, in line
    b += d('path', 'd="M330 251 C330 200 338 176 352 160 C340 150 336 132 342 116 C348 98 368 92 382 98 C398 104 404 122 398 140 C394 150 388 156 384 158 C404 170 418 198 420 251"', 'pl');
    b += d('path', 'd="M470 40 H580 V200 H470 Z M525 40 V200 M470 120 H580"', 'pq');
    for (var k = 0; k < 7; k++) b += d('line', 'x1="470" y1="' + (60 + k * 20) + '" x2="' + (300 - k * 30) + '" y2="' + (20 + k * 34) + '"', 'pr');
    b += d('path', 'd="M40 251 V170 H180 V251 M60 170 V150 H160 V170 M80 196 H160"', 'pq');
    b += '<rect class="bar" x="0" y="0" width="600" height="0"/><rect class="bar bb" x="0" y="' + H + '" width="600" height="0"/>';
    b += '<rect class="tcbg" x="14" y="' + (H - 34) + '" width="110" height="22"/><text class="tc" x="22" y="' + (H - 18) + '">00:00:02:15</text>';
    b += '<circle class="cue" cx="566" cy="26" r="9"/>';
    root.innerHTML = svg(600, H, b);
    var tc = root.querySelector('.tc'), cue = root.querySelector('.cue'), F = 63, T = 0;
    this.update = function (dt) {
      T += dt; F += dt * 24;
      var f = Math.floor(F), fr = f % 24, s = Math.floor(f / 24) % 60, m = Math.floor(f / 1440) % 60;
      tc.textContent = '00:' + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2) + ':' + ('0' + fr).slice(-2);
      var c = T % 5; cue.style.opacity = (c > 3.6 && c < 3.8) || (c > 4.0 && c < 4.2) ? 1 : 0;
    };
    this.update(0);
  }

  // ---------- Test Rolls: the shop grid ----------
  function Shop(root) {
    n = 0;
    var b = '', packs = [['TR-101', 'wet tarmac'], ['TR-102', 'sodium night'], ['TR-103', 'bus glass'], ['TR-104', 'flyposters'], ['TR-105', 'halation'], ['TR-106', 'gate weave'], ['TR-107', 'light leaks'], ['TR-108', 'dust + scratch']];
    b += d('rect', 'x="1" y="1" width="598" height="358"') + d('line', 'x1="1" y1="24" x2="599" y2="24"') + tx(12, 17, 'testrolls.com', 'q');
    b += tx(20, 52, 'TEST ROLLS') + tx(300, 52, 'packs (8)', '', 'middle') + '<text class="t cart" x="580" y="52" text-anchor="end" style="--i:' + (n++) + '">cart (0)</text>';
    var pat = ['M0 0', 'M0 0'];
    packs.forEach(function (p, i) {
      var c = i % 4, r = Math.floor(i / 4), x = 20 + c * 142, y = 72 + r * 140, w = 132, h = 74;
      b += d('rect', 'x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"');
      // each pack gets its own texture in line
      var t = '';
      if (i === 0) for (var k = 1; k < 7; k++) t += 'M' + x + ' ' + (y + k * 10.5) + ' h' + w + ' ';
      if (i === 1) for (k = 0; k < 6; k++) t += 'M' + (x + 14 + k * 22) + ' ' + (y + h) + ' v-' + (20 + (k % 3) * 16) + ' ';
      if (i === 2) for (k = 0; k < 8; k++) t += 'M' + (x + k * 18) + ' ' + y + ' l18 ' + h + ' ';
      if (i === 3) t += 'M' + (x + 10) + ' ' + (y + 10) + ' h40 v30 h-40 Z M' + (x + 56) + ' ' + (y + 16) + ' h30 v44 h-30 Z M' + (x + 92) + ' ' + (y + 8) + ' h30 v26 h-30 Z';
      if (i === 4) t += 'M' + (x + 66) + ' ' + (y + 37) + ' m-24 0 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0 M' + (x + 66) + ' ' + (y + 37) + ' m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0';
      if (i === 5) for (k = 0; k < 4; k++) t += 'M' + (x + 8 + k * 2) + ' ' + (y + 8 + k * 2) + ' h' + (w - 16) + ' v' + (h - 16) + ' h-' + (w - 16) + ' Z ';
      if (i === 6) t += 'M' + x + ' ' + (y + h) + ' Q' + (x + 40) + ' ' + (y + 10) + ' ' + (x + w) + ' ' + (y + 20) + ' M' + x + ' ' + (y + h - 20) + ' Q' + (x + 50) + ' ' + (y + 30) + ' ' + (x + w) + ' ' + (y + 46);
      if (i === 7) for (k = 0; k < 9; k++) t += 'M' + (x + 10 + (k * 37) % 112) + ' ' + (y + 8 + (k * 23) % 58) + ' l' + (k % 2 ? 6 : -4) + ' ' + (k % 3 + 3) + ' ';
      b += d('path', 'd="' + t + '"', 'q');
      b += '<line class="scan s' + i + '" x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y + h) + '"/>';
      b += tx(x, y + h + 18, p[0], 'q') + tx(x, y + h + 33, p[1]) + tx(x + w, y + h + 18, 'lut + clips', 'q', 'end');
    });
    b += '<g class="cur"><circle r="9"/></g>';
    root.innerHTML = svg(600, 360, b);
    var scans = root.querySelectorAll('.scan'), cur = root.querySelector('.cur'), cart = root.querySelector('.cart');
    var T = 0, order = [0, 5, 2, 7, 4], added = 0, lastAdd = -1;
    this.update = function (dt) {
      T = (T + dt) % 15;
      var seg = Math.floor(T / 3), u = (T % 3) / 3, i = order[seg], c = i % 4, r = Math.floor(i / 4);
      var x = 20 + c * 142 + 66, y = 72 + r * 140 + 37;
      cur.setAttribute('transform', 'translate(' + x + ',' + y + ') scale(' + (u > .8 && u < .86 ? .6 : 1) + ')');
      scans.forEach(function (s, k) {
        var on = k === i && u > .15, px = 20 + (k % 4) * 142 + ((u * 1.6) % 1) * 132;
        s.setAttribute('x1', px); s.setAttribute('x2', px); s.style.opacity = on ? 1 : 0;
      });
      if (u > .82 && lastAdd !== seg && seg % 2 === 0) { lastAdd = seg; added++; cart.textContent = 'cart (' + added + ')'; }
      if (T < .05) { added = 0; lastAdd = -1; cart.textContent = 'cart (0)'; }
    };
    this.update(.5);
  }

  // ---------- Plumbline: pose, timeline, three notes ----------
  function Coach(root) {
    n = 0;
    var b = '';
    b += d('rect', 'x="40" y="10" width="190" height="380" rx="28"') + d('line', 'x1="110" y1="22" x2="160" y2="22"');
    b += tx(56, 52, 'board \u00b7 session 14') + d('rect', 'x="54" y="62" width="162" height="220"');
    var holds = [[80, 90], [150, 84], [190, 118], [110, 132], [70, 170], [168, 162], [120, 206], [196, 214], [86, 240], [150, 258]];
    b += '<rect class="clip" x="54" y="62" width="162" height="220"/>';
    holds.forEach(function (h) { b += d('circle', 'cx="' + h[0] + '" cy="' + h[1] + '" r="5"', 'hold'); });
    b += '<g class="body"><path class="bones"/><g class="joints"></g></g>';
    b += d('line', 'x1="54" y1="304" x2="216" y2="304"', 'q') + '<line class="played" x1="54" y1="304" x2="54" y2="304"/>';
    [.24, .52, .86].forEach(function (m, i) { b += '<circle class="mk m' + i + '" cx="' + (54 + m * 162) + '" cy="304" r="4"/>'; });
    b += '<text class="t tc" x="54" y="324" style="--i:' + (n++) + '">0:00</text>' + tx(216, 324, '1:00', 'q', 'end');
    b += '<g class="pop"><rect class="bgf ink-s" x="54" y="336" width="162" height="38"/><text class="pt1" x="62" y="352"></text><text class="pt2 q" x="62" y="366"></text></g>';
    b += tx(290, 52, 'NOTES (3)') + d('line', 'x1="290" y1="62" x2="570" y2="62"', 'q');
    var notes = [['0:14', 'hips drift off the wall', 'keep them in on the cross'], ['0:31', 'left foot cuts loose', 'set the toe before the reach'], ['0:52', 'good: straight arm', 'on the lock-off, keep it']];
    notes.forEach(function (nt, i) {
      var y = 96 + i * 78;
      b += '<g class="note n' + i + '"><text x="290" y="' + y + '">' + nt[0] + '</text><text x="340" y="' + y + '">' + nt[1] + '</text><text class="q" x="340" y="' + (y + 16) + '">' + nt[2] + '</text><line class="q-s" x1="290" y1="' + (y + 34) + '" x2="570" y2="' + (y + 34) + '"/></g>';
    });
    b += tx(290, 360, 'pose tracked on the phone', 'q');
    root.innerHTML = svg(600, 400, b);
    var q = function (s) { return root.querySelector(s); };
    var bones = q('.bones'), joints = q('.joints'), played = q('.played'), tc = q('.tc'), pop = q('.pop'), p1 = q('.pt1'), p2 = q('.pt2');
    var mk = [q('.m0'), q('.m1'), q('.m2')], nn = [q('.n0'), q('.n1'), q('.n2')];
    var A = { h: [110, 112], n: [112, 124], hip: [118, 176], lh: [80, 92], rh: [150, 88], lk: [100, 206], rk: [140, 204], lf: [86, 238], rf: [150, 256] };
    var B = { h: [132, 120], n: [134, 132], hip: [128, 186], lh: [110, 134], rh: [190, 120], lk: [112, 214], rk: [156, 212], lf: [120, 206], rf: [150, 256] };
    for (var j = 0; j < 9; j++) joints.innerHTML += '<circle r="3"/>';
    var jc = joints.querySelectorAll('circle'), keys = ['h', 'n', 'hip', 'lh', 'rh', 'lk', 'rk', 'lf', 'rf'];
    var T = 0;
    this.update = function (dt) {
      T = (T + dt) % 12;
      var p = Math.min(1, T / 10), u = (1 - Math.cos(p * Math.PI * 3)) / 2, P = {};
      keys.forEach(function (k, i) { P[k] = [A[k][0] + (B[k][0] - A[k][0]) * u, A[k][1] + (B[k][1] - A[k][1]) * u]; jc[i].setAttribute('cx', P[k][0]); jc[i].setAttribute('cy', P[k][1]); });
      var L = function (a, c) { return 'M' + P[a][0] + ' ' + P[a][1] + ' L' + P[c][0] + ' ' + P[c][1] + ' '; };
      bones.setAttribute('d', L('n', 'hip') + L('n', 'lh') + L('n', 'rh') + L('hip', 'lk') + L('lk', 'lf') + L('hip', 'rk') + L('rk', 'rf') + 'M' + P.h[0] + ' ' + P.h[1] + ' m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0');
      played.setAttribute('x2', 54 + p * 162);
      var s = Math.round(p * 59); tc.textContent = '0:' + ('0' + s).slice(-2);
      var cur = -1;
      [.24, .52, .86].forEach(function (m, i) { var hit = p >= m; mk[i].classList.toggle('on', hit); nn[i].style.opacity = hit ? 1 : .18; if (hit) cur = i; });
      var txts = [['0:14 hips drift', 'off the wall'], ['0:31 left foot', 'cuts loose'], ['0:52 good:', 'straight arm']];
      if (cur >= 0 && p < 1) { pop.style.opacity = 1; p1.textContent = txts[cur][0]; p2.textContent = txts[cur][1]; } else pop.style.opacity = 0;
    };
    this.update(3);
  }

  // ---------- Camera app: tube and 8mm ----------
  function Cam(root) {
    n = 0;
    var b = '', fx = 120, fy = 40, fw = 420, fh = 236;
    b += d('rect', 'x="10" y="10" width="580" height="300" rx="40"');
    b += '<g class="pill"><rect class="ink-s" x="22" y="134" width="70" height="52" rx="26"/><rect class="ink-f knob" x="26" y="138" width="62" height="22" rx="11"/><text class="paper l1" x="57" y="153" text-anchor="middle">tube</text><text class="l2" x="57" y="177" text-anchor="middle">8mm</text></g>';
    b += '<g class="frame"><rect class="gate" x="' + fx + '" y="' + fy + '" width="' + fw + '" height="' + fh + '"/>';
    b += '<clipPath id="camclip"><rect x="' + fx + '" y="' + fy + '" width="' + fw + '" height="' + fh + '"/></clipPath><g clip-path="url(#camclip)">';
    b += d('path', 'd="M' + fx + ' 196 H' + (fx + fw) + ' M180 196 V120 H250 V196 M270 196 V96 l30 -20 l30 20 V196 M420 196 V140 H500 V196"', 'q');
    b += d('path', 'd="M352 250 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M352 258 v24 M352 266 l-12 8 M352 266 l12 8"');
    b += '<g class="tube">';
    for (var y = fy + 4; y < fy + fh; y += 7) b += '<line class="sl" x1="' + fx + '" y1="' + y + '" x2="' + (fx + fw) + '" y2="' + y + '"/>';
    b += '<rect class="roll" x="' + fx + '" y="' + fy + '" width="' + fw + '" height="22"/></g>';
    b += '</g></g>';
    b += '<g class="sprk">';
    for (var k = -1; k < 6; k++) b += '<rect class="hole" x="100" y="' + (fy + k * 52 + 12) + '" width="10" height="16" rx="2"/>';
    b += '</g>';
    b += '<text class="t rd1" x="' + fx + '" y="' + (fy + fh + 22) + '" style="--i:' + (n++) + '">tube \u00b7 25i \u00b7 rolling</text>';
    b += '<text class="t rd2 q" x="' + (fx + fw) + '" y="' + (fy + fh + 22) + '" text-anchor="end" style="--i:' + (n++) + '">00:00:04</text>';
    b += d('circle', 'cx="560" cy="160" r="20"') + '<circle class="rec" cx="560" cy="160" r="8"/>';
    b += '<circle class="tap" cx="57" cy="160" r="20"/>';
    root.innerHTML = svg(600, 320, b);
    var q = function (s) { return root.querySelector(s); };
    var tube = q('.tube'), roll = q('.roll'), sprk = q('.sprk'), frame = q('.frame'), gate = q('.gate'), knob = q('.knob'), l1 = q('.l1'), l2 = q('.l2'), rd1 = q('.rd1'), rd2 = q('.rd2'), rec = q('.rec'), tap = q('.tap');
    var T = 0, F = 0;
    this.update = function (dt) {
      T = (T + dt) % 10; F += dt;
      var eight = T >= 5, tt = T % 5;
      tube.style.opacity = eight ? 0 : 1; sprk.style.opacity = eight ? 1 : 0;
      knob.setAttribute('y', eight ? 160 : 138);
      l1.setAttribute('class', eight ? '' : 'paper'); l2.setAttribute('class', eight ? 'paper' : '');
      roll.setAttribute('y', fy - 22 + ((F * 60) % (fh + 22)));
      var f18 = Math.floor(F * 18);
      sprk.setAttribute('transform', 'translate(0,' + ((f18 % 4) * 13) + ')');
      var jx = eight ? ((f18 * 7) % 3 - 1) * .8 : 0, jy = eight ? ((f18 * 5) % 3 - 1) * .8 : 0;
      frame.setAttribute('transform', 'translate(' + jx + ',' + jy + ')');
      gate.setAttribute('rx', eight ? 14 : 4);
      rd1.textContent = eight ? '8mm \u00b7 18 fps \u00b7 gate weave' : 'tube \u00b7 25i \u00b7 rolling';
      var secs = Math.floor(F % 60); rd2.textContent = '00:00:' + ('0' + secs).slice(-2);
      rec.style.opacity = Math.floor(F * 1.5) % 2 ? 1 : .25;
      tap.style.opacity = tt < .5 ? 1 - tt * 2 : 0; tap.setAttribute('r', 20 + tt * 30);
    };
    this.update(1);
  }

  // ---------- Grip: the climber and the roll, from the Grip identity's own wireframe engine ----------
  // Copied from eltio/grip/brand/build/page.html (identity v11). Mat blue is the tracked body only;
  // holds, notes and the friend are white. One engine per panel so trails and cameras don't mix.
  function GripEngine(noteEl) {
  var MINT = '#4A74FF', WHITE = '#F3F3F0';
  var NS = 'http://www.w3.org/2000/svg';
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hash(a, b) { var x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); }
  function f(n) { return n.toFixed(2); }
  function tc(t) { var s = Math.floor(t); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

  /* ---- climber: four limbs move up one hold at a time, the body follows by two-bone IK ---- */
  var D = 8, ARM = 10, LEG = 11, PH = 1.15;
  var BASE = { hL: [-9, 40], hR: [8, 44], fL: [-6, 0], fR: [6, 4] };
  var ORDER = ['hR', 'fL', 'hL', 'fR'];
  var NOTES = { hR: ['Right arm', 'stay straight'], fL: ['Left foot', 'place it quietly'], hL: ['Left hip', 'turn it in'], fR: ['Head', 'look before you reach'] };
  function limbs(t) {
    var s = Math.max(0, t) / PH, n = Math.floor(s / 4), k = Math.floor(s) % 4, p = ease(Math.min(1, (s % 1) * 1.3)), o = {};
    ORDER.forEach(function (nm, i) {
      var moves = n + (i < k ? 1 : 0), pr = i === k ? p : 0, b = BASE[nm];
      var bulge = Math.sin(Math.PI * pr) * (nm[0] === 'h' ? 2.6 : 1.6) * (nm[1] === 'L' ? -1 : 1);
      o[nm] = [b[0] + bulge, b[1] + D * (moves + pr), pr];
    });
    o.active = ORDER[k]; o.prog = p;
    return o;
  }
  function ik(a, b, l1, l2, sg) {
    var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), mx = l1 + l2 - .01, bx = b[0], by = b[1];
    if (d > mx) { bx = a[0] + dx / d * mx; by = a[1] + dy / d * mx; d = mx; }
    var an = Math.atan2(by - a[1], bx - a[0]), c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), off = Math.acos(Math.max(-1, Math.min(1, c)));
    return [[a[0] + l1 * Math.cos(an + sg * off), a[1] + l1 * Math.sin(an + sg * off)], [bx, by]];
  }
  function body(L, o) {
    o = o || {};
    var fy = (L.fL[1] + L.fR[1]) / 2, hy = (L.hL[1] + L.hR[1]) / 2, fx = (L.fL[0] + L.fR[0]) / 2, hx = (L.hL[0] + L.hR[0]) / 2;
    var P = [(fx + hx) / 2 * .8 + (o.shift || 0), (fy + hy) / 2 - 7 - (o.sag || 0)];
    var S = [P[0] * .5 + hx * .3, P[1] + 16];
    var J = { P: P, S: S, shL: [S[0] - 5, S[1]], shR: [S[0] + 5, S[1]], hiL: [P[0] - 3.5, P[1]], hiR: [P[0] + 3.5, P[1]], neck: [S[0], S[1] + 2], head: [S[0], S[1] + 6] };
    var a = ik(J.shL, L.hL, ARM, ARM, 1); J.elL = a[0]; J.haL = a[1];
    a = ik(J.shR, L.hR, ARM, ARM, -1); J.elR = a[0]; J.haR = a[1];
    a = ik(J.hiL, L.fL, LEG, LEG, -1); J.knL = a[0]; J.ftL = a[1];
    a = ik(J.hiR, L.fR, LEG, LEG, 1); J.knR = a[0]; J.ftR = a[1];
    J.com = [P[0] * .5 + S[0] * .3 + (J.haL[0] + J.haR[0] + J.ftL[0] + J.ftR[0]) * .05, P[1] * .5 + S[1] * .3 + (J.haL[1] + J.haR[1] + J.ftL[1] + J.ftR[1]) * .05];
    return J;
  }
  var BONES = [['shL', 'shR'], ['hiL', 'hiR'], ['shL', 'hiL'], ['shR', 'hiR'], ['shL', 'elL'], ['elL', 'haL'], ['shR', 'elR'], ['elR', 'haR'], ['hiL', 'knL'], ['knL', 'ftL'], ['hiR', 'knR'], ['knR', 'ftR'], ['S', 'neck']];
  var MESH = [['shL', 'hiR'], ['shR', 'hiL'], ['elL', 'hiL'], ['elR', 'hiR']];
  var DOTS = ['shL', 'shR', 'elL', 'elR', 'haL', 'haR', 'hiL', 'hiR', 'knL', 'knR', 'ftL', 'ftR', 'neck', 'S', 'P'];

  function figure(J, X, Y, col, dash, op) {
    var s = '', d = dash ? ' stroke-dasharray="3 3"' : '';
    BONES.forEach(function (b) { s += '<line x1="' + f(X(J[b[0]])) + '" y1="' + f(Y(J[b[0]])) + '" x2="' + f(X(J[b[1]])) + '" y2="' + f(Y(J[b[1]])) + '"' + d + '/>'; });
    var mesh = '';
    MESH.forEach(function (b) { mesh += '<line x1="' + f(X(J[b[0]])) + '" y1="' + f(Y(J[b[0]])) + '" x2="' + f(X(J[b[1]])) + '" y2="' + f(Y(J[b[1]])) + '"/>'; });
    var dots = '';
    if (!dash) DOTS.forEach(function (k) { dots += '<circle cx="' + f(X(J[k])) + '" cy="' + f(Y(J[k])) + '" r=".75"/>'; });
    var hd = '<circle cx="' + f(X(J.head)) + '" cy="' + f(Y(J.head)) + '" r="2.7" fill="none"' + d + '/>';
    return '<g stroke="' + col + '" stroke-width="1.4" vector-effect="non-scaling-stroke" fill="none" opacity="' + (op || 1) + '" stroke-linecap="round">' +
      '<g vector-effect="non-scaling-stroke">' + s + hd + '</g>' +
      '<g opacity=".35">' + mesh + '</g>' +
      '<g fill="#0D0E0D">' + dots + '</g></g>';
  }
  function fixStroke(svg) { svg.querySelectorAll('line,circle,path,polyline,polygon').forEach(function (e) { e.setAttribute('vector-effect', 'non-scaling-stroke'); }); }

  function wall(x0, x1, y0, y1, X, Y, holds) {
    var s = '<g stroke="' + WHITE + '" stroke-opacity=".07" stroke-width="1">';
    for (var gx = Math.ceil(x0 / 8) * 8; gx <= x1; gx += 8) s += '<line x1="' + f(X([gx, 0])) + '" y1="' + f(Y([0, y0])) + '" x2="' + f(X([gx, 0])) + '" y2="' + f(Y([0, y1])) + '"/>';
    for (var gy = Math.ceil(y0 / 8) * 8; gy <= y1; gy += 8) s += '<line x1="' + f(X([x0, 0])) + '" y1="' + f(Y([0, gy])) + '" x2="' + f(X([x1, 0])) + '" y2="' + f(Y([0, gy])) + '"/>';
    s += '</g>';
    if (!holds) return s;
    s += '<g stroke="' + WHITE + '" stroke-opacity=".38" stroke-width="1" fill="none">';
    var r0 = Math.floor(y0 / D) - 1, r1 = Math.ceil(y1 / D) + 1, r, i;
    function hold(cx, cy, seed, sz) {
      var pts = [], n = 5;
      for (var v = 0; v < n; v++) { var an = v / n * Math.PI * 2 + seed * 3, rr = sz * (.7 + .5 * hash(seed, v)); pts.push(f(X([cx + Math.cos(an) * rr, 0])) + ',' + f(Y([0, cy + Math.sin(an) * rr * .8]))); }
      return '<polygon points="' + pts.join(' ') + '"/>';
    }
    for (r = r0; r <= r1; r++) {
      ORDER.forEach(function (nm, j) { var b = BASE[nm]; var y = b[1] + D * r; if (y > y0 - 4 && y < y1 + 4) s += hold(b[0], y - (nm[0] === 'h' ? 1 : 1.2), r * 4 + j, nm[0] === 'h' ? 1.6 : 1.3); });
      for (i = 0; i < 3; i++) { var hx = -70 + hash(r, i + 9) * 140; if (Math.abs(hx) < 13) continue; s += hold(hx, D * r + hash(r, i + 3) * 8, r * 7 + i, .9 + hash(i, r) * 1.4); }
    }
    return s + '</g>';
  }

  /* ---- rolling: two bodies swap between closed guard and mount ---- */
  var KA = { head: [38, 93], neck: [48, 95], elN: [62, 82], haN: [80, 66], elF: [64, 90], haF: [84, 78], hip: [84, 96], knN: [100, 78], ftN: [122, 84], knF: [102, 86], ftF: [124, 92] };
  var KB = { head: [96, 40], neck: [100, 50], elN: [92, 64], haN: [82, 86], elF: [104, 66], haF: [90, 90], hip: [116, 80], knN: [108, 99], ftN: [140, 99], knF: [116, 99], ftF: [144, 99] };
  var RB = [['neck', 'hip'], ['neck', 'elN'], ['elN', 'haN'], ['neck', 'elF'], ['elF', 'haF'], ['hip', 'knN'], ['knN', 'ftN'], ['hip', 'knF'], ['knF', 'ftF']];
  function blend(a, b, u, lift) {
    var o = {}; Object.keys(a).forEach(function (k) { o[k] = [lerp(a[k][0], b[k][0], u), lerp(a[k][1], b[k][1], u) - Math.sin(Math.PI * u) * lift]; }); return o;
  }
  function rollU(t) { var c = 5.4, s = (t % c + c) % c; if (s < 1.1) return [0, 0]; if (s < 2.7) return [ease((s - 1.1) / 1.6), 1]; if (s < 3.8) return [1, 1]; return [1 - ease((s - 3.8) / 1.6), 2]; }
  function sideFig(K, col, op) {
    var s = '<g stroke="' + col + '" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="' + op + '">';
    RB.forEach(function (b) { var far = b[0].slice(-1) === 'F' || b[1].slice(-1) === 'F'; s += '<line x1="' + f(K[b[0]][0]) + '" y1="' + f(K[b[0]][1]) + '" x2="' + f(K[b[1]][0]) + '" y2="' + f(K[b[1]][1]) + '"' + (far ? ' stroke-opacity=".4"' : '') + '/>'; });
    s += '<line x1="' + f(K.neck[0]) + '" y1="' + f(K.neck[1]) + '" x2="' + f(K.knN[0]) + '" y2="' + f(K.knN[1]) + '" stroke-opacity=".25"/>';
    var tx = K.neck[0] - K.hip[0], ty = K.neck[1] - K.hip[1], tl = Math.hypot(tx, ty) || 1, hx = K.neck[0] + tx / tl * 5.4, hy = K.neck[1] + ty / tl * 5.4;
    s += '<circle cx="' + f(hx) + '" cy="' + f(hy) + '" r="4.4"/><g fill="#0D0E0D">';
    Object.keys(K).forEach(function (k) { if (k !== 'head') s += '<circle cx="' + f(K[k][0]) + '" cy="' + f(K[k][1]) + '" r="1"/>'; });
    return s + '</g></g>';
  }
  var trail = [];
  function drawRoll(svg, t) {
    var uu = rollU(t), u = uu[0];
    var A = blend(KA, KB, u, 14), B = blend(KB, KA, u, 5);
    svg.setAttribute('viewBox', '0 22 184 92');
    var s = '<g stroke="' + WHITE + '" stroke-opacity=".08">';
    for (var x = 0; x <= 184; x += 16) s += '<line x1="' + x + '" y1="100" x2="' + (92 + (x - 92) * 1.6) + '" y2="114"/>';
    s += '<line x1="0" y1="100" x2="184" y2="100" stroke-opacity=".3"/><line x1="0" y1="106" x2="184" y2="106"/></g>';
    trail.push([A.hip[0], A.hip[1]]); if (trail.length > 70) trail.shift();
    s += '<polyline fill="none" stroke="' + WHITE + '" stroke-opacity=".35" stroke-dasharray="1 2" points="' + trail.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' ') + '"/>';
    s += sideFig(B, MINT, .6) + sideFig(A, MINT, 1);
    svg.innerHTML = s; fixStroke(svg);
    var lab = u < .08 ? 'Closed guard' : u > .92 ? 'Mount' : 'Sweep';
    return lab;
  }

  /* ---- scenes ---- */
  var cam = { hero: null, an: null, cmp: null }, comTrail = [];
  function drawClimb(svg, t, mode, key) {
    var L = limbs(t), J = body(L), h = mode === 'an' ? 84 : 100, asp = svg.clientWidth / Math.max(1, svg.clientHeight), w = h * (isFinite(asp) && asp > .3 ? asp : 2);
    var target = J.P[1] + 7;
    cam[key] = cam[key] == null ? target : cam[key] + (target - cam[key]) * .08;
    var cy = cam[key];
    svg.setAttribute('viewBox', (-w / 2) + ' ' + (-h / 2) + ' ' + w + ' ' + h);
    var ox = mode === 'side' ? -w * .2 : 0;
    var X = function (p) { return p[0] + ox; }, Y = function (p) { return -(p[1] - cy); };
    var s = wall(-w / 2 - ox, mode === 'side' ? 4 - ox : w / 2, cy - h / 2 - 2, cy + h / 2 + 2, X, Y, true);

    if (mode === 'friend') {
      var Lf = limbs(t - .35), Jf = body(Lf, { sag: 3, shift: 1.6 });
      s += figure(Jf, X, Y, WHITE, true, .7);
    }
    s += figure(J, X, Y, MINT, false, 1);

    if (mode === 'an') {
      comTrail.push([J.com[0], J.com[1]]); if (comTrail.length > 120) comTrail.shift();
      s += '<polyline fill="none" stroke="' + WHITE + '" stroke-opacity=".45" stroke-dasharray="1 1.5" points="' + comTrail.map(function (p) { return f(X(p)) + ',' + f(Y(p)); }).join(' ') + '"/>';
      var fl = Math.min(J.ftL[1], J.ftR[1]) - 3;
      s += '<line x1="' + f(X(J.com)) + '" y1="' + f(Y(J.com)) + '" x2="' + f(X(J.com)) + '" y2="' + f(Y([0, fl])) + '" stroke="' + MINT + '" stroke-dasharray="1.5 1.5"/>';
      s += '<circle cx="' + f(X(J.com)) + '" cy="' + f(Y(J.com)) + '" r="1.3" fill="' + WHITE + '"/>';
      s += '<line x1="' + f(X(J.ftL)) + '" y1="' + f(Y([0, fl])) + '" x2="' + f(X(J.ftR)) + '" y2="' + f(Y([0, fl])) + '" stroke="' + WHITE + '" stroke-opacity=".5"/>';
      function ang(a, b, c, side) {
        var a1 = Math.atan2(a[1] - b[1], a[0] - b[0]), a2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
        var d = Math.abs(a1 - a2); if (d > Math.PI) d = 2 * Math.PI - d;
        var r = 3, p1 = [b[0] + Math.cos(a1) * r, b[1] + Math.sin(a1) * r], p2 = [b[0] + Math.cos(a2) * r, b[1] + Math.sin(a2) * r];
        var sw = ((a2 - a1 + 4 * Math.PI) % (2 * Math.PI)) < Math.PI ? 0 : 1;
        return '<path d="M' + f(X(p1)) + ' ' + f(Y(p1)) + 'A' + r + ' ' + r + ' 0 0 ' + sw + ' ' + f(X(p2)) + ' ' + f(Y(p2)) + '" fill="none" stroke="' + WHITE + '"/>' +
          '<text x="' + f(X(b) + side * 4.5) + '" y="' + f(Y(b) + 1) + '" text-anchor="' + (side < 0 ? 'end' : 'start') + '">' + Math.round(d * 180 / Math.PI) + '\u00b0</text>';
      }
      s += '<g fill="' + WHITE + '" font-family="DM Mono, monospace" font-size="1.7">';
      s += ang(J.hiL, J.knL, J.ftL, -1) + ang(J.shR, J.elR, J.haR, 1);
      var nm = L.active, nt = NOTES[nm], anchor = nm === 'hR' ? J.elR : nm === 'fL' ? J.ftL : nm === 'hL' ? J.hiL : J.head;
      var lx = nm === 'hR' || nm === 'fR' ? 16 : -16, side = lx > 0 ? 'start' : 'end';
      s += '<line x1="' + f(X(anchor)) + '" y1="' + f(Y(anchor)) + '" x2="' + f(X(anchor) + lx) + '" y2="' + f(Y(anchor) - 6) + '" stroke="' + WHITE + '" stroke-opacity=".6"/>';
      s += '<text x="' + f(X(anchor) + lx + (lx > 0 ? 1 : -1)) + '" y="' + f(Y(anchor) - 7) + '" text-anchor="' + side + '">' + nt[0].toUpperCase() + '</text>';
      s += '<text x="' + f(X(anchor) + lx + (lx > 0 ? 1 : -1)) + '" y="' + f(Y(anchor) - 4.6) + '" text-anchor="' + side + '" fill-opacity=".6">' + nt[1].toUpperCase() + '</text></g>';
      if (noteEl) noteEl.textContent = nt[0] + ' / ' + nt[1];
    }

    if (mode === 'side') {
      var wx = w * .12;
      s += '<line x1="' + wx + '" y1="' + (-h / 2) + '" x2="' + wx + '" y2="' + (h / 2) + '" stroke="' + WHITE + '" stroke-opacity=".35"/>';
      var dep = function (k) {
        var base = { haL: 0, haR: 0, ftL: 0, ftR: 0, elL: 6, elR: 6, knL: 8, knR: 8, shL: 7, shR: 7, hiL: 10, hiR: 10, P: 10, S: 7, neck: 8, head: 10 }[k];
        if (k === 'haL' || k === 'haR' || k === 'ftL' || k === 'ftR') { var nm2 = { haL: 'hL', haR: 'hR', ftL: 'fL', ftR: 'fR' }[k]; base += Math.sin(Math.PI * L[nm2][2]) * 4; }
        if (k === 'hiL' || k === 'hiR' || k === 'P') base += Math.sin(Math.PI * L.prog) * (L.active[0] === 'h' ? 3 : -1.5);
        return base;
      };
      var JS = {}; Object.keys(J).forEach(function (k) { if (J[k] && J[k].length === 2) JS[k] = [dep(k) == null ? 6 : dep(k), J[k][1]]; });
      var XS = function (p) { return wx + p[0]; };
      for (var r = Math.floor((cy - 40) / D); r <= Math.ceil((cy + 40) / D); r++) {
        ORDER.forEach(function (nm3) { var yy = BASE[nm3][1] + D * r; s += '<path d="M' + wx + ' ' + f(Y([0, yy + 1.2])) + 'l1.6 1.4l-1.6 .4z" fill="none" stroke="' + WHITE + '" stroke-opacity=".38"/>'; });
      }
      s += figure(JS, XS, Y, MINT, false, 1);
      s += '<g fill="' + WHITE + '" font-family="DM Mono, monospace" font-size="1.7" fill-opacity=".55"><text x="' + f(-w / 2 + 6) + '" y="' + f(h / 2 - 4) + '">FRONT</text><text x="' + (wx + 2) + '" y="' + f(h / 2 - 4) + '">SIDE</text></g>';
      var hipOff = dep('P');
      s += '<g fill="' + WHITE + '" font-family="DM Mono, monospace" font-size="1.7"><line x1="' + wx + '" y1="' + f(Y(J.P) + 6) + '" x2="' + f(wx + hipOff) + '" y2="' + f(Y(J.P) + 6) + '" stroke="' + WHITE + '"/><text x="' + f(wx + hipOff + 2) + '" y="' + f(Y(J.P) + 6.8) + '">HIPS ' + Math.round(hipOff * 3) + ' CM OFF THE WALL</text></g>';
    }
    svg.innerHTML = s; fixStroke(svg);
    return L;
  }


    return { climb: drawClimb, roll: drawRoll, tc: tc };
  }
  function Grip(root) {
    var bp = root.closest('.bp'), E = GripEngine(bp.querySelector('.gp-note'));
    var hero = root.querySelector('.gp-hero svg'), an = bp.querySelector('.gp-an svg'), cmp = bp.querySelector('.gp-cmp svg');
    var tl = root.querySelector('.gp-tl'), tcEl = root.querySelector('.gp-tc'), bl = root.querySelector('.gp-bl'), br = root.querySelector('.gp-br');
    var sport = 'climb', T = 0, auto = true, sw = 0;
    var btns = bp.querySelectorAll('[data-gsport]');
    function set(s) {
      sport = s;
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.gsport === s ? 'true' : 'false'); });
      tl.textContent = s === 'climb' ? 'Board / 40\u00b0' : 'Open mat / round 3';
      br.textContent = s === 'climb' ? 'Climb' : 'Roll';
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { auto = false; set(b.dataset.gsport); }); });
    this.update = function (dt) {
      T += dt;
      if (auto && (sw += dt) > 11) { sw = 0; set(sport === 'climb' ? 'roll' : 'climb'); }
      if (sport === 'climb') { E.climb(hero, T, 'hero', 'hero'); bl.textContent = 'Tracking 15 points'; }
      else bl.textContent = E.roll(hero, T);
      tcEl.textContent = E.tc(T);
      if (an) E.climb(an, T + 2.3, 'an', 'an');
      if (cmp) E.climb(cmp, T + 1.1, 'friend', 'cmp');
    };
    set('climb');
    this.update(1.6);
  }

  // ---------- wiring ----------
  var all = [];
  document.querySelectorAll('.eltio [data-wf]').forEach(function (el) {
    var k = el.dataset.wf, o = k === 'desk' || k === 'phone' ? new El(el) : k === 'hero' ? new Hero(el) : k === 'sun' ? new SunPath(el) : k === 'scenes' ? new Scenes(el) : k === 'lampc' ? new LampC(el) : k === 'shop' ? new Shop(el) : k === 'spool' ? new Spool(el) : k === 'coach' ? new Coach(el) : k === 'cam' ? new Cam(el) : k === 'grip' ? new Grip(el) : k === 'brand' ? {} : null;
    if (!o) return;
    o.el = el; o.vis = false; all.push(o);
  });
  if (!all.length) return;
  function draw(o) { o.drawn = true; if (o.draw) o.draw(); else o.el.classList.add('drawn'); }
  if (reduce || !('IntersectionObserver' in window)) { all.forEach(draw); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var o = all.filter(function (x) { return x.el === e.target; })[0];
      o.vis = e.isIntersecting;
      if (o.vis && !o.drawn) setTimeout(function () { draw(o); }, 120);
      if (o.setLive) o.setLive(o.vis);
    });
  }, { threshold: .25 });
  all.forEach(function (o) { io.observe(o.el); });
  var last = performance.now();
  (function loop(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    all.forEach(function (o) {
      if (!o.vis || !o.drawn) return;
      if (o.update && !o.el.closest('.live.on')) o.update(dt);
      if (o.tick) o.tick();
    });
    requestAnimationFrame(loop);
  })(last);
})();

// Spoolends: + adds a pack to the cart; the strip pauses under a hand.
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('.eltio .se .add');
  if (!b) return;
  var panel = b.closest('.se'), c = panel.querySelector('.cartn');
  c.textContent = (+c.textContent || 0) + 1;
  b.classList.add('done'); setTimeout(function () { b.classList.remove('done'); }, 900);
});
