import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    // Painel administrativo — renderizado no cliente (CSR), atrás de autenticação.
    // Declarado ANTES do público: o portal tem um curinga 404 que, se viesse primeiro,
    // capturaria /admin.
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    // Portal público de leitura — renderizado no servidor (SSR/SEO). O curinga 404 vive aqui.
    path: '',
    loadChildren: () => import('./features/public/public.routes').then((m) => m.publicRoutes),
  },
];
