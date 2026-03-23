/**
 * X（Twitter）自動投稿スクリプト
 *
 * 使い方:
 *   node publish-x.js "<投稿テキスト>"
 *   node publish-x.js --file <テキストファイルパス>
 *   node publish-x.js --article <記事mdファイル>  # 記事から告知ツイートを生成
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCRIPTS_DIR = import.meta.dirname;
const PROFILE_DIR = path.join(SCRIPTS_DIR, 'x-browser-profile');
const ENV_PATH = path.join(SCRIPTS_DIR, '.env');

function loadEnv() {
  const env = fs.readFileSync(ENV_PATH, 'utf-8');
  return {
    username: env.match(/X_USERNAME=(.+)/)?.[1]?.trim(),
    password: env.match(/X_PASSWORD=(.+)/)?.[1]?.trim(),
  };
}

// ========================================
// 記事mdからX告知文を生成
// ========================================
function generateTweetFromArticle(articlePath) {
  const content = fs.readFileSync(articlePath, 'utf-8');
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : '新記事';
  return `新記事を公開しました。

「${title}」

Claude Codeを使って実際に試した内容を全公開しています。

Zennで無料公開中👇

#ClaudeCode #AI副業 #AIエージェント`;
}

// ========================================
// Xにログイン
// ========================================
async function login(page, username, password) {
  console.log('🔐 Xにログイン中...');
  await page.goto('https://x.com/login');
  await page.waitForTimeout(2000);

  // ユーザー名入力
  const usernameInput = await page.waitForSelector(
    'input[name="text"], input[autocomplete="username"]',
    { timeout: 15000 }
  );
  await usernameInput.fill(username);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  // パスワード入力（途中で電話番号確認が入る場合も対処）
  const passwordInput = await page.waitForSelector(
    'input[name="password"], input[type="password"]',
    { timeout: 10000 }
  ).catch(() => null);

  if (!passwordInput) {
    // 電話番号/メール確認画面の場合
    const confirmInput = await page.$('input[name="text"]');
    if (confirmInput) {
      await confirmInput.fill(username);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }
    const pwInput = await page.waitForSelector('input[name="password"]', { timeout: 10000 });
    await pwInput.fill(password);
  } else {
    await passwordInput.fill(password);
  }

  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  console.log('✅ ログイン完了');
}

// ========================================
// ツイートを投稿
// ========================================
async function postTweet(page, text) {
  console.log('📝 ツイートを投稿中...');

  // 投稿作成URLに直接アクセス
  await page.goto('https://x.com/compose/post');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCRIPTS_DIR, 'debug-1-compose.png') });
  console.log('📸 debug-1-compose.png 保存');

  // 投稿テキストエリアをlocatorで操作（force対応）
  const tweetBox = page.locator('[data-testid="tweetTextarea_0"]').first();
  await tweetBox.waitFor({ timeout: 15000 });
  await tweetBox.click({ force: true });
  await page.waitForTimeout(500);

  // テキストを1行ずつ入力（Shift+Enterで改行。XのDraft.jsエディタ対応）
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) {
      await page.keyboard.type(lines[i], { delay: 15 });
    }
    if (i < lines.length - 1) {
      await page.keyboard.press('Shift+Enter');
    }
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCRIPTS_DIR, 'debug-2-typed.png') });
  console.log('📸 debug-2-typed.png 保存（テキスト入力後）');

  // 文字が入力されているか確認
  const tweetBoxContent = await tweetBox.textContent();
  if (!tweetBoxContent || tweetBoxContent.trim().length === 0) {
    throw new Error('テキストが入力されませんでした');
  }

  // Cmd+Enter（Meta+Enter）で投稿を試みる
  await page.keyboard.press('Meta+Enter');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCRIPTS_DIR, 'debug-3-after-post.png') });
  console.log('📸 debug-3-after-post.png 保存（Meta+Enter後）');

  let stillOnCompose = await page.url().includes('compose');
  if (!stillOnCompose) {
    console.log('✅ 投稿完了（Meta+Enter）！');
    return;
  }

  // フォールバック: 投稿ボタンをクリック
  console.log('Meta+Enterで投稿できず、ボタンクリックを試みます...');
  const postBtn = page.locator('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]').last();
  await postBtn.waitFor({ timeout: 10000 });
  await postBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await postBtn.click();

  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(SCRIPTS_DIR, 'debug-4-after-button.png') });
  console.log('📸 debug-4-after-button.png 保存（ボタンクリック後）');

  stillOnCompose = await page.url().includes('compose');
  if (stillOnCompose) {
    throw new Error('投稿後もcompose画面のまま。投稿失敗の可能性があります');
  }
  console.log('✅ 投稿完了（ボタンクリック）！');
}

// ========================================
// メイン処理
// ========================================
async function main() {
  const args = process.argv.slice(2);
  let tweetText = '';

  if (args[0] === '--file' && args[1]) {
    tweetText = fs.readFileSync(args[1], 'utf-8').trim();
  } else if (args[0] === '--article' && args[1]) {
    tweetText = generateTweetFromArticle(args[1]);
  } else if (args[0]) {
    tweetText = args[0];
  } else {
    console.error('使い方:');
    console.error('  node publish-x.js "<テキスト>"');
    console.error('  node publish-x.js --file <ファイル>');
    console.error('  node publish-x.js --article <記事md>');
    process.exit(1);
  }

  console.log('========================================');
  console.log('  X 自動投稿');
  console.log('========================================');
  console.log('投稿内容:');
  console.log(tweetText);
  console.log('');

  const { username, password } = loadEnv();
  if (!username || !password) throw new Error('X_USERNAME / X_PASSWORD が .env に見つかりません');

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = await context.newPage();

  try {
    // ログイン済みか確認
    await page.goto('https://x.com/home');
    await page.waitForTimeout(3000);
    const isLoggedIn = await page.$('[data-testid="tweetTextarea_0"], [data-testid="SideNav_NewTweet_Button"]');

    if (!isLoggedIn) {
      await login(page, username, password);
    } else {
      console.log('✅ セッション有効（ログインスキップ）');
    }

    await postTweet(page, tweetText);
    console.log('\n🎉 X投稿完了！');
  } catch (err) {
    console.error('\n❌ エラー:', err.message);
    await page.screenshot({ path: path.join(SCRIPTS_DIR, 'x-error.png') }).catch(() => {});
    await context.close().catch(() => {});
    process.exit(1);
  } finally {
    await page.waitForTimeout(2000);
    await context.close();
  }
}

main().catch((err) => {
  console.error('エラー:', err.message);
  process.exit(1);
});
