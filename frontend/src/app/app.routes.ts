import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    // Portal público de leitura — renderizado no servidor (SSR/SEO).
    path: '',
    loadChildren: () => import('./features/public/public.routes').then((m) => m.publicRoutes),
  },
  {
    // Painel administrativo — renderizado no cliente (CSR), atrás de autenticação.
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
];
