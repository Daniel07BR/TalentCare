'use client'
import type { DeptMetrics } from '@/lib/ui/dept-period'
import { geomLine } from '@/lib/mock/data'

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
        <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Ainda não há meses suficientes para desenhar uma tendência
          {s.length > 0 && ` (há ${s.length} ${s.length === 1 ? 'mês' : 'meses'} com registro)`}.
          Dois pontos ligados por uma reta parecem uma tendência e não são.
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

      <svg viewBox="0 0 300 90" preserveAspectRatio="none" style={{ width: '100%', height: 110, marginTop: 12, display: 'block' }}>
        <defs>
          <linearGradient id="tgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={g.area} fill="url(#tgrad)" />
        <path className="cdraw" style={{ ['--len' as string]: 600 }} d={g.line} fill="none" stroke="var(--chart-2)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {g.pts.map(([x, y], i) => (
          <circle key={i} className="cpop" style={{ animationDelay: `${i * 45}ms` }} cx={x} cy={y} r={i === g.pts.length - 1 ? 3.4 : 2}
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
      {t.saidasNoPeriodo > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 14, lineHeight: 1.6 }}>
          <b style={{ color: 'var(--text)' }}>
            {t.saidasNoPeriodo} {t.saidasNoPeriodo === 1 ? 'saída' : 'saídas'} dentro do período
          </b>
          {': '}{t.nomesQueSairam.join(', ')}
        </div>
      )}
      {t.saidas12m === 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 14 }}>Ninguém saiu deste setor em 12 meses.</div>
      )}
    </div>
  )
}
