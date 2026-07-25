import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  onScan: (tagId: string) => void;
  onClose: () => void;
}

export default function PashuAadharScanner({ visible, onScan, onClose }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const cleaned = data.replace(/\D/g, '');
    if (cleaned.length >= 12 && cleaned.length <= 16) {
      onScan(cleaned);
    } else {
      Alert.alert(
        'Invalid Tag',
        `Scanned "${data}" — expected 12-16 digit Pashu Aadhar number.`,
        [{ text: 'OK', onPress: () => setScanned(false) }],
      );
    }
  };

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.centered}>
          <Text style={styles.text}>Requesting camera permission...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.centered}>
          <Text style={styles.text}>No camera access. Grant permission in Settings to scan tags.</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{t('common.close') || 'Close'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['code128', 'code39', 'code93', 'ean13', 'ean8', 'itf14', 'pdf417', 'qr', 'aztec'],
          }}
        >
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Align barcode with frame</Text>
          </View>
        </CameraView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          {scanned && (
            <TouchableOpacity
              style={styles.rescanBtn}
              onPress={() => setScanned(false)}>
              <Text style={styles.rescanText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 24 },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center',
  },
  overlayText: { color: '#fff', fontSize: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  footer: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 20,
  },
  cancelBtn: { backgroundColor: '#C62828', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  cancelText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  rescanBtn: { backgroundColor: '#1565C0', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  rescanText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  closeBtn: { backgroundColor: '#2E7D32', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
