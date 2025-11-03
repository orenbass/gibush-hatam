(function () {
    window.Pages = window.Pages || {};

    // ADDED: רענון עמוד מקצה ספרינט כשיש שינוי ברצים (עריכה / מחיקה)
    if (!window.__heatRunnerEventsBound) {
        window.__heatRunnerEventsBound = true;
        ['runnersChanged', 'activeRunnersChanged'].forEach(evt => {
            window.addEventListener(evt, () => {
                try {
                    if (state.currentPage === PAGES.HEATS && typeof state.currentHeatIndex === 'number') {
                        // רינדור מחדש לעדכון כפתורי הרצים (הכפתור הכחול נעלם למי שנמחק)
                        window.Pages.renderHeatPage(state.currentHeatIndex);
                    }
                } catch (e) { /* silent */ }
            });
        });
    }

    // --- NEW: גיבוי לרענון האפליקציה במקום render() שאינה מוגדרת כאן ---
    function rerenderHeatAfterNav(){
        if (typeof window.render === 'function') {
            try { return window.render(); } catch(e) { /* silent */ }
        }
        if (window.Pages && typeof window.Pages.renderHeatPage === 'function' && state.currentPage === PAGES.HEATS && typeof state.currentHeatIndex === 'number') {
            try { window.Pages.renderHeatPage(state.currentHeatIndex); } catch(e){ /* silent */ }
        }
    }

    function ensureCommentsModalLoaded() {
        return new Promise((resolve, reject) => {
            if (window.CommentsModal?.open) return resolve();
            if (document.querySelector('script[data-comments-modal]')) {
                const chk = () => window.CommentsModal?.open ? resolve() : setTimeout(chk, 40);
                return chk();
            }
            const s = document.createElement('script');
            s.src = 'js/components/commentsModal.js';
            s.async = true;
            s.dataset.commentsModal = 'true';
            s.onload = () => window.CommentsModal?.open ? resolve() : reject(new Error('CommentsModal missing'));
            s.onerror = () => reject(new Error('Failed loading commentsModal.js'));
            document.head.appendChild(s);
        });
    }

    function ensureArrivalRowsLoaded(){
        return new Promise((resolve,reject)=>{
            if (window.ArrivalRows?.render) return resolve();
            const existing = document.querySelector('script[data-arrival-rows]');
            if (existing){
                const chk = () => window.ArrivalRows?.render ? resolve() : setTimeout(chk,40);
                return chk();
            }
            const s = document.createElement('script');
            s.src = 'js/components/arrivalRows.js';
            s.async = true;
            s.dataset.arrivalRows = 'true';
            s.onload = () => window.ArrivalRows?.render ? resolve() : reject(new Error('arrivalRows API missing'));
            s.onerror = () => reject(new Error('Failed loading arrivalRows.js'));
            document.head.appendChild(s);
        });
    }

    function ensureSharedStylesLoaded(){
        return new Promise((resolve,reject)=>{
            if (window.ensureSharedCompetitionStyles){
                window.ensureSharedCompetitionStyles();
                return resolve();
            }
            const existing = document.querySelector('script[data-shared-styles]');
            if (existing){
                const chk = () => {
                    if (window.ensureSharedCompetitionStyles){
                        window.ensureSharedCompetitionStyles();
                        resolve();
                    } else setTimeout(chk,40);
                };
                return chk();
            }
            const s = document.createElement('script');
            s.src = 'js/components/sharedStyles.js';
            s.async = true;
            s.dataset.sharedStyles = 'true';
            s.onload = () => {
                if (window.ensureSharedCompetitionStyles){
                    window.ensureSharedCompetitionStyles();
                    resolve();
                } else reject(new Error('sharedStyles.js loaded but function missing'));
            };
            s.onerror = () => reject(new Error('Failed loading sharedStyles.js'));
            document.head.appendChild(s);
        });
    }

    function getCommentMeta(sn){
        const raw = state.generalComments?.[sn];
        const arr = Array.isArray(raw)
            ? raw.filter(c=>c && c.trim())
            : (raw && String(raw).trim() ? [String(raw).trim()] : []);
        const count = arr.length;
        const level = Math.min(count,5);
        let summary = 'כתוב הערה...';
        if (count){
            const joined = arr.join(' | ').replace(/\s+/g,' ');
            summary = joined.length > 20 ? joined.slice(0,20)+'…' : joined; // align with arrivalRows default truncate
        }
        return { summary, count, level, empty: count===0 };
    }

    function refreshSingleCommentButton(btn){
        const sn = btn.getAttribute('data-comment-btn');
        if (!sn) return;
        const { summary, count, level, empty } = getCommentMeta(sn);
        for (let i=0;i<=5;i++) btn.classList.remove(`comment-level-${i}`);
        btn.classList.add(`comment-level-${level}`);
        btn.classList.toggle('comment-btn-empty', empty);
        btn.dataset.commentCount = count;
        btn.title = `הערות (${count})`;
        // Update only the text span to preserve icon structure created by ArrivalRows
        const txt = btn.querySelector('.comment-text');
        if (txt && txt.textContent !== summary) txt.textContent = summary;
    }

    function refreshAllHeatCommentButtons(root=document){
        root.querySelectorAll('button.comment-btn[data-comment-btn]').forEach(refreshSingleCommentButton);
    }

    window.CommentButtonUpdater = window.CommentButtonUpdater || {};
    window.CommentButtonUpdater.update = function(sn){
        const btn = document.querySelector(`button.comment-btn[data-comment-btn="${sn}"]`);
        if (btn) refreshSingleCommentButton(btn);
    };

    window.Pages.renderHeatPage = async function renderHeatPage(heatIndex) {
        await ensureArrivalRowsLoaded();
        await ensureSharedStylesLoaded();

        const contentDiv = document.getElementById('content');
        const heat = state.heats[heatIndex];

        // REMOVED: מחיקת כל הקוד שקובע כותרת headerTitle

        function formatNoMs(totalMs){
            const totalSec = Math.floor(totalMs / 1000);
            const m = String(Math.floor(totalSec / 60)).padStart(2,'0');
            const s = String(totalSec % 60).padStart(2,'0');
            return `${m}:${s}`;
        }

        // NEW: ודא חישוב רשימת פעילים מעודכנת לפני שימוש
        if (typeof window.updateActiveRunners === 'function') {
            try { window.updateActiveRunners(); } catch(e) { /* silent */ }
        }

        function getActiveRunners() {
            const activeSet = new Set((state.activeShoulders || []).map(sn => String(sn).trim()));
            const seen = new Set();
            return (state.runners || [])
                .filter(r => {
                    if (!r) return false;
                    const sn = String(r.shoulderNumber || '').trim();
                    if (!sn) return false;
                    // אם קיימת רשימת activeShoulders השתמש בה כסינון קשיח
                    if (activeSet.size && !activeSet.has(sn)) return false;
                    if (state.crawlingDrills?.runnerStatuses?.[sn]) return false;
                    if (heat.arrivals.some(a => String(a.shoulderNumber) === sn)) return false;
                    if (seen.has(sn)) return false;
                    seen.add(sn);
                    return true;
                })
                .sort((a, b) => Number(a.shoulderNumber) - Number(b.shoulderNumber));
        }

        const activeRunners = getActiveRunners();

        const headerNav = `
          <div class="heat-bar">
            <div class="heat-bar-row top">
              <button id="prev-heat-btn-inline" class="heat-bar-btn" ${heatIndex === 0 ? 'disabled' : ''}>קודם</button>
              <div class="heat-bar-title">מקצה ${heatIndex + 1}/${CONFIG.NUM_HEATS}</div>
              <button id="next-heat-btn-inline" class="heat-bar-btn">
                ${heatIndex < CONFIG.NUM_HEATS - 1 ? 'הבא' : 'למסך זחילות'}
              </button>
            </div>
          </div>
        `;

        const arrivalsBlockHtml = ArrivalRows.render({
          arrivals: heat.arrivals,
          getComment: (sn) => state.generalComments?.[sn],
          formatTime: formatNoMs,
          showHeader: true,
          labels: { shoulder:'מספר כתף', comment:'הערות', time:'זמן ריצה' },
          listId: 'arrival-list',
          hideCommentsColumn: false
        });

        const bodyHtml = `
          ${headerNav}
          <div class="timer-center">
            <span id="timer-display" class="timer-display small" aria-live="polite">00:00</span>
          </div>
          <div class="heat-actions">
            <button id="start-btn" class="heat-btn start ${heat.started ? 'hidden' : ''}">התחל</button>
            <button id="stop-btn" class="heat-btn stop ${!heat.started || heat.finished ? 'hidden' : ''}">סיים</button>
            <button id="undo-btn" class="heat-btn undo ${!heat.started || heat.finished || heat.arrivals.length === 0 ? 'hidden' : ''}">בטל הגעה אחרונה</button>
            <button id="edit-order-btn" class="heat-btn edit ${!heat.finished || heat.arrivals.length === 0 ? 'hidden' : ''}">ערוך מיקומים</button>
            <button id="cancel-edit-btn" class="heat-btn cancel hidden">ביטול</button>
          </div>
          
          <!-- ADDED: כפתורי המועמדים -->
          <div id="runner-buttons-container" class="my-4 ${!heat.started || heat.finished ? 'hidden' : ''}">
            <h3 class="text-base md:text-lg font-semibold mb-2 text-center">לחץ על מספר הכתף של הרץ שהגיע</h3>
            <div class="auto-grid">
              ${activeRunners.map(r => `
                <button class="runner-btn bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md text-xl md:text-2xl" data-shoulder-number="${r.shoulderNumber}">${r.shoulderNumber}</button>`).join('')}
            </div>
          </div>

          ${arrivalsBlockHtml}
        `;
        contentDiv.innerHTML = bodyHtml;

        // --- AFTER INITIAL RENDER: ensure buttons reflect current state ---
        refreshAllHeatCommentButtons(contentDiv);

        // Monitor dynamic mutations (e.g., ArrivalRows re-renders rows) and re-apply
        const arrivalList = contentDiv.querySelector('#arrival-list');
        if (arrivalList){
            if (window._heatCommentObserver) window._heatCommentObserver.disconnect();
            window._heatCommentObserver = new MutationObserver(muts=>{
                let need = false;
                for (const m of muts){
                    if (m.type === 'childList' || m.type === 'subtree' || m.addedNodes.length){
                        need = true; break;
                    }
                }
                if (need) requestAnimationFrame(()=>refreshAllHeatCommentButtons(arrivalList));
            });
            window._heatCommentObserver.observe(arrivalList,{childList:true,subtree:true});
        }

        if (window.ensureTimerIcon) window.ensureTimerIcon();

        (function wrapHeatTimer(){
          if (window._timerWrappedNoMs) return;
          const original = window.updateTimerDisplay;
          function fmt(ms){
            const totalSec = Math.floor((ms||0)/1000);
            const m = String(Math.floor(totalSec/60)).padStart(2,'0');
            const s = String(totalSec%60).padStart(2,'0');
            return `${m}:${s}`;
          }
          window.updateTimerDisplay = function(ms){
            if (typeof original === 'function'){
              try { original(ms); } catch {}
            }
            const text = fmt(ms||0);
            if (window.setTimerValue) setTimerValue(text);
            else {
              const el = document.getElementById('timer-display');
              if (el){
                const span = el.querySelector('#timer-value');
                if (span) span.textContent = text; else el.textContent = text;
              }
            }
          };
          window._timerWrappedNoMs = true;
        })();

        function adjustHeatActions(){
          const wrap = contentDiv.querySelector('.heat-actions');
          if(!wrap) return;
          const visible = [...wrap.querySelectorAll('.heat-btn:not(.hidden)')];
          wrap.classList.remove('single','double');
          if (visible.length === 1) wrap.classList.add('single');
          else if (visible.length === 2) wrap.classList.add('double');
        }
        adjustHeatActions();

        contentDiv.querySelectorAll('#heat-bottom-nav, .heat-bottom-nav, .sticky-bottom')?.forEach(el => el.remove());
        ['prev-heat-btn', 'next-heat-btn'].forEach(id => document.getElementById(id)?.remove());

        if (heat.started && !heat.finished) startTimer();
        else updateTimerDisplay(heat.arrivals.length > 0 ? heat.arrivals[heat.arrivals.length - 1].finishTime : 0);
        

        document.getElementById('start-btn')?.addEventListener('click', () => {
          handleStart(heat);
          setTimeout(()=>{adjustHeatActions(); refreshAllHeatCommentButtons(contentDiv);},0);
        });
        document.getElementById('stop-btn')?.addEventListener('click', () => {
            confirmStopAndAdvance(heat, 'sprint');
            setTimeout(()=>{
                adjustHeatActions(); 
                refreshAllHeatCommentButtons(contentDiv);
                // NEW: חישוב ציוני ספרינטים אחרי סיום מקצה
                if (typeof window.updateAllSprintScores === 'function') {
                    window.updateAllSprintScores();
                }
            },0);
        });
        document.getElementById('undo-btn')?.addEventListener('click', () => {
          handleUndoArrival(heat);
          setTimeout(()=>refreshAllHeatCommentButtons(contentDiv),0);
        });

        document.getElementById('runner-buttons-container')?.addEventListener('click', (e) => {
            handleAddRunnerToHeat(e, heat, state.currentHeatIndex);
            setTimeout(() => {
                const container = document.getElementById('runner-buttons-container');
                if (container && !heat.finished) {
                    const updatedActiveRunners = getActiveRunners();
                    const grid = container.querySelector('.auto-grid');
                    if (grid) {
                        grid.innerHTML = updatedActiveRunners.map(r => `
                            <button class="runner-btn bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md text-xl md:text-2xl"
                                    data-shoulder-number="${r.shoulderNumber}">
                              ${r.shoulderNumber}
                            </button>`).join('');
                    }
                }
                refreshAllHeatCommentButtons(contentDiv);
                // Re-render arrivals list only (rows) keeping wrapper
                const arrivalList = document.getElementById('arrival-list');
                if (arrivalList && window.ArrivalRows?.render) {
                    const newSectionHtml = window.ArrivalRows.render({
                        arrivals: heat.arrivals,
                        getComment: (sn)=>state.generalComments?.[sn],
                        formatTime: formatNoMs,
                        showHeader: true,
                        labels: { shoulder:'מספר כתף', comment:'הערות', time:'זמן ריצה' },
                        listId: 'arrival-list'
                    });
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = newSectionHtml;
                    const newList = tempDiv.querySelector('#arrival-list');
                    if (newList) {
                        arrivalList.innerHTML = newList.innerHTML;
                        refreshAllHeatCommentButtons(contentDiv);
                    }
                }
            }, 100);
        });

        document.getElementById('next-heat-btn-inline')?.addEventListener('click', () => {
            // NEW: בדיקה שהמקצה הנוכחי הסתיים לפני מעבר למקצה הבא
            if (!heat.finished) {
                showModal('מקצה לא הושלם', 'יש לסיים את המקצה הנוכחי לפני המעבר למקצה הבא. לחץ על "סיים" כדי לסיים את המקצה.');
                return;
            }
            
            if (state.currentHeatIndex < CONFIG.NUM_HEATS - 1) {
                state.currentHeatIndex++;
                state.currentPage = PAGES.HEATS;
            } else {
                state.currentPage = PAGES.CRAWLING_COMMENTS;
            }
            saveState();
            rerenderHeatAfterNav();
        });
        document.getElementById('prev-heat-btn-inline')?.addEventListener('click', () => {
            // NEW: בדיקה שהמקצה הנוכחי הסתיים לפני מעבר למקצה הקודם - רק אם התחיל
            if (heat.started && !heat.finished) {
                showModal('מקצה לא הושלם', 'יש לסיים את המקצה הנוכחי לפני המעבר למקצה הקודם. לחץ על "סיים" כדי לסיים את המקצה.');
                return;
            }
            
            if (state.currentHeatIndex > 0) {
                state.currentHeatIndex--;
                saveState();
                rerenderHeatAfterNav();
            }
        });

        document.getElementById('edit-order-btn')?.addEventListener('click', () => {
            toggleEditOrderMode();
        });

        document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
            cancelEditOrder();
        });

        // NEW: גיבוי סדר מקורי לביטול
        let originalOrder = null;

        function toggleEditOrderMode() {
            const editBtn = document.getElementById('edit-order-btn');
            const cancelBtn = document.getElementById('cancel-edit-btn');
            const arrivalList = document.getElementById('arrival-list');
            const isEditing = editBtn.classList.contains('editing');
            
            if (isEditing) {
                // יציאה ממצב עריכה
                exitEditMode();
            } else {
                // כניסה למצב עריכה
                originalOrder = JSON.parse(JSON.stringify(heat.arrivals)); // שמירת גיבוי
                enterEditMode();
            }
        }

        function enterEditMode() {
            const editBtn = document.getElementById('edit-order-btn');
            const cancelBtn = document.getElementById('cancel-edit-btn');
            let arrivalList = document.getElementById('arrival-list');
            const arrivalSection = arrivalList ? arrivalList.closest('.arrival-section') : null;
            editBtn.textContent = 'סיים עריכה';
            editBtn.classList.add('editing');
            cancelBtn.classList.remove('hidden');
            arrivalList.classList.add('editing-order');
            if (arrivalSection) arrivalSection.classList.add('editing-order');
            // Re-render arrivals without comments column
            const newHtml = ArrivalRows.render({
                arrivals: heat.arrivals,
                getComment: (sn)=>state.generalComments?.[sn],
                formatTime: formatNoMs,
                showHeader: true,
                labels: { shoulder:'מספר כתף', comment:'הערות', time:'זמן ריצה' },
                listId: 'arrival-list',
                hideCommentsColumn: true
            });
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newHtml;
            const newList = tempDiv.querySelector('#arrival-list');
            if (newList && arrivalList) arrivalList.innerHTML = newList.innerHTML;
            arrivalList = document.getElementById('arrival-list');
            arrivalList.querySelectorAll('.arrival-row').forEach((row, index) => {
                row.draggable = true;
                row.dataset.originalIndex = index;
                const dragHandle = document.createElement('div');
                dragHandle.className = 'drag-handle';
                dragHandle.innerHTML = '⋮⋮⋮';
                dragHandle.title = 'גרור לשינוי מיקום';
                row.appendChild(dragHandle);
                row.addEventListener('dragstart', handleDragStart);
                row.addEventListener('dragover', handleDragOver);
                row.addEventListener('drop', handleDrop);
                row.addEventListener('dragend', handleDragEnd);
                row.addEventListener('touchstart', handleTouchStart, { passive: false });
                row.addEventListener('touchmove', handleTouchMove, { passive: false });
                row.addEventListener('touchend', handleTouchEnd);
            });
        }

        function exitEditMode() {
            const editBtn = document.getElementById('edit-order-btn');
            const cancelBtn = document.getElementById('cancel-edit-btn');
            const arrivalList = document.getElementById('arrival-list');
            const arrivalSection = arrivalList ? arrivalList.closest('.arrival-section') : null;
            editBtn.textContent = 'ערוך מיקומים';
            editBtn.classList.remove('editing');
            cancelBtn.classList.add('hidden');
            arrivalList.classList.remove('editing-order');
            if (arrivalSection) arrivalSection.classList.remove('editing-order');
            originalOrder = null;
            const newHtml = ArrivalRows.render({
                arrivals: heat.arrivals,
                getComment: (sn)=>state.generalComments?.[sn],
                formatTime: formatNoMs,
                showHeader: true,
                labels: { shoulder:'מספר כתף', comment:'הערות', time:'זמן ריצה' },
                listId: 'arrival-list',
                hideCommentsColumn: false
            });
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newHtml;
            const newList = tempDiv.querySelector('#arrival-list');
            if (newList && arrivalList) {
                arrivalList.innerHTML = newList.innerHTML;
                refreshAllHeatCommentButtons(document.getElementById('content'));
            }
            arrivalList.querySelectorAll('.arrival-row').forEach(row => {
                row.draggable = false;
                row.removeEventListener('dragstart', handleDragStart);
                row.removeEventListener('dragover', handleDragOver);
                row.removeEventListener('drop', handleDrop);
                row.removeEventListener('dragend', handleDragEnd);
                row.removeEventListener('touchstart', handleTouchStart);
                row.removeEventListener('touchmove', handleTouchMove);
                row.removeEventListener('touchend', handleTouchEnd);
                row.querySelector('.drag-handle')?.remove();
            });
        }

        function cancelEditOrder() {
            if (originalOrder) {
                // שחזור הסדר המקורי
                heat.arrivals = JSON.parse(JSON.stringify(originalOrder));
                saveState();
                
                // יציאה ממצב עריכה ורינדור מחדש
                exitEditMode();
                window.Pages.renderHeatPage(state.currentHeatIndex);
            }
        }

        let draggedElement = null;

        function handleDragStart(e) {
            draggedElement = e.target.closest('.arrival-row');
            draggedElement.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        }

        function handleDragOver(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            // ניקוי כל ההדגשות הקיימות
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            
            const target = e.target.closest('.arrival-row');
            if (target && target !== draggedElement) {
                // הדגשת הקו היעד - לפני או אחרי התלוי במיקום העכבר
                const rect = target.getBoundingClientRect();
                const mouseY = e.clientY;
                const midpoint = rect.top + rect.height / 2;
                
                // הסרת כל מחלקות הדרג מכל השורות
                document.querySelectorAll('.drag-over-before, .drag-over-after').forEach(el => {
                    el.classList.remove('drag-over-before', 'drag-over-after');
                });
                
                if (mouseY < midpoint) {
                    // העכבר במחצית העליונה - הדגש קו עליון
                    target.classList.add('drag-over-before');
                } else {
                    // העכבר במחצית התחתונה - הדגש קו תחתון  
                    target.classList.add('drag-over-after');
                }
            }
        }

        function handleDrop(e) {
            e.preventDefault();
            const target = e.target.closest('.arrival-row');
            if (target && target !== draggedElement) {
                const container = target.parentNode;
                const allRows = Array.from(container.children);
                const draggedIndex = allRows.indexOf(draggedElement);
                const targetIndex = allRows.indexOf(target);
                
                // NEW: שמירת זמני ההגעה לפי מיקום לפני השינוי
                const times = heat.arrivals.map(arrival => arrival.finishTime);
                
                // עדכון מערך ההגעות - רק מספרי הכתף זזים, הזמנים נשארים במקום
                const draggedArrival = heat.arrivals[draggedIndex];
                heat.arrivals.splice(draggedIndex, 1);
                heat.arrivals.splice(targetIndex, 0, draggedArrival);
                
                // NEW: החזרת הזמנים למיקומים המקוריים - הזמן קשור למיקום ולא למועמד
                heat.arrivals.forEach((arrival, index) => {
                    arrival.finishTime = times[index];
                });
                
                // שמירה ורינדור מחדש אבל ללא יציאה ממצב עריכה
                saveState();
                refreshAllHeatCommentButtons(contentDiv);
                
                // NEW: חישוב ציוני ספרינטים אחרי עריכת סדר
                if (typeof window.updateAllSprintScores === 'function') {
                    window.updateAllSprintScores();
                }
                
                // רינדור מחדש של הרשימה תוך שמירת מצב עריכה
                setTimeout(() => {
                    const wasEditing = document.getElementById('edit-order-btn').classList.contains('editing');
                    window.Pages.renderHeatPage(state.currentHeatIndex);
                    if (wasEditing) {
                        // חזרה למצב עריכה אחרי הרינדור
                        setTimeout(() => {
                            document.getElementById('edit-order-btn').click();
                        }, 50);
                    }
                }, 100);
            }
            // ניקוי classes
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        }

        function handleDragEnd(e) {
            if (draggedElement) {
                draggedElement.classList.remove('dragging');
                draggedElement = null;
            }
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        }

        // NEW: Touch event handlers for mobile
        let touchStartY = 0;
        let touchStartRow = null;
        let isDraggingTouch = false;

        function handleTouchStart(e) {
            const touch = e.touches[0];
            touchStartY = touch.clientY;
            touchStartRow = e.target.closest('.arrival-row');
            isDraggingTouch = false;
        }

        function handleTouchMove(e) {
            if (!touchStartRow) return;
            
            e.preventDefault(); // Prevent scrolling
            const touch = e.touches[0];
            const currentY = touch.clientY;
            const deltaY = Math.abs(currentY - touchStartY);
            
            // Start dragging if moved more than 10px
            if (deltaY > 10 && !isDraggingTouch) {
                isDraggingTouch = true;
                draggedElement = touchStartRow;
                draggedElement.classList.add('dragging');
            }
            
            if (isDraggingTouch) {
                // Find target element under touch
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetRow = elementBelow?.closest('.arrival-row');
                
                // Clear previous highlights
                document.querySelectorAll('.drag-over-before, .drag-over-after').forEach(el => {
                    el.classList.remove('drag-over-before', 'drag-over-after');
                });
                
                if (targetRow && targetRow !== draggedElement) {
                    const rect = targetRow.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;
                    
                    if (touch.clientY < midpoint) {
                        targetRow.classList.add('drag-over-before');
                    } else {
                        targetRow.classList.add('drag-over-after');
                    }
                }
            }
        }

        function handleTouchEnd(e) {
            if (!isDraggingTouch || !draggedElement) {
                touchStartRow = null;
                return;
            }
            
            const touch = e.changedTouches[0];
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetRow = elementBelow?.closest('.arrival-row');
            
            if (targetRow && targetRow !== draggedElement) {
                // Simulate drop event
                const fakeDropEvent = {
                    preventDefault: () => {},
                    target: targetRow
                };
                handleDrop(fakeDropEvent);
            }
            
            // Cleanup
            if (draggedElement) {
                draggedElement.classList.remove('dragging');
                draggedElement = null;
            }
            document.querySelectorAll('.drag-over-before, .drag-over-after').forEach(el => {
                el.classList.remove('drag-over-before', 'drag-over-after');
            });
            
            isDraggingTouch = false;
            touchStartRow = null;
        }

        // Attach modal handlers (ArrivalRows helper)
        ArrivalRows.attachCommentHandlers(contentDiv, {
            onOpen: async (sn, btn) => {
                try {
                    await ensureCommentsModalLoaded();
                    window.CommentsModal.open(sn, {
                        originBtn: btn,
                        onSave: (val) => {
                            state.generalComments = state.generalComments || {};
                            state.generalComments[sn] = val;
                            saveState();
                            window.CommentButtonUpdater && window.CommentButtonUpdater.update(sn);
                        }
                    });
                } catch (e) {
                    console.error(e);
                    alert('שגיאה בטעינת מודול ההערות');
                }
            }
        });
    };

    function normalizeCommentsForDisplay(raw){
      if (Array.isArray(raw)) {
        return raw.filter(c=>c && c.trim()).join(' | ');
      }
      return (raw || '');
    }
})();