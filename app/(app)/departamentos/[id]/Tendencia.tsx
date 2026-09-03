'use client'
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
  const g = geomLine(vals, 300, 90, 8)
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

      {/* ⚠️ `preserveAspectRatio="none"` num viewBox 300×90 esticado para ~700px
          deixava o traço com espessura desigual e transformava os pontos em
          ELIPSES. `non-scaling-stroke` mantém a espessura sob o esticamento. */}
      <svg viewBox="0 0 300 90" preserveAspectRatio="none" style={{ width: '100%', height: 110, marginTop: 12, display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="tgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={g.area} fill="url(#tgrad)" />
        {/* ⚠️ `--len` era 600 num caminho de ~350: a linha terminava de ser
            desenhada em 60% da duração e o resto era tempo parado. */}
        <path className="cdraw" style={{ ['--len' as string]: 380 }} vectorEffect="non-scaling-stroke"
          d={g.line} fill="none" stroke="var(--chart-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {g.pts.map(([x, y], i) => (
          <circle key={i} className="cpop" style={{ animationDelay: `${i * 45}ms` }} cx={x} cy={y}
            r={i === g.pts.length - 1 ? 3.4 : 2} vectorEffect="non-scaling-stroke"
            transform={`translate(${x} ${y}) scale(0.34 1) translate(${-x} ${-y})`}
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
        A série começa no primeiro mês com registro. Subida pode ser <b>fonte nova entrando</b> na
        medição, e não produção crescendo — as oito fontes têm históricos de tamanhos diferentes.
      </div>
    </div>
  )
}

/* ── Turnover REAL ─────────────────────────────────────────────────────────── */
export function Turnover({ m }: { m: DeptMetrics }) {
  const t = m.turnover
  const alto = t.taxa12m >= 20
  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Rotatividade</div>
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
      {t.noPeriodo.length > 0 && (
        <ListaSaiu titulo={`${t.noPeriodo.length} ${t.noPeriodo.length === 1 ? 'saída dentro do período' : 'saídas dentro do período'}`} gente={t.noPeriodo} />
      )}
      {t.noPeriodo.length === 0 && t.em12m.length > 0 && (
        <ListaSaiu titulo={`Ninguém saiu no período · ${t.em12m.length} nos últimos 12 meses`} gente={t.em12m} esmaecido />
      )}
      {t.saidas12m === 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 14 }}>Ninguém saiu deste setor em 12 meses.</div>
      )}
    </div>
  )
}

/** Quem saiu — foto, nome, cargo e a data. */
function ListaSaiu({ titulo, gente, esmaecido }: {
  titulo: string
  gente: { id: string; nome: string; cargo: string; hasAvatar: boolean; quando: string | null }[]
  esmaecido?: boolean
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, opacity: esmaecido ? 0.78 : 1 }}>
        {visiveis.map((p, i) => (
          <div key={p.id} className="cpop" style={{ animationDelay: `${i * 45}ms`, display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Em escala de cinza: é um retrato de quem não está mais aqui. */}
            <span style={{ filter: 'grayscale(1)', opacity: 0.85, display: 'flex' }}>
              <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--text-mute)" size={28} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>{p.cargo}</div>
            </div>
            {p.quando && (
              <span style={{ fontSize: 11, color: 'var(--text-mute)', whiteSpace: 'nowrap' }}>
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
