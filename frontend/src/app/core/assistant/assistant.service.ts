import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import {
  AiSettings,
  AiSettingsRequest,
  DraftResponse,
  ReviewResponse,
  SnippetResponse,
} from './assistant.models';

/** Assistência de IA do editor (RF04 rascunho + busca viva; RF05 revisão; isca para LinkedIn). */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly api = inject(ApiService);

  generateDraft(theme: string): Observable<DraftResponse> {
    return this.api.post<DraftResponse>('/admin/assistant/draft', { theme });
  }

  review(content: string): Observable<ReviewResponse> {
    return this.api.post<ReviewResponse>('/admin/assistant/review', { content });
  }

  generateSnippet(title: string, content: string): Observable<SnippetResponse> {
    return this.api.post<SnippetResponse>('/admin/assistant/snippet', { title, content });
  }

  // --- Chaves de IA configuradas pelo usuário ---
  getSettings(): Observable<AiSettings> {
    return this.api.get<AiSettings>('/admin/assistant/settings');
  }

  updateSettings(request: AiSettingsRequest): Observable<AiSettings> {
    return this.api.put<AiSettings>('/admin/assistant/settings', request);
  }
}
