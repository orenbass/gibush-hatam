(function () {
  window.Pages = window.Pages || {};

  window.Pages.renderSociometricStretcherHeatPage = function renderSociometricStretcherHeatPage(heatIndex) {
    const heat = state.sociometricStretcher?.heats?.[heatIndex];
    if (!heat) { contentDiv.innerHTML = '<p>מקצה לא נמצא.</p>'; return; }
    heat.selections = heat.selections || {};

    function ensureSelectionOrderBackfill(){
      if (!heat.selectionOrder) heat.selectionOrder = { stretcher: [], jerrican: [] };
      heat.selectionOrder.stretcher = heat.selectionOrder.stretcher || [];
      heat.selectionOrder.jerrican = heat.selectionOrder.jerrican || [];
      const sel = heat.selections;
      Object.entries(sel).forEach(([sn,type])=>{
        const arr = heat.selectionOrder[type];
        if (arr && !arr.includes(sn)) arr.push(sn);
      });
      ['stretcher','jerrican'].forEach(type=>{
        heat.selectionOrder[type] = heat.selectionOrder[type].filter(sn => sel[sn] === type);
      });
    }
    ensureSelectionOrderBackfill();

    const selections = heat.selections;

    const PAGE_LABEL = 'מקצה';
    // הוסר עדכון headerTitle כדי ליישר קו עם עמודי הספרינטים המשתמשים ב-heat-bar פנימי
    // if (window.headerTitle) { headerTitle.textContent = `${PAGE_LABEL} – מקצה ${heatIndex + 1}/${CONFIG.NUM_STRETCHER_HEATS}`; }

    const activeRunners = (state.runners || [])
      .filter(r => r.shoulderNumber && !state.crawlingDrills.runnerStatuses[r.shoulderNumber])
      .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

    const stretcherCount = Object.values(selections).filter(v => v === 'stretcher').length;
    const jerricanCount  = Object.values(selections).filter(v => v === 'jerrican').length;
    const stretcherFull  = stretcherCount >= CONFIG.MAX_STRETCHER_CARRIERS;
    const jerricanFull   = jerricanCount  >= CONFIG.MAX_JERRICAN_CARRIERS;

    const runnerCardsHtml = activeRunners.map(r => {
      const sn = r.shoulderNumber;
      const sel = selections[sn];
      const isStretcher = sel === 'stretcher';
      const isJerrican  = sel === 'jerrican';
      const cardCls = ['stretcher-card'];
      if (isStretcher) cardCls.push('selected-stretcher');
      if (isJerrican) cardCls.push('selected-jerrican');

      const disableStretcher = !isStretcher && (isJerrican || stretcherFull);
      const disableJerrican  = !isJerrican && (isStretcher || jerricanFull);

      return `
        <div class="${cardCls.join(' ')}" data-sn="${sn}" data-selected="${sel||''}">
          <div class="st-number">${sn}</div>
          <div class="stretcher-actions" dir="rtl">
            <button
              data-shoulder-number="${sn}"
              data-type="stretcher"
              class="task-btn st-btn st-btn-stretcher ${isStretcher ? 'active' : ''}"
              ${disableStretcher ? 'disabled' : ''}
              title="נשיאת אלונקה" aria-label="נשיאת אלונקה">
              ${window.Icons?.stretcher ? window.Icons.stretcher() : '🛏️'}
              <span class="st-btn-text">אלונקה</span>
            </button>
            <button
              data-shoulder-number="${sn}"
              data-type="jerrican"
              class="task-btn st-btn st-btn-jerrican ${isJerrican ? 'active' : ''}"
              ${disableJerrican ? 'disabled' : ''}
              title="נשיאת ג'ריקן" aria-label="נשיאת ג'ריקן">
              ${window.Icons?.jerrican ? window.Icons.jerrican() : '🧴'}
              <span class="st-btn-text">ג'ריקן</span>
            </button>
          </div>
        </div>`;
    }).join('');

    const topNavHtml = `
      <div class="heat-bar">
        <div class="heat-bar-row top">
          <button id="stretcher-heat-prev" class="heat-bar-btn" ${heatIndex === 0 ? 'disabled' : ''}>קודם</button>
          <div class="heat-bar-title">${PAGE_LABEL} ${heatIndex + 1}/${CONFIG.NUM_STRETCHER_HEATS}</div>
          <button id="stretcher-heat-next" class="heat-bar-btn">${heatIndex === CONFIG.NUM_STRETCHER_HEATS - 1 ? 'לדוחות' : 'הבא'}</button>
        </div>
      </div>`;

    const instructionsHtml = `
      <div class="mb-3 text-center text-sm text-gray-600 dark:text-gray-300">
        בחר את נושאי האלונקה והג'ריקן. לחיצה חוזרת מבטלת, מעבר בין סוגים מחליף. הסיכום הדינמי למטה מציג את סדר הבחירה.
      </div>`;

    contentDiv.innerHTML = `
      <div id="stretcher-heat-page">
        ${topNavHtml}
        ${instructionsHtml}
        <div id="stretcher-grid" class="auto-grid stretcher-grid">
          ${runnerCardsHtml}
        </div>
        <div id="selection-summary" class="selection-summary-wrapper"></div>
      </div>
    `;

    function updateSelectionSummary(){
      const wrap = document.getElementById('selection-summary');
      if(!wrap) return;
      ensureSelectionOrderBackfill();
      const orderSt = heat.selectionOrder.stretcher || [];
      const orderJe = heat.selectionOrder.jerrican || [];
      const lineHtml = (arr,label) => arr.length ? arr.map((sn,i)=>`<div class="summary-line" data-rank="${i+1}">
          <span class="rank-label">${i+1}</span>
          <span class="line-text">מס' כתף <strong>${sn}</strong></span>
        </div>`).join('') : '<div class="summary-line empty"><span class="line-text">אין בחירות</span></div>';
      wrap.innerHTML = `
        <div class="selection-summary-box">
          <h4 class="summary-title">סיכום סדר בחירה</h4>
          <div class="summary-groups">
            <div class="summary-group">
              <div class="group-title">אלונקה</div>
              <div class="summary-lines">${lineHtml(orderSt,'אלונקה')}</div>
            </div>
            <div class="summary-group">
              <div class="group-title">ג'ריקן</div>
              <div class="summary-lines">${lineHtml(orderJe,'ג\'ריקן')}</div>
            </div>
          </div>
          <div class="summary-note"><strong>שימו לב:</strong> סדר הבחירה משפיע ישירות על הציון הסופי. הסדר מתעדכן מיד עם כל לחיצה; ביטול מסיר את הבחירה מהרשימה.</div>
        </div>`;
    }
    updateSelectionSummary();

    contentDiv.querySelector('#stretcher-grid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.task-btn');
      if (!btn || btn.disabled) return;
      const sn = String(btn.dataset.shoulderNumber);
      const type = btn.dataset.type;
      const current = selections[sn];

      ensureSelectionOrderBackfill();

      if (current === type) {
        delete selections[sn];
        const arr = heat.selectionOrder[type];
        heat.selectionOrder[type] = arr.filter(x=>x!==sn);
      } else {
        if (current) {
          const oldArr = heat.selectionOrder[current];
          heat.selectionOrder[current] = oldArr.filter(x=>x!==sn);
        }
        selections[sn] = type;
        const arr = heat.selectionOrder[type];
        if (!arr.includes(sn)) arr.push(sn);
      }
      saveState();
      render();
      setTimeout(() => btn.blur(), 0);
    });

    document.getElementById('stretcher-heat-prev')?.addEventListener('click', () => {
      if (heatIndex > 0) {
        state.sociometricStretcher.currentHeatIndex = heatIndex - 1;
        saveState(); render();
      }
    });
    document.getElementById('stretcher-heat-next')?.addEventListener('click', () => {
      if (heatIndex < CONFIG.NUM_STRETCHER_HEATS - 1) {
        state.sociometricStretcher.currentHeatIndex = heatIndex + 1;
        saveState(); render();
      } else {
        state.currentPage = PAGES.REPORT;
        saveState(); render();
      }
    });
  };
})();