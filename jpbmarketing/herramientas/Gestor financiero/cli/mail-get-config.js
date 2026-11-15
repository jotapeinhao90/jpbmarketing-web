'use strict';

const { MAIL_CONFIG_FILE, readJSON } = require('../lib/paths');

const cfg = readJSON(MAIL_CONFIG_FILE, null) || { gmailUser: '', gmailAppPassword: '', defaultRecipients: [] };
if (!Array.isArray(cfg.defaultRecipients)) cfg.defaultRecipients = [];
console.log(JSON.stringify(cfg));
