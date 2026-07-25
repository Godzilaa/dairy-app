import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = '__API_URL__'; // Replaced at build time

const getBaseUrl = async () => {
  const stored = await AsyncStorage.getItem('api_url');
  return stored || API_URL;
};

const getToken = async () => AsyncStorage.getItem('auth_token');

export const authApi = {
  signIn: async (email: string, password: string) => {
    const base = await getBaseUrl();
    const res = await fetch(`${base}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
    const data = await res.json();
    if (data.token) await AsyncStorage.setItem('auth_token', data.token);
    return data;
  },

  signUp: async (email: string, password: string, name: string) => {
    const base = await getBaseUrl();
    const res = await fetch(`${base}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Sign up failed');
    const data = await res.json();
    if (data.token) await AsyncStorage.setItem('auth_token', data.token);
    return data;
  },

  getSession: async () => {
    const base = await getBaseUrl();
    const token = await AsyncStorage.getItem('auth_token');
    const res = await fetch(`${base}/api/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
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
