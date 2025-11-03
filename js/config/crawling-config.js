(function () {
    // Ensure both the global and a local reference exist (works even with type="module")
    const CONFIG = (window.CONFIG = window.CONFIG || {});
    
    // **חדש: שמירת ההגדרות המקוריות בנפרד לפני כל דריסה**
    const ORIGINAL_QUICK_COMMENTS = {
        good: [
            'פעיל מאוד בקבוצה',
            'עוזר לאחרים',
            'מנהיג את הקבוצה',
            'לא מוותר גם כשקשה'
        ],
        neutral: [
            'לא מורגש בקבוצה',
            'לא יוזם',
            'מתאמץ חלקית בלבד',
            'לא עקבי - קצב משתנה',
            'בינוני - לרוב באמצע'
        ],
        bad: [
            'מעכב את הקבוצה',
            'לא עומד בלחץ',
            'לא מבין הוראות',
            'מתייאש מול קושי',
            'נסחב על ידי אחרים',
            'חלש - לרוב אחרון'
        ]
    };
    
    // שמירת העותק הקבוע במשתנה גלובלי נפרד
    window.ORIGINAL_CRAWLING_COMMENTS = JSON.parse(JSON.stringify(ORIGINAL_QUICK_COMMENTS));
    
    // הגדרת ברירת המחדל (יכול להדרס מאוחר יותר על ידי config.js)
    CONFIG.CRAWLING_GROUP_COMMON_COMMENTS = CONFIG.CRAWLING_GROUP_COMMON_COMMENTS || JSON.parse(JSON.stringify(ORIGINAL_QUICK_COMMENTS));
    
    console.log('📝 הערות מהירות מקוריות נשמרו ב-ORIGINAL_CRAWLING_COMMENTS');
})();
