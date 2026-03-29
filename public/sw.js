const CACHE_NAME = 'erpcrm-v1.0.0';
const STATIC_CACHE = 'erpcrm-static-v1.0.0';
const DYNAMIC_CACHE = 'erpcrm-dynamic-v1.0.0';

// Arquivos essenciais para cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker instalado');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Cacheando arquivos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker ativado');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requisições de desenvolvimento (localhost:5173)
  if (url.hostname === 'localhost' && url.port === '5173') {
    return;
  }
  
  // Ignorar requisições de API (não interceptar chamadas de backend)
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/dashboard/') ||
      url.pathname.startsWith('/branches') ||
      url.pathname.startsWith('/sales') ||
      url.pathname.startsWith('/orders') ||
      url.pathname.startsWith('/products') ||
      url.pathname.startsWith('/customers') ||
      url.pathname.startsWith('/reservations') ||
      url.pathname.startsWith('/reports') ||
      url.pathname.startsWith('/cash') ||
      url.pathname.startsWith('/expenses') ||
      url.pathname.startsWith('/fiscal') ||
      url.hostname.includes('railway.app') ||
      url.hostname.includes('api')) {
    return;
  }
  
  // Estratégia: Cache First para arquivos estáticos
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      url.pathname.includes('/icons/') ||
      url.pathname.includes('/static/')) {
    
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request)
            .then(response => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              const responseToCache = response.clone();
              caches.open(STATIC_CACHE)
                .then(cache => {
                  cache.put(request, responseToCache);
                });
              
              return response;
            });
        })
    );
    return;
  }
  
  // Estratégia: Network First para API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Cache de respostas GET por 5 minutos
          if (request.method === 'GET') {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseToCache);
              });
          }
          
          return response;
        })
        .catch(() => {
          // Tentar do cache se network falhar
          return caches.match(request);
        })
    );
    return;
  }
  
  // Estratégia: Network First para páginas
  event.respondWith(
    fetch(request)
      .then(response => {
        if (!response || response.status !== 200) {
          return caches.match('/').then(cached => cached || response);
        }
        
        // Cache de páginas HTML
        if (request.destination === 'document') {
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then(cache => {
              cache.put(request, responseToCache);
            });
        }
        
        return response;
      })
      .catch(() => {
        // Fallback para página offline
        if (request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Sincronização em background
self.addEventListener('sync', event => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'sync-sales') {
    event.waitUntil(syncSalesData());
  }
});

// Notificações push
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do ERPCRM',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('ERPCRM', options)
  );
});

// clique em notificação
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Função para sincronizar dados de vendas
async function syncSalesData() {
  try {
    // Lógica para sincronizar vendas pendentes
    console.log('🔄 Sincronizando vendas pendentes...');
    // Implementar lógica de sincronização aqui
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
  }
}
