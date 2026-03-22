/**
 * キューから次のXポストを投稿する
 *
 * 使い方:
 *   node post-next-x.js
 *
 * cronで2時間おきに実行（7時〜翌1時）:
 *   0 7,9,11,13,15,17,19,21,23,1 * * * cd /Users/satoutakumi/AI/projects/monetize/scripts && /usr/local/bin/node post-next-x.js >> /tmp/x-post.log 2>&1
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCRIPTS_DIR = import.meta.dirname;
const QUEUE_PATH = path.join(SCRIPTS_DIR, 'x-post-queue.json');

function main() {
  console.log('========================================');
  console.log('  X キュー投稿');
  console.log(`  ${new Date().toLocaleString('ja-JP')}`);
  console.log('========================================');

  // キューファイルの確認
  if (!fs.existsSync(QUEUE_PATH)) {
    console.log('⚠️  キューファイルがありません。generate-daily-x-posts.js を先に実行してください。');
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

  console.log(`\n投稿 [${nextPost.index}/10]:`);
  console.log(nextPost.text);
  console.log('');

  // publish-x.jsを呼び出して投稿
  const scriptPath = path.join(SCRIPTS_DIR, 'publish-x.js');
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
