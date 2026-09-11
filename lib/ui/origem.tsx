'use client'
import { createContext, useContext, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'

/* ============================================================
   DE ONDE A PESSOA VEIO — o "voltar" que volta para onde se estava.

   ⚠️⚠️ Pedido do dono (11/09/2026): a ficha do funcionário dizia sempre
   "‹ Voltar ao diretório", e ele tinha chegado nela pelo relatório do Legal.
   O botão levava para uma tela que ele não visitou e o fazia perder o setor,
   a busca e a aba que estava olhando. A ficha tem ~35 portas de entrada
   (relatório de setor, ranking, avaliação, entregas, cada painel de sistema…).

   ⚠️ Por que um RASTRO no layout, e não `?de=` em cada link: seriam 35 links
   para lembrar, e a porta nº 36 nasceria com o botão errado sem nada acusar.
   Aqui toda porta — inclusive a que ainda não existe — é coberta de graça.

   ⚠️ O rastro é atualizado DURANTE a renderização (o padrão do React para
   "ajustar estado quando uma prop muda"), não num `useEffect`: com efeito, a
   ficha pintaria primeiro "Voltar ao diretório" e trocaria o texto um instante
   depois.
   ============================================================ */

type Rotulo = { href: string; label: string }

const Ctx = createContext<{ anterior: string | null; rotulos: Rotulo[] }>({ anterior: null, rotulos: [] })

/** `rotulos` são os itens do MENU — o nome da tela vem de um lugar só. */
export function OrigemProvider({ rotulos, children }: { rotulos: Rotulo[]; children: React.ReactNode }) {
  const pathname = usePathname()
  // ⚠️ Estado inicial já com a rota atual: na primeira pintura (e no servidor)
  // não há de onde ter vindo, e um `setState` aqui seria atualização à toa.
  const [rastro, setRastro] = useState<{ atual: string; anterior: string | null }>(() => ({ atual: pathname, anterior: null }))
  if (rastro.atual !== pathname) setRastro({ atual: pathname, anterior: rastro.atual })
  return <Ctx.Provider value={{ anterior: rastro.anterior, rotulos }}>{children}</Ctx.Provider>
}

/**
 * O botão de voltar de uma tela de detalhe.
 *
 * - Veio de outra tela DO SISTEMA nesta aba → `history.back()`, e o texto diz
 *   para onde. Voltar pelo histórico (e não `push` da rota) devolve a tela como
 *   ela estava: a rolagem, a busca digitada, a aba escolhida.
 * - Não há de onde ter vindo (abriu pelo link, recarregou a página) → o destino
 *   fixo de antes. ⚠️ Nesse caso `back()` tiraria a pessoa do sistema, ou não
 *   faria nada numa aba nova.
 */
export function useVoltar(padrao: Rotulo): Rotulo & { ir: () => void } {
  const { anterior, rotulos } = useContext(Ctx)
  const pathname = usePathname()
  const router = useRouter()
  const data = useTalentData()

  // ⚠️ A mesma tela não é origem: sem isto, trocar de pessoa dentro da ficha
  // não mudaria o rótulo, mas também não há "de onde" que não seja ela mesma.
  if (!anterior || anterior === pathname) return { ...padrao, ir: () => router.push(padrao.href) }

  const label = rotuloDe(anterior, rotulos, data)
  return { href: anterior, label, ir: () => router.back() }
}

function rotuloDe(
  path: string,
  rotulos: Rotulo[],
  data: { departments: { id: string; nome: string }[]; employees: { id: string; nome: string }[] },
): string {
  const [, raiz, id] = path.split('/')
  const setor = (x?: string) => data.departments.find((d) => d.id === x)?.nome
  const pessoa = (x?: string) => data.employees.find((e) => e.id === x)?.nome.split(' ')[0]

  // Telas de DETALHE: o nome do que se estava vendo diz mais que o da seção.
  if (raiz === 'departamentos' && id) return setor(id) ? `Voltar ao relatório de ${setor(id)}` : 'Voltar ao relatório do setor'
  if (raiz === 'avaliacoes' && id) return pessoa(id) ? `Voltar à avaliação de ${pessoa(id)}` : 'Voltar à avaliação'
  if (raiz === 'funcionarios' && id) return pessoa(id) ? `Voltar à ficha de ${pessoa(id)}` : 'Voltar à ficha anterior'
  if (raiz === 'funcionarios') return 'Voltar ao diretório'
  if (raiz === 'entregas') return 'Voltar à área da mensageria'

  // ⚠️ "para", e não "ao/à": o artigo muda com o nome ("ao Ranking", "às
  // Avaliações", "à Assiduidade") e a lista vem do menu, que não sabe o gênero.
  const doMenu = rotulos.find((r) => r.href === `/${raiz}`)
  return doMenu ? `Voltar para ${doMenu.label}` : 'Voltar'
}
