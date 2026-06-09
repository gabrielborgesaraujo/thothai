/** Rascunho gerado com IA + busca viva (RF04). */
export interface DraftResponse {
  title: string;
  summary: string | null;
  body: string;
  sources: string[];
}

/** Recomendações da revisão contextual (RF05). */
export interface ReviewResponse {
  recommendations: string[];
}

/** "Isca" de conteúdo para o LinkedIn gerada por IA. */
export interface SnippetResponse {
  text: string;
}
