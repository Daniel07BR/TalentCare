'use client'
import { useState } from 'react'
import { corDaLetra, linhaDaPersonalidade, tituloDoTipo } from '@/lib/personalidade/calculo'
import { usePersonalidade } from './usePersonalidade'
import { JanelaPersonalidade } from './JanelaPersonalidade'
import p from './personalidade.module.css'

/* ============================================================
   O BOTÃO DA PERSONALIDADE na ficha, ao lado do DISC (22/10/2026).

   O tipo em quatro cores (uma por eixo) e o nome da casa ("INFP · Idealista").
   Mesma regra do botão do DISC: some para quem não é da régua (a rota responde
   403) e não sai no "Gerar PDF".
   ============================================================ */
export function BotaoPersonalidade({ pessoaId }: { pessoaId: string }) {
  const { dados, estado, recarregar } = usePersonalidade(pessoaId)
  const [aberta, setAberta] = useState(false)
  if (estado !== 'ok' || !dados) return null
  if (!dados.atual && !dados.podeRegistrar) return null
  const a = dados.atual

  return (
    <>
      {a ? (
        <button type="button" className={p.botao} onClick={() => setAberta(true)}
          title={`Personalidade: ${a.tipo} · ${tituloDoTipo(a.tipo)} · ${linhaDaPersonalidade(a)} — abrir`}
          aria-label={`Personalidade: ${a.tipo}, ${tituloDoTipo(a.tipo)}. Abrir detalhes`}>
          <span className={p.rotulo}>Personalidade</span>
          <span className={p.tipo}>{a.tipo.split('').map((l, i) => <span key={i} style={{ color: corDaLetra(i) }}>{l}</span>)}</span>
          {tituloDoTipo(a.tipo)}
        </button>
      ) : (
        <button type="button" className={p.vazio} onClick={() => setAberta(true)} title="Ainda sem teste de personalidade — registrar">
          <span className={p.pontos} aria-hidden>{[0, 1, 2, 3].map((i) => <i key={i} style={{ background: corDaLetra(i) }} />)}</span>
          Personalidade · registrar resultado
        </button>
      )}
      {aberta && <JanelaPersonalidade key={a?.id ?? 'novo'} dados={dados} onFechar={() => setAberta(false)} onSalvo={recarregar} />}
    </>
  )
}
