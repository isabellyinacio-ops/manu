
import React, { useState, useCallback } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import api from '../src/services/api';

export default function HomeScreen({
  navigation,
  route,
  usuarioId: usuarioIdProp,
  user: userProp,
}) {
  // Recupera o usuário que fez login.
  const user =
    userProp ??
    route?.params?.user ??
    global.usuarioLogado;

  const usuarioId =
    usuarioIdProp ??
    route?.params?.usuarioId ??
    user?.id ??
    global.usuarioLogado?.id;

  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    totalQuantity: 0,
    totalValue: 0,
    recentActivities: [],
  });

  const [loading, setLoading] = useState(true);

  // Busca os dados do banco pela API.
  const loadDashboard = useCallback(async () => {
    if (!usuarioId) {
      console.log('ID do usuário não encontrado.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await api.get(
        `/dashboard/${usuarioId}`
      );

      console.log('Dados do dashboard:', response.data);

      setDashboardData({
        totalProducts: Number(
          response.data.totalProducts ?? 0
        ),
        lowStockCount: Number(
          response.data.lowStockCount ?? 0
        ),
        totalQuantity: Number(
          response.data.totalQuantity ?? 0
        ),
        totalValue: Number(
          response.data.totalValue ?? 0
        ),
        recentActivities:
          response.data.recentActivities ?? [],
      });
    } catch (error) {
      console.log(
        'Erro ao carregar dashboard:',
        error.response?.data ?? error.message
      );
    } finally {
      setLoading(false);
    }
  }, [usuarioId]);

  // Atualiza os dados quando a tela recebe o foco.
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>
            Bem-vindo
          </Text>

          <Text style={styles.userName}>
            {user?.usuario ?? 'Sistema de Estoque'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.notification}
          onPress={loadDashboard}
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Cartão principal */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>
          Produtos cadastrados
        </Text>

        {loading ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <Text style={styles.balanceValue}>
            {dashboardData.totalProducts}
          </Text>
        )}

        <View style={styles.balanceFooter}>
          <Ionicons
            name="trending-up"
            size={18}
            color="#22C55E"
          />

          <Text style={styles.balanceGrowth}>
            Dados do banco de dados
          </Text>
        </View>
      </View>

      {/* Indicadores */}
      <View style={styles.cardsContainer}>
        <View style={styles.smallCard}>
          <View style={styles.iconBlue}>
            <Ionicons
              name="cube"
              size={24}
              color="#3B82F6"
            />
          </View>

          <Text style={styles.cardNumber}>
            {dashboardData.totalQuantity}
          </Text>

          <Text style={styles.cardLabel}>
            Unidades em estoque
          </Text>
        </View>

        <View style={styles.smallCard}>
          <View style={styles.iconRed}>
            <Ionicons
              name="alert-circle"
              size={24}
              color="#EF4444"
            />
          </View>

          <Text style={styles.cardNumber}>
            {dashboardData.lowStockCount}
          </Text>

          <Text style={styles.cardLabel}>
            Produtos com estoque baixo
          </Text>
        </View>
      </View>

      {/* Valor do estoque */}
      <View style={styles.valueCard}>
        <Text style={styles.valueLabel}>
          Valor total do estoque
        </Text>

        <Text style={styles.valueNumber}>
          {dashboardData.totalValue.toLocaleString(
            'pt-BR',
            {
              style: 'currency',
              currency: 'BRL',
            }
          )}
        </Text>
      </View>

      {/* Operações */}
      <Text style={styles.sectionTitle}>
        Operações
      </Text>

      <TouchableOpacity
        style={styles.actionButtonBlue}
        onPress={() => navigation.navigate('Produtos')}
      >
        <View style={styles.buttonContent}>
          <Ionicons
            name="cube-outline"
            size={26}
            color="#fff"
          />

          <View>
            <Text style={styles.buttonTitle}>
              Produtos
            </Text>

            <Text style={styles.buttonSubtitle}>
              Visualizar estoque completo
            </Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={22}
          color="#fff"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButtonGreen}
        onPress={() => navigation.navigate('Entrada')}
      >
        <View style={styles.buttonContent}>
          <Ionicons
            name="arrow-down-circle-outline"
            size={26}
            color="#fff"
          />

          <View>
            <Text style={styles.buttonTitle}>
              Entrada de Estoque
            </Text>

            <Text style={styles.buttonSubtitle}>
              Registrar novas entradas
            </Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={22}
          color="#fff"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButtonRed}
        onPress={() => navigation.navigate('Saída')}
      >
        <View style={styles.buttonContent}>
          <Ionicons
            name="arrow-up-circle-outline"
            size={26}
            color="#fff"
          />

          <View>
            <Text style={styles.buttonTitle}>
              Saída de Estoque
            </Text>

            <Text style={styles.buttonSubtitle}>
              Registrar retiradas
            </Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={22}
          color="#fff"
        />
      </TouchableOpacity>

      {/* Atividades recentes */}
      <Text style={styles.sectionTitle}>
        Atividades Recentes
      </Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#22C55E"
        />
      ) : dashboardData.recentActivities.length === 0 ? (
        <View style={styles.activityCard}>
          <Text style={styles.emptyText}>
            Nenhuma movimentação registrada.
          </Text>
        </View>
      ) : (
        dashboardData.recentActivities.map((item) => {
          const isEntrada = item.tipo === 'Entrada';

          return (
            <View
              key={item.id}
              style={styles.activityCard}
            >
              <Ionicons
                name={
                  isEntrada
                    ? 'checkmark-circle'
                    : 'remove-circle'
                }
                size={22}
                color={isEntrada ? '#22C55E' : '#EF4444'}
              />

              <View style={styles.activityDetails}>
                <Text style={styles.activityText}>
                  {item.tipo} de {item.quantidade}{' '}
                  {item.produto}
                </Text>

                {item.data ? (
                  <Text style={styles.activityDate}>
                    {item.data}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingHorizontal: 20,
  },

  header: {
    marginTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  welcome: {
    color: '#94A3B8',
    fontSize: 15,
  },

  userName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 3,
  },

  notification: {
    width: 50,
    height: 50,
    backgroundColor: '#1E293B',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  balanceCard: {
    backgroundColor: '#2563EB',
    borderRadius: 30,
    padding: 25,
    marginTop: 30,
  },

  balanceLabel: {
    color: '#DBEAFE',
    fontSize: 16,
  },

  balanceValue: {
    color: '#fff',
    fontSize: 42,
    fontWeight: 'bold',
    marginTop: 10,
  },

  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  balanceGrowth: {
    color: '#DCFCE7',
    marginLeft: 6,
    fontWeight: '600',
  },

  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },

  smallCard: {
    backgroundColor: '#1E293B',
    width: '48%',
    borderRadius: 22,
    padding: 20,
  },

  iconBlue: {
    width: 50,
    height: 50,
    backgroundColor: '#172554',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  iconRed: {
    width: 50,
    height: 50,
    backgroundColor: '#450A0A',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardNumber: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 15,
  },

  cardLabel: {
    color: '#94A3B8',
    marginTop: 5,
  },

  valueCard: {
    backgroundColor: '#1E293B',
    borderRadius: 22,
    padding: 20,
    marginTop: 20,
  },

  valueLabel: {
    color: '#94A3B8',
    fontSize: 15,
  },

  valueNumber: {
    color: '#22C55E',
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 10,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 35,
    marginBottom: 18,
  },

  actionButtonBlue: {
    backgroundColor: '#2563EB',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  actionButtonGreen: {
    backgroundColor: '#16A34A',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  actionButtonRed: {
    backgroundColor: '#DC2626',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },

  buttonTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  buttonSubtitle: {
    color: '#E2E8F0',
    marginTop: 3,
    fontSize: 13,
  },

  activityCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  activityDetails: {
    flex: 1,
  },

  activityText: {
    color: '#fff',
    fontSize: 15,
  },

  activityDate: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 5,
  },

  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
