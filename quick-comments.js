(function () {
  'use strict';
  const NS = (window.QuickComments = window.QuickComments || {});

  NS.renderBar = function renderQuickCommentBar(show) {
    const quickBarDiv = document.getElementById('quick-comment-bar-container');
    if (!quickBarDiv) return;
    if (!show) { 
      quickBarDiv.innerHTML = ''; 
      return; 
    }

    // NEW: הזרקת סטייל חד-פעמית לפיצוי אזור בטוח ב-PWA באייפד/אייפון
    (function ensureSafeOffsetStyle(){
      if (document.getElementById('qc-safe-offset-style')) return;
      const style = document.createElement('style');
      style.id = 'qc-safe-offset-style';
      style.textContent = `
        /* פיצוי למצב PWA (standalone) במכשירי iOS - מרחיק את בר ההערות מהסטטוס בר / דינמיק איילנד */
        .qc-safe-offset { 
          margin-top: calc(env(safe-area-inset-top, 0px) + 52px);
        }
        @supports not (margin-top: env(safe-area-inset-top)) {
          .qc-safe-offset { margin-top: 52px; }
        }
        
        /* FIXED: מיקום ההערות המוכנות מתחת לשורת המשימות במצב PWA */
        @media (display-mode: standalone) {
          .qc-group-modal {
            top: calc(env(safe-area-inset-top, 0px) + 80px) !important;
            left: 8px !important;
            right: 8px !important;
            bottom: 8px !important;
            max-height: calc(100vh - env(safe-area-inset-top, 0px) - 90px) !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
          }
          
          /* כפתור הסגירה יישאר בראש המודאל ויהיה נגיש */
          .qc-group-close {
            position: sticky !important;
            top: 0 !important;
            z-index: 10 !important;
            margin-bottom: 16px !important;
            background: #ef4444 !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
          }
        }
        
        /* שיפור כללי לגלילה במכשירי iOS */
        .qc-group-modal {
          -webkit-overflow-scrolling: touch;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }
        
        /* למסכים קטנים - הקטנת המודאל */
        @media (max-height: 700px) and (display-mode: standalone) {
          .qc-group-modal {
            top: calc(env(safe-area-inset-top, 0px) + 70px) !important;
            max-height: calc(100vh - env(safe-area-inset-top, 0px) - 80px) !important;
          }
        }
        
        /* למסכים מאוד קטנים */
        @media (max-height: 600px) and (display-mode: standalone) {
          .qc-group-modal {
            top: calc(env(safe-area-inset-top, 0px) + 60px) !important;
            max-height: calc(100vh - env(safe-area-inset-top, 0px) - 70px) !important;
          }
        }
      `;
      document.head.appendChild(style);
    })();

    // NEW: זיהוי מצב PWA עצמאי ב-iOS והוספת המחלקה
    (function applySafeOffsetIfNeeded(){
      const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
      const ua = navigator.userAgent || navigator.vendor || '';
      const isIOS = /iPad|iPhone|iPod/i.test(ua);
      if (isStandalone && isIOS) {
        quickBarDiv.classList.add('qc-safe-offset');
      } else {
        quickBarDiv.classList.remove('qc-safe-offset');
      }
    })();

    const GROUP = (window.CONFIG && window.CONFIG.CRAWLING_GROUP_COMMON_COMMENTS) || {};
    const buildGroupOptions = () => {
      const mk = (label, arr) => Array.isArray(arr) && arr.length
        ? `<optgroup label="${label}">${arr.map(t => `<option value="${t}">${t}</option>`).join('')}</optgroup>` : '';
      return [
        '<option value="" disabled selected>הערה מהירה</option>',
        mk('חיובי', GROUP.good),
        mk('ניטרלי', GROUP.neutral),
        mk('טעון שיפור', GROUP.bad)
      ].join('');
    };

    function normalizeBool(v){
      if (typeof v === 'boolean') return v;
      if (v == null) return undefined;
      if (typeof v === 'number') return v !== 0;
      if (typeof v === 'string'){
        const s = v.trim().toLowerCase();
        if (['false','0','no','לא','inactive','inact','off','לא פעיל','לאפעיל'].includes(s)) return false;
        if (['true','1','yes','כן','active','on','פעיל'].includes(s)) return true;
      }
      return undefined;
    }

    const negativeRegex = /(retir|withdraw|withdrew|withdrawn|dropped|drop\s*out|quit|inactive|not.?active|non.?active|eliminat|eliminated|removed|disabled|hidden|injur|hurt|broken|פרש|פרישה|פרשה|נשר|נשרה|עזב|עזבה|עזיבה|הוסר|הוסרה|לא.?פעיל|פציעה|פצוע|הודח|הודחה|נפסל|נפסלה|לא\s*ממשיך|לא\s*משתתף)/i;

    const flagKeys = [
      'active','isActive','inactive','notActive','nonActive','retired','isRetired',
      'withdrawn','withdrew','dropped','droppedOut','quit','eliminated',
      'removed','isRemoved','disabled','hidden','blocked'
    ];

    const textKeys = [
      'status','state','phase','reason','note','notes','comment','comments',
      'description','label','tags','remarks'
    ];

    function isReallyActive(r){
      if(!r) return false;
      const sn = r.shoulderNumber;
      if (sn == null || sn === '') return false;

      // NEW: כיבוד מפה חיצונית של סטטוסי ריצה (מסומנים כלא פעילים)
      if (state?.crawlingDrills?.runnerStatuses && state.crawlingDrills.runnerStatuses[sn]) {
        return false;
      }

      const activeNorm = normalizeBool(r.active);
      if (activeNorm === false) return false;
      const isActiveNorm = normalizeBool(r.isActive);
      if (isActiveNorm === false) return false;

      for (const k of flagKeys){
        if (k in r){
          const v = r[k];
          if (k !== 'active' && k !== 'isActive'){
            const vb = normalizeBool(v);
            if (vb === true && ['inactive','notActive','nonActive','retired','isRetired',
              'withdrawn','withdrew','dropped','droppedOut','quit','eliminated',
              'removed','isRemoved','disabled','hidden','blocked']
              .includes(k)) return false;
          }
        }
      }

      const blob = textKeys
        .map(k => r[k])
        .filter(Boolean)
        .map(v => String(v))
        .join(' | ');

      if (blob && negativeRegex.test(blob)) return false;

      return true;
    }

    function buildActiveList(src){
      const seen = new Set();
      const list = [];
      for (const r of src){
        if (!isReallyActive(r)) continue;
        const key = String(r.shoulderNumber).trim();
        if (seen.has(key)) continue;
        seen.add(key);
        list.push(r);
      }
      return list;
    }

    function refreshRunnerOptions() {
      const rawRunners = Array.isArray(state?.runners) ? state.runners : [];
      const active = buildActiveList(rawRunners);
      state.activeRunners = active;

      const selectable = active
        .map(r => ({ sn: String(r.shoulderNumber).trim(), r }))
        .filter((o,i,arr)=> arr.findIndex(x => x.sn === o.sn) === i)
        .sort((a,b)=> {
          const na = Number(a.sn), nb = Number(b.sn);
          if(!isNaN(na) && !isNaN(nb)) return na - nb;
          return a.sn.localeCompare(b.sn,'he');
        })
        .map(o => o.r);

      const runnerOptions = selectable.length
        ? ['<option value="" disabled selected>מספר כתף</option>',
           ...selectable.map(r=>`<option value="${r.shoulderNumber}">${r.shoulderNumber}</option>`)].join('')
        : '<option value="" disabled selected>אין פעילים</option>';

      const runnerSelect = document.getElementById('quick-runner-select');
      if (runnerSelect) {
        const currentValue = runnerSelect.value;   
        runnerSelect.innerHTML = runnerOptions;
        // שחזור הערך הנבחר אם עדיין קיים ברשימה
        if (currentValue && selectable.some(r => r.shoulderNumber == currentValue)) {
          runnerSelect.value = currentValue;
        }
      }
    }

    const rawRunners = Array.isArray(state?.runners) ? state.runners : [];
    const active = buildActiveList(rawRunners);
    state.activeRunners = active;

    const selectable = active
      .map(r => ({ sn: String(r.shoulderNumber).trim(), r }))
      .filter((o,i,arr)=> arr.findIndex(x => x.sn === o.sn) === i)
      .sort((a,b)=> {
        const na = Number(a.sn), nb = Number(b.sn);
        if(!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.sn.localeCompare(b.sn,'he');
      })
      .map(o => o.r);

    const runnerOptions = selectable.length
      ? ['<option value="" disabled selected>מספר כתף</option>',
         ...selectable.map(r=>`<option value="${r.shoulderNumber}">${r.shoulderNumber}</option>`)].join('')
      : '<option value="" disabled selected>אין פעילים</option>';

    window.QuickComments.debugActiveRunners = function(){
      console.table(selectable.map(r => {
        return {
          shoulder: r.shoulderNumber,
          active: r.active,
          isActive: r.isActive,
          status: r.status || r.state || '',
          reason: r.reason || '',
          note: r.note || r.notes || '',
        };
      }));
      return selectable;
    };

    quickBarDiv.innerHTML = `
      <div class="quickbar" role="region" aria-label="הערה מהירה">
        <div class="qc-row">
          <select id="quick-runner-select" class="qc-runner-select" aria-label="מספר כתף">
            ${runnerOptions}
          </select>
          <button id="group-comments-trigger" type="button" class="qc-group-trigger" aria-haspopup="dialog" aria-expanded="false">
            הערות מוכנות מראש 📝
          </button>
        </div>
        <div class="qc-row qc-row-input">
          <div class="qc-input-row">
            <input id="quick-comment-input" type="text" class="qc-input" placeholder="כתוב הערה...">
            <button id="quick-comment-mic" class="qc-micBtn" aria-label="הכתבה קולית" title="הכתבה קולית">🎤</button>
            <button id="quick-comment-send" class="qc-sendBtn" disabled>
              <span class="send-text">שלח</span>
            </button>
          </div>
        </div>
      </div>`;

    // Create modal elements outside of quickbar - directly in body
    let backdrop = document.getElementById('qc-group-backdrop');
    let modal = document.getElementById('qc-group-modal');
    
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'qc-group-backdrop';
      backdrop.className = 'qc-group-modal-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.style.display = 'none';
      document.body.appendChild(backdrop);
    }
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'qc-group-modal';
      modal.className = 'qc-group-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'בחירת הערה מקוטלגת');
      modal.style.display = 'none';
      document.body.appendChild(modal);
    }

    const inputEl  = document.getElementById('quick-comment-input');
    const micBtn   = document.getElementById('quick-comment-mic');
    const sendBtn  = document.getElementById('quick-comment-send');
    const runnerSel= document.getElementById('quick-runner-select');
    const trigger  = document.getElementById('group-comments-trigger');

    // UPDATED: ננעל עד שיש גם טקסט וגם מספר כתף נבחר
    const updateSendEnabled = () => {
      const hasText = inputEl.value.trim().length > 0;
      const hasRunner = runnerSel && runnerSel.value !== '';
      sendBtn.disabled = !(hasText && hasRunner);
    };
    inputEl.addEventListener('input', updateSendEnabled);
    runnerSel && runnerSel.addEventListener('change', updateSendEnabled);

    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) send(); }
    });

    function buildGroupModalContent(){
      const mk = (cls,title,arr)=> (Array.isArray(arr)&&arr.length)?`
        <div class="qc-group-box ${cls}">
          <div class="qc-group-title">${title}</div>
          <div class="qc-group-items">
            ${arr.map(t=>`<span class="qc-group-item" data-value="${t}" role="button" tabindex="0">${t}</span>`).join('')}
          </div>
        </div>`:'';
      
      // NEW: בדיקה שיש תוכן להציג
      const hasContent = (Array.isArray(GROUP.good) && GROUP.good.length > 0) ||
                        (Array.isArray(GROUP.neutral) && GROUP.neutral.length > 0) ||
                        (Array.isArray(GROUP.bad) && GROUP.bad.length > 0);
      
      if (!hasContent) {
        modal.innerHTML = `
          <button class="qc-group-close" type="button" id="qc-group-close">סגור ✕</button>
          <h2>הערות מוכנות מראש</h2>
          <div style="padding: 20px; text-align: center; color: #666;">
            <p>אין הערות מוכנות מראש זמינות כרגע</p>
            <p>ניתן להוסיף הערות בקובץ הקונפיגורציה</p>
          </div>`;
        return;
      }
      
      modal.innerHTML = `
        <button class="qc-group-close" type="button" id="qc-group-close">סגור ✕</button>
        <h2>בחרו הערה</h2>
        ${mk('good','חיובי',GROUP.good)}
        ${mk('neutral','ניטרלי',GROUP.neutral)}
        ${mk('bad','טעון שיפור',GROUP.bad)}`;
    }

    function openGroupModal(){
      // NEW: בדיקה מוקדמת שיש תוכן להציג
      const hasContent = (Array.isArray(GROUP.good) && GROUP.good.length > 0) ||
                        (Array.isArray(GROUP.neutral) && GROUP.neutral.length > 0) ||
                        (Array.isArray(GROUP.bad) && GROUP.bad.length > 0);
      
      if (!hasContent) {
        // הצגת הודעה קצרה במקום פתיחת מודאל ריק
        if (window.showModal) {
          window.showModal('אין הערות זמינות', 'לא הוגדרו הערות מוכנות מראש. ניתן להוסיף הערות ידנית בשדה הטקסט למטה.');
        } else {
          alert('אין הערות מוכנות מראש זמינות כרגע');
        }
        return;
      }
      
      buildGroupModalContent();
      backdrop.style.display='block';
      modal.style.display='block';
      trigger.setAttribute('aria-expanded','true');
      backdrop.setAttribute('aria-hidden','false');
      // פוקוס על הפריט הראשון אחרי קצת השהיה
      setTimeout(() => {
        modal.querySelector('.qc-group-item')?.focus();
      }, 50);
      document.addEventListener('keydown', escHandler);
    }

    function closeGroupModal(){
      modal.style.display='none';
      backdrop.style.display='none';
      trigger.setAttribute('aria-expanded','false');
      backdrop.setAttribute('aria-hidden','true');
      document.removeEventListener('keydown', escHandler);
      trigger.focus();
    }
    function escHandler(e){ if(e.key==='Escape') closeGroupModal(); }

    trigger.addEventListener('click', ()=>{
      if(modal.style.display==='block') closeGroupModal(); else openGroupModal();
    });
    backdrop.addEventListener('click', closeGroupModal);
    modal.addEventListener('click', e=>{
      if(e.target.id==='qc-group-close') closeGroupModal();
      const item = e.target.closest('.qc-group-item');
      if(item){
        const v = item.getAttribute('data-value');
        inputEl.value = (inputEl.value ? inputEl.value.trimEnd() + ' ' : '') + v;
        inputEl.dispatchEvent(new Event('input',{bubbles:true}));
        closeGroupModal();
        inputEl.focus();
      }
    });
    modal.addEventListener('keydown', e=>{
      if((e.key==='Enter'||e.key===' ') && e.target.classList.contains('qc-group-item')){
        e.preventDefault();
        e.target.click();
      }
    });

    function send(){
      const text = inputEl.value.trim();
      if(!text) return;
      if (!runnerSel || !runnerSel.value) return; // NEW: מחייב בחירת רץ
      const runnerKey = runnerSel.value;
      if(addCommentItem(runnerKey, text)){
        if (navigator.vibrate) navigator.vibrate(10);
        inputEl.value='';
        inputEl.placeholder='נשמר!';
        inputEl.dispatchEvent(new Event('input',{bubbles:true}));
        setTimeout(()=>{ inputEl.placeholder='הערה מהירה'; },900);
      }
    }
    sendBtn.addEventListener('click', send);

    // מאזין ישיר לעדכון בועות האינדיקציה
    sendBtn.addEventListener('click', () => {
      setTimeout(() => {
        if (window.updateMiniCommentIndicator && runnerSel && runnerSel.value) {
          window.updateMiniCommentIndicator(runnerSel.value);
        }
        if (window.refreshAllMiniCommentIndicators) {
          window.refreshAllMiniCommentIndicators();
        }
      }, 50);
    });

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null, isRecording = false;
    
    // הסתרת המיקרופון רק במכשירי iOS (לא Mac!) כי Safari iOS לא תומך ב-Web Speech API
    const isIOS = /iP(hone|ad|od)/i.test(navigator.userAgent);
    
    if (isIOS && micBtn) {
      // במכשירי iOS - מסתירים לגמרי את כפתור המיקרופון
      micBtn.style.display = 'none';
    } else if (SR) {
      // יש תמיכה ב-Web Speech API - מפעילים הקלטה
      recognition = new SR();
      recognition.lang = 'he-IL';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript || '';
        inputEl.value = transcript;
        updateSendEnabled();
      };
      recognition.onerror = () => { isRecording = false; micBtn.classList.remove('recording'); micBtn.textContent = '🎤'; };
      recognition.onend = () => { isRecording = false; micBtn.classList.remove('recording'); micBtn.textContent = '🎤'; };
      const startRec = (e) => {
        e.preventDefault();
        if (!isRecording) {
          try { recognition.start(); isRecording = true; micBtn.classList.add('recording'); micBtn.textContent = '🛑'; } catch {}
        }
      };
      const stopRec = (e) => { e.preventDefault(); if (isRecording) recognition.stop(); };
      micBtn.addEventListener('mousedown', startRec);
      micBtn.addEventListener('mouseup', stopRec);
      micBtn.addEventListener('mouseleave', stopRec);
      micBtn.addEventListener('touchstart', startRec, { passive: false });
      micBtn.addEventListener('touchend', stopRec);
    } else if (micBtn) {
      // אין תמיכה ב-Web Speech API - מציגים הודעה
      micBtn.title = "הקלטה קולית דורשת דפדפן תומך ו-HTTPS.";
    }

    // מעקב אחר שינויים ברשימת הרצים
    if (window._quickCommentsObserver) {
      window._quickCommentsObserver.disconnect();
    }
    
    window._quickCommentsObserver = new MutationObserver(() => {
      // רענון הרשימה כאשר יש שינויים ברצים
      setTimeout(refreshRunnerOptions, 100);
    });

    // האזנה לשינויים בסטייט
    const originalSaveState = window.saveState;
    if (originalSaveState && !window._quickCommentsSaveStatePatched) {
      window.saveState = function(...args) {
        const result = originalSaveState.apply(this, args);
        setTimeout(refreshRunnerOptions, 50);
        return result;
      };
      window._quickCommentsSaveStatePatched = true;
    }
  };

  // Removed createFloatingBubble function entirely
  // Removed initScrollBehavior function entirely

  NS.renderFAB = function renderQuickCommentFAB(show){
    if (!show) {
      document.getElementById('qc-fab')?.remove();
      document.getElementById('qc-sheet')?.remove();
      document.getElementById('qc-sheet-backdrop')?.remove();
      return;
    }

    if (!document.getElementById('qc-fab')) {
      const fab = document.createElement('button');
      fab.id = 'qc-fab';
      fab.className = 'qc-fab';
      fab.title = 'הוסף תגובה מהירה';
      fab.setAttribute('aria-label', 'הוסף תגובה מהירה');
      fab.textContent = '💬';
      document.body.appendChild(fab);

      const backdrop = document.createElement('div');
      backdrop.id = 'qc-sheet-backdrop';
      backdrop.className = 'qc-sheet-backdrop';
      document.body.appendChild(backdrop);

      const sheet = document.createElement('div');
      sheet.id = 'qc-sheet';
      sheet.className = 'qc-sheet';
      document.body.appendChild(sheet);

      const open = () => {
        backdrop.style.display = 'block';
        sheet.style.display = 'block';
        setTimeout(() => document.getElementById('fab-input')?.focus(), 0);
      };
      const close = () => {
        sheet.style.display = 'none';
        backdrop.style.display = 'none';
      };

      fab.addEventListener('click', open);
      backdrop.addEventListener('click', close);

      buildFabSheetContent();

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('#fab-close');
        if (btn) close();
      });
    } else {
      buildFabSheetContent();
    }

    function buildFabSheetContent(){
      const sheet = document.getElementById('qc-sheet');
      if(!sheet) return;
      sheet.innerHTML = `
        <div class="row" style="justify-content:space-between">
          <strong>הוספת תגובה מהירה</strong>
          <button id="fab-close" class="close">סגור ✖</button>
        </div>
        <div class="row">
          <label style="white-space:nowrap;">הערה:</label>
          <input id="fab-input" type="text" placeholder="הוסף הערה...">
          <button id="fab-mic" class="mic" title="הכתבה קולית" aria-label="הכתבה קולית">🎤</button>
        </div>
        <div class="actions">
          <button id="fab-send" class="send" disabled>שמור</button>
        </div>`;

      const inputEl = document.getElementById('fab-input');
      const micBtn  = document.getElementById('fab-mic');
      const sendBtn = document.getElementById('fab-send');
      const backdrop= document.getElementById('qc-sheet-backdrop');
      const panel   = document.getElementById('qc-sheet');

      const toggleSend = ()=> sendBtn.disabled = inputEl.value.trim().length===0;
      inputEl.addEventListener('input', toggleSend);
      inputEl.addEventListener('keydown', e=>{
        if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); if(!sendBtn.disabled) doSend(); }
      });
      sendBtn.onclick = doSend;

      function doSend(){
        const txt = inputEl.value.trim();
        if(!txt) return;
        if(addCommentItem('GLOBAL', txt)){
          inputEl.value='';
          toggleSend();
          backdrop.style.display='none';
          panel.style.display='none';
          if(navigator.vibrate) navigator.vibrate(10);
        }
      }

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      let recognition=null,isRecording=false;
      if (SR){
        recognition = new SR();
        recognition.lang='he-IL';
        recognition.continuous=false;
        recognition.interimResults=false;
        recognition.maxAlternatives=1;
        recognition.onresult = e=>{
          const t = e.results[0][0].transcript || '';
          inputEl.value = t;
          toggleSend();
        };
        recognition.onerror = ()=>{ isRecording=false; micBtn.classList.remove('recording'); micBtn.textContent='🎤'; };
        recognition.onend    = ()=>{ isRecording=false; micBtn.classList.remove('recording'); micBtn.textContent='🎤'; };
        const startRec = e=>{
          e.preventDefault();
          if(!isRecording){
            try{ recognition.start(); isRecording=true; micBtn.classList.add('recording'); micBtn.textContent='🛑'; }catch{}
          }
        };
        const stopRec = e=>{ e.preventDefault(); if(isRecording) recognition.stop(); };
        micBtn.addEventListener('mousedown', startRec);
        micBtn.addEventListener('mouseup', stopRec);
        micBtn.addEventListener('mouseleave', stopRec);
        micBtn.addEventListener('touchstart', startRec, { passive:false });
        micBtn.addEventListener('touchend', stopRec);
      } else {
        micBtn.title = 'הקלטה קולית דורשת דפדפן תומך';
      }
    }
  };

  function ensureCommentArray(key) {
    window.state = window.state || {};
    const gc = state.generalComments || (state.generalComments = {});
    const cur = gc[key];
    if (Array.isArray(cur)) return cur;
    if (typeof cur === 'string' && cur.trim()) {
      if (cur.includes(' | ')) {
        gc[key] = cur.split('|').map(s => s.trim()).filter(Boolean);
      } else {
        gc[key] = [cur.trim()];
      }
    } else if (!cur) {
      gc[key] = [];
    } else {
      gc[key] = [String(cur).trim()];
    }
    return gc[key];
  }

  function addCommentItem(key, text, opts = {}) {
    const t = (text || '').trim();
    if (!t) return false;
    const arr = ensureCommentArray(key);
    arr.unshift(t);
    if (opts.save !== false && typeof window.saveState === 'function') saveState();
    updateCommentButtonsFor(key);
    return true;
  }

  function getCommentCount(key){
    const raw = state.generalComments?.[key];
    if (!raw) return 0;
    if (Array.isArray(raw)) return raw.filter(c=>c && c.trim()).length;
    return String(raw).trim() ? 1 : 0;
  }

  function updateCommentButtonsFor(key) {
    const raw = state.generalComments?.[key];
    const arr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    const summary = truncateAny(raw);
    const count = getCommentCount(key);
    const level = Math.min(count, 5);
    const levelClasses = ['comment-level-0','comment-level-1','comment-level-2','comment-level-3','comment-level-4','comment-level-5'];

    document.querySelectorAll(`[data-comment-btn="${key}"]`).forEach(btn => {
      btn.innerHTML = summary + ' ✎';
      const empty = !arr.some(c => c && c.trim());
      btn.classList.toggle('comment-btn-empty', empty);

      btn.classList.add('comment-btn','sprint-comment-btn');

      levelClasses.forEach(c => btn.classList.remove(c));
      btn.classList.add('comment-level-' + level);
    });
  }

  if (!NS.updateAllReportCommentButtons) {
    NS.updateAllReportCommentButtons = function(){
      const keys = Object.keys(state.generalComments || {});
      document.querySelectorAll('[data-comment-btn]').forEach(btn=>{
        const k = btn.getAttribute('data-comment-btn');
        updateCommentButtonsFor(k);
      });
    };
  }

  function truncateAny(raw, max = 24) {
    if (raw == null) return 'כתוב הערה...';
    let s;
    if (Array.isArray(raw)) {
      const c = raw.filter(x => x && x.trim());
      if (!c.length) return 'כתוב הערה...';
      s = c.join(' | ');
    } else {
      s = String(raw).trim();
      if (!s) return 'כתוב הערה...';
    }
    s = s.replace(/\s+/g, ' ');
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  (function migrateOnce() {
    if (window.__commentsMigrated) return;
    window.__commentsMigrated = true;
    if (!window.state?.generalComments) return;
    let changed = false;
    Object.entries(state.generalComments).forEach(([k, v]) => {
      if (typeof v === 'string' && v.includes(' | ')) {
        const parts = v.split('|').map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) {
          state.generalComments[k] = parts;
          changed = true;
        }
      }
    });
    if (changed && typeof saveState === 'function') saveState();
  })();

  window.QuickComments.refresh = function(){
    const host = document.getElementById('quick-comment-bar-container');
    if (host) window.QuickComments.renderBar(true);
  };

})();