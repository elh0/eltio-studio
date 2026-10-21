/* Mission control: Elliot's daily hub. Static home-screen app.
   Everything it shows lives in one Google Sheet in his own Drive ("Mission control data"),
   which the app makes on first sign-in and the 06:00 routine fills. Nothing private is in this file. */
var CFG = window.HUB_CONFIG || {};
var SHEET_NAME = "Mission control data";
var SCOPE = "https://www.googleapis.com/auth/drive.file";
var TABS = {
  items: ["id", "area", "title", "why", "when", "cash", "prompt1", "prompt2", "status", "later", "updated"],
  top3: ["rank", "item_id", "reason"],
  since: ["date", "area", "text"],
  timeline: ["area", "title", "start", "end", "kind", "edited"],
  tree: ["area", "title", "state", "go"],
  apps: ["id", "name", "colour", "stage", "site", "testflight", "users", "downloads", "paid", "revenue", "step1", "step2", "step3", "step4", "value1", "value2", "value3", "value4", "blocker", "next", "target", "now", "tests", "flag", "note", "prompt1", "prompt2", "sources", "store"],
  channels: ["app", "channel", "visits", "downloads", "paid", "spend"],
  campaigns: ["app", "channel", "title", "status", "when", "result", "spend", "posts", "views", "visits", "downloads", "link", "logged"],
  sources: ["key", "name", "what", "status", "note", "updated"],
  kpis: ["key", "label", "value", "sub"],
  money: ["month", "earned"],
  friday: ["text", "done", "prompt"],
  ideas: ["text", "area", "kind", "created"],
  feedback: ["time", "text"],
  meta: ["key", "value"]
};

var IC = {
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chev: '<path d="m9 18 6-6-6-6"/>', left: '<path d="m15 18-6-6 6-6"/>', copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>', out: '<path d="M7 17 17 7M8 7h9v9"/>',
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  mega: '<path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1z"/><path d="M17 8a5 5 0 0 1 0 8"/>', gantt: '<path d="M4 6h9M8 12h10M6 18h7"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', send: '<path d="M12 19V5M5 12l7-7 7 7"/>', down: '<path d="m6 9 6 6 6-6"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>', redo: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'
};
function ic(n) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + IC[n] + '</svg>'; }
var AREAS = { dp: "DP", sw: "Software", money: "Money", health: "Health", trading: "Trading" };
var ORDER = ["dp", "sw", "money", "health", "trading"];
var PROJECT = { dp: "DP", sw: "Eltio", money: "Money", health: "Health", trading: "Trading" };
var BRAIN = { dp: "dp.md", sw: "eltio.md, apps.md", money: "money.md", health: "health.md", trading: "trading.md" };
var STL = { ok: "Connected", key: "Needs a key", man: "Manual", plan: "Planned" };
var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

var G = { token: null, exp: 0, client: null, sheetId: null };
var D = null; /* tab name -> array of row objects, each with _r (sheet row number) */
var S = { tab: "today", f: "all", i: 0, sheet: null, pick: null, app: "all", log: false, fb: false, open: null, fri: new Date().getDay() === 5, ideaA: "sw", chat: [], busy: false };
var $ = function (id) { return document.getElementById(id); };
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function av(a) { return 'style="--a:var(--' + (AREAS[a] ? a : "sw") + ')"'; }
function num(v) { if (v === "" || v == null) return null; var x = +String(v).replace(/[£,\s]/g, ""); return isNaN(x) ? null : x; }
function n(v) { var x = num(v); return x === null ? (v ? esc(v) : "–") : x.toLocaleString("en-GB"); }
function money(v) { var x = num(v); return x === null ? "–" : "£" + (x >= 10000 ? (Math.round(x / 100) / 10) + "k" : x.toLocaleString("en-GB")); }
function rows(t) { return (D && D[t]) || []; }
function meta(k) { var r = rows("meta").filter(function (x) { return x.key === k; })[0]; return r ? r.value : ""; }
function flag(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
function toast(m) { var t = document.createElement("div"); t.className = "toast"; t.innerHTML = ic("check") + esc(m); $("scr").appendChild(t); setTimeout(function () { t.remove(); }, 1900); }
function copy(txt, el) {
  function ok() { if (el) { el.classList.add("copied"); var c = el.querySelector(".cp"); if (c) c.innerHTML = ic("check") + "Copied"; } toast("Copied. Paste it in the project"); }
  try { navigator.clipboard.writeText(txt).then(ok, function () { toast("Select the text to copy it"); }); } catch (e) { toast("Select the text to copy it"); }
}

/* ---------- dates: a 6-week window from Monday of this week ---------- */
var NOW = new Date(); NOW.setHours(0, 0, 0, 0);
var START = new Date(NOW); START.setDate(NOW.getDate() - ((NOW.getDay() + 6) % 7));
var TODAY = Math.round((NOW - START) / 864e5);
function di(s) { if (!s) return null; var d = new Date(String(s).slice(0, 10) + "T00:00:00"); return isNaN(d) ? null : Math.round((d - START) / 864e5); }
function dayAt(i) { var d = new Date(START); d.setDate(START.getDate() + i); return d; }
function fmt(i) { var d = dayAt(i); return DOW[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()]; }
function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }

/* ---------- Google sign-in (token model; the token lives in memory only) ---------- */
/* Full-page redirect on every device: no pop-up for Chrome or Safari to block, and it works inside the home-screen app. */
function tokenFromHash() {
  var h = location.hash || ""; if (h.indexOf("access_token=") < 0 && h.indexOf("error=") < 0) return false;
  var q = {}; h.slice(1).split("&").forEach(function (kv) { var i = kv.indexOf("="); if (i > 0) q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); });
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  if (q.state !== "mission-control") return false;
  if (!q.access_token) { G.authErr = true; return false; }
  G.token = q.access_token; G.exp = Date.now() + ((+q.expires_in || 3600) - 60) * 1000; flag("hub-signed-in", "1"); return true;
}
function getToken(silent) {
  if (G.token && Date.now() < G.exp) return Promise.resolve();
  location.assign("https://accounts.google.com/o/oauth2/v2/auth?response_type=token&include_granted_scopes=true&state=mission-control&client_id=" + encodeURIComponent(CFG.googleClientId) +
      "&redirect_uri=" + encodeURIComponent(location.origin + location.pathname) + "&scope=" + encodeURIComponent(SCOPE) + "&prompt=" + (silent ? "none" : "select_account"));
  return new Promise(function () {});
}
function api(url, opt) {
  opt = opt || {};
  return fetch(url, { method: opt.method || "GET", headers: Object.assign({ Authorization: "Bearer " + G.token }, opt.body ? { "Content-Type": "application/json" } : {}), body: opt.body ? JSON.stringify(opt.body) : undefined })
    .then(function (r) {
      if (r.status === 401) { G.token = null; gate("Your sign-in ran out. Tap to carry on."); throw new Error("signed out"); }
      if (!r.ok) return r.text().then(function (t) { throw new Error("Google said " + r.status + ": " + t.slice(0, 140)); });
      return r.json();
    });
}

/* ---------- the sheet ---------- */
var SHEETS = "https://sheets.googleapis.com/v4/spreadsheets/";
function col(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
function findSheet() {
  var id = flag("hub-sheet-id"); if (id) return Promise.resolve(id);
  var q = encodeURIComponent("name='" + SHEET_NAME + "' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  return api("https://www.googleapis.com/drive/v3/files?q=" + q + "&fields=files(id,name)&orderBy=createdTime").then(function (r) {
    if (r.files && r.files.length) return r.files[0].id;
    return api(SHEETS, { method: "POST", body: { properties: { title: SHEET_NAME }, sheets: Object.keys(TABS).map(function (t) { return { properties: { title: t } }; }) } }).then(function (s) {
      return api(SHEETS + s.spreadsheetId + "/values:batchUpdate", { method: "POST", body: { valueInputOption: "RAW", data: Object.keys(TABS).map(function (t) { return { range: t + "!A1", values: [TABS[t]] }; }).concat([{ range: "meta!A2", values: [["created", new Date().toISOString()]] }]) } })
        .then(function () { return s.spreadsheetId; });
    });
  }).then(function (id) { flag("hub-sheet-id", id); return id; });
}
function load() {
  var names = Object.keys(TABS);
  return api(SHEETS + G.sheetId + "/values:batchGet?" + names.map(function (t) { return "ranges=" + encodeURIComponent(t + "!A1:AF1000"); }).join("&")).then(function (r) {
    D = {}; D._head = {};
    (r.valueRanges || []).forEach(function (vr, k) {
      var t = names[k], v = vr.values || [], h = v[0] || TABS[t]; D._head[t] = h;
      /* a sheet made before a column was added gets the new header cells */
      if (v.length && h.length < TABS[t].length && TABS[t].slice(0, h.length).join() === h.join()) { var add = TABS[t].slice(h.length); api(SHEETS + G.sheetId + "/values/" + encodeURIComponent(t + "!" + col(h.length) + "1") + "?valueInputOption=RAW", { method: "PUT", body: { values: [add] } }).catch(function () {}); h = D._head[t] = h.concat(add); }
      D[t] = v.slice(1).map(function (row, j) { var o = { _r: j + 2 }; h.forEach(function (f, c) { o[f] = row[c] == null ? "" : row[c]; }); return o; }).filter(function (o) { return h.some(function (f) { return o[f] !== ""; }); });
    });
  });
}
function setCell(t, o, f, v) {
  o[f] = v; var h = D._head[t] || TABS[t], c = h.indexOf(f), pre = Promise.resolve();
  /* sheets made before a column was added get its header the first time it's written */
  if (c < 0) { if (TABS[t].indexOf(f) < 0) return pre; c = h.length; h.push(f); D._head[t] = h; pre = api(SHEETS + G.sheetId + "/values/" + encodeURIComponent(t + "!" + col(c) + "1") + "?valueInputOption=RAW", { method: "PUT", body: { values: [[f]] } }); }
  return pre.then(function () { return api(SHEETS + G.sheetId + "/values/" + encodeURIComponent(t + "!" + col(c) + o._r) + "?valueInputOption=RAW", { method: "PUT", body: { values: [[v]] } }); }).catch(function (e) { toast("Didn't save: " + e.message); });
}
function append(t, o) {
  var h = D._head[t] || TABS[t]; D[t] = D[t] || []; D[t].unshift(o);
  return api(SHEETS + G.sheetId + "/values/" + encodeURIComponent(t + "!A1") + ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", { method: "POST", body: { values: [h.map(function (f) { return o[f] == null ? "" : o[f]; })] } })
    .then(function (r) { var m = /(\d+)(?::|$)/.exec(((r.updates || {}).updatedRange || "").split("!")[1] || ""); if (m) o._r = +m[1]; })
    .catch(function (e) { toast("Didn't save: " + e.message); });
}

/* ---------- derived data ---------- */
/* timeline rows Elliot removed in the app stay in the sheet as kind "gone" so the morning fill doesn't bring them back */
function evs() { return rows("timeline").filter(function (e) { return e.kind !== "gone"; }); }
function evAt(r) { return rows("timeline").filter(function (e) { return e._r === r; })[0]; }
function open(x) { if (x.status === "done") return false; if (x.status === "later") { var d = di(x.later); return d !== null && d <= TODAY; } return true; }
function items() { return rows("items").filter(open); }
function list() { return items().filter(function (x) { return S.f === "all" || x.area === S.f; }); }
function left(a) { return items().filter(function (x) { return !a || x.area === a; }).length; }
function item(id) { return rows("items").filter(function (z) { return z.id === id; })[0]; }
function prompts(x) { return [x.prompt1, x.prompt2].filter(Boolean); }
function appById(id) { return rows("apps").filter(function (a) { return a.id === id; })[0]; }
function srcList(keys) { var all = rows("sources"); if (!keys) return all; var k = String(keys).split(/[\s,]+/); return all.filter(function (s) { return k.indexOf(s.key) >= 0; }); }
function since(t) { var d = new Date(t); if (isNaN(d)) return ""; var h = d.getHours(), m = ("0" + d.getMinutes()).slice(-2); var same = iso(d) === iso(new Date()); return (same ? "" : DOW[d.getDay()] + " ") + h + ":" + m; }

/* ---------- shared parts ---------- */
var TABN = { today: "Today", apps: "Apps", mkt: "Marketing", time: "Timeline", ask: "Ask", inbox: "Inbox" };
function crumbs(last) { return '<nav class="crumbs" aria-label="Breadcrumb"><span>Studio</span>' + ic("chev") + '<span class="' + (last ? "" : "cur") + '">' + TABN[S.tab] + "</span>" + (last ? ic("chev") + '<span class="cur">' + esc(last) + "</span>" : "") + "</nav>"; }
function topbar(last) { return '<div class="top">' + crumbs(last) + '<span style="display:flex;gap:6px"><button type="button" class="btn icon sm" data-act="reload" aria-label="Refresh">' + ic("redo") + '</button><button type="button" class="btn icon sm" data-act="fb" aria-label="Feedback">' + ic("msg") + "</button></span></div>"; }
function head(t, sub, extra) { return '<div class="head"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h1>' + t + "</h1>" + (extra || "") + '</div><p class="muted">' + sub + "</p></div>"; }
function sec(t, sub, btn) { return '<div class="sec"><h3>' + t + "</h3>" + (btn || '<span class="muted">' + (sub || "") + "</span>") + "</div>"; }
function kpi(k, v, s) { return '<div class="card kpi"><span class="k">' + esc(k) + "</span><b>" + esc(v) + "</b>" + (s ? '<span class="s">' + esc(s) + "</span>" : "") + "</div>"; }
function none(t) { return '<div class="card cardpad"><p class="empty-note">' + t + "</p></div>"; }
function plist(key, arr) { if (!arr.length) return ""; return '<div class="plist"><div class="lab"><span>Suggested prompts</span><span>tap to copy</span></div>' + arr.map(function (p, j) { return '<button type="button" class="pr" data-copy="' + esc(key) + "|" + j + '"><span>' + esc(p) + '</span><span class="cp">' + ic("copy") + "Copy</span></button>"; }).join("") + "</div>"; }
function findPrompt(k) {
  var p = k.split("|"), j = +p[1], key = p[0];
  if (key.indexOf("app:") === 0) { var a = appById(key.slice(4)); return [a.prompt1, a.prompt2].filter(Boolean)[j]; }
  if (key === "fri") return rows("friday").filter(function (f) { return f.prompt; }).map(function (f) { return f.prompt; })[j];
  return prompts(item(key))[j];
}
function areaTabs() {
  return '<div class="utabs" role="tablist" aria-label="Areas"><button type="button" data-f="all" class="' + (S.f === "all" ? "on" : "") + '">All <span class="n">' + left() + "</span></button>" +
    ORDER.map(function (a) { return '<button type="button" data-f="' + a + '" class="' + (S.f === a ? "on" : "") + '" ' + av(a) + '><span class="dot"></span>' + AREAS[a] + ' <span class="n">' + left(a) + "</span></button>"; }).join("") + "</div>";
}

/* ---------- Today ---------- */
function itemCard(x) {
  return '<div class="card item rise" id="card"><div class="ih"><div class="badges"><span class="badge area" ' + av(x.area) + '><span class="dot"></span>' + (AREAS[x.area] || x.area) + "</span>" + (x.when ? '<span class="badge">' + ic("cal") + esc(x.when) + "</span>" : "") + (x.cash ? '<span class="badge">' + esc(x.cash) + "</span>" : "") + "</div>" +
    "<h2>" + esc(x.title) + '</h2><p class="muted">' + esc(x.why) + "</p></div>" +
    '<div class="acts"><button type="button" class="btn primary" data-act="done" data-id="' + esc(x.id) + '">' + ic("check") + 'Done</button><button type="button" class="btn" data-act="later" data-id="' + esc(x.id) + '">' + ic("cal") + "Later</button></div>" + plist(x.id, prompts(x)) + "</div>";
}
function waitBlock() {
  var L = list(); if (S.i >= L.length) S.i = 0; var x = L[S.i], doneN = rows("items").filter(function (z) { return z.status === "done" && iso(new Date(z.updated || 0)) === iso(new Date()) && (S.f === "all" || z.area === S.f); }).length;
  var h = sec("Waiting on you", L.length + " left · cash first") + areaTabs();
  if (!L.length) return h + '<div class="card cardpad" style="margin-top:12px"><div class="empty rise"><div class="tile">' + ic("box") + "</div><h3>Nothing waiting on you</h3><p class=\"muted\">" + (rows("items").length ? (S.f === "all" ? "Everything is done or parked." : "Nothing left in " + AREAS[S.f] + ".") : "The 06:00 scan fills this from your projects.") + "</p></div></div>";
  return h + '<div class="prog"><span class="mono muted">' + (S.i + 1) + " / " + L.length + '</span><span class="track"><i style="width:' + Math.round((doneN + S.i + 1) / (doneN + L.length) * 100) + '%"></i></span><span class="mono faint">' + doneN + " done today</span></div>" + itemCard(x) +
    '<div class="nav"><button type="button" class="btn icon" data-act="prev" aria-label="Previous">' + ic("left") + '</button><span class="note">swipe or use the arrows</span><button type="button" class="btn icon" data-act="next" aria-label="Next">' + ic("chev") + "</button></div>";
}
function agenda(from, to) {
  var R = [];
  evs().forEach(function (e) { var s = di(e.start), en = di(e.end);
    if (s !== null && s >= from && s <= to && !(en !== null && s <= TODAY)) R.push([s, e.area, e.title + (en !== null ? " starts" : ""), e.kind, e._r]);
    if (en !== null && en >= from && en <= to) R.push([en, e.area, e.title + " ends", e.kind, e._r]); });
  for (var i = from; i <= to; i++) if (dayAt(i).getDay() === 5) R.push([i, "sw", "Selling day: marketing and sales", "fri"]);
  R.sort(function (p, q) { return p[0] - q[0]; }); var last = -1;
  return '<div class="card rows cardpad">' + R.map(function (r) { var c = r[0] !== last ? '<div class="cap">' + (r[0] === TODAY ? "Today · " : "") + fmt(r[0]) + "</div>" : ""; last = r[0]; var soft = r[3] === "hold" || r[3] === "est";
    return c + '<div class="r' + (r[4] ? ' tap" data-act="ev" data-r="' + r[4] + '"' : '"') + " " + av(r[1]) + '><span class="dot"' + (soft ? ' style="background:none;border:1.5px solid var(--a)"' : "") + '></span><span class="t">' + esc(r[2]) + "</span>" + (r[3] === "hold" ? '<span class="w">hold</span>' : r[3] === "est" ? '<span class="w">estimate</span>' : "") + (r[4] ? ic("chev") : "") + "</div>"; }).join("") +
    '<button type="button" class="cap addev" data-act="addev">' + ic("plus") + 'Add an event</button><div class="cap" style="font-size:11px">Tap an event to change or remove it. Gym Mon + Thu and climbing Sat are protected. Nothing gets booked over them.</div></div>';
}
function chartCard() {
  var ys = new Date((meta("year_start") || "2026-09-01") + "T00:00:00"), target = num(meta("target")) || 150000, pace = num(meta("pace")) || target / 12;
  var M = [], E = []; for (var i = 0; i < 12; i++) { var d = new Date(ys); d.setMonth(ys.getMonth() + i); var k = iso(d).slice(0, 7); M.push(MON[d.getMonth()]); var r = rows("money").filter(function (x) { return String(x.month).slice(0, 7) === k; })[0]; E.push(r ? num(r.earned) || 0 : 0); }
  var earned = E.reduce(function (a, b) { return a + b; }, 0), gone = Math.max(0, (NOW - ys) / (864e5 * 30.44)), onPace = pace * gone;
  var W = 300, H = 120, max = Math.max(pace * 1.12, Math.max.apply(null, E) * 1.05), bw = W / 12 - 6;
  var bars = E.map(function (v, i) { var h = v / max * H, x = i * (W / 12) + 3; return v ? '<rect x="' + x + '" y="' + (H - h) + '" width="' + bw + '" height="' + h + '" rx="2" fill="var(--chart)"/>' : '<rect x="' + x + '" y="' + (H - 2) + '" width="' + bw + '" height="2" rx="1" fill="var(--border2)"/>'; }).join("");
  var py = H - pace / max * H, labels = M.map(function (m, i) { return i % 2 ? "" : '<text x="' + (i * (W / 12) + W / 24) + '" y="' + (H + 16) + '" text-anchor="middle" font-size="9" fill="var(--faint)" font-family="Geist,sans-serif">' + m + "</text>"; }).join("");
  return '<div class="card stat"><div class="sh"><div><span class="t">' + money(target) + ' goal</span><span class="muted" style="font-size:12px">from ' + M[0] + '</span></div><div><span class="muted" style="font-size:12px">Earned</span><b>' + money(earned) + '</b></div><div><span class="muted" style="font-size:12px">On pace</span><b>' + money(Math.round(onPace)) + "</b></div></div>" +
    '<div class="chart"><svg viewBox="0 0 ' + W + " " + (H + 22) + '" role="img" aria-label="Sales by month against the monthly pace"><line x1="0" x2="' + W + '" y1="' + H + '" y2="' + H + '" stroke="var(--border)"/>' + bars + '<line x1="0" x2="' + W + '" y1="' + py + '" y2="' + py + '" stroke="var(--muted)" stroke-dasharray="3 4"/><text x="' + W + '" y="' + (py - 5) + '" text-anchor="end" font-size="9" fill="var(--muted)" font-family="Geist,sans-serif">pace ' + money(pace) + "/mo</text>" + labels + "</svg>" +
    (meta("chart_note") ? '<p class="note" style="padding:4px 4px 0">' + esc(meta("chart_note")) + "</p>" : "") + "</div></div>";
}
function studio() {
  return '<div class="tree" style="padding:0 18px">' + ORDER.map(function (a) {
    var lv = rows("tree").filter(function (z) { return z.area === a; }), w = lv.filter(function (z) { return z.state === "working"; }).length, op = S.open === a;
    var q = rows("items").filter(function (x) { return x.area === a && open(x); }).map(function (x) { return '<button type="button" class="leaf" data-goto="' + esc(x.id) + '" ' + av(a) + '><span class="ring"></span>' + esc(x.title) + '<span class="st">waiting on you</span></button>'; }).join("");
    var l = lv.map(function (z) { var k = z.state; return '<div class="leaf' + (k === "done" ? " done" : "") + (z.go ? ' tap" data-act="go" data-go="' + esc(z.go) + '"' : '"') + " " + av(a) + ">" + (k === "working" ? '<span class="pulse"></span>' : '<span class="dot" style="opacity:' + (k === "done" ? ".4" : ".6") + '"></span>') + esc(z.title) + '<span class="st">' + (k === "working" ? "agent working" : k === "hold" ? "in progress" : esc(k)) + "</span>" + (z.go ? ic("chev") : "") + "</div>"; }).join("");
    return '<div class="card branch" ' + av(a) + '><button type="button" class="bh" data-br="' + a + '" aria-expanded="' + op + '"><b><span class="dot"></span>' + AREAS[a] + '</b><span style="display:flex;gap:6px;align-items:center">' + (w ? '<span class="badge"><span class="pulse" style="width:6px;height:6px;border-radius:50%;background:var(--chart)"></span>' + w + " working</span>" : "") + (left(a) ? '<span class="badge area">' + left(a) + " on you</span>" : '<span class="badge">quiet</span>') + ic(op ? "down" : "chev") + "</span></button>" + (op ? '<div class="leaves">' + (q + l || '<p class="empty-note">Nothing here yet.</p>') + "</div>" : "") + "</div>";
  }).join("") + "</div>";
}
/* personal money: kpis rows keyed p_*; p_next* rows are upcoming bills (label = when, value = amount, sub = what). Never balances. */
function myMoney() {
  var P = rows("kpis").filter(function (k) { return k.key.indexOf("p_") === 0; }); if (!P.length) return "";
  var T = P.filter(function (k) { return k.key.indexOf("p_next") !== 0 && k.key.indexOf("p_cat") !== 0; }).slice(0, 4), N = P.filter(function (k) { return k.key.indexOf("p_next") === 0; }), C = P.filter(function (k) { return k.key.indexOf("p_cat") === 0; });
  return sec("Your money", "private to you", '<button type="button" class="btn ghost sm" data-act="go" data-go="area:money">To-dos ' + ic("chev") + "</button>") + (T.length ? '<div class="kpis mine">' + T.map(function (k) { return kpi(k.label, k.value, k.sub); }).join("") + "</div>" : "") +
    (N.length ? '<div class="card rows cardpad" style="margin-top:8px"><div class="cap">Coming out next</div>' + N.map(function (k) { return '<div class="r" ' + av("money") + '><span class="dot"></span><span class="t">' + esc(k.sub) + '</span><span class="w">' + esc(k.label) + " · " + esc(k.value) + "</span></div>"; }).join("") + "</div>" : "") + catCard(C);
}
/* p_cat rows: label = category, value = spent this month, sub = "of £400" (its budget) */
function catCard(C) {
  if (!C.length) return "";
  return '<div class="card cardpad cats" style="margin-top:8px"><div class="cap">Spend by category this month</div>' + C.map(function (k) { var v = num(k.value) || 0, b = num(String(k.sub).replace(/^[^£\d]*/, "")), over = b && v > b;
    return '<div class="cat' + (over ? " over" : "") + '"><span class="t">' + esc(k.label) + '</span><span class="bar2"><i style="width:' + (b ? Math.min(100, v / b * 100) : 0) + '%"></i></span><span class="w">' + esc(k.value) + (b ? '<small> of ' + money(b) + "</small>" : "") + (over ? '<small class="ov">over ' + money(v - b) + "</small>" : "") + "</span></div>"; }).join("") + "</div>";
}
function top3() {
  var L = rows("top3").slice().sort(function (a, b) { return (+a.rank || 9) - (+b.rank || 9); }).map(function (t) { return [item(t.item_id), t.reason]; }).filter(function (t) { return t[0] && open(t[0]); }).slice(0, 3);
  if (!L.length) return "";
  return sec("Top 3 today", "most money per hour") + '<div class="card rows cardpad">' + L.map(function (t, i) { var x = t[0]; return '<button type="button" class="r" data-goto="' + esc(x.id) + '" style="--a:var(--' + x.area + ');width:100%;border-left:0;border-right:0;border-bottom:0;background:none;text-align:left;cursor:pointer;color:var(--fg)"><span class="mono faint">' + (i + 1) + '</span><span class="dot"></span><span class="t">' + esc(x.title) + (t[1] ? '<br><span class="faint" style="font-size:12px">' + esc(t[1]) + "</span>" : "") + "</span>" + ic("chev") + "</button>"; }).join("") + "</div>";
}
function sinceYesterday() { var C = rows("since").slice(0, 6); if (!C.length) return ""; return sec("Since yesterday", "from the 06:00 scan") + '<div class="card rows cardpad">' + C.map(function (c) { return '<div class="r" ' + av(c.area) + '><span class="dot"></span><span class="t">' + esc(c.text) + "</span></div>"; }).join("") + "</div>"; }
function friList() {
  var F = rows("friday"), dn = F.filter(function (z) { return z.done === "yes"; }).length; if (!F.length) return sec("Selling checklist", "") + none("The Friday list lands with the morning scan.");
  return sec("Selling checklist", dn + " of " + F.length + " done") + '<div class="card rows cardpad">' + F.map(function (z, i) { var on = z.done === "yes"; return '<button type="button" class="r" data-chk="' + i + '" style="width:100%;border-left:0;border-right:0;border-bottom:0;background:none;text-align:left;cursor:pointer;color:' + (on ? "var(--faint)" : "var(--fg)") + '"><span style="width:18px;height:18px;border-radius:5px;border:1.5px solid var(--border2);display:grid;place-items:center;flex:none;' + (on ? "background:var(--primary);color:var(--onprimary);border-color:var(--primary)" : "") + '">' + (on ? ic("check") : "") + '</span><span class="t"' + (on ? ' style="text-decoration:line-through"' : "") + ">" + esc(z.text) + "</span></button>"; }).join("") + "</div>" +
    (F.some(function (f) { return f.prompt; }) ? '<div class="card cardpad" style="overflow:hidden;margin-top:10px">' + plist("fri", F.filter(function (f) { return f.prompt; }).map(function (f) { return f.prompt; })) + "</div>" : "");
}
function fresh() { var src = rows("sources"), live = src.filter(function (s) { return s.status === "ok"; }).length, u = meta("updated"); return '<p class="note" style="padding:8px 18px 0">' + (u ? "Updated " + since(u) : "Not scanned yet") + " · " + live + " of " + src.length + ' feeds live · <button type="button" data-tab="apps" style="border:0;background:none;padding:0;color:var(--muted);text-decoration:underline;cursor:pointer;font-size:11px">see feeds</button></p>'; }
function vToday(mac) {
  var K = rows("kpis").filter(function (k) { return k.key.indexOf("p_") !== 0; }).slice(0, 3), d = NOW;
  var h = topbar() + head(S.fri ? DOW[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()] + " · selling" : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()], S.fri ? "Marketing and sales come first today." : left() + " waiting on you", '<button type="button" class="switch" data-act="fri" aria-pressed="' + S.fri + '"><span class="tr"></span>Friday</button>') +
    (K.length ? '<div class="kpis">' + K.map(function (k) { var g = k.key === "apps" ? "tab:apps" : k.key === "owed" ? "area:money" : ""; return g ? kpi(k.label, k.value, k.sub).replace('class="card kpi"', 'class="card kpi tap" data-act="go" data-go="' + g + '"') : kpi(k.label, k.value, k.sub); }).join("") + "</div>" : "") + fresh() + (S.fri ? friList() : top3() + sinceYesterday()) + waitBlock() + myMoney();
  if (!mac) h += sec("Next 7 days", "") + agenda(TODAY, TODAY + 6) + sec("Pace", "") + '<div class="cardpad">' + chartCard() + "</div>";
  return h + sec("Studio", "tap an area") + studio() + sec("Idea inbox", "", '<button type="button" class="btn ghost sm" data-tab="inbox">' + rows("ideas").length + " ideas " + ic("chev") + "</button>") + '<div style="height:24px"></div>';
}

/* ---------- Apps ---------- */
function icon(a, big) { return '<span class="ico" style="background:' + esc(a.colour || "#737373") + (big ? ";width:40px;height:40px;border-radius:11px;font-size:17px" : "") + '">' + esc((a.name || "?")[0]) + "</span>"; }
function appTabs() { return '<div class="utabs" role="tablist" aria-label="Apps"><button type="button" data-app="all" class="' + (S.app === "all" ? "on" : "") + '">All</button>' + rows("apps").map(function (a) { return '<button type="button" data-app="' + esc(a.id) + '" class="' + (S.app === a.id ? "on" : "") + '"><span class="dot" style="background:' + esc(a.colour) + '"></span>' + esc(a.name) + "</button>"; }).join("") + "</div>"; }
function url(x) { x = String(x || "").trim(); return /^https:\/\//.test(x) ? x : "https://" + x.replace(/^\/+/, ""); }
/* site, App Store page (store column, once it's live) and App Store Connect */
function appLinks(a) {
  var L = [];
  if (a.site) L.push([a.site, url(a.site)]);
  if (a.store) L.push(["App Store page", url(a.store)]);
  if (a.id !== "systems") L.push(["App Store Connect", "https://appstoreconnect.apple.com/apps"]);
  if (!L.length) return "";
  return '<div style="display:flex;gap:6px;flex-wrap:wrap;padding:0 18px 4px">' + L.map(function (l) { return '<a class="btn sm" href="' + esc(l[1]) + '" target="_blank" rel="noopener">' + esc(l[0]) + " " + ic("chev") + "</a>"; }).join("") + "</div>";
}
function appCard(a) {
  var tf = a.testflight === "1" || a.testflight === "yes";
  return '<button type="button" class="appc" data-app="' + esc(a.id) + '"><div class="ah">' + icon(a) + "<b>" + esc(a.name) + '</b><span class="badge">' + esc(a.stage) + '</span></div><div class="am"><div><span>' + (tf ? "Testers" : "Users") + "</span><b>" + n(a.users) + "</b></div><div><span>Downloads</span><b>" + n(a.downloads) + "</b></div><div><span>Paid</span><b>" + n(a.paid) + "</b></div><div><span>£ a month</span><b>" + money(a.revenue) + "</b></div></div>" +
    (a.blocker ? '<div class="bl">' + ic("alert") + esc(a.blocker) + "</div>" : "") + (a.flag === "amber" ? '<div class="bl" style="color:var(--money);background:color-mix(in srgb,var(--money) 10%,transparent)">' + ic("alert") + "Missed its target twice: one more change, or park it</div>" : "") + "</button>";
}
function srcCard(L) {
  if (!L.length) return none("No feeds listed yet.");
  return '<div class="card cardpad">' + L.map(function (s) { var st = STL[s.status] ? s.status : "plan", fr = s.updated ? "updated " + since(s.updated) : st === "man" ? "last logged: never" : "no data yet";
    return '<div class="src tap st-' + st + '" data-act="src" data-k="' + esc(s.key) + '"><span class="dot" style="margin-top:6px"></span><span class="t2"><span>' + esc(s.name) + "</span><small>" + esc(s.what) + (s.note ? ". " + esc(s.note) : "") + '</small><small style="color:' + (st === "ok" && s.updated ? "var(--dp)" : "var(--faint)") + '">' + fr + '</small></span><span class="badge area">' + STL[st] + "</span>" + ic("chev") + "</div>"; }).join("") + "</div>";
}
function funnel(a) {
  var L = [1, 2, 3, 4].map(function (i) { return [a["step" + i], num(a["value" + i])]; }).filter(function (s) { return s[0]; }); if (!L.length) return none("No funnel steps yet.");
  var top = Math.max.apply(null, L.map(function (s) { return s[1] || 0; })) || 1;
  return '<div class="card cardpad funnel" style="--a:' + esc(a.colour) + '">' + L.map(function (s, i) { var p = i && L[i - 1][1] && s[1] !== null ? Math.round(s[1] / L[i - 1][1] * 100) + "%" : ""; return '<div class="fstep"><span class="muted">' + esc(s[0]) + '</span><span class="bar2"><i style="width:' + ((s[1] || 0) / top * 100) + '%"></i></span><span class="v">' + (s[1] === null ? "–" : s[1].toLocaleString("en-GB")) + (p ? "<small>" + p + "</small>" : "") + "</span></div>"; }).join("") + (a.note ? '<p class="note">' + esc(a.note) + "</p>" : "") + "</div>";
}
function chTable(a) {
  var R = rows("channels").filter(function (c) { return c.app === a.id; });
  return sec("By channel", R.length ? "from campaign links" : "no campaign links yet") + '<div class="card cardpad tscroll"><table class="tbl"><thead><tr><th>Channel</th><th>Visits</th><th>Downloads</th><th>Paid</th><th>Spend</th></tr></thead><tbody>' +
    (R.length ? R : ["TikTok", "Instagram", "Reddit", "Direct"].map(function (c) { return { channel: c }; })).map(function (r) { return "<tr><td>" + esc(r.channel) + "</td><td>" + n(r.visits) + "</td><td>" + n(r.downloads) + "</td><td>" + n(r.paid) + "</td><td>" + (r.spend ? money(r.spend) : "–") + "</td></tr>"; }).join("") + "</tbody></table></div>";
}
function scoreCard(a) {
  var fl = a.flag === "amber", lab = function (t) { return '<span class="faint" style="width:64px;flex:none">' + t + "</span>"; };
  return sec("Scoreboard", "iterate or park") + '<div class="card rows cardpad"' + (fl ? ' style="border-color:color-mix(in srgb,var(--money) 50%,transparent)"' : "") + '><div class="r">' + lab("Target") + '<span class="t">' + esc(a.target || "not set") + '</span></div><div class="r">' + lab("Now") + '<span class="t">' + esc(a.now || "–") + '</span></div><div class="r">' + lab("Tests") + '<span class="t">' + esc(a.tests || "0 of 2") + "</span></div>" +
    (fl ? '<div class="r" style="color:var(--money)">' + ic("alert") + '<span class="t">Missed twice. Try one more change, or park it for fun app time.</span></div>' : '<div class="r"><span class="note">Two one-change tests that miss the target turn this amber. Parked, never deleted.</span></div>') + "</div>";
}
function vApps() {
  var A = rows("apps"), h = topbar(S.app !== "all" && appById(S.app) ? appById(S.app).name : null) + head("Apps", "Ship, track, market. No new apps.") + (A.length ? appTabs() : "");
  if (!A.length) return h + none("Your apps land here with the first scan.");
  if (S.app === "all" || !appById(S.app)) {
    var T = { dl: 0, paid: 0, rev: 0 }; A.forEach(function (a) { T.dl += num(a.downloads) || 0; T.paid += num(a.paid) || 0; T.rev += num(a.revenue) || 0; });
    return h + '<div class="kpis" style="padding-top:14px">' + kpi("Downloads", T.dl.toLocaleString("en-GB"), "all apps") + kpi("Paid", T.paid.toLocaleString("en-GB"), "") + kpi("£ a month", money(T.rev), "apps only") + "</div>" + sec("Your apps", "tap one for the detail") + '<div class="appgrid">' + A.map(appCard).join("") + "</div>" + sec("Where the numbers come from", "") + srcCard(srcList()) + '<div style="height:24px"></div>';
  }
  var a = appById(S.app), tf = a.testflight === "1" || a.testflight === "yes";
  return h + '<div class="sec" style="padding-top:16px"><span style="display:flex;gap:12px;align-items:center">' + icon(a, 1) + '<span style="display:grid"><h3 style="font-size:18px">' + esc(a.name) + '</h3><span class="muted" style="font-size:12px">' + (a.site ? '<a href="' + esc(url(a.site)) + '" target="_blank" rel="noopener" style="color:inherit">' + esc(a.site) + "</a>" : "") + '</span></span></span><span class="badge">' + esc(a.stage) + "</span></div>" + appLinks(a) +
    '<div class="kpis">' + kpi(tf ? "Testers" : "Users", n(a.users)) + kpi("Paid", n(a.paid)) + kpi("£ a month", money(a.revenue)) + "</div>" + scoreCard(a) + sec("Funnel", tf ? "testing" : "store to paid") + funnel(a) + (tf ? "" : chTable(a)) +
    sec("Blocker and next", "") + '<div class="card cardpad" style="overflow:hidden"><div class="rows"><div class="r">' + ic("alert") + "<span>" + esc(a.blocker || "–") + '</span></div><div class="r">' + ic("chev") + "<span>" + esc(a.next || "–") + "</span></div></div>" + plist("app:" + a.id, [a.prompt1, a.prompt2].filter(Boolean)) + "</div>" +
    sec("Feeds for " + esc(a.name), "") + srcCard(srcList(a.sources)) + '<div style="height:24px"></div>';
}

/* ---------- Marketing ---------- */
function campRow(c) {
  var a = appById(c.app), has = num(c.views) !== null || num(c.visits) !== null || num(c.downloads) !== null;
  return '<div class="camp tap" data-act="camp" data-r="' + c._r + '"><div class="ch1">' + (a ? icon(a) : "") + "<b>" + esc(a ? a.name : c.app) + " · " + esc(c.channel) + '</b><span class="badge" style="margin-left:auto">' + esc(c.status) + "</span></div><span>" + esc(c.title) + "</span>" +
    '<div class="nums">' + (has ? (c.spend ? "<span>Spend <b>" + money(c.spend) + "</b></span>" : "") + (c.posts ? "<span>Posts <b>" + n(c.posts) + "</b></span>" : "") + "<span>Views <b>" + n(c.views) + "</b></span><span>Visits <b>" + n(c.visits) + "</b></span><span>Downloads <b>" + n(c.downloads) + "</b></span>" :
      (c.when ? '<span style="display:inline-flex;gap:5px;align-items:center">' + ic("cal") + esc(c.when) + "</span>" : "") + (c.result ? "<span><b>" + esc(c.result) + "</b></span>" : "<span>No numbers yet</span>") + (c.link ? "" : "<span>needs a campaign link</span>")) + "</div></div>";
}
function vMkt() {
  var C = camps(), sum = function (f) { return C.reduce(function (t, c) { return t + (num(c[f]) || 0); }, 0); }, sp = sum("spend"), vi = sum("visits"), dl = sum("downloads");
  var h = topbar() + head("Marketing", "Every post and ad, per app and channel. Tap any row to change it or see how to fix it.", '<button type="button" class="btn sm" data-act="guide">How this page works</button>') + '<div class="kpis" style="padding-top:14px">' + kpi("Spend", money(sp), sp ? "logged so far" : "nothing running") + kpi("Store visits", vi.toLocaleString("en-GB"), vi ? "from campaign links" : "no campaign links yet") + kpi("Cost a download", sp && dl ? "£" + (sp / dl).toFixed(2) : "–", sp && dl ? "" : "needs spend + links") + "</div>";
  h += sec("Channels", "") + '<div class="chn">' + ["TikTok", "Instagram", "Reddit", "YouTube"].map(function (ch) { var R = C.filter(function (c) { return c.channel === ch; }), v = R.reduce(function (t, c) { return t + (num(c.views) || 0); }, 0), p = R.reduce(function (t, c) { return t + (num(c.posts) || 0); }, 0);
    return '<div class="card kpi"><span class="k">' + ch + "</span><b>" + v.toLocaleString("en-GB") + '</b><span class="s">' + (p ? p + " posts · views" : "views · nothing posted") + "</span></div>"; }).join("") + "</div>";
  h += sec("Campaigns", C.length + " planned or running", '<button type="button" class="btn sm" data-act="log">' + ic("plus") + "Log a post or ad</button>") + (C.length ? '<div class="card cardpad">' + C.map(campRow).join("") + "</div>" : none("Nothing logged yet. Tap Log a post or ad after you post."));
  return h + sec("Feeds", "") + srcCard(srcList("asc social yt plaus")) + '<div style="height:24px"></div>';
}
/* ---------- how-to sheets: feeds, campaigns, the Marketing page ---------- */
function camps() { return rows("campaigns").filter(function (c) { return c.status !== "gone"; }); }
var SECRETS = "https://github.com/elh0/eltio-studio/settings/secrets/actions";
var FIX = {
  asc: { why: "Downloads, store page views and trials per app, filled in every morning without you doing anything.",
    steps: ["Open App Store Connect, Users and Access, Integrations, App Store Connect API (button below).", "Under Team Keys press + and name it Mission control. Access: Admin (Apple needs it for the store-view reports; the key only ever lives in GitHub secrets). Generate.", "Download the .p8 file (Apple only lets you do this once) and note the Key ID and the Issuer ID at the top.", "Payments and Financial Reports shows your Vendor number at the top left. Note it too.", "Open GitHub secrets (button below) and add four: ASC_KEY_ID, ASC_ISSUER_ID, ASC_VENDOR and ASC_PRIVATE_KEY (paste the whole .p8 text).", "Tell Claude it's done. Never paste the key in chat."],
    links: [["Open App Store Connect keys", "https://appstoreconnect.apple.com/access/integrations/api"], ["Open GitHub secrets", SECRETS]],
    prompt: "I've added the App Store Connect key as GitHub secrets (ASC_KEY_ID, ASC_ISSUER_ID, ASC_VENDOR, ASC_PRIVATE_KEY). Wire it into the morning fill so the hub shows downloads, store views and trials per app. Check one real day of numbers before saying it works." },
  rc: { why: "Paid users and £ a month per app, straight from the subscriptions.",
    steps: ["Open RevenueCat (button below) and go to Project settings, API keys.", "Press + New secret API key, name it Mission control, set every permission to Read only.", "Copy the key (starts sk_).", "Open GitHub secrets and add it as REVENUECAT_KEY.", "Tell Claude it's done. Never paste the key in chat."],
    links: [["Open RevenueCat", "https://app.revenuecat.com"], ["Open GitHub secrets", SECRETS]],
    prompt: "I've added REVENUECAT_KEY as a GitHub secret (read-only). Wire it into the morning fill so the hub shows paid users and monthly revenue per app." },
  plaus: { why: "Visits to a-glo.com, outandscout.com and lampwerk.com, so you can see which post sent people to the site. No cookies, no banner.",
    steps: ["Pick one: Plausible (about £8 a month, nicest) or GoatCounter (free for small sites).", "Make the account yourself and add the three sites.", "Tell Claude which one. Claude adds the one-line script to each site on a preview link first, you check it on your phone, then it goes live."],
    links: [["Plausible", "https://plausible.io"], ["GoatCounter", "https://www.goatcounter.com"]],
    prompt: "I've made a site analytics account (say which: Plausible or GoatCounter) with a-glo.com, outandscout.com and lampwerk.com. Add the script to each site on a preview link first so I can check it on my phone, then wire visits into the hub." },
  social: { why: "Posts and views per channel. TikTok, Instagram and Reddit don't give simple keys for this, so it's logged by hand.",
    steps: ["Right after you post, tap Log a post or ad on this page. Ten seconds.", "On Friday, screenshot each app's analytics (TikTok Studio, Instagram Insights, Reddit post views) and send them to the Studio OS chat.", "Claude adds the views and clicks to each campaign row."],
    links: [],
    prompt: "Here are this week's TikTok, Instagram and Reddit screenshots. Add views, clicks and downloads to the matching campaign rows in the hub sheet." },
  yt: { why: "Views on the Systems walkthrough videos.",
    steps: ["The videos are private right now, so there's nothing to count.", "When you make one public, log it with Log a post or ad (channel YouTube).", "Views get added on Friday from a YouTube Studio screenshot."],
    links: [["Open YouTube Studio", "https://studio.youtube.com"]], prompt: "" },
  sheet: { why: "Email signups from the app sites, from the App signups sheet.", steps: ["Nothing to do. The morning fill reads it."], links: [], prompt: "" },
  brain: { why: "Your to-dos, apps, money and direction, from the studio brain.", steps: ["Nothing to do. Every project writes its handover back to the brain."], links: [], prompt: "" },
  gmail: { why: "Money owed and replies you're waiting on.", steps: ["Nothing to do. Read through the morning briefs."], links: [], prompt: "" },
  cal: { why: "Shoots, holds and deadlines for the next six weeks.", steps: ["Nothing to do. Edit an event in Today or Timeline and your change wins."], links: [], prompt: "" }
};
function shead(t, close) { return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><b style="font-weight:600">' + t + '</b><button type="button" class="btn ghost sm" data-act="' + close + '">Close</button></div>'; }
function stepsHtml(L) { return '<ol class="steps">' + L.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>"; }
function srcSheet() {
  var s = rows("sources").filter(function (z) { return z.key === S.src; })[0], f = FIX[S.src] || { why: "", steps: [], links: [], prompt: "" }; if (!s) return "";
  var st = STL[s.status] ? s.status : "plan";
  return '<div class="scrim" data-act="closesrc"></div><div class="sheet long" role="dialog" aria-label="' + esc(s.name) + '">' + shead(esc(s.name), "closesrc") +
    '<div style="display:flex;gap:8px;align-items:center"><span class="src st-' + st + '" style="padding:0;border:0"><span class="badge area">' + STL[st] + '</span></span><span class="muted" style="font-size:12px">' + esc(s.what) + "</span></div>" +
    (f.why ? '<p style="font-size:13px;line-height:1.5">' + esc(f.why) + "</p>" : "") +
    (f.steps.length ? '<div class="lab2">' + (st === "ok" ? "How it works" : "How to fix it") + "</div>" + stepsHtml(f.steps) : "") +
    (f.links.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap">' + f.links.map(function (l, i) { return '<a class="btn' + (i ? "" : " primary") + ' sm" href="' + esc(l[1]) + '" target="_blank" rel="noopener">' + esc(l[0]) + "</a>"; }).join("") + "</div>" : "") +
    (f.prompt ? '<button type="button" class="btn sm" data-act="copysrc">' + ic("copy") + "Copy the message for Claude</button>" : "") + "</div>";
}
var LINKHOW = {
  store: ["In App Store Connect open the app, then Analytics, Acquisition, Campaigns.", "Press Generate campaign link. Name it after the channel and post, e.g. tiktok-launch.", "Copy the link and paste it below. Use it in that channel's bio or post only.", "Downloads from it then show up per channel here."],
  tf: ["Lampwerk is on TestFlight, which has no campaign links.", "Instead, make one external testing group per channel in App Store Connect (TestFlight, + next to External Testing, e.g. WhatsApp gaffers), switch on its public link.", "Paste that group's public link below. Installs per group tell you which channel worked."]
};
function campSheet() {
  var c = rows("campaigns").filter(function (z) { return z._r === S.camp; })[0]; if (!c) return "";
  var a = appById(c.app), tf = a && (a.testflight === "1" || a.testflight === "yes"), ST = ["Planned", "Posted", "Ad live", "Done"];
  var inp = function (id, lab, v, ph) { return '<label>' + lab + '<input class="in2" id="' + id + '" value="' + esc(v) + '"' + (ph ? ' placeholder="' + ph + '"' : "") + (/^cp-(v|vi|d|s)$/.test(id) ? ' inputmode="decimal"' : "") + "></label>"; };
  return '<div class="scrim" data-act="closecamp"></div><div class="sheet long" role="dialog" aria-label="Campaign">' + shead(esc((a ? a.name : c.app) + " · " + c.channel), "closecamp") +
    '<label style="display:grid;gap:4px;font-size:12px;color:var(--muted)">What it is<input class="in2" id="cp-t" value="' + esc(c.title) + '"></label>' +
    '<div class="frm"><label>Status<select class="sel2" id="cp-st">' + ST.concat(ST.indexOf(c.status) < 0 && c.status ? [c.status] : []).map(function (x) { return "<option" + (x === c.status ? " selected" : "") + ">" + esc(x) + "</option>"; }).join("") + "</select></label>" + inp("cp-w", "When", c.when, "e.g. Fri 24 Oct") +
    inp("cp-v", "Views", c.views, "0") + inp("cp-vi", "Visits", c.visits, "0") + inp("cp-d", tf ? "Installs" : "Downloads", c.downloads, "0") + inp("cp-s", "Spend", c.spend, "£0") + "</div>" +
    '<label style="display:grid;gap:4px;font-size:12px;color:var(--muted)">' + (tf ? "Public TestFlight link for this channel" : "Campaign link") + '<input class="in2" id="cp-l" value="' + esc(c.link) + '" placeholder="https://"></label>' +
    (c.link ? "" : '<div class="lab2">How to get the link</div>' + stepsHtml(LINKHOW[tf ? "tf" : "store"])) +
    '<div style="display:flex;gap:8px"><button type="button" class="btn primary" data-act="savecamp" style="flex:1">Save</button><button type="button" class="btn" data-act="delcamp">Remove</button></div></div>';
}
function guideSheet() {
  var G2 = [["The three numbers", "Spend, store visits and cost a download, added up from every campaign row."], ["Channels", "Views per channel this month. They fill in as you log posts and add Friday numbers."], ["Campaigns", "One row per post or ad. Tap a row to change its status, add numbers or paste its campaign link. No link means downloads can't be traced to it, so each row says so until it has one."], ["Log a post or ad", "Tap it right after you post. App, channel, what it was, spend if it's an ad."], ["Feeds", "Where the numbers come from. Green is live, yellow needs a key, orange is logged by hand. Tap one to see how to fix it."], ["Friday", "Selling day. Send screenshots of TikTok, Instagram and Reddit stats and Claude fills the numbers in."]];
  return '<div class="scrim" data-act="closeguide"></div><div class="sheet long" role="dialog" aria-label="How this page works">' + shead("How this page works", "closeguide") +
    G2.map(function (g) { return '<div style="display:grid;gap:3px"><b style="font-weight:500;font-size:13px">' + g[0] + '</b><span class="muted" style="font-size:13px;line-height:1.5">' + g[1] + "</span></div>"; }).join("") +
    '<p class="note">The order that gets numbers fastest: campaign links for the three planned posts, then the App Store Connect key.</p></div>';
}
function evSheet() {
  var e = S.ev === "new" ? { area: "dp", title: "", start: iso(NOW), end: "", kind: "" } : evAt(S.ev); if (!e) return "";
  return '<div class="scrim" data-act="closeev"></div><div class="sheet" role="dialog" aria-label="Edit event"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-weight:600">' + (S.ev === "new" ? "Add an event" : "Change this event") + '</b><button type="button" class="btn ghost sm" data-act="closeev">Close</button></div>' +
    '<label style="display:grid;gap:4px;font-size:12px;color:var(--muted)">What (add a time if it has one)<input class="in2" id="ev-t" value="' + esc(e.title) + '" placeholder="e.g. Leo Marcus call, 17:00"></label>' +
    '<div class="frm"><label>Date<input class="in2" type="date" id="ev-s" value="' + esc(e.start) + '"></label><label>Ends (optional)<input class="in2" type="date" id="ev-e" value="' + esc(e.end) + '"></label>' +
    '<label>Area<select class="sel2" id="ev-a">' + ORDER.map(function (a) { return '<option value="' + a + '"' + (a === e.area ? " selected" : "") + ">" + AREAS[a] + "</option>"; }).join("") + '</select></label><label>Status<select class="sel2" id="ev-k"><option value=""' + (e.kind === "hold" || e.kind === "est" ? "" : " selected") + '>Confirmed</option><option value="hold"' + (e.kind === "hold" ? " selected" : "") + '>Hold or to confirm</option><option value="est"' + (e.kind === "est" ? " selected" : "") + ">Estimate</option></select></label></div>" +
    '<p class="note">Your change wins over the morning scan.</p><div style="display:flex;gap:8px"><button type="button" class="btn primary" data-act="saveev" style="flex:1">Save</button>' + (S.ev === "new" ? "" : '<button type="button" class="btn" data-act="delev">Remove</button>') + "</div></div>";
}
function logSheet() {
  var A = rows("apps");
  return '<div class="scrim" data-act="closelog"></div><div class="sheet" role="dialog" aria-label="Log a post or ad"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-weight:600">Log a post or ad</b><button type="button" class="btn ghost sm" data-act="closelog">Close</button></div>' +
    '<div class="frm"><label>App<select class="sel2" id="lg-app">' + A.map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.name) + "</option>"; }).join("") + '<option value="eltio">Eltio</option></select></label><label>Channel<select class="sel2" id="lg-ch"><option>TikTok</option><option>Instagram</option><option>Reddit</option><option>YouTube</option><option>WhatsApp</option></select></label>' +
    '<label>Type<select class="sel2" id="lg-k"><option>Post</option><option>Ad</option></select></label><label>Spend<input class="in2" id="lg-sp" inputmode="decimal" placeholder="£0"></label></div>' +
    '<label style="display:grid;gap:4px;font-size:12px;color:var(--muted)">What was it<input class="in2" id="lg-t" placeholder="e.g. press-ups clip"></label><label style="display:grid;gap:4px;font-size:12px;color:var(--muted)">Link (optional)<input class="in2" id="lg-url" placeholder="https://"></label>' +
    '<p class="note">Views and clicks get added on Friday from a screenshot or the campaign link.</p><button type="button" class="btn primary" data-act="savelog">Save</button></div>';
}

/* ---------- Timeline ---------- */
function vTime(mac) {
  var DW = mac ? 20 : 15, LW = mac ? 210 : 128, W = LW + 42 * DW, out = "", T = evs();
  var wk = '<div class="wk" style="width:' + W + 'px"><span style="width:' + LW + 'px;border-left:0"></span>' + [0, 7, 14, 21, 28, 35].map(function (i) { var d = dayAt(i); return '<span style="width:' + (7 * DW) + 'px">' + d.getDate() + " " + MON[d.getMonth()] + "</span>"; }).join("") + "</div>";
  var fr = ""; for (var i = 0; i < 42; i++) if (dayAt(i).getDay() === 5) fr += '<span class="fri" style="left:' + (LW + i * DW) + "px;width:" + DW + 'px"></span>';
  ORDER.forEach(function (a) { T.filter(function (e) { return e.area === a; }).forEach(function (e) {
    var s = di(e.start), en = di(e.end); if (s === null || (en !== null ? en : s) < 0 || s > 41) return; s = Math.max(0, s); var x = LW + s * DW, soft = e.kind === "hold" || e.kind === "est";
    var bar = en !== null ? '<span class="gb" title="' + esc(e.title) + '" style="--a:var(--' + a + ");left:" + x + "px;width:" + ((Math.min(en, 41) - s + 1) * DW) + "px;" + (soft ? "border-style:dashed;background:transparent" : "") + '">' + ((Math.min(en, 41) - s + 1) * DW > 70 ? esc(e.title) : "") + "</span>"
      : '<span class="gb" title="' + esc(fmt(s) + ": " + e.title) + '" style="--a:var(--' + a + ");left:" + (x + DW / 2 - 6) + "px;width:12px;min-width:12px;height:12px;top:11px;padding:0;border-radius:3px;transform:rotate(45deg);" + (e.kind === "hold" ? "background:transparent" : "background:var(--a)") + '"></span>';
    out += '<div class="lane tap" data-act="ev" data-r="' + e._r + '" style="width:' + W + 'px"><span class="lab2" style="--a:var(--' + a + ");width:" + LW + 'px"><span class="dot"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(e.title) + "</span></span>" + bar + "</div>"; }); });
  var g = out ? '<div class="card cardpad" style="overflow:hidden"><div class="gantt"><div class="gi" style="width:' + W + 'px">' + wk + '<div style="position:relative">' + fr + '<span class="now" style="left:' + (LW + TODAY * DW + DW / 2) + 'px"></span>' + out + "</div></div></div>" +
    '<div class="legend"><span><span class="sw2" style="background:var(--chart);opacity:.3"></span>Friday selling day</span><span><span class="sw2" style="background:var(--fg);width:2px;height:12px"></span>Today</span><span><span class="sw2" style="border:1px dashed var(--muted)"></span>Estimate or hold</span></div></div>' : none("Shoots, launches and money dates land here with the first scan.");
  return topbar() + head("Timeline", "Next 6 weeks. Shoots, launches, money dates.") + g + sec("Coming up", "next 14 days") + agenda(TODAY, TODAY + 13) + '<div style="height:24px"></div>';
}

/* ---------- Inbox + Ask ---------- */
function vInbox() {
  var h = topbar() + '<div class="pad rise"><div class="head" style="padding:0"><h1 style="font-size:22px">Idea inbox</h1><p class="muted">Saved for fun app time. Nothing gets built from here until you say.</p></div>' +
    '<textarea class="ta" id="idea-in" placeholder="Drop an idea. Rough is fine." aria-label="New idea"></textarea><div style="display:flex;gap:6px;flex-wrap:wrap">' + ORDER.map(function (a) { return '<button type="button" class="badge area" data-ia="' + a + '" style="--a:var(--' + a + ");cursor:pointer;" + (S.ideaA === a ? "outline:1.5px solid var(--a)" : "opacity:.7") + '"><span class="dot"></span>' + AREAS[a] + "</button>"; }).join("") + '</div><div><button type="button" class="btn primary" data-act="idea">Save idea</button></div>';
  return h + rows("ideas").map(function (z) { return '<div class="card idea"><span>' + esc(z.text) + '</span><div class="b"><span class="badge area" ' + av(z.area) + '><span class="dot"></span>' + (AREAS[z.area] || esc(z.area)) + "</span>" + (z.kind ? '<span class="badge">' + esc(z.kind) + "</span>" : "") + "</div></div>"; }).join("") + "</div>";
}
/* "Make the prompt" without a server: it only writes a prompt once there's a real goal and a clear project; otherwise it asks back. */
var FILL = "so ok okay hi hey hello yes yep yeah no nope um uh hmm erm test testing lol ha the a an and or but it its this that these there then just like what why how who when where i me my you we to of in on for with is am are be do can could should would will please thanks idea thing stuff something".split(" ");
var KEYS = {
  sw: /\b(apps?|sites?|websites?|eltio|systems|testers?|launch\w*|testflight|aglo|lampwerk|grip|scout|marketing|ads?|posts?|tiktok|reddit|instagram|outreach|clients?|cargo|store|review)\b/,
  dp: /\b(shoots?|shooting|dp|gaffers?|crew|camera|showreel|recce|uta|agent|holds?|kit|lens\w*|commercials?|director)\b/,
  money: /\b(money|vat|tax|invoices?|invoicing|budget|isa|pay|paid|bank|monzo|freeagent|spend\w*|savings?|bills?|runway)\b/,
  health: /\b(gym|climb\w*|weigh\w*|food|sleep|health|train\w*|bjj|run|running|diet|protein)\b/,
  trading: /\b(trad\w*|bots?|ftmo|backtest\w*|markets?|stocks?|forex|strategy)\b/
};
function words(g) { return (g.toLowerCase().match(/[a-z0-9£']+/g) || []).filter(function (w) { return w.length > 1 && FILL.indexOf(w) < 0; }); }
/* area from a close match with an open to-do, then app names and keywords; null when nothing points anywhere */
function guessArea(g) {
  var t = g.toLowerCase(), W = words(g), best = null, top = 0;
  rows("items").filter(open).forEach(function (x) { var T = words(x.title + " " + (x.why || "")), n = W.filter(function (w) { return T.indexOf(w) >= 0; }).length; if (n > top) { top = n; best = x.area; } });
  if (top >= 2) return best;
  if (rows("apps").some(function (a) { var n = (a.name || "").toLowerCase(); return n && t.indexOf(n) >= 0; })) return "sw";
  var hit = ORDER.filter(function (a) { return KEYS[a].test(t); });
  return hit.length ? hit[0] : best;
}
function makePrompt(m) {
  var a = m.area, ctx = rows("items").filter(function (x) { return x.area === a && open(x); }).slice(0, 3).map(function (x) { return "- " + x.title + (x.why ? ": " + x.why : ""); });
  var L = ["Goal: " + m.g.replace(/[.!?\s]+$/, "") + ".", "", "Read studio-brain first: direction.md, " + BRAIN[a] + ", waiting-on-me.md."];
  if (!m.short && ctx.length) L = L.concat(["Open " + AREAS[a] + " items right now:"], ctx);
  L = L.concat(["Do: break the goal into the smallest steps, do the ones you can, and list the ones that need me.", "Success: say up front what done looks like, then check it before you report back.", "Rules: drafts only, never contact anyone, real numbers only.", "End with a handover to studio-brain: decisions, done, next."]);
  return L;
}
function areaChips(k) { return '<div class="reacts">' + ORDER.map(function (a) { return '<button type="button" data-act="setarea" data-k="' + k + '" data-a="' + a + '"><span class="dot" style="width:7px;height:7px;border-radius:50%;background:var(--' + a + ')"></span>' + AREAS[a] + "</button>"; }).join("") + "</div>"; }
function askBub(m, k) {
  if (m.q === "vague") {
    var tops = rows("items").filter(open).slice(0, 3);
    return '<div class="bub it rise"><span>That\'s not a goal yet. What do you want done? Say the outcome, like "get five gaffers testing Lampwerk this week".</span>' + (tops.length ? '<span class="muted" style="font-size:12px">Or start from something open:</span><div class="reacts">' + tops.map(function (x) { return '<button type="button" data-act="askitem" data-id="' + esc(x.id) + '">' + esc(x.title) + "</button>"; }).join("") + "</div>" : "") + "</div>";
  }
  if (!m.area || m.pick) return '<div class="bub it rise"><span>' + (m.area ? "Which project should it go to?" : "Which project is this for? I couldn't tell from the words.") + "</span>" + areaChips(k) + "</div>";
  var L = makePrompt(m);
  return '<div class="bub it rise"><span>Here\'s your prompt for the <b style="font-weight:500">' + PROJECT[m.area] + '</b> project.</span><div class="code">' + L.map(function (l, i) { return '<span class="ln">' + (i + 1) + '</span><span class="tx">' + esc(l) + "</span>"; }).join("") + '</div></div><div class="reacts rise"><button type="button" data-act="copyask" data-k="' + k + '">' + ic("copy") + 'Copy</button><button type="button" data-act="shorter" data-k="' + k + '">' + (m.short ? "Longer" : "Shorter") + '</button><button type="button" data-act="proj" data-k="' + k + '">Change project</button><button type="button" data-act="delask" data-k="' + k + '" aria-label="Delete this prompt">' + ic("x") + "Delete</button></div>";
}
function vAsk() {
  var h = (S.chat.length ? topbar().replace('<span style="display:flex;gap:6px">', '<span style="display:flex;gap:6px"><button type="button" class="btn sm" data-act="clearchat">Clear all</button>') : topbar()) + '<div class="main" style="display:flex;flex-direction:column"><div class="chat">';
  if (!S.chat.length) h += '<div class="empty" style="padding-top:30px"><div class="tile">' + ic("spark") + '</div><h3>Make the prompt</h3><p class="muted">Type or dictate a rough goal. You get a full prompt for the right project, using what\'s open in that area.</p></div>';
  S.chat.forEach(function (m, k) { h += m.me ? '<div class="bub me rise">' + esc(m.t) + "</div>" : askBub(m, k); });
  return h + '</div></div><div class="compose"><textarea id="ask-in" rows="1" placeholder="Rough goal… tap the keyboard mic to talk" aria-label="Rough goal"></textarea><button type="button" class="btn icon" data-act="ask" aria-label="Make the prompt">' + ic("send") + "</button></div>";
}

/* ---------- sheets (dialogs) ---------- */
function calSheet() {
  var x = item(S.sheet), first = new Date(NOW.getFullYear(), NOW.getMonth(), 1), lead = first.getDay(), dim = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0).getDate(), days = "";
  for (var k = 0; k < lead; k++) days += '<span></span>';
  for (var d = 1; d <= dim; d++) { var past = d < NOW.getDate(); days += '<button type="button" class="d' + (d === NOW.getDate() ? " today" : "") + (S.pick === d ? " pick" : "") + '" data-day="' + d + '"' + (past ? ' disabled style="color:var(--faint)"' : "") + ">" + d + "</button>"; }
  var q = function (off, lab) { var t = new Date(NOW); t.setDate(NOW.getDate() + off); return t.getMonth() === NOW.getMonth() ? '<button type="button" class="btn sm" data-day="' + t.getDate() + '">' + lab + "</button>" : ""; };
  var toMon = (8 - NOW.getDay()) % 7 || 7, toFri = (12 - NOW.getDay()) % 7 || 7;
  return '<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-label="Remind me later"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-weight:600">Remind me later</b><button type="button" class="btn ghost sm" data-act="close">Close</button></div><p class="muted" style="font-size:13px">' + esc(x.title) + ". It goes quiet until then.</p>" +
    '<div class="quick">' + q(1, "Tomorrow") + q(toFri, "Friday") + q(toMon, "Next Monday") + "</div>" +
    '<div class="cal"><div class="ch"><span></span><div class="sel"><span>' + MON[NOW.getMonth()] + " " + NOW.getFullYear() + '</span></div><span></span></div><div class="g7">' + "SMTWTFS".split("").map(function (c) { return '<span class="dw">' + c + "</span>"; }).join("") + days + "</div></div>" +
    '<button type="button" class="btn primary" data-act="setlater"' + (S.pick ? "" : ' disabled style="opacity:.5"') + ">" + (S.pick ? "Remind me " + S.pick + " " + MON[NOW.getMonth()] : "Pick a day") + "</button></div>";
}
function fbSheet() { return '<div class="scrim" data-act="closefb"></div><div class="sheet" role="dialog" aria-label="Feedback"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-weight:600">What should change?</b><button type="button" class="btn ghost sm" data-act="closefb">Close</button></div><textarea class="ta" id="fb-in" placeholder="Rough is fine. It goes to os-feedback.md and the top 3 get looked at every week."></textarea><button type="button" class="btn primary" data-act="savefb">Send</button></div>'; }

/* ---------- shell ---------- */
var NAV = [["today", "Today", "home"], ["apps", "Apps", "grid"], ["mkt", "Marketing", "mega"], ["time", "Timeline", "gantt"], ["ask", "Ask", "spark"]];
function isMac() { return window.matchMedia("(min-width: 900px)").matches; }
function tabbar() { return '<nav class="tabbar" aria-label="Views">' + NAV.map(function (t) { return '<button type="button" data-tab="' + t[0] + '" class="' + (S.tab === t[0] || (S.tab === "inbox" && t[0] === "today") ? "on" : "") + '">' + ic(t[2]) + t[1] + "</button>"; }).join("") + "</nav>"; }
function body(mac) { return S.tab === "today" ? vToday(mac) : S.tab === "apps" ? vApps() : S.tab === "mkt" ? vMkt() : S.tab === "time" ? vTime(mac) : vInbox(); }
function macView() {
  var L = list(); if (S.i >= L.length) S.i = 0; var x = L[S.i], cnt = { today: left(), inbox: rows("ideas").length };
  var side = '<div class="side"><div class="nav2">' + NAV.concat([["inbox", "Inbox", "inbox"]]).map(function (t) { return '<button type="button" class="li' + (S.tab === t[0] ? " on" : "") + '" data-tab="' + t[0] + '">' + ic(t[2]) + t[1] + '<span class="faint" style="margin-left:auto">' + (cnt[t[0]] || "") + "</span></button>"; }).join("") + "</div>" +
    (S.tab === "apps" ? rows("apps").map(function (a) { return '<button type="button" class="li' + (S.app === a.id ? " on" : "") + '" data-app="' + esc(a.id) + '"><span class="dot" style="background:' + esc(a.colour) + '"></span>' + esc(a.name) + "</button>"; }).join("") :
      ORDER.map(function (a) { var its = items().filter(function (z) { return z.area === a; }); if (!its.length) return ""; return '<div class="g" ' + av(a) + '><span class="dot"></span>' + AREAS[a] + "</div>" + its.map(function (z) { return '<button type="button" class="li' + (x && z.id === x.id && S.tab === "today" ? " on" : "") + '" data-goto="' + esc(z.id) + '">' + esc(z.title) + "</button>"; }).join(""); }).join("")) + "</div>";
  var wide = S.tab === "apps" || S.tab === "mkt" || S.tab === "time";
  var mid = S.tab === "ask" ? '<div class="wrap" style="height:100%;display:flex;flex-direction:column">' + vAsk() + "</div>" : '<div class="wrap' + (wide ? " wide" : "") + '">' + body(true) + "</div>";
  var right = wide ? "" : '<div class="rightp">' + chartCard() + '<div><div class="sec" style="padding:0 2px 8px"><h3>Next 7 days</h3></div>' + agenda(TODAY, TODAY + 6).replace("cardpad", "") + "</div></div>";
  return '<div class="view"><div class="macgrid" style="' + (right ? "" : "grid-template-columns:230px minmax(0,1fr)") + '">' + side + '<div class="center">' + mid + "</div>" + right + "</div></div>";
}
function render() {
  if (!D) return;
  var mac = isMac(); document.documentElement.className = mac ? "mac" : "phone";
  var st = document.querySelector(".main,.center"), y = st ? st.scrollTop : 0, h;
  if (mac) h = macView();
  else if (S.tab === "ask") h = '<div class="view">' + vAsk() + tabbar() + "</div>";
  else h = '<div class="view"><div class="main">' + body(false) + "</div>" + tabbar() + "</div>";
  if (S.sheet) h += calSheet(); if (S.log) h += logSheet(); if (S.ev) h += evSheet(); if (S.fb) h += fbSheet(); if (S.src) h += srcSheet(); if (S.camp) h += campSheet(); if (S.guide) h += guideSheet();
  $("scr").innerHTML = h; bindSwipe();
  var m2 = document.querySelector(".main,.center"); if (m2 && S.keep) m2.scrollTop = y; S.keep = false;
  var c = document.querySelector(".chat"); if (c && S.chat.length) { var m = c.closest(".main"); if (m) m.scrollTop = m.scrollHeight; }
}
function bindSwipe() {
  var c = $("card"); if (!c) return; var x0 = null;
  c.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  c.addEventListener("touchend", function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); });
}
function step(k) { var L = list(); if (!L.length) return; var c = $("card"); if (c) c.classList.add("out"); setTimeout(function () { S.i = (S.i + k + L.length) % L.length; S.keep = true; render(); }, 160); }
function go(tab) { S.tab = tab; render(); var m = document.querySelector(".main,.center"); if (m) m.scrollTop = 0; }
function ask(g) {
  g = (g || "").trim(); if (!g) return toast("Type a rough goal first");
  var last = S.chat[S.chat.length - 1], ta = $("ask-in"); if (ta) ta.value = "";
  S.chat.push({ me: 1, t: g });
  /* a reply to "which project?" can just name the project */
  if (last && !last.me && !last.q && !last.area) { var na = ORDER.filter(function (a) { return AREAS[a].toLowerCase() === g.toLowerCase() || PROJECT[a].toLowerCase() === g.toLowerCase(); })[0]; if (na) { last.area = na; S.chat.pop(); return render(); } }
  if (words(g).length < 2) { S.chat.push({ q: "vague" }); return render(); }
  S.chat.push({ g: g, area: guessArea(g) }); render();
}

function gate(msg) {
  $("scr").innerHTML = '<div class="gate"><div class="box"><span class="logo">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return "<i" + (i === 0 || i === 4 || i === 8 ? ' class="on"' : "") + "></i>"; }).join("") + "</span><h1>Mission control</h1><p class=\"muted\">" + esc(msg || "Sign in with the Google account that holds your hub sheet.") + '</p><button type="button" class="btn primary" data-act="signin">Continue with Google</button><p class="note">Your data stays in one sheet in your own Drive.</p></div></div>';
}
function boot(silent) {
  return getToken(silent).then(function () { $("scr").innerHTML = '<div class="gate"><p class="muted">Loading your hub…</p></div>'; return findSheet(); })
    .then(function (id) { G.sheetId = id; return load(); }).then(function () { render(); })
    .catch(function (e) { if (e && e.message === "signed out") return; flag("hub-sheet-id", null); gate(e && e.message ? (/^Sign-in/.test(e.message) ? e.message : "Couldn't open your hub: " + e.message) : ""); });
}
/* tree "go": app:<id>, tab:<name>, item:<id>, area:<code> or an https link */
function goTo(g) {
  g = String(g || ""); var k = g.indexOf(":"), t = g.slice(0, k), v = g.slice(k + 1);
  if (/^https:\/\//.test(g)) { window.open(g, "_blank", "noopener"); return; }
  if (t === "app") { S.app = v; return go("apps"); }
  if (t === "tab") { if (v === "apps") S.app = null; return go(v); }
  if (t === "item") { S.f = "all"; S.i = Math.max(0, list().map(function (z) { return z.id; }).indexOf(v)); return go("today"); }
  if (t === "area") { S.f = v; S.i = 0; return go("today"); }
}
function reload() { return load().then(function () { S.keep = true; render(); toast("Up to date"); }).catch(function (e) { toast(e.message); }); }

document.addEventListener("click", function (e) {
  var b = e.target.closest("button,[data-act]"); if (!b) return; var d = b.dataset;
  if (d.act === "signin") return boot(false);
  if (!D) return;
  if (d.tab) return go(d.tab);
  if (d.app) { S.app = d.app; return go("apps"); }
  if (d.f) { S.f = d.f; S.i = 0; S.keep = true; return render(); }
  if (d.br) { S.open = S.open === d.br ? null : d.br; S.keep = true; return render(); }
  if (d.day) { S.pick = +d.day; S.keep = true; return render(); }
  if (d.ia) { S.ideaA = d.ia; var v = $("idea-in").value; render(); $("idea-in").value = v; return; }
  if (d.copy) return copy(findPrompt(d.copy) || "", b);
  if (d.goto) { S.f = "all"; S.i = Math.max(0, list().map(function (z) { return z.id; }).indexOf(d.goto)); return go("today"); }
  if (d.chk) { var f = rows("friday")[+d.chk]; setCell("friday", f, "done", f.done === "yes" ? "" : "yes"); S.keep = true; return render(); }
  var a = d.act; if (!a) return;
  if (a === "next") return step(1); if (a === "prev") return step(-1);
  S.keep = true;
  if (a === "reload") return reload();
  if (a === "done") { var it = item(d.id); setCell("items", it, "updated", new Date().toISOString()); setCell("items", it, "status", "done"); toast("Done. It won't come back"); return render(); }
  if (a === "later") { S.sheet = d.id; S.pick = null; return render(); }
  if (a === "close") { S.sheet = null; return render(); }
  if (a === "setlater") { if (!S.pick) return; var t = item(S.sheet), dt = new Date(NOW.getFullYear(), NOW.getMonth(), S.pick); setCell("items", t, "later", iso(dt)); setCell("items", t, "status", "later"); S.sheet = null; render(); return toast("Back on " + S.pick + " " + MON[NOW.getMonth()]); }
  if (a === "fri") { S.fri = !S.fri; return render(); }
  if (a === "log") { S.log = true; return render(); }
  if (a === "src") { S.src = d.k; return render(); }
  if (a === "closesrc") { S.src = null; return render(); }
  if (a === "copysrc") return copy(FIX[S.src].prompt, null);
  if (a === "guide") { S.guide = true; return render(); }
  if (a === "closeguide") { S.guide = false; return render(); }
  if (a === "camp") { S.camp = +d.r; return render(); }
  if (a === "closecamp") { S.camp = null; return render(); }
  if (a === "savecamp") { var cr = rows("campaigns").filter(function (z) { return z._r === S.camp; })[0], cv = { title: $("cp-t").value.trim(), status: $("cp-st").value, when: $("cp-w").value.trim(), views: $("cp-v").value.trim(), visits: $("cp-vi").value.trim(), downloads: $("cp-d").value.trim(), spend: $("cp-s").value.replace(/[£\s]/g, ""), link: $("cp-l").value.trim() };
    if (cv.link && !/^https:\/\//.test(cv.link)) return toast("The link should start with https://");
    Object.keys(cv).forEach(function (f) { if (cr[f] !== cv[f]) setCell("campaigns", cr, f, cv[f]); }); setCell("campaigns", cr, "logged", new Date().toISOString()); S.camp = null; render(); return toast("Saved"); }
  if (a === "delcamp") { var cr2 = rows("campaigns").filter(function (z) { return z._r === S.camp; })[0]; setCell("campaigns", cr2, "status", "gone"); S.camp = null; render(); return toast("Removed"); }
  if (a === "closelog") { S.log = false; return render(); }
  if (a === "savelog") { var sp = $("lg-sp").value.replace(/[£\s]/g, ""); append("campaigns", { app: $("lg-app").value, channel: $("lg-ch").value, title: ($("lg-t").value.trim() || $("lg-k").value), status: $("lg-k").value === "Ad" ? "Ad live" : "Posted", when: iso(new Date()), spend: sp, link: $("lg-url").value.trim(), logged: new Date().toISOString() }); S.log = false; render(); return toast("Logged. Numbers get added Friday"); }
  if (a === "ev") { S.ev = +d.r; return render(); }
  if (a === "addev") { S.ev = "new"; return render(); }
  if (a === "closeev") { S.ev = null; return render(); }
  if (a === "saveev") { var et = $("ev-t").value.trim(), es = $("ev-s").value, ee = $("ev-e").value; if (!et || !es) return toast("Add what it is and a date");
    if (ee && ee < es) return toast("The end date is before the start");
    var nv = { area: $("ev-a").value, title: et, start: es, end: ee, kind: $("ev-k").value, edited: new Date().toISOString() };
    if (S.ev === "new") append("timeline", nv); else { var ev = evAt(S.ev); Object.keys(nv).forEach(function (f) { if (ev[f] !== nv[f]) setCell("timeline", ev, f, nv[f]); }); }
    S.ev = null; render(); return toast("Saved"); }
  if (a === "delev") { var ev2 = evAt(S.ev); setCell("timeline", ev2, "edited", new Date().toISOString()); setCell("timeline", ev2, "kind", "gone"); S.ev = null; render(); return toast("Removed"); }
  if (a === "go") return goTo(d.go);
  if (a === "fb") { S.fb = true; return render(); }
  if (a === "closefb") { S.fb = false; return render(); }
  if (a === "savefb") { var tx = $("fb-in").value.trim(); if (!tx) return toast("Type something first"); append("feedback", { time: new Date().toISOString(), text: tx }); S.fb = false; render(); return toast("Thanks. It's in the feedback list"); }
  if (a === "idea") { var i2 = $("idea-in").value.trim(); if (!i2) return toast("Type an idea first"); append("ideas", { text: i2, area: S.ideaA, kind: "", created: new Date().toISOString() }); toast("Saved for fun app time"); return render(); }
  if (a === "ask") return ask($("ask-in").value);
  var m = S.chat[+d.k];
  if (a === "copyask") return copy(makePrompt(m).join("\n"), null);
  if (a === "shorter") { m.short = !m.short; return render(); }
  if (a === "proj") { m.pick = true; return render(); }
  /* a prompt goes with the message that asked for it; the chat also clears itself on every restart */
  if (a === "delask") { var dk = +d.k, from = dk > 0 && S.chat[dk - 1].me ? dk - 1 : dk; S.chat.splice(from, dk - from + 1); return render(); }
  if (a === "clearchat") { S.chat = []; return render(); }
  if (a === "setarea") { m.area = d.a; m.pick = false; return render(); }
  if (a === "askitem") { var it = item(d.id); if (it) { S.chat.push({ me: 1, t: it.title }); S.chat.push({ g: it.title, area: it.area }); render(); } return; }
});
document.addEventListener("keydown", function (e) {
  if (/TEXTAREA|INPUT|SELECT/.test(e.target.tagName)) { if (e.key === "Enter" && !e.shiftKey && e.target.id === "ask-in") { e.preventDefault(); ask(e.target.value); } return; }
  if (D && S.tab === "today" && !S.sheet && !S.log && !S.fb && !S.ev && !S.src && !S.camp && !S.guide) { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); }
});
var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { S.keep = true; render(); }, 150); });
document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" && D && G.token && Date.now() < G.exp) load().then(function () { S.keep = true; render(); }).catch(function () {}); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});

if (tokenFromHash()) boot(true);
else if (flag("hub-signed-in") && !G.authErr) boot(true);
else gate(flag("hub-signed-in") ? "Tap to open your hub." : "");
