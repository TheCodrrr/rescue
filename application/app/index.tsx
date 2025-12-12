import { Text, View, ScrollView, TouchableOpacity, Dimensions, StatusBar } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const categories = [
    { id: 'all', name: 'All Reports', icon: 'apps', color: '#00ADB5' },
    { id: 'rail', name: 'Rail', icon: 'train', color: '#00ADB5' },
    { id: 'fire', name: 'Fire', icon: 'flame', color: '#ef4444' },
    { id: 'cyber', name: 'Cyber', icon: 'shield-checkmark', color: '#8b5cf6' },
    { id: 'police', name: 'Police', icon: 'shield', color: '#00ADB5' },
    { id: 'court', name: 'Court', icon: 'business', color: '#10b981' },
  ];

  return (
    <View className="flex-1 bg-[#222831]">
      <StatusBar barStyle="light-content" backgroundColor="#222831" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#222831', '#393E46', '#222831']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section with Auth Buttons */}
        <View className="px-6 pt-16 pb-6">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-white text-2xl font-bold">Rescue</Text>
              <Text className="text-[#00ADB5] text-sm font-medium">Citizens Safety Portal</Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity 
                onPress={() => router.push('/login')}
                className="bg-[#393E46] px-4 py-2 rounded-full border border-[#00ADB5]"
              >
                <Text className="text-[#00ADB5] font-semibold text-sm">Login</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => router.push('/signup')}
                className="bg-[#00ADB5] px-4 py-2 rounded-full"
              >
                <Text className="text-white font-semibold text-sm">Signup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Hero Section */}
        <View className="px-6 mb-8">
          <View className="items-center mb-8">
            <Text className="text-white text-4xl font-bold text-center mb-3 leading-tight">
              Report. Track. Rescue.
            </Text>
            <Text className="text-[#EEEEEE]/70 text-center text-base mb-6 px-4 leading-6">
              Get help or help others by reporting incidents in real-time.
            </Text>
            <TouchableOpacity className="bg-[#00ADB5] px-8 py-4 rounded-full flex-row items-center shadow-lg">
              <Ionicons name="add-circle" size={24} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-lg">Report Incident</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Tabs */}
        <View className="mb-6">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
          >
            {categories.map((category, index) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                className={`px-4 py-3 rounded-full flex-row items-center mr-3 ${
                  selectedCategory === category.id 
                    ? 'bg-[#00ADB5]' 
                    : 'bg-[#393E46] border border-[#00ADB5]/30'
                }`}
              >
                <Ionicons 
                  name={category.icon as any} 
                  size={18} 
                  color={selectedCategory === category.id ? 'white' : '#EEEEEE'} 
                  style={{ marginRight: 6 }}
                />
                <Text 
                  className={`font-semibold text-sm ${
                    selectedCategory === category.id ? 'text-white' : 'text-[#EEEEEE]/80'
                  }`}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Map Section */}
        <View className="px-6 mb-8">
          <View className="bg-[#393E46] rounded-3xl overflow-hidden border border-[#00ADB5]/20" style={{ height: 300 }}>
            {/* Map Placeholder */}
            <View className="flex-1 items-center justify-center">
              <View className="bg-[#00ADB5]/10 p-6 rounded-full mb-4">
                <Ionicons name="location" size={48} color="#00ADB5" />
              </View>
              <Text className="text-white font-semibold text-base mb-2">Finding your location...</Text>
              <Text className="text-[#EEEEEE]/60 text-sm">Map will load here</Text>
            </View>
            
            {/* Map Controls */}
            <View className="absolute top-4 right-4">
              <TouchableOpacity className="bg-[#222831]/80 p-3 rounded-full mb-2">
                <Ionicons name="locate" size={20} color="#00ADB5" />
              </TouchableOpacity>
              <TouchableOpacity className="bg-[#222831]/80 p-3 rounded-full mb-2">
                <Ionicons name="add" size={20} color="#EEEEEE" />
              </TouchableOpacity>
              <TouchableOpacity className="bg-[#222831]/80 p-3 rounded-full">
                <Ionicons name="remove" size={20} color="#EEEEEE" />
              </TouchableOpacity>
            </View>

            {/* Live Indicator */}
            <View className="absolute top-4 left-4 bg-[#222831]/80 px-4 py-2 rounded-full flex-row items-center">
              <View className="w-2 h-2 bg-[#ef4444] rounded-full mr-2" />
              <Text className="text-white text-xs font-semibold">LIVE</Text>
            </View>
          </View>
        </View>

        {/* Live Reports Section */}
        <View className="px-6 mb-8">
          <View className="mb-4">
            <Text className="text-white text-2xl font-bold mb-1">Live Reports</Text>
            <Text className="text-[#EEEEEE]/60 text-sm">Recent incidents in your area</Text>
          </View>

          <View className="bg-[#393E46] rounded-3xl p-6 border border-[#00ADB5]/20">
            <View className="items-center py-8">
              <View className="bg-[#00ADB5]/10 p-4 rounded-full mb-4">
                <Ionicons name="radio" size={40} color="#00ADB5" />
              </View>
              <Text className="text-white font-semibold text-base mb-2 text-center">
                Listening for reports...
              </Text>
              <Text className="text-[#EEEEEE]/60 text-sm text-center leading-6 px-4">
                No recent emergency reports in your area. We'll show new incidents as they're reported.
              </Text>
            </View>
          </View>
        </View>

        {/* Info Cards */}
        <View className="px-6 mb-8">
          <View className="flex-row justify-between">
            <View className="bg-[#393E46] rounded-2xl p-4 flex-1 mr-2 border border-[#00ADB5]/20">
              <Ionicons name="shield-checkmark" size={28} color="#00ADB5" mb={2} />
              <Text className="text-white text-lg font-bold mt-2">1.2K+</Text>
              <Text className="text-[#EEEEEE]/60 text-xs">Reports Filed</Text>
            </View>
            <View className="bg-[#393E46] rounded-2xl p-4 flex-1 ml-2 border border-[#10b981]/20">
              <Ionicons name="checkmark-circle" size={28} color="#10b981" />
              <Text className="text-white text-lg font-bold mt-2">98%</Text>
              <Text className="text-[#EEEEEE]/60 text-xs">Response Rate</Text>
            </View>
          </View>
        </View>

        {/* Emergency Notice */}
        <View className="px-6 mb-8">
          <View className="bg-[#ef4444]/10 rounded-2xl p-4 border border-[#ef4444]/30">
            <View className="flex-row items-center">
              <Ionicons name="warning" size={24} color="#ef4444" style={{ marginRight: 12 }} />
              <View className="flex-1">
                <Text className="text-[#ef4444] font-bold text-sm mb-1">Emergency?</Text>
                <Text className="text-[#EEEEEE]/70 text-xs">Call emergency services directly for immediate assistance</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar - Sticky */}
      <View className="absolute bottom-0 left-0 right-0 bg-[#222831]/95 border-t-2 border-[#393E46]">
        <View className="flex-row justify-around py-3 px-4">
          <TouchableOpacity className="items-center flex-1">
            <View className="bg-[#00ADB5] p-3 rounded-full">
              <Ionicons name="home" size={24} color="white" />
            </View>
            <Text className="text-[#00ADB5] text-xs font-semibold mt-1">Home</Text>
          </TouchableOpacity>
          <TouchableOpacity className="items-center flex-1">
            <View className="p-3 rounded-full">
              <Ionicons name="document-text" size={24} color="#EEEEEE" />
            </View>
            <Text className="text-[#EEEEEE]/60 text-xs mt-1">Complaint</Text>
          </TouchableOpacity>
          <TouchableOpacity className="items-center flex-1">
            <View className="p-3 rounded-full">
              <Ionicons name="trending-up" size={24} color="#EEEEEE" />
            </View>
            <Text className="text-[#EEEEEE]/60 text-xs mt-1">Trending</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
