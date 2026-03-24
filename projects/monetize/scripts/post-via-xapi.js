/**
 * X API v2 で1件ツイートを投稿する
 *
 * 使い方:
 *   node post-via-xapi.js "<投稿テキスト>"
 *
 * 必要な環境変数 (GitHub Secrets から渡す):
 *   X_CONSUMER_KEY
 *   X_CONSUMER_SECRET
 *   X_ACCESS_TOKEN
 *   X_ACCESS_TOKEN_SECRET
 */

import { TwitterApi } from 'twitter-api-v2';

async function main() {
  const text = process.argv[2];
  if (!text) {
    console.error('使い方: node post-via-xapi.js "<テキスト>"');
    process.exit(1);
  }

  const { X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = process.env;
  if (!X_CONSUMER_KEY || !X_CONSUMER_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
    console.error('❌ 必要な環境変数が設定されていません:');
    console.error('   X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET');
    process.exit(1);
  }

  const client = new TwitterApi({
    appKey: X_CONSUMER_KEY,
    appSecret: X_CONSUMER_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_TOKEN_SECRET,
  });

  console.log('投稿内容:');
  console.log(text);
  console.log('');

  const result = await client.v2.tweet(text);
  console.log('✅ 投稿完了！ tweet_id:', result.data.id);
}

main().catch(err => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
