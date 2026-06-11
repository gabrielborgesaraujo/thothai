import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { PortfolioEntry, PortfolioEntryRequest } from './profile.models';

/** Portfólio curricular (RF08), público (só visíveis) e CRUD admin. */
@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly api = inject(ApiService);

  listPublic(handle: string): Observable<PortfolioEntry[]> {
    return this.api.get<PortfolioEntry[]>(`/p/${handle}/portfolio`);
  }

  listAdmin(): Observable<PortfolioEntry[]> {
    return this.api.get<PortfolioEntry[]>('/admin/portfolio');
  }

  get(id: string): Observable<PortfolioEntry> {
    return this.api.get<PortfolioEntry>(`/admin/portfolio/${id}`);
  }

  create(request: PortfolioEntryRequest): Observable<PortfolioEntry> {
    return this.api.post<PortfolioEntry>('/admin/portfolio', request);
  }

  update(id: string, request: PortfolioEntryRequest): Observable<PortfolioEntry> {
    return this.api.put<PortfolioEntry>(`/admin/portfolio/${id}`, request);
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/portfolio/${id}`);
  }
}
