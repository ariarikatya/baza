// Helper functions for robust session management across localStorage and fallback cookies

export const SESSION_KEY = 'baza_user';
export const COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // 400 days in seconds (Chrome browser limit)

const DB_NAME = 'baza_pwa_db';
const STORE_NAME = 'session_store';
const DB_KEY = 'current_user';

function openSessionDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return resolve(null);
    }
    try {
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (event: any) => resolve(event.target.result);
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

export async function saveSessionToIndexedDB(userJson: string): Promise<void> {
  const db = await openSessionDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(userJson, DB_KEY);
  } catch (e) {
    console.error('Failed to save session to IndexedDB:', e);
  }
}

export async function getSessionFromIndexedDB(): Promise<any | null> {
  const db = await openSessionDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(DB_KEY);
      request.onsuccess = () => {
        const val = request.result;
        if (val) {
          try {
            resolve(typeof val === 'string' ? JSON.parse(val) : val);
          } catch (e) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

export async function clearSessionFromIndexedDB(): Promise<void> {
  const db = await openSessionDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(DB_KEY);
  } catch (e) {}
}

export function saveUserSession(user: any): void {
  if (!user) return;
  const userJson = typeof user === 'string' ? user : JSON.stringify(user);

  try {
    localStorage.setItem(SESSION_KEY, userJson);
  } catch (e) {
    console.error('Failed to set localStorage session:', e);
  }

  try {
    const encoded = encodeURIComponent(userJson);
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';
    const expiresDate = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toUTCString();
    document.cookie = `${SESSION_KEY}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; expires=${expiresDate}; SameSite=Lax${secureFlag}`;
  } catch (e) {
    console.error('Failed to set cookie session:', e);
  }

  saveSessionToIndexedDB(userJson).catch(() => {});
}

export function getSavedUserSession(): any | null {
  let foundUser: any = null;

  // 1. Try localStorage
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        foundUser = parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read localStorage session:', e);
  }

  // 2. Try Fallback Cookie if localStorage is missing
  if (!foundUser) {
    try {
      const cookies = document.cookie ? document.cookie.split('; ') : [];
      for (const c of cookies) {
        const [name, ...rest] = c.split('=');
        if (name === SESSION_KEY) {
          const val = rest.join('=');
          if (val) {
            const decoded = decodeURIComponent(val);
            const parsed = JSON.parse(decoded);
            if (parsed && typeof parsed === 'object') {
              foundUser = parsed;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to read fallback cookie session:', e);
    }
  }

  if (foundUser) {
    // Sliding session: refresh localStorage, cookie, and IndexedDB
    saveUserSession(foundUser);
    return foundUser;
  }

  return null;
}

export async function restoreUserSessionAsync(): Promise<any | null> {
  const syncSession = getSavedUserSession();
  if (syncSession) return syncSession;

  // 3. Check IndexedDB (iOS PWA standalone fallback)
  const idbSession = await getSessionFromIndexedDB();
  if (idbSession) {
    saveUserSession(idbSession);
    return idbSession;
  }

  return null;
}

export function clearUserSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error('Failed to clear localStorage session:', e);
  }

  try {
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';
    document.cookie = `${SESSION_KEY}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureFlag}`;
  } catch (e) {
    console.error('Failed to clear cookie session:', e);
  }

  clearSessionFromIndexedDB().catch(() => {});
}
