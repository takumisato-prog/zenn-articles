# 静岡DEEP — Note.com 毎日自動投稿システム

静岡での企業認知度向上を目的として、静岡テーマの記事をNote.comに毎日自動投稿するシステム。

## セットアップ

```bash
cd scripts
npm install
```

## 初回のみ: Note.comログインセッションの確認

`browser-profile/` が存在すれば既にログイン済み。
セッションが切れた場合は monetize プロジェクトの `save-note-session.js` を実行してコピーし直す。

## 使い方

### 手動実行（テスト用）

```bash
cd scripts

# プロンプト確認（API呼び出しなし）
node generate-shizuoka-article.js --dry-run

# 記事生成のみ
node generate-shizuoka-article.js

# サムネイル生成のみ
node generate-thumbnail.js ../articles/article-01.md

# 下書きとして投稿確認
node publish-note.js ../articles/article-01.md ../thumbnails/thumbnail-01.png --draft

# フルフロー（下書き）
node daily-shizuoka-post.js --draft

# フルフロー（公開）
node daily-shizuoka-post.js
```

### cron設定（毎朝7:00自動投稿）

```bash
crontab -e
```

以下の行を追加:

```
0 7 * * * cd /Users/satoutakumi/AI/projects/dev/shizuoka-note && node scripts/daily-shizuoka-post.js >> scripts/daily-post.log 2>&1
```

### ログ確認

```bash
tail -f scripts/daily-post.log
```

## 記事シリーズ（全30本）

| シリーズ | テーマ | 本数 |
|---------|--------|------|
| A | 静岡ディープ探訪（常識覆し・謎解き系） | 10本 |
| B | 静岡ビジネス解剖（数字・事例系） | 8本 |
| C | 静岡グルメ＆カルチャー深掘り | 8本 |
| D | 静岡×AI・DX最前線 | 4本 |

## ファイル構成

```
shizuoka-note/
├── scripts/
│   ├── generate-shizuoka-article.js  # Claude APIで記事生成（30本テーマ内蔵）
│   ├── generate-thumbnail.js          # Playwrightでサムネイル生成（1280x670px）
│   ├── publish-note.js                # Note.com自動投稿（サムネイル対応）
│   ├── daily-shizuoka-post.js         # 毎日投稿統括スクリプト
│   ├── browser-profile/               # Noteログインセッション
│   └── daily-post.log                 # 実行ログ
├── templates/
│   └── thumbnail.html                 # サムネイルHTMLテンプレート
├── articles/                          # 生成済み記事（.md）
├── thumbnails/                        # 生成済みサムネイル（.png）
└── progress.json                      # 投稿進捗管理
```

## Note投稿戦略

- **シリーズ名**: 「静岡DEEP」——知られざる静岡の面白い話
- **投稿時間**: 毎朝7:00
- **固定タグ**: #静岡 #静岡県 #静岡情報
- **マガジン**: Note内で「静岡DEEPマガジン」を作成して全記事を登録する
