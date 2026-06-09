import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PortfolioService } from '../../../core/profile/portfolio.service';
import { PortfolioCategory, PortfolioEntry } from '../../../core/profile/profile.models';

const CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  EXPERIENCE: 'Experiência',
  EDUCATION: 'Formação',
  SKILL: 'Skill',
};

/** Listagem e gestão das entradas de portfólio (RF08). */
@Component({
  selector: 'app-portfolio-list',
  imports: [RouterLink, MatTableModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-semibold tracking-tight">Portfólio</h1>
      <a matButton="filled" routerLink="/admin/portfolio/new">Nova entrada</a>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    @if (error()) {
      <p class="text-sm text-red-600 my-2" role="alert">{{ error() }}</p>
    }

    @if (entries(); as list) {
      @if (list.length === 0) {
        <p class="text-gray-500">Nenhuma entrada ainda.</p>
      } @else {
        <table mat-table [dataSource]="list" class="w-full">
          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>Categoria</th>
            <td mat-cell *matCellDef="let e">{{ categoryLabel(e.category) }}</td>
          </ng-container>

          <ng-container matColumnDef="title">
            <th mat-header-cell *matHeaderCellDef>Título</th>
            <td mat-cell *matCellDef="let e">{{ e.title }}</td>
          </ng-container>

          <ng-container matColumnDef="visible">
            <th mat-header-cell *matHeaderCellDef>Visível</th>
            <td mat-cell *matCellDef="let e">
              <span
                class="inline-block rounded px-2 py-0.5 text-xs"
                [class]="e.visible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'"
                >{{ e.visible ? 'Sim' : 'Oculta' }}</span
              >
            </td>
          </ng-container>

          <ng-container matColumnDef="order">
            <th mat-header-cell *matHeaderCellDef>Ordem</th>
            <td mat-cell *matCellDef="let e">{{ e.displayOrder }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="text-right">Ações</th>
            <td mat-cell *matCellDef="let e" class="text-right whitespace-nowrap">
              @if (pendingDelete() === e.id) {
                <span class="text-sm text-gray-600 mr-1">Excluir?</span>
                <button matButton (click)="confirmDelete(e.id)">Sim</button>
                <button matButton (click)="pendingDelete.set(null)">Não</button>
              } @else {
                <a
                  matIconButton
                  [routerLink]="['/admin/portfolio', e.id]"
                  aria-label="Editar entrada"
                >
                  <mat-icon>edit</mat-icon>
                </a>
                <button
                  matIconButton
                  (click)="pendingDelete.set(e.id)"
                  aria-label="Excluir entrada"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
      }
    }
  `,
})
export class PortfolioList {
  private readonly portfolioService = inject(PortfolioService);

  protected readonly entries = signal<PortfolioEntry[] | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pendingDelete = signal<string | null>(null);
  protected readonly columns = ['category', 'title', 'visible', 'order', 'actions'];

  constructor() {
    this.reload();
  }

  protected categoryLabel(category: PortfolioCategory): string {
    return CATEGORY_LABELS[category];
  }

  protected confirmDelete(id: string): void {
    this.portfolioService.remove(id).subscribe({
      next: () => {
        this.pendingDelete.set(null);
        this.reload();
      },
      error: () => {
        this.error.set('Falha ao excluir a entrada.');
        this.pendingDelete.set(null);
      },
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.portfolioService.listAdmin().subscribe({
      next: (list) => {
        this.entries.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Falha ao carregar o portfólio.');
        this.loading.set(false);
      },
    });
  }
}
