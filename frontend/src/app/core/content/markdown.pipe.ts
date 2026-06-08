import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

/**
 * Converte Markdown em HTML (corpo das postagens). É isomórfico (roda no SSR via `marked`).
 * A saída deve ser ligada via `[innerHTML]`, que o sanitizador do Angular trata por padrão —
 * por isso nada de `bypassSecurityTrust`.
 */
@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    return marked.parse(value, { async: false, gfm: true }) as string;
  }
}
