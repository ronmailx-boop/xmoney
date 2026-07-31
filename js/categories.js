// מילון קטגוריות ברירת מחדל + מנגנון התאמה/המצאת קטגוריה

const EXPENSE_CATEGORIES = {
  'מזון וסופר': ['סופר', 'סופרמרקט', 'מכולת', 'שוק', 'ירקות', 'פירות', 'לחם', 'חלב', 'ביצים', 'בשר', 'דגים'],
  'ממתקים ומאפים': ['קקאו', 'שוקולד', 'ממתק', 'ממתקים', 'עוגה', 'עוגיות', 'גלידה', 'וופל', 'מאפה', 'בורקס', 'עוגיה'],
  'תחבורה ורכב': ['רב קו', 'רבקו', 'אוטובוס', 'רכבת', 'מונית', 'חניה', 'אגרה', 'ביטוח רכב', 'טסט', 'מוסך'],
  'דלק': ['דלק', 'תחנת דלק', 'בנזין', 'סולר'],
  'חשבונות ודיור': ['שכירות', 'ארנונה', 'חשמל', 'מים', 'גז', 'ועד בית', 'משכנתא'],
  'תקשורת': ['סלולר', 'טלפון', 'אינטרנט', 'כבלים', 'פרטנר', 'סלקום', 'הוט', 'בזק'],
  'בריאות': ['רופא', 'תרופות', 'בית מרקחת', 'קופת חולים', 'שיניים', 'משקפיים'],
  'ביגוד והנעלה': ['בגדים', 'חולצה', 'מכנסיים', 'נעליים', 'נעלי'],
  'בילויים ובידור': ['קולנוע', 'סרט', 'מסעדה', 'בר', 'פאב', 'הופעה', 'נטפליקס', 'ספוטיפיי', 'טיול'],
  'חינוך': ['ספרים', 'קורס', 'שיעור', 'גן', 'בית ספר', 'חוג'],
  'מתנות': ['מתנה', 'מתנות', 'פרחים']
};

const INCOME_CATEGORIES = {
  'משכורת': ['משכורת', 'שכר עבודה', 'שכר'],
  'מתנות': ['מתנה', 'מתנות'],
  'החזרים': ['החזר', 'זיכוי'],
  'השקעות': ['ריבית', 'דיבידנד', 'השקעה']
};

const FALLBACK_CATEGORY = { expense: 'שונות', income: 'אחר' };

function matchCategory(remainingText, type) {
  const dict = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  for (const cat in dict) {
    const keywords = dict[cat];
    for (let i = 0; i < keywords.length; i++) {
      if (remainingText.indexOf(keywords[i]) !== -1) return cat;
    }
  }

  const dynamic = getDynamicCategories();
  const dynamicList = type === 'income' ? dynamic.income : dynamic.expense;
  for (let i = 0; i < dynamicList.length; i++) {
    if (remainingText.indexOf(dynamicList[i]) !== -1) return dynamicList[i];
  }

  const words = remainingText.split(/\s+/).filter(function (w) { return w.length > 1; });
  if (words.length > 0) {
    const invented = words[0];
    addDynamicCategoryToStorage(invented, type);
    return invented;
  }

  return FALLBACK_CATEGORY[type];
}

function getAllCategories(type) {
  const base = Object.keys(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES);
  const dynamic = getDynamicCategories();
  const dynamicList = type === 'income' ? dynamic.income : dynamic.expense;
  const merged = base.concat(dynamicList.filter(function (c) { return base.indexOf(c) === -1; }));
  merged.push(FALLBACK_CATEGORY[type]);
  return merged;
}
