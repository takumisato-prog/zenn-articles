import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { zodiacSigns } from '../data/zodiac';
import { useMBTIStore } from '../store/mbtiStore';
import { GradientBackground } from '../components/common/GradientBackground';
import { ZodiacSign } from '../types';
import { Colors } from '../constants/colors';

export function ZodiacScreen() {
  const navigation = useNavigation<any>();
  const { myMBTIType, myZodiacSign, setZodiacSign } = useMBTIStore();

  const handleSelect = async (sign: ZodiacSign) => {
    await setZodiacSign(sign);
    if (myMBTIType) {
      navigation.navigate('ZodiacResult', { mbtiType: myMBTIType, zodiacSign: sign });
    } else {
      navigation.navigate('Quiz');
    }
  };

  return (
    <GradientBackground colors={['#0D0D1A', '#1A1A2E']}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>＜</Text>
          </TouchableOpacity>
          <Text style={styles.title}>⭐ 星座を選んで</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>あなたの星座はどれ？</Text>

        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {zodiacSigns.map((z) => (
            <TouchableOpacity
              key={z.sign}
              style={[
                styles.zodiacBtn,
                myZodiacSign === z.sign && styles.selectedBtn,
              ]}
              onPress={() => handleSelect(z.sign as ZodiacSign)}
              activeOpacity={0.7}
            >
              <Text style={styles.zodiacEmoji}>{z.emoji}</Text>
              <Text style={styles.zodiacName}>{z.nameJP}</Text>
              <Text style={styles.zodiacDate}>{z.dateRange}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 20 },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  subtitle: { color: Colors.textMuted, textAlign: 'center', fontSize: 13, marginBottom: 20 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16,
    gap: 12, paddingBottom: 40, justifyContent: 'center',
  },
  zodiacBtn: {
    width: '28%', backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#2A2A4A',
  },
  selectedBtn: { borderColor: '#7B5EA7', backgroundColor: '#252540' },
  zodiacEmoji: { fontSize: 32, marginBottom: 6 },
  zodiacName: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  zodiacDate: { color: Colors.textMuted, fontSize: 9, textAlign: 'center' },
});
