import { afterNextRender, inject, PLATFORM_ID, signal, Signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ViewMode = 'mosaic' | 'list';

export interface PersistedViewMode {
  readonly mode: Signal<ViewMode>;
  set(value: ViewMode): void;
}

/**
 * Modo de visualização (mosaico/lista) persistido em localStorage. SSR-safe: o servidor renderiza
 * o padrão e o valor salvo é aplicado após a hidratação (evita mismatch de markup).
 * Deve ser chamado em contexto de injeção (ex.: inicializador de campo do componente).
 */
export function persistedViewMode(storageKey: string, initial: ViewMode): PersistedViewMode {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const mode = signal<ViewMode>(initial);

  if (isBrowser) {
    afterNextRender(() => {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'mosaic' || saved === 'list') {
        mode.set(saved);
      }
    });
  }

  return {
    mode: mode.asReadonly(),
    set(value: ViewMode): void {
      mode.set(value);
      if (isBrowser) {
        try {
          localStorage.setItem(storageKey, value);
        } catch {
          // Armazenamento indisponível — o modo só não persiste.
        }
      }
    },
  };
}
