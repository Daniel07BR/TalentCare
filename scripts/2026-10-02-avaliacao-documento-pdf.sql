-- Avaliação: documento assinado também como PDF único. SÓ ADITIVO.
ALTER TABLE avaliacao_documento ADD COLUMN IF NOT EXISTS pdf BYTEA;
