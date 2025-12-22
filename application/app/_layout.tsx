import { Stack } from "expo-router";
import { Provider } from 'react-redux';
import { store } from '../store';
import { useEffect } from 'react';
import { initializeAuth } from '../store/slices/authSlice';
import './globals.css';

function RootLayoutContent() {
  useEffect(() => {
    // Initialize auth state from AsyncStorage on app start
    store.dispatch(initializeAuth());
  }, []);

  // Optionally, show a loading spinner while initializing
  // const initializing = useAppSelector((state) => state.auth.initializing);
  // if (initializing) {
  //   return <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><ActivityIndicator size="large" color="#00ADB5" /></View>;
  // }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none', // Disable slide animation
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="complaint/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutContent />
    </Provider>
  );
}
