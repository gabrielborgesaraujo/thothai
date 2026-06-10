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

/** Provedores de LLM suportados. */
export type AiProvider = 'ANTHROPIC' | 'OPENAI' | 'GEMINI' | 'QWEN' | 'OPENAI_COMPATIBLE';

/** Item do catálogo de provedores exibido no painel. */
export interface AiProviderInfo {
  id: AiProvider;
  label: string;
  defaultModel: string | null;
  defaultBaseUrl: string | null;
  requiresBaseUrl: boolean;
}

/** Estado das integrações de IA — chaves aparecem só como sufixo de conferência. */
export interface AiSettings {
  provider: AiProvider;
  keySource: AiKeySource | null;
  keyHint: string | null;
  model: string | null;
  baseUrl: string | null;
  defaultModel: string;
  defaultBaseUrl: string | null;
  providers: AiProviderInfo[];
  tavilySource: AiKeySource | null;
  tavilyKeyHint: string | null;
}

/** Atualização parcial: campo `null`/omitido mantém; string vazia limpa. */
export interface AiSettingsRequest {
  provider?: AiProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  tavilyApiKey?: string;
}
