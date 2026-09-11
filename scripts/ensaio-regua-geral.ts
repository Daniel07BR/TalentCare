/* ENSAIO da RÉGUA GERAL de pontuação (11/09/2026). Não escreve nada.
 *
 *   npx --yes tsx@4 --env-file=.env --tsconfig scripts/tsconfig.json scripts/ensaio-regua-geral.ts
 *
 * Confere:
 *   1. a régua de CADA setor que vale hoje segue os MÚLTIPLOS da régua geral —
 *      dado o atraso do setor, advertência, mês limpo, suspensão e LGPD saem da
 *      fórmula (`pesosDoAtraso`), e base e ponto por minuto são os da geral.
 *      ⚠️ Na v1 (sem medianas guardadas) o ATRASO em si não é provado — conferi-lo
 *      contra ele mesmo seria circular (achado do crítico, 11/09/2026); a partir da
 *      primeira versão salva em Configurações, a mediana gravada prova o atraso;
 *   2. versões geradas pela tela guardam as medianas, e os pesos de cada setor
 *      batem com `pesosDoSetor(geral, mediana)`;
 *   3. o acesso: só ADMIN (dono e Diretoria) lê e grava a régua geral; a gravação
 *      por setor (`/api/servicos/regra`) recusa; a Diretoria não-dona vê só as abas
 *      dela em Configurações; gestor fora;
 *   4. (informativo) o que mudaria em cada setor se a MESMA regra fosse salva hoje.
 */
import { encode } from 'next-auth/jwt'
import { prisma } from '../lib/db/prisma'
import { competenciaAtual, regraDaCompetencia } from '../lib/servicos/pontuacao'
import { pesosDoAtraso, pesosDoSetor, type ParametrosGerais } from '../lib/servicos/regra-geral'
import { catalogoAtividades } from '../lib/servicos/catalogo-atividades'

const BASE = 'http://127.0.0.1:8082'
const cookie = async (u: { id: string; role: string; email?: string | null }) => `authjs.session-token=${await encode({
  token: { sub: u.id, role: u.role, email: u.email ?? undefined, checadoEm: Date.now() }, secret: process.env.AUTH_SECRET!, salt: 'authjs.session-token',
})}`
let conferidos = 0, falhas = 0
const erros: string[] = []
function confere(oque: string, a: unknown, b: unknown) {
  conferidos++
  if (JSON.stringify(a) !== JSON.stringify(b)) { falhas++; erros.push(`${oque}: ${JSON.stringify(a)} × ${JSON.stringify(b)}`) }
}
const param = (g: ParametrosGerais): ParametrosGerais => ({
  base: g.base, fatorPorMinuto: g.fatorPorMinuto, fracaoAtraso: g.fracaoAtraso, multAdvertencia: g.multAdvertencia,
  multMesLimpo: g.multMesLimpo, multSuspensao: g.multSuspensao, multLgpdAdvertencia: g.multLgpdAdvertencia,
  multLgpdSuspensao: g.multLgpdSuspensao, pontosAbonado: g.pontosAbonado, pontosServico: g.pontosServico,
})

async function main() {
  const hoje = competenciaAtual()
  const gerais = await prisma.pontuacaoRegraGeral.findMany({ orderBy: { vigenteDesde: 'desc' } })
  const geral = gerais.find((v) => v.vigenteDesde <= hoje)
  if (!geral) throw new Error('não há régua geral vigente — rode scripts/semear-regra-geral.ts')
  const g = param(geral as unknown as ParametrosGerais)
  console.log(`Régua geral vigente: desde ${geral.vigenteDesde} · atraso ${(g.fracaoAtraso * 100).toFixed(1)}% do mês típico · ${g.fatorPorMinuto} pt/min`)

  // ── 1 e 2. a régua de cada setor segue a geral
  const setores = await prisma.department.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
  const regras = await prisma.pontuacaoRegra.findMany({ include: { itens: true } })
  const medianas = (geral.medianas ?? null) as Record<string, number> | null
  for (const s of setores) {
    const r = regraDaCompetencia(regras.filter((x) => x.departmentId === s.id), hoje)
    if (!r) { confere(`${s.name}: tem régua valendo`, false, true); continue }
    const itens = Object.fromEntries(r.itens.map((i) => [i.evento, i.pontos]))
    const esperado = medianas && medianas[s.id] != null && r.vigenteDesde === geral.vigenteDesde
      ? pesosDoSetor(g, medianas[s.id])
      : pesosDoAtraso(g, -itens.atraso)
    const provaAtraso = !!(medianas && medianas[s.id] != null && r.vigenteDesde === geral.vigenteDesde)
    for (const [k, v] of Object.entries(esperado)) {
      if (k === 'atraso' && !provaAtraso) continue
      if (k === 'servico_concluido' || k === 'atraso_abonado') { if (itens[k] != null) confere(`${s.name} · ${k}`, itens[k], v); continue }
      confere(`${s.name} · ${k}`, itens[k], v)
    }
    confere(`${s.name} · base e ponto por minuto`, [r.base, r.fatorPorMinuto], [g.base, g.fatorPorMinuto])
    console.log(`   ${s.name.padEnd(13)} atraso ${String(itens.atraso).padStart(4)} · advertência ${String(itens.advertencia).padStart(4)} · mês limpo +${itens.mes_sem_ocorrencia} · suspensão ${itens.suspensao} · LGPD ${itens.lgpd_advertencia}/${itens.lgpd_suspensao}  (régua desde ${r.vigenteDesde})`)
  }

  // ── 3. acesso
  const emails = (process.env.TALENTCARE_ADMIN_EMAILS ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', active: true }, select: { id: true, role: true, email: true } })
  const dono = admins.find((u) => u.email && emails.includes(u.email.toLowerCase()))
  const diretor = admins.find((u) => !u.email || !emails.includes(u.email.toLowerCase()))
  const gestor = (await prisma.user.findFirst({ where: { role: 'GESTOR', active: true }, select: { id: true, role: true, email: true } })) ?? undefined
  const ver = async (path: string, u: { id: string; role: string; email?: string | null } | undefined, init?: RequestInit) => {
    if (!u) return { status: 0, texto: '' }
    const r = await fetch(`${BASE}${path}`, { ...init, headers: { ...(init?.headers ?? {}), cookie: await cookie(u), 'Content-Type': 'application/json' }, redirect: 'manual' })
    return { status: r.status, texto: r.status === 200 ? await r.text() : (r.headers.get('location') ?? '') }
  }
  confere('dono lê a régua geral', (await ver('/api/regra-geral', dono)).status, 200)
  if (diretor) confere('Diretoria (não dona) lê a régua geral', (await ver('/api/regra-geral', diretor)).status, 200)
  confere('gestor NÃO lê a régua geral', (await ver('/api/regra-geral', gestor)).status, 403)
  confere('gestor NÃO grava a régua geral', (await ver('/api/regra-geral', gestor, { method: 'POST', body: JSON.stringify({ ...g, vigenteDesde: hoje }) })).status, 403)
  confere('gravação por setor recusa', (await ver('/api/servicos/regra', gestor, { method: 'POST', body: '{}' })).status, 410)
  /* Pontos de atividade não se digitam (pedido do dono, 11/09/2026): em TODO setor, o
     ponto de cada atividade é o calculado (média × ponto por minuto, piso 1).
     ⚠️ Conferido LENDO o catálogo — um POST de teste gravaria, se a trava faltasse. */
  for (const st of setores) {
    const cat = await catalogoAtividades(st.id)
    const fora = cat.atividades.filter((x) => x.pontos !== x.pontosAuto || x.pontosAjustados)
    confere(`${st.name}: pontos de atividade = calculados`, fora.map((x) => x.chave), [])
  }
  const cfgDono = await ver('/configuracoes', dono)
  confere('Configurações (dono): régua e as abas de cadastro', [cfgDono.status, cfgDono.texto.includes('Régua de pontuação'), cfgDono.texto.includes('Casar ponto')], [200, true, true])
  if (diretor) {
    const cfgDir = await ver('/configuracoes', diretor)
    confere('Configurações (Diretoria): só régua e fontes', [cfgDir.status, cfgDir.texto.includes('Régua de pontuação'), cfgDir.texto.includes('Casar ponto')], [200, true, false])
    const escondida = await ver('/configuracoes?aba=usuarios', diretor)
    confere('Diretoria pedindo a aba de usuários cai na régua', escondida.texto.includes('Todos os funcionários sincronizados'), false)
  }
  // A planilha de serviços: só dentro do setor, e só Gestta (pedido do dono, 11/09/2026).
  const legal = setores.find((x) => x.name === 'Legal')!
  const semSetor = await ver('/servicos', dono)
  confere('/servicos sem setor explica onde enviar', [semSetor.status, semSetor.texto.includes('dentro do relatório de cada setor')], [200, true])
  const comSetor = await ver(`/servicos?setor=${legal.id}`, dono)
  confere('/servicos do setor diz que só aceita Gestta', [comSetor.status, comSetor.texto.includes('apenas a planilha exportada do Gestta')], [200, true])
  const painel = await ver('/dashboard', dono)
  confere('menu sem "Serviços do setor"', painel.texto.includes('href="/servicos"'), false)
  const cfgGestor = await ver('/configuracoes', gestor)
  confere('gestor fora de Configurações', cfgGestor.status === 200, false)

  // ── 4. informativo: a mesma regra, salva hoje
  const ens = await ver('/api/regra-geral', dono, { method: 'POST', body: JSON.stringify({ ...g, ensaio: true }) })
  if (ens.status === 200) {
    const d = JSON.parse(ens.texto) as { referencia: string; medianaCasa: number; linhas: { nome: string; mediana: number; usouCasa: boolean; pesos: Record<string, number>; atual: Record<string, number> | null }[] }
    const mudam = d.linhas.filter((l) => l.atual && l.atual.atraso !== l.pesos.atraso)
    console.log(`\n(informativo) Se a MESMA regra fosse salva hoje, com o mês típico de ${d.referencia} (casa: ${d.medianaCasa}):`)
    for (const l of mudam) console.log(`   ${l.nome.padEnd(13)} atraso ${l.atual!.atraso} → ${l.pesos.atraso}  (mês típico ${l.mediana}${l.usouCasa ? ', o da casa' : ''})${l.usouCasa && l.atual!.atraso === -50 ? '  ⚠️ hoje é a CÓPIA DO LEGAL — fora da fórmula até a 1ª versão salva' : ''}`)
    if (!mudam.length) console.log('   nenhum setor mudaria.')
  } else confere('prévia da régua responde', ens.status, 200)

  if (erros.length) { console.log('\n❌ divergências:'); for (const e of erros) console.log(`   ${e}`) }
  console.log(`\n${falhas ? '❌' : '✅'} ${conferidos} conferências, ${falhas} divergências`)
  await prisma.$disconnect()
  process.exit(falhas ? 1 : 0)
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(2) })
