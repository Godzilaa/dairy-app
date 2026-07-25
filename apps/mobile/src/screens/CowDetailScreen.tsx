import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRoute, useNavigation } from '@react-navigation/native';
import { localCows } from '../services/database';

export default function CowDetailScreen() {
  const { t } = useTranslation();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [cow, setCow] = useState<any>(null);

  useEffect(() => {
    localCows.getById(route.params.cowId).then(setCow).catch(() => {});
  }, []);

  if (!cow) {
    return <View style={styles.container}><Text>{t('common.loading')}</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialIcons name="info-outline" size={24} color="#2E7D32" />
          <Text style={styles.cowId}>{cow.cowId}</Text>
        </View>
        <Text style={styles.name}>{cow.name}</Text>
      </View>

      <View style={styles.section}>
        <InfoRow label={t('cow.breed')} value={cow.breed} />
        <InfoRow label={t('cow.status')} value={cow.status} />
        <InfoRow label={t('cow.pashuAadhar')} value={cow.pashuAadhar || '-'} />
        <InfoRow label={t('cow.dob')} value={cow.dob || '-'} />
        <InfoRow label={t('cow.mother')} value={cow.mother || '-'} />
        <InfoRow label={t('cow.father')} value={cow.father || '-'} />
        <InfoRow label={t('cow.registrationMethod')} value={cow.registrationMethod || '-'} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Health')}>
          <Text style={styles.actionText}>{t('health.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('MilkFeed')}>
          <Text style={styles.actionText}>{t('milk.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Reproduction')}>
          <Text style={styles.actionText}>{t('reproduction.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Calves')}>
          <Text style={styles.actionText}>{t('calves.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Insurance')}>
          <Text style={styles.actionText}>{t('insurance.title')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => navigation.navigate('CowForm', { cow })}>
        <Text style={styles.editBtnText}>{t('common.edit')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  header: { alignItems: 'center', marginBottom: 24 },
  cowId: { fontSize: 14, color: '#666', fontWeight: '600' },
  name: { fontSize: 28, fontWeight: 'bold', color: '#333', marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  actionBtn: {
    backgroundColor: '#E8F5E9', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20,
  },
  actionText: { color: '#2E7D32', fontWeight: '600', fontSize: 14 },
  editBtn: { backgroundColor: '#1565C0', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 32 },
  editBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
