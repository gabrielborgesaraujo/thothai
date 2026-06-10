import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
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
import { AssistantService } from '../../../../core/assistant/assistant.service';
import { MediaSummary } from '../../../../core/media/media.models';
import { MediaPicker } from '../../media/media-picker';
import { MarkdownEditor } from './markdown-editor';

const MAX_TAGS = 10;

/** Destino de uma escolha no seletor de mídias: capa da postagem ou imagem no corpo. */
type PickerTarget = 'banner' | 'body';

/** Formulário de criação/edição de postagem com editor WYSIWYG que persiste Markdown (RF02). */
@Component({
  selector: 'app-post-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MarkdownEditor,
    MediaPicker,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-5xl">
      <h1 class="mb-4 text-2xl font-semibold tracking-tight">
        {{ editingId() ? 'Editar postagem' : 'Nova postagem' }}
      </h1>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error()) {
        <p class="my-2 text-sm text-red-600 dark:text-red-400" role="alert">{{ error() }}</p>
      }

      <div
        class="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30"
      >
        <p class="mb-2 inline-flex items-center gap-1.5 text-sm font-medium">
          <mat-icon class="text-[18px]! text-indigo-500">auto_awesome</mat-icon>
          Assistente de IA
        </p>
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
          <p class="text-sm text-red-600 dark:text-red-400" role="alert">{{ aiError() }}</p>
        }
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-3 pt-2">
        <!-- Banner da publicação (capa do card em mosaico, hero do detalhe e og:image). -->
        <div>
          <p class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Banner</p>
          @if (bannerUrl(); as banner) {
            <div
              class="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
            >
              <img [src]="banner" alt="Banner da publicação" class="aspect-[3/1] w-full object-cover" />
              <div class="absolute top-2 right-2 flex gap-1">
                <button matButton="tonal" type="button" (click)="pickerTarget.set('banner')">
                  <mat-icon>swap_horiz</mat-icon>
                  Trocar
                </button>
                <button matButton="tonal" type="button" (click)="bannerUrl.set(null)">
                  <mat-icon>delete</mat-icon>
                  Remover
                </button>
              </div>
            </div>
          } @else {
            <button
              type="button"
              (click)="pickerTarget.set('banner')"
              class="flex aspect-[6/1] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 text-gray-400 transition-colors hover:border-indigo-400 hover:text-indigo-500 dark:border-gray-700 dark:text-gray-500 dark:hover:border-indigo-500"
            >
              <mat-icon>add_photo_alternate</mat-icon>
              <span class="text-sm">Escolher banner da galeria</span>
            </button>
          }
        </div>

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
              <mat-option value="SCHEDULED">Agendado</mat-option>
              <mat-option value="PUBLISHED">Publicado</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        @if (statusValue() === 'SCHEDULED') {
          <mat-form-field appearance="outline">
            <mat-label>Publicar em</mat-label>
            <input matInput type="datetime-local" formControlName="scheduledAt" />
            <mat-hint>A postagem será publicada automaticamente nesse horário.</mat-hint>
          </mat-form-field>
        }

        <!-- Tags: chips adicionadas com Enter ou vírgula; Backspace remove a última. -->
        <div>
          <label
            for="tag-input"
            class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
            >Tags ({{ tags().length }}/{{ maxTags }})</label
          >
          <div
            class="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 dark:border-gray-700 dark:bg-gray-900"
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
              id="tag-input"
              #tagInput
              type="text"
              (keydown)="onTagKeydown($event)"
              (blur)="addTag(tagInput.value); tagInput.value = ''"
              [placeholder]="tags().length ? '' : 'Adicionar tag…'"
              class="min-w-28 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Resumo</mat-label>
          <textarea matInput formControlName="summary" rows="2"></textarea>
        </mat-form-field>

        <div class="flex flex-wrap items-center gap-3">
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
          <button
            matButton
            type="button"
            (click)="generateSnippet()"
            [disabled]="generatingSnippet()"
            aria-label="Gerar isca para LinkedIn"
          >
            <mat-icon>share</mat-icon>
            Isca p/ LinkedIn
          </button>
        </div>

        @if (reviewing()) {
          <mat-progress-bar mode="indeterminate" />
        }
        @if (reviewError()) {
          <p class="text-sm text-red-600 dark:text-red-400" role="alert">{{ reviewError() }}</p>
        }
        @if (recommendations(); as recs) {
          <div class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p class="mb-2 text-sm font-medium">Recomendações da IA</p>
            @if (recs.length === 0) {
              <p class="text-sm text-gray-500 dark:text-gray-400">Nenhuma recomendação.</p>
            } @else {
              <ul class="flex list-disc flex-col gap-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
                @for (rec of recs; track $index) {
                  <li>{{ rec }}</li>
                }
              </ul>
            }
          </div>
        }

        @if (generatingSnippet()) {
          <mat-progress-bar mode="indeterminate" />
        }
        @if (snippetError()) {
          <p class="text-sm text-red-600 dark:text-red-400" role="alert">{{ snippetError() }}</p>
        }
        @if (snippet(); as text) {
          <div class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div class="mb-2 flex items-center justify-between">
              <p class="text-sm font-medium">Isca para LinkedIn</p>
              <button matButton type="button" (click)="copySnippet()">
                <mat-icon>content_copy</mat-icon>
                Copiar
              </button>
            </div>
            <p class="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">{{ text }}</p>
          </div>
        }

        <!-- Editor WYSIWYG: lê e grava Markdown; cole/arraste imagens direto no texto. -->
        <app-markdown-editor
          [value]="bodyValue()"
          (valueChange)="form.controls.body.setValue($event)"
          (imageRequested)="pickerTarget.set('body')"
        />

        <div class="flex gap-2">
          <button matButton="filled" type="submit" [disabled]="loading()">
            {{ submitLabel() }}
          </button>
          <a matButton routerLink="/admin/posts">Cancelar</a>
        </div>
      </form>

      @if (pickerTarget()) {
        <app-media-picker (closed)="pickerTarget.set(null)" (selected)="onMediaPicked($event)" />
      }
    </div>
  `,
})
export class PostForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly postService = inject(PostService);
  private readonly assistant = inject(AssistantService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly editor = viewChild.required(MarkdownEditor);

  protected readonly maxTags = MAX_TAGS;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly tags = signal<string[]>([]);
  protected readonly bannerUrl = signal<string | null>(null);
  protected readonly pickerTarget = signal<PickerTarget | null>(null);
  protected readonly generating = signal(false);
  protected readonly aiError = signal<string | null>(null);
  protected readonly reviewing = signal(false);
  protected readonly reviewError = signal<string | null>(null);
  protected readonly recommendations = signal<string[] | null>(null);
  protected readonly snippet = signal<string | null>(null);
  protected readonly generatingSnippet = signal(false);
  protected readonly snippetError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    title: ['', Validators.required],
    slug: [''],
    type: ['ARTICLE' as PostType, Validators.required],
    status: ['DRAFT' as PostStatus, Validators.required],
    scheduledAt: [''],
    summary: [''],
    body: ['', Validators.required],
  });

  /** Espelha o corpo em um signal para alimentar o editor sob OnPush. */
  protected readonly bodyValue = toSignal(this.form.controls.body.valueChanges, {
    initialValue: '',
  });

  /** Espelha o status para alternar o campo de agendamento e o rótulo do botão. */
  protected readonly statusValue = toSignal(this.form.controls.status.valueChanges, {
    initialValue: 'DRAFT' as PostStatus,
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId.set(id);
      this.loadPost(id);
    }
  }

  protected submitLabel(): string {
    switch (this.statusValue()) {
      case 'PUBLISHED':
        return 'Salvar e publicar';
      case 'SCHEDULED':
        return 'Salvar e agendar';
      default:
        return 'Salvar rascunho';
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.status === 'SCHEDULED' && !raw.scheduledAt) {
      this.error.set('Informe o horário de publicação para agendar.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const request: PostRequest = {
      title: raw.title,
      type: raw.type,
      status: raw.status,
      summary: raw.summary.trim() ? raw.summary : null,
      body: raw.body,
      slug: raw.slug.trim() || undefined,
      bannerUrl: this.bannerUrl(),
      tags: this.tags(),
      scheduledAt:
        raw.status === 'SCHEDULED' && raw.scheduledAt
          ? new Date(raw.scheduledAt).toISOString()
          : null,
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

  // --- Seletor de mídias (banner e corpo) ---

  protected onMediaPicked(media: MediaSummary): void {
    const target = this.pickerTarget();
    this.pickerTarget.set(null);
    if (target === 'banner') {
      this.bannerUrl.set(media.url);
    } else if (target === 'body') {
      this.editor().insertImage(media.url, media.altText ?? media.originalFilename);
    }
  }

  // --- Tags ---

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

  // --- IA (RF04/RF05) ---

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

  /** Gera uma "isca" para LinkedIn a partir do título + corpo atuais (estratégia de distribuição). */
  protected generateSnippet(): void {
    const title = this.form.controls.title.value;
    const body = this.form.controls.body.value;
    if ((!title.trim() && !body.trim()) || this.generatingSnippet()) {
      return;
    }
    this.generatingSnippet.set(true);
    this.snippetError.set(null);
    this.snippet.set(null);
    this.assistant.generateSnippet(title, body).subscribe({
      next: (res) => {
        this.snippet.set(res.text);
        this.generatingSnippet.set(false);
      },
      error: () => {
        this.snippetError.set('Não foi possível gerar a isca (IA indisponível).');
        this.generatingSnippet.set(false);
      },
    });
  }

  protected copySnippet(): void {
    const text = this.snippet();
    if (text) {
      navigator.clipboard?.writeText(text);
    }
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
          scheduledAt: post.scheduledAt ? this.toLocalInput(post.scheduledAt) : '',
          summary: post.summary ?? '',
          body: post.body,
        });
        this.tags.set(post.tags);
        this.bannerUrl.set(post.bannerUrl);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Postagem não encontrada.');
        this.loading.set(false);
      },
    });
  }

  /** Converte um ISO-8601 para o formato local aceito por <input type="datetime-local">. */
  private toLocalInput(iso: string): string {
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  }
}
