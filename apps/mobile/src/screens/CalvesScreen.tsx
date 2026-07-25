import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { localCalves } from '../services/database';

export default function CalvesScreen() {
  const { t } = useTranslation();
  const [calves, setCalves] = useState<any[]>([]);

  useEffect(() => {
    localCalves.getAll().then(setCalves).catch(() => {});
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.detail}>{t('calves.gender')}: {item.gender}</Text>
      <Text style={styles.detail}>{t('cow.breed')}: {item.breed}</Text>
      <Text style={styles.detail}>{t('calves.mother')}: {item.mother || '-'}</Text>
      <Text style={styles.detail}>{t('calves.father')}: {item.father || '-'}</Text>
      {item.dob && <Text style={styles.detail}>{t('calves.dob')}: {item.dob}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <MaterialIcons name="toys" size={24} color="#2E7D32" />
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>{t('calves.title')}</Text>
      </View>
      <FlatList
        data={calves}
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
  name: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  detail: { fontSize: 14, color: '#555', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 48, color: '#999' },
});
