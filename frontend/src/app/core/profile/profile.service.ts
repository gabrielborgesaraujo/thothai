import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { Profile, ProfileRequest } from './profile.models';

/** Publicador no diretório da plataforma (landing). */
export interface PublisherCard {
  handle: string;
  displayName: string;
  headline: string | null;
  photoUrl: string | null;
}

/** Cartão de identidade do publicador (RF07), público (por handle) e admin. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = inject(ApiService);

  getPublic(handle: string): Observable<Profile> {
    return this.api.get<Profile>(`/p/${handle}/profile`);
  }

  /** Diretório de publicadores ativos da plataforma. */
  publishers(): Observable<PublisherCard[]> {
    return this.api.get<PublisherCard[]>('/publishers');
  }

  getAdmin(): Observable<Profile> {
    return this.api.get<Profile>('/admin/profile');
  }

  save(request: ProfileRequest): Observable<Profile> {
    return this.api.put<Profile>('/admin/profile', request);
  }
}
