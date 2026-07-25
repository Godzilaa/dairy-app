import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import i18n from '../i18n';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
  };

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), 'Are you sure?', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
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
        <Text style={styles.hint}>Data is stored locally on this device.</Text>
        <Text style={styles.hint}>Cloud sync will be available in a future update.</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  field: { fontSize: 15, color: '#555', marginBottom: 4 },
  langBtn: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  langText: { fontSize: 15, color: '#2E7D32' },
  hint: { fontSize: 13, color: '#999', marginBottom: 4 },
  logoutBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#C62828', marginTop: 8 },
  logoutText: { color: '#C62828', fontSize: 16, fontWeight: '600' },
});
