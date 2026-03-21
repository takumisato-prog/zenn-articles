/**
 * Claude APIで静岡テーマの記事を自動生成するスクリプト
 *
 * 使い方:
 *   node generate-shizuoka-article.js              # 次の記事を自動生成
 *   node generate-shizuoka-article.js --index 5   # 記事番号を指定して生成
 *   node generate-shizuoka-article.js --dry-run   # プロンプト確認のみ（API呼び出しなし）
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const SCRIPT_DIR = import.meta.dirname;
const ROOT = path.resolve(SCRIPT_DIR, '..');
const ARTICLES_DIR = path.join(ROOT, 'articles');
const PROGRESS_FILE = path.join(ROOT, 'progress.json');

// ========================================
// 記事構成パターンの説明
// ========================================
const PATTERN_DESCRIPTIONS = {
  contrary: '冒頭で「〇〇だと思っていませんか？実は違います」という形で読者の誤解を提示し、データ・歴史・証拠で覆す。最後は「だから静岡は面白い」という感情的な着地点で締める。',
  numbers: '冒頭で「年商3000万」「世界シェア70%」など衝撃的な数字を提示する。なぜそうなったのか因果関係を深掘りし、読者が持ち帰れる教訓・示唆で締める。',
  testimony: '体験談・現地エピソードで引き込む。歴史・文化・背景を絡めながら展開し、最後に「行ってみたい」「試したい」という行動喚起で締める。',
  mystery: '「なぜ〇〇なのか、誰も教えてくれない」という問いで始める。情報を段階的に明かしながら読者を引っ張り、意外な答えの開示と余韻で締める。',
};

// ========================================
// 記事テーマリスト（静岡30本→東海・関東→全国へ拡張）
// ========================================
const ARTICLES = [
  // シリーズA「静岡ディープ探訪」（10本）
  {
    index: 1,
    title: '富士山が「山梨県の山」だと思っている人に静岡県民が言いたい10のこと',
    series: 'A',
    seriesName: '静岡ディープ探訪',
    pattern: 'contrary',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#富士山', '#静岡あるある', '#地方創生'],
  },
  {
    index: 2,
    title: '静岡県の面積は東京都の5倍以上。「静岡って何もない」は完全な誤解だった',
    series: 'A',
    seriesName: '静岡ディープ探訪',
    pattern: 'contrary',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡観光', '#地方創生', '#ローカルメディア'],
  },
  {
    index: 3,
    title: '浜松vs静岡市、100年以上続く「どっちが静岡の中心か」論争の全真相',
    series: 'A',
    seriesName: '静岡ディープ探訪',
    pattern: 'mystery',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#浜松', '#静岡市', '#静岡あるある'],
  },
  {
    index: 4,
    title: 'うなぎパイが「夜のお菓子」な理由——春華堂の伝説マーケティング',
    series: 'A',
    seriesName: '静岡ディープ探訪',
    pattern: 'mystery',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#うなぎパイ', '#静岡グルメ', '#ローカルメディア'],
  },
  {
    index: 5,
    title: '静岡の人は「さわやか」なしで生きられない——げんこつハンバーグ教の実態',
    series: 'A',
    seriesName: '静岡ディープ探訪',
    pattern: 'testimony',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#さわやか', '#静岡グルメ', '#静岡あるある'],
  },
  {
    index: 6,
    title: '日本一深い駿河湾に何がいるのか——静岡が誇る海の異世界',
    series: 'A',
    seriesName: '静岡ディープ探訪',
    pattern: 'mystery',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#駿河湾', '#静岡観光', '#地方創生'],
  },
  {
    index: 7,
    title: 'お茶の産地なのに「急須派」割合が全国最下位な逆説',
    series: 'A',
    seriesName: '静岡ディープ探訪',
    pattern: 'contrary',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡茶', '#静岡あるある', '#ローカルメディア'],
  },
  {
    index: 8,
    title: '三島由紀夫が愛した三嶋大社と富士山信仰——静岡が生んだ文化の厚み',
    series: 'A',
    seriesName: '静岡ディープ探訪',
    pattern: 'testimony',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#三嶋大社', '#静岡観光', '#地方創生'],
  },
  {
    index: 9,
    title: '静岡の県民性を「ゆるい」と言う人に見せたい知られざる野心家の実績',
    series: 'A',
    seriesName: '静岡ディープ探訪',
    pattern: 'contrary',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡あるある', '#静岡ビジネス', '#ローカルメディア'],
  },
  {
    index: 10,
    title: '東海道新幹線、静岡県内6駅なのに「のぞみ」が1本も止まらない怒りの歴史',
    series: 'A',
    seriesName: '静岡ディープ探訪',
    pattern: 'mystery',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#新幹線', '#静岡あるある', '#地方創生'],
  },

  // シリーズB「静岡ビジネス解剖」（8本）
  {
    index: 11,
    title: 'スズキ・ヤマハ・ホンダ——なぜ静岡西部だけで「二輪3強」が生まれたのか',
    series: 'B',
    seriesName: '静岡ビジネス解剖',
    pattern: 'mystery',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡ビジネス', '#浜松', '#ローカルメディア'],
  },
  {
    index: 12,
    title: '浜松発「楽器の街」——河合楽器・ヤマハが世界シェアを取った理由',
    series: 'B',
    seriesName: '静岡ビジネス解剖',
    pattern: 'numbers',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡ビジネス', '#浜松', '#中小企業'],
  },
  {
    index: 13,
    title: '静岡の中小企業が黙って稼いでいる「隠れニッチトップ」産業リスト',
    series: 'B',
    seriesName: '静岡ビジネス解剖',
    pattern: 'numbers',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡ビジネス', '#中小企業', '#地方創生'],
  },
  {
    index: 14,
    title: '静岡茶農家の後継者問題と、それを覆す若手の挑戦',
    series: 'B',
    seriesName: '静岡ビジネス解剖',
    pattern: 'testimony',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡茶', '#静岡ビジネス', '#地方創生'],
  },
  {
    index: 15,
    title: '沼津港の干物業者が「Instagramだけで年商3000万」を達成した話',
    series: 'B',
    seriesName: '静岡ビジネス解剖',
    pattern: 'numbers',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#沼津', '#静岡ビジネス', '#ローカルメディア'],
  },
  {
    index: 16,
    title: '静岡で起業するメリットが東京の人に知られていない件',
    series: 'B',
    seriesName: '静岡ビジネス解剖',
    pattern: 'contrary',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡ビジネス', '#起業', '#地方創生'],
  },
  {
    index: 17,
    title: '伊豆の旅館がAIを導入した結果——テクノロジーで変わる観光業',
    series: 'B',
    seriesName: '静岡ビジネス解剖',
    pattern: 'numbers',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#伊豆', '#静岡ビジネス', '#AI活用'],
  },
  {
    index: 18,
    title: '静岡県がなぜ「製造業王国」になったのか——地理と文化の交点',
    series: 'B',
    seriesName: '静岡ビジネス解剖',
    pattern: 'mystery',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡ビジネス', '#中小企業', '#ローカルメディア'],
  },

  // シリーズC「静岡グルメ＆カルチャー深掘り」（8本）
  {
    index: 19,
    title: '静岡おでんの「黒はんぺん」は何者なのか——成分・文化・食べ方の完全解説',
    series: 'C',
    seriesName: '静岡グルメ＆カルチャー深掘り',
    pattern: 'mystery',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡グルメ', '#静岡おでん', '#ローカルメディア'],
  },
  {
    index: 20,
    title: '富士宮やきそばがB-1グランプリを連覇した本当の理由はマーケティングにあった',
    series: 'C',
    seriesName: '静岡グルメ＆カルチャー深掘り',
    pattern: 'numbers',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡グルメ', '#富士宮', '#ローカルメディア'],
  },
  {
    index: 21,
    title: '熱海が「昭和の温泉リゾート」から復活した背景——移住者が変えた街の物語',
    series: 'C',
    seriesName: '静岡グルメ＆カルチャー深掘り',
    pattern: 'testimony',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#熱海', '#静岡観光', '#地方創生'],
  },
  {
    index: 22,
    title: '伊豆半島一周ドライブで見つけた絶対に行くべき穴場スポット20選',
    series: 'C',
    seriesName: '静岡グルメ＆カルチャー深掘り',
    pattern: 'testimony',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#伊豆', '#静岡観光', '#静岡グルメ'],
  },
  {
    index: 23,
    title: '静岡県民が「東京に出なくても満足できる」と言う理由を本気で調べた',
    series: 'C',
    seriesName: '静岡グルメ＆カルチャー深掘り',
    pattern: 'contrary',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡あるある', '#地方創生', '#ローカルメディア'],
  },
  {
    index: 24,
    title: '藤枝の朝ラーメン文化——なぜ朝7時からラーメン屋に行列ができるのか',
    series: 'C',
    seriesName: '静岡グルメ＆カルチャー深掘り',
    pattern: 'mystery',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡グルメ', '#藤枝', '#ローカルメディア'],
  },
  {
    index: 25,
    title: '静岡市の歴史を決定づけた「駿府城」と徳川家康の最後の20年',
    series: 'C',
    seriesName: '静岡グルメ＆カルチャー深掘り',
    pattern: 'testimony',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡市', '#駿府城', '#静岡観光'],
  },
  {
    index: 26,
    title: '静岡のラーメン文化が「ほぼ存在しない」理由——うどん・おでん・焼きそばの壁',
    series: 'C',
    seriesName: '静岡グルメ＆カルチャー深掘り',
    pattern: 'contrary',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡グルメ', '#静岡あるある', '#ローカルメディア'],
  },

  // シリーズD「静岡×AI・DX最前線」（4本）
  {
    index: 27,
    title: '静岡の製造業がAIを導入して変わったこと——現場取材レポート',
    series: 'D',
    seriesName: '静岡×AI・DX最前線',
    pattern: 'numbers',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡ビジネス', '#AI活用', '#DX'],
  },
  {
    index: 28,
    title: '浜松市が「スマートシティ」推進に本気な理由と現状',
    series: 'D',
    seriesName: '静岡×AI・DX最前線',
    pattern: 'numbers',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#浜松', '#AI活用', '#地方創生'],
  },
  {
    index: 29,
    title: '静岡の中小企業がDXで売上2倍にした3つの実例',
    series: 'D',
    seriesName: '静岡×AI・DX最前線',
    pattern: 'numbers',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#静岡ビジネス', '#DX', '#中小企業'],
  },
  {
    index: 30,
    title: 'AIツールで静岡の地域情報発信を自動化した話——この記事を書いた仕組みを公開',
    series: 'D',
    seriesName: '静岡×AI・DX最前線',
    pattern: 'testimony',
    tags: ['#静岡', '#静岡県', '#静岡情報', '#AI活用', '#DX', '#ローカルメディア'],
  },

  // ========================================
  // 拡張：東海エリア（愛知・岐阜・三重）
  // ========================================
  {
    index: 31,
    title: '名古屋人が「味噌カツ」を毎日食べていると思っている人へ——愛知の食文化の真実',
    series: 'E',
    seriesName: '東海ディープ探訪',
    pattern: 'contrary',
    tags: ['#愛知', '#名古屋', '#東海', '#名古屋グルメ', '#地方創生', '#ローカルメディア'],
  },
  {
    index: 32,
    title: 'トヨタだけじゃない——愛知県が「日本一の製造業王国」になった本当の理由',
    series: 'E',
    seriesName: '東海ディープ探訪',
    pattern: 'numbers',
    tags: ['#愛知', '#名古屋', '#東海', '#愛知ビジネス', '#製造業', '#地方創生'],
  },
  {
    index: 33,
    title: '岐阜県が「日本の真ん中」なのに存在感が薄い理由を本気で考えた',
    series: 'E',
    seriesName: '東海ディープ探訪',
    pattern: 'mystery',
    tags: ['#岐阜', '#東海', '#地方創生', '#ローカルメディア', '#岐阜観光'],
  },
  {
    index: 34,
    title: '白川郷はなぜ世界遺産になれたのか——合掌造りを守った村人たちの執念',
    series: 'E',
    seriesName: '東海ディープ探訪',
    pattern: 'testimony',
    tags: ['#岐阜', '#白川郷', '#東海', '#世界遺産', '#観光', '#地方創生'],
  },
  {
    index: 35,
    title: '三重県が「近畿か東海か」問題で永遠に揺れている件について',
    series: 'E',
    seriesName: '東海ディープ探訪',
    pattern: 'mystery',
    tags: ['#三重', '#東海', '#近畿', '#地方創生', '#ローカルメディア'],
  },
  {
    index: 36,
    title: '伊勢神宮に年間800万人が訪れるのに三重県の存在感が薄い逆説',
    series: 'E',
    seriesName: '東海ディープ探訪',
    pattern: 'contrary',
    tags: ['#三重', '#伊勢神宮', '#東海', '#観光', '#地方創生'],
  },
  {
    index: 37,
    title: '名古屋が「東京・大阪に挟まれた都市」を強みに変えた戦略',
    series: 'E',
    seriesName: '東海ディープ探訪',
    pattern: 'numbers',
    tags: ['#愛知', '#名古屋', '#東海', '#地方創生', '#ビジネス'],
  },
  {
    index: 38,
    title: '飛騨高山が「小京都」と呼ばれる前から外国人に人気だった理由',
    series: 'E',
    seriesName: '東海ディープ探訪',
    pattern: 'mystery',
    tags: ['#岐阜', '#飛騨高山', '#東海', '#観光', '#インバウンド'],
  },

  // ========================================
  // 拡張：関東エリア（神奈川・山梨・長野）
  // ========================================
  {
    index: 39,
    title: '神奈川県は「横浜・川崎以外何もない」は大嘘——知られざる内陸の魅力',
    series: 'F',
    seriesName: '関東ディープ探訪',
    pattern: 'contrary',
    tags: ['#神奈川', '#関東', '#地方創生', '#ローカルメディア', '#観光'],
  },
  {
    index: 40,
    title: '山梨県が「ワイン生産量日本一」になった話——甲州ぶどうと明治時代の逆転劇',
    series: 'F',
    seriesName: '関東ディープ探訪',
    pattern: 'numbers',
    tags: ['#山梨', '#関東', '#ワイン', '#地方創生', '#ローカルメディア'],
  },
  {
    index: 41,
    title: '長野県が「移住したい都道府県」で10年以上トップを維持している本当の理由',
    series: 'F',
    seriesName: '関東ディープ探訪',
    pattern: 'numbers',
    tags: ['#長野', '#移住', '#地方創生', '#ローカルメディア'],
  },
  {
    index: 42,
    title: '箱根が「温泉＋美術館」で年間2000万人を集める奇跡のビジネスモデル',
    series: 'F',
    seriesName: '関東ディープ探訪',
    pattern: 'numbers',
    tags: ['#神奈川', '#箱根', '#関東', '#観光', '#地方創生'],
  },

  // ========================================
  // 拡張：日本各地のディープなローカル話
  // ========================================
  {
    index: 43,
    title: '大阪人が本当に「たこ焼きを毎日食べているか」を調べた結果',
    series: 'G',
    seriesName: '日本ローカルディープ',
    pattern: 'contrary',
    tags: ['#大阪', '#関西', '#グルメ', '#ローカルメディア', '#地方創生'],
  },
  {
    index: 44,
    title: '北海道の面積は本州の4分の1——それでも「広すぎる」と言われる理由',
    series: 'G',
    seriesName: '日本ローカルディープ',
    pattern: 'numbers',
    tags: ['#北海道', '#地方創生', '#ローカルメディア'],
  },
  {
    index: 45,
    title: '京都人が「建前と本音」を使い分けると言われるが、実際はどうなのか',
    series: 'G',
    seriesName: '日本ローカルディープ',
    pattern: 'mystery',
    tags: ['#京都', '#関西', '#地方創生', '#ローカルメディア'],
  },
  {
    index: 46,
    title: '福岡が「住みやすい都市ランキング」で常連になった5つの理由',
    series: 'G',
    seriesName: '日本ローカルディープ',
    pattern: 'numbers',
    tags: ['#福岡', '#九州', '#移住', '#地方創生', '#ローカルメディア'],
  },
  {
    index: 47,
    title: '沖縄が「観光業依存」から脱却しようとしている話——ITと製造業の挑戦',
    series: 'G',
    seriesName: '日本ローカルディープ',
    pattern: 'contrary',
    tags: ['#沖縄', '#九州', '#地方創生', '#DX', '#ローカルメディア'],
  },
  {
    index: 48,
    title: '仙台が「ずんだ餅の都市」として全国に名乗りを上げた経緯',
    series: 'G',
    seriesName: '日本ローカルディープ',
    pattern: 'testimony',
    tags: ['#宮城', '#仙台', '#東北', '#グルメ', '#ローカルメディア'],
  },
  {
    index: 49,
    title: '金沢が「小京都」ではなく「加賀百万石の都」として再評価されている理由',
    series: 'G',
    seriesName: '日本ローカルディープ',
    pattern: 'contrary',
    tags: ['#石川', '#金沢', '#北陸', '#観光', '#地方創生'],
  },
  {
    index: 50,
    title: '広島が「お好み焼き」ではなく「カープ」で地域アイデンティティを作った話',
    series: 'G',
    seriesName: '日本ローカルディープ',
    pattern: 'mystery',
    tags: ['#広島', '#中国地方', '#地方創生', '#ローカルメディア'],
  },
];

// ========================================
// プロンプト生成
// ========================================
function buildPrompt(articleDef) {
  const patternDesc = PATTERN_DESCRIPTIONS[articleDef.pattern];
  const nextArticle = ARTICLES.find((a) => a.index === articleDef.index + 1);
  const nextTitle = nextArticle ? nextArticle.title : null;

  return `あなたは日本各地のローカル情報を深掘りするメディアライターです。
地元民が思わず「わかる！」と膝を打ち、県外者が「行ってみたい・知りたい」と感じる記事を書いてください。

## 記事情報
- タイトル: ${articleDef.title}
- シリーズ: 「${articleDef.seriesName}」
- 構成パターン: ${articleDef.pattern}
  ${patternDesc}

## 必須要素（すべて盛り込むこと）
1. 具体的な数字（統計・面積・売上・年数など）を最低3つ入れる
2. 固有名詞（地名・企業名・人名・商品名）を多用する
3. 静岡県民が「そうそう！」と感じるローカルリアリティを入れる
4. 県外者が「こんな話があったのか」と驚く発見を最低1つ盛り込む

## 執筆ルール
- 冒頭200字以内で「なぜこの記事を最後まで読むべきか」を明示する
- 文体: 親しみやすい一人称（「実は...」「知っていましたか？」「正直に言うと...」スタイル）
- 文字数: 2,500〜3,500字
- markdown形式（# H1タイトル、## H2セクション区切り）
- 最初の行は「# ${articleDef.title}」で始める
- 最後に「次回の静岡DEEP」予告を入れる（${nextTitle ? `次回: 「${nextTitle}」` : '次回もお楽しみに'})

## 禁止事項
- 「富士山が美しい」「お茶が有名」などの観光パンフレット的な月並み表現
- データのない主観的な断言（「〜と言われています」のみで終わる文）
- 宣伝・PR口調（「ぜひ訪れてみてください！」の連発）
- タイトルの繰り返し（冒頭でタイトルを言い換えるだけのスタート）

記事本文のみを出力してください。前置き・後記は不要です。`;
}

// ========================================
// 記事生成（Claude API）
// ========================================
async function generateArticle(articleDef) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY が設定されていません。.envに追加してください。');
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(articleDef);

  console.error('🤖 Claude APIで記事を生成中...');
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].text;
}

// ========================================
// メイン処理
// ========================================
async function main() {
  // .envを読み込む
  const envPath = path.join(SCRIPT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const indexArg = args.indexOf('--index');
  const forceIndex = indexArg !== -1 ? parseInt(args[indexArg + 1], 10) : null;

  // 進捗を読み込む
  const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  const nextIndex = forceIndex ?? progress.next_article_index;

  // 次の記事を取得
  const articleDef = ARTICLES.find((a) => a.index === nextIndex);
  if (!articleDef) {
    console.error(`✅ 記事番号 ${nextIndex} は存在しません（全30本完了済みか番号が不正）`);
    process.exit(0);
  }

  console.error(`📋 記事: [${nextIndex}/30] ${articleDef.title}`);
  console.error(`   シリーズ: ${articleDef.seriesName} | パターン: ${articleDef.pattern}`);

  // dry-runの場合はプロンプトのみ表示
  if (dryRun) {
    console.error('\n--- プロンプトプレビュー ---');
    console.error(buildPrompt(articleDef));
    return;
  }

  // 記事を生成
  const content = await generateArticle(articleDef);

  // ファイルに保存
  const filename = `article-${String(nextIndex).padStart(2, '0')}.md`;
  const filepath = path.join(ARTICLES_DIR, filename);
  fs.writeFileSync(filepath, content, 'utf-8');
  console.error(`✅ 記事を保存: ${filepath}`);

  // 進捗を更新（--indexで指定した場合は next_article_index を変更しない）
  if (!forceIndex) {
    progress.next_article_index = nextIndex + 1;
  }
  // posted配列に追加（重複しない場合のみ）
  const alreadyPosted = progress.posted.find((p) => p.index === nextIndex);
  if (!alreadyPosted) {
    progress.posted.push({
      index: nextIndex,
      title: articleDef.title,
      file: filename,
      thumbnail: `thumbnail-${String(nextIndex).padStart(2, '0')}.png`,
      note_url: null,
      posted_at: null,
      tags: articleDef.tags,
      series: articleDef.series,
    });
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  }

  // stdoutにファイルパスを出力（daily-shizuoka-post.jsが読み取る）
  process.stdout.write(filepath);
}

main().catch((err) => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
