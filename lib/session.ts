// Helper functions for robust session management across localStorage, IndexedDB, and token cookies

export const SESSION_KEY = 'baza_user';
export const TOKEN_COOKIE_KEY = 'baza_token';
export const COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // 400 days in seconds (Chrome/Safari browser limit)

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

/**
 * Saves user session to localStorage, IndexedDB, and sets a lightweight token cookie (baza_token)
 * to avoid HTTP cookie size limits (~4KB).
 */
export function saveUserSession(user: any): void {
  if (!user) return;
  const userJson = typeof user === 'string' ? user : JSON.stringify(user);
  const userObj = typeof user === 'string' ? JSON.parse(user) : user;

  // 1. Write to localStorage with quota overflow protection
  try {
    localStorage.setItem(SESSION_KEY, userJson);
    // Write-back verification
    const verified = localStorage.getItem(SESSION_KEY);
    if (!verified) {
      throw new Error('localStorage verification failed');
    }
  } catch (e) {
    console.warn('Failed to set localStorage session, attempting cleanup:', e);
    try {
      // Clean non-essential keys if localStorage quota is exceeded
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key !== SESSION_KEY && !key.startsWith('lastTelegramBind')) {
          localStorage.removeItem(key);
        }
      }
      localStorage.setItem(SESSION_KEY, userJson);
    } catch (cleanErr) {
      console.error('LocalStorage write failed even after cleanup:', cleanErr);
    }
  }

  // 2. Write lightweight token cookie (User ID or Nick)
  try {
    const token = encodeURIComponent(
      String(userObj['User ID'] || userObj['🔒 Row ID'] || userObj['Ник'] || '').trim()
    );
    if (token) {
      const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const secureFlag = isSecure ? '; Secure' : '';
      const expiresDate = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toUTCString();
      document.cookie = `${TOKEN_COOKIE_KEY}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; expires=${expiresDate}; SameSite=Lax${secureFlag}`;
    }
  } catch (e) {
    console.error('Failed to set token cookie session:', e);
  }

  // 3. Save to IndexedDB
  saveSessionToIndexedDB(userJson).catch(() => {});
}

/**
 * Synchronous lookup from localStorage.
 */
export function getSavedUserSession(): any | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read localStorage session:', e);
  }
  return null;
}

/**
 * Reads token value from document.cookie
 */
export function getCookieValue(cookieName: string): string | null {
  try {
    if (typeof document === 'undefined' || !document.cookie) return null;
    const cookies = document.cookie.split('; ');
    for (const c of cookies) {
      const [name, ...rest] = c.split('=');
      if (name.trim() === cookieName) {
        const val = rest.join('=');
        return val ? decodeURIComponent(val) : null;
      }
    }
  } catch (e) {
    console.error('Error reading cookie:', e);
  }
  return null;
}

/**
 * Asynchronous restoration evaluating all 3 storages (localStorage -> IndexedDB -> Token Cookie hydration).
 * Prevents premature redirection to /login while checking IDB or re-hydrating from token.
 */
export async function restoreUserSessionAsync(): Promise<any | null> {
  // 1. Try synchronous localStorage
  const syncSession = getSavedUserSession();
  if (syncSession) {
    saveUserSession(syncSession); // slide expiration
    return syncSession;
  }

  // 2. Check IndexedDB (iOS PWA standalone fallback)
  const idbSession = await getSessionFromIndexedDB();
  if (idbSession) {
    saveUserSession(idbSession);
    return idbSession;
  }

  // 3. Re-hydrate from token cookie via server lookup
  const token = getCookieValue(TOKEN_COOKIE_KEY);
  if (token) {
    try {
      const res = await fetch(`/api/sheets?sheet=Игроки&_t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const cleanToken = token.trim().toLowerCase();
        const matchedPlayer = json.data.find((p: any) => {
          const uId = String(p['User ID'] || '').trim().toLowerCase();
          const rId = String(p['🔒 Row ID'] || '').trim().toLowerCase();
          const nick = String(p['Ник'] || '').trim().toLowerCase();
          return uId === cleanToken || rId === cleanToken || nick === cleanToken;
        });

        if (matchedPlayer) {
          const isBanned =
            matchedPlayer['Бан'] === true ||
            String(matchedPlayer['Бан'] || '').toLowerCase() === 'true' ||
            String(matchedPlayer['Бан'] || '') === '1';

          if (!isBanned) {
            saveUserSession(matchedPlayer);
            return matchedPlayer;
          }
        }
      }
    } catch (e) {
      console.error('Failed to re-hydrate session from token cookie:', e);
    }
  }

  // Legacy fallback: check baza_user cookie if present
  const legacyUserCookie = getCookieValue(SESSION_KEY);
  if (legacyUserCookie) {
    try {
      const parsed = JSON.parse(legacyUserCookie);
      if (parsed && typeof parsed === 'object') {
        saveUserSession(parsed);
        return parsed;
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Clears session across all storages.
 */
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
    document.cookie = `${TOKEN_COOKIE_KEY}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureFlag}`;
  } catch (e) {
    console.error('Failed to clear cookie session:', e);
  }

  clearSessionFromIndexedDB().catch(() => {});
}
