import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, Modal, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';
import * as Notifications from 'expo-notifications';
import { requestPermissions } from '@/utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

function NativeTabLayout() {
  const { t } = useTranslation();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="tasks">
        <Icon sf={{ default: 'checkmark.circle', selected: 'checkmark.circle.fill' }} />
        <Label>{t('tabs.tasks')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="log">
        <Icon sf={{ default: 'list.bullet', selected: 'list.bullet' }} />
        <Label>{t('tabs.log')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>{t('tabs.home')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="roadmap">
        <Icon sf={{ default: 'map', selected: 'map.fill' }} />
        <Label>{t('tabs.roadmap')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>{t('tabs.profile')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const { t } = useTranslation();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : Colors.surface,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: Colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="tasks"
        options={{
          title: t('tabs.tasks'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: t('tabs.log'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'list' : 'list-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="roadmap"
        options={{
          title: t('tabs.roadmap'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    if (Platform.OS === 'web') return;
    try {
      const hasAsked = await AsyncStorage.getItem('@smokepace_asked_notifications');
      const { status } = await Notifications.getPermissionsAsync();
      
      if (status !== 'granted' && hasAsked !== 'true') {
        setShowGate(true);
      }
    } catch (e) {
      console.warn('Error checking notifications:', e);
    }
  };

  const handleAllowClick = async () => {
    await requestPermissions();
    await AsyncStorage.setItem('@smokepace_asked_notifications', 'true');
    setShowGate(false);
  };

  const handleSkipClick = async () => {
    await AsyncStorage.setItem('@smokepace_asked_notifications', 'true');
    setShowGate(false);
  };

  const NotificationGate = () => (
    <Modal visible={showGate} animationType="slide" presentationStyle="pageSheet" transparent={false}>
      <View style={gateStyles.container}>
        <View style={gateStyles.iconContainer}>
          <Ionicons name="notifications" size={64} color={Colors.accent} />
        </View>
        
        <Text style={gateStyles.title}>{t('notifications.setup.title')}</Text>
        <Text style={gateStyles.desc}>{t('notifications.setup.desc')}</Text>
        
        <View style={gateStyles.spacer} />
        
        <TouchableOpacity style={gateStyles.allowBtn} onPress={handleAllowClick}>
          <Text style={gateStyles.allowBtnText}>{t('notifications.setup.allow')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={gateStyles.skipBtn} onPress={handleSkipClick}>
          <Text style={gateStyles.skipBtnText}>{t('notifications.setup.skip')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  return (
    <>
      <NotificationGate />
      {isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />}
    </>
  );
}

const gateStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(52, 211, 153, 0.15)', // Light accent
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  desc: {
    fontSize: 16,
    color: Colors.textSub,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  spacer: {
    height: 40,
  },
  allowBtn: {
    backgroundColor: Colors.accent,
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  allowBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  skipBtn: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipBtnText: {
    color: Colors.textSub,
    fontSize: 16,
    fontWeight: '500',
  },
});
