# CHANGELOG — TalentCare

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
