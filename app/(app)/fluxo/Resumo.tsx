'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useFluxoPeriod } from '@/lib/ui/fluxo-period'
import { usePeriod } from '@/lib/ui/period'
import { useRecorteSetor, useEmJanela } from '@/lib/ui/recorte-setor'
import { fluxoVM, fmtDurUtil, type FluxoPerson, type FluxoSetor } from '@/lib/mock/fluxo'
import Avatar from '../Avatar'
import { usePainelDaPessoa } from '../PainelDaPessoa'
import EsqueletoResumo from '../EsqueletoResumo'
import LogoFluxo from '../LogoFluxo'

/* ============================================================
   FLUXO — os CHAMADOS entre setores (9ª fonte), 17/09/2026.

   Esta tela era a metade de baixo do resumo do Chat Interno. Os chamados
   mudaram de casa em 16/09/2026 e o painel veio junto: no Chat ficaram as
   mensagens, e aqui está o pedido — quem pediu, quem assumiu, quem entregou e
   em quanto tempo.

   ⚠️⚠️ As DUAS FACES do mesmo chamado (o que o setor pediu × o que recebeu para
   atender) continuam sem se somar, e o tempo continua sendo de EXPEDIENTE.
   ============================================================ */

const num = (n: number) => n.toLocaleString('pt-BR')

export default function FluxoResumo() {
  const abrirPessoa = usePainelDaPessoa()
  /* Aberto de dentro do relatório de um setor? Então some o que compara
     setores entre si — com um setor só, é uma barra de 100%. */
  const setor = useRecorteSetor()
  const emJanela = useEmJanela()
  const router = useRouter()
  const data = useTalentData()
  const { label } = usePeriod()
  const { map, setores: todosSetores, desde, loading } = useFluxoPeriod()
  /* ⚠️ Os chamados vêm POR SETOR (`fluxo_dept_daily`, pelo setor gravado no
     chamado), não por pessoa — o recorte do diretório não os alcança. Sem este
     filtro, a janela do Legal mostraria os chamados da casa inteira nos KPIs. */
  const setores = setor ? todosSetores.filter((s) => s.id === setor.id) : todosSetores
  const vm = fluxoVM(data, map ?? undefined, setores)

  const kpis = [
    /* ⚠️ Na casa inteira, "aberto" e "recebido" são o mesmo total (todo pedido
       é recebido por alguém). Num setor só, não: aqui é o que ELE recebeu para
       atender — e o rótulo precisa dizer, senão se lê como o que ele pediu. */
    setor
      ? { label: 'Chamados recebidos', value: num(vm.totaisSetor.recebidosAbertos), color: 'var(--chart-3)', desc: 'Pedidos de outros setores a este' }
      : { label: 'Chamados abertos', value: num(vm.totaisSetor.recebidosAbertos), color: 'var(--chart-3)', desc: 'Pedidos de um setor a outro' },
    { label: 'Chamados concluídos', value: num(vm.totaisSetor.recebidosConcluidos), color: 'var(--success)', desc: `${num(vm.totaisSetor.recebidosCancelados)} cancelados à parte` },
    { label: 'Tempo médio de atendimento', value: vm.tempoMedioSetor, color: 'var(--chart-4)', desc: 'Só o expediente · 8h–18h, seg a sex' },
    /* ⚠️ A TAREFA DELEGADA tem KPI próprio, e não entra nos três acima: ela é
       trabalho passado DENTRO do setor, e somá-la ao pedido entre setores
       inflaria os dois lados com o que nunca saiu de casa. */
    { label: 'Tarefas delegadas', value: num(vm.totais.tarefasAbertas), color: 'var(--chart-5)', desc: `${num(vm.totais.tarefasConcluidas)} concluídas · dentro do próprio setor` },
  ]

  if (emJanela && loading && !map) return <EsqueletoResumo />

  return (
    <div className="tc-anim" style={emJanela ? undefined : { maxWidth: 1280, margin: '0 auto' }}>
      {!emJanela && (
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Integração · dados reais · {label}</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoFluxo size={26} /> Fluxo · chamados
          </h1>
        </div>
      </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-1px', color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4 }}>{k.desc}</div>
          </div>
        ))}
      </div>

      {/*
        ⚠️ A janela do dado e a janela do SISTEMA são coisas diferentes, e a tela
        precisa dizer: chamado entre setores só existe desde 21/08/2026, e desde
        16/09/2026 ele mora no Fluxo. Período anterior aparece zerado porque a
        coisa não existia — não porque ninguém pediu nada.
      */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)', padding: '10px 13px', marginBottom: 16, fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.55 }}>
        <span style={{ color: 'var(--text-mute)', flex: 'none' }}>ⓘ</span>
        <span>
          <b>Chamado entre setores</b> existe desde <b>{desde ? new Date(`${desde}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '21 de agosto de 2026'}</b>;
          até 16/09/2026 ele era do <b>Chat Interno</b>, e mudou para o Fluxo com a história inteira —
          os pedidos migrados mantiveram a data original, então nada some do passado. O tempo conta
          só o <b>expediente</b> (8h–18h, seg a sex), então <b>1 d = 10 h</b> de trabalho.
        </span>
      </div>

      {/*
        ⚠️⚠️ O painel por setor mostra as DUAS FACES do mesmo chamado e NÃO as
        soma: "pediu" e "recebeu" são as colunas SOLICITANTE e RESPONSÁVEL da
        tela do Fluxo. Somar dobraria a casa inteira.
      */}
      {!setor && (
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Chamados por departamento</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
          Duas faces do mesmo pedido: o que o setor <b>pediu</b> aos outros e o que <b>recebeu</b> para
          atender. Não se somam. Tarefa delegada dentro do setor fica fora desta tabela.
        </div>
        {vm.porSetor.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem chamados no período.</div>
        ) : (
          <SetorTable rows={vm.porSetor} totais={vm.totaisSetor} onRow={(id) => id && router.push(`/departamentos/${id}`)} />
        )}
      </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>
        <Leaderboard
          title="Quem mais conclui chamado" sub="Responsáveis que entregaram o pedido"
          color="var(--success)" rows={vm.ativos.slice(0, 5)} valor={(p) => p.stat.chamadosConcluidos}
        />
        <Leaderboard
          title="Quem mais pede" sub="Chamados que a pessoa abriu para outro setor"
          color="var(--chart-3)"
          rows={[...vm.ativos].sort((a, b) => b.stat.chamadosAbertos - a.stat.chamadosAbertos).slice(0, 5)}
          valor={(p) => p.stat.chamadosAbertos}
        />
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Chamados por pessoa</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
          {vm.pessoasAtivas} pessoas moveram chamado ou tarefa no período. Clique para ver o que cada
          uma fez, item a item.
        </div>
        {vm.ativos.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem atividade no período.</div>
        ) : (
          <UserTable rows={vm.ativos} totais={vm.totais} onRow={(id) => abrirPessoa('fluxo', id)} />
        )}
      </div>
    </div>
  )
}

function Leaderboard({ title, sub, color, rows, valor }: {
  title: string; sub: string; color: string; rows: FluxoPerson[]
  valor: (p: FluxoPerson) => number
}) {
  const abrirPessoa = usePainelDaPessoa()
  const visiveis = rows.filter((p) => valor(p) > 0)
  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: 'none' }} />{title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>{sub}</div>
      {visiveis.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-mute)', padding: '4px 0' }}>Sem registros no período.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visiveis.map((p, i) => (
            <div key={p.id} className="tc-row" onClick={() => abrirPessoa('fluxo', p.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
              <span style={{ width: 16, fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textAlign: 'center' }}>{i + 1}</span>
              <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cargo} · {p.dept}</div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{num(valor(p))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const COLS = [
  { key: 'pedidosAbertos' as const, label: 'Pediu', color: 'var(--info)' },
  { key: 'pedidosConcluidos' as const, label: 'Atendidos', color: 'var(--text-mute)' },
  { key: 'recebidosAbertos' as const, label: 'Recebeu', color: 'var(--chart-3)' },
  { key: 'recebidosConcluidos' as const, label: 'Concluiu', color: 'var(--success)' },
]

function SetorTable({ rows, totais, onRow }: {
  rows: FluxoSetor[]
  totais: { pedidosAbertos: number; pedidosConcluidos: number; recebidosAbertos: number; recebidosConcluidos: number; recebidosCancelados: number; segundosResolucao: number }
  onRow: (id: string | null) => void
}) {
  const grid = '1fr 88px 88px 88px 88px 120px'
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '0 6px 9px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mute)' }}>Departamento</div>
        {COLS.map((c) => (
          <div key={c.key} style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-mute)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.color }} />{c.label}
          </div>
        ))}
        <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-mute)' }}>Tempo médio</div>
      </div>
      {rows.map((d) => (
        <div
          key={d.nexusDepartmentId} className={d.id ? 'tc-row' : undefined}
          onClick={() => onRow(d.id)}
          style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '9px 6px', borderBottom: '1px solid var(--border-soft)', alignItems: 'center', cursor: d.id ? 'pointer' : 'default' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--chart-3)', flex: 'none' }} />
            <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</span>
          </div>
          {COLS.map((c) => (
            <div key={c.key} style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: d[c.key] > 0 ? 'var(--text)' : 'var(--text-mute)' }}>{num(d[c.key])}</div>
          ))}
          {/* ⚠️ Tempo médio só dos CONCLUÍDOS que o setor atendeu. Cancelado fica
              fora: média com cancelado dentro premia quem desiste. */}
          <div style={{ textAlign: 'right', fontSize: 12.5, color: d.recebidosConcluidos > 0 ? 'var(--text-dim)' : 'var(--text-mute)' }}>
            {d.recebidosConcluidos > 0 ? fmtDurUtil(Math.round(d.segundosResolucao / d.recebidosConcluidos)) : '—'}
          </div>
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 6px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>Total</div>
        {COLS.map((c) => (
          <div key={c.key} style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: c.color }}>{num(totais[c.key])}</div>
        ))}
        <div />
      </div>
    </div>
  )
}

function UserTable({ rows, totais, onRow }: {
  rows: FluxoPerson[]
  totais: { chamadosAbertos: number; chamadosAssumidos: number; chamadosConcluidos: number; tarefasAbertas: number; tarefasConcluidas: number }
  onRow: (id: string) => void
}) {
  const grid = '1fr 76px 84px 84px 92px 92px 104px'
  const cab = ['Abriu', 'Assumiu', 'Concluiu', 'Delegou', 'Tarefa feita', 'Tempo médio']
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '0 6px 9px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mute)' }}>Funcionário</div>
        {cab.map((c) => (<div key={c} style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-mute)' }}>{c}</div>))}
      </div>
      <div style={{ maxHeight: 560, overflowY: 'auto' }}>
        {rows.map((p) => (
          <div key={p.id} className="tc-row" onClick={() => onRow(p.id)} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '8px 6px', borderBottom: '1px solid var(--border-soft)', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={28} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cargo} · {p.dept}</div>
              </div>
            </div>
            <Cel v={p.stat.chamadosAbertos} />
            <Cel v={p.stat.chamadosAssumidos} />
            <Cel v={p.stat.chamadosConcluidos} />
            <Cel v={p.stat.tarefasAbertas} />
            <Cel v={p.stat.tarefasConcluidas} />
            <div style={{ textAlign: 'right', fontSize: 12.5, color: p.stat.chamadosConcluidos > 0 ? 'var(--text-dim)' : 'var(--text-mute)' }}>
              {p.stat.chamadosConcluidos > 0 ? p.tempoMedio : '—'}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 6px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>Total</div>
        <Cel v={totais.chamadosAbertos} forte color="var(--chart-3)" />
        <Cel v={totais.chamadosAssumidos} forte color="var(--info)" />
        <Cel v={totais.chamadosConcluidos} forte color="var(--success)" />
        <Cel v={totais.tarefasAbertas} forte color="var(--chart-5)" />
        <Cel v={totais.tarefasConcluidas} forte color="var(--chart-5)" />
        <div />
      </div>
    </div>
  )
}

function Cel({ v, forte, color }: { v: number; forte?: boolean; color?: string }) {
  return (
    <div style={{ textAlign: 'right', fontSize: 13, fontWeight: forte ? 800 : 700, fontVariantNumeric: 'tabular-nums', color: color ?? (v > 0 ? 'var(--text)' : 'var(--text-mute)') }}>
      {num(v)}
    </div>
  )
}
