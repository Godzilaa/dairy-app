import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Modal, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRoute } from '@react-navigation/native';
import { localHeat } from '../services/database';

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

  const resetForm = () => { setFHeat(today()); setFConception(''); setFRepeat(''); setFNotes(''); };

  const handleSave = async () => {
    if (!cowId.trim()) { Alert.alert('Error', 'Enter a Cow ID first'); return; }
    if (!fHeat.trim()) { Alert.alert('Error', 'Heat identification date is required'); return; }
    setSaving(true);
    try {
      await localHeat.create({
        cowId: cowId.trim(),
        heatIdentificationDate: fHeat,
        conceptionDate: fConception || undefined,
        repeatHeatDate: fRepeat || undefined,
        notes: fNotes || undefined,
      });
      setModalVisible(false);
      resetForm();
      await loadRecords();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <MaterialIcons name="favorite" size={24} color="#C2185B" />
        <Text style={styles.title}>{t('heat.title')}</Text>
      </View>

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
            <Text style={[styles.cell, styles.headerCell, styles.colDate]}>{t('heat.repeatHeatDate')}</Text>
            <Text style={[styles.cell, styles.headerCell, styles.colNotes]}>{t('heat.notes')}</Text>
          </View>
          <ScrollView>
            {records.length === 0 ? (
              <Text style={styles.empty}>{t('common.noData')}</Text>
            ) : (
              records.map((r, i) => (
                <View key={i} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
                  <Text style={[styles.cell, styles.colDate]}>{r.heatIdentificationDate || '-'}</Text>
                  <Text style={[styles.cell, styles.colDate]}>{r.conceptionDate || '-'}</Text>
                  <Text style={[styles.cell, styles.colDate]}>{r.repeatHeatDate || '-'}</Text>
                  <Text style={[styles.cell, styles.colNotes]}>{r.notes || '-'}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('heat.addRecord')}</Text>
            <ScrollView>
              <Text style={styles.label}>{t('cow.cowId')} *</Text>
              <TextInput style={styles.modalInput} value={cowId} onChangeText={setCowId} placeholder="C001" autoCapitalize="characters" />

              <Text style={styles.label}>{t('heat.heatIdentification')} *</Text>
              <TextInput style={styles.modalInput} value={fHeat} onChangeText={setFHeat} placeholder="YYYY-MM-DD" />

              <Text style={styles.label}>{t('heat.conception')}</Text>
              <TextInput style={styles.modalInput} value={fConception} onChangeText={setFConception} placeholder="YYYY-MM-DD" />

              <Text style={styles.label}>{t('heat.repeatHeatDate')}</Text>
              <TextInput style={styles.modalInput} value={fRepeat} onChangeText={setFRepeat} placeholder="YYYY-MM-DD" />
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
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E8E8E8', backgroundColor: '#fff' },
  rowAlt: { backgroundColor: '#FAFAFA' },
  headerRow: { backgroundColor: '#C2185B', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  cell: { paddingVertical: 12, paddingHorizontal: 10, fontSize: 13, color: '#333' },
  headerCell: { color: '#fff', fontWeight: '700', fontSize: 12 },
  colDate: { width: 130 },
  colNotes: { width: 160 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999', width: 550 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#C2185B', alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4, marginTop: 10 },
  modalInput: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  autoHint: { fontSize: 12, color: '#C2185B', marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#EEEEEE', alignItems: 'center' },
  cancelText: { color: '#666', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#C2185B', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
});
