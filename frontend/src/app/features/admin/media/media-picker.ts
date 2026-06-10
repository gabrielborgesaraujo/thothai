import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MediaService } from '../../../core/media/media.service';
import { MediaSummary } from '../../../core/media/media.models';

/**
 * Seletor de mídias da galeria (overlay): busca, filtro por tag e upload de um novo arquivo.
 * Usado para escolher o banner da postagem e inserir imagens no corpo pelo editor.
 */
@Component({
  selector: 'app-media-picker',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Escolher mídia"
      (click)="onBackdrop($event)"
    >
      <div
        class="flex max-h-[85vh] w-full max-w-2xl flex-col gap-3 overflow-hidden rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-900"
      >
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-semibold">Escolher mídia</h2>
          <div class="flex items-center gap-1">
            <button matButton type="button" (click)="fileInput.click()" [disabled]="uploading()">
              <mat-icon>upload</mat-icon>
              Enviar nova
            </button>
            <button matIconButton type="button" (click)="closed.emit()" aria-label="Fechar seletor">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>
        <input #fileInput type="file" accept="image/*" hidden (change)="onFileSelected($event)" />

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

        @if (allTags().length) {
          <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por tag">
            @for (tag of allTags(); track tag) {
              <button
                type="button"
                (click)="toggleTag(tag)"
                [attr.aria-pressed]="tag === activeTag()"
                class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                [class]="
                  tag === activeTag()
                    ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                    : 'border-gray-300 text-gray-600 hover:border-indigo-400 dark:border-gray-700 dark:text-gray-400'
                "
              >
                #{{ tag }}
              </button>
            }
          </div>
        }

        @if (loading() || uploading()) {
          <mat-progress-bar mode="indeterminate" />
        }
        @if (error()) {
          <p class="text-sm text-red-600 dark:text-red-400" role="alert">{{ error() }}</p>
        }

        <div class="min-h-0 flex-1 overflow-auto">
          @if (media(); as items) {
            @if (items.length === 0) {
              <p class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhuma mídia encontrada.
              </p>
            } @else {
              <ul class="grid grid-cols-3 gap-3 sm:grid-cols-4">
                @for (item of items; track item.id) {
                  <li>
                    <button
                      type="button"
                      (click)="selected.emit(item)"
                      class="group block w-full overflow-hidden rounded-lg border border-gray-200 transition-all hover:border-indigo-400 hover:shadow-sm dark:border-gray-800 dark:hover:border-indigo-600"
                      [attr.aria-label]="'Selecionar ' + (item.originalFilename ?? 'mídia')"
                    >
                      <img
                        [src]="item.url"
                        [alt]="item.altText ?? item.originalFilename ?? 'Mídia'"
                        loading="lazy"
                        class="aspect-square w-full object-cover"
                      />
                      <span
                        class="block truncate px-1.5 py-1 text-left text-xs text-gray-500 dark:text-gray-400"
                        [title]="item.originalFilename ?? ''"
                        >{{ item.originalFilename ?? item.id }}</span
                      >
                    </button>
                  </li>
                }
              </ul>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class MediaPicker {
  private readonly mediaService = inject(MediaService);

  readonly closed = output<void>();
  readonly selected = output<MediaSummary>();

  protected readonly media = signal<MediaSummary[] | null>(null);
  protected readonly allTags = signal<string[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly q = signal('');
  protected readonly activeTag = signal<string | null>(null);

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

  /** Upload direto pelo seletor: a nova mídia é selecionada imediatamente. */
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.error.set(null);
    this.mediaService.upload(file).subscribe({
      next: () => {
        // O upload não retorna o id; recarrega e seleciona pela URL recém-criada.
        this.mediaService.list().subscribe({
          next: (items) => {
            this.uploading.set(false);
            const created = items[0];
            if (created) {
              this.selected.emit(created);
            }
          },
          error: () => this.uploading.set(false),
        });
      },
      error: () => {
        this.error.set('Falha ao enviar a imagem.');
        this.uploading.set(false);
      },
    });
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
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
