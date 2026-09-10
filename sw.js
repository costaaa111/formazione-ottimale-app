"use strict";

// Service worker: cache offline dell'ultima rosa/formazione conosciuta e
// gestione delle notifiche Web Push (VAPID -- vedi app.js per la
// sottoscrizione e scripts/notifiche_webpush.py per l'invio da GitHub
// Actions). Nessuna logica di dominio qui dentro: solo caching e
// visualizzazione della notifica ricevuta.

const CACHE_VERSION = 'fo-v1';
const APP_SHELL = ['./', './index.html', './style.css', './app.js', './manifest.json'];
const DATA_PATHS = ['/rosa.json', '/formazione.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (DATA_PATHS.some((p) => url.pathname.endsWith(p))) {
    // I JSON cambiano a ogni giornata: rete-prima, cache solo come
    // fallback offline (es. sotto la doccia allo stadio senza campo).
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App shell: cache-prima, cambia solo quando ripubblichi la PWA.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// ---------------------------------------------------------------------------
// Web Push
// ---------------------------------------------------------------------------

self.addEventListener('push', (event) => {
  let payload = { title: 'Formazione Ottimale', body: 'Controlla la formazione della giornata.' };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      data: { url: payload.url || './' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
