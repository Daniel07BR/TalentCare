-- Avaliação: documento assinado (frente e verso) + a trava de conclusão. SÓ ADITIVO.
-- ⚠️ Não use `prisma db push` no .78 (quer DROPAR backups do Chat). psql + `prisma generate`.
CREATE TABLE IF NOT EXISTS avaliacao_documento (
  avaliacao_id     TEXT PRIMARY KEY REFERENCES avaliacao(id) ON DELETE CASCADE ON UPDATE CASCADE,
  frente           BYTEA,
  frente_tipo      TEXT,
  verso            BYTEA,
  verso_tipo       TEXT,
  enviado_por_id   TEXT,
  concluida_em     TIMESTAMP(3),
  concluida_por_id TEXT,
  versao_assinada  INTEGER,
  updated_at       TIMESTAMP(3) NOT NULL
);
