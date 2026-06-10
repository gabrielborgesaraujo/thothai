import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from './theme.service';

/** Botão de alternância de tema claro/escuro, usado nos cabeçalhos público e admin. */
@Component({
  selector: 'app-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      (click)="theme.toggle()"
      class="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
      [attr.aria-label]="theme.theme() === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
    >
      <span class="material-icons text-[20px]" aria-hidden="true">
        {{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}
      </span>
    </button>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
}
