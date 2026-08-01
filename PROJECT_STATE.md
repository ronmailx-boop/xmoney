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
- [x] לוגו XMONEY מותאם אישית (SVG ידני: X ירוק, MNEY לבן עם מתאר אדום-בורדו, סמל O מחולק ל-4 רבעים עם רווחי הפרדה, אדום פנטון 485) - בכותרת הבית (`icons/logo-wordmark.svg`) ובאייקון הריבועי/favicon (`icons/icon.svg`, סמל ה-O בלבד)
- [x] דיאלוג מחיקה מותאם עיצובית (`showConfirmDialog`) במקום `confirm()` המובנה
- [x] קטגוריה ניתנת לעריכה מכל שורת תנועה (צ'יפ לחיץ ▾, בחירה מרשימה קיימת או יצירת קטגוריה חדשה)
- [x] אמצעי תשלום כשדה נפרד וניתן לעריכה (צ'יפ ליד הקטגוריה; מזומן/בנק/אשראי+מספר כרטיס/הזנה חופשית), וגם עריכת סכום ידנית - שניהם דרך `updateTransactionInStorage`
- [x] גודל טקסט בתנועות ניתן לשליטה (סליידר 100%-300% בהגדרות, עם תצוגה מקדימה חיה) ופריסת שורת תנועה קבועה/ממורכזת (כל שדה - תאריך/שם/קטגוריה/אמצעי תשלום/סכום - בשורה נפרדת ממורכזת, לא תלוי בגודל הטקסט).
- [x] התחברות Google **קבועה** עד התנתקות מפורשת: הוחלף המימוש הקודם (Google Identity Services בצד לקוח, טוקן זמני שנעלם ברענון) בשרת אימות זעיר (`worker/index.js`, Cloudflare Worker) ששומר Refresh Token בבטחון ב-KV, ומנפיק Access Token טרי לפי בקשה דרך "device token" אקראי ב-localStorage (לא cookies - נמנע מבעיות third-party cookies). `js/sync.js` שוכתב: `signInToGoogle` עושה redirect מלא (לא popup), `initGoogleAuth` שולף טוקן טרי בשקט בכל טעינה. **טרם נפרס בפועל** - ממתין שהמשתמש יפרוס את ה-Worker (הוראות מלאות ב-README) ויעדכן את `AUTH_WORKER_URL` ב-`js/config.js`.

## Current Focus
xmoney כולל כעת: קלט קולי/טקסט, פרסינג heuristic, כל שדה בתנועה ניתן לעריכה, מחזור חודשי, סטטיסטיקה, לוגו מותאם, גודל טקסט מתכוונן, GitHub Pages חי. **הצעד הבא**: המשתמש צריך לפרוס את `worker/index.js` ל-Cloudflare Workers (חשבון חינמי, יצירת Worker + KV namespace `SESSIONS` + 2 secrets + הוספת redirect URI ב-Google Cloud Console - כל השלבים ב-README), ואז למסור לי את כתובת ה-Worker כדי שאעדכן את `AUTH_WORKER_URL` ב-`js/config.js` (כרגע placeholder, הסנכרון "לא זמין" עד אז - שאר האפליקציה עובדת רגיל).

## הערות/מגבלות ידועות
- הפרסינג הוא heuristic מבוסס מילות-מפתח/regex - לא NLP אמיתי. סדר המילים בתיאור המוצג עוקב אחר סדר הדיבור המקורי (לא תמיד יזוהה סדר "יעד ואז פריט" כמו בדוגמה עם "קשת טעמים"). תיבת הטקסט משמשת כגיבוי/תיקון.
- Web Speech API דורש חיבור רשת בדפדפני Chrome (מנוע זיהוי בענן) - זהו מאפיין דפדפן ולא של האפליקציה; שאר האפליקציה עובדת לגמרי אופליין (localStorage + service worker) פרט לסנכרון Google Drive שדורש רשת מטבעו.
- אין Firebase/.env. שני שירותים חיצוניים: Google Cloud (xmoney-504115, OAuth+Drive API) ו-Cloudflare Workers (שרת האימות הזעיר). ה-Client ID אינו סוד ואינו בשימוש בקוד הלקוח יותר (עבר ל-Worker secrets); ה-Client Secret וה-Refresh Token מעולם לא מגיעים לדפדפן - רק ל-Worker secrets/KV.
- פרויקט ה-Google Cloud עדיין במצב "Testing" - רק חשבונות Google שנוספו כ-Test users (Audience → Test users) יכולים להתחבר, עד שהאפליקציה תפורסם (Publish) אם ירצה המשתמש בעתיד.
- לא ניתן לבדוק את זרימת ה-OAuth/Worker האמיתית מהסביבה המבודדת (אין חשבון Google/גישת רשת אמיתית) - נבדק רק שהאפליקציה טוענת ופועלת תקין בלי Worker מפורס (placeholder URL), בלי לקרוס ובלי ניווט שגוי.
