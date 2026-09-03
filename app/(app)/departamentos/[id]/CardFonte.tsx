'use client'
import { useRouter } from 'next/navigation'
import Avatar from '../../Avatar'

/* ============================================================
   O CARTÃO DE UMA FONTE: quem fez, à esquerda; quanto, à direita.

   ⚠️⚠️ Pedido do dono (03/09/2026), e ele está certo por um motivo além do
   visual: uma tira de totais responde "quanto o setor fez" e some com QUEM fez.
   Num relatório lido para decidir sobre gente, o nome é o dado — o total é o
   contexto. A tira antiga era o "monte de números jogados".

   ⚠️ O ranking só lista quem TEM valor naquela fonte. Mostrar a equipe inteira
   com zeros faria a lista acusar quem não passa por aquele sistema — e quase
   ninguém passa pelas oito.
   ============================================================ */

export type Pessoa = { id: string; nome: string; cargo: string; hasAvatar: boolean; valor: number }
export type Numero = { label: string; valor: number | string | null; cor?: string; nota?: string }

const fmt = (v: number | string | null) =>
  v === null ? '—' : typeof v === 'number' ? v.toLocaleString('pt-BR') : v

export function CardFonte({ titulo, sub, cor, Icone, ranking, unidade, numeros, rodape }: {
  titulo: string
  sub?: string
  cor: string
  Icone: React.ComponentType<{ size?: number; color?: string }>
  ranking: Pessoa[]
  /** O que o número do ranking significa: "atendimentos", "chamados"… */
  unidade: string
  numeros: Numero[]
  rodape?: React.ReactNode
}) {
  const router = useRouter()
  const max = Math.max(1, ...ranking.map((p) => p.valor))
  // Mais de 6 vira lista de rolagem: o cartão não pode crescer com o setor, ou
  // o Fiscal (22 pessoas) empurra todo o resto da página para fora da tela.
  const visiveis = ranking.slice(0, 6)
  const resto = ranking.length - visiveis.length

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: sub ? 2 : 16 }}>
        <Icone size={15} color={cor} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{titulo}</span>
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>{sub}</div>}

      <div className="card-fonte" style={{ display: 'grid', gridTemplateColumns: ranking.length ? 'minmax(0,1.15fr) minmax(0,1fr)' : '1fr', gap: 22, alignItems: 'start' }}>
        {/* ── ESQUERDA: quem fez ────────────────────────────────────────── */}
        {ranking.length > 0 && (
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 10 }}>
              Quem {unidade}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {visiveis.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/funcionarios/${p.id}`)}
                  className="tc-row cpop"
                  style={{
                    animationDelay: `${i * 45}ms`,
                    display: 'grid', gridTemplateColumns: '15px 30px minmax(0,1fr) 58px',
                    gap: 9, alignItems: 'center', padding: '6px 7px', borderRadius: 7,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', textAlign: 'left', width: '100%',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? cor : 'var(--text-mute)', textAlign: 'center' }}>{i + 1}</span>
                  <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color={cor} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                    {/* A barra fica SOB o nome: ela compara dentro desta fonte e
                        deste setor, e não é uma nota sobre a pessoa. */}
                    <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 4, marginTop: 3, overflow: 'hidden' }}>
                      <div className="cbar" style={{ height: '100%', width: `${Math.round((p.valor / max) * 100)}%`, background: cor, borderRadius: 4, opacity: i === 0 ? 1 : 0.62 }} />
                    </div>
                  </div>
                  <span className="cnum" style={{ textAlign: 'right', fontSize: 14.5, fontWeight: 800, color: i === 0 ? cor : 'var(--text)', letterSpacing: '-.3px' }}>
                    {p.valor.toLocaleString('pt-BR')}
                  </span>
                </button>
              ))}
            </div>
            {resto > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 8, paddingLeft: 7 }}>
                e mais {resto} {resto === 1 ? 'pessoa' : 'pessoas'} com registro
              </div>
            )}
          </div>
        )}

        {/* ── DIREITA: o total do setor ─────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 10 }}>
            No setor
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: 9 }}>
            {numeros.map((x) => (
              <div key={x.label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '11px 13px' }}>
                <div className="cnum" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.5px', color: x.valor === null || x.valor === 0 ? 'var(--text-mute)' : (x.cor ?? 'var(--text)') }}>
                  {fmt(x.valor)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.3 }}>{x.label}</div>
                {x.nota && <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2 }}>{x.nota}</div>}
              </div>
            ))}
          </div>
          {rodape && <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 11, lineHeight: 1.5 }}>{rodape}</div>}
        </div>
      </div>
    </div>
  )
}
