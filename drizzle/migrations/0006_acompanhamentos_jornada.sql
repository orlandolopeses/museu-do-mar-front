CREATE TYPE "public"."journey_tracking_origin" AS ENUM('bolsista', 'voluntario', 'equipe-producao');--> statement-breakpoint
CREATE TYPE "public"."journey_tracking_status" AS ENUM('aberto', 'em_andamento', 'concluido');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "acompanhamentos_jornada" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"origem" "journey_tracking_origin" NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"resumo" text NOT NULL,
	"proximo_passo" text,
	"apoio_necessario" text,
	"status" "journey_tracking_status" DEFAULT 'aberto' NOT NULL,
	"referencia_evento_id" varchar(36),
	"referencia_topico_id" varchar(36),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "acompanhamentos_jornada" ADD CONSTRAINT "acompanhamentos_jornada_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "acompanhamentos_jornada" ADD CONSTRAINT "acompanhamentos_jornada_referencia_evento_id_eventos_id_fk" FOREIGN KEY ("referencia_evento_id") REFERENCES "public"."eventos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "acompanhamentos_jornada" ADD CONSTRAINT "acompanhamentos_jornada_referencia_topico_id_forum_topicos_id_fk" FOREIGN KEY ("referencia_topico_id") REFERENCES "public"."forum_topicos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acompanhamentos_jornada_origem_user_idx" ON "acompanhamentos_jornada" USING btree ("origem","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acompanhamentos_jornada_updated_idx" ON "acompanhamentos_jornada" USING btree ("updated_at");