import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { localCows } from '../services/database';
import { lookupPashuAadhar } from '../services/pashuAadharApi';
import PashuAadharScanner from '../components/PashuAadharScanner';
import DateField from '../components/DateField';

export default function CowFormScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editCow = route.params?.cow;

  const [name, setName] = useState(editCow?.name || '');
  const [breed, setBreed] = useState(editCow?.breed || '');
  const [pashuAadhar, setPashuAadhar] = useState(editCow?.pashuAadhar || '');
  const [dob, setDob] = useState(editCow?.dob || '');
  const [mother, setMother] = useState(editCow?.mother || '');
  const [father, setFather] = useState(editCow?.father || '');
  const [method, setMethod] = useState(editCow?.registrationMethod || '');
  const [cowId, setCowId] = useState(editCow?.cowId || '');
  const [photo, setPhoto] = useState<string | null>(editCow?.photo || null);
  const [status, setStatus] = useState(editCow?.status || 'Active');
  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    if (!editCow) {
      localCows.getNextId().then((id) => setCowId(id)).catch(() => {});
    }
  }, []);

  const handleScan = async (tagId: string) => {
    setScannerVisible(false);
    setPashuAadhar(tagId);
    setLookingUp(true);

    try {
      const data = await lookupPashuAadhar(tagId);
      if (data) {
        if (data.breed && !breed) setBreed(data.breed);
        if (data.name && !name) setName(data.name);
        if (data.dob && !dob) setDob(data.dob);
        if (data.species) {
          Alert.alert('Found', `${data.species} - ${data.breed || ''}\nOwner: ${data.ownerName || 'Unknown'}`);
        }
      }
    } catch {} finally {
      setLookingUp(false);
    }
  };

  const pickPhoto = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', `Please allow ${fromCamera ? 'camera' : 'photo'} access.`);
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhoto(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const choosePhoto = () => {
    Alert.alert(t('cow.photo'), undefined, [
      { text: t('cow.takePhoto'), onPress: () => pickPhoto(true) },
      { text: t('cow.choosePhoto'), onPress: () => pickPhoto(false) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleDelete = () => {
    if (!editCow) return;
    Alert.alert(t('cow.deleteCow'), t('cow.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await localCows.delete(editCow.id);
            navigation.navigate('Main', { screen: 'Cows' });
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!name || !breed) {
      Alert.alert('Error', 'Name and breed are required');
      return;
    }
    setLoading(true);
    try {
      const data = {
        cowId,
        name,
        breed,
        photo: photo || undefined,
        status,
        pashuAadhar: pashuAadhar || undefined,
        dob: dob || undefined,
        mother: mother || undefined,
        father: father || undefined,
        registrationMethod: method || undefined,
      };
      if (editCow) {
        await localCows.update(editCow.id, data);
      } else {
        await localCows.create(data);
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <MaterialIcons name="add-circle-outline" size={24} color="#1B5E20" />
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>{editCow ? 'Edit Cow' : 'Register Cow'}</Text>
      </View>
      <TouchableOpacity style={styles.photoPicker} onPress={choosePhoto}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <MaterialIcons name="add-a-photo" size={36} color="#1B5E20" />
            <Text style={styles.photoHint}>{t('cow.addPhoto')}</Text>
          </View>
        )}
      </TouchableOpacity>
      {photo && (
        <TouchableOpacity onPress={choosePhoto}>
          <Text style={styles.changePhoto}>{t('cow.changePhoto')}</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>{t('cow.cowId')}</Text>
      <TextInput style={styles.input} value={cowId} editable={false} />

      <Text style={styles.label}>{t('cow.name')} *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>{t('cow.breed')} *</Text>
      <TextInput style={styles.input} value={breed} onChangeText={setBreed} placeholder="Gir, Malnadgidda, etc." />

      <Text style={styles.label}>{t('cow.pashuAadhar')}</Text>
      <View style={styles.tagRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={pashuAadhar}
          onChangeText={setPashuAadhar}
          placeholder="12-16 digit tag number"
          maxLength={16}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => setScannerVisible(true)}>
          <Text style={styles.scanBtnText}>{t('cow.scanTag')}</Text>
        </TouchableOpacity>
      </View>
      {lookingUp && <Text style={styles.hint}>Looking up tag in national database...</Text>}
      {pashuAadhar.length >= 12 && (
        <TouchableOpacity
          style={styles.lookupBtn}
          onPress={async () => {
            setLookingUp(true);
            try {
              const data = await lookupPashuAadhar(pashuAadhar);
              if (data) {
                if (data.breed && !breed) setBreed(data.breed);
                if (data.name && !name) setName(data.name);
              }
            } catch {} finally {
              setLookingUp(false);
            }
          }}>
          <Text style={styles.lookupBtnText}>{t('common.search') || 'Lookup'}</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>{t('cow.dob')}</Text>
      <DateField value={dob} onChange={setDob} style={styles.input} />

      <Text style={styles.label}>{t('cow.mother')}</Text>
      <TextInput style={styles.input} value={mother} onChangeText={setMother} />

      <Text style={styles.label}>{t('cow.father')}</Text>
      <TextInput style={styles.input} value={father} onChangeText={setFather} />

      {/* Registration method is a create-time field — hidden when editing. */}
      {!editCow && (
        <>
          <Text style={styles.label}>{t('cow.registrationMethod')}</Text>
          <TextInput style={styles.input} value={method} onChangeText={setMethod} placeholder="AI / NATURAL" />
        </>
      )}

      <Text style={styles.label}>{t('cow.status')}</Text>
      <View style={styles.statusRow}>
        {/* "Active" is dropped in edit mode — use a concrete lifecycle status instead. */}
        {(editCow ? ['Milking', 'Dry', 'Sold', 'Deceased'] : ['Active', 'Milking', 'Dry', 'Sold', 'Deceased']).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.statusChip, status === s && styles.statusChipActive]}
            onPress={() => setStatus(s)}>
            <Text style={[styles.statusChipText, status === s && styles.statusChipTextActive]}>
              {t(`cow.${s.toLowerCase()}`) || s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('common.save')}</Text>}
      </TouchableOpacity>

      {editCow && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={loading}>
          <MaterialIcons name="delete-outline" size={20} color="#C62828" />
          <Text style={styles.deleteBtnText}>{t('cow.deleteCow')}</Text>
        </TouchableOpacity>
      )}

      <PashuAadharScanner
        visible={scannerVisible}
        onScan={handleScan}
        onClose={() => setScannerVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0',
  },
  photoPicker: { alignSelf: 'center', marginBottom: 8 },
  photo: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#1B5E20' },
  photoPlaceholder: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#E8F5E9',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#A5D6A7', borderStyle: 'dashed',
  },
  photoHint: { fontSize: 11, color: '#1B5E20', marginTop: 4 },
  changePhoto: { textAlign: 'center', color: '#1565C0', fontSize: 13, marginBottom: 8, fontWeight: '600' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  statusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#EEEEEE' },
  statusChipActive: { backgroundColor: '#1B5E20' },
  statusChipText: { fontSize: 13, color: '#555' },
  statusChipTextActive: { color: '#fff', fontWeight: '600' },
  tagRow: { flexDirection: 'row', gap: 10 },
  scanBtn: {
    backgroundColor: '#1565C0', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center',
  },
  scanBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  hint: { fontSize: 12, color: '#1565C0', marginTop: 4 },
  lookupBtn: {
    backgroundColor: '#E3F2FD', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8,
  },
  lookupBtnText: { color: '#1565C0', fontSize: 14, fontWeight: '600' },
  button: {
    backgroundColor: '#1B5E20', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center',
    borderRadius: 12, padding: 14, marginTop: 12, marginBottom: 48,
    borderWidth: 1, borderColor: '#EF9A9A', backgroundColor: '#FFEBEE',
  },
  deleteBtnText: { color: '#C62828', fontSize: 16, fontWeight: '600' },
});
