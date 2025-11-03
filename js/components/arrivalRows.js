(function(){
  window.ArrivalRows = window.ArrivalRows || {};

  // טעינת קובץ CSS יעודי לרכיב
  function ensureArrivalRowsCSS(){
    if (document.getElementById('arrival-rows-css')) return;
    const link = document.createElement('link');
    link.id = 'arrival-rows-css';
    link.rel = 'stylesheet';
    link.href = 'css/arrival-rows.css';
    document.head.appendChild(link);
  }

  function defaultTruncate(raw, max = 20){
    if (raw == null) return 'כתוב הערה...';
    let str;
    if (Array.isArray(raw)){
      str = raw.filter(c=>c && c.trim()).join(' | ');
    } else {
      str = String(raw||'').trim();
    }
    if (!str) return 'כתוב הערה...';
    const single = str.replace(/\s+/g,' ');
    return single.length > max ? single.slice(0, max-3) + '...' : single;
  }

  window.ArrivalRows.render = function renderArrivalRows(opts){
    // וידוא טעינת CSS לפני רינדור
    ensureArrivalRowsCSS();

    const {
      arrivals = [],
      getComment,
      formatTime,
      truncate = defaultTruncate,
      maxChars = 20,
      variant = 'float',
      showHeader = true,
      labels = { shoulder:'מספר כתף', comment:'הערות', time:'זמן' },
      listId = 'arrival-list',
      onCommentClick,
      hideCommentsColumn = false,
      hideRankColumn = false, // NEW: הסתרת עמודת מיקום
      headerTitle // NEW: כותרת מותאמת מעל שורת הכותרת של הטבלה
    } = opts;

    const headerHtml = (showHeader && arrivals.length) ? `
      <div class="arrival-header">
        ${!hideRankColumn ? `<span class="h-cell static-position">מיקום</span>` : ''}
        <span class="h-cell shoulder">מס' כתף</span>
        ${!hideCommentsColumn ? `<span class="h-cell comment">${labels.comment}</span>` : ''}
        <span class="h-cell time">${labels.time}</span>
      </div>` : '';

    // NEW: עטיפת כותרת מותאמת אם נשלחה
    const headerTitleHtml = headerTitle ? `<div class="arrival-header-title">${headerTitle}</div>` : '';

    const rowsHtml = arrivals.map((a, idx) => {
      const sn = a.shoulderNumber;
      const raw = getComment ? getComment(sn) : undefined;
      let count = 0;
      if (Array.isArray(raw)) count = raw.filter(c=>c && c.trim()).length; else if (raw && String(raw).trim()) count = 1;
      const level = Math.min(count,5);
      const has = count > 0;
      const display = truncate(raw, maxChars);
      const timeText = a.finishTime != null ? formatTime(a.finishTime) : (a.comment || '');
      const staticPosition = idx + 1;

      const commentCell = hideCommentsColumn ? '' : `
          <span class="comment-cell">
            <button class="comment-btn comment-level-${level} ${has ? '' : 'comment-btn-empty'}" data-comment-btn="${sn}" data-comment-count="${count}">
              <span class="comment-text">${display}</span>
              <span class="comment-icon" aria-hidden="true">✎</span>
            </button>
          </span>`;

      const rankCell = hideRankColumn ? '' : `<span class="static-position">${staticPosition}</span>`;

      return `
        <div class="arrival-row ${variant}" data-shoulder-number="${sn}">
          ${rankCell}
          <span class="shoulder-cell">${sn}</span>
          ${commentCell}
          <span class="time-cell">${timeText}</span>
        </div>`;
    }).join('');

    return `
      <div class="arrival-section${hideCommentsColumn ? ' hide-comments' : ''}${hideRankColumn ? ' hide-rank' : ''}">
        ${headerTitleHtml}
        ${headerHtml}
        <div id="${listId}" class="${hideCommentsColumn ? 'hide-comments' : ''}${hideRankColumn ? ' hide-rank' : ''}">
          ${rowsHtml}
        </div>
      </div>`;
  };

  // חיבור מאזיני הערה אחרי שהכנסת את ה-HTML לדף
  window.ArrivalRows.attachCommentHandlers = function(container, { onOpen }){
    container.querySelectorAll('[data-comment-btn]').forEach(btn=>{
      btn.addEventListener('click', ()=> {
        const sn = btn.getAttribute('data-comment-btn');
        onOpen && onOpen(sn, btn);
      });
    });
  };

})();