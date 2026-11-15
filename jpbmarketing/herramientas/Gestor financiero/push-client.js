'use strict';

const GESTIPYME_VAPID_PUBLIC_KEY =
  'BD8cZbyPSHkWWo00xXDMR23mKeUMTWTdkXmzl5-26IKZBcIfIfkdRBDsfTZ85O2wcuhxNegR-DTiD3skBaSV5ls';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

window.gestipymePush = {
  supported: 'serviceWorker' in navigator && 'PushManager' in window,

  async register() {
    if (!this.supported) return null;
    return navigator.serviceWorker.register('sw.js');
  },

  async getStatus() {
    if (!this.supported) return 'unsupported';
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'not-subscribed';
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'subscribed' : 'not-subscribed';
  },

  async subscribe() {
    if (!this.supported) throw new Error('Este navegador no soporta notificaciones push.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado.');

    const reg = await this.register();
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(GESTIPYME_VAPID_PUBLIC_KEY),
    });

    const res = await fetch('api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });
    if (!res.ok) throw new Error('No se pudo guardar la suscripción en el servidor.');
    return true;
  },

  async unsubscribe() {
    if (!this.supported) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch('api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
      await sub.unsubscribe();
    }
  },
};
