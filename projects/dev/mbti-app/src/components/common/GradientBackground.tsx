import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  colors?: [string, string];
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GradientBackground({ colors = ['#0D0D1A', '#1A1A2E'], children, style }: Props) {
  return (
    <LinearGradient colors={colors} style={[styles.container, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
