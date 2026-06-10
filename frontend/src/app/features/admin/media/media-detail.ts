import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MediaService } from '../../../core/media/media.service';
import { MediaSummary } from '../../../core/media/media.models';

const MAX_TAGS = 10;

/** Painel de detalhes de uma mídia: metadados editáveis (alt, descrição, tags) e atalhos. */
@Component({
  selector: 'app-media-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes da mídia"
      (click)="onBackdrop($event)"
    >
      <div
        class="flex max-h-full w-full max-w-xl flex-col gap-3 overflow-auto rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-900"
      >
        <div class="flex items-center justify-between">
          <h2 class="truncate font-semibold" [title]="media().originalFilename ?? ''">
            {{ media().originalFilename ?? 'Mídia' }}
          </h2>
          <button matIconButton type="button" (click)="closed.emit()" aria-label="Fechar detalhes">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <img
          [src]="media().url"
          [alt]="media().altText ?? media().originalFilename ?? 'Mídia'"
          class="max-h-64 w-full rounded-xl border border-gray-200 bg-gray-50 object-contain dark:border-gray-800 dark:bg-gray-950"
        />

        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ media().contentType }} · {{ media().sizeBytes | number }} bytes
          @if (media().width && media().height) {
            · {{ media().width }} × {{ media().height }} px
          }
          @if (media().createdAt) {
            · enviada em {{ media().createdAt | date: 'short' }}
          }
        </p>
        <a
          [href]="media().url"
          target="_blank"
          rel="noopener"
          class="truncate text-xs text-indigo-600 hover:underline dark:text-indigo-400"
          >{{ media().url }}</a
        >

        <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-2 pt-1">
          <mat-form-field appearance="outline">
            <mat-label>Texto alternativo (acessibilidade)</mat-label>
            <input matInput formControlName="altText" maxlength="255" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Descrição</mat-label>
            <textarea matInput formControlName="description" rows="2" maxlength="500"></textarea>
          </mat-form-field>

          <div>
            <label
              for="media-tag-input"
              class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
              >Tags ({{ tags().length }}/{{ maxTags }})</label
            >
            <div
              class="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-2 focus-within:border-indigo-500 dark:border-gray-700 dark:bg-gray-900"
            >
              @for (tag of tags(); track tag) {
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  #{{ tag }}
                  <button
                    type="button"
                    (click)="removeTag(tag)"
                    class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    [attr.aria-label]="'Remover tag ' + tag"
                  >
                    <span class="material-icons align-middle text-[14px]" aria-hidden="true"
                      >close</span
                    >
                  </button>
                </span>
              }
              <input
                id="media-tag-input"
                #tagInput
                type="text"
                (keydown)="onTagKeydown($event)"
                (blur)="addTag(tagInput.value); tagInput.value = ''"
                [placeholder]="tags().length ? '' : 'Adicionar tag…'"
                class="min-w-28 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          @if (saving()) {
            <mat-progress-bar mode="indeterminate" />
          }
          @if (error()) {
            <p class="text-sm text-red-600 dark:text-red-400" role="alert">{{ error() }}</p>
          }

          <div class="flex items-center justify-between gap-2 pt-1">
            <button matButton type="button" (click)="edit.emit()">
              <mat-icon>tune</mat-icon>
              Editar imagem
            </button>
            <div class="flex gap-2">
              <button matButton type="button" (click)="closed.emit()">Fechar</button>
              <button matButton="filled" type="submit" [disabled]="saving()">Salvar</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class MediaDetail {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly mediaService = inject(MediaService);

  readonly media = input.required<MediaSummary>();
  readonly closed = output<void>();
  readonly saved = output<MediaSummary>();
  /** Pede a abertura do editor visual desta mídia. */
  readonly edit = output<void>();

  protected readonly maxTags = MAX_TAGS;
  protected readonly tags = signal<string[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    altText: [''],
    description: [''],
  });

  constructor() {
    // O painel é recriado por @if a cada mídia selecionada; inicializa do input uma única vez.
    queueMicrotask(() => {
      const media = this.media();
      this.form.patchValue({
        altText: media.altText ?? '',
        description: media.description ?? '',
      });
      this.tags.set(media.tags);
    });
  }

  protected onTagKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag(input.value);
      input.value = '';
    } else if (event.key === 'Backspace' && !input.value && this.tags().length) {
      this.tags.update((tags) => tags.slice(0, -1));
    }
  }

  protected addTag(value: string): void {
    const tag = value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/,/g, '');
    if (!tag || this.tags().includes(tag) || this.tags().length >= MAX_TAGS) {
      return;
    }
    this.tags.update((tags) => [...tags, tag]);
  }

  protected removeTag(tag: string): void {
    this.tags.update((tags) => tags.filter((t) => t !== tag));
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  protected save(): void {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const raw = this.form.getRawValue();
    this.mediaService
      .update(this.media().id, {
        altText: raw.altText.trim() || null,
        description: raw.description.trim() || null,
        tags: this.tags(),
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.saved.emit(updated);
        },
        error: () => {
          this.error.set('Falha ao salvar os metadados.');
          this.saving.set(false);
        },
      });
  }
}
