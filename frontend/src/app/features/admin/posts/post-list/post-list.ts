import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PostService } from '../../../../core/content/post.service';
import { Page, PostStatus, PostSummary, PostType } from '../../../../core/content/post.models';
import { PostTypeBadge } from '../../../../shared/post-type-badge';
import { LinkedInShareDialog } from '../linkedin-share-dialog';

const STATUS_BADGES: Record<PostStatus, { label: string; classes: string }> = {
  DRAFT: {
    label: 'Rascunho',
    classes: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  SCHEDULED: {
    label: 'Agendado',
    classes: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  PUBLISHED: {
    label: 'Publicado',
    classes: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  },
};

/** Listagem e gestão das postagens do admin (RF02), com busca e filtros por status/tipo. */
@Component({
  selector: 'app-post-list',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatPaginatorModule,
    PostTypeBadge,
    LinkedInShareDialog,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-semibold tracking-tight">Postagens</h1>
      <a matButton="filled" routerLink="/admin/posts/new">
        <mat-icon>add</mat-icon>
        Nova postagem
      </a>
    </div>

    <div class="mb-4 flex flex-col gap-2 sm:flex-row">
      <div class="relative flex-1">
        <span
          class="material-icons pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-gray-400"
          aria-hidden="true"
          >search</span
        >
        <input
          type="search"
          [value]="q()"
          (input)="onSearch($event)"
          placeholder="Buscar por título ou resumo…"
          aria-label="Buscar postagens"
          class="w-full rounded-lg border border-gray-300 bg-white py-2 pr-3 pl-9 text-sm transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500"
        />
      </div>
      <select
        [value]="status() ?? ''"
        (change)="onStatus($event)"
        aria-label="Filtrar por status"
        class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
      >
        <option value="">Todos os status</option>
        <option value="DRAFT">Rascunho</option>
        <option value="SCHEDULED">Agendado</option>
        <option value="PUBLISHED">Publicado</option>
      </select>
      <select
        [value]="type() ?? ''"
        (change)="onType($event)"
        aria-label="Filtrar por tipo"
        class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
      >
        <option value="">Todos os tipos</option>
        <option value="ARTICLE">Artigo</option>
        <option value="TUTORIAL">Tutorial</option>
        <option value="NOTE">Nota</option>
      </select>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    @if (error()) {
      <p class="my-2 text-sm text-red-600 dark:text-red-400" role="alert">{{ error() }}</p>
    }

    @if (result(); as data) {
      @if (data.totalElements === 0) {
        <div
          class="rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-700"
        >
          <mat-icon class="text-4xl! text-gray-300 dark:text-gray-600">post_add</mat-icon>
          <p class="mt-3 text-gray-500 dark:text-gray-400">
            {{ hasFilters() ? 'Nada encontrado com esses filtros.' : 'Nenhuma postagem ainda.' }}
          </p>
          @if (!hasFilters()) {
            <a
              routerLink="/admin/posts/new"
              class="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >Criar a primeira postagem</a
            >
          }
        </div>
      } @else {
        <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table class="w-full text-sm">
            <thead>
              <tr
                class="border-b border-gray-200 text-left text-xs text-gray-500 uppercase dark:border-gray-800 dark:text-gray-400"
              >
                <th class="px-4 py-3 font-medium">Título</th>
                <th class="hidden px-4 py-3 font-medium sm:table-cell">Tipo</th>
                <th class="px-4 py-3 font-medium">Status</th>
                <th class="hidden px-4 py-3 font-medium md:table-cell">Publicação</th>
                <th class="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (p of data.items; track p.id) {
                <tr
                  class="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-gray-900"
                >
                  <td class="px-4 py-3">
                    <a
                      [routerLink]="['/admin/posts', p.id]"
                      class="font-medium hover:text-indigo-600 dark:hover:text-indigo-400"
                      >{{ p.title }}</a
                    >
                    @if (p.linkedinSharedAt) {
                      <mat-icon
                        class="ml-1 align-middle text-[16px]! text-sky-600 dark:text-sky-400"
                        [title]="'Publicado no LinkedIn em ' + (p.linkedinSharedAt | date: 'short')"
                        aria-label="Publicado no LinkedIn"
                        >campaign</mat-icon
                      >
                    }
                    @if (p.tags.length) {
                      <div class="mt-0.5 flex flex-wrap gap-1.5">
                        @for (tag of p.tags; track tag) {
                          <span class="text-xs text-gray-400 dark:text-gray-500">#{{ tag }}</span>
                        }
                      </div>
                    }
                  </td>
                  <td class="hidden px-4 py-3 sm:table-cell">
                    <app-post-type-badge [type]="p.type" />
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      [class]="statusBadge(p.status).classes"
                      >{{ statusBadge(p.status).label }}</span
                    >
                  </td>
                  <td class="hidden px-4 py-3 text-gray-500 md:table-cell dark:text-gray-400">
                    @if (p.status === 'SCHEDULED' && p.scheduledAt) {
                      <span class="inline-flex items-center gap-1">
                        <mat-icon class="text-[14px]! text-amber-500">schedule</mat-icon>
                        {{ p.scheduledAt | date: 'short' }}
                      </span>
                    } @else {
                      {{ p.publishedAt ? (p.publishedAt | date: 'short') : '—' }}
                    }
                  </td>
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    @if (pendingDelete() === p.id) {
                      <span class="mr-1 text-sm text-gray-600 dark:text-gray-300">Excluir?</span>
                      <button matButton (click)="confirmDelete(p.id)">Sim</button>
                      <button matButton (click)="pendingDelete.set(null)">Não</button>
                    } @else {
                      @if (p.status === 'PUBLISHED') {
                        <button
                          matIconButton
                          (click)="sharing.set(p)"
                          aria-label="Publicar no LinkedIn"
                          title="Publicar no LinkedIn"
                        >
                          <mat-icon>share</mat-icon>
                        </button>
                      }
                      <a
                        matIconButton
                        [routerLink]="['/admin/posts', p.id]"
                        aria-label="Editar postagem"
                      >
                        <mat-icon>edit</mat-icon>
                      </a>
                      <button
                        matIconButton
                        (click)="pendingDelete.set(p.id)"
                        aria-label="Excluir postagem"
                      >
                        <mat-icon>delete</mat-icon>
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <mat-paginator
          [length]="data.totalElements"
          [pageSize]="data.size"
          [pageIndex]="data.page"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPage($event)"
        />
      }
    }

    @if (sharing(); as post) {
      <app-linkedin-share-dialog [post]="post" (closed)="onShareDialogClosed()" />
    }
  `,
})
export class PostList {
  private readonly postService = inject(PostService);

  protected readonly result = signal<Page<PostSummary> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pendingDelete = signal<string | null>(null);
  /** Postagem em compartilhamento no LinkedIn (abre o diálogo). */
  protected readonly sharing = signal<PostSummary | null>(null);

  protected readonly q = signal('');
  protected readonly status = signal<PostStatus | null>(null);
  protected readonly type = signal<PostType | null>(null);

  private pageIndex = 0;
  private pageSize = 20;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.reload();
  }

  protected statusBadge(status: PostStatus): { label: string; classes: string } {
    return STATUS_BADGES[status];
  }

  protected hasFilters(): boolean {
    return Boolean(this.q().trim() || this.status() || this.type());
  }

  protected onSearch(event: Event): void {
    this.q.set((event.target as HTMLInputElement).value);
    // Debounce curto para não disparar uma requisição por tecla.
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
    this.searchDebounce = setTimeout(() => this.resetAndReload(), 300);
  }

  protected onStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.status.set((value || null) as PostStatus | null);
    this.resetAndReload();
  }

  protected onType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.type.set((value || null) as PostType | null);
    this.resetAndReload();
  }

  /** Recarrega ao fechar o diálogo (o badge do LinkedIn pode ter mudado). */
  protected onShareDialogClosed(): void {
    this.sharing.set(null);
    this.reload();
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.reload();
  }

  protected confirmDelete(id: string): void {
    this.postService.remove(id).subscribe({
      next: () => {
        this.pendingDelete.set(null);
        // Se a página atual ficou vazia, recua uma página.
        if (this.result()?.items.length === 1 && this.pageIndex > 0) {
          this.pageIndex--;
        }
        this.reload();
      },
      error: () => {
        this.error.set('Falha ao excluir a postagem.');
        this.pendingDelete.set(null);
      },
    });
  }

  private resetAndReload(): void {
    this.pageIndex = 0;
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.postService
      .listAdmin(this.pageIndex, this.pageSize, {
        q: this.q(),
        status: this.status() ?? undefined,
        type: this.type() ?? undefined,
      })
      .subscribe({
        next: (data) => {
          this.result.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Falha ao carregar as postagens.');
          this.loading.set(false);
        },
      });
  }
}
