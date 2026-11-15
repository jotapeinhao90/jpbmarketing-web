'use strict';

const { PUSH_CONFIG_FILE, readJSON } = require('../lib/paths');

const cfg = readJSON(PUSH_CONFIG_FILE, null) || {};
console.log(JSON.stringify({
  pagesUrl: cfg.pagesUrl || '',
  pagesUser: cfg.pagesUser || '',
  pagesPass: cfg.pagesPass || '',
}));
