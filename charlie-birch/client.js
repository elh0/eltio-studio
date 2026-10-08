/* Charlie Birch page: saves what's typed, ticked and signed on this device, and sends it to Eltio. */
(function () {
  var KEY = 'eltio-charlie-birch-v1';
  var TO = 'hello@eltio.studio';
  var SCHEMA = [
    ['Getting in touch', [['wa', 'WhatsApp number'], ['drive', 'Google Drive folder'], ['times', 'Good times for the two sessions']]],
    ['References', [['ref1', '(1)'], ['ref2', '(2)'], ['ref3', '(3)'], ['ref4', '(4)'], ['ref5', '(5)']]],
    ['Project list', [['sheet', 'Spreadsheet link'], ['films', 'Films, if any']]],
    ['Info page', [['bio', 'Bio'], ['agent', 'Agent or rep'], ['contact', 'Email and Instagram'], ['clients', 'Clients, publications, shows']]],
    ['Brainrot', [['br-what', 'What Brainrot makes, and for which brands'], ['br-feel', 'How it should feel, in one line']]]
  ];
  var TICKS = [['c-refs', 'References'], ['c-list', 'Project list'], ['c-films', 'Films on Vimeo'], ['c-photos', 'Photographs in the folder'], ['c-credits', 'Credits checked'], ['c-bio', 'Bio and contacts'], ['c-domain', 'Domain'], ['c-cargo', 'Cargo and GitHub'], ['c-vimeo', 'Vimeo']];
  var SIGNS = [['proposal', 'Proposal No. 001 (two sites, £1,000, £500 deposit)'], ['terms', 'Terms (2026)']];

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  var data = load(); data.f = data.f || {}; data.s = data.s || {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } }
  function $(s, r) { return (r || document).querySelectorAll(s); }
  function fmt(iso) { var d = new Date(iso); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }

  // fields and ticks: every element with data-k is saved; elements sharing a key stay in step
  function sync(k, v, from) {
    $('[data-k="' + k + '"]').forEach(function (el) {
      if (el === from) return;
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v || '';
    });
  }
  $('[data-k]').forEach(function (el) {
    var k = el.dataset.k, v = data.f[k];
    if (el.type === 'checkbox') el.checked = !!v; else if (v != null) el.value = v;
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', function () {
      data.f[k] = el.type === 'checkbox' ? el.checked : el.value;
      var ok = save(); sync(k, data.f[k], el); flash(ok); status();
    });
  });
  var t; function flash(ok) { $('.saved').forEach(function (s) { s.textContent = ok ? 'Saved on this device' : 'This browser won\'t save, so press Send as you go'; }); clearTimeout(t); t = setTimeout(function () { $('.saved').forEach(function (s) { s.textContent = ''; }); }, 1800); }

  // signing: type your name, draw if you like, tick agree, sign
  $('.signbox').forEach(function (box) {
    var id = box.dataset.sign;
    var form = box.querySelector('.form'), done = box.querySelector('.done');
    var name = box.querySelector('.nm'), agree = box.querySelector('.ag'), go = box.querySelector('.go');
    var pad = box.querySelector('.pad'), ctx = pad.getContext('2d'), drawn = false, last = null;
    function size() {
      var r = pad.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      if (!r.width) return;
      pad.width = Math.round(r.width * dpr); pad.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0B0B0A'; drawn = false;
    }
    size(); window.addEventListener('resize', function () { if (!drawn) size(); });
    function pt(e) { var r = pad.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    pad.addEventListener('pointerdown', function (e) { pad.setPointerCapture(e.pointerId); last = pt(e); });
    pad.addEventListener('pointermove', function (e) { if (!last) return; var p = pt(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p; drawn = true; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { pad.addEventListener(ev, function () { last = null; }); });
    box.querySelector('.clr').addEventListener('click', function () { size(); });
    function ready() { go.disabled = !(name.value.trim() && agree.checked); }
    name.addEventListener('input', ready); agree.addEventListener('change', ready); ready();
    go.addEventListener('click', function () {
      data.s[id] = { name: name.value.trim(), at: new Date().toISOString(), img: drawn ? pad.toDataURL('image/png') : '' };
      save(); show(); status();
    });
    box.querySelector('.undo').addEventListener('click', function () { delete data.s[id]; save(); show(); status(); size(); });
    function show() {
      var s = data.s[id];
      form.hidden = !!s; done.hidden = !s;
      if (s) {
        done.querySelector('.who').textContent = s.name;
        done.querySelector('.when').textContent = fmt(s.at);
        var img = done.querySelector('img');
        if (s.img) { img.src = s.img; img.hidden = false; } else img.hidden = true;
      } else { setTimeout(size, 0); }
    }
    show();
  });

  // progress on the main page
  function status() {
    $('[data-state]').forEach(function (el) {
      var w = el.dataset.state, ok = false, txt = 'Open';
      if (w === 'proposal' || w === 'terms') { ok = !!data.s[w]; txt = ok ? 'Signed' : 'To sign'; }
      if (w === 'start') { var n = TICKS.filter(function (c) { return data.f[c[0]]; }).length; ok = n === TICKS.length; txt = n + ' of ' + TICKS.length + ' done'; }
      if (w === 'roadmap') { ok = !!data.f['read-roadmap']; txt = ok ? 'Read' : 'Start here'; }
      el.textContent = txt; el.classList.toggle('ok', ok);
    });
    $('.steps li[data-step]').forEach(function (li) {
      var w = li.dataset.step, ok = false;
      if (w === 'roadmap') ok = !!data.f['read-roadmap'];
      if (w === 'proposal' || w === 'terms') ok = !!data.s[w];
      if (w === 'send') ok = !!data.f['sent'];
      li.classList.toggle('ok', ok);
    });
  }
  status();
  var pg = document.querySelector('[data-page]'); if (pg && pg.dataset.page === 'roadmap') { data.f['read-roadmap'] = true; save(); }

  // the summary that goes to Eltio
  function summary() {
    var L = ['Charlie Birch and Brainrot', 'From eltio.studio/charlie-birch, ' + fmt(new Date().toISOString()), ''];
    SIGNS.forEach(function (s) {
      var g = data.s[s[0]];
      L.push(s[1].toUpperCase());
      L.push(g ? 'Signed by ' + g.name + ', ' + fmt(g.at) + (g.img ? ' (drawn signature on the saved copy)' : '') : 'Not signed yet');
      L.push('');
    });
    SCHEMA.forEach(function (sec) {
      var rows = sec[1].filter(function (r) { return (data.f[r[0]] || '').trim(); });
      if (!rows.length) return;
      L.push(sec[0].toUpperCase());
      rows.forEach(function (r) { L.push(r[1] + ': ' + data.f[r[0]].trim()); });
      L.push('');
    });
    L.push('CHECKLIST');
    TICKS.forEach(function (c) { L.push((data.f[c[0]] ? '[x] ' : '[ ] ') + c[1]); });
    return L.join('\n');
  }
  function mail() {
    var who = (data.s.proposal && data.s.proposal.name) || (data.s.terms && data.s.terms.name) || 'Charlie Birch';
    return 'mailto:' + TO + '?subject=' + encodeURIComponent('Signed: ' + who + ' and Brainrot') + '&body=' + encodeURIComponent(summary());
  }

  // a signed copy to keep or attach: one image with both signatures and the answers
  function copyImage() {
    var lines = summary().split('\n'), W = 1240, P = 64, LH = 32;
    var sigs = SIGNS.map(function (s) { return data.s[s[0]]; }).filter(function (g) { return g && g.img; });
    var H = P * 2 + lines.length * LH + sigs.length * 200 + 40;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#0B0B0A'; x.font = '22px "Geist Mono", ui-monospace, Menlo, monospace';
    var y = P;
    lines.forEach(function (l) {
      var words = l.split(' '), line = '';
      words.forEach(function (w) { var test = line ? line + ' ' + w : w; if (x.measureText(test).width > W - P * 2 && line) { x.fillText(line, P, y); y += LH; line = w; } else line = test; });
      x.fillText(line, P, y); y += LH;
    });
    var jobs = sigs.map(function (g) { return new Promise(function (res) { var im = new Image(); im.onload = function () { res([g, im]); }; im.onerror = function () { res(null); }; im.src = g.img; }); });
    return Promise.all(jobs).then(function (arr) {
      arr.forEach(function (a) { if (!a) return; y += 20; x.fillText(a[0].name, P, y); x.drawImage(a[1], P, y + 10, 400, 400 * a[1].height / a[1].width); y += 190; });
      var out = document.createElement('canvas'); out.width = W; out.height = Math.min(H, y + P);
      out.getContext('2d').drawImage(c, 0, 0);
      return out.toDataURL('image/png');
    });
  }

  $('.sendbar').forEach(function (bar) {
    bar.innerHTML = '<div class="btns"><a class="btn solid" target="_top" href="#">Send to Eltio</a><button class="btn" type="button">Save a signed copy</button><button class="btn" type="button">Copy everything</button></div>' +
      '<p class="note">Send opens an email to us with your signatures and everything you\'ve filled in. If it doesn\'t open, use Copy everything and paste it into an email to ' + TO + '. Send again whenever you\'ve added more.</p>';
    var a = bar.querySelector('a'), b = bar.querySelectorAll('button');
    a.addEventListener('click', function () { a.href = mail(); data.f['sent'] = true; save(); status(); });
    b[0].addEventListener('click', function () {
      copyImage().then(function (url) { var d = document.createElement('a'); d.href = url; d.download = 'charlie-birch-signed-copy.png'; document.body.appendChild(d); d.click(); d.remove(); });
    });
    b[1].addEventListener('click', function () {
      var txt = summary(), done = function (ok) { b[1].textContent = ok ? 'Copied' : 'Select and copy below'; setTimeout(function () { b[1].textContent = 'Copy everything'; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { fallback(txt); done(false); });
      else { fallback(txt); done(false); }
    });
    function fallback(txt) { var ta = bar.querySelector('textarea') || bar.appendChild(Object.assign(document.createElement('textarea'), { className: 'ta', readOnly: true })); ta.value = txt; ta.style.minHeight = '12em'; ta.select(); }
  });

  // project list template, as a spreadsheet file
  $('[data-csv]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var csv = 'Title,Client / publication,Type,Credits,Year,Images,Film\nSeries title,Self-published,Personal,"Name, role",2026,24,\nCampaign title,Brand name,Commission,"Stylist, agency",2025,12,\n';
      var d = document.createElement('a'); d.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); d.download = 'charlie-birch-project-list.csv'; document.body.appendChild(d); d.click(); d.remove();
    });
  });
})();
