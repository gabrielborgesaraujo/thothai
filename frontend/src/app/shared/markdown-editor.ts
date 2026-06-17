import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from 'tiptap-markdown';
import { MediaService } from '../core/media/media.service';

/** Estado dos botões da toolbar, recalculado a cada transação do editor. */
interface ToolbarState {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  h2: boolean;
  h3: boolean;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  code: boolean;
  codeBlock: boolean;
  link: boolean;
  table: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

const EMPTY_STATE: ToolbarState = {
  bold: false,
  italic: false,
  strike: false,
  h2: false,
  h3: false,
  bulletList: false,
  orderedList: false,
  blockquote: false,
  code: false,
  codeBlock: false,
  link: false,
  table: false,
  canUndo: false,
  canRedo: false,
};

/**
 * Editor WYSIWYG (TipTap/ProseMirror) que lê e escreve **Markdown** — o formato persistido não
 * muda (portal SSR, IA e RSS continuam consumindo Markdown). Inclui desfazer/refazer, formatação,
 * listas, tabelas, links e imagens (upload por colar/arrastar; galeria via evento ao pai).
 */
@Component({
  selector: 'app-markdown-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      [class]="
        fullscreen()
          ? 'fixed inset-0 z-50 flex flex-col overflow-auto bg-white p-6 dark:bg-gray-950'
          : 'flex flex-col'
      "
      (keydown.escape)="fullscreen.set(false)"
    >
      <div
        class="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-gray-300 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900"
        role="toolbar"
        aria-label="Formatação do conteúdo"
      >
        <button type="button" [title]="'Desfazer (Ctrl+Z)'" aria-label="Desfazer" [disabled]="!state().canUndo" (click)="run('undo')" [class]="buttonClass(false)">
          <span class="material-icons text-[18px]" aria-hidden="true">undo</span>
        </button>
        <button type="button" [title]="'Refazer (Ctrl+Y)'" aria-label="Refazer" [disabled]="!state().canRedo" (click)="run('redo')" [class]="buttonClass(false)">
          <span class="material-icons text-[18px]" aria-hidden="true">redo</span>
        </button>
        <span class="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
        <button type="button" title="Negrito (Ctrl+B)" aria-label="Negrito" (click)="run('bold')" [class]="buttonClass(state().bold)">
          <span class="material-icons text-[18px]" aria-hidden="true">format_bold</span>
        </button>
        <button type="button" title="Itálico (Ctrl+I)" aria-label="Itálico" (click)="run('italic')" [class]="buttonClass(state().italic)">
          <span class="material-icons text-[18px]" aria-hidden="true">format_italic</span>
        </button>
        <button type="button" title="Riscado" aria-label="Riscado" (click)="run('strike')" [class]="buttonClass(state().strike)">
          <span class="material-icons text-[18px]" aria-hidden="true">strikethrough_s</span>
        </button>
        <span class="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
        <button type="button" title="Título (H2)" aria-label="Título nível 2" (click)="run('h2')" [class]="buttonClass(state().h2)">
          <span class="material-icons text-[18px]" aria-hidden="true">title</span>
        </button>
        <button type="button" title="Subtítulo (H3)" aria-label="Título nível 3" (click)="run('h3')" [class]="buttonClass(state().h3)">
          <span class="material-icons text-[18px]" aria-hidden="true">text_fields</span>
        </button>
        <span class="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
        <button type="button" title="Lista" aria-label="Lista com marcadores" (click)="run('bulletList')" [class]="buttonClass(state().bulletList)">
          <span class="material-icons text-[18px]" aria-hidden="true">format_list_bulleted</span>
        </button>
        <button type="button" title="Lista numerada" aria-label="Lista numerada" (click)="run('orderedList')" [class]="buttonClass(state().orderedList)">
          <span class="material-icons text-[18px]" aria-hidden="true">format_list_numbered</span>
        </button>
        <button type="button" title="Citação" aria-label="Citação" (click)="run('blockquote')" [class]="buttonClass(state().blockquote)">
          <span class="material-icons text-[18px]" aria-hidden="true">format_quote</span>
        </button>
        <span class="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
        <button type="button" title="Código inline" aria-label="Código inline" (click)="run('code')" [class]="buttonClass(state().code)">
          <span class="material-icons text-[18px]" aria-hidden="true">code</span>
        </button>
        <button type="button" title="Bloco de código" aria-label="Bloco de código" (click)="run('codeBlock')" [class]="buttonClass(state().codeBlock)">
          <span class="material-icons text-[18px]" aria-hidden="true">data_object</span>
        </button>
        <button type="button" title="Link (Ctrl+K)" aria-label="Inserir link" (click)="setLink()" [class]="buttonClass(state().link)">
          <span class="material-icons text-[18px]" aria-hidden="true">link</span>
        </button>
        @if (allowImages()) {
          <button type="button" title="Imagem da galeria" aria-label="Inserir imagem" (click)="imageRequested.emit()" [class]="buttonClass(false)">
            <span class="material-icons text-[18px]" aria-hidden="true">image</span>
          </button>
        }
        <button type="button" title="Tabela" aria-label="Inserir tabela" (click)="run('table')" [class]="buttonClass(state().table)">
          <span class="material-icons text-[18px]" aria-hidden="true">table_chart</span>
        </button>
        <button type="button" title="Linha horizontal" aria-label="Linha horizontal" (click)="run('hr')" [class]="buttonClass(false)">
          <span class="material-icons text-[18px]" aria-hidden="true">horizontal_rule</span>
        </button>
        <span class="ml-auto"></span>
        <button
          type="button"
          [title]="fullscreen() ? 'Sair da tela cheia (Esc)' : 'Tela cheia'"
          [attr.aria-label]="fullscreen() ? 'Sair da tela cheia' : 'Editar em tela cheia'"
          (click)="fullscreen.set(!fullscreen())"
          [class]="buttonClass(false)"
        >
          <span class="material-icons text-[18px]" aria-hidden="true">{{
            fullscreen() ? 'fullscreen_exit' : 'fullscreen'
          }}</span>
        </button>
      </div>
      <div
        #host
        class="min-h-0 flex-1 overflow-auto rounded-b-lg border border-t-0 border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900"
      ></div>
      @if (uploading()) {
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400" role="status">Enviando imagem…</p>
      }
      @if (uploadError()) {
        <p class="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{{ uploadError() }}</p>
      }
    </div>
  `,
})
export class MarkdownEditor {
  private readonly media = inject(MediaService);
  private readonly destroyRef = inject(DestroyRef);

  /** Markdown vindo do formulário (carregamento do post, rascunho gerado por IA…). */
  readonly value = input<string>('');
  /** Desliga o botão de imagem e o upload por colar/arrastar (ex.: descrição de portfólio). */
  readonly allowImages = input<boolean>(true);
  readonly valueChange = output<string>();
  /** Pede ao pai a abertura do seletor de mídias (a inserção volta via [insertImage]). */
  readonly imageRequested = output<void>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  protected readonly state = signal<ToolbarState>(EMPTY_STATE);
  protected readonly fullscreen = signal(false);
  protected readonly uploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);

  private editor: Editor | null = null;
  private lastEmitted = '';

  constructor() {
    afterNextRender(() => this.createEditor());
    // Sincroniza mudanças externas do formulário (ex.: rascunho da IA) para dentro do editor.
    effect(() => {
      const value = this.value();
      if (this.editor && value !== this.lastEmitted) {
        this.lastEmitted = value;
        this.editor.commands.setContent(value, { emitUpdate: false });
      }
    });
    this.destroyRef.onDestroy(() => this.editor?.destroy());
  }

  /** Insere uma imagem na posição do cursor (chamado pelo pai após escolher na galeria). */
  insertImage(url: string, alt: string | null): void {
    this.editor?.chain().focus().setImage({ src: url, alt: alt ?? undefined }).run();
  }

  /** Texto puro da seleção atual (vazio quando nada está selecionado) — para revisão por IA. */
  getSelectedText(): string {
    if (!this.editor) {
      return '';
    }
    const { from, to } = this.editor.state.selection;
    return this.editor.state.doc.textBetween(from, to, '\n').trim();
  }

  /** Substitui a seleção atual pelo texto informado (ex.: trecho revisado pela IA). */
  replaceSelection(text: string): void {
    this.editor?.chain().focus().insertContent(text).run();
  }

  protected buttonClass(active: boolean): string {
    return (
      'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40 ' +
      (active
        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-300'
        : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100')
    );
  }

  protected run(action: string): void {
    if (!this.editor) {
      return;
    }
    const chain = this.editor.chain().focus();
    switch (action) {
      case 'undo':
        chain.undo().run();
        break;
      case 'redo':
        chain.redo().run();
        break;
      case 'bold':
        chain.toggleBold().run();
        break;
      case 'italic':
        chain.toggleItalic().run();
        break;
      case 'strike':
        chain.toggleStrike().run();
        break;
      case 'h2':
        chain.toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        chain.toggleHeading({ level: 3 }).run();
        break;
      case 'bulletList':
        chain.toggleBulletList().run();
        break;
      case 'orderedList':
        chain.toggleOrderedList().run();
        break;
      case 'blockquote':
        chain.toggleBlockquote().run();
        break;
      case 'code':
        chain.toggleCode().run();
        break;
      case 'codeBlock':
        chain.toggleCodeBlock().run();
        break;
      case 'table':
        if (this.editor.isActive('table')) {
          chain.deleteTable().run();
        } else {
          chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        }
        break;
      case 'hr':
        chain.setHorizontalRule().run();
        break;
    }
  }

  /** Liga/edita o link da seleção; URL vazia remove. */
  protected setLink(): void {
    if (!this.editor) {
      return;
    }
    const current = (this.editor.getAttributes('link')['href'] as string | undefined) ?? '';
    const url = window.prompt('URL do link (vazio remove):', current);
    if (url === null) {
      return;
    }
    if (url.trim() === '') {
      this.editor.chain().focus().unsetLink().run();
    } else {
      this.editor.chain().focus().setLink({ href: url.trim() }).run();
    }
  }

  private createEditor(): void {
    this.editor = new Editor({
      element: this.host().nativeElement,
      extensions: [
        StarterKit.configure({
          link: { openOnClick: false },
          heading: { levels: [2, 3, 4] },
        }),
        Image,
        TableKit.configure({ table: { resizable: false } }),
        Placeholder.configure({ placeholder: 'Escreva o conteúdo da publicação…' }),
        Markdown.configure({
          html: false,
          transformPastedText: true,
          transformCopiedText: true,
        }),
      ],
      editorProps: {
        // Reusa a tipografia .markdown-body do portal (já com dark mode).
        attributes: { class: 'markdown-body min-h-80 px-4 py-3 focus:outline-none' },
        handlePaste: (_view, event) => this.uploadFromEvent(event.clipboardData?.files),
        handleDrop: (_view, event) => this.uploadFromEvent(event.dataTransfer?.files),
      },
      onUpdate: ({ editor }) => {
        const markdown = this.markdownOf(editor);
        this.lastEmitted = markdown;
        this.valueChange.emit(markdown);
      },
      onTransaction: ({ editor }) => this.refreshState(editor),
    });
    // Conteúdo inicial (edição de post existente carregada antes da view).
    const initial = this.value();
    if (initial) {
      this.lastEmitted = initial;
      this.editor.commands.setContent(initial, { emitUpdate: false });
    }
  }

  private markdownOf(editor: Editor): string {
    const storage = editor.storage as unknown as { markdown: { getMarkdown(): string } };
    return storage.markdown.getMarkdown();
  }

  private refreshState(editor: Editor): void {
    this.state.set({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      strike: editor.isActive('strike'),
      h2: editor.isActive('heading', { level: 2 }),
      h3: editor.isActive('heading', { level: 3 }),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      blockquote: editor.isActive('blockquote'),
      code: editor.isActive('code'),
      codeBlock: editor.isActive('codeBlock'),
      link: editor.isActive('link'),
      table: editor.isActive('table'),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    });
  }

  /** Upload de imagem colada/arrastada; retorna true para impedir o tratamento padrão. */
  private uploadFromEvent(files: FileList | null | undefined): boolean {
    if (!this.allowImages()) {
      return false;
    }
    const file = Array.from(files ?? []).find((f) => f.type.startsWith('image/'));
    if (!file) {
      return false;
    }
    this.uploading.set(true);
    this.uploadError.set(null);
    this.media.upload(file).subscribe({
      next: (res) => {
        this.uploading.set(false);
        this.insertImage(res.url, file.name);
      },
      error: () => {
        this.uploadError.set('Falha ao enviar a imagem.');
        this.uploading.set(false);
      },
    });
    return true;
  }
}
