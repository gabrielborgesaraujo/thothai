import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeToggle } from '../../../core/theme/theme-toggle';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    ThemeToggle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative grid min-h-dvh place-items-center bg-gradient-to-br from-indigo-50 via-white to-gray-100 p-4 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950"
    >
      <div class="absolute top-4 right-4">
        <app-theme-toggle />
      </div>

      <div class="w-full max-w-sm">
        <div class="mb-6 text-center">
          <a routerLink="/" class="text-3xl font-bold tracking-tight">
            Thoth<span class="text-indigo-600 dark:text-indigo-400">AI</span>
          </a>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Seu hub de conteúdo e identidade digital
          </p>
        </div>

        <div
          class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-200/60 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/30"
        >
          @if (loading()) {
            <mat-progress-bar mode="indeterminate" />
          }
          <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-2 p-6">
            <h1 class="mb-3 text-lg font-semibold">Entrar no painel</h1>

            <mat-form-field appearance="outline">
              <mat-label>Usuário</mat-label>
              <mat-icon matPrefix class="text-gray-400">person</mat-icon>
              <input matInput formControlName="username" autocomplete="username" />
              @if (form.controls.username.hasError('required')) {
                <mat-error>Campo obrigatório.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Senha</mat-label>
              <mat-icon matPrefix class="text-gray-400">lock</mat-icon>
              <input
                matInput
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
              />
              <button
                matIconButton
                matSuffix
                type="button"
                (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="showPassword() ? 'Ocultar senha' : 'Mostrar senha'"
                [attr.aria-pressed]="showPassword()"
              >
                <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.controls.password.hasError('required')) {
                <mat-error>Campo obrigatório.</mat-error>
              }
            </mat-form-field>
            <a
              routerLink="/recuperar-senha"
              class="-mt-1 mb-1 text-right text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
              >Esqueci minha senha</a
            >

            @if (error()) {
              <p
                class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
                role="alert"
              >
                {{ error() }}
              </p>
            }

            <button matButton="filled" type="submit" class="mt-2 w-full" [disabled]="loading()">
              {{ loading() ? 'Entrando…' : 'Entrar' }}
            </button>
          </form>
        </div>

        <p class="mt-6 flex items-center justify-center gap-4 text-center">
          <a
            routerLink="/"
            class="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <mat-icon class="text-[16px]!">arrow_back</mat-icon>
            Voltar ao site
          </a>
          <a
            routerLink="/registro"
            class="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >Criar meu hub</a
          >
        </p>
      </div>
    </div>
  `,
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  constructor() {
    // Materializa o cookie XSRF-TOKEN antes do POST de login: o backend o emite em qualquer
    // requisição, e o Angular precisa lê-lo para enviar o header X-XSRF-TOKEN (senão o POST dá 403).
    this.auth.fetchSession().subscribe();
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => this.router.navigate(['/admin']),
      error: (err: { status?: number; error?: { detail?: string } }) => {
        this.error.set(
          err?.status === 429
            ? 'Muitas tentativas. Tente novamente em alguns minutos.'
            : err?.status === 403
              ? (err?.error?.detail ?? 'Cadastro aguardando aprovação ou desativado.')
              : 'Usuário ou senha inválidos.',
        );
        this.loading.set(false);
      },
    });
  }
}
