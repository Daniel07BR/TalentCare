'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useClassroomPeriod } from '@/lib/ui/classroom-period'
import { usePeriod } from '@/lib/ui/period'
import { PERIOD_LABEL } from '@/lib/mock/dashboard'
import { classroomVM } from '@/lib/mock/classroom'
import Avatar from '../Avatar'
import Donut from '../Donut'

export default function ClassroomPage() {
  const router = useRouter()
  const data = useTalentData()
  const { period } = usePeriod()
  const { map } = useClassroomPeriod()
  const vm = classroomVM(data, map ?? undefined)

  const kpis = [
    { label: 'Vídeos concluídos', value: vm.totals.videos, color: 'var(--chart-2)' },
    { label: 'Cursos concluídos', value: vm.totals.courses, color: 'var(--info)' },
    { label: 'Cursos criados', value: vm.totals.created, color: 'var(--accent)' },
    { label: 'Setores ativos', value: vm.deptCount, color: 'var(--text)' },
  ]

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Integração · dados reais · {PERIOD_LABEL[period]}</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>ClassRoom</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-1px', color: k.color }}>{k.value.toLocaleString('pt-BR')}</div>
          </div>
        ))}
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Atividade por departamento</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 18 }}>Distribuição de cada métrica entre os setores</div>
        {vm.legend.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem dados ainda. Clique em “Sincronizar ClassRoom”.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, justifyItems: 'center' }}>
              {[
                { d: vm.donuts.videos, label: 'Vídeos concluídos', center: 'vídeos' },
                { d: vm.donuts.cursos, label: 'Cursos concluídos', center: 'cursos' },
                { d: vm.donuts.criados, label: 'Cursos criados', center: 'criados' },
              ].map((c) => (
                <div key={c.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</div>
                  <Donut segments={c.d.segments} total={c.d.total} centerLabel={c.center} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
              {vm.legend.map((l) => (
                <div key={l.id} className="tc-row" onClick={() => router.push(`/departamentos/${l.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer', borderRadius: 6, padding: '2px 6px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, flex: 'none' }} />
                  <span style={{ color: 'var(--text-dim)' }}>{l.nome}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <PeopleCard title="Maiores criadores de cursos" sub="Cursos criados" unit="cursos" people={vm.topCreators} router={router} />
        <PeopleCard title="Maiores concluintes" sub="Vídeos concluídos" unit="vídeos" people={vm.topLearners} router={router} />
      </div>
    </div>
  )
}

function PeopleCard({ title, sub, unit, people, router }: {
  title: string; sub: string; unit: string
  people: { id: string; nome: string; cargo: string; dept: string; initials: string; color: string; hasAvatar: boolean; value: number }[]
  router: ReturnType<typeof useRouter>
}) {
  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>{sub}</div>
      {people.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem dados ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {people.map((p, i) => (
            <div key={p.id} className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
              <span style={{ width: 18, fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textAlign: 'center' }}>{i + 1}</span>
              <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cargo} · {p.dept}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.value} <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}>{unit}</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
