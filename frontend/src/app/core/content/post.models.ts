/** Página genérica retornada pela API (contrato estável de paginação). */
export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Contadores do dashboard. */
export interface PostStats {
  draft: number;
  scheduled: number;
  published: number;
  total: number;
}

/** Categoria de postagem (RF02). */
export type PostType = 'ARTICLE' | 'TUTORIAL' | 'NOTE';

/** Estado de publicação (RF02). SCHEDULED aguarda o horário de `scheduledAt`. */
export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';

/** Filtros da listagem administrativa. */
export interface PostFilters {
  status?: PostStatus;
  type?: PostType;
  q?: string;
}

/** Item de listagem (sem corpo) — admin e portal público (RF06). */
export interface PostSummary {
  id: string;
  title: string;
  slug: string;
  type: PostType;
  status: PostStatus;
  summary: string | null;
  bannerUrl: string | null;
  tags: string[];
  publishedAt: string | null;
  scheduledAt: string | null;
  linkedinSharedAt: string | null;
}

/** Postagem completa para o painel admin. */
export interface Post {
  id: string;
  title: string;
  slug: string;
  type: PostType;
  status: PostStatus;
  summary: string | null;
  body: string;
  bannerUrl: string | null;
  tags: string[];
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Payload de criação/atualização (RF02). O `slug` é derivado do título quando omitido. */
export interface PostRequest {
  title: string;
  type: PostType;
  status: PostStatus;
  summary: string | null;
  body: string;
  slug?: string;
  bannerUrl: string | null;
  tags: string[];
  /** Obrigatório quando `status` é SCHEDULED (ISO-8601). */
  scheduledAt: string | null;
}

/** Link de navegação entre publicações (anterior/próxima). */
export interface PostLink {
  slug: string;
  title: string;
}

/** Publicação relacionada (tags em comum) exibida no fim da leitura. */
export interface RelatedPost {
  slug: string;
  title: string;
  type: PostType;
  bannerUrl: string | null;
}

/** Versão do histórico (item da listagem). */
export interface PostRevisionSummary {
  id: string;
  title: string;
  createdAt: string | null;
}

/** Versão completa para restauração no editor. */
export interface PostRevision {
  id: string;
  title: string;
  summary: string | null;
  body: string;
  bannerUrl: string | null;
  createdAt: string | null;
}

/** Postagem publicada para leitura pública (RF06), com navegação e relacionadas. */
export interface PublicPost {
  title: string;
  slug: string;
  type: PostType;
  summary: string | null;
  body: string;
  bannerUrl: string | null;
  tags: string[];
  publishedAt: string | null;
  previous: PostLink | null;
  next: PostLink | null;
  related: RelatedPost[];
}
