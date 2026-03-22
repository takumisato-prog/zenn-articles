#!/bin/bash
# 「開始」入力時にnote未投稿の記事を検出してコピペ手順を表示

MONETIZE_DIR="/Users/satoutakumi/AI/projects/monetize"
PROGRESS_FILE="$MONETIZE_DIR/progress.json"

# jqがなければpythonで代替
if command -v jq &> /dev/null; then
  PENDING=$(jq -r '.posted[] | select(.note == false and .file != null) | .file + "|" + .title' "$PROGRESS_FILE")
else
  PENDING=$(python3 -c "
import json
with open('$PROGRESS_FILE') as f:
    data = json.load(f)
for a in data['posted']:
    if not a.get('note', True) and a.get('file'):
        print(a['file'] + '|' + a['title'])
")
fi

if [ -z "$PENDING" ]; then
  echo "note投稿待ち記事: なし（全記事投稿済み）"
  exit 0
fi

echo "========================================"
echo "  📝 note未投稿の記事があります"
echo "========================================"
echo ""

while IFS='|' read -r file title; do
  ARTICLE_PATH="$MONETIZE_DIR/$file"
  if [ ! -f "$ARTICLE_PATH" ]; then
    continue
  fi

  echo "【記事タイトル】"
  echo "$title"
  echo ""
  echo "【noteへの投稿手順】"
  echo "1. https://note.com を開く"
  echo "2. 「投稿」→「テキスト」を選択"
  echo "3. タイトルに上記タイトルを貼り付け"
  echo "4. 本文に以下をコピペ（---より下の部分）"
  echo "5. 「公開設定」→「無料」→「公開する」"
  echo ""
  echo "---本文ここから---"
  # 冒頭の管理情報を除いた本文を出力（最初の---区切り線以降）
  python3 -c "
import sys
lines = open('$ARTICLE_PATH').readlines()
started = False
separator_count = 0
for line in lines:
    stripped = line.rstrip()
    if stripped == '---':
        separator_count += 1
        if separator_count == 1:
            started = True
            continue
    if started:
        print(stripped)
" | sed '/^\*\*公開先\*\*/d' | sed '/^\*\*価格\*\*/d' | sed '/^\*\*想定字数\*\*/d'
  echo "---本文ここまで---"
  echo ""
  echo ">>> 投稿後はClaude Codeに「投稿した」と伝えてください <<<"
  echo ""
done <<< "$PENDING"
