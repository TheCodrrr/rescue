import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { 
  updateUser, 
  uploadProfileImage, 
  changePassword, 
  deleteUserAccount,
  logout,
} from '../../store/slices/authSlice';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState({ type: '', text: '' });

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Image upload state
  const [imageUploading, setImageUploading] = useState(false);

  // Initialize edit form with user data
  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || user.location || '',
      });
    }
  }, [user]);

  // User data with fallbacks
  const userData = user ? {
    name: user.name || 'Unknown User',
    email: user.email || 'No email provided',
    phone: user.phone || 'No phone provided',
    role: user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User',
    location: user.address || user.location || 'Address not specified',
    joinDate: user.createdAt 
      ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) 
      : 'Unknown',
    profileImage: user.profileImage || null,
    department: user.department || 'Emergency Response Team',
    clearanceLevel: user.user_level !== undefined 
      ? (user.user_level === 0 ? 'Basic Level' : `Level ${user.user_level}`)
      : (user.role === 'admin' ? 'Level 5' : user.role === 'officer' ? 'Level 3' : 'Basic Level'),
  } : null;

  // Handle edit profile
  const handleEditProfile = () => {
    setIsEditing(true);
    setUpdateMessage({ type: '', text: '' });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || user.location || '',
      });
    }
    setUpdateMessage({ type: '', text: '' });
  };

  const handleSaveProfile = async () => {
    setProfileUpdating(true);
    setUpdateMessage({ type: '', text: '' });

    try {
      await dispatch(updateUser(editForm)).unwrap();
      setUpdateMessage({ type: 'success', text: '✅ Profile updated successfully!' });
      setIsEditing(false);
      setTimeout(() => setUpdateMessage({ type: '', text: '' }), 3000);
    } catch (error: any) {
      setUpdateMessage({ type: 'error', text: error || 'Failed to update profile' });
    } finally {
      setProfileUpdating(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUploading(true);
        try {
          await dispatch(uploadProfileImage(result.assets[0].uri)).unwrap();
          setUpdateMessage({ type: 'success', text: '✅ Profile image updated!' });
          setTimeout(() => setUpdateMessage({ type: '', text: '' }), 3000);
        } catch (error: any) {
          setUpdateMessage({ type: 'error', text: error || 'Failed to upload image' });
        } finally {
          setImageUploading(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Handle password change
  const handleChangePassword = () => {
    setShowPasswordModal(true);
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handlePasswordSubmit = async () => {
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordUpdating(true);
    setPasswordError('');

    try {
      await dispatch(changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      })).unwrap();

      setPasswordSuccess('✅ Password changed successfully!');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordSuccess('');
      }, 2000);
    } catch (error: any) {
      setPasswordError(error || 'Failed to change password');
    } finally {
      setPasswordUpdating(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      await dispatch(deleteUserAccount()).unwrap();
      dispatch(logout());
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Error', error || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  if (!userData) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#00ADB5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View className="px-4 mb-6 pt-8">
          <View className="bg-[#393E46] rounded-3xl p-6 border border-[#00ADB5]/20">
            <View className="items-center">
              {/* Avatar */}
              <TouchableOpacity 
                onPress={handleImageUpload}
                disabled={imageUploading}
                className="relative mb-4"
              >
                <View className="w-28 h-28 rounded-full border-4 border-[#00ADB5] overflow-hidden bg-[#222831]">
                  {imageUploading ? (
                    <View className="w-full h-full items-center justify-center">
                      <ActivityIndicator size="large" color="#00ADB5" />
                    </View>
                  ) : userData.profileImage ? (
                    <Image 
                      source={{ uri: userData.profileImage }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-full items-center justify-center">
                      <Ionicons name="person" size={48} color="#00ADB5" />
                    </View>
                  )}
                </View>
                <View className="absolute bottom-0 right-0 bg-[#00ADB5] p-2 rounded-full">
                  <Ionicons name="camera" size={16} color="white" />
                </View>
              </TouchableOpacity>

              {/* Name & Role */}
              <Text className="text-white text-2xl font-bold mb-1">{userData.name}</Text>
              <View className="flex-row items-center mb-2">
                <View className="bg-[#00ADB5]/20 px-3 py-1 rounded-full">
                  <Text className="text-[#00ADB5] font-semibold text-sm">{userData.role}</Text>
                </View>
              </View>
              <Text className="text-[#EEEEEE]/60 text-sm">{userData.department}</Text>

              {/* Edit Button */}
              {!isEditing ? (
                <TouchableOpacity 
                  onPress={handleEditProfile}
                  className="mt-4 bg-[#00ADB5] px-6 py-2 rounded-full flex-row items-center"
                >
                  <Ionicons name="pencil" size={16} color="white" style={{ marginRight: 6 }} />
                  <Text className="text-white font-semibold">Edit Profile</Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row mt-4 gap-3">
                  <TouchableOpacity 
                    onPress={handleCancelEdit}
                    disabled={profileUpdating}
                    className="bg-[#222831] px-5 py-2 rounded-full flex-row items-center border border-[#EEEEEE]/30"
                  >
                    <Ionicons name="close" size={16} color="#EEEEEE" style={{ marginRight: 4 }} />
                    <Text className="text-[#EEEEEE] font-semibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleSaveProfile}
                    disabled={profileUpdating}
                    className="bg-[#10b981] px-5 py-2 rounded-full flex-row items-center"
                  >
                    {profileUpdating ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color="white" style={{ marginRight: 4 }} />
                        <Text className="text-white font-semibold">Save</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Update Message */}
        {updateMessage.text ? (
          <View className="px-4 mb-4">
            <View className={`p-3 rounded-xl ${updateMessage.type === 'success' ? 'bg-[#10b981]/20' : 'bg-[#ef4444]/20'}`}>
              <Text className={`text-center ${updateMessage.type === 'success' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {updateMessage.text}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Contact Information Card */}
        <View className="px-4 mb-6">
          <View className="bg-[#393E46] rounded-3xl p-5 border border-[#00ADB5]/20">
            <View className="flex-row items-center mb-4">
              <Ionicons name="mail" size={20} color="#93c5fd" style={{ marginRight: 8 }} />
              <Text className="text-white text-lg font-semibold">Contact Information</Text>
            </View>

            {/* Name */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="person" size={18} color="#fbbf24" style={{ marginRight: 8 }} />
                <Text className="text-[#EEEEEE]/60 text-sm">Full Name</Text>
              </View>
              {isEditing ? (
                <TextInput
                  value={editForm.name}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                  className="bg-[#222831] text-white px-4 py-3 rounded-xl border border-[#00ADB5]/30"
                  placeholderTextColor="#EEEEEE40"
                  placeholder="Enter your name"
                />
              ) : (
                <Text className="text-white text-base ml-7">{userData.name}</Text>
              )}
            </View>

            {/* Email */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="mail" size={18} color="#93c5fd" style={{ marginRight: 8 }} />
                <Text className="text-[#EEEEEE]/60 text-sm">Email</Text>
              </View>
              {isEditing ? (
                <TextInput
                  value={editForm.email}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
                  className="bg-[#222831] text-white px-4 py-3 rounded-xl border border-[#00ADB5]/30"
                  placeholderTextColor="#EEEEEE40"
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text className="text-white text-base ml-7">{userData.email}</Text>
              )}
            </View>

            {/* Phone */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="call" size={18} color="#86efac" style={{ marginRight: 8 }} />
                <Text className="text-[#EEEEEE]/60 text-sm">Phone</Text>
              </View>
              {isEditing ? (
                <TextInput
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
                  className="bg-[#222831] text-white px-4 py-3 rounded-xl border border-[#00ADB5]/30"
                  placeholderTextColor="#EEEEEE40"
                  placeholder="Enter your phone"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text className="text-white text-base ml-7">{userData.phone}</Text>
              )}
            </View>

            {/* Address */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="location" size={18} color="#fca5a5" style={{ marginRight: 8 }} />
                <Text className="text-[#EEEEEE]/60 text-sm">Address</Text>
              </View>
              {isEditing ? (
                <TextInput
                  value={editForm.address}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, address: text }))}
                  className="bg-[#222831] text-white px-4 py-3 rounded-xl border border-[#00ADB5]/30"
                  placeholderTextColor="#EEEEEE40"
                  placeholder="Enter your address"
                  multiline
                />
              ) : (
                <Text className="text-white text-base ml-7">{userData.location}</Text>
              )}
            </View>

            {/* Joined Date */}
            <View>
              <View className="flex-row items-center mb-2">
                <Ionicons name="calendar" size={18} color="#c4b5fd" style={{ marginRight: 8 }} />
                <Text className="text-[#EEEEEE]/60 text-sm">Joined</Text>
              </View>
              <Text className="text-white text-base ml-7">{userData.joinDate}</Text>
            </View>
          </View>
        </View>

        {/* Security & Access Card */}
        <View className="px-4 mb-6">
          <View className="bg-[#393E46] rounded-3xl p-5 border border-[#00ADB5]/20">
            <View className="flex-row items-center mb-4">
              <Ionicons name="shield-checkmark" size={20} color="#86efac" style={{ marginRight: 8 }} />
              <Text className="text-white text-lg font-semibold">Security & Access</Text>
            </View>

            {/* Clearance Level */}
            <View className="bg-[#222831] rounded-2xl p-4 mb-4 flex-row items-center">
              <View className="bg-[#00ADB5]/20 p-3 rounded-full mr-4">
                <Ionicons name="shield" size={24} color="#00ADB5" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-base">{userData.clearanceLevel}</Text>
                <Text className="text-[#EEEEEE]/60 text-sm">{userData.role} Access</Text>
              </View>
            </View>

            {/* Change Password */}
            <TouchableOpacity 
              onPress={handleChangePassword}
              className="bg-[#222831] rounded-2xl p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="bg-[#fbbf24]/20 p-3 rounded-full mr-4">
                  <Ionicons name="key" size={24} color="#fbbf24" />
                </View>
                <View>
                  <Text className="text-white font-semibold text-base">Password Security</Text>
                  <Text className="text-[#EEEEEE]/60 text-sm">Update your password</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#EEEEEE60" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone Card */}
        <View className="px-4 mb-[90px]">
          <View className="bg-[#393E46] rounded-3xl p-5 border border-[#ef4444]/30">
            <View className="flex-row items-center mb-4">
              <Ionicons name="warning" size={20} color="#ef4444" style={{ marginRight: 8 }} />
              <Text className="text-[#ef4444] text-lg font-semibold">Danger Zone</Text>
            </View>

            <TouchableOpacity 
              onPress={handleDeleteAccount}
              className="bg-[#ef4444]/10 rounded-2xl p-4 flex-row items-center justify-between border border-[#ef4444]/30"
            >
              <View className="flex-row items-center flex-1">
                <View className="bg-[#ef4444]/20 p-3 rounded-full mr-4">
                  <Ionicons name="trash" size={24} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#ef4444] font-semibold text-base">Delete Account</Text>
                  <Text className="text-[#EEEEEE]/60 text-sm">Permanently delete your account</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-[#393E46] rounded-3xl p-6 w-full max-w-md border border-[#00ADB5]/20">
            {/* Header */}
            <View className="items-center mb-6">
              <View className="bg-[#fbbf24]/20 p-4 rounded-full mb-3">
                <Ionicons name="key" size={32} color="#fbbf24" />
              </View>
              <Text className="text-white text-xl font-bold">Change Password</Text>
              <Text className="text-[#EEEEEE]/60 text-sm">Update your account password</Text>
            </View>

            {/* Form */}
            <View className="mb-4">
              <Text className="text-[#EEEEEE]/80 text-sm mb-2">Current Password</Text>
              <TextInput
                value={passwordForm.oldPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, oldPassword: text }))}
                className="bg-[#222831] text-white px-4 py-3 rounded-xl border border-[#00ADB5]/30"
                placeholderTextColor="#EEEEEE40"
                placeholder="Enter current password"
                secureTextEntry
              />
            </View>

            <View className="mb-4">
              <Text className="text-[#EEEEEE]/80 text-sm mb-2">New Password</Text>
              <TextInput
                value={passwordForm.newPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, newPassword: text }))}
                className="bg-[#222831] text-white px-4 py-3 rounded-xl border border-[#00ADB5]/30"
                placeholderTextColor="#EEEEEE40"
                placeholder="Enter new password (min 6 characters)"
                secureTextEntry
              />
            </View>

            <View className="mb-6">
              <Text className="text-[#EEEEEE]/80 text-sm mb-2">Confirm New Password</Text>
              <TextInput
                value={passwordForm.confirmPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text }))}
                className="bg-[#222831] text-white px-4 py-3 rounded-xl border border-[#00ADB5]/30"
                placeholderTextColor="#EEEEEE40"
                placeholder="Confirm new password"
                secureTextEntry
              />
            </View>

            {/* Error/Success Messages */}
            {passwordError ? (
              <View className="bg-[#ef4444]/20 p-3 rounded-xl mb-4">
                <Text className="text-[#ef4444] text-center">{passwordError}</Text>
              </View>
            ) : null}

            {passwordSuccess ? (
              <View className="bg-[#10b981]/20 p-3 rounded-xl mb-4">
                <Text className="text-[#10b981] text-center">{passwordSuccess}</Text>
              </View>
            ) : null}

            {/* Actions */}
            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => setShowPasswordModal(false)}
                disabled={passwordUpdating}
                className="flex-1 bg-[#222831] py-3 rounded-xl border border-[#EEEEEE]/30"
              >
                <Text className="text-[#EEEEEE] text-center font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handlePasswordSubmit}
                disabled={passwordUpdating || !passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className={`flex-1 py-3 rounded-xl ${passwordUpdating ? 'bg-[#00ADB5]/50' : 'bg-[#00ADB5]'}`}
              >
                {passwordUpdating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white text-center font-semibold">Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-[#393E46] rounded-3xl p-6 w-full max-w-md border border-[#ef4444]/30">
            {/* Header */}
            <View className="items-center mb-6">
              <View className="bg-[#ef4444]/20 p-4 rounded-full mb-3">
                <Ionicons name="warning" size={32} color="#ef4444" />
              </View>
              <Text className="text-white text-xl font-bold">Delete Account</Text>
              <Text className="text-[#EEEEEE]/60 text-sm text-center mt-2">
                Are you sure you want to delete your account? This action cannot be undone.
              </Text>
            </View>

            {/* Warning Box */}
            <View className="bg-[#ef4444]/10 p-4 rounded-xl mb-6 border border-[#ef4444]/30">
              <Text className="text-[#ef4444] text-sm text-center">
                All your data, including complaints, history, and personal information will be permanently deleted.
              </Text>
            </View>

            {/* Actions */}
            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 bg-[#222831] py-3 rounded-xl border border-[#EEEEEE]/30"
              >
                <Text className="text-[#EEEEEE] text-center font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleConfirmDelete}
                disabled={isDeleting}
                className={`flex-1 py-3 rounded-xl ${isDeleting ? 'bg-[#ef4444]/50' : 'bg-[#ef4444]'}`}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white text-center font-semibold">Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
