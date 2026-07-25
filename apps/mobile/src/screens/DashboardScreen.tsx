import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { localCows, localMilk, localHealth, localReproduction } from '../services/database';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalCows: 0, activeCows: 0 });
  const [todayMilk, setTodayMilk] = useState(0);
  const [upcomingVax, setUpcomingVax] = useState<any[]>([]);
  const [dueCalvings, setDueCalvings] = useState<any[]>([]);
  const [overdueHealth, setOverdueHealth] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [s, m, v, c, o] = await Promise.all([
        localCows.getStats(),
        localMilk.getTodayTotal(),
        localHealth.getUpcoming(14),
        localReproduction.getDueCalvings(30),
        localHealth.getOverdue(),
      ]);
      setStats(s);
      setTodayMilk(m);
      setUpcomingVax(v || []);
      setDueCalvings(c || []);
      setOverdueHealth(o || []);
    } catch {}
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const Card = ({ title, value, color }: { title: string; value: string; color: string }) => (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.greeting}>
        {t('dashboard.title')}, {user?.name}
      </Text>

      <View style={styles.cardsRow}>
        <Card title={t('dashboard.totalCows')} value={String(stats.totalCows)} color="#2E7D32" />
        <Card title={t('dashboard.activeCows')} value={String(stats.activeCows)} color="#1565C0" />
        <Card title={t('dashboard.todayMilk')} value={`${todayMilk.toFixed(1)} L`} color="#F57F17" />
      </View>

      {upcomingVax.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.upcomingVaccinations')}</Text>
          {upcomingVax.slice(0, 5).map((v: any, i: number) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listText}>{v.cowId} - {v.vaccinationType}</Text>
              <Text style={styles.listDate}>Due: {v.nextDueDate}</Text>
            </View>
          ))}
        </View>
      )}

      {dueCalvings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.dueCalvings')}</Text>
          {dueCalvings.slice(0, 5).map((c: any, i: number) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listText}>{c.cowId}</Text>
              <Text style={styles.listDate}>Expected: {c.expectedCalving}</Text>
            </View>
          ))}
        </View>
      )}

      {overdueHealth.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#C62828' }]}>{t('dashboard.overdueHealth')}</Text>
          {overdueHealth.slice(0, 5).map((o: any, i: number) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listText}>{o.cowId} - {o.vaccinationType}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  greeting: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 12, color: '#666', marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: 'bold' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  listItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  listText: { fontSize: 14, color: '#333' },
  listDate: { fontSize: 12, color: '#666', marginTop: 2 },
});
