// Service Worker per Beer Tracker PWA
const CACHE_NAME = 'beer-tracker-v1.0.0';
const STATIC_CACHE_NAME = 'beer-tracker-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'beer-tracker-dynamic-v1.0.0';

// File da cachare per funzionamento offline
const STATIC_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/config.js',
  '/manifest.json',
  // Font Awesome
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  // Supabase
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  // Icone essenziali
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Installazione Service Worker
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Cache failed', error);
      })
  );
});

// Attivazione Service Worker
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Rimuovi cache vecchie
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Strategia di fetch: Cache First per risorse statiche, Network First per dati
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora richieste non-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Strategia per risorse statiche (Cache First)
  if (isStaticResource(request)) {
    event.respondWith(cacheFirst(request));
  }
  // Strategia per API Supabase (Network First)
  else if (isSupabaseAPI(request)) {
    event.respondWith(networkFirst(request));
  }
  // Strategia per tutto il resto (Stale While Revalidate)
  else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Determina se è una risorsa statica
function isStaticResource(request) {
  const url = new URL(request.url);
  return STATIC_FILES.some(file => 
    url.pathname === file || 
    url.href === file ||
    request.url.includes('cdnjs.cloudflare.com') ||
    request.url.includes('fonts.googleapis.com')
  );
}

// Determina se è API Supabase
function isSupabaseAPI(request) {
  return request.url.includes('supabase.co');
}

// Cache First Strategy
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('📱 Service Worker: Serving from cache (offline)', request.url);
    return caches.match('/index.html'); // Fallback offline
  }
}

// Network First Strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('📱 Service Worker: Network failed, checking cache', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const networkResponsePromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    console.log('📱 Service Worker: Network failed for', request.url);
  });
  
  // Restituisci la cache se disponibile, altrimenti aspetta la rete
  return cachedResponse || networkResponsePromise;
}

// Gestione messaggi dal client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔄 Service Worker: Skip waiting requested');
    self.skipWaiting();
  }
});

// Notifica update disponibile
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION',
      version: CACHE_NAME
    });
  }
});

// Background Sync per dati offline (se necessario)
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync-beers') {
    event.waitUntil(syncOfflineData());
  }
});

// Funzione per sincronizzare dati offline
async function syncOfflineData() {
  try {
    // Qui potresti implementare la sincronizzazione
    // dei dati salvati offline quando torna la connessione
    console.log('🔄 Service Worker: Syncing offline data...');
  } catch (error) {
    console.error('❌ Service Worker: Sync failed', error);
  }
}