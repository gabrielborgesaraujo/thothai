import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AssistantService } from '../../../core/assistant/assistant.service';
import {
  AiKeySource,
  AiProvider,
  AiProviderInfo,
  AiSettings,
} from '../../../core/assistant/assistant.models';
import { LinkedInStatus, SocialService } from '../../../core/social/social.service';

/**
 * Configuração das integrações de IA pelo próprio usuário: escolha do provedor de LLM
 * (Anthropic, OpenAI, Gemini, Qwen ou qualquer API OpenAI-compatível), chave, modelo e base URL,
 * além da busca viva (Tavily). As chaves nunca voltam inteiras do servidor.
 */
@Component({
  selector: 'app-integrations',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-2xl">
      <h1 class="mb-1 text-2xl font-semibold tracking-tight">Integrações</h1>
      <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Escolha o motor de IA e use suas próprias chaves de API. As chaves ficam guardadas no
        servidor e nunca são exibidas inteiras.
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
        <!-- Motor de IA (LLM) -->
        <section class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <div class="mb-1 flex items-center justify-between gap-2">
            <h2 class="inline-flex items-center gap-2 font-medium">
              <mat-icon class="text-indigo-500">auto_awesome</mat-icon>
              Motor de IA
            </h2>
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              [class]="badge(settings()?.keySource).classes"
              >{{ badge(settings()?.keySource).label }}</span
            >
          </div>
          <p class="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Gera rascunhos, revisa conteúdos e cria iscas para o LinkedIn.
            @if (settings()?.keyHint; as hint) {
              Chave atual: <code class="font-mono">{{ hint }}</code
              >.
            }
          </p>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Provedor</mat-label>
            <mat-select formControlName="provider">
              @for (provider of settings()?.providers ?? []; track provider.id) {
                <mat-option [value]="provider.id">{{ provider.label }}</mat-option>
              }
            </mat-select>
            @if (providerChanged()) {
              <mat-hint>Ao trocar de provedor, informe a chave (e o modelo, se quiser).</mat-hint>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Chave de API</mat-label>
            <input
              matInput
              type="password"
              formControlName="apiKey"
              autocomplete="off"
              [placeholder]="
                settings()?.keySource === 'CUSTOM' && !providerChanged()
                  ? 'Deixe em branco para manter a atual'
                  : ''
              "
            />
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Modelo</mat-label>
            <input matInput formControlName="model" [placeholder]="selectedProvider()?.defaultModel ?? ''" />
            @if (selectedProvider()?.defaultModel) {
              <mat-hint>Em branco usa o modelo padrão ({{ selectedProvider()?.defaultModel }}).</mat-hint>
            }
          </mat-form-field>

          @if (selectedProvider()?.requiresBaseUrl || form.controls.provider.value === 'OPENAI_COMPATIBLE') {
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Base URL da API</mat-label>
              <input matInput formControlName="baseUrl" placeholder="https://api.exemplo.com/v1" />
              <mat-hint>Endpoint OpenAI-compatível (DeepSeek, Groq, Ollama…).</mat-hint>
            </mat-form-field>
          }

          @if (settings()?.keySource === 'CUSTOM') {
            <button matButton type="button" (click)="clearKey()" [disabled]="saving()">
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

      <!-- LinkedIn: app próprio do usuário + conexão OAuth da conta -->
      <form [formGroup]="linkedInForm" (ngSubmit)="saveLinkedIn()" class="mt-8 flex flex-col gap-2">
        <section class="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <div class="mb-1 flex items-center justify-between gap-2">
            <h2 class="inline-flex items-center gap-2 font-medium">
              <mat-icon class="text-indigo-500">share</mat-icon>
              LinkedIn
            </h2>
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              [class]="linkedInBadge().classes"
              >{{ linkedInBadge().label }}</span
            >
          </div>
          <p class="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Publique suas postagens direto no seu feed. Crie um app em
            <code class="font-mono">developers.linkedin.com</code> com o produto "Share on
            LinkedIn" e "Sign In with LinkedIn using OpenID Connect", cadastre a redirect URL
            <code class="font-mono">{{ callbackUrl() }}</code> e informe as credenciais abaixo.
            @if (linkedIn()?.clientIdHint; as hint) {
              Client ID atual: <code class="font-mono">{{ hint }}</code
              >.
            }
          </p>

          @if (linkedInMessage(); as msg) {
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

          <div class="flex flex-col gap-2 sm:flex-row">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Client ID</mat-label>
              <input matInput formControlName="clientId" autocomplete="off" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Client Secret</mat-label>
              <input matInput type="password" formControlName="clientSecret" autocomplete="off" />
            </mat-form-field>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button matButton type="submit" [disabled]="linkedInSaving()">Salvar credenciais</button>
            @if (linkedIn()?.configured) {
              @if (linkedIn()?.connected) {
                <span class="text-sm text-gray-600 dark:text-gray-300">
                  Conectado como <strong>{{ linkedIn()?.memberName ?? 'membro' }}</strong>
                  @if (linkedIn()?.tokenExpiresAt) {
                    (até {{ linkedIn()!.tokenExpiresAt | date: 'shortDate' }})
                  }
                </span>
                <button matButton type="button" (click)="disconnectLinkedIn()" [disabled]="linkedInSaving()">
                  <mat-icon>link_off</mat-icon>
                  Desconectar
                </button>
              } @else {
                <button matButton="filled" type="button" (click)="connectLinkedIn()" [disabled]="linkedInSaving()">
                  <mat-icon>link</mat-icon>
                  Conectar minha conta
                </button>
              }
            }
          </div>
        </section>
      </form>
    </div>
  `,
})
export class Integrations {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly assistant = inject(AssistantService);
  private readonly social = inject(SocialService);
  private readonly document = inject(DOCUMENT);

  protected readonly settings = signal<AiSettings | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    provider: ['ANTHROPIC' as AiProvider],
    apiKey: [''],
    model: [''],
    baseUrl: [''],
    tavilyApiKey: [''],
  });

  private readonly providerValue = toSignal(this.form.controls.provider.valueChanges, {
    initialValue: 'ANTHROPIC' as AiProvider,
  });

  /** Metadados (defaults) do provedor selecionado no formulário. */
  protected readonly selectedProvider = computed<AiProviderInfo | null>(() => {
    const provider = this.providerValue();
    return this.settings()?.providers.find((p) => p.id === provider) ?? null;
  });

  /** O usuário trocou o provedor em relação ao salvo (precisa informar nova chave). */
  protected readonly providerChanged = computed(
    () => this.settings() !== null && this.providerValue() !== this.settings()!.provider,
  );

  // --- LinkedIn ---
  protected readonly linkedIn = signal<LinkedInStatus | null>(null);
  protected readonly linkedInSaving = signal(false);
  protected readonly linkedInMessage = signal<{ ok: boolean; text: string } | null>(null);

  protected readonly linkedInForm = this.fb.group({
    clientId: ['', Validators.required],
    clientSecret: ['', Validators.required],
  });

  /** Redirect URL a cadastrar no app LinkedIn (mesma origem do painel). */
  protected readonly callbackUrl = computed(
    () => `${this.document.location?.origin ?? ''}/api/admin/social/linkedin/callback`,
  );

  constructor() {
    this.assistant.getSettings().subscribe({
      next: (settings) => this.applyState(settings),
      error: () => {
        this.error.set('Falha ao carregar as integrações.');
        this.loading.set(false);
      },
    });
    this.social.linkedInStatus().subscribe({
      next: (status) => this.linkedIn.set(status),
      error: () => undefined,
    });
    // Retorno do fluxo OAuth (?linkedin=connected|error).
    const result = inject(ActivatedRoute).snapshot.queryParamMap.get('linkedin');
    if (result === 'connected') {
      this.linkedInMessage.set({ ok: true, text: 'Conta do LinkedIn conectada com sucesso.' });
    } else if (result === 'error') {
      this.linkedInMessage.set({
        ok: false,
        text: 'Não foi possível conectar ao LinkedIn — confira as credenciais e tente de novo.',
      });
    }
  }

  protected linkedInBadge(): { label: string; classes: string } {
    const status = this.linkedIn();
    if (status?.connected) {
      return {
        label: 'Conectado',
        classes: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300',
      };
    }
    if (status?.configured) {
      return {
        label: 'App configurado',
        classes: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
      };
    }
    return {
      label: 'Não configurado',
      classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };
  }

  protected saveLinkedIn(): void {
    if (this.linkedInForm.invalid || this.linkedInSaving()) {
      return;
    }
    const raw = this.linkedInForm.getRawValue();
    this.linkedInSaving.set(true);
    this.linkedInMessage.set(null);
    this.social.saveLinkedInCredentials(raw.clientId.trim(), raw.clientSecret.trim()).subscribe({
      next: (status) => {
        this.linkedIn.set(status);
        this.linkedInForm.reset({ clientId: '', clientSecret: '' });
        this.linkedInSaving.set(false);
        this.linkedInMessage.set({ ok: true, text: 'Credenciais salvas. Agora conecte sua conta.' });
      },
      error: () => {
        this.linkedInSaving.set(false);
        this.linkedInMessage.set({ ok: false, text: 'Falha ao salvar as credenciais.' });
      },
    });
  }

  protected connectLinkedIn(): void {
    this.linkedInSaving.set(true);
    this.social.linkedInAuthorizeUrl().subscribe({
      next: ({ url }) => {
        this.document.location.href = url;
      },
      error: () => {
        this.linkedInSaving.set(false);
        this.linkedInMessage.set({ ok: false, text: 'Falha ao iniciar a conexão com o LinkedIn.' });
      },
    });
  }

  protected disconnectLinkedIn(): void {
    this.linkedInSaving.set(true);
    this.social.disconnectLinkedIn().subscribe({
      next: (status) => {
        this.linkedIn.set(status);
        this.linkedInSaving.set(false);
        this.linkedInMessage.set({ ok: true, text: 'Conta desconectada.' });
      },
      error: () => {
        this.linkedInSaving.set(false);
        this.linkedInMessage.set({ ok: false, text: 'Falha ao desconectar.' });
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
    // Campos em branco não sobrescrevem a chave atual; modelo/base URL em branco limpam.
    this.apply({
      provider: raw.provider,
      apiKey: raw.apiKey.trim() || undefined,
      model: raw.model.trim() ? raw.model.trim() : '',
      baseUrl: raw.baseUrl.trim() ? raw.baseUrl.trim() : '',
    });
  }

  protected clearKey(): void {
    this.apply({ apiKey: '' });
  }

  protected clearTavily(): void {
    this.apply({ tavilyApiKey: '' });
  }

  private apply(request: {
    provider?: AiProvider;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    tavilyApiKey?: string;
  }): void {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);
    const tavily = this.form.getRawValue().tavilyApiKey.trim();
    this.assistant
      .updateSettings({
        ...request,
        tavilyApiKey: request.tavilyApiKey ?? (tavily || undefined),
      })
      .subscribe({
        next: (settings) => {
          this.applyState(settings);
          this.saving.set(false);
          this.saved.set(true);
        },
        error: (err: { error?: { detail?: string } }) => {
          this.error.set(err?.error?.detail ?? 'Falha ao salvar as integrações.');
          this.saving.set(false);
        },
      });
  }

  private applyState(settings: AiSettings): void {
    this.settings.set(settings);
    this.form.patchValue({
      provider: settings.provider,
      apiKey: '',
      model: settings.model ?? '',
      baseUrl: settings.baseUrl ?? '',
      tavilyApiKey: '',
    });
    this.loading.set(false);
  }
}
