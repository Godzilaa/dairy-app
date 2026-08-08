import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { localCows, localMilk, localEvents, CalendarEvent } from '../services/database';
import { formatDate } from '../utils/date';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const TYPE_COLOR: Record<CalendarEvent['type'], string> = {
  heat: '#C2185B',
  repeatHeat: '#C2185B',
  medication: '#1B5E20',
  treatment: '#1565C0',
  dueDate: '#8D5E34',
  reminder: '#6A1B9A',
};

// Moon phase for a given day, as an emoji. Based on the synodic month length
// measured from a known new moon (2000-01-06 18:14 UTC). Index 0..7 →
// new, waxing crescent, first quarter, waxing gibbous, full, waning gibbous,
// last quarter, waning crescent.
const MOON_EMOJI = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
const SYNODIC = 29.53058867;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const moonIndex = (y: number, m: number, d: number): number => {
  const days = (Date.UTC(y, m, d, 12) - KNOWN_NEW_MOON) / 86400000;
  let phase = (days % SYNODIC) / SYNODIC;
  if (phase < 0) phase += 1;
  return Math.floor(phase * 8 + 0.5) % 8;
};
const moonEmoji = (y: number, m: number, d: number): string => MOON_EMOJI[moonIndex(y, m, d)];
// 0 = new moon (Amavasya / no moon), 4 = full moon (Hunnime).
const moonSpecial = (y: number, m: number, d: number): 'amavasya' | 'hunnime' | '' => {
  const i = moonIndex(y, m, d);
  return i === 0 ? 'amavasya' : i === 4 ? 'hunnime' : '';
};

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  // Localized month names, falling back to English if the array is missing.
  const localizedMonths = t('dashboard.months', { returnObjects: true }) as unknown;
  const MONTHS = Array.isArray(localizedMonths) && localizedMonths.length === 12
    ? (localizedMonths as string[]) : MONTHS_EN;
  const [stats, setStats] = useState({ totalCows: 0, milkingCows: 0 });
  const [todayMilk, setTodayMilk] = useState(0);
  const [monthDaily, setMonthDaily] = useState<{ date: string; total: number }[]>([]);
  const [byCow, setByCow] = useState<{ cowId: string; date: string; total: number }[]>([]);
  const [showCharts, setShowCharts] = useState(false); // per-cow charts are opt-in
  const [showFollowUps, setShowFollowUps] = useState(true); // collapsible follow-ups list
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
    localMilk.getMonthDailyByCow(viewYear, viewMonth).then((bc) => setByCow(bc || [])).catch(() => {});
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

  // Group the per-cow rows into one series per cow, each with its own peak
  // (so every cow's chart is scaled to itself), sorted by cowId.
  const cowSeries = useMemo(() => {
    const map: Record<string, { date: string; total: number }[]> = {};
    for (const r of byCow) (map[r.cowId] = map[r.cowId] || []).push({ date: r.date, total: r.total });
    return Object.keys(map)
      .sort()
      .map((cowId) => {
        const data = map[cowId];
        const peak = data.reduce((mx, d) => Math.max(mx, d.total), 0);
        const total = data.reduce((s, d) => s + d.total, 0);
        return { cowId, data, peak, total };
      });
  }, [byCow]);

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
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <MaterialIcons name="dashboard" size={24} color="#1B5E20" />
        <Text style={styles.greeting}>{t('dashboard.title')}, {user?.name || ''}</Text>
      </View>

      <View style={styles.cardsRow}>
        <Card title={t('dashboard.totalCows')} value={String(stats.totalCows)} color="#1B5E20" onPress={() => navigation.navigate('Cows')} />
        <Card title={t('dashboard.todayMilk')} value={`${todayMilk.toFixed(1)} L`} color="#F57F17" onPress={() => navigation.navigate('MilkFeed')} />
      </View>

      {/* Calendar */}
      <View style={styles.calendarCard}>
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
            <MaterialIcons name="chevron-left" size={26} color="#1B5E20" />
          </TouchableOpacity>
          <Text style={styles.calTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
            <MaterialIcons name="chevron-right" size={26} color="#1B5E20" />
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
                <Text style={styles.moon}>{moonEmoji(viewYear, viewMonth, d)}</Text>
                <Text style={[styles.cellText, isSelected && styles.cellTextSelected]}>{d}</Text>
                <View style={styles.dotRow}>
                  {dotTypes.slice(0, 3).map((tp, j) => (
                    <View key={j} style={[styles.dot, { backgroundColor: TYPE_COLOR[tp] }]} />
                  ))}
                </View>
                {moonSpecial(viewYear, viewMonth, d) ? (
                  <Text style={[styles.moonLabel, isSelected && { color: '#fff' }]} numberOfLines={1}>
                    {t(`dashboard.${moonSpecial(viewYear, viewMonth, d)}`)}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#C2185B' }]} /><Text style={styles.legendText}>{t('dashboard.legendHeat')}</Text></View>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#1B5E20' }]} /><Text style={styles.legendText}>{t('dashboard.legendMed')}</Text></View>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#1565C0' }]} /><Text style={styles.legendText}>{t('dashboard.legendTreat')}</Text></View>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#8D5E34' }]} /><Text style={styles.legendText}>{t('dashboard.legendDue')}</Text></View>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#6A1B9A' }]} /><Text style={styles.legendText}>{t('reminders.title')}</Text></View>
        </View>
        <View style={styles.moonLegend}>
          <Text style={styles.legendText}>🌑 {t('dashboard.amavasya')} ({t('dashboard.noMoon')})</Text>
          <Text style={styles.legendText}>🌕 {t('dashboard.hunnime')} ({t('dashboard.fullMoon')})</Text>
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
            <Text style={[styles.summaryValue, { color: '#1B5E20' }]}>{summary.best.total.toFixed(1)} L</Text>
            {!!summary.best.date && <Text style={styles.summarySub}>{summary.best.date.slice(8)} {MONTHS[viewMonth].slice(0, 3)}</Text>}
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('dashboard.milkingCows')}</Text>
            {/* Cows that actually produced milk in the viewed month. */}
            <Text style={[styles.summaryValue, { color: '#1565C0' }]}>{cowSeries.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('dashboard.nonMilkingCows')}</Text>
            <Text style={[styles.summaryValue, { color: '#8D5E34' }]}>{Math.max(0, stats.totalCows - cowSeries.length)}</Text>
          </View>
        </View>

        {/* Per-cow milk charts — collapsed by default, one plot per cow on tap. */}
        <TouchableOpacity style={styles.chartHeader} activeOpacity={0.7} onPress={() => setShowCharts((v) => !v)}>
          <Text style={styles.chartTitle}>{t('dashboard.milkTrend')}</Text>
          <MaterialIcons name={showCharts ? 'expand-less' : 'expand-more'} size={22} color="#1B5E20" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.lineGraphBtn} activeOpacity={0.7} onPress={() => navigation.navigate('MilkChart')}>
          <MaterialIcons name="show-chart" size={18} color="#1565C0" />
          <Text style={styles.lineGraphText}>{t('dashboard.viewLineGraph')}</Text>
          <MaterialIcons name="chevron-right" size={18} color="#1565C0" />
        </TouchableOpacity>
        {!showCharts ? (
          <Text style={styles.chartHint}>{t('dashboard.milkTrendHint')}</Text>
        ) : cowSeries.length === 0 ? (
          <Text style={styles.noEvents}>{t('common.noData')}</Text>
        ) : (
          cowSeries.map((cow) => (
            <View key={cow.cowId} style={styles.cowChartBlock}>
              <View style={styles.cowChartHead}>
                <Text style={styles.cowChartTitle}>{cow.cowId}</Text>
                <Text style={styles.cowChartTotal}>{cow.total.toFixed(1)} L</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chart} contentContainerStyle={{ alignItems: 'flex-end' }}>
                {cow.data.map((d, i) => {
                  const h = cow.peak > 0 ? Math.max(4, (d.total / cow.peak) * 100) : 4;
                  return (
                    <View key={i} style={styles.barCol}>
                      <Text style={styles.barValue}>{d.total.toFixed(0)}</Text>
                      <View style={[styles.bar, { height: h }]} />
                      <Text style={styles.barLabel}>{d.date.slice(8)}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ))
        )}
      </View>

      {/* Selected day details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{formatDate(selected)}</Text>
        {(() => {
          const [sy, sm, sd] = selected.split('-').map(Number);
          const sp = moonSpecial(sy, (sm || 1) - 1, sd);
          return sp ? (
            <Text style={styles.moonNote}>
              {sp === 'amavasya' ? '🌑' : '🌕'} {t(`dashboard.${sp}`)} — {t(sp === 'amavasya' ? 'dashboard.noMoon' : 'dashboard.fullMoon')}
            </Text>
          ) : null;
        })()}
        {selectedEvents.length === 0 ? (
          <Text style={styles.noEvents}>{t('dashboard.noEvents')}</Text>
        ) : (
          selectedEvents.map((e, i) => (
            <View key={i} style={styles.eventRow}>
              <View style={[styles.eventDot, { backgroundColor: TYPE_COLOR[e.type] }]} />
              <Text style={styles.eventCow}>{e.cowId || '🔔'}</Text>
              <Text style={styles.eventTitle}>{e.title}</Text>
            </View>
          ))
        )}
      </View>

      {/* Upcoming follow-ups — collapsible */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHeader} activeOpacity={0.7} onPress={() => setShowFollowUps((v) => !v)}>
          <Text style={styles.sectionTitle}>
            {t('dashboard.followUps')}{upcoming.length ? ` (${upcoming.length})` : ''}
          </Text>
          <MaterialIcons name={showFollowUps ? 'expand-less' : 'expand-more'} size={22} color="#1B5E20" />
        </TouchableOpacity>
        {showFollowUps && (
          upcoming.length === 0 ? (
            <Text style={styles.noEvents}>{t('common.noData')}</Text>
          ) : (
            upcoming.map((e, i) => (
              <TouchableOpacity key={i} style={styles.eventRow} onPress={() => { setViewYear(Number(e.date.slice(0, 4))); setViewMonth(Number(e.date.slice(5, 7)) - 1); setSelected(e.date); }}>
                <View style={[styles.eventDot, { backgroundColor: TYPE_COLOR[e.type] }]} />
                <Text style={styles.eventCow}>{e.cowId || '🔔'}</Text>
                <Text style={styles.eventTitle}>{e.title}</Text>
                <Text style={styles.eventDate}>{formatDate(e.date)}{e.time ? ` · ${e.time}` : ''}</Text>
              </TouchableOpacity>
            ))
          )
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
  moon: { position: 'absolute', top: 2, right: 3, fontSize: 8 },
  moonLabel: { position: 'absolute', bottom: 1, fontSize: 6, color: '#6A1B9A', fontWeight: '700' },
  moonLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 6, flexWrap: 'wrap' },
  cellSelected: { backgroundColor: '#1B5E20' },
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noEvents: { fontSize: 13, color: '#999' },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
  eventCow: { fontSize: 13, fontWeight: '700', color: '#555', minWidth: 44 },
  eventTitle: { fontSize: 14, color: '#333', flex: 1 },
  eventDate: { fontSize: 12, color: '#888' },
  moonNote: { fontSize: 13, color: '#6A1B9A', fontWeight: '600', marginBottom: 8 },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  summaryItem: { width: '50%', paddingVertical: 8, paddingRight: 8 },
  summaryLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  summaryValue: { fontSize: 20, fontWeight: 'bold' },
  summarySub: { fontSize: 11, color: '#999', marginTop: 1 },
  chartTitle: { fontSize: 13, fontWeight: '600', color: '#333' },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 6, paddingVertical: 4 },
  chartHint: { fontSize: 12, color: '#999', fontStyle: 'italic', marginBottom: 4 },
  lineGraphBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#E3F2FD', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8 },
  lineGraphText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  cowChartBlock: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 8 },
  cowChartHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cowChartTitle: { fontSize: 13, fontWeight: '700', color: '#1B5E20' },
  cowChartTotal: { fontSize: 12, fontWeight: '600', color: '#8D5E34' },
  chart: { flexDirection: 'row', paddingTop: 4, height: 150 },
  barCol: { alignItems: 'center', width: 30, justifyContent: 'flex-end' },
  bar: { width: 14, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: '#F57F17' },
  barValue: { fontSize: 9, color: '#888', marginBottom: 2 },
  barLabel: { fontSize: 10, color: '#666', marginTop: 4 },
});
