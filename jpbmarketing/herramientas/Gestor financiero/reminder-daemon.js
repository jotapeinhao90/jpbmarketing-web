'use strict';

const { sendReminderEmail } = require('./mail-lib');
const { fetchSubscriptions, sendPushToAll } = require('./push-lib');
const {
  REMINDERS_FILE, MAIL_CONFIG_FILE, PUSH_CONFIG_FILE, readJSON, writeJSON,
  acquireRemindersLock, releaseRemindersLock,
} = require('./lib/paths');

const UNIT_MS = { minutes: 60 * 1000, hours: 60 * 60 * 1000, days: 24 * 60 * 60 * 1000 };
const UNIT_LABEL = { minutes: 'minutos', hours: 'horas', days: 'días' };

function isDue(entry, item, now) {
  if (!entry.enabled || !entry.dueDate) return false;
  if (item.lastSentFor === entry.dueDate) return false;
  const anchor = new Date(`${entry.dueDate}T${entry.dueTime || '09:00'}:00`);
  const fireAt = new Date(anchor.getTime() - item.amount * (UNIT_MS[item.unit] || UNIT_MS.days));
  return fireAt <= now;
}

async function loadPushSubscriptions() {
  const pushConfig = readJSON(PUSH_CONFIG_FILE, null);
  if (!pushConfig || !pushConfig.vapidPrivateKey) return null;
  try {
    const subscriptions = await fetchSubscriptions(pushConfig);
    return { pushConfig, subscriptions };
  } catch (err) {
    console.error('[reminder-daemon] No se pudieron cargar las suscripciones push:', err.message);
    return null;
  }
}

async function main() {
  const mailConfig = readJSON(MAIL_CONFIG_FILE, null);
  const hasMail = mailConfig && mailConfig.gmailUser && mailConfig.gmailAppPassword;
  const push = await loadPushSubscriptions();
  const hasPush = push && push.subscriptions.length > 0;

  if (!hasMail && !hasPush) {
    console.log('[reminder-daemon] Sin correo ni notificaciones push configuradas, nada que hacer.');
    return;
  }

  acquireRemindersLock();
  try {
    const reminders = readJSON(REMINDERS_FILE, {});
    const now = new Date();
    let changed = false;

    for (const entry of Object.values(reminders)) {
      const to = entry.email ||
        (mailConfig && Array.isArray(mailConfig.defaultRecipients) && mailConfig.defaultRecipients.length
          ? mailConfig.defaultRecipients.join(',') : mailConfig && mailConfig.gmailUser);

      for (const item of entry.items || []) {
        if (!isDue(entry, item, now)) continue;

        const offsetLabel = `${item.amount} ${UNIT_LABEL[item.unit] || item.unit} antes`;
        let sentSomething = false;

        if (hasMail) {
          try {
            await sendReminderEmail(mailConfig, {
              to,
              subject: `Recordatorio: ${entry.title}`,
              text: `Tu tarea "${entry.title}" vence el ${entry.dueDate} a las ${entry.dueTime || '09:00'} ` +
                    `(recordatorio de ${offsetLabel}).\n\nEnviado automáticamente por GestiónPyme.`,
            });
            sentSomething = true;
            console.log(`[reminder-daemon] Email "${entry.title}" (${offsetLabel}) a ${to}`);
          } catch (err) {
            console.error(`[reminder-daemon] Error enviando email "${entry.title}":`, err.message);
          }
        }

        // El aviso de 1 hora antes lo manda la nube (gestipyme-recordatorios), así no se duplica.
        const cloudCovers = item.amount === 1 && item.unit === 'hours';
        if (hasPush && !cloudCovers) {
          const results = await sendPushToAll(push.pushConfig, push.subscriptions, {
            title: `Recordatorio: ${entry.title}`,
            body: `Vence el ${entry.dueDate} a las ${entry.dueTime || '09:00'} (${offsetLabel})`,
            tag: `gestipyme-${entry.title}`,
          });
          if (results.some(r => r.ok)) sentSomething = true;
          results.filter(r => !r.ok).forEach(r =>
            console.error(`[reminder-daemon] Error push "${entry.title}" a ${r.endpoint}:`, r.error));
          if (results.some(r => r.ok)) {
            console.log(`[reminder-daemon] Push "${entry.title}" (${offsetLabel}) enviado a ${results.filter(r => r.ok).length} dispositivo(s)`);
          }
        }

        if (sentSomething) {
          item.lastSentFor = entry.dueDate;
          changed = true;
        }
      }
    }

    if (changed) writeJSON(REMINDERS_FILE, reminders);
  } finally {
    releaseRemindersLock();
  }
}

main().catch((err) => {
  console.error('[reminder-daemon] Error fatal:', err);
  process.exit(1);
});
