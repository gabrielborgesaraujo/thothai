import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MediaService } from '../../../core/media/media.service';
import { CropRect, MediaSummary } from '../../../core/media/media.models';

/** Proporções pré-definidas de corte (largura/altura); `null` = seleção livre. */
const ASPECT_PRESETS: { label: string; ratio: number | null }[] = [
  { label: 'Livre', ratio: null },
  { label: '1:1', ratio: 1 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '3:1 (banner)', ratio: 3 },
];

/**
 * Editor visual de imagem: rotação, corte por arrasto e redimensionamento. O preview usa um
 * canvas apenas para EXIBIR (a imagem cross-origin pode "manchar" o canvas, mas nunca lemos os
 * pixels); a transformação real acontece no servidor, que grava uma NOVA mídia.
 */
@Component({
  selector: 'app-media-editor',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Editar imagem"
      (click)="onBackdrop($event)"
    >
      <div
        class="flex max-h-full w-full max-w-3xl flex-col gap-3 overflow-auto rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-900"
      >
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Editar imagem</h2>
          <button matIconButton type="button" (click)="closed.emit()" aria-label="Fechar editor">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Barra de ferramentas: rotação + proporções de corte -->
        <div class="flex flex-wrap items-center gap-2">
          <button matButton type="button" (click)="rotateBy(-90)">
            <mat-icon>rotate_left</mat-icon>
            Girar
          </button>
          <button matButton type="button" (click)="rotateBy(90)">
            <mat-icon>rotate_right</mat-icon>
            Girar
          </button>
          <span class="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
          @for (preset of presets; track preset.label) {
            <button
              type="button"
              (click)="applyPreset(preset.ratio)"
              class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              [class]="
                aspect() === preset.ratio
                  ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                  : 'border-gray-300 text-gray-600 hover:border-indigo-400 dark:border-gray-700 dark:text-gray-400'
              "
            >
              {{ preset.label }}
            </button>
          }
          @if (crop()) {
            <button matButton type="button" (click)="clearCrop()">
              <mat-icon>crop_free</mat-icon>
              Limpar corte
            </button>
          }
        </div>

        <p class="text-xs text-gray-500 dark:text-gray-400">
          Arraste sobre a imagem para selecionar a área de corte.
        </p>

        <div class="grid place-items-center overflow-auto rounded-xl bg-gray-100 p-2 dark:bg-gray-950">
          <canvas
            #canvas
            class="max-w-full cursor-crosshair touch-none select-none"
            (pointerdown)="onPointerDown($event)"
            (pointermove)="onPointerMove($event)"
            (pointerup)="onPointerUp()"
            (pointerleave)="onPointerUp()"
          ></canvas>
        </div>

        <!-- Redimensionamento + resumo do resultado -->
        <div class="flex flex-wrap items-end gap-3 text-sm">
          <label class="flex flex-col gap-1">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Largura final (px)</span>
            <input
              type="number"
              min="16"
              max="4096"
              [value]="targetWidth() ?? resultWidth()"
              (input)="onWidthInput($event)"
              class="w-32 rounded-lg border border-gray-300 bg-white px-3 py-1.5 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
          <p class="pb-1.5 text-gray-500 dark:text-gray-400">
            Resultado: {{ finalWidth() }} × {{ finalHeight() }} px
          </p>
        </div>

        @if (saving()) {
          <mat-progress-bar mode="indeterminate" />
        }
        @if (error()) {
          <p class="text-sm text-red-600 dark:text-red-400" role="alert">{{ error() }}</p>
        }

        <div class="flex items-center justify-end gap-2">
          <button matButton type="button" (click)="closed.emit()">Cancelar</button>
          <button matButton="filled" type="button" (click)="apply()" [disabled]="saving() || !hasChanges()">
            Salvar como nova mídia
          </button>
        </div>
      </div>
    </div>
  `,
})
export class MediaEditor {
  private readonly mediaService = inject(MediaService);

  readonly media = input.required<MediaSummary>();
  readonly closed = output<void>();
  readonly saved = output<MediaSummary>();

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  protected readonly presets = ASPECT_PRESETS;
  protected readonly rotation = signal(0);
  protected readonly aspect = signal<number | null>(null);
  /** Corte em pixels do espaço da imagem rotacionada (coordenadas naturais). */
  protected readonly crop = signal<CropRect | null>(null);
  protected readonly targetWidth = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly image = new Image();
  private readonly imageLoaded = signal(false);
  /** Escala entre os pixels exibidos no canvas e os pixels naturais (rotacionados). */
  private displayScale = 1;
  private dragStart: { x: number; y: number } | null = null;

  constructor() {
    this.image.onload = () => this.imageLoaded.set(true);
    effect(() => {
      this.image.src = this.media().url;
    });
    // Redesenha quando a imagem carrega ou rotação/corte mudam.
    effect(() => {
      this.imageLoaded();
      this.rotation();
      this.crop();
      this.draw();
    });
  }

  // --- Dimensões ---

  private rotatedSize(): { w: number; h: number } {
    const quarter = (this.rotation() / 90) % 2 === 1;
    return quarter
      ? { w: this.image.naturalHeight, h: this.image.naturalWidth }
      : { w: this.image.naturalWidth, h: this.image.naturalHeight };
  }

  /** Largura natural do resultado antes do redimensionamento (corte ou imagem inteira). */
  protected resultWidth(): number {
    return this.crop()?.width ?? this.rotatedSize().w;
  }

  protected finalWidth(): number {
    return this.targetWidth() ?? this.resultWidth();
  }

  protected finalHeight(): number {
    const sourceW = this.resultWidth();
    const sourceH = this.crop()?.height ?? this.rotatedSize().h;
    if (sourceW === 0) {
      return 0;
    }
    return Math.max(1, Math.round((sourceH * this.finalWidth()) / sourceW));
  }

  protected hasChanges(): boolean {
    return this.rotation() !== 0 || this.crop() !== null || this.targetWidth() !== null;
  }

  // --- Ações da barra ---

  protected rotateBy(delta: number): void {
    this.rotation.update((r) => (r + delta + 360) % 360);
    this.crop.set(null);
  }

  protected applyPreset(ratio: number | null): void {
    this.aspect.set(ratio);
    if (ratio === null) {
      return;
    }
    // Corte centralizado com a maior área possível na proporção escolhida.
    const { w, h } = this.rotatedSize();
    const cropW = Math.min(w, Math.floor(h * ratio));
    const cropH = Math.floor(cropW / ratio);
    this.crop.set({
      x: Math.floor((w - cropW) / 2),
      y: Math.floor((h - cropH) / 2),
      width: cropW,
      height: cropH,
    });
  }

  protected clearCrop(): void {
    this.crop.set(null);
    this.aspect.set(null);
  }

  protected onWidthInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.targetWidth.set(
      Number.isFinite(value) && value > 0 && value !== this.resultWidth() ? Math.round(value) : null,
    );
  }

  // --- Seleção de corte por arrasto ---

  protected onPointerDown(event: PointerEvent): void {
    const point = this.toNatural(event);
    this.dragStart = point;
    this.crop.set(null);
    (event.target as HTMLCanvasElement).setPointerCapture(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragStart) {
      return;
    }
    const point = this.toNatural(event);
    let width = Math.abs(point.x - this.dragStart.x);
    let height = Math.abs(point.y - this.dragStart.y);
    const ratio = this.aspect();
    if (ratio !== null && width > 0) {
      height = Math.round(width / ratio);
    }
    const x = Math.min(this.dragStart.x, point.x);
    const y = Math.min(this.dragStart.y, point.y);
    const { w, h } = this.rotatedSize();
    width = Math.min(width, w - x);
    height = Math.min(height, h - y);
    if (width > 4 && height > 4) {
      this.crop.set({ x, y, width, height });
    }
  }

  protected onPointerUp(): void {
    this.dragStart = null;
  }

  /** Converte coordenadas do canvas (display) para pixels naturais da imagem rotacionada. */
  private toNatural(event: PointerEvent): { x: number; y: number } {
    const { w, h } = this.rotatedSize();
    return {
      x: Math.round(Math.min(Math.max(event.offsetX / this.displayScale, 0), w)),
      y: Math.round(Math.min(Math.max(event.offsetY / this.displayScale, 0), h)),
    };
  }

  // --- Render ---

  private draw(): void {
    const canvasRef = this.canvas();
    if (!this.imageLoaded() || !canvasRef) {
      return;
    }
    const canvas = canvasRef.nativeElement;
    const { w, h } = this.rotatedSize();
    // Ajusta ao espaço disponível sem ampliar além do natural.
    const maxW = Math.min(canvas.parentElement?.clientWidth ?? 640, 880);
    const maxH = Math.round(window.innerHeight * 0.5);
    this.displayScale = Math.min(maxW / w, maxH / h, 1);
    canvas.width = Math.max(1, Math.round(w * this.displayScale));
    canvas.height = Math.max(1, Math.round(h * this.displayScale));

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((this.rotation() * Math.PI) / 180);
    const dw = this.image.naturalWidth * this.displayScale;
    const dh = this.image.naturalHeight * this.displayScale;
    ctx.drawImage(this.image, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();

    const crop = this.crop();
    if (crop) {
      const s = this.displayScale;
      const rx = crop.x * s;
      const ry = crop.y * s;
      const rw = crop.width * s;
      const rh = crop.height * s;
      // Escurece a área fora da seleção e contorna a área cortada.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, ry);
      ctx.fillRect(0, ry, rx, rh);
      ctx.fillRect(rx + rw, ry, canvas.width - rx - rw, rh);
      ctx.fillRect(0, ry + rh, canvas.width, canvas.height - ry - rh);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);
    }
  }

  // --- Aplicação ---

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  protected apply(): void {
    if (this.saving() || !this.hasChanges()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.mediaService
      .edit(this.media().id, {
        rotate: this.rotation(),
        crop: this.crop(),
        targetWidth: this.targetWidth(),
      })
      .subscribe({
        next: (created) => {
          this.saving.set(false);
          this.saved.emit(created);
        },
        error: () => {
          this.error.set('Falha ao aplicar a edição.');
          this.saving.set(false);
        },
      });
  }
}
