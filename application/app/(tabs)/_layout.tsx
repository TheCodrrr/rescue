import { Tabs } from 'expo-router';
import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../store/hooks';

export default function TabsLayout() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(34, 40, 49, 0.98)',
          borderTopWidth: 2,
          borderTopColor: '#393E46',
          height: 85,
          paddingBottom: 20,
          paddingTop: 10,
          paddingHorizontal: 5,
        },
        tabBarActiveTintColor: '#00ADB5',
        tabBarInactiveTintColor: 'rgba(238, 238, 238, 0.6)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 6,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <View
              style={{
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 20,
                backgroundColor: focused ? '#00ADB5' : 'transparent',
              }}
            >
              <Ionicons name="home" size={22} color={focused ? 'white' : color} />
            </View>
          ),
        }}
      />

      {/* Complaint Tab - Only for authenticated users */}
      <Tabs.Screen
        name="complain"
        options={{
          title: 'Complaint',
          href: isAuthenticated ? '/complain' : null,
          tabBarIcon: ({ focused, color }) => (
            <View
              style={{
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 20,
                backgroundColor: focused ? '#00ADB5' : 'transparent',
              }}
            >
              <Ionicons name="document-text" size={22} color={focused ? 'white' : color} />
            </View>
          ),
        }}
      />

      {/* Trending Tab */}
      <Tabs.Screen
        name="trending"
        options={{
          title: 'Trending',
          tabBarIcon: ({ focused, color }) => (
            <View
              style={{
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 20,
                backgroundColor: focused ? '#00ADB5' : 'transparent',
              }}
            >
              <Ionicons name="trending-up" size={22} color={focused ? 'white' : color} />
            </View>
          ),
        }}
      />

      {/* Help Tab */}
      <Tabs.Screen
        name="help"
        options={{
          title: 'Help',
          tabBarIcon: ({ focused, color }) => (
            <View
              style={{
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 20,
                backgroundColor: focused ? '#00ADB5' : 'transparent',
              }}
            >
              <Ionicons name="help-circle" size={22} color={focused ? 'white' : color} />
            </View>
          ),
        }}
      />

      {/* Profile Tab - Only for authenticated users */}
      <Tabs.Screen
        name="user"
        options={{
          title: 'Profile',
          href: isAuthenticated ? '/user' : null,
          tabBarIcon: ({ focused, color }) => (
            user?.profileImage ? (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor: '#00ADB5',
                  overflow: 'hidden',
                  backgroundColor: '#393E46',
                }}
              >
                <Image
                  source={{ uri: user.profileImage }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View
                style={{
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 20,
                  backgroundColor: focused ? '#00ADB5' : 'transparent',
                }}
              >
                <Ionicons name="person" size={22} color={focused ? 'white' : color} />
              </View>
            )
          ),
        }}
      />

      {/* Login Tab - Only for non-authenticated users */}
      <Tabs.Screen
        name="login"
        options={{
          title: 'Login',
          href: isAuthenticated ? null : '/login',
          tabBarIcon: ({ focused, color }) => (
            <View
              style={{
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 20,
                backgroundColor: focused ? '#00ADB5' : 'transparent',
              }}
            >
              <Ionicons name="person-circle-outline" size={22} color={focused ? 'white' : color} />
            </View>
          ),
        }}
      />

      {/* Hidden screens - these won't appear in tab bar but are still accessible */}
      <Tabs.Screen
        name="my-complaints"
        options={{
          href: null, // Hide from tab bar
        }}
      />

      <Tabs.Screen
        name="signup"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
