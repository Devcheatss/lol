"use strict";

/* ================================================================
   Tool registry
   ================================================================ */

const TOOLS = [
  { id: "email", icon: "mail", title: "Email lookup", desc: "Mail-server (MX) status and public breach exposure for an email address.", ph: "someone@example.com", ep: "/api/email/{q}", render: renderEmail },
  { id: "ip", icon: "globe", title: "IP lookup", desc: "Geolocation, ISP / ASN, proxy flags and reverse DNS for an IPv4 or IPv6 address.", ph: "8.8.8.8", ep: "/api/ip/{q}", render: renderIp },
  { id: "dns", icon: "server", title: "DNS records", desc: "All common record types (A, AAAA, CNAME, MX, NS, TXT, SOA, CAA).", ph: "example.com", ep: "/api/dns/{q}", render: renderDns },
  { id: "whois", icon: "file", title: "WHOIS / RDAP", desc: "Registration dates, registrar, registrant and nameservers from public RDAP data.", ph: "example.com", ep: "/api/whois/{q}", render: renderWhois },
  { id: "subdomains", icon: "network", title: "Subdomains", desc: "Discover subdomains via certificate-transparency logs (crt.sh / CertSpotter).", ph: "example.com", ep: "/api/subdomains/{q}", render: renderSubdomains },
  { id: "username", icon: "user", title: "Username search", desc: "Check whether a username exists on 21 platforms. Some platforms can't be verified reliably.", ph: "username", ep: "/api/username/{q}", render: renderUsername },
  { id: "url", icon: "link", title: "URL analyzer", desc: "Expand short links and trace the full redirect chain to the final destination.", ph: "https://short.link/xyz", ep: "/api/url?u={q}", render: renderUrl },
  { id: "hash", icon: "hash", title: "Hash analyzer", desc: "Identify a hash's likely algorithm from its length and format.", ph: "e99a18c428cb38d5f260853678922e03", ep: "/api/hash?h={q}", render: renderHash },
  { id: "headers", icon: "shield", title: "HTTP headers", desc: "Inspect response headers and security posture of a website.", ph: "https://example.com", ep: "/api/headers?u={q}", render: renderHeaders },
  { id: "cidr", icon: "calc", title: "CIDR calculator", desc: "Calculate network range, usable hosts and an address sample for a CIDR block.", ph: "192.168.0.0/24", ep: "/api/cidr?cidr={q}", render: renderCidr },
  { id: "search", icon: "search", title: "Web search", desc: "Run a search term across many OSINT-friendly search engines.", ph: "\"someone@example.com\"", ep: "/api/search?q={q}", render: renderSearch },
  { id: "phone", icon: "phone", title: "Phone lookup", desc: "Parse an international phone number, country, and optional carrier info.", ph: "+14155552671", ep: "/api/phone?n={q}", render: renderPhone },
];

/* ================================================================
   SVG icon system
   ================================================================ */

const ICONS = {
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><line x1="8" x2="16" y1="12" y2="12"/><line x1="8" x2="16" y1="16" y2="16"/>',
  network: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  hash: '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="8" x2="8.01" y1="10" y2="10"/><line x1="12" x2="12.01" y1="10" y2="10"/><line x1="16" x2="16.01" y1="10" y2="10"/><line x1="8" x2="8.01" y1="14" y2="14"/><line x1="12" x2="12.01" y1="14" y2="14"/><line x1="16" x2="16.01" y1="14" y2="14"/><line x1="8" x2="8.01" y1="18" y2="18"/><line x1="12" x2="12.01" y1="18" y2="18"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  flask: '<path d="M10 2v7.31L4.5 18a2 2 0 0 0 1.75 3h11.5a2 2 0 0 0 1.75-3L14 9.31V2"/><line x1="8.5" x2="15.5" y1="2" y2="2"/><line x1="12" x2="12" y1="11" y2="14"/>',
  bot: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  tag: '<path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l8.58-8.58a1 1 0 0 0 0-1.42z"/><circle cx="7" cy="7" r="1.5"/>',
  hexagon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
  newspaper: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><line x1="12" x2="18" y1="9" y2="9"/><line x1="12" x2="18" y1="13" y2="13"/><line x1="12" x2="18" y1="17" y2="17"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  phone2: '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" x2="12.01" y1="18" y2="18"/>',
  languages: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  map: '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/>',
  plane: '<path d="M10.5 13 4 9.5 6 8l7 1.5L18 8a2.5 2.5 0 1 1 2 4l-6 1.5L14 20l-2.5.5-1-4-4-1L8 13l2.5 2.5z"/><path d="M10.5 13 14 19.5 6 15.5l4.5-2.5z"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4"/><path d="M8 6h1"/><path d="M15 6h1"/><path d="M12 6h0"/><path d="M12 10h0"/><path d="M15 10h1"/><path d="M8 10h1"/><path d="M12 14h0"/><path d="M8 14h1"/><path d="M15 14h1"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  landmark: '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  arrow: '<line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.67-.75 1.67-1.67 0-.44-.18-.83-.43-1.13-.27-.3-.44-.7-.44-1.12 0-.9.73-1.67 1.67-1.67H17a4.33 4.33 0 0 0 4.33-4.33C21.33 6.16 17.16 2 12 2z"/>',
};

const svg = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.box}</svg>`;

const CATEGORY_ICONS = {
  "Documentation / Evidence Capture": "camera",
  "OpSec": "shield",
  "Cyber Threat Intelligence": "activity",
  "Malicious File Analysis": "flask",
  "AI Tools": "bot",
  "Tools": "wrench",
  "Encoding / Decoding": "code",
  "Classifieds": "tag",
  "Blockchain & Cryptocurrency": "hexagon",
  "Disinformation & Media Verification": "newspaper",
  "Dark Web": "moon",
  "Mobile OSINT": "phone2",
  "Language Translation": "languages",
  "Archives": "archive",
  "Online Communities": "chat",
  "Search Engines": "search",
  "Geolocation Tools / Maps": "map",
  "Transportation": "plane",
  "Business Records": "building",
  "Compliance & Risk Intelligence": "scale",
  "Public Records": "landmark",
  "Telephone Numbers": "phone",
  "Dating": "heart",
  "People Search Engines": "users",
  "Instant Messaging": "message",
  "Social Networks": "share",
  "Images / Videos / Docs": "image",
  "IP & MAC Address": "network",
  "Cloud Infrastructure": "cloud",
  "Domain Name": "globe",
  "Email Address": "mail",
  "Username": "user",
};

const RELATED = {
  email: ["Email Address", "Archives"],
  ip: ["IP & MAC Address", "Geolocation Tools / Maps"],
  dns: ["Domain Name"],
  whois: ["Domain Name", "Business Records"],
  subdomains: ["Domain Name"],
  username: ["Username", "Social Networks", "People Search Engines"],
  url: ["Search Engines", "Archives"],
  hash: ["Encoding / Decoding", "Malicious File Analysis"],
  headers: ["OpSec", "Cloud Infrastructure"],
  cidr: ["IP & MAC Address", "Cloud Infrastructure"],
  search: ["Search Engines", "Archives", "Public Records"],
  phone: ["Telephone Numbers"],
};

/* ================================================================
   Small DOM helpers
   ================================================================ */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function card(title, bodyEl) {
  const c = el("div", "card");
  if (title) c.appendChild(el("h3", null, title));
  if (bodyEl) c.appendChild(bodyEl);
  return c;
}

function kv(pairs) {
  const grid = el("div", "kv");
  for (const [k, v] of pairs) {
    if (v === null || v === undefined || v === "") continue;
    grid.appendChild(el("div", "k", k));
    grid.appendChild(el("div", "v", String(v)));
  }
  return grid;
}

function list(items) {
  const ul = el("ul", "clean");
  for (const item of items) ul.appendChild(el("li", null, item));
  return ul;
}

function stateEl(cls, text) {
  return el("div", "state " + cls, text);
}

function table(columns, rows) {
  const t = el("table");
  const head = el("tr");
  for (const c of columns) head.appendChild(el("th", null, c));
  t.appendChild(head);
  for (const row of rows) {
    const tr = el("tr");
    for (const cell of row) tr.appendChild(el("td", null, cell));
    t.appendChild(tr);
  }
  return t;
}

function toast(msg, type) {
  const t = el("div", "toast " + (type || ""), msg);
  document.getElementById("toasts").appendChild(t);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 300);
  }, 3800);
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ================================================================
   Settings / preferences
   ================================================================ */

const SETTINGS_KEY = "l.settings.v1";
const THEMES = {
  default: { name: "Default", color: "#6c8bff" },
  matrix: { name: "Matrix", color: "#22c55e" },
  cyber: { name: "Cyber", color: "#22d3ee" },
  violet: { name: "Violet", color: "#a78bfa" },
  ocean: { name: "Ocean", color: "#2dd4bf" },
  ember: { name: "Ember", color: "#fb923c" },
  crimson: { name: "Crimson", color: "#f43f5e" },
  pink: { name: "Pink", color: "#ec4899" },
  synth: { name: "Synth", color: "#d946ef" },
  amber: { name: "Amber", color: "#f59e0b" },
  lime: { name: "Lime", color: "#84cc16" },
  blood: { name: "Blood", color: "#dc2626" },
  ghost: { name: "Ghost", color: "#e2e8f0" },
};

const DEFAULT_SETTINGS = {
  theme: "default",
  smooth: 50,
  type: 60,
  cursor: true,
  cursorSmooth: 50,
  boot: true,
  grid: true,
  name: "",
};

let settings = { ...DEFAULT_SETTINGS };

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    settings = { ...DEFAULT_SETTINGS, ...raw };
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

function applySettings() {
  document.documentElement.dataset.theme = settings.theme in THEMES ? settings.theme : "default";
  const ui = 0.04 + (settings.smooth / 100) * 0.42;
  const load = 0.5 + (settings.smooth / 100) * 1.2;
  document.documentElement.style.setProperty("--ui-time", ui.toFixed(3) + "s");
  document.documentElement.style.setProperty("--load-time", load.toFixed(3) + "s");
  const grid = document.querySelector(".bg-grid");
  if (grid) grid.classList.toggle("hidden", !settings.grid);
  document.querySelectorAll(".cursor").forEach((c) => c.classList.toggle("hidden", !settings.cursor));
  applyProfile();
}

function applyProfile() {
  const ue = document.getElementById("user-email");
  if (!ue) return;
  const name = (settings.name || "").trim();
  ue.textContent = name || ue.dataset.email || "";
  const av = document.getElementById("user-avatar");
  if (av) {
    const first = (name || ue.dataset.email || "?").trim()[0] || "?";
    av.textContent = first.toUpperCase();
  }
}

function sSlider(key, min, max) {
  const input = document.createElement("input");
  input.type = "range";
  input.className = "range";
  input.min = String(min);
  input.max = String(max);
  input.value = String(settings[key]);
  return input;
}

function sToggle(key) {
  const t = document.createElement("button");
  t.type = "button";
  t.className = "switch" + (settings[key] ? " on" : "");
  t.addEventListener("click", () => {
    settings[key] = !settings[key];
    t.classList.toggle("on", settings[key]);
    saveSettings();
    applySettings();
  });
  return t;
}

function sRow(name, hint, ctrl) {
  const row = el("div", "s-row");
  const info = el("div", "s-info");
  info.appendChild(el("div", "s-name", name));
  info.appendChild(el("div", "s-hint", hint));
  row.appendChild(info);
  row.appendChild(ctrl);
  return row;
}

function themeCard() {
  const card = el("div", "s-card");
  const head = el("h2", null, "");
  const ico = el("span", "s-ico");
  ico.innerHTML = svg("palette");
  head.appendChild(ico);
  head.appendChild(el("span", null, "Themes"));
  card.appendChild(head);
  card.appendChild(el("p", "s-sub", "Accent color for the whole interface. Apply instantly."));

  const sw = el("div", "swatches");
  for (const [id, t] of Object.entries(THEMES)) {
    const b = el("button", "swatch" + (settings.theme === id ? " active" : ""));
    b.dataset.theme = id;
    b.style.setProperty("--sw", t.color);
    b.innerHTML = `<span class="sw-dot"></span><span>${t.name}</span>`;
    b.addEventListener("click", () => {
      settings.theme = id;
      saveSettings();
      applySettings();
      sw.querySelectorAll(".swatch").forEach((x) => x.classList.toggle("active", x.dataset.theme === id));
    });
    sw.appendChild(b);
  }
  card.appendChild(sw);
  return card;
}

function smoothCard() {
  const card = el("div", "s-card");
  const head = el("h2", null, "");
  const ico = el("span", "s-ico");
  ico.innerHTML = svg("activity");
  head.appendChild(ico);
  head.appendChild(el("span", null, "Feel"));
  card.appendChild(head);
  card.appendChild(el("p", "s-sub", "Animation speed, typing speed, and the cursor."));

  const ui = sSlider("smooth", 0, 100);
  ui.addEventListener("input", () => {
    settings.smooth = Number(ui.value);
    saveSettings();
    applySettings();
  });
  card.appendChild(sRow("Smoothness", "How fluid menus and transitions are", ui));

  const tp = sSlider("type", 0, 100);
  tp.addEventListener("input", () => {
    settings.type = Number(tp.value);
    saveSettings();
  });
  card.appendChild(sRow("Typing speed", "Home screen typewriter speed", tp));

  const cs = sSlider("cursorSmooth", 0, 100);
  cs.addEventListener("input", () => {
    settings.cursorSmooth = Number(cs.value);
    saveSettings();
  });
  card.appendChild(sRow("Cursor lag", "How much the ring trails the dot", cs));

  card.appendChild(sRow("Custom cursor", "Smooth dot + ring instead of the OS cursor", sToggle("cursor")));
  card.appendChild(sRow("Boot screen", "Loading overlay after sign-in", sToggle("boot")));
  card.appendChild(sRow("Grid backdrop", "Background grid pattern", sToggle("grid")));

  const reset = el("button", "btn-ghost", "Reset to defaults");
  reset.type = "button";
  reset.addEventListener("click", () => {
    settings = { ...DEFAULT_SETTINGS };
    saveSettings();
    applySettings();
    renderSettings();
    toast("Settings reset.", "ok");
  });
  card.appendChild(reset);
  return card;
}

function profileCard() {
  const card = el("div", "s-card");
  const head = el("h2", null, "");
  const ico = el("span", "s-ico");
  ico.innerHTML = svg("user");
  head.appendChild(ico);
  head.appendChild(el("span", null, "Profile"));
  card.appendChild(head);
  card.appendChild(el("p", "s-sub", "Display name used across the app. Stored on this device."));

  const form = el("form", "s-form");
  form.innerHTML =
    `<div class="field"><label for="s-name">Display name</label>` +
    `<input type="text" id="s-name" maxlength="40" autocomplete="nickname" spellcheck="false" /></div>` +
    `<div class="s-btn-row"><button type="submit" class="btn-primary">Save</button></div>` +
    `<div class="s-msg" id="s-name-msg"></div>`;
  form.querySelector("#s-name").value = settings.name;
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    settings.name = form.querySelector("#s-name").value.trim().slice(0, 40);
    saveSettings();
    applyProfile();
    toast("Profile updated.", "ok");
  });
  card.appendChild(form);
  return card;
}

function accountCard() {
  const card = el("div", "s-card");
  const head = el("h2", null, "");
  const ico = el("span", "s-ico");
  ico.innerHTML = svg("lock");
  head.appendChild(ico);
  head.appendChild(el("span", null, "Account"));
  card.appendChild(head);
  card.appendChild(el("p", "s-sub", "Sign-in details for this account."));

  const emailBox = el("div", "s-email-now");
  emailBox.textContent = "Signed in as " + sessionEmail;
  card.appendChild(emailBox);

  const emailForm = el("form", "s-form");
  emailForm.innerHTML =
    `<div class="field"><label for="s-new-email">Change email</label><input type="email" id="s-new-email" autocomplete="email" /></div>` +
    `<div class="field"><label for="s-email-pass">Password</label><input type="password" id="s-email-pass" autocomplete="current-password" /></div>` +
    `<div class="s-btn-row"><button type="submit" class="btn-primary">Change email</button></div>` +
    `<div class="s-msg" id="s-email-msg"></div>`;
  emailForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const msg = emailForm.querySelector("#s-email-msg");
    msg.className = "s-msg";
    msg.textContent = "";
    const newEmail = emailForm.querySelector("#s-new-email").value.trim().toLowerCase();
    const password = emailForm.querySelector("#s-email-pass").value;
    if (!emailRe.test(newEmail)) {
      msg.className = "s-msg error";
      msg.textContent = "Enter a valid email address.";
      return;
    }
    msg.textContent = "Updating…";
    try {
      const r = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, password }),
      });
      const j = await r.json();
      if (j.ok) {
        sessionEmail = j.email;
        emailBox.textContent = "Signed in as " + sessionEmail;
        const ue = document.getElementById("user-email");
        if (ue) ue.dataset.email = sessionEmail;
        applyProfile();
        msg.className = "s-msg ok";
        msg.textContent = "Email changed.";
        emailForm.reset();
        toast("Email updated to " + sessionEmail, "ok");
      } else {
        msg.className = "s-msg error";
        msg.textContent = j.error || "Failed.";
      }
    } catch (err) {
      msg.className = "s-msg error";
      msg.textContent = "Network error.";
    }
  });
  card.appendChild(emailForm);

  const pwForm = el("form", "s-form");
  pwForm.innerHTML =
    `<div class="field"><label for="s-cur-pass">Current password</label><input type="password" id="s-cur-pass" autocomplete="current-password" /></div>` +
    `<div class="field"><label for="s-new-pass">New password <span class="hint">min 8 characters</span></label><input type="password" id="s-new-pass" minlength="8" autocomplete="new-password" /></div>` +
    `<div class="s-btn-row"><button type="submit" class="btn-primary">Change password</button></div>` +
    `<div class="s-msg" id="s-pass-msg"></div>`;
  pwForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const msg = pwForm.querySelector("#s-pass-msg");
    msg.className = "s-msg";
    msg.textContent = "";
    const current = pwForm.querySelector("#s-cur-pass").value;
    const next = pwForm.querySelector("#s-new-pass").value;
    if (next.length < 8) {
      msg.className = "s-msg error";
      msg.textContent = "New password must be at least 8 characters.";
      return;
    }
    msg.textContent = "Updating…";
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const j = await r.json();
      if (j.ok) {
        msg.className = "s-msg ok";
        msg.textContent = "Password changed.";
        pwForm.reset();
        toast("Password updated.", "ok");
      } else {
        msg.className = "s-msg error";
        msg.textContent = j.error || "Failed.";
      }
    } catch (err) {
      msg.className = "s-msg error";
      msg.textContent = "Network error.";
    }
  });
  card.appendChild(pwForm);
  return card;
}

function renderSettings() {
  setPageTitle("Settings");
  setStatus("ok");
  const view = document.getElementById("page-view");
  view.classList.remove("hidden");
  view.innerHTML = "";
  const frag = document.createDocumentFragment();

  const hero = el("div", "page-hero");
  const pageIco = el("div", "page-ico");
  pageIco.innerHTML = svg("gear");
  hero.appendChild(pageIco);
  const heroText = el("div");
  heroText.appendChild(el("h1", null, "Settings"));
  heroText.appendChild(el("p", null, "Make L yours — themes, smoothness, and your profile. Changes save instantly."));
  hero.appendChild(heroText);
  frag.appendChild(hero);

  const grid = el("div", "s-grid");
  grid.appendChild(themeCard());
  grid.appendChild(smoothCard());
  grid.appendChild(profileCard());
  grid.appendChild(accountCard());
  frag.appendChild(grid);
  view.appendChild(frag);
  view.scrollTop = 0;
}

loadSettings();
applySettings();

/* ================================================================
   Animated cursor
   ================================================================ */

(function initCursor() {
  const dot = document.getElementById("cursor-dot");
  const ring = document.getElementById("cursor-ring");
  let mx = innerWidth / 2, my = innerHeight / 2;
  let dx = mx, dy = my, rx = mx, ry = my;
  let down = false;

  document.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
  document.addEventListener("mousedown", () => { down = true; });
  document.addEventListener("mouseup", () => { down = false; });

  (function loop() {
    const dotF = 0.55 - (settings.cursorSmooth / 100) * 0.37;
    const ringF = 0.22 - (settings.cursorSmooth / 100) * 0.17;
    dx += (mx - dx) * dotF; dy += (my - dy) * dotF;
    rx += (mx - rx) * ringF; ry += (my - ry) * ringF;
    const s = down ? 0.85 : 1;
    dot.style.transform = `translate(${dx}px,${dy}px) translate(-50%,-50%) scale(${s})`;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%) scale(${s})`;
    requestAnimationFrame(loop);
  })();

  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("a, button, input, select, textarea, label");
    document.body.classList.toggle("cursor-hover", Boolean(t));
  });
})();

/* ================================================================
   Shell chrome — drawer, home screen, smooth typing
   ================================================================ */

const sidebar = document.getElementById("sidebar");
const scrim = document.getElementById("scrim");
const menuBtn = document.getElementById("menu-btn");
const crumbHome = document.getElementById("crumb-home");

function openSidebar() {
  sidebar.classList.add("open");
  scrim.classList.add("show");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  scrim.classList.remove("show");
}
function toggleSidebar() {
  if (sidebar.classList.contains("open")) closeSidebar();
  else openSidebar();
}

menuBtn.addEventListener("click", toggleSidebar);
scrim.addEventListener("click", closeSidebar);
crumbHome.addEventListener("click", () => renderHome());

document.addEventListener("keydown", (ev) => {
  if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
  if (ev.key === "Escape") { closeSidebar(); return; }
  if (ev.key === "1" || ev.key === "2" || ev.key === "3" || ev.key === "4") {
    ev.preventDefault();
    switchPage(Number(ev.key));
  }
});

const typedLines = [
  "Find anything. Leave no trace.",
  "Email · IP · DNS · WHOIS · subdomains · usernames · hashes…",
  "Then harden every account.",
  "Know the manual. Beat the dossier.",
];
function startTyping(node) {
  if (!node) return;
  const m = 1.4 - (settings.type / 100) * 1.05;
  let line = 0, pos = 0, deleting = false;
  function tick() {
    const text = typedLines[line % typedLines.length];
    if (!deleting) {
      pos++;
      node.textContent = text.slice(0, pos);
      if (pos === text.length) { deleting = true; return setTimeout(tick, 2000 * m); }
      return setTimeout(tick, (26 + Math.random() * 40) * m);
    }
    pos--;
    node.textContent = text.slice(0, pos);
    if (pos === 0) { deleting = false; line++; }
    return setTimeout(tick, 14 * m);
  }
  tick();
}

function renderHome() {
  const content = document.getElementById("content");
  const old = document.getElementById("home-view");
  if (old) old.remove();
  document.querySelectorAll(".tool").forEach((s) => s.classList.add("hidden"));
  const pv = document.getElementById("page-view");
  if (pv) pv.classList.add("hidden");
  menuBtn.classList.remove("hidden");
  closeSidebar();
  setPageActive(1);
  setPageTitle("Home");
  setStatus("ok");

  const hero = el("section", "tool home");
  hero.id = "home-view";
  hero.innerHTML =
    `<div class="home-hero">` +
      `<div class="home-mark">L</div>` +
      `<h1>Open-source intelligence toolkit</h1>` +
      `<div class="typed-wrap"><span class="typed" id="typed-line"></span></div>` +
    `</div>` +
    `<div class="home-grid" id="home-grid"></div>`;
  content.appendChild(hero);

  const grid = hero.querySelector("#home-grid");
  TOOLS.forEach((t) => {
    const c = el("button", "home-card");
    c.innerHTML = `<span class="hc-ico">${svg(t.icon)}</span><h3>${t.title}</h3><p>${t.desc}</p><span class="hc-tag">tool</span>`;
    c.addEventListener("click", () => switchTool(t.id));
    grid.appendChild(c);
  });
  const pages = [
    ["learn", "Field Manual", "OPSEC · OSINT · CSINT · EDR · doxing · threat modeling", "2", "book"],
    ["protect", "Hardening Guide", "Attack surface · lock down · remove data · clear your name", "3", "shield"],
    ["settings", "Settings", "Themes · smoothness · cursor · profile", "4", "gear"],
  ];
  for (const [id, title, desc, tag, icon] of pages) {
    const c = el("button", "home-card page-card");
    c.innerHTML = `<span class="hc-ico">${svg(icon)}</span><h3>${title}</h3><p>${desc}</p><span class="hc-tag">page ${tag}</span>`;
    c.addEventListener("click", () => switchPage(Number(tag)));
    grid.appendChild(c);
  }

  startTyping(hero.querySelector("#typed-line"));
}

/* ================================================================
   Typed inputs — smooth per-character animation
   ================================================================ */

function makeTyped(input) {
  if (!input || input.dataset.typed) return;
  input.dataset.typed = "1";

  const wrap = document.createElement("div");
  wrap.className = "ti-wrap";
  const overlay = document.createElement("div");
  overlay.className = "ti-overlay";
  const textEl = document.createElement("div");
  textEl.className = "ti-text";
  const caret = document.createElement("span");
  caret.className = "ti-caret";
  caret.style.display = "none";

  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(overlay);
  overlay.appendChild(textEl);
  overlay.appendChild(caret);
  wrap.appendChild(input);
  input.classList.add("ti-hidden");

  const cs = getComputedStyle(input);
  overlay.style.boxSizing = "border-box";
  overlay.style.border = cs.borderTopWidth + " solid transparent";
  overlay.style.padding = cs.padding;
  overlay.style.fontFamily = cs.fontFamily;
  overlay.style.fontSize = cs.fontSize;
  overlay.style.fontWeight = cs.fontWeight;
  overlay.style.letterSpacing = cs.letterSpacing;

  let lastLen = input.value.length;
  let cw = parseFloat(cs.fontSize) * 0.6;
  const padLeft = parseFloat(cs.paddingLeft) || 0;

  function render() {
    const v = input.value;
    const glyph = input.type === "password" ? "●" : null;
    const shown = glyph ? glyph.repeat(v.length) : v;
    const caretAt = input.selectionStart == null ? v.length : Math.min(input.selectionStart, v.length);
    const parts = [];
    for (let i = 0; i < shown.length; i++) {
      const isNew = i >= lastLen;
      const st = isNew ? ` style="animation-delay:${Math.min((i - lastLen) * 22, 420)}ms"` : "";
      parts.push(`<span class="ti-char${isNew ? " ti-in" : ""}"${st}>${esc(shown[i])}</span>`);
    }
    textEl.innerHTML = parts.join("");

    const first = textEl.firstElementChild;
    if (first) cw = first.offsetWidth;
    if (document.activeElement === input) {
      caret.style.display = "";
      caret.style.left = padLeft + caretAt * cw + "px";
    } else {
      caret.style.display = "none";
    }
    overlay.scrollLeft = input.scrollLeft;
    lastLen = v.length;
  }

  ["input", "keyup", "keydown", "click", "select", "focus", "blur", "scroll"].forEach((ev) =>
    input.addEventListener(ev, render, { passive: true })
  );
  render();
}

function initTypedInputs() {
  const sel = 'input[type="text"], input[type="search"], input[type="email"], input[type="password"]';
  document.querySelectorAll(sel).forEach(makeTyped);
  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (!(n instanceof Element)) continue;
        if (n.matches && n.matches(sel)) makeTyped(n);
        if (n.querySelectorAll) n.querySelectorAll(sel).forEach(makeTyped);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

/* ================================================================
   Auth
   ================================================================ */

const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");
let sessionEmail = "";

function showAuth() {
  appView.classList.add("hidden");
  authView.classList.remove("hidden");
}
function runBoot(next) {
  if (!settings.boot) {
    if (next) next();
    return;
  }
  const boot = document.getElementById("boot-load");
  const msg = document.getElementById("boot-msg");
  const msgs = ["Booting toolkit…", "Loading modules…", "Compiling index…", "Warming caches…"];
  let i = 0;
  boot.classList.remove("hidden");
  const iv = setInterval(() => {
    i = (i + 1) % msgs.length;
    msg.textContent = msgs[i];
  }, 420);
  setTimeout(() => {
    clearInterval(iv);
    boot.classList.add("out");
    setTimeout(() => {
      boot.classList.add("hidden");
      boot.classList.remove("out");
    }, 450);
    if (next) next();
  }, 1500);
}

function showApp(email) {
  sessionEmail = email;
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  const ue = document.getElementById("user-email");
  ue.dataset.email = email;
  ue.textContent = (settings.name || "").trim() || email;
  const av = document.getElementById("user-avatar");
  av.textContent = (((settings.name || "").trim()[0]) || email[0] || "?").toUpperCase();
  runBoot(() => {
    setPageActive(1);
    renderHome();
    toast("Welcome back, " + email, "ok");
  });
}

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const formLogin = document.getElementById("form-login");
const formRegister = document.getElementById("form-register");

function setAuthTab(which) {
  const login = which === "login";
  tabLogin.classList.toggle("active", login);
  tabRegister.classList.toggle("active", !login);
  formLogin.classList.toggle("hidden", !login);
  formRegister.classList.toggle("hidden", login);
}
tabLogin.addEventListener("click", () => setAuthTab("login"));
tabRegister.addEventListener("click", () => setAuthTab("register"));

formLogin.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-pass").value;
  const msg = formLogin.querySelector(".form-msg");
  msg.className = "form-msg"; msg.textContent = "";

  if (!emailRe.test(email) || !password) {
    msg.className = "form-msg error"; msg.textContent = "Enter your email and password.";
    return;
  }
  msg.className = "form-msg info"; msg.textContent = "Signing in…";

  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json().catch(() => ({}));
  if (j.ok) {
    showApp(j.email);
    toast("Welcome back, " + j.email, "ok");
  } else {
    msg.className = "form-msg error"; msg.textContent = j.error || "Login failed.";
  }
});

/* register */
const regEmail = document.getElementById("reg-email");
const btnSendCode = document.getElementById("btn-send-code");
const regCode = document.getElementById("reg-code");
const regPass = document.getElementById("reg-pass");
const regPass2 = document.getElementById("reg-pass2");
const btnRegister = document.getElementById("btn-register");
const regMsg = formRegister.querySelector(".form-msg");

let resendTimer = null;
function startResendCountdown() {
  let s = 60;
  btnSendCode.disabled = true;
  resendTimer = setInterval(() => {
    s -= 1;
    btnSendCode.textContent = "Resend in " + s + "s";
    if (s <= 0) {
      clearInterval(resendTimer);
      btnSendCode.disabled = false;
      btnSendCode.textContent = "Send code";
    }
  }, 1000);
}

btnSendCode.addEventListener("click", async () => {
  const email = regEmail.value.trim().toLowerCase();
  regMsg.className = "form-msg"; regMsg.textContent = "";
  if (!emailRe.test(email)) {
    regMsg.className = "form-msg error"; regMsg.textContent = "Enter a valid email address first.";
    return;
  }
  btnSendCode.disabled = true;
  btnSendCode.textContent = "Sending…";

  const r = await fetch("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const j = await r.json().catch(() => ({}));

  if (j.ok) {
    regMsg.className = "form-msg ok";
    regMsg.textContent = j.sent
      ? "Code sent to " + email + "."
      : "Dev mode: your code is " + j.devCode + " (shown because SMTP isn't configured).";
    regCode.disabled = false;
    regPass.disabled = false;
    regPass2.disabled = false;
    btnRegister.disabled = false;
    regCode.focus();
    startResendCountdown();
  } else {
    regMsg.className = "form-msg error";
    regMsg.textContent = j.error || "Failed to send code.";
    btnSendCode.disabled = false;
    btnSendCode.textContent = "Send code";
  }
});

formRegister.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const email = regEmail.value.trim().toLowerCase();
  const code = regCode.value.trim();
  const password = regPass.value;
  const password2 = regPass2.value;

  regMsg.className = "form-msg"; regMsg.textContent = "";
  if (password !== password2) {
    regMsg.className = "form-msg error"; regMsg.textContent = "Passwords do not match.";
    return;
  }
  if (password.length < 8) {
    regMsg.className = "form-msg error"; regMsg.textContent = "Password must be at least 8 characters.";
    return;
  }

  const r = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, password }),
  });
  const j = await r.json().catch(() => ({}));
  if (j.ok) {
    showApp(j.email);
    toast("Account created — welcome!", "ok");
  } else {
    regMsg.className = "form-msg error";
    regMsg.textContent = j.error || "Registration failed.";
  }
});

document.getElementById("btn-logout").addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  showAuth();
  setAuthTab("login");
  formLogin.reset();
  formRegister.reset();
  toast("Logged out.");
});

/* ================================================================
   App shell
   ================================================================ */

const pageTitle = document.getElementById("page-title");
const pageStatus = document.getElementById("page-status");

function setPageTitle(text) {
  pageTitle.textContent = text;
  document.title = text + " — L";
}

function setStatus(state) {
  pageStatus.classList.remove("running", "error");
  if (state) pageStatus.classList.add(state);
  const map = { running: "working", error: "failed", ok: "ready" };
  document.getElementById("status-text").textContent = map[state] || "ready";
}

function siteGrid(sites) {
  const grid = el("div", "engine-grid");
  for (const s of sites) {
    const a = el("a", null, "");
    a.appendChild(el("span", null, s.name));
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.title = s.note || s.url;
    a.appendChild(el("span", "ext", s.note || s.url.replace(/^https?:\/\//, "")));
    const arrow = el("span", "ext-arrow");
    arrow.innerHTML = svg("arrow");
    a.appendChild(arrow);
    grid.appendChild(a);
  }
  return grid;
}

function buildShell() {
  const nav = document.getElementById("nav");
  const content = document.getElementById("content");

  const navLabel = (text) => {
    const d = el("div", "nav-label", text);
    nav.appendChild(d);
  };

  navLabel("Tools");
  TOOLS.forEach((t, i) => {
    const b = el("button", "nav-item" + (i === 0 ? " active" : ""));
    b.dataset.kind = "tool";
    b.dataset.tool = t.id;
    b.innerHTML = `<span class="ico">${svg(t.icon)}</span>${t.title}`;
    b.addEventListener("click", () => switchTool(t.id));
    nav.appendChild(b);

    const section = el("section", "tool" + (i === 0 ? "" : " hidden"));
    section.id = "tool-" + t.id;
    section.innerHTML =
      `<h2><span class="ico">${svg(t.icon)}</span>${t.title}</h2>` +
      `<p class="desc">${t.desc}</p>` +
      `<form class="qform"><input class="q" type="text" placeholder="${t.ph}" autocomplete="off" spellcheck="false" /><button class="go" type="submit">Run</button></form>` +
      `<div class="results"></div>` +
      `<div class="related"></div>`;

    const related = section.querySelector(".related");
    const cats = (RELATED[t.id] || [])
      .map((name) => DIRECTORY.find((c) => c.category === name))
      .filter(Boolean);
    if (cats.length) {
      const rc = card("Related resources", null);
      const grid = el("div", "engine-grid");
      for (const cat of cats) {
        const a = el("a", null, "");
        const name = el("span", null, cat.category);
        a.appendChild(name);
        a.href = "#";
        a.addEventListener("click", (ev) => {
          ev.preventDefault();
          renderCategory(cat);
        });
        a.appendChild(el("span", "ext", cat.sites.length + " links"));
        const arrow = el("span", "ext-arrow");
        arrow.innerHTML = svg("arrow");
        a.appendChild(arrow);
        grid.appendChild(a);
      }
      rc.appendChild(grid);
      related.appendChild(rc);
    }

    content.appendChild(section);
  });

  const pageView = el("div", "page-view hidden");
  pageView.id = "page-view";
  content.appendChild(pageView);

  content.addEventListener("submit", async (ev) => {
    const form = ev.target.closest(".qform");
    if (!form) return;
    ev.preventDefault();

    const input = form.querySelector(".q");
    const raw = input.value.trim();
    if (!raw) return;

    const tool = TOOLS.find((t) => t.id === form.closest(".tool").id.replace("tool-", ""));
    const url = tool.ep.replace("{q}", encodeURIComponent(raw));
    const go = form.querySelector(".go");
    go.disabled = true;
    setStatus("running");

    setResults(form, stateEl("loading", "Querying public data sources…"));

    try {
      const r = await fetch(url);
      if (r.status === 401) {
        showAuth();
        toast("Session expired — please log in again.", "error");
        return;
      }
      const j = await r.json();
      if (!j.ok) {
        setStatus("error");
        setResults(form, stateEl("error", (j.error || "Request failed") + (j.detail ? " — " + j.detail : "")));
        return;
      }
      setStatus("ok");
      setResults(form, tool.render(j.data));
    } catch (err) {
      setStatus("error");
      setResults(form, stateEl("error", "Network error: " + err.message));
    } finally {
      go.disabled = false;
    }
  });
}

function setActiveNav(kind, id) {
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.kind === kind && b.dataset.tool === id);
  });
}

let currentToolId = "email";
function switchTool(id) {
  currentToolId = id;
  const pv = document.getElementById("page-view");
  if (pv) pv.classList.add("hidden");
  menuBtn.classList.remove("hidden");
  closeSidebar();
  document.querySelectorAll(".tool").forEach((s) => {
    const show = s.id === "tool-" + id;
    s.classList.toggle("hidden", !show);
    if (show) {
      s.style.animation = "none";
      void s.offsetWidth;
      s.style.animation = "";
    }
  });
  setActiveNav("tool", id);
  setPageActive(1);
  const tool = TOOLS.find((t) => t.id === id);
  if (tool) {
    setPageTitle(tool.title);
    setStatus("ok");
  }
}

function renderCategory(cat) {
  const content = document.getElementById("content");
  document.querySelectorAll(".tool").forEach((s) => s.classList.add("hidden"));
  const old = document.getElementById("category-view");
  if (old) old.remove();
  const view = el("section", "tool");
  view.id = "category-view";
  view.innerHTML =
    `<h2><span class="ico">${svg(CATEGORY_ICONS[cat.category] || "box")}</span>${cat.category}</h2>` +
    `<p class="desc">Curated public-resource links for this category — opens in a new tab.</p>` +
    `<input class="q rfilter" type="text" placeholder="Filter ${cat.category}…" autocomplete="off" spellcheck="false" />` +
    `<div class="results"></div>`;

  const results = view.querySelector(".results");
  const filter = view.querySelector(".rfilter");
  const render = (term) => {
    const t = (term || "").toLowerCase();
    const sites = cat.sites.filter(
      (s) => !t || (s.name + " " + s.url + " " + (s.note || "")).toLowerCase().includes(t)
    );
    results.innerHTML = "";
    if (!sites.length) {
      results.appendChild(el("div", "state", "No matches."));
      return;
    }
    results.appendChild(siteGrid(sites));
  };
  filter.addEventListener("input", () => render(filter.value));
  render("");
  content.appendChild(view);
  setPageActive(1);
  const pv = document.getElementById("page-view");
  if (pv) pv.classList.add("hidden");
  menuBtn.classList.remove("hidden");
  setPageTitle(cat.category);
  setStatus("ok");
}

function setResults(form, node) {
  const box = form.parentElement.querySelector(".results");
  box.innerHTML = "";
  if (node) box.appendChild(node);
}

/* ================================================================
   Page navigation (pager 1 / 2 / 3)
   ================================================================ */

let currentPage = 1;

function setPageActive(n) {
  currentPage = n;
  document.querySelectorAll(".pager button").forEach((b) => {
    b.classList.toggle("active", Number(b.dataset.page) === n);
  });
}

function switchPage(n) {
  setPageActive(n);
  const view = document.getElementById("page-view");
  if (n === 1) {
    document.querySelectorAll(".tool").forEach((s) => s.classList.add("hidden"));
    if (view) view.classList.add("hidden");
    renderHome();
    return;
  }
  closeSidebar();
  menuBtn.classList.add("hidden");
  document.querySelectorAll(".tool").forEach((s) => s.classList.add("hidden"));
  if (n === 4) {
    renderSettings();
    return;
  }
  renderPage(n === 2 ? "learn" : "protect");
}

const pagerBtns = document.querySelectorAll(".pager button");
pagerBtns.forEach((b) => b.addEventListener("click", () => switchPage(Number(b.dataset.page))));

/* ================================================================
   Learn / Protect pages (2 and 3)
   ================================================================ */

const PAGES = {
  learn: {
    title: "Field Manual",
    tag: "page-2",
    intro: "The baseline: how open-source intelligence actually works, what the acronyms mean, and how the attack-and-defense game is played.",
    sections: [
      {
        t: "OPSEC",
        ic: "shield",
        html: "<p><strong>Operational security</strong> is a mindset, not a tool. It is the process of protecting information that an adversary could use against you — your movements, habits, accounts, real identity.</p>" +
          "<ul><li><strong>Attack surface</strong> — everything about you that is publicly discoverable: usernames, email, photos, location tags, past breaches.</li>" +
          "<li><strong>Need to know</strong> — share only what the situation requires. Anything you post can be captured and kept forever.</li>" +
          "<li><strong>Compartmentalization</strong> — separate your online identities so that compromising one does not reveal the rest.</li>" +
          "<li><strong>Assume collection</strong> — plan as if everything you do is recorded, because most of it is.</li></ul>" +
          "<p>OPSEC is why investigators separate burner accounts, use aliases, and keep personal and work lives isolated.</p>",
      },
      {
        t: "OSINT",
        ic: "search",
        html: "<p><strong>Open-Source Intelligence</strong> is information gathered from public sources — websites, social media, government records, technical data — then analyzed for a purpose.</p>" +
          "<ul><li><strong>Legal and passive</strong> — OSINT uses information that is already public. Active intrusions or social engineering are <em>not</em> OSINT.</li>" +
          "<li><strong>The workflow</strong> — collection → processing → analysis → reporting. Tools only help with collection; the thinking matters more.</li>" +
          "<li><strong>Techniques</strong> — search dorks, certificate-transparency logs, DNS and WHOIS records, metadata, reverse-image search, username correlation.</li>" +
          "<li><strong>Sources</strong> — search engines, archives, government registries, breach disclosures, social platforms, tech feeds.</li></ul>" +
          "<p>This whole toolkit exists to run OSINT lookups: MX records, RDAP, CT logs, headers, and more.</p>",
      },
      {
        t: "CSINT",
        ic: "activity",
        html: "<p><strong>Cyber Signal Intelligence</strong> is the technical side of intelligence collection — the automated monitoring of signals and telemetry instead of human-readable content.</p>" +
          "<ul><li><strong>Indicators of Compromise (IOCs)</strong> — hashes, domains, IPs and filenames tied to malicious activity. Pivoting on one IOC often reveals infrastructure for many campaigns.</li>" +
          "<li><strong>Feeds and telemetry</strong> — threat-intel feeds, honeypot logs, DNS sinkholes and endpoint telemetry feed CSINT pipelines.</li>" +
          "<li><strong>Attribution</strong> — linking campaigns to actors by infrastructure reuse, timing and tradecraft. Usually probabilistic, rarely certain.</li></ul>" +
          "<p>Practically: this is where hash pivoting, malware sandboxing and domain-reputation checks fit.</p>",
      },
      {
        t: "Cyber security fundamentals",
        ic: "wrench",
        html: "<p>The core concepts that everything else builds on:</p>" +
          "<ul><li><strong>CIA triad</strong> — Confidentiality (only authorized eyes), Integrity (data not altered), Availability (services stay up). Every control serves one of these.</li>" +
          "<li><strong>Defense in depth</strong> — layers: account security, OS hardening, browser hygiene, network filtering, monitoring. No single control is enough.</li>" +
          "<li><strong>Social engineering</strong> — most breaches start with a person, not a vulnerability. Phishing, vishing, pretexting.</li>" +
          "<li><strong>Patching</strong> — the #1 practical defense. Most exploited flaws are old and already patched.</li></ul>",
      },
      {
        t: "EDR",
        ic: "shield",
        html: "<p><strong>Endpoint Detection and Response</strong> is the modern replacement for classic antivirus — it watches what processes <em>do</em>, not just what files are known-bad.</p>" +
          "<ul><li><strong>Telemetry</strong> — every process start, network connection, file write and registry change is recorded on the endpoint.</li>" +
          "<li><strong>Behavioral detection</strong> — instead of signatures, EDR flags suspicious sequences: a document spawning PowerShell, mimikatz-style memory access, unusual lateral movement.</li>" +
          "<li><strong>Response</strong> — on alert, the team can isolate the machine, kill processes, and roll back changes — remotely.</li>" +
          "<li><strong>AV vs EDR vs XDR</strong> — AV blocks known files. EDR detects behavior on one machine. XDR correlates across endpoints, network and cloud.</li>" +
          "<li><strong>Examples</strong> — Microsoft Defender for Endpoint, CrowdStrike Falcon, SentinelOne; open-source: Wazuh, Osquery, Velociraptor.</li></ul>",
      },
      {
        t: "SOCMINT",
        ic: "share",
        html: "<p><strong>Social-Media Intelligence</strong> is OSINT applied to social platforms: profiling people and organizations from what they publish.</p>" +
          "<ul><li><strong>Correlation</strong> — a username, avatar or email ties accounts together across platforms.</li>" +
          "<li><strong>Geolocation</strong> — EXIF data, check-ins, background landmarks and tagged locations leak where someone really is.</li>" +
          "<li><strong>Behavioral patterns</strong> — posting times, contacts and interests paint a profile even when no sensitive fact is shared.</li>" +
          "<li><strong>Ethics and law</strong> — being observable is not consent to be harassed. SOCMINT in investigations must respect privacy law and platform terms.</li></ul>",
      },
      {
        t: "Doxing",
        ic: "user",
        html: "<p><strong>Doxing</strong> (dropping docs) is researching a person's real identity and private information — address, phone, family, workplace — from public sources, usually to harass, threaten or intimidate.</p>" +
          "<ul><li><strong>How it happens</strong> — unique usernames, breach dumps, WHOIS on personal domains, EXIF on photos, posts with geo-tags, social friend graphs, public records.</li>" +
          "<li><strong>The typical chain</strong> — username → email → breached password/email → more accounts → phone → address → family.</li>" +
          "<li><strong>Why it works</strong> — most people reuse usernames and emails, post identifiable photos, and never search their own name.</li>" +
          "<li><strong>Legality</strong> — doxing is usually harassment and often illegal. Publishing someone's private data to cause harm can be criminal and civilly liable. Understanding it is defense, not permission.</li></ul>" +
          "<p>Page 3 is the counterplay — how to make that chain break at every step.</p>",
      },
      {
        t: "Threat modeling",
        ic: "box",
        html: "<p>Before defending anything, define the threat:</p>" +
          "<ul><li><strong>Who</strong> — random data brokers, a targeted stalker, a state actor? The adversary changes the answer.</li>" +
          "<li><strong>What</strong> — what information, if leaked, hurts you most? Protect that first.</li>" +
          "<li><strong>How</strong> — the realistic paths to your data: breaches, socials, physical records, telecom.</li>" +
          "<li><strong>Effort</strong> — match your defenses to the threat. Threat-modeling beats buying random 'security' products.</li></ul>",
      },
    ],
  },

  protect: {
    title: "Hardening Guide",
    tag: "page-3",
    intro: "The counterplay: shrink your footprint, lock your accounts, remove your data from brokers, and know exactly what to do if someone comes for you.",
    sections: [
      {
        t: "Your attack surface",
        ic: "target",
        html: "<p>You cannot protect what you cannot see. Before anything else, map what is already public about you:</p>" +
          "<ul><li><strong>Search yourself</strong> — your real name, your usernames, your phone number, your email. Check images and news too.</li>" +
          "<li><strong>Breach check</strong> — run your email addresses and phone through Have I Been Pwned (or this toolkit's Email lookup) to see which past breaches already leaked your data.</li>" +
          "<li><strong>Old accounts</strong> — every abandoned profile is a data point. Delete or privatize them.</li>" +
          "<li><strong>Data brokers</strong> — people-search sites sell your address, family and phone to anyone with a card. They are the biggest leak, and you can remove yourself.</li></ul>",
      },
      {
        t: "Lock down accounts",
        ic: "lock",
        html: "<ul><li><strong>Unique passwords everywhere</strong> — one breach must not become all accounts. Use a password manager and let it generate random passwords.</li>" +
          "<li><strong>MFA on everything</strong> — app-based (Aegis, Google Authenticator) or hardware keys (YubiKey). SMS codes are the weakest form; use them only as a fallback.</li>" +
          "<li><strong>Email aliases</strong> — use SimpleLogin or DuckDuckGo email protection per service. When an alias gets spammed, kill it. Your real address stays hidden.</li>" +
          "<li><strong>Recovery options</strong> — secure the email account that can reset everything else, and check for recovery-backdoor compromise.</li>" +
          "<li><strong>Passkeys</strong> — where supported, use passkeys over passwords entirely.</li></ul>",
      },
      {
        t: "Shrink your footprint",
        ic: "eye",
        html: "<ul><li><strong>Socials</strong> — make profiles private, remove geotags, and turn off 'post from this location'. Delete accounts you no longer use.</li>" +
          "<li><strong>One handle</strong> — or none. Unique usernames make correlation trivial; common ones make YOU hard to find. Pick deliberately.</li>" +
          "<li><strong>Photos</strong> — strip EXIF before sharing (location, camera, timestamps). Tools: ExifTool, or apps that wipe metadata automatically.</li>" +
          "<li><strong>WHOIS</strong> — if you own a domain, use WHOIS privacy so your name, address and phone are not published in the public registry.</li>" +
          "<li><strong>Phone</strong> — your number links to everything via carriers and lookup sites. Give it out only when necessary.</li></ul>",
      },
      {
        t: "Remove your data from brokers",
        ic: "users",
        html: "<p>People-search sites sell aggregated profiles. Removal is possible and repeatable (they re-add you).</p>" +
          "<ul><li><strong>Automated services</strong> — DeleteMe, Incogni, Redact, BrandYourself handle hundreds of opt-outs for a fee.</li>" +
          "<li><strong>DIY</strong> — search your name on each broker site and use their opt-out form. Document requests. Re-run quarterly — brokers re-append data.</li>" +
          "<li><strong>Limit the source</strong> — opt-outs only work if data stops being re-supplied. Lock down the source accounts first.</li></ul>",
      },
      {
        t: "Clear your name",
        ic: "file",
        html: "<ul><li><strong>Search-engine removals</strong> — Google and Bing let you request removal of pages exposing personal info (address, phone, ID, non-consensual content).</li>" +
          "<li><strong>Site-level</strong> — contact the webmaster or host directly; many will remove or redact on request.</li>" +
          "<li><strong>Defamation</strong> — for false statements, document everything (URLs, screenshots, timestamps) before contacting the platform or, if needed, counsel.</li>" +
          "<li><strong>Consistency</strong> — reputation repair is a marathon: keep a small set of profiles updated so the top results about you are ones you control.</li></ul>",
      },
      {
        t: "Software to actually use",
        ic: "box",
        html: "<ul><li><strong>Browser</strong> — Firefox or Brave + uBlock Origin (blocks ads and most trackers).</li>" +
          "<li><strong>Password manager</strong> — Bitwarden or KeePassXC. Never reuse a password.</li>" +
          "<li><strong>2FA app</strong> — Aegis, or hardware keys from Yubico.</li>" +
          "<li><strong>Email aliasing</strong> — SimpleLogin, DuckDuckGo Email Protection, or Addy.io.</li>" +
          "<li><strong>Endpoint defense</strong> — Microsoft Defender with tamper protection on; consider an EDR/XDR layer if you handle sensitive data.</li>" +
          "<li><strong>VPN</strong> — Mullvad or Proton VPN for untrusted networks. A VPN hides your IP from sites, not your identity from everywhere.</li>" +
          "<li><strong>DNS filtering</strong> — NextDNS or Quad9 block malicious domains at the network level.</li>" +
          "<li><strong>Messaging</strong> — Signal for anything sensitive. Disappearing messages where supported.</li>" +
          "<li><strong>OS</strong> — for high-risk use, a Linux desktop removes most consumer-telemetry and bloatware vectors.</li>" +
          "<li><strong>Data removal</strong> — DeleteMe/Redact to automate broker opt-outs, plus a quarterly manual sweep.</li></ul>",
      },
      {
        t: "If you're being doxxed — right now",
        ic: "alert",
        html: "<ol><li><strong>Do not engage.</strong> Do not reply, post, or feed the campaign. Screenshot everything first — you need evidence.</li>" +
          "<li><strong>Document.</strong> Save URLs, dates, times, platforms and the attacker's account names. If you're being threatened, report to police with this file.</li>" +
          "<li><strong>Harden your accounts now</strong> — change passwords on anything exposed, turn on MFA, and lock down socials. Assume every account linked to the leaked data is compromised.</li>" +
          "<li><strong>Freeze your credit</strong> — if your address, SSN/ID or financial info leaked, freeze credit reports to block identity theft.</li>" +
          "<li><strong>Report to the platform</strong> — every platform has doxing/harassment policies; report each post and escalate.</li>" +
          "<li><strong>Bulk-remove</strong> — use the removal services above for any newly exposed personal info, and file search-engine removal requests.</li>" +
          "<li><strong>Watch the perimeter</strong> — set alerts for your name, new accounts appearing, and unusual logins. Check your device for stalkerware/malware.</li></ol>",
      },
      {
        t: "Physical & location OPSEC",
        ic: "map",
        html: "<ul><li>Turn off location history and geotagging in OS and app settings.</li>" +
          "<li>Review and strip metadata before posting images and documents.</li>" +
          "<li>Don't check in at home; post travel photos after you return, not live.</li>" +
          "<li>Order packages to a locker or work address if your home matters.</li>" +
          "<li>Know your neighbors' data: doxing often pivots through family and friends. Share the basics with them.</li></ul>",
      },
      {
        t: "Ongoing hygiene",
        ic: "activity",
        html: "<ul><li><strong>Quarterly</strong> — re-run broker removals and search yourself again.</li>" +
          "<li><strong>After any breach</strong> — check Have I Been Pwned for new hits on every email.</li>" +
          "<li><strong>Alerts</strong> — set Google Alerts for your name and monitor for new accounts using your identity.</li>" +
          "<li><strong>Life events</strong> — after a move, name change or breakup, redo the sweep; those are when exposure spikes.</li></ul>",
      },
    ],
  },
};

function pageLoader(messages) {
  const wrap = el("div", "page-load");
  const bar = el("div", "load-bar");
  const msg = el("div", "load-msg", messages[0]);
  bar.appendChild(el("span"));
  wrap.appendChild(bar);
  wrap.appendChild(msg);
  let i = 0;
  const iv = setInterval(() => {
    i = (i + 1) % messages.length;
    msg.textContent = messages[i];
  }, 450);
  return { node: wrap, stop: () => clearInterval(iv) };
}

function renderPage(id) {
  const page = PAGES[id];
  if (!page) return;
  setPageTitle(page.title);
  setStatus("ok");

  const view = document.getElementById("page-view");
  const messages =
    id === "learn"
      ? ["Decrypting the manual…", "Indexing disciplines…", "Compiling definitions…", "Loading OPSEC core…"]
      : ["Building your defense…", "Mapping attack surface…", "Preparing countermeasures…", "Loading hardening guide…"];
  const loader = pageLoader(messages);
  view.classList.remove("hidden");
  view.innerHTML = "";
  view.appendChild(loader.node);

  setTimeout(() => {
    loader.stop();
    view.innerHTML = "";
    const frag = document.createDocumentFragment();

    const hero = el("div", "page-hero");
    const pageIco = el("div", "page-ico");
    pageIco.innerHTML = svg(page.tag === "page-2" ? "book" : "shield");
    hero.appendChild(pageIco);
    const heroText = el("div");
    heroText.appendChild(el("h1", null, page.title));
    heroText.appendChild(el("p", null, page.intro));
    hero.appendChild(heroText);
    frag.appendChild(hero);

    const grid = el("div", "p-sections");
    for (const sec of page.sections) {
      const card = el("div", "p-card");
      const head = el("div", "p-head");
      const pIco = el("span", "p-ico");
      pIco.innerHTML = svg(ICONS[sec.ic] ? sec.ic : "box");
      head.appendChild(pIco);
      head.appendChild(el("h2", null, sec.t));
      card.appendChild(head);
      const body = el("div", "p-body");
      body.innerHTML = sec.html;
      card.appendChild(body);
      grid.appendChild(card);
    }
    frag.appendChild(grid);
    view.appendChild(frag);
  }, 1500);
}

/* ================================================================
   Renderers
   ================================================================ */

function renderEmail(data) {
  const frag = document.createDocumentFragment();
  if (data.note) frag.appendChild(stateEl("note", data.note));

  frag.appendChild(card("MX records — " + data.email, (() => {
    if (!data.mxRecords) return el("div", "state", "No mail servers found.");
    if (data.mxRecords.error) return el("div", "state error", "DNS error: " + data.mxRecords.error);
    return table(["Priority", "Mail server"], data.mxRecords.map((r) => [String(r.priority), r.exchange]));
  })()));

  frag.appendChild(card("Breach exposure", (() => {
    if (data.breaches === null && data.breachedCount === null) return el("div", "state", "No breach data returned.");
    if (data.breachedCount === 0) return el("div", "state", "No breaches found for this email.");
    if (data.breaches && (data.breaches.error || data.breaches.httpStatus)) {
      return el("div", "state error", "Lookup unavailable: " + (data.breaches.error || "HTTP " + data.breaches.httpStatus));
    }
    const wrap = el("div");
    wrap.appendChild(el("div", null, "Found in " + data.breaches.length + " breach(es):"));
    const ul = el("ul", "clean");
    for (const b of data.breaches) {
      const li = el("li", null, b.Name + " (" + b.BreachDate + ") — " + b.Description.split(" ").slice(0, 18).join(" ") + "…");
      li.title = b.Description;
      ul.appendChild(li);
    }
    wrap.appendChild(ul);
    return wrap;
  })()));

  return frag;
}

function renderIp(data) {
  const frag = document.createDocumentFragment();
  const g = data.geo || {};
  if (g.error) {
    frag.appendChild(stateEl("error", "Geolocation failed: " + g.error));
  } else {
    frag.appendChild(card("Geolocation — " + data.ip, kv([
      ["Country", g.country], ["Region", g.regionName], ["City", g.city],
      ["Postal", g.zip], ["Coordinates", g.lat && g.lon ? g.lat + ", " + g.lon : null],
      ["Timezone", g.timezone], ["ISP", g.isp], ["Organization", g.org], ["ASN", g.as],
      ["Proxy/VPN", g.proxy === true ? "yes" : "no"], ["Hosting", g.hosting === true ? "yes" : "no"],
      ["Mobile", g.mobile === true ? "yes" : "no"],
    ])));
  }
  frag.appendChild(card("Reverse DNS (PTR)", data.reverseDns ? list(data.reverseDns) : el("div", "state", "No PTR record found.")));
  return frag;
}

function renderDns(data) {
  const frag = document.createDocumentFragment();
  const r = data.records;
  for (const type of ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "CAA"]) {
    const val = r[type];
    let body;
    if (val === null) body = el("div", "state", "No records.");
    else if (val.error) body = el("div", "state", "Error: " + val.error);
    else if (type === "A" || type === "AAAA") body = table(["Address", "TTL"], val.map((e) => [e.address, e.ttl]));
    else if (type === "CNAME") body = table(["Target"], val.map((e) => [e]));
    else if (type === "MX") body = table(["Priority", "Exchange"], val.map((e) => [e.priority, e.exchange]));
    else if (type === "NS") body = table(["Nameserver"], val.map((e) => [e]));
    else if (type === "TXT") body = table(["Text"], val.map((e) => [String(e.join(" ")).slice(0, 140)]));
    else if (type === "SOA")
      body = kv([["NS", val.nsname], ["Hostmaster", val.hostmaster], ["Serial", val.serial], ["Refresh", val.refresh], ["Retry", val.retry], ["Expire", val.expire], ["Minimum", val.minttl]]);
    else if (type === "CAA") body = table(["Issuer", "Tag / value"], val.map((e) => [e.issuer, e.tag + " " + e.value]));
    frag.appendChild(card(type + " records", body));
  }
  return frag;
}

function renderWhois(data) {
  const frag = document.createDocumentFragment();
  const date = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "—");
  frag.appendChild(card("Registration", kv([
    ["Domain", data.ldapName], ["Handle", data.handle], ["Registered", date(data.created)],
    ["Last updated", date(data.updated)], ["Expires", date(data.expires)],
    ["Status", data.status ? data.status.join(", ") : null],
    ["Nameservers", data.nameservers ? data.nameservers.join(", ") : null],
    ["Secure DNS", data.secureDns ? (data.secureDns.delegationSigned ? "DNSSEC signed" : "unsigned") : "—"],
  ])));
  if (data.entities && data.entities.length) {
    frag.appendChild(card("Entities", table(["Role", "Name", "Email", "Handle"], data.entities.map((e) => [(e.roles || ["—"]).join(", "), e.name || "—", e.email || "—", e.handle || "—"]))));
  } else {
    frag.appendChild(card("Entities", el("div", "state", "No registrant entities returned (privacy or RDAP gap).")));
  }
  return frag;
}

function renderSubdomains(data) {
  const frag = document.createDocumentFragment();
  frag.appendChild(stateEl("note", data.count + " unique subdomains found for " + data.domain + " (source: " + data.source + ", capped at 300)."));
  frag.appendChild(card("Subdomains", data.count ? list(data.subdomains) : el("div", "state", "None found.")));
  return frag;
}

function renderUsername(data) {
  const frag = document.createDocumentFragment();
  const link = (f) => {
    const a = el("a", null, f.url);
    a.href = f.url; a.target = "_blank"; a.rel = "noopener noreferrer";
    const li = el("li", null);
    li.appendChild(el("strong", null, f.platform + ": "));
    li.appendChild(a);
    return li;
  };

  const ul = el("ul", "clean");
  for (const f of data.found) ul.appendChild(link(f));
  frag.appendChild(card("Found (" + data.found.length + ")", data.found.length ? ul : el("div", "state", "No verified matches on checked platforms.")));

  if (data.ambiguous && data.ambiguous.length) {
    frag.appendChild(card("Ambiguous / blocked (" + data.ambiguous.length + ")", list(data.ambiguous.map((a) => a.platform + " — " + a.status + (a.message ? " (" + a.message + ")" : "")))));
  }
  if (data.notFound && data.notFound.length) {
    frag.appendChild(card("Not found (" + data.notFound.length + ")", list(data.notFound.map((a) => a.platform))));
  }
  return frag;
}

function renderUrl(data) {
  const frag = document.createDocumentFragment();
  const chain = el("ul", "hop-chain");
  data.hops.forEach((h, i) => {
    const li = el("li");
    const badgeCls = h.error ? "bad" : h.status >= 200 && h.status < 300 ? "ok" : "warn";
    const badge = h.error ? esc(h.error) : "HTTP " + h.status;
    li.innerHTML = "<strong>#" + i + "</strong> " + esc(h.url) + " <span class='badge " + badgeCls + "'>" + esc(badge) + "</span>" +
      (h.location ? " <span class='arrow'>→ " + esc(h.location) + "</span>" : "");
    chain.appendChild(li);
  });
  frag.appendChild(card("Redirect chain", chain));
  frag.appendChild(card("Destination", kv([
    ["Final URL", data.finalUrl], ["Final IP", data.finalIp || "—"],
    ["Reverse DNS", data.finalReverseDns ? data.finalReverseDns.join(", ") : "—"],
  ])));
  return frag;
}

function renderHash(data) {
  const frag = document.createDocumentFragment();
  frag.appendChild(card("Hash", kv([["Length", data.length + " chars"], ["Format", data.charset]])));
  const ul = el("ul", "clean");
  for (const c of data.candidates) {
    const li = el("li", null, c);
    ul.appendChild(li);
  }
  frag.appendChild(card("Possible algorithms", ul));
  return frag;
}

function renderHeaders(data) {
  const frag = document.createDocumentFragment();
  const chain = el("ul", "hop-chain");
  data.chain.forEach((h, i) => {
    const li = el("li");
    li.innerHTML = "<strong>#" + i + "</strong> " + esc(h.url) +
      (h.error ? " <span class='badge bad'>" + esc(h.error) + "</span>" : " <span class='badge " + (h.status < 300 ? "ok" : "warn") + "'>HTTP " + h.status + "</span>");
    chain.appendChild(li);
  });
  frag.appendChild(card("Responses", chain));

  if (data.security && data.security.length) {
    const grid = el("div", "security-grid");
    for (const s of data.security) {
      const item = el("div", "sec-item");
      const sh = el("div", "sh");
      sh.appendChild(el("span", null, s.header));
      sh.appendChild(el("span", "badge " + (s.present ? "ok" : "bad"), s.present ? "set" : "missing"));
      item.appendChild(sh);
      if (s.value) item.appendChild(el("div", "sv", s.value));
      grid.appendChild(item);
    }
    frag.appendChild(card("Security headers (final response)", grid));
  }

  const final = data.chain[data.chain.length - 1];
  if (final && final.headers) {
    const rows = Object.entries(final.headers).map(([k, v]) => [k, String(v).slice(0, 160)]);
    frag.appendChild(card("Full header dump", table(["Header", "Value"], rows)));
  }
  return frag;
}

function renderCidr(data) {
  const frag = document.createDocumentFragment();
  frag.appendChild(card("Network " + data.cidr, kv([
    ["Network", data.network], ["Netmask", data.mask], ["Prefix", "/" + data.prefix],
    ["Broadcast", data.broadcast], ["Total addresses", data.totalAddresses],
    ["Usable hosts", data.usableHosts === null ? "—" : data.usableHosts],
    ["First usable", data.firstUsable], ["Last usable", data.lastUsable],
  ])));
  if (data.sample && data.sample.length) {
    frag.appendChild(card("Address sample (" + data.sample.length + ")", list(data.sample.slice(0, 100))));
  }
  return frag;
}

function renderSearch(data) {
  const frag = document.createDocumentFragment();
  frag.appendChild(stateEl("note", "Query: " + data.query + " — these engines may require manual interaction."));
  const grid = el("div", "engine-grid");
  for (const [name, url] of data.engines) {
    const a = el("a", null, name);
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
    const arrow = el("span", "ext-arrow");
    arrow.innerHTML = svg("arrow");
    a.appendChild(arrow);
    grid.appendChild(a);
  }
  frag.appendChild(card("Search engines", grid));
  return frag;
}

function renderPhone(data) {
  const frag = document.createDocumentFragment();
  frag.appendChild(card("Phone", kv([
    ["Input", data.input], ["E.164", data.e164],
    ["Country", data.country || "Unknown"], ["Country code", data.countryCode || "—"],
    ["Local number", data.localPart || "—"],
    ["Valid", data.valid === undefined ? null : (data.valid ? "yes" : "no")],
    ["Carrier", data.carrier || "—"], ["Line type", data.lineType || "—"],
  ])));
  return frag;
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/* ================================================================
   Boot
   ================================================================ */

buildShell();
initTypedInputs();

(async function boot() {
  try {
    const r = await fetch("/api/auth/me");
    const j = await r.json();
    if (j.ok) showApp(j.email);
    else showAuth();
  } catch {
    showAuth();
  }
})();
