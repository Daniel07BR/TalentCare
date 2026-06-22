import type { LucideIcon } from 'lucide-react'

/* Cartões-estatística delicados (ícone + número + rótulo) — usados p/ ClassRoom. */
export type Stat = { icon: LucideIcon; label: string; value: number; color: string }

export default function ClassroomStats({ stats }: { stats: Stat[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 12 }}>
      {stats.map((s) => {
        const Icon = s.icon
        return (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '13px 14px' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'color-mix(in srgb, ' + s.color + ' 16%, transparent)', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <Icon size={19} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', lineHeight: 1, color: s.color }}>{s.value.toLocaleString('pt-BR')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3, whiteSpace: 'nowrap' }}>{s.label}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
