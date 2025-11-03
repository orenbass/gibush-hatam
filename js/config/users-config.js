/**
 * ניהול משתמשים ומנהלים
 * Users and Administrators Configuration
 */

// משתמשים ברירת מחדל
const DEFAULT_USERS = [
    {
        "name": "מנהל מערכת",
        "email": "gibush.hatam@gmail.com",
        "isAdmin": true
      },
      {
        "name": "אורן בסמן",
        "email": "orenbassm@gmail.com",
        "isAdmin": true
      },
      {
        "name": "רון מלכין",
        "email": "ronmalk@gmail.com",
        "isAdmin": true
      },
      {
        "name": "דור ליכט",
        "email": "Dorlicht@gmail.com",
        "isAdmin": false
      },
      {
        "name": "שגיא כהן",
        "email": "Sagi.2910@gmail.com",
        "isAdmin": false
      },
      {
        "name": "שי ברנשטיין",
        "email": "shay.bornstein@gmail.com",
        "isAdmin": false
      },
      {
        "name": "עידן קלז",
        "email": "Klazidan@gmail.com",
        "isAdmin": false
      },
      {
        "name": "שי שלם",
        "email": "shai.salama@gmail.com",
        "isAdmin": false
      },
      {
        "name": "גיא קרת",
        "email": "keretguy@gmail.com",
        "isAdmin": false
      },
      {
        "name": "דניאל לוי",
        "email": "Daniel11levy@gmail.com ",
        "isAdmin": false
      },
      {
        "name": "אדר גוילי",
        "email": "Adar555@gmail.com",
        "isAdmin": false
      },
      {
        "name": "חזי  גוגמן",
        "email": "Hezig6@gmail.com",
        "isAdmin": false
      },
      {
        "name": "גל קסטן ",
        "email": "galkasten@gmail.com",
        "isAdmin": false
      },
      {
        "name": "נועם  שינפלד",
        "email": "Noam.shinfeld@gmail.com",
        "isAdmin": false
      },
      {
        "name": "עידו שפירא",
        "email": "Idosh160@gmail.com",
        "isAdmin": false
      },
      {
        "name": "טל אלגזי",
        "email": "talalgazi1@gmail.com",
        "isAdmin": false
      },
      {
        "name": "עמנואל מיארוב",
        "email": "emanuel.miarov@gmail.com",
        "isAdmin": false
      },
      {
        "name": "גל רוזן",
        "email": "pingpow@gmail.com",
        "isAdmin": false
      },
      {
        "name": "איתי בלומנקרנץ",
        "email": "Itai6495@gmail.com",
        "isAdmin": false
      },
      {
        "name": " רביד",
        "email": "hagairavid18@gmail.com",
        "isAdmin": false
      },
      {
        "name": "אלעד בנג׳י",
        "email": "Eladbenjy53@gmail.com",
        "isAdmin": false
      },
      {
        "name": "יקיר לסרי",
        "email": "yakirlasry@gmail.com",
        "isAdmin": false
      },
      {
        "name": "גברת גונן",
        "email": "noholdbars69@gmail.com",
        "isAdmin": false
      },
      {
        "name": "יונתן  גירון",
        "email": "giron.jonathan@gmail.com",
        "isAdmin": false
      },
      {
        "name": "רועי הברי תמיר",
        "email": "Roeehabaritamir@gmail.com",
        "isAdmin": false
      },
      {
        "name": "אדיר ראובן",
        "email": "Adir.r15@gmail.com",
        "isAdmin": false
      },
      {
        "name": "יובל ירוחם",
        "email": "yeruhamyuval2@gmail.com",
        "isAdmin": false
      },
      {
        "name": "איתי ברדה",
        "email": "Itaybarda21@gmail.com",
        "isAdmin": false
      },
      {
        "name": "גלעד  לשסקו ",
        "email": "Gilead95@gmail.com",
        "isAdmin": false
      },
      {
        "name": "איתן נאמן",
        "email": "hneeman83355@gmail.com ",
        "isAdmin": false
      },
      {
        "name": "אליאב אזולאי",
        "email": "Eliavoz@gmail.com",
        "isAdmin": false
      },
      {
        "name": "מיתר עטיאס",
        "email": "meitarattias@gmail.com",
        "isAdmin": false
      },
      {
        "name": "עפרי קייט",
        "email": "ofkait@gmail.com",
        "isAdmin": false
      },
      {
        "name": "רועי  צור",
        "email": "Roizuruhta@gmail.com",
        "isAdmin": false
      }
];

function normalizeEmail(email){ return String(email||'').trim().toLowerCase(); }

// פונקציה דינמית לטעינת משתמשים - תמיד קוראת מה-localStorage
function getUsersFromDrive() {
    try {
        const downloadedSettings = localStorage.getItem('downloadedSystemSettings');
        if (downloadedSettings) {
            const settings = JSON.parse(downloadedSettings);
            let rawUsers = null;
            if (Array.isArray(settings.users)) rawUsers = settings.users;
            else if (settings.userManagement && Array.isArray(settings.userManagement.authorizedUsers)) rawUsers = settings.userManagement.authorizedUsers;
            if (rawUsers) {
                if (!window.__usersConfigLogged) {
                    console.log('✅ נמצאו משתמשים מהדרייב (טעינה ראשונה):', rawUsers.length);
                    window.__usersConfigLogged = true;
                }
                return rawUsers.map(u => ({
                    ...u,
                    email: normalizeEmail(u.email)
                }));
            }
            if (!window.__usersConfigLogged) {
                console.warn('⚠️ לא נמצאו משתמשים בהגדרות, משתמש בברירת מחדל');
                window.__usersConfigLogged = true;
            }
        }
    } catch (e) {
        if (!window.__usersConfigLogged) {
            console.warn('⚠️ שגיאה בקריאת משתמשים מהדרייב:', e);
            window.__usersConfigLogged = true;
        }
    }
    return DEFAULT_USERS.map(u => ({ ...u, email: normalizeEmail(u.email) }));
}

var USERS_CONFIG = {
    // **שינוי קריטי: users הוא עכשיו getter דינמי שתמיד קורא מהדרייב**
    get users() {
        return getUsersFromDrive();
    },
    
    // **setter למקרה שמישהו מנסה לדרוס (לא נעשה כלום, הנתונים תמיד מהדרייב)**
    set users(value) {
        console.warn('⚠️ ניסיון לדרוס users - משתמשים תמיד נטענים מהדרייב');
    },
    
    /**
     * בדיקה אם משתמש מורשה
     * @param {string} email - כתובת המייל לבדיקה
     * @returns {boolean}
     */
    isAuthorized: function(email) {
        if (!email) return false;
        const normalizedEmail = normalizeEmail(email);
        return this.users.some(user => normalizeEmail(user.email) === normalizedEmail);
    },
    
    /**
     * בדיקה אם משתמש הוא מנהל
     * @param {string} email - כתובת המייל לבדיקה
     * @returns {boolean}
     */
    isAdmin: function(email) {
        if (!email) return false;
        const normalizedEmail = normalizeEmail(email);
        const user = this.users.find(u => normalizeEmail(u.email) === normalizedEmail);
        return user ? user.isAdmin === true : false;
    },
    
    /**
     * קבלת פרטי משתמש לפי מייל
     * @param {string} email - כתובת המייל
     * @returns {Object|null}
     */
    getUserByEmail: function(email) {
        if (!email) return null;
        const normalizedEmail = normalizeEmail(email);
        return this.users.find(u => normalizeEmail(u.email) === normalizedEmail) || null;
    },
    
    /**
     * קבלת רשימת המיילים המורשים
     * @returns {Array<string>}
     */
    getAuthorizedEmails: function() {
        return this.users.map(u => normalizeEmail(u.email));
    },
    
    /**
     * קבלת רשימת מנהלים בלבד
     * @returns {Array<Object>}
     */
    getAdmins: function() {
        // מקבל כל משתמש שערך isAdmin שלו אמת (גם 'true' כמחרוזת או 1)
        return this.users.filter(u => {
            const v = u.isAdmin;
            return v === true || v === 1 || (typeof v === 'string' && v.trim().toLowerCase() === 'true');
        });
    },
    /**
     * קבלת רשימת מיילים של מנהלים
     * @returns {Array<string>}
     */
    getAdminEmails: function() {
        return this.getAdmins().map(u => normalizeEmail(u.email));
    }
};

// לוג התחלתי
console.log('👥 USERS_CONFIG מאותחל - משתמשים נטענים דינמית מהדרייב');

// Export לשימוש בקבצים אחרים
if (typeof window !== 'undefined') {
    window.USERS_CONFIG = USERS_CONFIG;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = USERS_CONFIG;
}