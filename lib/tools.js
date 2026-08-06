"use strict";

const dns = require("dns/promises");
const net = require("net");
const tls = require("tls");
const crypto = require("crypto");

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
    return await fetch(url, { signal: controller.signal, ...options });
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
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": "L/1.0 (osint toolkit)" } }, timeoutMs);
  if (!res.ok) throw new Error(`Upstream returned HTTP ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) throw new Error("Upstream returned non-JSON response");
  return res.json();
}

const DNS_CHECKS = {
  A: (d) => dns.resolve4(d, { ttl: true }),
  AAAA: (d) => dns.resolve6(d, { ttl: true }),
  CNAME: (d) => dns.resolveCname(d),
  MX: (d) => dns.resolveMx(d),
  NS: (d) => dns.resolveNs(d),
  TXT: (d) => dns.resolveTxt(d),
  SOA: (d) => dns.resolveSoa(d),
  CAA: (d) => dns.resolveCaa(d),
};

async function resolveDns(domain) {
  const out = {};
  await Promise.all(
    Object.entries(DNS_CHECKS).map(async ([type, fn]) => {
      try {
        out[type] = await fn(domain);
      } catch (err) {
        if (err.code === "ENOTFOUND") out[type] = { error: "domain not found" };
        else if (err.code === "ENODATA" || err.code === "ENOTIMP") out[type] = null;
        else out[type] = { error: err.code || err.message };
      }
    })
  );
  return { domain, records: out };
}

async function lookupIp(ip) {
  const data = { ip };
  try {
    const r = await fetchJson(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting`
    );
    data.geo = r.status === "success" ? r : { error: r.message || "geolocation lookup failed" };
  } catch (err) {
    data.geo = { error: err.message };
  }
  try {
    data.reverseDns = await dns.reverse(ip);
  } catch {
    data.reverseDns = null;
  }
  return data;
}

async function whoisDomain(domain) {
  const rdap = await fetchJson(`https://rdap.org/domain/${encodeURIComponent(domain)}`, 15000);
  const findEvent = (kind) => {
    const ev = (rdap.events || []).find((e) => e.eventAction === kind);
    return ev ? ev.eventDate : null;
  };
  const entities = (rdap.entities || []).map((ent) => {
    const arr = ent.vcardArray && ent.vcardArray[1] ? ent.vcardArray[1] : [];
    const get = (kind) => {
      const v = arr.find((x) => x[0] === kind);
      return v ? v[3] : null;
    };
    return { handle: ent.handle, roles: ent.roles || [], name: get("fn"), email: get("email") };
  });
  return {
    handle: rdap.handle || null,
    ldapName: rdap.ldhName || null,
    status: rdap.status || [],
    created: findEvent("registration"),
    updated: findEvent("last changed"),
    expires: findEvent("expiration"),
    nameservers: (rdap.nameservers || []).map((n) => n.ldhName),
    entities,
    source: rdap.port43 || null,
  };
}

const PLATFORMS = [
  ["GitHub", "https://github.com/", "https://github.com/{u}", true],
  ["GitLab", "https://gitlab.com/", "https://gitlab.com/{u}", true],
  ["Dev.to", "https://dev.to", "https://dev.to/{u}", true],
  ["Keybase", "https://keybase.io", "https://keybase.io/{u}", true],
  ["YouTube", "https://www.youtube.com", "https://www.youtube.com/@{u}", true],
  ["Vimeo", "https://vimeo.com", "https://vimeo.com/{u}", true],
  ["Behance", "https://www.behance.net", "https://www.behance.net/{u}", true],
  ["Dribbble", "https://dribbble.com", "https://dribbble.com/{u}", true],
  ["Flickr", "https://www.flickr.com", "https://www.flickr.com/people/{u}", true],
  ["Patreon", "https://www.patreon.com", "https://www.patreon.com/{u}", true],
  ["Replit", "https://replit.com", "https://replit.com/@{u}", true],
  ["Reddit", "https://www.reddit.com", "https://www.reddit.com/user/{u}", false],
  ["Telegram", "https://t.me", "https://t.me/{u}", false],
  ["Pinterest", "https://www.pinterest.com", "https://www.pinterest.com/{u}", false],
  ["Twitch", "https://www.twitch.tv", "https://www.twitch.tv/{u}", false],
  ["Steam", "https://steamcommunity.com", "https://steamcommunity.com/id/{u}", false],
  ["Bitbucket", "https://bitbucket.org", "https://bitbucket.org/{u}", false],
  ["Wordpress", "https://wordpress.com", "https://{u}.wordpress.com", false],
  ["HackerNews", "https://news.ycombinator.com", "https://news.ycombinator.com/user?id={u}", false],
  ["Medium", "https://medium.com", "https://medium.com/@{u}", false],
  ["VK", "https://vk.com", "https://vk.com/{u}", false],
];

async function scanUsername(username) {
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

  return {
    username,
    found: results.filter((r) => r && r.status === "found"),
    notFound: results.filter((r) => r && r.status === "not_found"),
    ambiguous: results.filter((r) => r && ["ambiguous", "blocked", "redirect", "unknown", "timeout", "error"].includes(r.status)),
    checked: results.length,
  };
}

async function resolveUrlChain(url) {
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
  return data;
}

async function inspectHeaders(url) {
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
  return { input: url, chain, security };
}

async function checkEmailBreaches(email) {
  const key = process.env.HIBP_API_KEY || "";
  const out = { email, breaches: null, breachedCount: null, note: "" };
  if (!key) {
    out.note = "Breach check requires the HIBP_API_KEY environment variable.";
    return out;
  }
  try {
    const r = await fetchWithTimeout(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      { headers: { "hibp-api-key": key, "User-Agent": "osint-web-toolkit" } },
      15000
    );
    if (r.status === 200) {
      const data = await r.json();
      out.breaches = data.map((b) => ({ name: b.Name, date: b.BreachDate, description: b.Description }));
      out.breachedCount = data.length;
    } else if (r.status === 404) {
      out.breachedCount = 0;
    } else {
      out.breaches = { httpStatus: r.status };
    }
  } catch (err) {
    out.breaches = { error: err.message };
  }
  return out;
}

async function pwnedPassword(password) {
  const sha1 = crypto.createHash("sha1").update(String(password), "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  const res = await fetchWithTimeout(
    `https://api.pwnedpasswords.com/range/${prefix}`,
    { headers: { "User-Agent": "osint-web-toolkit" } },
    12000
  );
  if (!res.ok) throw new Error(`Pwned Passwords returned HTTP ${res.status}`);
  const body = await res.text();
  let count = 0;
  for (const line of body.split(/\r?\n/)) {
    const [suf, cnt] = line.split(":");
    if (suf && suf.toUpperCase() === suffix) {
      count = Number(cnt) || 0;
      break;
    }
  }
  return { sha1, prefix, pwned: count > 0, count };
}

function getCert(host) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host,
      servername: host,
      port: 443,
      rejectUnauthorized: false,
      timeout: 10000,
    });
    socket.once("error", (err) => reject(new Error("TLS handshake failed: " + err.message)));
    socket.setTimeout(10000, () => socket.destroy(new Error("TLS handshake timed out")));
    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate(true);
      const issuer = socket.getPeerCertificate();
      socket.end();
      const now = Date.now();
      const validTo = issuer.valid_to ? Date.parse(issuer.valid_to) : 0;
      resolve({
        host,
        subject: cert.subject || null,
        issuer: cert.issuer || null,
        subjectaltname: cert.subjectaltname || null,
        valid_from: issuer.valid_from || null,
        valid_to: issuer.valid_to || null,
        daysRemaining: validTo ? Math.floor((validTo - now) / 86400000) : null,
        fingerprint: cert.fingerprint256 || null,
        serial: issuer.serialNumber || null,
        protocol: socket.getProtocol ? socket.getProtocol() : null,
      });
    });
  });
}

const COMMON_PORTS = [
  [21, "FTP"], [22, "SSH"], [23, "Telnet"], [25, "SMTP"], [53, "DNS"], [80, "HTTP"],
  [110, "POP3"], [111, "RPC"], [135, "MS-RPC"], [139, "NetBIOS"], [143, "IMAP"], [443, "HTTPS"],
  [445, "SMB"], [465, "SMTPS"], [587, "SMTP(sub)"], [631, "IPP"], [993, "IMAPS"], [995, "POP3S"],
  [1433, "MSSQL"], [1521, "Oracle"], [2082, "cPanel"], [2083, "cPanel(TLS)"], [3306, "MySQL"],
  [3389, "RDP"], [5432, "PostgreSQL"], [5900, "VNC"], [6379, "Redis"], [8080, "HTTP-alt"],
  [8443, "HTTPS-alt"], [8888, "HTTP-alt"], [9200, "Elasticsearch"], [27017, "MongoDB"],
];

async function scanPorts(host, customPorts) {
  let ip = null;
  try {
    const records = await dns.resolve4(host);
    ip = records[0];
  } catch {
    ip = null;
  }

  const ports = (customPorts && customPorts.length
    ? customPorts.map((p) => {
        const n = Number(p);
        const known = COMMON_PORTS.find(([port]) => port === n);
        return [n, known ? known[1] : "?"];
      })
    : COMMON_PORTS
  ).filter(([p]) => p >= 1 && p <= 65535);

  const results = [];
  const CONCURRENCY = 32;
  let cursor = 0;
  const started = Date.now();

  const worker = async () => {
    while (cursor < ports.length) {
      const [port, service] = ports[cursor++];
      const out = { port, service, state: "closed" };
      await new Promise((resolveProbe) => {
        const s = net.connect({ host, port, timeout: 1500 });
        const done = (state) => {
          if (s.destroyed && state === undefined) return;
          try { s.destroy(); } catch {}
          out.state = state;
          resolveProbe();
        };
        s.once("connect", () => done("open"));
        s.once("timeout", () => done("filtered"));
        s.once("error", (err) => done(err.code === "ECONNREFUSED" ? "closed" : "filtered"));
      });
      results.push(out);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  results.sort((a, b) => a.port - b.port);
  return {
    host,
    ip,
    total: ports.length,
    elapsedMs: Date.now() - started,
    open: results.filter((r) => r.state === "open"),
    filtered: results.filter((r) => r.state === "filtered"),
    closed: results.filter((r) => r.state === "closed").length,
  };
}

async function wayback(url) {
  const res = await fetchWithTimeout(
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&fl=timestamp,original,statuscode,digest&filter=statuscode:200&collapse=digest&limit=50`,
    { headers: { "User-Agent": "osint-web-toolkit" } },
    20000
  );
  if (!res.ok) throw new Error(`Wayback CDX returned HTTP ${res.status}`);
  const rows = await res.json();
  const snapshots = (Array.isArray(rows) ? rows.slice(1) : [])
    .filter((r) => r && r[0] && r[0].length >= 14)
    .map((r) => ({
      timestamp: r[0],
      original: r[1],
      status: r[2],
      url: `https://web.archive.org/web/${r[0]}/${r[1]}`,
    }));
  const first = snapshots.length ? snapshots[0] : null;
  const last = snapshots.length ? snapshots[snapshots.length - 1] : null;
  return { url, count: snapshots.length, snapshots, first, last };
}

async function walletLookup(coin, addr) {
  const c = String(coin).toLowerCase();
  const a = String(addr).trim();
  if (c === "btc" || c === "bitcoin") {
    if (!/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a)) throw new Error("Invalid BTC address.");
    const r = await fetchJson(`https://blockchain.info/rawaddr/${encodeURIComponent(a)}?limit=0`, 15000);
    return {
      coin: "BTC",
      address: a,
      balanceSat: r.final_balance,
      balanceBtc: (r.final_balance / 1e8).toFixed(8),
      receivedSat: r.total_received,
      sentSat: r.total_sent,
      txCount: r.n_tx,
    };
  }
  if (c === "eth" || c === "ethereum") {
    if (!/^0x[a-fA-F0-9]{40}$/.test(a)) throw new Error("Invalid ETH address.");
    const r = await fetchJson(`https://api.blockcypher.com/v1/eth/main/addrs/${encodeURIComponent(a)}/balance`, 15000);
    return {
      coin: "ETH",
      address: a,
      balanceWei: r.balance,
      balanceEth: (r.balance / 1e18).toFixed(6),
      receivedEth: (r.total_received / 1e18).toFixed(6),
      sentEth: (r.total_sent / 1e18).toFixed(6),
      txCount: r.n_tx,
    };
  }
  throw new Error("Unsupported coin. Use BTC or ETH.");
}

const BATCH_HANDLERS = {
  email: async (item) => checkEmailBreaches(item),
  ip: async (item) => lookupIp(item),
  dns: async (item) => resolveDns(cleanDomain(item)),
  whois: async (item) => whoisDomain(cleanDomain(item)),
  username: async (item) => scanUsername(item),
  breach: async (item) => checkEmailBreaches(item),
  cert: async (item) => getCert(cleanDomain(item)),
  port: async (item) => scanPorts(cleanDomain(item)),
  wallet: async (item) => {
    const [coin, addr] = String(item).split(":").map((s) => s.trim());
    return walletLookup(coin || "btc", addr);
  },
};

async function batchRunner(tool, items) {
  const handler = BATCH_HANDLERS[tool];
  if (!handler) throw new Error(`Unknown batch tool: ${tool}`);
  const results = [];
  for (const item of items) {
    const raw = String(item).trim();
    if (!raw) continue;
    try {
      const data = await handler(raw);
      results.push({ query: raw, ok: true, data });
    } catch (err) {
      results.push({ query: raw, ok: false, error: err.message });
    }
  }
  return { tool, count: results.length, results };
}

module.exports = {
  EMAIL_RE,
  DOMAIN_RE,
  USERNAME_RE,
  IP_RE,
  cleanDomain,
  isIPv4,
  isIPv6,
  DNS_CHECKS,
  PLATFORMS,
  resolveDns,
  lookupIp,
  whoisDomain,
  scanUsername,
  resolveUrlChain,
  inspectHeaders,
  checkEmailBreaches,
  pwnedPassword,
  getCert,
  scanPorts,
  wayback,
  walletLookup,
  batchRunner,
  COMMON_PORTS,
};
