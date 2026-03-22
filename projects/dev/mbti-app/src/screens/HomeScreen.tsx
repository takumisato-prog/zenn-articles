import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useMBTIStore } from '../store/mbtiStore';
import { mbtiTypes } from '../data/mbtiTypes';
import { getDailyFortune, toStars } from '../logic/getDailyFortune';
import { GradientBackground } from '../components/common/GradientBackground';
import { Colors } from '../constants/colors';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const myMBTIType = useMBTIStore((s) => s.myMBTIType);
  const typeData = myMBTIType ? mbtiTypes[myMBTIType] : null;
  const fortune = myMBTIType ? getDailyFortune(myMBTIType) : null;
  const today = new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <GradientBackground colors={['#0D0D1A', '#1A1A2E']}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.appName}>✨ MBTI占い</Text>
            <Text style={styles.dateText}>{today}</Text>
          </View>

          {/* 診断済みの場合 */}
          {typeData && fortune ? (
            <>
              {/* タイプカード */}
              <TouchableOpacity
                onPress={() => { Haptics.selectionAsync(); navigation.navigate('Result', { mbtiType: myMBTIType }); }}
                activeOpacity={0.85}
              >
                <LinearGradient colors={typeData.gradientColors} style={styles.typeCard}>
                  <Text style={styles.typeCardLabel}>あなたは</Text>
                  <Text style={styles.typeCardEmoji}>{typeData.emoji}</Text>
                  <Text style={styles.typeCardType}>{myMBTIType}</Text>
                  <Text style={styles.typeCardNickname}>{typeData.nickname}</Text>
                  <Text style={styles.typeCardArrow}>結果を詳しく見る →</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* 今日の運勢サマリ */}
              <TouchableOpacity
                style={styles.fortuneSummary}
                onPress={() => navigation.navigate('Fortune')}
                activeOpacity={0.85}
              >
                <View style={styles.fortuneSummaryHeader}>
                  <Text style={styles.fortuneSummaryTitle}>🔮 今日の運勢</Text>
                  <Text style={styles.fortuneSummaryArrow}>→</Text>
                </View>
                <Text style={styles.fortuneSummaryStars}>{toStars(fortune.overall)}</Text>
                <Text style={styles.fortuneSummaryMsg}>{fortune.overallMessage}</Text>
                <View style={styles.fortuneRow}>
                  <Text style={styles.fortuneItem}>💕 {toStars(fortune.love)}</Text>
                  <Text style={styles.fortuneItem}>💼 {toStars(fortune.work)}</Text>
                  <Text style={styles.fortuneItem}>💰 {toStars(fortune.money)}</Text>
                </View>
              </TouchableOpacity>

              {/* メニューグリッド */}
              <View style={styles.menuGrid}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => navigation.navigate('ZodiacPicker')}
                >
                  <Text style={styles.menuEmoji}>⭐</Text>
                  <Text style={styles.menuTitle}>星座占い</Text>
                  <Text style={styles.menuSub}>MBTI×星座</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => navigation.navigate('Compatibility')}
                >
                  <Text style={styles.menuEmoji}>💕</Text>
                  <Text style={styles.menuTitle}>相性チェック</Text>
                  <Text style={styles.menuSub}>恋愛相性診断</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => navigation.navigate('AIFortune')}
                >
                  <Text style={styles.menuEmoji}>🤖</Text>
                  <Text style={styles.menuTitle}>AI占い</Text>
                  <Text style={styles.menuSub}>Claude AI</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { Haptics.selectionAsync(); navigation.navigate('Quiz'); }}
                >
                  <Text style={styles.menuEmoji}>🔄</Text>
                  <Text style={styles.menuTitle}>再診断</Text>
                  <Text style={styles.menuSub}>もう一度やる</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* 未診断の場合 */
            <View style={styles.noDiagContainer}>
              <Text style={styles.noDiagEmoji}>🔮</Text>
              <Text style={styles.noDiagTitle}>あなたのMBTIを\n診断しよう！</Text>
              <Text style={styles.noDiagSub}>20問の質問に答えるだけ。\n16タイプのどれかが分かります。</Text>
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('Quiz'); }}
              >
                <LinearGradient colors={['#7B5EA7', '#9B7DC7']} style={styles.startBtnGrad}>
                  <Text style={styles.startBtnText}>✨ 診断スタート</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* 機能紹介 */}
              <View style={styles.featureList}>
                {[
                  { emoji: '🔮', text: 'MBTI診断（20問）' },
                  { emoji: '🌟', text: '今日の運勢（毎日更新）' },
                  { emoji: '⭐', text: 'MBTI×星座占い（192通り）' },
                  { emoji: '💕', text: '恋愛相性チェック' },
                  { emoji: '🤖', text: 'AI個別占い（Claude AI）' },
                ].map((f) => (
                  <View key={f.text} style={styles.featureItem}>
                    <Text style={styles.featureEmoji}>{f.emoji}</Text>
                    <Text style={styles.featureText}>{f.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 },
  appName: { color: '#fff', fontSize: 22, fontWeight: '900' },
  dateText: { color: Colors.textMuted, fontSize: 12 },
  typeCard: { borderRadius: 24, padding: 28, alignItems: 'center' },
  typeCardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  typeCardEmoji: { fontSize: 56, marginVertical: 8 },
  typeCardType: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: 4 },
  typeCardNickname: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600', marginTop: 4 },
  typeCardArrow: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 16 },
  fortuneSummary: {
    backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#2A2A4A',
  },
  fortuneSummaryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  fortuneSummaryTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  fortuneSummaryArrow: { color: Colors.textMuted, fontSize: 16 },
  fortuneSummaryStars: { fontSize: 22, marginBottom: 6 },
  fortuneSummaryMsg: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 12 },
  fortuneRow: { flexDirection: 'row', gap: 12 },
  fortuneItem: { color: Colors.textMuted, fontSize: 11 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuItem: {
    width: '47%', backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#2A2A4A',
  },
  menuEmoji: { fontSize: 32 },
  menuTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  menuSub: { color: Colors.textMuted, fontSize: 10 },
  noDiagContainer: { alignItems: 'center', paddingTop: 20, gap: 16 },
  noDiagEmoji: { fontSize: 80 },
  noDiagTitle: { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center', lineHeight: 36 },
  noDiagSub: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  startBtn: { width: '100%' },
  startBtnGrad: { borderRadius: 20, padding: 20, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  featureList: {
    width: '100%', backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20,
    gap: 12, borderWidth: 1, borderColor: '#2A2A4A',
  },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureEmoji: { fontSize: 20, width: 28 },
  featureText: { color: Colors.textSecondary, fontSize: 14 },
});
