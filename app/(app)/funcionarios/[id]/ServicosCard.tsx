'use client'
import { FileSpreadsheet, Scale } from 'lucide-react'

type Servicos = NonNullable<{
  temFonte: boolean
  concluidos: number; abertos: number; desconsiderados: number; minutos: number
  porMes: { mes: string; concluidos: number; minutos: number }[]
  porTarefa: { tarefa: string; n: number; minutos: number }[]
}>
type Ponto = { competencia: string; pontos: number; origem: string; detalhe: string | null }

const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const rotuloMes = (c: string) => {
  const [a, m] = c.split('-')
  return `${MES_CURTO[parseInt(m, 10) - 1] ?? m}/${a.slice(2)}`
}
const horas = (min: number) => (min >= 60 ? `${Math.round(min / 60)} h` : `${min} min`)

/**
 * Os serviços que o setor registra em planilha, e a pontuação do mês.
 *
 * ⚠️⚠️ NÃO APARECE quando o setor não manda planilha (`temFonte === false`). Um
 * cartão dizendo "0 serviços concluídos" na ficha de quem trabalha num setor que
 * nem usa esta fonte é a mesma falta do ponto com outra roupa: zero por ausência
 * de fonte se lê como ausência de trabalho, e aqui acusaria 14 dos 15 setores.
 */
export default function ServicosCard({ servicos, pontuacao, periodo }: {
  servicos?: Servicos; pontuacao?: Ponto[]; periodo: string
}) {
  const temServico = !!servicos?.temFonte
  const temPonto = !!pontuacao?.length
  if (!temServico && !temPonto) return null

  const maxMes = Math.max(1, ...(servicos?.porMes ?? []).map((m) => m.concluidos))
  const maxTarefa = Math.max(1, ...(servicos?.porTarefa ?? []).map((t) => t.n))
  const serie = (pontuacao ?? []).slice(-15)
  const maxPts = Math.max(1, ...serie.map((p) => p.pontos))
  const informados = serie.filter((p) => p.origem === 'informado').length

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <FileSpreadsheet size={16} color="var(--chart-2)" />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Serviços do setor</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
        Da planilha que o setor envia · {periodo.toLowerCase()}
      </div>

      {temServico && servicos && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 18 }}>
            <Num label="Concluídos" valor={servicos.concluidos.toLocaleString('pt-BR')} cor="var(--success)" />
            <Num label="Em aberto" valor={servicos.abertos.toLocaleString('pt-BR')} cor="var(--warning)" />
            <Num label="Tempo somado" valor={horas(servicos.minutos)} />
            <Num label="Média por serviço"
              valor={servicos.concluidos ? horas(Math.round(servicos.minutos / servicos.concluidos)) : '—'} />
          </div>

          {servicos.porMes.length > 1 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Concluídos por mês</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
                {servicos.porMes.map((m) => (
                  <div key={m.mes} title={`${rotuloMes(m.mes)}: ${m.concluidos} concluídos · ${horas(m.minutos)}`}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
                    <div style={{ width: '100%', height: `${(m.concluidos / maxMes) * 68}px`, background: 'var(--chart-2)', borderRadius: '3px 3px 0 0', minHeight: 2 }} />
                    <span style={{ fontSize: 9.5, color: 'var(--text-mute)', whiteSpace: 'nowrap' }}>{rotuloMes(m.mes)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {servicos.porTarefa.length > 0 && (
            <div style={{ marginBottom: temPonto ? 18 : 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>O que ela mais fez</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {servicos.porTarefa.map((t) => (
                  <div key={t.tarefa} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5 }}>
                    <span style={{ flex: 1, minWidth: 0, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.tarefa}</span>
                    <div style={{ width: 110, height: 6, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden', flex: 'none' }}>
                      <div style={{ width: `${(t.n / maxTarefa) * 100}%`, height: '100%', background: 'var(--chart-2)', borderRadius: 20 }} />
                    </div>
                    <span style={{ width: 34, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{t.n}</span>
                    <span style={{ width: 52, textAlign: 'right', color: 'var(--text-mute)' }}>{horas(t.minutos)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {temPonto && (
        <div style={{ borderTop: temServico ? '1px solid var(--border)' : 'none', paddingTop: temServico ? 16 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            <Scale size={14} color="var(--accent)" />
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>Pontuação do setor, mês a mês</div>
          </div>
          {/* ⚠️⚠️ A PROCEDÊNCIA fica escrita. O histórico do Legal foi calculado à
              mão por um critério anterior: 105 dos 127 valores passam do teto que
              a régua de hoje permite, e nenhum termina em 5 — prova de que a
              penalidade de advertência nunca entrou neles. Mostrar informado e
              calculado com a mesma cara seria inventar procedência. */}
          <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 12, lineHeight: 1.5 }}>
            Não acompanha o filtro de período — é mensal por natureza.
            {informados > 0 && (
              <> {informados === serie.length
                ? <><b>Todos informados pelo setor</b>, não calculados pela régua do sistema.</>
                : <>{informados} {informados === 1 ? 'mês informado' : 'meses informados'} pelo setor; o resto calculado pela régua.</>}
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 96 }}>
            {serie.map((p) => (
              <div key={p.competencia} title={`${rotuloMes(p.competencia)}: ${p.pontos} pontos · ${p.origem === 'informado' ? 'informado pelo setor' : p.detalhe ?? 'calculado pela régua'}`}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-dim)' }}>{p.pontos}</span>
                <div style={{
                  width: '100%', height: `${Math.max(2, (p.pontos / maxPts) * 56)}px`, minHeight: 2,
                  borderRadius: '3px 3px 0 0',
                  /* Informado vem listrado: dá para ler o número e dá para ver,
                     sem legenda, que a procedência é outra. */
                  background: p.origem === 'informado'
                    ? 'repeating-linear-gradient(45deg, var(--text-mute) 0 3px, transparent 3px 6px)'
                    : 'var(--accent)',
                  border: p.origem === 'informado' ? '1px solid var(--border)' : 'none',
                }} />
                <span style={{ fontSize: 9.5, color: 'var(--text-mute)', whiteSpace: 'nowrap' }}>{rotuloMes(p.competencia)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Num({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
      <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.5px', color: cor ?? 'var(--text)' }}>{valor}</div>
    </div>
  )
}
