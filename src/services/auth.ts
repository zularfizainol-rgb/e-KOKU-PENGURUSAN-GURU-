import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();
// Google Sheets scope for spreadsheet access
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.setCustomParameters({
  prompt: 'select_account'
});

const TOKEN_STORAGE_KEY = 'ekoku_google_access_token';
const TOKEN_TIME_KEY = 'ekoku_google_token_timestamp';

let isSigningIn = false;
let cachedAccessToken: string | null = (() => {
  try {
    const timeStr = sessionStorage.getItem(TOKEN_TIME_KEY) || localStorage.getItem(TOKEN_TIME_KEY);
    if (timeStr) {
      const elapsed = Date.now() - parseInt(timeStr, 10);
      // Google OAuth token expires in 60 minutes. Consider expired after 55 min.
      if (elapsed > 55 * 60 * 1000) {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(TOKEN_TIME_KEY);
        localStorage.removeItem(TOKEN_TIME_KEY);
        return null;
      }
    }
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
})();

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = await getAccessToken();
      if (token) {
        cachedAccessToken = token;
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else {
        // User is recognized by Firebase, but OAuth access token needs refresh
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      clearAccessToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const isUserCancelledAuthError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const anyErr = error as { code?: string; message?: string };
  const code = anyErr.code || '';
  const message = anyErr.message || '';
  return (
    code === 'auth/user-cancelled' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    message.includes('user-cancelled') ||
    message.includes('popup-closed') ||
    message.includes('IdP denied access')
  );
};

export const parseAuthError = (error: unknown): string => {
  if (!error) {
    return 'Ralat tidak diketahui semasa menyambung ke Google.';
  }
  if (typeof error === 'string') {
    return error;
  }
  const anyErr = error as { code?: string; message?: string };
  const code = anyErr.code || '';
  const message = anyErr.message || '';

  if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'domain anda';
    return `Domain "${currentDomain}" belum didaftarkan sebagai Authorized Domain dalam Firebase Console. Sila masukkan domain Vercel ini di Firebase Console > Authentication > Settings > Authorized Domains.`;
  }
  if (code === 'auth/popup-blocked' || message.includes('popup-blocked')) {
    return 'Tetingkap timbul (Pop-up) disekat oleh pelayar anda. Sila klik ikon kunci/kebenaran di bar alamat pelayar dan benarkan pop-up ("Always allow pop-ups") untuk laman ini.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Gagal berhubung ke pelayan Google. Sila periksa sambungan internet anda.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Log masuk Google belum diaktifkan dalam Firebase Authentication (Sign-in method > Google).';
  }
  if (message.includes('AUTH_EXPIRED') || message.includes('401') || message.includes('invalid authentication credentials')) {
    return 'Sesi Google telah tamat tempoh keselamatan (sesi 1 jam). Sila klik butang "Sambung Semula & Simpan" di bawah.';
  }
  if (message.includes('PERMISSION_DENIED') || message.includes('403') || message.includes('permission')) {
    return 'Akaun Google anda tiada kebenaran Editor pada fail Google Sheet ini. Pastikan anda menggunakan fail milik akaun Google anda atau berikan akses Editor.';
  }

  return message || 'Ralat log masuk Google.';
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Google Sheets daripada pengesahan akaun.');
    }

    cachedAccessToken = credential.accessToken;
    const now = Date.now().toString();
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, credential.accessToken);
      localStorage.setItem(TOKEN_STORAGE_KEY, credential.accessToken);
      sessionStorage.setItem(TOKEN_TIME_KEY, now);
      localStorage.setItem(TOKEN_TIME_KEY, now);
    } catch {
      // ignore storage errors
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    if (isUserCancelledAuthError(error)) {
      return null;
    }
    console.warn('Google sign in issue:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const clearAccessToken = () => {
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_TIME_KEY);
    localStorage.removeItem(TOKEN_TIME_KEY);
  } catch {
    // ignore
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  try {
    const timeStr = sessionStorage.getItem(TOKEN_TIME_KEY) || localStorage.getItem(TOKEN_TIME_KEY);
    if (timeStr) {
      const elapsed = Date.now() - parseInt(timeStr, 10);
      if (elapsed > 55 * 60 * 1000) {
        clearAccessToken();
        return null;
      }
    }
  } catch {
    // ignore
  }

  if (cachedAccessToken) return cachedAccessToken;
  try {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      cachedAccessToken = stored;
      return stored;
    }
  } catch {
    // ignore
  }
  return null;
};

export const setAccessTokenInMemory = (token: string | null) => {
  cachedAccessToken = token;
  const now = Date.now().toString();
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      sessionStorage.setItem(TOKEN_TIME_KEY, now);
      localStorage.setItem(TOKEN_TIME_KEY, now);
    } else {
      clearAccessToken();
    }
  } catch {
    // ignore
  }
};

export const logout = async () => {
  await signOut(auth);
  clearAccessToken();
};
