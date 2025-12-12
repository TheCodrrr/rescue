import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Pressable,
  BackHandler,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import BottomNavigation from '../components/BottomNavigation';
import ProfileContent from '../components/profile/ProfileContent';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

// Sidebar menu items
const sidebarLinks = [
  { id: 'profile', label: 'Profile', icon: 'person' as const },
  { id: 'complaints', label: 'My Complaints', icon: 'alert-circle' as const },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart' as const },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' as const },
  { id: 'history', label: 'History', icon: 'time' as const },
  { id: 'settings', label: 'Settings', icon: 'settings' as const },
];

export default function UserScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [activeSection, setActiveSection] = useState('profile');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Animation value for sidebar
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  // Handle back button to close sidebar
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sidebarOpen) {
        closeSidebar();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [sidebarOpen]);

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 65,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        useNativeDriver: true,
        friction: 8,
        tension: 65,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSidebarOpen(false);
    });
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    closeSidebar();
  };

  const handleLogout = async () => {
    closeSidebar();
    dispatch(logout());
    router.replace('/');
  };

  // Get section title
  const getSectionTitle = () => {
    const section = sidebarLinks.find((link) => link.id === activeSection);
    return section?.label || 'Profile';
  };

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileContent />;
      case 'complaints':
        return (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-[#393E46] p-8 rounded-3xl items-center">
              <Ionicons name="alert-circle" size={64} color="#00ADB5" />
              <Text className="text-white text-xl font-bold mt-4">My Complaints</Text>
              <Text className="text-[#EEEEEE]/60 text-center mt-2">
                View and manage your filed complaints
              </Text>
              <TouchableOpacity 
                onPress={() => router.push('/')}
                className="mt-6 bg-[#00ADB5] px-6 py-3 rounded-full"
              >
                <Text className="text-white font-semibold">Go to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'analytics':
        return (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-[#393E46] p-8 rounded-3xl items-center">
              <Ionicons name="bar-chart" size={64} color="#00ADB5" />
              <Text className="text-white text-xl font-bold mt-4">Analytics</Text>
              <Text className="text-[#EEEEEE]/60 text-center mt-2">
                View statistics and insights about your activity
              </Text>
            </View>
          </View>
        );
      case 'notifications':
        return (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-[#393E46] p-8 rounded-3xl items-center">
              <Ionicons name="notifications" size={64} color="#00ADB5" />
              <Text className="text-white text-xl font-bold mt-4">Notifications</Text>
              <Text className="text-[#EEEEEE]/60 text-center mt-2">
                No new notifications
              </Text>
            </View>
          </View>
        );
      case 'history':
        return (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-[#393E46] p-8 rounded-3xl items-center">
              <Ionicons name="time" size={64} color="#00ADB5" />
              <Text className="text-white text-xl font-bold mt-4">History</Text>
              <Text className="text-[#EEEEEE]/60 text-center mt-2">
                View your activity history
              </Text>
            </View>
          </View>
        );
      case 'settings':
        return (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-[#393E46] p-8 rounded-3xl items-center">
              <Ionicons name="settings" size={64} color="#00ADB5" />
              <Text className="text-white text-xl font-bold mt-4">Settings</Text>
              <Text className="text-[#EEEEEE]/60 text-center mt-2">
                Customize your app preferences
              </Text>
            </View>
          </View>
        );
      default:
        return <ProfileContent />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#222831]">
      <StatusBar barStyle="light-content" backgroundColor="#222831" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 pt-16 border-b border-[#393E46]">
        <TouchableOpacity 
          onPress={openSidebar}
          className="p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="menu" size={28} color="#EEEEEE" />
        </TouchableOpacity>
        
        <Text className="text-white text-lg font-bold">{getSectionTitle()}</Text>
        
        <View className="w-10" />
      </View>

      {/* Main Content */}
      <View className="flex-1">
        {renderContent()}
      </View>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="profile" />

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <Animated.View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            opacity: overlayAnim,
          }}
        >
          <Pressable 
            style={{ flex: 1 }}
            onPress={closeSidebar}
          />
        </Animated.View>
      )}

      {/* Sidebar */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: SIDEBAR_WIDTH,
          backgroundColor: '#393E46',
          transform: [{ translateX: slideAnim }],
          shadowColor: '#000',
          shadowOffset: { width: 2, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        <SafeAreaView className="flex-1">
          {/* Sidebar Header */}
          <View className="p-6 border-b border-[#222831] pt-16">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-xl font-bold">Menu</Text>
              <TouchableOpacity onPress={closeSidebar}>
                <Ionicons name="close" size={24} color="#EEEEEE" />
              </TouchableOpacity>
            </View>
            
            {/* User Info */}
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-[#00ADB5]/20 items-center justify-center mr-3 overflow-hidden">
                {user?.profileImage ? (
                  <Image 
                    source={{ uri: user.profileImage }}
                    style={{ width: 48, height: 48 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={24} color="#00ADB5" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold" numberOfLines={1}>
                  {user?.name || 'User'}
                </Text>
                <Text className="text-[#EEEEEE]/60 text-sm" numberOfLines={1}>
                  {user?.email || 'email@example.com'}
                </Text>
              </View>
            </View>
          </View>

          {/* Sidebar Links */}
          <View className="flex-1 py-4">
            {sidebarLinks.map((link) => (
              <TouchableOpacity
                key={link.id}
                onPress={() => handleSectionChange(link.id)}
                className={`flex-row items-center px-6 py-4 ${
                  activeSection === link.id ? 'bg-[#00ADB5]/20 border-l-4 border-[#00ADB5]' : ''
                }`}
              >
                <Ionicons 
                  name={link.icon} 
                  size={22} 
                  color={activeSection === link.id ? '#00ADB5' : '#EEEEEE'} 
                />
                <Text 
                  className={`ml-4 text-base font-medium ${
                    activeSection === link.id ? 'text-[#00ADB5]' : 'text-[#EEEEEE]'
                  }`}
                >
                  {link.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout Button */}
          <View className="p-4 border-t border-[#222831]">
            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center justify-center bg-[#ef4444]/20 py-3 rounded-xl border border-[#ef4444]/30"
            >
              <Ionicons name="log-out" size={22} color="#ef4444" />
              <Text className="text-[#ef4444] font-semibold ml-2">Logout</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </SafeAreaView>
  );
}
  