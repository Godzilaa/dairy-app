import React, { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { syncAll, lastSyncStatus } from '../services/cloudSync';
import { isCloudSyncConfigured } from '../services/supabase';

// Small cloud indicator in the header: shows sync health and syncs on tap.
export default function SyncChip() {
  const { user } = useAuth();
  const [status, setStatus] = useState(lastSyncStatus);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setStatus(lastSyncStatus), 3000);
    return () => clearInterval(id);
  }, []);

  if (!isCloudSyncConfigured) return null;

  const ok = status.startsWith('ok');
  const err = status.startsWith('err');
  const icon = busy ? 'cloud-sync' : err ? 'cloud-alert' : ok ? 'cloud-check' : 'cloud-outline';

  return (
    <TouchableOpacity
      style={{ paddingHorizontal: 14, paddingVertical: 4 }}
      onPress={async () => {
        if (busy) return;
        setBusy(true);
        await syncAll(user?.id);
        setStatus(lastSyncStatus);
        setBusy(false);
      }}>
      <MaterialCommunityIcons name={icon as any} size={22} color={err ? '#FFCDD2' : '#fff'} />
    </TouchableOpacity>
  );
}
