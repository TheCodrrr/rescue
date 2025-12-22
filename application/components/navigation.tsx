import { useRouter, usePathname } from 'expo-router';
import { View, Image, TouchableOpacity, Animated, StyleSheet, Dimensions, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../store/hooks';
import { useState, useRef, useMemo } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CENTER_BUTTON_SIZE = 60;
const MENU_ITEM_SIZE = 50;
const RADIUS = 100; // Distance from center to menu items
// No paging, show all

type NavItem = {
  name: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function Navigation() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const pathname = usePathname();

  // Define navigation items based on auth state and role
  const navItems = useMemo((): NavItem[] => {
    // Logged out - 4 buttons
    if (!isAuthenticated) {
      return [
        { name: 'Home', route: '/', icon: 'home' },
        { name: 'Complaint', route: '/complain', icon: 'document-text' },
        { name: 'Trending', route: '/trending', icon: 'trending-up' },
        { name: 'Help', route: '/help', icon: 'help-circle' },
      ];
    }

    // Officer - 7 buttons
    if (user?.role === 'officer' || user?.role === 'admin') {
      return [
        { name: 'Home', route: '/', icon: 'home' },
        { name: 'Complaint', route: '/complain', icon: 'document-text' },
        { name: 'Department', route: '/department', icon: 'business' },
        { name: 'Escalations', route: '/escalations', icon: 'alert-circle' },
        { name: 'Analytics', route: '/analytics', icon: 'stats-chart' },
        { name: 'Teams', route: '/teams', icon: 'people' },
        { name: 'Profile', route: '/user', icon: 'person' },
      ];
    }

    // Citizen (logged in) - 5 buttons
    return [
      { name: 'Home', route: '/', icon: 'home' },
      { name: 'Complaint', route: '/complain', icon: 'document-text' },
      { name: 'Trending', route: '/trending', icon: 'trending-up' },
      { name: 'Help', route: '/help', icon: 'help-circle' },
      { name: 'Profile', route: '/user', icon: 'person' },
    ];
  }, [isAuthenticated, user?.role]);

  // Show all nav items in a circle
  const visibleItems = navItems;

  const toggleMenu = () => {
    const toValue = isMenuOpen ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    if (isMenuOpen) {
      Animated.spring(animation, {
        toValue: 0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();
      setIsMenuOpen(false);
    }
  };

  // No pan responder, no rotation

  const handleNavigation = (route: string) => {
    closeMenu();
    router.push(route as any);
  };

  // Calculate position for each menu item in a full circle
  const getMenuItemStyle = (index: number, total: number) => {
    // Spread items in a full circle (0 to 2PI)
    const angleStep = (2 * Math.PI) / total;
    const angle = -Math.PI / 2 + angleStep * index; // Start from top, go clockwise
    const x = Math.cos(angle) * RADIUS;
    const y = Math.sin(angle) * RADIUS;

    const translateX = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, x],
    });

    const translateY = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, y],
    });

    const scale = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const opacity = animation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0, 1],
    });

    return {
      transform: [{ translateX }, { translateY }, { scale }],
      opacity,
    };
  };

  // Check if route is active
  const isRouteActive = (route: string) => {
    if (route === '/') return pathname === '/' || pathname === '/index';
    return pathname === route || pathname.startsWith(route + '/');
  };

  // Rotation for the center button
  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  // Background overlay opacity
  const overlayOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  // Page indicator position (below center button)
  const indicatorOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      {/* Overlay when menu is open */}
      {/* Floating Navigation Container (always on top, always pointerEvents auto) */}
      <View
        style={styles.navContainer}
        pointerEvents="auto"
      >
        {/* All Menu Items in a circle */}
        {visibleItems.map((item, index) => (
          <Animated.View
            key={item.name}
            style={[
              styles.menuItem,
              getMenuItemStyle(index, visibleItems.length),
            ]}
          >
            <TouchableOpacity
              style={[
                styles.menuButton,
                isRouteActive(item.route) && styles.menuButtonActive,
              ]}
              onPress={() => handleNavigation(item.route)}
              activeOpacity={0.8}
            >
              {item.name === 'Profile' && user?.profileImage ? (
                <Image
                  source={{ uri: user.profileImage, cache: 'reload' }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={isRouteActive(item.route) ? '#FFFFFF' : '#EEEEEE'}
                />
              )}
            </TouchableOpacity>
            {/* Item label */}
            <Animated.Text 
              style={[
                styles.itemLabel,
                { opacity: animation }
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Animated.Text>
          </Animated.View>
        ))}

        {/* Center Button */}
        <TouchableOpacity
          style={styles.centerButton}
          onPress={toggleMenu}
          activeOpacity={0.9}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons
              name={isMenuOpen ? 'close' : 'add'}
              size={30}
              color="#FFFFFF"
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Overlay when menu is open (below navContainer) */}
      {isMenuOpen && (
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
          pointerEvents="auto"
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeMenu}
          />
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 998,
  },
  navContainer: {
    position: 'absolute',
    bottom: 30,
    left: SCREEN_WIDTH / 2 - CENTER_BUTTON_SIZE / 2,
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  centerButton: {
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    backgroundColor: '#00ADB5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ADB5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  menuItem: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    width: MENU_ITEM_SIZE,
    height: MENU_ITEM_SIZE,
    borderRadius: MENU_ITEM_SIZE / 2,
    backgroundColor: 'rgba(57, 62, 70, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  menuButtonActive: {
    backgroundColor: '#00ADB5',
    borderColor: '#00ADB5',
    shadowColor: '#00ADB5',
    shadowOpacity: 0.5,
  },
  profileImage: {
    width: MENU_ITEM_SIZE - 4,
    height: MENU_ITEM_SIZE - 4,
    borderRadius: (MENU_ITEM_SIZE - 4) / 2,
  },
  itemLabel: {
    color: '#EEEEEE',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  pageIndicatorsContainer: {
    position: 'absolute',
    bottom: -40,
    alignItems: 'center',
    width: '100%',
  },
  pageIndicators: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  pageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(238, 238, 238, 0.4)',
  },
  pageIndicatorActive: {
    backgroundColor: '#00ADB5',
    width: 12,
  },
});
