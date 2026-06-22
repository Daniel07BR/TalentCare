'use client'
import { useState } from 'react'

/* Donut (pizza com furo) — segmentos por departamento, com hover. */
export type DonutSeg = { id: string; nome: string; value: number; color: string }

const R = 46
const C = 2 * Math.PI * R

export default function Donut({ segments, total, centerLabel }: { segments: DonutSeg[]; total: number; centerLabel: string }) {
  const [hi, setHi] = useState<number | null>(null)
  let acc = 0
  const arcs = segments.map((s) => {
    const frac = total > 0 ? s.value / total : 0
    const arc = { ...s, dash: `${(frac * C).toFixed(2)} ${(C - frac * C).toFixed(2)}`, offset: (-acc * C).toFixed(2) }
    acc += frac
    return arc
  })
  const active = hi != null ? segments[hi] : null
  const pct = active && total > 0 ? Math.round((active.value / total) * 100) : 0

  return (
    <div style={{ position: 'relative', width: 132, height: 132 }}>
      <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="13" />
        {arcs.map((a, i) => (
          <circle
            key={a.id}
            cx="60" cy="60" r={R} fill="none"
            stroke={a.color}
            strokeWidth={hi === i ? 16 : 13}
            strokeDasharray={a.dash}
            strokeDashoffset={a.offset}
            strokeLinecap="butt"
            onMouseEnter={() => setHi(i)}
            onMouseLeave={() => setHi(null)}
            style={{ cursor: 'pointer', opacity: hi === null || hi === i ? 1 : 0.28, transition: 'opacity .15s, stroke-width .15s' }}
          >
            <title>{a.nome}: {a.value}</title>
          </circle>
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', padding: '0 16px', textAlign: 'center' }}>
        {active ? (
          <>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-1px', color: active.color, lineHeight: 1 }}>{active.value.toLocaleString('pt-BR')}</span>
            <span style={{ fontSize: 11, fontWeight: 600, marginTop: 3, lineHeight: 1.15 }}>{active.nome}</span>
            <span style={{ fontSize: 10, color: 'var(--text-mute)' }}>{pct}% · {centerLabel}</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-1px' }}>{total.toLocaleString('pt-BR')}</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{centerLabel}</span>
          </>
        )}
      </div>
    </div>
  )
}
