import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MediaService } from '../../../core/media/media.service';
import { MediaSummary } from '../../../core/media/media.models';

/** Listagem e exclusão das mídias enviadas (RF03 — limpeza de uploads). */
@Component({
  selector: 'app-media-list',
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold tracking-tight mb-4">Mídias</h1>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    @if (error()) {
      <p class="text-sm text-red-600 my-2" role="alert">{{ error() }}</p>
    }

    @if (media(); as items) {
      @if (items.length === 0) {
        <p class="text-gray-500">Nenhuma mídia enviada ainda.</p>
      } @else {
        <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          @for (item of items; track item.id) {
            <li class="rounded border border-gray-200 p-2">
              <img
                [src]="item.url"
                [alt]="item.originalFilename ?? 'Mídia'"
                width="200"
                height="128"
                class="h-32 w-full rounded object-cover bg-gray-50"
              />
              <p class="mt-2 truncate text-xs text-gray-600" [title]="item.originalFilename ?? ''">
                {{ item.originalFilename ?? item.id }}
              </p>
              <p class="text-xs text-gray-400">
                {{ item.sizeBytes | number }} bytes
                @if (item.createdAt) {
                  · {{ item.createdAt | date: 'shortDate' }}
                }
              </p>
              @if (pendingDelete() === item.id) {
                <div class="mt-1 flex items-center gap-1">
                  <span class="text-xs text-gray-600">Excluir?</span>
                  <button matButton (click)="confirmDelete(item.id)">Sim</button>
                  <button matButton (click)="pendingDelete.set(null)">Não</button>
                </div>
              } @else {
                <button matButton class="mt-1" (click)="pendingDelete.set(item.id)">Excluir</button>
              }
            </li>
          }
        </ul>
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
