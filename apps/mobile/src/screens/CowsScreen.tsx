import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { localCows } from '../services/database';
import { lookupPashuAadhar } from '../services/pashuAadharApi';
import PashuAadharScanner from '../components/PashuAadharScanner';

interface Cow {
  id: string;
  cowId: string;
  name: string;
  breed: string;
  status: string;
  pashuAadhar?: string;
}

export default function CowsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [cows, setCows] = useState<Cow[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const loadCows = async () => {
    try {
      const data = await localCows.getAll(search);
      setCows(data);
    } catch {}
  };

  useEffect(() => { loadCows(); }, [search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCows();
    setRefreshing(false);
  }, []);

  const handleScan = async (tagId: string) => {
    setScannerVisible(false);
    setSearch(tagId);

    try {
      const cows = await localCows.getAll(tagId);
      if (cows && cows.length > 0) {
        navigation.navigate('CowDetail', { cowId: cows[0].id });
        return;
      }
    } catch {}

    try {
      const remote = await lookupPashuAadhar(tagId);
      if (remote && remote.breed) {
        Alert.alert(
          'Cow Not Found Locally',
          `${remote.species || 'Cattle'} - ${remote.breed}\nOwner: ${remote.ownerName || 'Unknown'}`,
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: 'Register Here',
              onPress: () => navigation.navigate('CowForm', {
                cow: { pashuAadhar: tagId, breed: remote.breed, name: remote.name },
              }),
            },
          ],
        );
      } else {
        Alert.alert('Not Found', 'No cow found with this tag. Register a new one?', [
          { text: t('common.cancel'), style: 'cancel' },
          { text: 'Register', onPress: () => navigation.navigate('CowForm', { cow: { pashuAadhar: tagId } }) },
        ]);
      }
    } catch {
      Alert.alert('Not Found', 'No cow found with this tag. Register a new one?', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: 'Register', onPress: () => navigation.navigate('CowForm', { cow: { pashuAadhar: tagId } }) },
      ]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return '#2E7D32';
      case 'Inactive': return '#9E9E9E';
      case 'Dry': return '#F57F17';
      case 'Sold': return '#C62828';
      case 'Deceased': return '#424242';
      default: return '#666';
    }
  };

  const renderItem = ({ item }: { item: Cow }) => (
    <TouchableOpacity
      style={styles.cowCard}
      onPress={() => navigation.navigate('CowDetail', { cowId: item.id })}>
      <View style={styles.cowHeader}>
        <Text style={styles.cowId}>{item.cowId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.cowName}>{item.name}</Text>
      <Text style={styles.cowBreed}>{item.breed}</Text>
      {item.pashuAadhar && <Text style={styles.cowTag}>Tag: {item.pashuAadhar}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <MaterialIcons name="pets" size={24} color="#2E7D32" />
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>{t('cow.title')}</Text>
      </View>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, { flex: 1 }]}
          placeholder={`${t('common.search')} ${t('cow.title')}...`}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          style={styles.scanIconBtn}
          onPress={() => setScannerVisible(true)}>
          <Text style={styles.scanIconText}>{t('cow.scanTag')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={cows}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>{t('common.noData')}</Text>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CowForm', {})}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <PashuAadharScanner
        visible={scannerVisible}
        onScan={handleScan}
        onClose={() => setScannerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  scanIconBtn: {
    backgroundColor: '#1565C0', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center',
  },
  scanIconText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  cowCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cowId: { fontSize: 14, fontWeight: '600', color: '#666' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cowName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cowBreed: { fontSize: 14, color: '#666', marginTop: 2 },
  cowTag: { fontSize: 12, color: '#999', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 48, color: '#999', fontSize: 16 },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2E7D32', justifyContent: 'center', alignItems: 'center',
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
});
