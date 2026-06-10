import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { PostService } from '../../../../core/content/post.service';
import { PublicPost } from '../../../../core/content/post.models';
import { MarkdownPipe } from '../../../../core/content/markdown.pipe';
import { setJsonLd } from '../../../../core/seo/json-ld';
import { PostTypeBadge } from '../../../../shared/post-type-badge';

/** Página de leitura de uma postagem publicada, com meta tags SEO/social (RF06 / RNF05). */
@Component({
  selector: 'app-public-post-detail',
  imports: [DatePipe, RouterLink, MarkdownPipe, PostTypeBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (notFound()) {
      <div class="py-16 text-center">
        <p class="text-gray-500 dark:text-gray-400">Publicação não encontrada.</p>
        <a
          routerLink="/posts"
          class="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >← Voltar às publicações</a
        >
      </div>
    } @else if (post(); as p) {
      <article>
        <a
          routerLink="/posts"
          class="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <span class="material-icons text-[16px]" aria-hidden="true">arrow_back</span>
          Publicações
        </a>
        @if (p.bannerUrl) {
          <img
            [src]="p.bannerUrl"
            [alt]="'Banner: ' + p.title"
            class="mb-6 aspect-[2/1] w-full rounded-2xl border border-gray-200 object-cover sm:aspect-[5/2] dark:border-gray-800"
          />
        }
        <header class="mb-8">
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <app-post-type-badge [type]="p.type" />
            @if (p.publishedAt) {
              <time class="text-gray-400 dark:text-gray-500">{{
                p.publishedAt | date: 'longDate'
              }}</time>
            }
            <span class="text-gray-400 dark:text-gray-500">· {{ readingTime() }} min de leitura</span>
          </div>
          <h1 class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{{ p.title }}</h1>
          @if (p.summary) {
            <p class="mt-3 text-lg text-gray-600 dark:text-gray-400">{{ p.summary }}</p>
          }
        </header>
        <div class="markdown-body" [innerHTML]="p.body | markdown"></div>
        @if (p.tags.length) {
          <footer class="mt-10 border-t border-gray-200 pt-6 dark:border-gray-800">
            <div class="flex flex-wrap gap-2">
              @for (tag of p.tags; track tag) {
                <a
                  [routerLink]="['/posts']"
                  [queryParams]="{ tag }"
                  class="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
                  >#{{ tag }}</a
                >
              }
            </div>
          </footer>
        }
      </article>
    }
  `,
})
export class PublicPostDetail {
  private readonly postService = inject(PostService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  protected readonly post = signal<PublicPost | null>(null);
  protected readonly notFound = signal(false);

  /** Estimativa de leitura a ~200 palavras/min, mínimo de 1 min. */
  protected readonly readingTime = computed(() => {
    const body = this.post()?.body ?? '';
    return Math.max(1, Math.round(body.split(/\s+/).length / 200));
  });

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.notFound.set(true);
      return;
    }
    this.postService.getPublished(slug).subscribe({
      next: (post) => {
        this.post.set(post);
        this.applyMeta(post);
      },
      error: () => this.notFound.set(true),
    });
  }

  /** Renderiza OpenGraph e Twitter Cards para pré-visualizações ricas ao compartilhar (RNF05). */
  private applyMeta(post: PublicPost): void {
    const description = post.summary ?? post.title;
    this.title.setTitle(`${post.title} — ThothAI`);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: post.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: post.title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    if (post.bannerUrl) {
      this.meta.updateTag({ property: 'og:image', content: post.bannerUrl });
      this.meta.updateTag({ name: 'twitter:image', content: post.bannerUrl });
    }

    setJsonLd(this.document, 'ld-article', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description,
      image: post.bannerUrl ?? undefined,
      articleSection: post.type,
      keywords: post.tags.length ? post.tags.join(', ') : undefined,
      datePublished: post.publishedAt ?? undefined,
    });
  }
}
