import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useMBTIStore } from '../store/mbtiStore';
import { mbtiTypes } from '../data/mbtiTypes';
import { zodiacSigns } from '../data/zodiac';
import { GradientBackground } from '../components/common/GradientBackground';
import { Colors } from '../constants/colors';

const THEMES = ['恋愛・出会い', '仕事・キャリア', '今月の運勢', '人間関係', '自分自身について'];

export function AIFortuneScreen() {
  const navigation = useNavigation<any>();
  const { myMBTIType, myZodiacSign } = useMBTIStore();
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const typeData = myMBTIType ? mbtiTypes[myMBTIType] : null;
  const zodiacData = myZodiacSign ? zodiacSigns.find((z) => z.sign === myZodiacSign) : null;

  if (!myMBTIType) {
    return (
      <GradientBackground colors={['#0D0D1A', '#1A1A2E']}>
        <SafeAreaView style={styles.centered}>
          <Text style={styles.noTypeEmoji}>🤖</Text>
          <Text style={styles.noTypeText}>まずMBTI診断をしよう！</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('Quiz')}>
            <Text style={styles.startBtnText}>診断スタート</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const callAIFortune = async () => {
    if (!selectedTheme) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError('');
    setResult('');

    try {
      // Supabase Edge Function を呼び出す（未設定の場合はモックレスポンス）
      const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        // デモ用モックレスポンス
        await new Promise((r) => setTimeout(r, 1500));
        setResult(
          `${myMBTIType}型のあなた、${selectedTheme}について特別なメッセージです。` +
          `あなたの独自の視点と深い洞察力は、今まさに輝くべきタイミングを迎えています。` +
          `直感を信じて一歩踏み出すことで、思いがけない出会いや チャンスが訪れるでしょう。` +
          `${typeData?.emoji} あなたの力を信じて！`
        );
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-fortune`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          mbtiType: myMBTIType,
          zodiacSign: myZodiacSign,
          theme: selectedTheme,
        }),
      });

      if (!response.ok) throw new Error('AI占いサービスに接続できませんでした');
      const data = await response.json();
      setResult(data.message);
    } catch (e: any) {
      setError(e.message || 'エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground colors={['#0D0D1A', '#1A1A2E']}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>＜</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🤖 AI占い</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* プロフィール表示 */}
          <LinearGradient colors={typeData!.gradientColors} style={styles.profileCard}>
            <Text style={styles.profileEmoji}>{typeData!.emoji}</Text>
            <Text style={styles.profileType}>{myMBTIType}</Text>
            {zodiacData && <Text style={styles.profileZodiac}>{zodiacData.emoji} {zodiacData.nameJP}</Text>}
          </LinearGradient>

          {/* テーマ選択 */}
          <Text style={styles.sectionLabel}>🎯 占ってほしいテーマを選んで</Text>
          <View style={styles.themes}>
            {THEMES.map((theme) => (
              <TouchableOpacity
                key={theme}
                style={[styles.themeBtn, selectedTheme === theme && styles.themeBtnSelected]}
                onPress={() => { Haptics.selectionAsync(); setSelectedTheme(theme); }}
              >
                <Text style={[styles.themeBtnText, selectedTheme === theme && styles.themeBtnTextSelected]}>
                  {theme}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 占いボタン */}
          <TouchableOpacity
            style={[styles.fortuneBtn, (!selectedTheme || loading) && styles.fortuneBtnDisabled]}
            onPress={callAIFortune}
            disabled={!selectedTheme || loading}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.fortuneBtnText}>占い中...</Text>
              </View>
            ) : (
              <Text style={styles.fortuneBtnText}>✨ AIに占ってもらう</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.limitNote}>※ 1日1回まで無料</Text>

          {/* 結果表示 */}
          {result !== '' && (
            <LinearGradient colors={['#252540', '#1A1A2E']} style={styles.resultCard}>
              <Text style={styles.resultTitle}>🔮 AIからのメッセージ</Text>
              <Text style={styles.resultText}>{result}</Text>
            </LinearGradient>
          )}

          {error !== '' && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  noTypeEmoji: { fontSize: 64 },
  noTypeText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  startBtn: { backgroundColor: '#7B5EA7', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 20 },
  profileCard: { borderRadius: 20, padding: 24, alignItems: 'center' },
  profileEmoji: { fontSize: 48, marginBottom: 4 },
  profileType: { color: '#fff', fontSize: 32, fontWeight: '900' },
  profileZodiac: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  sectionLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeBtn: {
    backgroundColor: '#1A1A2E', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: '#2A2A4A',
  },
  themeBtnSelected: { backgroundColor: '#252540', borderColor: '#7B5EA7' },
  themeBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  themeBtnTextSelected: { color: '#fff' },
  fortuneBtn: { backgroundColor: '#7B5EA7', borderRadius: 16, padding: 18, alignItems: 'center' },
  fortuneBtnDisabled: { opacity: 0.4 },
  fortuneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  limitNote: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: -12 },
  resultCard: { borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#7B5EA7' },
  resultTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  resultText: { color: Colors.textSecondary, fontSize: 15, lineHeight: 26 },
  errorCard: {
    backgroundColor: '#2A1A1A', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#5C2A2A',
  },
  errorText: { color: '#FF6B6B', fontSize: 13, lineHeight: 20 },
});
