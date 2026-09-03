# TalentCare

**Painel Executivo de Performance — Grupo Itamarathy.**

O TalentCare consolida, num só lugar, a visão 360° de cada colaborador: identidade,
trajetória, formação e a atividade real gerada nos sistemas internos da empresa.
É a base para decisões de reconhecimento, promoção e desenvolvimento de pessoas.

## Recursos

- **Diretório de colaboradores** com foto, cargo, setor, admissão/desligamento e
  dados demográficos (idade, gênero, gerações).
- **Ficha 360° por pessoa**: score de performance, fatores, linha do tempo de
  atividade cross-sistema, assiduidade, formação acadêmica, trajetória e
  reconhecimento.
- **Dashboards executivos**: visão por departamento, ranking, curva de turnover,
  distribuição por escolaridade e comparativos.
- **Atividade real por integração**: cada sistema interno é espelhado localmente
  com granularidade diária e sincronização incremental, de modo que todos os
  filtros de período (7 dias, 30 dias, trimestre, ano) leem do banco local —
  rápidos e resilientes.
- **Importações de RH**: escolaridade, admissão/nascimento e demais cadastros a
  partir de planilhas, com casamento por nome e fila de revisão para casos
  ambíguos.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **NextAuth v5** para autenticação (login único via diretório corporativo)
- **Prisma 6** + **PostgreSQL**
- TypeScript, CSS próprio (tema claro/escuro, sem framework de UI)

## Documentação

| Documento | O que traz |
|---|---|
| [`docs/AVALIACOES.md`](docs/AVALIACOES.md) | a avaliação mensal: quem avalia quem, os critérios, o ciclo da nota e as **duas réguas de acesso** |
| [`docs/FONTES.md`](docs/FONTES.md) | as 8 fontes de atividade, a receita do espelho diário e as armadilhas que já custaram caro |
| [`docs/PERIODO-E-DEPLOY.md`](docs/PERIODO-E-DEPLOY.md) | o contrato do filtro de período/calendário e como se publica em produção |
| [`CHANGELOG.md`](CHANGELOG.md) | o histórico por sessão de trabalho |

> **⚠️ Duas coisas para ler antes de mexer em número na tela:**
> **(1)** todo valor ao lado do filtro de período tem de sair de uma consulta **com o
> intervalo** — o teste é trocar a janela e ver o número mexer;
> **(2)** ainda há **mock exibido como se fosse real** ("Tarefas concluídas", os deltas
> dos KPIs, as sparklines). A lista está no fim de `docs/FONTES.md`.

## Estrutura

```
app/
  (app)/            # área autenticada: dashboard, funcionários, departamentos,
                    # ranking, turnover, escolaridade, e as telas por integração
  api/              # rotas de API (sync, métricas por período, importações)
  login/ · sso/     # entrada (login único)
lib/
  data/             # leitura do banco e montagem do dataset do painel
  mock/             # view-models das telas
  ui/               # hooks e contextos de UI (período, dados, métricas)
  avaliacoes/       # critérios e A RÉGUA da avaliação (uma, e só ali)
prisma/             # schema do banco
docs/               # ver acima
```

## Desenvolvimento

Pré-requisitos: Node 20+, PostgreSQL.

```bash
npm install
npx prisma generate
npm run dev          # ambiente de desenvolvimento
```

Para produção:

```bash
npm run build
npm run start
```

### Variáveis de ambiente

As configurações sensíveis ficam em um arquivo `.env` na raiz (**não versionado**).
Ele define a conexão com o banco, o segredo de sessão e as credenciais de
integração com os sistemas internos. Solicite o `.env` ao responsável pelo projeto
— ele não é distribuído pelo repositório.

## Sincronização de dados

A atividade real dos colaboradores é trazida por sincronizações incrementais
(agendadas) que populam o espelho local — uma por fonte, mais o diretório. A
sincronização também é disparada na entrada do usuário, de forma transparente.

⚠️ **`watermark` recente não prova frescor** (ele avança mesmo quando o pull traz zero
linhas): para saber se uma fonte está viva, meça `max(day)` da tabela do espelho.
Receita, crons e armadilhas em [`docs/FONTES.md`](docs/FONTES.md).

---

© Grupo Itamarathy — uso interno.
