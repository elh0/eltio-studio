(() => {
  const $ = id => document.getElementById(id);
  const E = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const era = y => "'" + String(Math.floor(y / 10) * 10).slice(2) + "s";
  // works.json is written by the poster on the Mac: one row per work, "ig" + "posted" filled once it is live on @yapcine.
  // Only live works show, unless the page opts in to upcoming ones (the preview does).
  const upcoming = document.body.dataset.upcoming === "1";

  fetch("works.json", {cache: "no-cache"}).then(r => r.json()).then(all => {
    // newest post first, upcoming ones after
    const W = all.filter(w => w.ig || upcoming).sort((a, b) => (!a.posted) - (!b.posted) || (b.posted || "").localeCompare(a.posted || ""));
    if (!W.length) { $('empty').hidden = false; return; }

    const ERAS = [...new Set(W.map(w => Math.floor(w.y / 10) * 10))].sort().map(d => era(d));
    const CAPS = [...new Set(W.map(w => w.cap).filter(Boolean))];
    const PALS = ["black & white", "warm", "cool", "neon", "natural"].filter(p => W.some(w => w.pal === p));
    const st = {q: "", era: null, cap: null, pal: null};
    const words = w => [w.t, w.dir, w.y, era(w.y), (Math.floor(w.y / 10) * 10) + "s", w.pal, w.pal === "black & white" ? "black and white bw mono" : "", w.cap, ...(w.fx || [])].join(" ").toLowerCase();
    const show = w => (!st.q || st.q.toLowerCase().split(/\s+/).every(t => words(w).includes(t))) && (!st.era || era(w.y) === st.era) && (!st.cap || w.cap === st.cap) && (!st.pal || w.pal === st.pal);
    const io = new IntersectionObserver(es => es.forEach(e => { const v = e.target;
      if (e.isIntersecting) { if (!v.getAttribute('src')) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }), {rootMargin: "300px"});

    // a different opening loop each visit
    const pick = W[Math.floor(Math.random() * W.length)];
    $('hero').src = `v/h_${pick.h}.mp4`;
    $('now').textContent = `${pick.t.toLowerCase()} · ${pick.dir.toLowerCase()} · ${pick.y}`; $('now').href = pick.ig || pick.src;

    const chip = (k, v) => `<button class="chip" type="button" data-k="${k}" data-v="${E(v)}" aria-pressed="${st[k] === v}">${E(v)}</button>`;
    function chips() {
      $('chips').innerHTML = ERAS.map(v => chip('era', v)).join('') + (CAPS.length ? '<span class="sep"></span>' + CAPS.map(v => chip('cap', v)).join('') : '')
        + '<span class="sep"></span>' + PALS.map(v => chip('pal', v)).join('') + `<span class="count m q" id="n"></span>`;
      $('chips').querySelectorAll('.chip').forEach(b => b.onclick = () => { st[b.dataset.k] = st[b.dataset.k] === b.dataset.v ? null : b.dataset.v; chips(); feed(); });
    }
    function feed() {
      const r = W.filter(show);
      $('feed').innerHTML = r.map(w => `<button type="button" data-id="${E(w.id)}" aria-label="${E(w.t)}, ${w.y}"><video data-src="v/${E(w.g)}.mp4" muted loop playsinline></video>${w.ig ? '' : '<span class="soon">soon</span>'}<span class="tt">${E(w.t)} · ${w.y}</span></button>`).join('');
      $('feed').querySelectorAll('video').forEach(v => io.observe(v));
      $('empty').hidden = r.length > 0; $('n').textContent = `${r.length}/${W.length}`;
    }
    $('q').addEventListener('input', e => { st.q = e.target.value.trim(); feed(); });
    $('q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.target.blur(); $('chips').scrollIntoView({behavior: 'smooth'}); } });

    // lightbox: the loop big, title, director, the @yapcine post and the official source
    const lb = $('lb');
    $('feed').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (!b) return; const w = W.find(x => x.id === b.dataset.id);
      $('lbv').src = `v/${w.g}.mp4`; $('lbv').play().catch(() => {});
      $('lbt').textContent = `${w.t} · ${w.y}`; $('lbd').textContent = w.dir;
      $('lbi').hidden = !w.ig; if (w.ig) $('lbi').href = w.ig; $('lba').href = w.src;
      lb.hidden = false; document.body.style.overflow = 'hidden'; });
    const shut = () => { lb.hidden = true; $('lbv').pause(); $('lbv').removeAttribute('src'); document.body.style.overflow = ''; };
    lb.addEventListener('click', e => { if (!e.target.closest('a')) shut(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) shut(); });

    chips(); feed();
  }).catch(() => { $('empty').hidden = false; });
})();
