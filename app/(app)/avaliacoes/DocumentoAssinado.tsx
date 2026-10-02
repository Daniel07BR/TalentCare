'use client'
import { useRef, useState } from 'react'
import { Camera, CheckCircle2, FileText, Lock, RefreshCw } from 'lucide-react'
import { BotaoTermo } from './TermoImpresso'

/* ============================================================
   O DOCUMENTO ASSINADO — o último passo da avaliação (02/10/2026).

   Publicada → gera o PDF → as duas assinaturas → foto da frente e do verso
   (ou um PDF ÚNICO escaneado, com as duas faces) → "Concluir". Até concluir, a avaliação ainda se corrige (com motivo) e as fotos
   se trocam; depois, NADA muda — o papel e o sistema têm de dizer o mesmo.

   ⚠️ A foto é comprimida AQUI, no navegador, antes de subir: foto de celular
   tem 3–6 MB, e o nginx barra corpo grande com 413 (já aconteceu no CIDE). O
   alvo é ~900 KB, legível para um documento A4.
   ============================================================ */

export type DocMeta = {
  temFrente: boolean; temVerso: boolean; temPdf: boolean
  concluidaEm: string | null; versaoAssinada: number | null; concluidaPor: string | null
} | null

const LIMITE = 900 * 1024
const LADO_MAX = 2200

async function comprimir(f: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(f)
    const escala = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height))
    const cv = document.createElement('canvas')
    cv.width = Math.round(bmp.width * escala); cv.height = Math.round(bmp.height * escala)
    const g = cv.getContext('2d')!
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height)
    g.drawImage(bmp, 0, 0, cv.width, cv.height)
    for (const q of [0.85, 0.75, 0.65, 0.55]) {
      const b = await new Promise<Blob | null>((r) => cv.toBlob(r, 'image/jpeg', q))
      if (b && (b.size <= LIMITE || q === 0.55)) return b
    }
  } catch { /* formato que o navegador não decodifica: segue o original */ }
  return f
}

export function DocumentoAssinado({ avaliadoId, competencia, versao, doc, podeAnexar, onMudou }: {
  avaliadoId: string; competencia: string; versao: number; doc: DocMeta
  podeAnexar: boolean; onMudou: () => void
}) {
  const [enviando, setEnviando] = useState<'' | 'frente' | 'verso' | 'pdf' | 'concluir'>('')
  // Fotos ou PDF único. Abre no PDF se já houver um anexado.
  const [modo, setModo] = useState<'fotos' | 'pdf'>(doc?.temPdf && !doc?.temFrente ? 'pdf' : 'fotos')
  const inputPdf = useRef<HTMLInputElement>(null)
  const [erro, setErro] = useState<string | null>(null)
  // Muda a cada envio, para a miniatura buscar a imagem nova (a rota é no-store).
  const [carimbo, setCarimbo] = useState(() => Date.now())
  const concluida = !!doc?.concluidaEm
  // Conclui com as duas fotos OU com o PDF único — a mesma conta da rota.
  const pronto = !!doc?.temPdf || (!!doc?.temFrente && !!doc?.temVerso)
  const url = (lado: string) => `/api/avaliacoes/${avaliadoId}/documento?competencia=${competencia}&lado=${lado}&t=${carimbo}`

  async function enviar(lado: 'frente' | 'verso' | 'pdf', f: File) {
    setErro(null); setEnviando(lado)
    // PDF sobe como veio: o navegador não reescreve PDF.
    const blob = lado === 'pdf' ? f : await comprimir(f)
    const fd = new FormData()
    fd.set('competencia', competencia); fd.set('lado', lado)
    fd.set('arquivo', lado === 'pdf' ? f : new File([blob], `${lado}.jpg`, { type: blob.type || f.type }))
    const r = await fetch(`/api/avaliacoes/${avaliadoId}/documento`, { method: 'POST', body: fd })
    setEnviando('')
    if (!r.ok) {
      const j = await r.json().catch(() => null)
      setErro(r.status === 413 ? 'A imagem ficou grande demais para o servidor. Tire a foto com menos zoom ou mais perto.' : j?.error ?? 'Não deu para enviar a imagem.')
      return
    }
    setCarimbo(Date.now()); onMudou()
  }

  async function concluir() {
    const ok = window.confirm(
      `Concluir a avaliação?\n\nDepois de concluir, ela NÃO pode mais ser editada — nem a nota, nem o combinado, nem a parte da gestão.\n\nConfira se ${modo === 'pdf' ? 'o PDF está legível' : 'a frente e o verso estão legíveis'}, com as duas assinaturas e a data${versao > 1 ? `, e se o papel é da versão ${versao}` : ''}.`,
    )
    if (!ok) return
    setErro(null); setEnviando('concluir')
    const r = await fetch(`/api/avaliacoes/${avaliadoId}/documento`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competencia, acao: 'concluir' }),
    })
    setEnviando('')
    if (!r.ok) { const j = await r.json().catch(() => null); setErro(j?.error ?? 'Não deu para concluir.'); return }
    onMudou()
  }

  const cartao: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `4px solid ${concluida ? 'var(--chart-3)' : 'var(--warning)'}`, borderRadius: 'var(--radius-lg)', padding: 20 }

  return (
    <section className="tc-card" style={cartao}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        {concluida ? <Lock size={17} color="var(--chart-3)" /> : <Camera size={17} color="var(--warning)" />}
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>
          {concluida ? 'Avaliação concluída · documento assinado anexado' : 'Documento assinado'}
        </div>
      </div>

      {concluida ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.55, marginBottom: 12 }}>
          Concluída em {new Date(doc!.concluidaEm!).toLocaleDateString('pt-BR')}{doc!.concluidaPor ? ` por ${doc!.concluidaPor}` : ''}
          {doc!.versaoAssinada && doc!.versaoAssinada > 1 ? ` · papel da versão ${doc!.versaoAssinada}` : ''}. A avaliação não pode mais ser alterada.
        </div>
      ) : (
        <ol style={{ margin: '4px 0 12px', paddingLeft: 18, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          <li>Gere o PDF e imprima. <BotaoTermo avaliadoId={avaliadoId} competencia={competencia} estilo={{ padding: '4px 10px', fontSize: 11.5, marginLeft: 6 }} /></li>
          <li>Converse com a pessoa; ela escreve as observações e os dois assinam e datam.</li>
          <li>Fotografe a <b>frente</b> e o <b>verso</b> — ou escaneie tudo num <b>PDF único</b> — e anexe abaixo.</li>
          <li>Clique em <b>Concluir avaliação</b>. Até lá, a avaliação ainda pode ser corrigida — e, se for, gere o PDF de novo.</li>
        </ol>
      )}

      {!concluida && podeAnexar && (
        <div role="tablist" style={{ display: 'inline-flex', gap: 4, padding: 3, marginBottom: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
          {([['fotos', 'Fotos (frente e verso)'], ['pdf', 'PDF único']] as const).map(([m, rotulo]) => (
            <button key={m} type="button" role="tab" aria-selected={modo === m} onClick={() => setModo(m)}
              style={{ padding: '6px 12px', border: 'none', borderRadius: 6, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', background: modo === m ? 'var(--surface)' : 'transparent', color: modo === m ? 'var(--text)' : 'var(--text-mute)', boxShadow: modo === m ? 'var(--shadow-1, 0 1px 2px rgba(0,0,0,.08))' : 'none' }}>
              {rotulo}
            </button>
          ))}
        </div>
      )}

      {(concluida ? doc?.temPdf && !doc?.temFrente : modo === 'pdf') ? (
        <div style={{ border: `1.5px ${doc?.temPdf ? 'solid' : 'dashed'} var(--border)`, borderRadius: 'var(--radius)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, fontWeight: 700 }}>
            PDF assinado (frente e verso)
            {doc?.temPdf && <a href={url('pdf')} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: 12 }}>abrir em outra aba</a>}
          </div>
          {doc?.temPdf ? (
            <iframe src={url('pdf')} title="PDF assinado" style={{ width: '100%', height: 420, border: 'none', borderRadius: 'var(--radius-sm)', background: '#fff' }} />
          ) : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-mute)', fontSize: 12 }}>
              <FileText size={16} /> O documento assinado escaneado, com as duas faces, num arquivo só.
            </div>
          )}
          {!concluida && podeAnexar && (
            <>
              <input ref={inputPdf} type="file" accept="application/pdf" hidden
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) enviar('pdf', f) }} />
              <button type="button" onClick={() => inputPdf.current?.click()} disabled={!!enviando} className="tc-btn"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                {doc?.temPdf ? <RefreshCw size={14} /> : <FileText size={14} />} {enviando === 'pdf' ? 'Enviando…' : doc?.temPdf ? 'Trocar PDF' : 'Anexar PDF'}
              </button>
            </>
          )}
        </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {(['frente', 'verso'] as const).map((lado) => (
          <Lado key={lado} lado={lado}
            tem={lado === 'frente' ? !!doc?.temFrente : !!doc?.temVerso}
            src={url(lado)} trava={concluida || !podeAnexar}
            enviando={enviando === lado} onArquivo={(f) => enviar(lado, f)} />
        ))}
      </div>
      )}

      {erro && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--danger)' }}>{erro}</div>}

      {!concluida && podeAnexar && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
          <span style={{ flex: 1, minWidth: 200, fontSize: 12, color: 'var(--text-mute)' }}>
            {pronto ? 'Documento anexado. Confira e conclua.' : 'Anexe a frente e o verso, ou o PDF único, para poder concluir.'}
          </span>
          <button type="button" onClick={concluir} disabled={!pronto || !!enviando} className="tc-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--chart-3)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: pronto ? 1 : 0.5 }}>
            <CheckCircle2 size={16} /> {enviando === 'concluir' ? 'Concluindo…' : 'Concluir avaliação'}
          </button>
        </div>
      )}
    </section>
  )
}

function Lado({ lado, tem, src, trava, enviando, onArquivo }: {
  lado: 'frente' | 'verso'; tem: boolean; src: string; trava: boolean; enviando: boolean; onArquivo: (f: File) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const nome = lado === 'frente' ? 'Frente' : 'Verso'
  return (
    <div style={{ border: `1.5px ${tem ? 'solid' : 'dashed'} var(--border)`, borderRadius: 'var(--radius)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, fontWeight: 700 }}>
        {nome}
        {tem && <span style={{ color: 'var(--success)', fontSize: 11.5 }}>✓ anexada</span>}
      </div>
      {tem ? (
        <a href={src} target="_blank" rel="noreferrer" title="Abrir em tamanho real">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`${nome} do documento assinado`} style={{ width: '100%', height: 220, objectFit: 'contain', background: '#fff', borderRadius: 'var(--radius-sm)', display: 'block' }} />
        </a>
      ) : (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mute)', fontSize: 12, textAlign: 'center', padding: 12 }}>
          {trava ? 'Sem imagem.' : `Foto da ${lado} do documento assinado`}
        </div>
      )}
      {!trava && (
        <>
          <input ref={input} type="file" accept="image/*" capture="environment" hidden
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onArquivo(f) }} />
          <button type="button" onClick={() => input.current?.click()} disabled={enviando} className="tc-btn"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
            {tem ? <RefreshCw size={14} /> : <Camera size={14} />} {enviando ? 'Enviando…' : tem ? 'Trocar imagem' : `Anexar a ${lado}`}
          </button>
        </>
      )}
    </div>
  )
}
