'use client'
import { useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Upload, FileSpreadsheet, TriangleAlert, Check, X } from 'lucide-react'
import RegraEditor from './RegraEditor'
import TarefasEditor from './TarefasEditor'

export type Setor = { id: string; name: string }
export type Lote = {
  id: string; departmentId: string; arquivo: string; diaDe: string; diaAte: string
  linhas: number; linhasSemVinculo: number; ativo: boolean; enviadoEm: string; enviadoPor: string
}

type Candidato = { personKey: string; nome: string; setor: string | null; ativo: boolean }
type NomeLido = {
  nomeOrigem: string; nomeNorm: string; linhas: number
  confianca: 'forte' | 'revisar' | 'nenhuma'
  porque: string
  resolvidoPor: 'conferido' | 'automatico' | 'pendente'
  personKey: string | null
  pessoa: { nome: string; setor: string | null; ativo: boolean } | null
  candidatos: Candidato[]
}
type Previa = {
  setor: string; hash: string
  diaDe: string | null; diaAte: string | null
  pontosDe: string | null; pontosAte: string | null
  totalServicos: number; totalPontos: number
  porStatus: { concluida: number; aberta: number; desconsiderada: number }
  minutosConcluidos: number
  linhasSemVinculo: number; substituir: number
  alertaSetor: { setorProvavel: string; quantas: number; de: number } | null
  avisos: string[]; nomes: NomeLido[]
  jaImportado?: { em: string; arquivo: string; linhas: number; ativo: boolean }
  ok?: boolean
}

const br = (d: string) => (d ? d.split('-').reverse().join('/') : '—')

export default function ServicosClient({ setores, lotes }: { setores: Setor[]; lotes: Lote[] }) {
  /* ⚠️⚠️ O SETOR VEM NA URL quando se chega pelo relatório do setor — que é o
     caminho normal desde 04/09/2026. Ele deixou de ser um dropdown que a pessoa
     precisa lembrar de conferir: em 04/09 uma planilha do Legal foi importada
     para Entregas exatamente porque ninguém olhou aquele campo, e foram 6.980
     linhas para o setor errado sem nada acusar. */
  const params = useSearchParams()
  const daUrl = params.get('setor')
  const inicial = setores.find((s) => s.id === daUrl)?.id ?? setores[0].id
  const [setorId, setSetorId] = useState(inicial)
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [gravado, setGravado] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const setor = setores.find((s) => s.id === setorId)!

  async function enviar(f: File, confirmar: boolean) {
    setOcupado(true); setErro(null)
    const fd = new FormData()
    fd.append('arquivo', f); fd.append('departmentId', setorId)
    if (confirmar) fd.append('confirmar', 'true')
    try {
      const r = await fetch('/api/servicos/importar', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) { setErro(d.error ?? 'Não consegui ler o arquivo.'); setPrevia(null) }
      else { setPrevia(d); setGravado(!!d.ok) }
    } catch {
      setErro('A rede falhou no meio do envio. Nada foi gravado — tente de novo.')
    } finally { setOcupado(false) }
  }

  async function vincular(nomeOrigem: string, personKey: string | null, naoEhDaCasa: boolean) {
    const r = await fetch('/api/servicos/vinculo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departmentId: setorId, nomeOrigem, personKey, naoEhDaCasa }),
    })
    if (!r.ok) { setErro((await r.json()).error ?? 'Não consegui gravar o vínculo.'); return }
    setPrevia((p) => p && ({
      ...p,
      nomes: p.nomes.map((n) => n.nomeOrigem !== nomeOrigem ? n : ({
        ...n, personKey, resolvidoPor: 'conferido',
        pessoa: naoEhDaCasa ? null : (n.candidatos.find((c) => c.personKey === personKey) ?? n.pessoa),
        porque: naoEhDaCasa ? 'você marcou que não é gente da casa' : 'você confirmou',
      })),
    }))
  }

  const pendentes = previa?.nomes.filter((n) => n.resolvidoPor === 'pendente') ?? []
  const resolvidos = previa?.nomes.filter((n) => n.resolvidoPor !== 'pendente') ?? []
  const lotesDoSetor = lotes.filter((l) => l.departmentId === setorId)

  /* ⚠️ 1280 como o dashboard: a tabela de tipos de serviço tem seis colunas e,
     em 1080, a do nome espremia e a tela rolava na horizontal. */
  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Planilha do setor</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Serviços e pontuação</h1>
        </div>
        {setores.length > 1 && (
          <select value={setorId} onChange={(e) => { setSetorId(e.target.value); setPrevia(null); setArquivo(null) }}
            style={{ height: 36, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 10px', fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer' }}>
            {setores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* ── envio ─────────────────────────────────────────────────────────── */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Enviar a planilha de {setor.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.55 }}>
          O arquivo <b>.xlsx</b> exportado do sistema, com as colunas Nome, Tempo, Status, Tarefa, Cliente e Data.
          {' '}<b>Nada é gravado no envio</b> — você vê primeiro o que vai entrar e confirma depois.
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={inputRef} type="file" accept=".xlsx" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setArquivo(f); setGravado(false); enviar(f, false) } }} />
          <button onClick={() => inputRef.current?.click()} disabled={ocupado}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', background: 'var(--accent)', color: '#1a1205', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: ocupado ? 'wait' : 'pointer' }}>
            <Upload size={15} /> {ocupado ? 'Lendo…' : 'Escolher arquivo'}
          </button>
          {arquivo && (
            <span style={{ fontSize: 12.5, color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FileSpreadsheet size={14} /> {arquivo.name} · {(arquivo.size / 1024).toFixed(0)} KB
            </span>
          )}
        </div>
        {erro && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--danger)', background: 'rgba(229,72,77,.08)', border: '1px solid rgba(229,72,77,.3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', lineHeight: 1.5 }}>{erro}</div>
        )}
      </div>

      {previa && (
        <>
          {gravado && (
            <div style={{ fontSize: 13, color: 'var(--success)', background: 'rgba(63,178,85,.1)', border: '1px solid rgba(63,178,85,.35)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 16, lineHeight: 1.55 }}>
              <b>Importado.</b> {previa.totalServicos.toLocaleString('pt-BR')} serviços de {br(previa.diaDe ?? '')} a {br(previa.diaAte ?? '')} entraram no painel do {previa.setor}.
            </div>
          )}
          {previa.jaImportado && !gravado && (
            <div style={{ fontSize: 12.5, color: 'var(--warning)', background: 'rgba(245,166,35,.1)', border: '1px solid rgba(245,166,35,.35)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 16, lineHeight: 1.55 }}>
              <b>Este arquivo exato já foi importado</b> em {new Date(previa.jaImportado.em).toLocaleDateString('pt-BR')}, com {previa.jaImportado.linhas.toLocaleString('pt-BR')} linhas.
              Subir de novo criaria uma cópia de cada serviço — por isso o botão de confirmar está desligado. Se a planilha mudou, exporte de novo e envie o arquivo novo.
            </div>
          )}

          {/* ⚠️⚠️ O ARQUIVO PARECE SER DE OUTRO SETOR.
              Aconteceu em 04/09/2026: a planilha do Legal foi importada com o
              seletor em Entregas e 6.980 linhas foram para o setor errado, sem
              nada acusar. O sistema tinha a informação — das 9 pessoas que ele
              reconheceu, 8 eram do Legal. Um campo que decide o destino de
              milhares de linhas não pode ser um dropdown no alto da tela que a
              pessoa esquece de olhar. */}
          {previa.alertaSetor && !gravado && (
            <div style={{ fontSize: 13, color: 'var(--danger)', background: 'rgba(229,72,77,.08)', border: '2px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 16, lineHeight: 1.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <TriangleAlert size={17} />
                <b style={{ fontSize: 14 }}>Este arquivo parece ser do {previa.alertaSetor.setorProvavel}, não do {setor.name}.</b>
              </div>
              <b>{previa.alertaSetor.quantas} das {previa.alertaSetor.de} pessoas</b> que reconheci neste arquivo são do
              {' '}<b>{previa.alertaSetor.setorProvavel}</b>, e você está importando para o <b>{setor.name}</b>.
              {' '}Se estiver certo, siga; se não, <b>troque o setor no alto da tela</b> e envie de novo.
            </div>
          )}

          {/* ── o que vai entrar ──────────────────────────────────────────── */}
          <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>O que vai entrar</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
              <Num label="Serviços" valor={previa.totalServicos.toLocaleString('pt-BR')} />
              <Num label="Concluídos" valor={previa.porStatus.concluida.toLocaleString('pt-BR')} cor="var(--success)" />
              <Num label="Abertos" valor={previa.porStatus.aberta.toLocaleString('pt-BR')} cor="var(--warning)" />
              <Num label="Desconsiderados" valor={previa.porStatus.desconsiderada.toLocaleString('pt-BR')} cor="var(--text-mute)" />
              <Num label="Horas concluídas" valor={(previa.minutosConcluidos / 60).toFixed(0) + ' h'} />
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.7 }}>
              {/* ⚠️ A JANELA É O QUE O ARQUIVO COBRIU. É o que permite a tela dizer
                  depois "medido até tal dia" em vez de mostrar zero — o defeito que
                  o ponto (a outra fonte por upload) produziu por meses. */}
              <div>Serviços de <b style={{ color: 'var(--text)' }}>{br(previa.diaDe ?? '')}</b> a <b style={{ color: 'var(--text)' }}>{br(previa.diaAte ?? '')}</b>.</div>
              {previa.totalPontos > 0 && (
                <div>{previa.totalPontos} pontuações mensais, de <b style={{ color: 'var(--text)' }}>{previa.pontosDe}</b> a <b style={{ color: 'var(--text)' }}>{previa.pontosAte}</b> — entram como <b>informadas pelo setor</b>, não como calculadas pela régua.</div>
              )}
              {previa.substituir > 0 && (
                <div style={{ color: 'var(--warning)' }}>
                  <TriangleAlert size={12} style={{ verticalAlign: -1 }} /> {previa.substituir.toLocaleString('pt-BR')} serviços já gravados nesta mesma janela serão <b>substituídos</b> por estes.
                </div>
              )}
              {previa.linhasSemVinculo > 0 && (
                <div>{previa.linhasSemVinculo.toLocaleString('pt-BR')} linhas ficarão <b>sem dono</b> — contam para o total do setor e não creditam ninguém.</div>
              )}
            </div>
            {previa.avisos.map((a, i) => (
              <div key={i} style={{ marginTop: 10, fontSize: 12, color: 'var(--warning)' }}>⚠ {a}</div>
            ))}
          </div>

          {/* ── de quem é cada nome ───────────────────────────────────────── */}
          <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>De quem é cada nome</div>
            {/* ⚠️⚠️ O texto explica POR QUE a conferência existe. Sem isso a pessoa
                clica em tudo para se livrar da lista. */}
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.55 }}>
              O arquivo identifica as pessoas só pelo nome, e nome não é identidade: sobrenome comum casa gente
              errada, e creditar os serviços de alguém à pessoa errada não dá erro nenhum — dá um número plausível
              na ficha de outra pessoa. Por isso <b>só entram sozinhos os casos sem dúvida</b>; o resto espera você.
            </div>

            {pendentes.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--warning)', marginBottom: 10 }}>
                  {pendentes.length} {pendentes.length === 1 ? 'nome precisa' : 'nomes precisam'} da sua conferência
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pendentes.map((n) => <LinhaPendente key={n.nomeOrigem} n={n} onVincular={vincular} />)}
                </div>
              </div>
            )}

            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 10 }}>
              {resolvidos.length} {resolvidos.length === 1 ? 'resolvido' : 'resolvidos'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {resolvidos.map((n) => (
                <div key={n.nomeOrigem} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, padding: '6px 8px', borderRadius: 6, background: 'var(--surface-2)' }}>
                  <Check size={13} color={n.personKey ? 'var(--success)' : 'var(--text-mute)'} style={{ flex: 'none' }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nomeOrigem}</span>
                  <span style={{ color: 'var(--text-mute)', fontSize: 11.5, whiteSpace: 'nowrap' }}>{n.linhas.toLocaleString('pt-BR')} linhas</span>
                  <span style={{ width: 220, textAlign: 'right', color: n.personKey ? 'var(--text)' : 'var(--text-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.pessoa ? `${n.pessoa.nome}${n.pessoa.setor ? ` · ${n.pessoa.setor}` : ''}` : 'não é gente da casa'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {!gravado && !previa.jaImportado && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <button onClick={() => arquivo && enviar(arquivo, true)} disabled={ocupado}
                style={{ height: 40, padding: '0 20px', background: 'var(--success)', color: '#04210c', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: ocupado ? 'wait' : 'pointer' }}>
                {ocupado ? 'Gravando…' : `Confirmar e importar para ${setor.name}`}
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {pendentes.length > 0
                  ? `Pode importar assim mesmo — os ${pendentes.length} nomes pendentes ficam sem dono e você resolve depois.`
                  : 'Todos os nomes estão resolvidos.'}
              </span>
            </div>
          )}
        </>
      )}

      <RegraEditor departmentId={setorId} setorNome={setor.name} />
      <TarefasEditor departmentId={setorId} setorNome={setor.name} />

      {/* ── histórico de envios ───────────────────────────────────────────── */}
      {lotesDoSetor.length > 0 && (
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Envios anteriores</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>Quem subiu, quando, e que janela o arquivo cobria.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lotesDoSetor.map((l) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, padding: '8px 10px', borderRadius: 6, background: 'var(--surface-2)', opacity: l.ativo ? 1 : 0.55 }}>
                <FileSpreadsheet size={14} color="var(--text-mute)" style={{ flex: 'none' }} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.arquivo}</span>
                <span style={{ color: 'var(--text-mute)', whiteSpace: 'nowrap' }}>{br(l.diaDe)} a {br(l.diaAte)}</span>
                <span style={{ color: 'var(--text-mute)', whiteSpace: 'nowrap', width: 90, textAlign: 'right' }}>{l.linhas.toLocaleString('pt-BR')} linhas</span>
                <span style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap', width: 170, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {l.enviadoPor} · {new Date(l.enviadoEm).toLocaleDateString('pt-BR')}
                </span>
                {!l.ativo && <span style={{ fontSize: 10.5, color: 'var(--text-mute)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px' }}>substituído</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Num({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.5px', color: cor ?? 'var(--text)' }}>{valor}</div>
    </div>
  )
}

function LinhaPendente({ n, onVincular }: { n: NomeLido; onVincular: (nome: string, key: string | null, naoEh: boolean) => void }) {
  const [escolha, setEscolha] = useState('')
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <b style={{ fontSize: 13 }}>{n.nomeOrigem}</b>
        <span style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>{n.linhas.toLocaleString('pt-BR')} linhas</span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 10 }}>{n.porque}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={escolha} onChange={(e) => setEscolha(e.target.value)}
          style={{ flex: 1, minWidth: 220, height: 34, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 10px', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>
          <option value="">Escolha a pessoa…</option>
          {n.candidatos.map((c) => (
            <option key={c.personKey} value={c.personKey}>
              {c.nome}{c.setor ? ` · ${c.setor}` : ''}{c.ativo ? '' : ' (desligado)'}
            </option>
          ))}
        </select>
        <button onClick={() => escolha && onVincular(n.nomeOrigem, escolha, false)} disabled={!escolha}
          style={{ height: 34, padding: '0 14px', background: escolha ? 'var(--accent)' : 'var(--surface)', color: escolha ? '#1a1205' : 'var(--text-mute)', border: escolha ? 'none' : '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: escolha ? 'pointer' : 'default' }}>
          Vincular
        </button>
        {/* ⚠️ "Não é da casa" é uma RESPOSTA, não desistência: fica gravada e a
            lista não pergunta de novo no mês que vem. */}
        <button onClick={() => onVincular(n.nomeOrigem, null, true)} title="Fica gravado — não pergunto de novo"
          style={{ height: 34, padding: '0 12px', background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <X size={13} /> Não é da casa
        </button>
      </div>
    </div>
  )
}
