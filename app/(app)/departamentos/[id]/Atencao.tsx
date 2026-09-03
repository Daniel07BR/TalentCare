'use client'
import { AlertTriangle, CheckCircle2, ClipboardCheck, AlarmClock, LogOut, TrendingDown } from 'lucide-react'
import type { DeptMetrics } from '@/lib/ui/dept-period'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'

/* ============================================================
   O PONTO DE ENTRADA DO Z — o que exige ação neste setor.

   ⚠️⚠️ Fica no canto superior esquerdo porque é ali que o olho começa, e porque
   um relatório de setor é lido por quem PODE AGIR sobre ele. Score e headcount
   não pedem nada de ninguém; "quatro pessoas sem avaliação e o prazo virou
   ontem" pede.

   ⚠️ Só aparece o que EXISTE. Cartão de alerta zerado ("0 advertências") ensina
   a ignorar a faixa inteira — e no dia em que houver uma, ela vai estar no meio
   de cinco zeros. Setor sem nada mostra um estado próprio, verde.
   ============================================================ */

type Item = {
  chave: string
  Icone: typeof AlertTriangle
  valor: string
  titulo: string
  detalhe: string
  cor: string
  /** Quanto mais alto, mais para a esquerda. Nem todo alerta pesa igual. */
  peso: number
}

export function Atencao({ m, abaixoDoEsperado, onIr }: {
  m: DeptMetrics
  abaixoDoEsperado: { id: string; nome: string; nota: number }[]
  onIr: (destino: string) => void
}) {
  const itens: Item[] = []
  const a = m.avaliacao
  const faltam = Math.max(0, a.avaliaveis - a.publicadas)

  if (faltam > 0) {
    itens.push({
      chave: 'avaliar', Icone: ClipboardCheck, peso: 90,
      valor: String(faltam),
      titulo: faltam === 1 ? 'pessoa sem avaliação' : 'pessoas sem avaliação',
      detalhe: `competência de ${competenciaLabel(a.competencia)}`,
      cor: 'var(--warning)',
    })
  }
  if (abaixoDoEsperado.length > 0) {
    itens.push({
      chave: 'abaixo', Icone: TrendingDown, peso: 100,
      valor: String(abaixoDoEsperado.length),
      titulo: abaixoDoEsperado.length === 1 ? 'nota abaixo do esperado' : 'notas abaixo do esperado',
      // Nomear é o que transforma o número em ação — sem os nomes, o gestor
      // teria de caçar quem são na tabela de baixo.
      detalhe: abaixoDoEsperado.slice(0, 3).map((p) => p.nome.split(' ')[0]).join(', ')
        + (abaixoDoEsperado.length > 3 ? ` e mais ${abaixoDoEsperado.length - 3}` : ''),
      cor: 'var(--danger)',
    })
  }
  if (m.assiduidade.advertencias > 0) {
    itens.push({
      chave: 'advert', Icone: AlertTriangle, peso: 80,
      valor: String(m.assiduidade.advertencias),
      titulo: m.assiduidade.advertencias === 1 ? 'advertência' : 'advertências',
      detalhe: 'no período',
      cor: 'var(--danger)',
    })
  }
  if (m.assiduidade.atrasos > 0) {
    itens.push({
      chave: 'atraso', Icone: AlarmClock, peso: 40,
      valor: String(m.assiduidade.atrasos),
      titulo: m.assiduidade.atrasos === 1 ? 'atraso' : 'atrasos',
      detalhe: `${m.assiduidade.minutos} min somados`,
      cor: 'var(--warning)',
    })
  }
  // ⚠️ Turnover vira ALERTA só acima de 20% em 12 meses. Abaixo disso ele é um
  // dado, e dado não pertence à faixa de ação — senão todo setor com uma saída
  // acende luz e a faixa perde o sentido.
  if (m.turnover.taxa12m >= 20) {
    itens.push({
      chave: 'turnover', Icone: LogOut, peso: 70,
      valor: `${m.turnover.taxa12m}%`,
      titulo: 'de rotatividade',
      detalhe: `${m.turnover.saidas12m} ${m.turnover.saidas12m === 1 ? 'saída' : 'saídas'} em 12 meses`,
      cor: 'var(--danger)',
    })
  }

  itens.sort((x, y) => y.peso - x.peso)

  if (itens.length === 0) {
    return (
      <div className="tc-card cpop" style={{ background: 'var(--surface)', border: '1px solid var(--success)33', borderRadius: 'var(--radius)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 13 }}>
        <CheckCircle2 size={22} color="var(--success)" />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Setor em dia</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
            Nada pendente no período: avaliações publicadas, sem advertência e sem atraso registrado.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 9 }}>
        Precisa de atenção
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(itens.length, 3)}, 1fr)`, gap: 10 }}>
        {itens.map((it, i) => (
          <button
            key={it.chave}
            onClick={() => onIr(it.chave)}
            className="tc-card cpop"
            style={{
              animationDelay: `${i * 60}ms`,
              textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderLeft: `3px solid ${it.cor}`, borderRadius: 'var(--radius)', padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <it.Icone size={15} color={it.cor} />
              <span className="cnum" style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-1px', color: it.cor, lineHeight: 1 }}>{it.valor}</span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{it.titulo}</div>
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{it.detalhe}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
