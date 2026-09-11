'use client'
import { useTalentData } from '@/lib/ui/data'
import { useRecorteSetor } from '@/lib/ui/recorte-setor'
import { turnoverVM } from '@/lib/mock/turnover'
import { TurnoverVisao } from './Visao'

/** O Turnover visto de dentro de um setor — a janela do relatório. */
export default function TurnoverResumo() {
  const data = useTalentData()
  const setor = useRecorteSetor()
  // `data.departments` já é só o setor (ver `RecorteDoSetor`); a taxa dele é a
  // mesma do cartão da lista de departamentos e do relatório.
  const dep = setor ? data.departments.find((d) => d.id === setor.id) : undefined
  return (
    <TurnoverVisao vm={turnoverVM(data)} setor={setor}
      taxa={dep ? { valor: dep.turnover, saidas: dep.saidas12m } : undefined} />
  )
}
