'use client'
import { useState, useEffect } from 'react'
import { BotaoDetalhe } from '../../_visao/Detalhe'
import type { DeptMetrics } from '@/lib/ui/dept-period'
import { geomLine } from '@/lib/mock/data'
import Avatar from '../../Avatar'

/* ============================================================
   A TENDÊNCIA — atividade mês a mês, REAL.

   ⚠️⚠️ Substitui a "Evolução do score · Últimos 12 meses", que era um passeio
   aleatório semeado pelo id do setor e terminava no score de hoje: uma linha sem
   relação nenhuma com o passado, ocupando o lugar mais nobre da tela.

   Não dá para reconstruir o SCORE mês a mês (não há snapshot mensal). A
   ATIVIDADE dá — está nos espelhos diários —, e é ela que responde de verdade
   "o setor produziu mais ou menos que antes".
   ============================================================ */

const mesCurto = (mes: string) => {
  const [a, m] = mes.split('-')
  return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1]}/${a.slice(2)}`
}

export function Tendencia({ m }: { m: DeptMetrics }) {
  const s = m.serie
  // ⚠️ Menos de 3 meses não é tendência, é um par de pontos ligado por uma reta
  // — e uma reta convence. Melhor dizer que ainda não dá.
  if (s.length < 3) {
    return (
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Atividade mês a mês</div>
        {/* ⚠️ "Ainda não há meses suficientes" é uma promessa — e para Limpeza,
            Cozinha e Pousada ela nunca se cumpre: o trabalho delas não passa por
            nenhuma das oito fontes. Prometer o que não vem é pior que dizer não. */}
        <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          {s.length === 0
            ? 'O trabalho deste setor não passa por nenhuma das oito fontes medidas — não haverá série de atividade, e isso não é uma falha de registro.'
            : `Há ${s.length} ${s.length === 1 ? 'mês' : 'meses'} com registro: ainda não dá para desenhar tendência. Dois pontos ligados por uma reta parecem uma tendência e não são.`}
        </div>
      </div>
    )
  }

  const vals = s.map((x) => x.atividade)
  const g = geomLine(vals, 700, 110, 10)
  const ultimo = vals[vals.length - 1]
  const anterior = vals[vals.length - 2]
  const varia = anterior > 0 ? Math.round(((ultimo - anterior) / anterior) * 100) : null
  const pico = Math.max(...vals)

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Atividade mês a mês</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>
            Ações registradas nos sistemas · desde {mesCurto(s[0].mes)}
          </div>
        </div>
        {varia !== null && (
          <div style={{ textAlign: 'right' }}>
            <div className="cnum" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.6px', color: varia >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {varia >= 0 ? '+' : ''}{varia}%
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>vs. mês anterior</div>
          </div>
        )}
      </div>

      {/* ⚠️⚠️ SEM esticar. `preserveAspectRatio="none"` num viewBox 300×90
          deixava o traço com espessura desigual e transformava os pontos em
          ELIPSES — e a pré-compensação por `scale()` era um número chutado, que
          só acertava numa largura (o fator real é larguraRenderizada/300, e ela
          muda com o breakpoint). Desenhando num viewBox com a proporção da caixa,
          o problema não existe e os dois remendos saem juntos. */}
      <svg viewBox="0 0 700 110" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 110, marginTop: 12, display: 'block' }}>
        <defs>
          <linearGradient id="tgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={g.area} fill="url(#tgrad)" />
        {/* ⚠️ `--len` era 600 num caminho de ~350: a linha terminava de ser
            desenhada em 60% da duração e o resto era tempo parado. */}
        <path className="cdraw" style={{ ['--len' as string]: 900 }}
          d={g.line} fill="none" stroke="var(--chart-2)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {g.pts.map(([x, y], i) => (
          <circle key={i} className="cpop" style={{ animationDelay: `${i * 45}ms` }} cx={x} cy={y}
            r={i === g.pts.length - 1 ? 4 : 2.6}
            fill={i === g.pts.length - 1 ? 'var(--chart-2)' : 'var(--surface)'} stroke="var(--chart-2)" strokeWidth="1.6">
            <title>{`${mesCurto(s[i].mes)}: ${s[i].atividade.toLocaleString('pt-BR')} ações`}</title>
          </circle>
        ))}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-mute)', marginTop: 2 }}>
        <span>{mesCurto(s[0].mes)}</span>
        <span>pico {pico.toLocaleString('pt-BR')}</span>
        <span>{mesCurto(s[s.length - 1].mes)}</span>
      </div>

      {/* ⚠️ As fontes têm janelas de histórico muito diferentes (chamado do Chat
          só existe desde 21/08/2026, km da Gerência desde 17/07). Uma subida no
          gráfico pode ser fonte nova entrando, e não produção crescendo. */}
      <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 10, lineHeight: 1.5 }}>
        {/* ⚠️ A série soma quem está no setor HOJE: quem saiu some de todos os
            meses, retroativamente. O gestor via agosto valendo 191 em agosto e
            140 em setembro, sem nada ter mudado no trabalho de agosto. E a
            Rotatividade, no cartão ao lado, mostra a foto dessa mesma pessoa —
            a tela apresentava as duas coisas como fatos independentes. */}
        A série soma a <b>equipe de hoje</b> — quem saiu não aparece em nenhum mês, então um
        desligamento rebaixa o passado inteiro (veja quem saiu no cartão ao lado). Ela começa no
        primeiro mês com registro, e uma subida pode ser <b>fonte nova entrando</b> na medição, e não
        produção crescendo.
      </div>
    </div>
  )
}

/* ── Turnover REAL ─────────────────────────────────────────────────────────── */
export function Turnover({ m, onDetalhe }: { m: DeptMetrics; onDetalhe?: () => void }) {
  const t = m.turnover
  const alto = t.taxa12m >= 20
  /* ⚠️ A janela com a lista completa (pedido do dono, 08/09/2026). O cartão
     mostra 6 e dizia "e mais 3 pessoas" — e as 3 não tinham para onde ir. */
  const [aberto, setAberto] = useState(false)
  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
        Rotatividade
        {onDetalhe && <BotaoDetalhe onClick={onDetalhe} />}
      </div>
      {/* ⚠️ A TAXA é de 12 meses e NÃO acompanha o filtro: em 7 dias ela daria 0%
          para quase todo setor, e esse zero se leria como "ninguém sai daqui".
          O que acompanha o filtro é a contagem de saídas. */}
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 16 }}>
        A taxa é de 12 meses — não acompanha o filtro de período
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <span className="cnum" style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1.4px', color: alto ? 'var(--danger)' : t.taxa12m > 0 ? 'var(--warning)' : 'var(--success)' }}>
          {t.taxa12m}%
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          {t.saidas12m} {t.saidas12m === 1 ? 'saída' : 'saídas'} em 12 meses
        </span>
      </div>
      <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}>
        <div className="cbar" style={{ height: '100%', width: `${Math.min(100, t.taxa12m)}%`, background: alto ? 'var(--danger)' : 'var(--warning)', borderRadius: 20 }} />
      </div>
      {/*
        QUEM saiu, com foto e nome (pedido do dono, 03/09/2026).

        ⚠️ Duas listas porque respondem coisas diferentes. `noPeriodo` obedece ao
        filtro — é o que foi pedido. Mas a TAXA acima é de 12 meses: com o filtro
        em 7 dias a primeira lista vem vazia e os 40% ficariam sem ninguém por
        trás, que é exatamente o número virar abstração.
      */}
      {/* ⚠️ A lista de 12 meses aparece SEMPRE que houver gente nela. A condição
          antiga ("só se a do período estiver vazia") desligava a lista justamente
          no caso em que ela mais importa: filtro em 30 dias, uma saída recente e
          quatro antigas → o cartão dizia "5 saídas em 12 meses" e mostrava UMA
          pessoa. Quem caiu dentro do filtro fica marcado. */}
      {t.em12m.length > 0 && (
        <ListaSaiu
          titulo={t.noPeriodo.length > 0
            ? `${t.em12m.length} ${t.em12m.length === 1 ? 'saída' : 'saídas'} em 12 meses · ${t.noPeriodo.length} no período`
            : `Ninguém saiu no período · ${t.em12m.length} ${t.em12m.length === 1 ? 'saída' : 'saídas'} nos últimos 12 meses`}
          gente={t.em12m}
          noPeriodo={new Set(t.noPeriodo.map((p) => p.id))}
        />
      )}
      {/* Intervalo longo pelo calendário pode conter saída anterior aos 12 meses. */}
      {t.em12m.length === 0 && t.noPeriodo.length > 0 && (
        <ListaSaiu titulo={`${t.noPeriodo.length} ${t.noPeriodo.length === 1 ? 'saída' : 'saídas'} no período, antes dos 12 meses`} gente={t.noPeriodo} noPeriodo={new Set(t.noPeriodo.map((p) => p.id))} />
      )}
      {t.saidas12m === 0 && t.noPeriodo.length === 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 14 }}>Ninguém saiu deste setor em 12 meses.</div>
      )}

      {(t.em12m.length > 0 || t.noPeriodo.length > 0) && (
        <button onClick={() => setAberto(true)}
          style={{ marginTop: 12, width: '100%', height: 32, background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600 }}>
          Ver todas as saídas
        </button>
      )}
      {aberto && <JanelaSaidas t={t} label={m.label} onFechar={() => setAberto(false)} />}
    </div>
  )
}

/* ============================================================
   A JANELA COM TODAS AS SAÍDAS.

   ⚠️⚠️ AS SAÍDAS DO PERÍODO VÊM SEMPRE, E PRIMEIRO (pedido do dono). Inclusive
   quando são ZERO — e principalmente quando são zero. O cartão mostra uma taxa
   de 12 meses que não acompanha o filtro; sem esta seção, quem abre a janela com
   o filtro em 7 dias lê a lista dos 12 meses e conclui que aquilo aconteceu na
   semana. Uma lista sem janela declarada é uma lista que o leitor data sozinho.

   ⚠️ E as duas listas não são uma dentro da outra: um intervalo escolhido no
   calendário pode alcançar saídas ANTERIORES aos 12 meses, que existem no
   período e não na taxa.
   ============================================================ */
function JanelaSaidas({ t, label, onFechar }: {
  t: DeptMetrics['turnover']
  label: string
  onFechar: () => void
}) {
  // Esc fecha — numa janela que cobre a tela, o teclado é a saída esperada.
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])

  const noPeriodo = new Set(t.noPeriodo.map((p) => p.id))
  /* Quem saiu no período mas está fora dos 12 meses — some da lista de baixo. */
  const em12 = new Set(t.em12m.map((p) => p.id))
  const foraDos12 = t.noPeriodo.filter((p) => !em12.has(p.id))

  return (
    <div onClick={onFechar}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} className="tc-card"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22, width: 'min(560px, 100%)', maxHeight: '82vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Quem saiu</div>
          <button onClick={onFechar} aria-label="Fechar"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-mute)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {/* ── SEMPRE o período do filtro, primeiro ── */}
        <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 16 }}>
          Período do filtro: <b style={{ color: 'var(--text)' }}>{label}</b>
        </div>

        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 10 }}>
          {t.noPeriodo.length} {t.noPeriodo.length === 1 ? 'saída no período' : 'saídas no período'}
        </div>
        {t.noPeriodo.length === 0 ? (
          /* ⚠️ Zero saídas no período é uma RESPOSTA, e precisa ser dita: sem
             esta linha o leitor emenda direto na lista de 12 meses e a data ela. */
          <div style={{ fontSize: 12.5, color: 'var(--text-mute)', marginBottom: 18 }}>
            Ninguém saiu deste setor em {label.toLowerCase()}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {t.noPeriodo.map((p) => <LinhaSaiu key={p.id} p={p} destaque />)}
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 4 }}>
            {t.em12m.length} {t.em12m.length === 1 ? 'saída nos últimos 12 meses' : 'saídas nos últimos 12 meses'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 10, lineHeight: 1.5 }}>
            É a janela da taxa de {t.taxa12m}% — ela <b>não</b> acompanha o filtro. Quem também caiu no período está em destaque.
          </div>
          {t.em12m.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-mute)' }}>Ninguém saiu nos últimos 12 meses.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {t.em12m.map((p) => <LinhaSaiu key={p.id} p={p} destaque={noPeriodo.has(p.id)} />)}
            </div>
          )}
        </div>

        {foraDos12.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginTop: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 10 }}>
              {foraDos12.length} {foraDos12.length === 1 ? 'saída do período anterior' : 'saídas do período anteriores'} aos 12 meses
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 10, lineHeight: 1.5 }}>
              O intervalo escolhido alcança mais que 12 meses, então {foraDos12.length === 1 ? 'esta saída conta' : 'estas saídas contam'} no
              período e <b>não</b> na taxa.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {foraDos12.map((p) => <LinhaSaiu key={p.id} p={p} destaque />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LinhaSaiu({ p, destaque }: {
  p: { id: string; nome: string; cargo: string; hasAvatar: boolean; quando: string | null }
  destaque: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: destaque ? 1 : 0.72 }}>
      {/* Em escala de cinza: é um retrato de quem não está mais aqui. */}
      <span style={{ filter: 'grayscale(1)', opacity: 0.85, display: 'flex' }}>
        <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--text-mute)" size={28} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
        <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>{p.cargo}</div>
      </div>
      {p.quando && (
        <span style={{ fontSize: 11.5, color: destaque ? 'var(--text-dim)' : 'var(--text-mute)', fontWeight: destaque ? 600 : 400, whiteSpace: 'nowrap' }}>
          {new Date(`${p.quando}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
        </span>
      )}
    </div>
  )
}

/** Quem saiu — foto, nome, cargo e a data. */
function ListaSaiu({ titulo, gente, noPeriodo }: {
  titulo: string
  gente: { id: string; nome: string; cargo: string; hasAvatar: boolean; quando: string | null }[]
  /** Quem caiu dentro do filtro — marcado, para a lista de 12 meses não achatar
   *  a diferença entre "saiu agora" e "saiu em outubro". */
  noPeriodo: Set<string>
}) {
  // ⚠️ Sem link para a ficha: a pessoa saiu, e a ficha dela é de quem está aqui.
  // Um clique que leva a um perfil de desligado é uma promessa que a tela não
  // cumpre bem.
  const visiveis = gente.slice(0, 6)
  const resto = gente.length - visiveis.length
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-soft)' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 10 }}>
        {titulo}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {visiveis.map((p, i) => (
          <div key={p.id} className="cpop" style={{ animationDelay: `${i * 45}ms`, display: 'flex', alignItems: 'center', gap: 10, opacity: noPeriodo.has(p.id) ? 1 : 0.72 }}>
            {/* Em escala de cinza: é um retrato de quem não está mais aqui. */}
            <span style={{ filter: 'grayscale(1)', opacity: 0.85, display: 'flex' }}>
              <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--text-mute)" size={28} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>{p.cargo}</div>
            </div>
            {p.quando && (
              <span style={{ fontSize: 11, color: noPeriodo.has(p.id) ? 'var(--text-dim)' : 'var(--text-mute)', fontWeight: noPeriodo.has(p.id) ? 600 : 400, whiteSpace: 'nowrap' }}>
                {new Date(`${p.quando}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' })}
              </span>
            )}
          </div>
        ))}
      </div>
      {resto > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 8 }}>e mais {resto} {resto === 1 ? 'pessoa' : 'pessoas'}</div>
      )}
    </div>
  )
}
