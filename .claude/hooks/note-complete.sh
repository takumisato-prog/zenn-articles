#!/bin/bash
# 「note完了」入力時にprogress.jsonのnoteフラグを更新

PROGRESS_FILE="/Users/satoutakumi/AI/projects/monetize/progress.json"
TODAY=$(date +%Y-%m-%d)

# 入力からファイル名を取得（例: "note完了 article-02.md"）
INPUT="$CLAUDE_USER_INPUT"
FILE=$(echo "$INPUT" | grep -oE 'article-[0-9]+\.md')

if [ -z "$FILE" ]; then
  # ファイル名が指定されていない場合は最初のnote未投稿記事を自動選択
  FILE=$(python3 -c "
import json
with open('$PROGRESS_FILE') as f:
    data = json.load(f)
for a in data['posted']:
    if not a.get('note', True) and a.get('file'):
        print(a['file'])
        break
")
fi

if [ -z "$FILE" ]; then
  echo "note未投稿の記事が見つかりませんでした。"
  exit 0
fi

# progress.jsonを更新
python3 -c "
import json
with open('$PROGRESS_FILE') as f:
    data = json.load(f)
updated = False
for a in data['posted']:
    if a.get('file') == '$FILE':
        a['note'] = True
        a['note_date'] = '$TODAY'
        a['status'] = a.get('status', '').replace('note手動投稿待ち', '').strip('・') + '・note投稿済み'
        updated = True
        break
if updated:
    with open('$PROGRESS_FILE', 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print('✅ ' + '$FILE' + ' のnote投稿完了を記録しました（' + '$TODAY' + '）')
else:
    print('⚠️  ' + '$FILE' + ' が progress.json に見つかりませんでした')
"
