import React, { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import api from '../src/services/api';


export default function LoginScreen({ navigation }) {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!user.trim() || !password) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    setLoading(true);

    try {
      // Ajustado a rota para /api/login caso a baseURL do api não contenha /api
      const response = await api.post('/login', {
        email: user,
        senha: password
      });



      if (response.data.success) {
        const usuario = response.data.user;

        if (!usuario || !usuario.id) {
          Alert.alert(
            'Erro',
            'O servidor não retornou o ID do usuário.'
          );
          return;
        }

        global.usuarioLogado = usuario;

        console.log('Usuário logado:', usuario);
        console.log('ID do usuário:', usuario.id);

        navigation.navigate('App', {
          usuarioId: usuario.id,
          user: usuario,
        });
      }
    } catch (error) {
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Falha ao conectar ao servidor.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    
    <View style={styles.container}>
      
      <View style={styles.containerI}>
        <Image
          source={require('../assets/ICBRANCO.png')}
          style={styles.imagem}
        />
      </View>
      
      <Text style={styles.logo}>Inventory Control</Text>
      <Text style={styles.subtitle}>Controle de estoque agricola inteligente</Text>

      <TextInput
        placeholder="E-mail / Usuário"
        placeholderTextColor="#9CA3AF"
        style={styles.input}
        value={user}
        onChangeText={setUser}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Senha"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f2a1c',
    justifyContent: 'center', // Este cara já centraliza tudo que estiver aqui dentro
    padding: 20,
  },
  containerI: {
    // REMOVIDO o flex: 1 daqui para não empurrar os inputs para baixo
    alignItems: 'center',      
    justifyContent: 'center',
    marginBottom: 30,         // Controla a distância entre a imagem e o texto "Inventory Control"
  },
  imagem: {
    width: 250,               // Ajustado para manter a proporção do trator
    height: 180,              // Ajustado para manter a proporção do trator
    resizeMode: 'contain',    // Garante que a imagem não distorça
  },
  logo: {
    color: '#fff',
    fontSize: 38,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,         // Diminuído um pouco para aproximar do subtítulo
  },
  subtitle: {
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 30,         // Diminuído para aproximar dos inputs
    fontSize: 16
  },
  input: {
    backgroundColor: '#1e3b2b',
    height: 55,
    borderRadius: 12,
    paddingHorizontal: 15,
    color: '#fff',
    marginBottom: 15
  },
  button: {
    backgroundColor: '#25eb88',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    color: '#0f2a1c',         // Dica: Mudei para verde escuro para dar contraste no botão verde claro!
    fontSize: 18,
    fontWeight: 'bold'
  },
});