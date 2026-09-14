'use client'
import { Activity, LifeBuoy, GraduationCap, Truck, MessagesSquare, Landmark, MessageCircle, MessageSquareText, type LucideIcon } from 'lucide-react'
import type { EmployeeMetrics } from '@/lib/ui/employee-period'
import type { EmployeeVM } from '@/lib/mock/employee'
import { Cartao, Mini, forte, suave } from '../../../_visao/ui'
import type { Tom } from '../../../_visao/tipos'
import { concluidas, num, porSistema, tomDoSistema } from './derivar'
import f from './ficha.module.css'

const ICONE: Record<string, LucideIcon> = {
  HelpDesk: LifeBuoy, ClassRoom: GraduationCap, WhatsApp: MessageCircle, 'Consultoria Plus': MessagesSquare,
  CIDE: Landmark, 'Gerência': Truck, 'Chat Interno': MessageSquareText,
}

function Quadrado({ Icone, tom, tam = 28 }: { Icone: LucideIcon; tom: Tom; tam?: number }) {
  return (
    <span style={{ width: tam, height: tam, borderRadius: 8, background: suave(tom), color: forte(tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <Icone size={Math.round(tam * 0.55)} strokeWidth={2.2} />
    </span>
  )
}

/** Um cartão por sistema com registro — números em azulejos pequenos. */
function CartaoSistema({ nome, Icone, tom, sub, children, aviso }: { nome: string; Icone: LucideIcon; tom: Tom; sub?: string; children: React.ReactNode; aviso?: string }) {
  return (
    <div style={{ background: 'var(--n-card)', border: '1px solid var(--n-border)', borderTop: `3px solid ${forte(tom)}`, borderRadius: 12, padding: 14, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
        <Quadrado Icone={Icone} tom={tom} tam={30} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-text)' }}>{nome}</div>
          {sub && <div style={{ fontSize: 10.5, color: 'var(--n-text-3)' }}>{sub}</div>}
        </div>
      </div>
      <div className={f.minis}>{children}</div>
      {aviso && <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 9, lineHeight: 1.45 }}>{aviso}</div>}
    </div>
  )
}

export function Sistemas({ vm, m, periodo }: { vm: EmployeeVM; m: EmployeeMetrics | null; periodo: string }) {
  const { total, partes } = concluidas(m)
  const { linhas, max } = porSistema(vm, m)
  const wpp = m?.whatsapp, hd = m?.helpdesk, gr = m?.gerencia, ch = m?.chat, cr = m?.classroom
  const cartoes: React.ReactNode[] = []

  if (wpp?.has) cartoes.push(
    <CartaoSistema key="wpp" nome="WhatsApp" Icone={MessageCircle} tom="whats" sub="atendimentos">
      <Mini valor={num(wpp.abertos)} rotulo="Abertos" tom="whats" />
      {/* ⚠️ A razão finalizados ÷ abertos diz algo: quanto do que entrou, saiu. */}
      <Mini valor={num(wpp.finalizados)} rotulo={wpp.abertos > 0 ? `Finalizados · ${Math.round((wpp.finalizados / wpp.abertos) * 100)}%` : 'Finalizados'} tom="green" />
      <Mini valor={wpp.tempoMedio} rotulo="Tempo médio" />
    </CartaoSistema>,
  )
  if (hd) cartoes.push(hd.has ? (
    <CartaoSistema key="hd" nome="HelpDesk" Icone={LifeBuoy} tom="blue" sub="chamados"
      aviso="Sem taxa de resolução: quem abre é a casa toda e quem resolve é o T.I — não é a mesma fila.">
      <Mini valor={num(hd.opened)} rotulo="Abertos" tom="blue" />
      <Mini valor={num(hd.resolved)} rotulo={hd.formalized > 0 ? `Resolvidos · ${hd.formalized} formaliz.` : 'Resolvidos'} tom="green" />
      <Mini valor={hd.tempoMedio} rotulo="Tempo médio" />
    </CartaoSistema>
  ) : null)
  if (cr && cr.total + cr.videos > 0) cartoes.push(
    <CartaoSistema key="cr" nome="ClassRoom" Icone={GraduationCap} tom="green" sub="cursos e vídeos">
      <Mini valor={num(cr.courses)} rotulo="Cursos concluídos" tom="green" />
      <Mini valor={num(cr.created)} rotulo="Cursos criados" tom="blue" />
      <Mini valor={num(cr.videos)} rotulo="Vídeos assistidos" />
    </CartaoSistema>,
  )
  if (gr?.hasSaida) cartoes.push(
    <CartaoSistema key="grs" nome="Gerência · na rua" Icone={Truck} tom="orange" sub="saídas externas">
      <Mini valor={num(gr.servicos)} rotulo="Serviços entregues" tom="orange" />
      <Mini valor={num(gr.km)} rotulo="Km rodados" />
      <Mini valor={num(gr.saidas)} rotulo="Saídas" />
      {gr.viagens > 0 && <Mini valor={num(gr.viagens)} rotulo="Viagens" tom="blue" />}
      <Mini valor={`${num(Math.round(gr.jornadaMin / 60))}h`} rotulo="Jornada" />
    </CartaoSistema>,
  )
  if (gr?.hasEscritorio) cartoes.push(
    <CartaoSistema key="gre" nome="Gerência · escritório" Icone={Truck} tom="orange" sub="demanda do escritório">
      <Mini valor={num(gr.protAbertos)} rotulo="Protocolos abertos" tom="blue" />
      <Mini valor={num(gr.protAprovados)} rotulo="Aprovações" />
      <Mini valor={num(gr.servCriados)} rotulo="Serviços criados" tom="orange" />
      {gr.datasAlteradas > 0 && <Mini valor={num(gr.datasAlteradas)} rotulo="Datas alteradas" />}
      {(gr.reagendados > 0 || gr.cancelados > 0) && <Mini valor={`${gr.reagendados} / ${gr.cancelados}`} rotulo="Reagend. / cancel." />}
    </CartaoSistema>,
  )
  if (ch?.hasChamado) cartoes.push(
    <CartaoSistema key="chc" nome="Chat Interno · chamados" Icone={MessageSquareText} tom="pink" sub="entre setores">
      <Mini valor={num(ch.chamadosConcluidos)} rotulo={ch.chamadosAssumidos ? `Concluídos de ${ch.chamadosAssumidos} assumidos` : 'Concluídos'} tom="green" />
      <Mini valor={num(ch.chamadosAbertos)} rotulo="Pedidos que fez" tom="pink" />
      {ch.chamadosConcluidos > 0 && <Mini valor={ch.tempoMedio} rotulo="Tempo médio · expediente" />}
    </CartaoSistema>,
  )
  if (ch?.hasConversa) cartoes.push(
    /* ⚠️ O aviso fica JUNTO do número: conversa é contexto, não desempenho. */
    <CartaoSistema key="chm" nome="Chat Interno · conversa" Icone={MessagesSquare} tom="purple" sub="não entra no score"
      aviso="Só a contagem chega aqui — o conteúdo das mensagens nunca sai do chat.">
      <Mini valor={num(ch.mensagens)} rotulo="Mensagens" tom="purple" />
      <Mini valor={num(ch.msgCanais)} rotulo="Em canais" />
      <Mini valor={num(ch.msgDiretas)} rotulo="Diretas" />
    </CartaoSistema>,
  )
  const visiveis = cartoes.filter(Boolean)

  return (
    <Cartao titulo="O que os sistemas registraram" Icone={Activity} sub={`Por fonte · ${periodo}`}>
      {/* Concluídas: o total e de onde veio, cada parte na cor do seu sistema. */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'stretch', marginBottom: 20 }}>
        <div style={{ flex: 'none', minWidth: 160, background: 'var(--n-green-soft)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="cnum" style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', color: 'var(--n-green)', lineHeight: 1.05 }}>{total == null ? '—' : num(total)}</div>
          <div style={{ fontSize: 12, color: 'var(--n-text-2)', marginTop: 3 }}>Atividades concluídas</div>
        </div>
        <div style={{ flex: 1, minWidth: 220, display: 'flex', flexWrap: 'wrap', gap: 7, alignContent: 'center' }}>
          {total == null ? <span style={{ fontSize: 12.5, color: 'var(--n-text-3)' }}>Carregando o período…</span>
            : partes.length === 0 ? <span style={{ fontSize: 12.5, color: 'var(--n-text-3)' }}>Sem atividades concluídas neste período.</span>
            : partes.map((p) => {
              const t = tomDoSistema(p.sys)
              return (
                <span key={p.label} title={p.sys} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, fontSize: 12, padding: '5px 10px', borderRadius: 20, background: suave(t), color: 'var(--n-text-2)' }}>
                  <b className="cnum" style={{ color: forte(t), fontSize: 13 }}>{num(p.n)}</b> {p.label}
                </span>
              )
            })}
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-text)', marginBottom: 12 }}>Atividade por sistema</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: visiveis.length ? 22 : 0 }}>
        {linhas.map((l) => {
          const Ic = ICONE[l.sys] ?? Activity
          return (
            <div key={l.sys} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Quadrado Icone={Ic} tom={l.tom} tam={24} />
              <span style={{ width: 128, fontSize: 12.5, color: 'var(--n-text-2)', flex: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {l.sys}{!l.real && <span style={{ fontSize: 9.5, color: 'var(--n-text-3)' }}> · simulado</span>}
              </span>
              <div style={{ flex: 1, height: 10, background: 'var(--n-card-2)', border: '1px solid var(--n-border-2)', borderRadius: 20, overflow: 'hidden' }}>
                <div className="cbar" style={{ height: '100%', width: l.value == null ? '0%' : `${(l.value / max) * 100}%`, background: forte(l.tom), borderRadius: 20, opacity: l.real ? 1 : 0.45 }} />
              </div>
              <span className="cnum" style={{ width: 44, textAlign: 'right', fontSize: 13, fontWeight: 800, color: l.value == null ? 'var(--n-text-3)' : 'var(--n-text)' }}>{l.value == null ? '—' : num(l.value)}</span>
            </div>
          )
        })}
      </div>

      {visiveis.length > 0 && <div className={f.sistemas}>{visiveis}</div>}
    </Cartao>
  )
}
