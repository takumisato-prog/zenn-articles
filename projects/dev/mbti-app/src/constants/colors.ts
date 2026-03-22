// アプリ全体のカラーパレット
export const Colors = {
  background: '#0D0D1A',
  surface: '#1A1A2E',
  surfaceLight: '#252540',
  primary: '#7B5EA7',
  primaryLight: '#9B7DC7',
  accent: '#FF6B9D',
  text: '#FFFFFF',
  textSecondary: '#B0B0D0',
  textMuted: '#6B6B8A',
  border: '#2A2A4A',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
};

// MBTIタイプ別グラデーション（アナリスト系: 青紫、外交官系: 緑、番人系: 青、探検家系: オレンジ）
export const MBTIColors: Record<string, [string, string]> = {
  INTJ: ['#667eea', '#764ba2'],
  INTP: ['#4facfe', '#00f2fe'],
  ENTJ: ['#f093fb', '#f5576c'],
  ENTP: ['#43e97b', '#38f9d7'],
  INFJ: ['#a18cd1', '#fbc2eb'],
  INFP: ['#fbc2eb', '#a6c1ee'],
  ENFJ: ['#fddb92', '#d1fdff'],
  ENFP: ['#f093fb', '#f5576c'],
  ISTJ: ['#89f7fe', '#66a6ff'],
  ISFJ: ['#fddb92', '#d1fdff'],
  ESTJ: ['#667eea', '#764ba2'],
  ESFJ: ['#fbc2eb', '#a6c1ee'],
  ISTP: ['#30cfd0', '#333cf6'],
  ISFP: ['#a1c4fd', '#c2e9fb'],
  ESTP: ['#f093fb', '#f5576c'],
  ESFP: ['#fddb92', '#d1fdff'],
};
