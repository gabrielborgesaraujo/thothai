import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeToggle } from '../../../core/theme/theme-toggle';

const NAV_ITEMS = [
  { path: '/admin', icon: 'space_dashboard', label: 'Painel', exact: true },
  { path: '/admin/posts', icon: 'article', label: 'Postagens', exact: false },
  { path: '/admin/media', icon: 'image', label: 'Mídias', exact: false },
  { path: '/admin/profile', icon: 'badge', label: 'Perfil', exact: false },
  { path: '/admin/portfolio', icon: 'work', label: 'Portfólio', exact: false },
  { path: '/admin/integrations', icon: 'smart_toy', label: 'Integrações', exact: false },
  { path: '/admin/account', icon: 'settings', label: 'Conta', exact: false },
] as const;

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatIconModule, MatButtonModule, ThemeToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-sidenav-container class="h-dvh">
      <mat-sidenav mode="side" opened class="w-60 border-r border-gray-200 dark:border-gray-800">
        <div class="flex h-full flex-col p-3">
          <a routerLink="/admin" class="px-3 py-4 text-lg font-bold tracking-tight">
            Thoth<span class="text-indigo-600 dark:text-indigo-400">AI</span>
            <span class="ml-1 align-middle text-[10px] font-medium tracking-widest text-gray-400 uppercase"
              >Admin</span
            >
          </a>
          <nav class="flex flex-col gap-1" aria-label="Navegação do painel">
            @for (item of nav; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                [routerLinkActiveOptions]="{ exact: item.exact }"
                class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <mat-icon class="text-[20px]">{{ item.icon }}</mat-icon>
                {{ item.label }}
              </a>
            }
          </nav>
          <div class="mt-auto px-3 py-2">
            <a
              href="/"
              target="_blank"
              class="inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
            >
              <mat-icon class="text-[14px]!">open_in_new</mat-icon>
              Ver site público
            </a>
          </div>
        </div>
      </mat-sidenav>
      <mat-sidenav-content>
        <header
          class="sticky top-0 z-10 flex items-center justify-end gap-1 border-b border-gray-200 bg-white/85 px-4 py-2 backdrop-blur dark:border-gray-800 dark:bg-gray-950/85"
        >
          <app-theme-toggle />
          <button matButton (click)="logout()">
            <mat-icon>logout</mat-icon>
            Sair
          </button>
        </header>
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

  protected readonly nav = NAV_ITEMS;

  protected logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/admin/login']),
      error: () => this.router.navigate(['/admin/login']),
    });
  }
}
