
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../src/services/api';

export default function ProductsScreen({ route, usuarioId: usuarioIdProp, user }) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // O ID deve ser enviado pela navegação após o login.
  const usuarioId =
    route?.params?.usuarioId ??
    route?.params?.user?.id ??
    route?.params?.usuario?.id;

  const loadProducts = useCallback(async () => {
    if (!usuarioId) {
      setProducts([]);
      setErrorMessage(
        'ID do usuário não recebido. Verifique a navegação após o login.'
      );
      setLoading(false);
      console.log('Produtos: usuarioId não foi recebido na tela.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const response = await api.get('/products', {
        params: {
          usuarioId: usuarioId,
        },
      });

      // A API retorna uma lista de produtos com os nomes do banco MySQL.
      if (!Array.isArray(response.data)) {
        throw new Error('A API não retornou uma lista de produtos.');
      }

      setProducts(
        response.data.map((item) => ({
          ...item,
          name: item.nome ?? '',
          category: item.categoria_nome ?? 'Sem categoria',
          stock: Number(item.quantidade ?? 0),
          price: Number(item.preco_unitario ?? 0),
          code: item.codigo ?? null,
        }))
      );
    } catch (error) {
      console.log(
        'Erro ao buscar produtos:',
        error.response?.data || error.message
      );

      setProducts([]);
      setErrorMessage(
        error.response?.data?.message ||
          'Não foi possível carregar os produtos.'
      );
    } finally {
      setLoading(false);
    }
  }, [usuarioId]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const termo = search.trim().toLowerCase();

  const filteredProducts = products.filter((item) => {
    return (
      item.name.toLowerCase().includes(termo) ||
      item.category.toLowerCase().includes(termo)
    );
  });

  const formatarPreco = (preco) =>
    preco.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

  const renderProduct = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <Ionicons name="cube-outline" size={54} color="#86EFAC" />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {item.name || 'Produto sem nome'}
            </Text>

            <Text style={styles.category}>
              {item.category}
            </Text>
          </View>

          <View
            style={[
              styles.stockBadge,
              {
                backgroundColor:
                  item.stock <= 5 ? '#7F1D1D' : '#14532D',
              },
            ]}
          >
            <Text style={styles.stockText}>
              {item.stock}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Ionicons
              name="cube-outline"
              size={18}
              color="#3B82F6"
            />
            <Text style={styles.infoText}>Estoque</Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons
              name="barcode-outline"
              size={18}
              color="#22C55E"
            />
            <Text style={styles.infoText}>
              {item.code || 'S/C'}
            </Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.price}>
            {formatarPreco(item.price)}
          </Text>

          <Text
            style={[
              styles.stockStatus,
              {
                color:
                  item.stock <= 5 ? '#FCA5A5' : '#86EFAC',
              },
            ]}
          >
            {item.stock <= 5 ? 'Estoque baixo' : 'Disponível'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Produtos</Text>
          <Text style={styles.subtitle}>
            Consulte os produtos cadastrados
          </Text>
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setSearch('')}
          accessibilityLabel="Limpar pesquisa"
        >
          <Ionicons
            name="close-outline"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={22}
          color="#94A3B8"
        />

        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar produtos ou categorias..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#22C55E"
          style={{ marginTop: 30 }}
        />
      ) : errorMessage ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color="#FCA5A5"
          />
          <Text style={styles.emptyText}>
            {errorMessage}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadProducts}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item, index) =>
            String(item.id ?? index)
          }
          renderItem={renderProduct}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="file-tray-outline"
                size={42}
                color="#94A3B8"
              />
              <Text style={styles.emptyText}>
                {search
                  ? 'Nenhum produto encontrado para essa pesquisa.'
                  : 'Nenhum produto cadastrado.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 55,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94A3B8',
    marginTop: 5,
    fontSize: 15,
  },
  filterButton: {
    width: 52,
    height: 52,
    backgroundColor: '#1E293B',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#1E293B',
    height: 62,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 25,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#fff',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 22,
  },
  imageContainer: {
    width: '100%',
    height: 130,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    color: '#fff',
    fontSize: 21,
    fontWeight: 'bold',
  },
  category: {
    color: '#94A3B8',
    marginTop: 6,
    fontSize: 15,
  },
  stockBadge: {
    minWidth: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  stockText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    color: '#CBD5E1',
    marginLeft: 8,
    fontSize: 13,
  },
  bottomRow: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  price: {
    color: '#3B82F6',
    fontSize: 22,
    fontWeight: 'bold',
  },
  stockStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
    gap: 12,
  },
  emptyText: {
    color: '#CBD5E1',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#166534',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
