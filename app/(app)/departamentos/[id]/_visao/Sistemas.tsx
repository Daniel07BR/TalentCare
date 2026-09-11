'use client'
import { useRouter } from 'next/navigation'
import { Activity, FileSpreadsheet, LifeBuoy, GraduationCap, Truck, MessagesSquare, Landmark, Radio, type LucideIcon } from 'lucide-react'
import type { DeptMetrics, PessoaRank } from '@/lib/ui/dept-period'
import { precarregarDetalhe, type ChaveDetalhe } from '../../../_visao/Detalhe'
import { Cartao, forte, suave } from '../../../_visao/ui'
import { dur, num } from './derivar'
import s from '../../../_visao/visao.module.css'
import type { ComDetalhe, Tom } from './tipos'

type Sis = { chave: ChaveDetalhe | 'servicos'; nome: string; Icone: LucideIcon; tom: Tom; tem: boolean; gente: PessoaRank[]; stats: [string, string][] }

/* Um cartão por sistema COM registro no período — a mesma regra do relatório
   atual (fonte sem nada do setor fica fora, e a tela diz quais). */
function sistemas(m: DeptMetrics): Sis[] {
  const r = m.rankings, t = (...v: number[]) => v.some((x) => x > 0)
  const sv = m.servicos
  return [
    /* ⚠️ A PLANILHA DO SETOR vem primeiro quando existe — é a fonte que o setor
       mantém à mão e reconhece. Não tem janela de detalhe: o clique leva à tela
       dela, onde também se atualiza o arquivo. */
    { chave: 'servicos', nome: 'Serviços do setor', Icone: FileSpreadsheet, tom: 'blue', tem: !!sv?.temFonte, gente: r.servicos?.gente ?? [],
      stats: [[num(sv?.concluidos ?? 0), 'Concluídos'], [num(sv?.abertos ?? 0), 'Em aberto']] },
    /* ⚠️ O WHATSAPP SAIU daqui (pedido do dono, 11/09/2026): virou o cartão próprio
       acima dos chamados entre setores (`WhatsappEChamados.tsx`), no lugar da
       avaliação mensal. */
    /* ⚠️ O CHAT INTERNO SAIU daqui (pedido do dono, 11/09/2026): o que ele tinha de
       chamado está no cartão "Chamados entre setores", que agora abre quem pediu e
       quem atendeu, de/para qual setor. Mensagem é vitrine e não entra na nota. */
    { chave: 'helpdesk', nome: 'HelpDesk', Icone: LifeBuoy, tom: 'blue', tem: t(m.helpdesk.abertos, m.helpdesk.resolvidos), gente: r.helpdesk.gente,
      stats: [[num(m.helpdesk.abertos), 'Chamados abertos'], [num(m.helpdesk.resolvidos), 'Resolvidos']] },
    { chave: 'classroom', nome: 'ClassRoom', Icone: GraduationCap, tom: 'green', tem: t(m.classroom.criados, m.classroom.assistidos, m.classroom.videos), gente: r.classroom.gente,
      stats: [[num(m.classroom.criados), 'Cursos criados'], [num(m.classroom.assistidos), 'Concluídos']] },
    { chave: 'gerencia', nome: 'Gerência · mensageria', Icone: Truck, tom: 'orange', tem: t(m.gerencia.servicos, m.gerencia.protAbertos, m.gerencia.servCriados, m.gerencia.km), gente: r.gerencia.gente,
      stats: [[num(m.gerencia.servicos), 'Serviços'], [num(m.gerencia.protAbertos), 'Protocolos']] },
    { chave: 'consultoria', nome: 'Consultoria Plus', Icone: MessagesSquare, tom: 'purple', tem: t(m.consultoria.estudos, m.consultoria.chamados, m.consultoria.mensagens, m.consultoria.comentarios), gente: r.consultoria.gente,
      stats: [[num(m.consultoria.estudos), 'Estudos'], [num(m.consultoria.chamados), 'Chamados']] },
    { chave: 'cide', nome: 'CIDE', Icone: Landmark, tom: 'red', tem: t(m.cide.atividades), gente: r.cide.gente,
      stats: [[num(m.cide.atividades), 'Empresas atendidas']] },
    /* ⚠️ Rádio sem lista de pessoas: escuta não é trabalho, e um pódio de quem
       mais ouve numa tela que decide aumento é o que o relatório já recusou. */
    { chave: 'radio', nome: 'Rádio Itamarathy', Icone: Radio, tom: 'blue', tem: t(m.radio.horas, m.radio.sessoes), gente: [],
      stats: [[num(m.radio.horas), 'horas ouvidas'], [num(m.radio.sessoes), 'sessões']] },
  ]
}

export function Sistemas({ m, abrir }: ComDetalhe) {
  const router = useRouter()
  const todos = sistemas(m)
  const com = todos.filter((x) => x.tem)
  const sem = todos.filter((x) => !x.tem).map((x) => x.nome)
  return (
    <Cartao titulo="Sistemas e produtividade" Icone={Activity} sub={`Uso dos sistemas no período · ${m.label} · clique num sistema para o detalhe`}>
      <div className={s.sistemas}>
        {com.map((x) => (
          <button key={x.chave} type="button"
            onMouseEnter={x.chave !== 'servicos' ? () => precarregarDetalhe(x.chave as ChaveDetalhe) : undefined}
            onFocus={x.chave !== 'servicos' ? () => precarregarDetalhe(x.chave as ChaveDetalhe) : undefined}
            onClick={() => (x.chave === 'servicos' ? router.push(`/servicos?setor=${m.setor.id}`) : abrir(x.chave))}
            title={x.chave === 'servicos' ? 'Abrir a planilha de serviços do setor' : `Abrir o resumo de ${x.nome} só com este setor`}
            style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', gap: 10, padding: 14, background: 'var(--n-card)', border: '1px solid var(--n-border)', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: suave(x.tom), color: forte(x.tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><x.Icone size={15} /></span>
              <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.nome}</span>
            </span>
            {x.gente.length > 0 && (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {x.gente.slice(0, 3).map((p, i) => (
                  <li key={p.id} style={{ display: 'flex', gap: 8, fontSize: 11.5 }}>
                    <span style={{ color: 'var(--n-text-3)', width: 10 }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</span>
                    <b className="cnum" style={{ color: forte(x.tom) }}>{num(p.valor)}</b>
                  </li>
                ))}
              </ol>
            )}
            <span style={{ display: 'grid', gridTemplateColumns: `repeat(${x.stats.length}, 1fr)`, gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--n-border-2)' }}>
              {x.stats.map(([v, r]) => (
                <span key={r}>
                  <span className="cnum" style={{ display: 'block', fontSize: x.gente.length ? 15 : 22, fontWeight: 800, color: forte(x.tom) }}>{v}</span>
                  <span style={{ display: 'block', fontSize: 10.5, color: 'var(--n-text-3)' }}>{r}</span>
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
      {com.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Nenhuma atividade registrada nos sistemas medidos neste período.</div>}
      {sem.length > 0 && com.length > 0 && (
        <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 10 }}>Sem registro deste setor no período: {sem.join(', ')}.</div>
      )}
    </Cartao>
  )
}
