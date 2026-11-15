'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { DATA_DIR, ensureDataDir } = require('../lib/paths');

const PLIST_LABEL = 'cl.jpbmarketing.gestipyme.reminders';
const PLIST_PATH = path.join(os.homedir(), 'Library', 'LaunchAgents', `${PLIST_LABEL}.plist`);
const DAEMON_PATH = path.join(__dirname, '..', 'reminder-daemon.js');

function resolveNodePath() {
  try {
    return execFileSync('/usr/bin/which', ['node'], { encoding: 'utf8' }).trim() || process.execPath;
  } catch {
    return process.execPath;
  }
}

function plistContents() {
  ensureDataDir();
  const nodePath = resolveNodePath();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${DAEMON_PATH}</string>
  </array>
  <key>StartInterval</key><integer>900</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>${path.join(DATA_DIR, 'reminder-daemon.log')}</string>
  <key>StandardErrorPath</key><string>${path.join(DATA_DIR, 'reminder-daemon-error.log')}</string>
</dict>
</plist>
`;
}

try {
  fs.mkdirSync(path.dirname(PLIST_PATH), { recursive: true });
  fs.writeFileSync(PLIST_PATH, plistContents());
  execFileSync('launchctl', ['load', PLIST_PATH]);
  console.log(JSON.stringify({ ok: true }));
} catch (err) {
  console.log(JSON.stringify({ ok: false, error: err.message }));
}
