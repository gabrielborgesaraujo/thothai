import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProfileService } from '../../../core/profile/profile.service';
import { PortfolioService } from '../../../core/profile/portfolio.service';
import { PortfolioEntry, Profile } from '../../../core/profile/profile.models';
import { setJsonLd } from '../../../core/seo/json-ld';
import { MarkdownPipe } from '../../../core/content/markdown.pipe';

/**
 * Home pública one-page: cartão de identidade do publicador (RF07) e portfólio curricular
 * agrupado por categoria (RF08). Renderiza no servidor com meta tags para SEO/social (RNF05).
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (profile(); as p) {
      <section class="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        @if (p.photoUrl) {
          <img
            [src]="p.photoUrl"
            [alt]="p.displayName"
            width="120"
            height="120"
            class="size-30 rounded-full border border-gray-200 object-cover shadow-sm dark:border-gray-700"
          />
        }
        <div class="text-center sm:text-left">
          <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">{{ p.displayName }}</h1>
          @if (p.headline) {
            <p class="mt-1 text-lg text-indigo-600 dark:text-indigo-400">{{ p.headline }}</p>
          }
          @if (p.bio) {
            <p class="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">{{ p.bio }}</p>
          }
          <div class="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
            @if (p.linkedinUrl) {
              <a
                [href]="p.linkedinUrl"
                target="_blank"
                rel="noopener"
                class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                >LinkedIn</a
              >
            }
            @if (p.email) {
              <a
                [href]="'mailto:' + p.email"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >E-mail</a
              >
            }
            <a
              [routerLink]="['/', handle(), 'posts']"
              class="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950"
              >Publicações →</a
            >
          </div>
        </div>
      </section>

      @if (skills().length) {
        <section class="mt-12">
          <h2 class="mb-4 text-xl font-semibold tracking-tight">Skills</h2>
          <ul class="flex flex-wrap gap-2">
            @for (skill of skills(); track skill.id) {
              <li
                class="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
                [title]="skill.description ?? ''"
              >
                {{ skill.title }}
              </li>
            }
          </ul>
        </section>
      }

      @if (groups().length) {
        <div class="mt-12 flex flex-col gap-10">
          @for (group of groups(); track group.label) {
            <section>
              <h2 class="mb-4 text-xl font-semibold tracking-tight">{{ group.label }}</h2>
              <ul
                class="flex flex-col gap-6 border-l-2 border-gray-200 pl-5 dark:border-gray-800"
              >
                @for (entry of group.items; track entry.id) {
                  <li>
                    <div class="flex flex-wrap justify-between gap-2">
                      <h3 class="font-medium">{{ entry.title }}</h3>
                      @if (period(entry)) {
                        <span class="text-sm text-gray-400 dark:text-gray-500">{{
                          period(entry)
                        }}</span>
                      }
                    </div>
                    @if (entry.organization) {
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ entry.organization }}
                      </p>
                    }
                    @if (entry.description) {
                      <!-- Descrição rica (Markdown editado no painel). -->
                      <div
                        class="markdown-body mt-1 text-[0.95rem]"
                        [innerHTML]="entry.description | markdown"
                      ></div>
                    }
                  </li>
                }
              </ul>
            </section>
          }
        </div>
      }
    } @else {
      <section class="py-16 text-center">
        <p class="text-gray-500 dark:text-gray-400">Publicador não encontrado.</p>
        <a
          routerLink="/"
          class="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >← Voltar à plataforma</a
        >
      </section>
    }
  `,
})
export class Home {
  private readonly profileService = inject(ProfileService);
  private readonly portfolioService = inject(PortfolioService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  protected readonly profile = signal<Profile | null>(null);
  protected readonly handle = signal('');
  private readonly entries = signal<PortfolioEntry[]>([]);

  /** Skills renderizadas como chips; experiência e formação como linha do tempo. */
  protected readonly skills = computed(() =>
    this.entries().filter((e) => e.category === 'SKILL'),
  );

  protected readonly groups = computed(() => {
    const list = this.entries();
    return [
      { label: 'Experiência', items: list.filter((e) => e.category === 'EXPERIENCE') },
      { label: 'Formação', items: list.filter((e) => e.category === 'EDUCATION') },
    ].filter((group) => group.items.length > 0);
  });

  constructor() {
    // A rota é reutilizada entre handles: reage a cada mudança de publicador.
    inject(ActivatedRoute).paramMap.subscribe((params) => {
      const handle = params.get('handle') ?? '';
      this.handle.set(handle);
      // Ambas as requisições são pending tasks: o SSR aguarda antes de renderizar.
      this.profileService.getPublic(handle).subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.applyMeta(profile);
        },
        error: () => this.profile.set(null),
      });
      this.portfolioService.listPublic(handle).subscribe({
        next: (list) => this.entries.set(list),
        error: () => this.entries.set([]),
      });
    });
  }

  /** Período "YYYY – YYYY" (ou "YYYY – Atual" sem data de fim). */
  protected period(entry: PortfolioEntry): string {
    const start = entry.startDate ? entry.startDate.slice(0, 4) : '';
    if (!start) {
      return '';
    }
    const end = entry.endDate ? entry.endDate.slice(0, 4) : 'Atual';
    return `${start} – ${end}`;
  }

  private applyMeta(profile: Profile): void {
    const description = profile.headline ?? profile.bio ?? profile.displayName;
    this.title.setTitle(`${profile.displayName} — ThothAI`);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: profile.displayName });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'profile' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    if (profile.photoUrl) {
      this.meta.updateTag({ property: 'og:image', content: profile.photoUrl });
    }

    setJsonLd(this.document, 'ld-person', {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: profile.displayName,
      jobTitle: profile.headline ?? undefined,
      description: profile.bio ?? undefined,
      email: profile.email ?? undefined,
      image: profile.photoUrl ?? undefined,
      sameAs: profile.linkedinUrl ? [profile.linkedinUrl] : undefined,
    });
  }
}
