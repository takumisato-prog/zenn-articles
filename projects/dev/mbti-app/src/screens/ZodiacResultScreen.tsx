import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Share,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { getZodiacMBTIReading } from '../data/zodiacMbti';
import { zodiacSigns } from '../data/zodiac';
import { mbtiTypes } from '../data/mbtiTypes';
import { GradientBackground } from '../components/common/GradientBackground';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors } from '../constants/colors';

type ZodiacResultRoute = RouteProp<RootStackParamList, 'ZodiacResult'>;

function ScoreCircle({ score }: { score: number }) {
  const stars = Math.round(score / 20);
  return (
    <View style={styles.scoreCircle}>
      <Text style={styles.scoreNum}>{score}</Text>
      <Text style={styles.scoreMax}>/100</Text>
      <Text style={styles.scoreStars}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</Text>
    </View>
  );
}

export function ZodiacResultScreen() {
  const route = useRoute<ZodiacResultRoute>();
  const navigation = useNavigation<any>();
  const { mbtiType, zodiacSign } = route.params;
  const reading = getZodiacMBTIReading(mbtiType, zodiacSign);
  const typeData = mbtiTypes[mbtiType];
  const zodiacData = zodiacSigns.find((z) => z.sign === zodiacSign)!;
  const shareCardRef = useRef<View>(null);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1.0 });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      }
    } catch {
      await Share.share({
        message: `${mbtiType}×${zodiacData.nameJP}の占い 総合運${reading.score}点\n${reading.overall.slice(0, 50)}...\n#MBTI星座占い #${mbtiType} #${zodiacData.nameJP}`,
      });
    }
  };

  return (
    <GradientBackground colors={['#0D0D1A', '#1A1A2E']}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>＜</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{zodiacData.emoji} 星座占い</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* シェア用カード */}
          <View ref={shareCardRef} collapsable={false}>
            <LinearGradient colors={typeData.gradientColors} style={styles.shareCard}>
              <Text style={styles.shareCardCombo}>
                {mbtiType}  ×  {zodiacData.emoji}{zodiacData.nameJP}
              </Text>
              <Text style={styles.shareCardTitle}>今月の運勢</Text>
              <ScoreCircle score={reading.score} />
              <Text style={styles.shareCardOverall}>{reading.overall}</Text>
              <View style={styles.shareCardLucky}>
                <Text style={styles.shareCardLuckyText}>
                  🎨 {reading.luckyColor}  ✨ {reading.luckyItem}
                </Text>
              </View>
              <Text style={styles.shareCardHash}>#MBTI星座占い  #{mbtiType}  #{zodiacData.nameJP}</Text>
            </LinearGradient>
          </View>

          {/* 詳細 */}
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>💕 恋愛傾向</Text>
            <Text style={styles.sectionText}>{reading.love}</Text>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>💼 仕事傾向</Text>
            <Text style={styles.sectionText}>{reading.work}</Text>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>🌟 今月のアドバイス</Text>
            <Text style={styles.sectionText}>{reading.advice}</Text>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤 占い結果をシェア</Text>
          </TouchableOpacity>
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
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  shareCard: { borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20 },
  shareCardCombo: { color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  shareCardTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 12 },
  scoreCircle: { alignItems: 'center', marginBottom: 16 },
  scoreNum: { color: '#fff', fontSize: 56, fontWeight: '900', lineHeight: 60 },
  scoreMax: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  scoreStars: { fontSize: 20, marginTop: 4 },
  shareCardOverall: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  shareCardLucky: { marginBottom: 8 },
  shareCardLuckyText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  shareCardHash: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  detailCard: {
    backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: '#2A2A4A',
  },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  sectionText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22 },
  shareBtn: { backgroundColor: '#7B5EA7', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
