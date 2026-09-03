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

type Nomeada = { id: string; nome: string; nota: number }

const primeiros = (l: Nomeada[]) =>
  l.slice(0, 3).map((p) => p.nome.split(' ')[0]).join(', ') + (l.length > 3 ? ` e mais ${l.length - 3}` : '')

export function Atencao({ m, abaixoDoEsperado, atendeEmParte, ehAdmin, onIr }: {
  m: DeptMetrics
  abaixoDoEsperado: Nomeada[]
  atendeEmParte: Nomeada[]
  /** Quem lê é da Diretoria? Muda o que se pode cobrar dele. */
  ehAdmin: boolean
  onIr: (destino: string) => void
}) {
  const itens: Item[] = []
  const a = m.avaliacao
  const faltam = Math.max(0, a.avaliaveis - a.publicadas)

  /* ⚠️⚠️ Setor cuja avaliação CABE À DIRETORIA não gera cobrança para o gestor:
     ele não pode publicar (a régua responde 403) e o alerta ficaria aceso para
     sempre. Quem é da Diretoria continua vendo, porque para ele É ação. */
  const cobravel = !m.setor.pelaDiretoria || ehAdmin
  if (faltam > 0 && cobravel) {
    itens.push({
      chave: 'avaliar', Icone: ClipboardCheck, peso: 90,
      valor: String(faltam),
      titulo: faltam === 1 ? 'pessoa sem avaliação' : 'pessoas sem avaliação',
      detalhe: `competência de ${competenciaLabel(a.competencia)}`,
      cor: 'var(--warning)',
    })
  }
  // ⚠️ Duas faixas SEPARADAS, porque a escala da casa separa: 0–4 é "abaixo do
  // esperado" e 5–6 é "atende em parte". Juntar as duas em vermelho acusava de
  // "abaixo do esperado" quem a própria régua diz que atende, em parte.
  if (abaixoDoEsperado.length > 0) {
    itens.push({
      chave: 'abaixo', Icone: TrendingDown, peso: 100,
      valor: String(abaixoDoEsperado.length),
      titulo: abaixoDoEsperado.length === 1 ? 'nota abaixo do esperado' : 'notas abaixo do esperado',
      // Nomear é o que transforma o número em ação — sem os nomes, o gestor
      // teria de caçar quem são na tabela de baixo.
      detalhe: primeiros(abaixoDoEsperado),
      cor: 'var(--danger)',
    })
  }
  if (atendeEmParte.length > 0) {
    itens.push({
      chave: 'abaixo', Icone: TrendingDown, peso: 60,
      valor: String(atendeEmParte.length),
      titulo: atendeEmParte.length === 1 ? 'atende em parte' : 'atendem em parte',
      detalhe: primeiros(atendeEmParte),
      cor: 'var(--warning)',
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
  /* ⚠️ Em equipe pequena a TAXA não é taxa: Programação com 1 pessoa e um
     antecessor daria 50%, vermelho, "de rotatividade" — não é rotatividade, é
     uma pessoa. Abaixo de 5 de base, mostra-se a CONTAGEM. */
  const basePequena = m.equipe.ativos + m.turnover.saidas12m < 5
  if (m.turnover.taxa12m >= 20 && !basePequena) {
    itens.push({
      chave: 'turnover', Icone: LogOut, peso: 70,
      valor: `${m.turnover.taxa12m}%`,
      titulo: 'de rotatividade',
      detalhe: `${m.turnover.saidas12m} ${m.turnover.saidas12m === 1 ? 'saída' : 'saídas'} em 12 meses`,
      cor: 'var(--danger)',
    })
  } else if (basePequena && m.turnover.saidas12m > 0) {
    itens.push({
      chave: 'turnover', Icone: LogOut, peso: 50,
      valor: String(m.turnover.saidas12m),
      titulo: m.turnover.saidas12m === 1 ? 'saída em 12 meses' : 'saídas em 12 meses',
      detalhe: `equipe de ${m.equipe.ativos} — pequena demais para uma taxa`,
      cor: 'var(--warning)',
    })
  }

  itens.sort((x, y) => y.peso - x.peso)

  if (itens.length === 0) {
    return (
      <div className="tc-card cpop" style={{ background: 'var(--surface)', border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)', borderRadius: 'var(--radius)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 13 }}>
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
      {/* ⚠️ Um alerta só ocupava a largura toda (740px para um "2 atrasos" de
          25px). `auto-fit` com teto deixa o cartão do tamanho do que ele diz. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(178px, 250px))', gap: 10 }}>
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
