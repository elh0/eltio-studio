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
  Bookings: ["id", "start", "end", "client", "production", "contact", "status", "rate", "days", "agent", "notes", "terms", "kit", "extra", "po", "message", "fields", "grade"],
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
/* Rate cards: a day rate for every grade, so the rate fills in once the grade is picked. Row: [department, grade, day rate, overtime multiplier (0 = by day rate), 1 if the figure is from the current card]. 0 rate = own deal.
   APA: card from 1 September 2026 where marked; the rest are preview figures to check against the card. Bectu: preview figures to check against the current Pact/Bectu cards. */
var RATES = {
  "APA": { basis: "10 hours plus an hour's lunch, or 9 continuous", rows: [
    ["Camera", "Director of photography", 0, 1], ["Camera", "Camera operator", 656, 1.25, 1], ["Camera", "1st AC, focus puller", 575, 1.25, 1], ["Camera", "2nd AC, clapper loader", 448, 1.5, 1], ["Camera", "DIT", 527, 1.25, 1], ["Camera", "Video playback", 391, 0], ["Camera", "Camera trainee", 206, 0],
    ["Lighting", "Gaffer", 585, 1.25, 1], ["Lighting", "Best boy", 494, 0], ["Lighting", "Desk op", 527, 0], ["Lighting", "Spark", 457, 1.5, 1], ["Lighting", "Genny op", 457, 0],
    ["Grip", "Key grip", 575, 1.25, 1], ["Grip", "Grip", 526, 1.25, 1], ["Grip", "Assistant grip", 371, 0],
    ["Sound", "Sound recordist", 536, 0], ["Sound", "Boom op", 412, 0], ["Sound", "Sound assistant", 309, 0],
    ["Art", "Production designer", 0, 0], ["Art", "Art director", 464, 0], ["Art", "Standby props", 391, 0], ["Art", "Props", 361, 0], ["Art", "Art assistant", 258, 0],
    ["Costume", "Costume designer", 464, 0], ["Costume", "Costume supervisor", 391, 0], ["Costume", "Costume assistant", 309, 0],
    ["Hair and make-up", "HMU designer", 464, 0], ["Hair and make-up", "HMU artist", 391, 0], ["Hair and make-up", "HMU assistant", 288, 0],
    ["Production", "Production manager", 464, 0], ["Production", "Production coordinator", 309, 0], ["Production", "1st AD", 618, 0], ["Production", "2nd AD", 412, 0], ["Production", "3rd AD", 309, 0], ["Production", "Location manager", 412, 0], ["Production", "Unit manager", 309, 0], ["Production", "Runner", 245, 1, 1],
    ["Post", "Editor", 464, 0], ["Post", "Assistant editor", 288, 0]] },
  "Bectu": { basis: "Pact/Bectu film and TV, 10 hours plus lunch, a day of the weekly rate", rows: [
    ["Camera", "Director of photography", 0], ["Camera", "Camera operator", 560], ["Camera", "1st AC, focus puller", 420], ["Camera", "2nd AC, clapper loader", 320], ["Camera", "DIT", 380], ["Camera", "Video playback", 320], ["Camera", "Camera trainee", 180],
    ["Lighting", "Gaffer", 470], ["Lighting", "Best boy", 400], ["Lighting", "Desk op", 420], ["Lighting", "Spark", 360], ["Lighting", "Genny op", 360],
    ["Grip", "Key grip", 450], ["Grip", "Grip", 380], ["Grip", "Assistant grip", 310],
    ["Sound", "Production sound mixer", 460], ["Sound", "Boom op", 360], ["Sound", "Sound assistant", 270],
    ["Art", "Production designer", 0], ["Art", "Art director", 400], ["Art", "Standby props", 330], ["Art", "Props", 300], ["Art", "Art assistant", 220],
    ["Costume", "Costume designer", 0], ["Costume", "Costume supervisor", 340], ["Costume", "Costume assistant", 260],
    ["Hair and make-up", "HMU designer", 0], ["Hair and make-up", "HMU artist", 330], ["Hair and make-up", "HMU assistant", 240],
    ["Production", "Production manager", 420], ["Production", "Production coordinator", 280], ["Production", "1st AD", 520], ["Production", "2nd AD", 360], ["Production", "3rd AD", 270], ["Production", "Location manager", 380], ["Production", "Unit manager", 290], ["Production", "Runner", 160],
    ["Post", "Editor", 420], ["Post", "Assistant editor", 250]] }
};
function cardOf(t) { return t === "TV drama" || t === "TV and film" ? "Bectu" : "APA"; }
function cardRow(card, g) { return RATES[card].rows.find(function (x) { return x[1] === g; }) || null; }
/* Terms are stored as before; Pact/Bectu film and TV shows as Bectu. */
var TLAB = { "TV drama": "Bectu" };
function tlab(t) { return TLAB[t] || t; }
function cardRate(card, g) { var r = RATES[card].rows.find(function (x) { return x[1] === g; }); return r ? r[2] : null; }
function gradeOpts(card, cur) { var h = '<option value="">Pick a grade</option>', dep = ""; RATES[card].rows.forEach(function (r) { if (r[0] !== dep) { h += (dep ? "</optgroup>" : "") + '<optgroup label="' + esc(r[0]) + '">'; dep = r[0]; } h += '<option value="' + esc(r[1]) + '"' + (r[1] === cur ? " selected" : "") + ">" + esc(r[1]) + (r[2] ? ", £" + r[2] : ", own deal") + "</option>"; }); return h + "</optgroup>"; }
function gradeNote(card, g, rate) {
  if (!g) return "Pick it and the " + card + " rate fills in. Change it to your own deal any time.";
  var c = cardRate(card, g), d = num(rate) - (c || 0);
  if (!c) return "Own deal on the " + card + " card. Put in what you agreed.";
  var row = cardRow(card, g), ot = row && row[3] ? " Overtime " + row[3] + "x." : "";
  return card + " card: £" + c + " a day, " + RATES[card].basis + "." + ot + (rate !== "" && rate != null && Math.abs(d) >= 1 ? " Your deal is £" + Math.abs(d) + (d > 0 ? " above" : " below") + " the card." : "") + (row && row[4] ? " From the APA card, 1 Sept 2026." : " Preview figure, to check against the current card.");
}
function gradeField(id, label, card, cur, rateId, rate) { return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-rate="' + rateId + '" data-card="' + esc(card) + '">' + gradeOpts(card, cur) + '</select><span class="q gnote" id="' + id + '-n">' + esc(gradeNote(card, cur, rate)) + "</span></div>"; }
/* Grade picked: fill the day rate from the card. Rate typed: say how the deal sits against the card. */
function gradeSync(sel, fill) {
  var r = $(sel.dataset.rate), c = cardRate(sel.dataset.card, sel.value);
  if (fill && r && c) r.value = c;
  var n = $(sel.id + "-n"); if (n) n.textContent = gradeNote(sel.dataset.card, sel.value, r ? r.value : "");
}
function swapCard(id, card) { var sel = $(id); if (!sel || sel.dataset.card === card) return; var r = $(sel.dataset.rate), old = cardRate(sel.dataset.card, sel.value); sel.dataset.card = card; sel.innerHTML = gradeOpts(card, sel.value); gradeSync(sel, r && (!r.value || num(r.value) === old)); }
function rateSheet(card) {
  card = card || cardOf(D.settings.work === "TV and film" ? "TV drama" : "APA"); var me = D.settings.grade, dep = "";
  return "<h2>Rate cards</h2><p class=\"q\">Every grade, already in. Tap yours and it becomes your day rate. You can always change it to your own deal.</p>" + pills("rcard", Object.keys(RATES), card) +
    '<p class="note">' + esc(RATES[card].basis) + ". " + (card === "APA" ? "Figures marked ✓ are from the card. The rest are preview figures, checked before launch." : "Preview figures: each one gets checked against the current card before launch.") + "</p>" +
    '<div class="rows rc">' + RATES[card].rows.map(function (r) { var h = r[0] !== dep ? '<div class="row static rc-d"><span class="part">' + esc(r[0]) + "</span></div>" : ""; dep = r[0]; return h + '<button class="row rc-r" data-usegrade="' + esc(r[1]) + '" data-card="' + esc(card) + '"><span>' + esc(r[1]) + "</span>" + (me === r[1] ? '<span class="tag ok">You</span>' : "") + '<span class="q">' + (r[2] ? "£" + r[2] : "own deal") + (r[4] ? " ✓" : "") + "</span></button>"; }).join("") + "</div>" +
    '<div class="acts"><button class="btn wide" data-close>Done</button></div>';
}
var TERMN = { "APA": "APA crew terms (commercials)", "TV drama": "Bectu: Pact/Bectu film and TV drama (PAYE)", "Flat day": "Flat day rate, all in" };
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
/* APA overtime grade: set per grade on the card (Grade I 1.5x, II 1.25x, III 1x); for a grade we don't have, worked out from the day rate. */
var OTG = { 1.5: "Grade I", 1.25: "Grade II", 1: "Grade III" };
function apaBand(rate, grade) {
  var row = grade ? cardRow("APA", grade) : null;
  if (row && row[3]) return { m: row[3], t: OTG[row[3]] + " for " + grade };
  var m = rate <= 472 ? 1.5 : rate <= 717 ? 1.25 : 1; return { m: m, t: OTG[m] + " by your day rate" };
}
function termsLine(b) {
  var R = num(b.rate), hr = R / 10;
  if (b.terms === "APA") { var a = apaBand(R, b.grade); return "APA crew terms. Overtime is " + a.t + ", " + a.m + "x the hourly rate (" + pounds(hr * a.m) + " an hour), in half hours, and 3x from midnight to 05:00. 10 hours plus an hour's lunch, or 9 hours continuous."; }
  if (b.terms === "TV drama") return "Bectu, Pact/Bectu film and TV drama. Overtime at 1.5x (" + pounds(Math.min(70, Math.max(35, hr * 1.5))) + " an hour, kept between £35 and £70), in quarter hours. 10 hour day plus lunch, 9.5 semi-continuous, 9 continuous" + (b.extra ? ", plus your additional contracted hour" : "") + ".";
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
      var band = apaBand(R, b.grade), otr = hr * band.m;
      if (c < 420) { var p = roundUp(420 - c, 30); L.push(["Early call, " + hrs(p) + " before 07:00 at " + band.m + "x", p / 60 * otr]); }
      var start = c >= 660 && c < 1020 ? 660 : c;
      if (start !== c) F.push("Late call: the day is counted from 11:00.");
      var ots = start + (lunchM ? 600 + lunchM : 540), ot = Math.max(0, w - ots);
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
function pills(name, opts, cur) { return '<div class="pills" data-group="' + name + '">' + opts.map(function (o) { return '<button type="button" class="pill" data-pick="' + esc(name) + '" data-v="' + esc(o) + '" aria-pressed="' + (cur === o) + '">' + esc(name === "terms" || name === "cterms" ? tlab(o) : o) + "</button>"; }).join("") + "</div>"; }
function field(id, label, val, type, ph, extra) { return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" name="' + id + '" type="' + (type || "text") + '" value="' + esc(val) + '" placeholder="' + esc(ph || "") + '" autocomplete="off"' + (extra || "") + "></div>"; }
function val(id) { var e = $(id); return e ? e.value.trim() : ""; }
function picked(name) { var b = $("sheet").querySelector('[data-pick="' + name + '"][aria-pressed="true"]') || document.querySelector('main [data-pick="' + name + '"][aria-pressed="true"]'); return b ? b.dataset.v : ""; }



/* Everything Systems runs for a production company, from the producer admin research. "app" = in this app today. */
var FEAT = [
  { g: "Cash", f: [["Advance invoice on award", "The award email lands and the 50% advance and balance invoices are drafted as drafts for Xero or FreeAgent, with due dates in the calendar.", "app"], ["Statutory interest letter", "The final-stage chase quotes the Late Payment Act: fixed compensation worked out, interest at 8% above base rate.", "app"], ["13-week cash forecast", "Receipts across every open job set against the crew and supplier payment runs."], ["Payment run prep", "Approved crew invoices (7-day) and supplier bills batched in Xero, ready for you to approve.", "app"], ["Client payment check", "Looks up a new client's published days to pay before you accept their terms."]] },
  { g: "Crew and shoot", f: [["Holds and pencils", "First and second pencils logged, confirm-or-release notes drafted, the calendar blocked.", "app"], ["Booking confirmations", "Rate, hours, overtime and cancellation fee confirmed in writing for every booking.", "app"], ["Crew invoice check", "Every crew invoice checked against the agreed rate, days, overtime grade and late-break rules before approval.", "app"], ["Start packs and IR35", "Bank details, UTR, NI and right-to-work chased, role status pre-tagged, the status determination drafted for sign-off.", "app"], ["Call sheets and movement orders", "Built from the schedule, the crew list and the location."], ["Payroll bureau hand-off", "Signed deal memos for PAYE grades turned into the bureau's input file."], ["Director holds and fee statements", "Director holds tracked, and per-job fee and commission statements drafted."]] },
  { g: "Locations and compliance", f: [["Permit and licence clock", "Borough, TfL, Royal Parks, drone and 21-day child-licence deadlines counted back from the shoot date.", "app"], ["Supplier pack", "Insurance certificates, policies and standard answers kept current for Coupa and Ariba onboarding."], ["AdGreen pack", "Travel, fuel, hotel and catering pulled from expenses into an AdGreen-ready sheet."], ["VAT and tax deadlines", "Rolling 12-month turnover against £90,000, with Self Assessment, payments on account and MTD dates.", "app"]] },
  { g: "Rights and delivery", f: [["Rights and usage register", "Usage terms pulled from signed contracts, with reminders at 90, 60 and 30 days and renewal quotes.", "app"], ["Deliverables and clock numbers", "Versions, ratios, clock numbers, Clearcast stage and Peach or Vevo deadlines from the air date."], ["Music video credits sheet", "One credits and ISRC record per video, ready for Vevo, awards and press."], ["Contract clause memo", "Flags payment terms over 60 days, GenAI, IP and indemnity clauses against the APA standard."], ["Awards calendar", "Arrows, UKMVA, Kinsale and Ciclope deadlines, with entry credits drafted."]] },
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
  var s = D.settings; s.name = "Sam Carter"; s.addr = "Unit 4, 12 Canal Yard, London E2 9AB"; s.bank = "Sort code 12-34-56, account 12345678 (sample)"; s.role = j.role === "DP or HOD" ? "DP" : j.role; s.rate = j.rate; s.job = j.k; s.work = "Both"; s.grade = JOBGRADE[j.k] || ""; var gr = s.grade && cardRate("APA", s.grade); if (gr) s.rate = String(gr);
  D.bookings.forEach(function (b) { if (b.rate === "650") { b.rate = s.rate; b.grade = s.grade; } if (j.kit && b.id === "b6") b.kit = j.kit; if (!j.kit) b.kit = ""; });
  D.offers = j.k === "prod" || j.k === "pm" ? [] : OFFERS.map(function (o) { var t = o[0] === "o2" ? "TV drama" : "APA", c = s.grade ? cardRate(cardOf(t), s.grade) : 0; return { id: o[0], start: iso(addDays(today(), o[1])), days: o[2], client: o[3], production: o[4], via: o[5], from: o[6], message: o[7], loc: o[8], call: o[9], dp: o[10], dir: o[11], terms: t, rate: c || j.rate }; });
  s.fields = (FSUG[j.k] || ["Parking"]).slice(0, 2).join("|");
  D.bookings.forEach(function (b) { if (b.id === "b2") b.message = "Pencilling you for this one. The band are waiting on the label and should know by Wednesday."; if (b.id === "b3") b.message = "Second hold, behind another job. We'll let you know either way by Friday."; });
  flag("eltio-systems-tour-1", "1");
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


/* ---------- the dashboard you open on: your diary and offers (crew), your shoot (producers) ---------- */
/* Each sample job's grade on the card, so its rate comes from the card. */
var JOBGRADE = { camera: "1st AC, focus puller", gaffer: "Gaffer", spark: "Spark", grip: "Grip", sound: "Sound recordist", dit: "DIT", art: "Art director", costume: "Costume designer", hmu: "HMU artist", locations: "Location manager", runner: "Runner", editor: "Editor" };
var OFFERS = [["o1", 2, "1", "Halde Films", "Sportswear spot", "Found you in the directory", "Maya, producer", "Hi Sam, found you in the directory. One day on a sportswear spot, two cameras on a stage in E2. Could you hold it until Thursday? Happy to send the treatment.", "Canal St Studios, E2", "07:00", "Jonah A.", "Mara Q."], ["o2", 4, "2", "Northlight Films", "Drama, second unit", "Via your agent", "Your agent, for Northlight", "Northlight want you for two days of second unit on their drama in Kent, on Bectu terms. Day two is a night shoot on the seafront. They asked if you can do a recce the Friday before.", "Margate seafront, Kent", "05:30", "Ade O.", "Lena K."]];
/* The person behind each offer, so it reads like someone asking, not a form. */
var PEOPLE = {
  o1: { n: "Maya Lindqvist", s: "Maya", ini: "ML", h: 18, role: "Producer, Halde Films", bio: "Produces sportswear and music films, mostly on stage in east London. Small crews, proper lunches, wraps on time.", made: "Fieldwear spring spot, Canal promo, Low Tide 'Haze'", know: "Ana R. and Leon B. have worked with her", pays: "In 9 days, on average" },
  o2: { n: "Ruth Adair", s: "Ruth", ini: "RA", h: 205, role: "Your agent, Lark Crew", bio: "Looks after twelve camera crew. Passing this on from Tom Hale, producer at Northlight Films, who asked for you by name.", made: "Booked you 6 times this year", know: "Northlight booked you in August", pays: "Northlight: in 30 days" }
};
function av(p, cls) { return p ? '<span class="av' + (cls ? " " + cls : "") + '" style="--h:' + p.h + '" aria-hidden="true">' + esc(p.ini) + "</span>" : ""; }
function inis(n) { return String(n).split(/\s+/).map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase(); }
function profCard(p) { return p ? '<div class="prof">' + av(p, "lg") + '<span class="prof-t"><b>' + esc(p.n) + '</b><span class="q">' + esc(p.role) + '</span></span></div><p class="bio">' + esc(p.bio) + '</p><div class="sum"><div><span class="q">Made</span><span>' + esc(p.made) + '</span></div><div><span class="q">You both know</span><span>' + esc(p.know) + '</span></div><div><span class="q">Pays crew</span><span>' + esc(p.pays) + "</span></div></div>" : ""; }
/* Who you'd answer to on the job, by department. */
function keyLab() { var k = (job() || {}).k; return ["camera", "dit", "gaffer", "spark", "grip"].indexOf(k) >= 0 ? "DP" : "Director"; }
var FSUG = { camera: ["Camera body", "Lenses", "Media", "2nd AC"], dit: ["Media", "LUT", "Drives"], gaffer: ["Lamps", "Genny", "Rigging day"], spark: ["Lamps", "Rigging day"], grip: ["Dolly", "Crane"], sound: ["Radio mics", "Timecode"], dop: ["Camera package", "Gaffer"], art: ["Build days", "Budget"], costume: ["Fittings", "Budget"], hmu: ["Talent", "Wigs"] };
/* Your own fields are kept in Settings as one line, names split by | */
function myFields() { var v = D.settings.fields; return !v ? [] : Array.isArray(v) ? v : String(v).split("|").filter(Boolean); }
function fieldSug() { var k = (job() || {}).k, have = myFields(); return (FSUG[k] || ["Parking", "Catering"]).concat(["Parking"]).filter(function (x, i, a) { return a.indexOf(x) === i && have.indexOf(x) < 0; }); }
function parseF(v) { if (!v) return {}; if (typeof v === "object") return v; try { return JSON.parse(v) || {}; } catch (e) { return {}; } }
function cfRows(f, editable) { var mine = myFields(); return '<div class="sum cf">' + (mine.length ? mine.map(function (n) { return '<div><span class="q">' + esc(n) + '</span>' + (editable ? '<input class="cf-in" data-cf="' + esc(n) + '" value="' + esc(f[n] || "") + '" placeholder="Add">' : "<span>" + esc(f[n] || "") + "</span>") + "</div>"; }).join("") : '<div><span class="q">Add what you track on every job. It saves into your sheet.</span></div>') + "</div>"; }
/* The job in full: the producer's message, the details, your own fields. Used for offers, holds and bookings. */
function infoBlock(x, editable) {
  var f = parseF(x.fields);
  return (x.message ? '<div class="dm">' + (PEOPLE[x.id] ? '<span class="dm-h">' + av(PEOPLE[x.id]) + '<span class="part">' + esc(PEOPLE[x.id].s) + ", just now</span></span>" : '<span class="part">' + esc(x.from || "From the producer") + "</span>") + '<p>' + esc(x.message) + "</p></div>" : "") +
    (x.loc ? '<div class="sum"><div><span class="q">Where</span><span>' + esc(x.loc) + '</span></div><div><span class="q">Call</span><span>' + esc(x.call) + '</span></div><div><span class="q">' + keyLab() + '</span><span>' + esc(keyLab() === "DP" ? x.dp : x.dir) + '</span></div><div><span class="q">Rate</span><span>£' + esc(x.rate || D.settings.rate) + " a day, " + esc(tlab(x.terms || "APA")) + " terms</span></div></div>" : "") +
    '<div class="part">Your fields</div>' + cfRows(f, editable) +
    (editable ? '<div class="cf-add"><input id="cf-new" placeholder="New field, e.g. Camera body" autocomplete="off"><button class="btn sm" data-addfield>Add</button></div><div class="pills">' + fieldSug().slice(0, 4).map(function (n) { return '<button type="button" class="pill" data-addfield="' + esc(n) + '">+ ' + esc(n) + "</button>"; }).join("") + "</div>" : "");
}
function readFields(base) { var f = parseF(base); document.querySelectorAll("#sheet .cf-in").forEach(function (el) { var v = el.value.trim(); if (v) f[el.getAttribute("data-cf")] = v; else delete f[el.getAttribute("data-cf")]; }); return JSON.stringify(f); }
function offerSheet(id) {
  var o = (D.offers || []).find(function (x) { return x.id === id; }); if (!o) return "";
  return '<div class="top"><span class="q">Offer · ' + esc(o.via) + '</span><span class="tag">' + niceRange(o.start, num(o.days) > 1 ? iso(addDays(parse(o.start), num(o.days) - 1)) : "") + '</span></div>' + profCard(PEOPLE[o.id]) + "<h2>" + esc(o.production) + ", " + esc(o.client) + ".</h2>" + infoBlock(o, true) +
    '<div class="part">Reply</div><div class="field"><textarea id="of-msg" rows="3" placeholder="Add a message to go with your answer"></textarea></div><div class="pills">' + ["Sounds great, see you there.", "Can you send the treatment?", "Can I hold it until Friday?"].map(function (q) { return '<button type="button" class="pill" data-quick="' + esc(q) + '">' + esc(q) + "</button>"; }).join("") + "</div>" +
    '<div class="acts"><button class="btn solid" data-accept="' + o.id + '">I\'m in</button><button class="btn" data-pencil="' + o.id + '">Hold it for me</button><button class="btn" data-decline="' + o.id + '">Not this time</button></div><p class="q">Your answer and message go back to ' + esc(PEOPLE[o.id] ? PEOPLE[o.id].s : "them") + ' as a draft. Nothing sends until you tap send.</p>';
}
var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function onDay(d) {
  var k = iso(d), b = D.bookings.find(function (x) { return x.status !== "Cancelled" && x.start <= k && (x.end || x.start) >= k; });
  if (b) return { c: b.status === "Confirmed" ? "bk" : "pn", t: b.production, id: b.id };
  var o = (D.offers || []).find(function (x) { var e = iso(addDays(parse(x.start), num(x.days) - 1)); return x.start <= k && e >= k; });
  return o ? { c: "of", t: o.production } : null;
}
function diaryCard() {
  var t = today(), cells = "";
  for (var i = 0; i < 14; i++) { var d = addDays(t, i), o = onDay(d); cells += '<button class="dy ' + (o ? o.c : "fr") + (i === 0 ? " now" : "") + '"' + (o && o.id ? ' data-booking="' + o.id + '"' : o ? " data-offers" : ' data-free="' + iso(d) + '"') + '><span class="q">' + DAYS[d.getDay()].slice(0, 2) + "</span><b>" + d.getDate() + "</b><i></i></button>"; }
  var O = D.offers || [], free = 0; for (i = 0; i < 14; i++) if (!onDay(addDays(t, i))) free++;
  return '<div class="diary"><div class="dia-h"><span class="part">Your diary · next two weeks</span><span class="key"><i class="bk"></i>Booked <i class="pn"></i>Hold <i class="of"></i>Offer</span></div><div class="days">' + cells + '</div><div class="dia-f"><span class="q">' + free + " days free · producers see Available</span>" + '<button class="lnk" data-passport>Who sees this</button></div>' +
    (O.length ? '<div class="offers"><div class="part">Just popped in · ' + O.length + "</div>" + O.map(function (o) {
      var d = parse(o.start);
      var p = PEOPLE[o.id] || { s: o.from, n: o.from, ini: inis(o.from), h: 40, role: o.client };
      return '<div class="offer-r">' + av(p) + '<span class="up-t"><span class="of-who">' + esc(p.s) + '<span class="q"> · ' + esc(p.role) + '</span></span><span class="of-hi">' + esc(o.message.length > 92 ? o.message.slice(0, 90).replace(/\s\S*$/, "") + "…" : o.message) + '</span><span class="q">' + esc(o.production) + " · " + esc(o.days) + (o.days === "1" ? " day" : " days") + " from " + DAYS[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()] + '</span><button class="lnk mi" data-offerinfo="' + o.id + '">See ' + esc(p.s) + "'s profile and reply</button></span><span class=\"of-a\"><button class=\"btn sm solid\" data-accept=\"" + o.id + '">I\'m in</button><button class="btn sm" data-pencil="' + o.id + '">Hold it</button><button class="btn sm ghost" data-decline="' + o.id + '">Not this time</button></span></div>';
    }).join("") + "</div>" : '<p class="q dia-done">No offers waiting. Producers can find you in the directory.</p>') + "</div>";
}
var SHOOT = [["Sound recordist", "", "open"], ["2nd AC", "Offer sent to Priya K.", "wait"], ["Spark", "Pencilled: Leon B.", "pen"], ["Gaffer", "Booked: Sam C.", "ok"], ["1st AC", "Booked: Ana R.", "ok"]];
function shootCard() {
  var open = SHOOT.filter(function (r) { return r[2] !== "ok"; }).length;
  return '<div class="diary shoot"><div class="edge"><span class="part">Your shoot</span><span class="part">Canal promo · tomorrow</span></div>' +
    '<div class="facts"><span><i>Call</i>' + esc(pj().unit.call) + '</span><span><i>Wrap</i>' + esc(pj().unit.wrap) + '</span><span><i>To fill</i>' + open + ' roles</span></div>' +
    '<div class="sh-bar"><b>29</b><span class="q">of 32 crew booked</span><span class="bar"><i style="width:' + (29 / 32 * 100).toFixed(1) + '%"></i></span></div>' +
    '<div class="rows">' + SHOOT.map(function (r) { return '<div class="row static sh-r"><span>' + esc(r[0]) + (r[1] ? '<span class="q sub">' + esc(r[1]) + "</span>" : '<span class="q sub">Nobody yet</span>') + "</span>" + (r[2] === "open" ? '<button class="btn sm solid" data-findcrew>Find crew</button>' : r[2] === "wait" ? '<button class="btn sm" data-nudge="' + esc(r[1].replace("Offer sent to ", "")) + '">Nudge</button>' : '<span class="tag' + (r[2] === "ok" ? " ok" : " amb") + '">' + (r[2] === "ok" ? "Booked" : "Pencilled") + "</span>") + "</div>"; }).join("") + "</div></div>";
}
/* One sign-off: approvals in a set order, timesheet and invoice approved in one tap, and the day's hot cost. */
var SIGN = [{ id: "s1", who: "Ana R.", role: "1st AC", days: "2 days, 3 hrs over", amt: 1180, h: 340, pay: "Self-employed", chain: ["Camera HoD", "PM"], st: "" }, { id: "s2", who: "Leon B.", role: "Spark", days: "2 days, 1 hr over", amt: 840, h: 120, pay: "Self-employed", chain: ["Gaffer", "PM"], st: "" }, { id: "s3", who: "Kit M.", role: "Sound recordist", days: "2 days", amt: 1040, h: 260, pay: "PAYE", chain: ["PM", "Accountant"], st: "" }];
function chainHtml(names, done) { return '<span class="chain">' + names.map(function (n, i) { return '<span class="' + (i < done ? "ok" : i === done ? "now" : "") + '">' + (i < done ? "✓ " : "") + esc(n) + "</span>"; }).join('<i aria-hidden="true">›</i>') + "</span>"; }
function hotCost() {
  var ok = signRows().filter(function (x) { return x.st === "ok"; }).reduce(function (a, x) { return a + x.amt; }, 0), today = 21480 + ok, todate = 38960 + ok, budget = 52000, pct = Math.min(100, todate / budget * 100);
  return '<div class="hot"><div class="dia-h"><span class="part">Hot cost · Canal promo · day 2</span><span class="q">from approved and pending timesheets</span></div><div class="hot-n"><div><span class="q">Labour today</span><b>' + money(today) + '</b></div><div><span class="q">To date</span><b>' + money(todate) + '</b></div><div><span class="q">Budget</span><b>' + money(budget) + '</b></div></div><span class="bar"><i style="width:' + pct.toFixed(1) + '%"></i></span><span class="q">' + Math.round(pct) + "% of labour budget used, with one shoot day to go. Plus " + money(committed()) + " committed on approved POs.</span></div>";
}
/* Simple PO: a department asks, you approve, it becomes committed spend. */
var POS = [{ id: "p1", who: "Art dept", what: "Dressing hire, kitchen set", amt: 640, st: "" }, { id: "p2", who: "Camera", what: "Cross-hire zoom, 2 days", amt: 380, st: "" }, { id: "p3", who: "Locations", what: "Bay suspension, 2 streets", amt: 220, st: "ok" }];
function committed() { return POS.filter(function (x) { return x.st === "ok"; }).reduce(function (a, x) { return a + x.amt; }, 0); }
function poCard() {
  var w = POS.filter(function (x) { return !x.st; }).length;
  return '<div class="diary po"><div class="dia-h"><span class="part">Spend · ask, approve, committed</span><span class="tag' + (w ? " amb" : " ok") + '">' + (w ? w + " to approve" : "All approved") + "</span></div>" + POS.map(function (x) {
    return '<div class="sg-r"><span class="sg-t">' + esc(x.what) + '<span class="q">' + esc(x.who) + " asks · " + money(x.amt) + "</span></span>" + (x.st === "ok" ? '<span class="tag ok">PO ' + x.id.replace("p", "44") + " committed</span>" : x.st === "no" ? '<span class="tag amb">Not now</span>' : '<span class="sg-a"><button class="btn sm solid" data-pook="' + x.id + '">Approve</button><button class="btn sm" data-pono="' + x.id + '">Not now</button></span>') + "</div>";
  }).join("") + '<p class="q">' + money(committed()) + " committed. Approving raises the PO number and adds it to the hot cost.</p></div>";
}
/* Crew Pro is offered when a job pays out, never at sign-up. */
function wrapOffer() {
  if (flag("sy-wrapoffer")) return "";
  return '<div class="wrapoff"><span class="part">Harbour Drama paid you · that\'s a wrap</span><b>Keep every job in one place.</b><span class="q">Overtime and timesheets stay free. For £4 a month, Crew Pro adds your inbox, invoices, chasing and your diary across every job. No 10%, ever.</span><span class="sg-a"><button class="btn sm solid" data-wrappro>Keep it, £4 a month</button><button class="btn sm" data-wrapno>Not now</button></span></div>';
}
var MYJOBS = [["b6", "Car commercial", "Ironbridge Pictures", 2, ["Gaffer", "PM", "Producer"]], ["b5", "Music video", "Field Records", 1, ["Producer"]], ["b7", "TV drama, second unit", "Harbour Drama", 3, ["HoD", "PM", "Accountant", "Line producer"]]];
var STEPS = ["Submitted", "Approved", "Invoiced", "Paid"];
function jobsCard() {
  return '<div class="diary jobs"><div class="dia-h"><span class="part">Your jobs · one status each</span><span class="q">no separate timecard and invoice</span></div>' + MYJOBS.map(function (j) {
    return '<div class="jb-r"><span class="sg-t">' + esc(j[1]) + '<span class="q">' + esc(j[2]) + "</span>" + chainHtml(j[4], j[3] >= 1 ? j[4].length : 1) + '</span><span class="steps">' + STEPS.map(function (t, i) { return '<span class="' + (i <= j[3] ? "on" : "") + '">' + t + "</span>"; }).join("") + "</span></div>";
  }).join("") + '<p class="q">When your timesheet is signed off, the invoice is drafted from it. You never type your hours twice.</p>' + wrapOffer() + "</div>";
}
/* Dashboard onboarding: what you can build in and link, shown on home until it's done or put away. */
var LINKS = [
  { g: "Accounts", k: "xero", n: "Xero", sub: "Invoices you approve land as drafts in Xero." },
  { g: "Accounts", k: "qb", n: "QuickBooks", sub: "Invoices and bills, matched to each job." },
  { g: "Accounts", k: "fa", n: "FreeAgent", sub: "Invoices, expenses and your tax estimate." },
  { g: "Bank", k: "csv", n: "Bank statement (CSV)", sub: "Monzo, Starling, Barclays, HSBC or any UK bank. Drop in a CSV and payments are matched to invoices. No bank login." },
  { g: "Calendar", k: "gcal", n: "Google Calendar", sub: "Bookings and holds in your calendar." },
  { g: "Calendar", k: "ical", n: "Apple Calendar", sub: "The same diary on your iPhone." }
];
function linked() { var v = D.settings.links; return !v ? [] : String(v).split("|").filter(Boolean); }
var LG = "";
function linkSheet(g) {
  LG = g; var have = linked(), L = LINKS.filter(function (x) { return !g || x.g === g; });
  return "<h2>" + (g === "Bank" ? "Link your bank." : g === "Accounts" ? "Link your accounts app." : "Link your tools.") + '</h2><p class="q">You sign in on their own page and choose what Systems can see. Unlink any time from You.</p><div class="rows">' + L.map(function (x) {
    var on = have.indexOf(x.k) >= 0;
    return '<div class="row static lk"><span class="lk-n">' + esc(x.n) + '<span class="sub q">' + esc(x.sub) + "</span></span>" + (on ? '<span class="tag ok">Linked</span>' : '<button class="btn sm solid" data-link="' + x.k + '">Connect</button>') + "</div>";
  }).join("") + '</div><p class="note">' + (g === "Bank" ? "No bank login, ever. You download the CSV from your bank and Systems reads it on this device. It can never move money." : "Systems only writes drafts. Nothing is sent or paid until you do it.") + (mode === "demo" ? " In the preview, Connect shows how it works with sample data." : "") + '</p><div class="acts"><button class="btn wide" data-close>Done</button></div>';
}
function onboard(asSheet) {
  if (flag("sy-onb-off") && !asSheet) return "";
  var have = linked(), prod = isProd(), s = D.settings;
  var steps = [
    prod ? { t: "Your crew list", sub: "Who's on the shoot and their grade. Rates fill from the card.", a: "data-findcrew", done: true } : { t: "Your grade and rate", sub: s.grade ? s.grade + ", " + money(num(s.rate)) + " a day" : "Pick your grade and the rate fills in.", a: "data-rates", done: !!s.grade },
    { t: "Link your accounts app", sub: "Xero, QuickBooks or FreeAgent.", a: 'data-links="Accounts"', done: ["xero", "qb", "fa"].some(function (k) { return have.indexOf(k) >= 0; }) },
    { t: "Match your bank statement", sub: "Drop in a CSV from any UK bank to see who's paid. No bank login.", a: 'data-link="csv"', done: have.indexOf("csv") >= 0 },
    { t: "Link your calendar", sub: "Google or Apple, so holds show up everywhere.", a: 'data-links="Calendar"', done: ["gcal", "ical"].some(function (k) { return have.indexOf(k) >= 0; }) },
    { t: "See what your dashboard does", sub: "A minute, with your own sample numbers.", a: "data-tour", done: !!flag("sy-onb-tour") }
  ], n = steps.filter(function (x) { return x.done; }).length;
  if (asSheet) return "<h2>Set up your dashboard.</h2><p class=\"q\">Link what you already use. Each one takes a minute, and you can skip any of them.</p>" + '<div class="rows">' + steps.map(function (x) {
    return '<button class="row" ' + x.a + '><span><i class="ck' + (x.done ? " on" : "") + '"></i>' + esc(x.t) + '</span><span class="q">' + (x.done ? "Done" : "Start") + '</span><span class="sub">' + esc(x.sub) + "</span></button>";
  }).join("") + '</div><div class="acts"><button class="btn wide" data-close>Done</button><button class="lnk" data-onboff>Hide from home</button></div>';
  return '<button class="onb" data-onbopen><span class="onb-t"><span class="part">Set up your dashboard · ' + n + " of " + steps.length + '</span><span>Link Xero and your calendar, match your bank</span></span><span class="bar"><i style="width:' + (n / steps.length * 100).toFixed(0) + '%"></i></span><span class="go" aria-hidden="true">→</span></button>';
}
function dashTop() { if (mode !== "demo" || !job()) return onboard(); return isProd() ? shootCard() + onboard() + pjCard() + hotCost() + signCard() + poCard() : diaryCard() + onboard() + jobsCard(); }
function takeOffer(id, st) {
  var o = (D.offers || []).find(function (x) { return x.id === id; }); if (!o) return;
  var inSheet = $("sheet").classList.contains("on") && $("of-msg"), reply = inSheet ? $("of-msg").value.trim() : "", fl = inSheet ? readFields(o.fields) : JSON.stringify(parseF(o.fields));
  if (inSheet) closeSheet();
  D.offers = D.offers.filter(function (x) { return x.id !== id; });
  if (st) D.bookings.push({ message: o.message, fields: fl, notes: [o.loc, o.call ? "call " + o.call : "", o.dp ? keyLab() + " " + (keyLab() === "DP" ? o.dp : o.dir) : ""].filter(Boolean).join(", "), id: uid(), start: o.start, end: num(o.days) > 1 ? iso(addDays(parse(o.start), num(o.days) - 1)) : "", client: o.client, production: o.production, contact: "producer@example.com", status: st, rate: o.rate || D.settings.rate, grade: D.settings.grade || "", days: o.days, agent: /agent/.test(o.via) ? "yes" : "", terms: o.terms || "APA" });
  demoSave(); render();
  var who = PEOPLE[id] ? PEOPLE[id].s : "The producer";
  banner((st === "Confirmed" ? "You're in. It's in your diary, and " + who + " gets your yes and your passport." : st ? "Held. " + who + " sees you as Pencilled." : "A kind no is drafted to " + who + ", so the door stays open.") + (reply ? " Your message is drafted with it." : ""));
}

/* ---------- the shared job: call sheet link, crew passport, directory (sample data) ---------- */
function isProd() { var j = job(); return !!j && (j.k === "prod" || j.k === "pm"); }
function callIn() { var n = new Date(), t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 6, 30), m = Math.max(0, Math.round((t - n) / 60000)); return Math.floor(m / 60) + "h " + String(m % 60).padStart(2, "0") + "m"; }
var CSH = [["Call", "06:30", "07:00"], ["Location", "Canal, E2, then Studio 3", "Canal, E2"], ["Unit base", "Studio 3 car park", "Wharf Rd car park"], ["Lunch", "12:30", ""], ["Weather", "Showers after 3", "Dry, 14°"]];
function shareCards() {
  if (mode !== "demo" || !job()) return "";
  var p = isProd();
  return '<div class="share"><button class="csc" data-callsheet><span class="part">Tomorrow · Canal promo · V' + (D.pj ? D.pj.cs.length : 3) + '</span><span class="tag amb">3 changed</span><span class="csc-main"><span><span class="q">Call</span><b>06:30</b></span><span><span class="q">Leave by</span><b>05:50</b></span><span><span class="q">Call in</span><b class="callin">' + callIn() + '</b></span></span><span class="q">' + (p ? "Opened by 29 of 32 crew. 3 haven't seen V3 yet." : "Now Canal, E2, then Studio 3. Unit base moved, showers after 3.") + "</span></button>" +
    (p ? '<button class="ppc" data-findcrew><span class="part">Find crew · camera first</span><b>Who\'s free Thursday?</b><span class="q">Search the directory, see Available, Pencilled or Booked, and send a hold.</span><span class="go">Search crew <span aria-hidden="true">→</span></span></button>'
       : '<button class="ppc" data-passport><span class="part">Crew passport</span><b>Filled in once</b><span class="q">Bank, UTR, NI, address, next of kin, vegetarian. On 3 jobs this month.</span><span class="tag ok">Findable</span></button>') + "</div>";
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

/* ---------- the producer's job: award to advance, crew and start packs, the unit wrap, sign-off, pay run, client extras, permits, call sheet versions, rights ---------- */
/* One sample job, kept with the rest of the sample data so every step can be tried and undone with Reset. */
function pjSample() {
  var t = today(), sh = iso(addDays(t, 1));
  var C = [["c1", "Ana Reyes", "1st AC, focus puller", "Self-employed", 340, [1, 1, 1]], ["c2", "Priya Kaur", "2nd AC, clapper loader", "Self-employed", 20, [1, 0, 1]], ["c3", "Sam Carter", "Gaffer", "Self-employed", 205, [1, 1, 1]], ["c4", "Leon Brooks", "Spark", "Self-employed", 120, [1, 1, 0]], ["c5", "Kit Morgan", "Sound recordist", "PAYE", 260, [1, 1, 1]], ["c6", "Jo Fenn", "Key grip", "Loan-out", 160, [0, 1, 1]], ["c7", "Mia Okafor", "HMU artist", "Self-employed", 300, [1, 1, 1]], ["c8", "Ade Cole", "Runner", "PAYE", 80, [1, 1, 1]]];
  return {
    name: "Canal promo", client: "Brightside", brand: "Fieldwear", accounts: "accounts@brightside.example", budget: 84000, shoot: sh, days: 2, terms: "APA", split: 50, payDays: 30, pshoot: iso(addDays(t, 24)),
    award: null, crew: C.map(function (c) { return { id: c[0], n: c[1], grade: c[2], pay: c[3], h: c[4], email: first(c[1]).toLowerCase() + "@crew.example", sp: c[5], call: "", wrap: "" }; }),
    unit: { call: "07:00", lunch: "1 hour", wrap: "19:00" }, ask: null, wrap: null, sign: {}, run: null,
    extras: [{ id: "x1", what: "Dusk shot on the canal: 2 hrs overtime for the unit, plus the drone", amt: 5220, st: "sent" }],
    permits: ["child", "isl", "parks"],
    cs: [{ v: 1, by: "Producer", f: { Call: "07:00", Location: "Canal, E2", "Unit base": "Wharf Rd car park", Lunch: "13:00", Weather: "Dry, 14°" } }, { v: 2, by: "PM", f: { Call: "07:00", Location: "Canal, E2", "Unit base": "Studio 3 car park", Lunch: "13:00", Weather: "Dry, 14°" } }, { v: 3, by: "Coordinator", f: { Call: "06:30", Location: "Canal, E2, then Studio 3", "Unit base": "Studio 3 car park", Lunch: "12:30", Weather: "Showers after 3" } }],
    rights: [{ id: "r1", what: "Talent usage, online, UK", ends: iso(addDays(t, 27)) }, { id: "r2", what: "Music licence, social cutdowns", ends: iso(addDays(t, 85)) }, { id: "r3", what: "Drone footage, all media", ends: "" }]
  };
}
function pj() { if (!D.pj) D.pj = pjSample(); return D.pj; }
function pjSave() { demoSave(); }
function crewRate(c) { return cardRate(cardOf(pj().terms === "Bectu" ? "TV drama" : "APA"), c.grade) || 0; }
function pjTerms() { return pj().terms === "Bectu" ? "TV drama" : "APA"; }
function crewDay(c, wrapAt) { var u = pj().unit; return calcDay({ date: pj().shoot, call: c.call || u.call, wrap: wrapAt || c.wrap || u.wrap, lunch: u.lunch, lunchAt: "12:30", type: "Normal" }, { rate: crewRate(c), terms: pjTerms(), grade: c.grade }); }
function nextFri() { var d = addDays(today(), 1); while (d.getDay() !== 5) d = addDays(d, 1); return d; }
function ics(name, ev) {
  var f = function (d) { return iso(d).replace(/-/g, ""); };
  saveFile(name + ".ics", "text/calendar", "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Eltio Systems//EN\r\n" + ev.map(function (e) { return "BEGIN:VEVENT\r\nUID:" + uid() + "@eltio.systems\r\nDTSTAMP:" + f(today()) + "T000000Z\r\nDTSTART;VALUE=DATE:" + f(e[0]) + "\r\nDTEND;VALUE=DATE:" + f(addDays(e[0], 1)) + "\r\nSUMMARY:" + e[1].replace(/[,;]/g, " ") + "\r\nEND:VEVENT\r\n"; }).join("") + "END:VCALENDAR\r\n");
}
function copyText(t) { try { navigator.clipboard.writeText(t); } catch (e) {} }

/* The job, step by step, on the producer's home. */
function pjCard() {
  var P = pj(), w = signRows().filter(function (x) { return x.st !== "ok"; }).length, missing = P.crew.filter(function (c) { return c.sp.indexOf(0) >= 0; }).length;
  var due = permitList().filter(function (p) { return daysBetween(today(), p.by) <= 7; }).length, ext = P.extras.filter(function (x) { return x.st === "sent"; }).length, soon = P.rights.filter(function (r) { return r.ends && daysBetween(today(), parse(r.ends)) <= 30; }).length;
  var steps = [
    ["award", "Award", P.award ? "Advance " + money(P.award.adv) + " drafted" : "Forward the award email", P.award ? "ok" : "amb", "The advance and balance invoices drafted, with the dates in your calendar."],
    ["crew", "Crew and start packs", P.crew.length + " booked · " + (missing ? missing + " packs missing" : "all packs in"), missing ? "amb" : "ok", "Grades and rates from the " + P.terms + " card. Missing bank, UTR or right to work chased in one email."],
    ["permits", "Permits", due ? due + " to apply for this week" : "On track", due ? "amb" : "ok", "Each council's lead time, counted back from the shoot."],
    ["cs", "Call sheet", "V" + P.cs.length + " · one link", "", "Every version kept, what changed lit up, sent by WhatsApp or email."],
    ["wrap", "On the day", P.wrap ? "Wrapped " + P.wrap.at : P.ask ? "Ask sent, run to " + P.ask.to : "Tap wrap once for everyone", P.wrap ? "ok" : "", "Every crew member's overtime at their own grade, from one wrap time."],
    ["sign", "Sign-off", P.wrap ? (w ? w + " waiting" : "All signed off") : "After wrap", P.wrap && w ? "amb" : P.wrap ? "ok" : "", "Timesheet and invoice approved together, in your order."],
    ["run", "Pay run", P.run ? "Paid " + nice(P.run.paid) : P.wrap ? "Ready to check" : "After sign-off", P.run ? "ok" : P.wrap ? "amb" : "", "Every crew invoice checked against the timesheet. The odd one out gets a polite query."],
    ["extras", "Client extras", ext ? ext + " waiting for " + P.client : "None waiting", ext ? "amb" : "ok", "Cost it, send it, the agency says yes in one tap. Logged to the balance invoice."],
    ["rights", "Rights and usage", soon ? soon + " ending within 30 days" : "Nothing ending soon", soon ? "amb" : "ok", "End dates with reminders at 90, 60 and 30 days, and the renewal quote drafted."]
  ];
  return '<div class="diary pjc"><div class="dia-h"><span class="part">Run the job · ' + esc(P.name) + " for " + esc(P.client) + '</span><span class="q">' + esc(P.terms) + " terms · " + money(P.budget) + '</span></div><div class="rows">' + steps.map(function (s) {
    return '<button class="row" data-pj="' + s[0] + '"><span>' + esc(s[1]) + '</span><span class="tag' + (s[3] ? " " + s[3] : "") + '">' + esc(s[2]) + '</span><span class="sub">' + esc(s[4]) + "</span></button>";
  }).join("") + "</div></div>";
}

/* Award: forward the email, the advance and balance are drafted. */
var AWARD_MAIL = "Hi both,\n\nGreat news, Fieldwear have approved the Canal promo. Please go ahead at the quoted £84,000, two shoot days. Our payment terms are 50% on award and the balance 30 days after delivery.\n\nInvoices to accounts@brightside.example, PO BS-2291.\n\nThanks,\nRosa, Brightside";
function awardSheet() {
  var P = pj();
  if (P.award) return '<div class="top"><span class="q">Award · ' + esc(P.client) + '</span><span class="tag ok">Drafted</span></div><h2>' + esc(P.name) + ", " + money(P.budget) + '.</h2><div class="rows">' +
    '<div class="row static"><span>Advance, ' + P.split + '% <span class="q">· due ' + nice(P.award.advDue) + '</span></span><span class="tag ink">' + money(P.award.adv) + '</span></div>' +
    '<div class="row static"><span>Balance <span class="q">· due ' + nice(P.award.balDue) + (extrasOk() ? ", with " + money(extrasOk()) + " of approved extras" : "") + '</span></span><span class="tag">' + money(P.award.bal + extrasOk()) + "</span></div></div>" +
    '<div class="acts"><button class="btn solid" data-pjinv="adv">See the advance</button><button class="btn" data-pjinv="bal">See the balance</button><button class="btn" data-pjmail="award">Draft the email to accounts</button><button class="btn" data-pjics="award">Add dates to calendar</button></div>' +
    '<p class="q">Drafts only. You send the email, and the invoices go into your accounts app as drafts once it\'s linked.</p><button class="lnk" data-pjreset="award">Start the award again</button>';
  return '<div class="top"><span class="q">Award</span><span class="q">Forward it, or paste it here</span></div><h2>The award email.</h2><div class="field"><label for="aw-mail">The email from the agency</label><textarea id="aw-mail" rows="8">' + esc(AWARD_MAIL) + '</textarea></div><div class="acts"><button class="btn solid wide" data-pjread>Read the award</button></div><p class="q">In the pilot you forward it to your job\'s own address. Here, paste any award email and it picks out the budget, the split and the terms.</p>';
}
function readAward() {
  var P = pj(), t = val("aw-mail"), m = /£\s?([\d,]+(?:\.\d+)?)(k)?/i.exec(t), sp = /(\d{2})\s?%/.exec(t), pd = /balance\s+(\d{1,3})\s+days/i.exec(t) || /(\d{1,3})\s+days/i.exec(t), ac = /[\w.+-]+@[\w-]+\.[\w.]+/.exec(t), po = /PO[\s:#-]*([A-Z0-9-]{3,})/i.exec(t);
  if (m) P.budget = num(m[1]) * (m[2] ? 1000 : 1);
  if (sp) P.split = +sp[1]; if (pd) P.payDays = +pd[1]; if (ac) P.accounts = ac[0]; if (po) P.po = po[1];
  var adv = Math.round(P.budget * P.split / 100), sh = parse(P.shoot);
  P.award = { at: iso(today()), adv: adv, bal: P.budget - adv, advDue: iso(addDays(today(), 7)), balDue: iso(addDays(sh, P.days - 1 + 14 + P.payDays)) };
  pjSave(); openSheet(awardSheet()); render();
  banner("Read it: " + money(P.budget) + ", " + P.split + "% on award. Advance and balance drafted.");
}
function extrasOk() { return pj().extras.filter(function (x) { return x.st === "ok"; }).reduce(function (a, x) { return a + x.amt; }, 0); }
function pjInvoice(k) {
  var P = pj(), A = P.award, adv = k === "adv", n = (D.settings.invoicePrefix || "INV") + "-" + today().getFullYear() + (adv ? "-031" : "-032");
  invoicePDF({ number: n, issued: A.at, due: adv ? A.advDue : A.balDue, client: P.client, contact: P.accounts, amount: adv ? A.adv : A.bal + extrasOk(), notes: P.name + " for " + P.brand + (adv ? ", " + P.split + "% advance on award" : ", balance on delivery" + (extrasOk() ? " (includes " + money(extrasOk()) + " of approved extras)" : "")) + (P.po ? ", PO " + P.po : "") });
}

/* Crew list, grades on the job's card, start packs chased. */
var SPN = ["Bank", "UTR", "Right to work"];
function crewSheet() {
  var P = pj(), card = P.terms === "Bectu" ? "Bectu" : "APA", miss = P.crew.filter(function (c) { return c.sp.indexOf(0) >= 0; });
  return '<div class="top"><span class="q">Crew · ' + esc(P.name) + '</span><span class="q">' + P.crew.length + ' booked</span></div><h2>Your crew list.</h2>' +
    '<div class="field"><span class="lab">Terms for this job</span>' + pills("pjterms", ["APA", "Bectu"], P.terms) + '<span class="q">Every rate below comes from the ' + card + " card for that grade.</span></div>" +
    '<div class="rows">' + P.crew.map(function (c) {
      return '<div class="row static sg-r">' + av({ ini: inis(c.n), h: c.h }) + '<span class="sg-t">' + esc(c.n) + ", " + esc(c.grade) + '<span class="q">' + (crewRate(c) ? money(crewRate(c)) + " a day" : "own deal") + " · " + esc(c.pay) + '</span><span class="chips">' + SPN.map(function (n, i) { return '<i class="' + (c.sp[i] ? "" : "on") + '">' + (c.sp[i] ? "✓ " : "") + n + "</i>"; }).join("") + "</span></span></div>";
    }).join("") + "</div>" +
    '<div class="part">Add someone</div><div class="grid2">' + field("cr-n", "Name", "", "text", "e.g. Tom West") + '<div class="field"><label for="cr-g">Grade</label><select id="cr-g">' + gradeOpts(card, "") + "</select></div></div>" +
    '<div class="acts">' + (miss.length ? '<button class="btn solid" data-pjchase>Chase ' + miss.length + " missing start pack" + (miss.length > 1 ? "s" : "") + "</button>" : '<span class="tag ok">Every start pack is in</span>') + '<button class="btn" data-pjadd>Add to the crew</button><button class="btn" data-findcrew>Find crew</button></div>' +
    '<p class="q">Start packs fill from each person\'s crew passport. Right to work and status checks stay with a named person on your side.</p>';
}
function chaseStartPacks() {
  var miss = pj().crew.filter(function (c) { return c.sp.indexOf(0) >= 0; });
  compose(miss.map(function (c) { return c.email; }).join(","), pj().name + ": your start pack", "Hi all,\n\nBefore " + dayLabel(pj().shoot) + ", could you fill in what's missing from your start pack? It takes a minute from the link.\n\n" + miss.map(function (c) { return "- " + first(c.n) + ": " + SPN.filter(function (n, i) { return !c.sp[i]; }).join(", "); }).join("\n") + "\n\nThanks!" + sign());
}

/* Permits counted back from the shoot. Lead times differ by council, so each is checked against theirs. */
var PERMITS = [["child", "Child performance licence", 21, 0], ["city", "City of London, most filming", 21, 0], ["isl", "Islington, bay suspensions", 10, 1], ["parks", "Royal Parks, with a drone", 7, 1], ["wm", "Westminster, small unit", 3, 1]];
function permitList() { var P = pj(), sh = parse(P.pshoot || P.shoot); return PERMITS.filter(function (p) { return P.permits.indexOf(p[0]) >= 0; }).map(function (p) { return { k: p[0], n: p[1], by: p[3] ? workBack(sh, p[2]) : addDays(sh, -p[2]), lead: p[2] + (p[3] ? " working days" : " days") }; }); }
function permitSheet() {
  var P = pj();
  return '<div class="top"><span class="q">Permits · ' + esc(P.name) + '</span><span class="q">Counted back from the shoot</span></div><h2>When to apply.</h2>' + field("pm-date", "Location shoot date", P.pshoot, "date") +
    '<div class="rows">' + PERMITS.map(function (p) {
      var on = P.permits.indexOf(p[0]) >= 0, by = p[3] ? workBack(parse(P.pshoot), p[2]) : addDays(parse(P.pshoot), -p[2]), left = daysBetween(today(), by);
      return '<button class="row" data-pjpermit="' + p[0] + '"><span><i class="ck' + (on ? " on" : "") + '"></i>' + esc(p[1]) + '</span><span class="tag' + (on ? (left < 0 ? " amb" : left <= 7 ? " amb" : " ok") : "") + '">' + (on ? (left < 0 ? "Late, call them" : "Apply by " + esc(dayLabel(iso(by)))) : "Not needed") + '</span><span class="sub">' + p[2] + (p[3] ? " working days" : " days") + " before the shoot</span></button>";
    }).join("") + '</div><div class="acts"><button class="btn solid" data-pjics="permits">Add the deadlines to calendar</button></div><p class="q">Lead times are a guide. Each council and park sets its own, so check theirs before you rely on a date. Applications stay with a named person.</p>';
}

/* Call sheet: every version kept, what changed lit up, one link. */
var CSF = ["Call", "Location", "Unit base", "Lunch", "Weather"];
function callSheet(vi) {
  var P = pj(), p = isProd(), i = vi == null ? P.cs.length - 1 : vi, V = P.cs[i], prev = P.cs[i - 1], ch = prev ? CSF.filter(function (k) { return prev.f[k] !== V.f[k]; }).length : 0;
  return '<div class="top"><span class="q">' + esc(P.name) + " · " + esc(dayLabel(P.shoot)) + '</span><span class="tag' + (ch ? " amb" : "") + '">V' + V.v + (ch ? " · " + ch + " changed" : "") + "</span></div><h2>Tomorrow's call sheet.</h2>" +
    '<div class="pills">' + P.cs.map(function (x, k) { return '<button type="button" class="pill" data-csv="' + k + '" aria-pressed="' + (k === i) + '">V' + x.v + "</button>"; }).join("") + "</div>" +
    '<div class="sum ot">' + CSF.map(function (k) { var was = prev && prev.f[k] !== V.f[k] ? prev.f[k] : ""; return '<div><span class="q">' + k + "</span><span>" + (was ? '<s class="q">' + esc(was) + "</s> " : "") + '<span' + (was ? ' class="late"' : "") + ">" + esc(V.f[k]) + "</span></span></div>"; }).join("") + "</div>" +
    '<p class="q">V' + V.v + " posted by the " + esc(V.by.toLowerCase()) + ". " + (P.cs.length > 1 ? "Every version is kept. " : "") + "Opened by 29 of 32 crew.</p>" +
    (p ? '<div class="acts"><button class="btn solid" data-pjv4>Make V' + (P.cs.length + 1) + '</button><button class="btn" data-pjsend="wa">Send by WhatsApp</button><button class="btn" data-pjsend="mail">Send by email</button><button class="btn" data-editlink>Share an edit link</button></div>' : '<div class="acts"><button class="btn solid wide" data-close>Got it</button></div>');
}
function csForm() {
  var P = pj(), L = P.cs[P.cs.length - 1].f;
  return "<h2>V" + (P.cs.length + 1) + " of the call sheet.</h2><p class=\"q\">Change what's changed. Everyone gets the same link, with the changes lit up.</p>" + CSF.map(function (k, i) { return field("cs-" + i, k, L[k]); }).join("") + '<div class="acts"><button class="btn solid wide" data-pjpost>Post it</button></div>';
}
function csText() { var P = pj(), V = P.cs[P.cs.length - 1], prev = P.cs[P.cs.length - 2]; return P.name + ", " + dayLabel(P.shoot) + ", call sheet V" + V.v + "\n" + CSF.map(function (k) { return k + ": " + V.f[k] + (prev && prev.f[k] !== V.f[k] ? " (changed)" : ""); }).join("\n") + "\nhttps://eltio.systems/cs/canal-promo"; }

/* On the day: ask the unit to run on, then one wrap for everyone. */
function wrapSheet() {
  var P = pj(), u = P.unit, base = P.crew.reduce(function (a, c) { return a + crewDay(c).total; }, 0);
  if (P.wrap) return '<div class="top"><span class="q">' + esc(P.name) + " · day 1</span><span class=\"tag ok\">Wrapped " + esc(P.wrap.at) + '</span></div><h2>Everyone\'s day, done.</h2><div class="rows">' + P.crew.map(function (c) {
    var r = crewDay(c, P.wrap.at), ot = r.lines.filter(function (l) { return /Overtime|After midnight|Early call/.test(l[0]); });
    return '<div class="row static"><span>' + esc(c.n) + ' <span class="q">· ' + esc(c.grade) + '</span></span><span class="tag ink">' + pounds(r.total) + '</span><span class="sub">' + esc(ot.length ? ot.map(function (l) { return l[0]; }).join(", ") : "No overtime") + "</span></div>";
  }).join("") + '</div><div class="sum"><div><span class="q">Unit total</span><span>' + pounds(P.crew.reduce(function (a, c) { return a + crewDay(c, P.wrap.at).total; }, 0)) + '</span></div><div><span class="q">Overtime in it</span><span>' + pounds(P.crew.reduce(function (a, c) { return a + crewDay(c, P.wrap.at).total; }, 0) - base) + '</span></div></div><div class="acts"><button class="btn solid" data-pj="sign">Go to sign-off</button><button class="lnk" data-pjreset="wrap">Undo the wrap</button></div>';
  return '<div class="top"><span class="q">' + esc(P.name) + " · day 1 · " + esc(P.terms) + ' terms</span><span class="q">' + P.crew.length + ' crew</span></div><h2>The unit, on one clock.</h2>' +
    '<div class="grid2">' + field("u-call", "Unit call", u.call, "time") + field("u-wrap", "Scheduled wrap", u.wrap, "time") + "</div>" +
    '<div class="part">Ask to run on</div><div class="grid2">' + field("u-to", "Run to", P.ask ? P.ask.to : hm(tm(u.wrap) + 60), "time") + '<div class="field"><span class="lab">What it costs</span><b id="u-cost" class="big">' + pounds(askCost(P.ask ? P.ask.to : hm(tm(u.wrap) + 60))) + "</b></div></div>" +
    (P.ask ? '<div class="rows"><div class="row static"><span>' + (P.crew.length - 2) + " in, 2 want a word</span><span class=\"tag amb\">" + esc(P.ask.to) + '</span><span class="sub">Kit Morgan and Ade Cole asked to talk to the producer.</span></div></div><div class="acts"><button class="btn" data-pjtalk>Message the two</button></div>' : '<div class="acts"><button class="btn" data-pjask>Send the ask to all ' + P.crew.length + "</button></div>") +
    '<div class="part">Wrap</div>' + field("u-at", "Unit wrap", P.ask ? P.ask.to : u.wrap, "time") + '<div class="acts"><button class="btn solid wide" data-pjwrap>Tap wrap for everyone</button></div><p class="q">Each person\'s overtime is worked out at their own grade on the ' + esc(P.terms) + " card. Anyone released early or called early can be changed after.</p>";
}
function askCost(to) { var P = pj(); return P.crew.reduce(function (a, c) { return a + crewDay(c, to).total - crewDay(c).total; }, 0); }

/* Sign-off rows: from the wrap once there is one, the sample ones before. */
function chainOf(c) { var g = c.grade, d = /AC|DIT|Camera/.test(g) ? "Camera HoD" : /Spark|Gaffer|Best boy/.test(g) ? "Gaffer" : /grip/i.test(g) ? "Key grip" : "PM"; return d === "PM" ? ["PM"] : [d, "PM"]; }
function signRows() {
  var P = D.pj;
  if (!P || !P.wrap) return SIGN;
  return P.crew.map(function (c) { var s = P.sign[c.id] || (P.sign[c.id] = { st: "", step: 0, note: "" }), r = crewDay(c, P.wrap.at); return { id: c.id, who: c.n, role: c.grade, days: "Day 1, wrap " + P.wrap.at, amt: Math.round(r.total * 100) / 100, h: c.h, pay: c.pay, chain: chainOf(c), st: s.st, step: s.step, note: s.note, email: c.email }; });
}
function signCard() {
  var R = signRows(), w = R.filter(function (x) { return x.st !== "ok"; }).length;
  return '<div class="diary sign"><div class="dia-h"><span class="part">Sign-offs · timesheet and invoice together</span><span class="tag' + (w ? " amb" : " ok") + '">' + (w ? w + " waiting" : "All signed off") + "</span></div>" + R.slice(0, 4).map(signRow).join("") + (R.length > 4 ? '<button class="lnk" data-pj="sign">See all ' + R.length + "</button>" : "") + '<p class="q">The order is set once per job. Everyone in the chain gets one link and one tap, no login.</p></div>';
}
function signRow(x) {
  var step = x.step == null ? x.chain.length : x.step, atYou = step >= x.chain.length;
  return '<div class="sg-r">' + av({ ini: inis(x.who), h: x.h }) + '<span class="sg-t">' + esc(x.who) + ", " + esc(x.role) + '<span class="q">' + esc(x.days) + " · invoice " + pounds(x.amt) + " drafted from the timesheet</span>" + chainHtml(x.chain.concat(["You"]), x.st === "ok" ? x.chain.length + 1 : step) + (x.note ? '<span class="q">Your note: ' + esc(x.note) + "</span>" : "") + "</span>" +
    (x.st === "ok" ? '<span class="tag ok">Approved and invoiced</span>' : x.st === "back" ? '<span class="sg-a"><span class="tag amb">Sent back</span><button class="btn sm" data-signfix="' + x.id + '">They fixed it</button></span>' : !atYou ? '<span class="sg-a"><button class="btn sm" data-signstep="' + x.id + '">Tap as ' + esc(x.chain[step]) + '</button><button class="btn sm ghost" data-nudge="' + esc(x.chain[step]) + '">Nudge</button></span>' : '<span class="sg-a"><button class="btn sm solid" data-signok="' + x.id + '">Approve both</button><button class="btn sm" data-signback="' + x.id + '">Send back</button></span>') + "</div>";
}
function signSheet() { var R = signRows(); return "<h2>Sign-off.</h2><p class=\"q\">Each person's timesheet and the invoice made from it, approved together.</p>" + R.map(signRow).join("") + '<div class="acts"><button class="btn solid wide" data-close>Done</button></div>'; }
function signItem(id) { var P = D.pj; if (P && P.wrap && P.sign[id]) return P.sign[id]; return SIGN.find(function (x) { return x.id === id; }); }
function backSheet(id) { var x = signRows().find(function (r) { return r.id === id; }); return "<h2>Send back to " + esc(first(x.who)) + ".</h2><p class=\"q\">Say what to fix. Their invoice waits until it's done.</p>" + '<div class="field"><textarea id="sb-note" rows="3">Could you check the wrap time? The unit wrapped at ' + esc(D.pj && D.pj.wrap ? D.pj.wrap.at : "20:00") + ".</textarea></div>" + '<div class="acts"><button class="btn solid wide" data-signbackgo="' + esc(id) + '">Send it back</button></div>'; }

/* Pay run: every crew invoice read and checked against its signed timesheet. */
function runRows() {
  var P = pj();
  return P.crew.map(function (c, i) { var r = crewDay(c, P.wrap.at), t = Math.round(r.total * 100) / 100, claim = i === 3 ? t + 26.25 : t; return { c: c, t: t, claim: claim, paye: c.pay === "PAYE", ok: Math.abs(claim - t) < 0.5 }; });
}
function runSheet() {
  var P = pj();
  if (!P.wrap) return "<h2>Pay run.</h2><p class=\"q\">It fills in once the unit has wrapped and the timesheets are signed off. Start with the wrap.</p><div class=\"acts\"><button class=\"btn solid wide\" data-pj=\"wrap\">Go to the wrap</button></div>";
  var R = runRows(), inv = R.filter(function (x) { return !x.paye; }), tot = inv.reduce(function (a, x) { return a + (x.ok ? x.claim : x.t); }, 0), q = R.filter(function (x) { return !x.ok; });
  return '<div class="top"><span class="q">Pay run · ' + esc(P.name) + '</span><span class="tag' + (P.run ? " ok" : "") + '">' + (P.run ? "Paid " + nice(P.run.paid) : "Friday " + nice(iso(nextFri()))) + "</span></div><h2>" + inv.length + " invoices, " + (inv.length - q.length) + " match.</h2>" +
    '<div class="rows">' + R.map(function (x) { return '<div class="row static"><span>' + esc(x.c.n) + ' <span class="q">· ' + (x.paye ? "PAYE, to the payroll bureau" : "invoiced " + pounds(x.claim)) + "</span></span>" + (x.paye ? '<span class="tag">Payroll</span>' : x.ok ? '<span class="tag ok">Matches</span>' : '<span class="tag amb">' + pounds(x.claim - x.t) + ' over</span><span class="sub">Their invoice has 30 more minutes of overtime than the signed timesheet. <button class="lnk" data-pjquery="' + x.c.id + '">Draft the query</button></span>') + "</div>"; }).join("") + "</div>" +
    '<div class="sum"><div><span class="q">To pay Friday</span><span>' + pounds(tot) + '</span></div><div><span class="q">Held for a query</span><span>' + pounds(q.reduce(function (a, x) { return a + x.claim - x.t; }, 0)) + "</span></div></div>" +
    '<div class="acts">' + (P.run ? '<button class="btn" data-pjpayfile>Download the payment file again</button>' : '<button class="btn solid" data-pjrun>Approve the run</button>') + '<button class="btn" data-export="payroll">Payroll bureau CSV</button></div><p class="q">Systems never moves money. The payment file goes into your bank\'s bulk payments, and PAYE crew go to your payroll bureau.</p>';
}
function payFile() { var rows = [["Name", "Sort code", "Account", "Amount", "Reference"]].concat(runRows().filter(function (x) { return !x.paye; }).map(function (x) { return [x.c.n, "from passport", "from passport", (Math.round(x.t * 100) / 100).toFixed(2), "CANAL " + x.c.id.toUpperCase()]; })); saveFile(stamp() + "-pay-run.csv", "text/csv", rows.map(function (r) { return r.join(","); }).join("\n")); }

/* Client extras: cost it, the agency approves in one tap, it rides on the balance invoice. */
function extrasSheet() {
  var P = pj();
  return '<div class="top"><span class="q">Extras · ' + esc(P.client) + '</span><span class="q">' + money(extrasOk()) + ' approved</span></div><h2>The client says yes in one tap.</h2><div class="rows">' + P.extras.map(function (x) {
    return '<div class="row static"><span>' + esc(x.what) + '</span><span class="tag' + (x.st === "ok" ? " ok" : x.st === "no" ? "" : x.st === "sent" ? " amb" : " ink") + '">' + pounds(x.amt) + " · " + (x.st === "ok" ? "approved" : x.st === "no" ? "declined" : x.st === "sent" ? "waiting" : "draft") + '</span><span class="sub">' + (x.st === "sent" ? '<button class="lnk" data-pjagency="' + x.id + '">See what ' + esc(P.client) + ' sees</button> · <button class="lnk" data-pjcopy="' + x.id + '">Copy their link</button>' : x.st === "" ? '<button class="lnk" data-pjsendx="' + x.id + '">Send to ' + esc(P.client) + "</button>" : x.st === "ok" ? "On the balance invoice" : "Not on the invoice") + "</span></div>";
  }).join("") + '</div><div class="part">Cost a new one</div><div class="grid2">' + field("ex-what", "What it is", "", "text", "e.g. A second location, half day") + field("ex-amt", "Cost (£)", "", "number", "", ' inputmode="decimal"') + '</div><div class="acts"><button class="btn solid" data-pjaddx>Add it</button></div><p class="q">The agency opens one link, no login, and taps Approve. It\'s logged against the budget and added to the balance invoice.</p>';
}
function agencySheet(id) {
  var P = pj(), x = P.extras.find(function (e) { return e.id === id; });
  return '<div class="top"><span class="q">What ' + esc(P.client) + ' sees · no login</span><span class="q">eltio.systems/a/' + esc(id) + "</span></div><h2>" + esc(P.name) + ": an extra to approve.</h2>" + '<div class="sum"><div><span class="q">What</span><span>' + esc(x.what) + '</span></div><div><span class="q">Cost</span><span>' + pounds(x.amt) + ' + VAT</span></div><div><span class="q">Asked by</span><span>' + esc(D.settings.name || "The producer") + "</span></div></div>" +
    '<div class="acts"><button class="btn solid" data-pjapprove="' + id + '">Approve</button><button class="btn" data-pjdecline="' + id + '">Not this time</button></div><p class="q">Approving adds it to the balance invoice for ' + esc(P.brand) + ".</p>";
}

/* Rights and usage: end dates with reminders, and the renewal quote drafted. */
function rightsSheet() {
  var P = pj();
  return '<div class="top"><span class="q">Rights and usage · ' + esc(P.name) + '</span><span class="q">' + P.rights.length + ' tracked</span></div><h2>What ends when.</h2><div class="rows">' + P.rights.map(function (r) {
    var left = r.ends ? daysBetween(today(), parse(r.ends)) : null;
    return '<div class="row static"><span>' + esc(r.what) + '</span><span class="tag' + (left != null && left <= 30 ? " amb" : "") + '">' + (r.ends ? "Ends " + nice(r.ends) : "In perpetuity") + '</span><span class="sub">' + (r.ends ? '<span class="chips">' + [90, 60, 30].map(function (n) { return '<i class="' + (left <= n ? "on" : "") + '">' + n + "</i>"; }).join("") + "</span>" + (left <= 90 ? ' <button class="lnk" data-pjrenew="' + r.id + '">Draft the renewal quote</button>' : "") : "No reminder needed") + "</span></div>";
  }).join("") + '</div><div class="part">Add one</div><div class="grid2">' + field("rt-what", "What it covers", "", "text", "e.g. Talent usage, TV, UK") + field("rt-end", "Ends", "", "date") + '</div><div class="acts"><button class="btn solid" data-pjaddr>Add it</button></div><p class="q">In the pilot the end dates are read from the signed contracts in your Drive.</p>';
}
var PJ_SHEETS = { award: awardSheet, crew: crewSheet, permits: permitSheet, cs: function () { return callSheet(); }, wrap: wrapSheet, sign: signSheet, run: runSheet, extras: extrasSheet, rights: rightsSheet };

/* Producer clicks. Returns true when it handled the tap. */
function pjClick(b) {
  var d = b.dataset, P = mode === "demo" && isProd() ? pj() : null; if (!P) return false;
  if (d.pj) { openSheet(PJ_SHEETS[d.pj]()); return true; }
  if (b.hasAttribute("data-pjread")) { readAward(); return true; }
  if (d.pjinv) { pjInvoice(d.pjinv); return true; }
  if (d.pjmail === "award") { compose(P.accounts, P.name + ": advance invoice", "Hi,\n\nThanks for the award. Attached is our invoice for the " + P.split + "% advance on " + P.name + ", " + money(P.award.adv) + " plus VAT" + (P.po ? ", PO " + P.po : "") + ", due " + nice(P.award.advDue) + ".\n\nThe balance follows on delivery." + sign()); return true; }
  if (d.pjics === "award") { ics("canal-promo-dates", [[parse(P.award.advDue), P.name + ": advance due"], [parse(P.shoot), P.name + ": shoot day 1"], [parse(P.award.balDue), P.name + ": balance due"]]); banner("Calendar file saved. Open it to add the three dates."); return true; }
  if (d.pjics === "permits") { ics("canal-promo-permits", permitList().map(function (p) { return [p.by, "Apply: " + p.n]; })); banner("Calendar file saved with " + permitList().length + " deadlines."); return true; }
  if (d.pjreset) { P[d.pjreset] = null; if (d.pjreset === "wrap") { P.sign = {}; P.run = null; P.ask = null; } pjSave(); openSheet(PJ_SHEETS[d.pjreset]()); render(); return true; }
  if (d.pjpermit) { var i = P.permits.indexOf(d.pjpermit); if (i >= 0) P.permits.splice(i, 1); else P.permits.push(d.pjpermit); var nd = val("pm-date"); if (nd) P.pshoot = nd; pjSave(); openSheet(permitSheet()); render(); return true; }
  if (b.hasAttribute("data-pjchase")) { chaseStartPacks(); banner("Drafted to everyone with something missing. Nothing sends until you tap send."); return true; }
  if (b.hasAttribute("data-pjadd")) { var nm = val("cr-n"), gr = val("cr-g"); if (!nm || !gr) { banner("Add a name and a grade."); return true; } P.crew.push({ id: "c" + uid().slice(-5), n: nm, grade: gr, pay: "Self-employed", h: (nm.length * 47) % 360, email: first(nm).toLowerCase() + "@crew.example", sp: [0, 0, 0], call: "", wrap: "" }); pjSave(); openSheet(crewSheet()); render(); banner(first(nm) + " is on the crew list. Their start pack link is drafted."); return true; }
  if (d.csv) { openSheet(callSheet(+d.csv)); return true; }
  if (b.hasAttribute("data-pjv4") || b.hasAttribute("data-postv")) { openSheet(csForm()); return true; }
  if (b.hasAttribute("data-pjpost")) { var L = P.cs[P.cs.length - 1].f, f = {}; CSF.forEach(function (k, i) { f[k] = val("cs-" + i) || L[k]; }); P.cs.push({ v: P.cs.length + 1, by: "Producer", f: f }); pjSave(); openSheet(callSheet()); render(); banner("V" + P.cs.length + " posted. Everyone's link now shows it, with what changed lit up."); return true; }
  if (d.pjsend === "wa") { window.open("https://wa.me/?text=" + encodeURIComponent(csText()), "_blank", "noopener"); return true; }
  if (d.pjsend === "mail") { compose(P.crew.map(function (c) { return c.email; }).join(","), P.name + ": call sheet V" + P.cs.length, csText() + sign()); return true; }
  if (b.hasAttribute("data-pjask")) { P.unit.call = val("u-call") || P.unit.call; P.unit.wrap = val("u-wrap") || P.unit.wrap; P.ask = { to: val("u-to") || hm(tm(P.unit.wrap) + 60) }; pjSave(); openSheet(wrapSheet()); render(); banner("Sent to all " + P.crew.length + " at once. " + (P.crew.length - 2) + " said yes."); return true; }
  if (b.hasAttribute("data-pjtalk")) { compose("kit@crew.example,ade@crew.example", P.name + ": running on", "Hi both,\n\nYou asked for a word about running to " + P.ask.to + ". Can you grab me by the monitor in five?" + sign()); return true; }
  if (b.hasAttribute("data-pjwrap")) { P.unit.call = val("u-call") || P.unit.call; P.unit.wrap = val("u-wrap") || P.unit.wrap; var at = val("u-at") || P.unit.wrap; P.wrap = { at: at }; P.sign = {}; P.run = null; pjSave(); openSheet(wrapSheet()); render(); banner("Wrapped at " + at + ". " + P.crew.length + " timesheets drafted, each at their own grade."); return true; }
  if (d.signstep) { var s1 = signItem(d.signstep); s1.step = (s1.step || 0) + 1; pjSave(); render(); if ($("sheet").classList.contains("on")) openSheet(signSheet()); return true; }
  if (d.signok) { var s2 = signItem(d.signok); s2.st = "ok"; pjSave(); render(); if ($("sheet").classList.contains("on") && $("sheet").querySelector(".sg-r")) openSheet(signSheet()); banner("Timesheet and invoice approved. Into Friday's pay run."); return true; }
  if (d.signback) { openSheet(backSheet(d.signback)); return true; }
  if (d.signbackgo) { var s3 = signItem(d.signbackgo), r3 = signRows().find(function (x) { return x.id === d.signbackgo; }); s3.st = "back"; s3.note = val("sb-note"); pjSave(); closeSheet(); render(); compose(r3.email || "", P.name + ": your timesheet", "Hi " + first(r3.who) + ",\n\n" + s3.note + sign()); banner("Sent back to " + first(r3.who) + " with your note."); return true; }
  if (d.signfix) { var s4 = signItem(d.signfix); s4.st = ""; s4.note = ""; pjSave(); render(); return true; }
  if (d.pjquery) { var qc = P.crew.find(function (c) { return c.id === d.pjquery; }); compose(qc.email, P.name + ": your invoice", "Hi " + first(qc.n) + ",\n\nThanks for your invoice. It has 30 minutes more overtime than your signed timesheet, which has the unit wrap at " + P.wrap.at + ". Could you check and resend? The rest is going in Friday's run." + sign()); return true; }
  if (b.hasAttribute("data-pjrun")) { P.run = { paid: iso(nextFri()) }; pjSave(); payFile(); openSheet(runSheet()); render(); banner("Run approved. The payment file is saved for your bank's bulk payments."); return true; }
  if (b.hasAttribute("data-pjpayfile")) { payFile(); return true; }
  if (b.hasAttribute("data-pjaddx")) { var w2 = val("ex-what"), a2 = num(val("ex-amt")); if (!w2 || !a2) { banner("Add what it is and what it costs."); return true; } P.extras.push({ id: "x" + uid().slice(-4), what: w2, amt: a2, st: "" }); pjSave(); openSheet(extrasSheet()); render(); return true; }
  if (d.pjsendx) { P.extras.find(function (x) { return x.id === d.pjsendx; }).st = "sent"; pjSave(); openSheet(extrasSheet()); render(); banner("Sent to " + P.client + ". They get one link, no login."); return true; }
  if (d.pjcopy) { copyText("https://eltio.systems/a/" + d.pjcopy); banner("Their link is copied."); return true; }
  if (d.pjagency) { openSheet(agencySheet(d.pjagency)); return true; }
  if (d.pjapprove || d.pjdecline) { var ex = P.extras.find(function (x) { return x.id === (d.pjapprove || d.pjdecline); }); ex.st = d.pjapprove ? "ok" : "no"; pjSave(); openSheet(extrasSheet()); render(); banner(d.pjapprove ? P.client + " approved it. " + money(ex.amt) + " is on the balance invoice." : P.client + " said not this time. Nothing is invoiced."); return true; }
  if (d.pjrenew) { var rr = P.rights.find(function (x) { return x.id === d.pjrenew; }); compose(P.accounts, P.name + ": renewing " + rr.what.toLowerCase(), "Hi,\n\n" + rr.what + " on " + P.name + " ends on " + nice(rr.ends) + ". If you'd like to keep running it, we can renew for another year. I'll send the quote over." + sign()); return true; }
  if (b.hasAttribute("data-pjaddr")) { var rw = val("rt-what"); if (!rw) { banner("Say what it covers."); return true; } P.rights.push({ id: "r" + uid().slice(-4), what: rw, ends: val("rt-end") }); pjSave(); openSheet(rightsSheet()); render(); return true; }
  return false;
}

/* Bank statement: a CSV export from any UK bank, matched to unpaid invoices by amount or invoice number. No bank login. */
var BANKROWS = [];
function csvRows(t) {
  return String(t).split(/\r?\n/).filter(function (l) { return l.trim(); }).map(function (l) { var out = [], cur = "", q = false; for (var i = 0; i < l.length; i++) { var ch = l[i]; if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map(function (x) { return x.trim(); }); });
}
/* Money in only: the first column that reads as a positive amount, the longest text as the description, any date as the date. */
function readStatement(t) {
  var R = csvRows(t); if (!R.length) return [];
  var head = R[0].map(function (h) { return h.toLowerCase(); }), hasHead = head.some(function (h) { return /amount|paid in|credit|description|date/.test(h); }), rows = hasHead ? R.slice(1) : R;
  var ai = head.findIndex(function (h) { return /paid in|credit|money in/.test(h); }); if (ai < 0) ai = head.findIndex(function (h) { return /amount|value/.test(h); });
  return rows.map(function (r) {
    var amt = ai >= 0 ? num(r[ai]) : r.map(num).find(function (n) { return n > 0; }) || 0, dt = r.find(function (x) { return /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(x); }) || "", desc = r.slice().sort(function (a, b) { return b.length - a.length; })[0] || "";
    return { amt: amt, date: dt, desc: desc };
  }).filter(function (x) { return x.amt > 0; });
}
function matchInv(row) { var open = outstanding(); return open.find(function (v) { return v.number && row.desc.toUpperCase().indexOf(String(v.number).toUpperCase()) >= 0; }) || open.find(function (v) { return Math.abs(num(v.amount) - row.amt) < 0.01; }) || null; }
function sampleStatement() { var o = outstanding().slice(0, 2); return "Date,Description,Paid in,Paid out\n" + o.map(function (v, i) { return iso(addDays(today(), -i - 1)) + "," + (i ? "FASTER PAYMENT " + String(v.client).toUpperCase() : String(v.client).toUpperCase() + " " + v.number) + "," + num(v.amount).toFixed(2) + ","; }).join("\n") + "\n" + iso(addDays(today(), -3)) + ",TFL TRAVEL CHARGE,,12.80\n" + iso(addDays(today(), -4)) + ",REFUND KIT HIRE,45.00,"; }
function bankSheet() {
  var M = BANKROWS.map(function (r) { return { r: r, v: matchInv(r) }; }), hit = M.filter(function (x) { return x.v; });
  return '<div class="top"><span class="q">Bank statement · CSV</span><span class="q">No bank login</span></div><h2>Who\'s paid you.</h2><p class="q">Download a CSV statement from your bank\'s app or website and drop it here. Payments in are matched to your unpaid invoices. Nothing leaves this device.</p>' +
    '<div class="field"><label for="bk-file">Your statement (.csv)</label><input id="bk-file" type="file" accept=".csv,text/csv"></div>' +
    (BANKROWS.length ? '<div class="part">' + BANKROWS.length + " payments in · " + hit.length + ' match</div><div class="rows">' + M.map(function (x, i) {
      return '<div class="row static"><span>' + esc(x.r.desc) + ' <span class="q">· ' + esc(x.r.date) + '</span></span><span class="tag' + (x.v ? " ok" : "") + '">' + pounds(x.r.amt) + '</span><span class="sub">' + (x.v ? "Matches " + esc(x.v.number) + ", " + esc(x.v.client) + ' <button class="lnk" data-bankpaid="' + i + '">Mark paid</button>' : "No unpaid invoice for this amount") + "</span></div>";
    }).join("") + "</div>" + (hit.length ? '<div class="acts"><button class="btn solid" data-bankall>Mark ' + hit.length + " paid</button></div>" : "") : '<div class="acts"><button class="btn" data-banksample>Try a sample statement</button></div>');
}
function markPaid(v, date) {
  var d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : iso(today());
  if (mode === "demo") { v.paid = d; demoSave(); return Promise.resolve(); }
  var o = Object.assign({}, v, { paid: d }); return upsert("Invoices", o);
}

/* Receipts: snap it, put it on the job, and it goes on that job's invoice. */
function receiptSheet() {
  var up = D.bookings.filter(function (b) { return b.status !== "Cancelled"; }).sort(function (a, b) { return a.start < b.start ? 1 : -1; }).slice(0, 12);
  return "<h2>Add a receipt.</h2><p class=\"q\">Snap it or pick the photo. Put it on a job and it's added to that job's invoice.</p>" +
    '<div class="field"><label for="rc-photo">Photo of the receipt</label><input id="rc-photo" type="file" accept="image/*" capture="environment"></div>' +
    '<div class="grid2">' + field("rc-item", "What for", "", "text", "e.g. Batteries, parking") + field("rc-amt", "Amount (£)", "", "number", "", ' inputmode="decimal"') + "</div>" +
    '<div class="field"><label for="rc-job">Job</label><select id="rc-job"><option value="">Not on a job</option>' + up.map(function (b) { return '<option value="' + esc(b.id) + '">' + esc((b.production || "Booking") + ", " + b.client + ", " + nice(b.start)) + "</option>"; }).join("") + "</select></div>" +
    field("rc-date", "Date", iso(today()), "date") + '<div class="acts"><button class="btn solid wide" data-rcsave>Add it</button></div><p class="q">The photo stays on your phone; the line is saved with your expenses and goes in the accountant pack.</p>';
}
function saveReceipt() {
  var amt = num(val("rc-amt")), item = val("rc-item"), f = $("rc-photo") && $("rc-photo").files[0];
  if (!amt || !item) { banner("Add what it was for and the amount."); return; }
  var o = { id: uid(), date: val("rc-date") || iso(today()), booking: val("rc-job"), item: item, amount: String(amt), notes: f ? "Receipt: " + f.name : "" };
  closeSheet();
  if (mode === "demo") { D.expenses.push(o); demoSave(); render(); banner("Added" + (o.booking ? " to that job's invoice" : "") + "."); return; }
  upsert("Expenses", o).then(function () { banner("Added" + (o.booking ? " to that job's invoice" : "") + "."); });
}
function bankClick(b) {
  var d = b.dataset;
  if (d.link === "csv") { openSheet(bankSheet()); return true; }
  if (b.hasAttribute("data-banksample")) { BANKROWS = readStatement(sampleStatement()); openSheet(bankSheet()); return true; }
  if (d.bankpaid) { var r = BANKROWS[+d.bankpaid], v = matchInv(r); if (v) markPaid(v, r.date).then(function () { BANKROWS.splice(+d.bankpaid, 1); render(); openSheet(bankSheet()); banner(v.number + " marked paid."); }); return true; }
  if (b.hasAttribute("data-bankall")) { var n = 0, P = Promise.resolve(); BANKROWS.slice().forEach(function (r) { var v = matchInv(r); if (v) { n++; P = P.then(function () { return markPaid(v, r.date); }); } }); P.then(function () { BANKROWS = BANKROWS.filter(function (r) { return !matchInv(r); }); render(); openSheet(bankSheet()); banner(n + " invoices marked paid."); }); return true; }
  if (b.hasAttribute("data-addreceipt")) { openSheet(receiptSheet()); return true; }
  if (b.hasAttribute("data-rcsave")) { saveReceipt(); return true; }
  return false;
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
    gradeField("s-grade", "Your grade", cardOf(s.work === "TV and film" ? "TV drama" : "APA"), s.grade || "", "s-rate", s.rate) +
    '<div class="grid2">' + field("s-rate", "Day rate (£)", s.rate, "number", "650", ' inputmode="numeric"') + field("s-terms", "Payment terms (days)", s.terms || "30", "number", "30", ' inputmode="numeric"') + "</div>" +
    '<div class="grid2">' + field("s-tax", "Put aside for tax (%)", s.tax || "25", "number", "25", ' inputmode="numeric"') + field("s-mileage", "Mileage (pence a mile)", s.mileage || "45", "number", "45", ' inputmode="numeric"') + "</div>" +
    '<div class="part">On your invoices</div>' + field("s-addr", "Your address", s.addr, "text", "Street, town, postcode") +
    '<div class="grid2">' + field("s-bank", "Bank details", s.bank, "text", "Sort code and account number") + field("s-vat", "VAT number", s.vat, "text", "Only if you're registered") + "</div>" +
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
  return '<div class="hd"><div class="hd-l"><span class="part">' + nice(iso(today())) + (mode === "demo" ? " · sample data" + (job() ? ", as " + esc(job().n) : "") : "") + "</span><h1>" + greet() + (s.name ? ", " + esc(first(s.name)) : "") + ".</h1></div>" + (mode === "demo" ? "" : '<span class="q">' + (busy ? "Saving…" : "") + "</span>") + "</div>" +
    dashTop() +
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
  return '<div class="top"><span>Money</span><span class="db-l"><button class="lnk" data-addreceipt>Add a receipt</button><button class="lnk" data-addinvoice>New invoice</button><button class="lnk" data-link="csv">Match bank</button></span></div><h2>What you\'re owed.</h2>' +
    '<div class="part">Last 12 months</div>' + barChart(false) +
    '<div class="kpis"><div class="kpi"><b>' + money(owed()) + '</b><span class="q">Owed, ' + open.length + " invoice" + (open.length === 1 ? "" : "s") + '</span></div><div class="kpi' + (od ? " amb" : "") + '"><b>' + money(od) + '</b><span class="q">Overdue</span></div></div>' +
    '<div class="two"><div class="stack"><div class="part">Unpaid</div><div class="rows">' + (open.length ? open.map(invoiceRow).join("") : '<p class="empty">Nothing outstanding.</p>') + '</div><div class="part">Paid</div><div class="rows">' + (paid.length ? paid.slice(0, 10).map(invoiceRow).join("") : '<p class="empty">None yet.</p>') + "</div></div>" +
    '<div class="stack"><div class="part">How fast they pay</div>' + slowPayers() + '<div class="part">Tax and VAT</div><div class="sum"><div><span class="q">Paid since 6 April</span><span>' + money(paidThisYear()) + '</span></div><div><span class="q">Put aside (' + esc(s.tax || 25) + '%)</span><span>' + money(paidThisYear() * num(s.tax || 25) / 100) + '</span></div><div><span class="q">Invoiced, last 12 months</span><span>' + money(r12) + ' of £90,000</span></div></div><div class="bar"><i style="width:' + Math.min(100, r12 / 900) + '%"></i></div><p class="q">£90,000 in 12 months is the VAT line. This is a guide, not tax advice.</p></div></div>';
}
function more() {
  var s = D.settings;
  return '<div class="top"><span>You</span><span></span></div><h2>' + esc(s.name || "Your account") + "</h2>" +
    '<div class="sum"><div><span class="q">Signed in</span><span>' + (mode === "demo" ? "Sample data, this browser only" : esc(G.email || "Google")) + '</span></div><div><span class="q">Your data</span><span>' + (mode === "demo" ? "Not saved to Drive" : "In your Google Drive") + '</span></div><div><span class="q">Grade</span><span>' + esc(s.grade || "Not picked yet") + '</span></div><div><span class="q">Day rate</span><span>' + money(num(s.rate)) + '</span></div><div><span class="q">Terms</span><span>' + esc(s.terms || 30) + ' days</span></div><div><span class="q">Email</span><span>' + esc(s.mail || "Gmail") + '</span></div><div><span class="q">Agent</span><span>' + (s.hasAgent === "Yes" ? esc(s.agent || "Yes") : "None") + "</span></div></div>" +
    (roleKey() === "Producer" ? '<div class="part">For producers</div><div class="rows"><button class="row" data-features><span>Everything Systems runs</span><span class="q">26</span><span class="sub">Advance invoices, crew checks, permits, rights, deliverables, the books.</span></button><button class="row" data-check><span>Check a crew day</span><span class="q">APA or Bectu</span><span class="sub">See what a crew member is owed and whether their invoice is over or under.</span></button></div>' : "") +
    '<div class="part">Linked</div><div class="rows"><button class="row" data-links=""><span>Accounts, bank and calendar</span><span class="q">' + (linked().length ? linked().length + " linked" : "None yet") + '</span><span class="sub">Xero, QuickBooks or FreeAgent, a CSV from your bank, Google or Apple Calendar.</span></button><button class="row" data-onbon><span>Set up your dashboard</span><span class="q">Checklist</span><span class="sub">Put the setup steps back on your home screen.</span></button></div>' +
    '<div class="rows"><button class="row" data-rates><span>Rate cards, every grade</span><span class="q">APA · Bectu</span><span class="sub">Pick your grade and the day rate fills in. Change it to your own deal any time.</span></button></div>' +
    '<div class="acts"><button class="btn" data-tour>How it works</button><button class="btn" data-editsetup>Edit details</button>' + (mode === "google" && G.sheetId ? '<a class="btn" target="_blank" rel="noopener" href="https://docs.google.com/spreadsheets/d/' + esc(G.sheetId) + '">Open my sheet</a>' : "") + "</div>" +
    '<div class="part">On your phone</div><p class="q">iPhone: open this page in Safari, tap Share, then Add to Home Screen. Android: tap the menu, then Install app. Sign in with the same Google account and it matches your laptop.</p>' +
    '<div class="part">Where your work lives</div>' + (roleKey() === "Producer"
      ? '<div class="rows"><div class="row static"><span>Hosted for you</span><span class="tag ok">Nothing to manage</span><span class="sub">Your jobs, crew and money run on Eltio\'s servers. No sheets to set up or look after, and everyone on the job sees the same thing.</span></div></div>'
      : '<div class="rows"><div class="row static"><span>Your work dashboard</span><span class="tag ok">In your Google Drive</span><span class="sub">Bookings, holds, invoices and timesheets live in your own Google Drive and feed this app. You never need to open Drive. Eltio can only see files this app made, and keeps no copy.</span></div></div>') +
    '<div class="part">Export</div><div class="exp"><button class="btn" data-export="csv">CSV</button><button class="btn" data-export="xls">Excel</button><button class="btn" data-export="pdf">PDF</button><button class="btn" data-export="acct">For your accountant</button>' + (roleKey() === "Producer" ? '<button class="btn" data-export="payroll">Payroll bureau</button>' : "") + '</div><p class="q">For your accountant, Xero or FreeAgent. Excel has a tab each for bookings, invoices, expenses and timesheet days. Nothing is ever sent for you: drafts open in your own email.</p>' +
    '<div class="acts"><button class="btn" data-signout>' + (mode === "demo" ? "Leave sample data" : "Sign out") + "</button>" + (mode === "demo" ? '<button class="lnk" data-resetdemo>Reset sample data</button>' : "") + "</div>" + '<p class="q"><a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a></p>';
}

/* ---------- export: CSV, Excel and PDF, made in the browser ---------- */
function rowsOf(t) { return (D[KEY[t]] || []).map(function (r) { return TABS[t].map(function (c) { return r[c] == null ? "" : String(r[c]); }); }); }
function saveFile(name, type, body) { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
function stamp() { return "eltio-systems-" + iso(today()); }
/* The invoice itself, made from the timesheet: lines per day, kit, miles, VAT if registered, bank details. */
function invoiceLines(v) {
  var b = D.bookings.find(function (x) { return x.id === v.booking; }), L = [];
  if (b && daysFor(b.id).length) sheetCalc(b).days.forEach(function (o) { o.r.lines.forEach(function (l) { L.push([dayLabel(o.x.date) + ", " + l[0], l[1]]); }); });
  else if (b) { L.push([(b.grade ? b.grade + ", " : "") + b.production + ", " + Math.max(1, num(b.days)) + " day" + (num(b.days) > 1 ? "s" : "") + " at " + money(num(b.rate)), num(b.rate) * Math.max(1, num(b.days))]); if (num(b.kit)) L.push(["Kit, " + Math.max(1, num(b.days)) + " day" + (num(b.days) > 1 ? "s" : ""), num(b.kit) * Math.max(1, num(b.days))]); }
  else L.push([v.notes || "Services", num(v.amount)]);
  if (b) (D.expenses || []).filter(function (e) { return e.booking === b.id; }).forEach(function (e) { L.push(["Expense: " + e.item, num(e.amount)]); });
  return { b: b, L: L, net: L.reduce(function (a, l) { return a + l[1]; }, 0) };
}
function invoicePDF(v) {
  var s = D.settings, I = invoiceLines(v), vat = s.vat ? I.net * 0.2 : 0;
  var row = function (a, c, k) { return "<tr" + (k ? ' class="' + k + '"' : "") + "><td>" + esc(a) + '</td><td class="n">' + pounds(c) + "</td></tr>"; };
  var h = '<div class="hd"><div><h1>Invoice</h1><p>' + esc(v.number) + "<br>Issued " + nice(v.issued) + "<br>Due " + nice(v.due) + (I.b && I.b.po ? "<br>PO " + esc(I.b.po) : "") + '</p></div><div class="me"><b>' + esc(s.trading || s.name || "Your name") + "</b><br>" + esc(s.addr || "Your address") + (s.vat ? "<br>VAT " + esc(s.vat) : "") + "</div></div>" +
    '<p class="to"><span>To</span><br><b>' + esc(v.client || "Client") + "</b><br>" + esc(v.contact || "") + "</p>" + (I.b ? "<p>" + esc(I.b.production) + ", " + esc(niceRange(I.b.start, I.b.end)) + (I.b.terms ? ", " + esc(TERMN[I.b.terms] || I.b.terms) : "") + "</p>" : "") +
    "<table>" + I.L.map(function (l) { return row(l[0], l[1]); }).join("") + row("Subtotal", I.net, "t") + (s.vat ? row("VAT at 20%", vat) : "") + row("Total due", I.net + vat, "g") + "</table>" +
    '<p class="pay"><span>Pay to</span><br>' + esc(s.bank || "Add your bank details in You, Edit details") + "<br>Reference " + esc(v.number) + "</p><p class=\"f\">Payment within " + esc(s.terms || 30) + " days. Late payments may be charged interest under the Late Payment of Commercial Debts (Interest) Act 1998.</p>";
  var w = window.open("", "_blank"); if (!w) { banner("Allow pop-ups to see the invoice."); return; }
  w.document.write('<!doctype html><meta charset="utf-8"><title>' + esc(v.number) + '</title><style>body{font:13px/1.45 -apple-system,Helvetica,Arial,sans-serif;margin:48px;color:#111;max-width:760px}.hd{display:flex;justify-content:space-between;gap:24px}h1{font-size:30px;font-weight:500;margin:0 0 8px}.me{text-align:right}.to span,.pay span{color:#777;font-size:11px;text-transform:uppercase;letter-spacing:.06em}.to{margin:36px 0 8px}table{width:100%;border-collapse:collapse;margin:24px 0}td{padding:8px 0;border-bottom:1px solid #e5e5e5}.n{text-align:right;white-space:nowrap}.t td{border-top:1px solid #111}.g td{font-weight:600;font-size:15px;border-bottom:0}.f{color:#777;font-size:11px;margin-top:32px}</style>' + h + "<script>onload=function(){print()}<\/script>");
}
/* Everything your accountant asks for, in one workbook: income by month, invoices, expenses, mileage. */
function exportAccountant() {
  var s = D.settings, t = today(), y0 = new Date(t.getMonth() > 3 || (t.getMonth() === 3 && t.getDate() >= 6) ? t.getFullYear() : t.getFullYear() - 1, 3, 6), inYr = function (d) { d = parse(d); return d && d >= y0; };
  var inv = D.invoices.filter(function (v) { return inYr(v.issued); }), exp = (D.expenses || []).filter(function (e) { return inYr(e.date); }), miles = (D.days || []).filter(function (d) { return inYr(d.date) && num(d.miles); });
  var months = {}; inv.forEach(function (v) { var d = parse(v.issued), k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); months[k] = (months[k] || 0) + num(v.amount); });
  var x = function (v) { return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  var sheet = function (n, rows) { return '<Worksheet ss:Name="' + n + '"><Table>' + rows.map(function (r) { return "<Row>" + r.map(function (v) { v = v == null ? "" : String(v); var isN = v !== "" && !isNaN(v) && !/^0\d/.test(v); return '<Cell><Data ss:Type="' + (isN ? "Number" : "String") + '">' + x(v) + "</Data></Cell>"; }).join("") + "</Row>"; }).join("") + "</Table></Worksheet>"; };
  var tot = inv.reduce(function (a, v) { return a + num(v.amount); }, 0), te = exp.reduce(function (a, e) { return a + num(e.amount); }, 0), tm = miles.reduce(function (a, d) { return a + num(d.miles); }, 0);
  var ws = sheet("Summary", [["Tax year from", iso(y0)], ["Name", s.trading || s.name], ["Invoiced", Math.round(tot * 100) / 100], ["Paid", inv.filter(function (v) { return v.paid; }).reduce(function (a, v) { return a + num(v.amount); }, 0)], ["Expenses", Math.round(te * 100) / 100], ["Business miles", tm], ["Mileage at " + (s.mileage || 45) + "p", Math.round(tm * num(s.mileage || 45)) / 100], [], ["Month", "Invoiced"]].concat(Object.keys(months).sort().map(function (k) { return [k, Math.round(months[k] * 100) / 100]; }))) +
    sheet("Invoices", [TABS.Invoices].concat(inv.map(function (v) { return TABS.Invoices.map(function (c) { return v[c]; }); }))) +
    sheet("Expenses", [TABS.Expenses].concat(exp.map(function (e) { return TABS.Expenses.map(function (c) { return e[c]; }); }))) +
    sheet("Mileage", [["Date", "Job", "Miles"]].concat(miles.map(function (d) { var b = D.bookings.find(function (z) { return z.id === d.booking; }); return [d.date, b ? b.production : "", d.miles]; })));
  saveFile(stamp() + "-for-your-accountant.xls", "application/vnd.ms-excel", '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' + ws + "</Workbook>");
}
/* Approved timesheets for a payroll bureau. Systems never runs payroll itself. */
function exportPayroll() { var rows = [["Name", "Grade", "Engagement", "Job", "Days", "Gross", "Approved by", "Status"]].concat(signRows().map(function (x) { return [x.who, x.role, x.pay, "Canal promo", x.days, x.amt, x.chain.concat(["Producer"]).join(" > "), x.st === "ok" ? "Approved" : "Waiting"]; })); saveFile(stamp() + "-payroll-bureau.csv", "text/csv", rows.map(function (r) { return r.map(function (v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }).join("\n")); }
function exportCSV() { var q = function (v) { return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; saveFile(stamp() + "-bookings.csv", "text/csv", [TABS.Bookings].concat(rowsOf("Bookings")).map(function (r) { return r.map(q).join(","); }).join("\n")); }
/* Excel 2003 XML: opens in Excel, Numbers and Google Sheets, one worksheet per tab. */
function exportXLS() {
  var x = function (v) { return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  var ws = Object.keys(KEY).map(function (t) { return '<Worksheet ss:Name="' + t + '"><Table>' + [TABS[t]].concat(rowsOf(t)).map(function (r) { return "<Row>" + r.map(function (v) { var n = v !== "" && !isNaN(v) && !/^0\d/.test(v); return '<Cell><Data ss:Type="' + (n ? "Number" : "String") + '">' + x(v) + "</Data></Cell>"; }).join("") + "</Row>"; }).join("") + "</Table></Worksheet>"; }).join("");
  saveFile(stamp() + ".xls", "application/vnd.ms-excel", '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' + ws + "</Workbook>");
}
/* PDF: a clean summary page, saved with the browser's own Save as PDF. */
function exportPDF() {
  var up = D.bookings.slice().sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  var h = '<h1>' + esc(D.settings.name || "Systems") + '</h1><p>Exported ' + nice(iso(today())) + '</p><h2>Bookings</h2><table><tr><th>Date</th><th>Job</th><th>For</th><th>Status</th><th>Rate</th></tr>' + up.map(function (b) { return "<tr><td>" + niceRange(b.start, b.end) + "</td><td>" + esc(b.production) + "</td><td>" + esc(b.client) + "</td><td>" + esc(b.status) + "</td><td>£" + esc(b.rate) + "</td></tr>"; }).join("") + '</table><h2>Invoices</h2><table><tr><th>Number</th><th>For</th><th>Amount</th><th>Due</th><th>Paid</th></tr>' + D.invoices.map(function (v) { return "<tr><td>" + esc(v.number) + "</td><td>" + esc(v.client) + "</td><td>" + money(num(v.amount)) + "</td><td>" + nice(v.due) + "</td><td>" + (v.paid ? nice(v.paid) : "") + "</td></tr>"; }).join("") + "</table>";
  var w = window.open("", "_blank"); if (!w) { banner("Allow pop-ups to save the PDF."); return; }
  w.document.write('<!doctype html><meta charset="utf-8"><title>' + stamp() + '</title><style>body{font:13px/1.4 -apple-system,Helvetica,Arial,sans-serif;margin:32px;color:#111}h1{font-size:24px;margin:0}h2{font-size:15px;margin:28px 0 8px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd}th{font-weight:500;color:#666}</style>' + h + "<script>onload=function(){print()}<\/script>");
  w.document.close();
}

/* ---------- forms ---------- */
function bookingForm(b) {
  var s = D.settings, isNew = !b; b = b || { id: uid(), start: iso(addDays(today(), 7)), end: "", client: "", production: "", contact: "", status: "First hold", rate: s.rate || "", grade: s.grade || "", days: "1", agent: "", notes: "", terms: s.work === "TV and film" ? "TV drama" : ["Director", "Producer"].indexOf(roleKey()) >= 0 ? "Flat day" : "APA", kit: "", extra: "", po: "" };
  var acts = isNew ? "" : '<div class="acts">' + (isHold(b) ? '<button class="btn" data-draft="hold" data-id="' + b.id + '">Ask to confirm</button>' : "") + (b.status === "Confirmed" && !isDone(b) ? '<button class="btn" data-draft="confirm" data-id="' + b.id + '">Send booking confirmation</button>' : "") + (b.status === "Confirmed" && b.terms !== "Flat day" ? '<button class="btn' + (isDone(b) ? " solid" : "") + '" data-timesheet="' + b.id + '">Timesheet' + (daysFor(b.id).length ? ", " + daysFor(b.id).length + " day" + (daysFor(b.id).length > 1 ? "s" : "") : "") + "</button>" : "") + (isDone(b) && !invoiced(b.id) && !isPaye(b) ? '<button class="btn" data-invoicefor="' + b.id + '">Make the invoice</button>' : "") + "</div>";
  return '<h2>' + (isNew ? "Add a booking" : esc(b.production || "Booking")) + "</h2>" + acts + infoBlock(b, true) + (isHold(b) && !isNew ? '<div class="part">Message the producer</div><div class="field"><textarea id="bk-msg" rows="2" placeholder="Ask a question or nudge them to confirm"></textarea></div><div class="acts"><button class="btn" data-sendmsg="' + b.id + '">Draft the message</button></div>' : "") + '<input type="hidden" id="b-id" value="' + esc(b.id) + '">' +
    '<div class="grid2">' + field("b-production", "What is it?", b.production, "text", "Commercial, music video…") + field("b-client", "Who for?", b.client, "text", "Production company") + "</div>" +
    field("b-contact", "Their email", b.contact, "email", "producer@company.com") +
    '<div class="grid2">' + field("b-start", "First day", b.start, "date") + field("b-end", "Last day (if more than one)", b.end, "date") + "</div>" +
    '<div class="field"><span class="lab">Status</span>' + pills("status", STATUSES, b.status) + "</div>" +
    gradeField("b-grade", "Your grade on this job", cardOf(b.terms || "APA"), b.grade || s.grade || "", "b-rate", b.rate) +
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
  v = v || { id: uid(), booking: b ? b.id : "", number: nextInvoiceNumber(), client: b ? b.client : "", contact: b ? b.contact : "", amount: b ? String(Math.round((bookingValue(b) + (D.expenses || []).filter(function (e) { return e.booking === b.id; }).reduce(function (t, e) { return t + num(e.amount); }, 0)) * 100) / 100) : "", issued: iso(t), due: iso(addDays(t, num(s.terms) || 30)), paid: "", notes: b ? b.production + ", " + niceRange(b.start, b.end) + (b.po ? ", " + b.po : "") + (daysFor(b.id).length ? ", from your timesheet" : "") : "" };
  var od = !v.paid && parse(v.due) && parse(v.due) < t;
  var acts = isNew ? "" : '<div class="acts">' + (od ? '<button class="btn solid" data-draft="chase" data-id="' + v.id + '">Write the chase</button>' : "") + (!v.paid ? '<button class="btn" data-markpaid="' + v.id + '">Mark as paid</button>' : '<button class="btn" data-markunpaid="' + v.id + '">Mark as unpaid</button>') + '<button class="btn" data-invpdf="' + v.id + '">See the invoice</button><button class="btn" data-draft="invoice" data-id="' + v.id + '">Email it</button></div>';
  return "<h2>" + (isNew ? "New invoice" : esc(v.number)) + "</h2>" + acts + '<input type="hidden" id="v-id" value="' + esc(v.id) + '"><input type="hidden" id="v-booking" value="' + esc(v.booking) + '">' +
    '<div class="grid2">' + field("v-number", "Invoice number", v.number) + field("v-amount", "Amount (£)", v.amount, "number", "", ' inputmode="decimal"') + "</div>" +
    '<div class="grid2">' + field("v-client", "Who to", v.client, "text", "Production company") + field("v-contact", "Their email", v.contact, "email", "accounts@company.com") + "</div>" +
    '<div class="grid2">' + field("v-issued", "Sent", v.issued, "date") + field("v-due", "Due", v.due, "date") + "</div>" +
    (v.paid ? field("v-paid", "Paid on", v.paid, "date") : '<input type="hidden" id="v-paid" value="">') +
    field("v-notes", "What for", v.notes, "text", "Optional") +
    '<p class="q">Systems makes the invoice itself, from your timesheet. No accounts app needed.</p>' +
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
    gradeField("c-grade", "Their grade", "APA", "Spark", "c-rate", "457") +
    '<div class="grid2">' + field("c-rate", "Their day rate (£)", "457", "number", "", ' inputmode="numeric"') + field("c-claim", "They invoiced for this day (£)", "", "number", "", ' inputmode="decimal"') + "</div>" +
    '<div class="field"><span class="lab">Terms</span>' + pills("cterms", TERMS, "APA") + "</div>" + field("c-date", "Date", iso(today()), "date") +
    '<div class="grid2">' + field("c-call", "Call", "07:00", "time") + field("c-wrap", "Wrap", "20:30", "time") + "</div>" +
    '<div class="field"><span class="lab">Lunch</span>' + pills("clunch", ["1 hour", "30 min", "None"], "1 hour") + "</div>" + field("c-lunchAt", "Lunch called at", "", "time") +
    '<div class="grid2">' + field("c-kit", "Kit (£)", "", "number", "0", ' inputmode="numeric"') + field("c-miles", "Miles", "", "number", "0", ' inputmode="numeric"') + "</div>" +
    '<div id="ccalc"></div><div class="acts"><button class="btn wide" data-close>Done</button></div>';
}
function liveCheck() {
  var c = $("ccalc"); if (!c) return;
  var b = { rate: val("c-rate"), grade: val("c-grade"), terms: picked("cterms") || "APA", kit: val("c-kit") }, r = calcDay({ date: val("c-date"), call: val("c-call"), wrap: val("c-wrap"), lunch: picked("clunch") || "1 hour", lunchAt: val("c-lunchAt"), miles: val("c-miles"), type: "Normal" }, b), claim = num(val("c-claim"));
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
/* Trying it with sample data: always show the way back to the site and the waitlist. */
function siteUrl() { return /\/preview\/systems-app\//.test(location.pathname) ? "../systems-site-v5/" : /^https?:/.test(location.protocol) && location.hostname !== "localhost" && !/claude/.test(location.hostname) ? "/" : "https://eltio.systems/"; }
function demoBar() { return '<div class="demobar"><span class="part">Sample data · nothing is saved</span><span class="db-l"><button class="lnk" data-switchjob>Switch job</button><a class="lnk" href="' + siteUrl() + '">Back to the site</a><a class="btn sm solid" href="' + siteUrl() + '#waitlist">Join the waitlist</a></span></div>'; }
function render() {
  paintSky();
  var signedIn = !!mode, ready = signedIn && D.settings && D.settings.name && (mode === "demo" || G.sheetId);
  $("main").innerHTML = (mode === "demo" && ready ? demoBar() : "") + (!signedIn ? welcome() : !ready ? setup() : VIEWS[S.tab]());
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
  s.name = val("s-name"); s.trading = val("s-trading"); var wasNew = !flag("eltio-systems-tour-1") || picked("role") !== roleKey(); s.role = picked("role") || s.role || ""; s.work = picked("work") || s.work || "Both"; s.grade = val("s-grade"); s.rate = val("s-rate"); s.terms = val("s-terms") || "30"; s.tax = val("s-tax") || "25"; s.mileage = val("s-mileage") || "45";
  s.addr = val("s-addr"); s.bank = val("s-bank"); s.vat = val("s-vat"); s.mail = picked("mail") || "Gmail"; s.hasAgent = picked("hasAgent") || "No"; s.agent = val("s-agent"); s.agentEmail = val("s-agentEmail"); s.invoicePrefix = s.invoicePrefix || "INV";
  if (!s.name) { banner("Add your name first."); return; }
  if (wasNew) { try { localStorage.removeItem("eltio-systems-tour-1"); } catch (e) {} }
  if (mode === "demo") { demoSave(); S.tab = "home"; render(); banner("Saved."); return; }
  var p = G.sheetId ? Promise.resolve() : (busy++, render(), createSheet("Eltio Systems" + (s.trading ? ": " + s.trading : "")).then(function () { busy--; }));
  p.then(function () { return change("Settings", function () {}); }).then(function () { S.tab = "home"; render(); banner("Saved to your Drive."); }).catch(function (e) { busy = Math.max(0, busy - 1); render(); banner("Couldn't save: " + (e.message || e)); });
}

document.addEventListener("click", function (e) {
  var b = e.target.closest("button,a"); if (!b) { if (e.target.id === "shade") closeSheet(); return; }
  var d = b.dataset;
  if (d.pick) { var g = b.parentNode; g.querySelectorAll(".pill").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); if (d.pick === "hasAgent") { var f = $("agentf"); if (f) f.hidden = d.v !== "Yes"; } if (d.pick === "terms") { var ef = $("extraf"), tn = $("termsnote"); if (ef) ef.hidden = d.v !== "TV drama"; if (tn) tn.textContent = TERMN[d.v]; swapCard("b-grade", cardOf(d.v)); } if (d.pick === "cterms") swapCard("c-grade", cardOf(d.v)); if (d.pick === "work") swapCard("s-grade", cardOf(d.v)); if (d.pick === "rcard") { openSheet(rateSheet(d.v)); return; } if (d.pick === "pjterms") { pj().terms = d.v; pjSave(); openSheet(crewSheet()); render(); return; } liveCalc(); return; }
  if (b.hasAttribute("data-close")) { closeSheet(); return; }
  if (pjClick(b) || bankClick(b)) return;
  if (b.hasAttribute("data-tournext")) { if (tourI < TOUR.length - 1) showTour(tourI + 1); else endTour(); return; }
  if (b.hasAttribute("data-tourback")) { showTour(Math.max(0, tourI - 1)); return; }
  if (b.hasAttribute("data-tourend")) { endTour(); return; }
  if (b.hasAttribute("data-tour")) { flag("sy-onb-tour", "1"); showTour(0); return; }
  if (b.hasAttribute("data-features")) { openSheet(featuresSheet()); return; }
  if (b.hasAttribute("data-check")) { openSheet(checkForm()); liveCheck(); return; }
  if (b.hasAttribute("data-starteroff")) { flag("eltio-systems-starter-off", "1"); render(); return; }
  if (b.hasAttribute("data-howphone")) { flag("eltio-systems-phone", "1"); openSheet('<h2>Put it on your home screen</h2><div class="sum"><div><span class="q">iPhone</span><span>Safari, Share, Add to Home Screen</span></div><div><span class="q">Android</span><span>Chrome menu, Install app</span></div></div><p class="q">Then sign in with the same Google account on your laptop. Both read the same sheet, so they always match.</p><div class="acts"><button class="btn solid wide" data-close>Done</button></div>'); render(); return; }
  if (d.job) { startJob(d.job); return; }
  if (d.jobf) { openSheet(jobSheet(+d.jobf)); return; }
  if (b.hasAttribute("data-callsheet")) { openSheet(callSheet()); return; }
  if (b.hasAttribute("data-findcrew")) { openSheet(findCrew()); return; }
  if (d.export === "acct") { exportAccountant(); banner("Saved: this tax year's invoices, expenses and mileage, ready for your accountant."); return; }
  if (d.invpdf) { invoicePDF(D.invoices.find(function (x) { return x.id === d.invpdf; })); return; }
  if (d.export === "payroll") { exportPayroll(); banner("Timesheets saved for your payroll bureau."); return; }
  if (d.export) { if (d.export === "csv") exportCSV(); else if (d.export === "xls") exportXLS(); else exportPDF(); if (d.export !== "pdf") banner(d.export === "csv" ? "Bookings saved as a CSV." : "Saved as an Excel workbook."); return; }
  if (b.hasAttribute("data-links")) { openSheet(linkSheet(b.getAttribute("data-links"))); return; }
  if (d.link) { var lk = LINKS.find(function (x) { return x.k === d.link; }); if (mode !== "demo") { banner(lk.n + " linking switches on once their review of Systems is done."); return; } var ls = linked(); ls.push(d.link); D.settings.links = ls.join("|"); demoSave(); render(); openSheet(linkSheet(LG)); banner(lk.n + " linked, with sample data."); return; }
  if (b.hasAttribute("data-onbopen")) { openSheet(onboard(true)); return; }
  if (b.hasAttribute("data-onboff")) { closeSheet(); flag("sy-onb-off", "1"); render(); banner("Hidden. Find it again in You, under Set up your dashboard."); return; }
  if (b.hasAttribute("data-onbon")) { try { localStorage.removeItem("sy-onb-off"); } catch (e) {} S.tab = "home"; render(); return; }
  if (b.hasAttribute("data-rates")) { openSheet(rateSheet()); return; }
  if (d.usegrade) { D.settings.grade = d.usegrade; var cr = cardRate(d.card, d.usegrade); if (cr) D.settings.rate = String(cr); if (mode === "demo") demoSave(); else change("Settings", function () {}); openSheet(rateSheet(d.card)); banner(d.usegrade + (cr ? ", £" + cr + " a day. Change it to your deal in Edit details." : ". Own deal: put your rate in Edit details.")); return; }
  if (d.pook || d.pono) { var po = POS.find(function (x) { return x.id === (d.pook || d.pono); }); po.st = d.pook ? "ok" : "no"; render(); banner(d.pook ? po.what + " approved. It's committed spend now." : "Sent back to " + po.who + "."); return; }
  if (b.hasAttribute("data-wrappro")) { flag("sy-wrapoffer", "1"); render(); banner("Crew Pro on, in sample data. Nothing is charged here."); return; }
  if (b.hasAttribute("data-wrapno")) { flag("sy-wrapoffer", "1"); render(); banner("No problem. We'll ask again at your next wrap."); return; }
  if (b.hasAttribute("data-signok")) { var so = SIGN.find(function (x) { return x.id === b.getAttribute("data-signok"); }); so.st = "ok"; render(); banner(so.who + "'s timesheet and invoice approved. Into the next pay run."); return; }
  if (b.hasAttribute("data-signback")) { var sb = SIGN.find(function (x) { return x.id === b.getAttribute("data-signback"); }); sb.st = "back"; render(); banner("Sent back to " + sb.who + " with a note. Their invoice waits until it's fixed."); return; }
  if (b.hasAttribute("data-offerinfo")) { openSheet(offerSheet(b.getAttribute("data-offerinfo"))); return; }
  if (b.hasAttribute("data-quick")) { var ta = $("of-msg"); if (ta) { ta.value = b.getAttribute("data-quick"); ta.focus(); } return; }
  if (b.hasAttribute("data-sendmsg")) { var m = $("bk-msg"); banner(m && m.value.trim() ? "Drafted. It's in your email drafts, ready to send." : "Write a message first."); return; }
  if (b.hasAttribute("data-addfield")) {
    var nm = (b.getAttribute("data-addfield") || ($("cf-new") || {}).value || "").trim().replace(/\|/g, " "); if (!nm) return;
    var keep = {}; document.querySelectorAll("#sheet .cf-in").forEach(function (el) { keep[el.getAttribute("data-cf")] = el.value; });
    D.settings.fields = myFields().filter(function (x) { return x !== nm; }).concat([nm]).join("|");
    if (mode === "demo") demoSave(); else change("Settings", function () {}).catch(function () {});
    var box = document.querySelector("#sheet .cf"); if (box) { var tmp = document.createElement("div"); tmp.innerHTML = cfRows(keep, true); box.replaceWith(tmp.firstChild); }
    if ($("cf-new")) $("cf-new").value = ""; if (b.getAttribute("data-addfield")) b.remove();
    var ni = Array.prototype.find.call(document.querySelectorAll("#sheet .cf-in"), function (el) { return el.getAttribute("data-cf") === nm; }); if (ni) ni.focus(); return;
  }
  if (b.hasAttribute("data-accept")) { takeOffer(b.getAttribute("data-accept"), "Confirmed"); return; }
  if (b.hasAttribute("data-pencil")) { takeOffer(b.getAttribute("data-pencil"), "Pencil"); return; }
  if (b.hasAttribute("data-decline")) { takeOffer(b.getAttribute("data-decline"), ""); return; }
  if (b.hasAttribute("data-offers")) { var of = document.querySelector(".offers"); if (of) of.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  if (b.hasAttribute("data-free")) { banner("Free on " + nice(b.getAttribute("data-free")) + ". Producers searching see you as Available."); return; }
  if (b.hasAttribute("data-nudge")) { banner("A nudge to " + b.getAttribute("data-nudge") + " is drafted. Nothing sends until you tap send."); return; }
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
    var o = { id: val("b-id"), start: start, end: end && end !== start ? end : "", client: val("b-client"), production: val("b-production"), contact: val("b-contact"), status: picked("status") || "First hold", rate: val("b-rate"), grade: val("b-grade"), days: days, agent: picked("viaAgent") === "Yes" ? "yes" : "", notes: val("b-notes"), terms: picked("terms") || "APA", kit: val("b-kit"), extra: picked("terms") === "TV drama" && picked("extra") === "Yes" ? "yes" : "", po: val("b-po") };
    var was = D.bookings.find(function (x) { return x.id === o.id; }); o.message = was ? was.message || "" : ""; o.fields = readFields(was && was.fields);
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
document.addEventListener("input", function (e) { var g = e.target.id && document.querySelector('select[data-rate="' + e.target.id + '"]'); if (g) gradeSync(g, false); if (e.target.closest && e.target.closest("#sheet")) liveCalc(); if (e.target.id === "u-to" && $("u-cost") && tm(e.target.value) != null) $("u-cost").textContent = pounds(askCost(e.target.value)); });
document.addEventListener("change", function (e) { if (e.target.matches && e.target.matches("select[data-rate]")) { gradeSync(e.target, true); liveCalc(); } if (e.target.id === "bk-file" && e.target.files[0]) { var fr = new FileReader(); fr.onload = function () { BANKROWS = readStatement(fr.result); var ls = linked(); if (ls.indexOf("csv") < 0) { ls.push("csv"); D.settings.links = ls.join("|"); if (mode === "demo") demoSave(); } openSheet(bankSheet()); banner(BANKROWS.length ? BANKROWS.length + " payments in read." : "No payments in found. Is it a CSV statement?"); }; fr.readAsText(e.target.files[0]); } if (e.target.id === "pm-date" && e.target.value && D.pj) { D.pj.pshoot = e.target.value; pjSave(); openSheet(permitSheet()); render(); } });
/* Pick up changes made on another device when the app comes back into view. */
document.addEventListener("visibilitychange", function () { if (!document.hidden) { paintSky(); refresh(); } });
setInterval(paintSky, 5 * 60 * 1000);
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () {});

/* Opened from the site as a job (?as=gaffer): straight into sample data for that job. */
var asJob = (location.search.match(/[?&]as=([a-z]+)/) || [])[1];
if (!(asJob && startJob(asJob))) render();
/* Returning user on this device: try a silent sign-in. If Google needs a tap, the welcome screen stays. */
try { if (CFG.googleClientId && localStorage.getItem("eltio-systems-signed-in")) startGoogle(true).catch(function () {}); } catch (e) {}
setInterval(function () { document.querySelectorAll(".callin").forEach(function (e) { e.textContent = callIn(); }); }, 30000);
})();
