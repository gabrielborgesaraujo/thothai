import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AssistantService } from '../../../core/assistant/assistant.service';
import {
  PromptHistoryItem,
  PromptHistoryType,
} from '../../../core/assistant/prompt-history.models';
import { ToastService } from '../../../core/toast/toast.service';

const TYPE_LABELS: Record<PromptHistoryType, string> = {
  DRAFT: 'Rascunho',
  IMAGE: 'Imagem',
};

/** Histórico de prompts de IA: consulta com filtros (tipo, favoritos, busca), favoritar e reusar. */
@Component({
  selector: 'app-prompt-history',
  imports: [
    DatePipe,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-3xl">
      <h1 class="mb-1 text-2xl font-semibold tracking-tight">Histórico de prompts</h1>
      <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Consulte e reuse os prompts que você enviou à IA. Favorite os melhores para achá-los rápido.
      </p>

      <div class="mb-4 flex flex-wrap items-center gap-2">
        <mat-form-field appearance="outline" class="flex-1">
          <mat-label>Buscar</mat-label>
          <input matInput [(ngModel)]="query" (keyup.enter)="reload()" placeholder="texto do prompt…" />
          @if (query()) {
            <button matIconButton matSuffix type="button" (click)="query.set(''); reload()" aria-label="Limpar busca">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-40">
          <mat-label>Tipo</mat-label>
          <mat-select [(ngModel)]="type" (selectionChange)="reload()">
            <mat-option [value]="null">Todos</mat-option>
            <mat-option value="DRAFT">Rascunho</mat-option>
            <mat-option value="IMAGE">Imagem</mat-option>
          </mat-select>
        </mat-form-field>
        <button
          matButton="tonal"
          type="button"
          (click)="favoritesOnly.set(!favoritesOnly()); reload()"
          [attr.aria-pressed]="favoritesOnly()"
        >
          <mat-icon>{{ favoritesOnly() ? 'star' : 'star_border' }}</mat-icon>
          Favoritos
        </button>
      </div>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }

      @if (items(); as list) {
        @if (list.length === 0) {
          <p class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Nenhum prompt encontrado. Gere um rascunho ou uma imagem para começar o histórico.
          </p>
        } @else {
          <ul class="flex flex-col gap-2">
            @for (item of list; track item.id) {
              <li class="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <div class="mb-1 flex items-center gap-2">
                  <span
                    class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >{{ typeLabel(item.type) }}</span
                  >
                  <span class="text-xs text-gray-400 dark:text-gray-500">{{
                    item.createdAt | date: 'short'
                  }}</span>
                  <span class="ml-auto flex items-center gap-0.5">
                    <button
                      matIconButton
                      type="button"
                      (click)="toggleFavorite(item)"
                      [attr.aria-label]="item.favorite ? 'Desfavoritar' : 'Favoritar'"
                    >
                      <mat-icon [class]="item.favorite ? 'text-amber-500' : ''">{{
                        item.favorite ? 'star' : 'star_border'
                      }}</mat-icon>
                    </button>
                    <button matIconButton type="button" (click)="copy(item)" aria-label="Copiar prompt">
                      <mat-icon>content_copy</mat-icon>
                    </button>
                    <button matIconButton type="button" (click)="remove(item)" aria-label="Excluir prompt">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </span>
                </div>
                <p class="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">{{ item.prompt }}</p>
              </li>
            }
          </ul>
        }
      }
    </div>
  `,
})
export class PromptHistory {
  private readonly assistant = inject(AssistantService);
  private readonly toast = inject(ToastService);

  protected readonly items = signal<PromptHistoryItem[] | null>(null);
  protected readonly loading = signal(true);
  protected readonly query = signal('');
  protected readonly type = signal<PromptHistoryType | null>(null);
  protected readonly favoritesOnly = signal(false);

  constructor() {
    this.reload();
  }

  protected typeLabel(type: PromptHistoryType): string {
    return TYPE_LABELS[type];
  }

  protected reload(): void {
    this.loading.set(true);
    this.assistant
      .listPrompts({
        type: this.type() ?? undefined,
        favoritesOnly: this.favoritesOnly(),
        q: this.query(),
      })
      .subscribe({
        next: (list) => {
          this.items.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.toast.error('Falha ao carregar o histórico de prompts.');
          this.loading.set(false);
        },
      });
  }

  protected toggleFavorite(item: PromptHistoryItem): void {
    this.assistant.setPromptFavorite(item.id, !item.favorite).subscribe({
      next: () => this.reload(),
      error: () => this.toast.error('Falha ao atualizar o favorito.'),
    });
  }

  protected copy(item: PromptHistoryItem): void {
    navigator.clipboard?.writeText(item.prompt);
    this.toast.success('Prompt copiado.');
  }

  protected remove(item: PromptHistoryItem): void {
    this.assistant.deletePrompt(item.id).subscribe({
      next: () => {
        this.items.update((list) => (list ?? []).filter((i) => i.id !== item.id));
        this.toast.success('Prompt removido.');
      },
      error: () => this.toast.error('Falha ao remover o prompt.'),
    });
  }
}
