import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-base-url.token';

type Query = Record<string, string | number | boolean | undefined>;

/**
 * Wrapper fino sobre [HttpClient] que prefixa a [API_BASE_URL] e sempre envia credenciais
 * (cookie de sessão — RF01). Serviços de domínio devem usar esta classe em vez do HttpClient cru.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get<T>(path: string, query?: Query): Observable<T> {
    return this.http.get<T>(this.url(path), { params: this.params(query), withCredentials: true });
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body, { withCredentials: true });
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), body, { withCredentials: true });
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path), { withCredentials: true });
  }

  private url(path: string): string {
    return `${this.baseUrl}/api${path.startsWith('/') ? path : `/${path}`}`;
  }

  private params(query?: Query): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
