-- CHAMADOS ATENDIDOS (04/11/2026): o "Quem atendeu" do Quadro das Melhorias do Nexus, por pessoa e dia.
-- Aditivo e idempotente. Aplicar com psql (NUNCA `prisma db push` — ver docs/FONTES.md).
CREATE TABLE IF NOT EXISTS melhorias_daily (
  nexus_user_id text        NOT NULL,
  day           varchar(10) NOT NULL,
  erros         integer     NOT NULL DEFAULT 0,
  melhorias     integer     NOT NULL DEFAULT 0,
  criacoes      integer     NOT NULL DEFAULT 0,
  updated_at    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (nexus_user_id, day)
);
