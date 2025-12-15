import { Text, View, ScrollView, TouchableOpacity, TextInput, StatusBar, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginUser } from '../../store/slices/authSlice';

export default function Login() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.email || !formData.password) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    try {
      const result = await dispatch(loginUser({ 
        email: formData.email, 
        password: formData.password 
      })).unwrap();
      
      console.log('Login successful:', result);
      Alert.alert('Success', 'Login successful!');
      router.replace('/(tabs)/index');
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error || 'Please check your credentials and try again.');
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
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
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
          <View className="px-6 pb-8">
            <View className="bg-[#393E46] rounded-3xl p-6 border border-[#00ADB5]/20">
              <View className="flex-row items-center mb-4">
                <View className="bg-[#00ADB5]/10 p-4 rounded-full mr-4">
                  <Ionicons name="log-in" size={32} color="#00ADB5" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-2xl font-bold">Welcome Back!</Text>
                  <Text className="text-[#EEEEEE]/70 text-sm mt-1">Login to your account</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Login Form */}
          <View className="px-6">
            <View className="bg-[#393E46] rounded-3xl p-6 border border-[#00ADB5]/20">
              
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
              <View className="mb-6">
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

              {/* Remember Me & Forgot Password */}
              <View className="flex-row items-center justify-between mb-6">
                <View className="flex-row items-center">
                  <TouchableOpacity className="w-5 h-5 border-2 border-[#00ADB5]/50 rounded mr-2" />
                  <Text className="text-white/70 text-sm">Remember me</Text>
                </View>
                <TouchableOpacity>
                  <Text className="text-[#00ADB5] text-sm font-semibold">Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                className={`bg-[#00ADB5] py-4 rounded-full flex-row items-center justify-center ${
                  loading ? 'opacity-70' : ''
                }`}
              >
                {loading ? (
                  <>
                    <Text className="text-white font-bold text-base mr-2">Logging in...</Text>
                  </>
                ) : (
                  <>
                    <Text className="text-white font-bold text-base mr-2">Login</Text>
                    <Ionicons name="log-in" size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Link */}
          <View className="px-6 mt-6">
            <View className="bg-[#393E46] rounded-2xl p-4 border border-[#00ADB5]/20">
              <View className="flex-row items-center justify-center">
                <Text className="text-white/70 text-sm mr-2">Don't have an account?</Text>
                <TouchableOpacity onPress={() => router.push('/signup')}>
                  <Text className="text-[#00ADB5] font-bold text-sm">Create account →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
