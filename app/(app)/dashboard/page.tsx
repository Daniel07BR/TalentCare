'use client'
import { useRouter } from 'next/navigation'
import { usePeriod } from '@/lib/ui/period'
import { useTalentData } from '@/lib/ui/data'
import { useAssiduidadePeriod } from '@/lib/ui/assiduidade-period'
import { useFrescor } from '@/lib/ui/frescor'
import { useScoreSignals } from '@/lib/ui/score-period'
import { withRealScores } from '@/lib/mock/score'
import { buildDashboard } from '@/lib/mock/dashboard'
import { generationsVM, genderVM } from '@/lib/mock/demographics'
import Avatar from '../Avatar'
import WhatsappDeptCard from './WhatsappDeptCard'
import RadioDeptCard from './RadioDeptCard'
import ClassroomDeptCard from './ClassroomDeptCard'
import ConsultoriaDeptCard from './ConsultoriaDeptCard'
import HelpdeskDeptCard from './HelpdeskDeptCard'
import CideDeptCard from './CideDeptCard'

export default function DashboardPage() {
  const { period, from, to, label: periodLabel } = usePeriod()
  const router = useRouter()
  const { signals, loading: scoreLoading, erro: scoreErro } = useScoreSignals()
  const data = withRealScores(useTalentData(), signals)
  const assid = useAssiduidadePeriod()
  const frescor = useFrescor()
  const vm = buildDashboard(data, period, {
    assidMap: assid.map ?? undefined,
    from, to,
    janelaComPonto: assid.janelaComPonto,
    motivoSemPonto: assid.motivoSemPonto ?? (assid.erro ? 'não foi possível ler o ponto' : null),
    atrasosPorDia: assid.porDia,
  })
  const gen = generationsVM(data).overall
  const gend = genderVM(data).overall
  /* ⚠️⚠️ Enquanto os sinais do período não chegam, `withRealScores(data, null)`
     devolve o score ACUMULADO de toda a história — e o cabeçalho já diz
     "Período: Últimos 30 dias". Medido em 03/09/2026: média 57 no acumulado
     contra 60 na janela, com saltos de até 57 pontos numa pessoa. A tela tem de
     dizer que ainda está carregando, e tem de gritar se a leitura falhou: o
     `catch` mudo deixava o acumulado ali para sempre, rotulado de período. */
  const carregandoPeriodo = scoreLoading || assid.loading
  const erroPeriodo = scoreErro || assid.erro

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Painel de</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Indicadores Grupo Itamarathy</h1>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'right', lineHeight: 1.5 }}>
          <div>Período: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{periodLabel}</span></div>
          {/* ⚠️⚠️ Aqui dizia **"Atualizado há 12 min"**, cravado no JSX desde o
              primeiro desenho e igual num painel fresco e num painel morto. O
              `scripts/tc-vigia.sh` deste repositório já citava essa frase, por
              escrito, como o exemplo do que dá errado: "o rádio ficou 39 dias
              parado e o WhatsApp congelou — os crons rodavam, nada estourava, e
              o painel dizia 'atualizado há 12 min'".
              Agora é o espelho MAIS ATRASADO: um painel é tão fresco quanto a
              fonte mais velha que ele soma. */}
          <div title={frescor.detalhe}>{frescor.texto}</div>
        </div>
      </div>

      {carregandoPeriodo && !erroPeriodo && (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 14 }}>
          Carregando os números do período… <span style={{ color: 'var(--text-mute)' }}>até chegarem, o score mostrado é o acumulado de toda a história, não o da janela.</span>
        </div>
      )}
      {erroPeriodo && (
        <div style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(229,72,77,.08)', border: '1px solid rgba(229,72,77,.3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 14, lineHeight: 1.5 }}>
          <b>Não foi possível ler os números do período.</b> O que está na tela é o acumulado de toda a história — <b>não</b> a janela escolhida. Recarregue antes de decidir qualquer coisa com estes números.
        </div>
      )}

      {/* KPIs — ⚠️ o grid era `repeat(6,1fr)` e ficou com 5 cartões desde que
          "Tarefas concluídas" saiu: uma sexta coluna vazia à direita. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 16 }}>
        {vm.kpis.map((k) => {
          const semDado = k.value === '—'
          return (
          <div key={k.label} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 16px 12px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 130 }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', fontWeight: 500 }}>{k.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              {/* ⚠️ "—" em cinza, nunca um 0 grande: zero se lê como "não houve",
                  e aqui o que houve foi ninguém medir. */}
              <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-1px', color: semDado ? 'var(--text-mute)' : 'var(--text)' }}>{k.value}</span>
              {!semDado && <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}>{k.unit}</span>}
            </div>
            {/* A legenda que diz de QUE janela o número fala — ou por que não fala. */}
            <div style={{ fontSize: 10.5, color: 'var(--text-mute)', lineHeight: 1.35 }}>{k.nota}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: k.deltaColor, display: 'inline-flex', alignItems: 'center', gap: 2 }}>{k.delta ? `${k.deltaArrow} ${k.delta}` : ''}</span>
              {/* ⚠️ Sem série real, sem gráfico. Era aqui que moravam os quatro
                  passeios aleatórios — um deles com o número verdadeiro só no
                  último ponto, o que é pior que nenhum gráfico. */}
              {k.spark && (
                <svg width="64" height="26" viewBox="0 0 64 26" style={{ overflow: 'visible' }}>
                  <polyline points={k.spark} fill="none" stroke={k.sparkColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
        )})}
      </div>

      {/* Atendimentos por departamento (WhatsApp) + Curva de turnover */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, marginBottom: 16 }}>
        <WhatsappDeptCard />

        <div className="tc-card" onClick={() => router.push('/turnover')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Curva de turnover</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{vm.turnoverSaidas} {vm.turnoverSaidas === 1 ? 'saída' : 'saídas'} em {vm.turnoverDias} dias · ver relatório</div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>{vm.turnoverWinRate}%</span>
          </div>
          <svg viewBox="0 0 320 150" preserveAspectRatio="none" style={{ width: '100%', height: 160, marginTop: 'auto' }}>
            <line x1="0" y1="37" x2="320" y2="37" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" />
            <line x1="0" y1="75" x2="320" y2="75" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" />
            <line x1="0" y1="113" x2="320" y2="113" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" />
            <path d={vm.turnoverArea} fill="url(#tgrad)" opacity="0.5" />
            <path d={vm.turnoverLine} fill="none" stroke="var(--danger)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="tgrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--danger)" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-mute)', marginTop: 6 }}>
            {vm.turnoverLabels.map((l, i) => <span key={i}>{l}</span>)}
          </div>
        </div>
      </div>

      {/* Ranking + Escolaridade + Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Destaque por departamento</div>
          {/* ⚠️⚠️ A lista está em ordem ALFABÉTICA de setor, de propósito. Ela era
              ordenada por score — entre setores —, o que é exatamente a
              comparação que o `/ranking` avisa, em amarelo, que não vale: o
              score é percentil DENTRO do depto. Ordenada, ela virava um ranking
              de setores pelo campeão de cada um, sem aviso nenhum. */}
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>O melhor de cada setor · cada um comparado só dentro do próprio depto, então os números <b>não</b> se comparam entre linhas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxHeight: 420, overflowY: 'auto' }}>
            {vm.deptHighlights.map((r) => (
              <div key={r.deptId} className="tc-row" onClick={() => router.push(`/funcionarios/${r.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: r.color, flex: 'none' }} />
                <Avatar id={r.id} hasAvatar={r.hasAvatar} initials={r.initials} color={r.color} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.deptNome} · {r.cargo}
                    {/* ⚠️ "Melhor de um" não é destaque — a tela diz contra
                        quantos ele foi comparado em vez de coroar quem não teve
                        com quem competir. */}
                    {r.comparadoCom <= 1 && <span style={{ color: 'var(--warning)' }}> · único avaliável no setor</span>}
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: r.scoreColor, fontVariantNumeric: 'tabular-nums' }}>{r.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tc-card" onClick={() => router.push('/formacao')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Distribuição por escolaridade</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>{vm.headcountTotal} colaboradores</div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>ver ›</span>
          </div>
          <div style={{ position: 'relative', width: 150, height: 150 }}>
            <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="46" fill="none" stroke="var(--surface-2)" strokeWidth="13" />
              {vm.escSegments.map((s) => (
                <circle key={s.label} cx="60" cy="60" r="46" fill="none" stroke={s.color} strokeWidth="13" strokeDasharray={s.dash} strokeDashoffset={s.offset} strokeLinecap="butt" />
              ))}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-1px' }}>{vm.escTopPct}%</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{vm.escTopLabel}</span>
            </div>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
            {vm.escSegments.map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flex: 'none' }} />
                <span style={{ flex: 1, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                <span style={{ fontWeight: 600 }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tc-card" onClick={() => router.push('/geracoes')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Gerações</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Idade média: <b style={{ color: 'var(--text)' }}>{gen.avg ?? '—'}</b> anos</div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>ver ›</span>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 20, overflow: 'hidden', background: 'var(--surface-2)', margin: '16px 0 14px' }}>
            {gen.segs.map((s) => <div key={s.key} title={`${s.label} · ${s.desc}`} style={{ width: `${s.pct}%`, background: s.color }} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {gen.segs.map((s) => (
              <div key={s.key} title={s.desc} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'help' }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flex: 'none' }} />
                <span style={{ flex: 1, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                {s.ages && <span style={{ color: 'var(--text-mute)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{s.ages} anos</span>}
                <span style={{ fontWeight: 600 }}>{s.count}</span>
                <span style={{ color: 'var(--text-mute)', width: 34, textAlign: 'right' }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparativo por gênero */}
      <div className="tc-card" onClick={() => router.push('/genero')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Comparativo por gênero</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Quadro ativo · {gend.m + gend.f} com gênero informado{gend.ni ? ` · ${gend.ni} sem informação` : ''}</div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>ver ›</span>
        </div>
        <div style={{ display: 'flex', height: 12, borderRadius: 20, overflow: 'hidden', background: 'var(--surface-2)', marginBottom: 16 }}>
          <div title={`Masculino: ${gend.m}`} style={{ width: `${gend.mPct}%`, background: 'var(--info)' }} />
          <div title={`Feminino: ${gend.f}`} style={{ width: `${gend.fPct}%`, background: 'var(--chart-5)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Masculino', color: 'var(--info)', count: gend.m, pct: gend.mPct, age: gend.avgM, score: gend.scoreM },
            { label: 'Feminino', color: 'var(--chart-5)', count: gend.f, pct: gend.fPct, age: gend.avgF, score: gend.scoreF },
          ].map((g) => (
            <div key={g.label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: g.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{g.label}</span>
                </div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', color: g.color, lineHeight: 1.1 }}>{g.count} <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}>· {g.pct}%</span></div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 18 }}>
                <div><div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Idade média</div><div style={{ fontSize: 15, fontWeight: 700 }}>{g.age ?? '—'}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Score médio</div><div style={{ fontSize: 15, fontWeight: 700 }}>{g.score}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ClassRoom — cursos criados por departamento NO PERÍODO (dados reais, frente B) */}
      <ClassroomDeptCard />

      {/* Rádio Itamarathy — horas por departamento NO PERÍODO (dados reais, frente B) */}
      <RadioDeptCard />

      {/* Consultoria Plus — atividade por departamento NO PERÍODO (dados reais, frente B) */}
      <ConsultoriaDeptCard />

      {/* HelpDesk — chamados por departamento NO PERÍODO (dados reais, frente B) */}
      <HelpdeskDeptCard />

      {/* CIDE — atividades registradas por departamento NO PERÍODO (dados reais, frente B) */}
      <CideDeptCard />
    </div>
  )
}
