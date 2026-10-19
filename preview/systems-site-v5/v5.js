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

  /* ---- run it as: the whole page follows your job ---- */
  function card(c, i) { var p = POS[i]; return '<div class="fl' + (i === 2 ? " red" : "") + '" style="--z:' + p.z + ';--x:' + p.x + ';--y:' + p.y + ';--r:' + p.r + '"><div class="fl-top"><span class="lab">' + c[0] + '</span><span class="tag' + (i === 1 ? " ok" : i === 2 ? " paper" : "") + '">' + c[1] + '</span></div><span class="fl-s">' + c[2] + "</span><b>" + c[3] + "</b></div>"; }
  var POS = [{ z: "60px", x: "-40px", y: "-150px", r: "-6deg" }, { z: "0px", x: "60px", y: "0px", r: "4deg" }, { z: "140px", x: "-20px", y: "150px", r: "-3deg" }];
  function rows(list) { return list.map(function (r) { return '<div class="scr-row' + (r[2] ? " " + r[2] : "") + '"><span>' + r[0] + "</span><b>" + r[1] + "</b></div>"; }).join(""); }
  function scard(l, b, q) { return '<div class="scr-card"><span class="lab">' + l + "</span><b>" + b + '</b><span class="scr-q">' + q + "</span></div>"; }
  function scr(lab, body, btn, red) { return '<div class="scr"><span class="lab">' + lab + "</span>" + body + '<span class="scr-btn' + (red ? " red" : "") + '">' + btn + "</span></div>"; }
  var PAY = scr("Pay run · Friday", rows([["30 invoices match", "£21,480"], ["2 queries drafted", "−£26.25", "amber"], ["Paid in 7 days", "APA terms", "q"]]), "Approve the run");
  var CREW_CHIPS = [["Holds and pencils", "Every pencil logged by who and when. Confirm one and the booking note is written.", 1], ["Booking notes", "Rate, hours, overtime and cancellation confirmed in writing, every time.", 1], ["Overtime", "Your band, the half hours, the late break and after midnight, worked out from the call and wrap.", 1], ["Turnaround", "Short rest between days spotted, with a note to the production drafted.", 1], ["Invoices", "Days, overtime, kit and miles on one invoice, numbered and dated for you.", 1], ["Chasing", "A friendly nudge on day 7, a firmer one after, then the Late Payment Act. You tap send.", 1], ["Receipts", "Snap a receipt and it lands on the right job and the right invoice.", 0], ["VAT and tax dates", "Your rolling turnover against the VAT threshold, with Self Assessment dates.", 1], ["Your details, once", "Bank, UTR and right to work saved, so start packs take a tap.", 0]];
  var PROD_CHIPS = [["Permit clock", "Every borough, Royal Parks, drone and child-licence deadline counted back from your shoot date.", 0], ["Start packs", "Bank details, UTR and right to work chased from every crew member before day one.", 0], ["Chasing", "A friendly nudge, a firm one, then the Late Payment Act. Drafted for you to send.", 1], ["Holds and pencils", "First and second pencils logged, with confirm-or-release notes written for you.", 1], ["Status link", "One page per job showing the agency where it is and what's waiting on them.", 0], ["Client notes", "Each client's PO rules, accounts inbox and payment day, used on every invoice.", 0], ["Rights and usage", "Usage end dates from every contract, with a renewal quote drafted before they lapse.", 0], ["Cash forecast", "Thirteen weeks of money in and out across every open job.", 0], ["Wrap report", "Budget against actual, with every approved extra and who approved it.", 0], ["Kit and POs", "Hire quotes compared, POs drafted, return dates and hire invoices matched.", 0]];

  /* crew jobs: a rate, a band, the kit they bring, and three things made for them */
  var CREW = {
    dop: { n: "DOP", plural: "DOPs", rate: 950, band: 1, kit: ["Camera package", 450], spot: [
      ["Your camera package, hired right.", "Owner-op kit on the invoice by the day, with the insurance certificate sent with the booking note.", [["Camera package, 3 days", "£1,350"], ["Insurance cert", "sent", "q"], ["Cross-hire lenses", "PO drafted", "amber"]]],
      ["Prep, recce and shoot days.", "Each priced at its own rate, so the recce never gets lost in the shoot days.", [["Recce, half day", "£475"], ["Prep at the rental house", "£475"], ["Shoot, 2 days", "£1,900"]]],
      ["Book your camera team.", "Hold your 1st AC, 2nd AC and DIT under the job, and confirm them all in one go.", [["1st AC", "1st pencil", "amber"], ["2nd AC", "Booked"], ["DIT", "Booked"]]]] },
    gaffer: { n: "Gaffer", plural: "gaffers", rate: 450, band: 1.5, kit: ["Lighting package", 120], spot: [
      ["Your sparks on one sheet.", "Each person's rate and band, one wrap time, the department total ready to send up.", [["Gaffer, £450", "£618.75"], ["Best boy, £400", "£550.00"], ["Spark, £350", "£481.25"]]],
      ["The genny and the cross-hire.", "Kit you own and kit you hire, each on its own line with the return date tracked.", [["Lighting package, 3 days", "£360"], ["Genny, cross-hired", "back Fri", "amber"], ["Van, 92 miles at 45p", "£41.40"]]],
      ["Turnaround, flagged.", "A late wrap into an early call is spotted before it happens again.", [["Wrap, day 3", "23:30"], ["Call, day 4", "07:00"], ["Rest", "7.5 hrs", "amber"]]]] },
    spark: { n: "Spark", plural: "sparks", rate: 350, band: 1.5, kit: null, spot: [
      ["Overtime you'd have missed.", "The pre-rig, the late wrap and the late break, all worked out at your band.", [["Day rate", "£350.00"], ["Overtime, 3 hrs at 1.5x", "£157.50"], ["Late break", "£10.00"]]],
      ["Rig days and shoot days.", "Rigging days priced at their own rate, logged as you go.", [["Rig day", "£350"], ["Shoot, 2 days", "£700"], ["De-rig", "£350"]]],
      ["Paid in 7 days.", "APA terms say crew are paid within a week. If it slips, the chase is drafted for you.", [["INV-2026-021", "£1,567.50"], ["Due", "today", "amber"], ["Chase 1", "drafted", "q"]]]] },
    grip: { n: "Grip", plural: "grips", rate: 420, band: 1.5, kit: ["Dolly and track", 150], spot: [
      ["The dolly gets paid too.", "Dolly, track and the jib, each by the day, on the same invoice as your hours.", [["Dolly and track, 2 days", "£300"], ["Jib, 1 day", "£180"], ["Van, 60 miles", "£27.00"]]],
      ["Rigging days counted.", "Car rigs and pre-rigs logged at their own rate, not lost in the shoot.", [["Car rig day", "£420"], ["Shoot, 2 days", "£840"], ["Overtime", "£157.50", "amber"]]],
      ["Turnaround, flagged.", "Short rest between days is spotted, with a note to the production drafted.", [["Wrap, day 1", "22:00"], ["Call, day 2", "06:00"], ["Rest", "8 hrs", "amber"]]]] },
    camera: { n: "1st AC", plural: "camera assistants", rate: 480, band: 1.25, kit: ["Focus kit", 85], spot: [
      ["Prep day at the rental house.", "Checkout days priced and logged, so they're on the invoice, not forgotten.", [["Prep, rental house", "£480"], ["Shoot, 2 days", "£960"], ["Wrap out", "half day"]]],
      ["Focus kit and the truck miles.", "Your kit by the day and the camera truck mileage, added for you.", [["Focus kit, 3 days", "£255"], ["Truck, 120 miles", "£54.00"], ["Parking, receipt", "£18.00"]]],
      ["Your band, worked out.", "At your rate the band is 1.25x. Systems knows that, so the overtime is right.", [["Overtime, 2 hrs", "£120.00"], ["After midnight", "3x", "amber"], ["Late break", "£10.00"]]]] },
    sound: { n: "Sound recordist", plural: "sound recordists", rate: 520, band: 1.25, kit: ["Sound package", 200], spot: [
      ["Your package, on every invoice.", "Mixer, radio mics and timecode boxes hired by the day, beside your hours.", [["Sound package, 2 days", "£400"], ["Extra radio mics, 4", "£80"], ["Timecode boxes", "£40"]]],
      ["Batteries and consumables.", "Snap the receipt and it goes on the job's invoice.", [["Batteries", "£34.50"], ["Lav tape and covers", "£21.00"], ["On INV-2026-030", "added", "q"]]],
      ["Paid in 7 days.", "If the invoice slips past due, a polite chase is drafted in your name.", [["INV-2026-030", "£1,760.00"], ["Overdue", "3 days", "amber"], ["Chase 1", "drafted", "q"]]]] },
    dit: { n: "DIT", plural: "DITs", rate: 450, band: 1.5, kit: ["DIT cart", 250], spot: [
      ["The cart by the day.", "Your cart, monitors and readers on the invoice, with the hire dates tracked.", [["DIT cart, 2 days", "£500"], ["Shuttle drives, 4", "receipt"], ["Monitor, cross-hire", "£90"]]],
      ["Offload after wrap.", "The hour you spend offloading after the unit wraps is overtime too.", [["Unit wrap", "20:00"], ["Offload done", "21:15"], ["Overtime, 1.25 hrs", "£84.38", "amber"]]],
      ["Drives and media.", "Drives bought for the job go on as receipts, so they're paid back.", [["4TB drives, 3", "£297.00"], ["Card readers", "£45.00"], ["On the invoice", "added", "q"]]]] },
    art: { n: "Art director", plural: "art directors", rate: 400, band: 1.5, kit: ["Props van", 60], spot: [
      ["The float, settled.", "Every receipt snapped against the float, with what's left worked out to the penny.", [["Float issued", "£500.00"], ["Receipts, 14", "£457.90"], ["To return", "£42.10", "amber"]]],
      ["Prep and build days.", "Prep, build, shoot and strike, each at its own rate.", [["Prep, 2 days", "£800"], ["Build day", "£400"], ["Strike", "£400"]]],
      ["Your buyers and props team.", "Hold and book your team under the job, and send their hours up as one sheet.", [["Props buyer", "Booked"], ["Set dresser", "1st pencil", "amber"], ["Standby props", "Booked"]]]] },
    costume: { n: "Costume designer", plural: "costume teams", rate: 400, band: 1.5, kit: ["Costume kit", 40], spot: [
      ["Fittings, logged.", "Every fitting is prep time, logged against the job so it gets paid.", [["Fitting, lead actor", "2 hrs"], ["Fitting, 4 extras", "3 hrs"], ["Prep total", "1.5 days", "amber"]]],
      ["Float and receipts.", "Shop on the float, snap the receipts, and the balance works itself out.", [["Float issued", "£800.00"], ["Receipts, 9", "£612.40"], ["Left", "£187.60"]]],
      ["Returns, before the refund window shuts.", "Every item bought to return is listed with its shop and its last day.", [["Coat, Selfridges", "by 2 Nov", "amber"], ["Boots, 2 pairs", "by 5 Nov"], ["Returned", "£214.00", "q"]]]] },
    hmu: { n: "Hair and make-up", plural: "hair and make-up artists", rate: 380, band: 1.5, kit: ["Kit fee", 35], spot: [
      ["Your kit fee, every day.", "The kit fee goes on by the day, beside your hours.", [["Kit fee, 3 days", "£105"], ["Products, receipt", "£48.20"], ["On the invoice", "added", "q"]]],
      ["Early calls, priced.", "A 05:00 call before the unit is an early call, and it's worked out for you.", [["Your call", "05:00"], ["Unit call", "07:00"], ["Early call, 2 hrs", "£114.00", "amber"]]],
      ["Your assistants on one sheet.", "Book your team under the job and send their days up together.", [["Make-up assistant", "Booked"], ["Hair stylist", "1st pencil", "amber"], ["Dailies, 3", "Booked"]]]] },
    locations: { n: "Locations manager", plural: "locations teams", rate: 400, band: 1.5, kit: null, spot: [
      ["The permit clock.", "Every borough, Royal Parks and road closure deadline counted back from the shoot.", [["Royal Parks", "apply now", "amber"], ["Westminster", "by 12 Nov"], ["Parking bay suspension", "by 14 Nov"]]],
      ["Fees and deposits.", "Every location fee, deposit and refund tracked per location.", [["House, NW3", "£2,500"], ["Deposit", "£500 back", "amber"], ["Unit base, car park", "£300"]]],
      ["Letters to the neighbours.", "Drop letters drafted with dates, times and your number, ready to print.", [["Letters, 40 houses", "drafted"], ["Parking notice", "drafted"], ["Recce photos", "in Drive", "q"]]]] },
    runner: { n: "Runner", plural: "runners", rate: 180, band: 1.5, kit: null, spot: [
      ["Every day, logged.", "Call, lunch and wrap logged, so you know exactly what you're owed.", [["Day 1", "07:00 to 19:30"], ["Day 2", "06:30 to 21:00"], ["Overtime", "£54.00", "amber"]]],
      ["Mileage and parking.", "Every pick-up and drop-off logged with the miles and the receipts.", [["Pick-ups, 64 miles", "£28.80"], ["Parking, receipts", "£22.00"], ["Fuel", "receipt", "q"]]],
      ["Paid on time.", "If the invoice slips, a polite chase is drafted in your name.", [["INV-2026-004", "£464.80"], ["Due", "today", "amber"], ["Chase 1", "drafted", "q"]]]] },
    editor: { n: "Editor", plural: "editors", rate: 450, band: 1, kit: ["Edit suite", 150], post: true, spot: [
      ["Weeks and days.", "Weekly rates, extra days and weekends, each worked out right.", [["Offline, 2 weeks", "£4,500"], ["Extra day", "£450"], ["Saturday, 1.5x", "£675", "amber"]]],
      ["Versions, signed off.", "Every cut and who approved it, so the last-minute v9 is a paid change.", [["v6", "agency notes"], ["v7", "approved, 14:02"], ["v8, new script", "extra day", "amber"]]],
      ["The suite and the kit.", "Suite hire and drives on the same invoice as your weeks.", [["Suite, 10 days", "£1,500"], ["Drives, 2", "£180"], ["On the invoice", "added", "q"]]]] }
  };
  function crewRole(k) {
    var c = CREW[k], hr = c.rate / 10, ot = 3 * hr * c.band, kitT = c.kit ? c.kit[1] * 3 : 0, days = 3 * c.rate + 3 * ot + 30, tot = days + kitT + 41.4;
    var kitTxt = c.kit ? c.kit[0].toLowerCase() : "miles";
    return { n: c.n, crew: c, h1: c.n + " admin, made easy.", lede: c.post ? "Your weeks, versions and suite hire on one invoice, with every sign-off kept." : "Your days, overtime, " + (c.kit ? kitTxt + " " : "") + "and miles on one invoice, worked out from the call sheet and the wrap.",
      fine: "For UK crew. No card, no call, no download.",
      cards: c.post ? [["Offline · week 2", "Booked", "Sportswear spot", "10 days"], ["v7", "Approved", "Signed off by the agency, 14:02", "Locked"], ["INV-2026-040", "Ready", "Weeks, suite and drives", gbp(4500 + 1500 + 180)]]
        : [["Next week", "1st pencil", "Northbound Films, Tue and Wed", "2 days"], ["Day 2 · wrap 20:30", c.band + "x band", "Overtime, 3 hrs", gbp2(ot)], ["INV-2026-015", "Ready", "Days, " + kitTxt + (c.kit ? " and miles" : ""), gbp(Math.round(tot))]],
      taps: [["Log the hold.", "Pencils logged by who and when. Confirm one and the booking note is written.", scr("Next week", rows([["Northbound Films", "Tue, Wed"], ["Moved to 1st pencil", "today", "amber"], ["Confirm by Friday", "drafted", "q"]]), "Send the booking note")],
        c.post ? ["Log the cut.", "Every version and who signed it off, so a late change is a paid day.", scr("Sportswear spot · offline", rows([["v6", "agency notes"], ["v7", "approved", "q"], ["v8, new script", "extra day", "amber"]]), "Add the extra day")]
          : ["Tap wrap.", "Your overtime at your band, the late break and turnaround, worked out for you.", scr("Day 2 · call 06:30", '<div class="scr-big">20:30</div>' + scard("Overtime, 3 hrs at " + c.band + "x", gbp2(ot), c.n + ", £" + c.rate + " day"), "Wrap", 1)],
        ["Send the invoice.", "Days, overtime" + (c.kit ? ", your " + kitTxt : "") + " and the miles, on one invoice.", scr("INV-2026-015 · draft", rows([[c.post ? "2 weeks" : "3 days and overtime", gbp(c.post ? 4500 : Math.round(days))], c.kit ? [c.kit[0] + (c.post ? ", 10 days" : ", 3 days"), gbp(c.post ? 1500 : kitT)] : ["Mileage, 92 miles", "£41.40"], ["Due in 7 days", "APA terms", "q"]]), "Send the invoice")]],
      wrap: !c.post, spot: { lab: "Made for " + c.plural, h: "Things only " + c.plural + " need.", items: c.spot }, chips: CREW_CHIPS };
  }
  var ROLES = {
    prod: { n: "Producer", h1: "Production admin, made easy.", lede: "Advances, crew invoices, permits and clients, run from your phone. If you can send a text, you can run Systems.",
      fine: "For UK production companies and producers. No card, no call, no download.",
      cards: [["Award · 09:12", "Drafted", "Advance invoice, 50%", "£42,000"], ["Crew invoices · 32", "30 match", "Into the 7-day run", "£21,480"], ["On set · 14:31", "Approved", "The canal shot, by the agency", "+£5,220"]],
      taps: [["Forward the award email.", "The 50% advance and the balance are drafted, with the dates in your calendar.", scr("Inbox · 09:12", '<p class="scr-mail">Re: Sportswear spot<br><b>We\'d love to go with you.</b></p>' + scard("Advance, 50%", "£42,000.00", "Due 7 days before the shoot"), "Send the invoice")],
        ["Tap wrap.", "Once a day, for the whole unit. Every crew member's overtime is worked out.", scr("Day 2 · call 06:30", '<div class="scr-big">20:30</div><span class="scr-q c">Wrap, logged for 32 crew</span>' + scard("On overtime", "18 crew", "Worked out at each person's band"), "Wrap", 1)],
        ["Approve the pay run.", "Every crew invoice is read and checked first. The odd one out gets a polite query.", PAY]],
      wrap: true, client: true, chips: PROD_CHIPS },
    pm: { n: "Production manager", h1: "Production admin, made easy.", lede: "Permits, start packs, holds and the pay run, without keeping any of it in your head.",
      fine: "For UK production companies and producers. No card, no call, no download.",
      cards: [["Start packs · 14 crew", "3 to chase", "Bank, UTR, right to work", "11 of 14"], ["Permits", "This week", "Westminster, 3 working days", "8 days"], ["Holds · Tue, Wed", "Booked", "Northbound Films, confirmed", "32 crew"]],
      taps: [["Add the shoot date.", "Every permit and licence deadline is counted back from it, with the urgent ones first.", scr("Shoot in 26 days", rows([["Child licence", "apply now", "amber"], ["City of London", "by 29 Oct"], ["Westminster", "by 12 Nov"]]), "Start the applications")],
        ["Drop in the crew list.", "Start packs go out and get chased: bank details, UTR, right to work.", scr("Start packs · 14 crew", rows([["Back and complete", "11"], ["Sound recordist, UTR", "chase", "amber"], ["Runner, right to work", "chase", "amber"]]), "Send the chasers")],
        ["Approve the pay run.", "Every crew invoice is checked against the deal before it goes in the 7-day run.", PAY]],
      wrap: true, spot: { lab: "Made for production managers", h: "The office, without the spreadsheet.", items: [
        ["Call sheets that log the day.", "Call times and locations are read from your call sheet, so every crew day is known.", [["Unit call", "06:30"], ["Location", "Canal, E2"], ["Crew on the sheet", "32"]]],
        ["Holds, confirmed in writing.", "Confirm or release every pencil with one tap, and the notes go out in your name.", [["Gaffer", "Confirmed"], ["Grip", "Released", "q"], ["Sound", "1st pencil", "amber"]]],
        ["The payroll hand-off.", "PAYE grades turned into your bureau's input file, so nobody types it twice.", [["PAYE grades", "6"], ["Deal memos signed", "6 of 6"], ["Bureau file", "ready", "amber"]]]] }, chips: PROD_CHIPS },
    dir: { n: "Director", h1: "Director admin, made easy.", lede: "Holds from every company in one diary, with fees and your rep's cut kept straight.",
      fine: "For UK directors. No card, no call, no download.",
      cards: [["12 to 14 Nov", "Clash", "Two first pencils on the 13th", "3 holds"], ["Sportswear spot", "Statement", "To you, after 20% commission", "£4,800"], ["Awards", "12 days", "Craft entry, credits drafted", "Enter"]],
      taps: [["Forward the hold email.", "Every pencil from every company lands in one diary, and clashes are caught.", scr("12 to 14 Nov", rows([["Northbound Films", "1st · 12, 13"], ["Field &amp; Co", "1st · 13, 14", "amber"], ["Low Tide", "2nd · 14", "q"]]), "Ask Northbound to confirm")],
        ["Confirm the job.", "The booking note is written and the fee statement set up, with your rep's cut.", scr("Sportswear spot", scard("To you", "£4,800.00", "Fee £6,000, rep 20%"), "Send the booking note")],
        ["Enter the awards.", "Deadlines tracked, with credits for every job ready to paste in.", scr("Entries · 3 open", rows([["UK music video awards", "12 days", "amber"], ["Craft awards", "26 days"], ["European festival", "41 days", "q"]]), "Open the entry")]],
      wrap: false, spot: { lab: "Made for directors", h: "Things only directors need.", items: [
        ["Treatments, tracked.", "Every pitch, its deadline and whether you got it, in one list.", [["Sportswear, pitch", "due Thu", "amber"], ["Bank campaign", "won"], ["Music video", "lost", "q"]]],
        ["Fees and statements.", "Fee, rep's commission and what lands in your account, per job.", [["Director's fee", "£6,000.00"], ["Rep, 20%", "−£1,200.00"], ["To you", "£4,800.00"]]],
        ["Credits, ready to paste.", "One credits sheet per job, for awards, Vimeo and press.", [["Credits", "24 names"], ["Music", "licensed"], ["Copied", "1 tap", "q"]]]] }, chips: CREW_CHIPS }
  };
  Object.keys(CREW).forEach(function (k) { ROLES[k] = crewRole(k); });
  ROLES.hod = crewRole("gaffer");
  var PICK = ["prod", "pm", "dir", "dop", "gaffer", "spark", "grip", "camera", "sound", "dit", "art", "costume", "hmu", "locations", "editor", "runner"];
  var GUESS = [[/line producer|producer|exec/, "prod"], [/production (manager|coord)|coordinator|\bpm\b|\bad\b|assistant director|1st ad|first ad|script sup/, "pm"], [/dop|\bdp\b|cinematographer|director of photography|camera op|steadicam|operator/, "dop"], [/director/, "dir"], [/gaffer|best boy/, "gaffer"], [/spark|electric|rigger|lighting/, "spark"], [/grip|dolly|crane/, "grip"], [/focus|\bac\b|camera ass|clapper|loader|camera/, "camera"], [/\bdit\b|data|media/, "dit"], [/sound|boom|mixer|audio/, "sound"], [/art|design|set dress|props|buyer|construct|scenic|graphic/, "art"], [/costume|wardrobe|stylist|dresser/, "costume"], [/make|hair|hmu|mua|prosthetic/, "hmu"], [/location|unit manager|marshal/, "locations"], [/edit|colou?r|vfx|grade|post|online|motion|anim/, "editor"], [/runner|\bpa\b|assistant|driver/, "runner"]];
  function guess(t) { t = t.toLowerCase(); for (var i = 0; i < GUESS.length; i++) if (GUESS[i][0].test(t)) return GUESS[i][1]; return "runner"; }
  function custom(name) {
    var base = guess(name), R = Object.assign({}, ROLES[base]), nice = name.trim().replace(/\s+/g, " ").slice(0, 32);
    nice = nice.charAt(0).toUpperCase() + nice.slice(1);
    R.n = nice; if (base !== "prod" && base !== "pm") R.h1 = nice + " admin, made easy.";
    if (R.spot) R.spot = { lab: "Made for you", h: "Things a " + nice.toLowerCase() + " needs.", items: R.spot.items };
    return R;
  }

  var pills = $("#whoPills"), other = $("#whoOther"), otherIn = $("#whoIn");
  pills.innerHTML = PICK.map(function (k) { return '<button type="button" role="radio" data-r="' + k + '">' + ROLES[k].n + "</button>"; }).join("") + '<button type="button" role="radio" data-r="other">Something else</button>';
  var chips = $("#chips"), out = $("#chipOut"), CH = [];
  function pickChip(i) { var f = CH[i]; $$("button", chips).forEach(function (b, j) { b.setAttribute("aria-selected", j === i ? "true" : "false"); }); out.innerHTML = '<span class="lab">' + (f[2] ? "In the app now" : "Coming in the pilot") + "</span><h3>" + f[0] + "</h3><p>" + f[1] + "</p>"; }
  function spotCard(it) { return '<article class="sp"><h3>' + it[0] + "</h3><p>" + it[1] + '</p><div class="sp-scr">' + rows(it[2]) + "</div></article>"; }
  var cur0 = null;
  function render(key, R) {
    R = R || ROLES[key];
    try { localStorage.setItem("sys-role", key === "other" ? "other:" + R.n : key); } catch (e) {}
    $$("button", pills).forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-r") === key ? "true" : "false"); });
    other.hidden = key !== "other";
    var sel = $('[data-r="' + key + '"]', pills); if (sel && pills.scrollWidth > pills.clientWidth) pills.scrollTo({ left: sel.offsetLeft - 16, behavior: "smooth" });
    $("#asName").textContent = R.n;
    var h1 = $("#h1"); if (h1.textContent !== R.h1) { h1.textContent = R.h1; h1.classList.remove("swap"); void h1.offsetWidth; h1.classList.add("swap"); } h1.classList.toggle("long", R.h1.length > 26);
    $("#lede").textContent = R.lede; $("#fine").textContent = R.fine;
    inner.innerHTML = R.cards.map(card).join("");
    $("#phone .ph-screens").innerHTML = R.taps.map(function (t) { return t[2]; }).join("");
    taps.forEach(function (el, i) { $("h3", el).textContent = R.taps[i][0]; $("p", el).textContent = R.taps[i][1]; var m = $(".mob-screen", el); m.innerHTML = R.taps[i][2]; $(".scr", m).classList.add("on"); });
    setTap(cur < 0 ? 0 : cur, true);
    $(".wrap").hidden = !R.wrap;
    var c = R.crew || CREW.gaffer; RATE = c.rate; HR = RATE / 10; BAND = c.band;
    $("#liveWho").textContent = (R.crew ? "You, " + R.n.toLowerCase() : "Your gaffer") + " · £" + c.rate + " · APA";
    $("#wrapH").textContent = R.crew ? "You wrapped late. What are you owed?" : "They wrapped late. What do you owe?";
    $("#wrapP").textContent = R.crew ? "Drag the wrap. Your overtime at your band, worked out before you invoice." : "Drag the wrap. This is how every crew invoice is checked, on APA terms, before you pay it.";
    last = RATE; drawLive();
    $("#clients").hidden = !R.client;
    var sp = $("#spot"); sp.hidden = !R.spot;
    if (R.spot) { $("#spLab").textContent = R.spot.lab; $("#spH").textContent = R.spot.h; $("#spGrid").innerHTML = R.spot.items.map(spotCard).join(""); $$(".sp", sp).forEach(function (el, i) { el.style.animationDelay = i * 90 + "ms"; }); }
    CH = R.chips; chips.innerHTML = CH.map(function (f, i) { return '<button role="tab" type="button" aria-selected="false" data-i="' + i + '">' + (f[2] ? "<i></i>" : "") + f[0] + "</button>"; }).join("");
    $$("button", chips).forEach(function (b) { b.addEventListener("click", function () { pickChip(+b.getAttribute("data-i")); }); });
    pickChip(0);
  }
  $$("button", pills).forEach(function (b) { b.addEventListener("click", function () {
    var k = b.getAttribute("data-r");
    if (k === "other") { other.hidden = false; $$("button", pills).forEach(function (x) { x.setAttribute("aria-checked", x === b ? "true" : "false"); }); otherIn.focus(); return; }
    render(k);
  }); });
  other.addEventListener("submit", function (e) { e.preventDefault(); var v = otherIn.value.trim(); if (v) render("other", custom(v)); });
  var start = "prod";
  try { var saved = localStorage.getItem("sys-role") || ""; if (saved.indexOf("other:") === 0) { otherIn.value = saved.slice(6); render("other", custom(saved.slice(6))); start = null; } else if (ROLES[saved] && PICK.indexOf(saved) > -1) start = saved; } catch (e) {}
  if (start) render(start);
})();
