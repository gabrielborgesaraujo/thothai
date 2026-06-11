import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { ProfileService, PublisherCard } from '../../../core/profile/profile.service';

/**
 * Landing da plataforma (Fase 2): apresentação institucional + diretório dos publicadores
 * ativos, cada um com seu hub em /handle. Renderizada no servidor (SEO).
 */
@Component({
  selector: 'app-platform-home',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Hero institucional -->
    <section class="py-10 text-center sm:py-16">
      <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
        Seu conteúdo técnico,<br />
        sua <span class="text-indigo-600 dark:text-indigo-400">identidade digital</span>.
      </h1>
      <p class="mx-auto mt-4 max-w-xl text-lg text-gray-600 dark:text-gray-400">
        O ThothAI reúne currículo, portfólio e publicações em um hub profissional — com
        assistência de IA para criar, revisar e distribuir seus conteúdos.
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <a
          routerLink="/registro"
          class="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >Criar meu hub</a
        >
        <a
          routerLink="/admin/login"
          class="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >Entrar</a
        >
      </div>
    </section>

    <!-- Diretório de publicadores -->
    <section class="mt-6">
      <h2 class="mb-4 text-xl font-semibold tracking-tight">Publicadores</h2>
      @if (publishers(); as list) {
        @if (list.length === 0) {
          <p class="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Os primeiros publicadores chegam em breve.
          </p>
        } @else {
          <ul class="grid gap-4 sm:grid-cols-2">
            @for (publisher of list; track publisher.handle) {
              <li>
                <a
                  [routerLink]="['/', publisher.handle]"
                  class="group flex items-center gap-4 rounded-xl border border-gray-200 p-4 transition-all hover:border-indigo-300 hover:shadow-sm dark:border-gray-800 dark:hover:border-indigo-700"
                >
                  @if (publisher.photoUrl) {
                    <img
                      [src]="publisher.photoUrl"
                      [alt]="publisher.displayName"
                      width="56"
                      height="56"
                      class="size-14 shrink-0 rounded-full border border-gray-200 object-cover dark:border-gray-700"
                    />
                  } @else {
                    <span
                      class="grid size-14 shrink-0 place-items-center rounded-full bg-indigo-50 text-lg font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
                      aria-hidden="true"
                      >{{ publisher.displayName.charAt(0).toUpperCase() }}</span
                    >
                  }
                  <span class="min-w-0">
                    <span
                      class="block truncate font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                      >{{ publisher.displayName }}</span
                    >
                    @if (publisher.headline) {
                      <span class="block truncate text-sm text-gray-500 dark:text-gray-400">{{
                        publisher.headline
                      }}</span>
                    }
                    <span class="block text-xs text-gray-400 dark:text-gray-500">/{{ publisher.handle }}</span>
                  </span>
                </a>
              </li>
            }
          </ul>
        }
      }
    </section>
  `,
})
export class PlatformHome {
  protected readonly publishers = signal<PublisherCard[] | null>(null);

  constructor() {
    inject(Title).setTitle('ThothAI — hubs de conteúdo técnico');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Plataforma de hubs profissionais: currículo, portfólio e publicações técnicas com assistência de IA.',
    });
    inject(ProfileService)
      .publishers()
      .subscribe({
        next: (list) => this.publishers.set(list),
        error: () => this.publishers.set([]),
      });
  }
}
