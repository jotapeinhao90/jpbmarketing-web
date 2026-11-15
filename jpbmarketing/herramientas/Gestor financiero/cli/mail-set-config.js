'use strict';

const { MAIL_CONFIG_FILE, writeJSON } = require('../lib/paths');

const cfg = JSON.parse(require('fs').readFileSync(0, 'utf8'));
writeJSON(MAIL_CONFIG_FILE, {
  gmailUser: cfg.gmailUser || '',
  gmailAppPassword: cfg.gmailAppPassword || '',
  defaultRecipients: Array.isArray(cfg.defaultRecipients) ? cfg.defaultRecipients : [],
}, 0o600);
console.log('ok');
