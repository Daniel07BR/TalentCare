# Avaliação mensal — passo a passo para o agente que ajuda a preencher

> **Para quem é este documento:** o agente (Claude ou outro) que o Daniel chama todo mês
> para ajudar a redigir as avaliações dos funcionários no TalentCare. Leia **inteiro**
> antes de sugerir qualquer texto. Ele é a versão viva das regras — onde
> [`AVALIACOES.md`](AVALIACOES.md) discordar, **vale este**.
>
> Montado em 02/10/2026, a partir da primeira rodada real (T.I, setembro/2026: Yuri e Enzo).

---

## 1. O que você faz e o que você NÃO faz

| Você faz | Você NÃO faz |
|---|---|
| Junta os dados de cada pessoa (§3) | Escolher o nível no lugar do Daniel — **o nível é decisão dele** |
| Redige os textos prontos para colar (§5) | Gravar a avaliação direto no banco |
| Aponta incoerências (nível × fatos) antes de ele publicar | Mostrar ou sugerir **número** de qualquer tipo (§2) |
| Ajusta a linguagem ao perfil DISC da pessoa (§6) | Inventar fato que não está nos dados nem na fala do Daniel |

**Por que você não grava direto:** publicar pela tela registra **quem** avaliou e, numa
correção, guarda a versão anterior com o motivo. Escrever no banco pularia os dois. O
Daniel cola os textos na tela e publica. (Exceção já aberta uma vez, com pedido expresso
dele: separar itens de texto sem mudar conteúdo — e mesmo assim gravando a versão.)

---

## 2. As regras que valem (não negocie, não esqueça)

1. **Sem nota em número. Nunca.** Orientação dos psicólogos e psicanalistas que acompanham
   a empresa. Nem "8,7", nem "média", nem "de 0 a 10" — em texto, tela ou PDF. Fala-se
   em **nível**: *Abaixo do esperado · Atende em parte · Atende — o esperado · Acima do esperado*.
2. **Três pontos**, e o mesmo nível de detalhe nos três:
   - **Entrega — o resultado:** o que ficou pronto no mês (volume, qualidade, prazo).
   - **Atitude — o jeito de trabalhar:** age sem ser cobrado, assume, **segue as regras
     da casa** (pontualidade entra AQUI).
   - **Equipe e comunicação:** ajuda, divide o que sabe, responde, se faz entender.
3. **Observação:** obrigatória em **Abaixo** e **Acima**; opcional (mas recomendada) em
   **Em parte** e **Atende**. Sempre com fato do mês (§5).
4. **Resultado do mês** = o nível que **mais se repete** entre os três pontos (dois
   "Atende" e um "Acima" → **Atende**). Três diferentes → o **do meio**. O sistema calcula
   sozinho; você só precisa saber explicar.
5. **Gestor não é avaliado** — nem pela Diretoria. Ele não aparece na fila.
6. **Combinados para o próximo mês:** **até 3 itens**, um apontamento por item, cada um
   observável e cobrável no mês seguinte. O que não couber vai para o recado.
7. **"Só para a gestão"** (quero na equipe / pronto para mais / corre risco + anotação):
   **nunca** vai para o funcionário nem para o PDF. Responde-se pelo que o gestor
   **faria**, não pelo que acha.
8. **Depois de publicar, ainda se corrige** (com motivo, a versão anterior fica). **Depois
   de anexar o documento assinado e concluir, nada muda mais.**

O método por trás (para explicar a quem perguntar): escala ancorada em comportamento
(BARS), feedback Situação → Comportamento → Impacto (SBI), níveis com nome sem número.
Fontes e o que cada uma garante: `lib/avaliacoes/metodo.ts` (`BASE_CIENTIFICA`).

---

## 3. Juntar os dados — o script de insumos

Rode **no servidor do TalentCare** (`192.168.0.78`, chave `~/.ssh/talentcare_key`). Ele só
lê; não grava nada.

```bash
ssh -i ~/.ssh/talentcare_key talentcare@192.168.0.78 \
  'cd /var/www/talentcare && node --env-file=.env scripts/insumos-avaliacao.mjs --setor=TI'
```

- Sem `--competencia`, avalia o **mês fechado** (em outubro, avalia-se setembro).
- Para outro mês: `--competencia=2026-10`. Para outro setor: `--setor=Fiscal` (nome do setor).

Para cada pessoa avaliável ele mostra: **atrasos dia a dia** (com minutos), **abonados**
(não contam), **advertências**, outras medidas, o **DISC**, a **avaliação do mês anterior**
(níveis e **combinados** — o que se cobra agora) e se a deste mês já existe.

O que o script **não** traz, e você pergunta ao Daniel: **o que ele observou no mês** —
entregas, situações, elogios, problemas. Os sistemas medem presença e volume; a avaliação
é sobre o que um gestor viu. A frase dele ("sempre disposto a ajudar, com entusiasmo e
sorriso no rosto") vale mais que qualquer contador.

---

## 4. Atrasos e advertências — leia isto antes de escrever

⚠️⚠️ **A advertência NÃO é um fato a mais.** O sistema DERIVA a advertência dos atrasos:
**a partir do 2º atraso do mês, cada atraso conta uma advertência**. Então:

| Atrasos no mês | Advertências que aparecem |
|---|---|
| 1 | 0 |
| 2 | 1 |
| 4 | 3 |

Escrever "3 advertências e 4 atrasos" como se fossem 7 coisas é erro — e o funcionário
contesta com razão. Ligue os dois: os atrasos **geraram** as advertências.

### ⚠️⚠️ O PADRÃO DO TEXTO (definido pelo Daniel em 02/10/2026 — siga sempre)

**Só a contagem do mês — sem dias, sem horários, sem minutos.** O script de insumos mostra
o detalhe para VOCÊ conferir; ele não vai para o texto. O modelo, como o Daniel escreveu:

> *"O critério deste ponto inclui seguir as regras da casa, e a pontualidade é uma delas.
> Em setembro foram 4 atrasos na entrada e isso gerou 3 advertências. Por outro lado, houve
> comprometimento: em vários dias você adiou o seu almoço para não deixar demandas urgentes
> paradas."*

A estrutura: **regra da casa → contagem do mês ("X atrasos e isso gerou Y advertências") →
o lado positivo do mesmo ponto**, quando houver. Com 1 atraso só, não há advertência: diga
"houve 1 atraso na entrada". Mesmo para o perfil Conforme (C), que gosta de dados, a
precisão vem do **critério** e da contagem — não da lista de datas.

Outros cuidados:
- **Abonado não conta contra** — não cite.
- **Período:** a ficha da pessoa abre em "30d" (dia 2 a dia 2). Para a avaliação use o
  **mês cheio** (botão do mês, ex. "Set") — o script já usa.
- **Onde entra:** no ponto **Atitude** ("segue as regras da casa"). Pela régua da T.I,
  "Atende" pressupõe **avisar antes** quando vai atrasar. Atraso grande sem aviso pesa
  contra "Atende"; vários atrasos tornam "Acima" em Atitude **indefensável**. Diga isso
  ao Daniel antes — a decisão é dele.

---

## 5. Como escrever cada campo

**Formato SBI em toda observação:** *Situação* (quando/onde) → *Comportamento* (o que a
pessoa fez) → *Impacto* (o efeito). Fato do mês, nunca rótulo de personalidade.

| Evite | Prefira |
|---|---|
| "Ele é rude com os outros setores." | "Em alguns atendimentos a forma de responder passou impressão de impaciência, e a pessoa ficou sem entender o que foi feito." |
| "Sempre atento." | "Em setembro percebeu por várias vezes que precisava sair mais tarde para o almoço, e com isso nenhuma demanda urgente ficou parada." |
| "Má vontade." | o comportamento observável e o efeito dele |

- **Fale com a pessoa** ("você"), em tom de conversa — ela vai ler e assinar.
- **"Acima"** precisa de algo que **foi além do pedido** (resolveu a causa, automatizou,
  ensinou alguém). Fazer bem o que se espera é **"Atende"**.
- **Recado do mês:** reconhecimento + o rumo do próximo mês, em um parágrafo. Pode citar o
  que não coube nos combinados.
- **Combinados (até 3):** cada um um campo; verbo de ação; dá para conferir no fim do mês
  ("Atualizar o HelpDesk com todos os equipamentos que temos"), e não intenção vaga
  ("melhorar a organização").
- **Mudança de função/tarefa nova** (ex.: começar a atender chamados de programação):
  diga por que, por onde começa e que haverá apoio.
- Se a avaliação já está publicada, entregue também o **motivo da correção** pronto.

---

## 6. A linguagem pelo DISC da pessoa

O DISC está no script (§3) e na ficha (botão DISC). O texto de cada perfil — como falar,
como elogiar, como cobrar, o que motiva e o que trava — está em
**`lib/disc/perfis.ts`** (`PERFIS.D/I/S/C`: `comoFalar`, `elogios`, `comoElogiar`,
`comoCobrar`, `cobrancaModelo`, `motiva`, `trava`). **Leia o do perfil predominante
(e do segundo, se estiver perto) antes de escrever.** Em resumo:

| Perfil | Elogie | Cobre | Evite |
|---|---|---|---|
| **D — Dominante** | o resultado e o impacto, curto | meta e prazo claros; deixe o COMO com ele | microgestão, conversa longa |
| **I — Influente** | com frequência, o entusiasmo e o efeito nas pessoas | com leveza, mostrando o efeito no grupo | silêncio da liderança, frieza |
| **S — Estável** | a constância, o "posso contar com você", em particular | com calma, explicando o PORQUÊ; tempo de adaptação | pressão, mudança brusca sem explicação |
| **C — Conforme** | a precisão e a qualidade, com fatos | com dados e critério claro | crítica vaga, pressa sem critério |

Sem DISC aplicado: tom neutro, calmo e específico.

---

## 7. O fluxo do mês (do começo ao fim)

1. **Rode o script de insumos** (§3) do setor.
2. **Pergunte ao Daniel** o que ele observou de cada pessoa e qual nível dá em cada ponto.
3. **Confira a coerência** nível × fatos (§4) e avise antes de redigir, se houver conflito.
4. **Redija** os textos (§5, §6), cada um num bloco de código para colar.
5. O Daniel **cola na tela** (`/avaliacoes` → a pessoa; ou a área do setor →
   clicar no nome → "Avaliar <mês>") e **publica**.
6. **Gerar PDF para assinar** (cartão da pessoa, à esquerda) → imprimir → conversa →
   funcionário escreve as observações → **as duas assinaturas e datas**.
7. **Anexar** frente e verso (fotos) **ou** um PDF único escaneado → **Concluir avaliação**
   (trava tudo).

Corrigiu depois de imprimir? **Gere o PDF de novo** — o papel tem de ser da versão atual.

---

## 8. Exemplos reais (setembro/2026, T.I)

### Enzo — Entrega: Atende · Atitude: Atende · Equipe e comunicação: Acima → **Atende**
DISC: **Estável** (S 34%) com **Influente** quase empatado (I 32%). 2 atrasos (dia 8, 3 min;
dia 30, 105 min) → 1 advertência.

- **Equipe e comunicação (Acima):** *"Em setembro, sempre que alguém precisou de suporte,
  você ajudou com entusiasmo, paciência e um sorriso no rosto, inclusive fora da sua fila.
  Com isso, os colegas dos outros setores se sentem acolhidos ao pedir ajuda à T.I, e o
  clima do atendimento melhora para todos. Esse jeito de tratar as pessoas vai além do que
  o cargo pede."* — elogia o efeito nas pessoas (I) e a confiabilidade (S).
- **Atitude (Atende), com os atrasos:** *"Você assume o que é seu e está sempre disposto a
  ajudar. Em setembro foram 2 atrasos na entrada e isso gerou 1 advertência. Sabemos que
  imprevistos acontecem; o que pedimos é chegar no horário e, quando não for possível, avisar
  antes, para que a equipe possa se organizar."* — cobra com calma e explica o porquê (S).
  (Sem dias nem minutos: o padrão de §4.)
- **Combinados:** (1) organizar o departamento; (2) atualizar o HelpDesk com todos os
  equipamentos; (3) começar a atender chamados de programação, pelos mais simples e com
  acompanhamento — a mudança vem com por onde começar e apoio (S).

### Yuri — Entrega: Acima · Atitude: Atende · Equipe e comunicação: Em parte → **Atende**
DISC: **Conforme** (C 29%) — elogio específico (o QUE ficou bom e por quê), cobrança pelo
critério e pelo fato, falando do trabalho e nunca da pessoa. 4 atrasos → 3 advertências (o
mesmo fato). Começou com Atitude "Acima"; com os atrasos, o "Acima" ficou indefensável e foi
corrigido (versão com motivo).

- **Atitude (Atende):** o modelo de §4, escrito pelo Daniel.

- **Equipe e comunicação (Em parte):** *"Dentro da T.I você colabora bem: divide o que sabe e
  ajuda os colegas quando aparece um problema. O ponto a melhorar é o atendimento aos outros
  setores: em alguns casos o problema foi resolvido, mas a forma de responder passou a
  impressão de impaciência, e a pessoa ficou sem entender o que foi feito. Explicar em
  linguagem simples e confirmar se ela ficou atendida é o que leva este ponto para
  'Atende'."* — diz o que falta para subir de nível.
- **Combinados:** (1) nos atendimentos a outros setores, ouvir até o fim, explicar em
  linguagem simples e confirmar se a pessoa ficou atendida; (2) chegar no horário todos os
  dias e, se houver imprevisto, avisar antes.

---

## 9. Onde mora cada coisa (para quem for mexer no sistema)

| O quê | Onde |
|---|---|
| Critérios, níveis, `resultadoDe` (o que mais se repete) | `lib/avaliacoes/criterios.ts` |
| Método, régua escrita por setor (T.I), base científica, perguntas da gestão, combinados | `lib/avaliacoes/metodo.ts` |
| Quem avalia quem, população (gestor fora) | `lib/avaliacoes/regua.ts` |
| Tela de avaliar | `app/(app)/avaliacoes/[id]/page.tsx` |
| PDF para assinar | `app/(app)/avaliacoes/TermoImpresso.tsx` + `/api/avaliacoes/[id]/termo` |
| Área do setor / pessoa / janelas | `app/(app)/avaliacoes/setor/` + `lib/avaliacoes/painel.ts` |
| Insumos do mês (este guia, §3) | `scripts/insumos-avaliacao.mjs` |
| DISC (texto por perfil) | `lib/disc/perfis.ts` |
