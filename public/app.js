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
  { id: "breach", icon: "alert", title: "Breach checker", desc: "Check whether an email address appears in known data breaches.", ph: "someone@example.com", ep: "/api/breach?email={q}", render: renderBreach },
  { id: "pwned", icon: "lock", title: "Password checker", desc: "Safely check a password against breach corpora (k-anonymity — your password never leaves, only its hash prefix).", ph: "enter a password to test", ep: "/api/pwned?p={q}", render: renderPwned },
  { id: "cert", icon: "scan", title: "SSL cert viewer", desc: "Fetch and decode the live TLS certificate of a host.", ph: "example.com", ep: "/api/cert?host={q}", render: renderCert },
  { id: "port", icon: "network", title: "Port scanner", desc: "Quick TCP scan of a host's common ports (open / filtered / closed).", ph: "example.com", ep: "/api/port?host={q}", render: renderPort },
  { id: "wayback", icon: "archive", title: "Wayback snapshots", desc: "Find archived copies of a URL in the Internet Archive.", ph: "https://example.com/page", ep: "/api/wayback?url={q}", render: renderWayback },
  { id: "wallet", icon: "wallet", title: "Crypto wallet", desc: "Check a BTC or ETH address balance and transaction count.", ph: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", custom: true, build: buildWallet },
  { id: "batch", icon: "list", title: "Batch lookup", desc: "Run a list of emails, IPs, domains or usernames through one tool at once.", ph: "paste many lines…", custom: true, build: buildBatch },
  { id: "metadata", icon: "image", title: "Metadata / EXIF", desc: "Upload a photo and read EXIF + GPS data locally in your browser.", ph: "upload an image", custom: true, build: buildMetadata },
  { id: "hashfile", icon: "hash", title: "File hasher", desc: "Compute MD5, SHA-1, SHA-256/384/512 of a file locally in your browser.", ph: "upload a file", custom: true, build: buildFileHash },
  { id: "dorks", icon: "code", title: "Google dork builder", desc: "Build advanced search operators and open them in any search engine.", ph: "build a dork", custom: true, build: buildDorks },
  { id: "image", icon: "camera", title: "Reverse image search", desc: "Find where an image appears using Yandex, Google, Bing and Tineye.", ph: "image URL", custom: true, build: buildReverseImage },
  { id: "report", icon: "printer", title: "Report generator", desc: "Run every relevant lookup on a target and produce a printable report.", ph: "target domain or email", custom: true, build: buildReport },
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
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  scan: '<path d="M12 11c0 4-2 8-2 8"/><path d="M8 8a4 4 0 0 1 8 0c0 2-1 4-1 6"/><path d="M5 7a7 7 0 0 1 14 0c0 4-1 8-1 11"/><path d="M2 11c0-5 4-9 10-9s10 4 10 9c0 4-1 7-1 10"/>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  send: '<line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  sparkles: '<path d="m12 3-1.9 5.8L4.3 10.7l5.8 1.9L12 18l1.9-5.4 5.8-1.9-5.8-1.9z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
  wallet: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="15" r="1.2"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  bot: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/>',
  key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
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
  cursorStyle: "dot",
  cursorColor: "",
  cursorSize: 60,
  cursorSmooth: 50,
  boot: true,
  grid: true,
  wallpaper: "none",
  wallpaperDim: 45,
  sidebarSide: "left",
  sidebarWidth: "normal",
  sidebarCompact: false,
  navPages: true,
  showPager: true,
  name: "",
  tagline: "",
  nameFont: "Inter",
  nameColor: "",
  avatar: "letter",
  avatarGrad: "default",
  profileBg: "default",
};

const CURSOR_STYLES = [
  { id: "dot", name: "Dot + ring", icon: "languages" },
  { id: "ring", name: "Ring", icon: "globe" },
  { id: "cross", name: "Crosshair", icon: "search" },
  { id: "off", name: "OS cursor", icon: "box" },
];

const NAME_FONTS = [
  { id: "Inter", css: "'Inter', sans-serif" },
  { id: "JetBrains Mono", css: "'JetBrains Mono', monospace" },
  { id: "Space Grotesk", css: "'Space Grotesk', sans-serif" },
  { id: "Orbitron", css: "'Orbitron', sans-serif" },
  { id: "Playfair Display", css: "'Playfair Display', serif" },
  { id: "Pacifico", css: "'Pacifico', cursive" },
  { id: "Caveat", css: "'Caveat', cursive" },
  { id: "Righteous", css: "'Righteous', cursive" },
  { id: "Fredoka", css: "'Fredoka', sans-serif" },
  { id: "Ubuntu Mono", css: "'Ubuntu Mono', monospace" },
  { id: "Archivo", css: "'Archivo', sans-serif" },
];

const COLOR_SWATCHES = [
  "", "#ffffff", "#6c8bff", "#8aa2ff", "#22c55e", "#22d3ee", "#a78bfa",
  "#fb923c", "#f43f5e", "#ec4899", "#d946ef", "#f59e0b", "#84cc16",
  "#e2e8f0", "#f5b24d",
];

const PROFILE_BGS = {
  default: "radial-gradient(120% 140% at 15% -10%, rgba(108,139,255,0.32), transparent 55%), linear-gradient(160deg, #10101a, #0b0b11)",
  midnight: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
  synthwave: "linear-gradient(135deg, #ff0844, #ffb199)",
  matrix: "linear-gradient(135deg, #041f0a, #14532d)",
  cyber: "linear-gradient(135deg, #082f49, #22d3ee)",
  ember: "linear-gradient(135deg, #7c2d12, #f97316)",
  ocean: "linear-gradient(135deg, #0e7490, #67e8f9)",
  violet: "linear-gradient(135deg, #4c1d95, #a78bfa)",
  crimson: "linear-gradient(135deg, #7f1d1d, #f43f5e)",
  forest: "linear-gradient(135deg, #14532d, #4ade80)",
  gold: "linear-gradient(135deg, #713f12, #fbbf24)",
  steel: "linear-gradient(135deg, #111827, #64748b)",
  cherry: "linear-gradient(135deg, #831843, #ec4899)",
  blood: "linear-gradient(135deg, #450a0a, #dc2626)",
  dawn: "linear-gradient(135deg, #1e3a8a, #f0abfc)",
  smoke: "linear-gradient(135deg, #1f2937, #9ca3af)",
};

const AVATAR_EMOJIS = ["🦉", "🕶️", "🔥", "⚡", "🛡️", "🗡️", "🎯", "🧠", "👁️", "🌙", "⭐", "🔮", "🥷", "💀", "🌊", "🦊", "🐺", "🚀", "🎮", "🎧", "📡", "🗺️", "⚔️", "☠️"];

let settings = { ...DEFAULT_SETTINGS };
let cachedAccent = "#6c8bff";

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    settings = { ...DEFAULT_SETTINGS, ...raw };
    if (raw.cursor === false && !raw.cursorStyle) settings.cursorStyle = "off";
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

function fontCss(id) {
  const f = NAME_FONTS.find((x) => x.id === id);
  return f ? f.css : "var(--sans)";
}

function gradCss(id) {
  return PROFILE_BGS[id] || PROFILE_BGS.default;
}

function refreshAccent() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  cachedAccent = v || "#6c8bff";
}

function hexToRgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return "rgba(108,139,255," + a + ")";
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function applySettings() {
  document.documentElement.dataset.theme = settings.theme in THEMES ? settings.theme : "default";
  const ui = 0.04 + (settings.smooth / 100) * 0.42;
  const load = 0.5 + (settings.smooth / 100) * 1.2;
  document.documentElement.style.setProperty("--ui-time", ui.toFixed(3) + "s");
  document.documentElement.style.setProperty("--load-time", load.toFixed(3) + "s");
  const grid = document.querySelector(".bg-grid");
  if (grid) grid.classList.toggle("hidden", !settings.grid);
  applyWallpaper();
  applyCursor();
  applyChrome();
  applyProfile();
  refreshAccent();
}

function applyCursor() {
  document.body.dataset.cursor = CURSOR_STYLES.some((c) => c.id === settings.cursorStyle) ? settings.cursorStyle : "dot";
  document.documentElement.style.setProperty("--cur-color", settings.cursorColor || "var(--accent)");
  const on = settings.cursorStyle !== "off";
  document.querySelectorAll(".cursor").forEach((c) => c.classList.toggle("hidden", !on));
}

function applyChrome() {
  document.body.dataset.side = settings.sidebarSide === "right" ? "right" : "left";
  document.body.dataset.navpages = settings.navPages ? "1" : "0";
  const sb = document.getElementById("sidebar");
  if (sb) {
    const w = settings.sidebarWidth === "compact" ? 206 : settings.sidebarWidth === "wide" ? 300 : 252;
    sb.style.setProperty("--sidebar-w", w + "px");
    sb.classList.toggle("compact", settings.sidebarCompact);
  }
  const pager = document.querySelector(".page-head .pager");
  if (pager) pager.classList.toggle("hidden", !settings.showPager);
}

function applyProfile() {
  const ue = document.getElementById("user-email");
  if (!ue) return;
  const name = (settings.name || "").trim();
  const email = ue.dataset.email || "";
  ue.textContent = name || email;
  const us = document.getElementById("user-sub");
  if (us) us.textContent = (settings.tagline || "").trim() || (name ? "View profile" : email || "Signed in");
  const av = document.getElementById("user-avatar");
  if (av) {
    av.style.background = gradCss(settings.avatarGrad);
    const first = (name || email || "?").trim()[0] || "?";
    av.textContent = settings.avatar && settings.avatar !== "letter" ? settings.avatar : first.toUpperCase();
  }
  const d = document.documentElement;
  d.style.setProperty("--pf-font", fontCss(settings.nameFont));
  d.style.setProperty("--pf-color", settings.nameColor || "var(--text)");
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
  card.appendChild(el("p", "s-sub", "Animation and typing speed, boot and backdrop."));

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
  card.appendChild(sRow("Typing speed", "Typewriter speed (home, profile)", tp));

  card.appendChild(sRow("Boot screen", "Loading overlay after sign-in", sToggle("boot")));
  card.appendChild(sRow("Grid backdrop", "Subtle background grid pattern", sToggle("grid")));

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

function chipPreview() {
  const name = (settings.name || "").trim();
  const email = document.getElementById("user-email") ? document.getElementById("user-email").dataset.email : "";
  const wrap = el("div", "chip-prev");
  wrap.innerHTML =
    `<div class="chip-prev-card">` +
      `<span class="chip-prev-av" style="background:${gradCss(settings.avatarGrad)}">${settings.avatar && settings.avatar !== "letter" ? settings.avatar : ((name || email || "?").trim()[0] || "?").toUpperCase()}</span>` +
      `<div class="chip-prev-meta"><span class="chip-prev-name">${esc(name || email || "—")}</span><span class="chip-prev-sub">${esc((settings.tagline || "").trim() || "View profile")}</span></div>` +
      `<span class="chip-prev-chev">»</span>` +
    `</div>`;
  const el0 = wrap.querySelector(".chip-prev-name");
  el0.style.fontFamily = fontCss(settings.nameFont);
  el0.style.color = settings.nameColor || "var(--text)";
  return wrap;
}

function colorSwatchRow(current, onPick) {
  const row = el("div", "swatches cswatches");
  for (const c of COLOR_SWATCHES) {
    const b = el("button", "swatch cswatch" + (current === c ? " active" : ""));
    b.dataset.color = c;
    b.style.setProperty("--sw", c || "transparent");
    b.title = c || "Auto (theme accent)";
    if (!c) b.innerHTML = `<span class="sw-dot auto"></span><span>auto</span>`;
    else b.innerHTML = `<span class="sw-dot"></span><span>${c}</span>`;
    b.addEventListener("click", () => {
      onPick(c);
      row.querySelectorAll(".cswatch").forEach((x) => x.classList.toggle("active", x.dataset.color === c));
    });
    row.appendChild(b);
  }
  return row;
}

function cursorCard() {
  const card = el("div", "s-card");
  const head = el("h2", null, "");
  const ico = el("span", "s-ico");
  ico.innerHTML = svg("languages");
  head.appendChild(ico);
  head.appendChild(el("span", null, "Cursor"));
  card.appendChild(head);
  card.appendChild(el("p", "s-sub", "Pick a pointer, its color and size."));

  const styles = el("div", "cur-styles");
  for (const s of CURSOR_STYLES) {
    const b = el("button", "cur-style" + (settings.cursorStyle === s.id ? " active" : ""));
    b.innerHTML = `<span class="cur-ico">${svg(s.icon)}</span><span>${s.name}</span>`;
    b.addEventListener("click", () => {
      settings.cursorStyle = s.id;
      saveSettings();
      applyCursor();
      styles.querySelectorAll(".cur-style").forEach((x) => x.classList.toggle("active", x.dataset.s === s.id));
    });
    b.dataset.s = s.id;
    styles.appendChild(b);
  }
  card.appendChild(styles);

  card.appendChild(colorSwatchRow(settings.cursorColor, (c) => {
    settings.cursorColor = c;
    saveSettings();
    applyCursor();
  }));

  const cs = sSlider("cursorSmooth", 0, 100);
  cs.addEventListener("input", () => {
    settings.cursorSmooth = Number(cs.value);
    saveSettings();
  });
  card.appendChild(sRow("Cursor lag", "How much the ring trails the dot", cs));

  const sz = sSlider("cursorSize", 30, 120);
  sz.addEventListener("input", () => {
    settings.cursorSize = Number(sz.value);
    saveSettings();
  });
  card.appendChild(sRow("Cursor size", "Scale of the pointer elements", sz));
  return card;
}

function wallpaperCard() {
  const card = el("div", "s-card");
  const head = el("h2", null, "");
  const ico = el("span", "s-ico");
  ico.innerHTML = svg("image");
  head.appendChild(ico);
  head.appendChild(el("span", null, "Wallpaper"));
  card.appendChild(head);
  card.appendChild(el("p", "s-sub", "Animated backgrounds rendered locally on your device."));

  const grid = el("div", "wp-grid");
  for (const [id, wp] of Object.entries(WALLPAPERS)) {
    const b = el("button", "wp-thumb" + (settings.wallpaper === id ? " active" : ""));
    b.dataset.wp = id;
    const cv = document.createElement("canvas");
    cv.width = 160; cv.height = 92;
    b.appendChild(cv);
    b.appendChild(el("span", null, wp.name));
    b.addEventListener("click", () => {
      settings.wallpaper = id;
      saveSettings();
      applyWallpaper();
      grid.querySelectorAll(".wp-thumb").forEach((x) => x.classList.toggle("active", x.dataset.wp === id));
    });
    grid.appendChild(b);
  }
  card.appendChild(grid);

  const dim = sSlider("wallpaperDim", 5, 100);
  dim.addEventListener("input", () => {
    settings.wallpaperDim = Number(dim.value);
    saveSettings();
    applyWallpaper();
  });
  card.appendChild(sRow("Wallpaper brightness", "How strong the backdrop shows through", dim));
  startThumbPreviews(grid);
  return card;
}

function sidebarCard() {
  const card = el("div", "s-card");
  const head = el("h2", null, "");
  const ico = el("span", "s-ico");
  ico.innerHTML = svg("folder");
  head.appendChild(ico);
  head.appendChild(el("span", null, "Sidebar & chrome"));
  card.appendChild(head);
  card.appendChild(el("p", "s-sub", "Where the drawer sits, how big it is, and what it shows."));

  const sideRow = el("div", "seg-row");
  for (const [val, name] of [["left", "Left"], ["right", "Right"]]) {
    const b = el("button", "seg" + (settings.sidebarSide === val ? " active" : ""));
    b.textContent = name;
    b.addEventListener("click", () => {
      settings.sidebarSide = val;
      saveSettings();
      applyChrome();
      sideRow.querySelectorAll(".seg").forEach((x) => x.classList.toggle("active", x.textContent === name));
    });
    sideRow.appendChild(b);
  }
  card.appendChild(sRow("Sidebar side", "Which edge the drawer slides from", sideRow));

  const wRow = el("div", "seg-row");
  for (const [val, name] of [["compact", "Compact"], ["normal", "Normal"], ["wide", "Wide"]]) {
    const b = el("button", "seg" + (settings.sidebarWidth === val ? " active" : ""));
    b.textContent = name;
    b.addEventListener("click", () => {
      settings.sidebarWidth = val;
      saveSettings();
      applyChrome();
      wRow.querySelectorAll(".seg").forEach((x) => x.classList.toggle("active", x.textContent === name));
    });
    wRow.appendChild(b);
  }
  card.appendChild(sRow("Sidebar width", "Compact 206 · Normal 252 · Wide 300", wRow));

  const navT = el("button", "switch" + (settings.navPages ? " on" : ""));
  navT.type = "button";
  navT.addEventListener("click", () => {
    settings.navPages = !settings.navPages;
    navT.classList.toggle("on", settings.navPages);
    saveSettings();
    applyChrome();
    buildNav();
  });
  card.appendChild(sRow("Pages in sidebar", "Show the page links under the tools", navT));
  card.appendChild(sRow("Compact sidebar", "Tighter nav rows and smaller type", sToggle("sidebarCompact")));
  card.appendChild(sRow("Numbered pager", "The 1–7 page buttons in the header", sToggle("showPager")));
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
  card.appendChild(el("p", "s-sub", "Your identity — shown at the bottom of the sidebar and in the profile popover."));

  const form = el("form", "s-form");
  form.innerHTML =
    `<div class="field"><label for="s-name">Display name</label>` +
    `<input type="text" id="s-name" maxlength="40" autocomplete="nickname" spellcheck="false" /></div>` +
    `<div class="field"><label for="s-tagline">Tagline <span class="hint">small line under your name</span></label>` +
    `<input type="text" id="s-tagline" maxlength="60" autocomplete="off" spellcheck="false" /></div>` +
    `<div class="s-btn-row"><button type="submit" class="btn-primary">Save</button></div>` +
    `<div class="s-msg" id="s-name-msg"></div>`;
  form.querySelector("#s-name").value = settings.name;
  form.querySelector("#s-tagline").value = settings.tagline;

  const refreshPreview = () => {
    const old = card.querySelector(".chip-prev");
    if (old) old.remove();
    const prev = chipPreview();
    const sub = card.querySelector(".s-sub");
    card.insertBefore(prev, sub ? sub.nextSibling : card.querySelector("h2").nextSibling);
  };
  refreshPreview();

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    settings.name = form.querySelector("#s-name").value.trim().slice(0, 40);
    settings.tagline = form.querySelector("#s-tagline").value.trim().slice(0, 60);
    saveSettings();
    applyProfile();
    refreshPreview();
    toast("Profile updated.", "ok");
  });
  card.appendChild(form);

  card.appendChild(el("div", "s-label", "Avatar picture"));
  const avWrap = el("div");
  avWrap.appendChild(colorSwatchRow(settings.avatarGrad, (c) => {
    settings.avatarGrad = c;
    saveSettings();
    applyProfile();
    refreshPreview();
  }));
  const emojis = el("div", "emoji-row");
  const emBtn = el("button", "emoji-tile" + (settings.avatar === "letter" ? " active" : ""));
  emBtn.textContent = "Aa";
  emBtn.title = "Initial letter";
  emBtn.addEventListener("click", () => {
    settings.avatar = "letter";
    saveSettings();
    applyProfile();
    refreshPreview();
    emojis.querySelectorAll(".emoji-tile").forEach((x) => x.classList.remove("active"));
    emBtn.classList.add("active");
  });
  emojis.appendChild(emBtn);
  for (const e of AVATAR_EMOJIS) {
    const b = el("button", "emoji-tile" + (settings.avatar === e ? " active" : ""));
    b.textContent = e;
    b.addEventListener("click", () => {
      settings.avatar = e;
      saveSettings();
      applyProfile();
      refreshPreview();
      emojis.querySelectorAll(".emoji-tile").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
    });
    emojis.appendChild(b);
  }
  avWrap.appendChild(emojis);
  card.appendChild(avWrap);

  card.appendChild(el("div", "s-label", "Profile background"));
  const bgRow = el("div", "swatches bgswatches");
  for (const id of Object.keys(PROFILE_BGS)) {
    const b = el("button", "swatch bswatch" + (settings.profileBg === id ? " active" : ""));
    b.style.setProperty("--sw", id === "default" ? "repeating-linear-gradient(135deg,#6c8bff33 0 6px,transparent 6px 12px)" : PROFILE_BGS[id]);
    b.title = id;
    b.innerHTML = `<span class="sw-dot grad"></span><span>${id}</span>`;
    b.addEventListener("click", () => {
      settings.profileBg = id;
      saveSettings();
      applyProfile();
      refreshPreview();
      bgRow.querySelectorAll(".bswatch").forEach((x) => x.classList.toggle("active", x.dataset.id === id));
    });
    b.dataset.id = id;
    bgRow.appendChild(b);
  }
  card.appendChild(bgRow);

  card.appendChild(el("div", "s-label", "Name font"));
  const fontSel = document.createElement("select");
  fontSel.className = "sel";
  for (const f of NAME_FONTS) {
    const o = document.createElement("option");
    o.value = f.id;
    o.textContent = f.id;
    fontSel.appendChild(o);
  }
  fontSel.value = settings.nameFont;
  fontSel.addEventListener("change", () => {
    settings.nameFont = fontSel.value;
    saveSettings();
    applyProfile();
    refreshPreview();
  });
  card.appendChild(fontSel);

  card.appendChild(el("div", "s-label", "Name color"));
  card.appendChild(colorSwatchRow(settings.nameColor, (c) => {
    settings.nameColor = c;
    saveSettings();
    applyProfile();
    refreshPreview();
  }));
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
  heroText.appendChild(el("p", null, "Make L yours — themes, cursor, wallpapers, sidebar, and your profile. Changes save instantly."));
  hero.appendChild(heroText);
  frag.appendChild(hero);

  const grid = el("div", "s-grid");
  grid.appendChild(themeCard());
  grid.appendChild(smoothCard());
  grid.appendChild(cursorCard());
  grid.appendChild(wallpaperCard());
  grid.appendChild(sidebarCard());
  grid.appendChild(profileCard());
  grid.appendChild(accountCard());
  frag.appendChild(grid);
  view.appendChild(frag);
  view.scrollTop = 0;
}

loadSettings();

/* ================================================================
   Downloads & Tools — page 5
   ================================================================ */

const DOWNLOAD_CATS = [
  ["browsers", "Browsers & extensions", "globe"],
  ["vpn", "VPNs", "shield"],
  ["passwords", "Password managers", "lock"],
  ["auth", "2FA & hardware keys", "key"],
  ["email", "Private email & aliasing", "mail"],
  ["chat", "Secure messaging", "chat"],
  ["dns", "DNS & ad-blocking", "network"],
  ["os", "Operating systems", "box"],
  ["defense", "Hardening & endpoint defense", "wrench"],
  ["removal", "Data removal & breach monitors", "file"],
  ["meta", "Metadata & privacy tools", "image"],
  ["storage", "Encrypted storage & backups", "archive"],
  ["phone", "Phone hardening", "phone2"],
  ["network", "Network monitoring", "activity"],
  ["share", "Secure file sharing", "share"],
  ["osint", "OSINT & recon", "search"],
  ["search", "Private search engines", "languages"],
  ["guides", "Guides & checklists", "book"],
  ["hardware", "Physical OPSEC", "camera"],
];

const DOWNLOADS = [
  /* ---- browsers & extensions ---- */
  { n: "Firefox", u: "https://www.mozilla.org/firefox/", c: "browsers", d: "The privacy baseline browser — pair it with uBlock Origin.", t: "Win · Mac · Lin · iOS · And", e: true },
  { n: "Tor Browser", u: "https://www.torproject.org/download/", c: "browsers", d: "Hardened Firefox that routes every request over Tor. Use for high-sensitivity research.", t: "Win · Mac · Lin", e: true },
  { n: "LibreWolf", u: "https://librewolf.net/", c: "browsers", d: "Privacy-focused Firefox fork with fingerprinting and telemetry removed by default.", t: "Win · Mac · Lin" },
  { n: "Brave", u: "https://brave.com/download/", c: "browsers", d: "Chromium-based with built-in ad/tracker blocking and HTTPS upgrades.", t: "Win · Mac · Lin · iOS · And" },
  { n: "uBlock Origin", u: "https://github.com/gorhill/uBlock#installation", c: "browsers", d: "Ad and tracker blocker with cosmetic filtering. Non-negotiable first install.", t: "Ext · all browsers", e: true },
  { n: "Privacy Badger", u: "https://privacybadger.org/", c: "browsers", d: "EFF's learning tracker blocker — blocks anything that tracks you across sites.", t: "Ext · Firefox/Chrome" },
  { n: "NoScript", u: "https://noscript.net/", c: "browsers", d: "Blocks JavaScript, Java and plugins by default. Highest-impact script defense.", t: "Ext · Firefox" },
  { n: "LocalCDN", u: "https://codeberg.org/nobody/LocalCDN", c: "browsers", d: "Replaces CDN requests with local resources — removes a major tracking vector.", t: "Ext · Firefox" },
  { n: "CanvasBlocker", u: "https://github.com/kkapsner/CanvasBlocker", c: "browsers", d: "Fights canvas fingerprinting with fake or spoofed APIs.", t: "Ext · Firefox" },
  { n: "Cookie AutoDelete", u: "https://github.com/Cookie-AutoDelete/Cookie-AutoDelete", c: "browsers", d: "Wipes cookies the moment a tab closes. Kills session tracking.", t: "Ext · Firefox/Chrome" },
  { n: "ClearURLs", u: "https://docs.clearurls.xyz/", c: "browsers", d: "Strips tracking parameters (utm_, fbclid…) from every URL automatically.", t: "Ext · Firefox/Chrome" },
  { n: "Multi-Account Containers", u: "https://github.com/mozilla/multi-account-containers", c: "browsers", d: "Isolate your Google/Amazon/email logins into separate cookie jars.", t: "Ext · Firefox" },
  { n: "Ghostery", u: "https://www.ghostery.com/", c: "browsers", d: "Tracker blocker with a transparent purposed trackers list.", t: "Ext · all browsers" },
  { n: "SponsorBlock", u: "https://sponsor.ajay.app/", c: "browsers", d: "Auto-skips sponsor segments and self-promos in YouTube videos.", t: "Ext · all browsers" },
  { n: "Dark Reader", u: "https://darkreader.org/", c: "browsers", d: "Dark mode for every site — also reduces OLED glare.", t: "Ext · all browsers" },

  /* ---- vpn ---- */
  { n: "Mullvad VPN", u: "https://mullvad.net/", c: "vpn", d: "Flat-rate WireGuard VPN with anonymous account numbers. Audited, no email required.", t: "Win · Mac · Lin · iOS · And", e: true },
  { n: "Proton VPN", u: "https://protonvpn.com/", c: "vpn", d: "Swiss, audited, has a genuinely free tier and secure-core servers.", t: "Win · Mac · Lin · iOS · And", e: true },
  { n: "IVPN", u: "https://www.ivpn.net/", c: "vpn", d: "No-log VPN with multi-hop and strong privacy posture.", t: "Win · Mac · Lin · iOS · And" },
  { n: "WireGuard", u: "https://www.wireguard.com/", c: "vpn", d: "The modern, audited VPN protocol — fast, simple, the standard.", t: "Win · Mac · Lin · iOS · And" },
  { n: "Tailscale", u: "https://tailscale.com/", c: "vpn", d: "Private WireGuard mesh for your own devices — access your stuff, not their network.", t: "Win · Mac · Lin · iOS · And" },
  { n: "OpenVPN", u: "https://openvpn.net/", c: "vpn", d: "Battle-tested VPN client/protocol, useful for legacy VPN providers.", t: "Win · Mac · Lin · iOS · And" },
  { n: "Riseup VPN", u: "https://riseup.net/en/vpn", c: "vpn", d: "Free activist VPN built by the collective that runs Riseup services.", t: "Win · Mac · Lin · And" },

  /* ---- password managers ---- */
  { n: "Bitwarden", u: "https://bitwarden.com/", c: "passwords", d: "Open-source password manager with cloud sync and apps everywhere. Use unique random passwords everywhere.", t: "Win · Mac · Lin · iOS · And · Web", e: true },
  { n: "KeePassXC", u: "https://keepassxc.org/", c: "passwords", d: "Fully offline vault stored in an encrypted file you control.", t: "Win · Mac · Lin" },
  { n: "Proton Pass", u: "https://proton.me/pass", c: "passwords", d: "Proton's E2EE manager with aliases and integrated 2FA.", t: "Win · Mac · iOS · And · Web" },
  { n: "1Password", u: "https://1password.com/", c: "passwords", d: "Polished premium manager with strong secret-key model.", t: "Win · Mac · Lin · iOS · And" },
  { n: "Vaultwarden", u: "https://github.com/dani-garcia/vaultwarden", c: "passwords", d: "Self-host your own Bitwarden-compatible server — no third-party cloud.", t: "Server · Docker" },

  /* ---- 2FA & hardware keys ---- */
  { n: "Aegis Authenticator", u: "https://getaegis.app/", c: "auth", d: "Open-source 2FA app with encrypted, exportable vaults.", t: "Android", e: true },
  { n: "Ente Auth", u: "https://ente.io/auth/", c: "auth", d: "Cross-platform authenticator with E2EE backup of your codes.", t: "iOS · And · Web" },
  { n: "YubiKey 5", u: "https://www.yubico.com/", c: "auth", d: "Hardware security key — the strongest second factor. Put one on your email account.", t: "USB-C / NFC", e: true },
  { n: "Nitrokey 3", u: "https://www.nitrokey.com/", c: "auth", d: "Open-source hardware key supporting FIDO2 and PGP.", t: "USB-C / NFC" },
  { n: "Raivo OTP", u: "https://raivo-otp.com/", c: "auth", d: "iOS 2FA with iCloud backup and biometrics.", t: "iOS" },

  /* ---- private email & aliasing ---- */
  { n: "SimpleLogin", u: "https://simplelogin.io/", c: "email", d: "Generate an alias per service so the real address never leaks. Kill an alias anytime.", t: "Web · iOS · And · Ext", e: true },
  { n: "DuckDuckGo Email Protection", u: "https://duckduckgo.com/email/", c: "email", d: "Free @duck.com aliases that strip trackers from forwarded mail.", t: "Web · Ext" },
  { n: "Addy.io", u: "https://addy.io/", c: "email", d: "Open-source, self-hostable alias service with shared domains.", t: "Web · And · Ext" },
  { n: "Proton Mail", u: "https://proton.me/mail", c: "email", d: "Swiss E2EE email with zero-access encryption and aliases.", t: "Web · iOS · And", e: true },
  { n: "Tuta (Tutanota)", u: "https://tuta.com/", c: "email", d: "E2EE email that also encrypts subject lines.", t: "Web · iOS · And" },

  /* ---- secure messaging ---- */
  { n: "Signal", u: "https://signal.org/download/", c: "chat", d: "The default for anything sensitive — audited E2EE, disappearing messages.", t: "iOS · And · Win · Mac · Lin", e: true },
  { n: "Session", u: "https://getsession.org/", c: "chat", d: "Metadata-minimizing messenger — no phone number required.", t: "iOS · And · Win · Mac · Lin" },
  { n: "SimpleX Chat", u: "https://simplex.chat/", c: "chat", d: "No user IDs at all — nobody knows who you are on the network.", t: "iOS · And · Win · Mac · Lin" },
  { n: "Element", u: "https://element.io/", c: "chat", d: "Client for the federated Matrix protocol — run your own server.", t: "iOS · And · Win · Mac · Lin · Web" },
  { n: "Threema", u: "https://threema.ch/", c: "chat", d: "Paid E2EE messenger that works without a phone number.", t: "iOS · And" },
  { n: "Briar", u: "https://briarproject.org/", c: "chat", d: "P2P messaging over Tor or Bluetooth — survives network blackouts.", t: "Android" },
  { n: "Wire", u: "https://wire.com/", c: "chat", d: "E2EE team messenger with self-hosting options.", t: "iOS · And · Win · Mac · Lin · Web" },

  /* ---- dns & ad-blocking ---- */
  { n: "NextDNS", u: "https://nextdns.io/", c: "dns", d: "Configurable DNS filtering — blocks trackers, ads and malicious domains network-wide.", t: "Web · Win · Mac · iOS · And · Router", e: true },
  { n: "Quad9", u: "https://quad9.net/", c: "dns", d: "DNS that blocks known malicious domains. Set it as your system resolver.", t: "All devices", e: true },
  { n: "AdGuard Home", u: "https://adguard.com/en/adguard-home/", c: "dns", d: "Self-hosted DNS-level ad/tracker blocking for your whole network.", t: "Server · Docker · Raspberry Pi" },
  { n: "Pi-hole", u: "https://pi-hole.net/", c: "dns", d: "Network-wide ad blocking on a Raspberry Pi with a dashboard.", t: "Raspberry Pi · Linux" },
  { n: "dnscrypt-proxy", u: "https://github.com/DNSCrypt/dnscrypt-proxy", c: "dns", d: "Encrypted DNS proxy with relay and filtering support.", t: "Win · Mac · Lin" },

  /* ---- operating systems ---- */
  { n: "Tails", u: "https://tails.net/", c: "os", d: "Amnesic OS from a USB stick — leaves no trace on the machine, forces Tor.", t: "USB · x86", e: true },
  { n: "Qubes OS", u: "https://www.qubes-os.org/", c: "os", d: "Compartmentalized desktop — every task in its own disposable VM.", t: "x86", e: true },
  { n: "Whonix", u: "https://www.whonix.org/", c: "os", d: "Tor-focused gateway + workstation VMs, runnable inside VirtualBox/Qubes.", t: "VM · x86" },
  { n: "Linux Mint", u: "https://linuxmint.com/", c: "os", d: "Easy, privacy-respecting desktop for daily use away from Windows telemetry.", t: "x86" },
  { n: "Fedora", u: "https://fedoraproject.org/", c: "os", d: "Current, well-maintained distro with sane security defaults.", t: "x86 · ARM" },
  { n: "Debian", u: "https://www.debian.org/", c: "os", d: "Stable base with zero telemetry — the most common server/workstation pick.", t: "x86 · ARM" },
  { n: "Pop!_OS", u: "https://pop.system76.com/", c: "os", d: "Polished Ubuntu-based desktop from System76, good out of the box.", t: "x86" },
  { n: "Arch Linux", u: "https://archlinux.org/", c: "os", d: "Rolling-release DIY distro — you know exactly what's installed.", t: "x86" },

  /* ---- hardening & endpoint defense ---- */
  { n: "Microsoft Defender", u: "https://www.microsoft.com/windows/microsoft-defender", c: "defense", d: "Built into Windows — turn on tamper protection and keep it updated.", t: "Windows", e: true },
  { n: "CrowdStrike Falcon", u: "https://www.crowdstrike.com/", c: "defense", d: "Industry-standard EDR if you handle sensitive data or run ops.", t: "Win · Mac · Lin" },
  { n: "SentinelOne", u: "https://www.sentinelone.com/", c: "defense", d: "AI EDR/XDR with rollback and remote response.", t: "Win · Mac · Lin" },
  { n: "Bitdefender", u: "https://www.bitdefender.com/", c: "defense", d: "Lightweight AV with strong real-time protection.", t: "Win · Mac · And" },
  { n: "Malwarebytes", u: "https://www.malwarebytes.com/", c: "defense", d: "Second-opinion scanner for adware and PUPs AV misses.", t: "Win · Mac · And" },
  { n: "O&O ShutUp10++", u: "https://www.oo-software.com/en/shutup10", c: "defense", d: "One-click disabling of Windows telemetry, ads and tracking.", t: "Windows", e: true },
  { n: "WPD (Windows Privacy Dashboard)", u: "https://wpd.app/", c: "defense", d: "Fine-grained Windows privacy toggles without the bloat.", t: "Windows" },
  { n: "osquery", u: "https://www.osquery.io/", c: "defense", d: "Expose your OS as a queryable database for endpoint visibility.", t: "Win · Mac · Lin" },
  { n: "Wazuh", u: "https://wazuh.com/", c: "defense", d: "Open-source XDR/SIEM — file integrity, detection and alerting.", t: "Server · Agents" },
  { n: "Velociraptor", u: "https://docs.velociraptor.app/", c: "defense", d: "Endpoint visibility and forensic collection at scale.", t: "Win · Mac · Lin · Server" },

  /* ---- data removal & breach monitors ---- */
  { n: "DeleteMe", u: "https://joindeleteme.com/", c: "removal", d: "Pays a team to remove you from people-search sites, quarterly.", t: "Service", e: true },
  { n: "Incogni", u: "https://incogni.com/", c: "removal", d: "Automated broker/data-seller opt-outs on your behalf.", t: "Service" },
  { n: "Redact", u: "https://www.redact.dev/", c: "removal", d: "Data removal plus a free data-minimization dashboard.", t: "Service" },
  { n: "Removaly", u: "https://removaly.com/", c: "removal", d: "Continuous broker removal with monitoring.", t: "Service" },
  { n: "Optery", u: "https://optery.com/", c: "removal", d: "Free exposure scan plus paid removal packages.", t: "Service" },
  { n: "EasyOptOut", u: "https://easyoptout.com/", c: "removal", d: "Free, community-maintained opt-out guides for hundreds of sites.", t: "Web", e: true },
  { n: "Have I Been Pwned", u: "https://haveibeenpwned.com/", c: "removal", d: "Check every email against breach databases. Subscribe to alerts.", t: "Web", e: true },
  { n: "Google Remove Information", u: "https://reportcontent.google.com/", c: "removal", d: "Official form to remove sensitive personal info from Google results.", t: "Web" },
  { n: "BrandYourself", u: "https://brandyourself.com/", c: "removal", d: "Reputation management — push the results about you that you control.", t: "Service" },

  /* ---- metadata & privacy tools ---- */
  { n: "ExifTool", u: "https://exiftool.org/", c: "meta", d: "Read and strip EXIF/GPS/camera metadata from any file.", t: "Win · Mac · Lin", e: true },
  { n: "mat2", u: "https://0xacab.org/jvoisin/mat2", c: "meta", d: "CLI metadata scrubber with a GNOME integration.", t: "Lin" },
  { n: "ImageOptim", u: "https://imageoptim.com/", c: "meta", d: "Mac app that strips metadata while compressing images.", t: "Mac" },
  { n: "FFmpeg", u: "https://ffmpeg.org/", c: "meta", d: "Strip metadata and re-encode media with full control.", t: "Win · Mac · Lin" },
  { n: "Photo Exif Editor", u: "https://play.google.com/store/apps/details?id=com.rtst", c: "meta", d: "View and wipe EXIF before you post from Android.", t: "Android" },

  /* ---- encrypted storage & backups ---- */
  { n: "Cryptomator", u: "https://cryptomator.org/", c: "storage", d: "Client-side encryption on top of any cloud (Drive, Dropbox).", t: "Win · Mac · Lin · iOS · And", e: true },
  { n: "VeraCrypt", u: "https://veracrypt.fr/", c: "storage", d: "Full-disk and container encryption — the gold standard.", t: "Win · Mac · Lin", e: true },
  { n: "Proton Drive", u: "https://proton.me/drive", c: "storage", d: "E2EE cloud storage with zero-access encryption.", t: "Web · iOS · And" },
  { n: "Tresorit", u: "https://tresorit.com/", c: "storage", d: "Swiss E2EE cloud storage aimed at businesses.", t: "Win · Mac · iOS · And · Web" },
  { n: "Syncthing", u: "https://syncthing.net/", c: "storage", d: "Peer-to-peer sync between your own devices — no cloud at all.", t: "Win · Mac · Lin · And" },
  { n: "Restic", u: "https://restic.net/", c: "storage", d: "Fast, encrypted, deduplicated backups to any destination.", t: "Win · Mac · Lin" },
  { n: "BorgBackup", u: "https://www.borgbackup.org/", c: "storage", d: "Deduplicating encrypted backups with append-only logs.", t: "Lin · Mac" },

  /* ---- phone hardening ---- */
  { n: "GrapheneOS", u: "https://grapheneos.org/", c: "phone", d: "Hardened Android with no Google services. The gold standard for Pixel.", t: "Google Pixel", e: true },
  { n: "CalyxOS", u: "https://calyxos.org/", c: "phone", d: "Privacy-focused Android with the microG option.", t: "Pixel" },
  { n: "NetGuard", u: "https://www.netguard.me/", c: "phone", d: "Per-app firewall without root — block everything you don't need.", t: "Android", e: true },
  { n: "TrackerControl", u: "https://trackercontrol.org/", c: "phone", d: "Block and observe trackers inside your installed apps.", t: "Android" },
  { n: "Shelter", u: "https://gitea.cellular.europe.fynu.com/04-Typo/untitled-gaming-hub/src/branch/master/app/src", c: "phone", d: "Sandbox apps into a work profile so they can't see each other.", t: "Android" },
  { n: "Aurora Store", u: "https://auroraoss.com/", c: "phone", d: "Anonymous access to the Play catalog without a Google account.", t: "Android" },
  { n: "F-Droid", u: "https://f-droid.org/", c: "phone", d: "App store of only free and open-source software.", t: "Android", e: true },
  { n: "AdAway", u: "https://adaway.org/", c: "phone", d: "Hosts-file ad blocking on rooted Android.", t: "Android (root)" },
  { n: "iOS Lockdown Mode", u: "https://support.apple.com/guide/iphone/iphd16102c88/", c: "phone", d: "Apple's extreme-hardening mode — switch it on for high-risk profiles.", t: "iOS" },

  /* ---- network monitoring ---- */
  { n: "Wireshark", u: "https://www.wireshark.org/", c: "network", d: "The packet analyzer — see exactly what leaves your machine.", t: "Win · Mac · Lin", e: true },
  { n: "Portmaster", u: "https://safing.io/", c: "network", d: "Open-source firewall that shows every app's connections in real time.", t: "Win · Lin" },
  { n: "OpenSnitch", u: "https://github.com/evilsocket/opensnitch", c: "network", d: "Interactive per-application firewall for Linux.", t: "Lin" },
  { n: "Little Snitch", u: "https://www.obdev.at/products/littlesnitch/", c: "network", d: "Mac firewall that alerts on every outbound connection.", t: "Mac" },
  { n: "GlassWire", u: "https://www.glasswire.com/", c: "network", d: "Network monitor with bandwidth graphs and alerts.", t: "Win · And" },
  { n: "Nmap", u: "https://nmap.org/", c: "network", d: "Port scanning and network discovery for auditing your own setup.", t: "Win · Mac · Lin" },

  /* ---- secure file sharing ---- */
  { n: "OnionShare", u: "https://onionshare.org/", c: "share", d: "Share files over an anonymous Tor service — server-less and ephemeral.", t: "Win · Mac · Lin", e: true },
  { n: "Magic Wormhole", u: "https://github.com/magic-wormhole/magic-wormhole", c: "share", d: "Send files directly peer-to-peer with a short code.", t: "Win · Mac · Lin" },
  { n: "croc", u: "https://github.com/schollz/croc", c: "share", d: "Secure peer-to-peer file transfer over a relay.", t: "Win · Mac · Lin" },
  { n: "Firefox Send (decommissioned)", u: "https://send.vis.ee/", c: "share", d: "Unofficial resurrection of E2EE self-destructing file sharing.", t: "Web" },

  /* ---- OSINT & recon ---- */
  { n: "Maltego", u: "https://www.maltego.com/", c: "osint", d: "Visual link analysis across people, domains, IPs and orgs.", t: "Win · Mac · Lin" },
  { n: "SpiderFoot", u: "https://www.spiderfoot.net/", c: "osint", d: "Automated OSINT collection across 200+ modules.", t: "Web · Server" },
  { n: "Recon-ng", u: "https://github.com/lanmaster53/recon-ng", c: "osint", d: "Modular reconnaissance framework with a Metasploit-style console.", t: "Lin" },
  { n: "theHarvester", u: "https://github.com/laramies/theHarvester", c: "osint", d: "Email, domain and employee reconnaissance from public sources.", t: "Lin" },
  { n: "Amass", u: "https://github.com/owasp-amass/amass", c: "osint", d: "OWASP attack-surface mapping — subdomains, certs, ASNs.", t: "Win · Mac · Lin" },
  { n: "Sublist3r", u: "https://github.com/aboul3la/Sublist3r", c: "osint", d: "Fast subdomain enumeration using many public sources.", t: "Lin" },
  { n: "Shodan", u: "https://www.shodan.io/", c: "osint", d: "Search the entire internet of exposed devices and services.", t: "Web · API" },
  { n: "Hunchly", u: "https://www.hunch.ly/", c: "osint", d: "Capture and archive every page you visit for later evidence.", t: "Win · Mac" },

  /* ---- private search engines ---- */
  { n: "DuckDuckGo", u: "https://duckduckgo.com/", c: "search", d: "No-tracker search with its own independent index.", t: "Web", e: true },
  { n: "Startpage", u: "https://www.startpage.com/", c: "search", d: "Google-grade results without Google tracking.", t: "Web" },
  { n: "SearXNG", u: "https://github.com/searxng/searxng", c: "search", d: "Self-hosted metasearch across dozens of engines — no logs.", t: "Server · Docker" },
  { n: "Brave Search", u: "https://search.brave.com/", c: "search", d: "Independent index with an anonymous option.", t: "Web" },
  { n: "Mojeek", u: "https://www.mojeek.com/", c: "search", d: "Fully independent crawler, no results from Google/Bing.", t: "Web" },

  /* ---- guides & checklists ---- */
  { n: "Privacy Guides", u: "https://www.privacyguides.org/", c: "guides", d: "The definitive, no-hype privacy tool recommendations.", t: "Web", e: true },
  { n: "EFF Surveillance Self-Defense", u: "https://ssd.eff.org/", c: "guides", d: "Threat-modeling and defense guides from the EFF.", t: "Web", e: true },
  { n: "EFF Cover Your Tracks", u: "https://coveryourtracks.eff.org/", c: "guides", d: "Test how trackable your browser fingerprint actually is.", t: "Web", e: true },
  { n: "Tor Project", u: "https://www.torproject.org/", c: "guides", d: "The onion routing network — documentation and safety guides.", t: "Web" },
  { n: "PRISM Break", u: "https://prism-break.org/", c: "guides", d: "Alternative-software directory organized by what it replaces.", t: "Web" },
  { n: "OWASP MASVS", u: "https://mas.owasp.org/", c: "guides", d: "Mobile app security verification standard — harden your own apps.", t: "Web" },

  /* ---- physical OPSEC ---- */
  { n: "Faraday bag", u: "https://www.amazon.com/s?k=faraday+bag+phone", c: "hardware", d: "Signal-isolated sleeve for phone/laptop — kills cellular, Wi-Fi, NFC.", t: "Carry item" },
  { n: "YubiKey / Nitrokey", u: "https://www.yubico.com/", c: "hardware", d: "Keep your hardware keys separate from your devices.", t: "Carry item" },
  { n: "Camera & mic covers", u: "https://www.amazon.com/s?k=laptop+webcam+cover", c: "hardware", d: "Physical camera/mic covers — the only 100% effective disable.", t: "Carry item" },
  { n: "Privacy screen filter", u: "https://www.amazon.com/s?k=privacy+screen+filter", c: "hardware", d: "Limits screen viewing angle on transit and in offices.", t: "Carry item" },
  { n: "USB data blocker", u: "https://www.amazon.com/s?k=usb+data+blocker+charge+only", c: "hardware", d: "Charge from unknown ports without data connectivity.", t: "Carry item" },
  { n: "Signal-muting device pouch", u: "https://www.amazon.com/s?k=signal+blocking+device+pouch", c: "hardware", d: "Faraday pouch for meeting-time isolation of phones.", t: "Carry item" },
];

function renderDownloads() {
  setPageTitle("Downloads");
  setStatus("ok");
  const view = document.getElementById("page-view");
  view.classList.remove("hidden");
  view.innerHTML = "";
  const frag = document.createDocumentFragment();

  const hero = el("div", "page-hero");
  const pageIco = el("div", "page-ico");
  pageIco.innerHTML = svg("download");
  hero.appendChild(pageIco);
  const heroText = el("div");
  heroText.appendChild(el("h1", null, "Downloads & Tools"));
  heroText.appendChild(el("p", null, "Everything to install, run and carry to stay untrackable — " + DOWNLOADS.length + " tools across browsers, VPNs, EDR, broker removal, encrypted storage and physical OPSEC."));
  hero.appendChild(heroText);
  frag.appendChild(hero);

  const bar = el("div", "d-bar");
  const search = el("input", "q d-search");
  search.type = "search";
  search.placeholder = "Search " + DOWNLOADS.length + " tools…";
  search.autocomplete = "off";
  search.spellcheck = false;
  bar.appendChild(search);

  const chips = el("div", "d-chips");
  const all = el("button", "chip active", "All");
  chips.appendChild(all);
  for (const [id, label] of DOWNLOAD_CATS) {
    const b = el("button", "chip", label);
    b.dataset.cat = id;
    b.addEventListener("click", () => {
      chips.querySelectorAll(".chip").forEach((x) => x.classList.toggle("active", x === b));
      renderGrid();
    });
    chips.appendChild(b);
  }
  bar.appendChild(chips);
  frag.appendChild(bar);

  const grid = el("div", "d-grid");
  frag.appendChild(grid);
  view.appendChild(frag);
  view.scrollTop = 0;

  function renderGrid() {
    const activeCat = (chips.querySelector(".chip.active") || all).dataset.cat || "all";
    const term = search.value.trim().toLowerCase();
    grid.innerHTML = "";
    let count = 0;
    for (const [catId, catLabel, icon] of DOWNLOAD_CATS) {
      if (activeCat !== "all" && activeCat !== catId) continue;
      const items = DOWNLOADS.filter((it) => {
        if (it.c !== catId) return false;
        if (!term) return true;
        return (it.n + " " + it.d + " " + (it.t || "")).toLowerCase().includes(term);
      });
      if (!items.length) continue;
      const sec = el("section", "d-cat");
      const head = el("div", "d-cat-head");
      const ic = el("span", "d-cat-ico");
      ic.innerHTML = svg(icon);
      head.appendChild(ic);
      head.appendChild(el("h2", null, catLabel));
      head.appendChild(el("span", "d-count", items.length + " tools"));
      sec.appendChild(head);
      for (const it of items) {
        const a = el("a", "d-item" + (it.e ? " essential" : ""), "");
        a.href = it.u;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        const name = el("div", "d-name");
        name.appendChild(el("strong", null, it.n));
        if (it.e) name.appendChild(el("span", "d-badge", "essential"));
        a.appendChild(name);
        a.appendChild(el("div", "d-desc", it.d));
        if (it.t) a.appendChild(el("div", "d-tags", it.t));
        const arrow = el("span", "ext-arrow");
        arrow.innerHTML = svg("arrow");
        a.appendChild(arrow);
        sec.appendChild(a);
        count++;
      }
      grid.appendChild(sec);
    }
    if (!count) grid.appendChild(el("div", "state", "No matches."));
  }

  search.addEventListener("input", renderGrid);
  renderGrid();
}

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
    const z = settings.cursorSize / 100;
    const dotF = 0.55 - (settings.cursorSmooth / 100) * 0.37;
    const ringF = 0.22 - (settings.cursorSmooth / 100) * 0.17;
    dx += (mx - dx) * dotF; dy += (my - dy) * dotF;
    rx += (mx - rx) * ringF; ry += (my - ry) * ringF;
    const s = down ? 0.85 : 1;
    dot.style.transform = `translate(${dx}px,${dy}px) translate(-50%,-50%) scale(${s * z})`;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%) scale(${s * z})`;
    requestAnimationFrame(loop);
  })();

  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("a, button, input, select, textarea, label");
    document.body.classList.toggle("cursor-hover", Boolean(t));
  });
})();

/* ================================================================
   Animated wallpapers — canvas backdrops rendered on-device
   ================================================================ */

let _wpCanvas = null;
let _wpCtx = null;
function wpGet() {
  if (!_wpCanvas) {
    _wpCanvas = document.getElementById("wallpaper");
    _wpCtx = _wpCanvas ? _wpCanvas.getContext("2d") : null;
  }
  return _wpCanvas;
}
function wpDPR() { return Math.min(window.devicePixelRatio || 1, 2); }

function sizeWallpaper() {
  const cv = wpGet();
  if (!cv) return;
  const dpr = wpDPR();
  cv.width = Math.max(1, Math.floor(innerWidth * dpr));
  cv.height = Math.max(1, Math.floor(innerHeight * dpr));
  if (_wpCtx) _wpCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

let wpState = {};
let wpRaf = 0;
let activeWpId = "";
let activeWpDim = -1;

function applyWallpaper() {
  const cv = wpGet();
  if (!cv) return;
  const id = settings.wallpaper in WALLPAPERS ? settings.wallpaper : "none";
  const dim = (0.08 + (settings.wallpaperDim / 100) * 0.85).toFixed(2);
  cv.style.opacity = dim;
  if (id === activeWpId && dim === activeWpDim) return;
  activeWpId = id;
  activeWpDim = dim;
  cancelAnimationFrame(wpRaf);
  wpState = {};
  if (id === "none") { cv.classList.add("hidden"); return; }
  cv.classList.remove("hidden");
  const draw = WALLPAPERS[id].draw;
  if (!draw) return;
  const t0 = performance.now();
  (function loop(now) {
    const t = (now - t0) / 1000;
    if (_wpCtx) {
      const w = cv.width / wpDPR();
      const h = cv.height / wpDPR();
      _wpCtx.clearRect(0, 0, w, h);
      try { draw(_wpCtx, w, h, t, wpState); } catch (e) {}
    }
    wpRaf = requestAnimationFrame(loop);
  })(t0);
}

window.addEventListener("resize", () => { sizeWallpaper(); wpState = {}; });

const _thumbState = {};
function startThumbPreviews(container) {
  (function tick() {
    requestAnimationFrame(tick);
    if (!container.isConnected) return;
    const t = performance.now() / 1000;
    container.querySelectorAll(".wp-thumb").forEach((b) => {
      const id = b.dataset.wp;
      const cv = b.querySelector("canvas");
      if (!cv || !cv.isConnected) return;
      const draw = WALLPAPERS[id] && WALLPAPERS[id].draw;
      const ctx = cv.getContext("2d");
      const w = cv.width, h = cv.height;
      if (!_thumbState[id]) _thumbState[id] = {};
      ctx.clearRect(0, 0, w, h);
      if (!draw) return;
      try { draw(ctx, w, h, t, _thumbState[id]); } catch (e) {}
    });
  })();
}

const WALLPAPERS = {
  none: { name: "None", draw: null },
  aurora: { name: "Aurora", draw: drawAurora },
  matrix: { name: "Matrix", draw: drawMatrix },
  particles: { name: "Particles", draw: drawParticles },
  waves: { name: "Waves", draw: drawWaves },
  grid: { name: "Grid", draw: drawGrid },
  rain: { name: "Rain", draw: drawRain },
  ember: { name: "Ember", draw: drawEmber },
  radar: { name: "Radar", draw: drawRadar },
  circuit: { name: "Circuit", draw: drawCircuit },
  snow: { name: "Snow", draw: drawSnow },
  scan: { name: "Scanline", draw: drawScan },
};

function drawAurora(ctx, w, h, t, st) {
  const blobs = st.blobs || (st.blobs = [
    { hue: 222, r: 0.55, sx: 0.31, sy: 0.16, ax: 0.12, ay: 0.1, sp: 0.06 },
    { hue: 178, r: 0.5, sx: 0.74, sy: 0.3, ax: 0.14, ay: 0.09, sp: 0.045 },
    { hue: 292, r: 0.62, sx: 0.44, sy: 0.78, ax: 0.1, ay: 0.13, sp: 0.05 },
    { hue: 140, r: 0.44, sx: 0.86, sy: 0.86, ax: 0.12, ay: 0.08, sp: 0.04 },
  ]);
  for (const b of blobs) {
    const x = w * (b.sx + Math.sin(t * b.sp + b.ax) * b.ax);
    const y = h * (b.sy + Math.cos(t * b.sp * 0.8 + b.ay) * b.ay);
    const rad = Math.max(w, h) * b.r;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `hsla(${b.hue}, 95%, 62%, 0.15)`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawMatrix(ctx, w, h, t, st) {
  const glyphs = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789";
  st.cols = st.cols || (() => {
    const n = Math.max(12, Math.floor(w / 18));
    const a = [];
    for (let i = 0; i < n; i++) a.push({ i, y: Math.random() * h, v: 0.4 + Math.random() * 0.9 });
    return a;
  })();
  ctx.font = "13px monospace";
  for (const c0 of st.cols) {
    const x = c0.i * 18 + 2;
    ctx.fillStyle = hexToRgba(cachedAccent, 0.5);
    ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], x, c0.y);
    ctx.fillStyle = hexToRgba(cachedAccent, 0.95);
    ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], x, c0.y - 14);
    c0.y += c0.v * 1.5;
    if (c0.y > h + 22) { c0.y = -22; c0.v = 0.4 + Math.random() * 0.9; }
  }
}

function drawParticles(ctx, w, h, t, st) {
  st.n = st.n || Math.min(85, Math.floor((w * h) / 16000));
  st.pts = st.pts || (() => {
    const a = [];
    for (let i = 0; i < st.n; i++) {
      a.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.32, vy: (Math.random() - 0.5) * 0.32 });
    }
    return a;
  })();
  for (const p of st.pts) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;
  }
  for (let i = 0; i < st.n; i++) {
    for (let j = i + 1; j < st.n; j++) {
      const a = st.pts[i], b = st.pts[j];
      const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
      if (d2 < 10000) {
        ctx.strokeStyle = hexToRgba(cachedAccent, 0.16 * (1 - d2 / 10000));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
  }
  ctx.fillStyle = hexToRgba(cachedAccent, 0.4);
  for (const p of st.pts) ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
}

function drawWaves(ctx, w, h, t, st) {
  const base = h * 0.6;
  ctx.lineWidth = 2;
  for (let l = 0; l < 3; l++) {
    const amp = 28 + l * 16;
    const freq = 0.008 + l * 0.003;
    const sp = 0.9 + l * 0.5;
    ctx.strokeStyle = hexToRgba(cachedAccent, 0.34 - l * 0.08);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const y = base + Math.sin(x * freq + t * sp + l * 2.1) * amp + l * 60;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawGrid(ctx, w, h, t, st) {
  const horizon = h * 0.72;
  const cx = w / 2;
  ctx.strokeStyle = hexToRgba(cachedAccent, 0.22);
  ctx.lineWidth = 1;
  for (let i = -12; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 40, horizon);
    ctx.lineTo(cx + i * 56, h);
    ctx.stroke();
  }
  const rows = 14, speed = 0.22;
  for (let i = 0; i < rows; i++) {
    const z = ((i + (t * speed % 1)) / rows);
    const y = horizon + (h - horizon) * z * z;
    ctx.globalAlpha = 0.05 + z * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const sun = ctx.createLinearGradient(cx - 90, horizon - 170, cx + 90, horizon);
  sun.addColorStop(0, hexToRgba(cachedAccent, 0.05));
  sun.addColorStop(1, hexToRgba(cachedAccent, 0.45));
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(cx, horizon, 80, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
}

function drawRain(ctx, w, h, t, st) {
  st.drops = st.drops || (() => {
    const n = Math.min(120, Math.floor((w * h) / 12000));
    const a = [];
    for (let i = 0; i < n; i++) a.push({ x: Math.random() * w, y: Math.random() * h, len: 12 + Math.random() * 16, sp: 6 + Math.random() * 7 });
    return a;
  })();
  ctx.strokeStyle = hexToRgba(cachedAccent, 0.35);
  ctx.lineWidth = 1.5;
  for (const d of st.drops) {
    d.y += d.sp * 0.9;
    d.x -= d.sp * 0.12;
    if (d.y > h + 20) { d.y = -20; d.x = Math.random() * w; }
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - d.len * 0.14, d.y - d.len);
    ctx.stroke();
  }
}

function drawEmber(ctx, w, h, t, st) {
  st.p = st.p || (() => {
    const n = Math.min(80, Math.floor((w * h) / 14000));
    const a = [];
    for (let i = 0; i < n; i++) {
      a.push({ x: Math.random() * w, y: h + Math.random() * h, r: 1 + Math.random() * 2, sp: 0.3 + Math.random() * 0.9, ph: Math.random() * 6.2832 });
    }
    return a;
  })();
  for (const p of st.p) {
    p.y -= p.sp;
    p.x += Math.sin(t * 0.8 + p.ph) * 0.4;
    if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
    const a = Math.min(1, (h - p.y) / h + 0.2);
    ctx.fillStyle = `rgba(251,146,60,${(0.14 * a).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, 6.2832); ctx.fill();
    ctx.fillStyle = `rgba(251,146,60,${(0.5 * a).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
  }
}

function drawRadar(ctx, w, h, t, st) {
  const r = Math.min(w, h) * 0.42;
  const cx = w / 2, cy = h * 0.55;
  ctx.strokeStyle = hexToRgba(cachedAccent, 0.2);
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath(); ctx.arc(cx, cy, r * i / 4, 0, 6.2832); ctx.stroke();
  }
  const ang = t * 1.2;
  ctx.fillStyle = hexToRgba(cachedAccent, 0.12);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, ang - 0.35, ang);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexToRgba(cachedAccent, 0.7);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
  ctx.stroke();
  st.blips = st.blips || (() => {
    const a = [];
    for (let i = 0; i < 12; i++) a.push({ ang: Math.random() * 6.2832, dist: Math.random() * r });
    return a;
  })();
  for (const b of st.blips) {
    if (((ang - b.ang) % 6.2832 + 6.2832) % 6.2832 > 0.55) continue;
    const bx = cx + Math.cos(b.ang) * b.dist;
    const by = cy + Math.sin(b.ang) * b.dist;
    ctx.fillStyle = hexToRgba(cachedAccent, 0.9);
    ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, 6.2832); ctx.fill();
  }
}

function drawCircuit(ctx, w, h, t, st) {
  st.nodes = st.nodes || (() => {
    const cols = Math.max(6, Math.floor(w / 80));
    const rows = Math.max(4, Math.floor(h / 70));
    const a = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        a.push({ x: 40 + c * 80 + (Math.random() * 14 - 7), y: 40 + r * 70 + (Math.random() * 12 - 6) });
      }
    }
    return a;
  })();
  ctx.strokeStyle = hexToRgba(cachedAccent, 0.2);
  ctx.fillStyle = hexToRgba(cachedAccent, 0.5);
  for (const n of st.nodes) {
    ctx.beginPath(); ctx.arc(n.x, n.y, 2, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(n.x + 30, n.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(n.x, n.y + 24); ctx.stroke();
  }
  st.pulses = st.pulses || (() => {
    const a = [];
    for (let i = 0; i < 12; i++) a.push({ s: Math.random(), v: 0.012 + Math.random() * 0.012 });
    return a;
  })();
  for (const p of st.pulses) {
    p.s += p.v;
    if (p.s > 1) p.s = 0;
    const i = Math.floor(p.s * (st.nodes.length - 1));
    const n = st.nodes[i], m = st.nodes[i + 1];
    if (!n || !m) continue;
    const f = p.s * (st.nodes.length - 1) - i;
    const px = n.x + (m.x - n.x) * f;
    const py = n.y + (m.y - n.y) * f;
    ctx.fillStyle = hexToRgba(cachedAccent, 0.9);
    ctx.beginPath(); ctx.arc(px, py, 2.4, 0, 6.2832); ctx.fill();
  }
}

function drawSnow(ctx, w, h, t, st) {
  st.fl = st.fl || (() => {
    const n = Math.min(90, Math.floor((w * h) / 16000));
    const a = [];
    for (let i = 0; i < n; i++) a.push({ x: Math.random() * w, y: Math.random() * h, r: 0.8 + Math.random() * 1.8, sp: 0.3 + Math.random() * 0.7, ph: Math.random() * 6.2832 });
    return a;
  })();
  ctx.fillStyle = "rgba(226,232,240,0.8)";
  for (const f of st.fl) {
    f.y += f.sp;
    f.x += Math.sin(t * 0.7 + f.ph) * 0.35;
    if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.2832); ctx.fill();
  }
}

function drawScan(ctx, w, h, t, st) {
  const y = (t * 0.25 % 1) * h;
  const g = ctx.createLinearGradient(0, y - 90, 0, y + 90);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.5, hexToRgba(cachedAccent, 0.45));
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 90, w, 180);
  ctx.fillStyle = "rgba(0,0,0,0.14)";
  for (let i = 0; i < h; i += 3) ctx.fillRect(0, i, w, 1);
  ctx.fillStyle = hexToRgba(cachedAccent, 0.8);
  ctx.fillRect(0, y - 1, w, 2);
}

sizeWallpaper();
applyWallpaper();
applySettings();

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
  if (ev.key === "Escape") { closeSidebar(); closePalette(); closeProfile(); return; }
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
    ev.preventDefault();
    openPalette();
    return;
  }
  if (ev.key === "1" || ev.key === "2" || ev.key === "3" || ev.key === "4" || ev.key === "5" || ev.key === "6" || ev.key === "7") {
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
  setActiveNav("tool", "__none__");
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
    ["settings", "Settings", "Themes · cursor · wallpapers · sidebar · profile", "4", "gear"],
    ["downloads", "Downloads & Tools", "Install & harden — VPNs, EDR, broker removal, encrypted storage", "5", "download"],
    ["investigations", "Investigations", "Saved cases — targets, notes, and results over time", "6", "folder"],
    ["ai", "AI Assistant", "General-purpose chat — ask questions, get things done", "7", "sparkles"],
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
  if (input.classList && input.classList.contains("pal-input")) return;
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
      const ch = shown[i] === " " ? "\u00A0" : shown[i];
      parts.push(`<span class="ti-char${isNew ? " ti-in" : ""}"${st}>${esc(ch)}</span>`);
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
  applyProfile();
  runBoot(() => {
    setPageActive(1);
    renderHome();
    toast("Welcome back, " + email, "ok");
    processDeepLink();
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

/* ================================================================
   Profile modal — click the profile chip at the bottom of the sidebar
   ================================================================ */

let profileTypeTimer = 0;

function logout() {
  fetch("/api/auth/logout", { method: "POST" }).finally(() => {
    closeProfile();
    showAuth();
    setAuthTab("login");
    formLogin.reset();
    formRegister.reset();
    toast("Logged out.");
  });
}

function typeProfileName(node) {
  clearTimeout(profileTypeTimer);
  const name = (settings.name || "").trim() || sessionEmail || "";
  if (!name) return;
  const m = 1.4 - (settings.type / 100) * 1.05;
  let pos = 0, deleting = false;
  (function tick() {
    node.textContent = name.slice(0, pos);
    if (!deleting) {
      pos++;
      if (pos === name.length) {
        deleting = true;
        profileTypeTimer = setTimeout(tick, 2200 * m);
        return;
      }
      profileTypeTimer = setTimeout(tick, (34 + Math.random() * 40) * m);
    } else {
      pos--;
      if (pos === 0) { pos = 1; deleting = false; }
      profileTypeTimer = setTimeout(tick, 16 * m);
    }
  })();
}

function openProfile() {
  let modal = document.getElementById("profile-modal");
  if (!modal) {
    modal = el("div", "profile-modal");
    modal.id = "profile-modal";
    modal.innerHTML =
      `<div class="p-card">` +
        `<div class="p-banner">` +
          `<span class="p-av"></span>` +
          `<div class="p-name-wrap"><span class="p-name"></span><span class="p-caret"></span></div>` +
          `<div class="p-tag"></div>` +
        `</div>` +
        `<div class="p-actions">` +
          `<button class="p-edit">${svg("gear")}<span>Edit profile</span></button>` +
          `<button class="p-logout">${svg("lock")}<span>Log out</span></button>` +
        `</div>` +
      `</div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (ev) => {
      if (ev.target === modal) closeProfile();
    });
    modal.querySelector(".p-edit").addEventListener("click", () => {
      closeProfile();
      switchPage(4);
    });
    modal.querySelector(".p-logout").addEventListener("click", logout);
  }

  const email = document.getElementById("user-email") ? document.getElementById("user-email").dataset.email : sessionEmail;
  const name = (settings.name || "").trim();
  const first = (name || email || "?").trim()[0] || "?";
  const av = modal.querySelector(".p-av");
  av.style.background = gradCss(settings.avatarGrad);
  av.textContent = settings.avatar && settings.avatar !== "letter" ? settings.avatar : first.toUpperCase();
  const banner = modal.querySelector(".p-banner");
  banner.style.background = gradCss(settings.profileBg);
  const nameEl = modal.querySelector(".p-name");
  nameEl.style.fontFamily = fontCss(settings.nameFont);
  nameEl.style.color = settings.nameColor || "var(--text)";
  const tag = modal.querySelector(".p-tag");
  tag.textContent = (settings.tagline || "").trim() || (name ? "Your profile" : email || "");
  modal.classList.add("show");
  typeProfileName(nameEl);
}

function closeProfile() {
  clearTimeout(profileTypeTimer);
  const modal = document.getElementById("profile-modal");
  if (modal) modal.classList.remove("show");
}

const userBtn = document.getElementById("user-btn");
if (userBtn) userBtn.addEventListener("click", openProfile);

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

const PAGE_NAV = [
  [2, "Field Manual", "book"],
  [3, "Hardening Guide", "shield"],
  [4, "Settings", "gear"],
  [5, "Downloads & Tools", "download"],
  [6, "Investigations", "folder"],
  [7, "AI Assistant", "sparkles"],
];

function buildNav() {
  const nav = document.getElementById("nav");
  if (!nav) return;
  nav.innerHTML = "";
  nav.appendChild(el("div", "nav-label", "Tools"));
  TOOLS.forEach((t, i) => {
    const b = el("button", "nav-item" + (i === 0 ? " active" : ""));
    b.dataset.kind = "tool";
    b.dataset.tool = t.id;
    b.innerHTML = `<span class="ico">${svg(t.icon)}</span>${t.title}`;
    b.addEventListener("click", () => switchTool(t.id));
    nav.appendChild(b);
  });
  if (settings.navPages) {
    nav.appendChild(el("div", "nav-label", "Pages"));
    for (const [n, title, icon] of PAGE_NAV) {
      const b = el("button", "nav-item");
      b.dataset.kind = "page";
      b.dataset.page = String(n);
      b.innerHTML = `<span class="ico">${svg(icon)}</span>${title}`;
      b.addEventListener("click", () => switchPage(n));
      nav.appendChild(b);
    }
  }
  if (currentPage >= 2 && currentPage <= 7) setActiveNav("page", String(currentPage));
  else setActiveNav("tool", currentToolId);
}

function buildShell() {
  const nav = document.getElementById("nav");
  const content = document.getElementById("content");

  buildNav();

  TOOLS.forEach((t, i) => {
    const section = el("section", "tool" + (i === 0 ? "" : " hidden"));
    section.id = "tool-" + t.id;
    if (t.custom) {
      section.innerHTML = `<h2><span class="ico">${svg(t.icon)}</span>${t.title}</h2><p class="desc">${t.desc}</p><div class="results"></div>`;
      if (t.build) t.build(section);
    } else {
      section.innerHTML =
        `<h2><span class="ico">${svg(t.icon)}</span>${t.title}</h2>` +
        `<p class="desc">${t.desc}</p>` +
        `<form class="qform"><input class="q" type="text" placeholder="${t.ph}" autocomplete="off" spellcheck="false" /><button class="go" type="submit">Run</button></form>` +
        `<div class="results"></div>` +
        `<div class="related"></div>`;
    }

    const related = section.querySelector(".related");
    const cats = (RELATED[t.id] || [])
      .map((name) => DIRECTORY.find((c) => c.category === name))
      .filter(Boolean);
    if (related && cats.length) {
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
      const frag = document.createDocumentFragment();
      frag.appendChild(resultBar(tool, raw, j.data));
      frag.appendChild(tool.render(j.data));
      setResults(form, frag);
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
    const match = b.dataset.kind === kind && (b.dataset.tool === id || b.dataset.page === id);
    b.classList.toggle("active", match);
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
  if (n === 1) setActiveNav("tool", "__none__");
  else if (n >= 2 && n <= 7) setActiveNav("page", String(n));
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
  if (n === 5) {
    renderDownloads();
    return;
  }
  if (n === 6) {
    renderInvestigations();
    return;
  }
  if (n === 7) {
    renderAi();
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
   API + export + save-to-case helpers
   ================================================================ */

function downloadBlob(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function downloadJSON(obj, name) {
  downloadBlob(name || "l-result.json", JSON.stringify(obj, null, 2), "application/json");
}

function flattenCSV(obj, prefix) {
  const rows = [];
  (function walk(o, p) {
    if (o === null || o === undefined) return;
    if (typeof o === "object") {
      if (Array.isArray(o)) {
        if (o.length && typeof o[0] === "object") o.forEach((v, i) => walk(v, p + "[" + i + "]"));
        else if (o.length) rows.push([p || "value", JSON.stringify(o)]);
        return;
      }
      for (const [k, v] of Object.entries(o)) walk(v, p ? p + "." + k : k);
      return;
    }
    rows.push([p || "value", String(o)]);
  })(obj, prefix || "");
  return rows;
}

function downloadCSV(obj, name) {
  const csv = flattenCSV(obj)
    .map(([k, v]) => '"' + k.replace(/"/g, '""') + '","' + String(v).replace(/"/g, '""') + '"')
    .join("\n");
  downloadBlob(name || "l-result.csv", csv, "text/csv");
}

async function handleResp(r) {
  if (r.status === 401) {
    showAuth();
    toast("Session expired — please log in again.", "error");
    throw new Error("Session expired");
  }
  const j = await r.json().catch(() => ({ ok: false, error: "Bad response" }));
  if (!j.ok) throw new Error(j.error + (j.detail ? " — " + j.detail : ""));
  return j.data;
}

function apiGet(url) {
  return fetch(url).then(handleResp);
}

function apiPost(url, body) {
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(handleResp);
}

function apiPatch(url, body) {
  return fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: body }) }).then(handleResp);
}

function apiDelete(url) {
  return fetch(url, { method: "DELETE" }).then(handleResp);
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "result";
}

function cleanDomainLocal(s) {
  let d = String(s).trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  d = d.split(/[/?#]/)[0];
  return d.replace(/\.$/, "");
}

let lastResult = null;

async function loadInvOptions(sel) {
  try {
    const list = await apiGet("/api/investigations");
    sel.innerHTML = "";
    const o = el("option", null, "New case…");
    o.value = "__new";
    sel.appendChild(o);
    for (const inv of list.slice(0, 25)) {
      const op = el("option", null, inv.title + (inv.status !== "open" ? " [" + inv.status + "]" : ""));
      op.value = inv.id;
      sel.appendChild(op);
    }
  } catch {}
}

function resultBar(tool, raw, data) {
  lastResult = { tool: tool.title, query: raw, data };
  const bar = el("div", "rbar");

  const g1 = el("div", "rbar-group");
  const jsonB = el("button", "btn-ghost small", "JSON");
  jsonB.title = "Download raw result as JSON";
  jsonB.addEventListener("click", () => downloadJSON(data, slug(tool.id) + "-" + slug(raw) + ".json"));
  const csvB = el("button", "btn-ghost small", "CSV");
  csvB.title = "Download flattened result as CSV";
  csvB.addEventListener("click", () => downloadCSV(data, slug(tool.id) + "-" + slug(raw) + ".csv"));
  g1.appendChild(jsonB);
  g1.appendChild(csvB);
  bar.appendChild(g1);

  const g2 = el("div", "rbar-group");
  const sel = el("select", "rbar-sel");
  const opt = el("option", null, "New case…");
  opt.value = "__new";
  sel.appendChild(opt);
  const saveB = el("button", "btn-primary small", "Save to case");
  saveB.addEventListener("click", async () => {
    saveB.disabled = true;
    try {
      let invId = sel.value;
      if (!invId || invId === "__new") {
        const created = await apiPost("/api/investigations", { title: tool.title + " — " + raw, target: raw });
        invId = created.id;
      }
      await apiPost("/api/investigations/" + invId + "/entries", { tool: tool.title, query: raw, data });
      toast("Saved to case.", "ok");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      saveB.disabled = false;
    }
  });
  g2.appendChild(sel);
  g2.appendChild(saveB);
  bar.appendChild(g2);
  loadInvOptions(sel);
  return bar;
}

/* ================================================================
   New tool renders (breach, pwned, cert, port, wayback, wallet)
   ================================================================ */

function renderBreach(data) {
  const frag = document.createDocumentFragment();
  if (data.note) frag.appendChild(stateEl("note", data.note));
  frag.appendChild(card("Breach exposure — " + data.email, (() => {
    if (data.breaches === null && data.breachedCount === null) return el("div", "state", "No breach data returned.");
    if (data.breachedCount === 0) return el("div", "state", "No breaches found for this email.");
    if (data.breaches && (data.breaches.error || data.breaches.httpStatus)) {
      return el("div", "state error", "Lookup unavailable: " + (data.breaches.error || "HTTP " + data.breaches.httpStatus));
    }
    const wrap = el("div");
    wrap.appendChild(el("div", null, "Found in " + data.breaches.length + " breach(es):"));
    wrap.appendChild(list(data.breaches.map((b) => b.name + " (" + b.date + ") — " + b.description.split(" ").slice(0, 14).join(" ") + "…")));
    return wrap;
  })()));
  return frag;
}

function renderPwned(data) {
  const frag = document.createDocumentFragment();
  frag.appendChild(data.pwned
    ? stateEl("error", "This password appears " + data.count + " time(s) in known breach corpora. Change it and reuse nothing like it.")
    : stateEl("ok", "Not found in the Pwned Passwords corpus."));
  frag.appendChild(card("How this works", el("div", "muted", "Only the first 5 characters of the SHA-1 hash (" + data.prefix + "…) left your browser. The server compared the suffix against the range returned by haveibeenpwned.com — your password never leaves.")));
  return frag;
}

function renderCert(data) {
  const frag = document.createDocumentFragment();
  const subj = data.subject || {};
  const iss = data.issuer || {};
  frag.appendChild(card("Certificate — " + data.host, kv([
    ["Protocol", data.protocol],
    ["Subject CN", subj.CN], ["Organization", subj.O], ["Country", subj.C],
    ["Issuer CN", iss.CN], ["Issuer org", iss.O],
    ["Valid from", data.valid_from], ["Valid to", data.valid_to],
    ["Days remaining", data.daysRemaining === null ? null : data.daysRemaining < 0 ? data.daysRemaining + " (EXPIRED)" : data.daysRemaining],
    ["Serial", data.serial], ["Fingerprint (SHA-256)", data.fingerprint],
  ])));
  if (data.subjectaltname) frag.appendChild(card("Subject Alternative Names", list(String(data.subjectaltname).split(", "))));
  return frag;
}

function renderPort(data) {
  const frag = document.createDocumentFragment();
  frag.appendChild(stateEl("note", "Scanned " + data.total + " ports on " + data.host + (data.ip ? " (" + data.ip + ")" : "") + " in " + data.elapsedMs + "ms."));
  frag.appendChild(card("Open ports (" + data.open.length + ")", data.open.length
    ? table(["Port", "Service"], data.open.map((p) => [String(p.port), p.service]))
    : el("div", "state", "No open ports found.")));
  if (data.filtered.length) {
    frag.appendChild(card("Filtered / dropped (" + data.filtered.length + ")", list(data.filtered.map((p) => p.port + " (" + p.service + ")"))));
  }
  if (data.closed) frag.appendChild(card("Closed", el("div", "muted", data.closed + " ports responded with connection refused.")));
  return frag;
}

function renderWayback(data) {
  const frag = document.createDocumentFragment();
  frag.appendChild(stateEl("note", data.count + " archived snapshot(s) found for " + data.url + "."));
  frag.appendChild(card("Snapshots", data.count ? (() => {
    const grid = el("div", "engine-grid");
    for (const s of data.snapshots.slice(0, 30)) {
      const a = el("a", null, "");
      a.href = s.url; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.appendChild(el("span", null, s.timestamp.slice(0, 10) + " " + s.timestamp.slice(11, 15) + "Z"));
      a.appendChild(el("span", "ext", s.original));
      const arrow = el("span", "ext-arrow");
      arrow.innerHTML = svg("arrow");
      a.appendChild(arrow);
      grid.appendChild(a);
    }
    return grid;
  })() : el("div", "state", "No snapshots found.")));
  return frag;
}

function renderWallet(data) {
  const frag = document.createDocumentFragment();
  const isBtc = data.coin === "BTC";
  frag.appendChild(card(data.coin + " — " + data.address, kv([
    ["Balance", isBtc ? data.balanceBtc + " BTC" : data.balanceEth + " ETH"],
    ["Transactions", data.txCount],
    ["Received", isBtc ? (data.receivedSat / 1e8).toFixed(8) + " BTC" : data.receivedEth + " ETH"],
    ["Sent", isBtc ? (data.sentSat / 1e8).toFixed(8) + " BTC" : data.sentEth + " ETH"],
  ])));
  return frag;
}

/* ================================================================
   Custom tool UIs
   ================================================================ */

function customForm(section) {
  const res = section.querySelector(".results");
  res.innerHTML = "";
  const form = el("div", "b-form");
  const out = el("div", "b-out");
  res.appendChild(form);
  res.appendChild(out);
  return { form, out };
}

function buildWallet(section) {
  const { form, out } = customForm(section);
  const row = el("div", "b-row");
  const sel = document.createElement("select");
  sel.className = "b-sel";
  const b = el("option", null, "BTC"); b.value = "btc"; sel.appendChild(b);
  const e = el("option", null, "ETH"); e.value = "eth"; sel.appendChild(e);
  const input = document.createElement("input");
  input.type = "text";
  input.className = "b-input";
  input.placeholder = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
  const btn = el("button", "btn-primary", "Lookup");
  row.appendChild(sel);
  row.appendChild(input);
  row.appendChild(btn);
  form.appendChild(row);

  const run = async () => {
    const addr = input.value.trim();
    if (!addr) return;
    btn.disabled = true;
    setStatus("running");
    out.innerHTML = "";
    out.appendChild(stateEl("loading", "Querying ledger…"));
    try {
      const data = await apiGet("/api/wallet?coin=" + sel.value + "&addr=" + encodeURIComponent(addr));
      setStatus("ok");
      out.innerHTML = "";
      const frag = document.createDocumentFragment();
      frag.appendChild(resultBar({ id: "wallet", title: "Crypto wallet" }, sel.value + ":" + addr, data));
      frag.appendChild(renderWallet(data));
      out.appendChild(frag);
    } catch (err) {
      setStatus("error");
      out.innerHTML = "";
      out.appendChild(stateEl("error", err.message));
    } finally {
      btn.disabled = false;
    }
  };
  btn.addEventListener("click", run);
  input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") run(); });
}

function buildBatch(section) {
  const { form, out } = customForm(section);
  const toolSel = document.createElement("select");
  toolSel.className = "b-sel";
  const batchTools = [
    ["email", "Email breach check"], ["ip", "IP geolocation"], ["dns", "DNS records"],
    ["whois", "WHOIS / RDAP"], ["username", "Username search"], ["cert", "SSL cert"],
    ["port", "Port scan"], ["wallet", "Crypto wallet (coin:address)"],
  ];
  for (const [v, l] of batchTools) {
    const o = el("option", null, l);
    o.value = v;
    toolSel.appendChild(o);
  }
  const area = document.createElement("textarea");
  area.className = "b-area";
  area.placeholder = "One value per line:\nuser@example.com\nanother@example.com\n0x...";
  const btn = el("button", "btn-primary", "Run batch");
  form.appendChild(toolSel);
  form.appendChild(area);
  form.appendChild(btn);

  const run = async () => {
    const items = area.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (!items.length) return;
    btn.disabled = true;
    setStatus("running");
    out.innerHTML = "";
    out.appendChild(stateEl("loading", "Running " + items.length + " lookups…"));
    try {
      const data = await apiPost("/api/batch", { tool: toolSel.value, items });
      setStatus("ok");
      out.innerHTML = "";
      out.appendChild(renderBatch(data));
    } catch (err) {
      setStatus("error");
      out.innerHTML = "";
      out.appendChild(stateEl("error", err.message));
    } finally {
      btn.disabled = false;
    }
  };
  btn.addEventListener("click", run);
}

function renderBatch(data) {
  const frag = document.createDocumentFragment();
  const okCount = data.results.filter((r) => r.ok).length;
  frag.appendChild(stateEl("note", data.count + " result(s) — " + okCount + " ok, " + (data.count - okCount) + " failed."));
  const rows = [];
  for (const r of data.results) {
    if (!r.ok) { rows.push([r.query, "ERROR", r.error]); continue; }
    const d = r.data;
    let summary = "";
    if (d.email) {
      summary = d.breachedCount === 0 ? "no breaches" : d.breaches && d.breaches.length ? d.breaches.length + " breach(es)" : String(d.breachedCount);
      if (d.note) summary += " · no key";
    } else if (d.ip) {
      const g = d.geo || {};
      summary = g.city ? g.city + ", " + (g.country || "") : g.error || "?";
    } else if (d.records) {
      const rec = d.records;
      const a = rec.A && !rec.A.error ? rec.A.map((x) => x.address).join(", ") : "none";
      summary = "A: " + a;
    } else if (d.ldapName) {
      summary = "created " + (d.created ? String(d.created).slice(0, 10) : "?") + (d.expires ? " · expires " + String(d.expires).slice(0, 10) : "");
    } else if (d.username) {
      summary = d.found.length + " found across " + d.checked + " platforms";
    } else if (d.subject) {
      summary = "CN " + (d.subject.CN || "?") + " · " + (d.daysRemaining === null ? "?" : d.daysRemaining + "d left");
    } else if (d.host && d.open) {
      summary = d.open.length + " open / " + d.total + " scanned";
    } else if (d.coin) {
      summary = d.coin + " " + (d.coin === "BTC" ? d.balanceBtc + " BTC" : d.balanceEth + " ETH") + " · " + d.txCount + " tx";
    } else {
      summary = JSON.stringify(d).slice(0, 120);
    }
    rows.push([r.query, r.ok ? "OK" : "ERROR", summary]);
  }
  const t = table(["Query", "Status", "Summary"], rows);
  t.className = "batch-table";
  frag.appendChild(card("Results", t));

  const bar = el("div", "rbar");
  const g = el("div", "rbar-group");
  const jsonB = el("button", "btn-ghost small", "JSON");
  jsonB.addEventListener("click", () => downloadJSON(data, "batch.json"));
  const csvB = el("button", "btn-ghost small", "CSV");
  csvB.addEventListener("click", () => downloadCSV(data, "batch.csv"));
  g.appendChild(jsonB);
  g.appendChild(csvB);
  bar.appendChild(g);
  frag.appendChild(bar);
  return frag;
}

function readImageMetadata(buf, file) {
  const info = {
    "File name": file.name,
    "File size": file.size + " bytes",
    "File type": file.type || "unknown",
    "Modified": file.lastModified ? new Date(file.lastModified).toISOString().replace("T", " ").slice(0, 19) + "Z" : null,
  };
  if (typeof parseEXIF === "function") {
    const ex = parseEXIF(buf);
    if (ex && Object.keys(ex).length) {
      if (ex.Make || ex.Model) info["Camera"] = [ex.Make, ex.Model].filter(Boolean).join(" ");
      if (ex.DateTimeOriginal) info["Taken"] = ex.DateTimeOriginal;
      else if (ex.DateTime) info["Taken"] = ex.DateTime;
      if (ex.Software) info["Software"] = ex.Software;
      if (ex.Artist) info["Artist"] = ex.Artist;
      if (ex.Orientation) info["Orientation"] = ex.Orientation;
      if (ex.ExposureTime) info["Exposure"] = ex.ExposureTime + "s";
      if (ex.FNumber) info["Aperture"] = "f/" + ex.FNumber;
      if (ex.ISO) info["ISO"] = ex.ISO;
      if (ex.FocalLength) info["Focal length"] = ex.FocalLength + "mm";
      if (ex.PixelDimensions) info["Pixel dimensions"] = ex.PixelDimensions;
      if (ex.LensModel) info["Lens"] = ex.LensModel;
      if (ex.gps) info.gps = ex.gps;
    }
  }
  return info;
}

function renderMetadata(info) {
  const frag = document.createDocumentFragment();
  const pairs = [];
  for (const [k, v] of Object.entries(info)) {
    if (v === null || v === undefined || v === "" || k === "gps") continue;
    pairs.push([k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
  }
  if (!pairs.length) frag.appendChild(stateEl("note", "No EXIF metadata found in this image."));
  else frag.appendChild(card("File & EXIF", kv(pairs)));
  if (info.gps) {
    frag.appendChild(card("GPS location", kv([
      ["Latitude", info.gps.lat], ["Longitude", info.gps.lon], ["Altitude", info.gps.alt],
    ])));
  }
  return frag;
}

function buildMetadata(section) {
  const { form, out } = customForm(section);
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "b-file";
  form.appendChild(fileInput);
  form.appendChild(el("div", "b-hint", "Processed entirely in your browser — the file never leaves your machine."));
  fileInput.addEventListener("change", async () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    out.innerHTML = "";
    out.appendChild(stateEl("loading", "Reading metadata…"));
    try {
      const buf = await f.arrayBuffer();
      setStatus("ok");
      out.innerHTML = "";
      const info = readImageMetadata(buf, f);
      const frag = document.createDocumentFragment();
      frag.appendChild(resultBar({ id: "metadata", title: "Metadata / EXIF" }, f.name, info));
      frag.appendChild(renderMetadata(info));
      out.appendChild(frag);
    } catch (err) {
      setStatus("error");
      out.innerHTML = "";
      out.appendChild(stateEl("error", err.message));
    }
  });
}

async function hashFile(buf) {
  const hex = (ab) => Array.from(new Uint8Array(ab)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const bytes = new Uint8Array(buf);
  const [sha256, sha384, sha512, md5, sha1] = await Promise.all([
    crypto.subtle.digest("SHA-256", buf).then(hex),
    crypto.subtle.digest("SHA-384", buf).then(hex),
    crypto.subtle.digest("SHA-512", buf).then(hex),
    Promise.resolve(md5Hex(bytes)),
    Promise.resolve(sha1Hex(bytes)),
  ]);
  return { MD5: md5, "SHA-1": sha1, "SHA-256": sha256, "SHA-384": sha384, "SHA-512": sha512 };
}

function renderFileHash(f, h) {
  const frag = document.createDocumentFragment();
  frag.appendChild(card(f.name + " — " + f.size + " bytes", table(["Algorithm", "Hash"], Object.entries(h))));
  return frag;
}

function buildFileHash(section) {
  const { form, out } = customForm(section);
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.className = "b-file";
  form.appendChild(fileInput);
  form.appendChild(el("div", "b-hint", "Hashes are computed locally in your browser."));
  fileInput.addEventListener("change", async () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    out.innerHTML = "";
    out.appendChild(stateEl("loading", "Hashing…"));
    try {
      const buf = await f.arrayBuffer();
      const h = await hashFile(buf);
      setStatus("ok");
      out.innerHTML = "";
      const frag = document.createDocumentFragment();
      frag.appendChild(resultBar({ id: "hashfile", title: "File hasher" }, f.name, h));
      frag.appendChild(renderFileHash(f, h));
      out.appendChild(frag);
    } catch (err) {
      setStatus("error");
      out.innerHTML = "";
      out.appendChild(stateEl("error", err.message));
    }
  });
}

function buildDorks(section) {
  const { form, out } = customForm(section);
  const fields = [
    ["Site", "site:", "limit to a domain", "example.com"],
    ["In title", "intitle:", "word that must appear in the title", "username"],
    ["In URL", "inurl:", "word that must appear in the URL", "admin"],
    ["File type", "filetype:", "file extension", "pdf"],
    ["In text", "intext:", "word in page body", "password"],
    ["Exact phrase", "phrase", "a quoted phrase", "\"someone@example.com\""],
    ["Raw terms", "raw", "free-form terms", "name city"],
  ];
  const cells = [];
  for (const [label, op, hint, ph] of fields) {
    const w = el("div", "dork-field");
    w.appendChild(el("label", null, label));
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = ph;
    input.className = "b-input";
    input.dataset.op = op;
    w.appendChild(input);
    w.appendChild(el("div", "b-hint", hint));
    form.appendChild(w);
    cells.push(input);
  }
  const row = el("div", "b-row");
  const engineSel = document.createElement("select");
  engineSel.className = "b-sel";
  for (const [v, l] of [["google", "Google"], ["bing", "Bing"], ["ddg", "DuckDuckGo"], ["yandex", "Yandex"], ["startpage", "Startpage"]]) {
    const o = el("option", null, l);
    o.value = v;
    engineSel.appendChild(o);
  }
  const btn = el("button", "btn-primary", "Build query");
  row.appendChild(engineSel);
  row.appendChild(btn);
  form.appendChild(row);

  const build = () => {
    const parts = [];
    for (const input of cells) {
      const v = input.value.trim();
      if (!v) continue;
      const op = input.dataset.op;
      if (op === "site:") parts.push("site:" + v.replace(/[^\w.-]/g, ""));
      else if (op === "filetype:") parts.push("filetype:" + v.replace(/[^\w.]/g, ""));
      else if (op === "inurl:") parts.push("inurl:" + v);
      else if (op === "intitle:") parts.push('intitle:"' + v.replace(/"/g, "") + '"');
      else if (op === "phrase") parts.push('"' + v.replace(/"/g, "") + '"');
      else parts.push(v);
    }
    const q = parts.join(" ").trim();
    if (!q) return;
    out.innerHTML = "";
    const urls = {
      google: "https://www.google.com/search?q=",
      bing: "https://www.bing.com/search?q=",
      ddg: "https://duckduckgo.com/?q=",
      yandex: "https://yandex.com/search/?text=",
      startpage: "https://www.startpage.com/sp/search?query=",
    };
    const enc = encodeURIComponent(q);
    const a = el("div", "dork-query");
    a.appendChild(el("div", "k", "Query"));
    const qwrap = el("div", "b-row");
    const code = el("code", "dork-code", q);
    const copyBtn = el("button", "btn-ghost small", "Copy");
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(q);
        toast("Copied.", "ok");
      } catch {
        toast("Copy failed.", "error");
      }
    });
    qwrap.appendChild(code);
    qwrap.appendChild(copyBtn);
    a.appendChild(qwrap);
    out.appendChild(a);

    const grid = el("div", "engine-grid");
    for (const [name, base] of Object.entries(urls)) {
      const link = el("a", null, name);
      link.href = base + enc;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const arrow = el("span", "ext-arrow");
      arrow.innerHTML = svg("arrow");
      link.appendChild(arrow);
      grid.appendChild(link);
    }
    out.appendChild(card("Open in", grid));
  };
  btn.addEventListener("click", build);
  cells.forEach((c) => c.addEventListener("keydown", (ev) => { if (ev.key === "Enter") build(); }));
}

function buildReverseImage(section) {
  const { form, out } = customForm(section);
  const input = document.createElement("input");
  input.type = "text";
  input.className = "b-input";
  input.placeholder = "https://example.com/image.jpg";
  const btn = el("button", "btn-primary", "Search");
  form.appendChild(input);
  form.appendChild(btn);
  form.appendChild(el("div", "b-hint", "The image must be reachable at a public URL. Engines open in a new tab."));

  const run = () => {
    const url = input.value.trim();
    if (!/^https?:\/\//i.test(url)) return;
    out.innerHTML = "";
    const enc = encodeURIComponent(url);
    const engines = [
      ["Yandex", "https://yandex.com/images/search?rpt=imageview&url=" + enc],
      ["Google Lens", "https://lens.google.com/uploadbyurl?url=" + enc],
      ["Bing", "https://www.bing.com/images/searchbyimage?cbir=sbi&imgurl=" + enc],
      ["Tineye", "https://tineye.com/search?url=" + enc],
      ["Saucenao", "https://saucenao.com/search.php?url=" + enc],
      ["KarmaDecay (Reddit)", "https://karmadecay.com/search?url=" + enc],
    ];
    const grid = el("div", "engine-grid");
    for (const [name, u] of engines) {
      const a = el("a", null, name);
      a.href = u;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const arrow = el("span", "ext-arrow");
      arrow.innerHTML = svg("arrow");
      a.appendChild(arrow);
      grid.appendChild(a);
    }
    out.appendChild(card("Reverse image sources", grid));
  };
  btn.addEventListener("click", run);
  input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") run(); });
}

/* ---- report generator ---- */

function renderHeadersShort(data) {
  const frag = document.createDocumentFragment();
  const sec = data.security || [];
  if (!sec.length) {
    frag.appendChild(el("div", "state", "No headers returned."));
    return frag;
  }
  frag.appendChild(card("Security headers", table(["Header", "Present", "Value"], sec.map((h) => [h.header, h.present ? "yes" : "no", h.value ? String(h.value).slice(0, 90) : "—"]))));
  const final = data.chain && data.chain[data.chain.length - 1];
  if (final && !final.error) frag.appendChild(stateEl("note", "Final status: HTTP " + final.status));
  return frag;
}

async function generateReport(target) {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(target);
  const host = isEmail ? target.split("@")[1] : cleanDomainLocal(target);
  const sections = [];
  const add = (title, node, raw) => sections.push({ title, node, raw });

  if (isEmail) {
    try {
      const d = await apiGet("/api/breach?email=" + encodeURIComponent(target));
      add("Email breach exposure", renderBreach(d), d);
    } catch (e) { add("Email breach exposure", stateEl("error", e.message), { error: e.message }); }
    try {
      const d = await apiGet("/api/dns/" + encodeURIComponent(host));
      const mx = d.records.MX;
      add("Mail server (MX)", mx && !mx.error
        ? table(["Priority", "Server"], mx.map((m) => [String(m.priority), m.exchange]))
        : el("div", "state", "No MX records found."), d);
    } catch (e) { add("Mail server (MX)", stateEl("error", e.message), { error: e.message }); }
  } else {
    const jobs = [
      ["WHOIS / RDAP", "/api/whois/" + encodeURIComponent(host), renderWhois],
      ["DNS records", "/api/dns/" + encodeURIComponent(host), renderDns],
      ["Subdomains", "/api/subdomains/" + encodeURIComponent(host), renderSubdomains],
      ["HTTP headers", "/api/headers?u=" + encodeURIComponent("https://" + host), renderHeadersShort],
      ["TLS certificate", "/api/cert?host=" + encodeURIComponent(host), renderCert],
      ["Open ports", "/api/port?host=" + encodeURIComponent(host), renderPort],
      ["Wayback snapshots", "/api/wayback?url=" + encodeURIComponent("https://" + host), renderWayback],
    ];
    await Promise.all(jobs.map(async ([title, url, render]) => {
      try {
        const d = await apiGet(url);
        add(title, render(d), d);
      } catch (e) {
        add(title, stateEl("error", e.message), { error: e.message });
      }
    }));
  }
  return { target, isEmail, host, generatedAt: new Date().toISOString(), sections };
}

function renderReport(target, data) {
  const wrap = el("div");
  const bar = el("div", "rbar");
  const g1 = el("div", "rbar-group");
  const jsonB = el("button", "btn-ghost small", "JSON");
  jsonB.addEventListener("click", () => downloadJSON({ target, generatedAt: data.generatedAt, sections: data.sections.map((s) => ({ title: s.title, data: s.raw || { error: true } })) }, "report-" + slug(target) + ".json"));
  const printB = el("button", "btn-primary small", "Print / PDF");
  printB.addEventListener("click", () => {
    document.body.classList.add("printing");
    window.print();
    setTimeout(() => document.body.classList.remove("printing"), 500);
  });
  g1.appendChild(jsonB);
  g1.appendChild(printB);
  bar.appendChild(g1);
  wrap.appendChild(bar);

  const report = el("div", "report");
  const head = el("div", "report-head");
  head.appendChild(el("h2", null, "OSINT report — " + target));
  head.appendChild(el("div", "muted", "Generated " + new Date(data.generatedAt).toLocaleString() + " · L toolkit"));
  report.appendChild(head);
  for (const sec of data.sections) {
    const cardWrap = el("section", "report-section");
    cardWrap.appendChild(el("h3", null, sec.title));
    cardWrap.appendChild(sec.node);
    report.appendChild(cardWrap);
  }
  wrap.appendChild(report);
  return wrap;
}

function buildReport(section) {
  const { form, out } = customForm(section);
  const input = document.createElement("input");
  input.type = "text";
  input.className = "b-input";
  input.placeholder = "example.com or someone@example.com";
  const btn = el("button", "btn-primary", "Generate report");
  form.appendChild(input);
  form.appendChild(btn);

  const run = async () => {
    const target = input.value.trim();
    if (!target) return;
    btn.disabled = true;
    setStatus("running");
    out.innerHTML = "";
    out.appendChild(stateEl("loading", "Running all relevant lookups…"));
    try {
      const data = await generateReport(target);
      setStatus("ok");
      out.innerHTML = "";
      out.appendChild(renderReport(target, data));
    } catch (err) {
      setStatus("error");
      out.innerHTML = "";
      out.appendChild(stateEl("error", err.message));
    } finally {
      btn.disabled = false;
    }
  };
  btn.addEventListener("click", run);
  input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") run(); });
}

/* ================================================================
   Investigations (page 6)
   ================================================================ */

function invCard(inv, refresh) {
  const c = el("div", "inv-card");
  const head = el("div", "inv-head");
  head.appendChild(el("strong", null, inv.title));
  const statusBtn = el("button", "inv-status " + inv.status, inv.status);
  statusBtn.addEventListener("click", async () => {
    const next = inv.status === "open" ? "stale" : inv.status === "stale" ? "closed" : "open";
    try {
      await apiPatch("/api/investigations/" + inv.id, { status: next });
      refresh();
    } catch {}
  });
  head.appendChild(statusBtn);
  c.appendChild(head);
  c.appendChild(el("div", "inv-meta", "Target: " + (inv.target || "—") + " · " + inv.entries.length + " entries · updated " + new Date(inv.updatedAt).toLocaleDateString()));

  if (inv.entries.length) {
    const ul = el("ul", "clean inv-entries");
    inv.entries.forEach((e, idx) => {
      const li = el("li", null);
      const strong = el("strong", null, e.tool + ": ");
      li.appendChild(strong);
      li.appendChild(el("span", null, e.query));
      const del = el("button", "link-btn danger", "remove");
      del.addEventListener("click", async () => {
        try {
          await apiDelete("/api/investigations/" + inv.id + "/entries/" + idx);
          refresh();
        } catch {}
      });
      li.appendChild(del);
      ul.appendChild(li);
    });
    c.appendChild(ul);
  }

  const notes = document.createElement("textarea");
  notes.className = "b-area inv-notes";
  notes.placeholder = "Notes…";
  notes.value = inv.notes || "";
  notes.addEventListener("change", async () => {
    try { await apiPatch("/api/investigations/" + inv.id, { notes: notes.value }); } catch {}
  });
  c.appendChild(notes);

  const actions = el("div", "b-row");
  const delBtn = el("button", "btn-ghost danger", "Delete case");
  delBtn.addEventListener("click", async () => {
    if (!confirm("Delete this case and all its entries?")) return;
    try {
      await apiDelete("/api/investigations/" + inv.id);
      refresh();
    } catch {}
  });
  actions.appendChild(delBtn);
  c.appendChild(actions);
  return c;
}

function renderInvestigations() {
  setPageTitle("Investigations");
  setStatus("ok");
  const view = document.getElementById("page-view");
  view.classList.remove("hidden");
  view.innerHTML = "";
  const frag = document.createDocumentFragment();

  const hero = el("div", "page-hero");
  const pageIco = el("div", "page-ico");
  pageIco.innerHTML = svg("folder");
  hero.appendChild(pageIco);
  const heroText = el("div");
  heroText.appendChild(el("h1", null, "Investigations"));
  heroText.appendChild(el("p", null, "Save targets, notes and lookup results to build a case over time. Use “Save to case” on any tool result."));
  hero.appendChild(heroText);
  frag.appendChild(hero);

  const newCard = el("div", "inv-new");
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "b-input";
  titleInput.placeholder = "Case title…";
  const targetInput = document.createElement("input");
  targetInput.type = "text";
  targetInput.className = "b-input";
  targetInput.placeholder = "Target (optional)…";
  const createBtn = el("button", "btn-primary", "New case");
  newCard.appendChild(titleInput);
  newCard.appendChild(targetInput);
  newCard.appendChild(createBtn);
  frag.appendChild(newCard);

  const listWrap = el("div", "inv-list");
  frag.appendChild(listWrap);
  view.appendChild(frag);

  const load = async () => {
    try {
      const list = await apiGet("/api/investigations");
      listWrap.innerHTML = "";
      if (!list.length) {
        listWrap.appendChild(el("div", "state", "No cases yet. Save a result from any tool to start one."));
        return;
      }
      for (const inv of list) listWrap.appendChild(invCard(inv, load));
    } catch (err) {
      listWrap.appendChild(stateEl("error", err.message));
    }
  };

  createBtn.addEventListener("click", async () => {
    const title = titleInput.value.trim() || "Untitled";
    createBtn.disabled = true;
    try {
      await apiPost("/api/investigations", { title, target: targetInput.value.trim() });
      toast("Case created.", "ok");
      titleInput.value = "";
      targetInput.value = "";
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      createBtn.disabled = false;
    }
  });
  load();
}

/* ================================================================
   AI assistant (page 7)
   ================================================================ */

function renderAi() {
  setPageTitle("AI Assistant");
  setStatus("ok");
  const view = document.getElementById("page-view");
  view.classList.remove("hidden");
  view.innerHTML = "";
  const frag = document.createDocumentFragment();

  const hero = el("div", "page-hero");
  const pageIco = el("div", "page-ico");
  pageIco.innerHTML = svg("sparkles");
  hero.appendChild(pageIco);
  const heroText = el("div");
  heroText.appendChild(el("h1", null, "AI Assistant"));
  heroText.appendChild(el("p", null, "Ask anything — general knowledge, writing, coding, ideas. Powered by Groq."));
  hero.appendChild(heroText);
  frag.appendChild(hero);

  const chat = el("div", "chat");
  const log = el("div", "chat-log");
  chat.appendChild(log);

  const form = el("form", "chat-form");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "q chat-input";
  input.placeholder = "Ask me anything…";
  input.autocomplete = "off";
  input.spellcheck = false;
  const sendBtn = el("button", "btn-primary", "Send");
  form.appendChild(input);
  form.appendChild(sendBtn);
  chat.appendChild(form);
  frag.appendChild(chat);
  view.appendChild(frag);

  apiGet("/api/chat/status").then((s) => {
    if (!s.configured) {
      log.appendChild(stateEl("note", "AI is not configured on this server. Set AI_API_KEY (Groq) in the server environment to enable it."));
    }
  }).catch(() => {});

  const suggestions = ["Explain something simply", "Help me write a message", "Give me ideas", "Solve a problem"];
  const sugg = el("div", "chat-sugg");
  for (const s of suggestions) {
    const b = el("button", "chip", s);
    b.addEventListener("click", () => { input.value = s; send(); });
    sugg.appendChild(b);
  }
  log.appendChild(sugg);

  const history = [];
  let busy = false;

  const addMsg = (role) => {
    const m = el("div", "msg " + role);
    m.appendChild(el("div", "bubble", ""));
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  };

  const typeMsg = (m, text) => {
    const bubble = m.querySelector(".bubble");
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      bubble.textContent = text.slice(0, i);
      log.scrollTop = log.scrollHeight;
      if (i >= text.length) clearInterval(iv);
    }, 6);
  };

  const send = async () => {
    const text = input.value.trim();
    if (!text || busy) return;
    busy = true;
    history.push({ role: "user", content: text });
    const userMsg = addMsg("user");
    userMsg.querySelector(".bubble").textContent = text;
    input.value = "";
    const aiMsg = addMsg("ai");
    aiMsg.querySelector(".bubble").textContent = "…";
    setStatus("running");
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error + (j.detail ? " — " + j.detail : ""));
      history.push({ role: "assistant", content: j.content });
      setStatus("ok");
      typeMsg(aiMsg, j.content || "No response.");
    } catch (err) {
      setStatus("error");
      aiMsg.querySelector(".bubble").textContent = err.message;
    } finally {
      busy = false;
    }
  };

  form.addEventListener("submit", (ev) => { ev.preventDefault(); send(); });
}

/* ================================================================
   Command palette (Ctrl+K)
   ================================================================ */

function paletteItems() {
  const items = [];
  TOOLS.forEach((t) => items.push({ label: t.title, sub: t.desc, icon: t.icon, run: () => switchTool(t.id) }));
  items.push({ label: "Home", sub: "Tool grid", icon: "globe", run: () => renderHome() });
  items.push({ label: "Field Manual", sub: "OPSEC · OSINT · CSINT · EDR · doxing", icon: "book", run: () => switchPage(2) });
  items.push({ label: "Hardening Guide", sub: "Protect yourself, clear your name", icon: "shield", run: () => switchPage(3) });
  items.push({ label: "Settings", sub: "Themes, cursor, wallpapers, sidebar, profile", icon: "gear", run: () => switchPage(4) });
  items.push({ label: "Downloads & Tools", sub: "Everything to install to stay untrackable", icon: "download", run: () => switchPage(5) });
  items.push({ label: "Investigations", sub: "Saved cases and notes", icon: "folder", run: () => switchPage(6) });
  items.push({ label: "AI Assistant", sub: "Ask anything", icon: "sparkles", run: () => switchPage(7) });
  items.push({ label: "Export last result", sub: lastResult ? lastResult.tool + " — " + lastResult.query : "Run a lookup first", icon: "download", run: () => lastResult && downloadJSON(lastResult.data, slug(lastResult.tool) + ".json") });
  return items;
}

function openPalette() {
  let overlay = document.getElementById("palette");
  if (!overlay) {
    overlay = el("div", "palette");
    overlay.id = "palette";
    overlay.innerHTML =
      `<div class="pal-box">` +
        `<div class="pal-search-row">` +
          `<span class="pal-ico">${svg("search")}</span>` +
          `<input class="pal-input" type="text" placeholder="Type a tool, page or command…" autocomplete="off" spellcheck="false" />` +
          `<span class="pal-k">esc</span>` +
        `</div>` +
        `<div class="pal-list"></div>` +
      `</div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("mousedown", (ev) => {
      if (ev.target === overlay) closePalette();
    });
  }
  overlay.classList.add("open");
  const input = overlay.querySelector(".pal-input");
  input.value = "";
  renderPalette("");
  input.focus();
}

function closePalette() {
  const overlay = document.getElementById("palette");
  if (overlay) overlay.classList.remove("open");
}

function renderPalette(term) {
  const overlay = document.getElementById("palette");
  if (!overlay) return;
  const list = overlay.querySelector(".pal-list");
  const t = term.toLowerCase();
  const items = paletteItems().filter((i) => !t || (i.label + " " + i.sub).toLowerCase().includes(t));
  list.innerHTML = "";
  let idx = -1;
  for (const item of items) {
    const b = el("button", "pal-item");
    b.innerHTML = `<span class="hc-ico">${svg(item.icon)}</span><span class="pal-label">${esc(item.label)}</span><span class="pal-sub">${esc(item.sub)}</span>`;
    b.addEventListener("click", () => { closePalette(); item.run(); });
    list.appendChild(b);
  }
  if (!items.length) list.appendChild(el("div", "state", "No matches."));
  return items;
}

/* ================================================================
   Deep links (#t/<tool>?q=… , #p<N>)
   ================================================================ */

function processDeepLink() {
  const h = location.hash.slice(1);
  const m = h.match(/^t\/([a-z0-9]+)\?q=(.*)$/i);
  if (m) {
    const id = m[1].toLowerCase();
    const q = decodeURIComponent(m[2]);
    const tool = TOOLS.find((t) => t.id === id);
    if (tool && !tool.custom) {
      switchTool(id);
      const input = document.querySelector("#tool-" + id + " .q");
      if (input) {
        input.value = q;
        input.dispatchEvent(new Event("input"));
      }
      const form = document.querySelector("#tool-" + id + " .qform");
      if (form) form.requestSubmit();
    }
  } else if (/^p[0-9]$/.test(h)) {
    switchPage(Number(h.slice(1)));
  }
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
}

/* ================================================================
   Boot
   ================================================================ */

buildShell();
initTypedInputs();
window.addEventListener("hashchange", processDeepLink);

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
