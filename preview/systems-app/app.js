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
/* Read-only Gmail, asked for only when someone taps Scan. */
var GMAIL = "https://www.googleapis.com/auth/gmail.readonly";
function scopeNow() { return SCOPE + (G.wantGmail ? " " + GMAIL : "") + (G.wantCal ? " " + CAL : ""); }
var NO_GMAIL = "Google didn't let Systems read your email. Tap Scan again and tick the Gmail box on Google's screen.";
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
function demoSave() {
  if (mode === "google") { extrasSave(); return; }
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(D)); } catch (e) {}
}
/* Signed in: the bits that aren't sheet rows (your own pages, pinned and hidden tools, rows added to job pages) ride along in Settings as one JSON value. */
var extrasTimer = null;
function extrasSave() {
  clearTimeout(extrasTimer);
  extrasTimer = setTimeout(function () {
    if (mode !== "google" || !G.sheetId) return;
    var x = JSON.stringify({ custom: D.custom || [], layout: D.layout || { hide: [], pin: [] }, made: D.made || {}, pj: D.pj && D.pj.real ? D.pj : null, pjPast: D.pjPast || [] });
    if (D.settings.extras === x) return;
    change("Settings", function (st) { st.extras = x; }).catch(function () {});
  }, 800);
}
function extrasLoad() {
  try { var x = JSON.parse(D.settings.extras || "null"); if (x) { D.custom = x.custom || []; D.layout = x.layout || { hide: [], pin: [] }; D.made = x.made || {}; D.pj = x.pj || null; D.pjPast = x.pjPast || []; } } catch (e) {}
}

/* Google sign-in (Google Identity Services, token model). The token lives in memory only. */
function loadGis() {
  return new Promise(function (ok, bad) {
    if (window.google && google.accounts && google.accounts.oauth2) return ok();
    var s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = function () { ok(); }; s.onerror = function () { bad(new Error("Couldn't reach Google sign-in.")); };
    document.head.appendChild(s);
  });
}
/* On an iPhone home-screen app Google's pop-up opens in Safari and never comes back, so we send the whole page to Google and read the token off the address when it returns. */
var REDIRECT_AUTH = /iPhone|iPad|iPod/.test(navigator.userAgent) && (navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches));
function redirectUri() { return location.origin + location.pathname; }
function tokenFromHash() {
  var h = location.hash || "";
  if (h.indexOf("access_token=") < 0 && h.indexOf("error=") < 0) return false;
  var q = {}; h.slice(1).split("&").forEach(function (kv) { var i = kv.indexOf("="); if (i > 0) q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); });
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  if (q.state !== "eltio-systems") return false;
  if (q.access_token && (q.scope || "").indexOf("drive.file") < 0) { banner("Google didn't give the app its sheet in your Drive. Tap Sign in again and tick the Google Drive box."); G.needDrive = true; return false; }
  if (q.access_token && flag("sy-scan-pending") && (q.scope || "").indexOf("gmail") < 0) { try { localStorage.removeItem("sy-scan-pending"); } catch (e) {} SCAN.err = NO_GMAIL; }
  if (q.access_token) { G.token = q.access_token; G.exp = Date.now() + ((+q.expires_in || 3600) - 60) * 1000; G.gmail = (q.scope || "").indexOf("gmail") >= 0; G.cal = (q.scope || "").indexOf("calendar") >= 0; if (flag("sy-cal-pending") && !G.cal) OB.err = NO_CAL; try { localStorage.removeItem("sy-cal-pending"); } catch (e) {} try { localStorage.setItem("eltio-systems-signed-in", "1"); } catch (e) {} return true; }
  try { localStorage.removeItem("eltio-systems-signed-in"); } catch (e) {}
  return false;
}
function redirectToGoogle(silent) {
  var u = "https://accounts.google.com/o/oauth2/v2/auth?response_type=token&include_granted_scopes=true&state=eltio-systems" +
    "&client_id=" + encodeURIComponent(CFG.googleClientId) + "&redirect_uri=" + encodeURIComponent(redirectUri()) + "&scope=" + encodeURIComponent(scopeNow()) + "&prompt=" + (silent ? "none" : (G.needDrive ? "consent" : "select_account")) + (G.email ? "&login_hint=" + encodeURIComponent(G.email) : "");
  if (G.wantGmail) flag("sy-scan-pending", "1"); if (G.wantCal) flag("sy-cal-pending", "1");
  location.assign(u);
  return new Promise(function () {}); /* the page is leaving */
}
function getToken(silent) {
  if (G.token && Date.now() < G.exp) return Promise.resolve();
  if (REDIRECT_AUTH && CFG.googleClientId) return redirectToGoogle(silent);
  return loadGis().then(function () {
    return new Promise(function (ok, bad) {
      if (!G.client) G.client = google.accounts.oauth2.initTokenClient({ client_id: CFG.googleClientId, scope: SCOPE, callback: function () {} });
      G.client.callback = function (r) {
        if (r.error) return bad(new Error(r.error));
        /* Google lets people untick the Drive box on its consent screen. Without it there's nowhere to keep the sheet. */
        if (google.accounts.oauth2.hasGrantedAllScopes && !google.accounts.oauth2.hasGrantedAllScopes(r, "https://www.googleapis.com/auth/drive.file")) { G.needDrive = true; return bad(new Error("Google didn't give the app its sheet in your Drive. Tap Sign in again and tick the Google Drive box on Google's screen.")); }
        var has = function (x) { return google.accounts.oauth2.hasGrantedAllScopes ? google.accounts.oauth2.hasGrantedAllScopes(r, x) : (r.scope || "").indexOf(x) >= 0; };
        if (G.wantGmail && !has(GMAIL)) return bad(new Error(NO_GMAIL));
        if (G.wantCal && !has(CAL)) return bad(new Error(NO_CAL));
        G.gmail = has(GMAIL); G.cal = has(CAL);
        G.needDrive = false; G.token = r.access_token; G.exp = Date.now() + (r.expires_in - 60) * 1000; try { localStorage.setItem("eltio-systems-signed-in", "1"); } catch (e) {} ok(); };
      G.client.error_callback = function (e) { bad(new Error(e && e.type || "sign-in cancelled")); };
      G.client.requestAccessToken({ scope: scopeNow(), prompt: silent ? "" : (G.needDrive ? "consent" : G.wantGmail ? "" : "select_account"), hint: G.email || undefined });
    });
  });
}
function api(url, opt) {
  opt = opt || {};
  var go = function () {
    return fetch(url, { method: opt.method || "GET", headers: Object.assign({ Authorization: "Bearer " + G.token }, opt.body ? { "Content-Type": "application/json" } : {}), body: opt.body ? JSON.stringify(opt.body) : undefined })
      .then(function (r) { if (r.status === 401) { G.token = null; throw { retry: true }; } if (!r.ok) return r.text().then(function (t) { if (r.status === 403 && /insufficient/i.test(t) && /gmail\.googleapis/.test(url)) { G.gmail = false; throw new Error(NO_GMAIL); }
        if (r.status === 403 && /accessNotConfigured|has not been used|is disabled/i.test(t) && /gmail\.googleapis/.test(url)) throw new Error("Email scanning isn't switched on for Systems yet. Try again in a few minutes.");
        if (r.status === 403 && /insufficient/i.test(t)) { G.needDrive = true; G.token = null; throw new Error("Google didn't give the app its sheet in your Drive. Tap Sign in again and tick the Google Drive box on Google's screen."); } throw new Error("Google said " + r.status + ": " + t.slice(0, 160)); }); return r.status === 204 ? {} : r.json(); });
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
  var t = today(), L = mode === "google" ? scanTodos() : [];
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
var TABN = { home: "Home", bookings: "Bookings", money: "Money", more: "More" };

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
function job() { var k = D && D.settings && D.settings.job, j = JOBS.find(function (x) { return x.k === k; }), n = D && D.settings && D.settings.jobName; return j && n ? Object.assign({}, j, { n: n, pl: n.toLowerCase().replace(/s$/, "") + "s" }) : j; }
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
var OFFERS = [["o1", 2, "1", "Halde Films", "Sportswear spot", "Found you in the directory", "Maya, producer", "Hi Sam, found you in the directory. One day on a sportswear spot, on a stage in E2. Could you hold it until Thursday? Happy to send the treatment.", "Canal St Studios, E2", "07:00", "Jonah A.", "Mara Q."], ["o2", 4, "2", "Northlight Films", "Drama, second unit", "Via your agent", "Your agent, for Northlight", "Northlight want you for two days of second unit on their drama in Kent, on Bectu terms. Day two is a night shoot on the seafront. They asked if you can do a recce the Friday before.", "Margate seafront, Kent", "05:30", "Ade O.", "Lena K."]];
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
function dashTop() { if (mode === "google") return obNudge() + fwdLine() + (isFwd() ? "" : rescanLine()) + (isProd() ? (D.pj ? pjCard() + (D.pj.wrap ? signCard() : "") : pjNewCard()) : ""); if (mode !== "demo" || !job()) return onboard(); return isProd() ? shootCard() + onboard() + pjCard() + hotCost() + signCard() + poCard() : deptCard() + diaryCard() + onboard() + jobsCard(); }
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
function pj() { if (!D.pj) D.pj = mode === "demo" ? pjSample() : pjFrom({}); return D.pj; }
function pjSave() { demoSave(); }
function crewRate(c) { return cardRate(cardOf(pj().terms === "Bectu" ? "TV drama" : "APA"), c.grade) || 0; }
function pjTerms() { return pj().terms === "Bectu" ? "TV drama" : "APA"; }
function crewDay(c, wrapAt) { var u = pj().unit; return calcDay({ date: pj().shoot, call: c.call || u.call, wrap: wrapAt || c.wrap || u.wrap, lunch: u.lunch, lunchAt: "12:30", type: "Normal" }, { rate: crewRate(c), terms: pjTerms(), grade: c.grade }); }
function nextFri() { var d = addDays(today(), 1); while (d.getDay() !== 5) d = addDays(d, 1); return d; }
function ics(name, ev) {
  var f = function (d) { return iso(d).replace(/-/g, ""); };
  saveFile(name + ".ics", "text/calendar", "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Eltio Systems//EN\r\n" + ev.map(function (e) { return "BEGIN:VEVENT\r\nUID:" + uid() + "@eltio.systems\r\nDTSTAMP:" + f(today()) + "T000000Z\r\nDTSTART;VALUE=DATE:" + f(e[0]) + "\r\nDTEND;VALUE=DATE:" + f(addDays(e[0], 1)) + "\r\nSUMMARY:" + e[1].replace(/[,;]/g, " ") + "\r\nEND:VEVENT\r\n"; }).join("") + "END:VCALENDAR\r\n");
}
function slug(t) { return String(t || "job").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "job"; }
function copyText(t) { try { navigator.clipboard.writeText(t); } catch (e) {} }

/* The job, step by step, on the producer's home. */
function pjCard() {
  var P = pj(), w = signRows().filter(function (x) { return x.st !== "ok"; }).length, missing = P.crew.filter(function (c) { return c.sp.indexOf(0) >= 0; }).length;
  var due = permitList().filter(function (p) { return daysBetween(today(), p.by) <= 7; }).length, ext = P.extras.filter(function (x) { return x.st === "sent"; }).length, soon = P.rights.filter(function (r) { return r.ends && daysBetween(today(), parse(r.ends)) <= 30; }).length;
  var steps = [
    ["award", "Award", P.award ? "Advance " + money(P.award.adv) + " drafted" : "Forward the award email", P.award ? "ok" : "amb", "The advance and balance invoices drafted, with the dates in your calendar."],
    ["crew", "Crew and start packs", P.crew.length + " booked · " + (missing ? missing + " packs missing" : "all packs in"), missing ? "amb" : "ok", "Grades and rates from the " + P.terms + " card. Missing bank, UTR or right to work chased in one email."],
    ["permits", "Permits", due ? due + " to apply for this week" : "On track", due ? "amb" : "ok", "Each council's lead time, counted back from the shoot."],
    ["cs", "Call sheet", "V" + P.cs.length + (P.real ? "" : " · one link"), "", "Every version kept, what changed lit up, sent by WhatsApp or email."],
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
  return '<div class="top"><span class="q">Award</span><span class="q">Forward it, or paste it here</span></div><h2>The award email.</h2><div class="field"><label for="aw-mail">The email from the agency</label><textarea id="aw-mail" rows="8">' + esc(P.real ? "" : AWARD_MAIL) + '</textarea></div><div class="acts"><button class="btn solid wide" data-pjread>Read the award</button></div><p class="q">In the pilot you forward it to your job\'s own address. Here, paste any award email and it picks out the budget, the split and the terms.</p>';
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
    '<p class="q">V' + V.v + " posted by the " + esc(V.by.toLowerCase()) + ". " + (P.cs.length > 1 ? "Every version is kept. " : "") + (P.real ? "" : "Opened by 29 of 32 crew.") + "</p>" +
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
    (P.ask && !P.real ? '<div class="rows"><div class="row static"><span>' + (P.crew.length - 2) + " in, 2 want a word</span><span class=\"tag amb\">" + esc(P.ask.to) + '</span><span class="sub">Kit Morgan and Ade Cole asked to talk to the producer.</span></div></div><div class="acts"><button class="btn" data-pjtalk>Message the two</button></div>' : '<div class="acts"><button class="btn" data-pjask>Send the ask to all ' + P.crew.length + "</button></div>") +
    '<div class="part">Wrap</div>' + field("u-at", "Unit wrap", P.ask ? P.ask.to : u.wrap, "time") + '<div class="acts"><button class="btn solid wide" data-pjwrap>Tap wrap for everyone</button></div><p class="q">Each person\'s overtime is worked out at their own grade on the ' + esc(P.terms) + " card. Anyone released early or called early can be changed after.</p>";
}
function askCost(to) { var P = pj(); return P.crew.reduce(function (a, c) { return a + crewDay(c, to).total - crewDay(c).total; }, 0); }

/* Sign-off rows: from the wrap once there is one, the sample ones before. */
function chainOf(c) { var g = c.grade, d = /AC|DIT|Camera/.test(g) ? "Camera HoD" : /Spark|Gaffer|Best boy/.test(g) ? "Gaffer" : /grip/i.test(g) ? "Key grip" : "PM"; return d === "PM" ? ["PM"] : [d, "PM"]; }
function signRows() {
  var P = D.pj;
  if (!P || !P.wrap) return P && P.real ? [] : SIGN;
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
  return P.crew.map(function (c, i) { var r = crewDay(c, P.wrap.at), t = Math.round(r.total * 100) / 100, claim = i === 3 && !P.real ? t + 26.25 : t; return { c: c, t: t, claim: claim, paye: c.pay === "PAYE", ok: Math.abs(claim - t) < 0.5 }; });
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
    return '<div class="row static"><span>' + esc(x.what) + '</span><span class="tag' + (x.st === "ok" ? " ok" : x.st === "no" ? "" : x.st === "sent" ? " amb" : " ink") + '">' + pounds(x.amt) + " · " + (x.st === "ok" ? "approved" : x.st === "no" ? "declined" : x.st === "sent" ? "waiting" : "draft") + '</span><span class="sub">' + (x.st === "sent" ? (P.real ? '<button class="lnk" data-pjapprove="' + x.id + '">They said yes</button> · <button class="lnk" data-pjdecline="' + x.id + '">They said no</button>' : '<button class="lnk" data-pjagency="' + x.id + '">See what ' + esc(P.client) + ' sees</button> · <button class="lnk" data-pjcopy="' + x.id + '">Copy their link</button>') : x.st === "" ? '<button class="lnk" data-pjsendx="' + x.id + '">Send to ' + esc(P.client) + "</button>" : x.st === "ok" ? "On the balance invoice" : "Not on the invoice") + "</span></div>";
  }).join("") + '</div><div class="part">Cost a new one</div><div class="grid2">' + field("ex-what", "What it is", "", "text", "e.g. A second location, half day") + field("ex-amt", "Cost (£)", "", "number", "", ' inputmode="decimal"') + '</div><div class="acts"><button class="btn solid" data-pjaddx>Add it</button></div><p class="q">' + (P.real ? "The ask is drafted to their accounts email. When they say yes, mark it and it goes on the balance invoice." : "The agency opens one link, no login, and taps Approve. It\'s logged against the budget and added to the balance invoice.") + '</p>';
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
  var d = b.dataset, P = isProd() && (mode === "demo" || D.pj) ? pj() : null; if (!P) return false;
  if (d.pj) { openSheet(PJ_SHEETS[d.pj]()); return true; }
  if (b.hasAttribute("data-pjread")) { readAward(); return true; }
  if (d.pjinv) { pjInvoice(d.pjinv); return true; }
  if (d.pjmail === "award") { compose(P.accounts, P.name + ": advance invoice", "Hi,\n\nThanks for the award. Attached is our invoice for the " + P.split + "% advance on " + P.name + ", " + money(P.award.adv) + " plus VAT" + (P.po ? ", PO " + P.po : "") + ", due " + nice(P.award.advDue) + ".\n\nThe balance follows on delivery." + sign()); return true; }
  if (d.pjics === "award") { ics(slug(P.name) + "-dates", [[parse(P.award.advDue), P.name + ": advance due"], [parse(P.shoot), P.name + ": shoot day 1"], [parse(P.award.balDue), P.name + ": balance due"]]); banner("Calendar file saved. Open it to add the three dates."); return true; }
  if (d.pjics === "permits") { ics(slug(P.name) + "-permits", permitList().map(function (p) { return [p.by, "Apply: " + p.n]; })); banner("Calendar file saved with " + permitList().length + " deadlines."); return true; }
  if (d.pjreset) { P[d.pjreset] = null; if (d.pjreset === "wrap") { P.sign = {}; P.run = null; P.ask = null; } pjSave(); openSheet(PJ_SHEETS[d.pjreset]()); render(); return true; }
  if (d.pjpermit) { var i = P.permits.indexOf(d.pjpermit); if (i >= 0) P.permits.splice(i, 1); else P.permits.push(d.pjpermit); var nd = val("pm-date"); if (nd) P.pshoot = nd; pjSave(); openSheet(permitSheet()); render(); return true; }
  if (b.hasAttribute("data-pjchase")) { chaseStartPacks(); banner("Drafted to everyone with something missing. Nothing sends until you tap send."); return true; }
  if (b.hasAttribute("data-pjadd")) { var nm = val("cr-n"), gr = val("cr-g"); if (!nm || !gr) { banner("Add a name and a grade."); return true; } P.crew.push({ id: "c" + uid().slice(-5), n: nm, grade: gr, pay: "Self-employed", h: (nm.length * 47) % 360, email: first(nm).toLowerCase() + "@crew.example", sp: [0, 0, 0], call: "", wrap: "" }); pjSave(); openSheet(crewSheet()); render(); banner(first(nm) + " is on the crew list. Their start pack link is drafted."); return true; }
  if (d.csv) { openSheet(callSheet(+d.csv)); return true; }
  if (b.hasAttribute("data-pjv4") || b.hasAttribute("data-postv")) { openSheet(csForm()); return true; }
  if (b.hasAttribute("data-pjpost")) { var L = P.cs[P.cs.length - 1].f, f = {}; CSF.forEach(function (k, i) { f[k] = val("cs-" + i) || L[k]; }); P.cs.push({ v: P.cs.length + 1, by: "Producer", f: f }); pjSave(); openSheet(callSheet()); render(); banner("V" + P.cs.length + " posted. Everyone's link now shows it, with what changed lit up."); return true; }
  if (d.pjsend === "wa") { window.open("https://wa.me/?text=" + encodeURIComponent(csText()), "_blank", "noopener"); return true; }
  if (d.pjsend === "mail") { compose(P.crew.map(function (c) { return c.email; }).join(","), P.name + ": call sheet V" + P.cs.length, csText() + sign()); return true; }
  if (b.hasAttribute("data-pjask")) { P.unit.call = val("u-call") || P.unit.call; P.unit.wrap = val("u-wrap") || P.unit.wrap; P.ask = { to: val("u-to") || hm(tm(P.unit.wrap) + 60) }; pjSave(); openSheet(wrapSheet()); render(); if (P.real) { window.open("https://wa.me/?text=" + encodeURIComponent(P.name + ": can we run to " + P.ask.to + "? Overtime is paid at your grade on " + P.terms + " terms. Reply yes or come and find me."), "_blank", "noopener"); banner("The ask is drafted in WhatsApp for the crew group."); } else banner("Sent to all " + P.crew.length + " at once. " + (P.crew.length - 2) + " said yes."); return true; }
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
  if (d.pjsendx) { var xx = P.extras.find(function (x) { return x.id === d.pjsendx; }); xx.st = "sent"; pjSave(); openSheet(extrasSheet()); render(); if (P.real) { compose(P.accounts, P.name + ": an extra to approve", "Hi,\n\nOne extra on " + P.name + " to approve: " + xx.what + ", " + pounds(xx.amt) + " plus VAT. If you're happy, reply yes and it goes on the balance invoice." + sign()); banner("Drafted to " + (P.accounts || P.client) + ". Mark it approved when they say yes."); } else banner("Sent to " + P.client + ". They get one link, no login."); return true; }
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
  var dl = String(t).split("\t").length > String(t).split(",").length ? "\t" : ",";
  return String(t).split(/\r?\n/).filter(function (l) { return l.trim(); }).map(function (l) { var out = [], cur = "", q = false; for (var i = 0; i < l.length; i++) { var ch = l[i]; if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === dl && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map(function (x) { return x.trim(); }); });
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
    '<div class="field"><label for="bk-file">Your statement (.csv)</label><input id="bk-file" type="file" accept=".csv,.xls,.txt,text/csv"></div>' + bankHow() +
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
    '<div class="field"><span class="lab">Which email do you use?</span>' + pills("mail", MAILK, s.mail === "Apple Mail" ? "iCloud" : s.mail || "Gmail") + "</div>" +
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
    quickAdd() + dashTop() +
    '<div class="hcard"><div class="hc-l"><span class="part">Owed to you</span><b>' + money(owed()) + '</b><span class="hc-s">' + (od ? '<i class="rd"></i><span class="late">' + money(od) + " late</span>" : '<i class="gd"></i>All on time') + '</span></div><button class="row-chart hc-chart" data-tab="money" aria-label="Open Money">' + barChart(true) + "</button></div>" +
    '<div class="tiles">' + tile("Booked", money(bookedThisMonth()), conf + " confirmed") + tile("On hold", holds, holds === 1 ? "pencil" : "pencils") + tile("For tax", money(paidThisYear() * num(s.tax || 25) / 100), esc(s.tax || 25) + "% put aside") + "</div>" +
    shareCards() + jobPart() +
    '<div class="two"><div class="stack"><div class="part">Needs you' + (L.length ? " · " + L.length : "") + '</div><div class="rows needs">' + (mode === "demo" && job() && !isProd() ? '<button class="row" data-confirmed><span><i class="gd" style="margin-right:10px"></i>Car commercial hours, confirmed by production</span><span class="tag ok">Confirmed</span></button>' : "") + (L.length ? L.map(function (x) { return '<button class="row" data-todo="' + x.k + '" data-id="' + x.id + '"><span><i class="' + (x.amb ? "rd" : "od") + '"></i>' + esc(x.t) + '</span><span class="tag' + (x.amb ? " amb" : "") + '">' + esc(x.tag) + "</span></button>"; }).join("") : '<p class="empty">All clear. Nothing needs you.</p>') + "</div>" + starter() + "</div>" +
    '<div class="stack"><div class="part">Coming up</div><div class="rows">' + (up.length ? up.slice(0, 5).map(upRow).join("") : emptyNext("Nothing booked yet.", "Add your next job", "data-addbooking")) + "</div></div></div>";
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
  if (mode === "demo" && roleKey() === "Producer") steps.unshift({ t: "See all 26 things Systems runs", sub: "Advance invoices, permits, rights, deliverables and the books.", a: "data-features" });
  if (mode === "demo" && roleKey() === "Producer") steps.unshift({ t: "Check a crew member's day", sub: "Their call, wrap and rate in, what APA says they're owed out.", a: "data-check" });
  if (mode !== "demo") {
    var cb = D.bookings.find(function (b) { return b.status === "Confirmed"; });
    steps = [
      { t: "Add your next job or hold", sub: "Holds get a nudge before the date.", a: "data-addbooking", done: D.bookings.length > 0 },
      { t: "Log a day's hours", sub: "Call and wrap in, overtime out, on APA or Bectu terms.", a: cb ? 'data-timesheet="' + cb.id + '"' : "data-addbooking", done: D.days.length > 0 },
      { t: "Add an invoice you're waiting on", sub: "We'll tell you when it's late and draft the chase.", a: "data-addinvoice", done: D.invoices.length > 0 },
      { t: "Put it on your home screen", sub: "So it opens like an app on your phone.", a: "data-howphone", done: !!flag("eltio-systems-phone") || matchMedia("(display-mode: standalone)").matches }
    ];
    if (isProd()) steps = [
      { t: "Add the job you're on", sub: "The award, shoot days and who pays.", a: "data-pjnew", done: !!D.pj },
      { t: "Add your crew", sub: "Paste the list in. Grades and rates come from the APA or Bectu card.", a: D.pj ? 'data-pj="crew"' : "data-pjnew", done: !!(D.pj && D.pj.crew.length) },
      { t: "Draft the advance invoice", sub: "Paste the award email and the advance and balance are worked out.", a: D.pj ? 'data-pj="award"' : "data-pjnew", done: !!(D.pj && D.pj.award) },
      { t: "Connect your calendar and bank", sub: "So payments and shoot days match up.", a: 'data-obstart="1"', done: D.settings.onb === "2" && (D.settings.cal === "1" || !!D.settings.scanned) },
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
  var grp = function (name, L) { return '<div class="stack"><div class="part">' + name + '</div><div class="rows">' + (L.length ? L.map(bookingRow).join("") : name === "Past" ? '<p class="empty">None.</p>' : emptyNext("None yet.", name === "Confirmed" ? "Add a job" : "Add a hold", "data-addbooking")) + "</div></div>"; };
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
    '<div class="two"><div class="stack"><div class="part">Unpaid</div><div class="rows">' + (open.length ? open.map(invoiceRow).join("") : D.invoices.length ? '<p class="empty">Nothing outstanding.</p>' : emptyNext("No invoices yet.", "Add one you're waiting on", "data-addinvoice") + emptyNext("Paid before?", "Match payments from a bank CSV", 'data-link="csv"')) + '</div><div class="part">Paid</div><div class="rows">' + (paid.length ? paid.slice(0, 10).map(invoiceRow).join("") : '<p class="empty">None yet.</p>') + "</div></div>" +
    '<div class="stack"><div class="part">How fast they pay</div>' + slowPayers() + '<div class="part">Tax and VAT</div><div class="sum"><div><span class="q">Paid since 6 April</span><span>' + money(paidThisYear()) + '</span></div><div><span class="q">Put aside (' + esc(s.tax || 25) + '%)</span><span>' + money(paidThisYear() * num(s.tax || 25) / 100) + '</span></div><div><span class="q">Invoiced, last 12 months</span><span>' + money(r12) + ' of £90,000</span></div></div><div class="bar"><i style="width:' + Math.min(100, r12 / 900) + '%"></i></div><p class="q">£90,000 in 12 months is the VAT line. This is a guide, not tax advice.</p></div></div>';
}
function more() {
  var s = D.settings;
  return '<div class="top"><span>You</span><span></span></div><h2>' + esc(s.name || "Your account") + "</h2>" + toolList() +
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
/* ---------- tools: every feature on the website gets its own page in the sidebar ---------- */
/* Inbox: work email sorted into the job, the reply drafted. Sample mail only in the preview. */
var INBOX_P = [
  { id: "m1", from: "Brightside Agency", subj: "Re: Canal promo, can we add a pickup shot?", job: "Canal promo", sort: "Change request", tag: "amb", body: "Hi Sam, could we grab a pickup of the bridge at golden hour on Friday? Same cast. Thanks, Jess", draft: { to: "jess@brightside.example", subject: "Re: Canal promo, pickup shot", body: "Hi Jess,\n\nHappy to. A half-day pickup on Friday with the same cast and a reduced crew of 8 comes to £1,850 plus VAT. I've sent you a link to approve it in one tap, and once you do it goes on the balance invoice.\n\nThanks,\nSam" } },
  { id: "m2", from: "Fieldwear accounts", subj: "PO 7731 for the advance", job: "Canal promo", sort: "Money", tag: "ok", body: "Please find PO 7731 attached for the 50% advance.", draft: { to: "accounts@fieldwear.example", subject: "Re: PO 7731 for the advance", body: "Thanks, that's great. The advance invoice with PO 7731 on it is attached, due in 14 days as agreed.\n\nBest,\nSam" } },
  { id: "m3", from: "Westminster filming office", subj: "Permit FO-2291: approved", job: "Canal promo", sort: "Permits", tag: "ok", body: "Your filming notice for Little Venice towpath, 21 to 22 Oct, is approved.", draft: null },
  { id: "m4", from: "Priya K.", subj: "Re: 2nd AC hold, Canal promo", job: "Canal promo", sort: "Crew", tag: "", body: "Yes, I'm in for both days. Rate as the card is fine.", draft: { to: "priya@example.com", subject: "Re: 2nd AC hold", body: "Brilliant, thanks Priya. You're confirmed for 21 and 22 Oct. The call sheet link and start pack are on their way.\n\nSam" } },
  { id: "m5", from: "Lensworks Hire", subj: "Quote: cross-hire zoom, 2 days", job: "Canal promo", sort: "Spend", tag: "", body: "Angénieux 24-290 for two days, £380 plus VAT.", draft: null }
];
var INBOX_C = [
  { id: "m1", from: "Maya, Halde Films", subj: "Hold for Thu 22 Oct?", job: "Sportswear spot", sort: "Diary", tag: "amb", body: "Hi Sam, could we pencil you for Thursday? Two cameras on a stage.", draft: { to: "maya@haldefilms.example", subject: "Re: Hold for Thu 22 Oct", body: "Hi Maya,\n\nHappy to take a first pencil on Thursday 22 Oct at my APA card rate. Let me know when it confirms.\n\nThanks,\nSam" } },
  { id: "m2", from: "Ironbridge Pictures", subj: "Remittance advice", job: "Car commercial", sort: "Money", tag: "ok", body: "Payment of £1,180.00 has been sent for invoice INV-0031.", draft: null },
  { id: "m3", from: "Ruth, Lark Crew", subj: "Northlight drama, second unit", job: "Drama, second unit", sort: "Offer", tag: "amb", body: "They want you for two days on Bectu terms. Shall I say yes?", draft: { to: "ruth@larkcrew.example", subject: "Re: Northlight drama", body: "Hi Ruth,\n\nYes please, on Bectu terms for both days. Send the deal memo over when you have it.\n\nThanks,\nSam" } }
];
function inbox() { return isProd() ? INBOX_P : INBOX_C; }
function inboxView() {
  var M = inbox(), sorts = M.reduce(function (a, m) { a[m.sort] = (a[m.sort] || 0) + 1; return a; }, {});
  return '<div class="facts">' + Object.keys(sorts).slice(0, 3).map(function (k) { return "<span><i>" + esc(k) + "</i>" + sorts[k] + "</span>"; }).join("") + '</div><div class="rows">' + M.map(function (m) {
    return '<button class="row" data-mail="' + m.id + '"><span class="mail-t">' + esc(m.from) + '<span class="sub q">' + esc(m.subj) + '</span></span><span class="tag' + (m.tag ? " " + m.tag : "") + '">' + esc(m.sort) + "</span></button>";
  }).join("") + '</div><p class="q">Systems reads only the mail you label for work, sorts it into the job, and drafts the reply in your Gmail drafts. You press send.</p>';
}
function mailSheet(id) {
  var m = inbox().find(function (x) { return x.id === id; });
  return '<div class="top"><span class="q">' + esc(m.job) + " · " + esc(m.sort) + '</span><span class="q">' + esc(m.from) + "</span></div><h2>" + esc(m.subj) + '</h2><div class="dm"><p>' + esc(m.body) + "</p></div>" +
    (m.draft ? '<div class="part">Reply drafted</div><div class="glass" style="padding:14px 16px;white-space:pre-wrap">' + esc(m.draft.body) + '</div><div class="acts"><button class="btn solid" data-maildraft="' + m.id + '">Open the draft</button><button class="btn" data-close>Later</button></div>' : '<p class="q">Filed to ' + esc(m.job) + ". Nothing to reply to.</p>" + '<div class="acts"><button class="btn solid" data-close>Done</button></div>');
}
function bankView() { return bankSheet() + '<div class="part">Linked accounts</div>' + linkSheet().replace(/<h2>[^<]*<\/h2>/, ""); }
function clientsView() {
  var P = pj();
  return '<div class="facts"><span><i>Client</i>' + esc(P.client) + '</span><span><i>Brand</i>' + esc(P.brand) + '</span><span><i>Budget</i>' + money(P.budget) + "</span></div>" + extrasSheet().replace(/<div class="top">.*?<\/div>/, "");
}
function strip(h) { return h.replace(/^<div class="top">.*?<\/div>/, ""); }
var TOOLS_P = [
  { k: "t-inbox", n: "Inbox", g: "Run the job", fn: inboxView, sub: "Mail sorted into the job" },
  { k: "t-dir", n: "Crew directory", g: "Run the job", fn: function () { return strip(findCrew()); }, sub: "Who's free, and send a hold" },
  { k: "t-crew", n: "Crew and start packs", g: "Run the job", fn: function () { return strip(crewSheet()); } },
  { k: "t-cs", n: "Call sheets", g: "Run the job", fn: function () { return strip(callSheet()); } },
  { k: "t-permits", n: "Permits", g: "Run the job", fn: function () { return strip(permitSheet()); } },
  { k: "t-sign", n: "Sign-off", g: "Pay", fn: function () { return strip(signSheet()); } },
  { k: "t-run", n: "Pay run", g: "Pay", fn: function () { return strip(runSheet()); } },
  { k: "t-bank", n: "Bank and accounts", g: "Pay", fn: bankView },
  { k: "t-rates", n: "Rate cards", g: "Pay", fn: function () { return strip(rateSheet()); } },
  { k: "t-clients", n: "Client and extras", g: "Client", fn: clientsView },
  { k: "t-rights", n: "Rights and usage", g: "Client", fn: function () { return strip(rightsSheet()); } }
];
var TOOLS_C = [
  { k: "t-inbox", n: "Inbox", g: "Your work", fn: inboxView },
  { k: "t-pass", n: "Passport", g: "Your work", fn: function () { return strip(passportSheet()); } },
  { k: "t-dir", n: "Crew directory", g: "Your work", fn: function () { return strip(findCrew()); } },
  { k: "t-cs", n: "Call sheets", g: "Your work", fn: function () { return strip(callSheet()); } },
  { k: "t-rates", n: "Rate cards", g: "Money", fn: function () { return strip(rateSheet()); } },
  { k: "t-bank", n: "Bank and receipts", g: "Money", fn: bankView }
];
/* ---------- department tools: what each crew job needs, on top of the shared ones ---------- */
/* Float: the department's petty cash. Snap each receipt, tag it, send production one reconciliation. No company card needed. */
var FLOATCAT = { art: "Set", costume: "Character", hmu: "Cast", locations: "Location", runner: "Department", pm: "Department" };
var FLOATSAMPLE = {
  art: [["Dressing, kitchen set", 42.1, "Set: Kitchen", "Hobbs Antiques", ""], ["Gaffer tape and pins", 18.5, "Set: General", "Screwfix", ""], ["Fruit bowl, hero", 24, "Set: Kitchen", "Borough Market", ""], ["Rug, return by 25 Oct", 120, "Set: Lounge", "Habitat", "return"]],
  costume: [["Linen shirt, size M", 65, "Character: Jess", "COS", "return"], ["Trainers, two pairs", 180, "Character: Lead runner", "Size?", "return"], ["Dry cleaning", 28, "Character: Mum", "Johnsons", ""], ["Safety pins, tit tape", 9.4, "Character: General", "Boots", ""]],
  hmu: [["Setting spray", 14, "Cast: Jess", "Boots", ""], ["Hair grips, kirby", 6.5, "Cast: General", "Superdrug", ""], ["Sun cream SPF50", 12, "Cast: All", "Boots", ""]],
  locations: [["Parking, two vans", 48, "Location: Little Venice", "RingGo", ""], ["Key holder tip", 20, "Location: Flat, NW3", "Cash", ""], ["Cleaning after", 85, "Location: Flat, NW3", "Clean Co", ""]],
  runner: [["Coffee run, 14", 46.2, "Department: Production", "Pret", ""], ["Taxi, rushes drop", 32, "Department: Post", "Uber", ""], ["Batteries AA", 11, "Department: Camera", "Argos", ""]],
  pm: [["Float to art", 500, "Department: Art", "Issued", ""], ["Float to costume", 800, "Department: Costume", "Issued", ""]]
};
var FLOATAMT = { art: 500, costume: 800, hmu: 200, locations: 300, runner: 150, pm: 1300 };
function jk() { return (job() || {}).k || ""; }
function floatData() {
  var k = jk(); if (!D.float || D.float.k !== k) { D.float = { k: k, issued: FLOATAMT[k] || 300, items: (FLOATSAMPLE[k] || []).map(function (r, i) { return { id: "s" + i, date: iso(addDays(today(), -i)), what: r[0], amt: r[1], cat: r[2], sup: r[3], ret: r[4], photo: true }; }), sent: "" }; }
  return D.float;
}
function floatSpent() { return floatData().items.reduce(function (a, x) { return a + (x.ret === "returned" ? 0 : num(x.amt)); }, 0); }
function floatView() {
  var F = floatData(), sp = floatSpent(), left = F.issued - sp, cat = FLOATCAT[jk()] || "Job", rets = F.items.filter(function (x) { return x.ret === "return"; });
  return '<div class="facts"><span><i>Float</i>' + pounds(F.issued) + '</span><span><i>Spent</i>' + pounds(sp) + '</span><span><i>' + (left < 0 ? "You're owed" : "Left") + "</i>" + pounds(Math.abs(left)) + "</span></div>" +
    '<span class="bar fbar"><i style="width:' + Math.min(100, sp / F.issued * 100).toFixed(1) + '%"></i></span>' +
    '<div class="acts"><button class="btn solid" data-fsnap>Snap a receipt</button><button class="btn" data-fsend>Send to production</button><button class="btn" data-ftop>Ask for a top-up</button></div>' +
    '<div class="part">Receipts · by ' + esc(cat.toLowerCase()) + '</div><div class="rows">' + F.items.map(function (x) {
      return '<div class="row static"><span class="mail-t">' + esc(x.what) + '<span class="sub q">' + esc(x.cat) + " · " + esc(x.sup) + " · " + nice(x.date) + (x.photo ? " · photo" : "") + '</span></span><span class="tag' + (x.ret === "return" ? " amb" : x.ret === "returned" ? " ok" : "") + '">' + (x.ret === "returned" ? "Refunded " : "") + pounds(num(x.amt)) + "</span>" + (x.ret === "return" ? '<span class="sub"><button class="lnk" data-fret="' + x.id + '">Mark returned and refunded</button></span>' : "") + "</div>";
    }).join("") + "</div>" +
    (rets.length ? '<p class="q">' + rets.length + " item" + (rets.length > 1 ? "s" : "") + " to go back. Systems reminds you three days before the shop's return window closes.</p>" : "") +
    '<p class="q">Every receipt is a photo in your Drive, tagged to the job and the ' + esc(cat.toLowerCase()) + '. Production gets one reconciliation with the photos, not an envelope.' + (F.sent ? " Last sent " + nice(F.sent) + "." : "") + "</p>";
}
function snapSheet() {
  var cat = FLOATCAT[jk()] || "Job";
  return "<h2>Snap a receipt.</h2><p class=\"q\">Take the photo, say what it was for, and it's on the float.</p>" +
    '<div class="field"><label for="fs-photo">Receipt photo</label><input id="fs-photo" type="file" accept="image/*" capture="environment"></div>' +
    '<div class="grid2">' + field("fs-what", "What it was", "", "text", "e.g. Shirt, size M") + field("fs-amt", "Amount (£)", "", "number", "", ' inputmode="decimal"') + "</div>" +
    '<div class="grid2">' + field("fs-cat", cat, "", "text", cat === "Character" ? "e.g. Jess" : cat === "Set" ? "e.g. Kitchen" : "") + field("fs-sup", "Shop", "", "text", "e.g. COS") + "</div>" +
    '<div class="field"><label for="fs-ret">Going back?</label><select id="fs-ret"><option value="">No, it\'s kept</option><option value="return">Yes, return it for a refund</option></select></div>' +
    '<div class="acts"><button class="btn solid wide" data-fsave>Add it to the float</button></div>';
}
function floatMail() {
  var F = floatData(), P = job() || {}, cat = FLOATCAT[jk()] || "Job", by = {};
  F.items.forEach(function (x) { if (x.ret === "returned") return; by[x.cat] = (by[x.cat] || 0) + num(x.amt); });
  return { to: "production@example.com", subject: "Float reconciliation, " + (P.n || "my department") + ", " + nice(iso(today())), body: "Hi,\n\nHere's my float reconciliation.\n\nFloat: " + pounds(F.issued) + "\nSpent: " + pounds(floatSpent()) + "\n" + (F.issued - floatSpent() >= 0 ? "Coming back to you: " + pounds(F.issued - floatSpent()) : "Owed to me: " + pounds(floatSpent() - F.issued)) + "\n\nBy " + cat.toLowerCase() + ":\n" + Object.keys(by).map(function (k) { return "  " + k + ": " + pounds(by[k]); }).join("\n") + "\n\nEvery receipt photo is in the shared folder, one line each in the attached sheet.\n\nThanks" };
}
function floatCSV() { return "Date,What,Amount," + (FLOATCAT[jk()] || "Job") + ",Shop,Status\n" + floatData().items.map(function (x) { return [x.date, x.what, num(x.amt).toFixed(2), x.cat, x.sup, x.ret || "kept"].map(function (v) { return /[",]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : v; }).join(","); }).join("\n"); }

/* Kit: what you bring, what's hired in, and the day fee that goes on the invoice. */
var KITSAMPLE = {
  dop: [["Camera package, Alexa Mini LF", 450, "Yours"], ["Lens set, Ultra Primes", 220, "Yours"], ["Monitor, 17in", 60, "Hired: Lensworks"]],
  camera: [["Focus kit, Nucleus M", 45, "Yours"], ["AC bag and slate", 15, "Yours"], ["Teradek Bolt", 40, "Hired: Lensworks"]],
  dit: [["DIT cart", 150, "Yours"], ["Resolve licence", 20, "Yours"], ["Shuttle drives, 4 x 4TB", 60, "Yours"]],
  gaffer: [["Lighting van, 3.5t", 120, "Yours"], ["Aputure 1200d x2", 90, "Hired: Panalux"], ["Dimmer board", 40, "Yours"]],
  grip: [["Grip truck", 150, "Yours"], ["Dana dolly", 60, "Yours"], ["Car rig", 180, "Hired: Arri Rental"]],
  sound: [["Sound cart, 8 channels", 180, "Yours"], ["Radio mics, 6", 90, "Yours"], ["Timecode boxes", 30, "Yours"]],
  spark: [["Personal tools", 0, "Yours"]]
};
function kitData() { var k = jk(); if (!D.kit || D.kit.k !== k) D.kit = { k: k, items: (KITSAMPLE[k] || []).map(function (r, i) { return { id: "k" + i, item: r[0], fee: r[1], src: r[2], on: i < 2 }; }) }; return D.kit; }
function kitView() {
  var K = kitData(), day = K.items.filter(function (x) { return x.on; }).reduce(function (a, x) { return a + num(x.fee); }, 0);
  return '<div class="facts"><span><i>Items</i>' + K.items.length + '</span><span><i>On this job</i>' + K.items.filter(function (x) { return x.on; }).length + '</span><span><i>Kit a day</i>' + money(day) + "</span></div>" +
    '<div class="rows">' + K.items.map(function (x) { return '<div class="row static"><span class="mail-t">' + esc(x.item) + '<span class="sub q">' + esc(x.src) + " · " + (num(x.fee) ? money(num(x.fee)) + " a day" : "no fee") + '</span></span><button class="btn sm' + (x.on ? " solid" : "") + '" data-kiton="' + x.id + '">' + (x.on ? "On the job" : "Add to job") + "</button></div>"; }).join("") + "</div>" +
    '<div class="part">Add kit</div><div class="grid2">' + field("kt-item", "Item", "", "text", "e.g. Wireless follow focus") + field("kt-fee", "Day fee (£)", "", "number", "", ' inputmode="decimal"') + '</div><div class="acts"><button class="btn solid" data-kitadd>Add it</button></div>' +
    '<p class="q">Kit on the job goes on your invoice as its own lines, apart from your labour, and the hired items go on the kit cover sheet with the insurance.</p>';
}

/* The three things made for each job, as pages you can add to. */
function madeView(i) {
  var j = job(), f = j.f[i], k = j.k + i; D.made = D.made || {}; var mine = D.made[k] || [];
  return '<p class="lede-s">' + esc(f[1]) + '</p><div class="rows">' + f[2].concat(mine).map(function (r) { return '<div class="row static"><span>' + esc(r[0]) + '</span><span class="tag' + (r[2] === "amber" ? " amb" : r[2] === "q" ? "" : " ok") + '">' + esc(r[1]) + "</span></div>"; }).join("") + "</div>" +
    '<div class="part">Add one</div><div class="grid2">' + field("md-a", "What", "", "text") + field("md-b", "Detail", "", "text") + '</div><div class="acts"><button class="btn solid" data-madeadd="' + i + '">Add it</button></div>';
}
function deptTools() {
  var j = job(), k = jk(), out = []; if (!j) return out;
  var g = "For " + j.pl;
  if (FLOATSAMPLE[k] && k !== "pm") out.push({ k: "t-float", n: "Float and receipts", g: g, fn: floatView });
  if (KITSAMPLE[k]) out.push({ k: "t-kit", n: k === "sound" ? "Sound package" : k === "dit" ? "Cart and drives" : "Kit and day fees", g: g, fn: kitView });
  j.f.forEach(function (f, i) { out.push({ k: "t-made" + i, n: f[0].replace(/\.$/, ""), g: g, fn: function () { return madeView(i); } }); });
  return out;
}
function deptCard() {
  var k = jk();
  if (FLOATSAMPLE[k] && k !== "pm") { var F = floatData(), sp = floatSpent(), r = F.items.filter(function (x) { return x.ret === "return"; }).length;
    return '<div class="diary"><div class="edge"><span class="part">Your float</span><span class="part">' + F.items.length + ' receipts</span></div><div class="facts"><span><i>Left</i>' + pounds(Math.max(0, F.issued - sp)) + '</span><span><i>Spent</i>' + pounds(sp) + '</span><span><i>To return</i>' + r + '</span></div><div class="acts"><button class="btn solid sm" data-fsnap>Snap a receipt</button><button class="btn sm" data-tab="t-float">See the float</button></div></div>'; }
  if (KITSAMPLE[k]) { var K = kitData(), on = K.items.filter(function (x) { return x.on; });
    return '<div class="diary"><div class="edge"><span class="part">Your kit</span><span class="part">' + on.length + ' on this job</span></div><div class="facts"><span><i>Kit a day</i>' + money(on.reduce(function (a, x) { return a + num(x.fee); }, 0)) + '</span><span><i>Items</i>' + K.items.length + '</span><span><i>Hired in</i>' + K.items.filter(function (x) { return /^Hired/.test(x.src); }).length + '</span></div><div class="acts"><button class="btn sm" data-tab="t-kit">See your kit</button></div></div>'; }
  return "";
}
function deptClick(b) {
  var d = b.dataset;
  if (b.hasAttribute("data-fsnap")) { openSheet(snapSheet()); return true; }
  if (b.hasAttribute("data-fsave")) {
    var amt = num(val("fs-amt")), what = val("fs-what"); if (!amt || !what) { banner("Add what it was and the amount."); return true; }
    var f = $("fs-photo") && $("fs-photo").files[0], cat = FLOATCAT[jk()] || "Job";
    floatData().items.unshift({ id: uid(), date: iso(today()), what: what, amt: amt, cat: cat + ": " + (val("fs-cat") || "General"), sup: val("fs-sup") || "Shop", ret: val("fs-ret"), photo: !!f });
    demoSave(); closeSheet(); render(); banner("On the float. " + pounds(Math.max(0, floatData().issued - floatSpent())) + " left."); return true;
  }
  if (d.fret) { var x = floatData().items.find(function (y) { return y.id === d.fret; }); if (x) { x.ret = "returned"; demoSave(); render(); banner("Refund logged. Back on the float."); } return true; }
  if (b.hasAttribute("data-fsend")) { DRAFT = floatMail(); saveFile(stamp() + "-float.csv", "text/csv", floatCSV()); floatData().sent = iso(today()); demoSave(); openSheet(draftSheet(DRAFT, "Reconciliation drafted")); return true; }
  if (b.hasAttribute("data-ftop")) { var F = floatData(); DRAFT = { to: "production@example.com", subject: "Float top-up, " + ((job() || {}).n || ""), body: "Hi,\n\nI've spent " + pounds(floatSpent()) + " of my " + pounds(F.issued) + " float, receipts attached. Could you top it up by " + pounds(Math.max(100, Math.ceil(floatSpent() / 50) * 50)) + "?\n\nThanks" }; openSheet(draftSheet(DRAFT, "Top-up drafted")); return true; }
  if (d.kiton) { var it = kitData().items.find(function (y) { return y.id === d.kiton; }); if (it) { it.on = !it.on; demoSave(); render(); } return true; }
  if (b.hasAttribute("data-kitadd")) { var n = val("kt-item"); if (!n) { banner("Add the item."); return true; } kitData().items.push({ id: uid(), item: n, fee: num(val("kt-fee")), src: "Yours", on: true }); demoSave(); render(); banner("Added, and on this job."); return true; }
  if (d.madeadd) { var a = val("md-a"); if (!a) { banner("Add what it is."); return true; } var key = jk() + d.madeadd; D.made = D.made || {}; (D.made[key] = D.made[key] || []).push([a, val("md-b") || "Added", ""]); demoSave(); render(); banner("Added."); return true; }
  return false;
}
/* ---------- make it yours: your own pages, and a sidebar you can pin and hide ---------- */
var PAGE_TPL = {
  costume: [["Fittings", "Cast, Date, Size, Notes"], ["Continuity", "Scene, Character, Look, Photo"]],
  art: [["Props list", "Prop, Scene, Source, Status"], ["Set dressing", "Set, Item, Hired from, Return by"]],
  hmu: [["Looks by cast", "Cast, Scene, Look, Products"], ["Allergies", "Cast, Allergy, Notes"]],
  camera: [["Camera reports", "Roll, Scene, Take, Lens, Notes"], ["Lens list", "Lens, Serial, Owner"]],
  dop: [["Shot list", "Scene, Shot, Lens, Notes"], ["Lighting plots", "Scene, Units, Power, Notes"]],
  dit: [["Media log", "Card, Camera, Size, Backed up"], ["Drive register", "Drive, Size, Job, With"]],
  gaffer: [["Power plan", "Location, Supply, Load, Notes"], ["Team hours", "Name, Call, Wrap, Notes"]],
  spark: [["Rig log", "Location, Units, Day, Notes"]], grip: [["Rig log", "Rig, Location, Day, Notes"]],
  sound: [["Sound reports", "Roll, Scene, Take, Tracks, Notes"], ["Radio mics", "Cast, Pack, Channel"]],
  editor: [["Review notes", "Round, Timecode, Note, Done"], ["Deliverables", "Version, Format, Due, Sent"]],
  locations: [["Recce log", "Location, Contact, Fee, Photos"], ["Neighbour letters", "Address, Sent, Reply"]],
  runner: [["Errands", "What, For, Cost, Done"]],
  prod: [["Pitch tracker", "Brand, Agency, Treatment due, Status"], ["Supplier list", "Supplier, Contact, Terms"]],
  pm: [["Crew contacts", "Name, Role, Phone, Dietary"], ["Risk checks", "Location, Risk, Owner, Done"]],
  dir: [["Treatments", "Brand, Due, Status, Fee"]]
};
function pages() { return D.custom || (D.custom = []); }
function layout() { return D.layout || (D.layout = { hide: [], pin: [] }); }
function customTools() { return pages().map(function (p) { return { k: "t-c-" + p.id, n: p.name, g: "Your pages", fn: function () { return customView(p.id); }, mine: true }; }); }
function shaped(list) {
  var L = layout(), out = list.filter(function (t) { return L.hide.indexOf(t.k) < 0; }), pin = [];
  L.pin.forEach(function (k) { var t = out.find(function (x) { return x.k === k; }); if (t) pin.push(Object.assign({}, t, { g: "Pinned" })); });
  return pin.concat(out.filter(function (t) { return L.pin.indexOf(t.k) < 0; }));
}
function customView(id) {
  var p = pages().find(function (x) { return x.id === id; }); if (!p) return "";
  return '<div class="rows">' + (p.rows.length ? p.rows.map(function (r, ri) { return '<div class="row static cp-r"><span class="mail-t">' + esc(r[0] || "") + '<span class="sub q">' + p.cols.slice(1).map(function (c, i) { return r[i + 1] ? esc(c) + ": " + esc(r[i + 1]) : ""; }).filter(Boolean).join(" · ") + '</span></span><button class="lnk" data-cpdel="' + id + ":" + ri + '" aria-label="Remove">Remove</button></div>'; }).join("") : '<div class="row static"><span class="q">Nothing here yet. Add the first one below.</span></div>') + "</div>" +
    '<div class="part">Add one</div><div class="grid2">' + p.cols.map(function (c, i) { return field("cp-" + i, esc(c), "", /date|due|when|by$/i.test(c) ? "date" : "text"); }).join("") + '</div><div class="acts"><button class="btn solid" data-cpadd="' + id + '">Add it</button></div>' +
    '<p class="q">' + p.cols.length + " columns · " + p.rows.length + ' rows. It\'s a tab in your sheet, so you can sort, filter and share it there too. <button class="lnk" data-cpkill="' + id + '">Delete this page</button></p>';
}
/* Describe it: plain words in, a page out. The preview reads the words for the usual things; the pilot does it properly. */
var DESC_COLS = [[/\b(date|day|when|due|by)\b/, "Date"], [/\b(cost|price|£|amount|fee|spend|paid)\b/, "Cost"], [/\b(who|person|name|crew|contact)\b/, "Who"], [/\b(actor|actors|cast|talent|character)\b/, "Cast"], [/\b(size|sizes|measure)/, "Size"], [/\b(scene|scenes|shot)\b/, "Scene"], [/\b(location|address|where|place)\b/, "Location"], [/\b(photo|picture|image)/, "Photo"], [/\b(status|done|tick|approved|sent|returned)\b/, "Status"], [/\b(phone|email|number)\b/, "Contact"], [/\b(supplier|shop|hire|vendor)\b/, "Supplier"], [/\b(time|call|wrap|hours?)\b/, "Time"], [/\b(serial|kit|item|prop|props)\b/, "Item"]];
function fromWords(t) {
  var w = t.toLowerCase(), cols = [];
  DESC_COLS.forEach(function (c) { if (c[0].test(w) && cols.indexOf(c[1]) < 0) cols.push(c[1]); });
  var m = w.match(/(?:track|log|list|keep|record|note|tick off|manage|plan)\s+(?:a\s+|an\s+|list\s+|log\s+|record\s+|of\s+|all\s+|my\s+|the\s+|our\s+|each\s+|every\s+)*([a-z][a-z \-]{2,24}?)(?=\s+(?:for|with|by|on|and|per|that|so|from|to|in)\b|[.,]|$)/), name = m ? m[1] : (w.split(/\s+/).filter(function (x) { return x.length > 3; })[0] || "My page");
  name = name.trim(); name = name.charAt(0).toUpperCase() + name.slice(1);
  if (cols.indexOf("Item") < 0 && cols.indexOf("Who") < 0 && cols.indexOf("Cast") < 0) cols.unshift(name.replace(/s$/, ""));
  var lead = ["Cast", "Who", "Item"].find(function (c) { return cols.indexOf(c) > 0; }); if (lead) { cols.splice(cols.indexOf(lead), 1); cols.unshift(lead); }
  if (cols.indexOf("Notes") < 0) cols.push("Notes");
  return { name: name.slice(0, 28), cols: cols.slice(0, 6) };
}
function addPageSheet() {
  var T = PAGE_TPL[jk()] || [["Checklist", "Item, Who, Done"]];
  return "<h2>Add your own page.</h2><p class=\"q\">Anything Systems doesn't do yet. Pick a start or make your own.</p>" +
    '<div class="part">Made for ' + esc((job() || {}).pl || "you") + '</div><div class="pills">' + T.concat([["Checklist", "Item, Who, Done"]]).filter(function (x, i, a) { return a.findIndex(function (y) { return y[0] === x[0]; }) === i; }).map(function (t) { return '<button class="pill" data-cptpl="' + esc(t[0]) + "|" + esc(t[1]) + '">' + esc(t[0]) + "</button>"; }).join("") + "</div>" +
    '<div class="field"><label for="cp-desc">Or say what you need</label><textarea id="cp-desc" rows="2" placeholder="e.g. Track fittings for each actor with sizes, date and a photo"></textarea></div><div class="acts"><button class="btn" data-cpdesc>Build it from that</button></div>' +
    field("cp-name", "Page name", "", "text", "e.g. Fittings") + field("cp-cols", "Columns, with commas", "", "text", "e.g. Cast, Date, Size, Notes") +
    '<div class="acts"><button class="btn solid wide" data-cpmake>Add the page</button></div>';
}
function customiseSheet() {
  var L = layout(), all = (isProd() ? TOOLS_P : TOOLS_C).concat(deptTools()).concat(customTools());
  return "<h2>Your sidebar.</h2><p class=\"q\">Pin what you use every day. Hide what you don't. Nothing is deleted.</p><div class=\"rows\">" + all.map(function (t) {
    var pin = L.pin.indexOf(t.k) >= 0, hid = L.hide.indexOf(t.k) >= 0;
    return '<div class="row static cz-r"><span class="mail-t">' + esc(t.n) + '<span class="sub q">' + esc(t.g) + '</span></span><span class="cz-a"><button class="btn sm' + (pin ? " solid" : "") + '" data-czpin="' + t.k + '">' + (pin ? "Pinned" : "Pin") + '</button><button class="btn sm' + (hid ? " solid" : "") + '" data-czhide="' + t.k + '">' + (hid ? "Hidden" : "Hide") + "</button></span></div>";
  }).join("") + '</div><div class="acts"><button class="btn" data-addpage>Add your own page</button><button class="btn solid" data-close>Done</button></div>';
}
function customClick(b) {
  var d = b.dataset;
  if (b.hasAttribute("data-addpage")) { openSheet(addPageSheet()); return true; }
  if (b.hasAttribute("data-customise")) { openSheet(customiseSheet()); return true; }
  if (d.cptpl) { var t = d.cptpl.split("|"); $("cp-name").value = t[0]; $("cp-cols").value = t[1]; return true; }
  if (b.hasAttribute("data-cpdesc")) { var t0 = val("cp-desc"); if (!t0) { banner("Say what the page is for."); return true; } var g = fromWords(t0); $("cp-name").value = g.name; $("cp-cols").value = g.cols.join(", "); banner("Here's a start. Change anything, then add it."); return true; }
  if (b.hasAttribute("data-cpmake")) {
    var n = val("cp-name"), cols = val("cp-cols").split(",").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 6);
    if (!n) { banner("Give the page a name."); return true; } if (!cols.length) cols = ["What", "Notes"];
    var p = { id: uid(), name: n.slice(0, 28), cols: cols, rows: [] }; pages().push(p); demoSave(); closeSheet(); S.tab = "t-c-" + p.id; render(); window.scrollTo(0, 0); banner(p.name + " added to your sidebar."); return true;
  }
  if (d.cpadd) { var p2 = pages().find(function (x) { return x.id === d.cpadd; }), r = p2.cols.map(function (c, i) { return val("cp-" + i); }); if (!r.some(Boolean)) { banner("Fill in at least one."); return true; } p2.rows.unshift(r); demoSave(); render(); banner("Added."); return true; }
  if (d.cpdel) { var a = d.cpdel.split(":"), p3 = pages().find(function (x) { return x.id === a[0]; }); p3.rows.splice(+a[1], 1); demoSave(); render(); return true; }
  if (d.cpkill) { D.custom = pages().filter(function (x) { return x.id !== d.cpkill; }); demoSave(); S.tab = "home"; render(); banner("Page deleted."); return true; }
  if (d.czpin || d.czhide) {
    var L = layout(), k = d.czpin || d.czhide, arr = d.czpin ? L.pin : L.hide, i = arr.indexOf(k);
    if (i >= 0) arr.splice(i, 1); else { arr.push(k); var other = d.czpin ? L.hide : L.pin, j = other.indexOf(k); if (j >= 0) other.splice(j, 1); }
    demoSave(); render(); openSheet(customiseSheet()); return true;
  }
  return false;
}
function tools() { return shaped((mode === "google" ? TOOLS_REAL : (isProd() ? TOOLS_P : TOOLS_C).concat(deptTools())).concat(customTools()).concat(TOOLS_HELP)); }
function tool(k0) { return (mode === "google" ? TOOLS_REAL : (isProd() ? TOOLS_P : TOOLS_C).concat(deptTools())).concat(customTools()).concat(TOOLS_HELP).find(function (t) { return t.k === k0; }); }
function toolView() {
  var t = tool(S.tab); if (!t) { S.tab = "home"; return home(); }
  return '<div class="hd"><div class="hd-l"><span class="part">' + esc(t.g) + "</span><h1>" + esc(t.n) + '.</h1></div>' + (mode === "google" ? "" : '<span class="tag">Preview</span>') + '</div><div class="tool">' + t.fn() + "</div>";
}
function sideTools() {
  var gs = []; tools().forEach(function (t) { if (gs.indexOf(t.g) < 0) gs.push(t.g); });
  return gs.map(function (g) { return '<div class="side-g">' + esc(g) + "</div>" + tools().filter(function (t) { return t.g === g; }).map(function (t) { return '<button data-tab="' + t.k + '" class="' + (S.tab === t.k ? "on" : "") + '"><span>' + esc(t.n) + '</span><span class="q"></span></button>'; }).join(""); }).join("") + '<div class="side-g">Make it yours</div><button data-addpage><span>Add your own page</span><span class="q">+</span></button><button data-customise><span>Pin and hide pages</span><span class="q"></span></button>';
}
function toolList() {
  var gs = []; tools().forEach(function (t) { if (gs.indexOf(t.g) < 0) gs.push(t.g); });
  return '<div class="tool-list">' + gs.map(function (g) { return '<div class="part">' + esc(g) + '</div><div class="rows">' + tools().filter(function (t) { return t.g === g; }).map(function (t) { return '<button class="row" data-tab="' + t.k + '"><span>' + esc(t.n) + '</span><span class="q">→</span></button>'; }).join("") + "</div>"; }).join("") + '<div class="part">Make it yours</div><div class="rows"><button class="row" data-addpage><span>Add your own page</span><span class="q">+</span></button><button class="row" data-customise><span>Pin and hide pages</span><span class="q">→</span></button></div></div>';
}
/* A sheet that re-opens the page it was opened from redraws the page instead. */
var openSheet0 = openSheet;
openSheet = function (h) { var t = tool(S.tab); if (t && $("sheet") && !$("sheet").classList.contains("on")) { try { if (h === t.fn() || strip(h) === t.fn() || h === findCrew() && t.k === "t-dir") { render(); return; } } catch (e) {} } openSheet0(h); };
function toolClick(b) {
  var d = b.dataset;
  if (d.mail) { openSheet(mailSheet(d.mail)); return true; }
  if (d.maildraft) { var m = inbox().find(function (x) { return x.id === d.maildraft; }); DRAFT = m.draft; openSheet(draftSheet(DRAFT, "Reply drafted")); return true; }
  return false;
}
var VIEWS = { home: home, bookings: bookings, money: moneyScr, more: more };
/* Trying it with sample data: always show the way back to the site and the waitlist. */
function siteUrl() { return /\/preview\/systems-app\//.test(location.pathname) ? "../systems-site-v5/" : /^https?:/.test(location.protocol) && location.hostname !== "localhost" && !/claude/.test(location.hostname) ? "/" : "https://eltio.systems/"; }
/* Switch job: a menu under the button, every job grouped by department, and any other job typed in. */
var JGROUPS = [["Production", ["prod", "pm", "dir"]], ["Camera", ["dop", "camera", "dit"]], ["Lighting and grip", ["gaffer", "spark", "grip"]], ["Sound and post", ["sound", "editor"]], ["Art, costume, hair and make-up", ["art", "costume", "hmu"]], ["Locations and runners", ["locations", "runner"]]];
var JGUESS = [[/line producer|producer|exec/, "prod"], [/production (manager|coord)|coordinator|\bpm\b|\bad\b|assistant director|1st ad|first ad|script sup/, "pm"], [/dop|\bdp\b|cinematographer|director of photography|camera op|steadicam|operator/, "dop"], [/director/, "dir"], [/gaffer|best boy/, "gaffer"], [/spark|electric|rigger|lighting/, "spark"], [/grip|dolly|crane/, "grip"], [/focus|\bac\b|camera ass|clapper|loader|camera/, "camera"], [/\bdit\b|data|media/, "dit"], [/sound|boom|mixer|audio/, "sound"], [/art|design|set dress|props|buyer|construct|scenic|graphic/, "art"], [/costume|wardrobe|stylist|dresser/, "costume"], [/make|hair|hmu|mua|prosthetic/, "hmu"], [/location|unit manager|marshal/, "locations"], [/edit|colou?r|vfx|grade|post|online|motion|anim/, "editor"], [/runner|\bpa\b|assistant|driver/, "runner"]];
function jguess(t) { t = t.toLowerCase(); for (var i = 0; i < JGUESS.length; i++) if (JGUESS[i][0].test(t)) return JGUESS[i][1]; return "runner"; }
function jobMenu() {
  var cur = D && D.settings ? D.settings.job : "", nm = D && D.settings ? D.settings.jobName : "";
  return '<div class="jmenu" id="jmenu" role="menu"><div class="jm-in">' + JGROUPS.map(function (g) {
    return '<div class="jm-g"><span class="part">' + esc(g[0]) + "</span>" + g[1].map(function (k) { var j = JOBS.find(function (x) { return x.k === k; }); return j ? '<button role="menuitem" data-job="' + k + '" class="' + (k === cur && !nm ? "on" : "") + '">' + esc(j.n) + "</button>" : ""; }).join("") + "</div>";
  }).join("") + '</div><form class="jm-other" id="jmOther"><label class="part" for="jmIn">Not here? Type your job</label><div class="jm-row"><input id="jmIn" list="jmList" placeholder="e.g. Props buyer, colourist" autocomplete="off" maxlength="32" value="' + esc(nm || "") + '"><button class="btn solid sm" type="submit">Build it</button></div><datalist id="jmList">' + ["Focus puller", "Steadicam operator", "Best boy", "Rigger", "Props buyer", "Set dresser", "Production designer", "Wardrobe supervisor", "Prosthetics artist", "Boom operator", "Colourist", "VFX artist", "Script supervisor", "1st AD", "Unit manager", "Driver"].map(function (x) { return '<option value="' + x + '">'; }).join("") + "</datalist></form></div>";
}
function toggleJobMenu(btn) {
  var m = $("jmenu"); if (m) { m.remove(); return; }
  var bar = btn.closest(".demobar"); if (!bar) return; bar.insertAdjacentHTML("beforeend", jobMenu());
  var f = $("jmOther"); f.addEventListener("submit", function (e) { e.preventDefault(); var t = val("jmIn"); if (!t) return; customJob(t); });
}
function customJob(t) {
  var k = jguess(t), nm = t.trim().replace(/\s+/g, " ").slice(0, 32); nm = nm.charAt(0).toUpperCase() + nm.slice(1);
  if (!startJob(k)) return; D.settings.jobName = nm; demoSave(); render(); banner("Built for a " + nm.toLowerCase() + ", from the " + JOBS.find(function (x) { return x.k === k; }).n.toLowerCase() + " tools.");
}
document.addEventListener("click", function (e) { var m = $("jmenu"); if (m && !m.contains(e.target) && !e.target.closest("[data-switchjob]")) m.remove(); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && $("jmenu")) $("jmenu").remove(); });
function demoBar() { return '<div class="demobar"><span class="part">Sample data · nothing is saved</span><span class="db-l"><button class="lnk jm-btn" data-switchjob aria-haspopup="menu">' + (job() ? "As " + esc(job().n.toLowerCase()) : "Switch job") + ' <span aria-hidden="true">▾</span></button><a class="lnk" href="' + siteUrl() + '">Back to the site</a><a class="btn sm solid" href="' + siteUrl() + '#waitlist">Join the waitlist</a></span></div>'; }
function render() {
  paintSky();
  var signedIn = !!mode, ready = signedIn && D.settings && D.settings.name && (mode === "demo" || G.sheetId);
  $("main").innerHTML = (mode === "demo" && ready ? demoBar() : "") + (!signedIn ? welcome() : SCAN.stage ? scanScreen() : OB.active && mode === "google" ? obScreen() : !ready ? setup() : tipFor(S.tab) + (VIEWS[S.tab] || toolView)() + watchLine());
  if (ready && mode === "demo" && !flag("eltio-systems-tour-1") && !$("tour")) showTour(0);
  var n = ready ? todo().length : 0;
  $("side").innerHTML = ready ? '<div class="who"><span>' + esc(D.settings.trading || D.settings.name) + '</span><span class="q">Eltio Systems</span></div>' + Object.keys(TABN).map(function (t) { return '<button data-tab="' + t + '" class="' + (S.tab === t ? "on" : "") + '"><span>' + TABN[t] + '</span><span class="q">' + (t === "home" && n ? n : "") + "</span></button>"; }).join("") + sideTools() + '<button class="btn solid add" data-addbooking>Add a booking</button>' : "";
  $("tabs").innerHTML = ready ? '<nav class="tabs" aria-label="Sections">' + Object.keys(TABN).map(function (t) { return '<button data-tab="' + t + '" class="' + (S.tab === t || t === "more" && /^t-/.test(S.tab) ? "on" : "") + '"><i></i>' + TABN[t] + (t === "home" && n ? '<span class="badge">' + n + "</span>" : "") + "</button>"; }).join("") + '</nav><button class="fab" data-addbooking aria-label="Add a booking">+</button>' : "";
}

/* ---------- scan: read the last few months of email on this device, lay out the work ---------- */
/* Only subjects, senders, dates and Gmail's short preview are read, in this browser. Nothing is sent and no email is kept. What the person ticks is added to their own sheet. */
var SCAN = { stage: "", steps: [], found: null, err: "", todos: [], at: "" };
var SCAN_Q = [
  { k: "cs", n: "Call sheets", q: '(subject:("call sheet" OR callsheet OR "call-sheet") OR filename:callsheet OR filename:"call sheet")', days: 75 },
  { k: "bk", n: "Holds, pencils and bookings", q: 'subject:(hold OR pencil OR pencilled OR availability OR avails OR "are you free" OR booking OR booked OR confirmed OR confirmation OR "start date")', days: 75 },
  { k: "inv", n: "Invoices you've sent", q: "in:sent (subject:invoice OR filename:invoice)", days: 200 },
  { k: "paid", n: "Payments and remittances", q: 'subject:(remittance OR "payment advice" OR "payment sent" OR "payment confirmation" OR "has been paid" OR paid)', days: 200 },
  { k: "do", n: "Timesheets, start packs and POs", q: 'subject:(timesheet OR "time sheet" OR timecard OR "start pack" OR "start form" OR "crew form" OR "purchase order" OR "PO number" OR "PO #")', days: 60 }
];
var FREEMAIL = /^(gmail|googlemail|hotmail|outlook|live|icloud|me|mac|yahoo|aol|btinternet|sky|proton|protonmail|msn|virginmedia|talktalk)$/;
var MONS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function scanKey() { return "sy-scan-" + (G.email || "me"); }
function scanLoad() { try { var x = JSON.parse(localStorage.getItem(scanKey()) || "null"); if (x) { SCAN.todos = x.todos || []; SCAN.mail = x.mail || []; SCAN.at = x.at || ""; } } catch (e) {} }
function scanSaveLocal() { try { localStorage.setItem(scanKey(), JSON.stringify({ at: SCAN.at, todos: SCAN.todos, mail: SCAN.mail || [] })); } catch (e) {} }
function hdr(m, n) { var h = ((m.payload || {}).headers || []).find(function (x) { return x.name.toLowerCase() === n; }); return h ? h.value : ""; }
function party(v) {
  var m = String(v || "").split(",")[0].match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/) || [null, "", String(v || "").trim()];
  var name = m[1].trim(), mail = m[2].trim().toLowerCase(), dom = (mail.split("@")[1] || "").split(".");
  var lab = dom[0] === "mail" || dom[0] === "email" ? dom[1] : dom[0];
  var co = lab && !FREEMAIL.test(lab) ? lab.replace(/[-_]/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : "";
  return { name: name || mail.split("@")[0], mail: mail, co: co || name || mail };
}
/* A date written in the subject or preview: "Thu 6 Nov", "6th-7th November", "Nov 6", "06/11". The year is the one nearest the email. */
function findDate(text, sent) {
  var t = " " + String(text).toLowerCase() + " ", out = null, M = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
  var near = function (d, m, y) {
    if (d < 1 || d > 31 || m < 0 || m > 11) return null;
    if (y) { y = +y; if (y < 100) y += 2000; return new Date(y, m, d); }
    var best = null; [-1, 0, 1].forEach(function (k) { var c = new Date(sent.getFullYear() + k, m, d), diff = (c - sent) / 864e5; if (diff > -60 && diff < 300 && (!best || Math.abs(diff) < Math.abs((best - sent) / 864e5))) best = c; });
    return best;
  };
  var a = t.match(new RegExp("\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|–|to|&|and)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+" + M + "(?:\\s+(\\d{2,4}))?"));
  if (a) { var mi = MONS.indexOf(a[3]), s1 = near(+a[1], mi, a[4]), e1 = near(+a[2], mi, a[4]); if (s1) return { start: s1, end: e1 && e1 > s1 ? e1 : null }; }
  a = t.match(new RegExp("\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?" + M + "(?:\\s+(\\d{4}|\\d{2}(?!:)))?"));
  if (a) { out = near(+a[1], MONS.indexOf(a[2]), a[3]); if (out) return { start: out }; }
  a = t.match(new RegExp("\\b" + M + "\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?"));
  if (a) { out = near(+a[2], MONS.indexOf(a[1]), a[3]); if (out) return { start: out }; }
  a = t.match(/\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/);
  if (a && !/\d[\/.]\d+[\/.]\d+[\/.]/.test(a[0])) { out = near(+a[1], +a[2] - 1, a[3]); if (out) return { start: out }; }
  return null;
}
function amountIn(t) { var m = String(t).match(/£\s?([\d,]+(?:\.\d{2})?)/); return m ? m[1].replace(/,/g, "") : ""; }
function invNo(t) { var m = String(t).match(/\b(INV[-\s#]?[\w-]*\d[\w-]*|#\s?\d{2,})/i); return m ? m[1].replace(/\s/g, "") : ""; }
function jobName(subj, who) {
  var s = String(subj).replace(/^\s*((re|fwd?|fw|aw)\s*:\s*)+/i, "");
  s = s.replace(/\b(call ?sheets?|callsheet|invoice|inv[-#]?\s?\d+|remittance( advice)?|payment (advice|sent|confirmation)|has been paid|timesheets?|time sheets?|timecard|start (pack|form)|crew form|purchase order|po (number|#)\s*\w*|hold|pencil(led)?|avails?|availability|are you free|booking|booked|confirmed|confirmation|v\d+|version \d+|attached|please|thanks|shoot|shooting|shoot day|recce|prep|pre-?light|wrap|tech scout|ppm)\b/gi, " ");
  s = s.replace(new RegExp("\\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\\b|\\b\\d{1,2}(st|nd|rd|th)?\\b|\\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\b|\\d{1,2}[\\/.]\\d{1,2}([\\/.]\\d{2,4})?", "gi"), " ");
  s = s.replace(/[|:\-–—_()\[\]#,!.?]+/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/^((for|on|re|the|of|about|your|our|a|an|and|to|send|please)\s+)+/i, "").replace(/(\s+(day|days|for|on|the|and|to|of|at|by|from|in))+$/i, "").trim();
  if (s.length < 3) s = who + " job";
  return s.charAt(0).toUpperCase() + s.slice(1, 60);
}
function gm(path) { return api("https://gmail.googleapis.com/gmail/v1/users/me/" + path); }
function pool(items, n, fn) {
  var i = 0, out = []; var next = function () { if (i >= items.length) return Promise.resolve(); var k = i++; return fn(items[k]).then(function (r) { out[k] = r; }, function () {}).then(next); };
  var runners = []; for (var j = 0; j < Math.min(n, items.length); j++) runners.push(next()); return Promise.all(runners).then(function () { return out; });
}
function runScan(o) {
  o = o || {};
  var useMail = o.mail !== false && !o.fwd, useFwd = !!o.fwd, useCal = !!o.cal, bank = o.bank || [];
  SCAN.stage = "run"; SCAN.err = ""; SCAN.steps = [];
  if (useCal) SCAN.steps.push({ n: "Your calendar", c: 0, st: "", u: ["event", "events"], cal: 1 });
  if (useMail) SCAN_Q.forEach(function (q) { SCAN.steps.push({ n: q.n, c: 0, st: "", u: ["email", "emails"], q: q }); });
  if (useFwd) SCAN.steps.push({ n: "Work email forwarded to Systems", c: 0, st: "", u: ["email", "emails"], fwd: 1 });
  if (bank.length) SCAN.steps.push({ n: "Bank statements", c: 0, st: "", u: ["payment", "payments"], bank: 1 });
  SCAN.steps.push({ n: "Matching it all up", c: 0, st: "", u: ["", ""], fin: 1 });
  S.tab = "home"; render(); window.scrollTo(0, 0);
  var seen = {}, mails = [], cal = [], go = Promise.resolve();
  SCAN.steps.forEach(function (x) {
    go = go.then(function () {
      x.st = "on"; render();
      if (x.cal) return wantScope("cal").then(calRead).then(function (items) { cal = items; x.c = items.length; x.st = "ok"; });
      if (x.q) return wantScope("gmail").then(function () { return gm("messages?maxResults=40&q=" + encodeURIComponent(x.q.q + " newer_than:" + x.q.days + "d -in:chats -category:promotions -category:social")); }).then(function (r) {
        var ids = (r.messages || []).filter(function (m) { if (seen[m.id]) return false; seen[m.id] = 1; return true; });
        return pool(ids, 6, function (m) { return gm("messages/" + m.id + "?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date&fields=id,threadId,labelIds,snippet,internalDate,payload/headers"); })
          .then(function (full) { full.filter(Boolean).forEach(function (m) { m.k = x.q.k; mails.push(m); }); x.c = full.filter(Boolean).length; x.st = "ok"; });
      });
      if (x.fwd) return fwdPull().then(function (p) { var old = Date.now() - 200 * 864e5; p.filter(function (m) { return +m.internalDate > old; }).forEach(function (m) { mails.push(m); }); x.c = p.length; x.st = "ok"; });
      if (x.bank) { x.c = bank.length; x.st = "ok"; return null; }
      if (x.fin) { SCAN.found = sortAll(mails, cal, bank); x.st = "ok"; }
    });
  });
  return go.then(function () { SCAN.stage = "review"; flag("sy-scan-seen", "1"); render(); window.scrollTo(0, 0); })
    .catch(function (e) { var msg = e && e.message || String(e); if (OB.active) { SCAN.stage = ""; OB.err = msg; OB.step = 1; obSave(); } else { SCAN.stage = "intro"; SCAN.err = msg; } render(); });
}
function gmailReady() { return wantScope("gmail"); }
/* Turn the emails into bookings, invoices and things to do. Rough on purpose: every row is shown to the person before anything is added. */
function sortMail(mails) {
  var t = today(), B = {}, I = {}, P = [], T = [], mail = [];
  mails.forEach(function (m) {
    var subj = hdr(m, "subject"), sentByMe = (m.labelIds || []).indexOf("SENT") >= 0, who = party(sentByMe ? hdr(m, "to") : hdr(m, "from"));
    var when = new Date(+m.internalDate || Date.now()), txt = subj + " " + (m.snippet || ""), low = txt.toLowerCase(), job = jobName(subj, who.co);
    mail.push({ id: m.id, th: m.threadId, subj: subj.slice(0, 120), who: who.co, at: iso(when), k: m.k, job: job });
    if (m.k === "paid" || /remittance|payment (advice|sent|made|confirmation)|has been paid|we(’|')?ve paid|we have paid/.test(low)) { if (!sentByMe) P.push({ who: who.co, at: iso(when), amt: amountIn(txt), no: invNo(txt) }); return; }
    if (m.k === "inv" || (/invoice/.test(subj.toLowerCase()) && sentByMe)) {
      if (!sentByMe) return;
      var no = invNo(subj) || invNo(m.snippet || "") || "", key = (no || who.co + job).toLowerCase();
      if (!I[key]) I[key] = { id: "si" + m.id, number: no || "", client: who.co, contact: who.mail, amount: amountIn(txt), issued: iso(when), due: iso(addDays(when, num(D.settings.terms) || 30)), paid: "", notes: "Found in your email: " + subj.slice(0, 80), th: m.threadId, pick: true };
      return;
    }
    if (m.k === "do" || /timesheet|time sheet|timecard|start (pack|form)|crew form|purchase order|po number/.test(low)) {
      if (sentByMe) return;
      var what = /timesheet|time sheet|timecard/.test(low) ? "Send your timesheet" : /purchase order|po number/.test(low) ? "Check the PO" : "Fill in the start pack";
      if (daysBetween(when, t) <= 30) T.push({ id: "st" + m.threadId, t: what + " for " + job, who: who.co, at: iso(when), th: m.threadId, pick: true });
      return;
    }
    var d = findDate(txt, when), cs = m.k === "cs" || /call ?sheet/.test(low);
    var st = cs || /\b(confirmed|you're booked|you are booked|booking confirmation|confirming)\b/.test(low) ? "Confirmed" : /\b(second hold|2nd hold)\b/.test(low) ? "Second hold" : /\b(hold|first hold|1st hold)\b/.test(low) ? "First hold" : /pencil/.test(low) ? "Pencil" : /avail|are you free|free on/.test(low) ? "Pencil" : cs ? "Confirmed" : "";
    if (!st) return;
    var start = d ? d.start : null; if (start && daysBetween(start, t) > 45) return;
    var bkey = (job + "|" + (start ? iso(start) : who.co)).toLowerCase(), prev = B[bkey], rank = { Confirmed: 3, "First hold": 2, "Second hold": 1, Pencil: 0 };
    var row = { id: "sb" + m.id, start: start ? iso(start) : "", end: d && d.end ? iso(d.end) : "", client: who.co, production: job, contact: who.mail, status: st, rate: D.settings.rate || "", days: d && d.end ? String(daysBetween(d.start, d.end) + 1) : "1", agent: "", notes: "Found in your email: " + subj.slice(0, 80), terms: "", th: m.threadId, pick: !!start, cs: cs };
    if (!prev || rank[st] > rank[prev.status] || (!prev.start && row.start)) B[bkey] = prev ? Object.assign(row, { cs: row.cs || prev.cs }) : row;
  });
  /* A remittance from the same company after the invoice marks it paid. */
  Object.keys(I).forEach(function (k) { var v = I[k], p = P.find(function (x) { return (x.no && v.number && x.no.toLowerCase() === v.number.toLowerCase()) || (x.who === v.client && x.at >= v.issued && (!x.amt || !v.amount || x.amt === v.amount)); }); if (p) v.paid = p.at; });
  var bk = Object.keys(B).map(function (k) { return B[k]; }).sort(function (a, b) { return (a.start || "9") < (b.start || "9") ? -1 : 1; });
  var have = function (r) { return D.bookings.some(function (x) { return x.production.toLowerCase() === r.production.toLowerCase() && x.start === r.start; }); };
  return { bookings: bk.filter(function (r) { return !have(r); }), invoices: Object.keys(I).map(function (k) { return I[k]; }).filter(function (v) { return !D.invoices.some(function (x) { return v.number && x.number === v.number; }); }), todos: T, rem: P, mail: mail.sort(function (a, b) { return a.at < b.at ? 1 : -1; }).slice(0, 120), mails: mails.length };
}
function scanTodos() {
  return (SCAN.todos || []).filter(function (x) { return !x.done; }).map(function (x) { return { k: "mail", id: x.th, t: x.t, tag: x.who }; });
}
function gmailLink(th) { return "https://mail.google.com/mail/u/" + encodeURIComponent(G.email || "0") + "/#all/" + encodeURIComponent(th); }
function scanScreen() {
  var who = first(G.name || D.settings.name || "");
  if (SCAN.stage === "run") {
    var done = SCAN.steps.filter(function (x) { return x.st === "ok"; }).length, pct = Math.max(6, done / SCAN.steps.length * 100);
    return '<div class="hero scan"><p class="q">Reading on this device</p><h1>Finding your work.</h1>' +
      '<span class="bar scan-bar"><i style="width:' + pct.toFixed(0) + '%"></i></span>' +
      '<div class="rows">' + SCAN.steps.map(function (x) { return '<div class="row static scan-s ' + x.st + '"><span><i class="ck' + (x.st === "ok" ? " on" : "") + '"></i>' + esc(x.n) + '</span><span class="q">' + (x.st === "ok" ? (x.fin ? "Done" : x.c + " " + (x.u ? x.u[x.c === 1 ? 0 : 1] : "emails")) : x.st === "on" ? "Looking…" : "") + "</span></div>"; }).join("") + "</div>" +
      '<p class="q">' + (SCAN.steps.some(function (x) { return x.fwd; }) ? "Work emails from your Systems address, sorted on this device. They're cleared from the address once they're here." : "Subjects, senders, dates and amounts only, read on this device. Nothing is sent and nothing is kept by us.") + '</p></div>';
  }
  if (SCAN.stage === "review" && SCAN.found) {
    var F = SCAN.found, up = F.bookings.filter(function (b) { return !b.start || b.start >= iso(today()); }), past = F.bookings.filter(function (b) { return b.start && b.start < iso(today()); });
    var n = F.bookings.length + F.invoices.length + F.todos.length + (F.paid || []).length + (F.income || []).length + (F.costs || []).length;
    var ck = function (x) { return '<input type="checkbox" data-scanpick="' + x.id + '"' + (x.pick ? " checked" : "") + ">"; };
    var bRow = function (b) { return '<label class="row static scan-r">' + ck(b) + '<span class="up-t">' + esc(b.production) + '<span class="q">' + esc(b.client || "") + (b.cs ? " · call sheet" : b.src ? " · " + esc(b.src) : "") + (b.end ? " · to " + nice(b.end) : "") + '</span></span><span class="scan-a"><input type="date" data-scandate="' + b.id + '" value="' + esc(b.start) + '" aria-label="Date"><span class="tag' + (b.status === "Confirmed" ? " ok" : " amb") + '">' + esc(b.status) + "</span></span></label>"; };
    var iRow = function (v) { var bp = (F.paid || []).find(function (p) { return p.inv === v; }); return '<label class="row static scan-r">' + ck(v) + '<span class="up-t">' + esc(v.client) + '<span class="q">' + esc(v.number || "Invoice") + " · sent " + nice(v.issued) + (v.paid ? " · paid " + nice(v.paid) : bp ? " · paid " + nice(bp.date) + ", from your bank" : "") + '</span></span><span class="scan-a"><input type="text" inputmode="decimal" placeholder="£" data-scanamt="' + v.id + '" value="' + esc(v.amount) + '" aria-label="Amount"><span class="tag' + (v.paid || bp ? " ok" : "") + '">' + (v.paid || bp ? "Paid" : "Owed") + "</span></span></label>"; };
    var pRow = function (x) { return '<label class="row static scan-r">' + ck(x) + '<span class="up-t">' + esc((x.inv.number ? x.inv.number + ", " : "") + x.inv.client) + '<span class="q">' + pounds(x.amt) + " in on " + nice(x.date) + " · " + esc(x.desc.slice(0, 50)) + '</span></span><span class="tag ok">Mark paid</span></label>'; };
    var mRow = function (x) { return '<label class="row static scan-r">' + ck(x) + '<span class="up-t">' + esc(x.client) + '<span class="q">' + nice(x.date) + " · " + esc(x.desc.slice(0, 50)) + '</span></span><span class="tag">' + pounds(num(x.amount)) + "</span></label>"; };
    var cRow = function (x) { return '<label class="row static scan-r">' + ck(x) + '<span class="up-t">' + esc(x.item) + '<span class="q">' + nice(x.date) + '</span></span><span class="tag">' + pounds(num(x.amount)) + "</span></label>"; };
    var tRow = function (x) { return '<label class="row static scan-r">' + ck(x) + '<span class="up-t">' + esc(x.t) + '<span class="q">' + esc(x.who) + " · " + nice(x.at) + "</span></span></label>"; };
    var paidOld = (F.paid || []).filter(function (p) { return p.old; });
    var grp = function (h, sub, L, f) { return L.length ? '<div class="part">' + h + " · " + L.length + '</div><p class="q">' + sub + '</p><div class="rows">' + L.map(f).join("") + "</div>" : ""; };
    var read = [F.mails ? F.mails + (F.mails === 1 ? " email" : " emails") : "", F.events ? F.events + " calendar events" : "", F.bankN ? F.bankN + " bank lines" : ""].filter(Boolean).join(", ") || "Nothing connected";
    return '<div class="hero scan wide"><p class="q">Read ' + read + "</p><h1>" + (n ? "Here's your work." : "Nothing obvious yet.") + "</h1>" +
      (n ? '<p class="q">Untick anything that isn\'t right and fix any dates or amounts. Only what\'s ticked goes on your dashboard.</p>' : '<p class="q">' + (OB.active ? "Your dashboard starts empty. Type your next job in the box on Home and Systems takes it from there." : "We couldn\'t spot call sheets, holds or invoices. Add your next job by hand and Systems takes it from there.") + "</p>") +
      grp("Coming up", "Call sheets and calendar shoot days go in as booked. Holds and pencils go in as holds.", up, bRow) +
      grp("Recently worked", "Add these to log your hours and invoice them.", past, bRow) +
      grp("Invoices you sent", "We'll tell you when they're late and draft the chase.", F.invoices, iRow) +
      grp("Paid, from your bank", "Payments that match invoices already in Systems.", paidOld, pRow) +
      grp("Money in with no invoice", "Payments over £100 we couldn't match. Tick the ones that were work, so your totals and tax are right.", F.income || [], mRow) +
      grp("Work costs", "Travel, parking, kit and hire from your bank. Ticked ones go in your expenses, on the job they fall on.", F.costs || [], cRow) +
      grp("To do", "Asked for in your email. They go in Needs you.", F.todos, tRow) +
      '<div class="acts">' + (n ? '<button class="btn solid wide" data-scanadd>Add to my dashboard</button>' : OB.active ? '<button class="btn solid wide" data-scanadd>Open my dashboard</button>' : "") + (OB.active ? (n ? '<button class="btn wide" data-scanadd data-none>Skip, start empty</button>' : '<button class="btn wide" data-obback2>Back to connect</button>') : '<button class="btn wide" data-scandone>' + (n ? "Skip, start empty" : "Add a job by hand") + "</button>") + "</div>" +
      '<p class="q">Nothing was sent, changed or kept. Scan again any time from Help.</p></div>';
  }
  return '<div class="hero scan"><p class="q">' + (who ? "Hi " + esc(who) : "Welcome") + '</p><h1>Let\'s find your work.</h1>' +
    '<p class="q">Tap Scan and Systems looks back through the last few months of your email for call sheets, holds, invoices and payments, then lays out what\'s coming up, what you\'re owed and what needs doing.</p>' +
    (SCAN.err ? '<p class="note">' + esc(SCAN.err) + "</p>" : "") +
    '<button class="btn solid gbtn" data-scan>Scan my email</button>' +
    '<div class="rows forrows"><div class="row static"><span>Call sheets</span><span class="q">Your next jobs, booked</span></div><div class="row static"><span>Holds and pencils</span><span class="q">Your diary</span></div><div class="row static"><span>Invoices you sent</span><span class="q">What you\'re owed</span></div><div class="row static"><span>Remittances</span><span class="q">Marked paid</span></div><div class="row static"><span>Timesheets and start packs</span><span class="q">What to do next</span></div></div>' +
    '<p class="q">Google will ask you to let Systems read your email. It only reads subjects, senders and dates, on this device. It can\'t send, delete or change anything, and nothing is kept.</p>' +
    '<div class="acts"><button class="lnk" data-scanskip>Skip, I\'ll add things myself</button>' + tutLink(tutFor("scan")) + '</div></div>';
}
function scanAdd(none) {
  var F = SCAN.found || emptyFound(), on = {}; document.querySelectorAll("[data-scanpick]").forEach(function (c) { on[c.dataset.scanpick] = !none && c.checked; });
  document.querySelectorAll("[data-scandate]").forEach(function (i) { var b = F.bookings.find(function (x) { return x.id === i.dataset.scandate; }); if (b) b.start = i.value; });
  document.querySelectorAll("[data-scanamt]").forEach(function (i) { var v = F.invoices.find(function (x) { return x.id === i.dataset.scanamt; }); if (v) v.amount = i.value.replace(/[£,\s]/g, ""); });
  (F.paid || []).forEach(function (p) { if (!p.old && on[p.inv.id]) p.inv.paid = p.date; });
  var clean = function (r) { var o = Object.assign({}, r); delete o.th; delete o.pick; delete o.cs; delete o.src; o.id = uid(); return o; };
  var nb = F.bookings.filter(function (b) { return on[b.id] && b.start; }).map(clean), ni = F.invoices.filter(function (v) { return on[v.id]; }).map(clean);
  var oldPaid = (F.paid || []).filter(function (p) { return p.old && on[p.id]; });
  var inc = (F.income || []).filter(function (x) { return on[x.id]; }).map(function (x) { return { id: uid(), booking: "", number: "", client: x.client, contact: "", amount: x.amount, issued: x.date, due: x.date, paid: x.date, notes: "From your bank statement: " + x.desc.slice(0, 60) }; });
  var allB = D.bookings.concat(nb);
  var ne = (F.costs || []).filter(function (x) { return on[x.id]; }).map(function (x) { var b = allB.find(function (y) { return y.start && y.start <= x.date && x.date <= (y.end || y.start); }); return { id: uid(), date: x.date, booking: b ? b.id : "", item: x.item, amount: x.amount, notes: "From your bank statement" }; });
  var nt = F.todos.filter(function (x) { return on[x.id]; }), ob = OB.active, usedMail = !!F.mails && !F.pasted;
  if (ob && obProd() && OB.f.job && OB.f.shoot) nb.push(jobBooking(OB.f));
  var p = G.sheetId ? Promise.resolve() : (busy++, createSheet("Eltio Systems" + (ob && OB.f.trading ? ": " + OB.f.trading : "")).then(function () { busy--; }));
  SCAN.stage = ""; busy++; render();
  p.then(function () { return nb.length ? change("Bookings", function (rows) { return rows.concat(nb); }) : null; })
    .then(function () { return ni.length || inc.length || oldPaid.length ? change("Invoices", function (rows) { return rows.map(function (r) { var h = oldPaid.find(function (x) { return x.inv.id === r.id; }); return h ? Object.assign({}, r, { paid: h.date }) : r; }).concat(ni, inc); }) : null; })
    .then(function () { return ne.length ? change("Expenses", function (rows) { return rows.concat(ne); }) : null; })
    .then(function () { return change("Settings", function (st) { if (!st.name) st.name = G.name || ""; if (usedMail) st.scanned = iso(today()); if (ob) obApply(st); }); })
    .then(function () {
      if (ob && obProd() && OB.f.job) { D.pj = pjFrom(OB.f); extrasSave(); }
      busy = Math.max(0, busy - 1); SCAN.todos = (SCAN.todos || []).filter(function (x) { return !x.done; }).concat(nt.filter(function (x) { return !(SCAN.todos || []).some(function (y) { return y.id === x.id; }); }));
      if (F.mail && F.mail.length) SCAN.mail = F.mail.concat((SCAN.mail || []).filter(function (m) { return !F.mail.some(function (x) { return x.id === m.id; }); })).slice(0, 200);
      SCAN.at = iso(today()); scanSaveLocal(); if (F.mails && !F.pasted) fwdClear(); SCAN.found = null; if (ob) obEnd(); S.tab = "home"; render(); window.scrollTo(0, 0);
      var bits = [[nb.length, "job"], [ni.length + inc.length, "invoice"], [oldPaid.length, "payment matched", "payments matched"], [ne.length, "cost"], [nt.length, "to do", "to do"]].filter(function (x) { return x[0]; }).map(function (x) { return x[0] + " " + (x[0] === 1 ? x[1] : x[2] || x[1] + "s"); });
      banner(bits.length ? "Added " + (bits.length > 1 ? bits.slice(0, -1).join(", ") + " and " + bits[bits.length - 1] : bits[0]) + "." : ob ? "You're set up." : "Nothing added.");
    })
    .catch(function (e) { try { console.error("scanAdd", e && e.stack || e); } catch (x) {} busy = Math.max(0, busy - 1); SCAN.stage = "review"; render(); banner("Couldn't add: " + (e.message || e)); });
}
function scanDone() {
  SCAN.stage = ""; SCAN.found = null; flag("sy-scan-seen", "1");
  if (!G.sheetId) { D.settings.name = ""; render(); var n = $("s-name"); if (n && G.name) n.value = G.name; return; }
  S.tab = "home"; render(); openSheet(bookingForm(null));
}
/* Home for a real account: Scan first while it's empty, then a quiet line back to it. */
function scanHero() { return ""; }
function helpLine() {
  if (flag("sy-help-off")) return "";
  return '<div class="helpl"><span class="q">New here?</span>' + tutLink(tutFor() || "02-getting-started", "Watch") + '<button class="lnk" data-tab="t-help">All the how-tos</button><button class="lnk" data-helpoff aria-label="Hide">Hide</button></div>';
}
function scanInboxView() {
  var M = SCAN.mail || [];
  if (!M.length) return '<div class="top"><span>Inbox</span><span></span></div><h2>Work email, sorted by job.</h2><p class="q">Scan your email and Systems sorts call sheets, holds, invoices and payments under each job, with a link straight to the email.</p><div class="acts"><button class="btn solid" data-scan>Scan my email</button></div>' + pasteBox();
  var by = {}; M.forEach(function (m) { (by[m.job] = by[m.job] || []).push(m); });
  var lab = { cs: "Call sheet", bk: "Booking", inv: "Invoice", paid: "Payment", "do": "To do" };
  return '<div class="top"><span>Inbox</span><button class="lnk" data-scan>Scan again</button></div><h2>Work email, sorted by job.</h2><p class="q">From your last scan, ' + nice(SCAN.at) + ". Tap one to open it in Gmail.</p>" +
    Object.keys(by).slice(0, 30).map(function (j) { return '<div class="part">' + esc(j) + '</div><div class="rows">' + by[j].slice(0, 6).map(function (m) { var fw = /^m:/.test(m.th || ""); return (fw ? '<div class="row static">' : '<a class="row" target="_blank" rel="noopener" href="' + gmailLink(m.th) + '">') + '<span class="up-t">' + esc(m.subj || "(no subject)") + '<span class="q">' + esc(m.who) + " · " + nice(m.at) + '</span></span><span class="tag">' + (lab[m.k] || "Email") + "</span>" + (fw ? "</div>" : "</a>"); }).join("") + "</div>"; }).join("");
}
/* Help: what to do first, and every tutorial. */
var TUTS = [["01-systems-in-80-seconds", "Systems in 80 seconds", "1:13"], ["02-getting-started", "Getting started", "1:09"], ["03-systems-as-a-producer", "As a producer", "1:29"], ["04-systems-as-a-production-manager", "As a production manager", "0:49"], ["05-systems-as-a-dop", "As a DOP", "0:44"], ["06-systems-as-a-gaffer", "As a gaffer", "0:47"], ["07-systems-as-a-1st-ac", "As a 1st AC", "0:44"], ["08-systems-as-a-sound-recordist", "As a sound recordist", "0:35"], ["09-systems-as-a-director", "As a director", "0:29"], ["10-sign-off", "Sign-off: timesheet and invoice in one tap", "0:29"], ["11-call-sheets", "Call sheets: one link, every version", "0:35"], ["12-on-the-day", "On the day: wrap once, overtime by grade", "0:30"], ["13-rates", "APA and Bectu rates, built in", "0:28"], ["14-your-diary", "Your diary: holds and offers", "0:31"], ["15-passport-and-directory", "Crew passport and the directory", "0:29"], ["16-systems-with-xero", "With Xero, QuickBooks and FreeAgent", "0:27"], ["17-your-data-and-exports", "Your data in your Drive, and exports", "0:25"]];
function tutUrl(id) { return siteUrl() + "tutorials/#" + id; }
/* The video for wherever you are: the page, the setup step, or your job on Home. */
var TUTJOB = { prod: "03-systems-as-a-producer", pm: "04-systems-as-a-production-manager", dop: "05-systems-as-a-dop", gaffer: "06-systems-as-a-gaffer", spark: "06-systems-as-a-gaffer", grip: "06-systems-as-a-gaffer", camera: "07-systems-as-a-1st-ac", sound: "08-systems-as-a-sound-recordist", dir: "09-systems-as-a-director" };
var TUTPAGE = { bookings: "14-your-diary", money: "16-systems-with-xero", more: "17-your-data-and-exports", "t-help": "01-systems-in-80-seconds", "t-sign": "10-sign-off", "t-run": "10-sign-off", "t-cs": "11-call-sheets", "t-rates": "13-rates", "t-pass": "15-passport-and-directory", "t-dir": "15-passport-and-directory", "t-bank": "16-systems-with-xero", "t-inbox": "02-getting-started", "t-crew": "03-systems-as-a-producer", "t-permits": "03-systems-as-a-producer", "t-clients": "03-systems-as-a-producer", "t-rights": "03-systems-as-a-producer" };
var TUTSTEP = { "You": "02-getting-started", "Connect": "02-getting-started", "Your rate": "13-rates", "Your company": "03-systems-as-a-producer", "The job": "03-systems-as-a-producer", "Crew and permits": "03-systems-as-a-producer", "Build": "02-getting-started" };
function tutFor(where) {
  var role = TUTJOB[jk()] || (roleKey() === "Producer" ? "03-systems-as-a-producer" : roleKey() === "Director" ? "09-systems-as-a-director" : "02-getting-started");
  if (where === "ob") return TUTSTEP[obSteps()[OB.step]] || "02-getting-started";
  if (where === "scan") return "02-getting-started";
  var t = where || S.tab;
  return TUTPAGE[t] || (t === "home" || /^t-(float|kit|made)/.test(t) ? role : "");
}
function tutLink(id, label) {
  var t = TUTS.find(function (x) { return x[0] === id; }); if (!t) return "";
  return '<a class="lnk" target="_blank" rel="noopener" href="' + tutUrl(id) + '">' + esc(label || "Watch how it works") + ": " + esc(t[1]) + " · " + t[2] + "</a>";
}
function watchLine() { var id = tutFor(); return id ? '<p class="q watchl">' + tutLink(id, "Watch how this works") + "</p>" : ""; }
function helpView() {
  var first3 = mode === "google" ? [
    ["Connect calendar, email and bank", "Go back through setup and match everything up again.", 'data-obstart="1"', D.settings.onb === "2" ? "Done" : "Start"],
    ["Scan your email again", isFwd() ? "Sort new work email forwarded to your Systems address." : "New call sheets, holds, invoices and payments since last time.", "data-scan", D.settings.scanned ? "Last " + nice(D.settings.scanned) : "Start"],
    ["Add your next job", "A booking or a hold. Holds get a nudge before the date.", "data-addbooking", D.bookings.length ? "Done" : "Start"],
    ["Log a day's hours", "Call and wrap in, overtime out, on APA or Bectu terms.", D.bookings.length ? 'data-tab="bookings"' : "data-addbooking", D.days.length ? "Done" : "Start"],
    ["Chase what's late", "Late invoices show in Needs you, with the chase drafted.", 'data-tab="money"', ""]
  ] : [["Try the sample job", "Everything here is sample data, so tap anything.", 'data-tab="home"', ""], ["Switch job", "See it as a producer, gaffer, costume designer and more.", "data-switchjob", ""]];
  return '<div class="part">What to do first</div><div class="rows">' + first3.map(function (x) { return '<button class="row" ' + x[2] + '><span class="up-t">' + esc(x[0]) + '<span class="q">' + esc(x[1]) + '</span></span><span class="q">' + esc(x[3] || "→") + "</span></button>"; }).join("") + "</div>" +
    '<div class="part">Short videos</div><div class="rows">' + TUTS.map(function (t) { return '<a class="row" target="_blank" rel="noopener" href="' + tutUrl(t[0]) + '"><span>' + esc(t[1]) + '</span><span class="q">' + t[2] + "</span></a>"; }).join("") + "</div>" +
    (mode === "google" ? fwdHelp() + pasteBox() : "") + '<div class="part">Still stuck</div><p class="q">Email <a href="mailto:hello@eltio.studio?subject=Systems%20help">hello@eltio.studio</a> and say what you were trying to do. A person reads every one.</p>';
}
var TOOLS_REAL = [
  { k: "t-inbox", n: "Inbox", g: "Your work", fn: scanInboxView },
  { k: "t-rates", n: "Rate cards", g: "Money", fn: function () { return strip(rateSheet()); } },
  { k: "t-bank", n: "Bank and receipts", g: "Money", fn: bankView }
];
var TOOLS_HELP = [{ k: "t-help", n: "How it works", g: "Help", fn: helpView }];
function scanClick(b) {
  var d = b.dataset;
  if (b.hasAttribute("data-scan")) { if (mode !== "google") { banner("Scanning works once you sign in with Google. Here it's sample data."); return true; } closeSheet(); runScan(scanOpts()); return true; }
  if (b.hasAttribute("data-scanskip")) { SCAN.stage = ""; scanDone(); return true; }
  if (b.hasAttribute("data-scanadd")) { scanAdd(b.hasAttribute("data-none")); return true; }
  if (b.hasAttribute("data-obback2")) { SCAN.stage = ""; SCAN.found = null; OB.step = 1; obSave(); render(); return true; }
  if (b.hasAttribute("data-scandone")) { scanDone(); return true; }
  if (b.hasAttribute("data-helpoff")) { flag("sy-help-off", "1"); render(); return true; }
  if (d.todo === "mail") { var x = (SCAN.todos || []).find(function (y) { return y.th === d.id; }); if (x) { var fw = /^m:/.test(x.th || ""); if (!fw) window.open(gmailLink(x.th), "_blank", "noopener"); x.done = true; scanSaveLocal(); render(); banner(fw ? "Ticked off." : "Opened in Gmail. Ticked off here."); } return true; }
  return false;
}
/* ---------- onboarding: who you are, connect calendar, email and bank, your rate or your company and job, then build the dashboard ---------- */
var CAL = "https://www.googleapis.com/auth/calendar.events.readonly";
var NO_CAL = "Google didn't let Systems see your calendar. Tap Connect again and tick the Calendar box on Google's screen.";
function obBlank() { return { active: false, step: 0, role: "", work: "Both", f: {}, cal: false, mail: false, kind: "", fwdN: 0, bank: [], files: [], err: "", email: "" }; }
var OB = (function () { try { return Object.assign(obBlank(), JSON.parse(localStorage.getItem("sy-ob") || "null") || {}); } catch (e) { return obBlank(); } })();
function obSave() { try { localStorage.setItem("sy-ob", JSON.stringify(OB)); } catch (e) {} }
function obStart(step) {
  var s = D.settings || {};
  OB = obBlank(); OB.active = true; OB.step = step || 0; OB.email = G.email || "";
  OB.role = s.role ? roleKey() : ""; OB.work = s.work || "Both"; OB.cal = !!G.cal; OB.mail = !!G.gmail; OB.kind = mailKind();
  OB.f = { name: s.name || G.name || "", trading: s.trading || "", grade: s.grade || "", rate: s.rate || "", terms: s.terms || "30", tax: s.tax || "25", addr: s.addr || "", bank: s.bank || "", vat: s.vat || "", hasAgent: s.hasAgent || "No", agent: s.agent || "", agentEmail: s.agentEmail || "", myMail: s.myMail || "", companyNo: s.companyNo || "", payroll: s.payroll || "", accountant: s.accountant || "", crewTerms: s.crewTerms || "30" };
  if (D.pj && D.pj.real) { var P = D.pj; Object.assign(OB.f, { job: P.name, client: P.client, brand: P.brand, accounts: P.accounts, po: P.po || "", budget: P.budget ? String(P.budget) : "", split: String(P.split), payDays: String(P.payDays), shoot: P.shoot, days: String(P.days), jterms: P.terms, pshoot: P.pshoot, permits: P.permits.slice(), crew: P.crew.map(function (c) { return [c.n, c.grade, c.email].filter(Boolean).join(", "); }).join("\n") }); }
  obSave(); SCAN.stage = ""; S.tab = "home"; closeSheet(); render(); window.scrollTo(0, 0);
}
function obEnd() { OB = obBlank(); try { localStorage.removeItem("sy-ob"); } catch (e) {} flag("sy-ob-done", "1"); }
function obProd() { return OB.role === "Producer"; }
function obSteps() { return obProd() ? ["You", "Connect", "Your company", "The job", "Crew and permits", "Build"] : ["You", "Connect", "Your rate", "Build"]; }
/* Every field on a step has an id starting ob-, so one read keeps them all. */
function obRead() {
  document.querySelectorAll('#main input[id^="ob-"], #main select[id^="ob-"], #main textarea[id^="ob-"]').forEach(function (e) { if (e.type === "file") return; OB.f[e.id.slice(3)] = e.value.trim(); });
  var r = picked("obrole"); if (r) OB.role = r; var w = picked("obwork"); if (w) OB.work = w;
  var mk = picked("obmail"); if (mk) OB.kind = mk; var t = picked("objterms"); if (t) OB.f.jterms = t; var a = picked("obagent"); if (a) OB.f.hasAgent = a;
  obSave();
}
function obScreen() {
  var L = obSteps(), i = Math.min(OB.step, L.length - 1), k = L[i], f = OB.f, P = obProd(), body = "";
  var steps = '<div class="ob-steps">' + L.map(function (n, j) { return '<span class="' + (j === i ? "on" : j < i ? "done" : "") + '">' + esc(n) + "</span>"; }).join("") + "</div>";
  if (k === "You") body = "<h1>Let's set you up.</h1><p class=\"q\">A few quick steps. Connect your calendar, email and bank, and Systems lays your work out for you and matches it up.</p>" +
    field("ob-name", "Your name", f.name, "text", "First and last name") +
    '<div class="field"><span class="lab">What do you do?</span>' + pills("obrole", ROLES, OB.role) + '<span class="q">Production company? Pick Producer.</span></div>' +
    '<div class="field"><span class="lab">Mostly on</span>' + pills("obwork", ["Commercials", "TV and film", "Both"], OB.work) + "</div>";
  if (k === "Connect") {
    var con = function (key, t, sub, on) { return '<div class="row static ob-c"><span class="up-t">' + t + '<span class="q">' + sub + "</span></span>" + (on ? '<span class="tag ok">Connected</span>' : '<button class="btn sm solid" data-obcon="' + key + '">Connect</button>') + "</div>"; };
    var nIn = OB.bank.filter(function (r) { return r.amt > 0; }).length, nOut = OB.bank.length - nIn;
    body = "<h1>Connect your stuff.</h1><p class=\"q\">The more you connect, the more Systems fills in for you. " + (mailKind() === "Gmail" ? "Everything is read on this device. Nothing is sent, changed or kept by us." : "Your calendar and bank are read on this device. Your email forwards to a private Systems address.") + "</p>" +
      '<div class="rows">' +
      con("cal", "Google Calendar", P ? "Shoot days, recces, PPMs and holds." : "Your shoot days, holds and recces.", OB.cal) +
      "</div>" +
      '<div class="field"><span class="lab">Which email do you use for work?</span>' + pills("obmail", MAILK, mailKind()) + "</div>" +
      (mailKind() === "Gmail" ? '<div class="rows">' + con("gmail", "Gmail", P ? "Awards, call sheets, invoices you've sent and remittances." : "Call sheets, holds, invoices you've sent and remittances.", OB.mail) + "</div>" : fwdPanel()) +
      '<div class="rows">' +
      '<div class="row static ob-c ob-bank"><span class="up-t">Bank statements<span class="q">A CSV from each account you get paid into' + (P ? ", business account first" : "") + '. Payments are matched to invoices, and work costs are picked out.</span></span><label class="btn sm' + (OB.files.length ? "" : " solid") + '" for="ob-bankfile">' + (OB.files.length ? "Add another" : "Add a CSV") + '</label><input id="ob-bankfile" class="vh" type="file" accept=".csv,.xls,.txt,text/csv" multiple></div>' +
      (OB.files.length ? OB.files.map(function (x, j) { return '<div class="row static ob-f"><span class="q">' + esc(x.name) + " · " + x.n + ' lines</span><button class="lnk" data-obbankx="' + j + '">Remove</button></div>'; }).join("") : "") +
      "</div>" +
      (OB.files.length ? '<p class="q">' + nIn + " payments in and " + nOut + " out, ready to match.</p>" : "") +
      bankHow() +
      (mailKind() === "Gmail" ? '<p class="q">While Systems is being checked by Google, its screen says it "hasn\'t verified this app". Tap Advanced, then Go to Systems.</p>' : "");
  }
  if (k === "Your rate") body = "<h1>Your rate.</h1><p class=\"q\">So timesheets, overtime and invoices come out right first time.</p>" +
    gradeField("ob-grade", "Your grade", cardOf(OB.work === "TV and film" ? "TV drama" : "APA"), f.grade || "", "ob-rate", f.rate) +
    '<div class="grid2">' + field("ob-rate", "Day rate (£)", f.rate, "number", "650", ' inputmode="numeric"') + field("ob-terms", "You get paid within (days)", f.terms || "30", "number", "30", ' inputmode="numeric"') + "</div>" +
    field("ob-tax", "Put aside for tax (%)", f.tax || "25", "number", "25", ' inputmode="numeric"') +
    '<div class="part">On your invoices</div>' + field("ob-trading", "Trading name", f.trading, "text", "Your Ltd or trading name (optional)") + field("ob-addr", "Your address", f.addr, "text", "Street, town, postcode") +
    '<div class="grid2">' + field("ob-bank", "Bank details", f.bank, "text", "Sort code and account number") + field("ob-vat", "VAT number", f.vat, "text", "Only if you're registered") + "</div>" +
    '<div class="field"><span class="lab">Do you have an agent?</span>' + pills("obagent", ["Yes", "No"], f.hasAgent || "No") + "</div>" +
    '<div class="grid2">' + field("ob-agent", "Agent", f.agent, "text", "Agency and agent's name (if you have one)") + field("ob-agentEmail", "Their email", f.agentEmail, "email", "bookings@agency.com") + "</div>";
  if (k === "Your company") body = "<h1>Your company.</h1><p class=\"q\">It goes on advance and balance invoices, POs and crew start packs.</p>" +
    field("ob-trading", "Company name", f.trading, "text", "e.g. Northlight Films Ltd") +
    '<div class="grid2">' + field("ob-companyNo", "Company number", f.companyNo, "text", "8 digits") + field("ob-vat", "VAT number", f.vat, "text", "If you're registered") + "</div>" +
    field("ob-addr", "Registered address", f.addr, "text", "Street, town, postcode") +
    '<div class="grid2">' + field("ob-bank", "Bank details for clients", f.bank, "text", "Sort code and account number") + field("ob-crewTerms", "You pay crew within (days)", f.crewTerms || "30", "number", "30", ' inputmode="numeric"') + "</div>" +
    '<div class="part">Who gets the paperwork</div><div class="grid2">' + field("ob-payroll", "Payroll bureau email", f.payroll, "email", "For PAYE crew (optional)") + field("ob-accountant", "Accountant email", f.accountant, "email", "For the month-end pack (optional)") + "</div>";
  if (k === "The job") body = "<h1>The job you're on.</h1><p class=\"q\">The award, the shoot and who pays. Not on one right now? Leave it blank and add it from Home later.</p>" +
    '<div class="grid2">' + field("ob-job", "Job name", f.job, "text", "e.g. Canal promo") + field("ob-client", "Agency or client", f.client, "text", "Who you invoice") + "</div>" +
    '<div class="grid2">' + field("ob-brand", "Brand", f.brand, "text", "e.g. Fieldwear") + field("ob-accounts", "Their accounts email", f.accounts, "email", "accounts@agency.com") + "</div>" +
    '<div class="grid2">' + field("ob-budget", "Budget (£)", f.budget, "number", "84000", ' inputmode="numeric"') + field("ob-po", "PO number", f.po, "text", "If they've sent one") + "</div>" +
    '<div class="grid2">' + field("ob-split", "Paid on award (%)", f.split || "50", "number", "50", ' inputmode="numeric"') + field("ob-payDays", "Balance due (days after delivery)", f.payDays || "30", "number", "30", ' inputmode="numeric"') + "</div>" +
    '<div class="grid2">' + field("ob-shoot", "First shoot day", f.shoot, "date") + field("ob-days", "Shoot days", f.days || "1", "number", "1", ' inputmode="numeric"') + "</div>" +
    '<div class="field"><span class="lab">Crew terms</span>' + pills("objterms", ["APA", "Bectu"], f.jterms || (OB.work === "TV and film" ? "Bectu" : "APA")) + "</div>";
  if (k === "Crew and permits") body = "<h1>Crew and permits.</h1><p class=\"q\">Paste your crew list, one person a line: name, role, email. Copy it from a call sheet, a spreadsheet or your notes.</p>" +
    '<div class="field"><label for="ob-crew">Crew</label><textarea id="ob-crew" rows="7" placeholder="Ana Reyes, 1st AC, ana@email.com&#10;Sam Carter, Gaffer, sam@email.com">' + esc(f.crew || "") + "</textarea></div>" +
    '<div class="acts"><label class="btn sm" for="ob-crewfile">Or pick a CSV</label><input id="ob-crewfile" class="vh" type="file" accept=".csv,text/csv"></div>' +
    '<div class="part">Permits to count back from the shoot</div>' + field("ob-pshoot", "Location shoot day", f.pshoot || f.shoot || "", "date") +
    '<div class="rows">' + PERMITS.map(function (p) { var on = (f.permits || []).indexOf(p[0]) >= 0; return '<button class="row" data-obpermit="' + p[0] + '"><span><i class="ck' + (on ? " on" : "") + '"></i>' + esc(p[1]) + '</span><span class="q">' + p[2] + (p[3] ? " working days" : " days") + "</span></button>"; }).join("") + "</div>";
  if (k === "Build") {
    var crewN = crewParse(f.crew).length, row = function (t, v, ok) { return '<div class="row static"><span>' + t + '</span><span class="tag' + (ok ? " ok" : "") + '">' + esc(v) + "</span></div>"; };
    body = "<h1>Ready when you are.</h1><p class=\"q\">Systems reads and matches everything on this device, then shows you the list. Nothing is saved until you say so.</p><div class=\"rows\">" +
      row("Calendar", OB.cal ? "Connected" : "Not connected", OB.cal) + row("Email", mailKind() === "Gmail" ? (OB.mail ? "Connected" : "Not connected") : obFwd() ? "Forwarding to Systems" : "Not set up", mailKind() === "Gmail" ? OB.mail : obFwd()) + row("Bank statements", OB.files.length ? OB.files.length + " file" + (OB.files.length > 1 ? "s" : "") : "None yet", OB.files.length) +
      (P ? row("The job", f.job || "Add it later", !!f.job) + row("Crew", crewN ? crewN + " people" : "None yet", crewN) : row("Your rate", f.rate ? "£" + f.rate + " a day" : "Add it later", !!f.rate)) + "</div>" +
      (OB.cal || OB.mail || obFwd() || OB.files.length ? "" : '<p class="q">Nothing connected yet, so your dashboard starts empty. You can connect things later from Help.</p>');
  }
  var nav = '<div class="acts">' + (i ? '<button class="btn" data-obback>Back</button>' : "") + (k === "Build" ? '<button class="btn solid" data-obgo>Build my dashboard</button>' : '<button class="btn solid" data-obnext>' + (k === "Connect" && !OB.cal && !OB.mail && !obFwd() && !OB.files.length ? "Skip for now" : "Next") + "</button>") + "</div>";
  return '<div class="hero scan wide ob">' + steps + (OB.err ? '<p class="note">' + esc(OB.err) + "</p>" : "") + body + nav + '<p class="q">' + tutLink(tutFor("ob")) + '</p></div>';
}
function wantScope(k) {
  if (k === "gmail" ? G.gmail : G.cal) return Promise.resolve();
  if (k === "gmail") G.wantGmail = true; else G.wantCal = true;
  G.token = null;
  var off = function () { G.wantGmail = false; G.wantCal = false; };
  return getToken(false).then(off, function (e) { off(); throw e; });
}
function obConnect(k) {
  obRead(); OB.err = "";
  wantScope(k).then(function () { if (k === "gmail") OB.mail = true; else OB.cal = true; obSave(); render(); }, function (e) { OB.err = e && e.message || String(e); render(); });
}
function readFiles(files, fn) { Array.prototype.forEach.call(files || [], function (f) { var r = new FileReader(); r.onload = function () { fn(f, String(r.result || "")); }; r.readAsText(f); }); }
function obBankFiles(files) {
  readFiles(files, function (f, t) { var rows = readBank(t); OB.bank = OB.bank.concat(rows.map(function (x) { x.file = f.name; return x; })).slice(-4000); OB.files.push({ name: f.name, n: rows.length }); obSave(); render(); if (!rows.length) banner("Couldn't find any payments in " + f.name + ". Is it a CSV statement?"); });
}

/* ---------- how to get a CSV from your bank: pick your bank, see its own steps ---------- */
/* Where the export lives differs by bank: the app for Monzo, Starling, Tide and Wise, online banking on a computer for most high-street banks. */
var BANKHOW = [
  { n: "Monzo", w: "In the app", s: ["Open the Home tab and tap the three dots on your card.", "Tap Bank statements.", "Choose the dates. The last 12 months is ideal.", "Pick CSV, then save it or share it to this device."], note: "Monzo Business: log in at business.monzo.com and use Export statement.", url: "https://monzo.com/help/budgeting-overdrafts-savings/exporting-my-transactions" },
  { n: "Starling", w: "In the app", s: ["Tap the account icon at the top right.", "Tap Statements, then Statement history.", "Choose a start and end date.", "Pick CSV and download it."], url: "https://www.starlingbank.com/features/statements/" },
  { n: "Revolut", w: "In the app", s: ["On Home, tap Accounts under your balance.", "Pick the pounds account.", "Tap More (…), then Statement.", "Choose the dates, pick Excel, then Generate."], note: "If the file ends in .xlsx, open it and save it as CSV first.", url: "https://help.revolut.com/en-GB/help/profile-and-plan/managing-my-account/account-statement-per-chosen-currency/" },
  { n: "Tide", w: "In the app or online", s: ["Tap Pay, then View more under your transactions.", "Filter to the dates you want.", "Tap the Share icon at the top right.", "Pick a CSV type, then Export."], url: "https://www.tide.co/help-centre/download-tide-account-statements-and-transactions" },
  { n: "Wise", w: "In the app or online", s: ["Open your pounds balance.", "Tap the three dots, then Statements and reports.", "Choose the dates, up to a year.", "Pick CSV and confirm."], url: "https://wise.com/help/articles/2736049/how-do-i-download-a-statement" },
  { n: "Barclays", w: "Online banking, on a computer", s: ["Log in to Online Banking and open the account.", "Click View all transactions.", "Set the dates and search.", "Click Export All at the bottom and pick CSV."], note: "The app only gives PDFs. Each export may only go back a few months, so do it in chunks.", url: "https://barclays.co.uk/help/online-banking/using-online-banking/export-data" },
  { n: "HSBC", w: "Online banking, on a computer", s: ["Log on to online banking and pick the account.", "Choose Search and filter and set the dates.", "Scroll to the bottom of the list and click Download.", "Pick CSV and Continue."], note: "The app only gives PDFs. It may only allow a month or so per download." },
  { n: "Lloyds or Halifax", w: "Internet banking, on a computer", s: ["Log on and open the account.", "Above your transactions, look for Export or Statement options.", "Choose Export transactions and pick CSV.", "Set the dates and Export."], note: "Same for Bank of Scotland. The app doesn't do CSV." },
  { n: "NatWest or RBS", w: "Online banking, on a computer", s: ["Log in to Online Banking.", "Go to Statements and transactions, then View transactions.", "Pick the account and the dates.", "Click Export to Excel. The file it saves is a CSV."], note: "Same for Ulster Bank. Each export may only cover about 3 months." },
  { n: "Santander", w: "Online banking, on a computer", s: ["Log on and open the account.", "Select Download transactions.", "Choose the dates.", "Pick Microsoft Excel and Download."], note: "Up to 600 transactions per download." },
  { n: "Nationwide", w: "Internet bank, on a computer", s: ["Log in and open the account.", "View your transactions and set the dates.", "Open the Download transactions menu.", "Pick CSV."], note: "The app only gives PDFs." },
  { n: "First Direct", w: "Online banking, on a computer", s: ["Log on and open the account.", "Go to your transactions.", "Click Download and set the dates.", "Pick CSV."] },
  { n: "Metro", w: "Online banking, on a computer", s: ["Log in and open the account.", "Go to Transaction summary.", "Click Search and set the dates.", "Click Export for a CSV."], note: "Download gives a PDF, so use Export." },
  { n: "Co-op", w: "Online banking, on a computer", s: ["Log in to Online Banking.", "Click Search transactions.", "Pick the account and the dates, then search.", "Change the format from PDF to CSV and Download."] },
  { n: "Other", w: "App or website", s: ["Open your statements or transactions.", "Look for Export, Download or CSV.", "Pick the last 12 months.", "Save it, then add it here. One file per account."], note: "If your app only gives PDFs, try your bank's website on a computer." }
];
function bankPicked() { try { return localStorage.getItem("sy-bankhow") || ""; } catch (e) { return ""; } }
function bankSteps(n) {
  var b = BANKHOW.find(function (x) { return x.n === n; });
  if (!b) return '<p class="q">Pick your bank to see where its CSV is.</p>';
  return '<p class="bh-w">' + esc(b.w) + '</p><ol class="fwd-s">' + b.s.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" +
    (b.note ? '<p class="q">' + esc(b.note) + "</p>" : "") +
    (b.url ? '<p class="q"><a class="lnk" target="_blank" rel="noopener" href="' + b.url + '">' + esc(b.n) + " help page</a></p>" : "");
}
function bankHow(open) {
  var cur = bankPicked();
  return '<details class="ob-how bh"' + (open || cur ? " open" : "") + '><summary class="q">How to get a CSV from your bank</summary>' +
    pills("bankhow", BANKHOW.map(function (x) { return x.n; }), cur) + '<div class="bh-s">' + bankSteps(cur) + "</div></details>";
}

/* Bank CSVs: date, description and money in or out, whichever bank it's from. */
function ukDate(s) {
  s = String(s || "").trim(); var m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) { var y = +m[3]; if (y < 100) y += 2000; return iso(new Date(y, +m[2] - 1, +m[1])); }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + "-" + m[2] + "-" + m[3];
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/); if (m && MONS.indexOf(m[2].toLowerCase()) >= 0) return iso(new Date(+m[3], MONS.indexOf(m[2].toLowerCase()), +m[1]));
  return "";
}
function readBank(t) {
  var R = csvRows(t); if (!R.length) return [];
  var hi = R.findIndex(function (r) { return r.some(function (h) { return /date/i.test(h); }) && r.some(function (h) { return /amount|paid in|paid out|credit|debit|money in|money out|value/i.test(h); }); });
  var head = hi >= 0 ? R[hi].map(function (h) { return h.toLowerCase().trim(); }) : [], rows = hi >= 0 ? R.slice(hi + 1) : R;
  var col = function (re) { return head.findIndex(function (h) { return re.test(h); }); };
  var di = col(/^(transaction |completed |posting |value )?date$/); if (di < 0) di = col(/date/);
  var inI = col(/paid in|credit|money in|^in$/), outI = col(/paid out|debit|money out|^out$/), amI = col(/^amount|^amt|^value|amount \(/);
  var descI = head.map(function (h, j) { return /description|^name$|payee|merchant|details|narrative|reference|memo|counter ?party|^type$|transaction type/.test(h) && !/date|amount|balance|category|sort code|account/.test(h) ? j : -1; }).filter(function (j) { return j >= 0; });
  return rows.map(function (r) {
    var date = di >= 0 ? ukDate(r[di]) : ukDate(r.find(function (x) { return ukDate(x); }) || "");
    var amt = inI >= 0 || outI >= 0 ? Math.abs(num(r[inI])) - Math.abs(num(r[outI])) : amI >= 0 ? num(r[amI]) : (r.map(num).filter(function (n) { return n; })[0] || 0);
    var desc = descI.length ? descI.map(function (j) { return r[j] || ""; }).filter(Boolean).join(" ") : (r.filter(function (x) { return /[a-z]{3}/i.test(x) && !ukDate(x); }).sort(function (a, b) { return b.length - a.length; })[0] || "");
    return { date: date, desc: desc.replace(/\s+/g, " ").trim(), amt: Math.round(amt * 100) / 100 };
  }).filter(function (x) { return x.date && x.amt; });
}
var NOTINCOME = /interest|refund|cashback|transfer from|from savings|savings|\bpot\b|own account|hmrc|tax refund|salary|reversal|returned|currency|round ?up/i;
var COSTW = /\b(tfl|trainline|lner|avanti|gwr|national rail|thameslink|southern|scotrail|eurostar|uber|bolt|addison lee|free now|freenow|shell|bp |esso|texaco|jet |fuel|petrol|parking|ringgo|paybyphone|justpark|ncp|congestion|ulez|hire|rental|cvp|procam|panavision|arri|pixipixel|batteries|screwfix|toolstation|b&q|maplin|amazon|apple\.com|adobe|frame\.io|dropbox|insurance|bectu|equity|freeagent|xero|quickbooks|kit|lighting|grip|camera)\b/i;
var STRONGCOST = /\b(tfl|trainline|lner|avanti|gwr|national rail|thameslink|eurostar|parking|ringgo|paybyphone|justpark|ncp|congestion|ulez|hire|rental|cvp|procam|panavision|arri|pixipixel|batteries|bectu|equity|kit)\b/i;
function payer(desc) {
  var s = String(desc).replace(/\b(faster payments?|fpi|fps|bacs|bgc|bank giro credit|credit|cr|ref(erence)?|payment|from|received|transfer|tfr|inward|bill payment|bp)\b/gi, " ").replace(/[0-9#\/*\-:]{3,}/g, " ").replace(/\s+/g, " ").trim();
  return s.split(" ").slice(0, 4).join(" ").toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); }) || "Payment";
}
function bankSort(bank, newInv) {
  var open = D.invoices.filter(function (v) { return !v.paid; }).map(function (v) { return { v: v, old: true }; }).concat(newInv.filter(function (v) { return !v.paid; }).map(function (v) { return { v: v }; }));
  var used = {}, paid = [], income = [], costs = [], yr = iso(addDays(today(), -365));
  bank.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (r, i) {
    if (!r.date || r.date < yr) return;
    if (r.amt > 0) {
      var up = r.desc.toUpperCase();
      var hit = open.find(function (x) { return !used[x.v.id] && x.v.number && x.v.number.length > 2 && up.indexOf(x.v.number.toUpperCase()) >= 0; }) ||
        open.find(function (x) { return !used[x.v.id] && Math.abs(num(x.v.amount) - r.amt) < 0.01 && (!x.v.issued || r.date >= iso(addDays(parse(x.v.issued), -3))); });
      if (hit) { used[hit.v.id] = 1; paid.push({ id: "bp" + i, inv: hit.v, old: !!hit.old, date: r.date, amt: r.amt, desc: r.desc, pick: true }); return; }
      var known = D.invoices.concat(newInv).some(function (v) { return v.paid && ((v.number && v.number.length > 2 && up.indexOf(v.number.toUpperCase()) >= 0) || (Math.abs(num(v.amount) - r.amt) < 0.01 && Math.abs(daysBetween(parse(v.paid), parse(r.date))) <= 10)); });
      if (known) return;
      if (r.amt >= 100 && !NOTINCOME.test(r.desc)) income.push({ id: "bi" + i, client: payer(r.desc), amount: r.amt.toFixed(2), date: r.date, desc: r.desc, pick: false });
    } else if (COSTW.test(r.desc)) costs.push({ id: "bc" + i, item: r.desc.slice(0, 60), amount: (-r.amt).toFixed(2), date: r.date, pick: STRONGCOST.test(r.desc) });
  });
  return { paid: paid, income: income.slice(-30).reverse(), costs: costs.slice(-60).reverse() };
}

/* Calendar: work-looking events in the last two months and the next six. */
var CALW = /\b(shoot|shooting|hold|pencil|pencilled|recce|recces|prep|pre-?light|tech scout|call ?sheet|wrap|booked|booking|commercial|promo|music video|mv|campaign|job|build|strike|rig|de-?rig|day \d|sd ?\d|travel day|fitting|ppm|pre-?pro|grade|edit|offline|online|pick-?ups?|tvc|ad shoot)\b/i;
function calRead() {
  var t0 = iso(addDays(today(), -60)) + "T00:00:00Z", t1 = iso(addDays(today(), 183)) + "T00:00:00Z";
  return api("https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin=" + encodeURIComponent(t0) + "&timeMax=" + encodeURIComponent(t1) + "&fields=" + encodeURIComponent("items(id,summary,start,end,organizer(email,self),status)")).then(function (r) { return r.items || []; });
}
function calSort(items) {
  var out = [];
  items.forEach(function (e) {
    if (e.status === "cancelled") return;
    var s = e.summary || "", org = e.organizer && !e.organizer.self && e.organizer.email && !/calendar\.google\.com$/.test(e.organizer.email) ? e.organizer.email : "", who = org ? party(org) : null;
    var dom = org ? (org.split("@")[1] || "").split(".")[0] : "", ext = !!org && !FREEMAIL.test(dom), work = CALW.test(s);
    if (!work && !ext) return;
    var st = (e.start && (e.start.date || (e.start.dateTime || "").slice(0, 10))) || "", en = e.end && e.end.date ? iso(addDays(parse(e.end.date), -1)) : e.end && e.end.dateTime ? e.end.dateTime.slice(0, 10) : st;
    if (!st) return;
    var low = s.toLowerCase(), status = /second hold|2nd hold/.test(low) ? "Second hold" : /\bhold\b|1st hold|first hold/.test(low) ? "First hold" : /pencil|\btbc\b|\?/.test(low) ? "Pencil" : work ? "Confirmed" : "Pencil";
    out.push({ id: "cb" + e.id, start: st, end: en > st ? en : "", client: who ? who.co : "", production: jobName(s, who ? who.co : "Calendar"), contact: who ? who.mail : "", status: status, rate: D.settings.rate || OB.f.rate || "", days: "1", agent: "", notes: "From your calendar: " + s.slice(0, 80), terms: "", pick: work, src: "calendar" });
  });
  /* The same job over several days is one booking. */
  var M = []; out.forEach(function (b) { var p = M[M.length - 1]; if (p && p.production.toLowerCase() === b.production.toLowerCase() && b.start <= iso(addDays(parse(p.end || p.start), 1))) { var e2 = b.end || b.start; if (e2 > (p.end || p.start)) p.end = e2; } else M.push(b); });
  M.forEach(function (b) { b.days = String(b.end ? daysBetween(parse(b.start), parse(b.end)) + 1 : 1); });
  return M;
}
function overlaps(a, b) { return a.start && b.start && a.start <= (b.end || b.start) && b.start <= (a.end || a.start); }
function sortAll(mails, cal, bank) {
  var F = sortMail(mails);
  calSort(cal).forEach(function (c) {
    var m = F.bookings.find(function (b) { return overlaps(b, c); });
    if (m) { if (!m.end && c.end) { m.end = c.end; m.days = c.days; } m.src = "email and calendar"; if (!m.client && c.client) m.client = c.client; return; }
    if (D.bookings.some(function (x) { return overlaps(x, c); })) return;
    F.bookings.push(c);
  });
  F.bookings.sort(function (a, b) { return (a.start || "9") < (b.start || "9") ? -1 : 1; });
  var B = bankSort(bank || [], F.invoices);
  /* A remittance email for an invoice already in the sheet marks it paid too. */
  (F.rem || []).forEach(function (p, i) { var v = D.invoices.find(function (x) { return !x.paid && ((p.no && x.number && p.no.toLowerCase() === x.number.toLowerCase()) || (p.amt && Math.abs(num(x.amount) - num(p.amt)) < 0.01 && x.client.toLowerCase() === String(p.who).toLowerCase())); }); if (v && !B.paid.some(function (y) { return y.inv.id === v.id; })) B.paid.push({ id: "rm" + i, inv: v, old: true, date: p.at, amt: num(p.amt || v.amount), desc: "Remittance from " + p.who, pick: true }); });
  F.paid = B.paid; F.income = B.income; F.costs = B.costs; F.events = (cal || []).length; F.bankN = (bank || []).length;
  return F;
}
function obFwd() { return mailKind() !== "Gmail" && !!fwdGet(); }
function emptyFound() { return { bookings: [], invoices: [], todos: [], mail: [], mails: 0, paid: [], income: [], costs: [], events: 0, bankN: 0 }; }
function obGo() {
  obRead(); OB.err = "";
  var fw = obFwd();
  if (!OB.cal && !OB.mail && !fw && !OB.bank.length) { SCAN.found = emptyFound(); scanAdd(); return; }
  runScan({ mail: !fw && OB.mail, fwd: fw, cal: OB.cal, bank: OB.bank });
}
/* What onboarding collected goes into Settings, and a producer's job becomes their first job. */
function obApply(st) {
  var f = OB.f, P = obProd();
  st.name = f.name || st.name || G.name || ""; st.role = OB.role || st.role || ""; st.work = OB.work || st.work || "Both";
  ["trading", "addr", "bank", "vat"].forEach(function (k) { if (f[k] != null) st[k] = f[k]; });
  if (P) { st.job = "prod"; ["companyNo", "payroll", "accountant", "crewTerms"].forEach(function (k) { if (f[k] != null) st[k] = f[k]; }); }
  else { ["grade", "rate", "tax", "hasAgent", "agent", "agentEmail"].forEach(function (k) { if (f[k] != null) st[k] = f[k]; }); st.terms = f.terms || st.terms || "30"; if (st.job === "prod") st.job = ""; }
  st.terms = st.terms || "30"; st.tax = st.tax || "25"; st.mileage = st.mileage || "45"; st.invoicePrefix = st.invoicePrefix || "INV"; st.mail = OB.kind || (OB.mail ? "Gmail" : st.mail || "Gmail");
  if (f.myMail != null) st.myMail = f.myMail;
  if (obFwd()) { st.fwd = JSON.stringify(fwdGet()); st.scanned = iso(today()); }
  if (OB.cal) st.cal = "1"; if (OB.mail) st.scanned = iso(today()); st.onb = "2";
}

/* A producer's job, from onboarding or the New job sheet. */
function crewParse(t) {
  return String(t || "").split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
    var em = (l.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [""])[0], ph = (l.match(/(\+44\s?7\d{3}|07\d{3})\s?\d{3}\s?\d{3}/) || [""])[0];
    var rest = l.replace(em, "").replace(ph, "").split(/[,\t;|]|\s-\s/).map(function (s) { return s.trim(); }).filter(Boolean);
    return { n: rest[0] || em.split("@")[0], grade: rest[1] || "", email: em, phone: ph };
  }).filter(function (c) { return c.n && !/^(name|full name|crew)$/i.test(c.n); });
}
function pjFrom(f) {
  var sh = f.shoot || iso(addDays(today(), 14));
  return { real: true, name: f.job || "New job", client: f.client || "", brand: f.brand || "", accounts: f.accounts || "", po: f.po || "", budget: num(f.budget), shoot: sh, days: num(f.days) || 1, terms: f.jterms || "APA", split: num(f.split) || 50, payDays: num(f.payDays) || 30, pshoot: f.pshoot || sh,
    award: null, crew: crewParse(f.crew).map(function (c, i) { return { id: "c" + uid().slice(-6) + i, n: c.n, grade: gradeMatch(f.jterms === "Bectu" ? "Bectu" : "APA", c.grade), pay: "Self-employed", h: (c.n.length * 47) % 360, email: c.email, phone: c.phone, sp: [0, 0, 0], call: "", wrap: "" }; }),
    unit: { call: "07:00", lunch: "1 hour", wrap: "19:00" }, ask: null, wrap: null, sign: {}, run: null, extras: [], permits: (f.permits || []).slice(), cs: [{ v: 1, by: "Producer", f: { Call: "", Location: "", "Unit base": "", Lunch: "", Weather: "" } }], rights: [] };
}
/* "1st AC" or "spark" typed in a crew list, matched to the grade on the card so the rate fills in. */
function gradeMatch(card, g) {
  var t = String(g || "").toLowerCase().trim(); if (!t) return "";
  var rows = (RATES[card] || RATES.APA).rows, alias = { dp: "director of photography", dop: "director of photography", "focus puller": "1st ac", "clapper loader": "2nd ac", sparks: "spark", electrician: "spark", "best boy": "best boy", sound: "sound recordist", mua: "make-up", hmu: "hair", runner: "runner" };
  var q = alias[t] || t, hit = rows.find(function (r) { return r[1].toLowerCase() === q; }) || rows.find(function (r) { return r[1].toLowerCase().indexOf(q) === 0; }) || rows.find(function (r) { return r[1].toLowerCase().indexOf(q) >= 0; });
  return hit ? hit[1] : String(g).trim();
}
/* The producer's own shoot days go in the diary too. */
function jobBooking(f) { var d = num(f.days) || 1, en = d > 1 ? iso(addDays(parse(f.shoot), d - 1)) : ""; return { id: uid(), start: f.shoot, end: en, client: f.client || "", production: f.job, contact: f.accounts || "", status: "Confirmed", rate: "", days: String(d), agent: "", notes: "Your job", terms: f.jterms || "APA", kit: "", extra: "", po: f.po || "", message: "", fields: "", grade: "" }; }
function pjNewCard() {
  return '<button class="onb scanh" data-pjnew><span class="onb-t"><span class="part">Run the job</span><span>Add the job you\'re on: the award, shoot days, crew and permits</span></span><span class="go" aria-hidden="true">→</span></button>';
}
function pjNewSheet() {
  return "<h2>A new job.</h2><p class=\"q\">The award, the shoot and who pays. Paste the crew in as you book them.</p>" +
    '<div class="grid2">' + field("nj-job", "Job name", "", "text", "e.g. Canal promo") + field("nj-client", "Agency or client", "", "text", "Who you invoice") + "</div>" +
    '<div class="grid2">' + field("nj-brand", "Brand", "", "text") + field("nj-accounts", "Their accounts email", "", "email") + "</div>" +
    '<div class="grid2">' + field("nj-budget", "Budget (£)", "", "number", "", ' inputmode="numeric"') + field("nj-po", "PO number", "", "text") + "</div>" +
    '<div class="grid2">' + field("nj-shoot", "First shoot day", "", "date") + field("nj-days", "Shoot days", "1", "number", "1", ' inputmode="numeric"') + "</div>" +
    '<div class="field"><span class="lab">Crew terms</span>' + pills("njterms", ["APA", "Bectu"], D.settings.work === "TV and film" ? "Bectu" : "APA") + "</div>" +
    '<div class="field"><label for="nj-crew">Crew, one a line: name, role, email</label><textarea id="nj-crew" rows="5"></textarea></div>' +
    '<div class="acts"><button class="btn solid wide" data-pjnewsave>Start the job</button></div>' + (D.pj && D.pj.real ? '<p class="q">' + esc(D.pj.name) + " moves to your past jobs.</p>" : "");
}
function pjNewSave() {
  var f = { job: val("nj-job"), client: val("nj-client"), brand: val("nj-brand"), accounts: val("nj-accounts"), budget: val("nj-budget"), po: val("nj-po"), shoot: val("nj-shoot"), days: val("nj-days"), jterms: picked("njterms") || "APA", crew: val("nj-crew"), split: "50", payDays: String(num(D.settings.terms) || 30) };
  if (!f.job) { banner("Give the job a name."); return; }
  if (D.pj && D.pj.real) { D.pjPast = (D.pjPast || []).concat([D.pj]).slice(-20); }
  D.pj = pjFrom(f); closeSheet(); extrasSave(); if (f.shoot) upsert("Bookings", jobBooking(f)).then(render); render(); banner(f.job + " is set up. Start with the award or the crew.");
}

/* Idea 1: type a job in one line. */
function quickAdd() {
  return '<form class="qa" id="qa" autocomplete="off"><input id="qa-in" placeholder="Add a job: Nike, 6–7 Nov, £650" aria-label="Add a job in one line" enterkeyhint="done"><button class="btn solid sm" type="submit">Add</button></form>' +
    (D.bookings.length ? "" : '<p class="q qa-h">Say hold or pencil to add it as a hold. Start with "Invoice" to add an invoice, like "Invoice Heinz £1,250".</p>');
}
function quickParse(t) {
  var s = String(t).trim(), low = s.toLowerCase(), am = s.match(/£\s?([\d,]+(?:\.\d+)?)\s*(k\b)?/i), amt = am ? num(am[1]) * (am[2] ? 1000 : 1) : 0;
  if (/^(inv|invoice)\b/i.test(s)) return { k: "inv", client: s.replace(/^inv(oice)?\s*(to|for)?\s*/i, "").replace(/£\s?[\d,.]+\s*k?/i, "").replace(/,/g, " ").replace(/\s+/g, " ").trim(), amount: amt };
  var d = findDate(s, today()), parts = s.split(/,|;|\s-\s|\s–\s/).map(function (x) { return x.trim(); }).filter(Boolean);
  var st = /second hold|2nd hold/.test(low) ? "Second hold" : /\bhold\b|1st hold|first hold/.test(low) ? "First hold" : /pencil|\btbc\b/.test(low) ? "Pencil" : "Confirmed";
  var words = parts.filter(function (p) { return !/£/.test(p) && !findDate(p, today()) && !/^\d/.test(p); }).map(function (p) { return p.replace(/\b(second hold|2nd hold|first hold|1st hold|hold|pencil(led)?|confirmed|booked|tbc)\b/ig, "").trim(); }).filter(Boolean);
  return { k: "bk", production: words[0] || "", client: words[1] || "", start: d ? iso(d.start) : "", end: d && d.end ? iso(d.end) : "", status: st, rate: amt ? String(amt) : "" };
}
function quickSave(t) {
  var q = quickParse(t), save = function (tab, o) { if (mode === "demo") { D[KEY[tab]].push(o); demoSave(); render(); return Promise.resolve(); } return upsert(tab, o).then(render); };
  if (q.k === "inv") {
    if (!q.client || !q.amount) { banner('Say who and how much, like "Invoice Heinz £1,250".'); return; }
    var iss = today();
    save("Invoices", { id: uid(), booking: "", number: nextInvoiceNumber(), client: q.client, contact: "", amount: String(q.amount), issued: iso(iss), due: iso(addDays(iss, num(D.settings.terms) || 30)), paid: "", notes: "" }).then(function () { banner("Invoice to " + q.client + " added. It shows as owed until it's paid."); });
    return true;
  }
  if (!q.production) { banner('Start with the job or client, like "Nike, 6 Nov".'); return; }
  if (!q.start) { banner('Add a date, like "6 Nov" or "6–7 Nov".'); return; }
  var o = { id: uid(), start: q.start, end: q.end, client: q.client || q.production, production: q.production, contact: "", status: q.status, rate: q.rate || D.settings.rate || "", days: String(q.end ? daysBetween(parse(q.start), parse(q.end)) + 1 : 1), agent: "", notes: "", terms: "", kit: "", extra: "", po: "", message: "", fields: "", grade: D.settings.grade || "" };
  save("Bookings", o).then(function () { banner(o.production + ", " + nice(o.start) + (o.end ? " to " + nice(o.end) : "") + ", " + o.status.toLowerCase() + ". Tap it to change anything."); });
  return true;
}

/* Idea 2: every empty list says what to do next. */
function emptyNext(t, b, a) { return '<div class="empty nx"><span>' + esc(t) + '</span><button class="lnk" ' + a + ">" + esc(b) + ' <span aria-hidden="true">→</span></button></div>'; }

/* Idea 3: a nudge to scan again once a week. */
function rescanLine() {
  var last = D.settings.scanned; if (!last) return "";
  var n = daysBetween(parse(last), today()); if (n < 7) return "";
  return '<button class="onb scanh" data-rescan><span class="onb-t"><span class="part">' + n + ' days since your last scan</span><span>Check for new call sheets, holds' + (D.settings.cal === "1" ? ", calendar changes" : "") + ' and payments</span></span><span class="go" aria-hidden="true">→</span></button>';
}
/* Real accounts that haven't connected anything yet get one way back into setup. */
function obNudge() {
  if (D.settings.onb === "2" || flag("sy-obnudge-off")) return "";
  return '<div class="onb scanh obn"><button class="onb-t" data-obstart="1"><span class="part">Finish setting up</span><span>Connect your calendar and bank statements so Systems can match everything up</span></button><button class="lnk" data-obnudgeoff>Not now</button></div>';
}

/* Idea 4: a short line the first time each page opens. */
var TIPS = {
  home: ["Home is what needs you, what's coming up and what you're owed. Type a job in the box to add it.", "02-getting-started"],
  bookings: ["Your diary. Tap a job to log hours, change the status or make the invoice.", "14-your-diary"],
  money: ["What you're owed and what's late. Late ones get the chase drafted for you.", "16-systems-with-xero"],
  more: ["Your details, exports for your accountant, and the rest of the tools.", "17-your-data-and-exports"],
  "t-bank": ["Drop in a bank CSV any time to mark invoices paid.", ""],
  "t-inbox": ["Work email from your last scan, grouped by job.", ""],
  "t-rates": ["APA and Bectu rates by grade, kept up to date.", "13-rates"]
};
function tipFor(t) {
  if (mode !== "google" || flag("sy-tip-" + t)) return "";
  var x = TIPS[t]; if (t === "home" && isProd()) x = ["Run the job takes you from the award to the pay run, step by step. Type a job in the box to add a booking.", "03-systems-as-a-producer"];
  if (!x) return "";
  return '<div class="tipl"><span>' + esc(x[0]) + "</span>" + (tutFor(t) ? '<a class="lnk" target="_blank" rel="noopener" href="' + tutUrl(tutFor(t)) + '">Watch, under a minute</a>' : "") + (t === "home" ? '<button class="lnk" data-tab="t-help">All the how-tos</button>' : "") + '<button class="lnk" data-tipoff="' + esc(t) + '">Got it</button></div>';
}

/* Idea 5: paste an email from any mail app. */
function pasteBox() {
  return '<div class="part">Not on Gmail?</div><p class="q">Copy a call sheet, hold, award or remittance email and paste it here. Systems reads it the same way as a scan.</p><div class="field"><textarea id="pm-text" rows="5" placeholder="Paste the whole email, with the subject line"></textarea></div><div class="acts"><button class="btn" data-pasteread>Read it</button></div>';
}
function pasteRead() {
  var t = val("pm-text"); if (!t) { banner("Paste an email first."); return; }
  var subj = (t.match(/^\s*subject:\s*(.+)$/im) || [])[1] || t.split(/\r?\n/).find(function (l) { return l.trim(); }) || "", from = (t.match(/^\s*from:\s*(.+)$/im) || [])[1] || (t.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [""])[0];
  var dt = (t.match(/^\s*(date|sent):\s*(.+)$/im) || [])[2], when = dt && !isNaN(new Date(dt)) ? new Date(dt) : new Date(), low = t.toLowerCase();
  var k = /call ?sheet/.test(low) ? "cs" : /remittance|payment (advice|sent|confirmation)|has been paid/.test(low) ? "paid" : /timesheet|time sheet|start pack|start form|purchase order/.test(low) ? "do" : "bk", id = "p" + uid();
  var m = { id: id, threadId: id, labelIds: [], snippet: t.replace(/\s+/g, " ").slice(0, 500), internalDate: String(+when), payload: { headers: [{ name: "Subject", value: subj.trim() }, { name: "From", value: from.trim() }] }, k: k };
  SCAN.found = sortAll([m], [], []); SCAN.found.mails = 1; SCAN.found.pasted = true; SCAN.stage = "review"; closeSheet(); render(); window.scrollTo(0, 0);
}

function obClick(b) {
  var d = b.dataset;
  if (fwdClick(b)) return true;
  if (d.obstart) { obStart(+d.obstart || 0); return true; }
  if (b.hasAttribute("data-obnudgeoff")) { flag("sy-obnudge-off", "1"); render(); return true; }
  if (b.hasAttribute("data-obnext")) { obRead(); if (OB.step === 0 && (!OB.f.name || !OB.role)) { banner(!OB.f.name ? "Add your name first." : "Pick what you do."); return true; } OB.err = ""; OB.step = Math.min(OB.step + 1, obSteps().length - 1); obSave(); render(); window.scrollTo(0, 0); return true; }
  if (b.hasAttribute("data-obback")) { obRead(); OB.err = ""; OB.step = Math.max(0, OB.step - 1); obSave(); render(); window.scrollTo(0, 0); return true; }
  if (d.obcon) { obConnect(d.obcon); return true; }
  if (d.obbankx) { var x = OB.files.splice(+d.obbankx, 1)[0]; if (x) OB.bank = OB.bank.filter(function (r) { return r.file !== x.name; }); obSave(); render(); return true; }
  if (d.obpermit) { obRead(); var P = OB.f.permits = OB.f.permits || [], i = P.indexOf(d.obpermit); if (i >= 0) P.splice(i, 1); else P.push(d.obpermit); obSave(); render(); return true; }
  if (b.hasAttribute("data-obgo")) { obGo(); return true; }
  if (b.hasAttribute("data-pjnew")) { openSheet(pjNewSheet()); return true; }
  if (b.hasAttribute("data-pjnewsave")) { pjNewSave(); return true; }
  if (b.hasAttribute("data-rescan")) { runScan(scanOpts()); return true; }
  if (d.tipoff) { flag("sy-tip-" + d.tipoff, "1"); render(); return true; }
  if (b.hasAttribute("data-pasteread")) { pasteRead(); return true; }
  return false;
}
document.addEventListener("change", function (e) {
  var t = e.target;
  if (t.id === "ob-bankfile") { obRead(); obBankFiles(t.files); }
  if (t.id === "ob-crewfile") readFiles(t.files, function (f, txt) { var R = csvRows(txt), h = (R[0] || []).map(function (x) { return x.toLowerCase(); }), ni = h.findIndex(function (x) { return /name/.test(x); }), ri = h.findIndex(function (x) { return /role|position|job|grade|dept/.test(x); }), ei = h.findIndex(function (x) { return /mail/.test(x); }), body = ni >= 0 ? R.slice(1) : R;
    var lines = body.map(function (r) { return ni >= 0 ? [r[ni], ri >= 0 ? r[ri] : "", ei >= 0 ? r[ei] : ""].filter(Boolean).join(", ") : r.filter(Boolean).join(", "); }).filter(Boolean), ta = $("ob-crew"); if (ta) ta.value = (ta.value ? ta.value.trim() + "\n" : "") + lines.join("\n"); banner(lines.length + " people added from " + f.name + "."); });
});
document.addEventListener("submit", function (e) { if (e.target.id === "qa") { e.preventDefault(); var v = val("qa-in"); if (v && quickSave(v)) { var i = $("qa-in"); if (i) i.value = ""; } } });
/* ---------- any inbox: Outlook, iCloud, Yahoo or work mail forwards to a private Systems address, and the scan reads it the same way as Gmail ---------- */
/* The address only keeps work emails (call sheets, holds, invoices, payments) and drops the rest. What it keeps is deleted once this app has collected it. */
var MAILK = ["Gmail", "Outlook", "iCloud", "Other"];
var FWD_HOW = {
  Outlook: { url: "https://outlook.live.com/mail/0/options/mail/forwarding", work: "https://outlook.office.com/mail/options/mail/forwarding", steps: ["Open Outlook's forwarding settings.", "Turn on forwarding and paste your Systems address.", "Tick Keep a copy of forwarded messages, then Save."] },
  iCloud: { url: "https://www.icloud.com/mail/", steps: ["Open iCloud Mail and tap the settings button, then Forwarding.", "Tick Forward my email to and paste your Systems address.", "Save. Your email stays in iCloud as well."] },
  Other: { url: "", steps: ["In your email settings, find Forwarding. On Yahoo it's Settings, More settings, Mailboxes.", "Forward to your Systems address and keep a copy.", "Save. If it sends a confirmation email, the link shows up here."] }
};
var FW = { busy: false, n: 0, confirm: "", err: "" };
function mailKind() { var m = (OB.active && OB.kind) || D.settings.mail || "Gmail"; return m === "Apple Mail" ? "iCloud" : MAILK.indexOf(m) >= 0 ? m : "Other"; }
function fwdGet() { try { return JSON.parse(D.settings.fwd || localStorage.getItem("sy-fwd") || "null"); } catch (e) { return null; } }
function isFwd() { return mailKind() !== "Gmail" && !!fwdGet(); }
function scanOpts() { var f = isFwd(); return { mail: !f, fwd: f, cal: D.settings.cal === "1" }; }
function fwdApi(path, body) {
  if (!CFG.scanApi) return Promise.reject(new Error("Forwarding is switching on soon. Paste emails in from Help for now."));
  return fetch(CFG.scanApi + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) })
    .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error === "key" ? "Your Systems address needs setting up again." : "Couldn't reach your Systems address."); return j; }); });
}
/* One address per person, kept in their own sheet so their phone and laptop share it. */
function fwdNew() {
  var x = fwdGet(); if (x) return Promise.resolve(x);
  if (FW.busy) return Promise.resolve(null);
  FW.busy = true; FW.err = "";
  return fwdApi("/new").then(function (j) {
    FW.busy = false; var v = JSON.stringify({ id: j.id, key: j.key, address: j.address });
    try { localStorage.setItem("sy-fwd", v); } catch (e) {}
    if (G.sheetId) change("Settings", function (st) { st.fwd = v; }).catch(function () {}); else D.settings.fwd = v;
    render(); return j;
  }, function (e) { FW.busy = false; FW.err = e.message; render(); return null; });
}
function poolKey() { var x = fwdGet(); return "sy-fwd-pool-" + (x ? x.id : ""); }
function poolGet() { try { return JSON.parse(localStorage.getItem(poolKey()) || "[]"); } catch (e) { return []; } }
function poolSet(p) { try { localStorage.setItem(poolKey(), JSON.stringify(p.slice(-400))); } catch (e) {} }
/* A forwarded email in the same shape as a Gmail one, so the same sorting reads it. */
function fwdMsg(m) {
  var low = (m.subject + " " + m.snippet + " " + (m.files || []).join(" ")).toLowerCase(), me = (D.settings.myMail || OB.f.myMail || "").toLowerCase();
  var mine = !!me && String(m.from).toLowerCase().indexOf(me) >= 0;
  var k = /call ?sheet|callsheet/.test(low) ? "cs" : /remittance|payment (advice|sent|made|confirmation)|has been paid|we(’|')?ve paid/.test(low) ? "paid" : /invoice|\binv\b/.test(low) ? "inv" : /timesheet|time sheet|timecard|start (pack|form)|crew form|purchase order|po number/.test(low) ? "do" : "bk";
  return { id: m.key, threadId: m.key, labelIds: mine ? ["SENT"] : [], snippet: (m.snippet || "").slice(0, 500), internalDate: String(m.at || Date.now()), payload: { headers: [{ name: "Subject", value: m.subject || "" }, { name: "From", value: m.from || "" }, { name: "To", value: m.to || "" }] }, k: k };
}
/* Collect what's arrived, keep it on this device, then clear it from the address. */
function fwdPull() {
  var x = fwdGet(); if (!x) return Promise.resolve(poolGet());
  return fwdApi("/read", { id: x.id, key: x.key }).then(function (j) {
    var got = j.mails || [], pool = poolGet(), fresh = 0;
    got.forEach(function (m) { if (m.confirm) { FW.confirm = m.confirm; return; } if (!pool.some(function (p) { return p.id === m.key; })) { pool.push(fwdMsg(m)); fresh++; } });
    poolSet(pool); FW.n += fresh;
    if (got.length) fwdApi("/ack", { id: x.id, key: x.key, keys: got.map(function (m) { return m.key; }) }).catch(function () {});
    return pool;
  });
}
function fwdClear() { if (isFwd()) poolSet([]); FW.n = 0; }
function fwdCheck() {
  FW.busy = true; FW.err = ""; render();
  fwdPull().then(function (p) { FW.busy = false; OB.fwdN = p.length; obSave(); render(); banner(p.length ? p.length + " work email" + (p.length === 1 ? "" : "s") + " in so far." : FW.confirm ? "Your email sent a confirmation. Tap Confirm forwarding." : "Nothing yet. Forwarding can take a few minutes to start."); },
    function (e) { FW.busy = false; FW.err = e.message; render(); });
}
/* The connect step for anything that isn't Gmail. */
function fwdPanel() {
  var k = mailKind(), x = fwdGet(), h = FWD_HOW[k] || FWD_HOW.Other, n = poolGet().length;
  if (!CFG.scanApi) return '<p class="q">Forwarding from ' + esc(k === "Other" ? "other email" : k) + " is switching on soon. Until then, paste emails in from Help.</p>";
  var addr = x ? '<div class="row static ob-c fwd-a"><span class="up-t">Your Systems address<span class="fwd-ad">' + esc(x.address) + '</span></span><button class="btn sm solid" data-fwdcopy>Copy</button></div>'
    : '<div class="row static ob-c"><span class="up-t">Your Systems address<span class="q">' + (FW.err ? esc(FW.err) : "Making it now…") + "</span></span>" + (FW.err ? '<button class="btn sm" data-fwdnew>Try again</button>' : "") + "</div>";
  return '<div class="rows">' + addr + "</div>" +
    field("ob-myMail", "Your " + (k === "Other" ? "" : k + " ") + "email address", OB.f.myMail || "", "email", k === "Outlook" ? "you@outlook.com" : k === "iCloud" ? "you@icloud.com" : "you@yourdomain.com") +
    '<ol class="fwd-s">' + h.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" +
    '<div class="acts">' + (h.url ? '<a class="btn" target="_blank" rel="noopener" href="' + h.url + '">Open ' + esc(k) + " settings</a>" : "") + (h.work ? '<a class="btn" target="_blank" rel="noopener" href="' + h.work + '">Work or school Outlook</a>' : "") + "</div>" +
    (FW.confirm ? '<div class="note">Your email sent a confirmation first. <a class="lnk" target="_blank" rel="noopener" href="' + esc(/^https:/.test(FW.confirm) ? FW.confirm : (h.url || "#")) + '">Confirm forwarding</a></div>' : "") +
    '<div class="rows"><div class="row static ob-c"><span class="up-t">' + (n ? n + " work email" + (n === 1 ? "" : "s") + " in" : "Waiting for your first email") + '<span class="q">Send yourself a test with "call sheet" in the subject, then check.</span></span><button class="btn sm" data-fwdcheck' + (FW.busy ? " disabled" : "") + ">" + (FW.busy ? "Checking…" : "Check") + "</button></div></div>" +
    '<details class="ob-how"><summary class="q">Got older call sheets and invoices?</summary><p class="q">Forwarding catches new email. For the last few months, select your call sheets, holds, invoices and remittances and forward them to your Systems address. In Outlook, Forward as attachment sends lots in one go.</p></details>' +
    '<p class="q">Only work emails are kept, like call sheets, holds, invoices and payments. Everything else is dropped straight away. What\'s kept is deleted once Systems has it, and never shared.</p>';
}
/* On the dashboard: new forwarded email, ready to sort. */
function fwdLine() {
  if (!isFwd() || !FW.n) return "";
  return '<button class="onb scanh" data-rescan><span class="onb-t"><span class="part">' + FW.n + " new work email" + (FW.n === 1 ? "" : "s") + '</span><span>Forwarded since you last looked. Sort them into your jobs and invoices</span></span><span class="go" aria-hidden="true">→</span></button>';
}
function fwdHelp() {
  var x = fwdGet(); if (!x) return "";
  return '<div class="part">Your Systems address</div><div class="rows"><div class="row static ob-c fwd-a"><span class="up-t">Forward work email here<span class="fwd-ad">' + esc(x.address) + '</span></span><button class="btn sm" data-fwdcopy>Copy</button></div></div>' +
    '<div class="acts"><button class="btn sm" data-fwdforget>' + (FW.sure ? "Tap again to delete it" : "Delete this address") + '</button></div><p class="q">Deleting it clears anything waiting there. Turn off forwarding in your email too.</p>';
}
function fwdForget() {
  var x = fwdGet(); if (!x) return;
  if (!FW.sure) { FW.sure = true; render(); return; }
  FW.sure = false;
  fwdApi("/forget", { id: x.id, key: x.key }).catch(function () {}).then(function () {
    poolSet([]); try { localStorage.removeItem("sy-fwd"); } catch (e) {}
    var done = function () { render(); banner("Your Systems address is deleted. Turn off forwarding in your email too."); };
    if (G.sheetId) change("Settings", function (st) { st.fwd = ""; }).then(done, done); else { D.settings.fwd = ""; done(); }
  });
}
function fwdClick(b) {
  if (b.hasAttribute("data-fwdforget")) { fwdForget(); return true; }
  if (b.hasAttribute("data-fwdcopy")) { var x = fwdGet(); if (x) { (navigator.clipboard ? navigator.clipboard.writeText(x.address) : Promise.reject()).then(function () { banner("Copied. Paste it into your forwarding settings."); }, function () { banner(x.address); }); } return true; }
  if (b.hasAttribute("data-fwdnew")) { fwdNew(); return true; }
  if (b.hasAttribute("data-fwdcheck")) { obRead(); fwdCheck(); return true; }
  return false;
}

/* ---------- start-up ---------- */
function startGoogle(silent) {
  return getToken(silent).then(function () {
    return api("https://www.googleapis.com/oauth2/v3/userinfo").then(function (u) { G.email = u.email || ""; G.name = u.name || ""; }).catch(function () {});
  }).then(findSheet).then(function (id) {
    mode = "google";
    if (id) { G.sheetId = id; return ensureTabs().then(readAll).then(function (d) { D = d; extrasLoad(); }); }
    D = { bookings: [], invoices: [], expenses: [], days: [], settings: { name: "", rate: "", terms: "30", tax: "25", mileage: "45", mail: "Gmail", hasAgent: "No", invoicePrefix: "INV" } };
  }).then(function () {
    scanLoad();
    var pend = flag("sy-scan-pending"); try { localStorage.removeItem("sy-scan-pending"); } catch (e) {}
    if (OB.active && OB.email && OB.email !== G.email) OB = obBlank();
    if (OB.active) { if (G.cal) OB.cal = true; if (G.gmail) OB.mail = true; obSave(); render(); return; }
    if (!G.sheetId || !D.settings.name) { obStart(0); return; }
    render(); if (pend && G.gmail) runScan(scanOpts());
    else if (isFwd()) fwdPull().then(function () { if (FW.n) render(); }, function () {});
  });
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
  if (d.pick) { var g = b.parentNode; g.querySelectorAll(".pill").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); if (d.pick === "hasAgent") { var f = $("agentf"); if (f) f.hidden = d.v !== "Yes"; } if (d.pick === "terms") { var ef = $("extraf"), tn = $("termsnote"); if (ef) ef.hidden = d.v !== "TV drama"; if (tn) tn.textContent = TERMN[d.v]; swapCard("b-grade", cardOf(d.v)); } if (d.pick === "cterms") swapCard("c-grade", cardOf(d.v)); if (d.pick === "work") swapCard("s-grade", cardOf(d.v)); if (d.pick === "rcard") { openSheet(rateSheet(d.v)); return; } if (d.pick === "bankhow") { try { localStorage.setItem("sy-bankhow", d.v); } catch (e) {} var bx = b.closest(".bh"); if (bx) bx.querySelector(".bh-s").innerHTML = bankSteps(d.v); return; } if (d.pick === "obmail") { obRead(); OB.kind = d.v; obSave(); render(); if (d.v !== "Gmail") fwdNew(); return; } if (d.pick === "pjterms") { pj().terms = d.v; pjSave(); openSheet(crewSheet()); render(); return; } liveCalc(); return; }
  if (b.hasAttribute("data-close")) { closeSheet(); return; }
  if (obClick(b) || scanClick(b) || pjClick(b) || bankClick(b) || toolClick(b) || deptClick(b) || customClick(b)) return;
  if (b.hasAttribute("data-tournext")) { if (tourI < TOUR.length - 1) showTour(tourI + 1); else endTour(); return; }
  if (b.hasAttribute("data-tourback")) { showTour(Math.max(0, tourI - 1)); return; }
  if (b.hasAttribute("data-tourend")) { endTour(); return; }
  if (b.hasAttribute("data-tour")) { flag("sy-onb-tour", "1"); showTour(0); return; }
  if (b.hasAttribute("data-features")) { openSheet(featuresSheet()); return; }
  if (b.hasAttribute("data-check")) { openSheet(checkForm()); liveCheck(); return; }
  if (b.hasAttribute("data-starteroff")) { flag("eltio-systems-starter-off", "1"); render(); return; }
  if (b.hasAttribute("data-howphone")) { flag("eltio-systems-phone", "1"); openSheet('<h2>Put it on your home screen</h2><div class="sum"><div><span class="q">iPhone</span><span>Safari, Share, Add to Home Screen</span></div><div><span class="q">Android</span><span>Chrome menu, Install app</span></div></div><p class="q">Then sign in with the same Google account on your laptop. Both read the same sheet, so they always match.</p><div class="acts"><button class="btn solid wide" data-close>Done</button></div>'); render(); return; }
  if (d.job) { startJob(d.job); return; }
  if (d.jobf) { S.tab = "t-made" + d.jobf; closeSheet(); render(); window.scrollTo(0, 0); return; }
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
  if (b.hasAttribute("data-switchjob")) { closeSheet(); toggleJobMenu(b); return; }
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
/* Same job already saved on this device: keep its pages and sidebar rather than starting again. */
var kept = asJob && (function () { var s = demoLoad(); return s && s.settings && s.settings.job === asJob && s.settings.name ? s : null; })();
if (kept) { mode = "demo"; D = kept; render(); } else if (!(asJob && startJob(asJob))) render();
/* Back from Google's sign-in page (home-screen iPhones): the token is on the address. Otherwise a returning user on this device gets a silent sign-in; if Google needs a tap, the welcome screen stays. */
try {
  var backFromGoogle = CFG.googleClientId && tokenFromHash();
  if (backFromGoogle) startGoogle(true).catch(function (er) { banner("Sign-in didn't finish: " + (er.message || er)); });
  else if (CFG.googleClientId && localStorage.getItem("eltio-systems-signed-in") && !asJob) startGoogle(true).catch(function () {});
} catch (e) {}
setInterval(function () { document.querySelectorAll(".callin").forEach(function (e) { e.textContent = callIn(); }); }, 30000);
})();
