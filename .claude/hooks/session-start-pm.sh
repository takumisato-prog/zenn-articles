#!/bin/bash
# セッション開始時にPMスキルをコンテキストに注入する
PM_CONTENT=$(cat /Users/satoutakumi/AI/.claude/skills/pm.md)
jq -n --arg content "$PM_CONTENT" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $content
  }
}'
