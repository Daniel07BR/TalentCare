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
"Assiduidade 100%" para quem não tem registro de ponto e "Atividades concluídas 0" em
verde para quem não passa por fonte nenhuma. Mostre "—" e diga por quê.

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
- Os **deltas dos KPIs** do dashboard (`+3`, `+12%`) e as **sparklines** ainda são
  literais/`rnd`; a sparkline dos cartões da lista de departamentos também.
- O **dashboard** e o **`/ranking`** não passaram pela mesma revisão que o relatório
  de setor e a ficha.

## 7. Como o Daniel trabalha (o que economiza tempo)

- Ele **testa no navegador** e traz print. Entregue e peça a conferência — não invente
  que conferiu.
- Ele **decide**: quando houver duas leituras possíveis de um pedido, pergunte com as
  opções e uma recomendação. Ele responde rápido e direto.
- Ele **aceita más notícias**: quando você achar que um número está mentindo, diga com
  a medição na mão. Foi assim que cinco blocos de ficção saíram do sistema.
- Ele valoriza **um agente crítico** revisando a entrega. Foi usado nesta sessão com
  duas regras que funcionaram: dar-lhe o **briefing** (o que é medição e o que é
  ficção, senão ele pede gráficos mais ricos para dados falsos) e uma **regra de
  parada** — só reportar o que mudaria a decisão de quem usa a tela, e dizer quando um
  bloco acabou.

## 8. ⚠️ O aviso mais importante

Este sistema mostra **advertência com motivo, atraso e nota de avaliação** de pessoas
reais. Antes de acrescentar qualquer coisa que viaje até o navegador, pergunte:
**quem pode ver isto?** — e confira, porque a resposta já esteve errada duas vezes, e
nas duas o código parecia certo.
