/**
 * User Avatar Manager
 * מנהל את האווטר של המשתמש ותפריט הנפתח
 */

function ensureUserAvatar() {
    try {
        // מנגנון ניסיונות טעינה (גלובלי כדי שלא ייכנס ללופ אינסופי בין רינדורים)
        window.__avatarLoadAttempts = window.__avatarLoadAttempts || 0;
        const MAX_ATTEMPTS = 3;

        // מציאת הקונטיינר
        let avatarContainer = document.querySelector('#app header .flex.items-center.justify-between > div:first-child');
        if (!avatarContainer) {
            const headerInner = document.querySelector('#app > header.w-full');
            if (headerInner) {
                const flexContainer = headerInner.querySelector('.flex.items-center.justify-between');
                if (flexContainer) avatarContainer = flexContainer.querySelector('div:first-child');
            }
        }
        if (!avatarContainer) {
            console.warn('❌ לא נמצא מיכל אווטר');
            return;
        }

        // כפתור קיים או יצירה
        let avatarBtn = document.getElementById('user-avatar-btn');
        if (!avatarBtn) {
            avatarBtn = document.createElement('button');
            avatarBtn.id = 'user-avatar-btn';
            avatarBtn.className = 'avatar-btn-fixed';
            avatarBtn.title = 'תפריט משתמש';
            avatarBtn.innerHTML = '<span style="font-size:20px;color:#fff">👤</span>';
            avatarContainer.appendChild(avatarBtn);
            avatarBtn.addEventListener('click', onAvatarClick);
        }

        const method = window.state?.authState?.authMethod;
        const pictureUrl = (method === 'google') ? window.state?.authState?.googleUserInfo?.picture : '';

        // אם כבר יש תמונה מוצלחת – לא נטען שוב
        if (avatarBtn.querySelector('img')) {
            return;
        }

        // אם אין תמונת גוגל – נשאר עם אייקון (בלי לוג מידע)
        if (!pictureUrl) {
            if (!avatarBtn.querySelector('span')) {
                avatarBtn.innerHTML = '<span style="font-size:20px;color:#fff">👤</span>';
            }
            return;
        }

        // ניסיון טעינה מחזורי עד 3 פעמים
        const attemptLoad = () => {
            if (window.__avatarLoadAttempts >= MAX_ATTEMPTS) {
                console.warn('⚠️ טעינת אווטר נכשלה לאחר 3 ניסיונות');
                return;
            }
            window.__avatarLoadAttempts++;
            const img = new Image();
            img.onload = () => {
                // הצלחה – הצבת תמונה ושקט לוגי
                avatarBtn.innerHTML = '';
                img.alt = 'user';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '50%';
                avatarBtn.appendChild(img);
            };
            img.onerror = () => {
                // המתנה קצרה ונסיון חוזר
                setTimeout(attemptLoad, 400);
            };
            // הוספת פרמטר למניעת קאש בדפדפן אם כשל בניסיון קודם
            const cacheBuster = window.__avatarLoadAttempts > 1 ? ('?t=' + Date.now()) : '';
            img.src = pictureUrl + cacheBuster;
        };

        attemptLoad();
    } catch (e) {
        console.error('❌ שגיאת אווטר:', e);
    }
}

function onAvatarClick() {
    // בדיקה אם כבר קיים תפריט פתוח
    const existingMenu = document.getElementById('user-dropdown-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }

    // בדיקת מצב כהה
    const isDark = document.documentElement.classList.contains('dark');

    // יצירת תפריט נפתח
    const menu = document.createElement('div');
    menu.id = 'user-dropdown-menu';
    
    // סגנון דינמי לפי מצב לילה
    const menuBg = isDark ? '#1f2937' : 'white';
    const separatorColor = isDark ? '#374151' : '#e5e7eb';
    
    menu.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: ${menuBg};
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,${isDark ? '0.5' : '0.15'});
        z-index: 9999;
        min-width: 240px;
        overflow: hidden;
        animation: slideDown 0.2s ease-out;
    `;

    // בדיקת הרשאת מנהל
    const isAdmin = (() => {
        try {
            const email = window.state?.authState?.googleUserInfo?.email;
            if (!email) return false;
            return window.USERS_CONFIG?.isAdmin?.(email) || false;
        } catch (e) {
            return false;
        }
    })();

    // בדיקת משתמש אורח
    const isGuest = (() => {
        try {
            const saved = localStorage.getItem('gibushAuthState');
            if (!saved) return true;
            const session = JSON.parse(saved);
            return session?.authState?.authMethod === 'guest';
        } catch (e) {
            return true;
        }
    })();

    // יצירת תוכן התפריט
    const menuItems = [
        { id: 'admin-settings', icon: '⚙️', text: 'הגדרות מנהל', adminOnly: true },
        { id: 'reset-app', icon: '🔄', text: 'אפס אפליקציה', color: '#ef4444' },
        { id: 'update-app', icon: '⬇️', text: 'עדכון אפליקציה', color: '#2563eb' },
        { id: 'release-notes', icon: '📝', text: 'מה חדש?', color: '#0ea5e9' },
        { type: 'separator' },
        { id: 'backup-upload', icon: '☁️', text: 'שלח גיבוי למנהל', color: '#6366f1', guestHidden: true },
        { id: 'backup-download', icon: '💾', text: 'הורד גיבוי', color: '#8b5cf6' },
        { id: 'backup-import', icon: '📤', text: 'טען גיבוי', color: '#10b981' },
        { type: 'separator' },
        { id: 'logout', icon: '🚪', text: 'התנתק', color: '#dc2626' }
    ];

    menu.innerHTML = menuItems.map(item => {
        if (item.type === 'separator') {
            return `<div style="height:1px;background:${separatorColor};margin:4px 0;"></div>`;
        }
        
        // דילוג על פריטי מנהל if לא מנהל
        if (item.adminOnly && !isAdmin) {
            return '';
        }

        // דילוג על פריטים מוסתרים לאורחים
        if (item.guestHidden && isGuest) {
            return '';
        }

        const color = item.color || (isDark ? '#d1d5db' : '#374151');
        const hoverBg = isDark ? '#374151' : '#f3f4f6';
        
        return `
            <button 
                id="menu-${item.id}" 
                class="menu-item-btn"
                data-hover-bg="${hoverBg}"
                style="
                    width: 100%;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    color: ${color};
                    transition: background 0.15s;
                    text-align: right;
                "
            >
                <span style="font-size: 20px;">${item.icon}</span>
                <span style="flex: 1;">${item.text}</span>
            </button>
        `;
    }).join('');

    document.body.appendChild(menu);

    // הוספת אפקט hover דינמי לכפתורים
    menu.querySelectorAll('.menu-item-btn').forEach(btn => {
        const hoverBg = btn.dataset.hoverBg;
        btn.addEventListener('mouseenter', () => {
            btn.style.background = hoverBg;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'transparent';
        });
    });

    // סגירה בלחיצה מחוץ לתפריט
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && e.target.id !== 'user-avatar-btn') {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 0);

    // הוספת אנימציה
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    if (!document.getElementById('dropdown-animation-style')) {
        style.id = 'dropdown-animation-style';
        document.head.appendChild(style);
    }

    // חיבור מאזינים לכפתורים
    const handlers = {
        'admin-settings': window.handleAdminSettingsClick,
        'reset-app': handleResetApp,
        'update-app': handleUpdateApp,
        'release-notes': handleOpenReleaseNotes,
        'backup-upload': handleBackupUpload,
        'backup-download': handleBackupDownload,
        'backup-import': handleBackupImport,
        'logout': handleLogout
    };

    Object.entries(handlers).forEach(([id, handler]) => {
        const btn = document.getElementById(`menu-${id}`);
        if (btn && handler) {
            btn.addEventListener('click', () => {
                menu.remove();
                handler();
            });
        }
    });
}

// פונקציות טיפול באירועים
function handleResetApp() {
    window.showModal('איפוס אפליקציה', 'האם אתה בטוח? כל הנתונים יימחקו לצמיתות.', () => {
        // עצירת שליחה אוטומטית לפני איפוס
        if (window.autoBackupManager) {
            try { window.autoBackupManager.stop('איפוס אפליקציה'); } catch(e){}
        }
        // מחיקת נתוני מצב קיימים
        try { localStorage.removeItem(window.CONFIG.APP_STATE_KEY); } catch(e){}
        try { localStorage.removeItem('downloadedSystemSettings'); } catch(e){}
        try { sessionStorage.clear(); } catch(e){}

        // איפוס מצב בזיכרון
        if (typeof window.initializeAllData === 'function') window.initializeAllData();
        if (window.state) window.state.currentPage = window.PAGES.RUNNERS;
        if (typeof window.saveState === 'function') window.saveState();

        // ניסיון לנקות service workers ו-caches
        (async () => {
            try {
                if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map(r => r.unregister()));
                }
            } catch(e) { /* silent */ }
            try {
                if (window.caches) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                }
            } catch(e){ /* silent */ }
        })();

        // רינדור מחדש ואז פתיחת מודאל עריכת פרטי הקבוצה
        if (typeof window.renderPage === 'function') window.renderPage();
        setTimeout(() => {
            if (typeof window.showEditBasicDetailsModal === 'function') {
                try { window.showEditBasicDetailsModal(); } catch(e){ console.warn('פתיחת מודאל פרטי משתמש נכשלה', e); }
            }
        }, 60);
    });
}

async function handleClearCache() {
    if (!confirm('לנקות את כל ה-Cache של האפליקציה? פעולה זו תרענן את האפליקציה ותבטיח שכל העדכונים יוצגו.')) return;
    
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
    }
}

async function handleUpdateApp() {
    // סדר הפעולות כאן בכוונה:
    // 1. מורידים הגדרות מהשרת ושומרים ב-localStorage תחת 'downloadedSystemSettings'.
    //    פעולת הניקוי של המטמון (PWA.forceRefreshApp / fallback) אינה מנקה localStorage, רק caches + service workers + sessionStorage.
    //    לכן ההגדרות הישנות אינן מוחקות, והחדשות שומרות לפני הרענון.
    // 2. לאחר השמירה מתבצע ניקוי cache ורענון – בעת העלייה מחדש config.js יטעין את ההגדרות שזה עתה נשמרו.
    // אם בעתיד יתווסף ניקוי של localStorage בתוך ה-PWA, חובה לעדכן את הסדר (קודם ניקוי ואז הורדה ושמירה מחדש לפני reload).
    if (!confirm('לעדכן את האפליקציה ולהוריד הגדרות מעודכנות מהשרת? פעולה תנקה מטמון ותטען מחדש.')) return;
    let settings = null;
    try {
        settings = await window.GoogleDriveReader?.fetchSystemSettings();
        if (settings) {
            localStorage.setItem('downloadedSystemSettings', JSON.stringify(settings));
            console.log('✅ הגדרות עודכנו מהשרת ונשמרו ב-localStorage (יישמרו לאחר הניקוי)');
        } else {
            console.warn('⚠️ לא התקבלו הגדרות מהשרת, ממשיך עם הקיימות');
        }
        // שמירת הגרסה החדשה כמותקנת (ללא שינוי אם אין)
        if (window.APP_VERSION) {
            localStorage.setItem('appVersionInstalled', window.APP_VERSION);
        }
    } catch (e) {
        console.warn('⚠️ שגיאה בהורדת הגדרות מהשרת:', e);
    }
    try {
        if (window.PWA?.forceRefreshApp) {
            await window.PWA.forceRefreshApp();
        } else {
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
        console.error('שגיאה בעדכון אפליקציה:', error);
        alert('שגיאה בעדכון. נסה לרענן ידנית (Ctrl+Shift+R)');
    }
}

async function handleBackupUpload() {
    if (!window.CompactBackup) { 
        window.showModal('שגיאה','מודול גיבוי לא נטען'); 
        return; 
    }
    await window.CompactBackup.createAndUploadCompactBackup(window.showModal);
}

function handleOpenReleaseNotes() {
    try {
        const notesApi = window.ReleaseNotes;
        if (!notesApi || typeof notesApi.buildHtml !== 'function') {
            window.showModal?.('מה חדש?', 'לא נמצאו רשומות עדכון זמינות.', () => {}, false, null, {
                confirmText: 'סגור',
                cancelText: null,
                hideCancel: true
            });
            return;
        }

        const versions = typeof notesApi.collectVersions === 'function'
            ? notesApi.collectVersions(window.APP_VERSION, 1)
            : [];
        const targetVersion = window.APP_VERSION || (versions.length ? versions[0] : null);
        const releaseNotesHtml = notesApi.buildHtml({ version: targetVersion, includePrevious: 1 }) || '';

        if (!releaseNotesHtml) {
            window.showModal?.('מה חדש?', 'אין פרטי גרסה זמינים כרגע.', () => {}, false, null, {
                confirmText: 'סגור',
                cancelText: null,
                hideCancel: true
            });
            return;
        }

        window.showModal?.('מה חדש?', '', () => {}, false, null, {
            confirmText: 'סגור',
            cancelText: null,
            hideCancel: true,
            extraHtml: `<div style="margin-top:16px;text-align:right;direction:rtl;">${releaseNotesHtml}</div>`
        });
    } catch (error) {
        console.warn('Release notes modal failed', error);
        window.showModal?.('מה חדש?', 'אירעה שגיאה בטעינת פרטי הגרסה.', () => {}, false, null, {
            confirmText: 'סגור',
            cancelText: null,
            hideCancel: true
        });
    }
}

function handleBackupDownload() {
    if (!window.CompactBackup) { 
        window.showModal('שגיאה','מודול גיבוי לא נטען'); 
        return; 
    }
    window.CompactBackup.downloadLocal();
}

function handleBackupImport() {
    // יצירת input file חבוי
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    
    input.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            const txt = await file.text();
            let parsed;
            try { 
                parsed = JSON.parse(txt); 
            } catch(err) { 
                window.showModal('שגיאה','קובץ גיבוי לא תקין'); 
                return; 
            }
            
            if (!parsed) { 
                window.showModal('שגיאה','קובץ ריק'); 
                return; 
            }
            
            if (!confirm('לייבא את הגיבוי ולדרוס את הנתונים הנוכחיים?')) return;
            
            // קריאה לפונקציית שחזור
            if (typeof window.restoreFromCompactBackup === 'function') {
                window.restoreFromCompactBackup(parsed);
                window.showModal('הצלחה','הגיבוי נטען בהצלחה');
            } else {
                window.showModal('שגיאה','פונקציית שחזור לא זמינה');
            }
        } catch(err) {
            console.error('Import compact backup failed', err);
            window.showModal('שגיאה','ייבוא נכשל');
        } finally {
            input.remove();
        }
    });
    
    document.body.appendChild(input);
    input.click();
}

function handleLogout() {
    window.showModal('יציאה מהמערכת', 'האם לצאת ולמחוק את כל נתוני הגיבוש?', () => {
        try {
            // עצירת שליחה אוטומטית לפני יציאה
            if (window.autoBackupManager) {
                window.autoBackupManager.stop('יציאה מהמערכת');
            }
            
            // ניקוי כל המפתחות הרלוונטיים
            localStorage.removeItem('gibushAuthState');
            localStorage.removeItem('gibushAppState');
            localStorage.removeItem('evaluatorDetails');
            localStorage.removeItem(window.CONFIG?.APP_STATE_KEY || 'gibushAppState');
            localStorage.clear();
        } catch(e) { 
            console.warn('logout clear error', e); 
        }
        // הפניה לעמוד הנחיתה
        window.location.href = 'landing.html';
    });
}

// ייצוא לשימוש גלובלי - תחת namespace UserAvatar
window.UserAvatar = window.UserAvatar || {};
window.UserAvatar.ensureUserAvatar = ensureUserAvatar;
window.UserAvatar.onAvatarClick = onAvatarClick;

// גם ייצוא ישיר לתאימות לאחור
window.ensureUserAvatar = ensureUserAvatar;
window.onAvatarClick = onAvatarClick;

// חשיפה לגלובל לשימוש בבאנר
window.handleUpdateApp = window.handleUpdateApp || handleUpdateApp;
window.handleOpenReleaseNotes = window.handleOpenReleaseNotes || handleOpenReleaseNotes;
