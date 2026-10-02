# CLAUDE.md — TalentCare

Lido no início de cada sessão. Siga-o.

## ⚠️⚠️ Pediram ajuda para PREENCHER AS AVALIAÇÕES do mês?

Leia **inteiro** [`docs/AVALIACAO-MENSAL-PASSO-A-PASSO.md`](docs/AVALIACAO-MENSAL-PASSO-A-PASSO.md)
antes de sugerir qualquer texto, e rode o script de insumos que ele descreve
(`scripts/insumos-avaliacao.mjs`). O resumo do que mais erra:

- **Nunca número** — nem nota, nem média, nem 0–10. Só o NOME do nível.
- **Advertência é derivada do atraso** (a partir do 2º do mês): não conte como fato a mais.
- **O nível é decisão do Daniel.** Você junta os dados, aponta incoerência e redige; ele cola
  na tela e publica. Não grave avaliação direto no banco.
- **Gestor não é avaliado.** Combinados: até 3 itens. Linguagem pelo DISC (`lib/disc/perfis.ts`).

## O sistema

Next.js 16 + NextAuth v5 + Prisma 6 + Postgres. Produção no `192.168.0.78`
(`/var/www/talentcare`, serviço `talentcare`), **não é checkout git**: deploy por rsync
com `--files-from` — leia [`docs/PERIODO-E-DEPLOY.md`](docs/PERIODO-E-DEPLOY.md). Branch
`master`. Schema por SQL aditivo + `prisma generate` (`db push` no .78 quer apagar backups).
Histórico em `CHANGELOG.md` (seção `## AAAA-MM-DD` no topo a cada entrega).
