(function () {
  window.Pages = window.Pages || {};

  function safeScore(fnName, runner) {
    try { if (typeof window[fnName] === 'function') return window[fnName](runner); } catch(e){ console.warn(e); }
    return 0;
  }

  function buildReportFileName() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2,'0');
    const yy = String(now.getFullYear()).slice(-2);
    const groupNumber = state?.groupNumber || state?.currentGroup || '1';
    return `קבוצה-${groupNumber}_${mm}.${yy}.xlsx`;
  }

  function ensureCommentsModalLoaded() {
    return new Promise((resolve, reject) => {
      if (window.CommentsModal?.open) return resolve();
      if (document.querySelector('script[data-comments-modal]')) {
        const check = () => window.CommentsModal ? resolve() : setTimeout(check, 40);
        return check();
      }
      const s = document.createElement('script');
      s.src = 'js/components/commentsModal.js';
      s.async = true;
      s.dataset.commentsModal = 'true';
      s.onload = () => window.CommentsModal ? resolve() : reject(new Error('commentsModal.js loaded but window.CommentsModal missing'));
      s.onerror = () => reject(new Error('Failed loading commentsModal.js'));
      document.head.appendChild(s);
    });
  }

  function buildCommentButton(shoulderNumber){
    state.generalComments = state.generalComments || {};
    const raw = state.generalComments[shoulderNumber];
    let arr = Array.isArray(raw) ? raw.filter(c=>c && c.trim()) : (raw ? [String(raw).trim()] : []);
    const count = arr.length;
    const level = Math.min(count, 5);
    let text = 'כתוב הערה...';
    if (count > 0){
      const joined = arr.join(' | ');
      text = joined.length > 20 ? joined.slice(0,17)+'...' : joined;
    }
    return `
      <button type="button"
        class="comment-btn sprint-comment-btn comment-level-${level}"
        data-comment-btn="${shoulderNumber}"
        title="הערות (#${shoulderNumber}) – ${count} הערות">
        <span class="comment-text">${text}</span>
        <span class="comment-icon">✎</span>
      </button>`;
  }

  async function localOpenHandler(sn, btn){
    try{
      await ensureCommentsModalLoaded();
      window.CommentsModal.open(sn, { originBtn: btn });
    }catch(err){
      console.error(err);
      alert('שגיאה בפתיחת הערות');
    }
  }

  function triggerDownload(blob, filename) {
    window.GibushAppExporter.downloadFile(blob, filename);
  }

  // הוספת פונקציה לhודעות מערכת
  function showNotification(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else if (typeof window.showMessage === 'function') {
      window.showMessage(message);
    } else {
      const isError = type === 'error';
      if (isError) {
        console.error(message);
      }
    }
  }

  if (!window.__reportExportHelpersAdded) {
    window.__reportExportHelpersAdded = true;

    window.__ReportExport = {
      triggerDownload,
    };
  }

  window.Pages.renderReportPage = function renderReportPage() {
    // NEW: וידוא שכל הציונים מעודכנים לפני הצגת הדוח
    if (typeof window.updateAllSprintScores === 'function') {
      window.updateAllSprintScores();
    }

    const contentDiv = document.getElementById('content');
    if (!contentDiv) return console.error("renderReportPage: לא נמצא האלמנט #content");

    state.manualScores = state.manualScores || {};
    state.generalComments = state.generalComments || {};
    const runnersArr = Array.isArray(state.runners) ? state.runners : [];

    const allRunners = runnersArr.map(r => {
      const status = state.crawlingDrills?.runnerStatuses?.[r.shoulderNumber] || 'פעיל';
      let sprintScore = 0, crawlingScore = 0, stretcherScore = 0, totalScore = -1, averageScore = 0;
      if (status === 'פעיל') {
        const manual = state.manualScores[r.shoulderNumber];
        sprintScore = manual?.sprint ?? safeScore('calculateSprintFinalScore', r);
        // UPDATED: שימוש בפונקציה החדשה לחישוב ציון זחילה סופי
        crawlingScore = manual?.crawl ?? safeScore('calculateCrawlingFinalScore', r);
        stretcherScore = manual?.stretcher ?? safeScore('calculateStretcherFinalScore', r);
        totalScore = sprintScore + crawlingScore + stretcherScore;
        // NEW: חישוב ממוצע (מעוגל לספרה אחת אחרי הנקודה)
        averageScore = Math.round((totalScore / 3) * 10) / 10;
      }
      return { ...r, sprintScore, crawlingScore, stretcherScore, status, totalScore, averageScore };
    });

    const active = allRunners.filter(r => r.status === 'פעיל').sort((a, b) => b.totalScore - a.totalScore);
    const inactive = allRunners.filter(r => r.status !== 'פעיל');

    const getCardClass = i => i===0?'gold':i===1?'silver':i===2?'bronze':'';
    const getRankDisplay = rank => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

    // Helper: בדיקת משתמש אורח
    const isGuestUser = (() => {
      try {
        const saved = localStorage.getItem('gibushAuthState');
        if(!saved) return true;
        const session = JSON.parse(saved);
        return session?.authState?.authMethod === 'guest';
      } catch(e){ return true; }
    })();

    contentDiv.innerHTML = `
      <div class="report-header-bar">
        <h2>דוח סיכום</h2>
      </div>
      <div class="report-cards-grid">
        ${active.map((r,i) => `
            <div class="runner-card-r ${getCardClass(i)}" data-card="${r.shoulderNumber}">
              <div class="rank-badge" title="דירוג">${getRankDisplay(i+1)}</div>
              <div class="shoulder-badge">
                <div class="runner-number-big" title="מספר כתף">#${r.shoulderNumber}</div>
              </div>
              <div class="scores-inline">
                <div class="score-item">
                  <div class="score-label">ספרינט</div>
                  <input class="score-input" type="tel" value="${r.sprintScore}" data-shoulder="${r.shoulderNumber}" data-type="sprint">
                </div>
                <div class="score-item">
                  <div class="score-label">זחילה</div>
                  <input class="score-input" type="tel" value="${r.crawlingScore}" data-shoulder="${r.shoulderNumber}" data-type="crawl">
                </div>
                <div class="score-item">
                  <div class="score-label">${(CONFIG?.STRETCHER_PAGE_LABEL || 'אלונקה').replace('אלונקה','אלונקות')}</div>
                  <input class="score-input" type="tel" value="${r.stretcherScore}" data-shoulder="${r.shoulderNumber}" data-type="stretcher">
                </div>
                <div class="score-item score-item-average">
                  <div class="score-label">ממוצע</div>
                  <div class="score-display score-display-average" title="ממוצע כל הציונים">${r.averageScore.toFixed(1)}</div>
                </div>
              </div>
              <div class="comment-trigger">${buildCommentButton(r.shoulderNumber)}</div>
            </div>
          `).join('')}
      </div>
      ${inactive.length ? `
        <div class="inactive-panel">
          <h3 style="margin:28px 0 14px;font-size:18px;font-weight:700;text-align:center;color:#334155">מספרי כתף שאינם פעילים</h3>
          <div class="inactive-grid">
            ${inactive.map(r => `<div class="inactive-chip"><strong>#${r.shoulderNumber}</strong> <span class="status">${r.status === 'temp_removed' ? 'גריעה זמנית' : 'פרש'}</span></div>`).join('')}
          </div>
        </div>` : ''}

      <div class="export-hint">עדכון ציון: יציאה מהשדה שומר. עריכת הערה: לחיצה על כפתור ההערה.</div>

      <div class="report-bottom-actions">
        ${!isGuestUser ? '<button id="finish-gibush-btn" class="report-btn">🏁 סיים גיבוש</button>' : ''}
        <button id="upload-drive-btn" class="report-btn">📤 שלח קובץ למנהל</button>
        <button id="export-excel-btn" class="report-btn">💾 הורדת אקסל</button>
      </div>
    `;

    window.Pages.initReportPageListeners();
  };

  // Helper: בדיקת משתמש אורח
  function isGuestUser(){
    try {
      const saved = localStorage.getItem('gibushAuthState');
      if(!saved) return true;
      const session = JSON.parse(saved);
      return session?.authState?.authMethod === 'guest';
    } catch(e){ return true; }
  }

  async function handleDriveUploadClick(btn) {
    // דרישת סיסמה אם אורח
    if (isGuestUser() && !sessionStorage.getItem('reportDriveApproved')) {
      const pwd = prompt('הזן סיסמת מנהל לשליחת הקובץ:');
      if (pwd === null) return; // ביטול
      const adminPwd = (window.ADMIN_PASSWORD || typeof ADMIN_PASSWORD !== 'undefined' && ADMIN_PASSWORD) || '';
      if (pwd !== adminPwd) {
        alert('סיסמה שגויה');
        return;
      }
      sessionStorage.setItem('reportDriveApproved','1');
    }
    
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'מכין קבצים...';
    
    try {
      // NEW: עצירת שליחה אוטומטית מכיוון שעכשיו שולחים ידנית
      if (window.autoBackupManager) {
        window.autoBackupManager.markManuallyStopped();
      }
      
      // שליחת דוח אקסל
      if (typeof window.GibushAppExporter?.exportReport === 'function') {
        btn.textContent = 'שולח דוח...';
        await window.GibushAppExporter.exportReport('drive');
        
        // NEW: שליחת קובץ גיבוי נוסף
        btn.textContent = 'שולח גיבוי...';
        await sendBackupFile();
        
        btn.textContent = 'נשלח בהצלחה ✔';
        showNotification('✅ דוח וגיבוי נשלחו בהצלחה!', 'success');
      } else {
        throw new Error('מערכת הייצוא לא זמינה');
      }
    } catch (e) {
      console.error(e);
      btn.textContent = 'שגיאה - שמירה מקומית';
      showNotification('❌ שגיאה בשליחה: ' + e.message, 'error');
      try {
        if (typeof window.GibushAppExporter?.exportReport === 'function') {
          await window.GibushAppExporter.exportReport('download');
        }
      } catch (downloadError) {
        alert('שגיאה בשמירת הקובץ: ' + downloadError.message);
      }
    } finally {
      setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1800);
    }
  }

  // NEW: פונקציה לשליחת קובץ גיבוי
  async function sendBackupFile() {
    try {
      if (typeof window.CompactBackup?.createBackup === 'function') {
        const backupData = window.CompactBackup.createBackup();
        const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        
        const date = new Date().toLocaleDateString('he-IL').replace(/\./g, '-');
        const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '-');
        const fileName = `GibushBackup_Manual_${state.groupNumber || 'group'}_${date}_${time}.json`;
        
        if (window.GoogleDriveUploader?.upload) {
          const result = await window.GoogleDriveUploader.upload(backupBlob, fileName, {
            folder: 'GibushManualBackups',
            type: 'backup'
          });
          if (result.status !== 'success') {
            console.warn('⚠️ שליחת גיבוי נכשלה:', result.message);
            throw new Error('שליחת גיבוי נכשלה: ' + result.message);
          }
        } else {
          throw new Error('מערכת העלאה לא זמינה');
        }
      } else {
        throw new Error('מערכת גיבוי קומפקטי לא זמינה');
      }
    } catch (error) {
      console.error('❌ שגיאה בשליחת גיבוי:', error);
      throw error;
    }
  }

  function handleExcelDownloadClick(e) {
    e.preventDefault();
    
    // שימוש במערכת הייצוא המאוחדת החדשה
    if (typeof window.GibushAppExporter?.exportReport === 'function') {
      window.GibushAppExporter.exportReport('download')
        .then(result => {
          showNotification('✅ קובץ הדוח הורד בהצלחה!', 'success');
        })
        .catch(error => {
          console.error('שגיאה בהורדת דוח:', error);
          showNotification('❌ שגיאה בהורדת הדוח: ' + error.message, 'error');
        });
    } else {
      console.error('מערכת הייצוא לא זמינה');
      showNotification('❌ מערכת הייצוא לא זמינה', 'error');
    }
  }

  window.Pages.initReportPageListeners = function initReportPageListeners() {
    const contentDiv = document.getElementById('content');
    if (!contentDiv || contentDiv.dataset.reportListenersAttached) return;
    contentDiv.dataset.reportListenersAttached = 'true';

    contentDiv.addEventListener('click', async (e) => {
      const uploadBtn = e.target.closest('#upload-drive-btn');
      if (uploadBtn) return await handleDriveUploadClick(uploadBtn);
      const exportBtn = e.target.closest('#export-excel-btn');
      if (exportBtn) return handleExcelDownloadClick(e);
      const finishBtn = e.target.closest('#finish-gibush-btn');
      if (finishBtn) return startFinishGibushFlow(finishBtn);
      const commentBtn = e.target.closest('[data-comment-btn]');
      if (commentBtn) return localOpenHandler(commentBtn.dataset.commentBtn, commentBtn);
    });

    contentDiv.addEventListener('blur', (e) => {
      const input = e.target.closest('.score-input');
      if (!input) return;
      
      let v = parseInt(input.value, 10);
      if (isNaN(v)) v = parseInt(input.dataset.prev, 10) || 1;
      v = Math.min(7, Math.max(1, v));
      
      if (v !== parseInt(input.dataset.prev, 10)) {
        const shoulder = input.dataset.shoulder;
        const type = input.dataset.type;
        state.manualScores[shoulder] = state.manualScores[shoulder] || {};
        state.manualScores[shoulder][type] = v;
        saveState();
        window.Pages.renderReportPage(); // רינדור מחדש לסידור הדירוג
      } else {
        input.value = v; // החזרת ערך תקין אם הוזן משהו לא חוקי
      }
    }, true); // שימוש ב-capture
  };

  window.handleDriveUploadClick = handleDriveUploadClick;
  window.handleExcelDownloadClick = handleExcelDownloadClick;

  function startFinishGibushFlow(btn){
    if (window.__finishingGibush) return;
    const msg = 'סיום הגיבוש ישלח את קובץ האקסל והגיבוי למנהל, יעצור העלאה אוטומטית ויאפס את האפליקציה כדי להתחיל גיבוש חדש. להמשיך?';
    if (typeof showModal === 'function') {
      showModal('סיום גיבוש', msg, () => runFinishGibushSequence(btn));
    } else {
      if (confirm(msg)) runFinishGibushSequence(btn);
    }
  }

  function createFinishProgressModal(){
    const existing = document.getElementById('finish-gibush-progress-modal');
    if (existing) return existing;
    const wrap = document.createElement('div');
    wrap.id = 'finish-gibush-progress-modal';
    wrap.style.position='fixed';
    wrap.style.inset='0';
    wrap.style.zIndex='9999';
    wrap.style.display='flex';
    wrap.style.alignItems='center';
    wrap.style.justifyContent='center';
    wrap.style.background='rgba(0,0,0,.55)';
    wrap.innerHTML = `<div style="min-width:320px;max-width:420px;background:#ffffff;box-shadow:0 12px 40px -8px rgba(0,0,0,.4);border-radius:20px;padding:24px 26px;display:flex;flex-direction:column;gap:18px;font-family:system-ui,Segoe UI,sans-serif;">
      <h3 style="margin:0;font-size:20px;font-weight:800;color:#0d9488;display:flex;align-items:center;gap:8px;">🏁 סיום גיבוש</h3>
      <div id="finish-progress-status" style="font-size:14px;font-weight:600;color:#334155;min-height:34px;line-height:1.3;white-space:pre-line"></div>
      <div id="finish-progress-bar-wrap" style="height:10px;background:#e2e8f0;border-radius:6px;overflow:hidden;position:relative;">
        <div id="finish-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#0d9488,#059669);transition:width .4s ease"></div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;">
        <button id="finish-progress-cancel" style="display:none;background:#ef4444;color:#fff;font-weight:700;font-size:12px;border:none;border-radius:10px;padding:8px 16px;cursor:pointer;">בטל</button>
        <button id="finish-progress-close" style="display:none;background:#0d9488;color:#fff;font-weight:700;font-size:12px;border:none;border-radius:10px;padding:8px 18px;cursor:pointer;">סגור</button>
      </div>
    </div>`;
    document.body.appendChild(wrap);
    return wrap;
  }
  function updateFinishProgress(msg, pct){
    const stEl = document.getElementById('finish-progress-status');
    const bar = document.getElementById('finish-progress-bar');
    if (stEl) stEl.textContent = msg;
    if (bar && typeof pct==='number') bar.style.width = pct+"%";
  }

  async function runFinishGibushSequence(btn){
    if (window.__finishingGibush) return; window.__finishingGibush = true;
    const original = btn.textContent; btn.disabled = true;
    const modal = createFinishProgressModal();
    updateFinishProgress('שולח אקסל...', 10);
    try {
      if (typeof window.GibushAppExporter?.exportReport !== 'function') throw new Error('מערכת ייצוא לא זמינה');
      await window.GibushAppExporter.exportReport('drive');
      updateFinishProgress('שולח גיבוי...', 40);
      await sendBackupFile();
      updateFinishProgress('עוצר העלאה אוטומטית...', 55);
      if (window.autoBackupManager) { try { window.autoBackupManager.stop('סיום גיבוש'); } catch(e){} }
      // אין איפוס כאן – נדחה לאחר לחיצה על סגירה
      updateFinishProgress('מכין לסיום... (האיפוס יבוצע אחרי סגירה)', 75);
      const preservedEvaluator = state.evaluatorName || '';
      window.__pendingFinishResetEvaluator = preservedEvaluator; // שמירת שם המעריך לדחייה
      updateFinishProgress('הגיבוש הסתיים בהצלחה! לחץ על סגור להתחלת גיבוש חדש.', 100);
      btn.disabled=false; btn.textContent=original; window.__finishingGibush=false;
      const closeBtn = document.getElementById('finish-progress-close');
      if (closeBtn){
        closeBtn.style.display='inline-block';
        closeBtn.onclick = ()=> {
          const preserved = window.__pendingFinishResetEvaluator || '';
          modal.remove();
          // שלב 1: מעבר לדף הרצים עם הנתונים הישנים
          state.currentPage = PAGES.RUNNERS;
          renderPage?.();
          // שלב 2: איפוס מלא לאחר מעבר (עם השהייה קטנה לציור)
          setTimeout(()=>{
            try {
              initializeAllData?.();
              state.evaluatorName = preserved; // שחזור שם המעריך
              state.groupNumber = '';
              localStorage.setItem('groupNumberCleared','1');
              // עדכון authState (הסרת מספר קבוצה ושמירת שם מעריך)
              try {
                const raw = localStorage.getItem('gibushAuthState');
                if (raw){
                  const session = JSON.parse(raw);
                  if (session.authState){
                    session.authState.evaluatorName = preserved;
                    delete session.authState.groupNumber;
                    localStorage.setItem('gibushAuthState', JSON.stringify(session));
                  }
                }
              } catch(e){ console.warn('authState update after finish failed', e); }
              saveState?.();
              renderPage?.();
              // פתיחת חלון פרטי הערכה להזנת מספר קבוצה חדש
              if (typeof showEditBasicDetailsModal==='function') showEditBasicDetailsModal();
            } finally {
              delete window.__pendingFinishResetEvaluator;
            }
          }, 250);
        };
      }
    } catch(err){
      const reason = err?.message || 'שגיאה לא ידועה';
      console.error(err);
      updateFinishProgress('סיום גיבוש נכשל: '+reason+'\nלא בוצע איפוס.', 100);
      const closeBtn = document.getElementById('finish-progress-close');
      if (closeBtn){ closeBtn.style.display='inline-block'; closeBtn.onclick = ()=> modal.remove(); }
      btn.disabled=false; btn.textContent=original; window.__finishingGibush=false;
      showNotification('❌ סיום גיבוש נכשל: '+reason,'error');
      if (typeof showModal === 'function') {
        showModal('סיום גיבוש נכשל', 'התהליך הופסק. סיבה: '+reason+'\nלא נמחקו נתונים.', ()=>{});
      }
    }
  }

  window.startFinishGibushFlow = startFinishGibushFlow;

})();