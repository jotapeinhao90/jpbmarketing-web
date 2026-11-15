'use strict';

const nodemailer = require('nodemailer');

function buildTransport(config) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.gmailUser, pass: config.gmailAppPassword },
  });
}

async function sendReminderEmail(config, { to, subject, text }) {
  const transport = buildTransport(config);
  await transport.sendMail({
    from: `"GestiónPyme" <${config.gmailUser}>`,
    to,
    subject,
    text,
  });
}

module.exports = { buildTransport, sendReminderEmail };
