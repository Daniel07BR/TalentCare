import type { HeatCell } from '@/lib/mock/employee'

/* ============================================================
   O MAPA DE OCORRÊNCIAS, COMO CALENDÁRIO (pedido do dono, 08/09/2026).

   Antes era a grade estilo GitHub: 18 colunas de semanas × 7 linhas de dias da
   semana, 126 quadrados sem uma única legenda de data. Ela responde bem "houve
   muitos atrasos?" e não responde nada do que se pergunta na frente de alguém:
   **quando foi isso?** Para descobrir que o quadrado escuro é 12 de agosto, era
   preciso passar o mouse por cima e esperar o `title` do navegador aparecer —
   e num relatório impresso ou numa captura de tela, nunca.

   Agora são blocos de mês, com o dia escrito dentro do quadro. A mesma janela,
   a mesma cor, a mesma intensidade — só que legível.

   ⚠️⚠️ TRÊS ESTADOS QUE NÃO PODEM SE PARECER, e é aqui que a regra da casa
   entra num componente de desenho:

   1. **Dia limpo** — foi medido e não houve ocorrência. Fundo neutro.
   2. **Dia fora da janela** — o mês da ponta tem dias anteriores ao início das
      18 semanas. Eles não são limpos: ninguém olhou. Vão vazados, sem fundo.
   3. **Dia sem medição** — depois do último dia que o import de ponto cobriu.
      O ponto é import à MÃO, sem cron; no dia em que a carga atrasar, um
      calendário que pinta esses dias de "limpo" estará elogiando quem ninguém
      mediu. Vão hachurados, e a legenda diz o que são.

   Sem essa separação o calendário fica mais bonito e mais mentiroso que a
   grade que ele substitui — porque um quadrado com o número 15 dentro parece
   uma afirmação sobre o dia 15.
   ============================================================ */

const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
/** Segunda a domingo — a mesma ordem em que `heatmapFor` monta as células. */
const DIAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

export default function CalendarioOcorrencias({
  cells, pontoAte, compacto = false,
}: {
  cells: HeatCell[]
  /** Último dia coberto pelo import de ponto. Depois dele, nada se afirma. */
  pontoAte?: string | null
  /** Versão apertada, para o relatório de setor. */
  compacto?: boolean
}) {
  if (!cells.length) return null

  const porIso = new Map(cells.map((c) => [c.iso, c]))
  const isos = [...porIso.keys()].sort()
  const primeiro = isos[0]
  const ultimo = isos[isos.length - 1]

  /* Os meses que a janela toca, do mais antigo ao mais novo. */
  const meses: string[] = []
  for (let m = primeiro.slice(0, 7); m <= ultimo.slice(0, 7);) {
    meses.push(m)
    const [a, b] = m.split('-').map(Number)
    m = b === 12 ? `${a + 1}-01` : `${a}-${String(b + 1).padStart(2, '0')}`
  }

  const lado = compacto ? 20 : 26
  const fonte = compacto ? 9 : 10.5

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${compacto ? 168 : 200}px, 1fr))`, gap: compacto ? 12 : 16 }}>
        {meses.map((mes) => {
          const [ano, m] = mes.split('-').map(Number)
          const diasNoMes = new Date(ano, m, 0).getDate()
          /* Em que coluna o dia 1 cai, com a semana começando na segunda. */
          const offset = (new Date(ano, m - 1, 1).getDay() + 6) % 7
          return (
            <div key={mes}>
              <div style={{ fontSize: compacto ? 11 : 12, fontWeight: 600, marginBottom: 6, textTransform: 'capitalize' }}>
                {MES[m - 1]} <span style={{ color: 'var(--text-mute)', fontWeight: 500 }}>{ano}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                {DIAS.map((d, i) => (
                  <div key={i} style={{ fontSize: 9, color: 'var(--text-mute)', textAlign: 'center', fontWeight: 600, paddingBottom: 2 }}>{d}</div>
                ))}
                {Array.from({ length: offset }, (_, i) => <div key={`v${i}`} />)}
                {Array.from({ length: diasNoMes }, (_, i) => {
                  const dia = i + 1
                  const iso = `${mes}-${String(dia).padStart(2, '0')}`
                  const c = porIso.get(iso)
                  /* Fora da janela de 18 semanas: ninguém olhou este dia. */
                  const foraDaJanela = !c
                  const semMedicao = !!c && !c.future && !!pontoAte && iso > pontoAte
                  const futuro = c?.future ?? false

                  const titulo = foraDaJanela ? `${dia}/${m}: fora das 18 semanas deste mapa`
                    : futuro ? ''
                    : semMedicao ? `${dia}/${m}: sem medição — o ponto foi importado até ${pontoAte!.split('-').reverse().join('/')}`
                    : c!.atrasos > 0
                      ? `${dia}/${m}: ${c!.atrasos} atraso${c!.atrasos > 1 ? 's' : ''}${c!.minutos > 0 ? ` · ${c!.minutos} min` : ''}`
                      : `${dia}/${m}: sem ocorrência`

                  const fundo = foraDaJanela || futuro ? 'transparent'
                    : semMedicao ? 'repeating-linear-gradient(45deg, var(--border) 0 2px, transparent 2px 5px)'
                    : c!.bg
                  /* ⚠️ Número apagado no que não é afirmação: o dia continua ali
                     (é um calendário), mas não se confunde com dia medido. */
                  const cor = foraDaJanela || futuro || semMedicao ? 'var(--text-mute)'
                    : c!.level >= 3 ? '#3a2a05' : 'var(--text-dim)'

                  return (
                    <div key={iso} title={titulo}
                      style={{
                        height: lado, display: 'grid', placeItems: 'center', borderRadius: 3,
                        background: fundo,
                        border: foraDaJanela || futuro ? '1px dashed var(--border)' : 'none',
                        opacity: futuro ? 0.35 : foraDaJanela ? 0.55 : 1,
                        fontSize: fonte, fontWeight: c && c.level > 0 ? 700 : 500,
                        color: cor, fontVariantNumeric: 'tabular-nums',
                      }}>
                      {dia}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 12, fontSize: 11, color: 'var(--text-mute)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 10 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, border: '1px dashed var(--border)' }} /> fora do mapa
        </span>
        {(() => {
          const temSemMedicao = pontoAte != null && isos.some((i) => i > pontoAte! && !porIso.get(i)!.future)
          return temSemMedicao ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 10 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: 'repeating-linear-gradient(45deg, var(--border) 0 2px, transparent 2px 5px)' }} /> sem medição
            </span>
          ) : null
        })()}
        Sem atraso
        <span style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--surface-2)' }} />
        <span style={{ width: 11, height: 11, borderRadius: 3, background: 'rgba(245,166,35,.30)' }} />
        <span style={{ width: 11, height: 11, borderRadius: 3, background: 'rgba(245,166,35,.55)' }} />
        <span style={{ width: 11, height: 11, borderRadius: 3, background: 'rgba(245,166,35,.78)' }} />
        <span style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--accent)' }} /> mais minutos
      </div>
    </>
  )
}
