'use client'
import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import type { useEmployeeTimeline } from '@/lib/ui/employee-timeline'
import { Cartao, LinkAcao } from '../../../_visao/ui'

type Timeline = ReturnType<typeof useEmployeeTimeline>

/* Quantos eventos aparecem antes do "ver todos": a linha do tempo de um mês cheio
   passa de cem, e empurrava a ficha inteira para baixo. */
const INICIAL = 12

export function LinhaDoTempo({ events, estado, periodo }: { events: Timeline['events']; estado: Timeline['estado']; periodo: string }) {
  const [tudo, setTudo] = useState(false)
  useEffect(() => { setTudo(false) }, [periodo])
  const lista = events ?? []
  const visiveis = tudo ? lista : lista.slice(0, INICIAL)
  const caixa = (texto: string) => (
    <div style={{ fontSize: 12.5, color: 'var(--n-text-2)', background: 'var(--n-card-2)', borderRadius: 10, padding: '12px 14px' }}>{texto}</div>
  )

  return (
    <Cartao titulo="Linha do tempo" Icone={History} corIcone="var(--n-purple)" sub={`O que aconteceu, dia a dia, em todos os sistemas · ${periodo}`}
      acao={lista.length > INICIAL ? <LinkAcao onClick={() => setTudo((v) => !v)}>{tudo ? 'Mostrar menos' : `Ver todos (${lista.length})`}</LinkAcao> : undefined}>
      {/* ⚠️ "Sem atividade" só no estado `ok`: um 403 ou falha de rede não pode virar um fato sobre a pessoa. */}
      {estado === 'carregando' ? caixa('Carregando o período…')
        : estado === 'negado' ? caixa('Você não tem acesso à atividade desta pessoa.')
        : estado === 'erro' ? caixa('Não deu para carregar a linha do tempo. Recarregue a página.')
        : lista.length === 0 ? caixa('Sem atividade registrada nos sistemas integrados neste período.')
        : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {visiveis.map((ev, i) => (
              <li key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: ev.color, boxShadow: `0 0 0 3px color-mix(in srgb, ${ev.color} 22%, transparent)`, marginTop: 4 }} />
                  {i < visiveis.length - 1 && <span style={{ width: 2, flex: 1, background: 'var(--n-border)', margin: '4px 0' }} />}
                </div>
                <div style={{ paddingBottom: 14, flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: ev.color, background: `color-mix(in srgb, ${ev.color} 13%, transparent)`, padding: '2px 8px', borderRadius: 6 }}>{ev.system}</span>
                    <span style={{ fontSize: 11, color: 'var(--n-text-3)' }}>{ev.when}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-text)' }}>{ev.action}</div>
                  {ev.detail && <div style={{ fontSize: 12, color: 'var(--n-text-2)', marginTop: 1 }}>{ev.detail}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
    </Cartao>
  )
}
