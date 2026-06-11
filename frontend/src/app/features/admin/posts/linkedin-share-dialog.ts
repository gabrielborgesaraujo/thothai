import { ChangeDetectionStrategy, Component, DOCUMENT, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PostSummary } from '../../../core/content/post.models';
import { PostService } from '../../../core/content/post.service';
import { AssistantService } from '../../../core/assistant/assistant.service';
import { SocialService } from '../../../core/social/social.service';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Publica uma postagem no feed do LinkedIn da conta conectada: texto editável (pré-preenchido
 * com título + resumo, ou gerado como "isca" pela IA) e o link do artigo como cartão.
 */
@Component({
  selector: 'app-linkedin-share-dialog',
  imports: [FormsModule, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Publicar no LinkedIn"
      (click)="onBackdrop($event)"
    >
      <div
        class="flex max-h-full w-full max-w-xl flex-col gap-3 overflow-auto rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-900"
      >
        <div class="flex items-center justify-between">
          <h2 class="inline-flex items-center gap-2 font-semibold">
            <mat-icon class="text-indigo-500">share</mat-icon>
            Publicar no LinkedIn
          </h2>
          <button matIconButton type="button" (click)="closed.emit()" aria-label="Fechar">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        @if (checkingStatus()) {
          <mat-progress-bar mode="indeterminate" />
        } @else if (!connected()) {
          <div class="py-6 text-center">
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Sua conta do LinkedIn ainda não está conectada.
            </p>
            <a
              routerLink="/admin/integrations"
              class="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >Conectar em Integrações →</a
            >
          </div>
        } @else if (publishedId()) {
          <div class="py-6 text-center">
            <mat-icon class="text-4xl! text-green-500">check_circle</mat-icon>
            <p class="mt-2 text-sm text-gray-700 dark:text-gray-200">
              Publicado no seu feed do LinkedIn!
            </p>
            <button matButton class="mt-3" type="button" (click)="closed.emit()">Fechar</button>
          </div>
        } @else {
          <p class="text-sm text-gray-500 dark:text-gray-400">
            "{{ post().title }}" será compartilhado com o link
            <code class="font-mono text-xs">{{ articleUrl() }}</code> como cartão.
          </p>

          <textarea
            [(ngModel)]="text"
            rows="7"
            maxlength="2900"
            aria-label="Texto da publicação no LinkedIn"
            class="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
          ></textarea>

          <div class="flex items-center justify-between gap-2">
            <button matButton type="button" (click)="generateBait()" [disabled]="generating()">
              <mat-icon>auto_awesome</mat-icon>
              Gerar isca com IA
            </button>
            <span class="text-xs text-gray-400 dark:text-gray-500">{{ text().length }}/2900</span>
          </div>

          @if (generating() || publishing()) {
            <mat-progress-bar mode="indeterminate" />
          }
          @if (error()) {
            <p class="text-sm text-red-600 dark:text-red-400" role="alert">{{ error() }}</p>
          }

          <div class="flex justify-end gap-2">
            <button matButton type="button" (click)="closed.emit()">Cancelar</button>
            <button
              matButton="filled"
              type="button"
              (click)="publish()"
              [disabled]="publishing() || !text().trim()"
            >
              Publicar no LinkedIn
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class LinkedInShareDialog {
  private readonly social = inject(SocialService);
  private readonly posts = inject(PostService);
  private readonly assistant = inject(AssistantService);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);

  readonly post = input.required<PostSummary>();
  readonly closed = output<void>();

  protected readonly checkingStatus = signal(true);
  protected readonly connected = signal(false);
  protected readonly text = signal('');
  protected readonly generating = signal(false);
  protected readonly publishing = signal(false);
  protected readonly publishedId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.social.linkedInStatus().subscribe({
      next: (status) => {
        this.connected.set(status.connected);
        this.checkingStatus.set(false);
      },
      error: () => {
        this.connected.set(false);
        this.checkingStatus.set(false);
      },
    });
    // Texto inicial: título + resumo (a isca por IA é opcional).
    queueMicrotask(() => {
      const post = this.post();
      this.text.set([post.title, post.summary ?? ''].filter(Boolean).join('\n\n'));
    });
  }

  protected articleUrl(): string {
    const handle = this.auth.user()?.handle ?? '';
    return `${this.document.location?.origin ?? ''}/${handle}/posts/${this.post().slug}`;
  }

  /** Busca o corpo completo e pede à IA uma isca de LinkedIn para a postagem. */
  protected generateBait(): void {
    if (this.generating()) {
      return;
    }
    this.generating.set(true);
    this.error.set(null);
    this.posts.getAdmin(this.post().id).subscribe({
      next: (full) => {
        this.assistant.generateSnippet(full.title, full.body).subscribe({
          next: (res) => {
            this.text.set(res.text);
            this.generating.set(false);
          },
          error: () => {
            this.error.set('Não foi possível gerar a isca (IA indisponível).');
            this.generating.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Falha ao carregar a postagem.');
        this.generating.set(false);
      },
    });
  }

  protected publish(): void {
    if (this.publishing() || !this.text().trim()) {
      return;
    }
    this.publishing.set(true);
    this.error.set(null);
    this.social.shareOnLinkedIn(this.text().trim(), this.articleUrl(), this.post().id).subscribe({
      next: (res) => {
        this.publishedId.set(res.postId);
        this.publishing.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.error.set(err?.error?.detail ?? 'Falha ao publicar no LinkedIn.');
        this.publishing.set(false);
      },
    });
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
