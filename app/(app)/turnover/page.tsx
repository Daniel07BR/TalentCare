import { turnoverVM } from '@/lib/mock/turnover'
import { getTalentData } from '@/lib/data/source'
import { TurnoverVisao } from './Visao'

export const dynamic = 'force-dynamic'

export default async function TurnoverPage() {
  const vm = turnoverVM(await getTalentData())

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Analítico</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Turnover &amp; Headcount</h1>
      </div>

      {/* O corpo mora em `Visao.tsx` desde 11/09/2026 — o relatório do setor
          abre o mesmo corpo numa janela, recortado para o setor. */}
      <TurnoverVisao vm={vm} />
    </div>
  )
}
