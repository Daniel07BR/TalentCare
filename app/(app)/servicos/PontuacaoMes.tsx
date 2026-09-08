'use client'
import { useState } from 'react'
import { Calculator, TriangleAlert, Check } from 'lucide-react'

/* ============================================================
   RODAR A RÉGUA NUM MÊS.

   ⚠️⚠️ DUAS FASES, e a primeira não escreve nada — a mesma doutrina da
   importação da planilha, e pelo mesmo motivo: aqui se grava a pontuação
   mensal de gente real, o número que decide aumento. O ensaio mostra a conta
   ABERTA de cada pessoa (base, atrasos, advertências, serviços) antes de
   qualquer gravação.

   ⚠️ A tela não escolhe a competência sozinha nem tenta adivinhar: quem calcula
   diz qual mês, e a rota recusa mês aberto, mês que o ponto não cobre e mês que
   o setor já informou à mão.
   ============================================================ */

type Linha = {
  personKey: string; nome: string
  atrasos: number; atrasosAbonados: number; advertencias: number
  servicosConcluidos: number; pontosDeServico: number
  pontos: number; detalhe: string
  jaTem: { pontos: number; origem: string } | null
}
type Resultado = {
  competencia: string; base: number; fatorPorMinuto: number; vigenteDesde: string
  informados: string[]; foraDoPonto: string[]; semServico: string[]; linhas: Linha[]
  gravadas?: number; preservadas?: number
}

/** O mês anterior ao corrente — o último que pode ter fechado. */
function mesPassado() {
  const d = new Date()
  d.setDate(1); d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function PontuacaoMes({ departmentId, setorNome }: { departmentId: string; setorNome: string }) {
  const [competencia, setCompetencia] = useState(mesPassado())
  const [r, setR] = useState<Resultado | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [gravado, setGravado] = useState(false)

  async function ensaiar() {
    setOcupado(true); setErro(null); setR(null); setGravado(false)
    try {
      const res = await fetch(`/api/servicos/pontuacao?departmentId=${departmentId}&competencia=${competencia}`, { cache: 'no-store' })
      const d = await res.json()
      if (!res.ok) { setErro(d.error ?? 'Não consegui montar o cálculo.'); return }
      setR(d)
    } catch { setErro('A rede falhou. Nada foi gravado.') } finally { setOcupado(false) }
  }

  async function gravar() {
    setOcupado(true); setErro(null)
    try {
      const res = await fetch('/api/servicos/pontuacao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId, competencia }),
      })
      const d = await res.json()
      if (!res.ok) { setErro(d.error ?? 'Não consegui gravar.'); return }
      setR(d); setGravado(true)
    } catch { setErro('A rede falhou no meio da gravação. Recarregue para conferir.') } finally { setOcupado(false) }
  }

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Calculator size={16} color="var(--chart-2)" />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Pontuação do mês — {setorNome}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.55 }}>
        Roda a régua num mês fechado e grava a pontuação de cada pessoa, com a <b>conta aberta</b> — é o número que
        aparece no gráfico da ficha. O ensaio mostra o resultado <b>sem gravar nada</b>.
        {' '}O que o setor já informou à mão <b>não é sobrescrito</b>: veio de outro critério e a pessoa já leu.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <input type="month" value={competencia} onChange={(e) => { setCompetencia(e.target.value); setR(null); setGravado(false) }}
          style={{ height: 34, padding: '0 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, colorScheme: 'light dark' }} />
        <button onClick={ensaiar} disabled={ocupado}
          style={{ height: 34, padding: '0 16px', background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: ocupado ? 'wait' : 'pointer' }}>
          {ocupado ? 'Calculando…' : 'Ensaiar (não grava)'}
        </button>
        {r && !gravado && (
          <button onClick={gravar} disabled={ocupado}
            style={{ height: 34, padding: '0 16px', background: 'var(--success)', color: '#04210c', border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: ocupado ? 'wait' : 'pointer' }}>
            Gravar {r.linhas.filter((l) => l.jaTem?.origem !== 'informado').length} pontuações de {r.competencia}
          </button>
        )}
      </div>

      {erro && (
        <div style={{ fontSize: 12.5, color: 'var(--warning)', background: 'rgba(245,166,35,.1)', border: '1px solid rgba(245,166,35,.3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', lineHeight: 1.55 }}>
          <TriangleAlert size={13} style={{ verticalAlign: -2 }} /> {erro}
        </div>
      )}

      {gravado && (
        <div style={{ fontSize: 12.5, color: 'var(--success)', marginBottom: 12 }}>
          <Check size={13} style={{ verticalAlign: -2 }} /> Gravado. {r?.gravadas} {r?.gravadas === 1 ? 'pontuação' : 'pontuações'} de {r?.competencia}
          {r?.preservadas ? `, e ${r.preservadas} preservadas por terem sido informadas pelo setor` : ''}.
        </div>
      )}

      {r && (
        <>
          <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginBottom: 8 }}>
            Régua vigente desde {r.vigenteDesde} · base {r.base} · {r.fatorPorMinuto} ponto por minuto
          </div>
          {/* ⚠️⚠️ QUEM FICOU DE FORA, e por quê. Sem esta linha a lista parece a
              equipe inteira, e quem o ponto não mede simplesmente não aparece —
              a ausência silenciosa que a casa já pagou caro para aprender. */}
          {r.foraDoPonto.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.55 }}>
              <b>{r.foraDoPonto.length}</b> {r.foraDoPonto.length === 1 ? 'pessoa do setor ficou de fora' : 'pessoas do setor ficaram de fora'} por não
              {' '}{r.foraDoPonto.length === 1 ? 'ser medida' : 'serem medidas'} pelo ponto ({r.foraDoPonto.join(', ')}).
              {' '}Elas entrariam sem atraso nenhum e com o bônus de mês limpo — ganhando de quem é medido e chegou no horário.
            </div>
          )}
          {/* ⚠️⚠️ Dois eixos diferentes na mesma lista. A metade de serviço só
              premia quem a planilha cobre; a disciplinar pune todo mundo. Quem
              não executa serviço fica na base e parece pior que um colega que
              executou pouco — e o contrário também acontece. */}
          {r.semServico.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--warning)', background: 'rgba(245,166,35,.1)', border: '1px solid rgba(245,166,35,.3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 10, lineHeight: 1.55 }}>
              <TriangleAlert size={13} style={{ verticalAlign: -2 }} />{' '}
              <b>{r.semServico.length} {r.semServico.length === 1 ? 'pessoa não teve nenhum serviço' : 'pessoas não tiveram nenhum serviço'} na planilha deste mês</b>
              {' '}({r.semServico.join(', ')}). O total {r.semServico.length === 1 ? 'dela' : 'delas'} é só a metade disciplinar da régua —
              base menos atrasos —, então <b>não dá para comparar com quem executou serviço</b>. Quem coordena, confere ou
              atende costuma cair aqui: o número está certo e mede outra coisa.
            </div>
          )}

          {r.informados.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.55 }}>
              <b>{r.informados.length}</b> {r.informados.length === 1 ? 'pessoa já tem valor informado' : 'pessoas já têm valor informado'} neste
              mês e {r.informados.length === 1 ? 'não será recalculada' : 'não serão recalculadas'}.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {r.linhas.map((l) => (
              <div key={l.personKey} style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 12.5 }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{l.nome}</span>
                  {l.jaTem && (
                    <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                      hoje {l.jaTem.pontos} ({l.jaTem.origem})
                    </span>
                  )}
                  <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: l.jaTem?.origem === 'informado' ? 'var(--text-mute)' : 'var(--text)' }}>
                    {l.jaTem?.origem === 'informado' ? '—' : l.pontos}
                  </span>
                </div>
                {/* A CONTA ABERTA. Uma pontuação que decide aumento e chega como
                    um inteiro solto não se discute. */}
                <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 3, lineHeight: 1.5 }}>{l.detalhe}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
