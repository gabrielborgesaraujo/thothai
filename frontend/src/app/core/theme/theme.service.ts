import { DOCUMENT, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'thothai-theme';

/**
 * Tema claro/escuro da aplicação. A classe `dark` no <html> ativa a variante `dark:` do Tailwind
 * e o `color-scheme: dark` (que rege as cores M3 do Angular Material via light-dark()).
 *
 * O estado inicial é decidido por um script inline no index.html (anti-FOUC) a partir do
 * localStorage ou do prefers-color-scheme; aqui apenas o lemos de volta — em SSR fica 'light',
 * sem tocar em APIs de navegador.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly theme = signal<Theme>('light');

  constructor() {
    if (this.isBrowser && this.document.documentElement.classList.contains('dark')) {
      this.theme.set('dark');
    }
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.document.documentElement.classList.toggle('dark', next === 'dark');
    if (this.isBrowser) {
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Armazenamento indisponível (modo privado etc.) — o tema só não persiste.
      }
    }
  }
}
