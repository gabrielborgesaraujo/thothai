import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PostService } from '../../../../core/content/post.service';
import { Page, PostStatus, PostSummary, PostType } from '../../../../core/content/post.models';

const TYPE_LABELS: Record<PostType, string> = {
  ARTICLE: 'Artigo',
  TUTORIAL: 'Tutorial',
  NOTE: 'Nota',
};

/** Listagem e gestão das postagens do admin (RF02), paginada. */
@Component({
  selector: 'app-post-list',
  imports: [
    DatePipe,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatPaginatorModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-semibold tracking-tight">Postagens</h1>
      <a matButton="filled" routerLink="/admin/posts/new">Nova postagem</a>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    @if (error()) {
      <p class="text-sm text-red-600 my-2" role="alert">{{ error() }}</p>
    }

    @if (result(); as data) {
      @if (data.totalElements === 0) {
        <p class="text-gray-500">Nenhuma postagem ainda.</p>
      } @else {
        <table mat-table [dataSource]="data.items" class="w-full">
          <ng-container matColumnDef="title">
            <th mat-header-cell *matHeaderCellDef>Título</th>
            <td mat-cell *matCellDef="let p">{{ p.title }}</td>
          </ng-container>

          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let p">{{ typeLabel(p.type) }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let p">
              <span
                class="inline-block rounded px-2 py-0.5 text-xs"
                [class]="
                  p.status === 'PUBLISHED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-700'
                "
                >{{ statusLabel(p.status) }}</span
              >
            </td>
          </ng-container>

          <ng-container matColumnDef="published">
            <th mat-header-cell *matHeaderCellDef>Publicada em</th>
            <td mat-cell *matCellDef="let p">
              {{ p.publishedAt ? (p.publishedAt | date: 'short') : '—' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="text-right">Ações</th>
            <td mat-cell *matCellDef="let p" class="text-right whitespace-nowrap">
              @if (pendingDelete() === p.id) {
                <span class="text-sm text-gray-600 mr-1">Excluir?</span>
                <button matButton (click)="confirmDelete(p.id)">Sim</button>
                <button matButton (click)="pendingDelete.set(null)">Não</button>
              } @else {
                <a matIconButton [routerLink]="['/admin/posts', p.id]" aria-label="Editar postagem">
                  <mat-icon>edit</mat-icon>
                </a>
                <button
                  matIconButton
                  (click)="pendingDelete.set(p.id)"
                  aria-label="Excluir postagem"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>

        <mat-paginator
          [length]="data.totalElements"
          [pageSize]="data.size"
          [pageIndex]="data.page"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPage($event)"
        />
      }
    }
  `,
})
export class PostList {
  private readonly postService = inject(PostService);

  protected readonly result = signal<Page<PostSummary> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pendingDelete = signal<string | null>(null);
  protected readonly columns = ['title', 'type', 'status', 'published', 'actions'];

  private pageIndex = 0;
  private pageSize = 20;

  constructor() {
    this.reload();
  }

  protected typeLabel(type: PostType): string {
    return TYPE_LABELS[type];
  }

  protected statusLabel(status: PostStatus): string {
    return status === 'PUBLISHED' ? 'Publicado' : 'Rascunho';
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.reload();
  }

  protected confirmDelete(id: string): void {
    this.postService.remove(id).subscribe({
      next: () => {
        this.pendingDelete.set(null);
        // Se a página atual ficou vazia, recua uma página.
        if (this.result()?.items.length === 1 && this.pageIndex > 0) {
          this.pageIndex--;
        }
        this.reload();
      },
      error: () => {
        this.error.set('Falha ao excluir a postagem.');
        this.pendingDelete.set(null);
      },
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.postService.listAdmin(this.pageIndex, this.pageSize).subscribe({
      next: (data) => {
        this.result.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Falha ao carregar as postagens.');
        this.loading.set(false);
      },
    });
  }
}
