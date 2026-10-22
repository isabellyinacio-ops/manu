import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../src/services/api';

export default function SettingsScreen({ navigation }) {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [userData, setUserData] = useState({
    name: 'Carregando...',
    role: 'Operador de Estoque',
    email: 'carregando...',
  });

  // Busca dados do perfil ativo na API / MySQL ao carregar
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      // Busca dados do primeiro usuário (como exemplo ou autenticado)
      const response = await api.post('/login', {
        email: 'lucas@empresa.com',
        password: '123456',
      });
      if (response.data.success) {
        setUserData(response.data.user);
      }
    } catch (error) {
      console.log('Erro ao carregar dados do usuário:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair da Conta', 'Deseja realmente sair da aplicação?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          // Reseta a navegação e envia para a tela de Login
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Configurações</Text>
        <Text style={styles.subtitle}>Gerencie preferências do sistema</Text>
      </View>

      {/* PERFIL */}
      <View style={styles.profileCard}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1200&auto=format&fit=crop',
          }}
          style={styles.avatar}
        />

        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{userData.name}</Text>
          <Text style={styles.userRole}>{userData.role}</Text>
          <Text style={styles.userEmail}>{userData.email}</Text>
        </View>

        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* PREFERÊNCIAS */}
      <Text style={styles.sectionTitle}>Preferências</Text>

      <View style={styles.optionCard}>
        <View style={styles.optionLeft}>
          <View style={styles.iconBlue}>
            <Ionicons name="moon-outline" size={22} color="#3B82F6" />
          </View>
          <View>
            <Text style={styles.optionTitle}>Modo Escuro</Text>
            <Text style={styles.optionSubtitle}>Tema visual do aplicativo</Text>
          </View>
        </View>

        <Switch value={darkMode} onValueChange={setDarkMode} />
      </View>

      <View style={styles.optionCard}>
        <View style={styles.optionLeft}>
          <View style={styles.iconGreen}>
            <Ionicons name="notifications-outline" size={22} color="#22C55E" />
          </View>
          <View>
            <Text style={styles.optionTitle}>Notificações</Text>
            <Text style={styles.optionSubtitle}>Alertas do sistema</Text>
          </View>
        </View>

        <Switch value={notifications} onValueChange={setNotifications} />
      </View>

      {/* SEGURANÇA */}
      <Text style={styles.sectionTitle}>Conta e Segurança</Text>

      <TouchableOpacity style={styles.menuCard}>
        <View style={styles.menuLeft}>
          <View style={styles.iconPurple}>
            <Ionicons name="lock-closed-outline" size={22} color="#A855F7" />
          </View>
          <View>
            <Text style={styles.menuTitle}>Alterar Senha</Text>
            <Text style={styles.menuSubtitle}>Atualizar credenciais</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuCard}>
        <View style={styles.menuLeft}>
          <View style={styles.iconOrange}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#F97316" />
          </View>
          <View>
            <Text style={styles.menuTitle}>Privacidade</Text>
            <Text style={styles.menuSubtitle}>Configurações de acesso</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
      </TouchableOpacity>

      {/* LOGOUT */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#fff" />
        <Text style={styles.logoutText}>Sair da Conta</Text>
      </TouchableOpacity>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', paddingHorizontal: 20 },
  header: { marginTop: 55, marginBottom: 30 },
  title: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', marginTop: 5, fontSize: 15 },
  profileCard: { backgroundColor: '#1E293B', borderRadius: 28, padding: 22, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 22 },
  profileInfo: { flex: 1, marginLeft: 18 },
  userName: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  userRole: { color: '#3B82F6', marginTop: 5, fontWeight: '600' },
  userEmail: { color: '#94A3B8', marginTop: 6, fontSize: 14 },
  editButton: { width: 48, height: 48, backgroundColor: '#2563EB', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 35, marginBottom: 18 },
  optionCard: { backgroundColor: '#1E293B', borderRadius: 22, padding: 18, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionLeft: { flexDirection: 'row', alignItems: 'center' },
  optionTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  optionSubtitle: { color: '#94A3B8', marginTop: 4, fontSize: 13 },
  menuCard: { backgroundColor: '#1E293B', borderRadius: 22, padding: 18, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  menuSubtitle: { color: '#94A3B8', marginTop: 4, fontSize: 13 },
  iconBlue: { width: 50, height: 50, backgroundColor: '#172554', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  iconGreen: { width: 50, height: 50, backgroundColor: '#052E16', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  iconPurple: { width: 50, height: 50, backgroundColor: '#3B0764', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  iconOrange: { width: 50, height: 50, backgroundColor: '#431407', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  logoutButton: { backgroundColor: '#DC2626', height: 65, borderRadius: 22, marginTop: 35, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  logoutText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});