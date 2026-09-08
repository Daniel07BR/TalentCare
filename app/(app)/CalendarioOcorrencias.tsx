/* ============================================================
   O MAPA DE OCORRÊNCIAS, COMO CALENDÁRIO (pedido do dono, 08/09/2026).

   Antes era a grade estilo GitHub: 18 colunas de semanas × 7 linhas de dias da
   semana, 126 quadrados sem uma única legenda de data. Ela responde bem "houve
   muitos atrasos?" e não responde nada do que se pergunta na frente de alguém:
   **quando foi isso?** Para descobrir que o quadrado escuro é 12 de agosto era
   preciso passar o mouse e esperar o `title` — e numa captura de tela ou no
   papel, nunca.

   ⚠️⚠️ E ELE OBEDECE AO FILTRO DE PERÍODO. A grade antiga era sempre "últimas 18
   semanas", vinda do dataset do cliente, enquanto TODOS os números ao lado dela
   seguiam o filtro: escolher "01 a 31 de agosto" trocava os KPIs e deixava o
   mapa em maio–setembro, com o rótulo do filtro em cima. É a regra (b) da casa
   — todo número ao lado do filtro tem de obedecer ao filtro —, e num calendário
   ela pesa mais, porque a data está escrita dentro do quadro.

   ⚠️ A densidade acompanha o tamanho do período: um mês só vem AMPLIADO (há
   espaço, e o dia fica legível de longe); até 12 meses cabem na mesma caixa,
   apertando a célula em vez de cortar meses.

   ⚠️⚠️ TRÊS ESTADOS QUE NÃO PODEM SE PARECER, e é aqui que a regra da casa entra
   num componente de desenho:

   1. **Dia limpo** — foi medido e não houve ocorrência. Fundo neutro.
   2. **Dia fora do período** — o mês da ponta tem dias antes ou depois do
      intervalo. Eles não são limpos: não foram perguntados. Vão vazados.
   3. **Dia sem medição** — depois do último dia que o import de ponto cobriu. O
      ponto é import à MÃO, sem cron; no dia em que a carga atrasar, um
      calendário que pinta esses dias de "limpo" estará elogiando quem ninguém
      mediu. Vão hachurados, e a legenda diz o que são.

   Sem essa separação o calendário fica mais bonito e mais mentiroso que a grade
   que ele substitui — porque um quadrado com o número 15 dentro parece uma
   afirmação sobre o dia 15.
   ============================================================ */

export type DiaOcorrencia = {
  day: string
  atrasos: number
  abonados?: number
  minutos: number
  /** Quantas PESSOAS se atrasaram no dia — só no mapa de setor. */
  pessoas?: number
  ate5?: number
  ate30?: number
  mais30?: number
}

const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
/** Segunda a domingo. */
const DIAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
const BGS = ['var(--surface-2)', 'rgba(245,166,35,.30)', 'rgba(245,166,35,.55)', 'rgba(245,166,35,.78)', 'var(--accent)']

/** A intensidade da cor sai dos MINUTOS, não da contagem: dois atrasos de 3 min
 *  não são piores que um de 40. É a leitura da PESSOA. */
function nivelPorMinuto(minutos: number, atrasos: number) {
  if (atrasos <= 0) return 0
  return minutos > 30 ? 4 : minutos > 15 ? 3 : minutos > 5 ? 2 : 1
}

/**
 * No mapa do SETOR a cor anda pelo número de PESSOAS que se atrasaram.
 *
 * ⚠️⚠️ Somar os minutos de todo mundo e usar os limites da pessoa (5/15/30)
 * satura a escala e apaga a informação. Medido em 08/09/2026, de junho a
 * setembro: no **Fiscal, 39% dos dias com atraso** batiam no topo, e um deles
 * somava **466 minutos** — todos pintados igual. A soma é dominada por um
 * atraso enorme de uma pessoa; o que o gestor lê num mapa de equipe é "quantos
 * chegaram tarde naquele dia", e essa pergunta tem escala própria.
 */
function nivelPorPessoas(pessoas: number) {
  if (pessoas <= 0) return 0
  return pessoas >= 4 ? 4 : pessoas === 3 ? 3 : pessoas === 2 ? 2 : 1
}

const somaMes = (m: string) => {
  const [a, b] = m.split('-').map(Number)
  return b === 12 ? `${a + 1}-01` : `${a}-${String(b + 1).padStart(2, '0')}`
}

export default function CalendarioOcorrencias({
  dias, de, ate, pontoAte, escala = 'minutos',
}: {
  dias: DiaOcorrencia[]
  /** Primeiro e último dia do PERÍODO do filtro (AAAA-MM-DD). */
  de: string
  ate: string
  /** Último dia coberto pelo import de ponto. Depois dele, nada se afirma. */
  pontoAte?: string | null
  /** `minutos` = a ficha de uma pessoa; `pessoas` = o mapa de um setor. */
  escala?: 'minutos' | 'pessoas'
}) {
  if (!de || !ate || ate < de) return null

  const porIso = new Map(dias.map((d) => [d.day, d]))
  const hoje = new Date().toISOString().slice(0, 10)

  const meses: string[] = []
  for (let m = de.slice(0, 7); m <= ate.slice(0, 7); m = somaMes(m)) {
    meses.push(m)
    if (meses.length >= 14) break // trava de segurança; o filtro não passa de 1 ano
  }

  /* ⚠️ A densidade vem do TAMANHO do período, não de um `compacto` que a tela
     mãe teria de adivinhar. Um mês só ganha o dobro de célula (há espaço, e é
     onde se quer ler o dia de longe); doze cabem apertando a célula, nunca
     cortando meses — um calendário que esconde meses do próprio filtro é pior
     que a grade que ele substituiu. */
  const n = meses.length
  const lado = n === 1 ? 46 : n <= 3 ? 30 : n <= 6 ? 25 : 21
  const fonte = n === 1 ? 15 : n <= 3 ? 11.5 : n <= 6 ? 10.5 : 9.5
  const minCol = n === 1 ? 340 : n <= 3 ? 220 : n <= 6 ? 190 : 168

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${minCol}px, 1fr))`, gap: n === 1 ? 0 : 14 }}>
        {meses.map((mes) => {
          const [ano, m] = mes.split('-').map(Number)
          const diasNoMes = new Date(ano, m, 0).getDate()
          const offset = (new Date(ano, m - 1, 1).getDay() + 6) % 7
          return (
            <div key={mes} style={{ maxWidth: n === 1 ? 400 : undefined }}>
              <div style={{ fontSize: n === 1 ? 14 : 12, fontWeight: 600, marginBottom: 6, textTransform: 'capitalize' }}>
                {MES[m - 1]} <span style={{ color: 'var(--text-mute)', fontWeight: 500 }}>{ano}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: n === 1 ? 5 : 3 }}>
                {DIAS.map((d, i) => (
                  <div key={i} style={{ fontSize: n === 1 ? 10.5 : 9, color: 'var(--text-mute)', textAlign: 'center', fontWeight: 600, paddingBottom: 2 }}>{d}</div>
                ))}
                {Array.from({ length: offset }, (_, i) => <div key={`v${i}`} />)}
                {Array.from({ length: diasNoMes }, (_, i) => {
                  const dia = i + 1
                  const iso = `${mes}-${String(dia).padStart(2, '0')}`
                  const foraDoPeriodo = iso < de || iso > ate
                  const futuro = iso > hoje
                  const semMedicao = !foraDoPeriodo && !futuro && !!pontoAte && iso > pontoAte
                  const oc = porIso.get(iso)
                  const lvl = foraDoPeriodo || futuro || semMedicao ? 0
                    : escala === 'pessoas' ? nivelPorPessoas(oc?.pessoas ?? 0)
                    : nivelPorMinuto(oc?.minutos ?? 0, oc?.atrasos ?? 0)

                  const brDia = `${String(dia).padStart(2, '0')}/${String(m).padStart(2, '0')}`
                  const titulo = foraDoPeriodo ? `${brDia}: fora do período filtrado`
                    : futuro ? ''
                    : semMedicao ? `${brDia}: sem medição — o ponto foi importado até ${pontoAte!.split('-').reverse().join('/')}`
                    : oc && oc.atrasos > 0
                      ? `${brDia}: ${oc.atrasos} atraso${oc.atrasos > 1 ? 's' : ''}`
                        + (escala === 'pessoas' && oc.pessoas ? ` · ${oc.pessoas} pessoa${oc.pessoas > 1 ? 's' : ''}` : '')
                        + (oc.minutos > 0 ? ` · ${oc.minutos} min` : ' · sem minuto medido')
                        + (oc.abonados ? ` · ${oc.abonados} abonado${oc.abonados > 1 ? 's' : ''}` : '')
                      : oc && oc.abonados
                        ? `${brDia}: ${oc.abonados} atraso${oc.abonados > 1 ? 's' : ''} abonado${oc.abonados > 1 ? 's' : ''}`
                        : `${brDia}: sem ocorrência`

                  const fundo = foraDoPeriodo || futuro ? 'transparent'
                    : semMedicao ? 'repeating-linear-gradient(45deg, var(--border) 0 2px, transparent 2px 5px)'
                    : BGS[lvl]
                  const cor = foraDoPeriodo || futuro || semMedicao ? 'var(--text-mute)'
                    : lvl >= 3 ? '#3a2a05' : 'var(--text-dim)'

                  return (
                    <div key={iso} title={titulo}
                      style={{
                        height: lado, display: 'grid', placeItems: 'center', borderRadius: n === 1 ? 5 : 3,
                        background: fundo,
                        border: foraDoPeriodo || futuro ? '1px dashed var(--border)' : 'none',
                        opacity: futuro ? 0.3 : foraDoPeriodo ? 0.5 : 1,
                        fontSize: fonte, fontWeight: lvl > 0 ? 700 : 500,
                        color: cor, fontVariantNumeric: 'tabular-nums',
                      }}>
                      {dia}
                      {/* No mês ampliado cabe o número que a cor só insinua, e
                          que é o que decide a conversa: os minutos na ficha da
                          pessoa, quantos chegaram tarde no mapa do setor. */}
                      {n === 1 && lvl > 0 && oc && (
                        escala === 'pessoas'
                          ? (oc.pessoas ? <span style={{ fontSize: 9, fontWeight: 600, marginTop: -4, opacity: .8 }}>{oc.pessoas}p</span> : null)
                          : (oc.minutos > 0 ? <span style={{ fontSize: 9, fontWeight: 600, marginTop: -4, opacity: .8 }}>{oc.minutos}m</span> : null)
                      )}
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
          <span style={{ width: 11, height: 11, borderRadius: 3, border: '1px dashed var(--border)' }} /> fora do período
        </span>
        {pontoAte && ate > pontoAte && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 10 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: 'repeating-linear-gradient(45deg, var(--border) 0 2px, transparent 2px 5px)' }} /> sem medição
          </span>
        )}
        {escala === 'pessoas' ? 'Ninguém atrasou' : 'Sem atraso'}
        {BGS.map((b, i) => <span key={i} style={{ width: 11, height: 11, borderRadius: 3, background: b }} />)}
        {escala === 'pessoas' ? '4 ou mais pessoas' : 'mais minutos'}
      </div>
    </>
  )
}
