CREATE TYPE "public"."activity_status" AS ENUM('planejada', 'em_andamento', 'concluida');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "atividades_turma" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"turma_id" varchar(36) NOT NULL,
	"created_by" varchar(36),
	"origem_chave" varchar(160) NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"resumo" text NOT NULL,
	"foco" varchar(255),
	"proximo_passo" text,
	"status" "activity_status" DEFAULT 'planejada' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atividades_turma" ADD CONSTRAINT "atividades_turma_turma_id_turmas_id_fk" FOREIGN KEY ("turma_id") REFERENCES "public"."turmas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atividades_turma" ADD CONSTRAINT "atividades_turma_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "atividades_turma_turma_origem_unique" ON "atividades_turma" USING btree ("turma_id","origem_chave");