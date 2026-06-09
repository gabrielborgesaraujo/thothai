import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { PostService } from '../../../../core/content/post.service';
import { Page, PostSummary } from '../../../../core/content/post.models';

/** Listagem pública das postagens publicadas, em ordem cronológica reversa e paginada (RF06). */
@Component({
  selector: 'app-public-post-list',
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold tracking-tight mb-6">Publicações</h1>

    @if (error()) {
      <p class="text-red-600" role="alert">{{ error() }}</p>
    }

    @if (result(); as data) {
      @if (data.totalElements === 0) {
        <p class="text-gray-500">Nenhuma publicação ainda.</p>
      } @else {
        <ul class="flex flex-col gap-6">
          @for (post of data.items; track post.id) {
            <li>
              <a [routerLink]="['/posts', post.slug]" class="group block">
                <h2 class="text-lg font-medium group-hover:underline">{{ post.title }}</h2>
                @if (post.publishedAt) {
                  <time class="text-xs text-gray-400">{{
                    post.publishedAt | date: 'longDate'
                  }}</time>
                }
                @if (post.summary) {
                  <p class="mt-1 text-gray-600">{{ post.summary }}</p>
                }
              </a>
            </li>
          }
        </ul>

        @if (data.totalPages > 1) {
          <nav class="mt-8 flex items-center justify-between" aria-label="Paginação">
            <button
              type="button"
              (click)="go(data.page - 1)"
              [disabled]="data.page === 0"
              class="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Anterior
            </button>
            <span class="text-sm text-gray-500"
              >Página {{ data.page + 1 }} de {{ data.totalPages }}</span
            >
            <button
              type="button"
              (click)="go(data.page + 1)"
              [disabled]="data.page + 1 >= data.totalPages"
              class="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Próxima
            </button>
          </nav>
        }
      }
    }
  `,
})
export class PublicPostList {
  private readonly postService = inject(PostService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly result = signal<Page<PostSummary> | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.title.setTitle('Publicações — ThothAI');
    this.meta.updateTag({
      name: 'description',
      content: 'Artigos, tutoriais e notas técnicas publicados no ThothAI.',
    });
    this.load(0);
  }

  protected go(page: number): void {
    this.load(page);
  }

  private load(page: number): void {
    // A requisição é registrada como pending task: o SSR aguarda a resposta antes de renderizar.
    this.postService.listPublished(page).subscribe({
      next: (data) => this.result.set(data),
      error: () => this.error.set('Não foi possível carregar as publicações.'),
    });
  }
}
