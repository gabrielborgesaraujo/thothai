import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-sidenav-container class="h-dvh">
      <mat-sidenav mode="side" opened class="w-60 p-2">
        <h2 class="px-3 py-4 text-lg font-semibold">ThothAI Admin</h2>
        <mat-nav-list>
          <a mat-list-item routerLink="/admin/posts" routerLinkActive="bg-gray-100">Postagens</a>
          <a mat-list-item routerLink="/admin/media" routerLinkActive="bg-gray-100">Mídias</a>
          <a mat-list-item routerLink="/admin/profile" routerLinkActive="bg-gray-100">Perfil</a>
          <a mat-list-item routerLink="/admin/portfolio" routerLinkActive="bg-gray-100"
            >Portfólio</a
          >
          <a mat-list-item routerLink="/admin/account" routerLinkActive="bg-gray-100">Conta</a>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content>
        <mat-toolbar class="border-b border-gray-200 flex justify-between">
          <span>Painel</span>
          <button matButton (click)="logout()">Sair</button>
        </mat-toolbar>
        <div class="p-6">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class AdminLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/admin/login']),
      error: () => this.router.navigate(['/admin/login']),
    });
  }
}
