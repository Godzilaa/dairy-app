import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { localInsurance } from '../services/database';

export default function InsuranceScreen() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    localInsurance.getAll().then(setRecords).catch(() => {});
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.cowId}>{item.cowId}</Text>
      {item.insuredOn && <Text style={styles.field}>{t('insurance.insuredOn')}: {item.insuredOn}</Text>}
      {item.insuredTill && <Text style={styles.field}>{t('insurance.insuredTill')}: {item.insuredTill}</Text>}
      {item.insuredWith && <Text style={styles.field}>{t('insurance.insuredWith')}: {item.insuredWith}</Text>}
      {item.amount && <Text style={styles.field}>{t('insurance.amount')}: ₹{item.amount}</Text>}
      {item.claimAmount && <Text style={styles.field}>{t('insurance.claimAmount')}: ₹{item.claimAmount}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <MaterialIcons name="verified-user" size={24} color="#2E7D32" />
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>{t('insurance.title')}</Text>
      </View>
      <FlatList
        data={records}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>{t('common.noData')}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 1 },
  cowId: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  field: { fontSize: 14, color: '#555', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 48, color: '#999' },
});
