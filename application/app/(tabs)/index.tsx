import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from 'react-native-maps';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Default fallback location (India - New Delhi)
  const defaultLocation = {
    coords: {
      latitude: 28.6139,
      longitude: 77.2090,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  } as Location.LocationObject;

  // Get user's current location
  const fetchLocation = async () => {
    try {
      setLocationError(null);
      
      // Check if permission is already granted first
      let { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        // Request permission if not granted
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') {
          setLocation(defaultLocation);
          setLocationError('Location permission denied. Showing default location.');
          return;
        }
      }

      // Try to get last known location first (instant)
      const lastKnownLocation = await Location.getLastKnownPositionAsync();
      
      if (lastKnownLocation) {
        // Set last known location immediately (no loading state)
        setLocation(lastKnownLocation);
        setLocationError(null);
        
        // Then try to get more accurate current position in background
        try {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation(currentLocation);
        } catch (posError) {
          // Keep using last known location, no error
          console.log('getCurrentPositionAsync failed, using last known:', posError);
        }
      } else {
        // No last known location, show loading and get current position
        setIsLoadingLocation(true);
        
        // Check if location services are enabled
        const isEnabled = await Location.hasServicesEnabledAsync();
        if (!isEnabled) {
          console.log('Location services disabled, using default location');
          setLocation(defaultLocation);
          setLocationError('Location services disabled. Showing default location.');
          setIsLoadingLocation(false);
          return;
        }
        
        try {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low, // Lower accuracy is faster
            timeInterval: 10000,
          });
          setLocation(currentLocation);
          setLocationError(null);
        } catch (posError) {
          console.log('getCurrentPositionAsync failed, using default:', posError);
          setLocation(defaultLocation);
          setLocationError('Could not get current location. Showing default location.');
        }
        setIsLoadingLocation(false);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocation(defaultLocation);
      setLocationError('Location unavailable. Showing default location.');
      setIsLoadingLocation(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const categories = [
    { id: 'all', name: 'All Reports', icon: 'apps', color: '#00ADB5' },
    { id: 'rail', name: 'Rail', icon: 'train', color: '#00ADB5' },
    { id: 'fire', name: 'Fire', icon: 'flame', color: '#ef4444' },
    { id: 'cyber', name: 'Cyber', icon: 'shield-checkmark', color: '#8b5cf6' },
    { id: 'police', name: 'Police', icon: 'shield', color: '#00ADB5' },
    { id: 'court', name: 'Court', icon: 'business', color: '#10b981' },
  ];

  // Dark map style to match app theme
  const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
    { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
    { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
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
            {!isAuthenticated ? (
              <View className="flex-row gap-2">
                <TouchableOpacity 
                  onPress={() => router.push('/(tabs)/login')}
                  className="bg-[#393E46] px-4 py-2 rounded-full border border-[#00ADB5]"
                >
                  <Text className="text-[#00ADB5] font-semibold text-sm">Login</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => router.push('/(tabs)/signup')}
                  className="bg-[#00ADB5] px-4 py-2 rounded-full"
                >
                  <Text className="text-white font-semibold text-sm">Signup</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                onPress={() => {
                  dispatch(logout());
                }}
                className="bg-[#ef4444] px-4 py-2 rounded-full flex-row items-center"
              >
                <Ionicons name="log-out" size={16} color="white" style={{ marginRight: 6 }} />
                <Text className="text-white font-semibold text-sm">Logout</Text>
              </TouchableOpacity>
            )}
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
            {/* Map View */}
            {isLoadingLocation ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#00ADB5" />
                <Text className="text-white font-semibold text-base mt-4">Finding your location...</Text>
              </View>
            ) : locationError ? (
              <View className="flex-1 items-center justify-center">
                <View className="bg-[#ef4444]/10 p-6 rounded-full mb-4">
                  <Ionicons name="location-outline" size={48} color="#ef4444" />
                </View>
                <Text className="text-white font-semibold text-base mb-2">Location Error</Text>
                <Text className="text-[#EEEEEE]/60 text-sm text-center px-4">{locationError}</Text>
              </View>
            ) : location ? (
              <MapView
                style={{ flex: 1 }}
                initialRegion={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={false}
                customMapStyle={mapStyle}
              >
                <Marker
                  coordinate={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  }}
                  title="You are here"
                  description="Your current location"
                >
                  <View className="bg-[#00ADB5] p-2 rounded-full border-2 border-white">
                    <Ionicons name="person" size={16} color="white" />
                  </View>
                </Marker>
              </MapView>
            ) : (
              <View className="flex-1 items-center justify-center">
                <View className="bg-[#00ADB5]/10 p-6 rounded-full mb-4">
                  <Ionicons name="location" size={48} color="#00ADB5" />
                </View>
                <Text className="text-white font-semibold text-base mb-2">Map unavailable</Text>
                <Text className="text-[#EEEEEE]/60 text-sm">Could not load map</Text>
              </View>
            )}
            
            {/* Map Controls */}
            <View className="absolute top-4 right-4">
              <TouchableOpacity 
                className="bg-[#222831]/80 p-3 rounded-full mb-2"
                onPress={fetchLocation}
              >
                <Ionicons name="locate" size={20} color="#00ADB5" />
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
    </View>
  );
}
