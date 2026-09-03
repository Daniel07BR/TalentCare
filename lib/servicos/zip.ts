import 'server-only'
import { inflateRawSync } from 'zlib'

/* ============================================================
   LEITOR DE ZIP MÍNIMO — o suficiente para abrir um `.xlsx`.

   Um `.xlsx` é um zip de XML. Precisamos de quatro arquivos de dentro dele, e
   isso não justifica uma dependência nova: o `zlib` do Node já descomprime
   deflate, que é o único método que o Excel usa.

   ⚠️ Percorre o DIRETÓRIO CENTRAL, no fim do arquivo, e não os cabeçalhos
   locais. É o único lugar do zip com os tamanhos confiáveis: quando o produtor
   escreve o arquivo em streaming, o cabeçalho local vem com tamanho zero e o
   valor real fica num descritor DEPOIS dos dados. Ler pelo cabeçalho local
   funciona com quase todo arquivo e falha com alguns, o que é o pior modo de
   falhar.
   ============================================================ */

export function lerZip(buf: Buffer): Record<string, Buffer> {
  const fim = acharDiretorioCentral(buf)
  if (!fim) throw new Error('Arquivo não é um zip válido (fim do diretório central não encontrado).')

  const saida: Record<string, Buffer> = {}
  let p = fim.inicioDiretorio
  for (let i = 0; i < fim.entradas; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break // assinatura da entrada central
    const metodo = buf.readUInt16LE(p + 10)
    const tamComprimido = buf.readUInt32LE(p + 20)
    const tamNome = buf.readUInt16LE(p + 28)
    const tamExtra = buf.readUInt16LE(p + 30)
    const tamComentario = buf.readUInt16LE(p + 32)
    const deslocamento = buf.readUInt32LE(p + 42)
    const nome = buf.subarray(p + 46, p + 46 + tamNome).toString('utf8')

    // No cabeçalho LOCAL só confiamos nos tamanhos de nome e extra — os campos
    // de tamanho de dados podem estar zerados (ver o comentário do topo).
    const tamNomeLocal = buf.readUInt16LE(deslocamento + 26)
    const tamExtraLocal = buf.readUInt16LE(deslocamento + 28)
    const inicioDados = deslocamento + 30 + tamNomeLocal + tamExtraLocal
    const dados = buf.subarray(inicioDados, inicioDados + tamComprimido)

    if (metodo === 0) saida[nome] = Buffer.from(dados)              // sem compressão
    else if (metodo === 8) saida[nome] = inflateRawSync(dados)      // deflate
    // Outros métodos (bzip2, lzma) o Excel não gera; ignorar é melhor que estourar.

    p += 46 + tamNome + tamExtra + tamComentario
  }
  return saida
}

/**
 * Acha o registro de fim do diretório central (EOCD).
 *
 * ⚠️ Procura DE TRÁS PARA A FRENTE: a assinatura do EOCD pode aparecer por acaso
 * dentro dos dados comprimidos, e o registro verdadeiro é sempre o último. Ele
 * fica nos últimos 22 bytes quando não há comentário, e o comentário pode ter
 * até 64 KB — daí a janela de busca.
 */
function acharDiretorioCentral(buf: Buffer): { entradas: number; inicioDiretorio: number } | null {
  const minimo = Math.max(0, buf.length - 22 - 0xffff)
  for (let p = buf.length - 22; p >= minimo; p--) {
    if (buf.readUInt32LE(p) === 0x06054b50) {
      return { entradas: buf.readUInt16LE(p + 10), inicioDiretorio: buf.readUInt32LE(p + 16) }
    }
  }
  return null
}
