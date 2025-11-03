# מבנה CSS מאורגן - תיעוד

## מבנה התיקיות

```
css/
├── base/                    # סגנונות בסיס
│   ├── variables.css       # משתנים גלובליים (צבעים, פונטים, וכו')
│   ├── reset.css           # איפוס CSS ופונטים
│   └── typography.css      # טיפוגרפיה וטקסטים
│
├── components/              # רכיבים משותפים
│   ├── buttons.css         # כל סוגי הכפתורים
│   ├── cards.css           # כרטיסים ורכיבי תוכן
│   ├── forms.css           # שדות קלט, טפסים
│   ├── modals.css          # חלונות קופצים ומודלים
│   └── quick-comments.css  # רכיב הערות מהירות
│
├── pages/                   # סגנונות לפי עמוד
│   ├── runners.css         # עמוד ניהול קבוצה
│   ├── status-management.css # עמוד ניהול סטטוסים
│   ├── heat.css            # עמוד ספרינטים
│   ├── crawling-comments.css # עמוד זחילה קבוצתית
│   ├── crawling-sprint.css # עמוד זחילות אישיות
│   ├── stretcher-heat.css  # עמוד אלונקות סוציומטריות
│   └── report.css          # עמוד דוח סיכום
│
└── utils/                   # עזרים
    ├── animations.css      # אנימציות (drag, fade, pulse)
    ├── responsive.css      # התאמות מובייל וגרידים
    └── dark-mode.css       # מצב כהה

arrival-rows.css            # רכיב שורות הגעה (קיים)
main-unified.css            # קובץ ראשי שמייבא הכל
```

## איך להשתמש

### שימוש בקובץ המאוחד (מומלץ)
```html
<link rel="stylesheet" href="css/main-unified.css">
```

### שימוש בקבצים בודדים (אופציונלי)
אם רוצים לטעון רק חלקים מסוימים:
```html
<!-- בסיס (חובה) -->
<link rel="stylesheet" href="css/base/variables.css">
<link rel="stylesheet" href="css/base/reset.css">
<link rel="stylesheet" href="css/base/typography.css">

<!-- רכיבים (לפי צורך) -->
<link rel="stylesheet" href="css/components/buttons.css">
<link rel="stylesheet" href="css/components/cards.css">

<!-- עמוד ספציפי -->
<link rel="stylesheet" href="css/pages/heat.css">
```

## יתרונות המבנה החדש

### 1. ארגון ברור
- כל קובץ אחראי על תחום אחד בלבד
- קל למצוא ולערוך סגנונות ספציפיים
- הפרדה ברורה בין בסיס, רכיבים ועמודים

### 2. ביצועים משופרים
- טעינה מודולרית - רק מה שצריך
- קבצים קטנים יותר לקריאה ותחזוקה
- קל יותר לדפדפן לקשר (cache) קבצים בודדים

### 3. תחזוקה קלה
- שינויים בכפתורים? רק בקובץ buttons.css
- שינויים בצבעים? רק בקובץ variables.css
- קל למצוא ולתקן באגים

### 4. עבודת צוות
- מפתחים שונים יכולים לעבוד על קבצים שונים
- פחות קונפליקטים ב-Git
- קוד ברור וקריא

## מדריך עריכה

### שינוי צבעים
ערוך את `css/base/variables.css`:
```css
:root {
  --accent: #3b82f6;  /* שנה צבע עיקרי */
  --success: #10b981; /* שנה צבע הצלחה */
}
```

### הוספת כפתור חדש
ערוך את `css/components/buttons.css`:
```css
.my-new-btn {
  background: var(--accent);
  color: white;
  padding: 10px 20px;
}
```

### עיצוב עמוד ספציפי
ערוך את הקובץ המתאים ב-`css/pages/`:
- `runners.css` - עמוד ניהול קבוצה
- `status-management.css` - ניהול סטטוסים
- `heat.css` - ספרינטים
- `crawling-comments.css` - זחילה קבוצתית
- `crawling-sprint.css` - זחילות אישיות
- `stretcher-heat.css` - אלונקות סוציומטריות
- `report.css` - דוח סיכום

## הסבר על הקבצים

### Base (בסיס)
- **variables.css** - משתנים גלובליים שנשתמש בהם בכל האפליקציה
- **reset.css** - מאפס סגנונות ברירת מחדל של הדפדפן
- **typography.css** - פונטים, כותרות, טקסטים

### Components (רכיבים)
- **buttons.css** - כל הכפתורים (runner-btn, heat-btn, comment-btn)
- **cards.css** - כרטיסי רצים, הדגשות בדוח
- **forms.css** - שדות קלט, select, placeholder
- **modals.css** - חלונות קופצים, loading overlay
- **quick-comments.css** - רכיב ההערות המהירות הקיים

### Pages (עמודים)
- **runners.css** - עמוד ניהול קבוצה (הוספת רצים)
- **status-management.css** - ניהול סטטוסים (פעיל/גריעה/פרישה)
- **heat.css** - עמוד ספרינטים (מקצים)
- **crawling-comments.css** - זחילה קבוצתית (בחירת נושאי שקים)
- **crawling-sprint.css** - זחילות אישיות (מקצי זחילה)
- **stretcher-heat.css** - אלונקות סוציומטריות (בחירת נושאי אלונקה וג'ריקן)
- **report.css** - דוח סיכום (טבלת דירוגים וציונים)

### Utils (עזרים)
- **animations.css** - אנימציות drag & drop, fade, pulse
- **responsive.css** - גרידים, breakpoints, התאמות מובייל
- **dark-mode.css** - כל סגנונות המצב הכהה

## הערות חשובות

1. **הקובץ הישן `styles.css` נשאר** - לא נמחק כדי לא לשבור דברים
2. **הקבצים החדשים נמצאים בתיקיית css/** - מבנה נקי ומסודר
3. **משתמשים במשתנים** - שינוי צבע אחד משפיע על כל האפליקציה
4. **תמיכה במובייל** - כל הסגנונות מותאמים לנייד
5. **19 קבצי CSS מסודרים** - כל אחד ממוקד בתחום שלו

## מפת קבצים לפי עמודים

| עמוד באפליקציה | קובץ CSS | תיאור |
|-----------------|----------|--------|
| קבוצה | `pages/runners.css` | ניהול מספרי כתף |
| סטטוס | `pages/status-management.css` | שינוי סטטוסים |
| ספרינטים | `pages/heat.css` | מקצי ריצה |
| זחילה קב' | `pages/crawling-comments.css` | בחירת נושאי שקים |
| זחילות | `pages/crawling-sprint.css` | מקצי זחילה |
| אלונקות | `pages/stretcher-heat.css` | בחירות סוציומטריות |
| סיכום | `pages/report.css` | טבלת דירוגים |

## צעדים הבאים

1. ✅ יצרנו את המבנה החדש
2. ✅ פיצלנו את כל העמודים לקבצים נפרדים
3. ⏭️ להעביר את הקישורים בקבצי ה-HTML לקובץ החדש
4. ⏭️ לבדוק שהכל עובד
5. ⏭️ למחוק את הקובץ הישן אחרי וידוא

---
**עודכן:** 26 אוקטובר 2025  
**גרסה:** 2.0 - Complete
**קבצים:** 19 (3 base + 5 components + 7 pages + 3 utils + 1 main)
