import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MBTIType, ZodiacSign, AIFortuneResult } from '../types';

interface MBTIStore {
  // 診断テスト状態
  currentQuestion: number;
  answers: Record<number, 'left' | 'right'>;

  // 診断結果
  myMBTIType: MBTIType | null;

  // 星座
  myZodiacSign: ZodiacSign | null;

  // AI占い履歴
  aiFortuneHistory: AIFortuneResult[];

  // アクション
  setAnswer: (questionId: number, choice: 'left' | 'right') => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  setMBTIType: (type: MBTIType) => Promise<void>;
  setZodiacSign: (sign: ZodiacSign) => Promise<void>;
  addAIFortune: (result: AIFortuneResult) => void;
  resetQuiz: () => void;
  loadSavedData: () => Promise<void>;
}

export const useMBTIStore = create<MBTIStore>((set, get) => ({
  currentQuestion: 0,
  answers: {},
  myMBTIType: null,
  myZodiacSign: null,
  aiFortuneHistory: [],

  setAnswer: (questionId, choice) => {
    set((state) => ({
      answers: { ...state.answers, [questionId]: choice },
    }));
  },

  nextQuestion: () => {
    set((state) => ({ currentQuestion: state.currentQuestion + 1 }));
  },

  prevQuestion: () => {
    set((state) => ({ currentQuestion: Math.max(0, state.currentQuestion - 1) }));
  },

  setMBTIType: async (type) => {
    set({ myMBTIType: type });
    await AsyncStorage.setItem('mbti_type', type);
  },

  setZodiacSign: async (sign) => {
    set({ myZodiacSign: sign });
    await AsyncStorage.setItem('zodiac_sign', sign);
  },

  addAIFortune: (result) => {
    set((state) => ({
      aiFortuneHistory: [result, ...state.aiFortuneHistory].slice(0, 10),
    }));
  },

  resetQuiz: () => {
    set({ currentQuestion: 0, answers: {} });
  },

  loadSavedData: async () => {
    const mbtiType = await AsyncStorage.getItem('mbti_type');
    const zodiacSign = await AsyncStorage.getItem('zodiac_sign');
    if (mbtiType) set({ myMBTIType: mbtiType as MBTIType });
    if (zodiacSign) set({ myZodiacSign: zodiacSign as ZodiacSign });
  },
}));
