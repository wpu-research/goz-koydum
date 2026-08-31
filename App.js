import React, { useEffect, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useShareIntent } from 'expo-share-intent';
import { initDb } from './src/lib/db';
import HomeScreen from './src/screens/HomeScreen';
import AddScreen from './src/screens/AddScreen';
import DetailScreen from './src/screens/DetailScreen';
import TryOnScreen from './src/screens/TryOnScreen';
import CombineScreen from './src/screens/CombineScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { C } from './src/lib/theme';

const Stack = createNativeStackNavigator();
const navRef = createNavigationContainerRef();

export default function App() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const pendingShare = useRef(null);

  useEffect(() => { initDb(); }, []);

  useEffect(() => {
    if (!hasShareIntent) return;
    const file = shareIntent?.files?.[0];
    const uri = file?.path || file?.contentUri || null;
    if (uri) {
      if (navRef.isReady()) navRef.navigate('Add', { sharedUri: uri });
      else pendingShare.current = uri;   // navigation henüz hazır değilse onReady'de gönder
    }
    resetShareIntent();
  }, [hasShareIntent]);

  return (
    <NavigationContainer
      ref={navRef}
      onReady={() => {
        if (pendingShare.current) {
          navRef.navigate('Add', { sharedUri: pendingShare.current });
          pendingShare.current = null;
        }
      }}
    >
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
