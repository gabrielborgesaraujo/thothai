import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { ApiService } from '../api.service';
import { AccountInfo, AuthUser, RegisterRequest } from './auth.models';

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

  /** Auto-registro de publicador (Fase 2): nasce pendente até a aprovação do administrador. */
  register(request: RegisterRequest): Observable<unknown> {
    return this.api.post<unknown>('/auth/register', request);
  }

  /** Troca a senha do admin (RF01). */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.api.post<void>('/admin/account/password', { currentPassword, newPassword });
  }

  /** Dados da conta do usuário logado. */
  accountInfo(): Observable<AccountInfo> {
    return this.api.get<AccountInfo>('/admin/account');
  }

  updateAccount(email: string): Observable<AccountInfo> {
    return this.api.put<AccountInfo>('/admin/account', { email });
  }

  /** Disponibilidade do endereço público (checagem ao vivo no cadastro). */
  checkHandle(handle: string): Observable<{ available: boolean }> {
    return this.api.get<{ available: boolean }>('/auth/handle-available', { handle });
  }

  /** Pedido do link de redefinição de senha (sempre silencioso no servidor). */
  requestPasswordReset(identifier: string): Observable<void> {
    return this.api.post<void>('/auth/password-reset/request', { identifier });
  }

  /** Redefine a senha com o token recebido por e-mail (30 minutos, uso único). */
  confirmPasswordReset(token: string, newPassword: string): Observable<void> {
    return this.api.post<void>('/auth/password-reset/confirm', { token, newPassword });
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
