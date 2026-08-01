# xmoney

אפליקציית ניהול תקציב חכם אופליין - מעקב אחר הכנסות והוצאות ותזרים, בעברית ו-RTL, ללא כל חיבור לבנקים או כרטיסי אשראי. כל התנועות מוזנות ידנית - בקול או בטקסט - והנתונים נשמרים מקומית במכשיר (localStorage) בלבד.

## תכונות

- כפתור קולי גדול במרכז: החזק לחיצה ודבר, ושחרר כדי לתעד תנועה (הכנסה/הוצאה) - לדוגמה: "שילמתי רב קו 350 שח בכרטיס 3245".
- תיבת טקסט חופשי כגיבוי לזיהוי הקולי, עם אותה לוגיקת ניתוח.
- זיהוי אוטומטי של תאריך, סכום, אמצעי תשלום/מקור וקטגוריה, כולל "המצאת" קטגוריות חדשות כשאין התאמה במילון הקיים.
- רשימת תנועות עם אפשרות מחיקה.
- מחזור חודשי לפי יום התחלה נבחר (למשל מה-10 לחודש עד ה-9 בחודש הבא).
- סטטיסטיקה חודשית: סיכום הכנסות/הוצאות/תזרים ופילוח הוצאות לפי קטגוריה.
- התחברות עם Google וסנכרון אוטומטי לתיקייה נסתרת ב-Google Drive (מסך הגדרות) - מאפשר שימוש באותם נתונים ממספר מכשירים. אופציונלי לגמרי; בלי התחברות האפליקציה ממשיכה לעבוד אופליין לגמרי מה-localStorage.

## הרצה

האפליקציה היא אתר סטטי ללא build step. פתחו את `index.html` ישירות בדפדפן, או הגישו את התיקייה עם שרת סטטי כלשהו, למשל:

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
   - `GOOGLE_CLIENT_SECRET` - מהעמוד Google Cloud Console → Google Auth Platform → Clients → (הלקוח הקיים) - יש שם גם Client Secret, עד עכשיו לא היה בשימוש.
5. **Google Cloud Console**: חזרה ל-Clients → הלקוח הקיים → תחת **Authorized redirect URIs** הוסף: `https://<worker-subdomain>.workers.dev/auth/callback` (הכתובת המדויקת של ה-Worker שקיבלת בשלב 2).
6. עדכן את `js/config.js`: `AUTH_WORKER_URL` = כתובת ה-Worker (למשל `https://xmoney-auth.<subdomain>.workers.dev`, בלי `/auth/...` בסוף).

הפרויקט ב-Google Cloud Console עדיין במצב "Testing" - רק חשבונות שנוספו כ-Test users (Audience → Test users) יכולים להתחבר.
