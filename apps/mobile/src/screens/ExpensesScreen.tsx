import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { localExpenses } from '../services/database';
import DateField from '../components/DateField';
import ExpensePieChart, { PieSlice } from '../components/ExpensePieChart';
import { formatDate } from '../utils/date';
import { COLORS, SHADOWS, RADIUS } from '../theme';

const today = () => new Date().toISOString().split('T')[0];

// Fixed set of dairy-farm expense categories. `key` is stored in the DB; the
// label is looked up via i18n (expenses.cat.<key>) so it localizes cleanly.
export const EXPENSE_CATEGORIES: { key: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }[] = [
  { key: 'feed', icon: 'grain', color: '#8D5E34' },
  { key: 'veterinary', icon: 'medical-bag', color: '#1B5E20' },
  { key: 'medicine', icon: 'pill', color: '#00897B' },
  { key: 'labor', icon: 'account-hard-hat', color: '#5E35B1' },
  { key: 'breeding', icon: 'needle', color: '#C2185B' },
  { key: 'equipment', icon: 'tools', color: '#455A64' },
  { key: 'transport', icon: 'truck', color: '#1565C0' },
  { key: 'utilities', icon: 'flash', color: '#F9A825' },
  { key: 'maintenance', icon: 'wrench', color: '#6D4C41' },
  { key: 'other', icon: 'dots-horizontal', color: '#757575' },
];

const CAT = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.key, c]));
const catMeta = (key: string) => CAT[key] || CAT.other;

// ₹ formatting with Indian grouping (e.g. ₹12,34,567). Hand-rolled rather than
// Intl/toLocaleString('en-IN') because Hermes' locale support is unreliable.
// Decimals shown only when the amount isn't a whole rupee.
export const formatINR = (n: number): string => {
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  const [intPart, decPart] = Math.abs(rounded).toFixed(2).split('.');
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  const dec = decPart === '00' ? '' : '.' + decPart;
  return `₹${rounded < 0 ? '-' : ''}${grouped}${dec}`;
};
const money = formatINR;

const PAYMENT_MODES = ['cash', 'upi', 'bank', 'credit'] as const;

export default function ExpensesScreen() {
  const { t } = useTranslation();
  const catLabel = (key: string) => t(`expenses.cat.${key}`, key);

  const [records, setRecords] = useState<any[]>([]);
  const [filterCat, setFilterCat] = useState('');            // '' = all categories
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add / edit form state
  const [fCategory, setFCategory] = useState('feed');
  const [fAmount, setFAmount] = useState('');
  const [fDate, setFDate] = useState(today());
  const [fPayment, setFPayment] = useState<string>('cash');
  const [fNotes, setFNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRecords = async () => {
    try {
      setRecords((await localExpenses.getAll(filterCat || undefined)) || []);
    } catch {}
  };

  useEffect(() => { loadRecords(); }, [filterCat]);
  useFocusEffect(React.useCallback(() => { loadRecords(); }, [filterCat]));

  // This-month + today totals across the *visible* (filtered) records.
  const totals = useMemo(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayISO = today();
    let month = 0, todaySum = 0;
    for (const r of records) {
      const amt = r.amount || 0;
      if ((r.expenseDate || '').startsWith(monthPrefix)) month += amt;
      if (r.expenseDate === todayISO) todaySum += amt;
    }
    return { month, today: todaySum };
  }, [records]);

  // Category breakdown for the pie chart, across the visible (filtered) records.
  // Sorted by spend descending so the biggest categories lead the legend.
  const breakdown = useMemo<PieSlice[]>(() => {
    const sums: Record<string, number> = {};
    for (const r of records) {
      const key = r.category || 'other';
      sums[key] = (sums[key] || 0) + (r.amount || 0);
    }
    return EXPENSE_CATEGORIES
      .map((c) => ({ key: c.key, label: catLabel(c.key), color: c.color, value: sums[c.key] || 0 }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [records]);

  const breakdownTotal = breakdown.reduce((sum, s) => sum + s.value, 0);

  const resetForm = () => {
    setEditingId(null);
    setFCategory('feed'); setFAmount(''); setFDate(today()); setFPayment('cash'); setFNotes('');
  };

  const openAdd = () => { resetForm(); setModalVisible(true); };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setFCategory(item.category || 'other');
    setFAmount(item.amount != null ? String(item.amount) : '');
    setFDate(item.expenseDate || today());
    setFPayment(item.paymentMode || 'cash');
    setFNotes(item.notes || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const amt = parseFloat(fAmount);
    if (!fAmount.trim() || isNaN(amt) || amt <= 0) { Alert.alert(t('common.error'), t('expenses.amountRequired')); return; }
    setSaving(true);
    try {
      const payload = {
        category: fCategory,
        amount: amt,
        expenseDate: fDate || today(),
        paymentMode: fPayment || undefined,
        notes: fNotes.trim() || undefined,
      };
      if (editingId) await localExpenses.update(editingId, payload);
      else await localExpenses.create(payload);
      setModalVisible(false);
      resetForm();
      await loadRecords();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert(
      t('common.delete'),
      t('expenses.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await localExpenses.delete(editingId);
              setModalVisible(false);
              resetForm();
              await loadRecords();
            } catch (err: any) {
              Alert.alert(t('common.error'), err.message);
            }
          },
        },
      ],
    );
  };

  const renderCard = (item: any) => {
    const m = catMeta(item.category);
    return (
      <TouchableOpacity key={item.id} style={styles.card} onPress={() => openEdit(item)}>
        <View style={[styles.catIcon, { backgroundColor: m.color + '18' }]}>
          <MaterialCommunityIcons name={m.icon} size={22} color={m.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.catName}>{catLabel(item.category)}</Text>
          <Text style={styles.cardMeta}>
            {formatDate(item.expenseDate)}
            {item.paymentMode ? ` · ${t(`expenses.pay.${item.paymentMode}`, item.paymentMode)}` : ''}
          </Text>
          {item.notes ? <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text> : null}
        </View>
        <Text style={[styles.amount, { color: m.color }]}>{money(item.amount || 0)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Totals header */}
      <View style={styles.totalCard}>
        <View style={styles.totalCol}>
          <Text style={styles.totalLabel}>{t('expenses.thisMonth')}</Text>
          <Text style={styles.totalValue}>{money(totals.month)}</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalCol}>
          <Text style={styles.totalLabel}>{t('expenses.today')}</Text>
          <Text style={[styles.totalValue, styles.totalToday]}>{money(totals.today)}</Text>
        </View>
      </View>

      {/* Spend-by-category pie chart */}
      {breakdown.length > 0 && (
        <View style={styles.pieCard}>
          <Text style={styles.pieTitle}>{t('expenses.byCategory')}</Text>
          <View style={styles.pieRow}>
            <ExpensePieChart slices={breakdown} size={140} strokeWidth={28} />
            <View style={styles.legend}>
              {breakdown.map((s) => {
                const pct = Math.round((s.value / breakdownTotal) * 100);
                return (
                  <View key={s.key} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                    <Text style={styles.legendLabel} numberOfLines={1}>{s.label}</Text>
                    <Text style={styles.legendValue}>{money(s.value)} · {pct}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Category filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ paddingRight: 12 }}>
        <TouchableOpacity
          style={[styles.chip, !filterCat && styles.chipActive]}
          onPress={() => setFilterCat('')}>
          <Text style={[styles.chipText, !filterCat && styles.chipTextActive]}>{t('expenses.all')}</Text>
        </TouchableOpacity>
        {EXPENSE_CATEGORIES.map((c) => {
          const active = filterCat === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, active && { backgroundColor: c.color, borderColor: c.color }]}
              onPress={() => setFilterCat(active ? '' : c.key)}>
              <MaterialCommunityIcons name={c.icon} size={14} color={active ? '#fff' : c.color} />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{catLabel(c.key)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        {records.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="cash-remove" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{t('expenses.empty')}</Text>
          </View>
        ) : (
          records.map(renderCard)
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? t('expenses.editRecord') : t('expenses.addRecord')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>{t('expenses.category')}</Text>
              <View style={styles.catGrid}>
                {EXPENSE_CATEGORIES.map((c) => {
                  const active = fCategory === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.catOption, active && { backgroundColor: c.color + '18', borderColor: c.color }]}
                      onPress={() => setFCategory(c.key)}>
                      <MaterialCommunityIcons name={c.icon} size={18} color={c.color} />
                      <Text style={[styles.catOptionText, active && { color: c.color, fontWeight: '700' }]}>{catLabel(c.key)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>{t('expenses.amount')} *</Text>
              <View style={styles.amountRow}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={fAmount}
                  onChangeText={setFAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  autoFocus={!editingId}
                />
              </View>

              <Text style={styles.label}>{t('expenses.date')}</Text>
              <DateField value={fDate} onChange={setFDate} style={styles.modalInput} />

              <Text style={styles.label}>{t('expenses.paymentMode')}</Text>
              <View style={styles.payRow}>
                {PAYMENT_MODES.map((p) => {
                  const active = fPayment === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.payChip, active && styles.payChipActive]}
                      onPress={() => setFPayment(p)}>
                      <Text style={[styles.payChipText, active && styles.chipTextActive]}>{t(`expenses.pay.${p}`, p)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>{t('expenses.notes')}</Text>
              <TextInput style={styles.modalInput} value={fNotes} onChangeText={setFNotes} placeholder={t('expenses.notesHint')} />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
            {editingId && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <MaterialIcons name="delete-outline" size={18} color="#C62828" />
                <Text style={styles.deleteText}>{t('common.delete')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  totalCard: {
    flexDirection: 'row', backgroundColor: '#1B5E20', borderRadius: RADIUS.lg, padding: 18,
    alignItems: 'center', marginBottom: 14, ...SHADOWS.card,
  },
  totalCol: { flex: 1, alignItems: 'center' },
  totalDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },
  totalLabel: { fontSize: 12.5, color: '#C8E6C9', marginBottom: 4, fontWeight: '600' },
  totalValue: { fontSize: 26, fontWeight: 'bold', color: '#fff', letterSpacing: -0.5 },
  totalToday: { fontSize: 22, color: '#FFF9C4' },

  pieCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card,
  },
  pieTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  pieRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { flex: 1, gap: 7 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 12.5, color: COLORS.textSecondary },
  legendValue: { fontSize: 12.5, fontWeight: '700', color: COLORS.textPrimary },

  chipRow: { flexGrow: 0, marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#fff' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card,
  },
  catIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 2 },
  notes: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  amount: { fontSize: 17, fontWeight: 'bold' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },

  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.soft,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '88%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6, marginTop: 12 },
  modalInput: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 12, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt,
  },
  catOptionText: { fontSize: 13, color: COLORS.textSecondary },

  amountRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14,
  },
  rupee: { fontSize: 22, fontWeight: 'bold', color: '#1B5E20', marginRight: 6 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, paddingVertical: 12 },

  payRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt },
  payChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  payChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#EEEEEE', alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.soft },
  saveText: { color: '#fff', fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 12, marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  deleteText: { color: '#C62828', fontWeight: '600' },
});
