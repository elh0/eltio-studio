/* Eltio Systems, freelancer app, first working version.
   Data lives in ONE Google Sheet in the user's own Drive (scope drive.file: the app only sees files it made).
   Phone and desktop read the same sheet, so they always match. Without a Google client ID it runs on sample data
   kept in this browser only. Nothing is ever sent for the user: drafts open in their own mail app. */
(function () {
"use strict";

/* ---------- small helpers ---------- */
var $ = function (id) { return document.getElementById(id); };
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function parse(s) { if (!s) return null; var p = String(s).split("-"); if (p.length !== 3) return null; var d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d) ? null : d; }
function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
function daysBetween(a, b) { return Math.round((b - a) / 864e5); }
var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
function nice(s) { var d = parse(s); return d ? d.getDate() + " " + MON[d.getMonth()] : ""; }
function niceRange(a, b) { if (!b || b === a) return nice(a); var A = parse(a), B = parse(b); if (A && B && A.getMonth() === B.getMonth()) return A.getDate() + " to " + nice(b); return nice(a) + " to " + nice(b); }
function num(v) { var n = parseFloat(String(v == null ? "" : v).replace(/[£,\s]/g, "")); return isNaN(n) ? 0 : n; }
function money(n) { return "£" + Math.round(n).toLocaleString("en-GB"); }
function first(s) { return String(s || "").trim().split(/\s+/)[0] || ""; }

/* ---------- sky follows the time of day ---------- */
function phase() { var h = new Date().getHours(); return h >= 5 && h < 10 ? "dawn" : h < 16 ? "day" : h < 21 ? "dusk" : "night"; }
function greet() { return { dawn: "Good morning", day: "Good afternoon", dusk: "Good evening", night: "Evening" }[phase()]; }
function paintSky() { var p = phase(); document.documentElement.dataset.sky = p; var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = "#0E0E0D"; }

/* ---------- data shape (also the columns of each sheet tab) ---------- */
var TABS = {
  Bookings: ["id", "start", "end", "client", "production", "contact", "status", "rate", "days", "agent", "notes", "terms", "kit", "extra", "po"],
  Invoices: ["id", "booking", "number", "client", "contact", "amount", "issued", "due", "paid", "notes"],
  Expenses: ["id", "date", "booking", "item", "amount", "notes"],
  Days: ["id", "booking", "date", "type", "call", "lunchAt", "lunch", "wrap", "miles", "adjust", "source", "notes"],
  Settings: ["key", "value"]
};
var KEY = { Bookings: "bookings", Invoices: "invoices", Expenses: "expenses", Days: "days" };
var STATUSES = ["Pencil", "First hold", "Second hold", "Confirmed", "Cancelled"];
var D = { bookings: [], invoices: [], expenses: [], days: [], settings: {} };

/* ---------- store: Google Sheets, or sample data in this browser ---------- */
var CFG = window.ELTIO_CONFIG || {};
var SCOPE = "https://www.googleapis.com/auth/drive.file openid email profile";
var G = { token: null, exp: 0, client: null, sheetId: null, email: "" };
var mode = null; /* "google" | "demo" */
var DEMO_KEY = "eltio-systems-demo-3";

/* A year of paid work so the graphs have something to show in sample mode. */
function history(d) {
  var C = ["Northlight Films", "Studio Kite", "Field Records", "Ironbridge Pictures", "Harbour Drama", "Moth & Co"], A = [1950, 1300, 2600, 650, 3250, 1950, 1300, 2275, 1950, 3900, 650, 1300, 2600, 1950], L = [24, 41, 12, 30, 55, 19, 28, 9, 35, 47, 21, 14, 33, 26];
  return A.map(function (a, i) { var iss = -80 - i * 21; return { id: "h" + i, booking: "", number: "INV-2025-" + String(40 + i), client: C[i % C.length], contact: "", amount: String(a), issued: d(iss), due: d(iss + 30), paid: d(iss + L[i]), notes: "" }; });
}
function sample() {
  var t = today(), d = function (n) { return iso(addDays(t, n)); };
  return {
    settings: { name: "", trading: "", role: "DP", rate: "650", terms: "30", tax: "25", mileage: "45", mail: "Gmail", hasAgent: "No", agent: "", agentEmail: "", invoicePrefix: "INV" },
    bookings: [
      { id: "b1", start: d(12), end: d(13), client: "Northlight Films", production: "Commercial", contact: "pm@example.com", status: "Confirmed", rate: "650", days: "2", agent: "", notes: "" },
      { id: "b2", start: d(7), end: "", client: "Field Records", production: "Music video", contact: "producer@example.com", status: "First hold", rate: "650", days: "1", agent: "", notes: "Second hold from another job the same day" },
      { id: "b3", start: d(19), end: "", client: "Studio Kite", production: "Branded film", contact: "hello@example.com", status: "Second hold", rate: "650", days: "1", agent: "yes", notes: "" },
      { id: "b4", start: d(-35), end: d(-34), client: "Northlight Films", production: "Commercial", contact: "pm@example.com", status: "Confirmed", rate: "650", days: "2", agent: "", notes: "", terms: "APA" },
      { id: "b5", start: d(-6), end: "", client: "Field Records", production: "Music video", contact: "producer@example.com", status: "Confirmed", rate: "650", days: "1", agent: "", notes: "", terms: "Flat day" },
      { id: "b6", start: d(-3), end: d(-2), client: "Ironbridge Pictures", production: "Car commercial", contact: "pm@example.com", status: "Confirmed", rate: "650", days: "2", agent: "", notes: "", terms: "APA", kit: "150", po: "PO-4471" },
      { id: "b7", start: d(-10), end: d(-9), client: "Harbour Drama", production: "TV drama, second unit", contact: "payroll@example.com", status: "Confirmed", rate: "420", days: "2", agent: "", notes: "", terms: "TV drama" }
    ],
    invoices: [
      { id: "i1", booking: "b4", number: "INV-2026-014", client: "Northlight Films", contact: "pm@example.com", amount: "1300", issued: d(-33), due: d(-3 - 30 + 30 - 8), paid: "", notes: "" },
      { id: "i2", booking: "", number: "INV-2026-013", client: "Studio Kite", contact: "hello@example.com", amount: "2400", issued: d(-70), due: d(-40), paid: "", notes: "" },
      { id: "i3", booking: "", number: "INV-2026-012", client: "Field Records", contact: "producer@example.com", amount: "1800", issued: d(-50), due: d(-20), paid: d(-12), notes: "" }
    ].concat(history(d)),
    expenses: [],
    days: [
      { id: "d1", booking: "b6", date: d(-3), type: "Normal", call: "06:30", lunchAt: "13:15", lunch: "1 hour", wrap: "20:00", miles: "38", adjust: "", source: "Call sheet", notes: "" },
      { id: "d2", booking: "b6", date: d(-2), type: "Normal", call: "07:00", lunchAt: "12:30", lunch: "1 hour", wrap: "00:30", miles: "38", adjust: "", source: "AD's times", notes: "" },
      { id: "d3", booking: "b7", date: d(-10), type: "Normal", call: "07:00", lunchAt: "", lunch: "1 hour", wrap: "19:45", miles: "", adjust: "", source: "Call sheet", notes: "" },
      { id: "d4", booking: "b7", date: d(-9), type: "Normal", call: "06:00", lunchAt: "", lunch: "Semi-continuous", wrap: "23:30", miles: "", adjust: "", source: "My own", notes: "" }
    ]
  };
}

function demoLoad() { try { var s = JSON.parse(localStorage.getItem(DEMO_KEY) || "null"); if (s && s.settings) { s.days = s.days || []; return s; } } catch (e) {} return sample(); }
function demoSave() { try { localStorage.setItem(DEMO_KEY, JSON.stringify(D)); } catch (e) {} }

/* Google sign-in (Google Identity Services, token model). The token lives in memory only. */
function loadGis() {
  return new Promise(function (ok, bad) {
    if (window.google && google.accounts && google.accounts.oauth2) return ok();
    var s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = function () { ok(); }; s.onerror = function () { bad(new Error("Couldn't reach Google sign-in.")); };
    document.head.appendChild(s);
  });
}
function getToken(silent) {
  return loadGis().then(function () {
    return new Promise(function (ok, bad) {
      if (!G.client) G.client = google.accounts.oauth2.initTokenClient({ client_id: CFG.googleClientId, scope: SCOPE, callback: function () {} });
      G.client.callback = function (r) { if (r.error) return bad(new Error(r.error)); G.token = r.access_token; G.exp = Date.now() + (r.expires_in - 60) * 1000; try { localStorage.setItem("eltio-systems-signed-in", "1"); } catch (e) {} ok(); };
      G.client.error_callback = function (e) { bad(new Error(e && e.type || "sign-in cancelled")); };
      G.client.requestAccessToken({ prompt: silent ? "" : "select_account" });
    });
  });
}
function api(url, opt) {
  opt = opt || {};
  var go = function () {
    return fetch(url, { method: opt.method || "GET", headers: Object.assign({ Authorization: "Bearer " + G.token }, opt.body ? { "Content-Type": "application/json" } : {}), body: opt.body ? JSON.stringify(opt.body) : undefined })
      .then(function (r) { if (r.status === 401) { G.token = null; throw { retry: true }; } if (!r.ok) return r.text().then(function (t) { throw new Error("Google said " + r.status + ": " + t.slice(0, 160)); }); return r.status === 204 ? {} : r.json(); });
  };
  var ensure = G.token && Date.now() < G.exp ? Promise.resolve() : getToken(true);
  return ensure.then(go).catch(function (e) { if (e && e.retry) return getToken(true).then(go); throw e; });
}
var SHEETS = "https://sheets.googleapis.com/v4/spreadsheets/";
function findSheet() {
  var q = encodeURIComponent("appProperties has { key='eltio' and value='systems1' } and trashed=false");
  return api("https://www.googleapis.com/drive/v3/files?q=" + q + "&fields=files(id,name)&spaces=drive").then(function (r) { return r.files && r.files[0] ? r.files[0].id : null; });
}
function createSheet(title) {
  return api(SHEETS, { method: "POST", body: { properties: { title: title }, sheets: Object.keys(TABS).map(function (t) { return { properties: { title: t, gridProperties: { frozenRowCount: 1 } } }; }) } })
    .then(function (r) {
      G.sheetId = r.spreadsheetId;
      return api("https://www.googleapis.com/drive/v3/files/" + G.sheetId, { method: "PATCH", body: { appProperties: { eltio: "systems1" }, description: "Made by Eltio Systems. Your data, in your Drive. Edit it here or in the app." } });
    })
    .then(function () { return api(SHEETS + G.sheetId + "/values:batchUpdate", { method: "POST", body: { valueInputOption: "RAW", data: Object.keys(TABS).map(function (t) { return { range: t + "!A1", values: [TABS[t]] }; }) } }); })
    .then(function () { return G.sheetId; });
}
/* Sheets made by an earlier version get any new tabs added, with their headings. */
function ensureTabs() {
  return api(SHEETS + G.sheetId + "?fields=sheets.properties.title").then(function (r) {
    var have = (r.sheets || []).map(function (x) { return x.properties.title; }), miss = Object.keys(TABS).filter(function (t) { return have.indexOf(t) < 0; });
    if (!miss.length) return;
    return api(SHEETS + G.sheetId + ":batchUpdate", { method: "POST", body: { requests: miss.map(function (t) { return { addSheet: { properties: { title: t, gridProperties: { frozenRowCount: 1 } } } }; }) } })
      .then(function () { return api(SHEETS + G.sheetId + "/values:batchUpdate", { method: "POST", body: { valueInputOption: "RAW", data: miss.map(function (t) { return { range: t + "!A1", values: [TABS[t]] }; }) } }); });
  });
}
function rowsToObjs(tab, values) {
  var cols = TABS[tab], head = (values && values[0]) || cols;
  return (values || []).slice(1).filter(function (r) { return r.some(function (c) { return String(c).trim() !== ""; }); }).map(function (r) {
    var o = {}; cols.forEach(function (c) { var i = head.indexOf(c); o[c] = i >= 0 && r[i] != null ? String(r[i]) : ""; }); if (tab !== "Settings" && !o.id) o.id = uid(); return o;
  });
}
function readAll() {
  var rs = Object.keys(TABS).map(function (t) { return "ranges=" + encodeURIComponent(t + "!A1:Z2000"); }).join("&");
  return api(SHEETS + G.sheetId + "/values:batchGet?" + rs).then(function (r) {
    var out = { settings: {} };
    Object.keys(TABS).forEach(function (t, i) {
      var objs = rowsToObjs(t, (r.valueRanges[i] || {}).values);
      if (t === "Settings") objs.forEach(function (o) { if (o.key) out.settings[o.key] = o.value; }); else out[KEY[t]] = objs;
    });
    return out;
  });
}
function readTab(tab) { return api(SHEETS + G.sheetId + "/values/" + encodeURIComponent(tab + "!A1:Z2000")).then(function (r) { return rowsToObjs(tab, r.values); }); }
function writeTab(tab, objs) {
  var cols = TABS[tab], values = [cols].concat(objs.map(function (o) { return cols.map(function (c) { return o[c] == null ? "" : String(o[c]); }); }));
  return api(SHEETS + G.sheetId + "/values/" + encodeURIComponent(tab + "!A1:Z2000") + ":clear", { method: "POST", body: {} })
    .then(function () { return api(SHEETS + G.sheetId + "/values/" + encodeURIComponent(tab + "!A1") + "?valueInputOption=RAW", { method: "PUT", body: { values: values } }); });
}

/* One way to change data everywhere. On Google we re-read the tab first, so an edit made on another device is kept. */
var busy = 0;
function change(tab, fn) {
  var k = KEY[tab];
  if (mode === "demo") { if (tab === "Settings") fn(D.settings); else D[k] = fn(D[k].slice()); demoSave(); render(); return Promise.resolve(); }
  busy++; render();
  var p;
  if (tab === "Settings") { fn(D.settings); p = writeTab("Settings", Object.keys(D.settings).map(function (key) { return { key: key, value: D.settings[key] }; })); }
  else p = readTab(tab).then(function (fresh) { var next = fn(fresh.slice()); D[k] = next; return writeTab(tab, next); });
  return p.then(function () { busy--; render(); }).catch(function (e) { busy--; render(); banner("Didn't save: " + (e.message || e)); throw e; });
}
function upsert(tab, obj) { return change(tab, function (rows) { var i = rows.findIndex(function (r) { return r.id === obj.id; }); if (i >= 0) rows[i] = obj; else rows.push(obj); return rows; }); }
function remove(tab, id) { return change(tab, function (rows) { return rows.filter(function (r) { return r.id !== id; }); }); }

function refresh() { if (mode !== "google" || busy) return Promise.resolve(); return readAll().then(function (d) { D = d; render(); }).catch(function () {}); }

/* ---------- money maths ---------- */
function isDone(b) { var e = parse(b.end || b.start); return b.status === "Confirmed" && e && e < today(); }
function isHold(b) { return b.status === "Pencil" || b.status === "First hold" || b.status === "Second hold"; }
function outstanding() { return D.invoices.filter(function (v) { return !v.paid; }); }
function overdue() { var t = today(); return outstanding().filter(function (v) { var d = parse(v.due); return d && d < t; }); }
function owed() { return outstanding().reduce(function (a, v) { return a + num(v.amount); }, 0); }
function taxYearStart() { var t = today(), y = t.getMonth() > 3 || (t.getMonth() === 3 && t.getDate() >= 6) ? t.getFullYear() : t.getFullYear() - 1; return new Date(y, 3, 6); }
function paidThisYear() { var s = taxYearStart(); return D.invoices.filter(function (v) { var p = parse(v.paid); return p && p >= s; }).reduce(function (a, v) { return a + num(v.amount); }, 0); }
function rolling12() { var s = addDays(today(), -365); return D.invoices.filter(function (v) { var d = parse(v.issued); return d && d >= s; }).reduce(function (a, v) { return a + num(v.amount); }, 0); }
function bookedThisMonth() { var t = today(); return D.bookings.filter(function (b) { var d = parse(b.start); return b.status === "Confirmed" && d && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear(); }).reduce(function (a, b) { return a + num(b.rate) * Math.max(1, num(b.days)); }, 0); }
function bookingValue(b) { return daysFor(b.id).length ? sheetCalc(b).total : num(b.rate) * Math.max(1, num(b.days) || 1); }
function isPaye(b) { return b.terms === "TV drama"; }
function invoiced(bid) { return D.invoices.some(function (v) { return v.booking === bid; }); }
function nextInvoiceNumber() { var y = today().getFullYear(), pre = (D.settings.invoicePrefix || "INV") + "-" + y + "-", n = 0; D.invoices.forEach(function (v) { var m = String(v.number).indexOf(pre) === 0 ? parseInt(String(v.number).slice(pre.length), 10) : 0; if (m > n) n = m; }); return pre + String(n + 1).padStart(3, "0"); }

/* ---------- what needs the person ---------- */
function todo() {
  var t = today(), L = [];
  overdue().forEach(function (v) { var n = daysBetween(parse(v.due), t); L.push({ k: "chase", id: v.id, t: "Chase " + v.client + ", " + money(num(v.amount)), tag: n + " days late", amb: 1 }); });
  D.bookings.filter(isHold).forEach(function (b) { var d = parse(b.start); if (d && d >= t && daysBetween(t, d) <= 10) L.push({ k: "hold", id: b.id, t: (b.status === "Pencil" ? "Pencil" : b.status) + ": " + b.production + ", " + nice(b.start), tag: "Ask to confirm" }); });
  D.bookings.filter(function (b) { return isDone(b) && !invoiced(b.id); }).forEach(function (b) {
    var logged = daysFor(b.id).length, needsHours = (b.terms === "APA" || isPaye(b)) && !logged;
    if (needsHours) L.push({ k: "hours", id: b.id, t: "Log your hours for " + b.production, tag: niceRange(b.start, b.end) });
    else if (!isPaye(b)) L.push({ k: "invoice", id: b.id, t: "Invoice " + b.client + " for " + b.production, tag: money(bookingValue(b)) });
  });
  return L;
}


/* ---------- timesheets: hours in, money out ----------
   Three rule sets. Figures come from the APA Crew Terms (Sept 2026) and the Pact/Bectu TV Drama Agreement 2023 as
   summarised in our research; they still need checking against the source PDFs. Every line shows its working and
   the person can add an adjustment, so the timesheet stays their own declaration. */
var TERMS = ["APA", "TV drama", "Flat day"];
var TERMN = { "APA": "APA crew terms (commercials)", "TV drama": "Pact/Bectu TV drama (PAYE)", "Flat day": "Flat day rate, all in" };
var LUNCH = { "APA": ["1 hour", "30 min", "None"], "TV drama": ["1 hour", "Semi-continuous", "Continuous"], "Flat day": ["1 hour", "30 min", "None"] };
var DAYTYPE = { "APA": ["Normal", "Bank holiday", "Prep or recce"], "TV drama": ["Normal", "6th day"], "Flat day": ["Normal"] };
var SOURCES = ["Call sheet", "AD's times", "My own"];
var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function tm(s) { var m = /^(\d{1,2}):(\d{2})/.exec(s || ""); return m ? +m[1] * 60 + +m[2] : null; }
function hm(m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
function roundUp(m, inc) { return Math.ceil(m / inc) * inc; }
function hrs(m) { var h = Math.round(m / 60 * 100) / 100; return h + (h === 1 ? " hr" : " hrs"); }
function pounds(n) { return "£" + (Math.round(n * 100) / 100).toLocaleString("en-GB", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
function dayLabel(s) { var d = parse(s); return d ? DOW[d.getDay()] + " " + nice(s) : ""; }
/* APA overtime rate depends on the day rate band. */
function apaBand(rate) { return rate <= 458 ? { m: 1.5, t: "up to £458" } : rate <= 696 ? { m: 1.25, t: "£459 to £696" } : { m: 1, t: "£697 and up" }; }
function termsLine(b) {
  var R = num(b.rate), hr = R / 10;
  if (b.terms === "APA") { var a = apaBand(R); return "APA crew terms. Your day rate is in the " + a.t + " band, so overtime is " + a.m + "x the hourly rate (" + pounds(hr * a.m) + " an hour), in half hours. 10 hour day plus an hour's lunch."; }
  if (b.terms === "TV drama") return "Pact/Bectu TV drama. Overtime at 1.5x (" + pounds(Math.min(70, Math.max(35, hr * 1.5))) + " an hour, kept between £35 and £70), in quarter hours. 10 hour day plus lunch, 9.5 semi-continuous, 9 continuous" + (b.extra ? ", plus your additional contracted hour" : "") + ".";
  return "Flat day rate, all in. Hours are logged as a record; no overtime is added unless you add it.";
}
function calcDay(x, b) {
  var R = num(b.rate), hr = R / 10, terms = b.terms || "APA", L = [], F = [];
  var c = tm(x.call), w = tm(x.wrap);
  if (c == null || w == null) return { lines: [], flags: ["Add the call and wrap times."], total: 0, c: null, w: null };
  if (w <= c) w += 1440;
  var lunch = x.lunch || "1 hour", lunchM = { "1 hour": 60, "30 min": 30, "None": 0 }[lunch] || 0;
  var d = parse(x.date), dow = d ? d.getDay() : 1;
  if (terms === "APA") {
    if (x.type === "Prep or recce") { L.push(["Prep or recce day", R]); }
    else if (c < 300) {
      var nh = Math.max(10, roundUp(w - c - lunchM, 30) / 60);
      L.push(["Night call before 05:00, " + nh + " hrs at 2x", 2 * hr * nh]);
    } else {
      var mult = x.type === "Bank holiday" || dow === 0 ? 2 : dow === 6 ? 1.5 : 1;
      L.push([mult === 1 ? "Day rate" : (mult === 2 ? (dow === 0 ? "Sunday" : "Bank holiday") : "Saturday") + " day rate at " + mult + "x", R * mult]);
      if (mult === 2 && dow === 0) F.push("Sunday rate: some summaries say 1.5x, not 2x. Check your deal.");
      var band = apaBand(R), otr = hr * band.m;
      if (c < 420) { var p = roundUp(420 - c, 30); L.push(["Early call, " + hrs(p) + " before 07:00 at " + band.m + "x", p / 60 * otr]); }
      var start = c >= 660 && c < 1020 ? 660 : c;
      if (start !== c) F.push("Late call: the day is counted from 11:00.");
      var ots = start + 600 + lunchM, ot = Math.max(0, w - ots);
      if (ot > 0) {
        var after = Math.max(0, w - Math.max(ots, 1440)), norm = ot - after;
        if (norm > 0) { var n = roundUp(norm, 30); L.push(["Overtime from " + hm(ots) + ", " + hrs(n) + " at " + band.m + "x", n / 60 * otr]); }
        if (after > 0) { var a2 = roundUp(after, 30); L.push(["After midnight, " + hrs(a2) + " at 3x", a2 / 60 * hr * 3]); }
      }
      var la = tm(x.lunchAt);
      if (lunchM > 0 && la != null) { if (la < c) la += 1440; if (la - c > 330) L.push(["Late break, more than 5.5 hrs after call", 10]); }
      else if (lunchM === 0 && w - c > 330) F.push("No break logged. A late or missed break may be owed.");
    }
  } else if (terms === "TV drama") {
    var base = lunch === "Continuous" ? 540 : lunch === "Semi-continuous" ? 570 : 600 + 60;
    var m6 = x.type === "6th day" ? 1.5 : 1;
    L.push([m6 === 1 ? "Day rate" : "6th day at 1.5x", R * m6]);
    if (b.extra) { base += 60; L.push(["Additional contracted hour", hr]); }
    var otrD = Math.min(70, Math.max(35, hr * 1.5)), otsD = c + base, otD = Math.max(0, w - otsD);
    if (otD > 0) {
      var late = Math.max(0, w - Math.max(otsD, 1380)), normD = otD - late;
      if (normD > 0) { var nd = roundUp(normD, 15); L.push(["Overtime from " + hm(otsD) + ", " + hrs(nd) + " at 1.5x", nd / 60 * otrD]); }
      if (late > 0) { var ld = roundUp(late, 15); L.push(["After 23:00, " + hrs(ld) + " at 2x", ld / 60 * hr * 2]); F.push("After 23:00 is 2x in the agreement; some payroll summaries pay it as an extra 1x. Check with payroll."); }
    }
  } else {
    L.push(["Day rate (all in)", R]);
    if (w - c - lunchM > 600) F.push("Over 10 hours on a flat rate. Check what you agreed.");
  }
  if (num(b.kit)) L.push(["Kit", num(b.kit)]);
  var p2 = num(D.settings.mileage) || 45;
  if (num(x.miles)) L.push([num(x.miles) + " miles at " + p2 + "p", num(x.miles) * p2 / 100]);
  if (num(x.adjust)) L.push(["Adjustment" + (x.notes ? ": " + x.notes : ""), num(x.adjust)]);
  return { lines: L, flags: F, total: L.reduce(function (t, l) { return t + l[1]; }, 0), c: c, w: w };
}
function daysFor(bid) { return D.days.filter(function (x) { return x.booking === bid; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }); }
function sheetCalc(b) {
  var ds = daysFor(b.id), out = [], prev = null;
  ds.forEach(function (x) {
    var r = calcDay(x, b);
    if (prev && prev.r.w != null && r.c != null) {
      var rest = daysBetween(parse(prev.x.date), parse(x.date)) * 1440 + r.c - prev.r.w;
      if (rest < 660) r.flags.unshift("Short turnaround: " + hrs(rest) + " rest since the last wrap (11 hrs is the norm" + (b.terms === "APA" && rest < 600 ? ", and under 10 is below the APA floor" : "") + ").");
    }
    out.push({ x: x, r: r }); prev = { x: x, r: r };
  });
  return { days: out, total: out.reduce(function (t, o) { return t + o.r.total; }, 0) };
}
function nextDate(b) {
  var ds = daysFor(b.id).map(function (x) { return x.date; }), s = parse(b.start), e = parse(b.end || b.start) || s, d = s;
  for (; d && d <= e; d = addDays(d, 1)) if (ds.indexOf(iso(d)) < 0) return iso(d);
  return ds.length ? iso(addDays(parse(ds[ds.length - 1]), 1)) : b.start;
}
function timesheetDraft(b) {
  var s = D.settings, T = sheetCalc(b), paye = isPaye(b);
  var lines = T.days.map(function (o) {
    var x = o.x;
    return dayLabel(x.date) + ": call " + x.call + ", " + (x.lunch === "None" ? "no break" : x.lunch.toLowerCase() + " lunch" + (x.lunchAt ? " at " + x.lunchAt : "")) + ", wrap " + x.wrap + (x.source ? " (from " + (x.source === "My own" ? "my own notes" : x.source === "Call sheet" ? "the call sheet" : "the AD's times") + ")" : "") + "\n" +
      o.r.lines.map(function (l) { return "  " + l[0] + ": " + pounds(l[1]); }).join("\n") + "\n  Day total: " + pounds(o.r.total);
  }).join("\n\n");
  var head = "Hi,\n\n" + (paye ? "Here are my hours for " + b.production + " so you can check them against the payroll timesheet. Could you let me know if anything doesn't match?" : "Here's my timesheet for " + b.production + ". Could you approve these hours so I can send the invoice?") + "\n\n";
  var foot = "\n\nTotal: " + pounds(T.total) + (b.po ? "\nPO: " + b.po : "") + "\nWorked out on " + TERMN[b.terms || "APA"] + ", " + money(num(b.rate)) + " a day.";
  return { to: b.contact, subject: (paye ? "Hours for " : "Timesheet: ") + b.production + ", " + niceRange(b.start, b.end), body: head + lines + foot + sign() };
}

/* ---------- drafts open in the person's own mail app ---------- */
function compose(to, subject, body) {
  var m = D.settings.mail || "Other", e = encodeURIComponent, url;
  if (m === "Gmail") url = "https://mail.google.com/mail/?view=cm&fs=1&to=" + e(to || "") + "&su=" + e(subject) + "&body=" + e(body);
  else if (m === "Outlook") url = "https://outlook.office.com/mail/deeplink/compose?to=" + e(to || "") + "&subject=" + e(subject) + "&body=" + e(body);
  else url = "mailto:" + e(to || "") + "?subject=" + e(subject) + "&body=" + e(body);
  if (url.indexOf("mailto:") === 0) location.href = url; else window.open(url, "_blank", "noopener");
}
function sign() { var s = D.settings; return "\n\nThanks,\n" + (s.name || "") + (s.trading ? "\n" + s.trading : ""); }
function chaseDraft(v) {
  var n = daysBetween(parse(v.due), today()), hi = "Hi,\n\n";
  var body = n < 14 ? hi + "Hope all's well. A quick nudge on invoice " + v.number + " for " + money(num(v.amount)) + ", which was due on " + nice(v.due) + ". Could you let me know when it's scheduled?"
    : n < 45 ? hi + "Following up on invoice " + v.number + " for " + money(num(v.amount)) + ", now " + n + " days past its due date. Could you confirm a payment date this week? Happy to resend anything you need."
    : hi + "Invoice " + v.number + " for " + money(num(v.amount)) + " is now " + n + " days overdue. Please confirm a payment date by Friday. If it stays unpaid I will claim statutory interest at 8% above the Bank of England base rate, plus fixed compensation of " + money(num(v.amount) < 1000 ? 40 : num(v.amount) < 10000 ? 70 : 100) + ", under the Late Payment of Commercial Debts (Interest) Act 1998.";
  return { to: v.contact, subject: "Invoice " + v.number, body: body + sign() };
}
function holdDraft(b) {
  var s = D.settings, viaAgent = b.agent && s.agentEmail, ask = addDays(parse(b.start), -3);
  if (viaAgent) return { to: s.agentEmail, subject: "Hold: " + b.production + ", " + nice(b.start), body: "Hi " + first(s.agent) + ",\n\nI'm on " + b.status.toLowerCase() + " for " + b.client + " (" + b.production + ") on " + niceRange(b.start, b.end) + ". Could you ask them to confirm or release by " + nice(iso(ask)) + "?" + sign() };
  return { to: b.contact, subject: "Hold: " + b.production + ", " + nice(b.start), body: "Hi,\n\nI've got you down as a " + b.status.toLowerCase() + " for " + niceRange(b.start, b.end) + ". Could you confirm or release by " + nice(iso(ask)) + "? I've had another enquiry for that date." + sign() };
}
function confirmDraft(b) {
  var s = D.settings, t = num(s.terms) || 30;
  return { to: b.contact, subject: "Booking confirmed: " + b.production + ", " + niceRange(b.start, b.end), body: "Hi,\n\nConfirming " + niceRange(b.start, b.end) + " for " + b.production + ".\n\nRate: " + money(num(b.rate)) + " a day" + (num(b.days) > 1 ? " (" + b.days + " days)" : "") + ", for a 10 hour day plus lunch.\nOvertime as per your crew terms.\nCancellation inside 48 hours is charged in full.\nPayment within " + t + " days of invoice." + sign() };
}
function invoiceDraft(v) {
  var s = D.settings;
  return { to: v.contact, subject: "Invoice " + v.number + (s.trading ? " from " + s.trading : ""), body: "Hi,\n\nPlease find invoice " + v.number + " for " + money(num(v.amount)) + " attached, due on " + nice(v.due) + "." + sign() };
}

/* ---------- UI state ---------- */
var S = { tab: "home" };
var TABN = { home: "Home", bookings: "Bookings", money: "Money", more: "You" };

function banner(t) { var b = $("banner"); b.textContent = t; b.classList.add("on"); clearTimeout(banner.t); banner.t = setTimeout(function () { b.classList.remove("on"); }, 2600); }
function openSheet(h) { $("sheet").innerHTML = '<span class="grab"></span>' + h; $("sheet").classList.add("on"); $("shade").classList.add("on"); var f = $("sheet").querySelector("input,button"); if (f && window.innerWidth >= 900) f.focus(); }
function closeSheet() { $("sheet").classList.remove("on"); $("shade").classList.remove("on"); }
function pills(name, opts, cur) { return '<div class="pills" data-group="' + name + '">' + opts.map(function (o) { return '<button type="button" class="pill" data-pick="' + esc(name) + '" data-v="' + esc(o) + '" aria-pressed="' + (cur === o) + '">' + esc(o) + "</button>"; }).join("") + "</div>"; }
function field(id, label, val, type, ph, extra) { return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" name="' + id + '" type="' + (type || "text") + '" value="' + esc(val) + '" placeholder="' + esc(ph || "") + '" autocomplete="off"' + (extra || "") + "></div>"; }
function val(id) { var e = $(id); return e ? e.value.trim() : ""; }
function picked(name) { var b = $("sheet").querySelector('[data-pick="' + name + '"][aria-pressed="true"]') || document.querySelector('main [data-pick="' + name + '"][aria-pressed="true"]'); return b ? b.dataset.v : ""; }



/* Everything Systems runs for a production company, from the producer admin research. "app" = in this app today. */
var FEAT = [
  { g: "Cash", f: [["Advance invoice on award", "The award email lands and the 50% advance and balance invoices are drafted in Xero or FreeAgent, with due dates in the calendar."], ["Statutory interest letter", "The final-stage chase quotes the Late Payment Act: fixed compensation worked out, interest at 8% above base rate.", "app"], ["13-week cash forecast", "Receipts across every open job set against the crew and supplier payment runs."], ["Payment run prep", "Approved crew invoices (7-day) and supplier bills batched in Xero, ready for you to approve."], ["Client payment check", "Looks up a new client's published days to pay before you accept their terms."]] },
  { g: "Crew and shoot", f: [["Holds and pencils", "First and second pencils logged, confirm-or-release notes drafted, the calendar blocked.", "app"], ["Booking confirmations", "Rate, hours, overtime and cancellation fee confirmed in writing for every booking.", "app"], ["Crew invoice check", "Every crew invoice checked against the agreed rate, days, overtime grade and late-break rules before approval.", "app"], ["Start packs and IR35", "Bank details, UTR, NI and right-to-work chased, role status pre-tagged, the status determination drafted for sign-off."], ["Call sheets and movement orders", "Built from the schedule, the crew list and the location."], ["Payroll bureau hand-off", "Signed deal memos for PAYE grades turned into the bureau's input file."], ["Director holds and fee statements", "Director holds tracked, and per-job fee and commission statements drafted."]] },
  { g: "Locations and compliance", f: [["Permit and licence clock", "Borough, TfL, Royal Parks, drone and 21-day child-licence deadlines counted back from the shoot date."], ["Supplier pack", "Insurance certificates, policies and standard answers kept current for Coupa and Ariba onboarding."], ["AdGreen pack", "Travel, fuel, hotel and catering pulled from expenses into an AdGreen-ready sheet."], ["VAT and tax deadlines", "Rolling 12-month turnover against £90,000, with Self Assessment, payments on account and MTD dates.", "app"]] },
  { g: "Rights and delivery", f: [["Rights and usage register", "Usage terms pulled from signed contracts, with reminders at 90, 60 and 30 days and renewal quotes."], ["Deliverables and clock numbers", "Versions, ratios, clock numbers, Clearcast stage and Peach or Vevo deadlines from the air date."], ["Music video credits sheet", "One credits and ISRC record per video, ready for Vevo, awards and press."], ["Contract clause memo", "Flags payment terms over 60 days, GenAI, IP and indemnity clauses against the APA standard."], ["Awards calendar", "Arrows, UKMVA, Kinsale and Ciclope deadlines, with entry credits drafted."]] },
  { g: "Books and jobs", f: [["Job set-up in the books", "The Xero tracking category made, pushed to Pleo and Dext, and mapped to budget lines."], ["Overage and change requests", "A costed change email to the agency, with written approval logged to the budget line."], ["Kit quotes, POs and returns", "Hire quotes compared, POs drafted, return dates tracked and hire invoices matched."], ["Bids and budget versions", "Bids, pitch costs and outcomes logged, with a what-changed note between budget versions."], ["Wrap and audit pack", "Invoices, POs, timesheets and receipts gathered per budget line for the cost consultant."]] }
];
function workBack(d, n) { var x = new Date(d); while (n > 0) { x = addDays(x, -1); if (x.getDay() % 6) n--; } return x; }
function featuresSheet() {
  var inApp = 0; FEAT.forEach(function (g) { g.f.forEach(function (f) { if (f[2]) inApp++; }); });
  return '<h2>Everything Systems runs</h2><p class="q">26 jobs for a production company, joined up across Gmail, Drive, Xero, DocuSign and the tools you already use. ' + inApp + " are in this app now; the rest are set up on your own accounts in the company pilot.</p>" +
    FEAT.map(function (g) { return '<div class="part">' + esc(g.g) + '</div><div class="rows">' + g.f.map(function (f) { return '<div class="row static"><span>' + esc(f[0]) + '</span><span class="tag' + (f[2] ? " ink" : "") + '">' + (f[2] ? "In the app" : "Pilot") + '</span><span class="sub">' + esc(f[1]) + "</span></div>"; }).join("") + "</div>"; }).join("") +
    '<p class="q">Permits, status decisions, right-to-work checks and risk assessments always stay with a named person. Systems prepares the pack; you sign it off.</p><div class="acts"><button class="btn solid wide" data-close>Done</button></div>';
}

/* ---------- graphs ---------- */
function months() {
  var t = today(), out = [];
  for (var i = 11; i >= 0; i--) { var m = new Date(t.getFullYear(), t.getMonth() - i, 1); out.push({ y: m.getFullYear(), m: m.getMonth(), paid: 0, open: 0, late: 0 }); }
  D.invoices.forEach(function (v) {
    var d = parse(v.issued); if (!d) return;
    var o = out.find(function (x) { return x.y === d.getFullYear() && x.m === d.getMonth(); }); if (!o) return;
    var a = num(v.amount), du = parse(v.due);
    if (v.paid) o.paid += a; else if (du && du < today()) o.late += a; else o.open += a;
  });
  return out;
}
function barChart(compact) {
  var M = months(), max = Math.max.apply(null, M.map(function (x) { return x.paid + x.open + x.late; }).concat([1])), W = 600, H = compact ? 90 : 170, top = 8, base = H - (compact ? 4 : 22), bw = W / 12;
  var bars = M.map(function (x, i) {
    var X = i * bw + bw * .18, w = bw * .64, y = base, seg = function (v, cls) { if (!v) return ""; var h = (base - top) * v / max; y -= h; return '<rect class="' + cls + '" x="' + X.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3"></rect>'; };
    var tot = x.paid + x.open + x.late;
    return "<g><title>" + MON[x.m] + " " + x.y + ": " + money(tot) + " invoiced" + (x.late ? ", " + money(x.late) + " late" : "") + "</title>" + seg(x.paid, "b-paid") + seg(x.open, "b-open") + seg(x.late, "b-late") +
      (compact ? "" : '<text x="' + (i * bw + bw / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + MON[x.m].charAt(0) + "</text>") + "</g>";
  }).join("");
  var tot = M.reduce(function (a, x) { return a + x.paid + x.open + x.late; }, 0), best = M.reduce(function (a, x) { return x.paid + x.open + x.late > a.paid + a.open + a.late ? x : a; }, M[0]);
  return '<div class="chart"><svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="Invoiced each month for the last 12 months">' + bars + "</svg>" +
    '<div class="legend"><span><i class="b-paid"></i>Paid</span><span><i class="b-open"></i>Waiting</span><span><i class="b-late"></i>Late</span><span class="q">' + money(tot / 12) + " a month on average" + (tot ? ", best " + MON[best.m] : "") + "</span></div></div>";
}
function slowPayers() {
  var by = {};
  D.invoices.forEach(function (v) { var i = parse(v.issued), p = parse(v.paid); if (!i || !p) return; var c = by[v.client] = by[v.client] || { n: 0, days: 0, total: 0 }; c.n++; c.days += daysBetween(i, p); c.total += num(v.amount); });
  var L = Object.keys(by).map(function (k) { return { c: k, avg: Math.round(by[k].days / by[k].n), total: by[k].total }; }).sort(function (a, b) { return b.avg - a.avg; });
  if (!L.length) return '<p class="empty">Once invoices are paid you\'ll see who pays fastest here.</p>';
  var max = Math.max.apply(null, L.map(function (x) { return x.avg; })), terms = num(D.settings.terms) || 30;
  return '<div class="rows">' + L.slice(0, 6).map(function (x) { return '<div class="row static"><span>' + esc(x.c) + ' <span class="q">· ' + money(x.total) + '</span></span><span class="tag' + (x.avg > terms ? " amb" : "") + '">' + x.avg + ' days</span><span class="sub"><span class="hbar"><i style="width:' + Math.round(x.avg / max * 100) + '%"' + (x.avg > terms ? ' class="amb"' : "") + "></i></span></span></div>"; }).join("") + "</div>";
}

/* ---------- try it as any job: sample data set up for that job, no form ---------- */
function job() { var k = D && D.settings && D.settings.job; return JOBS.find(function (j) { return j.k === k; }); }
function startJob(k) {
  var j = JOBS.find(function (x) { return x.k === k; }); if (!j) return false;
  mode = "demo"; D = sample();
  var s = D.settings; s.name = "Sam Carter"; s.role = j.role === "DP or HOD" ? "DP" : j.role; s.rate = j.rate; s.job = j.k; s.work = "Both";
  D.bookings.forEach(function (b) { if (b.rate === "650") b.rate = j.rate; if (j.kit && b.id === "b6") b.kit = j.kit; if (!j.kit) b.kit = ""; });
  demoSave(); S.tab = "home"; closeSheet(); render(); return true;
}
function jobPart() {
  var j = job(); if (mode !== "demo" || !j) return "";
  return '<div class="made"><div class="made-h"><span class="part">Made for ' + esc(j.pl) + ' · in the pilot</span><p class="pain">' + esc(j.pain) + '</p></div><div class="fcards">' + j.f.map(function (f, i) {
    return '<button class="fcard" data-jobf="' + i + '"><span class="n">0' + (i + 1) + '</span><b>' + esc(f[0].replace(/\.$/, "")) + '</b><span class="q">' + esc(f[1]) + '</span><span class="go">See it <span aria-hidden="true">→</span></span></button>';
  }).join("") + "</div></div>";
}
function jobSheet(i) {
  var f = job().f[i];
  return '<div class="top"><span class="q">Made for ' + esc(job().pl) + '</span><span class="tag">Coming in the pilot</span></div><h2>' + esc(f[0]) + '</h2><p class="q">' + esc(f[1]) + '</p><div class="sum ot">' + f[2].map(function (r) { return '<div><span class="q">' + r[0] + '</span><span' + (r[2] === "amber" ? ' class="late"' : "") + ">" + r[1] + "</span></div>"; }).join("") + '</div><p class="q">A preview with sample figures. This part is being built with the first pilot companies.</p><button class="btn solid" data-close>Got it</button>';
}


/* ---------- the shared job: call sheet link, crew passport, directory (sample data) ---------- */
function isProd() { var j = job(); return !!j && (j.k === "prod" || j.k === "pm"); }
function callIn() { var n = new Date(), t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 6, 30), m = Math.max(0, Math.round((t - n) / 60000)); return Math.floor(m / 60) + "h " + String(m % 60).padStart(2, "0") + "m"; }
var CSH = [["Call", "06:30", "07:00"], ["Location", "Canal, E2, then Studio 3", "Canal, E2"], ["Unit base", "Studio 3 car park", "Wharf Rd car park"], ["Lunch", "12:30", ""], ["Weather", "Showers after 3", "Dry, 14°"]];
function shareCards() {
  if (mode !== "demo" || !job()) return "";
  var p = isProd();
  return '<div class="share"><button class="csc" data-callsheet><span class="part">Tomorrow · Canal promo · V3</span><span class="tag amb">3 changed</span><span class="csc-main"><span><span class="q">Call</span><b>06:30</b></span><span><span class="q">Leave by</span><b>05:50</b></span><span><span class="q">Call in</span><b class="callin">' + callIn() + '</b></span></span><span class="q">' + (p ? "Opened by 29 of 32 crew. 3 haven't seen V3 yet." : "Now Canal, E2, then Studio 3. Unit base moved, showers after 3.") + "</span></button>" +
    (p ? '<button class="ppc" data-findcrew><span class="part">Find crew · camera first</span><b>Who\'s free Thursday?</b><span class="q">Search the directory, see Available, Pencilled or Booked, and send a hold.</span><span class="go">Search crew <span aria-hidden="true">→</span></span></button>'
       : '<button class="ppc" data-passport><span class="part">Crew passport</span><b>Filled in once</b><span class="q">Bank, UTR, NI, address, next of kin, vegetarian. On 3 jobs this month.</span><span class="tag ok">Findable</span></button>') + "</div>";
}
function callSheet() {
  var p = isProd();
  return '<div class="top"><span class="q">Canal promo · day 1</span><span class="tag amb">V3 · 21:14</span></div><h2>Tomorrow\'s call sheet.</h2><div class="sum ot">' + CSH.map(function (r) { return "<div><span class=\"q\">" + r[0] + "</span><span>" + (r[2] ? '<s class="q">' + r[2] + "</s> " : "") + '<span' + (r[2] ? ' class="late"' : "") + ">" + r[1] + "</span></span></div>"; }).join("") + "</div>" +
    '<div class="part">On this job</div><div class="rows"><div class="row static"><span>Schedule</span><span class="q">PDF</span></div><div class="row static"><span>Risk assessment</span><span class="q">PDF</span></div><div class="row static"><span>Map and parking</span><span class="q">Link</span></div><div class="row static"><span>Start pack</span><span class="tag ok">Filled from passport</span></div></div>' +
    '<p class="q">V1 posted by the producer, V2 by the PM, V3 by the coordinator. Every version is kept.</p>' +
    (p ? '<div class="acts"><button class="btn solid" data-postv>Post V4</button><button class="btn" data-editlink>Share an edit link</button></div>' : '<div class="acts"><button class="btn solid wide" data-close>Got it</button></div>');
}
var DIRC = [["AR", "Ana R.", "1st AC · 12 commercials this year", "ok"], ["TW", "Tom W.", "1st AC · Alexa Mini, Venice", "pen"], ["PK", "Priya K.", "1st AC · 2nd unit drama", "ok"], ["LB", "Leon B.", "1st AC · music videos", "book"]];
function findCrew() {
  return '<div class="top"><span class="q">Crew directory · camera first</span><span class="q">Sample</span></div><h2>1st AC, Thursday 24 Oct.</h2><div class="rows">' + DIRC.map(function (d) {
    return '<div class="row static dirr"><span class="av">' + d[0] + "</span><span>" + d[1] + '<span class="sub q">' + d[2] + '</span></span>' + (d[3] === "ok" ? '<button class="btn sm solid" data-hold="' + d[1] + '">Send hold</button>' : '<span class="tag' + (d[3] === "pen" ? " amb" : "") + '">' + (d[3] === "pen" ? "Pencilled" : "Booked") + "</span>") + "</div>";
  }).join("") + '</div><p class="q">You see whether people are free, never who they\'re pencilled for. Rate cards show only when crew switch them on.</p>';
}
function passportSheet() {
  return '<div class="top"><span class="q">Crew passport</span><span class="tag ok">Findable</span></div><h2>Filled in once.</h2><div class="sum"><div><span class="q">Bank</span><span>Saved in your Drive</span></div><div><span class="q">UTR and NI</span><span>Added</span></div><div><span class="q">Address</span><span>Added</span></div><div><span class="q">Next of kin</span><span>Added</span></div><div><span class="q">Dietary</span><span>Vegetarian</span></div></div>' +
    '<div class="part">Who can see you</div><div class="sum"><div><span class="q">In the directory</span><span>On</span></div><div><span class="q">Rate card</span><span>Off</span></div><div><span class="q">Shared with a job</span><span>Only once you accept</span></div></div>' +
    '<p class="q">Producers see your role, credits and Available, Pencilled or Booked. Your diary is in Crew Pro, with no 10%, ever.</p><div class="acts"><button class="btn solid wide" data-close>Done</button></div>';
}

/* ---------- screens ---------- */
function welcome() {
  var hasG = !!CFG.googleClientId;
  return '<div class="hero"><p class="q">Eltio Systems</p><h1>Less admin.<br>Same tools.</h1><p class="q">Bookings, holds, invoices and chasing in one place. Your data lives in a sheet in your own Google Drive, and nothing is ever sent for you.</p>' +
    '<button class="btn solid gbtn" data-signin' + (hasG ? "" : " disabled") + '><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zM6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14zM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"/></svg>Sign in with Google</button>' +
    (hasG ? "" : '<p class="q">Google sign-in switches on once the Eltio Google account is set up.</p>') +
    '<div class="part">Try it with sample data, as</div><div class="pills jobs">' + JOBS.map(function (j) { return '<button class="pill" data-job="' + j.k + '">' + esc(j.n) + "</button>"; }).join("") + "</div>" +
    '<div class="rows forrows"><div class="row static"><span>Crew</span><span class="q">APA and Bectu overtime, timesheets</span></div><div class="row static"><span>DPs and HODs</span><span class="q">Kit, mileage, holds via your agent</span></div><div class="row static"><span>Producers</span><span class="q">Check crew invoices before you pay</span></div><div class="row static"><span>Everyone</span><span class="q">What\'s owed, chasing, tax</span></div></div>' +
    '<p class="q">On your phone, open this page and add it to your home screen. Sign in with the same Google account on your laptop and everything matches.</p><p class="q"><a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a></p></div>';
}
function setup() {
  var s = D.settings;
  return '<div class="top"><span class="q">Set up</span><span class="q">' + (mode === "demo" ? "Sample data" : esc(G.email)) + '</span></div><h2>Tell us about your work.</h2>' +
    field("s-name", "Your name", s.name, "text", "First and last name") + field("s-trading", "Trading name", s.trading, "text", "Your Ltd or trading name (optional)") +
    '<div class="field"><span class="lab">What do you do?</span>' + pills("role", ROLES, roleKey()) + "</div>" +
    '<div class="field"><span class="lab">Mostly on</span>' + pills("work", ["Commercials", "TV and film", "Both"], s.work || "Both") + "</div>" +
    '<div class="grid2">' + field("s-rate", "Day rate (£)", s.rate, "number", "650", ' inputmode="numeric"') + field("s-terms", "Payment terms (days)", s.terms || "30", "number", "30", ' inputmode="numeric"') + "</div>" +
    '<div class="grid2">' + field("s-tax", "Put aside for tax (%)", s.tax || "25", "number", "25", ' inputmode="numeric"') + field("s-mileage", "Mileage (pence a mile)", s.mileage || "45", "number", "45", ' inputmode="numeric"') + "</div>" +
    '<div class="field"><span class="lab">Which email do you use?</span>' + pills("mail", ["Gmail", "Outlook", "Apple Mail", "Other"], s.mail || "Gmail") + "</div>" +
    '<div class="field"><span class="lab">Do you have an agent?</span>' + pills("hasAgent", ["Yes", "No"], s.hasAgent || "No") + "</div>" +
    '<div id="agentf"' + (s.hasAgent === "Yes" ? "" : " hidden") + ' class="stack">' + field("s-agent", "Your agent", s.agent, "text", "Agency and agent's name") + field("s-agentEmail", "Their email", s.agentEmail, "email", "bookings@agency.com") + '<p class="q">Holds that come through your agent get drafted to them instead.</p></div>' +
    '<button class="btn solid" data-savesetup>' + (D.settings.name ? "Save" : "Build my sheet and start") + "</button>" +
    (mode === "google" && !G.sheetId ? '<p class="q">This makes one Google Sheet called "Eltio Systems" in your Drive. You can open and edit it any time.</p>' : "");
}
function home() {
  var s = D.settings, L = todo(), up = D.bookings.filter(function (b) { var d = parse(b.end || b.start); return b.status !== "Cancelled" && d && d >= today(); }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  var od = overdue().reduce(function (a, v) { return a + num(v.amount); }, 0), holds = up.filter(isHold).length, conf = up.filter(function (b) { return b.status === "Confirmed"; }).length;
  var tile = function (lab, v, sub, cls) { return '<div class="tile' + (cls ? " " + cls : "") + '"><span class="part">' + lab + "</span><b>" + v + "</b><span class=\"q\">" + sub + "</span></div>"; };
  return '<div class="hd"><div class="hd-l"><span class="part">' + nice(iso(today())) + (mode === "demo" ? " · sample data" + (job() ? ", as " + esc(job().n) : "") : "") + "</span><h1>" + greet() + (s.name ? ", " + esc(first(s.name)) : "") + ".</h1></div>" + (mode === "demo" ? '<button class="btn sm" data-switchjob>Switch job</button>' : '<span class="q">' + (busy ? "Saving…" : "") + "</span>") + "</div>" +
    '<div class="hcard"><div class="hc-l"><span class="part">Owed to you</span><b>' + money(owed()) + '</b><span class="hc-s">' + (od ? '<i class="rd"></i><span class="late">' + money(od) + " late</span>" : '<i class="gd"></i>All on time') + '</span></div><button class="row-chart hc-chart" data-tab="money" aria-label="Open Money">' + barChart(true) + "</button></div>" +
    '<div class="tiles">' + tile("Booked", money(bookedThisMonth()), conf + " confirmed") + tile("On hold", holds, holds === 1 ? "pencil" : "pencils") + tile("For tax", money(paidThisYear() * num(s.tax || 25) / 100), esc(s.tax || 25) + "% put aside") + "</div>" +
    shareCards() + jobPart() +
    '<div class="two"><div class="stack"><div class="part">Needs you' + (L.length ? " · " + L.length : "") + '</div><div class="rows needs">' + (mode === "demo" && job() && !isProd() ? '<button class="row" data-confirmed><span><i class="gd" style="margin-right:10px"></i>Car commercial hours, confirmed by production</span><span class="tag ok">Confirmed</span></button>' : "") + (L.length ? L.map(function (x) { return '<button class="row" data-todo="' + x.k + '" data-id="' + x.id + '"><span><i class="' + (x.amb ? "rd" : "od") + '"></i>' + esc(x.t) + '</span><span class="tag' + (x.amb ? " amb" : "") + '">' + esc(x.tag) + "</span></button>"; }).join("") : '<p class="empty">All clear. Nothing needs you.</p>') + "</div>" + starter() + "</div>" +
    '<div class="stack"><div class="part">Coming up</div><div class="rows">' + (up.length ? up.slice(0, 5).map(upRow).join("") : '<p class="empty">Nothing booked yet.</p>') + "</div></div></div>";
}
function upRow(b) { var d = parse(b.start); return '<button class="row up" data-booking="' + b.id + '"><span class="dt"><b>' + (d ? d.getDate() : "") + "</b>" + (d ? MON[d.getMonth()] : "") + '</span><span class="up-t">' + esc(b.production || "Booking") + '<span class="q">' + esc(b.client) + (b.end && b.end !== b.start ? ", to " + nice(b.end) : "") + '</span></span><span class="tag' + (b.status === "Confirmed" ? " ok" : "") + '">' + esc(b.status) + "</span></button>"; }
/* First steps: sample data gets things to try, a real account gets its setup checklist. */
function flag(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
function starter() {
  if (flag("eltio-systems-starter-off")) return "";
  var steps;
  if (mode === "demo") steps = [
    { t: "Write the chase for a late invoice", sub: "Studio Kite is 40 days late. The email is already drafted.", a: 'data-todo="chase" data-id="i2"' },
    { t: "Open a timesheet with overtime", sub: "A two-day car commercial on APA terms, worked out line by line.", a: 'data-timesheet="b6"' },
    { t: "Ask a hold to confirm", sub: "One tap drafts the nudge to the production.", a: 'data-todo="hold" data-id="b2"' }
  ];
  if (roleKey() === "Producer") steps.unshift({ t: "See all 26 things Systems runs", sub: "Advance invoices, permits, rights, deliverables and the books.", a: "data-features" });
  if (mode === "demo" && roleKey() === "Producer") steps.unshift({ t: "Check a crew member's day", sub: "Their call, wrap and rate in, what APA says they're owed out.", a: "data-check" });
  if (mode !== "demo") {
    var cb = D.bookings.find(function (b) { return b.status === "Confirmed"; });
    steps = [
      { t: "Add your next job or hold", sub: "Holds get a nudge before the date.", a: "data-addbooking", done: D.bookings.length > 0 },
      { t: "Log a day's hours", sub: "Call and wrap in, overtime out, on APA or Bectu terms.", a: cb ? 'data-timesheet="' + cb.id + '"' : "data-addbooking", done: D.days.length > 0 },
      { t: "Add an invoice you're waiting on", sub: "We'll tell you when it's late and draft the chase.", a: "data-addinvoice", done: D.invoices.length > 0 },
      { t: "Put it on your home screen", sub: "So it opens like an app on your phone.", a: "data-howphone", done: !!flag("eltio-systems-phone") || matchMedia("(display-mode: standalone)").matches }
    ];
    if (steps.every(function (x) { return x.done; })) return "";
  }
  var n = steps.filter(function (x) { return x.done; }).length;
  return '<div class="part">' + (mode === "demo" ? "Try it" : "Get set up · " + n + " of " + steps.length) + '</div><div class="rows starter">' + steps.map(function (x) {
    return '<button class="row' + (x.done ? " done" : "") + '" ' + x.a + '><span><i class="ck"></i>' + esc(x.t) + '</span><span class="q">' + (x.done ? "Done" : "→") + '</span><span class="sub">' + esc(x.sub) + "</span></button>";
  }).join("") + '</div><button class="lnk" data-starteroff>Hide this</button>';
}
function bookingRow(b) { return '<button class="row" data-booking="' + b.id + '"><span>' + esc(b.production || "Booking") + ' <span class="q">· ' + esc(b.client) + ", " + niceRange(b.start, b.end) + '</span></span><span class="tag' + (b.status === "Confirmed" ? " ink" : "") + '">' + esc(isDone(b) ? (invoiced(b.id) ? "Invoiced" : "Done") : b.status) + "</span></button>"; }
function bookings() {
  var t = today(), A = D.bookings.slice().sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  var up = A.filter(function (b) { var d = parse(b.end || b.start); return b.status !== "Cancelled" && d && d >= t; });
  var past = A.filter(function (b) { var d = parse(b.end || b.start); return !(b.status !== "Cancelled" && d && d >= t); }).reverse();
  var grp = function (name, L) { return '<div class="stack"><div class="part">' + name + '</div><div class="rows">' + (L.length ? L.map(bookingRow).join("") : '<p class="empty">None.</p>') + "</div></div>"; };
  return '<div class="top"><span>Bookings</span><button class="lnk" data-addbooking>Add</button></div><h2>Your diary.</h2>' +
    '<div class="two"><div class="stack">' + grp("Confirmed", up.filter(function (b) { return b.status === "Confirmed"; })) + grp("Holds and pencils", up.filter(isHold)) + "</div>" + grp("Past", past.slice(0, 12)) + "</div>";
}
function invoiceRow(v) { var od = !v.paid && parse(v.due) && parse(v.due) < today(); return '<button class="row" data-invoice="' + v.id + '"><span>' + esc(v.client) + ' <span class="q">· ' + esc(v.number) + ", " + (v.paid ? "paid " + nice(v.paid) : od ? daysBetween(parse(v.due), today()) + " days late" : "due " + nice(v.due)) + '</span></span><span class="tag' + (od ? " amb" : v.paid ? "" : " ink") + '">' + money(num(v.amount)) + "</span></button>"; }
function moneyScr() {
  var s = D.settings, open = outstanding().sort(function (a, b) { return a.due < b.due ? -1 : 1; }), paid = D.invoices.filter(function (v) { return v.paid; }).sort(function (a, b) { return a.paid < b.paid ? 1 : -1; });
  var r12 = rolling12(), od = overdue().reduce(function (a, v) { return a + num(v.amount); }, 0);
  return '<div class="top"><span>Money</span><button class="lnk" data-addinvoice>New invoice</button></div><h2>What you\'re owed.</h2>' +
    '<div class="part">Last 12 months</div>' + barChart(false) +
    '<div class="kpis"><div class="kpi"><b>' + money(owed()) + '</b><span class="q">Owed, ' + open.length + " invoice" + (open.length === 1 ? "" : "s") + '</span></div><div class="kpi' + (od ? " amb" : "") + '"><b>' + money(od) + '</b><span class="q">Overdue</span></div></div>' +
    '<div class="two"><div class="stack"><div class="part">Unpaid</div><div class="rows">' + (open.length ? open.map(invoiceRow).join("") : '<p class="empty">Nothing outstanding.</p>') + '</div><div class="part">Paid</div><div class="rows">' + (paid.length ? paid.slice(0, 10).map(invoiceRow).join("") : '<p class="empty">None yet.</p>') + "</div></div>" +
    '<div class="stack"><div class="part">How fast they pay</div>' + slowPayers() + '<div class="part">Tax and VAT</div><div class="sum"><div><span class="q">Paid since 6 April</span><span>' + money(paidThisYear()) + '</span></div><div><span class="q">Put aside (' + esc(s.tax || 25) + '%)</span><span>' + money(paidThisYear() * num(s.tax || 25) / 100) + '</span></div><div><span class="q">Invoiced, last 12 months</span><span>' + money(r12) + ' of £90,000</span></div></div><div class="bar"><i style="width:' + Math.min(100, r12 / 900) + '%"></i></div><p class="q">£90,000 in 12 months is the VAT line. This is a guide, not tax advice.</p></div></div>';
}
function more() {
  var s = D.settings;
  return '<div class="top"><span>You</span><span></span></div><h2>' + esc(s.name || "Your account") + "</h2>" +
    '<div class="sum"><div><span class="q">Signed in</span><span>' + (mode === "demo" ? "Sample data, this browser only" : esc(G.email || "Google")) + '</span></div><div><span class="q">Your data</span><span>' + (mode === "demo" ? "Not saved to Drive" : "In your Google Drive") + '</span></div><div><span class="q">Day rate</span><span>' + money(num(s.rate)) + '</span></div><div><span class="q">Terms</span><span>' + esc(s.terms || 30) + ' days</span></div><div><span class="q">Email</span><span>' + esc(s.mail || "Gmail") + '</span></div><div><span class="q">Agent</span><span>' + (s.hasAgent === "Yes" ? esc(s.agent || "Yes") : "None") + "</span></div></div>" +
    (roleKey() === "Producer" ? '<div class="part">For producers</div><div class="rows"><button class="row" data-features><span>Everything Systems runs</span><span class="q">26</span><span class="sub">Advance invoices, crew checks, permits, rights, deliverables, the books.</span></button><button class="row" data-check><span>Check a crew day</span><span class="q">APA or Bectu</span><span class="sub">See what a crew member is owed and whether their invoice is over or under.</span></button></div>' : "") +
    '<div class="acts"><button class="btn" data-tour>How it works</button><button class="btn" data-editsetup>Edit details</button>' + (mode === "google" && G.sheetId ? '<a class="btn" target="_blank" rel="noopener" href="https://docs.google.com/spreadsheets/d/' + esc(G.sheetId) + '">Open my sheet</a>' : "") + "</div>" +
    '<div class="part">On your phone</div><p class="q">iPhone: open this page in Safari, tap Share, then Add to Home Screen. Android: tap the menu, then Install app. Sign in with the same Google account and it matches your laptop.</p>' +
    '<div class="part">Your data</div><p class="q">Everything is in one Google Sheet in your Drive, which you own and can edit or delete. Eltio can only see files this app made, and keeps no copy. Nothing is ever sent for you: drafts open in your own email.</p>' +
    '<div class="acts"><button class="btn" data-signout>' + (mode === "demo" ? "Leave sample data" : "Sign out") + "</button>" + (mode === "demo" ? '<button class="lnk" data-resetdemo>Reset sample data</button>' : "") + "</div>" + '<p class="q"><a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a></p>';
}

/* ---------- forms ---------- */
function bookingForm(b) {
  var s = D.settings, isNew = !b; b = b || { id: uid(), start: iso(addDays(today(), 7)), end: "", client: "", production: "", contact: "", status: "First hold", rate: s.rate || "", days: "1", agent: "", notes: "", terms: s.work === "TV and film" ? "TV drama" : ["Director", "Producer"].indexOf(roleKey()) >= 0 ? "Flat day" : "APA", kit: "", extra: "", po: "" };
  var acts = isNew ? "" : '<div class="acts">' + (isHold(b) ? '<button class="btn" data-draft="hold" data-id="' + b.id + '">Ask to confirm</button>' : "") + (b.status === "Confirmed" && !isDone(b) ? '<button class="btn" data-draft="confirm" data-id="' + b.id + '">Send booking confirmation</button>' : "") + (b.status === "Confirmed" && b.terms !== "Flat day" ? '<button class="btn' + (isDone(b) ? " solid" : "") + '" data-timesheet="' + b.id + '">Timesheet' + (daysFor(b.id).length ? ", " + daysFor(b.id).length + " day" + (daysFor(b.id).length > 1 ? "s" : "") : "") + "</button>" : "") + (isDone(b) && !invoiced(b.id) && !isPaye(b) ? '<button class="btn" data-invoicefor="' + b.id + '">Make the invoice</button>' : "") + "</div>";
  return '<h2>' + (isNew ? "Add a booking" : esc(b.production || "Booking")) + "</h2>" + acts + '<input type="hidden" id="b-id" value="' + esc(b.id) + '">' +
    '<div class="grid2">' + field("b-production", "What is it?", b.production, "text", "Commercial, music video…") + field("b-client", "Who for?", b.client, "text", "Production company") + "</div>" +
    field("b-contact", "Their email", b.contact, "email", "producer@company.com") +
    '<div class="grid2">' + field("b-start", "First day", b.start, "date") + field("b-end", "Last day (if more than one)", b.end, "date") + "</div>" +
    '<div class="field"><span class="lab">Status</span>' + pills("status", STATUSES, b.status) + "</div>" +
    '<div class="grid2">' + field("b-rate", "Day rate (£)", b.rate, "number", "", ' inputmode="numeric"') + field("b-days", "Days", b.days, "number", "1", ' inputmode="numeric"') + "</div>" +
    '<div class="field"><span class="lab">Terms</span>' + pills("terms", TERMS, b.terms || "APA") + '<span class="q" id="termsnote">' + esc(TERMN[b.terms || "APA"]) + "</span></div>" +
    '<div id="extraf"' + (b.terms === "TV drama" ? "" : " hidden") + ' class="field"><span class="lab">Additional contracted hour? (ADs, costume, hair and make-up, locations, production, script)</span>' + pills("extra", ["Yes", "No"], b.extra ? "Yes" : "No") + "</div>" +
    '<div class="grid2">' + field("b-kit", "Kit a day (£)", b.kit, "number", "0", ' inputmode="numeric"') + field("b-po", "PO number", b.po, "text", "If they gave one") + "</div>" +
    (s.hasAgent === "Yes" ? '<div class="field"><span class="lab">Came through your agent?</span>' + pills("viaAgent", ["Yes", "No"], b.agent ? "Yes" : "No") + "</div>" : "") +
    field("b-notes", "Notes", b.notes, "text", "Optional") +
    '<div class="acts"><button class="btn solid wide" data-savebooking>Save</button>' + (isNew ? '<button class="btn" data-close>Cancel</button>' : '<button class="btn" data-delbooking="' + b.id + '">Delete</button>') + "</div>";
}
function invoiceForm(v, fromBooking) {
  var s = D.settings, isNew = !v, t = today(), b = fromBooking;
  v = v || { id: uid(), booking: b ? b.id : "", number: nextInvoiceNumber(), client: b ? b.client : "", contact: b ? b.contact : "", amount: b ? String(Math.round(bookingValue(b) * 100) / 100) : "", issued: iso(t), due: iso(addDays(t, num(s.terms) || 30)), paid: "", notes: b ? b.production + ", " + niceRange(b.start, b.end) + (b.po ? ", " + b.po : "") + (daysFor(b.id).length ? ", from your timesheet" : "") : "" };
  var od = !v.paid && parse(v.due) && parse(v.due) < t;
  var acts = isNew ? "" : '<div class="acts">' + (od ? '<button class="btn solid" data-draft="chase" data-id="' + v.id + '">Write the chase</button>' : "") + (!v.paid ? '<button class="btn" data-markpaid="' + v.id + '">Mark as paid</button>' : '<button class="btn" data-markunpaid="' + v.id + '">Mark as unpaid</button>') + '<button class="btn" data-draft="invoice" data-id="' + v.id + '">Email it</button></div>';
  return "<h2>" + (isNew ? "New invoice" : esc(v.number)) + "</h2>" + acts + '<input type="hidden" id="v-id" value="' + esc(v.id) + '"><input type="hidden" id="v-booking" value="' + esc(v.booking) + '">' +
    '<div class="grid2">' + field("v-number", "Invoice number", v.number) + field("v-amount", "Amount (£)", v.amount, "number", "", ' inputmode="decimal"') + "</div>" +
    '<div class="grid2">' + field("v-client", "Who to", v.client, "text", "Production company") + field("v-contact", "Their email", v.contact, "email", "accounts@company.com") + "</div>" +
    '<div class="grid2">' + field("v-issued", "Sent", v.issued, "date") + field("v-due", "Due", v.due, "date") + "</div>" +
    (v.paid ? field("v-paid", "Paid on", v.paid, "date") : '<input type="hidden" id="v-paid" value="">') +
    field("v-notes", "What for", v.notes, "text", "Optional") +
    '<p class="q">This records the invoice. Make the invoice itself in your accounts app as usual, then attach it to the email.</p>' +
    '<div class="acts"><button class="btn solid wide" data-saveinvoice>Save</button>' + (isNew ? '<button class="btn" data-close>Cancel</button>' : '<button class="btn" data-delinvoice="' + v.id + '">Delete</button>') + "</div>";
}

function calcHtml(r) {
  return '<div class="sum">' + (r.lines.length ? r.lines.map(function (l) { return "<div><span class=\"q\">" + esc(l[0]) + "</span><span>" + pounds(l[1]) + "</span></div>"; }).join("") + "<div><span>Day total</span><span>" + pounds(r.total) + "</span></div>" : '<div><span class="q">Add the call and wrap times to see the day.</span><span></span></div>') + "</div>" +
    r.flags.map(function (f) { return '<p class="note amb">' + esc(f) + "</p>"; }).join("");
}
function timesheet(b) {
  var T = sheetCalc(b), paye = isPaye(b);
  var rows = T.days.length ? T.days.map(function (o) {
    var x = o.x;
    return '<button class="row" data-day="' + x.id + '"><span>' + esc(dayLabel(x.date)) + ' <span class="q">· ' + esc(x.call) + " to " + esc(x.wrap) + '</span></span><span class="tag' + (o.r.flags.length ? " amb" : " ink") + '">' + pounds(o.r.total) + '</span><span class="sub">' + esc(o.r.lines.slice(1).map(function (l) { return l[0]; }).join(", ") || "No extras") + (o.r.flags.length ? ". " + esc(o.r.flags[0]) : "") + "</span></button>";
  }).join("") : '<p class="empty">No days logged yet.</p>';
  return "<h2>" + esc(b.production || "Timesheet") + '</h2><p class="q">' + esc(b.client) + ", " + niceRange(b.start, b.end) + "</p>" +
    '<p class="note">' + esc(termsLine(b)) + "</p>" +
    '<div class="rows">' + rows + "</div>" +
    (T.days.length ? '<div class="sum"><div><span>Total</span><span>' + pounds(T.total) + "</span></div></div>" : "") +
    '<div class="acts"><button class="btn solid" data-logday="' + b.id + '">Log a day</button>' +
    (T.days.length ? '<button class="btn" data-tsdraft="' + b.id + '">' + (paye ? "Send to check against payroll" : "Send for approval") + "</button>" + (!paye && !invoiced(b.id) ? '<button class="btn" data-invoicefor="' + b.id + '">Make the invoice</button>' : "") : "") +
    '<button class="btn" data-booking="' + b.id + '">Booking details</button></div>' +
    '<p class="q">' + (paye ? "On TV drama, payroll makes the real timesheet. This is your own record to check theirs against, and it keeps the evidence if overtime or turnaround is missed." : "Worked out from APA terms as we read them. Check against your deal memo; you can add an adjustment on any day.") + "</p>";
}
function dayForm(b, x) {
  var t = b.terms || "APA", isNew = !x, last = daysFor(b.id).slice(-1)[0];
  x = x || { id: uid(), booking: b.id, date: nextDate(b), type: "Normal", call: last ? last.call : "08:00", lunchAt: "", lunch: LUNCH[t][0], wrap: last ? last.wrap : "19:00", miles: last ? last.miles : "", adjust: "", source: last ? last.source : "Call sheet", notes: "" };
  return "<h2>" + (isNew ? "Log a day" : esc(dayLabel(x.date))) + '</h2><p class="q">' + esc(b.production) + ", " + esc(TERMN[t]) + '</p><input type="hidden" id="d-id" value="' + esc(x.id) + '"><input type="hidden" id="d-booking" value="' + esc(b.id) + '">' +
    field("d-date", "Date", x.date, "date") +
    (DAYTYPE[t].length > 1 ? '<div class="field"><span class="lab">Day</span>' + pills("dtype", DAYTYPE[t], x.type || "Normal") + "</div>" : "") +
    '<div class="grid2">' + field("d-call", "Your call", x.call, "time") + field("d-wrap", "Wrap", x.wrap, "time") + "</div>" +
    '<div class="field"><span class="lab">Lunch</span>' + pills("lunch", LUNCH[t], x.lunch || LUNCH[t][0]) + "</div>" +
    (t === "APA" ? field("d-lunchAt", "Lunch called at (for the late break)", x.lunchAt, "time") : "") +
    '<div class="field"><span class="lab">Where the times came from</span>' + pills("source", SOURCES, x.source || "Call sheet") + "</div>" +
    '<div class="grid2">' + field("d-miles", "Miles", x.miles, "number", "0", ' inputmode="numeric"') + field("d-adjust", "Adjustment (£)", x.adjust, "number", "0", ' inputmode="decimal"') + "</div>" +
    field("d-notes", "Notes", x.notes, "text", "What the adjustment is for, de-rig, anything to remember") +
    '<div id="calc">' + calcHtml(calcDay(x, b)) + "</div>" +
    '<div class="acts"><button class="btn solid wide" data-saveday>Save the day</button>' + (isNew ? '<button class="btn" data-timesheet="' + b.id + '">Back</button>' : '<button class="btn" data-delday="' + x.id + '">Delete</button>') + "</div>";
}
/* Producers: check one crew day against the rules before paying an invoice. Nothing is saved. */
function checkForm() {
  return "<h2>Check a crew day</h2><p class=\"q\">Put in what's on their timesheet. Nothing here is saved.</p>" +
    '<div class="grid2">' + field("c-rate", "Their day rate (£)", "450", "number", "", ' inputmode="numeric"') + field("c-claim", "They invoiced for this day (£)", "", "number", "", ' inputmode="decimal"') + "</div>" +
    '<div class="field"><span class="lab">Terms</span>' + pills("cterms", TERMS, "APA") + "</div>" + field("c-date", "Date", iso(today()), "date") +
    '<div class="grid2">' + field("c-call", "Call", "07:00", "time") + field("c-wrap", "Wrap", "20:30", "time") + "</div>" +
    '<div class="field"><span class="lab">Lunch</span>' + pills("clunch", ["1 hour", "30 min", "None"], "1 hour") + "</div>" + field("c-lunchAt", "Lunch called at", "", "time") +
    '<div class="grid2">' + field("c-kit", "Kit (£)", "", "number", "0", ' inputmode="numeric"') + field("c-miles", "Miles", "", "number", "0", ' inputmode="numeric"') + "</div>" +
    '<div id="ccalc"></div><div class="acts"><button class="btn wide" data-close>Done</button></div>';
}
function liveCheck() {
  var c = $("ccalc"); if (!c) return;
  var b = { rate: val("c-rate"), terms: picked("cterms") || "APA", kit: val("c-kit") }, r = calcDay({ date: val("c-date"), call: val("c-call"), wrap: val("c-wrap"), lunch: picked("clunch") || "1 hour", lunchAt: val("c-lunchAt"), miles: val("c-miles"), type: "Normal" }, b), claim = num(val("c-claim"));
  var diff = claim ? claim - r.total : 0;
  c.innerHTML = calcHtml(r) + (claim ? '<p class="note' + (Math.abs(diff) >= 1 ? " amb" : "") + '">' + (Math.abs(diff) < 1 ? "Their invoice matches." : "Their invoice is " + pounds(Math.abs(diff)) + (diff > 0 ? " over" : " under") + " what the rules work out.") + "</p>" : "");
}
function dayFromForm() {
  return { id: val("d-id"), booking: val("d-booking"), date: val("d-date"), type: picked("dtype") || "Normal", call: val("d-call"), lunchAt: val("d-lunchAt"), lunch: picked("lunch") || "1 hour", wrap: val("d-wrap"), miles: val("d-miles"), adjust: val("d-adjust"), source: picked("source") || "", notes: val("d-notes") };
}
function liveCalc() { liveCheck(); var c = $("calc"), bid = val("d-booking"); if (!c || !bid) return; var b = D.bookings.find(function (z) { return z.id === bid; }); if (b) c.innerHTML = calcHtml(calcDay(dayFromForm(), b)); }
function draftSheet(d, label) {
  return "<h2>" + esc(label) + '</h2><div class="sum"><div><span class="q">To</span><span>' + esc(d.to || "add their email") + '</span></div><div><span class="q">Subject</span><span>' + esc(d.subject) + '</span></div></div><div class="glass" style="padding:14px 16px;white-space:pre-wrap">' + esc(d.body) + "</div>" +
    '<div class="acts"><button class="btn solid wide" data-compose>Open in ' + esc(D.settings.mail === "Other" || !D.settings.mail ? "your email" : D.settings.mail) + '</button><button class="btn" data-copy>Copy</button><button class="btn" data-close>Close</button></div><p class="q">You check it and press send. Nothing is sent for you.</p>';
}
var DRAFT = null;
function showDraft(kind, id) {
  var b = D.bookings.find(function (x) { return x.id === id; }), v = D.invoices.find(function (x) { return x.id === id; });
  DRAFT = kind === "chase" ? chaseDraft(v) : kind === "hold" ? holdDraft(b) : kind === "confirm" ? confirmDraft(b) : invoiceDraft(v);
  openSheet(draftSheet(DRAFT, { chase: "Chase draft", hold: b && b.agent && D.settings.agentEmail ? "Draft to your agent" : "Ask them to confirm", confirm: "Booking confirmation", invoice: "Invoice email" }[kind]));
}


/* ---------- the walkthrough: five short animated screens on first open, replayable from You ---------- */
/* The walkthrough is built for the person's job: what the app does for crew is not what it does for a producer. */
var ROLES = ["Crew", "DP or HOD", "Director", "Producer", "Editor or post", "Something else"];
function roleKey() { var r = D.settings.role || ""; return r === "DP" ? "DP or HOD" : ROLES.indexOf(r) >= 0 ? r : "Something else"; }
var SL = {
  money: { h: "See what you're owed.", p: "Every invoice, what's late and what's coming up, the moment you open it.", k: "money" },
  chase: { h: "Chasing, already written.", p: "When a payment's late the email is drafted in the right tone for how late it is. You check it and press send.", k: "chase" },
  hold: { h: "Holds that don't hang.", p: "Pencils and holds get a nudge before the date, so a second hold doesn't cost you the job.", k: "hold" },
  agent: { h: "Your agent, kept in the loop.", p: "Holds that came through your agent get drafted to them, not the production.", k: "agent" },
  ot: { h: "Overtime you'd miss.", p: "Log call and wrap. APA rules work out the rest, line by line, ready to send for approval.", k: "ot" },
  drama: { h: "Check what payroll paid.", p: "On TV drama payroll makes the timesheet. Keep your own record on Bectu terms and spot the hours they missed.", k: "drama" },
  kit: { h: "Kit and miles, every day.", p: "Your kit fee and mileage go on each day automatically, so they never drop off the invoice.", k: "kit" },
  check: { h: "Check crew invoices before you pay.", p: "Put in a crew member's call, wrap and rate. See what APA or Bectu says they're owed, and where an invoice is over or under.", k: "check" },
  award: { h: "Paid before you pay out.", p: "You pay crew in 7 days and clients take 30 to 90. When the award lands, the 50% advance invoice is drafted and the balance date goes in the calendar.", k: "award" },
  permits: { h: "Permits, worked back from the shoot.", p: "Pick the shoot date and locations. Every borough, Royal Parks, drone and child-licence deadline is counted back in working days, before it's too late to file.", k: "permits" },
  rights: { h: "Usage that never lapses.", p: "Talent, music and stills usage pulled from the signed contracts, with reminders at 90, 60 and 30 days and the renewal quote drafted. A missed expiry is a liability; a renewal is revenue.", k: "rights" },
  interest: { h: "The last chase has teeth.", p: "Chasers get firmer on a schedule and end in a statutory interest letter, with the Late Payment Act interest and fixed compensation already worked out.", k: "interest" },
  all: { h: "Your whole back office.", p: "26 jobs that normally live in notes, spreadsheets and someone's head, joined up across Gmail, Drive, Xero and DocuSign. See them all under You.", k: "all" },
  company: { h: "Your whole crew, next.", p: "The company version adds crew holds in one place, start paperwork, overtime on set and a cost report. These are the next things being built.", k: "company" },
  drive: { h: "Your data stays yours.", p: "Everything lives in one Google Sheet in your own Drive. Your phone and laptop always match.", k: "drive" }
};
var FOR = {
  "Crew": { who: "crew", b: ["Overtime worked out from call and wrap, to the half hour on APA and the quarter hour on Bectu", "The timesheet drafted for approval the night you wrap", "Late invoices chased in your name, ending in a statutory interest letter", "Pencils nudged before the date, so a second hold doesn't cost you the job"], s: ["ot", "drama", "chase", "interest", "hold", "drive"] },
  "DP or HOD": { who: "DPs and heads of department", b: ["APA and Bectu overtime, early calls, late breaks and turnaround, worked out for you", "Kit hire and mileage on every day, so they never fall off an invoice", "Holds through your agent drafted to them, not the production", "Late invoices chased on a schedule, ending in a statutory interest letter"], s: ["ot", "kit", "agent", "chase", "interest", "drive"] },
  "Director": { who: "directors", b: ["Pencils and holds kept straight across every company, through your agent", "Every client ranked by how long they really take to pay", "Chasers that get firmer on a schedule and end in a statutory interest letter", "Tax put aside from every payment and the £90,000 VAT line watched"], s: ["agent", "money", "chase", "interest", "drive"] },
  "Producer": { who: "producers", b: ["The award lands and the 50% advance invoice is drafted the same hour", "Every crew invoice checked against APA before you approve it", "Permits counted back from the shoot date: boroughs, Royal Parks, drones, 21-day child licences", "Usage rights tracked, with renewal quotes drafted at 90, 60 and 30 days"], s: ["award", "check", "permits", "rights", "interest", "all", "drive"] },
  "Editor or post": { who: "editors and post", b: ["Every booking, hold and pencil in one diary, on your phone and laptop", "Every client ranked by how long they really take to pay", "Chasers that get firmer on a schedule and end in a statutory interest letter", "Tax put aside from every payment and the £90,000 VAT line watched"], s: ["money", "chase", "interest", "hold", "drive"] },
  "Something else": { who: "freelancers", b: ["Bookings and holds in one diary", "What's owed, and who pays slowest", "Chases drafted for you to send", "Overtime on APA or Bectu terms if you need it"], s: ["money", "chase", "hold", "ot", "drive"] }
};
function tourFor() {
  var f = FOR[roleKey()], w = D.settings.work || "Both";
  var list = f.s.filter(function (k) { return !(k === "drama" && w === "Commercials") && !(k === "ot" && w === "TV and film" && f.s.indexOf("drama") >= 0); });
  return [{ h: "What it does for " + (mode === "demo" && job() ? job().pl : f.who) + ".", p: "A minute on how it fits your work. You can replay this from You, under How it works.", k: "intro", b: f.b }].concat(list.map(function (k) { return SL[k]; }));
}
var TOUR = [];
var tourI = 0, tourT = [];
function later(fn, ms) { tourT.push(setTimeout(fn, ms)); }
function countUp(el, to, ms, dp) { if (!el) return; var t0 = performance.now(); (function f(t) { var k = Math.min(1, (t - t0) / ms), v = to * (1 - Math.pow(1 - k, 3)); el.textContent = "£" + v.toLocaleString("en-GB", { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }); if (k < 1 && $("tour")) tourT.push(requestAnimationFrame(f)); })(t0); }
function stage(k) {
  if (k === "intro") return '<div class="rows">' + TOUR[0].b.map(function (x, i) { return '<div class="row static tin" style="--d:' + (.2 + i * .35).toFixed(2) + 's"><span><i class="ck on"></i>' + esc(x) + "</span><span></span></div>"; }).join("") + "</div>";
  if (k === "agent") return '<div class="rows"><div class="row static"><span>Branded film <span class="q">· Thu 6 Nov</span></span><span class="tag">Second hold</span></div></div><div class="glass mail tin" style="--d:.5s"><span class="q">To: your agent</span><p>Hi Jo, I\'m on second hold for Studio Kite on 6 Nov. Could you ask them to confirm or release by Monday?</p></div><span class="btn solid pulse tin" style="--d:1.8s">Open in Mail</span>';
  if (k === "drama") return '<div class="sum ot"><div class="tin" style="--d:.2s"><span class="q">Wed 7 Oct, call 06:00, wrap 23:30</span><span></span></div><div class="tin" style="--d:.6s"><span class="q">Payroll paid overtime</span><span>6 hrs</span></div><div class="tin" style="--d:1s"><span class="q">Your record, Bectu terms</span><span>7.5 hrs + 0.5 after 23:00</span></div><div class="tin" style="--d:1.5s"><span>Missing</span><span class="late" id="tc">£0</span></div></div><p class="note amb tin" style="--d:1.9s">Short turnaround: 10.25 hrs rest since the last wrap.</p>';
  if (k === "kit") return '<div class="sum ot"><div class="tin" style="--d:.2s"><span class="q">Day rate</span><span>£650</span></div><div class="tin" style="--d:.6s"><span class="q">Kit, camera package</span><span>£150</span></div><div class="tin" style="--d:1s"><span class="q">38 miles at 45p</span><span>£17.10</span></div><div class="tin" style="--d:1.4s"><span>Every day</span><span id="tc">£0</span></div></div>';
  if (k === "check") return '<div class="rows"><div class="row static"><span>Gaffer invoice <span class="q">· 2 days</span></span><span class="tag ink">£1,820</span></div><div class="row static tin" style="--d:.6s"><span>APA works out <span class="q">· £450 a day, 1.5x</span></span><span class="tag">£1,742</span></div><div class="row static tin" style="--d:1.2s"><span>Over by <span class="q">· early call counted twice</span></span><span class="tag amb">£78</span></div></div><span class="btn solid pulse tin" style="--d:1.9s">Ask about it</span>';
  if (k === "award") return '<div class="rows"><div class="row static"><span>Award: Brand film <span class="q">· Northlight</span></span><span class="tag ink">£48,000</span></div><div class="row static tin" style="--d:.6s"><span>Advance invoice, 50% <span class="q">· drafted in Xero</span></span><span class="tag" id="tc">£0</span></div><div class="row static tin" style="--d:1.4s"><span>Balance <span class="q">· 30 days after delivery</span></span><span class="tag">In the calendar</span></div><div class="row static tin" style="--d:2s"><span>Crew paid <span class="q">· 7 days after invoice</span></span><span class="tag amb">Covered</span></div></div>';
  if (k === "permits") { var sh = addDays(today(), 28); return '<div class="sum ot"><div><span>Shoot ' + esc(dayLabel(iso(sh))) + '</span><span class="q">Apply by</span></div>' + [["Child performance licence", 21, 0], ["City of London, most filming", 21, 0], ["Islington, bay suspensions", 10, 1], ["Royal Parks, with a drone", 7, 1], ["Westminster", 3, 1]].map(function (p, i) { var d = p[2] ? workBack(sh, p[1]) : addDays(sh, -p[1]); return '<div class="tin" style="--d:' + (.3 + i * .35).toFixed(2) + 's"><span class="q">' + p[0] + "</span><span" + (daysBetween(today(), d) <= 7 ? ' class="late"' : "") + ">" + esc(dayLabel(iso(d))) + "</span></div>"; }).join("") + "</div>"; }
  if (k === "rights") return '<div class="rows"><div class="row static"><span>Talent usage, online <span class="q">· 1 year</span></span><span class="tag">Ends 14 Jan</span><span class="sub"><span class="chips"><i class="tin" style="--d:.5s">90</i><i class="tin" style="--d:1s">60</i><i class="tin on" style="--d:1.5s">30</i></span></span></div><div class="row static tin" style="--d:2s"><span>Renewal quote <span class="q">· drafted for the agency</span></span><span class="tag ink">£3,200</span></div></div>';
  if (k === "interest") return '<div class="sum ot"><div class="tin" style="--d:.2s"><span class="q">Invoice INV-2026-013, 70 days late</span><span>£2,400</span></div><div class="tin" style="--d:.7s"><span class="q">Fixed compensation</span><span>£70</span></div><div class="tin" style="--d:1.2s"><span class="q">Interest, base rate + 8%, a day</span><span>accruing</span></div><div class="tin" style="--d:1.7s"><span>Final letter</span><span class="late">Drafted</span></div></div><p class="q tin" style="--d:2s">Late Payment of Commercial Debts Act. You read it and send it.</p>';
  if (k === "all") return '<div class="st-money"><b>26</b><div class="rows">' + FEAT.map(function (g, i) { return '<div class="row static tin" style="--d:' + (.2 + i * .25).toFixed(2) + 's"><span>' + g.g + '</span><span class="tag">' + g.f.length + "</span></div>"; }).join("") + "</div></div>";
  if (k === "company") return '<div class="rows">' + ["Crew holds in one place", "Start forms and paperwork", "Overtime on set, live", "Cost report against budget"].map(function (x, i) { return '<div class="row static tin" style="--d:' + (.2 + i * .3).toFixed(2) + 's"><span>' + x + '</span><span class="tag">Coming</span></div>'; }).join("") + "</div>";
  if (k === "money") return '<div class="st-money"><span class="q">Owed to you</span><b id="tc">£0</b><div class="rows"><div class="row static tin" style="--d:.5s"><span>Studio Kite <span class="q">· 40 days late</span></span><span class="tag amb">£2,400</span></div><div class="row static tin" style="--d:.8s"><span>Northlight Films <span class="q">· due Friday</span></span><span class="tag ink">£1,300</span></div><div class="row static tin" style="--d:1.1s"><span>Field Records <span class="q">· paid</span></span><span class="tag">£1,800</span></div></div></div>';
  if (k === "chase") return '<div class="rows"><div class="row static"><span>Chase Studio Kite, £2,400</span><span class="tag amb">40 days late</span></div></div><div class="glass mail tin" style="--d:.4s"><span class="q">To: hello@studiokite.co</span><p id="ty"></p></div><span class="btn solid pulse tin" style="--d:2.6s">Open in Gmail</span>';
  if (k === "hold") return '<div class="rows"><div class="row static"><span>Music video <span class="q">· Thu 23 Oct</span></span><span class="tag" id="hs">First hold</span></div><div class="row static tin" style="--d:.9s"><span class="q">Nudge drafted: "Could you confirm or release by Monday?"</span><span></span></div></div><div class="rows tin" style="--d:2.2s"><div class="row static"><span>Branded film <span class="q">· via your agent</span></span><span class="tag">Second hold</span></div></div>';
  if (k === "ot") return '<div class="sum ot"><div class="tin" style="--d:.2s"><span class="q">Day rate</span><span>£650</span></div><div class="tin" style="--d:.7s"><span class="q">Early call before 07:00</span><span>£40.63</span></div><div class="tin" style="--d:1.2s"><span class="q">Overtime, 2.5 hrs at 1.25x</span><span>£203.13</span></div><div class="tin" style="--d:1.7s"><span class="q">Late break</span><span>£10</span></div><div class="tin" style="--d:2.2s"><span>Day total</span><span id="tc">£0</span></div></div><p class="q tin" style="--d:2.4s">APA crew terms · Pact/Bectu TV drama · flat rate</p>';
  return '<div class="st-drive"><div class="dev ph"><i class="tin" style="--d:.4s"></i><i class="tin" style="--d:.6s"></i><i class="tin new" style="--d:1.2s"></i></div><div class="sync tin" style="--d:1.5s">⇄</div><div class="dev lap"><i class="tin" style="--d:.4s"></i><i class="tin" style="--d:.6s"></i><i class="tin new" style="--d:1.9s"></i></div></div><p class="q tin" style="--d:2.2s">Eltio Systems · a sheet in your Google Drive</p>';
}
function tourHtml() {
  var t = TOUR[tourI], last = tourI === TOUR.length - 1;
  return '<div class="tour-in"><div class="top"><span class="q">' + (tourI + 1) + " of " + TOUR.length + '</span><button class="lnk" data-tourend>Skip</button></div><div class="stage glass">' + stage(t.k) + "</div><h1>" + esc(t.h) + '</h1><p class="q">' + esc(t.p) + '</p><div class="dots">' + TOUR.map(function (x, i) { return '<i class="' + (i === tourI ? "on" : "") + '"></i>'; }).join("") + '</div><div class="acts">' + (tourI ? '<button class="btn" data-tourback>Back</button>' : "") + '<button class="btn solid wide" data-tournext>' + (last ? (mode === "demo" ? "Try it with the sample data" : "Get started") : "Next") + "</button></div></div>";
}
function showTour(i) {
  if (!i) TOUR = tourFor();
  tourT.forEach(function (x) { clearTimeout(x); cancelAnimationFrame(x); }); tourT = [];
  tourI = i; var el = $("tour"); if (!el) { el = document.createElement("div"); el.id = "tour"; el.className = "tour"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); document.body.appendChild(el); }
  el.innerHTML = tourHtml(); var k = TOUR[i].k;
  if (k === "money") countUp($("tc"), 3700, 1100);
  if (k === "ot") later(function () { countUp($("tc"), 903.76, 900, 2); }, 2200);
  if (k === "drama") later(function () { countUp($("tc"), 136.5, 800, 2); }, 1500);
  if (k === "kit") later(function () { countUp($("tc"), 817.1, 800, 2); }, 1400);
  if (k === "award") later(function () { countUp($("tc"), 24000, 900); }, 700);
  if (k === "chase") { var txt = "Hi, following up on invoice INV-2026-013 for £2,400, now 40 days past its due date. Could you confirm a payment date this week?", n = 0; later(function f() { var p = $("ty"); if (!p) return; p.textContent = txt.slice(0, n += 3); if (n < txt.length) later(f, 28); }, 700); }
  if (k === "hold") { later(function () { var h = $("hs"); if (h) h.textContent = "Asked to confirm"; }, 1300); later(function () { var h = $("hs"); if (h) { h.textContent = "Confirmed"; h.className = "tag ink"; } }, 2600); }
}
function endTour() { tourT.forEach(function (x) { clearTimeout(x); cancelAnimationFrame(x); }); tourT = []; var el = $("tour"); if (el) el.remove(); flag("eltio-systems-tour-1", "1"); }

/* ---------- render ---------- */
var VIEWS = { home: home, bookings: bookings, money: moneyScr, more: more };
function render() {
  paintSky();
  var signedIn = !!mode, ready = signedIn && D.settings && D.settings.name && (mode === "demo" || G.sheetId);
  $("main").innerHTML = !signedIn ? welcome() : !ready ? setup() : VIEWS[S.tab]();
  if (ready && !flag("eltio-systems-tour-1") && !$("tour")) showTour(0);
  var n = ready ? todo().length : 0;
  $("side").innerHTML = ready ? '<div class="who"><span>' + esc(D.settings.trading || D.settings.name) + '</span><span class="q">Eltio Systems</span></div>' + Object.keys(TABN).map(function (t) { return '<button data-tab="' + t + '" class="' + (S.tab === t ? "on" : "") + '"><span>' + TABN[t] + '</span><span class="q">' + (t === "home" && n ? n : "") + "</span></button>"; }).join("") + '<button class="btn solid add" data-addbooking>Add a booking</button>' : "";
  $("tabs").innerHTML = ready ? '<nav class="tabs" aria-label="Sections">' + Object.keys(TABN).map(function (t) { return '<button data-tab="' + t + '" class="' + (S.tab === t ? "on" : "") + '"><i></i>' + TABN[t] + (t === "home" && n ? '<span class="badge">' + n + "</span>" : "") + "</button>"; }).join("") + '</nav><button class="fab" data-addbooking aria-label="Add a booking">+</button>' : "";
}

/* ---------- start-up ---------- */
function startGoogle(silent) {
  return getToken(silent).then(function () {
    return api("https://www.googleapis.com/oauth2/v3/userinfo").then(function (u) { G.email = u.email || ""; }).catch(function () {});
  }).then(findSheet).then(function (id) {
    mode = "google";
    if (id) { G.sheetId = id; return ensureTabs().then(readAll).then(function (d) { D = d; }); }
    D = { bookings: [], invoices: [], expenses: [], days: [], settings: { name: "", rate: "", terms: "30", tax: "25", mileage: "45", mail: "Gmail", hasAgent: "No", invoicePrefix: "INV" } };
  }).then(render);
}
function saveSetup() {
  var s = D.settings;
  s.name = val("s-name"); s.trading = val("s-trading"); var wasNew = !flag("eltio-systems-tour-1") || picked("role") !== roleKey(); s.role = picked("role") || s.role || ""; s.work = picked("work") || s.work || "Both"; s.rate = val("s-rate"); s.terms = val("s-terms") || "30"; s.tax = val("s-tax") || "25"; s.mileage = val("s-mileage") || "45";
  s.mail = picked("mail") || "Gmail"; s.hasAgent = picked("hasAgent") || "No"; s.agent = val("s-agent"); s.agentEmail = val("s-agentEmail"); s.invoicePrefix = s.invoicePrefix || "INV";
  if (!s.name) { banner("Add your name first."); return; }
  if (wasNew) { try { localStorage.removeItem("eltio-systems-tour-1"); } catch (e) {} }
  if (mode === "demo") { demoSave(); S.tab = "home"; render(); banner("Saved."); return; }
  var p = G.sheetId ? Promise.resolve() : (busy++, render(), createSheet("Eltio Systems" + (s.trading ? ": " + s.trading : "")).then(function () { busy--; }));
  p.then(function () { return change("Settings", function () {}); }).then(function () { S.tab = "home"; render(); banner("Saved to your Drive."); }).catch(function (e) { busy = Math.max(0, busy - 1); render(); banner("Couldn't save: " + (e.message || e)); });
}

document.addEventListener("click", function (e) {
  var b = e.target.closest("button,a"); if (!b) { if (e.target.id === "shade") closeSheet(); return; }
  var d = b.dataset;
  if (d.pick) { var g = b.parentNode; g.querySelectorAll(".pill").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); if (d.pick === "hasAgent") { var f = $("agentf"); if (f) f.hidden = d.v !== "Yes"; } if (d.pick === "terms") { var ef = $("extraf"), tn = $("termsnote"); if (ef) ef.hidden = d.v !== "TV drama"; if (tn) tn.textContent = TERMN[d.v]; } liveCalc(); return; }
  if (b.hasAttribute("data-close")) { closeSheet(); return; }
  if (b.hasAttribute("data-tournext")) { if (tourI < TOUR.length - 1) showTour(tourI + 1); else endTour(); return; }
  if (b.hasAttribute("data-tourback")) { showTour(Math.max(0, tourI - 1)); return; }
  if (b.hasAttribute("data-tourend")) { endTour(); return; }
  if (b.hasAttribute("data-tour")) { showTour(0); return; }
  if (b.hasAttribute("data-features")) { openSheet(featuresSheet()); return; }
  if (b.hasAttribute("data-check")) { openSheet(checkForm()); liveCheck(); return; }
  if (b.hasAttribute("data-starteroff")) { flag("eltio-systems-starter-off", "1"); render(); return; }
  if (b.hasAttribute("data-howphone")) { flag("eltio-systems-phone", "1"); openSheet('<h2>Put it on your home screen</h2><div class="sum"><div><span class="q">iPhone</span><span>Safari, Share, Add to Home Screen</span></div><div><span class="q">Android</span><span>Chrome menu, Install app</span></div></div><p class="q">Then sign in with the same Google account on your laptop. Both read the same sheet, so they always match.</p><div class="acts"><button class="btn solid wide" data-close>Done</button></div>'); render(); return; }
  if (d.job) { startJob(d.job); return; }
  if (d.jobf) { openSheet(jobSheet(+d.jobf)); return; }
  if (b.hasAttribute("data-callsheet")) { openSheet(callSheet()); return; }
  if (b.hasAttribute("data-findcrew")) { openSheet(findCrew()); return; }
  if (b.hasAttribute("data-passport")) { openSheet(passportSheet()); return; }
  if (d.hold) { b.textContent = "Hold sent"; b.disabled = true; banner("Hold sent to " + d.hold + " They join the job when they accept."); return; }
  if (b.hasAttribute("data-postv")) { closeSheet(); banner("V4 posted. Everyone gets a ping with what changed."); return; }
  if (b.hasAttribute("data-editlink")) { closeSheet(); banner("Edit link ready for your PM. Rates and budget stay hidden."); return; }
  if (b.hasAttribute("data-confirmed")) { banner("Production confirmed these hours. The mark goes on your invoice."); return; }
  if (b.hasAttribute("data-switchjob")) { closeSheet(); mode = null; S.tab = "home"; render(); return; }
  if (b.hasAttribute("data-demo")) { mode = "demo"; D = demoLoad(); if (!D.settings.name) { D.settings.name = ""; } render(); return; }
  if (b.hasAttribute("data-signin")) { b.disabled = true; startGoogle(false).catch(function (er) { b.disabled = false; banner("Sign-in didn't finish: " + (er.message || er)); }); return; }
  if (b.hasAttribute("data-signout")) { if (mode === "google" && G.token && window.google) { try { google.accounts.oauth2.revoke(G.token, function () {}); } catch (x) {} } try { localStorage.removeItem("eltio-systems-signed-in"); } catch (x) {} mode = null; G = { token: null, exp: 0, client: null, sheetId: null, email: "" }; S.tab = "home"; render(); return; }
  if (b.hasAttribute("data-resetdemo")) { try { localStorage.removeItem(DEMO_KEY); } catch (x) {} D = sample(); render(); banner("Sample data reset."); return; }
  if (b.hasAttribute("data-savesetup")) { saveSetup(); return; }
  if (b.hasAttribute("data-editsetup")) { var keep = D.settings.name; D.settings.name = ""; render(); D.settings.name = keep; var n = $("s-name"); if (n) n.value = keep; return; }
  if (d.tab) { S.tab = d.tab; closeSheet(); render(); window.scrollTo(0, 0); return; }
  if (b.hasAttribute("data-addbooking")) { openSheet(bookingForm(null)); return; }
  if (d.booking) { openSheet(bookingForm(D.bookings.find(function (x) { return x.id === d.booking; }))); return; }
  if (b.hasAttribute("data-addinvoice")) { openSheet(invoiceForm(null)); return; }
  if (d.invoice) { openSheet(invoiceForm(D.invoices.find(function (x) { return x.id === d.invoice; }))); return; }
  if (d.invoicefor) { openSheet(invoiceForm(null, D.bookings.find(function (x) { return x.id === d.invoicefor; }))); return; }
  if (d.todo) { if (d.todo === "chase") showDraft("chase", d.id); else if (d.todo === "hold") showDraft("hold", d.id); else if (d.todo === "hours") openSheet(dayForm(D.bookings.find(function (x) { return x.id === d.id; }))); else openSheet(invoiceForm(null, D.bookings.find(function (x) { return x.id === d.id; }))); return; }
  if (d.draft) { showDraft(d.draft, d.id); return; }
  if (d.timesheet) { openSheet(timesheet(D.bookings.find(function (x) { return x.id === d.timesheet; }))); return; }
  if (d.logday) { openSheet(dayForm(D.bookings.find(function (x) { return x.id === d.logday; }))); return; }
  if (d.day) { var dx = D.days.find(function (x) { return x.id === d.day; }); openSheet(dayForm(D.bookings.find(function (x) { return x.id === dx.booking; }), dx)); return; }
  if (b.hasAttribute("data-saveday")) {
    var dy = dayFromForm(); if (!dy.date || !dy.call || !dy.wrap) { banner("Add the date, call and wrap."); return; }
    var bk = D.bookings.find(function (x) { return x.id === dy.booking; });
    upsert("Days", dy).then(function () { openSheet(timesheet(bk)); banner("Day saved."); }); return;
  }
  if (d.delday) { if (!confirm("Delete this day?")) return; var bd = D.days.find(function (x) { return x.id === d.delday; }).booking; remove("Days", d.delday).then(function () { openSheet(timesheet(D.bookings.find(function (x) { return x.id === bd; }))); banner("Deleted."); }); return; }
  if (d.tsdraft) { var tb = D.bookings.find(function (x) { return x.id === d.tsdraft; }); DRAFT = timesheetDraft(tb); openSheet(draftSheet(DRAFT, isPaye(tb) ? "Your hours, to check" : "Timesheet for approval")); return; }
  if (b.hasAttribute("data-compose")) { if (DRAFT) compose(DRAFT.to, DRAFT.subject, DRAFT.body); closeSheet(); return; }
  if (b.hasAttribute("data-copy")) { if (DRAFT && navigator.clipboard) navigator.clipboard.writeText("Subject: " + DRAFT.subject + "\n\n" + DRAFT.body).then(function () { banner("Copied."); }, function () { banner("Couldn't copy."); }); return; }
  if (b.hasAttribute("data-savebooking")) {
    var start = val("b-start"); if (!start) { banner("Add the first day."); return; }
    var end = val("b-end"), days = val("b-days") || (end && parse(end) ? String(daysBetween(parse(start), parse(end)) + 1) : "1");
    var o = { id: val("b-id"), start: start, end: end && end !== start ? end : "", client: val("b-client"), production: val("b-production"), contact: val("b-contact"), status: picked("status") || "First hold", rate: val("b-rate"), days: days, agent: picked("viaAgent") === "Yes" ? "yes" : "", notes: val("b-notes"), terms: picked("terms") || "APA", kit: val("b-kit"), extra: picked("terms") === "TV drama" && picked("extra") === "Yes" ? "yes" : "", po: val("b-po") };
    closeSheet(); upsert("Bookings", o).then(function () { banner("Booking saved."); }); return;
  }
  if (d.delbooking) { if (!confirm("Delete this booking?")) return; closeSheet(); remove("Bookings", d.delbooking).then(function () { banner("Deleted."); }); return; }
  if (b.hasAttribute("data-saveinvoice")) {
    var v = { id: val("v-id"), booking: val("v-booking"), number: val("v-number"), client: val("v-client"), contact: val("v-contact"), amount: val("v-amount"), issued: val("v-issued"), due: val("v-due"), paid: val("v-paid"), notes: val("v-notes") };
    if (!v.amount) { banner("Add the amount."); return; }
    closeSheet(); upsert("Invoices", v).then(function () { banner("Invoice saved."); }); return;
  }
  if (d.markpaid || d.markunpaid) { var x = Object.assign({}, D.invoices.find(function (z) { return z.id === (d.markpaid || d.markunpaid); })); x.paid = d.markpaid ? iso(today()) : ""; closeSheet(); upsert("Invoices", x).then(function () { banner(d.markpaid ? "Marked as paid." : "Marked as unpaid."); }); return; }
  if (d.delinvoice) { if (!confirm("Delete this invoice record?")) return; closeSheet(); remove("Invoices", d.delinvoice).then(function () { banner("Deleted."); }); return; }
});
document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if ($("tour")) endTour(); else closeSheet(); } });
document.addEventListener("input", function (e) { if (e.target.closest && e.target.closest("#sheet")) liveCalc(); });
/* Pick up changes made on another device when the app comes back into view. */
document.addEventListener("visibilitychange", function () { if (!document.hidden) { paintSky(); refresh(); } });
setInterval(paintSky, 5 * 60 * 1000);
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () {});

/* Opened from the site as a job (?as=gaffer): straight into sample data for that job. */
var asJob = (location.search.match(/[?&]as=([a-z]+)/) || [])[1];
if (!(asJob && startJob(asJob))) render();
/* Returning user on this device: try a silent sign-in. If Google needs a tap, the welcome screen stays. */
try { if (CFG.googleClientId && localStorage.getItem("eltio-systems-signed-in")) startGoogle(true).catch(function () {}); } catch (e) {}
})();

setInterval(function () { document.querySelectorAll(".callin").forEach(function (e) { e.textContent = callIn(); }); }, 30000);
