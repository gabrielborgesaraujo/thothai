import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MediaService } from '../../../core/media/media.service';
import { MediaSummary } from '../../../core/media/media.models';
import { persistedViewMode } from '../../../shared/view-mode';
import { ViewToggle } from '../../../shared/view-toggle';
import { MediaDetail } from './media-detail';
import { MediaEditor } from './media-editor';

/**
 * Galeria de mídias (RF03): busca, filtro por tag, visualização em mosaico/lista, detalhes com
 * metadados editáveis e editor de imagem (rotação/corte/redimensionamento no servidor).
 */
@Component({
  selector: 'app-media-list',
  imports: [
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    ViewToggle,
    MediaDetail,
    MediaEditor,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold tracking-tight">Mídias</h1>
      <app-view-toggle [mode]="view.mode()" (modeChange)="view.set($event)" />
    </div>

    <div class="mb-3">
      <div class="relative">
        <span
          class="material-icons pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-gray-400"
          aria-hidden="true"
          >search</span
        >
        <input
          type="search"
          [value]="q()"
          (input)="onSearch($event)"
          placeholder="Buscar por nome, alt ou descrição…"
          aria-label="Buscar mídias"
          class="w-full rounded-lg border border-gray-300 bg-white py-2 pr-3 pl-9 text-sm transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500"
        />
      </div>
    </div>

    @if (allTags().length) {
      <div class="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por tag">
        @for (tag of allTags(); track tag) {
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

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    @if (error()) {
      <p class="text-sm text-red-600 dark:text-red-400 my-2" role="alert">{{ error() }}</p>
    }

    @if (media(); as items) {
      @if (items.length === 0) {
        <div
          class="rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-700"
        >
          <mat-icon class="text-4xl! text-gray-300 dark:text-gray-600">image</mat-icon>
          <p class="mt-3 text-gray-500 dark:text-gray-400">
            {{ q().trim() || activeTag() ? 'Nada encontrado com esses filtros.' : 'Nenhuma mídia enviada ainda.' }}
          </p>
        </div>
      } @else if (view.mode() === 'mosaic') {
        <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          @for (item of items; track item.id) {
            <li class="rounded-lg border border-gray-200 p-2 dark:border-gray-800">
              <button
                type="button"
                class="block w-full cursor-pointer"
                (click)="selected.set(item)"
                [attr.aria-label]="'Detalhes de ' + (item.originalFilename ?? 'mídia')"
              >
                <img
                  [src]="item.url"
                  [alt]="item.altText ?? item.originalFilename ?? 'Mídia'"
                  width="200"
                  height="128"
                  loading="lazy"
                  class="h-32 w-full rounded object-cover bg-gray-50 dark:bg-gray-900"
                />
              </button>
              <p
                class="mt-2 truncate text-xs text-gray-600 dark:text-gray-400"
                [title]="item.originalFilename ?? ''"
              >
                {{ item.originalFilename ?? item.id }}
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500">
                @if (item.width && item.height) {
                  {{ item.width }}×{{ item.height }} ·
                }
                {{ item.sizeBytes | number }} bytes
              </p>
              @if (item.tags.length) {
                <p class="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
                  @for (tag of item.tags; track tag) {
                    #{{ tag }}
                  }
                </p>
              }
              <div class="mt-1 flex items-center gap-1">
                @if (pendingDelete() === item.id) {
                  <span class="text-xs text-gray-600 dark:text-gray-300">Excluir?</span>
                  <button matButton (click)="confirmDelete(item.id)">Sim</button>
                  <button matButton (click)="pendingDelete.set(null)">Não</button>
                } @else {
                  <button matButton (click)="selected.set(item)">Detalhes</button>
                  <button
                    matIconButton
                    (click)="pendingDelete.set(item.id)"
                    aria-label="Excluir mídia"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                }
              </div>
            </li>
          }
        </ul>
      } @else {
        <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table class="w-full text-sm">
            <thead>
              <tr
                class="border-b border-gray-200 text-left text-xs text-gray-500 uppercase dark:border-gray-800 dark:text-gray-400"
              >
                <th class="px-4 py-3 font-medium">Mídia</th>
                <th class="hidden px-4 py-3 font-medium sm:table-cell">Dimensões</th>
                <th class="hidden px-4 py-3 font-medium sm:table-cell">Tamanho</th>
                <th class="hidden px-4 py-3 font-medium md:table-cell">Enviada em</th>
                <th class="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items; track item.id) {
                <tr
                  class="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-gray-900"
                >
                  <td class="px-4 py-2">
                    <button
                      type="button"
                      class="flex w-full cursor-pointer items-center gap-3 text-left"
                      (click)="selected.set(item)"
                    >
                      <img
                        [src]="item.url"
                        [alt]="item.altText ?? item.originalFilename ?? 'Mídia'"
                        width="48"
                        height="48"
                        loading="lazy"
                        class="size-12 shrink-0 rounded object-cover bg-gray-50 dark:bg-gray-900"
                      />
                      <span class="min-w-0">
                        <span
                          class="block max-w-xs truncate font-medium"
                          [title]="item.originalFilename ?? ''"
                          >{{ item.originalFilename ?? item.id }}</span
                        >
                        @if (item.tags.length) {
                          <span class="block truncate text-xs text-gray-400 dark:text-gray-500">
                            @for (tag of item.tags; track tag) {
                              #{{ tag }}
                            }
                          </span>
                        }
                      </span>
                    </button>
                  </td>
                  <td class="hidden px-4 py-2 text-gray-500 sm:table-cell dark:text-gray-400">
                    {{ item.width && item.height ? item.width + '×' + item.height : '—' }}
                  </td>
                  <td class="hidden px-4 py-2 text-gray-500 sm:table-cell dark:text-gray-400">
                    {{ item.sizeBytes | number }} bytes
                  </td>
                  <td class="hidden px-4 py-2 text-gray-500 md:table-cell dark:text-gray-400">
                    {{ item.createdAt ? (item.createdAt | date: 'short') : '—' }}
                  </td>
                  <td class="px-4 py-2 text-right whitespace-nowrap">
                    @if (pendingDelete() === item.id) {
                      <span class="mr-1 text-sm text-gray-600 dark:text-gray-300">Excluir?</span>
                      <button matButton (click)="confirmDelete(item.id)">Sim</button>
                      <button matButton (click)="pendingDelete.set(null)">Não</button>
                    } @else {
                      <button matIconButton (click)="selected.set(item)" aria-label="Detalhes da mídia">
                        <mat-icon>info</mat-icon>
                      </button>
                      <button
                        matIconButton
                        (click)="pendingDelete.set(item.id)"
                        aria-label="Excluir mídia"
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
      }
    }

    @if (selected(); as media) {
      <app-media-detail
        [media]="media"
        (closed)="selected.set(null)"
        (saved)="onMetadataSaved($event)"
        (edit)="openEditor(media)"
      />
    }
    @if (editing(); as media) {
      <app-media-editor [media]="media" (closed)="editing.set(null)" (saved)="onEdited()" />
    }
  `,
})
export class MediaList {
  private readonly mediaService = inject(MediaService);

  protected readonly media = signal<MediaSummary[] | null>(null);
  protected readonly allTags = signal<string[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pendingDelete = signal<string | null>(null);
  protected readonly selected = signal<MediaSummary | null>(null);
  protected readonly editing = signal<MediaSummary | null>(null);
  protected readonly q = signal('');
  protected readonly activeTag = signal<string | null>(null);
  /** Mosaico por padrão; a escolha persiste no navegador. */
  protected readonly view = persistedViewMode('thothai-media-view', 'mosaic');

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.reload();
  }

  protected onSearch(event: Event): void {
    this.q.set((event.target as HTMLInputElement).value);
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
    this.searchDebounce = setTimeout(() => this.reload(), 300);
  }

  protected toggleTag(tag: string): void {
    this.activeTag.update((current) => (current === tag ? null : tag));
    this.reload();
  }

  protected openEditor(media: MediaSummary): void {
    this.selected.set(null);
    this.editing.set(media);
  }

  protected onMetadataSaved(updated: MediaSummary): void {
    this.selected.set(updated);
    this.reload();
  }

  protected onEdited(): void {
    this.editing.set(null);
    this.reload();
  }

  protected confirmDelete(id: string): void {
    this.mediaService.remove(id).subscribe({
      next: () => {
        this.pendingDelete.set(null);
        this.reload();
      },
      error: () => {
        this.error.set('Falha ao excluir a mídia.');
        this.pendingDelete.set(null);
      },
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.mediaService.list(this.q(), this.activeTag() ?? undefined).subscribe({
      next: (items) => {
        this.media.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Falha ao carregar as mídias.');
        this.loading.set(false);
      },
    });
    this.mediaService.tags().subscribe({
      next: (tags) => this.allTags.set(tags),
      error: () => this.allTags.set([]),
    });
  }
}
