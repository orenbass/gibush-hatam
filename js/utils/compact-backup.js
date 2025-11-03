(function(){
  if (window.CompactBackup && window.CompactBackup.__version==='2.1') return;

  // --- Formatting helpers ---
  function formatDuration(ms){
    if(!ms && ms!==0) return null;
    if(typeof ms !== 'number' || ms < 0) return null;
    const totalSeconds = Math.floor(ms/1000);
    const minutes = Math.floor(totalSeconds/60);
    const seconds = totalSeconds % 60;
    const millis = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2,'0')}.${millis.toString().padStart(3,'0')}`; // m:ss.mmm
  }

  function sanitizeName(str){
    return (str||'').toString().trim()
      .replace(/[\u0590-\u05FF]/g, c => c) // keep Hebrew
      .replace(/[^A-Za-z0-9\u0590-\u05FF]+/g,'_')
      .replace(/^_+|_+$/g,'') || 'unknown';
  }

  // --- Core builder (verbose schema) ---
  function buildCompactBackupObject(){
    const s = window.state || {};
    const heats = s.heats || [];
    const crawl = s.crawlingDrills || {};
    const crawlSprints = crawl.sprints || [];
    const runnerStatuses = crawl.runnerStatuses || {};
    const sackCarriers = crawl.sackCarriers || {};
    const socHeats = (s.sociometricStretcher && s.sociometricStretcher.heats) || [];

    const runners = (s.runners||[]).map(r => {
      const shoulderNumber = r.shoulderNumber;

      // Sprint heats details
      const sprintHeats = heats.map((h, idx) => {
        if(!h || !Array.isArray(h.arrivals)) return null;
        const a = h.arrivals.find(a=>a.shoulderNumber===shoulderNumber);
        if(!a) return null;
        const timeMs = (typeof a.finishTime==='number') ? a.finishTime : null;
        return {
          heatIndex: idx+1,
          timeMs,
          timeFormatted: timeMs!=null ? formatDuration(timeMs) : null,
          comment: a.comment || null,
          rawStatus: a.status || null
        };
      }).filter(Boolean);

      // Crawling sprint heats details
      const crawlingSprints = crawlSprints.map((sp, idx) => {
        if(!sp || !Array.isArray(sp.arrivals)) return null;
        const a = sp.arrivals.find(a=>a.shoulderNumber===shoulderNumber);
        if(!a) return null;
        const timeMs = (typeof a.finishTime==='number') ? a.finishTime : null;
        return {
          sprintIndex: idx+1,
          timeMs,
          timeFormatted: timeMs!=null ? formatDuration(timeMs) : null,
          comment: a.comment || null
        };
      }).filter(Boolean);

      // Scores (guard if functions exist)
      let sprintFinal=0, crawlingFinal=0, stretcherFinal=0;
      
      // NEW: בדיקה אם יש ציונים ידניים - אם כן, להשתמש בהם במקום לחשב מחדש
      const manualScores = s.manualScores?.[shoulderNumber];
      
      if (manualScores) {
        // שימוש בציונים ידניים אם קיימים
        sprintFinal = manualScores.sprint ?? 0;
        crawlingFinal = manualScores.crawl ?? 0;
        stretcherFinal = manualScores.stretcher ?? 0;
        
        // חישוב רק לציונים שלא הוגדרו ידנית
        if (!manualScores.sprint) {
          try { sprintFinal = (window.calculateSprintFinalScore? window.calculateSprintFinalScore(r):0)||0; } catch(e){}
        }
        if (!manualScores.crawl) {
          try { crawlingFinal = (window.calculateCrawlingFinalScore? window.calculateCrawlingFinalScore(r):0)||0; } catch(e){}
        }
        if (!manualScores.stretcher) {
          try { stretcherFinal = (window.calculateStretcherFinalScore? window.calculateStretcherFinalScore(r):0)||0; } catch(e){}
        }
      } else {
        // אין ציונים ידניים - חישוב אוטומטי כרגיל
        try { sprintFinal = (window.calculateSprintFinalScore? window.calculateSprintFinalScore(r):0)||0; } catch(e){}
        try { crawlingFinal = (window.calculateCrawlingFinalScore? window.calculateCrawlingFinalScore(r):0)||0; } catch(e){}
        try { stretcherFinal = (window.calculateStretcherFinalScore? window.calculateStretcherFinalScore(r):0)||0; } catch(e){}
      }

      const sackData = sackCarriers[shoulderNumber];
      const sackTotalMs = sackData?.totalTime || 0;

      return {
        shoulderNumber,
        status: runnerStatuses[shoulderNumber] || 'active',
        sprintHeats,          // רשימת מקצי ספרינט ספציפיים שהרץ השתתף בהם
        crawlingSprints,      // רשימת זחילות ספרינט שהרץ השתתף בהם
        sackCarry: {
          totalTimeMs: sackTotalMs,
          totalTimeFormatted: sackTotalMs ? formatDuration(sackTotalMs) : null
        },
        quickComments: (s.quickComments && s.quickComments[shoulderNumber]) || [],
        generalComments: (s.generalComments && s.generalComments[shoulderNumber]) || null,
        manualScore: (s.manualScores && (s.manualScores[shoulderNumber]!==undefined) ? s.manualScores[shoulderNumber]: null),
        finalScores: {
          sprint: sprintFinal,
          crawling: crawlingFinal,
          stretcher: stretcherFinal
        }
      };
    });

    // Sociometric heats verbose
    const sociometricHeats = socHeats.map((h, idx) => {
      if(!h) return null;
      const order = h.selectionOrder || {};
      const hasData = (order.stretcher && order.stretcher.length) || (order.jerrican && order.jerrican.length) || (h.selections && Object.keys(h.selections).length);
      if(!hasData) return null;
      return {
        heatIndex: idx+1,
        stretcherOrder: (order.stretcher||[]).map(String),
        jerricanOrder: (order.jerrican||[]).map(String)
      };
    }).filter(Boolean);

    return {
      version: '2.1',
      evaluatorName: s.evaluatorName || '',
      groupNumber: s.groupNumber || '',
      generatedAt: new Date().toISOString(),
      generatedTimestamp: Date.now(),
      runners,
      sociometricHeats,
      config: {
        plannedSprintHeats: window.CONFIG?.NUM_HEATS,
        plannedCrawlingSprints: window.CONFIG?.MAX_CRAWLING_SPRINTS,
        plannedSociometricHeats: window.CONFIG?.NUM_STRETCHER_HEATS
      }
    };
  }

  function buildCompactBackupJSON(){
    const obj = buildCompactBackupObject();
    try { return JSON.stringify(obj, null, 2); } catch(e){ console.error('Compact backup stringify failed', e); return '{}'; }
  }

  function createCompactBackupBlob(){
    const json = buildCompactBackupJSON();
    return new Blob([json], { type: 'application/json' });
  }

  async function uploadCompactBackup(){
    try {
      if(!window.GoogleDriveUploader){ throw new Error('GoogleDriveUploader not loaded'); }
      const blob = createCompactBackupBlob();
      const evaluator = sanitizeName((window.state && window.state.evaluatorName) || '');
      const group = sanitizeName((window.state && window.state.groupNumber) || '');
      const base = evaluator || group ? `${evaluator || 'e'}_G${group || 'X'}` : 'backup';
      const fileName = `GIBUSH_BACKUP_${base}.json`;
      const result = await window.GoogleDriveUploader.upload(blob, fileName, { type: 'compact-backup-verbose', overwrite: true });
      return result;
    } catch(e){
      console.error('uploadCompactBackup failed', e);
      return { status: 'error', message: e.message };
    }
  }

  function downloadCompactBackupLocal(){
    try {
      const blob = createCompactBackupBlob();
      const evaluator = sanitizeName((window.state && window.state.evaluatorName) || '');
      const group = sanitizeName((window.state && window.state.groupNumber) || '');
      const base = evaluator || group ? `${evaluator || 'e'}_G${group || 'X'}` : 'backup';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `GIBUSH_BACKUP_${base}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch(e){ console.error('downloadCompactBackupLocal failed', e); }
  }

  async function createAndUploadCompactBackup(showModalFn){
    const modal = showModalFn || window.showModal;
    try {
      if (modal) modal('גיבוי', 'יוצר ושולח גיבוי מפורט...');
      const res = await uploadCompactBackup();
      if (modal){
        if(res.status==='success') modal('הצלחה', 'קובץ גיבוי מפורט נשלח לדרייב בהצלחה');
        else modal('שגיאה', 'שליחת גיבוי נכשלה: '+(res.message||'Unknown'));
      }
      return res;
    } catch(e){
      if (modal) modal('שגיאה', 'שגיאת מערכת בשליחת הגיבוי');
      return { status: 'error', message: e.message };
    }
  }

  window.CompactBackup = {
    __version: '2.1',
    buildCompactBackupObject,
    buildCompactBackupJSON,
    createCompactBackupBlob,
    uploadCompactBackup,
    downloadLocal: downloadCompactBackupLocal,
    createAndUploadCompactBackup,
    // NEW: alias for auto backup manager
    createBackup: buildCompactBackupObject
  };
})();