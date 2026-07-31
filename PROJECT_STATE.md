# PROJECT_STATE.md - xmoney

## Overview
אפליקציית ניהול תקציב חכם אופליין (Vanilla HTML/CSS/JS, localStorage, Web Speech API). ללא build step, ללא שרת/Firebase (אין סוד לשמור).

## משימות
- [x] מבנה קבצים ראשוני (index.html, css/style.css, js/*.js)
- [x] js/storage.js - CRUD ל-localStorage (תנועות, קטגוריות דינמיות, הגדרות)
- [x] js/categories.js - מילון קטגוריות ברירת מחדל + התאמה + המצאת קטגוריה
- [x] js/parser.js - ניתוח heuristic של טקסט חופשי (תאריך/סכום/אמצעי תשלום/סוג/מקור/קטגוריה/תיאור)
- [x] js/stats.js - חישוב טווח מחזור חודשי לפי יום התחלה + אגרגציה לפי קטגוריה
- [x] js/voice.js - עטיפת SpeechRecognition (he-IL)
- [x] js/app.js - ניווט טאבים, רינדור, לחיצה ארוכה על כפתור המיקרופון, טופס טקסט, מחיקה, הגדרות
- [x] index.html - 4 מסכים (בית/תנועות/סטטיסטיקה/הגדרות) + ניווט תחתון, RTL
- [x] css/style.css - עיצוב mobile-first RTL
- [x] manifest.json + sw.js - PWA קליל להתקנה/עבודה אופליין של מעטפת האפליקציה
- [x] .gitignore, README.md מעודכן
- [x] בדיקת קצה-לקצה (הרצה בדפדפן, בדיקת פרסינג מול הדוגמאות מהמשימה, מחיקה, מחזור חודשי, סטטיסטיקה) + commit + push
- [x] GitHub Pages הופעל על ענף `claude/xmoney-budget-app-55od82` - האפליקציה חיה ב-https://ronmailx-boop.github.io/xmoney/ ומתעדכנת אוטומטית עם כל push לענף
- [x] לוגו XMONEY מותאם אישית (SVG ידני: X ירוק, MNEY לבן עם מתאר אדום-בורדו, סמל O מחולק ל-4 רבעים) - בכותרת הבית (`icons/logo-wordmark.svg`) ובאייקון הריבועי/favicon (`icons/icon.svg`, סמל ה-O בלבד)

## Current Focus
גרסה ראשונה של xmoney הושלמה, נבדקה בדפדפן (Playwright), פועלת ב-GitHub Pages, וקיבלה לוגו מותאם אישית. הצעד הבא (אם ירצה המשתמש): בדיקה אמיתית של הזיהוי הקולי (מיקרופון בדפדפן אמיתי, לא ניתן לבדוק ב-headless), ואולי הרחבת מילון הקטגוריות/פעלים לפי שימוש בפועל.

## הערות/מגבלות ידועות
- הפרסינג הוא heuristic מבוסס מילות-מפתח/regex - לא NLP אמיתי. סדר המילים בתיאור המוצג עוקב אחר סדר הדיבור המקורי (לא תמיד יזוהה סדר "יעד ואז פריט" כמו בדוגמה עם "קשת טעמים"). תיבת הטקסט משמשת כגיבוי/תיקון.
- Web Speech API דורש חיבור רשת בדפדפני Chrome (מנוע זיהוי בענן) - זהו מאפיין דפדפן ולא של האפליקציה; שאר האפליקציה עובדת לגמרי אופליין (localStorage + service worker).
- אין Firebase/.env - אין שירות חיצוני הדורש מפתח API.
