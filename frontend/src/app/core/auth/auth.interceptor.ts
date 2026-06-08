import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Trata 401 de forma global: limpa a sessão e leva ao login. Ignora as próprias rotas de auth
 * (ex.: `/auth/me` retorna 401 esperado quando não há sessão) para evitar laços de redirecionamento.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/')) {
        auth.clear();
        void router.navigate(['/admin/login']);
      }
      return throwError(() => error);
    }),
  );
};
