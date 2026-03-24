/**
 * キューファイルから未投稿の次の1件をX APIで投稿する
 * GitHub Actions から定時実行される
 *
 * 使い方:
 *   node post-next-xapi.js [キューファイル名]
 *   例: node post-next-xapi.js x-post-queue.json           (@altus_ai_jp)
 *   例: node post-next-xapi.js shizuoka-x-post-queue.json  (@altus_shizuoka)
 *
 * 必要な環境変数:
 *   X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 */

import { TwitterApi } from 'twitter-api-v2';
import fs from 'fs';
import path from 'path';

const SCRIPTS_DIR = import.meta.dirname;

async function main() {
  const queueFile = process.argv[2] || 'x-post-queue.json';
  const queuePath = path.isAbsolute(queueFile) ? queueFile : path.join(SCRIPTS_DIR, queueFile);

  console.log('========================================');
  console.log('  X キュー投稿（API版）');
  console.log(`  ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
  console.log(`  キュー: ${queueFile}`);
  console.log('========================================');

  if (!fs.existsSync(queuePath)) {
    console.log('⚠️  キューファイルがありません:', queuePath);
    process.exit(0);
  }

  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));

  // 今日の日付（JST）
  const today = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' });

  if (queue.date !== today) {
    console.log(`⚠️  キューが古い（${queue.date}）。今日 ${today} のキューがありません。`);
    process.exit(0);
  }

  // 未投稿の次の1件を取得
  const nextPost = queue.posts.find(p => !p.posted);
  if (!nextPost) {
    console.log('✅ 今日のキューは全件投稿済みです。');
    process.exit(0);
  }

  console.log(`\n投稿 [${nextPost.index}] ${nextPost.scheduled_time} 予定:`);
  console.log(nextPost.text);
  console.log('');

  const { X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = process.env;
  if (!X_CONSUMER_KEY || !X_CONSUMER_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
    console.error('❌ X API 環境変数が未設定です');
    process.exit(1);
  }

  const client = new TwitterApi({
    appKey: X_CONSUMER_KEY,
    appSecret: X_CONSUMER_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_TOKEN_SECRET,
  });

  const result = await client.v2.tweet(nextPost.text);
  console.log('✅ 投稿完了！ tweet_id:', result.data.id);

  // キューを更新
  nextPost.posted = true;
  nextPost.posted_at = new Date().toISOString();
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2), 'utf-8');

  const remaining = queue.posts.filter(p => !p.posted).length;
  console.log(`残り ${remaining} 件`);
}

main().catch(err => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
