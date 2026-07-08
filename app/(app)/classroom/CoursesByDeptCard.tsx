'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useTalentData } from '@/lib/ui/data'
import { deptName } from '@/lib/mock/employee'
import { useClassroomCourses } from '@/lib/ui/classroom-courses'
import Avatar from '../Avatar'

type CourseItem = { courseId: string; title: string; createdAt: string }
type CreatorGroup = {
  creatorId: string; creatorName: string; initials: string; color: string; hasAvatar: boolean
  count: number; items: CourseItem[]
}
type DeptGroup = { id: string; nome: string; color: string; count: number; creators: CreatorGroup[] }

const OTHER_ID = '__outros__'
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CoursesByDeptCard() {
  const router = useRouter()
  const data = useTalentData()
  const { courses, loading } = useClassroomCourses()
  const [openDepts, setOpenDepts] = useState<Set<string>>(new Set())
  const [openCreators, setOpenCreators] = useState<Set<string>>(new Set())

  const { groups, total } = useMemo(() => {
    const byNexus = new Map(data.employees.filter((e) => e.nexusUserId).map((e) => [e.nexusUserId as string, e]))
    const depts = new Map<string, DeptGroup>()
    const creators = new Map<string, CreatorGroup>() // key: deptId|creatorId

    for (const c of courses) {
      const e = byNexus.get(c.creatorNexusUserId)
      const deptId = e ? e.dept : OTHER_ID
      let dg = depts.get(deptId)
      if (!dg) {
        dg = {
          id: deptId,
          nome: e ? deptName(data, e.dept) : 'Outros',
          color: e ? (data.departments.find((d) => d.id === e.dept)?.color ?? 'var(--accent)') : 'var(--text-mute)',
          count: 0, creators: [],
        }
        depts.set(deptId, dg)
      }
      dg.count++

      const creatorKey = `${deptId}|${c.creatorNexusUserId}`
      let cg = creators.get(creatorKey)
      if (!cg) {
        cg = {
          creatorId: e?.id ?? '', creatorName: e?.nome ?? '—',
          initials: e?.initials ?? '?', color: e?.color ?? 'var(--text-mute)', hasAvatar: e?.hasAvatar ?? false,
          count: 0, items: [],
        }
        creators.set(creatorKey, cg)
        dg.creators.push(cg)
      }
      cg.count++
      cg.items.push({ courseId: c.courseId, title: c.title, createdAt: c.createdAt })
    }

    const groups = Array.from(depts.values()).sort((a, b) => b.count - a.count)
    groups.forEach((dg) => {
      dg.creators.sort((a, b) => b.count - a.count)
      dg.creators.forEach((cg) => cg.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    })
    return { groups, total: groups.reduce((s, x) => s + x.count, 0) }
  }, [courses, data])

  const max = Math.max(1, ...groups.map((d) => d.count))
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const n = new Set(set)
    n.has(id) ? n.delete(id) : n.add(id)
    setter(n)
  }

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Cursos criados por departamento</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{total.toLocaleString('pt-BR')} no período</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>Clique no setor para ver quem gravou e quantos; clique no funcionário para ver os cursos</div>

      {loading && courses.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Carregando…</div>
      ) : groups.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Nenhum curso criado no período.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {groups.map((d) => {
            const isOpen = openDepts.has(d.id)
            return (
              <div key={d.id} style={{ borderRadius: 10, overflow: 'hidden', border: isOpen ? '1px solid var(--border-soft)' : '1px solid transparent' }}>
                <div className="tc-row" onClick={() => toggle(openDepts, setOpenDepts, d.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '8px 8px', borderRadius: 10 }}>
                  <ChevronRight size={15} style={{ flex: 'none', color: 'var(--text-mute)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flex: 'none' }} />
                  <div style={{ width: 110, flex: 'none', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
                  <div style={{ flex: 1, height: 9, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(d.count / max) * 100}%`, background: 'var(--accent)', borderRadius: 20 }} />
                  </div>
                  <div style={{ width: 34, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.count}</div>
                </div>

                {isOpen && (
                  <div style={{ padding: '2px 8px 8px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {d.creators.map((cg) => {
                      const ckey = `${d.id}|${cg.creatorId}|${cg.creatorName}`
                      const cOpen = openCreators.has(ckey)
                      return (
                        <div key={ckey}>
                          <div className="tc-row" onClick={() => toggle(openCreators, setOpenCreators, ckey)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 6px', borderRadius: 8, cursor: 'pointer' }}>
                            <ChevronRight size={13} style={{ flex: 'none', color: 'var(--text-mute)', transform: cOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                            <Avatar id={cg.creatorId} hasAvatar={cg.hasAvatar} initials={cg.initials} color={cg.color} size={24} />
                            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cg.creatorName}</div>
                            <span style={{ flex: 'none', fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{cg.count} <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}>{cg.count === 1 ? 'curso' : 'cursos'}</span></span>
                          </div>
                          {cOpen && (
                            <div style={{ padding: '1px 6px 6px 43px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {cg.items.map((it) => (
                                <div key={it.courseId} className="tc-row" onClick={() => cg.creatorId && router.push(`/funcionarios/${cg.creatorId}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px', borderRadius: 8, cursor: cg.creatorId ? 'pointer' : 'default' }}>
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-mute)', flex: 'none' }} />
                                  <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
                                  <div style={{ flex: 'none', fontSize: 11.5, color: 'var(--text-mute)', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(it.createdAt)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
