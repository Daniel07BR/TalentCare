'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, X } from 'lucide-react'
import Avatar from './Avatar'
import { useTalentData } from '@/lib/ui/data'
import { usePeriod } from '@/lib/ui/period'
import { deptName } from '@/lib/mock/employee'
import { NOME_DO_SISTEMA, type Detalhe, type Grupo, type Sistema } from '@/lib/pessoa-sistema-tipos'

/* ============================================================
   O PAINEL DA PESSOA — o que ela fez num sistema, no período do filtro.

   Pedido do dono (11/09/2026): no ClassRoom, clicar na pessoa e ver os cursos
   que ela concluiu e assistiu; depois, "faça o mesmo nos outros sistemas".

   ⚠️ Painel LATERAL, e não uma lista embaixo da linha: são dezenas de linhas
   diferentes nos nove resumos (rankings, tabelas, pódios), e o painel deixa cada
   uma igual — só o clique muda. Funciona igual dentro da janela "Ver detalhes"
   do relatório do setor, por cima dela.

   Dados: `/api/pessoa-sistema` (régua da ficha). Ao vivo nos sistemas que
   mandam o item; dia a dia do espelho nos que, por decisão, só mandam contagem.
   ============================================================ */

const Ctx = createContext<(sistema: Sistema, id: string) => void>(() => {})

/** Abre o painel da pessoa. Use no clique do nome, no lugar de ir à ficha. */
export function usePainelDaPessoa() {
  return useContext(Ctx)
}

export function PainelDaPessoaProvider({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState<{ sistema: Sistema; id: string } | null>(null)
  const pathname = usePathname()
  useEffect(() => { setAberto(null) }, [pathname])
  return (
    <Ctx.Provider value={(sistema, id) => setAberto({ sistema, id })}>
      {children}
      {aberto && <Painel sistema={aberto.sistema} id={aberto.id} onFechar={() => setAberto(null)} />}
    </Ctx.Provider>
  )
}

const dd = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(2, 4)}`
const MAX = 40

function Painel({ sistema, id, onFechar }: { sistema: Sistema; id: string; onFechar: () => void }) {
  const router = useRouter()
  const data = useTalentData()
  const { query, label } = usePeriod()
  const [d, setD] = useState<Detalhe | null>(null)
  const e = data.employees.find((x) => x.id === id)

  useEffect(() => {
    let vivo = true
    setD(null)
    fetch(`/api/pessoa-sistema?sistema=${sistema}&id=${encodeURIComponent(id)}&${query}`, { cache: 'no-store' })
      .then(async (r) => ({ ok: r.ok, j: await r.json().catch(() => ({})) }))
      .then(({ ok, j }) => { if (vivo) setD(ok || j.grupos ? j : { grupos: [], aoVivo: true, erro: j.error ?? 'Não foi possível carregar' }) })
      .catch(() => vivo && setD({ grupos: [], aoVivo: true, erro: 'Não foi possível carregar' }))
    return () => { vivo = false }
  }, [sistema, id, query])

  useEffect(() => {
    const h = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])

  const comItens = d?.grupos.filter((g) => g.itens.length > 0) ?? []
  const vazios = d?.grupos.filter((g) => g.itens.length === 0).map((g) => g.titulo) ?? []

  return (
    <div onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 80, display: 'flex', justifyContent: 'flex-end' }}>
      <aside onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${e?.nome ?? 'Pessoa'} no ${NOME_DO_SISTEMA[sistema]}`}
        className="cpop" style={{ width: 'min(560px, 100vw)', height: '100%', background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: '-12px 0 40px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
          {e && <Avatar id={e.id} hasAvatar={e.hasAvatar} initials={e.initials} color={e.color} size={42} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e?.nome ?? '—'}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{e ? `${e.cargo} · ${deptName(data, e.dept)}` : ''}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 2 }}>
              <b style={{ color: 'var(--accent)' }}>{NOME_DO_SISTEMA[sistema]}</b> · {label}
            </div>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" title="Fechar (Esc)"
            style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-dim)', cursor: 'pointer', flex: 'none' }}>
            <X size={16} />
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          {!d ? <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Buscando…</div>
            : d.erro ? <div style={{ fontSize: 12.5, color: 'var(--danger)', lineHeight: 1.5 }}>{d.erro}. Os números da tela seguem valendo — só a lista não veio.</div>
            : d.semConta ? <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Sem conta no Nexus — não há como casar esta pessoa com o {NOME_DO_SISTEMA[sistema]}.</div>
            : comItens.length === 0 ? <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Nenhum registro de {e?.nome.split(' ')[0] ?? 'da pessoa'} neste sistema no período.</div>
            : comItens.map((g) => <GrupoDaPessoa key={g.chave} g={g} />)}
          {d?.aviso && <div style={{ fontSize: 11.5, color: 'var(--warning)', marginBottom: 12, lineHeight: 1.5 }}>{d.aviso}</div>}
          {d && !d.erro && comItens.length > 0 && vazios.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 6 }}>Sem registro no período: {vazios.join(', ').toLowerCase()}.</div>
          )}
        </div>

        <footer style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, fontSize: 10.5, color: 'var(--text-mute)', lineHeight: 1.45 }}>
            {!d ? '' : sistema === 'chat'
              ? 'Chamados ao vivo do Chat; mensagens só como contagem por dia — o texto das conversas não sai do Chat.'
              : d.aoVivo
              ? 'Lista ao vivo do sistema. O número ao lado do nome é atualizado de hora em hora — hoje a lista pode ter um item a mais.'
              : sistema === 'whatsapp'
                ? 'Dia a dia, do espelho do TalentCare. Este sistema envia só contagens — nenhum assunto nem texto de conversa — por decisão de privacidade.'
                : 'Dia a dia, do espelho do TalentCare.'}
          </div>
          <button type="button" onClick={() => router.push(`/funcionarios/${id}`)}
            style={{ flex: 'none', background: 'none', border: 'none', color: 'var(--accent)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            Abrir a ficha ›
          </button>
        </footer>
      </aside>
    </div>
  )
}

function GrupoDaPessoa({ g }: { g: Grupo }) {
  const [todos, setTodos] = useState(false)
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const total = g.itens.reduce((a, i) => a + (i.valor ?? 1), 0)
  const vis = todos ? g.itens : g.itens.slice(0, MAX)
  return (
    <section style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{g.titulo}</h3>
        <span style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>{g.resumo ?? total.toLocaleString('pt-BR')}</span>
      </div>
      {vis.map((it) => {
        const aberto = abertos.has(it.id)
        const tem = !!it.filhos?.length
        return (
          <div key={it.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
            <div role={tem ? 'button' : undefined} tabIndex={tem ? 0 : undefined} aria-expanded={tem ? aberto : undefined}
              onClick={tem ? () => setAbertos((s) => { const n = new Set(s); n.has(it.id) ? n.delete(it.id) : n.add(it.id); return n }) : undefined}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', cursor: tem ? 'pointer' : undefined }}>
              {tem && <ChevronRight size={13} style={{ flex: 'none', marginTop: 2, color: 'var(--text-mute)', transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{it.titulo}</div>
                {it.sub && <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 1 }}>{it.sub}</div>}
              </div>
              <span style={{ flex: 'none', fontSize: 11, color: 'var(--text-mute)', fontVariantNumeric: 'tabular-nums' }}>{dd(it.dia)}</span>
            </div>
            {aberto && it.filhos!.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'var(--text-dim)', padding: '2px 0 4px 21px' }}>
                <span style={{ flex: 1, minWidth: 0 }}>{f.titulo}</span>
                <span style={{ flex: 'none', color: 'var(--text-mute)', fontVariantNumeric: 'tabular-nums' }}>{dd(f.dia)}</span>
              </div>
            ))}
          </div>
        )
      })}
      {g.itens.length > MAX && (
        <button type="button" onClick={() => setTodos((v) => !v)}
          style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--accent)', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          {todos ? 'Mostrar menos' : `Mostrar todos (${g.itens.length})`}
        </button>
      )}
    </section>
  )
}
