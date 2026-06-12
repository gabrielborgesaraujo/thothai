import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/toast/toast.service';

/** Redefinição de senha com o token recebido por e-mail (30 minutos, uso único). */
@Component({
  selector: 'app-reset-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md py-8">
      <h1 class="text-2xl font-bold tracking-tight">Definir nova senha</h1>
      <p class="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">
        Escolha a nova senha de acesso da sua conta.
      </p>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error()) {
        <p
          class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
          role="alert"
        >
          {{ error() }}
        </p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-2">
        <mat-form-field appearance="outline">
          <mat-label>Nova senha</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password" />
          @if (form.controls.password.hasError('required')) {
            <mat-error>Campo obrigatório.</mat-error>
          } @else if (form.controls.password.hasError('minlength')) {
            <mat-error>Mínimo de 8 caracteres.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Confirmar nova senha</mat-label>
          <input matInput type="password" formControlName="confirm" autocomplete="new-password" />
          @if (form.controls.confirm.hasError('required')) {
            <mat-error>Campo obrigatório.</mat-error>
          }
        </mat-form-field>
        <button matButton="filled" type="submit" class="mt-2" [disabled]="loading()">
          {{ loading() ? 'Salvando…' : 'Redefinir senha' }}
        </button>
        <a
          routerLink="/recuperar-senha"
          class="mt-2 text-center text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >Pedir um novo link</a
        >
      </form>
    </div>
  `,
})
export class ResetPassword {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  protected readonly form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', Validators.required],
  });

  constructor() {
    inject(Title).setTitle('Definir nova senha — ThothAI');
    // Materializa o cookie XSRF-TOKEN antes do POST (mesmo motivo do login).
    this.auth.fetchSession().subscribe();
    if (!this.token) {
      this.error.set('Link inválido — peça uma nova redefinição.');
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.loading() || !this.token) {
      this.form.markAllAsTouched();
      return;
    }
    const { password, confirm } = this.form.getRawValue();
    if (password !== confirm) {
      this.error.set('As senhas não coincidem.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.confirmPasswordReset(this.token, password).subscribe({
      next: () => {
        this.toast.success('Senha redefinida! Entre com a nova senha.');
        this.router.navigate(['/admin/login']);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.error.set(err?.error?.detail ?? 'Link inválido ou expirado — peça uma nova redefinição.');
        this.loading.set(false);
      },
    });
  }
}
