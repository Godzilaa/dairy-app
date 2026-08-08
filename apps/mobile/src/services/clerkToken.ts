// Bridges Clerk's React-only getToken() to the module-scope Supabase client.
// AuthProvider registers the getter once Clerk is loaded.
let getter: (() => Promise<string | null>) | null = null;

export const setClerkTokenGetter = (fn: () => Promise<string | null>) => { getter = fn; };

export const getClerkToken = async (): Promise<string | null> => {
  try { return getter ? await getter() : null; } catch { return null; }
};
