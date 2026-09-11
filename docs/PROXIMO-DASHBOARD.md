# Próximo trabalho — refazer o PAINEL PRINCIPAL (`/dashboard`) no molde do relatório do setor

> Escrito em **11/09/2026** para o agente que continua o trabalho. Leia antes, nesta ordem:
> [`CONTINUAR-AQUI.md`](CONTINUAR-AQUI.md) (as regras da casa),
> [`RELATORIO-DO-SETOR.md`](RELATORIO-DO-SETOR.md) (o molde que você vai repetir) e
> [`PERIODO-E-DEPLOY.md`](PERIODO-E-DEPLOY.md) (como publicar sem quebrar).

> ## ✅ FEITO em 11/09/2026: o painel novo É o `/dashboard`
>
> Prévia aprovada pelo dono e, em duas rodadas, pelo agente crítico; registro no `CHANGELOG`
> de 11/09 (15) e (16). O de antes ficou em `/dashboard/anterior` (por endereço); `/novo`
> redireciona. O que mudou em relação a este roteiro:
> - peças comuns em `app/(app)/_visao/` (`visao.module.css`, `ui.tsx`, `tipos.ts`,
>   `Detalhe.tsx`); a janela aceita a casa inteira (`useEmJanela()`) e a Escolaridade
>   (`formacao/Resumo.tsx`);
> - contas de tela em `lib/painel/visao.ts`; prova em `scripts/ensaio-painel-novo.ts` (tsx);
> - selo **só em Atrasos** (dias medidos, mesmo nº de dias com expediente, mesmas pessoas,
>   base ≥ 10, ≤ 124 dias) — o de Advertências mentia pelo corte do mês;
> - grades por `@container` (o menu lateral come 240 px); assiduidade da casa com calendário
>   (`/api/assiduidade-mapa`, escala 1–4/5–7/8–10/11+); Chat e Gerência na faixa de sistemas.
> - ⚠️ **PENDENTE com o dono:** o que a barra do WhatsApp abre (a barra é a FILA, a janela do
>   setor são as ATENDENTES — Recepção 127 × 246 em 30 dias; hoje não abre nada); e se o selo
>   deve comparar **por dia de expediente** quando há feriado de um lado (hoje some).

---

## 1. O pedido do dono (Daniel)

> "Refatorar a página principal do sistema, seguindo os moldes que fizemos com a página dos
> departamentos, sendo interativa e dando opção de clique para a Diretoria ver o resumo de cada
> item sem precisar ir para a página real do resumo — assim como fizemos nos departamentos."

Traduzindo o que "o molde" quer dizer (tudo isso já existe e é para **reutilizar**):
1. **Desenho novo**, da imagem conceito (seção 3), com a paleta nova — não a do TalentCare.
2. **Todo número com gente atrás abre quem** (lista de pessoas, na própria página).
3. **Todo bloco de sistema abre o resumo daquele sistema numa janela**, sem sair da página.
4. **Todo nome abre o painel da pessoa** (o que ela fez naquele sistema no período).
5. **Os números são os mesmos da página de hoje** — muda o desenho, não a conta.

O dashboard é **só da Diretoria** (o `proxy.ts` manda quem não é ADMIN para `/meu-setor`).

## 2. Como o dono trabalha nesta frente

- Ele manda uma **imagem conceito** e diz "siga até as cores". Da primeira vez, ele aprovou uma
  **prévia em paralelo** (`/departamentos/<id>/novo`) e só depois pediu a troca. Faça igual:
  suba a página nova num endereço paralelo (ex.: `/dashboard/novo`), com um atalho só para ele,
  e **só troque quando ele disser**.
- Dado de exemplo da imagem **não se inventa**: a tela mostra o que o banco tem. Diga no fim o
  que do conceito não existe nos dados.
- Ele **confere no navegador**. Você não abre o Chrome a não ser que ele peça (memória
  `conferencia-no-navegador-e-do-daniel`). Sua prova é servidor: rota, banco, build, ensaio.
- Ele pede mudanças em sequência curta ("de outra cor", "centralize", "adapte ao card"). Cada
  uma: implementa, confere, commita, publica, descreve em linguagem de gente.

## 3. A imagem conceito (descrita — você não vai vê-la)

⚠️ **Peça ao Daniel para anexar a imagem** logo no começo. Enquanto isso, esta é a descrição:

Mesma linguagem visual do relatório do setor: fundo cinza-azulado, cartões brancos com borda
fina e sombra leve, azul como cor principal, cada indicador com um **azulejo de ícone** em cor
suave.

- **Cabeçalho:** "Painel de Indicadores" (pequeno) / **"Grupo Itamarathy"** (grande) /
  "Visão geral do desempenho da equipe, serviços e produtividade". À direita: "Período: 01 de
  ago. a 31 de ago. de 2026" e "Dados até 08/09/2026 (há 2 dias) · Ponto".
- **5 KPIs em linha**, cada um com azulejo colorido, rótulo, número grande, um **selo de
  variação** no canto (▲ 3%, ▼ −1,2 p.p., ▲ 12%…), uma linha de contexto e uma **mini
  sparkline** na cor do cartão:
  Headcount (azul, pessoas) · Turnover (verde, seta) · Advertências (laranja, alerta) ·
  Atrasos (vermelho, relógio) · Suspensões (roxo, martelo — **roxo é suspensão no sistema**).
- **Linha 2:** "Atendimentos por departamento" (ícone WhatsApp verde; barras horizontais
  coloridas por setor com o número à direita; "ver resumo ›") | "Curva de turnover" (área
  vermelha com pontos por dia, eixo 0–12%; no canto "4,7%" grande e selo "▼ −1,2 p.p.").
- **Linha 3 (três cartões):** "Destaque por departamento" (troféu; lista numerada 1–7 com foto,
  nome, "Setor · cargo" e pontos em laranja; "ver todos ›") | "Distribuição por escolaridade"
  (rosca com "38% Sup. (cursando)" no centro e legenda com quadradinhos coloridos e contagens;
  "ver ›") | "Gerações" (barra empilhada colorida + linhas: Geração Z 14–29 anos 37 43%,
  Geração Y 30–45, Geração X 46–61, Baby Boomers 62–80, Não informado; "ver ›").
- **Linha 4:** "Comparativo por gênero", largura total — barra dividida azul/rosa e dois
  painéis (Masculino 23 (27%) · idade média · score médio | Feminino 63 (73%) · idem).
- **Linha 5:** "Sistemas e produtividade · Dados consolidados dos sistemas · agosto de 2026" —
  cinco cartões lado a lado: ClassRoom (cursos criados por setor, barras), Rádio (horas por
  setor, barras), Consultoria Plus (tabela Estudos/Chamados/Mensagens/Comentários por setor com
  total), HelpDesk (tabela Abertos/Resolvidos por setor com total e tempo médio), CIDE
  (empresas atendidas por setor, barras).

## 4. O que já existe e você deve reaproveitar

| peça | onde | uso no dashboard |
|---|---|---|
| paleta + grades | `app/(app)/departamentos/[id]/_visao/novo.module.css` | ⚠️ tire para um lugar comum (ex. `app/(app)/_visao/`) em vez de importar de dentro do setor |
| Cartão, Azulejo, Mini, Chip | `_visao/ui.tsx` | idem |
| lista de quem (KPI) | `app/(app)/PainelPessoas.tsx` | o dashboard **já usa** — `lib/mock/dashboard.ts` monta `pessoas` por KPI |
| janela do sistema | `departamentos/[id]/Detalhe.tsx` | ⚠️ hoje exige `setor`; torne-o opcional — sem setor, é a casa inteira (ver 5) |
| resumos | `app/(app)/<sistema>/Resumo.tsx` | o conteúdo da janela |
| painel da pessoa | `app/(app)/PainelDaPessoa.tsx` (`usePainelDaPessoa`) | clique em nome |
| esqueleto/entrada | `EsqueletoResumo.tsx`, `.esqueleto`/`.entrada` em `globals.css` | carregamentos |
| números do painel | `lib/mock/dashboard.ts` (`buildDashboard`), `useScoreSignals`, `useAssiduidadePeriod`, `useFrescor` | **a mesma conta** — a página nova chama as mesmas funções |
| cartões por setor | `app/(app)/dashboard/*DeptCard.tsx` | base da linha "Sistemas e produtividade" |

## 5. Decisões de desenho que já estão tomadas pelo molde

- **Janela sem setor = modo "casa inteira".** Dentro dela o resumo precisa esconder o próprio
  cabeçalho (a janela já tem título). Hoje isso depende de `useRecorteSetor()` ≠ null. Crie um
  sinal "estou numa janela" separado do setor (ex. um contexto `useEmJanela()`), para os
  resumos esconderem o cabeçalho sem esconder as comparações entre setores — que, na casa
  inteira, **são** o conteúdo.
- **Barra de um setor** (Atendimentos por departamento, ClassRoom por setor…): clicar abre o
  resumo daquele sistema **recortado ao setor** — exatamente a janela do relatório do setor
  (`JanelaDetalhe` com `setor`). Ou leva ao relatório do setor; pergunte ao dono se houver dúvida.
- **KPIs:** o clique abre a lista de quem (já existe); variação e sparkline só se forem honestas
  (ver 6).
- **Escolaridade / Gerações / Gênero:** o clique no segmento abre a lista das pessoas daquele
  grupo (os dados estão em `useTalentData()` — demografia é retrato de hoje e **não** acompanha
  o filtro; a tela diz isso).
- **"Destaque por departamento":** nome → painel da pessoa; "ver todos" → `/ranking` ou uma
  lista na própria página.
- **Carregamento:** caixa de tamanho fixo + esqueleto + entrada de cima para baixo. Nunca
  mostrar o acumulado enquanto o período não chega.

## 6. Onde o conceito pode mentir — confira antes de desenhar

- **Selos de variação (▲ 3%, ▼ −1,2 p.p.)**: comparar com o período anterior mistura fontes que
  ainda não existiam — deu **+2756%** no relatório do setor. Use a regra de igual para igual
  (`lib/serie-periodo.ts`, `atividadeDoPeriodo` em `/api/dept-metrics`) e **nenhum percentual
  em janela longa**. Se não der para ser honesto, não mostre o selo e diga ao dono por quê.
- **Sparklines**: só com série real; a casa já removeu sparklines inventadas (`rnd(seed)`).
- **Score médio** (painel de gênero): o score **não foi validado** e saiu do topo do relatório
  do setor em 03/09. O dashboard de hoje ainda o mostra; pergunte antes de dar destaque.
- **Curva de turnover por dia**: turnover de 1 dia não existe; confira o que o gráfico de hoje
  de fato plota antes de redesenhar.
- **Taxa de turnover**: a página `/turnover` usa "saídas ÷ ativos" e o relatório do setor usa
  "saídas ÷ quem passou" (12,5% × 11,1% no Legal). É uma divergência antiga e **pendente** —
  não crie uma terceira conta.

## 7. Como publicar (resumo — o detalhe está em `PERIODO-E-DEPLOY.md`)

```bash
# 1. trabalhe em /home/suporte/talentcare (branch master), typecheck e BUILD LOCAL antes
npx tsc --noEmit && npx next build
# 2. envie só o que mudou, preservando o caminho (NUNCA `rsync arquivo host:/dir/`)
rsync -az -e 'ssh -i ~/.ssh/talentcare_key' --relative <arquivos> talentcare@192.168.0.78:/var/www/talentcare/
# 3. arquivo renomeado/removido: apague a cópia velha no servidor à mão
# 4. build + restart no .78
ssh -i ~/.ssh/talentcare_key talentcare@192.168.0.78 'cd /var/www/talentcare && npm run build && sudo -n systemctl restart talentcare'
# 5. CHANGELOG.md (seção no topo) + commit + push (dois espelhos no origin; branch master)
```

## 8. Pronto é

- [ ] Página nova em endereço paralelo, com a paleta do conceito, claro e escuro, responsiva.
- [ ] Todo KPI com gente atrás abre quem; todo bloco de sistema abre a janela; todo nome abre
      o painel da pessoa.
- [ ] Um **ensaio** (script em `scripts/`, no molde de `ensaio-detalhe-setor.mjs`) provando que
      os números da página nova = os da atual, e que o que o clique revela soma o número clicado.
- [ ] Build local e no servidor limpos; `journalctl -u talentcare -p err` vazio.
- [ ] CHANGELOG, commit, push; memória atualizada; resposta ao dono dizendo onde olhar e o que
      do conceito não existe nos dados.
