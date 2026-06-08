import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { ApiService } from '../api.service';
import { AuthUser } from './auth.models';

/**
 * Estado de autenticação do admin (RF01). A sessão vive no cookie HttpOnly do backend; aqui
 * mantemos apenas o usuário corrente em um signal para a UI reagir.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly currentUser = signal<AuthUser | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  login(username: string, password: string): Observable<AuthUser> {
    return this.api
      .post<AuthUser>('/auth/login', { username, password })
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  logout(): Observable<void> {
    return this.api.post<void>('/auth/logout').pipe(tap(() => this.currentUser.set(null)));
  }

  /** Confirma a sessão no servidor; usado pelo guard. Retorna null se não autenticado. */
  fetchSession(): Observable<AuthUser | null> {
    return this.api.get<AuthUser>('/auth/me').pipe(
      tap((user) => this.currentUser.set(user)),
      catchError(() => {
        this.currentUser.set(null);
        return of(null);
      }),
    );
  }

  clear(): void {
    this.currentUser.set(null);
  }
}
