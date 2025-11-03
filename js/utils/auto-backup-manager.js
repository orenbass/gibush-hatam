/**
 * Auto Backup Manager
 * מנגנון שליחה אוטומטית של גיבוי
 */

const autoBackupManager = {
    // פונקציה לשליחת גיבוי אוטומטי
    async performAutoUpload() {
        try {
            console.log('🤖 מבצע שליחה אוטומטית של גיבוי...');
            
            // שימוש באותה פונקציה כמו הכפתור הידני
            if (typeof window.CompactBackup?.uploadCompactBackup === 'function') {
                const result = await window.CompactBackup.uploadCompactBackup();
                
                if (result.status === 'success') {
                    window.state.autoBackupUpload.lastUploadTime = Date.now();
                    window.state.autoBackupUpload.uploadCount++;
                    console.log('✅ שליחה אוטומטית הצליחה');
                } else {
                    console.warn('⚠️ שליחה אוטומטית נכשלה:', result.message);
                }
            } else {
                console.warn('⚠️ מערכת גיבוי קומפקטי לא זמינה');
            }
        } catch (error) {
            console.error('❌ שגיאה בשליחה אוטומטית:', error);
        }
    },

    // התחלת שליחה אוטומטית
    start() {
        if (!window.CONFIG.AUTO_BACKUP_UPLOAD_ENABLED) {
            console.log('🚫 שליחה אוטומטית מושבתת בקונפיגורציה');
            return;
        }

        // חסימת שליחה אוטומטית במצב אורח
        if (this.isGuestUser()) {
            console.log('🚫 שליחה אוטומטית לא פעילה במצב אורח');
            return;
        }

        if (window.state.autoBackupUpload.isActive) {
            console.log('⚠️ שליחה אוטומטית כבר פעילה');
            return;
        }

        console.log('🚀 מתחיל שליחה אוטומטית של גיבוי...');
        
        window.state.autoBackupUpload.isActive = true;
        window.state.autoBackupUpload.startTime = Date.now();
        window.state.autoBackupUpload.hasBeenManuallyStopped = false;
        window.state.autoBackupUpload.uploadCount = 0;

        // ביצוע שליחה ראשונה מיד
        this.performAutoUpload();

        // קביעת interval לשליחות נוספות
        window.state.autoBackupUpload.intervalId = setInterval(() => {
            if (!window.state.autoBackupUpload.isActive || window.state.autoBackupUpload.hasBeenManuallyStopped) {
                this.stop();
                return;
            }

            const elapsed = Date.now() - window.state.autoBackupUpload.startTime;
            const maxMs = window.CONFIG.AUTO_BACKUP_UPLOAD_MAX_DURATION_MS;
            if (elapsed >= maxMs) {
                // במקום לעצור מיד – הצג חלון בחירה
                this._showExtendOrStopModal();
                return; // ממתין להחלטת המשתמש
            }

            this.performAutoUpload();
        }, window.CONFIG.AUTO_BACKUP_UPLOAD_INTERVAL_MS);

        if (typeof window.saveState === 'function') window.saveState();
    },

    // פונקציה לבדיקת משתמש אורח
    isGuestUser() {
        try {
            const saved = localStorage.getItem('gibushAuthState');
            if (!saved) return true;
            const session = JSON.parse(saved);
            return session?.authState?.authMethod === 'guest';
        } catch (e) {
            return true; // במקרה של שגיאה נחשיב כאורח
        }
    },

    // עצירת שליחה אוטומטית
    stop(reason = 'לא צוין') {
        if (!window.state.autoBackupUpload.isActive) {
            return;
        }

        console.log('🛑 עוצר שליחה אוטומטית:', reason);
        
        if (window.state.autoBackupUpload.intervalId) {
            clearInterval(window.state.autoBackupUpload.intervalId);
            window.state.autoBackupUpload.intervalId = null;
        }

        window.state.autoBackupUpload.isActive = false;
        if (typeof window.saveState === 'function') window.saveState();
    },

    // סימון שהשליחה הופסקה ידנית
    markManuallyStopped() {
        window.state.autoBackupUpload.hasBeenManuallyStopped = true;
        this.stop('שליחה ידנית');
    },

    // המשך שליחה אוטומטית אחרי רענון עמוד
    resume() {
        if (!window.CONFIG.AUTO_BACKUP_UPLOAD_ENABLED) return;
        
        // חסימת שליחה אוטומטית במצב אורח
        if (this.isGuestUser()) {
            console.log('🚫 שליחה אוטומטית לא פעילה במצב אורח');
            return;
        }
        
        // בדיקה if התחרות התחילה והשליחה לא הופסקה ידנית
        if (window.state.competitionStarted && 
            !window.state.autoBackupUpload.hasBeenManuallyStopped &&
            window.state.autoBackupUpload.startTime) {
            
            const elapsed = Date.now() - window.state.autoBackupUpload.startTime;
            
            // if עדיין בטווח הזמן המותר
            if (elapsed < window.CONFIG.AUTO_BACKUP_UPLOAD_MAX_DURATION_MS) {
                console.log('🔄 ממשיך שליחה אוטומטית אחרי רענון עמוד');
                
                // אפסי את isActive כדי לאפשר התחלה מחדש
                window.state.autoBackupUpload.isActive = false;
                window.state.autoBackupUpload.intervalId = null;
                
                this.start();
            } else {
                console.log('⏰ שליחה אוטומטית פגה (מעל 5 שעות)');
                window.state.autoBackupUpload.hasBeenManuallyStopped = true;
                window.state.autoBackupUpload.isActive = false;
                window.state.autoBackupUpload.intervalId = null;
                if (typeof window.saveState === 'function') window.saveState();
            }
        }
    },

    _showExtendOrStopModal() {
        // הגנה נגד פתיחת מודאל כפול
        if (document.getElementById('auto-backup-extend-modal')) return;
        const backdrop = document.createElement('div');
        backdrop.id = 'auto-backup-extend-modal';
        backdrop.style.position = 'fixed';
        backdrop.style.inset = '0';
        backdrop.style.background = 'rgba(0,0,0,0.55)';
        backdrop.style.zIndex = '9999';
        backdrop.style.display = 'flex';
        backdrop.style.alignItems = 'center';
        backdrop.style.justifyContent = 'center';
        const minutesConfigured = Math.round(window.CONFIG.AUTO_BACKUP_UPLOAD_MAX_DURATION_MS / 60000);
        backdrop.innerHTML = `
          <div style="background:#fff;color:#0f172a;border-radius:20px;box-shadow:0 12px 38px -10px rgba(0,0,0,.35);padding:26px 30px;max-width:430px;width:100%;font-family:system-ui,Segoe UI,sans-serif;display:flex;flex-direction:column;gap:18px;">
            <h3 style="margin:0;font-size:20px;font-weight:700;display:flex;align-items:center;gap:8px;color:#0d9488;">⏰ סיום גיבוי אוטומטי</h3>
            <p style="margin:0;font-size:14px;line-height:1.45;font-weight:500;white-space:pre-line;">
הגיבוי האוטומטי פעל ${minutesConfigured} דקות ומוכן להפסיק.
להמשיך לעוד 5 שעות (300 דקות) או להפסיק עכשיו?</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
              <button id="auto-backup-stop-btn" style="background:#ef4444;color:#fff;font-weight:700;border:none;border-radius:12px;padding:10px 20px;font-size:14px;cursor:pointer;">הפסק</button>
              <button id="auto-backup-extend-btn" style="background:linear-gradient(90deg,#0d9488,#059669);color:#fff;font-weight:700;border:none;border-radius:12px;padding:10px 20px;font-size:14px;cursor:pointer;">המשך 5 שעות</button>
            </div>
          </div>`;
        document.body.appendChild(backdrop);
        const stopBtn = backdrop.querySelector('#auto-backup-stop-btn');
        const extendBtn = backdrop.querySelector('#auto-backup-extend-btn');
        stopBtn.onclick = () => {
            this.stop('המשתמש בחר להפסיק');
            try { backdrop.remove(); } catch(e){}
            if (typeof window.showNotification === 'function') {
                window.showNotification('🔴 הגיבוי האוטומטי הופסק', 'warning');
            }
        };
        extendBtn.onclick = () => {
            // הארכת זמן: איפוס זמן התחלה + קביעת מקסימום חדש ל-5 שעות
            window.state.autoBackupUpload.startTime = Date.now();
            window.CONFIG.AUTO_BACKUP_UPLOAD_MAX_DURATION_MS = 5 * 60 * 60 * 1000; // 5 שעות
            if (window.CONFIG.AUTO_BACKUP_SETTINGS) window.CONFIG.AUTO_BACKUP_SETTINGS.stopAfterMinutes = 300;
            if (typeof window.saveState === 'function') window.saveState();
            try { backdrop.remove(); } catch(e){}
            if (typeof window.showNotification === 'function') {
                window.showNotification('✅ הגיבוי האוטומטי הוארך לעוד 5 שעות', 'success');
            }
        };
    }
};

window.autoBackupManager = autoBackupManager;
