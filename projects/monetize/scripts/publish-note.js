/**
 * note 全自動投稿スクリプト（永続プロファイル方式）
 *
 * 使い方:
 *   node publish-note.js <記事ファイルパス> [--draft]
 *   例: node publish-note.js ../article-01.md          # 公開まで自動
 *   例: node publish-note.js ../article-01.md --draft  # 下書き保存のみ
 *
 * 事前準備:
 *   node save-note-session.js を一度実行してログイン状態を保存する
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const PROFILE_DIR = path.resolve(import.meta.dirname, 'browser-profile');

// ========================================
// markdownの本文をnote用テキストに変換
// ========================================
function convertToNoteText(raw) {
  let text = raw;
  text = text.replace(/^#\s+.+\n\n?/, '');
  text = text.replace(/^\*\*公開先\*\*.*\n/m, '');
  text = text.replace(/^\*\*価格\*\*.*\n/m, '');
  text = text.replace(/^\*\*想定字数\*\*.*\n/m, '');
  text = text.replace(/^---\n\n/, '');
  return text.trim();
}

function extractTitle(raw) {
  const h1Match = raw.match(/^#\s+(.+)$/m);
  if (!h1Match) throw new Error('記事のタイトル（# H1）が見つかりません');
  return h1Match[1].trim();
}

// ========================================
// 記事を投稿
// ========================================
async function postArticle(page, title, body, draftOnly) {
  console.log('\n📝 記事作成画面を開いています...');
  await page.goto('https://note.com/notes/new');

  // editor.note.com へのリダイレクトを待つ
  await page.waitForURL(/editor\.note\.com/, { timeout: 15000 }).catch(() => {});
  console.log(`   URL: ${page.url()}`);

  // エディタが表示されるまで待つ（最大20秒）
  console.log('   エディタ読み込み待機中...');
  const titleEl = await page.waitForSelector(
    '.ProseMirror, [contenteditable="true"], h1[contenteditable]',
    { timeout: 60000 }
  ).catch(() => null);

  if (!titleEl) throw new Error('エディタが開きませんでした。セッションが切れた可能性があります。');

  // タイトル入力（最初のcontenteditable要素）
  const titleInput = await page.$('[placeholder="タイトル"], h1[contenteditable="true"], [data-placeholder*="タイトル"]') ||
    (await page.$$('[contenteditable="true"]'))[0];

  if (!titleInput) throw new Error('タイトル入力欄が見つかりません');
  await titleInput.click();
  await titleInput.fill(title);
  console.log(`✅ タイトル入力: ${title}`);

  // 本文入力（2番目のcontenteditable、またはProseMirror）
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);

  const bodyInput = await page.$('.ProseMirror') ||
    (await page.$$('[contenteditable="true"]'))[1];

  if (!bodyInput) throw new Error('本文入力欄が見つかりません');
  await bodyInput.click();

  // クリップボード経由で貼り付け
  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text);
  }, body);
  const isMac = process.platform === 'darwin';
  await page.keyboard.press(isMac ? 'Meta+v' : 'Control+v');
  await page.waitForTimeout(2000);
  console.log('✅ 本文入力完了');

  if (draftOnly) {
    await page.keyboard.press(isMac ? 'Meta+s' : 'Control+s');
    await page.waitForTimeout(1500);
    console.log('✅ 下書き保存しました。');
    return;
  }

  // 公開ボタン
  console.log('\n🚀 公開処理を開始します...');
  for (const sel of ['button:has-text("公開設定")', 'button:has-text("投稿")', 'button:has-text("公開")']) {
    const btn = await page.$(sel);
    if (btn) { await btn.click(); break; }
  }
  await page.waitForTimeout(2000);

  for (const sel of ['button:has-text("公開する")', 'button:has-text("投稿する")']) {
    const btn = await page.$(sel);
    if (btn) {
      await btn.click();
      await page.waitForTimeout(2000);
      console.log('✅ 公開しました！');
      return;
    }
  }
  console.log('⚠️  公開ボタンが見つかりませんでした。手動で公開してください。');
}

// ========================================
// メイン処理
// ========================================
async function main() {
  const articlePath = process.argv[2];
  const draftOnly = process.argv.includes('--draft');

  if (!articlePath) {
    console.error('使い方: node publish-note.js <記事ファイルパス> [--draft]');
    process.exit(1);
  }

  const resolvedPath = path.resolve(articlePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`ファイルが見つかりません: ${resolvedPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(PROFILE_DIR)) {
    console.error('ブラウザプロファイルが見つかりません。');
    console.error('先に以下を実行してください: node save-note-session.js');
    process.exit(1);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const title = extractTitle(raw);
  const body = convertToNoteText(raw);
  console.log(`📄 記事を読み込みました: ${title}`);
  console.log(`   モード: ${draftOnly ? '下書き保存' : '公開'}`);

  // 永続プロファイルでブラウザを起動
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = await context.newPage();

  try {
    await postArticle(page, title, body, draftOnly);
    console.log('\n🎉 note投稿完了！');
  } catch (err) {
    console.error('\n❌ エラー:', err.message);
    await page.screenshot({ path: path.resolve(import.meta.dirname, 'error-screenshot.png') }).catch(() => {});
    console.error('   node save-note-session.js を再実行してセッションを更新してください。');
  } finally {
    await page.waitForTimeout(3000);
    await context.close();
  }
}

main().catch((err) => {
  console.error('エラー:', err.message);
  process.exit(1);
});
