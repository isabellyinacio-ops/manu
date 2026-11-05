import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../src/services/api';
import QRCodeScannerModal from '../src/components/QRCodeScannerModal';

export default function ExitScreen({ navigation }) {
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleReadQRCode = async (data) => {
    setIsScannerOpen(false);
    try {
      const response = await api.get(`/produto/code/${data}`);
      setProduct(response.data);
      Alert.alert('Sucesso', `Produto "${response.data.name}" encontrado!`);
    } catch (error) {
      Alert.alert('Não encontrado', 'Nenhum produto cadastrado com este código.');
    }
  };

  const handleConfirmExit = async () => {
    if (!product) {
      Alert.alert('Aviso', 'Escaneie um produto via QR Code primeiro.');
      return;
    }

    const qtyNum = Number(quantity);
    if (!quantity || isNaN(qtyNum) || qtyNum <= 0) {
      Alert.alert('Erro', 'Insira uma quantidade válida.');
      return;
    }

    if (qtyNum > product.stock) {
      Alert.alert('Erro', 'Quantidade solicitada é maior que o estoque atual.');
      return;
    }

    try {
      await api.post('/stock/move', {
        productId: product.id,
        type: 'Saída',
        quantity: qtyNum,
      });

      Alert.alert('Sucesso', 'Saída realizada com sucesso!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    } catch (error) {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao registrar saída.');
    }
  };

  const remainingStock = (product?.stock || 0) - Number(quantity || 0);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Saída de Estoque</Text>

      <TouchableOpacity style={styles.qrButton} onPress={() => setIsScannerOpen(true)}>
        <Ionicons name="qr-code-outline" size={28} color="#fff" />
        <Text style={styles.qrText}>Escanear Produto</Text>
      </TouchableOpacity>

      {product ? (
        <View style={styles.productCard}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.stock}>Estoque Atual: {product.stock}</Text>
        </View>
      ) : (
        <View style={[styles.productCard, { alignItems: 'center' }]}>
          <Text style={{ color: '#94A3B8' }}>Aguardando leitura do QR Code...</Text>
        </View>
      )}

      <Text style={styles.label}>Quantidade de Saída</Text>

      <TextInput
        style={styles.input}
        placeholder="Digite a quantidade"
        placeholderTextColor="#94A3B8"
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
      />

      <View style={styles.resultCard}>
        <Text style={styles.resultText}>Estoque Restante</Text>
        <Text style={styles.resultValue}>{remainingStock < 0 ? 0 : remainingStock}</Text>
      </View>

      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmExit}>
        <Ionicons name="remove-circle" size={24} color="#fff" />
        <Text style={styles.confirmText}>Confirmar Saída</Text>
      </TouchableOpacity>

      <QRCodeScannerModal
        visible={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onReadCode={handleReadQRCode}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f2a1c', padding: 20 },
  title: { color: '#fff', fontSize: 30, fontWeight: 'bold', marginTop: 50, marginBottom: 30 },
  qrButton: { backgroundColor: '#D18B73', height: 70, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  qrText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  productCard: { backgroundColor: '#1e3b2a', borderRadius: 22, padding: 25, marginTop: 30 },
  productName: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  stock: { color: '#FCA5A5', marginTop: 10, fontWeight: 'bold' },
  label: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 35, marginBottom: 15 },
  input: { backgroundColor: '#1e3b2a', height: 65, borderRadius: 18, paddingHorizontal: 20, color: '#fff', fontSize: 18 },
  resultCard: { backgroundColor: '#5a3c32', borderRadius: 22, padding: 25, marginTop: 30, alignItems: 'center' },
  resultText: { color: '#ffc0aa', fontSize: 16 },
  resultValue: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginTop: 10 },
  confirmButton: { backgroundColor: '#D18B73', height: 65, borderRadius: 22, marginTop: 35, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  confirmText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});