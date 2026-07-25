// Cloud sync will be re-introduced in a future release.
// All data is currently stored and read exclusively from local SQLite
// via the `database.ts` service.

export const pushChanges = async (): Promise<{ synced: boolean }> => {
  return { synced: true };
};

export const pullChanges = async (): Promise<any[]> => {
  return [];
};

export const checkConnection = async (): Promise<boolean> => {
  return false;
};
