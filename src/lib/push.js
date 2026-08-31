// Push token alma + sunucuya kayıt. Expo Go'da push çalışmaz — dev build gerekir.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerDevice, syncTracked } from './sync';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

export async function initPush() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Fiyat bildirimleri',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    let token = null;
    if (Device.isDevice) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        token = (await Notifications.getExpoPushTokenAsync()).data;
      }
    }
    await registerDevice(token);
    await syncTracked();
  } catch {
    // push kurulamadı — takip yine de token'sız senkronlanır
    try { await syncTracked(); } catch {}
  }
}
