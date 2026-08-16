import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { localReminders } from '../services/database';
import DateField from '../components/DateField';
import TimeField from '../components/TimeField';
import { formatDate } from '../utils/date';
import { COLORS, SHADOWS, RADIUS } from '../theme';

const today = () => new Date().toISOString().split('T')[0];

export default function RemindersScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [fTitle, setFTitle] = useState('');
  const [fDetails, setFDetails] = useState('');
  const [fDate, setFDate] = useState(today());
  const [fTime, setFTime] = useState('');

  const load = async () => {
    try { setItems((await localReminders.getAll()) || []); } catch {}
  };
  useEffect(() => { load(); }, []);
  useFocusEffect(React.useCallback(() => { load(); }, []));

  const resetForm = () => { setEditingId(null); setFTitle(''); setFDetails(''); setFDate(today()); setFTime(''); };
  const openAdd = () => { resetForm(); setModalVisible(true); };
  const openEdit = (r: any) => {
    setEditingId(r.id);
    setFTitle(r.title || ''); setFDetails(r.details || '');
    setFDate(r.date || today()); setFTime(r.time || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!fTitle.trim()) { Alert.alert('Error', 'Title is required'); return; }
    setSaving(true);
    try {
      const payload = { title: fTitle.trim(), details: fDetails.trim() || undefined, date: fDate || undefined, time: fTime || undefined };
      if (editingId) await localReminders.update(editingId, payload);
      else await localReminders.create(payload);
      setModalVisible(false);
      resetForm();
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally { setSaving(false); }
  };

  const toggleDone = async (r: any) => {
    try { await localReminders.update(r.id, { ...r, done: r.done ? 0 : 1 }); await load(); } catch {}
  };

  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert(t('common.delete'), 'Delete this reminder?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          try { await localReminders.delete(editingId); setModalVisible(false); resetForm(); await load(); }
          catch (err: any) { Alert.alert('Error', err.message); }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const overdue = item.date && item.date < today() && !item.done;
    return (
      <View style={[styles.card, item.done && styles.cardDone]}>
        <TouchableOpacity onPress={() => toggleDone(item)} style={styles.check}>
          <MaterialIcons name={item.done ? 'check-circle' : 'radio-button-unchecked'} size={24} color={item.done ? '#43A047' : '#BDBDBD'} />
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => openEdit(item)}>
          <Text style={[styles.title, item.done && styles.strike]}>{item.title}</Text>
          {!!item.details && <Text style={styles.details}>{item.details}</Text>}
          <View style={styles.metaRow}>
            {!!item.date && (
              <View style={[styles.metaChip, overdue && styles.overdueChip]}>
                <MaterialIcons name="event" size={13} color={overdue ? '#C62828' : '#1B5E20'} />
                <Text style={[styles.metaText, overdue && styles.overdueText]}>{formatDate(item.date)}{item.time ? ` · ${item.time}` : ''}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <MaterialIcons name="edit" size={16} color="#ccc" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingBottom: 96 }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialIcons name="notifications-none" size={64} color="#C8E6C9" />
            <Text style={styles.emptyTitle}>{t('reminders.emptyTitle')}</Text>
            <Text style={styles.emptySub}>{t('reminders.emptySub')}</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editingId ? t('reminders.edit') : t('reminders.add')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>{t('reminders.reminderTitle')} *</Text>
              <TextInput style={styles.input} value={fTitle} onChangeText={setFTitle} placeholder="e.g. Buy feed, Vet visit" />

              <Text style={styles.label}>{t('reminders.details')}</Text>
              <TextInput style={[styles.input, { height: 70 }]} value={fDetails} onChangeText={setFDetails} placeholder="Optional notes" multiline />

              <Text style={styles.label}>{t('heat.date') || 'Date'}</Text>
              <DateField value={fDate} onChange={setFDate} style={styles.input} />

              <Text style={styles.label}>{t('reminders.time')}</Text>
              <TimeField value={fTime} onChange={setFTime} style={styles.input} />
            </ScrollView>
            <View style={styles.actions}>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  cardDone: { opacity: 0.6 },
  check: { padding: 2 },
  title: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  strike: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  details: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  metaText: { fontSize: 12, color: '#1B5E20', fontWeight: '600' },
  overdueChip: { backgroundColor: '#FFEBEE' },
  overdueText: { color: '#C62828' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#555', marginTop: 12 },
  emptySub: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.soft },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%', ...SHADOWS.card },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 12, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#EEEEEE', alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.soft },
  saveText: { color: '#fff', fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 12, marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  deleteText: { color: '#C62828', fontWeight: '600' },
});
