(function () {
    window.Pages = window.Pages || {};

    // === פונקציות עזר להוספה/עריכה של מתמודדים ===
    
    /**
     * הצגת חלון הוספת רצים (הועבר מ-app.js)
     */
    function showAddRunnersModal() {
        const backdrop = document.createElement('div');
        backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50';
        backdrop.id = 'add-runners-modal';

        const hasExistingRunners = state.runners && state.runners.length > 0;

        backdrop.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 text-right">
            <h3 class="text-xl font-bold mb-4 text-center text-blue-600 dark:text-blue-400">הוספת מועמדים לקבוצה</h3>
            
            ${!hasExistingRunners ? `
            <div class="space-y-4 mb-6">
                <button id="random-runners-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg">
                    הוספה רנדומלית (${CONFIG.MAX_RUNNERS} מועמדים)
                </button>
                <button id="manual-runners-btn" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg">
                    הוספה ידנית
                </button>
            </div>
            ` : ''}
            
            <!-- אזור הוספה ידנית -->
            <div id="manual-input-area" class="${hasExistingRunners ? '' : 'hidden'}">
                <div class="${hasExistingRunners ? '' : 'border-t pt-4'} mb-4">
                    <div class="flex gap-2 mb-3">
                        <input type="number" id="manual-shoulder-input" placeholder="מספר כתף" 
                               class="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 dark:text-white" min="1" max="999">
                        <button id="add-single-runner" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
                            הוסף
                        </button>
                    </div>
                    <div class="text-center mb-3">
                        <span class="text-sm text-gray-600 dark:text-gray-400">מועמדים בקבוצה: <span id="runner-count">${state.runners.length}</span>/${CONFIG.MAX_RUNNERS}</span>
                    </div>
                    
                    <!-- הצגת רצים שנוספו במודל -->
                    <div id="modal-runner-list" class="max-h-40 overflow-y-auto mb-3">
                        ${state.runners.slice().sort((a, b) => a.shoulderNumber - b.shoulderNumber).map((runner, index) => `
                            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-600 rounded mb-1">
                                <span class="text-sm">${index + 1}.</span>
                                <span class="font-medium">${runner.shoulderNumber}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="flex justify-center gap-4">
                <button id="finish-adding" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                    סיום
                </button>
                <button id="cancel-adding" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
                    ביטול
                </button>
            </div>
            
            <div id="add-error" class="mt-4 text-red-500 text-center text-sm hidden"></div>
        </div>`;

        document.body.appendChild(backdrop);

        const manualArea = document.getElementById('manual-input-area');
        const shoulderInput = document.getElementById('manual-shoulder-input');
        const runnerCountSpan = document.getElementById('runner-count');
        const errorDiv = document.getElementById('add-error');
        const modalRunnerList = document.getElementById('modal-runner-list');

        if (hasExistingRunners) {
            shoulderInput.focus();
        }

        document.getElementById('random-runners-btn')?.addEventListener('click', () => {
            (window.generateRandomRunners || generateRandomRunners)();
            closeModal();
        });

        document.getElementById('manual-runners-btn')?.addEventListener('click', () => {
            manualArea.classList.remove('hidden');
            shoulderInput.focus();
        });

        document.getElementById('add-single-runner').addEventListener('click', addSingleRunner);
        document.getElementById('finish-adding').addEventListener('click', closeModal);
        document.getElementById('cancel-adding').addEventListener('click', closeModal);

        shoulderInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSingleRunner();
            }
        });

        function addSingleRunner() {
            const shoulderNumber = parseInt(shoulderInput.value);

            if (!shoulderNumber || shoulderNumber <= 0) {
                showAddError('יש להזין מספר כתף תקין');
                return;
            }

            if (state.runners.length >= CONFIG.MAX_RUNNERS) {
                showAddError(`לא ניתן להוסיף יותר מ-${CONFIG.MAX_RUNNERS} מועמדים`);
                return;
            }

            if (state.runners.some(r => r.shoulderNumber === shoulderNumber)) {
                showAddError('מספר כתף זה כבר קיים');
                return;
            }

            state.runners.push({ shoulderNumber });
            state.runners.sort((a, b) => a.shoulderNumber - b.shoulderNumber);
            saveState();

            shoulderInput.value = '';
            runnerCountSpan.textContent = state.runners.length;
            updateModalRunnerList();
            errorDiv.classList.add('hidden');
            shoulderInput.focus();
        }

        function updateModalRunnerList() {
            const sortedRunners = state.runners.slice().sort((a, b) => a.shoulderNumber - b.shoulderNumber);
            modalRunnerList.innerHTML = sortedRunners.map((runner, index) => `
                <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-600 rounded mb-1">
                    <span class="text-sm">${index + 1}.</span>
                    <span class="font-medium">${runner.shoulderNumber}</span>
                </div>
            `).join('');
        }

        function showAddError(message) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }

        function closeModal() {
            document.body.removeChild(backdrop);
            render();
        }
    }

    /**
     * הצגת חלון עריכת פרטים מלא (הועבר מ-app.js)
     */
    function showEditDetailsModal() {
        const backdrop = document.createElement('div');
        backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50';
        backdrop.id = 'edit-details-modal';

        backdrop.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl mx-4 text-right max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold mb-4 text-center text-blue-600 dark:text-blue-400">עריכת פרטי קבוצה</h3>
            
            <!-- פרטי מעריך וקבוצה -->
            <div class="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                    <label class="block text-right mb-1 text-sm font-medium">שם המעריך:</label>
                    <input type="text" id="edit-evaluator-name" value="${state.evaluatorName}" 
                           class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-lg text-right bg-white dark:bg-gray-700 dark:text-white">
                </div>
                <div>
                    <label class="block text-right mb-1 text-sm font-medium">מספר קבוצה:</label>
                    <input type="tel" id="edit-group-number" value="${state.groupNumber}" 
                           class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-lg text-right bg-white dark:bg-gray-700 dark:text-white" 
                           inputmode="numeric" pattern="[0-9]*">
                </div>
            </div>
            
            <!-- רשימת רצים לעריכה -->
            <div class="mb-6">
                <h4 class="text-lg font-semibold mb-3 text-center">רצי הקבוצה</h4>
                <div id="edit-runner-list" class="space-y-2 max-h-60 overflow-y-auto"></div>
            </div>
            
            <div class="flex justify-center gap-4">
                <button id="save-edit-details" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                    שמור שינויים
                </button>
                <button id="cancel-edit-details" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
                    ביטול
                </button>
            </div>
            
            <div id="edit-error" class="mt-4 text-red-500 text-center text-sm hidden"></div>
        </div>`;

        document.body.appendChild(backdrop);

        renderEditRunnerList();

        document.getElementById('save-edit-details').addEventListener('click', saveEditDetails);
        document.getElementById('cancel-edit-details').addEventListener('click', () => {
            document.body.removeChild(backdrop);
        });

        function renderEditRunnerList() {
            const listDiv = document.getElementById('edit-runner-list');
            listDiv.innerHTML = state.runners.map((runner, index) => `
                <div class="flex items-center gap-3 p-3 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500 runner-edit-row" data-index="${index}">
                    <span class="w-10 text-center font-semibold text-gray-600 dark:text-gray-300">${index + 1}.</span>
                    <input type="number" class="runner-edit-input flex-1 p-2 border border-gray-300 dark:border-gray-500 rounded-lg text-center text-lg bg-white dark:bg-gray-700 dark:text-white" 
                           value="${runner.shoulderNumber}" data-index="${index}" min="1" max="999" placeholder="מספר כתף">
                    <button class="remove-edit-runner bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors min-w-[60px] flex-shrink-0" data-index="${index}">
                        מחק
                    </button>
                </div>
            `).join('');

            listDiv.querySelectorAll('.remove-edit-runner').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    state.runners.splice(index, 1);
                    saveState();
                    renderEditRunnerList();
                });
            });
        }

        function saveEditDetails() {
            const evaluatorName = document.getElementById('edit-evaluator-name').value.trim();
            const groupNumber = document.getElementById('edit-group-number').value.trim();
            const errorDiv = document.getElementById('edit-error');

            if (!evaluatorName) {
                errorDiv.textContent = 'יש להזין שם מעריך';
                errorDiv.classList.remove('hidden');
                return;
            }

            const runnerInputs = document.querySelectorAll('.runner-edit-input');
            const newRunners = [];
            const usedNumbers = new Set();

            for (const input of runnerInputs) {
                const shoulderNumber = parseInt(input.value);
                if (!shoulderNumber || shoulderNumber <= 0) {
                    errorDiv.textContent = 'כל מספרי הכתף חייבים להיות מספרים חיוביים';
                    errorDiv.classList.remove('hidden');
                    return;
                }
                if (usedNumbers.has(shoulderNumber)) {
                    errorDiv.textContent = 'נמצאו מספרי כתף כפולים';
                    errorDiv.classList.remove('hidden');
                    return;
                }
                usedNumbers.add(shoulderNumber);
                newRunners.push({ shoulderNumber });
            }

            state.evaluatorName = evaluatorName;
            state.groupNumber = groupNumber;
            if (!groupNumber) {
                state.__justResetGroupNumber = true;
                localStorage.setItem('groupNumberCleared','1');
            } else {
                delete state.__justResetGroupNumber;
                localStorage.removeItem('groupNumberCleared');
            }

            try {
                const authRaw = localStorage.getItem('gibushAuthState');
                if (authRaw) {
                    const session = JSON.parse(authRaw);
                    if (session.authState) {
                        session.authState.evaluatorName = evaluatorName;
                        if (groupNumber) session.authState.groupNumber = groupNumber; else delete session.authState.groupNumber;
                        localStorage.setItem('gibushAuthState', JSON.stringify(session));
                    }
                }
            } catch(e){ console.warn('authState update failed', e); }

            state.runners = newRunners.sort((a, b) => a.shoulderNumber - b.shoulderNumber);
            saveState();

            document.body.removeChild(backdrop);
            render();
        }
    }

    /**
     * הצגת מודאל עריכת פרטים בסיסיים (הועבר מ-app.js)
     */
    function showEditBasicDetailsModal() {
        const backdrop = document.createElement('div');
        backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50';
        backdrop.id = 'edit-basic-details-modal';
        const groupValue = state.groupNumber || '';
        backdrop.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 text-right">
            <h3 class="text-xl font-bold mb-4 text-center text-blue-600 dark:text-blue-400">עריכת פרטי הערכה</h3>
            <div class="space-y-4 mb-6">
                <div>
                    <label class="block text-right mb-1 text-sm font-medium">שם המעריך:</label>
                    <input type="text" id="edit-basic-evaluator-name" value="${state.evaluatorName}" 
                           class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-lg text-right bg-white dark:bg-gray-700 dark:text-white">
                </div>
                <div>
                    <label class="block text-right mb-1 text-sm font-medium">מספר קבוצה:</label>
                    <input type="tel" id="edit-basic-group-number" value="${groupValue}" 
                           class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-lg text-right bg-white dark:bg-gray-700 dark:text-white" 
                           placeholder="מספר קבוצה" inputmode="numeric" pattern="[0-9]*">
                </div>
            </div>
            <div class="flex justify-center gap-4">
                <button id="save-basic-details" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                    שמור שינויים
                </button>
                <button id="cancel-basic-details" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
                    ביטול
                </button>
            </div>
            <div id="basic-edit-error" class="mt-4 text-red-500 text-center text-sm hidden"></div>
        </div>`;
        document.body.appendChild(backdrop);
        document.getElementById('save-basic-details').addEventListener('click', () => {
            const evaluatorName = document.getElementById('edit-basic-evaluator-name').value.trim();
            const groupNumber = document.getElementById('edit-basic-group-number').value.trim();
            const errorDiv = document.getElementById('basic-edit-error');
            if (!evaluatorName) {
                errorDiv.textContent = 'יש למלא את שם המעריך';
                errorDiv.classList.remove('hidden');
                return;
            }
            state.evaluatorName = evaluatorName;
            state.groupNumber = groupNumber;
            if (!groupNumber) {
                localStorage.setItem('groupNumberCleared','1');
            } else {
                localStorage.removeItem('groupNumberCleared');
            }
            try {
                const authRaw = localStorage.getItem('gibushAuthState');
                if (authRaw) {
                    const session = JSON.parse(authRaw);
                    if (session.authState) {
                        session.authState.evaluatorName = evaluatorName;
                        if (groupNumber) session.authState.groupNumber = groupNumber; else delete session.authState.groupNumber;
                        localStorage.setItem('gibushAuthState', JSON.stringify(session));
                    }
                }
            } catch(e){ console.warn('failed to update authState', e); }
            saveState();
            document.body.removeChild(backdrop);
            render();
        });
        document.getElementById('cancel-basic-details').addEventListener('click', () => {
            document.body.removeChild(backdrop);
        });
    }

    // חשיפת הפונקציות גלובלית
    window.showAddRunnersModal = showAddRunnersModal;
    window.showEditDetailsModal = showEditDetailsModal;
    window.showEditBasicDetailsModal = showEditBasicDetailsModal;

    // פונקציה גלובלית לעדכון רשימת הפעילים בלבד
    window.updateActiveRunners = function updateActiveRunners() {
        const inactivePattern = /(retir|withdraw|dropped|drop\s*out|quit|inactive|not.?active|non.?active|eliminated|פרש|פרשה|פרישה|לא.?פעיל|עזב|עזבה|הוסר|הוסרה|נשר|נשרה|נשירה|לא\s*ממשיך|לא\s*משתתף|הודח|הודחה)/i;
        const runners = Array.isArray(window.state?.runners) ? window.state.runners : [];
        const runnerStatuses = state?.crawlingDrills?.runnerStatuses || {}; // NEW: מפה חיצונית

        const active = runners.filter(r => {
            if (!r) return false;
            const sn = r.shoulderNumber;
            if (sn == null || sn === '') return false;
            if (runnerStatuses[sn]) return false; // NEW: אם מסומן חיצונית כלא פעיל
            if (r.active === false || r.isActive === false) return false;
            if (r.inactive || r.notActive || r.retired || r.isRetired || r.withdrawn || r.withdrew ||
                r.dropped || r.droppedOut || r.quit || r.eliminated || r.removed || r.isRemoved ||
                r.hidden || r.disabled) return false;
            // טקסטים אפשריים
            const statusStr = [r.status, r.state, r.phase, r.reason, r.note, r.notes, r.comment, r.description, r.label]
                .filter(Boolean).join(' ');
            if (statusStr && inactivePattern.test(statusStr)) return false;
            return true;
        });
        // הסרת כפולים לפי מספר כתף
        const seen = new Set();
        window.state.activeRunners = active.filter(r => {
            const key = String(r.shoulderNumber).trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        window.state.activeShoulders = window.state.activeRunners.map(r => String(r.shoulderNumber).trim());
        // NEW: אירוע שינוי רשימת פעילים (רק אם השתנה)
        try {
            const prev = window.state.__lastActiveShoulders || [];
            const now = window.state.activeShoulders;
            if (JSON.stringify(prev) !== JSON.stringify(now)) {
                window.state.__lastActiveShoulders = [...now];
                window.dispatchEvent(new CustomEvent('activeRunnersChanged', { detail: { activeRunners: window.state.activeRunners, activeShoulders: now } }));
            }
        } catch (e) { /* silent */ }
    };

    // NEW: מצב עריכה אינלייני
    let runnerCardEdit = {
        active: false,
        original: null
    };

    // הוספת אזהרת יציאה ללא שמירה (רק פעם אחת)
    if (!window.__runnerCardEditUnloadGuard__) {
        window.__runnerCardEditUnloadGuard__ = true;
        window.addEventListener('beforeunload', (e) => {
            if (runnerCardEdit.active) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
        // UPDATED: allow internal edit actions (delete, inputs, save/cancel) without prompt
        document.addEventListener('click', (e) => {
            if (!runnerCardEdit.active) return;
            const actionable = e.target.closest('a, button, [data-page]');
            if (!actionable) return;

            // Allow any control inside edit scope (runner list or edit bar) or explicit allowed buttons
            if (
                actionable.id === 'save-inline-runners-btn' ||
                actionable.id === 'cancel-inline-runners-btn' ||
                actionable.id === 'edit-runners-btn' ||
                actionable.id === 'add-runner-inline-btn' ||  // ADDED: מתיר לחיצה על הוספת מועמד
                actionable.classList.contains('runner-delete-btn') ||
                actionable.closest('#runner-list') ||
                actionable.closest('#runner-inline-edit-bar')
            ) {
                return; // no navigation protection needed
            }

            // For navigation / outside actions
            if (!confirm('יש שינויים שלא נשמרו. לצאת בלי לשמור?')) {
                e.preventDefault();
                e.stopPropagation();
            } else {
                runnerCardEdit.active = false;
            }
        }, true);
    }

    // NEW: פונקציית שדרוג אינפוטים למקלדת מספרים + סינון
    function applyNumericEnhancements(root=document){
        const selector = 'input[data-shoulder-input], input.runner-inline-input, input[id*="group"], input[name*="group"], input[data-numeric]';
        root.querySelectorAll(selector).forEach(inp=>{
            if (inp.__numericEnhanced) return;
            inp.__numericEnhanced = true;
            inp.setAttribute('inputmode','numeric');
            inp.setAttribute('pattern','[0-9]*');
            inp.setAttribute('autocomplete','off');
            inp.setAttribute('enterkeyhint','done');
            // שימוש ב-tel מעלה הסתברות למקלדת מספרים במכשירים שונים
            if (inp.type !== 'number') inp.type = 'tel';
            inp.addEventListener('input',()=> {
                const v = inp.value;
                const digits = v.replace(/\D+/g,'');
                if (v !== digits) inp.value = digits;
                // מניעת 0 (לא לאפשר מספר כתף 0)
                if (inp.value === '0') inp.value = '';
            });
        });
    }

    // NEW: עטיפה להבטחת מקלדת מספרים רק עבור מספר קבוצה (גם בעריכת פרטים)
    if (!window.__groupNumberNumericPatch){
        window.__groupNumberNumericPatch = true;

        function enforceGroupNumberNumeric(){
            const selectors = [
                '#group-number-input',
                'input[name="groupNumber"]',
                'input[id*="group-number"]',
                'input[id*="groupNum"]',
                'input[name*="groupNum"]',
                'input[name*="group-number"]'
            ];
            selectors.forEach(sel=>{
                document.querySelectorAll(sel).forEach(inp=>{
                    inp.dataset.numeric = '1';   // כדי שייכלל בסלקטור המקורי
                });
            });
            applyNumericEnhancements(document);
        }

        // עטיפת המודאל אם קיים
        const originalShowEdit = window.showEditBasicDetailsModal;
        if (typeof originalShowEdit === 'function'){
            window.showEditBasicDetailsModal = function(){
                const r = originalShowEdit.apply(this, arguments);
                // ניסיונות מאוחרים כדי לוודא שה-DOM נטען
                requestAnimationFrame(()=>{
                    enforceGroupNumberNumeric();
                    setTimeout(enforceGroupNumberNumeric, 40);
                    setTimeout(enforceGroupNumberNumeric, 150);
                });
                return r;
            };
        }

        // גיבוי: לחיצה על כפתור "ערוך פרטים"
        document.addEventListener('click', e=>{
            if (e.target && e.target.id === 'edit-details-btn'){
                setTimeout(enforceGroupNumberNumeric, 30);
                setTimeout(enforceGroupNumberNumeric, 140);
            }
        });

        // גיבוי נוסף: בעת פתיחת המודאל הראשוני (כבר מטופל ע"י ה-MutationObserver, אך מחזקים)
        document.addEventListener('DOMContentLoaded', () => {
            enforceGroupNumberNumeric();
        });
    }

    // NEW: צופה לפתיחת מודאל ההגדרות הראשוני ומחיל מקלדת מספרים
    if (!window.__initModalNumericObserver){
        window.__initModalNumericObserver = true;
        const obs = new MutationObserver(muts=>{
            for (const m of muts){
                m.addedNodes.forEach(node=>{
                    if (!(node instanceof HTMLElement)) return;
                    // נזהה מודאל לפי מחלקה / id משוערים
                    if (node.id?.includes('initial') || node.classList.contains('modal') || node.querySelector('[data-initial-setup]')){
                        applyNumericEnhancements(node);
                    }
                    // גם אם נוספו אינפוטים בודדים
                    if (node.tagName === 'INPUT'){
                        applyNumericEnhancements(node.parentElement||document);
                    }
                });
            }
        });
        obs.observe(document.documentElement,{subtree:true, childList:true});
    }

    // Fallback: generateRandomRunners אם לא הוגדרה (במקרה של סדר טעינה שונה)
    if (!window.generateRandomRunners) {
        window.generateRandomRunners = function(count){
            try {
                const existing = new Set(state.runners.map(r => Number(r.shoulderNumber)));
                const maxAddable = Math.max(0, CONFIG.MAX_RUNNERS - existing.size);
                const toAdd = Math.min(maxAddable, count || maxAddable);
                if (toAdd <= 0) { console.warn('generateRandomRunners fallback: nothing to add'); return; }
                const pool = [];
                for (let n = 1; n <= 999; n++) if (!existing.has(n)) pool.push(n);
                for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
                const selected = pool.slice(0, toAdd).map(n => ({ shoulderNumber: n }));
                state.runners = state.runners.concat(selected).sort((a,b)=>a.shoulderNumber-b.shoulderNumber);
                saveState?.();
            } catch(e){ console.error('Fallback generateRandomRunners failed', e); }
        }
    }

    window.Pages.renderRunnersPage = function renderRunnersPage() {
        // REMOVED: מחיקת קביעת כותרת
        // headerTitle.textContent = 'ניהול קבוצה';

        // עדכון לפני רינדור (שיהיה זמין ל quick-comments)
        window.updateActiveRunners();

        const todayDate = new Date().toLocaleDateString('he-IL');
        const currentTime = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

        const hasRunners = Array.isArray(state.runners) && state.runners.some(r => r && String(r.shoulderNumber).trim() !== ''); // FIXED: רק מתמודדים עם מספר תקף
        const manualAddMode = state.__manualAddMode === true;

        contentDiv.innerHTML = `
<!-- פרטי הערכה – עיצוב חדש מצומצם -->
<div class="evaluation-info max-w-sm mx-auto mb-5" id="evaluation-info">
  <button id="edit-details-btn" ${state.competitionStarted ? 'disabled' : ''}>${state.competitionStarted ? 'נעול' : 'ערוך'}</button>
  <h2 class="eval-title">פרטי ההערכה</h2>
  <div class="eval-inline">
    <div class="eval-field evaluator">
      <span class="pill-label">שם המעריך</span>
      <span class="pill-value">${state.evaluatorName || 'לא הוזן'}</span>
    </div>
    <span class="eval-sep" aria-hidden="true"></span>
    <div class="eval-field group">
      <span class="pill-label">מספר קבוצה</span>
      <span class="pill-value">${state.groupNumber || 'לא הוזן'}</span>
    </div>
  </div>
  <div class="eval-meta">
    <span class="meta-item"><span class="mi-label">תאריך</span>${todayDate}</span>
    <span class="meta-sep"></span>
    <span class="meta-item"><span class="mi-label">שעה</span>${currentTime}</span>
  </div>
</div>

${hasRunners ? `
    <!-- רשימת מועמדים קיימים עם כפתור עריכה -->
    <div class="relative mb-6 ${manualAddMode ? 'opacity-40 pointer-events-none' : ''}">
        <h2 class="text-xl font-semibold mb-4 text-center text-blue-500">מועמדי הקבוצה (${state.runners.length})</h2>
        <div class="mb-2 text-center relative">
            <span class="text-lg font-semibold text-gray-700 dark:text-gray-300">מספרי כתף</span>
            ${!manualAddMode ? `<button id="edit-runners-btn" class="absolute top-0 left-0 border border-orange-400 text-orange-600 hover:bg-orange-50 dark:border-orange-500 dark:text-orange-400 dark:hover:bg-orange-900/20 font-medium py-0.5 px-2 rounded text-xs transition-colors duration-200 ${state.competitionStarted ? 'opacity-50 cursor-not-allowed border-gray-400 text-gray-400' : ''}" ${state.competitionStarted ? 'disabled' : ''}>${state.competitionStarted ? 'נעול' : 'ערוך'}</button>` : ''}
        </div>
        <div id="runner-list" class="space-y-2"></div>
        <div class="flex justify-center mt-6">
            <button id="add-runner-inline-btn" class="bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-3 px-6 rounded-lg shadow-lg w-full" style="display: none;">
                + הוסף מועמד
            </button>
        </div>
    </div>
    ${!state.competitionStarted && !manualAddMode ? `
    <div class="flex justify-center mt-6">
        <button id="start-heats-btn" class="bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-3 px-6 rounded-lg shadow-lg w-full">
            התחל מקצים
        </button>
    </div>` : ''}
    ${state.competitionStarted && !manualAddMode ? `
    <div class="flex justify-center mt-6">
        <div class="competition-active-box bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-4 text-center">
            <div class="text-blue-700 dark:text-blue-300 font-semibold mb-2">🏃‍♂️ התחרות פעילה</div>
            <div class="text-sm text-blue-600 dark:text-blue-400">המקצים התחילו - לא ניתן לערוך מתמודדים</div>
        </div>
    </div>` : ''}
` : state.__autoEnterEditRunners ? `
    <div class="relative mb-6">
        <h2 class="text-xl font-semibold mb-4 text-center text-blue-500">מועמדי הקבוצה (0)</h2>
        <div id="runner-list" class="space-y-2"></div>
        <div class="flex justify-center mt-6">
            <button id="add-runner-inline-btn" class="bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-3 px-6 rounded-lg shadow-lg w-full" style="display: none;">+ הוסף מועמד</button>
        </div>
    </div>
` : `
    <div id="no-runners-actions" class="mb-6 flex flex-col gap-4 max-w-md mx-auto">
        <div class="text-center text-gray-600 dark:text-gray-300 text-sm mb-1">בחר שיטת הוספה למתמודדים</div>
        <button id="no-runners-random-btn" class="flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl shadow text-lg">
            <span class="text-2xl">🎲</span>
            <span>הוספה רנדומלית (${CONFIG.MAX_RUNNERS})</span>
        </button>
        <button id="no-runners-manual-btn" class="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-xl shadow text-lg">
            <span class="text-2xl">✍️</span>
            <span>הוספה ידנית</span>
        </button>
    </div>
`}

<div id="runner-error" class="mt-4 text-red-500 text-center font-bold hidden"></div>
`;

        // רענון סרגל הערות מהירות לאחר חישוב פעילים
        if (window.QuickComments?.renderBar && document.getElementById('quick-comment-bar-container')) {
            window.QuickComments.renderBar(true);
        }

        // רינדור ריבועי מתמודדים (ללא עיצוב inline - רק קלאסים)
        if (state.runners && state.runners.length > 0) {
            const runnerListEl = document.getElementById('runner-list');
            if (runnerListEl) {
                const runnerStatuses = state?.crawlingDrills?.runnerStatuses || {};
                const sorted = [...state.runners]
                    .filter(r => r && r.shoulderNumber !== undefined && r.shoulderNumber !== null && String(r.shoulderNumber).trim() !== '')
                    .sort((a, b) => Number(a.shoulderNumber) - Number(b.shoulderNumber));

                const cardsHtml = sorted.map(r => {
                    const sn = r.shoulderNumber;
                    const status = runnerStatuses[sn];
                    let cardClass, statusBadge = '';

                    if (status === 'retired') {
                        cardClass = 'bg-gradient-to-br from-rose-50 to-rose-100';
                        statusBadge = `<div class="text-rose-700 dark:text-rose-300">פרש</div>`;
                    } else if (status === 'temp_removed') {
                        cardClass = 'bg-gradient-to-br from-amber-50 to-amber-100';
                        statusBadge = `<div class="text-amber-700 dark:text-amber-300">בדיקה</div>`;
                    } else {
                        cardClass = '';
                        statusBadge = `<div class="text-emerald-600 dark:text-emerald-400">פעיל</div>`;
                    }

                    return `
                    <div class="runners-card ${cardClass}">
                        <div class="text-xl">${sn}</div>
                        ${statusBadge}
                    </div>`;
                }).join('');

                runnerListEl.innerHTML = `
                    <div class="auto-grid stretcher-grid">
                        ${cardsHtml}
                    </div>`;
            }
        }

        // לאחר יצירת הגריד נוסיף סרגל עריכה (אם יש רצים)
        if (state.runners && state.runners.length > 0) {
            const runnerListEl = document.getElementById('runner-list');
            if (runnerListEl && !document.getElementById('runner-inline-edit-bar')) {
                runnerListEl.insertAdjacentHTML('beforebegin', `
                    <div id="runner-inline-edit-bar" class="hidden flex flex-wrap justify-center gap-2 mb-3">
                        <button id="save-inline-runners-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-lg text-sm">שמור</button>
                        <button id="cancel-inline-runners-btn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-5 rounded-lg text-sm">בטל</button>
                    </div>
                    <div id="runner-inline-edit-error" class="hidden text-center text-red-600 font-semibold text-sm mb-2"></div>
                `);
            }
        }

        // --- פונקציות מצב עריכה אינלייני ---
        function enterInlineEditMode() {
            if (runnerCardEdit.active) return;
            document.body.classList.add('editing-runners');
            // יצירת סרגל עריכה אם לא קיים (גם ללא מתמודדים)
            const runnerListEl = document.getElementById('runner-list');
            let createdBar = false;
            if (runnerListEl && !document.getElementById('runner-inline-edit-bar')) {
                runnerListEl.insertAdjacentHTML('beforebegin', `
                    <div id="runner-inline-edit-bar" class="flex flex-wrap justify-center gap-2 mb-3">
                        <button id="save-inline-runners-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-lg text-sm">שמור</button>
                        <button id="cancel-inline-runners-btn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-5 rounded-lg text-sm">בטל</button>
                    </div>
                    <div id="runner-inline-edit-error" class="hidden text-center text-red-600 font-semibold text-sm mb-2"></div>
                `);
                createdBar = true;
            }
            // יצירת גריד ריק אם אין (ללא מתמודדים קיימים)
            let grid = document.querySelector('#runner-list .auto-grid');
            if (!grid) {
                const runnerListEl = document.getElementById('runner-list');
                if (runnerListEl) {
                    runnerListEl.innerHTML = '<div class="auto-grid stretcher-grid"></div>';
                    grid = runnerListEl.querySelector('.auto-grid');
                }
            }
            if (!grid) return;
            // NEW: יצירת כרטיס אינפוט ראשון אוטומטית אם אין מתמודדים כלל
            if (!grid.querySelector('.runners-card')) {
                const firstCard = document.createElement('div');
                firstCard.className = 'runners-card border rounded-xl shadow-sm hover:shadow-md p-3 flex flex-col items-center justify-center transition-all duration-300 bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60';
                firstCard.innerHTML = `
                    <div class="text-xl font-bold text-gray-800 dark:text-gray-100 leading-none">
                        <div class="shoulder-input-wrapper flex items-center justify-center w-full">
                            <input data-shoulder-input type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done"
                                   class="runner-inline-input max-w-[72px] w-[72px] text-center font-bold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-base py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                   value="" data-original="" placeholder="מספר" />
                        </div>
                    </div>
                    <button type="button" class="runner-delete-btn" aria-label="מחק מתמודד חדש">מחק</button>`;
                grid.appendChild(firstCard);
                applyNumericEnhancements(firstCard);
                // פוקוס מיידי על האינפוט
                setTimeout(() => { firstCard.querySelector('.runner-inline-input')?.focus(); }, 0);
            }
            runnerCardEdit.original = JSON.parse(JSON.stringify(state.runners || []));
            runnerCardEdit.active = true;
            const addRunnerBtn = document.getElementById('add-runner-inline-btn');
            if (addRunnerBtn) addRunnerBtn.style.display = '';
            // המרה של כרטיסים קיימים לאינפוטים
            grid.querySelectorAll('.runners-card').forEach(card => {
                const numEl = card.querySelector('.text-xl');
                if (!numEl) return;
                const current = numEl.textContent.trim();
                numEl.innerHTML = `
                    <div class="shoulder-input-wrapper flex items-center justify-center w-full">
                        <input data-shoulder-input type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done"
                               class="runner-inline-input max-w-[72px] w-[72px] text-center font-bold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-base py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                               value="${current}" data-original="${current}" />
                    </div>`;
                card.querySelectorAll('.runner-edit-status, .runner-delete-btn').forEach(el => el.remove());
                card.insertAdjacentHTML('beforeend', `<button type="button" class="runner-delete-btn" aria-label="מחק מתמודד">מחק</button>`);
            });
            applyNumericEnhancements(grid);
            // רישום מאזינים לסרגל שנוצר עכשיו
            if (createdBar) {
                const saveBtn = document.getElementById('save-inline-runners-btn');
                const cancelBtn = document.getElementById('cancel-inline-runners-btn');
                saveBtn?.addEventListener('click', () => exitInlineEditMode(true));
                cancelBtn?.addEventListener('click', () => { if (!confirm('לבטל שינויים?')) return; exitInlineEditMode(false); });
            }
            const existingBar = document.getElementById('runner-inline-edit-bar');
            if (existingBar) {
                existingBar.classList.remove('hidden'); // הצגת הסרגל הקיים
            }
            // הסתרת כפתור התחלת מקצים בזמן עריכה
            const startHeatsBtn = document.getElementById('start-heats-btn');
            if (startHeatsBtn) startHeatsBtn.style.display = 'none';
        }
        // חשיפה גלובלית להפעלה מבחוץ (למשל אחרי לחיצה על הוספה ידנית במודאל)
        window.enterRunnersEditMode = enterInlineEditMode;

        function exitInlineEditMode(save) {
            const errorEl = document.getElementById('runner-inline-edit-error');
            if (save) {
                const inputs = Array.from(document.querySelectorAll('.runner-inline-input'));
                let values = inputs.map(i => i.value.trim()).filter(v => v !== '');
                // NEW: חסימת 0
                if (values.some(v => v === '0' || Number(v) === 0)) { showError('מספר 0 אינו מותר'); return; }
                const duplicates = values.filter((v, i) => values.indexOf(v) !== i);
                if (values.length === 0) { showError('נדרש לפחות מספר אחד'); return; }
                if (duplicates.length) { showError('יש כפילויות: ' + [...new Set(duplicates)].join(', ')); return; }
                const mapped = inputs.map((input) => {
                    const originalObj = (runnerCardEdit.original || []).find(r => String(r.shoulderNumber) === input.dataset.original);
                    if (originalObj) return { ...originalObj, shoulderNumber: input.value.trim() };
                    return { shoulderNumber: input.value.trim() };
                });
                // NEW: זיהוי מחוקים
                const originalSet = new Set((runnerCardEdit.original || []).map(r => String(r.shoulderNumber)));
                const newSet = new Set(mapped.map(r => String(r.shoulderNumber)));
                const removed = [...originalSet].filter(x => !newSet.has(x));

                // --- mapChanges: old -> new (שינויי מספר) ---
                const oldNums = inputs.map(i => i.dataset.original);
                const newNums = inputs.map(i => i.value.trim());
                const mapChanges = {};
                for (let i = 0; i < oldNums.length; i++) {
                    const o = oldNums[i];
                    const n = newNums[i];
                    if (o && n && o !== n) mapChanges[o] = n;
                }

                // REMAP בסיסי למבנים שכבר טופלו בעבר (שומרים תאימות לקוד הישן)
                (function migrateShoulderKeyedData() {
                    if (!Object.keys(mapChanges).length) return;
                    function remapObject(obj) { if (!obj || typeof obj !== 'object') return obj; const out = {}; Object.keys(obj).forEach(k => { const newK = mapChanges[k] || k; out[newK] = obj[k]; }); return out; }
                    if (state.generalComments) state.generalComments = remapObject(state.generalComments);
                    if (state.manualScores) state.manualScores = remapObject(state.manualScores);
                    if (state.quickComments) state.quickComments = remapObject(state.quickComments);
                    if (state.crawlingDrills && state.crawlingDrills.runnerStatuses) state.crawlingDrills.runnerStatuses = remapObject(state.crawlingDrills.runnerStatuses);
                })();

                // NEW: התאמת כל שאר המבנים כדי למנוע "שבירת" ציונים לאחר עריכה
                (function reconcileOtherStructures() {
                    const hasChanges = Object.keys(mapChanges).length > 0;
                    const removedSet = new Set(removed);
                    if (!hasChanges && !removed.length) return;

                    // עזר להחלפת מספר כתף באיבר יחיד
                    const swapValue = (v) => mapChanges[v] ? mapChanges[v] : v;

                    // 1. מקצי ספרינט (heats.arrivals)
                    if (Array.isArray(state.heats)) {
                        state.heats.forEach(h => {
                            if (Array.isArray(h.arrivals)) {
                                h.arrivals = h.arrivals.filter(a => a && !removedSet.has(String(a.shoulderNumber)));
                                h.arrivals.forEach(a => { a.shoulderNumber = swapValue(String(a.shoulderNumber)); });
                            }
                            // אם קיימים שדות עזר נוספים (participants/runners)
                            if (Array.isArray(h.runners)) {
                                h.runners = h.runners.filter(sn => !removedSet.has(String(sn))).map(sn => swapValue(String(sn)));
                            }
                            if (Array.isArray(h.participants)) {
                                h.participants = h.participants.filter(sn => !removedSet.has(String(sn))).map(sn => swapValue(String(sn)));
                            }
                        });
                    }

                    // 2. ספרינטים בזחילה
                    if (state.crawlingDrills && Array.isArray(state.crawlingDrills.sprints)) {
                        state.crawlingDrills.sprints.forEach(s => {
                            if (Array.isArray(s.arrivals)) {
                                s.arrivals = s.arrivals.filter(a => a && !removedSet.has(String(a.shoulderNumber)));
                                s.arrivals.forEach(a => { a.shoulderNumber = swapValue(String(a.shoulderNumber)); });
                            }
                        });
                    }

                    // 3. נשיאת שק (sackCarriers + activeSackCarriers)
                    if (state.crawlingDrills) {
                        const carriers = state.crawlingDrills.sackCarriers || {};
                        if (carriers && (hasChanges || removed.length)) {
                            const newCarriers = {};
                            Object.keys(carriers).forEach(k => {
                                if (removedSet.has(k)) return; // דילוג על נמחקים
                                const newK = mapChanges[k] || k;
                                newCarriers[newK] = carriers[k];
                            });
                            state.crawlingDrills.sackCarriers = newCarriers;
                        }
                        if (Array.isArray(state.crawlingDrills.activeSackCarriers)) {
                            state.crawlingDrills.activeSackCarriers = state.crawlingDrills.activeSackCarriers
                                .filter(sn => !removedSet.has(String(sn)))
                                .map(sn => swapValue(String(sn)));
                        }
                        // הערות זחילה
                        if (state.crawlingDrills.comments) {
                            const newComments = {};
                            Object.keys(state.crawlingDrills.comments).forEach(k => {
                                if (removedSet.has(k)) return;
                                const nk = mapChanges[k] || k;
                                newComments[nk] = state.crawlingDrills.comments[k];
                            });
                            state.crawlingDrills.comments = newComments;
                        }
                    }

                    // 4. אלונקה סוציומטרית
                    if (state.sociometricStretcher && Array.isArray(state.sociometricStretcher.heats)) {
                        state.sociometricStretcher.heats.forEach(sh => {
                            if (sh && sh.selections) {
                                const newSel = {};
                                Object.keys(sh.selections).forEach(k => {
                                    if (removedSet.has(k)) return;
                                    const nk = mapChanges[k] || k;
                                    newSel[nk] = sh.selections[k];
                                });
                                sh.selections = newSel;
                            }
                            if (Array.isArray(sh.participants)) {
                                sh.participants = sh.participants.filter(sn => !removedSet.has(String(sn))).map(sn => swapValue(String(sn)));
                            }
                        });
                    }

                    // 5. sprintResults (חישוב קודם) – נמחק או ממופה
                    if (state.sprintResults) {
                        const newSprintResults = {};
                        Object.keys(state.sprintResults).forEach(k => {
                            if (removedSet.has(k)) return;
                            const nk = mapChanges[k] || k;
                            const entry = state.sprintResults[k];
                            if (entry && Array.isArray(entry.heatResults)) {
                                entry.heatResults.forEach(hr => { hr.shoulderNumber = swapValue(String(hr.shoulderNumber)); });
                            }
                            newSprintResults[nk] = entry;
                        });
                        state.sprintResults = newSprintResults;
                    }

                    // 6. ניקוי מבנים כלליים נוספים שכבר טופלו בחלק קודם (במידה ונשארו שאריות) - ביטחון
                    function pruneKeys(obj) { if (!obj) return; for (const k of Object.keys(obj)) { if (removedSet.has(k)) delete obj[k]; } }
                    pruneKeys(state.generalComments);
                    pruneKeys(state.manualScores);
                    pruneKeys(state.quickComments);

                    // 7. הרצת חישוב ציונים מחדש אחרי רה-מיפוי (מונע ציונים שגויים)
                    if (typeof window.updateAllSprintScores === 'function') {
                        try { window.updateAllSprintScores(); } catch(e){ console.warn('updateAllSprintScores failed after reconcile', e); }
                    }
                    // NEW: חישוב חוזר לציוני זחילה ואלונקות (אין מטמון אבל מפעיל לבדיקה וסטטוס)
                    try {
                        (state.runners||[]).forEach(r=>{
                            // הפעלות כדי לוודא שמתרחשים חישובים/אימותים
                            if (typeof window.calculateCrawlingFinalScore==='function') window.calculateCrawlingFinalScore(r);
                            if (typeof window.calculateStretcherFinalScore==='function') window.calculateStretcherFinalScore(r);
                        });
                    } catch(e){ console.warn('post-edit crawl/stretcher recompute failed', e); }
                })();

                // NEW: פונקציה לאכיפת טיפוס מספרי לכל מספרי הכתף בכל המבנים
                function normalizeNumericShoulders(){
                    try {
                        state.runners?.forEach(r=>{ r.shoulderNumber = Number(r.shoulderNumber); });
                        state.heats?.forEach(h=> h.arrivals?.forEach(a=> a.shoulderNumber = Number(a.shoulderNumber)));
                        state.crawlingDrills?.sprints?.forEach(s=> s.arrivals?.forEach(a=> a.shoulderNumber = Number(a.shoulderNumber)));
                        state.sociometricStretcher?.heats?.forEach(sh=> {
                            if (Array.isArray(sh.participants)) sh.participants = sh.participants.map(sn=>Number(sn));
                            if (sh.selections){
                                const newSel={};
                                Object.keys(sh.selections).forEach(k=> { newSel[Number(k)] = sh.selections[k]; });
                                sh.selections = newSel;
                            }
                        });
                        ['generalComments','manualScores','quickComments'].forEach(key=>{
                            if(state[key]){
                                const newObj={};
                                Object.keys(state[key]).forEach(k=>{ newObj[Number(k)] = state[key][k]; });
                                state[key]=newObj;
                            }
                        });
                        if (state.crawlingDrills?.runnerStatuses){
                            const ns={}; Object.keys(state.crawlingDrills.runnerStatuses).forEach(k=> ns[Number(k)] = state.crawlingDrills.runnerStatuses[k]);
                            state.crawlingDrills.runnerStatuses = ns;
                        }
                        if (state.crawlingDrills?.sackCarriers){
                            const sc={}; Object.keys(state.crawlingDrills.sackCarriers).forEach(k=> sc[Number(k)] = state.crawlingDrills.sackCarriers[k]);
                            state.crawlingDrills.sackCarriers = sc;
                        }
                        if (state.sprintResults){
                            const sr={};
                            Object.keys(state.sprintResults).forEach(k=>{
                                const entry = state.sprintResults[k];
                                entry?.heatResults?.forEach(hr=> hr.shoulderNumber = Number(hr.shoulderNumber));
                                sr[Number(k)] = entry;
                            });
                            state.sprintResults = sr;
                        }
                    } catch(e){ console.warn('normalizeNumericShoulders failed', e); }
                }
                normalizeNumericShoulders();

                (function cleanupRemoved() {
                    if (!removed.length) return;
                    const remSet = new Set(removed);
                    function pruneKeys(obj) { if (!obj) return; for (const k of [...Object.keys(obj)]) { if (remSet.has(k)) delete obj[k]; } }
                    pruneKeys(state.generalComments);
                    pruneKeys(state.manualScores);
                    pruneKeys(state.quickComments);
                    if (state.crawlingDrills && state.crawlingDrills.runnerStatuses) pruneKeys(state.crawlingDrills.runnerStatuses);
                    if (state.crawlingDrills && state.crawlingDrills.sackCarriers) pruneKeys(state.crawlingDrills.sackCarriers);
                    if (state.sprintResults) pruneKeys(state.sprintResults);
                })();

                state.runners = mapped
                    // קודם משאירים כמחרוזת כדי לסנן ריקים ו-0
                    .map(r => ({ ...r, shoulderNumber: String(r.shoulderNumber).trim() }))
                    .filter(r => r.shoulderNumber !== '' && r.shoulderNumber !== '0')
                    .map(r => ({ ...r, shoulderNumber: Number(r.shoulderNumber) }))
                    .sort((a,b)=>a.shoulderNumber-b.shoulderNumber);
                // סמן שעמוד הדוח דורש רענון אם לא פתוח כרגע
                if (state.currentPage !== PAGES.REPORT) state.__needsReportRefresh = true;
                saveState?.();
                window.updateActiveRunners();
                refreshRelatedPages();
                try { window.dispatchEvent(new CustomEvent('runnersChanged', { detail: { runners: state.runners.map(r => ({ ...r })) } })); } catch (e) { /* silent */ }
            } else {
                // ביטול - שחזור מהגיבוי
                if (runnerCardEdit.original) { 
                    state.runners = JSON.parse(JSON.stringify(runnerCardEdit.original)); 
                }
                // FIXED: אם אחרי השחזור אין מועמדים, למחוק את המערך לחלוטין כדי לחזור למסך הבחירה
                if (!state.runners || state.runners.length === 0) {
                    state.runners = [];
                }
            }
            if (errorEl) { errorEl.classList.add('hidden'); errorEl.textContent = ''; }
            runnerCardEdit.active = false;
            runnerCardEdit.original = null;

            // UPDATED: החזרת כפתור התחל מקצים והסתרת כפתור הוסף מועמד
            const startHeatsBtn = document.getElementById('start-heats-btn');
            if (startHeatsBtn) {
                startHeatsBtn.style.display = 'flex';
            }
            
            const addRunnerBtn = document.getElementById('add-runner-inline-btn');
            if (addRunnerBtn) {
                addRunnerBtn.style.display = 'none';
            }

            // הסרת מחלקת מצב עריכה
            document.body.classList.remove('editing-runners');
            render();
        }

        function showError(msg) {
            const errorEl = document.getElementById('runner-inline-edit-error');
            if (!errorEl) return;
            errorEl.textContent = msg;
            errorEl.classList.remove('hidden');
        }

        // --- מאזינים ---

        // החלפת מאזין כפתור עריכה למצב אינלייני - NEW: בדיקת נעילה
        const editBtn = document.getElementById('edit-runners-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                // NEW: מניעת עריכה אם התחרות התחילה
                if (state.competitionStarted) {
                    showModal('עריכה נעולה', 'לא ניתן לערוך מתמודדים לאחר התחלת המקצים. להתחיל מחדש יש לאפס את האפליקציה.');
                    return;
                }
                enterInlineEditMode();
            });
        }

        // ADDED: מאזין לכפתור הוספת מתמודד במצב עריכה
        document.getElementById('add-runner-inline-btn')?.addEventListener('click', () => {
            if (!runnerCardEdit.active) return;
            const grid = document.querySelector('#runner-list .auto-grid');
            if (!grid) return;
            const newCard = document.createElement('div');
            newCard.className = 'runners-card border rounded-xl shadow-sm hover:shadow-md p-3 flex flex-col items-center justify-center transition-all duration-300 bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60';
            newCard.innerHTML = `
                <div class="text-xl font-bold text-gray-800 dark:text-gray-100 leading-none">
                    <div class="shoulder-input-wrapper flex items-center justify-center w-full">
                        <input data-shoulder-input type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done"
                               class="runner-inline-input max-w-[72px] w-[72px] text-center font-bold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-base py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                               value="" data-original="" placeholder="מספר" />
                    </div>
                </div>
                <button type="button" class="runner-delete-btn" aria-label="מחק מתמודד חדש">מחק</button>`;
            grid.appendChild(newCard);
            applyNumericEnhancements(newCard);
            newCard.querySelector('.runner-inline-input')?.focus();
        });

        document.getElementById('save-inline-runners-btn')?.addEventListener('click', () => exitInlineEditMode(true));
        document.getElementById('cancel-inline-runners-btn')?.addEventListener('click', () => {
            if (!confirm('לבטל שינויים?')) return;
            exitInlineEditMode(false);
        });

        // מחיקת מתמודד (delegation אחרי כניסה לעריכה) - UPDATED הסרת חלון אישור
        document.getElementById('runner-list')?.addEventListener('click', (e) => {
            if (!runnerCardEdit.active) return;
            const delBtn = e.target.closest('.runner-delete-btn');
            if (!delBtn) return;
            const card = delBtn.closest('.runners-card');
            const input = card?.querySelector('.runner-inline-input');
            if (input) {
                card.remove(); // הסרה ויזואלית מיידית (דורש שמירה לאישור סופי)
            }
        });

        // --- מאזינים קיימים (התאמות) ---
        document.getElementById('add-runners-btn')?.addEventListener('click', () => {
            // NEW: מניעת הוספת מתמודדים אם התחרות התחילה
            if (state.competitionStarted) {
                showModal('הוספה נעולה', 'לא ניתן להוסיף מתמודדים לאחר התחלת המקצים. להתחיל מחדש יש לאפס את האפליקציה.');
                return;
            }
            showAddRunnersModal();
        });
        
        document.getElementById('edit-details-btn')?.addEventListener('click', () => {
            // NEW: מניעת עריכת פרטים אם התחרות התחילה
            if (state.competitionStarted) {
                showModal('עריכה נעולה', 'לא ניתן לערוך פרטי ההערכה לאחר התחלת המקצים. להתחיל מחדש יש לאפס את האפליקציה.');
                return;
            }
            showEditBasicDetailsModal();
        });

        document.getElementById('start-heats-btn')?.addEventListener('click', () => {
            if (runnerCardEdit.active && !confirm('יש שינויים שלא נשמרו. להמשיך בלי לשמור?')) return;
            validateAndStartHeats();
        });
        
        // NEW: כפתור ניקוי Cache
        document.getElementById('clear-cache-btn')?.addEventListener('click', async () => {
            if (runnerCardEdit.active && !confirm('יש שינויים שלא נשמרו. להמשיך בלי לשמור?')) return;
            
            if (!confirm('לנקות את כל ה-Cache של האפליקציה? פעולה זו תרענן את האפליקציה ותבטיח שכל העדכונים יוצגו.')) return;
            
            const btn = document.getElementById('clear-cache-btn');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = '🔄 מנקה...';
            
            try {
                if (window.PWA?.forceRefreshApp) {
                    await window.PWA.forceRefreshApp();
                } else {
                    // Fallback אם PWA לא זמין
                    if (window.caches) {
                        const cacheNames = await caches.keys();
                        await Promise.all(cacheNames.map(name => caches.delete(name)));
                    }
                    if (navigator.serviceWorker) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        await Promise.all(registrations.map(reg => reg.unregister()));
                    }
                    sessionStorage.clear();
                    window.location.reload(true);
                }
            } catch (error) {
                console.error('שגיאה בניקוי Cache:', error);
                alert('שגיאה בניקוי Cache. נסה לרענן ידנית (Ctrl+Shift+R)');
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
        
        // Compact backup buttons (renamed)
        document.getElementById('compact-backup-upload-btn')?.addEventListener('click', async () => {
            if (runnerCardEdit.active && !confirm('יש שינויים שלא נשמרו. להמשיך בלי לשמור?')) return;
            if (!window.CompactBackup) { showModal('שגיאה','מודול גיבוי לא נטען'); return; }
            await window.CompactBackup.createAndUploadCompactBackup(window.showModal);
        });
        document.getElementById('compact-backup-download-btn')?.addEventListener('click', () => {
            if (runnerCardEdit.active && !confirm('יש שינויים שלא נשמרו. להמשיך בלי לשמור?')) return;
            if (!window.CompactBackup) { showModal('שגיאה','מודול גיבוי לא נטען'); return; }
            window.CompactBackup.downloadLocal();
        });
        
        // NEW: Import compact (verbose or legacy) backup into a fresh / existing state
        document.getElementById('compact-backup-import-btn')?.addEventListener('click', () => {
            if (runnerCardEdit.active && !confirm('יש שינויים שלא נשמרו. להמשיך בלי לשמור?')) return;
            document.getElementById('compact-backup-import-input').value='';
            document.getElementById('compact-backup-import-input').click();
        });
        document.getElementById('compact-backup-import-input')?.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            try {
                const txt = await file.text();
                let parsed;
                try { parsed = JSON.parse(txt); } catch(err){ showModal('שגיאה','קובץ גיבוי לא תקין'); return; }
                if (!parsed) { showModal('שגיאה','קובץ ריק'); return; }
                if (!confirm('לייבא את הגיבוי ולדרוס את הנתונים הנוכחיים?')) return;
                restoreFromCompactBackup(parsed);
                showModal('הצלחה','הגיבוי נטען בהצלחה');
            } catch(err){
                console.error('Import compact backup failed', err);
                showModal('שגיאה','ייבוא נכשל');
            }
        });
        
        function restoreFromCompactBackup(backup){
            // תומך בגרסאות: 2.1 (verbose), 2.0 (legacy shorthand)
            // ניקוי מצב קודם
            initializeAllData();
            state.evaluatorName = backup.evaluatorName || backup.e || '';
            state.groupNumber = backup.groupNumber || backup.g || '';
            state.runners = [];
            state.heats = [];
            state.crawlingDrills = state.crawlingDrills || {};
            state.crawlingDrills.sprints = [];
            state.crawlingDrills.runnerStatuses = {};
            state.crawlingDrills.sackCarriers = {};
            state.quickComments = {};
            state.generalComments = {};
            state.manualScores = {};

            // Detect verbose vs legacy structure
            let runnersArr = [];
            if (Array.isArray(backup.runners)) { // verbose 2.1 or unknown
                runnersArr = backup.runners;
            } else if (Array.isArray(backup.r)) { // legacy 2.0
                // map legacy to verbose-like objects
                runnersArr = backup.r.map(r => ({
                    shoulderNumber: r.sn,
                    status: r.st || 'active',
                    sprintHeats: (r.hs||[]).map((t,i)=> t==null? null : { heatIndex: i+1, timeMs: t, comment: (r.hc||[])[i]||null }).filter(Boolean),
                    crawlingSprints: (r.cs||[]).map((t,i)=> t==null? null : { sprintIndex: i+1, timeMs: t, comment: (r.cc||[])[i]||null }).filter(Boolean),
                    sackCarry: { totalTimeMs: r.sk||0 },
                    quickComments: r.q || [],
                    generalComments: r.gc || null,
                    manualScore: (r.ms!==undefined? r.ms:null),
                    finalScores: { sprint: r.spr||0, crawling: r.cr||0, stretcher: r.stf||0 }
                }));
            }

            // Runners list
            const runnerNums = new Set();
            runnersArr.forEach(r => {
                const sn = Number(r.shoulderNumber);
                if (!sn || runnerNums.has(sn)) return;
                runnerNums.add(sn);
                state.runners.push({ shoulderNumber: sn });
                if (r.status && r.status !== 'active' && r.status !== 'פעיל') {
                    state.crawlingDrills.runnerStatuses[sn] = r.status;
                }
                if (Array.isArray(r.quickComments) && r.quickComments.length) state.quickComments[sn] = r.quickComments.slice();
                if (r.generalComments) state.generalComments[sn] = r.generalComments;
                if (r.manualScore !== undefined && r.manualScore !== null) state.manualScores[sn] = r.manualScore;
                const sackMs = r.sackCarry && r.sackCarry.totalTimeMs; if (sackMs) state.crawlingDrills.sackCarriers[sn] = { totalTime: sackMs };
            });
            state.runners.sort((a,b)=>a.shoulderNumber-b.shoulderNumber);

            // Reconstruct heats (sprint)
            const maxSprintHeatIndex = Math.max(0, ...runnersArr.flatMap(r=> (r.sprintHeats||[]).map(h=>h.heatIndex||0)));
            for (let i=0;i<maxSprintHeatIndex;i++) state.heats.push({ index: i+1, arrivals: [] });
            runnersArr.forEach(r => {
                (r.sprintHeats||[]).forEach(h => {
                    const heat = state.heats[h.heatIndex-1]; if (!heat) return;
                    heat.arrivals.push({ shoulderNumber: Number(r.shoulderNumber), finishTime: h.timeMs||null, comment: h.comment||null });
                });
            });

            // Reconstruct crawling sprints
            const maxCrawlSprintIdx = Math.max(0, ...runnersArr.flatMap(r=> (r.crawlingSprints||[]).map(cs=>cs.sprintIndex||0)));
            state.crawlingDrills.sprints = [];
            for (let i=0;i<maxCrawlSprintIdx;i++) state.crawlingDrills.sprints.push({ index: i+1, arrivals: [] });
            runnersArr.forEach(r => {
                (r.crawlingSprints||[]).forEach(cs => {
                    const sp = state.crawlingDrills.sprints[cs.sprintIndex-1]; if (!sp) return;
                    sp.arrivals.push({ shoulderNumber: Number(r.shoulderNumber), finishTime: cs.timeMs||null, comment: cs.comment||null });
                });
            });

            // Sociometric (if available verbose)
            if (Array.isArray(backup.sociometricHeats)) {
                state.sociometricStretcher = state.sociometricStretcher || {};
                state.sociometricStretcher.heats = backup.sociometricHeats.map(h => ({
                    selectionOrder: { stretcher: (h.stretcherOrder||[]).map(Number), jerrican: (h.jerricanOrder||[]).map(Number) },
                    participants: []
                }));
            }

            // Recalculate derived data
            try { window.updateAllSprintScores?.(); } catch(e){ console.warn('updateAllSprintScores failed after import', e); }
            try { (state.runners||[]).forEach(r => { window.calculateCrawlingFinalScore?.(r); window.calculateStretcherFinalScore?.(r); }); } catch(e){ }
            window.updateActiveRunners?.();
            saveState?.();
            render();
        }

        // NEW: מאזינים לכפתורי הוספת מתמודדים במצב ללא רצים (רנדומלי / ידני)
        if (!hasRunners && !state.__autoEnterEditRunners) { // FIXED תנאי חדש
            const randBtn = document.getElementById('no-runners-random-btn');
            const manualBtn = document.getElementById('no-runners-manual-btn');
            randBtn?.addEventListener('click', () => {
                if (state.competitionStarted) { showModal('נעול', 'לא ניתן להוסיף לאחר התחלת המקצים'); return; }
                try { (window.generateRandomRunners||generateRandomRunners)(); } catch(e){ console.warn('generateRandomRunners failed', e); showModal('שגיאה','שגיאה בהוספת רנדומלית'); }
                saveState();
                render();
            });
            manualBtn?.addEventListener('click', () => {
                if (state.competitionStarted) { showModal('נעול', 'לא ניתן להוסיף לאחר התחלת המקצים'); return; }
                if (!Array.isArray(state.runners)) state.runners = [];
                state.__autoEnterEditRunners = true; // כניסה מידית למצב עריכה ריק
                saveState();
                render();
            });
            if(!randBtn) console.warn('no-runners-random-btn not found in DOM');
            if(!manualBtn) console.warn('no-runners-manual-btn not found in DOM');
        }

        // לאחר רינדור ראשוני – החלה גם אם יש אינפוטים קיימים (למקרה של מודאל פתוח מראש)
        applyNumericEnhancements();

        // ADDED: טיפול ברענון עמודים אחרים כשמעדכנים רץ (כמו שעשינו בספרינטים)
        function refreshRelatedPages() {
            // רענון עמוד זחילה קבוצתית
            if (typeof window.Pages?.renderCrawlingDrillsCommentsPage === 'function') {
                setTimeout(() => {
                    if (state.currentPage === PAGES.CRAWLING_COMMENTS) {
                        window.Pages.renderCrawlingDrillsCommentsPage();
                    }
                }, 100);
            }
            // רענון דוח סיכום אם פתוח כרגע
            if (state.currentPage === PAGES.REPORT && typeof window.Pages?.renderReportPage === 'function') {
                setTimeout(() => { window.Pages.renderReportPage(); }, 120);
            }
            // שליחת אירועים לעמודים אחרים
            window.dispatchEvent(new CustomEvent('runnerUpdated', { detail: { timestamp: Date.now() } }));
            window.dispatchEvent(new CustomEvent('runnersChanged', { detail: { timestamp: Date.now() } }));
        }

        // --- לאחר ה-HTML: בניית גריד במצב הוספה ידנית ללא רצים קודמים ---
        if (!hasRunners && manualAddMode) {
            const grid = document.getElementById('manual-add-grid');
            const countEl = document.getElementById('manual-added-count');
            const errEl = document.getElementById('manual-add-error');
            function renderManualCards(){
                if (!grid) return;
                const sorted = state.runners.map((r,i)=>({i, sn:r.shoulderNumber})).sort((a,b)=>Number(a.sn||0)-Number(b.sn||0));
                grid.innerHTML = sorted.map(o=>`<div class='runners-card border rounded-xl shadow-sm p-3 flex flex-col items-center justify-center bg-white dark:bg-gray-800 dark:border-gray-700 border-gray-200 relative'>
                    <div class='text-xl font-bold text-gray-800 dark:text-gray-100 leading-none'>
                        <input data-manual-card-input type='tel' maxlength='3' inputmode='numeric' pattern='[0-9]*' class='w-16 text-center font-bold text-gray-800 dark:text-gray-100 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md text-base py-1 focus:outline-none focus:ring-2 focus:ring-blue-400' value='${o.sn ?? ''}' data-index='${o.i}' placeholder='מספר' />
                    </div>
                    <button type='button' class='runner-delete-btn mt-2 text-[0.60rem] font-semibold px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-md shadow focus:outline-none focus:ring-2 focus:ring-rose-300' data-index='${o.i}'>מחק</button>
                </div>`).join('');
                if (countEl) countEl.textContent = state.runners.length;
            }
            function showManualErr(m){ if(!errEl) return; errEl.textContent=m; errEl.classList.remove('hidden'); }
            function clearManualErr(){ if(!errEl) return; errEl.classList.add('hidden'); errEl.textContent=''; }
            function validateAll(){
                const nums = state.runners.map(r=>String(r.shoulderNumber).trim()).filter(v=>v!=='');
                if (nums.includes('0')) { showManualErr('מספר 0 אינו מותר'); return false; }
                if (nums.some(v=>!/^[0-9]{1,3}$/.test(v))) { showManualErr('רק מספרים (עד 3 ספרות)'); return false; }
                const dups = nums.filter((v,i)=>nums.indexOf(v)!==i);
                if (dups.length){ showManualErr('כפילויות: '+[...new Set(dups)].join(',')); return false; }
                if (nums.length===0){ showManualErr('יש להוסיף לפחות מתמודד אחד'); return false; }
                return true;
            }
            document.getElementById('manual-add-new-card-btn')?.addEventListener('click', ()=>{
                if (state.runners.length >= CONFIG.MAX_RUNNERS){ showManualErr(`לא ניתן לעבור את ${CONFIG.MAX_RUNNERS}`); return; }
                state.runners.push({ shoulderNumber: '' });
                clearManualErr();
                renderManualCards();
                setTimeout(()=>{ grid.querySelector('.runners-card:last-child input')?.focus(); },0);
            });
            document.getElementById('finish-manual-add-btn')?.addEventListener('click', ()=>{
                if (!validateAll()) return;
                // ניקוי: הסרת ריקים או 0 ואז המרה למספרים (מונע יצירת 0)
                state.runners = state.runners
                    .map(r => ({ shoulderNumber: String(r.shoulderNumber||'').trim() }))
                    .filter(r => r.shoulderNumber !== '' && r.shoulderNumber !== '0')
                    .map(r => ({ shoulderNumber: Number(r.shoulderNumber) }))
                    .sort((a,b)=>a.shoulderNumber-b.shoulderNumber);
                state.__manualAddMode = false; saveState(); render();
            });
            document.getElementById('cancel-manual-add-btn')?.addEventListener('click', ()=>{ state.runners = []; state.__manualAddMode = false; saveState(); render(); });
            grid.addEventListener('input', e=>{
                const inp = e.target.closest('[data-manual-card-input]'); if(!inp) return;
                inp.value = inp.value.replace(/\D+/g,'').slice(0,3);
                if (inp.value === '0') inp.value = '';
                const idx = Number(inp.dataset.index);
                if (state.runners[idx]) state.runners[idx].shoulderNumber = inp.value;
                clearManualErr();
            });
            grid.addEventListener('blur', e=>{ const inp=e.target.closest('[data-manual-card-input]'); if(!inp) return; /* future: per-field validation */ }, true);
            grid.addEventListener('click', e=>{
                const del = e.target.closest('.runner-delete-btn'); if(!del) return;
                const idx = Number(del.dataset.index);
                state.runners.splice(idx,1);
                renderManualCards();
            });
            // התחלה עם כרטיס ראשון אוטומטי אם אין כלל
            if (state.runners.length===0){ state.runners.push({ shoulderNumber: '' }); }
            renderManualCards();
        }

        // לאחר יצירת / עדכון הגריד — בדיקה אם צריך להיכנס אוטומטית למצב עריכה אחרי "הוספה ידנית"
        if (state.__autoEnterEditRunners) {
            delete state.__autoEnterEditRunners;
            setTimeout(() => {
                if (typeof enterInlineEditMode === 'function') enterInlineEditMode();
            }, 0);
        }
    };
})();