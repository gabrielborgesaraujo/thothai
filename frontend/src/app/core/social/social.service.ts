import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

/** Estado da conexão LinkedIn do publicador (o app é da plataforma). */
export interface LinkedInStatus {
  configured: boolean;
  connected: boolean;
  memberName: string | null;
  tokenExpiresAt: string | null;
}

/** Estado da integração macro (app da plataforma) — visão do admin do sistema. */
export interface LinkedInAppStatus {
  configured: boolean;
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

  // --- Integração macro (admin do sistema) ---
  linkedInAppStatus(): Observable<LinkedInAppStatus> {
    return this.api.get<LinkedInAppStatus>('/system/integrations/linkedin');
  }

  saveLinkedInApp(clientId: string, clientSecret: string): Observable<LinkedInAppStatus> {
    return this.api.put<LinkedInAppStatus>('/system/integrations/linkedin', {
      clientId,
      clientSecret,
    });
  }

  /** URL de autorização OAuth — redirecione o navegador para ela. */
  linkedInAuthorizeUrl(): Observable<{ url: string }> {
    return this.api.get<{ url: string }>('/admin/social/linkedin/authorize-url');
  }

  shareOnLinkedIn(
    text: string,
    url: string | null,
    postId: string | null,
  ): Observable<LinkedInShareResponse> {
    return this.api.post<LinkedInShareResponse>('/admin/social/linkedin/share', {
      text,
      url,
      postId,
    });
  }

  disconnectLinkedIn(): Observable<LinkedInStatus> {
    return this.api.delete<LinkedInStatus>('/admin/social/linkedin');
  }
}
