import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { localCows, localMilk, localEvents, CalendarEvent } from '../services/database';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const TYPE_COLOR: Record<CalendarEvent['type'], string> = {
  heat: '#C2185B',
  repeatHeat: '#C2185B',
  medication: '#2E7D32',
  treatment: '#1565C0',
};

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState({ totalCows: 0, milkingCows: 0 });
  const [todayMilk, setTodayMilk] = useState(0);
  const [monthDaily, setMonthDaily] = useState<{ date: string; total: number }[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const todayISO = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(todayISO);

  const loadData = async () => {
    try {
      const [s, m, ev] = await Promise.all([
        localCows.getStats(),
        localMilk.getTodayTotal(),
        localEvents.getAll(),
      ]);
      setStats(s);
      setTodayMilk(m);
      setEvents(ev || []);
    } catch {}
  };

  // Milk series is keyed on the viewed month so it always matches the calendar,
  // never a stale month captured by loadData's closure.
  const loadMonthDaily = React.useCallback(() => {
    localMilk.getMonthDaily(viewYear, viewMonth).then((md) => setMonthDaily(md || [])).catch(() => {});
  }, [viewYear, viewMonth]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadMonthDaily(); }, [loadMonthDaily]);
  // Refresh whenever the tab regains focus so new entries appear (current month too).
  useFocusEffect(React.useCallback(() => {
    loadData();
    loadMonthDaily();
  }, [loadMonthDaily]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    loadMonthDaily();
    setRefreshing(false);
  };

  // Map of date -> events for quick lookup + marker dots.
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      if (!e.date) continue;
      (map[e.date] = map[e.date] || []).push(e);
    }
    return map;
  }, [events]);

  const selectedEvents = eventsByDate[selected] || [];

  // Upcoming follow-ups (today onward), soonest first.
  const upcoming = useMemo(
    () => events
      .filter((e) => e.date >= todayISO)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6),
    [events, todayISO]
  );

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  };

  // Build the calendar grid cells (leading blanks + days).
  const cells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [viewYear, viewMonth]);

  // Monthly milk summary derived from the per-day series of the viewed month.
  const summary = useMemo(() => {
    const total = monthDaily.reduce((sum, d) => sum + (d.total || 0), 0);
    const days = monthDaily.length;
    const best = monthDaily.reduce(
      (acc, d) => (d.total > acc.total ? { date: d.date, total: d.total } : acc),
      { date: '', total: 0 }
    );
    return { total, avg: days ? total / days : 0, best, days };
  }, [monthDaily]);

  const Card = ({ title, value, color, onPress }: { title: string; value: string; color: string; onPress?: () => void }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: color }]}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      onPress={onPress}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <MaterialIcons name="dashboard" size={24} color="#2E7D32" />
        <Text style={styles.greeting}>{t('dashboard.title')}, {user?.name || ''}</Text>
      </View>

      <View style={styles.cardsRow}>
        <Card title={t('dashboard.totalCows')} value={String(stats.totalCows)} color="#2E7D32" onPress={() => navigation.navigate('Cows')} />
        <Card title={t('dashboard.todayMilk')} value={`${todayMilk.toFixed(1)} L`} color="#F57F17" onPress={() => navigation.navigate('MilkFeed')} />
      </View>

      {/* Calendar */}
      <View style={styles.calendarCard}>
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
            <MaterialIcons name="chevron-left" size={26} color="#2E7D32" />
          </TouchableOpacity>
          <Text style={styles.calTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
            <MaterialIcons name="chevron-right" size={26} color="#2E7D32" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={styles.weekday}>{w}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((d, i) => {
            if (d === null) return <View key={i} style={styles.cell} />;
            const cellISO = iso(viewYear, viewMonth, d);
            const dayEvents = eventsByDate[cellISO] || [];
            const isToday = cellISO === todayISO;
            const isSelected = cellISO === selected;
            const dotTypes = Array.from(new Set(dayEvents.map((e) => e.type)));
            return (
              <TouchableOpacity
                key={i}
                style={[styles.cell, isSelected && styles.cellSelected, isToday && !isSelected && styles.cellToday]}
                onPress={() => setSelected(cellISO)}>
                <Text style={[styles.cellText, isSelected && styles.cellTextSelected]}>{d}</Text>
                <View style={styles.dotRow}>
                  {dotTypes.slice(0, 3).map((tp, j) => (
                    <View key={j} style={[styles.dot, { backgroundColor: TYPE_COLOR[tp] }]} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#C2185B' }]} /><Text style={styles.legendText}>{t('dashboard.legendHeat')}</Text></View>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#2E7D32' }]} /><Text style={styles.legendText}>{t('dashboard.legendMed')}</Text></View>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#1565C0' }]} /><Text style={styles.legendText}>{t('dashboard.legendTreat')}</Text></View>
        </View>
      </View>

      {/* Monthly summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.monthlySummary')} · {MONTHS[viewMonth]} {viewYear}</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('dashboard.milkThisMonth')}</Text>
            <Text style={[styles.summaryValue, { color: '#F57F17' }]}>{summary.total.toFixed(1)} L</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('dashboard.avgPerDay')}</Text>
            <Text style={[styles.summaryValue, { color: '#00897B' }]}>{summary.avg.toFixed(1)} L</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('dashboard.bestDay')}</Text>
            <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>{summary.best.total.toFixed(1)} L</Text>
            {!!summary.best.date && <Text style={styles.summarySub}>{summary.best.date.slice(8)} {MONTHS[viewMonth].slice(0, 3)}</Text>}
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('dashboard.milkingCows')}</Text>
            <Text style={[styles.summaryValue, { color: '#1565C0' }]}>{stats.milkingCows}</Text>
          </View>
        </View>

        {/* Daily milk bar chart */}
        <Text style={styles.chartTitle}>{t('dashboard.milkTrend')}</Text>
        {monthDaily.length === 0 ? (
          <Text style={styles.noEvents}>{t('common.noData')}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chart} contentContainerStyle={{ alignItems: 'flex-end' }}>
            {monthDaily.map((d, i) => {
              const h = summary.best.total > 0 ? Math.max(4, (d.total / summary.best.total) * 100) : 4;
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barValue}>{d.total.toFixed(0)}</Text>
                  <View style={[styles.bar, { height: h }]} />
                  <Text style={styles.barLabel}>{d.date.slice(8)}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Selected day details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{selected}</Text>
        {selectedEvents.length === 0 ? (
          <Text style={styles.noEvents}>{t('dashboard.noEvents')}</Text>
        ) : (
          selectedEvents.map((e, i) => (
            <View key={i} style={styles.eventRow}>
              <View style={[styles.eventDot, { backgroundColor: TYPE_COLOR[e.type] }]} />
              <Text style={styles.eventCow}>{e.cowId}</Text>
              <Text style={styles.eventTitle}>{e.title}</Text>
            </View>
          ))
        )}
      </View>

      {/* Upcoming follow-ups */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.followUps')}</Text>
        {upcoming.length === 0 ? (
          <Text style={styles.noEvents}>{t('common.noData')}</Text>
        ) : (
          upcoming.map((e, i) => (
            <TouchableOpacity key={i} style={styles.eventRow} onPress={() => { setViewYear(Number(e.date.slice(0, 4))); setViewMonth(Number(e.date.slice(5, 7)) - 1); setSelected(e.date); }}>
              <View style={[styles.eventDot, { backgroundColor: TYPE_COLOR[e.type] }]} />
              <Text style={styles.eventCow}>{e.cowId}</Text>
              <Text style={styles.eventTitle}>{e.title}</Text>
              <Text style={styles.eventDate}>{e.date}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  greeting: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#333' },
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 4, elevation: 2 },
  cardTitle: { fontSize: 12, color: '#666', marginBottom: 4 },
  cardValue: { fontSize: 20, fontWeight: 'bold' },

  calendarCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 16, elevation: 2 },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navBtn: { padding: 4 },
  calTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#999', paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cellSelected: { backgroundColor: '#2E7D32' },
  cellToday: { backgroundColor: '#E8F5E9' },
  cellText: { fontSize: 14, color: '#333' },
  cellTextSelected: { color: '#fff', fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 6 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 11, color: '#666' },

  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },
  noEvents: { fontSize: 13, color: '#999' },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
  eventCow: { fontSize: 13, fontWeight: '700', color: '#555', minWidth: 44 },
  eventTitle: { fontSize: 14, color: '#333', flex: 1 },
  eventDate: { fontSize: 12, color: '#888' },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  summaryItem: { width: '50%', paddingVertical: 8, paddingRight: 8 },
  summaryLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  summaryValue: { fontSize: 20, fontWeight: 'bold' },
  summarySub: { fontSize: 11, color: '#999', marginTop: 1 },
  chartTitle: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 8 },
  chart: { flexDirection: 'row', paddingTop: 4, height: 150 },
  barCol: { alignItems: 'center', width: 30, justifyContent: 'flex-end' },
  bar: { width: 14, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: '#F57F17' },
  barValue: { fontSize: 9, color: '#888', marginBottom: 2 },
  barLabel: { fontSize: 10, color: '#666', marginTop: 4 },
});
