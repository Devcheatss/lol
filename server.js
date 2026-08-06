"use strict";

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { promisify } = require("util");
const dns = require("dns/promises");

/* minimal .env loader (no dependency) */
try {
  const fs = require("fs");
  const envFile = path.join(__dirname, ".env");
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
} catch {}

const db = require("./lib/db");
const mailer = require("./lib/mailer");
const tools = require("./lib/tools");
const chat = require("./lib/chat");

const app = express();
const PORT = process.env.PORT || 3000;
const HIBP_API_KEY = process.env.HIBP_API_KEY || "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const RATE_LIMIT = Number(process.env.RATE_LIMIT) || 240;
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS) || 10 * 60 * 1000;

app.disable("x-powered-by");
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

const scryptAsync = promisify(crypto.scrypt);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function fail(res, status, message, detail) {
  return res.status(status).json({ ok: false, error: message, detail });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{2,32}$/;
const IP_RE = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

function cleanDomain(input) {
  let d = String(input).trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  d = d.split(/[/?#]/)[0];
  d = d.replace(/\.$/, "");
  return d;
}

function isIPv4(s) {
  return IP_RE.test(s);
}

function isIPv6(s) {
  return /^[0-9a-fA-F:]+$/.test(s) && s.includes(":");
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, ...options });
    return res;
  } catch (err) {
    if (err.name === "AbortError") {
      const e = new Error(`Request timed out after ${timeoutMs}ms`);
      e.timedOut = true;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, timeoutMs = 12000) {
  const res = await fetchWithTimeout(
    url,
    { headers: { "User-Agent": "L/1.0 (+https://example.com)" } },
    timeoutMs
  );
  if (!res.ok) throw new Error(`Upstream returned HTTP ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) throw new Error("Upstream returned non-JSON response");
  return res.json();
}

/* ---- passwords ---- */

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return salt + ":" + buf.toString("hex");
}

async function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  const buf = await scryptAsync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === buf.length && crypto.timingSafeEqual(expected, buf);
}

/* ---- cookies / sessions ---- */

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true",
  };
}

function setSessionCookie(res, token) {
  res.cookie("sid", token, cookieOpts());
}

/* ---- rate limiter ---- */

const hits = new Map();
app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_LIMIT) {
    return fail(res, 429, "Rate limit exceeded. Please wait a few minutes.");
  }
  arr.push(now);
  hits.set(ip, arr);
  next();
});

function requireAuth(req, res, next) {
  const token = readCookie(req, "sid");
  const sess = token ? db.getSession(token) : null;
  if (!sess) return fail(res, 401, "Not authenticated. Please log in.");
  req.user = sess.email;
  next();
}

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */

app.post("/api/auth/send-otp", async (req, res) => {
  const email = String((req.body && req.body.email) || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return fail(res, 400, "Enter a valid email address.");

  const cooldown = db.otpCooldownRemaining(email);
  if (cooldown > 0) return fail(res, 429, `Please wait ${cooldown}s before requesting another code.`);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.setOtp(email, code);

  try {
    const r = await mailer.sendVerificationCode(email, code);
    const body = { ok: true, sent: r.sent };
    if (r.devCode !== undefined) body.devCode = r.devCode;
    res.json(body);
  } catch (err) {
    if (err.misconfigured) return fail(res, 500, "Email sending is not configured on this server.");
    return fail(res, 500, "Failed to send email. Check SMTP settings.");
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const email = String((req.body && req.body.email) || "").trim().toLowerCase();
  const code = String((req.body && req.body.code) || "").trim();
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) return fail(res, 400, "Invalid request.");

  const otp = db.getOtp(email);
  if (!otp) return fail(res, 400, "Code expired. Request a new one.");

  await db.consumeOtpAttempt(email);
  const updated = db.getOtp(email);
  if (!updated) return fail(res, 429, "Too many attempts. Request a new code.");
  if (updated.code !== code) return fail(res, 400, "Incorrect code.");
  res.json({ ok: true, verified: true });
});

app.post("/api/auth/register", async (req, res) => {
  const email = String((req.body && req.body.email) || "").trim().toLowerCase();
  const code = String((req.body && req.body.code) || "").trim();
  const password = String((req.body && req.body.password) || "");

  if (!EMAIL_RE.test(email)) return fail(res, 400, "Enter a valid email address.");
  if (!/^\d{6}$/.test(code)) return fail(res, 400, "Enter the 6-digit code from your email.");
  if (password.length < 8) return fail(res, 400, "Password must be at least 8 characters.");
  if (db.userExists(email)) return fail(res, 409, "An account with this email already exists. Log in instead.");

  const otp = db.getOtp(email);
  if (!otp) return fail(res, 400, "Code expired. Request a new one.");
  if (otp.code !== code) {
    await db.consumeOtpAttempt(email);
    return fail(res, 400, "Incorrect code.");
  }
  await db.deleteOtp(email);

  const passwordHash = await hashPassword(password);
  await db.createUser(email, passwordHash);

  const token = crypto.randomBytes(32).toString("hex");
  await db.createSession(token, email);
  setSessionCookie(res, token);

  res.json({ ok: true, email });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String((req.body && req.body.email) || "").trim().toLowerCase();
  const password = String((req.body && req.body.password) || "");
  if (!EMAIL_RE.test(email) || !password) return fail(res, 400, "Enter your email and password.");

  const user = db.getUser(email);
  if (!user) return fail(res, 401, "Invalid email or password.");
  if (user.lockedUntil && Date.now() < user.lockedUntil) {
    return fail(res, 429, "Account temporarily locked. Try again later.");
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await db.recordFailedLogin(email);
    return fail(res, 401, "Invalid email or password.");
  }
  await db.clearFailedLogins(email);

  const token = crypto.randomBytes(32).toString("hex");
  await db.createSession(token, email);
  setSessionCookie(res, token);

  res.json({ ok: true, email });
});

app.post("/api/auth/logout", async (req, res) => {
  const token = readCookie(req, "sid");
  if (token) await db.deleteSession(token);
  res.clearCookie("sid", cookieOpts());
  res.json({ ok: true });
});

app.get("/api/auth/me", async (req, res) => {
  const token = readCookie(req, "sid");
  const sess = token ? db.getSession(token) : null;
  if (!sess) return fail(res, 401, "Not authenticated");
  res.json({ ok: true, email: sess.email });
});

app.post("/api/auth/change-password", requireAuth, async (req, res) => {
  const current = String((req.body && req.body.current) || "");
  const next = String((req.body && req.body.next) || "");
  if (current.length < 8 || next.length < 8) {
    return fail(res, 400, "Password must be at least 8 characters.");
  }
  if (current === next) return fail(res, 400, "New password must be different.");

  const user = db.getUser(req.user);
  if (!user) return fail(res, 404, "Account not found.");
  const ok = await verifyPassword(current, user.passwordHash);
  if (!ok) return fail(res, 401, "Current password is incorrect.");

  const passwordHash = await hashPassword(next);
  await db.updatePassword(req.user, passwordHash);
  res.json({ ok: true });
});

app.post("/api/auth/change-email", requireAuth, async (req, res) => {
  const newEmail = String((req.body && req.body.newEmail) || "").trim().toLowerCase();
  const password = String((req.body && req.body.password) || "");
  if (!EMAIL_RE.test(newEmail)) return fail(res, 400, "Enter a valid new email address.");
  if (newEmail === req.user) return fail(res, 400, "That's already your email.");
  if (!password) return fail(res, 400, "Enter your password to confirm.");

  const user = db.getUser(req.user);
  if (!user) return fail(res, 404, "Account not found.");
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return fail(res, 401, "Password is incorrect.");

  if (db.userExists(newEmail)) return fail(res, 409, "An account with that email already exists.");
  await db.updateEmail(req.user, newEmail);
  res.json({ ok: true, email: newEmail });
});

/* ------------------------------------------------------------------ */
/* Email lookup                                                        */
/* ------------------------------------------------------------------ */

app.get("/api/email/:email", requireAuth, async (req, res) => {
  const email = String(req.params.email).toLowerCase();
  if (!EMAIL_RE.test(email)) return fail(res, 400, "Invalid email address.");

  const domain = email.split("@")[1];
  const result = { email, mxRecords: null, breaches: null, breachedCount: null, note: "" };

  try {
    result.mxRecords = await dns.resolveMx(domain);
    result.mxRecords.sort((a, b) => a.priority - b.priority);
  } catch (err) {
    result.mxRecords = { error: err.code || err.message };
  }

  if (!HIBP_API_KEY) {
    result.note =
      "Have I Been Pwned lookup requires a free API key. Set the HIBP_API_KEY environment variable to enable breach checks.";
  } else {
    try {
      const r = await fetchWithTimeout(
        `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
        { headers: { "hibp-api-key": HIBP_API_KEY, "User-Agent": "osint-web-toolkit" } },
        15000
      );
      if (r.status === 200) {
        const data = await r.json();
        result.breaches = data;
        result.breachedCount = data.length;
      } else if (r.status === 404) {
        result.breachedCount = 0;
      } else {
        result.breaches = { httpStatus: r.status };
      }
    } catch (err) {
      result.breaches = { error: err.message };
    }
  }

  res.json({ ok: true, data: result });
});

/* ------------------------------------------------------------------ */
/* IP tools                                                            */
/* ------------------------------------------------------------------ */

app.get("/api/ip/:ip", requireAuth, async (req, res) => {
  let ip = String(req.params.ip).trim();
  if (!isIPv4(ip) && !isIPv6(ip)) return fail(res, 400, "Invalid IP address.");

  const data = { ip };

  try {
    const r = await fetchJson(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting`
    );
    if (r.status === "success") data.geo = r;
    else data.geo = { error: r.message || "geolocation lookup failed" };
  } catch (err) {
    data.geo = { error: err.message };
  }

  try {
    data.reverseDns = await dns.reverse(ip);
  } catch {
    data.reverseDns = null;
  }

  res.json({ ok: true, data });
});

/* ------------------------------------------------------------------ */
/* DNS records                                                         */
/* ------------------------------------------------------------------ */

app.get("/api/dns/:domain", requireAuth, async (req, res) => {
  const domain = cleanDomain(req.params.domain);
  if (!DOMAIN_RE.test(domain)) return fail(res, 400, "Invalid domain name.");

  const checks = tools.DNS_CHECKS;

  const out = {};
  await Promise.all(
    Object.entries(checks).map(async ([type, fn]) => {
      try {
        out[type] = await fn(domain);
      } catch (err) {
        if (err.code === "ENOTFOUND") out[type] = { error: "domain not found" };
        else if (err.code === "ENODATA" || err.code === "ENOTIMP") out[type] = null;
        else out[type] = { error: err.code || err.message };
      }
    })
  );

  res.json({ ok: true, data: { domain, records: out } });
});

/* ------------------------------------------------------------------ */
/* WHOIS (RDAP)                                                        */
/* ------------------------------------------------------------------ */

app.get("/api/whois/:domain", requireAuth, async (req, res) => {
  const domain = cleanDomain(req.params.domain);
  if (!DOMAIN_RE.test(domain)) return fail(res, 400, "Invalid domain name.");

  try {
    const data = await fetchJson(`https://rdap.org/domain/${encodeURIComponent(domain)}`, 15000);
    res.json({ ok: true, data: summarizeRdap(data) });
  } catch (err) {
    res.status(502).json({ ok: false, error: "WHOIS/RDAP lookup failed", detail: err.message });
  }
});

function summarizeRdap(rdap) {
  const findEvent = (kind) => {
    const ev = (rdap.events || []).find((e) => e.eventAction === kind);
    return ev ? ev.eventDate : null;
  };

  const entities = (rdap.entities || []).map((ent) => ({
    handle: ent.handle,
    roles: ent.roles || [],
    name: ent.vcardArray && ent.vcardArray[1]
      ? (() => {
          const fn = ent.vcardArray[1].find((v) => v[0] === "fn");
          return fn ? fn[3] : null;
        })()
      : null,
    email: ent.vcardArray && ent.vcardArray[1]
      ? (() => {
          const e = ent.vcardArray[1].find((v) => v[0] === "email");
          return e ? e[3] : null;
        })()
      : null,
  }));

  return {
    handle: rdap.handle || null,
    ldapName: rdap.ldhName || null,
    status: rdap.status || [],
    created: findEvent("registration"),
    updated: findEvent("last changed"),
    expires: findEvent("expiration"),
    nameservers: (rdap.nameservers || []).map((n) => n.ldhName),
    secureDns: rdap.secureDNS || null,
    entities,
    source: rdap.port43 || null,
  };
}

/* ------------------------------------------------------------------ */
/* Subdomain enumeration (certificate transparency)                    */
/* ------------------------------------------------------------------ */

app.get("/api/subdomains/:domain", requireAuth, async (req, res) => {
  const domain = cleanDomain(req.params.domain);
  if (!DOMAIN_RE.test(domain)) return fail(res, 400, "Invalid domain name.");

  const sources = [
    {
      name: "crt.sh",
      fetch: () => fetchJson(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`, 20000),
      parse: (data) => {
        const seen = new Set();
        const subs = [];
        for (const row of Array.isArray(data) ? data : []) {
          const name = String(row.name_value || "").toLowerCase();
          for (const n of name.split("\n")) {
            const s = n.trim().replace(/^\*\./, "");
            if (s.endsWith(domain) && !seen.has(s)) {
              seen.add(s);
              subs.push(s);
            }
          }
          if (seen.size >= 300) break;
        }
        return subs;
      },
    },
    {
      name: "certspotter",
      fetch: () =>
        fetchJson(
          `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(domain)}&include_subdomains=true&expand=dns_names`,
          15000
        ),
      parse: (data) => {
        const seen = new Set();
        const subs = [];
        for (const row of Array.isArray(data) ? data : []) {
          for (const n of row.dns_names || []) {
            const s = String(n).toLowerCase().replace(/^\*\./, "");
            if (s.endsWith(domain) && !seen.has(s)) {
              seen.add(s);
              subs.push(s);
            }
          }
        }
        return subs;
      },
    },
  ];

  try {
    const winner = await Promise.any(sources.map(async (src) => ({ src, data: await src.fetch() })));
    const subs = winner.src.parse(winner.data);
    subs.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    return res.json({ ok: true, data: { domain, count: subs.length, subdomains: subs, source: winner.src.name } });
  } catch (agg) {
    const messages = (agg.errors || [agg]).map((e) => e.message);
    return res.status(502).json({
      ok: false,
      error: "Certificate transparency lookup failed on all sources",
      detail: messages.join(" | "),
    });
  }
});

/* ------------------------------------------------------------------ */
/* Username search                                                     */
/* ------------------------------------------------------------------ */

const PLATFORMS = tools.PLATFORMS;

app.get("/api/username/:username", requireAuth, async (req, res) => {
  const username = String(req.params.username).trim();
  if (!USERNAME_RE.test(username)) {
    return fail(res, 400, "Invalid username (2-32 chars, letters/numbers/_.-)");
  }

  const results = [];
  const CONCURRENCY = 5;
  const jobs = PLATFORMS.map((p, i) => ({ p, i }));
  let cursor = 0;

  const worker = async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      const [name, , urlTemplate, reliable] = job.p;
      const url = urlTemplate.replace("{u}", encodeURIComponent(username));
      const out = { platform: name, url, status: "unknown", message: "" };
      try {
        const doFetch = async (method) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          try {
            return await fetch(url, {
              method,
              redirect: "manual",
              signal: controller.signal,
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
              },
            });
          } finally {
            clearTimeout(timer);
          }
        };

        let response = await doFetch("HEAD");
        if (response.status === 405) response = await doFetch("GET");
        const code = response.status;
        const location = response.headers.get("location") || "";
        const locLower = location.toLowerCase();

        if (code === 200) {
          out.status = "found";
        } else if (code === 404) {
          out.status = "not_found";
        } else if (code >= 300 && code < 400) {
          if (locLower.includes("/login") || locLower.includes("/auth")) {
            out.status = "not_found";
            out.message = "Redirects to login: " + location;
          } else if (locLower.includes(username.toLowerCase())) {
            out.status = "found";
            out.message = "Redirects to: " + location;
          } else {
            out.status = "redirect";
            out.message = "Redirects to: " + location;
          }
        } else if (code === 403) {
          out.status = "blocked";
          out.message = "Platform blocked automated check";
        } else {
          out.status = "unknown";
          out.message = "HTTP " + code;
        }

        if (out.status === "found" && !reliable) {
          out.status = "ambiguous";
          out.message = "HTTP 200 (platform does not reliably signal missing accounts — verify manually)";
        }
      } catch (err) {
        out.status = err.timedOut ? "timeout" : "error";
        out.message = err.timedOut ? "Timed out" : err.message;
      }
      results[job.i] = out;
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  res.json({
    ok: true,
    data: {
      username,
      found: results.filter((r) => r && r.status === "found"),
      notFound: results.filter((r) => r && r.status === "not_found"),
      ambiguous: results.filter((r) => r && ["ambiguous", "blocked", "redirect", "unknown", "timeout", "error"].includes(r.status)),
      checked: results.length,
    },
  });
});

/* ------------------------------------------------------------------ */
/* URL / link analyzer                                                 */
/* ------------------------------------------------------------------ */

app.get("/api/url", requireAuth, async (req, res) => {
  let url = String(req.query.u || "").trim();
  if (!url) return fail(res, 400, "Missing url parameter (?u=https://...)");
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  try {
    new URL(url);
  } catch {
    return fail(res, 400, "Invalid URL.");
  }

  const hops = [];
  let current = url;
  let finalUrl = url;

  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetchWithTimeout(
        current,
        {
          method: "GET",
          redirect: "manual",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
          },
        },
        12000
      );
      const location = response.headers.get("location");
      hops.push({ hop: i, url: current, status: response.status, location: location || null });
      if (response.status >= 300 && response.status < 400 && location) {
        current = new URL(location, current).toString();
        finalUrl = current;
      } else {
        break;
      }
    } catch (err) {
      hops.push({ hop: i, url: current, error: err.message });
      break;
    }
  }

  const data = { input: url, finalUrl, hops };

  try {
    const finalHost = new URL(finalUrl).hostname;
    const records = await dns.resolve4(finalHost);
    data.finalIp = records[0] || null;
    if (data.finalIp) {
      try {
        data.finalReverseDns = await dns.reverse(data.finalIp);
      } catch {
        data.finalReverseDns = null;
      }
    }
  } catch {
    data.finalIp = null;
  }

  res.json({ ok: true, data });
});

/* ------------------------------------------------------------------ */
/* Hash analyzer                                                       */
/* ------------------------------------------------------------------ */

app.get("/api/hash", requireAuth, (req, res) => {
  const value = String(req.query.h || "").trim();
  if (!value) return fail(res, 400, "Missing hash value (?h=...)");

  const isHex = /^[0-9a-fA-F]+$/.test(value);
  const len = value.length;
  const candidates = [];

  const hexLenMap = {
    8: ["CRC-32", "Adler-32", "ELF-32"],
    16: ["CRC-64", "MySQL 3.x password hash"],
    32: ["MD5", "MD4", "NTLM", "LM Hash", "RIPEMD-128", "Haval-128"],
    40: ["SHA-1", "RIPEMD-160", "Haval-160", "Tiger-160", "MySQL 5 password hash"],
    56: ["SHA-224", "SHA3-224", "BLAKE2s-224"],
    64: ["SHA-256", "SHA3-256", "BLAKE2b-256", "Haval-256"],
    96: ["SHA-384", "SHA3-384"],
    128: ["SHA-512", "SHA3-512", "Whirlpool", "BLAKE2b-512"],
  };

  if (isHex && hexLenMap[len]) candidates.push(...hexLenMap[len]);

  const patternMap = [
    [/^\$2[aby]\$/, "bcrypt"],
    [/^\$5\$\w+/, "SHA-256 crypt (Unix /etc/shadow)"],
    [/^\$6\$\w+/, "SHA-512 crypt (Unix /etc/shadow)"],
    [/^\$1\$\w+/, "MD5 crypt (Unix /etc/shadow)"],
    [/^\$argon2i\$/, "Argon2i"],
    [/^\$argon2id\$/, "Argon2id"],
    [/^\$pbkdf2-sha\d+\$/, "PBKDF2 (Django)"],
  ];
  for (const [re, name] of patternMap) if (re.test(value)) candidates.push(name);

  if (len === 32 && /^[a-zA-Z0-9+/]{32}$/.test(value)) candidates.push("MD5/SHA (Base64, 32 chars)");
  if (len === 44 && /^[a-zA-Z0-9+/=]{44}$/.test(value)) candidates.push("SHA-256 (Base64)");
  if (len === 64 && /^[a-zA-Z0-9+/]{64}$/.test(value)) candidates.push("SHA-512 (Base64)");
  if (len === 16 && /^[0-9]{16}$/.test(value)) candidates.push("Numeric: possible card/PIN-style hash");

  const charset = isHex
    ? "hexadecimal (0-9a-f)"
    : /^[a-zA-Z0-9+/=]+$/.test(value)
    ? "base64-ish"
    : "alphanumeric with symbols";

  res.json({
    ok: true,
    data: {
      length: len,
      charset,
      candidates: candidates.length ? [...new Set(candidates)] : ["No common algorithm matched this length/format."],
    },
  });
});

/* ------------------------------------------------------------------ */
/* HTTP headers inspector                                              */
/* ------------------------------------------------------------------ */

app.get("/api/headers", requireAuth, async (req, res) => {
  let url = String(req.query.u || "").trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    new URL(url);
  } catch {
    return fail(res, 400, "Invalid URL.");
  }

  const chain = [];
  let current = url;
  for (let i = 0; i < 6; i++) {
    try {
      const response = await fetchWithTimeout(
        current,
        {
          method: "GET",
          redirect: "manual",
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36" },
        },
        12000
      );
      chain.push({ url: current, status: response.status, headers: Object.fromEntries(response.headers.entries()) });
      const loc = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && loc) {
        current = new URL(loc, current).toString();
        continue;
      }
      break;
    } catch (err) {
      chain.push({ url: current, error: err.message });
      break;
    }
  }

  const final = chain[chain.length - 1];
  let security = null;
  if (final && final.headers) {
    const lower = {};
    for (const [k, v] of Object.entries(final.headers)) lower[k.toLowerCase()] = v;
    security = [
      "strict-transport-security",
      "content-security-policy",
      "x-frame-options",
      "x-content-type-options",
      "referrer-policy",
      "permissions-policy",
      "server",
      "x-powered-by",
    ].map((h) => ({ header: h, present: h in lower, value: lower[h] || null }));
  }

  res.json({ ok: true, data: { input: url, chain, security } });
});

/* ------------------------------------------------------------------ */
/* CIDR calculator                                                     */
/* ------------------------------------------------------------------ */

app.get("/api/cidr", requireAuth, (req, res) => {
  const c = String(req.query.cidr || "").trim();
  const m = c.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!m) return fail(res, 400, "Invalid CIDR (e.g. 192.168.0.0/24).");

  const octs = m.slice(1, 5).map(Number);
  const prefix = Number(m[5]);
  if (octs.some((o) => o > 255) || prefix > 32) return fail(res, 400, "Invalid CIDR.");

  const ipInt = ((octs[0] << 24) | (octs[1] << 16) | (octs[2] << 8) | octs[3]) >>> 0;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = ipInt & mask;
  const broadcast = (network | ~mask) >>> 0;
  const toIp = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");

  const total = Math.pow(2, 32 - prefix);
  let sample = [];
  if (total <= 512) {
    for (let i = 0; i < total; i++) sample.push(toIp((network + i) >>> 0));
  }

  const usableHosts = prefix >= 31 ? total : prefix === 0 ? null : total - 2;

  res.json({
    ok: true,
    data: {
      cidr: c,
      network: toIp(network),
      broadcast: toIp(broadcast),
      mask: toIp(mask),
      prefix,
      totalAddresses: total,
      usableHosts,
      firstUsable: prefix === 32 ? toIp(network) : prefix === 31 ? toIp(network) : toIp((network + 1) >>> 0),
      lastUsable: prefix === 32 ? toIp(network) : prefix === 31 ? toIp(broadcast) : toIp((broadcast - 1) >>> 0),
      sample,
    },
  });
});

/* ------------------------------------------------------------------ */
/* Web search aggregator                                               */
/* ------------------------------------------------------------------ */

app.get("/api/search", requireAuth, (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return fail(res, 400, "Missing query (?q=...)");

  const enc = encodeURIComponent(q);
  const engines = [
    ["Google", `https://www.google.com/search?q=${enc}`],
    ["Bing", `https://www.bing.com/search?q=${enc}`],
    ["DuckDuckGo", `https://duckduckgo.com/?q=${enc}`],
    ["Brave", `https://search.brave.com/search?q=${enc}`],
    ["Startpage", `https://www.startpage.com/sp/search?query=${enc}`],
    ["Yandex", `https://yandex.com/search/?text=${enc}`],
    ["GitHub", `https://github.com/search?q=${enc}`],
    ["Shodan", `https://www.shodan.io/search?query=${enc}`],
    ["crt.sh (certificates)", `https://crt.sh/?q=${enc}`],
    ["Wayback Machine", `https://web.archive.org/web/*/${enc}`],
    ["Whoisology", `https://whoisology.com/search?q=${enc}`],
    ["EPOCH TIMES / news", `https://www.google.com/search?tbm=nws&q=${enc}`],
  ];

  res.json({ ok: true, data: { query: q, engines } });
});

/* ------------------------------------------------------------------ */
/* Phone lookup                                                        */
/* ------------------------------------------------------------------ */

const CC = [
  ["1", "US / CA"], ["20", "Egypt"], ["27", "South Africa"], ["30", "Greece"], ["31", "Netherlands"],
  ["32", "Belgium"], ["33", "France"], ["34", "Spain"], ["36", "Hungary"], ["39", "Italy"],
  ["40", "Romania"], ["41", "Switzerland"], ["43", "Austria"], ["44", "United Kingdom"], ["45", "Denmark"],
  ["46", "Sweden"], ["47", "Norway"], ["48", "Poland"], ["49", "Germany"], ["51", "Peru"],
  ["52", "Mexico"], ["54", "Argentina"], ["55", "Brazil"], ["56", "Chile"], ["57", "Colombia"],
  ["58", "Venezuela"], ["60", "Malaysia"], ["61", "Australia"], ["62", "Indonesia"], ["63", "Philippines"],
  ["64", "New Zealand"], ["65", "Singapore"], ["66", "Thailand"], ["81", "Japan"], ["82", "South Korea"],
  ["84", "Vietnam"], ["86", "China"], ["90", "Turkey"], ["91", "India"], ["92", "Pakistan"],
  ["93", "Afghanistan"], ["94", "Sri Lanka"], ["95", "Myanmar"], ["98", "Iran"], ["212", "Morocco"],
  ["213", "Algeria"], ["216", "Tunisia"], ["234", "Nigeria"], ["254", "Kenya"], ["351", "Portugal"],
  ["352", "Luxembourg"], ["353", "Ireland"], ["358", "Finland"], ["370", "Lithuania"], ["371", "Latvia"],
  ["372", "Estonia"], ["380", "Ukraine"], ["381", "Serbia"], ["385", "Croatia"], ["386", "Slovenia"],
  ["420", "Czechia"], ["421", "Slovakia"], ["886", "Taiwan"], ["852", "Hong Kong"], ["853", "Macau"],
  ["961", "Lebanon"], ["963", "Syria"], ["964", "Iraq"], ["966", "Saudi Arabia"], ["971", "UAE"],
  ["972", "Israel"], ["974", "Qatar"], ["966", "Saudi Arabia"],
];

app.get("/api/phone", requireAuth, async (req, res) => {
  const raw = String(req.query.n || "").trim();
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return fail(res, 400, "Enter a phone number in international format, e.g. +14155552671");
  }

  const data = { input: raw, e164: "+" + digits };

  const codes = [...CC].sort((a, b) => b[0].length - a[0].length);
  for (const [code, country] of codes) {
    if (digits.startsWith(code)) {
      data.country = country;
      data.countryCode = "+" + code;
      data.localPart = digits.slice(code.length);
      break;
    }
  }

  if (process.env.NUMVERIFY_API_KEY) {
    try {
      const r = await fetchJson(
        `https://apilayer.net/api/validate?access_key=${encodeURIComponent(process.env.NUMVERIFY_API_KEY)}&number=${encodeURIComponent(raw)}`,
        10000
      );
      data.valid = r.valid;
      data.carrier = r.carrier || null;
      data.lineType = r.line_type || null;
    } catch (e) {
      data.carrier = { error: e.message };
    }
  }

  res.json({ ok: true, data });
});

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Port scanner                                                         */
/* ------------------------------------------------------------------ */

app.get("/api/port", requireAuth, async (req, res) => {
  let host = String(req.query.host || "").trim();
  if (!host) return fail(res, 400, "Missing host parameter (?host=...)");
  host = cleanDomain(host);
  if (!tools.DOMAIN_RE.test(host) && !tools.isIPv4(host) && !tools.isIPv6(host)) {
    return fail(res, 400, "Invalid host.");
  }
  let custom = [];
  const ports = String(req.query.ports || "").trim();
  if (ports) {
    custom = ports.split(/[,\s]+/).map(Number).filter((n) => n >= 1 && n <= 65535);
    if (!custom.length) return fail(res, 400, "Invalid ports (?ports=22,80,443).");
  }
  try {
    const data = await tools.scanPorts(host, custom);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(502).json({ ok: false, error: "Port scan failed", detail: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* TLS certificate                                                      */
/* ------------------------------------------------------------------ */

app.get("/api/cert", requireAuth, async (req, res) => {
  let host = String(req.query.host || "").trim();
  if (!host) return fail(res, 400, "Missing host parameter (?host=...)");
  host = tools.cleanDomain(host);
  if (!tools.DOMAIN_RE.test(host)) return fail(res, 400, "Invalid host.");
  try {
    const data = await tools.getCert(host);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(502).json({ ok: false, error: "Certificate lookup failed", detail: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Wayback Machine snapshots                                            */
/* ------------------------------------------------------------------ */

app.get("/api/wayback", requireAuth, async (req, res) => {
  const url = String(req.query.url || "").trim();
  if (!url) return fail(res, 400, "Missing url parameter (?url=...)");
  try {
    const data = await tools.wayback(url);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(502).json({ ok: false, error: "Wayback lookup failed", detail: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Breach checks                                                        */
/* ------------------------------------------------------------------ */

app.get("/api/breach", requireAuth, async (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return fail(res, 400, "Invalid email address.");
  try {
    res.json({ ok: true, data: await tools.checkEmailBreaches(email) });
  } catch (err) {
    res.status(502).json({ ok: false, error: "Breach lookup failed", detail: err.message });
  }
});

app.get("/api/pwned", requireAuth, async (req, res) => {
  const password = String(req.query.p || "");
  if (!password) return fail(res, 400, "Missing password parameter (?p=...)");
  if (password.length > 128) return fail(res, 400, "Password too long.");
  try {
    res.json({ ok: true, data: await tools.pwnedPassword(password) });
  } catch (err) {
    res.status(502).json({ ok: false, error: "Pwned Passwords lookup failed", detail: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Crypto wallet                                                        */
/* ------------------------------------------------------------------ */

app.get("/api/wallet", requireAuth, async (req, res) => {
  const coin = String(req.query.coin || "btc").toLowerCase();
  const address = String(req.query.addr || "").trim();
  if (!address) return fail(res, 400, "Missing address parameter (?coin=btc&addr=...).");
  try {
    res.json({ ok: true, data: await tools.walletLookup(coin, address) });
  } catch (err) {
    res.status(502).json({ ok: false, error: "Wallet lookup failed", detail: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Batch lookups                                                        */
/* ------------------------------------------------------------------ */

app.post("/api/batch", requireAuth, async (req, res) => {
  const tool = String((req.body && req.body.tool) || "");
  const items = Array.isArray(req.body && req.body.items) ? req.body.items : [];
  if (!tool) return fail(res, 400, "Missing tool parameter.");
  if (!items.length) return fail(res, 400, "No items provided.");
  if (items.length > 100) return fail(res, 400, "Batch limited to 100 items.");
  try {
    const data = await tools.batchRunner(tool, items.slice(0, 100));
    res.json({ ok: true, data });
  } catch (err) {
    res.status(502).json({ ok: false, error: "Batch lookup failed", detail: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Investigations (saved cases)                                         */
/* ------------------------------------------------------------------ */

app.get("/api/investigations", requireAuth, (req, res) => {
  res.json({ ok: true, data: db.getInvestigations(req.user) });
});

app.post("/api/investigations", requireAuth, async (req, res) => {
  const body = (req.body && req.body.data) || req.body || {};
  const inv = await db.createInvestigation(req.user, {
    title: body.title,
    target: body.target,
    status: body.status,
    tags: body.tags,
    notes: body.notes,
  });
  res.json({ ok: true, data: inv });
});

app.patch("/api/investigations/:id", requireAuth, async (req, res) => {
  const body = (req.body && req.body.data) || req.body || {};
  const inv = await db.updateInvestigation(req.user, req.params.id, body);
  if (!inv) return fail(res, 404, "Investigation not found.");
  res.json({ ok: true, data: inv });
});

app.post("/api/investigations/:id/entries", requireAuth, async (req, res) => {
  const body = (req.body && req.body.data) || req.body || {};
  const inv = await db.addInvestigationEntry(req.user, req.params.id, {
    tool: body.tool,
    query: body.query,
    data: body.data,
  });
  if (!inv) return fail(res, 404, "Investigation not found.");
  res.json({ ok: true, data: inv });
});

app.delete("/api/investigations/:id/entries/:idx", requireAuth, async (req, res) => {
  const inv = await db.removeInvestigationEntry(req.user, req.params.id, req.params.idx);
  if (!inv) return fail(res, 404, "Investigation not found.");
  res.json({ ok: true, data: inv });
});

app.delete("/api/investigations/:id", requireAuth, async (req, res) => {
  const ok = await db.deleteInvestigation(req.user, req.params.id);
  if (!ok) return fail(res, 404, "Investigation not found.");
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* AI assistant (DeepSeek)                                              */
/* ------------------------------------------------------------------ */

app.get("/api/chat/status", requireAuth, (req, res) => {
  res.json({ ok: true, configured: Boolean(DEEPSEEK_API_KEY) });
});

app.post("/api/chat", requireAuth, async (req, res) => {
  if (!DEEPSEEK_API_KEY) {
    return fail(res, 503, "AI is not configured on this server. Set the DEEPSEEK_API_KEY environment variable.");
  }
  const messages = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
  if (!messages.length) return fail(res, 400, "No messages provided.");
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      return fail(res, 400, "Invalid message format.");
    }
    if (m.content.length > 8000) return fail(res, 400, "Message too long.");
  }
  try {
    const out = await chat.runChat(DEEPSEEK_API_KEY, messages);
    res.json({ ok: true, ...out });
  } catch (err) {
    res.status(502).json({ ok: false, error: "AI request failed", detail: err.message });
  }
});

/* ------------------------------------------------------------------ */

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  fail(res, 404, "Not found");
});

app.use((err, req, res, next) => {
  void next;
  console.error(err);
  fail(res, 500, "Internal server error");
});

db.cleanup().then(() => {
  app.listen(PORT, () => {
    console.log(`L toolkit running at http://localhost:${PORT}`);
    if (!mailer.configured) {
      console.log("[!] SMTP not configured - verification codes will be shown in the console (dev mode only).");
    }
  });
});
