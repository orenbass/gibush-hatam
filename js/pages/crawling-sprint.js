(function () {
    window.Pages = window.Pages || {};

    // הוספה: פונקציית טעינת מודול ההערות (אם לא נטען)
    function ensureCommentsModalLoaded() {
        return new Promise((resolve, reject) => {
            if (window.CommentsModal?.open) return resolve();
            if (document.querySelector('script[data-comments-modal]')) {
                const check = () => {
                    if (window.CommentsModal?.open) resolve();
                    else setTimeout(check, 40);
                };
                return check();
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
        return new Promise((resolve, reject)=>{
            if (window.ArrivalRows?.render) return resolve();
            // כבר נטען? ממתינים
            const existing = document.querySelector('script[data-arrival-rows]');
            if (existing){
                const chk = () => {
                    if (window.ArrivalRows?.render) resolve();
                    else setTimeout(chk,40);
                };
                return chk();
            }
            const s = document.createElement('script');
            s.src = 'js/components/arrivalRows.js';
            s.async = true;
            s.dataset.arrivalRows = 'true';
            s.onload = () => window.ArrivalRows?.render ? resolve() : reject(new Error('arrivalRows.js loaded but missing API'));
            s.onerror = () => reject(new Error('Failed loading arrivalRows.js'));
            document.head.appendChild(s);
        });
    }

    function ensureSharedStylesLoaded(){
        return new Promise((resolve,reject)=>{
            if (window.ensureSharedCompetitionStyles){
                window.ensureSharedCompetitionStyles(); return resolve();
            }
            const existing = document.querySelector('script[data-shared-styles]');
            if (existing){
                const chk=()=>{
                    if (window.ensureSharedCompetitionStyles){
                        window.ensureSharedCompetitionStyles(); resolve();
                    } else setTimeout(chk,40);
                }; return chk();
            }
            const s=document.createElement('script');
            s.src='js/components/sharedStyles.js';
            s.async=true;
            s.dataset.sharedStyles='true';
            s.onload=()=>{
                if (window.ensureSharedCompetitionStyles){
                    window.ensureSharedCompetitionStyles(); resolve();
                } else reject(new Error('sharedStyles missing'));
            };
            s.onerror=()=>reject(new Error('Failed loading sharedStyles.js'));
            document.head.appendChild(s);
        });
    }

    // הוספה: פונקציית קיצור טקסט להערות (תומך במערך / מחרוזת)
    function truncateCommentsSummary(raw, max = 20) {
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
        const single = str.replace(/\s+/g, ' ');
        return single.length > max ? single.slice(0, max) + '…' : single;
    }

    // הוספה: מאזינים גלובליים לרענון העמוד כאשר רשימת הרצים משתנה (מחיקה/עריכה)
    if (!window.__crawlingSprintRunnerEventsBound) {
        window.__crawlingSprintRunnerEventsBound = true;
        ['runnersChanged', 'activeRunnersChanged'].forEach(evt => {
            window.addEventListener(evt, () => {
                try {
                    if (state.currentPage === PAGES.CRAWLING_SPRINT && state?.crawlingDrills?.currentSprintIndex != null) {
                        // רינדור מחדש כדי שכפתורי הרצים יתעדכנו (הכפתורים הכחולים ייעלמו למי שנמחק)
                        window.Pages.renderCrawlingSprintPage(state.crawlingDrills.currentSprintIndex);
                    }
                } catch (e) { /* silent */ }
            });
        });
    }

    window.Pages.renderCrawlingSprintPage = async function renderCrawlingSprintPage(sprintIndex) {
        await ensureSharedStylesLoaded();
        await ensureArrivalRowsLoaded();
        const contentDiv = document.getElementById('content');
        const sprint = state.crawlingDrills.sprints[sprintIndex];

        // NEW: רענון רשימת פעילים לפני חישוב כפתורים
        if (typeof window.updateActiveRunners === 'function') { try { window.updateActiveRunners(); } catch(e) { /* silent */ } }

        // REPLACED: חישוב רצים פעילים עם נרמול + activeShoulders
        function getActiveRunners() {
            const activeSet = new Set((state.activeShoulders || []).map(sn => String(sn).trim()));
            const seen = new Set();
            return (state.runners || [])
                .filter(r => {
                    if (!r) return false;
                    const sn = String(r.shoulderNumber || '').trim();
                    if (!sn) return false;
                    if (activeSet.size && !activeSet.has(sn)) return false; // הסתמך על רשימת פעילים מחושבת
                    if (state.crawlingDrills?.runnerStatuses?.[sn]) return false; // פרש / מושעה זמנית
                    if (sprint.arrivals.some(a => String(a.shoulderNumber) === sn)) return false; // כבר הגיע
                    if (seen.has(sn)) return false; // כפול
                    seen.add(sn);
                    return true;
                })
                .sort((a,b) => Number(a.shoulderNumber) - Number(b.shoulderNumber));
        }

        const activeRunners = getActiveRunners();

        const headerNav = `
            <div class="heat-bar heat-bar-sprint">
                <div class="heat-bar-row top">
                    <button id="prev-crawling-sprint-btn-inline" class="heat-bar-btn" ${sprintIndex === 0 ? 'disabled' : ''}>קודם</button>
                    <div class="heat-bar-title">מקצה ${sprintIndex + 1}/${CONFIG.MAX_CRAWLING_SPRINTS}</div>
                    <button id="next-crawling-sprint-btn-inline" class="heat-bar-btn">
                        ${sprintIndex < CONFIG.MAX_CRAWLING_SPRINTS - 1 ? 'הבא' : CONFIG.STRETCHER_PAGE_LABEL}
                    </button>
                </div>
            </div>
        `;

        if (!window.ArrivalRows?.render){
            console.error('ArrivalRows not available');
            contentDiv.innerHTML = headerNav + '<div style="padding:12px;color:#f87171">שגיאה בטעינת קומפוננטת ההגעות</div>';
            return;
        }

        const arrivalsBlockHtml = ArrivalRows.render({
            arrivals: sprint.arrivals,
            getComment: sn => state.generalComments?.[sn],
            formatTime: formatTime_no_ms,
            truncate: truncateCommentsSummary,
            maxChars: 20,
            variant: 'float', // היה 'card' – עכשיו כמו בעמוד Heat (קו מפריד בלבד)
            showHeader: true,
            labels: { shoulder:'מספר כתף', comment:'הערות', time:'זמן זחילה' },
            listId: 'arrival-list'
        });

        contentDiv.innerHTML = `
            ${headerNav}
            <div class="timer-center">
              <span id="timer-display" class="timer-display small" aria-live="polite">00:00</span>
            </div>
            <div class="heat-actions">
                <button id="start-btn" class="heat-btn start ${sprint.started ? 'hidden' : ''}">התחל</button>
                <button id="stop-btn" class="heat-btn stop ${!sprint.started || sprint.finished ? 'hidden' : ''}">סיים</button>
                <button id="undo-btn" class="heat-btn undo ${!sprint.started || sprint.finished || sprint.arrivals.length === 0 ? 'hidden' : ''}">בטל הגעה אחרונה</button>
                <button id="edit-order-btn" class="heat-btn edit ${!sprint.finished || sprint.arrivals.length === 0 ? 'hidden' : ''}">ערוך מיקומים</button>
                <button id="cancel-edit-btn" class="heat-btn cancel hidden">ביטול</button>
            </div>

            <div id="runner-buttons-container" class="my-4 ${!sprint.started || sprint.finished ? 'hidden' : ''}">
                <h3 class="text-base md:text-lg font-semibold mb-2 text-center">לחץ על מספר הכתף של הרץ שהגיע</h3>
                <div class="auto-grid">
                    ${activeRunners.map(r => `
                        <button class="runner-btn bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md text-xl md:text-2xl" data-shoulder-number="${r.shoulderNumber}">${r.shoulderNumber}</button>`).join('')}
                </div>
            </div>

            ${arrivalsBlockHtml}
        `;

        // --- ADDED: Comment buttons state helpers (דומה לעמוד heat) ---
        function getCommentMeta(sn){
            const raw = state.generalComments?.[sn];
            const arr = Array.isArray(raw)
                ? raw.filter(c=>c && c.trim())
                : (raw && String(raw).trim() ? [String(raw).trim()] : []);
            const count = arr.length;
            const level = Math.min(count,5); // גם 0 יקבל level-0 (אדום)
            let summary = 'כתוב הערה...';
            if (count){
                const joined = arr.join(' | ').replace(/\s+/g,' ');
                summary = joined.length > 20 ? joined.slice(0,20)+'…' : joined;
            }
            return {summary,count,level,empty:count===0};
        }
        function refreshSingleCommentButton(btn){
            const sn = btn.getAttribute('data-comment-btn');
            if (!sn) return;
            const {summary,count,level,empty} = getCommentMeta(sn);
            for (let i=0;i<=5;i++) btn.classList.remove(`comment-level-${i}`);
            btn.classList.add(`comment-level-${level}`);
            btn.classList.toggle('comment-btn-empty', empty);
            btn.dataset.commentCount = count;
            // עדכון טקסט רק אם צריךכפתורים
            const desired = `${summary} ✎`;
            if (btn.innerHTML !== desired) btn.innerHTML = desired;
        }
        function refreshAllCommentButtons(root=contentDiv){
            root.querySelectorAll('#arrival-list button[data-comment-btn]').forEach(refreshSingleCommentButton);
        }

        // חשיפה גלובלית אופציונלית
        window.CrawlingSprintCommentButtons = window.CrawlingSprintCommentButtons || {};
        window.CrawlingSprintCommentButtons.refresh = refreshAllCommentButtons;

        // רענון ראשוני
        refreshAllCommentButtons();

        // מעקב DOM למניעת "איפוס" אחרי הוספת שורה / שינוי
        const arrivalList = contentDiv.querySelector('#arrival-list');
        if (arrivalList){
            if (window._crawlingSprintCommentObserver) window._crawlingSprintCommentObserver.disconnect();
            window._crawlingSprintCommentObserver = new MutationObserver(muts=>{
                let need = false;
                for (const m of muts){
                    if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)){
                        need = true; break;
                    }
                }
                if (need) requestAnimationFrame(()=>refreshAllCommentButtons(arrivalList));
            });
            window._crawlingSprintCommentObserver.observe(arrivalList,{childList:true,subtree:true});
        }

        // החזרת האייקון (גודל נשלט ב-CSS)
        if (window.ensureTimerIcon) window.ensureTimerIcon();

        (function wrapTimer(){
          if (window._timerWrapped) return;
          const original = window.updateTimerDisplay;
          function formatNoMs(ms){
            const totalSec = Math.floor((ms||0)/1000);
            const m = String(Math.floor(totalSec/60)).padStart(2,'0');
            const s = String(totalSec%60).padStart(2,'0');
            return `${m}:${s}`;
          }
            window.updateTimerDisplay = function(ms){
              if (typeof original === 'function'){
                try { original(ms); } catch{}
              }
              if (window.setTimerValue) setTimerValue(formatNoMs(ms||0));
              else {
                const el = document.getElementById('timer-display');
                if (el){
                  const span = el.querySelector('#timer-value');
                  if (span) span.textContent = formatNoMs(ms||0);
                  else el.textContent = formatNoMs(ms||0);
                }
              }
            };
          window._timerWrapped = true;
        })();

        updateTimerDisplay(
          sprint.arrivals.length
            ? sprint.arrivals[sprint.arrivals.length - 1].finishTime
            : 0
        );

        function adjustActionButtons(){
            const container = contentDiv.querySelector('.heat-actions');
            if(!container) return;
            const visible = [...container.querySelectorAll('.heat-btn:not(.hidden)')];
            container.classList.remove('single','double');
            if (visible.length === 1) container.classList.add('single');
            else if (visible.length === 2) container.classList.add('double');
            visible.forEach(btn=>{
                if (container.classList.contains('single') || container.classList.contains('double')) {
                    btn.style.flex = '1 1 0';
                } else {
                    btn.style.flex = '0 0 auto';
                }
            });
        }

        adjustActionButtons();

        // Timer
        if (sprint.started && !sprint.finished) startTimer();
        else updateTimerDisplay(sprint.arrivals.length > 0 ? sprint.arrivals[sprint.arrivals.length - 1].finishTime : 0, false);

        // Listeners
        document.getElementById('start-btn')?.addEventListener('click', () => {
            handleStart(sprint);
            setTimeout(()=>{
                adjustActionButtons();
                refreshAllCommentButtons();
            },0);
        });
        document.getElementById('stop-btn')?.addEventListener('click', () => {
            confirmStopAndAdvance(sprint, 'crawling');
            setTimeout(()=>{
                adjustActionButtons();
                refreshAllCommentButtons();
            },0);
        });
        document.getElementById('undo-btn')?.addEventListener('click', () => {
            handleUndoArrival(sprint);
            setTimeout(()=>{
                adjustActionButtons();
                refreshAllCommentButtons();
            },0);
        });
        document.getElementById('edit-order-btn')?.addEventListener('click', () => {
            toggleEditOrderMode();
        });

        document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
            cancelEditOrder();
        });

        // Navigation buttons
        document.getElementById('next-crawling-sprint-btn-inline')?.addEventListener('click', () => {
            // NEW: בדיקה שהספרינט הנוכחי הסתיים לפני מעבר לספרינט הבא
            if (!sprint.finished) {
                showModal('ספרינט לא הושלם', 'יש לסיים את הספרינט הנוכחי לפני המעבר לספרינט הבא. לחץ על "סיים" כדי לסיים את הספרינט.');
                return;
            }
            
            if (state.crawlingDrills.currentSprintIndex < CONFIG.MAX_CRAWLING_SPRINTS - 1) {
                state.crawlingDrills.currentSprintIndex = sprintIndex + 1;
                state.currentPage = PAGES.CRAWLING_SPRINT;
            } else {
                state.currentPage = PAGES.STRETCHER_HEAT;
                state.sociometricStretcher.currentHeatIndex = 0;
            }
            saveState(); render();
        });

        document.getElementById('prev-crawling-sprint-btn-inline')?.addEventListener('click', () => {
            // NEW: בדיקה שהספרינט הנוכחי הסתיים לפני מעבר לספרינט הקודם - רק אם התחיל
            if (sprint.started && !sprint.finished) {
                showModal('ספרינט לא הושלם', 'יש לסיים את הספרינט הנוכחי לפני המעבר לספרינט הקודם. לחץ על "סיים" כדי לסיים את הספרינט.');
                return;
            }
            
            if (state.crawlingDrills.currentSprintIndex > 0) {
                state.crawlingDrills.currentSprintIndex = sprintIndex - 1;
                saveState(); render();
            }
        });

        ArrivalRows.attachCommentHandlers(contentDiv, {
            onOpen: async (sn, btn)=>{
                try {
                    await ensureCommentsModalLoaded();
                    window.CommentsModal.open(sn, {
                        originBtn: btn,
                        truncateFn: truncateCommentsSummary,
                        onSave: (val)=>{
                            state.generalComments = state.generalComments || {};
                            state.generalComments[sn] = val;
                            saveState();
                            refreshSingleCommentButton(btn); // במקום רק שינוי טקסט
                        }
                    });
                } catch(e){
                    console.error(e);
                }
            }
        });

        // עדכון אחרי פעולות שמשנות את הרשימה
        ['start-btn','stop-btn','undo-btn'].forEach(id=>{
            contentDiv.getElementById?.(id)?.addEventListener('click', ()=>{
                setTimeout(()=>refreshAllCommentButtons(),0);
            });
        });

        // fallback: אם המודול מפעיל אירוע מותאם אישית
        window.addEventListener('commentsModal:saved', e => {
            const sn = e.detail?.shoulderNumber;
            const value = e.detail?.value;
            if (!sn) return;
            if (value !== undefined){
                state.generalComments = state.generalComments || {};
                state.generalComments[sn] = value;
                saveState();
            }
            const btn = contentDiv.querySelector(`[data-comment-btn="${sn}"]`);
            if (btn){
                btn.innerHTML = `${truncateCommentsSummary(value)} ✎`;
            }
            refreshAllCommentButtons();
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
                originalOrder = JSON.parse(JSON.stringify(sprint.arrivals)); // שמירת גיבוי
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

            // NEW: רינדור מחדש ללא עמודת הערות (הסתרת כפתורי ההערות + כותרת)
            const reHtml = ArrivalRows.render({
                arrivals: sprint.arrivals,
                getComment: sn => state.generalComments?.[sn],
                formatTime: formatTime_no_ms,
                truncate: truncateCommentsSummary,
                maxChars: 20,
                variant: 'float',
                showHeader: true,
                labels: { shoulder:'מספר כתף', comment:'הערות', time:'זמן זחילה' },
                listId: 'arrival-list',
                hideCommentsColumn: true
            });
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = reHtml;
            const newList = tempDiv.querySelector('#arrival-list');
            if (newList && arrivalList) arrivalList.innerHTML = newList.innerHTML;
            arrivalList = document.getElementById('arrival-list');

            // הוספת drag handlers ואייקון גרירה לאחר הרינדור ללא הערות
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
            let arrivalList = document.getElementById('arrival-list');
            const arrivalSection = arrivalList ? arrivalList.closest('.arrival-section') : null;
            editBtn.textContent = 'ערוך מיקומים';
            editBtn.classList.remove('editing');
            cancelBtn.classList.add('hidden');
            arrivalList.classList.remove('editing-order');
            if (arrivalSection) arrivalSection.classList.remove('editing-order');
            originalOrder = null; // ניקוי הגיבוי

            // NEW: רינדור מחדש עם עמודת הערות חוזרת
            const reHtml = ArrivalRows.render({
                arrivals: sprint.arrivals,
                getComment: sn => state.generalComments?.[sn],
                formatTime: formatTime_no_ms,
                truncate: truncateCommentsSummary,
                maxChars: 20,
                variant: 'float',
                showHeader: true,
                labels: { shoulder:'מספר כתף', comment:'הערות', time:'זמן זחילה' },
                listId: 'arrival-list',
                hideCommentsColumn: false
            });
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = reHtml;
            const newList = tempDiv.querySelector('#arrival-list');
            if (newList && arrivalList) {
                arrivalList.innerHTML = newList.innerHTML;
                // השבתת האזנות drag + כפתורי הערות מחדש
                arrivalList.querySelectorAll('.arrival-row').forEach(row => {
                    row.draggable = false;
                    row.querySelector('.drag-handle')?.remove();
                });
                // רענון כפתורי הערות אחרי שחזור
                setTimeout(()=>refreshAllCommentButtons(),0);
            }
        }

        function cancelEditOrder() {
            if (originalOrder) {
                // שחזור הסדר המקורי
                sprint.arrivals = JSON.parse(JSON.stringify(originalOrder));
                saveState();
                
                // יציאה ממצב עריכה ורינדור מחדש
                exitEditMode();
                window.Pages.renderCrawlingSprintPage(state.crawlingDrills.currentSprintIndex);
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
                const times = sprint.arrivals.map(arrival => arrival.finishTime);
                
                // עדכון מערך ההגעות - רק מספרי הכתף זזים, הזמנים נשארים במקום
                const draggedArrival = sprint.arrivals[draggedIndex];
                sprint.arrivals.splice(draggedIndex, 1);
                sprint.arrivals.splice(targetIndex, 0, draggedArrival);
                
                // NEW: החזרת הזמנים למיקומים המקוריים - הזמן קשור למיקום ולא למועמד
                sprint.arrivals.forEach((arrival, index) => {
                    arrival.finishTime = times[index];
                });
                
                // שמירה ורינדור מחדש אבל ללא יציאה ממצב עריכה
                saveState();
                refreshAllCommentButtons();
                
                // רינדור מחדש של הרשימה תוך שמירת מצב עריכה
                setTimeout(() => {
                    const wasEditing = document.getElementById('edit-order-btn').classList.contains('editing');
                    window.Pages.renderCrawlingSprintPage(state.crawlingDrills.currentSprintIndex);
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

        document.getElementById('runner-buttons-container')?.addEventListener('click', (e) => {
            handleAddRunnerToHeat(e, sprint, -1); // -1 for crawling sprint
            
            // עדכון הרשימה של הכפתורים אחרי הוספת רץ
            setTimeout(() => {
                const container = document.getElementById('runner-buttons-container');
                if (container && !sprint.finished) {
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
                refreshAllCommentButtons();
                
                // ADDED: רינדור מחדש של רשימת ההגעות
                const arrivalList = document.getElementById('arrival-list');
                if (arrivalList && window.ArrivalRows?.render) {
                    const newArrivalsHtml = window.ArrivalRows.render({
                        arrivals: sprint.arrivals,
                        getComment: sn => state.generalComments?.[sn],
                        formatTime: formatTime_no_ms,
                        truncate: truncateCommentsSummary,
                        maxChars: 20,
                        variant: 'float',
                        showHeader: true,
                        labels: { shoulder:'מספר כתף', comment:'הערות', time:'זמן זחילה' },
                        listId: 'arrival-list'
                    });
                    
                    // עדכון התוכן בלבד
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = newArrivalsHtml;
                    const newList = tempDiv.querySelector('#arrival-list');
                    if (newList) {
                        arrivalList.innerHTML = newList.innerHTML;
                        refreshAllCommentButtons();
                    }
                }
            }, 100);
        });
    };
})();