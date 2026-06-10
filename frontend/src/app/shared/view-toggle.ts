import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ViewMode } from './view-mode';

/** Alternância mosaico/lista usada nas listagens de publicações e mídias. */
@Component({
  selector: 'app-view-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex rounded-lg border border-gray-300 p-0.5 dark:border-gray-700"
      role="group"
      aria-label="Modo de visualização"
    >
      <button
        type="button"
        (click)="modeChange.emit('mosaic')"
        [attr.aria-pressed]="mode() === 'mosaic'"
        aria-label="Ver em mosaico"
        title="Mosaico"
        class="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        [class]="
          mode() === 'mosaic'
            ? 'bg-indigo-600 text-white dark:bg-indigo-500'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
        "
      >
        <span class="material-icons text-[18px]" aria-hidden="true">grid_view</span>
      </button>
      <button
        type="button"
        (click)="modeChange.emit('list')"
        [attr.aria-pressed]="mode() === 'list'"
        aria-label="Ver em lista"
        title="Lista"
        class="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        [class]="
          mode() === 'list'
            ? 'bg-indigo-600 text-white dark:bg-indigo-500'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
        "
      >
        <span class="material-icons text-[18px]" aria-hidden="true">view_list</span>
      </button>
    </div>
  `,
})
export class ViewToggle {
  readonly mode = input.required<ViewMode>();
  readonly modeChange = output<ViewMode>();
}
