import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PostService } from '../../../../core/content/post.service';
import { PostRequest, PostStatus, PostType } from '../../../../core/content/post.models';
import { MarkdownPipe } from '../../../../core/content/markdown.pipe';
import { MediaService } from '../../../../core/media/media.service';
import { AssistantService } from '../../../../core/assistant/assistant.service';

/** Formulário de criação/edição de postagem com pré-visualização Markdown ao vivo (RF02). */
@Component({
  selector: 'app-post-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MarkdownPipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-5xl">
      <h1 class="text-2xl font-semibold tracking-tight mb-4">
        {{ editingId() ? 'Editar postagem' : 'Nova postagem' }}
      </h1>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error()) {
        <p class="text-sm text-red-600 my-2" role="alert">{{ error() }}</p>
      }

      <div class="mb-4 rounded border border-gray-200 bg-gray-50 p-4">
        <p class="mb-2 text-sm font-medium">Assistente de IA</p>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-start">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Tema</mat-label>
            <input matInput #themeInput placeholder="Ex.: Padrões de concorrência em Kotlin" />
          </mat-form-field>
          <button
            matButton="tonal"
            type="button"
            (click)="generateDraft(themeInput.value)"
            [disabled]="generating()"
          >
            <mat-icon>auto_awesome</mat-icon>
            Gerar rascunho
          </button>
        </div>
        @if (generating()) {
          <mat-progress-bar mode="indeterminate" />
        }
        @if (aiError()) {
          <p class="text-sm text-red-600" role="alert">{{ aiError() }}</p>
        }
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-3 pt-2">
        <mat-form-field appearance="outline">
          <mat-label>Título</mat-label>
          <input matInput formControlName="title" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Slug (opcional)</mat-label>
          <input matInput formControlName="slug" placeholder="derivado-do-titulo" />
          <mat-hint>Deixe em branco para gerar a partir do título.</mat-hint>
        </mat-form-field>

        <div class="flex flex-col gap-3 sm:flex-row">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Tipo</mat-label>
            <mat-select formControlName="type">
              <mat-option value="ARTICLE">Artigo</mat-option>
              <mat-option value="TUTORIAL">Tutorial</mat-option>
              <mat-option value="NOTE">Nota</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="DRAFT">Rascunho</mat-option>
              <mat-option value="PUBLISHED">Publicado</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Resumo</mat-label>
          <textarea matInput formControlName="summary" rows="2"></textarea>
        </mat-form-field>

        <div class="flex items-center gap-3">
          <button
            matButton
            type="button"
            (click)="fileInput.click()"
            [disabled]="uploading()"
            aria-label="Inserir imagem no conteúdo"
          >
            <mat-icon>image</mat-icon>
            Inserir imagem
          </button>
          @if (uploading()) {
            <mat-progress-bar mode="indeterminate" class="flex-1" />
          }
          @if (uploadError()) {
            <span class="text-sm text-red-600" role="alert">{{ uploadError() }}</span>
          }
          <button
            matButton
            type="button"
            (click)="review()"
            [disabled]="reviewing()"
            aria-label="Revisar conteúdo com IA"
          >
            <mat-icon>spellcheck</mat-icon>
            Revisar com IA
          </button>
          <input #fileInput type="file" accept="image/*" hidden (change)="onFileSelected($event)" />
        </div>

        @if (reviewing()) {
          <mat-progress-bar mode="indeterminate" />
        }
        @if (reviewError()) {
          <p class="text-sm text-red-600" role="alert">{{ reviewError() }}</p>
        }
        @if (recommendations(); as recs) {
          <div class="rounded border border-gray-200 p-4">
            <p class="mb-2 text-sm font-medium">Recomendações da IA</p>
            @if (recs.length === 0) {
              <p class="text-sm text-gray-500">Nenhuma recomendação.</p>
            } @else {
              <ul class="flex list-disc flex-col gap-1 pl-5 text-sm text-gray-700">
                @for (rec of recs; track $index) {
                  <li>{{ rec }}</li>
                }
              </ul>
            }
          </div>
        }

        <div class="grid gap-3 md:grid-cols-2">
          <mat-form-field appearance="outline">
            <mat-label>Conteúdo (Markdown)</mat-label>
            <textarea
              #bodyInput
              matInput
              formControlName="body"
              rows="18"
              class="font-mono text-sm"
            ></textarea>
          </mat-form-field>
          <div class="rounded border border-gray-200 p-4 overflow-auto">
            <p class="mb-2 text-xs uppercase tracking-wide text-gray-400">Pré-visualização</p>
            <div class="markdown-body" [innerHTML]="bodyValue() | markdown"></div>
          </div>
        </div>

        <div class="flex gap-2">
          <button matButton="filled" type="submit" [disabled]="loading()">Salvar</button>
          <a matButton routerLink="/admin/posts">Cancelar</a>
        </div>
      </form>
    </div>
  `,
})
export class PostForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly postService = inject(PostService);
  private readonly media = inject(MediaService);
  private readonly assistant = inject(AssistantService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly bodyInput = viewChild.required<ElementRef<HTMLTextAreaElement>>('bodyInput');

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly uploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly generating = signal(false);
  protected readonly aiError = signal<string | null>(null);
  protected readonly reviewing = signal(false);
  protected readonly reviewError = signal<string | null>(null);
  protected readonly recommendations = signal<string[] | null>(null);

  protected readonly form = this.fb.group({
    title: ['', Validators.required],
    slug: [''],
    type: ['ARTICLE' as PostType, Validators.required],
    status: ['DRAFT' as PostStatus, Validators.required],
    summary: [''],
    body: ['', Validators.required],
  });

  /** Espelha o corpo em um signal para alimentar a pré-visualização sob OnPush. */
  protected readonly bodyValue = toSignal(this.form.controls.body.valueChanges, {
    initialValue: '',
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId.set(id);
      this.loadPost(id);
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const request: PostRequest = {
      title: raw.title,
      type: raw.type,
      status: raw.status,
      summary: raw.summary.trim() ? raw.summary : null,
      body: raw.body,
      slug: raw.slug.trim() || undefined,
    };

    const id = this.editingId();
    const save = id ? this.postService.update(id, request) : this.postService.create(request);
    save.subscribe({
      next: () => this.router.navigate(['/admin/posts']),
      error: () => {
        this.error.set('Falha ao salvar a postagem.');
        this.loading.set(false);
      },
    });
  }

  /** RF04 — gera um rascunho a partir do tema (busca viva + IA) e preenche o formulário. */
  protected generateDraft(theme: string): void {
    if (!theme.trim() || this.generating()) {
      return;
    }
    this.generating.set(true);
    this.aiError.set(null);
    this.assistant.generateDraft(theme).subscribe({
      next: (draft) => {
        this.form.patchValue({ title: draft.title, summary: draft.summary ?? '' });
        this.form.controls.body.setValue(draft.body);
        this.generating.set(false);
      },
      error: () => {
        this.aiError.set('Não foi possível gerar o rascunho (IA indisponível).');
        this.generating.set(false);
      },
    });
  }

  /** RF05 — envia o corpo atual para revisão por IA e lista as recomendações. */
  protected review(): void {
    const body = this.form.controls.body.value;
    if (!body.trim() || this.reviewing()) {
      return;
    }
    this.reviewing.set(true);
    this.reviewError.set(null);
    this.recommendations.set(null);
    this.assistant.review(body).subscribe({
      next: (res) => {
        this.recommendations.set(res.recommendations);
        this.reviewing.set(false);
      },
      error: () => {
        this.reviewError.set('Não foi possível revisar (IA indisponível).');
        this.reviewing.set(false);
      },
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.uploadError.set(null);
    this.media.upload(file).subscribe({
      next: (res) => {
        this.insertAtCursor(`![${file.name}](${res.url})`);
        this.uploading.set(false);
        input.value = '';
      },
      error: () => {
        this.uploadError.set('Falha ao enviar a imagem.');
        this.uploading.set(false);
        input.value = '';
      },
    });
  }

  /** Insere o trecho na posição atual do cursor no textarea do corpo. */
  private insertAtCursor(snippet: string): void {
    const el = this.bodyInput().nativeElement;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const current = this.form.controls.body.value;
    this.form.controls.body.setValue(current.slice(0, start) + snippet + current.slice(end));

    const caret = start + snippet.length;
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  private loadPost(id: string): void {
    this.loading.set(true);
    this.postService.getAdmin(id).subscribe({
      next: (post) => {
        this.form.patchValue({
          title: post.title,
          slug: post.slug,
          type: post.type,
          status: post.status,
          summary: post.summary ?? '',
          body: post.body,
        });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Postagem não encontrada.');
        this.loading.set(false);
      },
    });
  }
}
