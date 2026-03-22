import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { FortuneScreen } from '../screens/FortuneScreen';
import { CompatibilityScreen } from '../screens/CompatibilityScreen';
import { Colors } from '../constants/colors';

const Tab = createBottomTabNavigator();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 26 : 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'ホーム',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Fortune"
        component={FortuneScreen}
        options={{
          tabBarLabel: '占い',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔮" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Compatibility"
        component={CompatibilityScreen}
        options={{
          tabBarLabel: '相性',
          tabBarIcon: ({ focused }) => <TabIcon icon="💕" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0D0D1A',
    borderTopColor: '#2A2A4A',
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
    height: 70,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
