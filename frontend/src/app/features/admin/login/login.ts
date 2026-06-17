import { ChangeDetectionStrategy, Component, DOCUMENT, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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

            @if (info(); as msg) {
              <p
                class="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                role="status"
              >
                {{ msg }}
              </p>
            }
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

            <div class="my-2 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
              <span class="h-px flex-1 bg-gray-200 dark:bg-gray-800"></span>
              ou
              <span class="h-px flex-1 bg-gray-200 dark:bg-gray-800"></span>
            </div>

            <button
              type="button"
              (click)="loginWithLinkedIn()"
              [disabled]="linkedInBusy()"
              class="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0a66c2] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#004182] disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/>
              </svg>
              Entrar com LinkedIn
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
  private readonly document = inject(DOCUMENT);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly info = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly linkedInBusy = signal(false);

  protected readonly form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  constructor() {
    // Materializa o cookie XSRF-TOKEN antes do POST de login: o backend o emite em qualquer
    // requisição, e o Angular precisa lê-lo para enviar o header X-XSRF-TOKEN (senão o POST dá 403).
    this.auth.fetchSession().subscribe();
    // Mensagens de retorno do fluxo de login com LinkedIn (?linkedin=…).
    const result = inject(ActivatedRoute).snapshot.queryParamMap.get('linkedin');
    switch (result) {
      case 'pending':
        this.info.set(
          'Conta criada ou aguardando aprovação do administrador. Você poderá entrar com o LinkedIn assim que for aprovada.',
        );
        break;
      case 'verify':
        this.info.set(
          'Enviamos um e-mail para confirmar o vínculo da sua conta com o LinkedIn. Confirme pelo link e entre novamente.',
        );
        break;
      case 'disabled':
        this.error.set('Sua conta está desativada — fale com o administrador.');
        break;
      case 'error':
        this.error.set('Não foi possível entrar com o LinkedIn. Tente novamente.');
        break;
    }
  }

  /** Inicia o login com LinkedIn: redireciona o navegador para a autorização OAuth. */
  protected loginWithLinkedIn(): void {
    if (this.linkedInBusy()) {
      return;
    }
    this.linkedInBusy.set(true);
    this.error.set(null);
    this.auth.linkedInLoginUrl().subscribe({
      next: ({ url }) => (this.document.location.href = url),
      error: () => {
        this.linkedInBusy.set(false);
        this.error.set('Login com LinkedIn indisponível — verifique a configuração com o administrador.');
      },
    });
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
