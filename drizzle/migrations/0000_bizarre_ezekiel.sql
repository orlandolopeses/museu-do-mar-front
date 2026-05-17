CREATE TYPE "public"."acervo_tipo" AS ENUM('foto', 'video', 'audio', 'documento');--> statement-breakpoint
CREATE TYPE "public"."forum_status" AS ENUM('aberto', 'fechado');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('rascunho', 'publicado');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "acervo" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tipo" "acervo_tipo" NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text,
	"url" varchar(500) NOT NULL,
	"thumb_url" varchar(500),
	"tags" text,
	"colecao" varchar(100),
	"autor" varchar(255),
	"ano" integer,
	"publicado" boolean DEFAULT false NOT NULL,
	"uploaded_by" varchar(36),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contatos" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"assunto" varchar(255),
	"mensagem" text NOT NULL,
	"lido" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventos" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text,
	"local" varchar(255),
	"data_inicio" timestamp NOT NULL,
	"data_fim" timestamp,
	"categoria" varchar(100),
	"cover_image" varchar(500),
	"link_externo" varchar(500),
	"publicado" boolean DEFAULT false NOT NULL,
	"created_by" varchar(36),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forum_respostas" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"topico_id" varchar(36) NOT NULL,
	"conteudo" text NOT NULL,
	"autor_nome" varchar(255) NOT NULL,
	"autor_email" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forum_topicos" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"conteudo" text NOT NULL,
	"autor_nome" varchar(255) NOT NULL,
	"autor_email" varchar(255),
	"status" "forum_status" DEFAULT 'aberto' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "paginas" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"conteudo" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" varchar(36),
	CONSTRAINT "paginas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" text,
	"content" text NOT NULL,
	"cover_image" varchar(500),
	"status" "post_status" DEFAULT 'rascunho' NOT NULL,
	"author_id" varchar(36),
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "acervo" ADD CONSTRAINT "acervo_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "eventos" ADD CONSTRAINT "eventos_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "forum_respostas" ADD CONSTRAINT "forum_respostas_topico_id_forum_topicos_id_fk" FOREIGN KEY ("topico_id") REFERENCES "public"."forum_topicos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "paginas" ADD CONSTRAINT "paginas_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
