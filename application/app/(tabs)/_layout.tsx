import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useAppSelector } from '../../store/hooks';
import Navigation from '../../components/navigation';

export default function TabsLayout() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' }, // Hide the default tab bar
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="complain" options={{ href: isAuthenticated ? '/complain' : null }} />
        <Tabs.Screen name="trending" />
        <Tabs.Screen name="help" />
        <Tabs.Screen name="user" options={{ href: isAuthenticated ? '/user' : null }} />
        <Tabs.Screen name="login" options={{ href: isAuthenticated ? null : '/login' }} />
        <Tabs.Screen name="signup" options={{ href: null }} />
      </Tabs>

      <Navigation />
    </View>
  );
}
