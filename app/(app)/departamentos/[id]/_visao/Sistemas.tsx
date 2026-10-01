'use client'
import { useEffect, useState } from 'react'
import { Activity, CalendarCheck, FileSpreadsheet, LifeBuoy, GraduationCap, Truck, MessagesSquare, Landmark, Radio, type LucideIcon } from 'lucide-react'
import type { DeptMetrics, PessoaRank } from '@/lib/ui/dept-period'
import { precarregarDetalhe, type ChaveDetalhe } from '../../../_visao/Detalhe'
import { Cartao, forte, suave } from '../../../_visao/ui'
import { dur, num } from './derivar'
import s from '../../../_visao/visao.module.css'
import type { ComDetalhe, Tom } from './tipos'
import { textoDoLote, type Lote } from '@/lib/acessorias-lote'
import LogoFluxo from '../../../LogoFluxo'

type Sis = { chave: ChaveDetalhe; nome: string; Icone: LucideIcon; tom: Tom; tem: boolean; gente: PessoaRank[]; stats: [string, string][]; logo?: boolean }

/* Um cartão por sistema COM registro no período — a mesma regra do relatório
   atual (fonte sem nada do setor fica fora, e a tela diz quais). */
function sistemas(m: DeptMetrics): Sis[] {
  const r = m.rankings, t = (...v: number[]) => v.some((x) => x > 0)
  const sv = m.servicos
  return [
    /* ⚠️ A PLANILHA DO SETOR vem primeiro quando existe — é a fonte que o setor
       mantém à mão e reconhece. ⚠️ Desde 01/10/2026 ela ABRE A JANELA como os
       outros cartões (o Legal achou que o clique estava quebrado quando ele
       levava direto à tela da planilha); a planilha fica a um botão, lá dentro. */
    { chave: 'servicos', nome: 'Serviços do setor', Icone: FileSpreadsheet, tom: 'blue', tem: !!sv?.temFonte, gente: r.servicos?.gente ?? [],
      stats: [[num(sv?.concluidos ?? 0), 'Concluídos'], [num(sv?.abertos ?? 0), 'Em aberto']] },
    /* ⚠️ O WHATSAPP SAIU daqui (pedido do dono, 11/09/2026): virou o cartão próprio
       acima dos chamados entre setores (`WhatsappEChamados.tsx`), no lugar da
       avaliação mensal. */
    /* ⚠️ O CHAT INTERNO SAIU daqui (pedido do dono, 11/09/2026): o que ele tinha de
       chamado está no cartão "Chamados entre setores", que agora abre quem pediu e
       quem atendeu, de/para qual setor. Mensagem é vitrine e não entra na nota. */
    /* ⚠️⚠️ O FLUXO FALTAVA AQUI (Daniel, 01/10/2026: "os usuários do T.I atendem
       diversos chamados por meio do Fluxo, verifique por que isso não está sendo
       computado"). O Chat saiu desta lista em 11/09 e o Fluxo, que herdou os
       chamados em 17/09, nunca entrou — a rota já mandava `rankings.fluxo` e
       ninguém desenhava. O cartão "Chamados entre setores" mostra as duas faces
       do SETOR; este mostra QUEM atendeu, como os outros sistemas. */
    { chave: 'fluxo', nome: 'Fluxo', Icone: Activity, logo: true, tom: 'purple', tem: t(m.fluxo.chamadosAbertos, m.fluxo.chamadosConcluidos, m.fluxo.tarefasAbertas, m.fluxo.tarefasConcluidas), gente: r.fluxo.gente,
      stats: [[num(m.fluxo.chamadosConcluidos), 'Chamados concluídos'], [num(m.fluxo.tarefasConcluidas), 'Tarefas concluídas']] },
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

/* ============================================================
   ACESSÓRIAS (30/09/2026) — só VOLUME, e fora da nota.
   Decisão do dono: "no TalentCare mostra só volume de cada usuário". Os números
   vêm de `/api/acessorias-metrics` (à parte do `dept-metrics`, que alimenta o
   score) e nunca dizem "atrasado": em 30/09/2026 o escritório implantava o
   sistema, e atraso lá media quem ainda não dá baixa.
   ============================================================ */
type AcessoriasDoSetor = {
  total: { iniciados: number; concluidos: number; entregas: number; solicitacoes: number }
  pessoas: { id: string; nome: string; iniciados: number; concluidos: number; entregas: number; lotes: Lote[] }[]
}

function useAcessoriasDoSetor(deptId: string, fromDay: string, toDay: string) {
  const [dados, setDados] = useState<AcessoriasDoSetor | null>(null)
  useEffect(() => {
    let vivo = true
    setDados(null)
    fetch(`/api/acessorias-metrics?dept=${encodeURIComponent(deptId)}&period=custom&from=${fromDay}&to=${toDay}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo) setDados(d) })
      .catch(() => { if (vivo) setDados(null) })
    return () => { vivo = false }
  }, [deptId, fromDay, toDay])
  return dados
}

export function Sistemas({ m, abrir }: ComDetalhe) {
  const acess = useAcessoriasDoSetor(m.setor.id, m.fromDay, m.toDay)
  const acessTem = !!acess && acess.pessoas.length > 0
  const todos = sistemas(m)
  const com = todos.filter((x) => x.tem)
  const sem = [...todos.filter((x) => !x.tem).map((x) => x.nome), ...(acess && !acessTem ? ['Acessórias'] : [])]
  return (
    <Cartao titulo="Sistemas e produtividade" Icone={Activity} sub={`Uso dos sistemas no período · ${m.label} · clique num sistema para o detalhe`}>
      <div className={s.sistemas}>
        {com.map((x) => (
          <button key={x.chave} type="button"
            onMouseEnter={() => precarregarDetalhe(x.chave)}
            onFocus={() => precarregarDetalhe(x.chave)}
            onClick={() => abrir(x.chave)}
            title={`Abrir o resumo de ${x.nome} só com este setor`}
            style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', gap: 10, padding: 14, background: 'var(--n-card)', border: '1px solid var(--n-border)', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {x.logo
                ? <LogoFluxo size={28} />
                : <span style={{ width: 28, height: 28, borderRadius: 8, background: suave(x.tom), color: forte(x.tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><x.Icone size={15} /></span>}
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
        {acessTem && (
          <button type="button" title="Abrir o resumo do Acessórias só com este setor (volume; fora da nota)"
            onMouseEnter={() => precarregarDetalhe('acessorias')} onFocus={() => precarregarDetalhe('acessorias')}
            onClick={() => abrir('acessorias')}
            style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', gap: 10, padding: 14, background: 'var(--n-card)', border: '1px solid var(--n-border)', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: suave('pink'), color: forte('pink'), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><CalendarCheck size={15} /></span>
              <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Acessórias</span>
              <span style={{ marginLeft: 'auto', fontSize: 9.5, color: 'var(--n-text-3)', whiteSpace: 'nowrap' }}>fora da nota</span>
            </span>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {acess!.pessoas.slice(0, 3).map((p, i) => (
                <li key={p.id} style={{ display: 'flex', gap: 8, fontSize: 11.5 }}>
                  <span style={{ color: 'var(--n-text-3)', width: 10 }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</span>
                  {/* Baixa em lote: CONTA, mas avisa (decisão do dono, 01/10/2026). */}
                  {p.lotes.length > 0 && <span title={textoDoLote(p.lotes)} style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--n-amber)', background: 'var(--n-amber-soft)', borderRadius: 4, padding: '0 4px' }}>lote</span>}
                  <b className="cnum" style={{ color: forte('pink') }} title={`${p.concluidos} processos concluídos · ${p.entregas} entregas · ${p.iniciados} iniciados`}>{num(p.concluidos + p.entregas)}</b>
                </li>
              ))}
            </ol>
            <span style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--n-border-2)' }}>
              {([[acess!.total.concluidos, 'Processos concluídos'], [acess!.total.iniciados, 'Processos iniciados'], [acess!.total.entregas, 'Entregas feitas']] as [number, string][]).map(([v, r]) => (
                <span key={r}>
                  <span className="cnum" style={{ display: 'block', fontSize: 15, fontWeight: 800, color: forte('pink') }}>{num(v)}</span>
                  <span style={{ display: 'block', fontSize: 10.5, color: 'var(--n-text-3)' }}>{r}</span>
                </span>
              ))}
            </span>
          </button>
        )}
      </div>
      {com.length === 0 && !acessTem && <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Nenhuma atividade registrada nos sistemas medidos neste período.</div>}
      {sem.length > 0 && (com.length > 0 || acessTem) && (
        <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 10 }}>Sem registro deste setor no período: {sem.join(', ')}.</div>
      )}
    </Cartao>
  )
}
