'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, GraduationCap, PlayCircle } from 'lucide-react'
import { usePeriod } from '@/lib/ui/period'

type Video = { videoId: string; titulo: string; cursoId: string; curso: string; dia: string }
type Curso = { cursoId: string; titulo: string; dia: string }
type Resp = { videos: Video[]; cursos: Curso[]; semConta?: boolean; erro?: string }

const dia = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(2, 4)}`

/* ============================================================
   O que UMA pessoa concluiu e assistiu no ClassRoom, no período do filtro —
   o que abre ao clicar no nome dela (pedido do dono, 11/09/2026).
   Vem de `/api/classroom-pessoa` (régua da ficha), ao vivo do ClassRoom, com as
   mesmas definições do número ao lado do nome.
   ============================================================ */
export default function AprendizadoDaPessoa({ id }: { id: string }) {
  const router = useRouter()
  const { query, label } = usePeriod()
  const [r, setR] = useState<Resp | null>(null)
  const [aberto, setAberto] = useState<Set<string>>(new Set())

  useEffect(() => {
    let vivo = true
    setR(null)
    fetch(`/api/classroom-pessoa?id=${encodeURIComponent(id)}&${query}`, { cache: 'no-store' })
      .then(async (x) => ({ ok: x.ok, j: await x.json().catch(() => ({})) }))
      .then(({ ok, j }) => { if (vivo) setR(ok ? j : { videos: [], cursos: [], erro: j.erro ?? j.error ?? 'Não foi possível carregar' }) })
      .catch(() => vivo && setR({ videos: [], cursos: [], erro: 'Não foi possível carregar' }))
    return () => { vivo = false }
  }, [id, query])

  const caixa: React.CSSProperties = { margin: '4px 0 8px 28px', padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 10 }
  if (!r) return <div style={{ ...caixa, fontSize: 12, color: 'var(--text-dim)' }}>Buscando no ClassRoom…</div>
  // ⚠️ Erro é ERRO, dito como tal — lista vazia se leria "não estudou nada".
  if (r.erro) return <div style={{ ...caixa, fontSize: 12, color: 'var(--danger)' }}>{r.erro}. Os números ao lado seguem valendo.</div>
  if (r.semConta) return <div style={{ ...caixa, fontSize: 12, color: 'var(--text-dim)' }}>Sem conta no Nexus — não há como casar com o ClassRoom.</div>

  // Vídeos agrupados por curso, na ordem do mais recente.
  const porCurso = new Map<string, { curso: string; videos: Video[] }>()
  for (const v of r.videos) {
    const g = porCurso.get(v.cursoId) ?? { curso: v.curso, videos: [] }
    g.videos.push(v); porCurso.set(v.cursoId, g)
  }
  const alterna = (k: string) => setAberto((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const titulo = (t: string, n: number, Icone: typeof GraduationCap) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 6 }}>
      <Icone size={13} /> {t} · {n}
    </div>
  )
  const linha: React.CSSProperties = { display: 'flex', gap: 10, fontSize: 12, padding: '4px 0', borderTop: '1px solid var(--border-soft)' }

  return (
    <div style={caixa}>
      <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 10 }}>No período: {label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 16 }}>
        <div>
          {titulo('Cursos concluídos', r.cursos.length, GraduationCap)}
          {r.cursos.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Nenhum curso concluído no período.</div>
            : r.cursos.map((c) => (
              <div key={c.cursoId} style={linha}>
                <span style={{ flex: 1, minWidth: 0 }}>{c.titulo}</span>
                <span style={{ color: 'var(--text-mute)', fontVariantNumeric: 'tabular-nums', flex: 'none' }}>{dia(c.dia)}</span>
              </div>
            ))}
        </div>
        <div>
          {titulo('Vídeos assistidos', r.videos.length, PlayCircle)}
          {r.videos.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Nenhum vídeo assistido no período.</div>
            : [...porCurso].map(([k, g]) => (
              <div key={k} style={{ borderTop: '1px solid var(--border-soft)' }}>
                <button type="button" onClick={() => alterna(k)} aria-expanded={aberto.has(k)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', textAlign: 'left', fontSize: 12 }}>
                  <ChevronRight size={13} style={{ flex: 'none', color: 'var(--text-mute)', transform: aberto.has(k) ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                  <span style={{ flex: 1, minWidth: 0 }}>{g.curso}</span>
                  <b style={{ flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{g.videos.length}</b>
                </button>
                {aberto.has(k) && g.videos.map((v) => (
                  <div key={v.videoId} style={{ display: 'flex', gap: 10, fontSize: 11.5, padding: '2px 0 2px 19px', color: 'var(--text-dim)' }}>
                    <span style={{ flex: 1, minWidth: 0 }}>{v.titulo}</span>
                    <span style={{ color: 'var(--text-mute)', fontVariantNumeric: 'tabular-nums', flex: 'none' }}>{dia(v.dia)}</span>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>
      <button type="button" onClick={() => router.push(`/funcionarios/${id}`)}
        style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        Abrir a ficha ›
      </button>
    </div>
  )
}
