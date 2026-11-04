-- Avaliação: o parecer que o funcionário escreveu na folha, digitado por quem avalia. SÓ ADITIVO.
-- `parecer_historico` guarda cada texto substituído (quem, quando, o quê): é o rastro da alteração.
ALTER TABLE avaliacao_documento ADD COLUMN IF NOT EXISTS parecer TEXT;
ALTER TABLE avaliacao_documento ADD COLUMN IF NOT EXISTS parecer_por_id TEXT;
ALTER TABLE avaliacao_documento ADD COLUMN IF NOT EXISTS parecer_em TIMESTAMP(3);
ALTER TABLE avaliacao_documento ADD COLUMN IF NOT EXISTS parecer_historico JSONB NOT NULL DEFAULT '[]';
