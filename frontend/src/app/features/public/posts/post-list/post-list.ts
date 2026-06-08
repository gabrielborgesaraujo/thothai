import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { PostService } from '../../../../core/content/post.service';
import { PostSummary } from '../../../../core/content/post.models';

/** Listagem pública das postagens publicadas, em ordem cronológica reversa (RF06). */
@Component({
  selector: 'app-public-post-list',
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold tracking-tight mb-6">Publicações</h1>

    @if (error()) {
      <p class="text-red-600" role="alert">{{ error() }}</p>
    }

    @if (posts(); as list) {
      @if (list.length === 0) {
        <p class="text-gray-500">Nenhuma publicação ainda.</p>
      } @else {
        <ul class="flex flex-col gap-6">
          @for (post of list; track post.id) {
            <li>
              <a [routerLink]="['/posts', post.slug]" class="group block">
                <h2 class="text-lg font-medium group-hover:underline">{{ post.title }}</h2>
                @if (post.publishedAt) {
                  <time class="text-xs text-gray-400">{{
                    post.publishedAt | date: 'longDate'
                  }}</time>
                }
                @if (post.summary) {
                  <p class="mt-1 text-gray-600">{{ post.summary }}</p>
                }
              </a>
            </li>
          }
        </ul>
      }
    }
  `,
})
export class PublicPostList {
  private readonly postService = inject(PostService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly posts = signal<PostSummary[] | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.title.setTitle('Publicações — ThothAI');
    this.meta.updateTag({
      name: 'description',
      content: 'Artigos, tutoriais e notas técnicas publicados no ThothAI.',
    });

    // A requisição é registrada como pending task: o SSR aguarda a resposta antes de renderizar.
    this.postService.listPublished().subscribe({
      next: (list) => this.posts.set(list),
      error: () => this.error.set('Não foi possível carregar as publicações.'),
    });
  }
}
