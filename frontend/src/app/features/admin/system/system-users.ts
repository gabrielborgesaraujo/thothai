import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ApiService } from '../../../core/api.service';
import { UserRole } from '../../../core/auth/auth.models';

type UserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED';

interface SystemUser {
  id: string;
  username: string;
  handle: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string | null;
}

const STATUS_BADGES: Record<UserStatus, { label: string; classes: string }> = {
  PENDING: {
    label: 'Aguardando aprovação',
    classes: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  ACTIVE: {
    label: 'Ativo',
    classes: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  },
  DISABLED: {
    label: 'Desativado',
    classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
};

/** Gestão de publicadores pelo administrador do sistema: criar, aprovar e desativar. */
@Component({
  selector: 'app-system-users',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-1 text-2xl font-semibold tracking-tight">Usuários da plataforma</h1>
    <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
      Cada publicador tem seu hub em <code class="font-mono">/handle</code> e gere o próprio
      conteúdo e as próprias chaves. Auto-registros entram aguardando sua aprovação.
    </p>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    @if (error()) {
      <p class="my-2 text-sm text-red-600 dark:text-red-400" role="alert">{{ error() }}</p>
    }

    <!-- Criar publicador (já nasce ativo) -->
    <form
      [formGroup]="form"
      (ngSubmit)="create()"
      class="mb-6 flex flex-col gap-2 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-start dark:border-gray-800"
    >
      <mat-form-field appearance="outline" class="flex-1">
        <mat-label>Usuário (login)</mat-label>
        <input matInput formControlName="username" autocomplete="off" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="flex-1">
        <mat-label>Handle (/endereço)</mat-label>
        <input matInput formControlName="handle" autocomplete="off" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="flex-1">
        <mat-label>Senha inicial</mat-label>
        <input matInput type="password" formControlName="password" autocomplete="new-password" />
      </mat-form-field>
      <button matButton="filled" type="submit" class="sm:mt-2" [disabled]="saving()">
        <mat-icon>person_add</mat-icon>
        Criar
      </button>
    </form>

    @if (users(); as list) {
      <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table class="w-full text-sm">
          <thead>
            <tr
              class="border-b border-gray-200 text-left text-xs text-gray-500 uppercase dark:border-gray-800 dark:text-gray-400"
            >
              <th class="px-4 py-3 font-medium">Usuário</th>
              <th class="px-4 py-3 font-medium">Hub</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="hidden px-4 py-3 font-medium md:table-cell">Cadastro</th>
              <th class="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            @for (user of list; track user.id) {
              <tr
                class="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-gray-900"
              >
                <td class="px-4 py-3 font-medium">
                  {{ user.username }}
                  @if (user.role === 'SYSTEM_ADMIN') {
                    <span
                      class="ml-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                      >admin do sistema</span
                    >
                  }
                </td>
                <td class="px-4 py-3">
                  <a
                    [href]="'/' + user.handle"
                    target="_blank"
                    rel="noopener"
                    class="text-indigo-600 hover:underline dark:text-indigo-400"
                    >/{{ user.handle }}</a
                  >
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    [class]="badge(user.status).classes"
                    >{{ badge(user.status).label }}</span
                  >
                </td>
                <td class="hidden px-4 py-3 text-gray-500 md:table-cell dark:text-gray-400">
                  {{ user.createdAt ? (user.createdAt | date: 'short') : '—' }}
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                  @if (user.role !== 'SYSTEM_ADMIN') {
                    @if (user.status === 'PENDING') {
                      <button matButton (click)="setStatus(user, 'ACTIVE')" [disabled]="saving()">
                        <mat-icon>check</mat-icon>
                        Aprovar
                      </button>
                    } @else if (user.status === 'ACTIVE') {
                      <button matButton (click)="setStatus(user, 'DISABLED')" [disabled]="saving()">
                        <mat-icon>block</mat-icon>
                        Desativar
                      </button>
                    } @else {
                      <button matButton (click)="setStatus(user, 'ACTIVE')" [disabled]="saving()">
                        <mat-icon>restart_alt</mat-icon>
                        Reativar
                      </button>
                    }
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class SystemUsers {
  private readonly api = inject(ApiService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly users = signal<SystemUser[] | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]{3,30}$/)]],
    handle: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]{3,30}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    this.reload();
  }

  protected badge(status: UserStatus): { label: string; classes: string } {
    return STATUS_BADGES[status];
  }

  protected create(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.post<SystemUser>('/system/users', this.form.getRawValue()).subscribe({
      next: () => {
        this.form.reset({ username: '', handle: '', password: '' });
        this.saving.set(false);
        this.reload();
      },
      error: (err: { error?: { detail?: string } }) => {
        this.error.set(err?.error?.detail ?? 'Falha ao criar o usuário.');
        this.saving.set(false);
      },
    });
  }

  protected setStatus(user: SystemUser, status: UserStatus): void {
    this.saving.set(true);
    this.error.set(null);
    this.api.patch<SystemUser>(`/system/users/${user.id}`, { status }).subscribe({
      next: () => {
        this.saving.set(false);
        this.reload();
      },
      error: (err: { error?: { detail?: string } }) => {
        this.error.set(err?.error?.detail ?? 'Falha ao atualizar o usuário.');
        this.saving.set(false);
      },
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.api.get<SystemUser[]>('/system/users').subscribe({
      next: (list) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Falha ao carregar os usuários.');
        this.loading.set(false);
      },
    });
  }
}
