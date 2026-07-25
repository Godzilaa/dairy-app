import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { localReproduction } from '../services/database';

type TabType = 'female' | 'male';

export default function ReproductionScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabType>('female');
  const [records, setRecords] = useState<any[]>([]);
  const [cowId, setCowId] = useState('');

  const loadRecords = async () => {
    try {
      if (!cowId) return;
      const data = tab === 'female'
        ? await localReproduction.getFemale(cowId)
        : await localReproduction.getMale(cowId);
      setRecords(data || []);
    } catch {}
  };

  useEffect(() => { loadRecords(); }, [cowId, tab]);

  const renderFemaleItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      {item.heatDate && <Text style={styles.field}>{t('reproduction.heatDate')}: {item.heatDate}</Text>}
      {item.aiDate && <Text style={styles.field}>{t('reproduction.aiDate')}: {item.aiDate}</Text>}
      {item.pregnancyCheck && <Text style={styles.field}>{t('reproduction.pregnancyCheck')}: {item.pregnancyCheck}</Text>}
      {item.expectedCalving && <Text style={styles.field}>{t('reproduction.expectedCalving')}: {item.expectedCalving}</Text>}
      {item.method && <Text style={styles.field}>{t('reproduction.method')}: {item.method}</Text>}
    </View>
  );

  const renderMaleItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      {item.heatDate && <Text style={styles.field}>{t('reproduction.heatDate')}: {item.heatDate}</Text>}
      {item.serviceDate && <Text style={styles.field}>{t('reproduction.serviceDate')}: {item.serviceDate}</Text>}
      {item.pregnancyCheck && <Text style={styles.field}>{t('reproduction.pregnancyCheck')}: {item.pregnancyCheck}</Text>}
      {item.expectedCalving && <Text style={styles.field}>{t('reproduction.expectedCalving')}: {item.expectedCalving}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <MaterialIcons name="child-care" size={24} color="#2E7D32" />
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>{t('reproduction.title')}</Text>
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'female' && styles.tabActive]}
          onPress={() => setTab('female')}>
          <Text style={[styles.tabText, tab === 'female' && styles.tabTextActive]}>{t('reproduction.female')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'male' && styles.tabActive]}
          onPress={() => setTab('male')}>
          <Text style={[styles.tabText, tab === 'male' && styles.tabTextActive]}>{t('reproduction.male')}</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Enter Cow ID"
        value={cowId}
        onChangeText={setCowId}
      />
      <FlatList
        data={records}
        keyExtractor={(_, i) => String(i)}
        renderItem={tab === 'female' ? renderFemaleItem : renderMaleItem}
        ListEmptyComponent={<Text style={styles.empty}>{t('common.noData')}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  tabs: { flexDirection: 'row', marginBottom: 16, borderRadius: 10, overflow: 'hidden', backgroundColor: '#E0E0E0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#2E7D32' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#fff' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 1 },
  field: { fontSize: 14, color: '#333', marginBottom: 4 },
  empty: { textAlign: 'center', marginTop: 48, color: '#999' },
});
