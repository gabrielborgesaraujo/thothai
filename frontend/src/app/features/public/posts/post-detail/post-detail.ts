import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { PostService } from '../../../../core/content/post.service';
import { PublicPost } from '../../../../core/content/post.models';
import { MarkdownPipe } from '../../../../core/content/markdown.pipe';
import { setJsonLd } from '../../../../core/seo/json-ld';
import { PostTypeBadge } from '../../../../shared/post-type-badge';
import { MetricsService } from '../../../../core/metrics/metrics.service';

/** Item do sumário ("Neste artigo"), montado a partir dos headings renderizados. */
interface TocItem {
  id: string;
  text: string;
  level: number;
}

/** Página de leitura de uma postagem publicada, com meta tags SEO/social (RF06 / RNF05). */
@Component({
  selector: 'app-public-post-detail',
  imports: [DatePipe, RouterLink, MarkdownPipe, PostTypeBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Barra de progresso de leitura -->
    <div
      class="fixed inset-x-0 top-0 z-20 h-0.5 bg-indigo-600 transition-[width] duration-150 dark:bg-indigo-400"
      [style.width.%]="progress()"
      aria-hidden="true"
    ></div>

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

        <!-- Sumário (gerado dos headings após a renderização) -->
        @if (toc().length >= 3) {
          <nav
            class="mb-8 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            aria-label="Sumário do artigo"
          >
            <p class="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
              Neste artigo
            </p>
            <ul class="flex flex-col gap-1 text-sm">
              @for (item of toc(); track item.id) {
                <li [class.pl-4]="item.level === 3">
                  <button
                    type="button"
                    (click)="scrollTo(item.id)"
                    class="text-left text-gray-600 transition-colors hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400"
                  >
                    {{ item.text }}
                  </button>
                </li>
              }
            </ul>
          </nav>
        }

        <div #body class="markdown-body" [innerHTML]="p.body | markdown"></div>

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

        <!-- Navegação cronológica -->
        @if (p.previous || p.next) {
          <nav class="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Outras publicações">
            @if (p.previous; as prev) {
              <a
                [routerLink]="['/posts', prev.slug]"
                class="group rounded-xl border border-gray-200 p-4 transition-all hover:border-indigo-300 dark:border-gray-800 dark:hover:border-indigo-700"
              >
                <span class="text-xs text-gray-400 dark:text-gray-500">← Anterior</span>
                <span
                  class="mt-1 block font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                  >{{ prev.title }}</span
                >
              </a>
            } @else {
              <span></span>
            }
            @if (p.next; as next) {
              <a
                [routerLink]="['/posts', next.slug]"
                class="group rounded-xl border border-gray-200 p-4 text-right transition-all hover:border-indigo-300 dark:border-gray-800 dark:hover:border-indigo-700"
              >
                <span class="text-xs text-gray-400 dark:text-gray-500">Próxima →</span>
                <span
                  class="mt-1 block font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                  >{{ next.title }}</span
                >
              </a>
            }
          </nav>
        }

        <!-- Relacionadas por tags -->
        @if (p.related.length) {
          <section class="mt-10">
            <h2 class="mb-4 text-lg font-semibold tracking-tight">Leia também</h2>
            <ul class="grid gap-4 sm:grid-cols-3">
              @for (rel of p.related; track rel.slug) {
                <li>
                  <a
                    [routerLink]="['/posts', rel.slug]"
                    class="group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 transition-all hover:border-indigo-300 hover:shadow-sm dark:border-gray-800 dark:hover:border-indigo-700"
                  >
                    @if (rel.bannerUrl) {
                      <img
                        [src]="rel.bannerUrl"
                        [alt]="'Banner: ' + rel.title"
                        loading="lazy"
                        class="aspect-[2/1] w-full object-cover"
                      />
                    }
                    <span class="flex flex-1 flex-col gap-2 p-4">
                      <app-post-type-badge [type]="rel.type" />
                      <span
                        class="text-sm font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                        >{{ rel.title }}</span
                      >
                    </span>
                  </a>
                </li>
              }
            </ul>
          </section>
        }
      </article>
    }
  `,
})
export class PublicPostDetail {
  private readonly postService = inject(PostService);
  private readonly metrics = inject(MetricsService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly bodyRef = viewChild<ElementRef<HTMLElement>>('body');

  protected readonly post = signal<PublicPost | null>(null);
  protected readonly notFound = signal(false);
  protected readonly toc = signal<TocItem[]>([]);
  protected readonly progress = signal(0);

  private readSent = false;
  private currentSlug = '';

  /** Estimativa de leitura a ~200 palavras/min, mínimo de 1 min. */
  protected readonly readingTime = computed(() => {
    const body = this.post()?.body ?? '';
    return Math.max(1, Math.round(body.split(/\s+/).length / 200));
  });

  constructor() {
    // Links internos (relacionadas/próxima) navegam para a MESMA rota: o Angular reusa o
    // componente, então é preciso reagir a cada mudança de slug — não basta o snapshot.
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.notFound.set(true);
        return;
      }
      this.load(slug);
    });

    if (this.isBrowser) {
      const onScroll = () => this.onScroll(this.currentSlug);
      this.document.defaultView?.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() =>
        this.document.defaultView?.removeEventListener('scroll', onScroll),
      );
    }
  }

  private load(slug: string): void {
    this.currentSlug = slug;
    this.notFound.set(false);
    this.toc.set([]);
    this.readSent = false;
    this.postService.getPublished(slug).subscribe({
      next: (post) => {
        this.post.set(post);
        this.applyMeta(post);
        if (this.isBrowser) {
          this.document.defaultView?.scrollTo({ top: 0 });
          // DOM do corpo só existe após o próximo ciclo de renderização.
          setTimeout(() => this.enhanceBody(slug));
        }
      },
      error: () => this.notFound.set(true),
    });
  }

  protected scrollTo(id: string): void {
    this.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Pós-processa o HTML renderizado: ids nos headings (sumário) e botões de copiar código. */
  private enhanceBody(slug: string): void {
    const body = this.bodyRef()?.nativeElement;
    if (!body) {
      return;
    }
    const used = new Set<string>();
    const items: TocItem[] = [];
    body.querySelectorAll<HTMLElement>('h2, h3').forEach((heading) => {
      const text = heading.textContent?.trim() ?? '';
      let id = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (!id) {
        return;
      }
      while (used.has(id)) {
        id = `${id}-x`;
      }
      used.add(id);
      heading.id = id;
      heading.classList.add('scroll-mt-20');
      items.push({ id, text, level: heading.tagName === 'H3' ? 3 : 2 });
    });
    this.toc.set(items);

    body.querySelectorAll<HTMLPreElement>('pre').forEach((pre) => {
      const button = this.document.createElement('button');
      button.type = 'button';
      button.className = 'code-copy';
      button.textContent = 'Copiar';
      button.setAttribute('aria-label', 'Copiar código');
      button.addEventListener('click', () => {
        const code = pre.querySelector('code')?.innerText ?? pre.innerText;
        navigator.clipboard?.writeText(code).then(() => {
          button.textContent = 'Copiado!';
          setTimeout(() => (button.textContent = 'Copiar'), 1500);
        });
      });
      pre.appendChild(button);
    });

    // Estado inicial da barra de progresso.
    this.onScroll(slug);
  }

  /** Barra de progresso + beacon de leitura concluída (80% da página, uma vez). */
  private onScroll(slug: string): void {
    const win = this.document.defaultView;
    const root = this.document.documentElement;
    if (!win || !root) {
      return;
    }
    const total = root.scrollHeight - win.innerHeight;
    const ratio = total > 0 ? Math.min(1, win.scrollY / total) : 0;
    this.progress.set(Math.round(ratio * 100));
    if (!this.readSent && ratio >= 0.8 && this.post()) {
      this.readSent = true;
      this.metrics.recordRead(`/posts/${slug}`);
    }
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
