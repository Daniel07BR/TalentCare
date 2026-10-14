-- Indicadores internos do DP: os FUNCIONÁRIOS da empresa da folha fechada (14/10/2026).
-- Vem do Fluxo (o cadastro de Funcionários no mês da competência — a régua do painel do DP).
-- É o que dá "funcionários administrados": folha soma os funcionários; férias/rescisão/admissão valem 1.
-- NULL = o serviço não é de folha, ou a empresa não tem cadastro (não é zero funcionário).
ALTER TABLE servico_depto ADD COLUMN IF NOT EXISTS funcionarios INTEGER;
