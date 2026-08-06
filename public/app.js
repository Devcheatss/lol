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
};

const svg = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.box}</svg>`;

const CATEGORY_ICONS = {
  "Documentation / Evidence Capture": "camera",
  "OpSec": "shield",
  "CTI / Threat Intel": "activity",
  "Malware Analysis": "flask",
  "AI": "bot",
  "Tools": "wrench",
  "Encoding / Hashing": "code",
  "Classifieds": "tag",
  "Blockchain": "hexagon",
  "Disinformation / Content": "newspaper",
  "Dark Web": "moon",
  "Mobile / Devices": "phone2",
  "Translation": "languages",
  "Archives": "archive",
  "Communities / Forums": "chat",
  "Search Engines": "search",
  "Geolocation / Mapping": "map",
  "Transportation / Flight": "plane",
  "Business / Companies": "building",
  "Compliance": "scale",
  "Public Records": "landmark",
  "Telephone": "phone",
  "Dating": "heart",
  "People Search": "users",
  "Instant Messenger": "message",
  "Social Media": "share",
  "Images / Video": "image",
  "IP / Network": "network",
  "Cloud / Hosting": "cloud",
  "Domain / DNS": "globe",
  "Email": "mail",
  "Username / Handle": "user",
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
    dx += (mx - dx) * 0.4; dy += (my - dy) * 0.4;
    rx += (mx - rx) * 0.14; ry += (my - ry) * 0.14;
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
   Auth
   ================================================================ */

const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");

function showAuth() {
  appView.classList.add("hidden");
  authView.classList.remove("hidden");
}
function showApp(email) {
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  document.getElementById("user-email").textContent = email;
  document.getElementById("user-avatar").textContent = (email[0] || "?").toUpperCase();
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
      `<div class="results"></div>`;
    content.appendChild(section);
  });

  const resourceView = el("section", "tool hidden");
  resourceView.id = "resource-view";
  content.appendChild(resourceView);

  navLabel("Resources");
  DIRECTORY.forEach((cat) => {
    const b = el("button", "nav-item");
    b.dataset.kind = "resource";
    b.dataset.resource = cat.category;
    b.innerHTML = `<span class="ico">${svg(CATEGORY_ICONS[cat.category] || "box")}</span>${cat.category}<span class="cnt">${cat.sites.length}</span>`;
    b.addEventListener("click", () => openResource(cat.category));
    nav.appendChild(b);
  });

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
    b.classList.toggle("active", b.dataset.kind === kind && (b.dataset.tool === id || b.dataset.resource === id));
  });
}

function switchTool(id) {
  const view = document.getElementById("resource-view");
  if (view) view.classList.add("hidden");
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
  const tool = TOOLS.find((t) => t.id === id);
  if (tool) {
    setPageTitle(tool.title);
    setStatus("ok");
  }
}

function openResource(name) {
  const cat = DIRECTORY.find((c) => c.category === name);
  if (!cat) return;
  const view = document.getElementById("resource-view");

  document.querySelectorAll(".tool").forEach((s) => {
    if (s.id !== "resource-view") s.classList.add("hidden");
  });
  view.classList.remove("hidden");
  view.style.animation = "none";
  void view.offsetWidth;
  view.style.animation = "";

  view.innerHTML =
    `<h2><span class="ico">${svg(CATEGORY_ICONS[name] || "box")}</span>${name}</h2>` +
    `<p class="desc">Curated public-resource links for this category — opens in a new tab.</p>` +
    `<input class="q rfilter" type="text" placeholder="Filter ${name}…" autocomplete="off" spellcheck="false" />` +
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
    const grid = el("div", "engine-grid");
    for (const s of sites) {
      const a = el("a", null, "");
      const title = el("span", null, s.name);
      a.appendChild(title);
      a.href = s.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = s.note || s.url;
      a.appendChild(el("span", "ext", (s.note || s.url.replace(/^https?:\/\//, "")) + "  "));
      const ext = el("span", "ext-arrow", svg("arrow"));
      a.appendChild(ext);
      grid.appendChild(a);
    }
    results.appendChild(grid);
  };

  filter.addEventListener("input", () => render(filter.value));
  render("");
  setActiveNav("resource", name);
  setPageTitle(name);
  setStatus("ok");
}

function setResults(form, node) {
  const box = form.parentElement.querySelector(".results");
  box.innerHTML = "";
  if (node) box.appendChild(node);
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
    a.appendChild(el("span", "ext-arrow", svg("arrow")));
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
