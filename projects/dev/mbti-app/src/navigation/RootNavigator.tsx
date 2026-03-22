import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TabNavigator } from './TabNavigator';
import { QuizScreen } from '../screens/QuizScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { ZodiacResultScreen } from '../screens/ZodiacResultScreen';
import { CompatibilityResultScreen } from '../screens/CompatibilityResultScreen';
import { AIFortuneScreen } from '../screens/AIFortuneScreen';
import { ZodiacScreen } from '../screens/ZodiacScreen';
import { useMBTIStore } from '../store/mbtiStore';
import { MBTIType, ZodiacSign } from '../types';

export type RootStackParamList = {
  Main: undefined;
  Quiz: undefined;
  Result: { mbtiType: MBTIType };
  ZodiacPicker: undefined;
  ZodiacResult: { mbtiType: MBTIType; zodiacSign: ZodiacSign };
  CompatibilityResult: { typeA: MBTIType; typeB: MBTIType };
  AIFortune: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const loadSavedData = useMBTIStore((s) => s.loadSavedData);

  useEffect(() => {
    loadSavedData();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="ZodiacPicker" component={ZodiacScreen} />
        <Stack.Screen name="ZodiacResult" component={ZodiacResultScreen} />
        <Stack.Screen name="CompatibilityResult" component={CompatibilityResultScreen} />
        <Stack.Screen name="AIFortune" component={AIFortuneScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
