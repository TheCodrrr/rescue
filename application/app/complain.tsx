import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  submitComplaint,
  uploadEvidence,
  clearError,
  resetComplaintState,
} from '../store/slices/complaintSlice';
import BottomNavigation from '../components/BottomNavigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Categories matching the website
const categories = [
  { value: 'rail', label: 'Rail Incidents', icon: 'train', color: '#f59e0b' },
  { value: 'road', label: 'Road Issues', icon: 'car', color: '#db2777' },
  { value: 'fire', label: 'Fire Emergency', icon: 'flame', color: '#ef4444' },
  { value: 'cyber', label: 'Cyber Crime', icon: 'warning', color: '#8b5cf6' },
  { value: 'police', label: 'Police', icon: 'shield', color: '#3b82f6' },
  { value: 'court', label: 'Court', icon: 'business', color: '#10b981' },
];

// Severity options
const severities = [
  {
    value: 'low',
    label: 'Low',
    emoji: '🟢',
    color: '#10b981',
    description: 'Minor issues with minimal impact',
  },
  {
    value: 'medium',
    label: 'Medium',
    emoji: '🟡',
    color: '#f59e0b',
    description: 'Moderate issues requiring attention',
  },
  {
    value: 'high',
    label: 'High',
    emoji: '🔴',
    color: '#ef4444',
    description: 'Critical issues requiring immediate action',
  },
];

// Location methods
const locationMethods = [
  { value: 'current', label: 'Current Location', icon: 'locate' },
  { value: 'manual', label: 'Enter Manually', icon: 'create' },
];

interface FormData {
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  location: {
    latitude: number | null;
    longitude: number | null;
  };
  address: string;
  trainNumber: string;
  evidenceFiles: any[];
}

interface EvidencePreview {
  uri: string;
  type: 'image' | 'video';
  fileName?: string;
  mimeType?: string;
}

export default function ComplainScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { isSubmitting } = useAppSelector((state) => state.complaints);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: '',
    severity: 'medium',
    location: {
      latitude: null,
      longitude: null,
    },
    address: '',
    trainNumber: '',
    evidenceFiles: [],
  });

  const [locationMethod, setLocationMethod] = useState<'current' | 'manual'>('current');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [evidencePreviews, setEvidencePreviews] = useState<EvidencePreview[]>([]);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'Please log in to file a complaint.',
        [
          { text: 'Cancel', onPress: () => router.back() },
          { text: 'Login', onPress: () => router.push('/login') },
        ]
      );
    }
  }, [isAuthenticated]);

  // Get current location on mount
  useEffect(() => {
    if (locationMethod === 'current') {
      getCurrentLocation();
    }
  }, []);

  // Get address from coordinates using reverse geocoding
  const getAddressFromCoordinates = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'RescueApp/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch address');
      }

      const data = await response.json();

      if (data && data.display_name) {
        const address = data.address || {};
        const components: string[] = [];

        if (address.house_number) components.push(address.house_number);
        if (address.road) components.push(address.road);
        if (address.neighbourhood) components.push(address.neighbourhood);
        if (address.suburb) components.push(address.suburb);
        if (address.city || address.town || address.village) {
          components.push(address.city || address.town || address.village);
        }
        if (address.state) components.push(address.state);
        if (address.postcode) components.push(address.postcode);

        return components.length > 0 ? components.join(', ') : data.display_name;
      }

      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('Error fetching address:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location permissions to use this feature.',
          [{ text: 'OK' }]
        );
        setIsGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      const address = await getAddressFromCoordinates(latitude, longitude);

      setFormData((prev) => ({
        ...prev,
        location: { latitude, longitude },
        address,
      }));

      setManualLatitude(latitude.toString());
      setManualLongitude(longitude.toString());
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Failed to get your current location. Please try again.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Handle manual location update
  const handleManualLocationUpdate = async () => {
    const lat = parseFloat(manualLatitude);
    const lng = parseFloat(manualLongitude);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Invalid Coordinates', 'Please enter valid latitude and longitude values.');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert(
        'Invalid Coordinates',
        'Latitude must be between -90 and 90, longitude between -180 and 180.'
      );
      return;
    }

    setIsGettingLocation(true);
    const address = await getAddressFromCoordinates(lat, lng);
    
    setFormData((prev) => ({
      ...prev,
      location: { latitude: lat, longitude: lng },
      address,
    }));
    setIsGettingLocation(false);
  };

  // Handle evidence upload
  const handleEvidenceUpload = async () => {
    if (evidencePreviews.length >= 5) {
      Alert.alert('Limit Reached', 'You can only upload up to 5 evidence files.');
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to upload evidence.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5 - evidencePreviews.length,
      });

      if (!result.canceled && result.assets) {
        const newPreviews: EvidencePreview[] = [];
        const newFiles: any[] = [];

        for (const asset of result.assets) {
          const isVideo = asset.type === 'video';
          newPreviews.push({
            uri: asset.uri,
            type: isVideo ? 'video' : 'image',
            fileName: asset.fileName || `evidence_${Date.now()}`,
            mimeType: asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
          });
          newFiles.push({
            uri: asset.uri,
            fileName: asset.fileName || `evidence_${Date.now()}`,
            mimeType: asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
            type: isVideo ? 'video' : 'image',
          });
        }

        setEvidencePreviews((prev) => [...prev, ...newPreviews].slice(0, 5));
        setFormData((prev) => ({
          ...prev,
          evidenceFiles: [...prev.evidenceFiles, ...newFiles].slice(0, 5),
        }));
      }
    } catch (error) {
      console.error('Error picking evidence:', error);
      Alert.alert('Error', 'Failed to pick evidence files.');
    }
  };

  // Remove evidence
  const handleRemoveEvidence = (index: number) => {
    setEvidencePreviews((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      evidenceFiles: prev.evidenceFiles.filter((_, i) => i !== index),
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title for your complaint.');
      return;
    }

    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Please provide a description of the incident.');
      return;
    }

    if (!formData.category) {
      Alert.alert('Validation Error', 'Please select a category.');
      return;
    }

    if (!formData.location.latitude || !formData.location.longitude) {
      Alert.alert('Validation Error', 'Please provide a location for the incident.');
      return;
    }

    if (!formData.address.trim()) {
      Alert.alert('Validation Error', 'Please provide an address for the incident location.');
      return;
    }

    // Rail-specific validation
    if (formData.category === 'rail' && !formData.trainNumber.trim()) {
      Alert.alert('Validation Error', 'Train number is required for rail incidents.');
      return;
    }

    try {
      const result = await dispatch(
        submitComplaint({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          severity: formData.severity,
          location: {
            latitude: formData.location.latitude,
            longitude: formData.location.longitude,
          },
          address: formData.address.trim(),
          trainNumber: formData.category === 'rail' ? formData.trainNumber.trim() : undefined,
        })
      ).unwrap();

      // Upload evidence files if any
      if (formData.evidenceFiles.length > 0 && result.complaint?._id) {
        for (const file of formData.evidenceFiles) {
          try {
            await dispatch(
              uploadEvidence({
                file,
                complaintId: result.complaint._id,
                evidenceType: file.type === 'video' ? 'video' : 'image',
                description: `Evidence for ${formData.title}`,
                category: formData.category,
              })
            ).unwrap();
          } catch (evidenceError) {
            console.error('Failed to upload evidence:', evidenceError);
          }
        }
      }
      
      // Success - show alert and redirect
      dispatch(resetComplaintState());
      Alert.alert(
        '✅ Success',
        'Your complaint has been submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData({
                title: '',
                description: '',
                category: '',
                severity: 'medium',
                location: { latitude: null, longitude: null },
                address: '',
                trainNumber: '',
                evidenceFiles: [],
              });
              setEvidencePreviews([]);
              setManualLatitude('');
              setManualLongitude('');
              router.push('/user');
            },
          },
        ]
      );
    } catch (err: any) {
      // Error - show alert
      dispatch(clearError());
      Alert.alert('❌ Error', err || 'Failed to submit complaint. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-[#222831]">
        <StatusBar barStyle="light-content" backgroundColor="#222831" />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="lock-closed" size={64} color="#00ADB5" />
          <Text className="text-white text-xl font-bold mt-4">Authentication Required</Text>
          <Text className="text-[#EEEEEE]/60 text-center mt-2">
            Please log in to file a complaint.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/login')}
            className="mt-6 bg-[#00ADB5] px-8 py-3 rounded-full"
          >
            <Text className="text-white font-semibold text-lg">Login</Text>
          </TouchableOpacity>
        </View>
        <BottomNavigation activeTab="complaint" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#222831] pt-7">
      <StatusBar barStyle="light-content" backgroundColor="#222831" />

      {/* Header */}
      <View className="px-4 py-3 pt-8 border-b border-[#393E46]">
        <View className="flex-row items-center justify-center">
          <Text className="text-white text-xl font-bold">Report Incident</Text>
        </View>
        <Text className="text-[#EEEEEE]/60 text-sm text-center mt-1">
          Help us help you by providing detailed information
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Field */}
          <View className="px-4 mt-6">
            <View className="flex-row items-center mb-2">
              <Ionicons name="chatbubble-ellipses" size={18} color="#00ADB5" />
              <Text className="text-white font-semibold ml-2">Complaint Title *</Text>
            </View>
            <TextInput
              value={formData.title}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
              placeholder="Briefly describe the incident"
              placeholderTextColor="#EEEEEE40"
              className="bg-[#393E46] text-white px-4 py-3 rounded-xl border border-[#00ADB5]/30"
            />
          </View>

          {/* Description Field */}
          <View className="px-4 mt-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="document-text" size={18} color="#00ADB5" />
              <Text className="text-white font-semibold ml-2">Detailed Description *</Text>
            </View>
            <TextInput
              value={formData.description}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
              placeholder="Provide detailed information about what happened, when it occurred, and any other relevant details"
              placeholderTextColor="#EEEEEE40"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-[#393E46] text-white px-4 py-3 rounded-xl border border-[#00ADB5]/30 min-h-[120px]"
            />
          </View>

          {/* Category Selection */}
          <View className="px-4 mt-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="pricetag" size={18} color="#00ADB5" />
              <Text className="text-white font-semibold ml-2">Incident Category *</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  onPress={() => setFormData((prev) => ({ ...prev, category: category.value }))}
                  className={`flex-row items-center px-3 py-2 rounded-xl border ${
                    formData.category === category.value
                      ? 'border-[#00ADB5] bg-[#00ADB5]/20'
                      : 'border-[#393E46] bg-[#393E46]'
                  }`}
                  style={{ minWidth: (SCREEN_WIDTH - 48) / 2 - 4 }}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={20}
                    color={formData.category === category.value ? '#00ADB5' : category.color}
                  />
                  <Text
                    className={`ml-2 text-sm font-medium ${
                      formData.category === category.value ? 'text-[#00ADB5]' : 'text-[#EEEEEE]'
                    }`}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Train Number (Rail specific) */}
          {formData.category === 'rail' && (
            <View className="px-4 mt-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="train" size={18} color="#f59e0b" />
                <Text className="text-white font-semibold ml-2">Train Number *</Text>
              </View>
              <TextInput
                value={formData.trainNumber}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, trainNumber: text }))}
                placeholder="Enter train number (e.g., 12345)"
                placeholderTextColor="#EEEEEE40"
                keyboardType="numeric"
                className="bg-[#393E46] text-white px-4 py-3 rounded-xl border border-[#f59e0b]/30"
              />
            </View>
          )}

          {/* Severity Selection */}
          <View className="px-4 mt-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="alert-circle" size={18} color="#00ADB5" />
              <Text className="text-white font-semibold ml-2">Severity Level</Text>
            </View>
            <View className="gap-3">
              {severities.map((severity) => (
                <TouchableOpacity
                  key={severity.value}
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      severity: severity.value as 'low' | 'medium' | 'high',
                    }))
                  }
                  className={`flex-row items-center p-4 rounded-2xl border ${
                    formData.severity === severity.value
                      ? `border-[${severity.color}]`
                      : 'border-[#393E46]'
                  }`}
                  style={{
                    backgroundColor:
                      formData.severity === severity.value
                        ? `${severity.color}15`
                        : '#393E46',
                    borderColor:
                      formData.severity === severity.value ? severity.color : '#393E46',
                  }}
                >
                  <Text className="text-2xl mr-3">{severity.emoji}</Text>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text
                        className="font-bold text-base"
                        style={{
                          color:
                            formData.severity === severity.value ? severity.color : '#EEEEEE',
                        }}
                      >
                        {severity.label}
                      </Text>
                      <View
                        className="px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: `${severity.color}30`,
                        }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{ color: severity.color }}
                        >
                          {severity.value.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[#EEEEEE]/60 text-sm mt-1">
                      {severity.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Selection */}
          <View className="px-4 mt-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="location" size={18} color="#00ADB5" />
              <Text className="text-white font-semibold ml-2">Incident Location *</Text>
            </View>

            {/* Location Method Tabs */}
            <View className="flex-row mb-4">
              {locationMethods.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  onPress={() => {
                    setLocationMethod(method.value as 'current' | 'manual');
                    if (method.value === 'current') {
                      getCurrentLocation();
                    }
                  }}
                  className={`flex-1 flex-row items-center justify-center py-3 mx-1 rounded-xl ${
                    locationMethod === method.value
                      ? 'bg-[#00ADB5]'
                      : 'bg-[#393E46] border border-[#00ADB5]/30'
                  }`}
                >
                  <Ionicons
                    name={method.icon as any}
                    size={18}
                    color={locationMethod === method.value ? 'white' : '#00ADB5'}
                  />
                  <Text
                    className={`ml-2 font-medium ${
                      locationMethod === method.value ? 'text-white' : 'text-[#EEEEEE]'
                    }`}
                  >
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Current Location */}
            {locationMethod === 'current' && (
              <View>
                <TouchableOpacity
                  onPress={getCurrentLocation}
                  disabled={isGettingLocation}
                  className="bg-[#393E46] p-4 rounded-xl border border-[#00ADB5]/30 flex-row items-center justify-center"
                >
                  {isGettingLocation ? (
                    <ActivityIndicator size="small" color="#00ADB5" />
                  ) : (
                    <Ionicons name="locate" size={20} color="#00ADB5" />
                  )}
                  <Text className="text-white font-medium ml-2">
                    {isGettingLocation ? 'Getting Location...' : 'Refresh Current Location'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Manual Location */}
            {locationMethod === 'manual' && (
              <View>
                <View className="flex-row gap-2 mb-3">
                  <View className="flex-1">
                    <Text className="text-[#EEEEEE]/60 text-sm mb-1">Latitude *</Text>
                    <TextInput
                      value={manualLatitude}
                      onChangeText={setManualLatitude}
                      placeholder="e.g., 28.6139"
                      placeholderTextColor="#EEEEEE40"
                      keyboardType="numeric"
                      className="bg-[#393E46] text-white px-4 py-3 rounded-xl border border-[#00ADB5]/30"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#EEEEEE]/60 text-sm mb-1">Longitude *</Text>
                    <TextInput
                      value={manualLongitude}
                      onChangeText={setManualLongitude}
                      placeholder="e.g., 77.2090"
                      placeholderTextColor="#EEEEEE40"
                      keyboardType="numeric"
                      className="bg-[#393E46] text-white px-4 py-3 rounded-xl border border-[#00ADB5]/30"
                    />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleManualLocationUpdate}
                  disabled={isGettingLocation}
                  className="bg-[#00ADB5] p-3 rounded-xl flex-row items-center justify-center"
                >
                  {isGettingLocation ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                  )}
                  <Text className="text-white font-medium ml-2">Set Location</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Selected Location Display */}
            {formData.location.latitude && formData.location.longitude && (
              <View className="bg-[#393E46] p-4 rounded-xl mt-3 border border-[#10b981]/30">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text className="text-[#10b981] font-semibold ml-2">Location Selected</Text>
                </View>
                <Text className="text-[#EEEEEE]/80 text-sm">
                  📍 {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}
                </Text>
                {formData.address && (
                  <Text className="text-[#EEEEEE]/80 text-sm mt-1">
                    🏠 {formData.address}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Address Field */}
          <View className="px-4 mt-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="home" size={18} color="#00ADB5" />
              <Text className="text-white font-semibold ml-2">Address</Text>
            </View>
            <TextInput
              value={formData.address}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, address: text }))}
              placeholder="Street address, landmark, or nearby location"
              placeholderTextColor="#EEEEEE40"
              className="bg-[#393E46] text-white px-4 py-3 rounded-xl border border-[#00ADB5]/30"
            />
          </View>

          {/* Evidence Upload */}
          <View className="px-4 mt-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="images" size={18} color="#00ADB5" />
              <Text className="text-white font-semibold ml-2">Evidence (Optional)</Text>
            </View>
            <Text className="text-[#EEEEEE]/60 text-sm mb-3">
              Upload images or videos as evidence (Max 5 files)
            </Text>

            <TouchableOpacity
              onPress={handleEvidenceUpload}
              className="bg-[#393E46] p-4 rounded-xl border border-dashed border-[#00ADB5]/50 items-center"
            >
              <Ionicons name="cloud-upload" size={32} color="#00ADB5" />
              <Text className="text-[#EEEEEE] font-medium mt-2">
                Choose Images or Videos
              </Text>
              <Text className="text-[#EEEEEE]/60 text-sm mt-1">
                Tap to select from gallery
              </Text>
            </TouchableOpacity>

            {/* Evidence Previews */}
            {evidencePreviews.length > 0 && (
              <View className="flex-row flex-wrap mt-4 gap-2">
                {evidencePreviews.map((preview, index) => (
                  <View key={index} className="relative">
                    {preview.type === 'image' ? (
                      <Image
                        source={{ uri: preview.uri }}
                        className="w-20 h-20 rounded-xl"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-20 h-20 rounded-xl bg-[#393E46] items-center justify-center">
                        <Ionicons name="videocam" size={24} color="#00ADB5" />
                        <Text className="text-[#EEEEEE]/60 text-xs mt-1">Video</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => handleRemoveEvidence(index)}
                      className="absolute -top-2 -right-2 bg-[#ef4444] w-6 h-6 rounded-full items-center justify-center"
                    >
                      <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Submit Button */}
          <View className="px-4 mt-8 mb-4">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              className={`py-4 rounded-2xl flex-row items-center justify-center ${
                isSubmitting ? 'bg-[#00ADB5]/50' : 'bg-[#00ADB5]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white font-bold text-lg ml-2">Submitting...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="send" size={20} color="white" />
                  <Text className="text-white font-bold text-lg ml-2">Submit Complaint</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="complaint" />
    </SafeAreaView>
  );
}
