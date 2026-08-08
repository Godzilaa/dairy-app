import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  records: any[];
  // Renders one record row (e.g. the existing card). Receives the raw record.
  renderItem: (item: any) => React.ReactNode;
  // Optional one-line summary shown on the collapsed header (e.g. "12.5 L").
  summary?: (items: any[]) => string;
  accent?: string;
  emptyText?: string;
};

// Groups records by cowId and shows each cow as a collapsible dropdown.
// Tapping a cow header expands to reveal that cow's individual records.
export default function CowAccordion({ records, renderItem, summary, accent = '#1B5E20', emptyText }: Props) {
  const groups = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const r of records) {
      const key = r.cowId || '—';
      (map[key] = map[key] || []).push(r);
    }
    return Object.keys(map).sort().map((cowId) => ({ cowId, items: map[cowId] }));
  }, [records]);

  // First cow expanded by default so the screen isn't all-collapsed on open.
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (cowId: string) => setOpen((o) => ({ ...o, [cowId]: !o[cowId] }));

  if (groups.length === 0) {
    return <Text style={styles.empty}>{emptyText || 'No data'}</Text>;
  }

  return (
    <View>
      {groups.map((g, idx) => {
        const isOpen = open[g.cowId] ?? idx === 0;
        return (
          <View key={g.cowId} style={styles.group}>
            <TouchableOpacity style={styles.header} activeOpacity={0.7} onPress={() => toggle(g.cowId)}>
              <View style={styles.headerLeft}>
                <MaterialCommunityIcons name="cow" size={18} color={accent} />
                <Text style={[styles.cowId, { color: accent }]}>{g.cowId}</Text>
                <View style={[styles.badge, { backgroundColor: accent }]}>
                  <Text style={styles.badgeText}>{g.items.length}</Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                {summary ? <Text style={styles.summary}>{summary(g.items)}</Text> : null}
                <MaterialIcons name={isOpen ? 'expand-less' : 'expand-more'} size={22} color="#888" />
              </View>
            </TouchableOpacity>
            {isOpen && (
              <View style={styles.body}>
                {g.items.map((it, i) => (
                  <React.Fragment key={it.id || i}>{renderItem(it)}</React.Fragment>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 10, overflow: 'hidden', elevation: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cowId: { fontSize: 15, fontWeight: '700' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  summary: { fontSize: 13, color: '#8D5E34', fontWeight: '600' },
  body: { paddingHorizontal: 10, paddingBottom: 8, backgroundColor: '#FAFAFA' },
  empty: { textAlign: 'center', marginTop: 48, color: '#999' },
});
