import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PostService } from '../../../core/content/post.service';
import { PostStats } from '../../../core/content/post.models';

/** Painel inicial do admin com contadores de postagens. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
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

  protected readonly stats = signal<PostStats | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

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
  }
}
