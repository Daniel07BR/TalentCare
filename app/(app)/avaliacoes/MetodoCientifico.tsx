'use client'
import { useState } from 'react'
import { FlaskConical, ChevronDown } from 'lucide-react'
import { BASE_CIENTIFICA, METODO_PONTOS } from '@/lib/avaliacoes/metodo'

/* ============================================================
   A BASE CIENTÍFICA da avaliação, À VISTA (02/10/2026).

   Era um <details> fechado no canto — "não achei" na primeira olhada. Pedido do
   Daniel: deixar claro o método para quebrar resistências. Uma faixa sempre
   visível com os nomes dos métodos; um clique abre as fontes e o que cada uma
   garante. Na página do avaliado nasce ABERTA: é ali que a resistência mora.

   `paraGestao` mostra também o que só a gestão vê (as perguntas de intenção).
   ============================================================ */
export function MetodoCientifico({ paraGestao = false, abertoDeInicio = false }: { paraGestao?: boolean; abertoDeInicio?: boolean }) {
  const [aberto, setAberto] = useState(abertoDeInicio)
  const itens = BASE_CIENTIFICA.filter((b) => paraGestao || !b.soGestao)

  return (
    <section className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid var(--chart-3)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
      <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}
        style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--chart-3) 14%, var(--surface))', color: 'var(--chart-3)' }}>
          <FlaskConical size={18} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>Avaliação com base científica</span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.45 }}>
            {itens.map((b) => b.metodo).join(' · ')}
          </span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--chart-3)', flex: 'none' }}>
          {aberto ? 'Fechar' : 'Ver as fontes'}
          <ChevronDown size={15} style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </span>
      </button>

      {aberto && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {itens.map((b) => (
              <div key={b.metodo} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {b.metodo}{b.soGestao && <span style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-mute)' }}> · só a gestão vê</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-mute)', fontStyle: 'italic' }}>{b.fonte}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}><b>Na prática:</b> {b.naPratica}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}><b>Garante:</b> {b.garante}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>As regras que valem para todos</div>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            {METODO_PONTOS.map((p) => <li key={p.titulo}><b>{p.titulo}.</b> {p.texto}</li>)}
          </ul>
        </div>
      )}
    </section>
  )
}
