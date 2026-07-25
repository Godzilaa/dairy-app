import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { localMilk } from '../services/database';

export default function MilkFeedScreen() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);
  const [cowId, setCowId] = useState('');
  const [todayTotal, setTodayTotal] = useState(0);

  const loadRecords = async () => {
    try {
      const data = await localMilk.getAll(cowId || undefined);
      setRecords(data || []);
      const total = await localMilk.getTodayTotal();
      setTodayTotal(total);
    } catch {}
  };

  useEffect(() => { loadRecords(); }, [cowId]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cowId}>{item.cowId}</Text>
        <Text style={styles.date}>{item.milkingDate}</Text>
      </View>
      <View style={styles.milkRow}>
        <Text style={styles.milkLabel}>{t('milk.morningMilk')}: {item.morningMilk ?? '-'} L</Text>
        <Text style={styles.milkLabel}>{t('milk.eveningMilk')}: {item.eveningMilk ?? '-'} L</Text>
        <Text style={styles.milkTotal}>
          {t('milk.total')}: {((item.morningMilk || 0) + (item.eveningMilk || 0)).toFixed(1)} L
        </Text>
      </View>
      {item.feedGiven && <Text style={styles.feed}>{t('milk.feedGiven')}: {item.feedGiven}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>{t('dashboard.todayMilk')}</Text>
        <Text style={styles.totalValue}>{todayTotal.toFixed(1)} L</Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Filter by CowID"
        value={cowId}
        onChangeText={setCowId}
      />
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
  totalCard: {
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16, elevation: 2,
  },
  totalLabel: { fontSize: 14, color: '#F57F17' },
  totalValue: { fontSize: 36, fontWeight: 'bold', color: '#E65100' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cowId: { fontSize: 13, fontWeight: '600', color: '#666' },
  date: { fontSize: 13, color: '#999' },
  milkRow: { gap: 4, marginBottom: 4 },
  milkLabel: { fontSize: 14, color: '#333' },
  milkTotal: { fontSize: 15, fontWeight: 'bold', color: '#E65100', marginTop: 4 },
  feed: { fontSize: 13, color: '#666', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 48, color: '#999' },
});
