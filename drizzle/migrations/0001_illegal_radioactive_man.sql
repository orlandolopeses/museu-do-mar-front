CREATE TYPE "public"."institution_type" AS ENUM('escola', 'universidade', 'secretaria', 'associacao', 'empresa', 'imprensa', 'outra');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('ativo', 'inativo', 'concluido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."profile_type" AS ENUM('professor', 'estudante', 'gestor_educacional', 'comunidade', 'parceiro', 'comunicador', 'equipe');--> statement-breakpoint
CREATE TYPE "public"."role_scope" AS ENUM('plataforma', 'educacional', 'comunitario', 'institucional');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ativo', 'pendente', 'bloqueado');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instituicoes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"tipo" "institution_type" DEFAULT 'outra' NOT NULL,
	"cidade" varchar(150),
	"estado" varchar(100),
	"responsavel_nome" varchar(255),
	"responsavel_email" varchar(255),
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "matriculas_turma" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"turma_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"status" "membership_status" DEFAULT 'ativo' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"slug" varchar(150) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"resource" varchar(100) NOT NULL,
	"action" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"display_name" varchar(255),
	"bio" text,
	"territorio" varchar(255),
	"institution_name" varchar(255),
	"school_name" varchar(255),
	"city" varchar(150),
	"state" varchar(100),
	"profile_type" "profile_type",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_permissions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"role_id" varchar(36) NOT NULL,
	"permission_id" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"scope" "role_scope" DEFAULT 'plataforma' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "turmas" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"instituicao_id" varchar(36) NOT NULL,
	"nome" varchar(150) NOT NULL,
	"ano_letivo" integer,
	"segmento" varchar(100),
	"turno" varchar(100),
	"responsavel_user_id" varchar(36),
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_instituicoes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"instituicao_id" varchar(36) NOT NULL,
	"funcao_institucional" varchar(150),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_roles" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"role_id" varchar(36) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"assigned_by" varchar(36),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'ativo' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "primary_role" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" varchar(500);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "privacy_accepted_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matriculas_turma" ADD CONSTRAINT "matriculas_turma_turma_id_turmas_id_fk" FOREIGN KEY ("turma_id") REFERENCES "public"."turmas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matriculas_turma" ADD CONSTRAINT "matriculas_turma_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "turmas" ADD CONSTRAINT "turmas_instituicao_id_instituicoes_id_fk" FOREIGN KEY ("instituicao_id") REFERENCES "public"."instituicoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "turmas" ADD CONSTRAINT "turmas_responsavel_user_id_users_id_fk" FOREIGN KEY ("responsavel_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_instituicoes" ADD CONSTRAINT "user_instituicoes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_instituicoes" ADD CONSTRAINT "user_instituicoes_instituicao_id_instituicoes_id_fk" FOREIGN KEY ("instituicao_id") REFERENCES "public"."instituicoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "matriculas_turma_user_turma_unique" ON "matriculas_turma" USING btree ("turma_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_role_permission_unique" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_instituicoes_user_instituicao_unique" ON "user_instituicoes" USING btree ("user_id","instituicao_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_roles_user_role_unique" ON "user_roles" USING btree ("user_id","role_id");