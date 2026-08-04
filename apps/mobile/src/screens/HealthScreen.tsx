import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal, ScrollView, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { localHealth, localVaccines } from '../services/database';

const today = () => new Date().toISOString().split('T')[0];

// Add N months to a YYYY-MM-DD string, returning YYYY-MM-DD.
const addMonths = (iso: string, months: number): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

type Mode = 'vaccination' | 'treatment';

export default function HealthScreen() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);
  const [cowId, setCowId] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue'>('all');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('vaccination');
  const [vaccines, setVaccines] = useState<string[]>(localVaccines.DEFAULTS);

  // shared form fields
  const [fCowId, setFCowId] = useState('');
  const [fDate, setFDate] = useState(today());
  const [fNotes, setFNotes] = useState('');
  // vaccination fields
  const [fVaccine, setFVaccine] = useState('');
  const [fCustomVaccine, setFCustomVaccine] = useState('');
  const [fNextDue, setFNextDue] = useState('');
  // treatment fields
  const [fMedicine, setFMedicine] = useState('');
  const [fPeriod, setFPeriod] = useState('');
  const [fTreatmentMode, setFTreatmentMode] = useState('');
  const [fMedicinesGiven, setFMedicinesGiven] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRecords = async () => {
    try {
      let data;
      if (filter === 'upcoming') data = await localHealth.getUpcoming(30);
      else if (filter === 'overdue') data = await localHealth.getOverdue();
      else data = await localHealth.getAll(cowId || undefined);
      setRecords(data || []);
    } catch {}
  };

  const loadVaccines = async () => {
    try {
      const custom = await localVaccines.getCustom();
      setVaccines([...localVaccines.DEFAULTS, ...custom]);
    } catch {}
  };

  useEffect(() => { loadRecords(); }, [cowId, filter]);
  useEffect(() => { loadVaccines(); }, []);

  // Deworming is due again 3 months after administration — auto-suggest the next due date.
  useEffect(() => {
    if (mode === 'vaccination' && fVaccine === 'Deworming' && fDate) {
      setFNextDue(addMonths(fDate, 3));
    }
  }, [fVaccine, fDate, mode]);

  const resetForm = () => {
    setEditingId(null);
    setFCowId(''); setFDate(today()); setFNotes('');
    setFVaccine(''); setFCustomVaccine(''); setFNextDue('');
    setFMedicine(''); setFPeriod(''); setFTreatmentMode(''); setFMedicinesGiven('');
  };

  const openModal = () => { resetForm(); setMode('vaccination'); setModalVisible(true); };

  const openEdit = (item: any) => {
    resetForm();
    setEditingId(item.id);
    setFCowId(item.cowId || '');
    setFDate(item.date || '');
    setFNotes(item.notes || '');
    if (item.recordType === 'treatment') {
      setMode('treatment');
      setFMedicine(item.medicineName || '');
      setFPeriod(item.treatmentPeriod || '');
      setFTreatmentMode(item.treatmentMode || '');
      setFMedicinesGiven(item.medicinesGiven || '');
    } else {
      setMode('vaccination');
      setFVaccine(item.vaccinationType || '');
      setFNextDue(item.nextDueDate || '');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!fCowId.trim()) { Alert.alert('Error', 'Cow ID is required'); return; }
    setSaving(true);
    try {
      if (mode === 'vaccination') {
        const vaccineName = (fCustomVaccine.trim() || fVaccine).trim();
        if (!vaccineName) { Alert.alert('Error', 'Select or enter a vaccine'); setSaving(false); return; }
        if (fCustomVaccine.trim()) await localVaccines.addCustom(fCustomVaccine.trim());
        const payload = {
          cowId: fCowId.trim(),
          recordType: 'vaccination',
          vaccinationType: vaccineName,
          date: fDate || undefined,
          nextDueDate: fNextDue || undefined,
          notes: fNotes || undefined,
        };
        if (editingId) await localHealth.update(editingId, payload);
        else await localHealth.create(payload);
      } else {
        if (!fMedicine.trim()) { Alert.alert('Error', 'Medicine name is required'); setSaving(false); return; }
        const payload = {
          cowId: fCowId.trim(),
          recordType: 'treatment',
          vaccinationType: 'Treatment',
          date: fDate || undefined,
          medicineName: fMedicine.trim(),
          treatmentPeriod: fPeriod || undefined,
          treatmentMode: fTreatmentMode || undefined,
          medicinesGiven: fMedicinesGiven || undefined,
          notes: fNotes || undefined,
        };
        if (editingId) await localHealth.update(editingId, payload);
        else await localHealth.create(payload);
      }
      setModalVisible(false);
      await loadRecords();
      await loadVaccines();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isTreatment = item.recordType === 'treatment';
    return (
      <TouchableOpacity style={[styles.card, isTreatment && styles.treatmentCard]} onPress={() => openEdit(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cowId}>{item.cowId}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.badge, isTreatment ? styles.badgeTreat : styles.badgeVacc]}>
              <Text style={styles.badgeText}>{isTreatment ? t('health.treatment') : t('health.vaccination')}</Text>
            </View>
            <MaterialIcons name="edit" size={15} color="#bbb" />
          </View>
        </View>
        <Text style={styles.type}>{isTreatment ? item.medicineName : item.vaccinationType}</Text>
        <Text style={styles.date}>
          {item.date ? `${t('health.date')}: ${item.date}` : t('health.notAdministered')}
          {item.nextDueDate ? ` | ${t('health.nextDueDate')}: ${item.nextDueDate}` : ''}
        </Text>
        {isTreatment && item.treatmentMode ? <Text style={styles.sub}>{t('health.treatmentMode')}: {item.treatmentMode}</Text> : null}
        {isTreatment && item.treatmentPeriod ? <Text style={styles.sub}>{t('health.treatmentPeriod')}: {item.treatmentPeriod}</Text> : null}
        {isTreatment && item.medicinesGiven ? <Text style={styles.sub}>{t('health.medicinesGiven')}: {item.medicinesGiven}</Text> : null}
        {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <MaterialIcons name="local-hospital" size={24} color="#2E7D32" />
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>{t('health.title')}</Text>
      </View>
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterActive]}
          onPress={() => setFilter('all')}>
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'upcoming' && styles.filterActive]}
          onPress={() => setFilter('upcoming')}>
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>{t('health.dueSoon')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'overdue' && styles.filterActive]}
          onPress={() => setFilter('overdue')}>
          <Text style={[styles.filterText, filter === 'overdue' && styles.filterTextActive]}>{t('health.overdue')}</Text>
        </TouchableOpacity>
      </View>
      {filter === 'all' && (
        <TextInput
          style={styles.input}
          placeholder="Filter by CowID"
          value={cowId}
          onChangeText={setCowId}
        />
      )}
      <FlatList
        data={records}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>{t('common.noData')}</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? t('health.editRecord') : t('health.addRecord')}</Text>

            {/* Mode toggle — record type is fixed while editing */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'vaccination' && styles.modeTabActive]}
                disabled={!!editingId}
                onPress={() => setMode('vaccination')}>
                <Text style={[styles.modeTabText, mode === 'vaccination' && styles.modeTabTextActive]}>{t('health.vaccination')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'treatment' && styles.modeTabActive]}
                disabled={!!editingId}
                onPress={() => setMode('treatment')}>
                <Text style={[styles.modeTabText, mode === 'treatment' && styles.modeTabTextActive]}>{t('health.treatment')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>{t('cow.cowId')} *</Text>
              <TextInput style={styles.modalInput} value={fCowId} onChangeText={setFCowId} placeholder="C001" autoCapitalize="characters" editable={!editingId} />

              {mode === 'vaccination' ? (
                <>
                  <Text style={styles.label}>{t('health.vaccinationType')} *</Text>
                  <View style={styles.chips}>
                    {vaccines.map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.chip, fVaccine === v && !fCustomVaccine && styles.chipActive]}
                        onPress={() => { setFVaccine(v); setFCustomVaccine(''); }}>
                        <Text style={[styles.chipText, fVaccine === v && !fCustomVaccine && styles.chipTextActive]}>{v}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.label}>{t('health.addOwnVaccine')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={fCustomVaccine}
                    onChangeText={(v) => { setFCustomVaccine(v); if (v) setFVaccine(''); }}
                    placeholder={t('health.vaccineNamePlaceholder')}
                  />

                  <Text style={styles.label}>{t('health.date')}</Text>
                  <TextInput style={styles.modalInput} value={fDate} onChangeText={setFDate} placeholder="YYYY-MM-DD" />

                  <Text style={styles.label}>{t('health.nextDueDate')}</Text>
                  <TextInput style={styles.modalInput} value={fNextDue} onChangeText={setFNextDue} placeholder="YYYY-MM-DD" />
                  {fVaccine === 'Deworming' && (
                    <Text style={styles.autoHint}>{t('health.dewormingAuto')}</Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.label}>{t('health.medicineName')} *</Text>
                  <TextInput style={styles.modalInput} value={fMedicine} onChangeText={setFMedicine} placeholder="e.g. Oxytetracycline" />

                  <Text style={styles.label}>{t('health.treatmentPeriod')}</Text>
                  <TextInput style={styles.modalInput} value={fPeriod} onChangeText={setFPeriod} placeholder="e.g. 5 days / 3 doses" />

                  <Text style={styles.label}>{t('health.treatmentMode')}</Text>
                  <TextInput style={styles.modalInput} value={fTreatmentMode} onChangeText={setFTreatmentMode} placeholder="Oral / Injection / IV / Topical" />

                  <Text style={styles.label}>{t('health.medicinesGiven')}</Text>
                  <TextInput style={[styles.modalInput, { height: 70 }]} value={fMedicinesGiven} onChangeText={setFMedicinesGiven} placeholder="Medicines administered" multiline />

                  <Text style={styles.label}>{t('health.date')}</Text>
                  <TextInput style={styles.modalInput} value={fDate} onChangeText={setFDate} placeholder="YYYY-MM-DD" />
                </>
              )}

              <Text style={styles.label}>{t('health.notes')}</Text>
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
  filters: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E0E0E0' },
  filterActive: { backgroundColor: '#2E7D32' },
  filterText: { fontSize: 13, color: '#666' },
  filterTextActive: { color: '#fff' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 1 },
  treatmentCard: { borderLeftWidth: 4, borderLeftColor: '#1565C0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cowId: { fontSize: 13, fontWeight: '600', color: '#666' },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
  badgeVacc: { backgroundColor: '#E8F5E9' },
  badgeTreat: { backgroundColor: '#E3F2FD' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#333' },
  type: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 4 },
  date: { fontSize: 13, color: '#666', marginTop: 4 },
  sub: { fontSize: 13, color: '#444', marginTop: 2 },
  notes: { fontSize: 12, color: '#999', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 48, color: '#999' },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  modeTabs: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', backgroundColor: '#E0E0E0', marginBottom: 8 },
  modeTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  modeTabActive: { backgroundColor: '#2E7D32' },
  modeTabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  modeTabTextActive: { color: '#fff' },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4, marginTop: 10 },
  modalInput: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  autoHint: { fontSize: 12, color: '#2E7D32', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#EEEEEE' },
  chipActive: { backgroundColor: '#2E7D32' },
  chipText: { fontSize: 13, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#EEEEEE', alignItems: 'center' },
  cancelText: { color: '#666', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#2E7D32', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
});
