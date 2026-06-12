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

/** Auto-registro de publicador (Fase 2): o cadastro entra na fila de aprovação do admin. */
@Component({
  selector: 'app-register',
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
      @if (done()) {
        <div class="rounded-2xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-500/10">
          <mat-icon class="text-4xl! text-green-600 dark:text-green-400">how_to_reg</mat-icon>
          <h1 class="mt-3 text-xl font-semibold">Cadastro enviado!</h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Seu hub <strong>/{{ form.controls.handle.value }}</strong> será liberado assim que o
            administrador aprovar o cadastro. Você receberá acesso pelo login.
          </p>
          <a routerLink="/" class="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">← Voltar ao início</a>
        </div>
      } @else {
        <h1 class="text-2xl font-bold tracking-tight">Criar meu hub</h1>
        <p class="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">
          Cadastre-se para ter seu espaço de currículo, portfólio e publicações. O acesso é
          liberado após a aprovação do administrador.
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
            <mat-label>Usuário (login)</mat-label>
            <input matInput formControlName="username" autocomplete="username" />
            <mat-hint>3–30 caracteres: letras minúsculas, números e hífen.</mat-hint>
            @if (form.controls.username.hasError('required')) {
              <mat-error>Campo obrigatório.</mat-error>
            } @else if (form.controls.username.hasError('pattern')) {
              <mat-error>Use 3–30 caracteres: letras minúsculas, números e hífen.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>E-mail</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            <mat-hint>Usado para recuperar o acesso à conta.</mat-hint>
            @if (form.controls.email.hasError('required')) {
              <mat-error>Campo obrigatório.</mat-error>
            } @else if (form.controls.email.hasError('email')) {
              <mat-error>E-mail inválido.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Endereço público</mat-label>
            <span matTextPrefix class="text-gray-400">/</span>
            <input matInput formControlName="handle" autocomplete="off" />
            @if (form.controls.handle.hasError('required')) {
              <mat-error>Campo obrigatório.</mat-error>
            } @else if (form.controls.handle.hasError('pattern')) {
              <mat-error>Use 3–30 caracteres: letras minúsculas, números e hífen.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Senha</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="new-password" />
            <mat-hint>Mínimo de 8 caracteres.</mat-hint>
            @if (form.controls.password.hasError('required')) {
              <mat-error>Campo obrigatório.</mat-error>
            } @else if (form.controls.password.hasError('minlength')) {
              <mat-error>Mínimo de 8 caracteres.</mat-error>
            }
          </mat-form-field>
          <button matButton="filled" type="submit" class="mt-2" [disabled]="loading()">
            {{ loading() ? 'Enviando…' : 'Cadastrar' }}
          </button>
          <a routerLink="/admin/login" class="mt-2 text-center text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">Já tenho conta — entrar</a>
        </form>
      }
    </div>
  `,
})
export class Register {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]{3,30}$/)]],
    email: ['', [Validators.required, Validators.email]],
    handle: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]{3,30}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    // Materializa o cookie XSRF-TOKEN antes do POST de registro (mesmo motivo do login).
    this.auth.fetchSession().subscribe();
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.done.set(true);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.error.set(err?.error?.detail ?? 'Falha ao enviar o cadastro.');
        this.loading.set(false);
      },
    });
  }
}
