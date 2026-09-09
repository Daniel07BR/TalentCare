#!/usr/bin/env bash
# Liga a coluna `gerencia_daily.jornada_teto_min` na produção (.78), de ponta a ponta.
#
# ⚠️⚠️ POR QUE ISTO É UM SCRIPT E NÃO FOI RODADO PELO AGENTE: o classificador do
# Claude Code barra escrita de SCHEMA no banco de produção — tanto o `db push` do
# Prisma quanto o `ALTER TABLE` por psql. O `CLAUDE.md` da casa diz que essa ação
# parte do Daniel e que o agente não contorna bloqueio. Então ela virou um comando
# só, com a conferência junto.
#
# Rode NO .78:
#   cd /var/www/talentcare && bash scripts/aplicar-jornada-teto.sh
#
# ⚠️ A ORDEM IMPORTA. A coluna nasce com DEFAULT 0 em todas as 4.611 linhas — o
# histórico inteiro diria "nenhuma hora de teto", que é a armadilha da "métrica
# nova que nasce vazia no passado" (ver docs/FONTES.md). O backfill `--completo`
# logo depois é obrigatório, não opcional.
set -euo pipefail
cd /var/www/talentcare

echo "== 1/6  schema  =============================================="
npx prisma db push

echo "== 2/6  client  =============================================="
npx prisma generate

echo "== 3/6  religa a linha do sync  =============================="
# Idempotente: se já estiver ligada, não faz nada.
sed -i 's|^      // jornadaTetoMin: n(r.jornadaTetoMin),|      jornadaTetoMin: n(r.jornadaTetoMin),|' run-gerencia-sync.mjs
if grep -q '^      jornadaTetoMin: n(r.jornadaTetoMin),' run-gerencia-sync.mjs; then
  echo "   ligada"
else
  echo "   ⚠️ NÃO ligou — confira o run-gerencia-sync.mjs à mão"
  exit 1
fi

echo "== 4/6  backfill completo (preenche o histórico)  ============"
# ⚠️ Sem `| head`: SIGPIPE mata script que escreve, no meio (lição de 09/09).
node --env-file=.env run-gerencia-sync.mjs --completo

echo "== 5/6  confere espelho x fonte  ============================="
node --env-file=.env scripts/diff-espelho-gerencia.mjs 2000-01-01 2100-01-01

echo "== 6/6  build e restart  ====================================="
npm run build
sudo systemctl restart talentcare
sleep 4
systemctl is-active talentcare

echo
echo "== confirmação: a fração de teto do Elton em agosto  =========="
URL=$(grep -o 'postgresql://[^"]*' .env | head -1)
psql "$URL" -P pager=off -c "
select round(sum(jornada_min)/60.0,1) as jornada_h,
       round(sum(jornada_teto_min)/60.0,1) as teto_h,
       round(100.0*sum(jornada_teto_min)/nullif(sum(jornada_min),0)) as pct_teto
from gerencia_daily g join users u on u.nexus_user_id=g.nexus_user_id
where u.name like 'Elton%' and g.day like '2026-08%';"
echo "Esperado: jornada 176,3 h · teto 59,2 h · 34%"
