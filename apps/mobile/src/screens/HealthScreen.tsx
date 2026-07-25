import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { localHealth } from '../services/database';

export default function HealthScreen() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);
  const [cowId, setCowId] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue'>('all');

  const loadRecords = async () => {
    try {
      let data;
      if (filter === 'upcoming') data = await localHealth.getUpcoming(30);
      else if (filter === 'overdue') data = await localHealth.getOverdue();
      else data = await localHealth.getAll(cowId || undefined);
      setRecords(data || []);
    } catch {}
  };

  useEffect(() => { loadRecords(); }, [cowId, filter]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.cowId}>{item.cowId}</Text>
      <Text style={styles.type}>{item.vaccinationType}</Text>
      <Text style={styles.date}>
        {item.date ? `Done: ${item.date}` : 'Not administered'}
        {item.nextDueDate ? ` | Due: ${item.nextDueDate}` : ''}
      </Text>
      {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <MaterialIcons name="local-hospital" size={24} color="#2E7D32" />
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>{t('health.title')}</Text>
      </View>
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterActive]}
          onPress={() => setFilter('all')}>
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'upcoming' && styles.filterActive]}
          onPress={() => setFilter('upcoming')}>
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>{t('health.dueSoon')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'overdue' && styles.filterActive]}
          onPress={() => setFilter('overdue')}>
          <Text style={[styles.filterText, filter === 'overdue' && styles.filterTextActive]}>{t('health.overdue')}</Text>
        </TouchableOpacity>
      </View>
      {filter === 'all' && (
        <TextInput
          style={styles.input}
          placeholder="Filter by CowID"
          value={cowId}
          onChangeText={setCowId}
        />
      )}
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
  filters: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E0E0E0' },
  filterActive: { backgroundColor: '#2E7D32' },
  filterText: { fontSize: 13, color: '#666' },
  filterTextActive: { color: '#fff' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 1 },
  cowId: { fontSize: 13, fontWeight: '600', color: '#666' },
  type: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 2 },
  date: { fontSize: 13, color: '#666', marginTop: 4 },
  notes: { fontSize: 12, color: '#999', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 48, color: '#999' },
});
