import { describe, expect, it } from 'vitest';
import { MarkdownPipe } from './markdown.pipe';

describe('MarkdownPipe', () => {
  const pipe = new MarkdownPipe();

  it('converte Markdown em HTML', () => {
    expect(pipe.transform('# Título')).toContain('<h1');
    expect(pipe.transform('**forte**')).toContain('<strong>forte</strong>');
  });

  it('retorna string vazia para valores nulos ou vazios', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('renderiza blocos de código', () => {
    expect(pipe.transform('```\ncode\n```')).toContain('<pre>');
  });
});
