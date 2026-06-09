import { Routes } from '@angular/router';
import { PublicLayout } from './public-layout/public-layout';

export const publicRoutes: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [
      { path: '', loadComponent: () => import('./home/home').then((m) => m.Home) },
      // Portal público de leitura (RF06): listagem cronológica e página de leitura por slug.
      {
        path: 'posts',
        loadComponent: () => import('./posts/post-list/post-list').then((m) => m.PublicPostList),
      },
      {
        path: 'posts/:slug',
        loadComponent: () =>
          import('./posts/post-detail/post-detail').then((m) => m.PublicPostDetail),
      },
      // 404 público (curinga, dentro do layout).
      { path: '**', loadComponent: () => import('./not-found/not-found').then((m) => m.NotFound) },
    ],
  },
];
