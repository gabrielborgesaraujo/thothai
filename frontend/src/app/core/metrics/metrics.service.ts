import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

export interface DailyViewsPoint {
  date: string;
  views: number;
}

export interface TopPostViews {
  slug: string;
  views: number;
  reads: number;
}

export interface ReferrerViews {
  host: string;
  views: number;
}

/** Resumo de acessos/leituras para o dashboard do admin. */
export interface MetricsSummary {
  totalViews: number;
  viewsLast7Days: number;
  viewsLast30Days: number;
  readsLast30Days: number;
  daily: DailyViewsPoint[];
  topPosts: TopPostViews[];
  topReferrers: ReferrerViews[];
}

/**
 * Métricas de acesso/leitura: beacons públicos do portal (com dedupe por sessão) + resumo do
 * dashboard. Os beacons são fire-and-forget — falhas nunca afetam o leitor.
 */
@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly api = inject(ApiService);
  /** O referrer externo só vale para a primeira página da visita (depois é navegação interna). */
  private referrerPending = true;

  /** Registra um acesso, no máximo uma vez por caminho por sessão do navegador. */
  recordView(path: string): void {
    if (this.alreadySent('view', path)) {
      return;
    }
    const referrer = this.referrerPending ? this.externalReferrer() : null;
    this.referrerPending = false;
    this.send({ path, referrer });
  }

  /** Registra a leitura concluída de um artigo (rolagem até o fim), uma vez por sessão. */
  recordRead(path: string): void {
    if (this.alreadySent('read', path)) {
      return;
    }
    this.send({ path, metric: 'read' });
  }

  summary(): Observable<MetricsSummary> {
    return this.api.get<MetricsSummary>('/admin/metrics/summary');
  }

  private send(body: { path: string; metric?: string; referrer?: string | null }): void {
    this.api.post<void>('/metrics/views', body).subscribe({ error: () => undefined });
  }

  /** Dedupe por sessão: F5 e idas-e-vindas não viram acessos novos. */
  private alreadySent(metric: string, path: string): boolean {
    try {
      const key = `thothai-metric:${metric}:${path}`;
      if (sessionStorage.getItem(key)) {
        return true;
      }
      sessionStorage.setItem(key, '1');
      return false;
    } catch {
      return false;
    }
  }

  private externalReferrer(): string | null {
    try {
      const referrer = document.referrer;
      if (!referrer || new URL(referrer).host === location.host) {
        return null;
      }
      return referrer;
    } catch {
      return null;
    }
  }
}
