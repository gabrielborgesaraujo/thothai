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
      // Gestão de mídias (RF03).
      {
        path: 'media',
        loadComponent: () => import('./media/media-list').then((m) => m.MediaList),
      },
      // Chaves de IA do usuário (RF04/RF05).
      {
        path: 'integrations',
        loadComponent: () => import('./integrations/integrations').then((m) => m.Integrations),
      },
      // Conta do admin (troca de senha — RF01).
      {
        path: 'account',
        loadComponent: () => import('./account/account').then((m) => m.Account),
      },
      // Gestão da plataforma (Fase 2) — visível/permitido só para o admin do sistema.
      {
        path: 'system/users',
        loadComponent: () => import('./system/system-users').then((m) => m.SystemUsers),
      },
      {
        path: 'system/integrations',
        loadComponent: () =>
          import('./system/system-integrations').then((m) => m.SystemIntegrations),
      },
      // Cartão de identidade (RF07).
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile-form').then((m) => m.ProfileForm),
      },
      // Portfólio curricular (RF08). 'new' antes de ':id' para não ser capturado pelo param.
      {
        path: 'portfolio',
        loadComponent: () => import('./portfolio/portfolio-list').then((m) => m.PortfolioList),
      },
      {
        path: 'portfolio/new',
        loadComponent: () => import('./portfolio/portfolio-form').then((m) => m.PortfolioForm),
      },
      {
        path: 'portfolio/:id',
        loadComponent: () => import('./portfolio/portfolio-form').then((m) => m.PortfolioForm),
      },
    ],
  },
];
