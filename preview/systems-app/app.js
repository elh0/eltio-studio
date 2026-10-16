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
function paintSky() { var p = phase(); document.documentElement.dataset.sky = p; var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = p === "night" ? "#0D1430" : "#F2F2EF"; }

/* ---------- data shape (also the columns of each sheet tab) ---------- */
var TABS = {
  Bookings: ["id", "start", "end", "client", "production", "contact", "status", "rate", "days", "agent", "notes"],
  Invoices: ["id", "booking", "number", "client", "contact", "amount", "issued", "due", "paid", "notes"],
  Expenses: ["id", "date", "booking", "item", "amount", "notes"],
  Settings: ["key", "value"]
};
var KEY = { Bookings: "bookings", Invoices: "invoices", Expenses: "expenses" };
var STATUSES = ["Pencil", "First hold", "Second hold", "Confirmed", "Cancelled"];
var D = { bookings: [], invoices: [], expenses: [], settings: {} };

/* ---------- store: Google Sheets, or sample data in this browser ---------- */
var CFG = window.ELTIO_CONFIG || {};
var SCOPE = "https://www.googleapis.com/auth/drive.file openid email profile";
var G = { token: null, exp: 0, client: null, sheetId: null, email: "" };
var mode = null; /* "google" | "demo" */
var DEMO_KEY = "eltio-systems-demo-1";

function sample() {
  var t = today(), d = function (n) { return iso(addDays(t, n)); };
  return {
    settings: { name: "", trading: "", role: "DP", rate: "650", terms: "30", tax: "25", mail: "Gmail", hasAgent: "No", agent: "", agentEmail: "", invoicePrefix: "INV" },
    bookings: [
      { id: "b1", start: d(12), end: d(13), client: "Northlight Films", production: "Commercial", contact: "pm@example.com", status: "Confirmed", rate: "650", days: "2", agent: "", notes: "" },
      { id: "b2", start: d(7), end: "", client: "Field Records", production: "Music video", contact: "producer@example.com", status: "First hold", rate: "650", days: "1", agent: "", notes: "Second hold from another job the same day" },
      { id: "b3", start: d(19), end: "", client: "Studio Kite", production: "Branded film", contact: "hello@example.com", status: "Second hold", rate: "650", days: "1", agent: "yes", notes: "" },
      { id: "b4", start: d(-35), end: d(-34), client: "Northlight Films", production: "Commercial", contact: "pm@example.com", status: "Confirmed", rate: "650", days: "2", agent: "", notes: "" },
      { id: "b5", start: d(-6), end: "", client: "Field Records", production: "Music video", contact: "producer@example.com", status: "Confirmed", rate: "650", days: "1", agent: "", notes: "" }
    ],
    invoices: [
      { id: "i1", booking: "b4", number: "INV-2026-014", client: "Northlight Films", contact: "pm@example.com", amount: "1300", issued: d(-33), due: d(-3 - 30 + 30 - 8), paid: "", notes: "" },
      { id: "i2", booking: "", number: "INV-2026-013", client: "Studio Kite", contact: "hello@example.com", amount: "2400", issued: d(-70), due: d(-40), paid: "", notes: "" },
      { id: "i3", booking: "", number: "INV-2026-012", client: "Field Records", contact: "producer@example.com", amount: "1800", issued: d(-50), due: d(-20), paid: d(-12), notes: "" }
    ],
    expenses: []
  };
}

function demoLoad() { try { var s = JSON.parse(localStorage.getItem(DEMO_KEY) || "null"); if (s && s.settings) return s; } catch (e) {} return sample(); }
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
function bookingValue(b) { return num(b.rate) * Math.max(1, num(b.days) || 1); }
function invoiced(bid) { return D.invoices.some(function (v) { return v.booking === bid; }); }
function nextInvoiceNumber() { var y = today().getFullYear(), pre = (D.settings.invoicePrefix || "INV") + "-" + y + "-", n = 0; D.invoices.forEach(function (v) { var m = String(v.number).indexOf(pre) === 0 ? parseInt(String(v.number).slice(pre.length), 10) : 0; if (m > n) n = m; }); return pre + String(n + 1).padStart(3, "0"); }

/* ---------- what needs the person ---------- */
function todo() {
  var t = today(), L = [];
  overdue().forEach(function (v) { var n = daysBetween(parse(v.due), t); L.push({ k: "chase", id: v.id, t: "Chase " + v.client + ", " + money(num(v.amount)), tag: n + " days late", amb: 1 }); });
  D.bookings.filter(isHold).forEach(function (b) { var d = parse(b.start); if (d && d >= t && daysBetween(t, d) <= 10) L.push({ k: "hold", id: b.id, t: (b.status === "Pencil" ? "Pencil" : b.status) + ": " + b.production + ", " + nice(b.start), tag: "Ask to confirm" }); });
  D.bookings.filter(function (b) { return isDone(b) && !invoiced(b.id); }).forEach(function (b) { L.push({ k: "invoice", id: b.id, t: "Invoice " + b.client + " for " + b.production, tag: money(bookingValue(b)) }); });
  return L;
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
    : hi + "Invoice " + v.number + " for " + money(num(v.amount)) + " is now " + n + " days overdue. Please confirm a payment date by Friday. If it stays unpaid I may need to add statutory late payment interest.";
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

/* ---------- screens ---------- */
function welcome() {
  var hasG = !!CFG.googleClientId;
  return '<div class="hero"><p class="q">Eltio Systems</p><h1>Less admin.<br>Same tools.</h1><p class="q">Bookings, holds, invoices and chasing in one place. Your data lives in a sheet in your own Google Drive, and nothing is ever sent for you.</p>' +
    '<button class="btn solid gbtn" data-signin' + (hasG ? "" : " disabled") + '><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zM6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14zM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"/></svg>Sign in with Google</button>' +
    (hasG ? "" : '<p class="q">Google sign-in switches on once the Eltio Google account is set up.</p>') +
    '<button class="btn" data-demo>Try it with sample data</button>' +
    '<p class="q">On your phone, open this page and add it to your home screen. Sign in with the same Google account on your laptop and everything matches.</p><p class="q"><a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a></p></div>';
}
function setup() {
  var s = D.settings;
  return '<div class="top"><span class="q">Set up</span><span class="q">' + (mode === "demo" ? "Sample data" : esc(G.email)) + '</span></div><h2>Tell us about your work.</h2>' +
    field("s-name", "Your name", s.name, "text", "First and last name") + field("s-trading", "Trading name", s.trading, "text", "Your Ltd or trading name (optional)") +
    '<div class="field"><span class="lab">What do you do?</span>' + pills("role", ["Director", "DP", "Producer", "Editor", "Crew", "Something else"], s.role) + "</div>" +
    '<div class="grid2">' + field("s-rate", "Day rate (£)", s.rate, "number", "650", ' inputmode="numeric"') + field("s-terms", "Payment terms (days)", s.terms || "30", "number", "30", ' inputmode="numeric"') + "</div>" +
    field("s-tax", "Put aside for tax (%)", s.tax || "25", "number", "25", ' inputmode="numeric"') +
    '<div class="field"><span class="lab">Which email do you use?</span>' + pills("mail", ["Gmail", "Outlook", "Apple Mail", "Other"], s.mail || "Gmail") + "</div>" +
    '<div class="field"><span class="lab">Do you have an agent?</span>' + pills("hasAgent", ["Yes", "No"], s.hasAgent || "No") + "</div>" +
    '<div id="agentf"' + (s.hasAgent === "Yes" ? "" : " hidden") + ' class="stack">' + field("s-agent", "Your agent", s.agent, "text", "Agency and agent's name") + field("s-agentEmail", "Their email", s.agentEmail, "email", "bookings@agency.com") + '<p class="q">Holds that come through your agent get drafted to them instead.</p></div>' +
    '<button class="btn solid" data-savesetup>' + (D.settings.name ? "Save" : "Build my sheet and start") + "</button>" +
    (mode === "google" && !G.sheetId ? '<p class="q">This makes one Google Sheet called "Eltio Systems" in your Drive. You can open and edit it any time.</p>' : "");
}
function home() {
  var s = D.settings, L = todo(), up = D.bookings.filter(function (b) { var d = parse(b.end || b.start); return b.status !== "Cancelled" && d && d >= today(); }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  var od = overdue().reduce(function (a, v) { return a + num(v.amount); }, 0), holds = up.filter(isHold).length, conf = up.filter(function (b) { return b.status === "Confirmed"; }).length;
  return '<div class="top"><span class="q">' + nice(iso(today())) + (mode === "demo" ? " · sample data" : "") + '</span><span class="q">' + (busy ? "Saving…" : "") + "</span></div>" +
    "<h2>" + greet() + (s.name ? ", " + esc(first(s.name)) : "") + ".</h2><p class=\"q\">" + (L.length ? L.length + " thing" + (L.length > 1 ? "s" : "") + " need" + (L.length > 1 ? "" : "s") + " you." : "Nothing needs you.") + " " + conf + " booked, " + holds + " on hold.</p>" +
    '<div class="kpis"><div class="kpi"><b>' + money(owed()) + '</b><span class="q">Owed to you</span></div><div class="kpi' + (od ? " amb" : "") + '"><b>' + money(od) + '</b><span class="q">Overdue</span></div><div class="kpi"><b>' + money(bookedThisMonth()) + '</b><span class="q">Booked this month</span></div><div class="kpi"><b>' + money(paidThisYear() * num(s.tax || 25) / 100) + '</b><span class="q">Tax to put aside</span></div></div>' +
    '<div class="two"><div class="stack"><div class="part">For you</div><div class="rows">' + (L.length ? L.map(function (x) { return '<button class="row" data-todo="' + x.k + '" data-id="' + x.id + '"><span>' + esc(x.t) + '</span><span class="tag' + (x.amb ? " amb" : "") + '">' + esc(x.tag) + "</span></button>"; }).join("") : '<p class="empty">All clear.</p>') + "</div></div>" +
    '<div class="stack"><div class="part">Coming up</div><div class="rows">' + (up.length ? up.slice(0, 5).map(bookingRow).join("") : '<p class="empty">Nothing booked yet.</p>') + '</div><button class="lnk" data-addbooking>Add a booking</button></div></div>';
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
    '<div class="kpis"><div class="kpi"><b>' + money(owed()) + '</b><span class="q">Owed, ' + open.length + " invoice" + (open.length === 1 ? "" : "s") + '</span></div><div class="kpi' + (od ? " amb" : "") + '"><b>' + money(od) + '</b><span class="q">Overdue</span></div></div>' +
    '<div class="two"><div class="stack"><div class="part">Unpaid</div><div class="rows">' + (open.length ? open.map(invoiceRow).join("") : '<p class="empty">Nothing outstanding.</p>') + '</div><div class="part">Paid</div><div class="rows">' + (paid.length ? paid.slice(0, 10).map(invoiceRow).join("") : '<p class="empty">None yet.</p>') + "</div></div>" +
    '<div class="stack"><div class="part">Tax and VAT</div><div class="sum"><div><span class="q">Paid since 6 April</span><span>' + money(paidThisYear()) + '</span></div><div><span class="q">Put aside (' + esc(s.tax || 25) + '%)</span><span>' + money(paidThisYear() * num(s.tax || 25) / 100) + '</span></div><div><span class="q">Invoiced, last 12 months</span><span>' + money(r12) + ' of £90,000</span></div></div><div class="bar"><i style="width:' + Math.min(100, r12 / 900) + '%"></i></div><p class="q">£90,000 in 12 months is the VAT line. This is a guide, not tax advice.</p></div></div>';
}
function more() {
  var s = D.settings;
  return '<div class="top"><span>You</span><span></span></div><h2>' + esc(s.name || "Your account") + "</h2>" +
    '<div class="sum"><div><span class="q">Signed in</span><span>' + (mode === "demo" ? "Sample data, this browser only" : esc(G.email || "Google")) + '</span></div><div><span class="q">Your data</span><span>' + (mode === "demo" ? "Not saved to Drive" : "In your Google Drive") + '</span></div><div><span class="q">Day rate</span><span>' + money(num(s.rate)) + '</span></div><div><span class="q">Terms</span><span>' + esc(s.terms || 30) + ' days</span></div><div><span class="q">Email</span><span>' + esc(s.mail || "Gmail") + '</span></div><div><span class="q">Agent</span><span>' + (s.hasAgent === "Yes" ? esc(s.agent || "Yes") : "None") + "</span></div></div>" +
    '<div class="acts"><button class="btn" data-editsetup>Edit details</button>' + (mode === "google" && G.sheetId ? '<a class="btn" target="_blank" rel="noopener" href="https://docs.google.com/spreadsheets/d/' + esc(G.sheetId) + '">Open my sheet</a>' : "") + "</div>" +
    '<div class="part">On your phone</div><p class="q">iPhone: open this page in Safari, tap Share, then Add to Home Screen. Android: tap the menu, then Install app. Sign in with the same Google account and it matches your laptop.</p>' +
    '<div class="part">Your data</div><p class="q">Everything is in one Google Sheet in your Drive, which you own and can edit or delete. Eltio can only see files this app made, and keeps no copy. Nothing is ever sent for you: drafts open in your own email.</p>' +
    '<div class="acts"><button class="btn" data-signout>' + (mode === "demo" ? "Leave sample data" : "Sign out") + "</button>" + (mode === "demo" ? '<button class="lnk" data-resetdemo>Reset sample data</button>' : "") + "</div>" + '<p class="q"><a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a></p>';
}

/* ---------- forms ---------- */
function bookingForm(b) {
  var s = D.settings, isNew = !b; b = b || { id: uid(), start: iso(addDays(today(), 7)), end: "", client: "", production: "", contact: "", status: "First hold", rate: s.rate || "", days: "1", agent: "", notes: "" };
  var acts = isNew ? "" : '<div class="acts">' + (isHold(b) ? '<button class="btn" data-draft="hold" data-id="' + b.id + '">Ask to confirm</button>' : "") + (b.status === "Confirmed" && !isDone(b) ? '<button class="btn" data-draft="confirm" data-id="' + b.id + '">Send booking confirmation</button>' : "") + (isDone(b) && !invoiced(b.id) ? '<button class="btn" data-invoicefor="' + b.id + '">Make the invoice</button>' : "") + "</div>";
  return '<h2>' + (isNew ? "Add a booking" : esc(b.production || "Booking")) + "</h2>" + acts + '<input type="hidden" id="b-id" value="' + esc(b.id) + '">' +
    '<div class="grid2">' + field("b-production", "What is it?", b.production, "text", "Commercial, music video…") + field("b-client", "Who for?", b.client, "text", "Production company") + "</div>" +
    field("b-contact", "Their email", b.contact, "email", "producer@company.com") +
    '<div class="grid2">' + field("b-start", "First day", b.start, "date") + field("b-end", "Last day (if more than one)", b.end, "date") + "</div>" +
    '<div class="field"><span class="lab">Status</span>' + pills("status", STATUSES, b.status) + "</div>" +
    '<div class="grid2">' + field("b-rate", "Day rate (£)", b.rate, "number", "", ' inputmode="numeric"') + field("b-days", "Days", b.days, "number", "1", ' inputmode="numeric"') + "</div>" +
    (s.hasAgent === "Yes" ? '<div class="field"><span class="lab">Came through your agent?</span>' + pills("viaAgent", ["Yes", "No"], b.agent ? "Yes" : "No") + "</div>" : "") +
    field("b-notes", "Notes", b.notes, "text", "Optional") +
    '<div class="acts"><button class="btn solid wide" data-savebooking>Save</button>' + (isNew ? '<button class="btn" data-close>Cancel</button>' : '<button class="btn" data-delbooking="' + b.id + '">Delete</button>') + "</div>";
}
function invoiceForm(v, fromBooking) {
  var s = D.settings, isNew = !v, t = today(), b = fromBooking;
  v = v || { id: uid(), booking: b ? b.id : "", number: nextInvoiceNumber(), client: b ? b.client : "", contact: b ? b.contact : "", amount: b ? String(bookingValue(b)) : "", issued: iso(t), due: iso(addDays(t, num(s.terms) || 30)), paid: "", notes: b ? b.production + ", " + niceRange(b.start, b.end) : "" };
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

/* ---------- render ---------- */
var VIEWS = { home: home, bookings: bookings, money: moneyScr, more: more };
function render() {
  paintSky();
  var signedIn = !!mode, ready = signedIn && D.settings && D.settings.name && (mode === "demo" || G.sheetId);
  $("main").innerHTML = !signedIn ? welcome() : !ready ? setup() : VIEWS[S.tab]();
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
    if (id) { G.sheetId = id; return readAll().then(function (d) { D = d; }); }
    D = { bookings: [], invoices: [], expenses: [], settings: { name: "", rate: "", terms: "30", tax: "25", mail: "Gmail", hasAgent: "No", invoicePrefix: "INV" } };
  }).then(render);
}
function saveSetup() {
  var s = D.settings;
  s.name = val("s-name"); s.trading = val("s-trading"); s.role = picked("role") || s.role || ""; s.rate = val("s-rate"); s.terms = val("s-terms") || "30"; s.tax = val("s-tax") || "25";
  s.mail = picked("mail") || "Gmail"; s.hasAgent = picked("hasAgent") || "No"; s.agent = val("s-agent"); s.agentEmail = val("s-agentEmail"); s.invoicePrefix = s.invoicePrefix || "INV";
  if (!s.name) { banner("Add your name first."); return; }
  if (mode === "demo") { demoSave(); S.tab = "home"; render(); banner("Saved."); return; }
  var p = G.sheetId ? Promise.resolve() : (busy++, render(), createSheet("Eltio Systems" + (s.trading ? ": " + s.trading : "")).then(function () { busy--; }));
  p.then(function () { return change("Settings", function () {}); }).then(function () { S.tab = "home"; render(); banner("Saved to your Drive."); }).catch(function (e) { busy = Math.max(0, busy - 1); render(); banner("Couldn't save: " + (e.message || e)); });
}

document.addEventListener("click", function (e) {
  var b = e.target.closest("button,a"); if (!b) { if (e.target.id === "shade") closeSheet(); return; }
  var d = b.dataset;
  if (d.pick) { var g = b.parentNode; g.querySelectorAll(".pill").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); if (d.pick === "hasAgent") { var f = $("agentf"); if (f) f.hidden = d.v !== "Yes"; } return; }
  if (b.hasAttribute("data-close")) { closeSheet(); return; }
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
  if (d.todo) { if (d.todo === "chase") showDraft("chase", d.id); else if (d.todo === "hold") showDraft("hold", d.id); else openSheet(invoiceForm(null, D.bookings.find(function (x) { return x.id === d.id; }))); return; }
  if (d.draft) { showDraft(d.draft, d.id); return; }
  if (b.hasAttribute("data-compose")) { if (DRAFT) compose(DRAFT.to, DRAFT.subject, DRAFT.body); closeSheet(); return; }
  if (b.hasAttribute("data-copy")) { if (DRAFT && navigator.clipboard) navigator.clipboard.writeText("Subject: " + DRAFT.subject + "\n\n" + DRAFT.body).then(function () { banner("Copied."); }, function () { banner("Couldn't copy."); }); return; }
  if (b.hasAttribute("data-savebooking")) {
    var start = val("b-start"); if (!start) { banner("Add the first day."); return; }
    var end = val("b-end"), days = val("b-days") || (end && parse(end) ? String(daysBetween(parse(start), parse(end)) + 1) : "1");
    var o = { id: val("b-id"), start: start, end: end && end !== start ? end : "", client: val("b-client"), production: val("b-production"), contact: val("b-contact"), status: picked("status") || "First hold", rate: val("b-rate"), days: days, agent: picked("viaAgent") === "Yes" ? "yes" : "", notes: val("b-notes") };
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
document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
/* Pick up changes made on another device when the app comes back into view. */
document.addEventListener("visibilitychange", function () { if (!document.hidden) { paintSky(); refresh(); } });
setInterval(paintSky, 5 * 60 * 1000);
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () {});

render();
/* Returning user on this device: try a silent sign-in. If Google needs a tap, the welcome screen stays. */
try { if (CFG.googleClientId && localStorage.getItem("eltio-systems-signed-in")) startGoogle(true).catch(function () {}); } catch (e) {}
})();
