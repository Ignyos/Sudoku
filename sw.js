/**
 * Service Worker for Sudoku PWA
 * Handles offline caching and provides offline-first experience
 */

const CACHE_NAME = 'sudoku-v1.0.0';
const RUNTIME_CACHE = 'sudoku-runtime';

// Assets to cache on install
const STATIC_ASSETS = [
  '/Sudoku/',
  '/Sudoku/index.html',
  '/Sudoku/play.html',
  '/Sudoku/settings.html',
  '/Sudoku/stats.html',
  '/Sudoku/history.html',
  '/Sudoku/css/style.css',
  '/Sudoku/css/responsive.css',
  '/Sudoku/js/utils.js',
  '/Sudoku/js/validator.js',
  '/Sudoku/js/solver.js',
  '/Sudoku/js/generator.js',
  '/Sudoku/js/storage.js',
  '/Sudoku/js/grid.js',
  '/Sudoku/js/play.js',
  '/Sudoku/js/menu.js',
  '/Sudoku/js/settings.js',
  '/Sudoku/js/stats.js',
  '/Sudoku/js/history.js',
  '/Sudoku/js/nav.js',
  '/Sudoku/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }
        
        // Clone the request
        const fetchRequest = request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Cache the fetched response for runtime
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return response;
        }).catch(() => {
          // If both cache and network fail, show offline page
          if (request.destination === 'document') {
            return caches.match('/Sudoku/index.html');
          }
        });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
