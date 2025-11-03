// מקור יחיד לגרסת האפליקציה
(function(){
  const APP_VERSION = '3.0'; // שנה כאן בלבד לעדכון הגרסה
  // בדף רגיל
  if (typeof window !== 'undefined') {
    window.APP_VERSION = APP_VERSION;
    if (window.CONFIG) window.CONFIG.APP_VERSION = APP_VERSION;
    if (window.LANDING_CONFIG?.branding) window.LANDING_CONFIG.branding.version = APP_VERSION;
  }
  // ב-service worker scope
  if (typeof self !== 'undefined') {
    self.APP_VERSION = APP_VERSION;
  }
})();