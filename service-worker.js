// גרסת האפליקציה - נטענת ממקור יחיד
importScripts('./js/config/app-version.js');
const APP_VERSION = self.APP_VERSION || 'v0.0.0';
const CACHE_NAME = `gibush-cache-${APP_VERSION}`;

const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/js/config/config.js', // updated path
  '/quick-comments.js',
  '/styles.css',
  '/landing.html',
  '/landing-auth.js',
  '/js/config/users-config.js', // updated path
  '/css/main.css',
  '/css/icons.css',
  '/js/utils/modal.js',
  '/js/utils/time.js',
  '/js/utils/scoring.js',
  '/js/pages/runners.js',
  '/js/pages/heat.js',
  '/js/pages/report.js',
  '/js/pages/status-management.js',
  '/js/pages/crawling-comments.js',
  '/js/pages/crawling-sprint.js',
  '/js/pages/stretcher-heat.js'
];

// התקנה - cache של כל הקבצים
self.addEventListener('install', event => {
  console.log('[SW] Installing version:', APP_VERSION);
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of ASSETS) {
      try {
        const resp = await fetch(url, { cache: 'no-cache' });
        if (resp.ok) {
          await cache.put(url, resp);
        }
      } catch (e) {
        console.warn('[SW] Failed to cache:', url, e.message);
      }
    }
    // מעבר מיידי לגרסה החדשה
    await self.skipWaiting();
  })());
});

// הפעלה - מחיקת Cache ישנים
self.addEventListener('activate', event => {
  console.log('[SW] Activating version:', APP_VERSION);
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // מחיקת כל ה-caches הישנים
    const toDelete = keys.filter(key => key !== CACHE_NAME);
    await Promise.all(
      toDelete.map(key => {
        console.log('[SW] Deleting old cache:', key);
        return caches.delete(key);
      })
    );
    // שליטה מיידית על כל הלקוחות
    await self.clients.claim();

    // נחשב האם באמת הייתה עדכון (היו קאש ישנים שנמחקו) ולא רק הפעלה ראשונה או רענון
    const wasUpdated = toDelete.length > 0;

    if (wasUpdated) {
      // שליחת הודעה לכל הלקוחות שהגרסה עודכנה (רק אם באמת השתנתה)
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'VERSION_UPDATE',
          version: APP_VERSION
        });
      });
    } else {
      console.log('[SW] No previous cache to delete -> no version change broadcast');
    }
  })());
});

// Fetch - Network First עם Fallback ל-Cache
self.addEventListener('fetch', event => {
  // דילוג על בקשות שאינן GET
  if (event.request.method !== 'GET') return;
  
  event.respondWith((async () => {
    try {
      // נסה לקבל מהרשת תמיד (כדי לקבל עדכונים)
      const response = await fetch(event.request, {
        cache: 'no-cache'
      });
      
      // אם התשובה תקינה, שמור ב-cache
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
      }
      
      return response;
    } catch (error) {
      // אם הרשת נכשלה, נסה להחזיר מה-cache
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        console.log('[SW] Serving from cache:', event.request.url);
        return cachedResponse;
      }
      
      // אם אין ברשת ואין ב-cache - החזר שגיאה
      return new Response('Offline - Resource not available', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    }
  })());
});

// הודעות מהאפליקציה
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CLEAR_ALL_CACHES') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
      console.log('[SW] All caches cleared');
      
      // שלח אישור חזרה
      event.source.postMessage({
        type: 'CACHES_CLEARED',
        success: true
      });
    })());
  }
  
  if (event.data?.type === 'GET_VERSION') {
    event.source.postMessage({
      type: 'CURRENT_VERSION',
      version: APP_VERSION
    });
  }
});

// (אפשר להרחיב קאשינג מאוחר יותר)