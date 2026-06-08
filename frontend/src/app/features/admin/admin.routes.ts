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
      // Gerenciador de postagens (RF02). 'new' antes de ':id' para não ser capturado pelo param.
      {
        path: 'posts',
        loadComponent: () => import('./posts/post-list/post-list').then((m) => m.PostList),
      },
      {
        path: 'posts/new',
        loadComponent: () => import('./posts/post-form/post-form').then((m) => m.PostForm),
      },
      {
        path: 'posts/:id',
        loadComponent: () => import('./posts/post-form/post-form').then((m) => m.PostForm),
      },
      // Gestão de perfil (RF08) entra aqui.
    ],
  },
];
