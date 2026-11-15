'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'GestiónPyme');
const REMINDERS_FILE = path.join(DATA_DIR, 'reminders.json');
const MAIL_CONFIG_FILE = path.join(DATA_DIR, 'mail-config.json');
const PUSH_CONFIG_FILE = path.join(DATA_DIR, 'push-config.json');
const BANK_MAIL_CONFIG_FILE = path.join(DATA_DIR, 'bank-mail-config.json');

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJSON(file, data, mode) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), { mode: mode || 0o644 });
}

const REMINDERS_LOCK = REMINDERS_FILE + '.lock';

function acquireRemindersLock() {
  ensureDataDir();
  const deadline = Date.now() + 5000;
  for (;;) {
    try {
      fs.mkdirSync(REMINDERS_LOCK);
      return;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      // Stale lock from a crashed process: take it over after 10s.
      try {
        const age = Date.now() - fs.statSync(REMINDERS_LOCK).mtimeMs;
        if (age > 10000) { fs.rmdirSync(REMINDERS_LOCK); continue; }
      } catch {}
      if (Date.now() > deadline) throw new Error('No se pudo obtener el bloqueo de reminders.json');
      const wait = Date.now() + 50 + Math.random() * 50;
      while (Date.now() < wait) { /* busy-wait briefly, synchronously */ }
    }
  }
}

function releaseRemindersLock() {
  try { fs.rmdirSync(REMINDERS_LOCK); } catch {}
}

function withRemindersLock(fn) {
  acquireRemindersLock();
  try { return fn(); }
  finally { releaseRemindersLock(); }
}

module.exports = {
  DATA_DIR, REMINDERS_FILE, MAIL_CONFIG_FILE, PUSH_CONFIG_FILE, BANK_MAIL_CONFIG_FILE,
  ensureDataDir, readJSON, writeJSON,
  withRemindersLock, acquireRemindersLock, releaseRemindersLock,
};
