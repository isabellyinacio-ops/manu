import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../src/services/api';

export default function ExitScreen({ navigation }) {
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    api.get('/products/1').then(res => setProduct(res.data)).catch(console.log);
  }, []);

  const handleConfirmExit = async () => {
    const qtyNum = Number(quantity);
    if (!quantity || isNaN(qtyNum) || qtyNum <= 0) {
      Alert.alert('Erro', 'Insira uma quantidade válida.');
      return;
    }

    if (product && qtyNum > product.stock) {
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

      <TouchableOpacity style={styles.qrButton}>
        <Ionicons name="qr-code-outline" size={28} color="#fff" />
        <Text style={styles.qrText}>Escanear Produto</Text>
      </TouchableOpacity>

      {product && (
        <View style={styles.productCard}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.stock}>Estoque Atual: {product.stock}</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 20 },
  title: { color: '#fff', fontSize: 30, fontWeight: 'bold', marginTop: 50, marginBottom: 30 },
  qrButton: { backgroundColor: '#DC2626', height: 70, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  qrText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  productCard: { backgroundColor: '#1E293B', borderRadius: 22, padding: 25, marginTop: 30 },
  productName: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  stock: { color: '#FCA5A5', marginTop: 10, fontWeight: 'bold' },
  label: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 35, marginBottom: 15 },
  input: { backgroundColor: '#1E293B', height: 65, borderRadius: 18, paddingHorizontal: 20, color: '#fff', fontSize: 18 },
  resultCard: { backgroundColor: '#450A0A', borderRadius: 22, padding: 25, marginTop: 30, alignItems: 'center' },
  resultText: { color: '#FCA5A5', fontSize: 16 },
  resultValue: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginTop: 10 },
  confirmButton: { backgroundColor: '#DC2626', height: 65, borderRadius: 22, marginTop: 35, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  confirmText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});