import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PortfolioService } from '../../../core/profile/portfolio.service';
import {
  PortfolioCategory,
  PortfolioEntry,
  PortfolioEntryRequest,
} from '../../../core/profile/profile.models';

/** Criação/edição de uma entrada de portfólio (RF08). */
@Component({
  selector: 'app-portfolio-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-2xl">
      <h1 class="text-2xl font-semibold tracking-tight mb-4">
        {{ editingId() ? 'Editar entrada' : 'Nova entrada' }}
      </h1>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error()) {
        <p class="text-sm text-red-600 my-2" role="alert">{{ error() }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-3 pt-2">
        <div class="flex flex-col gap-3 sm:flex-row">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Categoria</mat-label>
            <mat-select formControlName="category">
              <mat-option value="EXPERIENCE">Experiência</mat-option>
              <mat-option value="EDUCATION">Formação</mat-option>
              <mat-option value="SKILL">Skill</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-32">
            <mat-label>Ordem</mat-label>
            <input matInput type="number" formControlName="displayOrder" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Título</mat-label>
          <input matInput formControlName="title" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Organização</mat-label>
          <input matInput formControlName="organization" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Descrição</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>

        <div class="flex flex-col gap-3 sm:flex-row">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Início</mat-label>
            <input matInput type="date" formControlName="startDate" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Fim</mat-label>
            <input matInput type="date" formControlName="endDate" />
          </mat-form-field>
        </div>

        <mat-checkbox formControlName="visible">Visível no portfólio público</mat-checkbox>

        <div class="flex gap-2">
          <button matButton="filled" type="submit" [disabled]="loading()">Salvar</button>
          <a matButton routerLink="/admin/portfolio">Cancelar</a>
        </div>
      </form>
    </div>
  `,
})
export class PortfolioForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly portfolioService = inject(PortfolioService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);

  protected readonly form = this.fb.group({
    category: ['EXPERIENCE' as PortfolioCategory, Validators.required],
    title: ['', Validators.required],
    organization: [''],
    description: [''],
    startDate: [''],
    endDate: [''],
    visible: [true],
    displayOrder: [0],
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId.set(id);
      this.loadEntry(id);
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const request: PortfolioEntryRequest = {
      category: raw.category,
      title: raw.title,
      organization: raw.organization.trim() || null,
      description: raw.description.trim() || null,
      startDate: raw.startDate || null,
      endDate: raw.endDate || null,
      visible: raw.visible,
      displayOrder: raw.displayOrder,
    };

    const id = this.editingId();
    const save = id
      ? this.portfolioService.update(id, request)
      : this.portfolioService.create(request);
    save.subscribe({
      next: () => this.router.navigate(['/admin/portfolio']),
      error: () => {
        this.error.set('Falha ao salvar a entrada.');
        this.loading.set(false);
      },
    });
  }

  private loadEntry(id: string): void {
    this.loading.set(true);
    this.portfolioService.get(id).subscribe({
      next: (entry) => {
        this.patch(entry);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Entrada não encontrada.');
        this.loading.set(false);
      },
    });
  }

  private patch(entry: PortfolioEntry): void {
    this.form.patchValue({
      category: entry.category,
      title: entry.title,
      organization: entry.organization ?? '',
      description: entry.description ?? '',
      startDate: entry.startDate ?? '',
      endDate: entry.endDate ?? '',
      visible: entry.visible,
      displayOrder: entry.displayOrder,
    });
  }
}
