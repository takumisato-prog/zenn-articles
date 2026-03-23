import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Share, Platform,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { mbtiTypes } from '../data/mbtiTypes';
import { celebrities } from '../data/celebrities';
import { GradientBackground } from '../components/common/GradientBackground';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors } from '../constants/colors';
import { MBTIType } from '../types';

type ResultRoute = RouteProp<RootStackParamList, 'Result'>;

export function ResultScreen() {
  const route = useRoute<ResultRoute>();
  const navigation = useNavigation<any>();
  const { mbtiType } = route.params;
  const typeData = mbtiTypes[mbtiType];
  const stars = celebrities[mbtiType] || [];
  const shareCardRef = useRef<View>(null);

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
          await shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'MBTIの結果をシェア！' });
          return;
        }
      }
      await Share.share({
        message: `私のMBTIは ${mbtiType}（${typeData.nickname}）でした${typeData.emoji}\n\nあなたも診断してみて！`,
      });
    } catch {
      await Share.share({
        message: `私のMBTIは ${mbtiType}（${typeData.nickname}）でした${typeData.emoji}\n\nあなたも診断してみて！`,
      });
    }
  };

  return (
    <GradientBackground colors={['#0D0D1A', '#1A1A2E']}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* シェア用カード */}
          <View ref={shareCardRef} collapsable={false}>
            <LinearGradient colors={typeData.gradientColors} style={styles.shareCard}>
              <Text style={styles.shareCardLabel}>✨ あなたのMBTIタイプは</Text>
              <Text style={styles.shareCardEmoji}>{typeData.emoji}</Text>
              <Text style={styles.shareCardType}>{mbtiType}</Text>
              <Text style={styles.shareCardNickname}>{typeData.nickname}</Text>
              <View style={styles.shareCardDivider} />
              <Text style={styles.shareCardDesc}>「{typeData.loveStyle.slice(0, 30)}...」</Text>
              <View style={styles.shareCardHashtags}>
                <Text style={styles.shareCardHashtag}>#{mbtiType}</Text>
                <Text style={styles.shareCardHashtag}>#MBTI診断</Text>
              </View>
            </LinearGradient>
          </View>

          {/* 詳細情報 */}
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>🧬 性格の特徴</Text>
            <Text style={styles.description}>{typeData.description}</Text>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>💪 強み</Text>
            {typeData.strengths.map((s) => (
              <Text key={s} style={styles.listItem}>• {s}</Text>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>⚠️ 弱点</Text>
            {typeData.weaknesses.map((w) => (
              <Text key={w} style={styles.listItem}>• {w}</Text>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>💕 恋愛スタイル</Text>
            <Text style={styles.description}>{typeData.loveStyle}</Text>
          </View>

          {/* 同タイプの有名人 */}
          {stars.length > 0 && (
            <View style={styles.detailCard}>
              <Text style={styles.sectionTitle}>🌟 同じタイプの有名人・キャラ</Text>
              <View style={styles.celebGrid}>
                {stars.slice(0, 6).map((c) => (
                  <View key={c.name} style={styles.celebItem}>
                    <Text style={styles.celebEmoji}>{c.emoji}</Text>
                    <Text style={styles.celebName}>{c.name}</Text>
                    <Text style={styles.celebRole}>{c.role}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* アクションボタン */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareBtnText}>📤 結果をシェアする</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('ZodiacPicker')}
            >
              <Text style={styles.secondaryBtnText}>⭐ 星座占いへ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('Main', { screen: 'Compatibility' })}
            >
              <Text style={styles.secondaryBtnText}>💕 相性チェックへ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => navigation.navigate('Main')}
            >
              <Text style={styles.homeBtnText}>🏠 ホームへ戻る</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  shareCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  shareCardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 8 },
  shareCardEmoji: { fontSize: 64, marginBottom: 8 },
  shareCardType: { color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: 4 },
  shareCardNickname: { color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: '600', marginTop: 4 },
  shareCardDivider: { width: 60, height: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 16 },
  shareCardDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center' },
  shareCardHashtags: { flexDirection: 'row', gap: 8, marginTop: 12 },
  shareCardHashtag: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  detailCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  description: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22 },
  listItem: { color: Colors.textSecondary, fontSize: 14, lineHeight: 24, marginLeft: 4 },
  celebGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  celebItem: {
    width: '30%',
    backgroundColor: '#252540',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  celebEmoji: { fontSize: 28, marginBottom: 4 },
  celebName: { color: '#fff', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  celebRole: { color: Colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: 2 },
  actions: { gap: 12, marginTop: 8 },
  shareBtn: {
    backgroundColor: '#7B5EA7',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  secondaryBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  homeBtn: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A5A',
  },
  homeBtnText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
});
