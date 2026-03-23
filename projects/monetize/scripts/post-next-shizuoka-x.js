/**
 * 静岡特化Xアカウント（@altus_shizuoka）キュー投稿
 * shizuoka-x-post-queue.json から未投稿の次の1件を投稿する
 *
 * 使い方:
 *   node post-next-shizuoka-x.js
 *
 * cronで毎日8,12,15,19,22時に実行:
 *   0 8,12,15,19,22 * * * cd /Users/satoutakumi/AI/projects/monetize/scripts && /usr/local/bin/node post-next-shizuoka-x.js >> /tmp/shizuoka-x-post.log 2>&1
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCRIPTS_DIR = import.meta.dirname;
const QUEUE_PATH = path.join(SCRIPTS_DIR, 'shizuoka-x-post-queue.json');

function main() {
  console.log('========================================');
  console.log('  @altus_shizuoka キュー投稿');
  console.log(`  ${new Date().toLocaleString('ja-JP')}`);
  console.log('========================================');

  // キューファイルの確認
  if (!fs.existsSync(QUEUE_PATH)) {
    console.log('⚠️  キューファイルがありません。generate-shizuoka-x-posts.js を先に実行してください。');
    process.exit(0);
  }

  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'));
  const today = new Date().toISOString().slice(0, 10);

  // 今日のキューか確認
  if (queue.date !== today) {
    console.log(`⚠️  キューが古い（${queue.date}）。今日のキューがありません。`);
    process.exit(0);
  }

  // 現在時刻を分単位に変換
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  function parseTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  // 未投稿かつ予定時刻が現在以前のものを全件取得（PC電源オフで溜まった分も対応）
  const postsToSend = queue.posts.filter(p => !p.posted && parseTime(p.scheduled_time) <= currentMinutes);

  if (postsToSend.length === 0) {
    const nextPost = queue.posts.find(p => !p.posted);
    if (nextPost) {
      console.log(`⏳ 次の投稿は ${nextPost.scheduled_time} 予定です。`);
    } else {
      console.log('✅ 今日のキューは全件投稿済みです。');
    }
    process.exit(0);
  }

  console.log(`\n📋 投稿対象: ${postsToSend.length}件`);

  const scriptPath = path.join(SCRIPTS_DIR, 'publish-shizuoka-x.js');

  for (const post of postsToSend) {
    console.log(`\n投稿 [${post.index}/5] ${post.scheduled_time} 予定:`);
    console.log(post.text);
    console.log('');

    const tmpFile = `/tmp/x-post-${Date.now()}.txt`;
    fs.writeFileSync(tmpFile, post.text, 'utf-8');

    try {
      execSync(`/usr/local/bin/node "${scriptPath}" --file "${tmpFile}"`, {
        stdio: 'inherit',
        cwd: SCRIPTS_DIR,
      });

      post.posted = true;
      post.posted_at = new Date().toISOString();
      fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2), 'utf-8');

      const remaining = queue.posts.filter(p => !p.posted).length;
      console.log(`\n✅ 投稿完了（残り ${remaining} 件）`);
    } catch (err) {
      console.error(`❌ 投稿エラー [${post.index}]:`, err.message);
      process.exit(1);
    }
  }
}

main();
