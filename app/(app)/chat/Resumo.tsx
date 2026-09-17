'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useChatPeriod } from '@/lib/ui/chat-period'
import { usePeriod } from '@/lib/ui/period'
import { useRecorteSetor, useEmJanela } from '@/lib/ui/recorte-setor'
import { chatVM, type ChatPerson } from '@/lib/mock/chat'
import Avatar from '../Avatar'
import { usePainelDaPessoa } from '../PainelDaPessoa'
import EsqueletoResumo from '../EsqueletoResumo'

const ChatIcon = ({ size = 17, color = 'var(--chart-3)' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z" /><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
  </svg>
)

const num = (n: number) => n.toLocaleString('pt-BR')

/* ⚠️⚠️ SÓ AS MENSAGENS desde 17/09/2026. Os chamados que esta tela mostrava
   mudaram de casa em 16/09 (Chat → Fluxo) e o painel deles foi junto, para
   `app/(app)/fluxo/Resumo.tsx`. Aqui não ficou nem cópia nem número velho: uma
   tabela parada no dia da migração é pior que tabela nenhuma. */
export default function ChatResumo() {
  const abrirPessoa = usePainelDaPessoa()
  /* Aberto de dentro do relatório de um setor? Então some o que compara
     setores entre si — com um setor só, é uma barra de 100%. */
  const setor = useRecorteSetor()
  /* Numa janela (do setor OU da casa inteira, no painel principal) o cabeçalho
     sai — a janela já tem título. A comparação entre setores só sai com setor. */
  const emJanela = useEmJanela()
  const router = useRouter()
  const data = useTalentData()
  const { period, label } = usePeriod()
  const { map, desde, loading } = useChatPeriod()
  const vm = chatVM(data, map ?? undefined)

  const kpis = [
    { label: 'Mensagens trocadas', value: num(vm.totalMensagens), color: 'var(--info)', desc: `${num(vm.totais.msgCanais)} em canais · ${num(vm.totais.msgDiretas)} diretas` },
    { label: 'Em canais', value: num(vm.totais.msgCanais), color: 'var(--chart-3)', desc: 'Público e privado' },
    { label: 'Diretas', value: num(vm.totais.msgDiretas), color: 'var(--chart-5)', desc: 'Conversa direta e grupo' },
    { label: 'Quem escreveu', value: num(vm.conversaPessoas), color: 'var(--chart-4)', desc: 'Pessoas com mensagem no período' },
  ]

  /* ⚠️ Na janela do setor, nada de conta com o ACUMULADO enquanto o período
     não chega (o número errado aparecia por um instante e trocava): o
     esqueleto tem a forma da página, e ela entra de cima para baixo depois. */
  if (emJanela && loading && !map) return <EsqueletoResumo />

  return (
    <div className="tc-anim" style={emJanela ? undefined : { maxWidth: 1280, margin: '0 auto' }}>
      {!emJanela && (
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Integração · dados reais · {label}</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ChatIcon size={24} /> Chat Interno
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
        ⚠️ A janela do histórico é maior que o sistema: a mensagem vem desde o
        Mattermost, com a data original do import. E os CHAMADOS não estão mais
        aqui — a tela diz para onde foram, senão quem procurava por eles acha
        que o número sumiu.
      */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)', padding: '10px 13px', marginBottom: 16, fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.55 }}>
        <span style={{ color: 'var(--text-mute)', flex: 'none' }}>ⓘ</span>
        <span>
          <b>Mensagem</b> tem história desde {desde ? new Date(`${desde}T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'o Mattermost'} (o
          histórico veio no import, com a data original). Os <b>chamados entre setores</b> saíram do
          Chat em <b>16/09/2026</b> e agora vivem no <b>Fluxo</b> — os números deles estão em{' '}
          <b>Sistemas → Fluxo</b>. ⚠️ Mensagem <b>não entra no score</b>: ela aparece aqui e na
          ficha, e o que pontua é o pedido feito e entregue.
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Leaderboard
          title="Quem mais conversa" sub="Mensagens em canais, diretas e dentro de chamado"
          color="var(--info)" rows={vm.conversa.slice(0, 8)} valor={(p) => p.mensagens}
        />
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Atividade por usuário</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
          {vm.conversaPessoas} pessoas escreveram no período. ⚠️ Mensagem <b>não entra</b> no score —
          o que pontua é o chamado, e ele está no Fluxo.
        </div>
        {vm.conversa.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem atividade no período.</div>
        ) : (
          <UserTable rows={vm.conversa} totais={vm.totais} onRow={(id) => abrirPessoa('chat', id)} />
        )}
      </div>
    </div>
  )
}

function Leaderboard({ title, sub, color, rows, valor }: {
  title: string; sub: string; color: string; rows: ChatPerson[]
  valor: (p: ChatPerson) => number
}) {
  const abrirPessoa = usePainelDaPessoa()
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
            <div key={p.id} className="tc-row" onClick={() => abrirPessoa('chat', p.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
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

function UserTable({ rows, totais, onRow }: {
  rows: ChatPerson[]
  totais: { msgCanais: number; msgDiretas: number; msgChamados: number }
  onRow: (id: string) => void
}) {
  const grid = '1fr 100px 100px 116px'
  const cab = ['Em canais', 'Diretas', 'Em chamados']
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
            <Cel v={p.stat.msgChamados} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 6px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>Total</div>
        <Cel v={totais.msgCanais} forte color="var(--info)" />
        <Cel v={totais.msgDiretas} forte color="var(--info)" />
        <Cel v={totais.msgChamados} forte color="var(--info)" />
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
