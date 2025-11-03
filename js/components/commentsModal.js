(function () {
  if (window.CommentsModal) return;

  function ensureCss() {
    if (document.getElementById('comments-modal-style')) return;
    const st = document.createElement('style');
    st.id = 'comments-modal-style';
    st.textContent = `
      .comment-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;overflow:auto;z-index:1000;padding:80px 18px 40px;padding-top:max(80px, env(safe-area-inset-top, 20px) + 60px)}
      .comment-modal{background:#ffffff;max-width:500px;width:100%;border-radius:16px;padding:18px 18px 14px;box-shadow:0 4px 18px -2px rgba(0,0,0,.25);animation:cmIn .18s ease;margin-top:0}
      .dark .comment-modal{background:#1f2937;color:#e2e8f0}
      @keyframes cmIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      .comment-modal h3{margin:0 0 4px;font-size:16px;font-weight:700}
      .note-muted{font-size:11px;opacity:.65;margin:4px 0 10px}
      .comment-modal .add-row input{background:#f8fafc;border:1px solid #cbd5e1;color:#1e293b;border-radius:10px}
      .dark .comment-modal .add-row input{background:#374151;border-color:#475569;color:#f1f5f9}
      .comment-modal .c-row{background:#f1f5f9}
      .dark .comment-modal .c-row{background:#273549}
      .comment-modal input[type="text"],
      .comment-modal textarea,
      .comment-modal .c-edit{
        background:#f8fafc;
        border:1px solid #cbd5e1;
        color:#1e293b;
        border-radius:10px;
      }
      .dark .comment-modal input[type="text"],
      .dark .comment-modal textarea,
      .dark .comment-modal .c-edit{
        background:#1f2937;
        border:1px solid #475569;
        color:#f1f5f9;
      }
      .comment-modal input[type="text"]:focus,
      .comment-modal textarea:focus,
      .comment-modal .c-edit:focus{
        outline:none;
        border-color:#3b82f6;
        box-shadow:0 0 0 2px rgba(59,130,246,.15);
      }
      .dark .comment-modal input[type="text"]:focus,
      .dark .comment-modal textarea:focus,
      .dark .comment-modal .c-edit:focus{
        border-color:#60a5fa;
        box-shadow:0 0 0 2px rgba(96,165,250,.2);
      }
      .comment-modal ::placeholder{color:#94a3b8}
      .dark .comment-modal ::placeholder{color:#64748b}
      /* כפתור משותף בכל העמודים */
      .comment-btn{background:#2563eb;color:#fff;font-weight:500;font-size:11px;border:0;border-radius:8px;padding:6px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:.15s}
      .comment-btn:hover{background:#1d4ed8}
      .dark .comment-btn{background:#1d4ed8}
      .dark .comment-btn:hover{background:#1e40af}
      .comment-btn-empty{opacity:.75;font-style:italic}
      .comment-btn-empty:hover{opacity:1;font-style:normal}
      .comment-modal .btn{
        font-family:inherit;
        padding:6px 12px;
        font-size:12px;
        line-height:1.1;
        font-weight:600;
        border-radius:10px;
        cursor:pointer;
        border:1px solid transparent;
        background:#2563eb;
        color:#fff;
        display:inline-flex;
        align-items:center;
        gap:4px;
        transition:.15s;
      }
      .comment-modal .btn:hover{background:#1d4ed8}
      .comment-modal .btn:focus{outline:none;box-shadow:0 0 0 2px rgba(59,130,246,.35)}
      .dark .comment-modal .btn{background:#1d4ed8}
      .dark .comment-modal .btn:hover{background:#1e40af}

      .comment-modal .btn-primary{background:#2563eb;color:#fff}
      .comment-modal .btn-primary:hover{background:#1d4ed8}

      .comment-modal .btn-outline{
        background:#ffffff;
        color:#1d4ed8;
        border:1px solid #cbd5e1;
      }
      .comment-modal .btn-outline:hover{background:#eff6ff}
      .dark .comment-modal .btn-outline{
        background:#1f2937;
        color:#60a5fa;
        border-color:#475569;
      }
      .dark .comment-modal .btn-outline:hover{background:#243044}

      .comment-modal .btn-success{
        background:#059669;
        color:#fff;
        border-color:#059669;
      }
      .comment-modal .btn-success:hover{background:#047857}

      .comment-modal .btn-danger{
        background:#ffffff;
        color:#dc2626;
        border:1px solid #fecaca;
      }
      .comment-modal .btn-danger:hover{background:#fef2f2}
      .dark .comment-modal .btn-danger{
        background:#1f2937;
        color:#f87171;
        border-color:#7f1d1d;
      }
      .dark .comment-modal .btn-danger:hover{background:#2a3647}

      .comment-mic-btn{
        position:relative;
        border:1px solid #cbd5e1;
        background:#ffffff;
        width:38px;
        height:38px;
        border-radius:10px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        color:#334155;
        font-size:18px;
        transition:.18s;
      }
      .dark .comment-mic-btn{
        background:#1f2937;
        border-color:#475569;
        color:#cbd5e1;
      }
      .comment-mic-btn:hover{background:#f1f5f9}
      .dark .comment-mic-btn:hover{background:#273549}
      .comment-mic-btn.listening{
        background:#dc2626;
        border-color:#dc2626;
        color:#fff;
        animation:pulseMic 1.1s infinite ease-in-out;
      }
      @keyframes pulseMic{
        0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.45)}
        50%{box-shadow:0 0 0 6px rgba(220,38,38,0)}
      }
      .comment-mic-btn[disabled]{opacity:.4;cursor:not-allowed;animation:none}
      .comment-mic-status{
        font-size:11px;
        margin-top:4px;
        min-height:14px;
        opacity:.75;
      }
      .comment-mic-btn .mic-dot{
        position:absolute;
        inset:auto 6px 6px auto;
        width:8px;
        height:8px;
        background:#22c55e;
        border-radius:50%;
        box-shadow:0 0 0 2px #fff;
        display:none;
      }
      .comment-mic-btn.listening .mic-dot{display:block}
      .dark .comment-mic-btn.listening .mic-dot{box-shadow:0 0 0 2px #1f2937}
      .comment-modal .add-row{gap:6px}
      .comment-modal .add-row input{
        padding:6px 8px !important;
        font-size:13px !important;
      }
      .comment-mic-btn{
        width:34px;
        height:34px;
        font-size:16px;
      }
      .comment-mic-btn.listening{
        /* שמירה – רק הקטנה קלה של ה-radius */
        border-radius:10px;
      }
      .comment-mic-status{
        margin-top:2px;
        font-size:10px;
      }
    `;
    document.head.appendChild(st);
  }

  function getCommentsArray(key){
    return window.ensureCommentArray
      ? window.ensureCommentArray(key)
      : (function(){
          window.state = window.state || {};
          state.generalComments = state.generalComments || {};
          const ex = state.generalComments[key];
          if (Array.isArray(ex)) return ex;
          if (typeof ex === 'string' && ex.trim()) state.generalComments[key] = [ex.trim()];
          else state.generalComments[key] = [];
          return state.generalComments[key];
        })();
  }

  function defaultTruncate(raw, max = 24) {
    if (raw == null) return 'כתוב הערה...';
    let str;
    if (Array.isArray(raw)) {
      const cleaned = raw.filter(c => !!c && c.trim());
      if (!cleaned.length) return 'כתוב הערה...';
      str = cleaned.join(' | ');
    } else {
      str = String(raw || '').trim();
      if (!str) return 'כתוב הערה...';
    }
    const one = str.replace(/\s+/g,' ');
    return one.length > max ? one.slice(0,max) + '…' : one;
  }

  function open(shoulderNumber, opts = {}) {
    const { originBtn, truncateFn } = opts;

    ensureCss();
    document.querySelector('.comment-modal-backdrop')?.remove();

    const comments = getCommentsArray(shoulderNumber);
    // להציג חדשים למעלה – היפוך חד פעמי
    if (!comments.__reversedOnce) {
      comments.reverse();
      comments.__reversedOnce = true;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'comment-modal-backdrop';
    backdrop.innerHTML = `
      <div class="comment-modal" role="dialog" aria-modal="true">
        <header style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <h3>הערות – מס' כתף ${shoulderNumber}</h3>
          <button class="btn btn-outline" data-close style="padding:4px 10px;font-size:13px">✕</button>
        </header>

        <div class="note-muted">הוסף כמה הערות. ניתן לערוך ולמחוק כל שורה.</div>

        <div class="add-row" style="display:flex;align-items:center;margin-bottom:4px">
          <input id="new-comment-input" type="text" placeholder="כתוב הערה חדשה..." style="flex:1;min-width:0" />
          <button class="comment-mic-btn" type="button" data-mic title="הקלטה בלחיצה ארוכה (Android)">
            🎤
            <span class="mic-dot"></span>
          </button>
          <button class="btn btn-primary" data-add style="padding:6px 10px;font-size:12px">הוסף</button>
        </div>
        <div class="comment-mic-status" data-mic-status></div>
        <div id="comments-list" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow:auto;padding-right:2px">
          ${comments.map((c,i)=>rowTpl(i,c)).join('')}
        </div>

        <div class="modal-actions" style="display:flex;justify-content:flex-end;margin-top:16px">
          <button class="btn btn-primary" data-save>שמירה וסיום</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const inputNew = backdrop.querySelector('#new-comment-input');
    setTimeout(()=>inputNew.focus(),30);

    function escHtml(s=''){
      return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
    }

    function rowTpl(index, text, editing=false){
      const clean = escHtml(text||'');
      return `
        <div class="c-row" data-index="${index}" style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:10px;position:relative">
          <div style="font-weight:600;min-width:22px;text-align:center;color:#334155">${index+1}.</div>
          <div class="c-content" style="flex:1">
            ${editing
              ? `<textarea class="c-edit" data-orig="${escHtml(text||'')}" style="width:100%;min-height:54px;resize:vertical;padding:6px 8px;font-size:13px">${clean}</textarea>`
              : `<div class="c-text" style="white-space:pre-wrap;font-size:13px;line-height:1.35">${clean || '<em style="opacity:.6">—</em>'}</div>`
            }
          </div>
          <div class="c-actions" style="display:flex;flex-direction:column;gap:4px">
            ${editing
              ? `<button class="btn" data-save-edit style="background:#059669;color:#fff;padding:4px 10px;font-size:11px">שמור</button>
                 <button class="btn btn-outline" data-cancel-edit style="padding:4px 10px;font-size:11px">בטל</button>`
              : `<button class="btn btn-outline" data-edit style="padding:4px 10px;font-size:11px">ערוך</button>
                 <button class="btn btn-outline" data-delete style="padding:4px 10px;font-size:11px;color:#dc2626;border-color:#fecaca">מחק</button>`
            }
          </div>
        </div>
      `;
    }

    function rerender(){
      const list = backdrop.querySelector('#comments-list');
      list.innerHTML = comments.map((c,i)=>rowTpl(i,c,false)).join('');
    }

    function add(text){
      const t = (text||'').trim();
      if(!t) return;
      comments.unshift(t);
      saveState?.();
      rerender();
    }
    function startEdit(i){
      const list = backdrop.querySelector('#comments-list');
      const row = list.querySelector(`.c-row[data-index="${i}"]`);
      if(!row) return;
      row.outerHTML = rowTpl(i, comments[i], true);
    }
    function saveEdit(i){
      const row = backdrop.querySelector(`.c-row[data-index="${i}"]`);
      if(!row) return;
      const val = (row.querySelector('.c-edit').value||'').trim();
      comments[i] = val;
      saveState?.();
      rerender();
    }
    function cancelEdit(){ rerender(); }
    function del(i){
      if(!confirm('למחוק הערה זו?')) return;
      comments.splice(i,1);
      saveState?.();
      rerender();
    }

    function hasUnsavedChanges(){
      if ((inputNew.value||'').trim()) return true;
      const ta = backdrop.querySelector('.c-edit');
      if (ta){
        const orig = (ta.getAttribute('data-orig')||'').trim();
        const cur = (ta.value||'').trim();
        if (orig !== cur) return true;
        return true; // מצב עריכה פתוח
      }
      return false;
    }

    function updateOriginButton(){
      if (!originBtn) return;
      const raw = state.generalComments?.[shoulderNumber];
      const summary = (truncateFn || defaultTruncate)(raw);
      originBtn.innerHTML = summary + ' ✎';
      const empty = !raw || (Array.isArray(raw) && !raw.some(c=>c && c.trim())) || /^כתב|^הערה/.test(summary);
      if (empty) originBtn.classList.add('comment-btn-empty'); else originBtn.classList.remove('comment-btn-empty');
    }

    function escHandler(e){ if(e.key==='Escape') attemptClose('close'); }
    document.addEventListener('keydown', escHandler);

    function doClose(action){
      document.removeEventListener('keydown', escHandler);
      backdrop.remove();
      if (action === 'save') {
        updateOriginButton();
      } else if (action === 'close') {
        updateOriginButton(); // גם בסגירה רגילה – לעדכן (אם מחקו הכול)
      }
    }

    function attemptClose(action){
      if (action !== 'save' && hasUnsavedChanges()){
        if(!confirm('יש הערה חדשה או עריכה שלא נשמרו. לצאת בלי לשמור אותן?')) return;
      }
      doClose(action);
    }

    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) { attemptClose('close'); return; }
      if (e.target.matches('[data-close]')) { e.preventDefault(); attemptClose('close'); return; }
      if (e.target.matches('[data-save]')) {
        e.preventDefault();
        if (hasUnsavedChanges()){
          if(!confirm('יש הערה חדשה או עריכה שלא נשמרו. לסגור בלי לשמור אותן?')) return;
        }
        // שמירה = רק סגירה ועדכון כפתור
        saveState?.();

        // קריאה למעדכן הגלובלי שיטפל ב-UI
        if (window.CommentButtonUpdater) {
          window.CommentButtonUpdater.update(shoulderNumber);
        }

        // עדכון בועת האינדיקציה
        if (window.updateMiniCommentIndicator) {
          window.updateMiniCommentIndicator(shoulderNumber);
        }

        // רענון כללי של כל הבועות אם קיים
        if (window.refreshAllMiniCommentIndicators) {
          window.refreshAllMiniCommentIndicators();
        }

        attemptClose('save');
        return;
      }
      if (e.target.matches('[data-add]')) {
        add(inputNew.value);
        inputNew.value='';
        inputNew.focus();
        return;
      }
      const btn = e.target.closest('button');
      if(!btn) return;
      const row = btn.closest('.c-row');
      if(!row) return;
      const idx = parseInt(row.dataset.index,10);
      if (btn.dataset.edit !== undefined) startEdit(idx);
      else if (btn.dataset.delete !== undefined) del(idx);
      else if (btn.dataset.saveEdit !== undefined) saveEdit(idx);
      else if (btn.dataset.cancelEdit !== undefined) cancelEdit(idx);
    });

    inputNew.addEventListener('keydown', e => {
      if(e.key==='Enter'){
        e.preventDefault();
        add(inputNew.value);
        inputNew.value='';
      }
    });

    // ===== Voice Integration - Using Unified System =====
    const micBtn = backdrop.querySelector('[data-mic]');
    const micStatus = backdrop.querySelector('[data-mic-status]');

    // טעינת מערכת המיקרופון המאוחדת אם לא קיימת
    if (!window.attachCommentMic) {
      const script = document.createElement('script');
      script.src = 'js/utils/comment-mic.js';
      script.onload = () => {
        if (window.attachCommentMic && micBtn && inputNew) {
          window.attachCommentMic(micBtn, inputNew);
        }
      };
      document.head.appendChild(script);
    } else {
      // אם כבר קיימת - חבר מיד
      if (micBtn && inputNew) {
        window.attachCommentMic(micBtn, inputNew);
      }
    }

    // הסתרת סטטוס מיקרופון (לא נדרש עם המערכת החדשה)
    if (micStatus) {
      micStatus.style.display = 'none';
    }
  }

  window.CommentsModal = { open };
})();

(function () {
  window.CommentButtonUpdater = {
    /**
     * מעדכן את התצוגה של כפתור הערות ספציפי על סמך המידע העדכני ב-state.
     * @param {string | number} shoulderNumber מספר הכתף של הרץ לעדכון.
     */
    update: function (shoulderNumber) {
      // מצא את הכפתור הרלוונטי בכל מקום בדף
      const btn = document.querySelector(`[data-comment-btn="${shoulderNumber}"]`);
      if (!btn) {
        // console.log(`CommentButtonUpdater: לא נמצא כפתור עבור רץ #${shoulderNumber}`);
        return;
      }

      // 1. קבל את המידע העדכני מה-state
      const raw = window.state?.generalComments?.[shoulderNumber];
      let arr = [];
      if (Array.isArray(raw)) arr = raw.filter(c => c && c.trim());
      else if (raw && String(raw).trim()) arr = [String(raw).trim()];
      
      const count = arr.length;
      const level = Math.min(count, 5); // רמת צבע 0-5

      // 2. עדכן את הטקסט
      const textEl = btn.querySelector('.comment-text');
      if (textEl) {
        let text = 'כככככככככככככתוב הערה...';
        if (count > 0) {
          const joined = arr.join(' | ').replace(/\s+/g, ' ');
          text = joined.length > 20 ? joined.slice(0, 17) + '...' : joined;
        }
        textEl.textContent = text;
      }

      // 3. עדכן את רמת הצבע (class)
      // הסר את כל רמות הצבע הקודמות
      for (let i = 0; i <= 5; i++) {
        btn.classList.remove(`comment-level-${i}`);
      }
      // הוסף את הרמה הנכונה
      btn.classList.add(`comment-level-${level}`);

      // 4. עדכן את מצב "ריק" / "מלא"
      if (count === 0) {
        btn.classList.add('comment-btn-empty');
      } else {
        btn.classList.remove('comment-btn-empty');
      }
      
      // 5. עדכן מידע נוסף (אופציונלי)
      btn.dataset.commentCount = count;
      btn.title = `הערות (#${shoulderNumber}) – ${count ? count + ' הערות' : 'אין הערות'}`;
    }
  };
})();