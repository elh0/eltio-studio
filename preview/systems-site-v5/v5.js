/* Systems, design 5: clock, floating cards, the turning phone, drag the wrap, the client's yes, one feature at a time. */
(function () {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function gbp(n) { return "£" + n.toLocaleString("en-GB", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function gbp2(n) { return "£" + n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function countUp(el, from, to, fmt, ms) {
    if (reduce) { el.textContent = fmt(to); return; }
    var t0 = performance.now();
    (function f(t) { var k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(f); })(t0);
  }
  var timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, reduce ? 0 : ms)); }

  /* ---- London clock, like a timecode ---- */
  var clock = $("#clock");
  function tick() { try { clock.textContent = "London " + new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" }); } catch (e) {} }
  tick(); setInterval(tick, 15000);

  /* ---- reveal ---- */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } });
  }, { threshold: 0.15 }) : null;
  function watch(el, d) { el.classList.add("rv"); if (d) el.style.transitionDelay = d + "ms"; if (io) io.observe(el); else el.classList.add("on"); }
  $$(".hero-copy > *").forEach(function (el, i) { watch(el, i * 80); });
  $$(".easy-h > *, .after, .wrap-copy > *, .cl-copy > *, .more-h > *, .drive-copy > *, .faq .h2, .qa details, .close > *").forEach(function (el, i) { watch(el, (i % 4) * 70); });
  watch($("#live"), 120); watch($("#cr"), 120);

  /* ---- floating cards: the group tilts toward the pointer, and drifts as you scroll ---- */
  var float = $("#float"), inner = document.createElement("div");
  inner.className = "float-in"; while (float.firstChild) inner.appendChild(float.firstChild); float.appendChild(inner);
  var px = 0, py = 0;
  function tilt() { var s = Math.min(1, scrollY / 600); inner.style.transform = "rotateX(" + (8 - py * 10 + s * 14) + "deg) rotateY(" + (-10 + px * 14) + "deg) translateY(" + (-s * 40) + "px)"; }
  if (!reduce) {
    addEventListener("pointermove", function (e) { if (e.pointerType !== "mouse") return; px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5; tilt(); }, { passive: true });
    addEventListener("deviceorientation", function (e) { if (e.gamma == null) return; px = Math.max(-.5, Math.min(.5, e.gamma / 60)); py = Math.max(-.5, Math.min(.5, (e.beta - 45) / 90)); tilt(); }, { passive: true });
  }
  tilt();

  /* ---- three taps: the phone turns as you scroll, its screen follows the step ---- */
  var taps = $$(".tap"), phone = $("#phone"), scrs = $$("#phone .scr"), cur = -1;
  taps.forEach(function (t, i) { var c = scrs[i].cloneNode(true); c.classList.add("on"); $(".mob-screen", t).appendChild(c); });
  function setTap(i) { if (i === cur) return; cur = i; scrs.forEach(function (s, j) { s.classList.toggle("on", j === i); }); taps.forEach(function (t, j) { t.classList.toggle("cur", j === i); }); }
  setTap(0);
  var easy = $(".easy-in");
  function onScroll() {
    tilt();
    var mid = innerHeight * .5, si = 0;
    taps.forEach(function (t, i) { if (t.getBoundingClientRect().top < mid) si = i; });
    setTap(si);
    if (reduce) return;
    var r = easy.getBoundingClientRect(), k = Math.max(0, Math.min(1, (mid - r.top) / r.height));
    phone.style.setProperty("--ry", (-22 + k * 44).toFixed(2) + "deg");
    phone.style.setProperty("--rx", (10 - k * 6).toFixed(2) + "deg");
  }
  addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll); onScroll();

  /* ---- drag the wrap ---- */
  var wrap = $("#wrap"), live = $("#live"), RATE = 450, HR = RATE / 10, last = RATE;
  function hm(m) { m = m % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
  function drawLive() {
    var v = +wrap.value, wm = 19 * 60 + v * 30, norm = Math.min(v, 10), late = Math.max(0, v - 10);
    var otN = norm * .5 * HR * 1.5, otL = late * .5 * HR * 3, tot = RATE + otN + otL;
    var h = '<div class="ln"><span>Day rate, call 08:00</span><b>' + gbp2(RATE) + "</b></div>";
    if (norm) h += '<div class="ln"><span>Overtime, ' + norm / 2 + (norm === 2 ? " hr" : " hrs") + " at 1.5x</span><b>" + gbp2(otN) + "</b></div>";
    if (late) h += '<div class="ln"><span>After midnight, ' + late / 2 + (late === 2 ? " hr" : " hrs") + " at 3x</span><b>" + gbp2(otL) + "</b></div>";
    $("#liveLines").innerHTML = h;
    $("#liveTime").textContent = "Wrap " + hm(wm); wrap.setAttribute("aria-valuetext", hm(wm));
    live.classList.toggle("night", late > 0);
    var from = last; last = tot; countUp($("#liveTot"), from, tot, function (x) { return gbp(Math.round(x * 100) / 100); }, 350);
  }
  wrap.addEventListener("input", drawLive); drawLive();
  var touched = false; wrap.addEventListener("pointerdown", function () { touched = true; });
  if (!reduce && io) new IntersectionObserver(function (es, o) { if (!es[0].isIntersecting) return; o.disconnect(); var s = [2, 4, 6, 4, 2, 0], i = 0; (function st() { if (touched || i >= s.length) return; wrap.value = s[i++]; drawLive(); setTimeout(st, 420); })(); }, { threshold: .6 }).observe(live);

  /* ---- the client's yes ---- */
  var CR = [["32 crew, 2 hrs overtime", 3840], ["Canal location fee", 1200], ["Unit move, van and parking", 180]], T = 5220;
  var btn = $("#crBtn"), body = $("#crBody"), again = $("#crReset"), step = 0;
  btn.addEventListener("click", function () {
    step++;
    if (step === 1) {
      body.innerHTML = '<div class="lines" data-r></div><div class="big"><span class="lab">The extra</span><b data-t>£0</b></div>';
      var R = $("[data-r]", body); CR.forEach(function (x, i) { later(function () { R.insertAdjacentHTML("beforeend", '<div class="ln"><span>' + x[0] + "</span><b>" + gbp2(x[1]) + "</b></div>"); }, 120 + i * 260); });
      later(function () { countUp($("[data-t]", body), 0, T, gbp2, 700); }, 900);
      btn.textContent = "Send it to the agency";
    } else if (step === 2) {
      body.innerHTML = '<span class="lab" style="margin-bottom:8px">What they see. No login.</span><div class="cview"><b>Canal shot after lunch, ' + gbp2(T) + "</b><span>Two hours' overtime for the unit, the location and the move.</span><div class=\"opts\"><span class=\"yes\">Approve</span><span>Ask a question</span></div></div>";
      btn.textContent = "They tap approve";
    } else {
      var y = $(".yes", body); if (y) y.classList.add("tapd");
      btn.hidden = true;
      later(function () {
        body.innerHTML = '<div class="ok-stamp"><span class="lab">Approved · 14:31 · in writing</span><b>Logged to the budget</b><span>Budget now <span data-t>£84,000</span>, and it\'s on the balance invoice.</span></div>';
        countUp($("[data-t]", body), 84000, 84000 + T, function (x) { return gbp(Math.round(x)); }, 900);
        again.hidden = false;
      }, 450);
    }
  });
  again.addEventListener("click", function () { step = 0; body.innerHTML = ""; btn.textContent = "Cost it"; btn.hidden = false; again.hidden = true; btn.focus(); });

  /* ---- the rest: one feature at a time ---- */
  var F = [
    ["Permit clock", "Every borough, Royal Parks, drone and child-licence deadline counted back from your shoot date.", 0],
    ["Start packs", "Bank details, UTR and right to work chased from every crew member before day one.", 0],
    ["Chasing", "A friendly nudge, a firm one, then the Late Payment Act. Drafted for you to send.", 1],
    ["Holds and pencils", "First and second pencils logged, with confirm-or-release notes written for you.", 1],
    ["Status link", "One page per job showing the agency where it is and what's waiting on them.", 0],
    ["Client notes", "Each client's PO rules, accounts inbox and payment day, used on every invoice.", 0],
    ["Rights and usage", "Usage end dates from every contract, with a renewal quote drafted before they lapse.", 0],
    ["Cash forecast", "Thirteen weeks of money in and out across every open job.", 0],
    ["Wrap report", "Budget against actual, with every approved extra and who approved it.", 0],
    ["Call sheets", "Call times and locations read from your call sheet, so the days log themselves.", 0],
    ["VAT and tax dates", "Your rolling turnover against the VAT threshold, with Self Assessment and MTD dates.", 1],
    ["Kit and POs", "Hire quotes compared, POs drafted, return dates and hire invoices matched.", 0]
  ];
  var chips = $("#chips"), out = $("#chipOut");
  chips.innerHTML = F.map(function (f, i) { return '<button role="tab" type="button" aria-selected="false" data-i="' + i + '">' + (f[2] ? "<i></i>" : "") + f[0] + "</button>"; }).join("");
  function pick(i) {
    var f = F[i];
    $$("button", chips).forEach(function (b, j) { b.setAttribute("aria-selected", j === i ? "true" : "false"); });
    out.innerHTML = '<span class="lab">' + (f[2] ? "In the app now" : "In the company pilot") + "</span><h3>" + f[0] + "</h3><p>" + f[1] + "</p>";
  }
  $$("button", chips).forEach(function (b) { b.addEventListener("click", function () { pick(+b.getAttribute("data-i")); }); });
  pick(0);

  /* ---- the sheet settles as it comes into view ---- */
  var sheet = $(".sheet");
  if (io) new IntersectionObserver(function (es) { sheet.classList.toggle("flat", es[0].isIntersecting); }, { threshold: .5 }).observe(sheet);
})();
