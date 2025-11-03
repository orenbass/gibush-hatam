(function(){
  window.Pages = window.Pages || {};
  if (window.Pages.renderBackupDashboardPage) return;

  function log(msg){
    const box = document.getElementById('backup-log-box');
    if (!box) return; 
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}] ${msg}`;
    box.prepend(line);
  }

  async function runWithStatus(btn, fn){
    if (!btn) return;
    const original = btn.textContent;
    btn.disabled = true; btn.textContent = 'מבצע...';
    try { await fn(); btn.textContent = '✔️ הצלחה'; setTimeout(()=> btn.textContent = original, 1600); }
    catch(e){ console.error(e); btn.textContent = '❌ שגיאה'; log('שגיאה: '+(e.message||e)); setTimeout(()=> btn.textContent = original, 2200); }
    finally { btn.disabled = false; }
  }

  function formatMs(ms){
    if (!ms && ms!==0) return '-';
    const s = Math.floor(ms/1000); const m = Math.floor(s/60); const r = s%60; return `${m}:${r.toString().padStart(2,'0')}`;
  }

  function startAutoCompact(){
    stopAutoCompact();
    window.__autoCompactBackupInterval = setInterval(async ()=>{
      try {
        if (!window.CompactBackup) return;
        const res = await window.CompactBackup.createAndUploadCompactBackup();
        log(res.status==='success'?'גיבוי אוטומטי נשלח לדרייב':'גיבוי אוטומטי נכשל: '+res.message);
      } catch(e){ log('שגיאת גיבוי אוטומטי: '+e.message); }
    }, 5*60*1000); // כל 5 דקות
    log('גיבוי אוטומטי הופעל (כל 5 דק)');
  }
  function stopAutoCompact(){
    if (window.__autoCompactBackupInterval){ clearInterval(window.__autoCompactBackupInterval); window.__autoCompactBackupInterval=null; log('גיבוי אוטומטי נעצר'); }
  }

  window.Pages.renderBackupDashboardPage = function renderBackupDashboardPage(){
    const root = document.getElementById('content');
    if (!root) return;

    const runnerCount = (state.runners||[]).length;
    const activeRunners = (state.runners||[]).filter(r=> !state.crawlingDrills?.runnerStatuses?.[r.shoulderNumber]).length;
    const heatsDone = (state.heats||[]).filter(h=>h.finished).length;
    const crawlSprintsDone = (state.crawlingDrills?.sprints||[]).filter(sp=>sp.finished).length;
    const stretcherHeatsDone = (state.sociometricStretcher?.heats||[]).filter(h=> (h.selectionOrder && (h.selectionOrder.stretcher?.length||h.selectionOrder.jerrican?.length||0) >0)).length;

    root.innerHTML = `
      <div class="max-w-3xl mx-auto space-y-6" dir="rtl">
        <h2 class="text-2xl font-bold text-center text-blue-600">דשבורד גיבוי</h2>
        <p class="text-center text-sm text-gray-600">ניהול קבצי גיבוי, ייצוא דוחות ושליחה לדרייב. זמין בכל שלב.</p>

        <section class="p-4 rounded-lg bg-white shadow border space-y-2">
          <h3 class="font-semibold text-lg">מידע כללי</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div class="p-2 bg-gray-50 rounded">
              <div class="text-gray-500">שם מעריך</div>
              <div class="font-medium">${state.evaluatorName||'—'}</div>
            </div>
            <div class="p-2 bg-gray-50 rounded">
              <div class="text-gray-500">מס' קבוצה</div>
              <div class="font-medium">${state.groupNumber||'—'}</div>
            </div>
            <div class="p-2 bg-gray-50 rounded">
              <div class="text-gray-500">כמות רצים</div>
              <div class="font-medium">${runnerCount}</div>
            </div>
            <div class="p-2 bg-gray-50 rounded">
              <div class="text-gray-500">פעילים</div>
              <div class="font-medium">${activeRunners}</div>
            </div>
            <div class="p-2 bg-gray-50 rounded">
              <div class="text-gray-500">מקצי ספרינט שהושלמו</div>
              <div class="font-medium">${heatsDone}/${CONFIG.NUM_HEATS}</div>
            </div>
            <div class="p-2 bg-gray-50 rounded">
              <div class="text-gray-500">זחילות ספרינט שהושלמו</div>
              <div class="font-medium">${crawlSprintsDone}/${CONFIG.MAX_CRAWLING_SPRINTS}</div>
            </div>
          </div>
        </section>

        <section class="p-4 rounded-lg bg-white shadow border space-y-3">
          <h3 class="font-semibold text-lg">פעולות גיבוי</h3>
          <div class="flex flex-wrap gap-2">
            <button id="btn-full-download" class="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">הורדת גיבוי מלא (JSON)</button>
            <button id="btn-full-import" class="px-3 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium">ייבוא גיבוי מלא</button>
            <button id="btn-compact-download" class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">הורדת גיבוי קומפקטי</button>
            <button id="btn-compact-drive" class="px-3 py-2 rounded bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium">שליחת גיבוי קומפקטי לדרייב</button>
          </div>
          <div class="flex items-center gap-2 text-sm mt-2">
            <input id="chk-auto-compact" type="checkbox" class="w-4 h-4">
            <label for="chk-auto-compact" class="select-none">שליחת גיבוי קומפקטי אוטומטית כל 5 דקות</label>
          </div>
          <input id="import-backup-file" type="file" accept="application/json" class="hidden" />
        </section>

        <section class="p-4 rounded-lg bg-white shadow border space-y-3">
          <h3 class="font-semibold text-lg">דוחות</h3>
          <div class="flex flex-wrap gap-2">
            <button id="btn-report-download" class="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium">הורדת דוח (XLSX/CSV)</button>
            <button id="btn-report-drive" class="px-3 py-2 rounded bg-green-500 hover:bg-green-600 text-white text-sm font-medium">העלאת דוח לדרייב</button>
            <button id="btn-report-both" class="px-3 py-2 rounded bg-green-700 hover:bg-green-800 text-white text-sm font-medium">הורדה + דרייב</button>
          </div>
        </section>

        <section class="p-4 rounded-lg bg-white shadow border space-y-2">
          <h3 class="font-semibold text-lg">יומן</h3>
          <div id="backup-log-box" class="h-40 overflow-y-auto text-xs bg-gray-50 border rounded p-2 flex flex-col-reverse"></div>
        </section>
      </div>`;

    // Event bindings
    root.querySelector('#btn-full-download')?.addEventListener('click', ()=> {
      try { exportBackup(); log('גיבוי מלא הורד'); } catch(e){ log('שגיאה בהורדת גיבוי מלא'); }
    });
    root.querySelector('#btn-full-import')?.addEventListener('click', ()=> {
      root.querySelector('#import-backup-file').click();
    });
    root.querySelector('#import-backup-file')?.addEventListener('change', (e)=> {
      try { importBackup(e); log('בוצע ניסיון ייבוא'); } catch(err){ log('שגיאה בייבוא: '+err.message); }
    });
    root.querySelector('#btn-compact-download')?.addEventListener('click', ()=> {
      if (!window.CompactBackup) { log('CompactBackup לא נטען'); return; }
      window.CompactBackup.downloadLocal();
      log('גיבוי קומפקטי הורד');
    });
    root.querySelector('#btn-compact-drive')?.addEventListener('click', (e)=> {
      if (!window.CompactBackup) { log('CompactBackup לא זמין'); return; }
      runWithStatus(e.target, async ()=> { await window.CompactBackup.createAndUploadCompactBackup(); });
    });

    root.querySelector('#btn-report-download')?.addEventListener('click', (e)=> {
      runWithStatus(e.target, async ()=> { await window.GibushAppExporter.exportReport('download'); });
    });
    root.querySelector('#btn-report-drive')?.addEventListener('click', (e)=> {
      runWithStatus(e.target, async ()=> { await window.GibushAppExporter.exportReport('drive'); });
    });
    root.querySelector('#btn-report-both')?.addEventListener('click', (e)=> {
      runWithStatus(e.target, async ()=> { await window.GibushAppExporter.exportReport('both'); });
    });

    const chk = root.querySelector('#chk-auto-compact');
    if (chk){
      chk.checked = !!window.__autoCompactBackupInterval;
      chk.addEventListener('change', ()=> {
        if (chk.checked) startAutoCompact(); else stopAutoCompact();
      });
    }

    log('דשבורד נטען');
  };
})();