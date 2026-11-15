'use strict';

// Lists recent bank emails so the parser can be designed against the real format.
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { BANK_MAIL_CONFIG_FILE, readJSON } = require('../lib/paths');

(async () => {
  const cfg = readJSON(BANK_MAIL_CONFIG_FILE, null);
  if (!cfg) { console.error('Falta bank-mail-config.json'); process.exit(1); }
  const client = new ImapFlow({
    host: 'imap.gmail.com', port: 993, secure: true,
    auth: { user: cfg.user, pass: cfg.appPassword }, logger: false,
  });
  await client.connect();
  const lock = await client.getMailboxLock('[Gmail]/Todos');
  try {
    const uids = await client.search({ or: [{ from: 'bancochile' }, { body: 'Banco de Chile' }], since: new Date(Date.now() - 45 * 864e5) }, { uid: true });
    const last = uids.slice(-int(process.argv[2] || 5));
    for (const uid of last) {
      const msg = await client.fetchOne(uid, { source: true }, { uid: true });
      const mail = await simpleParser(msg.source);
      console.log('==========');
      console.log('FROM:', mail.from && mail.from.text);
      console.log('SUBJECT:', mail.subject);
      console.log('DATE:', mail.date);
      console.log((mail.text || '').replace(/\n{3,}/g, '\n\n').slice(0, 1500));
    }
    console.log(`\n(${uids.length} correos en 45 días)`);
  } finally {
    lock.release();
    await client.logout();
  }
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });

function int(v) { return parseInt(v, 10); }
