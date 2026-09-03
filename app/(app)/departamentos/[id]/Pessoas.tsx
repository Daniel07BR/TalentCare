'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PessoaDoSetor } from '@/lib/ui/dept-period'
import { ancoraDe } from '@/lib/avaliacoes/criterios'
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
  { key: 'nota', label: 'Nota do mês', dica: 'Avaliação do gestor, 0 a 10' },
  { key: 'atividade', label: 'Atividade', dica: 'Ações registradas nos sistemas, no período' },
  { key: 'atrasos', label: 'Atrasos', dica: 'Atrasos não abonados, no período' },
]

export function Pessoas({ pessoas, periodo }: { pessoas: PessoaDoSetor[]; periodo: string }) {
  const router = useRouter()
  const [ordem, setOrdem] = useState<Coluna>('nota')

  const medidas = pessoas.filter((p) => !p.semFonte)
  const maxAtiv = Math.max(1, ...medidas.map((p) => p.atividade))
  const comNota = pessoas.filter((p) => p.nota != null)
  const mediaNota = comNota.length
    ? Math.round((comNota.reduce((a, p) => a + (p.nota ?? 0), 0) / comNota.length) * 10) / 10
    : null

  const ordenadas = [...pessoas].sort((a, b) => {
    // ⚠️ Quem não é medido vai para o fim em QUALQUER ordenação, e não para o
    // fundo do ranking: não é o último colocado, é quem não está na corrida.
    if (a.semFonte !== b.semFonte) return a.semFonte ? 1 : -1
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
            {pessoas.length} {pessoas.length === 1 ? 'pessoa' : 'pessoas'} · comparadas entre si · {periodo}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
          {COLUNAS.map((c) => (
            <button key={c.key} title={c.dica} onClick={() => setOrdem(c.key)}
              className={'seg' + (ordem === c.key ? ' on' : '')} style={{ fontSize: 11.5, padding: '5px 10px' }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {ordenadas.map((p, i) => {
          const destaque = i === 0 && !p.semFonte && (ordem !== 'atrasos' || p.atrasos > 0)
          return (
            <div
              key={p.id}
              className="tc-row crise"
              onClick={() => router.push(`/funcionarios/${p.id}`)}
              style={{
                animationDelay: `${Math.min(i, 12) * 35}ms`, transformOrigin: 'left center',
                display: 'grid', gridTemplateColumns: '1fr 78px 1fr 96px',
                gap: 14, alignItems: 'center', padding: '10px 10px',
                borderBottom: '1px solid var(--border-soft)', cursor: 'pointer', borderRadius: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <Avatar id={p.id} hasAvatar initials={p.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--chart-1)" size={32} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.nome}
                    {destaque && <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)44', borderRadius: 20, padding: '1px 7px' }}>TOPO</span>}
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
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 14, fontSize: 11, color: 'var(--text-mute)', lineHeight: 1.6 }}>
        {mediaNota != null && (
          <span>Média do setor: <b style={{ color: ancoraDe(mediaNota).color }}>{mediaNota.toFixed(1)}</b> · {comNota.length} de {pessoas.length} avaliadas</span>
        )}
        <span>A barra de atividade compara <b>dentro deste setor</b> — o cheio é quem mais registrou aqui.</span>
      </div>
    </div>
  )
}
