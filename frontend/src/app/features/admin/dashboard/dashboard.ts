import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PostService } from '../../../core/content/post.service';
import { PostStats } from '../../../core/content/post.models';
import { MetricsService, MetricsSummary } from '../../../core/metrics/metrics.service';

/** Painel inicial do admin: contadores de postagens e métricas de acesso/leitura do portal. */
@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, DecimalPipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-6 text-2xl font-semibold tracking-tight">Painel</h1>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    @if (error()) {
      <p class="my-2 text-sm text-red-600 dark:text-red-400" role="alert">{{ error() }}</p>
    }

    @if (stats(); as s) {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-500 dark:text-gray-400">Rascunhos</p>
            <mat-icon class="text-gray-300 dark:text-gray-600">edit_note</mat-icon>
          </div>
          <p class="mt-1 text-3xl font-semibold">{{ s.draft }}</p>
        </div>
        <div class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-500 dark:text-gray-400">Agendados</p>
            <mat-icon class="text-amber-400/70">schedule</mat-icon>
          </div>
          <p class="mt-1 text-3xl font-semibold text-amber-600 dark:text-amber-400">
            {{ s.scheduled }}
          </p>
        </div>
        <div class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-500 dark:text-gray-400">Publicados</p>
            <mat-icon class="text-green-500/70">public</mat-icon>
          </div>
          <p class="mt-1 text-3xl font-semibold text-green-700 dark:text-green-400">
            {{ s.published }}
          </p>
        </div>
        <div class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <mat-icon class="text-gray-300 dark:text-gray-600">library_books</mat-icon>
          </div>
          <p class="mt-1 text-3xl font-semibold">{{ s.total }}</p>
        </div>
      </div>
    }

    <!-- Métricas de acesso/leitura do portal -->
    @if (metrics(); as m) {
      <h2 class="mt-8 mb-4 text-lg font-semibold tracking-tight">Acessos do portal</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <p class="text-sm text-gray-500 dark:text-gray-400">Acessos (7 dias)</p>
          <p class="mt-1 text-3xl font-semibold text-indigo-600 dark:text-indigo-400">
            {{ m.viewsLast7Days | number }}
          </p>
        </div>
        <div class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <p class="text-sm text-gray-500 dark:text-gray-400">Acessos (30 dias)</p>
          <p class="mt-1 text-3xl font-semibold">{{ m.viewsLast30Days | number }}</p>
        </div>
        <div class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <p class="text-sm text-gray-500 dark:text-gray-400">Leituras completas (30 dias)</p>
          <p class="mt-1 text-3xl font-semibold text-green-700 dark:text-green-400">
            {{ m.readsLast30Days | number }}
          </p>
        </div>
        <div class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <p class="text-sm text-gray-500 dark:text-gray-400">Desde o início</p>
          <p class="mt-1 text-3xl font-semibold">{{ m.totalViews | number }}</p>
        </div>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-3">
        <!-- Série diária (14 dias) em barras -->
        <div class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <p class="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            Acessos por dia (14 dias)
          </p>
          <div class="flex h-32 items-end gap-1" role="img" aria-label="Gráfico de acessos por dia">
            @for (point of m.daily; track point.date) {
              <div
                class="group relative flex-1 rounded-t bg-indigo-500/80 transition-colors hover:bg-indigo-600 dark:bg-indigo-500/60 dark:hover:bg-indigo-400"
                [style.height.%]="barHeight(point.views)"
                [title]="(point.date | date: 'shortDate') + ': ' + point.views + ' acesso(s)'"
              ></div>
            }
          </div>
          <div class="mt-1 flex justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>{{ m.daily[0].date | date: 'dd/MM' }}</span>
            <span>{{ m.daily[m.daily.length - 1].date | date: 'dd/MM' }}</span>
          </div>
        </div>

        <!-- Top publicações (30 dias) -->
        <div class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <p class="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            Publicações mais lidas (30 dias)
          </p>
          @if (m.topPosts.length === 0) {
            <p class="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              Nenhuma leitura registrada ainda.
            </p>
          } @else {
            <ol class="flex flex-col gap-2">
              @for (post of m.topPosts; track post.slug; let i = $index) {
                <li class="flex items-center gap-3 text-sm">
                  <span
                    class="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                    >{{ i + 1 }}</span
                  >
                  <a
                    [href]="'/posts/' + post.slug"
                    target="_blank"
                    rel="noopener"
                    class="min-w-0 flex-1 truncate hover:text-indigo-600 dark:hover:text-indigo-400"
                    >{{ post.slug }}</a
                  >
                  <span class="shrink-0 text-gray-500 dark:text-gray-400"
                    >{{ post.views | number }} acesso(s) · {{ post.reads | number }} leitura(s)</span
                  >
                </li>
              }
            </ol>
          }
        </div>

        <!-- Origem do tráfego (30 dias) -->
        <div class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <p class="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            Origem do tráfego (30 dias)
          </p>
          @if (m.topReferrers.length === 0) {
            <p class="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              Nenhuma origem externa ainda.
            </p>
          } @else {
            <ol class="flex flex-col gap-2">
              @for (ref of m.topReferrers; track ref.host) {
                <li class="flex items-center gap-3 text-sm">
                  <mat-icon class="text-[16px]! text-gray-300 dark:text-gray-600">language</mat-icon>
                  <span class="min-w-0 flex-1 truncate">{{ ref.host }}</span>
                  <span class="shrink-0 text-gray-500 dark:text-gray-400">{{
                    ref.views | number
                  }}</span>
                </li>
              }
            </ol>
          }
        </div>
      </div>
    }

    <div class="mt-8 flex flex-wrap gap-2">
      <a matButton="filled" routerLink="/admin/posts/new">
        <mat-icon>add</mat-icon>
        Nova postagem
      </a>
      <a matButton routerLink="/admin/posts">Ver postagens</a>
      <a matButton routerLink="/admin/portfolio">Portfólio</a>
    </div>
  `,
})
export class Dashboard {
  private readonly postService = inject(PostService);
  private readonly metricsService = inject(MetricsService);

  protected readonly stats = signal<PostStats | null>(null);
  protected readonly metrics = signal<MetricsSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  private readonly maxDailyViews = computed(() =>
    Math.max(1, ...(this.metrics()?.daily.map((d) => d.views) ?? [1])),
  );

  constructor() {
    this.postService.stats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Falha ao carregar os contadores.');
        this.loading.set(false);
      },
    });
    this.metricsService.summary().subscribe({
      next: (m) => this.metrics.set(m),
      error: () => undefined,
    });
  }

  /** Altura da barra em % relativa ao pico da série (mínimo visível de 2%). */
  protected barHeight(views: number): number {
    return Math.max(2, Math.round((views / this.maxDailyViews()) * 100));
  }
}
