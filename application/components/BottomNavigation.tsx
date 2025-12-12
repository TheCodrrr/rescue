import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../store/hooks';

type TabName = 'home' | 'complaints' | 'analytics' | 'teams' | 'complaint' | 'trending' | 'help' | 'profile' | 'login';

interface BottomNavigationProps {
  activeTab?: TabName;
}

export default function BottomNavigation({ activeTab = 'home' }: BottomNavigationProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const userRole = user?.role || 'citizen';

  const isActive = (tab: TabName) => activeTab === tab;

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-[#222831]/95 border-t-2 border-[#393E46]">
      <View className="flex-row items-center justify-around py-3 px-4">
        {/* Home - Always visible */}
        <TouchableOpacity 
          className="items-center flex-1"
          onPress={() => router.push('/')}
        >
          <View className={`p-3 rounded-full ${isActive('home') ? 'bg-[#00ADB5]' : ''}`}>
            <Ionicons name="home" size={24} color={isActive('home') ? 'white' : '#EEEEEE'} />
          </View>
          <Text className={`text-xs mt-1 ${isActive('home') ? 'text-[#00ADB5] font-semibold' : 'text-[#EEEEEE]/60'}`}>
            Home
          </Text>
        </TouchableOpacity>
        
        {/* Officer-specific tabs */}
        {userRole === 'officer' ? (
          <>
            <TouchableOpacity 
              className="items-center flex-1"
              onPress={() => router.push('/complain')}
            >
              <View className={`p-3 rounded-full ${isActive('complaints') ? 'bg-[#00ADB5]' : ''}`}>
                <Ionicons name="list" size={24} color={isActive('complaints') ? 'white' : '#EEEEEE'} />
              </View>
              <Text className={`text-xs mt-1 ${isActive('complaints') ? 'text-[#00ADB5] font-semibold' : 'text-[#EEEEEE]/60'}`}>
                Complaints
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="items-center flex-1"
              onPress={() => router.push('/officer/analytics')}
            >
              <View className={`p-3 rounded-full ${isActive('analytics') ? 'bg-[#00ADB5]' : ''}`}>
                <Ionicons name="stats-chart" size={24} color={isActive('analytics') ? 'white' : '#EEEEEE'} />
              </View>
              <Text className={`text-xs mt-1 ${isActive('analytics') ? 'text-[#00ADB5] font-semibold' : 'text-[#EEEEEE]/60'}`}>
                Analytics
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="items-center flex-1"
              onPress={() => router.push('/officer/teams')}
            >
              <View className={`p-3 rounded-full ${isActive('teams') ? 'bg-[#00ADB5]' : ''}`}>
                <Ionicons name="people" size={24} color={isActive('teams') ? 'white' : '#EEEEEE'} />
              </View>
              <Text className={`text-xs mt-1 ${isActive('teams') ? 'text-[#00ADB5] font-semibold' : 'text-[#EEEEEE]/60'}`}>
                Teams
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Citizen tabs - Complaint only if authenticated */}
            {isAuthenticated && (
              <TouchableOpacity 
                className="items-center flex-1"
                onPress={() => router.push('/complain')}
              >
                <View className={`p-3 rounded-full ${isActive('complaint') ? 'bg-[#00ADB5]' : ''}`}>
                  <Ionicons name="document-text" size={24} color={isActive('complaint') ? 'white' : '#EEEEEE'} />
                </View>
                <Text className={`text-xs mt-1 ${isActive('complaint') ? 'text-[#00ADB5] font-semibold' : 'text-[#EEEEEE]/60'}`}>
                  Complaint
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              className="items-center flex-1"
              onPress={() => router.push('/trending')}
            >
              <View className={`p-3 rounded-full ${isActive('trending') ? 'bg-[#00ADB5]' : ''}`}>
                <Ionicons name="trending-up" size={24} color={isActive('trending') ? 'white' : '#EEEEEE'} />
              </View>
              <Text className={`text-xs mt-1 ${isActive('trending') ? 'text-[#00ADB5] font-semibold' : 'text-[#EEEEEE]/60'}`}>
                Trending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="items-center flex-1"
              onPress={() => router.push('/help')}
            >
              <View className={`p-3 rounded-full ${isActive('help') ? 'bg-[#00ADB5]' : ''}`}>
                <Ionicons name="help-circle" size={24} color={isActive('help') ? 'white' : '#EEEEEE'} />
              </View>
              <Text className={`text-xs mt-1 ${isActive('help') ? 'text-[#00ADB5] font-semibold' : 'text-[#EEEEEE]/60'}`}>
                Help
              </Text>
            </TouchableOpacity>
          </>
        )}
        
        {/* Profile - Always visible as last tab */}
        {isAuthenticated ? (
          <TouchableOpacity 
            className="items-center flex-1"
            onPress={() => router.push('/user')}
          >
            <View className="h-[48px] items-center justify-center relative">
              <View className={`w-10 h-10 rounded-full border-2 overflow-hidden bg-[#393E46] ${isActive('profile') ? 'border-[#00ADB5]' : 'border-[#00ADB5]'}`}>
                {user?.profileImage ? (
                  <Image 
                    source={{ uri: user.profileImage }} 
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center">
                    <Ionicons name="person" size={20} color="#00ADB5" />
                  </View>
                )}
              </View>
              <View className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10b981] rounded-full border border-[#222831]" />
            </View>
            <Text className={`text-xs mt-1 ${isActive('profile') ? 'text-[#00ADB5] font-semibold' : 'text-[#EEEEEE]/60'}`}>
              Profile
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            className="items-center flex-1"
            onPress={() => router.push('/login')}
          >
            <View className={`p-3 rounded-full ${isActive('login') ? 'bg-[#00ADB5]' : ''}`}>
              <Ionicons name="person-circle-outline" size={24} color={isActive('login') ? 'white' : '#EEEEEE'} />
            </View>
            <Text className={`text-xs mt-1 ${isActive('login') ? 'text-[#00ADB5] font-semibold' : 'text-[#EEEEEE]/60'}`}>
              Login
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
