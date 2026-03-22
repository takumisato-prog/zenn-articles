#!/bin/bash
# 「終了」入力時に GitHub へ自動プッシュ

cd /Users/satoutakumi/AI

# 変更がなければ何もしない
if git diff --quiet && git diff --staged --quiet && [ -z "$(git status --porcelain)" ]; then
  echo "変更なし。プッシュをスキップします。"
  exit 0
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
git add -A
git commit -m "自動保存: ${TIMESTAMP}"
git push origin main

echo "GitHubへのプッシュが完了しました。"
