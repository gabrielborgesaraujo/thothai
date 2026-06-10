import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AssistantService } from '../../../core/assistant/assistant.service';
import { AiKeySource, AiSettings } from '../../../core/assistant/assistant.models';

/**
 * Configuração das integrações de IA pelo próprio usuário: chave Anthropic (rascunho/revisão/isca),
 * modelo e chave Tavily (busca viva). As chaves nunca voltam inteiras do servidor — apenas um
 * sufixo de conferência; campos em branco mantêm o valor atual.
 */
@Component({
  selector: 'app-integrations',
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
    <div class="max-w-2xl">
      <h1 class="mb-1 text-2xl font-semibold tracking-tight">Integrações</h1>
      <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Use suas próprias chaves de API para o assistente de IA e a busca viva. As chaves ficam
        guardadas no servidor e nunca são exibidas inteiras.
      </p>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error()) {
        <p class="my-2 text-sm text-red-600 dark:text-red-400" role="alert">{{ error() }}</p>
      }
      @if (saved()) {
        <p class="my-2 text-sm text-green-700 dark:text-green-400" role="status">
          Integrações salvas.
        </p>
      }

      <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-8 pt-2">
        <!-- Anthropic (Claude) -->
        <section class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <div class="mb-1 flex items-center justify-between gap-2">
            <h2 class="inline-flex items-center gap-2 font-medium">
              <mat-icon class="text-indigo-500">auto_awesome</mat-icon>
              Assistente de IA — Anthropic (Claude)
            </h2>
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              [class]="badge(settings()?.anthropicSource).classes"
              >{{ badge(settings()?.anthropicSource).label }}</span
            >
          </div>
          <p class="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Gera rascunhos, revisa conteúdos e cria iscas para o LinkedIn.
            @if (settings()?.anthropicKeyHint; as hint) {
              Chave atual: <code class="font-mono">{{ hint }}</code
              >.
            }
          </p>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Chave de API (sk-ant-…)</mat-label>
            <input
              matInput
              type="password"
              formControlName="anthropicApiKey"
              autocomplete="off"
              [placeholder]="
                settings()?.anthropicSource === 'CUSTOM' ? 'Deixe em branco para manter a atual' : ''
              "
            />
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Modelo</mat-label>
            <input matInput formControlName="anthropicModel" [placeholder]="settings()?.defaultModel ?? ''" />
            <mat-hint>Em branco usa o modelo padrão ({{ settings()?.defaultModel }}).</mat-hint>
          </mat-form-field>
          @if (settings()?.anthropicSource === 'CUSTOM') {
            <button matButton type="button" (click)="clearAnthropic()" [disabled]="saving()">
              <mat-icon>delete</mat-icon>
              Remover minha chave
            </button>
          }
        </section>

        <!-- Tavily (busca viva) -->
        <section class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <div class="mb-1 flex items-center justify-between gap-2">
            <h2 class="inline-flex items-center gap-2 font-medium">
              <mat-icon class="text-indigo-500">travel_explore</mat-icon>
              Busca viva — Tavily
            </h2>
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              [class]="badge(settings()?.tavilySource).classes"
              >{{ badge(settings()?.tavilySource).label }}</span
            >
          </div>
          <p class="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Enriquece os rascunhos com contexto atualizado da web. Opcional — sem chave, o rascunho
            é gerado só a partir do tema.
            @if (settings()?.tavilyKeyHint; as hint) {
              Chave atual: <code class="font-mono">{{ hint }}</code
              >.
            }
          </p>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Chave de API (tvly-…)</mat-label>
            <input
              matInput
              type="password"
              formControlName="tavilyApiKey"
              autocomplete="off"
              [placeholder]="
                settings()?.tavilySource === 'CUSTOM' ? 'Deixe em branco para manter a atual' : ''
              "
            />
          </mat-form-field>
          @if (settings()?.tavilySource === 'CUSTOM') {
            <button matButton type="button" (click)="clearTavily()" [disabled]="saving()">
              <mat-icon>delete</mat-icon>
              Remover minha chave
            </button>
          }
        </section>

        <div>
          <button matButton="filled" type="submit" [disabled]="saving() || loading()">Salvar</button>
        </div>
      </form>
    </div>
  `,
})
export class Integrations {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly assistant = inject(AssistantService);

  protected readonly settings = signal<AiSettings | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    anthropicApiKey: [''],
    anthropicModel: [''],
    tavilyApiKey: [''],
  });

  constructor() {
    this.assistant.getSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.form.patchValue({ anthropicModel: settings.anthropicModel ?? '' });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Falha ao carregar as integrações.');
        this.loading.set(false);
      },
    });
  }

  protected badge(source: AiKeySource | null | undefined): { label: string; classes: string } {
    switch (source) {
      case 'CUSTOM':
        return {
          label: 'Chave própria',
          classes: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300',
        };
      case 'ENVIRONMENT':
        return {
          label: 'Chave do servidor',
          classes: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
        };
      default:
        return {
          label: 'Não configurada',
          classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        };
    }
  }

  protected save(): void {
    if (this.saving()) {
      return;
    }
    const raw = this.form.getRawValue();
    // Campos em branco não sobrescrevem a chave atual; o modelo em branco limpa (volta ao padrão).
    this.apply({
      anthropicApiKey: raw.anthropicApiKey.trim() || undefined,
      anthropicModel: raw.anthropicModel.trim() ? raw.anthropicModel.trim() : '',
      tavilyApiKey: raw.tavilyApiKey.trim() || undefined,
    });
  }

  protected clearAnthropic(): void {
    this.apply({ anthropicApiKey: '' });
  }

  protected clearTavily(): void {
    this.apply({ tavilyApiKey: '' });
  }

  private apply(request: {
    anthropicApiKey?: string;
    anthropicModel?: string;
    tavilyApiKey?: string;
  }): void {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);
    this.assistant.updateSettings(request).subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.form.patchValue({
          anthropicApiKey: '',
          tavilyApiKey: '',
          anthropicModel: settings.anthropicModel ?? '',
        });
        this.saving.set(false);
        this.saved.set(true);
      },
      error: () => {
        this.error.set('Falha ao salvar as integrações.');
        this.saving.set(false);
      },
    });
  }
}
