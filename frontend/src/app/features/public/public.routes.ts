import { Routes } from '@angular/router';
import { PublicLayout } from './public-layout/public-layout';

export const publicRoutes: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [
      // Landing da plataforma: apresentação + diretório de publicadores.
      {
        path: '',
        loadComponent: () => import('./platform-home/platform-home').then((m) => m.PlatformHome),
      },
      // Auto-registro de publicador (entra na fila de aprovação).
      {
        path: 'registro',
        loadComponent: () => import('./register/register').then((m) => m.Register),
      },
      // Recuperação de senha por e-mail (token de 30 minutos).
      {
        path: 'recuperar-senha',
        loadComponent: () => import('./password/forgot-password').then((m) => m.ForgotPassword),
      },
      {
        path: 'redefinir-senha',
        loadComponent: () => import('./password/reset-password').then((m) => m.ResetPassword),
      },
      // Páginas do publicador (Fase 2): currículo/identidade e portal de leitura por handle.
      {
        path: ':handle',
        loadComponent: () => import('./home/home').then((m) => m.Home),
      },
      {
        path: ':handle/posts',
        loadComponent: () => import('./posts/post-list/post-list').then((m) => m.PublicPostList),
      },
      {
        path: ':handle/posts/:slug',
        loadComponent: () =>
          import('./posts/post-detail/post-detail').then((m) => m.PublicPostDetail),
      },
      // 404 público (curinga, dentro do layout).
      { path: '**', loadComponent: () => import('./not-found/not-found').then((m) => m.NotFound) },
    ],
  },
];
