"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB_FILE = process.env.DB_FILE || path.join(__dirname, "..", "store.json");
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;

let cache = null;
let writeChain = Promise.resolve();

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    cache = { users: {}, otps: {}, sessions: {} };
  }
  cache.users = cache.users || {};
  cache.otps = cache.otps || {};
  cache.sessions = cache.sessions || {};
  return cache;
}

function save() {
  const data = JSON.stringify(cache, null, 2);
  writeChain = writeChain.then(() => {
    const tmp = DB_FILE + ".tmp";
    fs.writeFileSync(tmp, data, "utf8");
    fs.renameSync(tmp, DB_FILE);
  });
  return writeChain;
}

function userExists(email) {
  return Boolean(load().users[email]);
}

function getUser(email) {
  return load().users[email] || null;
}

async function createUser(email, passwordHash) {
  const db = load();
  db.users[email] = { email, passwordHash, createdAt: new Date().toISOString(), failedLogins: 0, lockedUntil: null };
  await save();
}

async function updateEmail(oldEmail, newEmail) {
  const db = load();
  if (!db.users[oldEmail]) return false;
  db.users[newEmail] = db.users[oldEmail];
  db.users[newEmail].email = newEmail;
  delete db.users[oldEmail];
  for (const [token, s] of Object.entries(db.sessions)) {
    if (s.email === oldEmail) s.email = newEmail;
  }
  if (db.otps[newEmail]) delete db.otps[newEmail];
  await save();
  return true;
}

async function updatePassword(email, passwordHash) {
  const db = load();
  const u = db.users[email];
  if (!u) return false;
  u.passwordHash = passwordHash;
  await save();
  return true;
}

async function recordFailedLogin(email) {
  const db = load();
  const u = db.users[email];
  if (!u) return;
  u.failedLogins = (u.failedLogins || 0) + 1;
  if (u.failedLogins >= 10) {
    u.lockedUntil = Date.now() + 10 * 60 * 1000;
    u.failedLogins = 0;
  }
  await save();
}

async function clearFailedLogins(email) {
  const db = load();
  const u = db.users[email];
  if (!u) return;
  u.failedLogins = 0;
  u.lockedUntil = null;
  await save();
}

async function setOtp(email, code) {
  const db = load();
  db.otps[email] = {
    code,
    createdAt: Date.now(),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: Date.now(),
  };
  await save();
}

function getOtp(email) {
  const otp = load().otps[email];
  if (!otp) return null;
  if (Date.now() > otp.expiresAt) return null;
  return otp;
}

function otpCooldownRemaining(email) {
  const otp = load().otps[email];
  if (!otp || !otp.lastSentAt) return 0;
  const remaining = 60000 - (Date.now() - otp.lastSentAt);
  return remaining > 0 ? Math.round(remaining / 1000) : 0;
}

async function consumeOtpAttempt(email) {
  const db = load();
  const otp = db.otps[email];
  if (!otp) return;
  otp.attempts = (otp.attempts || 0) + 1;
  if (otp.attempts >= 6) delete db.otps[email];
  await save();
}

async function deleteOtp(email) {
  const db = load();
  delete db.otps[email];
  await save();
}

async function createSession(token, email) {
  const db = load();
  db.sessions[token] = { email, createdAt: Date.now() };
  await save();
}

function getSession(token) {
  const db = load();
  const s = db.sessions[token];
  if (!s) return null;
  if (Date.now() - s.createdAt > SESSION_TTL_MS) {
    return null;
  }
  return s;
}

async function deleteSession(token) {
  const db = load();
  delete db.sessions[token];
  await save();
}

async function cleanup() {
  const db = load();
  const now = Date.now();
  let changed = false;
  for (const [email, otp] of Object.entries(db.otps)) {
    if (now > otp.expiresAt) {
      delete db.otps[email];
      changed = true;
    }
  }
  for (const [token, s] of Object.entries(db.sessions)) {
    if (now - s.createdAt > SESSION_TTL_MS) {
      delete db.sessions[token];
      changed = true;
    }
  }
  if (changed) await save();
}

/* ---- investigations ---- */

function invList(email) {
  const db = load();
  db.investigations = db.investigations || {};
  db.investigations[email] = db.investigations[email] || [];
  return db.investigations[email];
}

function getInvestigations(email) {
  return invList(email);
}

async function createInvestigation(email, { title, target, status, tags, notes }) {
  const db = load();
  const arr = invList(email);
  const inv = {
    id: crypto.randomUUID(),
    title: String(title || "Untitled").slice(0, 120),
    target: String(target || "").slice(0, 200),
    status: String(status || "open"),
    tags: Array.isArray(tags) ? tags.map((t) => String(t).slice(0, 30)) : [],
    notes: String(notes || ""),
    entries: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  arr.unshift(inv);
  await save();
  return inv;
}

function findInv(email, id) {
  return invList(email).find((i) => i.id === id) || null;
}

async function updateInvestigation(email, id, patch) {
  const inv = findInv(email, id);
  if (!inv) return null;
  if (patch.title !== undefined) inv.title = String(patch.title).slice(0, 120);
  if (patch.target !== undefined) inv.target = String(patch.target).slice(0, 200);
  if (patch.status !== undefined) inv.status = String(patch.status);
  if (patch.tags !== undefined) inv.tags = Array.isArray(patch.tags) ? patch.tags.map((t) => String(t).slice(0, 30)) : inv.tags;
  if (patch.notes !== undefined) inv.notes = String(patch.notes);
  inv.updatedAt = new Date().toISOString();
  await save();
  return inv;
}

async function addInvestigationEntry(email, id, entry) {
  const inv = findInv(email, id);
  if (!inv) return null;
  inv.entries.push({
    tool: String(entry.tool || "").slice(0, 80),
    query: String(entry.query || "").slice(0, 300),
    data: entry.data || null,
    at: new Date().toISOString(),
  });
  inv.updatedAt = new Date().toISOString();
  await save();
  return inv;
}

async function removeInvestigationEntry(email, id, idx) {
  const inv = findInv(email, id);
  if (!inv) return null;
  const index = Number(idx);
  if (Number.isInteger(index) && index >= 0 && index < inv.entries.length) {
    inv.entries.splice(index, 1);
    inv.updatedAt = new Date().toISOString();
    await save();
  }
  return inv;
}

async function deleteInvestigation(email, id) {
  const db = load();
  const arr = invList(email);
  const i = arr.findIndex((x) => x.id === id);
  if (i === -1) return false;
  arr.splice(i, 1);
  await save();
  return true;
}

module.exports = {
  userExists,
  getUser,
  createUser,
  updateEmail,
  updatePassword,
  recordFailedLogin,
  clearFailedLogins,
  setOtp,
  getOtp,
  otpCooldownRemaining,
  consumeOtpAttempt,
  deleteOtp,
  createSession,
  getSession,
  deleteSession,
  cleanup,
  getInvestigations,
  createInvestigation,
  updateInvestigation,
  addInvestigationEntry,
  removeInvestigationEntry,
  deleteInvestigation,
};
