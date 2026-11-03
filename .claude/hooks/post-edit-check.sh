#!/usr/bin/env bash

OUTPUT=$(git diff --check 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  jq -n --arg context "A alteração introduziu problemas de whitespace:\n$OUTPUT" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: $context
    }
  }'
fi

exit 0
