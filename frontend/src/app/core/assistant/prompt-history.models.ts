/** Tipo de prompt registrado no histórico de IA. */
export type PromptHistoryType = 'DRAFT' | 'IMAGE';

/** Item do histórico de prompts de IA do publicador. */
export interface PromptHistoryItem {
  id: string;
  type: PromptHistoryType;
  prompt: string;
  favorite: boolean;
  createdAt: string | null;
}

/** Filtros da consulta ao histórico. */
export interface PromptHistoryFilters {
  type?: PromptHistoryType;
  favoritesOnly?: boolean;
  q?: string;
}
