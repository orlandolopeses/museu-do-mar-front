DO $$ BEGIN
 CREATE TYPE "public"."trilha_pedagogica_audience" AS ENUM('professor', 'estudante');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."trilha_pedagogica_context_key" AS ENUM('hasInstitutions', 'hasTurmas', 'hasEvents');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trilhas_pedagogicas" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"audience" "trilha_pedagogica_audience" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"highlight_positive" text NOT NULL,
	"highlight_empty" text NOT NULL,
	"context_key" "trilha_pedagogica_context_key" NOT NULL,
	"steps" jsonb NOT NULL,
	"links" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" varchar(36)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trilhas_pedagogicas" ADD CONSTRAINT "trilhas_pedagogicas_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "trilhas_pedagogicas_slug_idx" ON "trilhas_pedagogicas" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trilhas_pedagogicas_audience_idx" ON "trilhas_pedagogicas" USING btree ("audience");