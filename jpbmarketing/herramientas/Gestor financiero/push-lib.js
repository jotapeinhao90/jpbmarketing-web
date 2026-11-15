'use strict';

const webpush = require('web-push');

function authHeader(pushConfig) {
  const token = Buffer.from(`${pushConfig.pagesUser}:${pushConfig.pagesPass}`).toString('base64');
  return `Basic ${token}`;
}

async function fetchSubscriptions(pushConfig) {
  if (!pushConfig.pagesUrl) return [];
  const res = await fetch(`${pushConfig.pagesUrl}/api/subscriptions`, {
    headers: { Authorization: authHeader(pushConfig) },
  });
  if (!res.ok) throw new Error(`No se pudieron obtener las suscripciones (${res.status})`);
  return res.json();
}

async function removeSubscription(pushConfig, endpoint) {
  try {
    await fetch(`${pushConfig.pagesUrl}/api/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader(pushConfig) },
      body: JSON.stringify({ endpoint }),
    });
  } catch {}
}

async function sendPushToAll(pushConfig, subscriptions, payload) {
  webpush.setVapidDetails(pushConfig.vapidSubject, pushConfig.vapidPublicKey, pushConfig.vapidPrivateKey);
  const results = [];
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      results.push({ endpoint: sub.endpoint, ok: true });
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await removeSubscription(pushConfig, sub.endpoint);
      }
      results.push({ endpoint: sub.endpoint, ok: false, error: err.message });
    }
  }
  return results;
}

module.exports = { fetchSubscriptions, sendPushToAll, removeSubscription };
