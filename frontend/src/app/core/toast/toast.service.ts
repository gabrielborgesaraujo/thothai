import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  text: string;
}

/** Feedback visual global (toasts), exibido pelo container no componente raiz. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly list = signal<Toast[]>([]);
  private nextId = 1;

  readonly toasts = this.list.asReadonly();

  success(text: string): void {
    this.push('success', text);
  }

  error(text: string): void {
    this.push('error', text);
  }

  info(text: string): void {
    this.push('info', text);
  }

  dismiss(id: number): void {
    this.list.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  private push(type: ToastType, text: string): void {
    const toast: Toast = { id: this.nextId++, type, text };
    this.list.update((toasts) => [...toasts, toast]);
    // Erros ficam um pouco mais para dar tempo de ler.
    setTimeout(() => this.dismiss(toast.id), type === 'error' ? 6000 : 4000);
  }
}
