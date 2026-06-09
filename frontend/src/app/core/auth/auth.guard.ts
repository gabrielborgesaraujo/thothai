import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

/** Protege as rotas administrativas: confirma a sessão e redireciona ao login se ausente (RF01). */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  return auth
    .fetchSession()
    .pipe(map((user) => (user ? true : router.createUrlTree(['/admin/login']))));
};
