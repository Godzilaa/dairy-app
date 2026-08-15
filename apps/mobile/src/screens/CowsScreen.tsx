import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, RefreshControl, Image,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { localCows, getPregnancyByCow, PregnancyInfo } from '../services/database';
import { lookupPashuAadhar } from '../services/pashuAadharApi';
import PashuAadharScanner from '../components/PashuAadharScanner';
import { formatDate } from '../utils/date';
import { COLORS, SHADOWS, RADIUS } from '../theme';

// Compact pregnancy duration, e.g. "5 mo", "3 wk" or "6 d".
const pregnancyDuration = (p: PregnancyInfo): string => {
  if (p.months >= 1) return `${p.months} mo`;
  if (p.weeks >= 1) return `${p.weeks} wk`;
  return `${p.days} d`;
};

interface Cow {
  id: string;
  cowId: string;
  name: string;
  breed: string;
  status: string;
  pashuAadhar?: string;
  photo?: string;
}

type CowFilter = 'all' | 'pregnant' | 'milking' | 'nonmilking';

export default function CowsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [cows, setCows] = useState<Cow[]>([]);
  const [pregnancy, setPregnancy] = useState<Record<string, PregnancyInfo>>({});
  const [filter, setFilter] = useState<CowFilter>(route.params?.filter || 'all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const loadCows = async () => {
    try {
      const [data, preg] = await Promise.all([localCows.getAll(search), getPregnancyByCow()]);
      setCows(data);
      setPregnancy(preg);
    } catch {}
  };

  useEffect(() => { loadCows(); }, [search]);

  // Apply the filter chosen from the dashboard Total-cows card, then clear the
  // param so re-picking the same filter later still re-applies it.
  useEffect(() => {
    if (route.params?.filter) {
      setFilter(route.params.filter);
      navigation.setParams({ filter: undefined });
    }
  }, [route.params?.filter]);

  // Refresh on focus so pregnancy status reflects newly added heat records.
  useFocusEffect(useCallback(() => { loadCows(); }, [search]));

  const visibleCows = cows.filter((c) => {
    switch (filter) {
      case 'pregnant': return !!pregnancy[c.cowId]?.isPregnant;
      case 'milking': return c.status === 'Milking';
      case 'nonmilking': return c.status !== 'Milking';
      default: return true;
    }
  });

  const filterLabel = (f: CowFilter) =>
    f === 'pregnant' ? t('dashboard.filterPregnant')
      : f === 'milking' ? t('dashboard.filterMilking')
        : f === 'nonmilking' ? t('dashboard.filterNonMilking')
          : '';

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
      case 'Active': return '#1B5E20';
      case 'Milking': return '#00897B';
      case 'Inactive': return '#9E9E9E';
      case 'Dry': return '#F57F17';
      case 'Sold': return '#C62828';
      case 'Deceased': return '#424242';
      default: return '#666';
    }
  };

  const renderItem = ({ item }: { item: Cow }) => {
    const preg = pregnancy[item.cowId];
    return (
      <TouchableOpacity
        style={styles.cowCard}
        onPress={() => navigation.navigate('CowDetail', { cowId: item.id })}>
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <MaterialCommunityIcons name="cow" size={30} color="#A5D6A7" />
          </View>
        )}
        <View style={styles.cowInfo}>
          <View style={styles.cowHeader}>
            <Text style={styles.cowId}>{item.cowId}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.cowName}>{item.name}</Text>
          <Text style={styles.cowBreed}>{item.breed}</Text>
          {item.pashuAadhar ? <Text style={styles.cowTag}>Tag: {item.pashuAadhar}</Text> : null}
          {preg?.isPregnant ? (
            <TouchableOpacity
              style={styles.pregChip}
              onPress={() => navigation.navigate('HeatTracking', { cowId: item.cowId })}>
              <MaterialCommunityIcons name="baby-carriage" size={13} color="#C2185B" />
              <Text style={styles.pregText}>
                {t('heat.pregnant')} · {pregnancyDuration(preg)}
                {preg.dueDate ? ` · ${t('heat.due')} ${formatDate(preg.dueDate)}` : ''}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
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
      {filter !== 'all' ? (
        <TouchableOpacity style={styles.filterChip} onPress={() => setFilter('all')}>
          <Text style={styles.filterChipText}>{filterLabel(filter)} · {visibleCows.length}</Text>
          <MaterialIcons name="close" size={16} color="#1B5E20" />
        </TouchableOpacity>
      ) : null}
      <FlatList
        data={visibleCows}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 96, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="cow" size={64} color="#C8E6C9" />
            <Text style={styles.emptyTitle}>{search ? t('common.noData') : t('cow.emptyTitle')}</Text>
            {!search && (
              <>
                <Text style={styles.emptySub}>{t('cow.emptySub')}</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CowForm', {})}>
                  <MaterialIcons name="add" size={18} color="#fff" />
                  <Text style={styles.emptyBtnText}>{t('cow.addFirst')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scanIconBtn: {
    backgroundColor: '#1565C0', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center',
  },
  scanIconText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    marginBottom: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7',
  },
  filterChipText: { fontSize: 13, color: '#1B5E20', fontWeight: '600' },
  cowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#1B5E20' },
  avatarPlaceholder: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#E8F5E9',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#A5D6A7',
  },
  cowInfo: { flex: 1 },
  cowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cowId: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cowName: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  cowBreed: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  cowTag: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  pregChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    backgroundColor: '#FCE4EC', borderWidth: 1, borderColor: '#F8BBD0',
  },
  pregText: { fontSize: 12, color: '#C2185B', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 48, color: COLORS.textMuted, fontSize: 16 },
  emptyWrap: { alignItems: 'center', marginTop: 64, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#555', marginTop: 12 },
  emptySub: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, marginTop: 16, ...SHADOWS.soft },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.soft,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
});
