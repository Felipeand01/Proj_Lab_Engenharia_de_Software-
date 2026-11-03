#!/usr/bin/env bash

INPUT=$(cat)

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"

if [ -z "$PROJECT_DIR" ] || [ ! -d "$PROJECT_DIR" ]; then
  exit 0
fi

cd "$PROJECT_DIR" || exit 0

STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"' | tr -c 'A-Za-z0-9._-' '_')
BACKGROUND_COUNT=$(echo "$INPUT" | jq -r '(.background_tasks // []) | length')

COUNT_FILE="/tmp/claude-tg3-stop-gate-${SESSION_ID}"

# Não validar enquanto ainda houver tarefas em background.
if [ "$BACKGROUND_COUNT" -gt 0 ]; then
  exit 0
fi

# Um Stop normal inicia uma nova sequência de validação.
if [ "$STOP_ACTIVE" != "true" ]; then
  rm -f "$COUNT_FILE"
fi

CHANGED_FILES=$(
  {
    git diff --name-only
    git diff --cached --name-only
    git ls-files --others --exclude-standard
  } 2>/dev/null | sort -u
)

# Se não houve alteração relevante de código, não há gate pesado.
if [ -z "$CHANGED_FILES" ]; then
  rm -f "$COUNT_FILE"
  exit 0
fi

FAILURES=""

append_failure() {
  if [ -z "$FAILURES" ]; then
    FAILURES="$1"
  else
    FAILURES="$FAILURES

$1"
  fi
}

# Gate geral de whitespace.
DIFF_CHECK=$(git diff --check 2>&1)
if [ $? -ne 0 ]; then
  append_failure "git diff --check:
$DIFF_CHECK"
fi

CACHED_DIFF_CHECK=$(git diff --cached --check 2>&1)
if [ $? -ne 0 ]; then
  append_failure "git diff --cached --check:
$CACHED_DIFF_CHECK"
fi

# Backend: só roda se backend ou configuração Python relevante mudou.
if echo "$CHANGED_FILES" | grep -Eq '^(backend/|ruff\.toml$|pytest\.ini$)'; then
  if [ -x "backend/.venv/bin/ruff" ]; then
    OUTPUT=$(backend/.venv/bin/ruff check backend 2>&1)
    if [ $? -ne 0 ]; then
      append_failure "Ruff check:
$OUTPUT"
    fi

    OUTPUT=$(backend/.venv/bin/ruff format --check backend 2>&1)
    if [ $? -ne 0 ]; then
      append_failure "Ruff format:
$OUTPUT"
    fi
  else
    append_failure "Ruff não encontrado em backend/.venv/bin/ruff."
  fi

  if [ -x "backend/.venv/bin/python" ]; then
    OUTPUT=$(backend/.venv/bin/python -m pytest 2>&1)
    if [ $? -ne 0 ]; then
      append_failure "Pytest:
$OUTPUT"
    fi
  else
    append_failure "Python do ambiente virtual não encontrado em backend/.venv."
  fi
fi

# Frontend: só roda se mobile mudou.
if echo "$CHANGED_FILES" | grep -Eq '^mobile/'; then
  if command -v npx >/dev/null 2>&1; then
    OUTPUT=$(cd mobile && npx expo lint 2>&1)
    if [ $? -ne 0 ]; then
      append_failure "Expo lint:
$OUTPUT"
    fi
  else
    append_failure "npx não está disponível no PATH."
  fi
fi

# Tudo passou.
if [ -z "$FAILURES" ]; then
  rm -f "$COUNT_FILE"
  exit 0
fi

COUNT=0
if [ -f "$COUNT_FILE" ]; then
  COUNT=$(cat "$COUNT_FILE" 2>/dev/null || echo 0)
fi

COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNT_FILE"

# Limita saída para evitar desperdiçar contexto.
FAILURES=$(printf '%s' "$FAILURES" | tail -c 6000)

if [ "$COUNT" -le 3 ]; then
  jq -n \
    --arg reason "Gate final falhou (tentativa ${COUNT}/3).

Corrija somente os problemas relacionados às alterações atuais e execute novamente os checks necessários.

$FAILURES" \
    '{
      decision: "block",
      reason: $reason
    }'
  exit 0
fi

rm -f "$COUNT_FILE"

jq -n \
  --arg message "O gate final continua falhando após 3 ciclos de correção. O encerramento foi permitido para evitar loop e consumo excessivo de tokens. As falhas devem ser informadas ao usuário; não declare a tarefa como validada." \
  '{
    systemMessage: $message
  }'

exit 0
