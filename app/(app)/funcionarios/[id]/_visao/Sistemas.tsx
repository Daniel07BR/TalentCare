'use client'
import { Activity, LifeBuoy, GraduationCap, Truck, MessagesSquare, Landmark, MessageCircle, MessageSquareText, type LucideIcon } from 'lucide-react'
import type { EmployeeMetrics } from '@/lib/ui/employee-period'
import { Cartao, forte, suave } from '../../../_visao/ui'
import type { Tom } from '../../../_visao/tipos'
import { num } from './derivar'
import f from './ficha.module.css'

/* ============================================================
   O QUE OS SISTEMAS REGISTRARAM — UMA ilustração por número (14/09/2026).

   ⚠️⚠️ Pedido do dono, sobre a primeira prévia: o mesmo dado aparecia em DOIS
   formatos — o total com as partes em pílulas, as barras "Atividade por
   sistema" e, embaixo, os cartões. Ficaram só os cartões (os mais
   detalhados), e só dos sistemas COM registro no período; o total de
   concluídas já é o primeiro azulejo do topo.

   ⚠️ E cada sistema com um desenho PRÓPRIO, escolhido pela pergunta que o
   número responde — não uma fileira de cartões iguais:
   - WhatsApp: anel de finalizados ÷ abertos (quanto do que entrou, saiu).
   - HelpDesk: duas barras lado a lado, SEM taxa (quem abre ≠ quem resolve).
   - ClassRoom: colunas consumir × produzir.
   - Gerência na rua: o km em destaque, com os outros números em linha.
   - Gerência escritório: barras horizontais da demanda.
   - Chat chamados: barra de progresso concluídos de assumidos.
   - Chat conversa: barra 100% de onde a conversa acontece.
   - CIDE: um número só, grande (é o que ele tem a dizer).
   - Consultoria: lista com as quatro contagens.
   ============================================================ */

function Titulo({ nome, sub, Icone, tom }: { nome: string; sub?: string; Icone: LucideIcon; tom: Tom }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, background: suave(tom), color: forte(tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icone size={16} strokeWidth={2.2} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-text)' }}>{nome}</div>
        {sub && <div style={{ fontSize: 10.5, color: 'var(--n-text-3)' }}>{sub}</div>}
      </div>
    </div>
  )
}

function Bloco({ children, className, fundo }: { children: React.ReactNode; className?: string; fundo?: string }) {
  return (
    <div className={className} style={{ background: fundo ?? 'var(--n-card)', border: '1px solid var(--n-border)', borderRadius: 14, padding: 16, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  )
}

const Rotulo = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, color: 'var(--n-text-2)', lineHeight: 1.35 }}>{children}</div>
)
const Grande = ({ children, cor, tam = 22 }: { children: React.ReactNode; cor?: string; tam?: number }) => (
  <div className="cnum" style={{ fontSize: tam, fontWeight: 800, letterSpacing: '-.6px', lineHeight: 1.1, color: cor ?? 'var(--n-text)' }}>{children}</div>
)

/** Anel de fração, com o percentual no meio. */
function Anel({ fracao, tom, tam = 104 }: { fracao: number; tom: Tom; tam?: number }) {
  const r = (tam - 14) / 2, c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, fracao))
  return (
    <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} role="img" aria-label={`${Math.round(p * 100)}%`} style={{ flex: 'none' }}>
      <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={suave(tom)} strokeWidth={12} />
      <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={forte(tom)} strokeWidth={12} strokeLinecap="round"
        strokeDasharray={`${c * p} ${c}`} transform={`rotate(-90 ${tam / 2} ${tam / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 20, fontWeight: 800, fill: 'var(--n-text)' }}>{Math.round(p * 100)}%</text>
    </svg>
  )
}

/** Barras horizontais, cada uma com a cor e o valor na ponta. */
function Barras({ linhas }: { linhas: { rot: string; n: number; tom: Tom }[] }) {
  const max = Math.max(1, ...linhas.map((l) => l.n))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {linhas.map((l) => (
        <div key={l.rot}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <Rotulo>{l.rot}</Rotulo>
            <b className="cnum" style={{ fontSize: 13, color: forte(l.tom) }}>{num(l.n)}</b>
          </div>
          <div style={{ height: 9, borderRadius: 20, background: 'var(--n-card-2)', overflow: 'hidden' }}>
            <div className="cbar" style={{ height: '100%', width: `${(l.n / max) * 100}%`, minWidth: l.n > 0 ? 6 : 0, background: forte(l.tom), borderRadius: 20 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Colunas verticais lado a lado. */
function Colunas({ colunas, alto = 92 }: { colunas: { rot: string; n: number; tom: Tom }[]; alto?: number }) {
  const max = Math.max(1, ...colunas.map((c) => c.n))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colunas.length}, minmax(0, 1fr))`, gap: 12, alignItems: 'end' }}>
      {colunas.map((c) => (
        <div key={c.rot} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <b className="cnum" style={{ fontSize: 15, color: forte(c.tom) }}>{num(c.n)}</b>
          <div style={{ width: '100%', maxWidth: 44, height: alto, display: 'flex', alignItems: 'flex-end', background: 'var(--n-card-2)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ width: '100%', height: `${(c.n / max) * 100}%`, minHeight: c.n > 0 ? 4 : 0, background: forte(c.tom), borderRadius: 8 }} />
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--n-text-2)', textAlign: 'center', lineHeight: 1.25 }}>{c.rot}</div>
        </div>
      ))}
    </div>
  )
}

/** Barra 100% com legenda — "de onde vem o todo". */
function Empilhada({ partes }: { partes: { rot: string; n: number; tom: Tom }[] }) {
  const total = partes.reduce((a, p) => a + p.n, 0) || 1
  const vis = partes.filter((p) => p.n > 0)
  return (
    <>
      <div style={{ display: 'flex', height: 14, borderRadius: 20, overflow: 'hidden', gap: 2 }}>
        {vis.map((p) => <div key={p.rot} title={`${p.rot}: ${num(p.n)}`} style={{ width: `${(p.n / total) * 100}%`, background: forte(p.tom) }} />)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 10 }}>
        {vis.map((p) => (
          <div key={p.rot} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: forte(p.tom) }} />
            <span style={{ fontSize: 11.5, color: 'var(--n-text-2)' }}>{p.rot}</span>
            <b className="cnum" style={{ fontSize: 12.5, color: 'var(--n-text)' }}>{num(p.n)}</b>
            <span style={{ fontSize: 10.5, color: 'var(--n-text-3)' }}>{Math.round((p.n / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </>
  )
}

const Nota = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 'auto', paddingTop: 10, lineHeight: 1.45 }}>{children}</div>
)

export function Sistemas({ m, periodo }: { m: EmployeeMetrics | null; periodo: string }) {
  if (!m) {
    return (
      <Cartao titulo="O que os sistemas registraram" Icone={Activity} sub={`Por sistema · ${periodo}`}>
        <div style={{ fontSize: 12.5, color: 'var(--n-text-3)' }}>Carregando o período…</div>
      </Cartao>
    )
  }
  const { whatsapp: wpp, helpdesk: hd, classroom: cr, gerencia: gr, chat: ch, cide, consultoria: co } = m
  const blocos: { chave: string; no: React.ReactNode }[] = []
  const sem: string[] = []
  const add = (tem: boolean, nome: string, chave: string, no: () => React.ReactNode) => {
    if (tem) blocos.push({ chave, no: no() }); else sem.push(nome)
  }

  add(wpp.has && wpp.abertos + wpp.finalizados > 0, 'WhatsApp', 'wpp', () => (
    <Bloco>
      <Titulo nome="WhatsApp" sub="atendimentos" Icone={MessageCircle} tom="whats" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Anel fracao={wpp.abertos ? wpp.finalizados / wpp.abertos : 0} tom="whats" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <div><Grande cor="var(--n-whats)">{num(wpp.finalizados)}</Grande><Rotulo>finalizados de {num(wpp.abertos)} abertos</Rotulo></div>
          <div><Grande tam={17}>{wpp.tempoMedio}</Grande><Rotulo>tempo médio por atendimento</Rotulo></div>
        </div>
      </div>
    </Bloco>
  ))

  add(hd.has && hd.opened + hd.resolved > 0, 'HelpDesk', 'hd', () => (
    <Bloco>
      <Titulo nome="HelpDesk" sub="chamados" Icone={LifeBuoy} tom="blue" />
      <Barras linhas={[{ rot: 'Abertos por ela', n: hd.opened, tom: 'blue' }, { rot: hd.formalized > 0 ? `Resolvidos · ${hd.formalized} formalizados` : 'Resolvidos por ela', n: hd.resolved, tom: 'green' }]} />
      <div style={{ marginTop: 12 }}><Grande tam={17}>{hd.tempoMedio}</Grande><Rotulo>tempo médio de resolução</Rotulo></div>
      {/* ⚠️ Sem anel: quem abre é a casa toda e quem resolve é o T.I. */}
      <Nota>Sem taxa de resolução: abrir e resolver não são a mesma fila.</Nota>
    </Bloco>
  ))

  add(cr.courses + cr.created + cr.videos > 0, 'ClassRoom', 'cr', () => (
    <Bloco>
      <Titulo nome="ClassRoom" sub="aprender e ensinar" Icone={GraduationCap} tom="green" />
      <Colunas colunas={[
        { rot: 'Vídeos assistidos', n: cr.videos, tom: 'blue' },
        { rot: 'Cursos concluídos', n: cr.courses, tom: 'green' },
        { rot: 'Cursos criados', n: cr.created, tom: 'purple' },
      ]} />
      {/* ⚠️ Consumir e produzir separados: curso criado pesa mais e some na soma. */}
      {cr.created > 0 && <Nota>Criar curso vale mais que concluir: ensinar alguém conta como colaboração.</Nota>}
    </Bloco>
  ))

  add(gr.hasSaida, 'Gerência na rua', 'grs', () => (
    <Bloco fundo="linear-gradient(160deg, var(--n-orange-soft), var(--n-card) 60%)">
      <Titulo nome="Gerência · na rua" sub="saídas externas" Icone={Truck} tom="orange" />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <Grande cor="var(--n-orange)" tam={38}>{num(gr.km)}</Grande><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-text-2)' }}>km rodados</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px', marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--n-border)' }}>
        <div><Grande tam={18}>{num(gr.servicos)}</Grande><Rotulo>serviços entregues</Rotulo></div>
        <div><Grande tam={18}>{num(gr.saidas)}</Grande><Rotulo>saídas</Rotulo></div>
        <div><Grande tam={18}>{num(Math.round(gr.jornadaMin / 60))}h</Grande><Rotulo>jornada</Rotulo></div>
        {gr.viagens > 0 && <div><Grande tam={18} cor="var(--n-blue)">{num(gr.viagens)}</Grande><Rotulo>viagens fora do estado</Rotulo></div>}
      </div>
    </Bloco>
  ))

  add(gr.hasEscritorio, 'Gerência escritório', 'gre', () => (
    <Bloco>
      <Titulo nome="Gerência · escritório" sub="demanda do escritório" Icone={Truck} tom="orange" />
      <Barras linhas={[
        { rot: 'Serviços criados', n: gr.servCriados, tom: 'orange' },
        { rot: 'Protocolos abertos', n: gr.protAbertos, tom: 'blue' },
        { rot: 'Aprovações', n: gr.protAprovados, tom: 'green' },
        ...(gr.datasAlteradas > 0 ? [{ rot: 'Datas alteradas', n: gr.datasAlteradas, tom: 'amber' as Tom }] : []),
      ]} />
      {(gr.reagendados > 0 || gr.cancelados > 0) && <Nota>{gr.reagendados} reagendados · {gr.cancelados} cancelados</Nota>}
    </Bloco>
  ))

  add(ch.hasChamado, 'Chamados do Chat', 'chc', () => {
    const base = ch.chamadosAssumidos || 0
    return (
      <Bloco>
        <Titulo nome="Chat Interno · chamados" sub="entre setores" Icone={MessageSquareText} tom="pink" />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <Grande cor="var(--n-green)" tam={30}>{num(ch.chamadosConcluidos)}</Grande>
          <span style={{ fontSize: 12, color: 'var(--n-text-2)' }}>{base ? `concluídos de ${num(base)} assumidos` : 'concluídos'}</span>
        </div>
        {base > 0 && (
          <div style={{ height: 10, borderRadius: 20, background: 'var(--n-green-soft)', overflow: 'hidden', margin: '10px 0 4px' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (ch.chamadosConcluidos / base) * 100)}%`, background: 'var(--n-green)', borderRadius: 20 }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 22, marginTop: 10 }}>
          <div><Grande tam={17} cor="var(--n-pink)">{num(ch.chamadosAbertos)}</Grande><Rotulo>pedidos que fez</Rotulo></div>
          {ch.chamadosConcluidos > 0 && <div><Grande tam={17}>{ch.tempoMedio}</Grande><Rotulo>tempo médio · expediente</Rotulo></div>}
        </div>
      </Bloco>
    )
  })

  add(ch.hasConversa, 'Conversa do Chat', 'chm', () => (
    <Bloco>
      <Titulo nome="Chat Interno · conversa" sub="não entra no score" Icone={MessagesSquare} tom="purple" />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
        <Grande cor="var(--n-purple)" tam={30}>{num(ch.mensagens)}</Grande><span style={{ fontSize: 12, color: 'var(--n-text-2)' }}>mensagens</span>
      </div>
      <Empilhada partes={[
        { rot: 'Em canais', n: ch.msgCanais, tom: 'purple' },
        { rot: 'Diretas', n: ch.msgDiretas, tom: 'pink' },
        { rot: 'Em chamados', n: ch.msgChamados, tom: 'blue' },
      ]} />
      {/* ⚠️ O aviso fica junto do número: conversa é contexto, não desempenho. */}
      <Nota>Só a contagem chega aqui — o conteúdo nunca sai do chat.</Nota>
    </Bloco>
  ))

  add(cide.has && cide.atividades > 0, 'CIDE', 'cide', () => (
    <Bloco fundo="linear-gradient(160deg, var(--n-red-soft), var(--n-card) 65%)">
      <Titulo nome="CIDE" sub="cadastro de empresas" Icone={Landmark} tom="red" />
      <div style={{ margin: 'auto 0', display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <Grande cor="var(--n-red)" tam={44}>{num(cide.atividades)}</Grande>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-text-2)', lineHeight: 1.25 }}>{cide.atividades === 1 ? 'empresa atendida' : 'empresas atendidas'}</span>
      </div>
    </Bloco>
  ))

  add(co.has && co.total > 0, 'Consultoria Plus', 'co', () => (
    <Bloco>
      <Titulo nome="Consultoria Plus" sub={`${num(co.total)} atividades`} Icone={MessagesSquare} tom="purple" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 16px' }}>
        {([['Estudos', co.studies, 'purple'], ['Chamados', co.tickets, 'blue'], ['Mensagens', co.messages, 'pink'], ['Comentários', co.comments, 'amber']] as [string, number, Tom][]).map(([rot, n, t]) => (
          <div key={rot} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: forte(t) }} />
            <div><Grande tam={18}>{num(n)}</Grande><Rotulo>{rot}</Rotulo></div>
          </div>
        ))}
      </div>
    </Bloco>
  ))

  return (
    <Cartao titulo="O que os sistemas registraram" Icone={Activity} sub={`Só os sistemas com registro · ${periodo}`}>
      {blocos.length === 0 ? (
        /* ⚠️ Silêncio nos sistemas não é inatividade. */
        <div style={{ fontSize: 12.5, color: 'var(--n-text-2)', background: 'var(--n-card-2)', borderRadius: 10, padding: '12px 14px' }}>
          Nenhum sistema medido registrou atividade desta pessoa no período — o trabalho dela pode não passar por eles.
        </div>
      ) : (
        <div className={f.sistemas}>{blocos.map((b) => <div key={b.chave} style={{ display: 'contents' }}>{b.no}</div>)}</div>
      )}
      {sem.length > 0 && blocos.length > 0 && (
        <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 10 }}>Sem registro no período: {sem.join(', ')}.</div>
      )}
    </Cartao>
  )
}
