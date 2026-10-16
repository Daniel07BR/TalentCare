'use client'
import { BookUser, Bike, DoorOpen, PhoneIncoming, PhoneOutgoing, type LucideIcon } from 'lucide-react'
import type { Numeros } from '@/lib/recepcao'
import type { Tom } from './tipos'

/* ============================================================
   ATENDIMENTO DA RECEPÇÃO — as peças comuns ao card do setor e ao da ficha (16/10/2026).

   ⚠️ Os cinco números, a cor de cada um e o texto de apoio moram AQUI: o setor e a ficha
   mostram a mesma coisa com o mesmo nome, e a cor da barra da pessoa é a do azulejo.
   ============================================================ */

export type ItemRecepcao = {
  chave: 'recebidas' | 'feitas' | 'visitas' | 'deliveries' | 'contatos'
  rotulo: string
  curto: string
  Icone: LucideIcon
  tom: Tom
  valor: (x: Numeros) => number | null
  nota: (x: Numeros) => string | null
}

const min = (v: number | null) => (v == null ? null : v < 60 ? `${v} min` : `${Math.floor(v / 60)}h${String(v % 60).padStart(2, '0')}`)
const juntar = (...p: (string | null | false)[]) => p.filter(Boolean).join(' · ') || null

export const ITENS_RECEPCAO: ItemRecepcao[] = [
  {
    chave: 'recebidas', rotulo: 'Ligações recebidas', curto: 'Recebidas', Icone: PhoneIncoming, tom: 'blue',
    valor: (x) => x.recebidas, nota: () => 'atendidas e passadas adiante',
  },
  {
    chave: 'feitas', rotulo: 'Ligações feitas', curto: 'Feitas', Icone: PhoneOutgoing, tom: 'green',
    valor: (x) => x.feitas,
    nota: (x) => juntar(
      `${x.naoRealizadas} não ${x.naoRealizadas === 1 ? 'realizada' : 'realizadas'}`,
      x.esperaLigacaoMin != null && `espera média ${min(x.esperaLigacaoMin)}`,
      x.contatosEmLote > 0 && `+${x.contatosEmLote} no contato em lote`,
    ),
  },
  {
    chave: 'visitas', rotulo: 'Visitas recebidas', curto: 'Visitas', Icone: DoorOpen, tom: 'purple',
    valor: (x) => x.visitas, nota: () => 'gente atendida no escritório',
  },
  {
    chave: 'deliveries', rotulo: 'Delivery recebido', curto: 'Delivery', Icone: Bike, tom: 'orange',
    valor: (x) => x.deliveries,
    nota: (x) => (x.esperaDeliveryMin != null ? `do pedido à chegada: ${min(x.esperaDeliveryMin)} em média` : 'marcados como chegou'),
  },
  {
    chave: 'contatos', rotulo: 'Contatos do CIDE', curto: 'Contatos', Icone: BookUser, tom: 'pink',
    valor: (x) => x.contatos?.atualizados ?? null,
    nota: (x) => (x.contatos ? `${x.contatos.novos} novos · ${x.contatos.removidos} removidos` : 'sem medição no período'),
  },
]

/** O que a pessoa fez "na mão" na Recepção — a largura da barra. Contatos do CIDE ficam
 *  na coluna à parte: são centenas num dia de revisão e engoliriam o resto da barra. */
export const atendimentos = (x: Numeros) => x.recebidas + x.feitas + x.visitas + x.deliveries

/** Fatia do setor, em %. Nulo quando o setor não tem o número. */
export const parte = (meu: number | null, setor: number | null) =>
  meu == null || !setor ? null : Math.round((meu / setor) * 100)

export const fmt = (v: number | null) => (v == null ? '—' : v.toLocaleString('pt-BR'))
