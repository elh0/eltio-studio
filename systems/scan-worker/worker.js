/* Systems scan inbox: a Cloudflare Worker.
   Each person gets a private address <id>@scan.eltio.systems. Their mail app forwards work email to it.
   The Worker keeps only the subject, sender, date and a short preview of each email (no attachments, no full body),
   for at most 30 days, until the person's app collects them. Once collected they are deleted here.
   Bindings: SCAN (KV namespace). */

const DOMAIN = "scan.eltio.systems";
const KEEP = 60 * 60 * 24 * 30;
/* Anything that isn't about work is dropped straight away, unread and unkept. */
const WORK = /call ?sheet|callsheet|\bhold\b|pencil|avail|are you free|booking|booked|confirm|start date|invoice|\binv\b|remittance|payment|\bpaid\b|timesheet|time ?sheet|timecard|start (pack|form)|crew (form|list)|purchase order|\bpo\b|shoot|recce|\bprep\b|\bwrap\b|day rate|\brate\b|\bppm\b|award/i;
const ORIGINS = ["https://eltio.systems", "https://elh0.github.io", "http://localhost:8765"];

export default {
  async email(message, env) {
    const id = String(message.to || "").split("@")[0].toLowerCase();
    const user = id && (await env.SCAN.get("u:" + id));
    if (!user) return message.setReject("Unknown address");
    const raw = await readRaw(message.raw, 2000000);
    /* Several emails forwarded as attachments arrive as one; each is read on its own. */
    const inner = attached(split(raw), 0, []).slice(0, 40).map(parseMail);
    const list = (inner.length ? inner : [parseMail(raw)]).filter((m) => m.confirm || WORK.test(m.subject + " " + m.snippet + " " + m.files.join(" ")));
    for (const m of list) {
      const key = "m:" + id + ":" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      await env.SCAN.put(key, JSON.stringify(m), { expirationTtl: KEEP });
    }
  },

  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    const out = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return out({ ok: true, what: "Systems scan inbox" });
    if (!ORIGINS.includes(origin)) return out({ error: "origin" }, 403);
    const path = new URL(req.url).pathname;
    let body = {};
    try { body = await req.json(); } catch (e) {}

    if (path === "/new") {
      const id = rand(10, "abcdefghjkmnpqrstuvwxyz23456789"), secret = rand(32);
      await env.SCAN.put("u:" + id, JSON.stringify({ h: await sha(secret), at: new Date().toISOString() }));
      return out({ id, key: secret, address: id + "@" + DOMAIN });
    }

    const id = String(body.id || "").toLowerCase();
    const user = id && JSON.parse((await env.SCAN.get("u:" + id)) || "null");
    if (!user || user.h !== (await sha(String(body.key || "")))) return out({ error: "key" }, 401);

    if (path === "/read") {
      const list = await env.SCAN.list({ prefix: "m:" + id + ":", limit: 200 });
      const mails = [];
      for (const k of list.keys) {
        const v = await env.SCAN.get(k.name);
        if (v) mails.push({ key: k.name, ...JSON.parse(v) });
      }
      return out({ mails });
    }
    if (path === "/ack") {
      const keys = (body.keys || []).filter((k) => typeof k === "string" && k.startsWith("m:" + id + ":")).slice(0, 200);
      for (const k of keys) await env.SCAN.delete(k);
      return out({ deleted: keys.length });
    }
    if (path === "/forget") {
      const list = await env.SCAN.list({ prefix: "m:" + id + ":", limit: 1000 });
      for (const k of list.keys) await env.SCAN.delete(k.name);
      await env.SCAN.delete("u:" + id);
      return out({ forgotten: true });
    }
    return out({ error: "path" }, 404);
  }
};

function rand(n, chars) {
  chars = chars || "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const b = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(b, (x) => chars[x % chars.length]).join("");
}
async function sha(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, "0")).join("");
}
async function readRaw(stream, max) {
  const r = stream.getReader(), parts = [];
  let n = 0;
  while (n < max) { const { done, value } = await r.read(); if (done) break; parts.push(value); n += value.length; }
  try { r.cancel(); } catch (e) {}
  const all = new Uint8Array(Math.min(n, max)); let o = 0;
  for (const p of parts) { const c = p.slice(0, all.length - o); all.set(c, o); o += c.length; if (o >= all.length) break; }
  return new TextDecoder("latin1").decode(all);
}

/* ---------- a small MIME reader: headers, the plain text part, forwarded originals ---------- */
function split(raw) {
  const i = raw.search(/\r?\n\r?\n/);
  const head = i < 0 ? raw : raw.slice(0, i), body = i < 0 ? "" : raw.slice(i).replace(/^\r?\n\r?\n/, "");
  const h = {};
  head.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/).forEach((l) => { const j = l.indexOf(":"); if (j > 0) { const k = l.slice(0, j).trim().toLowerCase(); if (!h[k]) h[k] = l.slice(j + 1).trim(); } });
  return { h, body };
}
function bytes(s) { return Uint8Array.from(s, (c) => c.charCodeAt(0) & 255); }
function charsetOf(ct) { const m = /charset="?([\w-]+)/i.exec(ct || ""); return m ? m[1].toLowerCase() : "utf-8"; }
function decodeText(bin, cs) { try { return new TextDecoder(cs).decode(bytes(bin)); } catch (e) { return new TextDecoder("utf-8").decode(bytes(bin)); } }
function unQP(s) { return s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, x) => String.fromCharCode(parseInt(x, 16))); }
function unB64(s) { try { return atob(s.replace(/[^A-Za-z0-9+/=]/g, "")); } catch (e) { return ""; } }
function words(v) {
  return String(v || "").replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_, cs, enc, t) => decodeText(enc.toUpperCase() === "B" ? unB64(t) : unQP(t.replace(/_/g, " ")), cs.toLowerCase())).replace(/\?=\s+=\?/g, "");
}
function partText(p) {
  const te = (p.h["content-transfer-encoding"] || "").toLowerCase(), ct = p.h["content-type"] || "text/plain";
  const bin = te === "base64" ? unB64(p.body) : te === "quoted-printable" ? unQP(p.body) : p.body;
  return decodeText(bin, charsetOf(ct));
}
function findText(p, depth) {
  const ct = (p.h["content-type"] || "text/plain").toLowerCase();
  if (ct.startsWith("multipart/") && depth < 5) {
    const b = /boundary="?([^";]+)"?/i.exec(p.h["content-type"]);
    if (!b) return { plain: "", html: "" };
    const kids = p.body.split("--" + b[1]).slice(1).filter((x) => !x.startsWith("--")).map((x) => split(x.replace(/^\r?\n/, "")));
    const res = { plain: "", html: "" };
    for (const k of kids) { const r = findText(k, depth + 1); if (!res.plain && r.plain) res.plain = r.plain; if (!res.html && r.html) res.html = r.html; }
    return res;
  }
  if (/attachment/i.test(p.h["content-disposition"] || "")) return { plain: "", html: "" };
  if (ct.startsWith("text/plain")) return { plain: partText(p), html: "" };
  if (ct.startsWith("text/html")) return { plain: "", html: partText(p) };
  return { plain: "", html: "" };
}
function attached(p, depth, out) {
  const ct = (p.h["content-type"] || "").toLowerCase();
  if (ct.startsWith("message/rfc822")) {
    const te = (p.h["content-transfer-encoding"] || "").toLowerCase();
    out.push(te === "base64" ? unB64(p.body) : te === "quoted-printable" ? unQP(p.body) : p.body);
    return out;
  }
  if (ct.startsWith("multipart/") && depth < 5) {
    const b = /boundary="?([^";]+)"?/i.exec(p.h["content-type"]);
    if (b) p.body.split("--" + b[1]).slice(1).filter((x) => !x.startsWith("--")).forEach((x) => attached(split(x.replace(/^\r?\n/, "")), depth + 1, out));
  }
  if (/\.eml"?\s*$/i.test(p.h["content-disposition"] || "") && !ct.startsWith("multipart/") && !ct.startsWith("message/")) {
    const te = (p.h["content-transfer-encoding"] || "").toLowerCase();
    out.push(te === "base64" ? unB64(p.body) : p.body);
  }
  return out;
}
function stripHtml(s) {
  return s.replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'").replace(/&pound;/g, "£");
}
function parseMail(raw) {
  const top = split(raw), t = findText(top, 0);
  let text = (t.plain || stripHtml(t.html || "")).replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  let subject = words(top.h.subject), from = words(top.h.from), to = words(top.h.to), date = top.h.date || "";
  const files = [...new Set((raw.match(/(?:file)?name\*?="?([^";\r\n]+\.(?:pdf|xlsx?|docx?|csv|numbers))"?/gi) || []).map((x) => x.replace(/^.*?="?/, "").replace(/"$/, "")))].slice(0, 5);
  /* A forwarded email: the original sender, subject and date sit in the body under a header block. */
  let fwd = false;
  const block = /(?:^|\n)(?:-+ ?(?:Forwarded message|Original Message) ?-+\n)?\*?From:\*? ?(.+)\n(?:[\s\S]{0,300}?\n)?\*?(?:Sent|Date):\*? ?(.+)\n[\s\S]{0,400}?\*?Subject:\*? ?(.+)\n/i.exec(text);
  if (block && (/^\s*(fwd?|fw|tr|wg)\s*:/i.test(subject) || block.index < 400)) {
    fwd = true;
    from = block[1].trim(); date = block[2].trim(); subject = block[3].trim();
    text = text.slice(block.index + block[0].length);
  }
  subject = subject.replace(/^\s*((fwd?|fw|tr|wg)\s*:\s*)+/i, "");
  /* The "confirm forwarding" email a mail app sends first: keep its link so the app can show it. */
  let confirm = "";
  if (/forwarding|verify|verification|confirm (your|this|the) (address|email)/i.test(subject) && /noreply|no-reply|forwarding|account|security/i.test(from)) {
    const u = /https:\/\/[^\s"'<>)\]]+/.exec(t.plain || t.html || "");
    confirm = u ? u[0] : "open";
  }
  const when = Date.parse(date.replace(/ at /, " ")) || Date.now();
  return { subject: subject.slice(0, 200), from: from.slice(0, 200), to: to.slice(0, 200), at: when, snippet: text.slice(0, 600), files, fwd, confirm };
}
