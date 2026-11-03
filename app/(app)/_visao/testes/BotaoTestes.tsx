'use client'
import { useState } from 'react'
import { Download, KeyRound, UserSearch } from 'lucide-react'
import { NOME_DO_NIVEL, nivelGeral, COR_DO_NIVEL } from '@/lib/testes/atencao'
import { useAtencao } from './useAtencao'
import { JanelaAtencao } from './JanelaAtencao'
import { JanelaCodigo, NOME_DO_ARQUIVO, PAGINA_DO_TESTE } from './JanelaCodigo'
import { JanelaEntrevista } from './JanelaEntrevista'
import p from '../personalidade/personalidade.module.css'

/* ============================================================
   ATENÇÃO + CÓDIGO DOS TESTES na ficha (22/10/2026), depois do DISC e da
   Personalidade. O botão Atenção só existe com resultado (ela entra só pelo
   código); "Código dos testes" aparece para quem pode lançar e grava os três
   testes de uma vez. Mesma régua do DISC, fora do PDF.

   BAIXAR OS TESTES e PUXAR DA ENTREVISTA (03/11/2026, Daniel: "todos os gestores e sub
   deveriam na parte superior dos resultados dos usuarios ter opção de baixar o arquivo",
   para os funcionários antigos; e o resultado de quem já fez na entrevista, sem redigitar).
   ============================================================ */
export function BotaoTestes({ pessoaId }: { pessoaId: string }) {
  const { dados, estado } = useAtencao(pessoaId)
  const [aberta, setAberta] = useState<null | 'atencao' | 'codigo' | 'entrevista'>(null)
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
      {dados.podeRegistrar && (
        <button type="button" className={p.vazio} onClick={() => setAberta('entrevista')}
          title="Buscar no Fluxo o resultado que a pessoa fez na entrevista de emprego: mostra as entrevistas que você fez">
          <UserSearch size={14} /> Puxar da entrevista
        </button>
      )}
      {dados.podeRegistrar && (
        <a href={PAGINA_DO_TESTE} download={NOME_DO_ARQUIVO} className={p.vazio} style={{ textDecoration: 'none' }}
          title="Baixar a página dos testes para quem ainda não fez: abre com dois cliques, sem internet. No fim, a pessoa te passa o código">
          <Download size={14} /> Baixar os testes
        </a>
      )}
      {aberta === 'atencao' && (
        <JanelaAtencao dados={dados} onFechar={() => setAberta(null)}
          onCodigo={dados.podeRegistrar ? () => setAberta('codigo') : null} />
      )}
      {aberta === 'codigo' && <JanelaCodigo pessoaId={pessoaId} nome={dados.pessoa.nome} onFechar={() => setAberta(null)} />}
      {aberta === 'entrevista' && <JanelaEntrevista pessoaId={pessoaId} nome={dados.pessoa.nome} onFechar={() => setAberta(null)} />}
    </>
  )
}
