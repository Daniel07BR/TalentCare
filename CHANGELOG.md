# CHANGELOG — TalentCare

## 2026-09-11 (21) — A régua de pontuação vira GERAL, em Configurações

Pedido do dono: *"cada departamento consegue subir a planilha e regular o tempo médio para o
sistema dar o ponto que vale a tarefa, mas a regra geral — quanto vale o minuto, penalidade
etc. — gostaria de levar para Configurações, e que ela fosse universal, valesse para todos os
departamentos, e só eu e a Diretoria pudéssemos fazer alterações"*.

⚠️⚠️ **A pergunta que veio antes de construir:** as réguas dos setores NÃO eram iguais — o
ponto por minuto (0,1) e a base (0) sim, mas o atraso ia de −1 (Imóveis) a −62 (Entregas),
proporcional ao volume de cada setor, por decisão do dono em 09/09 (com o peso do Legal em
todos, 32 de 95 pessoas ficavam com nota negativa). Perguntado se "universal" era o mesmo
número ou a mesma regra, o dono escolheu **a mesma regra, com peso proporcional**.

**Como ficou:**
- **Configurações → Régua de pontuação** (aba nova, para o dono e a Diretoria): ponto por
  minuto, base, serviço concluído; **atraso = % do mês típico do setor** (a mediana de crédito
  de quem recebe nota); advertência, mês limpo, suspensão (× a advertência) e LGPD como
  múltiplos do atraso; abonado fixo. **Salvar exige ver a prévia** com os mesmos números — a
  tabela de cada setor, com o que muda em relação a hoje —, e cria uma **versão** com vigência
  a partir do mês corrente; mês já pontuado não muda.
- Salvar **gera a régua de cada setor** com a mesma vigência, numa transação, e **grava a
  mediana usada** (congelada: a mediana anda sozinha quando um espelho é corrigido).
- Setor **sem ninguém com nota** usa a mediana da **casa** (antes ficava com a cópia do Legal,
  "errada para eles").
- O gestor **não edita mais a régua**: `/servicos` mostra a régua do setor só para leitura, de
  onde ela vem e o link "Alterar a régua geral" para quem pode; `POST /api/servicos/regra` → 410.
- **Configurações saiu do grupo `(admin)`** (só dono) para a Diretoria entrar; a Diretoria vê
  a Régua e as Fontes, e as abas de cadastro seguem só do dono. Menu de Administração para
  toda a Diretoria.
- A fórmula mora em `lib/servicos/regra-geral.ts`; `propor-pesos.ts` passou a importá-la.

**A primeira versão registra a regra de 09/09 sem mexer em número nenhum**
(`scripts/semear-regra-geral.ts`): vigência 2026-08, atraso = 50 ÷ 700 = 7,1% do mês típico.
O ensaio (`scripts/ensaio-regua-geral.ts`) prova que a régua de hoje de **cada um dos 16
setores** segue a fórmula: **153 conferências, 0 divergências** (com o acesso: dono e
Diretoria leem e gravam; gestor 403; gravação por setor 410; Diretoria sem as abas de
cadastro). Informativo: salvar a MESMA regra hoje mudaria o Entregas (−62 → −65, a mediana
subiu) e os 6 setores sem ninguém com nota (−50 → −15, a mediana da casa).

⚠️ **`prisma db push` queria DROPAR** `chat_daily_bkp_20260911` (11.068 linhas) e
`chat_dept_daily_bkp_20260911` — os backups do Chat de 11/09. Recusado: a tabela nova entrou
por SQL gerado pelo `prisma migrate diff`, filtrado para só o `CREATE`. **Enquanto esses
backups existirem, `db push` puro não serve neste banco.**

## 2026-09-11 (20) — Configurações vira a área administrativa inteira; saem três blocos de ficção

Pedido do dono: *"painel configurações não configura nada de score, isso já é feito por cada
departamento dentro da área deles. Em configurações, junte todas as opções do painel
administração, assim deixamos numa página só tudo que for área administrativa"*.

**Saiu, por ser FICÇÃO (regra (d) da casa)** — a página inteira era:
- **Pesos do score de performance**: os controles não gravavam nada (o estado morria no
  navegador) e a "pré-visualização" media um score que ninguém calculava com aqueles pesos.
- **Sistemas conectados**: "Sync há 8 min", "há 1 h"… escritos à mão; o liga/desliga não
  desligava nada.
- **Gestão de acesso**: perfis e contagens de membros escritos à mão.
- `lib/mock/config.ts` (só essa página o usava) removido.

**Configurações = uma página com abas** (`/configuracoes?aba=`): **Fontes de dados** (nova e
real — o último dia com dado em cada espelho, a mesma conta da frase do canto do painel, agora
em `lib/frescor.ts`), **Usuários**, **Equipe interna**, **Escolaridade**, **Casar ponto** (com
o número de nomes esperando vínculo) e **Quem avalia**. Cada aba é a própria tela de antes
(`<área>/Secao.tsx`); `/usuarios`, `/equipe`, `/escolaridade` e `/ponto` levam à aba certa;
`/avaliadores` segue também sozinho (a tela de Avaliações leva até ele e a Diretoria o usa).
O menu de Administração ficou com uma entrada só: **Configurações**.

Ensaio do painel: **785 conferências, 0 divergências** (as seis abas abrem para o dono com a
tela delas; os endereços antigos levam à aba; gestor fora). `ensaio-acesso-gestao` limpo.

## 2026-09-11 (19) — Casar ponto, Relatórios e Quem avalia saem do menu

Pedido do dono: *"estas seções foram criadas para eu definir funções dentro do sistema que
hoje já estão bem estabelecidas"*.

- **Relatórios** saiu de vez: nunca passou do "Em breve". `/relatorios` redireciona ao painel;
  `EmBreve.tsx` (só ela usava) foi removido.
- **Casar ponto** (`/ponto`) e **Quem avalia** (`/avaliadores`) saíram do MENU, mas seguem por
  endereço, porque ainda têm trabalho a fazer:
  - o ponto é **import à mão**, e cada dump novo pode trazer nomes que não casam sozinhos —
    `/ponto` é onde se vinculam (área do dono);
  - promoção e gestor novo **não mudam o vínculo de quem avalia sozinhos** — `/avaliadores`
    segue com as portas da tela de Avaliações ("Quem avalia" e "Definir quem avalia", que
    aparece quando um setor fica sem avaliador).
- Ensaio do painel: **775 conferências, 0 divergências** (acesso: `/relatorios` → painel;
  `/ponto` e `/avaliadores` abrem para o dono; gestor fora dos dois). `ensaio-acesso-gestao` limpo.

## 2026-09-11 (18) — O Ranking da casa sai do sistema

Pedido do dono: *"a página ranking não faz mais sentido, uma vez que temos todos os
departamentos com pontos independentes"*. Era uma lista única de todas as pessoas por score —
e o score é percentil dentro do setor, e a pontuação de cada setor segue a régua dele (a
própria página avisava, em amarelo, que a comparação entre setores não valia). O ranking que
vale é o de cada setor, no relatório do setor.

- Sai o item **Ranking** do menu (`AppShell.tsx`) e o **"ver todos ›"** do Destaque no painel.
- `/ranking` **redireciona para `/dashboard`** (quem guardou o link não cai num 404); a trava
  da Diretoria no `proxy.ts` segue antes (gestor → `/meu-setor`).
- `lib/mock/ranking.ts` (leaderboard e comparação lado a lado) ficou sem uso e foi removido —
  está no histórico do git.
- Ensaio do painel: **770 conferências, 0 divergências** (com `/ranking` → `/dashboard`);
  `ensaio-acesso-gestao` limpo.

## 2026-09-11 (17) — A barra do WhatsApp abre a janela da fila

Decisão do dono sobre as duas pendências do painel:

**1. A barra do WhatsApp abre a janela da FILA dela.** A barra conta pela fila por onde o
atendimento chegou (`whatsapp_daily.dept`); a janela do SETOR conta pelas atendentes do setor
(Recepção 127 × 246 em 30 dias). Aberta pela barra, a janela tinha de repetir o número da
barra — então ela é da fila, não do setor:
- `/api/whatsapp-overview?fila=<nome>`: totais e série da própria fila, e as atendentes que
  atuaram nela (`whatsapp_attendant_daily.dept` é a fila — conferido: Recepção 127 nas duas).
  Fora da Diretoria, só a fila de um setor alcançado (403 no resto).
- `RecorteDaFila` / `useFilaWhatsapp()` (`lib/ui/recorte-setor.tsx`); `JanelaDetalhe` com
  `fila` e `&detalheFila=` na URL. O resumo do WhatsApp esconde o "agora" (é da casa) e as abas,
  e avisa que o número de cada atendente é só na fila — a origem conta por atendente à parte, a
  soma da lista não fecha com o total — e que o clique na pessoa mostra todas as filas.
- O ensaio compara cada barra com a janela da fila em 7 janelas: **769 conferências, 0
  divergências**.

**2. O selo continua sumindo quando há feriado num dos lados** (recomendação aceita): comparar
"por dia de expediente" seria uma conta nova no painel.

## 2026-09-11 (16) — O painel novo vira a página principal

O dono aprovou o desenho da prévia e mandou trocar *"após a aprovação do agente crítico"*.

**Rodada 2 do crítico — NÃO APROVADO por um item, consertado:**
- **O selo de Advertências saiu.** A advertência é derivada do 2º atraso do mês, então o total
  de uma janela depende de onde ela corta o mês: no Trimestre a janela anterior começava em
  22/04, e 25 pessoas levaram advertência entre 22 e 30/04 porque o 1º atraso de abril caiu
  antes. A tela dizia Atrasos ▲6% e Advertências **▼2% em verde** ("mais atraso, menos
  advertência"); com meses inteiros a advertência também sobe (▲8%). Fica só o selo de Atrasos.
- **O calendário pintava de "ninguém atrasou" os dias antes do ponto** (01/10/2025): um intervalo
  de set/2025 mostrava o mês limpo ao lado de números "—". `CalendarioOcorrencias` ganhou
  `pontoDesde` e hachura esses dias como "sem medição" — **nos três lugares** (painel, relatório
  do setor e ficha): `/api/assiduidade-mapa`, `/api/dept-metrics` e `/api/employee-metrics`
  passaram a devolver o início do ponto.
- A janela da Escolaridade dizia "com a Diretoria"; o dataset já tira a Diretoria — são as
  mesmas pessoas do cartão. Texto corrigido.

**A troca:**
- `/dashboard` é o painel novo (`dashboard/page.tsx`, seções em `dashboard/_novo/`).
- O painel de antes ficou em **`/dashboard/anterior`**, por endereço, sem porta na tela (como o
  `/completo` do setor) — os cartões antigos (`*DeptCard.tsx`) seguem só para ele.
- `/dashboard/novo` redireciona para `/dashboard`.
- Saem o selo "Prévia" e o atalho só do dono (`lib/ui/dono.tsx` removido).

**Prova:** `ensaio-painel-novo.ts` — **714 conferências, 0 divergências** (agora com o acesso a
`/dashboard`, `/novo` → `/dashboard` e `/anterior` fechado ao gestor). Setor: acesso limpo, 576
números, 888 dias.

## 2026-09-11 (15) — Prévia: o painel principal no desenho da imagem conceito

Pedido do dono: refazer a página principal (`/dashboard`, só da Diretoria) no molde do
relatório do setor, com o desenho e as cores da imagem conceito, e interativa. *"Os
números têm de ser OS MESMOS da página atual. Muda o desenho, não a conta."*

**Onde:** `/dashboard/novo`. A atual segue intacta. Atalho "Prévia do layout novo" no
cabeçalho da atual **só para o dono** (`TALENTCARE_ADMIN_EMAILS`, novo `lib/ui/dono.tsx`);
na prévia, selo "Prévia do layout novo" e "Ver versão atual".

**O desenho:** cabeçalho "Painel de Indicadores / Grupo Itamarathy"; cinco indicadores com
azulejo de cor (Headcount azul, Turnover verde, Advertências laranja, Atrasos vermelho,
Suspensões roxo); Atendimentos por departamento | Curva de turnover; Destaque |
Escolaridade | Gerações; Comparativo por gênero; Sistemas e produtividade com sete cartões
(ClassRoom, Rádio, Consultoria Plus, HelpDesk, CIDE, **Chat Interno** e **Gerência** — os
dois últimos por decisão do dono, com os números das páginas deles). Paleta do relatório do
setor, claro e escuro, grades de 5/4/3/2/1 colunas.

**O que abre o quê:**
- Headcount → quem entrou e quem saiu; Advertências, Atrasos, Suspensões → quem e quanto, e
  o nome abre o **painel da pessoa** (assiduidade) por cima da lista; Turnover e a curva →
  janela do Turnover da casa inteira.
- Título de cada sistema → a janela do resumo da **casa inteira**; a **linha de um setor** →
  a mesma janela só com aquele setor.
- Fatia de escolaridade, segmento de geração, gênero → quem está no grupo (retrato de hoje).
- Nome no Destaque → a ficha (a pontuação soma várias fontes, não é de um sistema só).

**Onde o conceito foi seguido e onde não (decisões do dono, 11/09):**
- **Selos de variação só em Atrasos e Advertências**, e só quando honestos. Quatro travas:
  (1) dias **medidos** pelo ponto contra dias medidos ("30 dias" mede 28), a anterior recuada em
  **semanas inteiras**, sem selo acima de 124 dias ou fora da cobertura do ponto; (2) o **mesmo
  número de dias com expediente** dos dois lados — dia com algum registro de ponto na casa;
  medido de out/2025 a set/2026, todo dia útil sem registro é feriado ou recesso (20/11, fim de
  ano, Sexta Santa, 20–21/04, 1º/5, Corpus Christi, 9/7, 7/9), e o Carnaval tem registro; (3) as
  **mesmas pessoas** dos dois lados — quem está no quadro hoje e já estava na casa no começo da
  janela anterior; (4) base ≥ 10. A tela diz contra que datas e quantas pessoas. Hoje: 7 dias,
  30 dias e agosto ficam **sem selo** (feriado de um lado); Trimestre ▲6% em atrasos. Headcount
  mostra o **saldo** (−1), não "▲ 3%". Turnover e Suspensões sem selo.
- **Curva de turnover em saídas**, eixo em pessoas a partir do zero — o conceito tinha 0–12%
  por dia, e turnover de um dia não existe.
- **"Score médio" do gênero saiu** (score não validado). **Destaque sem numeração** (a lista
  é alfabética de propósito; número faria pódio entre setores).
- Mini-gráficos só onde há série real (Headcount, Turnover, Atrasos).

**⚠️⚠️ As barras do WhatsApp NÃO abrem a janela do setor.** A barra conta pela **fila** do
atendimento (`whatsapp_daily.dept`); a janela de um setor conta pelas **atendentes** do setor.
Medido em 30 dias: Recepção **127 × 246**, Pessoal 1.123 × 1.221, Financeiro 201 × 225.
Decisão pendente com o dono.

**⚠️ A janela aberta pela barra de um setor inclui quem já saiu** (`comQuemSaiu` em
`JanelaDetalhe`): as barras do painel somam a atividade de todo mundo do setor no período,
e a janela tem de ter a mesma população. A janela diz isso no título.

**A janela sem setor (casa inteira).** `JanelaDetalhe` aceita `setor` opcional e guarda o
setor na URL (`&detalheSetor=`). Novo sinal `useEmJanela()` (`lib/ui/recorte-setor.tsx`),
separado de `useRecorteSetor()`: os nove resumos escondem o cabeçalho em qualquer janela e só
escondem a comparação entre setores quando há setor. O Turnover da casa diz "Taxa de
turnover (12m)" e a janela avisa que o cartão do painel é o do período.

**Conserto que vale para as duas páginas:** a lista de **Suspensões** somava menos que o
cartão em "Ano corrente" (9 × 11): o cartão conta as suspensões da janela de quem quer que
seja, e a lista só olhava os ativos. Faltava o Pedro Souza (Financeiro, 2 suspensões, já
desligado). Agora quem saiu entra, marcado "já saiu".

**Segurança:** o `proxy.ts` comparava `pathname === '/dashboard'`, exato — `/dashboard/novo`
escaparia da trava da Diretoria. Agora `/dashboard/…` também.

**Organização:** a paleta (`visao.module.css`), as peças (`ui.tsx`), o tipo `Tom` e a janela
(`Detalhe.tsx`) saíram de `departamentos/[id]/` para `app/(app)/_visao/`, comuns às duas
páginas. As contas de tela do painel novo moram em `lib/painel/visao.ts` (sem React).

**O agente crítico (rodada 1) achou, e foi consertado:** o selo contava o quadro de hoje nas
duas janelas (quem entrou puxava para "piorou": Trimestre ▲9% → ▲6% com as mesmas pessoas); o
feriado virava melhora (7 dias: ▼27% com 2 dias de expediente contra 3); o Destaque dizia
"Ninguém pontuou" quando a leitura falhava; na troca de filtro os números da janela anterior
ficavam em cor cheia; as grades respondiam à largura da TELA e não do conteúdo (com o menu de
240 px, em 1366 as tabelas perdiam a coluna do setor) — viraram *container queries*; os sete
ganchos de sistema viravam "nenhuma atividade" em queda de rede (ganharam `erro`); a janela do
setor com quem saiu não dizia quem (agora lista pelo nome); "Headcount · hoje".

**Pedidos do dono no meio da rodada:**
- **Assiduidade e disciplina da casa**, com o **calendário interativo** do setor: números do
  quadro ativo (clique → quem, nome → painel da pessoa) e o calendário de todo mundo fora da
  Diretoria, inclusive quem saiu, com a escala da casa (1–4, 5–7, 8–10, 11+; a do setor saturava —
  mediana de 7 pessoas por dia em 2026). Rota nova `/api/assiduidade-mapa`, `mapaDaCasa` em
  `lib/painel/visao.ts`, prop `limites` em `CalendarioOcorrencias`, `aoClicar` em `DiaDoMapa`.
- **Escolaridade clicável no relatório do setor:** `/formacao` virou `formacao/Resumo.tsx` e abre
  na janela ("Ver detalhes", a rosca e cada formação) — pessoa por pessoa, com as formações. No
  painel, o "ver ›" abre a mesma janela da casa.
- **Foto das pessoas na tabela de Desligados** do Turnover (página, janela do setor e do painel).

**Prova:** `scripts/ensaio-painel-novo.ts` (tsx, na produção) — 7 janelas (7d, 30d,
Trimestre, Ano, jun, jul, ago): listas somam o cartão; linhas de cada cartão = as do cartão
atual e somam o total; cada linha de setor = o total da janela do setor; selos (dias com
expediente, mesmas pessoas, sem sobreposição); calendário da casa = `groupBy` direto no banco, e
restrito ao quadro = cartão Atrasos; acesso (Diretoria 200, gestor → `/meu-setor`, anônimo →
`/login`). **712 conferências, 0 divergências.** Os três ensaios do setor seguem limpos (acesso,
576 números, 888 dias).

```bash
npx --yes tsx@4 --env-file=.env --tsconfig scripts/tsconfig.json scripts/ensaio-painel-novo.ts
```

## 2026-09-11 (14) — Documentação da rodada e passagem para o próximo agente

Pedido do dono: documentar o que foi feito e preparar a continuação com um novo agente,
cujo objetivo é refazer o **painel principal** no molde do relatório do setor.

- `docs/RELATORIO-DO-SETOR.md` (novo) — a referência: quem entra (os três degraus), as
  rotas do setor, a paleta, as seções, as três camadas de interação (lista de quem,
  janela do sistema, painel da pessoa), as integrações "pessoa" de cada sistema com
  commit e servidor, os números novos da `dept-metrics`, os ensaios e as armadilhas.
- `docs/PROXIMO-DASHBOARD.md` (novo) — o roteiro do próximo trabalho: o pedido, como o dono
  trabalha (prévia em paralelo antes de trocar), a imagem conceito **descrita** (o próximo
  agente não a vê), o que reaproveitar, as decisões já tomadas pelo molde, onde o conceito
  pode mentir (selos de variação, sparklines, score, taxa de turnover) e o "pronto é".
- `docs/CONTINUAR-AQUI.md` aponta para os dois no topo.

## 2026-09-11 (13) — Escolaridade ocupa o cartão

Pedido do dono: *"adapte os dados ao tamanho dos cards"*. O cartão da Escolaridade
estica até a altura da linha (o vizinho "Atividade no período" é mais alto), e a rosca
de 160px e a legenda ficavam presas no alto, com um vão embaixo. Agora o cartão é uma
coluna flexível: o conteúdo toma a altura que sobra e se centraliza nela; a rosca tem
tamanho relativo (42% da largura do cartão, entre 150 e 230px); a legenda ficou maior
e cada formação ganhou uma barra com a sua fatia, que usa a largura que sobrava e deixa
comparar sem ler os números. Arquivo: `departamentos/[id]/_visao/Escolaridade.tsx`.

## 2026-09-11 (12) — A janela do sistema abre inteira, sem piscar; sai o "relatório completo"

Dois pedidos do dono:

**1. "Ver relatório completo" não precisa existir** — *"a página para qual ele leva é a
que substituímos"*. Saem o botão da faixa "Sistemas e produtividade" e o
"Relatório completo" do cabeçalho (mesmo destino). A rota `/departamentos/<id>/completo`
segue existindo por endereço, sem porta na tela.

**2. A janela "Ver detalhes" piscava.** Ela nascia do tamanho de "Carregando…",
piscava e só então virava a janela cheia — *"parece para quem clica que existe um
erro"*. E por baixo havia um defeito de número: enquanto o período não chegava, cada
resumo calculava com o **acumulado de toda a história** e trocava em seguida — um
número errado aparecia por um instante. Agora:
- a janela abre **no tamanho final** desde o primeiro quadro (`height: min(88vh, 980px)`);
- no lugar de "Carregando…", um **esqueleto** com a forma da página (números, cartões,
  linhas) e brilho suave (`EsqueletoResumo.tsx`, `.esqueleto` em `globals.css`) — o
  mesmo enquanto o código baixa e enquanto os números chegam, então nada troca de cara
  duas vezes;
- os nove resumos, **dentro da janela**, só aparecem com os números do período
  (`if (setor && loading && !map) return <EsqueletoResumo />`) — o acumulado não
  pisca mais;
- quando chegam, as seções **entram de cima para baixo**, uma depois da outra
  (`.entrada`), respeitando quem pediu menos movimento no sistema;
- **passar o mouse** num sistema já começa a baixar o código do resumo
  (`precarregarDetalhe`), para o clique esperar menos.

⚠️ Nas páginas normais dos sistemas o comportamento é o de antes — o esqueleto vale só
na janela do setor.

**Arquivos:** `EsqueletoResumo.tsx` (novo), `globals.css`, `departamentos/[id]/Detalhe.tsx`,
`_visao/Sistemas.tsx`, `_visao/Cabecalho.tsx`, os nove `Resumo.tsx`,
`classroom/CoursesByDeptCard.tsx`.

## 2026-09-11 (11) — Suspensão em ROXO, e no ranking do setor

Dois pedidos do dono, olhando o Fiscal em agosto:

1. **O ranking do mês não mostrava as suspensões.** O topo acendia "Suspensões 2" e as
   linhas da Maria Fonsêca e da Raissa Leal mostravam só "4 adv · 6 atr". Agora a
   coluna de ocorrências abre com **"1 susp"**, em roxo (o `title` diz se foi por
   atraso ou de LGPD). Quem só tem suspensão também entra na lista.
2. **Na ficha, a suspensão era o mesmo cartão rosado da advertência**, com o nome
   trocado. Agora ela sai em **roxo**, com barra à esquerda, fundo mais forte e o selo
   "SUSPENSÃO · N DIAS"; o bloco passa a se chamar "Advertências e suspensões" quando há
   alguma no período.

⚠️ **Roxo é a cor de suspensão em todo o sistema**: o azulejo "Suspensões" da visão do
setor, o selo do ranking, os selos da tabela do relatório completo (que eram um âmbar
e um vermelho — agora os dois roxos, com o texto dizendo a natureza: "susp. atraso",
"susp. LGPD"), a ficha e o painel da pessoa na Assiduidade. A cor diz a gravidade; o
texto diz a natureza. Texto sobre o roxo usa a cor da superfície, para ler bem nos
dois temas.

**Arquivos:** `departamentos/[id]/_visao/RankingMes.tsx`, `_visao/derivar.ts`,
`departamentos/[id]/Pessoas.tsx`, `funcionarios/[id]/page.tsx`, `PainelDaPessoa.tsx`,
`lib/pessoa-sistema.ts`, `lib/pessoa-sistema-tipos.ts`.

## 2026-09-11 (10) — O painel da pessoa mostra os chamados do Chat

Decisão do dono: *"pode mostrar os chamados do chat também"*. No painel da pessoa, o
Chat passou de "contagem por dia" para a **lista dos chamados** que ela abriu,
assumiu e concluiu — número, assunto, de que setor para qual (ou "melhoria no
<sistema>"), situação e, nos concluídos, o tempo em horas de expediente.

- Rota nova no Chat Interno, `GET /api/integrations/talent-pessoa` (commit `e08caca`
  no chat-interno, nos dois espelhos, no ar no .69), com as **mesmas regras** do
  `talent-daily`: aberto = quem pediu (created_at); assumido = responsável
  (assigned_at); concluído = crédito de quem assumiu (closed_at); ensaios
  (`hidden_at`) fora.
- ⚠️ Continua sem atravessar: texto de mensagem, anexo, nome de canal, conversa
  direta, anotação. As **mensagens** seguem como contagem por dia, do espelho. O
  `talent-daily` (o espelho) segue só com contagem — a lista é sob demanda, uma
  pessoa por vez, e o TalentCare não a grava.
- Se o Chat não responder, os chamados caem para a contagem por dia, com aviso.

### ⚠️ O espelho do Chat também estava defasado — chamado que muda de dono

Conferindo a lista contra o número: 11 de 12 pessoas iguais, e o **Daniel com 9 na
lista e 16 no espelho**. Em 04/09 ele assumiu 8 chamados e passou 6 adiante; a fonte
passou a dizer 2 naquele dia, mas o sincronizador de hora em hora não volta a dias
passados. `run-chat-sync.mjs` ganhou `--completo` (histórico inteiro), que:
- **zera** (não apaga) a linha que a fonte não devolveu mais — quem passou o único
  chamado do dia adiante nem aparece na resposta, e só atualizar deixaria o número
  velho para sempre;
- tem **freio**: se a fonte devolver menos da metade das linhas do espelho, não zera
  nada e diz por quê no log.

Rodou uma vez (27 linhas mudaram: −7 assumidos, +76 mensagens que tinham chegado com
data antiga) e entrou no cron às **03:30**. Cópia de antes em
`chat_daily_bkp_20260911` / `chat_dept_daily_bkp_20260911`.

**Arquivos:** `lib/pessoa-sistema.ts`, `lib/pessoa-sistema-tipos.ts` (`aviso`),
`app/(app)/PainelDaPessoa.tsx`, `run-chat-sync.mjs`.

## 2026-09-11 (9) — O painel da pessoa: o que ela fez em cada sistema

Pedido do dono, depois do ClassRoom: *"faça o mesmo nos outros sistemas ao clicar na
pessoa"*. Nos nove resumos (página do sistema e janela "Ver detalhes" do setor),
clicar no nome abre um **painel lateral** com o que a pessoa fez naquele sistema, no
período do filtro. A ficha fica no link "Abrir a ficha ›" do painel.

⚠️ **Painel lateral, e não lista embaixo da linha** (como a 1ª versão do ClassRoom):
são dezenas de linhas diferentes nos nove resumos — rankings, tabelas, pódios — e o
painel deixa todas iguais, trocando só o clique. O ClassRoom passou a usar o mesmo
painel; `AprendizadoDaPessoa.tsx` e `/api/classroom-pessoa` saíram.

### Ao vivo, pelas regras de quem gera o número

Cinco sistemas ganharam uma rota `talent-pessoa` (o ClassRoom já tinha a
`talent-user-learning`), todas no **mesmo formato** e com as **mesmas regras** da
rota diária que alimenta o número ao lado do nome — conferidas 1:1 contra o espelho:

| Sistema | O que mostra | Conferido |
|---|---|---|
| HelpDesk (.77, `edc956a`) | chamados que abriu, resolveu e formalizou | Enzo 407 resolvidos no ano |
| CIDE (.74, `12a7167`) | empresas atendidas, uma por dia, com as alterações | Joice 304, Lucas 168 até 10/09 |
| Consultoria Plus (.68, `d48f5d5`) | estudos, chamados, mensagens e comentários (agrupados, sem texto) | Adriana 16 / 24 |
| Gerência (.72, `f5fb8aa`) | serviços entregues, saídas, protocolos abertos/aprovados, serviços criados | Elton 1.191 serviços no ano |

No dia de hoje a lista pode ter um item a mais que o número: ela é ao vivo, e o
espelho sincroniza de hora em hora. O painel diz isso.

### Do espelho, dia a dia — por decisão, não por falta

- ⚠️⚠️ **Chat Interno**: a rota diária dele diz, no código, que *"nenhum texto de
  mensagem, nenhum assunto de chamado, nenhum nome de canal atravessa esta porta"*.
  O painel mostra chamados e mensagens **por dia**, e não a lista de chamados —
  mudar isso é decisão do dono, não deste recurso.
- **WhatsApp**: conversa com cliente (nome e telefone de terceiros) — mesmo caminho.
- **Rádio** e **Assiduidade** (atrasos por dia + advertências e suspensões com o
  motivo) já estão inteiros no espelho.

A régua é a da ficha (`podeVer`): o Evandro abre o Legal e leva 403 na Luana
(Contábil).

### ⚠️ O espelho da Consultoria estava defasado — e a lista mostrou

A Marina Kazue tinha **204 estudos na fonte e 202 no espelho**: estudos cadastrados
com data antiga (30/07, 03/09) depois de o sincronizador ter passado por aqueles dias
— o incremental só puxa "desde a última passagem − 1 dia". `run-consultoria-sync.mjs`
ganhou `--completo`, que rodou uma vez (113 dias corrigidos) e entrou no cron às
**03:20**, como a Gerência já faz às 03:10.

### ⚠️ Incidente no CIDE durante o deploy

O build do CIDE falhou 3× com `EACCES` no `.next`: o build anterior fora feito pelo
Yuri e 3.433 arquivos eram dele. O `next build` apaga o `.next` antes de falhar — o
CIDE ficou servindo de um diretório pela metade (`/login` ainda 200). Corrigido com
`chown` do `.next` para `suporte` (o dono do serviço) e build completo; o CIDE voltou
inteiro, com a rota nova.

**Arquivos (TalentCare):** `lib/pessoa-sistema.ts`, `lib/pessoa-sistema-tipos.ts`,
`app/api/pessoa-sistema/route.ts`, `app/(app)/PainelDaPessoa.tsx` (novos);
`AppShell.tsx` e `departamentos/[id]/page.tsx` (o provedor); os nove `Resumo.tsx`;
`run-consultoria-sync.mjs`.

## 2026-09-11 (8) — ClassRoom: o que a pessoa estudou, a janela centrada e a barra fantasma

Três pedidos do dono, a partir da janela "Ver detalhes":

**1. A janela abre no centro da tela.** Estava presa ao topo (`alignItems:
flex-start`); agora centraliza e continua rolando por dentro quando é alta.

**2. Clicar numa pessoa do ClassRoom mostra o que ela concluiu e assistiu.** Nos
rankings "Maiores criadores" e "Maiores concluintes", o clique no nome abre embaixo
da linha — não num modal, porque essa lista também vive dentro da janela do setor —:
os **cursos concluídos** com a data e os **vídeos assistidos agrupados por curso**
(clique no curso para ver cada vídeo), no período do filtro. A ficha fica no link
"Abrir a ficha ›".

- O ClassRoom não mandava isso: o TalentCare só recebia contagens por dia. Rota nova
  lá, `GET /api/integrations/talent-user-learning` (commit `300a056` no ClassRoom,
  branch `feat/nexus-alertas-aprovacao`, que é o que roda no .71), com as **mesmas
  definições** do `talent-metrics-daily`: vídeo = `video_progress.watched` no dia de
  `watched_at`; curso = matrícula `completed` no dia de `completed_at`; dia de São
  Paulo. Conferido contra o espelho: Joice 170 vídeos / 65 cursos no ano, Marcos
  Gabriel 106 / 46, Lucas Souza 6 / 5 — **iguais**.
- Aqui, `/api/classroom-pessoa` busca ao vivo com a **régua da ficha** (`podeVer`): o
  Evandro abre a Joice (Legal) e leva **403** na Luana (Contábil).
- ClassRoom fora do ar aparece como erro, não como lista vazia — vazio se leria "não
  estudou nada", que é justamente o que não se sabe.

**3. A barra de rolagem horizontal do Rádio.** As linhas das listas têm margem
negativa (o realce passa da borda do texto), e com `overflowY: auto` o navegador rola
o outro eixo também — os 5px viravam uma barra. Mesma coisa no CIDE e na
Assiduidade; as três ganharam `overflowX: hidden` e o respiro de volta.

**Arquivos:** `departamentos/[id]/Detalhe.tsx`; `classroom/Resumo.tsx`,
`classroom/AprendizadoDaPessoa.tsx` (novo); `app/api/classroom-pessoa/route.ts`
(novo); `radio/`, `cide/`, `assiduidade/Resumo.tsx`.

## 2026-09-11 (7) — O botão do calendário mostra as datas, e a atividade obedece ao filtro

Dois pedidos do dono:

### 1. O botão do calendário sempre diz de que dia a que dia

Em 7d / 30d / Trimestre / Ano ele dizia só **"Período"** — as datas só apareciam ao
escolher um mês ou um intervalo. Agora mostra sempre o intervalo em vigor ("12 de
ago. a 11 de set. de 2026"). E os campos "De" / "Até" do calendário abrem com essas
datas, e não com o último intervalo escolhido à mão (que ficava guardado e aparecia
fora de contexto). O contexto do período (`lib/ui/period.tsx`) passou a expor
`fromDay`, `toDay` e `datas`; a formatação saiu para `datasDoIntervalo` em
`lib/period-range.ts`, que o rótulo do intervalo também usa.

### 2. "Atividade mês a mês" virou "Atividade no período"

Era sempre os últimos meses FECHADOS, qualquer que fosse o filtro. Agora é a janela
do filtro (`atividadeDoPeriodo` em `/api/dept-metrics`), com o ponto do tamanho da
janela (`lib/serie-periodo.ts`): **até 45 dias, por dia · até 4 meses, por semana ·
acima, por mês**. O ponto incompleto (hoje, a semana curta, o mês corrente) sai
vazado e tracejado — é pedaço, não queda.

Mesmas fontes e pesos da série mensal: julho e agosto inteiros dão **exatamente** o
número que a série mensal dá para eles (Legal 311 e 511, Contábil 158 e 83), e a
soma dos pontos fecha com o total em todo filtro.

⚠️⚠️ **A comparação é com a janela anterior de mesmo tamanho, DE IGUAL PARA IGUAL.**
Duas tentativas mostraram por quê:
- Olhando só o 1º registro do setor, o Legal em "Ano" deu **+2756%**: Gerência, Chat
  e Consultoria não existiam na janela anterior. Agora entram na conta só as fontes
  que já registravam no início da janela anterior, e a tela nomeia as que ficaram
  fora ("Chat, desde 25/08").
- Mesmo assim o "Ano" deu **+1402%**: sobrou a Gerência, que tem registros de 2025 do
  import do sistema antigo — mas a autoria por pessoa só existe desde 2026. Janela
  LONGA (por mês) não compara: mostra o total e a forma, e diz por quê.

A série mensal fixa continua no relatório completo, onde a pergunta é "como o setor
anda no ano".

**Arquivos:** `lib/period-range.ts`, `lib/ui/period.tsx`, `app/(app)/AppShell.tsx`;
`lib/serie-periodo.ts` (novo); `app/api/dept-metrics/route.ts`, `lib/ui/dept-period.ts`;
`departamentos/[id]/_visao/AtividadeDoPeriodo.tsx` (era `AtividadeMensal.tsx`),
`derivar.ts`, `tipos.ts`, `[id]/page.tsx`.

## 2026-09-11 (6) — A visão nova virou o relatório do setor, e o número clicado mostra quem

O dono aprovou a prévia: *"ficou ótimo, pode trocar a atual por essa — mas antes,
deixe ela ainda mais interativa"*. Os três exemplos dele: clicar em Advertências e
ver quem recebeu e quantas; clicar em Atrasos e ver quem se atrasou e quantas vezes;
clicar num dia do calendário e ver quem chegou tarde e quanto.

### O que o clique revela

- **Advertências, Atrasos, Minutos de atraso e Suspensões** (no topo e nos números
  da Assiduidade) abrem a lista de quem está atrás do número, com a quantidade de
  cada um — cada linha leva à ficha. A **Rotatividade** abre o Turnover do setor
  (quem saiu e a movimentação mês a mês). O azulejo só vira botão se houver quem
  mostrar: um clique que abre lista vazia ensina a não clicar mais.
- **O dia do mapa de atrasos** abre, embaixo do calendário (não num modal — o
  calendário segue à vista para clicar no dia seguinte), quem se atrasou naquele
  dia, quantos minutos, se foi abonado e se a pessoa já saiu. "Atraso sem minuto
  medido" diz isso, e não "0 min".

⚠️⚠️ **O que o clique mostra soma o número clicado — conferido.** A lista do dia
vem das MESMAS linhas que o `groupBy` do mapa conta (`quemNoDia` em
`/api/dept-metrics`, mesma população, inclui quem saiu), e as listas dos
indicadores saem de `m.pessoas`, a mesma base dos totais.
`scripts/ensaio-quem-atras-do-numero.mjs`: **888 dias, 16 setores, agosto e ano,
0 divergências** — dia a dia (pessoas e minutos) e os totais de atrasos, minutos e
advertências.

⚠️ **As listas moram num lugar só**: `lib/ui/envolvidos-setor.ts`. Nasceram dentro
do `Hero` do relatório anterior; a visão nova precisou das mesmas, e o `Hero` passou
a usá-las em vez de ter uma cópia.

⚠️ **O painel escondia a quantidade quando todos tinham o mesmo valor** — feito para
a lista de admissões do dashboard, onde cada linha vale 1. Numa lista de atrasos em
que todos têm 1, o "1" é a informação. `PainelPessoas` ganhou `mostrarNumero`
(padrão desligado, o dashboard segue igual).

⚠️ **Peso**: nome, cargo e foto de quem aparece no mapa vão uma vez só
(`quemDoMapa`), e cada linha leva só id e números. Com tudo repetido, o ano do
Contábil saía com 95 kB (59 kB só da lista); agora, 70 kB. O nginx da casa não
comprime JSON, então isso viaja cru a cada troca de filtro.

### A troca

- `/departamentos/<id>` é a visão nova. As seções moram em `[id]/_visao/` (o `_`
  tira a pasta das rotas).
- O relatório de antes virou **`/departamentos/<id>/completo`** — ele tem o que a
  visão não traz (tabela de pessoas com nota e busca, avaliação por critério,
  tendência, os cartões de cada sistema). "Relatório completo", no cabeçalho, e
  "Ver relatório completo", na faixa de sistemas, levam a ele; o "Voltar" dele volta
  para a visão geral.
- `/departamentos/<id>/novo` redireciona — o endereço da prévia não vira 404.
- A faixa de sistemas ganhou o cartão **Serviços do setor** (a planilha), que a
  prévia não tinha: o Legal tem 1.508 serviços e a visão não os mostrava.

**Arquivos:** `app/(app)/departamentos/[id]/page.tsx` (a visão), `[id]/_visao/`
(+`Paineis.tsx`, `DiaDoMapa.tsx`), `[id]/completo/page.tsx` (o relatório de antes),
`[id]/novo/page.tsx` (redireciona); `lib/ui/envolvidos-setor.ts` (novo);
`app/(app)/PainelPessoas.tsx`, `CalendarioOcorrencias.tsx` (`onDia`, `selecionado`),
`departamentos/[id]/Hero.tsx`; `app/api/dept-metrics/route.ts` + `lib/ui/dept-period.ts`
(`quemNoDia`, `quemDoMapa`); `scripts/ensaio-quem-atras-do-numero.mjs` (novo).

## 2026-09-11 (5) — Prévia: o relatório do setor no desenho da imagem conceito

Pedido do dono: uma página NOVA, em paralelo à atual, com o desenho de uma imagem
conceito — seguindo até as cores dela, sem se prender à paleta do TalentCare —
para comparar na prática.

**Onde:** `/departamentos/<id>/novo`. A atual segue intacta em `/departamentos/<id>`.
Uma leva à outra: "Prévia do layout novo" no cabeçalho da atual (só para a
Diretoria — os gestores acabaram de entrar e não devem esbarrar numa tela em teste)
e "Ver versão atual" na prévia, que também traz um selo "Prévia do layout novo".

**O desenho, como no conceito:** cabeçalho com azulejo de ícone e trilha
"Departamentos ›"; Liderança do setor com os rostos + nove indicadores em azulejos
de cor suave (a Rotatividade ocupa duas linhas); Escolaridade em rosca, Atividade
mês a mês em área azul com a variação contra o mês anterior, Últimas saídas;
Ranking do mês com chips de ocorrência, Avaliação mensal + Chamados entre setores,
Assiduidade com o mapa de atrasos em laranja; e a faixa "Sistemas e produtividade",
um cartão por sistema com os 3 primeiros e dois números.

**A paleta nova** mora em `novo.module.css`, em tokens (`--n-*`), com tema claro (o do
conceito) e escuro (mesmas famílias de cor, superfícies azul-noite). ⚠️ Dentro da
página os tokens do app (`--surface`, `--accent`…) apontam para ela: o avatar, o
calendário e a janela "Ver detalhes" que a prévia reaproveita herdam as cores novas
sem mudança. O calendário ganhou uma prop `paleta` opcional — o padrão é o de sempre.

⚠️⚠️ **Mesmos dados da atual, de propósito.** A prévia lê a mesma `/api/dept-metrics`
(mesma régua de acesso: gestor abre só o setor dele) e abre a mesma janela "Ver
detalhes". Compara-se o desenho, não os números — duas telas do mesmo setor com
números diferentes estragariam a comparação.

⚠️ **Onde o conceito foi seguido e onde não:**
- Os **dados de exemplo** da imagem (um "Coordenador", "Superior Incompleto", "↑ 12
  pessoas") não existem: a tela mostra o que o setor tem.
- Os **rostos da liderança** têm o mesmo tamanho, como no conceito (na atual o sub é
  menor); o cargo embaixo marca a hierarquia.
- O **"-47% vs. mês anterior"** compara os dois últimos meses FECHADOS (a série do
  servidor já para no último fechado) e diz quais são ("ago/26 vs. jul/26").
- O **Rádio** fica sem lista de pessoas, como no conceito e como na atual.
- Onde o ponto não mediu a janela, atraso é **"—"**, não zero; faltas, "sem fonte".

**Responsivo:** grades de 12/6 colunas no desktop, duas no tablet, uma no celular;
alvos de toque de 44px nas linhas clicáveis.

**Arquivos:** `app/(app)/departamentos/[id]/novo/` (15 arquivos: `page.tsx`,
`novo.module.css`, `tipos.ts`, `derivar.ts`, `ui.tsx` e uma seção por arquivo),
`app/(app)/departamentos/[id]/page.tsx` (o atalho), `app/(app)/CalendarioOcorrencias.tsx`
(prop `paleta`).

## 2026-09-11 (4) — "Ver detalhes": o resumo de cada sistema dentro do relatório do setor

Pedido do dono: gestor e sub só alcançam o relatório do próprio setor, e as páginas
de resumo dos sistemas (menu "Sistemas") têm muito mais detalhe do que o cartão.
Estudar se o relatório espelha esse detalhe e, se não, abrir o detalhe ali mesmo, só
com o setor. E, se quiser, redesenhar o relatório, que não aproveitava a tela.

### O estudo — o que o relatório já espelhava e o que não

Espelhava, em cada cartão: os **totais** do sistema e os **6 primeiros** de um
ranking. Não espelhava o que as páginas têm a mais — a **tabela completa por
pessoa** (HelpDesk, Chat, Consultoria, CIDE, Rádio, Assiduidade), **rankings por
métrica** (Consultoria tem quatro; HelpDesk, quem abre × quem resolve), a **lista de
cursos criados por pessoa** (ClassRoom), a **série diária** de atendimentos
(WhatsApp), as **saídas externas** e a **demanda do escritório** (Gerência), e a
**movimentação mês a mês** com a lista de desligados (Turnover).

### O que entrou

Um botão **"Ver detalhes ›"** no mesmo lugar de cada cartão — WhatsApp, Chat,
HelpDesk, ClassRoom, Gerência, Consultoria, CIDE, Rádio, Assiduidade e Rotatividade.
Ele abre uma janela grande, na própria página, com o resumo daquele sistema **só com
o setor**. Esc ou clique fora fecha. A janela vai para a URL (`?detalhe=classroom`):
clicar numa pessoa leva à ficha, e o "Voltar" da ficha devolve a janela aberta.

⚠️⚠️ **É a PRÓPRIA página do sistema, não uma cópia.** Cada `page.tsx` virou
`Resumo.tsx` (com `git mv`), e a janela o renderiza dentro de `RecorteDoSetor`
(`lib/ui/recorte-setor.tsx`) — um `TalentDataProvider` que só enxerga o setor. Os
montadores já trabalhavam em cima do diretório, então cada total e cada ranking saem
da mesma conta que a Diretoria vê. Uma segunda tela para "o detalhe do setor" seria
uma segunda régua. No modo setor, some só o que compara setores entre si (com um setor
só, é uma barra de 100%) e o cabeçalho da página.

⚠️⚠️ **O número da janela bate com o do cartão — conferido, não suposto.**
`scripts/ensaio-detalhe-setor.mjs` refaz a conta da janela para cada setor (a rota do
sistema somada nas pessoas ATIVAS, que é o que o recorte entrega) e compara com
`/api/dept-metrics`: **576 números, 16 setores, 30 dias e ano, 0 divergências.** Três
réguas tiveram de ser alinhadas para isso:

- **Ativos, não todos.** O cartão soma os ativos do setor; as páginas somam todo
  mundo. O recorte tira os desligados — menos no Turnover, cujo assunto são eles.
- **WhatsApp por atendente, não por fila.** A página conta pela FILA
  (`whatsappDaily.dept`); o cartão, pelas ATENDENTES do setor casadas por nome. Com
  `?setor=`, a rota passa a usar a régua do cartão. Os números de "agora" (pendentes,
  em andamento) são da casa inteira e saem da janela.
- **Chamados do Chat por setor.** Eles vêm de `chat_dept_daily`, não por pessoa: o
  recorte do diretório não os alcança e a janela filtra à parte.

⚠️ **Turnover: a janela usa a taxa do RELATÓRIO**, não a da página. A página de
Turnover calcula "saídas ÷ ativos" por setor; o relatório e a lista de
departamentos, "saídas ÷ quem passou pelo setor" — **12,5% × 11,1% no Legal**. A
janela abre por cima do cartão que mostra o segundo. ⚠️ **A página `/turnover` segue
com a régua dela** — é uma divergência antiga, fora deste pedido, e está anotada.

### A brecha que o estudo achou — `/api/classroom-courses`

Era a única rota agregada fora de `lib/alcance.ts`: devolvia os **215 cursos da casa**
(título e autor) para qualquer sessão, gestor incluído. Agora recorta pelo alcance —
a Priscila Araújo recebe os 16 do Contábil, 0 de fora. O ensaio confere isso e o 403
do WhatsApp de um setor alheio.

### O relatório em tela inteira

- Sem o teto de 1280px.
- A "O que aconteceu" — avaliação e os cartões de sistema, que eram uma sequência de
  cartões iguais numa coluna só — corre em **colunas de jornal** (`columns`, ~560px):
  duas num monitor comum, três num largo, uma no celular. `columns` e não `grid`,
  porque os cartões têm alturas muito diferentes e a grade deixaria buracos.
- Assiduidade e "A equipe" lado a lado.

⚠️ **O Rádio**: o relatório tirou de propósito o pódio de "quem mais escuta" (escuta
não é trabalho, e a tela decide aumento). A janela do Rádio é a página do sistema, e
ela tem o top 5 e a tabela por pessoa. Entrou porque o pedido foi espelhar as páginas;
se não servir, é um `!setor &&` a mais no `radio/Resumo.tsx`.

**Arquivos:** `lib/ui/recorte-setor.tsx` (novo); `app/(app)/<sistema>/Resumo.tsx` ×10
(novos, vindos dos `page.tsx`); `app/(app)/turnover/Visao.tsx` (o corpo sem hooks, para
servir à página do servidor e à janela); `app/(app)/departamentos/[id]/Detalhe.tsx`
(novo), `CardFonte.tsx`, `Tendencia.tsx`, `page.tsx`; `app/(app)/classroom/CoursesByDeptCard.tsx`;
`app/api/whatsapp-overview/route.ts`, `app/api/classroom-courses/route.ts`;
`scripts/ensaio-detalhe-setor.mjs` (novo).

## 2026-09-11 (3) — Departamentos: a tela inteira, e o rosto de quem responde

Pedido do dono: *"melhore o design desta página, aproveite a extensão inteira da tela,
apresente ao invés da pontuação a foto do encarregado e sub — isso já ocorre quando
acessamos ela"*.

- **Largura total.** A grade era 3 colunas cravadas em 1280px, com faixas cinzas dos
  lados. Agora é `auto-fill` com mínimo de 300px: 5 colunas num monitor largo, 3 no
  notebook, 1 no celular — sem regra por tela.
- **O rosto no lugar do score.** Gestor maior, sub menor — a mesma hierarquia do topo
  do relatório, que espelha a da avaliação. Clicar na foto abre a ficha da pessoa;
  clicar no card, o relatório do setor.
- **O score saiu, e a "Score médio" do cabeçalho junto**, pela régua de 03/09: não foi
  validado e não vale. No lugar: Setores, Headcount total e — só quando há — "Sem
  chefia definida". A ordem deixou de ser o score e virou **alfabética**: ordenar por
  um número que não se mostra é classificar os setores às escondidas.

⚠️⚠️ **O "líder" do card era ADIVINHADO, e errava.** Saía do primeiro cargo que
casasse com `/Coorden|Gerente|Gestor|Tech…/` ou, na falta, da pessoa de maior score:
o card das **Entregas mostrava o Gilberto** (mensageiro) e o do **TI, o Yuri** —
enquanto quem responde pelos dois é Evandro/Joice e o Daniel. O `lider` foi
**apagado** do tipo `Department` e trocado por `chefia`, preenchida em `getTalentData`
pelo vínculo gravado em `setor_avaliador` — a mesma origem e a mesma ordem do
relatório do setor. Um só lugar diz quem chefia o quê.

⚠️ Setor sem chefia não ganha rosto genérico: **Consultoria e Pousada** mostram
"Responde à Diretoria" em tom neutro (é decisão gravada, `avaliadoPelaDiretoria`); só
a FALTA de chefia sai em alerta. Hoje não há nenhum setor nessa situação.

⚠️ Saiu também o `useScoreSignals` da página: ele buscava `/api/score-metrics` — a
atividade da empresa inteira — só para calcular o número que a tela deixou de mostrar.

**Conferido** com sessão forjada: Diretoria (16 cards, 2 "pela Diretoria", nenhum
"/100 score", o Gilberto não aparece mais como líder) e Priscila Araújo, gestora do
Contábil (200, com Débora e Liliane como sub).

**Arquivos:** `app/(app)/departamentos/page.tsx`, `lib/mock/departments.ts`,
`lib/mock/data.ts` (`ChefeDoSetor`, sai o `lider`), `lib/data/source.ts`.

## 2026-09-11 (2) — As advertências da ficha seguem o período

Pedido do dono: filtrou **agosto** na ficha do Marcos Gabriel e o calendário e a
gravidade dos atrasos mudaram, mas a lista de advertências logo abaixo continuou
mostrando julho, junho e o resto — ela vinha inteira, com o selo "histórico
completo". O 5º atraso de 23/07 aparecia debaixo de um mês em que ele teve 3.

Agora a lista obedece ao filtro, como os números ao lado dela (regra (b) da casa).
Medido na rota com a mesma pessoa:

| filtro | na lista | contador do período |
|---|---|---|
| agosto | 2 (06/08, 25/08) | 2 |
| julho | 4 | 4 |
| setembro | 0 | 0 |
| ano | 21 | 21 |

Antes, a lista dizia 21 em qualquer filtro, e o contador ao lado dizia outro número.

⚠️ **O total de sempre continua visível** (`disciplinaTotal`): o título mostra
"· 01 de ago. a 31 de ago. de 2026 · 21 no histórico completo", e o estado vazio diz
"Nenhuma ocorrência **no período** — 21 em outros períodos, amplie o filtro". É a
lição da planilha de serviços: recorte sem o todo ao lado faz perguntar onde foram
parar os dados, e "nenhuma" não pode se ler como "nunca teve".

**Arquivos:** `app/api/employee-metrics/route.ts`, `lib/ui/employee-period.ts`,
`app/(app)/funcionarios/[id]/page.tsx`.

## 2026-09-11 — A ficha volta para onde você estava

Pedido do dono: entrou na ficha do Lucas pelo **relatório do Legal**, e o botão dizia
"‹ Voltar ao diretório" — uma tela que ele não visitou. Voltar por ali perdia o setor,
a busca digitada e a aba ("Pontuação") que ele estava olhando.

Agora o botão diz **para onde vai** e vai para lá: "‹ Voltar ao relatório de Legal",
"‹ Voltar à avaliação de Lucas", "‹ Voltar para Ranking", "‹ Voltar à área da
mensageria"… Volta pelo **histórico** (`history.back()`), e não abrindo a rota de
novo, para a tela reaparecer como estava — rolagem, busca e aba inclusas.

⚠️ Sem de onde ter vindo (abriu por um link, recarregou a ficha), continua "Voltar ao
diretório". Nesse caso `back()` tiraria a pessoa do sistema, ou não faria nada numa
aba nova.

⚠️⚠️ **Um RASTRO no layout, e não `?de=` em cada link.** A ficha tem ~35 portas de
entrada (relatório de setor, ranking, avaliação, entregas, cada painel de sistema).
Marcar a origem em cada uma seria 35 lugares para lembrar, e a porta nº 36 nasceria
com o botão errado sem nada acusar. O `OrigemProvider` (`lib/ui/origem.tsx`) guarda a
rota anterior no `AppShell` e cobre todas — inclusive as que ainda não existem. Os
nomes das telas saem do **menu**, não de uma segunda lista.

⚠️ O rastro é atualizado **durante a renderização**, não num `useEffect`: com efeito,
a ficha pintaria "Voltar ao diretório" e trocaria o texto um instante depois.

**Arquivos:** `lib/ui/origem.tsx` (novo), `app/(app)/AppShell.tsx`,
`app/(app)/funcionarios/[id]/page.tsx`.

## 2026-09-10 (3) — A chefia inteira entrou: 16 gestores, cada um na sua área

Pedido do dono: *"os gestores e sub-encarregado do Legal já conseguem acessar e ver o
relatório da própria equipe; faça o mesmo para os demais, cada um a sua área"*.

**O que estava no ar antes:** duas pessoas — Evandro Padilha e Joice Rocha — dentro
pela lista nominal `TALENTCARE_ACESSO_TESTE`, que existia para o ensaio. Os outros 14
chefes eram `SEM_PERMISSAO`: apareciam na lista e batiam em `/acesso-negado`.

**O que entrou:** um TERCEIRO degrau de acesso, `TALENTCARE_ACESSO_GESTAO`, entre "só
a Diretoria" e "a casa inteira". Ele abre a porta para quem tem **cargo de chefia
(`Gestor`, `Sub-encarregado`) OU vínculo gravado em `setor_avaliador`**.

| | antes | depois |
|---|---|---|
| ADMIN (Diretoria + dono) | 10 | 10 |
| GESTOR | 2 | **16** |
| SEM_PERMISSAO | 84 | **70** |

⚠️⚠️ **Por que um degrau DERIVADO e não mais 14 e-mails na lista de ensaio.** As duas
saídas dariam o mesmo resultado hoje. A diferença aparece daqui a um mês: uma lista
nominal envelhece calada nos **dois** sentidos — quem for promovido a Gestor não
entra, e quem sair da chefia continua entrando, sem que nada acuse. O degrau derivado
é recalculado pelo sync das :45 (`mapRole` é a mesma função nos dois caminhos), então
a promoção e a saída se resolvem sozinhas. É a mesma razão pela qual `ACESSO_ABERTO`
sempre derivou do cargo, e não de uma lista.

⚠️ E ele **não** é `ACESSO_ABERTO` com outro nome: os ~70 colaboradores continuam
fora. Abrir para eles é a decisão seguinte, e a chave segue `off`.

⚠️ `TALENTCARE_ACESSO_TESTE` ficou **vazia** — o ensaio que ela existia para permitir
terminou. Evandro e Joice continuam dentro pelo cargo, o que é a prova de que o degrau
novo os carrega: se ele não funcionasse, os dois teriam caído junto com a lista.

### O ensaio que o banco não faz — `scripts/ensaio-acesso-gestao.mjs`

`role='GESTOR'` no banco prova que o sync calculou o que se queria. **Não** prova que a
pessoa entra, nem que ela para na porta do vizinho — são duas réguas (a porta, em
`proxy.ts`; o conteúdo, em `lib/alcance.ts` + `regua.ts`) e o defeito clássico é uma
passar e a outra não. O script forja o cookie do next-auth de **cada um dos 16** e
mede quatro coisas: 200 no setor dele (com a equipe dentro), 403 no setor alheio,
`/ranking` e `/dashboard` fechados. Mais um colaborador de contraprova, que continua
levando 403 no próprio setor — sem ele o ensaio diria "todos passaram" mesmo num
sistema que tivesse aberto para os 87.

Rodou limpo nos 16, incluindo os dois casos que não seguem o cargo: **Evandro e Joice
alcançam Entregas e Legal** (Entregas fica debaixo do Legal) e a **Rosemeire, cargo
`Colaborador`, alcança Cozinha e Limpeza** pelo vínculo.

⚠️⚠️ **A Rosemeire está liberada e mesmo assim não entra.** O e-mail dela é
`@staff.local` — colaboradora avulsa, sem conta no AD e com hash de senha
inutilizável. Cozinha e Limpeza ficam **sem leitor de fato**, e isso não é defeito do
acesso: é que não há a quem dar a conta. Fica anotado porque a tela de usuários vai
mostrá-la como `GESTOR` e sugerir o contrário.

**Consultoria (2), Pousada (1) e Diretoria (9)** seguem sem avaliador próprio — os
três respondem à Diretoria por decisão de 02/09, não por falta de cadastro.

**Arquivos:** `lib/nexus.ts` (o degrau + `ehChefia`), `run-sync.mjs` (a cópia gêmea da
régua — mexeu num, mexe no outro), `scripts/ensaio-acesso-gestao.mjs` (novo),
`docs/CONTINUAR-AQUI.md`, `docs/AVALIACOES.md`. Sem mudança de schema.

## 2026-09-10 (2) — A escolaridade das 6 pendentes, e o import que a apagaria

O dono mandou a lista do RH para as 6 pessoas ativas sem formação registrada.
**5 entraram; 1 ficou de fora de propósito.**

| pessoa | setor | nível | curso |
|---|---|---|---|
| Cynthia Hora | Fiscal | Ensino Médio | |
| Gabriel Costa | Financeiro | Ensino Médio | |
| Laryssa Oliveira | Fiscal | Ensino Médio | |
| Tabata Vieira | Pessoal | Superior (cursando) | Gestão de Recursos Humanos — último semestre |
| Yasmin Ensinas | Fiscal | Superior (cursando) | Relações Internacionais |

⚠️ **A Bruna Costa não entrou.** O RH escreveu *"Superior Incompleto **?**
(Direito)"* — a interrogação é de quem informou. Este campo alimenta o donut de
escolaridade e a ficha de uma pessoa real; gravar uma dúvida como fato é o que
ninguém revisa depois, porque o valor fica plausível. Entra quando o RH
confirmar.

### ⚠️⚠️ E o import de escolaridade apagaria tudo isso, em silêncio

`run-education-import.mjs` fazia `update: { level, sexo, detail, raw }` **sem
olhar o `source`**. Toda escolaridade digitada na tela `/escolaridade` seria
sobrescrita na próxima carga do RH — e justamente a das pessoas que estão nessa
tela por NÃO virem completas na planilha. Havia **2 registros `manual`** já
expostos a isso antes desta sessão.

É a lição da conta `Sistema`: escrever à mão um campo que um import reescreve é
combinar com o import quem ganha, e quem roda por último ganha. Agora ele
**preserva o `manual`** e imprime a lista de quem pulou — pendência visível, não
silêncio.

⚠️ **Casamento por LOGIN, nunca por nome.** Os três pares perigosos existem todos
nesta casa: **Bruna Costa × Bruna Cunha**, **Gabriel Costa × Gabriel Santana**,
**Yasmin Ensinas × Yasmin Barroso**. A lista do RH vem com nomes soltos
("Cynthia").

⚠️ `scripts/semear-escolaridade.ts` usa a **mesma lib do editor**
(`deriveLevelAndDetail`), não um `level` digitado: senão a linha semeada
apareceria diferente da que a tela produz para a mesma formação, e o donut
passaria a ter duas gramáticas. Ele também **não sobrescreve quem já tem** nível
registrado.

### ✅ As duas pendências foram fechadas (decisão do dono, no mesmo dia)

- **FABIANA RODRIGUES SOARES · Ensino Fundamental** foi para a **Fabiana
  Rodrigues Soares certa** (Limpeza, inativa), e não para a Fabiana Higa que a
  tela sugeria. ⚠️ Conferido depois: a **Fabiana Higa ficou intacta**, com o
  Superior em Ciências da Computação dela — a rota só apaga o vínculo anterior
  quando a linha estava presa a outra pessoa, e esta estava solta.
- **Bruna Costa**: **Superior (cursando), curso EM ABERTO**. O nível é o que o
  RH sabe; o curso, que veio com interrogação, fica em branco em vez de virar
  texto na ficha. `curso: ''` faz o `detail` sair nulo — a tela mostra o nível e
  nenhuma frase inventada.

⚠️ As duas foram aplicadas **pelas ROTAS REAIS** (`education-link` e
`education-set`), com sessão forjada pelo `AUTH_SECRET`, e não por `INSERT`. O
`education-link` faz coisas que uma escrita à mão não faria — apagar o vínculo
anterior e virar o `status` do staging para `applied`, que é o que tira a linha
de "A revisar". Reescrever isso seria uma segunda régua para a mesma operação.

**A tela zerou:** 0 em "A revisar" e **0 de 86 pessoas ativas sem formação
registrada**.

### ⚠️⚠️ O botão "Vincular" da tela estava armado para gravar na PESSOA ERRADA

Achado ao conferir o print. A linha "A revisar" mostra **FABIANA RODRIGUES
SOARES · Ensino Fundamental** e sugere vincular a **Fabiana Higa · Imóveis**.

Mas **existe uma Fabiana Rodrigues Soares de verdade** no sistema — Limpeza,
`fabiana.rodrigues.soares`, nome batendo exato. Ela está **inativa**, e quase
certamente foi cadastrada DEPOIS de o import rodar: por isso a sugestão caiu na
única "Fabiana" que existia na época.

Clicar em "Vincular" com a sugestão padrão gravaria **Ensino Fundamental na ficha
da Fabiana Higa**, que hoje tem **Superior (cursando)** — rebaixando a formação de
uma pessoa por um dado que é de outra. A pessoa certa **está no dropdown** (a
lista de opções não filtra inativos), então dá para corrigir na hora.

(Resolvido no mesmo dia — ver acima.)

### A conta que fecha

A tela mostra **86** e o banco tem **95** no mesmo recorte — a diferença são as
**9 pessoas da Diretoria**, que `isHiddenDept` esconde de propósito. Das 6
pendências, resta **1** (a Bruna). ⚠️ E entre as 9 ocultas há duplicatas
evidentes — *Eunice Kohatsu2*, *Sergio2 Kohatsu*, *Helena M Chibana Kohastsu* ×
*Helena Michiko* —, o mesmo padrão da Ísis Mossinato registrado no `FONTES.md`.
Não incomodam nenhuma tela hoje por estarem ocultas.

## 2026-09-10 — O histórico REAL de suspensões entrou, e ele desmentiu uma advertência

O DP mandou a planilha de suspensões (4 abas, 52 registros, 2020→2026). O
`CONTINUAR-AQUI.md` mantinha essa frente parada de propósito — *"SUSPENSÃO,
esperando dados REAIS"* — com o aviso de **não derivar**, porque o encarregado
pode liberar entrada e perdoar a medida.

### ⚠️⚠️ A medição respondeu sozinha a pergunta que o doc deixou em aberto

Era "substitui ou acrescenta?". As **8 suspensões dentro da janela do ponto caem,
todas as 8, no mesmo dia de uma advertência derivada** — e a regra fecha exata:

| | atrasos no mês | advertências derivadas | suspensão |
|---|---|---|---|
| Daniel Novais, mai/26 | 6 | 5 (2ª à 6ª) | no dia do 6º |
| Maria Fonsêca, ago/26 | 6 | 5 | no dia do 6º |
| Sabrina Brito, fev/26 | 4 (75 min) | 3 | no 4º, "acima de 10 min" |

Ou seja: **a última advertência derivada de cada um desses meses nunca foi
advertência — é a suspensão**, gravada com o nome errado e o desconto errado (o
mais leve). É o mesmo padrão que a casa já pegou quando "a advertência era o
mesmo atraso contado de novo". Então **substitui**: somar puniria duas vezes pelo
mesmo fato.

⚠️ E o conserto NÃO ficou só no importador. `run-ponto-import.mjs` é wipe+rebuild
e recriaria a advertência no próximo dump — em silêncio, no dia em que alguém
atualizasse o ponto. Ele passou a consultar as suspensões reais e a **não
derivar advertência no dia em que existe uma**. O ordinal não é renumerado: ele
descreve qual atraso do mês foi, e o atraso aconteceu.

### ⚠️⚠️ A trava que o dono propôs pegou dois casamentos errados

O casamento é por nome (exato, ou 1º nome + 2 tokens). O dono acrescentou uma
segunda trava: **se o fato é anterior à admissão da pessoa, não é ela.** Ela
pegou dois vínculos que o nome tinha aprovado com confiança:

| planilha | casou com | admissão | suspensão |
|---|---|---|---|
| CAMILA HELENA ALEIXO SILVA | Camila Silva, Fiscal | 23/04/2026 | **26/06/2024** |
| JOÃO VÍCTOR DE MORAIS SILVA | Joao Victor, Financeiro | 13/05/2026 | **26/09/2023** |

Duas suspensões que teriam ido para a ficha da pessoa errada. **Ficaram 28
suspensões, 15 pessoas**; 22 foram descartadas por serem de gente que saiu e
nunca esteve no TalentCare (decisão do dono), e o ensaio as lista.

⚠️ Um caso ficou EM ABERTO por decisão do dono: "SAMIRA GONÇALVES MOREIRA"
(29/11/2022) × "Samira Santos" (Contábil, desligada em 13/06/2026). Só o primeiro
nome bate. Fica fora até o DP confirmar.

### A régua ganhou o evento `suspensao`

**2× a advertência** (decisão do dono), em todos os 16 setores: Fiscal −46, Legal
−150, Contábil −16, Entregas −186. Entre a advertência (1,5× o atraso) e a
advertência por vazamento de dado (3×), que é outra natureza.

⚠️ O peso nasce em `propor-pesos.ts`, junto da fórmula que propõe todos os
outros — não num INSERT à parte. Mas com uma flag nova, `--so-suspensao`: rodar
a proposta INTEIRA teria mexido, de carona, na régua de aumento de 61 pessoas,
porque ela depende da MEDIANA do setor e a mediana do Entregas subiu quando o
espelho da Gerência foi reconciliado (o atraso saltaria de −62 para −65). A flag
grava só o item novo, derivado da advertência que está VIGENTE.

### ⚠️ E uma descoberta de carona: as notas de agosto estavam velhas

`scripts/conferir-mes.ts` (novo) compara o gravado com o que a régua calcula
agora. Em agosto, **8 de 61 notas tinham mudado** — e só 2 pela suspensão:

- **Raissa Leal 76 → 65** e **Maria Fonsêca 38 → 15** (a suspensão)
- **Yasmin Ensinas 354 → 396**, e mais cinco de +6 — o backfill completo da
  Gerência das 03:10 trouxe atividade de agosto que o incremental nunca traria.

A nota gravada é um retrato do dia em que se rodou, e as fontes por baixo dela
continuam se mexendo. **Nenhuma das duas avisa ninguém.** Contábil, Fiscal e
Pessoal foram regravados; a conferência voltou a 61 iguais, 0 divergentes.

### ⚠️⚠️ E um consumidor ESCAPOU da primeira varredura — o dashboard

O dono viu no navegador: **"Suspensões 0"** no painel da casa, em agosto/2026,
mês com duas suspensões reais no Fiscal. O relatório do setor já mostrava 2.

A causa é a que a casa já conhece: o **dashboard tem rota própria**
(`/api/assiduidade-metrics`), separada da do relatório de setor. Percorri os
consumidores pelo `grep` de `disciplinaEvento` e consertei os que apareceram —
mas conferi cada um lendo o código, e não percorri a lista até o fim contra uma
pergunta única. O cartão mais grave do painel mais visto ficou mentindo por
omissão por meia hora.

A varredura passou a ser mecânica, e é o que fecha esta entrega:

```
para cada arquivo que menciona lgpdSuspensoes ou lgpd_suspensao,
  ele também menciona a suspensão por atraso?
```

Ela achou ainda um segundo esquecido: **`Pessoas.tsx`**, a lista nome a nome do
setor — e o comentário que já estava lá descrevia o defeito com todas as letras:
*"a linha de quem levou suspensão saía como '—' logo abaixo de um cabeçalho
acendendo Suspensões 1"*. Ganhou selo próprio, em `var(--warn)` para não se
confundir com o de LGPD.

### Os consumidores, percorridos

Um tipo novo em `disciplina_evento` não aparece sozinho:

- **ficha**: a lista já o pegava (não filtra por tipo), mas caía no fallback e
  imprimia **"Suspensao"**, sem acento, na ficha de uma pessoa real — o
  comentário logo acima do código alertava para exatamente isso. Agora é
  "Suspensão · atraso".
- **painel de Conduta**: linha própria, **separada** da de LGPD. "2 suspensões"
  num número só não diria de quê, e as duas levam a conversas diferentes.
- **cartão de Suspensões do setor**: passou a somar as duas naturezas — senão
  mostraria **0** num mês em que houve suspensão de verdade —, com a composição
  na nota e na lista que abre.
- **`calcular-mes.ts` / `pontuacao.ts`**: `EVENTOS` é lista FECHADA de propósito,
  então o tipo entrou nos três lugares (catálogo, conta e "mês sem ocorrência" —
  mês com suspensão não é mês limpo). E a suspensão conta como falta grave para
  quem o ponto não mede: quem levou suspensão não pode sair da tela em "—".

⚠️ `source: 'disciplina'` e não `'nexo'`, porque o import do ponto apaga
`where: { source: 'nexo' }`. Com source próprio, a suspensão sobrevive ao
reimport. A idempotência é `(source, sourceId)` com o **hash do arquivo** dentro:
reenviar a mesma planilha não duplica, e uma planilha CORRIGIDA entra como
registro novo em vez de colidir em silêncio.

⚠️ A planilha tem PII e foi **apagada do servidor** depois da carga, como o dump
do ponto.

## 2026-09-09 (fim, 6) — A área do setor ENTREGAS, e três números que mentiam antes dela

Pedido do dono: uma área para o setor Entregas (Elton e Gilberto), no espírito do
Relatório Geral da Gerência. **A tela veio por último de propósito** — três dos
números que ela ia mostrar estavam errados, e tela nova sobre número errado só
espalha o erro.

### ⚠️⚠️ 1. O diagnóstico que circulava sobre o Gilberto estava ERRADO

A dívida do `FONTES.md` dizia que o `gerencia_daily` dele parava em 24/02 "com o
espelho fresco", e a suspeita era um defeito no endpoint da Gerência — um join,
um filtro por `active`, o campo de data do recorte.

**Não é o endpoint.** Os 25 serviços dele em julho são **mutirão de backlog**: dois
lotes fechados em 17/07/2026, às 08:31 e às 10:05, com `scheduled_for` de 2022 a
2025. O corte de 180 dias os remove **de propósito**, e o comentário do próprio
endpoint já citava este caso pelo nome. Fora o mutirão, a última atividade real dele
é **24/02/2026** — e o corte aparece em TODAS as fontes: último ponto em fev/2026,
última advertência em 23/02.

⚠️⚠️ O que ficou provado é pior, e é geral: **nenhum sistema da casa registra
afastamento.** O Nexus só tem `active`/`inactive`, e ele está **ativo**. O painel não
tem como distinguir "afastado" de "parou de trabalhar".

**Decisão do dono:** a tela diz *"sem registro desde 24/02"* com a data e o quanto
faz, nunca zero — e diz também que o espelho está em dia, para que a lacuna não seja
confundida com sync parado. O estado de afastamento no Nexus fica como decisão aberta.

### ⚠️⚠️ 2. O KM do espelho estava 813 VEZES maior que o real

| km do Elton em agosto/2026 | |
|---|---|
| espelho do TalentCare | **1.028.354** |
| origem (Gerência) | **1.265** |

O app leu o odômetro errado em 07/08 (882.601 km num dia), o Legal corrigiu na
Gerência em 10/08 — e a correção **nunca voltou**. O endpoint recorta pelo **DIA DO
EVENTO**, não por quando o registro mudou, e o dia 07/08 já tinha saído da janela do
cron incremental.

Comparando espelho × fonte na base inteira: **212 dias divergentes** em 4.609. Os
outros 198 eram `viagens` — métrica acrescentada ao endpoint **depois** do backfill:
o histórico inteiro nasceu zerado, nenhuma viagem em 25 anos de base. *Métrica nova
numa fonte incremental nasce vazia no passado, e zero é um valor plausível.*

✅ `run-gerencia-sync.mjs` ganhou **`--completo`** (ignora o watermark, reconcilia
tudo: 4.610 linhas em ~16 s), rodou em produção e o diff voltou a **0 divergências**.
Cron novo às **03:10**, ao lado do incremental de :30.

⚠️ **As outras nove fontes com cron têm o mesmo formato de recorte e ninguém mediu se
elas divergem.** Vale rodar o mesmo diff em cada uma — está no `FONTES.md`.

### ⚠️⚠️ 3. A jornada tinha DUAS verdades, e o TalentCare mostrava a pior

| jornada do Elton, agosto/2026 | |
|---|---|
| régua do espelho (`ended_at − started_at`) | **577,2 h** |
| régua do Relatório Geral da Gerência | **176,4 h** |

O `ended_at` também recebe o **fecho tardio**: o 17/08 do Elton "começou" em 18/08
10:16 e "terminou" em 01/09 19:43 — **344 horas num dia**, com zero saída e zero
serviço. O `reports.ts` da Gerência já resolvia isso (saída do ponto → fim da última
saída → `ended_at`, com teto de 16 h); o `talent-daily` nunca aplicou a mesma conta.
Eram duas verdades sobre quantas horas o mesmo homem trabalhou, e a que o dono usa de
referência era a outra.

✅ **Decisão do dono: alinhar o endpoint à régua do relatório.** Feito no `.72`, com o
comentário que amarra as duas cópias uma à outra. Única diferença deliberada: um
`GREATEST(0, …)` de fora, porque o relatório soma o mês e aqui a linha é diária —
"trabalhou −71 min" é um número impossível na tela (um dia em toda a base).

### E a métrica nova que a tela exigiu: `jornada_teto_min`

Alinhar não bastava. **A saída também tem fecho tardio** — o 31/07 do Elton
"terminou" em 03/08, depois do fim de semana —, e aí a régua do relatório cai no teto
de 16 h. Em agosto são **59,2 h das 176,3 h: 34% da jornada é teto, não medição.**

Um número com um terço de teto, exibido inteiro, é jornada cheia aos olhos de quem
lê. O endpoint passou a devolver `jornadaTetoMin` como métrica **separada** (quem
quiser a jornada crua ignora a linha), o espelho ganhou a coluna, e o cartão da tela
escreve a fração: *"⚠ 59,2 h (34%) são o teto de 16 h — dias em que ninguém encerrou
a saída"*.

### A tela: `/entregas`

Rota própria (decisão do dono), com o caminho pelo botão **"Área da mensageria"** na
linha do nome do relatório do setor — o mesmo padrão do botão da planilha, e pelo
mesmo motivo: item de menu ficaria aceso para os 16 setores e levaria 15 deles a uma
tela que não é sobre eles.

O que ela mostra, tudo do espelho e tudo obedecendo ao filtro: serviços concluídos
(com a média por saída), km, saídas, viagens, jornada (com a fração de teto),
mensageiros com registro, a linha de cada pessoa, **conclusões por dia** com o eixo
no intervalo inteiro (dia parado e fim de semana contam), e a demanda de escritório.

⚠️ A régua de acesso é a mesma do relatório de setor (`quemEh` + vínculo gravado):
Entregas é chefiada pelo **Legal**, então quem manda é o vínculo, não o setor em que
a pessoa senta.

⚠️ **`—` nunca é zero.** Quem tem história na fonte e parou antes da janela recebe
`—` e a data; quem teve dia medido sem resultado recebe `0`. O rodapé da lista diz a
diferença, porque a distinção só funciona se quem lê souber que ela existe.

### O agente crítico achou seis defeitos, e um deles quebrava a tela inteira

Rodado com o briefing do `AGENTE-CRITICO.md` e mandado ao banco — ele conferiu contra
o `.78` **e** contra a origem no `.72`. O que voltou:

⚠️⚠️ **"Ano corrente" apagava a parada do Gilberto — justamente no filtro que a chefia
abre para comparar os dois.** A bandeira era `ultimoDia < fromDay`, e o último dia
dele (24/02/2026) cai DENTRO de "Ano corrente": o cartão de aviso não aparecia, a
linha imprimia 153 serviços ao lado dos 1.183 do Elton, e o cabeçalho dizia **"2 de 2
pessoas tiveram registro"**. A régua olhava a JANELA quando tinha de olhar a FONTE —
quem está escuro está escuro em todo filtro. Hoje a lacuna é entre o último dia da
pessoa e o último dia que a fonte tem (`fonteAte`), e o corte de 30 dias está ancorado
na unidade de decisão do sistema, que é o mês. **O defeito era exatamente o que o
bloco de comentário da tela dizia existir para impedir.**

⚠️⚠️ **Jornada e Saídas afirmavam "0 medido" sobre junho/2026**, para um homem que
rodou 12 dias e concluiu 156 serviços. Km escapava por ter a ressalva; os outros dois
não tinham nenhuma. A regra do `null` outra vez, com a fonte no lugar da pessoa: o
zero falava de uma coluna que ainda não existia. Agora o componente `Kpi` aceita
`null` e imprime "—" — **a regra virou do componente, não de cada chamada**, para que
um cartão novo não repita o esquecimento.

⚠️⚠️ **"por saída" cruzava duas janelas de cobertura.** No preset "Ano" o numerador
conta 1.336 serviços de jan a set e o denominador conta 48 saídas de 55 dias: a tela
dizia **27,8 por saída** onde o medido é **7,5**. É o "59 cursos" com outra roupa.

⚠️⚠️ **A pontuação contradizia a tela irmã.** Com "30 dias",
`/departamentos/<Entregas>` dizia **ago/2026, Elton 870** e `/entregas` dizia
**set/2026, Elton "—"** — mesma pessoa, mesmo instante, mesmo filtro, dois números, e
um botão ligando uma tela à outra. Meu argumento de "não recalcular para não ter duas
contas" estava **invertido**: `montar()` **é** a régua única; chamá-la é o caminho de
uma régua só, e não chamá-la foi o que produziu a divergência. A competência passou a
sair do filtro pela mesma linha do `dept-metrics`.

Também entraram: a régua de acesso perdeu a cláusula `departmentId === Entregas` (que
`lib/alcance.ts` recusa com todas as letras — *"o setor DELE não entra por ser dele"*);
o número grande da Jornada passou a ser o **medido**, com o teto ao lado; os literais
(27.488 / 8 / 2) ficaram **datados**, porque literal sem data envelhece calado; e o
teto de 400 dias do gráfico parou de cortar em silêncio.

### A rodada 2 do crítico: o conserto do "Ano corrente" tinha invertido o defeito

⚠️⚠️ **A régua nova acertou o detector e errou o alvo.** A bandeira passou a olhar a
fonte (certo), mas a tela aplicou a bandeira ao **valor**: `mudo = p.fontePara` pintava
`— — — —` nas quatro células do Gilberto em "Ano corrente" — apagando os **153
serviços que ele de fato fez em 2026**. A linha se contradizia sozinha ("14 dias com
registro" seguido de quatro traços), o KPI somava **1.337** e a lista mostrava
**1.184**, e a diferença não aparecia em lugar nenhum.

São **duas perguntas**, e cada uma tem o seu lugar:

| pergunta | responde | onde aparece |
|---|---|---|
| "tem número nesta janela?" | `diasComRegistro` | a **célula** |
| "a fonte parou de falar dela?" | `fontePara` | a **linha**, ao lado do número |

O cartão de aviso também mentia no título — dizia *"não tem registro nesta janela"*
sobre alguém com 14 dias dentro dela. Agora diz *"a fonte parou de registrar"*, que é
verdade em toda janela, e detalha quantos dias dela ele alcança.

**Mais três, todos medidos:**

- ⚠️ **"Jornada medida" mostrava o total.** Sem a coluna do teto, `jornadaMedida` é
  `null` e o cartão caía no total — com o rótulo afirmando o que o número não era
  (25% dele é teto). O rótulo voltou a ser **"Jornada"**, neutro, enquanto a coluna
  não existir. Rótulo que afirma é pior que rótulo que se cala.
- ⚠️ **O bloco "Registros no sistema" não tinha borda.** Autoria de registro só existe
  em 2026 — antes é import do Access, sem autor. Em junho a tela declarava a borda do
  app no alto e imprimia `0` em negrito três blocos abaixo. Era o `null → 0`
  sobrevivendo num cartão que a revisão não tinha visitado.
- ⚠️ **O "—" do Gilberto na pontuação dizia menos do que o sistema sabia.** Como havia
  nota gravada do Elton, `montar` não era chamada e a célula dizia "sem nota em
  ago/2026" — que se lê como *não calculamos*. A régua já tinha respondido: **"nenhuma
  fonte de crédito no mês"**. Agora `montar` roda sempre, mas só o `semNota` é
  aproveitado quando há valor gravado; a prévia continua desligada.

O crítico confirmou contra o banco o que ficou bom: a borda `appFora`/`appParcial` nos
três cartões e nas células, a média por saída (6,3 em 30 dias, e nada em Ano), a
competência única com o relatório de setor, a régua de acesso sem a terceira cláusula,
os literais datados — e que **as 61 notas de agosto dos 10 setores com `gerencia_daily`
batem exatamente**, com só a do Elton precisando da regravação.

### ⚠️⚠️ E a nota de agosto do Elton estava calculada sobre o espelho errado

Consequência do conserto do km: com o espelho reconciliado, os serviços dele em agosto
foram de **161 para 169**. Rodei o ensaio de agosto nos **10 setores** que têm
`gerencia_daily` e comparei com o gravado: **só a dele mudou** — os outros tiveram
apenas km e jornada alterados, que não entram no score. Regravado: **870 → 910**.

### ⚠️⚠️ O que o Relatório Geral tem e esta tela NÃO tem — e está escrito na tela

Sair da tela de referência sem dizer por quê faria a área parecer incompleta por
descuido. Então o bloco existe, com os números:

1. **Protocolos baixados por pessoa.** `protocols.delivered_by` é lixo do import do
   Access: dos entregues em 2026, **27.488** saíram no nome de "Sistema" e o resto
   está quase todo sem autor. **Nenhum dos dois mensageiros aparece uma vez sequer.**
2. **Taxa de conclusão em anel.** Em toda a base há **8 `pending` e 2 `in_progress`**,
   todos do mês corrente: junho, julho e agosto fecharam 100%. Anel cravado em 100%
   é enfeite, não medição.
3. **A faixa de acumulado do sistema.** No Relatório Geral ela é honesta porque avisa
   que não obedece ao filtro. Aqui teria **dois** desvios — nem período nem setor —,
   e "27.488 protocolos" ao lado do nome de duas pessoas é o defeito dos "59 cursos"
   com outro rótulo.

## 2026-09-09 (fim, 5) — O relatório de setor ganhou o sinal de Suspensões

Pedido do dono. Mesmo formato dos outros sinais do cabeçalho, com a lista que
abre — e uma diferença que é o ponto todo dele:

⚠️⚠️ **Ele NÃO é regido por `semPonto`.** Atraso e advertência viram "—" quando a
janela está fora do que o import do ponto alcançou; a medida de LGPD vem do
Nexus, não do dump do Nexo. Amarrá-la à cobertura do ponto seria a ausência de
UMA fonte apagando o dado de OUTRA — a mesma armadilha que a régua de pontuação
já tinha resolvido lá dentro (`semDisciplina` não silencia a falta grave), agora
na tela.

`dept-metrics` passou a trazer as medidas **por pessoa e por tipo**, e o total
fora do bloco de cobertura. A lista inclui quem levou advertência de LGPD sem
suspensão: mesma natureza, e o painel avisa que o cartão conta só as suspensões.

## 2026-09-09 (fim, 4) — Os sinais do relatório de setor também abrem

Mesmo tratamento dos cartões do painel, nos sinais de **Advertências** e
**Atrasos** do cabeçalho do setor: clique (ou Enter) e sai quem está atrás do
número, com os minutos somados de cada um e a barra comparativa dentro do setor.

⚠️ A lista sai de `m.pessoas`, que a rota já montou sob a régua de `alcance` —
não de uma busca nova. É a mesma decisão do painel: uma segunda origem para "os
envolvidos" seria uma segunda régua de conteúdo.

⚠️ `PainelPessoas` saiu de `dashboard/` para `app/(app)/`, e o formato de uma
linha (`PessoaDoPainel`) mora com ele. Duas cópias do mesmo painel acabariam
divergindo, e quem lê veria o mesmo cartão se comportar diferente em cada tela.

⚠️ Vale a mesma trava: o sinal só fica clicável quando **há** lista, e o "—" de
janela sem ponto continua não abrindo nada — não há lista de "quem se atrasou"
num período que ninguém mediu.

## 2026-09-09 (fim, 3) — Os cartões do painel abrem QUEM está atrás do número

Pedido do dono: *"em todos os cards que der para clicar e expor todos os
usuários envolvidos, para a pessoa ter mais detalhes à mão."*

| cartão | abre | o que lista |
|---|---|---|
| Headcount | ✅ | o **movimento** da janela: quem entrou e quem saiu, com a data |
| Advertências | ✅ | quantas cada um teve, com barra comparativa |
| Atrasos | ✅ | quantos cada um, e os **minutos somados** |
| **Suspensões** | ✅ | as medidas de LGPD, com a composição por pessoa |
| Turnover | ✕ | quem saiu já é uma TELA inteira (`/turnover`), com motivo e tempo de casa. Painel de oito linhas ao lado de um relatório completo é o caminho pior competindo com o melhor |

⚠️⚠️ **O painel não busca nada.** Recebe a lista pronta, montada só com o que a
régua de `alcance` já entregou àquela sessão. Um painel que fosse ao servidor
buscar "os envolvidos" seria uma segunda régua de conteúdo — e ela mora num
lugar só (`lib/alcance.ts`).

⚠️ Cartão só vira clicável quando **há** lista, e ganha um selo discreto no
rótulo ("3 pessoas"). Cartão que parece botão e não abre nada ensina o leitor a
não clicar em nenhum.

⚠️ A lista é lida do `vm` recém-montado, pelo rótulo — nunca de uma cópia no
estado: o filtro de período remonta os KPIs, e uma lista congelada apareceria
debaixo do título da janela nova.

### ⚠️⚠️ E a decisão de régua que o cartão de Suspensões exigia

No **Nexus** a área de LGPD é fechada (T.I e Diretoria). No TalentCare este
cartão é lido também por **gestor**, cujo `alcance` alcança o próprio time —
então abrir a lista **dá ao gestor, aqui, o que o Nexus não lhe dá**. Duas
réguas para a mesma pergunta é a falha que mais se repete nesta casa, então a
pergunta foi feita antes de construir.

E havia um lado a dizer: **isso já acontecia em parte.** Quando a falta grave
entrou (mais cedo hoje), a suspensão passou a aparecer na conta aberta da
pontuação e na lista de disciplina da ficha — o gestor do Pessoal já via a
medida da Juliana. Se a resposta fosse "não deve ver", o conserto não seria
deixar de acrescentar: seria **tirar** o que já estava lá.

**Resposta do dono: "o gestor responde pelo time".** O cartão abre, com o mesmo
`alcance` do resto. Se um dia a régua do Nexus mudar, este é o lugar a revisar
junto — está anotado no código, no ponto exato.

⚠️ A lista inclui quem levou **advertência** de LGPD sem suspensão: é medida da
mesma natureza, e deixá-la de fora esconderia gente envolvida numa lista que se
propõe a mostrar os envolvidos. O `valor` de cada linha é o total de medidas, o
`detalhe` diz a composição, e o rodapé do painel avisa que o cartão conta só as
suspensões.

## 2026-09-09 (fim, 2) — A advertência passou a obedecer ao filtro, e o Score médio deu lugar às Suspensões

Pedido do dono: *"as advertências não estão se adaptando ao período de pesquisa;
troque o campo de score médio para suspensões."*

### Advertências: o último número da fileira que não obedecia

O cartão mostrava **820** em "Últimos 30 dias" e **820** em "1 a 9 de setembro",
com o rótulo do período em cima. A ressalva *"acumulado — não filtra por
período"* existia e estava correta — mas um número que não responde à pergunta
ao lado dele está respondendo outra, e é a regra (b) da casa, a mesma que custou
os "59 cursos" do TI.

O dado por período já existia (`/api/assiduidade-metrics` devolve
`advertencias` por pessoa na janela desde 03/09); o cartão é que somava
`e.advertencias`, o acumulado de toda a história.

⚠️ **A sparkline saiu junto.** Ela desenhava `serieAdvertenciasAcumulada` —
advertências acumuladas mês a mês, uma curva que só sobe — e o número agora vai e
volta com o filtro. Curva que sempre sobe embaixo de um número que anda é o
gráfico dizendo uma coisa e o número outra, no mesmo cartão de 64 pixels. Fica
sem sparkline até existir a série certa (por bucket da janela, como a de
atrasos). A função morreu junto; a dívida saiu do `PERIODO-E-DEPLOY.md`.

⚠️ E vale a mesma trava dos atrasos: **"—" quando a janela não foi medida**. Sem
cobertura de ponto, zero advertência se lê como "ninguém foi advertido".

### Suspensões no lugar do Score médio

Vêm do Controle da LGPD: medida **assinada** por vazamento de dado pessoal — não
a advertência derivada do 2º atraso que está no cartão ao lado. É o número mais
grave da fileira e o que menos aparecia.

- **`null` → "—" quando a leitura falha, nunca 0.** Zero suspensões é a melhor
  notícia do painel, e uma queda de rede não pode produzi-la.
- **A nota carrega as advertências de LGPD** quando existem na janela: elas não
  cabem no cartão de "Advertências" (aquele conta a derivada do atraso, outra
  natureza) e sumiriam da tela inteira sem isso.
- **Sem sparkline**: são poucos eventos e esparsos — 5 em 2026 na casa toda. Uma
  curva sobre isso desenha ruído com cara de tendência.
- ⚠️ A contagem viaja como **total do alcance**, não por pessoa: a lista nominal
  de quem levou suspensão por vazamento é a coisa mais sensível do painel, e
  quem precisa do nome abre a ficha, que confere `podeVer`.

## 2026-09-09 (fim) — A tabela de pesos entrou, e agosto foi gravado nos 16 setores

Decisão do dono: aplicar a tabela proporcional. Recalculei antes de aplicar —
ela fora medida com o sub-encarregado fora da nota, e ele voltou —, e ela se
confirmou: Legal segue em **−50** (mediana 700), Pessoal foi de −32 para **−35**
(a Joice e a Juliana de volta), o resto igual.

⚠️ **A aplicação saiu da MESMA conta que a proposta** (`propor-pesos.ts` ganhou
`--gravar`). Um segundo script "que aplica a tabela aprovada" divergiria do que a
propôs no dia em que um dos dois mudasse — e o que está em jogo é o peso do
atraso na nota de aumento de 95 pessoas.

⚠️ **Os pesos da LGPD entram junto**, derivados do mesmo atraso (3× advertência,
6× suspensão). Mexer no atraso e deixar a falta grave para trás daria, no
Contábil, atraso −5 ao lado de suspensão −300: a mesma escala em dois mundos.

| setor | atraso | advert. | mês limpo | LGPD adv/susp |
|---|---|---|---|---|
| Entregas | −62 | −93 | +124 | −186 / −372 |
| Legal · TI | −50 | −75 | +100 | −150 / −300 |
| Pessoal | −35 | −53 | +70 | −105 / −210 |
| Recepção | −30 | −45 | +60 | −90 / −180 |
| Financeiro | −26 | −39 | +52 | −78 / −156 |
| Fiscal | −15 | −23 | +30 | −45 / −90 |
| Contábil | −5 | −8 | +10 | −15 / −30 |
| Consultoria | −4 | −6 | +8 | −12 / −24 |
| Imóveis | −1 | −2 | +2 | −3 / −6 |

### O resultado, contra o que teria sido

| | replicando o Legal | com a tabela |
|---|---|---|
| notas gravadas | 95 | **61** |
| **negativas** | **32 (34%)** | **7** |
| zeros | 12 (8 da Diretoria) | **0** |

Os zeros não viraram números: viraram **"—" com o motivo**. Seis setores não têm
ninguém pontuado em agosto — Cozinha, Diretoria, Limpeza, Marketing, Pousada e
Programação — porque ali todo mundo é chefia ou não passa por sistema nenhum.

⚠️ **Esses seis seguem com os pesos copiados do Legal**, e isso é uma pendência
visível, não silêncio: o script a imprime ao fim. No dia em que alguém do
Marketing tiver atividade, a nota sai na escala do Legal sem ninguém ter
decidido isso. Rode `propor-pesos.ts` de novo quando isso acontecer.

### Legal regravado: 8 → 7

O **Evandro** (Gestor) saiu — `gravarMes` apaga o que já estava gravado de quem
passou a não receber nota, senão a regra nova só valeria para o futuro. A
**Joice** (Sub) ficou, com 756, pela correção do dono de hoje.

### ⚠️ E dois erros meus, os dois em voz alta

- `propor-pesos 2026-08 --gravar` lia **`--gravar` como o id do setor modelo** e
  morria em "Setor modelo sem régua". Falhou em voz alta por sorte: se o modelo
  tivesse caído num default plausível, a tabela inteira teria sido gravada a
  partir da régua errada. As flags passaram a sair antes dos posicionais.
- E rodei o script gravando com a saída em `| head -8`: o **SIGPIPE matou o
  processo depois do primeiro setor**, e só a Consultoria foi gravada. É a
  lição já registrada na casa — `head` num script que escreve mata no meio. O
  `upsert` salvou (rodar de novo completou), mas o conserto é não cortar a saída
  de quem escreve.

## 2026-09-09 — A LGPD entrega as faltas graves, e elas descontam de verdade

Pedido do dono: *"o LGPD tem histórico de advertência e suspensões referente
vazamento de dados; o sistema tem que entregar ao TalentCare automaticamente os
próximos que forem cadastrados, e o TalentCare tem que computar como faltas
graves e tirar mais pontos."*

### Dois canais, porque um só não basta

Pelo §13 do contrato de integração da casa:

- **Push** — `systems.lgpd_push_url`. O Nexus dispara no instante em que a
  medida é registrada em `/lgpd`. Fire-and-forget: o registro da suspensão nunca
  falha porque um espelho de RH está fora.
- **Pull** — `GET /api/integrations/lgpd-medidas?since=`, e o
  `run-lgpd-sync.mjs` de hora em hora (:40). **Push que falha, falha calado**, e
  a lição dos oito espelhos vale aqui inteira.

⚠️⚠️ **O sync NÃO reimplementa a gravação.** Ele passa cada medida pelo MESMO
receptor que o push usa (`/api/integrations/nexus-lgpd` → `lib/lgpd.ts`). Dois
caminhos de escrita concordam até o dia em que um muda — e o que se grava aqui é
falta grave na ficha de gente.

### ⚠️⚠️ O canal é FECHADO POR PADRÃO

`systems.lgpd_feed` nasce `false`, ao contrário do `password_mirror`, e a
diferença é deliberada: senha espelhada é infraestrutura (quem deixasse de
recebê-la quebraria no dia em que o Nexus caísse); medida disciplinar é o dado
mais sensível que o diretório encosta — diz que uma pessoa com nome foi suspensa
por vazar dado pessoal. A régua vale nas **duas** portas: a URL de push sozinha
não autoriza nada. Conferido: a chave do CIDE recebe **403**.

### O que atravessa, e o que fica

Só medida **punitiva** (advertência e suspensão) e só a que tem **vínculo** com o
diretório. Do acervo de 64, **29 têm vínculo e 35 não** — são ex-funcionárias que
o import do GPI trouxe e que guardam apenas o nome. Mandar o nome convidaria o
outro lado a casar por texto, que é como o import do ponto casou *"Wendel
Ribeiro da Silva"* com *"Edileuza da Silva"*. Elas saem como **contagem**
(`semVinculo`), e o log do sync a repete: quem consome precisa saber que existem
sem saber quem são.

⚠️ `since` filtra por `updated_at`, não por `occurred_at`: medida antiga
**corrigida** hoje tem de chegar ao espelho, e nunca chegaria por um filtro na
data do fato.

### No TalentCare: `source='lgpd'` e `tipo` próprio

⚠️⚠️ **`source = 'lgpd'` não é detalhe.** O import do ponto é wipe+rebuild e
apaga `disciplina_evento WHERE source = 'nexo'`. Com qualquer outro `source` a
medida sumiria na próxima carga do dump — sem erro nenhum.

⚠️⚠️ **E o `tipo` é próprio** (`lgpd_advertencia` / `lgpd_suspensao`), não
`advertencia`. A advertência que já existia na tabela é **derivada** do 2º atraso
do mês e vale −75; uma advertência por vazamento é **assinada**, é outra
natureza. Dividindo o mesmo `tipo`, a falta grave entraria pelo peso do atraso —
e a assiduidade (`100 − atrasos·2 − advertências·5`), que mede **presença**,
passaria a descontar por vazamento de dado.

### As três coisas que separam a falta grave do atraso

1. **Conta mesmo para quem o ponto não mede.** `semDisciplina` existe porque
   atraso e advertência vêm do dump do Nexo, que não cobre todo mundo. A medida
   de LGPD não vem de lá — ignorá-la ali seria a ausência de UMA fonte apagando
   o dado de OUTRA.
2. **Derruba o bônus de mês sem ocorrência.** Mês com suspensão por vazamento
   não é mês limpo, por definição.
3. **Tira a pessoa de `sem-credito`.** Sem isso, a suspensão desapareceria em
   "—" justamente de quem não passa por sistema nenhum.

### ⚠️⚠️ E a fonte nova quase reintroduziu a ausência-que-elogia

A regra do `FONTES.md` — *"integrar a fonte NÃO basta, percorra TODOS os
consumidores"* — cobrou o preço na hora. `disciplina_evento` tem seis
consumidores; quatro filtram `tipo = 'advertencia'` e passaram ilesos. **Dois
liam a tabela inteira:**

- **`lib/ponto-cobertura.ts`** — é quem responde *"até quando o PONTO mediu"*, e
  lia `min/max` de tudo. Com as medidas de LGPD dentro, `primeiroDia` ia de
  **2025-10-01** para **2022-02-23**. O efeito não é cosmético: `montar` recusa
  um mês quando `de < primeiroDia`, então um mês de 2023 — **sem uma linha de
  ponto** — passaria a ser tratado como mês MEDIDO, e todo mundo levaria o bônus
  de "mês sem ocorrência". A ausência elogiando, entrando pela porta de uma
  fonte nova.
- **`app/api/frescor/route.ts`** — uma medida de LGPD registrada hoje faria o
  dump do ponto (import à mão, que pode estar semanas atrás) parecer fresco.
  *"Watermark recente não prova frescor"* — aqui seria o watermark de outra
  fonte.

Os dois passaram a filtrar por **`source: 'nexo'`**, não por tipo: um tipo novo
de medida quebraria a lista de tipos outra vez, e em silêncio.

### O efeito, medido

29 medidas gravadas, 0 recusadas. As de 2026 são todas do **Pessoal**, e a mais
recente é de **04/09**. Setembro parcial, com os pesos semeados (advertência
LGPD = 3× o atraso do setor, suspensão = 6× — no Legal, −150 e −300):

| pessoa | conta |
|---|---|
| Tauana Moura | 180 |
| Yasmim Russo | 128 |
| **Juliana Fiel** | **−202** — Suspensões por vazamento (LGPD) **−300** · Atividades +98 |

⚠️ A Juliana é **Sub-encarregada**, e isto só funciona porque no mesmo dia o dono
corrigiu a régua de chefia: **sub-encarregado voltou a ser medido**; só
encarregado, diretor e administrador ficam fora da nota. Na versão anterior, a
suspensão dela por vazamento de dados descontaria **zero**.

⚠️ E um defeito meu, achado na conferência: o motivo saía repetido (*"1ª
Suspensão por vazamento de dados (LGPD) — 1ª Suspensão LGPD"*). A comparação
montava o padrão com `a` e o título traz **`ª` (U+00AA)**, que não decompõe em
`a` ao tirar acento — os dois nunca casavam. Passou a comparar por palavra.

## 2026-09-08 (fim, 3) — O mês corrente pontua ao vivo, e o CIDE contava trilha de auditoria

### A pergunta do dono

*"Verifique no Legal, porque nenhuma pontuação está sendo aplicada, uma vez que
todos os sistemas do Nexus já têm serviços realizados."* — e ele tinha razão: a
coluna "Pontuação do mês" lia **"— sem pontuação no mês"** para as 8 pessoas do
Legal enquanto elas já tinham atividade registrada naquele mesmo dia.

Não era defeito da régua: `pontuacao_mes` só ganha linha quando o mês FECHA e
alguém roda a competência. `montar` recusava setembro com *"2026-09 ainda não
fechou"*. O que faltava é o que o dono apontou: **a atividade dos sistemas do
Nexus é apontada ao vivo; a planilha de serviços do Legal sobe no fim do mês.**

### O mês PARCIAL, com três travas

`montar(dept, comp, { parcial: true })` — a MESMA lib, nunca uma segunda régua.

1. **Não grava.** `gravarMes` nunca pede parcial. Um parcial gravado viraria, no
   mês seguinte, um mês fechado baixo, e ninguém saberia que faltava metade.
2. **Sem o bônus de mês limpo.** No dia 8 não se afirma que o mês foi impecável.
   O tamanho disso, medido: 4 das 8 linhas de agosto carregam `+100`, e esses
   100 sozinhos são **maiores que a pontuação parcial inteira de 5 das 8
   pessoas** (80, 35, 20, 20, 2).
3. **Duas janelas, porque elas não coincidem.** Atividade e serviço somam até
   hoje; a disciplina para onde o **ponto** foi importado (import à mão, sem
   cron). Usar a janela da atividade faria o atraso ainda não importado ler como
   "não houve atraso".

Setembro do Legal até 08/09: Lucas 258, Joice 194, Yago 137, Gabriel 80,
Marcia 35, Evandro 20, Ezequiel 20, Marcos 2.

## 2026-09-08 (fim, 4) — Rodar os outros setores mostrou que o peso do Legal não é da casa

Pedido do dono: *"rode a pontuação nos outros setores."* Nenhum dos 15 tinha
régua — e sem régua o `montar` recusa a competência inteira, que é por que a
lista deles dizia "sem pontuação no mês". Entrou
`scripts/replicar-regua.ts`, que copia do Legal a metade disciplinar e os pesos
de atividade (não o catálogo de serviços, que nasce da planilha de cada setor).

### ⚠️⚠️ E o ENSAIO desmentiu a premissa da replicação

Rodando agosto nos 16 setores, **sem gravar**:

| | |
|---|---|
| Pessoas com nota **negativa** | **32 de 95 (34%)** |
| Pessoas com nota **zero** | **12**, incluindo **8 dos 9 da Diretoria** |
| Pessoas sem nenhum lado de crédito | 13 |

Bárbara Rocha **−550**, Douglas Soares −547, Kaique −542. No **Contábil, 9 das
18**; no **Fiscal, 7 de 21**.

Eu tinha copiado os pesos chamando-os de "regra da casa". A **regra** é da casa
(advertência a partir do 2º atraso, em qualquer setor). O **peso** não é: −50
por atraso é **7% da nota** de quem soma 700 pontos de crédito e é a **nota
inteira** de quem soma 150. Eles foram calibrados contra o volume do Legal, e
fora dele a assiduidade vira a única coisa que o número mede — com o sinal
trocado.

### A metade simétrica do `null`, que faltava

A régua já se recusava a dar o bônus de mês limpo a quem o PONTO não mede (a
ausência que elogia). Faltava o outro lado: **quem sistema nenhum mede não
recebe nota**, e sim "—" com o motivo. Entra `LinhaCalculo.semNota`:

- `sem-credito` — nenhuma atividade e nenhum serviço no mês. Não há de onde sair
  nota; o que sobraria seria assiduidade com outro nome.
- `chefia` — gestor, sub-encarregado, diretor, administrador (decisão do dono).
  A pontuação mede EXECUÇÃO, e chefia não é avaliada por volume de execução nem
  ranqueada contra a própria equipe.

⚠️ O motivo da chefia é a **função**, não a falta de fonte: a Joice (sub do
Legal) tem 242 atividades e 8 serviços em agosto. Dizer "não passa por sistema
espelhado" sobre ela seria falso na tela.

⚠️⚠️ `gravarMes` **apaga** o que já estiver gravado de quem passou a não receber
nota. Sem isso a regra nova só valeria para o futuro e os zeros e negativos da
rodada anterior ficariam no banco — invisíveis e citáveis.

### ClassRoom: consumir e PRODUZIR conteúdo viraram duas listas

Pedido do dono: *"no ClassRoom, preciso dar pontos diferentes para quem assiste e
para quem criar conteúdo."*

⚠️ Na **régua** isso já existia — `cls_video` (assistir) **1 ponto**,
`cls_curso` (concluir) **2**, `cls_criado` (criar) **6**, pelas durações
12/20/60 min. Quem somava os dois era o **cartão**: a lista se chamava *"quem
mais concluiu E CRIOU curso"* e usava `courses + created`.

E isso apaga justamente o produtor: **quem cria, cria pouco** — o setor da
imagem tinha **1 curso criado contra 5 concluídos**, então o criador entra na
mesma barra que quem consome e some no fim da lista. São trabalhos de natureza
diferente, e a régua já dizia isso; a tela é que não.

`CardFonte` ganhou `ranking2`/`unidade2`: um segundo bloco, com barra própria
(⚠️ o `max` é por lista — dividir a barra de quem cria pelo topo de quem assiste
faria o criador parecer irrelevante justamente por criar menos). O ClassRoom
passa a mostrar **"quem mais concluiu curso e assistiu vídeo"** e **"quem mais
criou curso"**. A segunda lista só aparece onde alguém cria: setor sem criação
não ganha bloco vazio dizendo que ninguém criou — isso já está no zero de "No
setor".

### A régua calibrada e AGOSTO REGRAVADO

O dono ajustou na tela (com autor e data gravados): **WhatsApp 48 → 30 min**
(5 → 3 pontos) e **CIDE 15 → 30 min** (2 → 3), porque a unidade deixou de ser
uma linha da trilha e passou a ser uma empresa atendida — que leva mais tempo.
`ger_servico` ficou gravado em 46, o valor que já vinha da mediana medida.

Agosto/2026 do Legal, regravado (backup do valor anterior em
`~/backups-pontuacao/` antes de escrever):

| pessoa | antes | agora |
|---|---|---|
| Lucas Souza | 2.061 | **1.319** |
| Ezequiel Castro | 1.251 | **1.136** |
| Marcia Borges | 898 | 816 |
| Joice Rocha | **1.991** | **756** |
| Gabriel Santana | 773 | 448 |
| Yago Santos | 1.093 | 400 |
| Marcos Gabriel | 454 | 198 |
| Evandro Padilha | −26 | −34 |

**O teste de sanidade passou**: ninguém mais recebe crédito por mais horas do que
o mês tem. Lucas 162 h (92% de ~176), Yago 105 h, Joice 89 h — contra 251 h,
187 h e 236 h antes desta sessão.

### A tela do mês corrente ficou LIMPA (decisão do dono, depois de ver as duas)

O dono viu a versão com a ressalva longa e a faixa de aviso e pediu o contrário:
*"no atual, não precisa entrar esse monte de ressalva, só mostre a pontuação até
o momento, com o gráfico igual dos demais meses."* A faixa saiu, a barra e a
ordenação voltaram, e o que o número é ficou dito em **uma linha**, no
sub-rótulo — *"pontuação parcial de setembro de 2026 (até 08/09)"* —, ao lado de
"nota de setembro". A conta aberta continua no `title` da linha.

⚠️ A ressalva medida abaixo **continua verdadeira** e fica registrada aqui: no
parcial falta a metade dos serviços, ela não é distribuída por igual, e quem
executa serviço aparece mais embaixo enquanto a planilha não sobe. O dono
conhece o efeito e preferiu a tela limpa.

### E a linha de 20/09 era 20/08

Confirmado pelo dono. Corrigida: `assiduidade_daily` da Tabata Vieira (1 atraso
de 2 min) foi de `2026-09-20` para `2026-08-20`. Conferido antes de escrever —
não havia linha no destino e nenhuma advertência derivada dependia dela (é o
único atraso dela nos dois meses, e a regra da casa só aplica advertência a
partir do 2º). Depois: **último dia do ponto = 08/09** e **zero** linhas com data
futura.

### ⚠️⚠️ O que o agente crítico pegou: a distorção era entre PESSOAS, não entre meses

Meu aviso dizia "não comparável com um mês fechado". Mas a tela **não compara
meses** — ela diz "8 pessoas comparadas entre si", ordena por pontuação e desenha
barra relativa a quem mais pontuou. O parcial retira **uma metade inteira** (os
serviços), e essa metade **não é distribuída por igual**:

| | quanto do agosto veio de serviço | agosto | setembro parcial |
|---|---|---|---|
| Marcos Gabriel | **70%** | 7º | 8º |
| Marcia Borges | **66%** | 5º | 5º |
| **Ezequiel Castro** | **58%** | **3º (1251)** | **7º de 8 (20)** |
| Lucas Souza | 12% | 1º | 1º |

O Ezequiel, dos **105 serviços em agosto**, aparecia em 7º com barra de 8% da do
primeiro — por falta de fonte, não por produção. **A barra caiu** enquanto a
metade de serviço não existe para ninguém (o número fica; o desenho que afirma
"este vale um oitavo daquele" sai), quem executa serviço ganhou um marcador na
linha, e o aviso diz isso com todas as letras.

E mais quatro, todas consertadas:

- **O parcial não tinha conta aberta em lugar nenhum.** `montar` calcula
  `detalhe` por pessoa e a rota jogava fora — o único número do painel que
  decide aumento sem como conferir. Agora vai no `title` da linha, e
  `/api/servicos/pontuacao` aceita `?parcial=1` (sem ele, uma tela mostrava o
  número e a outra respondia 422 *"o mês ainda não fechou"* sobre ele).
- **Ele sumia sozinho no dia 1º.** Em 30/09 o gestor via o ranking de setembro;
  em 01/10 as 8 voltavam a "—" até alguém rodar a régua à mão. Mês fechado sem
  valor gravado passa a mostrar **prévia** (calculada, não gravada).
- **Um único registro desligava tudo em silêncio.** A trava era
  `pontosMesRows.length === 0`, e um upload no meio do mês grava `informado`
  para toda competência do arquivo. Agora **falha em voz alta**: "N de M pessoas
  têm valor gravado — a prévia das demais fica desligada".
- **A cobertura do ponto podia ser empurrada para o futuro por UMA linha.**
  `ultimoDia` era o `max` das ocorrências, e havia uma linha de
  `assiduidade_daily` datada de **20/09/2026** (1 atraso de 2 min, de quem não
  tem outra linha no período). Ela sozinha fazia o sistema afirmar cobertura 12
  dias adiante — e dia sem linha numa janela "medida" é **zero ocorrência**, ou
  seja, a ausência-que-elogia. `coberturaDoPonto` agora **trava em hoje**.

### ⚠️⚠️ E o levantamento que a pergunta seguinte abriu: o CIDE não conta trabalho

*"O Lucas tem no máximo 3 meses de empresa, o resultado está certo?"* — Lucas
Souza entrou em **14/07/2026** e era o 1º do Legal em agosto, com 2.061.

O volume é real (**209 atendimentos de WhatsApp finalizados**, o maior do setor;
só existe um "Lucas Souza" na base, então não é o casamento por nome). Mas a
conta aberta mostrou outra coisa: somando `quantidade × a média de minutos que a
régua usa`, a régua afirma que o **Lucas trabalhou 251 h** e a **Joice 236 h**
num mês de ~176 h — **antes** dos serviços da planilha.

A causa está na fonte. `cide_daily.atividades` espelha `cg.alteracoes`, que é a
**trilha de auditoria** do CIDE: salvar o cadastro de UMA empresa grava uma linha
por campo mexido. Agosto/2026, casa toda:

| origem | linhas |
|---|---|
| `MANUAL` (registrada por alguém) | **41** |
| `SISTEMA` (gerada ao salvar) | **1.920 (98%)** |

Conferido no relógio: as 172 linhas da Joice em 20/08 saem em rajadas de 7–9 por
minuto, **sempre na mesma empresa** — é uma pessoa editando um cadastro, não uma
importação. O trabalho é real; a **unidade** é que está errada. A 15 min por
linha, aquele dia virava **43 horas**.

⚠️⚠️ **E a inflação NÃO é uniforme**, que é o que torna isso injusto e não só
grande: 700 linhas em **73** empresas-dia (9,6×) contra 330 em **112** (2,9×).
Quem mais ganha com a contagem de hoje é justamente quem assumiria o 1º lugar se
o WhatsApp fosse cortado.

**Decisão do dono: trocar a unidade.** O CIDE
(`/api/integrations/atividade-daily`) passa a entregar também `empresas`
(distintas tocadas no dia — a unidade de trabalho) e `manuais`, mantendo
`atividades` para não quebrar quem lê. `cide_daily` ganhou as duas colunas,
**anuláveis**: `null` = espelho anterior a hoje, e `null` não é zero —
`run-cide-sync.mjs --tudo` repuxa a história inteira.

### A troca foi feita — backfill e antes/depois medidos

`run-cide-sync.mjs --tudo`: **268 linhas, zero com `empresas` nulo**, de
02/04/2026 a 08/09/2026. Casa toda: **5.306 linhas de trilha → 1.214 empresas**.

Agosto/2026, por setor:

| setor | linhas (antes) | empresas (agora) | inflação |
|---|---|---|---|
| **Legal** | 1.634 | **332** | **4,9×** |
| Pessoal | 303 | 291 | **1,0×** |
| Recepção | 19 | 8 | 2,4× |
| Contabil · Fiscal · TI | 5 | 4 | — |

⚠️ **O Pessoal não é afetado** (1,0×): lá o padrão de uso é uma linha por
empresa. Quem a contagem antiga inflava era o Legal — e dentro dele, de forma
desigual (700 linhas em 73 empresas-dia contra 330 em 112).

Trocaram **juntos**, porque a régra de `atividades.ts` e o `activityOf()` não
podem divergir: `lib/data/source.ts` (o acumulado, e com ele o score e o
ranking), `/api/score-metrics`, `/api/dept-metrics` (KPI, série mensal e rank),
`/api/employee-metrics`, `/api/cide-metrics` e a régua de atividades. Os rótulos
na tela deixaram de dizer "alterações" e dizem **"empresas atendidas"**.

### O texto anterior desta seção, para registro

⚠️ **A troca dos consumidores ficou de fora do primeiro deploy, de propósito.** Trocar
antes do backfill leria `null` como zero e apagaria o CIDE de todo mundo — o
`_sum` do Prisma ignora nulos em silêncio. Ela entra depois, de uma vez (a régua
e `activityOf()` têm de virar juntas, ou o score e a "atividade" da lista
divergem), com o antes/depois medido.

⚠️ **A média de 15 min terá de ser redecidida**: era o tempo de uma linha da
trilha, e a unidade agora é a empresa atendida.

## 2026-09-08 (fim, 2) — Atividade vira MINUTOS × FATOR, como os serviços

Pedido do dono: classificar as atividades por duração, "a mesma multiplicação de
pontos que fez nas tarefas". A régua de atividades ganhou o campo **média de
minutos**, e os pontos passam a ser `média × fator` — a mesma moeda dos
serviços. Um chamado de 48 min e um serviço de 3h deixam de pesar igual.

⚠️⚠️ O SISTEMA MEDE O TEMPO DE 3 DAS 18 ATIVIDADES, e a média nasce da MEDIANA,
não da média — o tempo decorrido infla a média (WhatsApp: mediana 48 min, média
913, por atendimentos deixados abertos por dias; HelpDesk 183 vs 1.454; Chat 177
vs 617). É a lição do catálogo de serviços. As 15 sem tempo o gestor informa, e
até lá valem o piso de 1 (o que já valiam na contagem crua).

A conta mora em `lib/servicos/catalogo-atividades.ts` — fonte única da tela e do
cálculo, como o catálogo de serviços. `pontuacao_atividade` ganhou `media_minutos`.

⚠️ E UM BUG QUE EU MESMO INTRODUZI: o WhatsApp casa por nome, e eu passei os
nomes NORMALIZADOS (minúsculo) no `WHERE` da query — o banco guarda a caixa
original, então não casava nada e a atividade de WhatsApp entrava ZERADA no
cálculo. Corrigido: puxa os atendentes da janela e casa por `normNome` em JS,
como o `dept-metrics` faz. Agosto do Legal com o conserto: Lucas (209
atendimentos) 1728, Joice 1214, Ezequiel 1212.

O agosto GRAVADO ainda é o da rodada anterior (atividade crua a 1). Regravar com
os pesos novos é re-executar o script/tela quando o gestor definir as médias das
atividades sem tempo (CIDE, ClassRoom, Consultoria, protocolos da Gerência…).

## 2026-09-08 (madrugada, 5) — A 3ª metade: as atividades dos sistemas entram na nota

Pedido do dono: a pontuação do mês passa a somar TRÊS metades — disciplina +
serviços da planilha + **atividades dos sistemas do Nexus**. Cada setor tem sua
régua, editada pelo gestor (como o catálogo de serviços).

Hoje a "Atividade no período" da lista do setor (a Joice com 781) é a soma crua:
cada ação vale 1, um chamado de chat igual a um serviço de 3h. A **régua de
atividades** (`/servicos`, bloco "Pontos por atividade") torna isso editável:
cada tipo — chamado resolvido, curso, alteração no CIDE, chamado do chat… — com
o valor que o gestor decidir.

- `lib/servicos/atividades.ts`: o catálogo de tipos, espelhando `activityOf()`
  MENOS os serviços (que têm catálogo próprio — contá-los de novo seria pagar o
  mesmo serviço duas vezes na nota)
- `lib/servicos/atividade-agg.ts`: a conta das fontes num lugar só
- `pontuacao_atividade`: a régua por setor (valor por tipo, `null`=padrão 1)
- `calcular()` ganhou `pontosDeAtividade` e a opção `semDisciplina`

⚠️⚠️ QUEM O PONTO NÃO MEDE DEIXOU DE FICAR DE FORA. Antes o cálculo pulava quem
não estava no roster do ponto; agora ele pontua por serviço e atividade, **sem**
a metade disciplinar (sem base, sem bônus de mês limpo — que seriam a
ausência-que-elogia). O trabalho medido conta; o que não se afirma é o mês
impecável de quem ninguém mediu.

### O que o agente crítico pegou (conferido no banco)

- ⚠️⚠️ **A atividade a peso 1 INVERTE o ranking do Legal.** Agosto: a Joice (8
  serviços, ~842 atividades) passa o Ezequiel (105 serviços) — um chamado de
  chat pesando igual a uma ALTERAÇÃO NORMAL que a régua de serviço avalia em 18.
  É o defeito de volume que o catálogo de serviços existe para evitar. **Decisão
  do dono: conta 1 desde já, o gestor ajusta** — mas a tela de cálculo agora
  **avisa** quando os pesos ainda são o padrão, antes de gravar.
- ⚠️ **`formalized` fora.** `hd_resolvido` somava `resolved+formalized`, mas
  `activityOf()`/`score-metrics` (o número visível) somam só `opened+resolved`.
  O gestor ponderaria o peso por um volume maior que o que vê. Corrigido: só
  `resolved`.
- ⚠️ **WhatsApp casa por NOME.** Nome que casa com mais de uma pessoa do setor
  agora **não credita ninguém** — melhor não contar que contar na nota errada.
  Não há colisão hoje no Legal, mas o mecanismo era cego a ela.
- ⚠️ **A régua contava inativos.** Passou a usar só ativos, o mesmo recorte do
  cálculo — senão o volume ponderado não bate com quem pontua.
- ✅ **Sem dupla contagem de serviço** (o maior medo): a régua de atividades não
  tem `servico_depto`; o serviço entra só pela 2ª metade. Confirmado.

## 2026-09-08 (fim) — O sexo passou a ter dono, e a conta `Sistema` saiu

⚠️⚠️ **O campo não existia em sistema nenhum da casa.** O TalentCare tem um
comparativo por gênero e um "não informado" no resumo de cada setor, e o valor
vinha de **uma planilha de DP importada uma única vez**, que não será
reimportada. Onze das 87 pessoas ativas ficaram sem sexo e não havia onde
apontá-lo.

Agora tem dono: `employees.gender` no **Nexus** (migration 0041), com campo no
cadastro de avulso e na edição de qualquer funcionário, entregue em
`/api/integrations/employees`. Os dez sistemas que leem o diretório recebem.

⚠️ No sync do TalentCare, `undefined` quando o Nexus não sabe — **nunca `null`**.
A planilha do DP preencheu 92 pessoas e não vai rodar de novo: um `null` no
update apagaria essas 92 no primeiro sync, trocando um buraco de 11 por um de
103. Conferido depois de rodar: Feminino 68 → **75**, Masculino 24 → **27**, sem
informação 37 → **27**. As 92 continuaram lá.

⚠️ `mapSexo` traduz 'M'/'F' para 'Masculino'/'Feminino', o texto que este banco
já usa: o normalizador do painel lê por prefixo `masc`/`fem`, e um 'M' cru cairia
em "não informado" logo depois de alguém ter informado o sexo da pessoa.

**Os 10 valores foram inferidos do primeiro nome**, a pedido do dono, e isso está
dito no SQL que os aplicou. É leitura, não registro — o campo agora tem um lugar
para ser informado de verdade.

### E a conta `Sistema`

Ela aparecia nas duas listas de pendência como algo que ninguém podia fechar.
Foi para o setor `Sistemas` no Nexus, como o `FONTES.md` já previa: o diretório
caiu de **128 para 127** e o bloco de órfãos marcou `foraDoDiretorio` sozinho no
sync seguinte, com a volta intacta. A dívida saiu da lista do `FONTES.md`.

**Resultado**: "sem sexo informado" foi de 11 para **zero**; "sem escolaridade"
de 9 para **6** (a `Sistema` saiu, e o Gilberto e a Alice receberam formação do
próprio Nexus no mesmo sync).

### ⚠️ E um defeito que eu mesmo introduzi horas antes

As fotos quebravam na lista nova. `/api/avatar/[id]` e `/funcionarios/[id]` são
os **dois** indexados pelo `users.id` (cuid), e eu passei o `nexusUserId`: 404
nos dois — retrato quebrado em toda linha com foto e ficha inexistente no
clique. As duas chaves convivem no mesmo objeto e nenhuma falha em tipo, então o
erro só aparece na tela.

## 2026-09-08 (madrugada, 4) — Cada advertência diz de qual atraso ela veio

A lista da ficha repetia, em **todas** as sete linhas, a mesma frase: *"Atraso
(2º ou seguinte no mês) — contagem derivada da regra da casa, não é advertência
assinada"*. Sete linhas idênticas não informam nada, e escondiam justamente o que
a lista tem de útil.

A regra é **ordinal**, e por isso é derivável: a 1ª advertência do mês vem do 2º
atraso, a 2ª do 3º, e assim por diante. O motivo passa a dizer isso —
`2º atraso do mês`, `3º atraso do mês` —, e a ficha mostra a **progressão dentro
do mês** em vez de uma parede de texto igual.

⚠️ A ressalva não sumiu: subiu para o cabeçalho do cartão, dita **uma vez**, onde
se lê. "A casa aplica advertência a partir do 2º atraso do mês. Esta é a contagem
por essa regra — não é registro de advertência assinada." Um painel que decide
aumento não pode deixar essa diferença implícita, mas também não precisa
repeti-la sete vezes.

**As 1.004 advertências já gravadas foram renomeadas sem o dump** (que foi
apagado por conter PII): a ordem é derivável do próprio banco, porque elas foram
geradas dos atrasos do mês ordenados por dia, pulando o primeiro — então a
k-ésima advertência do mês corresponde ao atraso k+1. A distribuição resultante
confirma a regra: **413** "2º atraso", **278** "3º", **181** "4º", 105 "5º", 17
"6º", 5 "7º", 4 "8º", 1 "9º" — decrescente, como tem de ser.

⚠️ E o rótulo do tipo deixou de sair da chave crua do banco: `advertencia`
capitalizado punha **"Advertencia"**, sem acento, na ficha de gente de verdade.

## 2026-09-08 (madrugada, 3) — O mapa do setor também virou calendário, e a cor mudou de eixo

Mesmo tratamento da ficha: blocos de mês com o dia escrito dentro, obedecendo ao
filtro de período, ampliado quando o filtro é um mês só e cabendo doze.

### ⚠️⚠️ E a cor deixou de ser a soma de minutos

O mapa do setor somava os minutos de todo mundo no dia e usava os limites da
PESSOA (5/15/30 min). Medido de junho a setembro de 2026: no **Fiscal, 39% dos
dias com atraso** batiam no topo da escala; no **Contábil, 25%** — e um dia
somava **466 minutos**. Todos pintados igual: a escala tinha saturado, e um mapa
saturado não mostra nada.

A soma é dominada por um atraso enorme de uma pessoa. Num mapa de **equipe** a
pergunta é outra — *quantos chegaram tarde naquele dia* —, e ela tem escala
própria: 1, 2, 3, 4 ou mais. Com ela, o Contábil distribui **21 / 14 / 13 / 12**
nos quatro níveis em vez de amontoar no último; o Fiscal, **18 / 20 / 12 / 6**.
Os minutos continuam no tooltip, junto com quantas pessoas.

⚠️ O mapa do setor inclui **quem saiu**: o atraso aconteceu, e apagá-lo
retroativamente é o mesmo defeito da série mensal que "some com quem saiu" e
rebaixa o passado inteiro.

## 2026-09-08 (madrugada, 2) — O calendário passou a obedecer ao filtro

⚠️⚠️ **O mapa era o único número da ficha que ignorava o período.** Ele desenhava
sempre "últimas 18 semanas", vindas do dataset do cliente, enquanto os KPIs ao
lado seguiam o filtro: escolher **01 a 31 de agosto** trocava "6 atrasos · 43
min" por "6 atrasos · 32 min" e deixava o calendário em **maio–setembro**, com o
rótulo do filtro em cima. É a regra (b) da casa, e num calendário ela pesa mais
que numa grade — a data está escrita dentro do quadro.

Agora os dias vêm de `/api/employee-metrics`, no intervalo do filtro. Só existem
linhas para dias COM ocorrência, então um ano inteiro da pessoa mais atrasada são
~57 linhas: não pesa no payload.

### A densidade sai do tamanho do período

- **1 mês** → célula de 46px, e o **minuto escrito dentro do dia** (o dado que a
  cor só insinua, e que é o que decide a conversa)
- **até 3** → 30px · **até 6** → 25px · **até 12** → 21px

Doze meses cabem apertando a célula, nunca cortando mês: um calendário que
esconde meses do próprio filtro é pior que a grade que ele substituiu.

⚠️ O terceiro estado mudou de nome junto: era "fora das 18 semanas", virou **fora
do período**. Continua vazado, e continua não sendo "dia limpo" — ninguém
perguntou por aquele dia.

## 2026-09-08 (madrugada) — A gravidade do atraso

Pedido do dono: mostrar que percentual dos atrasos da pessoa fica abaixo de 5
min, até 30 e acima de 30. **"6 atrasos · 43 min" não distingue seis vezes
chegando 7 minutos depois de duas chegando meia hora** — e as duas conversas com
a pessoa são completamente diferentes.

### ⚠️⚠️ O dado não existia, e não dava para derivar

`assiduidade_daily.minutos_atraso` é a **soma do dia**. Um dia com um atraso de 6
min e outro de 40 soma 46 e cairia inteiro em "acima de 30", sendo um pequeno e
um grande. Quem ainda vê cada ocorrência é o **importador** — depois dele a
informação não existe mais. Entram três colunas contadas lá:
`atrasos_ate5`, `atrasos_ate30`, `atrasos_mais30`.

⚠️ Só conta atraso **não abonado**, e atraso sem `entrada_prevista` fica **fora
das faixas**: `atrasoMin` devolve 0 para ele, e 0 ali é "não deu para medir", não
"chegou na hora". Vira um "até 5 min" que ninguém mediu — o zero acusando com o
sinal trocado.

### O preenchimento do que já estava gravado

O dump foi apagado depois da carga (tem PII), então o histórico foi preenchido
pelo que dá para saber com certeza: num dia com **um único** atraso o
`minutos_atraso` **é** o minuto daquela ocorrência — **1.558 dos 1.566 dias**.
Ficaram sem faixa os 8 dias com mais de um atraso (16 atrasos) e 8 sem minuto
medido: **24 de 1.574, 1,5%**. A tela os mostra como "sem gravidade medida, fora
da conta" em vez de empurrá-los para a faixa pequena. A próxima carga preenche
todos com exatidão.

### A distribuição da casa, medida

**46,7% até 5 min · 44,7% de 6 a 30 · 7,1% acima de 30.**

E o que a fileira de KPIs escondia, nos últimos 30 dias: a **Bárbara Rocha** tem
7 atrasos, mas **5 deles abaixo de 5 minutos** (50 min no total); a **Gabriela
Fargnolli** tem 9, com **2 acima de meia hora** (218 min). O número de atrasos
era quase o mesmo e o problema não é o mesmo.

⚠️ A rota devolve **contagem**, não percentual: quem calcula a porcentagem é a
tela, que sabe se há denominador para isso. "33%" sobre três atrasos diz menos
que "1 de 3", e mandar só o percentual apagaria a amostra de quem lê.

## 2026-09-08 (fim da noite) — A base do mês saiu, e com ela apareceu uma inversão

Decisão do dono: **a base mensal de 500 não deve existir**. Ela nasceu quando a
pontuação ainda não era calculada e servia de piso; com o catálogo de tipos
parametrizado, o mês passa a valer o que foi feito, sem ponto de partida.
Nenhum mês tinha sido calculado ainda, então a régua de hoje foi corrigida no
lugar — não havia passado para reescrever, que é a única coisa que a trava de
vigência protege.

### ⚠️⚠️ O que os 500 escondiam

Agosto/2026 no Legal, antes → depois:

| pessoa | atrasos | advert. | serviços | com base 500 | sem base |
|---|---|---|---|---|---|
| Ezequiel Castro | 0 | 0 | 105 | 1328 | **828** |
| Marcia Borges | 0 | 0 | 65 | 1190 | 690 |
| Marcos Gabriel | 3 | 2 | 21 | 518 | **18** |
| Evandro Padilha | 1 | 0 | 0 | 450 | **−50** |
| Yago Santos | 3 | 2 | 19 | 269 | **−231** |

**O Yago fez 19 serviços e fecha em −231; o Evandro não fez nenhum e fecha em
−50.** Quem trabalhou e se atrasou fica ABAIXO de quem a planilha não cobre,
porque a metade disciplinar pune todo mundo e a de serviço só premia quem
aparece. A base de 500 não corrigia isso — só empurrava os dois para cima do
zero, onde a inversão não incomodava a vista.

### E o gráfico da ficha quebrava com negativo

`height: Math.max(2, (pontos / max) * 56)` — um valor **negativo** virava a
mesma barrinha de 2px de quem tem 1 ponto. O número certo escrito em cima de um
gráfico dizendo outra coisa. Agora há **linha de base**: o que é positivo sobe,
o que é negativo desce (em vermelho), e a escala é repartida entre os dois lados
pelo maior de cada um.

### O dump não tem falta nem suspensão

Conferido: o arquivo traz **quatro** tabelas — `nexo_atraso`,
`nexo_advertencia`, `nexo_abonos` e `nexo_jornada`. Não há falta nem suspensão,
e o dump anterior também não tinha (está escrito no cabeçalho do
`run-ponto-import.mjs` desde a primeira carga). A lista de eventos da régua
(`EVENTOS`, em `lib/servicos/pontuacao.ts`) é **fechada** e também não os
conhece: acrescentá-los exige fonte primeiro, senão vira uma linha na tela que
nunca soma nada.

## 2026-09-08 (noite) — O dump novo, a advertência que era o mesmo atraso, e a régua rodando

### O dump

MySQL do `axis_db` (192.168.0.63), um arquivo só, sem a tabela `users`. Cobre
**01/10/2025 → 20/09/2026** e fecha o buraco: atraso parava em 25/06 e
advertência em 11/06, com os serviços indo até 31/08. Ficaram **1.621 linhas de
assiduidade e 90 pessoas casadas**.

### ⚠️⚠️ A advertência era o mesmo atraso, contado de novo

**731 das 732** advertências que já estavam no banco tinham um atraso da mesma
pessoa **no mesmo dia**, e 731 tinham motivo literalmente `'Atraso'`. Como a
assiduidade é `100 − atrasos·2 − advertências·5`, cada atraso valia **−7 em vez
de −2** — e dez pessoas ficavam empatadas em ZERO. A Yasmin (16 e 16) sairia de
0 para 68; a Joice Rocha, de 0 para 62.

A regra da casa, dita pelo dono: **a partir do 2º atraso no mês** a empresa
aplica advertência. **A tabela do Axis não implementa isso** — dos 129
pessoa-mês com exatamente UM atraso, **127 geraram advertência**; no geral só
7,3% dos 492 pessoa-mês batem com `atrasos − 1`. E a mediana do atraso é **6
minutos com e sem advertência**, então também não há critério de gravidade
separando os dois. Passou a ser derivada: **1.004** no lugar de 1.385.

Conferido depois de gravar: 1 atraso no mês → 0 advertências (157 casos); 2 → 1;
3 → 2; 4 → 3. Nos últimos 30 dias o fundo do ranking virou **47**, com
diferenciação, em vez da pilha empatada em zero.

⚠️ O que se grava é uma **contagem derivada** para a régua, não advertência
assinada — o `motivo` de cada linha diz isso.

### Três armadilhas do import, todas pagas nesta sessão

- **`--ensaio`**: a importação era wipe+rebuild sobre atraso e advertência de
  gente real e **não tinha prévia nenhuma**. Agora tem.
- **O `sourceId` colidia**: a mesma pessoa se atrasa duas vezes no mesmo dia (11
  casos), e `pessoa:dia` não é único — o `createMany` morreu **depois do wipe** e
  deixou a base pela metade. Passou a usar o id do atraso.
- **⚠️⚠️ E o wipe levou o `ponto_staging` junto.** Sem ele, a carga seguinte
  perdeu os 85 vínculos que a carga anterior tinha resolvido e o casamento caiu
  de **90 para 87 pessoas** — com um critério mais fraco, porque sem o
  `axis_db_users.sql` não há departamento para desempatar nome. Restaurado do
  backup; o importador agora lê os vínculos anteriores ANTES do wipe e os
  reaproveita como `previo`.

### A régua rodando no mês

Rota + bloco na tela: escolhe a competência, **ensaia sem gravar**, mostra a
conta aberta de cada pessoa, grava como `calculado`. O catálogo saiu para
`lib/servicos/catalogo.ts` — o cálculo mensal precisa do mesmo número que a tela
mostra, e a régua mora em um lugar só.

**As quatro recusas:** mês que o ponto não cobre (o bônus de mês limpo iria para
quem ninguém mediu — vale para a janela E para a pessoa); mês aberto; o que o
setor informou à mão; competência sem régua vigente.

**⚠️⚠️ E os dois eixos que não se comparam.** A metade de serviço só premia quem
a planilha cobre; a disciplinar pune todo mundo. Agosto/2026: o **Evandro**
(gestor, 0 serviços, 1 atraso) dá **450** e o **Yago**, com 19 serviços feitos,
dá **269**. Os dois estão certos e medem coisas diferentes — a tela avisa.

Agosto no Legal, conferido no banco: Ezequiel 1328, Marcia 1190, Lucas 847,
Joice 737, Marcos Gabriel 518, Yago 269.

## 2026-09-08 (tarde) — A régua virou decisão gravada, e o TFE virou um serviço só

### O TFE: duas grafias, um serviço

Decisão do dono: *"no TFE, considere o mesmo serviço, e dê o que dá mais
pontos."* O catálogo agrupava pelo TEXTO exato, então `TAXAS PREFEITURA
(TFE/TFA) Emitir boletos` e `… emitir boletos` eram duas linhas, 5 concluídos
cada, com réguas configuradas separadamente (máximos 240 e 237) e valores
diferentes. Agora agrupa pela grafia normalizada: uma linha, amostra somada,
um valor — e vence a régua mais generosa. Importa num catálogo em que **29
tipos já têm menos de 5 medições**: partir a amostra ao meio piora quem já
estava no limite.

⚠️ A escolha fica visível na linha (quais grafias foram somadas, quantas réguas
havia, qual ganhou). Régua que vence em silêncio é régua que ninguém revisa.

⚠️⚠️ E a gravação alcança TODAS as grafias. A tela mostra uma linha, mas o banco
tem uma chave por grafia e é dele que os outros consumidores leem — gravar só
na canônica deixaria a irmã com a régua velha, viva e invisível: bastaria a
planilha do mês que vem mudar qual grafia é mais frequente para o valor do
serviço saltar sozinho.

### A primeira régua do Legal

`pontuacao_regra` estava **vazia**: o `0,5 ponto por minuto` era o padrão do
código, não uma decisão, e a tela o anunciava como fato.

Medido para decidir. Agosto/2026 a 0,5 daria **3.674 ao Ezequiel** e 2.931 à
Marcia, contra base 100 e advertência −15 — a metade disciplinar era 0,4% do
topo. Mas baixar o fator tem um custo que só aparece medindo: **o piso de 1
ponto achata o catálogo.**

| fator | tipos no piso | valores distintos | maior tipo |
|---|---|---|---|
| 0,5 | 0 | 45 | 108 |
| 0,1 | 4 | 19 | 22 |
| 0,05 | 9 | 11 | 11 |
| 0,03 | 28 | 6 | 6 |

A 0,03 o mês calculado cairia na faixa dos **98 meses históricos (0–230, média
151)**, mas 28 tipos no piso apagariam o ajuste que o Legal acabou de fazer.
Ficou **0,1**, com **base 500, atraso −50, advertência −75, mês limpo +100** — a
mesma proporção que eles já usavam, na escala nova. Agosto passa a dar 728 ao
Ezequiel e 69 ao Yago.

### ⚠️⚠️ Uma notícia, não 74

A régua nova move todos os tipos no mesmo instante, e o aviso de "mudou desde a
revisão" dispararia em cada um. **São causas diferentes e exigem reações
diferentes:** régua mudar é ato deliberado, com autor, data e motivo gravados;
a PLANILHA mexer no valor de um tipo é o que ninguém anunciou — e é para isso
que o aviso existe. 74 alarmes para um ato só enterram esse sinal. Entra
`mudouPelaRegua`, uma faixa única que explica a causa, e um "conferir os N
valores novos" que grava a revisão de todos, com autor e data, sem mexer em
valor nenhum.

### ⚠️⚠️ O catálogo não chegava à nota de ninguém

A conta mensal só conhecia `servico_concluido`, um valor **fixo por serviço** —
então os 74 tipos afinados um a um valiam todos o mesmo na pontuação: uma
`ABERTURA NORMAL` de 3 horas pesava igual a um `SERVIÇO INTERNO` de 30 minutos.
A tela mostrava a diferença; o número que decide aumento não a via. Entra
`pontosDeServico`, como UMA parcela na conta aberta (total e contagem, não 105
linhas — senão a conta deixa de ser conferível justamente onde mais importa).

### O que ainda falta, e por quê

Rodar a régua por competência e gravar como `'calculado'`. **Espera o dump de
atrasos e advertências**, e a razão é medida: `assiduidade_daily` termina em
**25/06/2026** e `disciplina_evento` em **11/06/2026**, enquanto os serviços vão
até **31/08**. Calcular hoje daria a julho e agosto **0 atraso e 0 advertência
para todo mundo**, e com eles o bônus de "mês sem ocorrência" (+100) — a
ausência elogiando, no primeiro número `calculado` que alguém veria.

⚠️ Os 98 meses `informado` **não são sobrescritos**: foram feitos por um
critério anterior e a pessoa já os leu. O primeiro mês calculável é **agosto de
2026**, o primeiro com serviço e sem valor informado.

## 2026-09-08 — A régua de cada tipo de serviço atravessa os meses

O pedido do dono: *"o pessoal do Legal já ajustou quanto vale cada serviço;
precisamos que o sistema guarde essa decisão para os próximos meses em que
subirmos a tabela, já saiba quanto vale cada um, e apresente para ajuste os
novos lançamentos."*

### O que eu medi antes de construir

A boa notícia primeiro: **a decisão já era durável.** `pontuacao_tarefa_ajuste`
tem chave `setor + tipo`, sem nada do lote — reimportar não a toca. Mas o que o
Legal ajustou foi quase todo **limite de tempo**: de 72 linhas, **71 têm mínimo,
71 têm máximo, 10 têm média lançada e apenas 1 tem override direto de pontos**.
Os outros 61 tiram os pontos da média medida, que é recalculada a cada arquivo.

Simulando a chegada de mais um mês (tudo × tudo-menos-agosto/2026): **6 dos 72
tipos mudaram, todos em ±1 ponto**. O valor não é instável — o que escapa é
outra coisa.

### ⚠️⚠️ O que escapava: o tipo NOVO entrava valendo o que a média medisse

**Quatro tipos estrearam em agosto/2026 valendo 108, 86, 46 e 18 pontos.** O
`SINDICATO (PROCESSOS) SINDRESBAR` vale **108 com UMA ocorrência de 215
minutos** — mais que qualquer tipo estabelecido do catálogo, onde o maior é 92.
Nada na importação nem na tela dizia que ele era novo: descobrir dependia de
reparar numa linha nova no meio de 74.

### ⚠️⚠️ E "ninguém olhou" era igual a "olharam e mantiveram"

Os dois eram a **mesma ausência de linha** no banco. É a regra da casa em mais
uma roupa: *ausência de decisão não é decisão de manter*. Sem essa distinção, o
tipo que a liderança conferiu e aprovou volta como pendente todo mês — e uma
lista de pendências que nunca esvazia deixa de ser lida.

Entram `revisadoPor`/`revisadoEm` e um ✓ que grava "conferi, e está certo" sem
mudar número nenhum. "Voltar ao medido" deixou de apagar a linha: também é uma
decisão, e vira revisão.

### ⚠️⚠️ A decisão se perdia por UMA LETRA

A chave é o texto do tipo, e o texto vem do export de outro sistema. O arquivo
do Legal **já traz o mesmo serviço em duas grafias** — `TAXAS PREFEITURA
(TFE/TFA) Emitir boletos` e `… emitir boletos` —, 5 concluídos cada, e alguém
configurou as duas separadamente, **com máximos diferentes (240 e 237)**. Nada
acusava: são duas linhas plausíveis.

`tarefaNorm` faz a busca tolerar caixa, acento e espaço duplo. Ela **não mescla
nada sozinha** (decisão do dono): escolher entre 240 e 237 é de quem decidiu.

### As duas decisões do dono

1. **O valor continua acompanhando a planilha**, não congela. Os limites são uma
   regra, e regra se aplica a dado novo — congelar tiraria o efeito dos 142
   limites recém-configurados sobre tudo que entrar daqui para a frente. Mas
   acompanhar em silêncio seria mudar a nota de alguém sem ninguém saber: daí
   `pontosNaRevisao` e o aviso *"valia X quando você conferiu, agora vale Y"*.
2. **Grafias divergentes não se mesclam sozinhas** — a tela mostra as duas e
   oferece "usar esta régua nas outras".

⚠️ A âncora das 72 revisões antigas só é gravada **onde dá para saber**: quando a
revisão é posterior a tudo que pode ter mexido no valor (a última importação e a
última versão da régua). Conferido: lote único em 04/09 11:07, nenhuma régua
gravada, decisões entre 04/09 19:41 e 08/09. Revisão anterior a uma dessas
mudanças fica sem âncora, e a tela não afirma variação nenhuma — que é a
resposta certa para "não sei".

### O que o agente crítico achou (com conferência no banco)

Três defeitos anteriores a esta frente, na tela desta frente:

- **A coluna "Pontos" nunca mostrava o override.** Em repouso exibia sempre
  média×fator: o espelho de digitação tinha virado o valor permanente.
  `SERVIÇOS INTERNOS - VERIFICAR CALCULADORA` tem override de **0** — o setor
  decidiu que não vale ponto — e o campo mostrava **8**, com borda de "ajustado
  à mão". A única decisão de pontos do catálogo era a única coisa invisível
  nele, e a ordenação (que usa o valor real) mandava a linha para o fim
  exibindo 8.
- **Esvaziar o mínimo apagava tudo.** O campo mandava `limpar` — que zera
  máximo, média lançada e override — enquanto o campo do máximo, seu espelho,
  sempre fez certo. Apagar a caixinha do mínimo no `CANCELAMENTO` (78 serviços,
  média lançada 200, 2º tipo mais caro) derrubava o tipo de **100 para 17
  pontos**, sem confirmação, sem aviso e sem desfazer.
- **"Voltar ao medido" prometia um número e entregava outro.** `mediaMedida` é a
  média DEPOIS dos limites, e limpar apaga os limites: em `ALTERAÇÃO SIMPLES
  NACIONAL` o tooltip anunciava *149 min → 75 pontos* e entregava *33 min → 17*,
  **cinco vezes menos**.

E o zero que não foi medido: com os limites tirando todos os serviços,
`mediaMedida` saía 0 e a tela dizia *"o medido na planilha é 0 min"* — o
`CANCELAMENTO` tem **33 min medidos em 78 serviços**, todos fora da faixa
120–240. São **10 dos 74 tipos**.

**O agregado, porque ninguém lê 74 linhas: 44 dos 74 tipos perdem mais da
metade dos serviços para o mínimo e o máximo, e 10 perdem todos.** Quando o
corte é a regra e não a exceção, a média deixou de descrever o trabalho da
equipe e passou a descrever a faixa que os limites escolheram. Está na tela.

### ⚠️ O fator ainda não é decisão de ninguém

`pontuacao_regra` está **vazia**: o `0,5 ponto por minuto` é o padrão do código,
e a tela o anunciava como fato. Ele multiplica a coluna inteira — os 72 ajustes
do Legal foram feitos olhando números derivados dele. Quando a régua for criada
com outro fator, **os 74 tipos mudam de valor de uma vez** e cada um vai
aparecer como "mudou desde a revisão". A tela agora diz isso.

### Onde ficou

- prévia da importação: quantos tipos já foram decididos, quais são novos (com a
  amostra de cada um), quais ainda não dá para pontuar (sem nenhum concluído) e
  quais decididos **não** vêm no arquivo — a decisão não é apagada, só some da
  lista junto com os serviços
- tela de tipos: abre no que precisa de decisão, com filtros por pendente,
  mudou-desde-a-revisão e grafia repetida, dizendo quantas linhas está escondendo
- migração aplicada à mão no `.78` (`prisma db push` confirmou "already in
  sync"); backup da tabela tirado antes

## 2026-09-03 (noite) — O dashboard e o `/ranking`: a ausência que lia como nota máxima

As duas telas que ainda não tinham passado pela revisão. O agente crítico rodou de
novo, com o briefing de `docs/AGENTE-CRITICO.md`, e achou três defeitos que eu não
tinha visto — todos confirmados contra o banco de produção antes de consertar.

### ⚠️⚠️ O defeito principal: ausência de dado lendo como 100

Não era `rnd`, e é por isso que ele sobreviveu a todas as revisões anteriores: a
conta estava certa e a fonte era real. `assiduidade = 100 − atrasos·2 −
advertências·5` — quem o ponto não cobre entra com **0 atrasos e 0 advertências** e
sai com **100**.

Medido no `/ranking` por Assiduidade, "Todos os setores": **os 22 primeiros
colocados, empatados em 100, eram exatamente as 22 pessoas sem registro de ponto
nenhum.** O primeiro medido de verdade — a Andressa Romantini, com 98 — aparecia em
**32º**. E o fundo era pior: **20 pessoas empatadas em 0**, porque a fórmula satura;
a Yasmin (16 atrasos, 16 advertências) na mesma posição que a Bruna (42 e 29).

Duas coisas o agravavam:

1. **O ponto está 70 dias parado.** É a única das dez fontes sem cron — entra por
   import à mão — e terminava em **25/06/2026**, com os oito espelhos de atividade
   todos em `max(day) = 2026-09-03`. Em "7 dias", "30 dias" e "Trimestre atual" não
   havia uma linha, então a assiduidade valia 100 para as **87 pessoas**.
2. **O recorte de privacidade fabricava o 100.** Ele zera atrasos e advertências de
   quem o leitor não alcança — o que é certo, o dado não pode viajar —, mas zerado
   vira nota cheia: um gestor via a empresa inteira empatada em primeiro lugar,
   acima do próprio time, que é a única gente de quem ele tem dado real.

**O conserto** é `lib/ponto-cobertura.ts`, que responde as **duas** perguntas
separadamente — *a pessoa é medida?* (o roster do ponto, não "tem ocorrência": quem
é medido e nunca se atrasou merece os 100 dela) e *a janela foi medida?* (o
intervalo que o import cobriu). `null` nos dois casos, com o peso redistribuído
pelo mecanismo que já existia.

> **A regra do `null` tem uma face invertida, e ela é mais difícil de ver.** Todo
> mundo procura o zero que acusa. Aqui a ausência **elogiava** — e elogio não
> levanta suspeita em ninguém.

### O coorte do percentil incluía os desligados

Achado do crítico. A produtividade é percentil dentro do setor, e o coorte era
montado sobre `employees` inteiro, com os **33 desligados** dentro (o Contábil tem
18 ativos e 13 desligados). Quem saiu não produz nada na janela, entra com 0 e vira
o piso da distribuição: **70 das 87 pessoas ativas** tinham o percentil inflado por
gente que não trabalha mais aqui. A Andrea Bratfisch subia de 50 para **100** de
produtividade. Hoje a régua é o coorte de **ativos**; o desligado continua
recebendo nota (a ficha dele existe), só não serve mais de referência.

### Efeito somado no "Score médio" da home: **73 → 52**

Vinte e um pontos, e nenhum deles era medição. As duas maiores quedas individuais:
Andrea Bratfisch 60 → 8 e Bruna Costa 51 → 0.

### O turnover `rnd` que a lista de dívida dava por quitado

O conserto de 03/09 pela manhã chegou ao relatório do setor e **não** ao card da
lista em `/departamentos`, que seguia imprimindo `3.5 + rnd(dseed × 5.3) × 13` em
vermelho. Tela × verdade: **Fiscal 4% × 30,0%**, Contábil 14,8% × 40,0%, Recepção
13,1% × 40,0%, TI 4,8% × 0%. O 4% do Fiscal é o mesmo número que o
`AGENTE-CRITICO.md` cita como exemplo de achado do crítico — ele nunca tinha saído
da tela, só da página de detalhe.

### A curva de turnover ignorava o calendário

Também do crítico. `turnoverSeries` tratava `Ano` e `Trimestre` e mandava todo o
resto para o `else`, com buckets fixos de 5 dias × 6 = os últimos 30 dias — **`custom`
incluído**. Escolher 1/jan a 30/jun devolvia a taxa e a curva de agosto, com o cartão
rotulando aquilo de "Intervalo escolhido". Agora o intervalo sai de `periodDays`, o
mesmo que as ~12 rotas usam.

### Duas réguas de alcance, e a mais frouxa era a que embarcava no payload

`lib/alcance.ts` diz, por escrito e com a medição ao lado, que o setor onde a pessoa
senta **não** entra no alcance dela. O `app/(app)/layout.tsx` somava o `meDept` e
passava isso ao `getTalentData` — que enche o `TalentDataProvider` de **toda**
página. Navegação e alcance de dado agora estão separados: a barra continua com os
setores dele, a régua de dado sai só dos vínculos.

### Tempo de casa congelado em junho *(reportado pelo Daniel)*

`monthsSince` contava até uma `BASE_DATE` fixa em **01/06/2026**, herança da época
em que tudo aqui era determinístico — e atrasava mais um mês a cada mês. A ficha do
Yuri Santana dizia **11 meses** ao lado da própria data de admissão, real, de
17/07/2025: são **13**. **118 das 129 pessoas** estavam erradas.

E o pior caso era o desligado, que continuava fazendo aniversário de casa: a lista de
`/turnover` diz quanto tempo cada um **ficou**, e a Melissa Marcondes — que entrou em
29/11/2024 e saiu em 15/01/2025 — aparecia com **19 meses** de casa em vez de **1**.
Hoje conta até a saída, e conta o dia, não só o mês.

### O resto que saiu do painel

- **"Atualizado há 12 min"**, cravada no JSX e igual num painel fresco e num painel
  morto — a mesma frase que o `scripts/tc-vigia.sh` deste repositório já citava, por
  escrito, como o exemplo do problema. Virou `/api/frescor`: o **espelho mais
  atrasado**, com a data. Hoje o painel diz "Dados até 25/06/2026 · Ponto".
- Os **deltas literais** `+3` (Headcount) e `+2` (Score médio). O Headcount ganhou o
  delta real — entradas **menos** saídas, que em 30 dias dá **−2** e não +3; o Score
  médio perdeu delta e sparkline, porque média de percentil é quase constante por
  construção.
- As **quatro sparklines inventadas** (três `sp(seed)` e uma com array literal
  `[74,75,74,76,…]` e o valor real só no último ponto). As que ficaram são medidas;
  onde não há série, o cartão fica **sem gráfico**.
- **`alerts`, `rankList`, `deptBars`, `turnoverNow`, `periodFactor`** — código morto
  que ninguém renderizava, incluindo quatro "novidades" com data escrita à mão.
- O **"Destaque por departamento"** era ordenado por score **entre setores** — a
  comparação que o `/ranking` avisa, em amarelo, que não vale. Hoje é alfabético, e
  a linha diz quando o destaque é o único avaliável do setor.

### `/ranking`

- A métrica Assiduidade **obedece ao filtro de período** (lia o acumulado) e lista
  **só quem é medido**, com uma linha dizendo quantos ficaram de fora e por quê —
  "ficar de fora não é ficar em último".
- A **ordem** usa a penalidade sem piso, e cada linha mostra os atrasos e as
  advertências que produziram o número, para o fundo da lista distinguir gente.
- O painel "Comparação lado a lado" **nascia vazio em toda visita**: os defaults
  eram `'e3'` e `'e23'`, ids do dataset mock antigo (os reais são cuid).
- `/ranking` entrou na régua de Diretoria do `proxy.ts` — ele mostra a empresa
  inteira e não estava em lista nenhuma.
- `getTalentData` passou a respeitar **`foraDoDiretorio`**, que a fila de avaliação
  já respeitava: uma conta que não é gente não podia ficar de fora numa tela e ser
  classificada em primeiro lugar na outra.

### Erro de rede não vira mais boa notícia

`useAssiduidadePeriod` fazia `catch → new Map()`, e Map vazio é indistinguível de
"ninguém se atrasou": uma queda de rede virava **0 atrasos**, em verde. `useScoreSignals`
fazia `catch → null`, e `null` faz o `withRealScores` cair no score **acumulado** de
toda a história, debaixo do rótulo "Últimos 30 dias" (média 57 contra 60 na janela,
com saltos de até 57 pontos numa pessoa). Os dois hooks agora devolvem `erro`, e o
painel diz, em vermelho, que o que está na tela não é a janela pedida.

## 2026-09-03 — O relatório de setor, a ficha, e o acesso do gestor

Três frentes, e um agente **crítico** revisando cada rodada. A regra do laço foi:
ele só reporta o que **mudaria a decisão de alguém que usa a tela**, e diz quando um
bloco acabou. Foram três rodadas; ele encerrou o bloco de acabamento na segunda.

### O relatório de departamento

Reescrito em ordem de Z, com a pergunta **"onde está o problema neste setor"** no
canto superior esquerdo. Cada fonte virou um cartão com o **ranking de quem fez**
(foto, nome, quantidade) à esquerda e os totais à direita. Entraram a comparação
entre as pessoas, a avaliação do setor, a assiduidade e o retrato da equipe.

**Números inventados que saíram:** o turnover por setor era `3.5 + rnd(seed) * 13`
(o Fiscal aparecia com 4% sendo **26,7%**; o Contábil com 14,8% sendo **40%**) e a
"Evolução do score · 12 meses" era um passeio aleatório semeado pelo id do setor. Hoje
são o turnover real (de `leftAt`) e a atividade mensal dos espelhos.

⚠️ **O relatório mostrava o acumulado de sempre com rótulo de período**: o TI com
**59 cursos** debaixo de "Últimos 30 dias", quando no período eram **4**. Agora há
`/api/dept-metrics`, e o **filtro ganhou calendário** (`Period` = `custom`), com o
`period&from&to` montado num lugar só e lido por um leitor só.

### A ficha do funcionário

O leitor passou a ser **o gestor prestes a avaliar**. As abas viraram **página única**
(quatro seções), a edição de formação foi para trás de um botão, e o painel lateral
virou **"Antes de avaliar"** — o que os sistemas registraram, escrito como PERGUNTA e
nunca como conclusão, com botão para a avaliação daquela pessoa.

**Cinco blocos de ficção saíram:** a recomendação automática de promoção (que saía de
um passeio aleatório), a aba **Trajetória** inteira (promoções e "reajuste por mérito
13%" que não aconteceram, com datas plausíveis, na ficha de gente real), a aba
**Reconhecimento**, o KPI **"Tarefas concluídas"** (home e `/ranking`) e o **gauge de
score**, que ficava logo acima do botão "Avaliar".

⚠️ E o "zero como resposta", que era o caso de quem **não é medido por fonte
nenhuma**: seis barras em 0 carimbadas "REAL", "Atividades concluídas 0" em verde, e
**"Assiduidade 100%"** — zero atraso por *ausência de dado* virando nota máxima.

### O acesso: o menu é da Diretoria

Gestor e sub-encarregado caem no setor deles (`/meu-setor`) e trabalham ali, com uma
**barra enxuta** — os setores deles, Avaliações, Meu desempenho e o Sair. "Sem menu"
não podia virar "sem saída". A Diretoria pode **recolher o menu** e ver a tela como
eles veem, com um selo "VENDO COMO GESTOR".

### ⚠️⚠️ As três falhas de acesso, e nenhuma aparecia no build

**1. O histórico disciplinar da empresa ia no payload de toda página.**
`getTalentData()` não filtrava por quem lê: **732 advertências de 73 pessoas, com o
motivo escrito**, mais 130 dias de atrasos por pessoa, no `self.__next_f` de qualquer
tela. As rotas da ficha checavam `podeVer` — e era por isso que ninguém via: a régua
protegia a parte *menos* sensível.

**2. As 11 rotas agregadas devolviam a empresa inteira.** A régua agora é uma, em
[`lib/alcance.ts`](lib/alcance.ts). ⚠️ O primeiro desenho somava "o meu departamento",
e o ensaio contra o banco pegou: uma `Colaborador` do Fiscal alcançaria **as 31
pessoas do setor** só por sentar lá. O alcance sai dos **vínculos**.

**3. O papel da sessão nunca se renovava** — gravado só no login, valia 30 dias.
Promover não abria, e ⚠️⚠️ **revogar não fechava**. Agora relê a cada 5 minutos.

### O ensaio com uma pessoa de verdade

`TALENTCARE_ACESSO_TESTE` — lista nominal e revogável. A **Joice Rocha** (Sub do
Legal) entrou, e o caminho do gestor está percorrido.

⚠️ Duas coisas atrapalharam e viraram documentação: o **`/sso` tinha uma terceira
cópia da régua**, incompleta (`mapRole` sem cargo e sem vínculo), que **rebaixava a
pessoa a cada login**; e `rsync lib/nexus.ts host:/dir/` **achata o caminho** — o app
ficou com a régua velha enquanto o CLI tinha a nova, e nada acusou.

## 2026-09-02 — Chat Interno é a 8ª fonte, e nasceu a avaliação mensal

Três frentes num dia. A documentação de cada uma está em
[`docs/`](docs/): [avaliações](docs/AVALIACOES.md) ·
[fontes](docs/FONTES.md) · [período e deploy](docs/PERIODO-E-DEPLOY.md).

### O Chat Interno entrou como 8ª fonte

Mensagens (em canais, diretas e dentro de chamado) e os chamados entre setores, pelo
espelho diário de sempre. Duas tabelas porque são duas perguntas: `chat_daily` por
pessoa e `chat_dept_daily` por setor — e neste as **duas faces do mesmo chamado**
(o que o setor pediu × o que recebeu), que **não se somam**.

**Mensagem é vitrine e fica FORA do score** (decisão do Daniel). Ela aparece na ficha,
na linha do tempo e na tela `/chat`, mas não em `activityOf()` nem em
`/api/score-metrics`: em ordem de grandeza — **210 mil mensagens × 25 chamados** —
abafaria as outras sete fontes somadas, e o ranking passaria a medir quem mais
escreve. Só chamado (aberto + concluído) conta, como o HelpDesk.

Conferido contra a fonte: **210.742 mensagens dos dois lados**; 25 chamados, 17
concluídos, 1 cancelado.

#### ⚠️⚠️ O dia parcial apagava o dia cheio

Encontrado no **primeiro reteste**: rodar o sync duas vezes derrubou 210.740 para
**210.636**, sem erro nenhum no log, e cairia de novo a cada hora. O upsert é `SET` e
a janela do runner (meia-noite UTC = 21h de São Paulo do dia anterior) cobria o dia
anterior pela metade. Consertado **no endpoint** — no runner deixaria a armadilha
armada para o próximo consumidor.

### Área de AVALIAÇÃO MENSAL

Nota de 0 a 10 em oito critérios, com hierarquia (`gestor` → Diretoria;
`sub` → gestor; o resto → gestor ou sub), rascunho invisível, publicada que não se
edita, ciência e comentário do avaliado, e alerta de quem falta — **derivado**, nunca
gravado.

Descoberto no caminho: **o grupo não sabia quem é gestor de quem.**
`employees.manager_id` e `departments.manager_id` existem no Nexus e estavam **100%
vazios** (0 de 150 e 0 de 17). Hoje o vínculo mora em `setor_avaliador`, sugerido pelo
cargo e **confirmado por gente**.

Quatro defeitos apareceram na primeira vez que a tela foi usada de verdade, e todos
tinham a mesma forma — **algo prometido na tela que a régua não fazia**:

1. A tela só oferecia avaliador **do próprio setor**. Mas setor pequeno quase nunca
   tem o próprio: a Limpeza é avaliada por alguém da Cozinha. Pior, a **lista** de
   avaliadores também filtrava assim — o vínculo ficaria gravado e a tela diria
   "Ninguém avalia".
2. **O cargo barrava quem o vínculo autorizava.** A Rosemeire é `Colaborador` e
   administra duas filas: seria barrada delas. Agora quem manda é o vínculo.
3. **"Cabe à Diretoria" era só rótulo** — nenhum diretor conseguia avaliar quem o
   painel marcava assim, porque a régua exigia vínculo com o setor.
4. Uma **conta de sistema** (`Axis Certificados`) aparecia na fila do TI como gente. O
   próprio sync a trouxe: desligou-a e carimbou uma data de saída **inventada**, que a
   fila leu como "estava ativa no mês". Agora `foraDoDiretorio` separa *sumiu do
   diretório* de *foi desligado*.

**Abrir o sistema para todos está DESLIGADO** (`TALENTCARE_ACESSO_ABERTO`). Falta
recortar as rotas de dado **agregado** por setor — hoje devolvem a empresa inteira
para qualquer sessão autenticada.

### Relatório de departamento e filtro por calendário

#### ⚠️⚠️ O relatório mostrava o acumulado de sempre com rótulo de período

O TI aparecia com **59 cursos criados** debaixo de "Últimos 30 dias"; no período eram
**4**. O número não estava errado — respondia outra pergunta. Agora há
`/api/dept-metrics`, que soma os espelhos **no intervalo**: 7d=1, 30d=4, Ano=59.

A tela ganhou as **8 fontes**, os chamados entre setores nas duas faces, a avaliação
do setor com média por critério, assiduidade e disciplina, e o retrato da equipe.

**Filtro por calendário** (`Period` ganhou `custom`). O contexto passou a expor um
`query` único e as 12 rotas leem por `rangeDaRequisicao(req)` — antes cada hook montava
a URL sozinho, e o esquecido passaria a ignorar o calendário em silêncio.

### Sync de diretório: cron e freio

Ele **não tinha cron** — rodava só a mão. Resultado: o cargo de uma pessoa ficou 14
dias errado no espelho e **três admissões nunca chegaram** ao painel (invisíveis,
nunca avaliadas). Agendado às `:45`.

E ganhou um **freio de inativação em massa**: se a resposta do Nexus cobre menos de
80% de quem já está ativo aqui, não inativa ninguém e grita no log. Ensaiado com uma
resposta truncada de 20 em 128 — sem o freio, **77 pessoas teriam caído**.

O `run-sync.mjs` também tinha uma **cópia divergente** da régua de acesso: a tela
computaria `GESTOR` e o cron `SEM_PERMISSAO`, e vence quem roda por último — que é
sempre o cron.

---

## Antes de 2026-09-02

O histórico anterior não foi registrado aqui. O que se sabe está nas mensagens de
commit e em [`docs/FONTES.md`](docs/FONTES.md) — inclusive a auditoria de 07/08/2026,
que encontrou **dois dos seis espelhos mortos** com os seis crons "rodando com
sucesso" (o `sync_watermark` avança mesmo quando o pull traz zero linhas).
