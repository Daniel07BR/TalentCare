# Avaliação mensal

A área onde **gente pontua gente**. O TalentCare já media a atividade de oito
sistemas; isto é a outra metade — o julgamento humano, de 0 a 10, uma vez por mês.

> **⚠️⚠️ A nota do gestor NÃO se mistura ao score.** O `score` (0–100) sai da
> atividade registrada nas oito fontes; a nota (0–10) é observação de uma pessoa
> sobre outra. Ficam lado a lado de propósito: **quando as duas discordam é que há
> algo a conversar**. A média das duas não seria nada.

---

## 1. Quem avalia quem

### O problema de origem

O grupo **não sabia** quem é gestor de quem. `employees.manager_id` e
`departments.manager_id` existem no Nexus e estavam **100% vazios** (0 de 150 e 0 de
17, medido em 02/09/2026). O dado não estava em outro lugar: não existia.

O que existe é uma **lista controlada de cargos** vinda do Nexus — `Diretor`,
`Gestor`, `Sub-encarregado`, `Colaborador`, `Aux. de T.I`, `T.I`, `Administrador`.

### A régua

O vínculo mora em **`setor_avaliador`** — uma linha `(setor, pessoa, nível)`, gravada.

```
nível `gestor`  → a pessoa é o topo daquele setor
nível `sub`     → sub-encarregado daquele setor
```

E a hierarquia:

| Quem é avaliado | Por quem |
|---|---|
| `gestor` do setor | **Diretoria**, sempre |
| `sub` | o `gestor` daquele setor |
| todo o resto | o `gestor` **ou** o `sub` |
| qualquer um em setor marcado `avaliadoPelaDiretoria` | **Diretoria** |

Mais duas regras: **ninguém se avalia**, e a **primeira avaliação publicada dá baixa
no mês**, seja de qual avaliador for.

> **⚠️⚠️ O nível mora no VÍNCULO, nunca no cargo lido na hora.**
>
> Derivar do cargo pareceria mais limpo e seria pior: poder de avaliar é poder sobre
> a carreira de alguém, e uma régua derivada **mudaria de mão sozinha** numa
> promoção — sem autor e sem aviso.
>
> E já estaria errada hoje. Dois casos reais:
> - a **Rosemeire** tem cargo `Colaborador` e é o topo da Limpeza e da Cozinha;
> - a **Débora Santos** estava `Sub-encarregado` no Nexus e `Gestor` no espelho do
>   TalentCare (o sync de diretório não tinha cron e estava 14 dias parado).
>
> O cargo **sugere**; gente confirma. A tela `/avaliadores` tem um botão que aplica a
> sugestão em massa nos setores ainda vazios — e ele **não** reescreve decisão já
> tomada.

> **⚠️ Avaliador de OUTRO setor é a regra, não a exceção.** Setor pequeno quase nunca
> tem o próprio avaliador dentro dele: a Limpeza é avaliada por alguém da Cozinha, e
> as Entregas pelo Gestor e pela Sub-encarregada do **Legal**. A tela busca em toda a
> empresa, e mostra o setor de origem ao lado do nome.

> **⚠️ "Cabe à Diretoria" é um caminho, não um rótulo.** Houve uma versão em que o
> painel *escrevia* "Avaliado pela Diretoria" e **nenhum diretor conseguia avaliar**
> aquela pessoa, porque a régua exigia vínculo com o setor. O rótulo prometia o que a
> régua não fazia — e a pessoa nunca seria avaliada, sem nada acusar.

---

## 2. Os critérios

Oito, lista fechada em `lib/avaliacoes/criterios.ts`:

**Entrega · Prazo · Iniciativa · Trabalho em equipe · Comunicação · Conduta ·
Melhoria e inovação · Liderança**

> **⚠️⚠️ `nota = null` quer dizer "NÃO SE APLICA", e não zero.** Critério nulo sai da
> média e o peso se redistribui sozinho (é a divisão pelo número de notas que
> existem) — o mesmo mecanismo do `Factor.nota` do score.
>
> Os dois últimos aceitam nulo com naturalidade, e é o que os mantém úteis:
> **Liderança** para quem não conduz ninguém e **Melhoria** num mês em que ninguém
> melhorou nada. Um 7 inventado para preencher campo entra na média como se fosse
> observação.

### As âncoras da escala

| Faixa | Significa |
|---|---|
| 0–4 | Abaixo do esperado |
| 5–6 | Atende em parte |
| 7–8 | **Atende — o esperado** |
| 9–10 | Acima do esperado |

Sem âncoras o 0–10 colapsa em "8 para todo mundo" em três meses, o gráfico vira uma
reta e a avaliação deixa de decidir qualquer coisa.

> **⚠️ Nota abaixo de 5 ou acima de 8 exige justificativa escrita**, e a regra vale
> **no servidor** — a rota recusa a publicação com `422`, não é validação de tela. É o
> freio mais barato contra a inflação de notas, e é o que dá conteúdo à conversa de
> aumento seis meses depois: um 10 sem motivo não prova nada, e um 3 sem motivo não se
> defende.

---

## 3. O ciclo de uma avaliação

```
rascunho ──publicar──> publicada ──corrigir──> publicada v2
   │                       │                        │
invisível              o avaliado vê          a v1 continua
ao avaliado            e dá ciência            visível, com o motivo
```

- **Rascunho** é invisível ao avaliado e **compartilhado** pelos avaliadores do setor:
  a linha é única por `(competência, avaliado)` e a baixa do mês é uma só.
- **Publicada não se edita.** Corrigir incrementa `versao`, **exige motivo**, guarda a
  versão anterior em `AvaliacaoVersao`, e as duas ficam visíveis para o avaliado.

> **⚠️ Uma nota que se reescreve em silêncio depois de a pessoa ler e comentar não é
> registro — é negociação, e vence quem insiste mais.**

### O que o avaliado pode fazer

Dar **ciência** e **comentar**. O comentário **não altera a nota**: fica ao lado dela,
permanente, e o avaliador é avisado.

> **⚠️ `AvaliacaoCiencia.versaoCiente` guarda de QUAL versão a pessoa deu ciência.**
> Se vier uma correção depois, a página dela pede ciência nova — senão a ciência de
> ontem cobriria um texto que ela nunca leu.

---

## 4. O alerta de quem falta

> **⚠️⚠️ "Quem falta avaliar" é DERIVADO, nunca gravado.** Avaliáveis **menos** quem
> tem avaliação publicada (`filaDaCompetencia`).
>
> Um campo `avaliado = true` só é escrito por um caminho, e no dia em que alguém
> trocar de setor, for admitido no meio do mês ou tiver a avaliação corrigida, o
> alerta fica aceso para sempre. **A primeira reação de quem recebe alerta eterno é
> parar de olhar o alerta.**

Quatro regras que evitam fila suja:

1. Só entra quem estava **ativo no último dia da competência** (quem saiu não é "não
   avaliado", é "não estava mais aqui").
2. Quem foi **admitido depois do dia 15** daquele mês não entra — cobrar isso do
   gestor é cobrar o impossível.
3. Quem está **`foraDoDiretorio`** não entra (§6).
4. **"Faltam" é o que EU posso fazer**, não a pendência da casa: um gestor do Fiscal
   não pode ser cobrado do Contábil, e o selo do menu perderia o sentido no 1º mês.

---

## 5. As duas réguas de acesso

São **duas**, e as duas precisam existir.

| | Onde | O que decide |
|---|---|---|
| **A porta** | `proxy.ts` (middleware, roda sem banco) | que **caminhos** o papel alcança |
| **O conteúdo** | `lib/avaliacoes/regua.ts` — **uma** função | que **dados** aparecem, pelo vínculo |

```
ADMIN        → a empresa toda
GESTOR       → o painel e a fila dos setores em que tem vínculo
COLABORADOR  → só a própria página de desempenho
SEM_PERMISSAO→ existe na lista, não entra
```

> **⚠️ Confiar só na porta** deixaria um gestor puxar a ficha de qualquer um trocando
> o `?id=` na URL — por isso `/api/employee-metrics`, `/api/employee-timeline` e
> `/api/dept-metrics` chamam `podeVer`.
>
> **⚠️ Confiar só na régua** deixaria um colaborador abrir o painel da empresa e ver
> os agregados.

> **⚠️ A lista do COLABORADOR é FECHADA** (`COLABORADOR_OK`), não uma lista de
> proibições: lista de proibições esquece a rota nova, e **a rota nova nasce aberta**.

> **⚠️⚠️ Quem MANDA na porta é o vínculo, não o cargo.** `mapRole(email, setor, cargo,
> temVinculo)` — `temVinculo` ganha do cargo. A Rosemeire é `Colaborador`: sem isso
> ela seria barrada da própria fila que administra. E `recalcularAcesso(userId)` roda
> **na hora** em que o vínculo muda, nos dois sentidos — o sync de diretório roda
> quando roda, e sem isso a pessoa bateria num 403 sem ninguém entender por quê.

### ⚠️⚠️ Abrir para todos está DESLIGADO

`TALENTCARE_ACESSO_ABERTO` fica `off`. Ligar põe ~87 pessoas dentro e **não se
desfaz**: o que foi visto foi visto.

#### As duas dívidas que bloqueavam — ✅ resolvidas em 03/09/2026

**1. O dataset do cliente levava o histórico disciplinar da empresa.**
`getTalentData()` não filtrava por quem lê, e o `layout` passava tudo ao
`TalentDataProvider` — no payload de **qualquer** página. Dentro: **732 advertências
de 73 pessoas, com o motivo escrito**, e 130 dias de atrasos por pessoa. As rotas da
ficha checavam `podeVer` e por isso ninguém via: a régua protegia a parte *menos*
sensível. Agora `getTalentData(alcance)` recorta, e o **`motivo` nunca sai do
servidor** — a lista vem de `/api/employee-metrics`, que confere `podeVer`.

**2. As rotas AGREGADAS devolviam a empresa inteira** para qualquer sessão. Onze
delas. A régua agora é **uma**, em [`lib/alcance.ts`](../lib/alcance.ts):

```
alcanceDeQuemLe()  →  { tipo: 'tudo' }  ou  { tipo: 'recorte', … }
porNexus · porPersonKey · porNome · porDeptNexus   ← os filtros prontos
```

⚠️ **O alcance sai dos VÍNCULOS, não do setor da pessoa.** O primeiro desenho somava
"o meu departamento", e o ensaio contra o banco mostrou o efeito: a Ana Carolina,
`Colaborador` do Fiscal, alcançaria as **31 pessoas do setor** — atividade, atrasos e
advertências de todo mundo — só por sentar lá. O dado do setor não é de quem trabalha
nele; é de quem responde por ele.

Medido depois do conserto: Gestor e Sub-encarregado do Fiscal alcançam **31 de 129**;
a Rosemeire (Limpeza + Cozinha) **6**; um colaborador sem vínculo, **1** — ele mesmo;
a Diretoria, tudo.

⚠️ O **snapshot do WhatsApp** ("pendentes agora") não se recorta — não tem setor nem
atendente, é um número só da casa. Fica apenas para quem alcança tudo: meio-número
seria pior que nenhum.

⚠️ `/api/classroom-courses` **não** foi recortada de propósito: ela devolve o catálogo
de cursos criados no período, que é artefato público da casa, e não dado por pessoa.

---

## 6. `foraDoDiretorio` — sumir do diretório ≠ ser desligado

A conta **`Axis Certificados`** (certificado digital, setor `Sistemas`, que o Nexus já
exclui do diretório) aparecia na fila do TI **como se fosse gente**.

O que a trouxe foi o próprio sync: ao ver que ela sumiu, ele a desligou e **carimbou
uma data de saída inventada** — o instante em que percebeu a ausência. A fila leu essa
data como "estava ativa durante a competência".

- **Desligamento de verdade** vem do Nexus com `status` e `terminationDate`. Essa
  pessoa **continua na fila, e deve**: trabalhou o mês e merece a avaliação dela.
- **Sumir do diretório** é o Nexus dizendo que aquilo não é (ou não é mais) gente da
  casa. `foraDoDiretorio = true`, e sai da fila.

> ⚠️ A marca tem a **volta**: some assim que a pessoa reaparece no diretório.

---

## 7. Onde está o quê

### Banco (`prisma/schema.prisma`)

| Modelo | O que guarda |
|---|---|
| `SetorAvaliador` | `(setor, pessoa, nível)` — quem avalia onde |
| `Avaliacao` | única por `(competencia, avaliadoId)`; status, versão, média, comentário |
| `AvaliacaoNota` | uma linha por critério — **tabela separada e não Json**, porque o gráfico por critério é o produto final |
| `AvaliacaoVersao` | o que a avaliação dizia antes de cada correção |
| `AvaliacaoCiencia` | a ciência do avaliado + o comentário dele |
| `Department.avaliadoPelaDiretoria` | setor cuja avaliação cabe à Diretoria |
| `User.foraDoDiretorio` | §6 |

### Código

```
lib/avaliacoes/criterios.ts   critérios, âncoras, exigeJustificativa, mediaDe, competências
lib/avaliacoes/regua.ts       quemEh · podeVer · podeAvaliar · quemAvaliaEssa · filaDaCompetencia
proxy.ts                      a porta (COLABORADOR_OK, SO_ADMIN)
lib/nexus.ts                  mapRole · recalcularAcesso · ACESSO_ABERTO
```

### Telas e rotas

| Tela | Quem alcança |
|---|---|
| `/avaliacoes` | Diretoria e avaliadores — a fila do mês, com selo de quantas faltam |
| `/avaliacoes/[id]` | o avaliador — resumo + formulário |
| `/minha-avaliacao` | **todo funcionário** — a nota dele, a evolução, a ciência |
| `/avaliadores` | só ADMIN — o vínculo, os níveis, o botão de aplicar sugestões |

```
GET  /api/avaliacoes                        a fila da competência
GET  /api/avaliacoes/[avaliadoId]           ler (rascunho só para quem avalia)
POST /api/avaliacoes/[avaliadoId]           salvar rascunho · publicar · corrigir
POST /api/avaliacoes/[avaliadoId]/ciencia   a ciência do avaliado
PATCH …/ciencia                             o avaliador marcou que leu
GET  /api/minha-avaliacao                   as publicadas da própria pessoa
GET  /api/avaliadores                       setores, avaliadores, sugestões
POST /api/avaliadores                       ligar/desligar avaliador · trocar nível
PATCH /api/avaliadores                      marcar/desmarcar "cabe à Diretoria"
PUT  /api/avaliadores                       aplicar as sugestões nos setores vazios
```

> **⚠️⚠️ `cabeADiretoria` é calculado do MESMO jeito** em `filaDaCompetencia` e na rota
> `[avaliadoId]`. Se as duas contas divergirem, a tela oferece o botão de avaliar e a
> rota responde 403 — o pior tipo de bug de permissão, porque parece defeito da tela.

---

## 8. Estado em 02/09/2026

Os 16 setores avaliáveis têm dono, e **zero pessoas sem avaliador**:

| Arranjo | Setores |
|---|---|
| Gestor + sub | Contábil · Fiscal · Legal · Pessoal · Imóveis · Entregas |
| Só gestor | TI · Financeiro · Recepção · Marketing · Programação · Limpeza · Cozinha |
| Cabe à Diretoria | Consultoria · Pousada |

Casos que valem lembrar: **Limpeza e Cozinha** são staff e a **Rosemeire** (Cozinha,
cargo `Colaborador`) avalia as duas; **Entregas** fica debaixo do **Legal** e é
avaliada pelo Evandro e pela Joice. Diretoria e Sistemas seguem fora da população
avaliada (`lib/hidden-depts.ts`).

Nenhuma avaliação publicada ainda — a área acabou de entrar no ar.
