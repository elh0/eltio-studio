/* Systems sales site: sky by chapter, the drag-the-wrap calculator, role demos, 26 jobs. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function gbp(n) { return "£" + n.toLocaleString("en-GB", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function gbp2(n) { return "£" + n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function countUp(el, to, fmt, ms) {
    fmt = fmt || function (v) { return Math.round(v); };
    if (reduce) { el.textContent = fmt(to); return; }
    var t0 = performance.now(); ms = ms || 1100;
    (function f(t) { var k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(f); })(t0);
  }
  var timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, reduce ? 0 : ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ---- sky follows the chapter nearest the middle of the screen ---- */
  var chapters = $$("[data-sky]").filter(function (el) { return el !== root; });
  function setSky() {
    var mid = innerHeight * 0.5, best = null;
    chapters.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) best = el; });
    if (best) root.setAttribute("data-sky", best.getAttribute("data-sky"));
  }
  addEventListener("scroll", setSky, { passive: true }); addEventListener("resize", setSky); setSky();

  /* ---- reveal + counters ---- */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target; el.classList.add("on"); io.unobserve(el);
      $$("[data-count]", el).forEach(function (c) { var to = +c.getAttribute("data-count"), suf = c.getAttribute("data-suffix") || ""; countUp(c, to, function (v) { return Math.round(v) + suf; }, 1400); });
    });
  }, { threshold: 0.18 }) : null;
  function watch(el, delay) { el.classList.add("rv"); if (delay) el.style.transitionDelay = delay + "ms"; if (io) io.observe(el); else el.classList.add("on"); }
  $$(".hero-copy > *").forEach(function (el, i) { watch(el, i * 70); });
  watch($("#live"), 200);
  $$(".sec-h, .nums-after, .all-h p, .drive-copy > *, .close > *").forEach(function (el) { watch(el); });
  $$(".num").forEach(function (el, i) { watch(el, i * 90); });
  $$(".step").forEach(function (s) { $$(".when, .what, .mini", s).forEach(function (el, i) { watch(el, i * 80); }); });
  $$(".sheet, .qa details").forEach(function (el, i) { watch(el, (i % 6) * 60); });

  /* ---- the live thing: drag the wrap ---- */
  var wrap = $("#wrap"), live = $("#live"), RATE = 450, HR = RATE / 10, BAND = 1.5;
  function hm(m) { m = m % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
  var lastTot = RATE;
  function drawLive() {
    var v = +wrap.value, wm = 19 * 60 + v * 30, halves = v, norm = Math.min(halves, 10), late = Math.max(0, halves - 10);
    var otN = norm * 0.5 * HR * BAND, otL = late * 0.5 * HR * 3, tot = RATE + otN + otL;
    var html = '<div class="ln"><span>Day rate, call 08:00</span><b>' + gbp2(RATE) + "</b></div>";
    if (norm) html += '<div class="ln"><span>Overtime from 19:00, ' + norm / 2 + (norm === 2 ? " hr" : " hrs") + " at 1.5x</span><b>" + gbp2(otN) + "</b></div>";
    if (late) html += '<div class="ln"><span>After midnight, ' + late / 2 + (late === 2 ? " hr" : " hrs") + " at 3x</span><b>" + gbp2(otL) + "</b></div>";
    $("#liveLines").innerHTML = html;
    $("#liveTime").textContent = "Wrap " + hm(wm);
    wrap.setAttribute("aria-valuetext", hm(wm));
    $("#liveNote").textContent = !v ? "Wrapped on time. Nothing to add." : late ? "Past midnight it's triple time. Most people forget to claim it." : "That's " + gbp(otN) + " you'd have had to work out yourself.";
    live.classList.toggle("dusk", v >= 2 && v < 6); live.classList.toggle("night", v >= 6);
    var from = lastTot; lastTot = tot; var el = $("#liveTot");
    if (reduce) el.textContent = gbp(tot); else { var t0 = performance.now(); (function f(t) { var k = Math.min(1, (t - t0) / 350); el.textContent = gbp(Math.round((from + (tot - from) * k) * 100) / 100); if (k < 1) requestAnimationFrame(f); })(t0); }
  }
  wrap.addEventListener("input", drawLive); drawLive();
  /* a gentle hint that it moves, once, if nobody has touched it */
  var touched = false; wrap.addEventListener("pointerdown", function () { touched = true; });
  if (!reduce) setTimeout(function () { if (touched) return; var s = [2, 4, 6, 4, 2, 0], i = 0; (function step() { if (touched || i >= s.length) return; wrap.value = s[i++]; drawLive(); setTimeout(step, 420); })(); }, 1600);

  /* ---- roles ---- */
  function kv(a, b, cls) { return '<div class="kv' + (cls ? " " + cls : "") + '"><span>' + a + "</span><b>" + b + "</b></div>"; }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return d; }
  function workBack(d, n) { d = new Date(d); while (n > 0) { d.setDate(d.getDate() - 1); if (d.getDay() % 6) n--; } return d; }
  function dmy(d) { return d.getDate() + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]; }
  function typer(el, text, speed) { if (reduce) { el.textContent = text; return; } var i = 0; el.textContent = ""; (function t() { el.textContent = text.slice(0, ++i); if (i < text.length) timers.push(setTimeout(t, speed || 18)); })(); }

  var DEMOS = {
    holds: { h: "Pencils that turn into bookings", s: "Every hold logged by who and when. Confirm one and the booking note is written.",
      html: '<div class="screen"><div class="mrow"><span class="lab">Next week</span><span class="tag amber" data-st>2nd pencil</span></div><div class="week">' + ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(function (d, i) { return '<span data-d="' + i + '">' + d + "<b>" + (10 + i) + "</b></span>"; }).join("") + '</div><div class="kv"><span>Northbound Films</span><b>Tue, Wed</b></div><div class="kv q"><span data-msg>Waiting on the first pencil to release</span><b></b></div></div>',
      run: function (el) { var d = $$(".week span", el), st = $("[data-st]", el), m = $("[data-msg]", el);
        [1, 2].forEach(function (i) { d[i].className = "p2"; });
        later(function () { [1, 2].forEach(function (i) { d[i].className = "p1"; }); st.textContent = "1st pencil"; m.textContent = "Moved up. Systems asks them to confirm by Friday."; }, 1200);
        later(function () { [1, 2].forEach(function (i) { d[i].className = "ok"; }); st.textContent = "Booked"; st.className = "tag"; m.textContent = "Booking note drafted: rate, hours, cancellation."; }, 2700); } },
    ot: { h: "Overtime you'd have missed", s: "Your band, the half hours, the late break. Worked out from the call and wrap.",
      html: '<div class="screen"><div class="mrow"><span class="lab">Day 2 · £450 · APA</span><span class="tag">1.5x band</span></div><div data-rows></div><div class="bigline"><span class="lab">The day</span><b data-t>£0</b></div></div>',
      run: function (el) { var R = $("[data-rows]", el), rows = [["Day rate", 450], ["Overtime from 17:30, 3 hrs", 202.5], ["Late break", 10]]; R.innerHTML = "";
        rows.forEach(function (r, i) { later(function () { R.insertAdjacentHTML("beforeend", '<div class="ln">' + "<span>" + r[0] + "</span><b>" + gbp2(r[1]) + "</b></div>"); }, 400 + i * 550); });
        later(function () { countUp($("[data-t]", el), 662.5, function (v) { return gbp2(v); }, 900); }, 400 + 3 * 550); } },
    chase: { h: "A chase that writes itself", s: "Polite, in your name, on a schedule. You just tap send.",
      html: '<div class="screen"><div class="mrow"><span class="lab">Chase 1 of 3 · draft</span><span class="tag amber">Due today</span></div><div class="type" data-type></div></div>',
      run: function (el) { typer($("[data-type]", el), "Hi Sam,\n\nHope the edit's going well. Just a note that INV-2026-014 for £2,031.40 is due today. Bank details are on the invoice.\n\nThanks,\nAlex", 16); } },
    team: { h: "Your whole team on one sheet", s: "Each person's rate and band, one wrap time, every total ready to send up.",
      html: '<div class="screen"><div class="mrow"><span class="lab">Lighting · call 06:30, wrap 20:00</span><span class="tag">4 crew</span></div><div data-rows></div><div class="bigline"><span class="lab">Department</span><b data-t>£0</b></div></div>',
      run: function (el) { var R = $("[data-rows]", el), rows = [["Gaffer, £450", 618.75], ["Rigging gaffer, £400", 550], ["Desk op, £380", 522.5], ["Spark, £350", 481.25]]; R.innerHTML = "";
        rows.forEach(function (r, i) { later(function () { R.insertAdjacentHTML("beforeend", '<div class="ln"><span>' + r[0] + "</span><b>" + gbp2(r[1]) + "</b></div>"); }, 300 + i * 420); });
        later(function () { countUp($("[data-t]", el), 2172.5, function (v) { return gbp2(v); }, 900); }, 300 + 4 * 420); } },
    kit: { h: "Kit and miles on the invoice", s: "Hire, mileage and receipts land on the same invoice as your days.",
      html: '<div class="screen"><div class="mrow"><span class="lab">INV-2026-015 · draft</span><span class="tag">Ready</span></div><div data-rows></div><div class="bigline"><span class="lab">Total</span><b data-t>£0</b></div></div>',
      run: function (el) { var R = $("[data-rows]", el), rows = [["3 days and overtime", 1630], ["Lighting package, 3 days", 360], ["Van, 92 miles at 45p", 41.4], ["Parking, receipt", 18]]; R.innerHTML = "";
        rows.forEach(function (r, i) { later(function () { R.insertAdjacentHTML("beforeend", '<div class="ln"><span>' + r[0] + "</span><b>" + gbp2(r[1]) + "</b></div>"); }, 300 + i * 420); });
        later(function () { countUp($("[data-t]", el), 2049.4, function (v) { return gbp2(v); }, 900); }, 300 + 4 * 420); } },
    turn: { h: "Turnaround, flagged", s: "Short rest between days gets spotted before it happens again.",
      html: '<div class="screen"><div class="mrow"><span class="lab">Days 3 and 4</span><span class="tag amber">Check</span></div>' + kv("Wrap, day 3", "23:30") + kv("Call, day 4", "07:00") + '<div class="bigline"><span class="lab">Rest</span><b data-t>0 hrs</b></div><div class="flag" data-f><i></i><span>7.5 hours rest, under the usual 11. Worth raising with the production before day 5.</span></div></div>',
      run: function (el) { countUp($("[data-t]", el), 7.5, function (v) { return (Math.round(v * 2) / 2) + " hrs"; }, 1000); later(function () { $("[data-f]", el).classList.add("on"); }, 1200); } },
    dholds: { h: "Holds across every company", s: "Pencils from three production companies in one diary, with clashes caught.",
      html: '<div class="screen"><div class="mrow"><span class="lab">12 to 14 Nov</span><span class="tag">3 holds</span></div>' + kv("Northbound Films", "1st · 12, 13") + kv("Field &amp; Co", "1st · 13, 14") + kv("Low Tide", "2nd · 14") + '<div class="flag" data-f><i></i><span>Two first pencils on the 13th. A note asking Northbound to confirm by Friday is drafted.</span></div></div>',
      run: function (el) { later(function () { $("[data-f]", el).classList.add("on"); }, 900); } },
    fee: { h: "Fees and statements", s: "Fee, rep's commission and what lands in your account, per job.",
      html: '<div class="screen"><div class="mrow"><span class="lab">Sportswear spot</span><span class="tag">Statement</span></div>' + kv("Director's fee", "£6,000.00") + kv("Rep commission, 20%", "−£1,200.00") + '<div class="bigline"><span class="lab">To you</span><b data-t>£0</b></div></div>',
      run: function (el) { countUp($("[data-t]", el), 4800, function (v) { return gbp2(v); }, 1100); } },
    awards: { h: "Awards, on the calendar", s: "Entry deadlines tracked, with credits for every job ready to paste in.",
      html: '<div class="screen"><div class="mrow"><span class="lab">Entries</span><span class="tag">3 open</span></div><div data-p></div></div>',
      run: function (el) { var P = $("[data-p]", el), rows = [["UK music video awards", 12, 60], ["Craft awards, short form", 26, 60], ["European craft festival", 41, 60]];
        P.innerHTML = rows.map(function (r) { return '<div class="prow"><div class="t"><span>' + r[0] + "</span><b>" + r[1] + ' days</b></div><div class="bar"><i' + (r[1] < 15 ? ' class="amber"' : "") + "></i></div></div>"; }).join("");
        later(function () { $$(".bar i", P).forEach(function (b, i) { b.style.width = (100 - rows[i][1] / rows[i][2] * 100) + "%"; }); }, 100); } },
    award: { h: "Award in, advance out", s: "The award email lands and the 50% advance invoice is drafted, due before the shoot.",
      html: '<div class="screen"><div class="mrow"><span class="lab">Inbox · 09:12</span><span class="tag">Award</span></div><p class="mail">Re: Sportswear spot<br><b style="font-weight:500">Great news, we\'d love to go with you.</b></p><div data-inv style="opacity:0;transition:opacity .5s">' + kv("Budget agreed", "£84,000.00") + kv("Advance, 50%", "Due shoot −7 days") + '<div class="bigline"><span class="lab">Advance invoice</span><b data-t>£0</b></div></div></div>',
      run: function (el) { var i = $("[data-inv]", el); i.style.opacity = 0; later(function () { i.style.opacity = 1; countUp($("[data-t]", el), 42000, function (v) { return gbp2(Math.round(v)); }, 1100); }, 900); } },
    permits: { h: "The permit clock", s: "Every lead time counted back from your shoot date, so nothing gets missed.",
      html: '<div class="screen"><div class="mrow"><span class="lab">Shoot in 26 days</span><span class="tag amber" data-n></span></div><div data-p></div></div>',
      run: function (el) { var shoot = addDays(26), P = $("[data-p]", el);
        var rows = [["Child performance licence", 21, addDays(26 - 21)], ["City of London, most filming", 21, addDays(26 - 21)], ["Royal Parks, with drone", 7, workBack(shoot, 7)], ["Westminster", 3, workBack(shoot, 3)]];
        P.innerHTML = rows.map(function (r) { var left = Math.round((r[2] - new Date()) / 864e5); return '<div class="prow"><div class="t"><span>' + r[0] + "</span><b>apply by " + dmy(r[2]) + '</b></div><div class="bar"><i' + (left <= 7 ? ' class="amber"' : "") + ' data-w="' + Math.max(8, 100 - left / 26 * 100) + '"></i></div></div>'; }).join("");
        var urgent = $$(".bar i.amber", P).length; $("[data-n]", el).textContent = urgent + " due this week";
        later(function () { $$(".bar i", P).forEach(function (b) { b.style.width = b.getAttribute("data-w") + "%"; }); }, 100); } },
    check: { h: "Every crew invoice checked", s: "Rates, days, bands and overtime checked against the deal before you pay.",
      html: '<div class="screen"><div class="mrow"><span class="lab">Spark · INV 1182</span><span class="tag" data-st>Checking</span></div>' + kv("Claimed overtime, 3 hrs", "£157.50") + kv("Timesheet says 2.5 hrs", "£131.25") + '<div class="flag" data-f><i></i><span>£26.25 over. A polite query is drafted; the rest is approved for the 7-day run.</span></div></div>',
      run: function (el) { var st = $("[data-st]", el); st.textContent = "Checking"; st.className = "tag"; later(function () { $("[data-f]", el).classList.add("on"); st.textContent = "Query"; st.className = "tag amber"; }, 1100); } }
  };
  var ROLES = {
    crew: { h: "Get paid for every hour you work.", p: "For sparks, grips, ADs, camera, art, wardrobe and everyone else on a day rate. Holds, timesheets, invoices and chasing, done on your phone on the way home.", d: ["holds", "ot", "chase"] },
    hod: { h: "Run the department, not the paperwork.", p: "For gaffers, key grips, DPs and HODs who book a team and bring kit. The whole department's hours and hire in one place.", d: ["team", "kit", "turn"] },
    dir: { h: "Keep every hold and fee straight.", p: "For directors working across several production companies, with a rep taking a cut and awards to enter.", d: ["dholds", "fee", "awards"] },
    prod: { h: "The production office, joined up.", p: "For producers and production companies. Cash in on award, crew paid right in seven days, permits on time and rights tracked.", d: ["award", "permits", "check"] }
  };
  var panel = $("#rolePanel"), current = null;
  function showRole(k) {
    clearTimers(); current = k; var r = ROLES[k];
    panel.innerHTML = '<div class="role-lead"><h3>' + r.h + "</h3><p>" + r.p + '</p></div><div class="demos">' + r.d.map(function (id) { var d = DEMOS[id]; return '<div class="card demo" data-demo="' + id + '"><h4>' + d.h + '</h4><p class="say">' + d.s + "</p>" + d.html + "</div>"; }).join("") + "</div>";
    $$(".tabs button").forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-role") === k ? "true" : "false"); });
    $$(".demo", panel).forEach(function (el, i) { el.classList.add("rv"); el.style.transitionDelay = i * 90 + "ms"; requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add("on"); }); }); });
    if (seen) runDemos();
  }
  function runDemos() { $$(".demo", panel).forEach(function (el, i) { later(function () { DEMOS[el.getAttribute("data-demo")].run(el); }, i * 250); }); }
  var seen = false;
  $$(".tabs button").forEach(function (b) { b.addEventListener("click", function () { if (b.getAttribute("data-role") !== current) showRole(b.getAttribute("data-role")); }); });
  $(".tabs").addEventListener("keydown", function (e) { if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return; var bs = $$(".tabs button"), i = bs.findIndex(function (b) { return b.getAttribute("aria-selected") === "true"; }); i = (i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length; bs[i].focus(); bs[i].click(); });
  showRole("crew");
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { seen = true; runDemos(); o.disconnect(); } }, { threshold: 0.25 }).observe(panel);
  else { seen = true; runDemos(); }

  /* ---- 26 jobs ---- */
  var FEAT = [
    { g: "Cash", f: [["Advance invoice on award", "The award email lands and the 50% advance and balance invoices are drafted, with due dates in the calendar."], ["Statutory interest letter", "The last chase quotes the Late Payment Act: fixed compensation worked out, interest at 8% above base rate.", 1], ["13-week cash forecast", "Money coming in across every open job, set against the crew and supplier payment runs."], ["Payment run prep", "Approved crew invoices (7-day) and supplier bills batched, ready for you to approve."], ["Client payment check", "Looks up a new client's published days to pay before you accept their terms."]] },
    { g: "Crew and shoot", f: [["Holds and pencils", "First and second pencils logged, confirm-or-release notes drafted, the diary blocked.", 1], ["Booking confirmations", "Rate, hours, overtime and cancellation fee confirmed in writing for every booking.", 1], ["Crew invoice check", "Every crew invoice checked against the agreed rate, days, overtime band and late-break rules.", 1], ["Start packs and IR35", "Bank details, UTR, NI and right to work chased; the status decision drafted for sign-off."], ["Call sheets and movement orders", "Built from the schedule, the crew list and the location."], ["Payroll bureau hand-off", "Signed deal memos for PAYE grades turned into the bureau's input file."], ["Director holds and fee statements", "Director holds tracked, and per-job fee and commission statements drafted."]] },
    { g: "Locations and compliance", f: [["Permit and licence clock", "Borough, TfL, Royal Parks, drone and 21-day child-licence deadlines counted back from the shoot."], ["Supplier pack", "Insurance certificates, policies and standard answers kept current for client onboarding."], ["AdGreen pack", "Travel, fuel, hotel and catering pulled from expenses into an AdGreen-ready sheet."], ["VAT and tax deadlines", "Rolling 12-month turnover against £90,000, with Self Assessment and MTD dates.", 1]] },
    { g: "Rights and delivery", f: [["Rights and usage register", "Usage terms pulled from signed contracts, with reminders at 90, 60 and 30 days."], ["Deliverables and clock numbers", "Versions, ratios, clock numbers, Clearcast stage and delivery deadlines from the air date."], ["Music video credits sheet", "One credits and ISRC record per video, ready for Vevo, awards and press."], ["Contract clause memo", "Flags payment terms over 60 days, GenAI, IP and indemnity clauses against the APA standard."], ["Awards calendar", "Entry deadlines for the big craft awards, with credits drafted."]] },
    { g: "Books and jobs", f: [["Job set-up in the books", "Each job made a tracking category in Xero, pushed to card and receipt tools, mapped to budget lines."], ["Overage and change requests", "A costed change email to the agency, with written approval logged to the budget line."], ["Kit quotes, POs and returns", "Hire quotes compared, POs drafted, return dates tracked and hire invoices matched."], ["Bids and budget versions", "Bids, pitch costs and outcomes logged, with a what-changed note between versions."], ["Wrap and audit pack", "Invoices, POs, timesheets and receipts gathered per budget line for the cost consultant."]] }
  ];
  $("#feat").innerHTML = FEAT.map(function (g) { return '<div class="fg"><h3>' + g.g + "</h3>" + g.f.map(function (f) { return '<div class="fi"><div class="t"><b>' + f[0] + '</b><span class="tag' + (f[2] ? "" : " soft") + '">' + (f[2] ? "In the app" : "Company pilot") + "</span></div><p>" + f[1] + "</p></div>"; }).join("") + "</div>"; }).join("");
  $$(".fg").forEach(function (el, i) { watch(el, (i % 3) * 80); });
})();
