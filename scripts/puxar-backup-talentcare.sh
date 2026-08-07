#!/usr/bin/env bash
# Puxa o backup do TalentCare (.78) para cá (.75).
#
# Um backup que só existe no mesmo servidor do banco não protege contra o que
# mais assusta: perder o servidor. O .78 gera e verifica o dump (tc-backup.sh);
# aqui a gente guarda uma cópia longe dele.
#
# Roda como `suporte` no .75, que já tem a chave do TalentCare.
set -euo pipefail

REMOTO=talentcare@192.168.0.78
CHAVE=/home/suporte/.ssh/talentcare_key
ORIGEM=/home/talentcare/tc-backups/db
DESTINO=/home/suporte/backups/talentcare
KEEP=30
LOG=$DESTINO/pull.log

mkdir -p "$DESTINO"

ULTIMO=$(ssh -i "$CHAVE" -o ConnectTimeout=20 -o BatchMode=yes "$REMOTO" \
  "ls -1t $ORIGEM/talentcare-*.dump 2>/dev/null | head -1" || true)
if [ -z "$ULTIMO" ]; then
  echo "$(date -Is) ERRO: nenhum dump encontrado no .78" >>"$LOG"; exit 1
fi

NOME=$(basename "$ULTIMO")
if [ -f "$DESTINO/$NOME" ]; then
  echo "$(date -Is) ja tinha $NOME — nada a fazer" >>"$LOG"; exit 0
fi

TMP="$DESTINO/.parcial-$NOME"
trap 'rm -f "$TMP"' EXIT
scp -q -i "$CHAVE" -o ConnectTimeout=20 "$REMOTO:$ULTIMO" "$TMP"

# Confere que o arquivo chegou inteiro antes de virar "a cópia boa": o dump
# tem que abrir aqui também, não só lá.
if ! pg_restore --list "$TMP" >/dev/null 2>&1; then
  echo "$(date -Is) ERRO: $NOME chegou corrompido — descartado" >>"$LOG"; exit 1
fi
REMOTO_MD5=$(ssh -i "$CHAVE" -o BatchMode=yes "$REMOTO" "md5sum $ULTIMO | cut -d' ' -f1")
LOCAL_MD5=$(md5sum "$TMP" | cut -d' ' -f1)
if [ "$REMOTO_MD5" != "$LOCAL_MD5" ]; then
  echo "$(date -Is) ERRO: md5 diferente em $NOME — descartado" >>"$LOG"; exit 1
fi

mv "$TMP" "$DESTINO/$NOME"
trap - EXIT
find "$DESTINO" -maxdepth 1 -name 'talentcare-*.dump' -mtime +$KEEP -delete
find "$DESTINO" -maxdepth 1 -name '.parcial-*' -mtime +1 -delete
echo "$(date -Is) OK $NOME $(du -h "$DESTINO/$NOME" | cut -f1)" >>"$LOG"
