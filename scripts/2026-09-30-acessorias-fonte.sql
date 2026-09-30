-- CreateTable
CREATE TABLE "acessorias_usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL,
    "nexus_user_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acessorias_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acessorias_processo" (
    "id" TEXT NOT NULL,
    "matriz" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "gestor_id" TEXT,
    "inicio" VARCHAR(10) NOT NULL,
    "conclusao" VARCHAR(10),
    "previsao" VARCHAR(10),
    "dias_corridos" INTEGER NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "alterado_em" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acessorias_processo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acessorias_entrega" (
    "id" TEXT NOT NULL,
    "obrigacao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "resp_entrega_id" TEXT,
    "resp_prazo_id" TEXT,
    "competencia" VARCHAR(10),
    "prazo" VARCHAR(10) NOT NULL,
    "entregue_em" VARCHAR(10),
    "status" TEXT NOT NULL,
    "multa" BOOLEAN NOT NULL,
    "alterado_em" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acessorias_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acessorias_solicitacao" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "departamento" TEXT,
    "status" TEXT NOT NULL,
    "aberta_em" VARCHAR(10) NOT NULL,
    "finalizada_em" VARCHAR(10),
    "finalizador_id" TEXT,
    "responsaveis" TEXT[],
    "avaliacao" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acessorias_solicitacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acessorias_daily" (
    "nexus_user_id" TEXT NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "processos_iniciados" INTEGER NOT NULL DEFAULT 0,
    "processos_concluidos" INTEGER NOT NULL DEFAULT 0,
    "dias_conclusao" INTEGER NOT NULL DEFAULT 0,
    "entregas" INTEGER NOT NULL DEFAULT 0,
    "entregas_atrasadas" INTEGER NOT NULL DEFAULT 0,
    "solicitacoes_finalizadas" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acessorias_daily_pkey" PRIMARY KEY ("nexus_user_id","day")
);

-- CreateIndex
CREATE INDEX "acessorias_usuario_nexus_user_id_idx" ON "acessorias_usuario"("nexus_user_id");

-- CreateIndex
CREATE INDEX "acessorias_processo_gestor_id_idx" ON "acessorias_processo"("gestor_id");

-- CreateIndex
CREATE INDEX "acessorias_entrega_resp_entrega_id_idx" ON "acessorias_entrega"("resp_entrega_id");

-- CreateIndex
CREATE INDEX "acessorias_daily_day_idx" ON "acessorias_daily"("day");

