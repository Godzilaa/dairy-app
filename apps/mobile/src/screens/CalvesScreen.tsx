import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { localCalves } from '../services/database';
import { COLORS, SHADOWS, RADIUS } from '../theme';

export default function CalvesScreen() {
  const { t } = useTranslation();
  const [calves, setCalves] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [breed, setBreed] = useState('');
  const [father, setFather] = useState('');
  const [mother, setMother] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setCalves((await localCalves.getAll()) || []); } catch {}
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setName(''); setPhoto(null); setBreed(''); setFather(''); setMother(''); setDob(''); setGender('');
  };

  const openAdd = () => { resetForm(); setModalVisible(true); };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setName(item.name || ''); setPhoto(item.photo || null); setBreed(item.breed || '');
    setFather(item.father || ''); setMother(item.mother || ''); setDob(item.dob || '');
    setGender(item.gender || '');
    setModalVisible(true);
  };

  const pickPhoto = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', `Please allow ${fromCamera ? 'camera' : 'photo'} access.`); return; }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
      if (!result.canceled && result.assets?.[0]?.uri) setPhoto(result.assets[0].uri);
    } catch (err: any) { Alert.alert('Error', err.message); }
  };

  const choosePhoto = () => {
    Alert.alert(t('cow.photo'), undefined, [
      { text: t('cow.takePhoto'), onPress: () => pickPhoto(true) },
      { text: t('cow.choosePhoto'), onPress: () => pickPhoto(false) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Calf name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        photo: photo || undefined,
        breed: breed || undefined,
        father: father || undefined,
        mother: mother || undefined,
        dob: dob || undefined,
        gender: gender || undefined,
      };
      if (editingId) await localCalves.update(editingId, payload);
      else await localCalves.create(payload);
      setModalVisible(false);
      resetForm();
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert(t('common.delete'), 'Delete this calf?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await localCalves.delete(editingId);
            setModalVisible(false);
            resetForm();
            await load();
          } catch (err: any) { Alert.alert('Error', err.message); }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
      {item.photo ? (
        <Image source={{ uri: item.photo }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbPlaceholder}><MaterialCommunityIcons name="cow" size={28} color="#A5D6A7" /></View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        {item.gender ? <Text style={styles.detail}>{t('calves.gender')}: {item.gender}</Text> : null}
        {item.breed ? <Text style={styles.detail}>{t('cow.breed')}: {item.breed}</Text> : null}
        <Text style={styles.detail}>{t('calves.father')}: {item.father || '-'}</Text>
        <Text style={styles.detail}>{t('calves.mother')}: {item.mother || '-'}</Text>
        {item.dob ? <Text style={styles.detail}>{t('calves.dob')}: {item.dob}</Text> : null}
      </View>
      <MaterialIcons name="edit" size={18} color="#bbb" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={calves}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>{t('common.noData')}</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? t('calves.editCalf') : t('calves.addCalf')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              <TouchableOpacity style={styles.photoPicker} onPress={choosePhoto}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <MaterialIcons name="add-a-photo" size={32} color="#1B5E20" />
                    <Text style={styles.photoHint}>{t('cow.addPhoto')}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>{t('calves.name')} *</Text>
              <TextInput style={styles.modalInput} value={name} onChangeText={setName} placeholder="Calf name" />

              <Text style={styles.label}>{t('calves.father')}</Text>
              <TextInput style={styles.modalInput} value={father} onChangeText={setFather} placeholder="Sire / father" />

              <Text style={styles.label}>{t('calves.mother')}</Text>
              <TextInput style={styles.modalInput} value={mother} onChangeText={setMother} placeholder="Dam / mother" />

              <Text style={styles.label}>{t('calves.dob')}</Text>
              <TextInput style={styles.modalInput} value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />

              <Text style={styles.label}>{t('cow.breed')}</Text>
              <TextInput style={styles.modalInput} value={breed} onChangeText={setBreed} placeholder="Gir, Malnadgidda, etc." />

              <Text style={styles.label}>{t('calves.gender')}</Text>
              <View style={styles.chips}>
                {['Female', 'Male'].map((g) => (
                  <TouchableOpacity key={g} style={[styles.chip, gender === g && styles.chipActive]} onPress={() => setGender(g)}>
                    <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
  card: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  thumb: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, borderColor: '#1B5E20' },
  thumbPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  detail: { fontSize: 14, color: '#555', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 48, color: COLORS.textMuted },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.soft,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%', ...SHADOWS.card },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  photoPicker: { alignSelf: 'center', marginBottom: 8 },
  photo: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#1B5E20' },
  photoPlaceholder: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F5E9',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#A5D6A7', borderStyle: 'dashed',
  },
  photoHint: { fontSize: 11, color: '#1B5E20', marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4, marginTop: 10 },
  modalInput: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 12, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: '#EEEEEE' },
  chipActive: { backgroundColor: '#1B5E20' },
  chipText: { fontSize: 13, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#EEEEEE', alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.soft },
  saveText: { color: '#fff', fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 12, marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  deleteText: { color: '#C62828', fontWeight: '600' },
});
