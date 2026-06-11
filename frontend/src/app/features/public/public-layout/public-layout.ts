import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ThemeToggle } from '../../../core/theme/theme-toggle';
import { MetricsService } from '../../../core/metrics/metrics.service';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header
        class="sticky top-0 z-10 border-b border-gray-200/70 bg-white/85 backdrop-blur dark:border-gray-800/70 dark:bg-gray-950/85"
      >
        <nav class="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <a routerLink="/" class="text-lg font-bold tracking-tight">
            Thoth<span class="text-indigo-600 dark:text-indigo-400">AI</span>
          </a>
          <div class="flex items-center gap-1">
            <a
              routerLink="/"
              routerLinkActive="text-gray-900 dark:text-white font-medium"
              [routerLinkActiveOptions]="{ exact: true }"
              class="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              >Início</a
            >
            <a
              routerLink="/posts"
              routerLinkActive="text-gray-900 dark:text-white font-medium"
              class="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              >Publicações</a
            >
            <app-theme-toggle />
          </div>
        </nav>
      </header>
      <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <router-outlet />
      </main>
      <footer class="border-t border-gray-200 dark:border-gray-800">
        <div
          class="mx-auto flex max-w-3xl items-center justify-between px-4 py-6 text-sm text-gray-500 dark:text-gray-400"
        >
          <span>© {{ year }} ThothAI</span>
          <a
            href="/feed.xml"
            class="inline-flex items-center gap-1 transition-colors hover:text-gray-900 dark:hover:text-gray-100"
          >
            <span class="material-icons text-[16px]" aria-hidden="true">rss_feed</span>
            RSS
          </a>
        </div>
      </footer>
    </div>
  `,
})
export class PublicLayout {
  protected readonly year = new Date().getFullYear();

  constructor() {
    // Beacon de métricas: registra cada navegação no portal, apenas no navegador (não no SSR,
    // que renderiza para crawlers e inflaria os números).
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const metrics = inject(MetricsService);
      inject(Router)
        .events.pipe(
          filter((event): event is NavigationEnd => event instanceof NavigationEnd),
          takeUntilDestroyed(),
        )
        .subscribe((event) => metrics.recordView(event.urlAfterRedirects.split('?')[0]));
    }
  }
}
