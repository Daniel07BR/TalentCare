-- Avaliação mensal: o método (02/10/2026). SÓ ADITIVO.
-- ⚠️ Não use `prisma db push` no .78: ele quer DROPAR os backups do Chat
-- (chat_daily_bkp_20260911). Aplique este arquivo com psql e rode `prisma generate`.
ALTER TABLE avaliacao        ADD COLUMN IF NOT EXISTS combinado TEXT;
ALTER TABLE avaliacao_versao ADD COLUMN IF NOT EXISTS combinado TEXT;

CREATE TABLE IF NOT EXISTS avaliacao_gestao (
  avaliacao_id     TEXT PRIMARY KEY REFERENCES avaliacao(id) ON DELETE CASCADE ON UPDATE CASCADE,
  quer_na_equipe   BOOLEAN,
  pronto_para_mais BOOLEAN,
  em_risco         BOOLEAN,
  anotacao         TEXT,
  updated_by_id    TEXT,
  updated_at       TIMESTAMP(3) NOT NULL
);
