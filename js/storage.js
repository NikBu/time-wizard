// ── STORAGE: IndexedDB persistence layer ────────────────────────
// Stores app session (timers, lists, settings) and uploaded audio files.
// DB: 'timewizard-db' v1
//   stores:
//     'session'    — keyPath:'id', single doc id='main'
//     'audioFiles' — keyPath:'id', autoIncrement
//       fields: { id, kind ('alarm'|'music'), name, mimeType, size, blob, addedAt }

const DB_NAME = 'timewizard-db';
const DB_VERSION = 1;
let _db = null;

export function initDB() {
  return new Promise((resolve, reject) => {
    if (_db) { resolve(_db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('audioFiles')) {
        const store = db.createObjectStore('audioFiles', { keyPath: 'id', autoIncrement: true });
        store.createIndex('kind', 'kind', { unique: false });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = e => { console.error('[storage] initDB failed', e.target.error); reject(e.target.error); };
  });
}

function _tx(storeName, mode) {
  return _db.transaction([storeName], mode).objectStore(storeName);
}

function _wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

// ── SESSION ──────────────────────────────────────────────────────

/**
 * Persist current app state snapshot.
 * Pass a plain object (JSON-serialisable).
 * { timers, lists, activeList, totalPts, settings: { theme, archEnabled, musicVolume, alarmVolume } }
 */
export async function saveSession(payload) {
  await initDB();
  const store = _tx('session', 'readwrite');
  return _wrap(store.put({ id: 'main', savedAt: Date.now(), ...payload }));
}

/**
 * Load last saved session.
 * Returns the saved object or null if nothing stored yet.
 */
export async function loadSession() {
  await initDB();
  const store = _tx('session', 'readonly');
  const result = await _wrap(store.get('main'));
  return result || null;
}

// ── AUDIO FILES ───────────────────────────────────────────────────

/**
 * Save an uploaded audio file blob.
 * @param {File} file — the raw File object from <input type=file>
 * @param {'alarm'|'music'} kind
 * @returns {Promise<number>} — the auto-assigned id
 */
export async function saveAudioFile(file, kind) {
  await initDB();
  const store = _tx('audioFiles', 'readwrite');
  const record = {
    kind,
    name: file.name,
    mimeType: file.type || 'audio/mpeg',
    size: file.size,
    blob: file,
    addedAt: Date.now(),
  };
  return _wrap(store.add(record));
}

/**
 * Retrieve a single audio file record by id.
 * Returns { id, kind, name, mimeType, size, blob, addedAt } or null.
 */
export async function getAudioFile(id) {
  await initDB();
  const store = _tx('audioFiles', 'readonly');
  return _wrap(store.get(id));
}

/**
 * Get all audio files, optionally filtered by kind.
 * @param {'alarm'|'music'|null} kind — pass null for all
 * @returns {Promise<Array>}
 */
export async function getAudioFiles(kind = null) {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = _tx('audioFiles', 'readonly');
    const req = kind
      ? store.index('kind').getAll(kind)
      : store.getAll();
    req.onsuccess = e => resolve(e.target.result || []);
    req.onerror = e => reject(e.target.error);
  });
}

/**
 * Delete an audio file record by id.
 */
export async function deleteAudioFile(id) {
  await initDB();
  const store = _tx('audioFiles', 'readwrite');
  return _wrap(store.delete(id));
}

/**
 * Create an object URL from a stored audio file.
 * Remember to call URL.revokeObjectURL when done.
 */
export async function getAudioURL(id) {
  const record = await getAudioFile(id);
  if (!record) return null;
  return URL.createObjectURL(record.blob);
}

// ── PERSISTENCE DURABILITY ───────────────────────────────────────

/**
 * Request persistent storage to prevent browser eviction.
 * Returns true if granted, false otherwise.
 * Call once after the user first saves meaningful data.
 */
export async function requestPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) return false;
  const already = await navigator.storage.persisted();
  if (already) return true;
  const granted = await navigator.storage.persist();
  if (granted) console.log('[storage] Persistent storage granted.');
  else console.warn('[storage] Persistent storage NOT granted — data may be evicted under pressure.');
  return granted;
}

/**
 * Estimate storage usage for display in UI.
 * Returns { usage, quota, usagePercent } in bytes, or null.
 */
export async function getStorageEstimate() {
  if (!navigator.storage || !navigator.storage.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  return { usage, quota, usagePercent: Math.round((usage / quota) * 100) };
}

// ── DEBOUNCED AUTO-SAVE HELPER ───────────────────────────────────
let _saveTimer = null;

/**
 * Schedule a session save after a short delay.
 * Multiple rapid calls coalesce into one write.
 * Pass a function that returns the current payload.
 * e.g. scheduleSave(() => buildSavePayload());
 */
export function scheduleSave(payloadFn, delayMs = 500) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      await saveSession(payloadFn());
    } catch(e) {
      console.error('[storage] Auto-save failed', e);
    }
  }, delayMs);
}
