import { MBTIType, DailyFortune } from '../types';

// 日付とMBTIタイプからシード値を生成（同日同タイプは同じ運勢）
function hashSeed(dateStr: string, mbtiType: MBTIType): number {
  const str = `${dateStr}-${mbtiType}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32bit整数に変換
  }
  return Math.abs(hash);
}

// シードベースの擬似乱数（0〜1）
function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index) * 10000;
  return x - Math.floor(x);
}

// 0〜100のスコアを生成（70以上が出やすいよう調整）
function generateScore(rand: number): number {
  // 40〜100の範囲で生成（低すぎる運勢はモチベーション低下につながるため）
  return Math.floor(rand * 61) + 40;
}

// ★の数に変換
function toStars(score: number): string {
  const stars = Math.round(score / 20); // 1〜5個
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

const loveMessages = [
  '今日は素直な気持ちを伝えてみて。相手もあなたのことを想っているはず。',
  '直感を信じて動くと良い出会いが。今日は積極的に行動しよう！',
  '相手の言葉の奥にある気持ちに気づいてあげると、二人の距離が縮まります。',
  '少し立ち止まって、今の関係を大切にすることが吉。焦りは禁物。',
  '笑顔でいるあなたが一番輝いている。自然体が最大の武器！',
  'タイミングを待っているなら今日がその日かも。勇気を出して！',
  '思いやりの一言が、相手の心を大きく動かします。',
];

const workMessages = [
  '集中力が高まる一日。難しい課題も今日なら乗り越えられます。',
  'チームワークが鍵。周りと協力することで大きな成果が生まれます。',
  '新しいアイデアが降ってくる日。どんどんメモして！',
  '丁寧さが評価される日。スピードよりクオリティを意識して。',
  '今日の努力は必ず実を結ぶ。地道にコツコツが吉。',
  '思い切って意見を発信してみて。意外な評価が得られるかも。',
  '午後から運気上昇！重要なタスクは後半に回すと吉。',
];

const moneyMessages = [
  '衝動買いに注意。必要なものかどうかよく考えて。',
  '節約よりも投資の日。スキルアップへの出費は吉。',
  '今日の小さな出費が将来の大きなリターンになるかも。',
  '金運安定。コツコツ積み上げる姿勢が報われます。',
  '思わぬ臨時収入の予感。ラッキーアクション：財布の中を整理する。',
  '人との繋がりが金運を呼び込む日。ケチらずに行動して。',
];

const overallMessages = [
  '今日のあなたは輝いている！自分を信じて進もう。',
  'ゆっくりペースでもOK。自分のリズムを大切に。',
  '小さなことに感謝する気持ちが、大きな幸運を引き寄せます。',
  '変化を恐れずに。今日の一歩が大きな転機になるかも。',
  '周りの人への感謝を忘れずに。それが今日一番の幸運のカギ。',
  'エネルギー充電日！無理せず自分を大切にして。',
  '直感を大切に行動する日。深く考えすぎず、感じるままに動こう。',
];

const luckyColors = [
  'ラベンダー', 'ミントグリーン', 'ピーチ', 'スカイブルー', 'ゴールド',
  'コーラルピンク', 'ホワイト', 'ネイビー', 'テラコッタ', 'イエロー',
];

const luckyItems = [
  'ハンドクリーム', 'お気に入りのペン', 'お守り', '観葉植物', 'キャンドル',
  'ノート', 'お茶', 'クリスタル', 'ミラー', 'リップ',
];

export function getDailyFortune(mbtiType: MBTIType, date?: Date): DailyFortune {
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const seed = hashSeed(dateStr, mbtiType);

  const loveScore = generateScore(seededRandom(seed, 1));
  const workScore = generateScore(seededRandom(seed, 2));
  const moneyScore = generateScore(seededRandom(seed, 3));
  const overallScore = Math.floor((loveScore + workScore + moneyScore) / 3);

  const loveIdx = Math.floor(seededRandom(seed, 4) * loveMessages.length);
  const workIdx = Math.floor(seededRandom(seed, 5) * workMessages.length);
  const moneyIdx = Math.floor(seededRandom(seed, 6) * moneyMessages.length);
  const overallIdx = Math.floor(seededRandom(seed, 7) * overallMessages.length);
  const colorIdx = Math.floor(seededRandom(seed, 8) * luckyColors.length);
  const itemIdx = Math.floor(seededRandom(seed, 9) * luckyItems.length);
  const luckyNumber = Math.floor(seededRandom(seed, 10) * 9) + 1;

  return {
    love: loveScore,
    work: workScore,
    money: moneyScore,
    overall: overallScore,
    loveMessage: loveMessages[loveIdx],
    workMessage: workMessages[workIdx],
    moneyMessage: moneyMessages[moneyIdx],
    overallMessage: overallMessages[overallIdx],
    luckyColor: luckyColors[colorIdx],
    luckyItem: luckyItems[itemIdx],
    luckyNumber,
  };
}

export { toStars };
