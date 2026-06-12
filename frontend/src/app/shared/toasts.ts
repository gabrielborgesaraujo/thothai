import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Toast, ToastService } from '../core/toast/toast.service';

const STYLES: Record<Toast['type'], { classes: string; icon: string }> = {
  success: {
    classes: 'border-green-200 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-950 dark:text-green-200',
    icon: 'check_circle',
  },
  error: {
    classes: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-950 dark:text-red-200',
    icon: 'error',
  },
  info: {
    classes: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-950 dark:text-indigo-200',
    icon: 'info',
  },
};

/** Pilha de toasts global (feedback das interações do usuário). */
@Component({
  selector: 'app-toasts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none fixed right-4 bottom-4 z-100 flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg"
          [class]="style(toast).classes"
          role="status"
        >
          <span class="material-icons mt-0.5 text-[18px]" aria-hidden="true">{{
            style(toast).icon
          }}</span>
          <span class="min-w-0 flex-1">{{ toast.text }}</span>
          <button
            type="button"
            (click)="toastService.dismiss(toast.id)"
            class="opacity-60 transition-opacity hover:opacity-100"
            aria-label="Fechar aviso"
          >
            <span class="material-icons text-[16px]" aria-hidden="true">close</span>
          </button>
        </div>
      }
    </div>
  `,
})
export class Toasts {
  protected readonly toastService = inject(ToastService);

  protected style(toast: Toast): { classes: string; icon: string } {
    return STYLES[toast.type];
  }
}
