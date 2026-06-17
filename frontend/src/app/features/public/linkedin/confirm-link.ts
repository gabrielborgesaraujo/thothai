import { afterNextRender, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/auth/auth.service';

/** Confirma o vínculo da conta com o LinkedIn pelo token recebido por e-mail (30 minutos, uso único). */
@Component({
  selector: 'app-confirm-linkedin-link',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md py-10 text-center">
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
        <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">Confirmando o vínculo…</p>
      } @else if (done()) {
        <div class="rounded-2xl border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-500/10">
          <mat-icon class="text-4xl! text-green-600 dark:text-green-400">link</mat-icon>
          <h1 class="mt-3 text-xl font-semibold">Vínculo confirmado!</h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Sua conta agora está vinculada ao LinkedIn. Você já pode entrar com o LinkedIn.
          </p>
          <a routerLink="/admin/login" matButton="filled" class="mt-4 inline-block">Ir para o login</a>
        </div>
      } @else {
        <div class="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-500/10">
          <mat-icon class="text-4xl! text-red-600 dark:text-red-400">link_off</mat-icon>
          <h1 class="mt-3 text-xl font-semibold">Não foi possível confirmar</h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{{ error() }}</p>
          <a routerLink="/admin/login" class="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >Voltar ao login</a
          >
        </div>
      }
    </div>
  `,
})
export class ConfirmLinkedInLink {
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly done = signal(false);
  protected readonly error = signal('Link inválido ou expirado — refaça o vínculo pelo painel.');

  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  constructor() {
    inject(Title).setTitle('Vincular LinkedIn — ThothAI');
    // Só confirma no navegador: o POST depende do cookie XSRF-TOKEN e não deve rodar no SSR.
    afterNextRender(() => this.auth.fetchSession().subscribe(() => this.confirm()));
  }

  private confirm(): void {
    if (!this.token) {
      this.loading.set(false);
      return;
    }
    this.auth.confirmLinkedInLink(this.token).subscribe({
      next: () => {
        this.done.set(true);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.error.set(err?.error?.detail ?? this.error());
        this.loading.set(false);
      },
    });
  }
}
