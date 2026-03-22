import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Share, Animated,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { getCompatibility } from '../data/compatibility';
import { mbtiTypes } from '../data/mbtiTypes';
import { GradientBackground } from '../components/common/GradientBackground';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors } from '../constants/colors';

type CompatRoute = RouteProp<RootStackParamList, 'CompatibilityResult'>;

const levelColors: Record<string, [string, string]> = {
  best: ['#f093fb', '#f5576c'],
  good: ['#43e97b', '#38f9d7'],
  normal: ['#4facfe', '#00f2fe'],
  caution: ['#fddb92', '#d1fdff'],
};

export function CompatibilityResultScreen() {
  const route = useRoute<CompatRoute>();
  const navigation = useNavigation<any>();
  const { typeA, typeB } = route.params;
  const result = getCompatibility(typeA, typeB);
  const tdA = mbtiTypes[typeA];
  const tdB = mbtiTypes[typeB];
  const shareCardRef = useRef<View>(null);
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.timing(scoreAnim, {
      toValue: result.score,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    scoreAnim.addListener(({ value }) => setDisplayScore(Math.floor(value)));
    return () => scoreAnim.removeAllListeners();
  }, []);

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
        message: `${typeA}と${typeB}の相性は${result.score}%！\n${result.title}\n${result.comment.slice(0, 40)}...\n#MBTI相性 #${typeA} #${typeB}`,
      });
    }
  };

  const gradColors = levelColors[result.level];

  return (
    <GradientBackground colors={['#0D0D1A', '#1A1A2E']}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>＜</Text>
          </TouchableOpacity>
          <Text style={styles.title}>💕 相性診断</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* シェア用カード */}
          <View ref={shareCardRef} collapsable={false}>
            <LinearGradient colors={gradColors} style={styles.shareCard}>
              <View style={styles.typePair}>
                <View style={styles.typeBlock}>
                  <Text style={styles.typeEmoji}>{tdA.emoji}</Text>
                  <Text style={styles.typeName}>{typeA}</Text>
                  <Text style={styles.typeNick}>{tdA.nickname.slice(0, 8)}...</Text>
                </View>
                <Text style={styles.crossIcon}>✕</Text>
                <View style={styles.typeBlock}>
                  <Text style={styles.typeEmoji}>{tdB.emoji}</Text>
                  <Text style={styles.typeName}>{typeB}</Text>
                  <Text style={styles.typeNick}>{tdB.nickname.slice(0, 8)}...</Text>
                </View>
              </View>
              <Text style={styles.shareCardScore}>{displayScore}%</Text>
              <Text style={styles.shareCardLevel}>{result.title}</Text>
              <Text style={styles.shareCardHash}>#MBTI相性  #{typeA}  #{typeB}</Text>
            </LinearGradient>
          </View>

          {/* コメント */}
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>💬 相性コメント</Text>
            <Text style={styles.sectionText}>{result.comment}</Text>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>💡 アドバイス</Text>
            <Text style={styles.sectionText}>{result.advice}</Text>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤 相性をシェアする</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryBtnText}>別の組み合わせを試す</Text>
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
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 16 },
  shareCard: { borderRadius: 24, padding: 28, alignItems: 'center' },
  typePair: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  typeBlock: { alignItems: 'center', gap: 4 },
  typeEmoji: { fontSize: 40 },
  typeName: { color: '#fff', fontSize: 20, fontWeight: '900' },
  typeNick: { color: 'rgba(255,255,255,0.7)', fontSize: 10, textAlign: 'center' },
  crossIcon: { color: 'rgba(255,255,255,0.6)', fontSize: 24, fontWeight: '300' },
  shareCardScore: { color: '#fff', fontSize: 72, fontWeight: '900', lineHeight: 80 },
  shareCardLevel: { color: 'rgba(255,255,255,0.9)', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  shareCardHash: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  detailCard: {
    backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#2A2A4A',
  },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  sectionText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22 },
  shareBtn: { backgroundColor: '#7B5EA7', borderRadius: 16, padding: 16, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  retryBtn: {
    backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#2A2A4A',
  },
  retryBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
