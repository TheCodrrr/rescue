import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// FAQ data
const faqs = [
  {
    question: 'How do I file a complaint?',
    answer: 'To file a complaint, log in to your account and tap the "Complaint" tab in the bottom navigation. Fill in all the required details including title, description, category, location, and optionally add evidence files.',
  },
  {
    question: 'How long does it take to resolve a complaint?',
    answer: 'Resolution time varies depending on the severity and category of your complaint. Low severity issues typically take 7-14 days, medium severity 3-7 days, and high severity issues are prioritized for immediate action.',
  },
  {
    question: 'Can I track my complaint status?',
    answer: 'Yes! Go to your Profile and tap "My Complaints" to see all your submitted complaints along with their current status (Pending, In Progress, Resolved, or Rejected).',
  },
  {
    question: 'What categories of complaints can I file?',
    answer: 'You can file complaints under Rail Incidents, Road Issues, Fire Emergency, Cyber Crime, Police, and Court categories.',
  },
  {
    question: 'How do I upload evidence?',
    answer: 'While filing a complaint, scroll to the "Evidence" section and tap to select images or videos from your gallery. You can upload up to 5 files per complaint.',
  },
  {
    question: 'What is the Trending section?',
    answer: 'The Trending section shows complaints that are gaining attention based on upvotes, comments, and recent activity. You can upvote complaints you find important.',
  },
  {
    question: 'Can I delete my complaint?',
    answer: 'Yes, you can delete your own complaints from the complaint detail page by tapping the trash icon. Note that this action cannot be undone.',
  },
];

// Emergency contacts
const emergencyContacts = [
  { name: 'Police', number: '100', icon: 'shield', color: '#3b82f6' },
  { name: 'Fire', number: '101', icon: 'flame', color: '#ef4444' },
  { name: 'Ambulance', number: '102', icon: 'medkit', color: '#10b981' },
  { name: 'Railway', number: '139', icon: 'train', color: '#f59e0b' },
  { name: 'Women Helpline', number: '181', icon: 'people', color: '#db2777' },
  { name: 'Cyber Crime', number: '1930', icon: 'warning', color: '#8b5cf6' },
];

export default function HelpScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#222831] pt-7">
      <StatusBar barStyle="light-content" backgroundColor="#222831" />

      {/* Header */}
      <View className="px-4 py-3 pt-8 border-b border-[#393E46]">
        <Text className="text-white text-xl font-bold text-center">Help & Support</Text>
        <Text className="text-[#EEEEEE]/60 text-sm text-center mt-1">
          Find answers and emergency contacts
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Emergency Contacts */}
        <View className="px-4 mt-6">
          <Text className="text-white text-lg font-bold mb-4">🚨 Emergency Contacts</Text>
          <View className="flex-row flex-wrap gap-3">
            {emergencyContacts.map((contact, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleCall(contact.number)}
                className="bg-[#393E46] rounded-xl p-4 border border-[#00ADB5]/20"
                style={{ width: '47%' }}
              >
                <View className="flex-row items-center">
                  <View
                    style={{ backgroundColor: `${contact.color}20` }}
                    className="p-2 rounded-lg mr-3"
                  >
                    <Ionicons name={contact.icon as any} size={20} color={contact.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">{contact.name}</Text>
                    <Text className="text-[#00ADB5] font-bold">{contact.number}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQs */}
        <View className="px-4 mt-8">
          <Text className="text-white text-lg font-bold mb-4">❓ Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="bg-[#393E46] rounded-xl mb-3 overflow-hidden border border-[#00ADB5]/10"
            >
              <View className="p-4 flex-row items-center justify-between">
                <Text className="text-white font-medium flex-1 mr-2">{faq.question}</Text>
                <Ionicons
                  name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#00ADB5"
                />
              </View>
              {expandedIndex === index && (
                <View className="px-4 pb-4 pt-0">
                  <View className="h-px bg-[#222831] mb-3" />
                  <Text className="text-[#EEEEEE]/80 leading-5">{faq.answer}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Support */}
        <View className="px-4 mt-8">
          <Text className="text-white text-lg font-bold mb-4">📧 Contact Support</Text>
          <View className="bg-[#393E46] rounded-xl p-4 border border-[#00ADB5]/20">
            <Text className="text-[#EEEEEE]/80 mb-4">
              Need more help? Reach out to our support team and we'll get back to you as soon as possible.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:support@rescue.app')}
              className="bg-[#00ADB5] py-3 rounded-xl flex-row items-center justify-center"
            >
              <Ionicons name="mail" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Email Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Version */}
        <View className="items-center mt-8 mb-4">
          <Text className="text-[#EEEEEE]/40 text-sm">Rescue App v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
