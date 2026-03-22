/**
 * 静岡・東海 消費者向けXアカウント キュー投稿
 * tokai-x-post-queue.json から未投稿の次の1件を投稿する
 *
 * 使い方:
 *   node post-next-tokai-x.js
 *
 * cronで毎日9,13,16,20,22時に実行:
 *   0 9,13,16,20,22 * * * cd /Users/satoutakumi/AI/projects/monetize/scripts && /usr/local/bin/node post-next-tokai-x.js >> /tmp/tokai-x-post.log 2>&1
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCRIPTS_DIR = import.meta.dirname;
const QUEUE_PATH = path.join(SCRIPTS_DIR, 'tokai-x-post-queue.json');

function main() {
  console.log('========================================');
  console.log('  静岡・東海アカウント キュー投稿');
  console.log(`  ${new Date().toLocaleString('ja-JP')}`);
  console.log('========================================');

  if (!fs.existsSync(QUEUE_PATH)) {
    console.log('⚠️  キューファイルがありません。generate-tokai-x-posts.js を先に実行してください。');
    process.exit(0);
  }

  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'));
  const today = new Date().toISOString().slice(0, 10);

  if (queue.date !== today) {
    console.log(`⚠️  キューが古い（${queue.date}）。今日のキューがありません。`);
    process.exit(0);
  }

  const nextPost = queue.posts.find(p => !p.posted);
  if (!nextPost) {
    console.log('✅ 今日のキューは全件投稿済みです。');
    process.exit(0);
  }

  console.log(`\n投稿 [${nextPost.index}/5] ${nextPost.scheduled_time} 予定:`);
  console.log(nextPost.text);
  console.log('');

  const scriptPath = path.join(SCRIPTS_DIR, 'publish-tokai-x.js');
  const escaped = nextPost.text.replace(/"/g, '\\"').replace(/\n/g, '\\n');

  try {
    execSync(`/usr/local/bin/node "${scriptPath}" "${escaped}"`, {
      stdio: 'inherit',
      cwd: SCRIPTS_DIR,
    });

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
