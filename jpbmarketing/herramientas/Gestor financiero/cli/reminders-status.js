'use strict';

const { REMINDERS_FILE, readJSON } = require('../lib/paths');

const taskId = process.argv[2];
const all = readJSON(REMINDERS_FILE, {});
console.log(JSON.stringify(all[taskId] || null));
