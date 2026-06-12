import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/auth/auth.service';
import { AccountInfo } from '../../../core/auth/auth.models';
import { ToastService } from '../../../core/toast/toast.service';

/** Conta do usuário: dados de cadastro (e-mail) e troca de senha (RF01). */
@Component({
  selector: 'app-account',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-md">
      <h1 class="mb-4 text-2xl font-semibold tracking-tight">Conta</h1>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }

      <!-- Dados da conta -->
      <section class="mb-8 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
        <h2 class="mb-3 inline-flex items-center gap-2 font-medium">
          <mat-icon class="text-indigo-500">badge</mat-icon>
          Dados da conta
        </h2>
        @if (info(); as account) {
          <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Usuário <strong>{{ account.username }}</strong> · hub público
            <a
              [href]="'/' + account.handle"
              target="_blank"
              rel="noopener"
              class="text-indigo-600 hover:underline dark:text-indigo-400"
              >/{{ account.handle }}</a
            >
          </p>
        }
        <form [formGroup]="emailForm" (ngSubmit)="saveEmail()" class="flex flex-col gap-2">
          <mat-form-field appearance="outline">
            <mat-label>E-mail de cadastro</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            <mat-hint>Destino do link de redefinição de senha.</mat-hint>
            @if (emailForm.controls.email.hasError('required')) {
              <mat-error>Campo obrigatório.</mat-error>
            } @else if (emailForm.controls.email.hasError('email')) {
              <mat-error>E-mail inválido.</mat-error>
            }
          </mat-form-field>
          <div>
            <button matButton="filled" type="submit" [disabled]="savingEmail()">Salvar dados</button>
          </div>
        </form>
      </section>

      <!-- Troca de senha -->
      <section class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
        <h2 class="mb-3 inline-flex items-center gap-2 font-medium">
          <mat-icon class="text-indigo-500">lock_reset</mat-icon>
          Alterar senha
        </h2>
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-2">
          <mat-form-field appearance="outline">
            <mat-label>Senha atual</mat-label>
            <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" />
            @if (form.controls.currentPassword.hasError('required')) {
              <mat-error>Campo obrigatório.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nova senha</mat-label>
            <input matInput type="password" formControlName="newPassword" autocomplete="new-password" />
            <mat-hint>Mínimo de 8 caracteres.</mat-hint>
            @if (form.controls.newPassword.hasError('required')) {
              <mat-error>Campo obrigatório.</mat-error>
            } @else if (form.controls.newPassword.hasError('minlength')) {
              <mat-error>Mínimo de 8 caracteres.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Confirmar nova senha</mat-label>
            <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password" />
            @if (form.controls.confirmPassword.hasError('required')) {
              <mat-error>Campo obrigatório.</mat-error>
            }
          </mat-form-field>
          <div>
            <button matButton="filled" type="submit" [disabled]="loading()">Alterar senha</button>
          </div>
        </form>
      </section>
    </div>
  `,
})
export class Account {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  protected readonly savingEmail = signal(false);
  protected readonly info = signal<AccountInfo | null>(null);

  protected readonly emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  constructor() {
    this.auth.accountInfo().subscribe({
      next: (account) => {
        this.info.set(account);
        this.emailForm.patchValue({ email: account.email ?? '' });
      },
      error: () => this.toast.error('Falha ao carregar os dados da conta.'),
    });
  }

  protected saveEmail(): void {
    if (this.emailForm.invalid || this.savingEmail()) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.savingEmail.set(true);
    this.auth.updateAccount(this.emailForm.getRawValue().email.trim()).subscribe({
      next: (account) => {
        this.info.set(account);
        this.savingEmail.set(false);
        this.toast.success('Dados da conta atualizados.');
      },
      error: (err: { error?: { detail?: string } }) => {
        this.savingEmail.set(false);
        this.toast.error(err?.error?.detail ?? 'Falha ao salvar os dados da conta.');
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.toast.error('As senhas não coincidem.');
      return;
    }
    this.loading.set(true);
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.form.reset();
        this.toast.success('Senha alterada com sucesso.');
      },
      error: (err: { status?: number }) => {
        this.loading.set(false);
        this.toast.error(err?.status === 400 ? 'Senha atual incorreta.' : 'Falha ao alterar a senha.');
      },
    });
  }
}
