// סנכרון עם Google Drive (תיקיית appData נסתרת) - התחברות קבועה עד התנתקות מפורשת,
// דרך שרת אימות זעיר (Cloudflare Worker, ראו worker/index.js) ששומר Refresh Token
// בבטחון בצד השרת - הדפדפן מחזיק רק "device token" אקראי (לא סוד רגיש), ומבקש טוקן
// גישה טרי מהשרת בכל טעינת דף. כל הפעולות הן best-effort: כשל ברשת/הרשאה לא פוגע
// בשימוש הרגיל באפליקציה (שממשיכה לעבוד לגמרי מה-localStorage), רק מציג הודעת שגיאה.

const DEVICE_TOKEN_KEY = 'xmoney_device_token';

let _accessToken = null;
let _syncFileId = null;
let _syncDebounceTimer = null;
let _onAuthStateChange = null;

function isGoogleSyncSupported() {
  return typeof AUTH_WORKER_URL === 'string' &&
    AUTH_WORKER_URL.indexOf('http') === 0 &&
    AUTH_WORKER_URL.indexOf('REPLACE-WITH') === -1;
}

function getDeviceToken() {
  return localStorage.getItem(DEVICE_TOKEN_KEY);
}

function wasSignedInBefore() {
  return !!getDeviceToken();
}

function consumeAuthResultFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const authToken = params.get('auth_token');
  const authError = params.get('auth_error');
  if (!authToken && !authError) return { authToken: null, authError: null };

  if (authToken) localStorage.setItem(DEVICE_TOKEN_KEY, authToken);
  params.delete('auth_token');
  params.delete('auth_error');
  const newSearch = params.toString();
  const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash;
  window.history.replaceState({}, '', newUrl);
  return { authToken: authToken, authError: authError };
}

function fetchFreshAccessToken() {
  const deviceToken = getDeviceToken();
  if (!deviceToken) return Promise.resolve(null);
  return fetch(AUTH_WORKER_URL + '/auth/token', { headers: { 'X-Device-Token': deviceToken } })
    .then(function (res) {
      if (!res.ok) throw new Error('token refresh failed');
      return res.json();
    })
    .then(function (json) {
      _accessToken = json.access_token;
      return _accessToken;
    })
    .catch(function () {
      _accessToken = null;
      localStorage.removeItem(DEVICE_TOKEN_KEY);
      return null;
    });
}

function initGoogleAuth(onAuthStateChange) {
  _onAuthStateChange = onAuthStateChange;
  if (!isGoogleSyncSupported()) return;

  const urlResult = consumeAuthResultFromUrl();
  if (urlResult.authError) {
    notifySyncError('ההתחברות ל-Google נכשלה, נסה שוב');
  }

  if (!getDeviceToken()) {
    if (_onAuthStateChange) _onAuthStateChange('signed-out');
    return;
  }

  fetchFreshAccessToken().then(function (token) {
    if (token) {
      if (_onAuthStateChange) _onAuthStateChange('signed-in');
      performInitialSync();
    } else {
      if (_onAuthStateChange) _onAuthStateChange('signed-out');
    }
  });
}

function signInToGoogle() {
  if (!isGoogleSyncSupported()) {
    notifySyncError('סנכרון Google אינו זמין כרגע - נסה לרענן את הדף');
    return;
  }
  const returnTo = window.location.origin + window.location.pathname;
  window.location.href = AUTH_WORKER_URL + '/auth/start?returnTo=' + encodeURIComponent(returnTo);
}

function signOutFromGoogle() {
  const deviceToken = getDeviceToken();
  localStorage.removeItem(DEVICE_TOKEN_KEY);
  _accessToken = null;
  _syncFileId = null;
  if (deviceToken && isGoogleSyncSupported()) {
    fetch(AUTH_WORKER_URL + '/auth/logout', { method: 'POST', headers: { 'X-Device-Token': deviceToken } })
      .catch(function () {});
  }
  if (_onAuthStateChange) _onAuthStateChange('signed-out');
}

function isSignedInToGoogle() {
  return !!_accessToken;
}

function notifySyncError(message) {
  if (typeof showToast === 'function') showToast(message);
}

// עוטף fetch ל-Drive API עם הרשאה, ומנסה שוב פעם אחת עם טוקן טרי אם קיבלנו 401
// (הטוקן הישן פג - קורה אחרי כשעה) - בלי לדרוש מהמשתמש אינטראקציה נוספת.
function driveFetch(url, options) {
  options = options || {};
  function attempt() {
    const headers = Object.assign({ Authorization: 'Bearer ' + _accessToken }, options.headers || {});
    return fetch(url, Object.assign({}, options, { headers: headers }));
  }
  return attempt().then(function (res) {
    if (res.status === 401) {
      return fetchFreshAccessToken().then(function (token) {
        if (!token) throw new Error('unauthorized');
        return attempt();
      });
    }
    return res;
  });
}

function driveRequest(path, options) {
  return driveFetch('https://www.googleapis.com/drive/v3/' + path, options).then(function (res) {
    if (!res.ok) throw new Error('drive request failed: ' + res.status);
    return res;
  });
}

function findSyncFile() {
  const q = encodeURIComponent("name='" + GOOGLE_SYNC_FILE_NAME + "'");
  return driveRequest('files?spaces=appDataFolder&q=' + q + '&fields=files(id)')
    .then(function (res) { return res.json(); })
    .then(function (json) {
      return (json.files && json.files[0]) ? json.files[0].id : null;
    });
}

function createSyncFile(data) {
  const metadata = { name: GOOGLE_SYNC_FILE_NAME, parents: ['appDataFolder'] };
  const boundary = 'xmoney-boundary';
  const body =
    '--' + boundary + '\r\n' +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(data) + '\r\n' +
    '--' + boundary + '--';

  return driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
    body: body
  })
    .then(function (res) {
      if (!res.ok) throw new Error('drive create failed: ' + res.status);
      return res.json();
    })
    .then(function (json) { return json.id; });
}

function readSyncFile(fileId) {
  return driveRequest('files/' + fileId + '?alt=media')
    .then(function (res) { return res.json(); })
    .catch(function () { return null; });
}

function writeSyncFile(fileId, data) {
  return driveFetch('https://www.googleapis.com/upload/drive/v3/files/' + fileId + '?uploadType=media', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(function (res) {
    if (!res.ok) throw new Error('drive write failed: ' + res.status);
    return res;
  });
}

function collectLocalSyncData() {
  return {
    transactions: getTransactions(),
    categories: getDynamicCategories(),
    settings: getSettings(),
    syncedAt: new Date().toISOString()
  };
}

function mergeSyncData(local, remote) {
  const txMap = {};
  (remote.transactions || []).forEach(function (t) { txMap[t.id] = t; });
  (local.transactions || []).forEach(function (t) { txMap[t.id] = t; });
  const mergedTransactions = Object.keys(txMap).map(function (id) { return txMap[id]; });

  const mergedCategories = { income: [], expense: [] };
  ['income', 'expense'].forEach(function (type) {
    const set = {};
    (remote.categories && remote.categories[type] || []).forEach(function (c) { set[c] = true; });
    (local.categories && local.categories[type] || []).forEach(function (c) { set[c] = true; });
    mergedCategories[type] = Object.keys(set);
  });

  const mergedSettings = Object.assign({}, remote.settings || {}, local.settings || {});

  return { transactions: mergedTransactions, categories: mergedCategories, settings: mergedSettings };
}

function applyMergedData(merged) {
  saveTransactions(merged.transactions);
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(merged.categories));
  saveSettings(merged.settings);
}

function performInitialSync() {
  findSyncFile()
    .then(function (fileId) {
      if (!fileId) {
        const localData = collectLocalSyncData();
        return createSyncFile(localData).then(function (id) {
          _syncFileId = id;
        });
      }
      _syncFileId = fileId;
      return readSyncFile(fileId).then(function (remoteData) {
        const localData = collectLocalSyncData();
        const merged = remoteData ? mergeSyncData(localData, remoteData) : localData;
        applyMergedData(merged);
        if (typeof renderHome === 'function') renderHome();
        if (typeof renderFullList === 'function') renderFullList();
        if (typeof renderStats === 'function') renderStats();
        return writeSyncFile(_syncFileId, Object.assign(merged, { syncedAt: new Date().toISOString() }));
      });
    })
    .catch(function () {
      notifySyncError('שגיאה בסנכרון הראשוני מול Google Drive');
    });
}

function scheduleCloudSync() {
  if (!isSignedInToGoogle()) return;
  clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer = setTimeout(pushToCloud, 1500);
}

function pushToCloud() {
  if (!isSignedInToGoogle()) return;
  const data = collectLocalSyncData();
  const finish = function (fileId) {
    _syncFileId = fileId;
    return writeSyncFile(fileId, data);
  };
  const ready = _syncFileId ? Promise.resolve(_syncFileId) : findSyncFile().then(function (id) {
    return id || createSyncFile(data);
  });
  ready.then(finish).catch(function () {
    notifySyncError('שגיאה בסנכרון עם Google Drive, ננסה שוב בהמשך');
  });
}
