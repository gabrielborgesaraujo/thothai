import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from 'tiptap-markdown';

/**
 * Garante que a configuração TipTap usada pelo MarkdownEditor lê e reescreve Markdown sem perder
 * conteúdo — o corpo persistido continua sendo Markdown (portal SSR, IA e RSS dependem disso).
 */
describe('TipTap markdown roundtrip', () => {
  let editor: Editor | null = null;

  beforeAll(() => {
    // O ProseMirror consulta APIs de layout que o DOM de teste não implementa.
    const rect = {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      toJSON: () => ({}),
    } as DOMRect;
    Range.prototype.getBoundingClientRect = () => rect;
    Range.prototype.getClientRects = () =>
      ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
    Element.prototype.getClientRects = Range.prototype.getClientRects;
  });

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  function markdownOf(instance: Editor): string {
    return (
      instance.storage as unknown as { markdown: { getMarkdown(): string } }
    ).markdown.getMarkdown();
  }

  function createEditor(markdown: string): Editor {
    const host = document.createElement('div');
    document.body.appendChild(host);
    editor = new Editor({
      element: host,
      extensions: [
        StarterKit.configure({ link: { openOnClick: false }, heading: { levels: [2, 3, 4] } }),
        Image,
        TableKit.configure({ table: { resizable: false } }),
        Markdown.configure({ html: false }),
      ],
      content: markdown,
    });
    return editor;
  }

  it('preserva títulos, ênfases, listas, código, link e imagem', () => {
    const source = [
      '## Título',
      '',
      'Um **negrito**, um *itálico* e um `código`.',
      '',
      '- item um',
      '- item dois',
      '',
      '```',
      'const x = 1;',
      '```',
      '',
      '[ThothAI](https://example.com)',
      '',
      '![diagrama](http://localhost:9000/m/d.png)',
    ].join('\n');

    const out = markdownOf(createEditor(source));

    expect(out).toContain('## Título');
    expect(out).toContain('**negrito**');
    expect(out).toContain('*itálico*');
    expect(out).toContain('`código`');
    expect(out).toContain('- item um');
    expect(out).toContain('const x = 1;');
    expect(out).toContain('[ThothAI](https://example.com)');
    expect(out).toContain('![diagrama](http://localhost:9000/m/d.png)');
  });

  it('roundtrip é estável (reimportar o resultado não muda nada)', () => {
    const source = '## Post\n\nTexto com **negrito** e uma lista:\n\n- a\n- b';
    const first = markdownOf(createEditor(source));
    editor?.destroy();
    const second = markdownOf(createEditor(first));
    expect(second).toBe(first);
  });

  it('edição programática produz Markdown válido (undo/redo funcional)', () => {
    const instance = createEditor('Início');
    instance.chain().focus().selectAll().toggleBold().run();
    expect(markdownOf(instance)).toBe('**Início**');

    instance.chain().undo().run();
    expect(markdownOf(instance)).toBe('Início');

    instance.chain().redo().run();
    expect(markdownOf(instance)).toBe('**Início**');
  });
});
