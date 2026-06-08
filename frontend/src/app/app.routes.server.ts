import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Painel admin: somente client-side rendering (sem SSR).
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  // Portal público: SSR sob demanda (slugs dinâmicos) para indexação e previews sociais.
  { path: '**', renderMode: RenderMode.Server },
];
