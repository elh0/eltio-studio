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
  function setTap(i, force) { if (i === cur && !force) return; cur = i; scrs = $$("#phone .scr"); scrs.forEach(function (s, j) { s.classList.toggle("on", j === i); }); taps.forEach(function (t, j) { t.classList.toggle("cur", j === i); }); }
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
  var wrap = $("#wrap"), live = $("#live"), RATE = 450, HR = RATE / 10, BAND = 1.5, last = RATE;
  function hm(m) { m = m % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
  function drawLive() {
    var v = +wrap.value, wm = 19 * 60 + v * 30, norm = Math.min(v, 10), late = Math.max(0, v - 10);
    var otN = norm * .5 * HR * BAND, otL = late * .5 * HR * 3, tot = RATE + otN + otL;
    var h = '<div class="ln"><span>Day rate, call 08:00</span><b>' + gbp2(RATE) + "</b></div>";
    if (norm) h += '<div class="ln"><span>Overtime, ' + norm / 2 + (norm === 2 ? " hr" : " hrs") + " at " + BAND + "x</span><b>" + gbp2(otN) + "</b></div>";
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

  /* ---- run it as: the hero cards, the three taps and the wrap follow your job ---- */
  function card(c, red) { return '<div class="fl' + (red ? " red" : "") + '" style="--z:' + c.z + ';--x:' + c.x + ';--y:' + c.y + ';--r:' + c.r + '"><div class="fl-top"><span class="lab">' + c.l + '</span><span class="tag' + (c.tc ? " " + c.tc : "") + '">' + c.t + '</span></div><span class="fl-s">' + c.s + "</span><b>" + c.b + "</b></div>"; }
  var POS = [{ z: "60px", x: "-40px", y: "-150px", r: "-6deg" }, { z: "0px", x: "60px", y: "0px", r: "4deg" }, { z: "140px", x: "-20px", y: "150px", r: "-3deg" }];
  function row(a, b, cls) { return '<div class="scr-row' + (cls ? " " + cls : "") + '"><span>' + a + "</span><b>" + b + "</b></div>"; }
  function scard(l, b, q) { return '<div class="scr-card"><span class="lab">' + l + "</span><b>" + b + '</b><span class="scr-q">' + q + "</span></div>"; }
  function scr(lab, body, btn, red) { return '<div class="scr"><span class="lab">' + lab + "</span>" + body + '<span class="scr-btn' + (red ? " red" : "") + '">' + btn + "</span></div>"; }
  function wrapTap(n) { return scr("Day 2 · call 06:30", '<div class="scr-big">20:30</div><span class="scr-q c">Wrap, logged for ' + n + "</span>" + scard("On overtime", "18 crew", "Worked out at each person's band"), "Wrap", 1); }
  var PAY = scr("Pay run · Friday", row("30 invoices match", "£21,480") + row("2 queries drafted", "−£26.25", "amber") + row("Paid in 7 days", "APA terms", "q"), "Approve the run");
  var CREW = { gaffer: ["Gaffer", 450, 1.5, "Lighting package", 120], grip: ["Grip", 420, 1.5, "Dolly and track", 150], camera: ["1st AC", 480, 1.25, "Focus kit", 85], sound: ["Sound recordist", 520, 1.25, "Sound package", 200], art: ["Art director", 400, 1.5, "Props van", 60] };
  var ROLES = {
    prod: { n: "Producer", lede: "Advances, crew invoices, permits and clients, run from your phone. If you can send a text, you can run Systems.",
      cards: [{ l: "Award · 09:12", t: "Drafted", s: "Advance invoice, 50%", b: "£42,000" }, { l: "Crew invoices · 32", t: "30 match", tc: "ok", s: "Into the 7-day run", b: "£21,480" }, { l: "On set · 14:31", t: "Approved", tc: "paper", s: "The canal shot, by the agency", b: "+£5,220" }],
      taps: [["Forward the award email.", "The 50% advance and the balance are drafted, with the dates in your calendar.", scr("Inbox · 09:12", '<p class="scr-mail">Re: Sportswear spot<br><b>We\'d love to go with you.</b></p>' + scard("Advance, 50%", "£42,000.00", "Due 7 days before the shoot"), "Send the invoice")],
        ["Tap wrap.", "Once a day, for the whole unit. Every crew member's overtime is worked out.", wrapTap("32 crew")],
        ["Approve the pay run.", "Every crew invoice is read and checked first. The odd one out gets a polite query.", PAY]] },
    pm: { n: "Production manager", lede: "Permits, start packs, holds and the pay run, without keeping any of it in your head.",
      cards: [{ l: "Start packs · 14 crew", t: "3 to chase", tc: "ok", s: "Bank, UTR, right to work", b: "11 of 14" }, { l: "Permits", t: "This week", s: "Westminster, 3 working days", b: "8 days" }, { l: "Holds · Tue, Wed", t: "Booked", tc: "paper", s: "Northbound Films, confirmed", b: "32 crew" }],
      taps: [["Add the shoot date.", "Every permit and licence deadline is counted back from it, with the urgent ones first.", scr("Shoot in 26 days", row("Child licence", "apply now", "amber") + row("City of London", "by 29 Oct") + row("Westminster", "by 12 Nov"), "Start the applications")],
        ["Drop in the crew list.", "Start packs go out and get chased: bank details, UTR, right to work.", scr("Start packs · 14 crew", row("Back and complete", "11") + row("Sound recordist, UTR", "chase", "amber") + row("Runner, right to work", "chase", "amber"), "Send the chasers")],
        ["Approve the pay run.", "Every crew invoice is checked against the deal before it goes in the 7-day run.", PAY]] },
    dir: { n: "Director", lede: "Holds from every company in one diary, with fees and your rep's cut kept straight.",
      cards: [{ l: "12 to 14 Nov", t: "Clash", s: "Two first pencils on the 13th", b: "3 holds" }, { l: "Sportswear spot", t: "Statement", tc: "ok", s: "To you, after 20% commission", b: "£4,800" }, { l: "Awards", t: "12 days", tc: "paper", s: "Craft entry, credits drafted", b: "Enter" }],
      taps: [["Forward the hold email.", "Every pencil from every company lands in one diary, and clashes are caught.", scr("12 to 14 Nov", row("Northbound Films", "1st · 12, 13") + row("Field &amp; Co", "1st · 13, 14", "amber") + row("Low Tide", "2nd · 14", "q"), "Ask Northbound to confirm")],
        ["Confirm the job.", "The booking note is written and the fee statement set up, with your rep's cut.", scr("Sportswear spot", scard("To you", "£4,800.00", "Fee £6,000, rep 20%"), "Send the booking note")],
        ["Enter the awards.", "Deadlines tracked, with credits for every job ready to paste in.", scr("Entries · 3 open", row("UK music video awards", "12 days", "amber") + row("Craft awards", "26 days") + row("European festival", "41 days", "q"), "Open the entry")]] },
    hod: { n: "Head of department", lede: "Your whole department's hours and kit on one sheet, ready to send up.",
      cards: [{ l: "Lighting · wrap 20:00", t: "4 crew", s: "Department total", b: "£2,172.50" }, { l: "Kit · 3 days", t: "Ready", tc: "ok", s: "Lighting package", b: "£360" }, { l: "Days 3 and 4", t: "Check", tc: "paper", s: "Rest between days", b: "7.5 hrs" }],
      taps: [["Add your team.", "Each person's rate and band, set once for the job.", scr("Lighting · 4 crew", row("Gaffer", "£450 · 1.5x") + row("Rigging gaffer", "£400 · 1.5x") + row("Desk op, spark", "£380, £350"), "Save the team")],
        ["Tap wrap.", "One wrap time, and every person's day is worked out at their band.", wrapTap("your team")],
        ["Send the department sheet.", "Hours, overtime and kit hire in one sheet for the production.", scr("Lighting · Day 2", scard("Department", "£2,172.50", "4 crew, wrap 20:00"), "Send to production")]] }
  };
  Object.keys(CREW).forEach(function (k) {
    var c = CREW[k], ot = 3 * (c[1] / 10) * c[2], days = 3 * c[1] + 3 * ot + 30, tot = days + c[4] * 3 + 41.4;
    ROLES[k] = { n: c[0], crew: c, lede: "Your days, overtime, kit and miles on one invoice, worked out from the call sheet and the wrap.",
      cards: [{ l: "Next week", t: "1st pencil", s: "Northbound Films, Tue and Wed", b: "2 days" }, { l: "Day 2 · wrap 20:30", t: c[2] + "x band", tc: "ok", s: "Overtime, 3 hrs", b: gbp2(ot) }, { l: "INV-2026-015", t: "Ready", tc: "paper", s: "Days, " + c[3].toLowerCase() + " and miles", b: gbp(Math.round(tot)) }],
      taps: [["Log the hold.", "Pencils logged by who and when. Confirm one and the booking note is written.", scr("Next week", row("Northbound Films", "Tue, Wed") + row("Moved to 1st pencil", "today", "amber") + row("Confirm by Friday", "drafted", "q"), "Send the booking note")],
        ["Tap wrap.", "Your overtime at your band, the late break and turnaround, worked out for you.", scr("Day 2 · call 06:30", '<div class="scr-big">20:30</div>' + scard("Overtime, 3 hrs at " + c[2] + "x", gbp2(ot), c[0] + ", £" + c[1] + " day"), "Wrap", 1)],
        ["Send the invoice.", "Days, overtime, your " + c[3].toLowerCase() + " and the miles, on one invoice.", scr("INV-2026-015 · draft", row("3 days and overtime", gbp(Math.round(days))) + row(c[3] + ", 3 days", gbp(c[4] * 3)) + row("Mileage, 92 miles", "£41.40", "q"), "Send the invoice")]] };
  });
  var ORDER = ["prod", "pm", "dir", "hod", "gaffer", "grip", "camera", "sound", "art"], role = "prod";
  try { var saved = localStorage.getItem("sys-role"); if (ROLES[saved]) role = saved; } catch (e) {}
  var pills = $("#whoPills");
  pills.innerHTML = ORDER.map(function (k) { return '<button type="button" role="radio" data-r="' + k + '">' + ROLES[k].n + "</button>"; }).join("");
  function render(k) {
    var R = ROLES[k]; role = k;
    try { localStorage.setItem("sys-role", k); } catch (e) {}
    $$("button", pills).forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-r") === k ? "true" : "false"); });
    $("#asName").textContent = R.n;
    $("#lede").textContent = R.lede;
    inner.innerHTML = R.cards.map(function (c, i) { var p = POS[i]; return card({ l: c.l, t: c.t, tc: c.tc, s: c.s, b: c.b, z: p.z, x: p.x, y: p.y, r: p.r }, i === 2); }).join("");
    $("#phone .ph-screens").innerHTML = R.taps.map(function (t) { return t[2]; }).join("");
    taps.forEach(function (el, i) { $("h3", el).textContent = R.taps[i][0]; $("p", el).textContent = R.taps[i][1]; var m = $(".mob-screen", el); m.innerHTML = R.taps[i][2]; $(".scr", m).classList.add("on"); });
    setTap(cur < 0 ? 0 : cur, true);
    var c = R.crew || CREW.gaffer; RATE = c[1]; HR = RATE / 10; BAND = c[2];
    $("#liveWho").textContent = (R.crew ? "You, " + c[0].toLowerCase() : "Your gaffer") + " · £" + c[1] + " · APA";
    $("#wrapH").textContent = R.crew ? "You wrapped late. What are you owed?" : "They wrapped late. What do you owe?";
    $("#wrapP").textContent = R.crew ? "Drag the wrap. Your overtime at your band, worked out before you invoice." : "Drag the wrap. This is how every crew invoice is checked, on APA terms, before you pay it.";
    last = RATE; drawLive();
  }
  $$("button", pills).forEach(function (b) { b.addEventListener("click", function () { render(b.getAttribute("data-r")); }); });
  render(role);

})();
