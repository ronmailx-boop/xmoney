// אתחול, ניווט, רינדור וחיווט אירועים

let lastAddedId = null;
let currentFilter = 'all';

function formatAmount(n) {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('he-IL');
}

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined && text !== null) e.textContent = text;
  return e;
}

function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(function (s) {
    s.classList.toggle('active', s.id === screenId);
  });
  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.classList.toggle('active', b.dataset.screen === screenId);
  });
  if (screenId === 'screen-stats') renderStats();
  if (screenId === 'screen-transactions') renderFullList();
  if (screenId === 'screen-home') renderHome();
}

function buildTxRow(tx) {
  const li = el('li', 'tx-row ' + tx.type);

  const date = el('span', 'tx-date', formatDisplayDate(tx.date));
  const info = el('div', 'tx-info');
  const desc = el('div', 'tx-desc', tx.description);
  desc.addEventListener('click', function () {
    showDescriptionEditor(tx);
  });
  const meta = el('div', 'tx-meta');
  const cat = el('div', 'tx-category', tx.category + ' ▾');
  cat.addEventListener('click', function () {
    showCategoryPicker(tx);
  });
  const method = el('div', 'tx-method' + (tx.method ? '' : ' empty'), (tx.method || 'אמצעי תשלום') + ' ▾');
  method.addEventListener('click', function () {
    showMethodPicker(tx);
  });
  meta.appendChild(cat);
  meta.appendChild(method);
  info.appendChild(desc);
  info.appendChild(meta);

  const amount = el('span', 'tx-amount', (tx.type === 'income' ? '+' : '-') + formatAmount(tx.amount) + ' שח');
  amount.addEventListener('click', function () {
    showAmountEditor(tx);
  });

  const delBtn = el('button', 'tx-delete', '✕');
  delBtn.setAttribute('aria-label', 'מחק');
  delBtn.addEventListener('click', function () {
    showConfirmDialog('למחוק את התנועה?', tx.description, function () {
      deleteTransactionFromStorage(tx.id);
      renderHome();
      renderFullList();
      renderStats();
      scheduleCloudSync();
    });
  });

  const bottomRow = el('div', 'tx-bottom-row');
  bottomRow.appendChild(amount);
  bottomRow.appendChild(delBtn);

  li.appendChild(date);
  li.appendChild(info);
  li.appendChild(bottomRow);
  return li;
}

function renderList(container, transactions) {
  container.innerHTML = '';
  if (transactions.length === 0) {
    container.appendChild(el('li', 'empty-state', 'אין תנועות להצגה'));
    return;
  }
  const sorted = transactions.slice().sort(function (a, b) {
    return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
  });
  sorted.forEach(function (tx) {
    container.appendChild(buildTxRow(tx));
  });
}

function renderHome() {
  const settings = getSettings();
  const all = getTransactions();
  const cycleTx = getTransactionsInCycle(all, new Date(), settings.cycleStartDay);
  const summary = summarize(cycleTx);

  document.getElementById('home-income').textContent = formatAmount(summary.income) + ' שח';
  document.getElementById('home-expense').textContent = formatAmount(summary.expense) + ' שח';
  document.getElementById('home-balance').textContent = formatAmount(summary.balance) + ' שח';

  const recent = all.slice().sort(function (a, b) { return b.createdAt - a.createdAt; }).slice(0, 8);
  renderList(document.getElementById('recent-list'), recent);
}

function renderFullList() {
  const all = getTransactions();
  const filtered = currentFilter === 'all' ? all : all.filter(function (t) { return t.type === currentFilter; });
  renderList(document.getElementById('full-list'), filtered);
}

function renderStats() {
  const settings = getSettings();
  const all = getTransactions();
  const cycleTx = getTransactionsInCycle(all, new Date(), settings.cycleStartDay);
  const summary = summarize(cycleTx);

  document.getElementById('stats-income').textContent = formatAmount(summary.income) + ' שח';
  document.getElementById('stats-expense').textContent = formatAmount(summary.expense) + ' שח';
  document.getElementById('stats-balance').textContent = formatAmount(summary.balance) + ' שח';

  const chart = document.getElementById('category-chart');
  chart.innerHTML = '';
  const byCategory = aggregateByCategory(cycleTx, 'expense');

  if (byCategory.length === 0) {
    chart.appendChild(el('div', 'empty-state', 'אין הוצאות במחזור הנוכחי'));
    return;
  }

  const max = byCategory[0].total;
  byCategory.forEach(function (row) {
    const rowEl = el('div', 'chart-row');
    const labels = el('div', 'chart-row-labels');
    labels.appendChild(el('span', null, row.category));
    labels.appendChild(el('span', null, formatAmount(row.total) + ' שח'));
    const barBg = el('div', 'chart-row-bar-bg');
    const barFill = el('div', 'chart-row-bar-fill');
    barFill.style.width = Math.max(4, Math.round((row.total / max) * 100)) + '%';
    barBg.appendChild(barFill);
    rowEl.appendChild(labels);
    rowEl.appendChild(barBg);
    chart.appendChild(rowEl);
  });
}

function showConfirmDialog(title, subtitle, onConfirm) {
  const overlay = el('div', 'modal-overlay');
  const card = el('div', 'modal-card');
  card.appendChild(el('div', 'modal-title', title));
  if (subtitle) card.appendChild(el('div', 'modal-subtitle', subtitle));

  const actions = el('div', 'modal-actions');
  const cancelBtn = el('button', 'btn-secondary', 'ביטול');
  const confirmBtn = el('button', 'btn-danger', 'מחק');

  function close() {
    overlay.remove();
  }

  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  confirmBtn.addEventListener('click', function () {
    close();
    onConfirm();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  card.appendChild(actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function applyCategoryToTransaction(tx, category) {
  updateTransactionInStorage(tx.id, { category: category });
  renderHome();
  renderFullList();
  renderStats();
  scheduleCloudSync();
}

function showCategoryPicker(tx) {
  const overlay = el('div', 'modal-overlay');
  const card = el('div', 'modal-card');
  card.appendChild(el('div', 'modal-title', 'בחר קטגוריה'));

  function close() {
    overlay.remove();
  }

  const list = el('div', 'category-option-list');
  card.appendChild(list);

  function renderOptions() {
    list.innerHTML = '';
    getAllCategories(tx.type).forEach(function (cat) {
      const option = el('div', 'category-option' + (cat === tx.category ? ' selected' : ''));
      const label = el('span', 'category-option-label', cat);
      label.addEventListener('click', function () {
        close();
        applyCategoryToTransaction(tx, cat);
      });
      option.appendChild(label);

      if (!isBuiltInCategory(cat, tx.type)) {
        const delBtn = el('button', 'category-option-delete', '✕');
        delBtn.setAttribute('aria-label', 'מחק קטגוריה');
        delBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          showConfirmDialog('למחוק את הקטגוריה "' + cat + '"?', null, function () {
            removeDynamicCategoryFromStorage(cat, tx.type);
            renderOptions();
          });
        });
        option.appendChild(delBtn);
      }

      list.appendChild(option);
    });
  }
  renderOptions();

  const newRow = el('div', 'category-new-row');
  const newInput = el('input', null);
  newInput.type = 'text';
  newInput.placeholder = 'קטגוריה חדשה...';
  const newBtn = el('button', 'btn-primary', 'צור');
  newRow.appendChild(newInput);
  newRow.appendChild(newBtn);
  card.appendChild(newRow);

  function createNewCategory() {
    const name = newInput.value.trim();
    if (!name) return;
    addDynamicCategoryToStorage(name, tx.type);
    close();
    applyCategoryToTransaction(tx, name);
  }
  newBtn.addEventListener('click', createNewCategory);
  newInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      createNewCategory();
    }
  });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function applyMethodToTransaction(tx, method) {
  updateTransactionInStorage(tx.id, { method: method });
  renderHome();
  renderFullList();
  renderStats();
  scheduleCloudSync();
}

function showMethodPicker(tx) {
  const overlay = el('div', 'modal-overlay');
  const card = el('div', 'modal-card');
  card.appendChild(el('div', 'modal-title', 'אמצעי תשלום'));

  function close() {
    overlay.remove();
  }

  const quickList = el('div', 'category-option-list');

  function pick(method) {
    close();
    applyMethodToTransaction(tx, method);
  }

  ['מזומן', 'בנק'].forEach(function (label) {
    const option = el('button', 'category-option' + (tx.method === label ? ' selected' : ''), label);
    option.addEventListener('click', function () { pick(label); });
    quickList.appendChild(option);
  });

  const creditOption = el('button', 'category-option' + (tx.method && tx.method.indexOf('אשראי') === 0 ? ' selected' : ''), 'אשראי');
  quickList.appendChild(creditOption);
  card.appendChild(quickList);

  const cardRow = el('div', 'category-new-row hidden');
  const cardInput = el('input', null);
  cardInput.type = 'text';
  cardInput.inputMode = 'numeric';
  cardInput.placeholder = 'מספר כרטיס (אופציונלי)';
  const cardBtn = el('button', 'btn-primary', 'אישור');
  cardRow.appendChild(cardInput);
  cardRow.appendChild(cardBtn);
  card.appendChild(cardRow);

  creditOption.addEventListener('click', function () {
    cardRow.classList.remove('hidden');
    cardInput.focus();
  });
  function confirmCredit() {
    const digits = cardInput.value.trim();
    pick(digits ? 'אשראי ' + digits : 'אשראי');
  }
  cardBtn.addEventListener('click', confirmCredit);
  cardInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmCredit();
    }
  });

  const otherRow = el('div', 'category-new-row');
  const otherInput = el('input', null);
  otherInput.type = 'text';
  otherInput.placeholder = 'אמצעי תשלום אחר...';
  const otherBtn = el('button', 'btn-primary', 'שמור');
  otherRow.appendChild(otherInput);
  otherRow.appendChild(otherBtn);
  card.appendChild(otherRow);

  function confirmOther() {
    const name = otherInput.value.trim();
    if (!name) return;
    pick(name);
  }
  otherBtn.addEventListener('click', confirmOther);
  otherInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmOther();
    }
  });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function showDescriptionEditor(tx) {
  const overlay = el('div', 'modal-overlay');
  const card = el('div', 'modal-card');
  card.appendChild(el('div', 'modal-title', 'עדכון שם הפעולה'));

  function close() {
    overlay.remove();
  }

  const row = el('div', 'category-new-row');
  const input = el('input', null);
  input.type = 'text';
  input.value = tx.description;
  row.appendChild(input);
  card.appendChild(row);

  const actions = el('div', 'modal-actions');
  const cancelBtn = el('button', 'btn-secondary', 'ביטול');
  const saveBtn = el('button', 'btn-primary', 'שמור');
  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  card.appendChild(actions);

  function save() {
    const value = input.value.trim();
    if (!value) return;
    close();
    updateTransactionInStorage(tx.id, { description: value });
    renderHome();
    renderFullList();
    renderStats();
    scheduleCloudSync();
  }

  cancelBtn.addEventListener('click', close);
  saveBtn.addEventListener('click', save);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  overlay.appendChild(card);
  document.body.appendChild(overlay);
  input.focus();
}

function showAmountEditor(tx) {
  const overlay = el('div', 'modal-overlay');
  const card = el('div', 'modal-card');
  card.appendChild(el('div', 'modal-title', 'עדכון סכום'));

  function close() {
    overlay.remove();
  }

  const row = el('div', 'category-new-row');
  const input = el('input', null);
  input.type = 'number';
  input.inputMode = 'decimal';
  input.step = '0.01';
  input.min = '0';
  input.value = tx.amount;
  row.appendChild(input);
  card.appendChild(row);

  const actions = el('div', 'modal-actions');
  const cancelBtn = el('button', 'btn-secondary', 'ביטול');
  const saveBtn = el('button', 'btn-primary', 'שמור');
  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  card.appendChild(actions);

  cancelBtn.addEventListener('click', close);
  saveBtn.addEventListener('click', function () {
    const value = parseFloat(input.value);
    if (isNaN(value) || value <= 0) return;
    close();
    updateTransactionInStorage(tx.id, { amount: value });
    renderHome();
    renderFullList();
    renderStats();
    scheduleCloudSync();
  });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  overlay.appendChild(card);
  document.body.appendChild(overlay);
  input.focus();
}

function showToast(message, onUndo) {
  const toast = document.getElementById('toast');
  toast.innerHTML = '';
  toast.appendChild(el('span', null, message));
  if (onUndo) {
    const undoBtn = el('button', null, 'בטל');
    undoBtn.addEventListener('click', function () {
      onUndo();
      toast.classList.add('hidden');
    });
    toast.appendChild(undoBtn);
  }
  toast.classList.remove('hidden');
  setTimeout(function () {
    toast.classList.add('hidden');
  }, 5000);
}

function commitParsedEntry(parsed) {
  if (!parsed.amount || parsed.amount <= 0) {
    showToast('לא זוהה סכום תקין, נסה שוב או הקלד ידנית');
    return;
  }
  const tx = Object.assign({ id: generateId(), createdAt: Date.now() }, parsed);
  addTransactionToStorage(tx);
  lastAddedId = tx.id;
  renderHome();
  renderFullList();
  renderStats();
  scheduleCloudSync();
  showToast('נוסף: ' + tx.description + ' - ' + formatAmount(tx.amount) + ' שח', function () {
    deleteTransactionFromStorage(tx.id);
    renderHome();
    renderFullList();
    renderStats();
    scheduleCloudSync();
  });
}

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchScreen(btn.dataset.screen);
    });
  });
}

function setupFilters() {
  document.querySelectorAll('.filter-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.filter-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderFullList();
    });
  });
}

function setupTextForm() {
  const form = document.getElementById('text-entry-form');
  const input = document.getElementById('text-entry-input');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const parsed = parseEntryText(text);
    commitParsedEntry(parsed);
    input.value = '';
  });
}

function setupMic() {
  const button = document.getElementById('mic-button');
  const hint = document.getElementById('mic-hint');

  if (!isSpeechSupported()) {
    hint.textContent = 'זיהוי קולי אינו נתמך בדפדפן זה - השתמש בתיבת הטקסט';
    button.disabled = true;
    button.style.opacity = '0.5';
    return;
  }

  let pressed = false;

  function onPressStart(e) {
    e.preventDefault();
    if (pressed) return;
    pressed = true;
    button.classList.add('listening');
    hint.textContent = 'מקשיב...';
    startListening(function () {
      hint.textContent = 'שגיאה בזיהוי הקולי, נסה שוב או הקלד';
      button.classList.remove('listening');
      pressed = false;
    });
  }

  function onPressEnd(e) {
    if (!pressed) return;
    pressed = false;
    button.classList.remove('listening');
    hint.textContent = 'מעבד...';
    stopListening(function (transcript) {
      if (!transcript) {
        hint.textContent = 'החזק לחיצה ודבר';
        return;
      }
      const parsed = parseEntryText(transcript);
      commitParsedEntry(parsed);
      hint.textContent = 'החזק לחיצה ודבר';
    });
  }

  button.addEventListener('mousedown', onPressStart);
  button.addEventListener('touchstart', onPressStart, { passive: false });
  button.addEventListener('mouseup', onPressEnd);
  button.addEventListener('mouseleave', onPressEnd);
  button.addEventListener('touchend', onPressEnd);
  button.addEventListener('touchcancel', onPressEnd);
}

function setupSettings() {
  const select = document.getElementById('cycle-day-select');
  select.innerHTML = '';
  for (let d = 1; d <= 28; d++) {
    const opt = el('option', null, 'יום ' + d + ' בחודש');
    opt.value = d;
    select.appendChild(opt);
  }
  const settings = getSettings();
  select.value = settings.cycleStartDay;
  select.addEventListener('change', function () {
    const s = getSettings();
    s.cycleStartDay = parseInt(select.value, 10);
    saveSettings(s);
    renderHome();
    renderStats();
    scheduleCloudSync();
  });
}

function applyTextSizePercent(percent) {
  document.body.style.setProperty('--tx-text-scale', percent / 100);
  const label = document.getElementById('text-size-value');
  if (label) label.textContent = percent + '%';
}

function setupTextSize() {
  const slider = document.getElementById('text-size-slider');
  const settings = getSettings();
  const current = settings.textSizePercent || 100;
  slider.value = current;
  applyTextSizePercent(current);

  slider.addEventListener('input', function () {
    applyTextSizePercent(parseInt(slider.value, 10));
  });
  slider.addEventListener('change', function () {
    const s = getSettings();
    s.textSizePercent = parseInt(slider.value, 10);
    saveSettings(s);
    scheduleCloudSync();
  });
}

function setupGoogleSync() {
  const statusEl = document.getElementById('sync-status');
  const signInBtn = document.getElementById('google-signin-btn');
  const signOutBtn = document.getElementById('google-signout-btn');
  let authResolved = false;

  function refreshUI() {
    if (isSignedInToGoogle()) {
      statusEl.textContent = 'מחובר - הנתונים מסונכרנים אוטומטית ל-Google Drive';
      signInBtn.classList.add('hidden');
      signOutBtn.classList.remove('hidden');
    } else if (!authResolved && wasSignedInBefore()) {
      statusEl.textContent = 'מתחבר מחדש ל-Google...';
      signInBtn.classList.add('hidden');
      signOutBtn.classList.add('hidden');
    } else if (wasSignedInBefore()) {
      statusEl.textContent = 'ההתחברות פגה - לחץ "התחבר עם Google" כדי להתחבר מחדש';
      signInBtn.classList.remove('hidden');
      signOutBtn.classList.add('hidden');
    } else {
      statusEl.textContent = 'לא מחובר - הנתונים נשמרים רק במכשיר הזה';
      signInBtn.classList.remove('hidden');
      signOutBtn.classList.add('hidden');
    }
  }

  signInBtn.addEventListener('click', function () {
    signInToGoogle();
  });
  signOutBtn.addEventListener('click', function () {
    signOutFromGoogle();
    authResolved = true;
    refreshUI();
  });

  initGoogleAuth(function (state) {
    authResolved = true;
    refreshUI();
    if (state === 'signed-in') {
      showToast('מחובר ל-Google Drive, מסנכרן...');
    }
  });

  refreshUI();
}

function init() {
  setupNav();
  setupFilters();
  setupTextForm();
  setupMic();
  setupSettings();
  setupTextSize();
  setupGoogleSync();
  renderHome();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
}

document.addEventListener('DOMContentLoaded', init);
