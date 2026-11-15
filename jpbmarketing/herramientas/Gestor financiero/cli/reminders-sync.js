'use strict';

const { REMINDERS_FILE, readJSON, writeJSON, withRemindersLock } = require('../lib/paths');

const task = JSON.parse(require('fs').readFileSync(0, 'utf8'));

withRemindersLock(() => {
  const all = readJSON(REMINDERS_FILE, {});

  if (!task.reminderEnabled || !task.dueDate || !task.reminders || !task.reminders.length) {
    delete all[task.id];
  } else {
    const prevItems = (all[task.id] && all[task.id].items) || [];
    const items = task.reminders.map((r) => {
      const prev = prevItems.find((p) => p.amount === r.amount && p.unit === r.unit);
      return { amount: r.amount, unit: r.unit, lastSentFor: prev ? prev.lastSentFor : null };
    });
    all[task.id] = {
      title: task.title,
      dueDate: task.dueDate,
      dueTime: task.dueTime || '09:00',
      email: task.reminderEmail || '',
      enabled: true,
      items,
    };
  }

  writeJSON(REMINDERS_FILE, all);
});

console.log('ok');
