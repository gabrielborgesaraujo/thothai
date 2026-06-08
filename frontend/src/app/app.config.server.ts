import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_BASE_URL } from './core/api-base-url.token';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // No SSR as requisições partem do servidor e precisam de URL absoluta para o backend.
    { provide: API_BASE_URL, useValue: process.env['BACKEND_ORIGIN'] ?? 'http://localhost:8080' },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
