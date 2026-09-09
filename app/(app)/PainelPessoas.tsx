'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import Avatar from './Avatar'

/**
 * Uma linha do painel. É o mesmo formato para o painel do dashboard e para o do
 * relatório de setor — duas formas para a mesma coisa acabariam divergindo, e
 * quem lê veria o mesmo cartão se comportar diferente em cada tela.
 */
export type PessoaDoPainel = {
  id: string; nome: string; cargo: string; setor: string; hasAvatar: boolean
  /** O número desta pessoa (atrasos, advertências…). */
  valor: number
  /** Uma linha de contexto: "43 min somados", "entrou em 14/07". */
  detalhe?: string
}

/* ============================================================
   QUEM ESTÁ ATRÁS DO NÚMERO — o painel que o cartão do KPI abre.

   Pedido do dono (09/09/2026): *"em todos os cards que der para clicar e expor
   todos os usuários envolvidos, para a pessoa ter mais detalhes à mão."*

   ⚠️⚠️ ELE NÃO BUSCA NADA. Recebe a lista pronta de `buildDashboard`, montada
   só com o que a régua de `alcance` já entregou àquela sessão. Um painel que
   fosse ao servidor buscar "os envolvidos" seria uma segunda régua, e a régua
   de conteúdo desta casa mora num lugar só (`lib/alcance.ts`).

   ⚠️ Cada linha leva à FICHA, que é onde o detalhe de verdade está — e que
   confere permissão por conta própria. O painel é o índice, não o destino.
   ============================================================ */

export function PainelPessoas({ titulo, nota, periodo, pessoas, cor, sufixo, aoFechar }: {
  titulo: string
  nota?: string
  /**
   * ⚠️⚠️ DE QUE JANELA ESTA LISTA FALA. O painel cobre a barra de período (ele
   * é modal), então enquanto está aberto a única coisa que nomeia a janela fica
   * atrás dele — e um título só "Advertências" sobre uma lista que muda com o
   * filtro é a regra (b) da casa quebrada dentro de um modal.
   */
  periodo?: string
  pessoas: PessoaDoPainel[]
  cor: string
  /** "atrasos", "advertências" — o que o número de cada linha significa. */
  sufixo: string
  aoFechar: () => void
}) {
  const router = useRouter()

  // Esc fecha: um painel que só fecha no X prende quem abriu sem querer.
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [aoFechar])

  const max = Math.max(1, ...pessoas.map((p) => p.valor))
  /* ⚠️ Quando todo mundo vale 1 (o movimento de headcount), a barra não compara
     nada — ela só desenha uma régua cheia em toda linha. Some. */
  const comBarra = pessoas.some((p) => p.valor !== pessoas[0].valor)

  return (
    <div
      onClick={aoFechar}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', width: 'min(520px, 100%)',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 18px 50px rgba(0,0,0,.28)',
        }}
      >
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{titulo}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 2 }}>
              {periodo ? `${periodo} · ` : ''}{nota ? `${nota} · ` : ''}{pessoas.length} {pessoas.length === 1 ? 'pessoa' : 'pessoas'}
            </div>
          </div>
          <button onClick={aoFechar} aria-label="Fechar"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-mute)', padding: 4, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: 8 }}>
          {pessoas.map((p) => (
            <button
              key={`${p.id}-${p.detalhe ?? ''}`}
              onClick={() => router.push(`/funcionarios/${p.id}`)}
              className="tc-row"
              style={{
                display: 'grid', gridTemplateColumns: '32px minmax(0,1fr) auto',
                gap: 10, alignItems: 'center', width: '100%', padding: '7px 9px',
                borderRadius: 8, background: 'transparent', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <Avatar id={p.id} hasAvatar={p.hasAvatar} color={cor} size={32}
                initials={p.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-mute)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.setor} · {p.cargo}{p.detalhe ? ` · ${p.detalhe}` : ''}
                </div>
                {comBarra && (
                  <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((p.valor / max) * 100)}%`, background: cor, borderRadius: 3 }} />
                  </div>
                )}
              </div>
              {comBarra && (
                <span className="cnum" style={{ fontSize: 14, fontWeight: 800, color: cor, letterSpacing: '-.3px' }}>
                  {p.valor}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: '10px 18px 14px', borderTop: '1px solid var(--border-soft)', fontSize: 10.5, color: 'var(--text-mute)' }}>
          {comBarra ? `O número de cada linha é o total de ${sufixo} na janela. ` : ''}
          Clique numa pessoa para abrir a ficha dela.
        </div>
      </div>
    </div>
  )
}
