# CHANGELOG — TalentCare

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
