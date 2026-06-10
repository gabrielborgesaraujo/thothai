import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PostType } from '../core/content/post.models';

export const POST_TYPE_LABELS: Record<PostType, string> = {
  ARTICLE: 'Artigo',
  TUTORIAL: 'Tutorial',
  NOTE: 'Nota',
};

const TYPE_CLASSES: Record<PostType, string> = {
  ARTICLE: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  TUTORIAL: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  NOTE: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
};

/** Selo colorido com a categoria da postagem (artigo, tutorial, nota). */
@Component({
  selector: 'app-post-type-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      [class]="classes()"
      >{{ label() }}</span
    >
  `,
})
export class PostTypeBadge {
  readonly type = input.required<PostType>();

  protected readonly label = computed(() => POST_TYPE_LABELS[this.type()]);
  protected readonly classes = computed(() => TYPE_CLASSES[this.type()]);
}
