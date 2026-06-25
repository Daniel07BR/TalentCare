'use client'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { PenLine, GraduationCap, PlayCircle } from 'lucide-react'
import { useTalentData } from '@/lib/ui/data'
import { deptDetailVM } from '@/lib/mock/departments'
import { educationByDept } from '@/lib/mock/education'
import Avatar from '../../Avatar'
import ClassroomStats from '../../ClassroomStats'

export default function DepartamentoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const data = useTalentData()
  const vm = deptDetailVM(data, id)
  const edu = educationByDept(data).byDept.find((d) => d.id === id)

  if (!vm) {
    return (
      <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
        <button onClick={() => router.push('/departamentos')} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18 }}>‹ Voltar aos departamentos</button>
        <div className="empty">Departamento não encontrado.</div>
      </div>
    )
  }

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <button onClick={() => router.push('/departamentos')} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18 }}>‹ Voltar aos departamentos</button>
      <h1 style={{ margin: '0 0 20px', fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>{vm.name}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        {vm.kpis.map((k) => (
          <div key={k.label} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{k.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-1px', color: k.color }}>{k.value}</span><span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{k.unit}</span></div>
          </div>
        ))}
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--chart-2)' }} /> ClassRoom
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>Atividade da equipe na plataforma de treinamento</div>
        <ClassroomStats stats={[
          { icon: PenLine, label: 'Cursos criados', value: vm.classroom.criados, color: 'var(--accent)' },
          { icon: GraduationCap, label: 'Cursos assistidos', value: vm.classroom.assistidos, color: 'var(--chart-2)' },
          { icon: PlayCircle, label: 'Vídeos assistidos', value: vm.classroom.videos, color: 'var(--info)' },
        ]} />
      </div>

      {edu && (
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Escolaridade do setor</div>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{edu.informed} de {edu.total} informados</span>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 20, overflow: 'hidden', background: 'var(--surface-2)' }}>
            {edu.segs.map((s) => <div key={s.label} title={`${s.label}: ${s.count} (${s.pct}%)`} style={{ width: `${s.pct}%`, background: s.color }} />)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px 16px', marginTop: 14 }}>
            {edu.segs.map((s) => (
              <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-dim)' }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} /> {s.label} <b style={{ color: 'var(--text)' }}>{s.count}</b> <span style={{ color: 'var(--text-mute)' }}>({s.pct}%)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Evolução do score</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Últimos 12 meses</div>
          <svg viewBox="0 0 300 84" preserveAspectRatio="none" style={{ width: '100%', height: 120 }}>
            <path d={vm.histArea} fill="url(#dgrad)" opacity="0.5" />
            <path d={vm.histLine} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <defs><linearGradient id="dgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
          </svg>
        </div>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Comparativo com a empresa</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}><span>{vm.name}</span><span style={{ fontWeight: 700, color: 'var(--accent)' }}>{vm.score}</span></div><div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}><div style={{ height: '100%', width: vm.barSelf, background: 'var(--accent)', borderRadius: 20 }} /></div></div>
            <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}><span style={{ color: 'var(--text-dim)' }}>Média da empresa</span><span style={{ fontWeight: 700 }}>{vm.compAvg}</span></div><div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}><div style={{ height: '100%', width: vm.barComp, background: 'var(--text-mute)', borderRadius: 20 }} /></div></div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, margin: '22px 0 4px' }}>Atrasos do setor · últimas 18 semanas</div>
          <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 12 }}>Soma dos atrasos dos membros por dia; mais escuro = mais minutos.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(18,1fr)', gap: 3 }}>{vm.heat.map((c, i) => <div key={i} title={c.future ? '' : c.atrasos > 0 ? `${c.iso}: ${c.atrasos} atraso${c.atrasos > 1 ? 's' : ''}` : `${c.iso}: sem ocorrência`} style={{ aspectRatio: '1', borderRadius: 2, background: c.bg, opacity: c.future ? 0 : 1 }} />)}</div>
        </div>
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Ranking interno · {vm.name}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {vm.ranking.map((r) => (
            <div key={r.id} className="tc-row" onClick={() => router.push(`/funcionarios/${r.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 9, borderRadius: 8, cursor: 'pointer' }}>
              <span style={{ width: 20, fontSize: 12, fontWeight: 700, color: 'var(--text-mute)', textAlign: 'center', flex: 'none' }}>{r.rank}</span>
              <Avatar id={r.id} hasAvatar={r.hasAvatar} initials={r.initials} color={r.color} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{r.nome}</div><div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{r.cargo}</div></div>
              <div style={{ width: 120, height: 6, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden', flex: 'none' }}><div style={{ height: '100%', width: r.scorePct, background: r.scoreColor, borderRadius: 20 }} /></div>
              <span style={{ width: 32, textAlign: 'right', fontSize: 14, fontWeight: 700, color: r.scoreColor }}>{r.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
