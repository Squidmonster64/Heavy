const DB_NAME = 'workout-logger';
const DB_VERSION = 2;

const STORES = {
  exercises: 'exercises',
  routines: 'routines',
  workoutSessions: 'workoutSessions',
  activeWorkout: 'activeWorkout',
  metadata: 'metadata'
};

let dbPromise;

export function openDatabase() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORES.exercises)) {
          const store = db.createObjectStore(STORES.exercises, { keyPath: 'id' });
          store.createIndex('normalizedName', 'normalizedName', { unique: false });
          store.createIndex('isCustom', 'isCustom', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.routines)) db.createObjectStore(STORES.routines, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.workoutSessions)) {
          const sessions = db.createObjectStore(STORES.workoutSessions, { keyPath: 'id' });
          sessions.createIndex('routineId', 'routineId', { unique: false });
          sessions.createIndex('completedAt', 'completedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.activeWorkout)) db.createObjectStore(STORES.activeWorkout, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.metadata)) db.createObjectStore(STORES.metadata, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll(storeName) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  const result = await requestToPromise(tx.objectStore(storeName).getAll());
  await transactionDone(tx);
  return result;
}

export async function getOne(storeName, id) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  const result = await requestToPromise(tx.objectStore(storeName).get(id));
  await transactionDone(tx);
  return result;
}

export async function putOne(storeName, value) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put(value);
  await transactionDone(tx);
  return value;
}

export async function putMany(storeName, values) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  values.forEach(value => store.put(value));
  await transactionDone(tx);
}

export async function deleteOne(storeName, id) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(id);
  await transactionDone(tx);
}

export async function clearStore(storeName) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).clear();
  await transactionDone(tx);
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Database transaction aborted'));
  });
}

export { STORES };
