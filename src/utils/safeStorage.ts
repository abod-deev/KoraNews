/**
 * Safe LocalStorage wrapper to prevent runtime exceptions in restricted browser environments
 * (e.g. Incognito mode, third-party iframes, or disabled storage).
 */
export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[SafeStorage] Unable to read key "${key}":`, e);
    }
    return null;
  },
  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      console.warn(`[SafeStorage] Unable to set key "${key}":`, e);
    }
    return false;
  },
  removeItem: (key: string): boolean => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return true;
      }
    } catch (e) {
      console.warn(`[SafeStorage] Unable to remove key "${key}":`, e);
    }
    return false;
  }
};
