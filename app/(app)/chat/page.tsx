'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useChatPeriod } from '@/lib/ui/chat-period'
import { usePeriod } from '@/lib/ui/period'
import { PERIOD_LABEL } from '@/lib/mock/dashboard'
import { chatVM, fmtDurUtil, type ChatPerson, type ChatSetor } from '@/lib/mock/chat'
import Avatar from '../Avatar'

const ChatIcon = ({ size = 17, color = 'var(--chart-3)' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z" /><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
  </svg>
)

const num = (n: number) => n.toLocaleString('pt-BR')

export default function ChatPage() {
  const router = useRouter()
  const data = useTalentData()
  const { period } = usePeriod()
  const { map, setores, desde } = useChatPeriod()
  const vm = chatVM(data, map ?? undefined, setores)

  const kpis = [
    { label: 'Mensagens trocadas', value: num(vm.totalMensagens), color: 'var(--info)', desc: `${num(vm.totais.msgCanais)} em canais · ${num(vm.totais.msgDiretas)} diretas` },
    { label: 'Chamados abertos', value: num(vm.totaisSetor.recebidosAbertos), color: 'var(--chart-3)', desc: 'Pedidos de um setor a outro' },
    { label: 'Chamados concluídos', value: num(vm.totaisSetor.recebidosConcluidos), color: 'var(--success)', desc: `${num(vm.totaisSetor.recebidosCancelados)} cancelados à parte` },
    { label: 'Tempo médio de atendimento', value: vm.tempoMedioSetor, color: 'var(--chart-4)', desc: 'Só o expediente · 8h–18h, seg a sex' },
  ]

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Integração · dados reais · {PERIOD_LABEL[period]}</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ChatIcon size={24} /> Chat Interno
          </h1>
        </div>
      </div>

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
        ⚠️ As duas janelas de histórico são MUITO diferentes e a tela precisa
        dizer isso: mensagem vem desde o Mattermost (a data original veio no
        import), chamado só existe desde 21/08/2026. Sem o aviso, o filtro de
        Ano mostra um setor "sem chamado nenhum" que parece bug — foi a mesma
        armadilha das janelas desiguais da Gerência.
      */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)', padding: '10px 13px', marginBottom: 16, fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.55 }}>
        <span style={{ color: 'var(--text-mute)', flex: 'none' }}>ⓘ</span>
        <span>
          <b>Mensagem</b> tem história desde {desde ? new Date(`${desde}T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'o Mattermost'} (o
          histórico veio no import, com a data original). <b>Chamado entre setores</b> só existe
          desde <b>21/08/2026</b> — período anterior a isso aparece zerado porque a coisa não
          existia, e não porque ninguém pediu nada. O tempo conta só o <b>expediente</b> (8h–18h,
          seg a sex), então <b>1 d = 10 h</b> de trabalho.
        </span>
      </div>

      {/*
        ⚠️⚠️ O painel por setor mostra as DUAS FACES do mesmo chamado e NÃO as
        soma: "pediu" e "recebeu" são as colunas SOLICITANTE e RESPONSÁVEL da
        tela de chamados do chat. Somar dobraria a casa inteira.
      */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Chamados por departamento</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
          Duas faces do mesmo pedido: o que o setor <b>pediu</b> aos outros e o que <b>recebeu</b> para
          atender. Não se somam.
        </div>
        {vm.porSetor.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem chamados no período.</div>
        ) : (
          <SetorTable rows={vm.porSetor} totais={vm.totaisSetor} onRow={(id) => id && router.push(`/departamentos/${id}`)} />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>
        <Leaderboard
          title="Quem mais conversa" sub="Mensagens em canais, diretas e chamados"
          color="var(--info)" rows={vm.conversa.slice(0, 5)} valor={(p) => p.mensagens} router={router}
        />
        <Leaderboard
          title="Quem mais conclui chamado" sub="Responsáveis que entregaram o pedido"
          color="var(--success)" rows={vm.chamados.slice(0, 5)} valor={(p) => p.stat.chamadosConcluidos} router={router}
        />
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Atividade por usuário</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
          {vm.conversaPessoas} pessoas escreveram · {vm.chamadoPessoas} moveram chamado. ⚠️ Mensagem
          <b> não entra</b> no score — só chamado.
        </div>
        {vm.conversa.length === 0 && vm.chamados.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem atividade no período.</div>
        ) : (
          <UserTable rows={vm.pessoas.filter((p) => p.mensagens > 0 || p.chamados > 0 || p.stat.chamadosAssumidos > 0).sort((a, b) => b.mensagens - a.mensagens)} totais={vm.totais} onRow={(id) => router.push(`/funcionarios/${id}`)} />
        )}
      </div>
    </div>
  )
}

function Leaderboard({ title, sub, color, rows, valor, router }: {
  title: string; sub: string; color: string; rows: ChatPerson[]
  valor: (p: ChatPerson) => number; router: ReturnType<typeof useRouter>
}) {
  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: 'none' }} />{title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>{sub}</div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-mute)', padding: '4px 0' }}>Sem registros no período.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((p, i) => (
            <div key={p.id} className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
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
  rows: ChatSetor[]
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
  rows: ChatPerson[]
  totais: { msgCanais: number; msgDiretas: number; msgChamados: number; chamadosAbertos: number; chamadosConcluidos: number }
  onRow: (id: string) => void
}) {
  const grid = '1fr 92px 92px 84px 84px 110px'
  const cab = ['Em canais', 'Diretas', 'Abriu', 'Concluiu', 'Tempo médio']
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
            <Cel v={p.stat.msgCanais} />
            <Cel v={p.stat.msgDiretas} />
            <Cel v={p.stat.chamadosAbertos} />
            <Cel v={p.stat.chamadosConcluidos} />
            <div style={{ textAlign: 'right', fontSize: 12.5, color: p.stat.chamadosConcluidos > 0 ? 'var(--text-dim)' : 'var(--text-mute)' }}>
              {p.stat.chamadosConcluidos > 0 ? p.tempoMedio : '—'}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 6px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>Total</div>
        <Cel v={totais.msgCanais} forte color="var(--info)" />
        <Cel v={totais.msgDiretas} forte color="var(--info)" />
        <Cel v={totais.chamadosAbertos} forte color="var(--chart-3)" />
        <Cel v={totais.chamadosConcluidos} forte color="var(--success)" />
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
