// google-drive-reader.js
// Service to fetch unified aggregated Gibush JSON file for a given month/year
// Non-blocking; returns parsed JSON or throws.
(function(){
  if (window.GoogleDriveReader) return;

  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxa7PQhm5paLGvvf7bDNjxLHPjMWfXDUso-exppkkzv53-9Hb3waV6Gj2Kepxmizjw/exec'; // same as uploader

  async function fetchAggregated({ year, month }) {
    if (!year || !month) throw new Error('חסר שנה או חודש');
    const mm = String(month).padStart(2,'0');
    const url = `${APPS_SCRIPT_URL}?action=downloadAggregatedExisting&year=${year}&month=${mm}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('שגיאת רשת');
    const txt = await res.text();
    let json;
    try { json = JSON.parse(txt); } catch(e){ throw new Error('JSON לא תקין'); }
    if (json.error) throw new Error(json.error);
    if (!Array.isArray(json)) {
      if (Array.isArray(json.items)) return json.items;
      throw new Error('מבנה קובץ לא צפוי');
    }
    return json;
  }

  /**
   * הורדת קובץ הגדרות מערכת מ-Google Drive
   * @returns {Promise<Object>} - אובייקט הגדרות המערכת
   */
  async function fetchSystemSettings() {
    try {
      console.log('📥 מוריד קובץ הגדרות מערכת מ-Google Drive...');
      
      // השרת מצפה ל-action בשם 'downloadSettingsBackup'
      const url = `${APPS_SCRIPT_URL}?action=downloadSettingsBackup`;
      
      console.log('🌐 שולח בקשה ל:', url);
      
      const res = await fetch(url);
      
      if (!res.ok) {
        console.warn('⚠️ לא ניתן להוריד הגדרות מהדרייב, משתמש בהגדרות מקומיות');
        return null;
      }
      
      const txt = await res.text();
      let json;
      
      try { 
        json = JSON.parse(txt); 
      } catch(e) { 
        console.warn('⚠️ JSON של הגדרות לא תקין, משתמש בהגדרות מקומיות');
        console.error('שגיאת Parse:', e);
        console.log('תגובה מהשרת:', txt.substring(0, 200));
        return null;
      }
      
      if (json.error) {
        console.warn('⚠️ שגיאה בהורדת הגדרות:', json.error);
        return null;
      }
      
      console.log('✅ קובץ הגדרות הורד בהצלחה מהדרייב');
      return json;
      
    } catch (error) {
      console.warn('⚠️ שגיאה בהורדת הגדרות:', error.message);
      return null;
    }
  }

  window.GoogleDriveReader = { 
    fetchAggregated,
    fetchSystemSettings 
  };
})();