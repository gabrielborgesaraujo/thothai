import { Pipe, PipeTransform } from '@angular/core';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/common';

/** Instância única com syntax highlighting (linguagens comuns do highlight.js). */
const renderer = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code: string, lang: string): string {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  }),
);

/**
 * Converte Markdown em HTML (corpo das postagens), com realce de sintaxe nos blocos de código.
 * É isomórfico (roda no SSR). A saída deve ser ligada via `[innerHTML]`, que o sanitizador do
 * Angular trata por padrão — por isso nada de `bypassSecurityTrust`.
 */
@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    return renderer.parse(value, { async: false, gfm: true }) as string;
  }
}
