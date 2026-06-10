import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/auth/auth.service';

/** Troca de senha do admin (RF01). */
@Component({
  selector: 'app-account',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-md">
      <h1 class="text-2xl font-semibold tracking-tight mb-4">Conta</h1>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error()) {
        <p class="text-sm text-red-600 dark:text-red-400 my-2" role="alert">{{ error() }}</p>
      }
      @if (saved()) {
        <p class="text-sm text-green-700 dark:text-green-400 my-2" role="status">Senha alterada.</p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-3 pt-2">
        <mat-form-field appearance="outline">
          <mat-label>Senha atual</mat-label>
          <input
            matInput
            type="password"
            formControlName="currentPassword"
            autocomplete="current-password"
          />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Nova senha</mat-label>
          <input
            matInput
            type="password"
            formControlName="newPassword"
            autocomplete="new-password"
          />
          <mat-hint>Mínimo de 8 caracteres.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Confirmar nova senha</mat-label>
          <input
            matInput
            type="password"
            formControlName="confirmPassword"
            autocomplete="new-password"
          />
        </mat-form-field>
        <div>
          <button matButton="filled" type="submit" [disabled]="loading()">Alterar senha</button>
        </div>
      </form>
    </div>
  `,
})
export class Account {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal(false);

  protected readonly form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }
    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.error.set('As senhas não coincidem.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.saved.set(false);
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.saved.set(true);
        this.loading.set(false);
        this.form.reset();
      },
      error: (err: { status?: number }) => {
        this.error.set(
          err?.status === 400 ? 'Senha atual incorreta.' : 'Falha ao alterar a senha.',
        );
        this.loading.set(false);
      },
    });
  }
}
