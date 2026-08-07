#!/usr/bin/env bash
# Vigia de encolhimento das tabelas do TalentCare.
#
# Por que existe: nesta base o perigo raramente é um erro barulhento. Foi assim
# que o rádio ficou 39 dias parado e o WhatsApp congelou — os crons rodavam,
# nada estourava, e o painel dizia "atualizado há 12 min". Os espelhos gravam
# com upsert SET: se uma FONTE perder história, o re-sync sobrescreve a nossa
# cópia boa por uma pior, em silêncio.
#
# Isto não impede nada — só registra, todo dia, quando uma tabela DIMINUIU.
# Uma queda é sempre suspeita: espelho diário só deveria crescer.
set -euo pipefail

APP_ENV=/var/www/talentcare/.env
DIR=/home/talentcare/tc-backups
ATUAL=$DIR/contagens.txt
ANTERIOR=$DIR/contagens-anterior.txt
LOG=$DIR/vigia.log

mkdir -p "$DIR"
DB_URL=$(grep -m1 '^DATABASE_URL=' "$APP_ENV" | cut -d= -f2- | tr -d '"'"'"'')

psql -d "$DB_URL" -At -F' ' -c \
  "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY relname" > "$ATUAL.tmp"
mv "$ATUAL.tmp" "$ATUAL"

if [ ! -f "$ANTERIOR" ]; then
  cp "$ATUAL" "$ANTERIOR"
  echo "$(date -Is) primeira medição — $(wc -l <"$ATUAL") tabelas" >>"$LOG"
  exit 0
fi

ALERTAS=0
while read -r tabela agora; do
  antes=$(awk -v t="$tabela" '$1==t {print $2}' "$ANTERIOR")
  [ -n "${antes:-}" ] || continue
  if [ "$agora" -lt "$antes" ]; then
    perdeu=$((antes - agora))
    echo "$(date -Is) ⚠️  ENCOLHEU $tabela: $antes -> $agora (-$perdeu)" >>"$LOG"
    ALERTAS=$((ALERTAS + 1))
  fi
done < "$ATUAL"

cp "$ATUAL" "$ANTERIOR"
[ "$ALERTAS" -eq 0 ] && echo "$(date -Is) OK nenhuma tabela encolheu" >>"$LOG"
exit 0
