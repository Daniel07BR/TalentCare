'use client'
import { useEffect, useRef, useState } from 'react'

/* ============================================================
   O PLACAR DA FICHA — um painel CIRCULAR, com o contador animado.

   Pedido do dono (09/09/2026): *"faça um dashboard em círculo com o contador
   animado, o sistema está muito engessado."*

   ⚠️⚠️ E a regra que não se dobra por causa de estética: **todo arco aqui tem
   denominador.** Anel que enche por enfeite é gráfico sem dado atrás — a regra
   (d) da casa, a mesma que tirou daqui as quatro sparklines sorteadas e o gauge
   de score. Os dois anéis desta tela medem coisas que existem:

   - **Posição**: o arco é `pontos dela no mês ÷ pontos do 1º do setor`. Cheio
     significa "ela É o primeiro". A distância até o topo vira distância no
     desenho, que é o que um anel sabe dizer.
   - **Acumulado**: o anel é repartido por MÊS gravado, cada fatia do tamanho do
     que aquele mês valeu. Não é decoração: é de onde os pontos vieram.

   ⚠️ Mês com saldo NEGATIVO fica fora do anel e é dito em texto. Desenhá-lo como
   fatia o faria ocupar espaço como se tivesse somado — um mês que tirou pontos
   parecendo que deu.
   ============================================================ */

/** Um mês do acumulado, para a rosca. */
export type MesDoPlacar = { competencia: string; pontos: number }

export type PosicaoFicha = {
  competencia: string
  posicao: number | null
  de: number
  pontosNoMes: number | null
  pontosDoPrimeiro: number | null
  acumulado: number
  meses: number
  mesesDoPlacar: MesDoPlacar[]
  mesesCortados: string[]
  estado: 'gravado' | 'parcial' | 'previa' | 'indisponivel'
  semNota: string | null
  motivo: string | null
}

const semMovimento = () =>
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/**
 * Conta de 0 até `valor` em rAF, sem biblioteca.
 *
 * ⚠️ `prefers-reduced-motion` desliga: número que corre na tela é exatamente o
 * movimento que atrapalha quem pediu para não ter movimento — e aqui ele não
 * decora nada, ele É o dado.
 * ⚠️ O último quadro grava o valor EXATO. Contador que para em 1.458 quando o
 * número é 1.459 mente com cara de enfeite.
 */
function useContador(valor: number, ms = 1100) {
  const [n, setN] = useState(() => (semMovimento() ? valor : 0))
  const anterior = useRef(valor)

  useEffect(() => {
    const alvo = valor
    const de = anterior.current === valor ? 0 : anterior.current
    anterior.current = alvo
    if (semMovimento()) { setN(alvo); return }

    let raf = 0
    const t0 = performance.now()
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const e = 1 - Math.pow(1 - p, 3) // easeOutCubic: assenta sem parecer travado
      setN(Math.round(de + (alvo - de) * e))
      if (p < 1) raf = requestAnimationFrame(passo)
      else setN(alvo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [valor, ms])

  return n
}

/** O arco anima de 0 até a fração, pelo mesmo respeito ao reduced-motion. */
function useFracaoAnimada(fracao: number, ms = 1100) {
  const [f, setF] = useState(() => (semMovimento() ? fracao : 0))
  useEffect(() => {
    if (semMovimento()) { setF(fracao); return }
    let raf = 0
    const t0 = performance.now()
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setF(fracao * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(passo)
      else setF(fracao)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [fracao, ms])
  return f
}

const R = 52
const CIRC = 2 * Math.PI * R

/** Rosca do ACUMULADO: uma fatia por mês, do tamanho do que ele valeu. */
function RoscaMeses({ meses, cor }: { meses: MesDoPlacar[]; cor: string }) {
  const positivos = meses.filter((m) => m.pontos > 0)
  const total = positivos.reduce((a, m) => a + m.pontos, 0)
  const f = useFracaoAnimada(1)
  let acumulado = 0

  if (!total) {
    return <circle cx="0" cy="0" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="13" />
  }
  return (
    <>
      <circle cx="0" cy="0" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="13" />
      {positivos.map((m, i) => {
        const frac = (m.pontos / total) * f
        /* ⚠️ 1.5% de folga entre fatias, e só quando a fatia comporta: sem isso
           dois meses viram um arco só e a rosca conta uma história de um mês. */
        const gap = positivos.length > 1 && frac > 0.03 ? 0.015 : 0
        const dash = Math.max(0, (frac - gap) * CIRC)
        const offset = -acumulado * CIRC
        acumulado += frac
        return (
          <circle
            key={m.competencia} cx="0" cy="0" r={R} fill="none"
            stroke={cor} strokeWidth="13" strokeLinecap="butt"
            strokeDasharray={`${dash} ${CIRC}`} strokeDashoffset={offset}
            opacity={0.45 + (0.55 * (i + 1)) / positivos.length}
          >
            <title>{`${m.competencia}: ${m.pontos.toLocaleString('pt-BR')} pontos`}</title>
          </circle>
        )
      })}
    </>
  )
}

/** Anel da POSIÇÃO: o arco é `pontos dela ÷ pontos do 1º`. */
function AnelPosicao({ fracao, cor }: { fracao: number; cor: string }) {
  const f = useFracaoAnimada(Math.max(0, Math.min(1, fracao)))
  return (
    <>
      <circle cx="0" cy="0" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="13" />
      <circle
        cx="0" cy="0" r={R} fill="none" stroke={cor} strokeWidth="13" strokeLinecap="round"
        strokeDasharray={`${f * CIRC} ${CIRC}`} strokeDashoffset={0}
      />
    </>
  )
}

function Anel({ children, titulo, legenda }: {
  children: React.ReactNode; titulo: string; legenda: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '4px 8px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--text-mute)', textAlign: 'center' }}>
        {titulo}
      </div>
      <svg width="132" height="132" viewBox="-66 -66 132 132" style={{ overflow: 'visible' }}>
        {/* -90° põe o começo do arco no topo, que é onde o olho procura. */}
        <g transform="rotate(-90)">{children}</g>
      </svg>
      <div style={{ fontSize: 11, color: 'var(--text-mute)', textAlign: 'center', lineHeight: 1.45, maxWidth: 190 }}>
        {legenda}
      </div>
    </div>
  )
}

export function Placar({ p, meses, setor, competenciaLabel, motivoSemNota }: {
  p: PosicaoFicha
  /** Os meses gravados, para a rosca do acumulado. */
  meses: MesDoPlacar[]
  setor: string
  competenciaLabel: string
  motivoSemNota?: string | null
}) {
  const n = useContador(p.acumulado)
  const primeiro = p.posicao === 1
  const cor = primeiro ? 'var(--accent)' : p.posicao != null ? 'var(--chart-2)' : 'var(--text-mute)'
  const negativos = meses.filter((m) => m.pontos < 0).length

  /* ⚠️ O denominador do anel é o 1º colocado. Sem ele (setor sem ninguém
     pontuando) não há arco — e não se inventa um. */
  const fracao = p.pontosNoMes != null && p.pontosDoPrimeiro
    ? p.pontosNoMes / p.pontosDoPrimeiro
    : 0
  const pct = Math.round(Math.max(0, fracao) * 100)

  return (
    <div className="tc-card" style={{
      marginTop: 16, background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '18px 8px',
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', gap: 18,
    }}>
      {/* ── ACUMULADO: o contador, com a rosca dos meses ─────────────────── */}
      <Anel
        titulo="Pontos no período"
        legenda={p.meses === 0
          ? 'nenhum mês pontuado nesta janela'
          : <>cada fatia é um mês · <b>{p.meses}</b> {p.meses === 1 ? 'mês' : 'meses'}
              {negativos > 0 && <><br />{negativos} {negativos === 1 ? 'mês' : 'meses'} de saldo negativo, fora do anel</>}
              {/* ⚠️⚠️ A pontuação é MENSAL e o filtro é por DIA. Quando a janela
                  corta um mês, o valor somado é o do MÊS INTEIRO — dizer isso é
                  o que separa este número do "acumulado com rótulo de período"
                  que a casa já pagou caro para tirar de outras telas. */}
              {p.mesesCortados.length > 0 && (
                <><br /><span style={{ color: 'var(--warn)' }}>
                  {p.mesesCortados.length === 1 ? 'o mês' : 'os meses'} de{' '}
                  {p.mesesCortados.map((m) => m.split('-').reverse().join('/')).join(' e ')}{' '}
                  {p.mesesCortados.length === 1 ? 'entra' : 'entram'} inteiro{p.mesesCortados.length === 1 ? '' : 's'}: a janela corta o mês, a pontuação não
                </span></>
              )}</>}
      >
        <RoscaMeses meses={meses} cor="var(--accent)" />
        <g transform="rotate(90)">
          <text x="0" y="4" textAnchor="middle" className="cnum"
            style={{ fontSize: 27, fontWeight: 800, fill: 'var(--accent)', letterSpacing: '-1px' }}>
            {n.toLocaleString('pt-BR')}
          </text>
          <text x="0" y="22" textAnchor="middle" style={{ fontSize: 10, fill: 'var(--text-mute)' }}>pontos</text>
        </g>
      </Anel>

      {/* ── POSIÇÃO no setor, na competência do filtro ───────────────────── */}
      <Anel
        titulo={`No ${setor} · ${competenciaLabel}`}
        legenda={p.posicao == null
          ? (p.semNota === 'chefia'
              ? 'encarregado: a pontuação mede execução, e quem responde pelo time não é ranqueado contra a própria equipe'
              : p.semNota === 'sem-credito'
                ? `sem atividade nem serviço em ${competenciaLabel} — não há de onde sair pontuação`
                : p.motivo ?? motivoSemNota ?? `sem pontuação em ${competenciaLabel}`)
          : <>
              <b>{p.pontosNoMes?.toLocaleString('pt-BR')}</b> pontos no mês
              {!primeiro && p.pontosDoPrimeiro
                ? <> · <b>{pct}%</b> do 1º colocado</>
                : <> · <b>o maior</b> do setor</>}
              <br /><span style={{ opacity: .8 }}>entre os {p.de} que pontuam</span>
              {/* ⚠️⚠️ PARCIAL TEM DE SE ANUNCIAR. O mês em curso soma o que já
                  aconteceu e ainda não tem a planilha de serviços do setor —
                  quem executa serviço aparece mais embaixo por falta de fonte,
                  não por produção. Um parcial exibido como número fechado é
                  menor do que será, e quem lê conclui a coisa errada. */}
              {p.estado === 'parcial' && (
                <><br /><b style={{ color: 'var(--warn)' }}>parcial</b> · mês em curso, ainda sem os serviços da planilha</>
              )}
              {p.estado === 'previa' && (
                <><br /><b style={{ color: 'var(--warn)' }}>prévia</b> · a régua ainda não foi gravada neste mês</>
              )}
            </>}
      >
        <AnelPosicao fracao={p.posicao == null ? 0 : fracao} cor={cor} />
        <g transform="rotate(90)">
          {p.posicao == null ? (
            <text x="0" y="8" textAnchor="middle" className="cnum"
              style={{ fontSize: 30, fontWeight: 800, fill: 'var(--text-mute)' }}>—</text>
          ) : (
            <>
              <text x="0" y="2" textAnchor="middle" className="cnum"
                style={{ fontSize: 30, fontWeight: 800, fill: cor, letterSpacing: '-1px' }}>
                {p.posicao}º
              </text>
              <text x="0" y="21" textAnchor="middle" style={{ fontSize: 10.5, fill: 'var(--text-mute)' }}>
                de {p.de}
              </text>
            </>
          )}
        </g>
      </Anel>

      {/* ── A FILA do setor ──────────────────────────────────────────────── */}
      {p.posicao != null && p.de > 1 && (
        <div style={{ padding: '4px 8px', minWidth: 190, maxWidth: 300, flex: '1 1 200px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 12 }}>
            A fila do setor
          </div>
          {/* ⚠️ Uma coluna por pessoa que pontua, a dela em destaque. É o LUGAR
              na fila, não os valores — desenhar os pontos aqui sugeriria uma
              distância entre colocados que esta barra não mede (o anel ao lado
              é quem mede). */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 56 }}>
            {Array.from({ length: p.de }, (_, i) => {
              const eu = i + 1 === p.posicao
              return (
                <div key={i} title={eu ? `Ela está em ${p.posicao}º de ${p.de}` : `${i + 1}º`}
                  style={{
                    flex: 1, height: eu ? '100%' : '42%', borderRadius: 4,
                    background: eu ? cor : 'var(--surface-2)',
                    border: eu ? 'none' : '1px solid var(--border-soft)',
                    transition: semMovimento() ? undefined : 'height .5s cubic-bezier(.2,.8,.2,1)',
                  }} />
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 10, lineHeight: 1.45 }}>
            do maior para o menor · {primeiro ? 'ela abre a fila' : `${p.posicao! - 1} à frente`}
          </div>
        </div>
      )}
    </div>
  )
}
