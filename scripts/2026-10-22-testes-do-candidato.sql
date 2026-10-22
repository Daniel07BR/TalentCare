-- PERSONALIDADE na ficha + TESTES DA ENTREVISTA vindos do Fluxo (22/10/2026).
-- Aditivo e idempotente. Aplicar com psql (NUNCA `prisma db push` — ver docs/FONTES.md).

-- O teste de personalidade (modelo dos 16 tipos), uma linha POR APLICAÇÃO, como o DISC.
CREATE TABLE IF NOT EXISTS personalidade_resultado (
  id                   text                           NOT NULL,
  user_id              text                           NOT NULL,
  tipo                 varchar(4)                     NOT NULL,
  pct                  integer[]                      NOT NULL,
  aplicado_em          varchar(10)                    NOT NULL,
  observacao           text,
  registrado_por_id    text                           NOT NULL,
  registrado_por_nome  text                           NOT NULL,
  fluxo_ref            varchar(64),
  criado_em            timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT personalidade_resultado_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS personalidade_resultado_user_id_criado_em_idx ON personalidade_resultado (user_id, criado_em);
CREATE INDEX IF NOT EXISTS personalidade_resultado_fluxo_ref_idx ON personalidade_resultado (fluxo_ref);

-- O DISC que veio da entrevista de emprego no Fluxo: o id da entrevista (NULO = lançado aqui, à mão).
ALTER TABLE disc_resultado ADD COLUMN IF NOT EXISTS fluxo_ref varchar(64);
CREATE INDEX IF NOT EXISTS disc_resultado_fluxo_ref_idx ON disc_resultado (fluxo_ref);

-- (2ª entrega, 22/10/2026) O CÓDIGO DOS TESTES na ficha e a ATENÇÃO.
-- O código que gravou cada linha (NULO = lançado à mão ou vindo do Fluxo sem código): o mesmo código não entra duas vezes.
ALTER TABLE disc_resultado          ADD COLUMN IF NOT EXISTS codigo varchar(19);
ALTER TABLE personalidade_resultado ADD COLUMN IF NOT EXISTS codigo varchar(19);
CREATE INDEX IF NOT EXISTS disc_resultado_codigo_idx ON disc_resultado (codigo);

-- As duas provas de atenção (busca de números e conferência), uma linha POR APLICAÇÃO. Chega só pelo código.
CREATE TABLE IF NOT EXISTS atencao_resultado (
  id                   text                           NOT NULL,
  user_id              text                           NOT NULL,
  busca_acertos        integer                        NOT NULL,
  busca_erros          integer                        NOT NULL,
  busca_omissoes       integer                        NOT NULL,
  busca_percorrido     integer                        NOT NULL,
  conf_acertos         integer                        NOT NULL,
  conf_erros           integer                        NOT NULL,
  aplicado_em          varchar(10)                    NOT NULL,
  codigo               varchar(19),
  observacao           text,
  registrado_por_id    text                           NOT NULL,
  registrado_por_nome  text                           NOT NULL,
  fluxo_ref            varchar(64),
  criado_em            timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT atencao_resultado_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS atencao_resultado_user_id_criado_em_idx ON atencao_resultado (user_id, criado_em);
CREATE INDEX IF NOT EXISTS atencao_resultado_fluxo_ref_idx ON atencao_resultado (fluxo_ref);
