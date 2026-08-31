import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { initDb } from './src/lib/db';
import HomeScreen from './src/screens/HomeScreen';
import AddScreen from './src/screens/AddScreen';
import DetailScreen from './src/screens/DetailScreen';
import TryOnScreen from './src/screens/TryOnScreen';
import CombineScreen from './src/screens/CombineScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { C } from './src/lib/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => { initDb(); }, []);
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.ink,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Add" component={AddScreen} options={{ title: 'Ürün ekle' }} />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ title: '' }} />
        <Stack.Screen name="TryOn" component={TryOnScreen} options={{ title: 'Üzerinde dene' }} />
        <Stack.Screen name="Combine" component={CombineScreen} options={{ title: 'Kombin' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Beden profilim' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
