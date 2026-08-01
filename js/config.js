// כתובת שרת האימות הזעיר (Cloudflare Worker, ראו worker/index.js) שמחזיק בבטחון את
// ה-Refresh Token של Google (הדפדפן לעולם לא רואה אותו). יש להחליף לכתובת ה-Worker
// האמיתית אחרי הפריסה, למשל: 'https://xmoney-auth.<subdomain>.workers.dev'.
const AUTH_WORKER_URL = 'https://REPLACE-WITH-YOUR-WORKER-URL.workers.dev';

const GOOGLE_SYNC_FILE_NAME = 'xmoney-data.json';
