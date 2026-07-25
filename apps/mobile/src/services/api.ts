import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://dairy-api-jia4.onrender.com';

const authFetch = async (path: string, opts?: RequestInit) => {
  const url = `${API_URL}${path}`;
  console.log('[API]', opts?.method || 'GET', url);
  try {
    const res = await fetch(url, opts);
    console.log('[API] response', res.status);
    return res;
  } catch (e: any) {
    console.log('[API] error', e.name, e.message);
    throw new Error(`Network error: ${e.message}`);
  }
};

export const authApi = {
  signIn: async (email: string, password: string) => {
    const res = await authFetch('/api/auth/sign-in/email', {
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
    const res = await authFetch('/api/auth/sign-up/email', {
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
    const token = await AsyncStorage.getItem('auth_token');
    const res = await authFetch(`/api/pashu-aadhar/lookup/${tagId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  },
};
