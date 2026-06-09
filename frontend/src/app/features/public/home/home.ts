import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ProfileService } from '../../../core/profile/profile.service';
import { PortfolioService } from '../../../core/profile/portfolio.service';
import { PortfolioEntry, Profile } from '../../../core/profile/profile.models';
import { setJsonLd } from '../../../core/seo/json-ld';

/**
 * Home pública one-page: cartão de identidade do publicador (RF07) e portfólio curricular
 * agrupado por categoria (RF08). Renderiza no servidor com meta tags para SEO/social (RNF05).
 */
@Component({
  selector: 'app-home',
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
            class="size-30 rounded-full object-cover border border-gray-200"
          />
        }
        <div class="text-center sm:text-left">
          <h1 class="text-3xl font-semibold tracking-tight">{{ p.displayName }}</h1>
          @if (p.headline) {
            <p class="mt-1 text-lg text-gray-600">{{ p.headline }}</p>
          }
          @if (p.bio) {
            <p class="mt-3 text-gray-700">{{ p.bio }}</p>
          }
          @if (p.linkedinUrl || p.email) {
            <div class="mt-4 flex justify-center gap-3 sm:justify-start">
              @if (p.linkedinUrl) {
                <a
                  [href]="p.linkedinUrl"
                  target="_blank"
                  rel="noopener"
                  class="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >LinkedIn</a
                >
              }
              @if (p.email) {
                <a
                  [href]="'mailto:' + p.email"
                  class="rounded border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
                  >E-mail</a
                >
              }
            </div>
          }
        </div>
      </section>

      @if (groups().length) {
        <div class="mt-12 flex flex-col gap-10">
          @for (group of groups(); track group.label) {
            <section>
              <h2 class="mb-4 text-xl font-semibold tracking-tight">{{ group.label }}</h2>
              <ul class="flex flex-col gap-4">
                @for (entry of group.items; track entry.id) {
                  <li>
                    <div class="flex flex-wrap justify-between gap-2">
                      <h3 class="font-medium">{{ entry.title }}</h3>
                      @if (period(entry)) {
                        <span class="text-sm text-gray-400">{{ period(entry) }}</span>
                      }
                    </div>
                    @if (entry.organization) {
                      <p class="text-sm text-gray-600">{{ entry.organization }}</p>
                    }
                    @if (entry.description) {
                      <p class="mt-1 text-gray-700">{{ entry.description }}</p>
                    }
                  </li>
                }
              </ul>
            </section>
          }
        </div>
      }
    } @else {
      <section class="py-8">
        <h1 class="text-3xl font-semibold tracking-tight">ThothAI</h1>
        <p class="mt-3 text-gray-600">Hub de conteúdo técnico. Em construção.</p>
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
  private readonly entries = signal<PortfolioEntry[]>([]);

  protected readonly groups = computed(() => {
    const list = this.entries();
    return [
      { label: 'Experiência', items: list.filter((e) => e.category === 'EXPERIENCE') },
      { label: 'Formação', items: list.filter((e) => e.category === 'EDUCATION') },
      { label: 'Skills', items: list.filter((e) => e.category === 'SKILL') },
    ].filter((group) => group.items.length > 0);
  });

  constructor() {
    // Ambas as requisições são pending tasks: o SSR aguarda antes de renderizar.
    this.profileService.getPublic().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.applyMeta(profile);
      },
      error: () => this.profile.set(null),
    });
    this.portfolioService.listPublic().subscribe({
      next: (list) => this.entries.set(list),
      error: () => this.entries.set([]),
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
