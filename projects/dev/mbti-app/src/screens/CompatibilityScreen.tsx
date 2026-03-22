import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useMBTIStore } from '../store/mbtiStore';
import { mbtiTypes } from '../data/mbtiTypes';
import { GradientBackground } from '../components/common/GradientBackground';
import { MBTIType } from '../types';
import { Colors } from '../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

const ALL_TYPES: MBTIType[] = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
];

function TypeGrid({ selected, onSelect, label }: {
  selected: MBTIType | null;
  onSelect: (t: MBTIType) => void;
  label: string;
}) {
  return (
    <View>
      <Text style={styles.selectorLabel}>{label}</Text>
      <View style={styles.typeGrid}>
        {ALL_TYPES.map((t) => {
          const td = mbtiTypes[t];
          const isSelected = selected === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => { Haptics.selectionAsync(); onSelect(t); }}
              activeOpacity={0.7}
            >
              {isSelected ? (
                <LinearGradient colors={td.gradientColors} style={styles.typeBtn}>
                  <Text style={styles.typeBtnEmoji}>{td.emoji}</Text>
                  <Text style={[styles.typeBtnText, { color: '#fff' }]}>{t}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.typeBtn, styles.typeBtnUnselected]}>
                  <Text style={styles.typeBtnEmoji}>{td.emoji}</Text>
                  <Text style={styles.typeBtnText}>{t}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function CompatibilityScreen() {
  const navigation = useNavigation<any>();
  const myMBTIType = useMBTIStore((s) => s.myMBTIType);
  const [typeA, setTypeA] = useState<MBTIType | null>(myMBTIType);
  const [typeB, setTypeB] = useState<MBTIType | null>(null);

  const canCheck = typeA && typeB && typeA !== typeB;

  return (
    <GradientBackground colors={['#0D0D1A', '#1A1A2E']}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>💕 恋愛相性チェック</Text>
          <Text style={styles.subtitle}>2つのMBTIタイプを選んで相性を診断</Text>

          <TypeGrid selected={typeA} onSelect={setTypeA} label="① あなたのタイプ" />
          <TypeGrid selected={typeB} onSelect={setTypeB} label="② 相手のタイプ" />

          {/* 結果表示 */}
          {typeA && typeB && (
            <View style={styles.selectedSummary}>
              <Text style={styles.selectedText}>
                {typeA} {mbtiTypes[typeA].emoji}  ×  {typeB} {mbtiTypes[typeB].emoji}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.checkBtn, !canCheck && styles.checkBtnDisabled]}
            onPress={() => {
              if (!canCheck) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('CompatibilityResult', { typeA, typeB });
            }}
            disabled={!canCheck}
          >
            <Text style={styles.checkBtnText}>💕 相性を診断する</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 20 },
  screenTitle: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
  selectorLabel: { color: Colors.textSecondary, fontSize: 14, fontWeight: '700', marginBottom: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    width: 74, height: 74, borderRadius: 14, alignItems: 'center',
    justifyContent: 'center', gap: 2,
  },
  typeBtnUnselected: { backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#2A2A4A' },
  typeBtnEmoji: { fontSize: 22 },
  typeBtnText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700' },
  selectedSummary: {
    backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#7B5EA7',
  },
  selectedText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  checkBtn: { backgroundColor: '#7B5EA7', borderRadius: 16, padding: 18, alignItems: 'center' },
  checkBtnDisabled: { opacity: 0.4 },
  checkBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
