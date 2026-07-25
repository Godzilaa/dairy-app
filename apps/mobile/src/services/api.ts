import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_API_URL = 'https://dairy-api-jia4.onrender.com';

const getDefaultUrl = () => DEFAULT_API_URL;

let API_URL = getDefaultUrl();

const getBaseUrl = async () => {
  const stored = await AsyncStorage.getItem('api_url');
  return stored || API_URL;
};

export const setApiUrl = async (url: string) => {
  const clean = url.replace(/\/+$/, '');
  await AsyncStorage.setItem('api_url', clean);
  API_URL = clean;
};

export const getApiUrl = async () => {
  const stored = await AsyncStorage.getItem('api_url');
  return stored || API_URL;
};

const TIMEOUT = 8000;

const fetchWithTimeout = (url: string, opts: RequestInit = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export const authApi = {
  signIn: async (email: string, password: string) => {
    const base = await getBaseUrl();
    const res = await fetchWithTimeout(`${base}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
    const data = await res.json();
    if (data.token) {
      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
    }
    return data;
  },

  signUp: async (email: string, password: string, name: string) => {
    const base = await getBaseUrl();
    const res = await fetchWithTimeout(`${base}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Sign up failed');
    const data = await res.json();
    if (data.token) {
      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
    }
    return data;
  },

  getSession: async () => {
    const token = await AsyncStorage.getItem('auth_token');
    const raw = await AsyncStorage.getItem('user_data');
    if (!token || !raw) return null;
    return { user: JSON.parse(raw), session: { token } };
  },

  signOut: async () => {
    await AsyncStorage.multiRemove(['auth_token', 'user_data']);
  },
};

export const pashuAadharApi = {
  lookup: async (tagId: string) => {
    const base = await getBaseUrl();
    const token = await AsyncStorage.getItem('auth_token');
    const res = await fetch(`${base}/api/pashu-aadhar/lookup/${tagId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  },
};
