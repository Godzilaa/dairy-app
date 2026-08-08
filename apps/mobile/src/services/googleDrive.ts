// Stores a single backup file in the user's private Drive "appDataFolder"
// (hidden per-app space in THEIR Drive — same mechanism WhatsApp uses). All calls
// take a Google access token that carries the `drive.appdata` scope.
const FILE_NAME = 'gopala-backup.json';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

// Google client id (web) must carry the drive.appdata scope. Set in apps/mobile/.env.
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
export const isDriveConfigured = !!(GOOGLE_WEB_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID);

async function findFileId(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}'`);
  const res = await fetch(`${DRIVE}/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)`, { headers: authHeader(token) });
  if (!res.ok) throw new Error(`Drive list failed (${res.status})`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

// Upload (create or overwrite) the backup JSON. Returns the Drive file id.
export async function uploadBackup(token: string, json: string): Promise<string> {
  let id = await findFileId(token);
  if (!id) {
    const meta = await fetch(`${DRIVE}/files`, {
      method: 'POST',
      headers: { ...authHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] }),
    });
    if (!meta.ok) throw new Error(`Drive create failed (${meta.status})`);
    id = (await meta.json()).id;
  }
  const up = await fetch(`${UPLOAD}/files/${id}?uploadType=media`, {
    method: 'PATCH',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: json,
  });
  if (!up.ok) throw new Error(`Drive upload failed (${up.status})`);
  return id!;
}

// Download the latest backup JSON, or null if none exists yet.
export async function downloadBackup(token: string): Promise<string | null> {
  const id = await findFileId(token);
  if (!id) return null;
  const res = await fetch(`${DRIVE}/files/${id}?alt=media`, { headers: authHeader(token) });
  if (!res.ok) throw new Error(`Drive download failed (${res.status})`);
  return res.text();
}
