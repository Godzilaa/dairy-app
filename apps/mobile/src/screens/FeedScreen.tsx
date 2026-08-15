import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { localFeed } from '../services/database';
import DateField from '../components/DateField';
import CowAccordion from '../components/CowAccordion';
import CowPicker from '../components/CowPicker';
import { formatDate } from '../utils/date';
import { COLORS, SHADOWS, RADIUS } from '../theme';

const today = () => new Date().toISOString().split('T')[0];
const DEFAULT_UNIT = 'kg';

export default function FeedScreen() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);
  const [cowId, setCowId] = useState('');
  const [todayTotal, setTodayTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add-entry form state
  const [fCowId, setFCowId] = useState('');
  const [fDate, setFDate] = useState(today());
  const [fType, setFType] = useState('');
  const [fQty, setFQty] = useState('');
  const [fUnit, setFUnit] = useState(DEFAULT_UNIT);
  const [fNotes, setFNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRecords = async () => {
    try {
      const data = await localFeed.getAll(cowId || undefined);
      setRecords(data || []);
      setTodayTotal(await localFeed.getTodayTotal());
    } catch {}
  };

  useEffect(() => { loadRecords(); }, [cowId]);

  const resetForm = () => {
    setEditingId(null);
    setFCowId(''); setFDate(today()); setFType(''); setFQty(''); setFUnit(DEFAULT_UNIT); setFNotes('');
  };

  const openAdd = () => { resetForm(); setModalVisible(true); };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setFCowId(item.cowId || '');
    setFDate(item.feedDate || today());
    setFType(item.feedType || '');
    setFQty(item.quantity != null ? String(item.quantity) : '');
    setFUnit(item.unit || DEFAULT_UNIT);
    setFNotes(item.notes || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!fCowId.trim()) { Alert.alert('Error', 'Cow ID is required'); return; }
    if (!fType.trim() && !fQty.trim()) { Alert.alert('Error', 'Enter a feed type or quantity'); return; }
    setSaving(true);
    try {
      const payload = {
        cowId: fCowId.trim(),
        feedDate: fDate || today(),
        feedType: fType.trim() || undefined,
        quantity: fQty ? parseFloat(fQty) : undefined,
        unit: fUnit.trim() || DEFAULT_UNIT,
        notes: fNotes || undefined,
      };
      if (editingId) await localFeed.update(editingId, payload);
      else await localFeed.create(payload);
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
      'Delete this feed record?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await localFeed.delete(editingId);
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
          <Text style={styles.date}>{formatDate(item.feedDate)}</Text>
          <MaterialIcons name="edit" size={15} color="#bbb" />
        </View>
      </View>
      <View style={styles.feedRow}>
        {item.feedType ? <Text style={styles.feedType}>{item.feedType}</Text> : null}
        {item.quantity != null ? (
          <Text style={styles.feedQty}>{item.quantity} {item.unit || DEFAULT_UNIT}</Text>
        ) : null}
      </View>
      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.totalCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="grain" size={24} color="#8D5E34" />
          <Text style={styles.totalLabel}>{t('feed.todayFeed')}</Text>
        </View>
        <Text style={styles.totalValue}>{todayTotal.toFixed(1)} {DEFAULT_UNIT}</Text>
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
          summary={(items) => `${items.reduce((s, m) => s + (m.quantity || 0), 0).toFixed(1)} ${DEFAULT_UNIT}`}
        />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? t('feed.editRecord') : t('feed.addRecord')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>{t('cow.cowId')} *</Text>
              <CowPicker value={fCowId} onChange={setFCowId} style={styles.modalInput} disabled={!!editingId} />

              <Text style={styles.label}>{t('feed.date')}</Text>
              <DateField value={fDate} onChange={setFDate} style={styles.modalInput} />

              <Text style={styles.label}>{t('feed.feedType')}</Text>
              <TextInput style={styles.modalInput} value={fType} onChangeText={setFType} placeholder="Green fodder / silage / concentrate" />

              <View style={styles.qtyRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.label}>{t('feed.quantity')}</Text>
                  <TextInput style={styles.modalInput} value={fQty} onChangeText={setFQty} keyboardType="decimal-pad" placeholder="0.0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t('feed.unit')}</Text>
                  <TextInput style={styles.modalInput} value={fUnit} onChangeText={setFUnit} placeholder={DEFAULT_UNIT} />
                </View>
              </View>

              <Text style={styles.label}>{t('feed.notes')}</Text>
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
    backgroundColor: '#EFEBE9', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16, elevation: 2,
  },
  totalLabel: { fontSize: 14, color: '#8D5E34' },
  totalValue: { fontSize: 36, fontWeight: 'bold', color: '#5D4037' },
  input: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cowId: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  date: { fontSize: 13, color: COLORS.textMuted },
  feedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  feedType: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500', flex: 1 },
  feedQty: { fontSize: 15, fontWeight: 'bold', color: '#5D4037' },
  notes: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.soft,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4, marginTop: 10 },
  modalInput: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 12, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },
  qtyRow: { flexDirection: 'row', gap: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#EEEEEE', alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.soft },
  saveText: { color: '#fff', fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 12, marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  deleteText: { color: '#C62828', fontWeight: '600' },
});
