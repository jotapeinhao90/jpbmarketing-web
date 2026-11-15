'use strict';

const { sendReminderEmail } = require('../mail-lib');

const cfg = JSON.parse(require('fs').readFileSync(0, 'utf8'));

sendReminderEmail(cfg, {
  to: (Array.isArray(cfg.defaultRecipients) && cfg.defaultRecipients.length ? cfg.defaultRecipients.join(',') : cfg.gmailUser),
  subject: 'GestiónPyme — Correo de prueba',
  text: 'Si recibiste este correo, la configuración de recordatorios por email quedó lista.',
}).then(() => {
  console.log(JSON.stringify({ ok: true }));
}).catch((err) => {
  console.log(JSON.stringify({ ok: false, error: err.message }));
});
