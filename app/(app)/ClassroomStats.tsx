import type { LucideIcon } from 'lucide-react'

/* Cartões-estatística delicados (ícone + número + rótulo) — usados p/ ClassRoom.
 *
 * ⚠️⚠️ ADAPTA A LARGURA. Ele nasceu numa coluna larga com `repeat(N, 1fr)` e
 * `nowrap` no rótulo — e em 09/09/2026, quando a Formação foi para a coluna de
 * 340 px da ficha, os quatro cartões viraram fatias de ~70 px e o último saiu
 * pela borda: "Vídeos assistidos" ficou cortado na tela.
 *
 * `auto-fit` + `minmax` resolve sem o componente precisar saber onde está: quatro
 * numa coluna larga, dois a dois na estreita. E o rótulo pode QUEBRAR — nowrap
 * num espaço que encolhe empurra o texto para fora em vez de o acomodar. */
export type Stat = { icon: LucideIcon; label: string; value: number; color: string }

export default function ClassroomStats({ stats }: { stats: Stat[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(132px, 1fr))`, gap: 10 }}>
      {stats.map((s) => {
        const Icon = s.icon
        return (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '11px 12px', minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'color-mix(in srgb, ' + s.color + ' 16%, transparent)', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <Icon size={17} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.5px', lineHeight: 1, color: s.color }}>{s.value.toLocaleString('pt-BR')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.3 }}>{s.label}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
