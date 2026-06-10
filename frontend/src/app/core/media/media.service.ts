import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import {
  MediaEditRequest,
  MediaResponse,
  MediaSummary,
  MediaUpdateRequest,
} from './media.models';

/**
 * Mídias incorporadas (RF03) sobre o [ApiService]. O HttpClient define o boundary multipart a
 * partir do FormData e envia o cookie de sessão + token XSRF automaticamente.
 */
@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly api = inject(ApiService);

  upload(file: File): Observable<MediaResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.api.post<MediaResponse>('/admin/media', form);
  }

  list(q?: string, tag?: string): Observable<MediaSummary[]> {
    return this.api.get<MediaSummary[]>('/admin/media', {
      q: q?.trim() || undefined,
      tag: tag || undefined,
    });
  }

  /** Tags em uso na galeria (chips de filtro). */
  tags(): Observable<string[]> {
    return this.api.get<string[]>('/admin/media/tags');
  }

  /** Metadados editáveis (alt, descrição, tags). */
  update(id: string, request: MediaUpdateRequest): Observable<MediaSummary> {
    return this.api.put<MediaSummary>(`/admin/media/${id}`, request);
  }

  /** Edição de imagem no servidor — retorna a NOVA mídia criada. */
  edit(id: string, request: MediaEditRequest): Observable<MediaSummary> {
    return this.api.post<MediaSummary>(`/admin/media/${id}/edits`, request);
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/media/${id}`);
  }
}
