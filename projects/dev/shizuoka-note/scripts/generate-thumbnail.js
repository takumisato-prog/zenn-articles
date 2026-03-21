/**
 * Playwrightでサムネイル画像（1280x670px）を生成するスクリプト
 *
 * 使い方:
 *   node generate-thumbnail.js <記事ファイルパス>
 *   例: node generate-thumbnail.js ../articles/article-01.md
 *
 * 出力: ../thumbnails/thumbnail-01.png（stdout にパスを出力）
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const SCRIPT_DIR = import.meta.dirname;
const ROOT = path.resolve(SCRIPT_DIR, '..');
const THUMBNAILS_DIR = path.join(ROOT, 'thumbnails');
const TEMPLATE_PATH = path.join(ROOT, 'templates', 'thumbnail.html');
const PROGRESS_FILE = path.join(ROOT, 'progress.json');

// ========================================
// タイトルを記事MDから抽出
// ========================================
function extractTitle(markdownText) {
  const match = markdownText.match(/^#\s+(.+)$/m);
  if (!match) throw new Error('記事のH1タイトル（# タイトル）が見つかりません');
  return match[1].trim();
}

// ========================================
// 記事番号をファイル名から取得
// ========================================
function extractArticleIndex(filepath) {
  const basename = path.basename(filepath);
  const match = basename.match(/article-(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// ========================================
// サムネイル生成（Playwright）
// ========================================
async function renderThumbnail(title, articleIndex, outputPath) {
  // progress.jsonからシリーズ情報を取得
  let seriesLabel = '静岡DEEP';
  let volText = `vol.${articleIndex}`;

  try {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    const entry = progress.posted.find((p) => p.index === articleIndex);
    if (entry && entry.series) {
      const seriesMap = { A: '静岡ディープ探訪', B: '静岡ビジネス解剖', C: '静岡グルメ＆カルチャー', D: '静岡×AI・DX' };
      seriesLabel = seriesMap[entry.series] || '静岡DEEP';
    }
  } catch (_) {
    // progress.jsonが読めなくてもデフォルト値で続行
  }

  // HTMLテンプレートを読み込む
  const templateHtml = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1280, height: 670 });

  // HTMLをセット（file://プロトコルだとGoogle Fontsが読めないのでsetContentを使う）
  await page.setContent(templateHtml, { waitUntil: 'domcontentloaded' });

  // Google Fonts読み込み待機（最大3秒）
  await page.waitForTimeout(2500);

  // タイトルとシリーズ情報を注入
  await page.evaluate(({ title, seriesLabel, volText }) => {
    // タイトル設定
    const titleEl = document.getElementById('title');
    if (titleEl) {
      titleEl.textContent = title;
      // タイトル長さに応じてフォントサイズを変更
      titleEl.classList.remove('long', 'xlong', 'xxlong');
      if (title.length > 50) titleEl.classList.add('xxlong');
      else if (title.length > 35) titleEl.classList.add('xlong');
      else if (title.length > 22) titleEl.classList.add('long');
    }
    // シリーズバッジ設定
    const seriesEl = document.getElementById('series-label');
    if (seriesEl) seriesEl.textContent = seriesLabel;
    const volEl = document.getElementById('vol-text');
    if (volEl) volEl.textContent = volText;
  }, { title, seriesLabel, volText });

  // スクリーンショット取得
  await page.screenshot({ path: outputPath, type: 'png' });
  await browser.close();
}

// ========================================
// メイン処理
// ========================================
async function main() {
  const articlePath = process.argv[2];

  if (!articlePath) {
    console.error('使い方: node generate-thumbnail.js <記事ファイルパス>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(articlePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`ファイルが見つかりません: ${resolvedPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const title = extractTitle(raw);
  const articleIndex = extractArticleIndex(resolvedPath);

  if (!articleIndex) {
    console.error('記事ファイル名から番号を取得できませんでした（例: article-01.md）');
    process.exit(1);
  }

  const outputFilename = `thumbnail-${String(articleIndex).padStart(2, '0')}.png`;
  const outputPath = path.join(THUMBNAILS_DIR, outputFilename);

  console.error(`🎨 サムネイル生成中: "${title}"`);
  await renderThumbnail(title, articleIndex, outputPath);
  console.error(`✅ サムネイル保存: ${outputPath}`);

  // stdoutにファイルパスを出力（daily-shizuoka-post.jsが読み取る）
  process.stdout.write(outputPath);
}

main().catch((err) => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
