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

  // 未投稿の次のポストを取得
  const nextPost = queue.posts.find(p => !p.posted);
  if (!nextPost) {
    console.log('✅ 今日のキューは全件投稿済みです。');
    process.exit(0);
  }

  console.log(`\n投稿 [${nextPost.index}/5] ${nextPost.scheduled_time} 予定:`);
  console.log(nextPost.text);
  console.log('');

  // publish-shizuoka-x.js を呼び出して投稿
  const scriptPath = path.join(SCRIPTS_DIR, 'publish-shizuoka-x.js');
  const escaped = nextPost.text.replace(/"/g, '\\"').replace(/\n/g, '\\n');

  try {
    execSync(`/usr/local/bin/node "${scriptPath}" "${escaped}"`, {
      stdio: 'inherit',
      cwd: SCRIPTS_DIR,
    });

    // 投稿済みにマーク
    nextPost.posted = true;
    nextPost.posted_at = new Date().toISOString();
    fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2), 'utf-8');

    const remaining = queue.posts.filter(p => !p.posted).length;
    console.log(`\n✅ 投稿完了（残り ${remaining} 件）`);
  } catch (err) {
    console.error('❌ 投稿エラー:', err.message);
    process.exit(1);
  }
}

main();
