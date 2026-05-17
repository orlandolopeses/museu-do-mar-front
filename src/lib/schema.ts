import {
  pgTable, varchar, text, timestamp, boolean, integer, pgEnum, uniqueIndex, index, jsonb,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const postStatusEnum = pgEnum("post_status", ["rascunho", "publicado"]);
export const submissaoStatusEnum = pgEnum("submissao_status", ["pendente", "aprovada", "rejeitada"]);
export const acervoTipoEnum = pgEnum("acervo_tipo", ["foto", "video", "audio", "documento"]);
export const forumStatusEnum = pgEnum("forum_status", ["aberto", "fechado"]);
export const userStatusEnum = pgEnum("user_status", ["ativo", "pendente", "bloqueado"]);
export const roleScopeEnum = pgEnum("role_scope", ["plataforma", "educacional", "comunitario", "institucional"]);
export const institutionTypeEnum = pgEnum("institution_type", ["escola", "universidade", "secretaria", "associacao", "empresa", "imprensa", "outra"]);
export const profileTypeEnum = pgEnum("profile_type", [
  "professor",
  "estudante",
  "gestor",
  "gestor_educacional",
  "comunidade",
  "parceiro",
  "apoiador",
  "comunicador",
  "equipe",
  "equipe_producao",
  "equipe_comunicacao",
  "bolsista",
  "voluntario",
]);
export const membershipStatusEnum = pgEnum("membership_status", ["ativo", "inativo", "concluido", "cancelado"]);
export const activityStatusEnum = pgEnum("activity_status", ["planejada", "em_andamento", "concluida"]);
export const journeyTrackingOriginEnum = pgEnum("journey_tracking_origin", ["bolsista", "voluntario", "equipe-producao"]);
export const journeyTrackingStatusEnum = pgEnum("journey_tracking_status", ["aberto", "em_andamento", "concluido"]);

// ─── Usuários (admin) ─────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id:           varchar("id", { length: 36 }).primaryKey(),
  email:        varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name:         varchar("name", { length: 255 }).notNull(),
  isAdmin:      boolean("is_admin").notNull().default(false),
  status:       userStatusEnum("status").notNull().default("ativo"),
  primaryRole:  varchar("primary_role", { length: 100 }),
  avatarUrl:    varchar("avatar_url", { length: 500 }),
  phone:        varchar("phone", { length: 50 }),
  lastLoginAt:  timestamp("last_login_at"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  privacyAcceptedAt: timestamp("privacy_accepted_at"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ─── Identidade, papéis e vínculos ────────────────────────────────────────────
export const roles = pgTable("roles", {
  id:          varchar("id", { length: 36 }).primaryKey(),
  slug:        varchar("slug", { length: 100 }).notNull().unique(),
  name:        varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  scope:       roleScopeEnum("scope").notNull().default("plataforma"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const permissions = pgTable("permissions", {
  id:          varchar("id", { length: 36 }).primaryKey(),
  slug:        varchar("slug", { length: 150 }).notNull().unique(),
  name:        varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  resource:    varchar("resource", { length: 100 }).notNull(),
  action:      varchar("action", { length: 100 }).notNull(),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const rolePermissions = pgTable("role_permissions", {
  id:           varchar("id", { length: 36 }).primaryKey(),
  roleId:       varchar("role_id", { length: 36 }).notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: varchar("permission_id", { length: 36 }).notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  rolePermissionUnique: uniqueIndex("role_permissions_role_permission_unique").on(table.roleId, table.permissionId),
}));

export const userRoles = pgTable("user_roles", {
  id:         varchar("id", { length: 36 }).primaryKey(),
  userId:     varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId:     varchar("role_id", { length: 36 }).notNull().references(() => roles.id, { onDelete: "cascade" }),
  isPrimary:  boolean("is_primary").notNull().default(false),
  assignedBy: varchar("assigned_by", { length: 36 }).references(() => users.id),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userRoleUnique: uniqueIndex("user_roles_user_role_unique").on(table.userId, table.roleId),
}));

export const profiles = pgTable("profiles", {
  id:              varchar("id", { length: 36 }).primaryKey(),
  userId:          varchar("user_id", { length: 36 }).notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  displayName:     varchar("display_name", { length: 255 }),
  bio:             text("bio"),
  territorio:      varchar("territorio", { length: 255 }),
  institutionName: varchar("institution_name", { length: 255 }),
  schoolName:      varchar("school_name", { length: 255 }),
  city:            varchar("city", { length: 150 }),
  state:           varchar("state", { length: 100 }),
  profileType:     profileTypeEnum("profile_type"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export const instituicoes = pgTable("instituicoes", {
  id:                varchar("id", { length: 36 }).primaryKey(),
  nome:              varchar("nome", { length: 255 }).notNull(),
  tipo:              institutionTypeEnum("tipo").notNull().default("outra"),
  cidade:            varchar("cidade", { length: 150 }),
  estado:            varchar("estado", { length: 100 }),
  responsavelNome:   varchar("responsavel_nome", { length: 255 }),
  responsavelEmail:  varchar("responsavel_email", { length: 255 }),
  ativo:             boolean("ativo").notNull().default(true),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
});

export const userInstituicoes = pgTable("user_instituicoes", {
  id:                 varchar("id", { length: 36 }).primaryKey(),
  userId:             varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  instituicaoId:      varchar("instituicao_id", { length: 36 }).notNull().references(() => instituicoes.id, { onDelete: "cascade" }),
  funcaoInstitucional:varchar("funcao_institucional", { length: 150 }),
  isPrimary:          boolean("is_primary").notNull().default(false),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userInstituicaoUnique: uniqueIndex("user_instituicoes_user_instituicao_unique").on(table.userId, table.instituicaoId),
}));

export const turmas = pgTable("turmas", {
  id:                varchar("id", { length: 36 }).primaryKey(),
  instituicaoId:     varchar("instituicao_id", { length: 36 }).notNull().references(() => instituicoes.id, { onDelete: "cascade" }),
  nome:              varchar("nome", { length: 150 }).notNull(),
  anoLetivo:         integer("ano_letivo"),
  segmento:          varchar("segmento", { length: 100 }),
  turno:             varchar("turno", { length: 100 }),
  responsavelUserId: varchar("responsavel_user_id", { length: 36 }).references(() => users.id),
  ativo:             boolean("ativo").notNull().default(true),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
});

export const matriculasTurma = pgTable("matriculas_turma", {
  id:        varchar("id", { length: 36 }).primaryKey(),
  turmaId:   varchar("turma_id", { length: 36 }).notNull().references(() => turmas.id, { onDelete: "cascade" }),
  userId:    varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  status:    membershipStatusEnum("status").notNull().default("ativo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  matriculaUnique: uniqueIndex("matriculas_turma_user_turma_unique").on(table.turmaId, table.userId),
}));

export const atividadesTurma = pgTable("atividades_turma", {
  id:          varchar("id", { length: 36 }).primaryKey(),
  turmaId:     varchar("turma_id", { length: 36 }).notNull().references(() => turmas.id, { onDelete: "cascade" }),
  createdBy:   varchar("created_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  origemChave: varchar("origem_chave", { length: 160 }).notNull(),
  titulo:      varchar("titulo", { length: 255 }).notNull(),
  resumo:      text("resumo").notNull(),
  foco:        varchar("foco", { length: 255 }),
  proximoPasso:text("proximo_passo"),
  status:      activityStatusEnum("status").notNull().default("planejada"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  atividadeTurmaOrigemUnique: uniqueIndex("atividades_turma_turma_origem_unique").on(table.turmaId, table.origemChave),
}));

// ─── Blog / Notícias ──────────────────────────────────────────────────────────
export const posts = pgTable("posts", {
  id:          varchar("id", { length: 36 }).primaryKey(),
  slug:        varchar("slug", { length: 255 }).notNull().unique(),
  title:       varchar("title", { length: 255 }).notNull(),
  summary:     text("summary"),
  content:     text("content").notNull(),
  coverImage:  varchar("cover_image", { length: 500 }),
  status:      postStatusEnum("status").notNull().default("rascunho"),
  authorId:    varchar("author_id", { length: 36 }).references(() => users.id),
  publishedAt: timestamp("published_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

// ─── Acervo (fotos, vídeos, documentos) ──────────────────────────────────────
export const acervo = pgTable("acervo", {
  id:          varchar("id", { length: 36 }).primaryKey(),
  tipo:        acervoTipoEnum("tipo").notNull(),
  titulo:      varchar("titulo", { length: 255 }).notNull(),
  descricao:   text("descricao"),
  url:         varchar("url", { length: 500 }).notNull(),
  thumbUrl:    varchar("thumb_url", { length: 500 }),
  tags:        text("tags"),           // CSV
  colecao:     varchar("colecao", { length: 100 }),
  autor:       varchar("autor", { length: 255 }),
  ano:         integer("ano"),
  publicado:   boolean("publicado").notNull().default(false),
  uploadedBy:  varchar("uploaded_by", { length: 36 }).references(() => users.id),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ─── Agenda de Eventos ────────────────────────────────────────────────────────
export const eventos = pgTable("eventos", {
  id:          varchar("id", { length: 36 }).primaryKey(),
  titulo:      varchar("titulo", { length: 255 }).notNull(),
  descricao:   text("descricao"),
  instituicaoId:varchar("instituicao_id", { length: 36 }).references(() => instituicoes.id, { onDelete: "set null" }),
  local:       varchar("local", { length: 255 }),
  dataInicio:  timestamp("data_inicio").notNull(),
  dataFim:     timestamp("data_fim"),
  categoria:   varchar("categoria", { length: 100 }),  // cineclube, oficina, sarau, etc.
  coverImage:  varchar("cover_image", { length: 500 }),
  linkExterno: varchar("link_externo", { length: 500 }),
  publicado:   boolean("publicado").notNull().default(false),
  createdBy:   varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ─── Fórum ────────────────────────────────────────────────────────────────────
export const forumTopicos = pgTable("forum_topicos", {
  id:        varchar("id", { length: 36 }).primaryKey(),
  titulo:    varchar("titulo", { length: 255 }).notNull(),
  conteudo:  text("conteudo").notNull(),
  autorNome: varchar("autor_nome", { length: 255 }).notNull(),
  autorEmail:varchar("autor_email", { length: 255 }),
  status:    forumStatusEnum("status").notNull().default("aberto"),
  pinned:    boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const forumRespostas = pgTable("forum_respostas", {
  id:        varchar("id", { length: 36 }).primaryKey(),
  topicoId:  varchar("topico_id", { length: 36 }).notNull().references(() => forumTopicos.id, { onDelete: "cascade" }),
  conteudo:  text("conteudo").notNull(),
  autorNome: varchar("autor_nome", { length: 255 }).notNull(),
  autorEmail:varchar("autor_email", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Acompanhamento de jornadas secundárias ──────────────────────────────────
export const acompanhamentosJornada = pgTable("acompanhamentos_jornada", {
  id:               varchar("id", { length: 36 }).primaryKey(),
  origem:           journeyTrackingOriginEnum("origem").notNull(),
  userId:           varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  titulo:           varchar("titulo", { length: 255 }).notNull(),
  resumo:           text("resumo").notNull(),
  proximoPasso:     text("proximo_passo"),
  apoioNecessario:  text("apoio_necessario"),
  status:           journeyTrackingStatusEnum("status").notNull().default("aberto"),
  referenciaEventoId: varchar("referencia_evento_id", { length: 36 }).references(() => eventos.id, { onDelete: "set null" }),
  referenciaTopicoId: varchar("referencia_topico_id", { length: 36 }).references(() => forumTopicos.id, { onDelete: "set null" }),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  acompanhamentoJourneyUserIdx: index("acompanhamentos_jornada_origem_user_idx").on(table.origem, table.userId),
  acompanhamentoJourneyUpdatedIdx: index("acompanhamentos_jornada_updated_idx").on(table.updatedAt),
}));

// ─── Páginas estáticas (sobre, contato, etc.) ────────────────────────────────
export const paginas = pgTable("paginas", {
  id:        varchar("id", { length: 36 }).primaryKey(),
  slug:      varchar("slug", { length: 100 }).notNull().unique(),
  titulo:    varchar("titulo", { length: 255 }).notNull(),
  conteudo:  text("conteudo").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: varchar("updated_by", { length: 36 }).references(() => users.id),
});

// ─── Submissões de Memória (comunidade) ───────────────────────────────────────
export const submissoesMemoria = pgTable("submissoes_memoria", {
  id:               varchar("id", { length: 36 }).primaryKey(),
  nome:             varchar("nome", { length: 255 }).notNull(),
  email:            varchar("email", { length: 255 }),
  tipo:             varchar("tipo", { length: 50 }).notNull().default("texto"),
  titulo:           varchar("titulo", { length: 255 }).notNull(),
  conteudo:         text("conteudo").notNull(),
  urlMidia:         varchar("url_midia", { length: 500 }),
  lugar:            varchar("lugar", { length: 255 }),
  periodo:          varchar("periodo", { length: 100 }),
  status:           submissaoStatusEnum("status").notNull().default("pendente"),
  notasModerr:      text("notas_moderacao"),
  revisorId:        varchar("revisor_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  revisadoAt:       timestamp("revisado_at"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ─── Contato (formulário) ─────────────────────────────────────────────────────
export const contatos = pgTable("contatos", {
  id:        varchar("id", { length: 36 }).primaryKey(),
  nome:      varchar("nome", { length: 255 }).notNull(),
  email:     varchar("email", { length: 255 }).notNull(),
  assunto:   varchar("assunto", { length: 255 }),
  mensagem:  text("mensagem").notNull(),
  lido:      boolean("lido").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Trilhas pedagógicas (persistidas) ───────────────────────────────────────
export const trilhaPedagogicaAudienceEnum = pgEnum("trilha_pedagogica_audience", ["professor", "estudante"]);
export const trilhaPedagogicaContextKeyEnum = pgEnum("trilha_pedagogica_context_key", ["hasInstitutions", "hasTurmas", "hasEvents"]);

export const trilhasPedagogicas = pgTable("trilhas_pedagogicas", {
  id:                varchar("id", { length: 36 }).primaryKey(),
  slug:              varchar("slug", { length: 100 }).notNull().unique(),
  audience:          trilhaPedagogicaAudienceEnum("audience").notNull(),
  title:             varchar("title", { length: 255 }).notNull(),
  description:       text("description").notNull(),
  highlightPositive: text("highlight_positive").notNull(),
  highlightEmpty:    text("highlight_empty").notNull(),
  contextKey:        trilhaPedagogicaContextKeyEnum("context_key").notNull(),
  steps:             jsonb("steps").notNull().$type<string[]>(),
  links:             jsonb("links").notNull().$type<{ label: string; href: string }[]>(),
  active:            boolean("active").notNull().default(true),
  sortOrder:         integer("sort_order").notNull().default(0),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
  updatedBy:         varchar("updated_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
}, (table) => ({
  trilhaSlugIdx: uniqueIndex("trilhas_pedagogicas_slug_idx").on(table.slug),
  trilhaAudienceIdx: index("trilhas_pedagogicas_audience_idx").on(table.audience),
}));

// ─── Atividade ↔ Acervo (vínculo pedagógico) ─────────────────────────────────
export const atividadeAcervo = pgTable("atividade_acervo", {
  id:          varchar("id", { length: 36 }).primaryKey(),
  atividadeId: varchar("atividade_id", { length: 36 }).notNull().references(() => atividadesTurma.id, { onDelete: "cascade" }),
  acervoId:    varchar("acervo_id", { length: 36 }).notNull().references(() => acervo.id, { onDelete: "cascade" }),
  nota:        text("nota"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  atividadeAcervoUnique: uniqueIndex("atividade_acervo_atividade_acervo_unique").on(table.atividadeId, table.acervoId),
  atividadeIdx: index("atividade_acervo_atividade_idx").on(table.atividadeId),
}));

// ─── Gincana Check-ins ────────────────────────────────────────────────────────
export const gincanaCheckins = pgTable("gincana_checkins", {
  id:        varchar("id", { length: 36 }).primaryKey(),
  userId:    varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  stationId: varchar("station_id", { length: 100 }).notNull(),
  turmaId:   varchar("turma_id", { length: 36 }).references(() => turmas.id, { onDelete: "set null" }),
  lat:       text("lat"), 
  lng:       text("lng"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userStationIdx: index("gincana_checkins_user_station_idx").on(table.userId, table.stationId),
  turmaIdx: index("gincana_checkins_turma_idx").on(table.turmaId),
}));
