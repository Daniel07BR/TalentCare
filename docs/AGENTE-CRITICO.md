# O agente crítico — como usar

O Daniel pediu, em 02/09/2026, que **um segundo agente analise o serviço feito e seja
crítico, sempre solicitando melhorias, até ver que não tem mais onde evoluir**. Foi
usado no relatório de departamento e na ficha do funcionário, e **achou defeito real**
que passou por mim. Este documento é o que aprendi fazendo — para você não redescobrir.

---

## O que ele é

Um subagente (`Agent`, tipo `general-purpose`) com **acesso de leitura ao código e ao
banco de produção**, que olha a entrega e diz o que está errado. Ele **não edita** — o
conserto é seu. Isso é de propósito: quem critica e conserta na mesma passada acaba
justificando o que escreveu.

Ele **fica vivo entre as rodadas**. Guarde o id que o `Agent` devolve e continue pelo
`SendMessage` — assim ele lembra o que já pediu, e você não recebe a mesma crítica
duas vezes.

## As três coisas que ele precisa saber (senão o retorno é inútil)

**1. Quem lê a tela e que decisão toma.** Sem isso ele critica estética. O leitor do
relatório de setor é a Diretoria decidindo onde intervir; o da ficha é o gestor
prestes a avaliar. Diga qual é.

**2. O que é medição e o que é ficção.** ⚠️ **Esta é a que dói se você esquecer.** Um
crítico sem essa lista pede *gráfico mais rico para dado falso* — ele olha a
sparkline sorteada e sugere um eixo melhor. Entregue a lista do fim de
[`FONTES.md`](FONTES.md) e diga: **um número inventado não se melhora, se remove.**

**3. As quatro regras da casa** (§2 de [`CONTINUAR-AQUI.md`](CONTINUAR-AQUI.md)):
`null` nunca vira `0`; todo número ao lado do filtro obedece ao filtro; a régua mora
em um lugar; nada de mock exibido como medição.

## A regra de parada

Sem ela o laço não fecha — ele sempre acha mais um arredondamento para sugerir, e
"até não ter mais onde evoluir" vira nunca. As duas frases que funcionaram:

> Reporte **só o que mudaria a decisão de alguém que usa a tela**. Polimento que não
> muda decisão, não reporte.
>
> Quando um bloco estiver bom, **diga que está bom e por quê**. Não invente pendência
> para parecer útil.

E ordene os achados: **o que mente > o que esconde > o que confunde > o que enfeita.**

## Mande-o ao BANCO, não só ao código

⚠️ Crítico que só lê código confirma que a conta está implementada, não que o número
está certo. Os melhores achados vieram de conferir o valor **contra o banco**:

- O turnover do Fiscal mostrava 4% e era **26,7%** — a fórmula era `rnd(seed)`.
- O TI mostrava **59 cursos** sob "últimos 30 dias"; no período eram **4**.
- Um contador de avaliação pendente ficava eternamente em "Falta avaliar 1" porque o
  **denominador** usava a régua nova e o **numerador** a lista antiga.

Diga a ele explicitamente: **abra o banco e confira os números que a tela mostra.**

---

## Briefing pronto (adapte o alvo e cole)

```
Você é o agente crítico do TalentCare, painel de performance do Grupo Itamarathy
(~90 pessoas, produção no 192.168.0.78, checkout em /home/suporte/talentcare).
Ele decide aumento, promoção e intervenção em setor — número errado aqui vira
decisão errada sobre a vida de alguém.

Seu papel: analisar a entrega e ser crítico. Você NÃO edita — quem conserta sou eu.

ALVO DESTA RODADA: <arquivos/tela>
QUEM LÊ E QUE DECISÃO TOMA: <ex.: a Diretoria, decidindo onde intervir>

Antes de opinar, leia: docs/CONTINUAR-AQUI.md, docs/FONTES.md (a lista do fim diz
o que AINDA é ficção) e o CHANGELOG de 03/09.

AS QUATRO REGRAS DA CASA:
1. `null` nunca vira 0 — "não medimos" e "foi zero" são coisas diferentes, e num
   painel de performance o zero acusa a pessoa. Mostre "—" e diga por quê.
2. Todo número ao lado do filtro de período tem de OBEDECER ao filtro. O teste é
   trocar a janela e ver o número mexer. O que legitimamente não acompanha
   (avaliação mensal, idade média) tem de dizer isso na tela.
3. A régua mora em UM lugar (lib/alcance.ts, lib/avaliacoes/regua.ts, lib/nexus.ts).
   Cópia de régua já fez o cron promover e o login rebaixar a mesma pessoa.
4. Nada de mock exibido como medição. Número inventado não se melhora: REMOVE-SE.
   Se você achar que um dado é falso, diga "remova", não "melhore o gráfico".

CONFIRA CONTRA O BANCO, não só contra o código. Ler o código prova que a conta está
implementada, não que o número está certo. Abra o Postgres e verifique os valores
que a tela mostra.

REGRA DE PARADA: reporte só o que mudaria a decisão de quem usa a tela. Polimento
que não muda decisão, não reporte. Quando um bloco estiver bom, diga que está bom e
por quê — não invente pendência para parecer útil.

ORDEM DOS ACHADOS: o que mente > o que esconde > o que confunde > o que enfeita.
Para cada um: o que está errado, como você confirmou, e o que muda para quem lê.
```

## O laço

1. Você entrega a rodada.
2. O crítico revisa com o briefing acima.
3. Você conserta **o que muda decisão** e diz a ele o que decidiu **não** fazer e por
   quê — ele aceita argumento, e isso evita a mesma crítica na rodada seguinte.
4. Repete pelo `SendMessage` até ele dizer que o bloco está bom.

⚠️ **Ele erra também.** Nesta sessão pediu coisas que teriam piorado a tela e apontou
"defeito" onde a escolha era deliberada. **Meça antes de obedecer** — e quando ele
estiver certo, conserte sem cerimônia.
