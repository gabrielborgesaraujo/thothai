import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { PostService } from '../../../../core/content/post.service';
import { PublicPost } from '../../../../core/content/post.models';
import { MarkdownPipe } from '../../../../core/content/markdown.pipe';

/** Página de leitura de uma postagem publicada, com meta tags SEO/social (RF06 / RNF05). */
@Component({
  selector: 'app-public-post-detail',
  imports: [DatePipe, RouterLink, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (notFound()) {
      <p class="text-gray-500">Publicação não encontrada.</p>
      <a routerLink="/posts" class="text-sm text-gray-600 hover:text-gray-900"
        >← Voltar às publicações</a
      >
    } @else if (post(); as p) {
      <article>
        <header class="mb-6">
          <h1 class="text-3xl font-semibold tracking-tight">{{ p.title }}</h1>
          @if (p.publishedAt) {
            <time class="text-sm text-gray-400">{{ p.publishedAt | date: 'longDate' }}</time>
          }
        </header>
        <div class="markdown-body" [innerHTML]="p.body | markdown"></div>
      </article>
    }
  `,
})
export class PublicPostDetail {
  private readonly postService = inject(PostService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly post = signal<PublicPost | null>(null);
  protected readonly notFound = signal(false);

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
  }
}
