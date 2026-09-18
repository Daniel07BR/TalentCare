-- ============================================================
-- A SEGUNDA INSTÂNCIA DO WHATSAPP (18/09/2026)
--
-- A casa atende por dois números: o do escritório e o da Imobiliária, cada um
-- numa instância própria do OneCode. Os atendimentos da Imobiliária chegam como
-- o setor "Imóveis" e cabem no espelho como ele é — nenhuma tabela diária muda.
--
-- O único ajuste é o `whatsapp_snapshot` ("pendentes agora"), que tinha UMA
-- linha para a casa inteira: sem a coluna `fonte`, o sync de uma instância
-- sobrescrevia o número da outra a cada hora, e o painel mostrava o backlog de
-- quem tivesse rodado por último. Passa a ser uma linha por instância, e a tela
-- soma as duas.
--
-- ADITIVO: nenhuma linha é apagada, nenhuma coluna sai, nenhuma chave muda. O
-- `DEFAULT 'itamarathy'` marca a linha que já existe como sendo do número
-- antigo — que é o que ela é.
--
-- ⚠️ Aplicar com psql, NUNCA com `prisma db push`: o diff dele quer dropar os
-- backups do Chat (`chat_*_bkp_*`). Ver docs/CONTINUAR-AQUI.md.
--   psql "$DATABASE_URL" -f scripts/2026-09-18-whatsapp-fonte.sql
-- ============================================================
BEGIN;

ALTER TABLE whatsapp_snapshot ADD COLUMN IF NOT EXISTS fonte TEXT NOT NULL DEFAULT 'itamarathy';
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_snapshot_fonte_key ON whatsapp_snapshot (fonte);

COMMIT;
