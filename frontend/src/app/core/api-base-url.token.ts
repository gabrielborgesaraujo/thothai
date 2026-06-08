import { InjectionToken } from '@angular/core';

/**
 * URL base da API. No browser fica vazia (requisições relativas a `/api`, resolvidas pelo proxy
 * de dev ou pelo mesmo host em produção). No SSR é preenchida com a URL absoluta do backend,
 * pois o servidor não resolve caminhos relativos.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '',
});
