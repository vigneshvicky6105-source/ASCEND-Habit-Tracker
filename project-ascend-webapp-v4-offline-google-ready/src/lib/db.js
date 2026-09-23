const DB_NAME = "project_ascend_v5_db";
const DB_VERSION = 8;
const STORES = [
  "tasks", "completions", "books", "wishlist", "concepts",
  "side_quests", "ai_chat_history", "challenges", "daily_focus",
  "dues", "fitness", "outbox", "meta"
];

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      STORES.forEach(s => {
        if (!db.objectStoreNames.contains(s)) {
          const store = db.createObjectStore(s, { keyPath: "id" });
          if (s !== "meta") {
            store.createIndex("user_id", "user_id", { unique: false });
          }
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetUserRecords(storeName, userId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const index = store.index("user_id");
      const req = index.getAll(userId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`IDB get error for store ${storeName}:`, err);
    return [];
  }
}

export async function idbSaveUserRecords(storeName, records, userId) {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const index = store.index("user_id");
    const getAllReq = index.getAllKeys(userId);
    
    getAllReq.onsuccess = () => {
      const existingKeys = getAllReq.result || [];
      existingKeys.forEach(k => store.delete(k));
      (records || []).forEach(r => store.put({ ...r, user_id: userId }));
    };
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error(`IDB save error for store ${storeName}:`, e);
  }
}

export async function idbGetMeta(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("meta", "readonly");
      const req = tx.objectStore("meta").get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function idbSetMeta(key, value) {
  try {
    const db = await openDB();
    const tx = db.transaction("meta", "readwrite");
    tx.objectStore("meta").put({ id: key, value });
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
  } catch (e) {
    console.error("IDB meta set error:", e);
  }
}

// --- OUTBOX QUEUE HELPERS ---

export async function idbEnqueueOutbox(userId, mutation) {
  try {
    const db = await openDB();
    const tx = db.transaction("outbox", "readwrite");
    const record = {
      id: mutation.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
      user_id: userId,
      timestamp: new Date().toISOString(),
      attempts: 0,
      ...mutation
    };
    tx.objectStore("outbox").put(record);
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
  } catch (e) {
    console.error("IDB enqueue outbox error:", e);
  }
}

export async function idbGetOutbox(userId) {
  return idbGetUserRecords("outbox", userId);
}

export async function idbRemoveOutbox(id) {
  try {
    const db = await openDB();
    const tx = db.transaction("outbox", "readwrite");
    tx.objectStore("outbox").delete(id);
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
  } catch (e) {
    console.error("IDB remove outbox error:", e);
  }
}
