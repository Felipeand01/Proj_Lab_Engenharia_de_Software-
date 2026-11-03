#!/usr/bin/env bash

BRANCH=$(git branch --show-current 2>/dev/null || echo "desconhecida")
STATUS=$(git status --short 2>/dev/null | head -n 20)

if [ -z "$STATUS" ]; then
  STATUS="working tree clean"
fi

TG3_STATUS=""
NEXT_TASK=""

if [ -f ".claude/state/TG3_STATUS.md" ]; then
  TG3_STATUS=$(cat .claude/state/TG3_STATUS.md)
fi

if [ -f ".claude/state/NEXT_TASK.md" ]; then
  NEXT_TASK=$(cat .claude/state/NEXT_TASK.md)
fi

CONTEXT=$(cat <<TEXT
Estado atual do projeto:
Branch atual: $BRANCH

Git status:
$STATUS

TG3 status:
$TG3_STATUS

Próxima tarefa:
$NEXT_TASK
TEXT
)

jq -n --arg context "$CONTEXT" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $context
  }
}'
