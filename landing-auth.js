/**
 * מנהל התחברות לעמוד הנחיתה
 * Landing Page Authentication Manager
 */

class LandingAuthManager {
    constructor() {
        this.config = window.LANDING_CONFIG;
        this.isInitialized = false;
        this.currentUser = null;
        this.loginAttempts = 0;
        
        this.init();
    }

    /**
     * אתחול המערכת
     */
    async init() {
        try {
            // בדיקה if המשתמש כבר מחובר
            if (this.checkExistingSession()) {
                return; // כבר מחובר, לא צריך להמשיך
            }
            
            // אתחול Google Sign-In
            await this.initGoogleSignIn();
            
            // אתחול event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ שגיאה באתחול מערכת ההתחברות:', error);
            this.showError('שגיאה באתחול המערכת. אנא רענן את העמוד.');
        }
    }

    /**
     * בדיקת סשן קיים
     */
    checkExistingSession() {
        try {
            const savedSession = localStorage.getItem('gibushAuthState');
            if (savedSession) {
                const session = JSON.parse(savedSession);
                
                // בדיקה if הסשן תקף
                if (this.isSessionValid(session)) {
                    this.redirectToApp();
                    return true;
                }
                
                // סשן לא תקף - נמחק
                localStorage.removeItem('gibushAuthState');
            }
        } catch (error) {
            console.warn('⚠️ שגיאה בבדיקת סשן קיים:', error);
            localStorage.removeItem('gibushAuthState');
        }
        
        return false;
    }

    /**
     * בדיקה if סשן תקף
     */
    isSessionValid(session) {
        if (!session || !session.authState) return false;
        
        const now = Date.now();
        const sessionTime = session.timestamp || 0;
        const timeout = 24 * 60 * 60 * 1000; // 24 שעות
        
        return (now - sessionTime) < timeout;
    }

    /**
     * אתחול Google Sign-In
     */
    async initGoogleSignIn() {
        return new Promise((resolve) => {
            // המתנה לטעינת Google API
            const checkGoogleAPI = () => {
                if (typeof google !== 'undefined' && google.accounts) {
                    try {
                        // אתחול Google Identity Services
                        google.accounts.id.initialize({
                            client_id: this.config.googleClientId,
                            callback: this.handleGoogleCallback.bind(this),
                            auto_select: false,
                            cancel_on_tap_outside: true,
                            ux_mode: 'popup'
                        });

                        // רינדור כפתור ההתחברות - ללא שינויים נוספים
                        google.accounts.id.renderButton(
                            document.getElementById('googleSignInDiv'),
                            {
                                type: 'standard',
                                shape: 'rectangular',
                                theme: 'outline',
                                text: 'signin_with',
                                size: 'large',
                                logo_alignment: 'left',
                                width: '100%',
                                locale: 'he'
                            }
                        );

                        resolve();
                        
                    } catch (error) {
                        console.error('❌ שגיאה באתחול Google Sign-In:', error);
                        this.showDevelopmentGoogleButton();
                        resolve(); // ממשיכים גם במקרה של שגיאה
                    }
                } else {
                    // נסה שוב אחרי זמן קצר
                    setTimeout(checkGoogleAPI, 100);
                }
            };
            
            checkGoogleAPI();
            
            // timeout אחרי 10 שניות
            setTimeout(() => {
                if (!this.isInitialized) {
                    console.warn('⚠️ Google API לא נטען, מציג כפתור פיתוח');
                    this.showDevelopmentGoogleButton();
                    resolve();
                }
            }, 10000);
        });
    }

    /**
     * הצגת כפתור פיתוח לGoogle
     */
    showDevelopmentGoogleButton() {
        const container = document.getElementById('googleSignInDiv');
        if (container) {
            container.innerHTML = `
                <button id="devGoogleBtn" class="google-btn btn-ripple w-full flex items-center justify-center gap-3">
                    <svg class="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>התחבר עם Google (מצב פיתוח)</span>
                </button>
            `;
            
            document.getElementById('devGoogleBtn').addEventListener('click', () => {
                this.simulateGoogleLogin();
            });
        }
    }

    /**
     * הדמיה להתחברות Google (למצב פיתוח)
     */
    simulateGoogleLogin() {
        const mockUser = {
            name: 'משתמש לדוגמה',
            email: 'test@example.com',
            picture: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Mjg1RjQiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMkM4IDEyIDggOCAxMlMxNiA4IDE2IDEyUzEzIDE2IDEyIDE2UzggMTYgOCAxMloiLz4KPC9zdmc+Cjwvc3ZnPg==',
            verified_email: true
        };
        
        this.processGoogleUser(mockUser);
    }

    /**
     * טיפול בתגובה מGoogle
     */
    async handleGoogleCallback(response) {
        try {
            this.showLoading(true);
            
            // פענוח JWT Token
            const token = response.credential;
            const payload = JSON.parse(atob(token.split('.')[1]));
            
            // תיקון קידוד UTF-8 if נדרש
            const fixedName = this.fixUTF8Encoding(payload.name);
            const fixedEmail = this.fixUTF8Encoding(payload.email);
            
            const userInfo = {
                ...payload,
                name: fixedName,
                email: fixedEmail
            };
            
            // **שלב חדש: הורדת וטעינת הגדרות המערכת לפני בדיקת הרשאות**
            await this.downloadAndUpdateSettings();
            
            // עכשיו מעבד את המשתמש עם ההגדרות המעודכנות
            this.processGoogleUser(userInfo);
            
        } catch (error) {
            console.error('❌ שגיאה בעיבוד תגובת Google:', error);
            this.showError('שגיאה בעיבוד פרטי ההתחברות מGoogle');
            this.showLoading(false);
        }
    }

    /**
     * הורדה ועדכון הגדרות המערכת מ-Google Drive
     */
    async downloadAndUpdateSettings() {
        try {
            // בדיקה if השירות קיים
            if (!window.GoogleDriveReader || !window.GoogleDriveReader.fetchSystemSettings) {
                console.warn('⚠️ GoogleDriveReader לא זמין, ממשיך עם הגדרות מקומיות');
                return false;
            }
            
            // הורדת ההגדרות
            const settings = await window.GoogleDriveReader.fetchSystemSettings();
            
            if (!settings) {
                return false;
            }
            
            // עדכון הגדרות תרגילים
            if (settings.exerciseSettings && window.CONFIG) {
                Object.assign(window.CONFIG, settings.exerciseSettings);
            }
            
            // עדכון הגדרות גיבוי
            if (settings.backupSettings && window.CONFIG) {
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
            
            // **עדכון הערות מהירות מהדרייב (quickComments) - חדש!**
            if (settings.quickComments && window.CONFIG) {
                const qc = settings.quickComments;
                // וידוא מבנה
                const sanitizeArr = (arr) => Array.isArray(arr) ? arr.map(s => String(s||'').trim()).filter(Boolean) : [];
                window.CONFIG.CRAWLING_GROUP_COMMON_COMMENTS = {
                    good: sanitizeArr(qc.good),
                    neutral: sanitizeArr(qc.neutral),
                    bad: sanitizeArr(qc.bad)
                };
            }
            
            // **עדכון משתמשים מורשים - ההגדרות כבר נשמרו ב-localStorage**
            // USERS_CONFIG קורא אותם דינמית דרך getter, אין צורך בדריסה
            // שימו לב: המבנה יכול להיות settings.userManagement.authorizedUsers או settings.users
            let usersArray = null;
            
            if (settings.userManagement && Array.isArray(settings.userManagement.authorizedUsers)) {
                usersArray = settings.userManagement.authorizedUsers;
            } else if (Array.isArray(settings.users)) {
                usersArray = settings.users;
            }
            
            if (!usersArray) {
                console.warn('⚠️ לא נמצאו משתמשים בהגדרות שהורדו');
            }
            
            // שמירת ההגדרות המעודכנות ב-localStorage
            try {
                localStorage.setItem('downloadedSystemSettings', JSON.stringify(settings));
                localStorage.setItem('settingsLastUpdated', new Date().toISOString());
            } catch (e) {
                console.warn('⚠️ לא ניתן לשמור הגדרות ב-localStorage:', e);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ שגיאה בהורדה ועדכון הגדרות:', error);
            return false;
        }
    }

    /**
     * קבלת שם המשתמש מקובץ ההגדרות על פי המייל
     * @param {string} email - כתובת המייל
     * @returns {string|null} - השם של המשתמש או null
     */
    getUserNameFromSettings(email) {
        if (!email || !window.USERS_CONFIG) return null;
        
        const user = window.USERS_CONFIG.getUserByEmail(email);
        return user ? user.name : null;
    }

    /**
     * תיקון קידוד UTF-8 עבור טקסט שמגיע מGoogle
     */
    fixUTF8Encoding(text) {
        if (!text || typeof text !== 'string') return text;
        
        try {
            // בדיקה if הטקסט כבר תקין
            if (this.isValidUTF8(text)) {
                return text;
            }
            
            // ניסיון תיקון קידוד - מספר שיטות
            
            // שיטה 1: תיקון Latin-1 ל-UTF-8
            try {
                const fixed1 = decodeURIComponent(escape(text));
                if (this.isValidUTF8(fixed1) && fixed1 !== text) {
                    return fixed1;
                }
            } catch (e) { /* ignore */ }
            
            // שיטה 2: תיקון bytes שגויים
            try {
                const fixed2 = text
                    .replace(/Â/g, '')
                    .replace(/×/g, '')
                    .replace(/יב/g, 'חי')
                    .replace(/×¨/g, 'ר')
                    .replace(/ש/g, 'ש');
                    
                if (fixed2 !== text) {
                    return fixed2;
                }
            } catch (e) { /* ignore */ }
            
            // שיטה 3: ניקוי תווים לא תקינים
            try {
                const fixed3 = text.replace(/[^\u0000-\u007F\u0590-\u05FF\u200E\u200F]/g, '');
                if (fixed3 !== text) {
                    return fixed3;
                }
            } catch (e) { /* ignore */ }
            
            console.warn('⚠️ לא ניתן לתקן את הקידוד:', text);
            return text;
            
        } catch (error) {
            console.error('❌ שגיאה בתיקון קידוד:', error);
            return text;
        }
    }

    /**
     * בדיקה if הטקסט הוא UTF-8 תקין
     */
    isValidUTF8(text) {
        if (!text || typeof text !== 'string') return false;
        
        try {
            // בדיקה if יש תווים לא תקינים
            const hasInvalidChars = /[Â×]/.test(text);
            const hasValidHebrew = /[\u0590-\u05FF]/.test(text);
            const hasValidLatin = /[a-zA-Z]/.test(text);
            
            // if יש עברית או לטינית ללא תווים לא תקינים - זה בסדר
            return (hasValidHebrew || hasValidLatin) && !hasInvalidChars;
        } catch (e) {
            return false;
        }
    }

    /**
     * עיבוד פרטי משתמש מGoogle
     */
    processGoogleUser(userInfo) {
        try {
            // **בדיקת הגדרות גישה - תיקון לוגיקה!**
            const dsRaw = localStorage.getItem('downloadedSystemSettings');
            const dsObj = dsRaw ? JSON.parse(dsRaw) : {};
            
            // האם המערכת במצב "אורחים ומנהלים בלבד"?
            // כאשר guestsAndAdminsOnly = true, רק מנהלים ואורחים יכולים להיכנס
            const guestsAndAdminsOnly = dsObj.appAccess?.guestsAndAdminsOnly === true;
            
            // בדיקה אם המשתמש הוא מנהל או אורח
            const user = window.USERS_CONFIG?.getUserByEmail(userInfo.email);
            const isAdmin = user?.isAdmin || false;
            const isGuest = user?.isGuest || false;
            
            // אם המצב הוא "אורחים ומנהלים בלבד" והמשתמש לא מנהל ולא אורח - חסום!
            if (guestsAndAdminsOnly && !isAdmin && !isGuest) {
                console.warn('🚫 גישה חסומה - מצב אורחים ומנהלים בלבד');
                this.showError('⛔ גישה מוגבלת\n\nהמערכת פתוחה כעת רק לאורחים ומנהלים מורשים.\n\nאם אתה צריך גישה, פנה למנהל המערכת.');
                this.showLoading(false);
                return;
            }
            
            // סדר עדיפויות חדש לשם תצוגה: 1) מהדרייב (USERS_CONFIG) 2) מהקונפיגורציה/LocalStorage 3) מגוגל 4) ברירת מחדל
            const driveName = this.getUserNameFromSettings(userInfo.email);
            const configStoredName = localStorage.getItem('evaluatorNameFromSettings') || window.CONFIG?.evaluatorNameFromSettings || null;
            const googleName = userInfo.name; // לא נשתמש אם יש מקור קודם
            const nameForDisplay = driveName || configStoredName || googleName || 'מנהל';

            // שמירת פרטי משתמש
            const authState = {
                authState: {
                    isAuthenticated: true,
                    authMethod: 'google',
                    googleUserInfo: {
                        name: userInfo.name,
                        email: userInfo.email,
                        picture: userInfo.picture,
                        verified: userInfo.email_verified || userInfo.verified_email,
                        isAdmin: isAdmin // שמירת מצב מנהל
                    },
                    isInitialSetupComplete: isAdmin ? true : false,
                    evaluatorName: isAdmin ? nameForDisplay : undefined,
                    groupNumber: undefined
                },
                timestamp: Date.now(),
                sessionId: this.generateSessionId()
            };
            
            // שמירה ב-localStorage
            localStorage.setItem('gibushAuthState', JSON.stringify(authState));
            
            // אם מנהל – נוודא גם שמירת evaluatorName ב-localStorage הראשי (למקרה שהאפליקציה מצפה)
            if (isAdmin) {
                try {
                    const existingAppStateRaw = localStorage.getItem('gibushAppState');
                    let appState = {};
                    if (existingAppStateRaw) {
                        const parsed = JSON.parse(existingAppStateRaw);
                        appState = parsed.appState || parsed;
                    }
                    appState.evaluatorName = driveName || configStoredName || googleName || 'מנהל';
                    // להסיר מספר קבוצה למנהל - נשאר ריק
                    // appState.groupNumber = 'ADMIN';
                    const fullState = { config: appState.config || {}, appState };
                    localStorage.setItem('gibushAppState', JSON.stringify(fullState));
                } catch(e){ /* silent */ }
            }
            
            // הצגת הודעת הצלחה ומעבר
            this.showSuccessAndRedirect(`ברוך הבא, ${nameForDisplay}!`);
            
        } catch (error) {
            console.error('❌ שגיאה בעיבוד פרטי משתמש:', error);
            this.showError('שגיאה בשמירת פרטי ההתחברות');
            this.showLoading(false);
        }
    }

    /**
     * טיפול בכניסת אורח
     */
    handleGuestLogin() {
        try {
            this.showLoading(true);
            
            const authState = {
                authState: {
                    isAuthenticated: true,
                    authMethod: 'guest',
                    googleUserInfo: null,
                    isInitialSetupComplete: false
                },
                timestamp: Date.now(),
                sessionId: this.generateSessionId()
            };
            
            // שמירה ב-localStorage
            localStorage.setItem('gibushAuthState', JSON.stringify(authState));
            
            // הצגת הודעת הצלחה ומעבר
            this.showSuccessAndRedirect('נכנסת כאורח');
            
        } catch (error) {
            console.error('❌ שגיאה בכניסת אורח:', error);
            this.showError('שגיאה בכניסת אורח');
            this.showLoading(false);
        }
    }

    /**
     * יצירת מזהה סשן ייחודי
     */
    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    /**
     * הצגת הודעת הצלחה ומעבר לאפליקציה
     */
    showSuccessAndRedirect(message) {
        // עדכון מסך הטעינה
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = loadingOverlay.querySelector('p');
        
        if (loadingText) {
            loadingText.textContent = message;
            loadingText.style.color = '#10b981'; // ירוק
        }
        
        // זיהוי אם המשתמש הוא מנהל – במקרה כזה דילוג על חלון פרטי הקבוצה
        const isAdmin = (() => {
            try {
                const st = JSON.parse(localStorage.getItem('gibushAuthState'));
                return !!st?.authState?.googleUserInfo?.isAdmin;
            } catch(e){ return false; }
        })();
        
        if (isAdmin) {
            setTimeout(() => { 
                this.showLoading(false); 
                this.redirectToApp(); 
            }, 600);
            return;
        }
        
        // משתמש רגיל / אורח – ממשיכים לשלב פרטי הקבוצה
        setTimeout(() => {
            this.showLoading(false);
            this.showGroupSetupModal();
        }, 800);
    }

    /**
     * הצגת חלון הגדרת פרטי קבוצה
     */
    showGroupSetupModal() {
        const modal = document.getElementById('groupSetupModal');
        let evaluatorNameInput = document.getElementById('evaluatorName');
        let groupNumberInput = document.getElementById('groupNumber');
        let saveBtn = document.getElementById('saveGroupDetailsBtn');
        const errorDiv = document.getElementById('groupSetupError');

        // קבלת מצב האימות הנוכחי
        const savedSession = localStorage.getItem('gibushAuthState');
        if (!savedSession) return;
        
        const session = JSON.parse(savedSession);
        const authState = session.authState;

        // **שינוי: מילוי אוטומטי של שם המעריך מקובץ ההגדרות**
        // סדר עדיפות: 1. קובץ הגדרות מהדרייב, 2. שדה ריק להזנה ידנית
        if (authState.googleUserInfo && authState.googleUserInfo.email) {
            const userNameFromSettings = this.getUserNameFromSettings(authState.googleUserInfo.email);
            if (userNameFromSettings) {
                evaluatorNameInput.value = userNameFromSettings;
                
                // **חדש: שמירה מיידית של השם ב-localStorage כדי שיהיה זמין לאפליקציה**
                try {
                    localStorage.setItem('evaluatorNameFromSettings', userNameFromSettings);
                } catch (e) {
                    console.warn('⚠️ לא ניתן לשמור שם מעריך:', e);
                }
            }
        }

        // הגבלת הזנה למספרי קבוצה (מספרים בלבד עד 999)
        groupNumberInput.setAttribute('type', 'number');
        groupNumberInput.setAttribute('min', '1');
        groupNumberInput.setAttribute('max', '999');
        groupNumberInput.setAttribute('pattern', '[0-9]*');
        
        // מניעת הזנת תווים לא חוקיים
        groupNumberInput.addEventListener('input', function(e) {
            let value = e.target.value;
            // הסרת תווים לא מספריים
            value = value.replace(/[^0-9]/g, '');
            // הגבלה ל-3 ספרות
            if (value.length > 3) {
                value = value.substring(0, 3);
            }
            // הגבלה לערך מקסימלי של 999
            if (parseInt(value) > 999) {
                value = '999';
            }
            e.target.value = value;
        });

        // הצג את המודל
        modal.classList.remove('hidden');
        
        // Focus על השדה הראשון הריק
        if (evaluatorNameInput.value) {
            groupNumberInput.focus();
        } else {
            evaluatorNameInput.focus();
        }

        // הסרת event listeners קודמים כדי למנוע כפילויות
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        
        // עדכון ההפניות לאלמנטים החדשים
        const newEvaluatorNameInput = evaluatorNameInput.cloneNode(true);
        evaluatorNameInput.parentNode.replaceChild(newEvaluatorNameInput, evaluatorNameInput);
        
        const newGroupNumberInput = groupNumberInput.cloneNode(true);
        groupNumberInput.parentNode.replaceChild(newGroupNumberInput, groupNumberInput);
        
        // עדכון ההפניות
        evaluatorNameInput = newEvaluatorNameInput;
        groupNumberInput = newGroupNumberInput;
        saveBtn = newSaveBtn;

        // הגדרת הגבלות מחדש לשדה החדש
        groupNumberInput.setAttribute('type', 'number');
        groupNumberInput.setAttribute('min', '1');
        groupNumberInput.setAttribute('max', '999');
        groupNumberInput.setAttribute('pattern', '[0-9]*');
        
        groupNumberInput.addEventListener('input', function(e) {
            let value = e.target.value;
            value = value.replace(/[^0-9]/g, '');
            if (value.length > 3) {
                value = value.substring(0, 3);
            }
            if (parseInt(value) > 999) {
                value = '999';
            }
            e.target.value = value;
        });

        // מאזין לכפתור שמירה
        saveBtn.addEventListener('click', () => {
            const evaluatorNameValue = evaluatorNameInput.value.trim();
            const groupNumberValue = groupNumberInput.value.trim();

            // בדיקת תקינות משופרת
            if (!evaluatorNameValue) {
                this.showGroupSetupError('יש להזין שם מעריך');
                evaluatorNameInput.focus();
                return;
            }
            
            if (!groupNumberValue) {
                this.showGroupSetupError('יש להזין מספר קבוצה');
                groupNumberInput.focus();
                return;
            }

            const groupNum = parseInt(groupNumberValue);
            if (isNaN(groupNum) || groupNum < 1 || groupNum > 999) {
                this.showGroupSetupError('מספר קבוצה חייב להיות בין 1 ל-999');
                groupNumberInput.focus();
                return;
            }

            // **שימוש בשם שהמשתמש הזין (או השם מהדרייב שהוצג כברירת מחדל)**
            // עדכון מצב האימות
            authState.evaluatorName = evaluatorNameValue;
            authState.groupNumber = groupNumberValue;
            authState.isInitialSetupComplete = true;

            // שמירה מעודכנת במצב האימות
            const updatedSession = {
                ...session,
                authState: authState
            };
            localStorage.setItem('gibushAuthState', JSON.stringify(updatedSession));

            // **שמירה גם במקום הייעודי לשם מהגדרות**
            try {
                localStorage.setItem('evaluatorNameFromSettings', evaluatorNameValue);
            } catch (e) {
                console.warn('⚠️ לא ניתן לשמור evaluatorNameFromSettings:', e);
            }

            // שמירת הפרטים גם ב-localStorage הרגיל של האפליקציה
            try {
                const existingAppState = localStorage.getItem('gibushAppState');
                let appState = {};
                
                if (existingAppState) {
                    const parsed = JSON.parse(existingAppState);
                    appState = parsed.appState || parsed;
                }
                
                // עדכון הפרטים
                appState.evaluatorName = evaluatorNameValue;
                appState.groupNumber = groupNumberValue;
                
                // שמירה
                const fullState = {
                    config: appState.config || {},
                    appState: appState
                };
                localStorage.setItem('gibushAppState', JSON.stringify(fullState));
                
            } catch (error) {
                console.warn('⚠️ שגיאה בשמירת פרטי קבוצה:', error);
            }

            // מעבר לאפליקציה הראשית
            this.redirectToApp();
        });

        // מאזין לכפתור X - חזרה לדף ההתחברות
        const backBtn = document.getElementById('backToLoginBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // הסתרת המודל
                modal.classList.add('hidden');
                
                // מחיקת מצב האימות
                localStorage.removeItem('gibushAuthState');
                
            });
        }

        // מאזינים ל-Enter
        evaluatorNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                groupNumberInput.focus();
            }
        });

        groupNumberInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveBtn.click();
            }
        });
    }

    /**
     * הצגת שגיאה בחלון הגדרת קבוצה
     */
    showGroupSetupError(message) {
        const errorDiv = document.getElementById('groupSetupError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
            
            // הסתרה אוטומטית אחרי 5 שניות
            setTimeout(() => {
                errorDiv.classList.add('hidden');
            }, 5000);
        }
    }

    /**
     * מעבר לאפליקציה הראשית
     */
    redirectToApp() {
        // מעבר ל-index.html (האפליקציה הראשית)
        window.location.href = './index.html';
    }

    /**
     * הצגת/הסתרת מסך טעינה
     */
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            if (show) {
                overlay.classList.add('show');
            } else {
                overlay.classList.remove('show');
            }
        }
    }

    /**
     * הצגת הודעת שגיאה
     */
    showError(message) {
        console.error('❌', message);
        
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.innerHTML = `<div class="error-message">${message}</div>`;
            errorDiv.classList.remove('hidden');
            
            // הסתרה אוטומטית אחרי 5 שניות
            setTimeout(() => {
                errorDiv.classList.add('hidden');
            }, 5000);
        }
        
        // עלייה במונה ניסיונות
        this.loginAttempts++;
        
        // בלוק זמני אחרי מספר ניסיונות כושלים
        if (this.config.security?.maxLoginAttempts && this.loginAttempts >= this.config.security.maxLoginAttempts) {
            this.blockLoginTemporarily();
        }
    }

    /**
     * בלוק זמני של התחברות
     */
    blockLoginTemporarily() {
        console.warn('🔒 חסימה זמנית עקב ניסיונות התחברות כושלים');
        
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);
        
        this.showError('חסימה זמנית עקב ניסיונות התחברות כושלים. נסה שוב בעוד דקה.');
        
        // שחרור אחרי דקה
        setTimeout(() => {
            buttons.forEach(btn => btn.disabled = false);
            this.loginAttempts = 0;
        }, 60000);
    }

    /**
     * הגדרת event listeners
     */
    setupEventListeners() {
        // כפתור כניסת אורח
        const guestBtn = document.getElementById('guestLoginBtn');
        if (guestBtn) {
            guestBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleGuestLogin();
            });
        }
        
        // מניעת טופס submission
        document.addEventListener('submit', (e) => {
            e.preventDefault();
        });
        
        // בדיקת מקלדת (Enter על כפתורים)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const activeElement = document.activeElement;
                if (activeElement && activeElement.tagName === 'BUTTON') {
                    activeElement.click();
                }
            }
        });
    }
}

/**
 * אתחול מנהל ההתחברות
 */
document.addEventListener('DOMContentLoaded', () => {
    // יצירת instance של מנהל ההתחברות
    window.authManager = new LandingAuthManager();
    
});