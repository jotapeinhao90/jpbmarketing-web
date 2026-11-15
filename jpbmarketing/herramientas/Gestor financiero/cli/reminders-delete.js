'use strict';

const { REMINDERS_FILE, readJSON, writeJSON, withRemindersLock } = require('../lib/paths');

const taskId = process.argv[2];

withRemindersLock(() => {
  const all = readJSON(REMINDERS_FILE, {});
  delete all[taskId];
  writeJSON(REMINDERS_FILE, all);
});

console.log('ok');
