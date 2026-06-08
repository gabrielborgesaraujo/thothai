import { Routes } from '@angular/router';
import { AdminLayout } from './admin-layout/admin-layout';
import { authGuard } from '../../core/auth/auth.guard';

export const adminRoutes: Routes = [
  // Login fica fora do layout autenticado.
  { path: 'login', loadComponent: () => import('./login/login').then((m) => m.Login) },
  {
    path: '',
    component: AdminLayout,
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard) },
      // Gerenciador de postagens (EPIC 2) e gestão de perfil (EPIC 6) entram aqui.
    ],
  },
];
