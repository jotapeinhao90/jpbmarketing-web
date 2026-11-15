'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const PLIST_PATH = path.join(os.homedir(), 'Library', 'LaunchAgents', 'cl.jpbmarketing.gestipyme.reminders.plist');

console.log(JSON.stringify({ installed: fs.existsSync(PLIST_PATH) }));
