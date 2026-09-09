'use client'
import { useState } from 'react'
import type { EntregasMetrics } from '@/lib/ui/entregas-period'

/* ============================================================
   CONCLUSÕES POR DIA — uma barra por DIA do intervalo pedido.

   ⚠️⚠️ O eixo é o INTERVALO INTEIRO, não só os dias que têm linha no espelho.
   A diferença não é estética: um mês com trabalho em 21 dias e nada nos outros
   10 desenharia, sem os buracos, uma barra colada na outra — 31 dias de
   produção contínua que nunca existiram. Sábado, domingo e dia parado são
   parte do que a série tem a dizer.

   ⚠️ Sem eixo cravado: a altura é proporcional ao MAIOR dia do próprio
   intervalo, e o valor do pico está escrito. Barra sem escala escrita é uma
   forma que não se confere.
   ============================================================ */

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const dataCurta = (d: string) => `${d.slice(8, 10)}/${MES[Number(d.slice(5, 7)) - 1]}`
const dataLonga = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`

const TETO_DIAS = 400

/** Todos os dias do intervalo, inclusive os vazios.
 *  ⚠️ O teto de segurança existe para um intervalo absurdo não travar o
 *  navegador — mas ele CORTA, e corte em silêncio é mentira de eixo: o
 *  subtítulo dizia "em 400 do intervalo" enquanto o rótulo da direita seguia
 *  mostrando o `toDay` real. Quem corta avisa. */
function diasDoIntervalo(de: string, ate: string): { dias: string[]; cortado: boolean } {
  const out: string[] = []
  const fim = new Date(`${ate}T12:00:00Z`).getTime()
  let t = new Date(`${de}T12:00:00Z`).getTime()
  while (t <= fim && out.length < TETO_DIAS) {
    out.push(new Date(t).toISOString().slice(0, 10))
    t += 86400_000
  }
  return { dias: out, cortado: t <= fim }
}

const fds = (d: string) => {
  const dia = new Date(`${d}T12:00:00Z`).getUTCDay()
  return dia === 0 || dia === 6
}

export function ConclusoesPorDia({ m }: { m: EntregasMetrics }) {
  const [sobre, setSobre] = useState<string | null>(null)
  const porDia = new Map(m.serie.map((s) => [s.day, s]))
  const { dias, cortado } = diasDoIntervalo(m.fromDay, m.toDay)
  const valores = dias.map((d) => porDia.get(d)?.servicos ?? 0)
  const pico = Math.max(1, ...valores)
  const totalDias = valores.filter((v) => v > 0).length

  const card: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: 20,
  }

  if (m.serie.length === 0) {
    return (
      <div className="tc-card" style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Conclusões por dia</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Nenhum serviço concluído neste intervalo.{' '}
          {m.cobertura.fonteParada
            ? `⚠️ A fonte inteira parou em ${dataLonga(m.cobertura.fonteAte!)} — o vazio aqui é do sync, não do setor.`
            : 'A fonte está em dia; o intervalo é que não tem registro.'}
        </div>
      </div>
    )
  }

  const alvo = sobre ? porDia.get(sobre) : null

  return (
    <div className="tc-card" style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Conclusões por dia</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>
            {totalDias} {totalDias === 1 ? 'dia' : 'dias'} com serviço em {dias.length}
            {cortado ? <> dos primeiros dias do intervalo (o eixo mostra {TETO_DIAS} dias; o
              intervalo é maior)</> : <> do intervalo</>} · pico de{' '}
            <strong className="cnum">{pico}</strong> num dia
          </div>
        </div>
        {/* O dia sob o cursor, escrito — a barra sozinha não diz o número. */}
        <div style={{ fontSize: 11.5, color: 'var(--text-dim)', textAlign: 'right', minHeight: 32 }}>
          {alvo ? (
            <>
              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{dataLonga(alvo.day)}</div>
              <div className="cnum">
                {alvo.servicos} serv. · {alvo.saidas} {alvo.saidas === 1 ? 'saída' : 'saídas'}
                {alvo.km > 0 ? ` · ${alvo.km.toLocaleString('pt-BR')} km` : ''}
              </div>
            </>
          ) : (
            <span style={{ color: 'var(--text-mute)' }}>passe o cursor sobre um dia</span>
          )}
        </div>
      </div>

      <div
        style={{ display: 'flex', alignItems: 'flex-end', gap: dias.length > 60 ? 1 : 2, height: 140 }}
        onMouseLeave={() => setSobre(null)}
      >
        {dias.map((d) => {
          const v = porDia.get(d)?.servicos ?? 0
          const h = v > 0 ? Math.max(3, Math.round((v / pico) * 100)) : 0
          return (
            <div
              key={d}
              onMouseEnter={() => setSobre(d)}
              title={`${dataLonga(d)} · ${v} ${v === 1 ? 'serviço' : 'serviços'}`}
              style={{ flex: 1, minWidth: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', cursor: 'default' }}
            >
              <div
                style={{
                  height: `${h}%`,
                  /* ⚠️ Dia sem serviço não some: fica um traço fino na base,
                     na cor do fundo. Barra ausente e barra zero se parecem, e
                     só uma delas quer dizer "não houve trabalho". */
                  minHeight: v > 0 ? undefined : 2,
                  background: v > 0
                    ? (sobre === d ? 'var(--accent)' : 'var(--chart-2)')
                    : (fds(d) ? 'var(--surface-3)' : 'var(--border)'),
                  borderRadius: 2,
                  transition: 'background .12s var(--ease)',
                }}
              />
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5, color: 'var(--text-mute)' }}>
        <span>{dataCurta(m.fromDay)}</span>
        <span>{cortado ? dataCurta(dias[dias.length - 1]) : dataCurta(m.toDay)}</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 8, lineHeight: 1.5 }}>
        Dia sem serviço aparece como traço na base — fim de semana em tom mais claro. O eixo é o
        intervalo inteiro, para que os dias parados contem.
      </div>
    </div>
  )
}
