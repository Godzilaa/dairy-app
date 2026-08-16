import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRoute } from '@react-navigation/native';
import { localHeat, expectedDueDate } from '../services/database';
import DateField from '../components/DateField';
import CowPicker from '../components/CowPicker';
import { formatDate } from '../utils/date';
import { COLORS, SHADOWS, RADIUS } from '../theme';

const today = () => new Date().toISOString().split('T')[0];

// Add N days to a YYYY-MM-DD string, returning YYYY-MM-DD.
const addDays = (iso: string, days: number): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export default function HeatTrackingScreen() {
  const { t } = useTranslation();
  const route = useRoute<any>();
  const [cowId, setCowId] = useState(route.params?.cowId || '');
  const [records, setRecords] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [fHeat, setFHeat] = useState(today());
  const [fConception, setFConception] = useState('');
  const [fRepeat, setFRepeat] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRecords = async () => {
    try {
      setRecords((await localHeat.getAll(cowId || undefined)) || []);
    } catch {}
  };

  useEffect(() => { loadRecords(); }, [cowId]);

  // Repeat heat is expected ~15 days after conception — auto-suggest it.
  useEffect(() => {
    if (fConception) setFRepeat(addDays(fConception, 15));
  }, [fConception]);

  const resetForm = () => { setEditingId(null); setFHeat(today()); setFConception(''); setFRepeat(''); setFNotes(''); };

  const openAdd = () => { resetForm(); setModalVisible(true); };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    if (r.cowId) setCowId(r.cowId);
    setFHeat(r.heatIdentificationDate || today());
    setFConception(r.conceptionDate || '');
    setFRepeat(r.repeatHeatDate || '');
    setFNotes(r.notes || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!cowId.trim()) { Alert.alert('Error', 'Enter a Cow ID first'); return; }
    if (!fHeat.trim()) { Alert.alert('Error', 'Heat identification date is required'); return; }
    setSaving(true);
    try {
      const payload = {
        cowId: cowId.trim(),
        heatIdentificationDate: fHeat,
        conceptionDate: fConception || undefined,
        repeatHeatDate: fRepeat || undefined,
        notes: fNotes || undefined,
      };
      if (editingId) await localHeat.update(editingId, payload);
      else await localHeat.create(payload);
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
    Alert.alert(t('common.delete'), 'Delete this heat record?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await localHeat.delete(editingId);
            setModalVisible(false);
            resetForm();
            await loadRecords();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={t('heat.enterCowId')}
        value={cowId}
        onChangeText={setCowId}
        autoCapitalize="characters"
      />

      {/* Table */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell, styles.colDate]}>{t('heat.heatIdentification')}</Text>
            <Text style={[styles.cell, styles.headerCell, styles.colDate]}>{t('heat.conception')}</Text>
            <Text style={[styles.cell, styles.headerCell, styles.colDate]}>{t('heat.expectedDueDate')}</Text>
            <Text style={[styles.cell, styles.headerCell, styles.colDate]}>{t('heat.repeatHeatDate')}</Text>
            <Text style={[styles.cell, styles.headerCell, styles.colNotes]}>{t('heat.notes')}</Text>
          </View>
          <ScrollView>
            {records.length === 0 ? (
              <Text style={styles.empty}>{t('common.noData')}</Text>
            ) : (
              records.map((r, i) => (
                <TouchableOpacity key={r.id || i} style={[styles.row, i % 2 === 1 && styles.rowAlt]} onPress={() => openEdit(r)}>
                  <Text style={[styles.cell, styles.colDate]}>{formatDate(r.heatIdentificationDate) || '-'}</Text>
                  <Text style={[styles.cell, styles.colDate]}>{formatDate(r.conceptionDate) || '-'}</Text>
                  <Text style={[styles.cell, styles.colDate, styles.dueCell]}>{formatDate(expectedDueDate(r.conceptionDate)) || '-'}</Text>
                  <Text style={[styles.cell, styles.colDate]}>{formatDate(r.repeatHeatDate) || '-'}</Text>
                  <View style={[styles.cell, styles.colNotes, styles.notesCell]}>
                    <Text style={styles.notesText} numberOfLines={1}>{r.notes || '-'}</Text>
                    <MaterialIcons name="edit" size={15} color="#bbb" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? t('heat.editRecord') : t('heat.addRecord')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>{t('cow.cowId')} *</Text>
              <CowPicker value={cowId} onChange={setCowId} style={styles.modalInput} disabled={!!editingId} />

              <Text style={styles.label}>{t('heat.heatIdentification')} *</Text>
              <DateField value={fHeat} onChange={setFHeat} style={styles.modalInput} />

              <Text style={styles.label}>{t('heat.conception')}</Text>
              <DateField value={fConception} onChange={setFConception} style={styles.modalInput} />

              <Text style={styles.label}>{t('heat.expectedDueDate')}</Text>
              <View style={[styles.modalInput, styles.readonlyInput]}>
                <Text style={styles.readonlyText}>{formatDate(expectedDueDate(fConception)) || '—'}</Text>
              </View>
              {fConception ? <Text style={styles.autoHint}>{t('heat.dueAuto')}</Text> : null}

              <Text style={styles.label}>{t('heat.repeatHeatDate')}</Text>
              <DateField value={fRepeat} onChange={setFRepeat} style={styles.modalInput} />
              {fConception ? <Text style={styles.autoHint}>{t('heat.repeatAuto')}</Text> : null}

              <Text style={styles.label}>{t('heat.notes')}</Text>
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
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  input: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E8E8E8', backgroundColor: '#fff' },
  rowAlt: { backgroundColor: '#FAFAFA' },
  headerRow: { backgroundColor: '#C2185B', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  cell: { paddingVertical: 12, paddingHorizontal: 10, fontSize: 13, color: COLORS.textPrimary },
  headerCell: { color: '#fff', fontWeight: '700', fontSize: 12 },
  colDate: { width: 130 },
  colNotes: { width: 160 },
  notesCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  notesText: { fontSize: 13, color: COLORS.textPrimary, flex: 1 },
  dueCell: { color: '#8D5E34', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, color: COLORS.textMuted, width: 680 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#C2185B', alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%', ...SHADOWS.card },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4, marginTop: 10 },
  modalInput: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 12, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },
  readonlyInput: { backgroundColor: '#EFEAE4', justifyContent: 'center' },
  readonlyText: { fontSize: 15, color: '#8D5E34', fontWeight: '600' },
  autoHint: { fontSize: 12, color: '#C2185B', marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#EEEEEE', alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#C2185B', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 12, marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  deleteText: { color: '#C62828', fontWeight: '600' },
});
