'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { DATA_DIR, ensureDataDir } = require('../lib/paths');

const LABEL = 'cl.jpbmarketing.gestipyme.bankimport';
const PLIST = path.join(os.homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);
const SCRIPT = path.join(__dirname, 'bank-import.js');
const NODE = execFileSync('/usr/bin/which', ['node'], { encoding: 'utf8' }).trim() || process.execPath;

ensureDataDir();
fs.writeFileSync(PLIST, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE}</string>
    <string>${SCRIPT}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>3</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>StandardOutPath</key><string>${path.join(DATA_DIR, 'bank-import.log')}</string>
  <key>StandardErrorPath</key><string>${path.join(DATA_DIR, 'bank-import-error.log')}</string>
</dict>
</plist>
`);
try { execFileSync('launchctl', ['unload', PLIST], { stdio: 'ignore' }); } catch {}
execFileSync('launchctl', ['load', PLIST]);
console.log('ok: importación diaria a las 03:00 instalada');
