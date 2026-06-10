import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { PostService } from '../../../../core/content/post.service';
import { Page, PostSummary } from '../../../../core/content/post.models';
import { PostTypeBadge } from '../../../../shared/post-type-badge';
import { persistedViewMode } from '../../../../shared/view-mode';
import { ViewToggle } from '../../../../shared/view-toggle';

/**
 * Listagem pública das postagens publicadas (RF06), com busca por termo e filtro por tag.
 * O estado (q, tag, page) vive na URL — links compartilháveis e renderização SSR consistente.
 */
@Component({
  selector: 'app-public-post-list',
  imports: [DatePipe, RouterLink, PostTypeBadge, ViewToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-8 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Publicações</h1>
        <p class="mt-1 text-gray-600 dark:text-gray-400">Artigos, tutoriais e notas técnicas.</p>
      </div>
      <app-view-toggle [mode]="view.mode()" (modeChange)="view.set($event)" />
    </header>

    <form (submit)="search($event, searchInput.value)" class="mb-4" role="search">
      <div class="relative">
        <span
          class="material-icons pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] text-gray-400"
          aria-hidden="true"
          >search</span
        >
        <input
          #searchInput
          type="search"
          name="q"
          [value]="query()"
          placeholder="Buscar publicações…"
          aria-label="Buscar publicações"
          class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pr-4 pl-10 text-sm transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500"
        />
      </div>
    </form>

    @if (tags().length) {
      <div class="mb-8 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por tag">
        @for (tag of tags(); track tag) {
          <button
            type="button"
            (click)="toggleTag(tag)"
            [attr.aria-pressed]="tag === activeTag()"
            class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
            [class]="
              tag === activeTag()
                ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                : 'border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400'
            "
          >
            #{{ tag }}
          </button>
        }
      </div>
    }

    @if (error()) {
      <p class="text-red-600 dark:text-red-400" role="alert">{{ error() }}</p>
    }

    @if (result(); as data) {
      @if (data.totalElements === 0) {
        <div class="rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-700">
          <span class="material-icons text-4xl text-gray-300 dark:text-gray-600" aria-hidden="true"
            >travel_explore</span
          >
          <p class="mt-3 text-gray-500 dark:text-gray-400">
            {{ query() || activeTag() ? 'Nada encontrado com esses filtros.' : 'Nenhuma publicação ainda.' }}
          </p>
          @if (query() || activeTag()) {
            <button
              type="button"
              (click)="clearFilters()"
              class="mt-3 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Limpar filtros
            </button>
          }
        </div>
      } @else {
        <ul
          [class]="
            view.mode() === 'mosaic' ? 'grid gap-4 sm:grid-cols-2' : 'flex flex-col gap-4'
          "
        >
          @for (post of data.items; track post.id) {
            <li>
              <a
                [routerLink]="['/posts', post.slug]"
                class="group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 transition-all hover:border-indigo-300 hover:shadow-sm dark:border-gray-800 dark:hover:border-indigo-700"
              >
                @if (view.mode() === 'mosaic') {
                  @if (post.bannerUrl) {
                    <img
                      [src]="post.bannerUrl"
                      [alt]="'Banner: ' + post.title"
                      loading="lazy"
                      class="aspect-[2/1] w-full object-cover"
                    />
                  } @else {
                    <div
                      class="flex aspect-[2/1] w-full items-center justify-center bg-gradient-to-br from-indigo-50 to-gray-100 dark:from-indigo-950 dark:to-gray-900"
                      aria-hidden="true"
                    >
                      <span class="material-icons text-4xl text-indigo-200 dark:text-indigo-800"
                        >article</span
                      >
                    </div>
                  }
                }
                <div class="flex flex-1 flex-col p-5">
                  <div class="flex flex-wrap items-center gap-2 text-xs">
                    <app-post-type-badge [type]="post.type" />
                    @if (post.publishedAt) {
                      <time class="text-gray-400 dark:text-gray-500">{{
                        post.publishedAt | date: 'longDate'
                      }}</time>
                    }
                  </div>
                  <h2
                    class="mt-2 text-lg font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                  >
                    {{ post.title }}
                  </h2>
                  @if (post.summary) {
                    <p class="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                      {{ post.summary }}
                    </p>
                  }
                  @if (post.tags.length) {
                    <div class="mt-auto flex flex-wrap gap-1.5 pt-3">
                      @for (tag of post.tags; track tag) {
                        <span class="text-xs text-gray-400 dark:text-gray-500">#{{ tag }}</span>
                      }
                    </div>
                  }
                </div>
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
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              ← Anterior
            </button>
            <span class="text-sm text-gray-500 dark:text-gray-400"
              >Página {{ data.page + 1 }} de {{ data.totalPages }}</span
            >
            <button
              type="button"
              (click)="go(data.page + 1)"
              [disabled]="data.page + 1 >= data.totalPages"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Próxima →
            </button>
          </nav>
        }
      }
    }
  `,
})
export class PublicPostList {
  private readonly postService = inject(PostService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly result = signal<Page<PostSummary> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly tags = signal<string[]>([]);
  protected readonly query = signal('');
  protected readonly activeTag = signal<string | null>(null);
  /** Mosaico por padrão; a escolha persiste no navegador. */
  protected readonly view = persistedViewMode('thothai-posts-view', 'mosaic');

  constructor() {
    inject(Title).setTitle('Publicações — ThothAI');
    inject(Meta).updateTag({
      name: 'description',
      content: 'Artigos, tutoriais e notas técnicas publicados no ThothAI.',
    });

    this.postService.publishedTags().subscribe({
      next: (tags) => this.tags.set(tags),
      error: () => this.tags.set([]),
    });

    // A URL é a fonte da verdade dos filtros; cada mudança dispara um novo carregamento.
    this.route.queryParamMap.subscribe((params) => {
      const q = params.get('q') ?? '';
      const tag = params.get('tag');
      const page = Math.max(0, Number(params.get('page') ?? 0) || 0);
      this.query.set(q);
      this.activeTag.set(tag);
      this.load(page, q, tag);
    });
  }

  protected search(event: Event, value: string): void {
    event.preventDefault();
    this.navigate({ q: value.trim() || null, page: null });
  }

  protected toggleTag(tag: string): void {
    this.navigate({ tag: this.activeTag() === tag ? null : tag, page: null });
  }

  protected clearFilters(): void {
    this.navigate({ q: null, tag: null, page: null });
  }

  protected go(page: number): void {
    this.navigate({ page: page > 0 ? page : null });
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  private load(page: number, q: string, tag: string | null): void {
    // A requisição é registrada como pending task: o SSR aguarda a resposta antes de renderizar.
    this.postService.listPublished(page, 10, q, tag ?? undefined).subscribe({
      next: (data) => this.result.set(data),
      error: () => this.error.set('Não foi possível carregar as publicações.'),
    });
  }
}
