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

/** Ações da barra de formatação Markdown: envolve a seleção ou prefixa a linha. */
interface ToolbarAction {
  icon: string;
  label: string;
  prefix: string;
  suffix?: string;
  block?: boolean;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { icon: 'format_bold', label: 'Negrito', prefix: '**', suffix: '**' },
  { icon: 'format_italic', label: 'Itálico', prefix: '*', suffix: '*' },
  { icon: 'title', label: 'Título (H2)', prefix: '## ', block: true },
  { icon: 'code', label: 'Código inline', prefix: '`', suffix: '`' },
  { icon: 'data_object', label: 'Bloco de código', prefix: '\n```\n', suffix: '\n```\n' },
  { icon: 'link', label: 'Link', prefix: '[', suffix: '](https://)' },
  { icon: 'format_quote', label: 'Citação', prefix: '> ', block: true },
  { icon: 'format_list_bulleted', label: 'Lista', prefix: '- ', block: true },
];

const MAX_TAGS = 10;

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
            <div class="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <img [src]="banner" alt="Banner da publicação" class="aspect-[3/1] w-full object-cover" />
              <div class="absolute top-2 right-2 flex gap-1">
                <button
                  matButton="tonal"
                  type="button"
                  (click)="bannerInput.click()"
                  [disabled]="uploadingBanner()"
                >
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
              (click)="bannerInput.click()"
              [disabled]="uploadingBanner()"
              class="flex aspect-[6/1] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 text-gray-400 transition-colors hover:border-indigo-400 hover:text-indigo-500 dark:border-gray-700 dark:text-gray-500 dark:hover:border-indigo-500"
            >
              <mat-icon>add_photo_alternate</mat-icon>
              <span class="text-sm">Adicionar banner</span>
            </button>
          }
          @if (uploadingBanner()) {
            <mat-progress-bar mode="indeterminate" class="mt-1" />
          }
          @if (bannerError()) {
            <p class="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{{ bannerError() }}</p>
          }
          <input
            #bannerInput
            type="file"
            accept="image/*"
            hidden
            (change)="onBannerSelected($event)"
          />
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
                  <span class="material-icons text-[14px] align-middle" aria-hidden="true"
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
            <span class="text-sm text-red-600 dark:text-red-400" role="alert">{{
              uploadError()
            }}</span>
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
          <input #fileInput type="file" accept="image/*" hidden (change)="onFileSelected($event)" />
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

        <div class="grid gap-3 md:grid-cols-2">
          <div>
            <!-- Barra de formatação Markdown: atua sobre a seleção no textarea. -->
            <div
              class="mb-1 flex flex-wrap gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900"
              role="toolbar"
              aria-label="Formatação Markdown"
            >
              @for (action of toolbar; track action.icon) {
                <button
                  type="button"
                  (click)="applyAction(action)"
                  [attr.aria-label]="action.label"
                  [title]="action.label"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  <span class="material-icons text-[18px]" aria-hidden="true">{{
                    action.icon
                  }}</span>
                </button>
              }
            </div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Conteúdo (Markdown)</mat-label>
              <textarea
                #bodyInput
                matInput
                formControlName="body"
                rows="18"
                class="font-mono text-sm"
              ></textarea>
            </mat-form-field>
          </div>
          <div class="overflow-auto rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p class="mb-2 text-xs tracking-wide text-gray-400 uppercase dark:text-gray-500">
              Pré-visualização
            </p>
            <div class="markdown-body" [innerHTML]="bodyValue() | markdown"></div>
          </div>
        </div>

        <div class="flex gap-2">
          <button matButton="filled" type="submit" [disabled]="loading()">
            {{ submitLabel() }}
          </button>
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

  protected readonly toolbar = TOOLBAR_ACTIONS;
  protected readonly maxTags = MAX_TAGS;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly tags = signal<string[]>([]);
  protected readonly bannerUrl = signal<string | null>(null);
  protected readonly uploadingBanner = signal(false);
  protected readonly bannerError = signal<string | null>(null);
  protected readonly uploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);
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

  /** Espelha o corpo em um signal para alimentar a pré-visualização sob OnPush. */
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

  // --- Barra de formatação Markdown ---

  protected applyAction(action: ToolbarAction): void {
    const el = this.bodyInput().nativeElement;
    const value = this.form.controls.body.value;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;

    if (action.block) {
      // Prefixa o início da linha corrente (título, citação, lista).
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      this.form.controls.body.setValue(
        value.slice(0, lineStart) + action.prefix + value.slice(lineStart),
      );
      this.restoreSelection(start + action.prefix.length, end + action.prefix.length);
      return;
    }

    const selected = value.slice(start, end);
    const suffix = action.suffix ?? '';
    this.form.controls.body.setValue(
      value.slice(0, start) + action.prefix + selected + suffix + value.slice(end),
    );
    // Sem seleção, o cursor fica entre os marcadores; com seleção, depois do sufixo.
    const caret = selected
      ? end + action.prefix.length + suffix.length
      : start + action.prefix.length;
    this.restoreSelection(caret, caret);
  }

  private restoreSelection(start: number, end: number): void {
    const el = this.bodyInput().nativeElement;
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start, end);
    });
  }

  // --- IA (RF04/RF05) e mídia (RF03) ---

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

  /** Envia a imagem de banner para o MinIO e guarda a URL pública. */
  protected onBannerSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploadingBanner.set(true);
    this.bannerError.set(null);
    this.media.upload(file).subscribe({
      next: (res) => {
        this.bannerUrl.set(res.url);
        this.uploadingBanner.set(false);
        input.value = '';
      },
      error: () => {
        this.bannerError.set('Falha ao enviar o banner.');
        this.uploadingBanner.set(false);
        input.value = '';
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
    this.restoreSelection(start + snippet.length, start + snippet.length);
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
