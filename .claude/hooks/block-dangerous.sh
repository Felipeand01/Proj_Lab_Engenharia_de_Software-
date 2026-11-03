#!/usr/bin/env bash

COMMAND=$(jq -r '.tool_input.command // ""')

deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

if echo "$COMMAND" | grep -Eqi '(^|[;&|[:space:]])git[[:space:]]+reset[[:space:]]+--hard([[:space:]]|$)'; then
  deny "Bloqueado: git reset --hard é uma operação destrutiva."
fi

if echo "$COMMAND" | grep -Eqi '(^|[;&|[:space:]])git[[:space:]]+clean([[:space:]]|$)'; then
  deny "Bloqueado: git clean pode apagar arquivos locais."
fi

if echo "$COMMAND" | grep -Eqi 'git[[:space:]]+push([^;&|]*)(--force|-f)([[:space:]]|$)'; then
  deny "Bloqueado: force push não é permitido."
fi

if echo "$COMMAND" | grep -Eqi '(^|[;&|[:space:]])rm[[:space:]]+(-[^[:space:]]*r[^[:space:]]*f|-[^[:space:]]*f[^[:space:]]*r)([[:space:]]|$)'; then
  deny "Bloqueado: rm -rf é uma operação destrutiva."
fi

if echo "$COMMAND" | grep -Eqi 'docker[[:space:]]+compose[[:space:]]+down([^;&|]*)-[^-[:space:]]*v([[:space:]]|$)|docker[[:space:]]+compose[[:space:]]+down([^;&|]*)--volumes([[:space:]]|$)'; then
  deny "Bloqueado: remover volumes Docker pode apagar dados persistentes."
fi

exit 0
