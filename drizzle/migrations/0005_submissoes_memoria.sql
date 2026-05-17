CREATE TYPE "public"."submissao_status" AS ENUM('pendente', 'aprovada', 'rejeitada');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submissoes_memoria" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"email" varchar(255),
	"tipo" varchar(50) DEFAULT 'texto' NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"conteudo" text NOT NULL,
	"url_midia" varchar(500),
	"lugar" varchar(255),
	"periodo" varchar(100),
	"status" "submissao_status" DEFAULT 'pendente' NOT NULL,
	"notas_moderacao" text,
	"revisor_id" varchar(36),
	"revisado_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submissoes_memoria" ADD CONSTRAINT "submissoes_memoria_revisor_id_users_id_fk" FOREIGN KEY ("revisor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
