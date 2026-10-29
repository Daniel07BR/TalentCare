-- AS OUTRAS TAREFAS DA RECEPÇÃO (29/10/2026) — o que a Recepção faz no Fluxo além do atendimento.
-- Aditivo e idempotente. Aplicar com psql (NUNCA `prisma db push` — ver docs/FONTES.md).
--
-- Mesma rota (`talent-recepcao` do Fluxo) e mesma troca de janela do `run-recepcao-sync.mjs`.
-- O total da área dessas tarefas entra em `recepcao_area_daily` (grupo 'total', rótulo = o campo),
-- que já guarda qualquer campo: nada muda lá.

ALTER TABLE recepcao_daily ADD COLUMN IF NOT EXISTS entrevistas_agendadas    integer NOT NULL DEFAULT 0;
ALTER TABLE recepcao_daily ADD COLUMN IF NOT EXISTS entrevistas_cadastradas  integer NOT NULL DEFAULT 0;
ALTER TABLE recepcao_daily ADD COLUMN IF NOT EXISTS entrevistas_encerradas   integer NOT NULL DEFAULT 0;
-- Um por candidato e dia (o código traz os três testes de uma vez).
ALTER TABLE recepcao_daily ADD COLUMN IF NOT EXISTS entrevistas_testes       integer NOT NULL DEFAULT 0;
ALTER TABLE recepcao_daily ADD COLUMN IF NOT EXISTS entrevistas_acompanhadas integer NOT NULL DEFAULT 0;
-- Controle de faltas (VT e VR): o DIA DE UMA PESSOA conferido, uma vez por dia de trabalho — não o clique.
ALTER TABLE recepcao_daily ADD COLUMN IF NOT EXISTS faltas_conferidas        integer NOT NULL DEFAULT 0;
ALTER TABLE recepcao_daily ADD COLUMN IF NOT EXISTS prestadores              integer NOT NULL DEFAULT 0;
ALTER TABLE recepcao_daily ADD COLUMN IF NOT EXISTS marcadores               integer NOT NULL DEFAULT 0;
