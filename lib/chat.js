"use strict";

const tools = require("./tools");

const SYSTEM_PROMPT =
  'You are "L", the assistant built into an OSINT and personal-security toolkit. ' +
  "You help researchers and people protecting their own privacy with two things: (1) pulling facts from public data via your tools, and (2) practical OPSEC/defense guidance. " +
  "When you use a tool, state plainly what it returned and flag anything that looks anomalous (open ports, leaked metadata, exposure). " +
  "Never invent tool output; if a tool errors, say so. Numbers from Pwned Passwords mean the password hash appears that many times in breach corpora. " +
  "For defense advice, be concrete and point to the Downloads page (Mullvad/ProtonVPN, Tor Browser, uBlock Origin, password managers, HIBP, data-removal services). " +
  "Keep answers concise and technical. You may refuse requests to aid harassment, doxing of private individuals for stalking, or illegal activity; otherwise help within the law and public records. " +
  "Always note that findings must be independently verified before they are relied on.";

const str = (desc, props, required) => ({
  type: "function",
  function: { name: props.name, description: desc, parameters: { type: "object", properties: props.schema, required } },
});

const TOOL_DEFS = [
  str("Check whether an email appears in known data breaches.", { name: "email_lookup", schema: { email: { type: "string", description: "email address" } } }, ["email"]),
  str("Geolocate an IP address (country, city, ISP, ASN, proxy/hosting flags).", { name: "ip_lookup", schema: { ip: { type: "string", description: "IPv4 or IPv6" } } }, ["ip"]),
  str("Resolve DNS records for a domain (A, AAAA, CNAME, MX, NS, TXT, SOA, CAA).", { name: "dns_lookup", schema: { domain: { type: "string", description: "domain name" } } }, ["domain"]),
  str("Get WHOIS/RDAP registration data for a domain.", { name: "whois_lookup", schema: { domain: { type: "string", description: "domain name" } } }, ["domain"]),
  str("Check whether a username exists on ~21 platforms.", { name: "username_lookup", schema: { username: { type: "string", description: "username" } } }, ["username"]),
  str("Check a password against breach corpora (k-anonymity, safe).", { name: "pwned_password", schema: { password: { type: "string", description: "the password to check" } } }, ["password"]),
  str("Fetch the live TLS/SSL certificate for a host.", { name: "cert_lookup", schema: { host: { type: "string", description: "hostname" } } }, ["host"]),
  str("Scan common TCP ports of a host.", { name: "port_scan", schema: { host: { type: "string", description: "hostname or IP" } } }, ["host"]),
  str("Expand a short URL and trace its redirect chain.", { name: "url_analyze", schema: { url: { type: "string", description: "full URL" } } }, ["url"]),
  str("Inspect the HTTP security headers of a website.", { name: "headers_lookup", schema: { url: { type: "string", description: "full URL" } } }, ["url"]),
  str("Check a cryptocurrency address balance (BTC or ETH).", { name: "wallet_lookup", schema: { coin: { type: "string", enum: ["BTC", "ETH"] }, address: { type: "string" } } }, ["coin", "address"]),
];

const EXEC = {
  email_lookup: ({ email }) => tools.checkEmailBreaches(email),
  ip_lookup: ({ ip }) => tools.lookupIp(String(ip).trim()),
  dns_lookup: ({ domain }) => tools.resolveDns(tools.cleanDomain(domain)),
  whois_lookup: ({ domain }) => tools.whoisDomain(tools.cleanDomain(domain)),
  username_lookup: ({ username }) => tools.scanUsername(String(username).trim()),
  pwned_password: ({ password }) => tools.pwnedPassword(password),
  cert_lookup: ({ host }) => tools.getCert(tools.cleanDomain(host)),
  port_scan: ({ host }) => tools.scanPorts(tools.cleanDomain(host)),
  url_analyze: ({ url }) => tools.resolveUrlChain(String(url).replace(/^[^:]+(?::\/\/)?/, "")),
  headers_lookup: ({ url }) => tools.inspectHeaders(/^https?:\/\//i.test(url) ? url : "https://" + url),
  wallet_lookup: ({ coin, address }) => tools.walletLookup(coin, address),
};

function summarize(res) {
  try {
    return JSON.stringify(res).slice(0, 6000);
  } catch {
    return "{}";
  }
}

async function runChat(cfg, history) {
  const { apiKey, baseUrl, model } = cfg;
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

  for (let round = 0; round < 6; round++) {
    let res;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.4,
          max_tokens: 900,
          tools: TOOL_DEFS,
          tool_choice: "auto",
        }),
        signal: AbortSignal.timeout(90000),
      });
    } catch (err) {
      throw new Error("AI provider unreachable: " + err.message);
    }

    if (!res.ok) {
      let detail = "";
      try {
        const j = await res.json();
        detail = j.error && j.error.message ? j.error.message : "";
      } catch {}
      throw new Error(`AI provider returned HTTP ${res.status}${detail ? " — " + detail : ""}`);
    }

    const data = await res.json();
    const msg = data.choices[0].message;
    messages.push(msg);

    if (msg.tool_calls && msg.tool_calls.length) {
      for (const tc of msg.tool_calls) {
        let out;
        try {
          const args = JSON.parse(tc.function.arguments || "{}");
          out = { ok: true, data: await EXEC[tc.function.name](args) };
        } catch (err) {
          out = { ok: false, error: err.message };
        }
        messages.push({ role: "tool", tool_call_id: tc.id, content: summarize(out) });
      }
      continue;
    }

    return { content: msg.content || "", usage: data.usage || null, toolRounds: round };
  }

  return { content: "I couldn't finish within the tool limit. Ask something more specific.", usage: null, toolRounds: 6 };
}

module.exports = { runChat };
