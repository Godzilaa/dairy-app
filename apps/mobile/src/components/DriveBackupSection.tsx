import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Google from 'expo-auth-session/providers/google';
import { buildBackup, restoreBackup } from '../services/backup';
import { uploadBackup, downloadBackup, GOOGLE_WEB_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from '../services/googleDrive';

// Rendered only when Drive is configured — the Google auth hook throws on Android
// if no client id is present, so it must not run in the unconfigured case.
export default function DriveBackupSection() {
  const { t } = useTranslation();
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
  });
  const [action, setAction] = useState<'backup' | 'restore' | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!action) return;
    if (response?.type === 'success') {
      const token = response.authentication?.accessToken;
      if (token) run(action, token);
      setAction(null);
    } else if (response) {
      setMsg('Google sign-in cancelled');
      setAction(null);
    }
  }, [response]);

  const run = async (which: 'backup' | 'restore', token: string) => {
    setBusy(true); setMsg('');
    try {
      if (which === 'backup') {
        await uploadBackup(token, JSON.stringify(await buildBackup()));
        setMsg('Backed up to your Google Drive ✓');
      } else {
        const json = await downloadBackup(token);
        if (!json) { setMsg('No backup found in your Drive'); return; }
        const n = await restoreBackup(JSON.parse(json));
        setMsg(`Restored ${n} records ✓ — reopen tabs to see them`);
      }
    } catch (e: any) {
      setMsg(`Error: ${e?.message || e}`);
    } finally { setBusy(false); }
  };

  const onBackup = () => { setMsg(''); setAction('backup'); promptAsync(); };
  const onRestore = () => {
    Alert.alert(t('settings.restoreDrive'), 'Merge the backup from your Google Drive into this device?', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.restoreDrive'), onPress: () => { setMsg(''); setAction('restore'); promptAsync(); } },
    ]);
  };

  const disabled = busy || !request;

  return (
    <>
      <Text style={styles.hint}>Keep a private copy of your data in your own Google Drive.</Text>
      {!!msg && <Text style={styles.status} selectable>{msg}</Text>}
      {busy && <ActivityIndicator color="#1B5E20" style={{ marginVertical: 6 }} />}
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, disabled && { opacity: 0.6 }]} onPress={onBackup} disabled={disabled}>
          <MaterialCommunityIcons name="cloud-upload-outline" size={18} color="#1B5E20" />
          <Text style={styles.btnText}>{t('settings.backupDrive')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, disabled && { opacity: 0.6 }]} onPress={onRestore} disabled={disabled}>
          <MaterialCommunityIcons name="cloud-download-outline" size={18} color="#1B5E20" />
          <Text style={styles.btnText}>{t('settings.restoreDrive')}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: '#999', marginBottom: 4 },
  status: { fontSize: 12, color: '#666', marginTop: 6 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#A5D6A7', backgroundColor: '#E8F5E9' },
  btnText: { color: '#1B5E20', fontSize: 13, fontWeight: '600' },
});
