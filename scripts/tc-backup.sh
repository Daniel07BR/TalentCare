#!/usr/bin/env bash
# Backup diário do banco do TalentCare.
#
# Por que existe: boa parte do que está no talentcare_db NÃO é reconstruível a
# partir das fontes — escolaridade e treinamentos curados à mão, nascimento e
# gênero (que só existem aqui), as filas de casamento por nome já revisadas, e
# o ponto, que veio de um dump do Nexo apagado depois da carga por conter PII.
# O espelho do WhatsApp também já diverge da origem: para vários dias o número
# daqui é MAIOR que o que o Painel devolve hoje, ou seja, este banco é o melhor
# registro que existe daquele período.
#
# Regras: o dump só vira "o backup" DEPOIS de ser lido de volta com sucesso —
# um arquivo truncado no lugar de um backup bom é pior que nenhum backup.
set -euo pipefail

APP_ENV=/var/www/talentcare/.env
DIR=/home/talentcare/tc-backups/db
MENSAL=$DIR/mensal
KEEP_DIAS=30
LOG=$DIR/backup.log

mkdir -p "$DIR" "$MENSAL"

DB_URL=$(grep -m1 '^DATABASE_URL=' "$APP_ENV" | cut -d= -f2- | tr -d '"'"'"'')
[ -n "$DB_URL" ] || { echo "$(date -Is) ERRO: DATABASE_URL não encontrada em $APP_ENV" >>"$LOG"; exit 1; }

STAMP=$(date +%Y%m%d-%H%M%S)
TMP="$DIR/.parcial-$STAMP.dump"
FINAL="$DIR/talentcare-$STAMP.dump"

trap 'rm -f "$TMP"' EXIT

if ! pg_dump -d "$DB_URL" -Fc -f "$TMP" 2>>"$LOG"; then
  echo "$(date -Is) ERRO: pg_dump falhou" >>"$LOG"; exit 1
fi

# Verificação: o dump precisa abrir e conter as tabelas que não dá para refazer.
# ⚠️ A lista é lida UMA vez para uma variável. Com `set -o pipefail`, um
# `pg_restore --list | grep -q` dá falha mesmo ACHANDO: o grep -q sai no
# primeiro match, o pg_restore leva SIGPIPE e o pipeline inteiro vira erro.
LISTA=$(pg_restore --list "$TMP" 2>/dev/null || true)
TABELAS=$(printf '%s\n' "$LISTA" | grep -c 'TABLE DATA' || true)
if [ "$TABELAS" -lt 15 ]; then
  echo "$(date -Is) ERRO: dump com só $TABELAS tabelas — descartado" >>"$LOG"; exit 1
fi
for t in employee_education assiduidade_daily users whatsapp_attendant_daily; do
  case "$LISTA" in
    *"TABLE DATA public $t "*) ;;
    *) echo "$(date -Is) ERRO: tabela $t ausente no dump — descartado" >>"$LOG"; exit 1 ;;
  esac
done

mv "$TMP" "$FINAL"
trap - EXIT

# Um dump por mês fica guardado para sempre: os diários rotacionam e não
# cobrem "como estava em março".
[ "$(date +%d)" = "01" ] && cp -n "$FINAL" "$MENSAL/talentcare-$(date +%Y%m).dump"

find "$DIR" -maxdepth 1 -name 'talentcare-*.dump' -mtime +$KEEP_DIAS -delete
find "$DIR" -maxdepth 1 -name '.parcial-*.dump' -mtime +1 -delete

echo "$(date -Is) OK $(basename "$FINAL") $(du -h "$FINAL" | cut -f1) tabelas=$TABELAS" >>"$LOG"
