import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { MediaResponse } from './media.models';

/**
 * Upload de mídias incorporadas (RF03) sobre o [ApiService]. O HttpClient define o boundary
 * multipart a partir do FormData e envia o cookie de sessão + token XSRF automaticamente.
 */
@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly api = inject(ApiService);

  upload(file: File): Observable<MediaResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.api.post<MediaResponse>('/admin/media', form);
  }
}
