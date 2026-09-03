# O período, e como se publica

## 1. O filtro de período

A barra de cima tem quatro presets — `7d`, `30d`, `Trimestre`, `Ano` — e um
**calendário** para um intervalo qualquer (`custom`).

### O contrato

Há **um** lugar que monta a query e **um** que a lê:

```
lib/ui/period.tsx      o contexto expõe  query = "period=…&from=…&to=…"
                       e  label  ("1 a 15 de ago de 2026")

lib/period-range.ts    rangeDaRequisicao(req) → { period, fromDay, toDay }
                       periodDays(period, from, to)
                       rotuloDoIntervalo · diasNoIntervalo
```

Todo hook faz `fetch(\`/api/x?\${query}\`)` e reage a `[query]`. Toda rota lê por
`rangeDaRequisicao(req)`.

> **⚠️⚠️ Isto é contrato entre ~12 rotas e ~12 hooks, e existe por um motivo.** Antes
> cada hook montava a URL e cada rota lia o `period` na mão. Ao acrescentar o
> intervalo por calendário, **o hook esquecido continuaria pedindo só o preset e a
> rota devolveria 30 dias** — enquanto a tela mostra "1 a 15 de agosto". Números
> certos, janela errada, e nada acusando.
>
> **Rota nova de métrica: use `rangeDaRequisicao`. Hook novo: use o `query`.**

### Regras do calendário

- Escolher as **duas** datas já liga o modo intervalo. Exigir um "aplicar" deixaria a
  tela em 30 dias com o calendário mostrando outra coisa.
- **Sem data futura**: atividade de amanhã não existe.
- ⚠️ **Data inválida ou invertida cai no padrão de 30 dias**, nunca em janela vazia:
  vazio devolve zero em tudo, e zero se lê como *"não houve atividade"* — a pior
  resposta possível para um erro de digitação.
- `<input type="date">` **nativo**, de propósito: já abre o calendário do sistema, já
  respeita idioma e teclado, e não custa um quilobyte de biblioteca.

### ⚠️⚠️ Todo número ao lado do filtro tem de OBEDECER ao filtro

O relatório de departamento mostrava **59 cursos criados** no TI debaixo de "Últimos
30 dias". No período eram **4**; 59 é o total de toda a história. O número não estava
errado — **respondia outra pergunta**, o que é pior, porque ninguém desconfia de um
número plausível.

A causa: a tela lia de `data.departments[x]`, o acumulado montado em
`getTalentData()`. Hoje quem responde é `/api/dept-metrics`, que soma os espelhos
**no intervalo**.

> **O teste é trocar a janela e ver o número mexer.** Se `7d`, `30d` e `Ano` dão o
> mesmo valor, ou é acumulado, ou o histórico é todo recente — e as duas hipóteses se
> distinguem em trinta segundos no banco.

### O que legitimamente NÃO acompanha o filtro

Tem de **dizer isso na tela**, no bloco — senão quem troca o filtro e vê o número
parado conclui que a tela travou.

| O quê | Por quê |
|---|---|
| Avaliação mensal | é mensal por natureza; não se recorta em "últimos 7 dias" |
| Idade média, tempo de casa, gênero | retrato de hoje |
| Snapshot de backlog do WhatsApp | é "agora", não um período |
| Advertências (KPI da home) | é registro cumulativo, e o código diz isso de propósito (`lib/mock/dashboard.ts`) — ⚠️ mas **o cartão não avisa**, e ele fica debaixo de "Período: Últimos 30 dias". Dívida aberta: falta o rótulo, não a decisão |

---

## 2. Produção e deploy

O TalentCare roda em **`srv-ita18` / `192.168.0.78`**, em `/var/www/talentcare`,
serviço systemd `talentcare` (`next start -p 8082`) atrás de nginx em
`https://talentcare.grupoitamarathy.local`.

> **⚠️⚠️ Produção NÃO é um checkout git.** O deploy é `rsync` do checkout de trabalho
> (`/home/suporte/talentcare` no `.75`). Isso é diferente do Nexus, onde a regra é
> nunca copiar arquivo à mão — aqui não há repositório do outro lado para dar `pull`.

```bash
# 1. do checkout de trabalho, envie só o que mudou
rsync -av --files-from=<lista> ./ talentcare@192.168.0.78:/var/www/talentcare/

# 2. mudou o schema?
ssh talentcare@192.168.0.78 'cd /var/www/talentcare && npx prisma db push'

# 3. build e restart
ssh talentcare@192.168.0.78 'cd /var/www/talentcare && npm run build'
ssh talentcare@192.168.0.78 'sudo systemctl restart talentcare'
```

- ⚠️ **`scp` quebra** com `(app)` e `[id]` no caminho — os parênteses e colchetes do
  App Router passam pelo shell remoto. Use `rsync` (ou `tar cf - … | ssh … tar xf -`).
- ⚠️⚠️ **`rsync lib/nexus.ts host:/var/www/talentcare/` ACHATA o caminho**: o arquivo
  vai parar em `/var/www/talentcare/nexus.ts`, e o `lib/nexus.ts` de produção fica
  **velho**. O build passa, o serviço reinicia, e nada acusa.

  Custou uma hora em 03/09/2026: o `run-sync.mjs` (que já mora na raiz) chegou certo
  e promovia a pessoa a `GESTOR`; o `lib/nexus.ts` ficou para trás e o login dela a
  rebaixava em seguida. Sintoma: alguém vê "acesso negado" logo depois de o banco
  dizer que tem acesso.

  **Sempre `--files-from=<lista>`** (preserva o caminho), ou `rsync src/a.ts
  host:/dir/**a/**a.ts` com o destino completo. E confira no destino:
  `grep -c <algo que você acabou de escrever> <caminho/no/servidor>`.
- ⚠️ O branch é **`master`**, não `main` (`git push origin main` falha com *"src
  refspec main does not match any"*).
- ⚠️ São **dois espelhos** no `origin`. Confira o que subiu com
  `git ls-remote <url> master`, e não pelo texto do push.
- O schema vai por **`prisma db push`**, não por migrations.

### Antes de rodar um sync de diretório em produção

**Ensaie a seco**: quantos seriam inativados, quantos criados, que campos mudam. O
bloco de órfãos desliga gente, e já desligou por engano em outro sistema. Ver
[`FONTES.md`](FONTES.md).

### Conferir se está vivo

```bash
ssh talentcare@192.168.0.78 'systemctl is-active talentcare'
ssh talentcare@192.168.0.78 'tail -3 /var/www/talentcare/cron-chat.log'
```

Há um log por fonte em `/var/www/talentcare/cron-*.log`.
