import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { localMilk } from '../services/database';
import DateField from '../components/DateField';
import CowAccordion from '../components/CowAccordion';
import CowPicker from '../components/CowPicker';
import { formatDate } from '../utils/date';
import { COLORS, SHADOWS, RADIUS } from '../theme';

const today = () => new Date().toISOString().split('T')[0];

export default function MilkFeedScreen() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);
  const [cowId, setCowId] = useState('');
  const [todayTotal, setTodayTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add-entry form state
  const [fCowId, setFCowId] = useState('');
  const [fDate, setFDate] = useState(today());
  const [fMorning, setFMorning] = useState('');
  const [fEvening, setFEvening] = useState('');
  const [fFeed, setFFeed] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRecords = async () => {
    try {
      const data = await localMilk.getAll(cowId || undefined);
      setRecords(data || []);
      const total = await localMilk.getTodayTotal();
      setTodayTotal(total);
    } catch {}
  };

  useEffect(() => { loadRecords(); }, [cowId]);

  const resetForm = () => {
    setEditingId(null);
    setFCowId(''); setFDate(today()); setFMorning(''); setFEvening(''); setFFeed(''); setFNotes('');
  };

  const openAdd = () => { resetForm(); setModalVisible(true); };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setFCowId(item.cowId || '');
    setFDate(item.milkingDate || today());
    setFMorning(item.morningMilk != null ? String(item.morningMilk) : '');
    setFEvening(item.eveningMilk != null ? String(item.eveningMilk) : '');
    setFFeed(item.feedGiven || '');
    setFNotes(item.notes || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!fCowId.trim()) { Alert.alert('Error', 'Cow ID is required'); return; }
    if (!fMorning && !fEvening) { Alert.alert('Error', 'Enter morning or evening milk'); return; }
    setSaving(true);
    try {
      const payload = {
        cowId: fCowId.trim(),
        milkingDate: fDate || today(),
        morningMilk: fMorning ? parseFloat(fMorning) : undefined,
        eveningMilk: fEvening ? parseFloat(fEvening) : undefined,
        feedGiven: fFeed || undefined,
        notes: fNotes || undefined,
      };
      if (editingId) await localMilk.update(editingId, payload);
      else await localMilk.create(payload);
      setModalVisible(false);
      resetForm();
      await loadRecords();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert(
      t('common.delete'),
      'Delete this milk/feed record?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await localMilk.delete(editingId);
              setModalVisible(false);
              resetForm();
              await loadRecords();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
    );
  };

  const renderCard = (item: any) => (
    <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cowId}>{item.cowId}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.date}>{formatDate(item.milkingDate)}</Text>
          <MaterialIcons name="edit" size={15} color="#bbb" />
        </View>
      </View>
      <View style={styles.milkRow}>
        <Text style={styles.milkLabel}>{t('milk.morningMilk')}: {item.morningMilk ?? '-'} L</Text>
        <Text style={styles.milkLabel}>{t('milk.eveningMilk')}: {item.eveningMilk ?? '-'} L</Text>
        <Text style={styles.milkTotal}>
          {t('milk.total')}: {((item.morningMilk || 0) + (item.eveningMilk || 0)).toFixed(1)} L
        </Text>
      </View>
      {item.feedGiven && <Text style={styles.feed}>{t('milk.feedGiven')}: {item.feedGiven}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.totalCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialIcons name="local-drink" size={24} color="#1B5E20" />
          <Text style={styles.totalLabel}>{t('dashboard.todayMilk')}</Text>
        </View>
        <Text style={styles.totalValue}>{todayTotal.toFixed(1)} L</Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Filter by CowID"
        value={cowId}
        onChangeText={setCowId}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        <CowAccordion
          records={records}
          renderItem={renderCard}
          emptyText={t('common.noData')}
          summary={(items) => `${items.reduce((s, m) => s + (m.morningMilk || 0) + (m.eveningMilk || 0), 0).toFixed(1)} L`}
        />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? t('milk.editRecord') : t('milk.addRecord')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>{t('cow.cowId')} *</Text>
              <CowPicker value={fCowId} onChange={setFCowId} style={styles.modalInput} disabled={!!editingId} />

              <Text style={styles.label}>{t('milk.date')}</Text>
              <DateField value={fDate} onChange={setFDate} style={styles.modalInput} />

              <Text style={styles.label}>{t('milk.morningMilk')}</Text>
              <TextInput style={styles.modalInput} value={fMorning} onChangeText={setFMorning} keyboardType="decimal-pad" placeholder="0.0" />

              <Text style={styles.label}>{t('milk.eveningMilk')}</Text>
              <TextInput style={styles.modalInput} value={fEvening} onChangeText={setFEvening} keyboardType="decimal-pad" placeholder="0.0" />

              <Text style={styles.label}>{t('milk.feedGiven')}</Text>
              <TextInput style={styles.modalInput} value={fFeed} onChangeText={setFFeed} placeholder="Feed / fodder" />

              <Text style={styles.label}>{t('milk.notes')}</Text>
              <TextInput style={styles.modalInput} value={fNotes} onChangeText={setFNotes} />
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
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16, elevation: 2,
  },
  totalLabel: { fontSize: 14, color: '#F57F17' },
  totalValue: { fontSize: 36, fontWeight: 'bold', color: '#E65100' },
  input: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cowId: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  date: { fontSize: 13, color: COLORS.textMuted },
  milkRow: { gap: 4, marginBottom: 4 },
  milkLabel: { fontSize: 14, color: COLORS.textPrimary },
  milkTotal: { fontSize: 15, fontWeight: 'bold', color: '#E65100', marginTop: 4 },
  feed: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 48, color: COLORS.textMuted },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.soft,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4, marginTop: 10 },
  modalInput: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 12, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#EEEEEE', alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.soft },
  saveText: { color: '#fff', fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 12, marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  deleteText: { color: '#C62828', fontWeight: '600' },
});
