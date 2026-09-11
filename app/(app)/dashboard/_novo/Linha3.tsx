'use client'
import { useRouter } from 'next/navigation'
import { Trophy, BookOpen, Users, UsersRound } from 'lucide-react'
import type { DeptHighlight, EscSegment } from '@/lib/mock/dashboard'
import type { Grupo } from '@/lib/painel/visao'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import Avatar from '../../Avatar'
import v from '../../_visao/visao.module.css'
import p from './painel.module.css'
import { Acao, Cabeca, Esqueleto, Vazio, num } from './pecas'

/* ============================================================
   LINHA 3 e GÊNERO — Destaque por departamento, Escolaridade, Gerações e o
   comparativo por gênero.

   ⚠️ Escolaridade, Gerações e Gênero são RETRATO DE HOJE e não acompanham o
   filtro — a tela diz isso em cada cartão (regra (b) da casa). O clique num
   grupo abre quem está nele; o "ver ›" leva à página de sempre.
   ============================================================ */

const RETRATO = 'retrato de hoje · não acompanha o filtro'

export function Destaque({ lista, info, carregando, recarregando = false, erro = false }: {
  lista: DeptHighlight[]
  info: { competencia: string | null; estado: string | null }
  carregando: boolean
  /** O filtro trocou e a pontuação nova ainda não chegou — a lista fica apagada. */
  recarregando?: boolean
  /** A pontuação não pôde ser lida. ⚠️ Sem isto a lista vinha vazia e a tela
   *  dizia "Ninguém pontuou" — uma queda de rede virando afirmação. Achado do crítico. */
  erro?: boolean
}) {
  const router = useRouter()
  return (
    <section className={v.cartao}>
      <Cabeca Icone={Trophy} cor="var(--n-amber)" titulo="Destaque por departamento"
        sub={<>
          Quem mais pontuou em cada setor{info.competencia ? ` · ${competenciaLabel(info.competencia)}` : ''}
          {info.estado === 'parcial' && <> · <b style={{ color: 'var(--n-amber)' }}>parcial</b>, mês em curso</>}
          {info.estado === 'previa' && <> · <b style={{ color: 'var(--n-amber)' }}>prévia</b>, ainda não gravada</>}
          <br />pontos de setores diferentes <b>não</b> se comparam
        </>} />
      {/* ⚠️ Sem "ver todos ›" (11/09/2026): levava ao `/ranking`, que saiu — com cada
          setor pontuando pela própria régua, um ranking da casa compara o que não
          se compara. O ranking de cada setor mora no relatório do setor. */}
      {/* ⚠️⚠️ Ordem ALFABÉTICA de setor e SEM número de posição, de propósito: o
          conceito numerava de 1 a 7, e isso faria desta lista um pódio entre
          setores — a comparação que o antigo `/ranking` já avisava que não valia. */}
      {carregando ? <Esqueleto linhas={7} alto={28} />
        : erro ? <Vazio><span style={{ color: 'var(--n-red)' }}>Não foi possível ler a pontuação agora — recarregue a página.</span></Vazio>
        : lista.length === 0 ? <Vazio>Ninguém pontuou na competência deste filtro.</Vazio>
        : (
          <div className={recarregando ? p.recarregando : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {lista.map((r) => (
              <button key={r.deptId} type="button" className={v.linhaClicavel} onClick={() => router.push(`/funcionarios/${r.id}`)}
                title={`Abrir a ficha de ${r.nome}`}
                style={{ display: 'grid', gridTemplateColumns: '8px 28px minmax(0, 1fr) auto', gap: 9, alignItems: 'center', padding: '5px 6px', background: 'none', border: 'none', font: 'inherit', color: 'inherit', textAlign: 'left', width: '100%' }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: r.color }} />
                <Avatar id={r.id} hasAvatar={r.hasAvatar} initials={r.initials} color={r.color} size={28} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nome}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--n-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.deptNome} · {r.cargo}
                    {r.comparadoCom <= 1 && <span style={{ color: 'var(--n-amber)' }}> · único avaliável no setor</span>}
                  </span>
                </span>
                <span className="cnum" style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--n-orange)' }}>{num(r.score)}</span>
              </button>
            ))}
          </div>
        )}
    </section>
  )
}

/** Uma linha de legenda que abre quem está no grupo. */
function LinhaGrupo({ g, abrir, extra, pct }: { g: Grupo; abrir: (g: Grupo) => void; extra?: React.ReactNode; pct?: number }) {
  return (
    <button type="button" className={v.linhaClicavel} onClick={() => abrir(g)} title={`Ver as ${g.pessoas.length} pessoas`}
      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '4px 6px', background: 'none', border: 'none', font: 'inherit', color: 'inherit', textAlign: 'left', fontSize: 12 }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: g.cor, flex: 'none' }} />
      <span style={{ flex: 1, minWidth: 0, color: 'var(--n-text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.rotulo}</span>
      {extra}
      <b className="cnum" style={{ minWidth: 22, textAlign: 'right' }}>{g.quantos}</b>
      {pct != null && <span className="cnum" style={{ color: 'var(--n-text-3)', width: 34, textAlign: 'right' }}>{pct}%</span>}
    </button>
  )
}

export function Escolaridade({ total, grupos, fatias, topPct, topRotulo, abrir, abrirDetalhe }: {
  total: number; grupos: Grupo[]; fatias: EscSegment[]; topPct: number; topRotulo: string
  abrir: (g: Grupo) => void
  /** A janela da Escolaridade (pessoa por pessoa, por setor). */
  abrirDetalhe: () => void
}) {
  return (
    <section className={v.cartao}>
      <Cabeca Icone={BookOpen} titulo="Distribuição por escolaridade" sub={`${total} colaboradores · ${RETRATO}`}
        acao={<Acao onClick={abrirDetalhe} dica="Abrir a escolaridade pessoa por pessoa, por setor">ver ›</Acao>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 150px) minmax(0, 1fr)', gap: 14, alignItems: 'center' }}>
        <div style={{ position: 'relative', aspectRatio: '1 / 1' }}>
          <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} aria-hidden="true">
            <circle cx="60" cy="60" r="46" fill="none" stroke="var(--n-card-2)" strokeWidth="14" />
            {fatias.map((s) => <circle key={s.label} cx="60" cy="60" r="46" fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={s.dash} strokeDashoffset={s.offset} />)}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <span className="cnum" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.8px' }}>{topPct}%</span>
            <span style={{ fontSize: 10, color: 'var(--n-text-3)' }}>{topRotulo}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          {grupos.map((g) => <LinhaGrupo key={g.chave} g={g} abrir={abrir} />)}
        </div>
      </div>
      {/* ⚠️ A rosca conta FORMAÇÕES: quem tem MBA e Pós entra nas duas. */}
      <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 8 }}>Quem tem mais de uma pós entra em cada uma.</div>
    </section>
  )
}

export function Geracoes({ media, grupos, pcts, idades, abrir }: {
  media: number | null; grupos: Grupo[]; pcts: Record<string, number>; idades: Record<string, string>
  abrir: (g: Grupo) => void
}) {
  const router = useRouter()
  return (
    <section className={v.cartao}>
      <Cabeca Icone={Users} titulo="Gerações" sub={<>Idade média: <b style={{ color: 'var(--n-text)' }}>{media ?? '—'}</b> anos · {RETRATO}</>}
        acao={<Acao onClick={() => router.push('/geracoes')} dica="Abrir a página de gerações">ver ›</Acao>} />
      <div style={{ display: 'flex', height: 12, borderRadius: 20, overflow: 'hidden', background: 'var(--n-card-2)', margin: '4px 0 14px' }}>
        {grupos.map((g) => (
          <button key={g.chave} type="button" onClick={() => abrir(g)} title={`${g.rotulo}: ${g.quantos}`}
            style={{ width: `${pcts[g.chave] ?? 0}%`, background: g.cor, border: 'none', padding: 0, cursor: 'pointer' }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {grupos.map((g) => (
          <LinhaGrupo key={g.chave} g={g} abrir={abrir} pct={pcts[g.chave]}
            extra={idades[g.chave] ? <span className="cnum" style={{ color: 'var(--n-text-3)', whiteSpace: 'nowrap' }}>{idades[g.chave]} anos</span> : undefined} />
        ))}
      </div>
    </section>
  )
}

export function Genero({ grupos, pcts, idades, abrir }: {
  grupos: Grupo[]; pcts: { M: number; F: number }; idades: { M: number | null; F: number | null }
  abrir: (g: Grupo) => void
}) {
  const router = useRouter()
  const [m, f, ni] = grupos
  return (
    <section className={v.cartao} style={{ marginBottom: 14 }}>
      <div className={p.genero}>
        <Cabeca Icone={UsersRound} cor="var(--n-purple)" titulo="Comparativo por gênero"
          sub={<>Quadro ativo · {m.quantos + f.quantos} com gênero informado{ni.quantos ? ` · ${ni.quantos} sem informação` : ''}<br />{RETRATO}</>} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, display: 'flex', height: 12, borderRadius: 20, overflow: 'hidden', background: 'var(--n-card-2)' }}>
              <button type="button" onClick={() => abrir(m)} title={`Masculino: ${m.quantos}`} style={{ width: `${pcts.M}%`, background: m.cor, border: 'none', padding: 0, cursor: 'pointer' }} />
              <button type="button" onClick={() => abrir(f)} title={`Feminino: ${f.quantos}`} style={{ width: `${pcts.F}%`, background: f.cor, border: 'none', padding: 0, cursor: 'pointer' }} />
            </div>
            <Acao onClick={() => router.push('/genero')} dica="Abrir a página de gênero">ver ›</Acao>
          </div>
          <div className={p.generoPaineis}>
            {([[m, pcts.M, idades.M], [f, pcts.F, idades.F]] as const).map(([g, pct, idade]) => (
              <button key={g.chave} type="button" className={v.clicavel} onClick={() => abrir(g)} title={`Ver as ${g.quantos} pessoas`}
                style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--n-card-2)', border: '1px solid var(--n-border-2)', borderRadius: 12, padding: '12px 16px' }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: g.cor }} />{g.rotulo}
                  </span>
                  <span className="cnum" style={{ display: 'block', fontSize: 26, fontWeight: 800, letterSpacing: '-1px', color: g.cor, lineHeight: 1.15 }}>
                    {g.quantos} <span style={{ fontSize: 12.5, color: 'var(--n-text-3)', fontWeight: 600, letterSpacing: 0 }}>({pct}%)</span>
                  </span>
                </span>
                {/* ⚠️ O "Score médio" do conceito SAIU (decisão do dono, 11/09/2026):
                    o score nunca foi validado e já tinha saído do relatório do setor. */}
                <span style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: 10.5, color: 'var(--n-text-3)' }}>Idade média</span>
                  <span className="cnum" style={{ display: 'block', fontSize: 16, fontWeight: 700 }}>{idade ?? '—'}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
