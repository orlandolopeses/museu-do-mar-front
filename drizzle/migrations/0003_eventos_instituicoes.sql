ALTER TABLE "eventos" ADD COLUMN "instituicao_id" varchar(36);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "eventos" ADD CONSTRAINT "eventos_instituicao_id_instituicoes_id_fk" FOREIGN KEY ("instituicao_id") REFERENCES "public"."instituicoes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;