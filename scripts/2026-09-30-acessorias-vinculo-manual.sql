-- Acessórias: vínculo de pessoa decidido à mão, que o sync respeita. Só ADD COLUMN.
ALTER TABLE "acessorias_usuario" ADD COLUMN "vinculo_manual" BOOLEAN NOT NULL DEFAULT false;
