// =============================================
// MINHA CÉLULA EM CAMPO NA COPA
// service-worker.js
// =============================================

const CACHE_NAME = 'celula-na-copa-v1';

const ARQUIVOS_CACHE = [
  '/',
  '/index.html',
  '/album.html',
  '/lider.html',
  '/css/style.css',
  '/js/supabase-config.js',
  '/js/dashboard.js',
  '/js/album.js',
  '/js/lider.js',
  '/img/icon-192.png',
  '/img/icon-512.png'
];

// ── Instalar e cachear arquivos
self.addEventListener('install', event => {
  console.log('✅ Service Worker instalado!');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ARQUIVOS_CACHE);
    })
  );
  self.skipWaiting();
});

// ── Ativar e limpar cache antigo
self.addEventListener('activate', event => {
  console.log('✅ Service Worker ativado!');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Servir do cache quando offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ══════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ══════════════════════════════════════════════

// ── Receber push e exibir notificação
self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data?.json() || {};
  } catch {
    data = {
      title: '⚽ Minha Célula em Campo na Copa',
      body:  event.data?.text() || 'Nova atualização!'
    };
  }

  const options = {
    body:    data.body    || 'Nova notificação!',
    icon:    data.icon    || '/img/icon-192.png',
    badge:   data.badge   || '/img/icon-192.png',
    image:   data.image   || null,
    tag:     data.tag     || 'celula-na-copa',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'ver',    title: '👀 Ver agora' },
      { action: 'fechar', title: '✖️ Fechar'    }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '⚽ Copa das Vidas', options)
  );
});

// ── Clique na notificação
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'fechar') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Se já tem janela aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Caso contrário, abre nova janela
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Badge no ícone (contagem de notificações)
self.addEventListener('push', event => {
  if (navigator.setAppBadge) {
    navigator.setAppBadge(1);
  }
});