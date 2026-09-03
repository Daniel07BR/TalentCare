# CHANGELOG — TalentCare

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
