import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { Profile, ProfileRequest } from './profile.models';

/** Cartão de identidade do publicador (RF07), público e admin. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = inject(ApiService);

  getPublic(): Observable<Profile> {
    return this.api.get<Profile>('/profile');
  }

  getAdmin(): Observable<Profile> {
    return this.api.get<Profile>('/admin/profile');
  }

  save(request: ProfileRequest): Observable<Profile> {
    return this.api.put<Profile>('/admin/profile', request);
  }
}
