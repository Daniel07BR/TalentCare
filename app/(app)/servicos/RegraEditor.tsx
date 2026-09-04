'use client'
import { useEffect, useState } from 'react'
import { Scale } from 'lucide-react'
import { calcular, type EventoPontuacao } from '@/lib/servicos/pontuacao'

type Versao = {
  id: string; base: number; fatorPorMinuto?: number; vigenteDesde: string; motivo: string | null
  criadoEm: string; criadoPor: string
  itens: { evento: string; pontos: number }[]
}

/**
 * O painel onde o setor define a própria régua de pontuação.
 *
 * ⚠️⚠️ Salvar cria uma VERSÃO com vigência, nunca sobrescreve a anterior. Quem
 * edita aqui é o gestor do próprio time — o registro de autor, data e a partir
 * de quando vale é o que separa "mudamos o critério" de "mudei a nota dele".
 */
export default function RegraEditor({ departmentId, setorNome }: { departmentId: string; setorNome: string }) {
  const [eventos, setEventos] = useState<EventoPontuacao[]>([])
  const [versoes, setVersoes] = useState<Versao[]>([])
  const [compAtual, setCompAtual] = useState('')
  const [base, setBase] = useState(100)
  const [fator, setFator] = useState(0.5)
  const [pontos, setPontos] = useState<Record<string, number>>({})
  const [vigencia, setVigencia] = useState('')
  const [motivo, setMotivo] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    setCarregando(true); setMsg(null)
    fetch(`/api/servicos/regra?departmentId=${departmentId}`)
      .then((r) => r.json())
      .then((d: { eventos: EventoPontuacao[]; versoes: Versao[]; competenciaAtual: string }) => {
        if (!vivo) return
        setEventos(d.eventos ?? []); setVersoes(d.versoes ?? []); setCompAtual(d.competenciaAtual ?? '')
        setVigencia(d.competenciaAtual ?? '')
        const vigente = d.versoes?.[0]
        setBase(vigente?.base ?? 100)
        setFator(vigente?.fatorPorMinuto ?? 0.5)
        const p: Record<string, number> = {}
        for (const e of d.eventos ?? []) {
          p[e.chave] = vigente?.itens.find((i) => i.evento === e.chave)?.pontos ?? e.sugestao
        }
        setPontos(p)
      })
      .catch(() => vivo && setMsg({ tipo: 'erro', texto: 'Não consegui ler a régua deste setor.' }))
      .finally(() => vivo && setCarregando(false))
    return () => { vivo = false }
  }, [departmentId])

  async function salvar() {
    setMsg(null)
    const r = await fetch('/api/servicos/regra', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        departmentId, base, fatorPorMinuto: fator, vigenteDesde: vigencia, motivo,
        itens: eventos.map((e) => ({ evento: e.chave, pontos: pontos[e.chave] ?? 0 })),
      }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg({ tipo: 'erro', texto: d.error ?? 'Não consegui salvar.' }); return }
    setMsg({ tipo: 'ok', texto: `Régua salva, valendo a partir de ${vigencia}.` })
    const nova = await fetch(`/api/servicos/regra?departmentId=${departmentId}`).then((x) => x.json())
    setVersoes(nova.versoes ?? [])
  }

  /* ⚠️ O EXEMPLO usa a MESMA função que o servidor (`lib/servicos/pontuacao.ts`).
     Recalcular na tela com uma fórmula própria é a régua em dois lugares — a
     pessoa ajusta vendo um número e o painel grava outro. */
  const regra = { base, itens: eventos.map((e) => ({ evento: e.chave, pontos: pontos[e.chave] ?? 0 })) }
  const exemploLimpo = calcular(regra, { atrasos: 0, atrasosAbonados: 0, advertencias: 0, servicosConcluidos: 0 })
  const exemploRuim = calcular(regra, { atrasos: 2, atrasosAbonados: 1, advertencias: 1, servicosConcluidos: 0 })

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Scale size={16} color="var(--accent)" />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Régua de pontuação — {setorNome}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.55 }}>
        Quantos pontos cada pessoa começa o mês, e o que soma ou desconta.
        {' '}<b>Salvar não altera meses já pontuados</b> — cria uma versão que vale a partir da competência escolhida.
      </div>

      {carregando ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Carregando…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12, marginBottom: 16 }}>
            <Campo label="Base do mês" descricao="com quantos pontos todo mundo começa" valor={base} onChange={setBase} />
            {/* ⚠️⚠️ O multiplicador de TODA a pontuação de serviço. Ver o
                comentário na rota: com 0,5 a parte de serviço vale milhares e a
                disciplinar dezenas. */}
            <Campo label="Ponto por minuto de serviço" descricao="× a duração média de cada tipo — define o peso da tabela abaixo"
              valor={fator} onChange={setFator} decimal />
            {eventos.map((e) => (
              <Campo key={e.chave} label={e.label} descricao={e.descricao}
                valor={pontos[e.chave] ?? 0} onChange={(v) => setPontos((p) => ({ ...p, [e.chave]: v }))} />
            ))}
          </div>

          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginBottom: 8 }}>Como fica, com esses números</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Exemplo titulo="Mês sem nenhuma ocorrência" calc={exemploLimpo} />
              <Exemplo titulo="2 atrasos, 1 abonado e 1 advertência" calc={exemploRuim} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
            <label style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
              Vale a partir de
              <input type="month" value={vigencia} min={compAtual} onChange={(e) => setVigencia(e.target.value)}
                style={{ display: 'block', marginTop: 4, height: 34, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 10px', fontSize: 12.5, fontFamily: 'inherit' }} />
            </label>
            <label style={{ flex: 1, minWidth: 220, fontSize: 11.5, color: 'var(--text-dim)' }}>
              Por que mudou (opcional, mas é o que a conversa de seis meses depois precisa)
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="ex.: alinhamento com a nova meta do setor"
                style={{ display: 'block', marginTop: 4, width: '100%', height: 34, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 10px', fontSize: 12.5, fontFamily: 'inherit' }} />
            </label>
            <button onClick={salvar}
              style={{ height: 34, padding: '0 18px', background: 'var(--accent)', color: '#1a1205', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
              Salvar régua
            </button>
          </div>

          {msg && (
            <div style={{ fontSize: 12.5, marginBottom: 12, padding: '10px 12px', borderRadius: 'var(--radius-sm)', lineHeight: 1.5,
              color: msg.tipo === 'ok' ? 'var(--success)' : 'var(--danger)',
              background: msg.tipo === 'ok' ? 'rgba(63,178,85,.1)' : 'rgba(229,72,77,.08)',
              border: `1px solid ${msg.tipo === 'ok' ? 'rgba(63,178,85,.35)' : 'rgba(229,72,77,.3)'}` }}>{msg.texto}</div>
          )}

          {versoes.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8 }}>Versões da régua</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {versoes.map((v) => (
                  <div key={v.id} style={{ fontSize: 12, background: 'var(--surface-2)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.5 }}>
                    <b>a partir de {v.vigenteDesde}</b> · base {v.base}{v.fatorPorMinuto != null ? ` · ${v.fatorPorMinuto} pt/min de serviço` : ''}
                    {v.itens.filter((i) => i.pontos).map((i) => ` · ${rotulo(eventos, i.evento)} ${i.pontos > 0 ? '+' : ''}${i.pontos}`).join('')}
                    <div style={{ color: 'var(--text-mute)', fontSize: 11 }}>
                      {v.criadoPor} · {new Date(v.criadoEm).toLocaleDateString('pt-BR')}{v.motivo ? ` · ${v.motivo}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

const rotulo = (eventos: EventoPontuacao[], chave: string) => eventos.find((e) => e.chave === chave)?.label ?? chave

function Campo({ label, descricao, valor, onChange, decimal }: { label: string; descricao: string; valor: number; onChange: (v: number) => void; decimal?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginBottom: 6, minHeight: 26, lineHeight: 1.3 }}>{descricao}</div>
      <input type="number" step={decimal ? '0.01' : '1'} value={valor}
        onChange={(e) => onChange(decimal ? (parseFloat(e.target.value || '0') || 0) : parseInt(e.target.value || '0', 10))}
        style={{ width: '100%', height: 34, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: valor < 0 ? 'var(--danger)' : valor > 0 ? 'var(--success)' : 'var(--text)', padding: '0 10px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
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
