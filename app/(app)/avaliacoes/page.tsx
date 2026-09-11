'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import { ancoraDe } from '@/lib/avaliacoes/criterios'
import Avatar from '../Avatar'

type Linha = {
  id: string; nome: string; cargo: string; hasAvatar: boolean
  departmentId: string | null; setor: string
  ehAvaliador: boolean; cabeADiretoria: boolean; setorSemAvaliador: boolean; quemAvalia: string[]
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
  /* ⚠️⚠️ A LISTA DE UM SETOR SÓ (`?setor=`). Nasceu em 11/09/2026 com o cartão
     "Avaliação mensal" do relatório do setor, que abria esta tela recortada. No mesmo
     dia o cartão saiu da tela do setor (pedido do dono) e a porta passou a ser o
     SELETOR DE SETOR daqui (achado do crítico: sem ele, a Diretoria e quem avalia dois
     setores — Evandro, Joice, Rosemeire — só viam a fila misturada). Sem o parâmetro,
     é a fila de tudo o que a pessoa alcança, como antes. */
  const sp = useSearchParams()
  const setorUrl = sp.get('setor')
  const [comp, setComp] = useState<string | null>(sp.get('competencia'))
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

  const base = setorUrl ? d.linhas.filter((l) => l.departmentId === setorUrl) : d.linhas
  const setorNome = setorUrl ? (base[0]?.setor ?? null) : null
  /* No setor, os números são DO SETOR: "Faltam avaliar" é tudo o que falta nele — o
     mesmo número do cartão do relatório —, e a parte que cabe a quem está olhando
     vai escrita embaixo. Sem setor, é a fila de sempre (o que EU posso fazer). */
  const kpi = setorUrl
    ? {
        total: base.length,
        publicadas: base.filter((l) => l.status === 'publicada').length,
        faltam: base.filter((l) => l.status !== 'publicada').length,
        meus: base.filter((l) => l.status !== 'publicada' && l.posso).length,
        orfaos: base.filter((l) => l.setorSemAvaliador).length,
      }
    : { total: d.total, publicadas: d.publicadas, faltam: d.faltam, meus: d.faltam, orfaos: d.orfaos }
  const qsSetor = setorUrl ? `&setor=${setorUrl}` : ''
  // Os setores que aparecem na fila de quem está olhando — só o que ele alcança.
  const setoresDaFila = [...new Map(d.linhas.filter((l) => l.departmentId).map((l) => [l.departmentId as string, l.setor])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
  const trocaSetor = (id: string) =>
    router.replace(`/avaliacoes?${id ? `setor=${id}&` : ''}competencia=${d.competencia}`)

  const visiveis = base
    // ⚠️ "Faltam" mostra o que EU posso fazer. Listar a pendência da casa
    // inteira num filtro chamado "faltam" faria o gestor procurar gente que ele
    // não avalia — e desconfiar da lista toda.
    .filter((l) => (filtro === 'todos' ? true : filtro === 'falta' ? l.status !== 'publicada' && l.posso : l.status === 'publicada'))
    .filter((l) => !busca || l.nome.toLowerCase().includes(busca.toLowerCase()) || l.setor.toLowerCase().includes(busca.toLowerCase()))

  const pct = kpi.total ? Math.round((kpi.publicadas / kpi.total) * 100) : 0

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      {setorUrl && (
        <button onClick={() => router.push(`/departamentos/${setorUrl}`)} className="tc-btn"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18 }}>
          ‹ Voltar ao relatório{setorNome ? ` de ${setorNome}` : ' do setor'}
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>
            Avaliação mensal · competência de {competenciaLabel(d.competencia)}
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon /> Avaliações{setorNome ? ` — ${setorNome}` : ''}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {setoresDaFila.length > 1 && (
            <select value={setorUrl ?? ''} onChange={(e) => trocaSetor(e.target.value)} aria-label="Setor" className="tc-btn"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
              <option value="">Todos os setores</option>
              {setoresDaFila.map(([id, nome]) => (<option key={id} value={id}>{nome}</option>))}
            </select>
          )}
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
        <Kpi label="Avaliados" value={`${kpi.publicadas}`} sub={`de ${kpi.total} pessoas${setorUrl ? ' do setor' : ''}`} color="var(--success)" />
        <Kpi label="Faltam avaliar" value={`${kpi.faltam}`}
          sub={kpi.faltam === 0 ? 'mês em dia' : setorUrl ? (kpi.meus ? `destas, ${kpi.meus} cabem a você` : 'nenhuma cabe a você') : 'ainda sem nota publicada'}
          color={kpi.faltam > 0 ? 'var(--warning)' : 'var(--text-mute)'} />
        <Kpi label="Progresso" value={`${pct}%`} sub="da competência" color="var(--accent)" bar={pct} />
        {kpi.orfaos > 0 && (
          <Kpi label="Sem quem avalie" value={`${kpi.orfaos}`} sub="ninguém definido para avaliá-las" color="var(--danger)" />
        )}
      </div>

      {kpi.orfaos > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderLeft: '3px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.55 }}>
          <span style={{ color: 'var(--danger)', flex: 'none' }}>⚠</span>
          <span>
            <b>{kpi.orfaos} pessoas ainda não têm ninguém definido para avaliá-las.</b> Todas têm
            setor — o que falta é dizer <i>quem</i>, no setor delas, faz a avaliação. Enquanto isso
            não for definido elas nunca serão avaliadas, e nada no sistema vai reclamar: avaliação
            que ninguém deve não aparece como atrasada.
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
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 140px 110px 70px', gap: 12, padding: '4px 12px 9px', borderBottom: '1px solid var(--border-soft)' }}>
          {['Pessoa', 'Quem avalia', 'Situação', '', 'Nota'].map((c, i) => (
            <div key={i} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mute)', textAlign: i === 4 ? 'right' : 'left' }}>{c}</div>
          ))}
        </div>
        {visiveis.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: 22, textAlign: 'center' }}>Ninguém nesta lista.</div>
        ) : visiveis.map((l) => (
          <div key={l.id} className="tc-row"
            onClick={() => router.push(`/avaliacoes/${l.id}?competencia=${d.competencia}${qsSetor}`)}
            style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 140px 110px 70px', gap: 12, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border-soft)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <Avatar id={l.id} hasAvatar={l.hasAvatar} initials={l.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--chart-1)" size={32} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{l.cargo} · {l.setor}</div>
              </div>
            </div>
            {/* QUEM avalia. A coluna que faltava: "pendente" sem dono não diz a
                ninguém o que fazer, e o rótulo antigo ("Setor sem avaliador")
                era lido como "esta pessoa não tem setor". */}
            <div style={{ minWidth: 0 }}>
              {l.quemAvalia.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
                  ninguém definido
                  <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-mute)', fontWeight: 400 }}>
                    defina em “Quem avalia”
                  </span>
                </span>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                  {l.quemAvalia[0]}
                  {l.quemAvalia.length > 1 && (
                    <span style={{ color: 'var(--text-mute)' }}> +{l.quemAvalia.length - 1}</span>
                  )}
                </span>
              )}
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

      {/* ⚠️ A legenda existe porque a MESMA lista mostra três pendências
          diferentes — a minha, a do outro e a que não tem dono. Sem dizer isso
          em palavras, o leitor conclui que a lista está errada. */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 14, fontSize: 11, color: 'var(--text-mute)', lineHeight: 1.6 }}>
        <span><b style={{ color: 'var(--warning)' }}>Você precisa avaliar</b> — está na sua mão</span>
        <span><b style={{ color: 'var(--text-dim)' }}>Com o avaliador dele</b> — outra pessoa é quem faz</span>
        <span><b style={{ color: 'var(--danger)' }}>Não será avaliado</b> — ninguém foi definido ainda</span>
      </div>
    </div>
  )
}

function Selo({ l }: { l: Linha }) {
  /*
   * ⚠️ Cada situação tem rótulo PRÓPRIO, e o rótulo diz o que ACONTECE, não o
   * estado interno. O antigo "Setor sem avaliador" foi lido pelo dono como
   * "esta pessoa não tem setor" — e todo mundo tem setor. Agora a coluna ao
   * lado diz QUEM avalia, e o selo só diz em que pé está.
   */
  if (l.status === 'publicada') return <Tag t={l.versao && l.versao > 1 ? `Avaliado · v${l.versao}` : 'Avaliado'} c="var(--success)" />
  if (l.status === 'rascunho') return <Tag t="Rascunho salvo" c="var(--warning)" />
  if (l.setorSemAvaliador) return <Tag t="Não será avaliado" c="var(--danger)" />
  if (l.posso) return <Tag t="Você precisa avaliar" c="var(--warning)" />
  return <Tag t="Com o avaliador dele" c="var(--text-mute)" />
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
