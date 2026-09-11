/* Registra a PRIMEIRA versão da régua geral: a regra que o dono aprovou em
 * 09/09/2026 e que gerou a régua de agosto de todos os setores.
 *
 *   npx --yes tsx@4 --env-file=.env --tsconfig scripts/tsconfig.json scripts/semear-regra-geral.ts            (ensaio)
 *   npx --yes tsx@4 --env-file=.env --tsconfig scripts/tsconfig.json scripts/semear-regra-geral.ts --gravar
 *
 * ⚠️⚠️ SÓ REGISTRA, não gera nada: a régua de cada setor de 2026-08 já existe (é
 * a que produziu os 61 meses gravados de agosto), e regerá-la agora mexeria nos
 * pesos de carona — a mediana dos setores andou desde 09/09 (a do Entregas subiu
 * com a reconciliação da Gerência). A versão entra com a mesma vigência (2026-08)
 * e os mesmos números: atraso = 50 ÷ 700 (Legal) = 7,1% do mês típico do setor;
 * advertência 1,5×; mês limpo 2×; suspensão 2× a advertência; LGPD 3× e 6×.
 * `medianas` fica vazio: as medianas de 09/09 não foram guardadas — por isso a
 * régua geral nasce guardando-as a partir da próxima versão.
 */
import { prisma } from '../lib/db/prisma'
import { PARAMETROS_DE_09_09 } from '../lib/servicos/regra-geral'

/* ⚠️ Corrigido depois do crítico (11/09/2026): a primeira redação dizia que a
   régua de agosto de CADA setor saiu desta regra — seis não saíram. */
export const MOTIVO_V1 = 'Registro da regra aprovada em 09/09/2026 (atraso = 50 ÷ mediana 700 do Legal = 7,1% do mês típico do setor). A régua de agosto de 10 setores saiu dela; Cozinha, Diretoria, Limpeza, Marketing, Pousada e Programação (ninguém com nota em 09/09) seguem com a cópia do Legal até a primeira versão salva em Configurações. Nada foi regerado ao registrar.'

async function main() {
  const gravar = process.argv.includes('--gravar')
  const ja = await prisma.pontuacaoRegraGeral.findUnique({ where: { vigenteDesde: '2026-08' } })
  if (ja) { console.log('Já existe a versão 2026-08 da régua geral — nada a fazer.'); return }
  const emails = (process.env.TALENTCARE_ADMIN_EMAILS ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
  const dono = await prisma.user.findFirst({ where: { email: { in: emails }, active: true, name: { startsWith: 'Daniel' } }, select: { id: true, name: true } })
    ?? await prisma.user.findFirst({ where: { email: { in: emails }, active: true }, select: { id: true, name: true } })
  if (!dono) throw new Error('sem dono na allowlist')
  const dados = {
    vigenteDesde: '2026-08', ...PARAMETROS_DE_09_09, competenciaReferencia: '2026-08', criadoPor: dono.id,
    motivo: MOTIVO_V1,
  }
  console.log(gravar ? 'GRAVANDO' : 'ENSAIO (nada gravado)', { ...dados, criadoPor: dono.name })
  if (gravar) await prisma.pontuacaoRegraGeral.create({ data: dados })
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
