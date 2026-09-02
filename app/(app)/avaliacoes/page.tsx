'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import { ancoraDe } from '@/lib/avaliacoes/criterios'
import Avatar from '../Avatar'

type Linha = {
  id: string; nome: string; cargo: string; hasAvatar: boolean
  departmentId: string | null; setor: string
  ehAvaliador: boolean; cabeADiretoria: boolean; setorSemAvaliador: boolean
  avaliacaoId: string | null; status: string; media: number | null; versao: number | null
  publishedAt: string | null; ciente: boolean; comentarioDoAvaliado: string | null
  posso: boolean
}
type Fila = {
  competencia: string; linhas: Linha[]
  total: number; publicadas: number; faltam: number; orfaos: number
  disponiveis: string[]
  eu: { id: string; escopo: string; avalia: number; podeGerir: boolean }
}

const Icon = ({ size = 22, color = 'var(--accent)' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)

export default function AvaliacoesPage() {
  const router = useRouter()
  const [comp, setComp] = useState<string | null>(null)
  const [d, setD] = useState<Fila | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | 'falta' | 'feitos'>('todos')
  const [busca, setBusca] = useState('')

  const carregar = useCallback((c: string | null) => {
    setLoading(true)
    fetch(`/api/avaliacoes${c ? `?competencia=${c}` : ''}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Fila | null) => { setD(j); if (j && !c) setComp(j.competencia) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { carregar(comp) }, [comp, carregar])

  if (loading && !d) return <div style={{ padding: 40, color: 'var(--text-dim)' }}>Carregando…</div>
  if (!d) return <div style={{ padding: 40, color: 'var(--text-dim)' }}>Não foi possível carregar as avaliações.</div>

  const visiveis = d.linhas
    // ⚠️ "Faltam" mostra o que EU posso fazer. Listar a pendência da casa
    // inteira num filtro chamado "faltam" faria o gestor procurar gente que ele
    // não avalia — e desconfiar da lista toda.
    .filter((l) => (filtro === 'todos' ? true : filtro === 'falta' ? l.status !== 'publicada' && l.posso : l.status === 'publicada'))
    .filter((l) => !busca || l.nome.toLowerCase().includes(busca.toLowerCase()) || l.setor.toLowerCase().includes(busca.toLowerCase()))

  const pct = d.total ? Math.round((d.publicadas / d.total) * 100) : 0

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>
            Avaliação mensal · competência de {competenciaLabel(d.competencia)}
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon /> Avaliações
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={d.competencia}
            onChange={(e) => setComp(e.target.value)}
            className="tc-btn"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            {d.disponiveis.map((c) => (<option key={c} value={c}>{competenciaLabel(c)}</option>))}
          </select>
          {d.eu.podeGerir && (
            <button onClick={() => router.push('/avaliadores')} className="tc-btn" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', padding: '8px 14px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
              Quem avalia
            </button>
          )}
        </div>
      </div>

      {/*
        ⚠️⚠️ "Falta" é DERIVADO — a lista de avaliáveis menos quem tem avaliação
        publicada. Não existe campo `avaliado = true`: um campo desses só é
        escrito por um caminho, e no dia em que alguém mudar de setor ou for
        admitido no meio do mês o alerta fica aceso para sempre. A primeira
        reação de quem recebe alerta eterno é parar de olhar o alerta.
      */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 14, marginBottom: 16 }}>
        <Kpi label="Avaliados" value={`${d.publicadas}`} sub={`de ${d.total} pessoas`} color="var(--success)" />
        <Kpi label="Faltam avaliar" value={`${d.faltam}`} sub={d.faltam === 0 ? 'mês em dia' : 'ainda sem nota publicada'} color={d.faltam > 0 ? 'var(--warning)' : 'var(--text-mute)'} />
        <Kpi label="Progresso" value={`${pct}%`} sub="da competência" color="var(--accent)" bar={pct} />
        {d.orfaos > 0 && (
          <Kpi label="Sem avaliador" value={`${d.orfaos}`} sub="setor sem ninguém definido" color="var(--danger)" />
        )}
      </div>

      {d.orfaos > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderLeft: '3px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.55 }}>
          <span style={{ color: 'var(--danger)', flex: 'none' }}>⚠</span>
          <span>
            <b>{d.orfaos} pessoas estão em setores sem avaliador definido</b> — elas não aparecem
            como "falta avaliar" porque não há quem cobrar. Enquanto ninguém for nomeado, elas nunca
            serão avaliadas e nada no sistema vai reclamar.
            {d.eu.podeGerir && <> <a onClick={() => router.push('/avaliadores')} style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>Definir quem avalia</a>.</>}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['todos', 'falta', 'feitos'] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)} className="tc-btn"
            style={{ background: filtro === f ? 'var(--accent)' : 'var(--surface-2)', color: filtro === f ? '#fff' : 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 14px', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
            {f === 'todos' ? 'Todos' : f === 'falta' ? 'Faltam' : 'Avaliados'}
          </button>
        ))}
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pessoa ou setor…"
          style={{ flex: 1, minWidth: 180, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '7px 12px', fontSize: 13, fontFamily: 'inherit' }} />
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 8 }}>
        {visiveis.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: 22, textAlign: 'center' }}>Ninguém nesta lista.</div>
        ) : visiveis.map((l) => (
          <div key={l.id} className="tc-row"
            onClick={() => router.push(`/avaliacoes/${l.id}?competencia=${d.competencia}`)}
            style={{ display: 'grid', gridTemplateColumns: '1fr 150px 120px 90px', gap: 12, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border-soft)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <Avatar id={l.id} hasAvatar={l.hasAvatar} initials={l.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--chart-1)" size={32} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{l.cargo} · {l.setor}</div>
              </div>
            </div>
            <div><Selo l={l} /></div>
            <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>
              {l.status === 'publicada' && l.ciente && <span style={{ color: 'var(--success)' }}>✓ deu ciência</span>}
              {l.status === 'publicada' && !l.ciente && 'aguarda ciência'}
              {l.status === 'publicada' && l.comentarioDoAvaliado && <div style={{ color: 'var(--info)' }}>💬 comentou</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              {l.media != null ? (
                <span className="cnum" style={{ fontSize: 19, fontWeight: 800, color: ancoraDe(l.media).color }}>
                  {l.media.toFixed(1)}
                </span>
              ) : <span style={{ fontSize: 12, color: 'var(--text-mute)' }}>—</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Selo({ l }: { l: Linha }) {
  // ⚠️ Cada situação tem rótulo PRÓPRIO. Um "pendente" cobrindo os quatro casos
  // faria o gestor cobrar quem ele nem avalia — e desconfiar da lista inteira.
  if (l.setorSemAvaliador) return <Tag t="Setor sem avaliador" c="var(--danger)" />
  if (l.cabeADiretoria && l.status !== 'publicada') return <Tag t={l.posso ? 'Falta · cabe à Diretoria' : 'Cabe à Diretoria'} c={l.posso ? 'var(--warning)' : 'var(--text-mute)'} />
  if (l.status === 'publicada') return <Tag t={l.versao && l.versao > 1 ? `Avaliado · v${l.versao}` : 'Avaliado'} c="var(--success)" />
  if (l.status === 'rascunho') return <Tag t="Rascunho" c="var(--warning)" />
  return <Tag t={l.posso ? 'Falta avaliar' : 'Pendente'} c={l.posso ? 'var(--warning)' : 'var(--text-mute)'} />
}

const Tag = ({ t, c }: { t: string; c: string }) => (
  <span style={{ fontSize: 11, fontWeight: 600, color: c, background: 'var(--surface-2)', border: `1px solid ${c}33`, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>{t}</span>
)

function Kpi({ label, value, sub, color, bar }: { label: string; value: string; sub: string; color: string; bar?: number }) {
  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-1px', color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4 }}>{sub}</div>
      {bar != null && (
        <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 4, marginTop: 9, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${bar}%`, background: color, borderRadius: 4 }} />
        </div>
      )}
    </div>
  )
}
