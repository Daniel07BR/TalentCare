/* Tipos do "o que a pessoa fez num sistema" — separados de `lib/pessoa-sistema.ts`
   porque aquele é `server-only` e o painel (cliente) também precisa deles. */
export type Item = {
  id: string; titulo: string; sub?: string; dia: string; valor?: number; filhos?: { titulo: string; dia: string }[]
  /** `grave` = suspensão: sai em ROXO, a cor de suspensão em todo o sistema. */
  destaque?: 'grave'
}
export type Grupo = { chave: string; titulo: string; itens: Item[]; resumo?: string }
export type Detalhe = {
  grupos: Grupo[]; aoVivo: boolean; erro?: string; semConta?: boolean
  /** Algo que o painel diz sem esconder o resto (ex.: o Chat não respondeu e os chamados vieram do espelho). */
  aviso?: string
}
export const SISTEMAS = ['classroom', 'helpdesk', 'cide', 'consultoria', 'gerencia', 'chat', 'whatsapp', 'radio', 'assiduidade'] as const
export type Sistema = (typeof SISTEMAS)[number]
export const NOME_DO_SISTEMA: Record<Sistema, string> = {
  classroom: 'ClassRoom', helpdesk: 'HelpDesk', cide: 'CIDE', consultoria: 'Consultoria Plus', gerencia: 'Gerência · mensageria',
  chat: 'Chat Interno', whatsapp: 'Painel de Atendimento · WhatsApp', radio: 'Rádio Itamarathy', assiduidade: 'Assiduidade e disciplina',
}
