import { MBTIType, ZodiacSign, ZodiacMBTIReading } from '../types';

// MBTI×星座の192通りのデータ
// 全パターンをカバーするためのロジックベースの生成 + 人気組み合わせのカスタム値
const customReadings: Partial<Record<string, ZodiacMBTIReading>> = {
  'INFP-pisces': {
    score: 95,
    overall: '感受性の豊かさが最大限に輝く組み合わせ。魚座の深い共感力とINFPの豊かな内面世界が融合し、誰も追いつけない独自の世界観を持ちます。芸術や音楽、文学への才能が開花する特別な月。',
    love: '相手の感情の機微を誰よりも敏感に感じ取れます。真剣な恋愛に向いている時期。',
    work: 'クリエイティブな仕事が大きく花開く時。直感を信じてアイデアを形にしましょう。',
    advice: '感受性の強さは最大の武器。傷つきやすさも個性として受け入れて。',
    luckyColor: 'ラベンダー',
    luckyItem: 'クリスタル',
  },
  'INTJ-virgo': {
    score: 90,
    overall: '知性と分析力が研ぎ澄まされる最強の組み合わせ。乙女座の細部へのこだわりとINTJの戦略的思考が合わさり、どんな目標も達成できる完璧なコンビ。今月は大きな計画を立てるのに最適。',
    love: '完璧な相手を求めすぎず、今いる人の良さに目を向けてみて。',
    work: '論理と直感の両方が機能する最高のコンディション。難しいプロジェクトを任せて。',
    advice: 'たまには計画から外れてみることで、新たな発見があるかも。',
    luckyColor: 'ネイビー',
    luckyItem: '手帳',
  },
  'ENFP-sagittarius': {
    score: 92,
    overall: '自由と冒険を愛する二つの魂が共鳴する輝かしい組み合わせ。射手座の楽観主義とENFPの情熱が合わさると、どんな夢も現実になる気がしてくる。今月はとにかく行動が吉！',
    love: '出会いのチャンスが多い時期。積極的にいけば運命の人に出会えるかも。',
    work: '新しいアイデアが次々と浮かぶ。ひとつ選んで全力投球してみよう。',
    advice: '衝動に身を任せるのも悪くない。でも少しだけ計画性も持つと最強に。',
    luckyColor: 'オレンジ',
    luckyItem: 'パスポート',
  },
  'ISTJ-capricorn': {
    score: 88,
    overall: '堅実さと責任感が極限まで発揮される信頼の組み合わせ。山羊座の忍耐力とISTJの誠実さが合わさり、コツコツと積み上げた努力が大きな実を結ぶ月。',
    love: '誠実さが一番の魅力。今の関係をさらに深める良い機会。',
    work: '努力が認められる時期。着実に成果を出しましょう。',
    advice: '真面目すぎず、たまには休んでリフレッシュを。',
    luckyColor: 'ダークグリーン',
    luckyItem: '観葉植物',
  },
  'ENFJ-leo': {
    score: 93,
    overall: 'リーダーシップとカリスマ性が爆発する組み合わせ。獅子座の輝きとENFJの人を惹きつける力が合わさると、自然と周りに人が集まってくる。今月はあなたがみんなの中心になる！',
    love: 'あなたの魅力が最大限に輝く時期。気になる人に思い切って伝えて。',
    work: 'チームをまとめる力が光る。リーダーとして活躍できる場面が増える。',
    advice: '人のために動くのは素晴らしいが、自分自身も大切にして。',
    luckyColor: 'ゴールド',
    luckyItem: 'アクセサリー',
  },
  'INTP-aquarius': {
    score: 89,
    overall: '型破りな発想と知的好奇心が暴走する刺激的な組み合わせ。水瓶座の革新性とINTPの論理的思考が合わさると、誰も思いつかないようなアイデアが生まれる。今月は常識にとらわれずに考えてみて。',
    love: '知的な会話ができる人との縁が深まる。頭で考えすぎず感情も大切に。',
    work: '革命的なアイデアを形にするチャンス。実現可能性を確認しながら進もう。',
    advice: '自分の世界に閉じこもらず、外の世界にも目を向けて。',
    luckyColor: 'テクノブルー',
    luckyItem: 'スマートウォッチ',
  },
};

// ロジックベースの汎用メッセージ生成
function generateReading(mbtiType: MBTIType, zodiac: ZodiacSign): ZodiacMBTIReading {
  const key = `${mbtiType}-${zodiac}`;
  const custom = customReadings[key];
  if (custom) return custom as ZodiacMBTIReading;

  // MBTIの特性
  const isIntrovert = mbtiType[0] === 'I';
  const isIntuitive = mbtiType[1] === 'N';
  const isFeeling = mbtiType[2] === 'F';
  const isJudging = mbtiType[3] === 'J';

  // 火の星座: 牡羊・獅子・射手
  const isFireSign = ['aries', 'leo', 'sagittarius'].includes(zodiac);
  // 地の星座: 牡牛・乙女・山羊
  const isEarthSign = ['taurus', 'virgo', 'capricorn'].includes(zodiac);
  // 風の星座: 双子・天秤・水瓶
  const isAirSign = ['gemini', 'libra', 'aquarius'].includes(zodiac);
  // 水の星座: 蟹・蠍・魚
  const isWaterSign = ['cancer', 'scorpio', 'pisces'].includes(zodiac);

  // スコア計算
  let score = 65;
  if (isIntuitive && isAirSign) score += 15; // 直感型×風の星座は相性良
  if (isFeeling && isWaterSign) score += 15; // 感情型×水の星座は相性良
  if (!isIntrovert && isFireSign) score += 10; // 外向型×火の星座はエネルギッシュ
  if (isJudging && isEarthSign) score += 10; // 判断型×地の星座は安定
  score = Math.min(90, Math.max(50, score));

  const elementDesc: Record<string, string> = {
    fire: '情熱と行動力',
    earth: '安定と堅実さ',
    air: '知性と社交性',
    water: '感受性と直感',
  };

  const element = isFireSign ? 'fire' : isEarthSign ? 'earth' : isAirSign ? 'air' : 'water';
  const mbtiStrength = isFeeling ? '共感力' : isIntuitive ? '洞察力' : isJudging ? '計画力' : '適応力';

  return {
    score,
    overall: `${elementDesc[element]}が${mbtiStrength}と組み合わさる月。自分の強みを活かしながら、新しい挑戦に踏み出すのに良い時期です。直感を信じて行動しましょう。`,
    love: isFeeling
      ? '感情を大切に、相手への思いやりを忘れずに。深いつながりを築けます。'
      : '論理だけでなく気持ちも伝えることで、関係がより深まります。',
    work: isJudging
      ? '計画通りに進めることで大きな成果が得られます。丁寧さが評価されます。'
      : '柔軟な対応力が光る時期。変化をチャンスと捉えましょう。',
    advice: isIntrovert
      ? '一人の時間を大切にしながら、大切な人との時間も確保しましょう。'
      : 'あなたのエネルギーが周りを元気にする。その影響力を大切に。',
    luckyColor: isWaterSign ? 'パールホワイト' : isFireSign ? 'コーラルレッド' : isAirSign ? 'スカイブルー' : 'フォレストグリーン',
    luckyItem: isIntuitive ? 'ノート' : isFeeling ? 'お花' : isJudging ? '手帳' : 'スニーカー',
  };
}

export function getZodiacMBTIReading(mbtiType: MBTIType, zodiac: ZodiacSign): ZodiacMBTIReading {
  return generateReading(mbtiType, zodiac);
}
