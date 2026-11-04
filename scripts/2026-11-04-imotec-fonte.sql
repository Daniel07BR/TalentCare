-- ATIVIDADES NO IMOTEC (04/11/2026): o que cada pessoa fez, por dia e ação, pela auditoria do Imotec.
-- Aditivo e idempotente. Aplicar com psql (NUNCA `prisma db push` — ver docs/FONTES.md).
CREATE TABLE IF NOT EXISTS imotec_daily (
  nexus_user_id text        NOT NULL,
  day           varchar(10) NOT NULL,
  acao          varchar(40) NOT NULL,
  n             integer     NOT NULL DEFAULT 0,
  updated_at    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (nexus_user_id, day, acao)
);
