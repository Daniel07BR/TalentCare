'use client'
import { useState } from 'react'
import { faixa, nomeDoPerfil, predominantes, resumoPct, corDe } from '@/lib/disc/calculo'
import { FATORES } from '@/lib/disc/perfis'
import { useDisc, notasDe } from './useDisc'
import { JanelaDisc } from './JanelaDisc'
import d from './disc.module.css'

/* ============================================================
   O BOTÃO DISC da ficha — pedido do dono (22/09/2026).

   ⚠️⚠️ O FUNDO É A PESSOA: as quatro cores do treinamento, cada uma na
   PROPORÇÃO da nota ("consegue deixar o botão colorido com a porcentagem da
   nota de cada um dos itens? aí seria legal"). A maior vem primeiro, à esquerda.
   O selo por cima diz o perfil predominante; empate diz os DOIS nomes ("quem
   teve empate em dois quesitos, o botão tem que ter o nome dos dois").

   ⚠️ Não aparece para quem não é da régua (a rota responde 403), e não sai no
   "Gerar PDF": a impressão só mostra a folha A4 (`FichaImpressa`), e o DISC não
   está nela — pedido expresso do dono.
   ============================================================ */
export function BotaoDisc({ pessoaId }: { pessoaId: string }) {
  const { dados, estado, recarregar } = useDisc(pessoaId)
  const [aberta, setAberta] = useState(false)
  if (estado !== 'ok' || !dados) return null
  if (!dados.atual && !dados.podeRegistrar) return null

  const n = dados.atual ? notasDe(dados.atual) : null
  const pr = n ? predominantes(n) : []
  const nome = nomeDoPerfil(pr)

  return (
    <span className={d.cores} style={{ display: 'inline-flex' }}>
      {n ? (
        <button type="button" className={d.botao} onClick={() => setAberta(true)}
          style={{ background: faixa(n) }}
          title={`Perfil DISC: ${nome} · ${resumoPct(n)} — abrir`}
          aria-label={`Perfil DISC: ${nome}. ${resumoPct(n)}. Abrir detalhes`}>
          <span className={d.selo}><b>DISC</b>{nome}</span>
        </button>
      ) : (
        <button type="button" className={d.vazio} onClick={() => setAberta(true)} title="Ainda sem resultado DISC — registrar">
          <span className={d.pontos} aria-hidden>{FATORES.map((f) => <i key={f} style={{ background: corDe(f) }} />)}</span>
          DISC · registrar resultado
        </button>
      )}
      {aberta && <JanelaDisc key={dados.atual?.id ?? 'novo'} dados={dados} onFechar={() => setAberta(false)} onSalvo={recarregar} />}
    </span>
  )
}
