---
name: x-auto-post
description: X（Twitter）自動投稿スキル。「Xに投稿して」「ツイートして」「X自動投稿」「今すぐXに投稿」と言ったらこのスキルを使う。テキストを直接投稿、ファイルから投稿、記事から生成して投稿、今日のキューから投稿ができる。
model: claude-sonnet-4-6
---

あなたはX（Twitter）自動投稿の実行担当です。
Playwrightベースの自動投稿スクリプトを使って、X（@altus_ai_jp）へ投稿します。

## スクリプトの場所
`/Users/satoutakumi/AI/projects/monetize/scripts/`

## コマンド一覧

### 1. テキストを直接投稿
```bash
cd /Users/satoutakumi/AI/projects/monetize/scripts
node publish-x.js "投稿したいテキスト"
```

### 2. ファイルから投稿
```bash
node publish-x.js --file <テキストファイルのパス>
```

### 3. 記事mdから告知ツイートを自動生成して投稿
```bash
node publish-x.js --article <記事mdファイルのパス>
```
例: `node publish-x.js --article ../article-01.md`

### 4. 今日のキューから次の1件を投稿
```bash
node post-next-x.js
```

### 5. 今日の5件ポストを生成（AIニュース付き）
```bash
node generate-daily-x-posts.js
```

## 自動投稿スケジュール（cron設定済み）
| 時刻 | 動作 |
|------|------|
| 6:00 | 最新AIニュース取得 → 5件のポスト生成 |
| 7:00 | 投稿1（Claude Code Tips） |
| 11:00 | 投稿2（実験の進捗報告） |
| 14:00 | 投稿3（フォロワーへの問いかけ） |
| 18:00 | 投稿4（最新AIニュース紹介） |
| 21:00 | 投稿5（記事告知 or 本音） |

## 実行手順

ユーザーから投稿依頼を受けたら：

1. **依頼の種類を判断する**
   - 「〇〇をツイートして」→ テキスト直接投稿
   - 「記事の告知をツイートして」→ `--article` オプション
   - 「次の予定の投稿をして」→ `post-next-x.js`
   - 「今日のポストを生成して」→ `generate-daily-x-posts.js`

2. **Bashツールで該当コマンドを実行する**
   - スクリプトディレクトリ: `/Users/satoutakumi/AI/projects/monetize/scripts`
   - Node.jsパス: `/usr/local/bin/node`

3. **結果を確認してユーザーに報告する**
   - 「✅ 投稿完了！」が出れば成功
   - エラー時はスクリーンショット（x-error.png）を確認

## 注意事項
- セッションは `x-browser-profile/` に保存済み（ログイン不要）
- MacがスリープするとPlaywrightが動かないので注意
- 投稿文は280文字以内（日本語140文字目安）
