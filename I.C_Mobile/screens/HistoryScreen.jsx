import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../src/services/api';

export default function HistoryScreen() {
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState([]);

  const loadHistory = async () => {
    try {
      const response = await api.get('/history');
      setHistory(response.data);
    } catch (error) {
      console.log('Erro ao carregar histórico:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const entriesCount = history.filter((h) => h.type === 'Entrada').length;
  const exitsCount = history.filter((h) => h.type === 'Saída').length;

  const filteredHistory = history.filter(
    (item) =>
      item.product.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Histórico</Text>
          <Text style={styles.subtitle}>Movimentações do estoque</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="calendar-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={22} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar movimentações..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsCardGreen}>
          <Ionicons name="arrow-down-circle" size={24} color="#22C55E" />
          <Text style={styles.statsNumber}>{entriesCount}</Text>
          <Text style={styles.statsLabel}>Entradas</Text>
        </View>

        <View style={styles.statsCardRed}>
          <Ionicons name="arrow-up-circle" size={24} color="#EF4444" />
          <Text style={styles.statsNumber}>{exitsCount}</Text>
          <Text style={styles.statsLabel}>Saídas</Text>
        </View>
      </View>

      <FlatList
        data={filteredHistory}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: item.type === 'Entrada' ? '#052E16' : '#450A0A' },
              ]}
            >
              <Ionicons
                name={item.type === 'Entrada' ? 'arrow-down-circle' : 'arrow-up-circle'}
                size={30}
                color={item.type === 'Entrada' ? '#22C55E' : '#EF4444'}
              />
            </View>

            <View style={styles.info}>
              <View style={styles.topRow}>
                <Text style={styles.product}>{item.product}</Text>
                <Text
                  style={[
                    styles.type,
                    { color: item.type === 'Entrada' ? '#86EFAC' : '#FCA5A5' },
                  ]}
                >
                  {item.type}
                </Text>
              </View>

              <View style={styles.detailsRow}>
                <Text style={styles.quantity}>Quantidade: {item.quantity}</Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
              <Text style={styles.hour}>{item.hour}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', paddingHorizontal: 20 },
  header: { marginTop: 55, marginBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', marginTop: 5, fontSize: 15 },
  filterButton: { width: 52, height: 52, backgroundColor: '#1E293B', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { backgroundColor: '#1E293B', height: 62, borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 25 },
  searchInput: { flex: 1, marginLeft: 10, color: '#fff', fontSize: 16 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statsCardGreen: { width: '48%', backgroundColor: '#052E16', borderRadius: 24, padding: 20 },
  statsCardRed: { width: '48%', backgroundColor: '#450A0A', borderRadius: 24, padding: 20 },
  statsNumber: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 12 },
  statsLabel: { color: '#CBD5E1', marginTop: 6 },
  card: { backgroundColor: '#1E293B', borderRadius: 24, padding: 18, marginBottom: 18, flexDirection: 'row' },
  iconContainer: { width: 65, height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  product: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 10 },
  type: { fontSize: 14, fontWeight: 'bold' },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  quantity: { color: '#CBD5E1', fontSize: 14 },
  date: { color: '#94A3B8', fontSize: 13 },
  hour: { color: '#64748B', marginTop: 8, fontSize: 13 },
});