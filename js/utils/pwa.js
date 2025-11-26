(function () {
  'use strict';
  let deferredInstallPrompt = null;

  // קביעת גרסת אפליקציה נוכחית ממקור יחיד (window.APP_VERSION) וסימון ראשוני אם חסר
  const CURRENT_APP_VERSION = window.APP_VERSION || null;
  if (CURRENT_APP_VERSION && !localStorage.getItem('appVersionInstalled')) {
    localStorage.setItem('appVersionInstalled', CURRENT_APP_VERSION);
    lastAnnouncedVersion = CURRENT_APP_VERSION;
  }

  function setup() {
    const installBtn = document.getElementById('install-btn');
    if (!installBtn) return;

    const isApple = /iP(hone|ad|od)|Mac/i.test(navigator.userAgent);
    installBtn.style.display = isApple ? 'none' : 'none';

    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) {
        window.showModal?.('התקנה', 'לא ניתן להתקין כעת. ודא שהעמוד נטען ב-HTTPS ונסה מאוחר יותר.');
        return;
      }
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(() => {});
      deferredInstallPrompt = null;
      installBtn.style.display = 'none';
    });
  }

  // פונקציה לניקוי Cache ו-Service Worker
  async function clearAllCachesAndReload() {
    try {
      console.log('[PWA] Starting cache clear...');
      
      // 1. שליחת הודעה ל-Service Worker למחוק את כל ה-Caches
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_ALL_CACHES'
        });
      }
      
      // 2. מחיקה ישירה של כל ה-Caches
      if (window.caches) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[PWA] Deleted caches:', cacheNames);
      }
      
      // 3. ביטול רישום של כל ה-Service Workers
      if (navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        console.log('[PWA] Unregistered', registrations.length, 'service workers');
      }
      
      // 4. ניקוי sessionStorage
      sessionStorage.clear();
      
      console.log('[PWA] Cache cleared successfully!');
      return true;
    } catch (error) {
      console.error('[PWA] Error clearing cache:', error);
      return false;
    }
  }

  // פונקציה לקבלת גרסה מה-Service Worker
  async function getServiceWorkerVersion() {
    return new Promise((resolve) => {
      if (!navigator.serviceWorker?.controller) {
        resolve('לא זמין');
        return;
      }
      
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data?.type === 'CURRENT_VERSION') {
          resolve(event.data.version);
        } else {
          resolve('לא ידוע');
        }
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
      
      // Timeout אחרי 2 שניות
      setTimeout(() => resolve('לא ידוע'), 2000);
    });
  }

  // פונקציה לרענון האפליקציה עם ניקוי Cache
  async function forceRefreshApp() {
    const success = await clearAllCachesAndReload();
    if (success) {
      // המתנה קצרה לוודא שהכל נמחק
      setTimeout(() => {
        window.location.reload(true); // Hard reload
      }, 500);
    } else {
      alert('שגיאה בניקוי Cache. נסה לרענן ידנית (Ctrl+Shift+R)');
    }
  }

  // משתנה פנימי למניעת כפילויות התרעה
  let lastAnnouncedVersion = localStorage.getItem('appVersionInstalled') || null;

  // עזר: האם יש עדכון אמיתי של גרסה (שונה מהמותקנת)
  function isUpdateAvailable(incomingVersion) {
    if (!incomingVersion) return false;
    if (incomingVersion === 'לא זמין' || incomingVersion === 'לא ידוע') return false; // ערכים לא תקפים
    const installed = localStorage.getItem('appVersionInstalled');
    if (!installed) return true;
    // השוואה מול הגרסה הטעונה בזיכרון (אם קיימת)
    if (CURRENT_APP_VERSION && incomingVersion === CURRENT_APP_VERSION) return false;
    return installed !== incomingVersion && incomingVersion !== CURRENT_APP_VERSION;
  }

  // פונקציה האם להציג באנר/מודאל עדכון
  function shouldShowUpdateBanner(incomingVersion) {
    if (!isUpdateAvailable(incomingVersion)) return false;
    // מניעת כפילות
    if (lastAnnouncedVersion === incomingVersion) return false;
    return true;
  }

  // עזר: סימון גרסה כמותקנת
  function markVersionInstalled(v) {
    if (!v) return;
    localStorage.setItem('appVersionInstalled', v);
    lastAnnouncedVersion = v;
  }

  // איחוד ייצוא הפונקציות ל-namespace אחד לאחר ההגדרות כדי להבטיח שקיימת setup
  window.PWA = window.PWA || {};
  Object.assign(window.PWA, {
    setup,
    clearAllCachesAndReload,
    forceRefreshApp,
    getServiceWorkerVersion,
    isUpdateAvailable,
    markVersionInstalled
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.style.display = 'inline-flex';
  });

  window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.style.display = 'none';
    deferredInstallPrompt = null;
  });

  // האזנה לעדכון גרסה מה-Service Worker
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'VERSION_UPDATE') {
        const newVersion = event.data.version;
        console.log('[PWA] VERSION_UPDATE received:', newVersion);
        if (!shouldShowUpdateBanner(newVersion)) {
          console.log('[PWA] No banner (version not considered new or invalid). Installed:', localStorage.getItem('appVersionInstalled'));
          // אם זו אותה גרסה כמו הזכרון אך לא מסומנת עדיין – נסמן בכל זאת.
          if (newVersion && newVersion !== 'לא זמין' && newVersion !== 'לא ידוע' && !localStorage.getItem('appVersionInstalled')) {
            markVersionInstalled(newVersion);
          }
          return;
        }
        // סימון גרסה חדשה ואז הצגת התרעה
        markVersionInstalled(newVersion);
        if (window.showModal) {
          try {
            const releaseNotesHtml = window.ReleaseNotes?.buildHtml?.({ version: newVersion, includePrevious: 1 }) || '';
            const options = { confirmText: 'רענן עכשיו', cancelText: 'סגור' };

            if (releaseNotesHtml) {
              options.extraHtml = `<div id="modal-release-notes-container" style="display:none;margin-top:16px;">${releaseNotesHtml}</div>`;
              options.secondaryAction = {
                text: '📋 מה חדש?',
                ariaLabel: 'הצג מה חדש בגרסה',
                onInit: ({ modal, button }) => {
                  button.setAttribute('aria-expanded', 'false');
                  const panel = modal.querySelector('#modal-release-notes-container');
                  if (panel) panel.setAttribute('aria-hidden', 'true');
                },
                onClick: ({ modal, button }) => {
                  const panel = modal.querySelector('#modal-release-notes-container');
                  if (!panel) return;
                  const expanded = panel.getAttribute('data-open') === 'true';
                  const next = !expanded;
                  panel.style.display = next ? 'block' : 'none';
                  panel.setAttribute('data-open', String(next));
                  panel.setAttribute('aria-hidden', String(!next));
                  button.innerHTML = next ? '✖ סגור מה חדש' : '📋 מה חדש?';
                  button.setAttribute('aria-expanded', String(next));
                }
              };
            }

            window.showModal('עדכון זמין', 'גרסה חדשה '+ newVersion +' זמינה. רענן לקבלת הקוד המעודכן.', () => {
              // פעולה ברירת מחדל: רענון קשה לאחר אישור
              try { window.PWA?.forceRefreshApp?.(); } catch(e){}
            }, false, null, options);
          } catch(e){ console.warn('Modal show failed', e); }
        } else {
          console.log('[PWA] New version available:', newVersion);
        }
        return;
      }
      if (event.data?.type === 'CACHES_CLEARED') {
        console.log('[PWA] Service Worker confirmed cache clear');
      }
    });
  }

  // הוספת בדיקה יזומה אחרי טעינה: אם SW כבר פעיל וגרסה שונה מה-window.APP_VERSION
  window.addEventListener('load', async () => {
    try {
      const swVersion = await (window.PWA?.getServiceWorkerVersion?.() || Promise.resolve(null));
      // התעלמות מערכים לא תקפים
      if (swVersion === 'לא זמין' || swVersion === 'לא ידוע') {
        console.log('[PWA] SW version not ready, skipping sync');
      } else if (swVersion && shouldShowUpdateBanner(swVersion)) {
        console.log('[PWA] Detected real SW update to', swVersion, 'installed:', localStorage.getItem('appVersionInstalled'));
        // לא מציגים מיד מודאל – רק מסמנים ונותנים ל-message מאירוע רשמי לטפל אם יגיע
        markVersionInstalled(swVersion);
      }
      // יישור CONFIG.APP_VERSION
      if (CURRENT_APP_VERSION && (!window.CONFIG?.APP_VERSION || window.CONFIG.APP_VERSION !== CURRENT_APP_VERSION)) {
        try { window.CONFIG = window.CONFIG || {}; window.CONFIG.APP_VERSION = CURRENT_APP_VERSION; } catch(e){}
      }
    } catch(e) {
      console.warn('[PWA] Initial version sync failed', e);
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(r => {
          console.log('[PWA] Service worker registered', r.scope);
          
          // בדיקה לעדכון Service Worker
          r.addEventListener('updatefound', () => {
            const newWorker = r.installing;
            console.log('[PWA] New service worker found, installing...');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available! Consider showing update prompt.');
                // כאן ניתן להציג הודעה למשתמש שיש גרסה חדשה
              }
            });
          });
        })
        .catch(err => console.warn('[PWA] SW register failed', err));
    });
  }
})();