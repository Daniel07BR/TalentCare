'use client'
import { useRouter } from 'next/navigation'
import { Users2, ShieldCheck } from 'lucide-react'
import { useTalentData } from '@/lib/ui/data'
import { deptListVM } from '@/lib/mock/departments'
import { usePeriod } from '@/lib/ui/period'
import { rotuloDoRetrato } from '@/lib/quadro'
import type { ChefeDoSetor } from '@/lib/mock/data'
import Avatar from '../Avatar'

/* ============================================================
   OS SETORES — um card por setor, com o ROSTO de quem responde por ele.

   ⚠️⚠️ Redesenho pedido pelo dono (11/09/2026): "aproveite a extensão inteira
   da tela; no lugar da pontuação, a foto do encarregado e do sub — isso já
   ocorre quando acessamos ela".
   - O SCORE saiu, pela mesma régua que o tirou do topo do relatório do setor
     (03/09): não foi validado e não vale. Saiu junto o `useScoreSignals`, que
     buscava a atividade da EMPRESA INTEIRA (`/api/score-metrics`) só para
     calcular o número que a tela deixou de mostrar.
   - A chefia vem do VÍNCULO gravado, igual ao relatório — ver `Department.chefia`.
     O card antes mostrava um "líder" adivinhado pelo cargo, e errava: Entregas
     aparecia com o Gilberto (mensageiro), o TI com o Yuri.
   - LARGURA TOTAL: grade `auto-fill`, e não 3 colunas cravadas em 1280px. Em
     monitor largo cabem 5; em notebook, 3; no celular, 1 — sem regra por tela.
   ============================================================ */

const iniciais = (nome: string) => nome.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()

export default function DepartamentosPage() {
  const router = useRouter()
  const { fromDay, toDay } = usePeriod()
  const vm = deptListVM(useTalentData(), fromDay, toDay)
  const retrato = rotuloDoRetrato(toDay)

  return (
    <div className="tc-anim" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Setores</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Departamentos</h1>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          <Total rotulo="Setores" valor={vm.n} />
          <Total rotulo={`Pessoas · ${retrato}`} valor={vm.totalHc} />
          {/* ⚠️ Só aparece quando há o que fazer: um "0 sem chefia" permanente
              vira paisagem e ninguém mais olha para ele no dia em que virar 1. */}
          {vm.semChefia > 0 && <Total rotulo="Sem chefia definida" valor={vm.semChefia} cor="var(--warning)" />}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 16 }}>
        {vm.cards.map((d, i) => {
          const temChefia = d.gestores.length + d.subs.length > 0
          return (
            <div key={d.id} className="tc-card cpop" role="link" tabIndex={0}
              onClick={() => router.push(`/departamentos/${d.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/departamentos/${d.id}`) }}
              style={{ animationDelay: `${Math.min(i, 12) * 30}ms`, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.2px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                  <b style={{ color: 'var(--text)', fontWeight: 700 }}>{d.headcount}</b> {d.headcount === 1 ? 'pessoa' : 'pessoas'} · {retrato}
                </div>
              </div>

              {/* ── A CHEFIA — mesma hierarquia de tamanho do relatório: o gestor
                  maior, o sub menor, porque é assim que a avaliação corre. ── */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 18, minHeight: 112, marginBottom: 16 }}>
                {temChefia ? (
                  <>
                    {d.gestores.map((c) => <Rosto key={c.id} c={c} grande onAbrir={() => router.push(`/funcionarios/${c.id}`)} />)}
                    {d.subs.map((c) => <Rosto key={c.id} c={c} onAbrir={() => router.push(`/funcionarios/${c.id}`)} />)}
                  </>
                ) : (
                  /* ⚠️ Setor sem chefia não ganha rosto genérico: ganha o aviso,
                     que é o que pede ação. "Pela Diretoria" é decisão gravada, não
                     falta — por isso fica neutro, e só a falta fica em alerta. */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 18, border: '1px dashed var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      {d.pelaDiretoria ? <ShieldCheck size={24} color="var(--text-mute)" /> : <Users2 size={24} color="var(--warning)" />}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.45, color: d.pelaDiretoria ? 'var(--text-dim)' : 'var(--warning)', fontWeight: 500 }}>
                      {d.pelaDiretoria ? <>Responde à<br />Diretoria</> : <>Sem chefia<br />definida</>}
                    </div>
                  </div>
                )}
              </div>

              {/* ⚠️⚠️ O turnover deste card era `3.5 + rnd(seed) × 13`. Depois virou a
                  taxa de 12 meses; desde 11/09/2026 é a DO PERÍODO, a mesma régua do
                  relatório do setor e do painel (`lib/quadro.ts`). O card diz o
                  numerador — 0% de um setor de 2 pessoas e de um de 21 não são a mesma
                  notícia. Sem o vermelho de "≥ 20%": aquele corte era de 12 meses. */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Rotatividade no período</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: d.rotatividade.saidas > 0 ? 'var(--warning)' : 'var(--text-mute)' }}>
                  {d.rotatividade.taxa.toLocaleString('pt-BR')}% <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-mute)' }}>· {d.rotatividade.saidas} {d.rotatividade.saidas === 1 ? 'saída' : 'saídas'}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Total({ rotulo, valor, cor }: { rotulo: string; valor: number; cor?: string }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>{rotulo}</div>
      <div className="cnum" style={{ fontSize: 20, fontWeight: 700, color: cor ?? 'var(--text)' }}>{valor}</div>
    </div>
  )
}

/** Um rosto da chefia. Clicar abre a ficha da pessoa — sem abrir o setor junto. */
function Rosto({ c, grande = false, onAbrir }: { c: ChefeDoSetor; grande?: boolean; onAbrir: () => void }) {
  const papel = grande
    ? (c.deOutroSetor ? `${c.cargo} · outro setor` : c.cargo)
    : (c.deOutroSetor ? 'sub · outro setor' : 'sub-encarregado')
  return (
    <button type="button" title={`${c.nome} — abrir a ficha`}
      onClick={(e) => { e.stopPropagation(); onAbrir() }}
      onKeyDown={(e) => e.stopPropagation()}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', textAlign: 'center', width: grande ? 104 : 80, flex: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Avatar id={c.id} hasAvatar={c.hasAvatar} initials={iniciais(c.nome)}
          color={grande ? 'var(--accent)' : 'var(--chart-3)'} size={grande ? 66 : 48} radius={grande ? 18 : 14} />
      </div>
      <div style={{ fontSize: grande ? 12.5 : 11.5, fontWeight: grande ? 700 : 600, marginTop: 8, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {grande ? c.nome.split(' ').slice(0, 2).join(' ') : c.nome.split(' ')[0]}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{papel}</div>
    </button>
  )
}
