import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PostService } from '../../../core/content/post.service';
import { PostStats } from '../../../core/content/post.models';

/** Painel inicial do admin com contadores de postagens. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatButtonModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold tracking-tight mb-4">Painel</h1>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    @if (error()) {
      <p class="text-sm text-red-600 my-2" role="alert">{{ error() }}</p>
    }

    @if (stats(); as s) {
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded border border-gray-200 p-4">
          <p class="text-3xl font-semibold">{{ s.draft }}</p>
          <p class="text-sm text-gray-500">Rascunhos</p>
        </div>
        <div class="rounded border border-gray-200 p-4">
          <p class="text-3xl font-semibold text-green-700">{{ s.published }}</p>
          <p class="text-sm text-gray-500">Publicados</p>
        </div>
        <div class="rounded border border-gray-200 p-4">
          <p class="text-3xl font-semibold">{{ s.total }}</p>
          <p class="text-sm text-gray-500">Total</p>
        </div>
      </div>
    }

    <div class="mt-6 flex gap-2">
      <a matButton="filled" routerLink="/admin/posts/new">Nova postagem</a>
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
