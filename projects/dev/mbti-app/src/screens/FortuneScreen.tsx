import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Share, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useMBTIStore } from '../store/mbtiStore';
import { getDailyFortune, toStars } from '../logic/getDailyFortune';
import { mbtiTypes } from '../data/mbtiTypes';
import { GradientBackground } from '../components/common/GradientBackground';
import { Colors } from '../constants/colors';

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarBg}>
        <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.scoreBarNum}>{score}</Text>
    </View>
  );
}

export function FortuneScreen() {
  const navigation = useNavigation<any>();
  const myMBTIType = useMBTIStore((s) => s.myMBTIType);
  const shareCardRef = useRef<View>(null);

  if (!myMBTIType) {
    return (
      <GradientBackground colors={['#0D0D1A', '#1A1A2E']}>
        <SafeAreaView style={styles.centered}>
          <Text style={styles.noTypeEmoji}>🔮</Text>
          <Text style={styles.noTypeText}>まずMBTI診断をしよう！</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('Quiz')}>
            <Text style={styles.startBtnText}>診断スタート</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const typeData = mbtiTypes[myMBTIType];
  const fortune = getDailyFortune(myMBTIType);
  const today = new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });

  const handleShare = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      if (Platform.OS !== 'web') {
        const { captureRef } = await import('react-native-view-shot');
        const { shareAsync, isAvailableAsync } = await import('expo-sharing');
        const uri = await captureRef(shareCardRef, { format: 'png', quality: 1.0 });
        const isAvailable = await isAvailableAsync();
        if (isAvailable) {
          await shareAsync(uri, { mimeType: 'image/png', dialogTitle: '今日の運勢をシェア！' });
          return;
        }
      }
      await Share.share({
        message: `今日の${myMBTIType}の運勢 ${toStars(fortune.overall)}\n恋愛:${toStars(fortune.love)} 仕事:${toStars(fortune.work)} 金運:${toStars(fortune.money)}\n#MBTI運勢 #${myMBTIType}`,
      });
    } catch {
      await Share.share({
        message: `今日の${myMBTIType}の運勢 ${toStars(fortune.overall)}\n恋愛:${toStars(fortune.love)} 仕事:${toStars(fortune.work)} 金運:${toStars(fortune.money)}\n#MBTI運勢 #${myMBTIType}`,
      });
    }
  };

  return (
    <GradientBackground colors={['#0D0D1A', '#1A1A2E']}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>🔮 今日の運勢</Text>
          <Text style={styles.dateText}>{today}</Text>

          {/* シェア用カード */}
          <View ref={shareCardRef} collapsable={false}>
            <LinearGradient colors={typeData.gradientColors} style={styles.shareCard}>
              <Text style={styles.shareCardTitle}>今日の{myMBTIType}の運勢</Text>
              <Text style={styles.shareCardStars}>{toStars(fortune.overall)}</Text>
              <Text style={styles.shareCardOverall}>{fortune.overallMessage}</Text>
              <View style={styles.shareCardRow}>
                <Text style={styles.shareCardMini}>💕 恋愛 {toStars(fortune.love)}</Text>
                <Text style={styles.shareCardMini}>💼 仕事 {toStars(fortune.work)}</Text>
                <Text style={styles.shareCardMini}>💰 金運 {toStars(fortune.money)}</Text>
              </View>
              <View style={styles.shareCardLucky}>
                <Text style={styles.shareCardLuckyText}>🎨 {fortune.luckyColor}  🍀 {fortune.luckyItem}  🔢 {fortune.luckyNumber}</Text>
              </View>
              <Text style={styles.shareCardHash}>#MBTI運勢  #{myMBTIType}</Text>
            </LinearGradient>
          </View>

          {/* 詳細スコア */}
          <View style={styles.detailCard}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>💕 恋愛運</Text>
              <ScoreBar score={fortune.love} color="#FF6B9D" />
            </View>
            <Text style={styles.scoreMessage}>{fortune.loveMessage}</Text>

            <View style={[styles.scoreRow, { marginTop: 16 }]}>
              <Text style={styles.scoreLabel}>💼 仕事運</Text>
              <ScoreBar score={fortune.work} color="#7B5EA7" />
            </View>
            <Text style={styles.scoreMessage}>{fortune.workMessage}</Text>

            <View style={[styles.scoreRow, { marginTop: 16 }]}>
              <Text style={styles.scoreLabel}>💰 金運</Text>
              <ScoreBar score={fortune.money} color="#F7B731" />
            </View>
            <Text style={styles.scoreMessage}>{fortune.moneyMessage}</Text>
          </View>

          {/* ラッキー情報 */}
          <View style={styles.luckyCard}>
            <Text style={styles.luckyTitle}>今日のラッキー</Text>
            <View style={styles.luckyGrid}>
              <View style={styles.luckyItem}>
                <Text style={styles.luckyEmoji}>🎨</Text>
                <Text style={styles.luckyItemLabel}>ラッキーカラー</Text>
                <Text style={styles.luckyItemValue}>{fortune.luckyColor}</Text>
              </View>
              <View style={styles.luckyItem}>
                <Text style={styles.luckyEmoji}>✨</Text>
                <Text style={styles.luckyItemLabel}>ラッキーアイテム</Text>
                <Text style={styles.luckyItemValue}>{fortune.luckyItem}</Text>
              </View>
              <View style={styles.luckyItem}>
                <Text style={styles.luckyEmoji}>🔢</Text>
                <Text style={styles.luckyItemLabel}>ラッキーナンバー</Text>
                <Text style={styles.luckyItemValue}>{fortune.luckyNumber}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤 今日の運勢をシェア</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.aiBtn}
            onPress={() => navigation.navigate('AIFortune')}
          >
            <Text style={styles.aiBtnText}>🤖 AIに詳しく占ってもらう</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  screenTitle: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  dateText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  noTypeEmoji: { fontSize: 64 },
  noTypeText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  startBtn: { backgroundColor: '#7B5EA7', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  shareCard: { borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20 },
  shareCardTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 8 },
  shareCardStars: { fontSize: 28, marginBottom: 8 },
  shareCardOverall: { color: '#fff', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 16, fontWeight: '500' },
  shareCardRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 },
  shareCardMini: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  shareCardLucky: { marginBottom: 12 },
  shareCardLuckyText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  shareCardHash: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  detailCard: {
    backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#2A2A4A',
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreLabel: { color: '#fff', fontSize: 14, fontWeight: '600', width: 80 },
  scoreBarContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreBarBg: { flex: 1, height: 8, backgroundColor: '#2A2A4A', borderRadius: 4 },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreBarNum: { color: Colors.textSecondary, fontSize: 12, width: 30, textAlign: 'right' },
  scoreMessage: { color: Colors.textMuted, fontSize: 12, marginTop: 6, lineHeight: 18 },
  luckyCard: {
    backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#2A2A4A',
  },
  luckyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  luckyGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  luckyItem: { alignItems: 'center', gap: 4 },
  luckyEmoji: { fontSize: 28 },
  luckyItemLabel: { color: Colors.textMuted, fontSize: 10 },
  luckyItemValue: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  shareBtn: { backgroundColor: '#7B5EA7', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 12 },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  aiBtn: {
    backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#2A2A4A',
  },
  aiBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
