import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Dimensions, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Haptics from 'expo-haptics';
import { questions } from '../data/questions';
import { calculateMBTI } from '../logic/calculateMBTI';
import { useMBTIStore } from '../store/mbtiStore';
import { GradientBackground } from '../components/common/GradientBackground';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');
type Nav = StackNavigationProp<RootStackParamList, 'Quiz'>;

export function QuizScreen() {
  const navigation = useNavigation<Nav>();
  const { answers, currentQuestion, setAnswer, nextQuestion, prevQuestion, setMBTIType, resetQuiz } = useMBTIStore();
  const [fadeAnim] = useState(new Animated.Value(1));

  const q = questions[currentQuestion];
  const progress = (currentQuestion + 1) / questions.length;
  const isLast = currentQuestion === questions.length - 1;

  const animateAndAnswer = (choice: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    setAnswer(q.id, choice);

    if (isLast) {
      const updatedAnswers = { ...answers, [q.id]: choice };
      const mbtiType = calculateMBTI(updatedAnswers);
      setMBTIType(mbtiType);
      navigation.replace('Result', { mbtiType });
    } else {
      nextQuestion();
    }
  };

  return (
    <GradientBackground colors={['#0D0D1A', '#1A1A2E']}>
      <SafeAreaView style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (currentQuestion > 0) prevQuestion();
            else { resetQuiz(); navigation.goBack(); }
          }} style={styles.backBtn}>
            <Text style={styles.backText}>＜</Text>
          </TouchableOpacity>
          <Text style={styles.questionNum}>{currentQuestion + 1} / {questions.length}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* プログレスバー */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        {/* 質問カード */}
        <Animated.View style={[styles.questionCard, { opacity: fadeAnim }]}>
          <Text style={styles.axisLabel}>
            {q.axis === 'EI' ? '💫 エネルギーの向き' :
             q.axis === 'SN' ? '🔭 情報の受け取り方' :
             q.axis === 'TF' ? '❤️ 判断のしかた' :
             '📅 ライフスタイル'}
          </Text>
          <Text style={styles.questionText}>{q.text}</Text>
        </Animated.View>

        {/* 回答ボタン */}
        <View style={styles.options}>
          <TouchableOpacity
            style={[styles.optionBtn, answers[q.id] === 'left' && styles.selectedBtn]}
            onPress={() => animateAndAnswer('left')}
            activeOpacity={0.7}
          >
            <Text style={styles.optionText}>{q.optionLeft}</Text>
          </TouchableOpacity>

          <View style={styles.orContainer}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          <TouchableOpacity
            style={[styles.optionBtn, answers[q.id] === 'right' && styles.selectedBtn]}
            onPress={() => animateAndAnswer('right')}
            activeOpacity={0.7}
          >
            <Text style={styles.optionText}>{q.optionRight}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 20, fontWeight: '300' },
  questionNum: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  progressContainer: { marginBottom: 32 },
  progressBg: { height: 4, backgroundColor: '#2A2A4A', borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#7B5EA7', borderRadius: 2 },
  questionCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 28,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  axisLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 12, fontWeight: '600' },
  questionText: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', lineHeight: 32 },
  options: { gap: 0 },
  optionBtn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  selectedBtn: { borderColor: '#7B5EA7', backgroundColor: '#252540' },
  optionText: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
  orContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  orLine: { flex: 1, height: 1, backgroundColor: '#2A2A4A' },
  orText: { color: Colors.textMuted, fontSize: 12, marginHorizontal: 12 },
});
