import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { DraftResponse, ReviewResponse } from './assistant.models';

/** Assistência de IA do editor (RF04 rascunho + busca viva; RF05 revisão contextual). */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly api = inject(ApiService);

  generateDraft(theme: string): Observable<DraftResponse> {
    return this.api.post<DraftResponse>('/admin/assistant/draft', { theme });
  }

  review(content: string): Observable<ReviewResponse> {
    return this.api.post<ReviewResponse>('/admin/assistant/review', { content });
  }
}
