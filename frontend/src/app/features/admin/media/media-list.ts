import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MediaService } from '../../../core/media/media.service';
import { MediaSummary } from '../../../core/media/media.models';
import { persistedViewMode } from '../../../shared/view-mode';
import { ViewToggle } from '../../../shared/view-toggle';

/** Listagem (mosaico ou lista) e exclusão das mídias enviadas (RF03 — limpeza de uploads). */
@Component({
  selector: 'app-media-list',
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatIconModule, MatProgressBarModule, ViewToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold tracking-tight">Mídias</h1>
      <app-view-toggle [mode]="view.mode()" (modeChange)="view.set($event)" />
    </div>

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
          <p class="mt-3 text-gray-500 dark:text-gray-400">Nenhuma mídia enviada ainda.</p>
        </div>
      } @else if (view.mode() === 'mosaic') {
        <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          @for (item of items; track item.id) {
            <li class="rounded-lg border border-gray-200 p-2 dark:border-gray-800">
              <img
                [src]="item.url"
                [alt]="item.originalFilename ?? 'Mídia'"
                width="200"
                height="128"
                loading="lazy"
                class="h-32 w-full rounded object-cover bg-gray-50 dark:bg-gray-900"
              />
              <p
                class="mt-2 truncate text-xs text-gray-600 dark:text-gray-400"
                [title]="item.originalFilename ?? ''"
              >
                {{ item.originalFilename ?? item.id }}
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500">
                {{ item.sizeBytes | number }} bytes
                @if (item.createdAt) {
                  · {{ item.createdAt | date: 'shortDate' }}
                }
              </p>
              @if (pendingDelete() === item.id) {
                <div class="mt-1 flex items-center gap-1">
                  <span class="text-xs text-gray-600 dark:text-gray-300">Excluir?</span>
                  <button matButton (click)="confirmDelete(item.id)">Sim</button>
                  <button matButton (click)="pendingDelete.set(null)">Não</button>
                </div>
              } @else {
                <button matButton class="mt-1" (click)="pendingDelete.set(item.id)">Excluir</button>
              }
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
                    <span class="flex items-center gap-3">
                      <img
                        [src]="item.url"
                        [alt]="item.originalFilename ?? 'Mídia'"
                        width="48"
                        height="48"
                        loading="lazy"
                        class="size-12 shrink-0 rounded object-cover bg-gray-50 dark:bg-gray-900"
                      />
                      <span class="min-w-0">
                        <span class="block max-w-xs truncate font-medium" [title]="item.originalFilename ?? ''">{{
                          item.originalFilename ?? item.id
                        }}</span>
                        <a
                          [href]="item.url"
                          target="_blank"
                          rel="noopener"
                          class="block max-w-xs truncate text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                          >{{ item.url }}</a
                        >
                      </span>
                    </span>
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
  `,
})
export class MediaList {
  private readonly mediaService = inject(MediaService);

  protected readonly media = signal<MediaSummary[] | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pendingDelete = signal<string | null>(null);
  /** Mosaico por padrão; a escolha persiste no navegador. */
  protected readonly view = persistedViewMode('thothai-media-view', 'mosaic');

  constructor() {
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
    this.mediaService.list().subscribe({
      next: (items) => {
        this.media.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Falha ao carregar as mídias.');
        this.loading.set(false);
      },
    });
  }
}
