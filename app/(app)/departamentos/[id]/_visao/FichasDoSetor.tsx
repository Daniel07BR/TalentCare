'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileDown, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useTalentData } from '@/lib/ui/data'
import { usePeriod } from '@/lib/ui/period'
import type { EmployeeMetrics } from '@/lib/ui/employee-period'
import type { DeptMetrics } from '@/lib/ui/dept-period'
import { buildEmployeeVM, type EmployeeVM } from '@/lib/mock/employee'
import { FichasImpressas } from '../../../funcionarios/[id]/_visao/FichaImpressa'

/* ============================================================
   AS FICHAS DO SETOR NUM PDF SÓ (04/11/2026).

   Pedido do Daniel: todo departamento imprime a ficha do mês de cada funcionário; o botão gera o PDF de todos de uma
   vez, com o período selecionado, em vez de entrar em um a um. Cada ficha é a MESMA folha do "Gerar PDF" da pessoa.

   ⚠️ Vale a régua da ficha: a rota de cada pessoa responde 403 para quem não pode ver, e essa fica de fora, dito na janela.
   ⚠️ Papel não recarrega: se alguma ficha falhar, a janela para e pergunta, em vez de imprimir faltando gente sem avisar.
   ⚠️ Quem saiu do setor não entra: a lista é a de ativos do relatório. A ficha dessa pessoa continua na própria tela.
   ============================================================ */

/** Três por vez: a rota é pesada, e um setor grande dispararia dezenas de contas ao mesmo tempo. */
const POR_VEZ = 3
const TENTATIVAS = 2

type Ficha = { vm: EmployeeVM; m: EmployeeMetrics }
type Pessoa = { id: string; nome: string }

async function buscar(id: string, query: string): Promise<EmployeeMetrics | 'semAcesso' | null> {
  for (let i = 0; i < TENTATIVAS; i++) {
    try {
      const r = await fetch(`/api/employee-metrics?id=${encodeURIComponent(id)}&${query}`, { cache: 'no-store' })
      if (r.status === 403) return 'semAcesso'
      if (r.ok) return await r.json()
    } catch { /* a próxima tentativa decide */ }
  }
  return null
}

/* Cada ficha ainda busca o Acessórias e as fotos depois de montada. Imprimir na hora sairia sem eles: espera a rede
   ficar 2,5 s quieta e as fotos terminarem, com teto de 30 s para uma foto presa não travar o botão.
   ⚠️ Observador, e não `getEntriesByType`: a lista do navegador para de crescer em 250 itens, e numa aba aberta há muito
   tempo a rede pareceria quieta desde o começo. */
function redeQuieta(): Promise<void> {
  return new Promise((pronto) => {
    const inicio = Date.now()
    let quieto = Date.now()
    const observador = new PerformanceObserver(() => { quieto = Date.now() })
    observador.observe({ type: 'resource' })
    const olhar = setInterval(() => {
      const fotos = [...document.querySelectorAll<HTMLImageElement>('.fi-root img')].every((i) => i.complete)
      if ((fotos && Date.now() - quieto >= 2500) || Date.now() - inicio >= 30000) {
        clearInterval(olhar)
        observador.disconnect()
        pronto()
      }
    }, 200)
  })
}

export function BotaoFichasDoSetor({ m, estilo }: { m: DeptMetrics; estilo: React.CSSProperties }) {
  const [aberto, setAberto] = useState(false)
  if (m.pessoas.length === 0) return null
  return (
    <>
      <button type="button" style={estilo} onClick={() => setAberto(true)} title={`Gerar um PDF só com a ficha de todos do setor · ${m.label}`}>
        <FileDown size={15} /> Gerar PDF de todos
      </button>
      {aberto && <Janela m={m} fechar={() => setAberto(false)} />}
    </>
  )
}

function Janela({ m, fechar }: { m: DeptMetrics; fechar: () => void }) {
  const data = useTalentData()
  const { label: periodo, query } = usePeriod()
  const [feitas, setFeitas] = useState(0)
  const [fichas, setFichas] = useState<Ficha[] | null>(null)
  const [falhas, setFalhas] = useState<Pessoa[]>([])
  const [semAcesso, setSemAcesso] = useState<Pessoa[]>([])
  const [imprimir, setImprimir] = useState(false)
  const [rodada, setRodada] = useState(0)
  const cancelado = useRef(false)

  const pessoas = [...m.pessoas].sort((a, b) => a.nome.localeCompare(b.nome))

  useEffect(() => {
    cancelado.current = false
    setFeitas(0); setFichas(null); setFalhas([]); setSemAcesso([]); setImprimir(false)
    const montadas = new Map<string, Ficha>()
    const erradas: Pessoa[] = []
    const barradas: Pessoa[] = []
    let proxima = 0
    const trabalhador = async () => {
      while (!cancelado.current && proxima < pessoas.length) {
        const p = pessoas[proxima++]
        const r = await buscar(p.id, query)
        const vm = buildEmployeeVM(data, p.id)
        if (r === 'semAcesso') barradas.push(p)
        else if (r && vm) montadas.set(p.id, { vm, m: r })
        else erradas.push(p)
        if (!cancelado.current) setFeitas((n) => n + 1)
      }
    }
    Promise.all(Array.from({ length: POR_VEZ }, trabalhador)).then(() => {
      if (cancelado.current) return
      setSemAcesso(barradas)
      setFalhas(erradas)
      setFichas(pessoas.flatMap((p) => { const f = montadas.get(p.id); return f ? [f] : [] }))
      if (erradas.length === 0 && montadas.size > 0) setImprimir(true)
    })
    return () => { cancelado.current = true }
    // ⚠️ Só refaz em "Tentar de novo": o filtro não muda com a janela aberta, e `pessoas` é nova a cada desenho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodada])

  useEffect(() => {
    if (!imprimir) return
    let vivo = true
    redeQuieta().then(() => {
      if (!vivo) return
      const antes = document.title
      document.title = `Fichas - ${m.setor.nome} - ${periodo}`
      const volta = () => {
        document.title = antes
        window.removeEventListener('afterprint', volta)
        if (vivo) fechar()
      }
      window.addEventListener('afterprint', volta)
      window.print()
    })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imprimir])

  const total = pessoas.length
  const pronto = fichas != null

  return (
    <>
      {createPortal(
        <div role="dialog" aria-modal="true" aria-label="Gerar o PDF do setor"
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15, 23, 42, .45)' }}>
          <div style={{ width: 'min(440px, 100%)', maxHeight: '90vh', overflow: 'auto', padding: 22, borderRadius: 16, background: 'var(--surface, #fff)', color: 'var(--text, #0f172a)', boxShadow: '0 20px 50px rgba(15, 23, 42, .25)' }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Fichas de {m.setor.nome}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim, #475569)', marginTop: 2 }}>{periodo}</div>

            {!pronto && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, fontSize: 13.5 }}>
                <LoaderCircle size={17} />
                Montando {feitas} de {total}…
              </div>
            )}
            {pronto && imprimir && (
              <div style={{ marginTop: 16, fontSize: 13.5 }}>
                {fichas.length} {fichas.length === 1 ? 'ficha pronta' : 'fichas prontas'}. A janela de impressão vai abrir: escolha <b>Salvar como PDF</b> ou a impressora.
              </div>
            )}
            {pronto && falhas.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 14, fontSize: 13, color: 'var(--danger, #e5484d)' }}>
                <TriangleAlert size={16} style={{ flex: 'none', marginTop: 1 }} />
                <span>Não foi possível montar: {falhas.map((p) => p.nome).join(', ')}.</span>
              </div>
            )}
            {pronto && fichas.length === 0 && falhas.length === 0 && (
              <div style={{ marginTop: 14, fontSize: 13 }}>Você não tem acesso à ficha de ninguém deste setor.</div>
            )}
            {semAcesso.length > 0 && fichas && fichas.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-dim, #475569)' }}>
                Fora do PDF, porque você não tem acesso à ficha: {semAcesso.map((p) => p.nome).join(', ')}.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
              {pronto && falhas.length > 0 && (
                <button type="button" onClick={() => setRodada((n) => n + 1)} style={BOTAO}>Tentar de novo</button>
              )}
              {pronto && falhas.length > 0 && fichas.length > 0 && (
                <button type="button" onClick={() => setImprimir(true)} style={BOTAO}>Gerar sem {falhas.length === 1 ? 'essa pessoa' : 'essas pessoas'}</button>
              )}
              <button type="button" onClick={fechar} style={BOTAO}>{pronto && imprimir ? 'Fechar' : 'Cancelar'}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {fichas && fichas.length > 0 && <FichasImpressas fichas={fichas} periodo={periodo} />}
    </>
  )
}

const BOTAO: React.CSSProperties = {
  minHeight: 36, padding: '0 14px', background: 'var(--surface-2, #f6f8fc)', border: '1px solid var(--border, #e6eaf2)', borderRadius: 10,
  color: 'inherit', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
}
