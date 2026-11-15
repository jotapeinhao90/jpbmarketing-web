'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const PLIST_PATH = path.join(os.homedir(), 'Library', 'LaunchAgents', 'cl.jpbmarketing.gestipyme.reminders.plist');

try { execFileSync('launchctl', ['unload', PLIST_PATH]); } catch {}
try { fs.unlinkSync(PLIST_PATH); } catch {}
console.log(JSON.stringify({ ok: true }));
