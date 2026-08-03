# xmoney

אפליקציית ניהול תקציב אישי חכמה, בעברית ו-RTL, שרצה **אופליין לגמרי** במכשיר - ללא חיבור לבנקים או לכרטיסי אשראי. כל התנועות מוזנות ידנית, בקול או בטקסט חופשי, והאפליקציה מזהה אוטומטית את הפרטים ומארגנת אותם לתמונת מצב פיננסית ברורה.

**האפליקציה חיה כאן:** https://ronmailx-boop.github.io/xmoney/

## מה האפליקציה עושה

- **תיעוד תנועה בקול או בטקסט** - כפתור מיקרופון גדול במרכז המסך: מחזיקים לחיצה, אומרים משפט חופשי כמו "שילמתי רב קו 350 שקל בכרטיס 3245", ומשחררים. יש גם תיבת טקסט חופשי כגיבוי/חלופה לזיהוי הקולי, עם אותה לוגיקת ניתוח.
- **ניתוח אוטומטי (heuristic)** של המשפט: תאריך, סכום, אמצעי תשלום/מקור (מזומן/בנק/אשראי ומספר כרטיס), וקטגוריה - כולל "המצאה" של קטגוריה חדשה כשאין התאמה במילון הקיים.
- **כל שדה בתנועה ניתן לעריכה** ישירות מרשימת התנועות: קטגוריה, אמצעי תשלום, סכום ותיאור, וגם מחיקה.
- **מחזור חודשי בהתאמה אישית** - לפי יום התחלה נבחר (למשל מה-10 בחודש עד ה-9 בחודש הבא), כדי להתאים לתאריך המשכורת/הוצאות קבועות.
- **מסך סטטיסטיקה** - סיכום הכנסות/הוצאות/תזרים לפי המחזור החודשי, ופילוח הוצאות לפי קטגוריה.
- **גודל טקסט מתכוונן** בהגדרות, לנוחות קריאה.
- **סנכרון אופציונלי עם Google Drive** - התחברות עם Google שומרת גיבוי בתיקייה נסתרת ב-Drive ומאפשרת להשתמש באותם נתונים ממספר מכשירים, עם התחברות קבועה עד להתנתקות מפורשת. בלי התחברות, האפליקציה ממשיכה לעבוד אופליין לגמרי מה-localStorage של הדפדפן.
- **PWA** - ניתנת להתקנה כאפליקציה על המסך הראשי ועובדת אופליין (Service Worker) גם בלי רשת, פרט לסנכרון ה-Drive שדורש רשת מטבעו.

## טכנולוגיה

אתר סטטי ב-Vanilla HTML/CSS/JS, ללא build step וללא framework. הנתונים נשמרים ב-localStorage של הדפדפן. זיהוי הקול מבוסס על Web Speech API. הסנכרון עם Google Drive מסתמך על שרת אימות זעיר בענן (Cloudflare Worker) ששומר בבטחון את פרטי ההתחברות של Google - ראו הרחבה למטה.

## הרצה מקומית

פתחו את `index.html` ישירות בדפדפן, או הגישו את התיקייה עם שרת סטטי כלשהו, למשל:

```
npx serve .
```

זיהוי קולי דורש דפדפן התומך ב-Web Speech API (למשל Chrome) והרשאת מיקרופון.

## סנכרון עם Google Drive - התחברות קבועה

כדי להישאר מחובר בין טעינות דף (עד התנתקות מפורשת), האפליקציה משתמשת בשרת אימות זעיר (`worker/index.js`, Cloudflare Worker) ששומר בבטחון את ה-Refresh Token של Google - סוד שאסור שיגיע לדפדפן. GitHub Pages משרת רק קבצים סטטיים ולא יכול להריץ את זה בעצמו.

### פריסת ה-Worker (חד-פעמי)

1. **חשבון Cloudflare** - חינמי, בלי כרטיס אשראי, ב-[dash.cloudflare.com](https://dash.cloudflare.com).
2. **Workers & Pages → Create → Create Worker** - תדביק את התוכן של `worker/index.js` בעורך, Deploy.
3. **KV Namespace**: Workers & Pages → KV → Create namespace בשם `SESSIONS`. אז ב-Worker → Settings → Bindings → הוסף KV Namespace Binding: Variable name `SESSIONS`, בחר את ה-namespace שנוצר.
4. **Secrets**: ב-Worker → Settings → Variables and Secrets → הוסף שניים (מסוג Secret, לא Text):
   - `GOOGLE_CLIENT_ID` - אותו Client ID מ-Google Cloud Console.
   - `GOOGLE_CLIENT_SECRET` - מהעמוד Google Cloud Console → Google Auth Platform → Clients → (הלקוח הקיים) - יש שם גם Client Secret.
5. **Google Cloud Console**: חזרה ל-Clients → הלקוח הקיים → תחת **Authorized redirect URIs** הוסף: `https://<worker-subdomain>.workers.dev/auth/callback` (הכתובת המדויקת של ה-Worker שקיבלת בשלב 2).
6. עדכן את `js/config.js`: `AUTH_WORKER_URL` = כתובת ה-Worker (למשל `https://xmoney-auth.<subdomain>.workers.dev`, בלי `/auth/...` בסוף).

הפרויקט ב-Google Cloud Console עדיין במצב "Testing" - רק חשבונות שנוספו כ-Test users (Audience → Test users) יכולים להתחבר.
