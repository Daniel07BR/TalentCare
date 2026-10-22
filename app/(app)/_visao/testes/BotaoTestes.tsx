'use client'
import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { NOME_DO_NIVEL, nivelGeral, COR_DO_NIVEL } from '@/lib/testes/atencao'
import { useAtencao } from './useAtencao'
import { JanelaAtencao } from './JanelaAtencao'
import { JanelaCodigo } from './JanelaCodigo'
import p from '../personalidade/personalidade.module.css'

/* ============================================================
   ATENÇÃO + CÓDIGO DOS TESTES na ficha (22/10/2026), depois do DISC e da
   Personalidade. O botão Atenção só existe com resultado (ela entra só pelo
   código); "Código dos testes" aparece para quem pode lançar e grava os três
   testes de uma vez. Mesma régua do DISC, fora do PDF.
   ============================================================ */
export function BotaoTestes({ pessoaId }: { pessoaId: string }) {
  const { dados, estado } = useAtencao(pessoaId)
  const [aberta, setAberta] = useState<null | 'atencao' | 'codigo'>(null)
  if (estado !== 'ok' || !dados) return null
  const a = dados.atual
  if (!a && !dados.podeRegistrar) return null
  const geral = a ? nivelGeral(a.busca.nivel, a.conferencia.nivel) : null

  return (
    <>
      {a && geral && (
        <button type="button" className={p.botao} onClick={() => setAberta('atencao')}
          title={`Atenção: busca ${NOME_DO_NIVEL[a.busca.nivel]} (${a.busca.acerto}%) · conferência ${NOME_DO_NIVEL[a.conferencia.nivel]} (${a.conferencia.acerto}%) — abrir`}>
          <span className={p.rotulo}>Atenção</span>
          <span style={{ color: COR_DO_NIVEL[geral], fontWeight: 900 }}>{NOME_DO_NIVEL[geral]}</span>
        </button>
      )}
      {dados.podeRegistrar && (
        <button type="button" className={p.vazio} onClick={() => setAberta('codigo')}
          title="Lançar o código que aparece no fim do teste: grava DISC, personalidade e atenção de uma vez">
          <KeyRound size={14} /> Código dos testes
        </button>
      )}
      {aberta === 'atencao' && (
        <JanelaAtencao dados={dados} onFechar={() => setAberta(null)}
          onCodigo={dados.podeRegistrar ? () => setAberta('codigo') : null} />
      )}
      {aberta === 'codigo' && <JanelaCodigo pessoaId={pessoaId} nome={dados.pessoa.nome} onFechar={() => setAberta(null)} />}
    </>
  )
}
