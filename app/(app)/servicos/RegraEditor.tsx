'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Scale } from 'lucide-react'
import { calcular, regraDaCompetencia, type EventoPontuacao } from '@/lib/servicos/pontuacao'

type Versao = {
  id: string; base: number; fatorPorMinuto?: number; vigenteDesde: string; motivo: string | null
  criadoEm: string; criadoPor: string
  itens: { evento: string; pontos: number }[]
}

/**
 * A régua de pontuação do setor — SÓ LEITURA desde 11/09/2026.
 *
 * ⚠️⚠️ Decisão do dono: a régua é GERAL, para todos os setores, e mora em
 * Configurações → Régua de pontuação (só o dono e a Diretoria alteram). A régua
 * de cada setor é GERADA por ela, proporcional ao que o setor costuma pontuar.
 * Aqui o setor vê os números que valem para ele e de onde vieram; o que ele
 * ajusta continua sendo o tempo médio de cada tarefa (logo abaixo).
 */
export default function RegraEditor({ departmentId, setorNome }: { departmentId: string; setorNome: string }) {
  const [eventos, setEventos] = useState<EventoPontuacao[]>([])
  const [versoes, setVersoes] = useState<Versao[]>([])
  const [compAtual, setCompAtual] = useState('')
  const [podeAlterar, setPodeAlterar] = useState(false)
  const [erro, setErro] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    setCarregando(true); setErro(false)
    fetch(`/api/servicos/regra?departmentId=${departmentId}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d: { eventos: EventoPontuacao[]; versoes: Versao[]; competenciaAtual: string; podeAlterar?: boolean }) => {
        if (!vivo) return
        setEventos(d.eventos ?? []); setVersoes(d.versoes ?? []); setCompAtual(d.competenciaAtual ?? ''); setPodeAlterar(!!d.podeAlterar)
      })
      .catch(() => vivo && setErro(true))
      .finally(() => vivo && setCarregando(false))
    return () => { vivo = false }
  }, [departmentId])

  /* A que vale NESTE mês (e não a mais recente: uma versão futura ainda não vale). */
  const vigente = compAtual ? regraDaCompetencia(versoes, compAtual) : versoes[0] ?? null
  const pontos = (chave: string) => vigente?.itens.find((i) => i.evento === chave)?.pontos ?? 0
  /* ⚠️ O EXEMPLO usa a MESMA função que o servidor (`lib/servicos/pontuacao.ts`). */
  const regra = { base: vigente?.base ?? 0, itens: eventos.map((e) => ({ evento: e.chave, pontos: pontos(e.chave) })) }
  const exemploLimpo = calcular(regra, { atrasos: 0, atrasosAbonados: 0, advertencias: 0, servicosConcluidos: 0 })
  const exemploRuim = calcular(regra, { atrasos: 2, atrasosAbonados: 1, advertencias: 1, servicosConcluidos: 0 })

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <Scale size={16} color="var(--accent)" />
        <div style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>Régua de pontuação — {setorNome}</div>
        {podeAlterar && (
          <Link href="/configuracoes?aba=regua" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>Alterar a régua geral ›</Link>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.55 }}>
        A régua é <b>geral, para todos os setores</b>, e é definida em Configurações pelo dono do sistema e pela Diretoria.
        Cada setor recebe os pontos <b>proporcionais ao que ele costuma pontuar</b> — por isso uma falta pesa o mesmo no mês
        de qualquer setor. O setor ajusta o <b>tempo médio de cada tarefa</b>, logo abaixo.
        {/* ⚠️ Achado do crítico: a versão que vale hoje pode ser ANTERIOR à régua geral
            (em seis setores ela ainda é a cópia do Legal). A tela não afirma o que
            não é: diz de onde esta versão veio. */}
        {vigente && !(vigente.motivo ?? '').startsWith('Gerada pela régua geral') && (
          <><br /><b style={{ color: 'var(--warning)' }}>Esta versão é anterior à régua geral</b> e ainda não foi gerada por ela — passa a ser na
          próxima vez que a régua geral for salva em Configurações.</>
        )}
      </div>

      {carregando ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Carregando…</div>
      ) : erro ? (
        <div style={{ fontSize: 12.5, color: 'var(--danger)' }}>Não consegui ler a régua deste setor.</div>
      ) : !vigente ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Ainda não há régua valendo para este setor neste mês.</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 16 }}>
            <Valor label="Base do mês" v={vigente.base} />
            <Valor label="Ponto por minuto de serviço" v={vigente.fatorPorMinuto ?? 0} decimal />
            {eventos.map((e) => <Valor key={e.chave} label={e.label} v={pontos(e.chave)} />)}
          </div>

          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginBottom: 8 }}>Como fica, com esses números</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Exemplo titulo="Mês sem nenhuma ocorrência" calc={exemploLimpo} />
              <Exemplo titulo="2 atrasos, 1 abonado e 1 advertência" calc={exemploRuim} />
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8 }}>Versões da régua deste setor</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {versoes.map((v) => (
              <div key={v.id} style={{ fontSize: 12, background: 'var(--surface-2)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.5 }}>
                <b>a partir de {v.vigenteDesde}</b>{v.id === vigente.id ? ' (vale agora)' : ''} · base {v.base}{v.fatorPorMinuto != null ? ` · ${v.fatorPorMinuto} pt/min de serviço` : ''}
                {v.itens.filter((i) => i.pontos).map((i) => ` · ${rotulo(eventos, i.evento)} ${i.pontos > 0 ? '+' : ''}${i.pontos}`).join('')}
                <div style={{ color: 'var(--text-mute)', fontSize: 11 }}>
                  {v.criadoPor} · {new Date(v.criadoEm).toLocaleDateString('pt-BR')}{v.motivo ? ` · ${v.motivo}` : ''}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const rotulo = (eventos: EventoPontuacao[], chave: string) => eventos.find((e) => e.chave === chave)?.label ?? chave

function Valor({ label, v, decimal = false }: { label: string; v: number; decimal?: boolean }) {
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: v < 0 ? 'var(--danger)' : v > 0 && !decimal ? 'var(--success)' : 'var(--text)' }}>
        {decimal ? v.toLocaleString('pt-BR') : `${v > 0 ? '+' : ''}${v}`}
      </div>
    </div>
  )
}
function Exemplo({ titulo, calc }: { titulo: string; calc: ReturnType<typeof calcular> }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 4 }}>{calc.pontos} <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>pontos</span></div>
      <div style={{ fontSize: 10.5, color: 'var(--text-mute)', lineHeight: 1.45 }}>{calc.detalhe}</div>
    </div>
  )
}
