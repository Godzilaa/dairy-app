import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';
import { syncAll, lastSyncStatus } from '../services/cloudSync';
import { isCloudSyncConfigured } from '../services/supabase';
import { isDriveConfigured } from '../services/googleDrive';
import DriveBackupSection from '../components/DriveBackupSection';
import i18n from '../i18n';
import { COLORS, SHADOWS, RADIUS } from '../theme';

const PRIVACY_POLICY_URL = 'https://godzilaa.github.io/dairy-app/privacy-policy.html';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [syncStatus, setSyncStatus] = useState(lastSyncStatus);
  const [syncing, setSyncing] = useState(false);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
  };

  const runSync = async () => {
    setSyncing(true);
    await syncAll(user?.id);
    setSyncStatus(lastSyncStatus);
    setSyncing(false);
  };

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), 'Are you sure?', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
        <Text style={styles.field}>{user?.name}</Text>
        <Text style={styles.field}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={styles.langBtn}
            onPress={() => changeLanguage(lang.code)}>
            <Text style={styles.langText}>{lang.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.sync')}</Text>
        <Text style={styles.hint}>
          {isCloudSyncConfigured
            ? 'Cloud backup is ON — your data syncs to your account, so it follows you to a new phone.'
            : 'Local only — cloud backup not configured.'}
        </Text>
        <Text style={styles.syncStatus} selectable>{syncStatus}</Text>
        <TouchableOpacity style={[styles.syncBtn, syncing && { opacity: 0.6 }]} onPress={runSync} disabled={syncing}>
          {syncing ? <ActivityIndicator color="#fff" /> : <Text style={styles.syncBtnText}>{t('settings.syncNow')}</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.driveHeader}>
          <MaterialCommunityIcons name="google-drive" size={20} color="#1B5E20" />
          <Text style={styles.sectionTitle}>{t('settings.googleDrive')}</Text>
        </View>
        {!isDriveConfigured ? (
          <Text style={styles.hint}>
            Add a Google OAuth client ID (with the Drive app-data scope) as EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to enable backing up to your own Google Drive.
          </Text>
        ) : Constants.executionEnvironment === 'storeClient' ? (
          <Text style={styles.hint}>
            Configured ✓ — Google Drive backup works in the installed app, not in Expo Go. Build/install the APK to use it.
          </Text>
        ) : (
          <DriveBackupSection />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}>
          <MaterialCommunityIcons name="shield-account-outline" size={20} color="#1B5E20" />
          <Text style={styles.linkText}>{t('settings.privacyPolicy')}</Text>
          <MaterialCommunityIcons name="open-in-new" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        <Text style={styles.versionText}>Gopala v{Constants.expoConfig?.version || '1.0.0'}</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  section: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.soft },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 },
  field: { fontSize: 15, color: '#555', marginBottom: 4 },
  langBtn: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  langText: { fontSize: 15, color: '#1B5E20' },
  hint: { fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  syncStatus: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6, marginBottom: 10 },
  syncBtn: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 12, alignItems: 'center', ...SHADOWS.soft },
  syncBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  driveHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  driveRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  driveBtn: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#A5D6A7', backgroundColor: '#E8F5E9' },
  driveBtnText: { color: '#1B5E20', fontSize: 13, fontWeight: '600' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  linkText: { flex: 1, fontSize: 15, color: '#1B5E20', fontWeight: '500' },
  versionText: { fontSize: 12, color: COLORS.textMuted, marginTop: 10 },
  logoutBtn: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#C62828', marginTop: 8, ...SHADOWS.soft },
  logoutText: { color: '#C62828', fontSize: 16, fontWeight: '600' },
});
