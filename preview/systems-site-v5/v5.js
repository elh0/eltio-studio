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
  chips.innerHTML = F.map(function (f, i) { return '<button role="tab" type="button" aria-selected="false" data-i="' + i + '">' + (f[2] === 1 ? "<i></i>" : "") + f[0] + "</button>"; }).join("");
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



  /* ---- inbox: every email from back-to-back jobs, sorted into the right place ---- */
  var IB_X = { dop: ["Rental house", "Camera package quote", "Added as a kit line"], gaffer: ["Best boy", "Team hours, day 2", "Team timesheet updated"], spark: ["Northbound Films", "Rig day on Friday?", "Rig rate applied"], grip: ["Rental house", "Crane cross-hire", "Sub-hire line added"], camera: ["2nd AC", "Kit back at 21:10", "Your own wrap logged"], sound: ["Northbound Films", "Six radio mics?", "Channels on the kit line"], dit: ["Northbound Films", "Two more drives", "Recharge logged, receipt filed"], art: ["Props hire", "Return by Friday", "Float updated, return in diary"], costume: ["Selfridges", "Refund, £89.00", "Return logged, float balanced"], hmu: ["Northbound Films", "Cast list updated", "Consumables split by cast"], locations: ["Camden Council", "Permit approved", "Residents' letter drafted"], runner: ["Northbound Films", "Fuel and parking?", "Receipts on your timesheet"], editor: ["Agency", "v8 notes", "Round 4 of 3, extra drafted"] };
  function ibFor(k) {
    if (k === "prod" || k === "pm") return [["Agency", "We'd love to go with you", "Award, advance drafted"], ["Gaffer", "INV-021, 2 days", "Checked, matches APA", "ok"], ["Spark", "Invoice, 2 days", "£26.25 over, query drafted"], ["Agency", "Can we add the canal shot?", "Extra costed, link ready"], ["Westminster Council", "Question on your permit", "Reply drafted, needs you", "you"]];
    if (k === "dir") return [["Northbound Films", "Pencil for the 13th?", "Hold logged, rep copied"], ["Field & Co", "First pencil, 13 and 14", "Clash flagged"], ["Your rep", "Fee statement, sportswear", "£4,800 to you, checked", "ok"], ["Low Tide", "Treatment due Thursday", "In your diary"], ["Field & Co", "Can you confirm by Friday?", "Reply drafted, needs you", "you"]];
    var x = IB_X[k] || ["Northbound Films", "Kit list for Tuesday?", "Kit list attached"];
    return [["Northbound Films", "Hold for Tue and Wed?", "Pencil logged"], ["Field & Co", "Call sheet, day 1", "Call 06:30, in your diary"], ["Low Tide", "Shoot moved to Thursday", "Moved, clash flagged"], [x[0], x[1], x[2]], ["Northbound Films", "Remittance, £1,770", "Paid, invoice closed", "ok"], ["Field & Co", "Free on the 14th?", "Reply drafted, needs you", "you"]];
  }
  var ibT = [], ibKey = "prod", ibSeen = false;
  function ibPlay() {
    ibT.forEach(clearTimeout); ibT = [];
    var L = ibFor(ibKey), rows = $("#ibRows"), sorted = 0;
    rows.innerHTML = L.map(function (r) { return '<div class="ib-r"><span class="lab">' + r[0].replace("&", "&amp;") + '</span><span class="s">' + r[1] + '</span><span class="tag new">New</span></div>'; }).join("");
    $("#ibSum").textContent = L.length + " in · 0 sorted";
    $$(".ib-r", rows).forEach(function (el, i) {
      var r = L[i];
      ibT.push(setTimeout(function () { el.classList.add("in"); }, reduce ? 0 : 200 + i * 380));
      ibT.push(setTimeout(function () { var g = $(".tag", el); g.className = "tag" + (r[3] ? " " + r[3] : ""); g.textContent = r[2]; if (r[3] !== "you") sorted++; $("#ibSum").textContent = L.length + " in · " + sorted + " sorted" + (i === L.length - 1 ? " · 1 needs you" : ""); }, reduce ? 0 : 900 + i * 380));
    });
  }
  $("#ibAgain").addEventListener("click", ibPlay);
  if (io) new IntersectionObserver(function (es) { if (es[0].isIntersecting && !ibSeen) { ibSeen = true; ibPlay(); } }, { threshold: .35 }).observe($("#ib")); else ibSeen = true;
  $$(".ib-copy > *").forEach(function (el, i) { watch(el, i * 70); });


  /* ---- the day, live: the night before to the end-of-day summary. The clock runs itself; going over is one ask to everyone ---- */
  var dyKey = "prod", dyT = [], dyLeft = 14 * 3600 + 32 * 60 + 10, dyRun = false, dyWait = null;
  function hms(s) { var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return [h, m, x].map(function (n) { return String(n).padStart(2, "0"); }).join(":"); }
  setInterval(function () { if (dyRun) return; dyLeft = Math.max(0, dyLeft - 1); $("#dyClock").textContent = hms(dyLeft); }, 1000);
  function dyNote(t, h, p, cls) {
    var feed = $("#dyFeed"); feed.insertAdjacentHTML("afterbegin", '<div class="dy-n' + (cls ? " " + cls : "") + '"><span class="t">' + t + "</span><b>" + h + "</b><span>" + p + "</span></div>");
    var all = $$(".dy-n", feed); if (all.length > 3) all[all.length - 1].remove();
  }
  function dyMeter(v, max, txt) { $("#dyMeter").hidden = false; $("#dyBar").style.width = Math.min(100, v / max * 100) + "%"; $("#dyOT").textContent = txt; }
  function dyCrew() { var c = (ROLES[dyKey] && ROLES[dyKey].crew) || { band: 1.5, rate: 450 }; return { band: c.band, ot: c.rate / 10 * c.band * 1.5 }; }
  function dyReset() {
    dyT.forEach(clearTimeout); dyT = []; clearTimeout(dyWait); dyRun = false; $("#dy").classList.remove("ot"); $("#dyAsk").hidden = true; $("#dyMeter").hidden = true; $("#dyBar").style.width = "0";
    $("#dyFeed").innerHTML = ""; dyNote("21:14", "Tomorrow's call sheet is in", "Call 06:30, Canal, E2. 10.5 hrs after tonight's wrap, so turnaround's fine.");
    $("#dyLab").textContent = "Call in"; $("#dyClock").textContent = hms(dyLeft); $("#dyPlay").textContent = "Play the day"; $("#dyPlay").hidden = false;
  }
  function at(ms, fn) { dyT.push(setTimeout(fn, reduce ? 0 : ms)); }
  function dyPlay() {
    dyReset(); dyRun = true; $("#dyPlay").hidden = true;
    var prod = dyKey === "prod" || dyKey === "pm", c = dyCrew();
    at(300, function () { $("#dyLab").textContent = "Leave by"; $("#dyClock").textContent = "05:50"; dyNote("05:15", "Leave by 05:50", "34 minutes to Canal, E2 in this morning's traffic."); });
    at(1500, function () { $("#dyLab").textContent = "On the clock"; $("#dyClock").textContent = "06:30"; dyNote("06:30", "Call. The clock's running", prod ? "Every crew day started from one unit call." : "Started from the unit call. Nothing to log."); });
    at(2700, function () { $("#dyClock").textContent = "13:05"; dyNote("13:05", "Lunch", "One hour, back at 14:05. On time, so no late break."); dyMeter(0, 1, prod ? "£0 of £4,000" : "0 hrs"); });
    at(3900, function () {
      $("#dyClock").textContent = "18:10"; $("#dy").classList.add("ot"); $("#dyLab").textContent = "Going over?";
      dyNote("18:10", prod ? "You asked the unit to run to 20:00" : "Production asks to run to 20:00", prod ? "Sent to all 32 crew at once. No walking round the set." : "1.5 hrs at " + c.band + "x, " + gbp2(c.ot) + ". Say yes, or ask for a word.", "amber");
      if (prod) at(1000, function () { dyNote("18:12", "29 in, 3 want a word", "The gaffer, best boy and 2nd AC. Their names are on your phone.", "amber"); dyGo(true, c.ot); });
      else { $("#dyAsk").hidden = false; dyWait = setTimeout(function () { dyAnswer("in"); }, reduce ? 0 : 4000); }
    });
  }
  function dyAnswer(a) {
    if (!dyRun || $("#dyAsk").hidden) return; clearTimeout(dyWait); $("#dyAsk").hidden = true;
    dyNote("18:11", a === "in" ? "You're in" : "The producer's been told", a === "in" ? "Logged with the time you said yes." : "They'll find you on set. The ask stays open until you've talked.", a === "in" ? "" : "amber");
    dyGo(false, dyCrew().ot);
  }
  function dyGo(prod, ot) {
    at(1200, function () { $("#dyLab").textContent = "Overtime"; $("#dyClock").textContent = "19:15"; dyMeter(prod ? 1960 : .75, prod ? 4000 : 1.5, prod ? "£1,960 of £4,000" : "0.75 hrs"); });
    at(2400, function () { $("#dyClock").textContent = "19:45"; dyNote("19:45", "Wrap in 15", prod ? "Kit back to the van by 20:30, drives to the DIT." : "Kit back by 20:30. Drives to the DIT before you go.", "amber"); });
    at(3600, function () {
      $("#dyLab").textContent = "Wrapped"; $("#dyClock").textContent = "20:00"; dyMeter(prod ? 2940 : 1.5, prod ? 4000 : 1.5, prod ? "£2,940 of £4,000" : "1.5 hrs, " + gbp2(ot));
      dyNote("20:00", "End of day", prod ? "32 crew, 18 on overtime, £2,940. Timesheets drafted, and the same summary sent to the crew." : "13.5 hrs with 1.5 overtime, timesheet drafted. Tomorrow's call is 07:30, turnaround fine.", "red");
      $("#dyPlay").hidden = false; $("#dyPlay").textContent = "Play it again";
    });
  }
  $("#dyPlay").addEventListener("click", dyPlay);
  $$("#dyAsk button").forEach(function (b) { b.addEventListener("click", function () { dyAnswer(b.getAttribute("data-a")); }); });
  $$(".day-copy > *").forEach(function (el, i) { watch(el, i * 70); }); watch($("#dy"), 120);

  /* ---- both sides: one wrap drafts every crew invoice, and the producer's check already matches ---- */
  var BD = [["gaffer", "Gaffer", 450, 1.5], ["spark", "Spark", 350, 1.5], ["camera", "1st AC", 480, 1.25], ["sound", "Sound recordist", 520, 1.25]], bdKey = "prod", bdT = [];
  function bdDraw(state) {
    bdT.forEach(clearTimeout); bdT = [];
    var board = $("#board"); board.classList.remove("paid");
    $("#bdRows").innerHTML = BD.map(function (c) { return '<div class="bd-r' + (c[0] === bdKey ? " you" : "") + '"><span>' + c[1] + '</span><span class="lab">Waiting for wrap</span><span class="tag wait">Open</span></div>'; }).join("");
    $("#bdTot").textContent = "£0"; $("#bdPayLab").textContent = "Pay run · Friday"; $("#bdApprove").disabled = true; $("#bdApprove").textContent = "Approve the run";
    $("#bdWrap").disabled = false; $("#bdWrap").textContent = "Tap wrap"; $("#bdReset").hidden = true;
  }
  function bdWrap() {
    $("#bdWrap").disabled = true; $("#bdWrap").textContent = "Wrapped";
    var rows = $$(".bd-r", $("#bdRows")), sum = 0;
    BD.forEach(function (c, i) {
      var ot = c[2] / 10 * c[3] * 2.5, t = c[2] + ot;
      bdT.push(setTimeout(function () {
        var r = rows[i]; r.classList.add("go");
        $(".lab", r).textContent = "Invoice drafted · " + gbp2(t);
        bdT.push(setTimeout(function () { var g = $(".tag", r); g.className = "tag ok"; g.textContent = "Matched"; sum += t; $("#bdTot").textContent = gbp2(sum); if (i === BD.length - 1) { $("#bdPayLab").textContent = "Pay run · Friday · 4 of 4 matched"; $("#bdApprove").disabled = false; } }, 380));
      }, 350 + i * 420));
    });
  }
  $("#bdWrap").addEventListener("click", bdWrap);
  $("#bdApprove").addEventListener("click", function () { $("#board").classList.add("paid"); $("#bdPayLab").textContent = "Paid Friday · 4 crew"; $("#bdApprove").disabled = true; $("#bdApprove").textContent = "Paid"; $("#bdReset").hidden = false; });
  $("#bdReset").addEventListener("click", function () { bdDraw(); });
  watch($("#board"), 120); $$(".both-copy > *").forEach(function (el, i) { watch(el, i * 70); });

  /* ---- run it as: the whole page follows your job ---- */
  function card(c, i) { var p = POS[i]; return '<div class="fl' + (i === 2 ? " red" : "") + '" style="--z:' + p.z + ';--x:' + p.x + ';--y:' + p.y + ';--r:' + p.r + '"><div class="fl-top"><span class="lab">' + c[0] + '</span><span class="tag' + (i === 1 ? " ok" : i === 2 ? " paper" : "") + '">' + c[1] + '</span></div><span class="fl-s">' + c[2] + "</span><b>" + c[3] + "</b></div>"; }
  var POS = [{ z: "60px", x: "-40px", y: "-150px", r: "-6deg" }, { z: "0px", x: "60px", y: "0px", r: "4deg" }, { z: "140px", x: "-20px", y: "150px", r: "-3deg" }];
  function rows(list) { return list.map(function (r) { return '<div class="scr-row' + (r[2] ? " " + r[2] : "") + '"><span>' + r[0] + "</span><b>" + r[1] + "</b></div>"; }).join(""); }
  function scard(l, b, q) { return '<div class="scr-card"><span class="lab">' + l + "</span><b>" + b + '</b><span class="scr-q">' + q + "</span></div>"; }
  function scr(lab, body, btn, red) { return '<div class="scr"><span class="lab">' + lab + "</span>" + body + '<span class="scr-btn' + (red ? " red" : "") + '">' + btn + "</span></div>"; }
  var PAY = scr("Pay run · Friday", rows([["30 invoices match", "£21,480"], ["2 queries drafted", "−£26.25", "amber"], ["Paid in 7 days", "APA terms", "q"]]), "Approve the run");
  var CREW_CHIPS = [["Crew passport", "Bank, UTR, NI, address, dietary and next of kin, filled in once. Every start pack fills itself.", 0], ["Crew directory", "Choose to be found. Producers see Available, Pencilled or Booked, never who for, and send holds you accept in a tap. No 10%, ever.", 0], ["Call sheet link", "Every version in one link, with what changed lit up and a ping when it does.", 0], ["Bank statements", "If you want, drop a CSV export from your bank into your Drive folder and payments are matched to invoices. No bank login. Skip it if you prefer.", 0], ["Holds and pencils", "Every pencil logged by who and when. Confirm one and the booking note is written.", 1], ["Booking notes", "Rate, hours, overtime and cancellation confirmed in writing, every time.", 1], ["Overtime", "Your band, the half hours, the late break and after midnight, worked out from the call and wrap.", 1], ["Turnaround", "Short rest between days spotted, with a note to the production drafted.", 1], ["Invoices", "Days, overtime, kit and miles on one invoice, numbered and dated for you.", 1], ["Chasing", "A friendly nudge on day 7, a firmer one after, then the Late Payment Act. You tap send.", 1], ["Receipts", "Snap a receipt and it lands on the right job and the right invoice.", 0], ["VAT and tax dates", "Your rolling turnover against the VAT threshold, with Self Assessment dates.", 1], ["Your details, once", "Bank, UTR and right to work saved, so start packs take a tap.", 0]];
  var PROD_CHIPS = [["Find crew", "Search the directory by department and date, see who is free, and send a hold. They join the job when they accept.", 0], ["Call sheet versions", "Send your own call sheet as a link. V2 and V3 light up what changed and ping everyone. Or build one in a minute.", 0], ["Edit links", "Your PM or coordinator posts call sheets and documents. Rates and budget stay hidden unless you share them.", 0], ["Bank statements", "If you want, drop a CSV export from your bank into your Drive folder and client payments and crew runs are matched. No bank login. Skip it if you prefer.", 0], ["Permit clock", "Every borough, Royal Parks, drone and child-licence deadline counted back from your shoot date.", 0], ["Start packs", "Bank details, UTR and right to work chased from every crew member before day one.", 0], ["Chasing", "A friendly nudge, a firm one, then the Late Payment Act. Drafted for you to send.", 1], ["Holds and pencils", "First and second pencils logged, with confirm-or-release notes written for you.", 1], ["Status link", "One page per job showing the agency where it is and what's waiting on them.", 0], ["Client notes", "Each client's PO rules, accounts inbox and payment day, used on every invoice.", 0], ["Rights and usage", "Usage end dates from every contract, with a renewal quote drafted before they lapse.", 0], ["Cash forecast", "Thirteen weeks of money in and out across every open job.", 0], ["Wrap report", "Budget against actual, with every approved extra and who approved it.", 0], ["Kit and POs", "Hire quotes compared, POs drafted, return dates and hire invoices matched.", 0]];
  /* more features per job, shown first in "the rest is there when you need it" */
  var EXTRA = {
    prod: [["Overtime ask", "Ask the whole unit to go over in one tap, see who's in and who wants a word."], ["Cost to complete", "Actuals against the budget, updated as crew invoices are checked."], ["Wrap book", "Contracts, releases, receipts and the final cost report in one folder for the agency."], ["Client extras log", "Every approved extra, with who said yes and when, on the balance invoice."]],
    pm: [["Unit call to every timesheet", "One unit call and wrap fills every crew member's day."], ["Crew list once", "Start forms, call sheet lines and deal memos all from one list."], ["Supplier insurance", "Certificates checked for expiry before kit goes on the truck."], ["Daily progress report", "Call, lunch, wrap and overtime from the day, drafted for you."]],
    dir: [["Treatment budget", "What each pitch is costing you, before you say yes to another."], ["Rep statements", "Every job's fee, rep share and what landed, checked against each other."], ["Usage reminders", "Your work's licence periods tracked, so renewals become fees."], ["Showreel credits", "Final credits for every job kept ready for your reel and site."]],
    dop: [["Grade days", "Grade attendance logged and invoiced like any prep day."], ["Lens and body log", "What went on each job, for insurance and cross-hire."], ["Camera team holds", "Pencil your AC, loader and DIT with your own dates."], ["Recce mileage", "Recce trips logged with miles, so they reach the invoice."]],
    gaffer: [["Genny and fuel", "Generator hire and fuel receipts on the department invoice."], ["Pre-rig team", "Riggers' days logged separately from the shoot crew."], ["Kit damage notes", "Photos and notes when a lamp comes back broken."], ["Team turnaround", "One warning when anyone in your team is short on rest."]],
    spark: [["Night premium", "Hours after midnight marked at the right rate."], ["Late break", "Lunch called late is noticed and added."], ["Two jobs, one week", "Back-to-back bookings with different terms kept apart."], ["Mileage to set", "Miles from home to the location added each day."]],
    grip: [["Car rig days", "Rigging and car days priced as their own day type."], ["Track and dolly log", "What went out on each job, and when it came back."], ["Rental house returns", "Cross-hired kit back by its deadline, with a reminder."], ["Van and parking", "Van miles and parking receipts added as you go."]],
    camera: [["Checkout days", "Rental house prep logged and paid."], ["Data handover", "The time cards went to the DIT, for when the night runs late."], ["Loader and AC grades", "Each grade's own overtime, even on a shared sheet."], ["Expendables", "Tape, batteries and wipes snapped and claimed."]],
    sound: [["Battery spend", "Batteries and consumables claimed per job."], ["Mic hire by day", "Extra radio mics priced for the days they were out."], ["Sound reports", "Reports filed with the job so post can find them."], ["Licence renewal", "Your radio mic licence date tracked."]],
    dit: [["Offload log", "When each card was offloaded and checked."], ["Drive handover", "Who got which drive, signed for."], ["Overnight transcodes", "Extra hours after wrap logged with the reason."], ["Cart hire terms", "Your cart rate and cancellation terms on every booking."]],
    art: [["Buyer floats", "Each buyer's float and receipts under your department."], ["Hire returns", "Prop hire return dates with a reminder before each one."], ["Set by set costs", "Spend tracked against each set's budget."], ["Strike day", "Strike and clear-up days invoiced, not forgotten."]],
    costume: [["Fittings diary", "Every fitting booked, with the time paid as prep."], ["Continuity notes", "What each character wore, with photos, kept with the job."], ["Approval buys", "Items on approval tracked until they're kept or returned."], ["Laundry and repairs", "Dry cleaning and repair receipts claimed per job."]],
    hmu: [["Early calls", "Calls before the unit call priced as early starts."], ["Cast notes", "Allergies and looks per actor, kept private to your team."], ["Team box rates", "Each artist's kit fee on the department invoice."], ["Wig and prosthetics hire", "Hire dates and returns tracked."]],
    locations: [["Recce packs", "Photos, access and parking notes per location."], ["Reinstatement", "Before and after photos paired for the sign-off."], ["Unit base", "Parking, toilets and power booked and costed."], ["Residents' contacts", "Everyone who got a letter, and who got back to you."]],
    runner: [["Pick-up log", "Every drop-off and pick-up with time and miles."], ["Petty cash", "What you spent for the production, with receipts, paid back."], ["First invoice", "Your first invoice laid out right, ready to send."], ["Long days", "Hours over 12 shown clearly when you talk about rates."]],
    editor: [["Cut versions", "Every version with who approved it and when."], ["Assist days", "Your assistant's days on the same invoice."], ["Deliverables list", "Each master and cut-down ticked off before you invoice."], ["Project rates", "Rounds and days agreed in writing before you start."]]
  };
  function withExtra(k, base) { var x = EXTRA[k]; return x ? x.map(function (e) { return [e[0], e[1], 2]; }).concat(base) : base; }

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
  /* per-job copy from the crew pain points research: the headline, the pain, and three things only that job needs */
  var COPY = {
    prod: { h1: "Get paid before you pay out.", lede: "The advance drafted from the award email, what the agency owes beside what crew are owed, and every chase waiting in your Gmail drafts.",
      pain: "Crew paid in days. Agency in weeks.", spot: [
      ["The holdback checklist.", "Every licence, assignment and release the agency could hold the last payment over, with a request drafted to each supplier still missing one.", [["Music licence", "signed"], ["Location release, NW3", "chase drafted", "amber"], ["Talent buyout", "signed"]]],
      ["Your cash gap, by job.", "Crew and suppliers due on short terms, next to client money due on long terms, from the invoices already checked.", [["Crew and kit, due Fri", "−£21,480"], ["Advance, received", "£42,000"], ["Balance, due 30 days", "£42,000", "amber"]]],
      ["The cover sheet pack.", "Insurance schedule, wrap insurance and PL cover for each job in your Drive, ready to attach to permits and kit hire.", [["PL cover sheet", "in Drive"], ["Wrap insurance", "client's", "q"], ["Kit hire request", "attached"]]]] },
    pm: { h1: "One crew list, every form.", lede: "Enter each crew member once. Their start pack, deal memo, call sheet line and invoice check are drafted from it, for you to read and send.",
      pain: "The same crew list, typed five times.", spot: [
      ["Start packs by status.", "A different pack for PAYE, loan-out and self-employed crew, with a status statement drafted for each contractor who needs one.", [["PAYE, 6 crew", "P45 asked"], ["Loan-out, 3", "status drafted", "amber"], ["Self-employed, 5", "sent"]]],
      ["The borough permit clock.", "Each borough's own lead time for the permit, the bays and the drone, counted down, with the cover sheet each one needs.", [["Camden permit", "apply by Fri", "amber"], ["Bay suspension", "by 12 Nov"], ["Drone notice", "by 14 Nov"]]],
      ["The float register.", "Who signed for which float, what's still out, and which envelopes aren't reconciled yet, across every department.", [["Art, £500", "£42.10 out", "amber"], ["Costume, £800", "settled"], ["Locations, £300", "settled"]]]] },
    dir: { h1: "Know what each pitch cost you.", lede: "A running record of every treatment you write, what it cost and which dates you're pencilled for, with your fee invoice drafted the day a job awards.",
      pain: "Treatments are free. Making them isn't.", spot: [
      ["The pitch cost log.", "Hours, writers, designers and image costs against each treatment, so you see what winning the work really cost.", [["Sportswear, treatment", "3 days"], ["Designer, references", "£250", "amber"], ["Result", "won"]]],
      ["Pencils across companies.", "Every date pencilled by every company or rep in one diary, with the release terms each one agreed.", [["Northbound Films", "1st · 12, 13"], ["Field &amp; Co", "1st · 13", "amber"], ["Low Tide", "2nd · 14", "q"]]],
      ["The fee and the split.", "Your fee invoice and a statement of the rep's or company's share, written down before the money moves.", [["Director's fee", "£6,000.00"], ["Rep, 20%", "−£1,200.00"], ["To you", "£4,800.00"]]]] },
    dop: { h1: "Kit and prep days, on the bill.", lede: "Your camera package and your recce, prep and tech recce days on their own lines, checked against your terms, with the invoice drafted for you.",
      pain: "The recce and the kit get lost.", spot: [
      ["Camera package lines.", "Body, lenses, monitoring and wireless saved with a day rate each, added for the days they were on the job.", [["Body and lenses, 3 days", "£1,350"], ["Wireless video", "£180"], ["Cross-hire zoom", "PO drafted", "amber"]]],
      ["Every prep day, its own type.", "Recce, tech recce, pre-light, prep and grade attendance, each logged with its own day length.", [["Recce", "half day"], ["Tech recce", "1 day"], ["Grade attendance", "1 day", "amber"]]],
      ["The kit cover sheet.", "Your insurance certificate, kit values and serials attached to each booking, so whose policy it's on is settled before the shoot.", [["Insurance cert", "attached"], ["Kit list, serials", "attached"], ["Production cover", "asked", "amber"]]]] },
    gaffer: { h1: "Your whole crew's week, done.", lede: "Enter the unit call and wrap once, add who pre-called or went early, and every spark's timesheet and the department invoice are drafted on the right terms.",
      pain: "A whole team, three overtime grades.", spot: [
      ["The team timesheet.", "Each person's day built from one unit call and wrap, plus the pre-call riggers and the spark who went early.", [["Unit call, wrap", "07:00 to 20:30"], ["Rigging spark, pre-call", "05:30", "amber"], ["Spark, released", "18:00", "q"]]],
      ["Mixed deals, one invoice.", "Your own deal and each spark's rate on one department invoice, or one invoice each if production wants them split.", [["Gaffer, own deal", "£1,856.25"], ["Best boy", "£1,650.00"], ["Sparks, 2", "£2,887.50"]]],
      ["Lighting kit lines.", "Your lamps, distro and cable as a saved kit list, priced by the day on its own line.", [["Lamps, 3 days", "£360"], ["Distro and cable", "£90"], ["Genny, cross-hired", "back Fri", "amber"]]]] },
    spark: { h1: "Rig day or shoot day, sorted.", lede: "Systems knows a rig day from a shoot day, catches a broken turnaround from last night's wrap, and drafts the timesheet with the rule shown on each line.",
      pain: "Last night's wrap, this morning's call.", spot: [
      ["Rig and shoot rates.", "Rigging, prep and shoot days each at their own rate, and the new rates if the job runs past 1 September.", [["Rig day", "£350"], ["Shoot, 2 days", "£700"], ["De-rig", "£350"]]],
      ["The turnaround catch.", "The gap from your last wrap to your next call, measured, with any broken turnaround on the sheet and the rule it used.", [["Wrap, day 3", "23:30"], ["Call, day 4", "07:00"], ["Rest", "7.5 hrs", "amber"]]],
      ["Your engager log.", "Who booked you and for how many days over the last 12 months, the record you need if your status is ever questioned.", [["Engagers, 12 months", "14"], ["Days worked", "126"], ["Longest booking", "9 days", "q"]]]] },
    grip: { h1: "Your kit is part of the job.", lede: "Your dolly, track and heads on their own invoice lines, a record of the kit you supplied in your Drive, and a chase drafted if you're paid late.",
      pain: "The dolly works as hard as you do.", spot: [
      ["The grip kit register.", "Dollies, track, heads and cranes with serials and values, and the ones you used added to each job's invoice.", [["Dolly, 2 days", "£300"], ["Track, 40ft", "£60"], ["Remote head", "£220"]]],
      ["Supplied kit, on record.", "A note of the substantial kit you provided on each job, filed in your Drive to back up your self-employed status.", [["Sportswear spot", "dolly, track"], ["Canal promo", "jib", "q"], ["Filed", "in Drive"]]],
      ["Sub-hire lines.", "Kit you cross-hired from a rental house as its own line, with the hire paperwork attached.", [["Crane, cross-hire", "£450"], ["Hire note", "attached", "q"], ["Back to the house", "Mon", "amber"]]]] },
    camera: { h1: "Camera wrap isn't your wrap.", lede: "Log the time you actually finished, not just camera wrap, and the timesheet is drafted on your own grade's overtime with the working shown.",
      pain: "Camera wraps. You're still packing.", spot: [
      ["Your own wrap time.", "Your wrap after de-rig and kit return, next to the unit wrap, so the difference is on the sheet.", [["Camera wrap", "20:00"], ["Your wrap", "21:10"], ["Overtime", "1.25 hrs", "amber"]]],
      ["Overtime at your grade.", "The loader's or focus puller's own grade applied, so a shared sheet never gives everyone one multiplier.", [["Focus puller", "1.25x"], ["Loader", "1.5x"], ["After midnight", "3x", "amber"]]],
      ["Small kit fees.", "Monitors, follow focus and batteries saved as a kit fee you can add to any day.", [["Follow focus", "£45"], ["Monitor and batteries", "£40"], ["On the invoice", "added", "q"]]]] },
    dit: { h1: "Drives, cart and hours, billed.", lede: "Your cart, software and every drive you bought for the job on separate lines, with receipts filed in your Drive and the invoice drafted for you.",
      pain: "The offload ends after everyone's gone.", spot: [
      ["The media recharge log.", "Each drive and shuttle you bought, with its receipt, added to the invoice as a recharge.", [["4TB drives, 3", "£297.00"], ["Shuttles, 2", "£180.00"], ["Receipts", "in Drive", "q"]]],
      ["Cart and software.", "Your cart, monitoring and software as a daily kit line, apart from your labour.", [["DIT cart, 2 days", "£500"], ["Grading software", "£60"], ["Monitor, cross-hire", "£90", "amber"]]],
      ["The data wrap.", "When the last backup finished after unit wrap, so the extra time is on your sheet.", [["Unit wrap", "20:00"], ["Last backup", "21:15"], ["Overtime", "1.25 hrs", "amber"]]]] },
    sound: { h1: "Every channel on every invoice.", lede: "Build your kit package once, by the channel, and it goes on every invoice next to your day rate, with the cancellation terms written into the booking.",
      pain: "Every radio mic is kit. Bill it.", spot: [
      ["Your package, by the channel.", "Radio mics, IEMs, extra booms and timecode priced per item, and each job's kit line built from what you took.", [["Radio mics, 6 channels", "£210"], ["Extra boom", "£15"], ["Timecode boxes, 3", "£45"]]],
      ["Your licence, shared out.", "Your radio mic licence spread across the jobs you used it on, so it's never quietly absorbed.", [["Licence, this year", "split"], ["Jobs this month", "6"], ["Per job", "added", "q"]]],
      ["Pencils and drops, on record.", "Who pencilled you, when they released you and how much notice they gave, with the cancellation invoice drafted where the terms allow.", [["Pencil, Tue", "Field &amp; Co"], ["Released", "Mon 18:00", "amber"], ["Cancellation", "drafted", "q"]]]] },
    editor: { h1: "Version 7 wasn't in the quote.", lede: "The rounds of notes your quote included, counted against the rounds you've done, with the extra line drafted when a cut runs past them, to send or hold.",
      pain: "One more round of notes. Then another.", spot: [
      ["The rounds counter.", "Rounds included and rounds used, for each cut, with a polite out-of-scope note drafted when they run over.", [["Rounds in the quote", "3"], ["Rounds done", "5", "amber"], ["Out-of-scope note", "drafted", "q"]]],
      ["Suite and storage.", "Your own edit seat, storage or room as a weekly kit line on the same invoice.", [["Edit seat, 2 weeks", "£300"], ["Storage, 8TB", "£80"], ["On the invoice", "added", "q"]]],
      ["The extra day log.", "Late nights and extra days against a day-rate deal, so the invoice matches the edit, not the quote.", [["Quoted", "8 days"], ["Worked", "10 days", "amber"], ["Saturday", "1 day"]]]] },
    art: { h1: "Balance the float before wrap.", lede: "Snap each receipt at the till. It's coded to the set, your float balance is kept, and a missing one is flagged while the shop can still reprint it.",
      pain: "Lose a receipt, pay it yourself.", spot: [
      ["Your float, live.", "Cash plus receipts against the float you signed for, every day of the job.", [["Float signed for", "£500.00"], ["Receipts, 14", "£457.90"], ["Cash in hand", "£42.10", "amber"]]],
      ["Receipt to set.", "Each receipt coded to the set, the item and the budget line, and filed in your Drive before the thermal paper fades.", [["Kitchen, dressing", "£86.40"], ["Bedroom, lamps", "£54.00"], ["Card slip, no items", "ask shop", "amber"]]],
      ["Box rental and prep, flagged.", "Your box rental added to the invoice, and any prep or wrap days your contract tries to fold in, flagged.", [["Box rental, 5 days", "£150"], ["Prep, 2 days", "on the deal"], ["Strike day", "not in deal", "amber"]]]] },
    costume: { h1: "Never miss a returns window.", lede: "Every buy logged with its receipt and the shop's returns deadline. See what's due back this week, with the paperwork kept until the last refund lands.",
      pain: "The shoot wraps. The returns pile doesn't.", spot: [
      ["The returns countdown.", "Each shop's returns window, and what must go back by when, even after wrap.", [["Coat, Selfridges", "by 2 Nov", "amber"], ["Boots, 2 pairs", "by 5 Nov"], ["Returned", "£214.00", "q"]]],
      ["Every item, by character.", "Bought, on approval, worn on camera or going back, so nothing that's been on camera goes back to the shop.", [["Lead, coat", "on camera"], ["Lead, scarf", "returning", "amber"], ["Extras, 4 shirts", "on approval"]]],
      ["Refunds, flagged.", "Any refund that lands on a personal card instead of the production card, flagged so the float still balances.", [["Refund, boots", "£89.00"], ["Landed on", "your card", "amber"], ["Float", "adjusted", "q"]]]] },
    hmu: { h1: "Kit fee here, consumables there.", lede: "Your weekly box rate on the invoice and the products you bought for each actor on a separate claim with receipts, so neither gets swallowed by the other.",
      pain: "Kit and products, lumped into one.", spot: [
      ["Your weekly box rate.", "Your agreed box rate added for each week worked, pro rata for part weeks.", [["Box rate, week 1", "£175"], ["Week 2, 3 days", "£105"], ["On the invoice", "added", "q"]]],
      ["Consumables by cast.", "Products and receipts logged against each cast member, and the claim to production drafted.", [["Lead actor", "£48.20"], ["Supporting, 2", "£31.50"], ["Claim", "drafted", "q"]]],
      ["The extra hour, counted.", "TV drama days built on 10+1+1, so early calls and overtime start in the right place.", [["Your call", "05:00"], ["Unit call", "07:00"], ["Early call", "2 hrs", "amber"]]]] },
    locations: { h1: "Every permit clock in one place.", lede: "Add a location and that council's permit, bay and letter deadlines count down, with the residents' letter drafted and before-and-after photos kept.",
      pain: "Every council, its own deadline.", spot: [
      ["The council clock.", "Permit, bay suspension, the residents' letter drop and the council copy, counted down by each council's own rules.", [["Permit, Westminster", "apply now", "amber"], ["Bay suspension", "by 12 Nov"], ["Residents' letters", "drop by 14 Nov"]]],
      ["Before and after.", "Timestamped photos of each room or street, before and after, paired up for the reinstatement check.", [["Hallway", "before, after"], ["Kitchen", "before, after"], ["Front garden", "after missing", "amber"]]],
      ["Fees and deposits.", "Parking paid upfront, location fees and deposits, who paid them, and which deposits are still owed back.", [["House, NW3", "£2,500"], ["Deposit", "£500 owed back", "amber"], ["Bays, 2 streets", "paid", "q"]]]] },
    runner: { h1: "Every hour and receipt counted.", lede: "Log your call, your wrap and anything you paid for, and it becomes a timesheet with your hours written down and your receipts attached, ready to send.",
      pain: "A day rate with no hours on it.", spot: [
      ["Hours on a day rate.", "Your real call and wrap against a day rate with no stated hours, so the long days are on paper when you ask about overtime.", [["Day 1", "07:00 to 19:30"], ["Day 2", "06:30 to 21:00"], ["Hours, 2 days", "27.5", "amber"]]],
      ["PAYE or invoice?", "Whether a runner booking is likely to be PAYE or invoiced, with the rule explained. Production makes the call.", [["Booking", "2 days"], ["Likely", "PAYE", "amber"], ["Start form", "drafted", "q"]]],
      ["Receipts, paid back.", "Lunches, fuel and parking you paid for, snapped and added, so nothing comes out of your own pocket.", [["Lunch run", "£64.20"], ["Parking", "£22.00"], ["Fuel", "£18.00", "q"]]]] }
  };
  Object.keys(EXTRA).forEach(function (k) { if (ROLES[k]) ROLES[k].chips = withExtra(k, ROLES[k].chips); });
  Object.keys(COPY).forEach(function (k) {
    var c = COPY[k], R = ROLES[k];
    R.h1 = c.h1; R.lede = c.lede;
    R.spot = { lab: "Made for " + (R.crew ? R.crew.plural : k === "prod" ? "producers" : k === "pm" ? "production managers" : "directors"), h: c.pain, items: c.spot };
  });
  ROLES.hod = crewRole("gaffer");
  var PICK = ["prod", "pm", "dir", "dop", "gaffer", "spark", "grip", "camera", "sound", "dit", "art", "costume", "hmu", "locations", "editor", "runner"];
  var GUESS = [[/line producer|producer|exec/, "prod"], [/production (manager|coord)|coordinator|\bpm\b|\bad\b|assistant director|1st ad|first ad|script sup/, "pm"], [/dop|\bdp\b|cinematographer|director of photography|camera op|steadicam|operator/, "dop"], [/director/, "dir"], [/gaffer|best boy/, "gaffer"], [/spark|electric|rigger|lighting/, "spark"], [/grip|dolly|crane/, "grip"], [/focus|\bac\b|camera ass|clapper|loader|camera/, "camera"], [/\bdit\b|data|media/, "dit"], [/sound|boom|mixer|audio/, "sound"], [/art|design|set dress|props|buyer|construct|scenic|graphic/, "art"], [/costume|wardrobe|stylist|dresser/, "costume"], [/make|hair|hmu|mua|prosthetic/, "hmu"], [/location|unit manager|marshal/, "locations"], [/edit|colou?r|vfx|grade|post|online|motion|anim/, "editor"], [/runner|\bpa\b|assistant|driver/, "runner"]];
  function guess(t) { t = t.toLowerCase(); for (var i = 0; i < GUESS.length; i++) if (GUESS[i][0].test(t)) return GUESS[i][1]; return "runner"; }
  function custom(name) {
    var base = guess(name), R = Object.assign({}, ROLES[base]), nice = name.trim().replace(/\s+/g, " ").slice(0, 32);
    nice = nice.charAt(0).toUpperCase() + nice.slice(1);
    R.n = nice; if (base !== "prod" && base !== "pm") R.h1 = nice + " admin, made easy.";
    if (R.spot) R.spot = { lab: "Made for you", h: R.spot.h, items: R.spot.items };
    return R;
  }

  var pills = $("#whoPills"), other = $("#whoOther"), otherIn = $("#whoIn");
  pills.innerHTML = PICK.map(function (k) { return '<button type="button" role="radio" data-r="' + k + '">' + ROLES[k].n + "</button>"; }).join("") + '<button type="button" role="radio" data-r="other">Something else</button>';
  var chips = $("#chips"), out = $("#chipOut"), CH = [], chipFor = "you";
  function pickChip(i) { var f = CH[i]; $$("button", chips).forEach(function (b, j) { b.setAttribute("aria-selected", j === i ? "true" : "false"); }); out.innerHTML = '<span class="lab">' + (f[2] === 2 ? "Made for " + chipFor + " · in the pilot" : f[2] ? "In the app now" : "Coming in the pilot") + "</span><h3>" + f[0] + "</h3><p>" + f[1] + "</p>"; }
  function spotCard(it) { return '<article class="sp"><h3>' + it[0] + "</h3><p>" + it[1] + '</p><div class="sp-scr">' + rows(it[2]) + "</div></article>"; }
  var cur0 = null;


  /* ---- call sheet versions: only what changed lights up ---- */
  var CSV = [
    { seen: "Opened by 32 of 32 crew", by: "Posted by the producer, 16:02", r: [["Call", "07:00"], ["Location", "Canal, E2"], ["Unit base", "Wharf Rd car park"], ["Lunch", "13:00"], ["Weather", "Dry, 14\u00b0"]] },
    { seen: "Opened by 32 of 32 crew", by: "Posted by the PM, 18:40", r: [["Call", "06:30", "07:00"], ["Location", "Canal, E2"], ["Unit base", "Wharf Rd car park"], ["Lunch", "12:30", "13:00"], ["Weather", "Dry, 14\u00b0"]] },
    { seen: "Opened by 29 of 32 crew", by: "Posted by the coordinator, 21:14", r: [["Call", "06:30"], ["Location", "Canal, E2, then Studio 3", "Canal, E2"], ["Unit base", "Studio 3 car park", "Wharf Rd car park"], ["Lunch", "12:30"], ["Weather", "Showers after 3"]] }
  ];
  CSV[2].r[4][2] = "Dry, 14\u00b0";
  function csDraw(v) {
    var V = CSV[v];
    $$("#csV button").forEach(function (b) { b.setAttribute("aria-selected", +b.getAttribute("data-v") === v ? "true" : "false"); });
    $("#csRows").innerHTML = V.r.map(function (r) { return '<div class="cs-r' + (r[2] ? " ch" : "") + '"><span class="lab">' + r[0] + "</span><b>" + (r[2] ? "<s>" + r[2] + "</s>" : "") + r[1] + "</b></div>"; }).join("");
    $("#csSeen").textContent = V.seen; $("#csBy").textContent = V.by;
  }
  $$("#csV button").forEach(function (b) { b.addEventListener("click", function () { csDraw(+b.getAttribute("data-v")); }); });
  csDraw(2);
  $$(".csh-copy > *, .pp-copy > *").forEach(function (el, i) { watch(el, (i % 5) * 70); }); watch($("#cs"), 120); watch($("#dir"), 120);

  /* ---- directory: available, pencilled or booked, never who for ---- */
  var DIR = [["AR", "Ana R.", "1st AC · 12 commercials this year", "ok"], ["TW", "Tom W.", "1st AC · Alexa Mini, Venice", "pen"], ["PK", "Priya K.", "1st AC · 2nd unit drama", "ok"], ["LB", "Leon B.", "1st AC · music videos", "book"]];
  $("#dirRows").innerHTML = DIR.map(function (d, i) {
    var st = d[3] === "ok" ? '<span class="st-p av-ok">Available</span><button type="button" data-i="' + i + '">Send hold</button>' : d[3] === "pen" ? '<span class="st-p pen">Pencilled</span>' : '<span class="st-p">Booked</span>';
    return '<div class="dr"><span class="av">' + d[0] + "</span><span>" + d[1] + '</span><span class="lab">' + d[2] + '</span><span class="st">' + st + "</span></div>";
  }).join("");
  $("#dirRows").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b || b.classList.contains("sent")) return; b.classList.add("sent"); b.textContent = "Hold sent"; });


  /* ---- keep the 10%: drag your rate and days ---- */
  function gbp0(n) { return "\u00a3" + Math.round(n).toLocaleString("en-GB"); }
  function kcDraw() {
    var r = +$("#kcR").value, d = +$("#kcD").value, fee = r * d * .1;
    $("#kcRate").textContent = gbp0(r); $("#kcDays").textContent = d; $("#kcFee").textContent = gbp0(fee); $("#kcKeep").textContent = gbp0(Math.max(0, fee - 48));
    $("#kcR").setAttribute("aria-valuetext", gbp0(r)); $("#kcD").setAttribute("aria-valuetext", d + " days");
  }
  $("#kcR").addEventListener("input", kcDraw); $("#kcD").addEventListener("input", kcDraw); kcDraw();
  function ofTake(yes) {
    $("#offer").classList.add("took"); $("#ofAgain").hidden = false;
    ["#ofDay", "#ofDay2"].forEach(function (id, i) { var r = $(id); r.classList.add("in"); r.style.animationDelay = (reduce ? 0 : 200 + i * 120) + "ms"; $(".q", r).textContent = yes ? "Booked: car commercial" : "Free"; if (!yes) r.classList.remove("in"); });
  }
  $("#ofYes").addEventListener("click", function () { ofTake(true); });
  $("#ofNo").addEventListener("click", function () { ofTake(false); });
  $("#ofAgain").addEventListener("click", function () { $("#offer").classList.remove("took"); $("#ofAgain").hidden = true; ["#ofDay", "#ofDay2"].forEach(function (id) { var r = $(id); r.classList.remove("in"); $(".q", r).textContent = "Free"; }); });
  $$(".keep-copy > *").forEach(function (el, i) { watch(el, i * 70); }); watch($("#offer"), 120);

  /* ---- prices: a plan, then packs on top ---- */
  var PLANS = { crew: 0, producer: 19, company: 59 };
  var PACKS = {
    crew: [["Crew Pro: inbox, invoices, diary", 4], ["Bank matching", 2], ["Calendar sync", 2]],
    producer: [["Live day", 6], ["Bank matching", 2], ["Permits", 4], ["Rights and usage", 6]],
    company: [["Bank matching", 2], ["Permits", 4], ["Extra person", 8], ["Big shoots, 60+ crew", 20]]
  };
  var prPlan = "producer", prOn = { crew0: true };
  function prDraw() {
    $$("#prPlans .plan").forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-p") === prPlan ? "true" : "false"); });
    $("#prPacks").innerHTML = PACKS[prPlan].map(function (p, i) { return '<button type="button" data-i="' + i + '" aria-pressed="' + (prOn[prPlan + i] ? "true" : "false") + '">' + p[0] + "<span>+&pound;" + p[1] + "</span></button>"; }).join("");
    prSum();
  }
  function prSum() {
    var t = PLANS[prPlan]; PACKS[prPlan].forEach(function (p, i) { if (prOn[prPlan + i]) t += p[1]; });
    var b = $("#prTot"); b.textContent = t ? "\u00a3" + t : "Free"; b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
    $("#prFine").innerHTML = prPlan === "crew" ? "Overtime and timesheets are free on every job. One missed hour on a &pound;450 day is &pound;67.50, more than a year of Crew Pro." : "Catch one missed overtime hour on a &pound;450 day, &pound;67.50, and the month has paid for itself.";
    var d = t * 12 / 365; $("#prDay").textContent = !t ? "overtime and timesheets, every job" : "about " + (d < 1 ? Math.round(d * 100) + "p" : "\u00a3" + d.toFixed(2)) + " a day";
  }
  $$("#prPlans .plan").forEach(function (b) { b.addEventListener("click", function () { prPlan = b.getAttribute("data-p"); prDraw(); }); });
  $("#prPacks").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; var k = prPlan + b.getAttribute("data-i"); prOn[k] = !prOn[k]; b.setAttribute("aria-pressed", prOn[k] ? "true" : "false"); prSum(); });
  $$(".pr-h > *, .pr-build, .pr-fine, .pr-perks li, .price .sp-note").forEach(function (el, i) { watch(el, (i % 4) * 70); }); $$("#prPlans .plan").forEach(function (el, i) { watch(el, i * 80); });
  prDraw();

  function render(key, R) {
    R = R || ROLES[key];
    try { localStorage.setItem("sys-role", key === "other" ? "other:" + R.n : key); } catch (e) {}
    $$("button", pills).forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-r") === key ? "true" : "false"); });
    other.hidden = key !== "other";
    var sel = $('[data-r="' + key + '"]', pills); if (sel && pills.scrollWidth > pills.clientWidth) pills.scrollTo({ left: sel.offsetLeft - 16, behavior: "smooth" });
    $("#asName").textContent = R.n;
    bdKey = key; bdDraw();
    prPlan = key === "prod" || key === "pm" ? "producer" : "crew"; prDraw();
    if (R.rate) { $("#kcR").value = R.rate; kcDraw(); }
    dyKey = key === "other" ? guess(R.n) : key; dyReset();
    ibKey = key === "other" ? guess(R.n) : key; if (ibSeen) ibPlay();
    $("#ibP").textContent = (key === "prod" || key === "pm") ? "Systems reads your work email and turns it into the job. Awards, crew invoices, client extras and council questions are sorted as they land. You only see what needs you, with the reply already drafted." : "Systems reads your work email and turns it into your diary, timesheets and invoices. Holds, call sheets, changes and payments are sorted as they land. You only see what needs you, with the reply already drafted.";
    var tk = key === "other" ? guess(R.n) : key;
    $$('a[href*="systems-app/"]').forEach(function (l) { if (!/\.html/.test(l.getAttribute("href"))) l.href = l.href.split("?")[0] + "?as=" + tk; });
    var gk = key === "other" ? guess(R.n) : key, crewH = ["prod", "pm", "dir"].indexOf(gk) < 0, H1 = crewH ? "Your diary. Minus the 10%." : R.h1;
    var h1 = $("#h1"); if (h1.textContent !== H1) { h1.textContent = H1; h1.classList.remove("swap"); void h1.offsetWidth; h1.classList.add("swap"); } h1.classList.toggle("long", H1.length > 26);
    $("#lede").textContent = crewH ? "Holds, offers and availability in one place. Producers find you, you tap accept. " + R.h1 : R.lede; $("#fine").textContent = R.fine;
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
    chipFor = R.spot ? R.spot.lab.replace("Made for ", "") : "you"; chips.classList.toggle("has-job", !!EXTRA[key]);
    CH = R.chips; chips.innerHTML = CH.map(function (f, i) { return '<button role="tab" type="button" aria-selected="false" data-i="' + i + '">' + (f[2] === 1 ? "<i></i>" : "") + f[0] + "</button>"; }).join("");
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
