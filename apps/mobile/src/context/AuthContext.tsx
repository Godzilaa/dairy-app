import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAuth as useClerkAuth, useUser, useClerk } from '@clerk/expo';
import { setClerkTokenGetter } from '../services/clerkToken';
import { syncAll, setSyncOwner } from '../services/cloudSync';
import { scheduleReminders } from '../services/notifications';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();

  const user: User | null = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        name: clerkUser.fullName ?? clerkUser.username ?? '',
      }
    : null;

  // Give the Supabase client a way to fetch the current Clerk token.
  useEffect(() => {
    setClerkTokenGetter(async () => {
      try { return await getToken(); } catch { return null; }
    });
  }, [getToken]);

  // Cloud-sync on sign-in and whenever the app returns to the foreground.
  const ownerId = clerkUser?.id;
  useEffect(() => {
    setSyncOwner(isSignedIn ? ownerId ?? null : null);
    if (!isSignedIn || !ownerId) return;
    syncAll(ownerId);
    scheduleReminders();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') { syncAll(ownerId); scheduleReminders(); }
    });
    return () => sub.remove();
  }, [isSignedIn, ownerId]);

  const logout = async () => {
    await signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!isSignedIn,
        isLoading: !isLoaded,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
