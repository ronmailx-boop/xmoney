// שכבת אחסון מקומית (localStorage) - ללא שרת, ללא ענן

const STORAGE_KEYS = {
  TRANSACTIONS: 'xmoney_transactions',
  CATEGORIES: 'xmoney_categories',
  SETTINGS: 'xmoney_settings'
};

function safeParse(json, fallback) {
  try {
    const parsed = JSON.parse(json);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

function getTransactions() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS), []);
}

function saveTransactions(list) {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
}

function addTransactionToStorage(tx) {
  const list = getTransactions();
  list.push(tx);
  saveTransactions(list);
  return tx;
}

function deleteTransactionFromStorage(id) {
  const list = getTransactions().filter(function (t) { return t.id !== id; });
  saveTransactions(list);
}

function updateTransactionInStorage(id, changes) {
  const list = getTransactions();
  const tx = list.find(function (t) { return t.id === id; });
  if (!tx) return null;
  Object.assign(tx, changes);
  saveTransactions(list);
  return tx;
}

function getSettings() {
  return Object.assign({ cycleStartDay: 1 }, safeParse(localStorage.getItem(STORAGE_KEYS.SETTINGS), {}));
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

function getDynamicCategories() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.CATEGORIES), { income: [], expense: [] });
}

function addDynamicCategoryToStorage(name, type) {
  const cats = getDynamicCategories();
  const key = type === 'income' ? 'income' : 'expense';
  if (!cats[key]) cats[key] = [];
  if (cats[key].indexOf(name) === -1) {
    cats[key].push(name);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cats));
  }
}

function generateId() {
  return 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}
