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

/** Texto corrigido pela IA (revisão aplicável). */
export interface CorrectionResponse {
  text: string;
}

/** Imagem gerada por IA e já salva na galeria (retorna a URL pública). */
export interface ImageResponse {
  url: string;
  width: number | null;
  height: number | null;
}

/** Provedores de geração de imagem (config dedicada). */
export type ImageProvider = 'OPENAI' | 'GEMINI';

/** Item do catálogo de provedores de imagem exibido no painel. */
export interface ImageProviderInfo {
  id: ImageProvider;
  label: string;
  defaultModel: string;
  defaultBaseUrl: string;
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
  /** Geração de imagem (config dedicada). */
  imageProvider: ImageProvider | null;
  imageKeyHint: string | null;
  imageModel: string | null;
  imageBaseUrl: string | null;
  imageProviders: ImageProviderInfo[];
}

/** Atualização parcial: campo `null`/omitido mantém; string vazia limpa. */
export interface AiSettingsRequest {
  provider?: AiProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  tavilyApiKey?: string;
  imageProvider?: ImageProvider;
  imageApiKey?: string;
  imageModel?: string;
  imageBaseUrl?: string;
}
