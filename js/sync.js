// סנכרון עם Google Drive (תיקיית appData נסתרת) - התחברות, מיזוג, ודחיפה אוטומטית.
// כל הפעולות הן best-effort: כשל ברשת/הרשאה לא פוגע בשימוש הרגיל באפליקציה (שממשיכה
// לעבוד לגמרי מה-localStorage), רק מציג הודעת שגיאה קצרה בעברית.

const SIGNED_IN_FLAG_KEY = 'xmoney_google_signed_in';

let _tokenClient = null;
let _accessToken = null;
let _syncFileId = null;
let _syncDebounceTimer = null;
let _onAuthStateChange = null;

function isGoogleSyncSupported() {
  return typeof google !== 'undefined' && !!(google.accounts && google.accounts.oauth2);
}

function initGoogleAuth(onAuthStateChange) {
  _onAuthStateChange = onAuthStateChange;
  if (!isGoogleSyncSupported()) return;

  _tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_DRIVE_SCOPE,
    callback: function (response) {
      if (response.error) {
        notifySyncError('ההתחברות ל-Google נכשלה, נסה שוב');
        return;
      }
      _accessToken = response.access_token;
      localStorage.setItem(SIGNED_IN_FLAG_KEY, '1');
      if (_onAuthStateChange) _onAuthStateChange('signed-in');
      performInitialSync();
    }
  });

  if (localStorage.getItem(SIGNED_IN_FLAG_KEY) === '1') {
    try {
      _tokenClient.requestAccessToken({ prompt: '' });
    } catch (e) {
      /* דורש אינטראקציה מחדש - נשאר "לא מחובר" עד לחיצה על הכפתור */
    }
  }
}

function signInToGoogle() {
  if (!isGoogleSyncSupported()) {
    notifySyncError('סנכרון Google אינו זמין בדפדפן הזה כרגע');
    return;
  }
  _tokenClient.requestAccessToken({ prompt: 'consent' });
}

function signOutFromGoogle() {
  if (_accessToken && typeof google !== 'undefined') {
    google.accounts.oauth2.revoke(_accessToken, function () {});
  }
  _accessToken = null;
  _syncFileId = null;
  localStorage.removeItem(SIGNED_IN_FLAG_KEY);
  if (_onAuthStateChange) _onAuthStateChange('signed-out');
}

function isSignedInToGoogle() {
  return !!_accessToken;
}

function notifySyncError(message) {
  if (typeof showToast === 'function') showToast(message);
}

function driveRequest(path, options) {
  options = options || {};
  const headers = Object.assign({ Authorization: 'Bearer ' + _accessToken }, options.headers || {});
  return fetch('https://www.googleapis.com/drive/v3/' + path, Object.assign({}, options, { headers: headers }))
    .then(function (res) {
      if (res.status === 401) {
        _accessToken = null;
        throw new Error('unauthorized');
      }
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

  return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + _accessToken,
      'Content-Type': 'multipart/related; boundary=' + boundary
    },
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
  return fetch('https://www.googleapis.com/upload/drive/v3/files/' + fileId + '?uploadType=media', {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + _accessToken,
      'Content-Type': 'application/json'
    },
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
