import { Text, View, ScrollView, TouchableOpacity, TextInput, StatusBar, KeyboardAvoidingView, Platform, Dimensions, Alert } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { registerUser } from '../../store/slices/authSlice';

const { width } = Dimensions.get('window');

export default function Signup() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.auth);
  
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    phone: string;
    role: string;
    category: string;
    department_id: string;
    department_secret: string;
    latitude: number | null;
    longitude: number | null;
    address: string;
  }>({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "citizen",
    category: "",
    department_id: "",
    department_secret: "",
    latitude: null,
    longitude: null,
    address: ""
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showDepartmentSecret, setShowDepartmentSecret] = useState(false);
  const [isSecretVerified, setIsSecretVerified] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const categories = [
    { value: 'rail', label: 'Railway' },
    { value: 'road', label: 'Road & Transport' },
    { value: 'fire', label: 'Fire Services' },
    { value: 'cyber', label: 'Cyber Crime' },
    { value: 'police', label: 'Police' },
    { value: 'court', label: 'Court' }
  ];

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGetCurrentLocation = async () => {
    setIsFetchingLocation(true);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        setIsFetchingLocation(false);
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      setFormData(prev => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      }));
      
      Alert.alert('Success', 'Location fetched successfully!');
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to fetch location');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleVerifySecret = async () => {
    // TODO: Implement department secret verification
    // const res = await axiosInstance.post('/department/verify-secret', {
    //   department_id: formData.department_id,
    //   secret: formData.department_secret
    // });
    
    alert('Verifying department secret...');
    setTimeout(() => {
      setIsSecretVerified(true);
      alert('Department secret verified!');
    }, 1000);
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    // Phone validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    // Officer-specific validation
    if (formData.role === 'officer') {
      if (!formData.category || !formData.department_id) {
        Alert.alert('Validation Error', 'Please select category and department');
        return;
      }
      if (!isSecretVerified) {
        Alert.alert('Validation Error', 'Please verify department secret');
        return;
      }
    }

    try {
      // Create FormData for multipart/form-data request
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('role', formData.role);
      
      if (formData.role === 'officer') {
        formDataToSend.append('category', formData.category);
        formDataToSend.append('department_id', formData.department_id);
        formDataToSend.append('department_secret', formData.department_secret);
      }
      
      if (formData.latitude && formData.longitude) {
        formDataToSend.append('latitude', formData.latitude.toString());
        formDataToSend.append('longitude', formData.longitude.toString());
      }
      
      if (formData.address) {
        formDataToSend.append('address', formData.address);
      }
      
      await dispatch(registerUser(formDataToSend)).unwrap();
      
      Alert.alert('Success', 'Account created successfully! Please login.');
      router.push('/login');
    } catch (error: any) {
      console.error('Signup error:', error);
      Alert.alert('Signup Failed', error || 'Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <View className="flex-1 bg-[#222831]">
        <StatusBar barStyle="light-content" backgroundColor="#222831" />
        
        {/* Background Gradient */}
        <LinearGradient
          colors={['#222831', '#393E46', '#222831']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <View className="px-6 pt-16 pb-4">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="flex-row items-center"
            >
              <Ionicons name="arrow-back" size={24} color="#00ADB5" />
              <Text className="text-[#00ADB5] ml-2 text-base font-semibold">Back</Text>
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View className="px-6 pb-6">
            <View className="bg-[#393E46] rounded-3xl p-6 border border-[#00ADB5]/20">
              <View className="flex-row items-center">
                <View className="bg-[#00ADB5]/10 p-4 rounded-full mr-4">
                  <Ionicons name="person-add" size={32} color="#00ADB5" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-2xl font-bold">Create Account</Text>
                  <Text className="text-[#EEEEEE]/70 text-sm mt-1">Sign up to get started</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Signup Form */}
          <View className="px-6">
            <View className="bg-[#393E46] rounded-3xl p-6 border border-[#00ADB5]/20">
              
              {/* Name Field */}
              <View className="mb-4">
                <Text className="text-white/90 text-sm font-semibold mb-2">Full Name *</Text>
                <View className="bg-[#222831]/40 rounded-xl border border-[#00ADB5]/30 flex-row items-center px-4">
                  <Ionicons name="person" size={20} color="#EEEEEE" />
                  <TextInput
                    value={formData.name}
                    onChangeText={(value) => handleInputChange('name', value)}
                    placeholder="John Doe"
                    placeholderTextColor="#EEEEEE80"
                    className="flex-1 py-4 px-3 text-white text-base"
                  />
                </View>
              </View>

              {/* Email Field */}
              <View className="mb-4">
                <Text className="text-white/90 text-sm font-semibold mb-2">Email Address *</Text>
                <View className="bg-[#222831]/40 rounded-xl border border-[#00ADB5]/30 flex-row items-center px-4">
                  <Ionicons name="mail" size={20} color="#EEEEEE" />
                  <TextInput
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    placeholder="john@example.com"
                    placeholderTextColor="#EEEEEE80"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="flex-1 py-4 px-3 text-white text-base"
                  />
                </View>
              </View>

              {/* Password Field */}
              <View className="mb-4">
                <Text className="text-white/90 text-sm font-semibold mb-2">Password *</Text>
                <View className="bg-[#222831]/40 rounded-xl border border-[#00ADB5]/30 flex-row items-center px-4">
                  <Ionicons name="lock-closed" size={20} color="#EEEEEE" />
                  <TextInput
                    value={formData.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    placeholder="••••••••"
                    placeholderTextColor="#EEEEEE80"
                    secureTextEntry={!showPassword}
                    className="flex-1 py-4 px-3 text-white text-base"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#EEEEEE" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Phone Field */}
              <View className="mb-4">
                <Text className="text-white/90 text-sm font-semibold mb-2">Phone Number *</Text>
                <View className="bg-[#222831]/40 rounded-xl border border-[#00ADB5]/30 flex-row items-center px-4">
                  <Ionicons name="call" size={20} color="#EEEEEE" />
                  <TextInput
                    value={formData.phone}
                    onChangeText={(value) => handleInputChange('phone', value)}
                    placeholder="1234567890"
                    placeholderTextColor="#EEEEEE80"
                    keyboardType="phone-pad"
                    maxLength={10}
                    className="flex-1 py-4 px-3 text-white text-base"
                  />
                </View>
              </View>

              {/* Role Selection */}
              <View className="mb-4">
                <Text className="text-white/90 text-sm font-semibold mb-2">Register As *</Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => handleInputChange('role', 'citizen')}
                    className={`flex-1 py-4 rounded-xl border-2 flex-row items-center justify-center ${
                      formData.role === 'citizen' 
                        ? 'bg-[#00ADB5] border-[#00ADB5]' 
                        : 'bg-[#222831]/40 border-[#00ADB5]/30'
                    }`}
                  >
                    <Ionicons 
                      name="people" 
                      size={20} 
                      color={formData.role === 'citizen' ? 'white' : '#EEEEEE'} 
                    />
                    <Text className={`ml-2 font-semibold ${
                      formData.role === 'citizen' ? 'text-white' : 'text-[#EEEEEE]'
                    }`}>
                      Citizen
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleInputChange('role', 'officer')}
                    className={`flex-1 py-4 rounded-xl border-2 flex-row items-center justify-center ${
                      formData.role === 'officer' 
                        ? 'bg-[#00ADB5] border-[#00ADB5]' 
                        : 'bg-[#222831]/40 border-[#00ADB5]/30'
                    }`}
                  >
                    <Ionicons 
                      name="shield-checkmark" 
                      size={20} 
                      color={formData.role === 'officer' ? 'white' : '#EEEEEE'} 
                    />
                    <Text className={`ml-2 font-semibold ${
                      formData.role === 'officer' ? 'text-white' : 'text-[#EEEEEE]'
                    }`}>
                      Officer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Officer-specific fields */}
              {formData.role === 'officer' && (
                <>
                  {/* Category Selection */}
                  <View className="mb-4">
                    <Text className="text-white/90 text-sm font-semibold mb-2">Category *</Text>
                    <View className="bg-[#222831]/40 rounded-xl border border-[#00ADB5]/30 overflow-hidden">
                      <Picker
                        selectedValue={formData.category}
                        onValueChange={(value) => handleInputChange('category', value)}
                        style={{ color: '#EEEEEE' }}
                        dropdownIconColor="#EEEEEE"
                      >
                        <Picker.Item label="Select Category" value="" />
                        {categories.map((cat) => (
                          <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  {/* Department ID */}
                  <View className="mb-4">
                    <Text className="text-white/90 text-sm font-semibold mb-2">Department ID *</Text>
                    <View className="bg-[#222831]/40 rounded-xl border border-[#00ADB5]/30 flex-row items-center px-4">
                      <Ionicons name="business" size={20} color="#EEEEEE" />
                      <TextInput
                        value={formData.department_id}
                        onChangeText={(value) => handleInputChange('department_id', value)}
                        placeholder="Enter department ID"
                        placeholderTextColor="#EEEEEE80"
                        className="flex-1 py-4 px-3 text-white text-base"
                      />
                    </View>
                  </View>

                  {/* Department Secret */}
                  <View className="mb-4">
                    <Text className="text-white/90 text-sm font-semibold mb-2">Department Secret *</Text>
                    <View className="bg-[#222831]/40 rounded-xl border border-[#00ADB5]/30 flex-row items-center px-4">
                      <Ionicons name="key" size={20} color="#EEEEEE" />
                      <TextInput
                        value={formData.department_secret}
                        onChangeText={(value) => handleInputChange('department_secret', value)}
                        placeholder="Enter department secret"
                        placeholderTextColor="#EEEEEE80"
                        secureTextEntry={!showDepartmentSecret}
                        className="flex-1 py-4 px-3 text-white text-base"
                      />
                      <TouchableOpacity onPress={() => setShowDepartmentSecret(!showDepartmentSecret)}>
                        <Ionicons 
                          name={showDepartmentSecret ? "eye-off" : "eye"} 
                          size={20} 
                          color="#EEEEEE" 
                        />
                      </TouchableOpacity>
                    </View>
                    {formData.department_secret && !isSecretVerified && (
                      <TouchableOpacity 
                        onPress={handleVerifySecret}
                        className="mt-2 bg-[#f59e0b]/20 py-2 px-4 rounded-lg border border-[#f59e0b]/30"
                      >
                        <Text className="text-[#f59e0b] text-center font-semibold text-sm">
                          Verify Secret
                        </Text>
                      </TouchableOpacity>
                    )}
                    {isSecretVerified && (
                      <View className="mt-2 bg-[#10b981]/20 py-2 px-4 rounded-lg border border-[#10b981]/30 flex-row items-center justify-center">
                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                        <Text className="text-[#10b981] ml-2 font-semibold text-sm">Verified</Text>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* Address Field */}
              <View className="mb-4">
                <Text className="text-white/90 text-sm font-semibold mb-2">Address</Text>
                <View className="bg-[#222831]/40 rounded-xl border border-[#00ADB5]/30 flex-row items-center px-4">
                  <Ionicons name="location" size={20} color="#EEEEEE" />
                  <TextInput
                    value={formData.address}
                    onChangeText={(value) => handleInputChange('address', value)}
                    placeholder="Enter your address"
                    placeholderTextColor="#EEEEEE80"
                    multiline
                    numberOfLines={2}
                    className="flex-1 py-4 px-3 text-white text-base"
                  />
                </View>
              </View>

              {/* Get Location Button */}
              <TouchableOpacity
                onPress={handleGetCurrentLocation}
                disabled={isFetchingLocation}
                className="mb-6 bg-[#00ADB5]/20 py-3 rounded-xl border border-[#00ADB5]/30 flex-row items-center justify-center"
              >
                {isFetchingLocation ? (
                  <Text className="text-[#00ADB5] font-semibold">Fetching location...</Text>
                ) : (
                  <>
                    <Ionicons name="navigate" size={20} color="#00ADB5" />
                    <Text className="text-[#00ADB5] ml-2 font-semibold">
                      {formData.latitude ? 'Location Fetched' : 'Get Current Location'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Sign Up Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                className={`bg-[#00ADB5] py-4 rounded-full flex-row items-center justify-center ${
                  loading ? 'opacity-70' : ''
                }`}
              >
                {loading ? (
                  <Text className="text-white font-bold text-base">Creating account...</Text>
                ) : (
                  <>
                    <Text className="text-white font-bold text-base mr-2">Sign Up</Text>
                    <Ionicons name="person-add" size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Link */}
          <View className="px-6 mt-6">
            <View className="bg-[#393E46] rounded-2xl p-4 border border-[#00ADB5]/20">
              <View className="flex-row items-center justify-center">
                <Text className="text-white/70 text-sm mr-2">Already have an account?</Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text className="text-[#00ADB5] font-bold text-sm">Login →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
