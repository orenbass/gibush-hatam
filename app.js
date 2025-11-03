// --- Global State ---

// אובייקט מצב מרכזי המכיל את כל נתוני האפליקציה.
// המצב הזה נשמר ונטען מ-localStorage.

const state = {

    currentPage: PAGES.RUNNERS, // הדף הפעיל הנוכחי

    lastPage: PAGES.RUNNERS,    // מאחסן את הדף האחרון שבו ביקרנו לפני סטטוס/הגדרות מנהל

    runners: [],         // מערך של אובייקטי רצים { shoulderNumber: number }

    heats: [],           // מערך של אובייקטי מקצי ספרינט

    currentHeatIndex: 0,     // אינדקס המקצה הנוכחי המוצג

    timer: null,             // מזהה מרווח (Interval ID) לטיימר הראשי

    startTime: 0,            // חותמת זמן של התחלת המקצה/ספרינט הנוכחי

    isTimerRunning: false,       // דגל המציין if הטיימר הראשי פעיל

    evaluatorName: '',   // שם המעריך

    groupNumber: '',         // מספר הקבוצה

    // NEW: מצב נעילת מקצים - מונע עריכת מתמודדים ומעבר בין עמודים
    competitionStarted: false, // הif לחצו על "התחל מקצים"

    crawlingDrills: {},      // אובייקט לנתוני תרגילי זחילה (הערות, ספרינטים, נושאי שק)

    generalComments: {}, // הוספת שדה להערות כלליות

    quickComments: {},    // { shoulderNumber: [ 'tag1', 'tag2', ... ] }

    sociometricStretcher: {},    // אובייקט לנתוני אלונקה סוציומטרית (מקצים, נושאים, הערות)

    themeMode: 'auto', // אפשרויות: 'auto', 'light', 'dark'

    manualScores: {},

    isEditingScores: false, // מצב עריכה

    // === שליחה אוטומטית של גיבוי ===
    autoBackupUpload: {
        isActive: false,           // הif השליחה האוטומטית פעילה
        intervalId: null,          // מזהה ה-interval
        startTime: null,           // זמן התחלת השליחה האוטומטית
        lastUploadTime: null,      // זמן השליחה האחרונה
        uploadCount: 0,            // מספר השליחות שבוצעו
        hasBeenManuallyStopped: false  // הif הופסקה ידנית (לחיצה על "שלח קובץ למנהל")
    }

};

window.state = state;

// --- DOM Elements ---

// הפניות לאלמנטים מרכזיים ב-DOM לצורך מניפולציה יעילה
let contentDiv = document.getElementById('content');
let headerTitle = document.getElementById('header-title');
let autosaveStatus = document.getElementById('autosave-status');
let loadingOverlay = document.getElementById('loading-overlay'); // V1.11 - Added loading overlay
let loadingText = document.getElementById('loading-text'); // Added loading text element
let tempStateBackup = null; // גיבוי זמני למצב עריכה בדוח

// Ensure a global page registry exists for external page modules
window.Pages = window.Pages || {};

// עזר: לוודא שהפניות ל-DOM קיימות (במיוחד if הסקריפט רץ לפני טעינת ה-DOM)
function ensureDomRefs() {
    if (!contentDiv) contentDiv = document.getElementById('content');
    if (!headerTitle) headerTitle = document.getElementById('header-title');
    if (!autosaveStatus) autosaveStatus = document.getElementById('autosave-status');
    if (!loadingOverlay) loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingText) loadingText = document.getElementById('loading-text');
}

// --- Utility functions moved to utils ---
// Moved to js/utils/time.js: formatTime, formatTime_no_ms, updateTimerDisplay
// Moved to js/utils/modal.js: showModal, confirmLeaveCrawlingComments
// Moved to js/utils/scoring.js: normalizeScore, computeHeatResults, get*Results, calculate*Score
// Moved to js/utils/pwa.js: PWA install UI, service worker registration

// --- Data Persistence & Initialization ---



/**

 * Saves the current application state to localStorage.

 * Handles cleaning up non-serializable properties (like timer intervals) before saving.

 */

function saveState() {

    try {

        // Create a deep copy of the state to avoid modifying the live state during serialization

        const fullStateToSave = {

            config: CONFIG,

            appState: state

        };

        const stateToSave = JSON.parse(JSON.stringify(fullStateToSave));



        // Clear timer intervals from sackCarriers before saving, as they are not serializable

        if (stateToSave.appState.crawlingDrills && stateToSave.appState.crawlingDrills.sackCarriers) {

            for (const shoulderNumber in stateToSave.appState.crawlingDrills.sackCarriers) {

                if (stateToSave.appState.crawlingDrills.sackCarriers[shoulderNumber].timerInterval) {

                    stateToSave.appState.crawlingDrills.sackCarriers[shoulderNumber].timerInterval = null;

                }

            }

        }

        localStorage.setItem(CONFIG.APP_STATE_KEY, JSON.stringify(stateToSave));



        // V1 - Show autosave status briefly (guard if element missing)
        if (autosaveStatus) {
            autosaveStatus.style.opacity = '1';
            setTimeout(() => { autosaveStatus.style.opacity = '0'; }, 1000);
        }

    } catch (e) {

        console.error("Failed to save state to localStorage", e);

        // Use custom modal instead of alert

        showModal('שגיאת שמירה', 'שגיאה: לא ניתן היה לשמור את נתוני האפליקציה. אנא נסה שוב או בדוק את אחסון המכשיר שלך.');

    }

}



/**

 * Loads the application state from localStorage.

 * Initializes default data if no saved state is found or if parsing fails.

 */

function loadState() {
    try {
        console.log('🔍 מתחיל טעינת מצב...');
        const clearedFlag = localStorage.getItem('groupNumberCleared') === '1';
        
        // **שלב 1: טעינת הגדרות מעודכנות מהדרייב ועדכון CONFIG**
        try {
            const downloadedSettings = localStorage.getItem('downloadedSystemSettings');
            if (downloadedSettings) {
                const settings = JSON.parse(downloadedSettings);
                console.log('📦 נמצאו הגדרות שהורדו מהדרייב:', settings);
                
                // **עדכון CONFIG מהגדרות דרייב**
                if (settings.exerciseSettings && window.CONFIG) {
                    console.log('🔧 מעדכן CONFIG מהדרייב...');
                    // דריסה מלאה של CONFIG בהגדרות מהדרייב
                    for (const key in settings.exerciseSettings) {
                        window.CONFIG[key] = settings.exerciseSettings[key];
                    }
                    console.log('✅ CONFIG עודכן:', window.CONFIG);
                }
                
                // **עדכון הגדרות גיבוי**
                if (settings.backupSettings && window.CONFIG) {
                    console.log('🔧 מעדכן הגדרות גיבוי מהדרייב...');
                    if (settings.backupSettings.enabled !== undefined) {
                        window.CONFIG.AUTO_BACKUP_UPLOAD_ENABLED = settings.backupSettings.enabled;
                    }
                    if (settings.backupSettings.intervalMinutes !== undefined) {
                        window.CONFIG.AUTO_BACKUP_UPLOAD_INTERVAL_MS = settings.backupSettings.intervalMinutes * 60 * 1000;
                    }
                    if (settings.backupSettings.stopAfterMinutes !== undefined) {
                        window.CONFIG.AUTO_BACKUP_UPLOAD_MAX_DURATION_MS = settings.backupSettings.stopAfterMinutes * 60 * 1000;
                    }
                }
                
                // **USERS_CONFIG נטען דינמית ואוטומטית, לא צריך לדרוס**
                console.log('👥 USERS_CONFIG קורא דינמית מהדרייב');
            } else {
                console.log('ℹ️ לא נמצאו הגדרות בדרייב, משתמש בברירות מחדל');
            }
        } catch (e) {
            console.warn('⚠️ לא ניתן לטעון הגדרות מהדרייב:', e);
        }
        
        // **שלב 2: טעינת שם המעריך ומספר קבוצה**
        let evaluatorName = '';
        let groupNumber = '';
        
        // 2.1 קודם כל - בדיקה if יש שם מהגדרות (עדיפות עליונה!)
        try {
            const nameFromSettings = localStorage.getItem('evaluatorNameFromSettings');
            if (nameFromSettings) {
                evaluatorName = nameFromSettings;
                console.log('✅ נטען שם מעריך מקובץ הגדרות:', evaluatorName);
            }
        } catch (e) { 
            console.warn('שגיאה בטעינת evaluatorNameFromSettings:', e); 
        }
        
        // 2.2 if לא נמצא שם מהגדרות, נבדוק במצב אימות
        const authSession = localStorage.getItem('gibushAuthState');
        if (authSession) {
            const session = JSON.parse(authSession);
            console.log('🔍 נמצא מצב אימות');
            
            if (session.authState && session.authState.isAuthenticated) {
                // שם מעריך - רק if עדיין אין
                if (!evaluatorName && session.authState.evaluatorName) {
                    evaluatorName = session.authState.evaluatorName;
                    console.log('📋 נטען שם מעריך ממצב אימות:', evaluatorName);
                }
                
                // לא לשחזר מספר קבוצה if דגל איפוס קיים
                if (!clearedFlag && session.authState.groupNumber) {
                    groupNumber = session.authState.groupNumber;
                    console.log('📋 נטען מספר קבוצה ממצב אימות:', groupNumber);
                } else if (clearedFlag) {
                    console.log('🚫 דילוג על שחזור מספר קבוצה (נמחק במפורש)');
                }
                
                if (!state.authState) state.authState = {};
                state.authState = { ...state.authState, ...session.authState };
            }
        }

        // עדכון המצב
        if (evaluatorName) {
            state.evaluatorName = evaluatorName;
            console.log('🎯 שם מעריך סופי:', state.evaluatorName);
        }
        if (groupNumber) {
            state.groupNumber = groupNumber;
            console.log('🎯 מספר קבוצה סופי:', state.groupNumber);
        }

        // **שלב 3: טעינת שאר המצב מ-localStorage**
        const savedData = localStorage.getItem(CONFIG.APP_STATE_KEY);

        if (savedData) {
            const fullLoadedState = JSON.parse(savedData);
            
            // לא נעדכן CONFIG כי כבר עדכנו אותו מההגדרות
            
            // טעינת appState
            Object.assign(state, fullLoadedState.appState || fullLoadedState);

            // **שמירה על השם והקבוצה שטענו (עדיפות גבוהה)**
            if (evaluatorName) {
                state.evaluatorName = evaluatorName;
                console.log('🔄 שמירה על שם מעריך:', state.evaluatorName);
            }
            if (groupNumber) {
                state.groupNumber = groupNumber;
                console.log('🔄 שמירה על מספר קבוצה:', state.groupNumber);
            }

            // אתחול מחדש של מבני נתונים if צריך
            if (!state.heats || state.heats.length !== CONFIG.NUM_HEATS) initializeHeats();
            if (!state.crawlingDrills || !state.crawlingDrills.sprints || state.crawlingDrills.sprints.length !== CONFIG.MAX_CRAWLING_SPRINTS) initializeCrawlingDrills();
            if (!state.sociometricStretcher || !state.sociometricStretcher.heats || state.sociometricStretcher.heats.length !== CONFIG.NUM_STRETCHER_HEATS) initializeSociometricStretcherHeats();
            if (!state.crawlingDrills.activeSackCarriers) state.crawlingDrills.activeSackCarriers = [];
            state.theme = state.theme || 'light';

        } else {
            // אין נתונים שמורים - אתחול
            const preservedEvaluator = evaluatorName;
            const preservedGroup = groupNumber;
            initializeAllData();
            if (preservedEvaluator) {
                state.evaluatorName = preservedEvaluator;
                console.log('🛡️ שחזור שם מעריך:', preservedEvaluator);
            }
            if (preservedGroup) {
                state.groupNumber = preservedGroup;
                console.log('🛡️ שחזור מספר קבוצה:', preservedGroup);
            }
        }

        // המשך שליחה אוטומטית
        if (window.autoBackupManager) {
            setTimeout(() => {
                window.autoBackupManager.resume();
            }, 1000);
        }

        console.log('📊 מצב סופי:', {
            evaluatorName: state.evaluatorName,
            groupNumber: state.groupNumber,
            CONFIG_NUM_HEATS: CONFIG.NUM_HEATS,
            CONFIG_MAX_RUNNERS: CONFIG.MAX_RUNNERS,
            USERS_COUNT: USERS_CONFIG?.users?.length
        });

    } catch (e) {
        console.error("Failed to load or parse state. Resetting data.", e);
        showModal('שגיאת טעינה', 'שגיאה בקריאת הנתונים. ייתכן שהנתונים הקיימים פגומים. האפליקציה תאופס.');
        initializeAllData();
    }
}



/**

 * Initializes all core data structures of the application to their default empty states.

 * Called on first load or when resetting the app.

 */

function initializeAllData() {

    state.runners = [];

    state.currentHeatIndex = 0;

    state.evaluatorName = '';

    state.groupNumber = '';

    // NEW: אתחול מצב התחרות
    state.competitionStarted = false;

    // ניקוי הערות והערות מהירות
    state.quickComments = {};
    state.generalComments = {};
    state.manualScores = {};

    initializeHeats();

    initializeCrawlingDrills();

    initializeSociometricStretcherHeats();

}



/**

 * Initializes the sprint heats array based on CONFIG.NUM_HEATS.

 */

function initializeHeats() {

    state.heats = Array.from({ length: CONFIG.NUM_HEATS }, (_, i) => ({

        heatNumber: i + 1,

        arrivals: [],

        started: false,

        finished: false

    }));

}



/**

 * Initializes the crawling drills data structure.

 */

function initializeCrawlingDrills() {

    state.crawlingDrills = {

        comments: {}, // General comments for each runner

        sprints: Array.from({ length: CONFIG.MAX_CRAWLING_SPRINTS }, (_, i) => ({

            heatNumber: i + 1,

            arrivals: [],

            started: false,

            finished: false

        })),

        currentSprintIndex: 0,

        sackCarriers: {}, // Stores sack carrying times for each runner

        runnerStatuses: {}, // Stores global status for each runner (e.g., 'retired', 'temp_removed')

        activeSackCarriers: [] // List of shoulder numbers currently carrying sacks

    };

}

// Ensure correct classes/structure (defensive) without changing labels
function refreshNavigationTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        // Make sure tab has decent base classes (in case of legacy)
        tab.classList.add('rounded-xl');

        // Keep two-span structure if exists (icon + label). If not, don't mutate content.
        const spans = tab.querySelectorAll('span');
        if (spans.length === 2) {
            // Label remains spans[1] (used elsewhere in code)
            // spans[0] can stay as icon node (we don't replace here to avoid breaking user choices)
        }
    });
}
/**
 * Initializes the sociometric stretcher heats data structure for counting selections.
 */
function initializeSociometricStretcherHeats() {
    state.sociometricStretcher = {
        heats: Array.from({ length: CONFIG.NUM_STRETCHER_HEATS }, (_, i) => ({
            heatNumber: i + 1,
            selections: {} // { '101': 'stretcher' | 'jerrican' }
            // usedChoices הוסר – ניתן לבחור/לבטל חופשי
        })),
        currentHeatIndex: 0
    };
}

// --- Runner Management & Backup/Restore ---

// הפונקציות הבאות הועברו ל-js/pages/runners.js:
// - showAddRunnersModal()
// - showEditDetailsModal()
// - showEditBasicDetailsModal()
// - renderRunnerList()
// - updateMainPageRunnerList()
// - showRunnerEditMode()
// - renderEditableRunnerList()
// - addRunnerRow()
// - saveRunnersEdit()
// - cancelRunnersEdit()
// - exitRunnerEditMode()

// עדכון פונקציית validateAndStartHeats
function validateAndStartHeats() {
    // NEW: דרישת מספר קבוצה לפני התחלת מקצים
    if (!state.groupNumber || String(state.groupNumber).trim() === '') {
        showModal('חסר מספר קבוצה', 'יש להזין מספר קבוצה לפני התחלת המקצים.', () => {
            if (typeof showEditBasicDetailsModal === 'function') showEditBasicDetailsModal();
        });
        return;
    }
    if (state.runners.length === 0) {
        showError("יש להוסיף לפחות מועמד אחד כדי להתחיל.");
        return;
    }

    // NEW: הוספת התראה לפני התחלת מקצים
    showModal(
        'התחלת מקצים - אזהרה חשובה!',
        `⚠️ לאחר המעבר למקצים לא תהיה יותר אפשרות לערוך את רשימת המועמדים או לשנות את מבנה הקבוצה.

כל עריכה של מתמודדים תיחסם ורק המתמודדים הנוכחיים ישתתפו בתחרות.

להמשיך למקצים?`,
        () => {
            // סימון שהתחילו מקצים - זה ינעל עריכות
            state.competitionStarted = true;
            state.currentPage = PAGES.HEATS;
            
            // NEW: התחלת שליחה אוטומטית של גיבוי
            if (window.autoBackupManager) {
                window.autoBackupManager.start();
            }
            
            saveState();
            renderPage();
        }
    );
}
/**

 * Displays an error message on the runners page.

 * @param {string} message - The error message to display.

 */

function showError(message) {

    const errorDiv = document.getElementById('runner-error');

    errorDiv.textContent = message;

    errorDiv.classList.remove('hidden'); // Show the error div

}



/**

 * Exports the current application state as a JSON backup file.

 */

function exportBackup() {

    try {

        // Create a deep copy of the state for export, similar to saveState

        const backupData = JSON.stringify({ config: CONFIG, appState: state }, null, 2);

        const blob = new Blob([backupData], { type: 'application/json' });

        const link = document.createElement('a');

        link.href = URL.createObjectURL(blob);

        const date = new Date().toLocaleDateString('he-IL').replace(/\./g, '-');

        link.download = `GibushBackup_v1.11_${state.groupNumber || 'group'}_${date}.json`;

        link.click();

    } catch (e) {

        console.error("Failed to create backup", e);

        showModal('שגיאת גיבוי', 'שגיאה ביצירת קובץ הגיבוי. אנא נסה שוב.');

    }

}



/**

 * Imports application state from a selected JSON backup file.

 * Prompts for confirmation before overwriting current data.

 * @param {Event} event - The change event from the file input.

 */

function importBackup(event) {

    const file = event.target.files[0];

    if (!file) return; // No file selected



    const reader = new FileReader();

    reader.onload = (e) => {

        try {

            const importedData = JSON.parse(e.target.result);

            // Show a confirmation modal before proceeding with import

            showModal('אישור ייבוא נתונים', 'הif אתה בטוח? פעולה זו תחליף את כל הנתונים הנוכחיים בנתונים מהקובץ.', () => {

                // Restore CONFIG and appState from imported data

                CONFIG = { ...CONFIG, ...(importedData.config || {}) };

                Object.assign(state, importedData.appState || importedData);

                // Reset timer-related state variables as they are not persistent

                state.timer = null;

                state.isTimerRunning = false;

                saveState(); // Save the newly imported state
                renderPage(); // FIXED: Re-render the UI
                showModal('ייבוא הצלחה', 'הנתונים יובאו בהצלחה!');

            });

        } catch (error) {

            console.error("Failed to parse backup file", error);

            showModal('שגיאת ייבוא', 'שגיאה: קובץ הגיבוי אינו תקין או פגום.');

        }

    };

    reader.readAsText(file); // Read the file as text

    event.target.value = ''; // Clear the file input to allow re-importing the same file

}



/**

 * Handles the click event for the Admin Settings button, requiring a password.

 */

function handleAdminSettingsClick() {

    showModal(

        'הזן קוד מנהל',

        'כדי לגשת להגדרות המערכת, יש להזין את קוד הגישה.',

        null,

        true, // isInputModal = true

        (password) => {

            if (password === ADMIN_PASSWORD) {

                state.currentPage = PAGES.ADMIN_SETTINGS;

                render();

            } else {

                showModal('שגיאת אימות', 'קוד הגישה שגוי. נסה שוב.');

            }

        }

    );

}



// --- Core Logic ---



/**

 * Handles changes to a runner's global status (active, temporary removed, retired).

 * Updates runnerStatuses and removes/adds arrivals in future heats as necessary.

 * Stops sack timers if a runner becomes inactive.

 * @param {Event} event - The click event from the status button.

 * @param {number|null} heatIndexContext - The current heat index, or null if from global status management.

 */

function handleGlobalStatusChange(event, heatIndexContext) {

    const shoulderNumber = parseInt(event.currentTarget.dataset.shoulderNumber);

    const newStatus = event.currentTarget.dataset.status;



    if (newStatus === 'active') {

        // If status changes to active, remove from runnerStatuses

        delete state.crawlingDrills.runnerStatuses[shoulderNumber];

        // If coming from a heat context, remove from future heat arrivals

        if (heatIndexContext !== null) {

            for (let i = heatIndexContext; i < CONFIG.NUM_HEATS; i++) {

                const arrivalIndex = state.heats[i].arrivals.findIndex(a => a.shoulderNumber === shoulderNumber);

                if (arrivalIndex !== -1) state.heats[i].arrivals.splice(arrivalIndex, 1);

            }

        }

    } else {

        // If status changes to temp_removed or retired, set in runnerStatuses

        state.crawlingDrills.runnerStatuses[shoulderNumber] = newStatus;

        // If coming from a heat context, add a comment to future heat arrivals

        if (heatIndexContext !== null) {

            for (let i = heatIndexContext; i < CONFIG.NUM_HEATS; i++) {

                const heat = state.heats[i];

                const existingArrivalIndex = heat.arrivals.findIndex(a => a.shoulderNumber === shoulderNumber);

                const comment = newStatus === 'temp_removed' ? 'נגרע זמנית' : 'פרש';

                if (existingArrivalIndex === -1) {

                    // Add new arrival with comment if not already present

                    heat.arrivals.push({ shoulderNumber, finishTime: null, comment, status: newStatus });

                } else {

                    // Update existing arrival with new status/comment

                    heat.arrivals[existingArrivalIndex].comment = comment;

                    heat.arrivals[existingArrivalIndex].status = newStatus;

                }

            }

        }

    }

    // If the runner was a sack carrier, stop their timer and remove them from active carriers

    const sackIndex = state.crawlingDrills.activeSackCarriers.indexOf(shoulderNumber);

    if (sackIndex > -1) {

        stopSackTimer(shoulderNumber);

        state.crawlingDrills.activeSackCarriers.splice(sackIndex, 1);

    }

    saveState();
    renderPage(); // FIXED: שימוש ב-renderPage במקום render
}



/**

 * Starts the timer for a given heat/sprint.

 * Resets arrivals for the target heat/sprint.

 * @param {object} targetHeat - The heat or sprint object to start.

 */

function handleStart(targetHeat) {

    targetHeat.started = true;

    targetHeat.arrivals = []; // Clear previous arrivals

    state.startTime = Date.now(); // Record start time

    startTimer(); // Start the main UI timer

    saveState();

    render();

}



/**

 * Stops the timer for a given heat/sprint.

 * Marks the heat/sprint as finished.

 * @param {object} targetHeat - The heat or sprint object to stop.

 */

function handleStop(targetHeat) {

    clearInterval(state.timer);
    state.isTimerRunning = false;

    targetHeat.finished = true;
    saveState();

    render();

}



/**

 * Handles adding a runner's arrival to the current heat/sprint.

 * Records their finish time and checks if all active runners have arrived.

 * @param {Event} event - The click event from the runner button.

 * @param {object} targetHeat - The current heat or sprint object.

 * @param {number} heatIndex - The index of the current heat (or -1 for crawling sprints).

 */

function handleAddRunnerToHeat(event, targetHeat, heatIndex) {

    // Ensure the clicked element is a runner button

    if (!event.target.matches('.runner-btn')) return;



    const shoulderNumber = parseInt(event.target.dataset.shoulderNumber);

    // Prevent adding if shoulder number is invalid or already arrived in this heat

    if (isNaN(shoulderNumber) || targetHeat.arrivals.some(a => a.shoulderNumber === shoulderNumber)) return;



    const finishTime = Date.now() - state.startTime; // Calculate finish time relative to start

    targetHeat.arrivals.push({ shoulderNumber, finishTime, comment: null, status: 'active' });



    // Determine total active runners to check for heat completion

    const totalActiveRunners = state.runners.filter(runner => !state.crawlingDrills.runnerStatuses[runner.shoulderNumber]).length;



    if (heatIndex !== -1) { // Regular sprint heats

        if (targetHeat.arrivals.length === totalActiveRunners) handleStop(targetHeat);

    } else { // Crawling sprints

        if (targetHeat.arrivals.length === totalActiveRunners) {

            handleStop(targetHeat);

            stopAllSackTimers(); // Stop all sack timers when crawling sprint finishes

        }

    }

    saveState();

    render();

}



/**

 * Updates a comment for a specific runner's arrival in a heat.

 * @param {Event} event - The input event from the comment textarea.

 * @param {object} targetHeat - The heat object containing the arrival.

 */

function updateComment(event, targetHeat) {

    const index = parseInt(event.target.dataset.index);

    if (targetHeat.arrivals[index]) {

        targetHeat.arrivals[index].comment = event.target.value;

        saveState();

    }

}

function appendDNFsToHeat(targetHeat) {
    const activeSNs = state.runners
        .filter(r => r.shoulderNumber && !state.crawlingDrills.runnerStatuses[r.shoulderNumber])
        .map(r => r.shoulderNumber);

    const arrivedSet = new Set((targetHeat.arrivals || []).map(a => a.shoulderNumber));
    const missing = activeSNs.filter(sn => !arrivedSet.has(sn)).sort((a, b) => a - b);

    targetHeat.arrivals = targetHeat.arrivals || [];
    missing.forEach(sn => {
        targetHeat.arrivals.push({
            shoulderNumber: sn,
            finishTime: null,
            comment: 'לא סיים',
            status: 'active'
        });
    });
}

function confirmStopAndAdvance(targetHeat, context) {
    showModal(
        'אישור סיום',
        'לחיצה על "סיים" תפסיק את מדידת הזמן ותעבור למקצה הבא. משתתפים שלא סיימו יסומנו "לא סיים" ויקבלו ציון 1. להמשיך?',
        () => {
            // עצירת הטיימר וסימון סיום
            clearInterval(state.timer);
            state.isTimerRunning = false;
            targetHeat.finished = true;

            // הוספת DNF למי שלא הגיע
            appendDNFsToHeat(targetHeat);

            // שמירה
            saveState();

            // מעבר לפי הקשר
            if (context === 'sprint') {
                if (state.currentHeatIndex < CONFIG.NUM_HEATS - 1) {
                    state.currentHeatIndex++;
                } else {
                    state.currentPage = PAGES.CRAWLING_COMMENTS;
                }
            } else if (context === 'crawling') {
                // בסיום ספרינט זחילות: לעצור כל טיימרי שק
                stopAllSackTimers();
                if (state.crawlingDrills.currentSprintIndex < CONFIG.MAX_CRAWLING_SPRINTS - 1) {
                    state.crawlingDrills.currentSprintIndex++;
                } else {
                    state.currentPage = PAGES.STRETCHER_HEAT;
                    state.sociometricStretcher.currentHeatIndex = 0;
                }
            }

            render();
        }
    );
}
/**

 * Undoes the last runner arrival for the current heat/sprint.

 * @param {object} targetHeat - The heat or sprint object to modify.

 */

function handleUndoArrival(targetHeat) {

    if (targetHeat.arrivals.length > 0) {

        targetHeat.arrivals.pop(); // Remove the last arrival

        saveState();

        render();

    }

}



/**

 * Starts the main heat/sprint timer.

 * Prevents multiple timers from running simultaneously.

 */

function startTimer() {

    if (state.isTimerRunning) return; // Prevent starting if already running

    state.isTimerRunning = true;

    state.timer = setInterval(() => {

        const elapsedTime = Date.now() - state.startTime;

        // Determine whether to show milliseconds based on the current page

        const showMilliseconds = (state.currentPage === PAGES.HEATS);

        updateTimerDisplay(elapsedTime, showMilliseconds);

    }, 71); // V1.1 - Timer interval updated from 10ms to 71ms for performance

}



/**

 * Toggles a runner's status as a sack carrier in crawling drills.

 * Manages starting and stopping individual sack timers.

 * @param {Event} event - The click event from the sack carrier button.

 */

function handleSackCarrierToggle(event) {

    const shoulderNumber = parseInt(event.currentTarget.dataset.shoulderNumber);

    const index = state.crawlingDrills.activeSackCarriers.indexOf(shoulderNumber);

    const sackCarrierData = state.crawlingDrills.sackCarriers[shoulderNumber];



    if (index > -1) {

        // If already selected, deselect and stop timer

        if (sackCarrierData) {

            stopSackTimer(shoulderNumber);

            state.crawlingDrills.activeSackCarriers.splice(index, 1);

        }

    } else if (state.crawlingDrills.activeSackCarriers.length < CONFIG.MAX_SACK_CARRIERS) {

        // If not selected and limit not reached, select and start timer

        state.crawlingDrills.activeSackCarriers.push(shoulderNumber);

        if (!sackCarrierData) {

            // Initialize sack carrier data if first time

            state.crawlingDrills.sackCarriers[shoulderNumber] = { startTime: null, totalTime: 0, timerInterval: null };

        }

        state.crawlingDrills.sackCarriers[shoulderNumber].startTime = Date.now();

        startSackTimer(shoulderNumber);

    }

    saveState();

    render(); // Re-render to update button states

}



/**

 * Stops the individual sack timer for a specific runner.

 * Accumulates the elapsed time into totalTime.

 * @param {number} shoulderNumber - The shoulder number of the runner.

 */

function stopSackTimer(shoulderNumber) {

    const carrierData = state.crawlingDrills.sackCarriers[shoulderNumber];

    if (carrierData && carrierData.startTime) {

        carrierData.totalTime += Date.now() - carrierData.startTime; // Add current duration to total

        carrierData.startTime = null; // Reset start time

        clearInterval(carrierData.timerInterval); // Clear the interval

        carrierData.timerInterval = null;

    }

}



/**

 * Stops all active sack timers.

 * Called when transitioning away from the crawling comments page or when crawling sprint finishes.

 */

function stopAllSackTimers() {

    state.crawlingDrills.activeSackCarriers.forEach(stopSackTimer);

    state.crawlingDrills.activeSackCarriers = []; // Clear the list of active carriers

}



/**

 * Starts the individual sack timer for a specific runner.

 * @param {number} shoulderNumber - The shoulder number of the runner.

 */

function startSackTimer(shoulderNumber) {

    const carrierData = state.crawlingDrills.sackCarriers[shoulderNumber];

    if (!carrierData || carrierData.timerInterval) return; // Prevent starting if already running



    carrierData.timerInterval = setInterval(() => {

        const sackTimerDisplay = document.getElementById(`sack-timer-${shoulderNumber}`);

        if (sackTimerDisplay && carrierData.startTime) {

            // Update display with accumulated total time + current running time

            sackTimerDisplay.textContent = formatTime_no_ms(carrierData.totalTime + (Date.now() - carrierData.startTime));

        }

    }, 100); // Update every 100ms for sack timers

}



/**

 * Calculates the final sprint score for a runner as the average of per-heat relative scores.

 * Winner in a heat gets 7; others are proportional to (fastest / time). Min score per heat is 1.

 * @param {object} runner

 * @returns {number} Average rounded to nearest integer in [1..7]

 */


/**

 * Calculates the crawling sprint score for a given runner.

 * Similar to sprint score, but for crawling sprints.

 * @param {object} runner - The runner object.

 * @returns {number} The normalized crawling sprint score (1-7).

 */


/**

 * Calculates the sack carrying score for a given runner.

 * A longer sack carry time should result in a higher score.

 * @param {object} runner - The runner object.

 * @returns {number} The normalized sack carrying score (1-7).

 */

/**

 * Calculates the overall crawling drills final score for a given runner.

 * This combines sack carrying time and crawling sprint performance.

 * Updated for V1.11: 50% for crawling sprints, 50% for sack carry time.

 * @param {object} runner - The runner object.

 * @returns {number} The rounded average of sack score and crawling sprint score (1-7).

 */

/**

 * Calculates the sociometric final score based on the number of selections.

 * Stretcher carries are weighted higher than jerrican carries.

 * @param {object} runner - The runner object.

 * @returns {number} The normalized score (1-7).

 */

// --- Page Rendering ---

// ADDED: מגדיר את render כפונקציה גלובלית
window.render = renderPage;

/**

 * Main rendering function that clears the content and renders the appropriate page

 * based on the current state.currentPage.

 * Also manages global timer state and navigation tab highlighting.

 */
function recoverEvaluatorDetailsIfMissing() {
    // UPDATED: only try to recover evaluatorName; do NOT overwrite existing groupNumber unless explicitly cleared
    const clearedFlag = localStorage.getItem('groupNumberCleared') === '1';
    if (!state.evaluatorName) {
        try {
            const authSession = localStorage.getItem('gibushAuthState');
            if (authSession) {
                const session = JSON.parse(authSession);
                if (session?.authState?.evaluatorName) {
                    state.evaluatorName = session.authState.evaluatorName;
                }
            }
        } catch (e) { /* silent */ }
    }
    if (clearedFlag) {
        // user explicitly cleared group number previously
        state.groupNumber = '';
    }
    // If not clearedFlag we leave state.groupNumber as-is (no auto blanking)
}

// פונקציות אווטר ותפריט הועברו ל-js/utils/user-avatar.js

function renderPage() {
    recoverEvaluatorDetailsIfMissing();
    ensureDomRefs();
    
    // הוספת בדיקה למניעת לופ אינסופי
    if (!renderPage._retryCount) renderPage._retryCount = 0;
    
    if (!contentDiv) { 
        if (renderPage._retryCount < 10) {
            renderPage._retryCount++;
            setTimeout(() => {
                renderPage._retryCount = 0; // איפוס הקאונטר
                renderPage();
            }, 50); 
            return;
        } else {
            console.error('Failed to find content element after 10 retries');
            renderPage._retryCount = 0;
            return;
        }
    }

    const content = document.getElementById('content');
    if (!content) { 
        if (renderPage._retryCount < 10) {
            renderPage._retryCount++;
            setTimeout(() => {
                renderPage._retryCount = 0; // איפוס הקאונטר
                renderPage();
            }, 50); 
            return;
        } else {
            console.error('Failed to find content element after 10 retries');
            renderPage._retryCount = 0;
            return;
        }
    }

    // איפוס הקאונטר כשהכל בסדר
    renderPage._retryCount = 0;

    content.innerHTML = '';
    const footer = document.getElementById('footer-navigation');
    if (footer) footer.innerHTML = '';

    if (state.timer) clearInterval(state.timer);
    state.isTimerRunning = false;

    if (state.currentPage !== PAGES.CRAWLING_COMMENTS) stopAllSackTimers();

    // Handle quick comments visibility based on current page
    if (state.currentPage === 'runners') {
        document.body.classList.add('hide-quick-comments');
    } else {
        document.body.classList.remove('hide-quick-comments');
    }

    const shouldShowQuickBar =
    state.runners && state.runners.length > 0 &&
    state.currentPage !== PAGES.RUNNERS &&
    state.currentPage !== PAGES.AGGREGATED_DASHBOARD; // hide on aggregated dashboard

  const quickBarDiv = document.getElementById('quick-comment-bar-container');
  if (quickBarDiv) {
    if (!shouldShowQuickBar) {
        quickBarDiv.style.display = 'none';
    } else {
        quickBarDiv.style.display = '';
    }
  }
  window.QuickComments?.renderBar(shouldShowQuickBar);

    // סגנון לטאבים מבוטלים (מוזרק פעם אחת)
    if (!document.getElementById('nav-disabled-style')) {
        const s = document.createElement('style');
        s.id = 'nav-disabled-style';
        s.textContent = `
          .nav-tab.is-disabled { 
            opacity: .5; 
            cursor: not-allowed; 
          }
        `;
        document.head.appendChild(s);
    }

    // Update active navigation tab highlighting (modern)
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const isCurrent = tab.dataset.page === state.currentPage;

        // legacy toggles (left intact for compatibility)
        tab.classList.toggle('border-blue-500', isCurrent);
        tab.classList.toggle('text-blue-500', isCurrent);
        tab.classList.toggle('border-transparent', !isCurrent);
        tab.classList.toggle('text-gray-600', !isCurrent);

        // modern active state
        tab.classList.toggle('is-active', isCurrent);
        tab.setAttribute('aria-current', isCurrent ? 'page' : 'false');
    });

    // השבתת טאבים כשאין מתמודדים
    const noRunners = !state.runners || state.runners.length === 0;

    // הצגת/הסתרת לשונית דשבורד לפי הרשאת מנהל (לוג משופר + ניסיון חוזר)
    (function(){
        try {
            const li = document.getElementById('aggregated-dashboard-nav-item');
            if (!li) return;
            const email = (state?.authState?.googleUserInfo?.email || '').trim().toLowerCase();
            const isAdminFast = typeof USERS_CONFIG?.isAdmin === 'function' ? USERS_CONFIG.isAdmin(email) : false;
            const adminEmails = (window.USERS_CONFIG?.getAdminEmails?.() || []).map(e=>String(e||'').toLowerCase());
            const listEmpty = adminEmails.length === 0; // אם הרשימה ריקה – נניח מצב הגדרה לא נטען עדיין => הצג
            const isAuthorized = listEmpty || isAdminFast;
            li.style.display = isAuthorized ? '' : 'none';
            if (!window.__dashDebugLogged) {
                console.log('[Dashboard] email=', email, 'adminEmails=', adminEmails, 'listEmpty=', listEmpty, 'isAdminFast=', isAdminFast, 'show=', isAuthorized);
                window.__dashDebugLogged = true;
            }
            // ניסיון חוזר אם אין אימייל עדיין (טעינה מאוחרת) – עד 10 פעמים
            if (!email && !listEmpty) {
                let tries = 0;
                const retry = () => {
                    const em = (state?.authState?.googleUserInfo?.email || '').trim().toLowerCase();
                    if (em) {
                        const ok = listEmpty || USERS_CONFIG.isAdmin(em);
                        li.style.display = ok ? '' : 'none';
                        console.log('[Dashboard][retry] email=', em, 'ok=', ok);
                        return;
                    }
                    if (++tries < 10) setTimeout(retry, 300);
                };
                setTimeout(retry, 300);
            }
        } catch(e){ console.warn('aggregated dashboard tab toggle failed', e); }
    })();

    document.querySelectorAll('.nav-tab').forEach(tab => {
        const page = tab.dataset.page;
        let shouldDisable = false;
        const isDash = page === PAGES.AGGREGATED_DASHBOARD;
        const emailDash = (state?.authState?.googleUserInfo?.email || '').toLowerCase();
        const adminEmailsDash = (window.USERS_CONFIG?.getAdminEmails?.() || []).map(e=>String(e||'').toLowerCase());
        const dashAllowed = adminEmailsDash.length===0 || (emailDash && adminEmailsDash.includes(emailDash));
        // חסימה של עמודים אחרים ללא מתמודדים
        if (!dashAllowed && !state.runners?.length && page !== PAGES.RUNNERS) shouldDisable = true;
        // לפני התחלת מקצים – חסום הכל מלבד runners ו dashboard (if מורשה)
        if (!state.competitionStarted && !isDash && page !== PAGES.RUNNERS) shouldDisable = true;
        if (!dashAllowed && isDash) {
            shouldDisable = true; // דשבורד חסום if לא מורשה
        }
        tab.classList.toggle('is-disabled', shouldDisable);
        tab.setAttribute('aria-disabled', shouldDisable ? 'true' : 'false');
        if (shouldDisable) {
            tab.style.pointerEvents = 'none';
            if (isDash && !dashAllowed) tab.title = 'גישה לדשבורד רק למנהל מורשה';
            else if (!state.competitionStarted && !isDash && page !== PAGES.RUNNERS) tab.title = 'יש להתחיל מקצים';
            else if (!state.runners?.length && page !== PAGES.RUNNERS) tab.title = 'הוסף מתמודדים תחילה';
        } else {
            tab.style.pointerEvents = '';
            tab.removeAttribute('title');
        }
    });

    // Refresh tab structure/styles after toggling
    refreshNavigationTabs();

    // Dynamically update the stretcher page tab label from CONFIG
    const stretcherTab = document.querySelector('.nav-tab[data-page="sociometric-stretcher-heat"] span:last-child');
    if (stretcherTab) {
        stretcherTab.textContent = CONFIG.STRETCHER_PAGE_LABEL;
    }

    if (state.currentPage !== PAGES.STATUS_MANAGEMENT && state.currentPage !== PAGES.ADMIN_SETTINGS) {
        state.lastPage = state.currentPage;
    }

    // קריאה לפונקציה מ-user-avatar.js
    if (typeof window.UserAvatar?.ensureUserAvatar === 'function') {
        window.UserAvatar.ensureUserAvatar();
    }

    switch (state.currentPage) {
        case PAGES.RUNNERS: 
            setPageTitle('ניהול קבוצה');
            window.Pages.renderRunnersPage?.(); 
            break;
        case PAGES.ADMIN_SETTINGS: 
            setPageTitle('הגדרות מנהל');
            if (window.Pages?.renderAdminSettingsPage) {
                window.Pages.renderAdminSettingsPage();
            } else {
                console.warn('Admin settings page not ready');
            }
            break;
        case PAGES.STATUS_MANAGEMENT: 
            setPageTitle('ניהול סטטוס');
            window.Pages.renderStatusManagementPage?.(); 
            break;
        case PAGES.HEATS: 
            setPageTitle('ספרינטים');
            window.Pages.renderHeatPage?.(state.currentHeatIndex); 
            break;
        case PAGES.CRAWLING_COMMENTS: 
            setPageTitle('זחילה קבוצתית');
            window.Pages.renderCrawlingDrillsCommentsPage?.(); 
            break;
        case PAGES.CRAWLING_SPRINT: 
            setPageTitle('תחרות זחילות');
            window.Pages.renderCrawlingSprintPage?.(state.crawlingDrills.currentSprintIndex); 
            break;
        case PAGES.STRETCHER_HEAT: 
            setPageTitle('אלונקה סוציומטרית');
            window.Pages.renderSociometricStretcherHeatPage?.(state.sociometricStretcher?.currentHeatIndex || 0); 
            break;
        case PAGES.REPORT: 
            setPageTitle('דוח סיכום');
            if (state.__needsReportRefresh && typeof window.updateAllSprintScores === 'function') {
                try { window.updateAllSprintScores(); } catch(e){ console.warn('updateAllSprintScores before report render failed', e); }
                state.__needsReportRefresh = false;
            }
            window.Pages.renderReportPage?.(); 
            break;
        case PAGES.AGGREGATED_DASHBOARD:
            setPageTitle('דשבורד מאוחד');
            window.Pages.renderAggregatedDashboardPage?.();
            break;
    }
}

// ADDED: פונקציה פשוטה לקביעת כותרת
function setPageTitle(title) {
    if (headerTitle) {
        headerTitle.textContent = title;
    }
}

/**

 * Renders the "Runners" page, allowing management of runner shoulder numbers,

 * evaluator details, and app settings/backup.

 */

/**

 * Renders the "Admin Settings" page, allowing modification of core application configurations.

 * Warns the user that changes will reset all data.

 * @param {Event} event - The change event from the file input.

 */

/**
 * מצב עריכת רצים בתוך העמוד
 */

/**

 * Initializes the application by setting up navigation, loading state,

 * performing initial render, and starting the autosave timer.

 */

// NEW: פונקציה לבדיקת הרשאת משתמש לדשבורד
function isUserAuthorizedForDashboard() {
    try {
        const email = state?.authState?.googleUserInfo?.email;
        if (!email) return false;
        if (window.USERS_CONFIG?.isAdmin) return USERS_CONFIG.isAdmin(email);
        return false;
    } catch (e) {
        return false;
    }
}

async function init() {
    try { if ('wakeLock' in navigator) { /* no-op */ }} catch { /* Handle error if needed */ }

    // מאזין ניווט ראשי עם מניעת ברירת מחדל ועצירת טאבים מושבתים
    const navEl = document.querySelector('nav');
    if (navEl) {
        navEl.addEventListener('click', (e) => {
            const tab = e.target.closest('.nav-tab');
            if (!tab) return;
            e.preventDefault(); // מונע קפיצה/רענון של <a>

            // אל תלחץ if מושבת
            if (tab.classList.contains('is-disabled') || tab.getAttribute('aria-disabled') === 'true') return;

            const nextPage = tab.dataset.page;
            
            // NEW: חסימת ניווט לפני התחלת מקצים - עם חריג לדשבורד למנהלים מורשים
            if (!state.competitionStarted && nextPage !== PAGES.RUNNERS) {
                // if זה דשבורד ומשתמש מורשה - אפשר מעבר
                if (nextPage === PAGES.AGGREGATED_DASHBOARD && isUserAuthorizedForDashboard()) {
                    // עבור ישירות לדשבורד ללא חסימה
                } else {
                    showModal('התחלת מקצים נדרשת', 'לא ניתן לעבור לעמודים אחרים לפני התחלת המקצים. לחץ על "התחל מקצים" בעמוד ניהול הקבוצה.');
                    return;
                }
            }
            
            // NEW: בדיקה if יש מקצה פעיל שלא הסתיים
            if (state.currentPage === PAGES.HEATS && nextPage !== PAGES.HEATS) {
                const currentHeat = state.heats[state.currentHeatIndex];
                if (currentHeat && currentHeat.started && !currentHeat.finished) {
                    showModal('מקצה פעיל', 'יש לסיים את המקצה הנוכחי לפני המעבר לעמוד אחר. לחץ על "סיים" כדי לסיים את המקצה.');
                    return;
                }
            }
            
            // NEW: בדיקה לספרינטי זחילה
            if (state.currentPage === PAGES.CRAWLING_SPRINT && nextPage !== PAGES.CRAWLING_SPRINT) {
                const currentSprint = state.crawlingDrills?.sprints?.[state.crawlingDrills.currentSprintIndex];
                if (currentSprint && currentSprint.started && !currentSprint.finished) {
                    showModal('ספרינט זחילה פעיל', 'יש לסיים את ספרינט הזחילה הנוכחי לפני המעבר לעמוד אחר. לחץ על "סיים" כדי לסיים את הספרינט.');
                    return;
                }
            }
            
            const noRunners = !state.runners || state.runners.length === 0;
            // הגנה כפולה: לא לעבור למסכים הדורשים רצים
            const needsRunners = new Set([PAGES.HEATS, PAGES.CRAWLING_COMMENTS, PAGES.CRAWLING_SPRINT, PAGES.STRETCHER_HEAT, PAGES.REPORT]);
            if (noRunners && needsRunners.has(nextPage)) return;

            const go = () => { state.currentPage = nextPage; saveState(); renderPage(); };
            const intercepted = window.confirmLeaveCrawlingComments?.(go);
            if (!intercepted) go();
        });
    }

    // כפתור Theme
    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
        const modes = ['auto', 'light', 'dark'];
        const i = Math.max(0, modes.indexOf(state.themeMode));
        state.themeMode = modes[(i + 1) % modes.length];
        applyTheme();
        saveState();
        renderPage();
    });

    window.PWA?.setup();

    loadState();
    applyTheme();
    renderPage();
    
    // הוספת האווטר לאחר שהכל נטען
    setTimeout(() => {
        if (typeof window.UserAvatar?.ensureUserAvatar === 'function') {
            console.log('🎭 קורא ל-ensureUserAvatar מ-init');
            window.UserAvatar.ensureUserAvatar();
        }
    }, 100);
    
    setInterval(saveState, 60000);
}

// RESTORED: Theme application helper (was missing causing ReferenceError)
function applyTheme() {
    try {
        const root = document.documentElement;
        const mode = state.themeMode || 'auto';
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const resolved = (mode === 'auto') ? (prefersDark ? 'dark' : 'light') : mode;

        if (resolved === 'dark') root.classList.add('dark'); else root.classList.remove('dark');

        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            if (mode === 'auto') themeIcon.textContent = '🌓';
            else if (resolved === 'dark') themeIcon.textContent = '☀️';
            else themeIcon.textContent = '🌙';
            themeIcon.title = mode === 'auto'
                ? 'מצב אוטומטי'
                : (resolved === 'dark' ? 'מצב כהה' : 'מצב בהיר');
        }
    } catch (e) {
        console.warn('applyTheme failed', e);
    }
}

// Attach listener once for auto mode changes
(function attachThemeMediaListener(){
    if (window._themeMediaListenerAttached) return;
    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener?.('change', () => {
            if (state.themeMode === 'auto') applyTheme();
        });
    }
    window._themeMediaListenerAttached = true;
})();

window.Pages.renderRunnersPage ??= renderRunnersPage;
window.Pages.renderAdminSettingsPage ??= renderAdminSettingsPage;
window.Pages.renderStatusManagementPage ??= renderStatusManagementPage;
window.Pages.renderHeatPage ??= renderHeatPage;
window.Pages.renderCrawlingDrillsCommentsPage ??= renderCrawlingDrillsCommentsPage;
window.Pages.renderCrawlingSprintPage ??= renderCrawlingSprintPage;
window.Pages.renderReportPage ??= renderReportPage;
// Only bind stretcher page if it’s defined in this file
if (typeof renderSociometricStretcherHeatPage === 'function') {
    window.Pages.renderSociometricStretcherHeatPage ??= renderSociometricStretcherHeatPage;
}

// Initialize the application when the script loads
// init(); // הוסר – נקרא לאחר ש-DOM נטען
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => { 
        ensureDomRefs(); 
        init(); 

        // --- הוספת הקריאה החדשה ---
        // אחרי שכל האפליקציה מוכנה, חבר את המאזינים של דף הדוחות
        if (window.Pages && typeof window.Pages.initReportPageListeners === 'function') {
            window.Pages.initReportPageListeners();
        }
        // -------------------------
    });
} else {
    ensureDomRefs();
    init();
}

// ADDED: restore missing generateRandomRunners used by showAddRunnersModal
function generateRandomRunners(count) {
    try {
        const existing = new Set(state.runners.map(r => r.shoulderNumber));
        const maxAddable = Math.max(0, CONFIG.MAX_RUNNERS - existing.size);
        const toAdd = Math.min(maxAddable, count || maxAddable);
        if (toAdd <= 0) return;

        // Build pool of free numbers
        const pool = [];
        for (let n = 1; n <= 999; n++) {
            if (!existing.has(n)) pool.push(n);
        }
        // Fisher–Yates shuffle (partial)
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.random() * (i + 1) | 0;
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const selected = pool.slice(0, toAdd).map(n => ({ shoulderNumber: n }));
        state.runners = state.runners.concat(selected).sort((a, b) => a.shoulderNumber - b.shoulderNumber);
        saveState();
    } catch(e) {
        console.warn('generateRandomRunners failed', e);
    }
}

// === מנגנון שליחה אוטומטית של גיבוי ===
// Moved to js/utils/auto-backup-manager.js
// autoBackupManager is loaded from external file