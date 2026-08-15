import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRoute, useNavigation } from '@react-navigation/native';
import { localCows } from '../services/database';
import { formatDate } from '../utils/date';
import { COLORS, SHADOWS, RADIUS } from '../theme';

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
        {cow.photo ? (
          <Image source={{ uri: cow.photo }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <MaterialCommunityIcons name="cow" size={44} color="#A5D6A7" />
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <MaterialIcons name="info-outline" size={24} color="#1B5E20" />
          <Text style={styles.cowId}>{cow.cowId}</Text>
        </View>
        <Text style={styles.name}>{cow.name}</Text>
      </View>

      <View style={styles.section}>
        <InfoRow label={t('cow.breed')} value={cow.breed} />
        <InfoRow label={t('cow.status')} value={cow.status} />
        <InfoRow label={t('cow.pashuAadhar')} value={cow.pashuAadhar || '-'} />
        <InfoRow label={t('cow.dob')} value={formatDate(cow.dob) || '-'} />
        <InfoRow label={t('cow.mother')} value={cow.mother || '-'} />
        <InfoRow label={t('cow.father')} value={cow.father || '-'} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Health')}>
          <Text style={styles.actionText}>{t('health.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Milk')}>
          <Text style={styles.actionText}>{t('milk.milkOnly')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Feed')}>
          <Text style={styles.actionText}>{t('feed.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('HeatTracking', { cowId: cow.cowId })}>
          <Text style={styles.actionText}>{t('heat.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Calves')}>
          <Text style={styles.actionText}>{t('calves.title')}</Text>
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
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  header: { alignItems: 'center', marginBottom: 24 },
  photo: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: '#1B5E20' },
  photoPlaceholder: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: '#E8F5E9',
    alignItems: 'center', justifyContent: 'center',
  },
  cowId: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  name: { fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 16, marginBottom: 16, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  infoLabel: { fontSize: 14, color: COLORS.textSecondary },
  infoValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  actionBtn: {
    backgroundColor: '#E8F5E9', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20,
  },
  actionText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  editBtn: { backgroundColor: '#1565C0', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 32 },
  editBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
