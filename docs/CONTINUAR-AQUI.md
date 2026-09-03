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
- ⚠️ **O ponto está parado.** É a única das dez fontes **sem cron** (import à mão) e
  terminava em **25/06/2026** com os oito espelhos de atividade todos em 03/09. Em
  "7 dias", "30 dias" e "Trimestre atual" não há uma linha — as telas hoje dizem
  isso em vez de mostrar zero, mas o dado continua faltando.

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
