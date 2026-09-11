'use client'
import { GraduationCap } from 'lucide-react'
import { useTalentData } from '@/lib/ui/data'
import { educationByDept } from '@/lib/mock/education'
import { Cartao, forte } from './ui'
import type { Tom } from './tipos'

/* A cor de cada formação na paleta nova — pelo NOME, para a mesma formação
   ter a mesma cor em todo setor. O que não casar cai na sequência. */
const SEQ: Tom[] = ['blue', 'green', 'orange', 'purple', 'pink', 'amber', 'red']
function tomDe(label: string, i: number): Tom {
  const l = label.toLowerCase()
  if (l.includes('mba')) return 'orange'
  if (l.includes('cursando') || l.includes('incompleto')) return 'green'
  if (l.includes('superior')) return 'blue'
  if (l.includes('técnico') || l.includes('tecnico')) return 'purple'
  if (l.includes('médio') || l.includes('medio')) return 'pink'
  if (l.includes('pós') || l.includes('mestr') || l.includes('dout')) return 'amber'
  return SEQ[i % SEQ.length]
}

/** Retrato de hoje — não acompanha o filtro, e o cartão diz isso. */
export function Escolaridade({ deptId }: { deptId: string }) {
  const edu = educationByDept(useTalentData()).byDept.find((d) => d.id === deptId)
  const segs = (edu?.segs ?? []).map((sg, i) => ({ ...sg, tom: tomDe(sg.label, i) }))
  const soma = segs.reduce((a, x) => a + x.count, 0)
  const R = 58, C = 2 * Math.PI * R
  let acumulado = 0

  return (
    <Cartao titulo="Escolaridade do setor" Icone={GraduationCap}
      sub={edu ? `${edu.informed} de ${edu.total} informados · retrato de hoje, não acompanha o filtro` : undefined}>
      {!edu || soma === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Nenhuma formação informada para este setor.</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
          <svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label={`Escolaridade de ${edu.total} pessoas`} style={{ flex: 'none' }}>
            <circle cx="80" cy="80" r={R} fill="none" stroke="var(--n-card-2)" strokeWidth="24" />
            {segs.map((sg) => {
              const len = (sg.count / soma) * C
              const el = (
                <circle key={sg.label} cx="80" cy="80" r={R} fill="none" stroke={forte(sg.tom)} strokeWidth="24"
                  strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-acumulado} transform="rotate(-90 80 80)">
                  <title>{`${sg.label}: ${sg.count} (${sg.pct}%)`}</title>
                </circle>
              )
              acumulado += len
              return el
            })}
            <text x="80" y="78" textAnchor="middle" style={{ fontSize: 30, fontWeight: 800, fill: 'var(--n-text)' }}>{edu.total}</text>
            <text x="80" y="98" textAnchor="middle" style={{ fontSize: 12, fill: 'var(--n-text-2)' }}>pessoas</text>
          </svg>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, minWidth: 170, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {segs.map((sg) => (
              <li key={sg.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: forte(sg.tom), flex: 'none' }} />
                <span style={{ flex: 1, minWidth: 0, color: 'var(--n-text)' }}>{sg.label}</span>
                <span className="cnum" style={{ fontWeight: 700 }}>{sg.count}</span>
                <span style={{ color: 'var(--n-text-3)', width: 42, textAlign: 'right' }}>({sg.pct}%)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Cartao>
  )
}
