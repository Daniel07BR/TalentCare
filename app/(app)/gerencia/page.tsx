'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useGerenciaPeriod } from '@/lib/ui/gerencia-period'
import { usePeriod } from '@/lib/ui/period'
import { PERIOD_LABEL } from '@/lib/mock/dashboard'
import { gerenciaVM, type GerenciaPerson, type GerenciaDeptBar } from '@/lib/mock/gerencia'
import Avatar from '../Avatar'

const COR_EXEC = 'var(--chart-2)'
const COR_ESCR = 'var(--info)'

const GerenciaIcon = ({ size = 17, color = COR_EXEC }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 17h4V5H2v12h3M20 17h2v-6l-3-4h-4v10h2" />
    <circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
)

function Kpi({ label, value, unit, color, hint }: { label: string; value: number | string; unit?: string; color: string; hint?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        <span className="cnum" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-1px', color }}>{value}</span>
        {unit ? <span style={{ fontSize: 12, color: 'var(--text-mute)', fontWeight: 600 }}>{unit}</span> : null}
      </div>
      {hint ? <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 2 }}>{hint}</div> : null}
    </div>
  )
}

function Barras({ bars, color, sufixo }: { bars: GerenciaDeptBar[]; color: string; sufixo: string }) {
  const router = useRouter()
  if (bars.length === 0) return <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem registro no período.</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {bars.map((d) => (
        <div key={d.id} className="tc-row" onClick={() => router.push(`/departamentos/${d.id}`)}
          style={{ display: 'grid', gridTemplateColumns: '110px 1fr 62px', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
          <div style={{ height: 9, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: d.pct, height: '100%', background: d.color || color, borderRadius: 99 }} />
          </div>
          <div className="cnum" style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right' }}>{d.valor.toLocaleString('pt-BR')}<span style={{ fontSize: 10, color: 'var(--text-mute)', fontWeight: 500 }}> {sufixo}</span></div>
        </div>
      ))}
    </div>
  )
}

function Linha({ p, cols }: { p: GerenciaPerson; cols: { label: string; v: number; destaque?: boolean }[] }) {
  const router = useRouter()
  return (
    <div className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)}
      style={{ display: 'grid', gridTemplateColumns: `minmax(0,1.6fr) repeat(${cols.length}, 74px)`, alignItems: 'center', gap: 10, padding: '9px 6px', borderBottom: '1px solid var(--border-soft)', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={30} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
          {/* O cargo fica visível de propósito: fora os dois mensageiros, quem
              aparece aqui saiu na rua eventualmente com outro cargo. */}
          <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cargo} · {p.dept}</div>
        </div>
      </div>
      {cols.map((c) => (
        <div key={c.label} className="cnum" style={{ fontSize: 13, fontWeight: c.destaque ? 800 : 600, textAlign: 'right', color: c.v === 0 ? 'var(--text-mute)' : c.destaque ? 'var(--text)' : 'var(--text-dim)' }}>
          {c.v.toLocaleString('pt-BR')}
        </div>
      ))}
    </div>
  )
}

function Cabecalho({ labels }: { labels: string[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `minmax(0,1.6fr) repeat(${labels.length}, 74px)`, gap: 10, padding: '0 6px 8px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600 }}>Pessoa · cargo</div>
      {labels.map((l) => (
        <div key={l} style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, textAlign: 'right' }}>{l}</div>
      ))}
    </div>
  )
}

export default function GerenciaPage() {
  const data = useTalentData()
  const { period } = usePeriod()
  const { map } = useGerenciaPeriod()
  const vm = gerenciaVM(data, map ?? undefined)
  const t = vm.totais

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Integração · dados reais · {PERIOD_LABEL[period]}</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <GerenciaIcon size={24} /> Gerência · Mensageria
        </h1>
        <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 4 }}>
          Duas faces: quem <strong>sai na rua</strong> e quem <strong>demanda do escritório</strong>. Não são somadas.
        </div>
      </div>

      {/* Sem esta nota, um filtro de Ano faz o km parecer quebrado. */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 18, fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
        <span aria-hidden="true">ℹ️</span>
        <span>
          As janelas de histórico são diferentes na origem: <strong>serviços concluídos</strong> existem desde 2022;
          <strong> km, viagens e jornada</strong> só a partir de 17/07/2026 (quando o app passou a registrar);
          <strong> autoria de protocolo</strong> desde março/2026. Períodos anteriores aparecem zerados por falta de registro, não por inatividade.
        </span>
      </div>

      {/* ============ EXECUÇÃO ============ */}
      <div style={{ fontSize: 13, fontWeight: 700, color: COR_EXEC, marginBottom: 10, letterSpacing: '.3px', textTransform: 'uppercase' }}>Saídas externas</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi label="Serviços concluídos" value={t.servicos.toLocaleString('pt-BR')} color={COR_EXEC} />
        <Kpi label="Km rodados" value={t.km.toLocaleString('pt-BR')} unit="km" color="var(--text)" hint="desde 17/07/2026" />
        <Kpi label="Viagens" value={t.viagens.toLocaleString('pt-BR')} color="var(--text)" hint="desde 17/07/2026" />
        <Kpi label="Jornada registrada" value={vm.horasJornada.toLocaleString('pt-BR')} unit="h" color="var(--text)" hint="desde 17/07/2026" />
        <Kpi label="Pessoas que saíram" value={vm.execPessoas} color="var(--info)" />
      </div>

      <div className="tc-card" style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Quem saiu na rua</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
          Cada um com o seu cargo — só Elton e Gilberto são mensageiros; os demais fazem saída externa eventual.
        </div>
        {vm.execucao.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Nenhuma saída registrada no período.</div>
        ) : (
          <>
            <Cabecalho labels={['Serviços', 'Km', 'Viagens']} />
            {vm.execucao.map((p) => (
              <Linha key={p.id} p={p} cols={[
                { label: 'Serviços', v: p.stat.servicos, destaque: true },
                { label: 'Km', v: p.stat.km },
                { label: 'Viagens', v: p.stat.viagens },
              ]} />
            ))}
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="tc-card" style={{ ...card, marginBottom: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Serviços concluídos por departamento</div>
          <Barras bars={vm.execBars} color={COR_EXEC} sufixo="serv." />
        </div>
        <div className="tc-card" style={{ ...card, marginBottom: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Km rodados por departamento</div>
          <Barras bars={vm.kmBars} color={COR_EXEC} sufixo="km" />
        </div>
      </div>

      {/* ============ ESCRITÓRIO ============ */}
      <div style={{ fontSize: 13, fontWeight: 700, color: COR_ESCR, marginBottom: 10, letterSpacing: '.3px', textTransform: 'uppercase' }}>Demanda do escritório</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi label="Protocolos abertos" value={t.protAbertos.toLocaleString('pt-BR')} color={COR_ESCR} hint="desde mar/2026" />
        <Kpi label="Protocolos aprovados" value={t.protAprovados.toLocaleString('pt-BR')} color="var(--text)" />
        <Kpi label="Serviços criados" value={t.servCriados.toLocaleString('pt-BR')} color="var(--text)" />
        <Kpi label="Reagendados" value={t.reagendados.toLocaleString('pt-BR')} color="var(--warning)" />
        <Kpi label="Cancelados" value={t.cancelados.toLocaleString('pt-BR')} color="var(--danger)" />
        <Kpi label="Pessoas que demandaram" value={vm.escrPessoas} color="var(--info)" />
      </div>

      <div className="tc-card" style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Quem demandou</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>Qualquer funcionário que abriu, aprovou, reagendou ou cancelou</div>
        {vm.escritorio.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Nenhuma demanda registrada no período.</div>
        ) : (
          <>
            <Cabecalho labels={['Abertos', 'Aprovou', 'Serviços', 'Reagend.', 'Cancel.']} />
            {vm.escritorio.map((p) => (
              <Linha key={p.id} p={p} cols={[
                { label: 'Abertos', v: p.stat.protAbertos, destaque: true },
                { label: 'Aprovou', v: p.stat.protAprovados },
                { label: 'Serviços', v: p.stat.servCriados },
                { label: 'Reagend.', v: p.stat.reagendados },
                { label: 'Cancel.', v: p.stat.cancelados },
              ]} />
            ))}
          </>
        )}
      </div>

      <div className="tc-card" style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Demanda por departamento</div>
        <Barras bars={vm.escrBars} color={COR_ESCR} sufixo="ações" />
      </div>
    </div>
  )
}
