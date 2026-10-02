'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck } from 'lucide-react'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import { Cartao } from '../../../_visao/ui'
import p from '../../../avaliacoes/setor/_painel/painel.module.css'
import { Legenda, Selo, cor, mesCurto, NIVEIS_UI, type Contagem, type NivelKey } from '../../../avaliacoes/setor/_painel/graficos'

/* ============================================================
   O CARTÃO DAS AVALIAÇÕES na página do setor (02/10/2026) — a porta para a
   área do histórico (`/avaliacoes/setor/<setor>`). Um resumo de seis meses:
   o resultado do último mês, as colunas pequenas e quantos assinaram.

   ⚠️ Some para quem não avalia o setor (a rota responde 403) — a mesma régua
   do painel. Gestor de outro setor não chega aqui, colaborador nem à página.
   ============================================================ */

type Resumo = { competencia: string; niveis: Contagem; avaliados: number; quadro: number; concluidas: number; nivel: NivelKey | null }
type Painel = { setor: { endereco: string }; ultimo: string | null; resumo: Resumo[] }


export function CartaoAvaliacoes({ deptId }: { deptId: string }) {
  const [d, setD] = useState<Painel | null>(null)
  const [negado, setNegado] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch(`/api/avaliacoes/painel?setor=${encodeURIComponent(deptId)}&meses=6`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) { if (vivo) setNegado(true); return }
        const j = (await r.json()) as Painel
        if (vivo) setD(j)
      })
      .catch(() => vivo && setNegado(true))
    return () => { vivo = false }
  }, [deptId])

  if (negado) return null
  const url = d ? `/avaliacoes/setor/${d.setor.endereco}` : null
  const ult = d?.resumo.find((r) => r.competencia === d.ultimo) ?? null
  const max = Math.max(1, ...(d?.resumo ?? []).map((r) => r.avaliados))

  return (
    <div className={p.niveis} style={{ marginBottom: 14 }}>
      <Cartao titulo="Avaliações do setor" sub="O histórico das avaliações mensais" Icone={ClipboardCheck} corIcone="var(--n-purple)"
        acao={url ? <Link href={url} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--n-blue)', whiteSpace: 'nowrap' }}>Abrir a área ›</Link> : null}>
        {!d ? <div style={{ fontSize: 12.5, color: 'var(--n-text-3)' }}>Carregando…</div> : (
          <Link href={url!} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(200px, 1.6fr)', gap: 20, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--n-text-3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                {ult ? <>Resultado em <span style={{ textTransform: 'capitalize' }}>{competenciaLabel(ult.competencia)}</span></> : 'Resultado do mês'}
              </span>
              {ult ? <Selo nivel={ult.nivel} grande /> : <span style={{ fontSize: 13, color: 'var(--n-text-3)' }}>Nenhuma avaliação publicada ainda</span>}
              {ult && (
                <span style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>
                  <b style={{ color: 'var(--n-text)' }}>{ult.avaliados}</b> de {ult.quadro} avaliados · <b style={{ color: 'var(--n-text)' }}>{ult.concluidas}</b> assinadas
                </span>
              )}
              <Legenda />
            </div>
            {/* As colunas pequenas dos seis meses — o desenho da área, em miniatura. */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110 }}>
              {d.resumo.map((r) => (
                <div key={r.competencia} title={`${competenciaLabel(r.competencia)}: ${r.avaliados} avaliados`} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ flex: 1, width: '100%', maxWidth: 34, display: 'flex', flexDirection: 'column-reverse', gap: 2 }}>
                    {r.avaliados === 0
                      ? <span style={{ height: 3, borderRadius: 2, background: 'var(--lv-vazio)' }} />
                      : NIVEIS_UI.filter((n) => r.niveis[n.key] > 0).map((n, i, arr) => (
                        <span key={n.key} style={{ height: `${(r.niveis[n.key] / max) * 100}%`, background: cor(n.key), borderRadius: i === arr.length - 1 ? '4px 4px 0 0' : 0 }} />
                      ))}
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--n-text-3)' }}>{mesCurto(r.competencia)}</span>
                </div>
              ))}
            </div>
          </Link>
        )}
      </Cartao>
    </div>
  )
}
