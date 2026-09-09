# As fontes de atividade

O TalentCare não mede nada por conta própria: ele **espelha** o que os sistemas da
casa registram. Oito fontes hoje, todas pela mesma receita.

| # | Fonte | Onde | Espelho | Cron |
|---|---|---|---|---|
| 1 | Rádio Itamarathy | `.68` | `radio_daily` | `:00` |
| 2 | WhatsApp / Painel de Atendimento | `.70` | `whatsapp_daily` + `whatsapp_attendant_daily` | `:05` |
| 3 | ClassRoom | `.71` | `classroom_daily` | `:10` |
| 4 | Consultoria Plus | `.68` | `consultoria_daily` | `:15` |
| 5 | HelpDesk | `.77` | `helpdesk_daily` | `:20` |
| 6 | CIDE — *Cadastro Integrado de Dados Empresariais* | `.74` | `cide_daily` | `:25` |
| 7 | Gerência (mensageria) | `.72` | `gerencia_daily` | `:30` |
| 8 | **Chat Interno** | `.69` | `chat_daily` + `chat_dept_daily` | `:35` |
| — | Diretório (quem é quem) | Nexus `.75` | a tabela `users` | `:45` |
| — | Ponto / disciplina | dump do Nexo | `assiduidade_daily`, `disciplina_evento` | import à mão |
| — | **Controle da LGPD** | Nexus `.75` | `disciplina_evento` (`source='lgpd'`) | push + `:40` |

---

## A receita

```
1. A ORIGEM expõe  GET /api/integrations/<algo>-daily?from&to
   auth por X-API-Key própria daquele consumidor

2. AQUI  model <Fonte>Daily  com  @@id([nexusUserId, day])

3. lib/<fonte>.ts + run-<fonte>-sync.mjs
   puxa do watermark −1 dia · upsert SET · avança o watermark

4. /api/<fonte>-metrics + lib/ui/<fonte>-period.ts
   soma o espelho no intervalo pedido
```

A chave de junção é sempre o **`nexus_user_id`**, nunca o nome — exceto o WhatsApp,
cuja origem não tem id do Nexus e casa por nome normalizado.

### ⚠️⚠️ Integrar a fonte NÃO basta — percorra TODOS os consumidores

Foi a lição cara da Gerência: a ficha do mensageiro que entrega o dia inteiro nasceu
dizendo *"Sem atividade registrada"*, com o espelho cheio. São **seis** lugares:

```
lib/data/source.ts              o acumulado (getTalentData)
lib/mock/data.ts  activityOf()  a produtividade do score
/api/score-metrics              a MESMA conta, period-aware — esquecer um deixa
                                o score inconsistente entre a base e o filtro
/api/employee-metrics           o card da ficha
/api/employee-timeline          a aba Atividade
/api/dept-metrics               o relatório do setor
/api/sync/run                   o sync disparado na entrada
+ SYSTEMS / sysColor / SYS_INFO se a fonte entra na barra "atividade por sistema"
```

---

## Armadilhas que já custaram caro

### ⚠️⚠️ O dia devolvido tem de vir INTEIRO

As linhas são por **dia local**; o upsert é `SET` (troca a linha do dia). O runner
pede `from = startOfDay(watermark) − 1 dia` no relógio **dele, que roda UTC** — 21h de
São Paulo do dia anterior. Sem tratar isso, a origem devolve aquele dia contado só das
21h em diante e a linha cheia é substituída pela fatia.

Medido no Chat Interno: a **segunda** rodada do sync derrubou 210.740 mensagens para
**210.636**, sem erro nenhum no log, e cairia de novo a cada hora.

> **O conserto é do lado do ENDPOINT** — a origem recua o `from` até a meia-noite do
> fuso em que ela baldeia. No runner resolveria hoje e deixaria a armadilha armada
> para o próximo consumidor: quem chama não tem como saber qual é o balde.
>
> **O teste que encontra isto é rodar o sync DUAS vezes e comparar o total.** Uma
> rodada só nunca acusa.

### ⚠️⚠️ Watermark recente NÃO prova frescor

O `sync_watermark` avança mesmo quando o pull traz zero linhas. Em 07/08/2026, dois
dos seis espelhos estavam mortos há semanas com os seis crons "rodando com sucesso".
**Meça sempre `max(day)` da tabela do espelho.**

### ⚠️⚠️ Sync de diretório precisa de FREIO na inativação

O bloco de órfãos desliga quem sumiu do diretório. Se o Nexus devolver `200` com uma
lista curta — deploy pela metade, filtro novo, erro de paginação —, ele desliga a casa
inteira e o log diz `sucesso`. Foi assim que a lógica de órfão do ClassRoom desativou
8 pessoas ativas de verdade.

Freio: **cobertura < 80%** de quem já está ativo aqui → não inativa ninguém e grita no
log. O corte é sobre o **tamanho da resposta**, não sobre quantos seriam desligados:
demissão em massa real tem de passar e resposta truncada tem de parar, e só o tamanho
da origem distingue as duas.

Ensaiado com uma resposta truncada (20 de 128): cobertura 0,21, `deactivated: 0`. Sem
o freio, **77 pessoas teriam caído**.

### ⚠️⚠️ O runner CLI tem uma CÓPIA da régua

`run-sync.mjs` roda em node puro e não importa do `lib/` (TypeScript, alias `@/`), por
isso tem sua própria `mapRole`/`resolveRole`. As duas divergem em silêncio e **vence
quem roda por último — que é sempre o cron**. Mexeu em `lib/nexus.ts`, mexa lá.

### ⚠️ O upsert não remove o que sumiu da origem

`update: SET` só toca no que a fonte devolve. Quando um endpoint **parou** de devolver
registros fantasmas, a linha antiga continuou congelada no espelho. O sync completo da
Gerência apaga, no range coberto, as chaves que não vieram — **só depois de todos os
upserts darem certo**, e **só porque `gerencia_daily` é 100% derivada**. Isso **não**
vale para o WhatsApp, onde a origem perdeu história e a nossa cópia é a melhor.

### ⚠️ `db.execute(sql...)` recusa `Date` como parâmetro

No driver `postgres.js`: `ERR_INVALID_ARG_TYPE`, um 500 que só aparece na primeira
chamada de verdade. Mande texto ISO com `::timestamptz` — o cast é obrigatório junto.

### ⚠️ Janelas de histórico MUITO desiguais — a tela tem de avisar

Serviço da Gerência vem desde 2022; km e jornada só desde 17/07/2026; mensagem do Chat
desde jan/2026 (o import do Mattermost guardou a data original); chamado entre setores
só desde 21/08/2026. Sem o aviso, o filtro de **Ano** mostra um setor "sem chamado
nenhum" e parece defeito.

---

## O que sai (e o que não sai) de cada porta

> **⚠️⚠️ O que atravessa é CONTAGEM, nunca conteúdo.** Nenhum texto de mensagem,
> assunto de chamado ou nome de canal. O TalentCare mede quanto se trabalhou, e o
> número basta — mandar o texto seria entregar a conversa da casa a um painel de RH
> que não pediu por ela e não tem régua para lê-la.
>
> **Anotação particular do Chat nunca vai aparecer**: não é mensagem (mora fora da
> auditoria), e até contar quantas alguém escreveu já diria algo sobre uma área que é
> só dela.

### Filtros que não são detalhe

| Fonte | Filtro | Por quê |
|---|---|---|
| Chat | `hidden_at is null` | os 4 chamados de ensaio da estreia derrubavam a média da casa |
| Chat | `deleted_at is null`, `type='user'` | apagada não é entrega; "fulano entrou no canal" não é trabalho |
| Chat | `nexus_user_id is not null` | autor `legacy` (só existe como autor de mensagem importada) não tem a quem creditar — 5.610 de 216.350 |
| Gerência | `u.name <> 'Sistema'` | a importação do Access carimbou **27.501** protocolos como entregues por um usuário chamado "Sistema" |
| Gerência | `completed_at` > 180 d de `scheduled_for` | mutirão de backlog vira "serviço feito naquele dia" por quem nem estava trabalhando |
| CIDE | `responsavel <> 'Sistema'` | mesmo padrão do "Sistema" da Gerência |
| **LGPD** | só medida **punitiva** e só a que tem **vínculo** | ⚠️⚠️ `advertencia` e `suspensao` atravessam; `orientacao` e `outro` não descontam ponto e não viajam. E **35 dos 64** registros do acervo não têm `employeeId` — são ex-funcionárias que o import do GPI trouxe e que guardam só o nome. Mandar o nome convidaria o consumidor a casar por texto, que é como o import do ponto casou "Wendel Ribeiro da Silva" com "Edileuza da Silva". Saem como **contagem** (`semVinculo`) |
| **CIDE** | **conta EMPRESAS tocadas, não linhas do histórico** | ⚠️⚠️ `cg.alteracoes` é a TRILHA DE AUDITORIA: salvar o cadastro de uma empresa grava uma linha por campo mexido. Agosto/2026: **1.920 das 1.961** linhas com responsável humano (98%) têm `origem = 'SISTEMA'`. A 15 min por linha, as 172 de um único dia viravam **43 horas**. E a inflação **não é uniforme** — Legal **4,9×**, Pessoal **1,0×** —, então ela mexia no ranking entre pessoas e entre setores. O endpoint entrega `atividades` (linhas), `empresas` (a unidade de trabalho) e `manuais`; o painel usa `empresas` |

### O tempo, quando é de chamado

O Chat conta **segundos de EXPEDIENTE** (8h–18h, seg a sex) e manda a conta **pronta**.
Um chamado aberto na sexta às 17:30 e encerrado na segunda às 08:30 levou 63 horas de
relógio e **1 hora** de escritório.

> **Nunca recalcular aqui a partir de datas** — seriam duas verdades sobre quanto o
> chamado levou. Na tela, **1 d = 10 h** de trabalho.

---

## O que ainda é MOCK exibido como se fosse real

> **⚠️⚠️ Dívida aberta**, e não é cosmética — o painel é usado para decidir aumento.

### ✅ Quitado em 03/09/2026

- ~~"Tarefas concluídas" (`24 + rnd(seed) × 120`)~~ — fora do dashboard, do
  `/ranking` e da ficha.
- ~~Recomendação automática de promoção~~ — saía de `hist[11] − hist[5]`, e `hist` é
  passeio aleatório.
- ~~Aba Trajetória~~ — promoções, "reajuste por mérito 13%" e efetivações que não
  aconteceram, com datas plausíveis, na ficha de gente real.
- ~~Aba Reconhecimento~~ — "Destaque do trimestre" sorteado.
- ~~Gauge de score e fatores na ficha~~ — não validado, e ficava logo acima do botão
  "Avaliar".
- ~~Turnover por setor (relatório) e "evolução do score · 12 meses"~~ — os dois eram
  `rnd(seed)`; hoje são o turnover real (de `leftAt`) e a atividade mensal dos
  espelhos.

  > ⚠️⚠️ **Esta linha estava ERRADA e ficou 24 horas assim.** O conserto chegou ao
  > relatório do setor (`/departamentos/[id]`) e **não** ao card da lista em
  > `/departamentos`, que seguiu imprimindo `3.5 + rnd(dseed × 5.3) × 13` em
  > vermelho. Medido em 03/09/2026 — tela × verdade: **Fiscal 4% × 30,0%**,
  > Contábil 14,8% × 40,0%, Recepção 13,1% × 40,0%, TI 4,8% × 0%. O 4% do Fiscal
  > é o mesmo número que o `AGENTE-CRITICO.md` cita como exemplo de achado do
  > crítico: ele nunca tinha saído da tela.
  >
  > **A lição não é sobre turnover.** Dar uma dívida por quitada tendo consertado
  > *um* consumidor é o mesmo erro da checklist dos seis consumidores, e aqui ele
  > custou mais caro, porque o mapa passou a dizer que estava tudo bem.
  > **Antes de riscar uma linha daqui: `grep` do campo, não da tela.**

### ✅ Quitado em 03/09/2026 (segunda rodada — dashboard e `/ranking`)

- ~~Deltas dos KPIs (`+3` no Headcount, `+2` no Score médio)~~ — eram literais no
  código. O Headcount ganhou o delta REAL (entradas − saídas na janela: em 30 dias,
  3 entradas e 5 saídas = **−2**); o Score médio perdeu o delta, porque a média de
  percentis é quase constante por construção e uma seta sobre ela não diria nada.
- ~~As sparklines de Headcount, Advertências e Atrasos (`sp(seed)`)~~ e ~~a do Score
  médio (array literal `[74,75,74,76,…]` com o valor real só no último ponto)~~ —
  hoje: headcount reconstruído de `entry_date`/`left_at`, advertências acumuladas
  mês a mês (o último ponto **é** o número do cartão) e atrasos por bucket da janela.
  O Score médio ficou **sem** sparkline.
- ~~A sparkline dos cartões de `/departamentos` (`Department.spark`)~~ e ~~o turnover
  `rnd` do mesmo card~~ — a sparkline saiu (não existe série mensal de score: ele é
  percentil recalculado por janela); o turnover virou a mesma conta do relatório.
- ~~"Atualizado há 12 min"~~ — string fixa no JSX, igual num painel fresco e num
  painel morto. Hoje é `/api/frescor`: o **espelho mais atrasado**, com a data.
  Em 03/09/2026 o painel passa a dizer "Dados até 25/06/2026 · Ponto".
- ~~`alerts`, `rankList`, `deptBars`, `turnoverNow`, `periodFactor` em
  `buildDashboard`~~ — código morto que ninguém renderizava, incluindo quatro
  "novidades" com data escrita à mão ("há 2 dias", "há 1 semana") e uma afirmação
  sobre o ClassRoom que não olhava o espelho do ClassRoom.

### ⚠️⚠️ A ausência de dado que lia como NOTA MÁXIMA (corrigida em 03/09/2026)

Não era `rnd`, e por isso passou por todas as revisões anteriores: a conta estava
certa e a fonte era real. `assiduidade = 100 − atrasos·2 − advertências·5` — quem
o ponto não cobre entra com 0 e 0 e sai com **100**.

- No `/ranking` por Assiduidade, "Todos os setores": **os 22 primeiros colocados,
  empatados em 100, eram exatamente as 22 pessoas sem registro de ponto**. O
  primeiro medido de verdade aparecia em 32º.
- O ponto é a **única das dez fontes sem cron** (import à mão) e parou em
  **25/06/2026**. Em "7 dias", "30 dias" e "Trimestre atual" não há uma linha —
  então a assiduidade valia 100 para as **87** pessoas, e ela pesa 20 de 65 pontos
  do score.
- O recorte de privacidade **fabricava** o 100: ele zera atrasos e advertências de
  quem o leitor não alcança, e zerado vira nota cheia. Um gestor via a empresa
  inteira empatada em primeiro, acima do próprio time.

Hoje: `lib/ponto-cobertura.ts` responde as **duas** perguntas — *a pessoa é medida?*
(roster do ponto) e *a janela foi medida?* (o intervalo do import). `null` nos dois
casos, com o peso redistribuído.

> **⚠️⚠️ A regra do `null` tem uma FACE INVERTIDA, e ela é mais difícil de ver.**
> Todo mundo procura o zero que acusa. Aqui a ausência **elogiava** — e elogio não
> levanta suspeita em ninguém. Ao integrar métrica nova, pergunte também: *o que
> este número mostra para quem a fonte não cobre?*

> **⚠️⚠️ E o conserto errou para o outro lado antes de acertar.** A primeira versão
> caía no acumulado da vida inteira quando a pessoa não vinha no map do período —
> mas `/api/assiduidade-metrics` monta `byPerson` a partir de `pontoRows ∪
> advRows`, ou seja, **só quem teve ocorrência na janela**. Quem é do roster e foi
> impecável simplesmente não vem. Medido em 01–25/06/2026: **19 das 65 pessoas do
> roster** sairiam com o histórico completo no lugar do mês, e a **Joice Rocha**,
> zero atrasos e zero advertências em junho, apareceria com **nota 0** e a legenda
> "19 atrasos · 15 advertências" — ocorrências que não existiram naquela janela —
> no fundo de uma lista de pessoas.
>
> **Numa janela medida, ausência de linha é ZERO OCORRÊNCIA.** O acumulado só vale
> onde não há contexto de período nenhum. Inverter a regra do `null` é fácil: a
> ausência deixou de elogiar quem não é medido e passou a acusar quem foi
> impecável, que é a mesma falta com a vítima trocada.

**A régua chegou a QUATRO telas**, e é uma só (`lib/ponto-cobertura.ts`): o
`/ranking`, o score do painel, a tela `/assiduidade` — que em "Últimos 30 dias"
anunciava a casa em **100%**, porque a média caía num `: 100` literal quando
ninguém tinha ocorrência — e a ficha, que usava a heurística "tem ocorrência" e
por isso lia um mês **impecável** como "sem registro de ponto", apagando
justamente a boa notícia.

⚠️ A **sparkline** precisa das duas pontas da cobertura, não do sim/não: em "Ano
corrente" são 9 buckets mensais contra um import que termina em 25/06, e jul/ago/set
saíam **zerados** — a série real é `112 · 150 · 156 · 139 · 151 · 141 · 0 · 0 · 0`,
e uma curva que despenca no último trimestre lê-se "o problema de atraso acabou em
julho". Bucket fora da cobertura não entra na série, e o cartão diz "medido até
25/06".

### Ainda em pé

- **`/relatorios`** nunca saiu do "Em breve".
- **⚠️⚠️ O painel de Headcount do `/dashboard` não passa pela régua de `alcance`.**
  Os cartões de Advertências, Atrasos e Suspensões listam só quem tem valor no
  `assidMap`, que vem com `porPersonKey(alcance)` aplicado — eles se limitam
  sozinhos. O de Headcount monta a lista do dataset do cliente, que não filtra:
  hoje é inofensivo **só porque `proxy.ts:117` manda todo não-ADMIN embora de
  `/dashboard`**. A régua que protege esse cartão é o ROTEADOR, não a de
  conteúdo — duas réguas para a mesma pergunta, que é a falha que mais se repete
  aqui. No dia em que o painel abrir para gestor, ele lista por nome as
  admissões e demissões da casa inteira, com data. Achado do crítico, 09/09/2026.
- **⚠️⚠️ Inativo que SAI do diretório nunca é percebido.** O varredor de órfãos
  do `lib/nexus.ts` só olha registros `active: true` — e está **certo**: o
  TalentCare pede ao Nexus só os funcionários ATIVOS
  (`/api/integrations/employees` sem `includeInactive`), então todo desligado
  "sumiu do diretório" e tirar essa trava marcaria as **32** pessoas inativas
  como fora do diretório, apagando saídas reais da rotatividade.

  O preço é que uma conta **inativa** removida do diretório (uma duplicada
  movida para `Sistemas`, por exemplo) segue no painel para sempre, e a marca
  tem de ser posta à mão. Foi o caso da **Ísis Mossinato** em 08/09/2026: duas
  contas da mesma pessoa no Fiscal, com `nexus_user_id` diferentes, uma com
  e-mail real e outra `staff-…@staff.local` — o setor lia **9 saídas e 30%**
  quando são **8 e 27,6%**, com a mesma pessoa duas vezes na lista que o gestor
  abre.

  ⚠️ A marca à mão sobrevive AQUI (ao contrário do caso da conta `Sistema`)
  justamente porque o registro é inativo: ele nunca volta na resposta do
  diretório, então nenhuma carga reescreve `foraDoDiretorio`. O conserto de
  verdade é pedir `includeInactive=true` no sync e comparar o conjunto inteiro —
  aí o desligado que continua no diretório se distingue do que saiu dele.
- **Fonte parada por PESSOA não se distingue de pessoa parada.** `gerencia_daily`
  do Gilberto termina em **24/02/2026** com o espelho fresco (outras pessoas até
  03/09); o WhatsApp da Bianca Brito para em 20/07 e o CIDE dela em 08/07. Os dois
  caem no fundo do ranking por "0 atividade no mês". Numa lista de piores, é a
  diferença entre uma conversa e uma injustiça.
- **Coorte sem volume** ainda produz percentil: Imóveis teve **9 atividades no mês
  entre 4 pessoas**, e a Fabiana Higa, com 5, tira percentil 100. A trava de hoje
  olha `total <= 0` e `MIN_PARES`, nunca o volume.
- **Sem piso de tempo de casa**: Laryssa Oliveira, admitida em **31/08/2026**,
  entra no ranking do mês com 0 atividade.
- ✅ **A conta `Sistema` saiu — RESOLVIDA em 08/09/2026, e do jeito previsto aqui.**
  Ela era gente no painel (setor Pessoal, ativa, "admitida" em 17/06/2026) e é
  artefato do import do Access: o mesmo nome que a Gerência filtra com
  `u.name <> 'Sistema'` porque carimbou 27.501 protocolos.

  O que forçou a mão foi a tela nova de pendências: ela aparecia nas DUAS listas
  (sem sexo e sem escolaridade) como uma pendência que ninguém podia fechar — e
  lista que nunca esvazia deixa de ser lida.

  O conserto foi no NEXUS, como este documento já previa: a conta foi para o setor
  **`Sistemas`**, que o `notSystemDepartment` exclui de todo diretório entregue a
  qualquer sistema da casa. O diretório caiu de **128 para 127** registros e o
  bloco de órfãos do `lib/nexus.ts` marcou `foraDoDiretorio = true` sozinho no
  sync seguinte (`deactivated: 1`), com a VOLTA intacta.

  > **A lição continua valendo:** escrever à mão um campo que um sync reescreve é
  > combinar com o cron quem ganha — e o cron sempre roda por último. Marcar
  > `foraDoDiretorio` aqui teria durado até o próximo cron, sem erro nenhum.

> ⚠️ Mantenha esta lista em dia. Um mapa de dívida que aponta dívida já quitada faz
> desconfiar do resto dele — e o resto é o que ainda mente.

## Como entra uma 9ª fonte

1. Combine com o agente do sistema de origem o endpoint `<algo>-daily` e emita uma
   **chave própria** para o TalentCare (separada da chave do Nexus: revogar a leitura
   do RH não pode derrubar o push de diretório).
2. `model <Fonte>Daily` + `npx prisma db push`.
3. `lib/<fonte>.ts` + `run-<fonte>-sync.mjs` + o cron num minuto livre.
4. **Percorra os seis consumidores** da lista acima.
5. **Backfill, e depois rode o sync duas vezes** comparando o total. Reconcilie contra
   a fonte: no Chat foram 210.742 dos dois lados.
6. Decida explicitamente se a fonte entra no **score** — e, se entrar, o que dela
   entra. Mensagem do Chat e escuta de rádio **não** entram (são vitrine); km e jornada
   da Gerência também não (são a magnitude dos mesmos serviços e abafariam o resto).
