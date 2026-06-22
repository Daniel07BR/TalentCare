/* Donut (pizza com furo) — segmentos por departamento. */
export type DonutSeg = { id: string; nome: string; value: number; color: string }

const R = 46
const C = 2 * Math.PI * R

export default function Donut({ segments, total, centerLabel }: { segments: DonutSeg[]; total: number; centerLabel: string }) {
  let acc = 0
  const arcs = segments.map((s) => {
    const frac = total > 0 ? s.value / total : 0
    const arc = { ...s, dash: `${(frac * C).toFixed(2)} ${(C - frac * C).toFixed(2)}`, offset: (-acc * C).toFixed(2) }
    acc += frac
    return arc
  })
  return (
    <div style={{ position: 'relative', width: 132, height: 132 }}>
      <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="13" />
        {arcs.map((a) => (
          <circle key={a.id} cx="60" cy="60" r={R} fill="none" stroke={a.color} strokeWidth="13" strokeDasharray={a.dash} strokeDashoffset={a.offset} strokeLinecap="butt" />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-1px' }}>{total.toLocaleString('pt-BR')}</span>
        <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{centerLabel}</span>
      </div>
    </div>
  )
}
