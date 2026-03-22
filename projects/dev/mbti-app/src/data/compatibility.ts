import { MBTIType, CompatibilityResult } from '../types';

// 相性スコア計算ロジック
function calcScore(typeA: MBTIType, typeB: MBTIType): number {
  let score = 0;

  const a = typeA.split('');
  const b = typeB.split('');

  // SN一致: +30点（価値観・世界観の一致）
  if (a[1] === b[1]) score += 30;
  // TF一致: +25点（感情的共感の一致）
  if (a[2] === b[2]) score += 25;
  // JP補完(J+P): +25点 / JP一致: +15点
  if ((a[3] === 'J' && b[3] === 'P') || (a[3] === 'P' && b[3] === 'J')) {
    score += 25;
  } else {
    score += 15;
  }
  // EI補完(E+I): +20点 / EI一致: +10点
  if ((a[0] === 'E' && b[0] === 'I') || (a[0] === 'I' && b[0] === 'E')) {
    score += 20;
  } else {
    score += 10;
  }

  return score; // 最大100点
}

// レベル・タイトル・コメント・アドバイスを返す
function buildResult(scoreRaw: number, typeA: MBTIType, typeB: MBTIType): CompatibilityResult {
  const score = Math.min(100, scoreRaw);

  // 特別な組み合わせのカスタムコメント
  const customKey = `${typeA}-${typeB}`;
  const custom = customMessages[customKey] || customMessages[`${typeB}-${typeA}`];

  if (score >= 80) {
    return {
      score,
      level: 'best',
      title: '✨ 運命の相手',
      comment: custom?.comment || 'お互いを深く理解し合える、理想的な組み合わせです。価値観が一致し、一緒にいるだけで心地よい関係が築けます。',
      advice: custom?.advice || 'この出会いを大切に。二人で過ごす時間がお互いを成長させます。',
    };
  } else if (score >= 60) {
    return {
      score,
      level: 'good',
      title: '💕 息ぴったりカップル',
      comment: custom?.comment || '相性が良く、自然な形で仲良くなれる組み合わせ。お互いの違いも刺激になります。',
      advice: custom?.advice || '価値観の違いを面白がる姿勢が関係をより深めます。',
    };
  } else if (score >= 40) {
    return {
      score,
      level: 'normal',
      title: '🤝 普通に仲良くなれる',
      comment: custom?.comment || '最初は少し距離感があるかもしれませんが、お互いを知るほど良い関係になれます。',
      advice: custom?.advice || '相手の違いを否定せず、まず理解しようとすることが大切です。',
    };
  } else {
    return {
      score,
      level: 'caution',
      title: '⚡ 刺激的すぎる組み合わせ',
      comment: custom?.comment || 'お互いの違いが大きく、最初は戸惑うかも。でもそれが成長につながることも。',
      advice: custom?.advice || '違いを受け入れる心の広さがあれば、化学反応が起きるかも！',
    };
  }
}

// 人気組み合わせのカスタムコメント
const customMessages: Record<string, { comment: string; advice: string }> = {
  'INFP-ENFJ': {
    comment: 'INFPの深い感受性をENFJが全力で受け止める、まさに理想の組み合わせ。お互いの個性を最大限に引き出し合えます。',
    advice: 'ENFJは時にINFPの「ひとりの時間」も大切にしてあげて。',
  },
  'INTJ-ENFP': {
    comment: '真逆に見えて実は最強の組み合わせ。ENFPの自由な発想とINTJの戦略眼が融合すると無敵になれます。',
    advice: 'ENFPのエネルギーでINTJが変わり、INTJの深さでENFPが成長する関係を楽しんで。',
  },
  'INTP-ENTJ': {
    comment: '知的な議論が絶えない刺激的なペア。お互いの論理が触れ合い、より高みへと押し上げ合えます。',
    advice: 'INTPの独自アイデアとENTJの実行力を合わせれば最強コンビに。',
  },
  'ISFJ-ESTP': {
    comment: '安定のISFJと冒険のESTP。正反対に見えますが、お互いの足りない部分を補い合える可能性があります。',
    advice: 'ISFJは少しだけ冒険を、ESTPは少しだけ落ち着きを。',
  },
  'ENFP-INFJ': {
    comment: '情熱的なENFPと洞察力のINFJ。二人が出会うと、世界が変わるような話が生まれます。',
    advice: 'お互いの直感と感性を信じて、深い対話を楽しんで。',
  },
};

// メモ化してパフォーマンス向上
const cache = new Map<string, CompatibilityResult>();

export function getCompatibility(typeA: MBTIType, typeB: MBTIType): CompatibilityResult {
  const key = [typeA, typeB].sort().join('-');
  if (cache.has(key)) return cache.get(key)!;

  const score = calcScore(typeA, typeB);
  const result = buildResult(score, typeA, typeB);
  cache.set(key, result);
  return result;
}
