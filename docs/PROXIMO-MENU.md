# Próximo trabalho — tirar o menu lateral e trocar por uma janela de cartões

> ## ✅ FEITO em 11/09/2026 (noite) — ver o `CHANGELOG`, entrada (25)
>
> O menu lateral saiu; a janela de cartões está no ar. As decisões do §4, tomadas com o dono:
> **(1)** o selo e a prévia "VENDO COMO GESTOR" saíram; **(2)** a barra da Diretoria ficou SEM
> atalhos — Avaliações e Meu desempenho viraram cartões (grupo "Avaliação"); **(3)** o gestor
> ganhou a busca, recortada pelo alcance dele (`lib/alcance-recorte.ts`), e NÃO ganhou o
> botão; **(4)** o sino (falso) saiu.
>
> Onde está agora: a lista das telas em `lib/ui/menu.ts` (`GRUPOS_TELAS`, `cartoesDoMenu`,
> `TODAS_AS_TELAS` para o "voltar"); a janela em `app/(app)/JanelaMenu.tsx`; a barra e a
> janela em `app/(app)/navegacao.module.css`; a paleta numa classe só de cores, `.paleta`
> (`_visao/visao.module.css`). Provas: `scripts/ensaio-menu.ts` e a 5ª pergunta de
> `scripts/ensaio-acesso-gestao.mjs`. O texto abaixo é o roteiro como foi escrito.
>
> ⚠️⚠️ **O §4.3 abaixo está ERRADO** ("o dataset dele só tem o time dele"): o dataset do gestor
> traz a casa inteira — score, atividade, nascimento e sexo de todos; o recorte só zera ponto e
> disciplina. A busca é recortada à parte. Ver o aviso de privacidade no `CHANGELOG` (25).

> Escrito em **11/09/2026 (noite)** para o agente que continua. Leia antes, nesta ordem:
> [`CONTINUAR-AQUI.md`](CONTINUAR-AQUI.md) (o bloco do topo e as regras da casa, §2),
> este documento e [`PERIODO-E-DEPLOY.md`](PERIODO-E-DEPLOY.md) (como publicar).
> O histórico do que acabou de mudar está no `CHANGELOG.md`, entradas **(15) a (24)** de 11/09.

---

## 1. O pedido do dono (Daniel)

> "Quero tirar o menu lateral. Hoje, com ele recolhido, incluir o campo de busca; e onde está o
> sinal para fazê-lo aparecer, colocar um botão que, ao clicar, abra uma janela no centro da
> tela com os cards de cada opção que temos hoje no menu lateral — um card para cada sistema,
> um para Configurações, um para Departamentos, outro para o Dashboard e outro para
> Funcionários."

Traduzindo:
1. **Some o menu lateral** (a `<aside>` do `AppShell`).
2. A **barra de cima** passa a ser a navegação de todo mundo: a barra que hoje aparece com o
   menu recolhido, **mais o campo de busca** (`BuscaGlobal`), que hoje só existe na barra da
   Diretoria com o menu aberto.
3. No lugar do botão que "traz o menu de volta" (`PanelLeftOpen`), um botão que abre uma
   **janela central com cartões**: Dashboard, Funcionários, Departamentos, **um cartão por
   sistema** (Turnover, Assiduidade, ClassRoom, Rádio, WhatsApp, Consultoria Plus, HelpDesk,
   CIDE, Gerência, Chat Interno) e Configurações.

## 2. Como o dono trabalha (vale para esta frente)

- Ele confere no navegador e manda print. Sua prova é servidor: build, rotas, ensaio.
- Pedido em sequência curta; cada um: implementa → confere → build → publica → CHANGELOG →
  commit → push (dois espelhos; branch `master`) → responde em português simples, dizendo
  onde olhar.
- **Pergunte quando houver duas leituras** (com opções e uma recomendação). Ele responde
  rápido. Não invente regra.
- Antes de entregar tela, o **agente crítico** (`docs/AGENTE-CRITICO.md`).

## 3. Onde está o menu hoje — `app/(app)/AppShell.tsx`

| peça | o que é |
|---|---|
| `NAV_MAIN` | Dashboard, Funcionários, Departamentos (o resto saiu em 11/09 — ver os comentários) |
| `NAV_SYSTEMS` | os 10 sistemas, no grupo "Sistemas" que abre e fecha |
| `NAV_ADMIN` | só Configurações; aparece para **toda a Diretoria** (`!soMeuSetor`) |
| `OrigemProvider rotulos={[...NAV_MAIN, ...NAV_SYSTEMS, ...NAV_ADMIN]}` | ⚠️ os NOMES das telas para o "voltar" das telas de detalhe saem destas listas — **não apague as listas**; use-as como a fonte dos cartões |
| `recolhido` + `localStorage 'tc-menu'` + `alternarMenu` | o menu recolhido pela Diretoria |
| `semLateral = soMeuSetor \|\| recolhido` | quando a barra de cima vira a navegação |
| `Topbar` | a barra de cima; com `soMeuSetor` (= sem lateral) mostra os chips: setores da pessoa, **Avaliações**, **Meu desempenho** |
| `BuscaGlobal` (`app/(app)/BuscaGlobal.tsx`, conta em `lib/ui/busca.ts`) | a busca; hoje escondida quando `soMeuSetor` |

## 4. ⚠️⚠️ As armadilhas — decida com o dono ANTES de construir

1. **Recolher o menu hoje é o modo "VENDO COMO GESTOR".** Para a Diretoria, o menu recolhido
   não é só um menu escondido: é a prévia de como o gestor vê o sistema (os chips do setor da
   pessoa — o Daniel vê "TI" —, Avaliações, Meu desempenho, e o selo "VENDO COMO GESTOR").
   Sem menu lateral, a barra de cima vira a navegação **normal** da Diretoria. Pergunte:
   o selo e a prévia saem? O chip do setor da própria pessoa (TI) fica para a Diretoria?
   (Recomendação: tirar o selo e o modo prévia; manter Avaliações e Meu desempenho; o chip do
   setor só para quem não é Diretoria.)
2. **Gestor e sub-encarregado não podem ganhar os cartões da Diretoria.** Eles já não têm menu
   (decisão do dono de 03/09); a barra deles tem só os setores que avaliam, Avaliações e Meu
   desempenho. O `proxy.ts` barraria as rotas, mas cartão que leva a "acesso negado" ensina a
   não confiar na tela. Os cartões são da Diretoria (`!soMeuSetor`); **Configurações** é de
   toda a Diretoria (a aba da régua); as abas de cadastro dentro dela são só do dono.
3. **A busca para o gestor**: hoje ele não a vê. Ela respeita o alcance (o dataset dele só tem
   o time dele), então mostrar é seguro — mas é decisão do dono.
4. **Camadas (`z-index`)**: janela do sistema e lista de pessoas `60`; lista da busca `70`;
   painel lateral da pessoa `80`. A janela de cartões fica acima da busca (≈ `75`); Esc fecha;
   o foco entra nela; clicar num cartão fecha e navega.
5. **O painel principal usa `@container`** (`app/(app)/dashboard/_novo/painel.module.css`):
   as grades respondem à largura do CONTEÚDO. Sem os 240 px do menu, o conteúdo fica mais
   largo e os degraus mudam sozinhos — confira em 1366 e 1920 (lendo o CSS; o dono confere no
   navegador). ⚠️ Nada `position: fixed` dentro do `.painel` (container vira bloco de
   referência).
6. **`localStorage 'tc-menu'`** fica sem sentido — quem tinha "off" não pode cair num estado
   estranho. Ignore/limpe a chave.
7. **Os cartões de sistema** podem mostrar o nome e o ícone de `NAV_SYSTEMS` (já são os mesmos
   do menu). Número dentro do cartão só se for real e do período — regra (b) da casa; na
   dúvida, sem número.

## 5. O que reaproveitar

- Os ícones e rótulos das listas `NAV_*` (uma fonte só — a do "voltar" também).
- O desenho de cartão da paleta nova: `app/(app)/_visao/visao.module.css` (`.cartao`,
  `.clicavel`) e `ui.tsx` — o painel e o relatório do setor já usam.
- A janela modal de referência: `app/(app)/_visao/Detalhe.tsx` (`JanelaDetalhe`: Esc, foco,
  clique fora, altura fixa).

## 6. Como provar e publicar

- `npx tsc --noEmit` (há 3 erros antigos: `admin/staff`, `next.config` — ignore) e
  `npx next build` locais.
- Deploy: `rsync -az --files-from=<lista>` para `talentcare@192.168.0.78:/var/www/talentcare/`
  (NUNCA `rsync arquivo host:/dir/`, achata o caminho), depois `npm run build` e
  `sudo -n systemctl restart talentcare` no `.78` (chave `~/.ssh/talentcare_key`). Arquivo
  movido/removido: apague a cópia velha no servidor.
- Ensaios (todos limpos em 11/09): `ensaio-painel-novo.ts`, `ensaio-regua-geral.ts`,
  `ensaio-busca.ts` (tsx) e os três `.mjs` do setor. ⚠️ O `ensaio-regua-geral` confere que o
  HTML do painel **não** tem `href="/servicos"` — mantenha os cartões sem link para `/servicos`.
  Acrescente ao ensaio: a Diretoria recebe os cartões; o gestor não.
- ⚠️ Script ad-hoc que forja sessão e é subido à produção é barrado pelo classificador; o
  COMMITADO no repositório roda. Para medir sem sessão: `psql` só leitura no `.78`.
- `git push origin master` às vezes trava empurrando para os dois espelhos juntos — empurre
  para cada URL separada e confira com `git ls-remote`.

## 7. Pronto é

- [ ] Sem menu lateral; barra de cima com busca + botão da janela de cartões.
- [ ] Janela central com os cartões (Dashboard, Funcionários, Departamentos, 10 sistemas,
      Configurações), tema claro/escuro, responsiva, teclado (Esc, Tab, Enter).
- [ ] Gestor sem os cartões da Diretoria; decisões do §4 tomadas com o dono.
- [ ] Build local e no servidor limpos; ensaios limpos; crítico; CHANGELOG; commit; push.
