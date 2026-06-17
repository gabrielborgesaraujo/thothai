import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import {
  AiSettings,
  AiSettingsRequest,
  AuthorMemoryStatus,
  CorrectionResponse,
  DraftResponse,
  ImageResponse,
  ReviewResponse,
  SnippetResponse,
} from './assistant.models';
import { PromptHistoryFilters, PromptHistoryItem } from './prompt-history.models';

/** Assistência de IA do editor (RF04 rascunho + busca viva; RF05 revisão; isca para LinkedIn). */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly api = inject(ApiService);

  /** `instructions` (opcional) é o prompt customizado do autor (modelo flexível). */
  generateDraft(theme: string, instructions?: string): Observable<DraftResponse> {
    return this.api.post<DraftResponse>('/admin/assistant/draft', { theme, instructions });
  }

  /** Gera uma imagem por IA e devolve a URL pública (já salva na galeria). */
  generateImage(prompt: string): Observable<ImageResponse> {
    return this.api.post<ImageResponse>('/admin/assistant/image', { prompt });
  }

  review(content: string): Observable<ReviewResponse> {
    return this.api.post<ReviewResponse>('/admin/assistant/review', { content });
  }

  /** Devolve o texto corrigido pela IA, preservando o Markdown (antes/depois no editor). */
  applyReview(content: string): Observable<CorrectionResponse> {
    return this.api.post<CorrectionResponse>('/admin/assistant/apply-review', { content });
  }

  generateSnippet(title: string, content: string): Observable<SnippetResponse> {
    return this.api.post<SnippetResponse>('/admin/assistant/snippet', { title, content });
  }

  /** Adapta o conteúdo para um post nativo do LinkedIn (dentro do limite de caracteres). */
  formatForLinkedIn(title: string, content: string): Observable<SnippetResponse> {
    return this.api.post<SnippetResponse>('/admin/assistant/linkedin-format', { title, content });
  }

  // --- Histórico de prompts (favoritos + filtros) ---
  listPrompts(filters: PromptHistoryFilters = {}): Observable<PromptHistoryItem[]> {
    return this.api.get<PromptHistoryItem[]>('/admin/assistant/prompts', {
      type: filters.type,
      favoritesOnly: filters.favoritesOnly ? true : undefined,
      q: filters.q?.trim() || undefined,
    });
  }

  setPromptFavorite(id: string, favorite: boolean): Observable<PromptHistoryItem> {
    return this.api.put<PromptHistoryItem>(
      `/admin/assistant/prompts/${id}/favorite?favorite=${favorite}`,
    );
  }

  deletePrompt(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/assistant/prompts/${id}`);
  }

  // --- Chaves de IA configuradas pelo usuário ---
  getSettings(): Observable<AiSettings> {
    return this.api.get<AiSettings>('/admin/assistant/settings');
  }

  updateSettings(request: AiSettingsRequest): Observable<AiSettings> {
    return this.api.put<AiSettings>('/admin/assistant/settings', request);
  }

  // --- Memória de publicações (RAG) ---
  memoryStatus(): Observable<AuthorMemoryStatus> {
    return this.api.get<AuthorMemoryStatus>('/admin/assistant/memory');
  }

  reindexMemory(): Observable<AuthorMemoryStatus> {
    return this.api.post<AuthorMemoryStatus>('/admin/assistant/memory/reindex');
  }
}
