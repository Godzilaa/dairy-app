import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { localMilk, localCows } from '../services/database';
import MilkLineChart, { MilkSeries } from '../components/MilkLineChart';

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Distinct, high-contrast colours — one per cow.
const PALETTE = ['#1B5E20', '#1565C0', '#C2185B', '#F57F17', '#6A1B9A', '#00838F', '#8D5E34', '#2E7D32', '#AD1457', '#4527A0'];

export default function MilkChartScreen() {
  const { t } = useTranslation();
  const localizedMonths = t('dashboard.months', { returnObjects: true }) as unknown;
  const MONTHS = Array.isArray(localizedMonths) && localizedMonths.length === 12 ? (localizedMonths as string[]) : MONTHS_EN;

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [rows, setRows] = useState<{ cowId: string; date: string; morning: number; evening: number }[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    localMilk.getMonthMorningEveningByCow(viewYear, viewMonth).then((r) => setRows(r || [])).catch(() => {});
  }, [viewYear, viewMonth]);
  useEffect(() => {
    localCows.getAll().then((cs) => {
      const map: Record<string, string> = {};
      for (const c of cs) map[c.cowId] = c.name;
      setNames(map);
    }).catch(() => {});
  }, []);

  const { dates, series } = useMemo(() => {
    const dateSet = Array.from(new Set(rows.map((r) => r.date))).sort();
    const dateIdx = new Map(dateSet.map((d, i) => [d, i]));
    const byCow = new Map<string, { morning: (number | null)[]; evening: (number | null)[] }>();
    for (const r of rows) {
      if (!byCow.has(r.cowId)) {
        byCow.set(r.cowId, {
          morning: new Array(dateSet.length).fill(null),
          evening: new Array(dateSet.length).fill(null),
        });
      }
      const s = byCow.get(r.cowId)!;
      const i = dateIdx.get(r.date)!;
      s.morning[i] = r.morning;
      s.evening[i] = r.evening;
    }
    const series: MilkSeries[] = Array.from(byCow.keys()).sort().map((cowId, idx) => ({
      cowId,
      name: names[cowId] || cowId,
      color: PALETTE[idx % PALETTE.length],
      morning: byCow.get(cowId)!.morning,
      evening: byCow.get(cowId)!.evening,
    }));
    return { dates: dateSet, series };
  }, [rows, names]);

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta, y = viewYear;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y);
  };

  const screenW = Dimensions.get('window').width;
  const chartW = Math.max(screenW - 32, dates.length * 46 + 48);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}><MaterialIcons name="chevron-left" size={26} color="#1B5E20" /></TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}><MaterialIcons name="chevron-right" size={26} color="#1B5E20" /></TouchableOpacity>
      </View>

      <Text style={styles.axisNote}>{t('milk.chartAxis')}</Text>

      {series.length === 0 ? (
        <Text style={styles.empty}>{t('common.noData')}</Text>
      ) : (
        <>
          <View style={styles.chartCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <MilkLineChart dates={dates} series={series} width={chartW} height={280} />
            </ScrollView>
          </View>

          {/* Line-style key */}
          <View style={styles.styleKey}>
            <View style={styles.keyItem}><View style={styles.solidLine} /><Text style={styles.keyText}>{t('milk.morningMilk')}</Text></View>
            <View style={styles.keyItem}><View style={styles.dashedLine} /><Text style={styles.keyText}>{t('milk.eveningMilk')}</Text></View>
          </View>

          {/* Cow legend */}
          <View style={styles.legend}>
            {series.map((s) => (
              <View key={s.cowId} style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: s.color }]} />
                <Text style={styles.legendText}>{s.cowId}{s.name && s.name !== s.cowId ? ` · ${s.name}` : ''}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navBtn: { padding: 4 },
  monthTitle: { fontSize: 17, fontWeight: '700', color: '#333' },
  axisNote: { fontSize: 12, color: '#999', marginBottom: 12 },
  chartCard: { backgroundColor: '#fff', borderRadius: 12, padding: 10, elevation: 2 },
  empty: { textAlign: 'center', color: '#999', marginTop: 48 },
  styleKey: { flexDirection: 'row', gap: 20, justifyContent: 'center', marginTop: 12 },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  solidLine: { width: 24, height: 0, borderTopWidth: 2, borderColor: '#555' },
  dashedLine: { width: 24, height: 0, borderTopWidth: 2, borderColor: '#555', borderStyle: 'dashed' },
  keyText: { fontSize: 12, color: '#666' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14, marginBottom: 40 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontSize: 13, color: '#444' },
});
