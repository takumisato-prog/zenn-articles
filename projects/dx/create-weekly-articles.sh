#!/bin/bash
# Googleワークスペース週次記事自動生成スクリプト
# 毎週月曜日 09:00 に実行
# cron設定: 0 9 * * 1 /Users/satoutakumi/AI/projects/dx/create-weekly-articles.sh

set -e

BASE_DIR="/Users/satoutakumi/AI/projects/dx"
LOG_FILE="$BASE_DIR/article-creation.log"
WEEK_NUM=$(date +%V)  # ISO週番号
YEAR=$(date +%Y)
DRIVE_BASE="Google Workspace記事"

echo "========================================" >> "$LOG_FILE"
echo "実行日時: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "週番号: ${YEAR}-W${WEEK_NUM}" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Claude CLIを使って記事を生成するプロンプト
PROMPT="gws-article-writerスキルに従って、今週（${YEAR}年第${WEEK_NUM}週）のGoogleワークスペース記事を5記事作成してください。
weekly-article-topics.jsonのスケジュールを参照し、まだ作成していないテーマから5記事を選んで作成・保存・Googleドライブアップロードまで完了させてください。
会社名は株式会社ふじサンバ、保存先は /Users/satoutakumi/AI/projects/dx/articles/ です。"

echo "Claude CLI実行開始..." >> "$LOG_FILE"

# Claude CLIで記事生成
claude --print "$PROMPT" >> "$LOG_FILE" 2>&1

# Googleドライブへ一括同期（claude CLIが個別アップロードできなかった場合のバックアップ）
echo "Googleドライブ同期中..." >> "$LOG_FILE"
for article_dir in "$BASE_DIR/articles"/*/; do
    article_name=$(basename "$article_dir")
    if [ -f "$article_dir/preview.html" ]; then
        rclone mkdir "gdrive:${DRIVE_BASE}/${article_name}" 2>> "$LOG_FILE"
        rclone copy "$article_dir" "gdrive:${DRIVE_BASE}/${article_name}/" 2>> "$LOG_FILE"
        echo "アップロード完了: $article_name" >> "$LOG_FILE"
    fi
done

echo "週次記事作成完了: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
