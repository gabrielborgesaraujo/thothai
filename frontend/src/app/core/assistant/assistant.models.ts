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

/** Origem efetiva de uma chave de IA. */
export type AiKeySource = 'CUSTOM' | 'ENVIRONMENT';

/** Estado das integrações de IA — chaves aparecem só como sufixo de conferência. */
export interface AiSettings {
  anthropicSource: AiKeySource | null;
  anthropicKeyHint: string | null;
  anthropicModel: string | null;
  defaultModel: string;
  tavilySource: AiKeySource | null;
  tavilyKeyHint: string | null;
}

/** Atualização parcial: campo `null`/omitido mantém; string vazia limpa. */
export interface AiSettingsRequest {
  anthropicApiKey?: string;
  anthropicModel?: string;
  tavilyApiKey?: string;
}
