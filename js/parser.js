// פרסינג heuristic של משפט חופשי בעברית (קולי או מוקלד) לתנועת הכנסה/הוצאה
// שיטת עבודה: שרשרת חילוץ (תאריך -> אמצעי תשלום -> סכום -> סוג -> מקור -> קטגוריה -> תיאור)
// זהו ניתוח מבוסס מילות-מפתח/regex בלבד (best-effort), ולכן קיימת גם תיבת טקסט לתיקון ידני.

const INCOME_VERBS = ['קיבלתי', 'קיבלנו', 'הרווחתי', 'הופקד לי', 'קיבלת'];
const EXPENSE_VERBS = ['שילמתי', 'שילמנו', 'קניתי', 'קנינו', 'קנתי', 'רכשתי', 'הוצאתי'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toISODate(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function formatDisplayDate(isoDate) {
  const parts = isoDate.split('-');
  return parseInt(parts[2], 10) + '.' + parseInt(parts[1], 10) + '.' + parts[0].slice(2);
}

function removeSubstr(text, sub) {
  if (!sub) return text;
  const idx = text.indexOf(sub);
  if (idx === -1) return text;
  return (text.slice(0, idx) + text.slice(idx + sub.length)).replace(/\s{2,}/g, ' ');
}

function normalizeText(raw) {
  // הערה: מרכאות סביב מקור הכנסה (מ"שם") נשמרות בכוונה בשלב הזה - הן
  // מוסרות ב-extractSource, כי הן הסימן האמין היחיד להבחין בין מילית "מ"
  // (מקור) לבין מ' שהיא חלק אינטגרלי ממילה (למשל "משכורת").
  let text = (raw || '').trim();
  text = text.replace(/[“”]/g, '"').replace(/[’‘]/g, "'");
  text = text.replace(/ב["']([^"']+)["']/g, '$1');
  text = text.replace(/\s{2,}/g, ' ').trim();
  return text;
}

function extractDate(text) {
  const m = text.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
  if (!m) {
    return { date: toISODate(new Date()), matchStr: null };
  }
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  let year;
  if (m[3]) {
    year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
  } else {
    year = new Date().getFullYear();
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { date: toISODate(new Date()), matchStr: null };
  }
  const d = new Date(year, month - 1, day);
  return { date: toISODate(d), matchStr: m[0] };
}

function extractMethod(text) {
  let m = text.match(/ב?כרטיס\s*(\d{3,6})/);
  if (m) {
    return { method: 'כרטיס ' + m[1], matchStr: m[0] };
  }
  if (/ב?מזומן/.test(text)) {
    m = text.match(/ב?מזומן/);
    return { method: 'מזומן', matchStr: m[0] };
  }
  // (?=\s|$) מונע התאמה חלקית בתוך מילה ארוכה יותר (למשל "ביט" בתוך "ביטוח") -
  // \b לא אמין כאן כי \w ב-JS הוא ASCII בלבד ולא כולל אותיות עבריות.
  m = text.match(/ב?(?:העברה בנקאית|העברה|ביט|פייבוקס)(?=\s|$)/);
  if (m) {
    return { method: m[0].replace(/^ב/, ''), matchStr: m[0] };
  }
  return { method: null, matchStr: null };
}

function parseAmountString(str) {
  // מסיר מפרידי אלפים (נקודה/פסיק לפני שלוש ספרות), שומר נקודה עשרונית אמיתית
  let cleaned = str.replace(/[.,](?=\d{3}(\D|$))/g, '');
  cleaned = cleaned.replace(/,/g, '');
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

function extractAmount(text) {
  let m = text.match(/([\d,.]+)\s*(?:ש"ח|שח|₪|שקלים|שקל)/);
  if (m) {
    return { value: parseAmountString(m[1]), matchStr: m[0] };
  }
  m = text.match(/\d[\d,.]*/);
  if (m) {
    return { value: parseAmountString(m[0]), matchStr: m[0] };
  }
  return { value: 0, matchStr: null };
}

function extractSource(text) {
  // תומך רק בצורה המצוטטת מ"שם" / מ'שם' - זהו הסימן היחיד שמבחין באופן
  // אמין בין מילית "מ" (מקור הכנסה) לבין מ' שהיא חלק ממילה כמו "משכורת",
  // מאחר שבעברית מילית "מ" מתחברת למילה הבאה בלי רווח.
  const m = text.match(/מ["']([^"']+)["']/);
  if (m) {
    return { source: m[1].trim(), matchStr: m[0] };
  }
  return { source: null, matchStr: null };
}

function parseEntryText(rawText) {
  let text = normalizeText(rawText);

  const dateResult = extractDate(text);
  text = removeSubstr(text, dateResult.matchStr);
  text = text.replace(/בתאריך/g, '').trim();

  const methodResult = extractMethod(text);
  text = removeSubstr(text, methodResult.matchStr);

  const amountResult = extractAmount(text);
  text = removeSubstr(text, amountResult.matchStr);
  text = text.replace(/ש"ח|שח|₪|שקלים|שקל/g, '');
  text = text.replace(/במחיר של|במחיר|מחיר של|במחיר/g, '');

  let type = 'expense';
  for (let i = 0; i < INCOME_VERBS.length; i++) {
    if (text.indexOf(INCOME_VERBS[i]) !== -1) {
      type = 'income';
      text = removeSubstr(text, INCOME_VERBS[i]);
      break;
    }
  }
  if (type === 'expense') {
    for (let i = 0; i < EXPENSE_VERBS.length; i++) {
      if (text.indexOf(EXPENSE_VERBS[i]) !== -1) {
        text = removeSubstr(text, EXPENSE_VERBS[i]);
        break;
      }
    }
  }

  let source = null;
  if (type === 'income') {
    const sourceResult = extractSource(text);
    if (sourceResult.source) {
      source = sourceResult.source;
      text = removeSubstr(text, sourceResult.matchStr);
    }
  }

  text = text.replace(/["'׳״]/g, '');
  text = text.replace(/\s{2,}/g, ' ').trim();

  const category = matchCategory(text, type);

  const descParts = [];
  if (type === 'expense' && methodResult.method) descParts.push(methodResult.method);
  if (text) descParts.push(text);
  if (type === 'income' && source) descParts.push(source);
  const description = descParts.join(' ').replace(/\s{2,}/g, ' ').trim() || (type === 'income' ? 'הכנסה' : 'הוצאה');

  return {
    type: type,
    date: dateResult.date,
    amount: amountResult.value,
    method: methodResult.method,
    source: source,
    category: category,
    description: description,
    rawText: rawText
  };
}
