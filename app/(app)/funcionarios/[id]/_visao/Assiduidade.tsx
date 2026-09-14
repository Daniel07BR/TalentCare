'use client'
import { CalendarCheck, CheckCircle2 } from 'lucide-react'
import type { EmployeeMetrics } from '@/lib/ui/employee-period'
import CalendarioOcorrencias from '../../../CalendarioOcorrencias'
import { Cartao, Chip, Mini, forte } from '../../../_visao/ui'
import { comPonto, ehSuspensao, num, rotuloDisciplina, tomDisciplina } from './derivar'
import f from './ficha.module.css'

/* ASSIDUIDADE E DISCIPLINA — o que NÃO está nos azulejos do topo: abonados, a
   natureza de cada suspensão, a gravidade, o calendário e a lista. */
export function Assiduidade({ m, periodo, pontoAteVm, impressao = false }: {
  m: EmployeeMetrics | null; periodo: string; pontoAteVm: string | null
  /** Folha A4 (pedido do dono, 14/09/2026): SEM a lista de advertências — só o
   *  contador — e sem as linhas de explicação. */
  impressao?: boolean
}) {
  const a = m?.assiduidade
  if (!m || !a) {
    return (
      <Cartao titulo="Assiduidade e disciplina" Icone={CalendarCheck} corIcone="var(--n-amber)" sub={`Ponto eletrônico · ${periodo}`}>
        <div style={{ fontSize: 12.5, color: 'var(--n-text-3)' }}>Carregando o período…</div>
      </Cartao>
    )
  }
  const ponto = comPonto(m)
  const f5 = a.faixas
  const medidos = f5 ? f5.ate5 + f5.ate30 + f5.mais30 : 0
  const pct = (n: number) => Math.round((n / medidos) * 100)
  const faixas = f5 ? [
    { n: f5.ate5, rot: 'até 5 min', cor: 'var(--n-heat-2)' },
    { n: f5.ate30, rot: '6 a 30 min', cor: 'var(--n-orange)' },
    { n: f5.mais30, rot: 'acima de 30', cor: 'var(--n-red)' },
  ] : []
  const temSusp = m.disciplina.some((d) => ehSuspensao(d.tipo))

  return (
    <Cartao titulo="Assiduidade e disciplina" Icone={CalendarCheck} corIcone="var(--n-amber)" sub={`Ponto eletrônico · ${periodo}`}>
      <div className={f.assid}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--n-text)', marginBottom: 2 }}>Mapa de ocorrências</div>
          {!impressao && <div style={{ fontSize: 11, color: 'var(--n-text-3)', marginBottom: 10 }}>Cada quadro é um dia; mais escuro = mais minutos de atraso.</div>}
          <CalendarioOcorrencias dias={a.dias ?? []} de={m.fromDay} ate={m.toDay} pontoAte={a.pontoAte ?? pontoAteVm} pontoDesde={a.pontoDesde ?? null} />
        </div>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.minis}>
            {/* Na folha, o contador substitui a lista de advertências. */}
            {impressao && <Mini valor={ponto ? num(a.advertencias) : '—'} rotulo={m.disciplinaTotal > m.disciplina.length ? `Advertências · ${m.disciplinaTotal} no histórico` : 'Advertências'} tom="orange" />}
            <Mini valor={ponto ? num(a.atrasosAbon) : '—'} rotulo="Atrasos abonados" tom="green" />
            {/* ⚠️ Suspensão não depende do ponto: são fatos registrados. */}
            <Mini valor={a.suspensoesAtraso == null ? '—' : num(a.suspensoesAtraso)} rotulo="Suspensões por atraso" tom="purple" />
            <Mini valor={a.suspensoes == null ? '—' : num(a.suspensoes)} rotulo="Suspensões · LGPD" tom="purple" />
            {(a.lgpdAdvertencias ?? 0) > 0 && <Mini valor={num(a.lgpdAdvertencias!)} rotulo="Advertências · LGPD" tom="red" />}
            {/* ⚠️ Falta não vem no dump do Nexo: "—", nunca zero. */}
            <Mini valor="—" rotulo="Faltas · sem fonte" />
          </div>

          {/* A GRAVIDADE: seis atrasos de 7 min e dois de meia hora são conversas diferentes. */}
          {a.atrasos > 0 && medidos > 0 && (
            <div style={{ background: 'var(--n-card-2)', border: '1px solid var(--n-border-2)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--n-text)' }}>Gravidade dos atrasos</div>
              <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', margin: '2px 0 10px' }}>
                Sobre {medidos} {medidos === 1 ? 'atraso cronometrado' : 'atrasos cronometrados'}
                {f5!.semMedida > 0 && <> · {f5!.semMedida} sem medida, fora da conta</>}
              </div>
              <div style={{ display: 'flex', height: 12, borderRadius: 20, overflow: 'hidden', gap: 2, marginBottom: 10 }}>
                {faixas.filter((x) => x.n > 0).map((x) => (
                  <div key={x.rot} title={`${x.rot}: ${x.n} de ${medidos}`} style={{ width: `${(x.n / medidos) * 100}%`, background: x.cor }} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {faixas.map((x) => (
                  <div key={x.rot} style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: x.cor, flex: 'none' }} />
                      <span className="cnum" style={{ fontSize: 16, fontWeight: 800, color: 'var(--n-text)' }}>{pct(x.n)}%</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--n-text-2)' }}>{x.rot} · {x.n}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {!impressao && (
      <div style={{ borderTop: '1px solid var(--n-border-2)', marginTop: 18, paddingTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-text)' }}>
          {temSusp ? 'Advertências e suspensões' : 'Advertências'}
          <span style={{ fontSize: 11, color: 'var(--n-text-3)', fontWeight: 500 }}> · {periodo}{m.disciplinaTotal > m.disciplina.length && <> · {m.disciplinaTotal} no histórico completo</>}</span>
        </div>
        {/* ⚠️ A ressalva uma vez, aqui: é contagem pela regra, não advertência assinada. */}
        <div style={{ fontSize: 11, color: 'var(--n-text-3)', margin: '3px 0 12px', lineHeight: 1.5 }}>
          A casa aplica advertência <b>a partir do 2º atraso do mês</b>. Esta é a contagem por essa regra — não é registro de advertência assinada.
        </div>
        {m.disciplina.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--n-green-soft)', borderRadius: 12, padding: '12px 14px' }}>
            <CheckCircle2 size={20} color="var(--n-green)" />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-text)' }}>Nenhuma ocorrência no período</div>
              {m.disciplinaTotal > 0 && <div style={{ fontSize: 11, color: 'var(--n-text-2)' }}>{m.disciplinaTotal} em outros períodos — amplie o filtro para ver</div>}
            </div>
          </div>
        ) : (
          <div className={f.lista2}>
            {m.disciplina.map((d, i) => {
              const tom = tomDisciplina(d.tipo)
              const grave = ehSuspensao(d.tipo)
              return (
                <div key={i} className="cpop" style={{ display: 'flex', alignItems: 'center', gap: 10, background: grave ? 'var(--n-purple-soft)' : 'var(--n-card-2)', border: '1px solid var(--n-border-2)', borderLeft: `4px solid ${forte(tom)}`, borderRadius: 10, padding: '9px 12px', minWidth: 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Chip tom={tom}>{rotuloDisciplina(d.tipo)}{grave && d.dias ? ` · ${d.dias} ${d.dias === 1 ? 'dia' : 'dias'}` : ''}</Chip>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--n-text-2)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.motivo ?? undefined}>{d.motivo ?? 'sem motivo registrado'}</div>
                  </div>
                  <span className="cnum" style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-text-3)', flex: 'none' }}>
                    {new Date(`${d.data}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}
    </Cartao>
  )
}
