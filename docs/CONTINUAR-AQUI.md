# Continuar daqui — passagem de bastão

> ## ⚠️⚠️ ESTADO EM 11/09/2026 (NOITE) — leia isto primeiro
>
> **O próximo trabalho é o MENU:** [`PROXIMO-MENU.md`](PROXIMO-MENU.md) — tirar o menu
> lateral e trocar por um botão que abre uma janela de cartões. Leia antes de mexer.
>
> O que mudou na tarde/noite de 11/09 (detalhe e porquês no `CHANGELOG`, entradas **(15) a
> (24)**; commits `e29280d` … `98596da`, todos publicados no `.78`):
> - **Painel principal novo = `/dashboard`** (imagem conceito, tudo clicável; o antigo em
>   `/dashboard/anterior`). Selo de variação só em Atrasos, com dias de expediente e pessoas
>   iguais dos dois lados. Assiduidade da casa com calendário. Barra do WhatsApp abre a janela
>   da FILA. Ver [`PROXIMO-DASHBOARD.md`](PROXIMO-DASHBOARD.md) (estado no topo).
> - **Saíram do sistema:** `/ranking` e `/relatorios` (redirecionam ao painel). **Saíram do
>   menu lateral:** Serviços do setor, Avaliações, Meu desempenho, Casar ponto, Quem avalia,
>   Usuários, Equipe interna, Escolaridade (as cinco últimas viraram abas de Configurações).
> - **Configurações** = a área administrativa inteira, em abas; saiu a ficção (pesos do score,
>   "sync há 8 min", contagens de acesso escritas à mão). A Diretoria entra (vê Régua e Fontes);
>   o dono vê tudo.
> - ⚠️⚠️ **A RÉGUA DE PONTUAÇÃO É GERAL** (Configurações → Régua; só dono e Diretoria alteram;
>   peso proporcional ao mês típico do setor). O gestor não edita mais régua; os pontos por
>   atividade saem sempre da média. Ver §8 abaixo e a memória `talentcare-regua-geral`.
> - **A planilha de serviços** se sobe só dentro do setor ("Enviar planilha do Gestta"); só
>   Gestta é aceito. **As avaliações** abrem dentro do setor (`/avaliacoes?setor=`).
> - **A busca do topo funciona** (pessoas e setores; `lib/ui/busca.ts`).
> - ⚠️ **`prisma db push` no `.78` quer DROPAR os backups do Chat** (`chat_*_bkp_20260911`) —
>   nunca aceite; use `prisma migrate diff --script`, filtre só o novo e aplique com psql.
> - **Pendentes com o dono:** travar também os pontos da tabela de SERVIÇOS (1 caso zerado à
>   mão no Legal); mostrar no painel as avaliações pendentes (o selo saiu com o item do menu);
>   o setor oculto Diretoria diria "9 a avaliar" se aberto por endereço.
>
> **Os ensaios** (rode depois de mexer; todos limpos em 11/09 à noite):
> `ensaio-painel-novo.ts` (785) · `ensaio-regua-geral.ts` (171) · `ensaio-busca.ts` (136) — com
> `npx --yes tsx@4 --env-file=.env --tsconfig scripts/tsconfig.json scripts/<nome>.ts` — e os
> três `.mjs` do setor (`ensaio-acesso-gestao`, `ensaio-detalhe-setor`,
> `ensaio-quem-atras-do-numero`) com `node --env-file=.env`.

> **⚠️ Atualizado em 11/09/2026.** Depois deste documento vieram duas rodadas grandes —
> a chefia entrou no sistema e o relatório do setor foi refeito (visão nova, janelas,
> painel da pessoa, integrações "pessoa" em seis sistemas). Leia também:
> - [`RELATORIO-DO-SETOR.md`](RELATORIO-DO-SETOR.md) — o que foi construído e por quê;
> - [`PROXIMO-DASHBOARD.md`](PROXIMO-DASHBOARD.md) — **o próximo trabalho**: refazer o
>   painel principal no mesmo molde.

> Escrito em **03/09/2026**, ao fim de uma sessão longa. Se você é o próximo agente:
> **leia isto inteiro antes de tocar em qualquer arquivo.** Ele não é um resumo do que
> foi feito (isso está no [`CHANGELOG.md`](../CHANGELOG.md)) — é o que você precisa
> saber para não refazer erros que já custaram caro.

---

## 1. O que é este sistema, em três frases

TalentCare é o painel de performance do Grupo Itamarathy (~90 pessoas), rodando em
produção no `192.168.0.78`. Ele **espelha** a atividade de oito sistemas da casa e a
cruza com uma **avaliação mensal** feita por gente. É usado para decidir aumento,
promoção e intervenção em setor — então número errado aqui não é bug de tela, é
decisão errada sobre a vida de alguém.

## 2. As quatro regras da casa

Elas não são estilo. Cada uma nasceu de um defeito que chegou à produção.

**(a) `null` nunca vira `0`.** "Não medimos" e "foi zero" são coisas diferentes, e num
painel de performance o zero **acusa a pessoa**. A ficha chegou a mostrar
"Atividades concluídas 0" em verde para quem não passa por fonte nenhuma. Mostre "—"
e diga por quê.

> **⚠️⚠️ E a regra tem uma FACE INVERTIDA, que é mais difícil de ver.** Todo mundo
> procura o zero que acusa. Em 03/09/2026 o defeito estava do outro lado: a
> assiduidade é `100 − atrasos·2 − advertências·5`, e quem o ponto não cobre entra
> com 0 e 0 e sai com **100**. Os **22 primeiros colocados** do `/ranking` por
> Assiduidade eram exatamente as 22 pessoas sem registro de ponto; o primeiro medido
> de verdade aparecia em 32º. A ausência **elogiava** — e elogio não levanta suspeita
> em ninguém, o que é justamente por que passou por todas as revisões anteriores.
>
> São **duas** perguntas, e as duas precisam ser feitas: *a PESSOA é medida?* e *a
> JANELA foi medida?* Quem responde é `lib/ponto-cobertura.ts`, num lugar só.
>
> ⚠️ Ao consertar, cuidado para não inverter de novo: a primeira versão do conserto
> caía no acumulado da vida inteira para quem não vinha no map do período — e quem é
> medido e foi **impecável** não vem no map. A Joice Rocha, zero ocorrências em
> junho, apareceria com nota 0 e "19 atrasos · 15 advertências". Numa janela medida,
> ausência de linha é **zero ocorrência**.
>
> ⚠️⚠️ **E percorra os consumidores.** Esta mesma falta reapareceu DUAS vezes na
> mesma sessão por uma tela esquecida. A fórmula tinha **quatro** cópias; a quarta
> estava dormente no view-model da ficha, plausível e pronta para a próxima pessoa
> que precisasse dela. Ao mexer numa régua, `grep` do CAMPO, não da tela.

**(b) Todo número ao lado do filtro de período tem de OBEDECER ao filtro.** O
relatório de setor mostrava **59 cursos** debaixo de "Últimos 30 dias" quando no
período eram **4** — o acumulado de toda a história com rótulo de período. O número
não estava errado: respondia outra pergunta, e ninguém desconfia de um número
plausível. **O teste é trocar a janela e ver o número mexer.** O que legitimamente
não acompanha o filtro (avaliação mensal, idade média, heatmap de 18 semanas) tem de
**dizer isso na tela**.

**(c) A régua mora em UM lugar.** Já esteve em três (`lib/nexus.ts`, `run-sync.mjs` e
`app/sso/route.ts`) e as três discordavam — o cron promovia a pessoa e o login dela a
rebaixava em seguida. Hoje: `lib/avaliacoes/regua.ts` (quem avalia quem),
`lib/alcance.ts` (que dados alguém vê), `lib/nexus.ts` (que telas alguém alcança).
⚠️ `run-sync.mjs` tem uma cópia **inevitável** (roda em node puro, não importa do
`lib/`) — mexeu numa, mexa na outra.

**(d) Nada de mock exibido como se fosse medição.** Já saíram: promoções e reajustes
que não aconteceram, "Tarefas concluídas" sorteada, turnover sorteado, um gráfico de
12 meses que era passeio aleatório. **O que ainda mente está listado no fim de
[`docs/FONTES.md`](FONTES.md)** — mantenha essa lista em dia; um mapa que aponta
dívida já quitada faz desconfiar do resto.

## 3. Onde está tudo

| Documento | Leia quando |
|---|---|
| [`docs/AVALIACOES.md`](AVALIACOES.md) | mexer em avaliação, permissão ou acesso |
| [`docs/FONTES.md`](FONTES.md) | mexer em qualquer número vindo dos 8 sistemas |
| [`docs/PERIODO-E-DEPLOY.md`](PERIODO-E-DEPLOY.md) | **antes do primeiro deploy** |
| [`docs/AGENTE-CRITICO.md`](AGENTE-CRITICO.md) | **antes de entregar qualquer tela** |
| [`CHANGELOG.md`](../CHANGELOG.md) | entender por que algo está do jeito que está |

## 4. ⚠️ O deploy tem duas armadilhas que já custaram horas

Produção **não é checkout git** — o deploy é `rsync` do checkout de trabalho em
`/home/suporte/talentcare` (no `.75`) para `/var/www/talentcare` (no `.78`).

1. **`rsync lib/nexus.ts host:/var/www/talentcare/` ACHATA o caminho.** O arquivo vai
   para a raiz e o `lib/` fica velho. O build passa, o serviço reinicia, nada acusa —
   e o sintoma engana: o `run-sync.mjs` (que já mora na raiz) chega certo, então o CLI
   roda código novo e o app roda código velho. **Sempre `--files-from=<lista>`**, e
   **confira no destino** com `grep -c` depois de subir.
2. **O branch é `master`**, não `main`, e há **dois espelhos** no `origin`. Confira o
   que subiu com `git ls-remote`, não pelo texto do push.

Depois de subir: `npx prisma db push` (se mexeu no schema), `npm run build`,
`sudo systemctl restart talentcare`.

## 5. O estado agora

**No ar e funcionando:** as 8 fontes espelhadas; a área de avaliação mensal com a
hierarquia (gestor → Diretoria, sub → gestor, resto → gestor ou sub); o relatório de
setor redesenhado; a ficha em página única.

**Todos os 16 setores têm avaliador** e **zero pessoas sem avaliador**. Casos que
valem lembrar: Limpeza e Cozinha são staff e a **Rosemeire** (cargo `Colaborador`)
avalia as duas; **Entregas** fica debaixo do **Legal**; Consultoria e Pousada cabem à
Diretoria.

**Nenhuma avaliação publicada ainda** — a área acabou de entrar no ar.

### As TRÊS portas, e qual delas está aberta

| chave | quem entra | estado |
|---|---|---|
| (nenhuma) | Diretoria, por setor | sempre |
| `TALENTCARE_ACESSO_GESTAO` | quem tem cargo de chefia **ou** vínculo gravado | **on** desde 10/09/2026 — 16 pessoas |
| `TALENTCARE_ACESSO_ABERTO` | a casa inteira, ~70 colaboradores a mais | **off** |

O degrau do meio entrou depois de o ensaio nominal ter sido percorrido por gente de
verdade (Evandro e Joice, do Legal). Ele é **derivado** — cargo de gestão ou vínculo —
e não uma lista de e-mails: o sync das :45 põe quem for promovido e tira quem sair da
chefia, sozinho. A lista nominal `TALENTCARE_ACESSO_TESTE` ficou **vazia**; ela existe
para o próximo ensaio, não para carregar gente.

⚠️ Virar `ACESSO_ABERTO` põe os colaboradores dentro e **não se desfaz**. É decisão do
Daniel, não sua.

## 6. O que vem a seguir

O Daniel estava seguindo por **telas e relatórios**. Pendências conhecidas:

- ~~**`/relatorios`** nunca saiu do "Em breve".~~ Saiu do sistema em 11/09/2026 (pedido do dono); o endereço leva ao painel. **Casar ponto** e **Quem avalia** saíram do menu no mesmo dia, mas seguem por endereço (`/ponto` depois de cada import do ponto; `/avaliadores` também pela tela de Avaliações).
- ✅ O **dashboard** e o **`/ranking`** passaram pela revisão em 03/09/2026 (noite),
  e com eles os deltas literais, as quatro sparklines inventadas, o "Atualizado há
  12 min" e o turnover `rnd` do card de `/departamentos`. Ver o `CHANGELOG` e a
  lista do fim de [`FONTES.md`](FONTES.md).
- **Cinco dívidas ficaram abertas por dependerem de régua nova** — decisão do dono,
  todas medidas e listadas no fim de [`FONTES.md`](FONTES.md): fonte parada por
  PESSOA (o Gilberto some do ranking porque o `gerencia_daily` dele para em 24/02
  com o espelho fresco), coorte sem volume, piso de tempo de casa, a conta
  `Sistema`, e a divergência do que é "advertência numa janela" entre o `/ranking`
  (do período) e a `/assiduidade` (acumulada) — a mesma pessoa lê 100 numa tela e
  25 na outra.
- ✅ **O ponto foi atualizado em 08/09/2026** — vai de 01/10/2025 a 20/09/2026. E
  descobriu-se ali que a **advertência era o mesmo atraso contado de novo** (731
  de 732 no mesmo dia da mesma pessoa): ela passou a ser DERIVADA pela regra da
  casa (a partir do 2º atraso do mês). Ver o `CHANGELOG` de 08/09 (noite).
  ⚠️ Segue **sem cron**: é import à mão, por dump, com `--ensaio` antes.
- ⚠️ **(histórico) O ponto esteve parado.** É a única das dez fontes **sem cron**
  (import à mão) e terminava em **25/06/2026** com os oito espelhos de atividade todos em 03/09. Em
  "7 dias", "30 dias" e "Trimestre atual" não há uma linha — as telas hoje dizem
  isso em vez de mostrar zero, mas o dado continua faltando.

### A 11ª fonte: a PLANILHA QUE O SETOR SOBE (04/09/2026)

O Legal exporta de outro sistema uma planilha de serviços e um controle mensal de
pontos. Ela virou a **11ª fonte** — e a **segunda sem cron**, ao lado do ponto.

**No ar e funcionando:** a tela `/servicos` (envio em duas fases, conferência de
vínculo, régua de pontuação versionada, catálogo dos 74 tipos de serviço com
duração medida e pontos editáveis); o cartão no resumo e no bloco de fontes do
relatório de setor; o cartão na ficha com gráficos por mês e por tarefa; e
serviço concluído entrando no `score`.

**Números do primeiro arquivo (Legal):** 6.980 linhas, 5.227 concluídas, de
05/03/2025 a 31/08/2026. 4.994 linhas com dono, **1.986 (28,5%) de quatro
ex-terceiros que nunca estiveram no Nexus** — elas entram, contam para o setor e
não creditam ninguém.

⚠️⚠️ **O caminho da tela é o botão no RESUMO do setor**, não um item de menu
(decisão do dono). "Serviços" foi removido da barra do gestor de propósito; o
botão leva o setor na URL — foi por um seletor esquecido no alto da tela que
**6.980 linhas do Legal foram importadas para Entregas** e nada acusou. Hoje a
prévia compara o setor de destino com o setor das pessoas reconhecidas e abre
faixa vermelha quando divergem.

⚠️⚠️ **A régua de pontuação tem VERSÃO, autor, data e vigência**, e a vigência não
pode ser anterior ao mês corrente. ~~Quem a edita é o **gestor do próprio time**~~
**Desde 11/09/2026 a régua é GERAL** (Configurações → Régua de pontuação; só o dono e a
Diretoria alteram) e a de cada setor é gerada por ela — ver §8. Antes: gestor do time
(decisão do dono) — o registro é o que separa "mudamos o critério" de "mudei a
nota dele". Pelo mesmo motivo, o **mínimo e o máximo por tarefa mostram quantos
serviços cada um tirou da conta**: o mínimo só sobe a média (e os pontos), o
máximo só desce, e um filtro que mexe na nota da própria equipe sem rastro seria
a porta mais fácil do sistema.

✅ **A decisão do setor sobre cada tipo atravessa os meses (08/09/2026).** Ela já
era durável — a chave é `setor + tipo`, fora do lote —, mas o sistema não sabia
dizer o que ninguém tinha olhado. Ver o `CHANGELOG` de 08/09. Em resumo: entrou
`revisadoPor/revisadoEm` (o ✓ de "conferi, e está certo", que era indistinguível
de "ninguém olhou"), `pontosNaRevisao` (o valor **acompanha** a planilha, por
decisão do dono, e a tela avisa quando se afasta do conferido), `tarefaNorm` (a
decisão se perdia por uma maiúscula trocada no export) e a prévia da importação
passou a mostrar os tipos novos antes de confirmar.

**O que falta nesta frente:**

- ⚠️⚠️ **A pontuação mensal AINDA NÃO É CALCULADA pela régua.** Os 15 meses do
  Legal estão gravados como `origem: 'informado'` (vieram na planilha, feitos à
  mão por um critério anterior). A conta existe em `lib/servicos/pontuacao.ts` e a
  régua existe — falta rodá-la por competência e gravar como `'calculado'`.
- ⚠️⚠️ **O FATOR de 0,5 ponto por minuto precisa de decisão.** Medido: agosto de
  2026 daria **4.639 pontos à Marcia Borges e 3.787 ao Ezequiel**, contra uma base
  mensal de 100 e uma advertência de −15 — a metade disciplinar da régua ficaria
  invisível. O campo é editável; o número não foi decidido.

  ⚠️⚠️ **E `pontuacao_regra` está VAZIA**: o 0,5 é o padrão do código, não uma
  decisão gravada, e os 72 ajustes do Legal foram feitos olhando pontos derivados
  dele. Criar a régua com outro fator muda **os 74 tipos de uma vez**, e cada um
  vai aparecer como "mudou desde a revisão" — comportamento correto, e é bom
  saber antes. **Decida o fator antes de afinar tipo por tipo.**
- ⚠️⚠️ **Os limites cortam mais do que parece.** Medido em 08/09/2026: **44 dos 74
  tipos perdem mais da metade** dos serviços para o mínimo e o máximo, e **10
  perdem todos** (o `CANCELAMENTO` tem 33 min medidos em 78 serviços e limites de
  120–240 — nenhum sobrevive). Os 10 só não valem 1 ponto porque têm média
  lançada à mão. Está tudo na tela agora, mas ninguém decidiu se essa é a
  intenção: quando o corte é a regra, a média descreve a faixa que os limites
  escolheram, não o trabalho da equipe.
- **Duas grafias do mesmo serviço convivem** no catálogo (`TAXAS PREFEITURA
  (TFE/TFA) Emitir/emitir boletos`), com réguas divergentes (máx 240 e 237). A
  tela mostra e oferece copiar a régua de uma para a outra, mas **não funde** os
  dois tipos — cada um segue com a amostra dele. Fundir de verdade é acertar o
  nome no sistema de origem.
- O cálculo automático **depende do ponto**, que está 70 dias atrás do controle
  manual do Legal (aquele é de agosto; o import parou em 25/06). Provavelmente
  esse controle também precisa virar upload.
- O **vínculo nome→pessoa é por SETOR** e deveria cair para qualquer vínculo
  confirmado quando não houver um do próprio setor. Sem isso, cada setor refaz o
  mesmo trabalho — e dá para resolver no setor errado sem perceber.

### O acesso, hoje

`TALENTCARE_ACESSO_GESTAO=on` desde 10/09/2026: **16 pessoas** com papel `GESTOR`
(todo Gestor e Sub-encarregado ativo, mais a Rosemeire, que é `Colaborador` com
vínculo). `TALENTCARE_ACESSO_ABERTO` continua **off** — os ~70 colaboradores seguem
`SEM_PERMISSAO`, e virar essa chave segue sendo decisão do Daniel.

⚠️ `mapRole` (`lib/nexus.ts`) devolve `SEM_PERMISSAO` **antes** de olhar o vínculo.
Foi por isso que o Evandro, Gestor do Legal com dois vínculos gravados, não conseguia
entrar antes de estar na lista de ensaio — e é a razão de o degrau novo ter de somar
`ehChefia` à condição de saída, e não só ao `return` de baixo.

⚠️⚠️ **A Rosemeire não entra de fato.** Ela é `GESTOR` no banco e responde por Cozinha
e Limpeza, mas o e-mail dela é `@staff.local` — colaboradora avulsa, sem conta no AD e
sem senha que case. Cozinha e Limpeza ficam, na prática, **sem leitor**. Não é defeito
do acesso; é que não há a quem dar a conta.

**Como conferir depois de mexer na régua:**

```bash
ssh talentcare@192.168.0.78 'cd /var/www/talentcare && node --env-file=.env scripts/ensaio-acesso-gestao.mjs'
```

Ele forja a sessão de **cada** gestor e mede as duas réguas: 200 no setor dele, 403 no
setor do vizinho, `/ranking` e `/dashboard` fechados, e um colaborador de contraprova
que continua fora. Banco dizendo `role='GESTOR'` não prova nada disso.

## 7. Como o Daniel trabalha (o que economiza tempo)

- Ele **testa no navegador** e traz print. Entregue e peça a conferência — não invente
  que conferiu.
- Ele **decide**: quando houver duas leituras possíveis de um pedido, pergunte com as
  opções e uma recomendação. Ele responde rápido e direto.
- Ele **aceita más notícias**: quando você achar que um número está mentindo, diga com
  a medição na mão. Foi assim que cinco blocos de ficção saíram do sistema.
- Ele valoriza **um agente crítico** revisando a entrega, e pediu isso
  explicitamente. **O briefing pronto e o laço estão em
  [`docs/AGENTE-CRITICO.md`](AGENTE-CRITICO.md)** — use-o, não improvise: crítico sem
  briefing pede gráfico mais rico para dado falso, e sem regra de parada o laço nunca
  fecha.

## 8. ⚠️ O aviso mais importante

Este sistema mostra **advertência com motivo, atraso e nota de avaliação** de pessoas
reais. Antes de acrescentar qualquer coisa que viaje até o navegador, pergunte:
**quem pode ver isto?** — e confira, porque a resposta já esteve errada duas vezes, e
nas duas o código parecia certo.

## 8. A PONTUAÇÃO UNIFICADA (sessão de 08/09/2026) — leia se for mexer em nota

A pontuação mensal de uma pessoa (`pontuacao_mes`) passou a somar **três
metades**, e é o número que decide aumento.

> ⚠️⚠️ **DESDE 11/09/2026 A RÉGUA É GERAL** (decisão do dono): mora em **Configurações →
> Régua de pontuação**, e só o dono e a Diretoria alteram (`/api/regra-geral`). É UMA regra
> com **peso proporcional**: ponto por minuto e base iguais em todo setor; o atraso custa
> uma fração da **mediana de crédito do setor** (hoje 7,1% = 50 ÷ 700 do Legal), e as outras
> faltas são múltiplos do atraso (advertência 1,5×, mês limpo 2×, suspensão 2× a advertência,
> LGPD 3× e 6×). Salvar gera a `pontuacao_regra` de CADA setor com a mesma vigência, e grava
> a mediana usada (`pontuacao_regra_geral.medianas`). A fórmula mora em
> `lib/servicos/regra-geral.ts` (a mesma de `propor-pesos.ts`). O gestor NÃO edita mais a
> régua (`POST /api/servicos/regra` → 410); ele segue com a planilha e o tempo médio das
> tarefas. Prova: `scripts/ensaio-regua-geral.ts`. O que segue abaixo é o desenho anterior.

Antes de 11/09, cada setor tinha a sua régua, editada pelo gestor na tela
`/servicos?setor=<id>` (decisão do dono):

1. **Disciplina** — base + atraso + advertência + bônus de mês sem ocorrência
   (`pontuacao_regra` + `pontuacao_regra_item`). O Legal: base **0**, atraso
   −50, advertência −75, mês limpo +100, fator **0,1**.
2. **Serviços da planilha** — catálogo por tipo, `média × fator`
   (`lib/servicos/catalogo.ts`, `pontuacao_tarefa_ajuste`).
3. **Atividades dos sistemas do Nexus** — catálogo por tipo, `média × fator`
   (`lib/servicos/catalogo-atividades.ts`, `pontuacao_atividade`). Espelha
   `activityOf()` MENOS os serviços (que já são a 2ª metade).

⚠️⚠️ **A CONTA MORA EM UM LUGAR: `lib/servicos/calcular-mes.ts`** (`montar` +
`gravarMes`). A rota `/api/servicos/pontuacao` (tela) e o script
`scripts/rodar-mes.ts` (CLI) chamam essa lib — NÃO reimplemente a régua.

### Rodar/regravar um mês pela linha de comando (na produção .78)

```
npx --yes tsx@4 --tsconfig scripts/tsconfig.json scripts/rodar-mes.ts <departmentId> <AAAA-MM>            # ENSAIO, não grava
npx --yes tsx@4 --tsconfig scripts/tsconfig.json scripts/rodar-mes.ts <departmentId> <AAAA-MM> --gravar   # grava
```
Não há `tsx` instalado; `npx` baixa. O `scripts/tsconfig.json` aponta
`server-only` para um stub (ele não resolve fora do Next). Legal =
`cmq6vajf5000nnw4i1tko93pz`. **Agosto/2026 do Legal já foi gravado** com os pesos
que o Daniel calibrou.

### As quatro recusas do cálculo (todas em `calcular-mes.ts`)

Mês sem cobertura de ponto (o bônus iria para quem ninguém mediu), mês aberto,
o que o setor **informou** à mão (não se recalcula), e competência sem régua
vigente. Quem o ponto NÃO mede pontua por serviço+atividade, SEM a metade
disciplinar (nem base nem bônus) — a face invertida do `null`.

⚠️ Os pesos de atividade contam a **1** (piso) enquanto o gestor não define a
média; a tela avisa. Onde o sistema mede o tempo (WhatsApp 48 min, HelpDesk 183,
Chat 177, Gerência 46 — MEDIANA, não média, que o tempo decorrido infla), a
média vem pré-preenchida. As 13 do Legal sem tempo receberam estimativa
provisória e o Daniel calibrou.

## 8b. A ÁREA DE ENTREGAS e o que ela ensinou sobre os espelhos (09/09/2026)

`/entregas` é a área do setor Entregas (Elton e Gilberto), no espírito do Relatório
Geral da Gerência. Rota própria; o caminho é o botão **"Área da mensageria"** na linha
do nome do relatório do setor. Ver o `CHANGELOG` de 09/09 (fim, 6).

⚠️⚠️ **Ela veio depois de consertar três números que ia mostrar** — e os dois primeiros
valem para as outras nove fontes:

1. **Correção retroativa não volta pelo sync incremental.** O recorte é pelo **dia do
   evento**, não por quando o registro mudou. O km do Elton em agosto lia **1.028.354**
   contra **1.265** reais, porque o odômetro foi corrigido na Gerência três dias depois
   e o dia já tinha saído da janela. **212 dias divergentes em 4.609.**

   ⚠️ E o segundo modo, mais silencioso: **métrica NOVA nasce vazia no passado**
   (`viagens` estava zerada em 198 dias). Zero é um valor plausível.

   Conserto: `run-gerencia-sync.mjs --completo` (cron às 03:10, ao lado do incremental
   de :30). O ensaio é `scripts/diff-espelho-gerencia.mjs`, que é também o **molde**
   para conferir as outras fontes — **ninguém mediu se elas divergem**.

2. **O mesmo número com duas réguas em dois sistemas.** A jornada era
   `ended_at − started_at` no endpoint e outra conta no Relatório Geral: **577,2 h ×
   176,4 h** em agosto, para o mesmo homem. O `ended_at` recebe fecho tardio (um dia de
   344 h). O endpoint foi alinhado ao `reports.ts`. **A fronteira entre dois sistemas é
   onde a régua se duplica sem ninguém ver.**

3. **Afastamento não existe como estado em lugar nenhum da casa.** O Gilberto parou de
   verdade em 24/02/2026 — não era defeito de endpoint, como a dívida do `FONTES.md`
   supunha. Mas o Nexus só tem `active`/`inactive`, e ele está ativo: o painel não sabe
   distinguir "afastado" de "parou de trabalhar". A tela mostra **"—" com a data** em
   vez de zero; a cura de verdade é um estado no Nexus, e é **decisão do dono**.

✅ **`jornada_teto_min` está no ar** (09/09/2026): coluna aplicada, client
regenerado, sync religado, backfill completo rodado e diff em **0 divergências**.
Agosto do Elton: **176,3 h de total, 117,1 h medidas, 59,2 h de teto (34%)**.

⚠️ **A ORDEM do deploy de schema, que quase custou caro aqui:** `db push` →
`generate` → religar o código que usa o campo → `--completo` (a coluna nasce com
`DEFAULT 0` e o histórico inteiro mentiria) → `build` → `restart`. Eu inverti — subi o
código antes do schema — e o cron das :30 teria morrido calado com
`PrismaClientValidationError`. **Deploy de schema vem ANTES do código que o usa**, e
há dois lugares que fazem `SELECT *` nessa tabela (`app/api/employee-timeline`, que é
a ficha para onde a área de Entregas leva o clique, e o upsert do sync).

## 9. Frentes ABERTAS (08/09/2026)

- ✅ **SUSPENSÃO — RESOLVIDA em 10/09/2026, com os dados reais do DP.** 28
  suspensões, 15 pessoas, 2020→2026. A resposta para "substitui ou acrescenta"
  veio da medição: as **8 suspensões dentro da janela do ponto caem, todas as 8,
  no mesmo dia de uma advertência derivada** — são o MESMO fato, com o nome
  errado. Então **substitui**, e a trava mora também no `run-ponto-import.mjs`
  (que é wipe+rebuild e recriaria a advertência no próximo dump).
  O evento `suspensao` entrou na régua a **2× a advertência**. Ver o `CHANGELOG`
  de 10/09 e `scripts/importar-suspensoes.ts`.

  ⚠️ **A advertência derivada CONTINUA derivada** nos outros dias: a planilha só
  traz suspensões, e não há como saber quais advertências o encarregado perdoou.
  O aviso original vale para elas.

  ⚠️ **Um caso EM ABERTO:** "SAMIRA GONÇALVES MOREIRA" (29/11/2022) × "Samira
  Santos" (Contábil, desligada em 13/06/2026) — só o primeiro nome bate. Fora
  até o DP confirmar.

- ⚠️⚠️ **A NOTA GRAVADA ENVELHECE SOZINHA, e nada avisa.** Ela é o retrato do dia
  em que se rodou `rodar-mes.ts`, e as fontes por baixo continuam se mexendo:
  em 10/09, **8 de 61 notas de agosto** já estavam diferentes — 2 pela suspensão
  e 6 porque o backfill completo da Gerência trouxe atividade que o incremental
  nunca traria. **Rode `scripts/conferir-mes.ts <AAAA-MM>`** depois de qualquer
  carga que mexa em fonte; ele diz de quem é a diferença e de quanto, sem gravar.
- **A pontuação só foi rodada para o LEGAL.** Os outros setores têm a régua
  disponível mas ninguém rodou/calibrou. A lista do setor mostra "sem pontuação
  no mês" para eles.
- **O ponto é import à MÃO, sem cron** (dump MySQL do Axis). Ver
  `talentcare-ponto-import-armadilhas` na memória.
- Herdadas: `/relatorios` nunca saiu do "Em breve"; as dívidas do fim de
  `FONTES.md` (coorte sem volume, piso de tempo de casa, fonte parada por
  pessoa).

## 10. O que mudou de cara nesta sessão (para não estranhar)

- **Sexo** nasce no cadastro do **Nexus** e chega pelo diretório (era planilha
  de DP importada uma vez). Ver `nexus-sexo-no-cadastro` na memória.
- **Mapa de ocorrências virou CALENDÁRIO** (`app/(app)/CalendarioOcorrencias.tsx`),
  na ficha e no relatório do setor, obedecendo ao filtro; a cor do setor anda
  por nº de PESSOAS, a da ficha por minutos.
- **Card de meses** na barra de cima (3 fechados + Atual, dinâmico).
- **Relatório do setor**: head obedece ao filtro, botão da planilha na linha do
  nome, "precisa de atenção" removido, lista mostra **Pontuação do mês** (não
  atividade crua).
- **Ficha**: gráfico de pontuação com linha de base (aceita negativo);
  gravidade do atraso em faixas (≤5 / 6–30 / >30 min); advertência diz o ordinal
  ("2º atraso do mês").

