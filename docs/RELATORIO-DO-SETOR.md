# O relatório do setor — o que foi construído em 10–11/09/2026

> Referência de arquitetura e de **por quês**. O passo a passo de cada mudança está no
> [`CHANGELOG.md`](../CHANGELOG.md) (entradas de 10/09 e 11/09/2026). Quem vai refazer o
> **painel principal** no mesmo molde deve ler também [`PROXIMO-DASHBOARD.md`](PROXIMO-DASHBOARD.md).

---

## 1. Quem entra

| degrau | quem | chave |
|---|---|---|
| Diretoria + dono | ADMIN, por setor / allowlist | sempre |
| **Chefia** | cargo `Gestor`/`Sub-encarregado` **ou** vínculo em `setor_avaliador` → `GESTOR` | `TALENTCARE_ACESSO_GESTAO=on` (desde 10/09) |
| Casa inteira | colaboradores → `COLABORADOR` | `TALENTCARE_ACESSO_ABERTO` — **off** |

- A régua mora em `lib/nexus.ts` (`mapRole`) **e** na cópia gêmea de `run-sync.mjs`. Mexeu numa, mexa na outra.
- O degrau da chefia é **derivado** (cargo/vínculo), não uma lista de e-mails: lista nominal
  envelhece calada nos dois sentidos (promovido não entra, quem saiu da chefia continua entrando).
- Alcance de DADO: `lib/alcance.ts` (rotas agregadas) e `lib/avaliacoes/regua.ts` (`quemEh`,
  `podeVer`). Gestor alcança os setores que **avalia**, não o setor em que senta.
- Prova: `scripts/ensaio-acesso-gestao.mjs` (forja a sessão de cada gestor: 200 no setor dele,
  403 no alheio, `/ranking` e `/dashboard` fechados, colaborador de contraprova).

## 2. As rotas do setor

| rota | o que é |
|---|---|
| `/departamentos/<id>` | **a visão geral** (desenho da imagem conceito). Seções em `[id]/_visao/` — o `_` tira a pasta das rotas do Next |
| `/departamentos/<id>/completo` | o relatório de antes (tabela de pessoas com nota e busca, avaliação por critério, tendência). **Sem porta na tela** desde 11/09 (pedido do dono); existe por endereço |
| `/departamentos/<id>/novo` | redireciona para a visão (era o endereço da prévia) |

Todas leem **a mesma** `/api/dept-metrics` — compara-se desenho, nunca número.

## 3. A paleta nova (só nesta página, por enquanto)

`[id]/_visao/novo.module.css`: tokens `--n-*` (claro = o do conceito; escuro = mesmas famílias,
superfícies azul-noite). ⚠️ Dentro da `.raiz`, os tokens do app (`--surface`, `--text`,
`--accent`, `--chart-*`…) **apontam para a paleta nova** — é por isso que o que a página
reaproveita (Avatar, calendário, PainelPessoas, a janela "Ver detalhes", o painel da pessoa)
herda as cores sem mudar uma linha.

**Roxo = suspensão** em todo o sistema (azulejo, ranking, ficha, relatório completo, painel da
pessoa). A cor diz a gravidade; o texto diz a natureza ("susp. atraso", "susp. LGPD").

## 4. As seções (`_visao/`)

| arquivo | seção | clique |
|---|---|---|
| `Cabecalho.tsx` | trilha, título, planilha/mensageria | — |
| `Lideranca.tsx` | rostos da chefia (vínculo gravado) | abre a ficha |
| `Indicadores.tsx` | 9 azulejos (Rotatividade em 2 linhas) | advertências/atrasos/minutos/suspensões → **lista de quem** (`Paineis.tsx`); rotatividade → janela Turnover |
| `Escolaridade.tsx` | rosca + legenda com barra, ocupa o cartão | — |
| `AtividadeDoPeriodo.tsx` | série **do filtro** (dia/semana/mês) | — |
| `UltimasSaidas.tsx` | quem saiu em 12 meses | "Ver todas" → janela Turnover |
| `RankingMes.tsx` | pontuação do mês + selos susp/adv/atr | abre a ficha |
| `AvaliacaoChamados.tsx` | avaliação mensal + chamados entre setores | "Faltam avaliar" → `/avaliacoes` |
| `Assiduidade.tsx` + `DiaDoMapa.tsx` | números + calendário de atrasos | números → lista de quem; **dia colorido → quem se atrasou e quantos minutos** |
| `Sistemas.tsx` | um cartão por sistema com registro | → **janela "Ver detalhes"** do sistema, só com o setor |

## 5. As três camadas de interação — reutilize, não recrie

1. **Lista de quem está atrás do número** — `app/(app)/PainelPessoas.tsx` (modal) +
   `lib/ui/envolvidos-setor.ts` (as listas, num lugar só; o `Hero` do completo também usa).
   `mostrarNumero` mostra a quantidade mesmo quando todos são iguais.
2. **Janela "Ver detalhes" de um sistema** — `[id]/Detalhe.tsx` (`useDetalhe`, `JanelaDetalhe`,
   `BotaoDetalhe`, `precarregarDetalhe`). Renderiza **a própria página do sistema**
   (`app/(app)/<sistema>/Resumo.tsx`) dentro de `RecorteDoSetor` (`lib/ui/recorte-setor.tsx`),
   um `TalentDataProvider` que só enxerga o setor. Na URL (`?detalhe=`), altura fixa, esqueleto
   (`EsqueletoResumo.tsx`) enquanto carrega, entrada de cima para baixo (`.entrada` em `globals.css`).
3. **Painel da pessoa** — `app/(app)/PainelDaPessoa.tsx` (lateral): o que a pessoa fez num
   sistema, no período. Provedor no `AppShell` **e** dentro da `.raiz` da visão (para herdar a
   paleta). Dados: `/api/pessoa-sistema` → `lib/pessoa-sistema.ts`, régua `podeVer`.

⚠️ Toda página de sistema tem o corpo em `Resumo.tsx` e a rota só o renderiza. Página nova de
sistema: faça igual. Efeito que muda estado GLOBAL (o `setPeriod('Ano')` do ClassRoom) fica na
rota, nunca no resumo — dentro da janela ele trocaria o filtro da tela de trás.

## 6. As integrações "pessoa" (o painel da pessoa)

Contrato comum: `GET …/talent-pessoa?nexusUserId=&fromDay=&toDay=` →
`{ ok, grupos: [{ chave, titulo, itens: [{ id, titulo, sub, dia, valor? }] }] }`.

| sistema | onde | commit | o que mostra |
|---|---|---|---|
| ClassRoom | .71 `talent-user-learning` | `300a056` | cursos concluídos, vídeos por curso |
| HelpDesk | .77 `/var/www/helpdesk` (user `agente`) | `edc956a` | chamados abertos/resolvidos/formalizados |
| CIDE | .74 `/opt/cide/dashboard` | `12a7167` | empresas atendidas por dia |
| Consultoria Plus | .68 `/home/suporte/consultoria-plus` | `d48f5d5` | estudos, chamados, mensagens/comentários agrupados (sem texto) |
| Gerência | .72 `~/Gerencia/apps/api/src/routes/talent-pessoa.ts` | `f5fb8aa` | serviços, saídas, protocolos, serviços criados |
| Chat Interno | .69 (checkout em `/home/suporte/chat-interno` no .75) | `e08caca` | chamados abertos/assumidos/concluídos (liberado pelo dono em 11/09) |
| WhatsApp, Rádio, Assiduidade | espelho local | — | dia a dia |

⚠️⚠️ **Cada rota "pessoa" usa as MESMAS regras da rota diária do sistema** (a que alimenta o
número ao lado do nome). Mexeu numa, mexa na outra. Conferência: somar os itens contra o
espelho numa janela que termina **ontem** (hoje o espelho está até a última hora).
⚠️ Mensagens do Chat e conversas do WhatsApp **não** atravessam — só contagem. Liberar é
decisão do dono.

## 7. Números que a tela mostra e de onde vêm

`/api/dept-metrics` ganhou em 11/09:
- `assiduidade.quemNoDia` + `quemDoMapa` — quem está atrás de cada quadro do calendário; as
  **mesmas linhas** que o `groupBy` do mapa conta (nome/foto uma vez só: 95→70 kB no ano).
- `atividadeDoPeriodo` — a série do filtro (`lib/serie-periodo.ts`), com a comparação **de
  igual para igual** (só fontes que já registravam no início da janela anterior) e **sem
  percentual em janela longa** (> 4 meses). Mês inteiro no filtro = valor da série mensal.

`/api/whatsapp-overview?setor=` conta pelas **atendentes** do setor (régua do cartão), não pela fila.
`/api/classroom-courses` passou a respeitar o alcance (devolvia os 215 cursos da casa a qualquer um).

## 8. Conferências que existem — rode depois de mexer

```bash
ssh talentcare@192.168.0.78 'cd /var/www/talentcare && node --env-file=.env scripts/ensaio-acesso-gestao.mjs'
ssh talentcare@192.168.0.78 'cd /var/www/talentcare && node --env-file=.env scripts/ensaio-detalhe-setor.mjs'
ssh talentcare@192.168.0.78 'cd /var/www/talentcare && node --env-file=.env scripts/ensaio-quem-atras-do-numero.mjs'
```
- `ensaio-detalhe-setor`: número da janela = número do cartão (576 números, 0 divergências).
- `ensaio-quem-atras-do-numero`: o que o clique revela soma o número clicado (888 dias, 0).

## 9. Armadilhas pagas nesta rodada

- **Espelho incremental não corrige o passado.** Estudo cadastrado com data antiga, chamado que
  muda de dono: o espelho fica velho para sempre. `--completo` na madrugada: Gerência 03:10,
  Consultoria 03:20, Chat 03:30 (o do Chat **zera** a linha que a fonte não devolveu, com
  **freio** se a fonte vier com < metade). Cópia de antes: `chat_daily_bkp_20260911`.
- **Build do CIDE com `.next` de outro dono** (build anterior do Yuri): o `next build` apaga o
  `.next` antes de falhar e o serviço fica servindo pela metade. `find .next ! -user suporte`
  tem de dar 0 antes do build.
- **Janela que pisca:** conteúdo que carrega depois precisa de caixa de tamanho fixo e
  esqueleto; e resumo que calcula com o ACUMULADO enquanto o período não chega mostra número
  errado por um instante.
- **`overflowY: auto` + linha com margem negativa** = barra horizontal fantasma.
- **Comparar com o período anterior** mistura fontes que ainda não existiam: +2756% no Legal.
- **Página montada no servidor** (Turnover) não entra num modal: o corpo sem hooks vai para um
  componente que serve aos dois lados (`turnover/Visao.tsx`).
