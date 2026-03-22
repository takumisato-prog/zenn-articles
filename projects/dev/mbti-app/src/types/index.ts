// MBTIの4軸
export type EI = 'E' | 'I';
export type SN = 'S' | 'N';
export type TF = 'T' | 'F';
export type JP = 'J' | 'P';

// 16タイプ
export type MBTIType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

// 診断質問
export interface Question {
  id: number;
  text: string;
  axis: 'EI' | 'SN' | 'TF' | 'JP';
  // leftOption選択時にどちらの軸スコアが上がるか
  leftAxis: EI | SN | TF | JP;
  rightAxis: EI | SN | TF | JP;
  optionLeft: string;
  optionRight: string;
}

// 診断スコア
export interface QuizScore {
  E: number; I: number;
  S: number; N: number;
  T: number; F: number;
  J: number; P: number;
}

// MBTIタイプ定義
export interface MBTITypeDefinition {
  type: MBTIType;
  nickname: string;
  emoji: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  loveStyle: string;
  gradientColors: [string, string];
  bgColor: string;
}

// 有名人・キャラクター
export interface Celebrity {
  name: string;
  role: string; // 例:「呪術廻戦」「起業家」
  emoji: string;
  category: 'anime' | 'celebrity' | 'athlete' | 'fictional';
}

// 12星座
export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer'
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

// 星座定義
export interface ZodiacDefinition {
  sign: ZodiacSign;
  nameJP: string;
  emoji: string;
  dateRange: string;
}

// MBTI×星座占い結果
export interface ZodiacMBTIReading {
  overall: string;       // 総合運（100文字程度）
  love: string;          // 恋愛傾向
  work: string;          // 仕事傾向
  advice: string;        // 今月のアドバイス
  luckyColor: string;
  luckyItem: string;
  score: number;         // 総合運スコア 0-100
}

// 今日の運勢
export interface DailyFortune {
  love: number;          // 恋愛運 0-100
  work: number;          // 仕事運 0-100
  money: number;         // 金運 0-100
  overall: number;       // 総合運 0-100
  loveMessage: string;
  workMessage: string;
  moneyMessage: string;
  overallMessage: string;
  luckyColor: string;
  luckyItem: string;
  luckyNumber: number;
}

// 恋愛相性結果
export interface CompatibilityResult {
  score: number;
  level: 'best' | 'good' | 'normal' | 'caution';
  title: string;
  comment: string;
  advice: string;
}

// AI占い結果
export interface AIFortuneResult {
  message: string;
  date: string; // ISO日付文字列
  mbtiType: MBTIType;
  zodiacSign?: ZodiacSign;
}
