// סינון לוגים לא קריטיים ברחבי המערכת
(function(){
  const originalLog = console.log;
  const criticalMarkers = ['❌','⚠️','שגיאה','Error','אזהרה','WARNING'];
  function isCritical(arg){
    return typeof arg === 'string' && criticalMarkers.some(m=>arg.includes(m));
  }
  console.log = function(...args){
    // מציג רק אם יש תוכן קריטי או אם הופעל verbose ידני
    if (args.some(isCritical) || localStorage.getItem('forceVerboseLogs')==='1') {
      originalLog.apply(console,args);
    } else {
      // מושתק
    }
  };
  // כלי לעבור זמנית למצב מפורט (במסוף): enableVerboseLogs()/disableVerboseLogs()
  window.enableVerboseLogs = ()=>localStorage.setItem('forceVerboseLogs','1');
  window.disableVerboseLogs = ()=>localStorage.removeItem('forceVerboseLogs');
})();