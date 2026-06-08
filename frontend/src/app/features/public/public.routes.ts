import { Routes } from '@angular/router';
import { PublicLayout } from './public-layout/public-layout';

export const publicRoutes: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [
      { path: '', loadComponent: () => import('./home/home').then((m) => m.Home) },
      // Listagem e leitura de publicações são adicionadas na EPIC 3.
    ],
  },
];
