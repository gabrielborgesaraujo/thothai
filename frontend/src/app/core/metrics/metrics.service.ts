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
}

/** Resumo de acessos para o dashboard do admin. */
export interface MetricsSummary {
  totalViews: number;
  viewsLast7Days: number;
  viewsLast30Days: number;
  daily: DailyViewsPoint[];
  topPosts: TopPostViews[];
}

/** Métricas de acesso: beacon público do portal + resumo do dashboard. */
@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly api = inject(ApiService);

  /** Registra um acesso (fire-and-forget — falhas são silenciosas, nunca afetam o leitor). */
  recordView(path: string): void {
    this.api.post<void>('/metrics/views', { path }).subscribe({ error: () => undefined });
  }

  summary(): Observable<MetricsSummary> {
    return this.api.get<MetricsSummary>('/admin/metrics/summary');
  }
}
