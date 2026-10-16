-- ATENDIMENTO DA RECEPÇÃO (16/10/2026) — espelhos do Fluxo e campos de contato do CIDE.
-- Aditivo e idempotente. Aplicar com psql (NUNCA `prisma db push` — ver docs/FONTES.md).

-- O que cada pessoa fez na Recepção, por dia de São Paulo (rota talent-recepcao do Fluxo).
CREATE TABLE IF NOT EXISTS recepcao_daily (
  nexus_user_id        text                           NOT NULL,
  day                  varchar(10)                    NOT NULL,
  recebidas            integer                        NOT NULL DEFAULT 0,
  feitas               integer                        NOT NULL DEFAULT 0,
  nao_realizadas       integer                        NOT NULL DEFAULT 0,
  espera_ligacao_seg   integer                        NOT NULL DEFAULT 0,
  espera_ligacao_n     integer                        NOT NULL DEFAULT 0,
  visitas              integer                        NOT NULL DEFAULT 0,
  deliveries           integer                        NOT NULL DEFAULT 0,
  espera_delivery_seg  integer                        NOT NULL DEFAULT 0,
  espera_delivery_n    integer                        NOT NULL DEFAULT 0,
  contatos_em_lote     integer                        NOT NULL DEFAULT 0,
  updated_at           timestamp(3) without time zone NOT NULL,
  CONSTRAINT recepcao_daily_pkey PRIMARY KEY (nexus_user_id, day)
);
CREATE INDEX IF NOT EXISTS recepcao_daily_day_idx ON recepcao_daily (day);

-- O total da ÁREA por registro (grupo 'total') e os recortes por setor
-- (destinoLigacao, pedeLigacao, pedeDelivery, visitaPara), por dia.
CREATE TABLE IF NOT EXISTS recepcao_area_daily (
  day         varchar(10)                    NOT NULL,
  grupo       varchar(40)                    NOT NULL,
  rotulo      varchar(120)                   NOT NULL,
  n           integer                        NOT NULL DEFAULT 0,
  updated_at  timestamp(3) without time zone NOT NULL,
  CONSTRAINT recepcao_area_daily_pkey PRIMARY KEY (day, grupo, rotulo)
);

-- Contatos do CIDE (atividade-daily ganhou os campos em 16/10/2026). NULO = não medido.
ALTER TABLE cide_daily ADD COLUMN IF NOT EXISTS contatos_editados  integer;
ALTER TABLE cide_daily ADD COLUMN IF NOT EXISTS contatos_novos     integer;
ALTER TABLE cide_daily ADD COLUMN IF NOT EXISTS contatos_removidos integer;
ALTER TABLE cide_daily ADD COLUMN IF NOT EXISTS contatos_empresas  integer;
