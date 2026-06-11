import { ChangeDetectionStrategy, Component, computed, DOCUMENT, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LinkedInAppStatus, SocialService } from '../../../core/social/social.service';

/**
 * Integrações MACRO da plataforma (admin do sistema): credenciais do app LinkedIn,
 * compartilhadas por todos os publicadores — cada um conecta a própria conta em Integrações.
 */
@Component({
  selector: 'app-system-integrations',
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
    <h1 class="mb-1 text-2xl font-semibold tracking-tight">Integrações do sistema</h1>
    <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
      Configurações macro da plataforma, compartilhadas por todos os publicadores.
    </p>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    <section class="max-w-2xl rounded-xl border border-gray-200 p-5 dark:border-gray-800">
      <div class="mb-1 flex items-center justify-between gap-2">
        <h2 class="inline-flex items-center gap-2 font-medium">
          <mat-icon class="text-indigo-500">share</mat-icon>
          App LinkedIn da plataforma
        </h2>
        <span
          class="rounded-full px-2.5 py-0.5 text-xs font-medium"
          [class]="
            app()?.configured
              ? 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          "
          >{{ app()?.configured ? 'Configurado' : 'Não configurado' }}</span
        >
      </div>
      <p class="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Crie um app em <code class="font-mono">developers.linkedin.com</code> com os produtos
        "Share on LinkedIn" e "Sign In with LinkedIn using OpenID Connect", cadastre a redirect URL
        <code class="font-mono">{{ callbackUrl() }}</code> e informe as credenciais.
        @if (app()?.clientIdHint; as hint) {
          Client ID atual: <code class="font-mono">{{ hint }}</code
          >.
        }
      </p>

      @if (message(); as msg) {
        <p
          class="mb-3 rounded-lg px-3 py-2 text-sm"
          [class]="
            msg.ok
              ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300'
              : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
          "
          role="status"
        >
          {{ msg.text }}
        </p>
      }

      <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-2 sm:flex-row sm:items-start">
        <mat-form-field appearance="outline" class="flex-1">
          <mat-label>Client ID</mat-label>
          <input matInput formControlName="clientId" autocomplete="off" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="flex-1">
          <mat-label>Client Secret</mat-label>
          <input matInput type="password" formControlName="clientSecret" autocomplete="off" />
        </mat-form-field>
        <button matButton="filled" type="submit" class="sm:mt-2" [disabled]="saving()">Salvar</button>
      </form>
    </section>
  `,
})
export class SystemIntegrations {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly social = inject(SocialService);
  private readonly document = inject(DOCUMENT);

  protected readonly app = signal<LinkedInAppStatus | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);

  protected readonly callbackUrl = computed(
    () => `${this.document.location?.origin ?? ''}/api/admin/social/linkedin/callback`,
  );

  protected readonly form = this.fb.group({
    clientId: ['', Validators.required],
    clientSecret: ['', Validators.required],
  });

  constructor() {
    this.social.linkedInAppStatus().subscribe({
      next: (app) => {
        this.app.set(app);
        this.loading.set(false);
      },
      error: () => {
        this.message.set({ ok: false, text: 'Falha ao carregar a integração.' });
        this.loading.set(false);
      },
    });
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.message.set(null);
    this.social.saveLinkedInApp(raw.clientId.trim(), raw.clientSecret.trim()).subscribe({
      next: (app) => {
        this.app.set(app);
        this.form.reset({ clientId: '', clientSecret: '' });
        this.saving.set(false);
        this.message.set({ ok: true, text: 'Credenciais do app salvas.' });
      },
      error: () => {
        this.saving.set(false);
        this.message.set({ ok: false, text: 'Falha ao salvar as credenciais.' });
      },
    });
  }
}
