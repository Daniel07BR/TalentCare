'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PessoaDoSetor, DeptMetrics } from '@/lib/ui/dept-period'
import { ancoraDe } from '@/lib/avaliacoes/criterios'
import { ChevronRight } from 'lucide-react'
import Avatar from '../../Avatar'

/* ============================================================
   A COMPARAÇÃO ENTRE AS PESSOAS DO SETOR.

   ⚠️⚠️ A comparação é DENTRO do setor, e a barra é relativa a quem mais fez ali.
   Comparar contra a empresa poria a Limpeza ao lado do Fiscal, e o Fiscal ganha
   sempre — não porque trabalhe mais, mas porque o trabalho dele passa por
   sistemas que contam.

   ⚠️⚠️ Quem não tem conta no Nexus mostra "—", nunca zero. Zero e "não medimos"
   são coisas diferentes, e num quadro comparativo o zero acusa a pessoa.
   ============================================================ */

type Coluna = 'nota' | 'pontuacao' | 'atrasos'

const COLUNAS: { key: Coluna; label: string; dica: string }[] = [
  // ⚠️ A nota é da COMPETÊNCIA (mês fechado) e não do filtro. Sem dizer isso na
  // própria coluna, quem troca para "7 dias" acha que vê a nota daquela semana —
  // e a nota é o maior número da linha.
  { key: 'nota', label: 'Nota', dica: 'Avaliação do gestor (0–10) da competência mensal — não acompanha o filtro' },
  { key: 'pontuacao', label: 'Pontuação', dica: 'Pontuação do mês: disciplina + serviços + atividades da competência — não acompanha o filtro' },
  // ⚠️ A dica muda quando o mês está em curso (ver `dicaPontuacao`).

  { key: 'atrasos', label: 'Atrasos', dica: 'Atrasos não abonados, no período' },
]

/** '2026-09-08' → '08/09'. */
const dm = (iso: string | null) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : null)

export function Pessoas({ pessoas, periodo, competencia, pontuacaoDoMes, avaliaveis, busca }: {
  pessoas: PessoaDoSetor[]; periodo: string; competencia: string
  /** ⚠️ O mês CORRENTE pontua ao vivo, e o número é PARCIAL — ver o aviso
   *  abaixo da lista de colunas. Um parcial exibido como se fosse mês fechado
   *  é a mesma armadilha do acumulado com rótulo de período, pelo avesso: aqui
   *  o número é menor do que será, e quem lê conclui que a pessoa produziu
   *  menos. */
  pontuacaoDoMes: DeptMetrics['pontuacaoDoMes']
  /* ⚠️ O MESMO denominador do cartão de Avaliação. A tela chegou a mostrar
     "N de 22" aqui e "de 21 pessoas" ali, lado a lado, sobre a mesma pergunta —
     a divergência que acabara de ser morta entre a tela e o selo do menu,
     sobrevivendo dentro da própria página. */
  avaliaveis: number
  /** Busca por nome, vinda da faixa de filtros da página. */
  busca: string
}) {
  const router = useRouter()
  const [ordemPedida, setOrdem] = useState<Coluna>('nota')
  /* ⚠️⚠️ MÊS EM CURSO. A pontuação existe (as atividades dos sistemas do Nexus
     são apontadas ao vivo), mas ela é PARCIAL: faltam os dias que ainda não
     aconteceram e, no Legal, a planilha de serviços inteira — ela sobe no fim
     do mês. Exibi-la sem dizer isso rebaixaria quem mais executa serviço
     durante o mês todo, para ele saltar no último dia. */
  const parcial = pontuacaoDoMes.parcial
  const previa = pontuacaoDoMes.previa
  /* ⚠️⚠️ A BARRA É UMA AFIRMAÇÃO DE COMPARAÇÃO, e ela cai quando a metade de
     serviço não existe para ninguém. O achado do crítico (08/09/2026): o aviso
     do parcial dizia "não comparável com um mês fechado", mas a tela não
     compara meses — compara as 8 pessoas ENTRE SI, e o parcial retira uma
     metade que não é distribuída por igual. Em agosto o serviço era 70% da
     pontuação do Marcos, 66% da Marcia e 58% do Ezequiel, e 12% do Lucas: no
     parcial de setembro o Ezequiel, dos 105 serviços, cai de 3º para 7º de 8
     com barra de 8% da do primeiro. O número segue (é real); o que sai é o
     desenho que diz "este vale um oitavo daquele". */
  const semBarra = pontuacaoDoMes.semPlanilhaDoMes && (parcial || previa)

  const medidas = pessoas.filter((p) => !p.semFonte)
  /* ⚠️ A barra compara a PONTUAÇÃO do mês dentro do setor. Só as positivas
     definem o teto; a negativa (quem levou mais desconto que ponto) aparece em
     vermelho, sem barra — ela não é "pouca atividade", é saldo negativo. */
  const maxPont = Math.max(1, ...pessoas.map((p) => p.pontuacao ?? 0))
  const comNota = pessoas.filter((p) => p.nota != null)
  const mediaNota = comNota.length
    ? Math.round((comNota.reduce((a, p) => a + (p.nota ?? 0), 0) / comNota.length) * 10) / 10
    : null

  /* ⚠️ Sem NENHUMA nota publicada, ordenar "por nota" caía no desempate por
     atividade — a lista ficava ordenada por atividade com o botão "Nota" aceso,
     e o selo do topo ia para quem mais registrou, parecendo o melhor avaliado. */
  const semNotas = comNota.length === 0
  const ordem: Coluna = semNotas && ordemPedida === 'nota' ? 'pontuacao' : ordemPedida

  /* ⚠️ A busca filtra a EXIBIÇÃO, não a conta: a média do setor e o "N de M
     avaliadas" no rodapé continuam sendo do setor inteiro. Recalcular sobre o
     resultado da busca faria "média do setor" mudar conforme o que se digita —
     e um número com esse nome não pode depender da caixa de texto. */
  const chave = busca.trim().toLowerCase()
  const filtradas = chave
    ? pessoas.filter((p) => `${p.nome} ${p.cargo}`.toLowerCase().includes(chave))
    : pessoas

  const ordenadas = [...filtradas].sort((a, b) => {
    // ⚠️ Quem não é medido vai para o fim em QUALQUER ordenação, e não para o
    // fundo do ranking: não é o último colocado, é quem não está na corrida.
    /* ⚠️ "Não está na corrida" vale só para a coluna de ATIVIDADE. Atraso,
       advertência e nota EXISTEM para quem não tem conta no Nexus — empurrar
       essa pessoa para o fim escondia, na última linha, quem tinha 12 atrasos. */
    if (ordem === 'nota') {
      if (a.nota == null && b.nota == null) return (b.pontuacao ?? -Infinity) - (a.pontuacao ?? -Infinity)
      if (a.nota == null) return 1
      if (b.nota == null) return -1
      return b.nota - a.nota
    }
    if (ordem === 'atrasos') return b.atrasos - a.atrasos || b.advertencias - a.advertencias
    /* Pontuação: quem não tem (não calculada) vai por último, não ao fundo do
       ranking — é ausência de conta, não saldo baixo. */
    if (a.pontuacao == null && b.pontuacao == null) return 0
    if (a.pontuacao == null) return 1
    if (b.pontuacao == null) return -1
    return b.pontuacao - a.pontuacao
  })

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>As pessoas do setor</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
            {chave
              ? `${ordenadas.length} de ${pessoas.length} — busca por "${busca.trim()}"`
              : pessoas.length === 1
                ? 'a única pessoa do setor'
                : `${pessoas.length} pessoas comparadas entre si`}
            {' · '}{parcial
              ? <>pontuação <b>parcial</b> de {competencia} (até {dm(pontuacaoDoMes.ateDia)})</>
              : previa ? <>pontuação de {competencia} (<b>prévia</b>, ainda não gravada)</>
              : <>pontuação de {competencia}</>}
            {' · '}nota de {competencia} · atrasos no período ({periodo})
          </div>
        </div>
        {/* ⚠️ Com uma pessoa não há o que ordenar, e o segmentado só ocupa
            espaço prometendo uma comparação que não existe. */}
        <div style={{ display: pessoas.length < 2 ? 'none' : 'flex', gap: 3, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
          {COLUNAS.map((c) => {
            const inerte = c.key === 'nota' && semNotas
            return (
              <button key={c.key} disabled={inerte} onClick={() => setOrdem(c.key)}
                title={inerte ? 'Nenhuma avaliação publicada nesta competência'
                  : c.key === 'pontuacao' && parcial
                    ? `Parcial: somado até ${dm(pontuacaoDoMes.ateDia)}, com o mês ainda em curso — não comparável com um mês fechado`
                    : c.dica}
                className={'seg' + (ordem === c.key ? ' on' : '') + (c.key === 'pontuacao' ? ' ord-atividade' : '')}
                style={{ fontSize: 11.5, padding: '5px 10px', opacity: inerte ? 0.45 : 1, cursor: inerte ? 'not-allowed' : 'pointer' }}>
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ⚠️⚠️ O AVISO DO PARCIAL — dito UMA vez, onde se lê, e não repetido em
          cada linha (sete frases idênticas não informam nada; foi a lição da
          lista de advertências da ficha). Ele carrega as DUAS pontas da
          medição, que não coincidem: a atividade vem de sync diário e o ponto é
          import à mão. */}
      {(parcial || previa) && (
        <div style={{ marginTop: 14, padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.55 }}>
          {parcial ? (
            <>
              <b style={{ color: 'var(--text)' }}>Mês em curso.</b> Soma o que já aconteceu, até <b>{dm(pontuacaoDoMes.ateDia)}</b>
              {/* ⚠️ Só diz a segunda data quando ela DIFERE: data repetida sugere
                  uma distinção que ali não existe. */}
              {pontuacaoDoMes.disciplinaAteDia == null
                ? <> — <b>sem disciplina medida</b> neste mês: o ponto ainda não foi importado até aqui</>
                : pontuacaoDoMes.disciplinaAteDia !== pontuacaoDoMes.ateDia
                  ? <> (atrasos e advertências só até <b>{dm(pontuacaoDoMes.disciplinaAteDia)}</b>, que é onde o ponto foi importado)</>
                  : null}
              . O bônus de mês sem ocorrência só entra quando o mês terminar.
            </>
          ) : (
            <>
              <b style={{ color: 'var(--text)' }}>Prévia.</b> O mês fechou e a régua ainda não foi gravada — este é o número que ela produz hoje, calculado na hora.
            </>
          )}
          {pontuacaoDoMes.semPlanilhaDoMes && (
            /* ⚠️⚠️ O AVISO QUE IMPORTA. Sem ele, quem executa serviço aparece
               embaixo por FALTA DE FONTE e se lê como falta de produção. */
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border-soft)' }}>
              <b style={{ color: 'var(--text)' }}>Falta a metade dos serviços da planilha</b>, que o setor sobe no fim do mês.
              Quem executa serviço (marcado com <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--warn, #b45309)' }}>◍</span>) está aqui com só uma parte da pontuação —
              está embaixo por falta de fonte, não por produção. Por isso a barra de comparação não é desenhada.
            </div>
          )}
        </div>
      )}
      {/* ⚠️ CABEÇALHO. As três colunas eram identificadas só pelo segmentado de
          ordenação, que fica no canto DIREITO — alinhado sobre as ocorrências,
          não sobre as colunas que nomeia. O leitor descobria o que era o "8.4"
          pela cor. */}
      <div className="cab-pessoas" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 70px minmax(0,1fr) 104px 14px', gap: 14, padding: '0 10px 8px', borderBottom: '1px solid var(--border-soft)', marginTop: 16 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-mute)' }}>Pessoa</span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-mute)', textAlign: 'center' }}>Nota</span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-mute)' }}>
          Pontuação do mês
          {parcial && <span style={{ color: 'var(--warn, #b45309)' }}> · parcial</span>}
          {previa && <span style={{ color: 'var(--warn, #b45309)' }}> · prévia</span>}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-mute)', textAlign: 'right' }}>Ocorrências</span>
        <span />
      </div>

      <div>
        {ordenadas.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', padding: '18px 10px' }}>
            Ninguém deste setor com <b>{busca.trim()}</b> no nome ou no cargo.
          </div>
        )}
        {ordenadas.map((p, i) => {
          /* ⚠️ O selo dourado "TOPO" premiava quem tinha MAIS ATRASOS quando a
             ordenação era por atraso — a condição foi escrita para acender
             justamente nesse caso. Numa tela lida pela Diretoria, era uma
             legenda errada sobre uma pessoa nomeada. Agora o selo diz o que
             significa, e some quando não há do que se orgulhar. */
          const selo = pessoas.length < 2 || p.semFonte ? null
            : i !== 0 ? null
            : ordem === 'nota' ? (p.nota != null ? { texto: 'MAIOR NOTA', cor: 'var(--accent)' } : null)
            : ordem === 'pontuacao' ? (p.pontuacao != null && p.pontuacao > 0 ? { texto: 'MAIS PONTOS', cor: 'var(--accent)' } : null)
            : (p.atrasos > 0 ? { texto: 'MAIS ATRASOS', cor: 'var(--warning)' } : null)
          return (
            /* ⚠️ Era `<div onClick>` com a classe `crise` — que é `scaleY` a
               partir do centro: cada uma das 22 linhas se ESTICAVA
               verticalmente, com o texto esmagado. Agora é `<button>` (teclado
               e foco) com `cnum`, que é uma entrada discreta. Uma lista de
               nomes de pessoas numa tela de aumento não deve saltar. */
            <button
              key={p.id}
              type="button"
              className="tc-row cnum linha-pessoa"
              onClick={() => router.push(`/funcionarios/${p.id}`)}
              style={{
                animationDelay: `${Math.min(i, 12) * 30}ms`,
                display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 70px minmax(0,1fr) 104px 14px',
                gap: 14, alignItems: 'center', padding: '10px', width: '100%',
                background: 'transparent', border: 'none', textAlign: 'left', fontFamily: 'inherit',
                borderBottom: '1px solid var(--border-soft)', cursor: 'pointer', borderRadius: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--chart-1)" size={32} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.nome}
                    {selo && (
                      /* ⚠️ `var(--accent)44` NÃO é cor: a substituição do custom
                         property é por TOKEN, então vira `#f5a623 44` e o
                         navegador descarta a declaração inteira — a borda
                         simplesmente não existia. `color-mix` funciona. */
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: selo.cor, border: `1px solid ${`color-mix(in srgb, ${selo.cor} 35%, transparent)`}`, borderRadius: 20, padding: '1px 7px', whiteSpace: 'nowrap' }}>{selo.texto}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{p.cargo}</div>
                </div>
              </div>

              {/* NOTA — o número que decide, e por isso o mais legível da linha */}
              <div style={{ textAlign: 'center' }}>
                {p.nota != null ? (
                  <span className="cnum" style={{ fontSize: 19, fontWeight: 800, color: ancoraDe(p.nota).color, letterSpacing: '-.5px' }}>
                    {p.nota.toFixed(1)}
                  </span>
                ) : (
                  <span style={{ fontSize: 10.5, color: 'var(--text-mute)', border: '1px dashed var(--border)', borderRadius: 20, padding: '2px 8px' }}>
                    sem nota
                  </span>
                )}
              </div>

              {/* PONTUAÇÃO — o número do mês, barra relativa a quem mais pontuou
                  NO SETOR. ⚠️ `null` = não calculada nesta competência (o setor
                  ainda não rodou a pontuação) — é "—", não zero. Negativa vai em
                  vermelho, sem barra: é saldo negativo, não pouca atividade. */}
              <div>
                {p.pontuacao == null ? (
                  /* ⚠️ O "—" TEM DE DIZER POR QUÊ. "sem pontuação no mês" cobria
                     três causas diferentes — o setor não tem régua, ninguém
                     rodou a competência, ou o mês está aberto — e quem lia
                     concluía a única que a frase não diz: que a pessoa não fez
                     nada. */
                  <span style={{ fontSize: 11, color: 'var(--text-mute)' }} title={pontuacaoDoMes.motivo ?? undefined}>
                    — <span style={{ fontSize: 10 }}>sem pontuação no mês</span>
                  </span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }} title={p.detalhe ?? undefined}>
                    {semBarra ? (
                      <span style={{ flex: 1 }} />
                    ) : (
                      <div style={{ flex: 1, height: 7, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                        <div className="cbar" style={{ height: '100%', width: `${p.pontuacao > 0 ? Math.round((p.pontuacao / maxPont) * 100) : 0}%`, background: 'var(--chart-2)', borderRadius: 4 }} />
                      </div>
                    )}
                    {semBarra && p.fazServico && (
                      <span title="Executa serviço da planilha — a metade dele ainda não entrou neste mês"
                        style={{ fontSize: 11, fontWeight: 700, color: 'var(--warn, #b45309)' }}>◍</span>
                    )}
                    <span className="cnum" style={{ width: 46, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: p.pontuacao < 0 ? 'var(--danger)' : p.pontuacao > 0 ? 'var(--text)' : 'var(--text-mute)' }}>
                      {p.pontuacao.toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>

              {/* OCORRÊNCIAS — só aparecem quando existem */}
              <div style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                {p.advertencias > 0 && (
                  <span title={`${p.advertencias} advertência(s)`} style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', background: 'var(--surface-2)', borderRadius: 20, padding: '2px 8px' }}>
                    {p.advertencias} adv
                  </span>
                )}
                {p.atrasos > 0 && (
                  <span title={`${p.atrasos} atraso(s) · ${p.minutosAtraso} min`} style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', background: 'var(--surface-2)', borderRadius: 20, padding: '2px 8px' }}>
                    {p.atrasos} atr
                  </span>
                )}
                {p.advertencias === 0 && p.atrasos === 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>—</span>
                )}
              </div>
              {/* Diz que a linha leva a algum lugar sem depender do hover. */}
              <ChevronRight size={14} color="var(--text-mute)" />
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 14, fontSize: 11, color: 'var(--text-mute)', lineHeight: 1.6 }}>
        {mediaNota != null && (
          <span>
            Média do setor: <b style={{ color: ancoraDe(mediaNota).color }}>{mediaNota.toFixed(1)}</b>
            {' · '}{comNota.length} de {avaliaveis} avaliadas
            {/* ⚠️ Quando a competência alcança menos gente que o setor tem hoje,
                dizer POR QUÊ — senão o leitor vê 21 num setor de 22 e não sabe
                se é regra ou defeito. */}
            {avaliaveis < pessoas.length && (
              <span style={{ color: 'var(--text-mute)' }}>
                {' '}({pessoas.length - avaliaveis} {pessoas.length - avaliaveis === 1 ? 'admitida' : 'admitidas'} depois do dia 15 não {pessoas.length - avaliaveis === 1 ? 'entra' : 'entram'} na competência)
              </span>
            )}
          </span>
        )}
        {pessoas.length > 1 && <span>A barra de atividade compara <b>dentro deste setor</b> — o cheio é quem mais registrou aqui.</span>}
      </div>
    </div>
  )
}
