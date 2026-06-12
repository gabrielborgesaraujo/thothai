import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/auth/auth.service';

/** Pedido do link de redefinição de senha (enviado ao e-mail de cadastro, válido por 30 min). */
@Component({
  selector: 'app-forgot-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md py-8">
      @if (sent()) {
        <div
          class="rounded-2xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-500/10"
        >
          <mat-icon class="text-4xl! text-green-600 dark:text-green-400">mark_email_read</mat-icon>
          <h1 class="mt-3 text-xl font-semibold">Verifique seu e-mail</h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Se a conta existir, enviamos um link de redefinição para o e-mail de cadastro.
            Ele vale por <strong>30 minutos</strong>.
          </p>
          <a
            routerLink="/admin/login"
            class="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >← Voltar ao login</a
          >
        </div>
      } @else {
        <h1 class="text-2xl font-bold tracking-tight">Recuperar senha</h1>
        <p class="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">
          Informe seu usuário ou e-mail de cadastro — enviaremos um link para redefinir a senha.
        </p>

        @if (loading()) {
          <mat-progress-bar mode="indeterminate" />
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-2">
          <mat-form-field appearance="outline">
            <mat-label>Usuário ou e-mail</mat-label>
            <input matInput formControlName="identifier" autocomplete="username" />
            @if (form.controls.identifier.hasError('required')) {
              <mat-error>Campo obrigatório.</mat-error>
            }
          </mat-form-field>
          <button matButton="filled" type="submit" class="mt-2" [disabled]="loading()">
            {{ loading() ? 'Enviando…' : 'Enviar link de redefinição' }}
          </button>
          <a
            routerLink="/admin/login"
            class="mt-2 text-center text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >← Voltar ao login</a
          >
        </form>
      }
    </div>
  `,
})
export class ForgotPassword {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly sent = signal(false);

  protected readonly form = this.fb.group({
    identifier: ['', Validators.required],
  });

  constructor() {
    inject(Title).setTitle('Recuperar senha — ThothAI');
    // Materializa o cookie XSRF-TOKEN antes do POST (mesmo motivo do login).
    this.auth.fetchSession().subscribe();
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.requestPasswordReset(this.form.getRawValue().identifier.trim()).subscribe({
      // Sempre "enviado" — o servidor não revela se a conta existe.
      next: () => this.sent.set(true),
      error: () => this.sent.set(true),
    });
  }
}
