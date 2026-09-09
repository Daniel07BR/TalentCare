// Sync das MEDIDAS DE LGPD (advertência e suspensão por vazamento de dados)
// do Nexus → eventos de disciplina do TalentCare.
//
// ⚠️⚠️ POR QUE ESTE SCRIPT EXISTE, se já há push. O Nexus empurra a medida no
// instante em que ela é registrada (`systems.lgpd_push_url`). Mas push que
// falha, falha CALADO: serviço fora do ar durante o registro, rede caída, rota
// mudada. O contrato de integração da casa é explícito — o push é o caminho
// rápido, o sync é quem garante que o espelho converge. Foi a lição dos oito
// espelhos: espelho sem quem confira o total vira espelho parado com cara de
// saudável.
//
// ⚠️⚠️ ELE NÃO REIMPLEMENTA A GRAVAÇÃO. Passa cada medida pelo MESMO receptor
// que o push usa (`POST /api/integrations/nexus-lgpd`), que chama `lib/lgpd.ts`.
// Um segundo caminho de escrita concordaria com o primeiro até o dia em que um
// dos dois mudasse — e o que se grava aqui é falta grave na ficha de gente.
//
// Rode: node --env-file=.env run-lgpd-sync.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.NEXUS_BASE_URL
const KEY = process.env.NEXUS_API_KEY
const PORT = process.env.PORT || '8082'
const SOURCE = 'lgpd'

async function main() {
  if (!BASE || !KEY) throw new Error('NEXUS_BASE_URL/NEXUS_API_KEY ausentes')
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })

  /* ⚠️ A JANELA VOLTA UM DIA do watermark, e a rota filtra por `updated_at` (não
     pela data do fato): uma medida ANTIGA corrigida hoje precisa chegar, e ela
     nunca chegaria por um filtro na data do incidente. `--tudo` relê o acervo
     inteiro — é o que se roda quando se desconfia do espelho. */
  const tudo = process.argv.includes('--tudo')
  let from = null
  if (!tudo && wm) {
    const d = new Date(wm.lastSyncedAt); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 1)
    from = d
  }

  const qs = from ? `?since=${encodeURIComponent(from.toISOString())}` : ''
  const res = await fetch(`${BASE}/api/integrations/lgpd-medidas${qs}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`Nexus ${res.status}: ${await res.text()}`)
  const data = await res.json()

  let gravadas = 0, adiadas = 0, recusadas = 0
  for (const m of data.medidas ?? []) {
    const r = await fetch(`http://127.0.0.1:${PORT}/api/integrations/nexus-lgpd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Nexus-Lgpd-Key': KEY },
      body: JSON.stringify({ event: 'medida', medida: m }),
    })
    const j = await r.json().catch(() => ({}))
    if (j.gravada) gravadas++
    else if (j.ok) adiadas++            // pessoa ainda não sincronizada aqui
    else recusadas++
  }

  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })

  /* ⚠️⚠️ `semVinculo` NÃO é ruído de log: são as medidas do acervo que não têm
     a quem creditar (ex-funcionárias que o import do GPI trouxe e que nunca
     estiveram no Nexus). Elas existem, são graves, e NÃO entram na nota de
     ninguém. Um total que só conta o que entrou faria o espelho parecer
     completo. */
  console.log(JSON.stringify({
    recebidas: (data.medidas ?? []).length,
    gravadas, adiadas, recusadas,
    semVinculoNaOrigem: data.semVinculo ?? null,
    janela: from ? from.toISOString() : 'tudo',
  }))
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
