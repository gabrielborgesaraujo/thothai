import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProfileService } from '../../../core/profile/profile.service';
import { Profile, ProfileRequest } from '../../../core/profile/profile.models';
import { MediaService } from '../../../core/media/media.service';

/** Edição do cartão de identidade do publicador (RF07), com upload de foto reutilizando o RF03. */
@Component({
  selector: 'app-profile-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-2xl">
      <h1 class="text-2xl font-semibold tracking-tight mb-4">Perfil</h1>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error()) {
        <p class="text-sm text-red-600 my-2" role="alert">{{ error() }}</p>
      }
      @if (saved()) {
        <p class="text-sm text-green-700 my-2" role="status">Perfil salvo.</p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-3 pt-2">
        <div class="flex items-center gap-4">
          @if (photoUrl()) {
            <img
              [src]="photoUrl()"
              alt="Foto do perfil"
              width="72"
              height="72"
              class="size-18 rounded-full object-cover border border-gray-200"
            />
          } @else {
            <div class="size-18 rounded-full bg-gray-100 grid place-items-center text-gray-400">
              <mat-icon>person</mat-icon>
            </div>
          }
          <button
            matButton
            type="button"
            (click)="photoInput.click()"
            [disabled]="uploading()"
            aria-label="Enviar foto do perfil"
          >
            <mat-icon>upload</mat-icon>
            Enviar foto
          </button>
          @if (uploading()) {
            <mat-progress-bar mode="indeterminate" class="flex-1" />
          }
          <input
            #photoInput
            type="file"
            accept="image/*"
            hidden
            (change)="onPhotoSelected($event)"
          />
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Nome de exibição</mat-label>
          <input matInput formControlName="displayName" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Headline</mat-label>
          <input matInput formControlName="headline" placeholder="Ex.: Engenheiro de Software" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Bio</mat-label>
          <textarea matInput formControlName="bio" rows="4"></textarea>
        </mat-form-field>

        <div class="flex flex-col gap-3 sm:flex-row">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>LinkedIn (URL)</mat-label>
            <input matInput formControlName="linkedinUrl" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>E-mail</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>
        </div>

        <div>
          <button matButton="filled" type="submit" [disabled]="loading()">Salvar</button>
        </div>
      </form>
    </div>
  `,
})
export class ProfileForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly media = inject(MediaService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal(false);
  protected readonly uploading = signal(false);
  protected readonly photoUrl = signal<string | null>(null);

  protected readonly form = this.fb.group({
    displayName: ['', Validators.required],
    headline: [''],
    bio: [''],
    linkedinUrl: [''],
    email: ['', Validators.email],
  });

  constructor() {
    this.load();
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.error.set(null);
    this.media.upload(file).subscribe({
      next: (res) => {
        this.photoUrl.set(res.url);
        this.uploading.set(false);
        input.value = '';
      },
      error: () => {
        this.error.set('Falha ao enviar a foto.');
        this.uploading.set(false);
        input.value = '';
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.saved.set(false);

    const raw = this.form.getRawValue();
    const request: ProfileRequest = {
      displayName: raw.displayName,
      headline: raw.headline.trim() || null,
      bio: raw.bio.trim() || null,
      photoUrl: this.photoUrl(),
      linkedinUrl: raw.linkedinUrl.trim() || null,
      email: raw.email.trim() || null,
    };
    this.profileService.save(request).subscribe({
      next: () => {
        this.saved.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Falha ao salvar o perfil.');
        this.loading.set(false);
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.profileService.getAdmin().subscribe({
      next: (profile) => {
        this.patch(profile);
        this.loading.set(false);
      },
      // 404 na primeira vez (perfil ainda não configurado) → formulário em branco.
      error: () => this.loading.set(false),
    });
  }

  private patch(profile: Profile): void {
    this.form.patchValue({
      displayName: profile.displayName,
      headline: profile.headline ?? '',
      bio: profile.bio ?? '',
      linkedinUrl: profile.linkedinUrl ?? '',
      email: profile.email ?? '',
    });
    this.photoUrl.set(profile.photoUrl);
  }
}
