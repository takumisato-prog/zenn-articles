# セットアップ手順

## 1. 依存パッケージをインストール

```bash
cd /Users/satoutakumi/AI/projects/monetize/scripts
npm install
npx playwright install chromium
```

---

## 2. Zennのセットアップ

### 2-1. GitHubリポジトリを作成

1. GitHub（github.com）にログイン
2. 右上の「+」→「New repository」をクリック
3. リポジトリ名を `zenn-articles` にする（公開設定はPublicでもPrivateでも可）
4. 「Create repository」をクリック

### 2-2. Zennアカウントを作成してGitHub連携

1. zenn.dev にアクセスしてGitHubでサインアップ
2. ダッシュボード →「GitHubからのデプロイ」→「リポジトリを連携する」
3. 作成した `zenn-articles` リポジトリを選択して連携

### 2-3. Zennリポジトリをローカルにclone

```bash
cd /Users/satoutakumi/AI/projects/monetize
git clone https://github.com/<あなたのGitHubユーザー名>/zenn-articles.git zenn-repo
cd zenn-repo
mkdir -p articles
touch .gitkeep
git add .
git commit -m "初期セットアップ"
git push origin main
```

### 2-4. スクリプトのリポジトリパスを確認

[publish-zenn.js](publish-zenn.js) の以下の行が正しいことを確認：
```js
const ZENN_REPO_PATH = path.resolve('../zenn-repo');
```

---

## 3. noteのセットアップ

### 3-1. noteアカウントを作成

1. note.com にアクセス
2. 「新規登録」→ メールアドレスで登録（**メール/パスワードでの登録を推奨**）
3. ログイン確認

### 3-2. .envファイルを作成

```bash
cd /Users/satoutakumi/AI/projects/monetize/scripts
cp .env.example .env
```

`.env` ファイルを開いて、noteのメールアドレスとパスワードを入力：

```
NOTE_EMAIL=登録したメールアドレス
NOTE_PASSWORD=設定したパスワード
```

> ⚠️ `.env` ファイルはGitにコミットしないこと（.gitignoreに追加推奨）

---

## 4. 動作確認

### Zennのみ投稿
```bash
cd /Users/satoutakumi/AI/projects/monetize/scripts
node publish-zenn.js ../article-01.md
```

### noteのみ投稿
```bash
node publish-note.js ../article-01.md
```

### 両方まとめて投稿
```bash
node publish-all.js ../article-01.md
```

### noteを下書きのみにしたい場合
```bash
node publish-all.js ../article-01.md --draft
```

---

## 5. 記事を追加するたびの手順

1. `projects/monetize/` に新しいmarkdownファイルを作成（例: `article-02.md`）
2. 以下のコマンドを実行するだけで両方に投稿される

```bash
cd /Users/satoutakumi/AI/projects/monetize/scripts
node publish-all.js ../article-02.md
```

---

## トラブルシューティング

| エラー | 原因 | 対処 |
|-------|------|------|
| `Zennリポジトリが見つかりません` | zenn-repoのパスが間違い | `publish-zenn.js` の `ZENN_REPO_PATH` を修正 |
| `git push に失敗しました` | GitHub認証エラー | `gh auth login` でGitHub CLIの認証を通す |
| `.env ファイルが見つかりません` | .envが未作成 | `cp .env.example .env` で作成して値を入力 |
| `公開ボタンが見つかりませんでした` | noteのUI変更 | `publish-note.js` のセレクタを最新のUIに合わせて修正 |
