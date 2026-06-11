import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

/** Estado da conexão LinkedIn — segredos aparecem só como sufixo de conferência. */
export interface LinkedInStatus {
  configured: boolean;
  connected: boolean;
  memberName: string | null;
  tokenExpiresAt: string | null;
  clientIdHint: string | null;
}

export interface LinkedInShareResponse {
  postId: string;
}

/** Conexão e publicação no LinkedIn (conta vinculada via OAuth). */
@Injectable({ providedIn: 'root' })
export class SocialService {
  private readonly api = inject(ApiService);

  linkedInStatus(): Observable<LinkedInStatus> {
    return this.api.get<LinkedInStatus>('/admin/social/linkedin');
  }

  saveLinkedInCredentials(clientId: string, clientSecret: string): Observable<LinkedInStatus> {
    return this.api.put<LinkedInStatus>('/admin/social/linkedin', { clientId, clientSecret });
  }

  /** URL de autorização OAuth — redirecione o navegador para ela. */
  linkedInAuthorizeUrl(): Observable<{ url: string }> {
    return this.api.get<{ url: string }>('/admin/social/linkedin/authorize-url');
  }

  shareOnLinkedIn(text: string, url: string | null): Observable<LinkedInShareResponse> {
    return this.api.post<LinkedInShareResponse>('/admin/social/linkedin/share', { text, url });
  }

  disconnectLinkedIn(): Observable<LinkedInStatus> {
    return this.api.delete<LinkedInStatus>('/admin/social/linkedin');
  }
}
