/**
 * Zenn自動投稿スクリプト
 *
 * 使い方:
 *   node publish-zenn.js <記事ファイルパス>
 *   例: node publish-zenn.js ../article-01.md
 *
 * 事前準備:
 *   1. ZENN_REPO_PATH に Zenn連携済みGitHubリポジトリのパスを設定
 *   2. そのリポジトリがGitHubにpush済みであること
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import matter from 'gray-matter';

// ========================================
// 設定（自分の環境に合わせて変更する）
// ========================================
const ZENN_REPO_PATH = path.resolve('../zenn-repo'); // Zenn用リポジトリのパス
const ZENN_USERNAME = 'takumisato_prog'; // ZennユーザーID（要確認）
const PROGRESS_FILE = path.resolve('../progress.json'); // 投稿管理ファイル

// ========================================
// 記事のフロントマターをZenn形式に変換
// ========================================
function toZennFrontmatter(title) {
  // タイトルから絵文字を自動選択
  const emojiMap = [
    { keywords: ['claude', 'ai', 'エージェント'], emoji: '🤖' },
    { keywords: ['会社', '組織', '部門'], emoji: '🏢' },
    { keywords: ['自動', 'スクリプト', '投稿'], emoji: '⚙️' },
    { keywords: ['副業', 'マネタイズ', '収益'], emoji: '💰' },
    { keywords: ['note', 'zenn', '記事'], emoji: '📝' },
  ];

  const lowerTitle = title.toLowerCase();
  const matched = emojiMap.find(({ keywords }) =>
    keywords.some((k) => lowerTitle.includes(k))
  );
  const emoji = matched ? matched.emoji : '📌';

  return {
    title,
    emoji,
    type: 'idea', // 技術記事なら "tech"、考察・体験談なら "idea"
    topics: ['claudecode', 'ai', '副業', 'note'],
    published: true,
  };
}

// ========================================
// タイトルからZennのスラッグ（ファイル名）を生成
// ========================================
function toSlug(title) {
  // 日本語タイトルを英数字のスラッグに変換
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = Math.random().toString(36).substring(2, 7);
  return `${datePart}-${randomPart}`;
}

// ========================================
// markdownファイルをZenn形式に変換して保存
// ========================================
function convertToZennFormat(articlePath) {
  const raw = fs.readFileSync(articlePath, 'utf-8');

  // フロントマターがある場合はパース、ない場合はH1からタイトルを取得
  let title = '';
  let body = raw;

  const h1Match = raw.match(/^#\s+(.+)$/m);
  if (h1Match) {
    title = h1Match[1].trim();
    // H1行を本文から除去（Zennはタイトルをフロントマターで管理）
    body = raw.replace(/^#\s+.+\n\n?/, '');
  }

  if (!title) {
    throw new Error('記事のタイトル（# H1）が見つかりません');
  }

  // Zenn用の区切り行（**公開先**: 等）を除去
  body = body.replace(/^\*\*公開先\*\*.*\n/m, '');
  body = body.replace(/^\*\*価格\*\*.*\n/m, '');
  body = body.replace(/^\*\*想定字数\*\*.*\n/m, '');
  body = body.replace(/^---\n\n/, '');

  const frontmatter = toZennFrontmatter(title);
  const slug = toSlug(title);
  const outputFileName = `${slug}.md`;
  const outputPath = path.join(ZENN_REPO_PATH, 'articles', outputFileName);

  // gray-matterでフロントマター付きファイルを生成
  const zennContent = matter.stringify(body.trim(), frontmatter);

  return { outputPath, zennContent, slug, title };
}

// ========================================
// GitHubにpushしてZennに公開
// ========================================
function pushToGitHub(repoPath, filePath, title) {
  try {
    const gitDir = path.join(repoPath, '.git');
    const gitCmd = `git --git-dir="${gitDir}" --work-tree="${repoPath}"`;
    const relFilePath = path.relative(repoPath, filePath);
    execSync(`${gitCmd} add "${relFilePath}"`, { stdio: 'inherit' });
    execSync(`${gitCmd} commit -m "記事追加: ${title}"`, { stdio: 'inherit' });
    execSync(`${gitCmd} push origin main`, { stdio: 'inherit' });
    console.log('\n✅ GitHubにpushしました。Zennに自動公開されます。');
  } catch (err) {
    console.error('\n❌ git push に失敗しました:', err.message);
    throw err;
  }
}

// ========================================
// メイン処理
// ========================================
async function main() {
  const articlePath = process.argv[2];

  if (!articlePath) {
    console.error('使い方: node publish-zenn.js <記事ファイルパス>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(articlePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`ファイルが見つかりません: ${resolvedPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(ZENN_REPO_PATH)) {
    console.error(`Zennリポジトリが見つかりません: ${ZENN_REPO_PATH}`);
    console.error('setup.md の手順でZennリポジトリをセットアップしてください。');
    process.exit(1);
  }

  console.log(`📄 記事を変換中: ${resolvedPath}`);
  const { outputPath, zennContent, slug, title } = convertToZennFormat(resolvedPath);

  fs.writeFileSync(outputPath, zennContent, 'utf-8');
  console.log(`✅ Zenn形式に変換: ${outputPath}`);
  console.log(`   スラッグ: ${slug}`);
  console.log(`   タイトル: ${title}`);

  console.log('\n🚀 GitHubにpush中...');
  pushToGitHub(ZENN_REPO_PATH, outputPath, title);

  // progress.json に zenn_url を記録
  const zennUrl = `https://zenn.dev/${ZENN_USERNAME}/articles/${slug}`;
  if (fs.existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    const articleFileName = path.basename(resolvedPath);
    const matched = progress.posted.find((a) => a.file === articleFileName);
    if (matched) {
      matched.zenn_url = zennUrl;
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
      console.log(`✅ progress.json に zenn_url を記録しました: ${zennUrl}`);
    }
  }
  console.log(`\n🔗 Zenn URL: ${zennUrl}`);
}

main().catch((err) => {
  console.error('エラー:', err.message);
  process.exit(1);
});
