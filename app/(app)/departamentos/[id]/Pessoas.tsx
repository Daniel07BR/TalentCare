'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PessoaDoSetor } from '@/lib/ui/dept-period'
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

type Coluna = 'nota' | 'atividade' | 'atrasos'

const COLUNAS: { key: Coluna; label: string; dica: string }[] = [
  // ⚠️ A nota é da COMPETÊNCIA (mês fechado) e não do filtro. Sem dizer isso na
  // própria coluna, quem troca para "7 dias" acha que vê a nota daquela semana —
  // e a nota é o maior número da linha.
  { key: 'nota', label: 'Nota', dica: 'Avaliação do gestor (0–10) da competência mensal — não acompanha o filtro' },
  { key: 'atividade', label: 'Atividade', dica: 'Ações registradas nos sistemas, no período' },
  { key: 'atrasos', label: 'Atrasos', dica: 'Atrasos não abonados, no período' },
]

export function Pessoas({ pessoas, periodo, competencia }: { pessoas: PessoaDoSetor[]; periodo: string; competencia: string }) {
  const router = useRouter()
  const [ordemPedida, setOrdem] = useState<Coluna>('nota')

  const medidas = pessoas.filter((p) => !p.semFonte)
  const maxAtiv = Math.max(1, ...medidas.map((p) => p.atividade))
  const comNota = pessoas.filter((p) => p.nota != null)
  const mediaNota = comNota.length
    ? Math.round((comNota.reduce((a, p) => a + (p.nota ?? 0), 0) / comNota.length) * 10) / 10
    : null

  /* ⚠️ Sem NENHUMA nota publicada, ordenar "por nota" caía no desempate por
     atividade — a lista ficava ordenada por atividade com o botão "Nota" aceso,
     e o selo do topo ia para quem mais registrou, parecendo o melhor avaliado. */
  const semNotas = comNota.length === 0
  const ordem: Coluna = semNotas && ordemPedida === 'nota' ? 'atividade' : ordemPedida

  const ordenadas = [...pessoas].sort((a, b) => {
    // ⚠️ Quem não é medido vai para o fim em QUALQUER ordenação, e não para o
    // fundo do ranking: não é o último colocado, é quem não está na corrida.
    /* ⚠️ "Não está na corrida" vale só para a coluna de ATIVIDADE. Atraso,
       advertência e nota EXISTEM para quem não tem conta no Nexus — empurrar
       essa pessoa para o fim escondia, na última linha, quem tinha 12 atrasos. */
    if (ordem === 'atividade' && a.semFonte !== b.semFonte) return a.semFonte ? 1 : -1
    if (ordem === 'nota') {
      if (a.nota == null && b.nota == null) return b.atividade - a.atividade
      if (a.nota == null) return 1
      if (b.nota == null) return -1
      return b.nota - a.nota
    }
    if (ordem === 'atrasos') return b.atrasos - a.atrasos || b.advertencias - a.advertencias
    return b.atividade - a.atividade
  })

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>As pessoas do setor</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
            {pessoas.length === 1
              ? 'a única pessoa do setor'
              : `${pessoas.length} pessoas comparadas entre si`}
            {' · '}atividade e atrasos no período ({periodo}) · nota de {competencia}
          </div>
        </div>
        {/* ⚠️ Com uma pessoa não há o que ordenar, e o segmentado só ocupa
            espaço prometendo uma comparação que não existe. */}
        <div style={{ display: pessoas.length < 2 ? 'none' : 'flex', gap: 3, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
          {COLUNAS.map((c) => {
            const inerte = c.key === 'nota' && semNotas
            return (
              <button key={c.key} disabled={inerte} onClick={() => setOrdem(c.key)}
                title={inerte ? 'Nenhuma avaliação publicada nesta competência' : c.dica}
                className={'seg' + (ordem === c.key ? ' on' : '')}
                style={{ fontSize: 11.5, padding: '5px 10px', opacity: inerte ? 0.45 : 1, cursor: inerte ? 'not-allowed' : 'pointer' }}>
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ⚠️ CABEÇALHO. As três colunas eram identificadas só pelo segmentado de
          ordenação, que fica no canto DIREITO — alinhado sobre as ocorrências,
          não sobre as colunas que nomeia. O leitor descobria o que era o "8.4"
          pela cor. */}
      <div className="cab-pessoas" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 70px minmax(0,1fr) 104px 14px', gap: 14, padding: '0 10px 8px', borderBottom: '1px solid var(--border-soft)', marginTop: 16 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-mute)' }}>Pessoa</span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-mute)', textAlign: 'center' }}>Nota</span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-mute)' }}>Atividade no período</span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-mute)', textAlign: 'right' }}>Ocorrências</span>
        <span />
      </div>

      <div>
        {ordenadas.map((p, i) => {
          /* ⚠️ O selo dourado "TOPO" premiava quem tinha MAIS ATRASOS quando a
             ordenação era por atraso — a condição foi escrita para acender
             justamente nesse caso. Numa tela lida pela Diretoria, era uma
             legenda errada sobre uma pessoa nomeada. Agora o selo diz o que
             significa, e some quando não há do que se orgulhar. */
          const selo = pessoas.length < 2 || p.semFonte ? null
            : i !== 0 ? null
            : ordem === 'nota' ? (p.nota != null ? { texto: 'MAIOR NOTA', cor: 'var(--accent)' } : null)
            : ordem === 'atividade' ? (p.atividade > 0 ? { texto: 'MAIS ATIVO', cor: 'var(--accent)' } : null)
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

              {/* ATIVIDADE — barra relativa a quem mais fez NO SETOR */}
              <div>
                {p.semFonte ? (
                  <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                    — <span style={{ fontSize: 10 }}>não medido nos sistemas</span>
                  </span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ flex: 1, height: 7, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div className="cbar" style={{ height: '100%', width: `${Math.round((p.atividade / maxAtiv) * 100)}%`, background: 'var(--chart-2)', borderRadius: 4 }} />
                    </div>
                    <span className="cnum" style={{ width: 42, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: p.atividade > 0 ? 'var(--text)' : 'var(--text-mute)' }}>
                      {p.atividade.toLocaleString('pt-BR')}
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
          <span>Média do setor: <b style={{ color: ancoraDe(mediaNota).color }}>{mediaNota.toFixed(1)}</b> · {comNota.length} de {pessoas.length} avaliadas</span>
        )}
        {pessoas.length > 1 && <span>A barra de atividade compara <b>dentro deste setor</b> — o cheio é quem mais registrou aqui.</span>}
      </div>
    </div>
  )
}
