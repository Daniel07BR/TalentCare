# Continuar daqui — passagem de bastão

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

### A chave que ainda não foi virada

`TALENTCARE_ACESSO_ABERTO` está **off**: só a Diretoria (10 pessoas) e quem estiver na
lista de ensaio entram. As duas dívidas que a bloqueavam foram fechadas em 03/09 (o
vazamento do payload e as 11 rotas agregadas), e o caminho do gestor foi **percorrido
por uma pessoa de verdade** — a **Joice Rocha**, Sub do Legal, via
`TALENTCARE_ACESSO_TESTE`.

⚠️ Virar a chave põe ~87 pessoas dentro e **não se desfaz**. É decisão do Daniel, não
sua.

## 6. O que vem a seguir

O Daniel estava seguindo por **telas e relatórios**. Pendências conhecidas:

- **`/relatorios`** nunca saiu do "Em breve".
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
pode ser anterior ao mês corrente. Quem a edita é o **gestor do próprio time**
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

`TALENTCARE_ACESSO_ABERTO` continua **off** — e virar essa chave segue sendo
decisão do Daniel. Quem entra: a Diretoria (por setor) e a lista nominal
`TALENTCARE_ACESSO_TESTE`, hoje com **Joice Rocha e Evandro Padilha**.

⚠️ `mapRole` (`lib/nexus.ts:95`) devolve `SEM_PERMISSAO` **antes** de olhar o
vínculo. Foi por isso que o Evandro, Gestor do Legal com dois vínculos gravados,
não conseguia entrar: ele não estava na lista de ensaio. Acrescentar alguém à
lista é a saída reversível; a chave grande não é.

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
