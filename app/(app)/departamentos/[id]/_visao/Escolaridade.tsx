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
    /* ⚠️ O cartão ESTICA até a altura da linha (o vizinho "Atividade" é mais alto),
       e o conteúdo ficava preso no canto de cima com um vão embaixo (pedido do
       dono, 11/09/2026: "adapte os dados ao tamanho dos cards"). Coluna flexível:
       o conteúdo toma a altura que sobra e se centraliza nela; a rosca cresce com
       a largura do cartão. */
    <Cartao titulo="Escolaridade do setor" Icone={GraduationCap} style={{ display: 'flex', flexDirection: 'column' }}
      sub={edu ? `${edu.informed} de ${edu.total} informados · retrato de hoje, não acompanha o filtro` : undefined}>
      {!edu || soma === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Nenhuma formação informada para este setor.</div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(18px, 6%, 40px)', flexWrap: 'wrap', padding: '4px 0' }}>
          {/* Tamanho RELATIVO: 42% da largura do cartão, entre 150 e 230px. O
              viewBox segura as proporções — o número do meio cresce junto. */}
          <svg viewBox="0 0 160 160" role="img" aria-label={`Escolaridade de ${edu.total} pessoas`}
            style={{ width: 'clamp(150px, 42%, 230px)', height: 'auto', aspectRatio: '1 / 1', flex: 'none' }}>
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
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: '1 1 200px', minWidth: 0, maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 3.5vh, 20px)' }}>
            {segs.map((sg) => (
              <li key={sg.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: forte(sg.tom), flex: 'none' }} />
                  <span style={{ flex: 1, minWidth: 0, color: 'var(--n-text)' }}>{sg.label}</span>
                  <span className="cnum" style={{ fontWeight: 800, fontSize: 15 }}>{sg.count}</span>
                  <span style={{ color: 'var(--n-text-3)', width: 44, textAlign: 'right', fontSize: 12.5 }}>({sg.pct}%)</span>
                </div>
                {/* A fatia de cada formação também em barra: usa a largura que a
                    legenda deixava vazia e deixa comparar sem ler os números. */}
                <div style={{ height: 5, background: 'var(--n-card-2)', borderRadius: 99, overflow: 'hidden', marginTop: 6, marginLeft: 22 }}>
                  <div style={{ width: `${sg.pct}%`, height: '100%', background: forte(sg.tom), borderRadius: 99 }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Cartao>
  )
}
