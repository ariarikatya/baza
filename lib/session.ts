// Helper functions for robust session management across localStorage and fallback cookies

export const SESSION_KEY = 'baza_user';
export const COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // 400 days in seconds (Chrome browser limit)

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
    document.cookie = `${SESSION_KEY}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secureFlag}`;
  } catch (e) {
    console.error('Failed to set cookie session:', e);
  }
}

export function getSavedUserSession(): any | null {
  // 1. Try localStorage
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        // Refresh cookie max-age
        saveUserSession(parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read localStorage session:', e);
  }

  // 2. Try Fallback Cookie if localStorage is missing
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
            // Restore localStorage
            try {
              localStorage.setItem(SESSION_KEY, decoded);
            } catch (err) {}
            return parsed;
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to read fallback cookie session:', e);
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
    document.cookie = `${SESSION_KEY}=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
  } catch (e) {
    console.error('Failed to clear cookie session:', e);
  }
}
