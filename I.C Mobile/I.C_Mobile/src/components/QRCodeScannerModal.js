import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, Camera } from 'expo-camera';

export default function QRCodeScannerModal({ visible, onClose,
onReadCode }) {
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);

// Solicita permissão da câmera ao abrir o modal
useEffect(() =>{
    if (visible) {
        setScanned(false);
        (async ()=> {
         const { status } = await Camera.requestCameraPermissionsAsync();
         setHasPermission(status === 'granted');
    }   )();
}

}, [visible]);

const handleBarcodeScanned = ({ data }) => {
    setScanned(true);
    onReadCode(data); // Devolve o código lido para a tela pai
};

if (!visible) return null;

return (
    <Modal visible={visible} animationType="slide" transparent={false}>
    <View style={styles.container}>
     {hasPermission === false ? (
       <Text style={styles.text}>Sem acesso à câmera</Text>
    ) : (
        <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
    )}

    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
    <Text style={styles.closeText}>Fechar Câmera</Text>
    </TouchableOpacity>
    </View>
    </Modal>
    );
}

const styles = StyleSheet.create({
 container: { flex: 1, backgroundColor: '#000', justifyContent: 'flex-end',
alignItems: 'center' },
 text: { color: '#fff', fontSize: 18, marginBottom: 100 },
 closeBtn: { backgroundColor: '#DC2626', padding: 20, borderRadius: 15,
marginBottom: 40 },
 closeText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});